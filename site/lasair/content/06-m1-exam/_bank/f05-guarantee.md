---
chapter: f05-guarantee
---

## Level 1

### Q What is a guarantee?
@ What JAM does
- [ ] A validator's promise to author the next block
- [x] A work-report plus the signatures of guarantors who vouch for it
- [ ] An assurance that data is available
- [ ] A token deposit by the builder
> Why: A guarantee is (report, slot, credential of 2 or 3 signatures).

### Q How many guarantor signatures does a guarantee need?
@ What JAM does
- [ ] Exactly 1
- [x] 2 or 3
- [ ] All validators
- [ ] More than two thirds of validators
> Why: The credential has 2 to 3 entries.

### Q What kind of signature do guarantors use?
@ What JAM does
- [ ] Bandersnatch ring VRF
- [x] Ed25519
- [ ] BLS
- [ ] ECDSA secp256k1
> Why: The guarantor signs with its Ed25519 key over the guarantee context string plus the report hash.

### Q Where in a block do guarantees go?
@ The words and symbols
- [ ] The header
- [ ] The assurances extrinsic
- [x] The guarantees extrinsic, E_G
- [ ] The tickets extrinsic
> Why: E_G carries guaranteed work-reports.

### Q Where does an accepted report wait?
@ The words and symbols
- [ ] In recent history β
- [x] In its core's slot in ρ, the pending report per core
- [ ] In the ready queue ω
- [ ] In the service's storage
> Why: ρ'[core] takes (guarantee, current slot).

### Q How many pending reports can one core hold at a time?
@ The words and symbols
- [x] One
- [ ] Two
- [ ] Three
- [ ] Up to 16
> Why: ρ holds at most one assignment per core; a guarantee for an occupied core is rejected.

### Q When does a core's pending slot clear?
@ The words and symbols
- [ ] Only at the end of the epoch
- [x] When its report becomes available, or after 5 slots if it never does
- [ ] When the next guarantee arrives
- [ ] Only after audits finish
> Why: ρ‡ clears available cores and those older than the assurance timeout of 5 slots.

### Q Which validators may sign a guarantee for core 7?
@ What JAM does
- [ ] Any validator
- [ ] Only the block author
- [x] Validators assigned to core 7 in the current or previous rotation
- [ ] The service's owner
> Why: Each signer must be assigned to the report's core under the current or previous assignment.

### Q The report's authorizer must be where?
@ What JAM does
- [ ] In the service's storage
- [x] In the core's authorizer pool α
- [ ] In the header
- [ ] In recent history
> Why: The authorizer must be in α[core] at the time the report is guaranteed.

### Q How many recent blocks can a report's anchor be drawn from?
@ What JAM does
- [ ] 1
- [x] The last 8
- [ ] The last 600
- [ ] Any finalized block
> Why: The anchor must be in recent history, which holds 8 blocks.

### Q Which of these must match for the anchor check?
@ What JAM does
- [ ] Only the header hash
- [x] Header hash, state root, accumulation-output peak and slot
- [ ] Only the slot
- [ ] The number of cores
> Why: The anchor (hash, state root, belt peak, slot) must appear in β†.

### Q How old may the lookup anchor be at full size?
@ What JAM does
- [ ] 8 slots
- [ ] 600 slots
- [x] 14 400 slots, about 24 hours
- [ ] Unlimited
> Why: L = 14,400 slots.

### Q What is the per-report cap on accumulate gas?
@ What JAM does
- [ ] 50 000 000
- [x] 10 000 000
- [ ] 3 500 000 000
- [ ] 5 000 000 000
> Why: The sum of digest accumulate gas limits must be ≤ G_A = 10⁷.

### Q What must each digest's code hash equal?
@ What JAM does
- [ ] The authorizer's code hash
- [x] The service's current code hash on-chain
- [ ] The block's extrinsic hash
- [ ] The previous report's code hash
> Why: Each digest's code hash must equal δ[service]'s code hash.

### Q What does the GP presume happens to validators who guarantee a wrong report?
@ What JAM does
- [x] They will be punished severely
- [ ] Nothing, guarantees are advisory
- [ ] They lose their next block
- [ ] They must re-run refine
> Why: guaranteeing.tex: "validators will be punished severely if they malfunction and commit to a report which does not faithfully represent" the correct result.

### Q Which symbol is recent history?
@ The words and symbols
- [ ] ρ
- [ ] α
- [x] β
- [ ] ξ
> Why: β is recent history; the anchor check reads it.

## Level 2

### Q A guarantee arrives for core 3 while core 3 still holds a report from two slots ago that is not yet available. What happens?
- [ ] The new report replaces the old one
- [x] The new guarantee is rejected because the core is occupied
- [ ] Both reports wait on core 3
- [ ] The old report is accumulated immediately
> Why: A guarantee requires ρ‡[core] to be empty; the old report has not timed out (5 slots).

### Q A report's anchor is 9 blocks old. Why is it rejected?
- [ ] It is too far in the future
- [x] Recent history only holds 8 blocks, so the anchor cannot be found
- [ ] Its lookup anchor is too old
- [ ] Anchors must be the parent block
> Why: The anchor must appear in β†, which has 8 entries.

### Q A package was reported three blocks ago. The same package hash appears in a new guarantee. What happens?
- [ ] It is accepted and accumulated twice
- [x] It is rejected as a duplicate
- [ ] It replaces the earlier report
- [ ] It waits in ω
> Why: A package hash already in recent history's reported packages (or ξ, ω, ρ) is rejected.

### Q A guarantee has one valid signature from an assigned guarantor. Is it enough?
- [ ] Yes, one signature is enough
- [x] No, it needs 2 or 3
- [ ] Yes, at tiny only
- [ ] Only if the block author also signs
> Why: The credential must have 2 or 3 entries.

### Q Where does the rollup-bond analogy break for guarantees?
- [ ] Guarantors post a separate bond per report
- [x] There is no separate bond; the guarantor's validator stake is at risk, evidenced by its signature
- [ ] Guarantees are free and unpunishable
- [ ] The builder posts the bond
> Why: The signature on the report is what a later dispute uses as evidence against the signer.

### Q Alice's round has been guaranteed and sits in ρ. Is her trade settled?
- [ ] Yes, guarantees settle trades
- [x] No, the data must first be confirmed available, then accumulated
- [ ] Yes, once the next block arrives
- [ ] Only after the epoch ends
> Why: ρ holds reports awaiting availability; accumulation runs only after assurances make them available.

## Level 3

### Q List the main checks a guarantee must pass, in plain words.
> Hint: signers, payment, core, code, anchor, duplicates, prerequisites.
> Answer: 2 or 3 valid Ed25519 signatures from validators assigned to that core in the current or previous rotation, with a recent enough slot; the authorizer is in the core's pool; the core has no pending report; each digest's code hash matches the service's current code and the accumulate gas respects the minimums and the 10 million cap; the anchor is one of the last 8 blocks with matching hash, state root, belt peak and slot; the lookup anchor is within 14 400 slots; the package is not a duplicate; its prerequisites are known.

### Q Why does the chain check the anchor against recent history?
> Hint: what could refine see?
> Answer: Refine is stateless and was run against the state named by the anchor. Checking that the anchor is one of the chain's own last 8 blocks, with matching state root and other fields, confirms the work was prepared against a real, recent state everyone agrees on.

### Q What makes a guarantor economically accountable?
> Hint: what exactly did they sign?
> Answer: Each guarantor signs the hash of the report with its Ed25519 validator key. If auditors later find the report wrong, that signature proves which validators vouched for it, and the GP presumes they are punished severely.
