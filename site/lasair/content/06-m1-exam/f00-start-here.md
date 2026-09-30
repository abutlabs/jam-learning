---
title: "F0 · Start here: JAM in five minutes"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

# F0 · Start here: JAM in five minutes

<span class="lecture-badge">M1 Understanding · Foundations</span>

This page is the whole of JAM in four steps. Every later page, and every Gray Paper
chapter from 5 to 13, zooms in on one of them. If you can explain these four steps out
loud, you already have the skeleton every later chapter hangs on.

## The one idea

Ethereum asks every node to run every transaction. That is simple and safe, but the
whole network can only do as much work as one node can.

JAM splits the work in two. The expensive part is done by a **small group of
validators**. Everyone else only checks a short, signed result and applies it. The
Gray Paper calls these two halves **in-core** and **on-chain**.

<div class="eth-says">Ethereum comparison: it is the rollup idea, built into the base protocol, with the base-layer validators doing the rollup's work.</div>

Where the comparison breaks: in a rollup, the executor is a separate operator and you
wait for a fraud-proof window. In JAM, the executors are the chain's own staked
validators, and checking happens within seconds, not days.

## The four steps

Follow one piece of work, for example a jamswap order to buy 10 DOT at no more than
7 USDC each.

**1. Refine: the heavy work, done by a few.** JAM has 341 **cores**. A core is not a
CPU; it is a slot of guaranteed compute time, served by **3 validators** at a time. A
validator set holds at most 1,023 validators (3 × 341), enough to staff every core; a
smaller set switches on only as many cores as it has groups of three.
Those validators run the service's *refine* code on the work: for jamswap, the
matching engine. The output is a short **work-report**: "this input, run by this
code, gave this result". Think: a rollup executing its batch.

**2. Guarantee: the signed receipt goes on-chain.** Two or three of those validators
sign the work-report. The signed report is a **guarantee**, and it goes into a block.
By signing, the validators stake their reputation and funds on the result being
right. Think: the rollup posting its batch commitment to L1.

**3. Assurance: "I have my piece".** The work's input data was cut into erasure-coded
pieces and spread over all validators. Each validator then says, in the next blocks,
"I hold my piece" (an **assurance**). When more than two thirds do, the report is
**available**: the data can be rebuilt by anyone who needs to check it. Think: a data
availability layer, built in.

**4. Accumulate: apply the result, done by every node.** Now every node runs the
service's small, cheap *accumulate* code, which applies the result to on-chain state:
balances move, the order book updates. Think: the rollup's settlement contract on L1.
It is cheap because the heavy lifting already happened in step 1. The budgets show it: the
gas limits a work-package sets for its items must add up to under 5 billion for refine
(G_R) but under 10 million for accumulate (G_A) (eq:wplimits).

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0: what changed under the four steps</div>

- **The validator count is no longer a constant.** V = 1023 is gone. A set may be any
  multiple of three from 6 to 3C = 1023 (eq:valcount). C = 341 stays fixed, but only the
  first |κ'|/3 cores are active (Guarantor Assignments, sec:coresandvalidators), so every
  active core still has 3 guarantors.
- **"More than two thirds" means of the live set.** Step 3's threshold is now more than
  2/3 of the active set κ, not of a fixed 1023 (eq:availableworkreports). A report still
  waiting in step 3 is dropped after U = 5 slots, as before, and now also whenever the
  active set changes size (eq:availassignmentspostassurancesdef).
- **Gas kept its budgets but changed meaning.** G_R and G_A have the same values, but the
  PVM now charges a basic block's whole cost in advance, each time execution enters it,
  priced by a simulated CPU pipeline (eq:gascostforblock), instead of a per-instruction
  charge.

</div>

## The picture

