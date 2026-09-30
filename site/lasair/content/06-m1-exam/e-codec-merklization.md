---
title: "E · Serialization and Merklization (Appendices C and D)"
duration: 40 min
exam_portion: fixed
gp_chapter: E
gp_words: 3403
gp_tex: text/serialization.tex, text/merklization.tex
lasair: lib/serialization.ml, lib/merklization.ml, lib/state_keys.ml, conformance/block_codec.ml, conformance/codec_tests.ml, conformance/trie_tests.ml
---

# E · Serialization and Merklization (Appendices C and D)

<span class="lecture-badge">M1 Understanding · E · Appendices C and D (skim level)</span>

After the PVM, these two appendices are the ones an importer leans on most, and they are
also where an implementation is most often wrong by one byte.
Know the codec rules cold, be able to draw the state key layout and a trie node, and
know the MMB because recent history depends on it.

## Chapter sheet

### Appendix C: the codec ℰ
| Rule | Encoding |
|---|---|
| ∅ | empty sequence |
| blob | itself |
| tuple | concatenation of the elements' encodings |
| **natural (compact)** | 0 → [0]; for 2^(7l) ≤ x < 2^(7(l+1)) with l < 8: one prefix octet 2⁸ − 2^(8−l) + ⌊x / 2^(8l)⌋ followed by the low 8l bits in l octets; otherwise [255] then 8 octets. At most 9 octets. |
| **fixed-width** ℰ_l(x) | l octets, little-endian; ℰ_l of a tuple or sequence applies ℰ_l to each element |
| sequence | concatenation; a *variable-length* term is written ⟨x⟩ = (\|x\|, x), i.e. compact length prefix then the elements. Fixed-length terms such as hashes carry no prefix. |
| optional | 0 for ∅, else [1] then the value |
| bit sequence | packed 8 per octet, least-significant bit first; variable-length ones get a length prefix |
| dictionary | length-prefixed sequence of (encoded key, encoded value) pairs sorted by key |
| set | elements in ascending order, concatenated |

Values below 128 are one octet: the compact encoding is where "an octet serializes to
itself, a natural may take several octets" bites (see lasair's F4 story on the Notation
sheet).

**Block serialization order** (eq. in §C.2): header, then tickets, **preimages,
guarantees, assurances, disputes**. Note this differs from the extrinsic *tuple* order
in chapter 4 (tickets, disputes, preimages, assurances, guarantees). The unsigned header
is: parent, prior state root, extrinsic hash, ℰ₄(slot), epoch mark (0, or 1 then η₀, η₁
and a length-prefixed list of (Bandersnatch, Ed25519) key pairs; the entropies are the
prior-state values, eq:epochmarker), optional winners mark, ℰ₂(author index), VRF signature,
length-prefixed offenders; the full header appends the seal. A guarantee encodes as
(report, ℰ₄(slot), ⟨(ℰ₂(validator index), signature)⟩) and a verdict as (report hash,
ℰ₄(epoch), ⟨(validity, ℰ₂(judge index), signature)⟩). Work-report, work-package and
work-item encodings do *not* follow their tuple order: the fixed-size fields come first
and the ⟨…⟩ fields last. A report encodes availability spec, context, core, authorizer,
authorizer gas used, then ⟨trace⟩, ⟨segment-root lookup⟩, ⟨digests⟩; a package encodes
ℰ₄(auth code host), auth code hash, context, then ⟨auth token⟩, ⟨auth config⟩, ⟨items⟩.
A work digest keeps its tuple order; its result is 0 then ⟨blob⟩ for success, or 1 to 6
for the six error kinds (out-of-gas, panic, bad exports, oversize, BAD, BIG). The
extrinsic hash (chapter 5) is Blake2b over the concatenated Blake2b hashes of the five component encodings (tickets,
preimages, guarantees, assurances, disputes), except that guarantees enter as
(Blake2b(report), ℰ₄(slot), ⟨credential⟩) and, since 0.8.0, preimages enter as
(ℰ₄(service), Blake2b(data)) pairs.

### Appendix D: state keys
Every state item is a 31-octet key in one flat dictionary:
| Constructor | Key octets |
|---|---|
| C(i) chapter i | [i, 0, 0, …] |
| C(i, s) chapter i, service s | [i, n₀, 0, n₁, 0, n₂, 0, n₃, 0, …] with n = ℰ₄(s) |
| C(s, h) service s, item hash h | [n₀, a₀, n₁, a₁, n₂, a₂, n₃, a₃, a₄, …, a₂₆] with a = Blake2b(h) |

