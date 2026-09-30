---
title: Functions
duration: 20 min
---

# Functions

Functions are the heart of OCaml. They're values like any other—you can pass them to other functions, return them from functions, and store them in data structures.

## Defining Functions

The basic syntax:

```ocaml
let double x = x * 2
(* val double : int -> int *)

let add x y = x + y
(* val add : int -> int -> int *)

let greet name = "Hello, " ^ name ^ "!"
(* val greet : string -> string *)
```

The arrow `->` in the type signature means "takes X and returns Y". So `int -> int` means "takes an int, returns an int".

## Calling Functions

Function application uses spaces, not parentheses:

```ocaml
let result = double 21        (* 42 *)
let sum = add 3 4             (* 7 *)
let greeting = greet "Alice"   (* "Hello, Alice!" *)
```

Parentheses are only needed to control grouping:

```ocaml
let result = double (add 3 4)  (* 14 *)
(* Without parens, this would be parsed as: (double add) 3 4 *)
```

## Anonymous Functions

Functions don't need names. The `fun` keyword creates anonymous functions:

```ocaml
let double = fun x -> x * 2
let add = fun x y -> x + y

(* These are equivalent to the named versions above *)
```

Anonymous functions are useful when passing functions as arguments:

```ocaml
List.map (fun x -> x * 2) [1; 2; 3]
(* [2; 4; 6] *)
```

## Currying and Partial Application

Here's something surprising: all OCaml functions take exactly one argument.

When you write `let add x y = x + y`, OCaml actually creates:

```ocaml
let add = fun x -> (fun y -> x + y)
```

A function that takes `x` and returns another function that takes `y`.

This is called **currying**, and it enables **partial application**:

```ocaml
let add x y = x + y
(* val add : int -> int -> int *)

let add5 = add 5
(* val add5 : int -> int *)

let result = add5 10  (* 15 *)
```

`add 5` doesn't give an error—it returns a new function waiting for the second argument.

## In Lasair: Validation Functions

From `lib/utilities.ml`:

```ocaml
(* Check if all bytes in a range are zero *)
let is_zero_range b start len =
  let rec check i =
    if i >= start + len then true
    else if Bytes.get b i <> '\x00' then false
    else check (i + 1)
  in
  check start

(* Check if an entire bytes value is zero *)
let is_all_zeros b =
  is_zero_range b 0 (Bytes.length b)
```

Notice how `is_all_zeros` partially applies `is_zero_range` with `0` and the length.

## Higher-Order Functions

Functions that take other functions as arguments are called **higher-order functions**. They're everywhere in functional programming:

```ocaml
(* Apply a function twice *)
let apply_twice f x = f (f x)

let result = apply_twice double 5  (* 20 *)
(* double (double 5) = double 10 = 20 *)

(* Apply a function to each element *)
let rec map f lst =
  match lst with
  | [] -> []
  | x :: xs -> f x :: map f xs

let doubled = map double [1; 2; 3]  (* [2; 4; 6] *)
```

## In Lasair: The Seq Module

Lasair uses "sequences" (arrays) everywhere. From `lib/notation.ml`:

```ocaml
type 'a seq = 'a array

let seq_map (f : 'a -> 'b) (s : 'a seq) : 'b seq =
  Array.map f s

let seq_filter (p : 'a -> bool) (s : 'a seq) : 'a seq =
  Array.of_list (List.filter p (Array.to_list s))

let seq_fold (f : 'b -> 'a -> 'b) (init : 'b) (s : 'a seq) : 'b =
  Array.fold_left f init s
```

These wrap OCaml's `Array` functions but use lasair's naming convention (`seq` for sequence, matching the Graypaper notation).

## Type Variables and Polymorphism

Notice the `'a` in the type signatures above. This is a **type variable**—it stands for "any type":

```ocaml
let identity x = x
(* val identity : 'a -> 'a *)

let first x y = x
(* val first : 'a -> 'b -> 'a *)

let swap (x, y) = (y, x)
(* val swap : 'a * 'b -> 'b * 'a *)
```

The function works for any type. This is **parametric polymorphism**—the function's behavior is the same regardless of the type.

## Function Composition

You can combine functions:

```ocaml
let compose f g x = f (g x)
(* val compose : ('b -> 'c) -> ('a -> 'b) -> 'a -> 'c *)

let double_then_add5 = compose (add 5) double
let result = double_then_add5 3  (* 11 *)
(* double 3 = 6, then add 5 = 11 *)
```

OCaml doesn't have a built-in composition operator, but you can define one:

```ocaml
let (>>) f g x = g (f x)  (* left-to-right *)
let (<<) f g x = f (g x)  (* right-to-left *)

let process = double >> add 5 >> string_of_int
let result = process 3  (* "11" *)
```

## Recursive Functions

To call a function from within itself, use `let rec`:

```ocaml
let rec factorial n =
  if n <= 1 then 1
  else n * factorial (n - 1)

let rec fibonacci n =
  if n <= 1 then n
  else fibonacci (n - 1) + fibonacci (n - 2)
```

