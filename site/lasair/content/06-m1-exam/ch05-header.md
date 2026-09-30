---
title: "Ch. 5 The Header"
duration: 30 min
exam_portion: random
exam_bucket: small
gp_chapter: 5
gp_words: 674
gp_tex: text/header.tex
lasair: lib/header.ml, conformance/stf_guarantees.ml (compute_extrinsic_hash), conformance/block_codec.ml, conformance/safrole_stf.ml
---

# Ch. 5 The Header

<span class="lecture-badge">M1 Understanding · Graypaper ch. 5</span>

The header is the part of the block that is known before anything is executed: the
chain link, the commitment to the prior state, the commitment to the extrinsic, the slot,
three markers that Safrole and disputes fill in, and the author's two Bandersnatch
signatures. It is small, so the understanding that matters is the *why* of each field.

## Chapter sheet

### State touched
None directly. The header is input. Its fields drive τ', η', κ'/λ' (epoch marker), γ
(winners marker), ψ (offenders marker) and recent history β_H' (its own hash and, since
0.8.0, its slot H_T are appended; eq. recenthistorydef).

### The ten fields (eq. header)
| Field | Symbol | Type | Purpose |
|---|---|---|---|
| parent | H_P | hash | Blake2b of the parent header's encoding; defines ancestry |
| prior state root | H_R | hash | Merkle root of the **prior** state σ, i.e. the parent's posterior |
| extrinsic hash | H_X | hash | Merkle commitment to E, allowing per-report and per-preimage inclusion proofs |
| timeslot | H_T | 32-bit | must be > parent's and not in the future |
| epoch mark | H_E | optional (prior η₀, prior η₁, keys of the newly pending set γ_P') | present only on the first block of an epoch |
| winners mark | H_W | optional 600 tickets | present only on the block that seals the ticket contest |
| offenders mark | H_O | sequence of Ed25519 keys | validators newly found misbehaving this block |
| author index | H_I | index into κ' | who authored; Bandersnatch key H_A ≡ κ'[H_I] |
| VRF signature | H_V | Bandersnatch sig | yields the block's entropy contribution |
| seal | H_S | Bandersnatch sig | proves the author held the slot; excluded from the unsigned encoding |

Two encodings exist: the full header and the unsigned header (everything but H_S), which
is what the seal signs.

### Inputs
The parent header (via H_P), the wall clock, the posterior active set κ' (to resolve
H_I), and for the markers: γ, η, ι, ψ' and the disputes extrinsic E_D.

### The transition in plain English
A node receiving a block first checks the header alone: it must name a known parent, its
slot must be later than the parent's and no later than now, its prior state root must
equal the root the node computed after importing the parent, and its extrinsic hash must
match the extrinsic it carries. Then Safrole checks the seal against the slot's expected
sealer and the VRF signature against the author's key. Only then is the extrinsic
processed. After the transition the block's own header hash is appended to recent
history.

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| H_P = Blake2b(encode(parent header)) | forging ancestry; ties every block to exactly one parent |
| Implementations keep ancestors from the last 24 hours (C_maxlookupanchorage) | unbounded storage while still validating lookup anchors |
| parent.H_T < H_T and H_T·6 ≤ wall time | reordering and future-dated blocks; a future block becomes valid as time passes |
| H_R = merklize(σ) for the prior state | an author lying about the state they built on; pipelining is preserved because the posterior root is not needed to publish |
| H_X = Blake2b(encode(Blake2b-many(a))) where a = [enc(E_T), p, g, enc(E_A), enc(E_D)] | tampering with the extrinsic after sealing; the per-item hashing of preimages and guarantees is what allows individual inclusion proofs |
| H_I ∈ N_{\|κ'\|} | an author outside the active set |
| markers present exactly when Safrole/disputes say so | stale or fabricated epoch transitions and offender lists |

The extrinsic hash detail (0.8.0): **p** is the encoded sequence of (E₄(service index),
Blake2b(data)) for each preimage, and **g** is the encoded sequence of
(Blake2b(report), E₄(slot), credential) for each guarantee. Tickets, assurances and
disputes are hashed as whole encodings.

### Edge cases
- **Genesis.** H⁰ has no parent; ancestry rules start at block 1.
- **Empty extrinsic.** H_X is still a hash of five encodings, each of an empty
  sequence, never the zero hash. (lasair once hardcoded the disputes part as empty; see
  the war story.)
- **Future block.** Temporarily invalid, not permanently; a node should hold, not discard.
- **Epoch marker on a non-boundary block** is invalid; missing on a boundary block is
  invalid.
- **Offenders marker** is non-empty exactly when the block carries culprits or faults. It
  must equal, as a sequence, the culprits' keys followed by the faults' keys, each in
  extrinsic order (judgments.tex, Header subsection). Nothing forbids one key being both a
  culprit and a fault, so H_O can list a key twice while ψ'_O gains it once: a sorted-set
  comparison is wrong (lasair had one until the 0.8.0 validity audit,
  `docs/TINY_TO_FULL_AUDIT.md` 4th sweep).

### War story
<div class="lasair-connection">

**The extrinsic hash that assumed no disputes.** Every trace vector and every fuzz seed
lasair had seen carried an empty disputes extrinsic, so `compute_extrinsic_hash` in
`conformance/stf_guarantees.ml` hardcoded the disputes component as three empty
compact-encoded sequences. The first fuzzer block carrying real verdicts (L2b seed
3571347957) therefore failed with `bad_extrinsic_hash` before ψ was even touched, and two
further gaps sat behind it: the block codec threw "disputes import not wired", and there
was no ρ→ρ† invalidation on bad verdicts. Fixing the hash moved the seed from step 2 to
step 6 and exposed the rest. Lesson: the header commits to *all five* extrinsics, and a
component you have never seen populated is still hashed. Recorded in
`docs/TINY_TO_FULL_AUDIT.md` ("Disputes BLOCK-IMPORT wiring"); the 0.8.0 migration
regression-tests this function because GP #524 changed the preimage leaves.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **Extrinsic hash:** preimages now contribute as per-item pairs (E₄(service index),
  Blake2b(data)) instead of the whole encoded preimage extrinsic, so a single preimage's
  inclusion can be proven. (GP PR #524)
- H_I's domain is written as N_{|κ'|} rather than N_V: the constant V = 1023 is gone, and
  every validator key sequence now has a live length in 𝕍, a multiple of 3 from 6 to 3C
  (eq. valcount), stored length-prefixed. H_I is still encoded as E₂.
