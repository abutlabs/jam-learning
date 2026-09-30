---
title: "Ch. 7 Recent History"
duration: 25 min
exam_portion: random
exam_bucket: small
gp_chapter: 7
gp_words: 323
gp_tex: text/recent_history.tex
lasair: lib/recent_history.ml, conformance/history_stf.ml, conformance/stf_transitions.ml (recent_history_core), conformance/stf_encoding.ml (C(3) codec)
---

# Ch. 7 Recent History

<span class="lecture-badge">M1 Understanding · Graypaper ch. 7</span>

The shortest chapter in the pool and one of the likeliest small draws. It defines β: the
last eight blocks' header hashes, state roots, accumulation-log peaks, slots and reported
packages, plus the Merkle-mountain-belt of accumulation outputs. Its job is to let report
validation reject duplicate or stale work and to give bridges a compact commitment to
everything JAM has accumulated.

## Examiner sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| β = (β_H, β_B) | recent | β_H: up to 8 entries; β_B: the accumulation-output belt (MMB peaks) |
| β_H[i] | entry | header hash **h**, state root **s**, accumulation-log super-peak **b**, timeslot **t** (new in 0.8.0), reported packages **p**: dictionary package-hash → segment-root, at most 341 |
| θ | last accumulation output | read here: this block's (service, hash) outputs feed β_B' |

### Inputs
The header (H_R for the correction, H_T and the header hash for the new entry), the
guarantees extrinsic E_G (package hashes and segment roots), and θ' from accumulation.

### The transition in plain English
1. **Correct the parent.** The last entry's state root was written as zero when the parent
   was imported, because the parent's posterior root was not known yet. Now the header's
   prior-state-root H_R *is* that root, so β† overwrites it. (eq. correctlaststateroot)
2. **Extend the belt.** Take this block's accumulation outputs θ', encode each as
   E₄(service) ++ E(hash), Merklize that sequence with the well-balanced binary
   Merklizer using **Keccak**, and append the root to the belt β_B with the MMB append
   function, again with Keccak. (eq. accoutbeltdef)
3. **Append this block.** Add an entry: Blake2b of this header, state root zero, the
   super-peak of β_B', H_T, and the dictionary of package hash → exports segment root for
   every guarantee in E_G. Keep only the last 8. (eq. recenthistorydef)

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| β_H holds at most **H** = 8 entries (tex macro `\Crecenthistorylen`) | unbounded state; the window is the duplicate-detection horizon |
| The state root written for the new block is the zero hash | nothing; it is "inaccurate but safe" because only β† of the next block reads it, and β† corrects it |
| Keccak, not Blake2b, for the belt and its leaves | none in-protocol; it is for compatibility with legacy (Ethereum-style) bridge verifiers |
| p is a dictionary (one segment root per package hash) | two exports roots for one package (a lookup by package hash yields one root); rejecting a block that reports one package twice is ch. 11's job: "There must be no duplicate work-package hashes", i.e. as many distinct package hashes as reports in I |

The rules that *use* β live in ch. 11 (Contextual Validity of Reports): a report's anchor
must match some entry of β† (the parent-corrected history) on header hash, state root,
belt super-peak and, new in 0.8.0, timeslot; its package hash must not appear in any
recent p (nor in ξ, the ready queue ω or the availability assignments ρ); and its
prerequisites and segment-root lookup must resolve in this block's guarantees or a
recent p.

### Edge cases
- **Genesis.** The GP does not define β⁰ separately: it is part of the agreed genesis
  state σ⁰ (ch. 4). lasair's learning-era `init_with_genesis` seeds one genesis entry
  and an empty β_B; the import path takes β from whatever genesis state it is given.
- **Empty block.** Entry still appended with p = {}; belt still appended with the root of
  an empty output sequence.
- **Fewer than 8 blocks.** No trimming; β† still applies to the last entry.
- **Fork.** Each branch carries its own β; a report anchored on the other branch fails
  the anchor check.

### War story
<div class="lasair-connection">

