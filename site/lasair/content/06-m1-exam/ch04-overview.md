---
title: "Ch. 4 Overview"
duration: 60 min
exam_portion: random
exam_bucket: large
gp_chapter: 4
gp_words: 4011
gp_tex: text/overview.tex
lasair: lib/overview.ml, lib/stf.ml, conformance/stf_transitions.ml, conformance/trace_runner.ml
---

# Ch. 4 Overview

<span class="lecture-badge">M1 Understanding · Graypaper ch. 4 · see also C · Architecture</span>

The Overview is the chapter that defines what a JAM node *is*: a genesis state plus a
block-level state-transition function, with the state cut into seventeen segments and the
block into a header plus five extrinsics. Everything else in chapters 5–13 is a
definition of one arrow in this chapter's dependency graph. Understanding this chapter
means being able to draw that graph on a whiteboard and narrate every arrow.

## Examiner sheet

### State touched
All of it. The state σ is the tuple (eq. statecomposition, 0.8.0):

| Symbol | Name | What it holds | Chapter |
|---|---|---|---|
| α | authorizer pool | per core, the up-to-8 authorizer hashes work may currently use | 8 |
| β | recent history | last 8 blocks: header hash, state root, accumulation-log peak, slot, reported packages; plus the accumulation-output belt | 7 |
| θ | last accumulation output | this block's sequence of (service, hash) accumulation outputs | 12 |
| γ | Safrole state | pending validator keys, ring root, slot-sealer sequence, ticket accumulator | 6 |
| δ | service accounts | every service: balance, code hash, storage, preimages, gas limits | 9 |
| η | entropy | four entropy accumulators (current + three epochs back) | 6 |
| ι | staging validator set | keys queued to become the pending set γ_P at the next epoch change (active one epoch later) | 6 |
| κ | active validator set | keys authoring and guaranteeing now | 6 |
| λ | previous validator set | last epoch's keys, still needed to verify recent signatures | 6 |
| ρ | availability assignments | per core, the work-report guarantee awaiting availability, if any | 11 |
| τ | timeslot | the most recent block's slot | 5 |
| φ | authorizer queue | per core, 80 slots of upcoming authorizers, indexed by slot | 8 |
| χ | privileges | manager service, delegator (validator designator), registrar (service-id allocation; present since 0.7.x), per-core assigners, always-accumulate set | 9 |
| ψ | disputes | good / bad / wonky report hashes and the offender key set | 10 |
| π | activity statistics | per-validator, per-core and per-service counters | 13 |
| ω | ready queue | reports available but waiting on dependencies, by slot | 12 |
| ξ | accumulated | recently accumulated package hashes, by slot | 12 |

### Inputs
The block B = (H, E). The header H is "known a priori" and readable by every transition.
The extrinsic E = (E_T tickets, E_D disputes, E_P preimages, E_A assurances, E_G guarantees).
Note the order in the tuple: tickets, disputes, preimages, assurances, guarantees. That
is *not* the serialization order: a block serializes as E(H, E_T, E_P, E_G, E_A, E_D)
(tickets, preimages, guarantees, assurances, disputes; serialization appendix), and the
header's extrinsic hash commits to the five parts in that same serialized order.

### The transition in plain English
1. The slot τ' comes straight from the header.
2. β† patches the last recent-history entry with the parent's true state root, which the
   header carries as the *prior* state root.
3. Disputes are judged first: ψ' from E_D, and ρ† clears any core whose pending report was
   just found bad or wonky.
