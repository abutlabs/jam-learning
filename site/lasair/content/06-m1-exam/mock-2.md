---
title: "Full run-through 2"
duration: 120 min
exam_portion: mock
gp_chapter: mock
gp_tex: text/recent_history.tex, text/accumulation.tex, text/overview.tex, text/discussion.tex, text/pvm_invocations.tex, text/serialization.tex, text/merklization.tex
---

# Full run-through 2

<span class="lecture-badge">M1 Understanding · full 120-minute run-through</span>

**The selection:** A = Ch. 7 Recent History (small) · B = Ch. 12 Accumulation (large) ·
C Architecture · D Rationale · E Appendix B host calls, with Appendix C serialization
and Appendix D Merklization.

**How to run it.** Best with a partner: one person reads the prompts aloud in order and
does not show the model answers; the other answers aloud, with the Graypaper, notes and
lasair source open if wanted. The reader pushes with the follow-ups written under each
probe until the answer is exhausted, then marks the question in the Exam Room or on paper,
and gives each part an overall mark at its end. Alone, read one prompt, answer it aloud,
then open the model answer. Budget:
A 20 · B 35 · C 20 · D 20 · E 25 minutes. This selection pairs the shortest chapter with the
one where every lasair divergence lived, so the balance of time matters: do not let a
strong part A eat part B's budget.

The "gap to watch for" line under each answer is the thing that shows the mechanism was
not understood.

---

## Part A · Ch. 7 Recent History · 20 minutes

**Opening prompt (whiteboard, 4 minutes).** "Draw β after block 12 has been imported on
a chain that started at genesis. Show the entries, the belt, and which field of the
newest entry is wrong on purpose."

### Q1 ★ Block 13 arrives. Before anything else in the transition, what happens to β, and what would break if that step were skipped?
<details><summary>Model answer</summary>

β† is formed: the newest entry, written for block 12 with a zero state root, gets its
state root replaced by block 13's prior-state-root header field, which is exactly block
12's posterior root (eq. correctlaststateroot). The Graypaper lists β† at the top of the
dependency graph, right after τ' (eq. betadagger), because it depends only on the header
and β. If it were skipped, every work-report anchored on block 12 would fail contextual
validity: chapter 11 matches the anchor against β† (header hash, state root, super-peak
and, since 0.8.0, slot), and the state root would still read zero. Follow-up: why is the
zero "inaccurate but safe"? Because nothing reads that field except the next block's
β† step, which corrects it before any consumer sees it.

</details>
*Gap to watch for:* not knowing the entry is written with a zero root, or thinking β† needs the extrinsic.

### Q2 ★ Recent history holds eight entries. Name every field of an entry in 0.8.0 and say which chapter reads each one.
<details><summary>Model answer</summary>

