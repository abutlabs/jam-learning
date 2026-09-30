---
title: "10.0 Judgments"
duration: 18 min
video: https://www.youtube.com/watch?v=Ed--83UTLPk
---

# Graypaper Section 10: Judgments

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM handles disputes when validators disagree about work report validity. The judgment system is the security backstop that ensures invalid work never corrupts the chain state.

## What This Section Covers

- Verdicts vs individual judgments
- Good, bad, and wonky outcomes
- Culprits and faults
- The disputes extrinsic
- Offender tracking for slashing

## Why Judgments Matter

In Polkadot, these are called "disputes." In JAM, they're "judgments." The core problem:

```
What happens when validators disagree about a work report?

Guarantors say: "This work report is valid!"
Auditors say:   "Wait, we checked and it's INVALID!"

Someone is wrong. Someone gets slashed.
```

<div class="callout callout-info">

**ELI5: The Court System**

Think of JAM validators as a jury system:
- **Guarantors** = Defense attorneys (vouched for the work)
- **Auditors** = Prosecutors (found problems)
- **All Validators** = The jury (vote on validity)
- **Verdict** = The final decision (2/3 + 1 agreement)

If the jury finds the work invalid, the defense attorneys (guarantors) get punished. If the jury finds it valid, the prosecutors who raised false alarms get punished.

</div>

## The Three Verdicts

JAM has three possible outcomes when validators judge a work report:

| Verdict | Vote Pattern | Meaning |
|---------|--------------|---------|
| **Good** | 2/3+1 vote valid | Report is definitely valid |
| **Bad** | 0 vote valid | Report is definitely invalid |
| **Wonky** | ~1/3 vote valid | Can't determine - remove but don't slash |

Every verdict carries exactly ⌊2/3·|k|⌋ + 1 judgments, where k is the validator key sequence of the epoch the verdict names (κ for the current epoch, λ for the previous one). The positive tally must be exactly ⌊2/3·|k|⌋ + 1 (good), 0 (bad) or ⌊1/3·|k|⌋ (wonky); anything else makes the block invalid. With 1023 validators that is 683 judgments per verdict and tallies of 683, 0 or 341.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the thresholds are relative to the size of the judging validator sequence, |K(epoch)|, not the constant V (which no longer exists: validator sets can be any multiple of 3 from 6 to 1023). The verdict's judgment list is now length-prefixed on the wire, and its length ⌊2/3·|k|⌋ + 1 is a validity rule; judge indices must be below |k| (`judgments.tex`, section 10.2, eq. `verdicts`).

</div>

<div class="lasair-connection">

### In Lasair: Verdict Types

```ocaml
(* conformance/disputes_stf.ml *)

let verdict_threshold_for (k : validator_key list) = (2 * List.length k) / 3 + 1
let wonky_tally_for (k : validator_key list) = List.length k / 3

let classify_verdict (k : validator_key list) (judgements : judgement_vote list) : verdict_result =
  let valid_count = List.length (List.filter (fun j -> j.is_valid) judgements) in
  if valid_count = verdict_threshold_for k then VerdictGood
  else if valid_count = 0 then VerdictBad
  else if valid_count = wonky_tally_for k then VerdictWonky
  else VerdictBadSplit
```

`k` is the key list of the epoch the verdict names. (`lib/judgments.ml` is an older learning model that still derives the thresholds from a fixed `val_count`.)

</div>

## State: The Four Sets

The judgment state tracks four things:

```
psi = {
  good_set:    Hash[]   -- Reports judged valid (allow)
  bad_set:     Hash[]   -- Reports judged invalid (ban)
  wonky_set:   Hash[]   -- Reports we can't determine (uncertain)
  offenders:   Key[]    -- Ed25519 keys of misbehaving validators
}
```

<div class="callout callout-info">

**ELI5: The Permanent Record**

Like a school's permanent record:
- **Good set** = Honor roll (approved work)
- **Bad set** = Expelled (banned forever)
- **Wonky set** = Incomplete grades (removed, no punishment)
- **Offenders** = Detention list (validators to be punished)

Once a report is in any set, it can never be judged again - no "asking daddy after mommy said no."

</div>

<div class="lasair-connection">

### In Lasair: Disputes State

```ocaml
(* lib/judgments.ml *)

(** Disputes state *)
type disputes_state = {
  good_set: hash list;       (** Reports judged valid *)
  bad_set: hash list;        (** Reports judged invalid *)
  wonky_set: hash list;      (** Reports impossible to judge *)
  offenders: bytes list;     (** Ed25519 keys of misbehaving validators *)
}

(** Check if report has any verdict *)
let has_verdict (state : disputes_state) (report_hash : hash) : bool =
  is_good state report_hash ||
  is_bad state report_hash ||
  is_wonky state report_hash
```