<svg class="fdiag" viewBox="0 0 360 430" role="img" aria-label="Four steps: refine off-chain by a few validators, then guarantee, assurances and accumulate on-chain by every node">
<defs><marker id="ah-f00" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<text class="title" x="180" y="20" text-anchor="middle">One piece of work through JAM</text>
<rect class="zone" x="10" y="32" width="340" height="92" rx="10"/>
<text class="muted" x="20" y="48">IN-CORE: a few validators</text>
<rect class="box hot" x="30" y="58" width="300" height="52" rx="8"/>
<text x="180" y="80" text-anchor="middle">1 · Refine on a core</text>
<text class="muted" x="180" y="98" text-anchor="middle">3 validators run the heavy code</text>
<line class="arrow" x1="180" y1="110" x2="180" y2="164" marker-end="url(#ah-f00)"/>
<rect class="zone" x="10" y="140" width="340" height="238" rx="10"/>
<text class="muted" x="20" y="156">ON-CHAIN: every node</text>
<rect class="box" x="30" y="166" width="300" height="52" rx="8"/>
<text x="180" y="188" text-anchor="middle">2 · Guarantee</text>
<text class="muted" x="180" y="206" text-anchor="middle">signed receipt enters a block</text>
<line class="arrow" x1="180" y1="218" x2="180" y2="238" marker-end="url(#ah-f00)"/>
<rect class="box" x="30" y="240" width="300" height="52" rx="8"/>
<text x="180" y="262" text-anchor="middle">3 · Assurances</text>
<text class="muted" x="180" y="280" text-anchor="middle">over 2/3 hold their piece: available</text>
<line class="arrow" x1="180" y1="292" x2="180" y2="312" marker-end="url(#ah-f00)"/>
<rect class="box ok" x="30" y="314" width="300" height="52" rx="8"/>
<text x="180" y="336" text-anchor="middle">4 · Accumulate</text>
<text class="muted" x="180" y="354" text-anchor="middle">every node applies the result</text>
<text class="muted" x="180" y="400" text-anchor="middle">Meanwhile: auditors re-check at random</text>
<text class="muted" x="180" y="418" text-anchor="middle">Underneath: Safrole picks block authors</text>
</svg>

Read it top to bottom. Only step 1 is expensive, and only a few validators do it. Steps
2 to 4 happen inside ordinary blocks that every node imports. One piece of work crosses
several blocks in this order. Inside a single block, though, the Gray Paper processes
disputes first, then assurances, then new guarantees: a core holds only one pending report
at a time, so it must be freed before it is refilled (eq:rhodagger, eq:rhoddagger,
eq:rhoprime, eq:reportcoresareunused). The dashed boxes are the
two "consensus models" the Gray Paper's Overview names: in-core and on-chain.

## Two things running underneath

**Auditing: fraud-proofs, done proactively.** After a report becomes available, a
random, secret sample of validators re-runs the refine step themselves. If an auditor
finds the result wrong, it raises a **dispute**. The validators judge it, the report is
thrown out, and the guarantors who signed it are recorded as offenders, to be punished. Audits run in 8-second
rounds ("tranches"), and more auditors join if some fail to show up. The chain's
finality gadget, GRANDPA, only votes on blocks whose reports have been audited.

**Safrole: who writes each block.** Block authors are chosen in advance for a whole
epoch (600 slots of 6 seconds, one hour) through an anonymous lottery of **tickets**.
Normally nobody knows who holds the next slot until that validator publishes the
block. (If the lottery fails to fill, a known fallback order is used instead.) This
keeps forks rare. It plays the role Ethereum's RANDAO-based proposer selection plays.

## Where each step lives in the Gray Paper

| Step or topic | Chapter |
|---|---|
| The whole picture, the state, the dependency graph | 4 Overview |
| The header | 5 |
| Block authors, tickets, epochs (Safrole) | 6 |
| Recent history of blocks | 7 |
| Who may use a core (authorization) | 8 |
| Services and their accounts | 9 |
| Disputes and judgments | 10 |
| Step 2 guarantee and step 3 assurance, on-chain | 11 Reporting and Assurance |
| Step 4 accumulate | 12 Accumulation |
| Statistics about who did what | 13 |
| What a work-package and work-report contain | 14 |
| Auditing | 17 |
| The machine that runs refine and accumulate (PVM) | Appendix A (and B for its host calls) |

M1 covers chapters 3 to 13: what every node does when it imports a block. Chapters 14 to
17 are the off-chain half; an importer does not run them, but they explain it.

## How to use Foundations

1. Read F0 to F10 in order, about ten minutes each. F2 to F9 follow the same jamswap
   order through each step, one idea at a time.
2. Tap any Greek letter on any page to see its plain name. F10 is the full symbol card.
3. After each page, run its "Check yourself" questions in the Exam Room at level 1.
4. When Foundations is at 100%, start level 1 of the chapter sheets with Ch. 4 Overview.
   The sheets will read very differently once the four steps are familiar.
