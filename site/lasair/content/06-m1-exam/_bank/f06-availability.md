---
chapter: f06-availability
---

## Level 1

### Q Does the work-package bundle itself go into a JAM block?
@ What you already know
- [ ] Yes, as calldata in the guarantees extrinsic
- [x] No, only the work-report goes in; the bundle is held off-chain in pieces
- [ ] Yes, as a blob attached to the header
- [ ] Only for packages larger than 48 KB
> Why: The block carries the report (a commitment). The bundle is erasure-coded and each validator keeps a piece (GP 0.8.0 ch. 11 and Erasure Coding appendix).

### Q What is the Ethereum idea closest to JAM's availability step?
@ What you already know
- [ ] Gas refunds
- [ ] Account nonces
- [x] Data availability for rollups
- [ ] The mempool
> Why: Both answer "can the inputs behind a result still be fetched by whoever wants to verify it?". JAM's version is a vote about data held off-chain.

### Q What do guarantors do to the package bundle so it can be spread across validators?
@ What JAM does
- [x] Erasure-code it into one piece per validator
- [ ] Encrypt it to the next validator set
- [ ] Compress it and post it on-chain
- [ ] Hash it and throw the data away
> Why: Erasure coding cuts the bundle into as many pieces as there are validators, with redundancy so a fraction of pieces rebuilds it.

### Q At full scale, roughly what fraction of the pieces is enough to rebuild the bundle?
@ What JAM does
- [ ] All of them
- [ ] Two thirds
- [ ] Half
- [x] About one third (342 of 1 023)
> Why: The erasure code needs about a third of the pieces: 342 of 1 023 at full scale.

### Q What is an assurance?
@ What JAM does
- [ ] A guarantor's signature on a work-report
- [x] A validator's signed bitfield saying, per core, whether it holds its piece
- [ ] An auditor's judgment that a report is valid
- [ ] A ticket bidding for a sealing slot
> Why: An assurance has one bit per core and is signed with the validator's Ed25519 key, anchored to the parent block.

### Q Which extrinsic carries assurances?
@ What JAM does
- [ ] E_G
- [ ] E_T
- [x] E_A
- [ ] E_D
> Why: E_A is the assurances extrinsic. E_G is guarantees, E_T tickets, E_D disputes.

### Q Which key does a validator sign its assurance with?
@ What JAM does
- [x] Its Ed25519 key
- [ ] Its Bandersnatch key
- [ ] Its BLS key
- [ ] The guarantor's key
> Why: Assurances are signed under the validator's Ed25519 key in κ (ch. 11 sheet).

### Q When does a report become available?
@ What JAM does
- [ ] When the guarantors sign it
- [ ] When one third of validators assure it
- [x] When more than two thirds of validators have set its core's bit
- [ ] After exactly 5 slots
> Why: The availability rule is a count greater than 2/3 of the active validator set (eq. availableworkreports).

### Q At full scale, how many assurances make a report available?
@ What JAM does
- [ ] 342
- [ ] 512
- [x] 683
- [ ] 1 023
> Why: More than 2/3 of 1 023 means at least 683.

### Q At tiny scale (6 validators), how many assurances make a report available?
@ What JAM does
- [ ] 3
- [ ] 4
- [x] 5
- [ ] 6
> Why: More than 2/3 of 6 is more than 4, so 5.

### Q What is the assurance timeout?
@ What JAM does
- [ ] 1 slot
- [x] 5 slots
- [ ] 10 slots
- [ ] One epoch
> Why: A report whose registration slot is 5 or more slots before the block's slot is cleared (U = 5).

### Q What happens to a report that times out?
@ What JAM does
- [ ] It moves to the ready queue
- [ ] The guarantors are punished
- [x] Its core is cleared and the report is dropped
- [ ] It is accumulated anyway
> Why: Timeout clears the core's assignment; nothing is accumulated and the core can take new work.

