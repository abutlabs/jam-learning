---
title: "F9 · The chain around it: blocks, Safrole, finality"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F9 · The chain around it: blocks, Safrole, finality

<span class="lecture-badge">Foundations · the machine the journey rides on</span>

Your order's journey is complete: matched in refine, guaranteed, made available,
settled in accumulate, audited, finalised. Every one of those steps happened inside
**blocks**. This lesson is about the chain itself: how blocks are timed, who is allowed
to write them, how the header ties them together, and when a block becomes final.

## What you already know

Ethereum proof of stake: a 12-second slot, a 32-slot epoch, one proposer chosen per slot
by RANDAO randomness and known about an epoch ahead, attestations, and finality after
two epochs (Casper FFG). Each block header commits to the state root after the block.

<div class="eth-says">Ethereum: public proposer schedule, posterior state root, finality in about 13 minutes. JAM: an anonymous schedule decided by tickets, the prior state root in the header, finality by GRANDPA once blocks are audited.</div>

## What JAM does

**The block.** A block is a header plus five kinds of extrinsic data: **tickets**
(Safrole bids, below), **disputes** (F8), **preimages** (data blobs services asked for),
**assurances** (F6) and **guarantees** (F5). That is the whole list. There are no
user transactions: your order entered through a work-package, not through the block.

**The clock.** Time is counted in 6-second **slots** from the JAM Common Era, midday UTC
on 1 January 2025. An **epoch** is 600 slots, exactly one hour (12 slots in the small
"tiny" test configuration). A block may not claim a slot in the future, and each block's
slot must be later than its parent's.

**Who writes each block: Safrole.** During an epoch, validators submit **tickets** in
blocks. A ticket is an anonymous bid: a ring-VRF proof that says "some member of the
next validator set made this" without saying who. Tickets are accepted only during the
first 500 slots of the epoch (10 at tiny). The best 600 tickets decide who seals each
slot of the **next** epoch. A block may only carry tickets that make that cut: the chain
keeps the best 600 seen so far this epoch, and a ticket that would be dropped at once is
"useless" and makes the block invalid (sec:safrolextandtickets). The rule is not new in
0.8.0, but lasair's author broke it until the 0.8.0 migration caught it, and PolkaJam
rightly refused those blocks ([Ch. 6](lesson.html?lesson=06-m1-exam/ch06-safrole) has
the story). Only the ticket's owner knows which slots are theirs, until they reveal it by
sealing the block. If not enough tickets arrive, Safrole falls back to a public schedule
picked from the active validators using on-chain randomness. The header carries two
signatures by the author: the **seal**, and a VRF output that feeds
the chain's randomness.

**Randomness.** The chain keeps an **entropy** pool, η. Every block mixes in the
author's VRF output; at each epoch change the older values shift along. This randomness
seeds the fallback schedule, the guarantor shuffle that assigns validators to cores
(F4), and more.

**Validator sets rotate per epoch.** The **active** set, κ, authors, guarantees and
assures now. Last epoch's set, λ, is also kept: for example, dispute judgments signed by last epoch's
validators are checked against it (ch. 10). A
**staging** set, written by a privileged service during accumulate, waits its turn. On
the first block of a new epoch everything moves one step along, and that block's header
carries an **epoch marker** announcing the keys of the validators who take over at the
*next* epoch change, plus two entropy values, so light clients can follow
(eq:epochmarker). All of Safrole's own bookkeeping (tickets collected so far, this
epoch's sealing order, the pending keys) lives in one state component, γ.

**The header's state root is the prior one.** A JAM header commits to the state the
block was built **on**, not the state after it. So an author can seal and publish a block
without waiting to recompute the new Merkle root. An importer learns whether its own
result was right when the next block arrives and its header carries that root.

**Recent history.** The chain keeps the last 8 blocks' header hashes, state roots,
slots, the commitment to accumulation outputs (F7) and the work-packages each block
reported (eq:recenthistoryspec). Reports use it to name the block they were built
against, the chain uses it to refuse duplicate packages, and bridges use it to prove what
JAM accumulated.

**Finality.** Safrole makes forks rare but not impossible. **GRANDPA** decides what is
final: validators vote only for blocks they see as audited (F8), and the best chain to
build on is the one with the most ticket-sealed blocks that contains no disregarded
block. jamswap shows exactly this on each fill: **Finalizing**, then **Final**, which its
README says takes about 2 to 4 blocks.

**Bookkeeping.** Activity statistics count, per validator, blocks authored, tickets,
preimages, guarantees and assurances, plus per-core and per-service activity.

## The picture

