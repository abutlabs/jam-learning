---
title: "Full run-through 1"
duration: 120 min
exam_portion: mock
gp_chapter: mock
gp_tex: text/header.tex, text/reporting_assurance.tex, text/overview.tex, text/discussion.tex, text/pvm.tex, text/pvm_invocations.tex, text/safrole.tex, text/judgments.tex, text/erasure_coding.tex, text/definitions.tex
---

# Full run-through 1

<span class="lecture-badge">M1 Understanding · full 120-minute run-through</span>

**The selection:** A = Ch. 5 The Header (small) · B = Ch. 11 Reporting and Assurance (large) ·
C Architecture · D Rationale · E PVM (Appendix A, with a few Appendix B host calls).

**How to run it.** Best with a partner: one person reads the prompts aloud in order and
does not show the model answers; the other answers aloud, with the Graypaper, notes and
lasair source open if wanted. The reader pushes with the follow-ups written under each
probe until the answer is exhausted, then marks the question in the Exam Room or on paper,
and gives each part an overall mark at its end. Alone, read one prompt, answer it aloud,
then open the model answer. Budget:
A 20 · B 35 · C 20 · D 20 · E 25 minutes. Do not wait for a perfect answer. Move on
when the budget says so.

The "gap to watch for" line under each answer is the thing that shows the mechanism was
not understood.

---

## Part A · Ch. 5 The Header · 20 minutes

**Opening prompt (whiteboard, 4 minutes).** "Draw a block header. Label every field,
then circle the ones that a light client needs to follow the validator set without
holding state."

### Q1 ★ A node receives a block whose timeslot is three seconds in the future. What does it do, and what does the Graypaper say about that block's validity?
<details><summary>Model answer</summary>

The block is invalid *right now* and valid in three seconds. Chapter 5 requires the
parent's slot to be strictly less than the header's slot, and the header's slot times
six seconds to be at most the wall clock. Blocks failing the second rule "may become
valid as the wall clock advances", so a correct node holds it rather than discarding or
punishing. Chapter 4 names this as the only use of the common-clock assumption: reject
future-dated blocks. Follow-up: why is a future slot dangerous at all? Because Safrole
fixes the sealer per slot; an author who could seal slots early could publish a chain
faster than the honest schedule and pre-empt forks.

</details>
*Gap to watch for:* saying the block is simply invalid, or not knowing the clock is an explicit assumption.

### Q2 ★ The header carries a state root. Which state, and what does that choice cost the node that imports the block?
<details><summary>Model answer</summary>

The prior state root: the Merkle root of the state the block was built on, which equals
the parent's posterior state. The Graypaper calls it a departure from Polkadot and the
Yellow Paper, made "to facilitate the pipelining of block computation and in particular
of Merklization": the author can seal before re-Merklizing. The cost lands on the
importer: after importing block N it cannot check its own result until block N+1
arrives with H_R. Recent history absorbs this: the entry for N is written with a zero
state root and block N+1's β† step overwrites it with H_R. Follow-up: what does a
node do if N+1's H_R disagrees with its own root? It has diverged from the author; it
must treat N+1 as invalid on its own state and investigate, which is precisely how
lasair's fuzzer divergences surface.

</details>
*Gap to watch for:* answering "posterior" or being unable to say why the choice was made.

### Q3 ★ Walk me through computing the extrinsic hash for a block with two preimages, one guarantee, no tickets, no assurances and no disputes.
<details><summary>Model answer</summary>

