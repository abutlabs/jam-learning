---
chapter: ch10-disputes
---

## Level 1

### Q What is a judgment in JAM's disputes system?
@ The transition in plain English
- [ ] A block author's decision to include a report
- [x] A validator's signed vote on whether a work-report is valid
- [ ] The final state root after a dispute
- [ ] A fine paid by a guarantor
> Why: GP §10: judgments are "consequential votes amongst most of the validators over the validity of a work-report".

### Q What is a verdict?
@ The transition in plain English
- [x] A collection of judgments on one work-report
- [ ] A single auditor's opinion
- [ ] The punishment given to an offender
- [ ] A new block after a fork
> Why: GP §10: "Such collections of judgments are known as verdicts."

### Q What is an offense in the disputes system?
@ The transition in plain English
- [ ] Any negative judgment
- [x] A judgment or guarantee that dissents from an established verdict
- [ ] A block with too many tickets
- [ ] Missing an assurance
> Why: GP §10: offenses are "judgments and guarantees which dissent with an established verdict".

### Q Which state component holds the disputes state?
@ State touched
- [ ] χ
- [ ] π
- [x] ψ
- [ ] ρ
> Why: ψ ≡ (ψ_G, ψ_B, ψ_W, ψ_O) (GP §10.1).

### Q What are the four parts of ψ?
@ State touched
- [ ] Verdicts, culprits, faults, offenders
- [x] Good set, bad set, wonky set, offenders (punish set)
- [ ] Active, previous, staging, pending
- [ ] Reports, assurances, guarantees, audits
> Why: GP §10.1: ψ ≡ (good, bad, wonky, offenders).

### Q What does the good set ψ_G contain?
@ State touched
- [x] Hashes of work-reports judged correct
- [ ] Keys of honest validators
- [ ] Reports awaiting accumulation
- [ ] Guarantees with three signatures
> Why: GP §10.1: good, bad and wonky sets hold hashes of reports judged correct, incorrect, or impossible to judge.

### Q What does the wonky set ψ_W contain?
@ State touched
- [ ] Reports with invalid signatures
- [x] Hashes of work-reports it appears impossible to judge
- [ ] Reports with too little gas
- [ ] Offender keys from the previous epoch
> Why: GP §10.1: wonky is for reports "that it appears impossible to judge".

### Q What does the offenders set ψ_O contain?
@ State touched
- [ ] Report hashes
- [ ] Bandersnatch keys
- [x] Ed25519 keys of validators found to have misjudged or misguaranteed
- [ ] Service ids that panicked
> Why: GP §10.1: the punish-set is "a set of Ed25519 keys representing validators which were found to have misjudged a work-report".

### Q What three parts make up the disputes extrinsic E_D?
@ Inputs
- [x] Verdicts, culprits and faults
- [ ] Tickets, preimages and assurances
- [ ] Good, bad and wonky
- [ ] Votes, signatures and roots
> Why: GP §10.2: E_D ≡ (E_V, E_C, E_F).

### Q What is a culprit?
@ Inputs
- [ ] A validator who missed a block
- [x] A validator who guaranteed a work-report that was found invalid
- [ ] A validator who voted valid on a good report
- [ ] A service that failed accumulation
> Why: GP §10.2: culprits prove misbehavior "by guaranteeing a work-report found to be invalid".

### Q What is a fault?
@ Inputs
- [ ] A PVM page fault
- [ ] A missing assurance
- [x] A validator's judgment that contradicts the report's established validity
- [ ] A header with the wrong state root
> Why: GP §10.2: faults are proofs of "signing a judgment found to be in contradiction to a work-report's validity".

### Q What does a culprit entry contain?
@ Inputs
- [ ] Report hash, epoch index, judgments
- [x] Report hash, the offender's Ed25519 key, and their signature
- [ ] Report hash, validity bit, key, signature
- [ ] Only the offender's key
> Why: GP §10.2: E_C ∈ ⟦(ℍ, ℍ_E, signature)⟧.