**B1: the accumulation-output set, sorted wrong.** Live fuzzer seed 1551410130 diverged
at step 2854 on two state keys at once: C(16), the accumulation output θ, and C(3),
recent history β. Same length, same entries, different order: the signature of an
ordering bug. θ′ is a sequence built from a Graypaper *set* b of (service id, hash)
pairs (θ′ ≡ [(s, h) ∈ b], ch. 12 Final State Integration); lasair sorted it by
service id alone, so when one service accumulated twice in a block the two pairs kept
insertion order while the reference sorted by the full tuple. Because β's belt commits to
the Keccak root of that sequence, the error cascaded into recent history and from there
into the state root. Fix: sort by (service id, hash) and route every set through one
canonical encoder. Lesson: β is 323 words of Graypaper, but every block's root depends on
it, and every set that reaches the trie has a total order. Recorded in the Divergence Lab
(`divergences.html`, B1) and `docs/CONFORMANCE_RETROSPECTIVE.md` §6.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- Each recent-history entry gained a **timeslot** field **t** (= H_T). The state tuple
  order is (h, s, b, t, p) in ch. 7, but note the **serialization** order in App. D's
  C(3) is (h, b, s, E₄(t), p): super-peak before state root. The history STF input
  carries the block slot. (GP PR #526, the same PR that added the anchor slot to the
  refine context.)
- The field's consumer is ch. 11's anchor check, which now also requires the refine
  context's anchor slot **n** to equal the matching β† entry's **t**. The same PR gave
  the lookup-anchor a posterior state root **r**, which is checked against ancestor
  headers, not against β (see Q6).
- Wording only: the guarantee field macro was renamed; semantics unchanged.

</div>

### Source pointers
- `lib/recent_history.ml` — `correct_parent_state_root`, `append_block`, `is_package_reported`
- `conformance/history_stf.ml` — `apply_history_stf`, `mmr_append`, `mmr_superpeak`
- `conformance/stf_transitions.ml` — `recent_history_core`, `update_history`: the import
  path, carrying the 0.8.0 slot; `conformance/stf_encoding.ml` — `parse_beta`,
  `serialize_beta` (C(3), E₄(t) after s); `bin/l4_history_check.ml` drives that path from
  the official vectors. (`lib/recent_history.ml` is a learning-era model with no t.)
- `docs/notes/recent_history.md`; lecture `011-graypaper-lectures/30-recent-history`

## Question bank

### Q1 ★ What does β store per entry, how many entries, and why does it exist? Name two consumers.
<details><summary>Model answer</summary>

