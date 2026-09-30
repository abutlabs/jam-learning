---
title: "F6 · One order's journey: availability"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

# F6 · One order's journey: availability

<span class="lecture-badge">Foundations · step 5 of the journey</span>

Where we are: your order, "buy 10 DOT, pay at most 7 USDC each", was matched in a
jamswap batch on a core (F4). Two or three guarantors signed the resulting work-report,
and that guarantee landed in a block (F5). The guarantee (the report plus its signatures)
now sits in ρ, the one waiting slot its core has. Nothing has been settled yet. Before it
can be, the chain has to be sure the input data can still be fetched.

## What you already know

On Ethereum, a rollup posts its batch data to L1 (calldata, or blobs since EIP-4844) so
that anyone can re-check the rollup later. That is data availability: a result is only
trustworthy if the inputs behind it can be downloaded by whoever wants to verify it.

<div class="eth-says">Ethereum: the data rides inside L1 blocks. JAM: the data never enters a block; validators each keep a piece and vote that they have it.</div>

## What JAM does

The report that landed in the block is small. It says "this package, with this hash,
produced these results". The package itself (your order, the batch, everything refine
read) is much bigger, and it does **not** go into the block.

Instead, when the guarantors built the report (F4), they also **erasure-coded** the
package bundle (and the segments it exported): they cut it into as many pieces as there
are validators in the active set, with enough redundancy that roughly any third of the
pieces is enough to rebuild the whole thing. At full scale that is 1 023 pieces, one per
validator, and any 342 of them reconstruct the bundle. Each validator receives its own
piece, with a Merkle proof that it matches the report's erasure root.

Every timeslot, each validator then tells the chain which pieces it is holding. It does
this with an **assurance**: a bitfield with one bit per core ("I hold my piece for core 0,
not for core 1, I hold it for core 2 ..."), signed with the validator's Ed25519 key and
anchored to the parent block. Block authors collect these into the assurances extrinsic,
**E_A**. A validator should set a core's bit only once it holds, and has checked against
those proofs, both its piece of the bundle and its piece of every exported segment
(Availability Assurance, sec:assurance). Nothing on-chain punishes a false claim: the Gray
Paper calls the bit a "soft" implication, "since there is no consequence on-chain if
dishonestly reported" (footnote to eq:xtassurances). What the chain does check is the
signature, the parent anchor, that assurances come in ascending validator-index order (so
at most one per validator), and that the core really has a report waiting.

The rule that follows is simple:

- When **more than two thirds** of the active validators (κ) have set the bit for your
  core, the report becomes **available**. It leaves ρ and joins **R**, the set of
  reports that became available in this block. At full scale that means at least 683 of
  1 023 validators; at tiny, 5 of 6.
- If a block arrives **5 or more slots** (30 seconds) after the report landed and the
  report still has not crossed that line, it is **timed out**: the core is cleared and
  the report is simply dropped. The core is free for new work.
- At an epoch change where the new active set has a different size (|κ| ≠ |κ′|), every
  report that did not just become available is cleared as well (new in GP 0.8.0; see the
  box below).

Assurances are processed before new guarantees in each block (ρ‡ before ρ′). A core has only
one slot, so it must be emptied before it can be refilled (the Gray Paper gives this
reason itself, at the start of ch. 11).

For your order: in normal operation the assurances arrive within a block or two, the
report becomes available, and the next step (F7) settles the trade.

## The picture

<svg class="fdiag" viewBox="0 0 360 460" role="img" aria-label="Availability: the bundle is split into one piece per validator, validators sign bitfields, over two thirds makes the report available, otherwise it times out after five slots">
<defs><marker id="ah-f06" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="20" width="300" height="56" rx="8"/>
<text class="title" x="180" y="44" text-anchor="middle">Report waits in ρ</text>
<text class="muted" x="180" y="64" text-anchor="middle">one slot per core, from F5</text>
<line class="arrow" x1="180" y1="76" x2="180" y2="100" marker-end="url(#ah-f06)"/>
<rect class="box" x="30" y="104" width="300" height="56" rx="8"/>
<text class="title" x="180" y="128" text-anchor="middle">Bundle split into pieces</text>
<text class="muted" x="180" y="148" text-anchor="middle">one per validator; about 1/3 rebuilds it</text>
<line class="arrow" x1="180" y1="160" x2="180" y2="184" marker-end="url(#ah-f06)"/>
<rect class="box hot" x="30" y="188" width="300" height="56" rx="8"/>
<text class="title hot-text" x="180" y="212" text-anchor="middle">Validators sign bitfields</text>
<text class="muted" x="180" y="232" text-anchor="middle">E_A: "I hold my piece for core c"</text>
<line class="arrow" x1="180" y1="244" x2="180" y2="268" marker-end="url(#ah-f06)"/>
<rect class="box" x="30" y="272" width="300" height="56" rx="8"/>
<text class="title" x="180" y="296" text-anchor="middle">Count bits per core</text>
<text class="muted" x="180" y="316" text-anchor="middle">more than 2/3 of validators?</text>
<line class="arrow" x1="120" y1="328" x2="95" y2="370" marker-end="url(#ah-f06)"/>
<line class="arrow" x1="240" y1="328" x2="265" y2="370" marker-end="url(#ah-f06)"/>
<rect class="box ok" x="20" y="374" width="150" height="62" rx="8"/>
<text class="title" x="95" y="398" text-anchor="middle">Yes: available</text>
<text class="muted" x="95" y="418" text-anchor="middle">leaves ρ, joins R</text>
<rect class="box" x="190" y="374" width="150" height="62" rx="8"/>
<text class="title" x="265" y="398" text-anchor="middle">No for 5 slots</text>
<text class="muted" x="265" y="418" text-anchor="middle">timed out, dropped</text>
</svg>

Read it top to bottom. The report waits in its core's slot. Its data is spread across
all validators as pieces. Each validator votes with a signed bitfield. Once more than
two thirds hold their piece, the report is available and moves on to settlement. If the
votes never reach that line within five slots, the report is thrown away and the core is
reused.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the core's waiting slot | availability assignment | ρ (from F5) | 11 |
| "I hold my pieces" votes | assurances extrinsic | E_A | 11 |
| reports that just became available | newly available work-reports | **R** | 11, 12 |
| how long a report may wait | assurance timeout | U = 5 slots | 11, Definitions |

**R** is written in bold in the Gray Paper. Later you will meet R* (R with a star),
which is the sequence accumulation actually processes; it starts from **R**. The pieces
themselves are defined in the Erasure Coding appendix.

## Why it is built this way

- **Auditors need the data.** In F8, randomly chosen validators re-run refine to check
  the guarantors. They can only do that if they can rebuild the bundle. Availability is
  the promise that they will be able to.
- **Why more than two thirds.** The code needs about one third of the pieces to rebuild
  the bundle. Requiring more than two thirds of validators to say "I have mine" leaves
  room for up to a third of them to be lying or offline and still leave enough honest
  pieces. At full scale: 683 assurers, less up to 341 faulty ones, still leaves 342
  honest pieces, exactly the number needed. (The Erasure Coding appendix states the
  code's side: the rate is chosen so the data can be rebuilt "even should almost
  two-thirds of the v validators be malicious or incapacitated", eq:ecoriginalshards.
  Pairing that with the assurance threshold is reasoning, not GP text.)
- **Why not put the data in the block.** Every node would have to download every
  package, which is exactly the "everyone does everything" limit JAM exists to escape.
  Spreading pieces means each validator stores only a small share.
- **Why a timeout.** Without it, a package whose data was never distributed could block
  its core forever. The Gray Paper keeps a report's registration slot "so that it can be
  cleared if it is not made available quickly enough".

Where the Ethereum analogy breaks: Ethereum's data availability is about data that is
already in (or attached to) the chain. JAM's is a vote about data held **off** the chain,
and the data only needs to be kept until auditing is done (exported segments that other
packages may import are kept for 28 days).

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- **The validator count is no longer a constant.** V = 1023 is gone. The active set κ may
  be any multiple of three from 6 to 1023 (eq:valcount). "More than two thirds" now means
  more than 2/3 of |κ| (eq:availableworkreports): 683 of 1 023, 5 of 6.
- **The piece count travels in the report.** The availability spec gained v, the number
  of erasure-coded pieces, and a guarantee is rejected unless v = |κ'| (eq:avspec, and the
  rule just before eq:reportcoresareunused). The code rate is 𝒟(v):v
  (eq:ecoriginalshards): any 342 of 1 023 pieces rebuild the data, any 3 of 6 at tiny.
  In 0.7.2 the rate was a fixed 342:1023.
