---
title: "War stories, by chapter"
duration: 45 min
exam_portion: reference
lasair: docs/CONFORMANCE_RETROSPECTIVE.md, docs/TINY_TO_FULL_AUDIT.md, docs/M1_PLAN.md, docs/FINALITY_PLAN.md, docs/GP_0_8_0_PLAN.md, site/data/divergences.json
---

# War stories, by chapter

<span class="lecture-badge">M1 Understanding · reference</span>

Every bug below was found by running lasair against an oracle: the official vectors,
the live fuzzer lanes, the tiny→full audit lenses, or a live PolkaJam chain. Each is a
protocol lesson filed under the Graypaper chapter it teaches. Every line comes from the
lasair record; where the record does not say, the line is left out. Sources are named
per story (lasair's own docs, cited by path). Most were found under GP 0.7.2, during the
M1 campaign, so they are history; the callout below says where 0.8.0 moved the rule underneath them, and stories
marked *0.8.0 migration* come from the move itself (2026-09).

Format per story: **symptom · rule · found by · fix · lesson · source**.

<div class="callout callout-warning">
<div class="callout-title">What 0.8.0 changed under these stories</div>

- **Validator sets have live sizes.** κ, λ, ι and γ_P may hold any multiple of 3 from 6 to
  3C keys (eq. valcount), so App. D now length-prefixes γ_P in C(4), ι/κ/λ in C(7)–C(9)
  and both validator-statistics lists in C(13); the constant V itself is gone. With 1 023
  keys in γ_P (full), F3's γ_Z therefore sits at 343 730, not 1 023 × 336 (2 017, not 2 016,
  with 6 at tiny), and the C(13) cores section starts at 49 108, not 49 104 (290, not 288,
  at tiny) when both lists hold 1 023 (6) entries.
- **Disputes (F5, verdict tally).** A verdict's judgments are length-prefixed on the wire
  and must number exactly ⌊2|k|/3⌋+1; the tally thresholds are ⌊2|k|/3⌋+1, 0 and ⌊|k|/3⌋
  for k = K(a) (eq. verdicts). An extrinsic carries at most 16 verdicts, 16 culprits and
  16 faults (eq. disputesextrinsics), and the "at least two culprits per bad verdict" rule
  is gone.
- **Availability (F8/F9).** Available means more than two thirds of the prior |κ| assured
  (eq. availableworkreports), and every availability assignment is cleared when
  |κ| ≠ |κ'| (eq. availassignmentspostassurancesdef).
- **Tickets (F10/F11).** The constant N is gone: an entry index must be below
  ⌈2E/|γ_P'|⌉ (eq. ticketsextrinsic), 2 at full and 4 at tiny. K = 16 stays
  (eq. enforceticketlimit).
- **Host calls (B5, B8, sbrk).** Gas comes from a per-call table (definitions.tex,
  host-function gas costs): `checkpoint` is id 18 at M_C = 103 (0.7.2: id 17 at 10).
  `bless` answers HUH when the invoker is not the manager. The `sbrk` instruction is
  removed; `grow_heap` is host call 1 and every id from `fetch` on moved up by one.
- **Extrinsic hash (ch. 5 story).** Preimages now enter as (requester, Blake2b of the data)
  pairs, much as each guarantee enters with its report replaced by the report's hash
  (ch. 5 §The Header).

</div>

## Ch. 3 Notation and the codec

**F1: the core index that was not a byte.** Work-report `core_index` was encoded and
decoded as a fixed u8, but it is a JAM compact natural: cores reach 340 at full, which
needs two compact bytes, while tiny's 0 and 1 are single-byte and identical to u8. The
one-byte under-read misaligned the stream and blew up in the auth-output decoder with
"decode: out of bounds". Rule: ch. 3 §Octets and Blobs, an octet serializes to itself
but a natural may take several octets; App. C compact encoding. Found by L2b (full-spec
mutations) at step 2. Fix: compact read/write in the report codec. Lesson: tiny hides
every width bug below 128. Source: lasair v1.4.1 (2026-06-26), `docs/TINY_TO_FULL_AUDIT.md`.

