---
title: "2.3 Fragmented Meta-Networks"
duration: 2 min
video: https://www.youtube.com/watch?v=AUQZ38Wgl4c
---

# Graypaper Section 2.3: Fragmented Meta-Networks

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this brief lecture, Gavin critiques "bridge chain" architectures like Cosmos, explaining why fragmented validator sets create fundamental security problems.

## What This Lecture Covers

- The security model of bridge chains (Cosmos-style)
- Why different consensus = different security guarantees
- The "weakest link" problem in cross-chain communication
- Why validator set sharing is expensive
- Persistent state fragmentation (same issue as Polkadot)

## Bridge Chains: The Basic Idea

Systems like Cosmos use **independent chains connected by bridges**:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Chain A   │      │   Chain B   │      │   Chain C   │
│ Validators: │      │ Validators: │      │ Validators: │
│    V1-V10   │◄────►│   V11-V20   │◄────►│   V21-V30   │
│  $100M stake│ IBC  │  $10M stake │ IBC  │  $50M stake │
└─────────────┘      └─────────────┘      └─────────────┘
     Bridge              Bridge              Bridge
```

Each chain has its own:
- Validator set
- Consensus mechanism
- Economic security (stake)
- State

## The Security Problem

**The Weakest Link Attack:**

When Chain A (with $100M security) communicates with Chain B (with $10M security):

```
Chain A thinks: "I have $100M of security"
Chain B sends: "Here's 1M tokens"
Chain A accepts: Based on Chain B's word

Attack cost: Compromise Chain B ($10M)
Attack reward: Steal from Chain A ($100M in assets)
Profit: $90M
```

*Your cross-chain security is only as strong as the weakest chain you communicate with.*

<div class="callout callout-warning">

**ELI5: The Weakest Link**

Imagine three safes connected by doors. Safe A has a $1M lock, Safe B has a $100 lock, Safe C has a $500K lock.

A thief doesn't need to break into Safe A directly. They can:
1. Pick the $100 lock on Safe B
2. Walk through the connecting door to Safe A
3. Steal everything

Your security is only as good as your weakest neighbor.

</div>

## "Just Share Validators"?

One proposed solution: Have all chains use the same validator set.

**Why this is hard:**

| Challenge | Description |
|-----------|-------------|
| **Coordination cost** | Same validators must run all chains |
| **State bloat** | Each validator needs state for every chain |
| **Consensus overhead** | More chains = more consensus rounds |
| **Economic complexity** | How to slash across chains? |

Gavin mentions **OmniLedger** as one protocol that attempts smart validator sharing, but notes it hasn't been properly deployed.

<div class="lasair-connection">

### In Lasair: Shared Security by Design

JAM provides shared security without the coordination problems:

```ocaml
(* Illustrative sketch (not lasair's code) - JAM's unified validator set *)

(** All services share the SAME validators: 1023 at full size (since
    GP v0.8.0 any multiple of 3 from 6 to 1023) *)
let c_validators = 1023

(** Validators are assigned to cores, not chains *)
type core_assignment = {
  core_index: int;              (* 0 to 340 *)
  validators: validator_key list;  (* 3 of the validator set *)
}

(** All cores use the same consensus and finality *)
type block_seal = {
  tickets: ticket list;         (* SAFROLE ticket lottery *)
  seal: bandersnatch_signature; (* Same crypto everywhere *)
}

(* Key difference from Cosmos:
   - One validator set (up to 1023 nodes)
   - One consensus (SAFROLE + GRANDPA)
   - Services move between cores freely
   - No "weakest chain" problem *)
```

Every service benefits from the **full economic security** of the entire validator set, not just their local chain's validators.

</div>

## Persistent State Fragmentation

Bridge chains suffer the **same problem as Polkadot** (see lecture 2.1):

```
State Fragmentation in Cosmos:

Chain A State:    Chain B State:    Chain C State:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Accounts     │  │ Accounts     │  │ Accounts     │
│ Contracts    │  │ Contracts    │  │ Contracts    │
│ Balances     │  │ Balances     │  │ Balances     │
└──────────────┘  └──────────────┘  └──────────────┘
       │                │                │
       │     State CANNOT move easily    │
       └────────────────┴────────────────┘
```

This puts fragmented meta-networks in the **top-left corner** of the size-synchrony curve:
- High synchrony only **within** a chain
- Low synchrony **between** chains
- State permanently tied to its home chain

## Position on the Size-Synchrony Curve

```
Synchrony
    ▲
    │  ┌───────────────────────┐
    │  │ Fragmented Meta-Nets  │
    │  │ (Cosmos, etc.)        │ ← Same corner as Polkadot
    │  │ • High internal sync  │
    │  │ • Low cross-chain     │
    │  └───────────────────────┘
    │
    │                              ┌───────────┐
    │                              │    JAM    │
    │                              │   goal    │
    │                              └───────────┘
    │
    └──────────────────────────────────────────▶ Size
```

## Key Takeaways

1. **Bridge chains are inherently insecure** - Weakest chain determines overall security
2. **Different validators = different security** - No shared economic guarantees
3. **Sharing validators is expensive** - Coordination and state costs add up
4. **State fragmentation persists** - Same problem as Polkadot parachains
5. **JAM solves this** - One validator set, one consensus, shared security

## Why This Matters

Understanding bridge chain limitations helps explain why JAM:
- Uses a **single** validator set (up to 1023 nodes)
- Has **unified** consensus (SAFROLE + GRANDPA)
- Allows services to run on **any** core
- Doesn't require bridges between services

## What's Next

We conclude the Prior Work section by examining high-performance fully synchronous networks - the other extreme of the design space.

[Next: 2.4 High-Performance Fully Synchronous Networks &rarr;](lesson.html?lesson=011-graypaper-lectures/07-high-performance)