Header hash h (chapter 11: a report's anchor must be one of them; the lookup anchor is
checked against the header store instead), state root s (chapter 11: the anchor's posterior root must match),
accumulation-log super-peak b (chapter 11: the anchor's Beefy root must match; bridges
read it), timeslot t (new in 0.8.0, GP #526: the refine context now carries an anchor
slot, checked against this), and reported p, a dictionary from package hash to exports
segment root (chapter 11: duplicate rejection, and import resolution via the segment
root). Follow-up: why a dictionary and not a set of hashes? Because later packages
import segments exported by recent ones, and the importer must be checked against the
exporter's segment root, which β is the only place to find.

</details>
*Gap to watch for:* missing the segment-root mapping, or not knowing the slot field is new.

### Q3 ★ A service accumulates twice in one block and yields both times. Trace those two yields from θ' into β'. Name the hash function at each step and say why it is not Blake2b.
<details><summary>Model answer</summary>

θ' is the set b returned by the top-level accumulation: (service, hash) pairs, two of
them with the same service id, ordered by the full tuple. Recent history encodes each as
E₄(service) followed by the hash, Merklizes the sequence with the well-balanced binary
function under Keccak, and appends that root to the belt β_B with the MMB append, again
under Keccak (eq. accoutbeltdef). The super-peak of the new belt is written into the new
β_H entry as field b. Keccak throughout is "to maximize compatibility with legacy
systems": an Ethereum contract verifies Keccak Merkle proofs with a cheap precompile.
Follow-up: what does the MMB append do when position 0 is occupied? It clears it and
carries Keccak(old ++ new) to position 1, and so on, like binary addition.

</details>
*Gap to watch for:* saying Blake2b, or not knowing the belt is a mountain range of optional peaks.

### Q4 Where do the reported package hashes in the new β entry come from, and why are they taken from the guarantees extrinsic rather than from what was accumulated?
<details><summary>Model answer</summary>

From E_G: every guarantee in this block contributes its report's package hash mapped to
its exports segment root (eq. recenthistorydef). The purpose is duplicate rejection at
*reporting* time: chapter 11 must reject a package the moment it is reported again, not
an epoch later when it would be accumulated. Accumulated hashes live in ξ, a separate
structure with a different horizon (one epoch), and cover the case where a report was
reported, became available and was accumulated; β covers the eight-block window where a
report may have been guaranteed but not yet accumulated. Follow-up: can the same package
be in β and ξ at once? Yes, normally, for a few blocks; the checks are independent.

</details>
*Gap to watch for:* confusing β's reported set with ξ's accumulated set.

### Q5 The chain has been running for six blocks since genesis. What does β look like and does anything get trimmed?
<details><summary>Model answer</summary>

Seven entries: genesis plus six (lasair initialises β with the genesis header hash). No
trimming until the ninth entry would be appended; the rule is "keep the last eight"
via the left-arrow operator, which is a no-op while the sequence is shorter. β† still
applies to the newest entry every block. The belt has had six appends, so it has three
positions holding two peaks, for 2 and 4 items, because 6 = 4 + 2 (position 0 is empty).
Follow-up: at tiny, is eight blocks more or less than an epoch? Less: an epoch is 12
slots, so β cannot span an epoch boundary's worth of history by itself; the lookup-anchor
rule (24 slots at tiny) uses the header store, not β: it finds the lookup-anchor header
by hash and slot and, since 0.8.0, also a child header whose prior-state-root field equals
the context's new lookup-anchor state root (GP #526, sec:contextualvalidity).

</details>
*Gap to watch for:* thinking β is padded to eight, or that it is epoch-aligned.

### Q6 Tell me about a bug lasair hit in this chapter.
<details><summary>Model answer</summary>

The 60-second version: "Live fuzzer seed 1551410130 diverged at step 2854 on two state
keys at once: the accumulation output and recent history. Same length, same entries,
different order, which is the signature of an ordering bug. The accumulation output is a
Graypaper set of (service, hash) pairs, and we sorted it by service alone; when one
service accumulated twice in a block our two pairs kept insertion order while the
reference sorted by the full tuple. Recent history commits to the Keccak root of that
sequence through the belt, so the wrong order cascaded into β and then the state root.
The fix sorted by (service, hash) and routed every set through one canonical encoder.
What I took from it: every set that reaches the trie has a total order, and the
chapter-3 order-by notation is a rule, not decoration. The AI wrote the fix; I ran the
seed, decoded the two keys, and had to understand the belt to see why a chapter-12 bug
showed up as a chapter-7 divergence." Source: Divergence Lab B1,
`docs/CONFORMANCE_RETROSPECTIVE.md` §6.

</details>
*Gap to watch for:* no story, or not being able to say why β was the second key.

**Part A mark:** ______

---

## Part B · Ch. 12 Accumulation · 35 minutes

**Opening prompt (whiteboard, 6 minutes).** "Three reports become available in one
block: X has no prerequisites, Y depends on X, Z depends on a package accumulated last
epoch. Draw what enters R!, R^Q, ω and ξ, and in which order they accumulate."

### Q7 ★ Do the whiteboard case aloud. Then change it: Z's prerequisite was accumulated *two* epochs ago. What happens to Z?
<details><summary>Model answer</summary>

X has no prerequisites and no segment-root lookups, so it is in R! and accumulates
immediately. Y and Z go to R^Q as (report, dependency set) after E removes any
dependency already in ξ∪. Z's prerequisite is in ξ (accumulated within the last epoch),
so its set becomes empty; Y's set still holds X. The queue q is E applied to (the old ω
from slot m onward, then before m, then R^Q) with the hashes of R!, which strips X from
Y's set. Q then releases layer by layer: first everything with an empty set (Y and Z, in
queue order), then repeats. So R* = [X, Y, Z]. If Z's prerequisite was accumulated two
epochs ago it is no longer in ξ, which only holds E slots; Z's dependency never clears,
Z sits in ω and ages out after an epoch. The Graypaper accepts this: a dependency on
work older than an epoch cannot be satisfied. A deep answer answer adds that chapter 11 normally
stops this earlier: a guarantee is valid only if each prerequisite is in the same extrinsic
or among β's reported packages (the last eight blocks), so a report depending on a package
last seen two epochs ago is rejected at reporting time (sec:contextualvalidity).

</details>
*Gap to watch for:* not knowing ξ is bounded by an epoch, or releasing Y before X is stripped.

