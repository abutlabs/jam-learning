---
title: "12.3 Wrangling"
duration: 6 min
video: https://www.youtube.com/watch?v=1SaYu2I5uh0
---

# Graypaper Section 12.3: Wrangling

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how work results are **wrangled** (prepared) into operand tuples that can be fed to the PVM's Accumulate function.

## What This Section Covers

- The accumulation operand tuple (O)
- How work results become operands
- The M function: mapping services to operands
- Why JAM doesn't impose sequencing

## The Goal

We have work results from Refine. We need to format them for the PVM:

```
Input: Work reports with work results
       ↓
  [WRANGLING]
       ↓
Output: Operand tuples (O) ready for Accumulate
```

<div class="callout callout-info">

**ELI5: Meal Prep**

Think of wrangling like meal prep:
- You have raw ingredients (work results)
- You need to portion them into containers (operand tuples)
- Each container has the same compartments (the lecture's o, L, a, K; seven in the current Graypaper)
- The chef (Accumulate) receives ready-to-cook portions

</div>

## The Operand Tuple (O)

Each operand contains everything Accumulate needs:

```
O = (o, L, a, K)

Where:
  o = Work result (success data Y or error code J)
  L = Payload hash (input that went to Refine)
  a = Authorization output (who authorized this work)
  K = Work package hash (reference to the source)
```

<div class="callout callout-warning">

**GP 0.8.0 (changed since the lecture):** the operand tuple, the set 𝕌, has seven fields (`accumulation.tex` 12.2, eq. `operandtuple`):

```
U = (p, e, a, y, g, t, l)

  p = work-package hash
  e = segment root of the package's exports
  a = authorizer hash
  y = payload hash
  g = accumulate gas limit of this work item
  t = authorizer trace
  l = result (output blob or error)
```

Deferred transfers (set 𝕏) are Accumulate inputs too; in the argument encoding an operand is prefixed with 0 and a transfer with 1 (`serialization.tex`).

</div>

<div class="lasair-connection">

### In Lasair: Operand Type

```ocaml
(* lib/accumulation.ml *)

(** Operand for accumulation *)
type operand = {
  package_hash: hash;       (** K - Work package hash *)
  segment_root: hash;       (** Segment root from availability spec *)
  authorizer: hash;         (** Authorizer hash *)
  payload_hash: hash;       (** L - Hash of work item payload *)
  gas_limit: int64;         (** Gas limit for this item *)
  auth_trace: bytes;        (** a - Authorization trace *)
  result: Work_packages.work_result;  (** o - Refine result *)
}
```

</div>

## Why Each Field?

| Field (lecture / GP 0.8.0) | Purpose |
|-------|---------|
| **o / l (result)** | The actual computation output |
| **L / y (payload_hash)** | Verify what input was processed |
| **a / t (auth_trace)** | Track who authorized the work for potential slashing |
| **K / p (package_hash)** | Reference back to the original work package |
| **e (segment_root)** | Find the package's exported segments |
| **a (authorizer)** | The authorizer hash the package was authorized under |
| **g (gas_limit)** | This item's share of the accumulate gas |

<div class="callout callout-info">

**ELI5: The Receipt**

Each operand is like a receipt:
- **Result (o)** = What you got
- **Payload hash (L)** = What you ordered
- **Auth trace (a)** = Who approved the order
- **Package hash (K)** = Order number

If something goes wrong, you can trace it back!

</div>

## The M Function

**M** maps each service to its list of operands:

```
M(s) = [ all operands for service s ]

For each work report W in available reports:
  For each work result R in W:
    If R.service == s:
      Add operand(R, W) to M(s)
```

In GP 0.8.0 this step lives inside the single-service accumulation function Δ1 (`accumulation.tex` 12.2, eq. `accone`): the inputs for service s are the deferred transfers addressed to s, **followed by** the operands M(s) in report order, and s is given gas equal to its always-accumulate free gas plus the transfers' gas plus the digests' gas limits.

<div class="lasair-connection">

### Building Operands

```ocaml
(* Illustrative sketch (not lasair's code), using the types of the
   learning-era lib/accumulation.ml and lib/work_packages.ml *)

(** Build operands for a service from work reports *)
let operands_for_service (service : int)
    (reports : Work_packages.work_report list) : operand list =
  List.concat_map (fun report ->
    List.filter_map (fun digest ->
      if digest.Work_packages.service_index = service then
        Some {
          package_hash = Work_packages.package_hash report;
          segment_root = report.availability_spec.segment_root;  (* e: exports root, not erasure root *)
          authorizer = report.authorizer;
          payload_hash = digest.payload_hash;
          gas_limit = digest.gas_limit;
          auth_trace = report.auth_trace;
          result = digest.result;
        }
      else None
    ) report.digests
  ) reports
```

</div>

## Visual: Wrangling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        WORK REPORTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Work Report 1          Work Report 2          Work Report 3    │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │ Service A: R │      │ Service A: R │      │ Service B: R │  │
│  │ Service B: R │      │ Service C: R │      │ Service C: R │  │
│  │ Service A: R │      └──────────────┘      └──────────────┘  │
│  └──────────────┘                                               │
│                                                                 │
│         │                     │                     │           │
│         └─────────────────────┼─────────────────────┘           │
│                               │                                 │
│                          WRANGLING                              │
│                               │                                 │
│                               ▼                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               OPERANDS BY SERVICE                           ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  Service A: [O, O, O]    (3 operands from reports 1, 1, 2) ││
│  │  Service B: [O, O]       (2 operands from reports 1, 3)    ││
│  │  Service C: [O, O]       (2 operands from reports 2, 3)    ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                               │                                 │
│                               ▼                                 │
│                                                                 │
│                   PVM ACCUMULATE CALLS                          │
│                                                                 │
│    Accumulate(A, [O,O,O])  Accumulate(B, [O,O])  Accumulate(C) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## JAM Doesn't Sequence

A key insight from the transcript:

> "JAM does not want to be a sequencer."

Instead of imposing order:

```
WRONG (sequencer model):
  Process work item 1
  Then process work item 2
  Then process work item 3

RIGHT (JAM model):
  Hand ALL operands to Accumulate at once
  Let the service decide the order
```

<div class="callout callout-info">

**ELI5: The Buffet vs The Waiter**

**Sequencer model** = Waiter brings dishes one at a time
**JAM model** = Buffet - all food available, you choose order

JAM says: "Here are all your work items. You figure out what order to process them."

</div>

## Why This Design?

1. **Flexibility** - Services know their own ordering requirements
2. **Simplicity** - JAM doesn't need complex sequencing logic
3. **Parallelism** - All operands can be prepared concurrently
4. **Determinism** - Same input set, same result (order decided by service code)

## Authorization Tracking

The auth_trace (a) field is crucial for accountability:

```
If a work package causes problems:
  1. Look at auth_trace
  2. Identify which collator authorized it
  3. Potentially slash that collator

Example problems:
  - Built on wrong fork
  - Built on unknown parent
  - Produced useless output
```

<div class="lasair-connection">

### In Lasair: Auth Trace

```ocaml
(* lib/work_packages.ml *)

(** Work report includes authorization trace *)
type work_report = {
  (* ... *)
  authorizer: hash;         (** Authorizer hash *)
  auth_trace: bytes;        (** Authorization trace for accountability *)
  (* ... *)
}
```

</div>

## Result Types

The result (o) can be success or error:

```ocaml
type work_result =
  | Success of bytes     (** Y - success data *)
  | Error of error_code  (** J - error code *)
```

Both are passed to Accumulate - it's the service's job to handle errors appropriately.

## Key Takeaways

1. **Operand tuple** = in the lecture (result, payload_hash, auth_trace, package_hash); in GP 0.8.0 seven fields (package hash, segment root, authorizer, payload hash, gas limit, auth trace, result)
2. **M function** = Maps each service to its list of operands (in GP 0.8.0, preceded by the transfers addressed to it)
3. **No sequencing** = JAM hands all operands at once, service decides order
4. **Auth trace** = Enables slashing misbehaving collators
5. **Simple wrangling** = Just reorganizing existing data into the right format

## Graypaper References

- Section 12.2: Execution (the lecture's "12.3 Wrangling")
- eq. `operandtuple`: the operand tuple 𝕌 (and eq. `defxfer`, deferred transfers 𝕏)
- eq. `accone`: the single-service function Δ1, which gathers a service's transfers and operands

## What's Next

Return to the main accumulation section or explore invocation (PVM execution).

[Back to 12.0 Accumulation &rarr;](lesson.html?lesson=011-graypaper-lectures/35-accumulation)
