---
chapter: ch07-recent-history
---

## Level 1

### Q What is recent history mainly for?
@ What this is for
- [x] Precluding duplicate or out-of-date work-reports
- [ ] Choosing the best chain
- [ ] Storing validator keys
- [ ] Paying for coretime
> Why: §7: it is used to preclude the possibility of duplicate or out-of-date work-reports being submitted.

### Q How many recent blocks does β_H retain?
@ State touched
- [ ] 4
- [x] 8
- [ ] 24
- [ ] 600
> Why: H = 8, in tiny and full.

### Q What are the two parts of β?
@ State touched
- [x] β_H, the recent block entries, and β_B, the accumulation-output belt
- [ ] β_H and the ready queue
- [ ] β_B and the authorizer pool
- [ ] The header hash and the state root
> Why: eq. recentspec: β ≡ (β_H, β_B).

### Q Which is NOT a field of a recent-history entry?
@ State touched
- [ ] Header hash
- [ ] State root
- [ ] Timeslot
- [x] Author index
> Why: Entries hold header hash h, state root s, belt super-peak b, timeslot t and reported packages p.

### Q What is the reported-packages field p of an entry?
@ State touched
- [ ] A list of package hashes
- [x] A dictionary from work-package hash to exports segment root
- [ ] A set of core indices
- [ ] A bitfield of assurances
> Why: p ∈ 𝔻⟨ℍ→ℍ⟩, package hash to segment root.

### Q At most how many reported packages can one block's entry hold at full?
@ State touched
- [ ] 8
- [ ] 16
- [x] 341
- [ ] 1023
> Why: No more than the total number of cores, C = 341.

### Q What is β_B?
@ State touched
- [ ] A sequence of block headers
- [x] The accumulation-output log, a Merkle mountain belt of optional peaks
- [ ] A bitfield
- [ ] The list of beefy signatures
> Why: eq. accoutbeltspec: β_B ∈ ⟦ℍ?⟧, extended with the MMB append function.

