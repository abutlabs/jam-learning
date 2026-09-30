---
title: "3.6 Tuples"
duration: 2 min
video: https://www.youtube.com/watch?v=irfFhAp3OxA
---

# Graypaper Section 3.6: Tuples

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines tuples - structured data types with named components that are fundamental to JAM's type system.

## What This Lecture Covers

- Tuple definition and notation
- Named components (fields)
- Subscript access notation
- Product types (Cartesian products)

## What Is a Tuple?

A **tuple** is an ordered collection of values where each position has a specific meaning:

```
(a: ℕ, b: ℕ)

A tuple with two natural number components named 'a' and 'b'.
```

Example value:
```
T = (a: 3, b: 5)

T_a = 3  (access component a)
T_b = 5  (access component b)
```

<div class="callout callout-info">

**ELI5: Tuples vs Sequences**

- **Sequence**: All elements are the same type, variable length. Like a shopping list.
- **Tuple**: Each position has a fixed type and meaning. Like a form with labeled fields (Name, Age, Address).

</div>

## Named Tuple Notation

The Graypaper uses named tuples extensively:

```
Block header = (
  parent: ℍ,          -- Parent block hash
  slot: ℕ,            -- Time slot number
  priorState: ℍ,      -- Previous state root
  extrinsicHash: ℍ    -- Extrinsic data hash
)
```

Access uses subscript notation:
```
header_parent  -- Get parent hash
header_slot    -- Get slot number
```

## Product Types

The traditional mathematical notation for "pair of types":

```
A × B = set of pairs (a, b) where a ∈ A and b ∈ B

ℕ × ℕ = pairs of natural numbers
(3, 5) ∈ ℕ × ℕ
```

The Graypaper typically uses named tuples instead:
```
(first: ℕ, second: ℕ) is clearer than ℕ × ℕ
```

<div class="lasair-connection">

### In Lasair: OCaml Records

Lasair implements tuples using OCaml's record types:

```ocaml
(* conformance/trace_types.ml, annotated with the Graypaper symbols *)

(** Block header: H in the spec *)
type trace_header = {
  parent: bytes;                             (* H_P - parent block hash *)
  parent_state_root: bytes;                  (* H_R - prior state root *)
  extrinsic_hash: bytes;                     (* H_X - extrinsic hash *)
  slot: int;                                 (* H_T - time slot *)
  epoch_mark: trace_epoch_mark option;       (* H_E *)
  tickets_mark: header_ticket list option;   (* H_W *)
  author_index: int;                         (* H_I - index into κ' *)
  entropy_source: bytes;                     (* H_V - VRF signature *)
  offenders_mark: bytes list;                (* H_O - Ed25519 keys *)
  seal: bytes;                               (* H_S *)
}

(* Access fields with dot notation - equivalent to subscript *)
let parent_hash h = h.parent
let slot_number h = h.slot
```

</div>

## Tuple Construction

Creating a tuple by specifying all components:

```
T = (a: 3, b: 5)
```

Or by updating an existing tuple:
```
T' = T except (a: 7)

Result: T' = (a: 7, b: 5)
```

<div class="lasair-connection">

### In Lasair: Record Update Syntax

```ocaml
(* OCaml's functional record update *)

let header = {
  parent = parent_hash;
  slot = 42;
  prior_state_root = root;
  (* ... other fields *)
}

(* Create new header with updated slot - like "except" *)
let header' = { header with slot = 43 }

(* Original unchanged: header.slot = 42 *)
(* New record: header'.slot = 43 *)
```

</div>

## Nested Tuples

Tuples can contain other tuples:

```
WorkReport = (
  spec: (
    hash: ℍ,
    length: ℕ,
    erasure_root: ℍ,
    erasure_shards: 𝕍,     (new in GP 0.8.0)
    segment_root: ℍ,
    segment_count: ℕ
  ),
  context: RefinementContext,
  core_index: ℕ_C,
  ...
  digests: ⟦WorkDigest⟧
)
```

<div class="lasair-connection">

### In Lasair: Nested Records

```ocaml
(* conformance/trace_types.ml - Nested record structures (abridged) *)

type trace_package_spec = {
  ps_hash: bytes;
  ps_length: int;
  ps_erasure_root: bytes;
  ps_erasure_shards: int;             (* GP 0.8.0 (#514/#527) *)
  ps_exports_root: bytes;
  ps_exports_count: int;
}

type trace_work_report = {
  tr_package_spec: trace_package_spec;  (* Nested tuple *)
  tr_context: trace_refine_context;
  tr_core_index: int;
  (* ... *)
  tr_results: trace_work_result list;
}

(* Access nested fields *)
let get_package_hash (report : trace_work_report) =
  report.tr_package_spec.ps_hash
```

</div>

## Optional Components

Tuple components can be optional:

```
Header = (
  parent: ℍ,
  slot: ℕ,
  epoch_marker: ?EpochMarker  -- Optional
)
```

The `?` means the field may or may not be present.

<div class="lasair-connection">

### In Lasair: Optional Fields

```ocaml
(* OCaml option type for nullable fields *)

type header = {
  parent: hash;
  slot: slot;
  epoch_marker: epoch_marker option;  (* None or Some value *)
}

(* Pattern matching to handle optional *)
let process_epoch h =
  match h.epoch_marker with
  | None -> (* No marker this block *)
  | Some marker -> (* Process the marker *)
```

</div>

## Key Takeaways

1. **Tuples** - Fixed-structure data with named fields
2. **Subscript access** - `T_field` gets a component
3. **Records in OCaml** - Direct translation of tuple concept
4. **Functional update** - Create new tuple with some fields changed
5. **Optional fields** - `?Type` for fields that may be absent

## What's Next

Continue with **Section 3.7: Sequencers** to understand sequences and their operations.

[Next: 3.7 Sequencers &rarr;](lesson.html?lesson=011-graypaper-lectures/14-sequencers)
