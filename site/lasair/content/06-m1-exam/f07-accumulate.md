---
title: "F7 · One order's journey: accumulate"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F7 · One order's journey: accumulate

<span class="lecture-badge">Foundations · step 6 of the journey</span>

Where we are: the report carrying your matched order became **available** (F6). Enough
validators hold its pieces that anyone can rebuild the data. Now, finally, the trade is
settled: DOT moves to you, USDC moves to the seller. This step is called **accumulate**,
and it is the only step that changes a service's on-chain state.

## What you already know

On Ethereum a transaction runs once, on-chain, on every node, and the state change
happens right there: the contract's storage and the token balances update inside the
same execution that did all the work.

<div class="eth-says">Ethereum: one on-chain execution does all the work and writes the state. JAM: the heavy work already happened in refine; accumulate is a short on-chain step that only applies the result.</div>

## What JAM does

Every service has two pieces of code (F2). Refine did the heavy lifting on one core. Now
**every node** runs the service's other entry point, **accumulate**, in the PVM. The Gray
Paper writes this run as **Ψ_A**.

Accumulate does not get the whole package. It gets a compact summary: for each result
of your service in the report, an **operand**: the package hash, the package's exports root, the
authorizer, the payload hash, the gas limit, the authorizer's trace and the refine output
(or the error).
For jamswap, that output is the batch's matching result: who trades with whom, at what
price. jamswap's accumulate is its **settlement** step. In the jamswap docs' words, it
"moves the actual balances between accounts" and records the new order book. This is
the moment your 10 DOT become yours.

A few rules shape how this happens:

- **Gas is budgeted up front.** Each result in a report carries a gas limit for
  accumulate. It must be at least the service's minimum, and one report's results may
  ask for at most **G_A = 10 million** gas in total. The whole block has a budget of
  **G_T = 3.5 billion** gas. It is bigger only when G_A times the number of cores, plus
  the free gas of privileged "always accumulate" services, comes to more. Reports are
  taken in order, as many as fit. The gas already promised to the "always accumulate"
  services and to pending transfers is set aside first (eq:accseq). The budget is
  always big enough for every newly available report that names no dependency at all,
  neither a prerequisite nor a segment-root lookup (at most one report per core, each
  at most G_A). Those go first; queued ones that do not fit simply stay queued for a
  later block.
- **Grouped by service.** All of a service's operands in one round go into a single
  accumulate run, which saves PVM start-up cost.
- **Dependencies wait.** A package may say "accumulate me only after package X". If X
  has not been accumulated yet, the report waits in the **ready queue**, ω. When X is
  accumulated, the waiting report is released, possibly in the same block.
- **No double settlement.** The chain keeps a record of package hashes accumulated in
  roughly the last epoch, ξ. A report for a package already in there is rejected earlier,
  when it is guaranteed.
- **Services can pay each other.** Accumulate may send a **transfer** (an amount, a
  128-byte memo and a gas allowance the sender pays for) to another service. The
  receiving service gets it in a later round of the same block's accumulation, with
  that gas added to its budget.
- **Outputs are committed.** Each accumulate run may yield one output hash. The block's
  outputs are folded into recent history, so a bridge can later prove what JAM
  accumulated (F9).
- **Then preimages.** Only after all this are the block's preimages (requested data
  blobs) stored into accounts. Each must have been requested in the state before this
  block; any that accumulation made useless are quietly skipped.

## The picture

<svg class="fdiag" viewBox="0 0 360 452" role="img" aria-label="Accumulate: available reports and released queued reports are run through each service's accumulate code within the gas budget; the service state changes; then preimages are integrated">
<defs><marker id="ah-f07" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="20" width="140" height="56" rx="8"/>
<text class="title" x="100" y="44" text-anchor="middle">Newly available</text>
<text class="muted" x="100" y="64" text-anchor="middle">R, from F6</text>
<rect class="box" x="190" y="20" width="140" height="56" rx="8"/>
<text class="title" x="260" y="44" text-anchor="middle">Ready queue ω</text>
<text class="muted" x="260" y="64" text-anchor="middle">waiting on dependencies</text>
<line class="arrow" x1="100" y1="76" x2="160" y2="104" marker-end="url(#ah-f07)"/>
<line class="arrow" x1="260" y1="76" x2="200" y2="104" marker-end="url(#ah-f07)"/>
<rect class="box" x="30" y="108" width="300" height="56" rx="8"/>
<text class="title" x="180" y="132" text-anchor="middle">Order the reports, fit the gas</text>
<text class="muted" x="180" y="152" text-anchor="middle">up to 10M per report; 3.5B per block</text>
<line class="arrow" x1="180" y1="164" x2="180" y2="188" marker-end="url(#ah-f07)"/>
<rect class="box hot" x="30" y="192" width="300" height="56" rx="8"/>
<text class="title hot-text" x="180" y="216" text-anchor="middle">Every node runs Ψ_A</text>
<text class="muted" x="180" y="236" text-anchor="middle">one run per service, on-chain</text>
<line class="arrow" x1="180" y1="248" x2="180" y2="272" marker-end="url(#ah-f07)"/>
<rect class="box ok" x="30" y="276" width="300" height="56" rx="8"/>
<text class="title" x="180" y="300" text-anchor="middle">Service state changes</text>
<text class="muted" x="180" y="320" text-anchor="middle">jamswap: balances move, order book saved</text>
<line class="arrow" x1="180" y1="332" x2="180" y2="356" marker-end="url(#ah-f07)"/>
<rect class="box" x="30" y="360" width="300" height="56" rx="8"/>
<text class="title" x="180" y="384" text-anchor="middle">Record and tidy up</text>
<text class="muted" x="180" y="404" text-anchor="middle">ξ remembers; outputs; then preimages</text>
</svg>

