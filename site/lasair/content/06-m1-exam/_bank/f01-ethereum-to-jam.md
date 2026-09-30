---
chapter: f01-ethereum-to-jam
---

## Level 1

### Q What is JAM's equivalent of Ethereum's world state, and its symbol?
@ State and accounts
- [ ] The service registry, δ
- [x] The state, σ
- [ ] The recent history, β
- [ ] The header, H
> Why: The Overview writes the whole state as σ, a tuple of 17 components.

### Q What is JAM's equivalent of a contract account?
@ State and accounts
- [x] A service account
- [ ] A validator key
- [ ] A work-package
- [ ] A core
> Why: In JAM all accounts are service accounts, like Ethereum's contract accounts (Overview, On Services and Accounts).

### Q Which symbol holds the service accounts?
@ State and accounts
- [ ] σ
- [ ] κ
- [x] δ
- [ ] χ
> Why: δ is the service-account component of the state.

### Q What does JAM have in place of externally owned accounts (EOAs)?
@ State and accounts
- [ ] Validator accounts with nonces
- [ ] Multisig accounts
- [ ] Nothing: they exist exactly as in Ethereum
- [x] Nothing: every account is a service, so there is no transactor and no nonce
> Why: The Overview: all accounts are service accounts, not controlled by a secret key, so they do not need a nonce.

### Q How many pieces of code does a service have, compared with one for a contract?
@ State and accounts
- [ ] One
- [x] Two: refine and accumulate
- [ ] Three: authorize, refine, accumulate
- [ ] None; code lives off-chain
> Why: A service has two entry points, refinement and accumulation. Authorization is a separate authorizer's code.

### Q Where is a service's code stored?
@ State and accounts
- [ ] In the block header
- [ ] In a separate code registry
- [x] As a preimage: the account stores the code hash and the code is looked up by it
- [ ] In the validator's local disk only
> Why: Service code is found through the account's code hash in its preimage store (ch. 9).

### Q What is JAM's closest match to an Ethereum transaction?
@ Transactions and execution
- [ ] A block
- [ ] A guarantee
- [x] A work-item inside a work-package
- [ ] An assurance
> Why: External input reaches a service as a work-item, bundled into a work-package (ch. 14).

### Q How many work-items can one work-package hold?
@ Transactions and execution
- [ ] 1
- [ ] 8
- [x] 16
- [ ] 341
> Why: The Definitions cap work-items per package at 16.

### Q Where are work-packages sent, in place of a public mempool?
@ Transactions and execution
- [x] To the validators serving one core
- [ ] To every validator
- [ ] To the block author only
- [ ] To a service's owner
> Why: Work-packages are submitted to a core's guarantors, who refine them in-core.

### Q In JAM, what resource is bought in advance instead of paying gas per transaction?
@ Transactions and execution
- [ ] Blockspace
- [ ] Storage rent
- [ ] Tickets
- [x] Coretime
> Why: The Overview: "In place of Ethereum's gas model for purchasing and measuring blockspace, JAM has the concept of coretime, which is prepurchased and assigned to an authorization agent."

### Q Does gas still exist in JAM?
@ Transactions and execution
- [x] Yes, it still meters the virtual machine
- [ ] No, coretime replaced it entirely
- [ ] Only for accumulate
- [ ] Only for refine
> Why: The PVM runs within a gas limit for refine, accumulate and is-authorized alike.

### Q What replaces the EVM?
@ Transactions and execution
- [ ] WASM
- [ ] The Solana SVM
- [x] The PVM, based on RISC-V RV64EM
- [ ] A stack machine with 256-bit words
> Why: Overview, The Virtual Machine and Gas: the PVM is based on RISC-V, specifically RV64EM.

### Q How many registers does the PVM have, and how wide are they?
@ Transactions and execution
- [ ] 16 of 32 bits
- [ ] 32 of 64 bits
- [x] 13 of 64 bits
- [ ] 1024 slots of 256 bits
> Why: The PVM has 13 registers, each a 64-bit quantity.

