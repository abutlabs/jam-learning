---
chapter: c-architecture
---

## Level 1

### Q What does "in-core" mean in JAM?
@ The picture in one diagram
- [ ] Storage kept in validator RAM
- [ ] Code compiled into the node binary
- [ ] Computation that every node performs
- [x] Computation done by a small subset of validators, with everyone else convinced by guarantees, assurances, audits and judgments
> Why: In-core consensus: only a subset executes, a crypto-economic game secures the result (Overview, "The Core Model and Services").

### Q What does "on-chain" mean in JAM?
@ The picture in one diagram
- [ ] Anything a guarantor does
- [ ] Data stored off-chain
- [x] Computation every node performs as part of the block transition
- [ ] Work done by auditors
> Why: On-chain is the "everybody does everything" model, used for accumulation.

### Q Which half of a service runs in-core?
@ The picture in one diagram
- [ ] Accumulate
- [ ] Both
- [x] Refine
- [ ] Neither
> Why: Refinement is in-core and stateless; accumulation is on-chain and stateful.

### Q Which half of a service can change on-chain state such as balances and storage?
@ The picture in one diagram
- [ ] Refine
- [ ] Is-Authorized
- [x] Accumulate
- [ ] None of them
> Why: Accumulate is stateful; refine only produces digests and exports.

### Q What is a work-package?
@ Lifecycle of one work-package
- [ ] A service's code
- [ ] A block's extrinsic
- [x] A builder's unit of work for one core: an authorization token and authorizer, a context, and 1 to 16 work-items
- [ ] The result of accumulation
> Why: eq. workpackage.

### Q What is a work-item?
@ Lifecycle of one work-package
- [x] One piece of work for one service inside a package: service, code hash, payload, gas limits, imports, extrinsics, export count
- [ ] An entry in recent history
- [ ] A guarantor's signature
- [ ] A validator's bitfield
> Why: eq. workitem.

### Q Who produces the work-report?
@ Lifecycle of one work-package
- [ ] The service itself
- [ ] The block author
- [x] The core's guarantors, after refining the package
- [ ] The auditors
> Why: Guarantors run is-authorized and refine, then sign the report.

### Q Which extrinsic brings a work-report on-chain?
@ The picture in one diagram
- [ ] Preimages E_P
- [x] Guarantees E_G
- [ ] Tickets E_T
- [ ] Assurances E_A
> Why: A guarantee carries the report with 2 or 3 signatures.

### Q What does a validator's assurance say?
@ The picture in one diagram
- [ ] Which block it will author
- [x] Which cores' erasure-coded chunks it is holding
- [ ] That a report is correct
- [ ] That it has audited a report
> Why: Assurances attest availability, not correctness.

### Q What does "available" mean for a work-report?
@ Lifecycle of one work-package
- [ ] It has been audited
- [ ] Its code has been uploaded
- [ ] It has been finalised
- [x] More than two-thirds of validators have assured they hold its chunks
> Why: Availability is reached at > 2/3 assurances.

### Q What does auditing check?
@ The layers
- [ ] That chunks are stored
- [ ] That signatures are valid
- [x] That the refinement in a report was actually correct, by re-executing it
- [ ] That the block author held the slot
> Why: ELVES auditors re-run the work; guarantors staked on it being right.

### Q What is the name of JAM's auditing protocol?
@ The layers
- [ ] Sassafras
- [ ] GRANDPA
- [ ] BEEFY
- [x] ELVES
> Why: The GP's auditing and judging system is theoretically equivalent to ELVES (chapter 17, Auditing and Judging).

### Q Which mechanism decides who seals each block?
@ The layers
- [ ] BEEFY
- [ ] Grandpa
- [ ] ELVES
- [x] Safrole
> Why: Safrole, a simplified Sassafras, uses anonymous tickets per slot.

### Q Which mechanism finalises blocks?
@ The layers
- [x] Grandpa
- [ ] Safrole
- [ ] Assurances
- [ ] Accumulation
> Why: Grandpa finalises; Safrole limits forks.

### Q How are a work-package's data made available to all validators?
@ The layers
- [ ] Only the guarantors keep it
- [x] Guarantors erasure-code the bundle and exported segments and give one chunk to each validator
- [ ] It is stored in the header
- [ ] Every validator downloads the full bundle
> Why: Reed-Solomon coding over GF(2¹⁶), one shard per validator.

