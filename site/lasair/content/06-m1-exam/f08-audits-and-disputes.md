---
title: "F8 · One order's journey: audits and disputes"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F8 · One order's journey: audits and disputes

<span class="lecture-badge">Foundations · step 7 of the journey</span>

Where we are: your trade has been settled by accumulate (F7). But only two or three
guarantors ever ran the matching (F4). What if they lied, and signed a batch result where
you got 10 DOT for 1 USDC? This lesson is the answer: random validators re-check the
work within seconds, and a chain containing a lie is abandoned before it is ever final.

## What you already know

An optimistic rollup assumes its batches are correct and gives anyone a challenge window,
typically about a week, to submit a fraud proof. If nobody challenges, the batch stands.
Ethereum's own finality (Casper FFG) finalises checkpoints after two epochs of votes.

<div class="eth-says">Optimistic rollups: trust now, anyone may challenge within days. JAM: assigned auditors proactively re-run the work within seconds, and the chain refuses to finalise until they have.</div>

## What JAM does

**Auditing** (the Gray Paper chapter "Auditing and Judging", a protocol it describes as
theoretically equivalent to ELVES) starts as soon as a block makes reports available.

1. **Each validator picks what to audit, verifiably at random.** Using its own VRF
   (a signature that doubles as an unpredictable but checkable random number), each
   validator shuffles the active cores and takes the first **10**. It audits the report
   that just became available on each of those cores, and skips a core with none. It
   publishes an **announcement** ("I will audit these"), with the VRF proof so others
   can check the selection was honest. At full scale that averages about **30 auditors
   per report**.
2. **Auditors rebuild and re-run.** Each auditor fetches pieces from other validators
   (this is why F6 mattered), reconstructs the bundle, re-runs the authorizer and refine,
   and compares the result with the report. It then publishes a signed **judgment**:
   valid or invalid.
3. **Tranches every 8 seconds.** Every 8 seconds after the block's slot a new
   **tranche** begins. If an announced auditor has not delivered a judgment (a
   **no-show**), more validators select themselves to audit that report by a fresh VRF.
   On average two more are recruited per no-show. If any negative judgment has
   appeared, every validator must audit that report.
4. **Audited.** A report is audited when every required auditor has said "valid" and
   nobody has said "invalid", or when more than two thirds of all validators have said
   "valid". A block is audited when all the reports it made available are.
5. **Finality waits for audits.** A validator must see a block as audited before it
   votes to finalise it in GRANDPA. That is why jamswap shows your fill as
   **Finalizing**, then **Final**.

In normal operation nothing more happens. If a lie is found:

- If more than one third of validators judge the report invalid, the block that carries
  it is ban-listed: it and everything built on it are disregarded, and honest nodes build
  on a different chain. Your "trade at a lie price" disappears with that chain.
- Once enough judgments exist, a block author writes a **verdict** into the **disputes
  extrinsic, E_D**. A verdict names a validator set by epoch index: the active set when
  the index is the prior state's epoch, the previous epoch's set when it is one less. It
  carries judgments from exactly two-thirds-plus-one of that set (683 when the set has
  1 023 validators, as at full). All positive means **good**, none positive means
  **bad**, exactly one third positive means **wonky**.
- With the verdict, or in a later block, come **culprits** (the guarantors who signed a
  bad report) and **faults** (validators whose judgment went against the verdict). A
  good verdict must bring at least one fault in the same block. Their keys are
  recorded in the chain's disputes record, **ψ**, listed in the header's offenders
  marker, and replaced with null keys when they would next rotate into the validator
  set.
- If a bad or wonky report is still waiting in its core's slot, the verdict clears that
  slot, so it never becomes available. The Gray Paper names this intermediate step ρ†
  ("rho dagger").

## The picture

<svg class="fdiag" viewBox="0 0 360 496" role="img" aria-label="Auditing: validators select reports with a VRF, re-run refine, publish judgments; more auditors join on no-shows every 8 seconds; an audited block can be finalised; a bad report leads to a verdict, punishment of culprits, and abandoning the chain">
<defs><marker id="ah-f08" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="20" width="300" height="56" rx="8"/>
<text class="title" x="180" y="44" text-anchor="middle">Report made available</text>
<text class="muted" x="180" y="64" text-anchor="middle">from F6; settled in F7</text>
<line class="arrow" x1="180" y1="76" x2="180" y2="100" marker-end="url(#ah-f08)"/>
<rect class="box hot" x="30" y="104" width="300" height="56" rx="8"/>
<text class="title hot-text" x="180" y="128" text-anchor="middle">Auditors self-select by VRF</text>
<text class="muted" x="180" y="148" text-anchor="middle">10 cores each; about 30 per report</text>
<line class="arrow" x1="180" y1="160" x2="180" y2="184" marker-end="url(#ah-f08)"/>
<rect class="box" x="30" y="188" width="300" height="56" rx="8"/>
<text class="title" x="180" y="212" text-anchor="middle">Rebuild, re-run, judge</text>
<text class="muted" x="180" y="232" text-anchor="middle">no-shows? more join every 8 s</text>
<line class="arrow" x1="120" y1="244" x2="95" y2="290" marker-end="url(#ah-f08)"/>
<line class="arrow" x1="240" y1="244" x2="265" y2="290" marker-end="url(#ah-f08)"/>
<rect class="box ok" x="20" y="294" width="150" height="62" rx="8"/>
<text class="title" x="95" y="318" text-anchor="middle">All valid</text>
<text class="muted" x="95" y="338" text-anchor="middle">block audited</text>
<rect class="box" x="190" y="294" width="150" height="62" rx="8"/>
<text class="title" x="265" y="318" text-anchor="middle">Invalid found</text>
<text class="muted" x="265" y="338" text-anchor="middle">verdict in E_D</text>
<line class="arrow" x1="95" y1="356" x2="95" y2="396" marker-end="url(#ah-f08)"/>
<line class="arrow" x1="265" y1="356" x2="265" y2="396" marker-end="url(#ah-f08)"/>
<rect class="box ok" x="20" y="400" width="150" height="62" rx="8"/>
<text class="title" x="95" y="424" text-anchor="middle">GRANDPA may</text>
<text class="muted" x="95" y="444" text-anchor="middle">finalise: fill is Final</text>
<rect class="box" x="190" y="400" width="150" height="62" rx="8"/>
<text class="title" x="265" y="424" text-anchor="middle">Chain abandoned</text>
<text class="muted" x="265" y="444" text-anchor="middle">culprits punished (ψ)</text>
</svg>

