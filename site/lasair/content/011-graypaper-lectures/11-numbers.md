---
title: "3.4 Numbers"
duration: 2 min
video: https://www.youtube.com/watch?v=9qh4kH6Rewg
---

# Graypaper Section 3.4: Numbers

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines the numeric types used throughout the Graypaper, with special attention to bounded integers essential for blockchain implementation.

## What This Lecture Covers

- Natural numbers and integers
- Bounded integers (fixed-width types)
- Modulo and division with remainder
- Saturating arithmetic

## Basic Number Sets

```
ℕ = Natural numbers = {0, 1, 2, 3, ...}
ℤ = Integers = {..., -2, -1, 0, 1, 2, ...}
```

These are the standard mathematical number sets.

## Bounded Natural Numbers

The key notation for blockchain work is **bounded naturals**:

```
ℕₙ = {0, 1, 2, ..., n-1}

"Natural numbers from 0 up to (but not including) n"
```

Common examples:

```
ℕ₂³² = 32-bit unsigned integer (0 to 4,294,967,295)
ℕ₂⁶⁴ = 64-bit unsigned integer
ℕ₂₅₆ = Numbers 0-255 (one byte)
ℕ₁₀₂₃ = Validator indices (0-1022) with 1023 validators
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** there is no fixed ℕ_V any more. The validator count V stopped being a constant (sets may hold any multiple of 3 from 6 to 1023), so the Graypaper now bounds a validator index by the live set it indexes, e.g. the author index H_I ∈ ℕ_{|κ′|} (section 5) and an assurer index ∈ ℕ_{|κ|} (section 11.2). ℕ₁₀₂₃ is the full-size case.

</div>

<div class="callout callout-info">

**ELI5: Bounded Numbers**

Think of an odometer:
- ℕ₁₀ is a single digit (0-9)
- ℕ₁₀₀ is two digits (00-99)
- ℕ₂⁵⁶ is one byte (00-FF in hex)

The subscript tells you the maximum value plus one (the "rollover" point).

</div>

<div class="lasair-connection">

### In Lasair: Bounded Integer Types

Lasair implements bounded integers using OCaml's module system:

```ocaml
(* lib/notation.ml - Bounded integer implementation *)

(** Generic bounded integer *)
module type BOUNDED_INT = sig
  type t
  val bound : int64
  val of_int : int -> t option    (* None if out of bounds *)
  val to_int : t -> int
  val of_int64 : int64 -> t option
  val to_int64 : t -> int64
end

(** Create a bounded type: ℕₙ *)
module Make_bounded (B : sig val bound : int64 end) : BOUNDED_INT = struct
  type t = int64
  let bound = B.bound

  let of_int64 n =
    if n >= 0L && n < bound then Some n else None

  let to_int64 n = n
  let of_int n = of_int64 (Int64.of_int n)
  let to_int n = Int64.to_int n
end

(** Specific bounded types used in JAM: *)

(* ℕ₂³² - 32-bit unsigned *)
module U32 = Make_bounded(struct let bound = 0x100000000L end)

(* ℕ₂⁶⁴ - 64-bit unsigned *)
module U64 = Make_bounded(struct let bound = Int64.max_int end)

(* ℕ₂₅₆ - Single byte *)
module U8 = Make_bounded(struct let bound = 256L end)

(* ℕ_V - Validator index (full-size set; since GP 0.8.0 the bound is |κ|) *)
module Validator_index = Make_bounded(struct let bound = 1023L end)

(* ℕ_C - Core index *)
module Core_index = Make_bounded(struct let bound = 341L end)
```

</div>

## Modulo Operation

The **modulo** operator gives the remainder after division:

```
x % n = x mod n

Example:
  17 % 5 = 2  (because 17 = 3×5 + 2)
  100 % 12 = 4  (because 100 = 8×12 + 4)
```

## Division with Remainder

The Graypaper uses special notation for division with remainder:

```
⌊x/n⌋ = quotient (integer division, round down)
x mod n = remainder

Together: x = ⌊x/n⌋ × n + (x mod n)
```

The `R` notation expresses both at once:

```
a R b = (quotient, remainder)
17 R 5 = (3, 2)
```

<div class="lasair-connection">

### In Lasair: Division Operations

```ocaml
(* lib/notation.ml - Division operations *)

(** Integer division (floor): ⌊x/n⌋ *)
let div_floor x n = x / n

(** Modulo: x mod n *)
let modulo x n = x mod n

(** Division with remainder: x R n *)
let div_rem x n = (x / n, x mod n)

(** Safe division (returns option): *)
let safe_div x n =
  if n = 0 then None
  else Some (x / n)

(* Used extensively for index calculations (this is the mapping before
   the shuffle and rotation of section 11.3): *)
let core_for_validator v_idx =
  v_idx / validators_per_core

let position_in_core v_idx =
  v_idx mod validators_per_core
```

</div>

## Saturating Arithmetic

Some operations use **saturating arithmetic** where values clamp at bounds:

```
Saturating add (at max 255):
  200 +ₛ 100 = 255  (not 300, clamped to max)

Saturating subtract (at min 0):
  50 -ₛ 100 = 0  (not -50, clamped to min)
```

<div class="lasair-connection">

### In Lasair: Saturating Operations

```ocaml
(* lib/notation.ml - Saturating arithmetic *)

(** Saturating add: clamp to max *)
let sat_add max a b =
  let sum = a + b in
  if sum > max then max else sum

(** Saturating subtract: clamp to 0 *)
let sat_sub a b =
  if b > a then 0 else a - b

(** For gas accounting: *)
let deduct_gas available cost =
  if cost > available then 0L
  else Int64.sub available cost

(* Used in PVM execution to prevent underflow *)
```

</div>

## Byte Representation

Numbers are often converted to byte sequences:

```
𝔼ₙ(x) = x encoded as n bytes (little-endian)
𝔻ₙ(b) = decode n bytes to number

Example:
  𝔼₄(256) = [0, 1, 0, 0]  (256 as 4 bytes, little-endian)
```

<div class="lasair-connection">

### In Lasair: Number Encoding

```ocaml
(* lib/serialization.ml - Number to bytes *)

(** Encode number as n bytes (little-endian): 𝔼ₙ *)
let encode_le n_bytes num =
  let bytes = Bytes.create n_bytes in
  let rec fill i remaining =
    if i >= n_bytes then ()
    else begin
      Bytes.set bytes i (Char.chr (remaining land 0xff));
      fill (i + 1) (remaining lsr 8)
    end
  in
  fill 0 num;
  bytes

(** Decode n bytes to number (little-endian): 𝔻ₙ *)
let decode_le bytes =
  let len = Bytes.length bytes in
  let rec read i acc =
    if i < 0 then acc
    else read (i - 1) ((acc lsl 8) lor (Char.code (Bytes.get bytes i)))
  in
  read (len - 1) 0
```

</div>

## Key Takeaways

1. **ℕₙ notation** - Bounded naturals from 0 to n-1
2. **Common bounds** - 2³², 2⁶⁴, 256 for standard integer sizes
3. **Modulo/division** - Essential for index calculations
4. **Saturating arithmetic** - Prevents overflow/underflow
5. **Byte encoding** - Little-endian representation

## What's Next

Continue with **Section 3.5: Dictionaries** to understand key-value mappings in the Graypaper.

[Next: 3.5 Dictionaries &rarr;](lesson.html?lesson=011-graypaper-lectures/12-dictionaries)