- **A third way to leave ρ.** Besides becoming available or timing out, every entry is
  cleared when the active set changes size, |κ| ≠ |κ'| (eq:availassignmentspostassurancesdef).
  κ only changes at an epoch change (sec:keyrotation), so that is the only time this can
  happen. A report that did not become available in that same block is dropped; the Gray
  Paper says items cleared this way "can be viewed as having timed out early". Their
  pieces were cut for the old set size (reasoning; the GP notes that "erasure-coding
  depends on the size of the assuring validator set", sec:availabiltyspecifier).
- **ρ holds the whole guarantee.** Each entry, now called an availability assignment, is
  the guarantee (report, slot, signatures) plus t, the slot of the block that placed it
  (eq:reportingstate). In 0.7.2 it held the bare report and its slot.
- **Only the first |κ'|/3 cores are active** (sec:coresandvalidators), so ρ' is always
  empty for the rest. The Gray Paper notes this keeps the audit load within what the
  active validators can handle.

</div>

## Questions to ask yourself

- "What does an assurance actually say, and who signs it?" The ch. 11 sheet, section
  *The transition in plain English*: [Ch. 11 Reporting & Assurance](lesson.html?lesson=06-m1-exam/ch11-reporting-assurance).
- "Why more than two thirds, when erasure coding only needs a third?" Same sheet,
  *Validation rules and what they guard*, and the numbers in
  [C · JAM architecture](lesson.html?lesson=06-m1-exam/c-architecture).
- "What happens to a report nobody assures?" It times out after 5 slots and its core is
  cleared. Ch. 11 sheet, edge cases.

Next: [F7 · accumulate](lesson.html?lesson=06-m1-exam/f07-accumulate), where your trade
is finally settled.
