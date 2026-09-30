---
title: "5.1 Epoch & Ticket Markers"
duration: 4 min
video: https://www.youtube.com/watch?v=N4b1SzB9TOg
---

# Graypaper Section 5.1: Epoch and Winning Tickets Markers

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains two special header fields that communicate lottery outcomes to light clients: the epoch marker and winning tickets marker.

## What This Lecture Covers

- Epoch marker (H_e) - Fallback validator keys
- Winning tickets marker (H_w) - Lottery outcome
- Why both exist
- Light client implications

## The Two Markers

| Marker | Symbol | When Present | Contains |
|--------|--------|--------------|----------|
| Epoch Marker | H_e | First block of epoch | Fallback validator keys |
| Winning Tickets | H_w | When lottery completes | Winning ticket sequence |

These markers are **optional** - only included when their condition is met.

<div class="callout callout-info">

**ELI5: Backup Plans**

Imagine planning an outdoor party:
- **H_e (Epoch Marker)**: "If it rains, we'll use the backup venue"
- **H_w (Winning Tickets)**: "Great weather! Here's who's bringing what"

At the start (epoch begin), you announce the backup plan. Later, if everything goes well (lottery completes), you announce the actual assignments. If weather stays bad (lottery fails), everyone uses the backup.

</div>

## Epoch Marker (H_e)

Present in the **first block of each epoch**, containing fallback validator keys:

```
H_e = Some(fallback_keys)  -- First block of epoch
H_e = None                 -- All other blocks
```

The fallback keys are used if the Safrole lottery doesn't complete successfully.

Precisely, the marker holds the next and current epoch randomness (η₀, η₁) and, for each validator whose keys begin in the next epoch (the pending sequence γ_P'), its Bandersnatch and Ed25519 keys (section 6.6, eq. `epochmarker`).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the key list has one entry per validator in γ_P', and validator sequences no longer have a fixed length: any multiple of 3 from 6 to 3C = 1023 (`safrole.tex`, eq. `valcount`). So the list is now serialized with a length prefix, E(1, η₀, η₁, ↕keys) (appendix C.2, `\encodeepochmark`); in 0.7.2 it was exactly V = 1023 entries with no prefix. (Current versions write the markers H_E and H_W; the lecture uses lower-case letters.)

</div>

<div class="lasair-connection">

### In Lasair: Epoch Marker

```ocaml
(* From conformance/trace_types.ml *)

type trace_validator = {
  bandersnatch: bytes;
  ed25519: bytes;
}

type trace_epoch_mark = {
  entropy: bytes;            (* η₀ *)
  tickets_entropy: bytes;    (* η₁ *)
  validators: trace_validator list;
}

(* From conformance/block_codec.ml *)
let decode_epoch_mark b off =
  let (entropy, off) = dec_bytes b off 32 in
  let (tickets_entropy, off) = dec_bytes b off 32 in
  let (validators, off) = dec_list b off decode_validator in  (* compact length, then items *)
  ({ entropy; tickets_entropy; validators }, off)
```

`dec_list` reads a compact length first: that is the 0.8.0 length prefix.

</div>

## Winning Tickets Marker (H_w)

Present when the Safrole lottery completes, containing the winning ticket sequence:

```
H_w = Some(winning_tickets)  -- When lottery completes
H_w = None                   -- Otherwise
```

Once H_w appears in a block, the epoch marker can be ignored for that epoch.

<div class="lasair-connection">

### In Lasair: Winning Tickets

```ocaml
(* Illustrative sketch (not lasair's code) - Winning tickets marker *)

(** Winning tickets - the outcome of Safrole lottery.
    Present when enough tickets have been accumulated. *)
type winning_tickets = ticket array  (** length = epoch_length *)

(** Check if lottery should complete this block *)
let lottery_completes (gamma : safrole_state) (h : header) : bool =
  (* Lottery completes when we have enough valid tickets *)
  Array.length gamma.accumulated_tickets >= epoch_length &&
  is_lottery_closing_slot h.timeslot

(** Determine which key set to use for block production *)
let effective_keys (h : header) (gamma : safrole_state) : public_key array =
  match h.winning_tickets with
  | Some tickets ->
      (* Lottery succeeded - use ticket-derived keys *)
      derive_keys_from_tickets tickets
  | None ->
      (* Use fallback from epoch marker or previous epoch *)
      gamma.fallback_keys
```

</div>

## Why Two Markers?

The system handles lottery failure gracefully:

```
Epoch Start:
  Block 0: H_e = fallback_keys  (backup plan announced)

During Epoch:
  Blocks 1-N: Collecting tickets...

Lottery Outcome:
  Success: Some block has H_w = winning_tickets
  Failure: No H_w appears, use H_e fallback
```

<div class="callout callout-info">

**ELI5: Insurance Policy**

Think of H_e as an insurance policy:
- You take it out at the start of each epoch (just in case)
- If everything goes well (lottery completes), you never use it
- If things go wrong (lottery fails), you fall back to it

The insurance (H_e) is announced early so light clients can track it without full state.

</div>

## Light Client Optimization

Full nodes track state and don't need these markers. But **light clients** only follow headers, so:

1. At epoch start, they note H_e (fallback)
2. They watch for H_w (lottery outcome)
3. If H_w appears → use winning tickets
4. If epoch ends without H_w → use H_e fallback

```
Light client logic:

for each header:
    if H_e present:
        fallback = H_e.keys
    if H_w present:
        active_keys = H_w  // Lottery succeeded!
        ignore fallback

at epoch end:
    if no H_w seen:
        active_keys = fallback  // Lottery failed
```

<div class="lasair-connection">

### In Lasair: Light Client View

```ocaml
(* Illustrative sketch (not lasair's code) - Header-only validation *)

(** Light client state for validator tracking *)
type light_state = {
  current_epoch: int;
  fallback_keys: public_key array option;
  winning_tickets: winning_tickets option;
}

(** Process header for light client *)
let process_header (state : light_state) (h : header) : light_state =
  let state =
    (* Track epoch marker as fallback *)
    match h.epoch_marker with
    | Some marker -> { state with fallback_keys = Some marker.fallback_keys }
    | None -> state
  in
  (* Winning tickets supersede fallback *)
  match h.winning_tickets with
  | Some tickets -> { state with winning_tickets = Some tickets }
  | None -> state

(** Get effective validator keys for slot *)
let effective_validators (state : light_state) : public_key array =
  match state.winning_tickets with
  | Some tickets -> derive_keys_from_tickets tickets
  | None ->
      match state.fallback_keys with
      | Some keys -> keys
      | None -> failwith "No validator keys available"
```

</div>

## Full Node Behavior

Full nodes verify these markers match state:

```
Full node checks:
- H_e (if present) matches computed fallback from state
- H_w (if present) matches lottery outcome from state
```

The markers are redundant for full nodes but essential for light clients.

## Key Takeaways

1. **H_e (epoch marker)** - Fallback keys at epoch start
2. **H_w (winning tickets)** - Lottery outcome when it completes
3. **Light client support** - Can track validators without full state
4. **Full nodes verify** - Markers must match computed state
5. **Graceful degradation** - System works even if lottery fails

## What's Next

Continue with **Section 6: Timekeeping** to understand how JAM manages slots, epochs, and time-based transitions.

[Next: 6.1 Timekeeping &rarr;](lesson.html?lesson=011-graypaper-lectures/24-timekeeping)
