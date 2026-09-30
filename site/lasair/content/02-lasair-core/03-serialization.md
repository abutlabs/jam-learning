---
title: The JAM Codec
duration: 25 min
---

# The JAM Codec

JAM defines its own binary serialization format in the Graypaper's
serialization appendix. Every block, work report, and state value is
serialized to bytes using this codec.

It shares design principles with Polkadot's SCALE — little-endian,
schema-less, deterministic — but **it is not SCALE**. The variable-length
integer encoding is completely different, and implementing SCALE's compact
encoding instead of JAM's will fail every codec conformance vector. (This
distinction matters enough that it gets its own section below.)

**In lasair:** `lib/serialization.ml`

## Design Properties

- **Deterministic** - Same input always produces same output
- **Compact** - Variable-length integers save space
- **No schema** - No field names or type tags in the output
- **Little-endian** - Consistent with most modern CPUs

The downside: you need the schema to decode. But for a blockchain, where
every node runs the same protocol, this is fine.

## Little-Endian Encoding

Fixed-width numbers are stored with the least significant byte first:

```
Decimal: 305419896
Hex:     0x12345678
Bytes:   78 56 34 12  (reversed!)
```

```ocaml
(* From lib/serialization.ml *)

(** Encode unsigned integer as n bytes, little-endian *)
let encode_fixed_int (n : int) (value : int64) : bytes =
  let result = Bytes.create n in
  let rec fill i v =
    if i < n then begin
      Bytes.set result i (Char.chr (Int64.to_int (Int64.logand v 0xFFL)));
      fill (i + 1) (Int64.shift_right_logical v 8)
    end
  in
  fill 0 value;
  result
```

### Try It

```ocaml
> encode_u32_le 0x12345678l |> hex_of_bytes;;
(* "78563412" - little endian! *)
```

## Variable-Length Naturals (NOT SCALE Compact!)

This is where JAM diverges from SCALE, and where a new implementer is most
likely to go wrong.

**SCALE** stores a 2-bit mode tag in the *low* bits of the first byte
(`42` encodes as `0xa8`). **JAM** instead uses the count of *leading 1
bits* in the first byte to say how many additional bytes follow (`42`
encodes as `0x2a` — itself).

| Value range | Total bytes | First byte pattern |
|-------------|-------------|--------------------|
| 0 – 2⁷−1 | 1 | `0xxxxxxx` (the value itself) |
| 2⁷ – 2¹⁴−1 | 2 | `10xxxxxx` + 1 byte LE |
| 2¹⁴ – 2²¹−1 | 3 | `110xxxxx` + 2 bytes LE |
| 2²¹ – 2²⁸−1 | 4 | `1110xxxx` + 3 bytes LE |
| ... | ... | one more byte per 7 bits |
| ≥ 2⁵⁶ | 9 | `0xFF` + 8 bytes LE |

For `l` additional bytes, the prefix byte is
`(256 − 2^(8−l)) + ⌊v / 2^(8l)⌋`, and the low `8l` bits of `v` follow in
little-endian order. The leftover high bits ride along *inside* the prefix
byte itself.

```ocaml
(* From lib/serialization.ml *)

(* A compact natural goes up to 2^64 - 1 but is held in an int64,
   so every comparison is UNSIGNED *)
let ult (a : int64) (b : int64) = Int64.unsigned_compare a b < 0

let encode_compact (v : int64) : bytes =
  if v = 0L then
    Bytes.make 1 '\x00'
  else if ult v 0x80L then
    (* Single byte, value < 128 *)
    encode_fixed_int 1 v
  else
    (* Find l such that 2^(7l) <= v < 2^(7(l+1)) *)
    let rec find_l l =
      if l >= 8 then 8
      else
        let lower = Int64.shift_left 1L (7 * l) in
        let upper = Int64.shift_left 1L (7 * (l + 1)) in
        if not (ult v lower) && ult v upper then l
        else find_l (l + 1)
    in
    let l = find_l 1 in
    if l >= 8 then begin
      (* 9 bytes: 0xFF prefix + 8 bytes *)
      let result = Bytes.create 9 in
      Bytes.set result 0 '\xFF';
      let value_bytes = encode_fixed_int 8 v in
      Bytes.blit value_bytes 0 result 1 8;
      result
    end else begin
      (* Prefix: 2^8 - 2^(8-l) + floor(v / 2^(8l)) *)
      let shift = 8 * l in
      let high_part = Int64.shift_right_logical v shift in
      let prefix_base = 0xFF land (0xFF lsl (8 - l)) in
      let prefix = prefix_base lor (Int64.to_int high_part) in
      let result = Bytes.create (l + 1) in
      Bytes.set result 0 (Char.chr prefix);
      (* Remaining l bytes are (v mod 2^(8l)), little-endian *)
      let low_mask = Int64.sub (Int64.shift_left 1L shift) 1L in
      let low_bytes = encode_fixed_int l (Int64.logand v low_mask) in
      Bytes.blit low_bytes 0 result 1 l;
      result
    end
```

