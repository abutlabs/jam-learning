---
title: "8.0 Authorization"
duration: 18 min
video: https://www.youtube.com/watch?v=GW62bwW1-kk
---

# Graypaper Section 8: Authorization

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM controls access to cores through the authorization system - a flexible mechanism that supports both Ethereum-style and Polkadot-style interaction patterns.

## What This Section Covers

- Authorizers, Tokens, and Traces
- Authorization Pool and Queue
- Core access control
- State transitions

## The Problem: Who Gets Coretime?

JAM needs to answer: "Which work packages can use which cores?"

Two different models exist:
- **Ethereum-style**: Pay gas at submission time (purchaser = author)
- **Polkadot-style**: Buy parachain slot in advance (purchaser ≠ author)

<div class="callout callout-info">

**ELI5: The Authorization Problem**

Imagine a computing center with 341 machines (cores). You can:
1. **Pay-per-use** (Ethereum): Swipe credit card each time you use a machine
2. **Reserve in advance** (Polkadot): Buy a monthly membership that lets you use a specific machine

JAM's authorization system supports BOTH patterns through a clever abstraction.

</div>

## Key Concepts

### Authorizers
An **Authorizer** is logic that decides if a work package can run on a core:

```
Authorizer = Blake2b(code_hash || config)

Where:
  code_hash -- Hash of the PVM code that validates work packages
  config    -- Opaque configuration data
```

The Graypaper identifies an authorizer by "the hash of their PVM code hash concatenated with their Configuration blob" (section 8.1), and a work-package's implied authorizer is `H(p_u ++ p_f)`, its authorization code hash followed by its configuration (`work_packages_and_reports.tex`, section 14.3). The code itself is fetched by that hash from the host service's preimages.

### Tokens
A **Token** is opaque data included with a work package to prove authorization:

```
Work package contains:
  token: bytes  -- Proof of authorization
```

### Traces
A **Trace** is output from successful authorization - metadata about the authorization:

```
On successful authorization:
  trace: bytes  -- Description of the authorization
```

<div class="lasair-connection">

### In Lasair: Authorization Types

```ocaml
(* conformance/package_refine.ml *)

(** p.a = H(p.u ++ p.f) — the identity a core's authorizer pool holds. *)
let authorizer (p : C.work_package) : bytes =
  Util.blake2b_256 (Bytes.cat p.C.auth_code_hash p.C.authorizer_config)
```

