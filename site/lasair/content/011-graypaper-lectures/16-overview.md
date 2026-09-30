---
title: "4.0 Overview"
duration: 3 min
video: https://www.youtube.com/watch?v=Y4jzP633jiQ
---

# Graypaper Section 4: Overview

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section introduces the fundamental equation of JAM - the state transition function that powers the entire protocol.

## What This Lecture Covers

- The state transition function
- Prior and posterior state
- Block-based (not transaction-based) processing
- How JAM differs from Ethereum

## The Fundamental Equation

The entire JAM protocol can be summarized in one equation:

```
σ' = Υ(σ, B)
```

Where:
- **σ** (sigma) = Prior state (before the block)
- **σ'** (sigma prime) = Posterior state (after the block)
- **B** = The block being processed
- **Υ** (upsilon) = State transition function

<div class="callout callout-info">

**ELI5: State Transition**

Think of a video game save file:
- **σ** is your save before playing
- **B** is everything that happened during your session
- **Υ** is the game engine processing your actions
- **σ'** is your new save after playing

The state transition function takes "what you had" + "what happened" and produces "what you now have."

</div>

## Block-Based, Not Transaction-Based

Unlike Ethereum, JAM processes one **block** at a time, not individual transactions:

```
Ethereum: σ' = Υ(σ, T)   -- T is a transaction
JAM:      σ' = Υ(σ, B)   -- B is a block
```

This is because JAM doesn't have traditional transactions. Work is submitted through a different mechanism (work packages and reports).

<div class="lasair-connection">

### In Lasair: The State Transition

```ocaml
(* Illustrative sketch (not lasair's code). lasair's real transition is
   import_block in conformance/trace_runner.ml. *)

(** The fundamental equation: σ' = Υ(σ, B)
    - σ  = prior state
    - σ' = posterior state
    - B  = block
    - Υ  = state transition function *)

(** State transition function type *)
type state_transition = jam_state -> block -> jam_state

(** Apply state transition: σ' = Υ(σ, B) *)
let transition (prior : jam_state) (blk : block) : jam_state =
  (* Each component of state transitions independently *)
  let tau' = Header.process_timeslot blk.header in
  let eta' = Entropy.accumulate prior.eta blk in
  let gamma' = Safrole.transition prior.gamma blk in
  let delta' = Accumulate.process prior.delta blk in
  (* ... combine all posterior components *)
  { tau = tau'; eta = eta'; gamma = gamma'; delta = delta'; (* ... *) }
```

</div>

## State Components

JAM's state σ is partitioned into 17 independent segments:

```
σ = (α, β, θ, γ, δ, η, ι, κ, λ, ρ, τ, φ, χ, ψ, π, ω, ξ)
```

(This is the Graypaper v0.8.0 order, eq. `statecomposition`. Older versions, and the video, used a few different letters, e.g. ϑ and ϕ.)

Key components:
- **δ (delta)** - Service accounts (like Ethereum's accounts)
- **γ (gamma)** - Safrole/block production state
- **η (eta)** - Entropy/randomness
- **τ (tau)** - Current timeslot
- **ρ (rho)** - Availability assignments: per core, the guaranteed work report (with its guarantee) waiting for data availability. Called "pending reports" before v0.8.0

<div class="lasair-connection">

### In Lasair: State Structure

```ocaml
(* Illustrative sketch (not lasair's code) - JAM state structure *)

(** Complete JAM state: σ *)
type jam_state = {
  (* Core state *)
  delta: accounts;           (* δ - Service accounts *)
  tau: timeslot;             (* τ - Current time *)
  eta: entropy;              (* η - Accumulated entropy *)

  (* Consensus state *)
  gamma: safrole_state;      (* γ - Block production *)
  beta: recent_blocks;       (* β - Recent block history *)

  (* Work processing *)
  rho: availability;         (* ρ - Availability assignments per core *)
  alpha: auth_pool;          (* α - Authorization pool *)
  phi: auth_queue;           (* φ - Authorization queue *)

  (* Validator management *)
  kappa: validator_keys;     (* κ - Current validator keys *)
  lambda: validator_keys;    (* λ - Previous epoch's validator keys *)
  iota: validator_keys;      (* ι - Staging keys, the next set to enter *)

  (* Other components... *)
}
```

</div>

## Why Partitioned State?

The 17 components can be computed **in parallel** during block processing:

```
Most transitions: σ'_x = f(σ_x, E_x)
                  ↓
          Independent of other components!
```

Only a few "synchronous entanglements" require sequential processing.

<div class="callout callout-info">

**ELI5: Parallel Processing**

Imagine 17 workers, each responsible for one part of state:
- Worker 1 handles accounts
- Worker 2 handles time
- Worker 3 handles entropy
- ...

They can mostly work simultaneously because their tasks don't overlap. This makes JAM much faster than systems that process everything sequentially.

</div>

## Key Takeaways

1. **σ' = Υ(σ, B)** - The fundamental state transition equation
2. **Block-based** - JAM processes blocks, not transactions
3. **17 components** - State is partitioned for parallel processing
4. **Prime notation** - σ' means "posterior" (after), σ means "prior" (before)

## What's Next

Continue with **Section 4.1: The Block** to understand the structure of blocks in JAM.

[Next: 4.1 The Block &rarr;](lesson.html?lesson=011-graypaper-lectures/17-the-block)
