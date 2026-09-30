---
chapter: f07-accumulate
---

## Level 1

### Q Which step is the only one that changes a service's on-chain state?
@ What JAM does
- [ ] Refine
- [ ] Guarantee
- [x] Accumulate
- [ ] Assurance
> Why: Refine is stateless and in-core; accumulate is the on-chain, stateful step (GP 0.8.0 ch. 12).

### Q Who runs a service's accumulate code?
@ What JAM does
- [ ] Only the two or three guarantors
- [ ] Only the block author
- [x] Every node, on-chain
- [ ] A random sample of auditors
> Why: Accumulation is part of the block's state transition, so every node computes it.

### Q How does the Gray Paper write the accumulate run?
@ The words and symbols
- [ ] Ψ_R
- [ ] Ψ_I
- [x] Ψ_A
- [ ] Υ
> Why: Ψ_A is the accumulate invocation; Ψ_R is refine, Ψ_I is-authorized, Υ the whole block transition.

### Q For jamswap, what role does accumulate play?
@ What JAM does
- [ ] The matching engine
- [x] Settlement: moving balances and recording the new order book
- [ ] Choosing the batch price
- [ ] Encrypting sealed orders
> Why: jamswap's docs map refine to matching and accumulate to settlement ("moves the actual balances between accounts").

### Q What does accumulate receive for each of its service's results in a report?
@ What JAM does
- [ ] The whole work-package bundle
- [x] An operand: package hash, exports root, authorizer, payload hash, gas limit, trace, output or error
- [ ] Only the report's signatures
- [ ] The full block
> Why: Accumulate works on compact operand tuples, not bundles (eq. operandtuple).

### Q What is the maximum total accumulate gas one report's results may request?
@ What JAM does
- [ ] 1 million
- [x] 10 million (G_A)
- [ ] 3.5 billion
- [ ] 5 billion
> Why: G_A = 10⁷ is the per-report accumulate allocation.

### Q What is the block's basic accumulation gas budget G_T at full scale?
@ What JAM does
- [ ] 10 million
- [ ] 500 million
- [x] 3.5 billion
- [ ] 5 billion
> Why: G_T = 3.5 × 10⁹. (5 billion is G_R, the refine limit per package.)

### Q What is the ready queue?
@ What JAM does
- [x] Where reports wait because a package they depend on has not been accumulated yet
- [ ] Where guarantees wait for availability
- [ ] The list of tickets for the next epoch
- [ ] The mempool of unsubmitted orders
> Why: Reports with unmet prerequisites are deferred into ω until the dependency is accumulated.

### Q Which symbol is the ready queue?
@ The words and symbols
- [ ] ϑ
- [x] ω
- [ ] ρ
- [ ] ξ
> Why: The 0.8.0 preamble defines the ready queue as ω. ξ is accumulated history; ρ is the per-core pending slot.

### Q What does ξ remember?
@ The words and symbols
- [ ] Every transfer ever made
- [x] Package hashes accumulated in roughly the last epoch
- [ ] The next validator set
- [ ] The auditors' judgments
> Why: ξ is the accumulated history, one entry per slot for E slots.

### Q When does a service receive a transfer sent to it during accumulation?
@ What JAM does
- [ ] Immediately, inside the sender's run
- [x] In a later round of the same block's accumulation
- [ ] In the next epoch
- [ ] Only after finality
> Why: Deferred transfers are integrated in all but the first invocation of the sequential accumulation (accumulation.tex, Execution).

### Q What happens to the block's preimages relative to accumulation?
@ What JAM does
- [ ] They are integrated first
- [x] They are integrated after accumulation
- [ ] They are ignored
- [ ] They are integrated during refine
> Why: δ' ≺ (E_P, δ‡, τ'): preimages go into the post-accumulation accounts.

### Q Why does accumulation group a service's operands into one run?
@ Why it is built this way
- [ ] To hide them from auditors
- [x] Starting the PVM is not free, so work is amortised
- [ ] To save block space
- [ ] Because services may only run once per epoch
> Why: The GP: PVM setup "cannot be expected to be zero-cost", so items for the same service are aggregated.

### Q Why is accumulation also partly sequential?
@ Why it is built this way
- [x] Real gas used is known only after a report is accumulated
- [ ] Services must run in alphabetical order
- [ ] The network is single-threaded
- [ ] Transfers must be signed first
> Why: The GP: only after accumulating can it be known whether less gas than the limit was used, which "implies a sequential execution pattern".

