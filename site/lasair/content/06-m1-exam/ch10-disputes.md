---
title: "Ch. 10 Disputes, Verdicts and Judgments"
duration: 45 min
exam_portion: random
exam_bucket: either
gp_chapter: 10
gp_words: 1321
gp_tex: text/judgments.tex
lasair: lib/judgments.ml, conformance/disputes_stf.ml, conformance/stf_guarantees.ml, conformance/block_codec.ml
---

# Ch. 10 Disputes, Verdicts and Judgments

<span class="lecture-badge">M1 Understanding · Graypaper ch. 10</span>

Disputes are JAM's security backstop. Auditing (ch. 17, off-chain) produces judgments;
when enough validators judge a work-report, the verdict goes on-chain here, bad reports
are pulled from the pipeline, and the keys of validators who guaranteed or misjudged
them are recorded forever. It is rarely exercised in practice, which is exactly why it
is a coverage blind spot for implementers and a good test of understanding: the rules
are precise, numerous and all about thresholds.

## Chapter sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| ψ = (ψ_G, ψ_B, ψ_W, ψ_O) | disputes | good-set, bad-set, wonky-set of work-report **hashes**; punish-set of Ed25519 **keys** (eq. disputesspec) |
| ρ → ρ† | availability assignments | cores whose pending report was judged bad or wonky are cleared (eq. removenonpositive) |
| H_O | offenders marker | header field that must list exactly the new offenders |

