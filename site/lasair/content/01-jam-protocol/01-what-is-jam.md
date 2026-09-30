---
title: What is JAM?
duration: 20 min
---

# What is JAM?

JAM (Join-Accumulate Machine) is a next-generation blockchain protocol designed by Gavin Wood. It's the spiritual successor to Polkadot, but fundamentally reimagined from first principles. Understanding JAM is essential before diving into lasair's implementation.

## The Vision

JAM aims to be the **world computer**—a global, trustless computational substrate. But unlike Ethereum's "one program at a time" model, JAM is designed for massive parallelism:

- **341 cores** executing work simultaneously
- **Up to 1023 validators** securing the network (three per active core)
- **Heterogeneous sharding** without fixed shard boundaries
- **On-chain code execution** with off-chain data availability

## The Graypaper

JAM is formally specified in the [Graypaper](https://graypaper.com), a comprehensive technical document that defines every aspect of the protocol mathematically. The Graypaper is to JAM what the Yellow Paper was to Ethereum—but more rigorous.

Lasair is a direct implementation of the Graypaper (v0.8.0) in OCaml. When you see a formula in lasair's code, you can find its corresponding definition in the Graypaper.

## Core Concepts

### Services (Not Smart Contracts)

JAM doesn't have smart contracts in the traditional sense. Instead, it has **services**—long-lived programs that:

- Maintain their own state
- Process **work packages** submitted by users
- Accumulate results into chain state
- Can communicate with other services

```
┌─────────────────────────────────────────────────┐
│                    Service                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Code   │  │  State   │  │ Balance  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  refine(work_item) → work_result                │
│  accumulate(results, transfers) → state_update  │
└─────────────────────────────────────────────────┘
```

Services talk to each other through **transfers**: balance plus a memo, queued during one round of a block's accumulation and delivered as inputs to the receiving service's Accumulate in the next round. There is no separate `on_transfer` entry point; the Graypaper (v0.8.0) defines exactly three PVM invocations: Is-Authorized, Refine and Accumulate.

### Work Packages

Instead of transactions, JAM processes **work packages**. A work package contains:

- **Authorization** - who is allowed to submit this work
- **Work items** - the actual computation to perform
- **Context** - references to external data

Work is processed in two phases:
1. **Refine** - Execute the work item, producing a result
2. **Accumulate** - Integrate the result into the service's state

### The PVM (Polkadot Virtual Machine)

All code in JAM runs on the **PVM**, a RISC-V-based virtual machine. Key properties:

- **Deterministic** - same input always produces same output
- **Metered** - gas limits prevent infinite loops
- **Isolated** - services can't access each other's memory directly

```
┌────────────────────────────────────────┐
│              PVM Instance              │
│  ┌──────┐  ┌──────┐  ┌─────────────┐  │
│  │ Regs │  │ RAM  │  │   Program   │  │
│  │ φ0-12│  │ 4GB  │  │ (RISC-V)    │  │
│  └──────┘  └──────┘  └─────────────┘  │
│                                        │
│  Gas: 10,000,000                       │
│  Host calls: read, write, bless, ...   │
└────────────────────────────────────────┘
```

## The Two-Phase Model

JAM's key innovation is separating computation into two phases:

### Phase 1: Refinement (Off-Chain)

Work items are refined by individual validators. This is the **heavy computation**:

- Can take multiple seconds
- Runs in isolated PVM instances
- Produces a small **work result**
- Can be parallelized across cores

### Phase 2: Accumulation (On-Chain)

Work results are accumulated into state. This is **fast and sequential**:

- Must complete within one block
- Updates service state
- Limited gas budget
- Produces the final state transition

```
         Off-Chain                    On-Chain
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│  ┌───────────────┐  │     │  ┌───────────────┐  │
│  │ Work Package  │──┼────▶│  │ Work Results  │  │
│  │               │  │     │  │               │  │
│  │  • item 1     │  │     │  │  • result 1   │  │
│  │  • item 2     │  │     │  │  • result 2   │  │
│  │  • item 3     │  │     │  │  • result 3   │  │
│  └───────────────┘  │     │  └───────┬───────┘  │
│         │           │     │          │          │
│         ▼           │     │          ▼          │
│    ┌─────────┐      │     │    ┌──────────┐    │
│    │ REFINE  │      │     │    │ACCUMULATE│    │
│    │ (PVM)   │      │     │    │ (PVM)    │    │
│    └─────────┘      │     │    └──────────┘    │
│                     │     │          │          │
│  Heavy computation  │     │  State update      │
│  Parallel per core  │     │  Sequential        │
└─────────────────────┘     └─────────────────────┘
```

## Why This Matters

### Scalability

By moving heavy computation off-chain, JAM can process vastly more work than traditional blockchains. Only the small results need to fit in blocks.

### Flexibility

Services can define arbitrary computation. JAM doesn't care what you compute—just that it's deterministic and within gas limits.

### Composability

Services can call each other through a well-defined interface. Complex applications can be built from composable services.

## JAM vs Polkadot

| Aspect | Polkadot | JAM |
|--------|----------|-----|
| Shards | Fixed parachains | Dynamic cores |
| Execution | Per-parachain | Unified PVM |
| State | Separate per chain | Shared service state |
| Consensus | BABE + GRANDPA | Safrole + GRANDPA |
| Specification | Implementation-first | Graypaper-first |

## The JAM Implementer's Prize

The Web3 Foundation has established a significant prize for implementations of JAM. Lasair is one of several teams building toward this goal. The prize incentivizes:

- Multiple independent implementations
- Formal verification of the protocol
- Diverse programming languages

Lasair's choice of OCaml brings strong type safety and a functional programming model that maps well to the Graypaper's mathematical notation.

## In Lasair: The Entry Point

The core of lasair is the State Transition Function (STF). Its entry point is block import:

```ocaml
(* conformance/trace_runner.ml *)
val import_block : Lasair.State_db.t -> trace_block -> import_result
(* import_result = Ok of Lasair.State_db.t | Error of string *)
```

This single function embodies the entire JAM protocol:
- Validate the block
- Apply all extrinsics
- Accumulate the work reports that became available (refinement already happened off-chain)
- Update state
- Return the new state (or an error)

## Key Constants

From `lib/definitions.ml` (module `Constants`, the full-size values):

```ocaml
let c_core_count = 341           (* Total number of cores *)
let c_epoch_len = 600            (* Epoch length in timeslots *)
let c_slot_seconds = 6           (* Slot period in seconds *)
let c_max_package_items = 16     (* Max work items per package *)
```

These constants define the scale and timing of JAM. An epoch is 600 slots × 6 seconds = 1 hour.

The validator count is deliberately missing from that list. Since Graypaper v0.8.0 it is not a protocol constant: a validator key sequence may have any length that is a multiple of 3 from 6 up to 3 × 341 = 1023 (the set 𝕍, section 6.3), and only the first |κ′|/3 cores are active. 1023 validators with all 341 cores active is the full-size configuration. lasair reads the live count from state; `lib/spec.ml` keeps only the capacity 3C (6 for the tiny test spec, 1023 for full).

## What You'll Learn

In the following lessons:

1. **State and Blocks** - How JAM structures data
2. **Consensus** - How validators agree on state
3. **Work and Services** - How computation happens

By the end, you'll understand the protocol well enough to read lasair's implementation and trace the flow of a work package from submission to execution.

## Further Reading

- [Graypaper](https://graypaper.com) - The official specification
- [JAM test vectors](https://github.com/davxy/jam-test-vectors) - The conformance vectors every client is checked against
- [JAM Implementer Proposals](https://github.com/polkadot-fellows/JIPs) - The standards between clients: node RPC, telemetry, chain specs
- [Polkadot Wiki](https://wiki.polkadot.network) - Background on the ecosystem

## Reflection Questions

Before moving on, consider:

1. Why might separating refine and accumulate phases improve scalability?
2. How does the PVM enable arbitrary computation while maintaining determinism?
3. What advantages does formal specification (Graypaper) provide over implementation-first design?

## Next Up

Let's examine how JAM organizes state and blocks: [State and Blocks →](lesson.html?lesson=01-jam-protocol/02-state-and-blocks)
