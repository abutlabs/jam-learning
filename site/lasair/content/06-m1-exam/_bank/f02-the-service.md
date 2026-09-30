---
chapter: f02-the-service
---

## Level 1

### Q In JAM, what is the equivalent of an Ethereum smart contract?
@ What JAM does
- [ ] A work-package
- [x] A service
- [ ] A validator
- [ ] A core
> Why: The GP says a service is "somewhat analogous to a smart contract in Ethereum": code, storage and a balance (§9).

### Q Does JAM have externally owned accounts (EOAs) like Ethereum?
@ What JAM does
- [ ] Yes, one per user key
- [ ] Yes, but only for validators
- [x] No, all accounts are service accounts
- [ ] No, accounts are replaced by cores
> Why: Overview, "On Services and Accounts": in JAM all accounts are service accounts, and since no secret key controls them they need no nonce.

### Q How many code entry points does a JAM service have?
@ What JAM does
- [ ] One
- [x] Two: refine and accumulate
- [ ] Three: refine, accumulate and on-transfer
- [ ] Four
> Why: accounts.tex lists entry point 0 refine and entry point 1 accumulate. Transfers are delivered into accumulate, not a separate entry point.

### Q Where does refine run?
@ What JAM does
- [x] In-core, on a small group of validators
- [ ] On every validator, on-chain
- [ ] On the user's machine
- [ ] Only on the block author
> Why: Refinement is "executed in-core and stateless" (§9 Code and Gas).

### Q Where does accumulate run?
@ What JAM does
- [ ] In-core, on three guarantors
- [ ] On the builder
- [x] On-chain, on every validator
- [ ] Only on auditors
> Why: Accumulation is "executed on-chain and stateful" (§9 Code and Gas).

### Q Which entry point can read and write the service's storage?
@ What JAM does
- [ ] Refine
- [x] Accumulate
- [ ] Both equally
- [ ] Neither; only the builder can
> Why: Refine is stateless. Accumulate is stateful and applies results to state.

### Q In jamswap, what does refine do?
@ What JAM does
- [x] It runs the matching engine: a batch auction at one clearing price
- [ ] It moves balances between accounts
- [ ] It stores the order book
- [ ] It signs orders for users
> Why: jamswap's ARCHITECTURE.md: refine is the matching engine and does not touch live state.

### Q In jamswap, what does accumulate do?
@ What JAM does
- [ ] It matches buy and sell orders
- [ ] It verifies every order signature from scratch
- [x] It settles: commits balances, the resting book and stats to storage
- [ ] It builds the next work-package
> Why: jamswap's ARCHITECTURE.md: accumulate is settlement and commits refine's output to service storage.

### Q Why is jamswap's matching engine integer-only and deterministic?
@ What JAM does
- [ ] To use less gas
- [x] So anyone who re-runs it gets the byte-identical result
- [ ] Because the PVM has no floating point hardware at all
- [ ] So the builder can skip it
> Why: jamswap's docs: determinism makes re-execution by auditors decisive; any mismatch is provable fraud.

### Q Which symbol names the table of all service accounts in state?
@ The words and symbols
- [ ] α
- [ ] ρ
- [ ] κ
- [x] δ
> Why: δ is the service accounts, a partial mapping from service id to account (eq. serviceaccounts).

### Q How is a service identified?
@ The words and symbols
- [ ] By a 20-byte address
- [x] By a 32-bit service id
- [ ] By its code hash
- [ ] By its creator's public key
> Why: eq. serviceaccounts: the service identifier is a natural below 2³².

### Q Where is a service's actual code kept?
@ The words and symbols
- [ ] Directly in the account as a code field
- [ ] In the block header
- [x] Among the account's preimages, found by its code hash
- [ ] On the builder's machine only
> Why: §9 Code and Gas: the account holds a code hash whose preimage (metadata plus code) must be in the preimage lookup.

### Q Which of these is NOT a field of a service account?
@ The words and symbols
- [ ] Balance
- [ ] Storage
- [ ] Code hash
- [x] Nonce
> Why: The account tuple has storage, preimages, requests, gratis offset, code hash, balance, two minimum gas values, created, last-accumulated and parent. No nonce.

