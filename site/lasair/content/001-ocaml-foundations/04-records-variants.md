---
title: Records and Variants
duration: 30 min
---

# Records and Variants

OCaml lets you define your own types. The two fundamental ways are **records** (product types) and **variants** (sum types). Together, they let you model any domain precisely.

## Product Types: Records

A record is a collection of named fields. It's like a struct in C or an object in JavaScript, but immutable by default.

```ocaml
(* Define a record type *)
type point = {
  x: float;
  y: float;
}

(* Create a record value *)
let origin = { x = 0.0; y = 0.0 }
let p = { x = 3.0; y = 4.0 }

(* Access fields with dot notation *)
let distance_from_origin pt =
  Float.sqrt (pt.x *. pt.x +. pt.y *. pt.y)

let d = distance_from_origin p  (* 5.0 *)
```

## Record Syntax

Records require all fields to be specified when creating a value:

```ocaml
type person = {
  name: string;
  age: int;
  email: string;
}

(* All fields required *)
let alice = { name = "Alice"; age = 30; email = "alice@example.com" }

(* Order doesn't matter *)
let bob = { email = "bob@example.com"; name = "Bob"; age = 25 }
```

## Updating Records

Records are immutable, but you can create updated copies:

```ocaml
(* Functional update syntax *)
let alice_birthday = { alice with age = 31 }

(* Update multiple fields *)
let alice_new = { alice with age = 31; email = "alice.new@example.com" }

(* Original unchanged *)
let _ = assert (alice.age = 30)
```

## Pattern Matching on Records

You can destructure records in patterns:

```ocaml
let greet person =
  match person with
  | { name; age; _ } when age < 18 -> Printf.sprintf "Hi %s!" name
  | { name; _ } -> Printf.sprintf "Hello, %s." name

(* Shorthand: field punning *)
let get_name { name; _ } = name

(* Explicit binding *)
let get_email { email = e; _ } = e
```

## In Lasair: Page and Machine State

From `lib/pvm.ml`, records model the virtual machine:

```ocaml
(** Memory access permission *)
type access =
  | Inaccessible
  | ReadOnly
  | ReadWrite

(** RAM page *)
type page = {
  data: bytes;
  access: access;
}

(** Full machine state *)
type machine = {
  program: program;
  pc: int64;                (** Instruction counter *)
  gas: int64;               (** Gas remaining *)
  regs: registers;
  mem: ram;
  heap_ptr: int64;          (** Current heap end (grow_heap) *)
  heap_end: int64;          (** First address past the last possible RW page (grow_heap limit b) *)
  gas_charged: bool;        (** GP 0.8.0: has the current basic block's gas been charged? *)
  pending_exit: exit_reason option;
}
```

Each field captures one aspect of the PVM state. The `access` field within `page` shows how types compose.

## Sum Types: Variants

Variants represent "one of several possibilities." Each possibility is called a **constructor**.

```ocaml
(* Simple enumeration *)
type color = Red | Green | Blue

let c = Red

let to_string color =
  match color with
  | Red -> "red"
  | Green -> "green"
  | Blue -> "blue"
```

## Variants with Data

Constructors can carry data:

```ocaml
(* Each constructor has its own data type *)
type shape =
  | Circle of float              (* radius *)
  | Rectangle of float * float   (* width, height *)
  | Triangle of float * float * float  (* three sides *)

let circle = Circle 5.0
let rect = Rectangle (3.0, 4.0)

let area shape =
  match shape with
  | Circle r -> Float.pi *. r *. r
  | Rectangle (w, h) -> w *. h
  | Triangle (a, b, c) ->
      (* Heron's formula *)
      let s = (a +. b +. c) /. 2.0 in
      Float.sqrt (s *. (s -. a) *. (s -. b) *. (s -. c))
```

## In Lasair: Exit Reasons

From `lib/pvm.ml`, variants model the ways a program can stop:

```ocaml
(** Exit reason from PVM execution *)
type exit_reason =
  | Halt                  (** Normal termination *)
  | Panic                 (** Error condition *)
  | OutOfGas              (** Ran out of gas *)
  | PageFault of int64    (** Memory access fault with page address *)
  | HostCall of int64     (** Host call with identifier *)
```

Each case is distinct:
- `Halt` and `Panic` carry no data
- `PageFault` and `HostCall` carry the relevant address/identifier

Pattern matching ensures we handle every case:

```ocaml
let describe_exit reason =
  match reason with
  | Halt -> "Program completed normally"
  | Panic -> "Program panicked"
  | OutOfGas -> "Ran out of gas"
  | PageFault addr -> Printf.sprintf "Page fault at 0x%Lx" addr
  | HostCall id -> Printf.sprintf "Host call %Ld requested" id
```

