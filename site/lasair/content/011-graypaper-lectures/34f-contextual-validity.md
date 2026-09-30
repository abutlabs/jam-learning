---
title: "11.4.1 Contextual Validity of Reports"
duration: 6 min
video: https://www.youtube.com/watch?v=DmsYh92Yg3Q
---

# Graypaper Section 11.4.1: Contextual Validity of Work Reports

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains the **contextual validity checks** for work reports - how JAM ensures that work reports reference valid state and aren't duplicates.

## What This Section Covers

- Anchor block validation
- State root and Beefy root checks
- Lookup anchor for historical data
- Duplicate work package detection
- Prerequisite work package validation
- Code hash validation

## The Big Picture

Before a work report can be guaranteed, it must pass contextual validity checks:

```
Work Report
     |
     v
+--------------------+
| CONTEXTUAL CHECKS  |
+--------------------+
|                    |
| 1. Anchor valid?   |---> Must be in recent H blocks
|                    |
| 2. Roots match?    |---> State/Beefy roots (and, since
|                    |     GP 0.8.0, the anchor slot) must match
| 3. Not duplicate?  |---> Package hash not anywhere in the pipeline
|                    |
| 4. Prereqs met?    |---> Prerequisites reported (this block or recently)
|                    |
| 5. Code valid?     |---> Service code hash matches
|                    |
+--------------------+
     |
     v
Valid to guarantee
```

<div class="callout callout-info">

**ELI5: The Reference Check**

Imagine submitting an expense report:
- **Anchor** = "Based on the March budget" - must reference a real, recent budget
- **State root** = The budget totals must match what was actually recorded
- **No duplicates** = Can't submit the same receipt twice
- **Prerequisites** = "After the Q1 report is approved" - that must be done first
- **Code hash** = The accounting software version must match

</div>

## Anchor Block Validation

Work reports reference an **anchor block** for context:

```
Anchor must satisfy:
  anchor ∈ β (recent blocks, last H blocks)

Where:
  H = 8, the recent-history length
  β = the recent-history items (header hash, state root,
      accumulation-output super-peak and, since GP 0.8.0, timeslot)
```

The anchor provides the state context against which the work was executed.

<div class="lasair-connection">

### In Lasair: Anchor Validation

The import path checks the anchor and its roots together, in `rule_context`:

```ocaml
(* conformance/stf_guarantees.ml *)
(match entry with
 | None -> reject "anchor_not_recent"
 | Some e ->
   (* ... the newest entry's state root is patched first ... *)
   if not (Bytes.equal expected_root r.tr_context.rc_state_root) then
     reject "bad_state_root";
   (* ... *)
   if not (Bytes.equal e.e_beefy_root r.tr_context.rc_beefy_root) then
     reject "bad_beefy_mmr_root";
   (* GP 0.8.0 (#526): the context's anchor slot is the anchor block's slot *)
   if e.e_slot <> r.tr_context.rc_anchor_slot then
     reject "bad_anchor_slot")
```

</div>

## State Root and Beefy Root

The anchor's roots must match what the work report claims:

```
Given the recent-history item y for anchor block A:

REQUIRE: W.context.state_root  == y.state_root   (A's posterior state root)
REQUIRE: W.context.beefy_root  == y.beefy_root   (accumulation-output super-peak)
REQUIRE: W.context.anchor_slot == y.timeslot      (GP 0.8.0)

Why? Guarantees the work was executed against correct state.
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** recent-history items now record their block's timeslot, and the refinement context carries the anchor's timeslot, which must match it (`reporting_assurance.tex` 11.4.1; `recent_history.tex` 7, eq. `recenthistorydef`).

</div>

<div class="callout callout-info">

**ELI5: Checking the Ledger Version**

Before accepting your expense report, accounting verifies:
- "You say you calculated based on version 5.2 of the ledger"
- "Let me check... yes, that block's ledger was indeed version 5.2"
- If versions don't match, your calculations might be wrong!

</div>

<div class="lasair-connection">

### In Lasair: The Context Being Checked

```ocaml
(* lib/serialization.ml *)
type refinement_context = {
  anchor: bytes;
  anchor_slot: int;                 (** GP 0.8.0: anchor block timeslot, encode[4] (GP #526) *)
  state_root: bytes;
  beefy_root: bytes;
  lookup_anchor: bytes;
  lookup_anchor_slot: int;
  lookup_anchor_state_root: bytes;  (** GP 0.8.0: lookup-anchor posterior state root (GP #526) *)
  prerequisites: bytes list;  (* List of 32-byte hashes *)
}
```

The root checks themselves are the `rule_context` excerpt above.

</div>

## Lookup Anchor

Work packages can also specify a **lookup anchor** for historical data access:

```
Lookup anchor constraints:
  1. At most L = 14,400 timeslots (24 hours) old
  2. Its header is among the ancestors every node keeps for L
     timeslots, with matching hash and timeslot
  3. GP 0.8.0: the context's lookup_anchor_state_root equals the
     prior-state root in the header of the lookup anchor's child,
     i.e. the lookup anchor's posterior state root
  4. L > H (lookup window larger than normal history)
  5. Used by auditors to verify historical state

Purpose: Services can read older state during refinement
```

<div class="callout callout-info">

**ELI5: The Archive Window**

The lookup anchor is like having access to archived records:
- Normal anchor = "Current quarter's books"
- Lookup anchor = "Can also reference last year's records"
- Auditors need this to verify your work was correct

</div>

<div class="lasair-connection">

### In Lasair: Lookup Anchor

```ocaml
(* conformance/ancestry.ml: the window maps each ancestor to its slot and
   its child's prior state root, i.e. the ancestor's posterior state root *)
let anchors_ok (t : t) ~(limit : int) ~(parent : bytes) ~(parent_state_root : bytes)
    (contexts : Trace_types.trace_refine_context list) : bool =
  if contexts = [] then true
  else begin
    let win = window t ~limit ~parent ~parent_state_root in
    List.for_all (fun (c : Trace_types.trace_refine_context) ->
        match Hashtbl.find_opt win (Bytes.to_string c.Trace_types.rc_lookup_anchor) with
        | None -> false
        | Some (slot, child_psr) ->
          slot = c.Trace_types.rc_lookup_anchor_slot
          && (match child_psr with
              | Some r -> r = Bytes.to_string c.Trace_types.rc_lookup_anchor_state_root
              | None -> true))
      contexts
  end
```

The age bound (lookup slot + L ≥ block slot) is checked separately in `rule_context` (`conformance/stf_guarantees.ml`).

</div>

## Duplicate Detection

Work packages cannot be processed twice:

```
For work report W with package hash P:

REQUIRE: P appears only once in this block's guarantees
REQUIRE: P ∉ pipeline

Where pipeline =
    package hashes reported in the recent H blocks (β)
  ∪ packages accumulated in the last epoch (ξ)
  ∪ reports queued for accumulation (ω)
  ∪ reports waiting for availability (ρ)
```

This prevents replay attacks and double-processing.

<div class="lasair-connection">

### In Lasair: Duplicate Check

```ocaml
(* lib/recent_history.ml (learning-era model; GP 0.8.0 items also carry
   the block's timeslot, which this record predates) *)

(** History entry tracks reported packages *)
type history_entry = {
  header_hash: hash;        (** Blake2b(header) *)
  state_root: hash;         (** State root (initially zero, corrected next block) *)
  accout_log_superpeak: hash;  (** MMB superpeak of accumulation output *)
  reported_packages: (hash * hash) seq;  (** package_hash → segment_root *)
}

(** Check if package has already been reported *)
let is_package_reported (state : recent_state) (pkg_hash : hash) : bool =
  Array.exists (fun entry ->
    Array.exists (fun (ph, _) ->
      Bytes.equal (Hash.to_bytes ph) (Hash.to_bytes pkg_hash)
    ) entry.reported_packages
  ) state.history
```

On the import path the whole pipeline is checked at once:

```ocaml
(* conformance/stf_guarantees.ml *)
let pipeline = beta_reported @ xi @ queued_hashes @ rho_hashes in
List.iter (fun h ->
  if List.exists (Bytes.equal h) pipeline then
    reject "duplicate_package") incoming_hashes;
```

</div>

## Prerequisite Validation

Work reports can depend on other work packages:

```
For each P in W.context.prerequisites
          (and each package hash keyed in W's segment-root lookup):
  REQUIRE: P is reported in this block's guarantees
           or in the recent history β

  REQUIRE: |prerequisites| + |segment-root lookup| ≤ J = 8

Being reported is enough here; accumulation then waits in the
ready queue until the dependencies have been accumulated.

This enables ordered processing of dependent work.
```

<div class="callout callout-info">

**ELI5: Task Dependencies**

Like a construction project:
- "Pour foundation" must complete before "Build walls"
- If your work report says "depends on foundation"
- The foundation work package must already be on the books (reported)
- Otherwise, your walls task is rejected; if it is on the books, the walls wait until the foundation is finished (accumulated)

</div>

<div class="lasair-connection">

### In Lasair: Prerequisite Check

```ocaml
(* conformance/stf_guarantees.ml *)
let known = incoming_hashes @ beta_reported in
(* ... *)
(* GP eq. limitreportdeps: |srlookup| + |prerequisites| <= J *)
if List.length r.tr_segment_root_lookup + List.length r.tr_context.rc_prerequisites
   > Lasair.Pvm_host.Config.j_deps then
  reject "too_many_dependencies";
let deps = r.tr_context.rc_prerequisites @ List.map fst r.tr_segment_root_lookup in
List.iter (fun d ->
  if not (List.exists (Bytes.equal d) known) then
    reject "dependency_missing") deps;
```

</div>

## Code Hash Validation

The service's code must not have changed since the work was executed:

```
For each work result R in work report:
  service_code_hash = δ[R.service].code_hash

  REQUIRE: R.code_hash == service_code_hash

Why? If code changed, the refine function might produce
different results now vs when guarantors executed it.
```

<div class="lasair-connection">

### In Lasair: Code Hash Check

```ocaml
(* conformance/stf_guarantees.ml, rule_gas_services *)
List.iter (fun wr ->
  match load_service_account gc.gc_db wr.wr_service_id with
  | None -> reject "bad_service_id"
  | Some (acct, current_ch) ->
    if not (Bytes.equal current_ch wr.wr_code_hash) then
      reject "bad_code_hash";
    (* ... *)
```

</div>

## Visual: Complete Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               CONTEXTUAL VALIDITY CHECKS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Work Report                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. ANCHOR VALIDATION                                        ││
│  │    anchor_hash ∈ recent H blocks?                           ││
│  │    ✗ No → REJECT                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✓                                                       │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2. ROOT VALIDATION                                          ││
│  │    state_root matches anchor's state_root?                  ││
│  │    beefy_root matches anchor's beefy_root?                  ││
│  │    anchor_slot matches anchor's timeslot?     (GP 0.8.0)    ││
│  │    ✗ No → REJECT                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✓                                                       │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 3. LOOKUP ANCHOR                                            ││
│  │    lookup_anchor within L timeslots, header known?          ││
│  │    lookup_anchor_state_root = its posterior root? (0.8.0)   ││
│  │    ✗ No → REJECT                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✓                                                       │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 4. DUPLICATE CHECK                                          ││
│  │    package_hash in β, ξ, ω or ρ (or twice in E_G)?          ││
│  │    ✓ Yes → REJECT (duplicate!)                              ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✗ (not duplicate)                                       │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 5. PREREQUISITE CHECK (if specified)                        ││
│  │    each prerequisite reported in E_G or β? at most 8 deps?  ││
│  │    ✗ No → REJECT (dependency not met)                       ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✓                                                       │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 6. CODE HASH CHECK                                          ││
│  │    For each work result:                                    ││
│  │      code_hash == service.current_code_hash?                ││
│  │    ✗ No → REJECT (code changed)                             ││
│  └─────────────────────────────────────────────────────────────┘│
│       │ ✓                                                       │
│       ▼                                                         │
│  CONTEXTUALLY VALID ✓                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why These Checks Matter

| Check | Prevents |
|-------|----------|
| **Anchor validation** | References to non-existent state |
| **Root validation** | State mismatch attacks |
| **Lookup anchor** | Invalid historical references |
| **Duplicate check** | Replay attacks, double-processing |
| **Prerequisite** | Out-of-order execution |
| **Code hash** | Stale computation results |

## Key Takeaways

1. **Anchor block** must be in recent history (H = 8 blocks)
2. **State and Beefy roots** must match the anchor's actual roots, and (GP 0.8.0) so must its timeslot
3. **Lookup anchor** enables historical data access (larger L window); GP 0.8.0 also pins its posterior state root
4. **No duplicates** - package hash checked against the whole pipeline (β, ξ, ω, ρ)
5. **Prerequisites** must already be reported (this block or recent history); at most 8 dependencies
6. **Code hash** ensures service code hasn't changed

## Graypaper References

- Section 11.4.1: Contextual Validity of Work Reports (eq. `limitlookupanchorage`, eq. `reportcodesarecorrect`)
- Section 11.1.2: Refinement Context (eq. `workcontext`, eq. `limitreportdeps`)
- Section 7: Recent History (β) structure

## What's Next

Return to the main guarantees section or explore work report structure.

[Back to 11.4 Work Report Guarantees &rarr;](lesson.html?lesson=011-graypaper-lectures/34e-work-report-guarantees)
