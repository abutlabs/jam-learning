---
title: "Ch. 12 Accumulation"
duration: 75 min
exam_portion: random
exam_bucket: large
gp_chapter: 12
gp_words: 2495
gp_tex: text/accumulation.tex
lasair: lib/accumulation.ml, lib/pvm_host.ml, conformance/accumulate_stf.ml, conformance/accumulate_stf_v2.ml, conformance/preimages_stf.ml
---

# Ch. 12 Accumulation

<span class="lecture-badge">M1 Understanding · Graypaper ch. 12</span>

Accumulation is the on-chain half of JAM's execution model: the only place service
state changes. Available work-reports are ordered by their dependencies, batched by
service, run through the Accumulate entry point of each service within a block gas
budget, and their effects (storage, balances, transfers, privilege changes, the next
validator set, the authorizer queue) are folded into state. It is where every divergence
in lasair's three banked L2a fuzz reports occurred, so it is both the hardest chapter
and the one with the most evidence to show.

## Examiner sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| ξ | accumulated | E-length sequence of sets of package hashes accumulated per slot; ξ∪ is their union (eq. accumulatedspec) |
| ω | ready queue | E-length sequence of (report, unmet dependency hashes) waiting on prerequisites (eq. readyspec) |
| δ → δ† → δ‡ → δ' | service accounts | δ† after accumulation (eq. accountspostaccdef), δ‡ after the `lastacc` stamp, δ' after preimage integration |
| χ | privileges | manager **m**, per-core assigners **a**, delegator **v**, registrar **r**, always-accumulate map **z** (service → free gas) |
| ι | staging validators | set by the delegator's accumulate |
| φ | authorizer queue | per core, set by that core's assigner's accumulate |
| θ' | accumulation outputs | the set **b** of (service, yield hash) pairs; feeds β' |
| **S** | accumulation statistics | per service (items N, transfers T, gas G), eq. accumulationstatisticsdef → π'_S |

### Inputs
**R** (newly available reports from ch. 11), H_T / τ' (slot m = H_T mod E), E_P preimages,
and the partial state (δ, ι, φ, χ).

### The transition in plain English
**1. Queueing (eq. readyspec … justbecameavailable*).** Split **R**: reports with no
prerequisites and an empty segment-root lookup go to R! (accumulate now); the rest go to
R^Q as (report, dependency set) after removing dependencies already in ξ∪. Build the
candidate list: every entry of ω from slot m onward then before m (oldest first, cyclic),
then R^Q, all edited by E(·, hashes of R!) which drops entries now satisfied and prunes
their dependency sets. Q releases layer by layer: everything with an empty dependency
set, then repeat after removing those hashes, until nothing is free. R* = R! ⌢ Q(q).

**2. Execution (eq. accseq, accpar, accone).** Δ+ takes a gas budget g, transfers **t**,
reports **r**, partial state, and the always-accumulate map **f**. It finds the largest
prefix i of **r** whose digest gas limits, plus transfer gas, plus free gas, fit in g;
runs Δ* on that prefix; then recurses on the remainder with the gas left (g plus the gas
of the transfers just emitted minus the gas actually used), carrying the new transfers
and an empty **f**. Δ* groups by service: the set **s** of every service that has a
digest, a free-gas entry, or is a transfer destination; runs Δ₁ for each; then merges.
Δ₁ for service s computes its gas g = free gas + gas of transfers to s + digest limits
for s, builds operands (transfers to s first, then one operand tuple per digest of s in
report order), and invokes Ψ_A(partial state, τ', s, g, operands). Result: post-state,
emitted transfers, optional yield hash, gas used, preimage provisions.

**3. Merging (eq. accpar).** Accounts: union of each service's changes, new services
added, removed services deleted; conflicting indices invalidate the block. Privileges use
R(old, manager's value, owner's value): the manager's change wins if the manager changed
it, else the owner's own change (so privileges can be "owned" and the manager can
remove itself). ι' comes from the delegator's post-state; φ'[c] from assigner c's
post-state; manager and always-accumulate from the manager's. Provisions (preimages
supplied by `provide`) are integrated with I into services whose request is still open.

