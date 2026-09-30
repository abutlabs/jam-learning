---
title: "7.0 Recent History"
duration: 15 min
video: https://www.youtube.com/watch?v=Y7Ubw1k0PBA
---

# Graypaper Section 7: Recent History

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM maintains a sliding window of recent block information to prevent duplicate work reports and enable efficient state verification.

## What This Section Covers

- The β (beta) state component
- History entries for recent blocks
- MMB (Merkle Mountain Belt) for accumulation outputs
- Duplicate work report prevention

## The Recent History State

JAM keeps information about the last 8 blocks (H = 8) in state:

```
β = (history, accout_belt)

Where:
  history      -- Up to 8 recent block entries
  accout_belt  -- MMB for accumulation output log
```

<div class="callout callout-info">

**ELI5: Why Keep Recent History?**

Imagine you're a teacher collecting homework. You keep a list of who already turned in assignments to prevent:
- The same student submitting twice (duplicate)
- Students submitting old homework from last week (out of date)

JAM does the same with work reports - it remembers what was submitted in the last 8 blocks to prevent duplicates.

</div>

## History Entry Structure

Each block in recent history stores:

```
history_entry = {
  header_hash     -- Blake2b hash of the block header
  state_root      -- State trie root (corrected next block)
  accout_superpeak -- MMB superpeak of accumulation outputs
  timeslot        -- The block's timeslot H_T (GP 0.8.0)
  reported_packages -- Map: package_hash → segment_root
}
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** each recent-history item also records its block's timeslot (section 7, eq. `recenthistoryspec`; serialized as E₄ in state component C(3), appendix D.1). It exists for guarantees: a work-report's refinement context now names the anchor block's timeslot, and that must equal the timeslot stored in the anchor's recent-history item (section 11.4; Graypaper PR #526). lasair rejects a mismatch with `bad_anchor_slot` (`conformance/reports_stf.ml`).

</div>

<div class="lasair-connection">

### In Lasair: History Entry Type

```ocaml
(* From conformance/stf_encoding.ml - the import path's history item *)

(** History entry with reported packages *)
type beta_entry = {
  e_header_hash: bytes;
  e_beefy_root: bytes;               (* MMB superpeak of accumulation output *)
  e_state_root: bytes;               (* initially zero, corrected next block *)
  e_slot: int;                       (* GP 0.8.0: block timeslot, encode[4] (#526) *)
  e_reported: (bytes * bytes) list;  (* package_hash, exports_root *)
}
```

(`lib/recent_history.ml` has a learning-model `history_entry` of the same shape without the 0.8.0 slot.)

</div>

## The State Root Correction

Here's a subtle but important detail: when a block is created, we don't know its own state root yet (it depends on the complete state after processing). So we store **zero** temporarily and **correct it in the next block**.

```
Block N created:
  history[N].state_root = 0x00...00  (placeholder)

Block N+1 processes:
  history[N].state_root = actual_root  (corrected!)
```

<div class="lasair-connection">

### In Lasair: State Root Correction

```ocaml
(* From lib/recent_history.ml *)

(** Correct the parent's state root after it's computed.
    Called during accumulation with the actual prior state root.

    eq. correctlaststateroot: β_H†[len-1].stateroot = H_R *)
let correct_parent_state_root (state : recent_state) (prior_root : hash)
    : recent_state =
  let len = Array.length state.history in
  if len = 0 then state
  else
    let updated_history = Array.copy state.history in
    updated_history.(len - 1) <- {
      state.history.(len - 1) with state_root = prior_root
    };
    { state with history = updated_history }
```

</div>

## Duplicate Detection

The primary use of recent history is preventing duplicate work reports:

```
Can submit work report?
  → Check if package_hash exists in ANY of the last 8 blocks
  → If found: REJECT (duplicate)
  → If not found: ACCEPT
```

<div class="callout callout-info">

**ELI5: The 8-Block Window**

Think of it like a bouncer with a guest list for the last 8 parties:
- "Has this person already partied recently?"
- If yes → "Sorry, you're already on the list"
- If no → "Welcome in!"

After 8 blocks, old entries fall off the list, making room for new ones.

</div>

<div class="lasair-connection">

### In Lasair: Duplicate Detection

```ocaml
(* From lib/recent_history.ml *)

(** Check if a work package was already reported in recent history.
    Returns true if the package hash exists in any recent block. *)
let is_package_reported (state : recent_state) (pkg_hash : hash) : bool =
  Array.exists (fun entry ->
    Array.exists (fun (ph, _) ->
      Bytes.equal (Hash.to_bytes ph) (Hash.to_bytes pkg_hash)
    ) entry.reported_packages
  ) state.history

(** Check if a work report can be submitted.
    Returns false if the package was already reported. *)
let can_submit_report (state : recent_state) (pkg_hash : hash) : bool =
  not (is_package_reported state pkg_hash)
```

</div>

## The MMB (Merkle Mountain Belt)

The accumulation output log uses a special data structure called an MMB (Merkle Mountain Belt), which is similar to an MMR (Merkle Mountain Range):

```
MMB Operations:
  append(belt, root) → belt'   -- Add new accumulation output root
  superpeak(belt) → hash       -- Get commitment to entire log
```

The MMB uses **Keccak** hash (not Blake2b) for legacy system compatibility.

<div class="lasair-connection">

### In Lasair: MMB Operations

```ocaml
(* conformance/history_stf.ml *)

(** Append to MMR - carry-propagate like binary addition *)
let mmr_append (peaks : bytes option list) (leaf : bytes) : bytes option list =
  let rec carry peaks hash =
    match peaks with
    | [] -> [Some hash]  (* No more peaks, place here *)
    | None :: rest -> Some hash :: rest  (* Empty slot, place here *)
    | Some p :: rest ->
      (* Combine with existing peak, carry to next level *)
      let combined = hash_combine p hash in
      None :: carry rest combined
  in
  carry peaks leaf

(** Compute MMR superpeak - fold right-to-left with "peak" prefix *)
let prefix_peak = Bytes.of_string "peak"

let mmr_superpeak (peaks : bytes option list) : bytes =
  let non_empty = List.filter_map Fun.id peaks in
  match non_empty with
  | [] -> Bytes.make 32 '\x00'  (* Empty = zero hash *)
  | [p] -> p  (* Single peak = that peak *)
  | ps ->
    let rec fold_peaks = function
      | [] -> Bytes.make 32 '\x00'
      | [p] -> p
      | plist ->
        let init = List.rev plist |> List.tl |> List.rev in
        let last = List.hd (List.rev plist) in
        let rest_peak = fold_peaks init in
        keccak256 (Bytes.concat Bytes.empty [prefix_peak; rest_peak; last])
    in
    fold_peaks ps
```

</div>

## Block Processing Flow

When a new block is processed:

```
1. Correct previous entry's state_root
2. Compute accumulation outputs → Merkle root
3. Append root to MMB → new superpeak
4. Create new history entry with:
   - Current header hash
   - Zero state_root (placeholder)
   - New MMB superpeak
   - Block timeslot H_T (GP 0.8.0)
   - Set of reported packages
5. Trim history to max 8 entries
```

<div class="lasair-connection">

### In Lasair: State Transition

```ocaml
(* From conformance/stf_transitions.ml - the import path *)

let recent_history_core (beta : beta_state) ~(parent_state_root : bytes)
    ~(header_hash : bytes) ~(slot : int) ~(accumulate_root : bytes)
    ~(reported : (bytes * bytes) list) : beta_state =
  (* Correct previous entry's state_root *)
  let corrected_entries = match List.rev beta.b_entries with
    | [] -> []
    | last :: rest ->
      let corrected = { last with e_state_root = parent_state_root } in
      List.rev (corrected :: rest)
  in

  (* Append to MMB and compute beefy_root as MMB superpeak *)
  let new_peaks = mmb_append beta.b_peaks accumulate_root in
  let beefy_root = mmb_superpeak new_peaks in

  (* Reported packages stored in lexicographic order by package hash. *)
  let reported =
    List.sort (fun (h1, _) (h2, _) -> Bytes.compare h1 h2) reported in

  let new_entry = {
    e_header_hash = header_hash;
    e_beefy_root = beefy_root;
    e_state_root = Bytes.make 32 '\x00';  (* Corrected next block *)
    e_slot = slot;                         (* GP 0.8.0 (#526): item carries the block's timeslot *)
    e_reported = reported;
  } in

  (* Append to history, limit to 8 entries *)
  let new_entries = corrected_entries @ [new_entry] in
  let trimmed =
    if List.length new_entries > 8 then
      List.filteri (fun i _ -> i >= List.length new_entries - 8) new_entries
    else
      new_entries
  in
  { b_entries = trimmed; b_peaks = new_peaks }
```

</div>

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Recent History (β)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     ┌─────────┐           │
│  │ Block   │ │ Block   │ │ Block   │ ... │ Block   │  ← max 8  │
│  │ N-7     │ │ N-6     │ │ N-5     │     │ N       │           │
│  ├─────────┤ ├─────────┤ ├─────────┤     ├─────────┤           │
│  │ header  │ │ header  │ │ header  │     │ header  │           │
│  │ hash    │ │ hash    │ │ hash    │     │ hash    │           │
│  ├─────────┤ ├─────────┤ ├─────────┤     ├─────────┤           │
│  │ state   │ │ state   │ │ state   │     │ state   │           │
│  │ root ✓  │ │ root ✓  │ │ root ✓  │     │ root=0  │ ← fixed   │
│  ├─────────┤ ├─────────┤ ├─────────┤     ├─────────┤   next    │
│  │ MMB     │ │ MMB     │ │ MMB     │     │ MMB     │   block   │
│  │ peak    │ │ peak    │ │ peak    │     │ peak    │           │
│  ├─────────┤ ├─────────┤ ├─────────┤     ├─────────┤           │
│  │reported │ │reported │ │reported │     │reported │           │
│  │packages │ │packages │ │packages │     │packages │           │
│  └─────────┘ └─────────┘ └─────────┘     └─────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ Accumulation Output Belt (MMB)                              │
│  │ peaks: [peak₀, None, peak₂, peak₃, ...]                    │
│  │ Uses Keccak hash for legacy compatibility                   │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Sliding Window** - Keep 8 blocks of history, oldest falls off
2. **Duplicate Prevention** - Check recent history before accepting work reports
3. **Delayed State Root** - Store zero initially, correct in next block
4. **MMB for Accumulation** - Efficient append-only log with Keccak hashing
5. **Per-Block Data** - Header hash, state root, MMB peak, timeslot (GP 0.8.0), reported packages

## Graypaper References

- Section 7, eq. `correctlaststateroot`: State root correction
- Section 7, eq. `recenthistorydef`: Recent history definition
- Constant H = 8: Recent history length

## What's Next

Continue with **Section 8: Authorization** to understand how JAM authorizes services for work package execution.

[Next: 8 Authorization &rarr;](lesson.html?lesson=011-graypaper-lectures/31-authorization)
