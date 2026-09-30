---
title: Error Handling
duration: 20 min
---

# Error Handling

Errors are data, not exceptions. In OCaml, we make the possibility of failure explicit in the type system. You can't forget to handle an error—the compiler won't let you.

## The Option Type

`option` represents values that might not exist:

```ocaml
type 'a option =
  | None
  | Some of 'a

(* Finding in a list might fail *)
let first_even xs =
  List.find_opt (fun x -> x mod 2 = 0) xs

let result = first_even [1; 3; 5]    (* None *)
let result = first_even [1; 2; 3]    (* Some 2 *)
```

You **must** handle both cases:

```ocaml
let print_first_even xs =
  match first_even xs with
  | None -> print_endline "No even number found"
  | Some n -> Printf.printf "First even: %d\n" n
```

The compiler enforces exhaustive matching. You can't accidentally ignore `None`.

## In Lasair: Optional Fields

Many lookups might fail:

```ocaml
(* Service might not exist *)
let get_service state service_id =
  if service_id < Array.length state.services then
    Some state.services.(service_id)
  else
    None

(* Preimage might not be available *)
let lookup_preimage state hash =
  match Hashtbl.find_opt state.preimage_lookup hash with
  | Some data -> Some data
  | None -> lookup_from_recent_blocks state hash
```

## Working with Option

Common operations:

```ocaml
(* Get value or default *)
let value = Option.value maybe_int ~default:0

(* Map over option *)
let doubled = Option.map (fun x -> x * 2) maybe_int
(* None stays None, Some x becomes Some (x*2) *)

(* Chain operations that might fail *)
let result =
  Option.bind (find_user id) (fun user ->
    Option.bind (get_account user) (fun account ->
      Some account.balance
    )
  )
```

## The Result Type

When failure has a reason, use `result`:

```ocaml
type ('a, 'b) result =
  | Ok of 'a
  | Error of 'b

let divide a b =
  if b = 0 then Error "division by zero"
  else Ok (a / b)

let result = divide 10 2   (* Ok 5 *)
let result = divide 10 0   (* Error "division by zero" *)
```

## In Lasair: Validation Results

Every validation function returns a result:

```ocaml
type validation_error =
  | Invalid_signature
  | Invalid_timestamp of { expected : int; got : int }
  | Unknown_validator
  | Insufficient_stake
  | Block_too_old

let validate_header state header =
  if header.slot <= state.last_slot then
    Error (Invalid_timestamp {
      expected = state.last_slot + 1;
      got = header.slot
    })
  else if not (verify_signature header) then
    Error Invalid_signature
  else
    Ok header
```

The type tells you exactly what can go wrong.

## Pattern Matching Results

```ocaml
let process_block state block =
  match validate_header state block.header with
  | Error e ->
    log_error e;
    state  (* Return unchanged state *)
  | Ok header ->
    let state = apply_header state header in
    match validate_body state block.body with
    | Error e ->
      log_error e;
      state
    | Ok body ->
      apply_body state body
```

This works but gets nested. There's a better way.

## Result Combinators

```ocaml
(* Map over success *)
let doubled = Result.map (fun x -> x * 2) (Ok 5)
(* Ok 10 *)

(* Chain results *)
let result =
  validate_header state block.header
  |> Result.bind (fun header ->
       validate_body state block.body
       |> Result.map (fun body -> (header, body)))

(* Map over error *)
let result = Result.map_error
  (fun e -> Printf.sprintf "Validation failed: %s" e)
  (validate block)
```

## In Lasair: The let* Syntax

OCaml 4.08+ has binding operators for cleaner chains:

```ocaml
let ( let* ) = Result.bind

let process_block state block =
  let* header = validate_header state block.header in
  let* body = validate_body state block.body in
  let* extrinsics = decode_extrinsics body in
  Ok (apply_all state header extrinsics)
```

If any step returns `Error`, the whole thing short-circuits. Much cleaner than nested matches!

## In Lasair: STF Error Handling

```ocaml
(* Illustrative sketch; lasair's real pipeline is import_block
   in conformance/trace_runner.ml *)
let transition ~prior_state ~block =
  let ( let* ) = Result.bind in
  let* () = check_parent_hash prior_state block in
  let* () = check_slot prior_state block in
  let* header = validate_seal block.header in
  let* state = apply_disputes prior_state block.disputes in
  let* state = apply_tickets state block.tickets in
  let* state = apply_assurances state block.assurances in
  let* state = apply_guarantees state block.guarantees in
  let state = advance_time state block.header.slot in
  Ok state
```

Each step can fail with a specific error. The caller sees exactly what went wrong.

## When to Use Option vs Result

**Use `option` when:**
- Absence is normal and expected
- There's only one reason for failure
- The caller doesn't need to know why

```ocaml
let find_user id = (* Option: user may not exist *)
let head xs = (* Option: list may be empty *)
```

**Use `result` when:**
- Failure has multiple causes
- The caller needs to know what went wrong
- You want to provide error recovery

```ocaml
let parse_block bytes = (* Result: many parsing errors possible *)
let validate_tx tx = (* Result: various validation failures *)
```

## Exceptions: The Escape Hatch