Two streams feed in at the top: reports that just became available, and older reports
released from the ready queue because their dependency was just met. They are lined up
and cut to fit the gas budget. Every node runs each service's accumulate code once per
round. The service's state changes, which for jamswap is the trade settling. Finally the
chain records what it accumulated and folds in the block's preimages.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the on-chain run of a service's settlement code | accumulate invocation | Ψ_A | 12, App. B |
| reports waiting for a dependency | ready queue | ω | 12 |
| packages settled recently | accumulated history | ξ | 12 |

Also in this lesson, plain names only for now: the per-report gas G_A and the block gas
G_T (Definitions appendix), and the accumulation outputs, which F9 shows being committed
into recent history.

## Why it is built this way

- **Two phases, two kinds of consensus.** Refine is heavy, stateless and run by a few
  validators; accumulate is light, stateful and run by everyone. The Gray Paper's summary
  is that the difference between them is "scalability versus synchroneity": in-core work
  scales, on-chain work sees one consistent state.
- **Sequential, then grouped.** The Gray Paper explains the execution shape directly:
  the real gas used is only known after a report is accumulated, which forces a
  sequential pattern, while starting the PVM is not free, which favours grouping each
  service's work into one run. It does both.
- **Dependencies are allowed but bounded.** A report whose dependency is missing is
  deferred, not rejected. The ready queue holds one epoch's worth of slots, so waiting is
  not forever.

Where the Ethereum analogy breaks: on Ethereum, gas pays for the whole computation. On
JAM the expensive computation was refine (just under 5 billion gas per package, in-core). The
on-chain accumulate gas is a much smaller, separate allowance. That split is the whole
point.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- The budget rule for each round changed (eq:accseq, GP #500). The gas of pending
  transfers and of the "always accumulate" services now counts against the budget
  before reports are fitted. The next round gets this round's budget minus the gas it
  actually used, plus the gas carried by the transfers it just sent. In 0.7.2 only the
  reports' gas limits were counted, and the gas of the transfers a round received was
  added back for the round after it.
- Accumulation now also returns the transfers it processed. Each service's
  accumulation statistics are (work-items, transfers received, gas used), kept when
  any of the three is non-zero (eq:accumulationstatisticsdef, GP #502). In 0.7.2 they
  were (gas, work-items).
- The PVM now charges gas per basic block, from a model of a CPU pipeline (App. A,
  eq:gascostforblock). Each host call now has its own base cost, and some add a charge
  that grows with the data they touch (App. B, eq:fnmemgas); in 0.7.2 every host call
  cost a flat 10 gas (transfer: 10 plus its gas allowance). jamswap measured one
  ed25519 check inside the PVM at about 5.29 million gas under 0.8.0 (not in the GP;
  jamswap `docs/LASAIR_INTERNALS.md`). That is over half of G_A, so jamswap checks
  signatures in refine, not accumulate.

</div>

## Questions to ask yourself

- "Walk me from a newly available report to a state change." The ch. 12 sheet, *The
  transition in plain English*: [Ch. 12 Accumulation](lesson.html?lesson=06-m1-exam/ch12-accumulation).
- "What happens to a report whose prerequisite has not been accumulated?" It waits in ω;
  same sheet, rules table.
- "What does accumulate receive, and what can it change?" Operands and transfers in;
  service state, validator staging keys, authorizer queues and privileges out (the last
  three only for privileged services). See
  [E · PVM invocations & host calls](lesson.html?lesson=06-m1-exam/e-invocations).

Next: [F8 · audits and disputes](lesson.html?lesson=06-m1-exam/f08-audits-and-disputes),
the check that happens while and after your trade settles.
