---
title: Recursion and Tail Calls
duration: 25 min
---

# Recursion and Tail Calls

In functional programming, recursion replaces loops. But naive recursion can blow the stack. Learn the patterns that make recursion safe and efficient.

## Basic Recursion

A function that calls itself:

```ocaml
let rec factorial n =
  if n <= 1 then 1
  else n * factorial (n - 1)

let result = factorial 5  (* 120 *)
```

The `rec` keyword tells OCaml this function is recursive.

## How It Works

```
factorial 5
= 5 * factorial 4
= 5 * (4 * factorial 3)
= 5 * (4 * (3 * factorial 2))
= 5 * (4 * (3 * (2 * factorial 1)))
= 5 * (4 * (3 * (2 * 1)))
= 5 * (4 * (3 * 2))
= 5 * (4 * 6)
= 5 * 24
= 120
```

Each call waits for the recursive call to return before completing its multiplication. This builds up stack frames.

## The Problem: Stack Overflow

```ocaml
let rec sum_to n =
  if n <= 0 then 0
  else n + sum_to (n - 1)

let _ = sum_to 100        (* Fine *)
let _ = sum_to 1000000    (* Stack overflow! *)
```

Each pending addition needs a stack frame. Too many calls = crash.

## Tail Recursion: The Solution

A **tail call** is when the recursive call is the *last* thing the function does:

```ocaml
let rec sum_to_tail acc n =
  if n <= 0 then acc
  else sum_to_tail (acc + n) (n - 1)

let sum_to n = sum_to_tail 0 n

let _ = sum_to 1000000    (* Works! Returns 500000500000 *)
```

Now there's nothing to do after the recursive call returns—we just return its result directly. OCaml optimizes this to a loop.

## Tail-Recursive Factorial

```ocaml
(* Naive - builds up stack *)
let rec factorial n =
  if n <= 1 then 1
  else n * factorial (n - 1)

(* Tail-recursive - uses accumulator *)
let factorial n =
  let rec loop acc n =
    if n <= 1 then acc
    else loop (acc * n) (n - 1)
  in
  loop 1 n
```

The pattern: move the "pending work" into an accumulator parameter.

## The Accumulator Pattern

Transform any recursion to tail recursion:

1. Add an accumulator parameter
2. Do the work *before* the recursive call, not after
3. Return the accumulator in the base case

```ocaml
(* Naive reverse - O(n^2) and not tail-recursive *)
let rec reverse xs =
  match xs with
  | [] -> []
  | x :: rest -> reverse rest @ [x]

(* Tail-recursive reverse - O(n) *)
let reverse xs =
  let rec loop acc xs =
    match xs with
    | [] -> acc
    | x :: rest -> loop (x :: acc) rest
  in
  loop [] xs
```

## In Lasair: List Processing

```ocaml
(* Collect all hashes from blocks - tail-recursive *)
let collect_hashes blocks =
  let rec loop acc = function
    | [] -> List.rev acc  (* Reverse at the end *)
    | block :: rest ->
      loop (block.hash :: acc) rest
  in
  loop [] blocks
```

## Mutual Recursion

Functions that call each other:

```ocaml
let rec is_even n =
  if n = 0 then true
  else is_odd (n - 1)

and is_odd n =
  if n = 0 then false
  else is_even (n - 1)
```

The `and` keyword links mutually recursive definitions.

## In Lasair: Tree Traversal

Merkle trees require mutual recursion:

```ocaml
type tree =
  | Leaf of bytes
  | Branch of tree * tree

let rec hash_tree = function
  | Leaf data -> hash_leaf data
  | Branch (left, right) ->
    let left_hash = hash_tree left in
    let right_hash = hash_tree right in
    hash_branch left_hash right_hash
```

For deep trees, we need to be careful about stack usage.

## Continuation-Passing Style (CPS)

For complex tree traversals, use continuations:

```ocaml
let hash_tree_cps tree =
  let rec loop tree k =
    match tree with
    | Leaf data -> k (hash_leaf data)
    | Branch (left, right) ->
      loop left (fun left_hash ->
        loop right (fun right_hash ->
          k (hash_branch left_hash right_hash)))
  in
  loop tree (fun x -> x)
```

The continuation `k` represents "what to do next." This is always tail-recursive.

## In Lasair: Merkle Proof Verification

```ocaml
(* Verify a Merkle proof is valid *)
let verify_proof root path value =
  let rec loop current_hash = function
    | [] -> current_hash = root
    | (Left, sibling) :: rest ->
      let next = hash_branch current_hash sibling in
      loop next rest
    | (Right, sibling) :: rest ->
      let next = hash_branch sibling current_hash in
      loop next rest
  in
  loop (hash_leaf value) path
```

This is naturally tail-recursive—each step just updates the hash.

## Folding Over Trees

Generalize tree recursion with fold:

```ocaml
let rec fold_tree f_leaf f_branch = function
  | Leaf data -> f_leaf data
  | Branch (left, right) ->
    let left_result = fold_tree f_leaf f_branch left in
    let right_result = fold_tree f_leaf f_branch right in
    f_branch left_result right_result

(* Count leaves *)
let count_leaves tree =
  fold_tree (fun _ -> 1) (fun l r -> l + r) tree

(* Calculate depth *)
let tree_depth tree =
  fold_tree (fun _ -> 0) (fun l r -> 1 + max l r) tree
```

