(* Learning Lasair - Exercise 1.3: Pattern Matching

   Instructions:
   1. Read each TODO and implement the function using pattern matching
   2. Run with: dune exec ./exercise.exe
   3. All tests should pass when you're done

   IMPORTANT: Use pattern matching (match ... with) for all solutions.
   Don't use if/then/else unless specifically required.
*)

(* ============================================
   Part 1: List Patterns
   ============================================ *)

(* TODO: Check if a list is empty *)
let is_empty lst =
  failwith "TODO: implement is_empty"

(* TODO: Get the first element, or a default value *)
let head_or_default default lst =
  failwith "TODO: implement head_or_default"

(* TODO: Get the second element, or None *)
let second lst =
  failwith "TODO: implement second"

(* TODO: Get the last element, or None
   Hint: Consider lists of length 0, 1, and more *)
let rec last lst =
  failwith "TODO: implement last"

(* TODO: Check if a list has exactly two elements *)
let is_pair lst =
  failwith "TODO: implement is_pair"

(* TODO: Check if a list has at least two elements *)
let has_two_or_more lst =
  failwith "TODO: implement has_two_or_more"

(* ============================================
   Part 2: Tuple Patterns
   ============================================ *)

(* TODO: Swap the elements of a pair *)
let swap (x, y) =
  failwith "TODO: implement swap"

(* TODO: Add corresponding elements of two pairs *)
let add_pairs (x1, y1) (x2, y2) =
  failwith "TODO: implement add_pairs"

(* TODO: Extract the first element of a nested pair ((a, b), c) *)
let first_of_nested pair =
  failwith "TODO: implement first_of_nested"

(* ============================================
   Part 3: Option Patterns
   ============================================ *)

(* TODO: Get the value from an option, or a default *)
let get_or_default default opt =
  failwith "TODO: implement get_or_default"

(* TODO: Apply a function to the value inside an option *)
let map_option f opt =
  failwith "TODO: implement map_option"

(* TODO: Flatten a nested option *)
let flatten_option opt =
  failwith "TODO: implement flatten_option"

(* TODO: Return the first Some value, or None if both are None *)
let first_some opt1 opt2 =
  failwith "TODO: implement first_some"

(* ============================================
   Part 4: Custom Types (Like in Lasair)
   ============================================ *)