Build the five-element sequence **a**: the encoding of the (empty) tickets sequence;
**p**, the encoded sequence of two pairs, each (E₄(service index), Blake2b(preimage
data)); **g**, the encoded sequence of one triple (Blake2b(work-report), E₄(slot),
the credential as a length-prefixed sequence); the encoding of the empty assurances
sequence; the encoding of the disputes tuple with three empty sequences (verdicts,
culprits, faults). Hash each element with Blake2b, encode that sequence of five hashes,
and Blake2b the result. Follow-up: why hash preimages and reports per item rather than
as blobs? So a single report or preimage can be proven included with a short path; that
per-item form for preimages is new in 0.8.0 (GP #524). Second follow-up: why is the
empty disputes component not the empty string? Because the encoding of a tuple of three
empty sequences is three compact zeros, one octet each, and lasair once hardcoded
exactly that and nothing else.

</details>
*Gap to watch for:* thinking the empty components contribute nothing, or not knowing the per-item structure.

### Q4 On which block, exactly, does the epoch marker appear, and what would go wrong if an author put it on the wrong block?
<details><summary>Model answer</summary>

On the first block of a new epoch: the block whose slot's epoch index exceeds the
parent's. It carries the two newest entropy values and the (Bandersnatch, Ed25519)
keys of the incoming validator set so that a light client can compute fallback sealing
keys and verify the next epoch's seals without state. Since 0.8.0 that key list is
length-prefixed, because a set may have any size in 𝕍. Present on any other block, or
absent on the boundary block, the block is invalid under chapter 6's marker rules. An
author cannot use it to smuggle a validator set: the keys must equal γ_P′, which the
chain's own Safrole transition computes as Φ(ι): the staging set, with every validator key
whose Ed25519 component is in the *posterior* offenders ψ′_O replaced by all zeros
(eq:epochmarker, eq:blacklistfilter).
Follow-up: and the offenders marker? Present on every block, usually empty: exactly the
Ed25519 keys of this block's culprits followed by those of its faults, in extrinsic
order (sec:judgmentmarker).

</details>
*Gap to watch for:* not knowing it is conditional, or not knowing what it contains.

### Q5 The author index is an index into κ′, not κ. Why the prime?
<details><summary>Model answer</summary>

On an epoch-boundary block the validator set rotates during the transition; the block's
author is a member of the new active set, because the slot-sealer sequence for the new
epoch was drawn from the incoming keys. Indexing into κ′ makes the rule uniform for every
block; 0.8.0 accordingly types H_I as an index below |κ′| rather than below a fixed V,
since set sizes can now change at that boundary. The seal is then verified under
κ′[H_I]'s Bandersnatch key against the slot's
ticket (or the fallback key). Follow-up: which signatures in the *extrinsic* are
verified under κ rather than κ′? Assurances are signed by κ[index]; guarantees use G or
G* which are built from κ′ or λ′ depending on the rotation.

</details>
*Gap to watch for:* not knowing sets rotate at the boundary, or which set signs what.

### Q6 Tell me about a bug lasair hit in this chapter.
<details><summary>Model answer</summary>

The 60-second version: "Every block lasair had ever seen carried an empty disputes
extrinsic, so the block-import extrinsic hash hardcoded the disputes component as three
empty compact sequences. The first fuzzer block with real verdicts, seed 3571347957 on
the full spec, failed with bad extrinsic hash before the disputes state was even
touched. Behind that were two more gaps: the codec threw 'disputes import not wired',
and there was no ρ to ρ† clearing on bad verdicts. Fixing the hash moved the seed from
step 2 to step 6 and exposed the rest. The lesson I took: the header commits to all five
extrinsics, and a component you have never seen populated is still hashed. The AI wrote
the fix; I ran the seed, read the failure, and had to understand the rule to judge the
fix was right." Source: `docs/TINY_TO_FULL_AUDIT.md`.

</details>
*Gap to watch for:* no story, or a story with no protocol rule in it.

**Part A mark:** ______

---

## Part B · Ch. 11 Reporting and Assurance · 35 minutes

**Opening prompt (whiteboard, 6 minutes).** "One core, one work-package. Draw ρ for
that core across five consecutive blocks: reported, assured by a minority, assured by a
supermajority, and then a new package. Label the intermediate states."

### Q7 ★ A guarantee arrives for core 3 but core 3 still holds a report from four slots ago that nobody assured. Is the block valid? Now make it six slots ago.
<details><summary>Model answer</summary>

Four slots ago: invalid. A guarantee is only valid for a core that is free in ρ‡, and ρ‡
clears a core only when its report became available this block, or when
H_T ≥ its timestamp + 5 (the assurance timeout), or when the validator set changed size.
At four slots the old report still occupies the core. The same equation
(eq:reportcoresareunused) also demands the report's authorizer hash be in that core's
pool α[c]. Six slots ago: valid, because the
timeout has passed, the old report is dropped without accumulation, and the new
guarantee fills the core with (guarantee, τ′). Follow-up: which intermediate does the
timeout act on, and why is that the right one? On ρ† (post-disputes), because a report
just judged bad must also be gone before the guarantee check, and both clearings happen
before ρ′ is formed from E_G.

</details>
*Gap to watch for:* not knowing the timeout, or not knowing that ρ† → ρ‡ → ρ′ is ordered disputes, assurances, guarantees.

### Q8 ★ A report's anchor is nine blocks old. Walk me through what rejects it and where that state lives.
<details><summary>Model answer</summary>

The refinement context's anchor must match an entry of β†: header hash, posterior state
root, accumulation-log super-peak and, since 0.8.0, the slot. β holds at most 8 entries,
so a nine-block-old anchor has been trimmed and no entry matches; the guarantee is
invalid. The state is recent history, chapter 7, key C(3). Follow-up: why does the
anchor need the state root and belt peak, not just the hash? Because refine ran against
that state and may have read it; the report claims "this is what I saw", and the chain
must be able to check the claim against exactly what it recorded. Second follow-up: the
lookup anchor is allowed to be far older. Why the asymmetry? The anchor is a freshness
bound on the refine's view of the chain (8 blocks); the lookup anchor bounds which
historical preimages were readable, and preimage availability is a 24-hour promise
(C_maxlookupanchorage = 14 400 slots), checked against the stored header chain, not
state. Since 0.8.0 (GP #526) the context also carries the lookup anchor's posterior state
root, and the record check needs two ancestors: h, the lookup-anchor header (matching
slot and hash), and h′, its child, whose prior-state-root field must equal that root.
The ancestor set includes the importing block's own header (eq:ancestors), so a lookup
anchor that is the parent still passes.

</details>
*Gap to watch for:* confusing the anchor with the lookup anchor, or not knowing β's length.

### Q9 ★ How many assurances make a report available at tiny and at full, and what does an assurer actually sign?
<details><summary>Model answer</summary>

Strictly more than two thirds of |κ|: at tiny (6) that is 5; at full (1023) it is 683.
An assurance is (anchor = H_P, a bitfield of C bits, the validator index, an Ed25519
signature by κ[index] over the context string for availability followed by
Blake2b(E(H_P, bitfield))). The extrinsic must be strictly ascending by validator index
and every set bit must point at a core with a pending assignment in ρ†. Follow-up: why
2/3 when erasure coding reconstructs from 1/3? Because up to 1/3 of assurers may lie;
2/3 assured guarantees at least 1/3 honest holders, which is exactly the reconstruction
threshold at an optimal set size: 𝒟(v) = v/3 + 1 chunks, 342 of 1023
(eq:ecoriginalshards). Second follow-up: what is the bitfield's byte length at full?
⌈341/8⌉ = 43.

</details>
*Gap to watch for:* not knowing the threshold rule, or that assurances anchor on the parent.

### Q10 ★ Explain how validator 700 finds out which core it may guarantee for at slot 4 807 in the full spec.
<details><summary>Model answer</summary>

Build the sequence ⌊i/3⌋ for i below |κ′| (1023 at full size), which pairs validators
with cores three at a time; Fisher–Yates shuffle it with η₂′; then rotate every core
index by ⌊(4 807 mod 600) / 10⌋ modulo |κ′|/3, the active core count (341). Slot 4 807
is 8 × 600 + 7, so the epoch-relative slot is 7 and the rotation index is ⌊7/10⌋ = 0:
in the first rotation of the epoch validator 700's core is simply its shuffled entry;
ten slots later every core index moves up by one.
Follow-up: why η₂ and not the freshest entropy? η₂′ was fixed two epochs back, so
assignments are known before the epoch starts and a contested end of epoch cannot change
them. Second follow-up: a guarantee arrives with slot 4 799. Which assignment applies?
⌊4 799/10⌋ = 479 against ⌊4 807/10⌋ = 480, so it is the previous rotation and G* applies.
G* is computed for τ′ − R = 4 797; since ⌊4 797/600⌋ = 7 differs from ⌊4 807/600⌋ = 8 that
rotation was in the previous epoch, so G* uses λ′ and η₃′, shuffling |λ′| entries and
rotating modulo |λ′|/3 (since 0.8.0 not necessarily |κ′|), with rotation index
⌊597/10⌋ = 59. The slot must satisfy R(⌊τ′/R⌋ − 1) ≤ slot ≤ τ′, so 4 790 ≤ 4 799
holds.

</details>
*Gap to watch for:* not knowing the shuffle-then-rotate structure or the rotation period.

### Q11 A guarantee carries three signatures but one signer is assigned to a different core. What happens, and what is the minimum number of valid signers?
<details><summary>Model answer</summary>

The whole guarantee, and therefore the block, is invalid: every credential entry must
name a validator whose assignment under G or G* equals the report's core, must be
ordered and unique by index, and must verify over the guarantee context string plus
Blake2b(report). Minimum two signers, maximum three. In 0.8.0 the same equation also
requires each signer index to be below |k|, the length of the key list of whichever of G
or G* applies (the credential index is now typed ℕ, where 0.7.2 typed it ℕ_V), and the
core to be active (c < |κ′|/3), even when the slot falls in the previous rotation and
the core was active then (eq:guarantorsig). Follow-up: why two, when three are
assigned? A single guarantor could be censored or offline; two gives liveness with one
missing guarantor while still putting two validators' stake behind the report. All
signers enter the reporters set R that feeds statistics.

</details>
*Gap to watch for:* thinking one bad signature is ignored, or not knowing the 2 to 3 rule.

### Q12 What must be true about a work-digest's gas and code hash at guarantee time, and why check the code hash on-chain at all when refine already ran it?
<details><summary>Model answer</summary>

Each digest's accumulate gas limit must be at least the service's minimum accumulate gas
(δ[s].minaccgas), and the sum across the report must not exceed C_reportaccgas of
10 million. The digest's code hash must equal the service's *current* code hash in δ.
The on-chain check exists because refine ran against the code available at the lookup
anchor, but accumulate will run the service's present code; if the service upgraded in
between, the digest would be accumulated by code that never saw its refine (that reason is
the natural reading; the Graypaper states the rule without a rationale). Follow-up:
what does a BAD result mean in a digest? The service's code was not available at the
lookup-anchor's posterior state; BIG means it was available but exceeds the maximum
service code size. Errors still reach accumulation as operands.

</details>
*Gap to watch for:* not knowing the gas floor and cap, or the reason for the code-hash check.

### Q13 Name the duplicate and dependency checks on an incoming package hash, and say which structure each reads.
<details><summary>Model answer</summary>

Not twice in this extrinsic (the set of package hashes has the same cardinality as the
report sequence). Not in any recent-history entry's reported packages (β). Not in ξ,
the accumulated set (last epoch). Not in ω, the ready queue. Not in ρ, pending on a
core. Every prerequisite and every key of the segment-root lookup must be in this
extrinsic or in β, and each lookup's segment root must equal the recorded one. The
prerequisites and segment-root-lookup entries together are at most J = 8 per report
(eq:limitreportdeps). Follow-up:
two reports in one extrinsic depend on each other. Valid? Yes at guarantee time; the
Graypaper says such loops simply never leave the accumulation queue and age out after
an epoch.

</details>
*Gap to watch for:* missing ξ or ω, or not knowing loops are permitted here.

### Q14 ★ The validator set shrinks at an epoch boundary. What happens to every pending report, and why is that the right rule?
<details><summary>Model answer</summary>

ρ‡ clears every core when |κ| ≠ |κ′| (eq:availassignmentspostassurancesdef). Each
pending report's bundle was erasure-coded into one chunk per validator, and its
availability spec's chunk count had to equal |κ′| when it was guaranteed; with a
different set size the chunk-to-assurer mapping is void and assurances can no longer be
counted meaningfully. A report that crosses the > 2/3·|κ| threshold in that same block
still becomes available, because R is computed from ρ† and E_A with no set-size
condition (eq:availableworkreports). The rest are dropped without accumulation, "timed
out early" in the Graypaper's words; the package may be guaranteed again once its hash
has left β's reported-package lists. From then on only the first |κ′|/3 cores take
guarantees. The clause is new in 0.8.0, which made set sizes variable (GP #514); the
assurances vector `val_set_size_change_clears_pending_reports` exercises it, and the
reports vector `report_with_shrunken_val_set` covers guaranteeing with a 6-validator
set at full.

</details>
*Gap to watch for:* not knowing the rule exists, or not connecting it to one shard per validator.

### Q15 Tell me about a bug lasair hit in this chapter.
<details><summary>Model answer</summary>

F6, the core popularity that read only byte 0: "Core popularity, the per-core count of
assurers that decides availability and feeds statistics, was computed by taking byte 0
of the assurance bitfield and shifting by the core index. Correct at tiny, where both
cores live in byte 0. At full, core c's bit is byte c/8, bit c mod 8, so every core from
8 upward shifted an 8-bit value right by 8 or more and always read zero: no report on
those cores could ever become available. Found by the tiny-to-full audit and confirmed
on L2b seed 3571347957 at step 6, right after F5 was fixed. The fix was to decode byte
c/8 and bit c mod 8 at both popularity sites, the pattern the availability check
already used. Lesson: the same bitfield was decoded two ways in one codebase, and
'bit c' means byte ⌊c/8⌋, bit c mod 8, for all c." Source: lasair v1.4.2 (2026-06-27),
`docs/TINY_TO_FULL_AUDIT.md`.

</details>
*Gap to watch for:* no story, or not knowing how a bitfield indexes.

**Part B mark:** ______

---

## Part C · Architecture · 20 minutes

**Opening prompt (whiteboard, 5 minutes).** "Draw the life of one work-package from a
builder's machine to a changed balance in δ. Put a vertical line where in-core ends and
on-chain begins."

### Q16 ★ Where is a work-package's data at each stage, and what on-chain object commits to it at each stage?
<details><summary>Model answer</summary>

Built off-chain and sent to the core's guarantors: nothing on-chain yet. Refined by the
guarantors: the work-report's availability spec commits to it (package hash, bundle
length, erasure root over the shards, the shard count, which since 0.8.0 must equal
|κ′|, segment root over exports). Guaranteed: E_G
carries the report and the header's extrinsic hash commits to it; ρ holds the
guarantee. Assured: the shards sit with every validator; E_A bitfields commit to
holding them. Available: R* lists the report; after accumulation θ′ carries the yields
and β′'s belt commits to θ′; ξ′ records the package hash for an epoch. The data itself
is retained by validators in the availability system for as long as auditors may need
to fetch it and later packages may import its segments; the chain only ever holds hashes
and roots.

</details>
*Gap to watch for:* not distinguishing the data from the commitments to it.

### Q17 ★ Why are there two execution entry points per service and not one, and what can each touch?
<details><summary>Model answer</summary>

Refine runs in-core, on three guarantors, statelessly: it can read the service's code and
preimages as of the lookup anchor, import and export segments, and produce a digest,
but it cannot change state. Accumulate runs on-chain, on every node, with the service's
storage, balance, transfers, privileges and the ability to create or upgrade services.
The split is JAM's answer to "everybody does everything is not scalable": the expensive
and large part happens on a subset and is made trustworthy by guaranteeing, assuring,
auditing and judging; the coherent, stateful part is kept small (the Discussion chapter
budgets roughly 10 ms and 48 KB per report for accumulate). Follow-up: what does a
service give up? Synchrony: its input lands in state several slots after the work, and
it must reason about operands that may carry errors. Second follow-up: where should a
service verify signatures? In refine. A report's whole accumulate allowance is
G_A = 10 million gas across its digests, against G_R = 5 billion for a package's refine
(definitions.tex constants). jamswap, run on lasair, measured one in-PVM Ed25519 verify
at about 5.29 million gas under the 0.8.0 gas model (1.31 million under 0.7.2), so one
report's accumulate allowance covers at most one (jamswap `docs/LASAIR_INTERNALS.md`;
a lasair measurement, not a Graypaper figure).

</details>
*Gap to watch for:* describing accumulate as "the same thing on-chain" or not knowing refine is stateless.

### Q18 What are the three roles a validator plays in a single block, and which extrinsic each produces?
<details><summary>Model answer</summary>

Author (Safrole sealer for the slot): produces the block and, through tickets earlier,
E_T. Guarantor (three per active core, rotating every R slots): produces E_G. Assurer
(every validator, for every pending package it holds a shard of): produces E_A. Beyond the
block, every validator is also an auditor under ELVES, whose escalation produces E_D
when judgments are needed, and a Grandpa voter. Follow-up: why rotate guarantors every
10 slots but shuffle only once per epoch? Rotation limits how long any trio sits on a
core; the shuffle uses entropy fixed two epochs earlier so assignments are predictable
for the network but not choosable by validators.

</details>
*Gap to watch for:* not knowing the assurer role is every validator.

### Q19 What does the chapter 4 dependency graph buy an implementer, and where did lasair actually use it?
<details><summary>Model answer</summary>

It states which posterior components depend on which inputs, so an implementation can
parallelise everything not connected by an arrow and must serialise only the daggers:
β† before β′, ρ† before ρ‡ before ρ′, accumulation before preimage integration and before
α′. lasair implements the daggers as named intermediates in the block-import path in the
Graypaper's order; the seed campaign showed that per-STF correctness is not enough,
because the joins of the graph (assignments, markers, assurances, preimages, rotation)
had never been exercised together until full block import ran.

</details>
*Gap to watch for:* not knowing what a dagger intermediate is.

### Q20 ★ Explain availability in this architecture: who stores what, for how long, and what forces honesty.
<details><summary>Model answer</summary>

Each work-package bundle plus its exported segments is erasure-coded into |κ| shards,
one per validator; each validator stores its shard and signs an assurance saying so.
More than two thirds assured means at least one third honest holders, which is enough
to reconstruct. Availability lasts long enough for auditors to fetch and re-execute,
and exported segments stay importable by later packages through the segment-root lookup,
which chapter 11 ties to the packages in recent history. Honesty is enforced economically: guarantors are slashed if audits find
the report invalid; a validator that assures data it does not hold risks the audit
finding it out; and the availability spec's erasure root lets any validator verify the
shard it was given before assuring.

</details>
*Gap to watch for:* not knowing shards are one per validator or why 2/3.

**Part C mark:** ______

---

## Part D · Rationale · 20 minutes

**Opening prompt (2 minutes).** "You have one minute: tell someone who knows Ethereum
what problem JAM exists to solve."

### Q21 ★ What is the size-coherency antagonism, and which JAM mechanism is the direct answer to it?
<details><summary>Model answer</summary>

The Introduction's claim that a system cannot grow in state and participants without
losing coherency, because coherent (synchronous) systems must be evaluated by everyone.
JAM's answer is the in-core / on-chain pipeline: a "highly scalable, mostly coherent"
element (refinement in-core, across cores) feeding a "synchronous, fully coherent"
element (accumulation on-chain). The five driving factors (resilience, generality,
performance, coherency, accessibility) are all served by keeping the coherent core
small and the scalable part large. Follow-up: name the trade-off accepted. Bounded
asynchrony: results land slots after the work, and accumulate is tightly budgeted.

</details>
*Gap to watch for:* not knowing the term or which design element answers it.

### Q22 ★ Why does the Graypaper prefer auditing to validity proofs, and what number does it use to make the case?
<details><summary>Model answer</summary>

The Previous Work chapter puts SNARK proving at a cost multiplier of tens of millions
over native execution and notes the centralising effect of specialised provers; it says
it has yet to be demonstrated that SNARK strategies will compete on cost. ELVES, the
audit-and-judge game, is called the most secure and economically efficient of the
options that fragment execution across validators. The trade-off accepted: a large
share of validator CPU goes to auditing, finality waits for audits, and security rests
on a two-thirds honest majority rather than on mathematics.

</details>
*Gap to watch for:* not knowing what ELVES is or the shape of the cost argument.

### Q23 In 0.8.0 the validator set may change size but the core count may not. How does the protocol reconcile the two, and what does a size change cost?
<details><summary>Model answer</summary>

Three validators per core fixes the ratio, not the counts. A validator key set may have
any size in 𝕍, the multiples of three from 6 to 3C = 1023 (eq:valcount). C = 341 stays a
constant, but only the first |κ′|/3 cores are active, so in-core capacity scales with the
validator count (chapter 11, guarantor assignments). The erasure-coding rate is 𝒟(v):v
(eq:ecoriginalshards); it is optimal, with no more redundancy than needed, only when
𝒟(v) = v/3 + 1, which holds for a listed set of sizes including 6 and 1023, and the
Graypaper recommends choosing set sizes from that list. The capacity figures in the
Discussion are sized for the stated target of 1,023 validators. The staking system that
picks the keys is explicitly out of scope and reached through an API: the designate host
call, which answers HUH for a key count not in 𝕍. The cost of a size change: every
pending availability assignment is cleared when |κ| ≠ |κ′|, because each report's chunk
count was fixed at the old size (Q14). 0.7.2 fixed V = 1023 and had no such clause.

</details>
*Gap to watch for:* treating the validator count as fixed at 1023 (the 0.7.2 reading), or no reference to the erasure rate or the per-core ratio.

### Q24 Why RISC-V for the PVM rather than the EVM or WASM, and what did that decision cost?
<details><summary>Model answer</summary>

The Graypaper calls the PVM "far less opinionated" than the EVM because it adapts a
general-purpose ISA with existing tooling (LLVM, Rust, C++); 64-bit registers, 13 of
them, little-endian, with a simple instruction set that suits efficient recompilation
onto common hardware. The Discussion reports a prototype at roughly 50 to 60 times EVM
speed asymptotically. Cost: a gas model had to be built from scratch, which is exactly
what 0.8.0 replaced (per-basic-block CPU simulation instead of one gas per
instruction). The Graypaper never argues PVM against WASM: WebAssembly appears once,
only as the platform under Moonbeam's EVM in the Discussion's gas-throughput estimate. The
Polkadot experience with recompilation cost is community rationale, not text, and should
be labelled as such.

</details>
*Gap to watch for:* claiming the Graypaper compares to WASM, or no reason at all.

### Q25 Why does JAM have no transactions and no transactor, and what replaces them?
<details><summary>Model answer</summary>

All accounts are service accounts: code, balance, state, no secret key, so no nonce.
External data enters only through refine, and payment is separated from authorship:
coretime is prepurchased and assigned to an authorization agent, whose authorizer
(chapter 8) decides which packages may consume it. This gives both Ethereum-style
(payer authors the work) and Polkadot-style (payer unrelated to the author) patterns
without a signature-per-input model. The accepted cost: on-chain logic sees only
authorizer hashes; policy is opaque code run in-core.

</details>
*Gap to watch for:* not knowing that services have no keys, or what an authorization agent is.

**Part D mark:** ______

---

## Part E · PVM · 25 minutes

**Opening prompt (whiteboard, 4 minutes).** "Draw the standard program memory layout
for a JAM service blob. Mark which regions are readable, writable, and inaccessible,
and where the initial stack pointer and argument pointer sit."

### Q26 ★ A program executes a store to address 0x1000. What happens and why, before we even look at the page map?
<details><summary>Model answer</summary>

It panics. Every address below 2¹⁶ is inaccessible by definition; Ψ₁'s memory check
panics immediately on any address in that range before consulting the access map, and
the standard layout leaves the first zone as a guard. Follow-up: and a store to a page
that is mapped read-only? Not a panic: a page fault, with the lowest offending address
rounded down to its page, state unchanged, so the environment could map the page and
resume. Second follow-up: which exit reasons leave the instruction counter pointing at
the faulting instruction? Fault, out-of-gas and host call; halt and panic return 0.

</details>
*Gap to watch for:* not distinguishing panic from fault, or not knowing the 2¹⁶ guard.

### Q27 ★ Describe the 0.8.0 gas model in plain English, including the Boolean that Ψ gained.
<details><summary>Model answer</summary>

Gas is charged per basic block, in advance. On entering a block whose cost has not yet
been paid, Ψ₁ computes the block's cost from a simplified out-of-order CPU model (decode
slots, execution units, a reorder buffer, register dependencies), minus three, at least
one (eq:gascostforblock); if the counter covers it, it is deducted and the flag ϱ̃ is set;
otherwise the machine exits out-of-gas with the counter unchanged and ϱ̃ clear. ϱ̃ (a
tilde over the gas symbol ϱ; φ is the register file) is that
"already charged for this block" flag, carried in and out of Ψ so that a host call in
the middle of a block resumes without double charging, and cleared after a terminator
so the next block is charged on entry. 0.7.2 charged one gas per instruction on every
step. Follow-up: why per block? Because the cost model reasons about instruction-level
parallelism, which only makes sense over a straight-line sequence.