Per entry: the block's header hash, its (corrected) state root, the super-peak of the
accumulation-output belt, its timeslot, and a dictionary of every work-package hash
reported in the block mapped to that package's exports segment root. At most H = 8 entries.
It exists so that report validation can reject duplicates and stale work: ch. 11 checks a
report's anchor header hash, state root, belt peak and (0.8.0) anchor slot against β†,
and rejects a package hash already present in any recent entry. A second consumer is the
segment-root lookup: when a work-item imports segments by naming the exporting package,
the guarantor reports that package's exports root, and ch. 11 checks it against the roots
stored in β (or in this block's guarantees). Bridges consume the belt: under BEEFY each
validator, for every finalized block it imports, BLS-signs `$jam_beefy` ++ the newest
entry's super-peak (eq. accoutsignedcommitment).

</details>

### Q2 ★ Explain the deferred state root pattern.
<details><summary>Model answer</summary>

When block N is imported its posterior root is not yet in any header, so β_H's new entry
is written with state root zero. Block N+1's header carries H_R, the root of the state
it was built on, which is exactly N's posterior. So the first step of importing N+1 is
β†: overwrite the last entry's root with H_R. The Graypaper calls the zero "inaccurate but
safe" because nothing reads β_H's last root except this correction. It follows from the
header carrying the prior root (ch. 5), which exists for pipelining.

</details>

### Q3 What is the accumulation-output belt and how is it built?
<details><summary>Model answer</summary>

β_B is a Merkle mountain belt (a list of optional peaks) of per-block commitments to
accumulation outputs. Each block: take θ', the sequence of (service id, output hash)
pairs produced by accumulation; encode each as a 4-byte service id followed by the hash;
Merklize the sequence with the well-balanced binary Merklizer under Keccak; append that
root to the belt with the MMB append under Keccak. The super-peak of the new belt is
stored in the new β_H entry. Keccak is used throughout "to maximize compatibility with
legacy systems" (GP wording; the GP names no system). The usual reading is Ethereum-style
bridge verifiers, where Keccak-256 is a native EVM opcode; BEEFY's stated audience is
"third-party systems".

</details>

### Q4 How are the reported package hashes in β used during report validation?
<details><summary>Model answer</summary>

Two ways. First, duplicate rejection: a guarantee whose package hash appears in any of
the 8 recent entries' dictionaries is invalid, and the same block may not report a
package twice. The same rule also looks in ξ (packages accumulated over the last E
slots), the ready queue ω and the cores' availability assignments ρ; together these give JAM
its duplicate protection without a global nonce. Second, dependency resolution: a
work-item may import segments by naming the exporting *package hash*; the guarantor
converts that to the package's exports segment root and reports the pair in the
work-report's segment-root lookup **l**. On chain, **l** must be a subset of this block's
(package hash → segment root) pairs plus every recent p: key *and* value must match.
Prerequisite package hashes must likewise be in the extrinsic or in a recent p, and
|l| + |prerequisites| ≤ J = 8 (eq. limitreportdeps).
lasair checked only the keys of **l** until the 2026-09-24 pre-release audit
(`docs/TINY_TO_FULL_AUDIT.md`, 4th sweep).

</details>

### Q5 What does the new 0.8.0 timeslot field enable?
<details><summary>Model answer</summary>

Each entry now records the slot t = H_T of the block it describes
(eq. recenthistorydef). Its consumer is ch. 11's anchor check: the 0.8.0 refinement
context carries an anchor slot **n**, and the anchor must match a β† entry on header
hash, state root, super-peak *and* n = t (the reports vectors call a mismatch
`bad-anchor-slot`). Anchor recency itself is unchanged: the anchor was, and is, one of
the last H = 8 blocks. What the slot buys: GP PR #526 exposes the anchor slot (and the
lookup-anchor's posterior state root **r**) in the context so that Is-Authorized and
Refine can read them (`fetch` with selector 10 returns the encoded context), and the
on-chain check makes the anchor slot a verified value, not just the guarantor's claim.
In the trie, t is serialized as E₄(t) after the state root (C(3)). lasair's 0.8.0
migration (`docs/GP_0_8_0_PLAN.md`, Phase 1) adds the field to the codec and to the
history STF input.

</details>

### Q6 A report names an anchor and a lookup-anchor. Which is checked against β, why not the other, and how does 0.8.0 verify each one's slot and posterior state root?
<details><summary>Model answer</summary>

The **anchor** must be one of the last H = 8 blocks, so everything about it is in state:
some entry of β† must match its header hash, posterior state root, belt super-peak and
(0.8.0) slot. It is β†, not β, because the parent's entry holds the zero root until it is
corrected; against β, a report anchored on the parent could never match.

The **lookup-anchor** fixes the timeslot at which historical lookups are resolved: the
authorizer code, the service code and Refine's `historical_lookup` host call. It may be up to L = 14,400 slots (24 hours) old
(eq. limitlookupanchorage), far outside β's 8-block window. The GP calls this "one of the
few conditions which cannot be checked purely with on-chain state": the node checks it
against the ancestor headers A it keeps (eq. ancestors; A includes the importing block's
own header). 0.8.0 adds the lookup-anchor's posterior state root **r** and verifies it
with the same idea as β†: there must be ancestors h and h′ with h's slot = the context's
lookup-anchor slot, Blake2b(h) = the lookup-anchor hash, h′ a child of h, and h′'s prior
state root H_R = r. A block's posterior root first appears in its child's header. lasair
lacked the slot + child-root match, and used a 24-slot window even at full, until the
2026-09-24 pre-release audit (`docs/TINY_TO_FULL_AUDIT.md`, 4th sweep).

</details>