- **Epoch marker:** its key sequence has |γ_P'| ∈ 𝕍 entries rather than exactly V, and the
  header codec gains E_E: E_E(∅) = E(0), otherwise E(1, η₀, η₁, ↕k), a length prefix on the
  keys (serialization.tex). lasair: a third, private header encoder in `Stf_encoding` stayed
  fixed-width, so every epoch-boundary block failed `bad_seal` until it was made to delegate
  to `Block_codec.encode_header` (`docs/GP_0_8_0_PLAN.md`, Gate 3 ledger row).
- Wording only: "reports **and preimages**" may individually be proven included.
- **Adjacent chapters:** the offenders marker is now bounded (at most 16 culprits and 16
  faults, eq. disputesextrinsics); recent history records each block's H_T (eq.
  recenthistorydef) so a context's anchor slot can be checked; the lookup-anchor record
  check now also reads the anchor's child header's H_R (reporting_assurance.tex).

</div>

### Source pointers
- `lib/header.ml` — learning-era teaching model, not on the import path (its encoders and
  `compute_extrinsic_hash` are stubs): types, `is_timeslot_valid`, `get_author_bs_key`,
  `is_within_lookup_window`
- `conformance/stf_guarantees.ml` — `compute_extrinsic_hash` (the real one)
- `conformance/block_codec.ml` — header encoding, signed and unsigned
- `conformance/safrole_stf.ml` — seal and VRF verification, marker validation
- `docs/notes/header.md`; lectures `011-graypaper-lectures/22-the-header`, `23-epoch-markers`

## Question bank

### Q1 ★ Name every header field and its purpose. Which are signatures?
<details><summary>Model answer</summary>

Parent hash, prior state root, extrinsic hash, timeslot, epoch mark, winners mark,
offenders mark, author index, VRF signature, seal: ten fields. The last two are
Bandersnatch signatures, both made with the author's key H_A. The seal signs the unsigned
header (all other fields) under the ticket or fallback context; the VRF signature signs
an empty message under context `$jam_entropy ‖ Y(H_S)`, where Y(H_S) is the seal's own VRF
output (eq. vrfsigcheck), and its output is hashed into η₀ as the block's entropy
contribution.
Everything else is metadata or a commitment.

</details>

### Q2 ★ Which state root does the header carry, the prior or the posterior? Why, and what does it force an importer to do?
<details><summary>Model answer</summary>

The **prior** state root: the root of the state the block was built on, which is the
parent's posterior state. Polkadot and Ethereum carry the posterior root. JAM chose the
prior root so that block production and Merklization can be pipelined: an author can seal
and broadcast before finishing the expensive re-Merklization of the new state. The cost
is that an importer cannot check its own result against the block it just imported; it
learns whether it agrees only when the *next* block arrives, whose H_R must equal the
root it computed. Recent history handles this with the β† correction.