### Q Which field of an entry was added in 0.8.0?
@ 0.7.2 → 0.8.0
- [ ] The header hash
- [ ] The belt super-peak
- [x] The timeslot t
- [ ] The reported packages
> Why: 0.8.0 added t (GP #526); the entry order is (h, s, b, t, p).

### Q What does β† change?
@ The transition in plain English
- [x] The last entry's state root, set to the header's prior state root H_R
- [ ] The belt, by appending θ'
- [ ] The first entry's header hash
- [ ] Nothing; it is a copy
> Why: eq. correctlaststateroot: the last entry's s becomes H_R.

### Q What state root is written in the new entry for the block being imported?
@ The transition in plain English
- [ ] The posterior root
- [x] The zero hash
- [ ] The prior root H_R
- [ ] The parent's root
> Why: eq. recenthistorydef: s = H⁰, corrected by the next block's β†.

### Q Which hash function is used for the accumulation-output belt?
@ The transition in plain English
- [ ] Blake2b
- [x] Keccak
- [ ] SHA-256
- [ ] Blake2s
> Why: Throughout, Keccak is used to maximize compatibility with legacy systems.

### Q What feeds the belt each block?
@ The transition in plain English
- [x] The block's accumulation outputs θ', Merklized into one root
- [ ] The header hash
- [ ] The guarantees extrinsic
- [ ] The tickets
> Why: eq. accoutbeltdef: the well-balanced Merklization of θ' is appended with MMB append.

### Q How is each θ' entry encoded before Merklization?
@ The transition in plain English
- [ ] As the hash alone
- [x] As a 4-octet service id followed by the encoded hash
- [ ] As the compact service id only
- [ ] As a Keccak hash of the pair
> Why: s = [ℰ₄(s) ⌢ ℰ(h) | (s, h) ⟸ θ'].

### Q Which Merklization function is used on the encoded θ' sequence?
@ The transition in plain English
- [ ] The state trie
- [x] The well-balanced binary Merklization M_B, with Keccak
- [ ] The constant-depth Merklization
- [ ] None; the sequence is hashed directly
> Why: eq. accoutbeltdef uses M_B with ℋ_K.

### Q Where do the reported packages of a new entry come from?
@ The transition in plain English
- [ ] The assurances extrinsic
- [x] The guarantees extrinsic E_G
- [ ] The ready queue
- [ ] The accumulated set ξ
> Why: eq. recenthistorydef builds p from each g ∈ E_G.

### Q After appending a new entry, how is β_H kept to size?
@ The transition in plain English
- [x] Only the last H = 8 entries are kept
- [ ] The first 8 are kept
- [ ] Entries older than one epoch are removed
- [ ] It grows without bound
> Why: The ←ⁿ operator keeps the final H entries.

### Q Is writing the zero hash as the new entry's state root a safety problem?
@ Validation rules and what they guard
- [ ] Yes, it lets bad roots through
- [x] No: it is "inaccurate but safe", because only the next block's β† reads it and corrects it
- [ ] Yes, but only at epoch boundaries
- [ ] No, because the root is never used
> Why: §7 states it is inaccurate but safe.

### Q What is stored in the new entry's b field?
@ The transition in plain English
- [ ] The belt's first peak
- [x] The super-peak of the new belt β_B'
- [ ] The Keccak of the header
- [ ] The number of outputs
> Why: b = M_R(β_B'), the MMB super-peak.

### Q Which chapter performs the duplicate-package check that uses recent history?
@ What this is for
- [ ] Chapter 7
- [ ] Chapter 8
- [x] Chapter 11, reporting and assurance
- [ ] Chapter 12, accumulation
> Why: Recent history stores the data; chapter 11's contextual validity rules use it.

### Q What does the h field of an entry hold?
@ State touched
- [x] The block's header hash
- [ ] The parent's header hash
- [ ] The extrinsic hash
- [ ] The Keccak of the header
> Why: h = ℋ(H), the Blake2b header hash of the block the entry describes.

### Q What does the s field of an entry hold once corrected?
@ State touched
- [ ] The prior state root of that block
- [x] The posterior state root of that block
- [ ] The belt super-peak
- [ ] The zero hash, always
> Why: β† writes the next header's H_R, which is this block's posterior root.

### Q What type is each belt element?
@ State touched
- [ ] A hash
- [x] An optional hash (a peak or ∅)
- [ ] A pair of hashes
- [ ] A 4-octet number
> Why: β_B ∈ ⟦ℍ?⟧: a sequence of optional peaks.

### Q What is θ' in the context of this chapter?
@ State touched
- [ ] The belt's super-peak
- [x] This block's accumulation-output sequence of (service id, hash) pairs
- [ ] The previous belt
- [ ] The set of reported packages
> Why: eq. lastaccoutspec: θ ∈ ⟦(service id, hash)⟧, defined in chapter 12.

### Q Where is the accumulation output sequence θ' defined?
@ Inputs
- [ ] Chapter 5
- [ ] Chapter 7
- [x] Chapter 12, Accumulation
- [ ] Appendix D
> Why: §7 refers to θ' defined in the accumulation section.

### Q Which header field does β† read?
@ Inputs
- [ ] H_T
- [ ] H_X
- [x] H_R, the prior state root
- [ ] H_P
> Why: eq. correctlaststateroot sets the last entry's root to H_R.

### Q Which extrinsic does the new entry read?
@ Inputs
- [ ] E_A
- [x] E_G
- [ ] E_P
- [ ] E_T
> Why: The reported packages come from the guarantees extrinsic.

### Q What does the segment root stored per package hash commit to?
@ State touched
- [x] The package's exported segments, so later packages can import them
- [ ] The package's authorizer
- [ ] The package's gas usage
- [ ] The guarantors' keys
> Why: p maps package hash to its availability spec's exports segment root.

### Q Which appendix defines the MMB append and super-peak functions?
@ The transition in plain English
- [ ] The PVM appendix
- [x] The General Merklization appendix (MMR/MMB section)
- [ ] The Serialization appendix
- [ ] The PVM Invocations appendix
> Why: §7 refers to the MMB append function defined in the merklization appendix (sec:mmr).

### Q Is the recent-history length different at tiny?
@ State touched
- [ ] Yes, 2
- [ ] Yes, 12
- [x] No, 8 in both
- [ ] Yes, 24
> Why: H = 8 in tiny and full.

### Q Which new-entry field is "inaccurate" at the moment it is written?
@ Validation rules and what they guard
- [ ] The header hash
- [x] The state root
- [ ] The timeslot
- [ ] The reported packages
> Why: It is written as the zero hash and corrected by the next block.

## Level 2

### Q A block reports no work-packages. What does its new β_H entry's p contain?
- [x] An empty dictionary
- [ ] The previous block's packages
- [ ] One entry per core with zero hashes
- [ ] The entry is not added
> Why: p is built from E_G, and an empty E_G gives an empty dictionary; the entry is still appended.

### Q Block N+1 arrives. What is the first recent-history step?
- [ ] Append N+1's entry
- [x] Set the last entry's state root to N+1's H_R, which is N's posterior root
- [ ] Merklize θ'
- [ ] Remove the oldest entry
> Why: β† is computed from (H, β) before anything else in this chapter.

### Q A guarantee names a work-package already present in one of the 8 recent entries. What happens?
- [ ] It is accepted and overwrites the entry
- [x] It is rejected as a duplicate (checked in chapter 11)
- [ ] It is accepted if on a different core
- [ ] It is deferred to the ready queue
> Why: Recent history exists to preclude duplicate reports; chapter 11 performs the check.

### Q A service accumulates twice in one block, producing two (service, hash) pairs with the same service id. How must they be ordered?
- [ ] By insertion order
- [x] By the full tuple, service id and then hash
- [ ] By hash alone
- [ ] The second overwrites the first
> Why: θ' is a set with a total order; lasair's B1 sorted by service id alone and the root diverged.

### Q Which state keys changed together in lasair's B1 divergence, and why?
- [ ] Only θ, because the belt is not in state
- [x] θ (C(16)) and β (C(3)), because β's belt commits to θ's Merkle root
- [ ] β and π, because statistics count outputs
- [ ] Only β
> Why: Recorded in the Divergence Lab: same entries, different order, cascading into recent history.

### Q Why is Keccak used for the belt instead of Blake2b?
- [ ] It is faster
- [x] For compatibility with legacy systems such as Ethereum-style bridge verifiers
- [ ] Blake2b is not collision resistant
- [ ] Keccak outputs 64 octets
> Why: §7: Keccak maximises compatibility with legacy systems.

### Q A block at slot 900 is imported. What slot is written in its entry in 0.8.0?
- [ ] 0
- [x] 900, the header's H_T
- [ ] The parent's slot
- [ ] The epoch index
> Why: t = H_T in eq. recenthistorydef.

### Q The chain has only 3 blocks so far. What does β_H contain?
- [x] At most the entries built so far, with no trimming
- [ ] 8 entries padded with zero hashes
- [ ] Nothing until 8 blocks exist
- [ ] Only the genesis entry
> Why: β_H ∈ ⟦…⟧_{:H}: at most 8, fewer early on.

### Q How does a report's anchor check use β?
- [ ] It does not
- [x] The anchor must be a recent header hash, with matching state root, belt peak and timeslot
- [ ] The anchor must be the current block
- [ ] The anchor must be in ξ
> Why: Chapter 11 (anchor rule): some entry y in β† must have y_h = anchor hash, y_s = anchor state root, y_b = anchor belt peak and y_t = anchor slot.

### Q In the state serialization (App. D), what order are entry fields written?
- [ ] (h, s, b, t, p), the same as chapter 7
- [x] (h, b, s, E₄(t), p), with the super-peak before the state root
- [ ] (p, t, s, b, h)
- [ ] Only h and s are serialized
> Why: App. D, C(3): each entry is encoded as (h, b, s, ℰ₄(t), ↕p), followed by the MMB encoding of β_B.

### Q Two guarantees in one block report the same package hash. What happens?
- [x] The block is invalid: chapter 11 requires the incoming package hashes to be as many as the reports
- [ ] Both are stored in p as a list
- [ ] The second overwrites the first in p silently
- [ ] The belt records both
> Why: Chapter 11: |p| = |reports| forbids two reports of one package in a block. p then maps each package hash to exactly one segment root.

### Q A block's accumulation produces no outputs. What happens to the belt?
- [ ] It is left unchanged
- [x] The Merkle root of the empty sequence is still appended
- [ ] It is reset
- [ ] The entry is skipped
> Why: The belt append runs every block on whatever θ' holds.

### Q A report's anchor names a header from 20 blocks ago. Is it among β's entries?
- [ ] Yes, β keeps one epoch
- [x] No, β keeps only the last 8 blocks
- [ ] Yes, if finalized
- [ ] Only at tiny
> Why: H = 8.

### Q Which component would change if an implementation used Blake2b instead of Keccak for the belt?
- [ ] Only θ
- [x] The belt, the entry's super-peak b, and therefore the state root
- [ ] Nothing, hashes are interchangeable
- [ ] Only the header
> Why: The super-peak is stored in β, which is Merklized into state.

### Q Why is β† defined from (H, β) alone?
- [ ] Because it needs accumulation first
- [x] It needs only the header's prior root and the prior β, so it can be computed first
- [ ] Because it depends on E_G
- [ ] It is not; it depends on ψ
> Why: Overview dependency graph: β† ≺ (H, β).

## Level 3

### Q Explain the deferred state root pattern.
> Hint: zero now, fix later.
> Answer: When a block is imported its posterior root is not yet known to the chain, so its entry records the zero hash. The next block's header carries H_R, which is exactly that root, and β† writes it into the last entry before anything else runs.

### Q How is the accumulation-output belt extended each block?
> Hint: encode, Merklize, append.
> Answer: Encode each accumulation output as a 4-octet service id followed by its hash, Merklize the sequence with the well-balanced binary Merklizer under Keccak, and append the root to the belt with the MMB append function under Keccak. The new super-peak goes in the block's entry.

### Q Why is the zero-hash state root "inaccurate but safe"?
> Hint: who reads it?
> Answer: Nothing reads the last entry's state root except the next block's β† correction, which overwrites it with the true root from the header. So the placeholder never influences any decision.

### Q Name two consumers of recent history.
> Hint: chapter 11.
> Answer: Report validation checks a report's anchor header hash, state root, belt peak and slot against β, and rejects package hashes already reported in recent entries. Segment imports use the exports root stored per package hash. Bridges use the belt peak.

### Q Tell the B1 war story in 60 seconds.
> Hint: ordering.
> Answer: A fuzzer seed diverged on two state keys, the accumulation output and recent history, with the same entries in a different order. The output set was sorted by service id alone, so two outputs from one service kept insertion order. The belt commits to that sequence, so the error spread into β and the state root. The fix sorted by the full tuple through one canonical encoder.

### Q What did 0.8.0 change in recent history and what does it enable?
> Hint: one new field.
> Answer: Each entry gained the block's timeslot. That lets report validation check anchor age from state alone, and the 0.8.0 refine context carries an anchor slot that must match.

### Q Why is the belt kept in state rather than only in the header?
> Hint: bridges.
> Answer: The belt accumulates every block's output commitment, and its super-peak is stored in each recent entry, so a bridge can verify any accumulation output with a Keccak Merkle proof against a committed peak. Keeping it in state makes it part of what the state root certifies.

### Q What would break if β† were skipped?
> Hint: the anchor check.
> Answer: The last entry would keep the zero hash as its state root, so a report anchored on that block would be checked against the wrong root and valid reports would be rejected. Every later state root would differ too.

### Q Why can a block's p have exactly one segment root per package hash?
> Hint: look for the cardinality rule in chapter 11.
> Answer: Chapter 11 requires the set of incoming package hashes to have as many members as there are reports, so no package is reported twice in one block. Given that rule, p is a well-formed dictionary with one segment root per package hash.

### Q Walk through recent history for an empty block.
> Hint: three steps still run.
> Answer: β† corrects the parent's root. The belt appends the root of an empty output sequence. A new entry is appended with the header hash, zero root, new super-peak, slot and empty p, and the list is trimmed to 8.