### Q What fraction of chunks is enough to reconstruct the data?
@ The layers
- [ ] All of them
- [x] About one-third (342 of 1023 at full)
- [ ] Two-thirds
- [ ] Half
> Why: The code rate is F(v):v; at the recommended validator counts F(v) = v/3 + 1, so 342:1023 at full (erasure_coding.tex).

### Q How many validators are there at full spec?
@ Numbers that characterise the design
- [ ] 600
- [ ] 1024
- [ ] 341
- [x] 1023
> Why: 1023, three per core.

### Q How many cores are there at full spec?
@ Numbers that characterise the design
- [x] 341
- [ ] 600
- [ ] 16
- [ ] 1023
> Why: C_corecount = 341 = 1023 / 3.

### Q How many validators and cores does the tiny spec use?
@ Numbers that characterise the design
- [ ] 1023 validators, 2 cores
- [ ] 12 validators, 4 cores
- [x] 6 validators, 2 cores
- [ ] 3 validators, 1 core
> Why: The tiny test configuration.

### Q How long is a slot?
@ Numbers that characterise the design
- [ ] 12 seconds
- [ ] 1 second
- [x] 6 seconds
- [ ] 1 minute
> Why: C_slotseconds = 6.

### Q How long is an epoch at full spec?
@ Numbers that characterise the design
- [ ] 14,400 slots
- [ ] 100 slots
- [ ] 12 slots
- [x] 600 slots, one hour
> Why: C_epochlen = 600 slots × 6 s = 3600 s.

### Q What is the refine gas per work-package?
@ Numbers that characterise the design
- [ ] 50 million
- [x] 5 billion (G_R)
- [ ] 3.5 billion
- [ ] 10 million
> Why: C_packagerefgas = 5,000,000,000.

### Q What is the is-authorized gas per work-package?
@ Numbers that characterise the design
- [ ] 10 million
- [x] 50 million
- [ ] 5 billion
- [ ] 1 million
> Why: C_packageauthgas = 50,000,000.

### Q What is the maximum size of a work-package bundle?
@ Numbers that characterise the design
- [ ] 1 GB
- [ ] 48 KB
- [x] About 13.8 MB (13,791,360 octets)
- [ ] 4 MB
> Why: C_maxbundlesize = 13,791,360.

### Q What is the maximum number of work-items in a package?
@ Numbers that characterise the design
- [x] 16
- [ ] 8
- [ ] 128
- [ ] 3072
> Why: C_maxpackageitems = 16.

### Q What does an account hold in JAM?
@ The layers
- [ ] Only a balance
- [ ] Only code
- [x] A balance, code, storage and preimages; every account is a service
- [ ] A public key and a nonce
> Why: All accounts are service accounts, with no secret key and no nonce.

### Q What decides which work-packages may use a core?
@ The layers
- [ ] The service with the highest balance
- [ ] The guarantors' choice
- [ ] The block author
- [x] An authorizer whose hash is in the core's authorizer pool
> Why: Authorization and coretime, chapter 8.

### Q In what order are the five extrinsics listed in the block?
@ The picture in one diagram
- [ ] Guarantees, assurances, disputes, preimages, tickets
- [ ] Disputes, tickets, guarantees, assurances, preimages
- [ ] Tickets, guarantees, assurances, preimages, disputes
- [x] Tickets, disputes, preimages, assurances, guarantees
> Why: E = (E_T, E_D, E_P, E_A, E_G) (eq. extrinsic).

### Q Which chapter's state records per-validator, per-core and per-service activity?
@ The layers
- [ ] Recent history β
- [ ] Privileges χ
- [x] Statistics π
- [ ] Disputes ψ
> Why: Bookkeeping for rewards, chapter 13.

### Q How many audits does each work-report receive, roughly?
@ Numbers that characterise the design
- [ ] 3
- [ ] All 1023 validators
- [x] About 30
- [ ] 1
> Why: Discussion: a mean of ten audits per validator per timeslot, "and thus 30 audits per work-report".

### Q What is the lookup-anchor age limit, in hours?
@ Numbers that characterise the design
- [x] 24
- [ ] 28 days
- [ ] 1
- [ ] 6
> Why: 14,400 slots × 6 s = 24 hours.