### Q8 ★ Explain the gas rule that decides how many reports are accumulated in one pass, and why the recursion exists at all.
<details><summary>Model answer</summary>

Δ+ takes the largest prefix i of the report sequence such that the sum of the digest
gas limits in that prefix, plus the gas of the pending deferred transfers, plus the sum
of the always-accumulate allowances, is at most the budget g (eq. accseq). It runs the
parallel step on that prefix, then recurses on the remaining reports with budget
g* = g + gas of the transfers just emitted minus the gas actually used, passing those
transfers in and an empty allowance map. The recursion exists because gas actually used
is only known after execution and because transfers emitted in one pass must be
delivered in a later one; the prefix rule keeps every pass within budget using limits,
so no pass can overrun. The block budget is g = max(G_T, G_A·C + Σ allowances), G_T being
3.5 × 10⁹ at full and 2 × 10⁷ at tiny, and G_A = 10⁷ the per-report accumulate cap
(eq. finalstateaccumulation). Follow-up: why add the emitted transfers' gas to
g*? Because the sender already paid for it inside its own limit; it is not new budget.

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0 in Δ+</div>

In 0.7.2 the prefix counted digest gas limits only, and the recursion got g* minus the gas
used, with g* = g plus the gas of the transfers passed *in*. In 0.8.0 the prefix also
counts the incoming transfers' gas and the always-accumulate allowances, g* adds the gas of
the transfers just *emitted*, and Δ+ returns the processed transfers as a fifth output,
which feed the transfer count T(s) in the accumulation statistics (eq. accseq,
eq. accumulationstatisticsdef). Two Graypaper PRs: #500 changed the prefix and g*, #502
added the processed-transfers output and T(s).

</div>

</details>
*Gap to watch for:* thinking gas is checked after execution, or not knowing why transfers add to g*.

### Q9 ★ Two services both create a new service in the same block. Can they collide, and what does the Graypaper do if they do?
<details><summary>Model answer</summary>

By construction they should not: each accumulate context starts with a next-free-id
derived from Blake2b(service id, η₀', slot) passed through check(), which skips ids that
already exist, and each `new` advances by 42 through check() again. If two invocations
nevertheless contribute the same index to the new-services set (or the same index to the
removed set), the merge step declares the block invalid (eq. accpar). The Graypaper's
argument is that this cannot normally happen because indices are chosen to avoid
conflicts and removable services have no executable code. Follow-up: what about the
registrar? It may choose ids below 2¹⁶ explicitly; `new` returns FULL if the id is
taken, which is a result, not an invalid block.

</details>
*Gap to watch for:* not knowing the id derivation, or thinking collisions are silently resolved.

### Q10 ★ The manager service blesses a new delegator, and in the same block the old delegator designates a new validator set. Whose changes land in χ' and ι'?
<details><summary>Model answer</summary>

Both invocations run against the same starting partial state. The merge uses
R(old, manager's value, owner's value) for the privilege fields: the manager's change to
the delegator wins because the manager moved it, so χ'_v is the new delegator. ι' is
taken from the delegator's post-state, and the delegator for that purpose is the one
named in the *starting* state, so the old delegator's designate lands in ι'. Follow-up:
what did lasair get wrong here? B4: it let a manager that had just blessed itself the
delegatorship also designate in the same round; the reference gates the ι writeback on
the round-start delegator. Lesson: enforce privilege at the writeback. Second follow-up:
who may call `bless`? In 0.8.0 only the manager; any other caller gets HUH (Appendix B,
Ω_B), though the 0.8.0 test vectors still follow the older behaviour (GP #519 deviation).

</details>
*Gap to watch for:* not knowing that per-service results are merged from one starting state.

### Q11 A report accumulates and one of its digests belongs to a service whose code preimage is missing. What happens to that service, the other services in the same pass, and the statistics?
<details><summary>Model answer</summary>

Ψ_A for a service whose code is missing or oversize is a silent no-op: it returns the
partial state with nothing changed except that any incoming transfers' amounts are still
credited to its balance (none here), no transfers, no yield, zero gas used and no
provisions (eq. accinvocation). The other services in
the same parallel pass are unaffected because each runs independently and the merge
takes each one's own changes. Statistics record (items, transfers, gas) only for
services where at least one is non-zero; the digest still counts as an item for that
service, so it appears as (N, T, G) = (1, 0, 0) (eq. accumulationstatisticsdef; the
transfer count T is new in 0.8.0). Follow-up: is the report considered
accumulated? Yes: n counts reports, its package hash enters ξ', and it will not be
accumulated again.

</details>
*Gap to watch for:* claiming the block is invalid, or that the report is retried.

### Q12 What happens to ω when four slots are skipped between blocks?
<details><summary>Model answer</summary>

ω' is re-indexed cyclically around m = H_T mod E: slot m gets E(R^Q, hashes just
accumulated); every slot i with 1 ≤ i < τ' − τ, i.e. the four skipped slots, is
emptied; older slots keep their entries edited by E against the newly accumulated
hashes. Emptying skipped slots is what makes the epoch-long horizon exact in slots rather
than in blocks. Follow-up: and ξ? It always shifts by exactly one per block regardless of
the gap, with the newly accumulated hashes in slot E − 1.

</details>
*Gap to watch for:* not knowing skipped slots are emptied, or that ξ shifts per block.

### Q13 ★ A preimage arrives in E_P for a request that accumulation forgot in the same block. Valid block or not, and where in the transition is that decided?
<details><summary>Model answer</summary>

Valid. The extrinsic-level rule is checked against the *prior* δ: each (service, blob)
must be solicited and unprovided there, and the sequence must be ordered and unique
(eq. preimagesareordered). Integration happens last, δ' ≺ (E_P, δ‡, τ'), and the
Graypaper says preimages "no longer useful" due to accumulation are disregarded without
prejudice: if the request is closed in δ‡ the blob is simply not integrated. Follow-up:
why is the validity check against the prior state? Because a block builder cannot know
what accumulation will do when it assembles the extrinsic; the rule must be checkable
without running the block.

