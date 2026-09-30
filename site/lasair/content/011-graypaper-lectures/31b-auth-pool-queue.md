---
title: "8.1-8.2 Pool and Queue Deep Dive"
duration: 16 min
video: https://www.youtube.com/watch?v=QSaCKG2B908
---

# Graypaper Section 8.1-8.2: Authorization Pool and Queue

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This deep dive explains **how core access is controlled** in JAM. The authorization system disentangles "buying coretime" from "specifying what runs on it."

## What This Section Covers

- What is an authorizer?
- The pool: current valid authorizers
- The queue: future authorizers
- How they interact each block
- Why this design is fault-tolerant

## The Core Problem

In JAM, you can buy coretime. But what happens if:
- Your work package arrives late?
- The guarantor is slow?
- Network latency causes delays?

If "slot 500 on core 3" is yours and you miss it... too bad?

<div class="callout callout-info">

**ELI5: The Restaurant Reservation**

Imagine a restaurant with strict reservations:
- **Old system**: Miss your 7pm slot → you don't eat
- **JAM system**: Your reservation goes into a "waiting list" (pool)
- If you're 5 minutes late, you can still get seated
- The pool holds up to 8 reservations at once
- The queue schedules future reservations

</div>

## What's an Authorizer?

An **authorizer** is a piece of PVM code that validates work packages:

```
Authorizer = Hash(code_hash || config)

code_hash: Hash of the PVM bytecode (like a smart contract)
config:    Configuration blob

Work Package → Authorizer → true/false
                          (allowed or not)
```