### ⚠️ The Comparison That Rejected a Valid Block

`ult` was added on 2026-09-30. Before that, the comparisons were the ordinary signed `<` and `>=` on `int64`. A value of 2⁶³ or more is *negative* as an `int64`, so `v < 0x80L` was true and the value went out in the one-byte form. Every test vector passed, because none carries a compact natural that large.

The official fuzzer's first Graypaper 0.8.0 run against lasair did: a work report whose `auth_gas_used` was 2⁶⁴ − 70. Lasair re-encoded it as one byte, so the report hash and then the block's extrinsic hash came out wrong, and a valid block was rejected as `bad_extrinsic_hash`. The lesson generalizes: OCaml's `int64` is signed, the protocol's naturals are not, and every comparison on a 64-bit protocol value has to be unsigned.

### Try It

```ocaml
> encode_compact 42 |> hex_of_bytes;;
(* "2a" - values below 128 encode as themselves *)

> encode_compact 1000 |> hex_of_bytes;;
(* "83e8" *)
(* one leading 1 bit -> one byte follows           *)
(* prefix 0x83 = 0x80 + (1000 >> 8) = 0x80 + 3     *)
(* then 1000 mod 256 = 232 = 0xe8                  *)

> encode_compact 100000 |> hex_of_bytes;;
(* "c1a086" *)
(* two leading 1 bits -> two bytes follow          *)
(* prefix 0xc1 = 0xc0 + (100000 >> 16) = 0xc0 + 1  *)
(* then 100000 mod 65536 = 0x86a0, LE: a0 86       *)
```

## Decoding: Count the Leading Ones

The decoder reads the first byte, counts its leading 1 bits to learn how
many bytes follow, then reassembles the value:

```ocaml
(* From lib/serialization.ml *)

let decode_compact (bs : bytes) (offset : int) : int64 * int =
  let first = Char.code (Bytes.get bs offset) in
  if first = 0 then
    (0L, 1)
  else if first < 0x80 then
    (* Single byte value < 128 *)
    (Int64.of_int first, 1)
  else if first = 0xFF then
    (* 9-byte encoding: 0xFF + 8 bytes *)
    let v = decode_fixed_int bs (offset + 1) 8 in
    (v, 9)
  else
    (* Count leading 1 bits to determine l *)
    let rec count_leading_ones byte count =
      if count >= 8 then count
      else if byte land (0x80 lsr count) <> 0 then
        count_leading_ones byte (count + 1)
      else count
    in
    let l = count_leading_ones first 0 in
    (* High bits come from the prefix byte, after the leading ones *)
    let high_mask = (1 lsl (8 - l)) - 1 in
    let high_part = Int64.of_int (first land high_mask) in
    (* Low bytes: l bytes, little-endian *)
    let low_part = decode_fixed_int bs (offset + 1) l in
    let value = Int64.logor (Int64.shift_left high_part (l * 8)) low_part in
    (value, l + 1)
```

### ⚠️ The Return Value That Failed 633 Vectors

`decode_compact` returns `(value, bytes_CONSUMED)` — **not** the new
offset. Lasair once had call sites that treated the second component as an
absolute offset; the result was 633 failing codec vectors, because every
field after a variable-length integer was read from the wrong position.
When you write your own decoder, pick one convention and assert it at every
call site. The [Conformance Lab](lesson.html?lesson=04-conformance/07-binary-codec)
tells the full story.

