---
title: "11.0 Reporting and Assurance"
duration: 22 min
video: https://www.youtube.com/watch?v=N49WRilkbNw
---

# Graypaper Section 11: Reporting and Assurance

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section covers the on-chain footprint of JAM's two main off-chain scaling mechanisms: **computation** (work execution) and **data** (availability). This is how JAM scales.

## What This Section Covers

- Work packages and work items
- The guarantee → assurance → accumulation pipeline
- Erasure coding for data availability
- Core assignments and rotations
- Signature verification

## The Big Picture

JAM scales by doing computation **off-chain** and only recording **results** on-chain. But how do we trust those results?

```
Work Package (off-chain)
        |
        v
   Guarantors execute
        |
        v
Work Report + Signatures (guarantee)
        |
        v
   Erasure code & distribute
        |
        v
Validators confirm data (assurances)
        |
        v
   2/3+ assurances
        |
        v
Work Report becomes "available"
        |
        v
   Accumulate into service state
```

<div class="callout callout-info">

**ELI5: The Assembly Line**

Think of JAM like a factory:
- **Work packages** = Raw materials coming in
- **Guarantors** = Workers who process materials into products
- **Work reports** = Quality certificates for each product
- **Erasure coding** = Breaking products into puzzle pieces and sending to warehouses
- **Assurances** = Warehouse receipts saying "we have the piece"
- **Availability** = Enough warehouses confirm → product is certified
- **Accumulation** = Product goes to the customer (service state)

</div>

## Work Packages vs Work Reports

| Concept | What It Is |
|---------|------------|
| **Work Package** | Input data + instructions for computation |
| **Work Item** | A single unit of work within a package (up to I = 16 per package) |
| **Work Report** | The output/results of executing a work package |
| **Work Digest** | Output from a single work item (older Graypaper versions called it a work result) |

<div class="lasair-connection">

### In Lasair: Work Report Structure

```ocaml
(* lib/work_packages.ml *)

(** A single work result from executing one work item *)
type work_result = {
  service_id: int;           (** Which service this is for *)
  code_hash: hash;           (** Hash of the service code *)
  payload_hash: hash;        (** Hash of the payload data *)
  accumulate_gas: int64;     (** Gas limit for accumulation *)
  result: result_output;     (** Success, error, OOG, panic, etc. *)
}

(** Work report - the certified output of executing a work package *)
type work_report = {
  package_spec: availability_spec;   (** Identifies the package *)
  context: refinement_context;       (** Anchors and prerequisites *)
  core_index: int;                   (** Which core processed this *)
  authorizer: hash;                  (** Authorization code hash *)
  digests: work_result list;         (** Results from each work item *)
}
```

</div>

## The Guarantee Stage

**Guarantors** are validators assigned to cores. They:
1. Receive work packages
2. Execute them on the PVM
3. Create work reports
4. Sign with Ed25519 (2-3 signatures required)

```
Signature = Ed25519.sign("jam_guarantee" || Blake2b(encode(work_report)))
```

<div class="lasair-connection">

### In Lasair: Guarantee Validation

```ocaml
(* lib/guaranteeing.ml *)

(** Minimum/maximum guarantor signatures *)
let c_min_guarantors = 2
let c_max_guarantors = 3

(** Signature context *)
let guarantee_context = Bytes.of_string "jam_guarantee"

(** Compute message to sign *)
let compute_guarantee_message (report : Block_codec.work_report) : bytes =
  let encoded = Block_codec.encode_work_report report in
  let report_hash = Digestif.BLAKE2B.digest_bytes encoded in
  let hash_bytes = Digestif.BLAKE2B.to_raw_string report_hash |> Bytes.of_string in
  Bytes.concat Bytes.empty [guarantee_context; hash_bytes]

(** Verify guarantee signature *)
let verify_guarantee_signature (public_key : bytes) (signature : bytes)
    (report : Block_codec.work_report) : bool =
  let message = compute_guarantee_message report in
  Ed25519_ffi.verify public_key signature message
```

</div>

## Erasure Coding

After guaranteeing, the work package is **erasure coded** - split into fragments distributed to all validators.

```
Work-package bundle (at most W_B = 13,791,360 bytes)
        |
        v
   Erasure encode
        |
        v
1023 chunks (one per validator, full configuration)
        |
        v
Any 342 of them rebuild the bundle;
each chunk is ~1/342 of the bundle (<= ~40 KB)
```

