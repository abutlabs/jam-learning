---
chapter: ch06-safrole
---

## Level 1

### Q What is Safrole?
@ The transition in plain English
- [ ] JAM's finality gadget, which decides when blocks are irreversible
- [x] JAM's block production mechanism, a simplified variant of Sassafras
- [ ] The erasure-coding scheme used for availability
- [ ] The PVM's host-call dispatcher
> Why: GP §6 names the block production mechanism Safrole "after the novel Sassafras production mechanism of which it is a simplified variant". Finality is Grandpa.

### Q What is the chief purpose of a block production mechanism like Safrole?
@ The transition in plain English
- [x] To limit the rate at which new blocks are authored and ideally preclude forks
- [ ] To decide which work-reports are valid
- [ ] To pay validators for their work
- [ ] To finalize blocks after two-thirds of votes
> Why: GP §6 opening: its chief purpose is "to limit the rate at which new blocks may be authored and, ideally, preclude the possibility of forks".

### Q How many validators may author a block in any given timeslot under Safrole?
@ The transition in plain English
- [ ] Any validator who wins a race
- [ ] Up to three, one per guarantor role
- [x] Exactly one key-holder from a prespecified sequence
- [ ] Two-thirds of the active set
> Why: Safrole limits the possible author of any block in a six-second timeslot to a single key-holder from a prespecified sequence (GP §6).

### Q What is the Safrole state γ made of?
@ State touched
- [ ] Active keys, previous keys, entropy, timeslot
- [x] Pending keys γ_P, epoch ring root γ_Z, slot-sealer sequence γ_S, ticket accumulator γ_A
- [ ] Good set, bad set, wonky set, offenders
- [ ] Pool, queue, assigners, manager
> Why: GP §6.2: γ ≡ (γ_P, γ_Z, γ_S, γ_A).

### Q What does γ_P hold?
@ State touched
- [ ] The keys authoring blocks right now
- [ ] Last epoch's keys
- [x] The pending validator keys that will be active in the next epoch
- [ ] Keys of validators found guilty in disputes
> Why: γ_P is the pending sequence, reset from ι at each epoch start; it is the set that will be active next epoch and defines the ring root (GP §6.3).

### Q What is γ_Z?
@ State touched
- [x] A Bandersnatch ring root built from the Bandersnatch keys of the next epoch's validators (γ_P)
- [ ] The Merkle root of the ticket accumulator
- [ ] The hash of the previous epoch's last header
- [ ] The entropy accumulator
> Why: GP §6.2: γ_Z is "the epoch's root, a Bandersnatch ring root composed with the one Bandersnatch key of each of the next epoch's validators".

### Q What is γ_S?
@ State touched
- [ ] The staging validator set
- [x] The current epoch's slot-sealer sequence: E tickets, or E Bandersnatch keys in fallback mode
- [ ] The next epoch's ticket accumulator
- [ ] The set of block seals seen this epoch
> Why: GP §6.2: γ_S is the slot-sealer sequence, "either a full complement of E tickets or, in the case of a fallback mode, a sequence of E Bandersnatch keys".

### Q What is γ_A?
@ State touched
- [ ] The accumulation queue for work-reports
- [ ] The active validator set
- [x] The ticket accumulator: the best-scoring ticket identifiers so far, used for the next epoch
- [ ] The list of authors of recent blocks
> Why: GP §6.2: γ_A is "a sequence of highest-scoring ticket identifiers to be used for the next epoch", at most E long.

### Q What two fields make up a Safrole ticket?
@ State touched
- [x] An identifier (a hash) and an entry index
- [ ] A validator index and a signature
- [ ] A slot number and a seal
- [ ] A ring root and an entropy value
> Why: GP §6.2: a ticket is (id ∈ ℍ, entry index ∈ ℕ). The identifier is the Ring VRF output.

### Q How long is an epoch at full spec?
@ Inputs
- [ ] 12 slots
- [ ] 100 slots
- [x] 600 slots (one hour at 6 seconds each)
- [ ] 1 200 slots
> Why: E = 600 in the Definitions appendix; 600 × 6 s = 3 600 s.

### Q How long is an epoch at tiny spec?
@ Inputs
- [x] 12 slots
- [ ] 6 slots
- [ ] 60 slots
- [ ] 600 slots
> Why: tiny E = 12 (lasair `lib/spec.ml`, test-vectors tiny table).

