---
title: "C · JAM architecture"
duration: 60 min
exam_portion: fixed
gp_chapter: C
gp_tex: text/overview.tex, text/discussion.tex, text/work_packages_and_reports.tex, text/reporting_assurance.tex, text/erasure_coding.tex
lasair: lib/stf.ml, lib/work_packages.ml, conformance/stf_transitions.ml, conformance/refine.ml, jamnp/, docs/JAMNP_ARCHITECTURE.md
---

# C · JAM architecture

<span class="lecture-badge">M1 Understanding · C · Architecture</span>

Every chapter sheet zooms in on one part of JAM; this page is the whole machine. The
goal is to hold it in one picture, then each layer, then one work-package walked end to
end with the state it touches. Sources: Graypaper 0.8.0
chapter 4 (Overview), chapter 14 (Work Packages and Work Reports), chapter 20
(Discussion), with chapters 15 to 19 at overview level.

<div class="callout callout-info">
<div class="callout-title">Too dense?</div>

This sheet assumes you already know the story. If the diagram below is hard to read, do
[Foundations F0 to F9](lesson.html?lesson=06-m1-exam/f00-start-here) first: the same
architecture, one step at a time, in plain English with Ethereum comparisons.

</div>

## Chapter sheet

### The picture in one diagram

<svg class="fdiag" viewBox="0 0 360 540" role="img" aria-label="One work-package end to end: in-core refine by guarantors, then on-chain guarantee into rho, assurances make it available as R, accumulate applies it; auditors check it and Safrole picks block authors">
<defs><marker id="ah-carch" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<text class="title" x="180" y="20" text-anchor="middle">One work-package, end to end</text>
<rect class="zone" x="10" y="32" width="340" height="170" rx="10"/>
<text class="muted" x="20" y="48">IN-CORE: one core's 3 guarantors (ch. 14–15)</text>
<rect class="box" x="30" y="58" width="300" height="46" rx="8"/>
<text x="180" y="78" text-anchor="middle">Builder sends a work-package</text>
<text class="muted" x="180" y="95" text-anchor="middle">auth token · context · up to 16 work-items</text>
<line class="arrow" x1="180" y1="104" x2="180" y2="122" marker-end="url(#ah-carch)"/>
<rect class="box hot" x="30" y="124" width="300" height="66" rx="8"/>
<text x="180" y="144" text-anchor="middle">Guarantors: Ψ_I then Ψ_R</text>
<text class="muted" x="180" y="162" text-anchor="middle">authorize, refine each item, erasure-code</text>
<text class="muted" x="180" y="178" text-anchor="middle">the bundle, sign the work-report</text>
<line class="arrow" x1="180" y1="190" x2="180" y2="230" marker-end="url(#ah-carch)"/>
<rect class="zone" x="10" y="214" width="340" height="224" rx="10"/>
<text class="muted" x="20" y="230">ON-CHAIN</text>
<text class="muted" x="340" y="230" text-anchor="end">every node · ch. 11–12</text>
<rect class="box" x="30" y="240" width="300" height="46" rx="8"/>
<text x="180" y="260" text-anchor="middle">Guarantee in E_G → waits in ρ</text>
<text class="muted" x="180" y="277" text-anchor="middle">2 or 3 signatures · one pending report per core</text>
<line class="arrow" x1="180" y1="286" x2="180" y2="304" marker-end="url(#ah-carch)"/>
<rect class="box" x="30" y="306" width="300" height="46" rx="8"/>
<text x="180" y="326" text-anchor="middle">Assurances in E_A → available (R)</text>
<text class="muted" x="180" y="343" text-anchor="middle">more than 2/3 hold their piece · else timeout</text>
<line class="arrow" x1="180" y1="352" x2="180" y2="370" marker-end="url(#ah-carch)"/>
<rect class="box ok" x="30" y="372" width="300" height="54" rx="8"/>
<text x="180" y="392" text-anchor="middle">Accumulate Ψ_A: state changes</text>
<text class="muted" x="180" y="410" text-anchor="middle">δ services · χ · φ · ι · outputs θ into β</text>
<rect class="box" x="10" y="452" width="164" height="76" rx="8"/>
<text x="92" y="474" text-anchor="middle">Auditing (ELVES)</text>
<text class="muted" x="92" y="492" text-anchor="middle">~30 re-runs per report</text>
<text class="muted" x="92" y="508" text-anchor="middle">bad → E_D, ψ (ch. 10, 17)</text>
<rect class="box" x="186" y="452" width="164" height="76" rx="8"/>
<text x="268" y="474" text-anchor="middle">Safrole (ch. 6)</text>
<text class="muted" x="268" y="492" text-anchor="middle">tickets E_T pick sealers</text>
<text class="muted" x="268" y="508" text-anchor="middle">γ, η, κ/λ rotate per epoch</text>
</svg>