## Structural Recursion

Follow the structure of your data type:

```ocaml
type expr =
  | Num of int
  | Add of expr * expr
  | Mul of expr * expr

let rec eval = function
  | Num n -> n
  | Add (a, b) -> eval a + eval b
  | Mul (a, b) -> eval a * eval b

let result = eval (Add (Num 3, Mul (Num 4, Num 5)))
(* 23 *)
```

Each variant has a corresponding case in the function.

## In Lasair: PVM Instruction Processing

```ocaml
type instruction =
  | Add of reg * reg * reg
  | Sub of reg * reg * reg
  | Load of reg * address
  | Store of address * reg
  | Jump of address
  | Halt

let rec execute state = function
  | Halt -> state
  | Add (dst, src1, src2) ->
    let state = set_reg state dst (get_reg state src1 + get_reg state src2) in
    execute state (fetch_instruction state)
  | Jump addr ->
    let state = set_pc state addr in
    execute state (fetch_instruction state)
  (* ... other instructions ... *)
```

## When Not to Recurse

Sometimes a loop is clearer:

```ocaml
(* For array processing, iteration may be clearer *)
let sum_array arr =
  let total = ref 0 in
  for i = 0 to Array.length arr - 1 do
    total := !total + arr.(i)
  done;
  !total

(* Or use Array.fold_left *)
let sum_array arr = Array.fold_left (+) 0 arr
```

Use recursion for:
- List processing
- Tree traversal
- Complex control flow

Use iteration for:
- Simple array loops
- Performance-critical code
- Imperative algorithms (shuffle, sort)

## Exercise: Tail-Recursive Length

Implement a tail-recursive list length function:

```ocaml
let length xs =
  (* TODO: use accumulator pattern *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let length xs =
  let rec loop acc = function
    | [] -> acc
    | _ :: rest -> loop (acc + 1) rest
  in
  loop 0 xs

(* Test *)
let _ = length [1; 2; 3; 4; 5]  (* 5 *)
```

</details>

## Exercise: Tail-Recursive Map

Implement map with tail recursion:

```ocaml
let map f xs =
  (* TODO: accumulator + reverse *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let map f xs =
  let rec loop acc = function
    | [] -> List.rev acc
    | x :: rest -> loop (f x :: acc) rest
  in
  loop [] xs

(* Test *)
let _ = map (fun x -> x * 2) [1; 2; 3]  (* [2; 4; 6] *)
```

We build the result backwards (which is efficient), then reverse at the end (O(n)).

</details>

## Exercise: Flatten Nested Lists

```ocaml
type 'a nested =
  | Item of 'a
  | List of 'a nested list

let flatten nested =
  (* TODO: recursively flatten to a flat list *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type 'a nested =
  | Item of 'a
  | List of 'a nested list

let flatten nested =
  let rec loop acc = function
    | Item x -> x :: acc
    | List xs -> List.fold_left loop acc xs
  in
  List.rev (loop [] nested)

(* Test *)
let example = List [Item 1; List [Item 2; Item 3]; Item 4]
let _ = flatten example  (* [1; 2; 3; 4] *)
```

</details>

## Exercise: Binary Tree to List

Convert a binary tree to a sorted list (in-order traversal):

```ocaml
type 'a tree =
  | Empty
  | Node of 'a tree * 'a * 'a tree

let to_list tree =
  (* TODO: tail-recursive in-order traversal *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type 'a tree =
  | Empty
  | Node of 'a tree * 'a * 'a tree

let to_list tree =
  let rec loop acc = function
    | Empty -> acc
    | Node (left, value, right) ->
      (* Process right first since we're building backwards *)
      let acc = loop acc right in
      let acc = value :: acc in
      loop acc left
  in
  loop [] tree

(* Test *)
let tree = Node (Node (Empty, 1, Empty), 2, Node (Empty, 3, Empty))
let _ = to_list tree  (* [1; 2; 3] *)
```

</details>

## In Lasair: State Trie Traversal

```ocaml
(* Collect all key-value pairs from trie *)
let to_pairs trie =
  let rec loop path acc = function
    | Empty -> acc
    | Leaf value -> (List.rev path, value) :: acc
    | Branch children ->
      Array.fold_left
        (fun acc (nibble, child) ->
          loop (nibble :: path) acc child)
        acc
        children
  in
  loop [] [] trie
```

## Key Takeaways

1. **`rec` keyword** - Required for recursive functions
2. **Tail position** - Recursive call must be the last operation
3. **Accumulator pattern** - Move pending work into parameters
4. **`List.rev` at end** - Standard pattern for building lists
5. **CPS** - For complex traversals that need tail recursion
6. **Structural recursion** - Match your function to your data type
7. **Know when to iterate** - Loops are sometimes clearer

## Track Complete!

You've mastered functional patterns:
- Immutable state management
- Higher-order functions
- Error handling with Option and Result
- Safe recursive algorithms

Ready to dive into the JAM protocol? [What is JAM? →](lesson.html?lesson=01-jam-protocol/01-what-is-jam)
