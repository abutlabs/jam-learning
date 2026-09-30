---
title: "Ch. 13 Statistics"
duration: 30 min
exam_portion: random
exam_bucket: small
gp_chapter: 13
gp_words: 840
gp_tex: text/statistics.tex
lasair: lib/statistics.ml, conformance/statistics_stf.ml, conformance/stf_statistics.ml
---

# Ch. 13 Statistics

<span class="lecture-badge">M1 Understanding · Graypaper ch. 13</span>

JAM pays no rewards itself; it leaves that to a staking system hosted as a service. What
the chain does is keep the books: per-epoch counters for each validator, and per-block
counters for each core and each service, so an off-chain or in-service reward logic can
act on them. Small chapter, but it is the last transition in the dependency graph and
reads intermediates from nearly every other chapter, which makes it a good test of
whether you know where reports, assurances and preimages come from.

## Chapter sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| π = (π_V, π_L, π_C, π_S) | activity | validator accumulator, validator previous-epoch, core stats, service stats (eq. activityspec) |
| π_V, π_L | validator records | one record per validator: blocks **b**, tickets **t**, preimage count **p**, preimage octets **d**, guarantees **g**, assurances **a**; |π_V| = |κ|, |π_L| = |λ| |
| π_C ∈ ⟦…⟧_C | core records | per core, per block: DA load **d**, popularity **p**, imports **i**, extrinsic count **x**, extrinsic size **z**, exports **e**, bundle length **l**, gas used **u** |
| π_S ∈ 𝔻⟨service → …⟩ | service records | per service, per block: provision (count, octets), refinement (count, gas), imports, extrinsic count, extrinsic size, exports, accumulation (count, transfers, gas) |

### Inputs
Four of the five extrinsics (E_T, E_P, E_A, E_G; not E_D), the header (H_I, H_T) and the
prior τ, κ and κ', the Reporters set **G** from guarantees (ch. 11, eq:guarantorsig), the
incoming reports I (eq:incomingworkreports) and the newly available reports **R** (ch. 11,
eq:availableworkreports), and the accumulation statistics **S** from ch. 12.

### The transition in plain English
1. **Assurances first, against the old set.** For each index v in κ, add 1 to a if
   validator v signed an assurance in this block. This gives π_V†.
2. **Rotate on an epoch change.** If e' ≠ e, the accumulator becomes π_L' and a fresh
   zeroed accumulator (π_V‡) starts; otherwise π_V‡ = π_V†.
3. **Everything else, against the new set.** For each v in κ': b += 1 if v = H_I;
   if v is the author, t += |E_T|, p += |E_P|, d += Σ|preimage data|; g += 1 if κ'[v]'s
   Ed25519 key is in the Reporters set **G** (the term (κ'_v ∈ **G**) is 0 or 1, so at most
   +1 per block).
4. **Cores, per block, replaced not accumulated.** For each core c: sum over the digests
   of incoming reports on c their imports, extrinsic count and size, exports and gas
   (R(c)); bundle length L(c) sums the availability spec's bundle length of incoming
   reports; DA load D(c) sums, over reports that *became available* on c, bundle length
   plus segment size × ⌈segment count × 65/64⌉; popularity is the number of assurers
   whose bitfield has bit c set.
5. **Services, per block, replaced not accumulated.** For each service that was
   reported, provided for, or accumulated: imports/extrinsics/exports/gas from its
   digests (R(s)), refinement = (number of digests, gas), provision = Σ over E_P items
   for s of (1, |data|), accumulation = the ch. 12 statistics for s or (0, 0, 0).

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| |π_V| = |κ| and |π_L| = |λ| | validator sets of different sizes across epochs (0.8.0 resizable sets) leaving stale or missing records |
| assurances credited before rotation, everything else after | an epoch-boundary block mis-crediting: assurances in that block were signed by the *old* set's indices, while the author, tickets and guarantees belong to the new |
| author-only counters keyed on H_I | any validator being credited with tickets or preimages they did not carry |
| g uses the Reporters set **G** (Ed25519 keys of this block's credential signers), matched by key against κ' | crediting by credential index: that index points into the key list of the assignment the guarantee was made under (Φ(κ') in M; in M*, Φ(λ') when the previous rotation fell in the previous epoch, eq:priorassignments), which need not line up with κ'; and multiple credit, since (κ'_v ∈ **G**) adds at most 1 per block |
| core and service records rebuilt from this block's intermediates only | double counting across blocks; these are snapshots, not sums |
| popularity = Σ over assurances of bit c | nothing subtle in the spec; but at full spec the bitfield is 43 bytes and c ranges to 340 (F6) |

### Edge cases
- **Empty block.** Author gets b += 1; all other validator deltas zero. π_C is all zeros:
  no E_G means R(c) and L(c) are zero, and no E_A means nothing became available
  (D(c) = 0) and popularity is 0. π_S can still be non-empty, but only through the
  accumulation statistics **S**: always-accumulate services, destinations of transfers
  deferred during that accumulation, and the services of any ready-queue (ω) report whose
  dependencies are already met (R* = R! ⌢ Q(q) draws on ω even when **R** is empty).
- **Epoch boundary.** π_L' = π_V† (with this block's assurances), π_V' starts from zero
  and receives this block's block, ticket, preimage and guarantee credits.