### Try It

```ocaml
> decode_compact (encode_compact 1000) 0;;
(* (1000, 2) - the 2 means "two bytes consumed" *)
```

## Sequences (Arrays)

**Variable-length** sequences are encoded as:
1. Length, encoded as a variable-length natural
2. Concatenated elements

```ocaml
let encode_seq encode_elem items =
  let len_bytes = encode_compact (Array.length items) in
  let elem_bytes = Array.map encode_elem items in
  concat_bytes (Array.concat [[|len_bytes|]; elem_bytes])
```

```ocaml
> encode_seq encode_u8 [|1; 2; 3; 4; 5|] |> hex_of_bytes;;
(* "050102030405" *)
(*  ↑ length 5 (one byte: 5 < 128)  *)
(*    ↑↑↑↑↑↑↑↑↑↑ the five elements  *)
```

**Fixed-length** sequences — where the schema fixes the count, like the
epoch's tickets marker (always `E` tickets) or an assurance's per-core
bitfield (always `C` bits) — have **no length prefix at all**. The decoder
knows how many to read. Adding a length prefix where the Graypaper
specifies a fixed count is another classic vector-failing bug.

The reverse changed in Graypaper 0.8.0. Validator sets can now change size,
so every sequence of validators (the epoch marker's key list, the κ, λ, ι
and pending sets in state, the per-validator statistics) is a
**length-prefixed** sequence where 0.7.2 had a fixed count of V. A 0.7.2
codec reads the 0.8.0 bytes one byte off.

## Options

Optional values:
- `None` = `0x00`
- `Some x` = `0x01` followed by encoded `x`

```ocaml
let encode_option encode_inner opt =
  match opt with
  | None -> Bytes.make 1 '\x00'
  | Some x ->
      let inner = encode_inner x in
      let result = Bytes.create (1 + Bytes.length inner) in
      Bytes.set_uint8 result 0 1;
      Bytes.blit inner 0 result 1 (Bytes.length inner);
      result
```

## In Lasair: Header Encoding

From `conformance/block_codec.ml` — the real encoder used to hash block
headers (`Stf_encoding.serialize_header` calls it). Its decoder twin in the
same file reads the blocks the conformance fuzzer sends over its socket:

```ocaml
let encode_header (h : trace_header) : bytes =
  let buf = Buffer.create 360 in
  Buffer.add_bytes buf h.parent;              (* 32 bytes, fixed *)
  Buffer.add_bytes buf h.parent_state_root;   (* 32 bytes, fixed *)
  Buffer.add_bytes buf h.extrinsic_hash;      (* 32 bytes, fixed *)
  buf_add_u32 buf h.slot;                     (* 4 bytes LE *)
  (* epoch_mark: Option - 0x00 = None, 0x01 + data = Some *)
  (match h.epoch_mark with
   | None -> Buffer.add_char buf '\x00'
   | Some em ->
     Buffer.add_char buf '\x01';
     Buffer.add_bytes buf em.entropy;          (* 32 *)
     Buffer.add_bytes buf em.tickets_entropy;  (* 32 *)
     (* GP 0.8.0: the validator list is LENGTH-PREFIXED *)
     buf_add_compact buf (List.length em.validators);
     List.iter (fun v ->
       Buffer.add_bytes buf v.bandersnatch;   (* 32 *)
       Buffer.add_bytes buf v.ed25519) em.validators);  (* 32 *)
  (* tickets_mark: Option of a FIXED-length sequence (E tickets) -
     note: no length prefix inside the Some! *)
  (match h.tickets_mark with
   | None -> Buffer.add_char buf '\x00'
   | Some ts ->
     Buffer.add_char buf '\x01';
     List.iter (fun t ->
       Buffer.add_bytes buf t.ht_id;                          (* 32 *)
       Buffer.add_char buf (Char.chr (t.ht_attempt land 0xFF))) ts);  (* 1 *)
  buf_add_u16 buf h.author_index;             (* 2 bytes LE *)
  Buffer.add_bytes buf h.entropy_source;      (* 96 bytes, fixed *)
  (* offenders_mark: variable sequence - length prefix + Ed25519 keys *)
  buf_add_compact buf (List.length h.offenders_mark);
  List.iter (Buffer.add_bytes buf) h.offenders_mark;
  Buffer.add_bytes buf h.seal;                (* 96 bytes, fixed *)
  Buffer.to_bytes buf
```

