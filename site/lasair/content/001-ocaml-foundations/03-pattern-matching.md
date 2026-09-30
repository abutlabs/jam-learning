---
title: Pattern Matching
duration: 25 min
---

# Pattern Matching

Pattern matching is OCaml's most powerful feature. It lets you deconstruct data structures, handle multiple cases, and the compiler guarantees you've covered every possibility.

## The Match Expression

Basic syntax:

```ocaml
let describe_number n =
  match n with
  | 0 -> "zero"
  | 1 -> "one"
  | 2 -> "two"
  | _ -> "many"

let result = describe_number 1  (* "one" *)
```

The `|` separates cases (patterns). The `_` is a wildcard that matches anything.

## Matching on Types

You can match on any type:

```ocaml
(* Booleans *)
let to_string b =
  match b with
  | true -> "yes"
  | false -> "no"

(* Characters *)
let is_vowel c =
  match c with
  | 'a' | 'e' | 'i' | 'o' | 'u' -> true
  | _ -> false

(* Strings - but be careful, strings aren't exhaustive *)
let greet name =
  match name with
  | "Alice" -> "Hello, friend!"
  | "Bob" -> "Hey Bob!"
  | _ -> "Hello, stranger."
```

## Destructuring Tuples

Pattern matching can pull apart compound values:

```ocaml
let sum_pair pair =
  match pair with
  | (x, y) -> x + y

(* Or directly in the function definition *)
let sum_pair (x, y) = x + y

(* Nested tuples *)
let first_of_nested ((a, _), _) = a
```

## In Lasair: Coordinate Handling

From `lib/utilities.ml`:

```ocaml
(* Integer division returning quotient and remainder *)
let divrem a b =
  (a / b, a mod b)

(* Using destructuring *)
let process_division a b =
  let (quot, rem) = divrem a b in
  Printf.sprintf "%d = %d * %d + %d" a quot b rem
```

## Matching Lists

Lists have two patterns: empty `[]` and cons `x :: xs`:

```ocaml
let is_empty lst =
  match lst with
  | [] -> true
  | _ -> false

let head_or_default default lst =
  match lst with
  | [] -> default
  | x :: _ -> x

let rec length lst =
  match lst with
  | [] -> 0
  | _ :: xs -> 1 + length xs

let rec sum lst =
  match lst with
  | [] -> 0
  | x :: xs -> x + sum xs
```

## Exhaustiveness Checking

The compiler verifies you've handled all cases:

```ocaml
let incomplete n =
  match n with
  | 0 -> "zero"
  | 1 -> "one"
  (* Warning: this pattern-matching is not exhaustive.
     Here is an example of a value that is not matched: 2 *)
```

This is incredibly valuable. When you add a new case to a type, the compiler tells you every place that needs updating.

## In Lasair: Exit Reasons

From `lib/pvm.ml`:

```ocaml
type exit_reason =
  | Halt
  | Panic
  | OutOfGas
  | PageFault of int
  | HostCall of int

let describe_exit reason =
  match reason with
  | Halt -> "Program completed normally"
  | Panic -> "Program panicked"
  | OutOfGas -> "Ran out of gas"
  | PageFault addr -> Printf.sprintf "Page fault at %d" addr
  | HostCall num -> Printf.sprintf "Host call %d" num
```

Every exit reason is handled. If we add a new one, the compiler tells us everywhere we need to update.

## Guards (When Clauses)

Add conditions to patterns with `when`:

```ocaml
let classify_age age =
  match age with
  | n when n < 0 -> "invalid"
  | n when n < 13 -> "child"
  | n when n < 20 -> "teenager"
  | n when n < 65 -> "adult"
  | _ -> "senior"

let sign n =
  match n with
  | 0 -> "zero"
  | n when n > 0 -> "positive"
  | _ -> "negative"
```

**Warning**: Guards break exhaustiveness checking. The compiler can't verify that your guards cover all cases.

## Binding in Patterns

Use `as` to bind while matching:

```ocaml
let first_two lst =
  match lst with
  | [] -> None
  | [x] -> Some (x, x)
  | (x :: y :: _) as full_list ->
      Printf.printf "List has %d elements\n" (List.length full_list);
      Some (x, y)
```

## In Lasair: Instruction Decoding

From `lib/pvm_decode.ml` (simplified):

```ocaml
type instruction =
  | Trap                                        (* 0 *)
  | Fallthrough                                 (* 1 *)
  | Unlikely                                    (* 2 - GP 0.8.0: branch hint *)
  | Ecalli of { imm: int64 }                    (* 10 *)
  | Move_reg of { rd: int; ra: int }            (* 100 *)
  | Count_set_bits_64 of { rd: int; ra: int }   (* 101 *)
  | Add_32 of { rd: int; ra: int; rb: int }     (* 190 *)
  | Add_64 of { rd: int; ra: int; rb: int }     (* 200 *)
  (* ... many more *)
  | Invalid of int

let decode (code : bytes) (pc : int) (skip : int) : instruction =
  let opcode = get_byte code pc 0 in
  let l = skip in
  match opcode with
  | 0 -> Trap
  | 1 -> Fallthrough
  | 2 -> Unlikely
  | 10 ->
    let l_x = min 4 l in
    let imm = sign_extend l_x (decode_le code pc 1 l_x) in
    Ecalli { imm }
  (* ... one case per opcode or opcode group, 90+ in all *)
  | _ -> Invalid opcode
```

Graypaper v0.8.0 changed this table: it removed the `sbrk` instruction (formerly opcode 101; a program now grows its heap with the `grow_heap` host call), which moved `count_set_bits_64` and the rest of the two-register group down by one, and it added `unlikely` (opcode 2).

This is pattern matching at scale—every RISC-V instruction has its own case.

## Or-Patterns

