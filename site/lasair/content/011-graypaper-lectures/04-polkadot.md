---
title: "2.1 Polkadot"
duration: 20 min
video: https://www.youtube.com/watch?v=jFUQje4puAM
---

# Graypaper Section 2.1: Polkadot - Past Work

<span class="lecture-badge">Gavin Wood Lecture Series</span>

In this lecture, Gavin provides a critical analysis of Polkadot's current architecture, identifying both its strengths and the limitations that motivated JAM's design.

## Polkadot's Current Model

Polkadot's relay chain provides shared security for multiple **parachains** - independent blockchains that run in parallel. This architecture delivers:

- **Shared Security** - All parachains benefit from the relay chain's validator set
- **Parallel Execution** - Multiple chains process transactions simultaneously
- **Interoperability** - XCM enables cross-chain messaging

But it also has significant constraints.

## Barrier to Entry

**The Slot Auction Problem:**
- To become a parachain, you must win a slot auction
- Slots are limited and expensive
- You need to lock up significant DOT tokens
- Winners operate for a fixed lease period

**What This Means:**
- High financial barrier to experimentation
- Favors well-funded projects over innovative but resource-constrained ones
- Not truly "permissionless" in the low-barrier sense

*Note: Agile Coretime is relaxing some of these constraints, but fundamental architecture remains.*

## Persistent State Partitioning

This is the deeper issue Gavin identifies:

**The Problem:**
- Each parachain has its own state (represented as a Merkle root)
- State is **persistently split** between parachains
- A smart contract on Moonbeam **cannot move** to Astar
- Cross-chain state access requires complex messaging

**On the Size-Synchrony Curve:**

```
Synchrony
    ▲
    │  ┌──────────────┐
    │  │ Single       │
    │  │ Parachain    │ ← High synchrony (like Ethereum 1)
    │  │ (internal)   │
    │  └──────────────┘
    │
    │                     ┌──────────────────────┐
    │                     │ Cross-Parachain      │
    │                     │ (XCM)                │ ← Low synchrony
    │                     │ Multiple blocks wait │
    │                     └──────────────────────┘
    │
    └──────────────────────────────────────────────▶ Size
```

Polkadot gives you **two different experiences**:
- Inside a parachain: Ethereum-like coherency
- Across parachains: Fragmented, asynchronous

<div class="lasair-connection">

### In Lasair: Unified State Model

JAM replaces persistent state partitioning with a unified service model. In Lasair, we represent this with explicit service state types:

```ocaml
(* lib/definitions.ml *)

(** Service ID: N_{2^32} - every service has a unique 32-bit identifier *)
type service_id = int32

(** Services can be public or private *)
let c_min_public_index = 65536   (* 2^16 *)

let is_public_service (id : service_id) : bool =
  Int32.to_int id >= c_min_public_index

(* Unlike parachains, services don't "own" cores permanently.
   Any service can use any core - state is not partitioned by execution location. *)

(** Work items reference services, not chains *)
type work_context = {
  service: service_id;           (* Which service handles this work *)
  code_hash: Hash.t;             (* The code to execute *)
  payload_hash: Hash.t;          (* The work item data *)
  (* ... *)
}
```

The key difference: in Polkadot, your parachain is bound to specific cores. In JAM, your service can execute on any available core - state follows logic, not location.

</div>

## XCM Latency

When you use XCM (Cross-Consensus Messaging) between parachains:

1. Message is sent from source parachain (1 block)
2. Message appears in relay chain (1 block)
3. Message delivered to destination parachain (1 block)
4. Destination processes and responds (1+ blocks)

**Minimum latency: 2-4 blocks** just for a simple message.

Compare to same-chain calls: **0 blocks** (synchronous).

This is the coherency problem - different parts of "Polkadot" have vastly different interaction characteristics.

## What JAM Changes

JAM addresses these issues by:

| Polkadot | JAM |
|----------|-----|
| Win slot auction | Just deploy (permissionless) |
| State bound to parachain | State bound to service |
| Fixed core assignment | Dynamic core allocation |
| XCM for cross-chain | Direct service calls |
| Parachain-specific runtime | Universal PVM |

**The Goal:** Move both dots on the size-synchrony curve:

```
Before (Polkadot):
  • Intra-parachain: High sync, limited size
  • Cross-parachain: Low sync, large size

After (JAM):
  • All services: Medium-high sync, large size
  (Approaching the curve's optimal point)
```

## Try It: Service Deposits

In JAM, deploying a service requires deposits, not auctions:

```ocaml
(* lib/definitions.ml *)
module Constants = struct
  let c_base_deposit = 100       (* Basic minimum balance *)
  let c_item_deposit = 10        (* Per-item deposit *)
  let c_byte_deposit = 1         (* Per-byte deposit *)
end

(** Calculate minimum deposit for service state *)
let min_deposit ~items ~bytes : int64 =
  let open Int64 in
  add (of_int Constants.c_base_deposit)
    (add
      (mul (of_int Constants.c_item_deposit) (of_int items))
      (mul (of_int Constants.c_byte_deposit) (of_int bytes)))

(* Example: A service with 10 state items and 1KB of data *)
let example_deposit = min_deposit ~items:10 ~bytes:1024
(* example_deposit = 100 + (10 * 10) + (1024 * 1) = 1224 units *)

(* Compare this to the millions of DOT locked in slot auctions! *)
```

## The Vision

Gavin's critique isn't that Polkadot is bad - it's that we can do better. JAM aims to:

1. **Lower barriers** - From auctions to deposits
2. **Increase coherency** - Services interact more like contracts
3. **Maintain scale** - 341 cores still provide massive parallelism
4. **Preserve security** - Same validator set, same GRANDPA finality

## Key Takeaways

1. **Slot auctions create barriers** - Financial gatekeeping limits innovation
2. **State partitioning reduces coherency** - Cross-chain is fundamentally different from same-chain
3. **XCM latency is significant** - Multi-block delays hurt composability
4. **JAM moves the goalposts** - Same security model, better tradeoffs
5. **Evolution, not revolution** - JAM builds on Polkadot's proven foundations

## Reflection Questions

1. Why might state partitioning have seemed like a good idea initially?
2. How does the deposit model change the economics for small projects?
3. What applications become possible with higher cross-service coherency?

## What's Next

Having examined Polkadot's architecture and limitations, we continue our survey of prior work by looking at Ethereum's approach to scaling.

[Next: 2.2 Ethereum &rarr;](lesson.html?lesson=011-graypaper-lectures/05-ethereum)