</details>
*Gap to watch for:* saying the block is invalid, or placing preimage integration before accumulation.

### Q14 Tell me about a bug lasair hit in this chapter.
<details><summary>Model answer</summary>

The 60-second version: "Seed 1502007736, step 6306: a service with 7 gas left wrote to
storage and then called checkpoint, which costs more than 7 (10 gas under 0.7.2, M_C = 103
under 0.8.0). Our implementation took the
snapshot inside the failing call, so when execution ran out of gas the revert went back
to a checkpoint that already contained the write. The reference charges first, cannot
pay, never snapshots, and reverts to the previous checkpoint, before the write. The
signature in our forensics was gas going to minus three. Rule: a host call that cannot
pay has no effect, and for checkpoint the effect is the revert target itself, the
exceptional dimension y of the context pair. What I learned: the Graypaper is exact
about when a side effect becomes real, and checkpoint is the one call whose side effect
is the meaning of every later panic." Source: Divergence Lab B5. If they ask for a
second: the dependency-layered accumulation from the seed campaign, no_forks step 46,
where a panicking layer must revert only itself (`docs/M1_PLAN.md`).

</details>
*Gap to watch for:* no story, or not connecting checkpoint to the (x, y) context pair.

**Part B mark:** ______

---

## Part C · Architecture · 20 minutes

**Opening prompt (whiteboard, 4 minutes).** "Draw the validator set as three columns:
what a validator does in-core, what it does on-chain, and what it does off-chain that is
neither. Put every extrinsic in the column that produces it."

### Q15 ★ What are the two halves of a service and why does the split, rather than the PVM, give JAM its scalability?
<details><summary>Model answer</summary>

Refine and accumulate. Refine is stateless, runs in-core on a core's guarantors only,
takes arbitrary external input and distils it to a small digest; accumulate is stateful,
runs on-chain by every node, and folds digests into state. The PVM is the same in both.
Scalability comes from the split: refine's cost is paid by a subset of validators per
core, so total in-core work scales with the number of cores (the Graypaper expects
upwards of 300 times a single machine), while accumulate is kept small enough for
everyone to run. Follow-up: what makes in-core results trustworthy? Guaranteeing puts
economic cost on invalidity, assuring makes the inputs available, auditing and judging
check validity by parties expected to be honest.

</details>
*Gap to watch for:* attributing scalability to the VM, or not knowing refine is stateless.

### Q16 ★ Name the two consensus mechanisms and say which of the three fork goals each delivers.
<details><summary>Model answer</summary>

Safrole governs block production and Grandpa governs finality. The three goals in
chapter 4: two heads should rarely form (Safrole: one anonymous ticket-holder per slot,
fixed ahead of time), two heads should resolve quickly (both), and a block not much older
than the head should be identifiable as finalized in perpetuity (Grandpa). Follow-up:
when must a node deliberately fork? When a chain contains a report that any block's
state has judged invalid; Grandpa must not finalize such an extension.

</details>
*Gap to watch for:* not knowing why Safrole reduces forks, or leaving out the disputes-driven revert.

### Q17 A work-package's data has to be somewhere for 28 days and somewhere else only until it has been audited. What are the two stores and which one does the assurances extrinsic attest?
<details><summary>Model answer</summary>

