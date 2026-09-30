---
chapter: e-codec-merklization
---

## Level 1

### Q What is ℰ in the Graypaper?
@ Appendix C: the codec
- [x] The serialization (encoding) function that turns values into octets
- [ ] A hash function
- [ ] The erasure-coding function
- [ ] The entropy accumulator
> Why: ℰ is the codec of Appendix C. Hashes are always taken over ℰ of a value.

### Q How is a blob (octet sequence) encoded, when its length is fixed and known?
@ Appendix C: the codec
- [ ] Reversed
- [x] As itself, with nothing added
- [ ] With a 4-octet length prefix
- [ ] Hex-encoded
> Why: A blob encodes to itself. Only variable-length terms get a length prefix.

### Q How is a tuple encoded?
@ Appendix C: the codec
- [ ] With a count prefix
- [ ] As a dictionary
- [x] As the concatenation of its elements' encodings, in order
- [ ] As a hash of its elements
> Why: Tuples concatenate. Field order therefore matters.

### Q What is a "compact" natural encoding?
@ Appendix C: the codec
- [ ] A fixed 4-octet encoding
- [ ] Always 8 octets
- [ ] A base-64 string
- [x] A variable-length encoding where small numbers take fewer octets (1 to 9)
> Why: Compact naturals use a prefix octet that says how many octets follow.

### Q How many octets does a number below 128 take in compact encoding?
@ Appendix C: the codec
- [x] 1
- [ ] 8
- [ ] 2
- [ ] 4
> Why: Values below 2⁷ encode as a single octet equal to the value.

### Q What is the maximum length of a compact-encoded natural?
@ Appendix C: the codec
- [ ] 8 octets
- [x] 9 octets
- [ ] Unlimited
- [ ] 16 octets
> Why: Large values are [255] followed by 8 octets.

### Q What does ℰ₄(x) mean?
@ Appendix C: the codec
- [ ] x hashed to 4 octets
- [ ] x in compact form, at most 4 octets
- [x] x encoded as exactly 4 octets, little-endian
- [ ] The first 4 octets of ℰ(x)
> Why: ℰ_l is the fixed-width little-endian encoding of l octets.

### Q What byte order does fixed-width encoding use?
@ Appendix C: the codec
- [ ] Big-endian
- [ ] Network order
- [ ] It depends on the value
- [x] Little-endian (least significant octet first)
> Why: ℰ_l is little-endian.

### Q When does a sequence get a length prefix?
@ Appendix C: the codec
- [x] When its length is variable (written ⟨x⟩); fixed-length sequences get none
- [ ] Always
- [ ] Only when it is longer than 128 items
- [ ] Never
> Why: ⟨x⟩ = (|x|, x) with a compact length. Hashes and other fixed-length terms carry no prefix.

### Q How is an optional value encoded?
@ Appendix C: the codec
- [ ] The value, or nothing if absent
- [x] 0 if absent; otherwise 1 followed by the value
- [ ] A length prefix of 0 or 1 item
- [ ] 255 if absent
> Why: Optional: [0] for ∅, else [1] ++ value.

### Q How is a dictionary encoded?
@ Appendix C: the codec
- [ ] As two separate sequences, keys then values
- [ ] As a hash of its pairs
- [x] As a length-prefixed sequence of (key, value) pairs sorted by key
- [ ] In insertion order
> Why: Sorting by key makes the encoding canonical.

### Q How is a set encoded?
@ Appendix C: the codec
- [ ] In insertion order
- [ ] As a bitfield
- [ ] As a Merkle root
- [x] Its elements in ascending order, concatenated
> Why: A total order makes every set's encoding unique. (lasair's B1 was a set sorted by half its key.)

### Q What order are the extrinsics serialized in within a block?
@ Appendix C: the codec
- [x] Tickets, preimages, guarantees, assurances, disputes
- [ ] Disputes first, then the rest alphabetically
- [ ] Guarantees, assurances, disputes, tickets, preimages
- [ ] Tickets, disputes, preimages, assurances, guarantees
> Why: The block codec order differs from the chapter 4 tuple order (tickets, disputes, preimages, assurances, guarantees).

