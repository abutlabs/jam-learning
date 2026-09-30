---
title: "12.0 Accumulation"
duration: 20 min
video: https://www.youtube.com/watch?v=JiPYhyzdgq8
---

# Graypaper Section 12: Accumulation

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section covers how **available work reports** are folded into service state. Accumulation is where computation results actually change the blockchain's state.

## What This Section Covers

- The accumulation process
- Preimage integration
- Gas accounting for services
- Deferred transfers between services
- Dependency resolution

## The Big Picture

After work reports become "available" (got 2/3+ assurances), they're **accumulated**:

```
Available Work Report
        |
        v
   Check dependencies
        |
   +----+----+
   |         |
   Met    Unmet
   |         |
   v         v
Accumulate  Queue for
service     later
   |
   v
Execute Accumulate
function on PVM
   |
   v
State changes applied
```

<div class="callout callout-info">

**ELI5: The Accounting Department**

Think of accumulation like year-end accounting:
- **Work reports** = Completed invoices/receipts
- **Dependencies** = "Don't process this until X is done"
- **Accumulate function** = The accountant updating the books
- **State changes** = Updated balances in the ledger
- **Deferred transfers** = IOUs between departments

</div>

## Preimage Integration

Alongside accumulation, **preimages** can be submitted on-chain. A preimage is data that services requested but didn't have yet. (The preimages extrinsic is checked against the prior state and folded in *after* accumulation; see [12.1 Preimage Integration](lesson.html?lesson=011-graypaper-lectures/35a-preimage-integration).)

```
Preimage lookup states:
- [] (empty): Requested but unknown
- [t1]: Provided at time t1
- [t1, t2]: Provided then unrequested (zombie)
- [t1, t2, t3]: Re-requested after being zombified
```

Why keep zombies? Auditors might need old preimages to verify past blocks.

<div class="lasair-connection">

### In Lasair: Preimage States

```ocaml
(* Illustrative sketch (not lasair's code); lasair's own version is
   preimage_status in lib/accounts.ml, shown in lesson 12.1 *)

(** Preimage lookup status *)
type preimage_status =
  | Requested          (** Hash known, data needed *)
  | Available of int   (** Data on-chain since timeslot *)
  | Zombie of int * int  (** Unrequested but kept for audits *)
  | ReRequested of int * int * int  (** Zombie then requested again *)

(** Check if preimage is usable *)
let is_available = function
  | Available _ -> true
  | ReRequested _ -> true
  | _ -> false
```

</div>

## Gas Accounting

The lecture describes an older model in which each service got a **minimum** gas plus an **elective** share split by ratio. The current Graypaper has no elective share:

1. **Per-item limit** - Each work digest carries its own accumulate gas limit g, chosen by the package author (at least the service's minimum, and at most G_A = 10,000,000 per report in total)
2. **Block budget** - The block may spend g_total = max(G_T, G_A·C + Σ free gas of the always-accumulate services); G_T = 3,500,000,000
3. **In order** - Reports are accumulated in order while their digest limits, plus pending transfers' gas and the free gas, fit in the budget; the rest wait for a later block

```
Gas for service S in one round =
  its free gas (if S is in χ_Z)
  + Σ(gas of deferred transfers to S)
  + Σ(gas limit g of each of S's work digests)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the block's accumulation budget now also counts the gas of pending deferred transfers and of the always-accumulate services when deciding how many reports fit (GP #500), and Δ+ returns the transfers it processed so they can be counted in the service statistics (`accumulation.tex` 12.2, eq. `accseq`; 12.3, eq. `finalstateaccumulation`).

</div>

<div class="callout callout-info">

**ELI5: The Pizza Budget**

Imagine the kitchen can bake 8 pizzas tonight:
- Each order says up front how many pizzas it may need (its gas limit)
- Orders are taken in the order they arrived until the next one would not fit
- Regular customers with a standing order (always-accumulate services) are counted in first
- An order that used less than it asked for frees ovens for the next round

</div>

<div class="lasair-connection">

### In Lasair: Gas Calculation

```ocaml
(* lib/accumulation.ml *)

(** Calculate gas needed for a work report *)
let report_gas (report : Work_packages.work_report) : int64 =
  List.fold_left (fun acc digest ->
    Int64.add acc digest.Work_packages.gas_limit
  ) 0L report.digests

(** Get services involved in accumulation *)
let services_to_accumulate (reports : Work_packages.work_report list)
    (transfers : deferred_transfer list) : int list =
  let from_reports = List.concat_map (fun r ->
    List.map (fun d -> d.Work_packages.service_index) r.Work_packages.digests
  ) reports in
  let from_xfers = List.map (fun t -> t.dest) transfers in
  List.sort_uniq compare (from_reports @ from_xfers)
```

</div>

## Privileged Services

The lecture describes three privileged services that always get accumulated. In the current Graypaper the privileges state χ has five parts (section 9.4), and "always accumulated" is a privilege of its own:

| Service | Symbol | Purpose |
|---------|--------|---------|
| **Manager** | χ_M | Can change who holds the privileges below |
| **Delegator** | χ_V | Can set the next validator keys (ι) |
| **Registrar** | χ_R | Can create services in the protected index range |
| **Assigners** | χ_A | One per core; each controls its core's authorizer queue |
| **Always-accumulate** | χ_Z | Services accumulated in **every** block, even without work reports, with the free gas listed for each |

Initially, several of these will likely be the same service (the parachain service).

## Dependencies and Queuing

Work reports can have **dependencies** - they must wait for other packages to be accumulated first.

```ocaml
type ready_entry = {
  report: work_report;
  dependencies: hash list;  (* Must wait for these packages *)
}
```

<div class="lasair-connection">

### In Lasair: Dependency Resolution

```ocaml
(* lib/accumulation.ml *)

(** Check if work report has no dependencies *)
let has_no_dependencies (report : Work_packages.work_report) : bool =
  report.Work_packages.context.Work_packages.prerequisite = None &&
  report.Work_packages.segment_root_lookup = []

(** Partition reports by dependency status *)
let partition_reports (reports : Work_packages.work_report list)
    : Work_packages.work_report list * ready_entry list =
  let immediate, queued = List.partition has_no_dependencies reports in
  (* ... convert queued to ready_entry with dependencies ... *)
  (immediate, queued_entries)

(** Check if entry is ready (no dependencies) *)
let is_ready (entry : ready_entry) : bool =
  entry.dependencies = []
```

</div>

## Deferred Transfers

Services can send **deferred transfers** to other services. These are processed in the next accumulation round of the same block: they become inputs to the destination service's Accumulate call (there is no separate on-transfer entry point; the PVM has exactly three invocations: Is-Authorized, Refine and Accumulate).

```ocaml
type deferred_transfer = {
  source: int;       (* Source service index *)
  dest: int;         (* Destination service index *)
  amount: int64;     (* Balance to transfer *)
  memo: bytes;       (* Up to 128 bytes *)
  gas: int64;        (* Gas limit for processing *)
}
```

<div class="callout callout-info">

**ELI5: Interoffice Mail**

Deferred transfers are like sending a package through interoffice mail:
- You can't hand it directly (services are isolated)
- You put it in the outbox (deferred transfer)
- Next mail run (the next accumulation round, still in the same block), it gets delivered
- The recipient gets the package + a memo

</div>

## Accumulation History

The system tracks which packages have been accumulated (one epoch's worth):

```ocaml
(** Accumulated history - one epoch's worth *)
type accumulated_history = hash list array

(** Check if package hash is in accumulated history *)
let is_accumulated (history : accumulated_history) (pkg_hash : hash) : bool =
  Array.exists (fun set ->
    List.exists (fun h -> Bytes.equal h pkg_hash) set
  ) history
```

This prevents:
- Double accumulation of the same package
- Helps resolve dependencies (know what's already processed)

## The Accumulate Function

Each service has an **Accumulate** entry point in its code. It receives:

```ocaml
type operand = {
  package_hash: hash;      (* Work package identifier *)
  segment_root: hash;      (* For data availability *)
  authorizer: hash;        (* Who authorized the work *)
  payload_hash: hash;      (* Work item payload *)
  gas_limit: int64;        (* Gas budget *)
  auth_trace: bytes;       (* Authorization trace *)
  result: work_result;     (* Output from Refine *)
}
```

In one call a service receives one sequence of inputs: the deferred transfers addressed to it first, then one operand per work digest for it, in report order (`accumulation.tex` 12.2, eq. `accone`).

The function can:
- Modify service state
- Issue deferred transfers
- Provision preimages
- Return an output commitment

## Summary Diagram

```
                  AVAILABLE REPORTS
                         |
            +------------+------------+
            |                         |
      No dependencies           Has dependencies
            |                         |
            v                         v
      ACCUMULATE NOW             ADD TO QUEUE
            |                         |
      +-----+-----+                   |
      |           |              Wait for deps
   Success    Failed                  |
      |           |              +----+----+
      v           v              |         |
   Update      Report       Deps met   Timeout
   state       error            |         |
      |                         v         v
      v                    Accumulate   Discard
   Deferred transfers
   to other services
```

## Accumulation Output

After accumulating a service:

```ocaml
type acc_output = {
  post_state: partial_state;         (* Modified state *)
  deferred_xfers: deferred_transfer list;  (* New transfers *)
  yield: hash option;                (* Output commitment *)
  gas_used: int64;                   (* Gas consumed *)
  provisions: (int * bytes) list;    (* Preimage provisions *)
}
```

## Key Takeaways

1. **Accumulation** = folding work results into service state
2. **Preimages** provide data services requested
3. **Gas** = each digest's own limit, within a per-block budget that also covers transfers and always-accumulate services
4. **Always-accumulate services** (χ_Z) execute every block; other privileges are manager, delegator, registrar and assigners
5. **Dependencies** can defer accumulation
6. **Deferred transfers** enable inter-service communication, delivered to Accumulate in the next round of the same block
7. **History** tracks accumulated packages for one epoch

## Graypaper References

The deep dives below follow the lecture's numbering. In the GP 0.8.0 text, section 12 is organized as:

- Section 12.1: History and Queuing (ξ, ω, dependencies)
- Section 12.2: Execution (gas budget, operand tuples, Δ+, Δ*, Δ1)
- Section 12.3: Final State Integration (χ', φ', ι', accumulation statistics)
- Section 12.4: Preimage Integration
- Appendix B.4: Accumulate Invocation (Ψ_A, PVM execution)

## Deep Dives

Want more detail? Explore:

- [12.1 Preimage Integration](lesson.html?lesson=011-graypaper-lectures/35a-preimage-integration) - How preimages are provided and tracked for services
- [12.2 Gas Accounting](lesson.html?lesson=011-graypaper-lectures/35b-gas-accounting) - How accumulation gas is budgeted and charged
- [12.3 Wrangling](lesson.html?lesson=011-graypaper-lectures/35c-wrangling) - How work results become operand tuples for the PVM
- [12.4 Invocation](lesson.html?lesson=011-graypaper-lectures/35d-invocation) - PVM execution, deferred transfers, and state transitions

## What's Next

Continue with **Section 13: Validator Activity Statistics** to understand how validator performance is tracked.

[Next: 13 Statistics &rarr;](lesson.html?lesson=011-graypaper-lectures/36-statistics)