### Inputs
E_D = (verdicts E_V, culprits E_C, faults E_F) (eq. disputesextrinsics), the prior
timeslot τ (for the epoch index), the prior active and previous validator sets κ and λ,
and the prior ψ. Epoch, keys and the "already judged / already punished" checks use the
**prior** state (the tex writes τ, κ, λ, ψ unprimed); only the culprit and fault rules
read the posterior ψ_B'/ψ_G', so they can cite a verdict in the same block. The outputs
then feed the rest of the block: ρ† ≺ (E_D, ρ) (eq. rhodagger) is what assurances and
then guarantees build on, and Safrole's γ' ≺ (…, ψ') reads the posterior offenders
(eq. transitionfunctioncomposition). In ch. 10, bold **v** is the *derived* sequence of
(report hash, ⊤/⊥/∅) pairs (eq. verdicts), not the extrinsic itself (the serialization
appendix's disputes codec reuses **v**, **c**, **f** as local names for E_V, E_C, E_F).

| Component | Shape | Bound |
|---|---|---|
| verdict | (report hash, epoch index ∈ {⌊τ/E⌋, ⌊τ/E⌋−1}, judgments) where each judgment is (validity bit, judge index, signature) | ≤ 𝖭_V = 16 verdicts |
| culprit | (report hash, offender Ed25519 key, signature) | ≤ 𝖭_O = 16 |
| fault | (report hash, validity bit, offender key, signature) | ≤ 𝖭_O = 16 (counted separately from culprits) |

### The transition in plain English
1. For each verdict, pick the key set: κ if the verdict names the current epoch, λ if it
   names the previous one. The verdict must carry exactly ⌊2|k|/3⌋+1 judgments, each
   signed by the indexed validator over `$jam_valid` or `$jam_invalid` ++ report hash.
2. Count the positive judgments t. Exactly ⌊2|k|/3⌋+1 positive means **good** (⊤); zero
   means **bad** (⊥); exactly ⌊|k|/3⌋ means **wonky** (∅). Any other count is invalid.
3. Verdicts must be ordered and unique by report hash, judgments ordered and unique by
   judge index, and no verdict hash may already be in ψ_G ∪ ψ_B ∪ ψ_W.
4. Culprits are guarantors of a report now in the bad-set: their key must be in κ ∪ λ
   minus the existing punish-set, and their signature over `$jam_guarantee` ++ hash must
   verify. Faults are judges who signed the losing side: the report must be in exactly
   one of ψ_B' and ψ_G' (so never a wonky one), in the bad-set iff the fault's validity
   bit is ⊤ (i.e. they said valid about a bad report, or invalid about a good one), same
   key and signature rules with the `$jam_valid`/`$jam_invalid` context.
5. Every good verdict must be accompanied by at least one fault for that report.
6. Culprits and faults are each ordered and unique by offender key (the Ed25519 key alone,
   not report hash then key). The two lists are independent, so one key may be in both.
7. ρ† clears every core whose pending report hash was judged bad or wonky.
8. ψ' absorbs the verdict hashes into the three sets and every culprit and fault key into
   the punish-set. H_O must equal the culprit keys followed by the fault keys, in extrinsic
   order.

### Validation rules and what they guard
| Rule (0.8.0) | Guards against |
|---|---|
| \|E_V\| ≤ 𝖭_V = 16; \|E_C\|, \|E_F\| ≤ 𝖭_O = 16 (eq. disputesextrinsics) | a block forcing every importer through an unbounded number of Ed25519 verifications |
| epoch index ∈ {⌊τ/E⌋, ⌊τ/E⌋−1}; key set K(a) = κ or λ | judgments signed by a set too old to be accountable |
| \|judgments\| = ⌊2\|k\|/3⌋+1 exactly | padding a verdict with extra or missing votes |
| judge index < \|k\|; signature under k[index]_ed over 𝖷_⊤ (`$jam_valid`) / 𝖷_⊥ (`$jam_invalid`) ++ hash | forged judgments; the context string separates the two votes |
| positive count t ∈ {⌊2\|k\|/3⌋+1, 0, ⌊\|k\|/3⌋} → good / bad / wonky | ambiguous verdicts; per the GP footnote these are the decision thresholds, acceptable because at least 2/3+1 validators are assumed live |
| verdicts ordered unique by hash; judgments ordered unique by index | duplicate votes, non-canonical blocks |
| verdict hashes disjoint from ψ_G ∪ ψ_B ∪ ψ_W | re-litigating a settled report |
| culprit: hash ∈ ψ_B'; key ∈ (κ ∪ λ).ed ∖ ψ_O; sig over 𝖷_G (`$jam_guarantee`) ++ hash | punishing a guarantor of a good report, or double-punishing |
| fault: hash ∈ ψ_B' ⇔ hash ∉ ψ_G' ⇔ validity bit; key ∈ (κ ∪ λ).ed ∖ ψ_O; sig over 𝖷_v (𝖷_⊤ or 𝖷_⊥ per the bit) ++ hash | punishing a judge who was on the winning side |
| every good verdict has ≥ 1 fault for the same report | a positive verdict entering the chain with no accountability for whoever disputed it |
| culprits, faults ordered unique by key | duplicates, non-canonical order |
| ρ†[c] = ∅ when core c's report hash is in **v** with ⊥ or ∅ | a condemned report becoming available and accumulating (eq. removenonpositive) |
| H_O = culprit keys ⌢ fault keys | a header lying about new offenders (derivation: the marker gives light clients the punish list without state) |

### Edge cases
- **Wonky verdict.** ⌊|k|/3⌋ positive judgments: the report is neither proven bad nor
  good; it is still cleared from ρ (cannot accumulate) and recorded so it cannot be
  disputed again. No culprits are possible (the hash is not in ψ_B'), and no faults
  either (the fault rule needs the hash in exactly one of ψ_B' and ψ_G').
- **Epoch boundary.** A verdict whose epoch index is ⌊τ/E⌋ − 1 (judgments signed by last
  epoch's set) uses λ; its judge indices index λ, not κ. In 0.8.0 a validator set may be
  any size in 𝕍 (multiples of 3 from 6 to 3C, eq. valcount), so |λ| can differ from |κ|
  and every threshold is computed from |k| of the chosen set. Full vectors
  `progress_with_verdicts_from_resized_previous_set-1` and `-2`: |κ| = 1023, |λ| = 6;
  a verdict naming the previous epoch with exactly 5 judgments is accepted (-1), while
  the same 5 naming the current epoch fail with `bad-votes-count` (-2; κ needs 683).
- **Empty E_D.** ψ' = ψ, ρ† = ρ, H_O must be empty.
- **Culprit already punished.** Rejected: k excludes the prior ψ_O, so on any one chain a
  key can be reported in at most one block. Within one block the same key *may* appear
  once as a culprit and once as a fault (each list is unique only within itself and
  excludes only the prior ψ_O): ψ_O' gains it once, but H_O lists it twice.
- **Fault on a good report.** Valid when the fault's bit is ⊥ (they voted invalid on a
  report judged good); the biconditional handles both directions.
- **Verdict with 5 of 6 at tiny.** ⌊2·6/3⌋+1 = 5 positive → good; 0 → bad; ⌊6/3⌋ = 2 →
  wonky; a verdict with 1, 3 or 4 positives is invalid.

### War story
<div class="lasair-connection">

**The disputes blind spot.** lasair's `disputes_stf.ml` passed all 56 Disputes STF
vectors at tiny and full, yet every trace vector and every fuzz seed lasair had seen
carried an empty E_D, so nothing had ever exercised disputes on the *block-import* path.
The tiny→full audit (`docs/TINY_TO_FULL_AUDIT.md`, "Disputes — the one real gap") found
three stacked gaps: `block_codec.ml` threw "disputes import not wired" on any verdict;
`compute_extrinsic_hash` hardcoded the disputes component as three empty sequences so a
real disputes block failed `bad_extrinsic_hash` before ψ was touched; and there was no
ρ→ρ† clearing nor ψ write, with the offenders-mark check counting keys rather than
comparing them. Auditing the STF itself also found two latent GP bugs the vector
harness could not see because it checked only the offenders mark: verdict
classification used "minority ≥ 2" instead of the exact tally {0, ⌊V/3⌋, ⌊2V/3⌋+1}, and
the epoch-index→key-set mapping was hardcoded rather than relative to ⌊τ/E⌋ (fixed on
2026-06-28, verified by a decoded truth table over all 60 vectors). Wiring disputes
into import (lasair v1.4.3) moved L2b seed 3571347957 from step 2 to step 6. Lesson: a component
proven by its own vectors is not proven in the block; and thresholds are exact values,
not inequalities.

**Sequel: the 0.8.0 validity audit (2026-09-23/24).** More disputes rules that no vector
exercises were wrong or missing on the import path, among them: disputes were judged
against the *posterior* τ'/κ'/λ' after the epoch update (the GP uses the prior state, and
Safrole's Φ must see ψ'), so `process_disputes` now runs first; culprits and faults were
ordered by report hash then key (the GP orders by key alone); H_O was compared after
sorting both sides (it is a sequence in extrinsic order); a key listed as both culprit
and fault was rejected as `offender_already_reported`; only ⊥ faults on good reports were
accepted, never ⊤ faults on bad ones; and the #525 bounds were not enforced. Recorded in
`docs/GP_0_8_0_PLAN.md` (ledger loops 6 and 8) and `docs/TINY_TO_FULL_AUDIT.md` (4th
sweep).

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **Bounded extrinsics:** at most 𝖭_V = 16 verdicts and 𝖭_O = 16 each of culprits and
  faults (eq. disputesextrinsics). (GP #525)
- **Variable-size validator sets:** the constant V = 1023 is gone; a set's size is any
  member of 𝕍 (eq. valcount). So judgment sequences are length-prefixed and must hold
  exactly ⌊2|k|/3⌋+1 judgments of the *chosen* set, with judge index < |k| (formerly a
  fixed-length sequence of ⌊2V/3⌋+1 judgments, no length prefix, judge index in ℕ_V),
  and the good/bad/wonky thresholds use |k| too. **v** now records ⊤/⊥/∅ via V(a, j)
  instead of the raw positive count, and ψ', ρ† key off those symbols (0.7.2 cleared ρ
  when t < ⌊2V/3⌋). (GP #514)
- **No two-culprit minimum for a bad verdict** any more; the only accompaniment rule
  left is "a good verdict needs at least one fault". (GP #525) In the test-vector ASN
  (the GP defines no error codes) the enumeration was renumbered: `not-enough-culprits`
  is gone, `bad-votes-count` is new.
- ρ is now "availability assignments" holding the full guarantee; the ρ† rule hashes
  the guarantee's work-report. (GP #494)

</div>

### Source pointers
- `lib/judgments.ml` — teaching module: `outcome_of_count`, `verify_judgment`,
  `verify_culprit`, `verify_fault`, `good_verdicts_have_faults`, `should_remove_report`,
  `header_offenders` (still the fixed V = 1023, and `verify_culprit`/`verify_fault` are
  placeholders; not on the import path)
- `conformance/disputes_stf.ml` — `classify_verdict`, `verdict_threshold_for`
  (⌊2|k|/3⌋+1 of the chosen set), `votes_sorted_unique`, `get_validators`,
  `apply_disputes_stf`
- `conformance/stf_guarantees.ml` — `process_disputes`: the import path, run first by
  `trace_runner.import_block` against the prior state (exact H_O sequence check, ψ write,
  ρ → ρ† clearing)
- `conformance/block_codec.ml` — disputes decoding on the import path (the once-missing wiring)
- `docs/notes/judgments.md`; lectures `011-graypaper-lectures/33-judgments`, `33b-judgments-state`

## Question bank

### Q1 ★ What are the four components of ψ and what does each contain?
<details><summary>Model answer</summary>

The good-set, bad-set and wonky-set hold **work-report hashes** judged respectively
valid, invalid, or impossible to judge. The punish-set holds the **Ed25519 keys** of
validators found to have offended: guarantors of bad reports (culprits) and judges who
signed the losing side (faults). All four only ever grow. They exist to stop bad
reports being resubmitted, to stop settled reports being re-disputed, and to give a
higher-level system (staking on Polkadot) a permanent record to slash against. Inside
the protocol the punish-set bites through Φ (eq. blacklistfilter), which replaces any key
whose Ed25519 part is in the *posterior* ψ_O' with an all-zero key: in the pending set
taken from ι at an epoch change, and in the guarantor assignments M and M* that guarantee
signatures are checked against (eq. guarantorsig). Because Φ reads ψ_O', a validator
convicted in this block is already a null key in this block's M and M*, and, if this
block starts a new epoch, in the new pending set γ_P'.

</details>

### Q2 ★ Describe a verdict and the exact rules for its judgments.
<details><summary>Model answer</summary>

A verdict is (report hash, epoch index, judgments). The epoch index must be the current
epoch ⌊τ/E⌋ of the prior τ (then the keys are κ) or one less (then λ). It must contain
exactly ⌊2|k|/3⌋+1 judgments, ordered and unique by judge index, each index below |k|, each
signed by that validator's Ed25519 key over the context `$jam_valid` or `$jam_invalid`
followed by the report hash. Verdicts are ordered and unique by hash within the
extrinsic and must not name a report already in any of the three sets.

</details>

### Q3 ★ How is a verdict classified good, bad or wonky, and why those exact numbers?
<details><summary>Model answer</summary>

Sum the validity bits: exactly ⌊2|k|/3⌋+1 positive is good; exactly 0 is bad; exactly
⌊|k|/3⌋ is wonky; anything else makes the block invalid. The GP's footnote says only
that these "happen to be the decision thresholds for our three possible actions" and
are acceptable because the security assumptions require at least two-thirds-plus-one
live validators (citing ePrint 2024/961). The intuition (derivation, not GP text): a
supermajority saying valid settles it; zero saying valid means nobody would defend it;
one third is the largest dissenting minority consistent with the honesty assumption,
which is the "cannot decide" case. At tiny (|k| = 6): 5 / 0 / 2; with |k| = 1023:
683 / 0 / 341.

</details>

### Q4 What is a culprit and what is a fault?
<details><summary>Model answer</summary>

A culprit is a guarantor of a report that has just been (or already is) in the bad-set:
proof is their `$jam_guarantee` signature over the report hash. A fault is a judge who
signed against the outcome: the fault carries a validity bit, and the rule is
"report ∈ bad-set ⇔ report ∉ good-set ⇔ bit", so a fault is a `$jam_valid` signature on a
bad report or a `$jam_invalid` signature on a good one. Both must use a key from κ ∪ λ
not already punished, and each list is ordered and unique by the Ed25519 key alone. The
lists are independent, so one key can be both a culprit and a fault. Their keys join the
punish-set and appear in the offenders marker.

</details>

### Q5 Why must every good verdict be accompanied by at least one fault?
<details><summary>Model answer</summary>

The GP states the rule ("any verdict containing solely valid judgments implies the same
report having at least one valid entry in the faults sequence") without giving the
reason. The reasoning (derivation, not GP text): a verdict only exists because someone
raised a negative judgment during auditing, since a positive audit outcome needs no
on-chain record. If the report turns out good, the validator who disputed it caused the
whole network to audit it, so the protocol requires that at least one such dissenting
signature be included and punished. Without the rule, disputes could be raised for free.

</details>

### Q6 ★ What happens to ρ when a verdict is not positive, and why does this come before assurances?
<details><summary>Model answer</summary>

ρ† clears every core whose pending guarantee's work-report hash appears in the verdicts
with ⊥ or ∅. This must happen before assurances are counted (ρ† ≺ (E_D, ρ) then ρ‡ ≺
(E_A, ρ†) in the ch. 4 graph) so that a report condemned in this block cannot
simultaneously become available and enter accumulation. The Graypaper describes this as
cancelling the report's imminent accumulation; off-chain it also implies the chain has
already been reverted to before that report's accumulation.

</details>

### Q7 What must the offenders marker contain?
<details><summary>Model answer</summary>

Exactly the sequence of new offender keys: the culprit keys in extrinsic order followed
by the fault keys in extrinsic order (judgments.tex, Header subsection). A key that is
both a culprit and a fault appears twice in H_O, although ψ_O' gains it once. The GP
defines the marker only as the keys of newly misbehaving validators; that it lets light
clients and the validator-selection layer learn punishments from headers alone is
derivation, not GP text. The check must compare the exact sequence, not counts or sets.
lasair's original check was count-only, which a forged marker with the right length and
wrong keys would have passed; the 0.8.0 audit then found its replacement compared the
two lists after sorting them (blind to order), and that the STF rejected a key listed as
both culprit and fault (`offender_already_reported`).

</details>

### Q8 Which validator sets may sign judgments and why two?
<details><summary>Model answer</summary>

The active set κ (epoch index = ⌊τ/E⌋ of the prior τ) or the previous set λ (one less).
Anything older is rejected. Why two (derivation, not GP text): auditing and judging take
time, so judgments signed by one epoch's validators may only reach the chain after
rotation; keeping λ in state lets those signatures remain verifiable and accountable
(the posterior λ' also feeds the previous-rotation guarantor assignments M* across an
epoch boundary, eq. priorassignments). In 0.8.0 |λ| may differ from |κ|, so the
judgment count and thresholds follow the chosen set.

</details>

### Q9 What does "no duplicate report hashes, nor amongst any past reported hashes" enforce?
<details><summary>Model answer</summary>

Within one extrinsic each report hash appears in at most one verdict, and no verdict may
concern a hash already in ψ_G, ψ_B or ψ_W. Once judged, a report is settled forever:
good reports cannot be re-disputed and bad reports cannot be re-tried. This is also why
the sets never shrink.

</details>

### Q10 Give the tiny-spec thresholds and walk through a bad verdict with one culprit.
<details><summary>Model answer</summary>

|k| = 6 (tiny): a verdict needs 5 judgments; 5 positive = good, 0 = bad, 2 = wonky. A
bad verdict on hash h with 5 `$jam_invalid` signatures puts h in ψ_B'. A culprit
(h, key, sig) is valid if key is an unpunished member of κ ∪ λ and sig verifies over
`$jam_guarantee` ++ h. ψ_O' gains the key, H_O lists it, and if some core's pending
report is h, ρ† clears that core. In 0.8.0 no minimum number of culprits is required.

</details>

### Q11 What changed in this chapter in 0.8.0?
<details><summary>Model answer</summary>

Verdicts are capped at 𝖭_V = 16 and culprits and faults at 𝖭_O = 16 each per extrinsic,
and the two-culprit minimum for bad verdicts was dropped (both GP #525). Validator sets
became variable-size (GP #514; the constant V is gone), so judgment sequences are
length-prefixed and sized by the chosen key set, ⌊2|k|/3⌋+1, rather than a fixed
⌊2V/3⌋+1 array; the good/bad/wonky thresholds use |k|; and **v** now records ⊤/⊥/∅.
ρ holds full guarantees (GP #494). In the test-vector ASN, not the GP, the disputes error
enumeration was renumbered (`bad-votes-count` added, `not-enough-culprits` removed).
lasair's migration tracks these via `stf/disputes/disputes.asn` and the new 0.8.0
vectors (`progress_with_bad_verdict_without_culprits`, `progress_with_bad_votes_count`,
and at full `progress_with_verdicts_from_resized_previous_set`).

</details>

### Q12 How does a block author know a report is bad before the verdict is on-chain?
<details><summary>Model answer</summary>

Through auditing (ch. 17): after a negative judgment is broadcast, all validators audit
the report and publish judgments off-chain. The author collects ⌊2|k|/3⌋+1 signatures
into a verdict. Ch. 17 says nodes disregard any chain that includes the accumulation of a
report at least one third of validators judge invalid, and that an invalid verdict
"should be introduced on a chain where the report has not yet been accumulated", so
honest authors fork from before the report was accumulated and include the verdict in
the new branch. Ch. 4 requires that Grandpa not finalize such an extension, and ch. 19
only votes to finalize blocks judged audited.

</details>

### Q13 Against which state is the disputes extrinsic judged, and what reads its output?
<details><summary>Model answer</summary>

Against the **prior** state: the epoch index is checked against ⌊τ/E⌋ of the prior τ, the
key sets are the prior κ and λ, and the "already judged" and "already punished" checks
use the prior ψ (the tex writes them unprimed); only culprits and faults are checked
against ψ_B'/ψ_G', which already include this block's verdicts. The outputs flow
forward. ρ† ≺ (E_D, ρ) (eq. rhodagger) is the input to assurances (ρ‡, eq. rhoddagger)
and then guarantees (ρ', eq. rhoprime), so a report condemned in this block cannot
become available. Every use of Φ (eq. blacklistfilter) reads the posterior ψ_O':
Safrole's γ_P' ← Φ(ι) at an epoch change (γ' ≺ (…, ψ'), eq.
transitionfunctioncomposition) and the guarantor assignments M and M*. A validator
convicted in this block is therefore already a null key in this block's guarantor
assignments (and in γ_P' if the block starts an epoch). Judging against
the posterior τ'/κ'/λ' instead (derivation) changes nothing within an epoch (κ' = κ,
λ' = λ) but differs on a block that starts a new epoch: with e' = e + 1 it accepts indices
{e + 1, e} instead of {e, e − 1}, so it would reject a λ-verdict the GP accepts and accept
one naming the new epoch. lasair did exactly that until the 0.8.0 migration
(`docs/GP_0_8_0_PLAN.md`, ledger loop 6); disputes now run first in `import_block`.

</details>