### Q How long is a state key?
@ Appendix D: state keys
- [ ] 4 octets
- [x] 31 octets
- [ ] 32 octets
- [ ] 64 octets
> Why: Every state item is keyed by a 31-octet key in one flat dictionary.

### Q What is the state key of a whole-chapter component C(i)?
@ Appendix D: state keys
- [ ] Blake2b of i
- [ ] i as 4 octets then zeros
- [x] The index i as the first octet, then zeros
- [ ] The Greek letter's Unicode value
> Why: C(i) = [i, 0, 0, …].

### Q Which chapter index holds the timeslot τ?
@ Appendix D: state keys
- [ ] 6
- [ ] 16
- [ ] 1
- [x] 11
> Why: Chapters: 1 α, 2 φ, 3 β, 4 γ, 5 ψ, 6 η, 7 ι, 8 κ, 9 λ, 10 ρ, 11 τ, 12 χ, 13 π, 14 ω, 15 ξ, 16 θ.

### Q Which chapter index holds recent history β?
@ Appendix D: state keys
- [x] 3
- [ ] 1
- [ ] 7
- [ ] 13
> Why: C(3) is β.

### Q Which chapter index holds the availability assignments ρ?
@ Appendix D: state keys
- [ ] 8
- [x] 10
- [ ] 4
- [ ] 12
> Why: C(10) is ρ.

### Q Which chapter index holds the statistics π?
@ Appendix D: state keys
- [ ] 11
- [ ] 16
- [x] 13
- [ ] 5
> Why: C(13) is π.

### Q What is stored under C(255, s)?
@ Appendix D: state keys
- [ ] The manager service
- [ ] Service s's storage
- [ ] Service s's preimages
- [x] Service s's account metadata (code hash, balance, gas minimums and so on)
> Why: C(255, s) is the account record; storage and preimages use C(s, h) keys.

### Q Are numbers in state serialized compact or fixed-width?
@ Appendix D: state keys
- [x] Fixed-width
- [ ] As decimal strings
- [ ] Either, chosen by the author
- [ ] Compact
> Why: Appendix D: "all non-discriminator numeric serialization in state is done in fixed-length". Length prefixes and other discriminators stay compact.

### Q What does the state trie commit to?
@ Appendix D: the state trie
- [ ] Only the service accounts
- [x] The entire state: every 31-octet key and its value
- [ ] The last 8 headers
- [ ] The block's extrinsic
> Why: The state root is the Merklization of the whole key-value dictionary T(σ).

### Q What kind of trie is the state trie?
@ Appendix D: the state trie
- [ ] A Verkle tree
- [ ] A sparse Merkle tree of depth 256
- [x] A binary Patricia Merkle trie
- [ ] A 16-ary Patricia trie like Ethereum's
> Why: Binary, keyed by the key's bits, most significant first.

### Q How large is a trie node?
@ Appendix D: the state trie
- [ ] 128 octets
- [ ] It varies with the value
- [ ] 32 octets
- [x] 64 octets
> Why: Every node, branch or leaf, is 64 octets.

### Q When is a leaf's value embedded rather than hashed?
@ Appendix D: the state trie
- [x] When the value is 32 octets or less
- [ ] Never
- [ ] Always
- [ ] When the value is more than 32 octets
> Why: Embedded leaves carry the value zero-padded to 32 octets; larger values are stored as their Blake2b hash.

### Q What is the hash of an empty sub-trie?
@ Appendix D: the state trie
- [ ] Undefined
- [x] The zero hash
- [ ] Keccak of zero
- [ ] Blake2b of the empty string
> Why: The empty sub-trie's identity is H⁰.

### Q What hash function builds the state trie?
@ Appendix D: the state trie
- [ ] Poseidon
- [ ] SHA-256
- [x] Blake2b
- [ ] Keccak
> Why: Blake2b is the default; Keccak is used for the recent-history belt and Beefy.

### Q What is a Merkle mountain belt (MMB)?
@ Appendix D: Merkle mountain belt
- [ ] A trie of accumulation outputs
- [ ] A balanced binary tree
- [ ] A list of every leaf hash
- [x] A sequence of optional peaks, where peak i is the root of 2ⁱ items
> Why: It supports cheap appends; recent history stores one and commits to its super-peak.

