---
title: Streams, Messages, and the Protocol Catalogue
duration: 30 min
---

# Streams, Messages, and the Protocol Catalogue

Identity and connectivity established, everything else in JAMNP-S is a family of
**stream protocols**. This lesson covers the stream model, the message framing,
the protocols lasair implements, one by one, and an honest catalogue of what
remains.

## The stream model

All communication is over **bidirectional QUIC streams**, many at once per
connection. Each stream has a *kind*, and kinds fall into two patterns:

- **Unique Persistent (UP)** — at most one open per kind per connection, opened by
  the connection *initiator*, long-lived. Numbered from **0**. If duplicates
  appear (e.g. a stream reopened after packet loss), keep the one with the
  greatest QUIC stream ID and reset the others.
- **Common Ephemeral (CE)** — zero or many per kind, opened for one query and
  closed. Numbered from **128**. Reset by the initiator = cancel; reset by the
  acceptor = reject/failure.

After opening a stream, the initiator sends **one byte** naming the kind; the
protocol becomes active immediately. lasair does this in the transport layer:

```ocaml
(* jamnp/transport.ml *)
let open_kind conn kind =                 (* initiator: open + send the kind byte *)
  let s = Quic_ffi.conn_open_bi conn in
  Quic_ffi.stream_write s (Bytes.make 1 (Char.chr kind)); s

let accept_kind conn =                    (* acceptor: read the kind byte *)
  let s = Quic_ffi.conn_accept_bi conn in
  let b = Quic_ffi.stream_read_exact s 1 in
  (Char.code (Bytes.get b 0), s)
```

lasair defines the kinds it speaks in `jamnp/wire.ml`:

```ocaml
let up_block_announcement = 0
let ce_block_request = 128
let ce_state_request = 129
let ce_safrole_ticket_gen = 131    (* generating validator -> proxy validator *)
let ce_safrole_ticket_proxy = 132  (* proxy validator -> all current validators *)
let ce_work_package_submission = 133
let ce_work_package_sharing = 134      (* guarantor -> co-guarantors on the core *)
let ce_work_report_distribution = 135  (* guarantor -> validators *)
let ce_work_report_request = 136       (* auditor -> auditor *)
let ce_shard_distribution = 137        (* assurer -> guarantor *)
(* ... 138 to 148 ... *)
```

## Message framing

Within a stream, data is a sequence of **messages**, each sent as a 32-bit
little-endian length followed by that many content bytes:

```ocaml
(* jamnp/transport.ml *)
let write_frame s content =
  let n = Bytes.length content in
  let hdr = Bytes.create 4 in Bytes.set_int32_le hdr 0 (Int32.of_int n);
  Quic_ffi.stream_write s hdr; Quic_ffi.stream_write s content

let read_frame s =
  let hdr = Quic_ffi.stream_read_exact s 4 in          (* raises End_of_stream on a clean FIN *)
  let len = get_u32_le hdr 0 in
  if len > max_frame_bytes then failwith "frame too large";   (* bound BEFORE allocating *)
  Quic_ffi.stream_read_exact s len
```

Note the length is validated against a cap **before** any allocation, so a peer
announcing a 4 GiB frame can't force a huge buffer. Clean termination is the QUIC
`FIN` bit; a CE request is only "successful" if *both* halves close cleanly, which
`read_frame` surfaces as an `End_of_stream` exception at a message boundary.

## UP-0 — Block announcement (implemented ✓)

The one persistent stream lasair runs. Both sides send a handshake, then a stream
of announcements, **in parallel** (it's bidirectional on the single stream the
connection initiator opened):

```
Final        = Header Hash ++ Slot          (latest finalized block)
Leaf         = Header Hash ++ Slot          (a leaf of the block tree)
Handshake    = Final ++ len++[Leaf]
Announcement = Header ++ Final

-->/<-- Handshake
loop { -->/<-- Announcement }
```

lasair's codecs live in `jamnp/wire.ml` (`Up0.encode_handshake` /
`encode_announcement`), and the mesh runs writer and reader concurrently:

```ocaml
(* bin/lasair_client.ml — up0_loops (runs on both dial and accept sides) *)
let _writer = Thread.create (fun () ->
  (* push each newly-canonical block as an Announcement *) ...) () in
try while true do
  let ann = Wire.Up0.decode_announcement (Transport.read_frame s) in
  sync_to conn (blake2b_256 ann.header)    (* learn the head, CE-128 the delta *)
done with _ -> ()
```

An announcement is sent whenever a new valid block is produced or received; a
receiver, on learning a head it doesn't have, back-fills the missing ancestors
over **CE-128**. `Final` is lasair's latest **finalized** block, in the
handshake and in every announcement. The handshake lists one leaf, lasair's
best head (the peer back-fills anything else it lacks over CE-128), and the
writer announces every new best head. The spec lets a node skip announcing a
block only if it announces a descendant instead, so on a re-org the new head
is announced even when it sits at a height already announced.

Every one of those details was once wrong in lasair, and a mixed network with
PolkaJam found each: `Final` carried the best head (claiming unfinalized
blocks as final), the writer announced by height (so a re-orged-in sibling
was never announced), and a peer that reset the send half left a
connection that could still read but no longer announce. That last one is
the subtle one: the chain silently partitions. lasair now closes such a
connection, so a fresh one is made with a fresh handshake.

## CE-128 — Block request (implemented ✓, both directions)

The pull side of sync. Request a run of blocks by header hash:

```
Direction = 0 (Ascending exclusive)  |  1 (Descending inclusive)
--> Header Hash ++ Direction ++ Maximum Blocks
--> FIN
<-- [Block]
<-- FIN
```

- **Descending inclusive** walks the given block, then its parent, grandparent…
  — used to back-fill ancestors after an announcement.
- **Ascending exclusive** returns children onward — used by a peer that is
  behind and forward-syncing (this is how PolkaJam pulls from lasair).

lasair serves both from its block store (`ce128_lookup` in
`bin/lasair_client.ml`: descending by hash, ascending along its best chain,
and, for a node run with `--data-dir`, from the on-disk store for finalized
blocks pruned from memory) and requests via `Transport.request_blocks`. The response must exclude blocks that can't be
finalized; if the request can't be satisfied, the stream is reset.

## CE-129 — State request (implemented ✓)

Sync the *state* of a block, not just the block. Request a key range of a block's
posterior state and get back the key/value pairs **plus a Merkle boundary proof**
that binds them to the block's state root:

```
--> Header Hash ++ Key(Start,31) ++ Key(End,31) ++ Maximum Size(u32)
--> FIN
<-- [Boundary Node]      (one message: 64-byte trie nodes concatenated)
<-- [Key ++ Value]       (one message: 31-byte key ++ len++value, repeated)
<-- FIN
```

Keys are 31 bytes (the Merklization ignores the last key byte). The **boundary
nodes** are the `B/L` set from the GP State Merklization appendix: the trie-node
encodings on the paths from the root to the start key and to the last included
key. With them, a requester rebuilds the covered subtree and checks it against the
block's state root — so it can trust a slice of state without holding all of it.

lasair's state trie computes its root *functionally* (a recursive bit-partition,
no retained tree), so the new capability is an emitter that walks that same
recursion collecting the node encodings on the two paths, deduplicated and
parent-first:

```ocaml
(* lib/state_db.ml *)
let boundary_nodes (db : t) (targets : bytes list) : bytes list = ...
(* jamnp/transport.ml: request_state / serve_state_request  *)
(* bin/lasair_client.ml: serves a range of any imported block's posterior state,
   found by header hash via Block_tree.find_node, capped by the requester's max size *)
```

