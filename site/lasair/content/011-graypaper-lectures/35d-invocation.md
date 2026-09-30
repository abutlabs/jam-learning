---
title: "12.4 Invocation"
duration: 10 min
video: https://www.youtube.com/watch?v=PNMn3v1QNz0
---

# Graypaper Section 12.4: Invocation

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains the final step: **invoking the PVM** to actually execute the Accumulate function for each service. This is where state changes happen.

## What This Section Covers

- The A function: per-service accumulation
- The output tuple (7 components!)
- Deferred transfer handling
- Privileged state transitions
- Service creation and collision handling

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the lecture follows an earlier draft in three ways. (1) Per-service accumulation no longer returns a 7-tuple; the single-service function Δ₁ calls the Accumulate invocation Ψ_A and gets back an output of five parts: post-state, deferred transfers, yield (the accumulation output hash), gas used and preimage provisions (section 12.2, eq. `accone`; appendix B.4). (2) There is no separate transfer phase and no `on_transfer` entry point: a transfer made in one round of accumulation is delivered, as an input, to the recipient's Accumulate in the next round of the same block (eq. `accseq`). (3) Privileges have five parts: manager χ_M, per-core assigners χ_A, delegator χ_V, registrar χ_R and always-accumulate χ_Z. In 0.8.0 this material sits in section 12.2 (Execution) and appendix B.4; section 12.4 is now Preimage Integration.

</div>

## The Big Picture

After wrangling, we invoke the PVM for each service:

```
For each service s in S:
  A(s) → (s, v, t, r, c, n, p)
         │  │  │  │  │  │  └── Privileged tuple (chi)
         │  │  │  │  │  └───── New services created
         │  │  │  │  └──────── Core assignments (phi)
         │  │  │  └─────────── Beefy commitment hash
         │  │  └────────────── Deferred transfers
         │  └───────────────── Validator keys (iota)
         └──────────────────── Service account changes
```

<div class="callout callout-info">

**ELI5: The Assembly Line**

Think of invocation as an assembly line:
- Each station (service) processes its parts (operands)
- Each station outputs: modified product (s), paperwork (transfers), quality reports (beefy hash)
- Privileged stations can change the factory settings (chi, iota, phi)
- All stations work simultaneously (parallelizable!)

</div>

## The A Function

A maps service index → output tuple:

```
A(s) = (s, v, t, r, c, n, p)

Inputs (from context):
  - M(s): Wrangled operands for service s
  - G(s): Gas limit for service s
  - δ[s]: Current service account

Output tuple:
  s = Modified service account (or None if terminated)
  v = Validator keys (only χ_v sets this)
  t = Sequence of deferred transfers
  r = Beefy commitment hash (optional)
  c = Core assignments (only χ_a sets this)
  n = Dictionary of new services created
  p = Privileged services tuple (only χ_m sets this)
```

That is the lecture's form. In GP 0.8.0 the result of Δ₁(s) = Ψ_A(e, τ', s, g, inputs) is

```
(e, t, y, u, p)
  e = post-state: a whole partial state (accounts, ι, φ, χ), not just one account
  t = deferred transfers created
  y = yield: optional accumulation-output hash
  u = gas used
  p = preimage provisions
```

and the merge in Δ* (eq. `accpar`) takes ι' from the delegator's post-state, each core's queue from that core's assigner, and χ' from the manager (with the function R letting a privileged service hand its own role on).

<div class="lasair-connection">

### In Lasair: Accumulation Output

```ocaml
(* From lib/accumulation.ml - matches the GP 0.8.0 output (e, t, y, u, p) *)

(** Output from single-service accumulation *)
type acc_output = {
  post_state: partial_state;    (** e - Modified partial state *)
  deferred_xfers: deferred_transfer list;  (** t - New deferred transfers *)
  yield: hash option;           (** y - Accumulation output hash *)
  gas_used: int64;              (** u - Gas consumed *)
  provisions: (int * bytes) list;  (** p - Preimage provisions *)
}

(** Partial state captures mutable components *)
type partial_state = {
  accounts: (int * Accounts.service_account) list;  (** s - Service accounts *)
  staging_set: Cores.validator_set;     (** v - Upcoming validators *)
  auth_queues: Authorization.auth_queue array;  (** c - Per-core auth queues *)
  manager: int;             (** p[0] - Manager service ID *)
  assigners: int array;     (** p[1] - Per-core assigner services *)
  delegator: int;           (** p[2] - Delegator service ID *)
  registrar: int;           (** Registrar service ID *)
  always_accumulators: (int * int64) list;  (** Services with free gas *)
}
```