<svg class="fdiag" viewBox="0 0 360 500" role="img" aria-label="Recap of the whole journey: service and work-package, refine on a core, guarantee lands, availability, accumulate, audited then final">
<defs><marker id="ah-f09" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="16" width="300" height="56" rx="8"/>
<text class="title" x="180" y="40" text-anchor="middle">1 · Order in a work-package</text>
<text class="muted" x="180" y="60" text-anchor="middle">F2, F3: service and package</text>
<line class="arrow" x1="180" y1="72" x2="180" y2="94" marker-end="url(#ah-f09)"/>
<rect class="box" x="30" y="98" width="300" height="56" rx="8"/>
<text class="title" x="180" y="122" text-anchor="middle">2 · Refine on one core</text>
<text class="muted" x="180" y="142" text-anchor="middle">F4: a few validators match the batch</text>
<line class="arrow" x1="180" y1="154" x2="180" y2="176" marker-end="url(#ah-f09)"/>
<rect class="box" x="30" y="180" width="300" height="56" rx="8"/>
<text class="title" x="180" y="204" text-anchor="middle">3 · Guarantee lands</text>
<text class="muted" x="180" y="224" text-anchor="middle">F5: signed report waits in ρ</text>
<line class="arrow" x1="180" y1="236" x2="180" y2="258" marker-end="url(#ah-f09)"/>
<rect class="box" x="30" y="262" width="300" height="56" rx="8"/>
<text class="title" x="180" y="286" text-anchor="middle">4 · Available</text>
<text class="muted" x="180" y="306" text-anchor="middle">F6: over 2/3 hold their piece</text>
<line class="arrow" x1="180" y1="318" x2="180" y2="340" marker-end="url(#ah-f09)"/>
<rect class="box hot" x="30" y="344" width="300" height="56" rx="8"/>
<text class="title hot-text" x="180" y="368" text-anchor="middle">5 · Accumulate</text>
<text class="muted" x="180" y="388" text-anchor="middle">F7: every node settles the trade</text>
<line class="arrow" x1="180" y1="400" x2="180" y2="422" marker-end="url(#ah-f09)"/>
<rect class="box ok" x="30" y="426" width="300" height="56" rx="8"/>
<text class="title" x="180" y="450" text-anchor="middle">6 · Audited, then final</text>
<text class="muted" x="180" y="470" text-anchor="middle">F8, F9: auditors, then GRANDPA</text>
</svg>

This is your whole order's journey on one screen. Steps 1 and 2 happen off-chain on one
core. Steps 3 to 5 happen on-chain, block by block, run by every node. Step 6 is the
safety net that makes step 2 trustworthy. Everything in this lesson (slots, Safrole,
the header, GRANDPA) is the machine carrying those steps forward every 6 seconds.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the chain's randomness pool | entropy | η | 6 |
| validators working this epoch | active validator set | κ | 6 |
| Safrole's bookkeeping | Safrole state | γ | 6 |

Plain names only, for now: the previous and staging validator sets, recent history, and
activity statistics. The [symbol card](lesson.html?lesson=06-m1-exam/f10-symbol-card)
gives every letter, and tapping any Greek letter in a lesson shows its name.

## Why it is built this way

- **Anonymous tickets.** If everyone knows who seals the next slot, that validator can
  be attacked or bribed in advance. Tickets keep the schedule secret until each block is
  sealed, while still fixing exactly one author per slot so forks are rare.
- **A fallback.** Ticket submission can fail (the Gray Paper calls it "a very much
  unexpected eventuality"), so there is always a way to keep producing blocks.
- **Prior state root.** The Gray Paper says this directly: it is done "to facilitate the
  pipelining of block computation and in particular of Merklization". This is a
  deliberate departure from both Ethereum and Polkadot.
- **Finality after audits.** Finalising is permanent, so it waits until the work in the
  block has been re-checked (F8). Safrole limits forks; GRANDPA settles which chain is
  history.

The first point is reasoning about why anonymity helps (the Gray Paper's own framing is
fork minimisation); the other three restate the Gray Paper.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- **Validator sets vary in size.** 0.7.2 fixed V = 1023. In 0.8.0 the active, previous,
  staging and pending sets may each hold any multiple of 3 from 6 to 3C = 1023
  (eq:valcount). The epoch marker carries as many keys as the incoming set has, and the
  author index ranges over |κ′| (sec:header). If the size of κ changes, every core's
  pending report is dropped, as if it had timed out
  (eq:availassignmentspostassurancesdef).
- **Tickets per validator scale with the set.** The 0.7.2 constant N = 2 is gone. A
  ticket's entry index must be below n = ⌈2E/|γ_P′|⌉ (eq:ticketsextrinsic). With E = 600,
  any set of 600 or more (including the full 1023) still gets 2 each; only a set below
  600 gets more, "to ensure the accumulator can be saturated".
- **Recent history records each block's slot.** Each β_H entry gained the slot H_T
  (eq:recenthistoryspec, eq:recenthistorydef). A report's refinement context gained the
  anchor's slot (eq:workcontext), and it must now match that entry's slot, along with the
  header hash, state root and accumulation-output super-peak (sec:contextualvalidity).
- **The extrinsic hash commits to each preimage.** H_X now commits to the preimages as a
  list of (service id, hash of the data) pairs, where 0.7.2 used the encoded preimages
  themselves. So one preimage's inclusion can be proven on its own, as a report's already
  could (sec:header, the H_X definition).
- **Wording only.** What 0.7.2 called the "seal-key series" or "slot key sequence" is now
  the *slot-sealer sequence*, γ_S (sec:slotkeysequence), and validator key "sets" are now
  "sequences". Those rules did not change.

</div>

## Questions to ask yourself

- "What does a JAM header contain, and why the prior state root?"
  [Ch. 5 The Header](lesson.html?lesson=06-m1-exam/ch05-header).
- "What is a ticket, when can it be submitted, and what if too few arrive?"
  [Ch. 6 Safrole](lesson.html?lesson=06-m1-exam/ch06-safrole).
- "Draw the whole block transition: which parts depend on which?"
  [Ch. 4 Overview](lesson.html?lesson=06-m1-exam/ch04-overview), the dependency graph.

**You have the whole picture now.** Go to the [Exam Room](exam.html?chapter=ch04-overview&level=1),
**level 1 of Ch. 4 Overview**. The Overview chapter is this journey written in the Gray
Paper's own language, and it will read very differently now.
