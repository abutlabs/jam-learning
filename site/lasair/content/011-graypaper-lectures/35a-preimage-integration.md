---
title: "12.1 Preimage Integration"
duration: 11 min
video: https://www.youtube.com/watch?v=JiPYhyzdgq8
---

# Graypaper Section 12.1: Preimage Integration

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section covers how **preimages** (data blobs services need) are integrated on-chain during accumulation. It's a critical mechanism for Polkadot parachains running on JAM.

## What This Section Covers

- What preimages are and why they matter
- The preimage lookup state machine
- Validation rules for the preimages extrinsic
- How preimage availability is tracked for auditing

## Why Preimages Matter

Services often need data that isn't available on-chain. For example, a Polkadot parachain needs its WebAssembly runtime code to execute. This code is too large to include in every work package, so services can **request** the hash of data they need, and validators later **provide** the actual data.

```
Service needs data:
  1. Service calls solicit(hash, length) host function
  2. Hash+length added to lookup_requests
  3. Validator provides preimage blob in extrinsic
     (or a service supplies it during accumulation
      with the provide host call)
  4. Service can now call lookup(hash) to get the data
```

<div class="callout callout-info">

**ELI5: The Library Request System**

Think of preimages like a library interloan:
- **Solicit** = "I need this book with ISBN 12345"
- **lookup_requests** = The library's order list
- **Preimage extrinsic** = The book arrives from another library
- **Lookup** = "Here's your book!"

You can't read a book that hasn't arrived yet, and the library tracks when each book came in case someone asks "was this book available on January 5th?"

</div>

## The Preimage Status Machine

Each preimage goes through a state machine tracked by a sequence of 0-3 timeslots:

| Timeslots | Status | Meaning |
|-----------|--------|---------|
| `[]` | Requested | Hash requested but data not yet provided |
| `[t₀]` | Available | Data provided at timeslot t₀ |
| `[t₀, t₁]` | Unavailable | Was available t₀-t₁, now unrequested (zombie) |
| `[t₀, t₁, t₂]` | Re-available | Zombie re-requested at t₂ |

Why keep zombies around? **Auditors need them.** When auditing a past block, validators might need to look up a preimage that has since been unrequested. The audit must be deterministic - it needs the same data that was available when the block was originally produced.

<div class="lasair-connection">

### In Lasair: Preimage Status Types

```ocaml
(* lib/accounts.ml - Preimage tracking *)

(** Preimage availability status *)
type preimage_status =
  | Requested                          (** Requested, not yet supplied *)
  | Available of timeslot              (** Available since t0 *)
  | Unavailable of timeslot * timeslot (** Was available t0-t1, now unavailable *)
  | Reavailable of timeslot * timeslot * timeslot  (** Available again since t2 *)

(** Convert status to timeslot sequence for serialization *)
let status_to_timeslots : preimage_status -> timeslot array = function
  | Requested -> [||]
  | Available t0 -> [|t0|]
  | Unavailable (t0, t1) -> [|t0; t1|]
  | Reavailable (t0, t1, t2) -> [|t0; t1; t2|]

(** Check if preimage was available at given timeslot.
    Implements the I(l, t) helper from graypaper equation 127. *)
let was_available_at (status : preimage_status) (t : timeslot) : bool =
  match status with
  | Requested -> false
  | Available t0 -> Int32.compare t0 t <= 0
  | Unavailable (t0, t1) ->
    Int32.compare t0 t <= 0 && Int32.compare t t1 < 0
  | Reavailable (t0, t1, t2) ->
    (Int32.compare t0 t <= 0 && Int32.compare t t1 < 0) ||
    Int32.compare t2 t <= 0
```

</div>

## The Preimages Extrinsic

Validators can include preimage data in the block extrinsic:

```
E_P = [
  { requester: ServiceId, blob: bytes },
  { requester: ServiceId, blob: bytes },
  ...
]
```

**Validation Rules:**

1. **Sorted and unique** - Entries ordered by `(requester, hash(blob))`
2. **Must be solicited** - The `hash(blob)` + length must be in the service's lookup requests in the **prior** state
3. **Not already provided** - The lookup entry must have empty timeslots `[]` in the prior state
4. **No duplicates** - Same preimage can't appear twice

