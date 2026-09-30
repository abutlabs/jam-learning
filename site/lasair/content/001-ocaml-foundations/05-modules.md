---
title: Modules and Signatures
duration: 35 min
---

# Modules and Signatures

OCaml's module system is one of its most powerful features. Modules let you organize code, hide implementation details, and create reusable abstractions. Think of modules as "namespaces with superpowers."

## Basic Modules

A module is a collection of definitions:

```ocaml
module Point = struct
  type t = { x: float; y: float }

  let origin = { x = 0.0; y = 0.0 }

  let create x y = { x; y }

  let distance p1 p2 =
    let dx = p2.x -. p1.x in
    let dy = p2.y -. p1.y in
    Float.sqrt (dx *. dx +. dy *. dy)

  let to_string p =
    Printf.sprintf "(%.2f, %.2f)" p.x p.y
end
```

Access module contents with dot notation:

```ocaml
let p1 = Point.create 3.0 4.0
let p2 = Point.origin
let d = Point.distance p1 p2  (* 5.0 *)
let s = Point.to_string p1    (* "(3.00, 4.00)" *)
```

## The Convention: Type `t`

OCaml convention names the "main type" of a module `t`:

```ocaml
module Stack = struct
  type 'a t = 'a list

  let empty = []

  let push x s = x :: s

  let pop = function
    | [] -> None
    | x :: xs -> Some (x, xs)

  let is_empty s = s = []
end

(* Usage *)
let s = Stack.empty
let s = Stack.push 1 s
let s = Stack.push 2 s
(* Stack.pop s = Some (2, [1]) *)
```

This lets you write `Stack.t` for the type, which reads naturally.

## Module Signatures

A **signature** (or **module type**) declares what a module must provide:

```ocaml
module type STACK = sig
  type 'a t

  val empty : 'a t
  val push : 'a -> 'a t -> 'a t
  val pop : 'a t -> ('a * 'a t) option
  val is_empty : 'a t -> bool
end
```

The signature specifies:
- Types (with or without their definition)
- Values with their types
- No implementation details

## Hiding Implementation with Signatures

Apply a signature to hide internals:

```ocaml
module Stack : STACK = struct
  type 'a t = 'a list

  let empty = []
  let push x s = x :: s
  let pop = function
    | [] -> None
    | x :: xs -> Some (x, xs)
  let is_empty s = s = []
end
```

Now users can't rely on `Stack.t` being a list:

```ocaml
let s = Stack.push 1 Stack.empty
(* This would fail: let s = [1] : 'a Stack.t *)
```

## Abstract Types

When a signature declares a type without its definition, it becomes **abstract**:

```ocaml
module type COUNTER = sig
  type t           (* Abstract - users don't know the representation *)
  val create : int -> t
  val increment : t -> t
  val value : t -> int
end

module Counter : COUNTER = struct
  type t = int     (* Hidden: users can't see this *)
  let create n = n
  let increment c = c + 1
  let value c = c
end
```

Users must go through the API. They can't directly manipulate the `int`:

```ocaml
let c = Counter.create 0
let c = Counter.increment c
let v = Counter.value c  (* 1 *)
(* This would fail: let c2 = c + 1 *)
```

## In Lasair: BOUNDED_NAT

From `lib/notation.ml`, bounded natural numbers use abstract types:

```ocaml
(** ℕ_n - Naturals less than n *)
module type BOUNDED_NAT = sig
  val max : int
  type t = private int  (* Can read as int, but can't create directly *)
  val of_int : int -> t option
  val of_int_exn : int -> t
  val to_int : t -> int
end
```

The `private` keyword allows reading the representation but not creating values directly—you must use `of_int` or `of_int_exn`, which validate the bounds.

## In Lasair: FIXED_BLOB

Another signature from `lib/notation.ml`:

```ocaml
(** 𝔹_n - Blob of exactly n octets *)
module type FIXED_BLOB = sig
  val size : int
  type t = private bytes
  val of_bytes : bytes -> t option
  val of_bytes_exn : bytes -> t
  val to_bytes : t -> bytes
  val zero : t
end
```

This ensures blobs are exactly the right size. You can't accidentally create a 31-byte hash when you need 32 bytes.

## Nested Modules

Modules can contain other modules:

```ocaml
module Geometry = struct
  module Point = struct
    type t = { x: float; y: float }
    let create x y = { x; y }
  end

  module Circle = struct
    type t = { center: Point.t; radius: float }
    let create center radius = { center; radius }
    let area c = Float.pi *. c.radius *. c.radius
  end
end

let p = Geometry.Point.create 0.0 0.0
let c = Geometry.Circle.create p 5.0
```