OCaml has exceptions, but use them sparingly:

```ocaml
(* Raising *)
exception Invalid_input of string
let parse x =
  if x < 0 then raise (Invalid_input "negative number")
  else x

(* Catching *)
let safe_parse x =
  try Some (parse x)
  with Invalid_input _ -> None
```

Exceptions are for:
- Programmer errors (bugs that shouldn't happen)
- I/O failures in imperative code
- Integrating with libraries that use them

## In Lasair: Assert for Invariants

```ocaml
(* Use assert for things that should never happen *)
let get_validator state idx =
  assert (idx >= 0 && idx < Array.length state.validators);
  state.validators.(idx)

(* If this fails, it's a bug in our code, not user input *)
```

## Converting Between Types

```ocaml
(* Option to Result *)
let require msg opt =
  match opt with
  | Some x -> Ok x
  | None -> Error msg

let user = require "user not found" (find_user id)

(* Result to Option *)
let optional result = Result.to_option result

(* Catching exceptions *)
let safe f x =
  try Ok (f x)
  with e -> Error (Printexc.to_string e)
```

## Combining Multiple Results

```ocaml
(* All must succeed *)
let all_ok results =
  List.fold_left
    (fun acc r ->
      match acc, r with
      | Error e, _ -> Error e
      | _, Error e -> Error e
      | Ok xs, Ok x -> Ok (x :: xs))
    (Ok [])
    results
  |> Result.map List.rev

(* First success *)
let first_ok results =
  List.find_map Result.to_option results
```

## In Lasair: Processing Multiple Guarantees

```ocaml
let validate_guarantees state guarantees =
  let ( let* ) = Result.bind in
  let* validated =
    List.fold_left
      (fun acc g ->
        let* validated_so_far = acc in
        let* validated_g = validate_guarantee state g in
        Ok (validated_g :: validated_so_far))
      (Ok [])
      guarantees
  in
  Ok (List.rev validated)
```

## Exercise: Safe Division Calculator

Implement a calculator that handles errors properly:

```ocaml
type calc_error =
  | Division_by_zero
  | Negative_root
  | Overflow

let safe_div a b = (* TODO *)
let safe_sqrt x = (* TODO *)
let safe_add a b = (* TODO: detect overflow *)

(* Calculate: sqrt((a + b) / c) *)
let calculate a b c = (* TODO: chain with let* *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type calc_error =
  | Division_by_zero
  | Negative_root
  | Overflow

let safe_div a b =
  if b = 0.0 then Error Division_by_zero
  else Ok (a /. b)

let safe_sqrt x =
  if x < 0.0 then Error Negative_root
  else Ok (sqrt x)

let safe_add a b =
  let result = a +. b in
  if result = infinity || result = neg_infinity then
    Error Overflow
  else
    Ok result

let ( let* ) = Result.bind

let calculate a b c =
  let* sum = safe_add a b in
  let* quotient = safe_div sum c in
  let* root = safe_sqrt quotient in
  Ok root

(* Test it *)
let _ = calculate 3.0 6.0 3.0   (* Ok 1.732... *)
let _ = calculate 1.0 2.0 0.0   (* Error Division_by_zero *)
let _ = calculate 1.0 2.0 (-1.0) (* Error Negative_root *)
```

</details>

## Exercise: Config Parser

Parse a config string, handling all possible errors:

```ocaml
type config = { host : string; port : int; debug : bool }

type parse_error =
  | Missing_field of string
  | Invalid_port of string
  | Invalid_bool of string

let parse_config lines = (* TODO *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type config = { host : string; port : int; debug : bool }

type parse_error =
  | Missing_field of string
  | Invalid_port of string
  | Invalid_bool of string

let ( let* ) = Result.bind

let find_field name fields =
  match List.assoc_opt name fields with
  | Some v -> Ok v
  | None -> Error (Missing_field name)

let parse_port s =
  match int_of_string_opt s with
  | Some n when n > 0 && n < 65536 -> Ok n
  | _ -> Error (Invalid_port s)

let parse_bool s =
  match String.lowercase_ascii s with
  | "true" | "yes" | "1" -> Ok true
  | "false" | "no" | "0" -> Ok false
  | _ -> Error (Invalid_bool s)

let parse_line line =
  match String.split_on_char '=' line with
  | [key; value] -> Some (String.trim key, String.trim value)
  | _ -> None

let parse_config lines =
  let fields = List.filter_map parse_line lines in
  let* host = find_field "host" fields in
  let* port_str = find_field "port" fields in
  let* port = parse_port port_str in
  let* debug_str = find_field "debug" fields in
  let* debug = parse_bool debug_str in
  Ok { host; port; debug }
```

</details>

## Key Takeaways

1. **Option** - For values that might not exist
2. **Result** - For operations that might fail with a reason
3. **Exhaustive matching** - Compiler ensures you handle all cases
4. **`let*` binding** - Clean chaining of fallible operations
5. **Exceptions sparingly** - For bugs and I/O, not business logic
6. **Errors as data** - Make failure explicit in types

## Next Up

Let's explore the recursive patterns that make functional data processing possible: [Recursion and Tail Calls →](lesson.html?lesson=002-functional-patterns/04-recursion)