### Q What replaces synchronous calls between contracts?
@ Transactions and execution
- [ ] Nothing; services cannot communicate
- [x] Deferred transfers with a memo, seen when the receiver next accumulates
- [ ] Shared storage between services
- [ ] Synchronous calls, as in Ethereum
> Why: Accumulate code sends transfers; the destination processes them when it is next accumulated (ch. 12).

### Q Who plays the role of a rollup's sequencer and executor?
@ Data and security
- [ ] An outside operator
- [ ] The block author
- [x] The validators serving a core (guarantors)
- [ ] The service's manager
> Why: Guarantors refine work-packages in-core and sign the resulting reports.

### Q What JAM mechanism plays the role of a data availability layer?
@ Data and security
- [ ] Storing every input on-chain
- [ ] Recent history
- [ ] The ticket accumulator
- [x] Erasure-coded pieces held by validators, confirmed by assurances
> Why: Work data is erasure-coded across validators, and assurances decide availability on-chain.

### Q What plays the role of fraud proofs?
@ Data and security
- [x] Auditing, followed by disputes if a report is wrong
- [ ] A seven-day challenge window
- [ ] Zero-knowledge proofs of every report
- [ ] Guarantors voting on their own work
> Why: Auditing (ch. 17) re-checks reports; disputes (ch. 10) judge and remove bad ones.

### Q Which three symbols are the validator sets?
@ Validators, time and consensus
- [ ] α, β, γ
- [x] κ, λ, ι
- [ ] ρ, ω, ξ
- [ ] σ, τ, υ
> Why: κ active, λ previous, ι staging.

### Q How long is a JAM slot, compared with Ethereum's 12 seconds?
@ Validators, time and consensus
- [ ] 12 seconds
- [ ] 2 seconds
- [x] 6 seconds
- [ ] 1 minute
> Why: P = 6 seconds.

### Q What is JAM's equivalent of Ethereum's proposer selection?
@ Validators, time and consensus
- [ ] RANDAO
- [ ] Proof of work
- [x] Safrole, a ticket lottery
- [ ] GRANDPA
> Why: Safrole selects the sealer of each slot from a sequence fixed in advance (ch. 6).

### Q What is JAM's finality gadget, playing Casper FFG's role?
@ Validators, time and consensus
- [ ] Safrole
- [ ] BEEFY
- [ ] Tendermint
- [x] GRANDPA
> Why: Chapter 19, Grandpa and the Best Chain.

### Q Which state root does a JAM header carry?
@ Blocks, roots and money
- [ ] The root after this block, as in Ethereum
- [x] The root of the prior state, the parent block's result
- [ ] No state root at all
- [ ] The root two blocks back
> Why: H_R is the prior state root, "a departure from both Polkadot and the Yellow Paper's Ethereum" (ch. 5).

### Q What are the five parts of a JAM extrinsic?
@ Blocks, roots and money
- [ ] Transactions, receipts, logs, withdrawals, blobs
- [ ] Guarantees, audits, tickets, votes, seals
- [x] Tickets, disputes, preimages, assurances, guarantees
- [ ] Headers, bodies, uncles, tickets, proofs
> Why: E = (E_T, E_D, E_P, E_A, E_G) in the Overview.

### Q What is JAM's closest match to Ethereum's logs and receipts?
@ Blocks, roots and money
- [x] Accumulation outputs θ, committed into recent history β
- [ ] The extrinsic hash
- [ ] Assurances
- [ ] Statistics π
> Why: Each service may yield a hash from accumulation; these are Merklized into the accumulation-output belt in β (ch. 7, 12).

### Q How is the native token divided, compared with ETH's 10¹⁸ wei?
@ Blocks, roots and money
- [ ] 10¹⁸ base units
- [ ] 10⁶ base units
- [x] A named denomination of 10⁹
- [ ] It is not divisible
> Why: The Overview presumes a standard named denomination for 10⁹ tokens, unlike Ethereum's 10¹⁸.