## Opening Modules

Use `open` to bring module contents into scope:

```ocaml
(* Global open - use sparingly *)
open Printf

let msg = sprintf "Hello, %s!" "world"

(* Local open - preferred *)
let msg =
  let open Printf in
  sprintf "Hello, %s!" "world"

(* Inline open syntax *)
let msg = Printf.(sprintf "Hello, %s!" "world")
```

## In Lasair: Module Organization

The `Notation` module in lasair uses nested modules to organize related functionality:

```ocaml
(** Sets - unordered unique elements *)
module Set = struct
  type 'a t = 'a list

  let empty : 'a t = []

  let singleton (x : 'a) : 'a t = [x]

  let mem (x : 'a) (s : 'a t) : bool = List.mem x s

  let add (x : 'a) (s : 'a t) : 'a t =
    if mem x s then s else x :: s

  let union (a : 'a t) (b : 'a t) : 'a t =
    List.fold_left (fun acc x -> add x acc) a b

  (* ... more operations ... *)
end

(** Dictionaries *)
module Dict = struct
  type ('k, 'v) t = ('k * 'v) list

  let empty : ('k, 'v) t = []

  let get (k : 'k) (d : ('k, 'v) t) : 'v option =
    List.assoc_opt k d

  (* ... more operations ... *)
end
```

Usage is clean and namespaced:

```ocaml
open Notation

let s = Set.empty |> Set.add 1 |> Set.add 2
let d = Dict.empty |> Dict.set "key" "value"
```

## Include vs Open

**`open`** brings names into scope for the current file/block:

```ocaml
open List
let doubled = map (fun x -> x * 2) [1; 2; 3]
```

**`include`** copies definitions into the current module:

```ocaml
module ExtendedList = struct
  include List  (* All of List's functions are now in ExtendedList *)

  (* Add new functions *)
  let sum = fold_left (+) 0
  let product = fold_left ( * ) 1
end

let s = ExtendedList.sum [1; 2; 3; 4]  (* 10 *)
```

## Module Aliases

Create shorter names for long module paths:

```ocaml
module L = List
module S = String
module Printf = Printf

let words = S.split_on_char ' ' "hello world"
let lengths = L.map S.length words
```

In lasair test files:

```ocaml
module Hash = Lasair.Notation.Hash
module WP = Lasair.Work_packages
```

## Separate Interface Files

In larger projects, modules are split into:
- `foo.ml` - the implementation
- `foo.mli` - the interface (signature)

```ocaml
(* stack.mli *)
type 'a t
val empty : 'a t
val push : 'a -> 'a t -> 'a t
val pop : 'a t -> ('a * 'a t) option

(* stack.ml *)
type 'a t = 'a list
let empty = []
let push x s = x :: s
let pop = function
  | [] -> None
  | x :: xs -> Some (x, xs)
```

The `.mli` file automatically applies a signature to the `.ml` file.

## First-Class Modules

Modules can be values (advanced topic):

```ocaml
module type SHOWABLE = sig
  type t
  val show : t -> string
end

let print_showable (type a) (module M : SHOWABLE with type t = a) (x : a) =
  print_endline (M.show x)

module IntShow = struct
  type t = int
  let show = string_of_int
end

let () = print_showable (module IntShow) 42
```

This is used in lasair for hash functions and other configurable components.

## In Lasair: Host Call Identifiers

From `lib/pvm_host.ml`, a module organizing constants:

```ocaml
(** Host call identifiers -- GP 0.8.0 pvm_invocations.tex. grow_heap = 1 was
    inserted after gas, shifting every later identifier by one vs 0.7.2. *)
module Id = struct
  let gas = 0
  let grow_heap = 1
  let fetch = 2
  let lookup = 3
  let read = 4
  let write = 5
  let info = 6
  let historical_lookup = 7
  let export = 8
  let machine = 9
  let peek = 10
  let poke = 11
  let pages = 12
  let invoke = 13
  let expunge = 14
  let bless = 15
  let assign = 16
  let designate = 17
  let checkpoint = 18
  let new_service = 19
  let upgrade = 20
  let transfer = 21
  let eject = 22
  let query = 23
  let solicit = 24
  let forget = 25
  let yield = 26
  let provide = 27
  (* ... *)
end
```

Clean namespacing: `Pvm_host.Id.lookup` instead of `host_lookup`. When the Graypaper renumbered the host calls (v0.8.0 inserted `grow_heap` at 1), this one module was the place to change.

## Exercise: Create a Counter Module

Implement a counter module with a hidden representation:

