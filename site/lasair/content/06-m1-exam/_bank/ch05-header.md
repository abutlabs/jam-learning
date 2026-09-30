---
chapter: ch05-header
---

## Level 1

### Q How many fields does the header have?
@ The ten fields
- [ ] 7
- [ ] 8
- [x] 10
- [ ] 12
> Why: eq. header: parent, prior state root, extrinsic hash, timeslot, epoch mark, winners mark, offenders mark, author index, VRF signature, seal.

### Q What does H_P, the parent hash, equal?
@ The ten fields
- [x] Blake2b of the parent header's encoding
- [ ] Keccak of the parent header
- [ ] The parent's posterior state root
- [ ] The parent's extrinsic hash
> Why: H_P ≡ ℋ(ℰ(P(H))).

### Q Which state does H_R, the prior state root, commit to?
@ The ten fields
- [ ] The posterior state of this block
- [x] The prior state σ, which is the parent's posterior state
- [ ] The genesis state
- [ ] Only the service accounts
> Why: H_R ≡ M_σ(σ), the Merkle root of the prior state.

### Q What does H_X commit to?
@ The ten fields
- [ ] The header's own fields
- [x] The block's extrinsic data
- [ ] The validator set
- [ ] The next epoch's tickets
> Why: The extrinsic hash is a Merkle commitment to the block's extrinsic.

### Q What type is the header timeslot H_T?
@ The ten fields
- [ ] A 64-bit natural
- [x] A 32-bit natural (a timeslot)
- [ ] A hash
- [ ] An epoch index
> Why: H_T ∈ ℕ_{2^32}, the timeslot set.