## In Lasair: Tree Traversal

From `lib/merklization.ml` (simplified):

```ocaml
(* Hash a node in the Merkle tree *)
let rec hash_node node =
  match node with
  | Leaf data -> hash_leaf data
  | Branch (left, right) ->
      let left_hash = hash_node left in
      let right_hash = hash_node right in
      hash_branch left_hash right_hash
```

Recursive functions are essential for tree structures.

## Tail Recursion

Regular recursion can overflow the stack for large inputs. **Tail recursion** solves this:

```ocaml
(* Not tail-recursive: stack grows with each call *)
let rec sum_list lst =
  match lst with
  | [] -> 0
  | x :: xs -> x + sum_list xs

(* Tail-recursive: constant stack space *)
let sum_list_tail lst =
  let rec loop acc = function
    | [] -> acc
    | x :: xs -> loop (acc + x) xs
  in
  loop 0 lst
```

The difference: in the tail-recursive version, the recursive call is the **last thing** the function does. OCaml optimizes this into a loop.

## In Lasair: Validation Loops

From `lib/utilities.ml`:

```ocaml
(* Fisher-Yates shuffle - tail recursive *)
let fisher_yates_shuffle lst randoms =
  let arr = Array.of_list lst in
  let len = Array.length arr in
  let rec loop i =
    if i >= len - 1 then Array.to_list arr
    else begin
      let j = i + (randoms.(i) mod (len - i)) in
      let tmp = arr.(i) in
      arr.(i) <- arr.(j);
      arr.(j) <- tmp;
      loop (i + 1)
    end
  in
  loop 0
```

This shuffles a list using provided random values—used in lasair for validator shuffling.

## Labeled and Optional Arguments

For functions with many parameters, labels help:

```ocaml
let make_person ~name ~age ~city =
  Printf.sprintf "%s, %d, from %s" name age city

(* Call with labels in any order *)
let p = make_person ~age:30 ~name:"Alice" ~city:"Dublin"
```

Optional arguments have default values:

```ocaml
let greet ?(greeting="Hello") name =
  greeting ^ ", " ^ name

let a = greet "World"                    (* "Hello, World" *)
let b = greet ~greeting:"Hi" "World"     (* "Hi, World" *)
```

## Exercise: Function Types

Predict the type of each function:

```ocaml
let f x = x
let g x y = x
let h f x = f x
let i f g x = f (g x)
let j x = fun y -> x + y
```

<details>
<summary>Click to see answers</summary>

```ocaml
let f x = x
(* 'a -> 'a *)
(* Identity function *)

let g x y = x
(* 'a -> 'b -> 'a *)
(* Returns first argument, ignores second *)

let h f x = f x
(* ('a -> 'b) -> 'a -> 'b *)
(* Function application *)

let i f g x = f (g x)
(* ('b -> 'c) -> ('a -> 'b) -> 'a -> 'c *)
(* Function composition *)

let j x = fun y -> x + y
(* int -> int -> int *)
(* Same as: let j x y = x + y *)
```

</details>

## Exercise: Implement These Functions

```ocaml
(* 1. Apply a function n times *)
let rec apply_n f n x =
  (* Your code here *)

(* 2. Find the first element satisfying a predicate *)
let rec find_first p lst =
  (* Your code here - return option type *)

(* 3. Compose a list of functions *)
let compose_all funcs =
  (* Your code here *)
```

<details>
<summary>Click to see solutions</summary>

```ocaml
(* 1. Apply a function n times *)
let rec apply_n f n x =
  if n <= 0 then x
  else apply_n f (n - 1) (f x)

(* apply_n double 3 2 = 16 *)
(* double (double (double 2)) = double (double 4) = double 8 = 16 *)

(* 2. Find the first element satisfying a predicate *)
let rec find_first p lst =
  match lst with
  | [] -> None
  | x :: xs -> if p x then Some x else find_first p xs

(* find_first (fun x -> x > 5) [1;3;7;2;9] = Some 7 *)

(* 3. Compose a list of functions *)
let compose_all funcs =
  List.fold_right (fun f g x -> f (g x)) funcs (fun x -> x)

(* compose_all [double; add 1; double] 3 = 14 *)
(* double (add 1 (double 3)) = double (add 1 6) = double 7 = 14 *)
```

</details>

## Exercise: Explore Lasair

Open `lib/utilities.ml` and find:

1. A function that uses recursion
2. A function that takes another function as an argument
3. A function that uses partial application

## Key Takeaways

1. **Functions are values** - They can be passed around like integers or strings
2. **Currying** - Every function takes one argument; multi-argument functions return functions
3. **Partial application** - Apply some arguments now, the rest later
4. **Higher-order functions** - Functions that take or return other functions
5. **Tail recursion** - Recursive calls as the last operation enable optimization

## Next Up

Functions transform values, but how do we handle complex data with multiple cases? That's where pattern matching comes in: [Pattern Matching →](lesson.html?lesson=001-ocaml-foundations/03-pattern-matching)
