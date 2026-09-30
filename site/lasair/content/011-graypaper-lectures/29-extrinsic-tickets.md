---
title: "6.7 Tickets Extrinsic"
duration: 13 min
video: https://www.youtube.com/watch?v=1xySjieSoDU
---

# Graypaper Section 6.7: The Extrinsic and Tickets

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how validators submit lottery tickets to the chain using ring VRF proofs that preserve anonymity.

## What This Lecture Covers

- Tickets extrinsic structure (E_T)
- Ring VRF proofs
- Ticket validation rules
- Accumulator updates

## Ticket Submission

Validators submit tickets through E_T (tickets extrinsic):

```
E_T = [(r₀, proof₀), (r₁, proof₁), ...]

Where:
  r < n = ⌈2E / |γ'_P|⌉  -- Entry index (n = 2 with 1023 validators)
  proof                  -- Ring VRF proof
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the fixed "two entries per validator" (the constant N = 2) is gone. The bound is n = ⌈2E/|γ'_P|⌉, so a smaller validator set gets more entries each and the accumulator can still fill: 2 at 1023 validators, 4 on the 6-validator tiny configuration where E = 12 (section 6.7, eq. `ticketsextrinsic`). The entry index is serialized as one octet, E₁ (appendix C.2).

</div>

<div class="callout callout-info">

**ELI5: Anonymous Lottery Entry**

Like a sealed-bid auction:
- You submit a sealed envelope (ring VRF proof)
- The envelope proves you're a valid bidder (member of validator set)
- But nobody knows WHICH bidder you are
- Your "bid" (ticket ID) is revealed, but not your identity

</div>

## Ring VRF Magic

The ring VRF proof does something remarkable:

```
Ring VRF proves:
  1. "I am one of the next epoch's validators" (membership; 1023 of them in the full configuration)
  2. "Here is my VRF output" (ticket ID)
  3. "But you don't know which validator I am" (anonymity)
