---
title: Types and Values
duration: 15 min
---

# Types and Values

Everything in OCaml has a type. The compiler knows the type of every expression before your program runs. This is powerful: many bugs that would crash at runtime in other languages are caught at compile time in OCaml.

## Basic Types

OCaml has several built-in types:

```ocaml
(* Integers *)
let x = 42           (* int *)
let y = -17          (* int *)

(* Floating-point numbers *)
let pi = 3.14159     (* float *)

(* Booleans *)
let is_valid = true  (* bool *)
let is_done = false  (* bool *)

(* Characters *)
let c = 'a'          (* char *)

(* Strings *)
let name = "lasair"  (* string *)

(* Unit - represents "no meaningful value" *)
let nothing = ()     (* unit *)
```

### Type Annotations

OCaml infers types automatically, but you can add explicit annotations:

```ocaml
let x : int = 42
let name : string = "lasair"
let pi : float = 3.14159
```

Annotations are optional but useful for documentation and catching errors.

## In Lasair: The Definitions Module

Open `lib/definitions.ml` in lasair. You'll see:

```ocaml
module Constants = struct
  (** Core infrastructure *)
  let c_core_count = 341           (* Total number of cores *)
  let c_val_count = 1023           (* Total number of validators *)

  (** Time *)
  let c_slot_seconds = 6           (* Slot period in seconds *)
  let c_epoch_len = 600            (* Epoch length in timeslots *)
  (* ... *)
end
```

These are simple integer bindings, but they define the fundamental parameters of the JAM protocol. lasair's modules in `lib/` open this table.

One caveat: since Graypaper v0.8.0 the validator count is no longer a protocol constant. A validator set may be any multiple of 3 from 6 up to 1023, and 1023 is the full-size set. This table is lasair's early, full-size one; the block-import code reads the live count from state.

## Arithmetic Operations

OCaml has separate operators for integers and floats:

```ocaml
(* Integer arithmetic *)
let sum = 3 + 4         (* 7 *)
let diff = 10 - 3       (* 7 *)
let prod = 6 * 7        (* 42 *)
let quot = 17 / 5       (* 3 - integer division *)
let rem = 17 mod 5      (* 2 - remainder *)

(* Float arithmetic - note the dot suffix *)
let fsum = 3.0 +. 4.0   (* 7.0 *)
let fdiff = 10.0 -. 3.0 (* 7.0 *)
let fprod = 6.0 *. 7.0  (* 42.0 *)
let fquot = 17.0 /. 5.0 (* 3.4 *)
```

**Why separate operators?** OCaml doesn't automatically convert between int and float. This prevents subtle bugs where you accidentally mix types.

## Type Inference

OCaml's compiler infers types from how values are used:

```ocaml
let double x = x * 2
(* OCaml infers: val double : int -> int *)

let greet name = "Hello, " ^ name
(* OCaml infers: val greet : string -> string *)
```

You don't need to write type annotations—the compiler figures them out. But if you make an error:

```ocaml
let wrong x = x * 2.0  (* Error! *)
(* Can't use * with float; need *. *)
```

The compiler catches it immediately.

## In Lasair: Utilities Module

Open `lib/utilities.ml`. You'll find helper functions like:

```ocaml
(* Calculate number of pages needed for n bytes *)
let div_ceil a b =
  (a + b - 1) / b

(* Calculate minimum deposit for code length *)
let min_deposit code_len =
  let pages = div_ceil code_len c_page_size in
  pages * c_deposit_per_page
```

These are simple arithmetic functions, but they're used throughout lasair for memory calculations, fee computation, and more.

## Comparison and Boolean Operations

```ocaml
(* Comparison - works on any type *)
let eq = (3 = 3)        (* true - structural equality *)
let neq = (3 <> 4)      (* true - not equal *)
let lt = (3 < 4)        (* true *)
let gt = (4 > 3)        (* true *)
let le = (3 <= 3)       (* true *)
let ge = (4 >= 3)       (* true *)

(* Boolean operations *)
let both = true && false    (* false - and *)
let either = true || false  (* true - or *)
let neg = not true          (* false - negation *)
```

## Conditional Expressions

In OCaml, `if` is an expression that returns a value:

```ocaml
let max a b =
  if a > b then a else b

let sign x =
  if x > 0 then "positive"
  else if x < 0 then "negative"
  else "zero"
```

Both branches must return the same type:

```ocaml
(* This is an error *)
let bad x =
  if x > 0 then "yes" else 42
(* Error: branches have different types *)
```

## Let Bindings

`let` introduces new names:

```ocaml
(* Top-level binding *)
let pi = 3.14159

(* Local binding with let...in *)
let area radius =
  let pi = 3.14159 in
  pi *. radius *. radius

(* Multiple local bindings *)
let hypotenuse a b =
  let a_squared = a *. a in
  let b_squared = b *. b in
  sqrt (a_squared +. b_squared)
```

