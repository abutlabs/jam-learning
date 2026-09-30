---
title: "Ch. 6 Block Production and Chain Growth (Safrole)"
duration: 60 min
exam_portion: random
exam_bucket: large
gp_chapter: 6
gp_words: 2433
gp_tex: text/safrole.tex
lasair: lib/safrole.ml, conformance/safrole_stf.ml, conformance/ticket_pool.ml, conformance/stf_guarantees.ml (seal + gamma_s' on the import path), conformance/ticket_rules.ml, lib/bandersnatch_ffi/
---

# Ch. 6 Block Production and Chain Growth (Safrole)

<span class="lecture-badge">M1 Understanding · Graypaper ch. 6</span>

Safrole answers one question: who may author the block in a given six-second slot, and
how do we know without knowing who they are? It is a simplified Sassafras. Once per
epoch it fixes a slot-sealer sequence of E entries; under normal operation each entry is
an anonymous ring-VRF *ticket*, and only the validator who made that ticket can produce
the seal for that slot. As a side effect the chain accumulates unbiasable entropy. Understanding
this chapter means being able to walk through an epoch boundary end to end: rotation,
sealing, entropy, markers and the ticket contest.

## Chapter sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| τ | timeslot | the prior block's slot; τ' = H_T (eq. timeslotindex) |
| γ = (γ_P, γ_Z, γ_S, γ_A) | Safrole state | pending validators, epoch ring root, slot-sealer sequence, ticket accumulator (eq. consensusstatecomposition) |
| γ_P | pending set | the keys that will be active *next* epoch; reset from ι at each boundary; their Bandersnatch keys form the ring |
| γ_Z | epoch root | Bandersnatch ring root of γ_P's keys; ticket proofs verify against it |
| γ_S | slot-sealer sequence | exactly E entries: either E tickets or, in fallback, E Bandersnatch keys |
| γ_A | ticket accumulator | up to E best (lowest-id) tickets collected this epoch for the next |
| ι, κ, λ | staging / active / previous validator sequences | rotated at the boundary |
| η ∈ ⟦ℍ⟧₄ | entropy | η₀ the live accumulator; η₁, η₂, η₃ its value at the end of the last three epochs |
| ψ_O' | posterior offenders (read only) | Ed25519 keys nulled out of the incoming set (Φ); posterior, so this block's own disputes land first (γ' ≺ (…, ψ'), eq. transitionfunctioncomposition) |

A validator key is a 336-octet blob: Bandersnatch (32) ‖ Ed25519 (32) ‖ BLS (144) ‖
metadata (128). A validator sequence has length in {3c | 2 ≤ c ≤ C}: a multiple of 3
between 6 and 3C (eq. valcount, new in 0.8.0). The constant V = 1023 is gone from the
0.8.0 constants list: every validator count below is the length of a live sequence
(|γ_P'| for the ticket bound, |κ'| for the author index and F).