### Q What does a fault entry contain that a culprit entry does not?
@ Inputs
- [ ] An epoch index
- [x] A validity bit (the vote the offender cast)
- [ ] A work-report
- [ ] A Bandersnatch proof
> Why: GP §10.2: E_F ∈ ⟦(ℍ, {⊤, ⊥}, ℍ_E, signature)⟧.

### Q What three things does a verdict entry contain?
@ Inputs
- [ ] Hash, key, signature
- [x] A report hash, an epoch index, and a sequence of judgments
- [ ] A report, a core, and a timeslot
- [ ] Good, bad, and wonky counts
> Why: GP §10.2: each verdict is (ℍ, epoch index, ⟦(validity, index, signature)⟧).

### Q Which validator keys can sign judgments in a verdict?
@ Validation rules and what they guard
- [ ] Any key ever registered
- [x] The Ed25519 keys of κ (current epoch) or λ (previous epoch)
- [ ] Only the guarantors of the report
- [ ] Bandersnatch keys of γ_P
> Why: GP §10.2: verdicts come "from either the active validator set or the previous epoch's validator set".

### Q What epoch index may a verdict carry?
@ Validation rules and what they guard
- [ ] Any epoch
- [x] The prior state's epoch index ⌊τ/E⌋ or one less
- [ ] Only the next epoch
- [ ] Only epoch 0
> Why: GP §10.2: the verdict's epoch term "must be either the epoch index of the prior state or one less"; K picks κ for the current, λ otherwise.

### Q How many judgments must a verdict contain?
@ Validation rules and what they guard
- [ ] Exactly one-third of the validators
- [ ] At least half
- [x] Exactly ⌊2|k|/3⌋ + 1 of the chosen key set
- [ ] All validators
> Why: GP §10.2: |judgments| = ⌊⅔|k|⌋ + 1 with k = K(epoch).

### Q A verdict's positive-vote count equals ⌊2|k|/3⌋ + 1. What is the verdict?
@ Validation rules and what they guard
- [x] Good
- [ ] Bad
- [ ] Wonky
- [ ] Invalid
> Why: GP §10: V = ⊤ when t = ⌊⅔|k|⌋ + 1.

### Q A verdict has zero positive votes. What is it?
@ Validation rules and what they guard
- [ ] Good
- [x] Bad
- [ ] Wonky
- [ ] Invalid
> Why: V = ⊥ when t = 0.

### Q A verdict's positive-vote count equals ⌊|k|/3⌋. What is it?
@ Validation rules and what they guard
- [ ] Good
- [ ] Bad
- [x] Wonky
- [ ] Invalid
> Why: V = ∅ (wonky) when t = ⌊⅓|k|⌋.

### Q What string prefixes a valid judgment's signed message?
@ Validation rules and what they guard
- [x] `$jam_valid`
- [ ] `$jam_guarantee`
- [ ] `$jam_available`
- [ ] `$jam_entropy`
> Why: GP §10.2: X_⊤ = `$jam_valid`, X_⊥ = `$jam_invalid`, followed by the report hash.

### Q What message does a culprit's signature sign?
@ Validation rules and what they guard
- [ ] `$jam_invalid` ⌢ report hash
- [x] `$jam_guarantee` ⌢ report hash
- [ ] The block header
- [ ] `$jam_valid` ⌢ report hash
> Why: GP §10.2: culprit signatures are in 𝔼_k⟨X_G ⌢ r⟩: the guarantee they signed.

### Q A culprit's report must be in which set after this block?
@ Validation rules and what they guard
- [ ] ψ_G'
- [x] ψ_B'
- [ ] ψ_W'
- [ ] Any of them
> Why: GP §10.2: culprit rule requires r ∈ ψ_B'.

### Q How must the verdicts in E_V be ordered?
@ Validation rules and what they guard
- [ ] By epoch index
- [x] By report hash, with no duplicates
- [ ] By number of votes
- [ ] In any order
> Why: GP §10.2: E_V ordered-unique by report hash.

