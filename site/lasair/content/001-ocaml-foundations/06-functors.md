---
title: Functors
duration: 40 min
---

# Functors

Functors are "modules that take modules as arguments." They let you write parameterized modules—code that works with any type meeting certain requirements. Think of them as functions at the module level.

## The Problem Functors Solve

Suppose you want a Set module that works with any element type, but needs to know how to compare elements:

```ocaml
(* This won't work - how do we compare elements? *)
module Set = struct
  type 'a t = 'a list
  let add x s = if List.mem x s then s else x :: s
  (* List.mem uses structural equality, which may not be what we want *)
end
```

For some types (like custom records), you need custom comparison. Functors let you parameterize the module by a comparison function.

## Basic Functor Syntax

A functor takes a module as argument and returns a module:

```ocaml
(* Input signature: what the argument module must provide *)
module type COMPARABLE = sig
  type t
  val compare : t -> t -> int
end

(* The functor *)
module MakeSet (Elem : COMPARABLE) = struct
  type elt = Elem.t
  type t = elt list

  let empty = []

  let mem x s =
    List.exists (fun y -> Elem.compare x y = 0) s

  let add x s =
    if mem x s then s else x :: s

  let to_list s = s
end
```

## Using Functors

Apply a functor by passing a module that matches the required signature:

```ocaml
(* Create a module for integer sets *)
module IntComparable = struct
  type t = int
  let compare = Int.compare
end

module IntSet = MakeSet(IntComparable)

let s = IntSet.empty
let s = IntSet.add 3 s
let s = IntSet.add 1 s
let s = IntSet.add 2 s
let has_2 = IntSet.mem 2 s  (* true *)
```

## Inline Module Arguments

You can create the argument module inline:

```ocaml
module StringSet = MakeSet(struct
  type t = string
  let compare = String.compare
end)

let names = StringSet.empty
let names = StringSet.add "Alice" names
let names = StringSet.add "Bob" names
```

## In Lasair: Bounded Naturals

From `lib/notation.ml`, `Nat_bounded` is a functor that creates modules for bounded integers:

```ocaml
(** ℕ_n - Naturals less than n *)
module type BOUNDED_NAT = sig
  val max : int
  type t = private int
  val of_int : int -> t option
  val of_int_exn : int -> t
  val to_int : t -> int
end

module Nat_bounded (M : sig val max : int end) : BOUNDED_NAT = struct
  let max = M.max
  type t = int

  let of_int n =
    if n >= 0 && n < max then Some n else None

  let of_int_exn n =
    match of_int n with
    | Some x -> x
    | None -> invalid_arg (Printf.sprintf "Nat_bounded: %d not in [0, %d)" n max)

  let to_int x = x
end
```

The functor takes a module with just `max : int` and produces a full bounded integer module.

## Creating Bounded Types

Apply the functor with different bounds:

```ocaml
(** Common bounded naturals *)
module N2 = Nat_bounded(struct let max = 2 end)      (* 𝔹ool as 0/1 *)
module N256 = Nat_bounded(struct let max = 256 end)  (* Octet values *)
module N32 = Nat_bounded(struct let max = 32 end)    (* Small indices *)

(* Usage *)
let bit = N2.of_int_exn 1       (* Valid: 0 or 1 *)
let byte = N256.of_int_exn 255  (* Valid: 0-255 *)
let idx = N32.of_int_exn 31     (* Valid: 0-31 *)

(* These would fail at runtime *)
(* let bad = N2.of_int_exn 5 *)    (* Raises exception *)
(* let bad = N256.of_int_exn 300 *) (* Raises exception *)
```

## In Lasair: Fixed-Size Blobs

Another functor from `lib/notation.ml` creates fixed-size byte arrays:

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

module Blob_fixed (M : sig val size : int end) : FIXED_BLOB = struct
  let size = M.size
  type t = bytes

  let of_bytes b =
    if Bytes.length b = size then Some b else None

  let of_bytes_exn b =
    match of_bytes b with
    | Some x -> x
    | None ->
      invalid_arg (Printf.sprintf "Blob_fixed: expected %d bytes, got %d"
                     size (Bytes.length b))

  let to_bytes x = x

  let zero = Bytes.make size '\x00'
end
```

## Creating Blob Types

Apply the functor for different sizes:

```ocaml
(** ℍ - 256-bit hash = 𝔹₃₂ *)
module Hash = Blob_fixed(struct let size = 32 end)
type hash = Hash.t

(** Common blob sizes *)
module Blob64 = Blob_fixed(struct let size = 64 end)   (* Ed25519 signatures *)
module Blob96 = Blob_fixed(struct let size = 96 end)   (* Bandersnatch signatures *)
module Blob144 = Blob_fixed(struct let size = 144 end) (* Ring roots, BLS keys *)

