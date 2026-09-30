---
title: "5.0 The Header"
duration: 14 min
video: https://www.youtube.com/watch?v=eG75u2GmUD0
---

# Graypaper Section 5: The Header

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section details the structure of a JAM block header - the compact metadata that commits to all block content and enables efficient validation.

## What This Lecture Covers

- Complete header structure
- Prior vs posterior state root
- Signatures and sealing
- Time and ancestry
- Author identification

## The Big Difference: Prior State Root

JAM includes the **prior** state root, not posterior:

```
Ethereum/Polkadot: header includes H(σ')  -- state AFTER block
JAM:               header includes H(σ)   -- state BEFORE block
```

<div class="callout callout-info">

**ELI5: Publishing vs Computing**

Imagine a cooking show:
- **Posterior** (Ethereum): You must cook the dish AND photograph it before sharing the recipe
- **Prior** (JAM): You share the recipe immediately; everyone cooks at the same time

With JAM, the block producer publishes the block, and ALL validators compute the result simultaneously. This doubles the available computation time per block.

</div>

This design choice enables **parallel execution** - all validators can compute the posterior state simultaneously, rather than waiting for the producer to compute it first.

## Header Fields

| Field | Symbol | Type | Purpose |
|-------|--------|------|---------|
| Parent Hash | H_P | H | Hash of parent header |
| Prior State Root | H_R | H | Merkle root of prior state |
| Extrinsic Hash | H_X | H | Hash of extrinsic data |
| Timeslot | H_T | ℕ_T | Current slot index |
| Epoch Marker | H_E | Option | Next epoch's entropy and validator keys |
| Winning Tickets | H_W | Option | Lottery outcome |
| Offenders Marker | H_O | Sequence | Ed25519 keys of newly misbehaving validators (serialized) |
| Author Index | H_I | ℕ_{\|κ'\|} | Index into the posterior active validators κ' |
| Entropy Signature | H_V | Sig | VRF for randomness |
| Block Seal | H_S | Sig | Authorization signature |

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the author index is bounded by the size of the posterior validator sequence, H_I ∈ ℕ_{|κ'|}, not by a constant V: since 0.8.0 the validator count is a multiple of 3 between 6 and 3C = 1023 and may change at an epoch boundary (section 5; `safrole.tex`, eq. `valcount`). The symbols above are the 0.8.0 ones (upper-case subscripts); the lecture uses an older lettering, including a judgments marker that current versions replace with the serialized offenders marker H_O.

</div>

<div class="lasair-connection">

### In Lasair: Header Type

```ocaml
(* From lib/header.ml - Block header structure *)

type header = {
  parent: hash;             (** H_p: Hash of parent header *)
  prior_state_root: hash;   (** H_r: Prior state root (BEFORE this block) *)
  extrinsic_hash: hash;     (** H_x: Extrinsic Merkle commitment *)
  timeslot: timeslot;       (** H_t: Timeslot index *)
  epoch_marker: epoch_marker option;    (** H_e: Fallback epoch data *)
  winners_marker: winners_marker option; (** H_w: Next epoch tickets *)
  offenders_marker: ed_key seq;  (** H_o: Misbehaving validators *)
  author_index: val_index;  (** H_i: Block author validator index *)
  vrf_signature: bs_signature;   (** H_v: Entropy VRF signature *)
  seal_signature: bs_signature;  (** H_s: Block seal signature *)
}

(** H_authorbskey = active_set'[H_i].bs_key.
    The bound is the live set's length, not a constant V. *)
let get_author_bs_key (h : header) (active_set : validator_keys seq) : bs_key option =
  if h.author_index >= 0 && h.author_index < Array.length active_set then
    Some active_set.(h.author_index).bs
  else
    None
```

`lib/header.ml` is a learning model of section 5 (its comments keep the older lower-case letters). The header lasair actually decodes and imports is `trace_header` in `conformance/block_codec.ml`.

</div>

## Sealing the Header

The seal signature authorizes the block but cannot include itself (self-reference). So we have two serialization modes:

```
E(H)   = full header including seal
E_U(H) = header without seal (for signing)
```

The seal is computed over the unsealed header:

```
H_S = sign(E_U(H), author_key)
```

<div class="lasair-connection">

### In Lasair: Header Encoding

```ocaml
(* From conformance/block_codec.ml - encode_header (abridged) *)
let encode_header (h : trace_header) : bytes =
  let buf = Buffer.create 360 in
  Buffer.add_bytes buf h.parent;
  Buffer.add_bytes buf h.parent_state_root;
  Buffer.add_bytes buf h.extrinsic_hash;
  buf_add_u32 buf h.slot;
  (match h.epoch_mark with
   | None -> Buffer.add_char buf '\x00'
   | Some em ->
     Buffer.add_char buf '\x01';
     Buffer.add_bytes buf em.entropy;
     Buffer.add_bytes buf em.tickets_entropy;
     buf_add_compact buf (List.length em.validators);   (* GP 0.8.0: length-prefixed *)
     List.iter (fun v ->
       Buffer.add_bytes buf v.bandersnatch;
       Buffer.add_bytes buf v.ed25519) em.validators);
  (* ... winning-tickets marker ... *)
  buf_add_u16 buf h.author_index;
  Buffer.add_bytes buf h.entropy_source;
  buf_add_compact buf (List.length h.offenders_mark);
  List.iter (Buffer.add_bytes buf) h.offenders_mark;
  Buffer.add_bytes buf h.seal;                          (* the 96-byte seal is last *)
  Buffer.to_bytes buf
```

Because the seal is the final 96 bytes, the seal check in `conformance/stf_guarantees.ml` takes E_U(H) as the full encoding minus its last 96 bytes and verifies the Bandersnatch VRF signature over it.

</div>

## Time Constraints

Two time rules govern header validity:

```
1. H_T > parent.H_T    -- Time must advance
2. H_T · 6 ≤ 𝒯         -- Can't be in the future
```

Where 𝒯 (calligraphic T) is the current real-world time in seconds since the JAM Common Era, and 6 is the slot length P in seconds.

<div class="callout callout-info">

**ELI5: No Time Travel**

- You can't publish a block before its parent (rule 1)
- You can't publish a block from the future (rule 2)

A block might arrive slightly early due to clock differences. That's okay - just wait until its timeslot arrives, then process it.

</div>

<div class="lasair-connection">

### In Lasair: Time Validation

```ocaml
(* From lib/header.ml - Time constraints *)

let is_timeslot_valid ~(parent_timeslot : timeslot) ~(header_timeslot : timeslot)
    ~(current_time_unix : int64) : bool =
  (* timeslot > parent.timeslot *)
  let after_parent = Int32.compare header_timeslot parent_timeslot > 0 in
  (* timeslot * 6 <= wall_clock (in seconds since JAM era) *)
  let jam_era_seconds = Int64.sub current_time_unix Overview.jam_common_era_unix in
  let slot_seconds = Int64.mul (Int64.of_int32 header_timeslot)
      (Int64.of_int Constants.c_slot_seconds) in
  let not_future = Int64.compare slot_seconds jam_era_seconds <= 0 in
  after_parent && not_future
```

</div>

## The Blockchain Property

The parent-hash equation of section 5 defines the fundamental blockchain structure:

```
H_P = H(E(parent_header))
```

Each header commits to its parent via hash, creating an immutable chain back to genesis.

<div class="lasair-connection">

### In Lasair: Ancestry

```ocaml
(* Illustrative sketch (not lasair's code) - Block ancestry *)

(** Hash a header to get its identifier *)
let hash_header (h : header) : hash =
  Hash.blake2b (encode h)

(** Verify parent relationship *)
let is_child_of (child : header) (parent : header) : bool =
  Bytes.equal child.parent (hash_header parent)

(** The ancestor set A - all headers back to genesis *)
type ancestor_set = header list

(** Build ancestor set (recursive) *)
let rec ancestors (h : header) (get_header : hash -> header option)
    : ancestor_set =
  match get_header h.parent with
  | None -> [h]  (* Genesis has no parent *)
  | Some parent -> h :: ancestors parent get_header
```

</div>

## Two Signatures

JAM headers contain two Bandersnatch signatures:

| Signature | Symbol | Purpose |
|-----------|--------|---------|
| Entropy | H_V | VRF output for randomness accumulation |
| Seal | H_S | Authorizes block production + identifies ticket |

The seal serves dual purposes:
1. **Authorization** - Proves the validator was allowed to produce this block
2. **VRF** - The randomness from the seal determines which ticket was used

## Author Identification

```
H_I ∈ ℕ_{|κ'|}      -- Index into the posterior validator sequence [0, |κ'|)
H_A = κ'[H_I]_b     -- Derived: the author's Bandersnatch key
```

H_A is not serialized - it's derived from H_I by looking up the validator at that index in the posterior active validator sequence κ' and taking its Bandersnatch key.

<div class="lasair-connection">

### In Lasair: Author Lookup

`get_author_bs_key` above is lasair's H_A: it returns `None` when the index is past the end of the live sequence, which is exactly the 0.8.0 bound H_I < |κ'|. Whether that author was entitled to the slot is checked by the seal (section 6.4), not by comparing indices.

</div>

## Key Takeaways

1. **Prior state root** - Enables parallel computation across validators
2. **Two serializations** - Sealed and unsealed for signing
3. **Time constraints** - Must advance, can't be future
4. **Two signatures** - Entropy (randomness) and Seal (authorization)
5. **Author index** - Not keys directly, just validator index

## What's Next

Continue with **Section 5.1: Epoch and Winning Tickets Markers** to understand how validators are selected for block production.

[Next: 5.1 Epoch and Tickets Markers &rarr;](lesson.html?lesson=011-graypaper-lectures/23-epoch-markers)