### Inputs
H_T, H_I (author index into κ'), H_S (seal), H_V (entropy VRF), the epoch and winners
markers, the tickets extrinsic E_T, and ψ_O' from disputes.

### The transition in plain English
1. **Time.** τ' = H_T. Let e, m be the prior epoch and phase (τ ÷ E) and e', m' the
   block's. An epoch change is e' > e.
2. **Rotation (only if e' > e).** γ_P' = Φ(ι) (staging becomes pending, offenders' keys
   zeroed), κ' = γ_P, λ' = κ, and γ_Z' = the ring root of γ_P' Bandersnatch keys.
   Otherwise all four stay.
3. **Slot-sealer sequence.** If e' = e, γ_S' = γ_S. If e' = e + 1 *and* the previous block
   was already in the tail (m ≥ Y) *and* the accumulator is full (|γ_A| = E), then
   γ_S' = Z(γ_A), the outside-in ordering. Otherwise fallback: γ_S' = F(η₂', κ'), E
   Bandersnatch keys picked from κ' by hashing η₂' with the slot index.
   (eq. slotkeysequence)
4. **Seal check.** Take i = γ_S'[H_T mod E]. In ticket mode the seal's VRF output must
   equal i's ticket id and the seal must be a Bandersnatch signature by H_A over the
   unsigned header with context `$jam_ticket_seal ‖ η₃' ‖ entry-index`. In fallback mode
   i must simply equal H_A and the context is `$jam_fallback_seal ‖ η₃'`. The flag T
   records which mode sealed the block (eq. ticketconditiontrue / false).
5. **Entropy.** H_V must be a signature by H_A with context `$jam_entropy ‖ Y(H_S)` over
   the empty message; η₀' = ℋ(η₀ ‖ Y(H_V)). On an epoch change the history shifts:
   (η₁', η₂', η₃') = (η₀, η₁, η₂). (eq. vrfsigcheck, entropycomposition)
6. **Markers.** On e' > e the header must carry the epoch marker (η₀, η₁, and the
   (Bandersnatch, Ed25519) pairs of γ_P'); on the block that crosses the tail start
   within the same epoch (e' = e, m < Y ≤ m') with a full accumulator it must carry the
   winners marker Z(γ_A). (eq. epochmarker, winningticketsmarker)
7. **Tickets.** E_T is a sequence of (entry index, ring proof). Each proof is verified
   against γ_Z' with context `$jam_ticket_seal ‖ η₂' ‖ entry`, yielding the ticket id.
   Ids must arrive sorted and unique, disjoint from γ_A, at most K per block, and none
   at all once m' ≥ Y. γ_A' is the E lowest of the sorted union of the new tickets and
   the prior accumulator (empty if a new epoch); every submitted ticket must survive
   into γ_A'.

### Why η₂' for tickets but η₃' for the seal
(Derivation from the rotation equations, not a sentence in the GP; the text itself only
says the oldest value "is used to regenerate this randomness when verifying the seal".)
Tickets submitted during epoch N are made against η₂' (the accumulator as it stood at
the end of epoch N−2) and seal epoch N+1. When epoch N+1 arrives the history shifts,
so that same value is now η₃'. The ticket-maker and the seal-verifier are looking at
the same randomness under two names. Fallback keys use η₂' at the moment the sequence is
generated, which is the boundary block.

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| τ' = H_T and (ch. 5) H_T > τ, not in the future | replay and clock games |
| seal verifies under γ_S'[H_T mod E] with the right context and η₃' | anyone but the slot's ticket-holder or fallback key authoring; cross-epoch reuse of a seal |
| ticket-mode seal output must equal the ticket id | a validator with a valid key sealing a slot whose ticket belongs to someone else |
| H_V signed over Y(H_S) with `$jam_entropy` | biasing entropy by choosing the message: the message is already fixed by the seal |
| ring proof verifies against γ_Z' with η₂' ‖ entry | tickets from non-validators, or made for a different epoch's randomness |
| entry index < n = ⌈2E / \|γ_P'\|⌉ | one validator flooding the contest; more tickets allowed when there are fewer validators so E can still be saturated |
| ids sorted, unique, disjoint from γ_A; \|E_T\| ≤ K; none when m' ≥ Y | duplicate submission, useless bloat, late tickets after the sequence is fixed |
| **n** (the block's new tickets) ⊆ γ_A' | "useless" tickets that would not make the cut |
| tickets mode only if the previous block was in the tail and γ_A is full | a partially filled lottery, or an epoch whose last blocks were skipped, silently sealing with an incomplete sequence |
| Φ nulls offenders' incoming keys | a slashed validator re-entering the next epoch's ring |
| epoch marker exactly on boundary blocks; winners marker exactly on the tail-crossing block of the same epoch with a full accumulator | light clients being fed a fake validator set or ticket sequence |

### Edge cases
- **Several slots skipped across the boundary.** e' may be e + 2 or more; the ticket
  condition requires e' = e + 1 exactly, so fallback mode is forced.
- **Previous block before the tail (m < Y) and this block is the next epoch.** The
  contest never closed on-chain; fallback, even if γ_A happens to be full.
- **Accumulator not full at the boundary.** Fallback; the epoch runs on F(η₂', κ').
- **Empty E_T, same epoch.** γ_A' = γ_A exactly (the text notes this is provable).
- **Tail blocks.** Any ticket at m' ≥ Y invalidates the block.
- **Tiny.** E = 12, Y = 10, K = 3, 6 validators; γ_A saturates at 12 tickets. The 0.8.0
  formula gives n = ⌈24/6⌉ = 4 entries per validator, and the 0.8.0 tiny vector
  `publish-tickets-no-mark-1` agrees: its bad entry index is now 4 (it was 3 at 0.7.2),
  and `publish-tickets-no-mark-6` and `publish-tickets-with-mark-1` accept index 3. Only
  the chain-spec table in the vectors README (`vectors/README.md`) still lists
  `tickets_per_validator: 3` for tiny (2 for full, which the formula also gives). lasair's
  0.8.0 build computes the formula (`conformance/safrole_stf.ml`,
  `Stf_config.ticket_attempt_bound` on the import path); the `tickets_per_validator = 3`
  field left in `lib/spec.ml` is no longer the bound. The text and the vectors
  give 4; the README table is stale.
- **Ties.** Tickets are ordered by id; ids are VRF outputs, so ties are negligible and
  duplicates are rejected anyway.

### War story
<div class="lasair-connection">

**F4: the accumulator count that was a byte.** γ_A is a sequence of at most E tickets and
its length is a JAM-compact natural. lasair read and wrote it as a single octet. At tiny
E = 12 the two encodings coincide, so every tiny vector and every fuzzer lane passed. At
full the accumulator reaches 600, whose compact form is two bytes (0x82 0x58): the u8
read returned 130 and misaligned every ticket after it, tickets mode could never satisfy
|γ_A| ≥ 600 so every epoch wrongly fell back to the key sequence, and `Char.chr` raised
once more than 255 tickets accumulated. It was found purely offline by the L4 Safrole
adapter running the full-spec `publish-tickets-with-mark` vector, before the fuzzer ever
reached it. Lesson: the notation chapter's "a natural may serialize to several octets"
is the whole bug. Recorded in `docs/FULL_SPEC_OFFLINE_TESTING.md` (F4) and
`docs/TINY_TO_FULL_AUDIT.md`.

**Finding #7, the γ_S fork, is the live sequel.** On the mixed lasair + PolkaJam net,
lasair authored slot 8028333 and then rejected its own block with `bad_ticket_proof`. Root
cause: pooled tickets were verified against η₂ and γ_Z of the best block at gossip time,
but included and re-verified at import against η₂' of the branch being extended. η₂
rotates at every boundary and differs per branch under a fork, so stale or cross-branch
tickets burned the authoring slot. The same campaign showed lotteries can split by
branch, making each client's γ_S' correct per branch and different across branches: a
fork-choice problem manifesting through Safrole. Recorded in `docs/FINALITY_PLAN.md`
(Phase 0 ledger, 2026-07-13) with logs in `gamma-s-forensics/`.

**The useless-ticket split (GP 0.8.0 migration, 2026-09-24).** The rule n ⊆ γ_A' ("it is
invalid to include useless tickets in the extrinsic") only bites when γ_A plus the block's
new tickets exceed E (in practice, once γ_A is full), and no official vector exercises the
rejection, so every vector passed. lasair's importer never enforced it, and its author
kept putting tickets into blocks after the accumulator had saturated, tickets that could
not make the E lowest. PolkaJam correctly refused those
blocks, and the mixed lasair + PolkaJam net split at in-epoch slot 6–7 on every run. It was
isolated by running a PolkaJam follower on an all-lasair chain: the follower stopped at
exactly the first block after γ_A saturated. Fix: one `Ticket_rules` module
(`conformance/ticket_rules.ml`) shared by the importer (`ticket_not_retained`) and the
author's ticket selection, so the two can never disagree. Lesson: passing vectors say
nothing about a rule no vector exercises, and a second client's refusal is the oracle.
Recorded in `docs/GP_0_8_0_PLAN.md` (ledger loop 7) and the fourth sweep of
`docs/TINY_TO_FULL_AUDIT.md`.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **Ticket entry-index bound is now derived:** entry index ∈ ℕ_n with
  n = ⌈2E / |γ_P'|⌉, replacing the constant C_ticketentries (N = 2 full). "When there are
  fewer validators, each validator is permitted more tickets" so the accumulator can be
  saturated. At full with a full complement (|γ_P'| = 1023) n = ⌈1200/1023⌉ = 2, unchanged;
  at tiny (6 validators) the formula gives 4, which the 0.8.0 tiny vectors follow, while the
  vectors README table still says 3 (see Edge cases).
- **Validator sequences are resizable:** the new eq. valcount states any length that is a
  multiple of 3 between 6 and 3C; validator sets are sequences, not fixed-V sets, and the
  constant V = 1023 is removed. That is why the full-spec vectors gained
  `enact-epoch-change-with-set-resize` (`docs/GP_0_8_0_PLAN.md`, Phase 3). Knock-ons: the
  author index is H_I ∈ ℕ_{|κ'|} (header.tex); the epoch marker's key list has length in 𝕍.
- **Codec (appendix, but it follows from the above):** the epoch marker is now encoded as
  E(0) for ∅ or E(1, η₀, η₁, ↕k), a length-prefixed key list (serialization.tex); ι, γ_P, κ,
  λ are length-prefixed in state (merklization.tex C(4), C(7)–C(9)); a ticket's entry index
  is written as one octet, E₁, both in the tickets extrinsic and in a state ticket.
- Terminology: "seal-key series" is now the "slot-sealer sequence"; the ticket's entry
  index type is written ℕ. Mechanics of sealing, entropy, markers and Z/F are unchanged.

</div>

### Source pointers
- `lib/safrole.ml` — teaching module: `epoch_of_timeslot`, `is_new_epoch`, `sealer_at_slot`,
  `rotate_entropy`, `merge_tickets`, `outside_in_sequence`, `should_include_epoch_marker`,
  `should_include_winners_marker`, `ctx_ticket_seal` / `ctx_fallback_seal` / `ctx_entropy`.
  Note that `accumulate_entropy`, `generate_fallback_keys` and `compute_epoch_root` there
  are `failwith "TODO"` stubs; the real ones live on the conformance path.
- `conformance/safrole_stf.ml` — `apply_safrole_stf`, `verify_ticket`, `merge_tickets`,
  `accumulate_entropy`, `rotate_entropy` (the vector-tested STF)
- `conformance/stf_guarantees.ml` — the live block-import path: seal verification against
  the *anticipated* γ_S' (Z(γ_A) or fallback, decided exactly as eq. slotkeysequence) and
  `seal_mode_is_ticketed`; `conformance/authoring.ml` — `ticket_revalidate` (the fix for
  finding #7)
- `conformance/ticket_pool.ml` — the authoring-side pool (`add`, `evict_passed`, `select`)
- `conformance/ticket_rules.ml` — n ⊆ γ_A' (`all_retained`, `retained_prefix`), shared by
  the importer and the author (the useless-ticket fix)
- `lib/bandersnatch_ffi/` (OCaml stubs) over `rust/bandersnatch-ffi/` — ring VRF proving
  and verifying via ark-vrf
- `docs/notes/safrole.md`; lectures `011-graypaper-lectures/24…29`

## Question bank

### Q1 ★ What are the four components of γ and what is each for?
<details><summary>Model answer</summary>

γ_P, the pending validator sequence: the keys that will be active next epoch, reset from
the staging set ι at each boundary with offenders zeroed. γ_Z, the epoch root: the
Bandersnatch ring root over γ_P's keys, against which this epoch's ticket proofs are
verified, so tickets prove membership in *next* epoch's set anonymously. γ_S, the
slot-sealer sequence: E entries for the current epoch, tickets normally, Bandersnatch
keys in fallback; entry m' says who may seal slot m'. γ_A, the ticket accumulator: the up
to E lowest-id tickets gathered so far, which becomes next epoch's γ_S if it fills.

</details>

### Q2 ★ Walk through the first block of a new epoch: what rotates, in what order, and what must the header carry?
<details><summary>Model answer</summary>

Detect e' > e from τ and H_T. Keys: λ' ← κ, κ' ← γ_P, γ_P' ← Φ(ι) with any key whose
Ed25519 part is in ψ_O' replaced by zeros, γ_Z' ← ring root of γ_P'. Entropy history:
η₁' ← η₀, η₂' ← η₁, η₃' ← η₂ (η₀' still folds in this block's VRF). Sealer sequence: if
e' = e + 1 and the previous block was in the tail and γ_A was full, γ_S' = Z(γ_A);
otherwise F(η₂', κ'). The accumulator starts empty for the new contest. The header must
carry the epoch marker: the *prior* η₀ and η₁ (which are now η₁' and η₂') plus the
(Bandersnatch, Ed25519) pairs of γ_P'. Then the seal is checked against γ_S'[m'] and the
author index resolves in κ'.

</details>

### Q3 ★ Explain the seal and the entropy VRF: what each signs, which key, which context, and why the entropy message is empty.
<details><summary>Model answer</summary>

Both are Bandersnatch VRF signatures by the author's key H_A = κ'[H_I]. The seal H_S
signs the unsigned header (everything but H_S) under context `$jam_ticket_seal ‖ η₃' ‖
entry-index` in ticket mode, and its VRF output must equal the slot's ticket id; in
fallback the context is `$jam_fallback_seal ‖ η₃'` and the slot's key must equal H_A. The
entropy signature H_V signs the *empty* message under context `$jam_entropy ‖ Y(H_S)`.
The VRF output depends on the context, not the message, so the author cannot bias
entropy by tweaking what they sign: the context is already fixed by the seal's output
Y(H_S), which in ticket mode must equal the ticket id and in fallback is fixed by the slot
key and η₃' (eq. ticketconditiontrue / false, vrfsigcheck). η₀' = ℋ(η₀ ‖ Y(H_V)).

</details>

### Q4 Why are there four entropy values, and which one does each part of Safrole use?
<details><summary>Model answer</summary>

η₀ is the live accumulator, updated every block. η₁, η₂, η₃ are snapshots at the end of
the last three epochs. Tickets for the next epoch are made against η₂' during this epoch,
so the randomness is fixed two epochs before it is used and no one can influence it
while bidding. When that next epoch arrives the same value has shifted to η₃', which is
what the seal check uses. η₂' also seeds the fallback key sequence F at a boundary. η₁ is
carried in the epoch marker alongside η₀ so header-only clients can reconstruct the
sequence.

</details>

### Q5 ★ State the three cases of γ_S' and explain the fallback function F and the outside-in sequencer Z.
<details><summary>Model answer</summary>

γ_S' = Z(γ_A) when e' = e + 1 and m ≥ Y and |γ_A| = E; γ_S when e' = e; F(η₂', κ')
otherwise. Z reorders E tickets as s₀, s_{E−1}, s₁, s_{E−2}, …: alternating from both
ends, so the best and worst tickets are spread rather than clustered at the start of the
epoch. F(r, k) yields, for each slot index i ∈ ℕ_E, the Bandersnatch key of
k[ decode₄(ℋ(r ‖ E₄(i))[0…4]) mod |k| ]: the first four bytes of a Blake2b of the
entropy and the slot index, taken as a little-endian u32, cyclic-indexed into the
validator sequence. Fallback is public, so authorship is not anonymous that epoch.

</details>

### Q6 Why does tickets mode require the *previous* block's phase m ≥ Y, and what happens if the last blocks of an epoch were all skipped?
<details><summary>Model answer</summary>

Because the contest closes on-chain: only once a block has been imported at or past the
tail start is it known that no more tickets can arrive, and the winners marker on that
block publishes the final sequence. If the epoch ended with the last block still before
the tail (every tail slot skipped), the sequence was never fixed on-chain and no winners
marker was published, so the new epoch must use fallback even if γ_A was full. The
condition also demands e' = e + 1 exactly: skipping a whole epoch loses the accumulator.

</details>

### Q7 ★ What are the validity rules for the tickets extrinsic?
<details><summary>Model answer</summary>

Each item is (entry index, ring proof). Entry index < n = ⌈2E / |γ_P'|⌉. The proof is a
Bandersnatch ring VRF proof under γ_Z' with context `$jam_ticket_seal ‖ η₂' ‖ entry` and
empty message; its output is the ticket id. At most K items (16 full, 3 tiny) and zero
once m' ≥ Y. Ids must already be in ascending order with no duplicates, and disjoint from
the ids in γ_A. γ_A' is the first E of the sorted union with the prior accumulator (or
empty at a boundary), and every new ticket must appear in γ_A': submitting a ticket that
would not make the cut invalidates the block.

</details>

### Q8 What is the winners marker, when exactly does it appear, and who needs it?
<details><summary>Model answer</summary>

H_W = Z(γ_A): the final ordered sequence of ticket ids for next epoch. It appears exactly
on the block where the tail starts (m < Y ≤ m') in the same epoch (e' = e) and only if
γ_A is full; otherwise it is ∅. Together with the epoch marker it lets a node that keeps
only headers know each epoch's validator keys and sealer sequence, and so verify seals,
without syncing state.

</details>

### Q9 What does Φ do and why?
<details><summary>Model answer</summary>

Φ maps the staging sequence ι to γ_P' by replacing any key whose Ed25519 component is in
the posterior offenders set ψ_O' with an all-zero 336-byte key. A validator convicted in
a dispute therefore cannot carry into the next epoch's ring and cannot make tickets. F does
not filter it: F indexes cyclically over all of κ' (eq. fallbackkeysequence), so it can
still land on the nulled entry once that sequence becomes κ'. No one can produce a seal
that verifies under the all-zero key (a derivation, not a GP sentence), so that slot goes
unauthored. The slot count of the sequence is preserved so indices and the ring size
stay stable; the zero key simply never validates. Because Φ
reads the *posterior* ψ_O', the block's own disputes extrinsic is processed first
(γ' ≺ (H, τ, E_T, γ, ι, η', κ', ψ'), eq. transitionfunctioncomposition): a validator
convicted in the boundary block itself is already excluded. lasair's importer got this
order wrong until 2026-09-23 (`docs/GP_0_8_0_PLAN.md`, ledger loop 6: disputes now run
first, so Φ(ι) uses ψ').

</details>

### Q10 What is the boolean T for?
<details><summary>Model answer</summary>

T = 1 when the block was sealed with a ticket, 0 in fallback. Ticket sealing is "of
greater security" (anonymous, unbiasable), so the best-chain rule in ch. 19 selects, among
acceptable blocks, the one with the most ancestors sealed with a ticket. lasair's live
fork choice (`jamnp/block_tree.ml`, per the FINALITY_PLAN ledger loop 13) implements this
as a lexicographic (ticketed-ancestor score, height) comparison that degrades to
longest-chain on all-fallback nets.

</details>

### Q11 Where does Safrole touch the rest of the protocol?
<details><summary>Model answer</summary>

Through ι (written by the delegator service during accumulation, read at the boundary),
κ and λ (read by guarantees, assurances, disputes, statistics), τ (read everywhere), η
(the posterior η₀' is read by the accumulate host environment and by the `new` service-id
derivation; η₂' by fallback and tickets; η₃' by the seal), and ψ_O' (offenders from
disputes, applied via Φ). The Graypaper stresses γ itself is independent of everything
else.

</details>

### Q12 Give the tiny and full constants Safrole depends on.
<details><summary>Model answer</summary>

Epoch length E 12 / 600; tail start Y 10 / 500; max tickets per extrinsic K 3 / 16;
slot 6 s in both. The validator count is no longer a constant in 0.8.0 (V = 1023 was
removed; |κ| ∈ 𝕍, eq. valcount): the tiny vectors run 6 validators, and a full complement
at full is 3C = 1023. Entry-index bound n = ⌈2E/|γ_P'|⌉, i.e. 4 / 2 with those counts;
the 0.8.0 tiny vectors follow the formula (bad index 4) and so does lasair's 0.8.0 build,
though the vectors README table still lists 3 / 2. Guarantor rotation (R 4 / 10) is
ch. 11, not Safrole.

</details>

### Q13 A block arrives sealed in fallback mode while γ_S' is a ticket sequence. Valid?
<details><summary>Model answer</summary>

No. The seal condition is chosen by the *type* of γ_S': if it is a sequence of tickets
the ticket condition applies, and a fallback-context signature will not match the
ticket id. Conversely a ticket seal against a key sequence fails because i must equal H_A
and the context differs. Mode is determined by state, never by the block.

</details>

### Q14 0.8.0 made validator sequences resizable. What does that change in and around Safrole?
<details><summary>Model answer</summary>

The number of validators is now read from state, not fixed by a constant, so everything
that used to be sized by V is sized by the live sequence. V = 1023 is gone; ι, γ_P, κ and λ
have a length in 𝕍 = {3c | c ∈ ℕ_{2…C+1}}, a multiple of 3 from 6 to 3C (eq. valcount).
The multiple of 3 fits ch. 11, where only the first |κ'|/3 cores are active. A size change
enters like any key change: ι (set during accumulation) becomes γ_P' = Φ(ι) at a boundary,
the ring root is rebuilt over it, and it becomes κ one epoch later. The ticket entry-index
bound n = ⌈2E/|γ_P'|⌉ (eq. ticketsextrinsic) scales with the pending set, so a small set
still offers at least 2E possible tickets and can fill γ_A. The author index is
H_I ∈ ℕ_{|κ'|}; the epoch marker carries |γ_P'| key pairs and is now serialized with a
length prefix, as are ι, γ_P, κ, λ in state. F already indexes cyclically into κ', so it
works at any size. Outside Safrole: every pending availability assignment is cleared when
|κ| ≠ |κ'| (eq. availassignmentspostassurancesdef), and a report's erasure-shard count
must equal |κ'|. The full-spec vectors `enact-epoch-change-with-set-resize-1…4` exercise
the Safrole side: with |γ_P'| = 6 at E = 600, n = ⌈1200/6⌉ = 200, so `-2` accepts entry
index 199 and `-3` rejects 200 with `bad_ticket_attempt`.

</details>
