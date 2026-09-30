---
chapter: f00-start-here
---

## Level 1

### Q In one sentence, how does JAM scale beyond what one node can do?
@ The one idea
- [ ] Every node runs every job, but faster hardware is required
- [x] A few validators do the expensive work; everyone else checks a short signed result and applies it
- [ ] Jobs are sent to an outside rollup operator
- [ ] Blocks are made larger every epoch
> Why: The Overview's in-core consensus model: only a subset executes a computation, while every node processes the compact result on-chain.

### Q What does the Gray Paper call the two halves of JAM's computation?
@ The one idea
- [ ] Execution and settlement
- [ ] Layer 1 and layer 2
- [x] In-core and on-chain
- [ ] Refine and finalize
> Why: The Overview names the "in-core consensus model" beside the on-chain model everyone evaluates.

### Q Which Ethereum idea is JAM's in-core work closest to?
@ The one idea
- [ ] Calling a view function
- [ ] Mining a block
- [ ] An account abstraction wallet
- [x] A rollup executing its batch, except the executors are the chain's own validators
> Why: Refine does the heavy execution like a rollup does, but it is performed by staked base-layer validators.

### Q What is a core?
@ The four steps
- [x] A slot of guaranteed compute time served by a small group of validators
- [ ] A CPU core inside each validator's machine
- [ ] A shard of the state
- [ ] A validator that authors blocks
> Why: A core is a unit of in-core computation; each active core has three validators assigned to guarantee work for it.

### Q How many validators are assigned to each core at a time?
@ The four steps
- [ ] 1
- [ ] 2
- [x] 3
- [ ] 341
> Why: "Every block, each active core has three validators uniquely assigned to guarantee work-reports for it" (ch. 11).

### Q How many cores does JAM have in its full configuration?
@ The four steps
- [ ] 16
- [ ] 1023
- [ ] 600
- [x] 341
> Why: C = 341 in the Definitions.

### Q What is the output of step 1, refine?
@ The four steps
- [ ] A new block
- [x] A short work-report saying what input, run by what code, gave what result
- [ ] An updated account balance
- [ ] A ticket for the next epoch
> Why: Refinement produces a work-report, which is what goes on-chain.

### Q What is a guarantee?
@ The four steps
- [ ] A validator's promise to author the next block
- [ ] A deposit locked by a service
- [x] A work-report signed by two or three of the core's validators, placed in a block
- [ ] An assurance that data is available
> Why: A guarantee pairs a work-report with 2 or 3 guarantor signatures (ch. 11).

### Q What is an assurance?
@ The four steps
- [ ] A signature on the whole block
- [ ] A promise to audit a report
- [ ] A refund of unused gas
- [x] A validator saying "I hold my erasure-coded piece" of the work's data
> Why: Assurances are bitfields of which cores' data each validator holds (ch. 11).

### Q When does a report become available?
@ The four steps
- [x] When more than two thirds of validators have assured they hold their piece
- [ ] As soon as it is guaranteed
- [ ] After one epoch
- [ ] When all validators have audited it
> Why: A work-report becomes available once a two-thirds super-majority of validators mark its core in their assurances.

### Q Who runs step 4, accumulate?
@ The four steps
- [ ] Only the three validators of the core
- [x] Every node, as part of importing the block
- [ ] Only the block author
- [ ] The auditors
> Why: Accumulation is on-chain: it is part of the block's state transition, so every node computes it.

### Q Why is accumulate cheap compared to refine?
@ The four steps
- [ ] Because it runs on faster machines
- [ ] Because it has no gas limit
- [x] Because the heavy computation already happened in refine; accumulate only applies the result
- [ ] Because it only runs once per epoch
> Why: Refine distills large inputs into small outputs; accumulate integrates those outputs into state.

### Q Which Ethereum idea is closest to accumulate?
@ The four steps
- [ ] The mempool
- [ ] A light client
- [x] A rollup's settlement contract applying a batch result on L1
- [ ] A block proposer
> Why: Accumulate is the stateful, on-chain part that updates the service's state from the refined result.

### Q What does auditing do?
@ Two things running underneath
- [x] A random sample of validators re-runs refine to check each available report
- [ ] It checks every block's signature
- [ ] It counts how many blocks each validator authored
- [ ] It compresses old state
> Why: Auditing is JAM's proactive check on in-core results (ch. 17).

### Q What happens if an auditor finds a report wrong?
@ Two things running underneath
- [ ] Nothing until the next epoch
- [ ] The auditor is punished
- [x] A dispute is raised; the report is thrown out and its guarantors are recorded as offenders
- [ ] The block author re-runs it
> Why: Disputes (ch. 10) judge reports; bad ones are removed and culprits enter the offenders set.

### Q How long is an audit round ("tranche")?
@ Two things running underneath
- [ ] 1 second
- [x] 8 seconds
- [ ] 6 seconds
- [ ] One epoch
> Why: The tranche period is 8 seconds in the Definitions.

### Q What does Safrole decide?
@ Two things running underneath
- [ ] Which service accumulates first
- [ ] How much gas each core gets
- [ ] Which reports are available
- [x] Which validator may author the block in each slot
> Why: Safrole limits each slot's author to one key-holder from a sequence fixed in advance (ch. 6).

