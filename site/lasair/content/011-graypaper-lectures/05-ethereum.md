---
title: "2.2 Ethereum"
duration: 3 min
video: https://www.youtube.com/watch?v=45c2oQTs-P8
---

# Graypaper Section 2.2: Ethereum - Prior Work

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this brief but incisive lecture, Gavin examines Ethereum's scaling approach and identifies fundamental issues that JAM is designed to avoid.

## What This Lecture Covers

- Ethereum 1's scalability limitations
- Ethereum 2's ZK rollup strategy and its costs
- The centralization problem with ZK proofs
- The "patchwork quilt" scaling model
- Why heterogeneous standards fragment the ecosystem

## Ethereum 1: The Baseline Problem

Ethereum 1 is **not very scalable at all**. This is the starting point for understanding everything that follows.

**Why?** Every node must execute every transaction. This creates a hard ceiling on throughput - you can only process as fast as the slowest validator can verify.

Think of it like a classroom where every student must solve every math problem together. No matter how many students you add, you can't go faster than the slowest solver.

## Ethereum 2 and ZK Rollups

Ethereum 2's primary scaling strategy is **ZK (Zero-Knowledge) rollups**. The idea:

1. Process transactions off-chain
2. Generate a cryptographic proof that the processing was correct
3. Submit just the proof to the main chain

Sounds elegant, but Gavin identifies two critical issues:

### Issue 1: Extreme Cost

ZK rollups are **millions of times more expensive** than crypto-economic approaches (like Polkadot's or JAM's):

| Approach | How it Works | Relative Cost |
|----------|--------------|---------------|
| **ZK Rollup** | Math proof of correctness | ~1,000,000x |
| **Crypto-economic** | Economic incentives + fraud proofs | 1x (baseline) |

*Why so expensive?* ZK proofs require massive computational work - converting arbitrary computation into circuit constraints and generating proofs is fundamentally costly.

### Issue 2: Centralization Pressure

ZK proof generation is so expensive that it creates a **centralization monopoly**:

```
The ZK Centralization Trap:

1. Only the cheapest prover can profitably operate
2. Only one prover operates → Single point of failure
3. If they stop, someone else must "spin up"
4. Spinning up takes time → Potential disruption window
5. Attacker can choose WHEN to cause disruption

Result: Mathematically decentralized, economically centralized
```

The proof is verifiable, so you can argue "who cares if one entity produces it?" But:
- Financial systems can't afford **any** downtime
- Attackers can exploit the transition window
- "Just trust the math" doesn't help if the service stops

<div class="lasair-connection">

### In Lasair: Crypto-Economic Security

JAM uses economic incentives rather than mathematical proofs for scalability:

```ocaml
(* Illustrative sketch (not lasair's code) - validator guarantees *)

(** Validators stake tokens as a security bond (held by the staking
    system JAM hosts, not in JAM state) *)
type validator_bond = {
  stake: int64;              (* Amount at risk *)
  validator_key: ed25519_public;
}

(** Guaranteed work gets audited probabilistically *)
type work_guarantee = {
  report: work_report;
  guarantor_signatures: signature list;  (* Validators vouch for this *)
}

(* If the work is wrong, the guarantors are recorded as offenders and
   the staking system slashes them.
   No expensive ZK proof needed - just honest economics. *)

(** Number of validators: 1023 at full size. Since GP v0.8.0 it is not a
    constant: any multiple of 3 from 6 to 1023 (the set 𝕍). *)
let c_validators = 1023

(** Each active core has three assigned guarantors *)
let c_cores = 341
```

The key insight: We don't need mathematical certainty for *every* piece of work. We need:
1. Enough security that attacking is economically irrational
2. Eventual detection of any fraud
3. Punishment that exceeds potential gains

This is **orders of magnitude cheaper** than ZK proofs.

</div>

## The Patchwork Problem

Gavin calls Ethereum 2 scaling "patchy" - a **patchwork quilt** approach:

```
Ethereum's Scaling Landscape:

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Rollup A   │  │  Rollup B   │  │  Rollup C   │
│  (ZK)       │  │  (Optimistic)│  │  (ZK)       │
│  Standard X │  │  Standard Y │  │  Standard Z │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
   ┌───────────────────────────────────────┐
   │           Ethereum L1                 │
   │     (Slow, expensive, but unified)    │
   └───────────────────────────────────────┘
```

**Problems with this approach:**

1. **Different standards** - Each rollup has its own interface
2. **No coherent scaling path** - App developers must choose a rollup
3. **Cross-rollup is painful** - Back to L1 or complex bridges
4. **Lock-in** - Choosing wrong rollup means migration pain

*"Let these guys scale that way, let those guys scale that way"* - but this isn't a unified system. It's fragmentation disguised as optionality.

<div class="lasair-connection">

### In Lasair: Unified Scaling

JAM provides a **single coherent scaling model**:

```ocaml
(* Illustrative sketch (not lasair's code) - JAM's unified model *)

(** Every service uses the same execution environment *)
type service_code = bytes  (* PVM bytecode - universal *)

(** All services can be refined on any core *)
type work_package = {
  authorization: auth_code;
  context: refine_context;
  items: work_item list;    (* 1 to 16 items, all execute in same PVM *)
}

(** Standard interface for all work *)
type work_item = {
  service: service_id;
  code_hash: hash;          (* Points to PVM code *)
  payload: bytes;
  refine_gas_limit: int64;
  accumulate_gas_limit: int64;
}

(* No "which rollup standard?" question.
   All services speak the same language: PVM. *)
```

Compare:
- **Ethereum 2**: Many rollups, many standards, bridges needed
- **JAM**: One PVM, one standard, native interoperability

</div>

## The Asynchrony Problem Returns

Even with rollups, Ethereum faces the same problem as Polkadot parachains:

**Cross-rollup communication is asynchronous and slow.**

```
Want to move assets Rollup A → Rollup B?

Option 1: Through L1 (Ethereum mainnet)
  - Exit Rollup A (wait for challenge period: ~7 days for optimistic)
  - Transaction on L1
  - Enter Rollup B
  Total: Days to weeks

Option 2: Bridge
  - Trust a third party
  - Pay bridge fees
  - Hope bridge isn't hacked
  Total: Fast but risky
```

This brings us back to the **size-synchrony antagonism** from lecture 1.3:
- Within a rollup: High synchrony, limited size
- Across rollups: Low synchrony, complex interactions

JAM's goal is to do better on both dimensions simultaneously.

## Key Takeaways

1. **ZK rollups are expensive** - Millions of times more than crypto-economic approaches
2. **ZK creates centralization** - Only cheapest prover survives economically
3. **Patchwork doesn't scale coherently** - Different standards, fragmented ecosystem
4. **Cross-rollup is still async** - Same fundamental problem as cross-chain
5. **JAM chooses differently** - Crypto-economic security + unified execution model

## Why This Matters for Lasair

Understanding Ethereum's limitations helps explain JAM's design choices:

| Ethereum 2 Choice | JAM Alternative | Lasair Implementation |
|-------------------|-----------------|----------------------|
| ZK proofs | Crypto-economic guarantees | Validator bonds, auditing |
| Multiple rollup standards | Single PVM | `lib/pvm.ml` |
| App chooses scaling provider | Unified core assignment | Work packages to any core |
| Complex bridges | Native service calls | Host call interface |

## What's Next

Continue with **Section 2.3: Fragmented Meta-Networks** to see how other approaches to multi-chain scaling compare.

[Next: 2.3 Fragmented Meta-Networks &rarr;](lesson.html?lesson=011-graypaper-lectures/06-fragmented-networks)
