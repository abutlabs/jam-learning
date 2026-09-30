(* JAM Codec Implementation

   JAM defines its own serialization codec in the Graypaper's
   serialization appendix. It shares principles with Polkadot's SCALE
   (little-endian, schema-less, deterministic) but is NOT SCALE: the
   variable-length natural-number encoding is different. Implementing
   SCALE's compact encoding fails every JAM codec test vector.

   Key properties:
   - Little-endian byte order
   - Variable-length natural-number encoding (leading-ones prefix byte)
   - No field names or type tags (schema-dependent)
   - Deterministic (same input always produces same output)

   In lasair, this lives in lib/serialization.ml
*)

(* ============================================
   Fixed-Width Integer Encoding

   These encode integers with a fixed number of bytes,
   always in little-endian order.
   ============================================ *)

(** Encode a byte (0-255) as a single byte. *)
let encode_u8 (n : int) : bytes =
  let b = Bytes.create 1 in
  Bytes.set_uint8 b 0 n;
  b

(** Decode a byte from position 0. *)
let decode_u8 (b : bytes) : int =
  Bytes.get_uint8 b 0

(** Encode a 16-bit unsigned integer (little-endian). *)
let encode_u16 (n : int) : bytes =
  let b = Bytes.create 2 in
  Bytes.set_uint16_le b 0 n;
  b

(** Decode a 16-bit unsigned integer. *)
let decode_u16 (b : bytes) : int =
  Bytes.get_uint16_le b 0

(** Encode a 32-bit unsigned integer (little-endian). *)
let encode_u32 (n : int32) : bytes =
  let b = Bytes.create 4 in
  Bytes.set_int32_le b 0 n;
  b

(** Decode a 32-bit unsigned integer. *)
let decode_u32 (b : bytes) : int32 =
  Bytes.get_int32_le b 0

(** Encode a 64-bit unsigned integer (little-endian). *)
let encode_u64 (n : int64) : bytes =
  let b = Bytes.create 8 in
  Bytes.set_int64_le b 0 n;
  b

(** Decode a 64-bit unsigned integer. *)
let decode_u64 (b : bytes) : int64 =
  Bytes.get_int64_le b 0

(* ============================================
   Variable-Length Natural-Number Encoding

   The JAM codec encodes a natural number v in 1-9 bytes.
   The number of leading 1 bits in the first byte tells the
   decoder how many additional bytes follow:

   - v < 2^7:            1 byte   (the value itself, high bit 0)
   - 2^7  <= v < 2^14:   2 bytes  (prefix 10xxxxxx + 1 byte LE)
   - 2^14 <= v < 2^21:   3 bytes  (prefix 110xxxxx + 2 bytes LE)
   - ...one more byte per 7 bits of magnitude...
   - v >= 2^56:          9 bytes  (prefix 0xFF + 8 bytes LE)

   For l additional bytes, the prefix byte is
   (256 - 2^(8-l)) + floor(v / 2^(8l)) and the low 8l bits of v
   follow in little-endian order.

   This is NOT SCALE's compact encoding (low-2-bit mode tags).
   ============================================ *)

(** Encode a natural number using the JAM variable-length encoding.
    Returns bytes of variable length (1-9 bytes). *)
let encode_compact (v : int) : bytes =
  if v < 0 then
    failwith "encode_compact: negative numbers not supported"
  else if v = 0 then
    Bytes.make 1 '\x00'
  else if v < 0x80 then
    (* Single byte: the value itself *)
    encode_u8 v
  else begin
    (* Find l such that 2^(7l) <= v < 2^(7(l+1)) *)
    let rec find_l l =
      if l >= 8 then 8
      else if v < 1 lsl (7 * (l + 1)) then l
      else find_l (l + 1)
    in
    let l = find_l 1 in
    if l >= 8 then begin
      (* 9 bytes: 0xFF prefix + 8 bytes little-endian *)
      let result = Bytes.create 9 in
      Bytes.set result 0 '\xff';
      Bytes.set_int64_le result 1 (Int64.of_int v);
      result
    end else begin
      (* Prefix: (256 - 2^(8-l)) + floor(v / 2^(8l)), then l bytes LE *)
      let prefix = (0xFF land (0xFF lsl (8 - l))) lor (v lsr (8 * l)) in
      let result = Bytes.create (l + 1) in
      Bytes.set_uint8 result 0 prefix;
      let rec fill i x =
        if i <= l then begin
          Bytes.set_uint8 result i (x land 0xFF);
          fill (i + 1) (x lsr 8)
        end
      in
      fill 1 v;
      result
    end
  end

(** Decode a JAM variable-length natural number.
    Returns (value, bytes_consumed) — consumed, not the new offset!
    Confusing the two failed 633 conformance vectors in lasair. *)
