(* Learning Lasair Browser Toplevel

   This creates an OCaml REPL that runs in the browser.
*)

open Js_of_ocaml

(* Buffer to capture output *)
let output_buffer = Buffer.create 1024

let output_formatter =
  let out s pos len = Buffer.add_substring output_buffer s pos len in
  let flush () = () in
  Format.make_formatter out flush

(* Initialize the toplevel *)
let () =
  Js_of_ocaml_toplevel.JsooTop.initialize ()

(* Export evaluation function to JavaScript *)
let () =
  Js.export "LasairRepl" (object%js
    method eval code =
      Buffer.clear output_buffer;
      let code_str = Js.to_string code in
      (* execute prints results, use doesn't - we want printed output *)
      Js_of_ocaml_toplevel.JsooTop.execute true output_formatter code_str;
      Format.pp_print_flush output_formatter ();
      let output = Buffer.contents output_buffer in
      Js.string output

    method setup =
      Buffer.clear output_buffer;
      let setup = {|
(* JAM Protocol Constants *)
let c_core_count = 341
let c_validator_count = 1023
let c_epoch_length = 600
let c_seconds_per_slot = 6

let epoch_of_slot slot = slot / c_epoch_length
let is_epoch_boundary slot = slot mod c_epoch_length = 0
let first_slot_of_epoch epoch = epoch * c_epoch_length

(* JAM codec helpers (Graypaper serialization appendix; lib/serialization.ml) *)
let hex_of_bytes b =
  let hex n = if n < 10 then Char.chr (n + 48) else Char.chr (n + 87) in
  String.init (Bytes.length b * 2) (fun i ->
    let byte = Bytes.get_uint8 b (i / 2) in
    if i mod 2 = 0 then hex (byte lsr 4) else hex (byte land 0xf))

let encode_u32_le n =
  let b = Bytes.create 4 in
  Bytes.set_int32_le b 0 n; b

(* Variable-length natural-number encoding. NOT SCALE compact:
   leading 1 bits in the prefix byte = number of bytes that follow. *)
let encode_compact v =
  if v < 0 then invalid_arg "encode_compact"
  else if v = 0 then Bytes.make 1 '\x00'
  else if v < 0x80 then
    let b = Bytes.create 1 in
    Bytes.set_uint8 b 0 v; b
  else begin
    let rec find_l l =
      if l >= 8 then 8
      else if v < 1 lsl (7 * (l + 1)) then l
      else find_l (l + 1)
    in
    let l = find_l 1 in
    if l >= 8 then begin
      let b = Bytes.create 9 in
      Bytes.set b 0 '\xff';
      Bytes.set_int64_le b 1 (Int64.of_int v); b
    end else begin
      let b = Bytes.create (l + 1) in
      Bytes.set_uint8 b 0 ((0xFF land (0xFF lsl (8 - l))) lor (v lsr (8 * l)));
      let rec fill i x =
        if i <= l then begin
          Bytes.set_uint8 b i (x land 0xFF);
          fill (i + 1) (x lsr 8)
        end
      in
      fill 1 v; b
    end
  end

(* Decode: returns (value, bytes_CONSUMED) - not the new offset! *)
let decode_compact b offset =
  let first = Bytes.get_uint8 b offset in
  if first = 0 then (0, 1)
  else if first < 0x80 then (first, 1)
  else if first = 0xFF then
    (Int64.to_int (Bytes.get_int64_le b (offset + 1)), 9)
  else begin
    let rec leading_ones c =
      if c >= 8 then c
      else if first land (0x80 lsr c) <> 0 then leading_ones (c + 1)
      else c
    in
    let l = leading_ones 0 in
    let high = first land ((1 lsl (8 - l)) - 1) in
    let rec read_low i acc =
      if i > l then acc
      else read_low (i + 1) (acc lor (Bytes.get_uint8 b (offset + i) lsl (8 * (i - 1))))
    in
    ((high lsl (8 * l)) lor read_low 1 0, l + 1)
  end

let _ = print_endline "Learning Lasair REPL ready!"
let _ = print_endline "Try: epoch_of_slot 1234;;"
;;
      |} in
      Js_of_ocaml_toplevel.JsooTop.execute true output_formatter setup;
      Format.pp_print_flush output_formatter ();
      let output = Buffer.contents output_buffer in
      Js.string output
  end)
