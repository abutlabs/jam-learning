---
title: Connectivity and the Preferred Initiator
duration: 25 min
---

# Connectivity and the Preferred Initiator

Two nodes have proven their identities. Now: *who connects to whom, and who
dials?* The spec's *Required connectivity* section answers both, and getting the
second answer right is the difference between a stable mesh and one that churns
connections endlessly.

## Required connectivity: a full mesh

> All validators in the previous, current, and next epochs should ensure they are
> connected to all other such validators.

So the connection graph among active validators is a **complete graph** — every
validator holds a connection to every other. (This is separate from *who you
announce blocks to*, which the grid narrows down; see Lesson 4.) Validators also
accept connections from non-validators, reserving some slots for work-package
builders.

The spec locates each validator's endpoint in the first 18 bytes of its
on-chain metadata: a 16-byte IPv6 address and a 2-byte little-endian port.
lasair reads it straight from the validator sets in state
(`jamnp/connectivity.ml`):

```ocaml
(* The endpoint in the first 18 bytes of validator metadata [m], or [None]
   when it names none (the unspecified address or port 0) *)
let endpoint_of_metadata (m : bytes) : endpoint option =
  if Bytes.length m < 18 then None
  else
    let port = Bytes.get_uint16_le m 16 in
    (* ... an IPv4-mapped address (::ffff:a.b.c.d) is given as IPv4 ... *)
```

`Connectivity.plan` then merges three sources of peers to dial: every
validator of the previous, current and next sets (λ, κ, γ_P) at its metadata
endpoint, the chainspec's bootnodes, and any `--peers` given on the command
line. The node re-plans every 2 seconds and keeps one `run_peer` worker per
dial:

```ocaml
(* bin/lasair_client.ml *)
ignore (Thread.create (run_peer d) h)
```

`scripts/connectivity-net.sh` checks this on seven real processes started
with **no** `--peers` at all: every node finds the others from metadata
alone.

## One connection per pair: the Preferred Initiator

If both sides of every pair dialled each other, you'd get two connections per
pair, and each side would keep resetting the "extra" one — the classic gossip
**connection churn**. The spec removes the ambiguity: for each pair it names a
single **Preferred Initiator** that should dial. Given two Ed25519 keys `(a, b)`:

```math
P(a, b) = a   when  (a₃₁ > 127) ⊕ (b₃₁ > 127) ⊕ (a < b)
          b   otherwise
```

`a₃₁` is byte 31 of the key, and the spec leaves `a < b` formally undefined.
lasair first read `a < b` as the little-endian integer comparison that the
`a₃₁` test seems to imply (compare from byte 31 downward). On a mixed network
that matched PolkaJam's observed dial direction on only 6 of 9 pairs, and each
disagreeing pair churned forever: both sides dialled, each killed the other's
connection, and one node leaked about 19,000 connection attempts and 5 GB of
memory in 90 minutes. Watching which side PolkaJam dials (a black-box
observation of its public behaviour) settled it: plain **byte-order
comparison from byte 0**, like `memcmp`, matched 9 of 9 pairs:

```ocaml
(* bin/lasair_client.ml *)
let lt_key (a : bytes) (b : bytes) : bool =   (* byte 0 first, like memcmp *)
  let rec go i =
    if i > 31 then false
    else
      let x = Bytes.get_uint8 a i and y = Bytes.get_uint8 b i in
      if x <> y then x < y else go (i + 1)
  in
  go 0

let i_am_initiator (my : bytes) (peer : bytes) : bool =
  let hi k = Bytes.get_uint8 k 31 > 127 in        (* this term stays on byte 31 *)
  (hi my) <> (hi peer) <> lt_key my peer
```

The lesson is general: where a spec leaves something undefined, the other
implementations' observable behaviour is the only oracle, and a wrong guess
does not fail loudly; it fails as a slow leak.

