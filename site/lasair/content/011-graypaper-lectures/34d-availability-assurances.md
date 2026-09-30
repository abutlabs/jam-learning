---
title: "11.2 Availability Assurances"
duration: 14 min
video: https://www.youtube.com/watch?v=MCZPtuFgltw
---

# Graypaper Section 11.2: Package Availability Assurances

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This deep dive explains **availability assurances** - the mechanism that ensures erasure-coded work data is available before accumulation. This is critical for enabling auditing after the fact.

## What This Section Covers

- What availability assurances are
- The assurances extrinsic structure
- Erasure coding and chunk distribution
- Why assurances happen before accumulation

## The Problem: Don't Poison the Cake

Before we "bake the cake" (accumulate work results into state), we need to ensure all ingredients are available. Once you finalize the cake, you can't pull things out again.

<div class="callout callout-info">

**ELI5: The Recipe Analogy**

Imagine baking a cake:
- Work packages are the ingredients
- Accumulation is mixing and baking
- Once baked, you can't undo it

Availability assurances are like checking that all ingredients are on the counter before you start mixing. If flour is missing, you find out BEFORE ruining the batter, not after.

</div>

## Why Assurances Matter

When a work package is guaranteed:
1. The bundle is **erasure coded** across all validators
2. Each validator gets a small chunk (1/342 of the data at full size)
3. Any 342 of the 1023 validators (about 1/3) can reconstruct the full data

But we need to verify validators actually have their chunks **before** we accumulate!

```
Work Package → Erasure Code → 1023 Chunks → Distributed to Validators
               (GP 0.8.0: one chunk per validator of the assuring set,
                |κ'| chunks, recorded in the report as erasure_shards)
                                              ↓
                              Validators issue Assurances
                                              ↓
                              Enough assurances? → Accumulate
```

## The Assurances Extrinsic

Each block contains an assurances extrinsic:

```
Assurance = {
  flags:      bits[C]      -- One bit per core (C = 341)
  validator:  uint16       -- Validator index, < |κ| (0-1022 at full size)
  signature:  bytes[64]    -- Ed25519 signature
  anchor:     hash         -- Parent block hash
}

Extrinsic = Assurance[]    -- At most one per validator of κ
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the extrinsic is no longer bounded by a constant V; the assurer index ranges over the live active sequence, `a ∈ N_|κ|`, and "at most one per validator" (strictly increasing assurer indices) bounds its length (`reporting_assurance.tex` 11.2.1, eq. `xtassurances`). Signatures are checked against the prior κ, the set the assurers signed under.

</div>

<div class="lasair-connection">

### In Lasair: Assurance Types

```ocaml
(* lib/assurance.ml *)

(** Assurance payload for signing *)
type assurance_payload = {
  parent_hash: hash;
  availabilities: bool array;  (* One bit per core *)
}

(** Signature context *)
let assurance_context = Bytes.of_string "jam_available"

(** Create availability bitstring from ready cores *)
let create_availability_bits (state : assurance_state) : bool array =
  Array.map (function
    | Ready _ -> true
    | _ -> false
  ) state
```

</div>

## The Availability Bitstring

Each validator signs a **bitstring** where:
- `1` at position `c` = "I have chunks for core `c`'s availability assignment"
- `0` at position `c` = "I don't have complete data for core `c`"

```
Validator 7's bitstring:
  Core:  0  1  2  3  4  5  6  ...  340
  Bits: [1, 0, 1, 1, 0, 1, 1, ...   0]
         ↑     ↑  ↑     ↑  ↑
         Has   Has data for these cores
```

<div class="callout callout-info">

**ELI5: Attendance Roll Call**

The bitstring is like an attendance sheet:
- Teacher calls out each core (class)
- Validator raises hand (1) if they're ready
- Teacher marks who's present for each class

At the end, we know exactly which validators can help with which cores.

</div>

## Signature Message

The validator signs a specific message:

```
Message = "jam_available" || Blake2b(parent_hash || bitstring)

Where:
  "jam_available" = Context string (prevents cross-protocol attacks)
  parent_hash     = Hash of parent block (anchors to specific chain state)
  bitstring       = The availability flags
