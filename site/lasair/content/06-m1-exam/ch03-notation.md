---
title: "Ch. 3 Notational Conventions"
duration: 45 min
exam_portion: random
exam_bucket: large
gp_chapter: 3
gp_words: 2901
gp_tex: text/notation.tex
lasair: lib/notation.ml, lib/definitions.ml, lib/spec.ml, lib/serialization.ml, lib/utilities.ml
---

# Ch. 3 Notational Conventions

<span class="lecture-badge">M1 Understanding · Graypaper ch. 3</span>

Notation is a large chapter by word count but it holds no state and no transition. What
it gives you is the ability to *read* the Graypaper fluently: pick any equation from a
later chapter and say what it means. Treat it as a reading skill, not a memory test. Every convention below maps to a concrete OCaml type or function in
lasair, and the codec details are where implementations actually diverge.

## Examiner sheet

### Typography (§3.1)
| Face | Meaning | Example |
|---|---|---|
| lower-case roman | local value or index | x, i |
| capital roman | local Boolean or function | A, F(c) |
| bold | complex sequence or set | **s**, **a** |
| blackboard | a set that lasts the whole paper | ℕ, ℍ, 𝔹 |
| calligraphic | imported function, not defined here | ℋ Blake2b, ℋ_K Keccak (the rule is loose: the paper's own codec ℰ and helpers 𝒰, 𝒦, 𝒱 are calligraphic too) |
| upper Greek | function introduced by the paper | Υ transition, Ψ PVM |
| lower Greek | value with consistent meaning throughout | σ, κ, τ |

### Functions and operators (§3.2)
- **Precedes** y ≺ x: y can be defined purely from x. The whole dependency graph of
  ch. 4 is written in this relation.
- **Substitute-if-nothing** 𝒰(a₀, …, aₙ): first argument that is not ∅, or ∅ if there is
  none (eq:substituteifnothing).

### Sets (§3.3)
- Power set written {[s]} (a brace fused with a square bracket; the paper does not use ℘),
  cardinality |s|; a numeric subscript {[s]}ₙ restricts to subsets of cardinality n.
- Scalar ops distribute over sets; f^#(s) maps a function over a set (or sequence).
- ∅ is "validly no value", cardinality zero; A? ≡ A ∪ {∅} is the optional.
- ∇ (error) marks an invalid or unexpected value, kept distinct from Boolean ⊥.
- Disjointness A ⫗ B ⇔ A ∩ B = ∅.

### Numbers (§3.4)
- ℕ includes zero; ℕₙ is naturals below n; ℕ₂ⁿ shorthand for widths, e.g. ℕ₂³² for a
  slot, ℕ₂⁶⁴ for a balance or gas.
- ℤ_{a…b} is the half-open interval [a, b); ℤ_{a…+b} is offset/length form.
- ℕ_L is the set of blob lengths, equal to ℕ₂³².
- `mod` is remainder; a ÷ b = q **R** r writes quotient and remainder.

### Dictionaries (§3.5)
- ⟨K→V⟩, written with barred angle brackets and no letter (𝔻 is the set of work-digests),
  is a set of key→value pairs with at most one value per key.
- d[k] is the value or ∅; **subscripting a missing key is undefined and any block that
  relies on it is invalid**. d ∖ s removes keys in s. 𝒦(d) keys, 𝒱(d) values (a set,
  so duplicates collapse).
- Union ∪ prefers the **right** operand on collision.

### Tuples (§3.6)
- Written (a, b); named components t_a, t_b. The state σ, the header H and every
  work-report are tuples with named fields, which is why the paper can write H_T or
  (g_r)_a, the authorizer hash of a guarantee's work-report (authorization.tex).

### Sequences (§3.7)
- ⟦T⟧ any length; ⟦T⟧ₙ exactly n; ⟦T⟧_{:n} at most n; ⟦T⟧_{n:} at least n; **new in
  0.8.0**: ⟦T⟧_N, length in the set N (GP #514). Validator key sequences are ⟦𝕂⟧_𝕍
  (eq:validatorkeys).
- s[i] or sᵢ; ranges s_{…2} = first two, s_{1…+2} = two from index 1.
- Cyclic subscription is written with a ↺ superscript: s[i]^↺ ≡ s[i mod |s|] (used for the
  80-slot authorizer queue φ'[c][H_T]^↺ and the slot-sealer lookup γ_S'[H_T]^↺). last(s) is
  the final element.
- **Construction**: [f(i) | i ⟸ ℕₙ] ordered comprehension; ⟸ means "in order",
  ∈ means unordered. Order-by is written [i ∈ X ⦚ f(i)], a wavy vertical bar before the
  sort key, and sorts ascending by f; a doubled wavy bar is the unique variant, which drops
  duplicates. With the key elided, [i ∈ X] sorts by the elements themselves.
- **Editing**: ⌢ concatenation; an arc drawn over a sequence of sequences (x͡) is
  concatenate-all; ⧺ append one element; overright arrow s→ⁿ first n, overleft arrow ←sⁿ
  last n (this is the "keep the newest 8" in recent history and the pool); ᵀx transpose;
  s ∖ₗ {v} remove the **leftmost** v.
- Sequences of ordered elements compare lexicographically.
- **Booleans**: {⊥, ⊤} with ⊤=1, ⊥=0; bitstrings 𝕓_s = ⟦{⊥, ⊤}⟧_s; bits(blob)
  most-significant-bit first: bits([160, 0]) = [1,0,1,0,0,…]. Unary ¬ applies elementwise.
  (Availability bitfields are 𝕓_C, but the codec packs a bitstring least-significant bit
  first, the opposite of bits(); Appendix C.)
- **Blobs**: 𝔹 octet strings; 𝔹ₓ of length x; 𝔹_$ ASCII. (𝕐 is not a blob: it is the set
  of availability specifications.) An octet serializes to itself; a natural may serialize
  to several octets, which is *the* codec pitfall.
- **Shuffle** ℱ (calligraphic; blackboard 𝔽 is the finite fields): Fisher–Yates driven by
  a hash or a sequence of naturals, fully defined in Appendix (Shuffling); used for
  guarantor core assignment.

### Cryptography (§3.8)
- ℍ is 𝔹₃₂; **ℋ** is Blake2b-256, **ℋ_K** Keccak-256; ℍ₀ = [0]₃₂ the zero hash.
- ℰ encodes, ℰ₄(x) asserts x ∈ ℕ₂³² and yields 4 octets; ℰ⁻¹₈(y) decodes 8 octets to
  ℕ₂⁶⁴. Hash inputs are always the encoding of the value.
- Ed25519: signatures 𝕍̄_k⟨m⟩ ⊂ 𝔹₆₄, key set ℍ̄ ⊂ 𝔹₃₂. Used for guarantees, assurances,
  judgments, culprits and faults. (The accented 𝕍 means "valid"; plain 𝕍 is the set of
  validator-set sizes, eq:valcount.)
- Bandersnatch: keys ℍ̃ ⊂ 𝔹₃₂; VRF signature 𝕍̃_k^m⟨x⟩ ⊂ 𝔹₉₆ with context x and message m.
  Read it carefully: the **message is the superscript** and the **context sits in the angle
  brackets**, e.g. the seal H_S ∈ 𝕍̃_{H_A}^{ℰ_U(H)}⟨X_T ⌢ η'_3 ⧺ i_e⟩. Ring VRF proof
  𝕍̊_r^m⟨x⟩ ⊂ 𝔹₇₈₄ under a ring root r ∈ 𝔹̊ ⊂ 𝔹₁₄₄; 𝒪 root of a key sequence.
  Both yield a VRF **output** 𝒴, a hash that depends on x but not m: that is what makes
  tickets and entropy unbiasable by the message.
- BLS12-381: keys are 𝔹 with "BLS" set above the letter (a subset of 𝔹₁₄₄), signatures are
  𝕍_k⟨m⟩ with the same BLS accent; Beefy only (not M1).

### Constants worth knowing (Definitions appendix; lasair `lib/spec.ml`)
| Constant | full | tiny |
|---|---|---|
| validators (no longer a constant in 0.8.0: every validator key sequence has a length in 𝕍 = {3c : c ∈ ℕ_{2…C+1}}, a multiple of 3 from 6 to 3C, eq:valcount; 0.7.2 had V = 1023) | 1023 (= 3C, the largest size) | 6 (with C = 2, 𝕍 = {6}) |
| cores C (0.8.0: still fixed, but only the first (size of κ')/3 are active, sec:coresandvalidators) | 341 | 2 |
| epoch length E (slots) | 600 | 12 |
| slot period P (s) | 6 | 6 |
| slot in the epoch at which ticket submission ends (epoch-tail start) Y | 500 | 10 |
| guarantor rotation period R | 10 | 4 |
| ticket entries per validator (0.8.0: derived, n = ⌈2E / size of γ_P'⌉, eq:ticketsextrinsic, GP #514; #527 removed the last reference to the old constant N = 2) | 2 | 4 (the 0.8.0 formula, which lasair's importer uses; the 0.7.2 tiny parameter was 3) |
| max tickets per extrinsic K | 16 | 3 |
| max verdicts N_V / max culprits and max faults N_O per extrinsic (new in 0.8.0, eq:disputesextrinsics, GP #525) | 16 / 16 | 16 / 16 (lasair treats both as spec-independent) |
| authorizer pool O / queue Q | 8 / 80 | 8 / 80 |
| recent history H | 8 | 8 |
| lookup anchorage L (slots) | 14 400 | 24 |
| preimage expunge period D | 19 200 | 32 |
| erasure pieces per segment / piece size in octets (not constants in 0.8.0: piece size is 2𝒟(v), where 𝒟(v) is the largest d < v/3 + 2 with 4104 divisible by 2d, eq:ecoriginalshards; coding rate 𝒟(v):v) | 6 / 684 (𝒟 = 342) | 684 / 6 (𝒟 = 3; 0.7.2 tiny was 1026 / 4) |
| block accumulation gas G_T | 3.5 × 10⁹ | 2 × 10⁷ |
| refine gas G_R | 5 × 10⁹ | 10⁹ |

In 0.8.0 the validator count and the vote count are **no longer codec widths**: validator
sequences and verdict votes are length-prefixed (GP #514), which is the change that
retired lasair's "V is a constant width" assumption. The new ⟦T⟧_N notation types the key
sequences, ι, κ, λ, γ_P ∈ ⟦𝕂⟧_𝕍. The validator statistics and each verdict's judgments are
plain ⟦…⟧ whose length is pinned by a side condition instead (|π_V| = |κ|, |π_L| = |λ|;
⌊2|k|/3⌋ + 1 judgments).

### War story
<div class="lasair-connection">

**F4 and F5: the constant that was a codec width.** Two of the six tiny→full audit bugs
were pure notation. F4: γ_A (`gamma_a` in the test vectors), the ticket accumulator, is a
⟦𝕋⟧_{:E} sequence whose length is encoded as a *compact* natural, and lasair wrote it as a single octet, which is
identical for E = 12 and wrong for E = 600. F5: `votes_per_verdict` and the assurance
bitfield byte count were module-level *values* computed from the tiny V and C at link
time (⌊2V/3⌋+1 votes, ⌈C/8⌉ bitfield octets), so they were frozen at 6 validators and 2
cores when the process switched to full. Both are
"an octet serializes to itself, a natural may take several octets" in disguise.
Recorded in `docs/TINY_TO_FULL_AUDIT.md`; the L0 lint `audit-tiny-constants.sh` now
fails any width that is not a function of the active spec.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **One new notation**: ⟦T⟧_N, a sequence whose length lies in the set N (§3.7, GP #514).
  It exists so the validator count can stop being a constant: 𝕍 ≡ {3c : c ∈ ℕ_{2…C+1}}
  (eq:valcount) and ι, κ, λ, γ_P ∈ ⟦𝕂⟧_𝕍 (eq:validatorkeys); the epoch mark's keys are
  ⟦(ℍ̃, ℍ̄)⟧_𝕍. The Definitions appendix drops V = 1023, N = 2, W_E and W_P and adds
  N_V = N_O = 16 to bound the disputes extrinsic (GP #525).
- Wording and typing fixes in the chapter itself: the Ed25519 set is written 𝕍̄_k⟨m ∈ 𝔹⟩;
  Bandersnatch signatures are called VRF signatures; the ring root 𝒪 is described as
  specific to a *sequence* of keys (was "set"); the VRF output is typed 𝒴(…) ∈ ℍ (was
  ⊂ ℍ); the decoder example is ℰ⁻¹₈(y ∈ 𝔹).
- The codec consequence, length prefixes on validator data and verdict votes, lives in
  Appendix C and the state serialization, not in this chapter.

</div>

### Source pointers
- `lib/notation.ml` — the type vocabulary (sequences, dictionaries, optionals) with tests
- `lib/definitions.ml` (full-only compile-time table) and `lib/spec.ml` (runtime tiny/full)
- `lib/serialization.ml` — ℰ, compact naturals, fixed-width ℰₙ, length-prefixed sequences
- `lib/utilities.ml` — Blake2b, Keccak, Fisher–Yates shuffle
- `docs/notes/notation.md`, `docs/notes/definitions.md`; lectures `011-graypaper-lectures/08…15`

## Question bank

### Q1 ★ How does the Graypaper denote sequences, sets, dictionaries, optionals and tuples? Give lasair's OCaml type for each.
<details><summary>Model answer</summary>

Sequences ⟦T⟧ with optional length subscripts (exactly n, at most n, at least n, or a
length in a set N): OCaml `T list` or `T array`, with the length constraint enforced by
the codec. Sets {…}: OCaml `Set` modules or sorted lists, and every set that reaches the
trie has a total order (lesson B1). Dictionaries ⟨K→V⟩ (barred angle brackets): `Map` or
an association list keyed uniquely. Optionals A? = A ∪ {∅}: `T option` with `None` for ∅.
Tuples with named fields: OCaml records; the paper's t_a is `t.a`. Blobs 𝔹 are `bytes`; a
hash ℍ is `bytes` of length 32.

</details>

### Q2 What do the subscripts on a sequence mean, and what does ℤ_{a…+b} mean?
<details><summary>Model answer</summary>

⟦T⟧ₙ exactly n elements; ⟦T⟧_{:n} at most n; ⟦T⟧_{n:} at least n; ⟦T⟧_N length in the set
N (added in 0.8.0 so validator sequences can be ⟦𝕂⟧_𝕍). s_{…n} is the first n elements;
s_{i…+n} is n elements starting at i. ℤ_{a…b} is the integers in [a, b) and ℤ_{a…+b} is
the same in offset/length form, [a, a+b). Cyclic subscription s[i]^↺ wraps by the length.
The over-arrows take the first or last n.

</details>

### Q3 Which hash is the default, when is Keccak used, and why?
<details><summary>Model answer</summary>

Blake2b-256 (ℋ) everywhere by default: header hashes, extrinsic hash, state keys,
package hashes. Keccak-256 (ℋ_K) is used for the accumulation-output belt in recent
history and in Beefy, explicitly "to maximize compatibility with legacy systems": an
Ethereum contract can verify a Keccak Merkle proof with a cheap precompile, so JAM's
bridge commitments are Keccak-rooted.

</details>

### Q4 ★ What do ℰ and its length-prefixed variant do, and what is the compact integer encoding pitfall?
<details><summary>Model answer</summary>

ℰ is the serialization codec of Appendix C. ℰₙ(x) is the fixed n-octet little-endian
encoding and asserts x < 2^(8n). Plain ℰ of a natural is the *compact* encoding: one
octet for values below 128, otherwise a prefix octet whose leading ones give the length
followed by the remaining octets. A sequence of unknown length is encoded with its
length as a compact natural prefix; a sequence of known fixed length has no prefix. The
pitfall is assuming a length is one octet because it is small in the tiny spec: lasair's
F4 bug wrote the ticket accumulator's length as a single byte, correct for 12 and wrong
for 600.

</details>

### Q5 What do the bold-letter sets denote versus the italic Greek state components?
<details><summary>Model answer</summary>

Bold roman letters mark values that are sophisticated or multidimensional in a local
context, typically a sequence or set being built inside one equation (like **a** in the
extrinsic hash or **s** in the belt). Lower-case Greek (σ, α, β, …) are values with a
consistent meaning throughout the whole paper: the state components. Blackboard letters
are sets that last the whole paper (ℕ, ℍ, 𝔹). Reading rule: Greek is "the thing", bold
is "this intermediate".

</details>

### Q6 How are Bandersnatch, Ed25519 and BLS keys and signatures denoted, and which does M1 use?
<details><summary>Model answer</summary>

Ed25519: public keys ℍ̄ (32 bytes), signatures 𝕍̄_k⟨m⟩ of 64 bytes; used by guarantees,
assurances, dispute judgments, culprits and faults. Bandersnatch: public keys ℍ̃, a
singly-contextualized VRF signature 𝕍̃_k^m⟨x⟩ of 96 bytes (seal, entropy) and an
anonymous Ring VRF proof 𝕍̊_r^m⟨x⟩ of 784 bytes under a 144-byte ring root (tickets). In
both, the message m is the superscript and the context x sits in the angle brackets. Both
give a VRF output 𝒴 that depends on the context x but not the message m. BLS12-381 keys
(144 bytes) sign Beefy commitments, which is outside M1. lasair implements Ed25519 via the
`ed25519-consensus` crate (ZIP-215 verification rules) and Bandersnatch via ark-vrf, both
over FFI (`lib/ed25519_ffi/`, `lib/bandersnatch_ffi/`).

</details>

### Q7 What is the notation for posterior and intermediate values, and where is it easy to confuse them?
<details><summary>Model answer</summary>

A prime marks the posterior value after the whole block: κ', ρ'. A dagger (†) and
double dagger (‡) mark named intermediates consumed by more than one later step: β_H†,
ρ†, ρ‡, δ‡. A superscript star marks a derived value such as **R**\*, the sequence of
accumulatable work-reports. The confusion points: ρ' depends on ρ‡ which depends on ρ†
which depends on ρ, each with a different extrinsic applied: ρ† after disputes, ρ‡ after assurances, ρ' after
guarantees (eq:rhodagger, eq:rhoddagger, eq:rhoprime). The 0.7.2 notation index called ρ‡
"post-guarantees"; 0.8.0 corrects that and renames ρ the availability assignments, each
entry now holding the whole guarantee (GP #494). And accumulation reads δ but preimage
integration reads δ‡ (eq:accountspostxfer, eq:accountspostpreimage). Read the dependency
graph in ch. 4 with the daggers as explicit variable names, which is how lasair's
`lib/overview.ml` lays it out and how `conformance/stf_guarantees.ml` names ρ† and ρ‡.

</details>

### Q8 ★ Give the tiny versus full constants, and say which ones stopped being codec widths in 0.8.0 and why that mattered.
<details><summary>Model answer</summary>

Validators 6 / 1023 (in 0.8.0 not a constant but a size in 𝕍: 6 is the only size 𝕍 allows
with C = 2, and 1023 = 3C is the largest at full), cores 2 / 341, epoch 12 / 600 slots,
slot 6 s both, tail start 10 / 500, rotation 4 / 10, ticket entries per validator 4 / 2
(0.8.0 derives it as ⌈2E/|γ_P'|⌉; the 0.7.2 constant was N = 2, with tiny parameter 3),
tickets per extrinsic 3 / 16, pool 8 and queue 80 both, recent history 8 both, lookup
anchorage 24 / 14 400, expunge 32 / 19 200, erasure pieces per segment × piece octets
684×6 / 6×684 in 0.8.0 (derived from the validator count by eq:ecoriginalshards; tiny was
1026×4 under 0.7.2), block accumulation gas 2×10⁷ / 3.5×10⁹, and the new disputes bounds
N_V = N_O = 16. In 0.8.0 validator sequences (validator data, statistics, epoch-mark keys)
and verdict votes became length-prefixed sequences instead of fixed-V arrays (GP #514); the
key sequences are typed with the new ⟦T⟧_𝕍 form, the statistics and judgments by a length
side condition. That matters because lasair's L0 lint had treated V as a codec width; the
audit that found F5 and F6 (constants frozen at tiny) was built on exactly that
assumption, and the 0.8.0 migration retires it.

</details>

### Q9 What does the substitute-if-nothing function do and where is it used?
<details><summary>Model answer</summary>

𝒰(a₀, …, aₙ) returns the first argument that is not ∅, or ∅ if all are
(eq:substituteifnothing). It expresses "use this value if present, else fall back" without
a case expression, in practice a dictionary lookup with a default. The paper uses it
twice: in single-service accumulation the service's free gas is 𝒰(f_s, 0), zero unless s
is in f, the dictionary of services enjoying free accumulation (eq:accone); and in the
service statistics the accumulation entry is 𝒰(**S**[s], (0, 0, 0)), a triple in 0.8.0
(work-items accumulated, transfers processed, gas used; eq:accumulationstatisticsdef)
because the transfer count came back (GP #502; 0.7.2 had (0, 0)). Examples from the text: 𝒰(∅, 1, ∅, 2) = 1 and 𝒰(∅, ∅) = ∅.

</details>

### Q10 Explain the ordered-comprehension and order-by notations with an example.
<details><summary>Model answer</summary>

[f(i) | i ⟸ ℕₙ] builds the sequence f(0), …, f(n−1) in index order; ⟸ signals the order
matters, while ∈ is unordered. Order-by, written [i ∈ X ⦚ f(i)] with a wavy vertical bar
before the key, takes a set or sequence and lays it out ascending by the key f(i); the
unique variant (a doubled wavy bar) removes duplicates. With s =
[1, 3, 2, 3]: order-unique gives [1, 2, 3], order by −i gives [3, 3, 2, 1]. Sets are built
from sequences by the usual comprehension, collapsing duplicates. This is how the paper
specifies canonical orderings, for example the accumulation-output sequence
θ' ≡ [(s, h) ∈ b] (eq:finalstateaccumulation): with the key elided, [i ∈ X] sorts by the
elements themselves, so θ' is sorted by the full (service, hash) tuple.

</details>

### Q11 What notation did 0.8.0 add to chapter 3, and why did the rest of the paper need it?
<details><summary>Model answer</summary>

One new sequence form, ⟦T⟧_N: a sequence whose length lies in the set N (§3.7, GP #514,
"Support smaller validator sets"). In 0.7.2 every validator sequence had exactly V = 1023
entries, ⟦𝕂⟧_V. In 0.8.0 the validator count is a live quantity: 𝕍 ≡ {3c : c ∈ ℕ_{2…C+1}}
(eq:valcount), a multiple of 3 from 6 to 3C, and ι, κ, λ and γ_P are all ⟦𝕂⟧_𝕍
(eq:validatorkeys), as are the epoch mark's key pairs ⟦(ℍ̃, ℍ̄)⟧_𝕍. The codec cannot read
a term's type bound (Appendix C says so in a footnote), so these, together with the
sequences whose length now follows the validator count through a side condition (the
validator statistics, |π_V| = |κ| and |π_L| = |λ|, and each verdict's ⌊2|k|/3⌋ + 1
judgments), carry an explicit ↕ length prefix: γ_P in C(4), ι, κ, λ in C(7) to C(9), π_V
and π_L in C(13), the epoch mark's keys and each verdict's judgments. The at-most form
⟦T⟧_{:n} carries the other new bound: verdicts ⟦…⟧_{:N_V} and culprits and faults
⟦…⟧_{:N_O}, with N_V = N_O = 16 (eq:disputesextrinsics, GP #525). Everything else in
chapter 3 changed only in wording: 𝒪 is the root of a *sequence* of keys, and the VRF
output is typed 𝒴(…) ∈ ℍ.

</details>