### Q What is the ticket-submission tail start Y at full spec?
@ Validation rules and what they guard
- [ ] 100
- [ ] 300
- [x] 500
- [ ] 599
> Why: Definitions: Y = 500, "the number of slots into an epoch at which ticket-submission ends". Tiny uses 10.

### Q What is the maximum number of tickets in one block's tickets extrinsic (K) at full spec?
@ Validation rules and what they guard
- [ ] 2
- [ ] 8
- [x] 16
- [ ] 600
> Why: Definitions: K = 16. Tiny uses 3.

### Q What is τ in the Safrole chapter?
@ State touched
- [ ] The number of tickets in the accumulator
- [x] The most recent block's timeslot index
- [ ] The epoch index
- [ ] The time until the tail start
> Why: GP §6.1: τ is the most recent block's slot index, and τ' ≡ H_T.

### Q How is the epoch index e computed from τ?
@ The transition in plain English
- [ ] e = τ mod E
- [x] e = ⌊τ / E⌋, with the remainder m being the slot within the epoch
- [ ] e = τ × E
- [ ] e = τ / 6
> Why: GP §6.1: e R m = τ / E, so e is the quotient and m the phase.

### Q What is a new epoch detected by?
@ The transition in plain English
- [ ] The header carrying a winners marker
- [ ] The ticket accumulator becoming full
- [x] The condition e' > e: the block's epoch index exceeds the prior block's
- [ ] Every 600th block in the chain
> Why: rotations happen "when e' > e" (GP §6.3). Blocks can skip slots, so it is not "every 600th block".

### Q How many entropy values does η hold?
@ State touched
- [ ] One
- [ ] Two
- [ ] Three
- [x] Four: the accumulator η₀ and three epoch-end snapshots η₁, η₂, η₃
> Why: GP §6.4: η ∈ ⟦ℍ⟧₄. η₀ accumulates; η₁–η₃ are the values at the end of the three most recent epochs.

### Q How is η₀ updated every block?
@ The transition in plain English
- [x] η₀' = Blake2b(η₀ ⌢ VRF output of the header's entropy signature H_V)
- [ ] η₀' = Keccak(η₀ ⌢ H_T)
- [ ] η₀' = the seal signature itself
- [ ] η₀ changes only at epoch boundaries
> Why: GP §6.4: η₀' ≡ H(η₀ ⌢ Y(H_V)).