### Q How must culprits and faults each be ordered?
@ Validation rules and what they guard
- [ ] By report hash
- [x] By the offender's Ed25519 key, with no duplicates
- [ ] By validator index
- [ ] By timeslot
> Why: GP §10.2: culprits and faults are each ordered-unique by the validator's Ed25519 key.

### Q How must the judgments inside one verdict be ordered?
@ Validation rules and what they guard
- [ ] By validity, positives first
- [x] By validator index, with no duplicates
- [ ] By Ed25519 key
- [ ] Unordered
> Why: GP §10.2: judgments ordered-unique by judge index.

### Q What happens to a core's availability assignment when its report gets a bad or wonky verdict?
@ The transition in plain English
- [ ] Nothing
- [x] It is cleared in ρ† so the report will not become available or be accumulated
- [ ] It is moved to the ready queue
- [ ] It is re-guaranteed on another core
> Why: GP §10 eq. removenonpositive: ρ†[c] = ∅ for reports with verdict ⊥ or ∅.

### Q Where do new offenders' keys appear in the header?
@ The transition in plain English
- [ ] In the epoch marker
- [x] In the offenders marker H_O: culprit keys then fault keys
- [ ] In the winners marker
- [ ] They are not in the header
> Why: GP §10.3: H_O ≡ [culprit keys] ⌢ [fault keys], exactly the new offenders.

### Q What is the maximum number of verdicts in one block at full spec?
@ 0.7.2 → 0.8.0
- [ ] 1
- [ ] 8
- [x] 16
- [ ] 341
> Why: Definitions: C_maxextrinsicverdicts = 16 (new bound in 0.8.0). Culprits and faults are each capped at 16 too.

### Q Why record good verdicts at all?
@ The transition in plain English
- [ ] To pay the guarantors
- [x] So that the same report cannot be disputed again later
- [ ] To speed up accumulation
- [ ] To reward auditors
> Why: GP §10: "recording reports found to be valid ensures that additional disputes cannot be raised in the future of the chain."

### Q Why record bad verdicts?
@ The transition in plain English
- [x] So invalid reports cannot be resubmitted
- [ ] So their guarantors get paid
- [ ] To make the chain smaller
- [ ] To compute statistics
> Why: GP §10: recording invalid reports "is important to ensure that said reports are not allowed to be resubmitted".

### Q Does the JAM chain itself slash offenders' stake?
@ The transition in plain English
- [ ] Yes, during the same block
- [x] No: it records offenders; a higher-level staking system acts on the record
- [ ] Yes, at the next epoch
- [ ] Only the manager can
> Why: GP §10: the on-chain record is for "higher-level validator-selection logic", e.g. slashing on a staking parachain.

### Q What found lasair's disputes blind spot?
@ War story
- [ ] A disputes STF vector
- [x] The tiny-to-full audit and an L2b fuzzer seed carrying the first real disputes block
- [ ] A user report
- [ ] PolkaJam's logs
> Why: `docs/TINY_TO_FULL_AUDIT.md`: all STF vectors passed, but disputes were never wired into block import; seed 3571347957 moved from step 2 to 6 once fixed.

## Level 2

### Q With 1 023 validators in κ, how many positive votes make a good verdict?
- [ ] 512
- [ ] 341
- [x] 683
- [ ] 1 023
> Why: ⌊2·1023/3⌋ + 1 = 682 + 1 = 683.

### Q With 1 023 validators, how many positive votes make a verdict wonky?
- [ ] 0
- [x] 341
- [ ] 342
- [ ] 512
> Why: ⌊1023/3⌋ = 341.

### Q At tiny (6 validators), what are the good, bad and wonky positive-vote counts?
- [ ] 4, 0, 3
- [x] 5, 0, 2
- [ ] 6, 0, 3
- [ ] 5, 1, 2
> Why: ⌊12/3⌋ + 1 = 5 for good; 0 for bad; ⌊6/3⌋ = 2 for wonky. Each verdict holds exactly 5 judgments.