</details>
*Gap to watch for:* describing the 0.7.2 model as current, or not knowing what ϱ̃ is.

### Q28 What happens on `div_u` by zero, and on the most negative 64-bit value divided by minus one?
<details><summary>Model answer</summary>

Division never traps. Unsigned division by zero yields all ones (2⁶⁴ − 1); remainder by
zero yields the dividend. The signed overflow case −2⁶³ ÷ −1 returns the dividend, and
the matching signed remainder returns 0. Signed division rounds toward zero and signed
remainder takes the sign of the numerator. Follow-up: why not trap? Determinism and
gas: a trap would need an exit reason and a cost; RISC-V itself defines these results,
and the PVM keeps that convention so compiled code behaves as it does natively.

</details>
*Gap to watch for:* saying division by zero panics.

### Q29 ★ A service calls `ecalli` for `transfer` with a destination that exists but a gas argument below the destination's minimum memo gas. Trace what the host call does, what it returns, and what state changes.
<details><summary>Model answer</summary>

The transfer host function (index 21) reads destination, amount, gas limit and memo
pointer from registers 7 to 10, builds the deferred transfer (source = the calling
service, 128-byte memo from memory), then checks in order: memo readable (else panic);
destination in the accounts (else WHO); gas limit at least the destination's
minmemogas (else LOW); the sender's balance after the amount at least its own minimum
balance (else CASH). Here LOW is written into register 7, nothing is appended to the
deferred transfer list and the balance is unchanged; only gas is deducted (the base
cost M_T = 575 plus the transfer's gas limit, which is charged only on success).
Follow-up: when does a successful transfer actually move balance? The sender's balance
drops now, in the mutator context; the destination receives it when it is next
accumulated with the transfer among its items (Ψ_A credits the sum of incoming transfers
before the code runs), with the transfer's gas added to that invocation's budget.

</details>
*Gap to watch for:* not knowing transfers are deferred, or that result codes go in register 7.

### Q30 What does `checkpoint` do, and why did it matter in lasair's B5?
<details><summary>Model answer</summary>

Checkpoint (index 18) copies the regular context x into the exceptional context y and
returns the remaining gas in register 7. If the invocation later panics or runs out of
gas, the collapse function C returns the y dimension, so everything since the last
checkpoint is reverted and everything before it kept. The gas for the call itself is
charged first; if the counter cannot cover it the call exits out-of-gas without
copying. In B5 lasair took the snapshot inside a checkpoint call it could not pay for
(gas 7, cost 10: B5 ran under 0.7.2, where checkpoint was id 17 and cost 10; 0.8.0
prices it at M_C = 103), so the out-of-gas revert kept a write the reference undid.
Lesson: a host call's side effect becomes real only after its gas is paid.

</details>
*Gap to watch for:* not knowing there are two context dimensions or what out-of-gas restores.

### Q31 Explain what `Ψ_M` returns when a program halts with registers 7 and 8 pointing at unreadable memory, and how gas used is computed.
<details><summary>Model answer</summary>

Halt with [ω₇, ω₇ + ω₈) readable returns that memory as the result blob; halt with it
not readable returns the empty blob; out-of-gas returns oog; any other exit (panic or a
page fault) returns panic. There is no host-call exit left to handle: Ψ_H services every
`ecalli` itself, and an unknown host-call id writes WHAT into ω₇, costs 1,000 gas and
continues (or exits out-of-gas if the counter cannot cover it). Gas used is the gas
given minus max(remaining, 0), so it can never exceed what was provided even if the
counter went negative on the last charge.
Follow-up: which entry points do the three protocol invocations use? Is-authorized at 0,
refine at 0, accumulate at 5, all through Ψ_M.
Second follow-up: what if the entry point is not the start of an instruction? Since
0.8.0 deblob accepts a program only if every instruction from 0 decodes validly (the
last one a block terminator) and the entry ı is itself a valid instruction; otherwise Ψ
panics before executing anything, so Ψ_M returns panic with no gas used.

</details>
*Gap to watch for:* not knowing how the result blob is located or that gas used is clamped.

### Q32 Tell me about a bug lasair hit in the PVM.
<details><summary>Model answer</summary>

The sbrk frontier: "After the seed campaign two fuzz seeds were left, both on PVM memory
accessibility: exactly where the writable heap ended after `sbrk`, which decides whether
a store faults or succeeds. lasair's PVM claim rests on a replay harness that runs
recorded invocations through Parity's polkavm and diffs the program counter and all
thirteen registers every step, so the mismatch was located precisely. The semantics were
confirmed against polkavm and turbojam, disclosed, and implemented independently. The
lesson: the page map is not a detail, it decides panic versus commit, and 0.8.0 moved
that frontier into a priced `grow_heap` host call precisely because it was protocol
visible." Source: `docs/M1_PLAN.md`, `docs/DISCLOSURES.md`. Have the 0.8.0 facts behind
the last line ready: opcode `sbrk` is gone, `grow_heap` is host call 1 (275 gas plus 121
per page added), and every host call after `gas` moved up one id (checkpoint 17 → 18,
transfer 20 → 21).

</details>
*Gap to watch for:* no story, or not knowing sbrk is gone in 0.8.0.

**Part E mark:** ______

---

## Marking sheet

| Part | Covers | Mark | Notes |
|---|---|---|---|
| A | Ch. 5 The Header | | |
| B | Ch. 11 Reporting and Assurance | | |
| C | Architecture | | |
| D | Rationale | | |
| E | PVM | | |

## Debrief: what separates a working answer from a deep one

1. **Intermediates, not steps.** A working answer explains assurances then guarantees. A deep answer
   explains ρ†, ρ‡, ρ′ as named values, says why disputes must precede assurances, and
   connects the prior-state-root choice in chapter 5 to the β† correction in chapter 7.
2. **Numbers with reasons.** A working answer knows 2/3 and 8. A deep answer says 2/3 assured means 1/3
   honest holders which is the erasure threshold, that β is 8 because it is the anchor
   freshness window, and that the lookup anchor is 24 hours because that is the
   preimage availability promise.
3. **The 0.8.0 line.** A deep answer adds, unprompted: "lasair's M1 build targeted 0.7.2 and lasair
   2.0.0 now targets 0.8.0; in 0.8.0 the extrinsic hash takes preimages per item, the
   refine context carries the anchor slot, and gas is charged per basic block."

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0 deltas this run-through touches</div>

- **Header:** preimages enter the extrinsic hash as (E₄(service), Blake2b(data)) pairs
  (GP #524); H_I is an index below |κ′|; the epoch marker's key list is length-prefixed.
- **Ch. 11:** ρ holds the whole guarantee plus the slot τ′ it was reported in
  (GP #494); the refine context gains the anchor slot and the lookup-anchor posterior
  state root, checked through the lookup anchor's child header (GP #526); the
  availability spec gains a chunk count that must equal |κ′| (GP #514); availability needs > 2/3·|κ|; every assignment is cleared
  when |κ| ≠ |κ′|; only the first |κ′|/3 cores are active; P(v, e, t) shuffles ⌊i/3⌋
  for i < v and rotates modulo v/3 (|κ′|/3 for G).
- **Validator sets:** any size in 𝕍, the multiples of 3 from 6 to 1023 (eq:valcount);
  coding rate 𝒟(v):v (eq:ecoriginalshards).
- **PVM:** gas per basic block with the flag ϱ̃ (GP #508); `sbrk` removed, `grow_heap`
  is host call 1 and later ids move up by one (also GP #508); host calls priced from the
  M table (GP #517: checkpoint 103, transfer 575 plus its gas limit on success, grow_heap
  275 plus 121 per page, unknown id 1,000); deblob checks the whole blob and the entry
  point.

</div>