The short-term Audit DA holds the auditable bundle (the encoded work-package, its
extrinsic data and the self-justifying imported segments), erasure-coded across validators
and kept only until the report is audited (chapter 16), or in chapter 14's phrasing until
finality of the block in which its availability is assured. The long-term Import DA, which
the paper calls the D³L (Distributed, Decentralized, Data Lake), holds the exported
segments with their Paged-Proofs metadata for at least 28 days (672 epochs) so later
packages can import them (chapter 14, Exporting; chapter 16). The assurances extrinsic attests both: a set bit says the validator holds its
shard of the bundle and its shards of the exported segments for that core's availability
assignment, and more than two-thirds of the active set makes the report available
(eq. availableworkreports). Follow-up: why erasure-code at all? So that any 𝒟(v) of the v
chunks, about a third (342 of 1023), rebuild the data even if almost two-thirds of the
validators are malicious or offline (eq. ecoriginalshards). In 0.8.0 the rate depends on
the validator count v, and a report's erasure-shard count must equal |κ'| (chapter 11).

</details>
*Gap to watch for:* not distinguishing the two stores, or not linking one-third to erasure coding.

### Q18 What in the architecture guarantees that on-chain accumulation cannot be starved by a flood of in-core work?
<details><summary>Model answer</summary>

Several caps stack: each core may report at most one work-report per block, a report's
digests may carry at most G_A = 10 M gas of accumulate limits in total (chapter 11), and
the block budget g = max(G_T, G_A·C + Σ allowances) is sized so that every core's report
plus every always-accumulate service fits. Work beyond the budget is not dropped but
deferred: the ready queue holds reports for an epoch, and dependency ordering is
preserved. Follow-up: what is core time in this picture? The prepurchased resource that
lets an authorizer's packages be reported on a core at all; gas is the on-chain measure
of what accumulation then costs.

</details>
*Gap to watch for:* not knowing there is a per-report accumulate gas cap.

### Q19 ★ Which pieces of state does a light client need to follow the validator set, and which header fields carry them?
<details><summary>Model answer</summary>

The epoch marker in the header: on the first block of an epoch it carries the prior
entropy values η₀ and η₁ (which become η₁' and η₂') and the Bandersnatch and Ed25519 keys
of γ_P', the validators who take over in the *next* epoch (eq. epochmarker; since 0.8.0 a
length-prefixed list, as the set size may change). So a client learns each set an epoch
ahead and can verify fallback seals and guarantee, assurance and judgment signatures
without state. The winners marker supplies the next epoch's ticket
identifiers so ticket-mode seals can be checked. The offenders marker tells it which
keys to distrust. Follow-up: what can it not do without state? Validate extrinsics: that
needs δ, ρ, β and the rest.

</details>
*Gap to watch for:* not knowing what the markers are for.

**Part C mark:** ______

---

## Part D · Rationale · 20 minutes

**Opening prompt (2 minutes).** "In three sentences: what did Polkadot get right, what
did it get wrong, and what does JAM keep?"

### Q20 ★ The Graypaper says both Ethereum's model and Polkadot's model are patterns JAM wants to support. Where in the design does that dual support live, and what did it cost?
<details><summary>Model answer</summary>

In the authorization system (chapter 8). Ethereum-style: the resource is bought at
submission by the account that wrote the work. Polkadot-style: a slot is bought for
months by a team unrelated to the block author. JAM separates buying coretime from
specifying work: coretime is prepurchased and assigned to an authorization agent, and an
authorizer decides which packages may consume it. The cost is an extra layer, the pool
and queue per core and the is-authorized PVM invocation in every package, and the loss
of a simple "who pays" story: there is no transactor. Follow-up: what replaces the
transaction nonce? Nothing; service accounts are not key-controlled, so they need none.

</details>
*Gap to watch for:* not connecting the two patterns to authorization.

### Q21 ★ Why does the Graypaper accept an 8-hour audit margin on top of a 24-hour lookup anchor, and what would go wrong with a shorter expunge period?
<details><summary>Model answer</summary>

A refine may perform historical lookups as of the lookup anchor, which may be up to
24 hours old. Audits of that refinement can happen for some time after the report, so a
preimage that was available at the anchor must still be retrievable when the audit runs,
otherwise auditors and guarantors could see different data and honest disagreement would
look like fraud. The expunge period D of 19 200 slots (32 hours) is the anchorage plus
an eight-hour margin for exactly this. Shorter, and an honest auditor could be unable to
reproduce a valid refinement. Follow-up: what enforces it? `forget` and `eject` in
Appendix B only remove a provided preimage once its request has been unavailable for
longer than D (both require a status [x, y] with y < t − D).

