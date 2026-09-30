---
title: "F2 · One order's journey: the service"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

# F2 · One order's journey: the service

<span class="lecture-badge">Foundations · step 1 of the journey</span>

Alice opens jamswap and places a limit order: **buy 10 DOT, pay at most 7 USDC each**.
Over the next lessons we follow that one order all the way into on-chain state. Before it
can go anywhere, it needs something on JAM to talk to. That something is a *service*.

## What you already know

On Ethereum, an exchange is a smart contract. It has code, storage and a balance, and it
sits at an address. A user sends a signed transaction from an externally owned account
(an EOA), and every node runs the contract's code to apply it.

<div class="eth-says">Ethereum: an exchange is a contract account, called directly by users' signed transactions.</div>

## What JAM does

JAM has no EOAs and no user transactions. The Gray Paper says it plainly: in JAM, *all
accounts are service accounts*. A service is the JAM version of a contract account. It has
a balance, some code and some storage. Because no secret key controls it, it needs no
nonce.

The big difference is that a service's code has **two entry points**, and they run in two
very different places:

- **Refine** runs *in-core*. Only a small group of validators runs it, it is stateless,
  and it can do heavy computation on large inputs. It turns input data into a small output.
- **Accumulate** runs *on-chain*. Every validator runs it, it can read and write the
  service's state, move balances and call on-chain functions. It is the part that is like
  an Ethereum contract.

jamswap maps an exchange straight onto this split. Its own docs describe it like this:

- `refine` is the **matching engine**. It runs a batch auction and works out who trades
  with whom and at what single clearing price. It is integer-only and deterministic, so
  anyone who re-runs it gets the byte-identical result. It does not touch live state.
- `accumulate` is **settlement**. It reads each refine output and commits it to the
  service's storage: balances, the resting order book, commitments and stats.

So your order will be *matched* in refine and *settled* in accumulate.

What about sending value between services? A service can transfer balance to another
service from its accumulate code. There is no third entry point for receiving it. The
transfer is *deferred*: it is delivered to the receiving service's own accumulate run in
a later accumulation round of the same block, and the recipient sees it as an input
alongside its work.

## The picture

<svg class="fdiag" viewBox="0 0 360 400" role="img" aria-label="A jamswap service account: code hash, balance, storage and preimages, with two entry points, refine in-core for matching and accumulate on-chain for settlement">
<defs><marker id="ah-f02" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<rect class="box hot" x="30" y="20" width="300" height="130" rx="8"/>
<text class="title" x="180" y="46" text-anchor="middle">jamswap service (in δ)</text>
<text x="50" y="74">code hash</text>
<text class="muted" x="50" y="90">points at the code blob</text>
<text x="200" y="74">balance</text>
<text class="muted" x="200" y="90">pays for its storage</text>
<text x="50" y="118">storage</text>
<text class="muted" x="50" y="134">book, balances</text>
<text x="200" y="118">preimages</text>
<text class="muted" x="200" y="134">stored blobs</text>
<path class="arrow" d="M110,150 L110,200" marker-end="url(#ah-f02)"/>
<path class="arrow" d="M250,150 L250,200" marker-end="url(#ah-f02)"/>
<rect class="zone" x="20" y="205" width="160" height="175" rx="8"/>
<rect class="zone" x="190" y="205" width="160" height="175" rx="8"/>
<text class="muted" x="100" y="225" text-anchor="middle">in-core, a few nodes</text>
<text class="muted" x="270" y="225" text-anchor="middle">on-chain, every node</text>
<rect class="box" x="30" y="240" width="140" height="120" rx="8"/>
<text class="title" x="100" y="266" text-anchor="middle">refine</text>
<text x="100" y="292" text-anchor="middle">matching engine</text>
<text class="muted" x="100" y="314" text-anchor="middle">stateless, heavy</text>
<text class="muted" x="100" y="332" text-anchor="middle">output only</text>
<rect class="box" x="200" y="240" width="140" height="120" rx="8"/>
<text class="title" x="270" y="266" text-anchor="middle">accumulate</text>
<text x="270" y="292" text-anchor="middle">settlement</text>
<text class="muted" x="270" y="314" text-anchor="middle">stateful, light</text>
<text class="muted" x="270" y="332" text-anchor="middle">writes storage</text>
</svg>

