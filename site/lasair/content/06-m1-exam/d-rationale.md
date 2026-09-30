---
title: "D · Design rationale"
duration: 60 min
exam_portion: fixed
gp_chapter: D
gp_tex: text/intro.tex, text/previous_work.tex, text/discussion.tex, text/overview.tex, text/safrole.tex, text/accounts.tex, text/reporting_assurance.tex, text/erasure_coding.tex, text/pvm.tex, text/pvm_invocations.tex, text/definitions.tex
lasair: docs/DISCLOSURES.md, docs/CONFORMANCE_RETROSPECTIVE.md
---

# D · Design rationale

<span class="lecture-badge">M1 Understanding · D · Design rationale</span>

This page asks *why*. The floor is the Graypaper's own reasons, in chapters 1, 2 and 20,
and the ceiling is the wider JAM literature: an implementer needs the first, and the
second is what makes the design feel inevitable rather than arbitrary. Everything below quotes or paraphrases the 0.8.0 text unless marked
"(not in the GP)".

## Chapter sheet

### The driving factors (Introduction §1.2)

The Graypaper names five goals and takes the first two as given for any Web3 system:

1. **Resilience**: "highly resistant from being stopped, corrupted and censored";
   ideally "unstoppable".
2. **Generality**: Turing-complete computation. Bitcoin lacked it, Ethereum provided it.
3. **Performance**: quick and low-cost computation.
4. **Coherency**: "the causal relationship possible between different elements of state
   and thus how well individual applications may be composed".
5. **Accessibility**: "negligible barriers to innovation; easy, fast, cheap and
   permissionless".

Performance and coherency are antagonistic. The paper names the principle
**size-coherency antagonism** (§1.3): more state means more space, more space means
greater mean and variance of distance between state components, and that makes the time
for "all correct implications of an event to be felt" diverge, which is incoherence.
The usual fix is to fragment into causally independent subsystems, "a bacterium may
split into two", which is what Polkadot, Cosmos and scaled Ethereum do, at the cost of
coherence. JAM's stated middle ground: "a new model of computation which pipelines a
highly scalable, mostly coherent element to a synchronous, fully coherent element.
Asynchrony is not avoided, but we bound it to the length of the pipeline", replacing
crude partitioning with "cache affinity" as in a multi-CPU machine with shared RAM. And
unlike SNARK L2s, it "draws upon crypto-economic mechanisms and inherits their low-cost
and high-performance profiles and averts a bias toward centralization".

### What JAM rejects and why (Previous Work, chapter 2)

| Approach | What it does well | Why the GP rejects it as the model |
|---|---|---|
| **Polkadot parachains** | ELVES security, partitioned workload across many machines | Composability explicitly lowered: parachains are "highly isolated", XCMP is "asynchronous, coarse-grained" and tied to a slowly evolving language. Accessibility is low: building a chain is hard and a slot auction is needed, ~50 slots. JAM co-opts ELVES but offers "an abstraction much closer to the actual computation model" of the validators. |
| **Ethereum + roll-ups** | Nearly a million validators, Casper-FFG finality, 1 MB/block commitment data, a market of roll-ups | Roll-ups show "a broad pattern of centralization"; heterogeneous latency, security and economics across vendors with no "grand consolidation"; L1 compute unchanged since 2015. |
| **SNARK roll-ups** | Sub-linear verification, no witness leakage | Proving costs: RISC-Zero benchmark shows proving "over 61,000 times as long" as executing, a 66 000 000× cost multiplier versus the PolkaVM recompiler; polynomial-commitment erasure coding loads validators "orders of magnitude higher" than binary-field Merklization; and SNARKs still need crypto-economics for availability, sequencing and redundancy, with real monopolies (Starkware). Even optimistic 50 000× slowdowns are "several orders of magnitude" too slow to compete with ELVES. |
| **Fragmented meta-networks** (Cosmos, Avalanche) | Consistent messaging, homogeneous consensus | "No homogenous security": separate validator sets with no causal link between misbehaviour on one network and punishment on another. Replicated security is economically inefficient; OmniLedger-style repartitioning lowers attack cost; ELVES-style causal entanglement is "the most secure and economically efficient" but caps the number of networks. |
| **High-performance monoliths** (Solana) | Very high synchronous throughput, immediate finality | Protocol defined by an optimised codebase creates "structural centralization": 11 major outages, 15 days down since 2022; no distribution beyond one machine, so hardware (512 GB RAM recommended) caps performance and raises validator barriers; history archived to a centralised Google-hosted database. Ethereum's multi-client survival of the 2016 exploit is the contrast. |