## Level 2

### Q Put these in order for one work-package: accumulate, assure, guarantee, refine.
- [ ] Assure, refine, guarantee, accumulate
- [ ] Refine, assure, guarantee, accumulate
- [ ] Guarantee, refine, assure, accumulate
- [x] Refine, guarantee, assure, accumulate
> Why: Refine in-core, then the report is guaranteed on-chain, assured as available, then accumulated.

### Q A service needs to verify a large proof. Where should that work happen?
- [ ] In the block header
- [x] In refine, in-core, where gas is large and execution is stateless
- [ ] In accumulate, on-chain
- [ ] In the authorizer
> Why: Refine has 5 G gas and scales; accumulate is small and synchronous.

### Q A service needs to update its token balances. Where must that happen?
- [ ] In the guarantee
- [x] In accumulate
- [ ] In the assurance
- [ ] In refine
> Why: Only accumulate changes on-chain state.

### Q A report is guaranteed but its data never reaches enough validators. What stops it from being accumulated?
- [x] It never gets > 2/3 assurances, so it times out after 5 slots
- [ ] Safrole skips it
- [ ] Auditors reject it
- [ ] The manager removes it
> Why: Availability is required before accumulation.

### Q A report is available but auditors find the refinement was wrong. What happens?
- [ ] Nothing, it was already accumulated safely
- [ ] The core is disabled
- [ ] The report is re-refined by the block author
- [x] Negative judgments lead to a verdict in E_D, the guarantors become culprits, and a chain containing the bad report is not finalised
> Why: The disputes system gives auditing teeth; Grandpa must not finalise such a chain.

### Q Why does availability come before accumulation?
- [ ] So assurers can execute the code
- [x] So auditors can later fetch the data to re-check the work
- [ ] Because the header needs it
- [ ] To speed up refinement
> Why: If the data could vanish, a wrong report could never be audited.

### Q Which on-chain state does the guarantee step write?
- [ ] ξ, accumulated history
- [x] ρ, the core's pending report (and statistics)
- [ ] δ, the accounts
- [ ] ι, the staging set
> Why: Lifecycle table: ρ'[c] takes the report.

### Q Which on-chain state does accumulation write that decides the next validators?
- [ ] λ
- [ ] κ
- [ ] γ
- [x] ι, the staging set
> Why: The delegator's accumulate sets ι.

### Q A validator is 3 slots late in assuring a pending report. Is the report still able to become available?
- [ ] Only at epoch boundaries
- [ ] Only if the guarantors re-sign it
- [x] Yes, if the report is still within its 5-slot timeout
- [ ] No, assurances must be in the next block
> Why: The timeout is U = 5 slots from the slot of the block that reported it.

### Q Why is refinement required to be stateless?
- [ ] To save disk
- [x] So any node synced to finalised state can reproduce it for auditing
- [ ] Because the PVM has no memory
- [ ] Because services cannot have storage
> Why: In-core execution must be reproducible; its inputs are code, the authorizer, preimage lookups and imports.

### Q G_A × C at full spec is 10 M × 341 = 3.41 G. What does that compare to?
- [x] G_T = 3.5 G, the block accumulation budget, which it fits within
- [ ] The epoch length
- [ ] The bundle size
- [ ] G_R, the refine gas
> Why: Every core's report can be granted its full allocation in one block.

### Q What happens in a block where no work is reported at all?
- [ ] The block is invalid
- [ ] Only the header changes
- [x] Slot, entropy, recent history, authorizer pool and statistics still change, and queued work may still accumulate
- [ ] Nothing changes
> Why: Many transitions are slot-driven, not extrinsic-driven.

### Q Why three guarantors per core rather than one?
- [ ] Because Grandpa needs three
- [ ] Because the erasure code needs three
- [x] So a report needs at least two independent signers staking on it
- [ ] To triple throughput
> Why: The credential needs 2 to 3 assigned guarantors (GP text); the accountability reading is reasoning.

### Q Which layer fixes who seals each slot, and when is that decided?
- [ ] Grandpa, at finalisation
- [x] Safrole, an epoch ahead, from anonymous tickets
- [ ] ELVES, per tranche
- [ ] The manager service
> Why: The ticket contest for epoch e+1 runs in epoch e.