Read it top to bottom. The top box is off-chain work by a few validators; everything in the lower zone is what every node does when it imports a block. The two boxes at the bottom run alongside: auditing checks the work, Safrole decides who authors blocks. The same picture is built up one step at a time in [Foundations F0 to F9](lesson.html?lesson=06-m1-exam/f00-start-here).

Two words carry the whole design. **In-core**: a subset of validators execute
something and the rest are convinced by a crypto-economic game (guarantee, assure,
audit, judge). **On-chain**: everyone executes it. Refinement is in-core and stateless;
accumulation is on-chain and stateful. The Graypaper's phrase for the model is
"pipelines a highly scalable, mostly coherent element to a synchronous, fully coherent
element" (Introduction §1.3).

### The layers

| Layer | What it does | GP chapters | State |
|---|---|---|---|
| **Consensus: Safrole + Grandpa** | Safrole is a simplified Sassafras: anonymous ring-VRF tickets decide who seals each 6 s slot an epoch ahead, so forks are rare; fallback keys if the ticket contest fails. Grandpa finalises the audited chain. | 6, 19 | γ η ι κ λ τ |
| **In-core execution** | A work-package's authorizer and refine code run on a core's three guarantors in a stateless PVM, with only preimage lookups and imported segments as inputs. Output is a work-report. | 14, 15 | ρ (availability assignment per core: the guarantee plus the slot it was reported) |
| **Availability** | Guarantors erasure-code the bundle and the exported segments (Reed-Solomon over GF(2¹⁶), rate F(v) : v for v validators, so any 342 of 1023 shards reconstruct at full and 3 of 6 at tiny) and distribute one shard per validator; the erasure-shard count v, which must equal \|κ'\|, is written into the report's availability spec. Assurances make a report *available* at >2/3 of the active set κ. Audit DA shards need not be kept once the report is audited; exported-segment shards are retained 28 days (ch. 16). | 11, 16, App. H | ρ, E_A |
| **Auditing and judging (ELVES)** | Each validator audits a VRF-random set of newly available reports, ~30 audits per report across tranches every 8 s; negative judgments escalate; verdicts land in E_D. A block is finalisable only once audited. | 17, 10 | ψ |
| **On-chain accumulation** | Available reports' digests are fed to their services' accumulate code with full state access: balances, storage, transfers, privileges, validator designation, authorizer queues. Gas-bounded per block. | 12, App. B | δ χ φ ι ω ξ θ |
| **Services and accounts** | Every account is a service: balance, code, storage, preimages, two entry points (refine, accumulate). No secret keys, no nonce, no transactor. | 9 | δ |
| **Authorization and coretime** | Coretime is prepurchased and assigned to an authorization agent; an authorizer (PVM code) decides which packages may use a core. Pool of 8 live authorizers per core, fed from an 80-slot queue that only a privileged service can write. | 8 | α φ |
| **Bookkeeping** | Per-validator, per-core and per-service activity counts for rewards. | 13 | π |

### Lifecycle of one work-package

