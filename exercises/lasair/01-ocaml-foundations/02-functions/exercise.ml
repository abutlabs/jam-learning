(* Learning Lasair - Exercise 1.2: Functions

   Instructions:
   1. Read each TODO and implement the function
   2. Run with: dune exec ./exercise.exe
   3. All tests should pass when you're done
*)

(* ============================================
   Part 1: Basic Functions
   ============================================ *)

(* TODO: Double a number *)
let double x =
  failwith "TODO: implement double"

(* TODO: Triple a number *)
let triple x =
  failwith "TODO: implement triple"

(* TODO: Add two numbers *)
let add x y =
  failwith "TODO: implement add"

(* TODO: Apply a function twice to a value
   Example: apply_twice double 3 = double (double 3) = 12 *)
let apply_twice f x =
  failwith "TODO: implement apply_twice"

(* TODO: Apply a function n times to a value
   Example: apply_n double 3 2 = 16
   Hint: Use recursion *)
let rec apply_n f n x =
  failwith "TODO: implement apply_n"

(* ============================================
   Part 2: Higher-Order Functions
   ============================================ *)

(* TODO: Compose two functions (f after g)
   Example: compose double (add 1) 3 = double (add 1 3) = 8 *)
let compose f g x =
  failwith "TODO: implement compose"

(* TODO: Flip the arguments of a two-argument function
   Example: flip (/) 2 10 = 10 / 2 = 5 *)
let flip f x y =
  failwith "TODO: implement flip"

(* TODO: Create a function that always returns the same value
   Example: let always5 = const 5 in always5 "anything" = 5 *)
let const x =
  failwith "TODO: implement const"

(* ============================================
   Part 3: Partial Application
   ============================================ *)

(* Use partial application to create these functions.
   Don't use `fun x -> ...` or write out the parameters.
   Example: let add5 = add 5 *)

(* TODO: A function that adds 10 to its argument *)
let add10 =
  failwith "TODO: implement add10 using partial application"

(* TODO: A function that doubles then adds 1 *)
let double_then_inc =
  failwith "TODO: implement double_then_inc using compose"

(* TODO: A function that adds 1 then doubles *)
let inc_then_double =
  failwith "TODO: implement inc_then_double using compose"

(* ============================================
   Part 4: List Functions
   ============================================ *)

(* TODO: Map a function over a list
   Example: map double [1; 2; 3] = [2; 4; 6] *)
let rec map f lst =
  failwith "TODO: implement map"

(* TODO: Filter a list by a predicate
   Example: filter (fun x -> x > 2) [1; 2; 3; 4] = [3; 4] *)
let rec filter p lst =
  failwith "TODO: implement filter"

(* TODO: Fold left over a list
   Example: fold_left (+) 0 [1; 2; 3] = 6
            fold_left (-) 10 [1; 2; 3] = ((10 - 1) - 2) - 3 = 4 *)
let rec fold_left f acc lst =
  failwith "TODO: implement fold_left"

(* TODO: Sum a list using fold_left *)
let sum lst =
  failwith "TODO: implement sum using fold_left"

(* TODO: Product of a list using fold_left *)
let product lst =
  failwith "TODO: implement product using fold_left"

(* ============================================
   Part 5: Lasair-Style Functions
   ============================================ *)

