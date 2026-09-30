---
title: "4.2.1 Dependency Graph"
duration: 4 min
video: https://www.youtube.com/watch?v=1sCYaYb2-zw
---

# Graypaper Section 4.2.1: State Transition Dependency Graph

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section reveals how JAM's state transition can be parallelized and pipelined by understanding which components depend on each other.

## What This Lecture Covers

- Which state components can be computed in parallel
- Intermediate states (dagger notation)
- Synchronous entanglements
- Why this matters for performance

## The Key Insight

Most state components can be computed **independently**:

```
σ'_time = f(header)                    -- Only needs header
σ'_psi = f(σ_psi, E_disputes)          -- Only needs prior + extrinsic
σ'_eta = f(σ_eta, τ, header)           -- Independent calculation
```

This enables massive parallelization during block execution.

<div class="callout callout-info">

**ELI5: Parallel Cooking**

Imagine making a big dinner:
- Chopping vegetables doesn't require the oven
- Boiling pasta doesn't need the salad ready
- Setting the table is independent of everything

You can do all these **at the same time** because they don't depend on each other. JAM's state transition works the same way - most components can be "cooked" in parallel.

</div>

## Intermediate States (Dagger Notation)

Some calculations happen in stages. The **dagger notation** (†) marks intermediate values:

```
β† = f(header, β)       -- Intermediate recent blocks
β' = f(β†, E_G, C)      -- Final posterior state
```

The intermediate state β† is used to compute β', and may also be needed by other components.

<div class="lasair-connection">

### In Lasair: Staged Transitions

```ocaml
(* Illustrative sketch (not lasair's code) - Staged computation *)

(** Intermediate state for recent blocks.
    β† computed first, then β' uses additional inputs. *)
type recent_blocks_intermediate = {
  staged: header seq;  (* β† - after header processing *)
}

(** First stage: compute intermediate β† *)
let recent_blocks_stage1 (prior : recent_blocks) (h : header)
    : recent_blocks_intermediate =
  { staged = Seq.cons h prior }

(** Second stage: compute final β' *)
let recent_blocks_stage2
    (intermediate : recent_blocks_intermediate)
    (guarantees : guarantee seq)
    (accumulation_result : bytes)
    : recent_blocks =
  (* Incorporate work report results into block history *)
  finalize_recent_blocks intermediate guarantees accumulation_result
```

</div>

## Dependency Graph Visualization

```
         ┌──────────────────────────────────────────┐
         │                 Header (H)               │
         └──────────────────────────────────────────┘
              │         │         │         │
              ▼         ▼         ▼         ▼
           ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
           │ τ'  │  │ η'  │  │ γ†  │  │ β†  │
           └─────┘  └─────┘  └─────┘  └─────┘
                              │         │
                    ┌─────────┘         │
                    ▼                   │
                 ┌─────┐                │
                 │ γ'  │◄───E_T         │
                 └─────┘                │
                                        │
    ┌────────────────────────┬──────────┘
    │          │             │
    ▼          ▼             ▼
 ┌─────┐   ┌─────┐       ┌─────┐
 │ ρ'  │   │ δ'  │       │ β'  │◄───E_G, C
 └─────┘   └─────┘       └─────┘
    ▲          ▲
    │          │
 E_A, E_G   Accumulate
```

## Synchronous Entanglements

A few components **cannot** be parallelized - they depend on other computed values:

```
Parallel (independent):
  τ' = f(H)                    -- Time from header only
  ψ' = f(ψ, E_D)               -- Judgments and offenders from disputes only
  η' = f(η, τ, H)              -- Entropy independent

Sequential (entangled):
  β' = f(β†, E_G, C)           -- Needs accumulation result C
  δ' = f(δ, ρ, accumulate)     -- Needs reports processed
```

<div class="callout callout-warning">

**Changed since the video (as of GP 0.8.0):** the graph (section 4.2.1, eq. `transitionfunctioncomposition`) now reads, for the entangled part:

