---
title: "9.1 Code and Gas"
duration: 10 min
video: https://www.youtube.com/watch?v=5UonAD0EpKI
---

# Graypaper Section 9.1: Code and Gas

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how service **code is stored and referenced** in JAM, and introduces the **entry points** that define service behavior (three in the lecture, two in GP 0.8.0).

## What This Section Covers

- How code is stored as a preimage
- The bold C notation for code
- Entry points: Refine and Accumulate (the lecture's OnTransfer no longer exists)
- Gas limits for work items and transfers

## Code Storage: Hash vs Preimage

Services store only the **hash** of their code on-chain, not the code itself:

```
Service Account contains:
  codehash: hash   ← Only the hash is stored

Preimages dictionary contains:
  codehash → actual_code_bytes
```

<div class="callout callout-info">

**ELI5: The Library Card Catalog**

Think of it like a library:
- Your library card (service account) has a reference number
- The actual book (code) is stored on the shelf (preimages)
- When you need the book, you look up the reference number

This separation means:
- Small on-chain storage (just 32 bytes for the hash)
- Code can be large (megabytes)
- Multiple services can share the same code

</div>

## The Bold C Notation

In the Graypaper, **bold C** (𝐂) is a convenience notation:

```
𝐂ₛ = The code of service s

Formally:
  𝐂ₛ is the preimage where H(𝐂ₛ) = s.codehash
  AND 𝐂ₛ ∈ s.preimages

In practice:
  𝐂ₛ = lookup(s.preimages, s.codehash)
```

<div class="lasair-connection">

### In Lasair: Getting Code

```ocaml
(* lib/accounts.ml *)

(** Get code from account's preimages.
    The code is stored as encode(metadata, code) at the codehash.
    Returns None if codehash not in preimages or invalid encoding. *)
let get_code (account : service_account) : (bytes * bytes) option =
  (* Find preimage matching codehash *)
  match Array.find_opt (fun (h, _) ->
    Bytes.equal (Hash.to_bytes h) (Hash.to_bytes account.codehash)
  ) account.preimages with
  | Some (_, blob) ->
    (* Decode the blob as (metadata, code) pair *)
    Some (Bytes.empty, blob)
  | None -> None
```

</div>

## Two Entry Points

Every service has **two exported functions** at specific indices:

| Index | Name | Where | Purpose |
|-------|------|-------|---------|
| 0 | **Refine** | In-core | Process work items (stateless) |
| 1 | **Accumulate** | On-chain | Update state with results and incoming transfers |

```
Service Code Structure:
  ┌─────────────────────────────────────────────────────┐
  │ Entry 0: refine(work_item) → work_result            │  ← In-core
  ├─────────────────────────────────────────────────────┤
  │ Entry 1: accumulate(results, transfers) → state'    │  ← On-chain
  └─────────────────────────────────────────────────────┘
```

<div class="callout callout-warning">

**GP 0.8.0:** there are exactly two entry points, 0 `refine` and 1 `accumulate` (section 9.1). The lecture's third, `on_transfer`, was removed in GP 0.7.1 and has not come back: a deferred transfer is now delivered as an input to the receiving service's Accumulate invocation, alongside the work-item operands (appendix B.4, Ψ_A takes a sequence of operand tuples and deferred transfers). The PVM accordingly has exactly three invocations: Is-Authorized, Refine and Accumulate.

</div>

<div class="lasair-connection">

### In Lasair: Entry Point Types

```ocaml
(* From lib/accounts.ml *)

(** Entry point identifiers *)
type entry_point =
  | Refine      (** 0: In-core, stateless refinement *)
  | Accumulate  (** 1: On-chain, stateful accumulation *)

let entry_point_index : entry_point -> int = function
  | Refine -> 0
  | Accumulate -> 1
```

There is no third constructor: incoming transfers reach the service through `accumulate`.

</div>

## Refine vs Accumulate

The two main entry points serve different purposes:

<div class="callout callout-info">

**ELI5: The Factory Analogy**

Think of a factory with two departments:

**Refine (Assembly Line)**
- Many workers (cores) process items in parallel
- Each worker does the same job independently
- No shared memory between workers
- Very fast (~300x throughput)

**Accumulate (Quality Control Office)**
- Single office processes all finished items
- Updates the master inventory (state)
- Has full read/write access
- Must happen in order (1x throughput)

</div>

```
                    ┌─────────────────────────────────────────┐
                    │            Work Package                  │
                    └─────────────────┬───────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
        ┌──────────┐           ┌──────────┐           ┌──────────┐
        │  Core 0  │           │  Core 1  │           │  Core 2  │
        │  refine  │           │  refine  │           │  refine  │
        └────┬─────┘           └────┬─────┘           └────┬─────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                           ┌────────────────┐
                           │   On-Chain     │
                           │   accumulate   │
                           └────────────────┘
```

## Gas Limits

Services specify minimum gas requirements:

```
Service Account contains:
  min_acc_gas   ← Minimum gas per work-item for accumulate
  min_memo_gas  ← Minimum gas per deferred transfer (also for accumulate)
```

<div class="lasair-connection">

### In Lasair: Gas Fields

```ocaml
(* lib/accounts.ml *)

type service_account = {
  (* ... other fields ... *)
  min_acc_gas: gas;    (** Min gas per work-item for accumulate *)
  min_memo_gas: gas;   (** Min gas per deferred-transfer *)
  (* ... *)
}
```

</div>

These limits ensure:
- Work items provide enough gas for processing
- Transfers aren't DOS vectors (must pay for handling)

## Code Upgrade Process

To upgrade service code safely:

```
Step 1: Upload new code as preimage
  - Request preimage storage
  - Wait for preimage to appear on-chain

Step 2: Change codehash
  - Only AFTER preimage is confirmed
  - Otherwise service has no runnable code!

WRONG ORDER:
  1. Change codehash to H(new_code)  ← Service breaks!
  2. Upload new_code as preimage     ← Too late

RIGHT ORDER:
  1. Upload new_code as preimage     ← Code available
  2. Change codehash to H(new_code)  ← Safe upgrade
```

<div class="callout callout-warning">

**Upgrade Safety**

If you change the codehash before uploading the preimage, your service becomes non-functional. There's no code to run! Always upload the new code first, then update the hash.

</div>

## Code Structure

The code blob is actually a tuple:

```
Code Blob = encode(↕metadata, code)

Where:
  metadata = Opaque, length-prefixed metadata (not interpreted by the protocol;
             the SDK's build tool writes name, version, license, authors)
  code     = A JAM program blob (appendix A.7): read-only and read-write data,
             heap and stack sizes, then the PVM program blob itself
```

The gas limits are account fields, not part of the metadata (section 9.1).

<div class="lasair-connection">

### In Lasair: Code Decoding

```ocaml
(* Illustrative sketch (not lasair's code). lasair strips the metadata prefix
   in skip_package_metadata, lib/pvm_program.ml. *)

let decode_service_code (blob : bytes) : (metadata * bytes) option =
  (* JAM-codec decode the tuple (metadata, code) *)
  match Serialization.decode_tuple blob with
  | Some (meta_bytes, code_bytes) ->
    let metadata = decode_metadata meta_bytes in
    Some (metadata, code_bytes)
  | None -> None
```

</div>

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Service Code Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Service Account                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ codehash: 0xabc123...  ───────────────────────────┐        │ │
│  │ min_acc_gas: 1_000_000                            │        │ │
│  │ min_memo_gas: 100_000                             │        │ │
│  │                                                   │        │ │
│  │ preimages:                                        ▼        │ │
│  │ ┌─────────────────────────────────────────────────────────┐│ │
│  │ │ 0xabc123... → [ ↕metadata | JAM program blob ]         ││ │
│  │ │              ↑                                         ││ │
│  │ │              Code blob (metadata + program)            ││ │
│  │ └─────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Entry Points:                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [0] refine(payload, preimages) → (result, exports)        │  │
│  │     • Runs in-core (parallel, ~300x)                      │  │
│  │     • Read-only preimage access                           │  │
│  │     • Stateless                                           │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ [1] accumulate(operands, transfers) → state_changes       │  │
│  │     • Runs on-chain (sequential, 1x)                      │  │
│  │     • Full state read/write                               │  │
│  │     • Receives incoming transfers as inputs               │  │
│  │     • Creates transfers, modifies storage                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Code stored as preimage** - Only hash on-chain, full code in preimages
2. **Bold C notation** - Convenience for "the code of service s"
3. **Two entry points** - Refine (0), Accumulate (1); transfers go to Accumulate
4. **Refine is in-core** - Parallel, stateless, ~300x throughput
5. **Accumulate is on-chain** - Sequential, stateful, authoritative
6. **Gas minimums** - Protect against underprovisioned work items
7. **Upgrade order matters** - Upload preimage before changing hash

## Graypaper References

- Section 9.1: Code and Gas
- Bold C notation definition
- Entry point indices

## What's Next

Return to the main accounts section or explore preimage lookups.

[Back to 9.0 Accounts &rarr;](lesson.html?lesson=011-graypaper-lectures/32-accounts)
