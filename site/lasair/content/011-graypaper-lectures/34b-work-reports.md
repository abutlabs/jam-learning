---
title: "11.1 Work Reports Deep Dive"
duration: 15 min
video: https://www.youtube.com/watch?v=wmz6Osi6Ww0
---

# Graypaper Section 11.1: Work Reports Deep Dive

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This deep dive explores the **work report** structure - the central data type that flows through JAM's execution pipeline. Understanding work reports is essential for implementing any JAM client.

## What This Section Covers

- Work packages vs work reports vs work items
- The availability specifier
- Segments and the D³L
- Work digests and results
- Size constraints and validation

## The Execution Hierarchy

```
Work Package (input)
├── Authorization data
├── Context (anchor, prerequisites)
└── Work Items (1-16)
    ├── Service ID
    ├── Payload
    ├── Gas limits
    ├── Imports (segments from other packages)
    └── Exports (segments to produce)
         |
         | Execute via PVM
         v
Work Report (output)
├── Availability Specifier (data commitment)
├── Context (same as package)
├── Core index
├── Authorization trace
└── Work Digests (1-16)
    ├── Service ID
    ├── Code hash
    ├── Result (Success/Panic/OOG/...)
    └── Gas used
```

<div class="callout callout-info">

**ELI5: The Factory Analogy**

- **Work Package** = Order form (what to make)
- **Work Item** = Individual product spec
- **Segment** = Standard shipping container (4104 bytes)
- **Work Report** = Quality certificate (what was made)
- **Work Digest** = Individual product QC report

</div>

## Work Package Structure

A work package bundles everything needed for execution:

<div class="lasair-connection">

### In Lasair: Work Package Type

```ocaml
(* lib/work_packages.ml *)

(** Work package structure *)
type work_package = {
  auth_token: bytes;        (** Authorization token blob *)
  auth_code_host: int;      (** Service hosting auth code *)
  auth_code_hash: hash;     (** Hash of authorization code *)
  auth_config: bytes;       (** Authorization configuration *)
  context: work_context;    (** Execution context *)
  work_items: work_item list;  (** 1 to 16 items *)
}

(** Work package context *)
type work_context = {
  lookup_anchor_hash: hash;    (** Block hash for lookups *)
  lookup_anchor_time: int32;   (** Timeslot of anchor *)
  prerequisite: hash option;   (** Optional dependency *)
}
```

`lib/work_packages.ml` is a learning-era model: its context is a cut-down version. The full GP 0.8.0 refinement context, as lasair encodes it on the wire (`lib/serialization.ml`), is:

```ocaml
(* lib/serialization.ml *)
type refinement_context = {
  anchor: bytes;
  anchor_slot: int;                 (** GP 0.8.0: anchor block timeslot, encode[4] (GP #526) *)
  state_root: bytes;
  beefy_root: bytes;
  lookup_anchor: bytes;
  lookup_anchor_slot: int;
  lookup_anchor_state_root: bytes;  (** GP 0.8.0: lookup-anchor posterior state root (GP #526) *)
  prerequisites: bytes list;  (* List of 32-byte hashes *)
}
```

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the refinement context gained two fields: the anchor block's timeslot and the lookup-anchor block's posterior state root (`reporting_assurance.tex` 11.1.2, eq. `workcontext`; serialization in appendix C). Prerequisites are a *set* of package hashes; together with the segment-root lookup entries they may number at most J = 8 (eq. `limitreportdeps`).

</div>

## Work Item Structure

Each work item is a computation request for a specific service:

<div class="lasair-connection">

### In Lasair: Work Item Type

```ocaml
(* lib/work_packages.ml *)

(** Work item structure *)
type work_item = {
  service_index: int;           (** Target service ID *)
  code_hash: hash;              (** Hash of service code *)
  payload: bytes;               (** Payload blob for Refine *)
  refine_gas_limit: int64;      (** Gas limit for Refine *)
  accumulate_gas_limit: int64;  (** Gas limit for Accumulate *)
  export_count: int;            (** Number of segments to export *)
  import_segments: import_spec list;   (** Imported segments *)
  extrinsics: extrinsic_spec list;     (** Extrinsic data *)
}

(** Import can reference by segment root or package hash *)
type import_ref =
  | BySegmentRoot of hash    (** Direct reference *)
  | ByPackageHash of hash    (** Needs lookup table *)

type import_spec = {
  reference: import_ref;
  index: int;  (** Which segment from that package *)
}
```

</div>

## Segments: The Data Unit

Segments are fixed-size (4104 bytes) data chunks - the "shipping containers" of JAM:

```
Segment size: W_G = 4104 bytes (splits into whole erasure-coded pieces
              for every allowed validator-set size)

Why fixed size?
- Erasure coding works on fixed chunks
- Uniform Merkle tree structure
- Predictable storage/bandwidth costs
```