4. Assurances are counted against ρ†: reports reaching a supermajority (more than ⅔|κ|
   assurers) become available (the set **R**; accumulation later forms R* from it), and ρ‡
   clears their cores (also clearing timed-out ones and, new in 0.8.0, *every* core when the
   active set changes size, |κ| ≠ |κ'|; eq. availassignmentspostassurancesdef).
5. New guarantees fill ρ' from E_G, checked against the active set κ and the new slot. A
   guarantee may only land on a core that ρ‡ left empty, and its report's authorizer must be
   in that core's pool α[c] (eq. reportcoresareunused).
6. Safrole runs: η' from the header's VRF output, κ'/λ' rotate at an epoch boundary,
   γ' consumes E_T tickets, and the epoch/winners markers are validated.
7. Accumulation takes **R** plus the ready queue ω (together they form R*, the accumulatable sequence) and produces δ‡, χ', ι', φ', θ', ξ', ω' and
   the accumulation statistics, within the block gas limit.
8. β' appends this block: header hash, zero state root, the belt peak, the slot, and the
   package hashes from E_G.
9. Preimages E_P are integrated into δ' last, using the new slot.
10. α' pulls one authorizer per core from φ' at index H_T and drops the one each core's
    guarantee just used.
11. π' tallies everything the block did.

The Graypaper states this as a dependency graph, not a sequence. Any order consistent
with the graph is valid, and the daggers mark the only places where two consumers must
see the same intermediate value.

### The dependency graph (eq. transitionfunctioncomposition)
```
τ'   ≺ H
β_H† ≺ (H, β_H)
γ'   ≺ (H, τ, E_T, γ, ι, η', κ', ψ')
η'   ≺ (H, τ, η)
κ'   ≺ (H, τ, κ, γ)
λ'   ≺ (H, τ, λ, κ)
ψ'   ≺ (E_D, ψ)
ρ†   ≺ (E_D, ρ)
ρ‡   ≺ (E_A, ρ†)
ρ'   ≺ (E_G, ρ‡, κ, τ')
R*   ≺ (E_A, ρ†)
(ω', ξ', δ‡, χ', ι', φ', θ', accumulation stats) ≺ (R*, ω, ξ, δ, χ, ι, φ, τ, τ')
β_H' ≺ (H, E_G, β_H†, θ')
δ'   ≺ (E_P, δ‡, τ')
α'   ≺ (H, E_G, φ', α)
π'   ≺ (E_G, E_P, E_A, E_T, τ, κ', π, H, accumulation stats)
```
Read it as: "the thing on the left can be computed from the things on the right."
β_H is the recent-history half of β = (β_H, β_B) (eq. recentspec); the steps above write
β†/β' for short. The ρ‡ line lists only (E_A, ρ†), but its defining equation also reads
H_T (timeout) and, from 0.8.0, |κ| and |κ'| (resize clearing; eq.
availassignmentspostassurancesdef).
Two arrows matter most: ρ† needs *disputes before assurances* (a report just
judged bad must not become available), and δ' needs *accumulation before preimages*
(preimage integration sees the post-transfer accounts).

### Validation rules and what they guard
This chapter states few rules directly; it delegates. The ones it does state:

| Rule | Guards against |
|---|---|
| A block is a valid (σ, B) → σ' only if every chapter's checks pass; the state root must match the next header | any divergence between implementations |
| Blocks with a future slot are temporarily invalid | clock-skew attacks; blocks become valid as wall time advances |
| An extension containing a report that any other block's state has judged invalid must be reverted and never finalized | the disputes system having teeth |

### Key concepts to be able to explain
- **In-core vs on-chain.** Refinement runs in-core on a subset of validators (the
  guarantors) and is stateless: it needs only the service's refine code, the authorizer
  code and preimage lookups. Accumulation runs on-chain, by everyone, and is stateful.
  Security parity comes from guaranteeing (economic cost), assuring (availability),
  auditing and judging.
- **Lifecycle.** work-package → refine → work-report (carrying work-results/digests) →
  guarantee (E_G) → assure (E_A) → available (**R**) → accumulate (R*) → θ' / β'.
- **Coretime, not transactions.** No transactor. Coretime is prepurchased and assigned to
  an authorization agent (ch. 8), which is how external input enters a service.
- **Time.** JAM Common Era starts 1200 UTC 1 Jan 2025 (Unix 1 735 732 800). Slot = 6 s.
  Epoch = 600 slots = 1 hour (tiny: 12 slots). Timeslot is a 32-bit natural.
- **Forks.** Safrole minimises them; Grandpa finalises; both help resolve two heads.
- **PVM in one breath.** RISC-V RV64EM, 13 64-bit registers, 4 KiB pages with W/R/none
  access, gas is a 64-bit natural. Ψ returns halt, panic, out-of-gas, page-fault(address)
  or host-call(index). In 0.8.0 gas is charged per *basic block*, in advance, at a cost
  computed by a simplified CPU-microarchitecture model (sec. gascostmodel, eq.
  gascostforblock), not the 0.7.2 flat one unit per instruction.
