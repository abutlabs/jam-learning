---
title: "11.4 Work Report Guarantees"
duration: 8 min
video: https://www.youtube.com/watch?v=u5MMbOm4Mnk
---

# Graypaper Section 11.4: Work Report Guarantees

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains the **guarantees extrinsic** - how validators sign and submit work reports to the chain. Guarantors vouch for work report correctness with their stake.

## What This Section Covers

- The guarantees extrinsic structure
- Signature context ("jam_guarantee")
- Core assignment validation
- Authorization pool checking
- Gas limit requirements
- Reporter tracking for rewards

## The Guarantees Extrinsic

The guarantees extrinsic `E_G` contains up to C (number of cores) items:

```
E_G = sequence of {
  W: work_report,        -- The work report
  T: timeslot,           -- When guarantee was made
  A: credentials[]       -- 2-3 validator signatures
}

Ordered by: core index (unique, ascending)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** a guarantee is now a set of its own, 𝔾 = (report, timeslot, credential), with the credential a sequence of two or three (validator index, signature) pairs (`reporting_assurance.tex` 11.4, eq. `guarantee`), and E_G ∈ ⟦𝔾⟧ of length at most C (eq. `guaranteesextrinsic`). The reason: ρ now keeps the whole guarantee, credentials included, while the report waits for availability (see [11.0](lesson.html?lesson=011-graypaper-lectures/34-reporting)).

</div>

<div class="callout callout-info">

**ELI5: Signing a Contract**

Think of guaranteeing like co-signing a loan:
- **Work report (W)** = The loan application
- **Timeslot (T)** = Date of signing
- **Credentials (A)** = 2-3 co-signers who vouch for it
- If the loan defaults (work is invalid), co-signers get penalized

</div>

<div class="lasair-connection">

### In Lasair: Guarantee Structure

```ocaml
(* lib/guaranteeing.ml *)

(** Single guarantor attestation *)
type guarantor_attestation = {
  validator_index: int;        (** Index in validator set *)
  signature: bytes;            (** Ed25519 signature *)
}

(** Guarantee structure *)
type guarantee = {
  work_report: Work_packages.work_report;
  timeslot: int;               (** When guarantee was made *)
  credential: guarantor_attestation list;  (** 2-3 attestations *)
}

(** Minimum and maximum guarantor signatures *)
let c_min_guarantors = 2
let c_max_guarantors = 3

(** Validate credential size *)
let is_valid_credential (cred : credential) : bool =
  let len = List.length cred in
  len >= c_min_guarantors && len <= c_max_guarantors
```

</div>

## Signature Context

Guarantors sign with specific context to prevent signature reuse:

```
Message = "jam_guarantee" || H(encode(work_report))

Where:
  H = Blake2b hash function
  encode = JAM codec encoding

Signature = Ed25519_sign(validator_key, message)
```

<div class="lasair-connection">

### In Lasair: Guarantee Signature

```ocaml
(* lib/guaranteeing.ml *)

(** Signature context for guarantees *)
let guarantee_context = Bytes.of_string "jam_guarantee"

(** Compute the message to sign for a guarantee.
    Per Graypaper: sign(context || hash(encode(work_report))) *)
let compute_guarantee_message (report : Block_codec.work_report) : bytes =
  let encoded = Block_codec.encode_work_report report in
  let report_hash = Digestif.BLAKE2B.digest_bytes encoded in
  let hash_bytes = Digestif.BLAKE2B.to_raw_string report_hash |> Bytes.of_string in
  Bytes.concat Bytes.empty [guarantee_context; hash_bytes]

(** Verify a guarantee signature using Ed25519 *)
let verify_guarantee_signature (public_key : bytes) (signature : bytes)
    (report : Block_codec.work_report) : bool =
  let message = compute_guarantee_message report in
  Ed25519_ffi.verify public_key signature message
```

</div>

## Core Assignment Validation

Guarantors must be assigned to the core they're guaranteeing for:

```
For each validator V signing a guarantee for work report W:
  G[V] = core that V is assigned to
  W.core = core that work package targets

  REQUIRE: V < |k|           (k = the key sequence of that rotation)
  REQUIRE: G[V] == W.core
  REQUIRE: W.core < |κ'|/3   (GP 0.8.0: the core must be active)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** only the first |κ'|/3 cores are active, and a guarantee for an inactive core is invalid "even if a timeslot in the previous rotation is used and the core was active then" (`reporting_assurance.tex` 11.4, eq. `guarantorsig`). Credential indices are plain naturals checked against the length of the rotation's key sequence, since validator sequences are no longer a fixed 1023 long. A new check also ties the report to the assuring set: `erasure_shards` must equal |κ'|.

</div>

<div class="callout callout-info">

**ELI5: Staying in Your Lane**

Validators are assigned to specific cores (lanes):
- You can only sign work packages for YOUR lane
- This is because authorization is per-core (Agile Core Time)
- If you sign for someone else's lane, the block is invalid

</div>

<div class="lasair-connection">

### In Lasair: Core Assignment Check