| Step | Who | What happens | State read / written |
|---|---|---|---|
| 1 Build | builder (off-chain) | Assemble ≤16 work-items, an authorization token, the authorizer's code hash + config, and a context naming an anchor block, a lookup anchor and prerequisites. Bundle ≤ W_B = 13 791 360 octets (about 13.8 MB). | reads recent β for anchors |
| 2 Authorize | guarantor, in-core | Run Ψ_I (is-authorized). Its hash must be in the core's pool α[c]. | reads α |
| 3 Refine | guarantor, in-core | For each item, run Ψ_R with the payload, extrinsic blobs and imported segments (justified against segment roots). Produce a work-digest per item (result ≤ 48 KB total, gas used, counters) and exported segments. | reads δ code via historical lookup at the lookup anchor |
| 4 Report | guarantors | Assemble the work-report: availability spec (package hash, bundle length, erasure root, erasure-shard count v, segments root, segment count n), context, core, authorizer, trace, segment-root lookup, digests, auth gas. Two or three Ed25519 signatures. Erasure-code and distribute shards. | none |
| 5 Guarantee | block author, on-chain | E_G is validated: core assignment (only the first \|κ'\|/3 cores are active), signatures, contextual validity against β and ξ (anchor in recent history; lookup anchor at most L slots old and present in the retained header ancestry; no duplicate package anywhere in the pipeline), authorizer in α, erasure-shard count v = \|κ'\|, prerequisites known, one report per core (apparent dependency loops are allowed; such reports simply never accumulate). ρ'[c] takes the whole guarantee, stamped with τ'. | reads β κ' λ' η' α ξ ω δ ρ; writes ρ', π'; α' later drops the used authorizer |
| 6 Assure | every validator, on-chain | Each validator's bitfield in E_A says which cores' shards it holds. A report assured by more than 2/3 of κ (⌊2\|κ\|/3⌋+1) becomes available (**R**) and leaves ρ (ρ‡); an assignment is dropped once H_t ≥ its reported slot + U (U = 5), and all are cleared when the validator-set size changes (\|κ\| ≠ \|κ'\|). | reads ρ† κ κ'; writes ρ‡ |
| 7 Audit | validators, off-chain | Tranche 0 audits 10 random cores; later tranches widen on no-shows or negative judgments. Judgments become verdicts in some block's E_D. | writes ψ' via E_D; ρ† clears bad reports |
| 8 Accumulate | every node, on-chain | Available reports whose dependencies are satisfied are ordered and their digests passed to Ψ_A per service, within the block gas limit; the rest wait in ω. Outputs go to θ, then into β's Keccak belt. | reads ω ξ δ χ; writes δ‡ χ' ι' φ' θ' ξ' ω' |
| 9 Preimages | on-chain | Requested preimages in E_P are integrated last, against the post-accumulation accounts. | writes δ' |
| 10 Finalise | Grandpa, off-chain | Vote only on audited, equivocation-free chains extending the last final block; prefer the chain with the most ticket-sealed ancestors. | none |

### Numbers that characterise the design

| Quantity | Full | Tiny | Why it is that number |
|---|---|---|---|
| Validators \|κ\| | 1023 at capacity; 0.8.0 allows any multiple of 3 from 6 to 3C (eq:valcount) | 6 | sizes where the erasure rate F(v) : v is optimal, i.e. v/3+1 : v (eq:ecoriginalshards); 3 per core |
| Cores C | 341 | 2 | 3 guarantors each; only the first \|κ'\|/3 cores are active |
| Guarantors per core | 3 (2 signatures suffice) | 3 | rotate every R = 10 slots (tiny 4) |
| Availability threshold | > 2/3 of \|κ\| assurances (⌊2\|κ\|/3⌋+1) | | matches the F(v) reconstruction bound (v/3+1 at the recommended sizes): enough honest shards always survive |
| Audits per report | ~30 (10 per validator per slot) | | the ELVES security argument; 10/16 of CPU budget |
| Slot / epoch | 6 s / 600 slots = 1 h | 6 s / 12 slots | one block per slot; ticket contest closes at slot 500 (tiny 10) |
| Lookup anchor age | 14 400 slots = 24 h | 24 | bounds header storage and refine's historical lookups |
| Assurance timeout | 5 slots | 5 | a core is freed if a report is not assured in time |
| Recent history | 8 blocks | 8 | duplicate-package horizon |
| Gas: is-authorized / refine / accumulate per report / per block | 50 M / 5 G / 10 M / 3.5 G | tiny refine 1 G, block 20 M | "10 ms on the same machine" for accumulate vs a 6 s core slot for refine |
| Work-report output | ≤ 48 KB; bundle ≤ 13 791 360 octets (about 13.8 MB); ≤ 3072 imports and exports; ≤ 8 dependencies | | a core's "virtual hardware" draws and provides 2 MB/s of general-purpose I/O (Discussion §20.1) |
| Node hardware (GP assumption) | 16 cores, 64 GB RAM, 8 TB, 0.5 Gb/s | | Discussion §20.1; ~2 PB network availability |
| Claimed throughput | 341 packages per slot; ~85× a native core; 682 MB/s availability | | Discussion §20.2 |

### War story
<div class="lasair-connection">

**Consensus parity with another client, layer by layer.** Passing M1 proved lasair's
on-chain half. The architecture story lasair actually lived through is the finality campaign
(`docs/FINALITY_PLAN.md`, 2026-07): Phase 0 reproduced a Safrole `gamma_s` fork where
lasair rejected every PolkaJam ticket-sealed block with `bad_ticket_proof` in epochs
whose ticket lottery was only partially filled; Phase 1 fixed it so lasair followed
PolkaJam for 262 epochs with matching state roots; Phase 2 implemented the Graypaper's
best-chain rule (most ticket-sealed ancestors, equivocation exclusion) so a mixed 3:3
network held one head; Phase 3a added ancestor-aggregating Grandpa votes after a
head-spread wedge froze finality; Phase 3b built a client-agnostic finality bridge over
the JAMNP-S UP-0 `final` field that agreed with PolkaJam byte for byte. The lesson for
the architecture: the Overview's three fork goals (rare, quickly resolved, finalisable) map
one to one onto Safrole, the best-chain rule and Grandpa, and each one broke separately.
Safrole broke again during the 0.8.0 migration (`docs/GP_0_8_0_PLAN.md`, ledger loop 7,
2026-09-24): lasair's importer never enforced the rule that every ticket in the extrinsic
must survive into the posterior accumulator ("it is invalid to include useless tickets",
n ⊆ γ_A', safrole.tex), and its author kept including useless tickets once γ_A was full.
PolkaJam rightly refused those blocks and the mixed 3:3 net split at in-epoch slot 6 to 7
on every run. A PolkaJam follower on an all-lasair chain isolated it: it stopped exactly
at the first block after γ_A saturated. The rule is unchanged from 0.7.2; no official
vector exercised the rejection. Networking is documented in `docs/JAMNP_ARCHITECTURE.md` and
`docs/MIXED_CLIENT_NETWORK.md`.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in the architecture</div>

- **The validator set has a size, not a constant.** V = 1023 is gone as a fixed
  constant: a set may be any multiple of three from 6 to 3C = 1023 (eq:valcount). C = 341
  stays fixed, but only the first |κ'|/3 cores are active. Guarantor assignment and the
  availability, audit and judgment thresholds use the actual set size (|κ|, |κ'|, or for a
  verdict the set it names) instead of V, and each validator may submit ⌈2E/|γ_P'|⌉ ticket
  entries instead of the constant N = 2, so a small set can still fill the accumulator
  (eq:ticketsextrinsic). (#514)
- **ρ holds availability assignments.** A core's entry is the full guarantee (report,
  slot, credential) plus the slot at which it was reported (eq:reportingstate), and every
  entry is cleared when |κ| ≠ |κ'|, "timed out early"
  (eq:availassignmentspostassurancesdef). (#494; the resize clearing came with #514)
- **Erasure coding follows the set size.** The rate is F(v) : v (eq:ecoriginalshards);
  the fixed piece size W_E = 684 is gone, and the availability spec carries the
  erasure-shard count v (eq:avspec), which every guaranteed report must set to |κ'|.
  Distributing to two sets of different sizes across an epoch change means coding twice
  and producing two distinct reports, only one of which may be reported on-chain
  (ch. 14). (#514)
- **Computing a report** (eq:computereport) now takes the segment-root dictionary and the
  shard count as inputs, and the bundle has its own assembly function (eq:makebundle).
  Auditors recompute the report with the audited report's own dictionary and shard count.
- **Gas budgets kept their values; gas changed meaning.** G_I, G_R, G_A and G_T are
  unchanged, but the PVM now charges gas per basic block, in advance, from a pipeline
  cost model (eq:gascostforblock), and host calls are priced from a table. Measured
  consequence (jamswap `docs/THROUGHPUT.md`, 2026-09-24, not GP text): an in-PVM Ed25519
  verify costs about 5.29 M gas under 0.8.0 (1.31 M under 0.7.2), more than half of a
  report's whole accumulate budget G_A = 10 M, so signature checks belong in refine.

</div>

### Source pointers
- `lib/stf.ml`, `conformance/stf_transitions.ml`: the on-chain half in Graypaper order
- `lib/work_packages.ml`, `conformance/refine.ml`: work-package, item, report, Ψ_R
- `conformance/availability.ml`, `lib/erasure_coding.ml`: shards and assurances
- `jamnp/`, `docs/JAMNP_ARCHITECTURE.md`: the off-chain transport
- `docs/FINALITY_PLAN.md`: Safrole fork, best chain, Grandpa
- lectures `011-graypaper-lectures/16-overview` … `21-pvm-gas`; `01-jam-protocol/*`

## Question bank

### Q1 ★ Describe JAM in one minute to someone who knows Ethereum.
<details><summary>Model answer</summary>

JAM keeps Ethereum's single coherent state and smart-contract-like services, but moves
the expensive computation off the chain and onto cores. Every service has two entry
points: refine, which runs in-core on three validators with no state and turns a big
input into a small result, and accumulate, which runs on-chain on everyone and applies
that result to state. The chain never executes the heavy work; it checks that three
guarantors signed for it, that two thirds of validators hold its data, and that a random
sample of auditors re-executed it. Blocks come every six seconds from an anonymous
ticket lottery, and Grandpa finalises them. There are no transactions and no signing
accounts: coretime is bought in advance and an authorizer program decides what may run.

</details>

### Q2 ★ What is the in-core / on-chain distinction and why does it exist?
<details><summary>Model answer</summary>

On-chain consensus is "everybody does everything": every node executes every
computation, so throughput is bounded by one machine. In-core consensus has only a
subset of the network execute a computation and assure its input data to the others,
so throughput scales with the network's size. The Graypaper expects upwards of 300
times one machine's capacity in-core. Because not everyone executes in-core work,
confidence comes from a game: guaranteeing attaches an economic cost to invalid
results, assuring gives confidence the inputs stay available, and auditing gives
confidence someone honest will check. Refinement is in-core and designed to be
stateless so anyone can reproduce it later from the finalised chain; accumulation is
on-chain because it must be synchronous and coherent.

</details>

### Q3 ★ Walk one work-package from builder to state change, naming the state components each step touches.
<details><summary>Model answer</summary>

A builder assembles a package with a token, an authorizer, a context and up to sixteen
items and sends it to the core's three guarantors. They run is-authorized and check the
authorizer against the pool α, run refine per item using preimages looked up at the
lookup anchor in δ, produce a work-report, erasure-code the bundle and exports, and
sign. The block author includes it in E_G; validation checks the guarantors' assignment
against κ' and the rotation (λ' when the previous rotation falls in the previous epoch),
the anchor against β, duplicates against β, ξ, ω and ρ, and puts the whole guarantee
(report, slot, signatures) in ρ for its core, stamped with the current slot. Over the
next slots validators submit assurances in E_A; at more than two thirds of κ the report
leaves ρ into **R**, the newly available set. Auditors sample it off-chain and any
verdict goes into E_D and ψ. Accumulation takes R* plus anything unblocked in ω, runs
each service's accumulate code within the block gas budget, and writes δ, χ, ι, φ and θ;
θ's Merkle root is appended to β's Keccak belt. Preimages E_P are folded into δ last.

</details>

### Q4 What are the three roles a validator plays per block, and which extrinsic each produces?
<details><summary>Model answer</summary>

Guarantor for one core (rotating every ten slots): produces work-reports that reach the
chain through E_G. Assurer for every core: holds one erasure-coded shard of every
package and signs a bitfield each slot that reaches the chain through E_A. Auditor:
re-executes a random sample of newly available reports and, only if something is wrong,
produces judgments that reach the chain through E_D. Separately, one validator per slot
is the sealer, chosen by ticket, and validators also vote in Grandpa off-chain.

</details>

### Q5 ★ Why three guarantors per core and a two-thirds availability threshold?
<details><summary>Model answer</summary>

Three guarantors per core gives 341 cores from 1023 validators (in 0.8.0 the set may be
any multiple of three from 6 to 1023, and only the first |κ'|/3 cores are active); a
credential needs two or three signatures (ch. 11), so one absent or dissenting guarantor cannot stall a core
(that consequence is a derivation, not GP text). The two-thirds
availability threshold pairs with the erasure code's reconstruction bound: the code is
rated F(v) : v, which is v/3+1 : v at the recommended set sizes, so any third-plus-one
of the shards rebuilds the data (eq:ecoriginalshards). If more than
two thirds of validators say they hold their shard, then even if a third of them are
lying or vanish, enough honest shards remain to reconstruct, which is what auditors and
future importers need. The Graypaper adds that the validator-set size should be chosen
from the sizes where that rate is optimal, and 1023 is one of them.

</details>

### Q6 What is Safrole and what problem does it solve in the architecture?
<details><summary>Model answer</summary>

Safrole is JAM's block-production mechanism, a simplified variant of Sassafras. During
an epoch, validators submit anonymous ring-VRF tickets; the best tickets, sorted
outside-in, become the sealing keys for the slots of the *next* epoch. Because each
slot has exactly one anonymous sealer determined an epoch ahead, contention within a
slot and across slots is minimised, which is the first of the Overview's three fork
goals. If too few tickets arrive by the tail of the epoch, a fallback sequence of
public Bandersnatch keys chosen by entropy is used instead. The header's seal and VRF
signatures, the epoch and winners markers, and the entropy accumulator all belong to it.

</details>

### Q7 What does Grandpa add, and what must be true of a block before a node votes for it?
<details><summary>Model answer</summary>

Grandpa provides finality: a block identified as one that will remain in the chain in
perpetuity, extending to all its ancestors. A node votes only for a chain that has the
last finalised block as an ancestor, contains no unfinalised equivocation (two valid
blocks in one slot), and is audited: every newly available report in it has its
announced audits matched by positive judgments. Among acceptable chains the node
prefers the one with the most ticket-sealed ancestors, penalising fallback blocks. A
chain containing a report judged invalid must never be finalised and is reverted.

</details>

### Q8 Explain the availability system: the two stores, what goes where, and for how long.
<details><summary>Model answer</summary>

Guarantors erasure-code two things. The auditable bundle (package, extrinsic blobs,
imported segments with their justifications) goes into the short-term Audit DA; a
validator's bundle shard "need not be retained after the work-report is considered
audited" (ch. 16). Auditors rebuild the bundle from shards to re-run refine. The exported
segments plus paged proofs go into the Distributed Decentralised Data Lake, whose shards
"should be retained for 28 days" (ch. 16; that is 672 epochs), so later
packages can import them by segment root and index with a Merkle justification. Each
validator holds one shard of each; the report's erasure root and segments root commit
to them. Fixed segments are 4104 bytes, giving data parallelism of six at 1023
validators.

</details>

### Q9 What is ELVES and how does auditing escalate?
<details><summary>Model answer</summary>

ELVES is the Polkadot security game JAM reuses; its backing, approval and inclusion are
JAM's guaranteeing, auditing and accumulation. Each validator derives a VRF from the
block's entropy to pick ten cores of the block's newly available reports for tranche 0,
publishes an announcement, fetches the bundle from shards, re-executes refine and
issues a judgment. Every eight seconds a new tranche may add reports: always if a
negative judgment was seen, and by a fresh VRF if announced audits in the previous
tranche went unanswered. An announcement is a binding commitment. If more than a
third judge a report invalid, the block containing it is ban-listed with all
descendants; if more than two thirds still say valid, the dissenters may be punished.
About thirty audits per report is the design point.

</details>

### Q10 Why is there no transaction and no transactor in JAM?
<details><summary>Model answer</summary>

Because JAM separates paying for the resource from describing the work. Coretime is
prepurchased, via a system parachain outside this specification, and assigned to an
authorization agent. The agent's authorizer, a PVM program, decides which
work-packages may consume the core, judging the package's opaque token. External data
enters a service through refine's inputs, not through signed messages, so no account
needs a secret key or a nonce. This is what lets JAM host both Ethereum-style
pay-per-use and Polkadot-style long-lived assignment with one mechanism.

</details>

### Q11 What does the dependency graph in chapter 4 buy an implementer?
<details><summary>Model answer</summary>

It states the transition as "each posterior component is a function of these prior
components and these extrinsics" rather than as a sequence, and it deliberately keeps
the graph shallow. An implementation can therefore parallelise: disputes (ψ' ≺ E_D, ψ)
and entropy (η' ≺ H, τ, η) depend only on the block and prior state, so they can run
concurrently, while Safrole waits for both (γ' ≺ …, η', κ', ψ'); assurances and
accumulation can complete before preimage integration; Merklization can be pipelined
because the header carries the prior state root. The Graypaper names the synchronous
entanglements as the dagger intermediates: β† before β', ρ† (disputes) before ρ‡
(assurances) before ρ' (guarantees), and δ‡ (accumulation) before δ' (preimages).

</details>

### Q12 What are the performance claims in the Discussion chapter and what are they based on?
<details><summary>Model answer</summary>

With 1023 validators, three per core and ten audits per validator per slot, JAM
processes 341 work-packages per six-second slot. The node model is a 16-core CPU, 64 GB
RAM, 8 TB storage and 0.5 Gb/s networking, with ten sixteenths of CPU spent auditing
and roughly 300 MB per slot of bandwidth each way. Each core is "virtual hardware": a
CPU core at 25 to 50 percent speed for six seconds with 2 MB/s I/O and 2 GB RAM, whose
48 KB result then gets 10 ms of on-chain time with full state access. Modelled against
Ethereum L1 this is 500 to 5000 EVM-gas per microsecond per core, so thousands of times
L1 overall, from spatial parallelism (hundreds of cores), temporal parallelism
(pipelining across blocks) and a VM that fits real hardware. The chapter itself calls
the numbers provisional and crude.

</details>

### Q13 ★ Where does a work-report's data live at each stage, and what commits to it?
<details><summary>Model answer</summary>

The package and its blobs start with the builder and guarantors. After refinement the
report's availability spec commits to the package hash, bundle length, an erasure root
over the chunks of the coded bundle and the coded exports together, the erasure-shard
count v (new in 0.8.0: the size of the assuring set, which must equal |κ'|), a segments
root over exports, and the segment count n. Shards are spread one per validator. The
chain never stores the package: ρ holds the guarantee (report, slot, signatures) plus
the slot it was reported in, β holds the package hash and segments root for eight
blocks, ξ holds accumulated package hashes, and θ's outputs are committed in β's Keccak
belt for bridges. Auditors and later importers reconstruct from shards using the roots
as their check.

</details>

### Q14 What are the honest off-chain behaviours the Graypaper expects, beyond block authoring?
<details><summary>Model answer</summary>

Chapter 14 lists them: guaranteeing and reporting work-packages, including chunking and
distributing both the chunks and the package; assuring availability after receiving
shards; deciding which reports to audit, fetching and auditing them, and distributing
judgments; and submitting correct statistics of the auditing seen from others. Honest
behaviour is expected of at least two thirds of validators, and Grandpa voting sits
alongside it.

</details>

### Q15 GP 0.8.0 lets the validator set change size. What does that change in the architecture?
<details><summary>Model answer</summary>

The set may now be any multiple of three from 6 up to 3C = 1023 (eq:valcount), and it
changes at an epoch boundary. The core count C = 341 stays fixed, but only the first
|κ'|/3 cores are active: guarantor assignment shuffles the |κ'| validators into groups
of three, and a guarantee on an inactive core is invalid. Erasure coding is
parameterised by the set size: v validators get v shards and any F(v) of them
reconstruct (eq:ecoriginalshards), with F(v) = v/3+1 at the recommended sizes, so 342 of
1023 and 3 of 6. The availability spec therefore records the erasure-shard count v, and
the chain requires v = |κ'|. Every threshold is a fraction of the actual set:
availability needs more than two thirds of |κ|, positive judgments from more than two
thirds of |κ| are enough for a report to count as audited, and a verdict carries
⌊2|k|/3⌋+1 judgments from the set k it names. Safrole scales as well: each validator may
submit ⌈2E/|γ_P'|⌉ ticket entries (eq:ticketsextrinsic), so a small set can still fill
the accumulator. Finally, when |κ| ≠ |κ'| every availability assignment in ρ is cleared
(eq:availassignmentspostassurancesdef); the GP only calls this an early timeout. The
likely reason (a derivation, not GP text) is in ch. 14: the shards were coded for the
old set size, and coding for two sizes means two distinct reports, only one of which may
be reported on-chain.

</details>