- **Economics.** Balance is a 64-bit natural; denomination 10⁹; three deposit prices
  (base, per item, per byte) define a service's threshold balance.

### Edge cases
- **Empty extrinsic.** τ', η', β†/β', α' (queue index advances), π' still change; κ'/λ'/γ'
  change only at an epoch boundary; ρ‡ can still clear timed-out cores because the
  timeout is slot-driven.
- **First block of an epoch.** κ' ← γ_P, λ' ← κ, ι' may have been set by
  accumulation, η rotates, the header must carry an epoch marker, γ's slot-sealer
  sequence is fixed from the ticket accumulator (or falls back). From 0.8.0 the set size
  can change (any multiple of 3 from 6 to 3C, eq. valcount): if |κ'| ≠ |κ|, every
  availability assignment is cleared, and only the first |κ'|/3 cores are active.
- **Genesis.** σ⁰ and H⁰ are assumed agreed; the parent of the genesis header is not
  defined, so every "parent" rule starts at block 1.

### War story
<div class="lasair-connection">

**The whole-graph lesson: the seed campaign.** STF vectors test one arrow of the graph
at a time, and lasair had all nine families green by 2026-06-10. Replaying the 205
fuzz-report seeds through full block import then produced 210 failures, because the
graph's *joins* had never been exercised: guarantor assignments, epoch and winners
markers, ticket validity, assurance counting, preimage integration and validator
rotation. A block-validation campaign took that to 38, and the largest remaining class
was accumulation's dependency layering, where a panicking layer must revert only itself
(no_forks step 46 and ~22 seeds). Lesson: passing every STF is necessary, not
sufficient; the dependency graph is the specification of a block. Recorded in
`docs/M1_PLAN.md` (Phase 1 to 3) and `docs/CONFORMANCE_RETROSPECTIVE.md`.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- ρ was renamed from "reports" to **availability assignments** (`\availassignments`); the
  daggers ρ†/ρ‡ are now "post-judgment" and "post-assurances". Clearer name and more
  data: each entry now holds the full guarantee (report, guarantee slot and credentials)
  plus the registered slot, where 0.7.2 held only the report plus slot (ch. 11, eq.
  reportingstate). Its serialized value at state key C(10) changed to match (merklization
  appendix).
- The PVM invocation Ψ gained a **Boolean** argument and result: the gas-charged flag,
  which records whether the current basic block's cost has already been paid, because
  0.8.0 charges gas per basic block, in advance (see the PVM sheet). Ψ's gas *result*
  changed from signed `\signedgas` to unsigned `\gas` (the argument was already unsigned):
  the machine now stops with out-of-gas *before* a block it cannot afford, gas unchanged,
  instead of going negative. Signed gas survives only inside the PVM definitions (e.g.
  host-call results).
- Everything else in `overview.tex` is unchanged in substance. Deltas from other chapters
  that surface in this lesson: the validator-set size is no longer the constant V = 1023
  but any multiple of 3 from 6 to 3C (eq. valcount), so ρ‡ clears every core when
  |κ| ≠ |κ'| and only the first |κ'|/3 cores are active (ch. 11); ticket entries per
  validator are ⌈2E/|γ_P'|⌉ instead of a constant N (eq. ticketsextrinsic); each β_H entry
  gained a timeslot t (eq. recenthistoryspec); the extrinsic hash commits to preimages as
  (service id, data hash) pairs; and the `sbrk` instruction is gone, replaced by the
  `grow_heap` host call (id 1).

</div>

### Source pointers
- `lib/overview.ml` — the state record and extrinsic types, one field per Greek letter
- `lib/stf.ml` — `transition`: the teaching-order block transition
- `conformance/stf_transitions.ml`, `conformance/trace_runner.ml` — the vector-tested
  full block import with the daggers as named values
- `docs/notes/overview.md` — original study notes; `011-graypaper-lectures/16…21` — lectures

## Question bank