```

This is possible because the proof uses the ring root (γ'_Z) as a commitment to the pending validator sequence γ'_P.

<div class="lasair-connection">

### In Lasair: Ticket Structure

```ocaml
(* Illustrative sketch (not lasair's code) - Ticket submission *)

(** A submitted ticket entry *)
type ticket_submission = {
  r: int;                    (** Entry index: 0 <= r < ⌈2E/|γ'_P|⌉ *)
  proof: ring_vrf_proof;     (** Anonymous proof of valid ticket *)
}

(** Tickets extrinsic: E_T *)
type tickets_extrinsic = ticket_submission list

(** Extract ticket from valid submission *)
let extract_ticket (sub : ticket_submission) : ticket =
  {
    y = RingVRF.vrf_output sub.proof;  (** Ticket ID from VRF *)
    r = sub.r;                          (** Entry index *)
  }
```

</div>

## Validation Rules

Each ticket submission must satisfy:

```
1. Valid ring VRF proof against γ'_Z (ring root)
2. VRF input = "$jam_ticket_seal" ++ η'_2 ++ r
3. Lottery still open (phase m' < Y)
4. Not too many tickets per block (|E_T| ≤ K)
5. Entry index in range (r < ⌈2E/|γ'_P|⌉)
```

In lasair the entry-index rule is the `bad_ticket_attempt` check in `conformance/safrole_stf.ml` (and `ticket_attempt_bound` in `conformance/stf_config.ml` on the import path).

<div class="lasair-connection">

### In Lasair: Ticket Validation

```ocaml
(* Illustrative sketch (not lasair's code) - Validate ticket submission *)

(** VRF input for ticket generation *)
let ticket_vrf_input (entropy : hash) (entry_index : int) : bytes =
  Bytes.concat [
    Bytes.of_string "jam_ticket_seal";
    entropy;
    Bytes.of_int8 entry_index
  ]

(** Validate a single ticket submission *)
let validate_ticket
    (sub : ticket_submission)
    (ring_root : hash)
    (entropy : hash)
    (attempt_bound : int)   (* ⌈2E / |γ'_P|⌉ *)
    : bool =
  (* Entry index must be below the GP 0.8.0 bound *)
  sub.r >= 0 && sub.r < attempt_bound &&
  (* Ring VRF proof must be valid *)
  RingVRF.verify
    sub.proof
    ring_root
    Bytes.empty  (* No message *)
    (ticket_vrf_input entropy sub.r)

(** Validate entire tickets extrinsic *)
let validate_tickets_extrinsic
    (extrinsic : tickets_extrinsic)
    (phase : int)
    (ring_root : hash)
    (entropy : hash)
    (attempt_bound : int)
    : bool =
  (* Lottery must be open *)
  phase < lottery_closing_phase &&
  (* Not too many tickets *)
  List.length extrinsic <= max_tickets_per_block &&
  (* All tickets valid *)
  List.for_all (fun sub -> validate_ticket sub ring_root entropy attempt_bound) extrinsic
```

</div>

## Ticket ID = VRF Output

The ticket's identity comes from the VRF output:

```
Y(proof) = ticket ID (32 bytes)

Lower ticket ID = better score
Keep the 600 lowest IDs in accumulator
```

This is the same VRF computation used when sealing a block - proving that the ticket owner is the block author.

<div class="callout callout-info">

**ELI5: The Scoring System**

Each ticket has a "score" (the VRF output):
- Lower numbers = better tickets
- We keep only the best 600 tickets
- When you later produce a block, you prove "I made that ticket"

Think of it like a raffle where lower ticket numbers get called first.

</div>

## Accumulator Update

New tickets are merged into the accumulator:

```
1. Check: all new tickets have distinct IDs
2. Check: no duplicates with existing accumulator
3. Check: all new tickets good enough to make top 600
4. Merge and keep best 600
```

<div class="lasair-connection">

### In Lasair: Accumulator Merge

```ocaml
(* From conformance/ticket_rules.ml - shared by the importer and the author *)

(** The E lowest ids of [accumulator] U [submitted] -- gamma_a''s ids. *)
let posterior_ids ~(epoch_len : int) ~(accumulator : bytes list)
    ~(submitted : bytes list) : bytes list =
  List.sort Bytes.compare (accumulator @ submitted)
  |> List.filteri (fun i _ -> i < epoch_len)

(** Is every submitted id retained in the posterior accumulator? *)
let all_retained ~epoch_len ~accumulator ~submitted : bool =
  let post = posterior_ids ~epoch_len ~accumulator ~submitted in
  List.for_all (fun id -> List.exists (Bytes.equal id) post) submitted
```

</div>

## No Redundant Tickets

Blocks must only include "useful" tickets:

```
Rule: All submitted tickets must make it into top 600

Why: Don't waste block space on tickets that won't win
```

If a ticket's ID is worse than the 600th best, it's rejected.

<div class="lasair-connection">

### In Lasair: Redundancy Check

```ocaml
(* Illustrative sketch (not lasair's code) - Full tickets extrinsic processing *)

(** Process tickets extrinsic *)
let process_tickets
    (extrinsic : tickets_extrinsic)
    (state : safrole_state)
    (phase : int)
    (entropy : hash)
    : safrole_state option =
  (* Validate extrinsic *)
  if not (validate_tickets_extrinsic extrinsic phase state.z entropy
            (attempt_bound state)) then
    None
  else
    (* Extract tickets *)
    let new_tickets = List.map extract_ticket extrinsic in

    (* Check tickets are sorted and unique *)
    let sorted = List.sort_uniq compare_tickets new_tickets in
    if List.length sorted <> List.length new_tickets then
      None  (* Duplicates or unsorted *)
    else
      (* Check disjoint from accumulator *)
      let acc_ids = List.map (fun t -> t.y) state.a in
      let new_ids = List.map (fun t -> t.y) new_tickets in
      if List.exists (fun id -> List.mem id acc_ids) new_ids then
        None  (* Duplicate with existing *)
      else
        (* Check all tickets are useful (all_retained, above) *)
        if not (all_tickets_useful state.a new_tickets) then
          None  (* Redundant tickets *)
        else
          (* Update accumulator *)
          let a' = merge_tickets state.a new_tickets in
          Some { state with a = a' }
```

</div>

## Connection to Sealing

The ticket submission and block sealing use the **same VRF computation**:

```
Ticket submission:           Block sealing:
  Ring VRF proof              Regular VRF signature
  Anonymous (who?)            Reveals identity
  "$jam_ticket_seal"          "$jam_ticket_seal"
  η'_2 (entropy now)          η'_3 (the same value, one epoch later)
  r (entry index)             r (same entry index)
```

When you seal a block, you re-do the VRF openly, proving you own the ticket.

## Summary Diagram

```
Validator creates ticket:
┌─────────────────────────────────────────────────────┐
│  Ring VRF Sign("$jam_ticket_seal" ++ η'_2 ++ r)     │
│                      │                              │
│                      ▼                              │
│              Anonymous proof + VRF output (ID)      │
└─────────────────────────────────────────────────────┘
                       │
                       ▼ Submit to chain
┌─────────────────────────────────────────────────────┐
│  Accumulator: keep best 600 by ID                   │
└─────────────────────────────────────────────────────┘
                       │
                       ▼ Epoch boundary
┌─────────────────────────────────────────────────────┐
│  Z transform → slot key sequence                    │
└─────────────────────────────────────────────────────┘
                       │
                       ▼ Block production
┌─────────────────────────────────────────────────────┐
│  VRF Sign("$jam_ticket_seal" ++ η'_3 ++ r)          │
│  Proves: "I own this ticket" → authorized to seal   │
└─────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Ring VRF** - Proves validator membership anonymously
2. **Ticket ID** - VRF output, lower = better
3. **Entry index** - Each validator gets ⌈2E/|γ'_P|⌉ lottery entries (2 with 1023 validators)
4. **Best 600** - Accumulator keeps lowest IDs
5. **No redundancy** - All submitted tickets must be useful
6. **Same VRF** - Ticket creation = block sealing (different context)

## What's Next

This completes Section 6 (Safrole). Continue with **Section 7: Recent History** to understand how JAM tracks recent block headers.

[Next: 7 Recent History &rarr;](lesson.html?lesson=011-graypaper-lectures/30-recent-history)