The encoder walks each field in order, encoding according to its type.
There are no separators or field names — the decoder must know the exact
structure. Notice the mix: fixed-size hashes need nothing, options need a
tag byte, fixed-count sequences need no length, variable sequences need a
length prefix. Getting any one of these wrong shifts every byte after it.

## Bit-Level Encoding

Some fields pack multiple values into bytes:

```ocaml
(* Encode a bitfield - one bit per validator, LSB first *)
let encode_bitfield validators =
  let num_bytes = (Array.length validators + 7) / 8 in
  let bytes = Bytes.make num_bytes '\x00' in
  Array.iteri (fun i v ->
    if v then begin
      let byte_idx = i / 8 in
      let bit_idx = i mod 8 in
      let old = Bytes.get_uint8 bytes byte_idx in
      Bytes.set_uint8 bytes byte_idx (old lor (1 lsl bit_idx))
    end
  ) validators;
  bytes
```

This is how availability assurances pack one bit per core.

## Exercise: Encode a Work Item Summary

Given this type:

```ocaml
type work_summary = {
  service: int32;       (* 4 bytes, fixed LE *)
  code_hash: bytes;     (* 32 bytes, fixed *)
  gas_limit: int;       (* variable-length natural *)
  payload: bytes;       (* variable: length prefix + bytes *)
}
```

Write an encoder:

```ocaml
let encode_work_summary w =
  (* Your code here *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let encode_work_summary w =
  let buf = Buffer.create 64 in

  (* Fixed 4-byte service id *)
  Buffer.add_bytes buf (encode_u32_le w.service);

  (* Fixed 32-byte code hash - no length prefix *)
  Buffer.add_bytes buf w.code_hash;

  (* Variable-length natural gas limit *)
  Buffer.add_bytes buf (encode_compact w.gas_limit);

  (* Variable payload: length prefix, then bytes *)
  Buffer.add_bytes buf (encode_compact (Bytes.length w.payload));
  Buffer.add_bytes buf w.payload;

  Buffer.to_bytes buf
```

</details>

## Exercise: Decode a Sequence

Write a decoder for a variable-length sequence of 32-bit integers:

```ocaml
let decode_u32_seq bytes offset =
  (* Return (int32 array, bytes_consumed) *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let decode_u32_seq bytes offset =
  (* First, decode the natural-number length *)
  let (len, consumed) = decode_compact bytes offset in
  let offset = offset + consumed in   (* consumed, NOT new offset! *)

  (* Decode that many u32 values *)
  let result = Array.init len (fun i ->
    Bytes.get_int32_le bytes (offset + i * 4)
  ) in

  (result, consumed + len * 4)
```

</details>

## Common Pitfalls

1. **Implementing SCALE compact instead of JAM naturals** - The encodings
   differ from the very first value (`5` is `0x14` in SCALE, `0x05` in
   JAM). If your codec vectors all fail, check this first.
2. **Signed comparisons on unsigned values** - A natural of 2⁶³ or more is
   negative in an `int64`. Compare unsigned, or large values encode wrong.
3. **Consumed vs. new offset** - `decode_compact` returns bytes consumed.
   Mixing the two failed 633 lasair vectors.
4. **Length-prefixing fixed sequences** - Fixed-count sequences have no
   length prefix; the schema carries the count. (And since GP 0.8.0,
   validator sequences are *not* fixed-count.)
5. **Forgetting endianness** - Always little-endian for fixed-width fields.
6. **Missing optional prefix** - `Some` values need the `0x01` byte.

## Key Takeaways

1. **JAM has its own codec** - SCALE-inspired, but not SCALE
2. **Leading-ones prefix** - The first byte's leading 1 bits count the
   bytes that follow
3. **No schema in the bytes** - Decoder must know the structure
4. **Fixed vs. variable** - Only variable-length sequences carry a length
5. **Deterministic** - Same input always produces same output

## Next Up

With serialization understood, let's see how lasair commits to state: [Merklization →](lesson.html?lesson=02-lasair-core/04-merklization)
