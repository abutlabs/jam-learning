---
title: "12.2 Gas Accounting"
duration: 8 min
video: https://www.youtube.com/watch?v=0O_Ep-PtLg0
---

# Graypaper Section 12.2: Gas Accounting

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM calculates the **gas budget** for each service during accumulation. Gas accounting decides how much gas each service gets and how much accumulation fits in one block.

## What This Section Covers

- The set of services to accumulate (S)
- The GP 0.8.0 gas budget: per work-digest, per service, per block
- Minimum gas vs elective gas (lecture-era)
- Gas ratio for proportional splitting (lecture-era)
- The complete gas formula (lecture-era)

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the lecture presents an early accumulation gas model (a per-service minimum plus "elective" gas split by a ratio). Current Graypaper versions, including 0.8.0, have no elective gas and no ratio. Each work-digest carries its own accumulate gas limit, a service's gas is the sum of what its inputs bring, and the block budget decides how many reports fit. See **The GP 0.8.0 Gas Budget** below; the lecture's model is kept after it for context.

</div>

## The Services Set (S)

First, we determine **which services** will be accumulated this block:

```
S = { service_index of each work-digest in each work-report }
    ∪ { always-accumulate services: keys of χ_Z }
    ∪ { destinations of the deferred transfers being processed }
```

