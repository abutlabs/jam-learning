---
title: "3.3 Sets"
duration: 2 min
video: https://www.youtube.com/watch?v=OqbSSkJFOIk
---

# Graypaper Section 3.3: Sets

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section covers set notation in the Graypaper, including custom operators that make blockchain specification cleaner.

## What This Lecture Covers

- Set disjointness operator
- The question mark operator (optional sets)
- Error representation (∇)
- Boolean operations on sets

## Set Disjointness

The **disjointness** operator checks if two sets share no elements:

```
A ⊥ B  means  A ∩ B = ∅

"A and B are disjoint - they have no elements in common"
```

<div class="callout callout-info">

**ELI5: Disjointness**

Think of two circles that don't overlap at all:
- Circle A has {1, 2, 3}
- Circle B has {4, 5, 6}
- A ⊥ B → True (nothing in common)

But:
- Circle A has {1, 2, 3}
- Circle C has {3, 4, 5}
- A ⊥ C → False (3 is in both)

</div>

## The Question Mark Operator

The **question mark** operator converts a set into an optional:

```
S? = S ∪ {∅}

"The set S, or nothing"
```

This is used when a value might be present or absent.

<div class="lasair-connection">

### In Lasair: Option Types

The question mark operator maps directly to OCaml's `option` type:

```ocaml
(* lib/notation.ml - Optional values *)

(** S? in graypaper = option type in OCaml *)
type 'a option = None | Some of 'a

(** Set membership with optional result *)
let find_opt predicate set =
  List.find_opt predicate (Set.elements set)

(** Usage in definitions: *)
type maybe_hash = Hash.t option
(* hash? in graypaper notation *)
```

Real example from Lasair:

```ocaml
(* lib/definitions.ml - Optional fields *)

type work_result = {
  service_id: service_id;
  code_hash: hash;
  payload_hash: hash;
  gas_used: int64;
  output: bytes option;  (* output? in graypaper - might not exist *)
}
```

</div>

## Error Representation (∇)

The Graypaper uses **∇ (nabla/del)** to represent an error state:

```
∇ = error/invalid/panic

Different from ∅ (nothing/null/absent)
```

<div class="callout callout-warning">

**∅ vs ∇**

These are distinct concepts:
- **∅ (empty set)** = "nothing here" (valid absence)
- **∇ (error)** = "something went wrong" (invalid state)

Think of it like:
- ∅ = Your mailbox is empty (normal)
- ∇ = Your mailbox is on fire (error)

</div>

<div class="lasair-connection">

### In Lasair: Result Types

Lasair uses OCaml's `result` type to distinguish success, absence, and error:

```ocaml
(* Error handling in Lasair *)

(** Three-way result: value, nothing, or error *)
type ('a, 'e) result =
  | Ok of 'a      (* Success with value *)
  | Error of 'e   (* Error (∇ in graypaper) *)

(** For optional values that might error: *)
type 'a or_error = ('a option, string) result
(* Ok (Some x)  → value present
   Ok None      → value absent (∅)
   Error msg    → error (∇) *)

(* Real usage in definitions.ml: *)
let lookup_preimage hash storage =
  match Map.find_opt hash storage.preimages with
  | Some data -> Ok (Some data)  (* Found *)
  | None ->
    if Set.mem hash storage.requested
    then Ok None                  (* Not found but requested - ∅ *)
    else Error "invalid lookup"   (* Never requested - ∇ *)
```

</div>

## Set Builder Notation

Standard set builder notation with Graypaper conventions:

```
{ x ∈ S | P(x) }

"All x from set S where predicate P holds"
```

<div class="lasair-connection">

### In Lasair: List/Set Filtering

```ocaml
(* Set builder → filter in OCaml *)

(** { x ∈ S | P(x) } *)
let filter predicate set =
  Set.filter predicate set

(** With lists: *)
let validators_in_core core validators =
  List.filter (fun v -> v.assigned_core = core) validators
(* { v ∈ validators | v.core = core } *)

(** Set comprehension with transformation: *)
let hashes = List.filter_map (fun item ->
  if item.valid then Some (hash item)
  else None
) items
(* { hash(x) | x ∈ items ∧ valid(x) } *)
```

</div>

## Boolean Sets

The Graypaper treats booleans as a two-element set:

```
𝔹 = {true, false}
   = {⊤, ⊥}
```

Where ⊤ (top) is true and ⊥ (bottom) is false.

## Key Takeaways

1. **Disjointness (⊥)** - Sets with no common elements
2. **Question mark (?)** - Adds "nothing" to a set (optional)
3. **Error (∇)** - Distinct from absence (∅)
4. **Set builder** - Standard mathematical notation
5. **Booleans as sets** - {true, false} with ⊤ and ⊥

## What's Next

Continue with **Section 3.4: Numbers** to understand numeric types in the Graypaper.

[Next: 3.4 Numbers &rarr;](lesson.html?lesson=011-graypaper-lectures/11-numbers)