</div>

## Culprits vs Faults

Two types of misbehavior can be proven:

### Culprits
**Guarantors** who vouched for an **invalid** work report.

```
Culprit proof = {
  report_hash:   -- The bad work report
  offender_key:  -- Guarantor's Ed25519 key
  guarantee_sig: -- Their signature on the guarantee
}
```

### Faults
**Auditors** who judged **contrary** to the final verdict.

```
Fault proof = {
  report_hash:  -- The work report
  was_valid:    -- What they voted (opposite of verdict)
  offender_key: -- Auditor's Ed25519 key
  judgment_sig: -- Their judgment signature
}
```

<div class="lasair-connection">

### In Lasair: Culprits and Faults

```ocaml
(* lib/judgments.ml *)

(** Culprit proof - guarantor who backed invalid report *)
type culprit = {
  report_hash: hash;
  offender_key: bytes;       (** Ed25519 key *)
  guarantee_sig: bytes;      (** Their guarantee signature *)
}

(** Fault proof - auditor who judged contrary to verdict *)
type fault = {
  report_hash: hash;
  was_valid: bool;           (** What they judged *)
  offender_key: bytes;       (** Ed25519 key *)
  judgment_sig: bytes;       (** Their judgment signature *)
}
```

</div>

## The Disputes Extrinsic

The block extrinsic has three parts:

```
E_D = {
  verdicts: Verdict[≤16]   -- each: ⌊2/3·|k|⌋+1 judgments on one report
  culprits: Culprit[≤16]   -- Guarantors of bad reports
  faults:   Fault[≤16]     -- Auditors who judged wrong
}
```

<div class="callout callout-info">

**ELI5: The Court Filing**