### Q Within a block, which is processed first for a core: assurances or new guarantees?
@ What JAM does
- [x] Assurances
- [ ] New guarantees
- [ ] They are processed in parallel with no order
- [ ] Whichever arrives first on the network
> Why: A core has one slot; assurances (and timeouts) empty it before guarantees can refill it (ρ‡ then ρ').

### Q What does bold R stand for?
@ The words and symbols
- [ ] The ready queue
- [x] The work-reports that became available in this block
- [ ] The recent history
- [ ] The refine invocation
> Why: Bold R is the sequence of newly available work-reports. The ready queue is ω; recent history is β.

### Q What is ρ?
@ The words and symbols
- [ ] The entropy pool
- [ ] The disputes record
- [x] The per-core slot where a guaranteed report waits for availability
- [ ] The accumulation output
> Why: ρ holds at most one availability assignment per core.

### Q Why do auditors need availability?
@ Why it is built this way
- [ ] To collect fees
- [x] They must rebuild the bundle to re-run refine
- [ ] To choose the next block author
- [ ] To compute the state root
> Why: Auditing (ch. 17) re-executes refine, which needs the original data.

### Q Why is the timeout needed?
@ Why it is built this way
- [ ] To punish slow validators
- [ ] To reward fast assurers
- [x] So a package whose data never spread cannot block its core forever
- [ ] To let the author choose a new sealer
> Why: The GP keeps the registration slot "so that it can be cleared if it is not made available quickly enough".

### Q How long must the audit pieces be kept?
@ Why it is built this way
- [ ] Forever
- [x] Until the report has been audited
- [ ] One block
- [ ] Exactly one epoch
> Why: Audit-DA data need not be retained after the report is audited; exported segments are kept longer.

## Level 2

### Q A report landed in slot 100. It is still short of the threshold when the block for slot 105 arrives. What happens?
- [ ] It gets one more slot of grace
- [x] It is timed out and its core cleared
- [ ] It becomes available with a warning
- [ ] It moves to the ready queue
> Why: The clearing condition is H_T ≥ t + 5, and 105 ≥ 100 + 5.

### Q In one block, 700 of 1 023 validators set the bit for core 12. What happens to core 12's report?
- [x] It becomes available, joins R and leaves ρ
- [ ] Nothing yet; 1 023 are needed
- [ ] It is timed out
- [ ] It becomes available only if the guarantors re-sign
> Why: 700 is more than 2/3 of 1 023 (682), so the core's report is available.

### Q An assurance sets a bit for a core that has no pending report. What is the effect?
- [ ] The bit is ignored
- [ ] The core is marked available anyway
- [x] The block is invalid
- [ ] The validator is punished in ψ
> Why: A bit may be set only for a core with an assignment in ρ† (ch. 11 rules).

### Q Why is "more than two thirds" chosen, when about one third of pieces rebuilds the data?
- [ ] Two thirds pieces are needed to decode
- [x] It leaves room for up to a third of assurers to be lying or offline while enough honest pieces remain
- [ ] It matches the GRANDPA quorum by coincidence
- [ ] It keeps blocks small
> Why: Reasoning from the two thresholds (the GP states the thresholds, not this sentence): with more than 2/3 claiming to hold pieces, even if under 1/3 lie, over 1/3 honest pieces exist.

### Q Where does the analogy "JAM availability is like Ethereum blobs" break?
- [ ] JAM uses no erasure coding
- [x] The data never goes in a JAM block; validators vote that they hold pieces off-chain
- [ ] JAM data is kept forever
- [ ] JAM needs every node to download everything
> Why: JAM blocks carry the report and the assurance votes, not the bundle.

### Q The active validator set changes size at an epoch boundary. What happens to pending reports?
- [ ] Nothing
- [ ] They become available automatically
- [x] Every core is cleared
- [ ] They move to the next core
> Why: ρ‡ clears every core if |κ| ≠ |κ'| (eq. availassignmentspostassurancesdef); the GP says such items "can be viewed as having timed out early". Why: the piece-per-validator mapping no longer fits (reasoning, not GP text).

## Level 3

### Q Explain in your own words what "available" means and why a report must be available before it is settled.
> Hint: who needs the data later, and how much of it do they need?
> Answer: Available means more than two thirds of validators have signed that they hold their erasure-coded piece of the package bundle, so the bundle can be rebuilt from about a third of the pieces. It matters because auditors must rebuild the bundle to re-run refine and check the guarantors. If the data could vanish, a bad report could never be caught.

### Q Walk through what happens to one core's pending report across the next few blocks, both when it becomes available and when it does not.
> Hint: two exits from ρ.
> Answer: Each block, assurances are counted per core. Once more than 2/3 of validators have set the bit, the report joins R (newly available) and leaves ρ, and accumulation takes it. If instead a block arrives 5 or more slots after the report was registered and it still has not crossed the line, the core is cleared and the report dropped. Either way the core is then free for a new guarantee in the same block.

### Q Compare JAM availability with Ethereum data availability.
> Hint: where is the data, and who promises what?
> Answer: On Ethereum the data is attached to the chain itself (calldata or blobs), so availability comes from the chain carrying it. In JAM the bundle never enters a block. Guarantors erasure-code it into one piece per validator, and validators sign bitfields claiming they hold their piece. The chain only records the votes. The data only needs to be kept until auditing is done.