### Q A light client wants to follow validator-set changes without state. What helps it?
- [ ] The accumulation belt
- [ ] The extrinsic hash
- [ ] Assurances
- [x] The epoch marker in the header
> Why: The epoch marker carries the prior η₀ and η₁ and the keys of the newly pending set γ_P', on the first block of each epoch.

## Level 3

### Q Explain JAM's architecture in 90 seconds.
> Hint: two halves, a pipeline between them, and consensus around them.
> Answer: JAM splits service execution into an in-core half and an on-chain half. Refine runs in-core on a core's three guarantors: stateless, big gas, producing a work-report. The report is guaranteed on-chain, its data is erasure-coded to all validators and assured available, then audited by ELVES. Accumulate runs on-chain for every node, stateful, small gas, changing balances, storage and privileges. Safrole fixes block authors per slot, Grandpa finalises audited chains, and the whole thing is one state transition σ' = Υ(σ, B).

### Q Walk one work-package from builder to state change.
> Hint: ten lifecycle steps; name the state at each.
> Answer: A builder assembles items, token, authorizer and context. Guarantors run is-authorized (authorizer must be in α) and refine each item, producing digests and exports. They sign the report and distribute chunks. The block author includes the guarantee, which fills ρ for that core. Validators assure; at > 2/3 the report becomes available and leaves ρ. Auditors re-check it off-chain. Accumulation runs the service's accumulate within gas, writing δ, χ, φ, ι, θ, ξ and the ready queue ω. Preimages then integrate, and Grandpa finalises.

### Q Why is it safe to let only three validators execute refine?
> Hint: guarantee, availability, audit, judgment.
> Answer: The guarantors stake on correctness and can be punished. Availability means the data can be fetched by others. About 30 randomly selected auditors re-execute each report, and negative judgments produce verdicts and culprits. Grandpa will not finalise a chain with a report judged bad. Together these give in-core work comparable security to on-chain work.

### Q What is the difference between availability and validity?
> Hint: assurances versus audits.
> Answer: Availability means enough validators hold the data to reconstruct it; assurances attest it. Validity means the refinement was computed correctly; auditors check it by re-execution. A report can be available and still invalid, which is exactly what auditing is for.

### Q Why does accumulation get so much less gas than refine?
> Hint: who has to run it.
> Answer: Accumulation is on-chain, so every node must run it within the block time. Refine runs only on three guarantors per core, in parallel across 341 cores. So refine gets 5 billion per package, accumulate 10 million per report and 3.5 billion per block total.

### Q How does the design bound asynchrony?
> Hint: the pipeline.
> Answer: In-core refine is scalable but asynchronous; on-chain accumulate is synchronous and fully coherent. The Introduction describes pipelining a highly scalable, mostly coherent element into a synchronous, fully coherent one, bounding asynchrony to the pipeline. A report's results reach accumulation a few slots after it is guaranteed, bounded by availability and the 5-slot timeout.

### Q What role does erasure coding play?
> Hint: availability without everyone storing everything.
> Answer: It lets each validator hold one small chunk while any F(v) chunks (342 of 1023 at full) reconstruct the whole. That makes availability cheap to attest and robust to almost two-thirds of validators being faulty.

### Q Tell the architecture war story from lasair.
> Hint: finality and a mixed network.
> Answer: lasair built authoring, JAMNP-S networking and Grandpa-style finality, and ran in mixed networks with PolkaJam. Finding #7, a γ_s fork, showed Safrole in practice: tickets pooled at gossip time were checked against gossip-time entropy rather than the importing block's η₂', so the ticket lotteries split by branch. The fix revalidates pooled tickets at import (`Authoring.ticket_revalidate`). Recorded in docs/FINALITY_PLAN.md.

### Q What are the three roles a validator plays?
> Hint: guarantee, assure, audit (plus author).
> Answer: It guarantees for its assigned core every rotation, assures availability of every core's data each block, and audits a random selection of reports. When it holds a slot, it also authors and seals a block.

### Q Where do the numbers 1023 and 341 come from?
> Hint: three per core, erasure-code optimality.
> Answer: Each core has three guarantors, so cores = validators / 3. 1023 is in the GP's list of validator counts where the erasure rate is optimal (F(v) = v/3 + 1), so 341 cores follow.
