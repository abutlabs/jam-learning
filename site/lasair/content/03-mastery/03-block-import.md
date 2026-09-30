---
title: Block Import Pipeline
duration: 35 min
---

# Block Import Pipeline

When a block arrives, lasair must validate it, apply its changes, and update state. This is the State Transition Function (STF)—the heart of any blockchain implementation. Let's trace a block through lasair's import pipeline, the one that passed the M1 fuzzer on Graypaper 0.7.2 and now passes every published 0.8.0 block-import trace.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Block Import Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Receive │───▶│ Decode  │───▶│Disputes │───▶│Validate │  │
│  │  Block  │    │ (codec) │    │  (ψ')   │    │  Block  │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                      │              │        │
│                                      ▼              ▼        │
│                               ┌─────────┐    ┌─────────┐    │
│                               │ Reject  │    │  Apply  │    │
│                               │ (post = │    │   STF   │    │
│                               │   pre)  │    │         │    │
│                               └─────────┘    └─────────┘    │
│                                                    │        │
│                                                    ▼        │
│                                             ┌─────────┐    │
│                                             │  Post-  │    │
│                                             │  state  │    │
│                                             │  root   │    │
│                                             └─────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

The rule that shapes everything: a block is **valid or invalid as a whole**. If any check fails, the block is rejected and the state is exactly what it was before. There is no partially imported block.

## In Lasair: The Entry Point

The importer is `Trace_runner.import_block` in `conformance/trace_runner.ml`. The conformance test harness, the fuzz target and the live node all go through it (the node's `jamnp/chain.ml` wraps it). Abridged:

```ocaml
let import_block (pre_state : Lasair.State_db.t) (block : trace_block) : import_result =
  let header = block.header and extrinsic = block.extrinsic in
  let prev_slot = Stf_transitions.read_timeslot pre_state in
  let new_epoch =
    header.slot / Stf_config.epoch_length () > prev_slot / Stf_config.epoch_length () in

  (* Disputes FIRST: psi' depends only on the disputes extrinsic and psi,
     and the rest of the block is judged against the post-disputes state *)
  match Stf_guarantees.process_disputes pre_state header extrinsic with
  | Error reason -> Error reason
  | Ok state ->
  match Stf_guarantees.validate_block_guarantees ~pre_state state header extrinsic with
  | Error reason -> Error reason
  | Ok () ->

  (* From here on the block is valid: apply the transition *)
  let state = Stf_transitions.update_timeslot state header.slot in
  let state = Stf_statistics.update_assurance_stats state extrinsic.assurances in
  let state = Stf_statistics.update_statistics ~new_epoch state header.slot header.author_index in
  let state = Stf_transitions.update_entropy ~new_epoch state header.slot
                header.entropy_source header.epoch_mark in
  let state = (match header.epoch_mark with
    | Some em when new_epoch ->
      Stf_transitions.update_safrole_epoch state ~prev_slot ~slot:header.slot em header.tickets_mark
    | _ -> state) in
  let state = Stf_transitions.process_tickets state header.slot extrinsic.tickets in
  (* ... ticket statistics ... *)
  let state = Stf_guarantees.process_guarantees ~preimages:extrinsic.preimages ~prev_slot
                state header.slot extrinsic.guarantees extrinsic.assurances in
  let state = Stf_guarantees.update_auth_pools state ~slot:header.slot extrinsic.guarantees in
  let state = Stf_guarantees.process_preimage_extrinsic state header.slot extrinsic.preimages in
  (* ... preimage and guarantee statistics ... *)
  let state = Stf_transitions.update_history state header header.parent_state_root
                extrinsic.guarantees in
  Ok state
```

The caller then compares `State_db.root state` with the expected post-state root.

## Phase 1: Validation

`validate_block_guarantees` runs every check the Graypaper places on a block before any of its effects are applied. Each failure has a short, stable name (the same names the test vectors use where they have one):

### The header against its parent

```ocaml
if not (Bytes.equal (compute_extrinsic_hash extrinsic) header.extrinsic_hash)
then raise (Reject "bad_extrinsic_hash");
(* H_r is the posterior state root of the parent: the root of the pre-state we hold *)
if not (Bytes.equal parent_state_root (Lasair.State_db.root pre_db)) then
  raise (Reject "bad_parent_state_root");
```

The parent itself is implicit here: the importer is handed the parent's state. In a live node, the block tree finds that state by the header's parent hash (`jamnp/block_tree.ml`), and a block whose parent is unknown is fetched or held, not imported.

### Time, author, seal

In order: the slot must be later than the parent's (`bad_slot`); the author index must name a validator of the posterior active set (`bad_author_index`); the seal must verify for the slot's ticket or fallback key (`bad_seal`); the entropy-source VRF signature must verify (`bad_vrf`); the epoch and tickets markers must be exactly what this block should carry (`bad_epoch_mark`, `bad_tickets_mark`); and the offenders marker must list exactly the new culprits and faults (`bad_offenders_mark`).

### The extrinsics

- **Guarantees:** ordered by core with no core twice, then per guarantee: a valid, active core (`bad_core_index`), the right number of erasure shards for the current set (`bad_erasure_shards`, new in 0.8.0), an anchor in recent history with a matching state root, MMR root and slot (`bad_state_root`, `bad_beefy_mmr_root`, `bad_anchor_slot`), known services and current code hashes (`bad_service_id`, `bad_code_hash`), and 2–3 valid signatures from validators assigned to the core (`bad_signature`).
- **Assurances:** sorted, unique assurers (`not_sorted_or_unique_assurers`), valid indices, anchored on the parent (`bad_attestation_parent`), bits only for cores with a report (`core_not_engaged`), valid signatures.
- **Preimages:** sorted and unique (`preimages_not_sorted_unique`), and each one actually requested and not yet provided (`preimage_unneeded`).
- **Tickets:** allowed at this point in the epoch (`unexpected_ticket`), a valid ring proof (`bad_ticket_proof`), sorted by id (`bad_ticket_order`), no duplicates (`duplicate_ticket`), each one good enough to stay in the accumulator (`ticket_not_retained`), a valid entry index (`bad_ticket_attempt`), at most K per block (`too_many_tickets`).

## Phase 2: State Transition

Once the block is known to be valid, its effects are applied. The order is not arbitrary. The Graypaper's overview gives a dependency graph (eq. transitionfunctioncomposition): which new state components are computed from which old or new ones. Condensed:

```
τ'                        ← the header
ψ' (disputes)             ← the disputes extrinsic, ψ
ρ† (post-judgment)        ← the disputes extrinsic, ρ
ρ‡ (post-assurances)      ← the assurances, ρ†
ρ' (with new guarantees)  ← the guarantees, ρ‡, κ, τ'
reports now available     ← the assurances, ρ†
accumulation              ← those reports, the ready queue, the accounts, ...
β' (recent history)       ← the header, the guarantees, the accumulation outputs
preimages                 ← the preimages extrinsic, the post-accumulation accounts
α' (authorizer pools)     ← the guarantees, the post-accumulation queue φ'
π' (statistics)           ← nearly everything
```

Lasair's order above follows this graph. Two places where it matters:

- **Disputes first.** Assurance bits are judged against ρ†, the availability assignments *after* disputes removed bad reports. A lasair importer that validated assurances against the old ρ would accept or reject different blocks than the reference.
- **Preimages after accumulation.** A preimage in this block's extrinsic is integrated into the accounts *after* accumulation ran, so accumulate code in the same block cannot see it yet.

## Phase 3: Accumulation

`process_guarantees` handles the whole availability-to-accumulation path: assurances mark reports available; available reports whose dependencies are met join the accumulation queue; accumulation runs within the block's gas budget G_T; and new guarantees take their cores.

```ocaml
(* A sketch of what process_guarantees does, in Graypaper order *)
let available = reports_with_supermajority_assurances rho_dagger assurances in
(* more than two-thirds of |κ| assurers: ⌊2|κ|/3⌋ + 1 *)
let queue = ready_queue_add state available in       (* with their dependencies *)
let accumulatable, still_waiting = split_by_dependencies queue in
let state, outputs, stats =
  accumulate_sequence state accumulatable ~gas_budget:(block_acc_gas state) in
(* Each service's ACCUMULATE runs in the PVM, at instruction counter 5,
   with its operands (work digests, including failed ones) and
   the deferred transfers addressed to it *)
let rho' = place_new_guarantees rho_double_dagger guarantees in
...
```

Two details worth knowing before you write your own:

- **Failed work is still accumulated.** A work item that panicked or ran out of gas in refine reaches accumulate as an operand with an *error* result. The service's accumulate code decides what to do with it; the importer does not skip it.
- **Accumulation runs in rounds.** Each round (the Graypaper's Δ+, eq. accseq) takes the longest prefix of the ready reports whose gas limits, plus any waiting transfers and the always-accumulate services, fit the remaining budget. The transfers a round creates are delivered in the next round, with the next reports that fit. Reports that never fit wait for a later block. A service that panics in a later round does not undo an earlier one.

## Phase 4: Finalization

The last steps update the bookkeeping:

### Advance Time

```ocaml
(* Stf_transitions.update_timeslot: τ' = H_t *)
let state = Stf_transitions.update_timeslot state header.slot
```

### Epoch Rotation

On the first block of a new epoch (`new_epoch`, the epoch *index* changed, which is not the same as `slot mod E = 0`: slots can be skipped), Safrole rotates:

```ocaml
(* Sketch of the Graypaper's epoch change (Safrole, ch. 6) *)
let rotate_epoch state ~last_slot_of_prev_epoch =
  let pending = phi state.staging_set in      (* ι, with offenders' keys nulled *)
  { state with
    pending_set = pending;                    (* γ_P' : next epoch's keys *)
    active_set = state.pending_set;           (* κ'  = γ_P *)
    previous_set = state.active_set;          (* λ'  = κ   *)
    epoch_root = ring_root pending;           (* γ_Z' *)
    slot_sealers =                            (* γ_S' *)
      if last_slot_of_prev_epoch >= tail_start && full state.ticket_accumulator
      then outside_in state.ticket_accumulator        (* the winning tickets *)
      else fallback_keys state;                       (* keys from entropy *)
    ticket_accumulator = [];                  (* γ_A' *)
  }
```

Since Graypaper 0.8.0 these sets may change size here, so everything indexed by validator (statistics, assignments, the grid) must follow the new size.

### Update Recent History

```ocaml
(* Stf_transitions.update_history: patch the previous entry's state root
   with H_r, then append this block's entry *)
let state = Stf_transitions.update_history state header header.parent_state_root
              extrinsic.guarantees
```

Each β entry holds the header hash, the accumulation-output super-peak, the state root (patched in by the *next* block, since a block cannot know its own), the work packages reported in the block and, since 0.8.0, the block's timeslot. The last H = 8 entries are kept.

## Error Handling

An import returns `Ok state` or `Error reason`. The reason names the first failed rule, which is exactly what the conformance fuzzer compares:

```ocaml
type import_result =
  | Ok of Lasair.State_db.t
  | Error of string

(* Examples of reasons: "bad_extrinsic_hash", "bad_seal", "bad_slot",
   "bad_core_index", "bad_signature", "core_not_engaged",
   "preimage_unneeded", "too_many_tickets", ... *)
```

When the harness compares against a reference, the outcome is one of: `matches`, `rejected_as_expected`, `post_state_root` (imported to the wrong state), `imported_invalid` (accepted a block the reference rejected), `rejected_valid` (rejected a block the reference imported), or `state_mismatch` (the right root over different key-values).

## Tracing and Debugging

For conformance work, lasair can explain an import:

```bash
# Verbose host-call and STF logging for one trace
LASAIR_DEBUG=1 dune exec bin/runner.exe -- test "Traces .storage." 5

# Per-step PVM trace ("pc gas r0..r12" per line), and a recording of every
# host call that can be replayed through polkavm to compare
LASAIR_TRACE_FILE=/tmp/run.trace LASAIR_REPLAY_DUMP=/tmp/run \
  dune exec bin/runner.exe -- test "Accumulate STF" 19
```

And `bin/seed_check.exe` replays a fuzzer report's blocks through `import_block`, printing the first diverging state key with its expected and computed bytes. With `LASAIR_REPLAY_JSONL` set it writes one JSON line per step, the structured outcome above.

## Pipeline Diagram

```
Block arrives
      │
      ▼
┌─────────────────┐
│ Disputes        │──────────▶ Error: bad verdicts, culprits, faults
│   ψ', ρ†        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Header checks   │──────────▶ Error: bad_extrinsic_hash, bad_parent_state_root,
│   H_x, H_r, H_t │                   bad_slot, bad_author_index, bad_seal, ...
│   H_i, H_s, H_v │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extrinsic checks│──────────▶ Error: guarantee, assurance,
│   E_G E_A E_P   │                   preimage, ticket rules
│   E_T           │
└────────┬────────┘
         │   (valid from here on: no more rejections)
         ▼
┌─────────────────┐
│ Time, stats,    │
│ entropy, Safrole│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Availability →  │
│ Accumulation →  │
│ New guarantees  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth pools,     │
│ preimages,      │
│ history         │
└────────┬────────┘
         │
         ▼
    Post-state
    (and its root)
```

## Exercise: Order the Validations

Why is this order important? Reorder these for maximum efficiency:

1. Validate seal (expensive crypto)
2. Validate parent (cheap hash compare)
3. Validate parent state root (compare with a root you already have)
4. Validate slot (cheap integer compare)
5. Validate extrinsic hash (hash the extrinsic parts)

<details>
<summary>Click to see optimal order</summary>

```
Optimal order (cheapest first):

1. Validate parent      - O(1), just compare 32 bytes
2. Validate slot        - O(1), compare integers
3. Validate state root  - O(1) if you kept the parent's posterior root
4. Validate ext hash    - hash the five extrinsic parts once
5. Validate seal        - Bandersnatch verification, the most expensive

Rationale:
- Fail fast on cheap checks
- Don't waste expensive crypto on obviously invalid blocks

But note: efficiency may choose the order of checks only when the
outcome cannot depend on it. The fuzzer compares the REASON a block
was rejected as well as whether it was. If a block breaks two rules,
you must name the same one the reference does, so in practice an
importer checks in the order the reference implementation and the
test vectors expect, and keeps cheap-first only where that is free.
```

</details>

## Exercise: Trace a Guarantee

Given this guarantee, in a block at slot 1236 on the full spec:

```ocaml
let guarantee = {
  report = {
    package_spec = { hash = h "..."; erasure_shards = 1023; ... };
    core_index = 42;
    context = { anchor = recent_hash; anchor_slot = 1234; ... };
    results = [
      { service = 100; result = Ok data1 };
      { service = 100; result = Ok data2 };
      { service = 200; result = Error Panic };
    ];
  };
  slot = 1235;
  credentials = [(v1, sig1); (v2, sig2)];
}
```

What happens during processing?

<details>
<summary>Click to see trace</summary>

```
1. VALIDATE (before any effect)
   - core 42 is < 341 and active for the current set size ✓
   - erasure_shards = 1023 = |κ'| ✓ (GP 0.8.0 check)
   - anchor is in recent history, its state root and MMR root
     match, and anchor_slot = the slot in its β entry ✓
   - services 100 and 200 exist; code hashes are current ✓
   - two credentials (2 or 3 are allowed), sorted, unique ✓
   - v1 and v2 were assigned to core 42 in slot 1235's rotation
     (the current or the previous one) ✓
   - each signature is over the report hash ✓

2. PLACE ON THE CORE
   - core 42 must be free (no report waiting there) after
     assurances and disputes; the report takes it, stamped
     with the current slot

3. LATER: AVAILABILITY
   - assurances arrive in later blocks
   - more than 2/3 of validators (⌊2|κ|/3⌋ + 1) set core 42's bit
   - the report becomes available and leaves the core
   - (if that takes more than U = 5 slots, the report is dropped)

4. ACCUMULATE
   - service 100: accumulate receives both digests
   - service 200: accumulate receives its digest too, with the
     Panic error as the result - the service decides what to do
   - state changes, transfers and the output commitment follow
```

</details>

## Key Takeaways

1. **All or nothing** - Any failed rule rejects the block; the state is untouched
2. **Disputes first** - the rest of the block is judged against the post-disputes state
3. **Dependency order** - the Graypaper's graph fixes which new values each step may read
4. **Named rejections** - the reason matters as much as the verdict
5. **Failed work still accumulates** - as an error result, for the service to handle
6. **State immutability** - Each step produces new state

## Next Up

How is lasair worked on? [Contributing to Lasair →](lesson.html?lesson=03-mastery/04-contributing)
