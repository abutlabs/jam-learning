---
title: "F3 · One order's journey: the work-package"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

# F3 · One order's journey: the work-package

<span class="lecture-badge">Foundations · step 2 of the journey</span>

Alice's order, "buy 10 DOT, pay at most 7 USDC each", now exists in her browser, signed by
her jamswap key. JAM has no transactions, so how does it get in? It rides inside a
**work-package**.

## What you already know

On Ethereum you sign a transaction, it enters the public mempool, and a block producer
includes it. Gas is bought at that moment, by the same account that signed the
transaction.

<div class="eth-says">Ethereum: one signed transaction, paid for by its sender, picked up from the mempool.</div>

On a rollup it looks different: a sequencer collects many users' transactions into a
batch and posts the batch.

## What JAM does

JAM is closer to the rollup picture. Someone collects work into a **work-package** and
hands it to the validators responsible for a core. The Gray Paper calls the party that
does this a *builder*. In jamswap, the builder collects the orders for one market for one
6-second round, together with the market's resting order book, and assembles them into a
batch payload. The jamswap docs say orders go in as work-packages over JAM's node-to-node
protocol (JAMNP-S, stream CE-133).

A work-package holds:

- **an authorization token**: opaque data that argues "this package may use the core";
- **which authorizer to use**: the service that hosts the authorizer code, the code's
  hash, and a configuration blob;
- **a refinement context**: which recent block the work was prepared against (the
  *anchor*), which block to use for historical data lookups (the *lookup anchor*), and
  any *prerequisite* packages that must be handled first;
- **1 to 16 work-items**.

A **work-item** is one unit of work for one service. It names the service, the code hash
it expects that service to have, a **payload** (the input data), a gas limit for refine
and a gas limit for accumulate, plus its *manifest*: the data segments it imports (each
named by the exporting package, as a segment-root or a package hash, plus an index; not
carried inline), the extrinsic blobs it brings along (by hash and length), and how many
segments it exports (eq:workitem). For jamswap, the payload is the round's batch, with a
first byte tagging its type. Alice's order is one entry inside that payload, carrying her
public key and signature.

So Alice does not "send" anything to jamswap. Her order is data, carried in a payload, in
a work-item, in a work-package that someone else builds.

**Who pays for the core?** This is *authorization*. Each core keeps an **authorizer
pool**: a short list (at most 8) of authorizers that are currently allowed to use it. An
authorizer is identified by the hash of its code hash plus its configuration. The pool is
refilled every block from a per-core **authorizer queue** of 80 entries, which only a
privileged service can set. The chain accepts a guarantee only if the package's authorizer
is in that core's pool (eq:reportcoresareunused). That block then removes the oldest copy
of that authorizer from the pool (Ch. 8). The idea: whoever bought coretime arranges for
their authorizer to be in the queue for that core, and their authorizer decides which
packages it will accept.

## The picture