```
ρ†  ≺ (E_D, ρ)                  -- disputes clear bad/wonky reports first
ρ‡  ≺ (E_A, ρ†)                 -- then assurances clear available/timed-out ones
ρ'  ≺ (E_G, ρ‡, κ, τ')          -- then guarantees fill free cores
R*  ≺ (E_A, ρ†)                 -- the newly available reports
(ω', ξ', δ‡, χ', ι', φ', θ', S) ≺ (R*, ω, ξ, δ, χ, ι, φ, τ, τ')   -- accumulation
β'  ≺ (H, E_G, β†, θ')          -- C is now θ', the accumulation outputs
δ'  ≺ (E_P, δ‡, τ')             -- preimages fold in after accumulation
γ'  ≺ (H, τ, E_T, γ, ι, η', κ', ψ')
```

ρ is now called the availability assignments and holds whole guarantees; θ is the last accumulation outputs, not offenders (offenders live in ψ). And S, the per-service accumulation statistics, feeds π'.

</div>

<div class="callout callout-info">

**ELI5: The Assembly Line**

In a car factory, most stations work in parallel:
- Paint shop doesn't wait for upholstery
- Engine assembly is independent of wheel mounting

But some things **must** wait:
- Can't install the engine until the frame is ready
- Can't test drive until everything is assembled

These "must wait" steps are synchronous entanglements.

</div>

<div class="lasair-connection">

### In Lasair: Parallel Execution

```ocaml
(* Illustrative sketch (not lasair's code) - Parallel state transition.
   lasair's real, sequential pipeline is import_block in
   conformance/trace_runner.ml. *)

(** Components that can be computed in parallel *)
let parallel_transitions (prior : jam_state) (blk : block) =
  (* These run concurrently - no dependencies between them *)
  let tau' = Time.from_header blk.header in
  let psi' = Judgments.process prior.psi blk.extrinsic.disputes in
  let eta' = Entropy.accumulate prior.eta prior.tau blk.header in
  let gamma_staged = Safrole.stage1 prior.gamma blk.header in
  let beta_staged = RecentBlocks.stage1 prior.beta blk.header in
  (tau', psi', eta', gamma_staged, beta_staged)

(** Components requiring sequential processing *)
let sequential_transitions (prior : jam_state) (blk : block)
    (gamma_staged : safrole_intermediate)
    (beta_staged : recent_blocks_intermediate) =
  (* These must wait for prior stages *)
  let gamma' = Safrole.stage2 gamma_staged blk.extrinsic.tickets in
  let rho' = Reports.process prior.rho blk.extrinsic in
  let (delta', c) = Accumulate.process prior.delta rho' in
  let beta' = RecentBlocks.stage2 beta_staged blk.extrinsic.guarantees c in
  (gamma', rho', delta', beta')

(** Full block execution combining parallel and sequential *)
let execute_block (prior : jam_state) (blk : block) : jam_state =
  (* Phase 1: Parallel computation *)
  let (tau', psi', eta', gamma_staged, beta_staged) =
    parallel_transitions prior blk in

  (* Phase 2: Sequential computation *)
  let (gamma', rho', delta', beta') =
    sequential_transitions prior blk gamma_staged beta_staged in

  { tau = tau'; psi = psi'; eta = eta';
    gamma = gamma'; beta = beta'; rho = rho'; delta = delta';
    (* ... *) }
```

</div>

## Why This Matters

The dependency graph enables:

1. **Parallel block execution** - Multiple cores working simultaneously
2. **Pipelining** - Start next block before current finishes
3. **Efficient validation** - Verify only what changed
4. **Optimized implementations** - Know exactly what can be parallelized

## Key Takeaways

1. **Most components parallel** - Can be computed independently
2. **Dagger notation (†)** - Marks intermediate states
3. **Few entanglements** - Only some components must be sequential
4. **Performance critical** - Enables high throughput

## What's Next

Continue with **Section 4.5: Best Block** to understand how JAM chooses the canonical chain head.

[Next: 4.5 Best Block &rarr;](lesson.html?lesson=011-graypaper-lectures/20-best-block)
