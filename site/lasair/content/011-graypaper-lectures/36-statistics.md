---
title: "13.0 Validator Activity Statistics"
duration: 12 min
video: https://www.youtube.com/watch?v=sJ1Fs9g3c5k
---

# Graypaper Section 13: Validator Activity Statistics

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This final on-chain section covers how JAM tracks validator performance. These statistics determine **who gets paid** and **who gets slashed**.

## What This Section Covers

- The six validator statistics
- Epoch-based accumulation
- Statistics rotation at epoch boundaries
- Why assurances matter most

## Why Track Statistics?

JAM needs to know:
1. **Who did their job?** → Pay them
2. **Who slacked off?** → Reduce rewards
3. **Who misbehaved?** → Slash them

<div class="callout callout-info">

**ELI5: The Timesheet**

Think of validator statistics like employee timesheets:
- **Blocks produced** = Days worked
- **Tickets introduced** = Lottery tickets purchased
- **Preimages provided** = Data supplied to coworkers
- **Reports guaranteed** = Projects vouched for
- **Assurances made** = Quality checks completed

The last one (assurances) is the **most important** - if you don't do it, you get penalized heavily.

</div>

## The State: π (Pi)

Statistics are stored in state item **π**. The lecture's π has two validator records; the current Graypaper writes them π_V and π_L and adds per-block core and service statistics, making π a tuple of four:

```
π = (
  π_V: Current epoch accumulator      (the lecture's π₀), one record per validator in κ
  π_L: Previous epoch finalized stats (the lecture's π₁), one record per validator in λ
  π_C: Per-core statistics for this block
  π_S: Per-service statistics for this block
)
```

Why keep two validator records? Services need to read **finalized** statistics (previous epoch), not half-baked ones (current epoch).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the validator records are no longer fixed at 1023 entries: |π_V| = |κ| and |π_L| = |λ| (`statistics.tex` 13.1, eq. `activityspec`), and both are serialized with a length prefix in state key 13 (`merklization.tex`, C(13)). A new epoch starts a fresh accumulator with one zero record per validator of κ'.

</div>

## The Six Statistics

Each validator has six counters:

| Stat | Symbol | Description |
|------|--------|-------------|
| **Blocks** | b | Number of blocks authored |
| **Tickets** | t | Safrole tickets introduced |
| **Preimage Count** | p | Number of preimages provided |
| **Preimage Size** | d | Total bytes of preimage data |
| **Guarantees** | g | Work reports guaranteed |
| **Assurances** | a | Availability assurances made |

<div class="lasair-connection">

### In Lasair: Validator Stats Type

```ocaml
(* lib/statistics.ml *)

(** Validator activity record *)
type validator_stats = {
  blocks: int;          (** Number of blocks produced *)
  tickets: int;         (** Number of tickets introduced *)
  preimage_count: int;  (** Number of preimages introduced *)
  preimage_size: int;   (** Total octets of preimages *)
  guarantees: int;      (** Number of reports guaranteed *)
  assurances: int;      (** Number of availability assurances *)
}

(** Empty validator stats *)
let empty_validator_stats : validator_stats = {
  blocks = 0;
  tickets = 0;
  preimage_count = 0;
  preimage_size = 0;
  guarantees = 0;
  assurances = 0;
}
```

</div>

## Block Author Statistics

When a validator authors a block, they get credit for:

```ocaml
(* If validator V is the block author: *)
blocks += 1
tickets += count(tickets_in_block)
preimage_count += count(preimages_in_block)
preimage_size += sum(preimage_sizes)
```

<div class="lasair-connection">

### In Lasair: Recording Block Stats