<div class="callout callout-warning">

**Changed in GP 0.8.0:** in the header's extrinsic hash, the preimages extrinsic now contributes the encoded sequence of (E₄(requester), Blake2b(blob)) pairs instead of the blobs themselves, so a single preimage's inclusion in a block can be proven without the rest (`header.tex`, section 5). The preimages extrinsic's own block serialization is unchanged.

</div>

<div class="lasair-connection">

### In Lasair: Preimage Extrinsic Types

```ocaml
(* conformance/preimages_stf.ml *)

type preimage_entry = {
  requester: int;      (* Service ID *)
  blob: bytes;         (* The actual preimage data *)
}

type preimages_input = {
  slot: int;           (* Current timeslot *)
  preimages: preimage_entry list;
}

(** Check if preimages are properly sorted and unique *)
let check_sorted_unique preimages =
  let with_hashes = List.map (fun p ->
    (p.requester, blake2b_256 p.blob, p)
  ) preimages in
  let rec check_order = function
    | [] | [_] -> true
    | (r1, h1, _) :: ((r2, h2, _) :: _ as rest) ->
      let cmp = compare r1 r2 in
      if cmp < 0 then check_order rest
      else if cmp > 0 then false
      else (* same requester, check hash order *)
        if Bytes.compare h1 h2 < 0 then check_order rest
        else false
  in
  check_order with_hashes
```

</div>

## State Transition Logic

When a valid preimage is provided:

```
For each preimage (service_id, blob):
  1. hash = blake2b_256(blob)
  2. len = length(blob)

  Find service_id's account:
  3. Add (hash → blob) to preimages dictionary
  4. Update lookup_meta[(hash, len)] from [] to [current_slot]

  Update statistics:
  5. Increment service's "provided_count" by 1
  6. Add length(blob) to service's "provided_size"
```

<div class="lasair-connection">

### In Lasair: Applying the Preimage STF

```ocaml
(* conformance/preimages_stf.ml *)

(** Check if preimage is solicited (in lookup_meta with empty value) *)
let is_solicited (acct : account) blob_hash blob_len =
  List.exists (fun entry ->
    Bytes.equal entry.key.hash blob_hash &&
    entry.key.length = blob_len &&
    entry.value = []  (* Must have empty timeslot list *)
  ) acct.data.lookup_meta

(** Apply preimages state transition *)
let apply_preimages_stf (input : preimages_input) (pre : preimages_state)
    : (preimages_state, string) result =
  (* First check if all preimages are needed *)
  let rec validate_needed accounts entries = match entries with
    | [] -> Result.Ok ()
    | p :: rest ->
      let blob_hash = blake2b_256 p.blob in
      let blob_len = Bytes.length p.blob in
      match find_account accounts p.requester with
      | None -> Result.Error "preimage_unneeded"
      | Some acct ->
        if is_solicited acct blob_hash blob_len then
          validate_needed accounts rest
        else
          Result.Error "preimage_unneeded"
  in
  match validate_needed pre.accounts input.preimages with
  | Result.Error e -> Result.Error e
  | Result.Ok () ->
    if not (check_sorted_unique input.preimages) then
      Result.Error "preimages_not_sorted_unique"
    else
      (* Apply changes to accounts and statistics *)
      ...
```

</div>

## Try It: Preimage Status Tracking

Here's a simulation of how preimage status evolves:

```ocaml
(* Simulate preimage lifecycle *)
let demonstrate_preimage_lifecycle () =
  (* Service solicits a preimage at slot 10 *)
  let initial_status = Requested in
  Printf.printf "After solicit: %s\n"
    (match initial_status with Requested -> "[]" | _ -> "?");

  (* Validator provides preimage at slot 15 *)
  let provided_status = Available 15l in
  Printf.printf "After provide at slot 15: [15]\n";

  (* Service unrequests at slot 20 *)
  let zombie_status = Unavailable (15l, 20l) in
  Printf.printf "After unrequest at slot 20: [15, 20]\n";

  (* Service re-requests at slot 25 *)
  let reavail_status = Reavailable (15l, 20l, 25l) in
  Printf.printf "After re-request at slot 25: [15, 20, 25]\n";

  (* Check availability at various slots *)
  let check slot =
    Printf.printf "Was available at slot %ld? %b\n" slot
      (was_available_at reavail_status slot)
  in
  check 10l;  (* false - not yet provided *)
  check 16l;  (* true - was available 15-20 *)
  check 22l;  (* false - was zombie 20-25 *)
  check 26l   (* true - re-available after 25 *)
```