</div>

## Deferred Transfers (T)

Services communicate via deferred transfers:

```
T = (source, dest, amount, memo, gas)

source:  Service that sent the transfer
dest:    Service that receives it
amount:  Balance to transfer
memo:    Explanation (up to 128 bytes)
gas:     Gas provided for processing
```

<div class="callout callout-info">

**ELI5: Interoffice Mail with Budget**

A deferred transfer is like sending interoffice mail:
- **Source/Dest** = From/To departments
- **Amount** = Money enclosed
- **Memo** = Cover letter explaining why
- **Gas** = Postage budget for the recipient to process it

The sender pays the "postage" from their own gas budget.

</div>

When the recipient's Accumulate runs, its balance is first credited with the amounts of all transfers addressed to it, and the transfers' gas is added to its gas limit (appendix B.4, eq. `accinvocation`). A recipient without code still receives the balance.

<div class="lasair-connection">

### In Lasair: Deferred Transfers

```ocaml
(* From lib/accumulation.ml *)

(** Memo size for deferred transfers *)
let c_memo_size = 128

(** Deferred transfer between services *)
type deferred_transfer = {
  source: int;            (** Source service index *)
  dest: int;              (** Destination service index *)
  amount: int64;          (** Balance to transfer *)
  memo: bytes;            (** Memo (max c_memo_size bytes) *)
  gas: int64;             (** Gas limit for transfer processing *)
}

(** Validate transfer memo size *)
let is_valid_transfer (xfer : deferred_transfer) : bool =
  Bytes.length xfer.memo <= c_memo_size
```

</div>

## Privileged Transitions

Privileged services can modify global state (GP 0.8.0 lettering):

| Service | Symbol | Can Set |
|---------|--------|---------|
| **Manager** | χ_M | The privileged services (via `bless`) |
| **Assigners** | χ_A | One per core: that core's authorizer queue φ (via `assign`) |
| **Delegator** | χ_V | Next validator keys ι (via `designate`) |
| **Registrar** | χ_R | Services with protected low indices (via `new`) |
| **Always-accumulate** | χ_Z | Not a role: services accumulated every block with a gas allowance |

```
χ'_M, χ'_Z = e(χ_M).(χ_M, χ_Z)   ← Manager's post-state
φ'[c]      = e(χ_A[c]).φ[c]      ← Each core's assigner sets that core's queue
ι'         = e(χ_V).ι            ← Delegator sets next validator keys
```