```

<div class="lasair-connection">

### In Lasair: Signature Verification

The learning-era `create_signature_payload` in `lib/assurance.ml` is still a TODO stub (it omits the hash and the bits). The check that runs on block import is in `conformance/stf_guarantees.ml`:

```ocaml
(* conformance/stf_guarantees.ml (block import) *)
let msg = Bytes.cat (Bytes.of_string "jam_available")
    (hash_bytes (Bytes.cat header.parent a.ta_bitfield)) in
(* GP eq. 160 uses the UNPRIMED active set: assurances were signed
   under the parent's kappa, even on an epoch-boundary block *)
let kappa_prior = read_raw 8 in
(match Stf_config.vset_ed25519 kappa_prior a.ta_validator_index with
 | Some pk ->
   if not (Ed25519_ffi.verify pk a.ta_signature msg) then
     raise (Reject "bad_signature")
 | None -> ())
```

`read_raw 8` is state key 8, κ, which GP 0.8.0 stores length-prefixed; `Stf_config.vset_ed25519` reads validator `i`'s Ed25519 key out of that variable-length sequence.

</div>

## Extrinsic Constraints

The assurances extrinsic has rules:

```
1. All assurances must anchor to parent block
2. Ordered by validator index (for efficient verification)
3. Only set bits for cores that have an availability assignment (in ρ†)
4. At most one assurance per validator of κ (1023 at full size)
```

<div class="lasair-connection">

### In Lasair: Validation Rules

```ocaml
(* Assurance validation pseudocode based on graypaper *)

(** Validate assurance extrinsic *)
let validate_assurance (assurance : assurance_payload)
    (parent : hash) (pending_cores : bool array) : bool =
  (* Anchor must match parent *)
  Hash.equal assurance.parent_hash parent &&
  (* Can only assure cores with pending reports *)
  Array.for_all2 (fun bit pending ->
    if bit then pending else true  (* bit=1 implies pending=true *)
  ) assurance.availabilities pending_cores
```

</div>

## Erasure-Coded Chunks

Validators store two types of chunks:

| Type | Purpose | Retention |
|------|---------|-----------|
| **Bundle chunks** | Validate work-report | Until the report is audited |
| **Segment chunks** | Enable data retrieval | 28 days |

```
Bundle = Work package + extrinsic data + imported segments
         + their justifications (for auditing)
Segments = Exported data blobs (for D³L retrieval)
```

<div class="lasair-connection">

### In Lasair: Chunk Types

```ocaml
(* lib/assurance.ml *)

(** Chunk for work-package bundle (auditing) *)
type bundle_chunk = {
  data: bytes;              (** Erasure-coded data *)
  proof: hash list;         (** Merkle proof of inclusion *)
  index: int;               (** Chunk index (validator position) *)
}

(** Chunk for exported segment (D³L) *)
type segment_chunk = {
  data: bytes;              (** Erasure-coded segment data *)
  proof: hash list;         (** Merkle proof *)
  segment_index: int;       (** Which segment *)
  chunk_index: int;         (** Which chunk of segment *)
}

(** Segment retention period *)
let c_segment_retention_days = 28
let c_timeslots_per_day = 24 * 60 * 10  (* 14400 *)
let c_segment_retention = c_segment_retention_days * c_timeslots_per_day
```

</div>

## Assurance State Machine

Each validator tracks their assurance status per core:

```
┌──────────────┐
│   NoReport   │ ← No pending work on core
└──────┬───────┘
       │ Report guaranteed
       ▼
┌──────────────┐
│ MissingData  │ ← Report pending, chunks incomplete
└──────┬───────┘
       │ All chunks received
       ▼
┌──────────────┐
│    Ready     │ ← Can issue assurance
└──────┬───────┘
       │ Assurance included in block
       ▼
┌──────────────┐
│   Assured    │ ← Done for this block
└──────────────┘
```

<div class="lasair-connection">

### In Lasair: Assurance State

```ocaml
(* lib/assurance.ml *)

(** Per-core assurance status for this validator *)
type assurance_status =
  | NoReport                  (** No pending report on core *)
  | MissingData               (** Report pending but data incomplete *)
  | Ready of assurance_data   (** Ready to issue assurance *)
  | Assured                   (** Already issued assurance this block *)

(** Validator's assurance state *)
type assurance_state = assurance_status array  (* per core *)

(** Get cores ready for assurance *)
let get_ready_cores (state : assurance_state) : int list =
  let ready = ref [] in
  Array.iteri (fun core status ->
    match status with
    | Ready _ -> ready := core :: !ready
    | _ -> ()
  ) state;
  List.rev !ready
```

</div>

## When Does Accumulation Happen?

Once enough validators assure a core's data is available:

```
Threshold: more than 2/3 of the active validators κ
           (683 out of 1023 at full size)

For each core c:
  count = number of validators with bit[c] = 1
  if count > 2/3 · |κ|:
    Core c's report is available and ready for accumulation
```

This 2/3 threshold ensures data can always be reconstructed (only need 1/3).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the threshold is taken over the live |κ|, not a constant V (`reporting_assurance.tex` 11.2.2, eq. `availableworkreports`). Two more ways an assignment leaves ρ‡ without becoming available: it times out (block slot ≥ the slot it was reported in + U, U = 5), or the active validator sequence changes size (|κ| ≠ |κ'|), which clears every assignment at once (eq. `availassignmentspostassurancesdef`). lasair's import path computes the threshold as `Stf_config.supermajority_of` over the prior κ read from state.

</div>

## Asynchronous Processing

A key optimization mentioned in the lecture:

```
Block Production Timeline:
  1. Process assurances → Get bold W (work ready for accumulation)
  2. Finalize header and distribute block  ← Can do NOW
  3. Actually compute accumulation          ← Can do LATER (within 6 seconds)

Why? The header doesn't commit to posterior state!
```

<div class="callout callout-warning">

**Implementation Insight**

Once you have **bold W** (the set of work to accumulate), you know accumulation won't fail. You can:
1. Send your block immediately
2. Compute the actual state transitions asynchronously
3. Have results ready before the next block (6 seconds)

This is crucial for real-time block production.

</div>

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                 Availability Assurance Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Work Package Guaranteed                                        │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Erasure Coding                                          │   │
│  │ ┌─────┬─────┬─────┬─────┬──────┬──────┬──────┐         │   │
│  │ │ C₀  │ C₁  │ C₂  │ ... │C₁₀₂₀│C₁₀₂₁│C₁₀₂₂│(1023)   │   │
│  │ └──┬──┴──┬──┴──┬──┴─────┴──┬───┴──┬───┴──┬───┘         │   │
│  │    ↓     ↓     ↓           ↓      ↓      ↓             │   │
│  │   V₀    V₁    V₂   ...  V₁₀₂₀  V₁₀₂₁  V₁₀₂₂ (Validators)│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Assurance Extrinsic (in next block)                     │   │
│  │                                                         │   │
│  │ V₀: [1,0,1,1,0,...] + signature                        │   │
│  │ V₁: [1,1,1,0,1,...] + signature                        │   │
│  │ V₂: [0,1,1,1,0,...] + signature                        │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Count Assurances Per Core                               │   │
│  │                                                         │   │
│  │ Core 0: 700 assurances ✓ (≥ 683)                       │   │
│  │ Core 1: 650 assurances ✗ (< 683)                       │   │
│  │ Core 2: 720 assurances ✓ (≥ 683)                       │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│         Cores 0, 2, ... ready for ACCUMULATION                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Assurances verify availability** - Before accumulation, confirm data exists
2. **Bitstring per validator** - One bit per core indicating readiness
3. **Signed and anchored** - Cryptographically bound to specific block
4. **2/3 threshold** - Need a supermajority of the live active set (GP 0.8.0: of |κ|, not a constant)
5. **Enables async processing** - Block production doesn't wait for accumulation

## Graypaper References

- Section 11.2: Package Availability Assurances
- Section 11.2.1: The Assurances Extrinsic (eq. `xtassurances`, eq. `assurancesig`)
- Section 11.2.2: Available Reports (eq. `availableworkreports`, eq. `availassignmentspostassurancesdef`)
- Appendix H: Erasure Coding (eq. `ecoriginalshards`)

## What's Next

Return to the main reporting section or explore other deep dives.

[Back to 11.0 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