let decode_compact (b : bytes) (offset : int) : int * int =
  let first = Bytes.get_uint8 b offset in
  if first = 0 then (0, 1)
  else if first < 0x80 then (first, 1)
  else if first = 0xFF then
    (Int64.to_int (Bytes.get_int64_le b (offset + 1)), 9)
  else begin
    (* Count leading 1 bits to learn how many bytes follow *)
    let rec leading_ones count =
      if count >= 8 then count
      else if first land (0x80 lsr count) <> 0 then leading_ones (count + 1)
      else count
    in
    let l = leading_ones 0 in
    let high = first land ((1 lsl (8 - l)) - 1) in
    let rec read_low i acc =
      if i > l then acc
      else read_low (i + 1) (acc lor (Bytes.get_uint8 b (offset + i) lsl (8 * (i - 1))))
    in
    let low = read_low 1 0 in
    ((high lsl (8 * l)) lor low, l + 1)
  end

(* ============================================
   Boolean Encoding

   Simple: false = 0x00, true = 0x01
   ============================================ *)

let encode_bool (b : bool) : bytes =
  encode_u8 (if b then 1 else 0)

let decode_bool (b : bytes) : bool =
  decode_u8 b <> 0

(* ============================================
   Optional (Option) Encoding

   None  = 0x00
   Some x = 0x01 ++ encode(x)
   ============================================ *)

let encode_option (encode_inner : 'a -> bytes) (opt : 'a option) : bytes =
  match opt with
  | None -> encode_u8 0
  | Some x ->
      let inner = encode_inner x in
      let result = Bytes.create (1 + Bytes.length inner) in
      Bytes.set_uint8 result 0 1;
      Bytes.blit inner 0 result 1 (Bytes.length inner);
      result

(* ============================================
   Sequence (Array/List) Encoding

   Variable-length sequences: natural-number length prefix,
   then concatenated elements. Fixed-length sequences (where the
   schema fixes the count) have NO length prefix.
   ============================================ *)

let encode_sequence (encode_elem : 'a -> bytes) (seq : 'a array) : bytes =
  let len_bytes = encode_compact (Array.length seq) in
  let elems = Array.map encode_elem seq in
  let total_len =
    Bytes.length len_bytes +
    Array.fold_left (fun acc b -> acc + Bytes.length b) 0 elems
  in
  let result = Bytes.create total_len in
  Bytes.blit len_bytes 0 result 0 (Bytes.length len_bytes);
  let offset = ref (Bytes.length len_bytes) in
  Array.iter (fun elem ->
    Bytes.blit elem 0 result !offset (Bytes.length elem);
    offset := !offset + Bytes.length elem
  ) elems;
  result

(* ============================================
   Utility: Bytes to Hex String
   ============================================ *)

let hex_of_bytes (b : bytes) : string =
  let hex_char n =
    if n < 10 then Char.chr (n + Char.code '0')
    else Char.chr (n - 10 + Char.code 'a')
  in
  let len = Bytes.length b in
  let s = Bytes.create (len * 2) in
  for i = 0 to len - 1 do
    let byte = Bytes.get_uint8 b i in
    Bytes.set s (i * 2) (hex_char (byte lsr 4));
    Bytes.set s (i * 2 + 1) (hex_char (byte land 0x0f))
  done;
  Bytes.to_string s

let bytes_of_hex (s : string) : bytes =
  let hex_val c =
    match c with
    | '0'..'9' -> Char.code c - Char.code '0'
    | 'a'..'f' -> Char.code c - Char.code 'a' + 10
    | 'A'..'F' -> Char.code c - Char.code 'A' + 10
    | _ -> failwith "Invalid hex character"
  in
  let len = String.length s / 2 in
  let b = Bytes.create len in
  for i = 0 to len - 1 do
    let hi = hex_val s.[i * 2] in
    let lo = hex_val s.[i * 2 + 1] in
    Bytes.set_uint8 b i ((hi lsl 4) lor lo)
  done;
  b

(* ============================================
   Interactive Examples

   Try these in the REPL:

   > encode_compact 42 |> hex_of_bytes;;
   (* "2a" - values < 128 are themselves *)

   > encode_compact 1000 |> hex_of_bytes;;
   (* "83e8" - prefix 0x83 carries the high bits, then 0xe8 *)

   > encode_compact 100000 |> hex_of_bytes;;
   (* "c1a086" - two leading 1s = two bytes follow *)

   > encode_u32 0x12345678l |> hex_of_bytes;;
   (* "78563412" - little endian! *)

   > encode_sequence encode_u8 [|1; 2; 3|] |> hex_of_bytes;;
   (* "03010203" - length 3, then 1, 2, 3 *)
   ============================================ *)
