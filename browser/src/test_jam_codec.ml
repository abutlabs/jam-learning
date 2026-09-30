(* Cross-check jam_codec against known JAM codec vectors and
   round-trip identity. Mirrors lasair test/serialization_test.ml.

   Run: dune exec --root . ./test_jam_codec.exe *)

open Learning_lasair.Jam_codec

let failures = ref 0

let check name cond =
  if not cond then begin
    incr failures;
    Printf.printf "FAIL: %s\n" name
  end

let check_hex name v expected =
  let got = hex_of_bytes (encode_compact v) in
  check (Printf.sprintf "%s: expected %s got %s" name expected got)
    (got = expected)

let () =
  (* Known encodings (gold values from lasair test suite + GP appendix) *)
  check_hex "compact 0" 0 "00";
  check_hex "compact 1" 1 "01";
  check_hex "compact 42" 42 "2a";
  check_hex "compact 127" 127 "7f";
  check_hex "compact 128" 128 "8080";
  check_hex "compact 1000" 1000 "83e8";
  check_hex "compact 16383" 16383 "bfff";
  check_hex "compact 16384" 16384 "c00040";
  check_hex "compact 100000" 100000 "c1a086";
  (* Byte-length boundaries *)
  check "0 is 1 byte" (Bytes.length (encode_compact 0) = 1);
  check "127 is 1 byte" (Bytes.length (encode_compact 127) = 1);
  check "128 is 2 bytes" (Bytes.length (encode_compact 128) = 2);
  check "2^14 is 3 bytes" (Bytes.length (encode_compact 16384) = 3);
  check "2^21 is 4 bytes" (Bytes.length (encode_compact (1 lsl 21)) = 4);
  check "2^56 is 9 bytes" (Bytes.length (encode_compact (1 lsl 56)) = 9);
  (* Round-trip across all boundaries and a dense sweep *)
  let roundtrip v =
    let enc = encode_compact v in
    let (dec, consumed) = decode_compact enc 0 in
    dec = v && consumed = Bytes.length enc
  in
  List.iter (fun v ->
    check (Printf.sprintf "roundtrip %d" v) (roundtrip v))
    [0; 1; 127; 128; 255; 256; 16383; 16384; 0x1FFFFF; 0x200000;
     1 lsl 28; (1 lsl 35) + 12345; (1 lsl 42) + 999; (1 lsl 49) + 7;
     (1 lsl 56) - 1; 1 lsl 56; (1 lsl 60) + 123456789];
  for v = 0 to 200_000 do
    if not (roundtrip v) then check (Printf.sprintf "sweep %d" v) false
  done;
  (* Sequence encoding: length prefix is the natural encoding *)
  check "seq [1;2;3]"
    (hex_of_bytes (encode_sequence encode_u8 [|1; 2; 3|]) = "03010203");
  if !failures = 0 then print_endline "jam_codec: ALL CHECKS PASS"
  else (Printf.printf "jam_codec: %d FAILURES\n" !failures; exit 1)