### Q The Gray Paper summarises the difference between in-core and on-chain work as...
@ Why it is built this way
- [ ] Cheap versus expensive
- [x] Scalability versus synchroneity
- [ ] Private versus public
- [ ] Fast versus final
> Why: Overview, "The Core Model and Services": "the primary difference between them one of scalability versus synchroneity".

### Q Where does the "Ethereum gas" analogy break for accumulate?
@ Why it is built this way
- [ ] JAM has no gas
- [ ] Accumulate gas is paid in ETH
- [x] The expensive computation happened in refine; accumulate gas is a small separate allowance
- [ ] Accumulate has unlimited gas
> Why: Refine may use up to G_R = 5 billion per package in-core; accumulate per report is capped at G_A = 10 million.

### Q Can a service yield an output hash from accumulate?
@ What JAM does
- [x] Yes, one output hash, committed into recent history
- [ ] No, accumulate returns nothing
- [ ] Yes, as many as it likes
- [ ] Only privileged services can
> Why: The yield becomes part of θ', which recent history commits via the accumulation-output belt.

## Level 2

### Q Report B lists package A as a prerequisite. A has not been accumulated. What happens to B when it becomes available?
- [ ] B is rejected
- [ ] B is accumulated anyway
- [x] B waits in the ready queue until A is accumulated
- [ ] B's guarantors are punished
> Why: Unmet dependencies defer accumulation into ω (accumulation.tex, History and Queuing).

### Q In the same block, A is accumulated and B (waiting on A) is in the ready queue. Can B be accumulated in this same block?
- [x] Yes, it is released once A's hash is known to be accumulated, if gas allows
- [ ] No, never in the same block
- [ ] Only in the next epoch
- [ ] Only if B is re-guaranteed
> Why: The queue editing function removes satisfied dependencies and Q releases reports layer by layer within the block.

### Q A report's results ask for 12 million accumulate gas in total. What happens at guarantee time?
- [ ] It is accepted and trimmed to 10 million
- [x] The guarantee is invalid: the sum must be at most G_A = 10 million
- [ ] It waits in the ready queue
- [ ] It is accepted but accumulated last
> Why: Σ digest gas ≤ C_reportaccgas = 10 M is a guarantee validity rule (ch. 11).

### Q A guarantee arrives for a package whose hash is already in ξ. What happens?
- [ ] It is accumulated a second time
- [x] It is rejected when guaranteed
- [ ] It replaces the old one
- [ ] It waits in ω
> Why: The package hash must not be in β's reported packages, ξ, ω or ρ (ch. 11 contextual checks).

### Q Service X sends 5 tokens to service Y during accumulation. When is Y's accumulate aware of it?
- [ ] Never; transfers only move balances
- [ ] In the same PVM run as X
- [x] In a later round of the same block's accumulation, as an input to Y's run
- [ ] After GRANDPA finalises the block
> Why: Deferred transfers from one round are passed into the next round of Δ+, including transfers to the destination's Ψ_A.

### Q A preimage arrives in E_P, but accumulation in this block removed the service's request for it. What happens?
- [ ] It is stored anyway
- [ ] The block is invalid
- [x] It is disregarded
- [ ] It waits until the next block
> Why: Each preimage must have been requested in the state before the block, and the GP disregards "any preimages which due to the effects of accumulation are no longer useful" (ch. 12, preimage integration).

## Level 3

### Q Explain why JAM splits a service into refine and accumulate, using jamswap as the example.
> Hint: heavy versus stateful; who runs each.
> Answer: Refine is the heavy, stateless part, run in-core by only two or three guarantors: for jamswap it is the matching engine. Accumulate is the light, stateful part run by every node on-chain: for jamswap it moves balances and records the order book. Because the heavy part is not replicated on every node, JAM can do far more computation than an Ethereum-style chain, while settlement still sees one consistent state.

### Q Walk through what the ready queue and the accumulated history are for.
> Hint: dependencies and duplicates.
> Answer: The ready queue ω holds available reports whose prerequisite packages have not been accumulated yet; they are released as soon as those dependencies are, possibly in the same block, and they cannot wait longer than about an epoch. The accumulated history ξ remembers package hashes accumulated in roughly the last epoch, so a package cannot be settled twice and satisfied dependencies are recognised.

### Q How is accumulation gas controlled?
> Hint: per report, per block, per service.
> Answer: Each result in a report carries its own accumulate gas limit, at least the service's minimum, with at most G_A = 10 million per report. The block budget is at least G_T = 3.5 billion. Reports are taken in order while their limits fit, grouped per service into one PVM run each, and whatever queued work does not fit waits for a later block.