(* From lib/definitions.ml *)
module Blob784 = Blob_fixed(struct let size = 784 end)
module Segment = Blob_fixed(struct let size = Constants.c_segment_size end)
```

Each module enforces its size constraint at creation time.

## Type Safety from Functors

The key benefit: different instantiations create **different types**:

```ocaml
let hash = Hash.of_bytes_exn (Bytes.make 32 '\x00')
let sig64 = Blob64.of_bytes_exn (Bytes.make 64 '\x00')

(* These are different types - can't be confused *)
(* let bad : Hash.t = sig64 *)  (* Type error! *)
```

Even though both are bytes underneath, the type system prevents mixing them up.

## Digestif: A Real-World Example

Lasair uses the Digestif library for hashing. It provides a functor for creating hash modules:

```ocaml
(* From external library Digestif *)
module Make_BLAKE2B (Config : sig val digest_size : int end) : sig
  type t
  val digest_bytes : bytes -> t
  val to_raw_string : t -> string
  (* ... more functions ... *)
end

(* Usage in lasair *)
let module Blake2b256 = Digestif.Make_BLAKE2B(struct let digest_size = 32 end) in
let hash = Blake2b256.digest_bytes data
```

The same functor creates BLAKE2B hash functions with different output sizes.

## In Lasair: Hash Usage

From `lib/merklization.ml`:

```ocaml
module Blake2b256 = Digestif.Make_BLAKE2B(struct let digest_size = 32 end)

let hash_bytes (data : bytes) : bytes =
  let digest = Blake2b256.digest_bytes data in
  Bytes.of_string (Blake2b256.to_raw_string digest)
```

And from conformance tests:

```ocaml
let blake2b_hash data =
  let module B2b = Digestif.Make_BLAKE2B(struct let digest_size = 32 end) in
  let digest = B2b.digest_bytes data in
  Bytes.of_string (B2b.to_raw_string digest)
```

## Functor Signatures

You can specify the output signature of a functor:

```ocaml
module type SET = sig
  type elt
  type t
  val empty : t
  val add : elt -> t -> t
  val mem : elt -> t -> bool
  val to_list : t -> elt list
end

module MakeSet (Elem : COMPARABLE) : SET with type elt = Elem.t = struct
  type elt = Elem.t
  type t = elt list

  let empty = []
  let mem x s = List.exists (fun y -> Elem.compare x y = 0) s
  let add x s = if mem x s then s else x :: s
  let to_list s = s
end
```

The `with type elt = Elem.t` clause exposes the relationship between input and output types.

## Functors with Multiple Arguments

Functors can take multiple module arguments:

```ocaml
module type KEY = sig
  type t
  val compare : t -> t -> int
end

module type VALUE = sig
  type t
  val default : t
end

module MakeCache (K : KEY) (V : VALUE) = struct
  type key = K.t
  type value = V.t
  type t = (key * value) list

  let empty = []

  let get k cache =
    match List.assoc_opt k cache with
    | Some v -> v
    | None -> V.default

  let set k v cache =
    (k, v) :: List.remove_assoc k cache
end

module StringIntCache = MakeCache
  (struct type t = string let compare = String.compare end)
  (struct type t = int let default = 0 end)
```

## Why Functors Matter

1. **Code Reuse**: Write generic data structures once
2. **Type Safety**: Different instantiations create incompatible types
3. **Abstraction**: Hide implementation, expose interface
4. **Configuration**: Parameterize behavior without runtime overhead

In lasair, functors ensure:
- Hashes are exactly 32 bytes
- Signatures are exactly 64 or 96 bytes
- Bounded integers stay in valid ranges
- All enforced at compile time where possible

## Standard Library Functors

OCaml's standard library uses functors extensively:

```ocaml
(* Map functor for ordered key-value maps *)
module StringMap = Map.Make(String)

let m = StringMap.empty
let m = StringMap.add "key" 42 m
let v = StringMap.find "key" m  (* 42 *)

(* Set functor for ordered sets *)
module IntSet = Set.Make(Int)

let s = IntSet.empty
let s = IntSet.add 1 s |> IntSet.add 2 |> IntSet.add 3
let has_2 = IntSet.mem 2 s  (* true *)
```

## Exercise: Create a Bounded Integer Functor

Write a functor that creates bounded integers with a minimum and maximum:

```ocaml
module type RANGE_CONFIG = sig
  val min : int
  val max : int
end

module type BOUNDED_RANGE = sig
  type t
  val of_int : int -> t option
  val to_int : t -> int
  val min_val : t
  val max_val : t
end

module MakeBoundedRange (Config : RANGE_CONFIG) : BOUNDED_RANGE = struct
  (* Your implementation *)
end

(* Test: Create a type for hours (0-23) *)
module Hour = MakeBoundedRange(struct let min = 0 let max = 23 end)

let noon = Hour.of_int 12    (* Some ... *)
let invalid = Hour.of_int 25 (* None *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
module type RANGE_CONFIG = sig
  val min : int
  val max : int
end

module type BOUNDED_RANGE = sig
  type t
  val of_int : int -> t option
  val of_int_exn : int -> t
  val to_int : t -> int
  val min_val : t
  val max_val : t
end

module MakeBoundedRange (Config : RANGE_CONFIG) : BOUNDED_RANGE = struct
  type t = int

  let of_int n =
    if n >= Config.min && n <= Config.max then Some n
    else None

  let of_int_exn n =
    match of_int n with
    | Some x -> x
    | None ->
      invalid_arg (Printf.sprintf "Value %d not in range [%d, %d]"
                     n Config.min Config.max)

  let to_int x = x

  let min_val = Config.min
  let max_val = Config.max
end

(* Test *)
module Hour = MakeBoundedRange(struct let min = 0 let max = 23 end)
module Month = MakeBoundedRange(struct let min = 1 let max = 12 end)
module Percentage = MakeBoundedRange(struct let min = 0 let max = 100 end)

let noon = Hour.of_int 12        (* Some 12 *)
let invalid = Hour.of_int 25     (* None *)
let jan = Month.of_int_exn 1     (* 1 *)
let full = Percentage.of_int 100 (* Some 100 *)
```

</details>

## Exercise: Create a Vector Functor

Create a functor for fixed-size vectors (like Blob_fixed but for any element type):

```ocaml
module type SIZE_CONFIG = sig
  val size : int
end

module type FIXED_VECTOR = sig
  type elt
  type t
  val of_list : elt list -> t option
  val to_list : t -> elt list
  val get : int -> t -> elt option
  val length : t -> int
end

module MakeFixedVector (Size : SIZE_CONFIG) (Elt : sig type t end)
  : FIXED_VECTOR with type elt = Elt.t = struct
  (* Your implementation *)
end
```

<details>
<summary>Click to see solution</summary>

```ocaml
module type SIZE_CONFIG = sig
  val size : int
end

module type FIXED_VECTOR = sig
  type elt
  type t
  val of_list : elt list -> t option
  val of_list_exn : elt list -> t
  val to_list : t -> elt list
  val get : int -> t -> elt option
  val length : t -> int
end

module MakeFixedVector (Size : SIZE_CONFIG) (Elt : sig type t end)
  : FIXED_VECTOR with type elt = Elt.t = struct

  type elt = Elt.t
  type t = elt array

  let of_list lst =
    if List.length lst = Size.size then Some (Array.of_list lst)
    else None

  let of_list_exn lst =
    match of_list lst with
    | Some v -> v
    | None ->
      invalid_arg (Printf.sprintf "Expected %d elements, got %d"
                     Size.size (List.length lst))

  let to_list = Array.to_list

  let get i v =
    if i >= 0 && i < Size.size then Some v.(i)
    else None

  let length _ = Size.size
end

(* Test: 3D vector of floats *)
module Vec3 = MakeFixedVector(struct let size = 3 end)(struct type t = float end)

let v = Vec3.of_list_exn [1.0; 2.0; 3.0]
let x = Vec3.get 0 v  (* Some 1.0 *)
let l = Vec3.length v (* 3 *)

(* 2D vector of ints *)
module Point2D = MakeFixedVector(struct let size = 2 end)(struct type t = int end)
let p = Point2D.of_list_exn [10; 20]
```

</details>

## Exercise: Explore Lasair Functors

Examine the lasair codebase:

1. Find `Nat_bounded` in `lib/notation.ml`. How many different bounded integer types are created?

2. Find `Blob_fixed` usage. What blob sizes are defined in `lib/definitions.ml`?

3. Look for uses of `Digestif.Make_BLAKE2B`. How is it configured?

## Functor Best Practices

1. **Keep argument signatures minimal** - only require what you need
2. **Document the contract** - what does the functor expect and provide?
3. **Use type constraints** - `with type` makes the API clearer
4. **Prefer functors over runtime configuration** - catch errors at compile time

## Key Takeaways

1. **Functors** are functions from modules to modules
2. **Parameterize by capability** - what operations does your code need?
3. **Type safety** - different instantiations create different types
4. **Real-world use** - hash functions, data structures, bounded types
5. **Lasair examples** - `Nat_bounded`, `Blob_fixed`, `Digestif.Make_BLAKE2B`

Functors are one of OCaml's most powerful abstraction tools. They let you write generic, reusable code while maintaining full type safety.

## What's Next?

You've completed the OCaml foundations. You now understand:
- Types and values
- Functions and higher-order programming
- Pattern matching
- Records and variants
- Modules and signatures
- Functors

With these tools, you're ready to dive into lasair's architecture. The next module covers the JAM protocol concepts that lasair implements.
