---
title: "3.7 Sequencers"
duration: 3 min
video: https://www.youtube.com/watch?v=4e1WCtYQbFM
---

# Graypaper Section 3.7: Sequencers

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines sequences - ordered collections that are fundamental to representing lists, arrays, and byte strings throughout JAM.

## What This Lecture Covers

- Sequence notation and construction
- Indexing and slicing
- Concatenation and operations
- Blobs (byte sequences)
- Boolean sequences (bitstrings)

## What Is a Sequence?

A **sequence** is an ordered collection where each element has an index:

```
⟦T⟧ = sequence of elements of type T

Example:
s = [3, 1, 4, 1, 5]  -- A sequence of naturals
s[0] = 3
s[2] = 4
|s| = 5  (length)
```

<div class="callout callout-info">

**ELI5: Sequences vs Sets**

- **Set**: Unordered, no duplicates. "I have apples, bananas, oranges"
- **Sequence**: Ordered, duplicates OK. "First apple, then banana, then apple again"

The same value can appear multiple times in a sequence, and order matters!

</div>

## Sequence Notation

### Length-Bounded Sequences

```
⟦T⟧_:n = sequences of at most n elements
⟦T⟧_:3 = sequences with 0, 1, 2, or 3 elements

Examples:
[]         ∈ ⟦ℕ⟧_:3  (empty, length 0)
[1]        ∈ ⟦ℕ⟧_:3  (length 1)
[1,2,3]    ∈ ⟦ℕ⟧_:3  (length 3, max allowed)
[1,2,3,4]  ∉ ⟦ℕ⟧_:3  (too long!)

⟦T⟧_n: = sequences of at least n elements
```

### Fixed-Length Sequences

```
⟦T⟧_n = sequences of exactly n elements

⟦ℕ⟧_4 -- Exactly 4 natural numbers
```

The subscript with no colon means *exactly*: the Graypaper writes, for example, ⟦ℍ⟧_4 for the four entropy hashes η (section 6.4).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** a fourth form, ⟦T⟧_N, the sequences whose length is in the *set* N (section 3.7). It exists for the validator key sequences: with 𝕍 = {6, 9, ..., 1023}, the multiples of 3 up to 3 × 341, the Graypaper writes ⟦𝕂⟧_𝕍 where earlier versions had exactly ⟦𝕂⟧_V with V = 1023.

</div>

<div class="lasair-connection">

### In Lasair: Sequences as Arrays

```ocaml
(* lib/notation.ml - Sequence implementation *)

(** ⟦T⟧ - Sequence of elements from type T.
    Ordered, indexable collection. *)
type 'a seq = 'a array

(** |s| - Length of sequence *)
let seq_len (s : 'a seq) : nat = Array.length s

(** s[i] - Element at index *)
let seq_get (s : 'a seq) (i : nat) : 'a = s.(i)

(** s[i] with bounds check returning option *)
let seq_get_opt (s : 'a seq) (i : nat) : 'a option =
  if i >= 0 && i < Array.length s then Some s.(i) else None
```

</div>

## Indexing Operations

### Basic Indexing

```
s[i] = element at index i (0-based)

s = [a, b, c, d]
s[0] = a
s[3] = d
```

### Modulo Indexing

```
⟳s[i] = s[i mod |s|]  -- Cyclic/wraparound

s = [a, b, c]
⟳s[3] = s[0] = a
⟳s[5] = s[2] = c
```

<div class="lasair-connection">

### In Lasair: Cyclic Access

```ocaml
(* lib/notation.ml - Modulo subscription *)

(** Modulo subscription: ⟳s[i] ≡ s[i mod |s|] *)
let seq_cyclic (s : 'a seq) (i : nat) : 'a =
  s.(i mod Array.length s)

(* Example: rotating through validators *)
let next_validator validators current_idx =
  seq_cyclic validators (current_idx + 1)
```

</div>

## Slicing

Extract a portion of a sequence:

```
s[a..b] = elements from index a to b-1
s[..n]  = first n elements
s[n..]  = drop first n elements

s = [0, 1, 2, 3, 4, 5]
s[2..5] = [2, 3, 4]
s[..3]  = [0, 1, 2]
s[3..]  = [3, 4, 5]
```