After a report becomes available, validators secretly and verifiably pick which reports
to check. They rebuild the data, re-run the work and publish judgments, and more
auditors join whenever some fail to show up. On the left, the normal path: every judgment
is "valid", the block counts as audited, and GRANDPA can finalise it. On the right, the
rare path: a lie is caught, a verdict goes on-chain, the guarantors are punished and the
chain carrying the lie is dropped.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the chain's record of settled disputes and offenders | disputes state | ψ | 10 |
| verdicts, culprits and faults in a block | disputes extrinsic | E_D | 10 |
| the core slots after bad reports are removed | availability assignments post-judgment | ρ† | 4, 10 |

Plain names only: a **tranche** (one 8-second round of audit selection), a **no-show**
(an announced auditor that has not delivered), **ELVES** (the auditing scheme JAM's is
equivalent to).

## Why it is built this way

The first two points are reasoning from the mechanism; the Gray Paper states the
mechanism itself.

- **Few guarantors keep it cheap; random auditors keep it honest.** Only two or three
  validators do the work up front. Nobody knows in advance who will re-check it, and the
  selection is provable, so a guarantor cannot bribe its future auditors.
- **No-shows escalate.** An attacker might try to silence the auditors who would catch
  it. Each missing judgment recruits more auditors, so silence makes scrutiny grow, not
  shrink.
- **Auditing instead of zero-knowledge proofs.** The Gray Paper's Previous Work chapter
  estimates that proving a computation with SNARKs costs orders of magnitude more than
  simply re-running it, which is what auditors do.
- **Punishment needs evidence.** A culprit entry is the guarantor's own signature on a
  report now judged bad. A fault entry is a validator's own signed judgment on the losing
  side. Nobody is punished on hearsay.

Where the Ethereum analogy breaks: a fraud proof must be triggered by someone watching.
JAM's audit is mandatory and happens for every available report, every time, before the
block may be finalised.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- A verdict's size and the positive counts that make it good or wonky now come from
  the size of the validator set it names, because 0.8.0 lets that size vary
  (eq:verdicts, eq:valcount). Bad is still zero positives. In 0.7.2 they used the fixed
  validator count (1 023 at full).
- A block may carry at most 16 verdicts, 16 culprits and 16 faults
  (eq:disputesextrinsics). In 0.7.2 there was no bound.
- A bad verdict no longer needs at least two culprits in the same block. The only rule
  left that ties offenders to a verdict's block is that a good verdict needs at least
  one fault there (the rule after eq:verdicts).
- Auditing covers only the active cores: the list a validator picks from has one entry
  per active core (a third of the block's validator-set size) instead of one for each
  of the C cores (eq:auditselection). The later-tranche VRF test (eq:latertranches) and
  the "more than two thirds said valid" half of the audited condition U use the block's
  validator-set size instead of the fixed validator count. The other half of U, "every
  required auditor said valid", now writes ⊆ where 0.7.2 wrote ⊂, so the formula
  matches the prose: "valid" from exactly the required auditors is enough.
- The audit check now covers the whole bundle. The rebuilt bundle must equal the one
  assembled from a candidate package and the report's segment-root lookup: the package,
  its extrinsic data, its imported segments and their proofs (eq:makebundle). The report
  is then recomputed from that package and the report's own core, segment-root lookup
  and chunk count (eq:computereport). In 0.7.2 the formula compared only the fetched
  work-package encoding and recomputed from the package and core; auditors still
  fetched the extrinsic data and imports, but outside that formula.

</div>

## Questions to ask yourself

- "How does a validator decide what to audit, and what happens on a no-show?"
  [C · JAM architecture](lesson.html?lesson=06-m1-exam/c-architecture), the layers table.
- "What are the three kinds of verdict, and what makes a culprit versus a fault?"
  [Ch. 10 Disputes](lesson.html?lesson=06-m1-exam/ch10-disputes), *The transition in
  plain English*.
- "Why does a verdict clear a core?" So a condemned report can never become available
  and be accumulated; ch. 10 sheet, rules table (ρ†).

Next: [F9 · the chain around it](lesson.html?lesson=06-m1-exam/f09-the-chain-around-it),
the blocks, clock and finality that everything above rides on.