The correctness bar is high, so it's tested two ways. A pure test
(`test/state_range_test.ml`) reconstructs the state root from *only* the boundary
nodes + returned pairs, using an **independent** verifier (walk root→children by
hash, masked-left / full-right per the node encoding; rebuild fully-in-range
subtrees from the leaves) — across full / partial / single / absent-start / empty
ranges — and a negative control confirms that tampering a value or dropping an
essential node makes the reconstruction fail (so the check isn't vacuous). A QUIC
round-trip test (`ce129`) proves the wire path end-to-end.

## CE-131/132 — Safrole ticket distribution (implemented ✓)

Safrole's block-production lottery is anonymous: each validator proves it won a
seat in the next epoch's seal schedule with a **Bandersnatch ring-VRF** ticket
that reveals *membership in the validator ring* without revealing *which*
validator. Tickets are gossiped through a **proxy** to hide the author's network
origin. Two ephemeral protocols, identical body, opposite direction:

```
CE-131  generating validator -> proxy validator
CE-132  proxy validator      -> all current validators

--> Epoch Index (u32-le) ++ Ticket
--> FIN ; <-- FIN

Ticket = Attempt (u8) ++ Bandersnatch RingVRF Proof ([u8; 784])
```

The proxy is deterministic but unlinkable: *the last 4 bytes of the ticket's VRF
output, big-endian, modulo the validator count.* (Big-endian is called out
explicitly here because every other wire integer is little-endian.) lasair's codec
(`Wire.Ce131_132`) encodes the 789-byte message and exposes `proxy_index`; the
transport (`Transport.distribute_ticket` / `serve_ticket_distribution`) carries it.

The node layer is live and cryptographically real. A generator signs each ticket
with `Bandersnatch_ffi.ring_vrf_sign` over the on-chain ring, **self-verifies it
against `gamma_z` before it leaves the node**, and sends it over CE-131 to the
elected proxy only. A recipient verifies every ticket against the on-chain ring
commitment `gamma_z` (+ `eta_2`) with `ring_vrf_verify` and pools it by its VRF
output (the ticket's on-chain score), and — if it is the elected proxy —
re-gossips it over CE-132:

```ocaml
(* bin/lasair_client.ml — handle_conn *)
else if kind = Wire.ce_safrole_ticket_gen then
  (* generator -> proxy: verify against gamma_z, pool, and (if we are the
     elected proxy for this ticket) re-distribute it over CE-132 *)
  Jamnp.Ticket_relay.serve_ce131 ticket_relay ~verify:verify_and_pool
    ~is_proxy:(fun proxy -> Keystore.is_proxy role (Bt.db_exn (Bt.best tree)) proxy) s
else if kind = Wire.ce_safrole_ticket_proxy then
  (* proxy -> all validators: verify against gamma_z and pool *)
  (try Transport.serve_ticket_distribution s (fun ep t -> ignore (verify_and_pool ep t))
   with _ -> ())
```

Two rules came from running against PolkaJam: a ticket goes only to its
proxy (PolkaJam refuses one sent to a validator that is not the proxy), and
tickets are sent only in a window: once the node is synced, a few slots into
the epoch, and before slot Y closes the lottery.

Two lasair nodes run this for real: each generates its validators' tickets for the
next epoch and the other **verifies and pools every one against the shared
`gamma_z`** (the freerun genesis commits `gamma_z` to the actual validator ring so
the proofs check out). A round-trip test (`test/jamnp_transport_test.ml`,
`ce131-132`) drives the whole path over real QUIC with genuine ring-VRF crypto: a
signed ticket verifies and both sides derive the same proxy index, while a ticket
with one flipped proof byte is **rejected** — the ring proof is unforgeable. The
pool feeds the chain: authors put pooled tickets into their blocks' ticket
extrinsic, they accumulate in γ_A, and when the lottery fills, the next epoch's
blocks are **ticket-sealed**. (The author must include only tickets that will
stay in the accumulator. lasair once included useless ones after γ_A was full;
PolkaJam correctly refused those blocks, and no official test vector covers
that rule.)

## CE-133 — Work-package submission (implemented ✓)

The builder → guarantor path that makes a service like jamswap run through the
*standard* protocol rather than a bespoke API:

```
--> Core Index ++ Work-Package          (limited to 2 + 200·1024 bytes)
--> [Extrinsic]                         (message size = sum of extrinsic lengths)
--> FIN
<-- FIN
```

lasair's guarantor decodes the work-package off the wire and authorizes it
before reading the rest of the bundle (`jamnp/wp_intake.ml`): the package's
shape and limits, its refinement context against the chain, an authorizer in
the core's pool, its own assignment to the core, each service's code hash, and
finally **Is-Authorized** in the PVM. Then it runs **refine**, shares the
package with the core's other guarantors (CE-134), who refine it and sign the
report themselves, and distributes the guarantee (CE-135). From there it is the
on-chain path: an author includes the guarantee, the validators assure
availability, and the service **accumulates** the result. CE-146 (a whole
bundle) takes the same route. The initial message size cap is exactly the
spec's, so a guarantor can't be forced to download a huge package before
authorizing it. What it cannot take yet is a package that imports segments:
fetching them needs CE-139/140/148, which lasair does not serve.

## CE-137/138/141/147 — Erasure-coded availability (implemented ✓)

Once a work-package is guaranteed, its bundle must be made **available** — held by
enough validators that about a third of them can reconstruct it — without every
validator storing the whole thing. JAM does this with erasure coding + a Merkle
commitment:

```
bundle --erasure code--> V shards   (any R of them rebuild the bundle)
shards --M_B Merkle--> Erasure-Root  (a well-balanced binary tree, blake2b)
```

Each validator `v` holds the shard at index `i = (c·R + v) mod V` (core `c`, R
the number of shards needed to recover), plus a **justification** — the co-path
from its shard to the erasure-root — so anyone can check a shard belongs to the
committed set without holding the others. These protocols move this around:

```
CE-137  assurer  -> guarantor   --> Erasure-Root ++ Shard Index (u16)
                                <-- Bundle Shard, [Segment Shard], Justification
CE-138  auditor  -> assurer     --> Erasure-Root ++ Shard Index (u16)
                                <-- Bundle Shard, Justification (CE-137's ++ the segment-shard root)
CE-141  assurer  -> validator   --> Anchor(32) ++ Bitfield(⌈C/8⌉) ++ Ed25519 Sig(64)
CE-147  auditor  -> guarantor   --> Erasure-Root
                                <-- Work-Package Bundle
```

lasair's availability core (`conformance/availability.ml`) is the real crypto
under these — real Reed–Solomon (the `erasure_ffi`), real blake2b Merkle, real
ed25519:

```ocaml
let e = Availability.encode ~package_hash ~bundle ~exports ()   (* A(h, b, s, v) + every shard *)
let justification = Availability.justification e i              (* CE-137 co-path to shard i *)
Availability.verify_shards ~erasure_root ~v ~index:i
  ~bundle_shard ~segment_shards ~justification                    (* the assurer's check *)
let bundle = Availability.recover_bundle ~spec ~fetch ()        (* the auditor: any R verified shards *)
```

The verifier folds the co-path exactly as the well-balanced tree builds it — which
is genuinely different from a power-of-2 index-bit tree at `V = 6`, so it uses a
dedicated `Merklization.verify_merkle_trace`, not the existing `verify_merkle_proof`
(a distinction pinned by a test). The transport (`Transport.request_audit_shard` /
`serve_audit_shard_request`, `distribute_assurance` / `serve_assurance`) carries
them. On the wire a justification uses the spec's discriminated encoding
(`Wire.Justification`): each element is a 32-byte node hash (`0 ++ Hash`) or,
where the sibling subtree is a single leaf, that 64-byte leaf itself
(`1 ++ Hash ++ Hash`).
In the node, the guarantor keeps what it encoded, each assurer fetches and
verifies **its own** shard over CE-137 and keeps it for two epochs, and each
validator signs an assurance only for shards it verified, as itself. A QUIC
round-trip test (`ce137-138`) fetches **every** shard, verifies each against the
erasure-root, and **reconstructs the exact bundle from R of them** — while a
bundle the assurer doesn't hold resets to `None`; a second test (`ce141`)
round-trips a signed bitfield and rejects a tampered one. `scripts/availability-net.sh`
runs it on six processes: every validator fetches and verifies its shard, an
auditor rebuilds the bundle byte for byte from R shards, and a lasair-authored
block carrying the validators' own assurances makes the report available.

The honest boundary: all of this has been tested between lasair nodes only.
There is no other client on a shared network exercising these protocols to
test bytes against yet.

## CE-144/145 — Auditing tranches (implemented ✓)

Availability makes the data recoverable; **auditing** is what actually re-checks
that guaranteed work-reports are valid, and disputes the ones that aren't. After a
block, a Bandersnatch draw tells each auditor which reports to re-verify. Auditing
runs in **tranches**: everyone announces at tranche 0, and later tranches open only
for reports that went unaudited ("no-shows"). Two protocols carry this:

```
CE-144  auditor -> auditor      --> Header Hash ++ Tranche(u8) ++ Announcement
                                --> Evidence
CE-145  auditor -> validator    --> Epoch ++ Val Index ++ Validity ++ Report Hash ++ Sig
                                --> Guarantee            [iff Validity == Invalid]

Announcement = len++[Core Index ++ Report Hash] ++ Ed25519 Signature
Evidence     = Bandersnatch Sig(96)              (tranche 0: the draw's s_0)
             | len++[Bandersnatch Sig ++ len++[No-Show]]   (later tranches)
```

lasair signs and verifies all three with its **own on-chain payloads**, so a
network signature is exactly what the disputes STF would check
(`conformance/auditing_net.ml`):

```ocaml
Auditing_net.sign_announcement ~header_hash ~tranche ~reports ~seed   (* ed25519 "jam_announce" *)
Auditing_net.sign_judgment     ~valid ~report_hash ~seed              (* ed25519 "jam_valid"/"jam_invalid" *)
Auditing_net.sign_evidence     ~entropy ~seed                        (* Bandersnatch IETF VRF "jam_audit" *)
```

The judgment contexts matter: a *positive* judgment signs `jam_valid ++ report` and
a *negative* one signs `jam_invalid ++ report`, so a valid-vote signature provably
**cannot** be replayed as an invalid vote (a test pins exactly this). The transport
(`distribute_announcement` / `serve_announcement`, `publish_judgment` /
`serve_judgment`) carries the two-message flows, including the rule that a **negative
judgment carries its supporting guarantee** and a positive one does not; the node
logs received announcements and judgments. Over real QUIC (`ce144`, `ce145`): an
announcement round-trips and its ed25519 signature *and* Bandersnatch evidence
verify against the announcer's keys; a negative judgment arrives with its guarantee
and a positive one without, and both signatures verify. Core crypto (`ce144`/`ce145`
in `auditing_net_test`) adds the tamper cases.

On top of the wire, lasair runs the auditing itself: the tranche-0 draw,
later-tranche escalation over no-shows and negative judgments, and
re-execution of each report it must audit from its bundle (fetched over
CE-147, else rebuilt from CE-138 shards). `scripts/audit-net.sh` runs six
validators: an honest report is judged valid by its auditors; a deliberately
forged one is judged invalid by all of them, their negative judgments are
forwarded to grid neighbours, and the next author puts a bad verdict with its
culprits into a block that every node imports. The auditor re-executes a
work-package the Graypaper way (Is-Authorized, then refine for each item, then
the whole report compared byte for byte) in `jamnp/audit_eval.ml`. The
boundaries: packages that import segments are not covered yet (as with
CE-133), GRANDPA does not yet wait for blocks to be audited, and none of it
has been tested against another client.

## CE-142/143 — Preimage gossip (implemented ✓)

When a service solicits a preimage on chain, whoever holds it announces
possession, and anyone who needs it fetches it. Two ephemeral protocols:

```
CE-142  Node -> Validator          CE-143  Validator -> Node
--> Service ID ++ Hash ++ Length   --> Hash
--> FIN ; <-- FIN                  --> FIN
                                   <-- Preimage
                                   <-- FIN
```

lasair implements both codecs (`Wire.Ce142` / `Wire.Ce143`), the transport
serve/request pair, **and** the node-level gossip loop. Its mesh accept side
answers CE-143 from a preimage store, and on a CE-142 announcement for a
preimage its chain has solicited and it lacks, it follows up over CE-143,
checks the bytes against the announced hash and length, stores them, and
announces them onward to its own grid:

```ocaml
(* bin/lasair_client.ml — handle_conn (abridged) *)
else if kind = Wire.ce_preimage_request then
  (try Transport.serve_preimage_request s (Pp.find preimages) with _ -> ())  (* unheld => reset *)
else if kind = Wire.ce_preimage_announcement then begin
  let ann = ref None in
  (try Transport.serve_preimage_announcement s (fun a -> ann := Some a) with _ -> ());
  match !ann with
  | None -> ()
  | Some { Wire.Ce142.service_id = service; hash = h; length } ->
    let now_held =
      match Pp.on_announcement preimages (Bt.db_exn (Bt.best tree)) ~service ~hash:h ~length with
      | `Ignore -> false                     (* not solicited, or already held *)
      | `Added -> true
      | `Fetch ->
        (match (try Transport.request_preimage conn ~hash:h with _ -> None) with
         | Some p when Pp.add_fetched preimages ~service ~hash:h ~length p -> true  (* verified *)
         | _ -> false) in
    if now_held then announce_preimage ~except:conn ~service ~hash:h ~length ()
end
```

A preimage nobody solicited is never fetched. Authors then include held
preimages in their blocks' preimage extrinsic (`scripts/preimage-net.sh`).

"Not held" is signalled by resetting the acceptor half (freeing the send stream
without a clean FIN), exactly as the spec prescribes — the requester reads that as
rejection and gets `None`. A round-trip test over real QUIC
(`test/jamnp_transport_test.ml`, `ce142-143`) proves a held preimage is served
byte-for-byte, an unheld one resets to `None`, and an announcement's Service
ID / Hash / Length decode exactly. (This is directly relevant to jamswap, whose
service is deployed to the chain as a preimage.)

## The rest of the catalogue (defined by the spec, not yet complete in lasair)

JAMNP-S specifies a full validator toolkit beyond block sync and submission.
lasair does not yet implement these fully; they are listed here so the boundary
is explicit:

| Kind | Protocol | Status & reason |
|---|---|---|
| CE-136 | Work-report request (auditors) | ~ served by hash; lasair's auditors do not request missing reports yet |
| CE-139/140 | Segment shard request (± justification) | ~ request codecs in the spec layout; not served |
| CE-148 | Segment request (guarantor → guarantor) | ~ request codec in the spec layout; not served |

What remains is the segment half of availability: CE-139/140/148 carry the
exported segments that other work-packages import, and until lasair serves and
requests them, its guarantors refuse packages that import segments.
(CE-134/135 guarantee sharing and distribution, CE-146 bundle submission and
CE-147 bundle requests are implemented; see above.)

## Where this leaves lasair

lasair implements the JAMNP-S **spine and nearly every stream protocol** — the
identity handshake, the full-mesh connectivity with a churn-free Preferred
Initiator, the block-propagation grid, and the protocols to sync a chain and its
state, run a service, share and distribute guarantees, share preimages, gossip
Safrole tickets, make guaranteed data available, and audit it (UP-0, CE-128,
CE-129, CE-131/132, CE-133 to CE-138, CE-141 to CE-147). The core — identity,
connectivity, block propagation and sync — is proven by co-authoring one chain
with an independent client; the rest is proven between separate lasair
processes. The remaining leaves are catalogued, not hand-waved: you now know
exactly what is on the wire, what isn't, and — for each — what it is waiting on.
