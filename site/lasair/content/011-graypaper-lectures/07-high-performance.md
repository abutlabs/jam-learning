---
title: "2.4 High-Performance Synchronous Networks"
duration: 2 min
video: https://www.youtube.com/watch?v=dhO53bV2b8c
---

# Graypaper Section 2.4: High-Performance Fully Synchronous Networks

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this lecture, Gavin examines the "throw hardware at it" approach to blockchain scaling - networks that sacrifice decentralization for raw performance.

## What This Lecture Covers

- The "Ethereum but faster" approach
- Hardware requirements and their implications
- Scaling UP vs scaling OUT
- Why silicon limits are dead ends
- The resilience tradeoff

## The "Just Go Faster" Approach

Some networks take a simple approach:

> "We'll just do what Ethereum does, but faster."

**How they achieve speed:**
- Require **tons of RAM** in validators
- Use **cloud infrastructure** (Google BigTable, etc.) for storage
- Demand **high-bandwidth connections** between validators
- Minimize **validator count** to reduce consensus overhead

Think of networks like Solana, Aptos, or Sui - they optimize for raw TPS at the cost of accessibility.

## The Hardware Arms Race

```
Typical High-Performance Chain Requirements:

┌────────────────────────────────────────────────┐
│  Minimum Validator Spec:                       │
│  • 128 GB RAM (or more)                        │
│  • 16+ CPU cores                               │
│  • NVMe SSD (2TB+)                             │
│  • 1 Gbps network (often 10 Gbps)              │
│  • Cloud hosting: $2,000-10,000/month          │
└────────────────────────────────────────────────┘

vs. Typical Home Hardware:

┌────────────────────────────────────────────────┐
│  Average Computer:                             │
│  • 16 GB RAM                                   │
│  • 4-8 CPU cores                               │
│  • 500GB SSD                                   │
│  • 100 Mbps connection                         │
│  • Cost: Already owned                         │
└────────────────────────────────────────────────┘
```

<div class="callout callout-warning">

**ELI5: The Hardware Problem**

Imagine a voting system where only people with private jets can participate. Sure, voting would be fast (fewer voters!), but is it really democratic?

High-performance chains are similar: only the rich (in hardware) can validate.

</div>

## Scaling UP vs Scaling OUT

**Scaling UP (vertical):**
- Buy bigger servers
- Faster CPUs, more RAM
- Limited by what Intel/AMD can build
- Expensive, centralized

**Scaling OUT (horizontal):**
- Add more validators
- Each handles a piece of work
- Grows with network participation
- Distributed, resilient

```
Scaling UP:                    Scaling OUT:

     ┌─────────┐                ┌───┐ ┌───┐ ┌───┐
     │ MEGA    │                │ v │ │ v │ │ v │
     │ SERVER  │                └───┘ └───┘ └───┘
     │         │                ┌───┐ ┌───┐ ┌───┐
     │ $$$$$   │                │ v │ │ v │ │ v │
     └─────────┘                └───┘ └───┘ └───┘

Wait for Intel/AMD          Add more validators
to make faster chips        = More throughput
```

## The Silicon Ceiling

Gavin's key insight:

> "Once you hit that [hardware limit], you can't scale anymore until Intel or AMD or Cisco scales for you."

**The problem:**
1. Current max speed = (best server hardware) × (best network speed)
2. You're **waiting for hardware companies** to improve
3. Moore's Law is slowing down
4. You have **no control** over your scaling path

**JAM's approach:**
- Network throughput = (validators) × (cores per validator)
- More validators = more throughput
- **You control** your scaling path

<div class="lasair-connection">

### In Lasair: Horizontal Scaling

JAM scales by adding cores and validators, not by requiring faster hardware:

```ocaml
(* Illustrative sketch (not lasair's code) - JAM's scaling model *)

(** Total validator count - can participate from commodity hardware.
    1023 at full size; since GP v0.8.0 any multiple of 3 from 6 to 1023 *)
let c_validators = 1023

(** Number of parallel execution cores (only |κ|/3 of them are active) *)
let c_cores = 341

(** Work is distributed, not concentrated *)
type core_state = {
  assigned_validators: validator_key list;  (* exactly 3 per active core *)
  current_work: work_package option;
}

(** Throughput calculation:

    Total throughput = active_cores × work_per_core
                     = (validators / 3) × (whatever each core handles)
                     = 341 × ... with 1023 validators

    To scale: add validators (up to 1023), and cores follow.
    No new hardware needed! *)

(** Validator hardware: the Graypaper's working assumption (section 20.1)
    is a modern 16-core CPU, 64 GB RAM, 8 TB storage and 0.5 GbE
    networking. Commodity, not exotic. *)
```

The key difference: JAM can scale by adding validators, not by buying better hardware.

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** this is now literal. The number of *active* cores is |κ′|/3, a third of the live validator set, while the core count C = 341 is only the maximum (section 11.3: "the amount of in-core computation that is possible scales with the number of validator nodes"). A network with 1023 validators runs all 341 cores.

</div>

## The Resilience Tradeoff

Remember the **Five Driving Factors** from lecture 1.2:

1. **Resilience** ← High-performance chains sacrifice this
2. Generality
3. Performance
4. Coherency
5. Accessibility

High-performance chains gain (3) Performance by sacrificing (1) Resilience and (5) Accessibility.

**Why this matters:**

| Scenario | High-Performance Chain | JAM |
|----------|----------------------|-----|
| Cloud outage | Network halts | Some validators affected |
| Hardware cost spike | Validators drop out | Little impact |
| Regional internet issues | Consensus problems | Redundancy handles it |
| New validators joining | Need $$$$ hardware | Modest requirements |

## Position on the Size-Synchrony Curve

```
Synchrony
    ▲
    │
    │  ┌───────────────────────┐
    │  │ High-Perf Chains      │ ← High sync, but limited size
    │  │ (Solana, Aptos, etc.) │   (can't grow beyond hardware)
    │  │                       │
    │  └───────────────────────┘
    │
    │                              ┌───────────┐
    │                              │    JAM    │ ← Scales horizontally
    │                              │           │   without hardware race
    │                              └───────────┘
    │
    └──────────────────────────────────────────▶ Size
```

## Key Takeaways

1. **"Just go faster" requires expensive hardware** - $$$$ to run a validator
2. **Vertical scaling has limits** - Can only go as fast as silicon allows
3. **Resilience is sacrificed** - Fewer validators who can participate
4. **Horizontal scaling is better** - Add validators to add capacity
5. **JAM chooses horizontal scaling** - up to 341 cores × 3 validators each

## Prior Work: Summary

Over these four lectures on prior work, we've seen:

| System | Problem |
|--------|---------|
| **Polkadot** | State partitioning, slot auctions |
| **Ethereum** | ZK costs, patchwork scaling |
| **Bridge Chains** | Weakest link security |
| **High-Perf Chains** | Hardware limits, centralization |

JAM learns from all of these, aiming for:
- Polkadot's shared security (but without partitioning)
- Ethereum's coherency (but without ZK costs)
- Unified validation (not fragmented bridges)
- Horizontal scaling (not hardware races)

## What's Next

With the introduction and prior work complete, we move to Section 3: **Notation** - the mathematical language of the Graypaper.

[Next: Section 3 - Notation &rarr;](lesson.html?lesson=011-graypaper-lectures/08-typography)
