---
title: Consensus and Validators
duration: 25 min
---

# Consensus and Validators

How do up to 1023 validators agree on the state of the world? JAM uses a hybrid consensus mechanism: **Safrole** for block production and **GRANDPA** for finality. Let's understand how it works.

## The Validator Set

Up to Graypaper v0.7, JAM had exactly V = 1023 validators. Since v0.8.0 the size is no longer a constant: every validator key sequence (ι, κ, λ, γ_P) has a length from the set

```
𝕍 = { 3c : c ∈ 2 .. 341 }     (* 6, 9, 12, ..., 1023; section 6.3, eq. valcount *)
```

Why multiples of 3? Every *active* core gets exactly three guarantors, so |κ| validators serve |κ|/3 active cores, and the full-size network, 1023 = 3 × 341, keeps all 341 cores busy. The erasure code is sized to the live set too (appendix H).

Each validator's key record is 336 octets (section 6.3):
- **Bandersnatch key** (32) - for the Safrole lottery (ring VRF) and block seals
- **Ed25519 key** (32) - for signing guarantees, assurances and judgments
- **BLS key** (144) - for BEEFY commitments
- **Metadata** (128) - opaque, e.g. a network address

Stake is not part of JAM state: the Graypaper leaves staking to a system hosted on JAM, which updates the keys through an API (section 4.8).

## In Lasair: Validator State

lasair keeps each key sequence as its serialized bytes: a length prefix, then one 336-octet record per validator (state keys C(7), C(8), C(9) and the head of C(4), length-prefixed since v0.8.0). `conformance/stf_config.ml` reads fields straight out of a record:

```ocaml
let vset_bandersnatch b i = vset_field b i ~field_off:0 ~n:32
let vset_ed25519 b i = vset_field b i ~field_off:32 ~n:32
let vset_metadata b i = vset_field b i ~field_off:208 ~n:128
```

## Safrole: Block Production

**Safrole** is JAM's block production mechanism. It determines who can produce each block:

### The Ticket System

Validators submit **tickets** (lottery entries) during each epoch. Tickets are anonymous thanks to ring signatures:

```
Epoch N:
┌─────────────────────────────────────────────────────────────┐
│  Ticket submission period (first 500 slots)                 │
│                                                              │
│    Validator 7 ──▶ [anonymous ticket A]                     │
│    Validator 42 ──▶ [anonymous ticket B]                    │
│    Validator 100 ──▶ [anonymous ticket C]                   │
│    ...                                                       │
│                                                              │
│  Tickets are shuffled and sorted by score                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
Epoch N+1:
┌─────────────────────────────────────────────────────────────┐
│  Block production (600 slots)                               │
│                                                              │
│    Slot 0: Winner of ticket A produces block                │
│    Slot 1: Winner of ticket B produces block                │
│    Slot 2: Winner of ticket C produces block                │
│    ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Ticket Properties

Each ticket has a **score** derived from a VRF (Verifiable Random Function):

```ocaml
(* Illustrative sketch (not lasair's code) *)
type ticket_proof = {
  attempt : int;          (* entry index, < ceil(2E / |γ_P'|): 0 or 1 at 1023 validators *)
  ring_proof : bytes;     (* 784-octet Bandersnatch ring VRF proof *)
}

(* The score IS the ticket identifier: the VRF output of the ring proof,
   over context "$jam_ticket_seal" ++ η'_2 ++ attempt. Lower is better. *)
let ticket_id proof = vrf_output proof.ring_proof
```

The 600 lowest identifiers (one per slot) win the right to produce blocks. Since v0.8.0 the number of attempts per validator scales with the set size, n = ⌈2E/|γ_P′|⌉, so that even a small validator set can fill all 600 slots (section 6.7, eq. ticketsextrinsic).

### Why Ring Signatures?

A ring signature proves "I am one of next epoch's validators" without revealing which one. This provides:

1. **Anonymity** - Can't target the next block producer for DoS
2. **Fairness** - Can't bribe the known next producer
3. **Unpredictability** - Block producer unknown until reveal

## In Lasair: Safrole Implementation

```ocaml
(* Illustrative sketch (not lasair's code); GP 0.8.0 names *)
type safrole_state = {
  gamma_p : validator_key array;      (* γ_P: next epoch's keys (ring members) *)
  gamma_z : ring_root;                (* γ_Z: Bandersnatch ring root of γ_P *)
  gamma_s : slot_sealers;             (* γ_S: this epoch's slot-sealer sequence,
                                         600 tickets or 600 fallback keys *)
  gamma_a : ticket array;             (* γ_A: ticket accumulator, sorted by id *)
}

let process_ticket state ticket =
  (* Verify ring signature *)
  let* () = verify_ring_signature
    state.gamma_z
    ticket.ring_proof
    (ticket_id ticket) in

  (* Add to accumulator *)
  let tickets = Array.append state.gamma_a [| ticket |] in

  (* Keep only the C_EPOCH_LENGTH lowest ticket identifiers *)
  let sorted = Array.sort (fun a b ->
    compare (ticket_id a) (ticket_id b)
  ) tickets in
  let top = Array.sub sorted 0 (min (Array.length sorted) c_epoch_length) in

  Ok { state with gamma_a = top }
```

## Epochs and Rotation

Every 600 slots (1 hour), the epoch rotates:

```
┌─────────────────────────────────────────────────────────────┐
│                        Epoch Boundary                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Finalize ticket accumulator for next epoch               │
│  2. Rotate keys: γ_P ← Φ(ι), κ ← γ_P, λ ← κ                  │
│  3. Rotate entropy: η_1..η_3 shift down                      │
│  4. v0.8.0: if |κ| changed size, clear every availability    │
│     assignment in ρ                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Epoch Rotation, Formally

On an epoch change (e′ > e) the Graypaper rotates every key sequence at once (section 6.3):

```
(γ_P′, κ′, λ′, γ_Z′) = (Φ(ι), γ_P, κ, O([k_b | k ← γ_P′]))
```

Φ replaces any key belonging to a known offender with zeroes, and O is the Bandersnatch ring root of the new pending keys. There is no "if pending": the staging keys ι always move into γ_P. In lasair this happens in `Stf_transitions.update_safrole_epoch`, called from `import_block` in `conformance/trace_runner.ml`.

## Block Sealing

When a validator wins a slot, they produce a block and **seal** it:

The seal H_S is a 96-octet Bandersnatch (IETF VRF) signature over the rest of the header, made with the private key behind the slot's entry in γ_S: the ticket's owner, or in fallback mode the listed key (section 6.4). The header also carries the author index H_I (an index into κ′) and a second VRF signature, the entropy source H_V.

The seal proves:
1. This validator submitted the winning ticket
2. They are revealing their identity (and producing the block)

## GRANDPA: Finality

Safrole produces blocks, but they could be reverted. **GRANDPA** provides finality:

```
Block production (Safrole):    ───○───○───○───○───○───○───▶
                                  │   │   │
Finality (GRANDPA):           ────●───●───●──────────────▶
                              finalized    │
                                          └── not yet final
```

GRANDPA is a Byzantine fault-tolerant finality gadget:
- Validators vote on blocks
- When 2/3+ vote for the same block, it's **final**
- Final blocks can never be reverted

## Validator Duties

Each validator must:

### 1. Block Production
When your ticket wins a slot, produce a block within 6 seconds.

### 2. Attestation
Vote on block validity and sign assurances for data availability.

### 3. Finality Voting
Participate in GRANDPA rounds to finalize blocks.

### 4. Work Execution
Process work packages assigned to your core group.

## Core Assignment

The |κ′| validators are divided into groups of 3, one group for each of the |κ′|/3 *active* cores (all 341 when there are 1023 validators). The Graypaper shuffles the list of core indices [⌊i/3⌋ : i < v] with the epochal entropy η′_2, then rotates the result every R = 10 slots (section 11.3):

```
P(v, e, t) = R(F([⌊i/3⌋ | i ← 0 .. v−1], e), ⌊(t mod E) / R⌋)
R(c, n)    = [(x + n) mod (|c| / 3) | x ← c]
```

Each core group is responsible for:
- Executing work packages on that core
- Creating guarantees for work results
- Providing data availability

## In Lasair: Core Groups

From `conformance/stf_guarantees.ml`, returning the core of every validator:

```ocaml
let guarantor_assignment ~(v : int) ~(entropy : bytes) ~(slot : int) : int array =
  let active = max 1 (v / 3) in
  let base = Array.init v (fun i -> i / 3) in
  let shuffled = Lasair.Utilities.shuffle_array_with_hash base entropy in
  let n = (slot mod Stf_config.epoch_length ()) / Stf_config.rotation_period () in
  Array.map (fun c -> (c + n) mod active) shuffled
```

## Offenders: Recording Bad Behavior

The Graypaper does not define stake or slashing amounts. It keeps a permanent on-chain record of misbehavior, the offenders set ψ_O, and leaves the punishment (on Polkadot, slashing on the staking chain) to the higher-level validator-selection logic (section 10). What JAM itself does:

| Offense | On-chain consequence |
|---------|----------------------|
| Guaranteeing a report later judged bad (a *culprit*) | Ed25519 key added to ψ_O |
| Judging against the final verdict (a *fault*) | Ed25519 key added to ψ_O |
| Any key in ψ_O | Replaced by zeroes (Φ) when validator keys rotate or guarantors are assigned |

## Disputes, Formally

A *verdict* in the disputes extrinsic carries exactly ⌊2|k|/3⌋ + 1 signed judgments from one validator set k (κ for the current epoch, λ for the previous one). The number of "valid" judgments t decides the outcome (section 10.2, eq. verdicts):

```
t = ⌊2|k|/3⌋ + 1   →  good   (report hash into ψ_G; needs ≥ 1 fault)
t = 0              →  bad    (report hash into ψ_B; its core's ρ entry is cleared)
t = ⌊|k|/3⌋        →  wonky  (report hash into ψ_W; its core's ρ entry is cleared)
```

Culprits (guarantors of a bad report) and faults (judges on the wrong side) put their keys into ψ_O. Since v0.8.0 the thresholds use the live set size |k|, a block may carry at most 16 verdicts, 16 culprits and 16 faults, and a bad verdict no longer needs two culprits alongside it. In lasair, disputes run first in `import_block` via `Stf_guarantees.process_disputes`.

## The Security Model

JAM achieves security through:

1. **Economic security** - Validators have skin in the game (stake, held by the staking system JAM hosts)
2. **Cryptographic security** - Ring signatures, VRFs, hash functions
3. **Byzantine tolerance** - 2/3+ honest validators needed
4. **Finality** - GRANDPA makes reverts economically impossible

The threshold for safety: **no more than 1/3 of validators can be Byzantine**.

## Exercise: Epoch Timeline

Given:
- `c_epoch_length = 600` slots
- `c_seconds_per_slot = 6` seconds
- Tickets can be submitted in the first 500 slots

Calculate:
1. How long is an epoch in minutes?
2. How long is the ticket submission window?
3. What's the reveal period length?

<details>
<summary>Click to see answers</summary>

```ocaml
(* 1. Epoch length in minutes *)
let epoch_seconds = c_epoch_length * c_seconds_per_slot
(* = 600 * 6 = 3600 seconds = 60 minutes = 1 hour *)

(* 2. Ticket submission window *)
let ticket_window_slots = 500
let ticket_window_seconds = ticket_window_slots * c_seconds_per_slot
(* = 500 * 6 = 3000 seconds = 50 minutes *)

(* 3. Reveal period (slots after submission closes) *)
let reveal_slots = c_epoch_length - ticket_window_slots
(* = 600 - 500 = 100 slots *)
let reveal_seconds = reveal_slots * c_seconds_per_slot
(* = 100 * 6 = 600 seconds = 10 minutes *)
```

So: 50 minutes for ticket submission, 10 minutes for reveal/finalization.

</details>

## Exercise: Core Assignment

With 1023 validators and 341 cores (the full-size configuration):

1. How many validators per core?
2. If a validator is in core group 100, which validator indices might they work with?
3. How would you ensure fair rotation of core assignments?

<details>
<summary>Click to see answers</summary>

```ocaml
(* 1. Validators per core *)
let validators_per_core = 3
(* always 3: v validators serve v / 3 active cores; 1023 / 3 = 341 *)

(* 2. Core group 100 *)
(* Without rotation: validators 300, 301, 302 *)
(* With rotation (depends on epoch entropy): could be any 3 validators *)

(* 3. Fair rotation using Fisher-Yates shuffle *)
let shuffle_validators entropy validators =
  let arr = Array.copy validators in
  let n = Array.length arr in
  let rng = make_rng entropy in
  for i = n - 1 downto 1 do
    let j = rng (i + 1) in
    let tmp = arr.(i) in
    arr.(i) <- arr.(j);
    arr.(j) <- tmp
  done;
  arr

(* Each epoch, re-shuffle to assign different cores *)
let get_epoch_assignment epoch validators =
  let entropy = derive_epoch_entropy epoch in
  shuffle_validators entropy validators
```

The Graypaper does it slightly differently: it shuffles the list of core indices (not the validators) with η′_2 once per epoch, and between shuffles it rotates every validator to the next core every R = 10 slots, so no group sits on one core for long.

</details>

## Key Takeaways

1. **Up to 1023 validators** - A multiple of 3 (6 to 1023) since v0.8.0
2. **Safrole** - Ticket lottery for block production
3. **Ring signatures** - Anonymous until block reveal
4. **Epochs** - Rotate every 600 slots (1 hour)
5. **Core groups** - 3 validators per active core (341 at full size)
6. **GRANDPA** - Byzantine finality for irreversible blocks
7. **Offenders** - Misbehavior is recorded on-chain; punishment belongs to the staking system

## Next Up

Now that we understand consensus, let's see what work actually gets done: [Work and Services →](lesson.html?lesson=01-jam-protocol/04-work-packages)
