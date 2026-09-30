---
title: "F4 · One order's journey: refine on a core"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F4 · One order's journey: refine on a core

<span class="lecture-badge">Foundations · step 3 of the journey</span>

The work-package carrying Alice's order ("buy 10 DOT, pay at most 7 USDC each") has been
built. Now the heavy work happens: jamswap's matching engine runs. It runs on a **core**.

## What you already know

On Ethereum, every full node re-executes every transaction. On an optimistic rollup, one
sequencer executes a batch off-chain, and fraud proofs let anyone challenge a wrong
result later.

<div class="eth-says">Rollup: one party executes off-chain; correctness is enforced afterwards.</div>

## What JAM does

A **core** is not a CPU. It is a slot of execution capacity that JAM runs in parallel with
all the others. There are 341 cores at full size (2 in the small "tiny" test setup).
Only the first |κ'|/3 of them are **active**, one for every three validators in the
active set κ', so a full set of 1023 validators uses all 341 (sec:coresandvalidators).
Every block, each active core has **three validators** assigned to it, called its
**guarantors**. The assignment is a shuffle of the validators driven by on-chain randomness (the
entropy η), and it rotates every R = 10 slots (every 4 at tiny), so no validator is tied
to one core for long.

The builder sends the work-package to the guarantors of a core. Each guarantor then does
the following, in the Gray Paper's order:

1. **Check authorization.** Run the package's authorizer code (the *is-authorized*
   entry point) with its own gas limit of 50 000 000. It returns a trace, or fails. The
   guarantor also checks the authorizer is in the core's current pool.
2. **Refine each work-item.** Run the service's refine code in the PVM, JAM's virtual
   machine, with that item's refine gas limit. For jamswap this is the matching engine:
   verify each order's signature, clear the batch auction at one uniform price, work out
   the fills. Alice's order either crosses at the clearing price or rests.
3. **Chunk the data.** Erasure-code the work-package *bundle* (the package plus
   everything refine needed) and any exported data into pieces, exactly one piece for
   each validator in the set that will assure it (eq:avspec).
4. **Build the work-report** and sign it with the guarantor's Ed25519 key. The signed
   message is the context string `$jam_guarantee` followed by the hash of the encoded
   report (eq:guarantorsig).
5. **Distribute** the chunks across the whole validator set.

Refine is **stateless**. It cannot read live chain state. All it needs is the service's
refine code, the authorizer's code, and any preimage (stored blob) lookups, fetched as of
the lookup anchor block named in the package. That is what makes it safe to run on only
three machines: anyone can re-run it later and must get the byte-identical result.

The output of refining one work-item is a **work-digest**: which service and code hash,
a hash of the payload, the accumulate gas limit, the result (an output blob, or an error
such as out-of-gas or panic), the refine gas used, and some counts. The **work-report**
collects all the digests of the package together with:

- the **availability spec**: package hash, bundle length, erasure root, shard count,
  exports root and export count;
- the refinement context and the core index;
- the segment-root lookup: for each earlier package it imports from by package hash,
  that package's exports root. It must list exactly those packages, or there is no valid
  report (eq:computereport);
- the authorizer hash, its trace, and the gas the authorizer used.

## The picture