## The Option Type

OCaml's built-in `option` type handles optional values:

```ocaml
type 'a option =
  | None
  | Some of 'a
```

Use it instead of null:

```ocaml
let find_user users id =
  List.find_opt (fun u -> u.id = id) users
  (* Returns Some user or None *)

let greet_user users id =
  match find_user users id with
  | Some user -> Printf.sprintf "Hello, %s!" user.name
  | None -> "User not found"
```

## In Lasair: Optional Results

From `lib/notation.ml`:

```ocaml
(** ?{A} ≡ A ∪ {∅} - Make a type optional *)
let optional (x : 'a) : 'a option = Some x

(** ⌀{a₀, ..., aₙ} - First non-None value, or None *)
let subifnone (options : 'a option list) : 'a option =
  List.find_opt Option.is_some options |> Option.join
```

The PVM step function uses option to signal continuation:

```ocaml
(** Single-step result *)
type step_result = {
  exit: exit_reason option;  (** None means continue *)
  pc: int64;
  gas: int64;
  regs: registers;
  mem: ram;
  heap_ptr: int64;
}
```

When `exit` is `None`, the machine continues running. When it's `Some reason`, execution stops.

## The Result Type

For operations that can fail with an error value:

```ocaml
type ('a, 'e) result =
  | Ok of 'a
  | Error of 'e
```

Example usage:

```ocaml
let divide a b =
  if b = 0 then Error "division by zero"
  else Ok (a / b)

let safe_calculation () =
  match divide 10 2 with
  | Ok result -> Printf.sprintf "Result: %d" result
  | Error msg -> Printf.sprintf "Error: %s" msg
```

## In Lasair: Work Results

From `conformance/accumulate_stf.ml`:

```ocaml
(** Work result from refine *)
type work_result =
  | ResultOk of bytes
  | ResultErr of int  (* error code *)

(** Test output *)
type accumulate_output =
  | OutputOk of bytes  (* state root or similar *)
  | OutputErr of string
```

These custom result types carry domain-specific success and error information.

## Combining Records and Variants

Real systems combine both. Here's a pattern from lasair:

```ocaml
(** Refine load metrics *)
type refine_load = {
  gas_used: int64;
  imports: int;
  extrinsic_count: int;
  extrinsic_size: int;
  exports: int;
}

(** Work result item in a report *)
type work_result_item = {
  wri_service_id: int;
  wri_code_hash: bytes;
  wri_payload_hash: bytes;
  wri_accumulate_gas: int64;
  wri_result: work_result;      (* Variant inside record *)
  wri_refine_load: refine_load; (* Record inside record *)
}
```

The `work_result_item` record contains:
- Simple fields like `wri_service_id`
- A variant field `wri_result` that's either success or error
- A nested record `wri_refine_load` with metrics

## Recursive Types

Types can reference themselves:

```ocaml
(* Binary tree *)
type 'a tree =
  | Leaf
  | Node of 'a * 'a tree * 'a tree

let example_tree =
  Node (1,
    Node (2, Leaf, Leaf),
    Node (3, Leaf, Leaf))

let rec sum_tree tree =
  match tree with
  | Leaf -> 0
  | Node (value, left, right) ->
      value + sum_tree left + sum_tree right

(* Linked list (how OCaml lists actually work) *)
type 'a mylist =
  | Nil
  | Cons of 'a * 'a mylist

let my_list = Cons (1, Cons (2, Cons (3, Nil)))
```

## Type Aliases

Sometimes you want a new name for an existing type:

```ocaml
(* Alias for documentation *)
type nat = int
type blob = bytes
type hash = bytes

(* From lib/pvm.ml *)
type reg_value = int64
type registers = reg_value array
type ram = (int, page) Hashtbl.t  (* page_index -> page *)
```

Aliases don't create new types—they're just names. The compiler treats `nat` and `int` identically.

## Mutable Records

Records can have mutable fields (use sparingly):

```ocaml
type counter = {
  mutable count: int;
  name: string;
}

let c = { count = 0; name = "clicks" }
let () = c.count <- c.count + 1  (* Mutation! *)
```

In functional code, prefer immutable records with functional update.

## Exercise: Model a Card Game

Define types for a card game:

```ocaml
(* 1. Define a suit type with four variants *)
type suit = (* your code *)

(* 2. Define a rank type (2-10, Jack, Queen, King, Ace) *)
type rank = (* your code *)

(* 3. Define a card record with suit and rank *)
type card = (* your code *)

(* 4. Define a hand as a list of cards *)
type hand = (* your code *)

(* 5. Write a function to check if a hand has a flush (all same suit) *)
let is_flush (h : hand) : bool =
  (* your code *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type suit = Hearts | Diamonds | Clubs | Spades

type rank =
  | Two | Three | Four | Five | Six | Seven
  | Eight | Nine | Ten | Jack | Queen | King | Ace

type card = {
  suit: suit;
  rank: rank;
}

type hand = card list

let is_flush (h : hand) : bool =
  match h with
  | [] -> true
  | first :: rest ->
      List.for_all (fun c -> c.suit = first.suit) rest
```

</details>

## Exercise: Expression Evaluator

Build a simple arithmetic expression type and evaluator:

```ocaml
(* Define the expression type *)
type expr =
  | Num of int
  | Add of expr * expr
  | Sub of expr * expr
  | Mul of expr * expr
  | Div of expr * expr

(* Example: (3 + 4) * 2 *)
let example = Mul (Add (Num 3, Num 4), Num 2)

(* Write the evaluator *)
let rec eval (e : expr) : int option =
  (* Return None for division by zero *)
  (* your code *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type expr =
  | Num of int
  | Add of expr * expr
  | Sub of expr * expr
  | Mul of expr * expr
  | Div of expr * expr

let rec eval (e : expr) : int option =
  match e with
  | Num n -> Some n
  | Add (a, b) ->
      (match (eval a, eval b) with
       | (Some x, Some y) -> Some (x + y)
       | _ -> None)
  | Sub (a, b) ->
      (match (eval a, eval b) with
       | (Some x, Some y) -> Some (x - y)
       | _ -> None)
  | Mul (a, b) ->
      (match (eval a, eval b) with
       | (Some x, Some y) -> Some (x * y)
       | _ -> None)
  | Div (a, b) ->
      (match (eval a, eval b) with
       | (Some _, Some 0) -> None  (* division by zero *)
       | (Some x, Some y) -> Some (x / y)
       | _ -> None)

(* Test *)
let result = eval (Mul (Add (Num 3, Num 4), Num 2))
(* result = Some 14 *)
```

</details>

## Exercise: Model PVM State

Based on what you've learned, define types to model a simplified PVM:

```ocaml
(* 1. Define an access permission variant *)
type access = (* your code *)

(* 2. Define an exit_reason variant with:
   - Halt (no data)
   - Panic (no data)
   - PageFault with an address (int)
   - HostCall with an identifier (int) *)
type exit_reason = (* your code *)

(* 3. Define a simplified machine state record with:
   - pc (program counter, int)
   - gas (int)
   - running (bool) *)
type machine = (* your code *)

(* 4. Write a step function that:
   - Decrements gas by 1
   - Increments pc by 1
   - Returns (new_machine, exit_reason option) where
     - exit_reason is Some OutOfGas if gas <= 0
     - exit_reason is None otherwise *)
let step (m : machine) : machine * exit_reason option =
  (* your code *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type access =
  | Inaccessible
  | ReadOnly
  | ReadWrite

type exit_reason =
  | Halt
  | Panic
  | OutOfGas
  | PageFault of int
  | HostCall of int

type machine = {
  pc: int;
  gas: int;
  running: bool;
}

let step (m : machine) : machine * exit_reason option =
  let new_gas = m.gas - 1 in
  if new_gas <= 0 then
    ({ m with gas = new_gas; running = false }, Some OutOfGas)
  else
    ({ m with pc = m.pc + 1; gas = new_gas }, None)

(* Test *)
let m0 = { pc = 0; gas = 3; running = true }
let (m1, r1) = step m0  (* pc=1, gas=2, None *)
let (m2, r2) = step m1  (* pc=2, gas=1, None *)
let (m3, r3) = step m2  (* pc=2, gas=0, Some OutOfGas *)
```

</details>

## Key Takeaways

1. **Records** group related fields together (product types, "this AND that")
2. **Variants** represent alternatives (sum types, "this OR that")
3. **Option** handles missing values safely (no null pointer exceptions)
4. **Result** handles operations that can fail with error information
5. **Combine freely** - records can contain variants, variants can contain records
6. **Exhaustiveness** - the compiler ensures you handle all variant cases
7. **Immutability** - prefer functional updates over mutable fields

Records and variants are the foundation of OCaml's type system. Master them, and you can model any domain with precision.

## Next Up

Now that you can define types, let's organize them into modules: [Modules and Signatures →](lesson.html?lesson=001-ocaml-foundations/05-modules)