Match multiple patterns with the same result:

```ocaml
let is_weekend day =
  match day with
  | "Saturday" | "Sunday" -> true
  | _ -> false

let is_whitespace c =
  match c with
  | ' ' | '\t' | '\n' | '\r' -> true
  | _ -> false
```

## Nested Patterns

Patterns can be arbitrarily nested:

```ocaml
(* Match a list with exactly two equal elements *)
let is_pair_of_same lst =
  match lst with
  | [x; y] when x = y -> true
  | _ -> false

(* Match nested options *)
let flatten_option opt =
  match opt with
  | Some (Some x) -> Some x
  | _ -> None

(* Match specific structures *)
let starts_with_zero_pair lst =
  match lst with
  | (0, _) :: _ -> true
  | _ -> false
```

## In Lasair: State Matching

From `conformance/disputes_stf.ml`, classifying a dispute verdict by its number of "valid" judgments (Graypaper v0.8.0, section 10.2; `k` is the judging validator set):

```ocaml
let classify_verdict (k : validator_key list) (judgements : judgement_vote list) : verdict_result =
  let valid_count = List.length (List.filter (fun j -> j.is_valid) judgements) in
  if valid_count = verdict_threshold_for k then VerdictGood
  else if valid_count = 0 then VerdictBad
  else if valid_count = wonky_tally_for k then VerdictWonky
  else VerdictBadSplit
```

The same logic as a match with guards:

```ocaml
  match valid_count with
  | n when n = verdict_threshold_for k -> VerdictGood   (* ⌊2|k|/3⌋ + 1 *)
  | 0 -> VerdictBad
  | n when n = wonky_tally_for k -> VerdictWonky        (* ⌊|k|/3⌋ *)
  | _ -> VerdictBadSplit                                (* any other tally: invalid block *)
```

Guards implement the threshold logic; note that the Graypaper wants *exact* tallies here, not "at least two-thirds".

## Function Parameter Matching

You can pattern match directly in function parameters:

```ocaml
(* Instead of this: *)
let fst pair = match pair with (x, _) -> x

(* Write this: *)
let fst (x, _) = x

(* Works with multiple parameters *)
let add_pairs (x1, y1) (x2, y2) = (x1 + x2, y1 + y2)

(* And with function keyword for multi-case *)
let rec length = function
  | [] -> 0
  | _ :: xs -> 1 + length xs
```

The `function` keyword creates a function that immediately matches on its last argument.

## Exception Patterns

You can also pattern match on exceptions:

```ocaml
let safe_divide a b =
  match b with
  | 0 -> None
  | _ -> Some (a / b)

(* Or catch exceptions *)
let safe_divide a b =
  try Some (a / b)
  with Division_by_zero -> None
```

## Exercise: Complete the Patterns

Fill in the patterns:

```ocaml
(* 1. Get the second element of a list, or None *)
let second lst =
  match lst with
  | (* pattern *) -> Some x
  | _ -> None

(* 2. Check if a list is sorted (ascending) *)
let rec is_sorted lst =
  match lst with
  | (* pattern for 0 or 1 element *) -> true
  | (* pattern for at least 2 elements *) -> (* recursive check *)

(* 3. Zip two lists together *)
let rec zip lst1 lst2 =
  match (lst1, lst2) with
  | (* patterns *) -> (* results *)
```

<details>
<summary>Click to see solutions</summary>

```ocaml
(* 1. Get the second element of a list, or None *)
let second lst =
  match lst with
  | _ :: x :: _ -> Some x
  | _ -> None

(* 2. Check if a list is sorted (ascending) *)
let rec is_sorted lst =
  match lst with
  | [] | [_] -> true
  | x :: y :: rest -> x <= y && is_sorted (y :: rest)

(* 3. Zip two lists together *)
let rec zip lst1 lst2 =
  match (lst1, lst2) with
  | ([], _) | (_, []) -> []
  | (x :: xs, y :: ys) -> (x, y) :: zip xs ys
```

</details>

## Exercise: Decode Instructions

Write a simple instruction decoder:

```ocaml
type simple_op =
  | Nop
  | Push of int
  | Pop
  | Add
  | Halt

(* Decode from a byte list:
   0x00 -> Nop
   0x01 n -> Push n (next byte is the value)
   0x02 -> Pop
   0x03 -> Add
   0xFF -> Halt
*)
let rec decode bytes =
  match bytes with
  | (* your patterns here *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let rec decode bytes =
  match bytes with
  | [] -> []
  | 0x00 :: rest -> Nop :: decode rest
  | 0x01 :: n :: rest -> Push n :: decode rest
  | 0x02 :: rest -> Pop :: decode rest
  | 0x03 :: rest -> Add :: decode rest
  | 0xFF :: _ -> [Halt]  (* Halt ends decoding *)
  | _ :: rest -> decode rest  (* Skip unknown *)
```

</details>

## Exercise: Explore Lasair

Open `lib/pvm.ml` and find the `step` function. This is the heart of the PVM—it pattern matches on the current instruction and executes it.

1. How many instruction cases are there?
2. What happens on an `Ecalli` instruction?
3. Find an instruction that modifies memory.

## Key Takeaways

1. **Exhaustiveness** - The compiler verifies all cases are handled
2. **Destructuring** - Pull apart tuples, lists, and custom types
3. **Guards** - Add conditions with `when` (use sparingly)
4. **Nested patterns** - Match arbitrarily deep structures
5. **The `function` keyword** - Shorthand for matching the last argument

Pattern matching is what makes OCaml code so concise and safe. You'll see it everywhere in lasair.

## Next Up

We've seen simple types and pattern matching. Now let's learn how to define our own types: [Records and Variants →](lesson.html?lesson=001-ocaml-foundations/04-records-variants)