- **A service that only received a preimage.** Present in π_S with provision set and
  refinement (0, 0).
- **Accumulation statistics for a service with no digests.** Always-accumulate services
  and transfer-only destinations appear via keys of the ch. 12 statistics **S** with
  accumulation (0, T, G) (N counts only digests) and zeros elsewhere. **S** has an entry
  only when (N, T, G) ≠ (0, 0, 0) (eq:accumulationstatisticsdef).
- **Tiny vs full.** Validator record is 6 counters; 6 validators vs up to 1023 (0.8.0 has
  no constant V: a set is any multiple of 3 from 6 to 3C, eq:valcount); cores 2 vs 341;
  the state value for π grows from a few hundred bytes to tens of kilobytes.

### War story
<div class="lasair-connection">

**F6: the popularity that only counted eight cores.** Core popularity is
Σ_{a ∈ E_A} a.availabilities[c]. lasair's baseline-format statistics writer read only
byte 0 of each assurance bitfield, so cores 0–7 were counted and cores 8–340 were zeroed
at full spec (2 cores tiny, invisible). Found on the first full-spec L2b fuzzer session
(seed 3571347957, the same session that exposed the disputes stub) and fixed in v1.4.2,
after which M1 passed. Its twin in the same audit: `stats_total_size` computed as
"… × 2 + 17", where 17 is the *tiny* C·8 + 1. The audit generalised both into a lens,
"a width that is a value, not a function of the active spec", and swept the target path
(`docs/TINY_TO_FULL_AUDIT.md`: F7 recent-history count as u8, F8/F9 supermajority literal
5, F10/F11 ticket bounds 3). Recorded in `docs/LOCAL_L2B_FUZZER.md`
and the in-code comment on the popularity decode in `conformance/stf_guarantees.ml`
("(F6)"). The GP 0.8.0 Phase 3 rewrite retired `stats_total_size`: every offset in π is
now read from the blob (`Stf_config.stats_layout`), never from the spec.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **Validator records are unsized sequences** with |π_V| = |κ| and |π_L| = |λ| stated as
  constraints, instead of ⟦…⟧_V fixed arrays (part of GP #514, smaller validator sets; the
  L0 lint can no longer treat V as a codec width).