A disputes extrinsic is like a court case filing:
- **Verdicts** = Jury decisions (everyone's votes)
- **Culprits** = Defendants found guilty (bad guarantors)
- **Faults** = Witnesses who lied (wrong auditors)

A "not guilty" (good) verdict must come with at least one fault: someone raised a false alarm. A guilty (bad) verdict no longer has to name its culprits in the same filing; they can be filed in later blocks.

</div>

## Composition Rules

Critical constraints on the extrinsic:

```
At most N_V = 16 verdicts, 16 culprits and 16 faults per block.

For each GOOD verdict:
  -> Must include at least 1 fault
  -> (Someone raised a false alarm - punish them)

For each BAD verdict:
  -> No minimum number of culprits (since GP 0.8.0)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the rule "a bad verdict must be accompanied by at least two culprits" was removed; only good verdicts still require a fault. The extrinsic is also bounded: at most N_V = 16 verdicts and at most N_O = 16 culprits and 16 faults (`judgments.tex`, section 10.2, eq. `disputesextrinsics`; `definitions.tex`). Culprits may still only name reports in the posterior bad set ψ_B'.

</div>

<div class="lasair-connection">

### In Lasair: Composition Validation

```ocaml
(* conformance/disputes_stf.ml *)

let max_extrinsic_verdicts = 16
let max_extrinsic_offenses = 16

  if List.length disputes.verdicts > max_extrinsic_verdicts then
    Result.Error "too_many_verdicts"
  else if List.length disputes.culprits > max_extrinsic_offenses
       || List.length disputes.faults > max_extrinsic_offenses then
    Result.Error "too_many_offenses"

    (* GP 0.8.0 (#525): a BAD verdict no longer requires two culprits -- the
       `not-enough-culprits` error is gone (vector
       progress_with_bad_verdict_without_culprits). Only good verdicts still
       need a fault (checked below). *)
```

A good verdict with no fault referencing it is rejected with `not_enough_faults`. (`lib/judgments.ml`, the older learning model, still contains the two-culprit check.)

</div>

## Signature Verification

Judgments are signed with Ed25519 using specific contexts:

```
Valid judgment:   sign("jam_valid" || report_hash)
Invalid judgment: sign("jam_invalid" || report_hash)
Guarantee:        sign("jam_guarantee" || report_hash)
```

<div class="lasair-connection">

### In Lasair: Signature Contexts

```ocaml
(* conformance/disputes_stf.ml *)

(* Signing contexts for judgments *)
let valid_context = Bytes.of_string "jam_valid"
let invalid_context = Bytes.of_string "jam_invalid"
let guarantee_context = Bytes.of_string "jam_guarantee"

(** Create payload for valid/invalid judgment signature *)
let create_judgment_payload (vote : bool) (target : bytes) : bytes =
  let context = if vote then valid_context else invalid_context in
  Bytes.cat context target

(** Create payload for guarantee signature *)
let create_guarantee_payload (target : bytes) : bytes =
  Bytes.cat guarantee_context target
```

</div>

## Ordering Requirements

All elements must be sorted (no duplicates):

```
Verdicts:  Ordered by report hash
Judgments: Ordered by validator index within each verdict
Culprits:  Ordered by offender key
Faults:    Ordered by offender key
```

Why? Makes validation O(n) instead of O(n^2) - just check each element is greater than the previous.

<div class="lasair-connection">

### In Lasair: Ordering Validation

```ocaml
(* lib/judgments.ml *)

(** Validate verdicts are ordered by report hash *)
let is_ordered_verdicts (extrinsic : disputes_extrinsic) : bool =
  let rec check_v (lst : verdict list) = match lst with
    | [] | [_] -> true
    | a :: b :: rest ->
      Bytes.compare (Hash.to_bytes a.report_hash) (Hash.to_bytes b.report_hash) < 0
      && check_v (b :: rest)
  in
  check_v extrinsic.verdicts

(** Validate judgments are ordered by validator index *)
let is_ordered_judgments (v : verdict) : bool =
  let rec check = function
    | [] | [_] -> true
    | a :: b :: rest ->
      a.validator_index < b.validator_index && check (b :: rest)
  in
  check v.judgments
```

</div>

## Epoch Flexibility

Validators can submit judgments from the **current or previous epoch**:

```
Age = 0: Use current validators (kappa)
Age = 1: Use previous validators (lambda)
```

Why? Prevents an attack where invalid work is submitted at the end of an epoch, and the new validators haven't seen it yet.

## Removing Pending Work

When a verdict comes in, pending work reports must be handled:

```
If verdict is BAD or WONKY:
  -> Clear the core's availability assignment (rho) holding that report
  -> Prevent corrupted state

If verdict is GOOD:
  -> Keep in pending, allow accumulation
```

In GP 0.8.0, ρ holds per core an *availability assignment*: the whole guarantee (report, timeslot, credentials) plus the time it was reported. The judgment step yields the intermediate ρ†, with every assignment whose report hash got a bad or wonky verdict set to ∅ (`judgments.tex` eq. `removenonpositive`).

<div class="lasair-connection">

### In Lasair: Report Removal

```ocaml
(* lib/judgments.ml *)

(** Check if report should be removed from pending *)
let should_remove_report (extrinsic : disputes_extrinsic) (report_hash : hash) : bool =
  List.exists (fun (v : verdict) ->
    Bytes.equal (Hash.to_bytes v.report_hash) (Hash.to_bytes report_hash) &&
    count_positive v < good_threshold  (* Not definitely valid *)
  ) extrinsic.verdicts
```

</div>

## Summary Diagram

```
                          Work Report Disputed
                                  |
                                  v
                    +---------------------------+
                    |   2/3+1 Validators Vote   |
                    +---------------------------+
                                  |
            +---------------------+---------------------+
            |                     |                     |
            v                     v                     v
      All Valid            ~1/3 Valid            All Invalid
     (GOOD verdict)      (WONKY verdict)       (BAD verdict)
            |                     |                     |
            v                     v                     v
    +---------------+     +---------------+     +---------------+
    | Add to        |     | Add to        |     | Add to        |
    | good_set      |     | wonky_set     |     | bad_set       |
    +---------------+     +---------------+     +---------------+
            |                     |                     |
            v                     v                     v
    +---------------+     +---------------+     +---------------+
    | Punish false  |     | Remove from   |     | Punish        |
    | auditors      |     | pending       |     | guarantors    |
    | (faults)      |     | (no slash)    |     | (culprits)    |
    +---------------+     +---------------+     +---------------+
```

## Key Takeaways

1. **Three Verdicts** - Good (valid), Bad (invalid), Wonky (uncertain)
2. **Culprits** - Guarantors who backed bad work (no minimum per bad verdict since GP 0.8.0)
3. **Faults** - Auditors who judged wrong (1+ per good verdict)
4. **No Re-Judgment** - Once judged, a report is locked forever
5. **Epoch Flexibility** - Current or previous validators can submit
6. **Ordered Data** - All elements sorted for efficient validation

## Graypaper References

- Section 10: Judgments
- Section 10.1: State (good/bad/wonky/offenders sets)
- Section 10.2: Extrinsic (verdicts, culprits, faults)
- Section 10.3: Header (offenders marker)

## What's Next

Continue with **Section 11: Reporting and Assurance** to understand how work reports are submitted and validated.

[Next: 11 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