**4. Final integration (eq. finalstateaccumulation).** The block budget is
g = max(G_T, G_A · C + Σ free gas) with G_T = 3.5 × 10⁹ (2 × 10⁷ tiny) the block total and G_A = 10 M the per-report accumulate allocation. Δ+ is called with
empty transfers, R*, the partial state and **z**. n reports were accumulated. θ' = the
yield set **b**. Statistics per service: (items accumulated, transfers received, gas
used), only for services with non-zero activity. δ‡ additionally stamps
`lastacc = τ'` on every service in the statistics. ξ' shifts left by one and stores the
hashes of the n accumulated reports in its last slot; ω' is re-indexed: slot m holds
E(R^Q, accumulated'), slots skipped since τ are emptied, older slots keep their entries
edited by E.

**5. Preimage integration (eq. preimagesareordered …).** E_P is a sequence of (service,
blob), ordered and unique, each solicited in the *prior* δ but not yet provided. Each is
integrated into δ‡ via I: the request entry for (hash, length) becomes [τ'] and the
blob is stored, but only if the request is still open after accumulation; otherwise it
is silently disregarded. Result: δ'.

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| ξ has E entries, ω has E entries | unbounded queues; one epoch is the dependency horizon |
| a report waits only for dependencies not in ξ∪ | blocking on work already accumulated |
| Q releases layer by layer, in order | accumulating before a prerequisite; non-deterministic order |
| largest prefix whose (digest limits + transfer gas + free gas) ≤ g | exceeding the block accumulation budget; execution is sequential because real gas use is only known afterwards |
| per-service gas = free + transfer gas + digest limits | one service starving another; each invocation is bounded up front |
| conflicting new/altered/removed service indices → block invalid | two services claiming one index in one block |
| R(o, a, b) for privileges | a service and the manager both changing a privilege; manager wins if it moved it |
| provisions and E_P only into open requests, checked against prior δ for E_P | providing unsolicited data; integrating after accumulation dropped the request |
| E_P ordered unique | duplicates, non-canonical blocks |
| g_block = max(G_T, G_A · C + Σz) | the budget being smaller than the guaranteed per-report allocation |
| statistics only for non-zero (N, T, G) | phantom entries changing π's encoding |

### Edge cases
- **Dependency loop** (A needs B, B needs A): both sit in ω until they age out after an
  epoch; the Graypaper accepts this.
- **Empty block** still accumulates: ω may release reports whose dependency landed in an
  earlier block; ξ still shifts.
- **Skipped slots** (τ' − τ > 1): the ω slots in between are emptied.
- **Gas exhaustion mid-prefix**: Δ+ chooses i from *limits*, so a prefix always fits;
  unused gas from a report flows to the next recursion.
- **Deferred transfers** are delivered in the *next* Δ+ round, not the same one; the
  destination's Δ₁ receives them as its first operands and their gas adds to its budget.
- **Manager removes itself**: allowed; R lets the owner's change stand when the manager
  did not move that privilege.
- **Preimage provided twice** (once by `provide` during accumulation, once in E_P): the
  E_P copy is disregarded because the request is no longer open.

### War story
<div class="lasair-connection">

**Dependency-layered accumulation, and B1–B6.** Every divergence in lasair's three
banked L2a fuzz reports was in this chapter (`docs/CONFORMANCE_RETROSPECTIVE.md` §6:
"the only state that ever differs is the Accumulate service-execution output"; the one
live L2b divergence outside it was F6, a statistics width, see ch. 11 and 13). The structural one came
first: the seed campaign in `docs/M1_PLAN.md` diagnosed that accumulation must run
**layer by layer** exactly as Q(r) emits it, and that a panicking layer must revert only
itself (fixing no_forks step 46 and ~22 seeds); the comment at
`conformance/accumulate_stf.ml` "The layered order IS the accumulation order; do NOT
re-sort back to queue order" is the scar. Then the Divergence Lab series: **B1** sorted θ by service id
alone instead of (service, hash), which changed β and the root when one service yielded
twice (seed 1551410130, step 2854). **B2** resolved a missing service before
range-checking the key pointer, producing a spurious yield where the reference panics
(seed 431662357, step 595). **B3/B6** returned NONE for foreign-service storage and
preimage reads because the closure never loaded another service's state. **B5** took a
checkpoint snapshot inside a `checkpoint` call it could not pay for (gas 7, cost 10,
result −3; 10 was 0.7.2's flat host-call price, 0.8.0 prices `checkpoint` at
M_C = 103), so the out-of-gas revert kept a write the reference undid (seed 1502007736,
step 6306). Lesson: the Graypaper's Δ functions are exact about *order* (layers, operand
order, set order) and about *when* a host call's side effect becomes real; every one of
these is protocol-visible through θ and β.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- Δ+ now returns the sequence of **processed transfers** as a fifth output (GP #502).
  Its prefix condition counts transfer gas and free gas alongside digest limits, and the
  recursion's remaining gas is g + gas of the *new* transfers − gas used (both GP #500).
  In 0.7.2 the prefix counted digest limits only and the recursion was credited with
  the gas of the transfers being *consumed* (g + Σ t_g − Σ u).
- Accumulation statistics are now (item count, **transfer count**, gas) per service,
  recorded when any is non-zero (formerly (gas, count)). This is the
  `accumulate-transfer-count` field. (GP #502)
- The staging-set field of the partial state is the bounded validator-set type rather
  than a fixed-V sequence: its length lies in 𝕍, the multiples of 3 from 6 to 3C
  (eq. valcount, GP #514). Correspondingly `designate` takes a count z, reads 336·z
  octets (panicking if unreadable), then answers HUH if z ∉ 𝕍 or the caller is not the
  delegator. The "accumulation input" alias 𝕀 was dropped (𝕀 now names the inner-PVM
  type), but Ψ_A still takes **one** sequence ⟦𝕌 ∪ 𝕏⟧: the transfers to s, then its
  operand tuples (eq. accone, accinvocation).
- The privilege set itself is unchanged (manager, assigners, delegator, registrar and
  the always-accumulate map all existed in 0.7.2). What changed is the `bless` host
  call: the 0.8.0 text returns HUH unless the caller is the manager (GP #519); the
  0.8.0 vectors deviate from that text pending GP #558, so lasair follows the vectors
  (see the delta sheet and App. B).
- Not in accumulation.tex but it changes every u, and so G in S: PVM gas is now charged
  per basic block, on entry, by a pipeline cost model (App. A), and host calls are
  priced by the App. B table (constants M_*, eq. fnmemgas) instead of 0.7.2's flat 10;
  `grow_heap` took id 1, so every id from `fetch` (1 → 2) to `provide` (26 → 27) moved
  up by one (`bless` is now 15) while `gas` stays 0. (GP #508, #517)

</div>

### Source pointers
- `lib/accumulation.ml` — `partition_reports`, `get_ready_reports`, `update_ready_queue`,
  `rotate_history`, `report_gas`, `services_to_accumulate`, `accumulate_service`, `accumulate`
- `conformance/accumulate_stf.ml` — `build_accumulate_args`, `work_result_to_acc_item`,
  `execute_accumulate`, `apply_accumulate_stf` (see the layering comment near line 2197);
  `accumulate_stf_v2.ml` — `encode_accumulate_args`
- `lib/pvm_host.ml` — `host_transfer`, `host_yield`, `host_checkpoint`, `host_bless`,
  `host_assign`, `host_designate`, `host_new`, `host_eject`, `host_provide`, `host_read`
- `conformance/preimages_stf.ml` — preimage integration
- `docs/notes/accumulation.md`; lectures `011-graypaper-lectures/35…35d`; Divergence Lab

## Question bank

### Q1 ★ What are ω and ξ, how big are they, and how does a report move through them?
<details><summary>Model answer</summary>

ξ is E slots of sets of package hashes accumulated in the last epoch; ω is E slots of
(report, unmet dependencies) pairs made available but blocked. A newly available report
with dependencies has them pruned against ξ∪; if none remain it accumulates now,
otherwise it enters ω at the current slot. Each block, every ω entry has its
dependencies pruned against what was just accumulated; entries with none left are
released in dependency layers. Accumulated hashes go into ξ's newest slot as ξ shifts by
one; after E slots both a hash and a blocked report fall off.

</details>

### Q2 ★ Define the queue-editing function E and the priority queue Q.
<details><summary>Model answer</summary>

E(r, x) takes a queue of (report, deps) and a set of now-accumulated hashes x: it drops
every entry whose own package hash is in x and removes x from every remaining dependency
set. Q(r) returns the accumulation order: take g = entries with empty deps; if none,
stop; else emit g then recurse on E(r, hashes of g). The recursion is what makes order
deterministic and dependency-respecting; lasair's bug was flattening it.

</details>

### Q3 ★ Explain Δ+ (outer), Δ* (parallel) and Δ₁ (single service) and how gas flows through them.
<details><summary>Model answer</summary>

Δ+ picks the longest report prefix whose digest gas limits plus pending transfer gas
plus free gas fit the budget, runs Δ* on it, and recurses on the rest with budget
g + gas of newly emitted transfers − gas actually used, passing those transfers in and
an empty free-gas map. Δ* identifies the services involved (digests, free-gas entries,
transfer destinations), runs Δ₁ on each independently against the same starting state,
and merges results. Δ₁ computes the service's gas as free gas + incoming transfer gas +
its digest limits, assembles operands (transfers first, then digests in report order)
and calls Ψ_A. The emitted transfers' gas is added back because the sender already paid
it: `transfer` costs M_T + l when it queues, so l sits inside the sender's u and is
handed on to the recipient's next-round budget. Sequential-by-prefix because real gas
use is unknown until after execution; parallel-by-service to amortise PVM setup.

</details>

### Q4 What is an operand tuple and what is a deferred transfer?
<details><summary>Model answer</summary>

An operand tuple is what accumulate sees per work-item: package hash, segment root,
authorizer hash, payload hash, gas limit, authorizer trace, and the result blob or
error. A deferred transfer is (source, destination, amount, 128-byte memo, gas); it is
emitted by one service's accumulate and delivered to the destination in the next Δ+
round as an operand, its gas adding to the destination's budget. Together they are the
inputs of Ψ_A.

</details>

### Q5 ★ How are the results of parallel per-service accumulation merged, and what makes a block invalid here?
<details><summary>Model answer</summary>

Accounts: start from the pre-state, add every service newly created by any invocation
(n), delete every service removed by any invocation (m), take each invoked service's own
altered state, then integrate provisions. If two invocations contribute the same index
to n or m the block is invalid (the Graypaper argues this cannot normally happen: new
indices are chosen to avoid conflicts and removable services have no executable code).
ι' from the delegator's post-state; φ'[c] from assigner c's; manager and free-gas map
from the manager's; assigners, delegator and registrar via R.

</details>

### Q6 What does R(o, a, b) do and why?
<details><summary>Model answer</summary>

R returns b (the privilege owner's new value) if the manager left the privilege
unchanged (a = o), otherwise the manager's value a. It lets a privileged service change
its own role while the manager retains override, and it lets the manager service be
removed: nothing forces the manager to exist for privileges to be updated.

</details>

### Q7 ★ What is the block accumulation gas budget and where do the two terms come from?
<details><summary>Model answer</summary>

g = max(G_T, G_A·C + Σ free gas), with G_T = 3.5 × 10⁹ (tiny 2 × 10⁷) the block
accumulation total, G_A = 10 M the per-report accumulate allocation (ch. 11 caps each
report's digest limits at this), and C the core count. The Definitions appendix says G_T
"should be no smaller than G_A·C + Σ free gas": the second term guarantees that if every
core delivered a max-gas report and every always-accumulate service used its allowance,
the block could still process them all; G_T is the floor. (G_R, 5 × 10⁹, is the refine
gas and plays no part here.) Why it matters in practice (a jamswap measurement, not GP
text): under 0.8.0's gas model one in-PVM Ed25519 verify costs ~5.29M gas, over half a
report's whole G_A, so signature checks belong in refine.

</details>

### Q8 How are θ', the accumulation statistics and δ‡ derived from the top-level Δ+ result?
<details><summary>Model answer</summary>

Δ+ returns (n, partial state', b, u, t): number of reports accumulated, the new partial
state (giving δ†, i.e. δ‡ before the `lastacc` stamp, plus ι', φ', χ'), the yield set
b which becomes θ' (a set of (service, hash), sorted by the full tuple when encoded),
per-service gas u, and the processed transfers t. Statistics per service: N = digests
of that service among the first n reports, T = transfers delivered to it, G = its gas;
recorded only if not all zero. δ‡ then sets `lastacc = τ'` for each service in the statistics.

</details>

### Q9 How are ξ' and ω' computed at the end of the block?
<details><summary>Model answer</summary>

ξ' shifts every slot down by one and puts the hashes of the n accumulated reports in
slot E−1. For ω', with m = H_T mod E: slot m holds E(R^Q, newly accumulated); every
slot between the previous block's slot and now (skipped slots) is emptied; older slots
keep their entries, edited by E against the newly accumulated set. Indexing is cyclic,
so an entry is dropped when its slot is reused an epoch later.

</details>

### Q10 ★ Describe preimage integration and why it happens after accumulation.
<details><summary>Model answer</summary>

E_P is a sequence of (service, blob) ordered and unique; each must have been solicited
in the prior δ (request for (hash, length) exists and is empty) and not yet provided.
After accumulation, I integrates each into δ‡: only if the request is still open, set
the request to [τ'] and store the blob under its hash; otherwise disregard without
error. It runs last because accumulation may have forgotten the request, provided the
preimage itself, or removed the service; the ch. 4 graph states δ' ≺ (E_P, δ‡, τ').

</details>

### Q11 What can accumulate change in state that refine cannot?
<details><summary>Model answer</summary>

Everything stateful: its own storage and preimage requests, balance transfers to other
services (deferred), creating and ejecting services, upgrading its code, checkpointing,
yielding a commitment (θ), providing preimages that any service has requested (`provide`
needs no privilege), and, if privileged, blessing the privilege set, assigning
authorizer queues and designating the next validator set. Refine is stateless: it may
only read (historical lookups, imports, extrinsics) and export segments. This split is JAM's scalability proposition.

</details>

### Q12 What changed in this chapter in 0.8.0?
<details><summary>Model answer</summary>

Δ+ returns processed transfers (#502) and counts transfer and free gas in its prefix
rule, crediting the recursion with the gas of the transfers it just emitted rather than
those it consumed (#500); statistics become (items, transfers, gas) per service (#502,
the accumulate-transfer-count vector field); the staging set is a sequence whose length
is in 𝕍 (multiples of 3 from 6 to 3C, #514), so `designate` takes a count z and answers
HUH when z ∉ 𝕍 (or, as before, when the caller is not the delegator); and `bless` is
restricted to the manager in the text (#519) while the vectors deviate pending #558. The privilege set (including the registrar) is
unchanged. lasair addresses these in Phases 3–4 of `docs/GP_0_8_0_PLAN.md` alongside
the PVM gas-model changes.

</details>

### Q13 A service yields twice in one block. What must be true of θ' and why did it matter to lasair?
<details><summary>Model answer</summary>

θ' is a *set* of (service, hash) pairs, so the two yields are two distinct elements
ordered by the full tuple (service id, then hash) when encoded. lasair sorted by service
id only and kept insertion order for the tie, which changed the Keccak root of the
accumulation-output belt in β and therefore the state root (B1, seed 1551410130). The
fix routed every set through one canonical encoder.

</details>

### Q14 Why does the reference panic where lasair once yielded (B2), and what is the general rule?
<details><summary>Model answer</summary>

A `read` host call with an out-of-range key pointer for a non-existent service: the
Graypaper's host-call definitions read arguments from memory before resolving the
target, so a bad pointer faults and the whole invocation panics with no yield. lasair
looked the service up first, found none, returned NONE and let execution continue to a
yield, which entered θ, β and statistics. The rule: the *order* of argument
validation versus state lookup in every host call is protocol-visible; audit all of them
for the same shape.

</details>