(`lib/authorization.ml` is an older learning model: its comment still says "code || config" and its `compute_authorizer` is a stub. The code above is the one lasair's guarantor path runs.)

</div>

## Pool and Queue

Each core has:
- **Pool** (α): Currently valid authorizers (max O = 8)
- **Queue** (φ): Future authorizers to be added (Q = 80 entries, used cyclically by timeslot)

```
Per-core state:
  pool  ∈ Seq[≤8]{hash}      -- Current valid authorizers
  queue ∈ Seq[80]{hash}      -- Future authorizers, queue[timeslot mod 80]
```

The queue length is the constant Q = 80 (`definitions.tex`; `authorization.tex` eq. `authstatecomposition`), not one entry per epoch slot.

<div class="callout callout-info">

**ELI5: Pool and Queue**

Think of a VIP list at a club:
- **Pool** = Current VIP list (up to 8 people can enter)
- **Queue** = Reservations for future dates (scheduled additions)

Each timeslot:
1. One person from the queue joins the VIP list
2. Anyone who used their VIP pass loses it (removed from pool)

</div>

<div class="lasair-connection">

### In Lasair: Pool and Queue Types

```ocaml
(* lib/authorization.ml *)

(** Maximum authorizers in pool per core *)
let c_auth_pool_size = 8

(** Pool of valid authorizers for a core *)
type auth_pool = authorizer list  (* max c_auth_pool_size *)

(** Queue of future authorizers (indexed by timeslot mod queue_size) *)
type auth_queue = authorizer array  (* length = c_auth_queue_size *)

(** Authorization state for a single core *)
type core_auth_state = {
  pool: auth_pool;
  queue: auth_queue;
}
```

Note: this learning model sets `c_auth_queue_size` to the epoch length (600), which does not match the Graypaper. The code lasair imports blocks with, `conformance/authorizations_stf.ml`, uses `let queue_size = 80`.

</div>

## State Transition

Each block, the authorization state updates:

```
For each core c:
  1. Remove authorizer used by guaranteed work package (if any)
  2. Get authorizer from queue[timeslot mod 80]
  3. Add to pool (trim to max 8 if needed)
```

<div class="lasair-connection">

### In Lasair: State Transition

```ocaml
(* lib/authorization.ml *)

(** Transition pool for a timeslot *)
let transition_pool (state : core_auth_state) (timeslot : int32)
    ~(used_authorizer : authorizer option) : core_auth_state =
  (* Get new authorizer from queue *)
  let new_auth = get_from_queue state.queue timeslot in

  (* Remove used authorizer if any *)
  let pool_after_use =
    match used_authorizer with
    | Some auth -> remove_authorizer state.pool auth
    | None -> state.pool
  in

  (* Add new authorizer from queue *)
  let new_pool = add_to_pool pool_after_use new_auth in

  { state with pool = new_pool }

(** Add authorizer to pool, keeping size bounded *)
let add_to_pool (pool : auth_pool) (auth : authorizer) : auth_pool =
  let new_pool = pool @ [auth] in
  if List.length new_pool > c_auth_pool_size then
    (* Remove oldest (first) to make room *)
    List.tl new_pool
  else
    new_pool
```

</div>

## Queue Management

The queue can only be modified through **privileged services during accumulation**:

```
Queue modification rules:
  - Only during accumulation phase
  - Only by the core's assigner service (the assign host call, Ω_A)
  - Replaces the core's whole queue of 80 entries
```

This is how coretime markets and parachains schedule their access in advance.

<div class="lasair-connection">

### In Lasair: Queue Update

```ocaml
(* lib/authorization.ml *)

(** Update queue for a core (must be called during accumulation) *)
let update_queue (state : auth_state) (core : int) (new_queue : auth_queue)
    : auth_state =
  if core >= 0 && core < Array.length state then begin
    let new_state = Array.copy state in
    new_state.(core) <- { state.(core) with queue = new_queue };
    new_state
  end else
    state

(** Set authorizer in queue at index *)
let set_in_queue (queue : auth_queue) (idx : int) (auth : authorizer) : auth_queue =
  let new_queue = Array.copy queue in
  new_queue.(idx mod c_auth_queue_size) <- auth;
  new_queue
```

</div>

## Work Package Validation

When a work package is guaranteed, the system checks:

```
Is work package authorized?
  1. Get core from work package
  2. Get pool for that core
  3. Check if work package's authorizer is in pool
  4. If yes → authorized; if no → reject
```

<div class="lasair-connection">

### In Lasair: Authorization Validation

```ocaml
(* lib/authorization.ml *)

(** Check if authorizer is in pool *)
let is_authorized (pool : auth_pool) (auth : authorizer) : bool =
  List.exists (fun a ->
    Bytes.equal (Hash.to_bytes a) (Hash.to_bytes auth)
  ) pool

(** Validate work package authorization *)
let validate_authorization (state : auth_state) (core : int) (auth : authorizer)
    : bool =
  let pool = get_pool state core in
  is_authorized pool auth
```

</div>

## Supporting Different Models

The authorization system elegantly supports both interaction patterns:

### Ethereum-Style (Pay Per Use)
```
1. Service deploys authorizer that checks payment
2. User includes payment proof as token
3. Authorizer validates payment → authorizes
4. Work runs, payment consumed
```

### Polkadot-Style (Reserved Access)
```
1. Team buys coretime through auction/market
2. Team's authorizer placed in queue for purchased slots
3. Authorizer enters pool at scheduled times
4. Team's work packages use authorizer during reserved period
```

## Summary Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   Authorization System                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Per Core (×341 cores):                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Queue (80 slots, used cyclically)                          │  │
│  │ ┌────┬────┬────┬────┬─────────────┬────┐                   │  │
│  │ │ A₀ │ A₁ │ A₂ │ A₃ │ ... ... ... │A₇₉ │                   │  │
│  │ └────┴────┴────┴────┴─────────────┴────┘                   │  │
│  │              ↓ (one per timeslot)                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Pool (max 8)                                               │  │
│  │ ┌────┬────┬────┬────┬────┬────┬────┬────┐                  │  │
│  │ │auth│auth│auth│auth│auth│auth│auth│auth│ ← work packages  │  │
│  │ └────┴────┴────┴────┴────┴────┴────┴────┘   check here     │  │
│  │     ↑                                                      │  │
│  │     └── Used authorizer removed when work package runs     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Work Package Validation:                                        │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐  │
│  │ Work Package│───▶│ auth in pool?│───▶│ Run / Reject        │  │
│  │ (auth hash) │    │              │    │                     │  │
│  └─────────────┘    └──────────────┘    └─────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Authorizers** - Logic that validates work packages (identified by the hash of code hash + config)
2. **Pool** - Current valid authorizers per core (max 8)
3. **Queue** - Scheduled future authorizers (80 slots, used cyclically)
4. **Flexibility** - Supports pay-per-use and reserved access models
5. **Privileged Modification** - Only services can modify queues during accumulation

## Graypaper References

- Section 8: Authorization
- Equation for pool/queue state composition
- Pool transition formula with guarantee removal

## Deep Dives

Want more detail? Explore:

- [8.1-8.2 Pool & Queue Deep Dive](lesson.html?lesson=011-graypaper-lectures/31b-auth-pool-queue) - How pool and queue interact each block

## What's Next

Continue with **Section 9: Accounts** to understand how JAM manages service accounts and their state.

[Next: 9 Accounts &rarr;](lesson.html?lesson=011-graypaper-lectures/32-accounts)