Chapters: 1 α, 2 φ, 3 β, 4 γ, 5 ψ, 6 η, 7 ι, 8 κ, 9 λ, 10 ρ, 11 τ, 12 χ, 13 π, 14 ω,
15 ξ, 16 θ. Service items: C(255, s) → account metadata, in this order: a zero octet,
the code hash, ℰ₈ of balance, minimum accumulate gas, minimum memo gas, octets and gratis,
then ℰ₄ of items, created, last accumulated and parent;
C(s, ℰ₄(2³² − 1) ++ k) → storage value; C(s, ℰ₄(2³² − 2) ++ h) → preimage octets;
C(s, ℰ₄(l) ++ h) → preimage request status for (h, l). Interleaving the service index
octets with the hash octets keeps a service's items adjacent in the trie without letting
anyone enumerate storage keys, and the paper notes implementations need never store the
raw keys. The paper also notes that all non-discriminator numbers in state are
fixed-width according to the term's size; length prefixes and discriminators stay compact.

### Appendix D: the state trie
- Binary Patricia Merkle trie keyed by bits(key), most-significant bit first. Empty
  sub-trie identity is the zero hash.
- **Nodes are 64 octets.** Branch: first bit 0, then the left child's hash minus its
  first bit (255 bits), then the right child's full hash. Leaf: first bit 1; second bit 0
  means *embedded* value: six bits of value length, 31-octet key, value zero-padded to
  32 octets (values of 32 octets or less); second bit 1 means *hashed* leaf: six zero
  bits, key, Blake2b(value).
- Merklize M(d): one entry → Blake2b(leaf); otherwise split on the next key bit and
  Blake2b(branch(M(left), M(right))). Root of the whole state is M over T(σ).
- Since bits() is MSB-first, the discriminator bits are the top bits of node octet 0
  (0x80 leaf flag, 0x40 hashed flag) and key bits are consumed from the top of key
  octet 0. The 0.8.0 vectors' "Fixes" note restated this; the tex was unchanged and
  lasair's migration Phase 2 re-verified it (Gate 2: Trie 11/11).

### Appendix D: general Merklization
- Strictly, this sheet and the belt below are GP Appendix E ("General Merklization",
  sec:merklization); Appendix D is the state serialization and the trie.
- Node function N(v, H): empty → zero hash; one item → the item; else H("$node" ++
  N(first half) ++ N(second half)) with the split at ⌈|v|/2⌉.
- **Well-balanced** 𝓜_B: one item → H(item); else N. Used for the accumulation-output
  belt leaves (with Keccak, eq:accoutbeltdef), for the availability spec's erasure root
  (one leaf per erasure-coded chunk, i.e. per assurer: bundle-chunk hash ++ segment-chunk
  root, the latter itself 𝓜_B) and wherever items are about 32 octets.
- **Constant-depth** 𝓜 (no subscript in the GP; 𝓜_σ is the state root): first hash every
  item with the "$leaf" prefix and pad to a power of two with zero hashes, then N. Gives
  fixed-size pages and justifications (used for exported-segment roots, the paged proofs
  built from 𝒥₆ and ℒ₆, eq:pagedproofs, and the 𝒥₀ import-segment justifications);
  default hash Blake2b.
- Trace T(v, i, H) returns the sibling nodes from root to leaf i, the inclusion proof.

### Appendix D: Merkle mountain belt
A belt is a sequence of optional peaks; peak i, when present, is the root of a tree of
2ⁱ items. **Append** l: at position n, if n ≥ length append l; if the slot is empty put l
there; otherwise clear the slot and carry H(slot ++ l) to n + 1. **Super-peak**: take
the non-empty peaks h; none → zero hash; one → it; else Keccak("$peak" ++
superpeak(all but last) ++ last). **Encoding**: length-prefixed sequence of optionals.
Recent history stores the belt and commits to its super-peak every block.

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in Appendices C and D</div>

- State C(3): each recent-history entry gains ℰ₄(slot) (order h, b, s, t, p in the
  serialization; note the belt peak precedes the state root on the wire).
- C(4) pending validator set and C(7)–C(9) ι, κ, λ are now length-prefixed
  (⟨…⟩) instead of fixed V-length; C(13) validator statistics likewise.
- C(10) ρ holds the optional pair (full guarantee, ℰ₄(timestamp)), not (report,
  timestamp).
- Tickets extrinsic encoding is now explicit as (ℰ₁(entry index), proof); the guarantee
  encoding is factored into its own equation; the epoch-mark encoding is spelled out
  (0, or 1 then η₀, η₁, ⟨keys⟩), the key list gaining its prefix because the validator
  count is no longer a constant; a Safrole ticket's entry index is ℰ₁.
- Each verdict's judgment list is now length-prefixed: its size is ⌊2|k|/3⌋+1 for the
  key set k (κ or λ) the verdict names, so it varies with the set (eq:disputesextrinsics
  and the rule after it).