<svg class="fdiag" viewBox="0 0 360 440" role="img" aria-label="Nested boxes: a work-package contains an authorization token, the authorizer, a refinement context and up to 16 work-items; one work-item carries the jamswap payload that includes Alice's order">
<defs><marker id="ah-f03" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box" x="30" y="10" width="300" height="50" rx="8"/>
<text class="title" x="180" y="32" text-anchor="middle">builder</text>
<text class="muted" x="180" y="50" text-anchor="middle">collects one round's orders</text>
<path class="arrow" d="M180,60 L180,90" marker-end="url(#ah-f03)"/>
<rect class="zone" x="20" y="95" width="320" height="335" rx="10"/>
<text class="title" x="180" y="118" text-anchor="middle">work-package</text>
<rect class="box" x="35" y="130" width="140" height="48" rx="6"/>
<text x="105" y="152" text-anchor="middle">auth token</text>
<text class="muted" x="105" y="168" text-anchor="middle">"may I use the core?"</text>
<rect class="box" x="185" y="130" width="140" height="48" rx="6"/>
<text x="255" y="152" text-anchor="middle">authorizer</text>
<text class="muted" x="255" y="168" text-anchor="middle">code hash + config</text>
<rect class="box" x="35" y="188" width="290" height="52" rx="6"/>
<text x="180" y="210" text-anchor="middle">refinement context</text>
<text class="muted" x="180" y="228" text-anchor="middle">anchor · lookup anchor · prerequisites</text>
<rect class="box hot" x="35" y="252" width="290" height="160" rx="6"/>
<text class="title" x="180" y="274" text-anchor="middle">work-item (1 of up to 16)</text>
<text class="muted" x="180" y="292" text-anchor="middle">service = jamswap · gas limits</text>
<rect class="box" x="55" y="304" width="250" height="92" rx="6"/>
<text x="180" y="326" text-anchor="middle">payload: one round's batch</text>
<text class="hot-text" x="180" y="352" text-anchor="middle">Alice: buy 10 DOT at ≤ 7 USDC</text>
<text class="muted" x="180" y="372" text-anchor="middle">+ her public key + signature</text>
</svg>

Read it from the inside out. Alice's signed order is a few bytes inside the payload. The
payload belongs to one work-item addressed to the jamswap service. The work-item sits in
a package that also says who authorizes it and which chain state it was built against.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the allowed authorizers per core | authorizer pool | α | 8 |
| the upcoming authorizers per core | authorizer queue | φ | 8 |
| "which block this was built against" | refinement context (anchor, lookup anchor, prerequisites) | | 11, 14 |

Limits worth knowing: 1 to 16 work-items per package; the sum of refine gas limits must
be below G_R = 5 000 000 000; the sum of accumulate gas limits below G_A = 10 000 000;
at most 3 072 imported and 3 072 exported segments; at most 128 extrinsic blobs; at most
J = 8 dependencies (its prerequisites plus the distinct packages it imports from by
package hash); and the whole auditable bundle at most 13 791 360 bytes.

## Why it is built this way

The Gray Paper wants JAM to support both an Ethereum pattern (pay as you submit) and a
Polkadot pattern (buy capacity in advance, let others use it). So it *separates* buying
coretime from deciding what work runs on it. The authorizer sits in the middle: a small
piece of code that checks a token, runs in-core under its own gas limit, and yields a
trace on success. The chain only has to store a short list of acceptable authorizers per
core. That is why there is no "transactor" in JAM.

The refinement context exists because refine is stateless. Refine cannot read live state,
so the package must say exactly which chain state it was prepared against. The chain later
checks that the anchor is a recent block it recognises.

Where the analogy breaks: a work-package is not signed by a user and does not pay fees
the way a transaction does. jamswap has to verify each trader's signature inside its own
refine code.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- The refinement context gained two fields (eq:workcontext). It now also records the
  anchor's timeslot and the lookup anchor's posterior state root. The chain checks the
  anchor's slot against its recent-history record. It checks the lookup anchor's state
  root against the prior-state-root field of the lookup anchor's child header, which must
  also be among the kept ancestor headers (Ch. 11).
- The dependency cap is now stated on the package itself (Ch. 14): prerequisites plus the
  distinct packages imported from by package hash may total at most J = 8. In 0.7.2 it was
  stated only for the work-report (eq:limitreportdeps, which 0.8.0 keeps).

</div>

## Questions to ask yourself

- *What is in a work-package and in a work-item?* See
  [Ch. 11 Reporting and Assurance](lesson.html?lesson=06-m1-exam/ch11-reporting-assurance)
  and [C · Architecture](lesson.html?lesson=06-m1-exam/c-architecture).
- *How does a package prove it may use a core?* See
  [Ch. 8 Authorization](lesson.html?lesson=06-m1-exam/ch08-authorization).
- *Why separate authorization from the service?* See
  [D · Design rationale](lesson.html?lesson=06-m1-exam/d-rationale).