<div class="lasair-connection">

### In Lasair: Segment Constants

```ocaml
(* lib/work_packages.ml *)

(** Segment size in bytes *)
let c_segment_size = 4104

(** Erasure coding piece size *)
let c_ec_piece_size = 684

(** Max segments per package *)
let c_max_package_exports = 3072
let c_max_package_imports = 3072

(** Segment footprint including Merkle proof *)
let c_segment_footprint = c_segment_size + 32 * 12
(* 12 = ceil(log2(3072)) for Merkle proof *)
```

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the erasure-coding piece size W_E = 684 and pieces-per-segment W_P = 6 are no longer protocol constants. Both follow from the size v of the assuring validator set: a piece is 2·D(v) octets with D(v) = max{d < v/3 + 2 : 4104 mod 2d = 0} (appendix H, eq. `ecoriginalshards`), so a segment always splits without padding. At 1023 validators that is still 684 octets and 6 pieces per segment; a 6-validator test network uses 6-octet pieces. The `c_ec_piece_size = 684` above is the full-size value from lasair's learning-era module; the live values come from `Spec.ec_original_shards` in `lib/spec.ml`.

</div>

## Work Report Structure

After execution, the work report contains:

<div class="lasair-connection">

### In Lasair: Work Report Type

```ocaml
(* lib/work_packages.ml *)

(** Work report structure *)
type work_report = {
  availability_spec: availability_spec;  (** Data commitment *)
  context: work_context;                 (** Execution context *)
  core_index: int;                       (** Which core executed *)
  authorizer: hash;                      (** Authorizer hash *)
  auth_trace: bytes;                     (** Authorization trace *)
  segment_root_lookup: (hash * hash) list;  (** Package → segment root *)
  digests: work_digest list;             (** Results per item *)
  auth_gas_used: int64;                  (** Authorization gas *)
}
```

</div>

## Availability Specifier

The availability specifier commits to all the data needed for auditing:

```
availability_spec = {
  package_hash:   Hash of the original work package
  bundle_length:  Size of the audit bundle
  erasure_root:   Root of erasure-coded data tree
  erasure_shards: Number of chunks = size of the assuring validator set  (GP 0.8.0)
  segment_root:   Root of exported segments tree
  segment_count:  Number of segments exported
}
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the availability specifier gained `erasure_shards`, the total number of erasure-coded chunks, encoded in 2 octets after the erasure root (`reporting_assurance.tex` 11.1.3, eq. `avspec`; `serialization.tex`). One chunk goes to each assurer, so a report is only valid on-chain if `erasure_shards` = |κ'| (11.4). The erasure root is now defined as the Merkle root over exactly these chunks.

</div>

<div class="lasair-connection">

### In Lasair: Availability Spec

```ocaml
(* lib/work_packages.ml *)