</details>

### Q3 What is the extrinsic hash and how is it computed in 0.8.0?
<details><summary>Model answer</summary>

Blake2b of the encoding of the Blake2b-many of a five-element sequence: the encoded
tickets, the sequence p of (E₄(service), Blake2b(data)) per preimage, the sequence g of
(Blake2b(report), E₄(slot), credential) per guarantee, the encoded assurances and the
encoded disputes. Hashing reports and preimages individually lets anyone prove one
report or one preimage was in the block without shipping the whole extrinsic. In lasair
this function once hardcoded the disputes component as three empty sequences, which hid
the disputes path from block import until a fuzzer seed exposed it.

</details>

### Q4 What are the epoch, winners and offenders markers, and when must each be present?
<details><summary>Model answer</summary>

Epoch marker: (the prior η₀ and η₁, and the sequence of (Bandersnatch, Ed25519) keys
of γ_P', the set that has just become *pending* for the following epoch; eq. epochmarker),
present exactly on the first block of an epoch so light clients can follow validator
changes and reconstruct fallback sealing keys without state. Because γ_P' = Φ(ι) and Φ
nulls keys in the *posterior* offender set ψ'_O, a validator named as a culprit or fault
in this very block already appears as a zero key (eq. blacklistfilter); in 0.8.0 the
marker carries one key pair per member of γ_P' (a length in 𝕍, no longer the constant V),
length-prefixed on the wire. Winners marker: Z(γ_A), the outside-in sequence of the E accumulated tickets for the next epoch, present exactly on
the first block at or after the tail start within an epoch (m < Y ≤ m', same epoch) when
the accumulator is saturated (eq. winningticketsmarker). Offenders marker: the culprits'
Ed25519 keys followed by the faults' keys, each in extrinsic order (judgments.tex, Header
subsection). They are new offenders because neither list may name a key already in ψ_O; in
0.8.0 each list holds at most 16 (eq. disputesextrinsics), so at most 32 entries. Empty when
there are no culprits or faults. An epoch or winners marker present in any other situation
invalidates the block.

</details>

### Q5 What is the author index and how does it link to κ' and the seal?
<details><summary>Model answer</summary>

H_I is an index into the posterior active set κ', giving the author's Bandersnatch key
H_A = κ'[H_I]. It uses κ' rather than κ because on an epoch-boundary block the author is a
member of the *new* set. The seal must verify under H_A (eq. ticketconditiontrue,
ticketconditionfalse). In ticket mode its context is `$jam_ticket_seal ‖ η₃' ‖ entry-index`
and its VRF output Y(H_S) must equal the slot's ticket identifier; a VRF output depends
only on the secret key and the context, so only the validator whose anonymous ring-VRF
ticket won the slot can produce it. In fallback mode the context is
`$jam_fallback_seal ‖ η₃'` and the slot's fallback key must equal H_A.

</details>

### Q6 What must be true of the header timeslot?
<details><summary>Model answer</summary>

Strictly greater than the parent's slot, and H_T × 6 seconds must not exceed the wall
clock. A future block is *temporarily* invalid and may become valid as time advances, so
it should be held rather than treated as malicious. There is no upper bound on the gap:
skipped slots are normal.

</details>

### Q7 Why does the Graypaper only require ancestors from the last 24 hours to be stored?
<details><summary>Model answer</summary>

Because the only protocol use of deep ancestry is validating a work-report's lookup
anchor, which must be within C_maxlookupanchorage = 14 400 slots (24 hours; 24 slots at
tiny; eq. limitlookupanchorage). Anything older can never be referenced by a valid report,
so the header store can be pruned. This is one of the few checks that cannot be made from
on-chain state: in 0.8.0 the node must find two headers in the ancestor set A, the lookup
anchor h (its slot and hash match the context) and its child h', whose prior state root
H_R must equal the context's lookup-anchor posterior state root. That works *because*
headers carry the prior root, and since A includes the importing block's own header (eq.
ancestors), the child may be the block being imported. The ordinary anchor is checked from
state instead: it must appear in recent history β_H† (the last 8 blocks, which also serve
the duplicate-package check) with matching header hash, state root, accumulation-output
super-peak and, new in 0.8.0, slot. lasair's 0.8.0 validity audit found its lookup-anchor
record check lacked the h_T and child-root conditions and walked only 24 ancestors
even at full (`docs/TINY_TO_FULL_AUDIT.md`, 4th sweep).

</details>