Why? So auditors can reconstruct the work package if they need to verify it.

<div class="callout callout-info">

**ELI5: Erasure Coding**

Imagine writing a book, then:
1. Splitting it into 1023 puzzle pieces
2. Sending one piece to each of 1023 warehouses
3. If anyone needs the book, they can reconstruct it from any 342 of the pieces (about a third)

This is way cheaper than sending the whole book to every warehouse!

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the chunk count is no longer a constant. A report is coded into one chunk per validator of the assuring set, recorded in the new availability-spec field `erasure_shards` (= |κ'|), and any D(v) chunks recover the data, where D(v) = max{d < v/3 + 2 : 4104 mod 2d = 0} (appendix H, eq. `ecoriginalshards`). At the full size of 1023 validators D = 342; a 6-validator test network uses 3.

</div>

## The Assurance Stage

Once validators receive their erasure-coded chunks, they **assure** the chain that they have the data:

```ocaml
type assurance = {
  anchor: hash;                (* Parent block hash *)
  availabilities: bool array;  (* Which cores we have data for *)
  assurer: int;                (* Validator index *)
  signature: bytes;            (* Ed25519 signature *)
}
```

<div class="lasair-connection">

### In Lasair: Assurance Processing

```ocaml
(* lib/reporting.ml *)

(** Threshold for availability (2/3 supermajority) *)
let availability_threshold : int =
  (2 * Definitions.Constants.c_val_count) / 3

(** Check if core has enough assurances *)
let is_available (counts : int array) (core : int) : bool =
  core >= 0 && core < Array.length counts &&
  counts.(core) > availability_threshold

(** Count assurances for each core *)
let count_assurances (assurances : assurances_extrinsic) : int array =
  let counts = Array.make Definitions.Constants.c_core_count 0 in
  List.iter (fun a ->
    Array.iteri (fun core bit ->
      if bit && core < Array.length counts then
        counts.(core) <- counts.(core) + 1
    ) a.availabilities
  ) assurances;
  counts
```

`lib/reporting.ml` is one of lasair's learning-era modules and still divides the fixed 0.7 constant `c_val_count`. The block-import path (`conformance/stf_guarantees.ml`) uses the GP 0.8.0 rule instead: a core becomes available when its votes exceed two-thirds of the *live* prior set, `Stf_config.supermajority_of |κ|`.

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the threshold is "more than ⅔·|κ|" of the active validator sequence, not of a constant V = 1023 (`reporting_assurance.tex`, eq. `availableworkreports`). Validator sequences can now be any multiple of 3 from 6 to 1023; at full size the threshold is still 683 votes.

</div>

## Block Processing Order

The order matters! In each block:

1. **First**: Process assurances (free up cores)
2. **Then**: Process guarantees (fill freed cores)

Why? Because guarantees can't target cores with pending reports.

<div class="lasair-connection">

### In Lasair: Block Processing

```ocaml
(* lib/reporting.ml *)

(** Process block's assurances and guarantees *)
let process_block (state : reports_state)
    (assurances : assurances_extrinsic)
    (guarantees : Guaranteeing.guarantees_extrinsic)
    (current_time : int)
    : reports_state * Work_packages.work_report list =
  (* First, get available reports *)
  let available = get_available_reports state assurances in
  (* Clear completed/timed-out reports *)
  let cleared = clear_completed state assurances current_time in
  (* Add new guarantees *)
  let final = add_guarantees cleared guarantees current_time in
  (final, available)
```

</div>

## Core Assignment

Validators are assigned to cores via a shuffle that rotates within each epoch:

```
Epoch start: Fisher-Yates shuffle using entropy
             |
             v
        Base assignments
             |
             v
Every R timeslots: Rotate by 1
```

<div class="lasair-connection">

### In Lasair: Rotation

```ocaml
(* lib/guaranteeing.ml *)

(** Rotation period in timeslots *)
let c_rotation_period = Definitions.Constants.c_rotation_period

(** Calculate rotation offset for a timeslot *)
let rotation_offset (timeslot : int) : int =
  (timeslot mod Definitions.Constants.c_epoch_len) / c_rotation_period

(** Apply rotation to assignments *)
let rotate_assignments (assignments : core_assignments) (offset : int) : core_assignments =
  let core_count = Definitions.Constants.c_core_count in
  Array.map (fun c -> (c + offset) mod core_count) assignments
```

This learning-era helper rotates over all 341 cores. Under GP 0.8.0 only the first |κ'|/3 cores are active and the rotation wraps at that number; lasair's import path does this in `Stf_guarantees.guarantor_assignment` (`conformance/stf_guarantees.ml`). See [11.3 Guarantor Assignments](lesson.html?lesson=011-graypaper-lectures/34c-guarantor-assignments).

</div>

## Timeout Handling

If a work report doesn't get enough assurances within 5 timeslots, it's discarded:

```ocaml
(** Assurance timeout period *)
let c_assurance_timeout = 5

(** Check if report has timed out *)
let is_timed_out (current_time : int) (pr : pending_report) : bool =
  current_time >= pr.timestamp + c_assurance_timeout
```

## Availability Assignments (rho)

The state ρ tracks, per core, the report waiting to become available. GP 0.8.0 calls each entry an **availability assignment** and stores the whole guarantee, not just the report:

```
rho = [
  Core 0: Some { guarantee = (work_report, slot, credentials), timestamp }
  Core 1: None  (free)
  Core 2: Some { guarantee = (work_report, slot, credentials), timestamp }
  ...
]
```

Key transitions:
- `rho` → `rho†` (after judgments remove bad or wonky reports)
- `rho†` → `rho‡` (after assurances: available and timed-out entries cleared)
- `rho‡` → `rho'` (after guarantees add new entries, stamped with τ')

<div class="callout callout-warning">

**Changed in GP 0.8.0:** ρ holds `(guarantee, timestamp)` (`reporting_assurance.tex` 11.1, eq. `reportingstate`; the guarantee set 𝔾 is eq. `guarantee`), which changes the state-key 10 value layout. When the size of the active validator sequence changes (|κ| ≠ |κ'|), **every** assignment is cleared in ρ‡, as if it had timed out early (eq. `availassignmentspostassurancesdef`). After guarantees, cores at index ≥ |κ'|/3 always hold ∅.

</div>

## Summary Diagram

```
                    WORK PACKAGE
                         |
           +-------------+-------------+
           |                           |
      Guarantor 1                 Guarantor 2
           |                           |
      Execute PVM                 Execute PVM
           |                           |
           +-------------+-------------+
                         |
                  WORK REPORT
                         |
              Sign with Ed25519 (2-3 sigs)
                         |
                    GUARANTEE
                         |
        +----------------+----------------+
        |                |                |
   Erasure code     Submit to       Track in
   into chunks      chain           rho[core]
        |                                 |
   Distribute                        Wait for
   to validators                     assurances
        |                                 |
   Each validator                    Count bits
   stores chunk                          |
        |                                 |
   Send assurance bit               2/3+ received?
                                         |
                              +----------+-----------+
                              |                      |
                          Yes: AVAILABLE         No: Timeout?
                              |                      |
                         Accumulate              Discard
```

## Key Takeaways

1. **Work packages** contain work items; **work reports** contain results
2. **Guarantors** execute and sign (2-3 signatures required)
3. **Erasure coding** distributes data to all validators efficiently
4. **Assurances** confirm data availability (need 2/3+)
5. **Available** reports proceed to accumulation
6. **Timeout** at 5 timeslots discards incomplete reports (and, since GP 0.8.0, a change in validator-set size clears them all)
7. Block processes **assurances before guarantees** to free cores

## Graypaper References

- Section 11: Reporting and Assurance (overview)
- Section 11.1: State (ρ availability assignments, work report structure)
- Section 11.2: Package Availability (assurances extrinsic)
- Section 11.3: Guarantor Assignments
- Section 11.4: Work Report Guarantees

## Deep Dives

Want more detail? Explore these subsections:

- [11.1 Work Reports Deep Dive](lesson.html?lesson=011-graypaper-lectures/34b-work-reports) - Work packages, items, digests, and segments
- [11.2 Availability Assurances](lesson.html?lesson=011-graypaper-lectures/34d-availability-assurances) - Erasure coding and availability checks
- [11.3 Guarantor Assignments](lesson.html?lesson=011-graypaper-lectures/34c-guarantor-assignments) - Fisher-Yates shuffle and rotation
- [11.4 Work Report Guarantees](lesson.html?lesson=011-graypaper-lectures/34e-work-report-guarantees) - Signatures, authorization, and validation

## What's Next

Continue with **Section 12: Accumulation** to see how available work reports are folded into service state.

[Next: 12 Accumulation &rarr;](lesson.html?lesson=011-graypaper-lectures/35-accumulation)