**F4: the ticket count that could never reach 600.** The γ_A ticket-accumulator length
was read and written as a single u8 in five sites, so at full the `count ≥ E` test for
tickets mode could never hold and the epoch always fell back to the key sequence;
`Char.chr` would raise past 255 tickets. Wire proof: 600 = compact `0x82 0x58`. Rule:
ch. 6 slot-sealer sequence selection; App. C compact naturals. Found offline by the L4
safrole adapter on the publish-tickets-with-mark full vector, not by the fuzzer. Fix:
compact in all five sites. Lesson: a constant that is small in the tiny spec is a codec
width waiting to fail. Source: lasair v1.4.1 (2026-06-26), `docs/TINY_TO_FULL_AUDIT.md`.

**F7: the reported-packages count as u8.** Recent-history β "reported packages" count was
read and written as u8; reports per block can reach C = 341, so ≥ 128 needs two compact
bytes. Found by the proactive tiny→full audit (F7–F11 sweep), fixed with
`decode_compact`/`encode_compact`. Same class as F1 and F4. Source: lasair v1.4.2 (2026-06-27),
`docs/TINY_TO_FULL_AUDIT.md`.

## Ch. 5 Header

**The extrinsic hash that assumed no disputes.** `compute_extrinsic_hash` hardcoded the
disputes component as three empty compact sequences, so the first block carrying real
verdicts failed `bad_extrinsic_hash` before ψ was even touched. Behind it were two more
gaps: the block codec threw "disputes import not wired" and no ρ→ρ† invalidation existed.
Rule: ch. 5 extrinsic hash (H_x = H(E(H#(a))), a Blake2b over the Blake2b hashes of the
five extrinsic components; each guarantee enters with its report replaced by the report's
hash and, since 0.8.0, each preimage as a (requester, data hash) pair). Found by L2b seed
3571347957 (full spec), the first disputes-carrying block in the corpus. Fix: serialize
verdicts, culprits and faults from their per-entry wire bytes, then wire
`process_disputes` into import. Lesson: a component you have never seen populated is
still hashed. Source: lasair v1.4.3 (2026-06-28), `docs/TINY_TO_FULL_AUDIT.md` "Disputes
BLOCK-IMPORT wiring".

## Ch. 6 Safrole

**F3: the ring commitment at a frozen offset.** The safrole epoch transition sliced γ_Z
(the ring root) at hardcoded offset 2016 = 6 × 336, the tiny size of γ_P, the field before
γ_Z in C(4); at full γ_P is 1023 × 336 and γ_Z lived at 343 728 (0.7.2 layout; see the
callout). Rule: ch. 6 key rotation and the ring root; App. D state layout of C(4). Found
by audit, never exercised by any vector or report block; would have diverged on the first
full epoch with tickets. Fix: offset = V × 336 from the active spec. Lesson: state-layout
offsets are products of spec constants, not literals. Source: lasair v1.4.1 (2026-06-26).

**F10 and F11: ticket bounds frozen at tiny.** `too_many_tickets` rejected at > 3 where
full K = 16, so valid 4- to 16-ticket blocks were wrongly rejected; the attempt bound
`≥ 3` accepted attempt = 2 where full N = 2 makes it invalid. Rule: ch. 6 tickets
extrinsic (at most K tickets, eq. enforceticketlimit; entry index below N in 0.7.2, below
⌈2E/|γ_P'|⌉ in 0.8.0, eq. ticketsextrinsic). Found by the proactive audit. Fix: both read
from the spec accessors. Source: lasair v1.4.2 (2026-06-27).

**Finding #7: the stale ticket that forked the clients.** On the mixed lasair + PolkaJam
net, for certain epochs lasair rejected every PolkaJam ticket-sealed block with
`bad_ticket_proof` on a shared prefix, then rejected its own authored block at slot
8028333 the same way. Root cause: two verification contexts disagreed. Pool-time
verification checked ring proofs against η₂ and γ_Z from the best block at gossip time;
import-time verification checked against η₂' of the branch being extended. η₂ rotates at
every epoch boundary and differs per branch under a fork, and the ticket extrinsic was
built from pooled candidates without re-verifying against the authoring parent. Rule:
ch. 6 tickets extrinsic (eq. ticketsextrinsic): the ring proof is made under γ_Z' with
context `$jam_ticket_seal` ‖ η₂' ‖ entry index (the attempt). Found live, caught with a
full log forensic on the finality campaign's Phase 0. Fix: one change,
`Authoring.ticket_revalidate` re-verifies every pooled candidate against the authoring
parent's posterior γ_Z' and η₂' before inclusion and purges stale entries; red test first
(`test/ticket_staleness_test.ml`). Lesson: a proof is only valid in the context it names,
and the context is per branch. Source: `docs/FINALITY_PLAN.md` ledger loops 5 and 7
(2026-07-13), `conformance/ticket_pool.ml`.

**The useless tickets that split the net (0.8.0 migration).** On the mixed lasair + PolkaJam
net under GP 0.8.0 the chain partitioned at in-epoch slot 6–7 on every run. lasair's author
kept adding tickets after γ_A was already full, and lasair's importer accepted them;
PolkaJam refused those blocks, correctly. Rule: ch. 6 §The Extrinsic and Tickets: γ_A' is
the E lowest ticket ids of the new tickets n together with γ_A (reset at a new epoch), and
every submitted ticket must survive into it, n ⊆ γ_A'. A ticket that would be dropped at
once is "useless" and makes the block invalid. The rule is unchanged since 0.7.2, and no
official vector exercises the rejection. Found by running a PolkaJam follower on an
all-lasair chain: it stopped exactly at the first block after γ_A saturated. Fix: one
`Ticket_rules` module shared by the importer (`ticket_not_retained`) and the author's
selection; the saturated-accumulator case in `ticket_pool_test` fails without it. Lesson:
passing every vector proves only the rules the vectors contain. This one prompted the
fourth audit sweep, which fixed about 25 rules no vector exercises, this one included.
Source: `docs/GP_0_8_0_PLAN.md` ledger loop 7 (2026-09-24), `docs/TINY_TO_FULL_AUDIT.md`
fourth sweep.

## Ch. 7 Recent history

**B1: the accumulation-output set, sorted wrong.** Live seed 1551410130 diverged at step
2854 on two keys at once: C(16) accumulation output and C(3) recent history, same length,
same entries, different order. θ' is laid out from a set of (service, hash) pairs (ch. 12
§Final State Integration) and lasair sorted it by service alone, so when one service
accumulated twice in a block the two pairs kept insertion order. β's belt commits to the
Keccak root of that sequence, so the error cascaded into recent history and the state
root. Rule: ch. 7 eq. accoutbeltdef and ch. 3 order-by notation over the full tuple. Found
by the live fuzzer lane after 951 clean imports. Fix: sort by (service, hash) and route
every set through one canonical encoder. Lesson: every set that reaches the trie has a
total order. Source: Divergence Lab B1, `docs/CONFORMANCE_RETROSPECTIVE.md` §3, §6.

## Ch. 9 Service accounts

**B3: the cross-service read that came back empty.** A service wrote an 8-byte value
derived from another service's storage (key "data", 128 bytes); lasair returned NONE. Two
mistakes: the closure that loads a foreign service loaded it with empty storage, and the
read addressed foreign storage by the raw key instead of the state key interleaved with
the foreign service's id. Rule: App. D state keys C(s, E_4(2^32−1) ⌢ k) for storage and
C(s, E_4(2^32−2) ⌢ h) for preimages both interleave the owning service's id s with a
Blake2b of the marker and key; inside the account (ch. 9) storage is looked up by the raw
key and preimages by their raw hash. Found by seed 1071703991 at step 6628 after 2 239
clean imports. Fix: load the foreign service's storage and interleave with the target id.
Lesson: get the keying wrong and the data is invisible even when loaded; verify each
operand byte-exact before suspecting execution. Source: Divergence Lab B3.

**B6: the sibling fixed before the fuzzer found it.** The same closure loaded foreign
preimages as an empty list, so a cross-service preimage lookup would have returned NONE
exactly as the storage read did. Found by auditing B3's class, fixed and corpus-verified
before any lane reached it. Lesson: a class of bug, once named, enumerates its instances.
Source: Divergence Lab B6.

**B9: the service id minted twice.** `new` mints an id from Blake2b(E(s) ‖ η₀' ‖ E(t)),
advancing by 42 and skipping taken ids. lasair computed 983279732 and used it, but that
id already existed in state from an earlier block; the reference bumped to 983279733.
The "taken" check consulted only the current service and the invocation's overlay, not
services in state, so an existing account was overwritten. Rule: App. B `new`. Found by
seed 3743464522 at step 5741. Fix: "taken" also consults the state snapshot and the minted
id runs through the collision check. Lesson: unique means against all existing holders.
Source: Divergence Lab B9.

**B4, B7, B8: privileges, ejects and the snapshot.** See ch. 12 below; they are
accumulation-time host-call stories whose damage lands in δ and χ.

## Ch. 10 Disputes

**The blind spot: disputes had zero trace and seed coverage.** The component disputes STF
passed all 56 vectors at tiny and full, but the block-import path never invoked it: a
real disputes block was processed as if ψ never changed and ρ→ρ† never applied. Rule:
ch. 10 ψ' and eq. removenonpositive (ρ†); ch. 5 offenders marker. Found by L2b seed
3571347957 (the first disputes-carrying block in the corpus) and the tiny→full audit.
Fix: `process_disputes` reads ψ, κ, λ, τ, calls the proven STF, verifies the header's
offenders marker against the returned offenders, writes ψ' sorted, and clears ρ cores
whose report hash turned bad or wonky. Lesson: a proven component is not a wired
component. Source: lasair v1.4.3 (2026-06-28), `docs/TINY_TO_FULL_AUDIT.md`.

**Verdict tally and judgment age.** Auditing the component before wiring it surfaced two
latent GP errors the corpus does not catch (the harness checked only the offenders mark).
`classify_verdict` accepted any mixed verdict with a minority of two or more as wonky; the
GP requires the positive tally to be exactly one of {⌊2|k|/3⌋+1, 0, ⌊|k|/3⌋} for the
judged key set k = K(a) (0.7.2 wrote V; tiny 5/0/2, full 683/0/341), else
`bad_vote_split`. `get_validators` hardcoded age 0 → κ and age 2 → λ; the age is the
absolute epoch index and must be compared with e = ⌊τ/E⌋. Verified by decoding all 60
disputes vectors into a truth table. Rule: ch. 10 eq. verdicts and the K(a) key-set
selection. Source: lasair v1.4.3 (2026-06-28).

**F5: the disputes codec frozen at tiny.** `votes_per_verdict = 2V/3 + 1` and
`bitfield_bytes = (C + 7)/8` were module-level values that called a spec accessor at
load time, so they froze at tiny (5 and 1) before `set_spec("full")` ran; a full verdict
carries 683 votes and the decoder read 5, leaving the offset ~45 KB short. Found by L2b
seed 3571347957 at step 6 as `Failure("decode: bad list count")`. Fix: make both
functions; harden the L0 lint to flag any module-level binding that calls a spec accessor.
Lesson: evaluation time is part of the spec. Source: lasair v1.4.2 (2026-06-27).

**Disputes first (0.8.0 migration).** Two 0.8.0 audits found lasair reading disputes from the
wrong side of the block. The first found verdict ages judged against the posterior τ', κ'
and λ'; the fourth sweep (three lenses independently) found the rest of validation still
reading the pre-disputes state. The GP judges a verdict against the prior state (its age
must be ⌊τ/E⌋ or one less, and K(a) picks κ or λ), and the dependency graph orders the
rest after it: ρ† comes from ρ and E_D, assurance bits are checked against ρ†, new
guarantees against ρ‡, Safrole's γ' reads ψ', and every Φ (guarantor keys, the epoch
mark's Φ(ι), the ticket ring) nulls the posterior offenders ψ'_O. Rule: ch. 10 K(a) and
eq. removenonpositive; ch. 4 eq. transitionfunctioncomposition; ch. 6 eq. blacklistfilter.
Fix: `import_block` runs disputes first and validates the post-disputes state. The same
sweep fixed more disputes rules no vector exercised, among them: H_o is the culprit keys
then the fault keys in extrinsic order (lasair compared sorted sets), culprits and faults
are each ordered by Ed25519 key alone, one key may be both a culprit and a fault, and each
list holds at most 16 (eq. disputesextrinsics). Lesson: the dependency graph is an ordering
contract. Source: `docs/GP_0_8_0_PLAN.md` ledger loops 6 and 8,
`docs/TINY_TO_FULL_AUDIT.md` fourth sweep.

## Ch. 11 Reporting and assurance

**F6: the core popularity that read only byte 0.** Core popularity in the C(13) cores
statistics was computed by reading byte 0 of the assurance bitfield and shifting by the
core index; correct at tiny (2 cores in byte 0), but at full a core's bit is byte c/8,
bit c mod 8, so every core ≥ 8 shifted an 8-bit value right by ≥ 8 and was always zero.
The reference counted real assurers (≥ 128 → a 2-byte compact), lasair wrote 0, the
cores section ran one byte short and the root diverged. Rule: ch. 11 assurances bitfield
(a bitstring of C bits, packed least significant first by App. C's bit-sequence encoding,
so core c is bit c mod 8 of byte ⌊c/8⌋) and ch. 13 core statistics. Found by L2b seed
3571347957 step 6, exposed once F5 was fixed. Fix: decode byte c/8 and bit c mod 8 at
both popularity sites, the pattern the availability check already used. Lesson: the same
bitfield was decoded two ways in one codebase. Source: lasair v1.4.2 (2026-06-27).

**F8 and F9: the supermajority as a literal.** The availability supermajority was
hardcoded as 5 (tiny) in two places, including the pending-report clearing pass; full
needs 683, so cores would have been marked available with 5 of 1 023 assurances and
accumulated prematurely. Rule: ch. 11 a report is available iff more than two thirds of
the prior active set κ assure it (eq. availableworkreports). Found by the proactive audit.
Fix: `validators_super_majority ()`. Source: lasair v1.4.2 (2026-06-27). *0.8.0 sequel:* validator
sets now have live sizes (eq. valcount), so the fixed accessor went stale in turn: the
threshold is ⌊2|κ|/3⌋+1 of the prior live set, and every availability assignment is
cleared when |κ| ≠ |κ'| (eq. availassignmentspostassurancesdef). lasair deleted the
spec-V helper for `supermajority_of |κ|` and added `rho_resize_test`, which fails without
the fix. Source: `docs/GP_0_8_0_PLAN.md` ledger loop 6.

**Guarantor assignments in the seed campaign.** Replaying the 205 fuzz-report seeds
through block import produced 210 failures after all STF families were green; a
block-validation campaign over assignments, markers, tickets, assurances, preimages and
rotation reduced them to 38. Rule: ch. 11 guarantor assignments and rotation. Source:
`docs/M1_PLAN.md` (2026-06-11 note).

## Ch. 12 Accumulation

**Dependency-layered accumulation.** The largest class left after the seed campaign: a
panicking accumulation layer must revert only itself, not the layers around it (no_forks
trace step 46 and about 22 seeds). Rule: ch. 12 execution, the sequential layering of
reports by dependency. Source: `docs/M1_PLAN.md`.

**B4: the validator set the manager could not set.** A `designate` set ι, but the invoker
was the manager, not the delegator χ_V, having blessed the delegator role to itself the
same block. The reference kept ι unchanged. Rule: App. B `designate` checks the invoker
against χ_V in its own context, but ch. 12 takes ι' only from the invocation of the
service that was χ_V when the round began; ch. 9 privileges (eq. privilegesspec). Found by
seed 2919757377 at step 17 593 after 5 888 clean imports. Fix: gate the ι writeback on the
round-start delegator, exactly as the auth-queue write is gated on the round-start
assigner. A first attempt that rejected inside the host call shifted gas and broke a
different key; the gate caught it. Lesson: enforce privilege at the writeback, never by
faking a failure in the host call. Source: Divergence Lab B4.

**B7: the eject you could do twice.** Service 0 ejected the same target twice; the first
succeeded and the caller inherited the balance, the second should have found nothing and
returned WHO but re-found the target via the pre-round snapshot and credited 173 551
again. Rule: App. B `eject`. Found by seed 2365413577 at step 11 794. Fix: record ejected
ids and exclude them from target resolution for the rest of the invocation. Lesson: a
snapshot is right for base state and wrong for the invocation's own deletions. Source:
Divergence Lab B7.

**B8: the role you cannot give yourself away.** The manager blessed the delegator role
(χ_V) to a service; that service, now delegator but not manager, blessed χ_V back to zero
and lasair applied it. The reference kept the delegator. Rule: App. B `bless`; ch. 9
privileges (per-core assigners may be moved by their holder, the singleton roles are the
manager's alone). In 0.8.0 text Ω_B itself answers HUH when the invoker is not the manager
(0.7.2 had no such check); lasair's ledger records that the 0.8.0 vectors follow the
GP#519 deviation instead (a non-manager may call `bless`), and lasair follows the vectors
behind one switch, `bless_refuses_non_manager`. Found by seed 3070419911 at step 20 674.
Fix: delegator and registrar writebacks need the manager; only the assigner keeps
manager-or-holder. Lesson: read the ownership rule per field. Source: Divergence Lab B8.

## Ch. 13 Statistics

**F2: the ring sized for tiny.** The ready-queue C(14) ring count and the accumulation
history C(15) length were hardcoded to 12; they are E, so at full lasair wrote 12-slot
sections instead of 600. Rule: ch. 12 ω and ξ are sequences of length E (eq. readyspec,
eq. accumulatedspec). Found by L2b at step 2 with F1. Fix: read `epoch_length ()`. Source:
lasair v1.4.1 (2026-06-26).

**F3 (trace path) and the 288 offset.** The statistics dump sliced the cores section at
offset 288 = 2 × V × 24 for V = 6; at full it started at 49 104 (0.7.2 layout; 0.8.0
length-prefixes both validator lists, so 290 and 49 108, see the callout). Found by the
third audit sweep, off the live path but reachable by full-config JSON trace vectors. Fix:
the section size from the active spec. Source: lasair v1.4.3 (2026-06-29).

F5 and F6 above also land in C(13); see ch. 10 and ch. 11.

## App. A PVM

**B2: the host call that faulted too late.** A `read` host call got an out-of-range key
pointer for a service that did not exist. lasair resolved the missing service first,
returned NONE and let the invocation run on and yield; the reference reads the key from
memory first, the bad pointer faults, and the invocation panics with no yield. One
spurious yield cascaded into the output set, statistics and an account. Rule: App. B host
calls read and validate all input memory before any service logic; App. A page faults.
Found by seed 431662357 at step 595 after 211 clean imports. Fix: read and range-check
the key before resolving the service. Lesson: the order of "check the pointer" versus
"look up the service" is protocol-visible. Source: Divergence Lab B2. The 0.8.0 fourth
sweep found the same shape still live in `lookup`: an unreadable hash must panic before
"no such service" answers NONE (App. B Ω_L). Source: `docs/TINY_TO_FULL_AUDIT.md` fourth
sweep.

**The sbrk frontier.** After the seed campaign two seeds remained on PVM memory
accessibility versus polkavm at the `sbrk` frontier (the heap boundary after growth).
lasair's PVM is verified bit-identical against polkavm by a replay harness
(`tools/pvm-replay`) that diffs pc and registers, and `sbrk` semantics were confirmed
against polkavm source and turbojam's `machine.cpp` before being implemented independently
in OCaml. In 0.8.0 `sbrk` is removed and replaced by the `grow_heap` host call (host-call
id 1; every id from `fetch` on moved up by one). Source: `docs/M1_PLAN.md`,
`docs/DISCLOSURES.md`.

**The 137 KB copy.** Profiling overturned the plan's guess that Merklization was the cost:
root recompute was 0.2 ms, while every PVM step copied a 137 KB bitmask in `skip`. Fixing
it gave about 30×, all families sub-second per import. Source: `docs/M1_PLAN.md` Phase 5.

**The 4× gas bill (0.8.0 migration).** 0.8.0 charges gas per basic block, in full on
entry, from a pipeline cost model (App. A §Gas Cost Model, eq. gascostforblock), where
0.7.2 charged 1 per instruction; host calls are priced from a table (App. B). Re-measured
with jamswap's 0.8.0 toolchain (`tools/jam080/measure-gas.sh`): an in-PVM ed25519 verify
went from about 1.31M gas to 5 286 949, and a Groth16 verify costs 246 884 255. A
work-report's digests may claim at most G_A = 10M accumulation gas in total, so jamswap
moved every signature check into refine and accumulate only binds the signer key to state.
Lesson: gas constants shape application design; re-measure on every spec move. Source:
`docs/GP_0_8_0_PLAN.md` ledger loop 9.

## App. B Host calls

**B5: the checkpoint you could not afford.** A service with a tiny budget wrote a storage
value then called `checkpoint`, which ran it out of gas (gas 7, cost 10, result −3). On
out-of-gas an invocation reverts to its last checkpoint; lasair snapshotted inside the
failing call, capturing the write, so the revert kept it. The reference runs out of gas
before taking the snapshot. Rule: App. B `checkpoint` and the general host-call form: when
ϱ < g the call exits OOG with its effect unapplied, and an OOG accumulation keeps only its
last checkpoint y. Found by seed 1502007736 at step 6306. Fix: a checkpoint that cannot
afford its gas takes no snapshot; gas still goes negative so the PVM OOGs next step.
Lesson: a checkpoint you cannot pay for must not become the place you roll back to.
Source: Divergence Lab B5.

B2 (memory-fault order), B3/B6 (foreign reads), B4/B8 (privilege writebacks), B7
(eject) and B9 (`new`) are all host-call stories too; filed above under the state they
damaged.

## App. C and D Codec and trie

**F1, F4, F5, F7** are codec-width stories filed under ch. 3 and ch. 10. **F3** is a
state-layout offset story filed under ch. 6.

**The trilogy and the trailing bytes.** The mutation engine (14 classes over the socket)
found on its first run that trailing bytes after a block were silently accepted; fixed
with `require_consumed`. A two-hour soak then ran 271 320 checks over all eight families
with zero crashes, hangs or wrong accepts. Layered-commitment result: no keyless mutation
reaches the inner STF rules, because the seal signs the extrinsic hash. Source:
`docs/M1_PLAN.md` Phase 4.

## The corpus lesson

Read together, the three banked fuzz-lane reports told one story: across all seeds, the
only state that ever diverged was the accumulate service-execution output (C(16), the
C(3) and C(13) keys that Merklize over it, and service storage). Nothing diverged in
block import, guarantees, assurances, Safrole, validator sets, disputes or entropy; 211,
951 and 2 239 blocks imported clean before each stop. Three axes of one thing: existence
(B2, does the service yield at all), ordering (B1), value (B3). Source:
`docs/CONFORMANCE_RETROSPECTIVE.md` §6.

## How to tell one in 60 seconds

Four beats, in order:

1. **What diverged.** Name the state key and the shape of the difference (same length,
   different order; one byte short; a NONE where bytes were expected).
2. **Which rule.** Name the chapter and the equation or subsection, and say what it
   requires in one plain sentence.
3. **How I found it.** The oracle and the method: which lane or seed or vector, and the
   forensic step (decode expected versus got, find the first differing byte, trace the
   host call).
4. **What I learned.** The class, not the instance: total orders on sets, evaluation
   time of constants, snapshot versus own mutations, privilege at the writeback.

The honest framing, said once and plainly: *the AI wrote the fix; I ran the differential,
read the trace, and had to understand the rule to judge whether the fix was right.*

## Question bank

### Q1 ★ Tell the B1 story in 60 seconds.
<details><summary>Model answer</summary>

Two keys diverged at once on seed 1551410130: the accumulation output C(16) and recent
history C(3), same length, same entries, different order. θ' is laid out from a Graypaper
set of (service, hash) pairs, so its order is over the full tuple; we sorted by service only,
so a service that accumulated twice kept insertion order. β's belt commits to the Keccak
root of that sequence, so recent history and the state root followed. Found by the live
fuzzer after 951 clean imports, diagnosed as an ordering bug from the shape of the diff.
Fix: sort by the full tuple and route every set through one canonical encoder. Lesson:
every set that reaches the trie has a total order.

</details>

### Q2 ★ What is the "frozen at tiny" class, and name three instances.
<details><summary>Model answer</summary>

A width, offset or bound computed from a spec constant that was evaluated with the tiny
value and never re-evaluated at full. F5: `votes_per_verdict` and `bitfield_bytes` as
module-level values captured at load time. F3: γ_Z sliced at offset 2016 = 6 × 336. F2:
ready-queue ring and accumulation history sized 12 instead of E. F8/F9: supermajority
literal 5 instead of 683. F10/F11: ticket bounds 3 instead of K = 16 and N = 2 (0.7.2's
N; 0.8.0 derives the bound as ⌈2E/|γ_P'|⌉). The L0 lint now flags any module-level binding
that calls a spec accessor. GP 0.8.0 widened the class: validator-set sizes are live
(eq. valcount), so even a correct spec-V accessor is frozen; lasair moved to live sizes
(`supermajority_of |κ|`, offsets read from the length-prefixed blobs).

</details>

### Q3 Why was disputes a blind spot, and what three things had to be built?
<details><summary>Model answer</summary>

No trace vector and no fuzz seed in the corpus carried disputes, so the component STF
passed 56 vectors while the import path never called it. Three builds: serialize real
verdicts, culprits and faults in the extrinsic hash (it was hardcoded empty); a
`process_disputes` step that runs the STF, checks the header's offenders marker, writes
ψ' sorted and clears ρ cores whose report turned bad or wonky; and the block codec's
conversion of disputes into the trace block. Auditing the component first also fixed the
verdict tally rule and the epoch-relative judgment age. Under 0.8.0 that step must also
run first, against the prior state (see *Disputes first*).

</details>

### Q4 Which stories are about the difference between a snapshot and an invocation's own changes?
<details><summary>Model answer</summary>

B7 (a second eject re-found a service the same invocation had already deleted through the
pre-round snapshot) and B9 (a new service id was checked only against the overlay, not
against services already in state). Both fixes teach the same rule from opposite sides:
resolve against the snapshot for base state, but always ask what this execution has
already created or deleted.

</details>

### Q5 What did the γ_S fork on the mixed network teach about ticket proofs?
<details><summary>Model answer</summary>

A ring-VRF ticket proof is only valid against the η₂ and γ_Z it was made for, and those
are per branch and rotate at every epoch boundary. lasair verified proofs at pool time
against the best block's context and at import time against the extended branch's
posterior context, and built the ticket extrinsic without re-verifying. Stale or
cross-branch tickets then caused lasair to reject its own authored block with
`bad_ticket_proof`, burning the slot. The fix re-validates every candidate against the
authoring parent's posterior γ_Z' and η₂' and purges stale entries.

</details>

### Q6 What did the corpus analysis say the real risk was, and what does that imply for the question "which chapter was hardest"?
<details><summary>Model answer</summary>

Across all three banked lane reports the only divergences were in what a service
execution emits during accumulation: the output set, its statistics, and service
storage. Block import, guarantees, assurances, Safrole, disputes, validator sets and
entropy never diverged live. So the honest answer is that ch. 12 and App. B, the
accumulate host calls, were hardest, and that the big STF rules were not the risk once
the vectors passed. One 0.8.0 caveat: the useless-tickets split came from a Safrole
validity rule no official vector exercises, so the full answer is "accumulation for state
values, and unexercised validity rules for block acceptance".

</details>

### Q7 ★ Tell the useless-tickets story in 60 seconds.
<details><summary>Model answer</summary>

On the GP 0.8.0 mixed lasair + PolkaJam net the chain split at in-epoch slot 6–7 on every
run. The rule: the ticket accumulator γ_A' keeps only the E lowest ticket ids, and every
ticket in the extrinsic must survive into it, n ⊆ γ_A' (ch. 6 §The Extrinsic and Tickets).
Once γ_A is full, a ticket whose id is higher than every one held is useless and the block
is invalid. lasair's author kept including such tickets and its importer never checked, so
PolkaJam, correctly, refused lasair's blocks. Found by running a PolkaJam follower on an
all-lasair chain: it stopped at the first block after γ_A saturated. Fix: one shared
`Ticket_rules` module for importer and author, with a saturated-accumulator test that fails
without it. Lesson: no official vector exercises that rejection, so passing every vector
did not prove it; it prompted the fourth audit sweep of rules no vector covers.

</details>

### Q8 Which of the older stories read differently under GP 0.8.0?
<details><summary>Model answer</summary>

The width stories, mostly. F3: validator sets now have live sizes (eq. valcount) and are
length-prefixed in state, so γ_Z sits at 343 730 at full, not 1 023 × 336, and the C(13)
cores section starts at 49 108, not 49 104. F5 and the verdict tally: a verdict's
judgments are length-prefixed and must number ⌊2|k|/3⌋+1, with thresholds taken over
the judged set, k = K(a), instead of V. F8/F9: availability is more than two thirds of the
prior |κ|, and assignments clear when |κ| ≠ |κ'|. F10/F11: N is gone and the entry bound
is ⌈2E/|γ_P'|⌉.
B5: `checkpoint` costs M_C = 103 at id 18 (was 10 at id 17), though the rule it teaches is
unchanged. B8: `bless` from a non-manager answers HUH in the 0.8.0 text. The pattern:
0.8.0 turned V from a constant into a live size, which turned fixed widths into length
prefixes and fixed thresholds into live ones.

</details>