### Q Why does a JAM service not need a nonce?
@ What JAM does
- [x] No secret key controls it, so there are no signed transactions to replay
- [ ] Nonces are stored in the header instead
- [ ] The PVM tracks them automatically
- [ ] Services can only be called once per block
> Why: Overview: "Since they are not controlled by a secret key, they do not need a nonce."

### Q How does one service send balance to another?
@ What JAM does
- [ ] Through a third entry point called on-transfer
- [x] With a deferred transfer from accumulate, delivered to the recipient's accumulate
- [ ] By a signed transaction from the service
- [ ] Transfers are not possible between services
> Why: Accumulation passes deferred transfers to the recipient's accumulate in the next accumulation round (ch. 12).

### Q The GP describes the difference between refine and accumulate as mainly one of...
@ Why it is built this way
- [ ] Cost versus privacy
- [x] Scalability versus synchroneity
- [ ] Speed versus security
- [ ] Storage versus compute
> Why: Overview: the primary difference between them is "one of scalability versus synchroneity".

## Level 2

### Q Alice's order must change her jamswap balance. Which entry point makes that change?
- [ ] Refine, because it sees the order first
- [ ] The builder, before submission
- [x] Accumulate, because only it can write state
- [ ] Is-authorized
> Why: Refine only produces an output; settlement that writes balances happens in accumulate.

### Q A jamswap refine run tries to read the live order book from state. What happens?
- [ ] It works because refine is on-chain
- [x] It cannot: refine is stateless, so the book has to be carried in the payload
- [ ] It reads the book from the header
- [ ] It triggers a dispute automatically
> Why: Refine has no live-state access. jamswap's builder includes the resting book in the round payload, and accumulate checks its hash against the on-chain book.

### Q Why can refine afford heavy computation that accumulate cannot?
- [ ] Refine has no gas limit
- [x] Only a few validators run each refine, while every validator runs accumulate
- [ ] Refine runs on GPUs
- [ ] Accumulate runs twice
> Why: In-core work is done by a subset; on-chain work is done by everyone, so it must stay light.

### Q A service's code hash points to a blob that is missing from its preimages. What is the effect?
- [ ] The service runs the previous code
- [x] The service has no usable code
- [ ] The block is invalid
- [ ] The builder uploads it automatically
> Why: §9: code and metadata are defined only when the preimage for the code hash is present; otherwise they are ∅.

### Q Which part of an Ethereum contract call has no counterpart when calling a JAM service?
- [ ] Gas
- [ ] Code
- [x] A user-signed transaction sent to the contract
- [ ] Storage
> Why: JAM input arrives as work-items in work-packages; no user signs a transaction to a service. jamswap checks trader signatures inside refine itself.

### Q Service A transfers balance to service B during accumulation. When does B see it?
- [ ] In the next block
- [ ] Immediately, in the same accumulate call
- [x] In a later accumulation round of the same block, as an input to B's accumulate
- [ ] Only after the next epoch
> Why: Deferred transfers are carried into the next Δ+ round and passed to the destination's accumulate (ch. 12).

## Level 3

### Q Explain what a JAM service is to an Ethereum developer, and where the analogy breaks.
> Hint: start from "contract account", then name the two entry points.
> Answer: A service is like a contract account: it has code, storage and a balance, identified by a 32-bit id. Unlike a contract, its code has two entry points: refine, which runs in-core on a few validators, statelessly, for heavy work; and accumulate, which runs on-chain on every validator and changes state. The analogy breaks because no user calls a service with a signed transaction: input arrives in work-packages, and there are no EOAs.

### Q How does jamswap map an exchange onto refine and accumulate?
> Hint: trading floor versus clearing house.
> Answer: Refine is the matching engine: it verifies orders and clears the batch auction at one price, deterministically, without touching state. Accumulate is settlement: it applies the fills to balances, stores the resting book and stats. Heavy matching goes where JAM scales; balance changes go where every node agrees.

### Q Why does the GP say refine and accumulate differ in "scalability versus synchroneity"?
> Hint: who runs each, and what each can see.
> Answer: Refine runs on only a subset of validators per core, so total refine capacity grows with the number of cores: it scales. Accumulate runs on everyone, in step with the chain's state, so it is synchronous but limited. Both are run by the same validator set, and JAM's rewards and penalties aim to give in-core results comparable security.
