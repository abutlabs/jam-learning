---
title: "3.5 Dictionaries"
duration: 2 min
video: https://www.youtube.com/watch?v=JOFb36EJx9Q
---

# Graypaper Section 3.5: Dictionaries

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines dictionaries (key-value mappings), one of the most fundamental data structures in JAM for representing state.

## What This Lecture Covers

- Dictionary definition and notation
- Keys and values operations
- Dictionary union and difference
- Practical examples in JAM state

## What Is a Dictionary?

A **dictionary** is a set of key-value pairs where each key maps to exactly one value:

```
𝔻[K → V] = Dictionary mapping keys of type K to values of type V
```

Think of it like a lookup table or a mapping function:

```
accounts dictionary example:
  service_0 → {balance: 1000, code: ...}
  service_1 → {balance: 500, code: ...}
  service_2 → {balance: 750, code: ...}
```

<div class="callout callout-info">

**ELI5: Dictionary vs Function**

Mathematically, dictionaries and functions are similar - both map inputs to outputs. The difference is intent:
- **Functions**: Define operations (how to compute something)
- **Dictionaries**: Store data (a collection you can add/remove from)

In programming terms: functions are code, dictionaries are data.

</div>

## Dictionary Notation

The Graypaper uses specific notation for working with dictionaries:

### Lookup

```
d[k] = the value associated with key k

If k is not in dictionary:
  d[k] = ∅ (empty/nothing)
```

### Keys and Values

```
𝒦(d) = set of all keys in dictionary d
𝒱(d) = set of all values in dictionary d

Example for our accounts dictionary:
  𝒦(accounts) = {service_0, service_1, service_2}
  𝒱(accounts) = {{balance: 1000, ...}, {balance: 500, ...}, ...}
```

<div class="lasair-connection">

### In Lasair: Dictionary Operations

Lasair implements dictionaries using OCaml's association lists:

```ocaml
(* lib/notation.ml - Dictionary implementation *)

(** 𝔻[K→V] - Dictionary mapping keys to values.
    At most one value per key. *)
module Dict = struct
  type ('k, 'v) t = ('k * 'v) list

  let empty : ('k, 'v) t = []

  (** d[k] - Lookup (returns option) *)
  let get (k : 'k) (d : ('k, 'v) t) : 'v option =
    List.assoc_opt k d

  (** 𝒦(d) - Keys *)
  let keys (d : ('k, 'v) t) : 'k Set.t =
    List.map fst d

  (** 𝒱(d) - Values (as set, deduped) *)
  let values (d : ('k, 'v) t) : 'v Set.t =
    Set.of_list (List.map snd d)
end
```

</div>

## Dictionary Operations

### Adding/Updating Entries

```
d' = d ∪ {k ↦ v}

"d' is d with key k mapped to value v"
(overwrites if k already exists)
```

### Removing Entries

```
d' = d \ S

"d' is d with all keys in set S removed"
```

### Dictionary Union

```
d ∪ e = merge dictionaries d and e

If both have the same key, the right side (e) wins.
```

<div class="lasair-connection">

### In Lasair: Dictionary Modification

```ocaml
(* lib/notation.ml - Dictionary modification *)

(** Add or update key *)
let set (k : 'k) (v : 'v) (d : ('k, 'v) t) : ('k, 'v) t =
  (k, v) :: List.remove_assoc k d

(** d \ s - Remove keys in set s *)
let remove_keys (keys : 'k Set.t) (d : ('k, 'v) t) : ('k, 'v) t =
  List.filter (fun (k, _) -> not (Set.mem k keys)) d

(** d ∪ e - Union, right side wins on collision *)
let union (d : ('k, 'v) t) (e : ('k, 'v) t) : ('k, 'v) t =
  List.fold_left (fun acc (k, v) -> set k v acc) d e
```

</div>

## Dictionaries in JAM

JAM uses dictionaries extensively for state representation:

### Service Accounts

```
δ : 𝔻[ℕ_S → ServiceAccount]

Maps service IDs to their account data.
```

### Authorization Pool

```
ψ.pool : 𝔻[ℕ_C → [𝕆_H]]

Maps core indices to authorized work-package hashes.
```

### Pending Reports

```
ρ : 𝔻[ℕ_C → PendingReport?]

Maps core indices to their pending work reports (if any).
```

<div class="lasair-connection">

### In Lasair: State Dictionaries

```ocaml
(* lib/overview.ml - JAM state uses dictionaries *)

(** Authorization pool: core → authorized hashes *)
type authorization_pool = {
  pool: (core_index, hash seq) Dict.t;
}

(** Service accounts dictionary *)
type accounts = (service_id, service_account) Dict.t

(** Pending reports: core → pending report option *)
type reports = (core_index, pending_report option) Dict.t

(** Looking up a service account *)
let get_account (state : jam_state) (id : service_id) =
  Dict.get id state.delta
```

</div>

## Empty Dictionary

The empty dictionary contains no mappings:

```
{} or ∅ = empty dictionary

𝒦({}) = ∅  (no keys)
𝒱({}) = ∅  (no values)
```

## Size/Cardinality

The number of entries in a dictionary:

```
|d| = number of key-value pairs

|{}| = 0
|{a ↦ 1, b ↦ 2}| = 2
```

<div class="lasair-connection">

### In Lasair: Dictionary Size

```ocaml
(* lib/notation.ml *)

let cardinal (d : ('k, 'v) t) : nat = List.length d

(* Usage example: counting services *)
let num_services state =
  Dict.cardinal state.delta
```

</div>

## Key Takeaways

1. **𝔻[K → V]** - Dictionary type notation
2. **d[k]** - Lookup a value by key
3. **𝒦(d), 𝒱(d)** - Get keys or values as sets
4. **d ∪ e** - Union (merge) dictionaries
5. **d \ S** - Remove keys in set S

## What's Next

Continue with **Section 3.6: Tuples** to understand structured data with named components.

[Next: 3.6 Tuples &rarr;](lesson.html?lesson=011-graypaper-lectures/13-tuples)
