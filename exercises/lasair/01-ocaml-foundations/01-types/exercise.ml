(* Learning Lasair - Exercise 1.1: Types and Values

   Instructions:
   1. Read each TODO and implement the function
   2. Run with: dune exec ./exercise.exe
   3. All tests should pass when you're done
*)

(* ============================================
   Part 1: Basic Arithmetic
   ============================================ *)

(* TODO: Implement a function that calculates the area of a rectangle *)
let rectangle_area width height =
  failwith "TODO: implement rectangle_area"

(* TODO: Implement a function that calculates the hypotenuse of a right triangle
   Hint: Use sqrt and remember that float operations use +. *. etc. *)
let hypotenuse a b =
  failwith "TODO: implement hypotenuse"

(* TODO: Implement integer division that returns (quotient, remainder) *)
let divrem a b =
  failwith "TODO: implement divrem"

(* ============================================
   Part 2: JAM Protocol Constants

   These mirror the constants in lasair's definitions.ml
   ============================================ *)

let c_validator_count = 1023
let c_epoch_length = 600
let c_core_count = 341
let c_seconds_per_slot = 6

(* TODO: Calculate which epoch a given slot belongs to *)
let epoch_of_slot slot =
  failwith "TODO: implement epoch_of_slot"

(* TODO: Calculate the first slot of a given epoch *)
let first_slot_of_epoch epoch =
  failwith "TODO: implement first_slot_of_epoch"

(* TODO: Check if a slot is an epoch boundary (first slot of an epoch) *)
let is_epoch_boundary slot =
  failwith "TODO: implement is_epoch_boundary"

(* TODO: Calculate how many epochs fit in a given number of seconds *)
let epochs_in_seconds seconds =
  failwith "TODO: implement epochs_in_seconds"

(* ============================================
   Part 3: Conditional Logic
   ============================================ *)

(* TODO: Return the absolute value of an integer *)
let abs_value n =
  failwith "TODO: implement abs_value"

(* TODO: Clamp a value between min and max bounds *)
let clamp ~min ~max value =
  failwith "TODO: implement clamp"

(* TODO: Return "positive", "negative", or "zero" *)
let sign_string n =
  failwith "TODO: implement sign_string"

(* ============================================
   Tests - Don't modify below this line
   ============================================ *)

let test name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %s, got %s\n" name
      (Obj.magic expected |> string_of_int)
      (Obj.magic actual |> string_of_int);
    exit 1
  end

let test_float name expected actual =
  if abs_float (expected -. actual) < 0.0001 then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %f, got %f\n" name expected actual;
    exit 1
  end

let test_bool name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %b, got %b\n" name expected actual;
    exit 1
  end

let test_string name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %s, got %s\n" name expected actual;
    exit 1
  end

let test_pair name (exp_a, exp_b) (act_a, act_b) =
  if exp_a = act_a && exp_b = act_b then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected (%d, %d), got (%d, %d)\n"
      name exp_a exp_b act_a act_b;
    exit 1
  end

let () =
  Printf.printf "\n=== Types and Values Exercise ===\n\n";

  Printf.printf "Part 1: Basic Arithmetic\n";
  test "rectangle_area 3 4" 12 (rectangle_area 3 4);
  test "rectangle_area 5 5" 25 (rectangle_area 5 5);
  test_float "hypotenuse 3.0 4.0" 5.0 (hypotenuse 3.0 4.0);
  test_float "hypotenuse 5.0 12.0" 13.0 (hypotenuse 5.0 12.0);
  test_pair "divrem 17 5" (3, 2) (divrem 17 5);
  test_pair "divrem 100 7" (14, 2) (divrem 100 7);

  Printf.printf "\nPart 2: JAM Protocol Constants\n";
  test "epoch_of_slot 0" 0 (epoch_of_slot 0);
  test "epoch_of_slot 599" 0 (epoch_of_slot 599);
  test "epoch_of_slot 600" 1 (epoch_of_slot 600);
  test "epoch_of_slot 1800" 3 (epoch_of_slot 1800);
  test "first_slot_of_epoch 0" 0 (first_slot_of_epoch 0);
  test "first_slot_of_epoch 1" 600 (first_slot_of_epoch 1);
  test "first_slot_of_epoch 5" 3000 (first_slot_of_epoch 5);
  test_bool "is_epoch_boundary 0" true (is_epoch_boundary 0);
  test_bool "is_epoch_boundary 600" true (is_epoch_boundary 600);
  test_bool "is_epoch_boundary 599" false (is_epoch_boundary 599);
  test_bool "is_epoch_boundary 601" false (is_epoch_boundary 601);
  test "epochs_in_seconds 3600" 1 (epochs_in_seconds 3600);
  test "epochs_in_seconds 86400" 24 (epochs_in_seconds 86400);

  Printf.printf "\nPart 3: Conditional Logic\n";
  test "abs_value 5" 5 (abs_value 5);
  test "abs_value (-5)" 5 (abs_value (-5));
  test "abs_value 0" 0 (abs_value 0);
  test "clamp 5 ~min:0 ~max:10" 5 (clamp ~min:0 ~max:10 5);
  test "clamp (-5) ~min:0 ~max:10" 0 (clamp ~min:0 ~max:10 (-5));
  test "clamp 15 ~min:0 ~max:10" 10 (clamp ~min:0 ~max:10 15);
  test_string "sign_string 5" "positive" (sign_string 5);
  test_string "sign_string (-5)" "negative" (sign_string (-5));
  test_string "sign_string 0" "zero" (sign_string 0);

  Printf.printf "\n=== All tests passed! ===\n"
