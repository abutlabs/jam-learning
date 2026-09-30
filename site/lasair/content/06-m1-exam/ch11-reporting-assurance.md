---
title: "Ch. 11 Reporting and Assurance"
duration: 75 min
exam_portion: random
exam_bucket: large
gp_chapter: 11
gp_words: 3144
gp_tex: text/reporting_assurance.tex
lasair: lib/reporting.ml, lib/cores.ml, lib/assurance.ml, conformance/reports_stf.ml, conformance/assurances_stf.ml, conformance/stf_guarantees.ml, conformance/availability.ml
---

# Ch. 11 Reporting and Assurance

<span class="lecture-badge">M1 Understanding · Graypaper ch. 11</span>

This chapter is the on-chain half of in-core computation: how a guaranteed work-report
enters the chain, how validators attest that its data is available, and how it either
becomes accumulatable or times out. It carries the most validation rules of any chapter
in the pool, most of them about the guarantees extrinsic. If this is the large draw,
expect to be walked rule by rule.

## Chapter sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| ρ | availability assignments | per core, optionally (guarantee **g**, timestamp **t**): the guaranteed report awaiting availability and the slot it was reported (eq. reportingstate) |
| ρ† → ρ‡ → ρ' | intermediates | after disputes (ch. 10), after assurances, after guarantees |
| **R** | newly available reports | the sequence of reports that reached a supermajority this block; feeds accumulation |
| **M** | guarantor assignments | (core per validator, validator keys), derived from κ', η₂', τ'. The keys are Φ(κ'): the offenders filter (eq. blacklistfilter) replaces with a null (all-zero) key every key whose Ed25519 component is in the posterior offenders ψ'_O, so an offender, including one added by this very block's disputes, has a null key in **M**. **M*** is the same under the previous rotation, with Φ applied to its own key set |
| **G** | reporters | Ed25519 keys that signed a credential this block; feeds statistics |

Reads: β† (anchor; strictly β_H†, the recent-history component with the parent's state root
filled in, eq. correctlaststateroot; β below likewise means β_H), the ancestor header set A
(lookup anchor), α (authorizer pool),
δ (service code hash and minimum accumulate gas), ω and ξ (pipeline duplicates), κ, κ',
λ', η', τ, τ', and ψ'_O (through Φ).

### Inputs
E_A assurances, then E_G guarantees, plus header fields H_P (assurance anchor), H_T.

### The objects
**Work-report** (eq. workreport): availability spec **a**, refinement context **x**,
core **c**, authorizer hash **a_h** and trace **o**, segment-root lookup dictionary **l**
(package hash → segment root), 1 to I = 16 work-digests **d**, is-authorized gas used **g**.
Constraint: |l| + |prerequisites| ≤ J = 8 (C_maxreportdeps); authorizer trace plus all
successful digest outputs ≤ W_R = 48 KiB (C_maxreportvarsize).

**Refinement context** (eq. workcontext): anchor (header hash, **timeslot**, posterior
state root, accumulation-log super-peak) and lookup-anchor (header hash, timeslot,
**posterior state root**), plus the set of prerequisite package hashes.

**Availability spec** (eq. avspec): package hash, bundle length, erasure root, **erasure
shard count**, segment root, segment count. Erasure root = Merkle root over the
erasure-coded chunks of bundle + exported segments (one chunk per validator). Segment
root = constant-depth, left-biased, zero-padded Merkle tree over exported segment hashes.

**Work-digest** (eq. workdigest): service index, code hash, payload hash, accumulate gas
limit, result (blob or error ∈ {∞ out-of-gas, ☇ panic, ⊚ BAD-EXPORTS, ⊝ OVERSIZE, BAD (code
not available at lookup anchor), BIG (code over W_C = 4 000 000 octets)}), refine gas used,
import count, extrinsic count, extrinsic size, export count.

### The transition in plain English
**Assurances first** (each core has one slot, so free it before refilling):
1. Each assurance is (anchor, bitfield of C bits, validator index, signature). All must
   anchor on H_P, be ordered by validator index, and be signed by κ[index] over
   `$jam_available` ++ Blake2b(encode(H_P, bitfield)). A bit may be set only for a core
   that has an assignment in ρ†.
