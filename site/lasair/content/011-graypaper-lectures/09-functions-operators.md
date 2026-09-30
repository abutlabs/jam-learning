---
title: "3.2 Functions and Operators"
duration: 2 min
video: https://www.youtube.com/watch?v=qOw4XOu_n_w
---

# Graypaper Section 3.2: Functions and Operators

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines the custom operators and functions used throughout the Graypaper, building on standard mathematical notation.

## What This Lecture Covers

- The "proceeds" relation for recursive definitions
- The substitutive nothing function (handling null values)
- Function composition and application

## The Proceeds Relation (≺)

The **proceeds relation** (≺) indicates that one function is defined based on another:

```
f ≺ g means:
"Function f is defined in terms of function g"
```

This is used when defining recursive or mutually dependent functions. It establishes a dependency order.

<div class="callout callout-info">

**ELI5: The Proceeds Relation**

Think of it like a recipe that references another recipe:
- "Chocolate cake (≺ frosting)" means the cake recipe depends on the frosting recipe
- You need to understand frosting before you can complete the cake

</div>

## The Substitutive Nothing Function

The **substitutive nothing** function handles null/empty values elegantly:

```
Given values that might be ∅ (nothing/null):
  - Return the first non-null value
  - If all values are null, return null

Example:
  substitute(∅, ∅, 42) → 42
  substitute(∅, 7, 42) → 7
  substitute(∅, ∅, ∅) → ∅
```

This is essentially a chain of fallbacks.

<div class="lasair-connection">

### In Lasair: Option Chaining

OCaml's `option` type handles "maybe null" values. The substitutive nothing function maps to option chaining:

```ocaml
(* lib/notation.ml - Substitutive nothing as option operations *)

(** First non-None value, or None if all None *)
let substitute_nothing values =
  List.find_opt Option.is_some values
  |> Option.join

(* Or using the standard library: *)
let first_some a b = match a with
  | Some _ -> a
  | None -> b

(* Chain multiple fallbacks: *)
let rec first_of = function
  | [] -> None
  | None :: rest -> first_of rest
  | (Some _ as x) :: _ -> x

(* Usage: *)
let result = first_of [None; None; Some 42]  (* → Some 42 *)
```

In practice, Lasair often uses OCaml's built-in option handling:

```ocaml
(* Real code from lib/definitions.ml *)

(** Get value with fallback *)
let get_or_default opt default = match opt with
  | Some v -> v
  | None -> default

(** Get value from map with fallback *)
let lookup_or key map default =
  match Map.find_opt key map with
  | Some v -> v
  | None -> default
```

</div>

## Standard Operators Extended

The Graypaper extends standard mathematical operators for blockchain-specific needs:

### Conditional Application

```
f(x) if P else y
```

Means: Apply function f to x only if predicate P is true, otherwise return y.

### Modular Arithmetic

```
x mod n  →  Remainder when x divided by n
⌊x/n⌋    →  Integer division (floor)
```

### Sequence Operations

```
|s|      →  Length of sequence s
s[i]     →  i-th element of sequence s
s ++ t   →  Concatenation of sequences s and t
```

<div class="lasair-connection">

### In Lasair: Sequence Operations

```ocaml
(* lib/notation.ml - Sequence operations *)

(** Sequence length: |s| *)
let length = List.length

(** Element access: s[i] *)
let get s i = List.nth s i

(** Concatenation: s ++ t *)
let concat = List.append
let (++) = concat

(** With bounds checking: *)
let get_opt s i =
  if i >= 0 && i < List.length s
  then Some (List.nth s i)
  else None
```

For byte sequences specifically:

```ocaml
(* Bytes operations used throughout Lasair *)

(** |b| for bytes *)
let byte_length = Bytes.length

(** b[i] for bytes *)
let byte_get b i = Bytes.get b i |> Char.code

(** b ++ c for bytes *)
let byte_concat b c = Bytes.cat b c
```

</div>

## Function Composition

The Graypaper uses standard function composition:

```
(f ∘ g)(x) = f(g(x))
```

"Apply g first, then f."

<div class="lasair-connection">

### In Lasair: Composition Operators

```ocaml
(* Function composition in OCaml *)

(** f ∘ g *)
let compose f g x = f (g x)
let (%) f g x = f (g x)

(* Usage: *)
let double x = x * 2
let add_one x = x + 1

let double_then_add = add_one % double
(* double_then_add 5 → 11 *)

(* Or with the |> operator for readability: *)
let result = 5 |> double |> add_one  (* → 11 *)
```

</div>

## Key Takeaways

1. **Proceeds relation (≺)** - Establishes function dependencies
2. **Substitutive nothing** - First non-null value in a chain
3. **Conditional application** - Function applied only when predicate holds
4. **Standard operators** - Extended for sequences and bytes
5. **Function composition** - Standard mathematical notation

## What's Next

Continue with **Section 3.3: Sets** to understand set notation in the Graypaper.

[Next: 3.3 Sets &rarr;](lesson.html?lesson=011-graypaper-lectures/10-sets)