(GP 0.8.0, section 12.2, eq. `accpar`. The lecture's version listed the privileged services χ_m, χ_v, χ_a instead of the always-accumulate dictionary χ_Z.)

<div class="callout callout-info">

**ELI5: The Guest List**

S is like making a guest list for a party:
- **From work reports** = People who RSVP'd (have work to do)
- **Always-accumulate services** = VIPs who always get in, each with a fixed gas allowance (χ_Z)
- **Transfer recipients** = People someone sent a gift to during the party

</div>

<div class="lasair-connection">

### In Lasair: Building the Service Set

```ocaml
(* From lib/accumulation.ml (learning model; always-accumulate services not included) *)

(** Get services involved in accumulation *)
let services_to_accumulate (reports : Work_packages.work_report list)
    (transfers : deferred_transfer list) : int list =
  let from_reports = List.concat_map (fun r ->
    List.map (fun d -> d.Work_packages.service_index) r.Work_packages.digests
  ) reports in
  let from_xfers = List.map (fun t -> t.dest) transfers in
  (* Deduplicate *)
  List.sort_uniq compare (from_reports @ from_xfers)
```

</div>

## The GP 0.8.0 Gas Budget

**Per work-digest.** Every work-item states the gas it wants for accumulation, and its digest carries that limit g. A guarantee is only valid if each digest's g is at least the service's minimum `min_acc_gas` and a report's digests sum to at most G_A = 10,000,000 (section 11.4).

**Per service, per round** (single-service accumulation Δ₁, eq. `accone`):

```
g(s) = χ_Z[s] in the first round (else 0)            -- always-accumulate allowance
     + Σ gas of deferred transfers whose destination is s
     + Σ g of work-digests for service s in this round's reports
```

**Per block** (section 12.3): the budget is g = max(G_T, G_A · C + Σ χ_Z), with G_T = 3,500,000,000 in the full configuration. The outer function Δ₊ (eq. `accseq`) accumulates the longest prefix of the ready reports such that

```
Σ digest gas limits (prefix) + Σ gas of the transfers being delivered + Σ χ_Z  ≤  g
```

The top-level call passes no transfers and the χ_Z dictionary; every later round passes the transfers the round before created and an empty dictionary, so χ_Z is reserved in the first round only.

Δ₊ then recurses on the remaining reports with g* = g + Σ gas of the newly created transfers − gas actually used. The gas used is what the PVM metered: a charge for each basic block entered plus each host call's own price (see the note further down).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the prefix test now also counts the gas reserved by the deferred transfers and the always-accumulate services (Graypaper PR #500). In 0.7.2 only the reports' digest limits were counted against g, and the incoming transfers' gas was added to the next round's budget instead. Δ₊ also now returns the processed transfers, which feed the new transfer count in the service statistics (PR #502).

</div>

In lasair the block-level loop is `accumulate_sequentially` in `conformance/stf_guarantees.ml`, and its helper `affordable_prefix` does the prefix test. lasair once left the always-accumulate gas out of the first round's test, and so could accumulate reports that the Graypaper defers to a later block.

## The Lecture's Model (historical): Two Components of Gas

Each service's gas budget has two parts:

| Component | Symbol | Source |
|-----------|--------|--------|
| **Minimum** | g | Service's required minimum (non-negotiable) |
| **Elective** | — | Extra gas split proportionally by ratio |

```
Total Gas for Service S = Σ(minimum_gas) + share_of(elective_gas)
```

<div class="callout callout-info">

**ELI5: Pizza + Bonus Slices**

Imagine splitting a pizza with guaranteed slices plus extras:
- **Minimum gas** = Everyone gets 2 slices minimum (guaranteed)
- **Elective gas** = Remaining slices split by "hunger ratio"
- If you're hungrier (higher ratio), you get more bonus slices

Services can split their work:
1. **Must-do work** = Covered by minimum gas (e.g., updating state)
2. **Cleanup work** = Covered by elective gas (can wait if needed)

</div>

## The Lecture's Gas Formula (historical)

The full formula for service `s`:

```
Gas(s) = Σ g_s + floor( R_s × (G_core - Σ g_all) / Σ R_all )
         ─────   ───────────────────────────────────────────
         minimum                    elective

Where:
  g_s     = Minimum gas required by service s for each work item
  G_core  = Total gas available on the core
  R_s     = Gas ratio for service s (from work report)
  Σ g_all = Sum of all minimum gas requirements
  Σ R_all = Sum of all gas ratios
```

<div class="lasair-connection">

### In Lasair: Gas Calculation

```ocaml
(* lib/accumulation.ml *)

(** Calculate gas needed for a work report *)
let report_gas (report : Work_packages.work_report) : int64 =
  List.fold_left (fun acc digest ->
    Int64.add acc digest.Work_packages.gas_limit
  ) 0L report.digests

(* lib/work_packages.ml *)

(** Work item structure *)
type work_item = {
  service_index: int;             (** Target service ID *)
  (* ... other fields ... *)
  refine_gas_limit: int64;        (** Gas limit for Refine *)
  accumulate_gas_limit: int64;    (** Gas limit for Accumulate *)
  (* ... *)
}

(** Work digest - summary of work item execution *)
type work_digest = {
  service_index: int;             (** Target service *)
  gas_limit: int64;               (** Accumulate gas limit *)
  gas_used: int64;                (** Gas actually used *)
  (* ... *)
}
```

</div>

## Visual: Gas Distribution

The lecture's split, drawn out. GP 0.8.0 has no per-core elective split; see **The GP 0.8.0 Gas Budget** above.

```
┌─────────────────────────────────────────────────────────────────┐
│                   CORE GAS BUDGET (G_core)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           MINIMUM GAS (Guaranteed to each service)          ││
│  │                                                             ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               ││
│  │  │ Service A │  │ Service B │  │ Service C │               ││
│  │  │  g_A = 10 │  │  g_B = 20 │  │  g_C = 15 │  Total: 45   ││
│  │  └───────────┘  └───────────┘  └───────────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           ELECTIVE GAS (Split by ratio)                     ││
│  │                                                             ││
│  │  Remaining: G_core - 45 = 55 (if G_core = 100)             ││
│  │                                                             ││
│  │  Ratios: R_A=2, R_B=1, R_C=2 → Total: 5                    ││
│  │                                                             ││
│  │  ┌───────────────────────┐  ┌───────────┐  ┌─────────────┐ ││
│  │  │     Service A         │  │ Service B │  │  Service C  │ ││
│  │  │ floor(2×55/5) = 22    │  │   = 11    │  │    = 22     │ ││
│  │  └───────────────────────┘  └───────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  FINAL ALLOCATION:                                              │
│    Service A: 10 + 22 = 32 gas                                 │
│    Service B: 20 + 11 = 31 gas                                 │
│    Service C: 15 + 22 = 37 gas                                 │
│                       ─────────                                 │
│                  Total: 100 gas                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why Separate Minimum and Elective? (lecture-era)

Services can organize their work into two categories:

### Minimum Gas Work
Work that **must** happen during accumulation:
- Updating block hashes
- Processing critical state changes
- Message passing essentials

### Elective Gas Work
Work that **should** happen but can wait:
- Cleanup operations
- Non-critical updates
- Optimization tasks

<div class="callout callout-warning">

**Implementation Note**

In the lecture's model the work package author decides the gas ratio. In GP 0.8.0 the author instead decides each work-item's accumulate gas limit directly.

In GP 0.8.0 the PVM is metered per basic block, not per instruction: each basic block is paid for in full before it runs, at a price from the pipeline cost model (appendix A.9), and a block that cannot be paid for ends the run out-of-gas with the counter unchanged. Each host call has its own price (the M constants in appendix I.4.5; `transfer`, for example, costs 575, plus the gas it forwards when it succeeds), and a call that costs more than the gas left also ends the run out-of-gas. The gas used, u = ϱ − max(ϱ′, 0) with ϱ the gas given and ϱ′ the gas left, is never more than the gas the run was given (appendix A.8, Ψ_M; see [4.7 VM and Gas](lesson.html?lesson=011-graypaper-lectures/21-pvm-gas)).

</div>

## The Floor Function

Why `floor()` in the lecture's formula?

```
Without floor:
  Service might get 22.8 gas
  → But we can't have fractional gas

With floor:
  Service gets floor(22.8) = 22 gas
  → Ensures total never exceeds G_core
```

This is conservative - we might "lose" a tiny bit of gas to rounding, but we'll never accidentally exceed the core's gas budget. (GP 0.8.0 needs no rounding here: a service's gas and the block budget are sums of whole gas amounts.)

## Privileged Services

In the lecture, three privileged services always got accumulated. In GP 0.8.0 the privileges χ are five components, and only the always-accumulate dictionary χ_Z guarantees accumulation:

| Service | Symbol | Purpose |
|---------|--------|---------|
| **Manager** | χ_M | Can change who the privileged services are |
| **Assigners** | χ_A | One per core; controls that core's authorizer queue |
| **Delegator** | χ_V | Can set the staging validator keys ι (via `designate`) |
| **Registrar** | χ_R | Can create services with protected (low) indices |
| **Always-accumulate** | χ_Z | Services accumulated every block, each with a gas allowance |

(Section 9.4; `accumulation.tex`, eq. `partialstate`.)

<div class="lasair-connection">

### In Lasair: Privileged Services

```ocaml
(* From lib/accounts.ml *)

type privileges = {
  manager: service_id;      (** Can modify privileges *)
  delegator: service_id;    (** Can set staging set *)
  registrar: service_id;    (** Can create protected services *)
  assigners: service_id seq;  (** One per core, modifies auth queue *)
  always_accers: (service_id * gas) seq;  (** Auto-accumulate services *)
}
```

</div>

## Key Takeaways

1. **Service Set (S)** = Services from work-digests + always-accumulate services + transfer recipients
2. **GP 0.8.0 gas** = Each digest brings its own limit; a service gets the sum of its digests, incoming transfers and χ_Z allowance
3. **Block budget** = max(G_T, G_A · C + Σ χ_Z); reports are accumulated in the longest prefix that fits, with transfer and always-accumulate gas reserved (PR #500)
4. **Minimum gas** = Enforced per digest at guarantee time (g ≥ the service's `min_acc_gas`)
5. **Lecture-era model** = Minimum + elective gas split by ratio; no longer in the Graypaper
6. **Always-accumulate services (χ_Z)** = Accumulated every block regardless of work reports

## Graypaper References

- Section 12.2: Execution (eq. `accseq`, eq. `accpar`, eq. `accone`)
- Section 12.3: Final State Integration (the block budget g)
- Section 11.4: per-digest minimum and G_A checks

## What's Next

Return to the main accumulation section or explore wrangling (operand preparation).

[Back to 12.0 Accumulation &rarr;](lesson.html?lesson=011-graypaper-lectures/35-accumulation)
