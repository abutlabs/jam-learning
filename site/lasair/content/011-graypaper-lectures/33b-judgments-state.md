---
title: "10.1 Judgments State"
duration: 4 min
video: https://www.youtube.com/watch?v=8Y3CBHa6_PA
---

# Graypaper Section 10.1: Judgments State

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains the **disputes state** - the on-chain record of work report verdicts and validator misbehavior.

## What This Section Covers

- The four judgment sets
- Good/Bad/Wonky verdicts
- The punish (offenders) set
- How validators get marked for punishment

## The Four Sets

The disputes state consists of four sets:

```
Disputes State (ψ):
  ψ_G = Good set     (reports judged VALID)
  ψ_B = Bad set      (reports judged INVALID)
  ψ_W = Wonky set    (reports IMPOSSIBLE to judge)
  ψ_O = Offenders    (validators marked for punishment)
```

<div class="callout callout-info">

**ELI5: The Judgment Record**

Think of the disputes state like a court record:
- **Good set** = Cases ruled "innocent" (valid reports)
- **Bad set** = Cases ruled "guilty" (invalid reports)
- **Wonky set** = Cases declared "mistrial" (can't determine)
- **Offenders** = People found in contempt of court (lied under oath)

</div>

## The Three Verdict Types

When validators vote on a work report, the outcome falls into one of three categories:

| Verdict | Vote Count | Meaning |
|---------|-----------|---------|
| **Good** | 2/3 + 1 positive | Report is definitely valid |
| **Bad** | 0 positive | Report is definitely invalid |
| **Wonky** | 1/3 positive | Can't determine validity |

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

(** Empty disputes state *)
let empty_disputes : disputes_state = {
  good_set = [];
  bad_set = [];
  wonky_set = [];
  offenders = [];
}
```

</div>

## Verdict Thresholds

The thresholds determine the outcome:

```
Judging validators: k = κ (verdict for the current epoch)
                     or λ (verdict for the previous epoch)
Judgments per verdict: ⌊2|k|/3⌋ + 1   (683 when |k| = 1023)

Good threshold:  ⌊2|k|/3⌋ + 1  (every judgment positive)
Bad threshold:   0              (every judgment negative)
Wonky threshold: ⌊|k|/3⌋        (341 when |k| = 1023)
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** there is no fixed validator count V any more; validator sets can be any multiple of 3 from 6 to 1023. The thresholds use |k|, the size of the key sequence of the epoch the verdict names (`judgments.tex`, section 10.2, function K and eq. `verdicts`). A verdict classifies a report as good (⊤), bad (⊥) or wonky (∅), and any other tally makes the block invalid.

</div>

<div class="lasair-connection">

### In Lasair: Thresholds

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

(`lib/judgments.ml`, an older learning model, still computes these from a fixed `val_count`.)

</div>

## The Offenders Set

The **offenders set** (punish set) tracks validators who:

1. **Voted contrary to a certain outcome**
   - Said "valid" when verdict was Bad
   - Said "invalid" when verdict was Good

2. **Guaranteed invalid reports** (culprits)
   - Were guarantors for reports in Bad set

```
Offenders includes:
  • Validators who judged "valid" on a Bad report
  • Validators who judged "invalid" on a Good report
  • Guarantors who backed Bad reports

NOT included:
  • Any votes on Wonky reports (uncertain = no punishment)
```

<div class="callout callout-warning">

**Why Wonky Doesn't Punish**

The Wonky verdict exists because sometimes the truth is unknowable:
- Data might be unavailable
- Execution might be non-deterministic
- Environment might have changed

If we can't be certain, we don't punish anyone. Only certain outcomes (Good/Bad) result in punishment for contrary judgments.

</div>

<div class="lasair-connection">

### In Lasair: Checking Membership

```ocaml
(* lib/judgments.ml *)

(** Check if report hash is in good set *)
let is_good (state : disputes_state) (report_hash : hash) : bool =
  List.exists (fun h -> Bytes.equal (Hash.to_bytes h) (Hash.to_bytes report_hash)) state.good_set

(** Check if report hash is in bad set *)
let is_bad (state : disputes_state) (report_hash : hash) : bool =
  List.exists (fun h -> Bytes.equal (Hash.to_bytes h) (Hash.to_bytes report_hash)) state.bad_set

(** Check if report hash is in wonky set *)
let is_wonky (state : disputes_state) (report_hash : hash) : bool =
  List.exists (fun h -> Bytes.equal (Hash.to_bytes h) (Hash.to_bytes report_hash)) state.wonky_set

(** Check if key is an offender *)
let is_offender (state : disputes_state) (key : bytes) : bool =
  List.exists (fun k -> Bytes.equal k key) state.offenders
```

</div>

## Visual: State Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISPUTES STATE (ψ)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   GOOD SET      │  │   BAD SET       │  │   WONKY SET     │ │
│  │   (ψ_G)         │  │   (ψ_B)         │  │   (ψ_W)         │ │
│  │                 │  │                 │  │                 │ │
│  │  Report hashes  │  │  Report hashes  │  │  Report hashes  │ │
│  │  judged VALID   │  │  judged INVALID │  │  UNCERTAIN      │ │
│  │                 │  │                 │  │                 │ │
│  │  2/3+1 positive │  │  0 positive     │  │  1/3 positive   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    OFFENDERS SET (ψ_O)                   │  │
│  │                                                          │  │
│  │  Ed25519 keys of validators who:                         │  │
│  │    • Judged "valid" on Bad reports                       │  │
│  │    • Judged "invalid" on Good reports                    │  │
│  │    • Guaranteed Bad reports (culprits)                   │  │
│  │                                                          │  │
│  │  → These validators lose stake and are removed           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why Four Sets?

| Set | Purpose |
|-----|---------|
| **Good** | Track confirmed valid reports (used by accumulation) |
| **Bad** | Track confirmed invalid reports (block their results) |
| **Wonky** | Track inconclusive reports (prevent re-judging) |
| **Offenders** | Track misbehavior (for stake slashing) |

## Key Takeaways

1. **Four sets** make up the disputes state
2. **Good set** = reports with 2/3+1 positive votes
3. **Bad set** = reports with 0 positive votes
4. **Wonky set** = reports with 1/3 positive votes (uncertain)
5. **Offenders** = validators who contradicted certain outcomes
6. **Wonky verdicts** don't trigger punishment (uncertainty protects)

## Graypaper References

- Section 10.1: State (eq. `disputesspec`)
- Section 10.2: set updates (eqs. `goodsetdef`, `badsetdef`, `wonkysetdef`, `offendersdef`)
- Section 10.2, eq. `verdicts`: Good/Bad/Wonky thresholds

## What's Next

Verdicts, culprits and faults reach the chain through the disputes extrinsic, covered in [10.0 Judgments](lesson.html?lesson=011-graypaper-lectures/33-judgments). Next comes reporting and assurance.

[Next: 11 Reporting &rarr;](lesson.html?lesson=011-graypaper-lectures/34-reporting)
