---
chapter: f04-refine
---

## Level 1

### Q What is a JAM core?
@ What JAM does
- [ ] A CPU inside a validator machine
- [x] A slot of parallel execution capacity for in-core work
- [ ] A validator's staking account
- [ ] A kind of service
> Why: Cores are the units of in-core computation; each active core has three assigned validators every block (§11 guarantor assignments).

### Q How many cores does full-size JAM have?
@ What JAM does
- [ ] 6
- [ ] 100
- [x] 341
- [ ] 1023
> Why: C = 341 (definitions.tex).

### Q How many validators are assigned to each core at a time?
@ What JAM does
- [ ] One
- [ ] Two
- [x] Three
- [ ] Sixteen
> Why: "Every block, each active core has three validators uniquely assigned to guarantee work-reports for it."

### Q What are the validators assigned to a core called?
@ What JAM does
- [x] Guarantors
- [ ] Assurers
- [ ] Auditors
- [ ] Authors
> Why: They guarantee work-reports for that core.

### Q How often do guarantor assignments rotate at full size?
@ What JAM does
- [ ] Every slot
- [x] Every 10 slots
- [ ] Every epoch
- [ ] Never
> Why: Rotation period R = 10 slots (4 at tiny).

### Q What does a guarantor run first when it receives a work-package?
@ What JAM does
- [x] The is-authorized code of the package's authorizer
- [ ] The service's accumulate code
- [ ] The erasure coder
- [ ] The Safrole lottery
> Why: guaranteeing.tex step 1: evaluate the package's authorization.

### Q What gas does is-authorized get?
@ What JAM does
- [ ] 10 000 000
- [x] 50 000 000
- [ ] 5 000 000 000
- [ ] Unlimited
> Why: G_I = 50,000,000.

### Q Which code does refine run for Alice's order?
@ What JAM does
- [ ] The authorizer's code
- [x] jamswap's refine code, the matching engine
- [ ] jamswap's accumulate code
- [ ] The block author's code
> Why: Each work-item is refined by its service's refine logic in the PVM.

### Q In which machine does refine run?
@ The words and symbols
- [ ] The EVM
- [ ] WebAssembly
- [x] The PVM, JAM's RISC-V based virtual machine
- [ ] Natively on the guarantor's CPU without metering
> Why: Refine is the Ψ_R invocation of the PVM.

### Q What may refine use as input?
@ What JAM does
- [ ] Live on-chain state
- [x] Only the package's data, the code, and historical preimage lookups
- [ ] The current mempool
- [ ] Other cores' results
> Why: Overview: in-core execution needs only the refine code, the authorizer code and any preimage lookups.

### Q What is the output of refining one work-item called?
@ What JAM does
- [ ] A guarantee
- [ ] An assurance
- [x] A work-digest
- [ ] A ticket
> Why: Each work-item yields a digest; the report holds 1 to 16 digests.

### Q What does a work-report collect?
@ What JAM does
- [x] The package's digests, its availability spec, context, core and authorizer details
- [ ] The whole work-package bundle
- [ ] All validators' signatures
- [ ] The new state root
> Why: eq. computereport: availability spec, context, core, authorizer hash, trace, segment-root lookup, digests, authorizer gas used.

### Q What is erasure-coded by the guarantors?
@ What JAM does
- [ ] The block header
- [x] The work-package bundle and exported data
- [ ] The work-report only
- [ ] The service's whole storage
> Why: guaranteeing.tex step 3: chunk the bundle and exports with the erasure codec.

### Q Who receives the erasure-coded chunks?
@ What JAM does
- [ ] Only the three guarantors
- [ ] Only the block author
- [x] The whole validator set, one chunk each
- [ ] The builder
> Why: guaranteeing.tex step 5: distribute the chunks across the validator set.

### Q Why must refine be stateless and deterministic?
@ Why it is built this way
- [ ] To save disk space
- [x] So that anyone can re-run it later and must get the same result
- [ ] Because the PVM has no memory
- [ ] To hide results from auditors
> Why: In-core execution "must be reproducible by any node synchronized to the portion of the chain which has been finalized".

### Q Roughly how much more computation does the Overview expect JAM to do in-core than one machine?
@ Why it is built this way
- [ ] 2 times
- [ ] 10 times
- [x] Upwards of 300 times
- [ ] A million times
> Why: Overview, In-core Consensus: "upwards of 300 times the amount of computation in-core".

## Level 2

### Q Is-authorized fails for a package. What does the guarantor do?
- [ ] Refines it anyway and marks it unauthorized
- [x] It cannot produce a valid report, so it should not guarantee it
- [ ] Sends it to another core
- [ ] Charges the builder
> Why: The report computation returns an error if the authorization trace is invalid; guarantors check authorization before refining.

### Q A guarantor's refine of an item runs out of gas. What happens to that item?
- [ ] The whole package is discarded
- [x] Its digest records an out-of-gas error instead of an output
- [ ] It is retried with more gas
- [ ] The block is invalid
> Why: A digest's result is an output blob or an error such as out-of-gas or panic.

### Q Why does erasure coding matter for the checking that comes later?
- [ ] It makes refine faster
- [x] The data survives even if the original guarantors disappear, so others can re-run refine
- [ ] It encrypts the orders
- [ ] It reduces gas costs
> Why: Chunks spread over all validators let auditors reconstruct the bundle and re-execute it.

### Q A validator was jamswap's guarantor for the last 10 slots. What happens next?
- [ ] It stays on that core for the epoch
- [x] Assignments rotate, so it may serve a different core
- [ ] It becomes an auditor permanently
- [ ] It is removed from the validator set
> Why: Assignments rotate every R = 10 slots.

### Q Where does the rollup analogy break for refine?
- [ ] Refine runs on the user's device
- [x] Executors are protocol-chosen staked validators and checking starts within seconds
- [ ] Refine is re-run by every node
- [ ] There is no output
> Why: Guarantors are assigned by the protocol; audits follow quickly instead of a long challenge window.

### Q Alice's order does not cross at the clearing price. What does refine do with it?
- [ ] Rejects the whole batch
- [x] Leaves it unfilled; public orders can rest in the new book
- [ ] Fills it at 7 USDC anyway
- [ ] Sends it to accumulate unmatched for matching there
> Why: jamswap's round lifecycle: partially or unfilled public orders become the new resting book.

## Level 3

### Q Walk through what a guarantor does with a work-package.
> Hint: five steps, starting with permission.
> Answer: Check authorization by running the authorizer's is-authorized code and confirming it is in the core's pool. Refine each work-item in the PVM to produce digests. Erasure-code the bundle and exports into chunks. Assemble and sign the work-report. Distribute the chunks across the validator set, and share the package with the core's other guarantors.

### Q Why can JAM trust a result only three validators computed?
> Hint: three later mechanisms.
> Answer: The guarantors stake their reputation by signing, so a wrong result is punishable. All validators must confirm they hold the data (availability), so it can be re-checked. Random auditors re-run refine and raise disputes if it differs. Determinism and statelessness make re-running decisive.

### Q What is the difference between a work-digest and a work-report?
> Hint: one per item versus one per package.
> Answer: A digest is the result of refining one work-item: service, code hash, payload hash, accumulate gas limit, output or error, gas used and counts. A report is one per package: all its digests plus the availability spec, refinement context, core, and authorizer hash, trace and gas used.
