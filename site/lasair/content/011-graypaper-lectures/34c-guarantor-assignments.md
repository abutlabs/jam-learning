---
title: "11.3 Guarantor Assignments"
duration: 14 min
video: https://www.youtube.com/watch?v=WEK48WQd2ac
---

# Graypaper Section 11.3: Guarantor Assignments

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how validators get assigned to cores for guaranteeing work reports. Understanding this assignment mechanism is crucial for implementing the guarantee validation logic.

## What This Section Covers

- Why validators rotate between cores
- The Fisher-Yates shuffle
- Rotation every 10 blocks
- Using entropy safely (η₂ vs η₁)
- The G and G* mappings (M and M* in the current Graypaper)

## The Problem: Preventing Cartels

If validators were permanently assigned to cores, they could form **cartels**:

```
Core 0: Always Validators [A, B, C]
        → A, B, C collude
        → They guarantee invalid work
        → No one catches them (they're always together)
```

<div class="callout callout-info">

**ELI5: Musical Chairs**

Imagine a game where:
- At the start of each hour, everyone gets randomly reassigned seats
- Every 10 minutes within the hour, everyone shifts one seat right
- You never know who you'll be sitting with next

This makes it really hard to coordinate cheating!

</div>

## The Two-Level Rotation

JAM uses two rotation mechanisms:

### 1. Epoch Shuffle (Every ~1 hour)
At the start of each epoch, all validators are **shuffled** using Fisher-Yates:

```
Validators:    [V0, V1, V2, V3, V4, V5, ...]
               ↓ Shuffle with entropy η₂
Shuffled:      [V3, V0, V5, V1, V4, V2, ...]
               ↓ Group by 3
Cores:         C0:[V3,V0,V5]  C1:[V1,V4,V2]  ...
```

### 2. Block Rotation (Every 10 blocks)
Within an epoch, validators **rotate** through cores, each group moving up one core index (shown here with three active cores):

```
Blocks 0-9:    C0:[V3,V0,V5]  C1:[V1,V4,V2]  C2:[...]
Blocks 10-19:  C0:[...]       C1:[V3,V0,V5]  C2:[V1,V4,V2]
Blocks 20-29:  C0:[V1,V4,V2]  C1:[...]       C2:[V3,V0,V5]
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the number of validators is no longer fixed at 1023, so neither is the number of cores in use. Validator sequences have a length that is a multiple of 3 between 6 and 3C = 1023, and only the first |κ'|/3 cores are **active**. The base assignment is the shuffle of ⌊i/3⌋ for each validator index i < |κ'|, and the rotation wraps at the number of active cores: R(c, n) = [(x + n) mod |c|/3 : x ∈ c] and P(v, e, t) = R(shuffle([⌊i/3⌋ : i < v], e), ⌊(t mod E)/10⌋), 10 being the rotation period (`reporting_assurance.tex` 11.3). With 1023 validators this is the familiar 341 cores, three validators each.

</div>

<div class="lasair-connection">

### In Lasair: Rotation Calculation

```ocaml
(* lib/guaranteeing.ml *)

(** Rotation period in timeslots *)
let c_rotation_period = Definitions.Constants.c_rotation_period  (* 10 *)

(** Calculate rotation offset for a timeslot *)
let rotation_offset (timeslot : int) : int =
  (timeslot mod Definitions.Constants.c_epoch_len) / c_rotation_period

(** Apply rotation to assignments *)
let rotate_assignments (assignments : core_assignments) (offset : int)
    : core_assignments =
  let core_count = Definitions.Constants.c_core_count in
  Array.map (fun c -> (c + offset) mod core_count) assignments
```

`lib/guaranteeing.ml` is a learning-era module and wraps at all 341 cores. The GP 0.8.0 version on lasair's import path wraps at the active cores:

```ocaml
(* conformance/stf_guarantees.ml *)
let guarantor_assignment ~(v : int) ~(entropy : bytes) ~(slot : int) : int array =
  let active = max 1 (v / 3) in
  let base = Array.init v (fun i -> i / 3) in
  let shuffled = Lasair.Utilities.shuffle_array_with_hash base entropy in
  let n = (slot mod Stf_config.epoch_length ()) / Stf_config.rotation_period () in
  Array.map (fun c -> (c + n) mod active) shuffled
```

</div>

## Why η₂ (Eta-2) Not η₁?

JAM uses **η₂** (entropy from 2 epochs ago), not η₁ (last epoch):

```
Epoch N-2: η accumulated → η₀
Epoch N-1: η₀ → η₁ (finalizes)
Epoch N:   η₁ → η₂ (safe to use) ← WE USE THIS
           η₂ → η₃ (historical)
```

Why wait? **Forks!**

```
At epoch boundary, there might be a fork:
Fork A: η₁ = 0xABC...
Fork B: η₁ = 0xDEF...

