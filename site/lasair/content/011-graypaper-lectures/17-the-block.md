---
title: "4.1 The Block"
duration: 2 min
video: https://www.youtube.com/watch?v=R2aLFN60LjA
---

# Graypaper Section 4.1: The Block

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines the structure of a JAM block - the fundamental unit of state change in the protocol.

## What This Lecture Covers

- Block structure (Header + Extrinsic)
- The five extrinsic components
- How blocks drive state transitions

## Block Structure

A block **B** consists of two parts:

```
B = (H, E)

H = Header  (metadata, cryptographic references)
E = Extrinsic (external input data)
```

<div class="callout callout-info">

**ELI5: Block = Envelope + Contents**

Think of a block like a sealed envelope:
- **Header (H)** = The envelope itself (sender, timestamp, seal)
- **Extrinsic (E)** = The documents inside (the actual work)

The header proves the envelope is valid. The extrinsic contains what actually changes state.

</div>

## The Five Extrinsic Components

The extrinsic **E** has five distinct parts:

```
E = (E_T, E_D, E_P, E_A, E_G)

E_T = Tickets      (validator slot claiming)
E_D = Disputes     (validity judgments)
E_P = Preimages    (data availability)
E_A = Assurances   (availability attestations)
E_G = Guarantees   (work report submissions)
```

Each component triggers different state changes:

| Component | Purpose | State Affected |
|-----------|---------|----------------|
| Tickets | Claim block production slots | γ (Safrole) |
| Disputes | Judge work report validity | ψ (Judgments) |
| Preimages | Make data available | δ (Accounts) |
| Assurances | Attest data availability | ρ (availability assignments), then accumulation into δ |
| Guarantees | Submit work reports | ρ, α (availability assignments, authorizer pools) |

<div class="lasair-connection">

### In Lasair: Block and Extrinsic Types

```ocaml
(* lib/overview.ml - Block structure *)

(** Extrinsic data components - external inputs to state transition.
    E = (E_T, E_D, E_P, E_A, E_G) *)
type extrinsic = {
  tickets:    bytes seq;    (** E_T: Safrole ticket submissions *)
  disputes:   bytes seq;    (** E_D: Dispute/judgment extrinsics *)
  preimages:  bytes seq;    (** E_P: Preimage availability requests *)
  assurances: bytes seq;    (** E_A: Validator availability assurances *)
  guarantees: bytes seq;    (** E_G: Guaranteed work reports *)
}

(** Block = Header + Extrinsic *)
type block = {
  header: header;
  extrinsic: extrinsic;
}
```

</div>

## Block Header

The header contains metadata about the block:

```
H = (
  parent,         -- Hash of parent block
  state_root,     -- Merkle root of the PRIOR state (the parent's posterior state)
  extrinsic_hash, -- Hash of extrinsic data
  timeslot,       -- When the block was produced
  ...             -- Additional fields
)
```

<div class="lasair-connection">

### In Lasair: Header Type

```ocaml
(* lib/overview.ml - Block header *)

(** Block header - immutable metadata known a priori.
    Contains cryptographic references to ancestors and state roots. *)
type header = {
  parent: hash;             (** Hash of parent block's header *)
  state_root: hash;         (** Merkle root of posterior state *)
  extrinsic_hash: hash;     (** Hash of extrinsic data *)
  timeslot: timeslot;       (** Block's timeslot index *)
  (* Additional fields defined in header.tex *)
}
```

The comment on `state_root` in this early module is loose: the Graypaper's H_R is the *prior* state root, the state after the parent block (section 5). A block's own posterior root only appears in its child's header. The full header is `trace_header` in `conformance/trace_types.ml`.

</div>

## Processing Flow

When a block arrives:

```
1. Validate header (parent exists, timeslot valid, etc.)
2. For each extrinsic component:
   - Tickets → Update Safrole state
   - Disputes → Record judgments
   - Preimages → Store data in accounts
   - Assurances → Update report availability
   - Guarantees → Assign work reports to cores
3. Check the header's state_root against the prior state σ
4. Compute posterior state σ' (its root goes in the next block's header)
```

<div class="callout callout-info">

**ELI5: Processing a Block**

Like opening mail:
1. Check the envelope is properly addressed (header validation)
2. Open it and sort the documents by type (parse extrinsics)
3. Process each document according to its type
4. Update your files (state transition)
5. File everything away (commit new state)

</div>

## Key Takeaways

1. **B = (H, E)** - Block is Header + Extrinsic
2. **Five components** - Tickets, Disputes, Preimages, Assurances, Guarantees
3. **Each component** affects different parts of state
4. **Header** contains cryptographic proofs and metadata

## What's Next

Continue with **Section 4.2: The State** to understand JAM's state structure in detail.

[Next: 4.2 The State &rarr;](lesson.html?lesson=011-graypaper-lectures/18-the-state)