### Q What is H_I?
@ The ten fields
- [x] The author's index into the posterior active set κ'
- [ ] The author's Ed25519 key
- [ ] The index of the core the author serves
- [ ] The height of the block
> Why: H_I ∈ ℕ_{|κ'|}; the author's Bandersnatch key is κ'[H_I].

### Q What is H_A, the author's Bandersnatch key?
@ The ten fields
- [ ] A header field that is serialized
- [x] An equivalence κ'[H_I], not serialized in the header
- [ ] The seal signature
- [ ] The parent author's key
> Why: §5: H_A is merely an equivalence and is not serialized as part of the header.

### Q What kind of signature is the seal H_S?
@ The ten fields
- [ ] Ed25519
- [x] Bandersnatch
- [ ] BLS
- [ ] Ring VRF proof
> Why: The header has two Bandersnatch signatures: the entropy-yielding VRF signature and the seal.

### Q What does H_V, the VRF signature, provide?
@ The ten fields
- [ ] The block's state root
- [x] The block's entropy contribution
- [ ] The next epoch's keys
- [ ] The list of offenders
> Why: H_V is the entropy-yielding VRF signature.

### Q What does the unsigned header encoding leave out?
@ The ten fields
- [ ] The parent hash
- [ ] The VRF signature
- [x] The seal
- [ ] The author index
> Why: Headers may be serialized with and without the seal; the unsigned form excludes H_S and is what the seal signs.

### Q What type is the offenders marker H_O?
@ The ten fields
- [x] A sequence of Ed25519 keys
- [ ] An optional sequence of tickets
- [ ] A sequence of Bandersnatch keys
- [ ] A single hash
> Why: H_O ∈ ⟦ℍ_E⟧: Ed25519 keys of newly misbehaving validators.

### Q When is the epoch marker H_E present?
@ The ten fields
- [ ] On every block
- [x] Only on the first block of a new epoch
- [ ] Only on the last block of an epoch
- [ ] Only on blocks with tickets
> Why: eq. epochmarker: non-∅ when e' > e.

### Q What does the epoch marker contain?
@ The ten fields
- [x] The prior η₀ and η₁, and the (Bandersnatch, Ed25519) keys of the newly pending set γ_P'
- [ ] The new η₀' and the active set κ'
- [ ] The 600 winning tickets
- [ ] The offenders list
> Why: eq. epochmarker: (η₀, η₁, [(k_b, k_e) | k ⟸ γ_P']).

### Q What does the winners marker H_W contain?
@ The ten fields
- [ ] The epoch's entropy
- [x] The sealing tickets for the next epoch, E of them
- [ ] One ticket per validator
- [ ] The Ed25519 keys of the next validators
> Why: H_W ∈ ⟦ticket⟧_E?, Z(γ_A), the outside-in ordered accumulator.

### Q How many tickets does the winners marker hold at full?
@ The ten fields
- [ ] 16
- [ ] 341
- [x] 600
- [ ] 1023
> Why: It holds E tickets, and E = 600 at full (12 at tiny).

### Q Which hash function computes the parent hash and the extrinsic hash?
@ Validation rules and what they guard
- [x] Blake2b
- [ ] Keccak
- [ ] SHA-256
- [ ] Blake2s
> Why: Both use ℋ, Blake2b-256.

### Q What must be true of H_T relative to the parent?
@ Validation rules and what they guard
- [ ] It equals the parent's slot plus one
- [x] It is strictly greater than the parent's slot
- [ ] It is within the same epoch
- [ ] It may be equal to the parent's slot
> Why: P(H)_t < H_T.

### Q What must be true of H_T relative to wall time?
@ Validation rules and what they guard
- [x] H_T × 6 seconds must not exceed the current JAM time
- [ ] It must be within 24 hours of wall time
- [ ] It must be exactly the current slot
- [ ] It must be at least one epoch old
> Why: H_T · P ≤ 𝒯.

### Q How much ancestry must an implementation keep to validate blocks?
@ Validation rules and what they guard
- [ ] 8 blocks
- [ ] One epoch
- [x] Headers from the previous 24 hours (L = 14 400 slots)
- [ ] All headers since genesis
> Why: §5: store headers of ancestors authored in the previous L = 24 hours.

### Q How many elements are in the sequence hashed to make the extrinsic hash?
@ Validation rules and what they guard
- [ ] 3
- [x] 5
- [ ] 6
- [ ] 10
> Why: a = [ℰ_T(E_T), p, g, ℰ_A(E_A), ℰ_D(E_D)].

### Q In 0.8.0, what does each preimage contribute to the extrinsic hash?
@ Validation rules and what they guard
- [ ] Its full encoded data
- [x] A pair of its 4-octet service index and the Blake2b hash of its data
- [ ] Only the service index
- [ ] Nothing; preimages are not committed
> Why: p = ℰ(↕[(ℰ₄(s), ℋ(d)) | (s, d) ⟸ E_P]). This per-item form is new in 0.8.0 (GP #524).

### Q What does each guarantee contribute to the extrinsic hash?
@ Validation rules and what they guard
- [x] The Blake2b hash of its report, its 4-octet slot, and its credential
- [ ] Its full encoded report only
- [ ] Only the core index
- [ ] The guarantor's public key
> Why: g = ℰ(↕[(ℋ(r), ℰ₄(t), ↕a) | (r, t, a) ⟸ E_G]).

### Q Which header value is the posterior state root of the parent block?
@ Validation rules and what they guard
- [ ] H_X
- [ ] H_P
- [x] H_R
- [ ] H_V
> Why: The prior state root is by definition the parent's posterior state.

### Q What happens to a block with a future timeslot?
@ Edge cases
- [ ] It is discarded permanently
- [x] It is invalid for now but may become valid as time advances
- [ ] It is accepted and its slot corrected
- [ ] Its author is added to offenders
> Why: §5: blocks considered invalid by this rule may become valid as the clock advances.

### Q For a block with an empty extrinsic, what is H_X?
@ Edge cases
- [ ] The zero hash
- [x] A hash of the five encodings of empty sequences, not the zero hash
- [ ] Omitted from the header
- [ ] The parent's extrinsic hash
> Why: The construction always hashes five components, each an empty sequence's encoding.

### Q Which blockchains put the posterior state root in the header, unlike JAM?
@ The transition in plain English
- [x] Polkadot and Ethereum
- [ ] Only Bitcoin
- [ ] Solana and Cosmos
- [ ] None
> Why: §5: carrying the prior root is a departure from both Polkadot and the Yellow Paper's Ethereum.

### Q Why does JAM carry the prior rather than the posterior state root?
@ The transition in plain English
- [ ] To save header space
- [x] To allow pipelining of block computation, especially Merklization
- [ ] To support light clients
- [ ] To make forks impossible
> Why: §5: done to facilitate pipelining of block computation and in particular of Merklization.

### Q Does the genesis header have a parent?
@ Edge cases
- [ ] Yes, the zero hash block
- [x] No; all other headers have a parent, and consensus over genesis is presumed
- [ ] Yes, the previous epoch's last block
- [ ] Only in tiny
> Why: §5: excepting the genesis header, all headers have an associated parent.

### Q Which set does a header's author index belong to in 0.8.0?
@ The ten fields
- [ ] ℕ_1023
- [x] ℕ_{|κ'|}
- [ ] ℕ_C
- [ ] ℕ_E
> Why: H_I ∈ ℕ_{|κ'|}; 0.7.2 used a fixed validator-index set.

### Q What function maps a header to its parent header?
@ Validation rules and what they guard
- [x] P
- [ ] Υ
- [ ] ℋ
- [ ] M_σ
> Why: §5 defines P as the mapping from a header to its parent.

### Q Which fields are signatures?
@ The ten fields
- [ ] H_P and H_R
- [ ] H_X and H_T
- [x] H_V and H_S
- [ ] H_E and H_W
> Why: The two Bandersnatch signatures are the VRF signature and the seal.

## Level 2

### Q A node imports a block and computes posterior root X. When does it learn whether X matches everyone else?
- [ ] Immediately, from this block's header
- [x] When the next block arrives, whose H_R must equal X
- [ ] At the end of the epoch
- [ ] When Grandpa finalizes the block
> Why: The header carries the prior root, so only the child's header commits to this block's posterior state.

### Q The parent is at slot 100. Which child slot is valid, assuming the wall clock allows it?
- [ ] 100
- [ ] 99
- [x] 105
- [ ] Any slot, as long as it is in the same epoch
> Why: The child slot must be strictly greater than the parent's; skipped slots are allowed.

### Q A block is the first of a new epoch and carries no epoch marker. What follows?
- [x] The block is invalid
- [ ] The marker is optional
- [ ] Nodes derive the marker from state
- [ ] The block is valid but cannot be finalized
> Why: eq. epochmarker defines H_E as non-∅ exactly when e' > e; a missing marker does not match.

### Q A block in the middle of an epoch carries an epoch marker. What follows?
- [ ] It is ignored
- [x] The block is invalid
- [ ] The marker resets η
- [ ] The epoch changes early
> Why: The marker must be ∅ unless e' > e.

### Q When exactly is the winners marker present?
- [ ] On the first block of every epoch
- [x] On the first block in an epoch at or past the tail start Y, when the accumulator holds E tickets
- [ ] On every block after Y
- [ ] Whenever E_T is non-empty
> Why: eq. winningticketsmarker: e' = e, m < Y ≤ m', and |γ_A| = E.

### Q Why is H_I an index into κ' rather than κ?
- [x] On an epoch-boundary block the author belongs to the newly active set
- [ ] Because κ is not in the header
- [ ] Because κ' is smaller
- [ ] To save a byte
> Why: At the boundary κ' takes the new set, and the block's author is from it.

### Q A block carries two preimages and one guarantee. How many per-item leaves feed p and g?
- [ ] 1 and 2
- [x] 2 and 1
- [ ] 3 and 0
- [ ] Neither; they are hashed as whole extrinsics
> Why: One (service, hash) pair per preimage, one (report hash, slot, credential) per guarantee.

### Q Why are preimages and guarantees hashed per item in the extrinsic hash?
- [ ] To make hashing faster
- [x] So a single report or preimage can be proven included without the whole extrinsic
- [ ] Because they are signed
- [ ] Because tickets require it
> Why: §5: care is taken so reports and preimages can individually have their inclusion proven.

### Q lasair's early compute_extrinsic_hash assumed empty disputes. When did it fail?
- [ ] On every block
- [x] On the first fuzzer block carrying real verdicts, which failed with bad_extrinsic_hash
- [ ] Only at full spec
- [ ] Never; tests caught it first
> Why: L2b seed 3571347957 stalled at step 2 until the real commitment was wired.

### Q An author signs the seal. Over what?
- [x] The unsigned header, all fields except the seal
- [ ] The full header including the seal
- [ ] Only the extrinsic hash
- [ ] Only the parent hash
> Why: The unsigned encoding exists so the seal can sign everything but itself.

### Q A report's lookup anchor is 30 hours old at full. Is keeping headers for 24 hours enough to judge it?
- [x] Yes: an anchor older than L = 24 hours is invalid anyway, so it cannot be needed
- [ ] No, all headers must be kept
- [ ] Only in tiny
- [ ] Only if it is finalized
> Why: The 24-hour rule follows from the maximum lookup-anchor age.

### Q Which header field's VRF output is folded into the entropy accumulator η₀' each block?
- [ ] H_S, the seal
- [x] H_V, the entropy-yielding VRF signature
- [ ] H_X, the extrinsic hash
- [ ] H_E, the epoch marker
> Why: §6: η₀' ≡ ℋ(η₀ ⌢ Y(H_V)). The epoch marker only reports a rotation; it does not cause one.

### Q Which change in 0.8.0 affects the author index definition?
- [ ] It became an Ed25519 key
- [x] Its domain is ℕ_{|κ'|} rather than a fixed validator-index set
- [ ] It moved into the extrinsic
- [ ] It was removed
> Why: 0.8.0 removed the fixed validator count, so the domain follows the active set's size.

### Q Can the offenders marker be non-empty on a block without disputes?
- [ ] Yes, on any block
- [x] No: it lists validators newly made offenders by this block's disputes
- [ ] Only on epoch boundaries
- [ ] Only in tiny
> Why: H_O must match the culprits and faults ψ' gains in this block.

### Q A node receives a block. What is checked about the header before the extrinsic?
- [x] Known parent, slot ordering and not in the future, prior state root, extrinsic hash, then seal and VRF
- [ ] Only the seal
- [ ] Only the state root
- [ ] Nothing until accumulation
> Why: Header checks need only the parent, clock and state; Safrole then checks the two signatures.

## Level 3

### Q Explain the prior-state-root design and its cost.
> Hint: pipelining, then the next block.
> Answer: The header commits to the state the block was built on so authors can seal and publish before finishing the expensive Merklization of the new state. The cost is that an importer cannot check its result against the block it just imported, only against the next block's header.

### Q Describe how the extrinsic hash is computed in 0.8.0.
> Hint: five components, two of them per item.
> Answer: Blake2b of the encoding of the Blake2b-many of five items: the encoded tickets, a sequence of (service index, data hash) per preimage, a sequence of (report hash, slot, credential) per guarantee, the encoded assurances and the encoded disputes.

### Q Tell the war story of the extrinsic hash.
> Hint: disputes.
> Answer: lasair hardcoded the disputes part of the extrinsic hash as empty because no vector had ever carried disputes. The first fuzzer block with verdicts failed with bad_extrinsic_hash before disputes were even processed. Fixing it moved the seed forward and exposed missing disputes import and ρ clearing.

### Q What do the three markers do, and when is each present?
> Hint: epoch, winners, offenders.
> Answer: The epoch marker, on the first block of an epoch, carries the prior η₀, η₁ and the new pending keys. The winners marker, on the block that crosses the tail start with a full accumulator, carries the next epoch's sealing tickets. The offenders marker lists validators newly found misbehaving by this block's disputes.

### Q Why keep 24 hours of ancestry?
> Hint: lookup anchors.
> Answer: A work-report's lookup anchor must be no older than L = 14 400 slots, 24 hours. Older headers can never be needed to validate a report, so they can be pruned.

### Q What are the two Bandersnatch signatures, and what does each prove?
> Hint: seal and entropy.
> Answer: The seal proves the author held the slot, under a ticket or the fallback key, and signs the unsigned header. The VRF signature yields the block's entropy output, which is folded into η.

### Q Why does a future-dated block become valid later rather than being rejected outright?
> Hint: time only moves forward.
> Answer: The rule only says the slot must not exceed wall time. An honest author with a slightly fast clock is not malicious, so the block becomes valid once the clock catches up. Nodes hold it rather than discard it.

### Q Why is the author's Bandersnatch key not serialized in the header?
> Hint: it can be derived.
> Answer: It is κ'[H_I], derivable from the author index and posterior state, so storing it would be redundant.

### Q What do light clients gain from the epoch and winners markers?
> Hint: minimising data transfer.
> Answer: They can follow validator changes and the next epoch's sealing keys from headers alone, without state, which minimises data needed to determine the validator keys for any epoch.

### Q What is an importer's order of checks on a header?
> Hint: cheap first.
> Answer: The parent is known, the slot is later than the parent's and not in the future, the prior state root matches its computed root, the extrinsic hash matches the carried extrinsic, and then the seal and VRF signature verify under the slot's key. Only then is the extrinsic processed.