### Q1 ★ Write the block-level state transition in one line and say what each symbol means. What two things fully define a blockchain under this view, and what extra assumptions does JAM make?
<details><summary>Model answer</summary>

σ' ≡ Υ(σ, B): the posterior state is the transition function applied to the prior state
and a block. A blockchain is fully defined by Υ and a genesis state σ⁰. JAM adds two
assumptions the Yellow Paper left silent: a universally known clock, and a practical
means of sharing data among nodes under the same consensus rules. Honesty assumptions
about some fraction of participants are stated separately from the transition rules.

</details>

### Q2 ★ A block is a header plus an extrinsic. Name the five extrinsic components, what each carries, and which chapter consumes it.
<details><summary>Model answer</summary>

In tuple order: **tickets** E_T (Safrole ring-VRF tickets bidding for future sealing
slots; ch. 6), **disputes** E_D (verdicts, culprits and faults about report validity;
ch. 10), **preimages** E_P (data being made available for services to look up; ch. 9,
integrated in ch. 12's preimage-integration step), **assurances** E_A (each validator's
bitfield of which pending packages it holds; ch. 11), **guarantees** E_G (new work-reports
signed by their guarantors; ch. 11). The header carries no extrinsic data, only
commitments to it (the extrinsic hash) and consensus metadata. From 0.8.0 the extrinsic
hash commits to E_P as (service id, hash of the data) pairs, so individual preimages, like
reports, can have their inclusion proven (header chapter, H_X).

</details>

### Q3 ★ Name the seventeen state segments with their letters and purposes.
<details><summary>Model answer</summary>

α authorizer pool · β recent history (+ the accumulation-output belt) · θ this block's
accumulation outputs · γ Safrole state · δ service accounts · η entropy · ι staging
validators · κ active validators · λ previous validators · ρ availability assignments
(one pending guarantee per core) · τ timeslot · φ authorizer queue · χ privileges ·
ψ disputes · π activity statistics · ω ready-but-blocked reports · ξ recently accumulated
package hashes. Byte-exactness bit lasair hardest in π (statistics widths at full spec)
and ρ/ψ (the disputes-driven clearing was a coverage blind spot). See the war-stories page.

</details>

### Q4 ★ Draw the dependency graph. Which posterior components depend only on the header? Which need disputes before assurances, and why can preimages be integrated last?
<details><summary>Model answer</summary>

Only τ' depends on the header alone (β† needs β too). ρ† ≺ (E_D, ρ) must precede
ρ‡ ≺ (E_A, ρ†): a report judged bad in this block's disputes must be cleared from its
core before assurances are counted, otherwise a just-condemned report could become
"available" and be accumulated. Preimages come last because δ' ≺ (E_P, δ‡, τ') where δ‡
is the post-accumulation, post-transfer account state: the Graypaper says explicitly that
assurances can be fully processed and accumulation can run before the preimage extrinsic
is folded in. Practically it means an implementation can pipeline: verify E_A and run
accumulation while E_P is still being validated.

</details>

### Q5 What do the dagger intermediates β†, ρ†, ρ‡ represent, and why do they exist?
<details><summary>Model answer</summary>