### Q Which hash does the MMB super-peak use?
@ Appendix D: Merkle mountain belt
- [x] Keccak, with a "$peak" prefix
- [ ] Blake2b
- [ ] No hash; the last peak is used
- [ ] SHA-256
> Why: Keccak for legacy (Ethereum-style) bridge compatibility.

### Q What is the super-peak of a belt with no peaks?
@ Appendix D: Merkle mountain belt
- [ ] Keccak of the empty string
- [x] The zero hash
- [ ] Undefined
- [ ] The first peak
> Why: No non-empty peaks gives H⁰; one gives that peak.

## Level 2

### Q What is the compact encoding of 200?
- [ ] [200, 0]
- [ ] [200]
- [x] [128, 200]
- [ ] [1, 200]
> Why: 200 ≥ 128 needs l = 1: prefix 2⁸ − 2⁷ + ⌊200/256⌋ = 128, then 200.

### Q What is the compact encoding of 300?
- [ ] [44, 1]
- [ ] [128, 44]
- [ ] [1, 44]
- [x] [129, 44]
> Why: l = 1: prefix 128 + ⌊300/256⌋ = 129, then 300 mod 256 = 44.

### Q What is ℰ₄(1)?
- [x] [1, 0, 0, 0]
- [ ] [4, 1]
- [ ] [0, 0, 0, 1]
- [ ] [1]
> Why: Fixed-width little-endian.

### Q A work-report's core index is 340 at full spec. Why was writing it as one byte a bug?
- [ ] Core indices are 4 octets
- [x] It is a compact natural, and 340 ≥ 128 needs two octets
- [ ] It must be big-endian
- [ ] 340 is not a valid core
> Why: This was lasair's F1: tiny's cores 0 and 1 hide the width bug.

### Q The ticket accumulator holds 600 entries. What is the compact length prefix?
- [ ] [600]
- [ ] [0, 0, 2, 88]
- [x] [0x82, 0x58]
- [ ] [88, 2]
> Why: l = 1: prefix 128 + ⌊600/256⌋ = 130 = 0x82, then 600 mod 256 = 88 = 0x58. lasair's F4 wrote it as one byte.

### Q A value of exactly 40 octets is stored in state. What kind of trie leaf holds it?
- [ ] Two embedded leaves
- [ ] An embedded leaf
- [ ] A branch
- [x] A hashed leaf, storing Blake2b of the value
> Why: Only values of 32 octets or less are embedded.

### Q A trie node's first bit is 0. What kind of node is it?
- [x] A branch
- [ ] An embedded leaf
- [ ] An empty node
- [ ] A hashed leaf
> Why: First bit 0 = branch; first bit 1 = leaf, and the second bit says embedded (0) or hashed (1).

### Q How is a branch's left child hash stored, given the node is only 64 octets?
- [ ] It is not stored
- [x] Minus its first bit (255 bits), with the full right child hash after it
- [ ] Truncated to 16 octets
- [ ] As an index into a table
> Why: Dropping one bit of the left hash frees the discriminator bit.

### Q The bits of a state key are consumed in what order when descending the trie?
- [ ] Least significant bit first
- [ ] Octet by octet from the end
- [x] Most significant bit first
- [ ] Random, by hash
> Why: bits() is MSB-first (ch. 3). The 0.8.0 vectors restated this; the tex is unchanged.

### Q An MMB has peaks [a, ∅, c]. What do the positions mean?
- [ ] Three trees of 2 items
- [ ] a covers 4 items, c covers 1
- [ ] Three single items
- [x] a covers 1 item, position 1 is empty, c covers 4 items
> Why: Peak i is the root of 2ⁱ items.

### Q An MMB has peaks [x]. A new item l is appended. What results?
- [x] [∅, H(x ++ l)]
- [ ] [x, l]
- [ ] [l, x]
- [ ] [H(x ++ l)]
> Why: Position 0 is full, so it is cleared and H(x ++ l) is carried to position 1.

### Q Which state key holds item k of service s's storage in 0.8.0?
- [ ] [255, s₀, 0, s₁, 0, …]: the account-metadata key
- [x] C(s, ℰ₄(2³²−1) ⌢ k): the four service-id octets interleaved with the first octets of Blake2b of that string
- [ ] Blake2b(k) alone, shared by all services
- [ ] The raw key k, prefixed with ℰ₄(s)
> Why: C(s, h) = [n₀, a₀, n₁, a₁, n₂, a₂, n₃, a₃, a₄, …, a₂₆] with n = ℰ₄(s) and a = Blake2b(h). Storage uses h = ℰ₄(2³²−1) ⌢ k; preimages use ℰ₄(2³²−2) ⌢ hash.