```ocaml
module type COUNTER = sig
  type t
  val create : int -> t
  val increment : t -> t
  val decrement : t -> t
  val value : t -> int
  val reset : t -> t
end

module Counter : COUNTER = struct
  (* Your implementation here *)
end

(* Test your module *)
let c = Counter.create 5
let c = Counter.increment c
let c = Counter.increment c
let v = Counter.value c  (* Should be 7 *)
let c = Counter.reset c
let v = Counter.value c  (* Should be 0 *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
module type COUNTER = sig
  type t
  val create : int -> t
  val increment : t -> t
  val decrement : t -> t
  val value : t -> int
  val reset : t -> t
end

module Counter : COUNTER = struct
  type t = { count: int; initial: int }

  let create n = { count = n; initial = n }
  let increment c = { c with count = c.count + 1 }
  let decrement c = { c with count = c.count - 1 }
  let value c = c.count
  let reset c = { c with count = 0 }
end

(* Alternative simpler implementation *)
module SimpleCounter : COUNTER = struct
  type t = int
  let create n = n
  let increment c = c + 1
  let decrement c = c - 1
  let value c = c
  let reset _ = 0
end
```

</details>

## Exercise: Extend a Module

Use `include` to extend the List module:

```ocaml
module MyList = struct
  include List

  (* Add these functions: *)

  (* sum: int list -> int *)
  let sum lst = (* your code *)

  (* product: int list -> int *)
  let product lst = (* your code *)

  (* last: 'a list -> 'a option *)
  let last lst = (* your code *)

  (* take: int -> 'a list -> 'a list (first n elements) *)
  let rec take n lst = (* your code *)
end

(* Tests *)
let _ = MyList.sum [1; 2; 3; 4]      (* 10 *)
let _ = MyList.product [1; 2; 3; 4]  (* 24 *)
let _ = MyList.last [1; 2; 3]        (* Some 3 *)
let _ = MyList.take 2 [1; 2; 3; 4]   (* [1; 2] *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
module MyList = struct
  include List

  let sum lst = fold_left (+) 0 lst

  let product lst = fold_left ( * ) 1 lst

  let rec last = function
    | [] -> None
    | [x] -> Some x
    | _ :: xs -> last xs

  let rec take n lst =
    match (n, lst) with
    | (0, _) | (_, []) -> []
    | (n, x :: xs) -> x :: take (n - 1) xs
end
```

</details>

## Exercise: Abstract Set Type

Create a set module with an abstract type that enforces uniqueness:

```ocaml
module type SET = sig
  type 'a t
  val empty : 'a t
  val add : 'a -> 'a t -> 'a t
  val mem : 'a -> 'a t -> bool
  val remove : 'a -> 'a t -> 'a t
  val size : 'a t -> int
  val to_list : 'a t -> 'a list
end

module Set : SET = struct
  (* Implement using a list that maintains uniqueness *)
end
```

<details>
<summary>Click to see solution</summary>

```ocaml
module type SET = sig
  type 'a t
  val empty : 'a t
  val add : 'a -> 'a t -> 'a t
  val mem : 'a -> 'a t -> bool
  val remove : 'a -> 'a t -> 'a t
  val size : 'a t -> int
  val to_list : 'a t -> 'a list
end

module Set : SET = struct
  type 'a t = 'a list

  let empty = []

  let mem x s = List.mem x s

  let add x s =
    if mem x s then s else x :: s

  let remove x s =
    List.filter (fun y -> y <> x) s

  let size s = List.length s

  let to_list s = s
end

(* Test *)
let s = Set.empty
let s = Set.add 1 s
let s = Set.add 2 s
let s = Set.add 1 s  (* No duplicate! *)
let _ = Set.size s   (* 2 *)
let _ = Set.to_list s (* [2; 1] or [1; 2] *)
```

</details>

## Exercise: Explore Lasair Modules

Open `lib/notation.ml` and examine:

1. How is the `Set` module structured?
2. What functions does `Dict` provide?
3. Find an example of `include` or nested modules in the codebase.

## Key Takeaways

1. **Modules** group related types and functions
2. **Signatures** declare what a module provides (the interface)
3. **Abstract types** hide implementation details
4. **`open`** brings names into scope temporarily
5. **`include`** copies definitions into the current module
6. **Convention**: name the main type `t`
7. **Separate files**: `.ml` for implementation, `.mli` for interface

Modules are how OCaml scales to large codebases. Every `.ml` file is implicitly a module.

## Next Up

What if you want a module that works with different types? That's what functors are for: [Functors →](lesson.html?lesson=001-ocaml-foundations/06-functors)