(e(x) is the post-state of service x's accumulation; section 12.2, eq. `accpar`. `designate` must supply a number of keys in 𝕍, a multiple of 3 from 6 to 1023, or it returns HUH; `bless` returns HUH unless called by the manager: both are GP 0.8.0 changes, appendix B.7.)

<div class="callout callout-warning">

**Power Transfer**

If the manager service (χ_M) decides to set a different service as the manager, it effectively passes the baton. The new manager then controls who the privileged services are.

</div>

## Parallel Execution

A key design insight:

> "Our model is that these services execute all without reference to each other."

This means:
- All services can accumulate **simultaneously**
- No service reads another's in-progress state
- State changes are collected, then applied at the end

```
Phase 1: Execute all services in parallel
         ├── A(service_1) → output_1
         ├── A(service_2) → output_2
         └── A(service_3) → output_3

Phase 2: Merge all outputs into state
         ├── Apply account changes
         ├── Process deferred transfers
         └── Update privileged state
```

## Service Creation

Services create services with the `new` host call (GP 0.8.0, Ω_N). The new service gets
the creator's next-free id i, which starts from a hash of the creator's id, the entropy
η′₀ and the block's timeslot, mapped into the public range above S = 2^16. A `check`
function steps past any id that already names a service:

```
check(i) = i                                                   if no service has id i
         = check((i - S + 1) mod (2^32 - 2^8 - S) + S)         otherwise

after each new:  i* = check(S + (i - S + 42) mod (2^32 - S - 2^8))
```

So an id collision never makes a block invalid: `check` moves to the next free id. The
Graypaper says the hash makes the id "almost certainly unique" within one service's
accumulation, and `check` covers the rest (accounts across services and time). Only the
registrar may ask for a particular id, and only below S.

lasair once moved i on from the raw value instead of the checked id; the official
fuzzer's first GP 0.8.0 batch caught it.

## State Transition Stages

The accumulation happens in stages:

```
δ (prior state)
    │
    ▼
[Δ₊: rounds of accumulation; each round runs Δ₁(s) for all s in S,
 and delivers the previous round's transfers to their recipients]
    │
    ▼
δ† (after accumulation)
    │
    ▼
δ‡ (last-accumulation slot updated for every accumulated service)
    │
    ▼
[Integrate the preimages extrinsic E_P]
    │
    ▼
δ' (posterior state)
```

(GP 0.8.0, sections 12.3 and 12.4. The lecture's order, with preimages integrated first and a transfer phase F_T at the end, is from an earlier draft.)

## Transfer Processing (F_T)

In the lecture, after all services finish accumulating, transfers are processed:

```
For each service d that received transfers:
  R(d) = all transfers where dest = d

  F_T(δ‡, R(d), d) → δ'[d]

This invokes the service's on_transfer entry point for each transfer.
```

In GP 0.8.0 there is no F_T and no `on_transfer`. The outer function Δ₊ runs accumulation in rounds: the transfers created in one round become inputs of the next round, where each recipient s is accumulated with those transfers (plus any remaining work-reports for it), with the transfers' gas added to its limit. Δ₊ repeats until there is nothing left to process or the block's gas runs out.

<div class="lasair-connection">

### In Lasair: Transfer Collection

lasair runs these rounds in `accumulate_sequentially` (`conformance/stf_guarantees.ml`): each round is one Δ* over the reports that fit, and "its deferred transfers integrate in the NEXT round". It also counts, per destination service, the transfers each round processed, for the GP 0.8.0 service statistics (Graypaper PR #502).

</div>

## Beefy Commitments

Each service can output a **commitment hash** for Beefy:

```
θ' = [ (s, y) | every service s whose Δ₁ yielded y ≠ ∅, over all rounds of Δ₊ ]
                                              -- GP 0.8.0 lettering (section 12.3)

This sequence of (service_id, commitment) pairs forms a Merkle tree (Keccak).
The root is appended to the accumulation output belt β_B (section 7).
```

Different services can use Beefy for different purposes:
- Parachains: Finality proofs for cross-chain bridges
- Other services: Custom commitment schemes

## Visual: Full Invocation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      INVOCATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │         PARALLEL ACCUMULATION (all services)                ││
│  │                                                             ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            ││
│  │  │ Service A  │  │ Service B  │  │ χ_M (mgr)  │            ││
│  │  │ Δ₁(A)→(e,t)│  │ Δ₁(B)→(e,t)│  │ Δ₁(χ_M)→e  │            ││
│  │  └────────────┘  └────────────┘  └────────────┘            ││
│  │        ↓              ↓               ↓                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              MERGE STATE CHANGES                            ││
│  │                                                             ││
│  │  • Apply account modifications (s)                          ││
│  │  • Check for service ID collisions                          ││
│  │  • Add new services (n)                                     ││
│  │  • Update privileged state (χ', φ', ι') from post-states    ││
│  │  • Collect Beefy commitments (C)                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              NEXT ROUND (GP 0.8.0)                          ││
│  │                                                             ││
│  │  Transfers from this round become inputs of the next:       ││
│  │    Δ₁(recipient) with the transfers → updated state         ││
│  │                                                             ││
│  │  (Accumulate entry point; there is no on_transfer)          ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                      │
│                          ▼                                      │
│                    δ' (final state)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **A function** = Per-service accumulation; in GP 0.8.0 Δ₁ returns (post-state, transfers, yield, gas used, provisions)
2. **Parallel execution** = Services don't see each other's in-progress state
3. **Deferred transfers** = Async communication between services (with gas budget)
4. **Privileged services** = χ_M, χ_A, χ_V (and χ_R) can modify global state; χ_Z are always accumulated
5. **Collision handling** = Block invalid if two services create same ID
6. **Rounds, not phases** = Transfers from one round are accumulated by their recipients in the next round of the same block
7. **Beefy commitments** = Services can output hashes for cross-chain bridges

## Graypaper References

- Section 12.2: Execution (eq. `accseq`, eq. `accpar`, eq. `accone`)
- Appendix B.4: Accumulate Invocation (eq. `accinvocation`)
- Section 12.3: Final State Integration
- (The lecture's F_T and F_A are not in GP 0.8.0.)

## What's Next

Return to the main accumulation section to see the complete picture.

[Back to 12.0 Accumulation &rarr;](lesson.html?lesson=011-graypaper-lectures/35-accumulation)