2. A core's report becomes available when more than 2/3·|κ| assurances set its bit (|κ| is
   the prior set: ⌊2|κ|/3⌋ + 1 = 683 of 1023 at full, 5 of 6 at tiny).
   **R** is the sequence of those reports in core order (eq. availableworkreports).
3. ρ‡ = ρ† minus cores that are now available, cores whose report is older than
   U = 5 slots (H_T ≥ t + U), and *every* core if |κ| ≠ |κ'| (a
   validator-set size change clears everything). (eq. availassignmentspostassurancesdef)

**Guarantees second**:
4. Compute **M**: shuffle the sequence ⌊i/3⌋ for i < |κ'| with η₂', then rotate by
   ⌊(τ' mod E)/R⌋ modulo |κ'|/3. Each active core gets three validators. **M*** is the same
   under the previous rotation (using λ' and η₃' if the previous rotation was in the
   previous epoch).
5. Each guarantee is (report, slot, credential of 2–3 (index, signature)). Guarantees are
   ordered and unique by core; credentials ordered and unique by validator index.
6. For each credential entry: the validator must be assigned to the report's core under
   the assignments of the guarantee's slot (current rotation → M, previous → M*), its
   index must be < |k| for that assignment's key sequence k, the core must be active now
   (< |κ'|/3, even when the slot is from a previous rotation in which it was active), the
   signature must verify under that validator's
   Ed25519 key over `$jam_guarantee` ++ Blake2b(report), and the slot must satisfy
   R·(⌊τ'/R⌋ − 1) ≤ slot ≤ τ'.
7. Report-level checks: erasure shard count = |κ'|; the core has no assignment in ρ‡;
   the authorizer is in the prior pool α[core] (the used entry is then removed when α' is
   built, ch. 8); per-digest gas limit ≥ the service's minimum accumulate
   gas and the sum ≤ G_A = 10 M (C_reportaccgas); each digest's code hash equals the service's
   current code hash.
8. Contextual checks: no duplicate package hashes in the extrinsic; the anchor (hash,
   state root, belt peak, **slot**) is in β†; lookup-anchor slot ≥ H_T − L (L = 14 400 /
   24 tiny) and an ancestor header h exists with that slot and hash, whose child h' (also
   in A, which includes the importing block's own header, eq. ancestors) has
   prior-state-root equal to the lookup-anchor state root; the package hash is not in β's
   reported packages, ξ, ω, or the prior ρ (not ρ†); every prerequisite and every key of
   the segment-root
   lookup is in this extrinsic or in β; every segment-root lookup entry matches the
   segment root recorded for that package.
9. ρ' = ρ‡ with each guaranteed core replaced by (guarantee, τ'). Cores ≥ |κ'|/3 are
   always ∅.

### Validation rules and what they guard
**Assurances**
| Rule | Guards against |
|---|---|
| anchor = H_P | replaying an assurance made against a different parent |
| ordered by validator index, at most one per validator | duplicates, non-canonical blocks |
| signature under κ[index].ed over X_available ++ H(E(H_P, bitfield)) | forged availability claims |
| bit set ⇒ ρ†[core] ≠ ∅ | assuring a core with nothing pending (also catches stale bitfields) |
| available ⇔ count > 2/3·\|κ\| | a report accumulating before enough validators hold its data to reconstruct it (decoding needs 𝒟(v) ≤ v/3 + 1 of the v chunks, eq. ecoriginalshards: 342 of 1023; 2/3 gives margin against dishonest assurers) |
| clear on timeout (5 slots) or \|κ\| ≠ \|κ'\| | a core blocked forever by an unavailable package; a set-size change invalidates the shard-per-validator mapping |

**Guarantees**
| Rule | Guards against |
|---|---|
| ≤ C guarantees, ordered unique by core | two reports for one core in a block |
| credential 2–3 entries, ordered unique by index | a single validator vouching alone; duplicate signatures |
| signer index < \|k\| and assigned to that core under M or M*, core < \|κ'\|/3 | any validator guaranteeing any core; inactive cores |
| signature over X_guarantee ++ H(report) | forged guarantees; the same context is what a culprit proof reuses |
| R(⌊τ'/R⌋−1) ≤ slot ≤ τ' | guarantees from more than one rotation ago (assignments would be unknown) or from the future |
| erasure shards = \|κ'\| | a report whose chunks cannot map one-per-assurer |
| ρ‡[core] = ∅ | overwriting a report still awaiting availability |
| authorizer ∈ α[core] | running work nobody paid for on that core (ch. 8) |
| Σ digest gas ≤ 10 M and each ≥ service min gas | starving a service's accumulate, or one report eating the block gas |
| code hash = δ[service].code | accumulating against code the refine did not run |
| \|l\| + \|prereqs\| ≤ 8 | unbounded dependency graphs |
| trace + outputs ≤ 48 KiB | extrinsic space monopolised by one report |
| unique package hashes in extrinsic | reporting one package twice |
| anchor in β† (hash, state root, belt peak, slot) | a report refined against a state the chain does not recognise |
| lookup-anchor age ≤ L; header in A; child's prior root matches | preimage lookups against unverifiable or too-old state |
| package not in β, ξ, ω, ρ | re-reporting a package already reported, accumulated, queued or pending |
| prerequisites and lookup keys in extrinsic ∪ β | dependencies on unknown packages |
| lookup segment roots match the recorded ones | importing segments under a false commitment |

### Edge cases
- **Validator set resized at epoch boundary** clears every assignment (a new clause in 0.8.0,
  GP #514, now that |κ| can change). Reports whose assurances, signed by the prior κ, reach
  the threshold in that same block still enter **R**. The assurances vector
  `val_set_size_change_clears_pending_reports` tests this; `report_with_shrunken_val_set`
  tests guarantees under a shrunk κ' (a credential index ≥ |κ'| fails as
  `bad_validator_index`), and the disputes vector
  `progress_with_verdicts_from_resized_previous_set` tests verdicts from a resized λ.
- **Guarantee from the previous rotation** uses M*; if the previous rotation was in the
  previous epoch, M* is built from λ' and η₃'. The core must still be active under κ'
  (< |κ'|/3) even if it was active then (GP text above eq. guarantorsig; vector
  `inactive_core_index-1`, core 340, fails as `bad_core_index`), and the erasure shard
  count must still equal |κ'|, not |λ'| (the erasure-shards equation);
  `inactive_core_index-2` is the accepted form (core 0, 6 shards).
- **Stale report assured in time:** eq. availableworkreports has no timeout clause, so a
  report with H_T ≥ t + U is still in ρ† and becomes available if this block's assurances
  reach the threshold (vector `assurances_for_stale_report`); only otherwise is it dropped.
- **Dependency loop** between two reports in the same extrinsic passes these checks; the
  accumulation queue simply never releases them (the Graypaper says so explicitly).
- **Timeout arithmetic** uses H_T against the stored timestamp; a report guaranteed at
  slot t can be replaced from slot t+5.
- **Tiny:** C = 2 and |κ'| = 6, so |κ'|/3 = 2 cores are active with 3 guarantors each;
  supermajority is > 4, so 5 assurances (full at 1023: > 682, so 683). 0.8.0 has no
  constant V: a set size is any member of 𝕍 = {6, 9, …, 1023} (eq. valcount, full
  constants; with tiny's C = 2, 𝕍 = {6}).

### War story
<div class="lasair-connection">

**F6: the core-popularity bitfield.** The assurance bitfield is ⌈C/8⌉ bytes: 1 at
tiny, 43 at full. Core popularity, the per-core count of assurances that this chapter's
extrinsic feeds into the core statistics of ch. 13 (state key 0x0D), was read from
byte 0 of the bitfield only, so at full every core ≥ 8 counted zero assurances and the
statistics root diverged on the first full-spec L2b block (seed 3571347957, the "F5/F6
session" in `docs/LOCAL_L2B_FUZZER.md`; fixed in v1.4.2, `docs/process/RALPH_PROMPT.md`). The
tiny→full audit that followed (`docs/TINY_TO_FULL_AUDIT.md`) confirmed the fix
("popularity byte c/8"), caught F5 (`bitfield_bytes` and `votes_per_verdict` frozen as
module-level values at the tiny size) and recorded a residual `land 0xFF` in
`stf_statistics.ml` that was masked only while popularity stayed below 128; the GP 0.8.0
audit replaced it with a compact encoding, since popularity reaches 683 and more at full
(`docs/GP_0_8_0_PLAN.md` ledger, 2026-09-23). Fix: every width is a
function of the active spec (`Spec.num_cores ()`), and the L0 lint
`audit-tiny-constants.sh` fails any that is not. Lesson: "bit c of the bitfield" means
byte ⌊c/8⌋, bit c mod 8, for all c, and the same bitfield is read twice in a block, once
for availability and once for statistics.

**0.8.0: rules the vectors never reach.** lasair's component harnesses passed every 0.8.0
reports and assurances vector (Phase 3, 2026-09-23), but the block-import path is separate
code. The Phase 5 audit found it still took the availability threshold from the spec
constant V instead of ⌊2|κ|/3⌋ + 1 of the live prior set, and never cleared ρ when
|κ| ≠ |κ'| (fixed with `test/rho_resize_test`, which fails on the old code). The
pre-release audit the next day found it validated assurances and guarantees against the
pre-disputes state (GP reads ρ† and ρ‡, and Φ nulls the posterior offenders ψ'_O), that
the authorizer-in-pool, segment-root-value and J/I/W_R checks existed only in the
component harness, and that the import path lacked the lookup-anchor slot and child-root
checks and used a 24-slot lookup window even at full (`docs/TINY_TO_FULL_AUDIT.md`,
fourth sweep; `docs/GP_0_8_0_PLAN.md` ledger). Lesson: a rule that passes its vector is
enforced only where that vector runs.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- ρ renamed **availability assignments**; each entry is now the full **guarantee** plus
  timestamp (formerly the bare report plus timestamp). State key 0x0A value layout changes.
  (GP #494)
- Refinement context gained **anchor timeslot** and **lookup-anchor posterior state
  root**; the anchor check now also matches the slot in β†, and the lookup-anchor check
  requires the ancestor's child header to carry the matching prior-state-root. (GP #526)
- Availability spec gained **erasure shard count**, which must equal |κ'|; the erasure
  root is defined as the tree over those chunks. The coding rate is now 𝒟(v):v
  (eq. ecoriginalshards), so recovery takes 𝒟(v) chunks: 342 of 1023, 3 of 6. (GP #514)
- The validator-set size is now variable: |κ| ∈ 𝕍, the multiples of 3 from 6 to 1023
  (eq. valcount, GP #514). In this chapter the assurer index domain is N_{|κ|} (the
  extrinsic is no longer a V-bounded sequence), the supermajority is > 2/3·|κ| instead of
  2/3·V, and a new clause clears every assignment when |κ| ≠ |κ'|.
- Guarantor assignment (GP #514): P(v, e, t) shuffles ⌊i/3⌋ for i < v and rotates modulo
  v/3, with v = |κ'| for M and |k| for M* (was ⌊C·i/V⌋ over all V, rotated modulo C);
  only the first |κ'|/3 cores are active; M holds |κ'| entries; each credential needs
  index < |k| and a core active under κ', even with a previous-rotation slot.
- Guarantees are a named set 𝔾 = (report, slot, credential) (eq. guarantee), stored whole
  in ρ (GP #494). Recent-history entries gained a timeslot (eq. recenthistoryspec,
  GP #526), which the anchor-slot check reads.
- Report size limit restated with an explicit L(result) that counts only blob results.
  (GP #514)

</div>

### Source pointers
- `lib/reporting.ml` — `is_available`, `is_timed_out`, `clear_completed`, `is_core_free`,
  `has_valid_authorizer`, `is_unique_package`, `validate_context`, `process_block`
- `lib/cores.ml` — `compute_permutation`, `rotate_assignments`, `get_guarantor_assignments`,
  `validators_for_core`
- `conformance/reports_stf.ml` — `get_core_assignment`, `validate_guarantee`,
  `find_anchor`, `is_known_package`, `validate_work_results`, `apply_reports_stf`
- `conformance/assurances_stf.ml` — `check_assurers_sorted_unique`, `get_bit`,
  `apply_assurances_stf`; `conformance/availability.ml` — `bitfield_bytes`, `verify_assurance`
- `conformance/stf_guarantees.ml` — `validate_block_guarantees`, `process_guarantees`,
  `reported_package_hashes` (block-import path)
- `docs/notes/reporting.md`, `docs/notes/cores.md`; lectures `011-graypaper-lectures/34…34f`

## Question bank

### Q1 ★ Why are assurances processed before guarantees in the block, even though for a report the guarantee comes first?
<details><summary>Model answer</summary>

Each core holds at most one availability assignment. A new guarantee for a core is only
valid if that core is free (ρ‡[c] = ∅). Processing assurances first lets the report that
just became available, or timed out, vacate the core in the same block that a fresh
report for it arrives. This is the synchronous entanglement the Graypaper names as ρ‡
(eq. reportcoresareunused).

</details>

### Q2 ★ List the fields of a work-report and say what each is for.
<details><summary>Model answer</summary>

Availability spec (package hash, bundle length, erasure root, shard count, segment root,
segment count: everything needed to fetch, verify and reconstruct the package);
refinement context (anchor and lookup-anchor identifying the chain state the refine saw,
plus prerequisites); core index; authorizer hash and trace (which authorizer permitted
it and its output); segment-root lookup (package hash → segment root for imported
segments); 1–16 work-digests (per work-item: service, code hash, payload hash,
accumulate gas limit, result-or-error, refine gas used, import/export/extrinsic
counters); is-authorized gas used. Two size rules: dependencies ≤ 8, trace plus outputs
≤ 48 KiB.

</details>

### Q3 ★ Walk through the guarantor assignment function and explain η₂ and the rotation.
<details><summary>Model answer</summary>

Take the sequence [⌊i/3⌋ for i < |κ'|], which assigns validators to cores three at a
time; Fisher–Yates shuffle it with η₂'; then rotate every core index by
⌊(τ' mod E)/R⌋ modulo |κ'|/3. Only the first |κ'|/3 cores are active. The shuffle
changes each epoch (fresh entropy) and the rotation every R slots (10 full, 4 tiny) so
a colluding trio cannot sit on one core. The Graypaper uses η₂ rather than η₁ "to avoid
the possibility of fork-magnification where uncertainty about chain state at the end of
an epoch could give rise to two established forks before it naturally resolves": η₁ was
only just fixed by the final blocks of the previous epoch, while η₂ has been settled for
a whole epoch. M* recomputes for the previous rotation, switching to λ' and η₃' when that
rotation was in the previous epoch.

</details>

### Q4 ★ Give every rule a guarantee's credential must satisfy.
<details><summary>Model answer</summary>

Two or three entries, ordered and unique by validator index. For each: index < |k|; the
assignment for that index equals the report's core; the core is active (< |κ'|/3); the
signature verifies under k[index]'s Ed25519 key over `$jam_guarantee` ++ Blake2b(report);
and the guarantee's slot is within the current or previous rotation:
R(⌊τ'/R⌋ − 1) ≤ slot ≤ τ'. Which (c, k) to use is chosen by whether ⌊slot/R⌋ = ⌊τ'/R⌋
(M) or not (M*). Every signer's key enters the reporters set **G** for statistics.

</details>

### Q5 ★ What is the anchor, what is the lookup-anchor, and how is each validated?
<details><summary>Model answer</summary>

The anchor is the recent block the refine was executed against: its header hash, slot,
posterior state root and accumulation-log super-peak must all match one entry of β†
(so it is among the last H = 8 blocks and its details are exactly what the chain recorded).
The lookup-anchor is the older block whose posterior state preimage lookups were served
from: its slot must be at least H_T − L (14 400 full, 24 tiny), a stored ancestor header
must have that slot and hash, and that header's child must carry the matching
prior-state-root. A includes the importing block's own header (eq. ancestors), so a
lookup-anchor equal to the parent is checked against this block's H_R. The lookup check
is the one rule that needs the header store, not
state, which is why implementations keep 24 hours of ancestors.

</details>

### Q6 When does a report become available, and what are the three ways a core is cleared in ρ‡?
<details><summary>Model answer</summary>

Available when strictly more than 2/3 of |κ| assurances in this block set the core's
bit; **R** lists those reports in core order and goes to accumulation. ρ‡ clears a core if
its report is in **R**, or if H_T ≥ its timestamp + 5 (assurance timeout), or if
|κ| ≠ |κ'| (the validator set changed size, so the chunk-per-validator mapping is void;
these count as early timeouts). A timed-out report is simply dropped, without
accumulation, and the core may be re-guaranteed.

</details>

### Q7 What must be true of the assurances extrinsic itself?
<details><summary>Model answer</summary>

Every assurance anchors on H_P, the sequence is strictly ascending by validator index
(so at most one per validator), each index is < |κ|, each signature is by κ[index] over
`$jam_available` ++
Blake2b(E(H_P, bitfield)), and a bit may only be set for a core that has a pending
assignment in ρ†. The bitfield has C bits, ⌈C/8⌉ bytes: 1 at tiny, 43 at full.

</details>

### Q8 Which duplicate and dependency checks apply to an incoming package hash?
<details><summary>Model answer</summary>

It must not appear in the extrinsic twice, in any recent-history entry's reported
packages, in ξ (accumulated within the last epoch), in ω (ready but queued), or in ρ
(pending on a core). Its prerequisites and the keys of its segment-root lookup must be
in this extrinsic or in β, and each lookup entry's segment root must equal the one
recorded for that package (in the extrinsic or β). Loops are permitted here and starve
in the accumulation queue.

</details>

### Q9 What gas rules apply to a report at guarantee time?
<details><summary>Model answer</summary>

Each digest's accumulate gas limit must be at least the service's minimum accumulate gas
(δ[s].minaccgas) and the sum over the report's digests must not exceed
G_A = 10 000 000 (C_reportaccgas). Each limit is in N_G = N_{2^64} (eq. gasregentry) but the
sum is an ordinary natural-number sum: adding in wrapping 64-bit arithmetic would let two
huge limits pass (lasair's 0.8.0 audit fixed exactly that). The refine gas actually used is
recorded in the digest but not bounded here; refinement's own limit G_R (5 × 10⁹ full,
10⁹ tiny) is enforced in-core. Practical consequence (a jamswap measurement, not GP text):
under the 0.8.0 gas model an in-PVM Ed25519 verify costs about 5.29 M gas (1.31 M under
0.7.2), so with a whole report's accumulate budget at 10 M, signature checks belong in
refine.

</details>

### Q10 What are the work-error values and what does each mean?
<details><summary>Model answer</summary>

∞ (out of gas during refine), ☇ (panic), BAD-EXPORTS (the item exported a different
number of segments than declared), OVERSIZE (the output would exceed the report size
limit), BAD (the service's code was not available at the lookup-anchor's posterior
state), BIG (code available but larger than W_C = 4 000 000 octets). An error result still
reaches accumulation as an operand, so a service can react to its own failed items.

</details>

### Q11 Why must the erasure shard count equal the number of validators?
<details><summary>Model answer</summary>

Each validator is sent exactly one chunk of the erasure-coded bundle and exported
segments and assures for that chunk. The erasure root commits to those chunks, so the
count must be |κ'| for the root to be checkable by every assurer. Any 𝒟(v) of the v
chunks reconstruct the data (eq. ecoriginalshards; 𝒟(v) ≤ v/3 + 1, e.g. 342 of 1023, 3 of
6). It is a 0.8.0 addition to the availability spec (GP #514): before it the count was
implicitly the fixed V = 1023. Now that the set size varies, the guarantor chooses v when
it computes the report (guaranteeing.tex), and the chain rejects any v ≠ |κ'|.

</details>

### Q12 What does ρ' look like after guarantees, and why are cores ≥ |κ'|/3 always empty?
<details><summary>Model answer</summary>

ρ' equals ρ‡ except that every core with a guarantee in E_G holds (that guarantee, τ').
The stored slot is what the timeout later compares against. Cores beyond |κ'|/3 have no
assigned guarantors, so no valid guarantee can name them and they stay ∅; the Graypaper
notes this bounds the audit load to what the active validators can handle.

</details>

### Q13 Describe what changed in this chapter in 0.8.0 and how lasair's migration handles it.
<details><summary>Model answer</summary>

Availability assignments store the full guarantee plus registered slot (#494, new key
0x0A layout); the refinement context carries the anchor slot and the lookup-anchor
state root, and recent-history entries carry a slot (#526), with corresponding new checks
against β† and the ancestor chain. The variable validator set (#514) brings the erasure
shard count (must equal |κ'|), the ⌊i/3⌋ guarantor assignment over |κ'| with only |κ'|/3
active cores, assurer indices and the supermajority measured against |κ|, and a new
clear-all on |κ| ≠ |κ'|. lasair's `docs/GP_0_8_0_PLAN.md` lands the wire changes in
Phase 1 (codec: `lib/serialization.ml`, `conformance/block_codec.ml` and the STF codecs)
and the rules in Phase 3 (`conformance/reports_stf.ml`, `assurances_stf.ml`), gated on the
new full vectors such as `report_with_shrunken_val_set`. The vectors were not enough: the
Phase 5 and pre-release audits found the import path using spec V for the threshold, never
clearing ρ on a resize, validating against the pre-disputes state, and missing the
authorizer-pool,
segment-root-value, J/I/W_R and lookup-anchor slot and child-root checks
(`docs/GP_0_8_0_PLAN.md` ledger; `docs/TINY_TO_FULL_AUDIT.md`, fourth sweep).

</details>

### Q14 A guarantee arrives at slot τ' = 47 (full, R = 10) with slot 39. Which assignments apply?
<details><summary>Model answer</summary>

⌊47/10⌋ = 4 and ⌊39/10⌋ = 3, so the guarantee is from the previous rotation and M*
applies; the lower bound 10·(4−1) = 30 ≤ 39 ≤ 47 holds. M* is P(|k|, e, τ' − R) with
τ' − R = 37: since ⌊37/600⌋ = ⌊47/600⌋ the same epoch applies, so (k, e) = (κ', η₂') and
the rotation index is ⌊37/10⌋ = 3. A guarantee with slot 29 would be rejected (29 < 30).
The epoch-crossing case at tiny (E = 12, R = 4): τ' = 13, guarantee slot 10. ⌊13/4⌋ = 3
and ⌊10/4⌋ = 2, so M* applies and the bound 4·(3−1) = 8 ≤ 10 holds; but τ' − R = 9 and
⌊9/12⌋ = 0 ≠ ⌊13/12⌋ = 1, so the previous rotation was in the previous epoch and M* is
built from (λ', η₃') with rotation index ⌊(9 mod 12)/4⌋ = 2. (Worked example, not GP
text; the rules are eq. priorassignments and eq. guarantorsig.)

</details>

### Q15 At an epoch boundary the active set shrinks from 1023 to 6 validators. What happens to pending and new reports?
<details><summary>Model answer</summary>

Assurances in that block are still signed by, and counted against, the prior κ (1023), so
any core with more than 682 set bits becomes available and goes to **R**. Then, because
|κ| ≠ |κ'|, ρ‡ clears every other assignment; the Graypaper calls these early timeouts.
Their chunks were cut one per validator of the old set (eq. avspec text: the chunk count
must equal the assuring set's size). For new guarantees only the first |κ'|/3 = 2 cores are
active, M shuffles ⌊i/3⌋ over the 6 new validators, and every report's erasure shard count
must be 6. A guarantee whose slot is in the previous rotation, here also the previous
epoch, is checked against M* built from λ' (the old 1023) and η₃', so its signer indices
can be large; its core must still be < 2 and its shard count still 6 (vectors
`val_set_size_change_clears_pending_reports`, `inactive_core_index-1/-2`). The new size must
be in 𝕍 = {6, 9, …, 1023} (eq. valcount), which keeps |κ'|/3 a whole number of cores with
three guarantors each. (eq. availassignmentspostassurancesdef, eq. priorassignments,
eq. guarantorsig.)

</details>
