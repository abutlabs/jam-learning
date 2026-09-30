---
title: "6.6 The Markers"
duration: 4 min
video: https://www.youtube.com/watch?v=QfrN2i8XGag
---

# Graypaper Section 6.6: The Markers

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how epoch marker (H_e) and winning tickets marker (H_w) values are computed and when they appear in block headers.

## What This Lecture Covers

- Epoch marker computation
- Winning tickets marker timing
- Perspective shift between epochs
- Light client implications

## Epoch Marker (H_e)

Published in the **first block of each new epoch**:

```
If new epoch (e' > e):
  H_E = (η_0, η_1, [(k_b, k_e) | k ← γ'_P])

Otherwise:
  H_E = None
```

Contains (section 6.6, eq. `epochmarker`):
- **η_0, η_1** - The next and current epoch randomness; after the rotation they are η'_1 and η'_2, and η'_2 seeds fallback generation
- **[(k_b, k_e) | k ← γ'_P]** - The Bandersnatch and Ed25519 keys of every pending validator

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the pending sequence γ'_P has a variable length (a multiple of 3 from 6 to 1023, eq. `valcount`), so the key list carries a length prefix when the header is serialized (appendix C.2). The lecture's form (a single entropy value and Bandersnatch keys only) is from an earlier draft; the two-entropy, two-key form above is the current one.

</div>

<div class="callout callout-info">

**ELI5: The Backup Announcement**

At the start of each hour:
- "If something goes wrong, here's Plan B!"
- You announce the backup before you know if you need it
- Light clients note this down, just in case

</div>

## Perspective Shift

Key insight: values are announced **one epoch before use**:

```
Epoch N (announcing):           Epoch N+1 (using):
  η'_1 (current)         →        η_2 (for fallback)
  γ'_k (pending)         →        κ (current validators)
```

<div class="lasair-connection">

### In Lasair: Epoch Marker

```ocaml
(* From lib/safrole.ml - Epoch marker *)

(** Epoch marker - entropy and next epoch's validators *)
type epoch_marker = {
  entropy: hash;          (** η_0 at epoch end *)
  entropy_prev: hash;     (** η_1 at epoch end *)
  validators: (bs_key * ed_key) seq;  (** Next validators' keys *)
}

(** Should we include epoch marker in header? *)
let should_include_epoch_marker ~(prior_slot : timeslot)
    ~(current_slot : timeslot) : bool =
  is_new_epoch ~prior:prior_slot ~current:current_slot
```

</div>

## Winning Tickets Marker (H_w)

Published when lottery completes **within the same epoch**:

```
If same epoch AND lottery just closed AND have 600 tickets:
  H_w = Some(Z(γ_a))

Otherwise:
  H_w = None
```

The marker contains the same value that becomes γ'_s (slot key sequence).

<div class="callout callout-info">

**ELI5: Lottery Results**

When the lottery closes successfully:
- "The winners are...!" (announces H_w)
- This replaces the backup plan (makes H_e irrelevant for this epoch)
- Light clients update their records

</div>

<div class="lasair-connection">

### In Lasair: Winning Tickets Marker

```ocaml
(* From lib/safrole.ml - Winning tickets marker *)

(** Should we include winners marker?
    First block after submission closes with full accumulator *)
let should_include_winners_marker ~(prior_slot : timeslot)
    ~(current_slot : timeslot) ~(accumulator : safrole_ticket seq) : bool =
  let prior_phase = slot_in_epoch prior_slot in
  let current_phase = slot_in_epoch current_slot in
  let same_epoch = not (is_new_epoch ~prior:prior_slot ~current:current_slot) in
  same_epoch &&
  prior_phase < Constants.c_epoch_tail_start &&
  current_phase >= Constants.c_epoch_tail_start &&
  is_accumulator_full accumulator
```

When it is included, the marker's value is `outside_in_sequence accumulator`, i.e. Z(γ_A).

</div>

## Timing Diagram

```
Epoch N-1:                     Epoch N:
  ...─────────┤ ├──────────────────────────────┤

              │ │
              │ └─ Block 0: H_e announced (fallback for epoch N+1)
              │
              └─── Block at phase Y: H_w announced (if lottery OK)

Light client observes:
  1. H_e at epoch start → notes fallback
  2. H_w mid-epoch → uses tickets, ignores fallback
  3. No H_w by epoch end → uses H_e fallback
```

## Accumulator Freeze

Important: γ_a **cannot change** after the lottery closes (phase >= Y).

This ensures H_w matches what becomes γ_s in the next epoch:

```
Phase < Y:  Tickets can be added to γ_a
Phase >= Y: γ_a is frozen
            H_w = Z(γ_a) is published
            Next epoch: γ_s = Z(γ_a) (same value)
```

<div class="lasair-connection">

### In Lasair: Accumulator Freeze

```ocaml
(* Illustrative sketch (not lasair's code) - Accumulator update with freeze *)

(** Update ticket accumulator (respects freeze after lottery) *)
let update_accumulator
    (phase : int)
    (is_new_epoch : bool)
    (current_acc : ticket list)
    (new_tickets : ticket list)
    : ticket list =
  if is_new_epoch then
    (* New epoch: start fresh *)
    new_tickets
  else if phase >= lottery_closing_phase then
    (* Lottery closed: frozen, no changes *)
    current_acc
  else
    (* Lottery open: accumulate *)
    merge_tickets current_acc new_tickets
```

</div>

## Light Client Protocol

```
Light client tracking:

on H_e (epoch start):
  fallback_for_next_epoch = H_e

on H_w (lottery success):
  slot_keys_for_next_epoch = H_w
  discard fallback (won't need it)

on epoch end without H_w:
  slot_keys = compute_fallback(fallback_for_next_epoch)
```

## Key Takeaways

1. **H_e at epoch start** - Announces fallback in case lottery fails
2. **H_w mid-epoch** - Announces lottery winners when it completes
3. **Perspective shift** - Announced values used in following epoch
4. **Accumulator freeze** - γ_a frozen after lottery closes
5. **Light clients** - Can track validators without full state

## What's Next

Continue with **Section 6.7: The Extrinsic and Tickets** to understand how tickets are submitted to the chain.

[Next: 6.7 Extrinsic and Tickets &rarr;](lesson.html?lesson=011-graypaper-lectures/29-extrinsic-tickets)
