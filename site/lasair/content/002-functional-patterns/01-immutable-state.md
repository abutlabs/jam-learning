---
title: Immutable State
duration: 20 min
---

# Immutable State

In imperative programming, you mutate variables. In functional programming, you transform values. This isn't just a stylistic choice—it's the foundation of correctness in complex systems like blockchain clients.

## The Problem with Mutation

Consider this Python code:

```python
def process_transactions(state, transactions):
    for tx in transactions:
        state["balance"] -= tx["amount"]  # Mutation!
    return state
```

What happens if an error occurs mid-loop? The state is partially modified. What if another thread reads `state` during the loop? Race condition. What if you need to retry with different transactions? The original state is gone.

## OCaml's Answer: Transformation

In OCaml, we don't modify state—we create new state:

```ocaml
let process_transaction state tx =
  { state with balance = state.balance - tx.amount }

let process_transactions state transactions =
  List.fold_left process_transaction state transactions
```

Each call returns a **new** state. The old state still exists, unchanged. This is called **persistent data structures**—updates don't destroy the original.

## In Lasair: The State Model

JAM's state is immutable. A sketch (illustrative, not lasair's code):

```ocaml
type state = {
  services : service_state array;
  validators : validator_info array;
  recent_blocks : block_info list;
  accumulator : accumulator_state;
  (* ... *)
}

(* State transition - returns NEW state *)
let apply_block state block =
  let state = update_time state block.header in
  let state = process_disputes state block.disputes in
  let state = process_assurances state block.assurances in
  let state = process_guarantees state block.guarantees in
  let state = finalize_epoch state in
  state
```

Each function takes the current state and returns a new state. The previous state is preserved. If block import fails, we simply don't use the new state.

lasair's real state, `State_db.t` in `lib/state_db.ml`, is built on OCaml's persistent `Map`: `State_db.set db key value` returns a new database and leaves `db` untouched. (The order above follows the Graypaper: disputes, then assurances, then guarantees, since each works on the availability assignments ρ the previous step left behind.)

## Record Updates with `with`

OCaml makes this pattern ergonomic:

```ocaml
type account = {
  owner : string;
  balance : int;
  nonce : int;
}

let alice = { owner = "alice"; balance = 1000; nonce = 0 }

(* Create new record with one field changed *)
let alice_after_send = { alice with balance = 900; nonce = 1 }

(* alice.balance is still 1000! *)
```

The `with` syntax creates a copy with specified fields updated. It's efficient—unchanged fields share memory with the original.

## State Transformation Pipelines

A common pattern is threading state through a series of transformations:

```ocaml
let process_block state block =
  state
  |> validate_header block.header
  |> apply_extrinsics block.extrinsics
  |> update_validator_set
  |> finalize
```

The `|>` operator (pipe) passes the result of each step as input to the next. It's just `let ( |> ) x f = f x`.

## In Lasair: STF Pipeline

The State Transition Function (STF) is a pure transformation:

```ocaml
(* Illustrative sketch; lasair's real pipeline is import_block
   in conformance/trace_runner.ml *)
let transition ~prior_state ~block =
  let state = prior_state in
  let state = check_header state block.header in
  let state = apply_disputes state block.disputes in
  let state = advance_time state block.header.slot in
  let state = apply_tickets state block.tickets in
  let state = apply_assurances state block.assurances in
  let state = apply_guarantees state block.guarantees in
  let state = process_preimages state block.preimages in
  Ok state
```

If any step fails, we return `Error` without having modified anything. The `prior_state` is untouched.

## Immutable Collections

OCaml's built-in lists are immutable:

```ocaml
let xs = [1; 2; 3]
let ys = 0 :: xs        (* [0; 1; 2; 3] - xs unchanged *)
let zs = List.map (fun x -> x * 2) xs  (* [2; 4; 6] - xs unchanged *)
```

Adding to the front (`::`) is O(1). The new list shares the tail with the original.

## Maps and Sets

For key-value data, use `Map`:

```ocaml
module StringMap = Map.Make(String)

let empty = StringMap.empty
let with_alice = StringMap.add "alice" 1000 empty
let with_bob = StringMap.add "bob" 500 with_alice

(* with_alice still has only alice! *)
let alice_balance = StringMap.find "alice" with_bob  (* 1000 *)
```

Updates return new maps. Internally, they share structure with the original (balanced trees).

## In Lasair: Service State

Services maintain their own state as key-value stores:

```ocaml
(* Conceptually: *)
type service_state = {
  code : bytes;
  storage : bytes BytesMap.t;  (* Immutable map *)
  balance : int64;
}

let update_storage service key value =
  { service with storage = BytesMap.add key value service.storage }
```

