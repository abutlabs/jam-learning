---
title: Notation Module
duration: 20 min
---

# The Notation Module

The Notation module is the foundation of lasair. It defines the core types that everything else builds on—directly mirroring the mathematical notation in the Graypaper.

**In lasair:** `lib/notation.ml` (303 lines)

## Why Notation Matters

The Graypaper uses precise mathematical notation:
- **N** for natural numbers
- **H** for 256-bit hashes
- **[x]ₙ** for sequences of length n

Lasair's Notation module translates this directly to OCaml types. When you read the Graypaper and see **H**, you know it maps to `Hash.t` in the code.

## Bounded Natural Numbers

Many protocol values have bounds. A core index must be 0-340 (for C = 341 cores). The Graypaper writes this as **N₃₄₁**, or **N_C**.

(Validator indices are bounded too, but since Graypaper 0.8.0 the bound is not a constant: validator sets can change size at an epoch boundary, to any multiple of 3 from 6 up to 3C = 1023, so an author index is bounded by the size of the current set, **N_|κ′|**.)

```ocaml
(* From lib/notation.ml *)

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
  let of_int n = if n >= 0 && n < max then Some n else None
  let of_int_exn n =
    match of_int n with
    | Some x -> x
    | None -> invalid_arg (Printf.sprintf "Nat_bounded: %d not in [0, %d)" n max)
  let to_int x = x
end
```

This is a **functor**—a module that takes another module as a parameter. You provide the max value, it gives you a bounded type. The `private int` in the signature means code outside the module can *read* a `t` as an `int`, but can only *make* one through `of_int` or `of_int_exn`.

### Using Bounded Naturals

```ocaml
(* Create a type for core indices *)
module CoreIndex = Nat_bounded(struct let max = 341 end)

(* Now you can only create valid indices *)
let idx = CoreIndex.of_int 200      (* Some 200 *)
let bad = CoreIndex.of_int 2000     (* None - out of bounds! *)

(* Force creation with exn variant *)
let idx = CoreIndex.of_int_exn 200  (* 200 *)
let bad = CoreIndex.of_int_exn 2000 (* raises Invalid_argument *)
```

## Fixed-Size Blobs

Cryptographic values have fixed sizes:
- Hashes: 32 bytes
- Ed25519 public keys: 32 bytes
- Bandersnatch keys: 32 bytes
- Signatures: 64 bytes (Ed25519) or 96 bytes (Bandersnatch)

```ocaml
(* From lib/notation.ml *)

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
  let of_bytes b = if Bytes.length b = size then Some b else None
  let of_bytes_exn b =
    match of_bytes b with
    | Some x -> x
    | None -> invalid_arg (Printf.sprintf "Blob_fixed: expected %d bytes, got %d" size (Bytes.length b))
  let to_bytes x = x
  let zero = Bytes.make size '\x00'
end

(* The same file instantiates the common sizes *)
module Hash = Blob_fixed(struct let size = 32 end)     (* H *)
module Blob64 = Blob_fixed(struct let size = 64 end)   (* Ed25519 signatures *)
module Blob96 = Blob_fixed(struct let size = 96 end)   (* Bandersnatch signatures *)
module Blob144 = Blob_fixed(struct let size = 144 end) (* ring roots, BLS keys *)
```

### Using Fixed Blobs

```ocaml
(* Define hash type - 32 bytes *)
module Hash = Blob_fixed(struct let size = 32 end)

(* Create a hash *)
let h = Hash.of_bytes (Bytes.make 32 '\x00')  (* Some _ *)
let bad = Hash.of_bytes (Bytes.make 31 '\x00') (* None - wrong size! *)

(* Zero hash is useful as a default *)
let empty = Hash.zero  (* 32 zero bytes *)
```

## Sequences

The Graypaper uses **[x]** for sequences (ordered collections). Lasair uses OCaml arrays:

```ocaml
(* From lib/notation.ml (abridged) *)

type 'a seq = 'a array

let seq_len (s : 'a seq) : nat = Array.length s                  (* |s| *)
let seq_get (s : 'a seq) (i : nat) : 'a = s.(i)                  (* s[i] *)
let seq_concat (a : 'a seq) (b : 'a seq) : 'a seq = Array.append a b   (* a ⌢ b *)
let seq_cyclic (s : 'a seq) (i : nat) : 'a = s.(i mod Array.length s)  (* ⟳s[i] *)
let seq_take (s : 'a seq) (n : nat) : 'a seq =                   (* s[..n] *)
  Array.sub s 0 (min n (Array.length s))

let seq_init (n : nat) (f : nat -> 'a) : 'a seq = Array.init n f
let seq_map (f : 'a -> 'b) (s : 'a seq) : 'b seq = Array.map f s
let seq_filter (pred : 'a -> bool) (s : 'a seq) : 'a seq =
  Array.of_list (List.filter pred (Array.to_list s))
```

There is no `seq_set`: nothing in the module mutates a sequence in place. Each function is named after the Graypaper operation it implements.