<svg class="fdiag" viewBox="0 0 360 470" role="img" aria-label="Three guarantors on one core run is-authorized, then refine per item in the PVM, then erasure-code the bundle, producing a work-report of digests plus an availability spec">
<defs><marker id="ah-f04" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="zone" x="20" y="10" width="320" height="330" rx="10"/>
<text class="muted" x="180" y="30" text-anchor="middle">one core · 3 assigned guarantors · off-chain</text>
<rect class="box" x="40" y="42" width="280" height="54" rx="8"/>
<text class="title" x="180" y="64" text-anchor="middle">1 is-authorized</text>
<text class="muted" x="180" y="84" text-anchor="middle">authorizer code checks the token</text>
<path class="arrow" d="M180,96 L180,114" marker-end="url(#ah-f04)"/>
<rect class="box hot" x="40" y="118" width="280" height="64" rx="8"/>
<text class="title" x="180" y="140" text-anchor="middle">2 refine each work-item</text>
<text class="hot-text" x="180" y="158" text-anchor="middle">jamswap matching engine</text>
<text class="muted" x="180" y="174" text-anchor="middle">in the PVM · stateless</text>
<path class="arrow" d="M180,182 L180,200" marker-end="url(#ah-f04)"/>
<rect class="box" x="40" y="204" width="280" height="54" rx="8"/>
<text class="title" x="180" y="226" text-anchor="middle">3 erasure-code the bundle</text>
<text class="muted" x="180" y="246" text-anchor="middle">one chunk per validator</text>
<path class="arrow" d="M180,258 L180,276" marker-end="url(#ah-f04)"/>
<rect class="box" x="40" y="280" width="280" height="50" rx="8"/>
<text class="title" x="180" y="302" text-anchor="middle">4 sign the work-report</text>
<text class="muted" x="180" y="320" text-anchor="middle">Ed25519, each guarantor</text>
<path class="arrow" d="M180,340 L180,368" marker-end="url(#ah-f04)"/>
<rect class="box ok" x="30" y="372" width="300" height="88" rx="8"/>
<text class="title" x="180" y="394" text-anchor="middle">work-report</text>
<text x="180" y="416" text-anchor="middle">digests (one per item)</text>
<text class="muted" x="180" y="434" text-anchor="middle">+ availability spec · context</text>
<text class="muted" x="180" y="450" text-anchor="middle">+ core · authorizer hash, trace</text>
</svg>

Everything inside the dashed box happens off-chain, on three validators. What comes out
at the bottom is small: a report saying "here is what the work produced, and here is a
commitment to the data needed to check it".

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| running the authorizer | Is-Authorized invocation | Ψ_I | App. B |
| running the service's matching code | Refine invocation | Ψ_R | App. B |
| the three validators serving a core | guarantor assignment | M (from κ', η'_2 and τ') | 11 |

## Why it is built this way

The Gray Paper's in-core model is its answer to scale: "only a subset of the network is
responsible for actually executing any given computation". Because the work is split over
the cores, one active core for every three validators, total computation grows with the
number of validators, not with one machine's speed. The Overview expects upwards of 300
times what a single machine could do.

The price is that most validators never run your refine. So JAM needs other ways to be
confident: the guarantors put their stake behind the result (next lesson), everyone
confirms the data is available (lesson F6), and random auditors re-run it (lesson F8).
Erasure coding is what makes that re-running possible: the data survives even if the
original guarantors disappear.

Where the rollup analogy breaks: the executors are staked validators chosen by the
protocol, not an operator, and checking starts within seconds rather than after a
week-long challenge window.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- **Active cores.** C = 341 is still the number of cores, but only the first |κ'|/3 are
  active (sec:coresandvalidators). The shuffle now takes the set size,
  M = (P(|κ'|, η'_2, τ'), Φ(κ')), and the rotation wraps modulo the number of active
  cores. A guarantee for an inactive core is rejected, even one timed in the previous
  rotation when that core was still active (eq:guarantorsig). The 0.7.2 text fixed
  V = 1023, three per core for all 341.
- **The guarantor's recipe (Ch. 15).** Refine is now listed as its own step, and the
  report is assembled after the chunking. The signed message is written as
  `$jam_guarantee` followed by the report hash, matching eq:guarantorsig (the 0.7.2
  Ch. 15 text left out the context string).
- **Ξ takes four inputs.** The report function is now Ξ(p, c, l, v): the package, the
  core, the segment-root dictionary l, and v, the size of the assuring validator set
  (eq:computereport). In 0.7.2 it was Ξ(p, c). As before, it gives an error if
  Is-Authorized fails or its trace is longer than W_R. Now it also gives an error if l
  does not list exactly the packages imported from by package hash.
- **The availability spec gained the chunk count v** (eq:avspec). One chunk goes to each
  assurer, and on-chain v must equal |κ'|. Because the coding depends on v, a guarantor
  serving two validator sets of different sizes must erasure-code twice and produce two
  distinct reports. Only one of them can go on-chain.
- **The bundle has its own function**, B(p, l) (eq:makebundle): the package, its
  extrinsic data, and the imported segments with their proofs.

</div>

## Questions to ask yourself

- *What does a guarantor do, step by step?* See
  [C · Architecture](lesson.html?lesson=06-m1-exam/c-architecture).
- *Why must refine be stateless?* See
  [E · PVM invocations](lesson.html?lesson=06-m1-exam/e-invocations).
- *What is in a work-report and a work-digest?* See
  [Ch. 11 Reporting and Assurance](lesson.html?lesson=06-m1-exam/ch11-reporting-assurance).