<div class="lasair-connection">

### In Lasair: Slicing Operations

```ocaml
(* lib/notation.ml *)

(** s[..n] - First n elements *)
let seq_take (s : 'a seq) (n : nat) : 'a seq =
  Array.sub s 0 (min n (Array.length s))

(** s[n..] - Drop first n elements *)
let seq_drop (s : 'a seq) (n : nat) : 'a seq =
  let len = Array.length s in
  if n >= len then [||] else Array.sub s n (len - n)

(** s[a..a+b] - Slice with offset and length *)
let seq_slice (s : 'a seq) (offset : nat) (length : nat) : 'a seq =
  Array.sub s offset length
```

</div>

## Concatenation

Join sequences together:

```
⌢ = concatenation operator

[1, 2] ⌢ [3, 4] = [1, 2, 3, 4]

s ⌢ [x] = append x to sequence s
```

<div class="lasair-connection">

### In Lasair: Concatenation

```ocaml
(* lib/notation.ml *)

(** ⌢ - Concatenation *)
let seq_concat (a : 'a seq) (b : 'a seq) : 'a seq =
  Array.append a b

(** Element append: s ⌢ [x] *)
let seq_append (s : 'a seq) (x : 'a) : 'a seq =
  Array.append s [| x |]
```

</div>

## Sequence Construction

Build sequences from expressions:

```
[f(i) | i ∈ ℕ_n]

"Create sequence where element i is f(i), for i from 0 to n-1"

Example:
[i² | i ∈ ℕ₅] = [0, 1, 4, 9, 16]
```

<div class="lasair-connection">

### In Lasair: Sequence Construction

```ocaml
(* lib/notation.ml *)

(** Build sequence from function: [f(i) | i ∈ ℕ_n] *)
let seq_init (n : nat) (f : nat -> 'a) : 'a seq =
  Array.init n f

(* Example: create validator indices *)
let validator_indices n =
  seq_init n (fun i -> i)  (* [0, 1, 2, ..., n-1] *)
```

</div>

## Blobs (Byte Sequences)

```
𝕐 = byte sequence (blob)
𝕐_n = exactly n bytes

𝕐₃₂ = 32-byte sequence (common for hashes)
```

<div class="lasair-connection">

### In Lasair: Blob Types

```ocaml
(* lib/notation.ml *)

(** 𝔹 - Blob (octet string) of arbitrary length *)
type blob = bytes

(** 𝔹_n - Blob of exactly n octets *)
module Blob_fixed (M : sig val size : int end) : FIXED_BLOB = struct
  let size = M.size
  type t = bytes
  let of_bytes b = if Bytes.length b = size then Some b else None
  (* ... *)
end

(** ℍ - 256-bit hash = 𝔹₃₂ *)
module Hash = Blob_fixed(struct let size = 32 end)
type hash = Hash.t
```

</div>

## Boolean Sequences (Bitstrings)

Binary data as a sequence of bits:

```
bits(b) = convert bytes to bit sequence

b = 0x05      -- One byte
bits(b) = [0,0,0,0,0,1,0,1]  -- 8 bits
```

<div class="lasair-connection">

### In Lasair: Bitstrings

```ocaml
(* lib/notation.ml *)

(** 𝔹[s] - Boolean string of length s *)
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

</div>

## Sorting and Ordering

```
∼ = ordering operator

{3, 1, 4, 1, 5} ∼ i  -- Order by value i
Result: [1, 1, 3, 4, 5]

-i ∼ means reverse order
```

## Key Takeaways

1. **⟦T⟧** - Sequence notation
2. **s[i]** - Zero-based indexing
3. **⟳s[i]** - Modulo (cyclic) indexing
4. **⌢** - Concatenation
5. **𝕐** - Byte sequences (blobs)
6. **Construction** - `[f(i) | i ∈ ℕ_n]`

## What's Next

Continue with **Section 3.8: Cryptography** to understand the cryptographic primitives used in JAM.

[Next: 3.8 Cryptography &rarr;](lesson.html?lesson=011-graypaper-lectures/15-cryptography)
