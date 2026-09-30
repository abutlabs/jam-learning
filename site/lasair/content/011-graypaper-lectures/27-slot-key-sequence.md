---
title: "6.5 Slot Key Sequence"
duration: 8 min
video: https://www.youtube.com/watch?v=jeiNDhT536o
---

# Graypaper Section 6.5: The Slot Key Sequence

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how the ticket accumulator is transformed into the slot key sequence that determines who produces each block.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** section 6.5 is now titled "The Slot-Sealer Sequence", and γ_S is called the *slot-sealer sequence* throughout (earlier drafts said "seal-key series" or "slot key sequence"). The rules are the same, except that the fallback function F now indexes the validator sequence cyclically by its own length |κ'|, since there is no fixed validator count V any more (eq. `fallbackkeysequence`).

</div>

## What This Lecture Covers

- Slot key sequence construction
- The Z (outside-in) transformation
- Fallback key generation (F function)
- Security rationale

## Slot Key Sequence

At epoch boundaries, the slot key sequence (γ_s) is determined:

```
If lottery completed (e' = e + 1, m ≥ Y, |γ_a| = E):
  γ'_s = Z(γ_a)          -- Outside-in transform of tickets

If lottery failed:
  γ'_s = F(η'_2, κ')     -- Fallback from keys

If same epoch:
  γ'_s = γ_s             -- Unchanged
```

<div class="callout callout-info">

**ELI5: Lottery Winners**

At the end of each hour (epoch):
- If the lottery worked: shuffle the 600 winning tickets cleverly
- If it failed: randomly pick 600 names from the employee list
- During the hour: keep using the same list

</div>

## The Z Transform (Outside-In)

The Z function reorders tickets from "best to worst" into an interleaved pattern:

```
Before Z: [best, 2nd, 3rd, ..., 598th, 599th, worst]
After Z:  [best, worst, 2nd, 599th, 3rd, 598th, ...]
```

This pairs the best tickets with the worst, preventing manipulation:

<div class="lasair-connection">

### In Lasair: Outside-In Transform

```ocaml
(* From lib/safrole.ml - Z transform *)

(** Outside-in sequencer: Z([a,b,c,d,e,f]) = [a,f,b,e,c,d] *)
let outside_in_sequence (tickets : safrole_ticket seq) : safrole_ticket seq =
  let n = Array.length tickets in
  let result = Array.make n tickets.(0) in
  let left = ref 0 in
  let right = ref (n - 1) in
  for i = 0 to n - 1 do
    if i mod 2 = 0 then begin
      result.(i) <- tickets.(!left);
      incr left
    end else begin
      result.(i) <- tickets.(!right);
      decr right
    end
  done;
  result
```

</div>

## Why Outside-In?

Security against last-block manipulation:

```
Attack without Z:
  Attacker controls last block of epoch
  → Can submit tickets that fill slots 590-600
  → Knows they'll get those specific slots

Defense with Z:
  Attacker's "worst" tickets paired with best tickets
  → Best tickets determined early in epoch (can't control)
  → Attacker can only affect odd positions, not consecutive blocks
```

<div class="callout callout-info">

**ELI5: Shuffling for Fairness**

Imagine a race where latecomers get back positions:
- Without shuffle: Latecomers bunch up at the end
- With outside-in: Latecomers are spread throughout, mixed with early registrants

This prevents someone from registering late and getting consecutive positions.

</div>

## Fallback Function (F)

When the lottery fails, F generates pseudo-random key assignments:

```
F(entropy, keys) = sequence of 600 keys

For each slot i ∈ [0, 600):
  index = decode_u32(H(entropy ++ E_4(i))[0..4]) mod |keys|
  slot_key[i] = keys[index].bandersnatch
```

Here keys = κ' and entropy = η'_2. The modulus is the length of κ' (a multiple of 3 between 6 and 1023 in GP 0.8.0), not a constant.

<div class="lasair-connection">

### In Lasair: Fallback Keys

```ocaml
(* Illustrative sketch (not lasair's code) - Fallback key generation *)

(** Generate fallback slot keys from entropy and validator keys *)
let fallback_keys (entropy : hash) (keys : validator_keys) : public_key array =
  let num_slots = epoch_length in
  let num_validators = Array.length keys in

  Array.init num_slots (fun i ->
    (* Hash entropy with slot index *)
    let input = Bytes.concat [entropy; Bytes.of_int32 (Int32.of_int i)] in
    let hash = Hash.blake2b input in

    (* Take first 4 bytes as index *)
    let raw_index = Bytes.get_int32_le hash 0 in
    let index = Int32.to_int raw_index mod num_validators in

    (* Return bandersnatch key of selected validator *)
    bandersnatch_key keys.(index)
  )
```

</div>

## Lottery Completion Check

The lottery completes successfully when:

```
1. We've moved to the very next epoch (e' = e + 1)
2. Previous block was after lottery closing (m >= Y)
3. We have 600 tickets (|γ_a| = E)
```

If a whole epoch was skipped (e' > e + 1), the accumulator is stale and the fallback is used.

Where Y is the lottery closing phase (around slot 500).

<div class="lasair-connection">

### In Lasair: Lottery Completion

```ocaml
(* Illustrative sketch (not lasair's code) - Check lottery completion *)

(** Lottery closing phase within epoch *)
let lottery_closing_phase = 500  (* Y constant *)

(** Check if lottery completed successfully *)
let lottery_completed
    (prev_epoch : int) (prev_phase : int)
    (curr_epoch : int) (accumulator : ticket list)
    : bool =
  (* New epoch *)
  curr_epoch = prev_epoch + 1 &&
  (* Previous block was after lottery closed *)
  prev_phase >= lottery_closing_phase &&
  (* Have full complement of tickets *)
  List.length accumulator >= epoch_length

(** Compute new slot key sequence at epoch boundary *)
let compute_slot_keys
    (is_new_epoch : bool)
    (lottery_ok : bool)
    (accumulator : ticket list)
    (entropy : hash)
    (keys : validator_keys)
    (current_keys : seal_keys)
    : seal_keys =
  if not is_new_epoch then
    current_keys  (* Same epoch, unchanged *)
  else if lottery_ok then
    Tickets (outside_in (Array.of_list accumulator))
  else
    Fallback (fallback_keys entropy keys)
```

</div>

## Full Transition

```
Epoch boundary:
┌─────────────────────────────────────────────────────┐
│ Check: lottery_completed?                           │
├─────────────────────────────────────────────────────┤
│ YES: γ'_s = Z(γ_a)     (tickets, shuffled)         │
│ NO:  γ'_s = F(η'_2, κ') (fallback keys)            │
└─────────────────────────────────────────────────────┘

Same epoch:
  γ'_s = γ_s  (unchanged)
```

## Key Takeaways

1. **Z transform** - Outside-in reordering for security
2. **Prevents manipulation** - Best/worst pairing stops end-of-epoch attacks
3. **Fallback F** - Pseudo-random key selection when lottery fails
4. **Three conditions** - New epoch, post-closing, 600 tickets

## What's Next

Continue with **Section 6.6: The Markers** to understand how epoch and winning ticket information is communicated in headers.

[Next: 6.6 The Markers &rarr;](lesson.html?lesson=011-graypaper-lectures/28-the-markers)
