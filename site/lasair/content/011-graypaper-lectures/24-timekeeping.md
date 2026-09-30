---
title: "6.1 Timekeeping"
duration: 6 min
video: https://www.youtube.com/watch?v=9rDkc8R9gU4
---

# Graypaper Section 6.1: Timekeeping

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM tracks time through slots and epochs, and introduces the Safrole lottery mechanism.

## What This Lecture Covers

- Time state (τ) and updates
- Epoch and slot calculations
- Safrole state structure (γ)
- Ticket accumulators and fallbacks

## Time State (τ)

The simplest state transition - just copy the header's timeslot:

```
τ' = H_t
```

The posterior time is simply the timeslot declared in the block header.

<div class="callout callout-info">

**ELI5: The Clock**

The blockchain's clock doesn't tick by itself. Each new block "sets the clock" to whatever time the block header says. It's like a clock that only updates when someone looks at it and says "it's now 3 o'clock."

</div>

## Epochs and Slots

JAM divides time into epochs of 600 slots:

```
E = 600              -- Slots per epoch
τ = e × E + m        -- Total slots = epochs × 600 + phase

Where:
  e = τ ÷ E         -- Epoch index (integer division)
  m = τ mod E       -- Phase within epoch (0-599)
```

<div class="lasair-connection">

### In Lasair: Time Calculations

```ocaml
(* From lib/safrole.ml - Time and epoch calculations *)

(** Compute epoch index from timeslot *)
let epoch_of_timeslot (t : timeslot) : int =
  Int32.to_int t / Constants.c_epoch_len

(** Compute slot phase within epoch *)
let slot_in_epoch (t : timeslot) : int =
  Int32.to_int t mod Constants.c_epoch_len

(** Check if we're in a new epoch relative to prior timeslot *)
let is_new_epoch ~(prior : timeslot) ~(current : timeslot) : bool =
  epoch_of_timeslot current > epoch_of_timeslot prior
```

`Constants.c_epoch_len` is the full-spec 600. The conformance path reads E from the live spec instead (`Spec.epoch_length ()` in `lib/spec.ml`: 600 for full, 12 for the tiny test configuration).

</div>

## Safrole State (γ)

Safrole is JAM's block production lottery. Its state has four components:

| Component | Symbol | Type | Purpose |
|-----------|--------|------|---------|
| Pending Keys | γ_k (γ_P in GP 0.8.0) | Keys | Keys staged for next epoch |
| Ring Root | γ_z (γ_Z) | Ring root, 144 bytes | Bandersnatch ring commitment to the pending keys |
| Ticket Accumulator | γ_a (γ_A) | Tickets[] | Up to 600 best tickets this epoch |
| Seal Keys | γ_s (γ_S) | Tickets or Keys | Winners from last epoch (the slot-sealer sequence) |

The pending keys γ_P are a validator sequence, so under GP 0.8.0 their length is not fixed: any multiple of 3 from 6 to 1023 (see the next lesson).

<div class="callout callout-info">

**ELI5: The Lottery System**

Imagine a raffle:
- **γ_k** = People who signed up for NEXT year's raffle
- **γ_z** = A photo of the signup sheet (proof it exists)
- **γ_a** = Tickets being collected for THIS year's drawing
- **γ_s** = The winning tickets from LAST year (who gets prizes now)

Each epoch (hour), last year becomes this year, this year becomes next year.

</div>

<div class="lasair-connection">

### In Lasair: Safrole State

```ocaml
(* From lib/safrole.ml - Safrole state structure *)

(** Safrole ticket - VRF-derived score + entry index *)
type safrole_ticket = {
  id: hash;                       (** VRF output, used as score *)
  entry_index: ticket_entry_index; (** Entry slot index *)
}

(** Slot sealer - either ticket or direct key *)
type slot_sealer =
  | Ticketed of safrole_ticket seq  (** Regular: 600 tickets *)
  | Fallback of bs_key seq          (** Fallback: 600 validator keys *)

type safrole_state = {
  pending: Cores.validator_set;       (** γ_k: Next epoch validators *)
  epoch_root: Blob144.t;              (** γ_z: Ring root for tickets *)
  seal_tickets: slot_sealer;          (** γ_s: Current epoch sealers *)
  ticket_accumulator: safrole_ticket seq; (** γ_a: Accumulating tickets *)
}
```

</div>

## Ticket Structure

Each ticket has two fields:

```
Ticket = (y, r)
  y ∈ ℍ       -- 32-byte ticket identifier (VRF output)
  r ∈ ℕ       -- Entry index, r < n = ⌈2E / |γ_P'|⌉
```

With the full 1023 validators and E = 600, n = ⌈1200 / 1023⌉ = 2, so each validator gets two entries, r ∈ {0, 1}.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the constant N = 2 ("ticket entries per validator") is gone. Because validator sets can now be as small as 6, each validator may submit n = ⌈2E/|γ_P'|⌉ tickets so that the accumulator can still fill (section 6.7, eq. `ticketsextrinsic`); the ticket's entry index is typed ℕ and serialized as one octet, E₁ (appendix C). In lasair the bound is `ticket_attempt_bound` in `conformance/stf_config.ml`.

</div>

The ticket accumulator collects up to 600 tickets, keeping only those with the **lowest** identifiers (best tickets).

<div class="lasair-connection">

### In Lasair: Ticket Accumulator

```ocaml
(* From lib/safrole.ml - Ticket accumulation *)

(** Maximum tickets in accumulator *)
let max_tickets = Constants.c_epoch_len

(** Merge new tickets into accumulator, keep best C_epoch_len *)
let merge_tickets (accumulator : safrole_ticket seq)
    (new_tickets : safrole_ticket seq) : safrole_ticket seq =
  (* Combine and sort *)
  let all = Array.append accumulator new_tickets in
  Array.sort compare_tickets all;
  (* Keep only best (first) C_epoch_len *)
  if Array.length all <= max_tickets then all
  else Array.sub all 0 max_tickets
```

</div>

## Fallback Mechanism

If the lottery doesn't complete (not enough tickets), the system falls back to using validator public keys directly:

```
γ_s = Tickets(winners)    -- Normal: anonymous lottery winners
γ_s = Fallback(keys)      -- Fallback: known validator keys
```

In fallback mode, anyone can predict who will produce each block. This is less secure but keeps the chain running.

<div class="callout callout-info">

**ELI5: Plan B**

If the secret raffle fails (not enough participants):
- Normal: "The winner of slot 42 is... mystery ticket #7a3b!"
- Fallback: "The winner of slot 42 is... Alice!" (everyone knew it would be Alice)

Fallback is less fair but ensures the show goes on.

</div>

## Key Takeaways

1. **τ' = H_t** - Time just copies from header
2. **600 slots/epoch** - One hour at 6 seconds per slot
3. **Safrole** - Lottery system for block production
4. **Ticket accumulator** - Collects best 600 tickets
5. **Fallback** - Uses raw keys if lottery fails

## What's Next

Continue with **Section 6.3: Key Rotation** to understand how validator keys cycle through epochs.

[Next: 6.3 Key Rotation &rarr;](lesson.html?lesson=011-graypaper-lectures/25-key-rotation)