```ocaml
(* lib/statistics.ml *)

(** Increment block count for author *)
let record_block (state : activity_state) (author : int) : activity_state =
  if author < 0 || author >= Array.length state.accumulator then state
  else begin
    let stats = state.accumulator.(author) in
    let acc = Array.copy state.accumulator in
    acc.(author) <- { stats with blocks = stats.blocks + 1 };
    { state with accumulator = acc }
  end

(** Record tickets introduced by author *)
let record_tickets (state : activity_state) (author : int) (count : int)
    : activity_state =
  (* ... similar pattern ... *)

(** Record preimages introduced by author *)
let record_preimages (state : activity_state) (author : int)
    (count : int) (size : int) : activity_state =
  (* ... similar pattern ... *)
```

</div>

## Guarantor Statistics

When a validator guarantees a work report, they get a point:

```
If validator_key ∈ R (reporters set):
  guarantees += 1
```

The **R** set comes from the guarantees extrinsic - all validator keys that signed guarantees.

<div class="lasair-connection">

### In Lasair: Recording Guarantees

```ocaml
(* lib/statistics.ml *)

(** Record guarantee by validator *)
let record_guarantee (state : activity_state) (validator : int)
    : activity_state =
  if validator < 0 || validator >= Array.length state.accumulator then state
  else begin
    let stats = state.accumulator.(validator) in
    let acc = Array.copy state.accumulator in
    acc.(validator) <- { stats with guarantees = stats.guarantees + 1 };
    { state with accumulator = acc }
  end
```

</div>

## Assurance Statistics (Most Important!)

When a validator's assurance makes it on-chain:

```
If ∃ assurance where assurance.validator_index = V:
  assurances += 1     (credited to the accumulator before any epoch rollover)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** assurances are credited first, to the prior accumulator π_V (giving π_V†), and only then does the epoch rollover happen; blocks, tickets, preimages and guarantees are credited afterwards, to the posterior accumulator indexed by κ' (`statistics.tex` 13.1). An assurance in the first block of an epoch therefore lands in the previous epoch's record π_L', the epoch whose validator set κ signed it. lasair runs `Stf_statistics.update_assurance_stats` before `update_statistics` in `import_block` (`conformance/trace_runner.ml`) for this reason.

</div>

<div class="callout callout-warning">

**Critical: Assurances = Payment**

Assurances are the **most important** statistic. If a validator:
- Does blocks, tickets, preimages, guarantees ✓
- But **doesn't do assurances** ✗

They will get **very little payment**. This ensures validators actually participate in data availability.

</div>

<div class="lasair-connection">

### In Lasair: Recording Assurances

```ocaml
(* lib/statistics.ml *)

(** Record assurance by validator *)
let record_assurance (state : activity_state) (validator : int)
    : activity_state =
  if validator < 0 || validator >= Array.length state.accumulator then state
  else begin
    let stats = state.accumulator.(validator) in
    let acc = Array.copy state.accumulator in
    acc.(validator) <- { stats with assurances = stats.assurances + 1 };
    { state with accumulator = acc }
  end
```

</div>

## Epoch Transitions

At epoch boundaries, statistics rotate:

```
π_V† = π_V + this block's assurances