Bindings are **immutable**—once bound, a name's value doesn't change:

```ocaml
let x = 5
let x = x + 1  (* This creates a NEW binding, shadows the old one *)
(* The first x still exists but is now hidden *)
```

## In Lasair: Epoch Calculations

From `lib/safrole.ml`:

```ocaml
(** Compute epoch index from timeslot *)
let epoch_of_timeslot (t : timeslot) : int =
  Int32.to_int t / Constants.c_epoch_len

(** Compute slot phase within epoch *)
let slot_in_epoch (t : timeslot) : int =
  Int32.to_int t mod Constants.c_epoch_len

(** Check if we're in a new epoch relative to prior timeslot *)
let is_new_epoch ~(prior : timeslot) ~(current : timeslot) : bool =
  epoch_of_timeslot current > epoch_of_timeslot prior
```

These functions use exactly the patterns we've covered: arithmetic, integer division, and boolean expressions. (Timeslots are 32-bit, hence the `Int32.to_int`. And note that a new epoch is detected by comparing epoch indices, not by testing `slot mod 600 = 0`: slots can be skipped.)

## 64-bit Integers

OCaml's `int` is platform-dependent (63 bits on 64-bit systems). For exact 64-bit integers, use `Int64`:

```ocaml
let big = 1_000_000_000_000L    (* Int64 literal *)
let sum = Int64.add big big     (* Int64 functions *)
let prod = Int64.mul big 2L
```

In lasair, we use `int64` for:
- Gas meters (execution costs)
- Timestamps
- Large balances

```ocaml
(* From lib/pvm.ml, the machine record *)
  gas: int64;               (** Gas remaining *)
```

## Bytes and Strings

OCaml distinguishes between strings (immutable character sequences) and bytes (mutable byte arrays):

```ocaml
let s = "hello"              (* string - immutable *)
let b = Bytes.of_string s    (* bytes - mutable copy *)

let _ = Bytes.set b 0 'H'    (* Modify first byte *)
let s2 = Bytes.to_string b   (* "Hello" *)
```

In lasair, we work extensively with bytes for:
- Hashes (32 bytes)
- Public keys (32 bytes for Ed25519, 144 for Bandersnatch)
- Encoded blocks and state

## Exercise: Type Prediction

Without running the code, predict the type of each expression:

```ocaml
let a = 3 + 4
let b = 3.0 +. 4.0
let c = "hello" ^ " world"
let d = 3 > 2
let e = if true then 1 else 2
let f x = x + 1
let g x y = x > y
```

<details>
<summary>Click to see answers</summary>

```ocaml
let a = 3 + 4               (* int *)
let b = 3.0 +. 4.0          (* float *)
let c = "hello" ^ " world"  (* string *)
let d = 3 > 2               (* bool *)
let e = if true then 1 else 2  (* int *)
let f x = x + 1             (* int -> int *)
let g x y = x > y           (* 'a -> 'a -> bool *)
```

Note that `g` has type `'a -> 'a -> bool`. The `'a` is a **type variable**—it means "any type". The function works for integers, floats, strings—anything that can be compared. We'll learn more about this in the next lesson.

</details>

## Exercise: Lasair Constants

Open `lib/definitions.ml` and answer:

1. How many validators are in a JAM network?
2. How long is an epoch (in slots)?
3. What's the maximum size of a work package?

Then write expressions to calculate:
- How many total validator-slots are there per epoch?
- How many epochs fit in a day (assuming 6-second slots)?

<details>
<summary>Click to see answers</summary>

From `definitions.ml`:
1. `c_val_count = 1023` (the full-size set; since Graypaper v0.8.0 any multiple of 3 from 6 to 1023 is allowed)
2. `c_epoch_len = 600`
3. `c_max_bundle_size = 13_791_360` octets for the whole work-package bundle (check the file!)

```ocaml
(* Validator-slots per epoch *)
let validator_slots = c_val_count * c_epoch_len
(* = 1023 * 600 = 613,800 *)

(* Epochs per day *)
let seconds_per_day = 24 * 60 * 60  (* 86,400 *)
let seconds_per_slot = 6
let slots_per_day = seconds_per_day / seconds_per_slot  (* 14,400 *)
let epochs_per_day = slots_per_day / c_epoch_len        (* 24 *)
```

</details>

## Key Takeaways

1. **Everything has a type** - The compiler knows every type at compile time
2. **Type inference** - You rarely need to write type annotations
3. **Separate number types** - `int` and `float` have different operators
4. **Immutable bindings** - Values don't change; new bindings shadow old ones
5. **Expressions, not statements** - Even `if` returns a value

## Next Up

Now that you understand types and values, let's explore how to transform them: [Functions →](lesson.html?lesson=001-ocaml-foundations/02-functions)