So on each pair exactly one side dials; the other **waits** and serves the
connection on its accept side. The spec allows the non-preferred side to dial
anyway after "a reasonable timeout (e.g. 5 seconds)" — a liveness hedge if the
preferred initiator is down or the tie-break is read differently. lasair does
exactly that: a non-initiator sleeps ~5 s and only then falls back to dialling.

## Knowing when you've already been dialled

Here is the subtlety that made lasair's mesh churn-free against PolkaJam. If you
are the *non*-preferred side and the peer has already dialled you, you must
*not* also dial it — that would create the redundant connection the peer resets.
But the fallback timer doesn't know whether the peer showed up.

The fix required learning **which validator opened an inbound connection**. The
peer's identity is in its TLS certificate, and quinn exposes it via
`peer_identity()`. lasair added a small FFI to surface it:

```rust
// rust/quic-ffi/src/lib.rs
pub unsafe extern "C" fn quic_conn_peer_ed25519(conn, out) -> i32 {
    let certs = (&*conn).conn.peer_identity()?.downcast::<Vec<CertificateDer>>()?;
    let pk = jamnp::ed25519_from_cert(certs.first()?)?;   // SPKI Ed25519, 32 bytes
    copy(pk -> out); 0
}
```

```ocaml
(* jamnp/transport.ml *)
let peer_ed25519 conn : bytes option = Quic_ffi.conn_peer_ed25519 conn
```

The accept loop records, for the lifetime of each inbound connection, which peer
key opened it (a refcounted `dialed_us` set). A non-initiator whose peer is
already in that set stays **passive** and never opens a redundant connection:

```ocaml
(* bin/lasair_client.ml — run_peer *)
match peer_key with
| Some k when (not initiator) && peer_has_dialed_us k -> Unix.sleepf 2.0; attempt ()
| _ -> (* dial: we are the Preferred Initiator, or the fallback fired *) ...
```

(A simplified excerpt: in the source, the key comes from the dial plan.)

### Why this matters — measured

Before this change, lasair dialled every peer and PolkaJam kept resetting the
redundant connections. After it, against a real PolkaJam network, PolkaJam's own
log reports a **steady `Net status: 5 peers (5 vals)` for the entire run** — the
peer count never fluctuates — while the chain advances and PolkaJam re-derives
lasair-authored state roots. One connection per pair, no churn, correct by
construction rather than by reconnect-timing luck.

## Bidirectional streams on the one connection

Because there is only one connection per pair, it must be **symmetric**: whoever
dialled, both sides need to announce blocks and both need to answer block
requests. So lasair runs the same bidirectional logic on the dial side and the
accept side — the dial side also serves the peer's inbound CE-128 fetches, and
the accept side also pushes its own announcements. You'll see the UP-0 shape of
this in Lesson 5.

## Epoch-transition gating

The spec adds a careful rule for *when* to apply connectivity changes at an epoch
boundary — wait until the epoch's first block is finalized **and** at least
`max(⌊E/30⌋, 1)` slots have elapsed — so the set needed for finality stays
connected and everyone changes topology together.

lasair takes the validator sets to connect by from the latest *finalized*
block, and moves to a new epoch's sets only once `max(⌊E/30⌋, 1)` slots of
that epoch have passed (`Connectivity.advance`). Taking the finalized block's
sets satisfies the first condition by construction.

```ocaml
(* jamnp/connectivity.ml *)
let settle_slots ~(epoch_length : int) : int = max (epoch_length / 30) 1

let advance ~epoch_length ~(cur : LS.t) ~(fin : LS.t) ~now_slot : LS.t =
  if fin == cur || fin.LS.epoch < cur.LS.epoch then cur
  else if now_slot >= fin.LS.epoch * epoch_length + settle_slots ~epoch_length then fin
  else cur
```

A validator that leaves all three sets is no longer dialled. One that enters
appears in the next-epoch set γ_P an epoch before it may author, so it is
connected before its first slot. `scripts/connectivity-net.sh` checks both,
with a validator set that changes between epochs.