(* A simple instruction type, similar to lasair's PVM instructions *)
type instruction =
  | Nop                    (* Do nothing *)
  | Push of int            (* Push a value onto the stack *)
  | Pop                    (* Remove top of stack *)
  | Add                    (* Add top two values *)
  | Jump of int            (* Jump to address *)
  | JumpIf of int          (* Jump if top of stack is non-zero *)
  | Halt                   (* Stop execution *)

(* TODO: Return true if the instruction modifies the stack *)
let modifies_stack instr =
  failwith "TODO: implement modifies_stack"

(* TODO: Return the jump target if this is a jump instruction, None otherwise *)
let jump_target instr =
  failwith "TODO: implement jump_target"

(* TODO: Return a string description of the instruction *)
let describe_instruction instr =
  failwith "TODO: implement describe_instruction"

(* ============================================
   Part 5: Guards and Complex Patterns
   ============================================ *)

(* TODO: Classify an integer as "negative", "zero", "small" (1-10),
   or "large" (> 10) using guards *)
let classify_number n =
  failwith "TODO: implement classify_number"

(* TODO: Check if a list is sorted in ascending order
   Hint: Match on lists with at least two elements *)
let rec is_sorted lst =
  failwith "TODO: implement is_sorted"

(* TODO: Zip two lists together, stopping at the shorter one
   Example: zip [1;2;3] ['a';'b'] = [(1,'a'); (2,'b')] *)
let rec zip lst1 lst2 =
  failwith "TODO: implement zip"

(* TODO: Unzip a list of pairs into two lists
   Example: unzip [(1,'a'); (2,'b')] = ([1;2], ['a';'b']) *)
let rec unzip lst =
  failwith "TODO: implement unzip"

(* ============================================
   Part 6: Expression Evaluation (Lasair-style)
   ============================================ *)

(* A simple expression type *)
type expr =
  | Const of int
  | Add of expr * expr
  | Mul of expr * expr
  | Sub of expr * expr
  | Neg of expr

(* TODO: Evaluate an expression to an integer *)
let rec eval expr =
  failwith "TODO: implement eval"

(* TODO: Count the number of operations in an expression
   Constants have 0 operations, each Add/Mul/Sub/Neg counts as 1 *)
let rec count_ops expr =
  failwith "TODO: implement count_ops"

(* TODO: Simplify an expression by evaluating constant sub-expressions
   Example: Add (Const 1, Const 2) -> Const 3
            Add (Const 1, Mul (Const 2, Const 3)) -> Const 7
   This is similar to constant folding in compilers *)
let rec simplify expr =
  failwith "TODO: implement simplify"

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

let test_opt name expected actual =
  let show = function None -> "None" | Some x -> Printf.sprintf "Some %d" x in
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %s, got %s\n" name (show expected) (show actual);
    exit 1
  end

let test_string name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s: expected %s, got %s\n" name expected actual;
    exit 1
  end

let test_pair name expected actual =
  if expected = actual then
    Printf.printf "✓ %s\n" name
  else begin
    Printf.printf "✗ %s\n" name;
    exit 1
  end

let () =
  Printf.printf "\n=== Pattern Matching Exercise ===\n\n";

  Printf.printf "Part 1: List Patterns\n";
  test "is_empty []" true (is_empty []);
  test "is_empty [1]" false (is_empty [1]);
  test "head_or_default 0 []" 0 (head_or_default 0 []);
  test "head_or_default 0 [5;6;7]" 5 (head_or_default 0 [5; 6; 7]);
  test_opt "second []" None (second []);
  test_opt "second [1]" None (second [1]);
  test_opt "second [1;2;3]" (Some 2) (second [1; 2; 3]);
  test_opt "last []" None (last []);
  test_opt "last [1]" (Some 1) (last [1]);
  test_opt "last [1;2;3]" (Some 3) (last [1; 2; 3]);
  test "is_pair []" false (is_pair []);
  test "is_pair [1]" false (is_pair [1]);
  test "is_pair [1;2]" true (is_pair [1; 2]);
  test "is_pair [1;2;3]" false (is_pair [1; 2; 3]);
  test "has_two_or_more []" false (has_two_or_more []);
  test "has_two_or_more [1]" false (has_two_or_more [1]);
  test "has_two_or_more [1;2]" true (has_two_or_more [1; 2]);
  test "has_two_or_more [1;2;3;4]" true (has_two_or_more [1; 2; 3; 4]);

  Printf.printf "\nPart 2: Tuple Patterns\n";
  test_pair "swap (1, 2)" (2, 1) (swap (1, 2));
  test_pair "add_pairs (1,2) (3,4)" (4, 6) (add_pairs (1, 2) (3, 4));
  test "first_of_nested ((1,2),3)" 1 (first_of_nested ((1, 2), 3));

  Printf.printf "\nPart 3: Option Patterns\n";
  test "get_or_default 0 None" 0 (get_or_default 0 None);
  test "get_or_default 0 (Some 5)" 5 (get_or_default 0 (Some 5));
  test_opt "map_option double None" None (map_option (fun x -> x * 2) None);
  test_opt "map_option double (Some 5)" (Some 10) (map_option (fun x -> x * 2) (Some 5));
  test_opt "flatten_option None" None (flatten_option None);
  test_opt "flatten_option (Some None)" None (flatten_option (Some None));
  test_opt "flatten_option (Some (Some 5))" (Some 5) (flatten_option (Some (Some 5)));
  test_opt "first_some None None" None (first_some None None);
  test_opt "first_some (Some 1) None" (Some 1) (first_some (Some 1) None);
  test_opt "first_some None (Some 2)" (Some 2) (first_some None (Some 2));
  test_opt "first_some (Some 1) (Some 2)" (Some 1) (first_some (Some 1) (Some 2));

  Printf.printf "\nPart 4: Custom Types\n";
  test "modifies_stack Nop" false (modifies_stack Nop);
  test "modifies_stack (Push 5)" true (modifies_stack (Push 5));
  test "modifies_stack Pop" true (modifies_stack Pop);
  test "modifies_stack Add" true (modifies_stack Add);
  test "modifies_stack (Jump 10)" false (modifies_stack (Jump 10));
  test "modifies_stack Halt" false (modifies_stack Halt);
  test_opt "jump_target Nop" None (jump_target Nop);
  test_opt "jump_target (Jump 10)" (Some 10) (jump_target (Jump 10));
  test_opt "jump_target (JumpIf 20)" (Some 20) (jump_target (JumpIf 20));
  test_string "describe Nop" "nop" (describe_instruction Nop);
  test_string "describe (Push 5)" "push 5" (describe_instruction (Push 5));
  test_string "describe Halt" "halt" (describe_instruction Halt);

  Printf.printf "\nPart 5: Guards and Complex Patterns\n";
  test_string "classify -5" "negative" (classify_number (-5));
  test_string "classify 0" "zero" (classify_number 0);
  test_string "classify 5" "small" (classify_number 5);
  test_string "classify 100" "large" (classify_number 100);
  test "is_sorted []" true (is_sorted []);
  test "is_sorted [1]" true (is_sorted [1]);
  test "is_sorted [1;2;3]" true (is_sorted [1; 2; 3]);
  test "is_sorted [1;3;2]" false (is_sorted [1; 3; 2]);
  test "is_sorted [1;1;2]" true (is_sorted [1; 1; 2]);
  test_pair "zip [1;2;3] ['a';'b']" [(1,'a'); (2,'b')] (zip [1;2;3] ['a';'b']);
  test_pair "zip [] ['a']" [] (zip [] ['a']);
  let (l1, l2) = unzip [(1,'a'); (2,'b'); (3,'c')] in
  test_pair "unzip fst" [1;2;3] l1;
  test_pair "unzip snd" ['a';'b';'c'] l2;

  Printf.printf "\nPart 6: Expression Evaluation\n";
  test "eval (Const 5)" 5 (eval (Const 5));
  test "eval (Add (Const 2, Const 3))" 5 (eval (Add (Const 2, Const 3)));
  test "eval (Mul (Const 2, Const 3))" 6 (eval (Mul (Const 2, Const 3)));
  test "eval (Sub (Const 5, Const 3))" 2 (eval (Sub (Const 5, Const 3)));
  test "eval (Neg (Const 5))" (-5) (eval (Neg (Const 5)));
  test "eval complex" 14 (eval (Add (Mul (Const 2, Const 3), Mul (Const 2, Const 4))));
  test "count_ops (Const 5)" 0 (count_ops (Const 5));
  test "count_ops (Add (Const 1, Const 2))" 1 (count_ops (Add (Const 1, Const 2)));
  test "count_ops (Add (Mul (Const 1, Const 2), Const 3))" 2
    (count_ops (Add (Mul (Const 1, Const 2), Const 3)));
  test "simplify (Const 5)" (Const 5) (simplify (Const 5));
  test "simplify (Add (Const 1, Const 2))" (Const 3) (simplify (Add (Const 1, Const 2)));
  test "simplify (Mul (Const 2, Add (Const 1, Const 3)))" (Const 8)
    (simplify (Mul (Const 2, Add (Const 1, Const 3))));

  Printf.printf "\n=== All tests passed! ===\n"