## Integration with Accumulation

In the current Graypaper, preimage integration happens **after** accumulation. The service accounts pass through three stages: δ† (after accumulation), δ‡ (after the last-accumulation timestamps are recorded) and δ' = δ‡ with the extrinsic's preimages folded in:

```
Dependency order in block processing (section 4.2.1):
  1. Disputes extrinsic            → ψ', ρ†
  2. Assurances extrinsic          → ρ‡, available reports
  3. Guarantees extrinsic          → ρ'
  4. Accumulate available work     → δ†, then δ‡
  5. Preimages extrinsic           → δ' = δ‡ + still-wanted preimages
  (Tickets feed Safrole (γ') independently of the above.)
```

The preimages extrinsic is **validated against the prior state** δ (each blob must be solicited and not yet provided there), but only **applied after** accumulation. A preimage that accumulation has made useless (its request dropped, or its service removed) is disregarded, without making the block invalid.

<div class="callout callout-warning">

**Important: Ordering Matters**

The lecture presents preimage integration as happening before accumulation; in GP 0.8.0 (as already in 0.7.2) it is the last step for service accounts (`accumulation.tex` 12.4; `overview.tex` eq. `accountspostpreimage`). This means:
- A preimage in this block's extrinsic is **not** visible to this block's accumulation; services see it from the next block on
- Services **can** supply preimages during accumulation themselves, with the `provide` host call; those provisions are integrated at the end of each accumulation round
- Historical lookups (in Refine, and so in auditing) are evaluated at the lookup anchor's timeslot, so what this block provides cannot change them

</div>

## Historical Lookup for Auditing

When auditing a past block, validators need deterministic access to preimages:

```ocaml
(** Historical preimage lookup - for auditing past blocks.
    Returns the preimage if it was available at timeslot t. *)
let historical_lookup (acct : service_account) (t : timeslot) (h : hash)
    : bytes option =
  (* First find the preimage by hash *)
  match Array.find_opt (fun (ph, _) ->
    Bytes.equal (Hash.to_bytes ph) (Hash.to_bytes h)
  ) acct.preimages with
  | None -> None
  | Some (_, blob) ->
    (* Check if it was available at time t *)
    match Array.find_opt (fun (key, _) ->
      Bytes.equal (Hash.to_bytes key.hash) (Hash.to_bytes h)
    ) acct.requests with
    | None -> None
    | Some (_, status) ->
      if was_available_at status t then Some blob
      else None
```

This is why zombie preimages aren't deleted immediately - they might be needed for audits up to `C_expunge_period` slots later.

## Key Takeaways

1. **Preimages = Data Blobs** - Services request hashes, validators provide data
2. **Status Machine** - Tracks availability with 0-3 timeslots
3. **Zombie State** - Unrequested preimages kept for auditing
4. **Sorted and Unique** - Extrinsic entries must be ordered
5. **After Accumulation** - Extrinsic preimages are checked against the prior state and folded in after accumulation (GP 0.8.0)
6. **Deterministic Audits** - Historical lookup uses past availability state

## Reflection Questions

1. Why does JAM keep "zombie" preimages instead of deleting them immediately?
2. What happens to a preimage in the extrinsic whose request was dropped by this block's accumulation?
3. How does the timeslot sequence `[t₀, t₁, t₂]` enable deterministic historical lookups?

## Graypaper References

- Section 12.4: Preimage Integration (the lecture's "12.1")
- Section 9.2: Preimage Lookups (eq. `historicallookup`: historical availability check)
- Section 4.2.1: State Transition Dependency Graph (eq. `accountspostpreimage`)

## What's Next

Continue with **Section 12.2: Gas Accounting** to understand how services are charged for computation.

[Next: 12.2 Gas Accounting &rarr;](lesson.html?lesson=011-graypaper-lectures/35b-gas-accounting)