Together with δ‡ (the post-accumulation accounts that preimage integration consumes), they
are the daggered intermediates through which the Graypaper says the graph's only
synchronous entanglements are visible (paragraph after eq. transitionfunctioncomposition).
Each sits between two stages, so it must be named to make the graph unambiguous. β† is β with
the parent's real state root written into the newest entry (the header's prior-state-root
is the first time that root is known). ρ† is ρ with cores cleared whose report was just
judged bad or wonky. ρ‡ is ρ† with cores cleared whose report just became available or
timed out (and, from 0.8.0, with every core cleared when the active set changes size,
|κ| ≠ |κ'|; eq. availassignmentspostassurancesdef). R, the newly available reports, is
derived from the same inputs as ρ‡ (the graph writes R*, the accumulatable sequence built
from R) and feeds accumulation.

</details>

### Q6 What is the difference between ι, κ and λ? When does each rotate and what drives it?
<details><summary>Model answer</summary>

κ is the active set: its Bandersnatch keys seal blocks and its Ed25519 keys sign
guarantees, assurances and judgments this epoch. λ is last epoch's active set. It is still used after the rotation: judgments about the
previous epoch are checked against it (disputes key set K(a)), and guarantees made under
the previous rotation, when that rotation fell in the previous epoch, are checked against
λ′ (eq. priorassignments).
ι is staging: the keys that become the pending set γ_P at the next epoch change, and so
active one epoch after that, written by the privileged validator-designator
service during accumulation. Rotation happens on the first block of a new epoch
(the epoch index of H_T exceeds that of τ): λ' ← κ, κ' ← γ_P (the pending set Safrole
queued last epoch), γ_P' ← Φ(ι), where Φ replaces any incoming key whose Ed25519 key is
in the posterior offender set ψ_O' with an all-zero key (eq. blacklistfilter). The
nulling happens on the way in from ι, not on the way from γ_P to κ.

</details>

### Q7 Explain in-core versus on-chain computation. Which extrinsic carries the result of in-core work, and where does on-chain work get its input?
<details><summary>Model answer</summary>

In-core: only the core's guarantors execute a work-package's refine code and the
authorizer, statelessly, needing just the refine code, authorizer code and any preimage
lookups. The result is a work-report carried on-chain by the guarantees extrinsic E_G,
signed by two or three guarantors who stake their reputation on it. On-chain: every node
runs accumulation, which is stateful (balances, storage, transfers, privileges). Its input
is the set of reports that have become *available* (a supermajority of validators
assured they hold the package's erasure-coded data), pulled from R* and the ready queue.
Guaranteeing, assuring, auditing and judging make in-core results as trustworthy as
on-chain ones.

</details>

### Q8 Put work-package, work-item, work-report, work-result and work-digest in the order they are produced.
<details><summary>Model answer</summary>

A work-package (authorization token, context, and up to 16 work-items each naming a
service and its refine payload) is built off-chain and sent to a core's guarantors.
Refinement of each work-item yields a work-result (the Graypaper has called the on-chain
summary a work-digest since 0.6.5: service, code hash, payload hash, accumulate gas limit,
output-or-error, then the refine-load counters: gas used, imports, extrinsic count and size,
exports; eq. workdigest).
The guarantors assemble the digests with the package's availability spec and refinement
context into a work-report, sign it, and it enters the chain in E_G. After availability,
accumulation consumes the digests.

</details>

### Q9 Why does JAM strive to minimise forks, and what three properties does it try to ensure?
<details><summary>Model answer</summary>

Two heads mean two states and no single canonical answer to "what does the chain say".
The three goals: forks should rarely form; when they do they should resolve quickly; and
a block not far behind the head should be identifiable as finalized, in perpetuity.
Safrole delivers the first (tickets fix one author per slot, anonymously, ahead of time),
Grandpa the third, and both the second. A deliberate fork is required when a chain
contains a report that any block's state has judged invalid; Grandpa must not finalize it.

</details>

### Q10 Explain balance, gas, signed gas and register widths.
<details><summary>Model answer</summary>

Balance is a natural below 2⁶⁴, so at most ~18×10⁹ tokens of 10⁹ base units. Gas is
also a 64-bit natural, a count of approximately time-proportional steps. In 0.8.0 Ψ both
takes and returns unsigned gas: each basic block's cost is charged in advance, and if the
remaining gas cannot cover it the machine exits out-of-gas with the counter unchanged, so it
never goes negative. Signed gas (−2⁶³ … 2⁶³) is kept only as an internal convenience, e.g.
host-call functions subtract their cost g and signal out-of-gas when ϱ < g. (In 0.7.2 Ψ
returned signed gas and out-of-gas *was* a sign test.) PVM registers are 64-bit naturals;
there are 13.

</details>

### Q11 Describe the PVM memory model as the Overview introduces it.
<details><summary>Model answer</summary>

A 32-bit address space of octets, split into 4096-byte pages (2¹²). RAM is a pair: the
value blob, and an access map giving each page W (writable), R (read-only) or none
(inaccessible). Readable addresses are those whose page is not none; writable are those
whose page is W. Touching an inaccessible page ends execution with a page fault carrying
the address of the lowest inaccessible page (page-aligned); any access below 2¹⁶ panics
instead. This model is what makes the heap-frontier question well-defined: 0.8.0 removed the
`sbrk` instruction, and the heap now grows through the `grow_heap` host call (id 1), which
marks further read-write-region pages W (see the PVM sheet).

</details>

### Q12 What is a timeslot, how does it relate to the wall clock and to epochs, and what are the constants at tiny and full?
<details><summary>Model answer</summary>

A timeslot is a 32-bit natural counting 6-second periods since the JAM Common Era
(1200 UTC, 1 January 2025). Wall time is τ·6 seconds after that instant. Epoch length
E is 600 slots at full (one hour) and 12 at tiny. Other tiny/full pairs: validators 6/1023,
cores 2/341, ticket-submission tail start 10/500, rotation period 4/10, max tickets per
extrinsic 3/16, lookup anchorage 24/14 400 slots. Two 0.8.0 caveats: the validator count is
no longer a constant but any multiple of 3 from 6 to 3C (eq. valcount; at tiny, C = 2 forces
exactly 6), with only the first |κ'|/3 cores active; and ticket entries per validator are no
longer a constant N (it was 3/2) but ⌈2E/|γ_P'|⌉ (eq. ticketsextrinsic), which is 4 at tiny
(⌈24/6⌉) and 2 at full with 1023 validators. The 32-bit slot runs out in mid-August 2840.

</details>

### Q13 ★ Walk through a block with an empty extrinsic. What still changes?
<details><summary>Model answer</summary>

τ' takes the header slot. η' folds the header's VRF output into the entropy accumulator.
β† corrects the parent state root and β' appends a new entry with no reported packages,
trimming to 8. α' advances: each core's pool takes the queue item at index H_T mod 80.
No used authorizer is removed, because there are no guarantees, but a pool already holding
8 drops its oldest entry when the new one is appended (authorization chapter). ρ‡ may
still clear a core whose report has timed out waiting for assurances (timeout is measured
in slots).
The ready queue ω may still accumulate reports whose dependencies were met earlier, so
accumulation can run on an empty block. It runs every block anyway for the
always-accumulate services χ_Z (eq. privilegesspec; eq. accseq counts them in n), so δ, χ,
ι and φ can change even when no report is accumulated. π' records the author's block. If
the slot crosses an epoch boundary, κ/λ/γ rotate and the header must carry an epoch marker
(and from 0.8.0, if the set size changes, ρ‡ clears every core). ψ does not change,
because E_D is empty.

</details>

### Q14 ★ Walk through the first block of a new epoch.
<details><summary>Model answer</summary>

Detected when epoch(H_T) > epoch(τ). λ' ← κ; κ' ← γ_P (last epoch's pending set);
γ_P' ← Φ(ι), the staging set with offenders' keys zeroed; the ring root γ_Z' is
recomputed from γ_P'; η rotates: η₁' ← η₀, η₂' ← η₁, η₃' ← η₂ (η₀ itself still absorbs
this block's VRF output). The slot-sealer sequence γ_S' is Z(γ_A), the outside-in
ordering of the ticket accumulator, only if this is exactly the next epoch, the previous
block was already past the tail start, and the accumulator held E tickets; otherwise it
is the fallback F(η₂', κ'), Bandersnatch keys of the new active set picked by entropy
(eq. slotkeysequence). The header must carry the epoch marker, which is the *prior* η₀
and η₁ together with the (Bandersnatch, Ed25519) keys of γ_P', the newly pending set
(eq. epochmarker). The winners marker is not on this block: it appears on the first
block at or after the tail start *within* an epoch when the accumulator is full
(eq. winningticketsmarker). E_T may carry tickets again because the new epoch's phase is
below the tail start; the accumulator restarts for the new epoch. New in 0.8.0: the incoming
set may differ in size from the outgoing one. If |κ'| ≠ |κ|, ρ‡ clears every availability
assignment (treated as timed out early; eq. availassignmentspostassurancesdef), only the
first |κ'|/3 cores accept guarantees, and the ticket-entry bound ⌈2E/|γ_P'|⌉ is recomputed
from the new pending set (eq. ticketsextrinsic).

</details>
