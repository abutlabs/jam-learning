---
title: "1.3 Size-Synchrony Antagonism"
duration: 20 min
video: https://www.youtube.com/watch?v=8f4aibO5vTI
---

# Graypaper Section 1.3: Scaling Under Size-Synchrony Antagonism

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this pivotal lecture, Gavin introduces a fundamental principle that constrains all distributed systems: **size-synchrony antagonism**. Understanding this tradeoff is essential to appreciating what JAM achieves.

## The Fundamental Tradeoff

**Size-Synchrony Antagonism**: As a system grows larger, it becomes less internally synchronous (coherent). This is a natural law - you cannot escape it, only manage it.

```
            High Synchrony
                 ▲
                 │     ╭─────────────────╮
                 │    ╱                   ╲
                 │   ╱   IMPOSSIBLE        ╲
                 │  ╱     REGION            ╲
                 │ ╱                         ╲
                 │╱  • Ethereum 1             ╲
                 │   (small but coherent)      ╲
                 │                              ╲
                 │              • JAM            ╲
                 │              (sweet spot)      ╲
                 │                                 ╲
                 │                    • 10000 chains
                 │                    (large but fragmented)
                 └────────────────────────────────────▶
                                                    Large Size
```

## Examples Across Domains

Gavin shows this principle appears everywhere:

### Computer Architecture
| Level | Size | Synchrony |
|-------|------|-----------|
| CPU Registers | ~32 words | Instant access |
| L1 Cache | ~64 KB | ~1 nanosecond |
| L2 Cache | ~256 KB | ~3 nanoseconds |
| L3 Cache | ~8 MB | ~12 nanoseconds |
| RAM | ~64 GB | ~100 nanoseconds |
| SSD | ~1 TB | ~100 microseconds |
| Network | Unlimited | ~100 milliseconds |

As we move to larger storage, latency increases - synchrony decreases.

### Blockchain Systems
| System | Size | Synchrony |
|--------|------|-----------|
| Single smart contract | Small | Perfect (synchronous calls) |
| Ethereum 1 | Medium | High (any contract calls any) |
| Polkadot parachain | Medium | High (internal) |
| Cross-parachain (XCM) | Large | Low (async, multi-block) |
| Cross-chain bridges | Huge | Very low (minutes to hours) |

<div class="lasair-connection">

### In Lasair: The Core Count Sweet Spot

JAM's 341 cores represent a carefully chosen point on the size-synchrony curve:

```ocaml
(* Based on lib/definitions.ml (the validators_per_core line is added here) *)
module Constants = struct
  let c_core_count = 341        (* Total execution cores *)
  let c_val_count = 1023        (* Total validators (the full-size set) *)

  (* Validators per core: exactly 3 *)
  let validators_per_core = c_val_count / c_core_count  (* = 3 *)

  (* Rotation period - how often validators switch cores *)
  let c_rotation_period = 10    (* Every 10 slots *)
end

(* Why 341 cores and 1023 validators? *)
(*
   - 1023 = 3 * 341 = 3 validators per core
   - This enables the audit/guarantee game theory
   - More cores = more parallelism (size)
   - Fewer validators per core = faster guarantees (synchrony)

   341 is the sweet spot where:
   - We get massive parallel throughput
   - But guarantees still arrive within reasonable time
*)
```

The numbers aren't arbitrary - they're the result of balancing size (parallel cores) against synchrony (how quickly we can finalize work).

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the validator count is no longer the constant V = 1023. A validator key sequence may have any length that is a multiple of 3 from 6 up to 3 × 341 = 1023 (section 6.3, eq. `valcount`), and only the first |κ′|/3 cores are *active* (section 11.3). The three-guarantors-per-core rule is what stayed fixed; 341 cores and 1023 validators is the full-size network.

</div>

## Why You Can't Escape It

Think about it physically:
- Information takes time to travel
- Larger systems = longer paths = more latency
- More participants = more coordination overhead
- You can optimize, but you can't eliminate

The question isn't "how do we avoid this tradeoff?" but "where on the curve do we want to be?"

## Where Systems Sit on the Curve

**Ethereum 1: High Synchrony, Limited Size**
- Any contract can call any other synchronously
- All state is equally accessible
- But: ~15 TPS, limited by every node processing everything

**10,000 Independent Chains: Huge Size, Low Synchrony**
- Unlimited aggregate throughput
- But: Bridging is slow, insecure, fragmented
- Composability is a nightmare

**Polkadot: Two Distinct Regions**
- Internal parachain: High synchrony
- Cross-parachain: Low synchrony (XCM takes multiple blocks)
- Users experience different coherency depending on where their dApps live

**JAM: The Sweet Spot**
- Size comparable to multi-chain ecosystems
- Synchrony approaching single-chain systems
- How? By separating heavy computation (incore) from state updates (onchain)

## The JAM Innovation

JAM doesn't break the size-synchrony law - it finds a better position on the curve:

```
Traditional approach:
  All computation → Onchain → Limited by consensus bottleneck

JAM approach:
  Heavy computation → Incore (parallel, game-theoretic security)
  Light state updates → Onchain (sequential, consensus security)
```

This lets JAM get the best of both worlds within the constraints of physics.

## Try It: Timing Calculations

Let's calculate how synchrony manifests in JAM's timing:

```ocaml
(* Timing constants *)
let c_slot_seconds = 6         (* Block time *)
let c_rotation_period = 10     (* Validator rotation *)
let c_tranche_seconds = 8      (* Audit tranche period *)
let c_assurance_timeout = 5    (* Blocks before work expires *)

(* How long does work take to finalize? *)
let worst_case_refinement_blocks = c_assurance_timeout
let worst_case_refinement_seconds = worst_case_refinement_blocks * c_slot_seconds
(* worst_case_refinement_seconds = 30 seconds *)

(* Compare to XCM cross-chain time: often 2-4 blocks minimum *)
(* JAM's incore work is faster than Polkadot's cross-chain messaging! *)

(* Audit tranches *)
let tranches_per_slot = c_slot_seconds / c_tranche_seconds
(* Hmm, that's less than 1 - audits span multiple slots *)

(* Total audit period *)
let audit_tranches = 30  (* approximate from Graypaper *)
let total_audit_seconds = audit_tranches * c_tranche_seconds
(* total_audit_seconds = 240 seconds = 4 minutes for full audit *)
```

## Key Takeaways

1. **Size-synchrony antagonism is a natural law** - All distributed systems face it
2. **You manage it, not escape it** - Design choices determine your position on the curve
3. **Different positions suit different needs** - There's no universally "best" point
4. **JAM finds a new sweet spot** - Incore/onchain split enables better tradeoffs
5. **The curve constrains what's possible** - Understanding it prevents magical thinking

## Reflection Questions

1. Where would you place Bitcoin on the size-synchrony curve?
2. Why can't we just add more validators to get both more size and more synchrony?
3. How does the 6-second block time relate to the synchrony constraints?

## Next Up

Now that we understand the fundamental constraints, let's examine how Polkadot currently addresses them - and where it falls short.

[Continue to 2.1 Polkadot &rarr;](lesson.html?lesson=011-graypaper-lectures/04-polkadot)