- **Update restructured into π_V† → π_V‡ → π_V'** (#514). Assurances are now credited
  *before* the epoch rotation over ℕ_{|κ|}; blocks, tickets, preimages and guarantees after
  it over ℕ_{|κ'|}. In 0.7.2 all six counters were applied after rotation in one block.
- **Service accumulation statistic gains a third field:** (count, **transfer count**, gas)
  with default (0, 0, 0) (GP #502). **S** now holds an entry only when (N, T, G) ≠ (0, 0, 0)
  (0.7.2: G + N ≠ 0), eq:accumulationstatisticsdef. The full-spec statistics vectors were
  regenerated.
- **C(13) encoding (merklization.tex):** each validator section is now length-prefixed,
  ↕[E_4(v) | v ∈ π_V] then the same for π_L. 0.7.2 wrote E_4(π_V, π_L) as two fixed
  V-length arrays with no prefix. Each record is still six 4-byte integers.

</div>

### Source pointers
- `lib/statistics.ml` — `record_block`, `record_tickets`, `record_preimages`,
  `record_guarantee`, `record_assurance`, `rotate_epoch`, `calculate_da_load`,
  `update_core_stats`, `update_service_stats`
- `conformance/statistics_stf.ml` — `apply_statistics_stf` (vector-tested)
- `conformance/stf_statistics.ml` — `update_statistics`, `update_ticket_stats`,
  `update_preimage_stats`, `update_assurance_stats`, `update_guarantee_stats` (the
  import-path writer; offsets from `Stf_config.stats_layout`, the cores ++ services tail
  rebuilt by `Stf_guarantees.process_guarantees`)
- `docs/notes/statistics.md`; lecture `011-graypaper-lectures/36-statistics`

## Question bank

### Q1 ★ What are the four components of π and what does each hold?
<details><summary>Model answer</summary>

π_V, the current-epoch validator accumulator: per validator, counts of blocks authored,
tickets introduced, preimages introduced and their total octets, reports guaranteed and
assurances made. π_L, the same record completed for the previous epoch. π_C, per core
and per block: DA load, popularity, imports, extrinsic count and size, exports, bundle
length, gas used. π_S, per service and per block: provision (count, octets), refinement
(count, gas), imports, extrinsic count and size, exports, accumulation (count, transfers,
gas). Validator records accumulate over an epoch; core and service records are rebuilt
every block.

</details>

### Q2 ★ Why does JAM keep statistics at all if it pays no rewards?
<details><summary>Model answer</summary>

Rewards and punishments are the job of a staking system hosted as a service (in
Polkadot's design a fee-less system chain). The chain can objectively observe block
production, tickets, preimages, guarantees and assurances, so it records them for that
system to read. Grandpa, Beefy and auditing effort cannot be observed on-chain, so the
paper proposes validators vote on each other's effort and a median is taken, under a 50%
honesty assumption.

</details>

### Q3 ★ Walk through the validator update on an epoch-boundary block, in order.
<details><summary>Model answer</summary>

First π_V†: for each index in the *old* active set κ, add one to assurances if that
validator assured in this block. Then because e' ≠ e, π_L' = π_V† and the accumulator
resets to zeros. Then over the *new* set κ': the author gets a block, and if author, the
number of tickets, the number of preimages and their octets; every validator whose key is
in the reporters set gets a guarantee. So on a boundary block the assurances land in the
closed epoch's record and everything else opens the new one. In 0.7.2 all six were
applied after rotation.

</details>

### Q4 Define R(c), L(c) and D(c) for core statistics.
<details><summary>Model answer</summary>

R(c) sums, over every digest of every incoming report (this block's guarantees) on core
c, the digest's import count, extrinsic count, extrinsic size, export count and gas
used. L(c) sums the bundle length from the availability spec of each incoming report on c.
D(c), the DA load, sums over reports that *became available* this block on c their
bundle length plus the segment size (4104 octets) times ⌈segment count × 65/64⌉, the
65/64 accounting for the paged-proofs: one extra segment (a page of 64 segment hashes plus
a subtree proof) per 64 exported segments, stored in the D³L with them (eq:pagedproofs).
Popularity is separate: the count of assurances in the block with bit c set. The two
meet: a bit may only be set on a core with an assignment in ρ†, and that report became
available exactly when its popularity exceeds ⅔|κ| (|κ| is the pre-rotation set the
assurers index into and a multiple of 3, so at least 2|κ|/3 + 1 assurers,
eq:availableworkreports); only then does it count toward D(c).

</details>

### Q5 Which services get a record in π_S this block, and where does each field come from?
<details><summary>Model answer</summary>

The union of services with a digest in an incoming report, services that received a
preimage in E_P, and services with an entry in the accumulation statistics from ch. 12.
Imports, extrinsic count/size, exports and refinement gas come from summing that
service's digests; refinement count is the number of digests; provision is (number of
preimages, total octets) for that service in E_P; accumulation is the ch. 12 triple or
(0, 0, 0).

</details>

### Q6 What is the reporters set and why is it used for the guarantee counter?
<details><summary>Model answer</summary>

The Reporters set **G** is defined in ch. 11 (eq:guarantorsig): the Ed25519 key of every
validator whose signature is in a credential of this block's guarantees. It is not a
filter: a block carrying an invalid guarantee is invalid as a whole. It is keyed because a
credential's index points into the key list of the assignment the guarantee was made
under: M (keys Φ(κ'), offenders nulled) for the current rotation, or M* for the previous
one, whose keys are Φ(λ') when that rotation fell in the previous epoch
(eq:priorassignments). Matching κ'[v]'s key against **G** credits the right validator
across that boundary, and a guarantor no longer in κ' gets nothing. The term
(κ'_v ∈ **G**) is 0 or 1, so g rises by at most 1 per block however many credentials
carry the key.

</details>

### Q7 What does the 0.8.0 accumulation triple contain?
<details><summary>Model answer</summary>

(N, T, G) for the service this block, supplied by the accumulation step
(eq:accumulationstatisticsdef): N is the number of its work-digests (work-items) in the
reports accumulated, T the number of processed deferred transfers whose destination it
is, G the gas it used across accumulation. **S** holds an entry only when the triple is
not (0, 0, 0), so a service that only received transfers still gets one; for a service in
π_S but not in **S**, the accumulation field defaults to (0, 0, 0). The transfer count
comes back in 0.8.0 (GP #502, "Add back processed transfer count"); 0.7.2 had a pair.
In lasair, Phase 3 wrote T as 0 and Phase 4 wired the real count, which also gave
transfer-only destinations their statistics entry and lastacc update
(`docs/GP_0_8_0_PLAN.md` ledger).

</details>

### Q8 Why did lasair's popularity bug not show at tiny spec?
<details><summary>Model answer</summary>

Tiny has 2 cores, so an assurance bitfield is one byte and reading only byte 0 is
complete. Full has 341 cores, a 43-byte bitfield, and reading byte 0 zeroes cores 8–340.
Every value that scales with V, C or E is a candidate for this class: the audit found
five more live ones, F7–F11 (recent-history count as u8, the 2/3 supermajority literal 5,
ticket bounds 3), by treating each fixed literal as suspect until traced to the active
spec (`docs/TINY_TO_FULL_AUDIT.md`).

</details>

### Q9 How large is the π state value, and how is it laid out?
<details><summary>Model answer</summary>

In the canonical JAM codec (merklization.tex, C(13)): the two validator sequences, each
length-prefixed in 0.8.0 (↕, length |κ| then |λ|), every record its six counters as fixed
4-byte little-endian integers (E_4, 24 bytes per validator); then C core records of eight
naturals in the general (compact) natural encoding; then the service dictionary
(length-prefixed pairs ordered by service id). In 0.7.2 the validator sections were
fixed V-length arrays with no prefix. lasair's import-path writer
(`conformance/stf_statistics.ml`) bumps the 24-byte records in place, reads every offset
from the blob (`Stf_config.stats_layout`: count, records, count, records, tail), and
starts each block from a baseline tail of C·8+1 zero bytes (every core field compact 0,
empty service dictionary) that `process_guarantees` rebuilds. At tiny the baseline value
is 1 + 144 + 1 + 144 + 17 = 307 bytes (305 in 0.7.2, without the prefixes); at full it is
tens of kilobytes, rewritten every block.

</details>