### The design decisions and their reasons

| Decision | The reason the GP gives | Trade-off accepted |
|---|---|---|
| **Refine in-core, accumulate on-chain** | "everybody does everything ... is unfortunately not scalable" (§4.9). Refine is stateless and off-chain so services "scale dramatically both in the size of their inputs and in the complexity of their computation"; accumulate is stateful and on-chain "more closely correspond[ing] to the code of an Ethereum contract account". Rewards and penalties give in-core work "a comparable level of crypto-economic security", leaving "scalability versus synchroneity" as the only difference. | Asynchrony bounded by the pipeline: results land a few slots after the work; accumulate gets only 10 ms and 48 KB per report (Discussion). |
| **Safrole (Sassafras-derived) rather than BABE-style production** | Block production's "chief purpose" is to "limit the rate at which new blocks may be authored and, ideally, preclude the possibility of forks" (§6). Anonymous ring-VRF tickets fix one sealer per slot an epoch ahead. The GP notes Ethereum's leader is "public in advance" (a security weakness its developers hope to change). | Stateful: a ticket accumulator, ring root and entropy schedule per epoch, plus a fallback mode if the contest under-fills. (The GP names BABE only once, calling JAM's design "similar in nature to that of Polkadot's BABE/Grandpa hybrid", ch. 6; it never argues Safrole against BABE directly, so "why not BABE" is not in the GP.) |
| **ELVES auditing, not ZK proofs** | The 66 000 000× proving cost multiplier and centralisation of SNARK provers (§2.2.1); ELVES is "the most secure and economically efficient" of the fragmentation options (§2.3); "It has yet to be demonstrated that SNARK-based strategies ... will ever be able to compete on a cost-basis". | Ten sixteenths of every validator's CPU goes to auditing; finality waits for audits; security rests on ≥2/3 honest validators rather than mathematics. |
| **Fixed cores (341), validator count up to 1023** | Three validators per core. Only C = 341 is a constant: each validator key sequence has a length in 𝕍, a multiple of 3 from 6 to 3C = 1023 (eq:valcount, §6.3), and only the first \|κ'\|/3 cores are active, since "the amount of in-core computation that is possible scales with the number of validator nodes" (§11.3). Sizes should come from the list where the erasure rate D(v) : v is optimal, D(v) = v/3 + 1 (eq:ecoriginalshards, App. H); 1023 is the largest. The Discussion sizes everything (bandwidth, audits, 2 PB availability) from its "stated target of 1,023 validators". | Cores beyond \|κ'\|/3 sit inactive when the set is small. The protocol does not pick the size: the staking system is out of scope and reached through an API (§4.8); on-chain only χ_V may set the staging keys ι, through `designate`, which panics if the keys cannot be read and otherwise returns HUH if the count is not in 𝕍 or the caller is not χ_V. |
| **Systematic Reed-Solomon erasure coding, any D(v) ≤ v/3 + 1 of v shards reconstruct** | "reconstruct even should almost two-thirds of the v validators be malicious or incapacitated"; the rate D(v) : v follows from that, the 16-bit field GF(2¹⁶) and coding 4104-byte segments without padding (App. H); binary field and Merklization cost "orders of magnitude" less CPU than polynomial commitments (§2.2.1). | Rate is least efficient just below an optimal size (the GP's example: ~1:4.5 at v = 1022); every validator stores a shard of everything. |
| **PVM = RISC-V RV64EM** | "far less opinionated" than the EVM; RISC-V gives "excellent pre-existing tooling ... LLVM ... Rust and C++"; 64-bit little-endian, 13 registers, "especially well-suited for creating efficient recompilers on to common hardware" (§4.7). Prototype shows ~50 to 60× asymptotic speed-up over EVM and 5 ns/byte preprocessing (§20.2). | A new gas model to design. 0.8.0 supplies one: each basic block is charged in advance by simulating it on "a simplified model of a modern CPU microarchitecture, heavily inspired by what's used by production-grade compilers to predict how much time a given piece of code will take" (App. A.9, eq:gascostforblock). The Discussion still lists "the as-yet unfixed gas model for the PVM" among its caveats, and "PVM/EVM comparisons are necessarily imprecise". (The GP never weighs the PVM against WASM; WebAssembly appears once, as the platform Moonbeam's EVM runs on (§20.2.3). The Polkadot experience with WASM recompilation cost is community rationale, not in the GP.) |
| **Gas and coretime** | Gas bounds PVM execution time, "time-proportional computational steps" (§4.7). Coretime replaces Ethereum's purchase model: "prepurchased and assigned to an authorization agent", letting external actors supply input "without necessarily needing to identify themselves" (§4.9). | Coretime procurement is out of scope, delegated to a system parachain. |
| **Prior state root in the header** | "a departure from both Polkadot and the Yellow Paper's Ethereum ... We do this to facilitate the pipelining of block computation and in particular of Merklization" (§5). | An importer learns whether it agreed with the author only from the next block; recent history needs the β† correction. |
| **Keccak for the accumulation belt and Beefy** | "to maximize compatibility with legacy systems" (§7). | Two hash functions in the protocol; Blake2b everywhere else. |
| **No transactor, authorization agents instead** | Ethereum "combined" account authorization with buying blockspace; Polkadot bought slots for 24 months by parties unrelated to the block author. JAM wants "a range of interaction patterns both Ethereum-style and Polkadot-style", so it "disentangl[es] the intention of usage for some coretime from the specification and submission of a particular workload" (§8). | On-chain logic only knows authorizer hashes; the policy is opaque PVM code run in-core. |
| **24-hour lookup anchor, 8-block recent history** | Refine must be "reproducible by any node synchronized to the portion of the chain which has been finalized" and the lookup anchor "must be in the finalized chain and reasonably recent" (§4.9); implementations need only store 24 hours of headers (§5). Recent history exists "to preclude the possibility of duplicate or out of date work-reports" (§7). | Reports must be built and guaranteed within the window; state prunes aggressively. |
| **Services, not accounts with keys** | "all accounts are service accounts ... Since they are not controlled by a secret key, they do not need a nonce" (§4.9). | Every input must arrive through refine; no direct user transactions. |
| **Common clock** | An explicit assumption "not an assumption of Polkadot"; NTP is "pragmatic and resilient"; used only to reject future-dated blocks (§4.4). | A consensus dependency on external time. |

### The JAM Common Era and other small "whys"
- Epoch starts 1200 UTC 1 January 2025 so "all major timezones are on the same date"
  at 24-hour multiples.
- Token denomination 10⁹ (Ethereum 10¹⁸, Polkadot 10¹⁰, Kusama 10¹²); 64-bit balances
  cap supply near 18×10⁹.
- Error is written ∇ not ⊥ "to avoid confusion with Boolean false".
- The name: RFC-31 "CoreJam", the collect/refine/join/accumulate model; JAM is the
  "complete and coherent overall blockchain protocol" that CoreJam only sketched (§1.1).

### External sources

Verified on 2026-09-23:
- **RFC-31 CoreJam**, the pre-Graypaper proposal: Polkadot Fellowship RFCs pull request
  #31, https://github.com/polkadot-fellows/RFCs/pull/31 (closed, never merged; the text
  lives in the PR, there is no `text/0031-corejam.md` in the repo).
- **Gavin Wood, "Polkadot's Future: The Big Jam", TOKEN2049 Dubai, April 2024**:
  https://www.youtube.com/watch?v=xTMiE0UcZUo (the public JAM reveal; Graypaper first
  published alongside it).
- **Gavin Wood, "2024 is the year of Polkadot JAM, the free block space"** (May 2024):
  https://www.youtube.com/watch?v=GVCDuhYl0is
- **Polkadot Decoded 2024 keynote** (Brussels, July 2024): https://www.youtube.com/watch?v=xXS9w4wqHWo
  (JAM is the closing segment; the developer prize was announced there).
- **graypaper.com**: the canonical Graypaper site with versions and the reader.
- **jamcha.in**: community hub, "a single computer with the power of hundreds", client
  list and documentation.
- **JAM Implementer's Prize**: https://jam.web3.foundation/ , the paths, milestones and
  prize amounts; the Fellowship judges. Among its rules
  (https://jam.web3.foundation/rules): 6, a clean-room implementation from the Graypaper
  and the public implementers' channel; 7, declare any implementation code viewed; 12, an
  interview may be requested to confirm authorship.

Not verified, listed for completeness: the JAM Graypaper explainer series on
graypaper.com's "JAM lectures" and Kian Paimani's JAM talks. Check before citing.

### War story
<div class="lasair-connection">

**Multiple clean-room implementations are the rationale you lived.** The GP's Solana
critique is that a protocol "defined as the outcome of a heavily optimized codebase
creates structural centralization", and its praise for Ethereum is that "multiple
clean-room implementations" let the network survive a flaw in its dominant client. The
JAM prize's clean-room rule exists for the same reason, and lasair's whole method was
built on it: `docs/DISCLOSURES.md` records every consultation (typeberry as a black-box
oracle, polkavm as the PVM behavioural reference, PolkaJam binary-only), and
`docs/CONFORMANCE_RETROSPECTIVE.md` shows the payoff: byte-exact agreement on 795 vectors
reached purely from the text, with every divergence traced to a Graypaper sentence.
That is the "well-reviewed specification" model working as the paper says it should.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in the rationale</div>

- `intro.tex`, `previous_work.tex` and `discussion.tex` did not change, so every quotation
  from chapters 1, 2 and 20 stands. The Discussion still assumes "our stated target of
  1,023 validators" and still lists "the as-yet unfixed gas model for the PVM" as a caveat.
- **The validator count is no longer a constant.** 0.7.2 defined V = 1023. 0.8.0 drops
  it: each key sequence has a length in 𝕍, a multiple of 3 from 6 to 3C (eq:valcount).
  C = 341 stays fixed, but only the first |κ'|/3 cores are active (§11.3).
- **The erasure rate is now a function of v.** 0.7.2 fixed "rate 342:1023" (App. H) and
  gave the reasons for its 684-octet piece size in §14: almost two thirds may fail, the
  16-bit field, and encoding data "close to, but no less than, 4KB". 0.8.0 drops that
  constant, defines the rate D(v) : v (eq:ecoriginalshards) and moves the reasons to
  App. H, with the third now reading "encoding segments of size W_G without padding".
  It is also new that the GP lists the sizes where the rate is optimal and recommends
  choosing validator set sizes from them.
- **Fewer validators, more tickets each.** "To ensure the accumulator can be saturated,
  when there are fewer validators, each validator is permitted more tickets": the entry
  index is below n = ⌈2E/|γ_P'|⌉ (eq:ticketsextrinsic), replacing the constant N = 2.
  With 1023 validators n is still 2.
- **Gas has a model.** 0.7.2 charged one unit per instruction and a base of 10 per host
  call. 0.8.0 charges each basic block in advance for the virtual CPU cycles that a
  simplified CPU-microarchitecture model needs to run it (App. A.9, eq:gascostforblock)
  and prices host calls from a table ("Host-function gas costs", App. I).

</div>

### Source pointers
- `../graypaper/text/intro.tex`, `previous_work.tex`, `discussion.tex`
- 0.8.0 deltas: `overview.tex` (§4.7–4.9), `safrole.tex` (eq:valcount, eq:ticketsextrinsic),
  `reporting_assurance.tex` (§11.3), `erasure_coding.tex` (eq:ecoriginalshards), `pvm.tex`
  (App. A.9), `pvm_invocations.tex` (`designate`), `accounts.tex` (χ_V sets ι),
  `definitions.tex` (host-function gas costs; V and N removed)
- `docs/DISCLOSURES.md`, `docs/CONFORMANCE_RETROSPECTIVE.md`
- lectures `011-graypaper-lectures/01-nomenclature` … `07-high-performance`

## Question bank

### Q1 ★ Why refine in-core and accumulate on-chain?
<details><summary>Model answer</summary>

Because on-chain execution is bounded by what one machine can do in a slot and JAM
wants throughput that grows with the network. Refine is the heavy, input-hungry part,
so it runs on three validators per core with no state, and the rest of the network is
convinced by guaranteeing, availability and auditing rather than by re-executing.
Accumulate must touch shared state coherently, so it runs on everyone, but it only
consumes the small results refine produced. The Graypaper's summary is that the two
have "a comparable level of crypto-economic security" and differ only in "scalability
versus synchroneity".

</details>

### Q2 ★ What is size-coherency antagonism and how does JAM answer it?
<details><summary>Model answer</summary>

The bigger a system's state, the further apart its parts, and the longer it takes for
the consequences of an event to reach everywhere, so coherence falls as size grows. The
standard answer is to split into independent pieces, like a cell dividing, which keeps
each piece coherent but loses coherence between pieces. JAM instead pipelines a large,
mostly coherent stage (in-core refinement) into a small, fully coherent stage (on-chain
accumulation), bounding the asynchrony to the pipeline's length and keeping one shared
state, like cache affinity in a multi-CPU machine with shared RAM.

</details>

### Q3 ★ Why not ZK proofs instead of auditing?
<details><summary>Model answer</summary>

Cost and centralisation. The RISC-Zero benchmark the Graypaper cites puts proof generation
at over 61 000 times the execution time on far more hardware, a 66 million times cost
multiplier against a recompiler, and even optimistic future estimates of 50 000 times
are several orders of magnitude off what a crypto-economic system like ELVES costs.
SNARK systems also still need crypto-economics for data availability and sequencing,
need redundant provers to avoid monopolies, and in practice have produced monopolies.
ELVES gets confidence from a random sample of validators re-executing, with slashing
for lies, which is cheap and keeps the work decentralised.

</details>

### Q4 Why does JAM use Safrole rather than a public leader schedule?
<details><summary>Model answer</summary>

The purpose of block production is to limit block rate and, ideally, prevent forks.
Safrole assigns each slot to exactly one sealer by an anonymous ring-VRF ticket contest
run an epoch ahead, so there is no contention within a slot and the sealer is not known
in advance and cannot be targeted. The Graypaper contrasts Ethereum, where "the
physical address of the leader is public in advance". Anonymity costs complexity: a
ticket accumulator, a ring root, an entropy schedule and a fallback if the contest
under-fills.

</details>

### Q5 Why 341 cores and 1023 validators, and which of them is fixed?
<details><summary>Model answer</summary>

Only the core count is fixed. C = 341 is a constant; since 0.8.0 the validator count is
not (0.7.2 had the constant V = 1023). Every validator key sequence has a length in 𝕍, a
multiple of three from 6 to 3C = 1023 (eq:valcount), and only the first |κ'|/3 cores are
active, each with three guarantors, because "the amount of in-core computation that is
possible scales with the number of validator nodes" (§11.3). Which sizes make sense comes
from erasure coding: the rate D(v) : v (eq:ecoriginalshards) follows from wanting to
reconstruct with almost two thirds of validators faulty, from the 16-bit field, and from
coding 4104-byte segments without padding. It is optimal, no more redundancy than
necessary, when D(v) = v/3 + 1, which holds for v in {6, 9, 15, 24, 33, 51, 54, 78, 105,
111, 159, 168, 225, 321, 339, 510, 681, 1023}; the GP recommends choosing set sizes from
that list, since just below one of them the rate degrades (about 1:4.5 at v = 1022, the
GP's own example; 1022 is not a multiple of 3 and so not in 𝕍, but eq:ecoriginalshards
gives the valid size just below it, 1020, D = 228 and the same ≈1:4.5). 1023 is the
largest, and it is the Discussion's "stated target", from which it derives bandwidth per
slot, audits per validator and 2 PB of availability. The protocol does not
choose the size: the staking system is out of scope (§4.8), and on-chain only χ_V may set
the staging keys ι, through `designate`, which panics if the keys cannot be read and
otherwise returns HUH if the count is not in 𝕍 or the caller is not χ_V.
Tickets scale with it too: each validator gets n = ⌈2E/|γ_P'|⌉ entries
(eq:ticketsextrinsic) "to ensure the accumulator can be saturated" when the set is small.

</details>

### Q6 Why erasure coding, and why over a binary field?
<details><summary>Model answer</summary>

Every validator storing every package would not scale, so data is coded so that any
D(v) of the v shards rebuilds it, tolerating almost two thirds of validators being
malicious or offline. D(v) = v/3 + 1 at the optimal sizes (342 of 1023) and is smaller
elsewhere (eq:ecoriginalshards). A binary field with Merkle commitments is chosen over the
polynomial-commitment coding Ethereum adopts for SNARK-friendliness because the latter
puts a CPU load "orders of magnitude higher" on validators, and JAM has no SNARKs to
please.

</details>

### Q7 Why RISC-V for the PVM and not the EVM?
<details><summary>Model answer</summary>

RISC-V is a general-purpose, well-tooled architecture: LLVM, Rust and C++ target it
directly, and its simplicity, 64-bit registers, small register count and little-endian
layout make it easy to recompile efficiently to real hardware. The EVM's 256-bit,
stack-based design does not fit modern CPUs; the Graypaper's prototype measured a 50 to
60 times asymptotic speed-up and the odd-product benchmark going from 58 s on EVM to
about 1 s on PVM. The PVM drops the EVM's complex cryptographic and environmental
instructions. Environmental interaction goes through host calls; cryptography has no host
call at all in Appendix B, so a service that needs it must run it as ordinary PVM code
and pay gas for it (see Q11).

</details>

### Q8 Why both gas and coretime?
<details><summary>Model answer</summary>

They measure different things. Gas bounds the time a PVM invocation may take, which is
needed to make in-core and on-chain execution predictable. Coretime is the resource
being bought: the right to have a package refined on a core for a slot. Ethereum fuses
purchase and authorisation into one signed transaction; JAM buys coretime in advance,
hands it to an authorisation agent, and lets an authorizer program decide what runs,
so nobody has to identify themselves to submit input. At 0.8.0 the gas side is concrete:
each basic block is charged in advance from a simplified CPU-microarchitecture model
(eq:gascostforblock) and each host call from a price table, replacing 0.7.2's one unit
per instruction and base of 10 per host call (see Q16).

</details>

### Q9 Why does the header carry the prior state root?
<details><summary>Model answer</summary>

To pipeline. An author can seal and broadcast a block before finishing the expensive
re-Merklization of the state it produces, and importers can overlap Merklization of one
block with execution of the next. Polkadot and Ethereum carry the posterior root and
must finish before publishing. The price is that an importer cannot self-check against
the block it just imported, and recent history needs the deferred-root correction.

</details>

### Q10 Why Keccak in a Blake2b protocol?
<details><summary>Model answer</summary>

Only where external systems must verify JAM's commitments: the accumulation-output belt
in recent history and the Beefy bridge. Ethereum and its contracts have cheap Keccak, so
Keccak-rooted commitments can be checked there without a Blake2b implementation. The
Graypaper's words are "to maximize compatibility with legacy systems".

</details>

### Q11 Why are there no user accounts or transactions?
<details><summary>Model answer</summary>

All accounts are services with code, state and balance but no secret key, hence no
nonce and no signed transactions. External data enters through refine's inputs, gated
by authorizers. This is what makes accessibility and generality compatible: anyone can
feed a service without the service needing a fee-paying identity model, and the chain's
on-chain half stays small because it never verifies user signatures itself. (Not in the
GP: jamswap measured an in-PVM Ed25519 verify at about 5.29 M gas under the 0.8.0 gas
model, against 1.31 M under 0.7.2. That is more than half of a report's whole accumulate
budget G_A = 10 M, against a refine budget G_R of 5 000 M, so signature checks belong in
refine. Recorded in jamswap `docs/THROUGHPUT.md` and `docs/LASAIR_INTERNALS.md`.)

</details>

### Q12 What does the Graypaper say is wrong with Polkadot as it stands?
<details><summary>Model answer</summary>

Three things. Composability: parachains are isolated, XCMP is asynchronous and
coarse-grained and depends on a slowly evolving language, so cross-chain innovation is
harder than in a single-environment smart-contract system. Accessibility: launching a
chain is hard and costly and requires winning a slot auction, of which there are about
fifty. Abstraction: Polkadot offers "parachains" while its validators actually run a
more general computation model; JAM exposes that model directly. What JAM keeps is
ELVES, the security machinery.

</details>

### Q13 Why is a common clock an assumption, and what is it used for?
<details><summary>Model answer</summary>

Block production needs slots, and slots need agreement on time. The Graypaper makes the
clock an explicit assumption (Polkadot did not) and argues NTP makes it pragmatic and
resilient. It is used in exactly one rule: a block whose slot is in the future is
temporarily invalid. Everything else is chain-paced.

</details>

### Q14 Why 24 hours for the lookup anchor and 28 days for the data lake?
<details><summary>Model answer</summary>

Refinement must be reproducible later by anyone synced to the finalised chain, so its
inputs are pinned to a lookup anchor that is finalised and recent; 24 hours bounds how
many headers a node must keep and how stale a report can be. The 28-day retention is
separate and comes from chapter 16: bundle shards "need not be retained after the
work-report is considered audited", but exported-segment shards "should be retained for
28 days", because exported segments exist to pass large data from one work-package to a
later one (chapter 14 calls this "a key feature of the JAM availability system"), so
data created in-core can be reused without being re-uploaded. The GP does not state a
reason for 28 days specifically.

</details>

### Q15 What does "resilience" mean in the Graypaper and how does the architecture deliver it?
<details><summary>Model answer</summary>

A system that honours its declared service "regardless of the desires, wealth or power
of any economic actors", for practical purposes unstoppable. Architecturally: a
specification with multiple clean-room clients rather than one optimised codebase; a
large validator set with anonymous sealers so no leader can be targeted; availability
that survives almost two thirds of validators failing; auditing and slashing so invalid
work is caught and punished before finality; and Grandpa refusing to finalise anything
containing a condemned report. The Solana outages and Ethereum's 2016 multi-client
survival are the paper's two illustrations.

</details>

### Q16 Why does 0.8.0 charge gas per basic block from a CPU model?
<details><summary>Model answer</summary>

Because gas is meant to count "approximately time-proportional" steps, and the 0.8.0
model is built to predict time: it is "a simplified model of a modern CPU
microarchitecture, heavily inspired by what's used by production-grade compilers to
predict how much time a given piece of code will take". For each basic block it simulates
decode slots, a reorder buffer that tracks dependencies between instructions, and ALU,
load, store, multiply and divide units, and charges the virtual cycles until every
instruction it ingested has retired, less 3 and at least 1 (App. A.9, eq:gascostforblock).
The whole block is charged on entry, before any of its instructions runs; if the gas left
does not cover it, execution stops out-of-gas with the counter unchanged. The overview leaves the
rest to implementers: Ψ's maximum running time must be approximately proportional to its
gas "regardless of other operands" (§4.7). (Not in the GP: a flat one unit per
instruction, as in 0.7.2, cannot price overlap, stalls and unit contention; and one charge
per block suits a recompiler, which can emit one gas check per block, not one per
instruction.)

</details>
