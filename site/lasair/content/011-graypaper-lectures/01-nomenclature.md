---
title: "1.1 Nomenclature"
duration: 25 min
video: https://www.youtube.com/watch?v=wbnTnBQNDr4
---

# Graypaper Section 1.1: Nomenclature

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this opening lecture, Gavin Wood introduces the JAM Graypaper and explains the fundamental terminology and concepts that underpin the entire protocol specification.

## What This Lecture Covers

- **The Graypaper as Specification** - Unlike the original Polkadot paper (a vision document), the Graypaper is a formal, unambiguous specification from which compatible implementations can be built
- **JAM's Dual Heritage** - JAM combines Polkadot's scaling machinery with Ethereum's smart contract paradigm
- **Incore vs Onchain** - The fundamental dualism at the heart of JAM: two different ways of doing secure consensus computation
- **Permissionless Access** - How JAM lowers barriers to entry compared to traditional parachain slot auctions
- **Core Time** - JAM's equivalent of block space, measured in computational resources per core

## Key Concepts

### The Name "JAM"

JAM stands for **Join-Accumulate Machine**. The name reflects the two-phase execution model:
1. **Join** - Work items are refined (heavy computation, off-chain)
2. **Accumulate** - Results are accumulated into state (light, on-chain)

### Incore vs Onchain Computation

| Aspect | Onchain | Incore |
|--------|---------|--------|
| Where | Executed by all validators | Executed by subset |
| Cost | Expensive (gas) | Cheaper per unit |
| Security | Consensus-guaranteed | Game-theoretic |
| Analogy | Ethereum smart contracts | Optimistic rollups |

### Why Not "Polkadot 2.0"?

Gavin explains that JAM has its own name to avoid confusion. "Polkadot" can mean:
- A network
- A technology stack
- An economy
- A community

JAM is a specific protocol specification, and giving it a distinct name provides clarity.

<div class="lasair-connection">

### In Lasair: Following the Graypaper

Lasair directly implements the Graypaper specification. You'll see this reflected in how we organize our code:

```ocaml
(* lib/definitions.ml - Protocol types from definitions.tex *)

(** Signing Contexts - domain separation for cryptographic operations *)
module SigningContext = struct
  let available = "jam_available"      (* Ed25519: availability assurances *)
  let beefy = "jam_beefy"              (* BLS: accumulate-result commitment *)
  let entropy = "jam_entropy"          (* On-chain entropy generation *)
  let fallback = "jam_fallback_seal"   (* Bandersnatch: fallback seal *)
  let guarantee = "jam_guarantee"      (* Ed25519: guarantee statements *)
  let announce = "jam_announce"        (* Ed25519: audit announcements *)
  let ticket = "jam_ticket_seal"       (* Ring VRF: tickets and seals *)
end
```

Every signing context in Lasair follows the `jam_*` naming convention from the Graypaper. This isn't just style - it's cryptographic domain separation that ensures signatures for one purpose can't be replayed for another.

</div>

## The Abstract Explained

Gavin walks through the Graypaper abstract, highlighting:

1. **Formal Specification** - Implementable, unambiguous (like the Yellow Paper)
2. **Scalability** - Polkadot's parallel execution model
3. **Flexibility** - Ethereum's smart contract paradigm
4. **Permissionless** - Low barriers to entry
5. **Compatibility** - Designed to host existing parachains

## Try It: Core Time Calculations

Core time is quantized into slots and cores. Let's explore the timing constants:

```ocaml
(* JAM timing constants from lib/definitions.ml *)
let c_slot_seconds = 6        (* Each slot is 6 seconds *)
let c_epoch_len = 600         (* 600 slots per epoch *)
let c_core_count = 341        (* 341 parallel execution cores *)

(* Calculate epoch duration in minutes *)
let epoch_minutes = (c_slot_seconds * c_epoch_len) / 60
(* epoch_minutes = 60 - exactly one hour per epoch *)

(* How many slots per day? *)
let slots_per_day = (24 * 60 * 60) / c_slot_seconds
(* slots_per_day = 14400 *)

(* How many epochs per day? *)
let epochs_per_day = slots_per_day / c_epoch_len
(* epochs_per_day = 24 - one epoch per hour *)
```

## Key Takeaways

1. **JAM is formally specified** - The Graypaper defines every detail mathematically
2. **Incore computation is the innovation** - Game-theoretic security for heavy computation
3. **Core time = block space** - The fundamental resource being consumed
4. **Naming matters** - "JAM" provides clarity that "Polkadot 2.0" wouldn't

## Next Up

In the next lecture, Gavin explores the **driving factors** behind JAM's design - why we need resilience, generality, performance, accessibility, and coherency.

[Continue to 1.2 Driving Factors &rarr;](lesson.html?lesson=011-graypaper-lectures/02-driving-factors)
