---
chapter: ch11-reporting-assurance
---

## Level 1

### Q What is chapter 11 of the Graypaper about, in one line?
@ What this is for
- [ ] How Safrole chooses the block author for each slot
- [x] How guaranteed work-reports enter the chain, get assured as available, and either become accumulatable or time out
- [ ] How a work-package is executed by the refine code
- [ ] How services store preimages and pay deposits
> Why: Chapter 11 is the on-chain half of in-core computation: guarantees bring reports in, assurances make them available, timeouts clear them.

### Q Which Greek letter names the availability assignments?
@ State touched
- [ ] ω
- [ ] ψ
- [ ] α
- [x] ρ
> Why: ρ holds, per core, the guaranteed report awaiting availability. α is the authorizer pool, ψ disputes, ω the ready queue.

### Q How many pending reports can a single core hold in ρ at once?
@ State touched
- [ ] Up to three, one per guarantor
- [ ] Up to eight, like recent history
- [x] At most one
- [ ] Unlimited, queued by slot
> Why: ρ is a sequence of C optional entries: each core has one slot, either empty or holding one guarantee and its timestamp.

### Q In GP 0.8.0, what does each non-empty entry of ρ hold?
@ State touched
- [ ] The work-report and a countdown of remaining slots
- [x] The full guarantee plus the slot it was reported in
- [ ] The erasure-coded bundle
- [ ] Just the work-report
> Why: 0.8.0 changed ρ to store the whole guarantee (report, slot, credential) plus a timestamp (GP #494). 0.7.2 stored the bare report and a timeout.

### Q Which two extrinsics does chapter 11 process?
@ Inputs
- [ ] Disputes and tickets
- [ ] Preimages and guarantees
- [x] Assurances and guarantees
- [ ] Tickets and preimages
> Why: E_A (assurances) and E_G (guarantees). Disputes are chapter 10, tickets chapter 6, preimages chapter 12.

### Q Which extrinsic is processed first in chapter 11, and why?
@ The transition in plain English
- [ ] They are processed in parallel with no ordering
- [ ] Assurances, because they are larger
- [ ] Guarantees, because a report must exist before it can be assured
- [x] Assurances, because each core has one slot and it must be freed before a new guarantee can fill it
> Why: ρ‡ (after assurances) is computed from ρ†, and ρ' (after guarantees) from ρ‡. Freeing first lets a core be refilled in the same block.

### Q What is a work-report?
@ The objects
- [ ] A service's storage after accumulation
- [ ] A validator's bitfield of which chunks it holds
- [x] The guarantors' signed summary of refining one work-package: its availability spec, context, core, authorizer, and one digest per work-item
- [ ] The raw input data a builder sends to a core
> Why: eq. workreport. The package is the input; the report is the result that goes on-chain.

### Q How many work-digests can one work-report carry?
@ The objects
- [ ] 1 to 8
- [ ] 1 to 341
- [ ] Exactly one
- [x] 1 to 16
> Why: One digest per work-item, and a package has 1 to C_maxpackageitems = 16 items.

### Q What is a work-digest?
@ The objects
- [x] The on-chain summary of one work-item's refinement: service, code hash, payload hash, accumulate gas limit, result and counters
- [ ] The hash of the whole work-package
- [ ] The Merkle root of the erasure-coded chunks
- [ ] A guarantor's signature over the report
> Why: eq. workdigest. It is what accumulation later consumes.

### Q What does the availability spec's "erasure root" commit to?
@ The objects
- [x] The Merkle root over the erasure-coded chunks of the bundle and exported segments
- [ ] The state root after accumulation
- [ ] The list of guarantor keys
- [ ] The authorizer's code
> Why: eq. avspec. One chunk per validator; assurers check their chunk against this root.

### Q What does the availability spec's "segment root" commit to?
@ The objects
- [ ] The previous block's header
- [ ] The report's digests
- [ ] The work-package's authorization token
- [x] The segments the package exports
> Why: A constant-depth Merkle tree over the exported segment hashes, so later packages can import them.

### Q In 0.8.0, what must the availability spec's erasure shard count equal?
@ The objects
- [ ] 1023 always
- [ ] The number of cores
- [x] The number of active validators, |κ'|
- [ ] The number of work-items
> Why: One chunk per validator. The field was added in 0.8.0 (GP #514/#527).

### Q What is the refinement context of a report?
@ The objects
- [ ] The guarantors' identities
- [ ] The gas used by accumulation
- [x] The anchor block, the lookup-anchor block and the prerequisite packages the refinement depended on
- [ ] The core's authorizer pool
> Why: eq. workcontext. It pins the state the refine was computed against.

### Q What are the prerequisites in a refinement context?
@ The objects
- [ ] Services that must pay for the work
- [x] Hashes of work-packages that must be accumulated before this report can be
- [ ] Validators who must sign the report
- [ ] Earlier blocks that must be finalised
> Why: Prerequisites are package hashes; accumulation holds the report until they are accumulated.

### Q What is the maximum combined number of prerequisites plus segment-root lookup entries in one report?
@ The objects
- [ ] 16
- [ ] 128
- [x] 8
- [ ] 3
> Why: C_maxreportdeps = 8 bounds |lookup| + |prerequisites|.

### Q What is the maximum total size of the authorizer trace plus successful digest outputs in one report?
@ The objects
- [ ] 4 KiB
- [ ] About 13.8 MB
- [x] 48 KiB
- [ ] 1 MiB
> Why: C_maxreportvarsize = 48·2¹⁰ octets. About 13.8 MB (W_B = 13,791,360 octets) is the work-package bundle limit, not the report.

### Q What does an assurance contain?
@ The transition in plain English
- [ ] A ring-VRF ticket
- [ ] A verdict on a report's validity
- [x] An anchor (the parent hash), a bitfield with one bit per core, a validator index and a signature
- [ ] A work-report and three signatures
> Why: Each validator says, per core, whether it holds its chunk of the pending package.

### Q An assurance's anchor must equal which header field?
@ The transition in plain English
- [ ] The author index H_I
- [ ] The extrinsic hash H_X
- [x] The parent hash H_P
- [ ] The prior state root H_R
> Why: Assurances anchor on the parent so they cannot be replayed against a different fork.

### Q How many assurances make a report available?
@ Validation rules and what they guard
- [ ] All of them
- [ ] At least half
- [x] More than two-thirds of the validators
- [ ] At least 1/3 of the validators
> Why: A core's report becomes available when its bit is set by more than 2/3·|κ| assurances.

### Q At full spec, how many assurances are needed for availability?
@ Validation rules and what they guard
- [x] 683
- [ ] 341
- [ ] 512
- [ ] 682
> Why: More than 2/3 of 1023 is more than 682, so 683.

### Q At tiny spec (6 validators), how many assurances are needed for availability?
@ Edge cases
- [ ] 3
- [ ] 4
- [ ] 6
- [x] 5
> Why: More than 2/3 of 6 is more than 4, so 5.

### Q How many bytes is an assurance bitfield at full spec?
@ War story
- [x] 43
- [ ] 341
- [ ] 1
- [ ] 32
> Why: One bit per core: ⌈341/8⌉ = 43 bytes. At tiny (2 cores) it is 1 byte.

### Q After how many slots is an unassured report cleared from its core?
@ Validation rules and what they guard
- [ ] 600
- [x] 5
- [ ] 10
- [ ] 1
> Why: C_assurancetimeoutperiod = 5. A report reported at slot t is cleared once H_T ≥ t + 5.

### Q What is the name of the set of reports that became available in this block?
@ State touched
- [ ] ω, the ready queue
- [ ] ξ, the accumulated history
- [x] **R**, the newly available work-reports
- [ ] ψ_b, the bad set
> Why: The GP writes it as bold R (eq. availableworkreports); it feeds accumulation in chapter 12.

### Q What does a guarantee contain?
@ The transition in plain English
- [ ] A bitfield and one signature
- [ ] A work-package and its payload
- [ ] A ticket and a VRF proof
- [x] A work-report, a slot, and a credential of 2 or 3 validator signatures
> Why: The credential is 2 to 3 (validator index, Ed25519 signature) pairs.

### Q What is the minimum number of guarantor signatures on a guarantee?
@ Validation rules and what they guard
- [x] 2
- [ ] More than 2/3 of validators
- [ ] 3
- [ ] 1
> Why: A credential has 2 or 3 entries, so no single validator can vouch alone.

### Q How many guarantors are assigned to each core?
@ The transition in plain English
- [ ] 10
- [x] 3
- [ ] 2
- [ ] 1
> Why: The assignment function gives each active core three validators (⌊i/3⌋ before shuffling).

### Q Which entropy value shuffles the current guarantor assignments?
@ The transition in plain English
- [ ] The header's VRF output directly
- [x] η₂'
- [ ] η₁
- [ ] η₀
> Why: G is built by shuffling with η₂'; G* for a previous-epoch rotation uses η₃'.

### Q How often do guarantor-to-core assignments rotate at full spec?
@ The transition in plain English
- [ ] Never
- [ ] Every slot
- [x] Every 10 slots
- [ ] Every epoch
> Why: C_rotationperiod = R = 10 (4 at tiny).

### Q What is the maximum total accumulate gas across all digests of one report?
@ Validation rules and what they guard
- [ ] 5 billion
- [x] 10 million (G_A)
- [ ] 50 million
- [ ] 3.5 billion
> Why: Σ digest gas limits ≤ G_A = C_reportaccgas = 10,000,000.

### Q A report's authorizer hash must be found where?
@ Validation rules and what they guard
- [ ] In the ready queue ω
- [ ] In recent history β
- [ ] In the service's storage
- [x] In the core's authorizer pool α[core]
> Why: Chapter 8's pool is the set of authorizers that work on that core may currently use.

### Q A report's anchor block must be found where?
@ Validation rules and what they guard
- [ ] In the ready queue
- [x] In recent history (β†)
- [ ] In the authorizer queue
- [ ] In the disputes state
> Why: The anchor's hash, state root, belt peak and (0.8.0) slot must match an entry of β†.

### Q What is the maximum age of a lookup anchor at full spec?
@ Validation rules and what they guard
- [ ] 600 slots
- [ ] 19,200 slots
- [ ] 8 blocks
- [x] 14,400 slots (24 hours)
> Why: C_maxlookupanchorage = 14,400. At tiny it is 24.

### Q How many guarantees for the same core may appear in one block?
@ Validation rules and what they guard
- [ ] Three, one per guarantor
- [x] At most one
- [ ] At most two
- [ ] Unlimited
> Why: Guarantees are ordered and unique by core.

### Q What happens to every availability assignment when the validator-set size changes between κ and κ'?
@ Edge cases
- [ ] They are moved to the ready queue
- [ ] Nothing
- [x] All of them are cleared
- [ ] Only timed-out ones are cleared
> Why: eq. availassignmentspostassurancesdef clears every core when |κ| ≠ |κ'|; the GP says such items can be viewed as having timed out early. (Why: chunks were distributed one per validator of the old set; that reasoning is not GP text.)

## Level 2

### Q A core holds a report guaranteed at slot 100 that nobody has assured. A block at slot 104 carries a new guarantee for that core. What happens?
- [x] The block is invalid: the core is still occupied, since the old report only times out at slot 105
- [ ] The new guarantee replaces the old report
- [ ] Both reports are kept
- [ ] The old report is moved to the ready queue
> Why: Clearing needs H_T ≥ t + 5 = 105. At 104 ρ‡[core] ≠ ∅, and a guarantee requires an empty core.

### Q Same core, same unassured report from slot 100, but the new block is at slot 105. What happens?
- [ ] The new guarantee must wait one more slot
- [ ] The old report becomes available automatically
- [ ] The block is invalid because the core is occupied
- [x] The old report times out in ρ‡ and the new guarantee can occupy the core in ρ'
> Why: 105 ≥ 100 + 5, so assurances processing clears it first, then guarantees fill the empty core.

### Q At tiny spec, 4 of the 6 validators set the bit for core 0 this block. What happens to core 0's report?
- [ ] It is cleared immediately
- [x] It stays pending in ρ (unless it timed out)
- [ ] It is judged bad
- [ ] It becomes available
> Why: Availability needs more than 2/3 of 6, which is 5. Four is not enough.

### Q A validator sets a bit for a core whose ρ† entry is empty. What is the result?
- [ ] The validator is added to the offenders
- [ ] The core becomes available with no report
- [x] The assurance is invalid, so the block is invalid
- [ ] The bit is ignored
> Why: A bit may be set only for a core with a pending assignment in ρ†.

### Q A report's anchor block is nine blocks older than the block being imported. What rejects it?
- [ ] The lookup-anchor age check
- [ ] The authorizer pool check
- [x] The anchor must be in recent history, which only holds the last 8 blocks
- [ ] Nothing; anchors can be any age
> Why: β† has at most C_recenthistorylen = 8 entries. The lookup anchor has a separate 24-hour limit.

### Q A report's lookup anchor is 20,000 slots older than the current block at full spec. What happens?
- [ ] Accepted if the anchor is in recent history
- [ ] Rejected, because lookup anchors must be in the last 8 blocks
- [x] Rejected: the lookup anchor must be at most 14,400 slots old
- [ ] Accepted, because only the anchor must be recent
> Why: lookup-anchor slot ≥ H_T − L with L = 14,400.

### Q A guarantee carries three signatures, but one signer is assigned to a different core. What happens?
- [x] The guarantee is invalid, because every credential entry must be a guarantor assigned to that core
- [ ] The signer is punished but the report is accepted
- [ ] The report is judged bad
- [ ] The two valid signatures are enough, the third is ignored
> Why: The rule applies to each credential entry. An unassigned signer makes the guarantee invalid.

### Q Full spec, τ' = 47, R = 10. Which guarantee slot is too old to be accepted?
- [ ] 40
- [ ] 30
- [ ] 47
- [x] 25
> Why: R·(⌊τ'/R⌋ − 1) ≤ slot ≤ τ' gives 30 ≤ slot ≤ 47. Slot 25 is more than one rotation back.

### Q Full spec, τ' = 47, R = 10, guarantee slot 35. Which assignment is used to check the signers?
- [ ] The staging set ι
- [ ] The current rotation G
- [x] The previous rotation G*
- [ ] Any validator in κ'
> Why: ⌊35/10⌋ = 3 differs from ⌊47/10⌋ = 4, so slot 35 is in the previous rotation.

### Q A report's digests set accumulate gas limits totalling 12 million. What happens?
- [x] The guarantee is invalid: the total must be at most G_A = 10 million
- [ ] It is accepted and waits in the ready queue
- [ ] Only the first 10 million is used
- [ ] The excess is refunded to the service
> Why: Σ gas limits ≤ C_reportaccgas. Each must also be at least the service's minimum accumulate gas.

### Q A digest names code hash X, but the service's current code hash in δ is Y. What happens?
- [ ] The digest is accumulated with code Y
- [ ] The digest is skipped, the rest accumulate
- [ ] The service's code is upgraded to X
- [x] The guarantee is invalid
> Why: Each digest's code hash must equal the service's current code hash, so accumulation runs against the code refinement assumed.

### Q A report's package hash already appears in ξ (the accumulated history). What happens?
- [ ] It replaces the old entry
- [ ] It waits in the ready queue
- [x] The guarantee is invalid: the package is already accumulated
- [ ] It is accumulated again
> Why: The package must not be in β's reported packages, ξ, the ready queue ω, or ρ.

### Q A report lists a prerequisite package that is neither in this block's guarantees nor in recent history. What happens?
- [ ] It waits in the ready queue until the prerequisite appears
- [ ] The prerequisite is ignored
- [x] The guarantee is invalid
- [ ] It is accumulated immediately
> Why: Every prerequisite and every segment-root lookup key must be in this extrinsic or in β.

### Q Two reports in the same block each list the other as a prerequisite. What happens?
- [x] Both pass these checks, but accumulation never releases them
- [ ] The later one is dropped
- [ ] The block is invalid
- [ ] Both are accumulated in order of core index
> Why: The GP notes these checks allow apparent dependency loops; accumulation never happens for them and "the reports are simply ignored".

### Q A guarantee's erasure shard count is 341 at full spec. What happens?
- [x] Rejected: it must equal |κ'| (1023)
- [ ] Rejected only if assurances disagree
- [ ] Accepted if all digests succeed
- [ ] Accepted, because there are 341 cores
> Why: One chunk per validator, so shards must equal the active validator count.

### Q Why does the assurance signature cover the parent hash as well as the bitfield?
- [ ] To prove the validator authored the parent
- [ ] To encode the timeslot
- [x] So an assurance cannot be replayed on a different fork or block
- [ ] Because the bitfield alone is too short to sign
> Why: The signed message is X_available ++ H(E(H_P, bitfield)), binding it to one parent.

### Q Why are more than two-thirds of assurances required when erasure coding can reconstruct from one-third?
- [x] It leaves margin: even if up to a third of assurers lie, at least a third honestly hold chunks
- [ ] Because guarantors do not count
- [ ] Because only two-thirds of chunks are real data
- [ ] Because the rate is 2:3
> Why: With over 2/3 assuring and at most 1/3 dishonest, more than 1/3 of honest holders remain, enough to decode. (The margin argument is reasoning from the thresholds.)

### Q A report guaranteed at slot t becomes available at slot t + 2. What does ρ look like after that block?
- [ ] The core holds the report and W is empty
- [ ] The report moves to ψ
- [x] The core is empty and the report is in **R** for accumulation
- [ ] The core still holds the report until slot t + 5
> Why: Available cores are removed in ρ‡, and the report is passed on in **R**.

## Level 3

### Q Walk through what happens to a core's report from guarantee to accumulation, in plain English.
> Hint: three stages: guarantee, assure, available (or timeout).
> Answer: A block's guarantees extrinsic carries the report with 2 or 3 assigned guarantor signatures; after all checks it occupies the core's slot in ρ with the current slot as timestamp. In later blocks each validator's assurance sets the core's bit if it holds its chunk. When more than 2/3 of validators have set it, the report leaves ρ and joins **R**, the newly available reports, which chapter 12 accumulates. If that does not happen within 5 slots, the report is cleared and the core is free again.

### Q Why are assurances processed before guarantees?
> Hint: how many reports can a core hold?
> Answer: Each core holds at most one pending report. Processing assurances first frees cores whose report became available or timed out, so a new guarantee for that core can be placed in the same block. The dependency graph encodes this: ρ' is computed from ρ‡.

### Q Name four checks that tie a guaranteed report to the recent state of the chain.
> Hint: anchor, lookup anchor, duplicates, dependencies.
> Answer: The anchor (hash, state root, belt peak, slot) must match an entry of recent history β†. The lookup anchor must be at most L slots old and match a known ancestor header whose child carries the matching state root. The package hash must not already be in β, ξ, the ready queue ω, or ρ. Every prerequisite and segment-root lookup key must be in this extrinsic or in β.

### Q How are guarantors assigned to cores, and why does it rotate?
> Hint: shuffle, then shift every R slots.
> Answer: The sequence ⌊i/3⌋ for each validator i is shuffled with η₂', giving each active core three validators, then rotated by ⌊(τ' mod E)/R⌋. It rotates every R = 10 slots so no fixed group controls a core. Guarantees from the previous rotation are checked against G*, which for a previous-epoch rotation uses λ' and η₃'.

### Q What does the 5-slot assurance timeout protect against?
> Hint: what if the data never gets distributed?
> Answer: The GP stamps each assignment with its slot "so that it can be cleared if it is not made available quickly enough". Otherwise a core would be blocked forever by a report whose package was never made available, for example if the guarantors withheld chunks. After 5 slots the report is dropped and the core can take new work.

### Q Why must a report's code hash match the service's current code?
> Hint: which code does accumulation run?
> Answer: Accumulation runs the service's current code. If the digest was produced against different code, the accumulate step would interpret results from a program it did not run. The check keeps refine and accumulate consistent at the time the report enters the chain.

### Q What changed in chapter 11 between 0.7.2 and 0.8.0? Name three things.
> Hint: ρ's contents, the refine context, the availability spec.
> Answer: ρ now stores the full guarantee plus a timestamp instead of bare report plus timeout (GP #494). The refinement context gained the anchor slot and the lookup-anchor posterior state root, both checked on-chain (GP #526). The availability spec gained the erasure shard count, which must equal |κ'| (GP #514/#527). Also, a validator-set size change now explicitly clears all assignments.

### Q What does the per-report gas limit of 10 million protect?
> Hint: think about the block total.
> Answer: It stops one report from claiming a large share of the block's accumulation budget. Each core's report can ask for at most G_A, so all cores together fit: G_A × 341 = 3.41 billion, within G_T = 3.5 billion. Each digest must also meet the service's minimum accumulate gas.

### Q Tell the F6 war story in 60 seconds.
> Hint: the bitfield is read twice.
> Answer: At full spec the assurance bitfield is 43 bytes. lasair computed core popularity for the C(13) core statistics by reading only byte 0 and shifting by the core index, so every core from 8 upward counted zero. The reference counted the real assurers, the cores section ran one byte short, and the root diverged at L2b seed 3571347957 step 6, exposed once F5 was fixed. The fix decoded byte ⌊c/8⌋, bit c mod 8 at both popularity sites, the pattern the availability check already used (lasair v1.4.2). Lesson: the same bitfield was decoded two ways in one codebase.

### Q Why must the credential have at least two signatures rather than one?
> Hint: accountability.
> Answer: The Graypaper requires 2 or 3 assigned guarantors so a single validator cannot put a report on-chain alone. Each signer puts its stake behind the report, and a bad report produces culprits (chapter 10). (The accountability argument is reasoning, the 2-to-3 rule is GP text.)

### Q What happens when the validator set changes size at an epoch boundary, and why?
> Hint: chunks per validator.
> Answer: Every availability assignment is cleared in ρ‡. Erasure chunks were distributed one per validator of the old set, so the assurance-by-index mapping no longer holds for the new set. The 0.8.0 vectors test this with report_with_shrunken_val_set.