</details>
*Gap to watch for:* not knowing D is derived from the anchorage plus a margin.

### Q22 Why does JAM put the accumulation-output commitment in recent history with Keccak rather than in the header?
<details><summary>Model answer</summary>

The header is minimal by design: it carries what a light client and Safrole need. The
belt is a bridge artefact: an append-only commitment to every block's accumulation
outputs, so an external chain can verify that a service yielded a value at a given block
with a compact proof. Keeping it in state with a super-peak per block lets the proof
size stay logarithmic without the header growing, and Keccak lets Ethereum-style
verifiers use a cheap precompile. Follow-up: is the belt part of the state root? Yes,
via β, so it is committed by every subsequent header's prior-state-root field.

</details>
*Gap to watch for:* not knowing the belt exists for bridges.

### Q23 Why is the fuzzer, and not a reference implementation, the arbiter of conformance?
<details><summary>Model answer</summary>

Because JAM's resilience goal requires multiple independent implementations and no
single client to be "the protocol": the Graypaper is the only authority. A reference
client would become the de facto specification and its bugs would become the protocol.
Shared test vectors and a black-box fuzzer let clients prove agreement with each other
without reading each other's code, which is also why the prize rules forbid copying.
This is the property lasair exploited: byte-exact conformance proven against vectors,
PolkaJam used only as a black-box oracle. Follow-up: what does that make of the
Graypaper's precision? Load-bearing: an ambiguity becomes a divergence somewhere.

</details>
*Gap to watch for:* not linking "no reference implementation" to resilience.

### Q24 ★ Give the Graypaper's argument against validity proofs, then give the best counterargument you know, then say why JAM still chose auditing.
<details><summary>Model answer</summary>

Argument: proving computation in a SNARK is orders of magnitude more expensive than
executing it, the Graypaper cites multipliers in the tens of thousands to tens of
millions, and proving tends to centralise on specialised hardware. Counterargument:
proofs are non-interactive and permanent, need no honest-auditor assumption, and the
cost keeps falling. JAM's choice: with a large, fixed, staked validator set already
present, a crypto-economic audit (ELVES) gives comparable security at execution cost,
keeps generality (any PVM program, not only circuits), and stays resilient to hardware
centralisation; and the design does not forbid a service from verifying proofs
in-core when it wants them, which is exactly what lasair's ZK service does. Measured on
lasair under the 0.8.0 gas model, one Groth16 verify costs about 247 M gas: about 5% of a
package's 5 × 10⁹ refine allowance G_R, but about 25 times a report's whole 10⁷
accumulate allowance G_A, so the check belongs in refine (jamswap
`docs/LASAIR_INTERNALS.md`). Follow-up:
what is the honest cost of auditing? Latency to finality and the need for a dispute
mechanism, which is chapter 10.

</details>
*Gap to watch for:* only one side of the argument, or not knowing proofs remain possible in-core.

**Part D mark:** ______

---

## Part E · Host calls, serialization, Merklization · 25 minutes

**Opening prompt (whiteboard, 3 minutes).** "Draw the accumulate context pair. Label
which host call writes the second dimension, and what the collapse function picks on
each exit reason."

### Q25 ★ A service calls `transfer` with a valid destination and enough balance, then panics before returning. Does the transfer happen? Now it calls `checkpoint` between the two. Does it happen now?
<details><summary>Model answer</summary>

No, then yes. `transfer` deducts the amount from the caller's balance in the regular
dimension x and appends the deferred transfer to x's transfer list; it returns OK and
charges M_T + l = 575 + l gas, the transfer's gas l included (a failed transfer charges
only the 575). On panic the collapse function picks the exceptional dimension y,
which only `checkpoint` ever writes, so without a checkpoint y is the initial context
and neither the deduction nor the transfer exists. With a `checkpoint` after the
transfer, y ← x includes both, so the panic reverts only what happened after the
checkpoint: the transfer is delivered in the next Δ+ pass and its gas adds to the
destination's budget. Follow-up: what if the destination's minimum memo gas is higher
than l? LOW is returned and nothing changes; the checks are WHO, LOW, CASH in that order
after the memo read, and a bad memo pointer panics.

</details>
*Gap to watch for:* not knowing transfers are deferred, or not knowing what checkpoint copies.

### Q26 ★ Walk through the lifecycle of a preimage request from the service's point of view: which host calls, what the request record looks like at each step, and how expiry works.
<details><summary>Model answer</summary>