### Q What are the three biggest breaks from Ethereum named on the F1 page?
@ Where the analogy breaks hardest
- [ ] Faster blocks, bigger blocks, cheaper gas
- [x] Two runs per job, no transactor, and a header that commits to the prior state
- [ ] No smart contracts, no finality, no fees
- [ ] More validators, longer epochs, larger registers
> Why: These are the three differences F1 singles out as mattering most.

## Level 2

### Q A developer asks how to deploy a new service with a transaction. What is the right answer?
- [ ] Send a deploy transaction with the code
- [ ] Ask a validator to add it to genesis
- [x] There is no deploy transaction; an existing service creates it from accumulate code, with the `new` host call
- [ ] Post the code as a preimage and it deploys automatically
> Why: Service creation is an accumulate host call; JAM has no transactions.

### Q Why does JAM keep last epoch's validator set λ as well as the active set κ?
- [ ] To pay last epoch's rewards
- [x] To verify judgments and guarantees made under the previous set
- [ ] Because κ is only updated once per day
- [ ] To choose the next block author
> Why: Disputes accept judgments signed by keys from κ or λ, depending on the epoch the judgment names (ch. 10), and guarantees assigned in a rotation that crossed the epoch boundary are checked against λ′ (ch. 11).

### Q Why is it misleading to say "coretime is just gas"?
- [ ] Coretime is measured in seconds, gas is not
- [ ] Gas no longer exists
- [x] Gas still meters execution; coretime is the resource bought in advance and assigned to an authorizer, separating payment from the work itself
- [ ] Coretime is only used on-chain
> Why: The Overview separates procurement (coretime, via authorization) from metering (gas in the PVM).

### Q An Ethereum developer expects to read a block's post-state root from its header. What should they do in JAM?
- [ ] Read H_R of the same block
- [x] Read H_R of the next block, which commits to this block's result
- [ ] Recompute it from the extrinsic hash
- [ ] Read it from statistics π
> Why: A header carries the prior state root, so a block's own result is committed by its child.

### Q Why is there no public mempool in the Ethereum sense?
- [ ] JAM encrypts all transactions
- [ ] Blocks are empty
- [ ] Validators refuse external input
- [x] Work goes as work-packages to a specific core's guarantors, who refine it in-core
> Why: External input is refined in-core by assigned guarantors before anything reaches the chain.

### Q Which statement about slashing is accurate for the Gray Paper?
- [ ] The Gray Paper defines exact slashing amounts
- [x] Disputes record offenders; the staking and slashing system itself is out of the paper's scope
- [ ] There is no punishment at all
- [ ] Guarantors cannot be punished
> Why: The Overview puts the staking system out of scope; ch. 10 records offenders through ψ_O.

## Level 3

### Q Map one Ethereum contract call onto JAM's execution model.
> Hint: two runs, two places.
> Answer: In Ethereum every node runs the call once, statefully. In JAM the job is split: a heavy, stateless refine run by a core's few guarantors produces a small work-report, and after it becomes available every node runs the service's light, stateful accumulate code to apply the result. Refine is like rollup execution; accumulate is like the settlement contract.

### Q Why does JAM not need nonces?
> Hint: who signs a transaction in JAM?
> Answer: Nonces exist in Ethereum to order and de-duplicate transactions from key-controlled accounts. JAM has no such accounts and no transactions: every account is a service run by its code, and input arrives as work-items in packages. The Overview says services "are not controlled by a secret key, they do not need a nonce".

### Q Explain the header state-root difference and why JAM made it.
> Hint: pipelining.
> Answer: Ethereum's header commits to the state after the block. JAM's H_R commits to the state before it, the parent's result. That lets an author seal and publish a block before finishing the expensive Merklization of the new state. The cost is that a block's own result is only committed in its child's header, which recent history handles by correcting the stored root one block later.

### Q How does JAM separate paying for computation from doing it?
> Hint: coretime, authorizers, the pool and queue.
> Answer: Coretime is bought in advance and assigned to an authorization agent. Each core has a pool of authorizers, filled from a queue that privileged services program. A work-package names an authorizer and proves in-core that it is authorized; on-chain logic only checks that the authorizer is in the core's pool. So the payer and the author of the work need not be the same, supporting both Ethereum-style and Polkadot-style patterns.