### Q At tiny, a verdict has 5 judgments with 3 positive. What happens?
- [ ] It is good
- [ ] It is wonky
- [x] The block is invalid: 3 matches none of the allowed tallies
- [ ] It is recorded as bad
> Why: V is only defined for t ∈ {5, 0, 2} at tiny; any other count invalidates the extrinsic.

### Q A verdict judged the report good. What else must the extrinsic contain?
- [ ] At least two culprits
- [x] At least one fault for that report
- [ ] A guarantee
- [ ] Nothing
> Why: GP §10: ∀ (r, ⊤) ∈ v, ∃ (r, …) ∈ E_F.

### Q In 0.8.0, a bad verdict arrives with no culprits. Is that valid on this rule alone?
- [x] Yes: 0.8.0 dropped the two-culprit minimum for bad verdicts
- [ ] No: it needs two culprits
- [ ] No: it needs one fault
- [ ] Only in the previous epoch
> Why: 0.8.0 removed the culprit minimum (GP #525); only "good needs a fault" remains.

### Q A verdict names a report hash already in ψ_B. What happens?
- [ ] It is merged
- [x] The block is invalid: verdict hashes must be disjoint from ψ_G ∪ ψ_B ∪ ψ_W
- [ ] It flips the report to good
- [ ] It is ignored
> Why: GP §10.2: verdict report hashes ⫗ good ∪ bad ∪ wonky.

### Q A culprit names a validator key already in ψ_O. What happens?
- [ ] They are punished twice
- [x] The block is invalid: offender keys must be in k = (κ ∪ λ) Ed25519 keys minus ψ_O
- [ ] It is ignored
- [ ] Their key is removed from ψ_O
> Why: GP §10.2: k = {i_ed | i ∈ λ ∪ κ} ∖ ψ_O.

### Q A fault's validity bit is ⊤ (valid) for a report that is in ψ_B'. Is it a proper fault?
- [x] Yes: voting valid on a bad report contradicts the verdict
- [ ] No: faults must vote invalid
- [ ] Only if the offender was a guarantor
- [ ] No: faults only apply to good reports
> Why: GP §10.2: r ∈ ψ_B' ⇔ r ∉ ψ_G' ⇔ v. For a bad report v must be ⊤: the fault is a valid vote on a bad report.

### Q A verdict uses epoch index ⌊τ/E⌋ − 1. Whose keys verify its judgments?
- [ ] κ
- [x] λ
- [ ] γ_P
- [ ] ι
> Why: K(a) = κ when a = ⌊τ/E⌋, λ otherwise.

### Q A report on core 3 is pending availability and gets a wonky verdict in this block. Can it be accumulated?
- [ ] Yes, wonky reports still accumulate
- [x] No: ρ†[3] is cleared before assurances are counted
- [ ] Only if assured this block
- [ ] Only after the next epoch
> Why: ρ† clears ⊥ and ∅ verdicts; assurances are processed against ρ†, so it never becomes available.

### Q A block's disputes bring 2 new culprit keys and 1 new fault key. What must H_O be?
- [ ] Empty
- [ ] The 3 keys sorted together
- [x] The 2 culprit keys (in extrinsic order) followed by the 1 fault key
- [ ] Only the fault key
> Why: GP §10.3: H_O ≡ culprit keys ⌢ fault keys, exactly the new offenders.

### Q What lasair bug did the audit find in verdict classification?
- [ ] It sorted verdicts backwards
- [x] It used "minority ≥ 2" instead of the exact tallies {0, ⌊V/3⌋, ⌊2V/3⌋+1}
- [ ] It counted negative votes
- [ ] It ignored λ
> Why: `docs/TINY_TO_FULL_AUDIT.md`, fixed on 2026-06-28: thresholds are exact values, not inequalities.

### Q Why is the wonky threshold exactly one-third rather than "anything in between"?
- [ ] Wonky means one-third are offline
- [x] The GP footnote calls the three tallies the decision thresholds for its three possible actions; the security analysis is in the cited paper
- [ ] It is arbitrary and unimportant
- [ ] It matches the erasure-coding rate
> Why: GP footnote: "these happen to be the decision thresholds for our three possible actions", citing ePrint 2024/961.

### Q A fault's report is not in ψ_B' and not in ψ_G'. Is the fault valid?
- [ ] Yes, faults can target any report
- [x] No: the rule r ∈ ψ_B' ⇔ r ∉ ψ_G' ⇔ v cannot hold for a report in neither set
- [ ] Only if it is wonky
- [ ] Yes if signed by λ
> Why: the biconditional needs the report to have a definite good-or-bad outcome.

## Level 3

### Q Walk through what happens when a block carries a bad verdict.
> Hint: follow ψ, ρ and the header.
> Answer: The verdict is checked: right epoch index, exactly ⌊2|k|/3⌋+1 correctly signed judgments, zero positive. The report hash joins ψ_B'. Any core whose pending report is that report is cleared in ρ†. Culprits (its guarantors) and any faults are checked and their keys join ψ_O'. H_O lists exactly those new keys.

### Q Explain the difference between a culprit and a fault.
> Hint: one signed a guarantee, one signed a judgment.
> Answer: A culprit guaranteed a report that ended up in the bad set; the evidence is their guarantee signature. A fault cast a judgment contradicting the final verdict, voting valid on a bad report or invalid on a good one; the evidence is their judgment signature and its validity bit.

### Q Why does a verdict need exactly two-thirds plus one judgments?
> Hint: security assumption on liveness.
> Answer: The GP's security assumptions include that at least two-thirds plus one validators are live (footnote to eq. verdicts). Requiring exactly that many signatures from the chosen key set ensures a supermajority took part, and the exact positive count then classifies the report as good, bad or wonky.

### Q Why can a verdict use the previous epoch's validators?
> Hint: disputes can straddle an epoch boundary.
> Answer: Audits and judgments on a report may happen around an epoch change. Allowing epoch index ⌊τ/E⌋ − 1 lets judgments by λ's keys still count, so a rotation does not invalidate a dispute in progress. (The GP states the rule; this motivation is a derivation, not GP text.)

### Q What does the chain do about offenders, and what does it leave to others?
> Hint: record versus punish.
> Answer: The chain records offenders' Ed25519 keys in ψ_O and the header's offenders marker, and Safrole nulls their keys when ι moves into γ_P. Economic punishment such as slashing is left to a higher-level staking system that reads this record.

### Q Why must a good verdict come with at least one fault?
> Hint: why would a good report be disputed at all?
> Answer: The GP states the rule without a reason. A reasonable reading is that a dispute only arises because someone voted invalid; if the report is good, that negative voter is by definition a fault, so the evidence must include them (derivation, not GP text).

### Q What changed in the disputes chapter in 0.8.0?
> Hint: bounds and one removed rule.
> Answer: Verdicts, culprits and faults are each capped at 16 per block; judgment sequences are length-prefixed with length ⌊2|k|/3⌋+1 of the chosen set. The two-culprit minimum for bad verdicts was dropped. (The test vectors also renumbered their disputes error codes, GP #525; that is a vectors change, not GP text.)

### Q Tell lasair's disputes war story in 60 seconds.
> Hint: vectors passed, blocks did not.
> Answer: The disputes STF passed every vector, but no trace or seed had ever carried disputes, so block import had never run it. The first fuzzer block with real verdicts failed: the extrinsic hash hardcoded empty disputes, the codec threw, and ρ was never cleared. An audit also found inexact tallies. Wiring it in moved the seed forward. Lesson: passing a component's vectors does not prove it inside the block.

### Q Why are disputes rare, yet essential?
> Hint: auditing usually agrees.
> Answer: Audits normally affirm the guarantors, so verdicts should be rare. But they are the backstop that removes invalid reports from the pipeline, bans offenders, and coordinates reverting any chain that accumulated a bad report.

### Q What ordering and uniqueness rules apply to E_D?
> Hint: three sequences, three sort keys.
> Answer: Verdicts are sorted by report hash with no duplicates and none already judged; judgments in each verdict by validator index, unique; culprits and faults each by offender Ed25519 key, unique. Canonical order makes the extrinsic deterministic to encode and check.