The Graypaper identifies an authorizer by the hash of its PVM code *hash* concatenated with its configuration (section 8.1; a work-package's authorizer is `H(p_u ++ p_f)`, section 14.3).

<div class="lasair-connection">

### In Lasair: Authorizer Type

```ocaml
(* conformance/package_refine.ml *)

(** p.a = H(p.u ++ p.f) — the identity a core's authorizer pool holds. *)
let authorizer (p : C.work_package) : bytes =
  Util.blake2b_256 (Bytes.cat p.C.auth_code_hash p.C.authorizer_config)
```

</div>

## The Pool (α)

Each core has a **pool** of valid authorizers (up to 8):

```
Core 3 Pool: [A, B, A, B, A, B, A, B]
             ↑                     ↑
          oldest               newest

Any work package using authorizer A or B
can execute on Core 3 right now.
```

<div class="lasair-connection">

### In Lasair: Pool Operations

```ocaml
(* lib/authorization.ml *)

(** Maximum authorizers in pool per core *)
let c_auth_pool_size = 8

(** Pool of valid authorizers for a core *)
type auth_pool = authorizer list  (* max c_auth_pool_size *)

(** Check if authorizer is in pool *)
let is_authorized (pool : auth_pool) (auth : authorizer) : bool =
  List.exists (fun a ->
    Bytes.equal (Hash.to_bytes a) (Hash.to_bytes auth)
  ) pool

(** Add authorizer to pool, keeping size bounded *)
let add_to_pool (pool : auth_pool) (auth : authorizer) : auth_pool =
  let new_pool = pool @ [auth] in
  if List.length new_pool > c_auth_pool_size then
    List.tl new_pool  (* Remove oldest *)
  else
    new_pool
```

</div>

## The Queue (φ)

Each core has a **queue** of 80 future authorizers:

```
Queue: [slot 0][slot 1][slot 2]...[slot 79]
       |-------- 80 timeslots (~8 minutes) --------|

Each timeslot, queue[slot mod 80] feeds into pool.
```

<div class="lasair-connection">

### In Lasair: Queue Operations

```ocaml
(* conformance/authorizations_stf.ml *)

let pool_size = 8
let queue_size = 80

(* inside apply_authorizations_stf, for each core: *)
    let queue_idx = input.slot mod queue_size in
    let queued = if queue_idx < Array.length queue then Some queue.(queue_idx) else None in
```

(The older learning model in `lib/authorization.ml` sizes its queue by the epoch length, 600; the Graypaper and lasair's import path use Q = 80.)

</div>

## The Block Transition

Every block, for each core:

```
1. Take authorizer from queue[timeslot mod 80]
2. Add it to the right side of pool
3. If work report guaranteed, remove its authorizer from pool
4. If pool > 8, drop oldest (leftmost)
```

<div class="lasair-connection">

### In Lasair: Pool Transition

```ocaml
(* lib/authorization.ml *)

(** Transition pool for a timeslot *)
let transition_pool (state : core_auth_state) (timeslot : int32)
    ~(used_authorizer : authorizer option) : core_auth_state =
  (* Get new authorizer from queue *)
  let new_auth = get_from_queue state.queue timeslot in

  (* Remove used authorizer if work report was guaranteed *)
  let pool_after_use =
    match used_authorizer with
    | Some auth -> remove_authorizer state.pool auth
    | None -> state.pool
  in

  (* Add new authorizer from queue *)
  let new_pool = add_to_pool pool_after_use new_auth in

  { state with pool = new_pool }
```

</div>

## Visual: Normal Operation

```
Block N:
  Queue[N mod 80] = B
  Pool before:  [A, B, A, B, A, B, A]
  Work report uses: A (first one)
  Pool after:   [B, A, B, A, B, A, B]
                ↑ removed A, added B

Block N+1:
  Queue[(N+1) mod 80] = A
  Pool before:  [B, A, B, A, B, A, B]
  Work report uses: B (first one)
  Pool after:   [A, B, A, B, A, B, A]
                ↑ removed B, added A
```

**Steady state**: One in, one out. Pool stays at 8.

## Visual: No Work Reports

```
Block N:
  Queue[N mod 80] = B
  Pool before:  [A, B, A, B, A, B, A, B]  (size 8)
  Work report: NONE
  Add B to right: [A, B, A, B, A, B, A, B, B] (size 9!)
  Drop leftmost:  [B, A, B, A, B, A, B, B]    (size 8)
                  ↑ A dropped!

After 8 blocks with no work:
  Pool: [B, B, B, B, B, B, B, B]
  All A's have been pushed out!
```

<div class="callout callout-warning">

**Use It or Lose It**

If your authorizer isn't used within ~8 blocks, it gets pushed out of the pool. This ensures lazy or absent coretime purchasers don't permanently block cores.

</div>

## Why 80 in Queue, 8 in Pool?

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Queue size | 80 | ~8 minutes of scheduling |
| Pool size | 8 | ~48 seconds of tolerance |
| Timeslot | 6 sec | Block time |

- **Queue (80)**: How far ahead you can schedule authorizers
- **Pool (8)**: How much "slack" before your slot expires

## Who Sets the Queue?

The queue is set by **privileged services** during accumulation:

```
JAM Layer 1 (protocol)
        ↓
Parachains Service (Layer 2)
        ↓
Coretime Parachain (Layer 3)
        ↓
Coretime Sales/Auctions
```

JAM just says "tell me what queue entries to use." It doesn't know about sales or pricing. Concretely, the core's assigner service calls the `assign` host call (Ω_A) during accumulation, which replaces that core's whole queue of 80 hashes and names the core's next assigner.

<div class="lasair-connection">

### In Lasair: Queue Update

```ocaml
(* lib/authorization.ml *)

(** Update queue for a core (during accumulation only) *)
let update_queue (state : auth_state) (core : int) (new_queue : auth_queue)
    : auth_state =
  if core >= 0 && core < Array.length state then begin
    let new_state = Array.copy state in
    new_state.(core) <- { state.(core) with queue = new_queue };
    new_state
  end else
    state

(** Only privileged services can modify queue *)
let can_modify_queue (service_id : int) (core : int) : bool =
  (* Check if service has core assignment privilege *)
  (* (Implemented via host calls during accumulation) *)
  ...
```

</div>

## Summary Diagram

```
                    QUEUE (φ)
    [0][1][2][3]...[79][0][1][2]...  (cycles)
     |
     | timeslot mod 80
     v
    +-----------+
    |  New Auth | ──────────────────────┐
    +-----------+                       │
                                        v
    POOL (α)                      +───────────+
    ┌─┬─┬─┬─┬─┬─┬─┬─┐            │ Add to    │
    │A│B│A│B│A│B│A│ │ ←──────────│ right     │
    └─┴─┴─┴─┴─┴─┴─┴─┘            +───────────+
     ↑
     │ Work report uses authorizer?
     │
     ├── Yes: Remove that authorizer
     └── No:  If pool > 8, drop leftmost
```

## Key Takeaways

1. **Authorizer** = Hash of (PVM code hash ++ config) identifying the logic that validates work packages
2. **Pool** = Up to 8 currently valid authorizers per core
3. **Queue** = 80-slot schedule feeding into pool
4. **Each block**: Add from queue, remove if used, drop oldest if overflow
5. **Tolerance**: ~8 blocks (~48 seconds) of slack
6. **Queue management**: Done by privileged services, not JAM core

## Graypaper References

- Section 8.1: Authorizers and Authorizations
- Section 8.2: Pool and Queue
- Section 12: Accumulation, and Appendix B.7: Accumulate Functions (the `assign` host call that rewrites a queue)

## What's Next

Return to the main authorization section or explore service accounts.

[Back to 8.0 Authorization &rarr;](lesson.html?lesson=011-graypaper-lectures/31-authorization)