```ocaml
(* lib/guaranteeing.ml *)

(** Core assignment for all validators *)
type core_assignments = int array  (** validator_index -> core_index *)

(** Check if validator is assigned to core *)
let is_assigned (assignments : core_assignments) (validator : int) (core : int) : bool =
  validator < Array.length assignments && assignments.(validator) = core

(** Get core index from guarantee *)
let guarantee_core (g : guarantee) : int =
  g.work_report.core_index

(** Validation checks assignment *)
let validate_guarantee (assignments : guarantor_assignments)
    (current_time : int) (g : guarantee) : validation_result =
  (* ... *)
  let core = guarantee_core g in
  let check_attestation att =
    if not (is_assigned assignments.core_assignments att.validator_index core) then
      Some (ValidatorNotAssigned att.validator_index)
    else None
  in
  (* ... *)
```

The GP 0.8.0 checks on lasair's block-import path, from `rule_report`:

```ocaml
(* conformance/stf_guarantees.ml *)
(* GP 0.8.0: only the first |kappa'|/3 cores are ACTIVE; a report on an
   inactive core is invalid even if it cites a previous-rotation slot. *)
if r.tr_core_index < 0 || r.tr_core_index >= (Stf_config.num_cores ())
   || r.tr_core_index >= gc.gc_v' / 3 then
  reject "bad_core_index";
(* ... *)
(* GP 0.8.0 (#514/#527): one erasure-coded chunk per assurer, so the
   report's chunk count must equal |kappa'| *)
if r.tr_package_spec.ps_erasure_shards <> gc.gc_v' then
  reject "bad_erasure_shards"
```

</div>

## Rotation and Timeslots

Guarantors can use signatures from current OR previous rotation:

```
T = timeslot of guarantee signing

If T is in current rotation period:
  Use G (current assignments)
Else if T is in previous rotation period:
  Use G* (previous assignments)
Else:
  INVALID
```

This prevents race conditions at rotation boundaries.

<div class="lasair-connection">

### In Lasair: Timeslot Validation

```ocaml
(* lib/guaranteeing.ml *)

(** Rotation period in timeslots *)
let c_rotation_period = Definitions.Constants.c_rotation_period

(** Check if guarantee timeslot is valid *)
let is_valid_timeslot (current_time : int) (guarantee_time : int) : bool =
  let min_time = c_rotation_period * ((current_time / c_rotation_period) - 1) in
  guarantee_time >= min_time && guarantee_time <= current_time
```

</div>

## Authorization Pool Check

The work report must be authorized:

```
W.auth_hash ∈ α[W.core]

Where:
  W.auth_hash = work report's authorization hash
  α = authorization pools (prior state)
  W.core = target core index
```

<div class="callout callout-warning">

**Guarantor Dilemma**

Guarantors must predict the future:
- When they sign, the auth hash might be in the pool
- By the time it reaches a block, the hash might be gone!
- If pool has only 1 entry and another report uses it first → their guarantee becomes invalid

This is why Agile Core Time buyers should keep multiple hashes in the pool.

</div>

<div class="lasair-connection">

### In Lasair: Authorization Check

```ocaml
(* lib/reporting.ml *)

(** Check authorizer is in pool *)
let has_valid_authorizer (g : Guaranteeing.guarantee)
    (pools : Authorization.auth_pool array) : bool =
  let core = Guaranteeing.guarantee_core g in
  if core >= 0 && core < Array.length pools then
    Authorization.is_authorized pools.(core)
      g.Guaranteeing.work_report.Work_packages.authorizer
  else false
```

</div>

## Core Availability

A guarantee can only be included if the core is free:

```
REQUIRE: ρ‡[W.core] = ∅    (core has no availability assignment)

Where:
  ρ‡ = availability assignments after assurances. Building ρ‡ already
       cleared entries that became available, entries that timed out
       (block slot ≥ t + U, U = 5 timeslots) and, since GP 0.8.0, every
       entry when the validator-set size changed (|κ| ≠ |κ'|).
```

<div class="lasair-connection">

### In Lasair: Core Availability

```ocaml
(* lib/reporting.ml *)

(** Check guarantee doesn't target core with pending report *)
let is_core_free (state : reports_state) (g : Guaranteeing.guarantee) : bool =
  let core = Guaranteeing.guarantee_core g in
  not (has_pending state core)

(** Check if report has timed out *)
let is_timed_out (current_time : int) (pr : pending_report) : bool =
  current_time >= pr.timestamp + c_assurance_timeout
```

</div>

## Gas Limit Validation

Work reports must not exceed core gas budget:

```
Σ (accumulate gas limit g of each work digest) ≤ G_A
and, for each digest, g ≥ min_acc_gas of its service

Where:
  G_A = 10,000,000, the accumulation gas per work report (~10ms)
  min_acc_gas = service's minimum gas requirement

If violated: Block producer must reject the guarantee
```

<div class="callout callout-info">

**ELI5: Don't Overpromise**

Imagine a factory with 10-minute shifts:
- Each service says "I need at least X minutes"
- If total minimum requirements > 10 minutes → can't fit!
- Block producer must reject such work packages

