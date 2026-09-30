---
title: "6.4 Sealing and Entropy"
duration: 11 min
video: https://www.youtube.com/watch?v=CL6vMZLwtDk
---

# Graypaper Section 6.4: Sealing and Entropy Accumulation

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section covers the two cryptographic signatures in each block header: the seal (authorization) and the entropy (randomness accumulation).

## What This Lecture Covers

- Block seal verification (authorization)
- Normal vs fallback seal validation
- Entropy VRF signature
- Entropy accumulator updates

## The Two Signatures

Each block header contains two Bandersnatch signatures:

| Signature | Symbol | Purpose |
|-----------|--------|---------|
| Seal | H_S | Authorizes block production |
| Entropy | H_V | Contributes to randomness pool |

(GP 0.8.0 lettering; the lecture writes H_s and H_y.)

<div class="callout callout-info">

**ELI5: Two Signatures**

Like signing two forms at the bank:
- **Seal** = "I'm authorized to make this withdrawal" (proves you won the lottery slot)
- **Entropy** = "Here's my contribution to the random number pot" (adds unpredictability)

</div>

## Seal Verification (Normal Mode)

In normal operation, the seal proves the author holds the winning ticket:

```
1. Look up the slot-sealer entry: i = γ'_S[H_T mod E]
2. Extract VRF output: Y(H_S) = ticket identifier
3. Verify: i.id == Y(H_S)  -- Seal VRF matches ticket ID
4. Verify the VRF signature on the unsealed header E_U(H),
   context "$jam_ticket_seal" ++ η'_3 ++ i.entry_index
```

