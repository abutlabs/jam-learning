---
title: "1.2 Driving Factors"
duration: 15 min
video: https://www.youtube.com/watch?v=abrGvSbKEjM
---

# Graypaper Section 1.2: Driving Factors

<span class="lecture-badge">Gavin Wood Lecture Series</span>

Why build JAM at all? In this lecture, Gavin outlines the five driving factors that motivated JAM's design - the qualities that any successful Web3 protocol must exhibit.

## The Five Driving Factors

### 1. Resilience

The foundational requirement for any Web3 protocol. Resilience means:
- **Censorship resistance** - No entity can prevent valid transactions
- **Fault tolerance** - System continues despite node failures
- **Decentralization** - No single point of control

This is table-stakes. Without resilience, it's not Web3.

### 2. Generality

The protocol should support **all sorts of applications**, not just a handful or one specific use case. JAM achieves this through:
- The PVM (Polkadot Virtual Machine) - arbitrary RISC-V computation
- Services that define their own logic
- No hardcoded application semantics

### 3. Performance

Measured in two ways:
- **Throughput** - Amount of computation per unit time
- **Cost efficiency** - Lowest possible cost for that computation

JAM's incore/onchain split is designed to maximize both.

### 4. Accessibility

How easy is it to actually use the system? JAM aims for:
- **Low barriers to entry** - No slot auctions, no minimum stake to deploy
- **Ubiquitous availability** - Works from anywhere
- **Simple onboarding** - Deploy code without running infrastructure

### 5. Coherency

The most nuanced factor. Coherency measures:
- How easily can parts of the system interoperate?
- Is the ease of interaction homogeneous across the system?
- Can any component talk to any other with equal facility?

This is where Gavin identifies a key weakness in current systems, including Polkadot.

<div class="lasair-connection">

### In Lasair: Performance Through Types

Lasair's approach to performance starts with strong types that eliminate runtime checks. The gas system is built into the type definitions:

```ocaml
(* lib/definitions.ml - Gas limits from Graypaper *)
module Constants = struct
  (** Gas limits - these define the performance boundaries *)
  let c_report_acc_gas = 10_000_000        (* Gas for work-report accumulation *)
  let c_package_auth_gas = 50_000_000      (* Gas for Is-Authorized *)
  let c_package_ref_gas = 5_000_000_000    (* Gas for Refine - note: 5 billion! *)
  let c_block_acc_gas = 3_500_000_000      (* Total gas for all accumulation *)
end
```

Notice the asymmetry: `c_package_ref_gas` (5 billion) is 500x larger than `c_report_acc_gas` (10 million). This reflects the incore/onchain split - refinement can do heavy computation because it happens off-chain.

</div>

## Why Coherency Matters

Gavin spends extra time on coherency because it's often overlooked. Consider:

**High Coherency (Ethereum 1):**
- Any smart contract can call any other immediately
- State is homogeneous - all equally accessible
- Synchronous composability "just works"

**Low Coherency (Multi-chain Ecosystem):**
- Cross-chain calls require bridges
- Bridges introduce latency and security risks
- Each chain is a separate state silo

**Polkadot's Situation:**
- Parachains have high internal coherency
- Inter-parachain communication (XCM) has lower coherency
- State is partitioned between parachains

## The Balance

No system can maximize all five factors simultaneously. JAM represents a new balance point:

| Factor | Ethereum 1 | Polkadot | JAM |
|--------|-----------|----------|-----|
| Resilience | High | High | High |
| Generality | High | High | High |
| Performance | Low | Medium | High |
| Accessibility | Medium | Low | High |
| Coherency | High | Medium | Medium-High |

## Try It: Resource Limits

Understanding JAM's performance boundaries:

```ocaml
(* Size limits from lib/definitions.ml *)
let c_max_package_items = 16             (* Work items per package *)
let c_max_report_deps = 8                (* Dependencies per report *)
let c_max_package_imports = 3072         (* Imports per package *)
let c_max_package_exports = 3072         (* Exports per package *)

(* Maximum work-package bundle size: about 13.8 MB *)
let c_max_bundle_size = 13_791_360       (* bytes *)

(* What can we compute? *)
let max_refine_gas = 5_000_000_000L      (* 5 billion gas for refine *)

(* Up to GP v0.7 every instruction cost 1 gas, so this was 5 billion
   instructions. Since v0.8.0 each basic block costs the virtual CPU cycles
   a pipeline model needs for it, so gas per instruction depends on the
   code: lasair's cryptographic workloads came out at about 4x their 0.7.2
   gas. Still on the order of a billion instructions. *)
(* This is orders of magnitude more than Ethereum's ~30 million gas limit *)
```

## Key Takeaways

1. **Resilience is non-negotiable** - It's what makes Web3 different
2. **Generality enables innovation** - Don't limit what can be built
3. **Performance has two dimensions** - Speed AND cost
4. **Accessibility lowers barriers** - More builders = more innovation
5. **Coherency is underrated** - Fragmentation hurts composability

## Reflection Questions

Before moving on, consider:

1. How does the 500x gas ratio between refine and accumulate affect application design?
2. Why might high coherency be difficult to achieve at scale?
3. What tradeoffs does JAM make to improve accessibility over Polkadot?

## Next Up

In the next lecture, Gavin introduces the **Size-Synchrony Antagonism** - the fundamental tradeoff that constrains all distributed systems.

[Continue to 1.3 Size-Synchrony Antagonism &rarr;](lesson.html?lesson=011-graypaper-lectures/03-size-synchrony)
