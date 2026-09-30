---
title: State and Blocks
duration: 25 min
---

# State and Blocks

JAM is a state machine. Blocks are inputs. State is the output. Understanding how JAM structures its data is essential for reading lasair's code.

## The State Model

JAM's state is a structured value containing everything the protocol tracks. In Graypaper v0.8.0 it is a tuple of 17 components, σ ≡ (α, β, θ, γ, δ, η, ι, κ, λ, ρ, τ, φ, χ, ψ, π, ω, ξ) (section 4.2):

```
┌─────────────────────────────────────────────────────────────┐
│                         JAM State (σ)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Cores & authorization         Services                      │
│   α: authorizer pools           δ: service accounts          │
│   φ: authorizer queues          χ: privileged services       │
│   ρ: availability assignments   ω: work-reports ready to     │
│      (one guaranteed report        accumulate                │
│       per core, pending DA)     ξ: recently accumulated      │
│                                    packages                  │
│  Validators                     θ: last accumulation outputs │
│   ι: staging keys (next)                                     │
│   κ: active keys                Time, history, statistics    │
│   λ: previous epoch's keys       τ: most recent timeslot     │
│   ψ: judgments (disputes)        η: entropy (4 hashes)       │
│                                  β: recent blocks + belt     │
│  Safrole (γ)                     π: validator, core and      │
│   γ_P: pending keys                 service statistics       │
│   γ_Z: Bandersnatch ring root                                │
│   γ_S: slot-sealer sequence                                  │
│   γ_A: ticket accumulator                                    │
└─────────────────────────────────────────────────────────────┘
```

Two v0.8.0 details worth knowing already. The validator key sequences (ι, κ, λ, γ_P) no longer have a fixed length of 1023: any multiple of 3 from 6 up to 1023 is allowed (section 6.3). And ρ, formerly "pending reports", is now called the *availability assignments*: each core holds at most one whole guarantee (report, timeslot and guarantor signatures) with the time it was reported (section 11.1).

## In Lasair: State Definition

lasair does not hold σ as one big OCaml record. It holds the *serialized* state, the dictionary T(σ) of Graypaper appendix D.1: every component lives under a 31-byte state key (C(1) is α, C(2) is φ, and so on up to C(16), θ), and each service account, storage item and preimage gets a key of its own. From `lib/state_db.ml`:

```ocaml
(* State database: sparse key-value store with a memoized root. *)
type t = {
  map: bytes KeyMap.t;          (* 31-byte state key -> encoded value *)
  mutable root: bytes option;   (* memoized Merkle root *)
}
```

Each state-transition step decodes the component it needs from its key, computes the posterior value, and writes it back encoded. Each key still corresponds to a Greek letter in the Graypaper.

## Services: The Heart of JAM

Services are stateful programs that process work. A service account (section 9, eq. serviceaccount) holds:

```
s  storage             key blob -> value blob
p  preimages           hash -> blob (the code lives here, under c)
l  preimage requests   (hash, length) -> up to 3 timeslots
c  code hash           b  balance
g  min gas per accumulated work-item
m  min gas per deferred transfer
f  gratis storage offset
r  creation slot       a  last accumulation slot
p  parent service
```

There is no per-service storage root. Every storage item, preimage and request has its own key in the state dictionary (appendix D.1), so the single state root commits to all service storage directly. Storage is on-chain state, not data-availability data.

## Block Structure

A block contains the state transition:

```
┌─────────────────────────────────────────────────────────────┐
│                          Block                               │
├─────────────────────────────────────────────────────────────┤
│  Header                                                      │
│  ├── parent_hash       H_P (previous block)                 │
│  ├── prior_state_root  H_R (Merkle root of state before)    │
│  ├── extrinsic_hash    H_X (commitment to the body)         │
│  ├── timeslot          H_T (time slot number)               │
│  ├── epoch_marker      H_E (first block of an epoch)        │
│  ├── tickets_marker    H_W (next epoch's winning tickets)   │
│  ├── offenders_marker  H_O (newly punished keys)            │
│  ├── author_index      H_I (index into κ′)                  │
│  ├── entropy_source    H_V (VRF signature, randomness)      │
│  └── seal              H_S (block producer signature)       │
├─────────────────────────────────────────────────────────────┤
│  Body (Extrinsics)                                          │
│  ├── tickets           (lottery entries)                    │
│  ├── preimages         (data availability)                  │
│  ├── guarantees        (work package attestations)          │
│  ├── assurances        (data availability confirmations)    │
│  └── disputes          (slashing evidence)                  │
└─────────────────────────────────────────────────────────────┘
```

## In Lasair: Block Definition

From `conformance/trace_types.ml`:

```ocaml
type trace_header = {
  parent: bytes;
  parent_state_root: bytes;
  extrinsic_hash: bytes;
  slot: int;
  epoch_mark: trace_epoch_mark option;       (* None if null *)
  tickets_mark: header_ticket list option;   (* winning tickets for next epoch *)
  author_index: int;
  entropy_source: bytes;
  offenders_mark: bytes list;
  seal: bytes;
}

type trace_extrinsic = {
  tickets: trace_ticket list;
  preimages: (int * bytes) list;   (* (requester service id, blob) *)
  guarantees: trace_guarantee list;
  assurances: trace_assurance list;
  disputes: trace_disputes;
}

type trace_block = {
  header: trace_header;
  extrinsic: trace_extrinsic;
}
```

## Time: Slots and Epochs

JAM time is measured in **slots**:

```ocaml
let c_seconds_per_slot = 6      (* 6 seconds per slot *)
let c_epoch_length = 600        (* 600 slots per epoch = 1 hour *)
```

Time-related calculations:

```ocaml
(* Which epoch does this slot belong to? *)
let epoch_of_slot slot = slot / c_epoch_length

(* First slot of an epoch *)
let first_slot_of_epoch epoch = epoch * c_epoch_length

(* Does this block start a new epoch? Slots can be skipped, so compare
   epoch indices (GP: e' > e) rather than testing slot mod E = 0. *)
let is_epoch_boundary old_slot new_slot =
  new_slot / c_epoch_length > old_slot / c_epoch_length
```

Epochs are significant:
- Validator sets rotate at epoch boundaries
- Randomness is refreshed
- Tickets are accumulated

## State Roots and Merkle Trees

JAM uses Merkle trees to commit to state:

```
              Root Hash
                  │
         ┌───────┴───────┐
         │               │
    ┌────┴────┐     ┌────┴────┐
    │         │     │         │
  Hash01   Hash23  Hash45   Hash67
    │         │     │         │
   ┌┴┐       ┌┴┐   ┌┴┐       ┌┴┐
   │ │       │ │   │ │       │ │
  L0 L1     L2 L3 L4 L5     L6 L7
```

The **prior_state_root** in each block header commits to the entire state. Anyone can verify that specific state elements are part of that commitment.

## In Lasair: Merklization

The state root is not a plain binary tree over a list. It is a binary Patricia trie over the 31-byte state keys (appendix D.2): at each level the entries split on the next key bit, a lone entry becomes a leaf, and two subtrees become a branch. From `lib/state_db.ml`:

```ocaml
(* Compute Merkle root for state trie (31-byte keys) *)
let rec merkle_state (kvs : kv list) (bit_idx : int) : bytes =
  match kvs with
  | [] ->
    (* Empty: return 32 zero bytes *)
    Bytes.make 32 '\x00'
  | [{ key; value }] ->
    (* Single: hash the leaf *)
    hash (leaf key value)
  | _ ->
    (* Multiple: partition by current bit *)
    let left, right = List.partition (fun kv -> not (get_bit kv.key bit_idx)) kvs in
    let left_root = merkle_state left (bit_idx + 1) in
    let right_root = merkle_state right (bit_idx + 1) in
    hash (branch left_root right_root)
```

The plain well-balanced binary Merkle tree of appendix E.1 (used for things like the erasure root) is `merkle_root_balanced` in `lib/merklization.ml`.

## The State Transition

A block transforms state according to this function:

```
σ' = Υ(σ, B)
```

Where:
- σ is the prior state
- B is the block
- σ' is the posterior state
- Υ (Upsilon) is the state transition function

## In Lasair: STF

From `conformance/trace_runner.ml`, `import_block` (abridged):

```ocaml
(* Disputes FIRST: verdicts are judged against the prior state *)
match Stf_guarantees.process_disputes pre_state header extrinsic with
| Result.Error reason -> reject reason
| Result.Ok state ->
match Stf_guarantees.validate_block_guarantees ~pre_state state header extrinsic with
| Result.Error reason -> reject reason
| Result.Ok () ->
let state = Stf_transitions.update_timeslot state header.slot in
let state = Stf_statistics.update_assurance_stats state extrinsic.assurances in
let state = Stf_statistics.update_statistics ~new_epoch state header.slot header.author_index in
let state = Stf_transitions.update_entropy ~new_epoch state header.slot header.entropy_source header.epoch_mark in
(* ... safrole epoch change, tickets, guarantees + assurances + accumulation,
   authorizer pools, preimages, statistics, recent history ... *)
Ok state
```

Each step transforms the state, and an invalid block is rejected whole: the posterior state is the prior state.

## Guarantees: Work Package Commitments

When validators complete work, they create **guarantees**:

```ocaml
(* conformance/trace_types.ml, abridged *)
type trace_guarantee = {
  tg_report: trace_work_report;
  tg_slot: int;
  tg_signatures: trace_signature list;   (* 2 or 3 guarantors *)
}

type trace_work_report = {
  tr_package_spec: trace_package_spec;   (* package hash, erasure root, erasure shards, ... *)
  tr_context: trace_refine_context;      (* anchor and lookup-anchor blocks *)
  tr_core_index: int;
  tr_authorizer_hash: bytes;
  tr_auth_gas_used: int64;
  tr_auth_output: bytes;
  tr_segment_root_lookup: (bytes * bytes) list;
  tr_results: trace_work_result list;    (* one work-digest per work-item *)
}
```

A guarantee says: "We validators have executed this work package and attest to these results." Since v0.8.0 the whole guarantee, signatures included, is what sits in ρ while the package's data is made available.

## Assurances: Data Availability

Before work results can be accumulated, we need to be sure the data is available:

```ocaml
(* conformance/trace_types.ml *)
type trace_assurance = {
  ta_anchor: bytes;            (* parent block this refers to *)
  ta_bitfield: bytes;          (* one bit per core: "I hold my shards" *)
  ta_validator_index: int;
  ta_signature: bytes;
}
```

Validators signal which work packages they have data for. A report becomes available once more than two-thirds of the active validators (> 2/3 · |κ|, a live count since v0.8.0) have set its core's bit; then its work results can be processed.

## The Data Flow

```
1. User submits Work Package to a validator
           │
           ▼
2. Validator executes REFINE, creates Work Report
           │
           ▼
3. Validator group creates Guarantee (signed attestation)
           │
           ▼
4. Guarantee included in Block
           │
           ▼
5. Other validators confirm Data Availability (Assurances)
           │
           ▼
6. Work Results ACCUMULATED into service state
           │
           ▼
7. State transition complete
```

## Exercise: State Diagram

Draw a diagram showing:
1. The major components of JAM state
2. Which extrinsic types modify which state components
3. The flow from work package to state update

<details>
<summary>Click to see a simplified answer</summary>

```
Extrinsic Type    →    State Component(s) Modified
─────────────────────────────────────────────────────
tickets           →    γ_A (ticket accumulator)
preimages         →    δ (service preimages)
guarantees        →    ρ (availability assignments)
assurances        →    ρ (clears reports now available),
                       then accumulation: δ, ω, ξ, θ, ...
disputes          →    ψ (judgments, offenders), ρ (clears bad reports)

Work Flow:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Work Package │────▶│   Guarantee  │────▶│  Assurance   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
   [off-chain]         [on-chain]           [on-chain]
   refine()        ρ (assignment)       availability++
       │                    │                    │
       └────────────────────┴────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Accumulate  │
                    │  (on-chain)  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Service State│
                    │   Updated    │
                    └──────────────┘
```

</details>

## Exercise: Calculate State Size

Given these constants from the Graypaper:

```ocaml
let c_service_count = 2^32      (* Max services *)
let c_validator_count = 1023    (* Validators: the full-size set; at most 1023 since v0.8.0 *)
let c_core_count = 341          (* Cores *)
let c_recent_blocks = 8         (* Recent history *)
```

Estimate the minimum state size in bytes for:
1. Validator keys (32 bytes each for Ed25519)
2. Recent block headers (approximately 200 bytes each)
3. Service account metadata (excluding storage)

<details>
<summary>Click to see calculation</summary>

```ocaml
(* Validator keys *)
let validator_key_size = 32 (* Ed25519 public key *)
let validator_state_size = c_validator_count * validator_key_size
(* = 1023 * 32 = 32,736 bytes ≈ 32 KB *)

(* Recent blocks *)
let block_info_size = 200 (* approximate *)
let recent_blocks_size = c_recent_blocks * block_info_size
(* = 8 * 200 = 1,600 bytes ≈ 1.6 KB *)

(* Service accounts - just metadata, not storage *)
let service_account_size = 1 + 32 + 5 * 8 + 4 * 4
(* version byte + code hash + (b, g, m, o, f) as 8-byte + (i, r, a, p) as 4-byte *)
(* = 89 bytes per service (appendix D.1, key C(255, s)) *)
(* With 2^32 services, this is huge! But most will be empty/unallocated *)

(* Active core state *)
let core_state_size = c_core_count * 256 (* estimate *)
(* = 341 * 256 = 87,296 bytes ≈ 85 KB *)
```

The actual state is dominated by service storage, whose items sit in the same state trie under their own keys.

</details>

## Key Takeaways

1. **State is structured** - Named components with specific purposes
2. **Blocks are transitions** - Each block transforms state via the STF
3. **Services own state** - Each service has code, balance, and storage
4. **Time is discrete** - Slots and epochs define the rhythm
5. **Merkle roots commit** - State is summarized by cryptographic hashes
6. **Extrinsics are ordered** - Tickets, preimages, guarantees, assurances, disputes

## Next Up

How do validators agree on which blocks are valid? [Consensus and Validators →](lesson.html?lesson=01-jam-protocol/03-consensus)