(Section 6.4, eq. `ticketconditiontrue`. The Graypaper writes its context strings with a leading `$`, e.g. `$jam_ticket_seal`; the bytes actually signed are `jam_ticket_seal`, as in lasair's `ctx_ticket_seal`, `lib/safrole.ml`.)

<div class="lasair-connection">

### In Lasair: Normal Seal Verification

```ocaml
(* Illustrative sketch (not lasair's code). lasair's seal check is in
   conformance/stf_guarantees.ml; the context strings are ctx_ticket_seal,
   ctx_fallback_seal and ctx_entropy in lib/safrole.ml. *)

(** Verify seal in normal (ticket) mode *)
let verify_seal_normal
    (header : header)
    (seal_keys : ticket array)
    (author_key : public_key)
    : bool =
  (* 1. Get expected ticket for this slot *)
  let slot_index = header.timeslot mod epoch_length in
  let expected_ticket = seal_keys.(slot_index) in

  (* 2. Extract VRF output from seal signature *)
  let vrf_output = Bandersnatch.vrf_output header.seal in

  (* 3. Verify VRF output matches ticket identity *)
  let ticket_matches = Bytes.equal vrf_output expected_ticket.y in

  (* 4. Verify seal signature *)
  let unsigned_header = encode_unsealed header in
  let sig_valid = Bandersnatch.verify_vrf
    author_key
    unsigned_header
    (seal_vrf_input header)
    header.seal
  in

  ticket_matches && sig_valid

(** VRF input for seal signature *)
let seal_vrf_input (header : header) : bytes =
  (* "jam_ticket_seal" ++ η'_3 ++ ticket_entry_index *)
  Bytes.concat [
    Bytes.of_string "jam_ticket_seal";
    header.entropy.(3);
    Bytes.of_int8 (get_ticket_entry header)
  ]
```

</div>

## Seal Verification (Fallback Mode)

In fallback mode (lottery didn't complete), we use validator keys directly:

```
1. Look up key: i = γ'_S[H_T mod E]
2. Verify: i == H_A  -- Author's Bandersnatch key matches expected
3. Verify signature on unsealed header, context "$jam_fallback_seal" ++ η'_3
```

The VRF input differs slightly - no ticket entry index since there's no ticket.

<div class="lasair-connection">

### In Lasair: Fallback Seal Verification

```ocaml
(* Illustrative sketch (not lasair's code) - Fallback seal verification *)

(** Verify seal in fallback (key) mode *)
let verify_seal_fallback
    (header : header)
    (seal_keys : public_key array)
    (author_key : public_key)
    : bool =
  (* 1. Get expected key for this slot *)
  let slot_index = header.timeslot mod epoch_length in
  let expected_key = seal_keys.(slot_index) in

  (* 2. Verify author matches expected key *)
  let key_matches = Bytes.equal author_key expected_key in

  (* 3. Verify seal signature *)
  let unsigned_header = encode_unsealed header in
  let sig_valid = Bandersnatch.verify_vrf
    author_key
    unsigned_header
    (fallback_vrf_input header)
    header.seal
  in

  key_matches && sig_valid

(** VRF input for fallback seal *)
let fallback_vrf_input (header : header) : bytes =
  (* "jam_fallback_seal" ++ entropy[3] *)
  Bytes.concat [
    Bytes.of_string "jam_fallback_seal";
    header.entropy.(3)
  ]
```

</div>

## Mode Indicator (T)

A marker tracks which mode we're in:

```
T = 1  -- Normal mode (tickets)
T = 0  -- Fallback mode (keys)
```

This is used later in protocol logic to know how seal keys should be interpreted.

## Entropy VRF (H_V)

The entropy signature adds randomness to the protocol:

```
VRF input: "$jam_entropy" ++ Y(H_S)  -- Uses seal's VRF output
VRF output: feeds into entropy accumulator
```

<div class="callout callout-info">

**ELI5: Chaining Randomness**

The entropy VRF chains randomness:
1. Your seal signature produces a random number
2. That random number becomes input to your entropy signature
3. Your entropy signature produces ANOTHER random number
4. That goes into the pool

This makes it nearly impossible to manipulate the final randomness.

</div>

<div class="lasair-connection">

### In Lasair: Entropy VRF

```ocaml
(* Illustrative sketch (not lasair's code) - Entropy VRF verification *)

(** Verify entropy signature *)
let verify_entropy_vrf
    (header : header)
    (author_key : public_key)
    : bool =
  let vrf_input = entropy_vrf_input header in
  Bandersnatch.verify_vrf
    author_key
    Bytes.empty  (* No message being signed *)
    vrf_input
    header.entropy_sig

(** VRF input for entropy signature *)
let entropy_vrf_input (header : header) : bytes =
  (* "jam_entropy" ++ seal_vrf_output *)
  let seal_vrf_output = Bandersnatch.vrf_output header.seal in
  Bytes.concat [
    Bytes.of_string "jam_entropy";
    seal_vrf_output
  ]
```

</div>

## Entropy Accumulator (η)

The entropy state has four components:

```
η = (η_0, η_1, η_2, η_3)

η_0: Current epoch accumulator
η_1: Previous epoch entropy
η_2: Two epochs ago
η_3: Three epochs ago (used in VRF inputs)
```

### Update Rules

```
η'_0 = H(η_0 ++ Y(H_V))  -- Accumulate new entropy

At epoch boundary (e' > e), from the PRIOR values:
η'_1 = η_0
η'_2 = η_1
η'_3 = η_2
(η_3 is discarded)
```

<div class="lasair-connection">

### In Lasair: Entropy Accumulation

```ocaml
(* Illustrative sketch (not lasair's code) - Entropy state and accumulation.
   lasair's import path does this in update_entropy, conformance/stf_transitions.ml. *)

(** Entropy state: four 32-byte hashes *)
type entropy_state = {
  eta_0: hash;  (** Current accumulator *)
  eta_1: hash;  (** Previous epoch *)
  eta_2: hash;  (** Two epochs ago *)
  eta_3: hash;  (** Three epochs ago *)
}

(** Accumulate entropy from block *)
let accumulate_entropy (eta : entropy_state) (entropy_vrf : bytes)
    : entropy_state =
  (* η'_0 = H(η_0 ++ Y(H_y)) *)
  let eta_0' = Hash.blake2b (Bytes.concat [eta.eta_0; entropy_vrf]) in
  { eta with eta_0 = eta_0' }

(** Rotate entropy at epoch boundary *)
let rotate_entropy (eta : entropy_state) (is_new_epoch : bool)
    : entropy_state =
  if is_new_epoch then
    { eta_0 = eta.eta_0;  (* Keep accumulating *)
      eta_1 = eta.eta_0;  (* Previous = old accumulator *)
      eta_2 = eta.eta_1;
      eta_3 = eta.eta_2 }
  else
    eta  (* No rotation *)

(** Full entropy transition: rotate from the PRIOR η_0 first,
    then accumulate into η_0 (η'_1 = η_0, not η'_0) *)
let transition_entropy (eta : entropy_state) (header : header)
    (is_new_epoch : bool) : entropy_state =
  let entropy_output = Bandersnatch.vrf_output header.entropy_sig in
  eta
  |> fun e -> rotate_entropy e is_new_epoch
  |> fun e -> accumulate_entropy e entropy_output
```

</div>

## Why This Design?

The VRF chaining makes manipulation extremely difficult:

1. **Can't predict** - VRF output is unpredictable before signing
2. **Can't bias** - Only option is to withhold block (lose reward)
3. **Historical depth** - η_3 was fixed 3 epochs ago, can't be influenced

<div class="callout callout-info">

**ELI5: Mixing the Pot**

Like a cooking competition where each chef adds a secret ingredient:
- You can't know what others will add
- You can't change your ingredient after seeing theirs
- The final dish depends on EVERYONE's contributions
- The only way to "cheat" is to not participate (and lose your prize)

</div>

## Key Takeaways

1. **Two signatures** - Seal (authorization) and Entropy (randomness)
2. **Normal mode** - Seal proves ticket ownership via VRF
3. **Fallback mode** - Direct key matching when lottery fails
4. **VRF chaining** - Entropy input includes seal output
5. **Four-epoch history** - η_3 provides unpredictable randomness

## What's Next

Continue with **Section 6.5: The Slot-Sealer Sequence** (called "The Slot Key Sequence" before GP 0.8.0) to understand how seal keys are ordered for each slot.

[Next: 6.5 The Slot-Sealer Sequence &rarr;](lesson.html?lesson=011-graypaper-lectures/27-slot-key-sequence)
