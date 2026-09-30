---
title: JAMNP-S — The Simple Networking Protocol
duration: 20 min
---

# JAMNP-S — The Simple Networking Protocol

A JAM client is not just a state-transition function. To take part in a live
network it must **speak to other nodes**: fetch blocks, announce the ones it
produces, submit work-packages, gossip tickets and assurances. All of that is
governed by the **JAM Simple Networking Protocol** (JAMNP-S).

This track documents *exactly* how JAMNP-S maps onto lasair — which parts are
implemented and byte-for-byte interoperable with other clients, and which parts
are not done yet. Everything here is checked against a running lasair mesh
and, where the text says so, against **PolkaJam** (a fully independent Rust
JAM client) on one shared chain.

## The source of truth

The Gray Paper defines the *state* of JAM (STF, PVM, crypto, Merklization). It
does **not** define the wire protocol. JAMNP-S is a separate specification:

> `zdave-parity/jam-np` → `simple.md`
> (rendered at `docs.jamcha.in/knowledge/advanced/simple-networking/`)

When this track says "the spec", it means that document. If lasair and the spec
ever disagree, the spec wins — with one documented exception you will meet in the
next lesson (a published example that the docs themselves flag as wrong).

## The three questions the protocol answers

Every networked JAM client has to answer three questions, and the spec is
organised around them:

1. **Who are you?** — TLS 1.3 over QUIC, each peer proving an Ed25519 identity
   through a certificate whose name is derived from the key. *(Lesson 2)*
2. **Who do you talk to?** — every validator connects to every other validator
   (a full mesh), with a deterministic rule for who dials whom, and a *grid*
   that decides who you announce blocks to. *(Lessons 3 and 4)*
3. **What do you say?** — a family of numbered stream protocols (block sync,
   work-package submission, tickets, assurances, audits…) over length-framed
   messages. *(Lesson 5)*

## The layer map

```
   ┌─────────────────────────────────────────────────────────────┐
   │  lasair mesh node   (bin/lasair_client.ml)                    │
   │   · Preferred Initiator + grid   · UP-0 announce   · CE-128    │
   │   · authoring (own slots)        · Block_tree fork choice      │
   ├─────────────────────────────────────────────────────────────┤
   │  wire codecs   (jamnp/wire.ml)      framing + message formats  │
   │  transport     (jamnp/transport.ml) stream kinds + handshakes  │
   ├─────────────────────────────────────────────────────────────┤
   │  QUIC + TLS 1.3 FFI  (rust/quic-ffi, lib/quic_ffi)             │
   │   · quinn/rustls   · JAMNP cert + SAN + ALPN + mutual auth      │
   └─────────────────────────────────────────────────────────────┘
```

The bottom layer is Rust (the `quinn` QUIC stack and `rustls` TLS), reached
through a small C-ABI FFI. The middle layer is pure OCaml wire codecs. The top
layer is the mesh node that ties authoring, fork choice and gossip together.

JAMNP-S is how *nodes* talk to each other. Applications talk to a node
differently: through the JIP-2 JSON-RPC, which lasair serves over a
WebSocket from a separate process, `lasair_reader` (default port 19800),
proving every state value it returns against a block's state root. (An
earlier lasair-only HTTP "operator RPC" node was retired on 2026-09-30.)

## Conformance at a glance

The rest of this track goes requirement-by-requirement. Here is the summary —
`✓` implemented and verified between separate processes over real QUIC (against
PolkaJam too, where the headline below says so), `~` partial, `✗` not yet
implemented:

| Spec area | lasair | Notes |
|---|:---:|---|
| QUIC + TLS 1.3, mutual Ed25519 auth | ✓ | quinn + rustls, both sides present certs |
| Certificate shape + validation | ✓ | `verify_cert_shape` enforces alg + single SAN = N(k) |
| Alternative name `N(k)` | ✓ | matches the *written* formula + PolkaJam on the wire |
| ALPN `jamnp-s/1/H` + chain isolation | ✓ | genesis-hash-scoped; `/builder` suffix supported |
| Required connectivity (full mesh) | ✓ | previous, current and next validator sets; endpoints from on-chain metadata |
| Preferred Initiator (one conn/pair) | ✓ | `i_am_initiator`; verified churn-free vs PolkaJam |
| Grid structure + block-propagation grid | ✓ | `Live_sets.announce`; UP-0 only to neighbours, across the three sets |
| Epoch-transition connectivity gating | ✓ | changes apply after the epoch's first block is finalized + max(⌊E/30⌋, 1) slots |
| Stream model (UP/CE), kind byte | ✓ | `open_kind` / `accept_kind` |
| Message framing (u32-LE length ++ body) | ✓ | `write_frame` / `read_frame` |
| UP-0 block announcement | ✓ | bidirectional handshake + announcements, latest finalized block as `Final` |
| CE-128 block request (both directions) | ✓ | ascending + descending |
| CE-129 state request | ✓ | key range + **boundary-node** proof (`State_db.boundary_nodes`), reconstruct-verified |
| CE-131/132 Safrole ticket distribution | ✓ | ring-VRF ticket gossip + proxy routing; verified against `gamma_z`; blocks are ticket-sealed |
| CE-133/146 work-package / bundle submission | ✓ | builder → guarantor; Is-Authorized, then refine; packages that import segments not yet |
| CE-134/135/136 guarantee sharing/distribution/request | ✓ | co-guarantors refine and sign their own report hash; the guarantee goes to every validator's pool |
| CE-137/138/147 shard distribution / audit shards / bundle request | ✓ | real erasure coding + the spec's co-path justification; reconstruct-verified over QUIC |
| CE-141 assurance distribution | ✓ | ed25519-signed availability bitfield, each validator only as itself |
| CE-139/140/148 segment shard / segment requests | ~ | request codecs in the spec layout; not served yet |
| CE-142/143 preimage announce/request | ✓ | wire + serve/request + node gossip loop (fetch→hash-verify→store) |
| CE-144/145 audit announcement/judgment | ✓ | live tranche-0 draw and later-tranche escalation; negative judgments feed disputes |
| GRANDPA finality (jam-np PR #6 draft: CE-130, CE-149–153) | ~ | finalizes lasair↔lasair; the protocol is still a draft, and clients speak different revisions of it |

The honest headline: lasair implements JAMNP-S end to end, from the
connection, identity and block-propagation core, to the
work-package path (CE-133 → CE-134/135 → an on-chain guarantee →
availability → accumulation), state-range requests with Merkle
boundary proofs (CE-129), preimage gossip (CE-142/143), the Safrole
ticket lottery (CE-131/132, with ticket-sealed blocks), erasure-coded
availability (CE-137/138/141/147) and live auditing (CE-144/145), each
verified between separate lasair processes over real QUIC. What remains
is called out wherever it appears: segment fetching (CE-139/140/148),
without which a guarantor cannot yet take a package that imports
segments; and finality, which follows a draft protocol whose revisions
the clients do not yet agree on. The connection, identity and
block-propagation core, and following each other's chains, are verified
against PolkaJam; most of the work-package and availability protocols
have been tested only between lasair nodes.

Read on for the details, each tied to the exact lasair function that implements
it.