## Fold: The Universal Reducer

Most state transformations can be expressed as folds:

```ocaml
(* Sum a list *)
let sum xs = List.fold_left (+) 0 xs

(* Build a map from pairs *)
let of_pairs pairs =
  List.fold_left
    (fun map (key, value) -> StringMap.add key value map)
    StringMap.empty
    pairs

(* Apply multiple updates to state *)
let apply_updates state updates =
  List.fold_left apply_single_update state updates
```

`fold_left` threads an accumulator through a list, applying a function at each step.

## In Lasair: Processing Work Results

```ocaml
(* Process multiple work results, accumulating state changes *)
let process_work_results state results =
  List.fold_left
    (fun state result ->
      match result with
      | Ok output -> accumulate_output state output
      | Error _ -> state  (* Skip failed work *)
    )
    state
    results
```

## Why This Matters

**1. Debugging**: You can inspect any historical state. No "what was the value before?"

**2. Concurrency**: No locks needed—immutable data is thread-safe by definition.

**3. Rollback**: Keep the old state around until you're sure the new state is valid.

**4. Testing**: Pure functions are trivially testable—same input always gives same output.

**5. Reasoning**: When state doesn't change, code is easier to understand.

## The Performance Question

"Isn't copying expensive?"

OCaml's immutable structures use **structural sharing**. When you update one field of a record, you're not copying the whole thing—you're creating a new record that points to the same unchanged fields.

For the few cases where mutation is truly necessary (performance-critical inner loops), OCaml provides:
- `ref` for mutable references
- `Array` for mutable arrays
- `Bytes` for mutable byte sequences

But these are the exception, not the rule.

## Exercise: Counter State Machine

Implement an immutable counter:

```ocaml
type counter = { value : int; history : int list }

let create () = (* TODO: initial state *)

let increment c = (* TODO: return new counter with value + 1 *)

let decrement c = (* TODO: return new counter with value - 1 *)

let undo c = (* TODO: restore previous value from history *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type counter = { value : int; history : int list }

let create () = { value = 0; history = [] }

let increment c =
  { value = c.value + 1; history = c.value :: c.history }

let decrement c =
  { value = c.value - 1; history = c.value :: c.history }

let undo c =
  match c.history with
  | [] -> c  (* Nothing to undo *)
  | prev :: rest -> { value = prev; history = rest }
```

Test it:
```ocaml
let c = create ()          (* { value = 0; history = [] } *)
let c = increment c        (* { value = 1; history = [0] } *)
let c = increment c        (* { value = 2; history = [1; 0] } *)
let c = decrement c        (* { value = 1; history = [2; 1; 0] } *)
let c = undo c             (* { value = 2; history = [1; 0] } *)
```

</details>

## Exercise: Transaction Processor

Build an immutable account ledger:

```ocaml
type account = { balance : int; nonce : int }
type ledger = account StringMap.t

type transaction = {
  from_addr : string;
  to_addr : string;
  amount : int;
  tx_nonce : int;
}

let process_tx ledger tx =
  (* TODO: validate nonce, check balance, transfer funds *)
  (* Return Ok new_ledger or Error message *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let process_tx ledger tx =
  match StringMap.find_opt tx.from_addr ledger with
  | None -> Error "sender not found"
  | Some sender ->
    if tx.tx_nonce <> sender.nonce then
      Error "invalid nonce"
    else if sender.balance < tx.amount then
      Error "insufficient balance"
    else
      let sender' = { balance = sender.balance - tx.amount;
                      nonce = sender.nonce + 1 } in
      let receiver = match StringMap.find_opt tx.to_addr ledger with
        | Some r -> r
        | None -> { balance = 0; nonce = 0 }
      in
      let receiver' = { receiver with balance = receiver.balance + tx.amount } in
      let ledger = StringMap.add tx.from_addr sender' ledger in
      let ledger = StringMap.add tx.to_addr receiver' ledger in
      Ok ledger
```

</details>

## Key Takeaways

1. **Transform, don't mutate** - Create new values instead of changing old ones
2. **`with` syntax** - Efficiently update record fields
3. **Structural sharing** - Immutable updates are cheaper than you think
4. **Fold for accumulation** - Thread state through sequences of operations
5. **History is free** - Old states persist unless explicitly discarded

## Next Up

Now that you can manage state, let's explore the functions that transform it: [Higher-Order Functions →](lesson.html?lesson=002-functional-patterns/02-higher-order)