(* These mirror patterns from lasair's codebase *)

(* TODO: Check if all elements satisfy a predicate
   Example: for_all (fun x -> x > 0) [1; 2; 3] = true
            for_all (fun x -> x > 0) [1; -2; 3] = false *)
let rec for_all p lst =
  failwith "TODO: implement for_all"

(* TODO: Check if any element satisfies a predicate *)
let rec exists p lst =
  failwith "TODO: implement exists"

(* TODO: Find the first element satisfying a predicate, or None *)
let rec find_opt p lst =
  failwith "TODO: implement find_opt"

(* TODO: Take the first n elements of a list
   Example: take 2 [1; 2; 3; 4] = [1; 2] *)
let rec take n lst =
  failwith "TODO: implement take"

(* TODO: Drop the first n elements of a list
   Example: drop 2 [1; 2; 3; 4] = [3; 4] *)
let rec drop n lst =
  failwith "TODO: implement drop"

(* ============================================
   Tests - Don't modify below this line
   ============================================ *)

let test name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s\n" name;
    exit 1
  end

let test_list name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected [%s], got [%s]\n" name
      (String.concat "; " (List.map string_of_int expected))
      (String.concat "; " (List.map string_of_int actual));
    exit 1
  end

let test_opt name expected actual =
  let show = function None -> "None" | Some x -> Printf.sprintf "Some %d" x in
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %s, got %s\n" name (show expected) (show actual);
    exit 1
  end

let () =
  Printf.printf "\n=== Functions Exercise ===\n\n";

  Printf.printf "Part 1: Basic Functions\n";
  test "double 5" 10 (double 5);
  test "double 0" 0 (double 0);
  test "triple 4" 12 (triple 4);
  test "add 3 4" 7 (add 3 4);
  test "apply_twice double 3" 12 (apply_twice double 3);
  test "apply_twice triple 2" 18 (apply_twice triple 2);
  test "apply_n double 3 2" 16 (apply_n double 3 2);
  test "apply_n double 0 100" 100 (apply_n double 0 100);

  Printf.printf "\nPart 2: Higher-Order Functions\n";
  test "compose double (add 1) 3" 8 (compose double (add 1) 3);
  test "compose (add 1) double 3" 7 (compose (add 1) double 3);
  test "flip (/) 2 10" 5 (flip (/) 2 10);
  test "flip (-) 3 10" 7 (flip (-) 3 10);
  test "const 5 applied to anything" 5 ((const 5) "anything");
  test "const 42 applied to 0" 42 ((const 42) 0);

  Printf.printf "\nPart 3: Partial Application\n";
  test "add10 5" 15 (add10 5);
  test "add10 0" 10 (add10 0);
  test "double_then_inc 3" 7 (double_then_inc 3);
  test "inc_then_double 3" 8 (inc_then_double 3);

  Printf.printf "\nPart 4: List Functions\n";
  test_list "map double [1; 2; 3]" [2; 4; 6] (map double [1; 2; 3]);
  test_list "map double []" [] (map double []);
  test_list "filter (> 2) [1; 2; 3; 4]" [3; 4] (filter (fun x -> x > 2) [1; 2; 3; 4]);
  test_list "filter (> 10) [1; 2; 3]" [] (filter (fun x -> x > 10) [1; 2; 3]);
  test "fold_left (+) 0 [1; 2; 3]" 6 (fold_left (+) 0 [1; 2; 3]);
  test "fold_left (-) 10 [1; 2; 3]" 4 (fold_left (-) 10 [1; 2; 3]);
  test "sum [1; 2; 3; 4; 5]" 15 (sum [1; 2; 3; 4; 5]);
  test "sum []" 0 (sum []);
  test "product [1; 2; 3; 4]" 24 (product [1; 2; 3; 4]);
  test "product []" 1 (product []);

  Printf.printf "\nPart 5: Lasair-Style Functions\n";
  test "for_all (> 0) [1; 2; 3]" true (for_all (fun x -> x > 0) [1; 2; 3]);
  test "for_all (> 0) [1; -2; 3]" false (for_all (fun x -> x > 0) [1; (-2); 3]);
  test "for_all (> 0) []" true (for_all (fun x -> x > 0) []);
  test "exists (> 2) [1; 2; 3]" true (exists (fun x -> x > 2) [1; 2; 3]);
  test "exists (> 10) [1; 2; 3]" false (exists (fun x -> x > 10) [1; 2; 3]);
  test "exists (> 0) []" false (exists (fun x -> x > 0) []);
  test_opt "find_opt (> 2) [1; 2; 3; 4]" (Some 3) (find_opt (fun x -> x > 2) [1; 2; 3; 4]);
  test_opt "find_opt (> 10) [1; 2; 3]" None (find_opt (fun x -> x > 10) [1; 2; 3]);
  test_list "take 2 [1; 2; 3; 4]" [1; 2] (take 2 [1; 2; 3; 4]);
  test_list "take 0 [1; 2; 3]" [] (take 0 [1; 2; 3]);
  test_list "take 10 [1; 2]" [1; 2] (take 10 [1; 2]);
  test_list "drop 2 [1; 2; 3; 4]" [3; 4] (drop 2 [1; 2; 3; 4]);
  test_list "drop 0 [1; 2; 3]" [1; 2; 3] (drop 0 [1; 2; 3]);
  test_list "drop 10 [1; 2]" [] (drop 10 [1; 2]);

  Printf.printf "\n=== All tests passed! ===\n"