### Sequence Operations

```ocaml
(* Cores as a sequence *)
let cores = seq_init 341 (fun i -> i)

(* Get core at index 5 *)
let c = seq_get cores 5  (* 5 *)

(* Map over cores *)
let doubled = seq_map (fun x -> x * 2) cores

(* Filter cores *)
let high = seq_filter (fun x -> x > 200) cores
```

## Dictionaries (Maps)

The Graypaper uses **D⟨K→V⟩** for dictionaries (partial mappings, at most one value per key). Lasair's `Dict` module uses association lists for simplicity:

```ocaml
(* From lib/notation.ml (abridged) *)

module Dict = struct
  type ('k, 'v) t = ('k * 'v) list

  let empty : ('k, 'v) t = []
  let get (k : 'k) (d : ('k, 'v) t) : 'v option = List.assoc_opt k d    (* d[k] *)
  let set (k : 'k) (v : 'v) (d : ('k, 'v) t) : ('k, 'v) t =
    (k, v) :: List.remove_assoc k d
  let keys (d : ('k, 'v) t) : 'k Set.t = List.map fst d                  (* K(d) *)
  let union (d : ('k, 'v) t) (e : ('k, 'v) t) : ('k, 'v) t =             (* right side wins *)
    List.fold_left (fun acc (k, v) -> set k v acc) d e
end
```

The protocol's big dictionaries (service storage, the state itself) do not live here: they are keyed state in `lib/state_db.ml`, committed by the Merkle trie of the Merklization lesson.

## Bits and Bitstrings

The Graypaper's **bits(x)** turns an octet string into a bit sequence, most significant bit first. Lasair's version:

```ocaml
(* From lib/notation.ml *)

type bitstring = bool array

let bits_of_bytes (b : bytes) : bitstring =
  let len = Bytes.length b in
  Array.init (len * 8) (fun i ->
    let byte_idx = i / 8 in
    let bit_idx = 7 - (i mod 8) in  (* MSB first *)
    let byte = Bytes.get_uint8 b byte_idx in
    (byte lsr bit_idx) land 1 = 1
  )
```

Watch the bit order. **bits()** is most-significant-first, and the state trie walks keys in that order. The *codec* packs a bit sequence the other way, least significant bit first (an assurance's per-core bitfield, for example; see the next lesson). Mixing the two is an easy way to fail a vector.

## Real Lasair Usage

Open `lib/definitions.ml` and you'll see Notation in action:

```ocaml
open Notation

(* Fixed-size cryptographic types *)
type ed_key = Hash.t              (* Ed25519 public key: 32 bytes *)
type bs_key = Hash.t              (* Bandersnatch public key: 32 bytes *)
type bls_key = Blob144.t          (* BLS public key: 144 bytes *)
type ring_root = Blob144.t        (* Bandersnatch ring root: 144 bytes *)
type ed_signature = Blob64.t      (* Ed25519 signature: 64 bytes *)
type bs_signature = Blob96.t      (* Bandersnatch signature: 96 bytes *)
module Blob784 = Blob_fixed(struct let size = 784 end)
type ring_proof = Blob784.t       (* Ring VRF proof: 784 bytes *)

(* Index types are plain ints *)
type core_index = int
type validator_index = int
```

Fixed-size values flow from `Blob_fixed`. Indices are plain `int`s: their bound depends on the chain spec (tiny or full) and, for validators, on the live set size, so the code checks them where the Graypaper does, at import, rather than in the type.

## Exercise: Explore Notation

Open `lib/notation.ml` and answer:

1. What's the difference between `of_int` and `of_int_exn`?
2. How does `seq_filter` work internally?
3. Why might we use `bytes` instead of `string` for blobs?

<details>
<summary>Click to see answers</summary>

1. `of_int` returns `option` (safe, returns None for invalid input), while `of_int_exn` raises `Invalid_argument` (convenient when the value is already known to be valid, but it can crash).

2. `seq_filter` converts to list, filters, then converts back to array. This is O(n) but allocates intermediate structures.

3. `bytes` is mutable (we can modify individual bytes in place), while `string` is immutable in modern OCaml. For cryptographic operations where we need to XOR or modify bytes, `bytes` is more efficient.

</details>

## Exercise: Create Custom Types

Using the functor pattern, create:

```ocaml
(* 1. A type for the slot within an epoch (max 600, the epoch length E) *)
module SlotNumber = (* your code *)

(* 2. A type for 64-byte signatures *)
module Signature64 = (* your code *)

(* 3. Test your types work correctly *)
```

## Key Takeaways

1. **Notation mirrors the Graypaper** - Types map directly to mathematical notation
2. **Functors create type families** - One pattern, many concrete types
3. **Bounds are enforced at creation** - Invalid values can't exist
4. **Sequences are arrays** - O(1) access, used everywhere

## Next Up

Now that you understand the foundation, let's see how lasair defines protocol constants: [Definitions Module →](lesson.html?lesson=02-lasair-core/02-definitions)
