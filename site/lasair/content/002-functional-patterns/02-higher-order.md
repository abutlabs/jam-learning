---
title: Higher-Order Functions
duration: 25 min
---

# Higher-Order Functions

Functions that take functions as arguments, or return functions as results. This is the heart of functional programming—and it's everywhere in lasair.

## Functions Are Values

In OCaml, functions are first-class values. You can:

```ocaml
(* Assign them to variables *)
let add_one = fun x -> x + 1

(* Pass them as arguments *)
let apply_twice f x = f (f x)
let result = apply_twice add_one 5  (* 7 *)

(* Return them from functions *)
let make_adder n = fun x -> x + n
let add_five = make_adder 5
let result = add_five 10  (* 15 *)

(* Store them in data structures *)
let operations = [add_one; add_five; (fun x -> x * 2)]
```

## Map: Transform Every Element

`List.map` applies a function to every element:

```ocaml
let numbers = [1; 2; 3; 4; 5]

let doubled = List.map (fun x -> x * 2) numbers
(* [2; 4; 6; 8; 10] *)

let strings = List.map string_of_int numbers
(* ["1"; "2"; "3"; "4"; "5"] *)

(* Can also use named functions *)
let square x = x * x
let squares = List.map square numbers
(* [1; 4; 9; 16; 25] *)
```

## In Lasair: Mapping Over Validators

```ocaml
(* Get all validator public keys *)
let get_validator_keys validators =
  Array.map (fun v -> v.ed25519_key) validators

(* Get all ticket identifiers: the ring-VRF output IS the score, lower wins *)
let ticket_ids tickets =
  List.map (fun ticket -> vrf_output ticket.proof) tickets
```

## Filter: Select Elements

`List.filter` keeps elements matching a predicate:

```ocaml
let numbers = [1; 2; 3; 4; 5; 6; 7; 8; 9; 10]

let evens = List.filter (fun x -> x mod 2 = 0) numbers
(* [2; 4; 6; 8; 10] *)

let big = List.filter (fun x -> x > 5) numbers
(* [6; 7; 8; 9; 10] *)

(* Combine predicates *)
let big_evens = List.filter (fun x -> x mod 2 = 0 && x > 5) numbers
(* [6; 8; 10] *)
```

## In Lasair: Filtering Work Items

```ocaml
(* Get work items assigned to a specific core *)
let work_for_core core_id work_items =
  List.filter (fun item -> item.core = core_id) work_items

(* Get valid guarantees (within time window) *)
let valid_guarantees slot guarantees =
  List.filter
    (fun g -> g.timeslot >= slot - c_guarantee_window)
    guarantees
```

## Fold: Reduce to a Single Value

`List.fold_left` combines all elements using a function:

```ocaml
(* Sum: start with 0, add each element *)
let sum xs = List.fold_left (+) 0 xs
let total = sum [1; 2; 3; 4; 5]  (* 15 *)

(* Product: start with 1, multiply each element *)
let product xs = List.fold_left ( * ) 1 xs
let result = product [1; 2; 3; 4]  (* 24 *)

(* Maximum: start with first element, keep larger *)
let maximum xs = match xs with
  | [] -> failwith "empty list"
  | x :: rest -> List.fold_left max x rest
```

The pattern is: `fold_left f init [a; b; c]` computes `f (f (f init a) b) c`

## In Lasair: Accumulating State

```ocaml
(* Sum all service balances *)
let total_balance services =
  Array.fold_left
    (fun acc service -> Int64.add acc service.balance)
    0L
    services

(* Build index from list *)
let index_by_hash items =
  List.fold_left
    (fun map item -> HashSet.add item.hash item map)
    HashSet.empty
    items
```

## Combining Map and Filter

```ocaml
(* Get squared values of evens *)
let squared_evens xs =
  xs
  |> List.filter (fun x -> x mod 2 = 0)
  |> List.map (fun x -> x * x)

let result = squared_evens [1; 2; 3; 4; 5; 6]
(* [4; 16; 36] *)
```

## filter_map: Map and Filter in One Pass

```ocaml
(* Parse integers, ignoring failures *)
let parse_ints strings =
  List.filter_map int_of_string_opt strings

let result = parse_ints ["1"; "hello"; "3"; "world"; "5"]
(* [1; 3; 5] *)
```

`filter_map` applies a function returning `option` and keeps only the `Some` values.

## In Lasair: Processing Optional Results

```ocaml
(* Collect successful work results *)
let successful_outputs results =
  List.filter_map
    (function
      | Ok output -> Some output
      | Error _ -> None)
    results
```

## find and find_opt

```ocaml
(* Find first match (raises if not found) *)
let first_even xs = List.find (fun x -> x mod 2 = 0) xs

(* Safe version returns option *)
let first_even_opt xs = List.find_opt (fun x -> x mod 2 = 0) xs

let result = first_even_opt [1; 3; 4; 5]  (* Some 4 *)
let nope = first_even_opt [1; 3; 5]       (* None *)
```

## In Lasair: Finding Validators

```ocaml
(* Find validator by key *)
let find_validator validators key =
  Array.find_opt (fun v -> v.ed25519_key = key) validators

(* Find service by ID *)
let find_service state service_id =
  if service_id < Array.length state.services then
    Some state.services.(service_id)
  else
    None
```

## iter: Side Effects

When you need side effects (printing, logging), use `iter`:

```ocaml
(* Print each element *)
let print_all xs = List.iter print_endline xs

(* Log each transaction *)
let log_transactions txs =
  List.iter (fun tx ->
    Printf.printf "TX: %s -> %s: %d\n" tx.from tx.to_ tx.amount
  ) txs
```

`iter` is like `map` but discards results and returns `unit`.

## Partial Application

Apply some arguments now, the rest later:

```ocaml
let add x y = x + y
let add_five = add 5      (* Partially applied *)
let result = add_five 10  (* 15 *)

let multiply x y = x * y
let double = multiply 2
let triple = multiply 3
```

This is called **currying**—every OCaml function is curried by default.

## In Lasair: Curried Operations

```ocaml
(* Partially apply core ID *)
let is_for_core core_id item = item.core = core_id
let core_42_items = List.filter (is_for_core 42) all_items

(* Partially apply configuration *)
let validate_with_config config =
  fun block -> validate_block config block

let mainnet_validator = validate_with_config mainnet_config
let testnet_validator = validate_with_config testnet_config
```

## Function Composition

Build complex functions from simple ones:

```ocaml
(* Compose two functions *)
let compose f g = fun x -> f (g x)

let add_one x = x + 1
let double x = x * 2

let add_one_then_double = compose double add_one
let result = add_one_then_double 5  (* 12: (5+1)*2 *)

(* Or use the @@ and |> operators *)
let result = double @@ add_one 5    (* 12 *)
let result = 5 |> add_one |> double (* 12 *)
```

## In Lasair: Pipeline Style

```ocaml
(* Process a block in pipeline style *)
let process_block state block =
  block
  |> validate_header state
  |> Result.map (apply_extrinsics state)
  |> Result.map update_accumulator
  |> Result.map finalize_state
```

## Anonymous Functions (Lambdas)

Short functions can be written inline:

```ocaml
(* Full syntax *)
let doubled = List.map (fun x -> x * 2) [1; 2; 3]

(* With pattern matching *)
let firsts = List.map (fun (a, _) -> a) [(1, 2); (3, 4)]

(* Multiple arguments *)
let sums = List.map2 (fun a b -> a + b) [1; 2; 3] [4; 5; 6]
(* [5; 7; 9] *)
```

## In Lasair: Shuffle Implementation

From `lib/utilities.ml`:

```ocaml
(* Fisher-Yates shuffle using fold *)
let fisher_yates_shuffle seed items =
  let n = Array.length items in
  let arr = Array.copy items in
  let rng = Random.State.make [| seed |] in
  for i = n - 1 downto 1 do
    let j = Random.State.int rng (i + 1) in
    let tmp = arr.(i) in
    arr.(i) <- arr.(j);
    arr.(j) <- tmp
  done;
  arr
```

This uses imperative style for performance, but the function interface is pure—same seed gives same shuffle.

## List.init: Generate Lists

```ocaml
(* Create list from index function *)
let zeros = List.init 5 (fun _ -> 0)
(* [0; 0; 0; 0; 0] *)

let naturals = List.init 5 (fun i -> i)
(* [0; 1; 2; 3; 4] *)

let squares = List.init 5 (fun i -> i * i)
(* [0; 1; 4; 9; 16] *)
```

## In Lasair: Initializing Cores

```ocaml
(* Initialize all cores *)
let init_cores () =
  Array.init c_core_count (fun i ->
    { core_id = i;
      status = Idle;
      pending_work = [] }
  )
```

## Exercise: Implement map with fold

`map` can be implemented using `fold`:

```ocaml
let my_map f xs =
  (* TODO: use List.fold_right *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let my_map f xs =
  List.fold_right (fun x acc -> f x :: acc) xs []

(* Test it *)
let doubled = my_map (fun x -> x * 2) [1; 2; 3]
(* [2; 4; 6] *)
```

We use `fold_right` to preserve order. `fold_left` would reverse the list.

</details>

## Exercise: Implement filter with fold

```ocaml
let my_filter pred xs =
  (* TODO: use List.fold_right *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let my_filter pred xs =
  List.fold_right
    (fun x acc -> if pred x then x :: acc else acc)
    xs
    []

(* Test it *)
let evens = my_filter (fun x -> x mod 2 = 0) [1; 2; 3; 4; 5]
(* [2; 4] *)
```

</details>

## Exercise: Statistics Pipeline

Implement these using higher-order functions:

```ocaml
let count xs = (* TODO: count elements *)
let sum xs = (* TODO: sum elements *)
let average xs = (* TODO: average of elements *)
let variance xs = (* TODO: variance of elements *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let count xs = List.length xs

let sum xs = List.fold_left (+) 0 xs

let average xs =
  float_of_int (sum xs) /. float_of_int (count xs)

let variance xs =
  let avg = average xs in
  let sum_sq_diff = List.fold_left
    (fun acc x ->
      let diff = float_of_int x -. avg in
      acc +. diff *. diff)
    0.0
    xs
  in
  sum_sq_diff /. float_of_int (count xs)
```

</details>

## Key Takeaways

1. **Functions are values** - Pass them, return them, store them
2. **map** - Transform every element
3. **filter** - Select elements matching a condition
4. **fold** - Reduce to a single value
5. **Partial application** - Fix some arguments, leave others for later
6. **Composition** - Build complex functions from simple ones
7. **Pipeline style** - Chain transformations with `|>`

## Next Up

What happens when things go wrong? Let's handle errors gracefully: [Error Handling →](lesson.html?lesson=002-functional-patterns/03-error-handling)