</div>

<div class="lasair-connection">

### In Lasair: Gas Validation

```ocaml
(* lib/reporting.ml *)

(** Maximum accumulation gas per report *)
let c_report_acc_gas = Int64.of_int Definitions.Constants.c_report_acc_gas  (* G_A = 10_000_000 *)

(** Check total accumulation gas is within limit *)
let is_valid_report_gas (report : Work_packages.work_report) : bool =
  let total = List.fold_left (fun acc d ->
    Int64.add acc d.Work_packages.gas_limit
  ) 0L report.digests in
  total <= c_report_acc_gas
```

</div>

## Reporter Tracking

The system tracks who guaranteed for reward distribution:

```
R = { Ed25519 key K | ∃ (W,T,A) ∈ E_G, ∃ (V,S) ∈ A :
       K = keys[V] }

R = Set of all Ed25519 keys that signed guarantees
```

This allows subsystems to identify and reward active guarantors.

<div class="lasair-connection">

### In Lasair: Reporter Extraction

```ocaml
(* lib/guaranteeing.ml *)

(** Extract reporter keys from guarantees *)
let extract_reporters (keys : guarantor_keys) (guarantees : guarantees_extrinsic)
    : bytes list =
  let reporters = ref [] in
  List.iter (fun g ->
    List.iter (fun att ->
      if att.validator_index < Array.length keys then
        reporters := keys.(att.validator_index) :: !reporters
    ) g.credential
  ) guarantees;
  List.rev !reporters
```

</div>

## Visual: Guarantee Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     GUARANTEE VALIDATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Work Package                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ GUARANTOR CREATES WORK REPORT                               ││
│  │                                                             ││
│  │   1. Execute work package                                   ││
│  │   2. Create work report with results                        ││
│  │   3. Sign: Ed25519("jam_guarantee" || H(encode(report)))    ││
│  └─────────────────────────────────────────────────────────────┘│
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ BLOCK AUTHOR VALIDATES                                      ││
│  │                                                             ││
│  │   ✓ 2-3 signatures?                                         ││
│  │   ✓ Signatures ordered by validator index?                  ││
│  │   ✓ Each signer assigned to this core?                      ││
│  │   ✓ Core active (index < |κ'|/3)?               (GP 0.8.0)  ││
│  │   ✓ erasure_shards = |κ'|?                      (GP 0.8.0)  ││
│  │   ✓ Timeslot valid (current or previous rotation)?          ││
│  │   ✓ Authorization hash in pool?                             ││
│  │   ✓ Core free in ρ‡ (no availability assignment)?           ││
│  │   ✓ Total gas within limit?                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ INCLUDE IN BLOCK                                            ││
│  │                                                             ││
│  │   • Store the guarantee + τ' in ρ for this core             ││
│  │   • Remove auth hash from α (authorization pool)            ││
│  │   • Track reporters in R for rewards                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Ordering Requirements

All elements must be sorted:

```
Guarantees:  Ordered by core index (no duplicates)
Credentials: Ordered by validator index within each guarantee
```

<div class="lasair-connection">

### In Lasair: Ordering Validation

```ocaml
(* lib/guaranteeing.ml *)

(** Check credential is ordered by validator index *)
let is_ordered_credential (cred : credential) : bool =
  let rec check_ordered = function
    | [] | [_] -> true
    | a :: b :: rest ->
      a.validator_index < b.validator_index && check_ordered (b :: rest)
  in
  check_ordered cred

(** Validate guarantees are ordered by core and unique *)
let is_ordered_guarantees (guarantees : guarantees_extrinsic) : bool =
  let rec check = function
    | [] | [_] -> true
    | a :: b :: rest ->
      guarantee_core a < guarantee_core b && check (b :: rest)
  in
  check guarantees
```

</div>

## Key Takeaways

1. **2-3 signatures** required per guarantee (ordered by validator index)
2. **Core assignment** - Validators can only sign for their assigned core, and (GP 0.8.0) that core must be active
3. **Authorization check** - Work report's auth hash must be in pool
4. **Timeslot validation** - Current or previous rotation period
5. **Core availability** - No availability assignment left on the core in ρ‡
6. **Gas limits** - Digest gas limits must sum to at most G_A, each at least its service's minimum
7. **Reporter tracking** - Keys recorded for reward distribution
8. **Chunk count** - (GP 0.8.0) `erasure_shards` must equal |κ'|

## Graypaper References

- Section 11.4: Work Report Guarantees
- eq. `guarantee` and eq. `guaranteesextrinsic`: the guarantee set and the extrinsic
- eq. `guarantorsig`: signatures, assignment, active-core and timeslot rules
- eq. `reportcoresareunused`: free core and authorizer in pool

## Deep Dives

Want more detail on specific constraints?

- [11.4.1 Contextual Validity](lesson.html?lesson=011-graypaper-lectures/34f-contextual-validity) - Anchor validation, duplicate detection, prerequisites, and code hash checks

## What's Next

Return to the main reporting section or explore contextual validity of reports.

[Back to 11.0 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
