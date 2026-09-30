---
title: "F5 · One order's journey: the guarantee lands"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F5 · One order's journey: the guarantee lands

<span class="lecture-badge">Foundations · step 4 of the journey</span>

The guarantors on jamswap's core have matched the round containing Alice's order ("buy 10
DOT, pay at most 7 USDC each") and produced a work-report. So far nothing is on-chain.
This lesson is the moment the report enters a block.

## What you already know

On an optimistic rollup, the operator posts a batch commitment to Ethereum and puts up a
bond. If the result is wrong, the bond can be taken.

<div class="eth-says">Rollup: post the result on L1 and bond it; lying costs the bond.</div>

## What JAM does

A **guarantee** is the work-report plus the signatures of the guarantors who vouch for
it. It needs **two or three** signatures from validators assigned to that core. Each
signature is an Ed25519 signature over a fixed context string followed by the hash of the
report. The guarantee also records the timeslot at which it was made.

Guarantors pass the guarantee to an upcoming block author, who puts it in the block's
**guarantees extrinsic**, E_G. Then every node checks it. In plain words, a guarantee is
accepted only if:

- **the signers are the right people**: each signer was assigned to that core at the
  guarantee's slot, and that slot falls in the current rotation or the previous one;
- **the core is active**: there is one active core per three active validators, and only
  those first cores take work. A guarantee on any other core is invalid, even if that
  core was active in the previous rotation (eq:guarantorsig);
- **the signatures verify**, and there are 2 or 3 of them, each validator at most once;
- **the core was paid for**: the report's authorizer is in the core's authorizer pool;
- **the core is free**: no other report is still waiting for availability on that core;
- **the chunk count is right**: the report says its data was cut into exactly one
  erasure-coded chunk per active validator;
- **the code matches**: each digest names the service's current code hash, and the
  accumulate gas asked for respects the service's minimum and the 10 000 000 per-report cap;
- **the anchor is real and recent**: the block the work was prepared against is one of the
  last 8 recent blocks, and its header hash, state root, accumulation-output super-peak
  and slot all match what the chain recorded;
- **the lookup anchor is real and not too old**: within the last 14 400 slots, about
  24 hours. The node must also hold that block's header, with matching hash and slot, and
  the state root the report claims after that block must equal the prior-state-root field
  of the header that follows it;
- **it is not a duplicate**: the package has not already been reported recently, queued,
  accumulated, left pending on a core, or listed twice in this block;
- **its prerequisites are known**: each prerequisite package, and each package named in
  its segment-root lookup, is in this block or in recent history, and each looked-up
  segment root matches the one recorded for that package in this block or in recent
  history.

If all of that holds, the whole guarantee (report, signatures and slot) moves into its
core's entry in the **availability assignments** state, ρ, stamped with the current slot.
Alice's round is now officially "reported". It is not yet settled: the chain first wants
proof that the underlying data is available.

The guarantors are now on the hook. The Gray Paper presumes validators "will be punished
severely" if they sign a report that does not match the correct computation. Their
signature is exactly what a later dispute uses as evidence against them.

## The picture

<svg class="fdiag" viewBox="0 0 360 430" role="img" aria-label="A work-report plus 2 to 3 guarantor signatures becomes a guarantee, is included in the block's guarantees extrinsic, passes the on-chain checks, and is stored as the core's availability assignment in rho">
<defs><marker id="ah-f05" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="10" width="300" height="56" rx="8"/>
<text class="title" x="180" y="32" text-anchor="middle">work-report</text>
<text class="muted" x="180" y="52" text-anchor="middle">+ 2 or 3 guarantor signatures</text>
<path class="arrow" d="M180,66 L180,90" marker-end="url(#ah-f05)"/>
<rect class="box" x="30" y="94" width="300" height="56" rx="8"/>
<text class="title" x="180" y="116" text-anchor="middle">guarantee in the block</text>
<text class="muted" x="180" y="136" text-anchor="middle">guarantees extrinsic E_G</text>
<path class="arrow" d="M180,150 L180,174" marker-end="url(#ah-f05)"/>
<rect class="box hot" x="30" y="178" width="300" height="130" rx="8"/>
<text class="title" x="180" y="200" text-anchor="middle">every node checks</text>
<text x="180" y="224" text-anchor="middle">right signers, valid signatures</text>
<text x="180" y="244" text-anchor="middle">authorizer in pool · core free</text>
<text x="180" y="264" text-anchor="middle">anchor recent and matching</text>
<text x="180" y="284" text-anchor="middle">not a duplicate · prereqs known</text>
<path class="arrow" d="M180,308 L180,332" marker-end="url(#ah-f05)"/>
<rect class="box ok" x="30" y="336" width="300" height="80" rx="8"/>
<text class="title" x="180" y="358" text-anchor="middle">ρ[core] = this guarantee</text>
<text class="muted" x="180" y="378" text-anchor="middle">pending, stamped with the slot</text>
<text class="muted" x="180" y="396" text-anchor="middle">next: wait for availability</text>
</svg>

The report enters the chain as one entry in a block's guarantees list, passes a list of
checks run by every node, and then occupies its core's single "pending" slot.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the block's list of guaranteed reports | guarantees extrinsic | E_G | 11 |
| the guarantee waiting on each core | availability assignments (pending report per core) | ρ | 11 |
| the last 8 blocks the chain remembers | recent history | β_H | 7 |

A core holds at most one pending report. A new guarantee for that core is rejected while
the slot is occupied. The slot is cleared when the report becomes available, or after
5 slots if it never does. A verdict in the block that judges the report invalid or
uncertain also clears it (eq:removenonpositive, ch. 10). Every core's entry is also
cleared at once if the number of active validators changes
(eq:availassignmentspostassurancesdef).

## Why it is built this way

Each check answers a specific attack. Requiring assigned signers stops any validator from
vouching for any core. Requiring the authorizer in the pool stops unpaid work. The anchor
check makes sure the work was refined against a state the chain actually had, since
refine could not see live state itself. The duplicate checks stop the same package being
reported, and later accumulated, twice. One report per core at a time keeps each core's
data-availability work bounded (reasoning, not GP text).

Two or three signatures instead of one means no single validator can push a report
through alone (reasoning, not GP text; the GP states the 2 to 3 rule). The signatures are also economic collateral: the same signed statement is
what makes a guarantor provably at fault if auditors later find the report wrong.

Where the rollup analogy breaks: there is no separate bond. The stake at risk is the
guarantors' validator stake, and the evidence is their signature on the report.

Two of the checks new in 0.8.0 come with reasons in the GP text. The chunk count must
match because one chunk goes to each assurer, so the count must equal the size of the
assuring validator set. The active-core rule, together with clearing ρ whenever the
validator count changes, means a core at or beyond |κ′|/3 never holds an assignment, which
"ensures that we will never have more reports to audit than can safely be managed with the
number of active validators".

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- ρ now holds the whole guarantee (report, credential and guarantee slot) plus the slot it
  was reported, and is called the availability assignments (eq:reportingstate). In 0.7.2
  it held only the work-report and that slot.
- The validator set can now vary in size, 3c validators for some core count c
  (eq:valcount). Only the first |κ′|/3 cores are active, and a guarantee must name one of
  them (eq:guarantorsig).
- New check: the availability specification carries the erasure-chunk count, which must
  equal |κ′| (eq:avspec and the rule after eq:incomingworkreports).
- The refinement context now carries the anchor's slot, checked against the slot that
  β_H now records, and the lookup anchor's posterior state root, checked against the
  child header in the ancestor set (eq:workcontext, eq:recenthistorydef).
- ρ is cleared entirely when |κ| ≠ |κ′| (eq:availassignmentspostassurancesdef).

</div>

## Questions to ask yourself

- *List the checks a guarantee must pass.* See
  [Ch. 11 Reporting and Assurance](lesson.html?lesson=06-m1-exam/ch11-reporting-assurance).
- *Why does the anchor have to be in recent history?* See
  [Ch. 7 Recent History](lesson.html?lesson=06-m1-exam/ch07-recent-history).
- *What happens to a core whose report is never made available?* See
  [Ch. 11 Reporting and Assurance](lesson.html?lesson=06-m1-exam/ch11-reporting-assurance).