### Q How long is a JAM epoch?
@ Two things running underneath
- [ ] 32 slots of 12 seconds
- [ ] 100 slots of 6 seconds
- [x] 600 slots of 6 seconds, one hour
- [ ] 24 hours
> Why: E = 600 slots and P = 6 seconds, so an epoch is 3600 seconds.

### Q Which chapter defines accumulation?
@ Where each step lives in the Gray Paper
- [ ] 11
- [x] 12
- [ ] 14
- [ ] 17
> Why: Chapter 12 is Accumulation; chapter 11 is Reporting and Assurance.

### Q Which chapter covers both guarantees and assurances on-chain?
@ Where each step lives in the Gray Paper
- [x] 11 Reporting and Assurance
- [ ] 10 Disputes
- [ ] 5 The Header
- [ ] 13 Statistics
> Why: Chapter 11 defines guarantees, assurances and the per-core pending reports.

### Q Which Graypaper chapters make up the M1 material?
@ Where each step lives in the Gray Paper
- [ ] 1 to 20
- [ ] 11 to 17
- [x] 3 to 13
- [ ] Appendices only
> Why: M1 covers chapters 3 to 13, what every node does when it imports a block, plus the relevant appendices.

## Level 2

### Q A block contains no guarantees, assurances or disputes. Which of the four steps can still happen in it?
- [ ] None of them
- [ ] Only refine
- [x] Accumulate, for reports that were already waiting in the ready queue
- [ ] Only a guarantee
> Why: Accumulation also draws on the ready queue ω. Reports whose prerequisites are met normally accumulate in the same block, but any left over when that block's gas budget ran out wait in ω and can be accumulated by a later, quiet block.

### Q A work-report is guaranteed, but only half the validators ever assure they hold their piece. What happens?
- [x] It never becomes available and is not accumulated; its core is eventually cleared
- [ ] It is accumulated anyway after one epoch
- [ ] The block that carried it is invalid
- [ ] The guarantors are slashed immediately
> Why: Availability needs more than two thirds of assurances; a report that times out on its core is dropped (ch. 11).

### Q Why can the network do far more work than one node can?
- [ ] Each node's hardware is faster than Ethereum's
- [ ] The PVM skips gas metering
- [ ] Blocks are finalized instantly
- [x] Different cores run different jobs in parallel, each on its own small group of validators
> Why: 341 cores each served by their own validators give parallel in-core compute; on-chain only integrates results.

### Q Compared to an optimistic rollup, what removes the week-long challenge window?
- [ ] Zero-knowledge proofs of every report
- [x] Audits run proactively within seconds, and finality waits for them
- [ ] Guarantors post a large bond
- [ ] Blocks are larger
> Why: Auditing happens in 8-second tranches after availability, and GRANDPA only finalizes audited chains.

### Q Leaving auditing aside, which step does a validator skip for a core it is not guaranteeing?
- [ ] Assurances
- [ ] Accumulate
- [x] Refine for that core's work
- [ ] Importing blocks
> Why: Only the core's guarantors refine its work-packages to produce the report; every validator still assures and accumulates. (Auditors may later re-run refine to check it, which is a separate job.)

### Q What is the order of steps for one piece of work?
- [ ] Assure, refine, guarantee, accumulate
- [ ] Guarantee, refine, accumulate, assure
- [x] Refine, guarantee, assure, accumulate
- [ ] Refine, accumulate, guarantee, assure
> Why: Refine produces the report, the guarantee puts it on-chain, assurances make it available, accumulate applies it.

## Level 3

### Q Explain JAM's four steps to an Ethereum developer in under a minute.
> Hint: rollup execution, batch commitment, data availability, settlement contract.
> Answer: A few validators on a core run the heavy refine code and produce a work-report, like a rollup executing a batch. Two or three of them sign it and it enters a block as a guarantee, like posting a batch commitment. All validators hold erasure-coded pieces of the data and assure it; above two thirds the report is available, like a DA layer. Then every node runs the cheap accumulate code to apply the result, like a settlement contract. Audits re-check reports at random, and Safrole picks block authors.

### Q Why does splitting work into in-core and on-chain scale, and what makes it safe?
> Hint: parallel cores; guaranteeing, assuring, auditing, judging.
> Answer: Only a small group runs each expensive job, and many cores run in parallel, so total work grows with the network rather than one machine. Safety comes from the stages the Overview names: guarantors put an economic cost on being wrong, assurances make the inputs available for checking, auditors re-check at random, and judgments punish bad reports.

### Q Where does the analogy between JAM and a rollup break down?
> Hint: who executes, and how long you wait.
> Answer: A rollup's executor is a separate operator and an optimistic rollup waits days for fraud proofs. In JAM the executors are the chain's own staked validators, rotated between cores, and audits run within seconds with finality waiting for them. JAM also has two runs per job, refine and accumulate, built into the protocol itself.

### Q What do auditing and Safrole each contribute, even though neither is one of the four steps?
> Hint: correctness of in-core work; who writes blocks.
> Answer: Auditing gives confidence that in-core results are correct: random validators re-run refine, and a wrong report triggers a dispute that removes it and records its guarantors as offenders. Safrole decides block authorship per slot, anonymously and in advance, which keeps forks rare so the chain carrying the four steps stays single.