Same epoch (τ/E = τ'/E):
  π_V' = accumulate(π_V†)  -- Keep accumulating
  π_L' = π_L               -- Previous stays same

New epoch (τ/E ≠ τ'/E):
  π_V' = accumulate(zeros) -- Fresh accumulator, |κ'| records
  π_L' = π_V†              -- Current becomes previous
```

<div class="lasair-connection">

### In Lasair: Epoch Rotation

lasair's learning-era `lib/statistics.ml` rotates into a fixed `c_val_count` (1023) array, the 0.7 rule. The block-import path sizes the fresh accumulator from κ':

```ocaml
(* conformance/stf_statistics.ml *)
let update_statistics ?(new_epoch = false) (db : Lasair.State_db.t) (slot : int) (author_index : int) : Lasair.State_db.t =
  ignore slot;
  with_stats db (fun s ->
    let curr, last =
      if new_epoch then begin
        let kappa'_n =
          match Lasair.State_db.get db (make_state_key Stf_config.key_safrole) with
          | Some sf when Stf_config.gamma_k_count sf > 0 -> Stf_config.gamma_k_count sf
          | _ -> validators_in s.curr in
        (Bytes.make (kappa'_n * stats_per_validator) '\x00', Bytes.copy s.curr)
      end else (Bytes.copy s.curr, s.last) in
    bump curr author_index f_blocks 1;
    { curr; last; tail = Stf_config.stats_baseline_tail () })
```

On an epoch change κ' is the pending set γ_P of the not-yet-rotated Safrole state (state key 4), hence `gamma_k_count`.

</div>

## Additional Statistics (Per-Block)

JAM also tracks per-core and per-service statistics each block:

### Core Statistics
```ocaml
type core_stats = {
  da_load: int;       (* Data availability load *)
  popularity: int;    (* Attestation count *)
  import_count: int;  (* Segments imported *)
  export_count: int;  (* Segments exported *)
  gas_used: int64;    (* Gas consumed *)
  (* ... *)
}
```

### Service Statistics
```ocaml
type service_stats = {
  provision: { count; size };                 (* Preimages *)
  refinement: { count; gas };                 (* Work items *)
  accumulation: { count; transfers; gas };    (* State updates; GP 0.8.0 adds transfers *)
  (* ... *)
}
```

These reset each block and help track system health.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** a service's accumulation statistic is (N, T, G): work items accumulated, deferred transfers processed, and gas used (`statistics.tex` 13.2; `accumulation.tex` 12.3, eq. `accumulationstatisticsdef`, GP #502). A service gets an entry whenever any of the three is non-zero, so a service that only received transfers has an entry even when it used no gas. lasair's learning-era `lib/statistics.ml` still has the two-field record; the import path in `conformance/stf_guarantees.ml` counts transfers per destination.

</div>

## Summary Diagram

```
                     BLOCK PROCESSING
                           |
                        Assurer?
                           |
                           v
                   assurances += 1  (into π_V, prior κ)
                           |
                     New epoch?
                           |
              +------------+------------+
              |                         |
             No                        Yes
              |                         |
              v                         v
        Keep π_V, π_L           π_L' = π_V
                                π_V  = zeros (|κ'| records)
              |                         |
              +------------+------------+
                           |
              +------------+------------+
              |                         |
           Author?                 Guarantor?
              |                         |
              v                         v
         blocks += 1             guarantees += 1
         tickets += n
         preimages += n
```

## Reading Statistics (For Services)

Services can read **π_L** (π₁ in the lecture; previous epoch) to make decisions:
- Reward validators proportionally
- Identify underperformers
- Calculate slashing amounts

## Key Takeaways

1. **Six statistics** per validator (blocks, tickets, preimages×2, guarantees, assurances)
2. **Assurances matter most** - low assurances = low payment
3. **Two epochs stored** - current (accumulating) and previous (finalized), sized to their validator sets (GP 0.8.0)
4. **Rotation at epoch boundary** - current becomes previous, fresh accumulator starts; this block's assurances go to the old record first (GP 0.8.0)
5. **Services read π_L** - finalized stats for reward calculations
6. **Service stats** count accumulated items, processed transfers and gas (GP 0.8.0)
7. **This is the end** of the on-chain state transition logic

## Graypaper References

- Section 13: Statistics (13.1 Validator Activity, 13.2 Cores and Services)
- Section 12.3: Final State Integration (accumulation statistics)
- Appendix D: State Merklization (D.1 serialization of π at state key 13)

## What's Next

The remaining Graypaper sections cover **off-chain** components and reference material:
- Sections 14-19: Work packages and reports, guaranteeing, availability assurance, auditing and judging, Beefy, Grandpa and the best chain
- Appendix A-B: the PVM and its invocations
- Appendix C-E: serialization and Merklization
- Appendices F-I: shuffling, Bandersnatch, erasure coding, and the index of notation (constants)

[Return to Course Overview &rarr;](index.html)