- Work context gains ℰ₄(anchor slot), right after the anchor hash, and the lookup-anchor
  posterior state root, right after ℰ₄(lookup-anchor slot); the availability spec gains
  ℰ₂(erasure shards) between the erasure root and the segment root (the chunk count,
  eq:avspec, which an incoming report must set to |κ'|).
- The separate accumulation-input encoding is gone: an operand tuple now encodes with a
  leading 0 and a deferred transfer with a leading 1, each in its own equation.
- The trie node format is unchanged in the tex; the vectors clarified the MSB-first
  reading and moved the type discriminators accordingly (lasair migration Phase 2).

</div>

### War story
<div class="lasair-connection">

**1009 of 1009, then a root that matched Parity's.** Codec conformance in lasair is not a
unit test but an oracle: `bin/codec_check` decodes every `.bin` vector and re-encodes it,
demanding byte identity, and the M1 plan records 1009/1009 round-trips gated into
`scripts/conformance.sh` on 2026-06-11 (`docs/M1_PLAN.md` Phase 2). The trie was proven
the other way round: `bin/polkajam_genesis_check` builds lasair's genesis state from a
PolkaJam `gen-spec` dump and compares the Merkle root to the one PolkaJam reports,
black-box, and they matched on the tiny shared genesis under 0.7.2
(`docs/MIXED_CLIENT_NETWORK.md` Phase B). Under 0.8.0 the same black-box comparison
matched PolkaJam's nightly root on both the tiny and the full 1023-validator genesis, and
the codec oracle now covers all 15 fixtures at tiny and full, 0 failed (`docs/GP_0_8_0_PLAN.md`
ledger, loops 2 and 3). On the way, the 0.8.0 trie suite was red for one reason only:
`conformance/trie_tests.ml` carried its own copy of the node encoder matching the old
vectors; deleting it and driving `State_db.compute_root` gave Trie 11/11. The F4 bug on
the Notation sheet, a compact length written as one octet, is the codec lesson; the B1 bug on the Recent History sheet, a set sorted by half its key,
is the trie lesson: every set that reaches the trie has a total order, and one canonical
encoder must be the only path to state.

</div>

### Source pointers
- `lib/serialization.ml`: `encode_compact`, `decode_compact`, `encode_fixed_int`,
  `encode_var`, `encode_var_sequence`, `encode_maybe`, `encode_bits`, `encode_dict`,
  `encode_set`, `encode_work_report`, `encode_refinement_context`, `encode_package_spec`
- `lib/merklization.ml`: `encode_branch`, `encode_leaf`, `encode_hashed_leaf`,
  `merkle_trie`, `compute_state_root`, `merkle_root_balanced`,
  `merkle_root_constant_depth`, `constant_depth_preprocess`, `merkle_trace`,
  `mmr_append`, `mmr_superpeak`, `mmr_encode`, `prefix_node`, `prefix_leaf`,
  `prefix_peak`, `state_key_from_index`, `state_key_from_index_service`,
  `state_key_from_service_hash`
- `lib/state_keys.ml`: `make_key`, `make_service_key`, `is_service_key`
- `lib/state_db.ml`: `leaf`, `branch`, `compute_root` (the one trie implementation the
  trie suite, the importer and the fuzz target share)
- `conformance/codec_tests.ml`, `conformance/trie_tests.ml`, `bin/codec_check`,
  `bin/polkajam_genesis_check`; `docs/notes/serialization.md`, `docs/notes/merklization.md`

## Question bank

### Q1 ★ Encode the naturals 0, 100, 200 and 70 000 compactly, and explain the prefix rule.
<details><summary>Model answer</summary>

0 → [0]. 100 < 2⁷ so l = 0: one octet, [100]. 200 is between 2⁷ and 2¹⁴ so l = 1: the
prefix is 2⁸ − 2⁷ + ⌊200 / 256⌋ = 128 and the low octet is 200, giving [128, 200].
70 000 is between 2¹⁴ and 2²¹ so l = 2: prefix 2⁸ − 2⁶ + ⌊70 000 / 65 536⌋ = 192 + 1 =
193, then 70 000 mod 65 536 = 4464 as two little-endian octets [112, 17], giving
[193, 112, 17]. The number of leading one bits in the prefix octet is the number of
octets that follow, and the prefix's remaining bits carry the value's top bits;
[255] followed by eight octets covers everything up to 2⁶⁴.

</details>

### Q2 When does a sequence get a length prefix and when does it not?
<details><summary>Model answer</summary>

Only when the term is of variable length in the type: blobs, unbounded sequences and
the ⟨…⟩-marked fields. Fixed-length terms such as a hash, an Ed25519 signature or a
per-core array of a known size are concatenated with no prefix. In 0.8.0 the validator
count became variable (any multiple of 3 from 6 to 3C, eq:valcount), so the terms sized
by it gained a prefix: the validator sets in state (C(4)'s pending set, C(7)–C(9)), the
validator statistics (C(13)), the epoch mark's key list and each verdict's judgment list;
the codec vectors changed accordingly.
Optionals carry a one-octet 0 or 1 discriminator.

</details>

### Q3 ★ Draw a state key for chapter 3, for the account metadata of service 7, and for a storage item of service 7.
<details><summary>Model answer</summary>

Chapter 3 (recent history): [3, 0, 0, … 0], 31 octets. Account metadata of service 7:
C(255, 7) = [255, 7, 0, 0, 0, 0, 0, 0, 0, 0, …], with the four octets of ℰ₄(7) at
positions 1, 3, 5, 7 and zeros between. A storage item with key k: let
h = ℰ₄(2³² − 1) ++ k (the storage marker followed by the raw key), a = Blake2b(h), and
the state key is [7, a₀, 0, a₁, 0, a₂, 0, a₃, a₄, a₅, …, a₂₆]: the service index octets
interleaved with the first four hash octets, then the hash continues. Interleaving groups a service's items under nearby
trie prefixes; hashing hides the raw key.

</details>

### Q4 ★ Describe the two leaf formats and the branch format of a trie node.
<details><summary>Model answer</summary>

All nodes are 64 octets. A branch starts with bit 0 and holds the left child's hash
with its first bit dropped (255 bits) followed by the right child's full hash. A leaf
starts with bit 1. If the second bit is 0 the value is embedded: the next six bits give
its length (0 to 32), then the 31-octet key, then the value padded with zeros to 32
octets. If the second bit is 1 the leaf is hashed: six zero bits, the key, and the
Blake2b of the value. The sub-trie identity is the Blake2b of the node, and an empty
sub-trie is the zero hash. Dropping one bit of the left hash is what makes a branch fit
in exactly 64 octets.

</details>

### Q5 What is the difference between the well-balanced and constant-depth Merkle functions, and where is each used?
<details><summary>Model answer</summary>

Both build on N, which hashes "$node" plus the two halves recursively with the split
at the ceiling of half. Well-balanced leaves the items as they are (one item is simply
hashed), so it is cheap for items of about 32 octets and gives minimal depth; the
accumulation-output belt uses it with Keccak. Constant-depth first hashes every item
with the "$leaf" prefix and pads to a power of two with zero hashes, so every leaf sits
at the same depth and proofs can be served in fixed-size pages; it is used for exported
segment roots, their paged proofs and import-segment justifications. The availability
spec's erasure root, by contrast, is well-balanced. The prefixes exist to prevent a leaf
being confused with an internal node.

</details>

### Q6 ★ Explain MMB append and the super-peak with a four-item example.
<details><summary>Model answer</summary>

Start empty. Append a: [a]. Append b: slot 0 is taken, so clear it and carry H(a ++ b)
to slot 1: [∅, ab]. Append c: slot 0 empty, place it: [c, ab]. Append d: slot 0 taken,
carry H(c ++ d) to slot 1, which is taken, carry H(ab ++ cd) to slot 2: [∅, ∅, abcd].
Peak i always holds a tree of 2ⁱ items, and the belt's length grows only
logarithmically. The super-peak folds the non-empty peaks left to right with
Keccak("$peak" ++ acc ++ peak); with a single peak it is that peak, and with none the
zero hash. Recent history stores the belt (so it can keep appending) and puts the
super-peak in each entry, which is what bridges consume.

</details>

### Q7 Where does the codec use fixed-width integers and where compact ones, and why does it matter?
<details><summary>Model answer</summary>

Fixed-width ℰ_l is the norm: the paper says it is used for almost all integer
encoding across the protocol, and notes that all non-discriminator numbers in state are
fixed-length according to the term's size. So a slot is ℰ₄ in the header, in a guarantee
and in state alike; a service index is ℰ₄, a validator index ℰ₂, a balance or a work
item's gas limits ℰ₈. The compact natural is reserved for length prefixes ⟨…⟩,
discriminators (optionals, the work-result kind, the epoch-mark tag) and the fields an
equation writes without a subscript, for example a work report's core index and
authorizer gas used, a work digest's gas used, import, extrinsic and export counts and
extrinsic size, and an operand tuple's gas limit (the digest's own gas limit, by
contrast, is ℰ₈). The practical rule is to read each equation's subscript rather than
guess from the field's type: one integer written the wrong way changes a hash or a state
root without any other symptom (lasair's F4, a compact length written as one octet).

</details>