If we used η₁ immediately, a validator might:
- Be on Core 5 on Fork A
- Be on Core 12 on Fork B
- Double their workload
- Create attack vectors
```

By waiting an epoch, Grandpa (finality gadget) has time to resolve forks.

<div class="lasair-connection">

### Entropy Selection

```ocaml
(* Illustrative sketch (not lasair's code). lasair's caller passes eta'_2
   as the [~entropy] of Stf_guarantees.guarantor_assignment shown above. *)

(* The assignments use eta_2 (previous-previous entropy)
   to ensure stability across potential forks *)

(** Get shuffled assignments for a timeslot *)
let get_assignments (entropy : bytes) (timeslot : int)
    (validators : guarantor_keys) : guarantor_assignments =
  (* Use eta_2 for shuffle, not eta_1 *)
  let base_shuffle = fisher_yates_shuffle entropy validators in
  let offset = rotation_offset timeslot in
  {
    core_assignments = rotate_assignments base_shuffle offset;
    keys = validators;
  }
```

</div>

## The Mapping: G and G*

JAM defines two mappings:

The lecture calls them G and G*; the current Graypaper writes **M** and **M*** (bold **G** now names the reporters set, 11.4).

### G (Current Assignments)
```
G = (P(|κ'|, η'₂, τ'), Φ(κ'))
```
Where:
- |κ'| = number of validators in the posterior active sequence (GP 0.8.0: an argument of P)
- η'₂ = posterior entropy (after block)
- τ' = posterior timeslot
- Φ(κ') = current validator keys, with offenders nulled

### G* (Previous Rotation)
```
G* = (P(|k|, e, τ'-R), Φ(k))
```
Where:
- (k, e) = (κ', η'₂) if τ'-R is in the same epoch, else (λ', η'₃)
- τ'-R = previous rotation timeslot
- k = current or previous validator sequence

<div class="callout callout-info">

**Why Accept G*?**

Every 10 blocks, guarantors change. But a guarantor might have been:
- Working on a work report
- About to submit when rotation happened
- Their signature is still valid for a few blocks

So we accept signatures from **both** current (G) and previous (G*) assignments.

</div>

## Fisher-Yates Shuffle

The shuffle algorithm is standard (from Wikipedia):

```
function shuffle(array, entropy):
    for i from n-1 down to 1:
        j = random(entropy, i+1)  # 0 ≤ j ≤ i
        swap array[i] and array[j]
    return array
```

In JAM, the "random" function uses entropy derived from η₂.

<div class="lasair-connection">

### Shuffle Implementation

```ocaml
(* Illustrative sketch (not lasair's code); lasair shuffles with
   Utilities.shuffle_array_with_hash in lib/utilities.ml.
   The shuffle is deterministic given the entropy *)

(** Initial assignment: first 3 validators → core 0, etc.
    GP 0.8.0: floor(i/3) for i < |kappa'|, giving |kappa'|/3 active cores *)
let initial_assignment (val_count : int) : int array =
  Array.init val_count (fun v -> v / 3)

(** Fisher-Yates shuffle using entropy *)
let fisher_yates_shuffle (entropy : bytes) (count : int) : int array =
  let arr = Array.init count (fun i -> i) in
  (* Shuffle using entropy-derived randomness *)
  for i = count - 1 downto 1 do
    let j = random_index entropy i in
    let tmp = arr.(i) in
    arr.(i) <- arr.(j);
    arr.(j) <- tmp
  done;
  arr
```

</div>

## Validation: Is This Guarantor Valid?

To check if a guarantee is valid:

```
1. Get the work report's core index
2. Get the guarantor's validator index
3. Check: Is this validator assigned to this core?
   - Under current mapping G? ✓
   - Under previous mapping G*? ✓
   - Neither? ✗ Invalid guarantee
4. GP 0.8.0: the core must also be active now (index < |κ'|/3),
   even when the signature is from the previous rotation
```

<div class="lasair-connection">

### In Lasair: Assignment Check

```ocaml
(* lib/guaranteeing.ml *)

(** Check if validator is assigned to core *)
let is_assigned (assignments : core_assignments) (validator : int)
    (core : int) : bool =
  validator < Array.length assignments && assignments.(validator) = core

(** Check if guarantee timeslot is valid *)
let is_valid_timeslot (current_time : int) (guarantee_time : int) : bool =
  let min_time = c_rotation_period * ((current_time / c_rotation_period) - 1) in
  guarantee_time >= min_time && guarantee_time <= current_time
```

</div>

## The Numbers

With JAM's full-size parameters:

| Parameter | Value | Meaning |
|-----------|-------|---------|
| \|κ'\| (validators) | 1023 at full size | Active validators; since GP 0.8.0 any multiple of 3 from 6 to 1023 |
| C (cores) | 341 | Total cores (a protocol constant) |
| \|κ'\|/3 | 341 at full size | Active cores |
| Validators per core | 3 | Guarantors assigned to each active core |
| R (rotation) | 10 | Blocks between rotations |
| E (epoch) | 600 | Blocks per epoch |
| E/R | 60 | Rotations per epoch |

## Summary Diagram

```
                         EPOCH START
                              |
                              v
                    Fisher-Yates Shuffle
                    (using entropy η₂)
                              |
                              v
              +---------------+---------------+
              |               |               |
           Core 0          Core 1         Core 340
           [V3,V0,V5]      [V1,V4,V2]     [...]
              |               |               |
              |     Every 10 blocks           |
              |           ROTATE              |
              v               v               v
           Core 1          Core 2         Core 0
           [V3,V0,V5]      [V1,V4,V2]     [...]
              |               |               |
              +---------------+---------------+
                              |
                              v
                    NEXT EPOCH → Re-shuffle
```

## Key Takeaways

1. **Two-level rotation**: Shuffle per epoch, rotate per 10 blocks
2. **Prevents cartels**: Validators can't collude if partners keep changing
3. **Use η₂ not η₁**: Wait an epoch for fork stability
4. **Accept G and G***: Allow previous rotation for smooth transitions
5. **Deterministic**: Given entropy + timeslot, assignments are calculable
6. **3 validators per active core**: |κ'| validators over |κ'|/3 active cores (1023 over 341 at full size)

## Graypaper References

- Section 11.3: Guarantor Assignments
- Appendix F: Fisher-Yates shuffle algorithm
- Section 6.4: Entropy accumulation (η)

## What's Next

Continue to work report guarantees to see how signatures are verified.

[Back to 11.0 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
