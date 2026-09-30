---
title: "3.1 Typography"
duration: 2 min
video: https://www.youtube.com/watch?v=nPKq_5ChZv8
---

# Graypaper Section 3.1: Typography - Notation Conventions

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section establishes the typographical conventions used throughout the Graypaper. Understanding these conventions is essential for reading the formal specification.

## What This Lecture Covers

- How different letter styles encode different meanings
- Local vs global terms
- Functions vs values vs types
- The visual language of mathematical specification

## The Notation System

The Graypaper uses a consistent visual language where **how something is written tells you what it is**:

```
Letter Style          →  Meaning
─────────────────────────────────────────────
lowercase roman (x, i, a)  →  Local term (changes meaning per equation)
bold (𝐱, 𝐚)               →  Complex term (sequence, set)
UPPERCASE ROMAN (X, A)     →  Function or Boolean condition
Bold UPPERCASE (𝐗)         →  Global function/condition
lowercase greek (σ, ω)     →  Global state (chain, VM invocation)
UPPERCASE GREEK (Σ, Ω)     →  Global function (important protocol fn)
Blackboard (ℕ, ℤ, 𝔹)       →  Set or prototype (type)
Calligraphic (𝒜, ℬ)        →  Special function
```

<div class="callout callout-info">

**ELI5: Reading the Graypaper**

Think of it like a color-coded filing system:
- Lowercase letters are temporary sticky notes (local, disposable)
- Greek letters are permanent labels (global, consistent)
- Blackboard bold letters are the filing cabinet labels (types/sets)
- Calligraphic letters are special tools (utility functions)

Once you recognize the pattern, you can understand what role each symbol plays before reading its definition.

</div>

## Why Consistent Typography Matters

The Graypaper is a formal specification. Every symbol must have unambiguous meaning. Rather than writing:

> "Let x be a local variable representing the current state, while σ represents the global chain state..."

Gavin uses typography to encode this information visually:

```
x → You know it's local (changes per equation)
σ → You know it's global state
Σ → You know it's a global function
ℕ → You know it's a type/set
```

This makes the specification **more dense but more precise**.

<div class="lasair-connection">

### In Lasair: The Notation Module

Lasair's `lib/notation.ml` implements these concepts as OCaml types. The typographical conventions become **type definitions**:

```ocaml
(* lib/notation.ml - Graypaper typography → OCaml types *)

(** Blackboard bold ℕ → natural numbers *)
module N = struct
  type t = int
  let of_int n = if n >= 0 then n else invalid_arg "N.of_int: negative"
  (* ... *)
end

(** Blackboard bold 𝔹 → booleans *)
module Bool = struct
  type t = bool
  (* ... *)
end

(** Bounded integer types (like ℕ_n in graypaper) *)
module type BOUNDED = sig
  type t
  val bound : int
  val of_int : int -> t option
  val to_int : t -> int
end

(** Create bounded type: ℕ₁₂ → numbers 0-11 *)
module Make_bounded (B : sig val bound : int end) : BOUNDED = struct
  type t = int
  let bound = B.bound
  let of_int n = if n >= 0 && n < bound then Some n else None
  let to_int n = n
end
```

The key insight: **typography encodes type information**.

| Graypaper | Meaning | Lasair |
|-----------|---------|--------|
| ℕ | Natural numbers | `N.t` |
| ℕ₁₂ | Bounded natural (0-11) | `Make_bounded(struct let bound = 12 end).t` |
| 𝔹 | Boolean | `bool` |
| 𝕆 | Octet (byte) | `char` or `int` |
| 𝕐 | Byte sequence | `bytes` |

</div>

## Letter Categories in Detail

### Lowercase Roman: Local Variables

```
Used in equations like: ∀ i ∈ ℕ, ...
The 'i' is local to this equation.
Next equation might use 'i' for something else.
```

### Greek Letters: Global Terms

```
σ (sigma) → chain state
σ' (sigma prime) → next chain state
ω (omega) → VM/execution state
μ (mu) → memory state
```

These are **consistent** throughout the Graypaper. Once you know `σ` means chain state, it always means chain state.

### Blackboard Bold: Types/Sets

```
ℕ → Natural numbers (0, 1, 2, ...)
ℤ → Integers (..., -1, 0, 1, ...)
𝔹 → Booleans (true, false)
𝕆 → Octet (single byte, 0-255)
𝕐 → Byte sequence
ℍ → Hash (32 bytes)
```

<div class="lasair-connection">

### In Lasair: Blackboard Bold as Module Types

```ocaml
(* lib/notation.ml - Types for graypaper sets *)

(** 𝕆 - Octet (single byte) *)
type octet = int  (* 0-255 *)

(** 𝕐 - Byte sequence *)
type bytes = Bytes.t

(** ℍ - Hash (32-byte Blake2b hash) *)
module H = struct
  type t = bytes
  let length = 32
  (* All hashes are exactly 32 bytes *)
end

(** ℕ_n - Bounded natural numbers *)
(* Example: ℕ₆ for epoch number (0-5) *)
module N6 = Make_bounded(struct let bound = 6 end)

(** Creating specific bounded types for JAM constants *)
module Validators = Make_bounded(struct let bound = 1023 end)  (* ℕ_V, up to GP 0.7 *)
module Cores = Make_bounded(struct let bound = 341 end)        (* ℕ_C *)
```

</div>

## Subscripts and Superscripts

The Graypaper uses subscripts and superscripts extensively:

```
Subscripts usually mean "indexed by" or "component of":
  σ_i → i-th component of state
  x_n → bounded to n values

Superscripts usually mean "raised to" or "sequence length":
  x^n → sequence of length n
  𝕐^32 → exactly 32 bytes
```

## Key Takeaways

1. **Typography encodes meaning** - How something is written tells you what it is
2. **Consistency is key** - The same style always means the same category
3. **Greek letters are global** - They maintain meaning throughout
4. **Blackboard bold = types** - The filing system of the specification
5. **Lasair maps this directly** - OCaml modules mirror graypaper typography

## What's Next

Continue with **Section 3.2: Functions and Operators** to learn the operators and functions used throughout the Graypaper.

[Next: 3.2 Functions and Operators &rarr;](lesson.html?lesson=011-graypaper-lectures/09-functions-operators)