### Q What happens to η₁, η₂, η₃ on an epoch transition?
@ The transition in plain English
- [ ] They are reset to zero
- [ ] Nothing, only η₀ changes
- [x] They shift: η₁' ← η₀, η₂' ← η₁, η₃' ← η₂
- [ ] η₃ becomes the new accumulator
> Why: GP §6.4: (η₁', η₂', η₃') ≡ (η₀, η₁, η₂) when e' > e.

### Q What is a validator key, byte for byte?
@ State touched
- [ ] 32 bytes Ed25519 only
- [ ] 96 bytes: Bandersnatch plus Ed25519 plus signature
- [x] 336 bytes: Bandersnatch 32, Ed25519 32, BLS 144, metadata 128
- [ ] 144 bytes: one BLS key
> Why: GP §6.3: validator keys are 𝕐₃₃₆ split into those four components in that order.

### Q Which validator key does Safrole use to seal blocks?
@ The transition in plain English
- [x] The Bandersnatch key
- [ ] The Ed25519 key
- [ ] The BLS key
- [ ] The metadata
> Why: the seal and entropy signatures are Bandersnatch VRF signatures under H_A, the author's Bandersnatch key (GP §6.4).

### Q At the start of each epoch, where does the new pending set γ_P' come from?
@ The transition in plain English
- [ ] From κ, the active set
- [x] From ι, the staging set, with offenders' keys replaced by null keys (Φ)
- [ ] From λ, the previous set
- [ ] From the tickets extrinsic
> Why: GP §6.3: γ_P' = Φ(ι) when e' > e; Φ zeroes any key whose Ed25519 part is in ψ_O'.

### Q On an epoch transition, what becomes the new active set κ'?
@ The transition in plain English
- [ ] ι
- [x] The prior pending set γ_P
- [ ] λ
- [ ] A random draw from all validators
> Why: GP §6.3: (γ_P', κ', λ', γ_Z') = (Φ(ι), γ_P, κ, z) when e' > e.

### Q On an epoch transition, what becomes λ'?
@ The transition in plain English
- [ ] γ_P
- [ ] ι
- [x] The prior active set κ
- [ ] It is emptied
> Why: GP §6.3: λ' ← κ at an epoch change, so last epoch's signatures stay verifiable.

### Q What does the null key Φ writes for an offender look like?
@ Validation rules and what they guard
- [ ] The offender's key with the metadata removed
- [x] A key made entirely of zeroes
- [ ] A copy of the manager's key
- [ ] The key is removed and the sequence shortens
> Why: GP §6.3: offender keys are "replaced with a null key containing only zeroes", so the sequence length is unchanged.

### Q What are the two modes of the slot-sealer sequence γ_S?
@ The transition in plain English
- [ ] Guaranteed and assured
- [x] Ticketed (E tickets) and fallback (E Bandersnatch keys)
- [ ] Tiny and full
- [ ] Active and previous
> Why: γ_S ∈ ⟦ticket⟧_E ∪ ⟦Bandersnatch key⟧_E (GP §6.2).

### Q What is Z, the outside-in sequencer?
@ The transition in plain English
- [ ] A sort by ticket identifier
- [x] A reordering [s₀, s_last, s₁, s_last−1, …] applied to the accumulator
- [ ] A shuffle using η₂
- [ ] A function that removes duplicate tickets
> Why: GP §6.5 defines Z(s) = [s₀, s_{|s|−1}, s₁, s_{|s|−2}, …].

### Q What is F, the fallback key sequence function?
@ The transition in plain English
- [ ] It picks the validators with the most tickets
- [ ] It sorts keys by Ed25519 value
- [x] It selects E Bandersnatch keys from a validator set using on-chain entropy
- [ ] It copies the previous epoch's γ_S
> Why: GP §6.5: F(r, k) picks, for each i, key k[E₄⁻¹(H(r ⌢ E₄(i))…4) mod |k|] and takes its Bandersnatch part.

### Q What is the epoch marker H_E?
@ The transition in plain English
- [ ] The list of tickets for the next epoch
- [x] On the first block of an epoch: the prior η₀ and η₁ plus the (Bandersnatch, Ed25519) keys of γ_P'
- [ ] The epoch index written into every header
- [ ] The offenders found this epoch
> Why: GP §6.6: H_E ≡ (η₀, η₁, [(k_b, k_e) | k ⟸ γ_P']) when e' > e, else ∅.

### Q What is the winning-tickets marker H_W?
@ The transition in plain English
- [ ] The ticket that sealed this block
- [ ] The ring root of the next epoch
- [x] Z(γ_A): the next epoch's ticket order, published on the first block at or after the tail start if the accumulator is full
- [ ] A list of validators who submitted tickets
> Why: GP §6.6: H_W ≡ Z(γ_A) when e' = e ∧ m < Y ≤ m' ∧ |γ_A| = E, else ∅.

### Q Who benefits most from the epoch and winners markers?
@ The transition in plain English
- [ ] Guarantors computing work-reports
- [x] Nodes that do not sync full state, tracking validator keys from headers alone
- [ ] Auditors choosing reports
- [ ] Services reading entropy
> Why: GP §6.6: markers "are particularly useful to nodes which do not synchronize the entire state", letting them track key changes from the header chain.

### Q What is the ticket identifier?
@ The transition in plain English
- [ ] The validator's index in γ_P
- [x] The Ring VRF output of the ticket proof, a 32-byte hash that also serves as its score
- [ ] The hash of the block that included the ticket
- [ ] The slot number the ticket claims
> Why: GP §6.7: n's identifiers are Y(proof); "used both as a score in the aforementioned contest and as input for the block's entropy source".

### Q Why is a Ring VRF used for tickets rather than an ordinary signature?
@ The transition in plain English
- [x] It proves membership of the key set without revealing which member made the ticket
- [ ] It is smaller than Ed25519
- [ ] It supports aggregation like BLS
- [ ] It does not need entropy
> Why: GP §6: the Ring VRF proof guarantees the author controlled a key in the sequence while keeping the ticket-to-validator correspondence anonymous.

### Q Which tickets win a place in the accumulator?
@ The transition in plain English
- [ ] The first E tickets submitted in the epoch
- [ ] The tickets from the most senior validators
- [x] The E tickets with the lowest identifiers, from the sorted union of old and new
- [ ] The tickets with the highest entry index
> Why: GP §6.7: γ_A' is the first E items of the new tickets merged with γ_A, ordered by id: "the accumulator becomes the lowest items of the sorted union".

### Q What must be true of the tickets extrinsic after slot phase Y?
@ Validation rules and what they guard
- [ ] It must contain exactly K tickets
- [x] It must be empty
- [ ] It may only contain fallback tickets
- [ ] It must include the winners marker
> Why: GP §6.7: |E_T| ≤ K when m' < Y, else 0. The contest closes at the tail start.

### Q What string prefixes the ticket seal context?
@ The transition in plain English
- [ ] `$jam_fallback_seal`
- [ ] `$jam_entropy`
- [x] `$jam_ticket_seal`
- [ ] `$jam_valid`
> Why: GP §6.4: X_T = `$jam_ticket_seal`, used in both the ticket proof and the ticketed seal.

### Q What does the Boolean H_T ("is ticketed") record?
@ The transition in plain English
- [ ] Whether the block contains tickets
- [x] Whether the block was sealed with a ticket (1) or with a fallback key (0)
- [ ] Whether the author submitted a ticket this epoch
- [ ] Whether the ticket accumulator is full
> Why: GP §6.4: H_T = 1 in the ticketed case and 0 in fallback; best-chain selection prefers ticket-sealed chains because they are more secure.

### Q What happened in lasair's F4 bug?
@ War story
- [ ] Tickets were sorted in descending order
- [x] γ_A's length was encoded as one byte instead of a compact natural, harmless at tiny and broken at full
- [ ] The epoch marker was written on every block
- [ ] The seal was verified with the Ed25519 key
> Why: F4 (`docs/FULL_SPEC_OFFLINE_TESTING.md`): 600 encodes compactly as two bytes, so the u8 read returned 130 and every full-spec epoch fell back.

## Level 2

### Q A block's slot is in the same epoch as its parent and past the tail start. What must its tickets extrinsic contain?
- [ ] Up to K tickets
- [ ] Exactly one ticket from the author
- [x] Nothing: an empty E_T
- [ ] Only tickets with entry index 0
> Why: |E_T| ≤ 0 when m' ≥ Y (GP §6.7). The next epoch's sequence is already fixed.

### Q The first block of epoch e+1 arrives. The previous block was at slot phase 550 (full spec) and γ_A holds 600 tickets. What is γ_S'?
- [x] Z(γ_A), the outside-in order of the accumulated tickets
- [ ] F(η₂', κ'), the fallback keys
- [ ] γ_S unchanged
- [ ] The tickets in the winners marker, unsorted
> Why: GP §6.5 first case: e' = e+1, m ≥ Y, |γ_A| = E ⇒ γ_S' = Z(γ_A).

### Q Same as before, but γ_A only reached 590 tickets. What is γ_S'?
- [ ] Z(γ_A) padded with zeros
- [ ] γ_S unchanged
- [x] F(η₂', κ'): fallback mode
- [ ] The block is invalid
> Why: the ticketed case needs |γ_A| = E; otherwise the "otherwise" branch F(η₂', κ') applies.

### Q The chain skips an entire epoch: the parent is in epoch e and the new block is in epoch e+2. What is γ_S'?
- [ ] Z(γ_A)
- [x] F(η₂', κ'), because e' ≠ e+1
- [ ] γ_S unchanged
- [ ] It is left empty
> Why: the ticketed case requires e' = e + 1 exactly; a skipped epoch falls through to the fallback branch.

### Q A block's tickets extrinsic lists two tickets whose identifiers are out of ascending order. What happens?
- [ ] They are re-sorted by the importer
- [x] The block is invalid: new tickets must already be ordered by identifier and unique
- [ ] Only the second ticket is dropped
- [ ] It is valid if both fit in the accumulator
> Why: GP §6.7: n = ⟦x_id⟧ ordered-unique; the extrinsic "must already have been placed in order of their implied identifier".

### Q A ticket in E_T has an identifier already present in γ_A. What happens?
- [ ] It is ignored
- [ ] It replaces the old one
- [x] The block is invalid: new identifiers must be disjoint from the accumulator's
- [ ] It increases that ticket's score
> Why: GP §6.7: {x_id | x ∈ n} ⫗ {x_id | x ∈ γ_A}. Prevents submitting the same ticket twice.

### Q The accumulator is full with low identifiers and a block includes a ticket whose identifier is higher than all of them. What happens?
- [ ] It is added and the highest old ticket is removed
- [x] The block is invalid: every submitted ticket must survive into γ_A'
- [ ] It is kept as a reserve
- [ ] It is valid but uncounted
> Why: n ⊆ γ_A' (GP §6.7): "It is invalid to include useless tickets in the extrinsic."

### Q Which entropy value is in the context of the ticket proofs submitted during epoch e?
- [ ] η₀'
- [ ] η₁'
- [x] η₂'
- [ ] η₃'
> Why: GP §6.7: the proof context is X_T ⌢ η₂' ⌢ entry index.

### Q Which entropy value is in the seal context when verifying a block's seal?
- [ ] η₀'
- [ ] η₁'
- [ ] η₂'
- [x] η₃'
> Why: GP §6.4: ticketed seal context X_T ⌢ η₃' ⌢ i_entry; fallback X_F ⌢ η₃'.

### Q Why does the fallback sequence use η₂' and not η₀?
- [ ] η₀ is always zero in fallback mode
- [x] η₀ is still being influenced by current block authors; η₂' is fixed well before the epoch it seeds
- [ ] η₂ is larger
- [ ] Fallback keys must match the ticket context exactly
> Why: GP §6.4: η₂ "is utilized to help ensure future entropy is unbiased" and seeds F. The reasoning that a value authors can still influence would let them bias who seals is a derivation, not GP text.

### Q At full spec there are 1 023 validators in γ_P'. What is the entry-index bound n = ⌈2E/|γ_P'|⌉?
- [ ] 1
- [x] 2
- [ ] 3
- [ ] 16
> Why: ⌈1200 / 1023⌉ = 2 (GP 0.8.0 §6.7). This matches the old constant N = 2.

### Q Why does 0.8.0 give each validator more ticket entries when there are fewer validators?
- [ ] To reward small networks
- [x] So the accumulator can still be saturated to E tickets
- [ ] To make tickets cheaper to verify
- [ ] Because the ring root is smaller
> Why: GP §6.7: "To ensure the accumulator can be saturated, when there are fewer validators, each validator is permitted more tickets."

### Q A validator was found guilty in disputes during epoch e. When does its key stop being eligible to become active?
- [ ] Immediately, it is removed from κ
- [x] When ι next moves into γ_P, Φ replaces its key with zeroes; it would have become active one epoch later
- [ ] Never, disputes do not affect Safrole
- [ ] When λ rotates out
> Why: Φ applies to ι → γ_P' at an epoch change (GP §6.3). κ' ← γ_P unfiltered, so the nulled key would be in κ the epoch after.

### Q Which validator's keys does the epoch marker announce?
- [ ] The current active set κ
- [x] γ_P': the set that becomes active in the following epoch
- [ ] The previous set λ
- [ ] The staging set ι before filtering
> Why: GP §6.6: H_E carries the (Bandersnatch, Ed25519) keys of each k ⟸ γ_P'.

### Q In which block exactly does the winning-tickets marker appear?
- [ ] The first block of the next epoch
- [ ] Every block after the tail start
- [x] The first block in the epoch whose slot phase crosses Y (m < Y ≤ m'), if γ_A is full
- [ ] The last block of the epoch
> Why: GP §6.6: e' = e ∧ m < Y ≤ m' ∧ |γ_A| = E.

### Q What happens to γ_A at the start of a new epoch?
- [ ] It keeps the old tickets
- [x] It restarts: new tickets merge with the empty sequence, not with the old γ_A
- [ ] It is copied into γ_P
- [ ] It becomes the winners marker
> Why: GP §6.7: γ_A' merges n with ∅ when e' > e, else with γ_A.

### Q In ticketed mode, what links the block's seal to the scheduled ticket?
- [ ] The author index equals the ticket's entry index
- [x] The seal's VRF output must equal the scheduled ticket's identifier
- [ ] The ticket appears in the block's extrinsic
- [ ] The seal is signed with the Ed25519 key
> Why: GP §6.4: i_id = Y(H_S) with i = γ_S'[H_T] (cyclic).

### Q In fallback mode, what must be true of the author?
- [ ] They must hold a ticket
- [x] Their Bandersnatch key H_A must equal the key γ_S' schedules for this slot
- [ ] They must be the manager service
- [ ] Any active validator may author
> Why: GP §6.4 fallback case: i = H_A.

### Q A validator submits a ticket with entry index n (equal to the bound). What happens?
- [ ] It is valid
- [x] The block is invalid: entry indices must be in ℕ_n, i.e. strictly below n
- [ ] It is converted to entry index 0
- [ ] It counts twice
> Why: GP §6.7: entry index ∈ ℕ_n, and ℕ_n means naturals less than n.

## Level 3

### Q Explain in three sentences how a ticket becomes permission to author a block.
> Hint: follow the ticket from the extrinsic to the next epoch's seal.
> Answer: During epoch e, validators submit Ring VRF ticket proofs anchored to η₂' and the next epoch's ring root γ_Z'. The lowest E identifiers accumulate in γ_A; at the first block of epoch e+1 (if the accumulator filled before the tail start) γ_S' = Z(γ_A). The validator who made the ticket for slot i proves it by producing a seal whose VRF output equals that ticket's identifier.

### Q Why does Safrole keep ticket authors anonymous until they seal?
> Hint: what could an attacker do if they knew the author of every future slot?
> Answer: If the author of a future slot were known, it could be targeted, for example with a denial-of-service attack timed to that slot, or bribed. The Ring VRF proves a ticket came from some validator in the set without revealing which one, so the author is revealed only by the seal itself.

### Q When does Safrole fall back to key-based sealing, and what is lost?
> Hint: three conditions have to hold for the ticketed case.
> Answer: Fallback applies unless the new block is in exactly the next epoch, the previous block was at or past the tail start, and the accumulator reached E tickets. In fallback, F picks E Bandersnatch keys from κ' using η₂'. What is lost is anonymity: anyone can compute who seals each slot, and the GP treats ticket-sealed blocks as more secure in best-chain choice.

### Q Why are there four entropy values, and which one is used where?
> Hint: bias resistance needs values fixed before anyone could influence them.
> Answer: η₀ accumulates every block's VRF output. η₁, η₂, η₃ are the accumulator at the ends of the last three epochs. η₂' is the ticket context and seeds the fallback sequence; η₃' is in the seal context. Using snapshots fixed epochs earlier stops current block authors from biasing ticket scores or who seals (derivation from the GP's "help ensure future entropy is unbiased").

### Q What does the epoch marker contain, and why does it exist?
> Hint: think of a light client following only headers.
> Answer: On the first block of an epoch: the prior η₀ and η₁ and the (Bandersnatch, Ed25519) keys of γ_P', the set that becomes active next. It lets nodes that do not hold state track validator-set changes and compute fallback keys from the header chain alone.

### Q What does the tickets extrinsic have to satisfy for a block to be valid?
> Hint: there are five rules: count, order, uniqueness, disjointness, usefulness.
> Answer: At most K tickets before the tail start and none after; each proof valid under γ_Z' with context X_T ⌢ η₂' ⌢ entry index, with entry index below n; the identifiers strictly ascending with no duplicates; none already in γ_A; and every new ticket must survive into γ_A'.

### Q Walk through key rotation at an epoch boundary.
> Hint: four values move at once.
> Answer: When e' > e, γ_P' = Φ(ι) with offenders' keys zeroed, κ' = γ_P, λ' = κ, and γ_Z' becomes the ring root of γ_P'’s Bandersnatch keys. The keys that seal in the new epoch are the ones that were pending, and the ring root now authorizes tickets for the epoch after.

### Q What changed in Safrole between 0.7.2 and 0.8.0?
> Hint: validator counts stopped being a constant.
> Answer: The ticket entry-index bound became n = ⌈2E/|γ_P'|⌉ instead of a constant, so small validator sets get more entries. Validator sequences became resizable, any multiple of 3 between 6 and 3C. Terminology changed to "slot-sealer sequence". Sealing, entropy, markers and Z/F are otherwise unchanged.

### Q Tell the F4 story in under a minute.
> Hint: 600 does not fit in a byte.
> Answer: γ_A's length is a compact natural; lasair read and wrote it as one byte. At tiny, E = 12, so both encodings match and everything passed. At full, 600 encodes as two bytes, so the reader got 130, misaligned every ticket, never saw a full accumulator, and every epoch fell back. It was caught offline by the full-spec Safrole vector before the fuzzer reached it.

### Q Why is Safrole's state described as independent of the rest of the protocol?
> Hint: which other components does it touch?
> Answer: γ only interacts with the rest of the state through ι and κ (the prospective and active keys), τ and η. Its internals, the pending set, ring root, sealer sequence and accumulator, are read by nothing else, which keeps the block-production logic self-contained.

### Q How does a node know which slot of γ_S applies to a block?
> Hint: γ_S has exactly E entries.
> Answer: The entry used is γ_S'[H_T] with cyclic subscription, i.e. index H_T mod E, which is the block's slot phase within the epoch.