### Q Why may an implementation avoid storing raw service storage keys at all?
- [ ] Because storage is kept outside the state
- [ ] Because keys are limited to 4 octets
- [x] Because JAM does not allow storage keys to be inspected or enumerated, so only the hashed, Merklization-ready key matters
- [ ] Because the manager service keeps a copy of every key
> Why: Appendix D says so directly: only the fixed-size hash (with service index and item marker) is important.

### Q In 0.8.0, how does each recent-history entry serialize in C(3)?
- [ ] (h, s, b, p) with no slot
- [ ] (h, s, b, t, p)
- [ ] (t, h, s, b, p)
- [x] (h, b, s, ℰ₄(t), p): the belt peak before the state root
> Why: The wire order differs from the ch. 7 tuple order; the slot is new in 0.8.0.

### Q In 0.8.0, how are the validator key sets ι, κ, λ serialized in state?
- [x] Length-prefixed, because the set size can change
- [ ] As a Merkle root only
- [ ] As fixed V-length arrays
- [ ] As a dictionary by index
> Why: Validator sets became bounded sequences (⟨…⟩) in 0.8.0.

## Level 3

### Q Explain the compact natural encoding and why JAM uses it.
> Hint: Most numbers in a block are small.
> Answer: A prefix octet whose leading one-bits say how many octets follow, with the remaining bits carrying the top of the value; small values take one octet and the largest take nine. It keeps blocks small, but it means a length that is below 128 at tiny can need two octets at full.

### Q Why is state serialized with fixed-width integers while the block codec uses compact ones?
> Hint: What does each one optimise?
> Answer: The GP states the rule, not the reason: in state, all non-discriminator numbers are fixed-length for their term's size. The block codec mixes both: compact for general naturals and lengths, fixed-width where a width is stated (such as ℰ₄ for slots). A plausible reason (derivation, not GP text) is that fixed widths give stable, simply parsed layouts in state, while compact saves bytes in transmitted blocks.

### Q Describe the three kinds of state-trie node.
> Hint: Two bits of discriminator.
> Answer: A branch (first bit 0) holds the left child hash minus its first bit and the full right child hash. An embedded leaf (bits 1, 0) holds the value length, the 31-octet key and a value of up to 32 octets. A hashed leaf (bits 1, 1) holds the key and the Blake2b hash of a longer value.

### Q Why does every set that reaches the trie need a total order?
> Hint: lasair's B1.
> Answer: The encoding, and therefore the root, must be identical on every node. If a set is sorted by only part of its key, two entries with the same prefix can appear in different orders on different implementations. lasair sorted θ by service alone and diverged.

### Q Explain MMB append.
> Hint: Like binary addition with carries.
> Answer: Start at position 0. If it is empty, place the item there. If it is full, clear it and carry the hash of (old peak ++ item) to the next position, repeating until an empty slot or the end, where it is appended.

### Q How does the header's extrinsic hash use the codec?
> Hint: Five encoded parts.
> Answer: It is Blake2b of the encoding of the Blake2b hashes of five parts: the encoded tickets, per-preimage (service, hash) pairs, per-guarantee (report hash, slot, credential) tuples, the encoded assurances and the encoded disputes. Per-item hashing lets single items be proven included.

### Q What did lasair's codec and trie war story show?
> Hint: Two oracles.
> Answer: codec_check decodes and re-encodes every binary vector and demands byte identity (1009 of 1009). The trie was checked against Parity's PolkaJam by comparing genesis state roots, which matched on the tiny shared genesis.

### Q What is the difference between well-balanced and constant-depth Merklization?
> Hint: Where each is used.
> Answer: Well-balanced splits the sequence in half recursively without pre-hashing items (a single item is just hashed); it is used for each block's accumulation-output root and for the erasure root. Constant-depth first hashes each item with a "$leaf" prefix and pads to a power of two, so every leaf sits at the same depth; it is used for the exports segment root and its paged proofs.