(** Availability specifier *)
type availability_spec = {
  package_hash: hash;     (** Work package identifier *)
  bundle_length: int;     (** Audit bundle size *)
  erasure_root: hash;     (** Erasure-coded data root *)
  segment_root: hash;     (** Exported segments root *)
  segment_count: int;     (** Number of exports *)
}
```

This learning-era record predates `erasure_shards`. The wire type lasair imports blocks with has it:

```ocaml
(* lib/serialization.ml *)
type package_spec = {
  hash: bytes;
  length: int;
  erasure_root: bytes;
  erasure_shards: int;  (** GP 0.8.0: number of erasure-coded shards, encode[2] (GP #514/#527) *)
  exports_root: bytes;
  exports_count: int;
}
```

</div>

## Work Digest and Results

Each work item produces a digest summarizing execution:

<div class="lasair-connection">

### In Lasair: Work Digest

```ocaml
(* lib/work_packages.ml *)

(** Execution result types *)
type work_result =
  | Success of bytes    (** Successful with output *)
  | Panic               (** PVM panic *)
  | OutOfGas            (** Ran out of gas *)
  | Oversize            (** Output too large *)
  | BadExports          (** Wrong export count *)
  | CodeNotAvailable    (** Service code missing *)

(** Work digest - summary of execution *)
type work_digest = {
  service_index: int;       (** Target service *)
  code_hash: hash;          (** Code hash used *)
  payload_hash: hash;       (** Hash of payload *)
  gas_limit: int64;         (** Accumulate gas limit *)
  result: work_result;      (** Execution outcome *)
  gas_used: int64;          (** Gas actually consumed *)
  import_count: int;        (** Segments imported *)
  export_count: int;        (** Segments exported *)
  extrinsic_count: int;     (** Extrinsics used *)
  extrinsic_size: int;      (** Total extrinsic bytes *)
}

(** Check if result succeeded *)
let is_success = function
  | Success _ -> true
  | _ -> false
```

</div>

## Size Constraints

JAM enforces strict size limits to prevent spam:

| Constraint | Limit | Purpose |
|------------|-------|---------|
| Work items per package | 16 max | Bound complexity |
| Exports per package | 3072 max | Segment tree depth |
| Imports per package | 3072 max | Segment tree depth |
| Extrinsics per package | 128 max | Bound external data |
| Dependencies (prerequisites + segment-root lookups) | 8 max | Bound dependency tracking |
| Bundle size | W_B = 13,791,360 bytes (~13.8 MB) | Fit in memory |

<div class="lasair-connection">

### In Lasair: Validation

```ocaml
(* lib/work_packages.ml *)

(** Maximum bundle size (~13.6 MB) *)
let c_max_bundle_size =
  c_max_package_imports * c_segment_footprint + 4096 + 64 + 64

(** Validate package constraints *)
let validate_package (pkg : work_package) : bool =
  let n_items = List.length pkg.work_items in
  let n_exports = total_exports pkg in
  let n_imports = total_imports pkg in
  let n_xts = total_extrinsics pkg in
  n_items >= 1 && n_items <= c_max_package_items &&
  n_exports <= c_max_package_exports &&
  n_imports <= c_max_package_imports &&
  n_xts <= c_max_package_xts

(** Calculate bundle size *)
let calculate_bundle_size (pkg : work_package) : int =
  let base = Bytes.length pkg.auth_token + Bytes.length pkg.auth_config in
  let item_size (item : work_item) =
    Bytes.length item.payload +
    List.length item.import_segments * c_segment_footprint +
    List.fold_left (fun acc ext -> acc + ext.length) 0 item.extrinsics
  in
  List.fold_left (fun acc item -> acc + item_size item) base pkg.work_items
```

</div>

## Segment Root Lookup

Work reports include a lookup table mapping package hashes to segment roots:

```ocaml
(** Maps package hashes to their segment roots *)
segment_root_lookup: (hash * hash) list

(** Why? Imports can reference by package hash OR segment root.
    This table lets us resolve package hash references. *)
```

<div class="lasair-connection">

### In Lasair: Lookup Resolution

```ocaml
(* lib/work_packages.ml *)

(** Resolve import reference to segment root *)
let resolve_import_ref (lookup : segment_root_lookup) (ref : import_ref)
    : hash option =
  match ref with
  | BySegmentRoot root -> Some root  (* Direct reference *)
  | ByPackageHash pkg_hash ->        (* Needs lookup *)
    List.find_map (fun (h, root) ->
      if Bytes.equal (Hash.to_bytes h) (Hash.to_bytes pkg_hash)
      then Some root
      else None
    ) lookup
```

</div>

## Summary Diagram

```
WORK PACKAGE                           WORK REPORT
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ Authorization               │       │ Availability Specifier      │
│ ├─ auth_token              │       │ ├─ package_hash            │
│ ├─ auth_code_hash          │       │ ├─ erasure_root            │
│ └─ auth_config             │       │ ├─ erasure_shards (0.8.0)  │
│                             │       │ └─ segment_root            │
├─────────────────────────────┤       ├─────────────────────────────┤
│ Context                     │  ──►  │ Context (same)              │
│ ├─ lookup_anchor           │       ├─────────────────────────────┤
│ └─ prerequisite            │       │ Core Index                  │
├─────────────────────────────┤       │ Authorizer Hash             │
│ Work Items[1..16]           │       │ Auth Trace                  │
│ ├─ service_index           │       ├─────────────────────────────┤
│ ├─ payload                 │       │ Work Digests[1..16]         │
│ ├─ gas_limits              │       │ ├─ service_index           │
│ ├─ imports[]               │       │ ├─ code_hash               │
│ └─ exports_count           │       │ ├─ result                  │
└─────────────────────────────┘       │ └─ gas_used               │
                                      └─────────────────────────────┘
```

## Key Takeaways

1. **Work packages** are input; **work reports** are output
2. **Work items** are individual computations (1-16 per package)
3. **Segments** are fixed-size (4104 bytes) data chunks
4. **Availability specifier** commits to all data for auditing
5. **Work digests** summarize execution results
6. **Size limits** prevent spam and bound complexity
7. **Segment root lookup** resolves package hash references

## Graypaper References

- Section 11.1: State (work reports inside ρ's availability assignments)
- Section 11.1.1: Work Report structure
- Section 11.1.2: Refinement Context
- Section 11.1.3: Availability (the availability specifier)
- Section 11.1.4: Work Digest
- Section 14.4.1: Availability Specifier (how `erasure_root` and `erasure_shards` are computed)

## What's Next

Return to the main reporting section or explore other subsections.

[Back to 11.0 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