`solicit(hash, length)` creates the request with an empty status [] (or, if the record
is [x, y], meaning available then unavailable, appends the slot to make it [x, y, t],
re-requesting); it returns FULL if the balance falls below the threshold after the new
item. The preimage arrives either through E_P after accumulation (integration sets the
status to [τ']) or through `provide` from any service during accumulation, recorded as a
provision and integrated at the merge. `query` reads the status back as a count in the
low bits of r7 with the slots packed into the high bits and r8. `forget` drops a request
that is [] or was made unavailable more than D slots ago, or marks an available one
unavailable ([x] → [x, t]), or trims a [x, y, w] with y expired to [w, t]. Expiry is
D = 19 200 slots at full, 32 at tiny. Follow-up: who else may remove it? `eject`, by the
service whose id the target's code hash names, once the request has expired and the
target holds exactly the two required items.

</details>
*Gap to watch for:* not knowing the status is a sequence of up to three slots.

### Q27 Why are host-call arguments validated against memory before any state lookup, and which lasair bug is the proof?
<details><summary>Model answer</summary>

Because the Graypaper's host-call definitions read the argument memory first: an
unreadable pointer panics the invocation regardless of what the arguments would have
named. Only then are state lookups made and WHO, NONE and the rest returned. Since a
panic collapses to y and a result lets execution continue to a possible yield, the order
is protocol-visible through θ. B2 is the proof: lasair resolved a missing service and
returned NONE before checking a key pointer, producing a yield where the reference
panicked (seed 431662357, step 595). Follow-up: what did the fix generalise to? An audit
of every host call for the same shape, and the "panic if unreadable" row ordered first
in the tables.

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0 in Appendix B</div>

`solicit`, `forget`, `query` and `provide` now check the length register first: a length
z of 2³² or more returns HUH before the hash or blob pointer is read (GP #520). That is
still argument validation before any state lookup. Every host call is also priced by its
own table entry, with a per-1024-octet term for memory-sized calls (eq. fnmemgas), instead
of a flat 10, and `grow_heap` took id 1, moving every later id up by one.

</div>

</details>
*Gap to watch for:* thinking argument order is an implementation detail.

### Q28 ★ Encode the header's timeslot 4 807 as the codec would inside the header, and then encode the same number as a compact natural. Explain why the two differ.
<details><summary>Model answer</summary>

Inside the header the slot is ℰ₄: four octets little-endian, 4 807 = 0x12C7, so
C7 12 00 00. As a compact natural, 4 807 lies in [2⁷, 2¹⁴), so l = 1: the prefix octet is
2⁸ − 2⁷ + ⌊4807 / 256⌋ = 128 + 18 = 146 (0x92), followed by 4807 mod 256 = 199 (0xC7):
92 C7. They differ because a term written with a width subscript, as the header writes
ℰ₄(H_T), is always exactly that many octets, while the unsubscripted ℰ is the compact
general natural encoding used for lengths and other naturals (Appendix C). Fixed widths
do not make every header the same length: the markers and the offenders sequence make
headers variable-length. The slot does sit at a fixed offset, octet 96, after the three
header hashes. Follow-up: how many octets can a compact natural
take? At most nine: a 0xFF prefix followed by eight octets.

</details>
*Gap to watch for:* not knowing the compact prefix rule, or which fields are fixed width.

### Q29 Describe the three trie node layouts and say which bit decides each, then explain why the 0.8.0 vectors had to "clarify" something the text never changed.
<details><summary>Model answer</summary>

Nodes are 64 octets. Branch: first bit 0, then 255 bits of the left child's hash (its
first bit dropped) and the full 256 bits of the right child's. Embedded leaf: first bit
1, second bit 0, six bits of value length, the 31-octet key, the value zero-padded to
32 octets. Regular leaf: first bit 1, second bit 1, six zero bits, the key, and
Blake2b(value). Keys are consumed as bits(key), most-significant bit first, so the
discriminators are the top bits of octet 0 (0x80 and 0x40). The earlier trie test
vectors had put the discriminators in the low bits; the 0.8.0 vectors' "Fixes" entry
corrected the vectors to the text's reading (discriminators in the most significant bits,
key bits consumed MSB first). lasair's own trie was already MSB-first, its genesis root
matched PolkaJam's; only a test-harness copy written to match the old vectors was wrong,
and deleting it made Trie 11/11 (`docs/GP_0_8_0_PLAN.md`, Phase 2). Follow-up: what is the
identity of an empty sub-trie? The zero hash.

</details>
*Gap to watch for:* not knowing there are two leaf kinds.

### Q30 Show the MMB after appending four items to an empty belt, then give the super-peak.
<details><summary>Model answer</summary>

Start []. Append a: position 0 is beyond the length, so [a]. Append b: position 0 is
occupied, clear it and carry H(a ++ b) to position 1, which is beyond the length, so
[∅, H(ab)]. Append c: position 0 empty, so [c, H(ab)]. Append d: position 0 occupied,
carry H(cd) to position 1, occupied, carry H(H(ab) ++ H(cd)) to position 2, beyond the
length: [∅, ∅, H(abcd)]. Non-empty peaks: one, so the super-peak is H(abcd) itself. With
two non-empty peaks h₀ and h₁ it would be Keccak("$peak" ++ superpeak([h₀]) ++ h₁) =
Keccak("$peak" ++ h₀ ++ h₁). H here is Keccak because the belt is the accumulation log.
Follow-up: how is the belt encoded in state? As a length-prefixed sequence of optionals,
∅ as a 0 octet and a present peak as 1 followed by the hash.

</details>
*Gap to watch for:* not knowing peaks can be empty, or hashing the super-peak of one peak.

### Q31 Which state items are keyed by a service id, and why are the service octets interleaved with the hash octets in the key?
<details><summary>Model answer</summary>

Account metadata is C(255, s): chapter octet 255 with the four service octets spread at
positions 1, 3, 5, 7 and zeros between. Storage values, preimage octets and preimage
request statuses are C(s, h): the four service octets interleaved with the first four
octets of Blake2b(h), then the remaining hash octets, with the h chosen so the three item
kinds cannot collide (storage uses ℰ₄(2³² − 1) ++ key, preimages ℰ₄(2³² − 2) ++ hash,
requests ℰ₄(length) ++ hash). The Graypaper states no reason for the interleaving. What
the layout does: only octet 0 (the low octet of the service id) comes before a hash octet,
so a service's items are *not* adjacent in the trie; they share an 8-bit prefix and then
scatter by hash. What the paper does state is that storage keys cannot be inspected or
enumerated, so implementations need never store the raw keys. Follow-up: are the numbers
inside state values compact? No: the paper says all non-discriminator numeric
serialization in state is fixed-length for its term. Only discriminators, such as length
prefixes, are compact naturals, which is exactly the Q32 bug.

</details>
*Gap to watch for:* not knowing the account record has its own chapter constant.

### Q32 Tell me about a bug lasair hit in this appendix.
<details><summary>Model answer</summary>

The 60-second version: "The tiny-to-full audit found that the ticket accumulator's
length was written as a single octet. It is a sequence of at most E tickets, and its
length is a compact natural: identical for E = 12, wrong for E = 600, where it takes
two octets. Every vector and every fuzz seed we had run was tiny, so the bug was
invisible until the full-spec lane. Two siblings had the same shape: widths and vote
counts computed from the validator count at link time, frozen at six when the process
switched to 1023. The fix made every width a function of the active spec and added a
lint that fails any constant that is not. What I learned is chapter 3's sentence: an
octet serializes to itself, a natural may take several octets, and a value that is small
in one configuration is not small in the other." Source: F4 and F5 in
`docs/TINY_TO_FULL_AUDIT.md`. Follow-up: what did 0.8.0 change here? The validator sets
themselves are now length-prefixed in state (↕γ_P at C(4), ↕ι, ↕κ, ↕λ at C(7) to C(9))
because a set may be any multiple of three from 6 to 1023 (eq. valcount).

</details>
*Gap to watch for:* no story, or not knowing why tiny hid it.

**Part E mark:** ______

---

## Marking sheet

| Part | Covers | Mark | Notes |
|---|---|---|---|
| A | Ch. 7 Recent History | | |
| B | Ch. 12 Accumulation | | |
| C | Architecture | | |
| D | Rationale | | |
| E | Host calls, codec, trie | | |

## Debrief: what separates a working answer from a deep one

1. **Two structures, two horizons.** A working answer knows β rejects duplicates. A deep answer says β
   covers eight blocks of *reported* packages for the guarantee check, ξ covers one epoch
   of *accumulated* packages for the dependency check, and explains why both exist.
2. **Order is the specification.** A working answer describes accumulation as "run the reports". A
   deep answer names Q's layers, the prefix rule on limits, the parallel-by-service merge from
   one starting state, and can say which lasair divergence each of those rules produced.
3. **The 0.8.0 line.** A deep answer adds, unprompted: "lasair's M1 build targeted 0.7.2 and lasair
   2.0.0 now targets 0.8.0; in 0.8.0 recent-history entries carry the slot, Δ+'s prefix
   rule also counts transfer gas and always-accumulate allowances, accumulation statistics
   count transfers, and host calls are priced individually with grow_heap at index 1."
   The registrar is not new: it joined the privileges in 0.7.1.