The top box is one entry in the chain's service table. Its code has two doors. The left
door runs on a few validators and only produces an output. The right door runs everywhere
and is the only one allowed to change the service's state.

## The words and symbols

| Plain name | Gray Paper name | Symbol | Chapter |
|---|---|---|---|
| the table of all services | service accounts | δ | 9 |
| the matching step (heavy, in-core) | Refine, entry point 0 (the PVM starts at instruction 0) | Ψ_R | 9, App. B |
| the settlement step (on-chain) | Accumulate, entry point 1 (the PVM starts at instruction 5) | Ψ_A | 9, 12, App. B |

A service is identified by a 32-bit number, its *service id*. Each account holds: a
storage dictionary, a preimage dictionary and preimage requests, the code hash, the
balance, a gratis storage allowance, two minimum gas values (for accumulate and for
receiving transfers), and three bookkeeping fields: when it was created, when it last
accumulated, and its parent service. The code itself is not stored in the account: the
account holds its **hash**, and the preimage under that hash must be present among the
account's preimages for the service to work. That preimage encodes two blobs: a
length-prefixed metadata blob, then the code blob (a_m and a_c in "Code and Gas").

## Why it is built this way

The Gray Paper's central idea is that heavy work should not be done by everyone. Ethereum
has every node run every contract call, so total computation is capped by what one machine
can do. JAM splits a service so that the expensive part, refine, runs on a small group of
validators per core, with its correctness enforced by guarantees, audits and punishment
later. Only the cheap result reaches accumulate, which every node must run. The Gray Paper
calls the difference between the two "one of scalability versus synchroneity": refine
scales, accumulate is synchronous with the chain's state.

The analogy with Ethereum breaks in one important place. Nobody calls a JAM service with a
signed transaction. Input arrives as work-items inside work-packages (the next lesson),
and jamswap has to bring its own signatures: each order carries the trader's ed25519
signature, which jamswap's refine checks itself.

Refine is also where that check fits. A work-package's items must ask for less than
10 million gas of accumulate in total (G_A in the GP), but may ask for just under
5 billion gas of refine (G_R), by eq:wplimits. jamswap measured one ed25519 check inside
the PVM at about 5.29 million gas under GP 0.8.0 (not in the GP; jamswap
`docs/ARCHITECTURE.md`). Two such checks would already exceed a whole report's
accumulate budget.

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- The PVM now charges gas for a whole basic block, in advance, each time execution
  enters it, with the cost taken from a model of a CPU pipeline (App. A,
  eq:gascostforblock). In 0.7.2 every instruction cost a flat 1 gas (the ϱ_Δ column of
  the instruction tables, now gone).
- G_A and G_R did not change. Measured, not in the GP: the same ed25519 verify costs
  about 5.29 million gas under 0.8.0 against about 1.31 million under 0.7.2, roughly
  four times more (jamswap `docs/LASAIR_INTERNALS.md`). Under 0.7.2 jamswap checked
  some owner signatures (for example on sealed-order commitments) in accumulate; for
  0.8.0 it moved every signature check into refine.

</div>

## Questions to ask yourself

- *What are the two entry points of a service, and where does each run?* See
  [Ch. 9 Service Accounts](lesson.html?lesson=06-m1-exam/ch09-accounts).
- *Why is there no transaction or nonce in JAM?* See
  [D · Design rationale](lesson.html?lesson=06-m1-exam/d-rationale).
- *How does one service pay another?* See
  [Ch. 12 Accumulation](lesson.html?lesson=06-m1-exam/ch12-accumulation) (deferred transfers).
