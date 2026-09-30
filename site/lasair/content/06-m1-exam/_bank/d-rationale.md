---
chapter: d-rationale
---

## Level 1

### Q What does JAM stand for?
@ The JAM Common Era
- [ ] JavaScript Application Machine
- [ ] Joint Asynchronous Model
- [x] Join-Accumulate Machine
- [ ] Just Another Machine
> Why: The Graypaper's full title is "JAM: Join-Accumulate Machine".

### Q Which Polkadot Fellowship RFC is JAM's predecessor proposal?
@ The JAM Common Era
- [x] RFC-31, CoreJam
- [ ] RFC-17
- [ ] RFC-1
- [ ] RFC-100
> Why: Introduction §1.1: the Polkadot Fellowship RFC 31, known as CoreJam.

### Q Where does the name CoreJam come from?
@ The JAM Common Era
- [ ] The number of cores in Polkadot
- [ ] A core-sharing jam session
- [x] The collect/refine/join/accumulate model of computation
- [ ] Gavin Wood's first client
> Why: Introduction §1.1.

### Q How many driving factors does the Graypaper list?
@ The driving factors
- [ ] Three
- [ ] Seven
- [x] Five
- [ ] Four
> Why: Resilience, generality, performance, coherency, accessibility.

### Q Which of these is NOT one of the five driving factors?
@ The driving factors
- [x] Anonymity
- [ ] Coherency
- [ ] Accessibility
- [ ] Resilience
> Why: The five are resilience, generality, performance, coherency and accessibility.

### Q What does "resilience" mean in the Graypaper?
@ The driving factors
- [x] Being highly resistant to being stopped, corrupted and censored
- [ ] Low fees
- [ ] Recovering quickly from bugs
- [ ] Having many client implementations
> Why: Introduction §1.2: "highly resistant from being stopped, corrupted and censored".

### Q What does "generality" mean in the Graypaper?
@ The driving factors
- [ ] Running on general hardware
- [x] Turing-complete computation
- [ ] Supporting many token types
- [ ] Having a general governance model
> Why: Bitcoin lacked it, Ethereum provided it.

### Q What does "coherency" mean in the Graypaper?
@ The driving factors
- [ ] Blocks arrive on time
- [ ] All nodes agree on the head
- [x] The causal relationship possible between different elements of state, so applications can be composed
- [ ] Code is readable
> Why: Introduction §1.2.

### Q What does "accessibility" mean in the Graypaper?
@ The driving factors
- [ ] Low validator hardware
- [ ] A friendly user interface
- [ ] Support for screen readers
- [x] Negligible barriers to innovation: easy, fast, cheap and permissionless
> Why: Introduction §1.2.

### Q Which two driving factors are antagonistic?
@ The driving factors
- [x] Performance and coherency
- [ ] Resilience and generality
- [ ] Generality and accessibility
- [ ] Accessibility and resilience
> Why: The size-coherency antagonism (§1.3).

### Q What is the size-coherency antagonism?
@ The driving factors
- [ ] More validators mean slower finality
- [ ] Larger code is harder to audit
- [x] More state means more distance between state components, which delays how fast all effects of an event are felt, i.e. less coherence
- [ ] Bigger blocks are less secure
> Why: §1.3.

### Q What is the usual way systems scale, which JAM tries to avoid?
@ The driving factors
- [x] Fragmenting into causally independent subsystems
- [ ] Faster hashing
- [ ] Bigger single machines
- [ ] Longer block times
> Why: "A bacterium may split into two": Polkadot, Cosmos and scaled Ethereum partition, losing coherence.

### Q What is JAM's middle ground between one machine and fragmentation?
@ The driving factors
- [x] Pipelining a highly scalable, mostly coherent element into a synchronous, fully coherent element
- [ ] Two independent chains
- [ ] Sharded storage
- [ ] Optimistic roll-ups
> Why: §1.3; asynchrony is bounded to the length of the pipeline.

### Q Which consensus-level security does JAM keep from Polkadot?
@ What JAM rejects and why
- [ ] Casper FFG
- [ ] Tendermint
- [ ] Proof of work
- [x] ELVES
> Why: JAM "co-opts much of the same game-theoretic and cryptographic machinery as Polkadot known as Elves" (Previous Work, "Polkadot").

### Q What is the Graypaper's main criticism of Polkadot parachains?
@ What JAM rejects and why
- [ ] Too expensive to audit
- [ ] Too centralised
- [ ] Too slow to finalise
- [x] Low composability: parachains are highly isolated and XCMP is asynchronous and coarse-grained
> Why: Previous Work, "Polkadot".

### Q What pattern does the Graypaper see in Ethereum roll-ups?
@ What JAM rejects and why
- [x] A broad pattern of centralisation and heterogeneous security and economics
- [ ] Too much decentralisation
- [ ] Excessive block size
- [ ] Too many validators
> Why: Previous Work, "Ethereum": a research report "found a broad pattern of centralization" in roll-ups, and their communication, security and economic properties are heterogeneous across vendors.

### Q What is the headline cost multiplier the Graypaper cites for SNARK proving (RISC-Zero) versus simply executing?
@ What JAM rejects and why
- [ ] 1,000×
- [x] About 66,000,000×
- [ ] 10×
- [ ] 2×
> Why: Previous Work, "Snark Roll-ups": "the cost multiplier of proving using risc-zero is 66,000,000x of the cost".

### Q How much longer than execution did the cited RISC-Zero benchmark take to prove?
@ What JAM rejects and why
- [ ] A million times
- [ ] 600 times
- [x] Over 61,000 times
- [ ] 2 times
> Why: Previous Work, "Snark Roll-ups": "over 61,000 times as long as simply recompiling and executing".

### Q What does the Graypaper say fragmented networks like Cosmos lack?
@ What JAM rejects and why
- [ ] Smart contracts
- [x] Homogeneous security
- [ ] Messaging
- [ ] Tokens
> Why: Separate validator sets with no causal link between misbehaviour and punishment.

### Q What problem does the Graypaper see in high-performance monoliths like Solana?
@ What JAM rejects and why
- [ ] Too little throughput
- [ ] No smart contracts
- [x] Structural centralisation, outages, and performance capped by one machine's hardware
- [ ] Too many client implementations
> Why: Previous Work, "High-Performance Fully Synchronous Networks".

### Q What reason does the Graypaper give for putting the prior state root in the header?
@ The design decisions and their reasons
- [x] To pipeline block computation, in particular Merklization
- [ ] Smaller headers
- [ ] To speed up finality
- [ ] Compatibility with Ethereum
> Why: §5, "a departure from both Polkadot and the Yellow Paper's Ethereum".

### Q Why does JAM use Keccak for the accumulation belt?
@ The design decisions and their reasons
- [x] To maximise compatibility with legacy systems
- [ ] It is post-quantum
- [ ] It is faster than Blake2b
- [ ] Because Safrole requires it
> Why: §7.

### Q What is the PVM based on?
@ The design decisions and their reasons
- [x] RISC-V (RV64EM)
- [ ] x86
- [ ] WebAssembly
- [ ] The EVM
> Why: Overview, "The Virtual Machine and Gas".

### Q Why RISC-V for the PVM, per the Graypaper?
@ The design decisions and their reasons
- [ ] It is the only open ISA
- [x] Excellent existing tooling (LLVM, Rust, C++) and suitability for efficient recompilers on common hardware
- [ ] It runs in browsers
- [ ] It supports floating point
> Why: Overview, "The Virtual Machine and Gas".

### Q What replaces Ethereum's "transactor" in JAM?
@ The design decisions and their reasons
- [ ] Service nonces
- [x] Coretime assigned to authorization agents, with authorizers deciding which packages may run
- [ ] Validators signing on behalf of users
- [ ] A global mempool
> Why: Overview, "The Core Model and Services", and chapter 8.

### Q Why do JAM services not need a nonce?
@ The design decisions and their reasons
- [ ] Nonces are stored in ψ
- [ ] Gas prevents replay
- [ ] The header has a nonce instead
- [x] They are not controlled by a secret key
> Why: Overview, "The Core Model and Services": all accounts are service accounts, not controlled by a secret key.

### Q Why does JAM erasure-code with roughly one-third reconstruction?
@ The design decisions and their reasons
- [ ] Because Grandpa needs it
- [ ] Because there are three guarantors
- [ ] To save bandwidth only
- [x] So data can be reconstructed even if almost two-thirds of validators are malicious or incapacitated
> Why: Erasure Coding appendix: the rate is chosen so data can be reconstructed "even should almost two-thirds of the v validators be malicious or incapacitated".

### Q When does the JAM Common Era begin?
@ The JAM Common Era
- [ ] The block when the Graypaper was published
- [ ] Midnight UTC, 1 January 2024
- [x] 12:00 UTC, 1 January 2025
- [ ] Unix time zero
> Why: Overview, "Time".

### Q Why midday UTC for the JAM Common Era?
@ The JAM Common Era
- [ ] Gavin Wood's birthday
- [x] So all major timezones are on the same date at every 24-hour multiple
- [ ] To align with Ethereum's genesis
- [ ] It matches Unix time
> Why: Overview, "Time".

### Q What is JAM's token denomination, in base units?
@ The JAM Common Era
- [ ] 10¹⁸
- [ ] 10¹⁰
- [x] 10⁹
- [ ] 10¹²
> Why: Overview, "Economics"; Ethereum 10¹⁸, Polkadot 10¹⁰, Kusama 10¹².

### Q Why does the Graypaper write errors as ∇ rather than ⊥?
@ The JAM Common Era
- [ ] Because ∇ is shorter
- [x] To avoid confusion with Boolean false
- [ ] It is a typesetting accident
- [ ] Because ⊥ is used for panic
> Why: Notation §3.3.

### Q What is the one way JAM uses its common-clock assumption?
@ The design decisions and their reasons
- [ ] To order transactions
- [x] To treat blocks with a future timeslot as temporarily invalid
- [ ] To set gas prices
- [ ] To schedule audits
> Why: Overview, "Time".

## Level 2

### Q A critic says "Why not just use ZK proofs instead of auditors?" What is the Graypaper's answer?
- [x] Proving costs many orders of magnitude more than executing, and SNARKs present no great escape from decentralisation and redundancy, which multiplies the cost again
- [ ] ZK proofs are insecure
- [ ] ZK proofs cannot run on RISC-V
- [ ] Auditors are faster to implement
> Why: Previous Work, "Snark Roll-ups" (61,000× time, 66,000,000× cost, and the pit-of-centralisation argument).

### Q A critic asks "Why not keep splitting into more parachains?" Which factor does the Graypaper say that sacrifices?
- [ ] Performance
- [ ] Resilience
- [ ] Generality
- [x] Coherency
> Why: Fragmentation scales at the cost of coherence.

### Q Which design decision answers "how do we get scale without losing coherence"?
- [ ] The JAM Common Era
- [ ] Keccak hashing
- [x] Refine in-core, accumulate on-chain, pipelined
- [ ] The prior state root
> Why: The pipeline is the stated middle ground.

### Q Which design decision answers "how does an outside user pay for work without being a transactor"?
- [ ] Service nonces
- [ ] Validator tips
- [ ] Gas
- [x] Coretime assigned to authorization agents
> Why: Overview, "The Core Model and Services", and chapter 8.

### Q Which design decision answers "how do we author blocks with few forks"?
- [ ] The accumulation belt
- [ ] Grandpa voting
- [ ] Erasure coding
- [x] Safrole's anonymous tickets fixing one sealer per slot
> Why: Chapter 6: the chief purpose of block production is to limit the rate of authoring and ideally preclude forks.

### Q Does the Graypaper argue that Safrole is better than BABE?
- [x] No; it names BABE only once, calling the design similar in nature to Polkadot's BABE/Grandpa hybrid
- [ ] It never mentions BABE
- [ ] Yes, in the Discussion
- [ ] Yes, at length in chapter 2
> Why: Chapter 6. "Why not BABE" is not in the GP.

### Q Does the Graypaper discuss WebAssembly as an alternative to the PVM?
- [x] No; it is mentioned once, in a Discussion gas benchmark, never as a PVM alternative
- [ ] Yes, it compares them in detail as VM candidates
- [ ] It says WASM will be supported later
- [ ] Yes, it says WASM is too slow
> Why: The only mention is the Moonbeam benchmark in the Discussion. Any WASM versus RISC-V argument is community rationale (not in the GP).

### Q What trade-off does putting the prior state root in the header accept?
- [ ] Larger headers
- [x] An importer only learns whether it agreed with the author when the next block arrives
- [ ] Slower block production
- [ ] Two hash functions
> Why: The recent-history β† correction exists because of this.

### Q What trade-off does ELVES auditing accept instead of ZK proofs?
- [ ] Every validator re-executes every report
- [x] Security rests on crypto-economics and an honest supermajority, and a large share of validator CPU goes to auditing
- [ ] Reports can never be challenged
- [ ] No finality at all
> Why: The design decisions table. The CPU-share point is reasoning from the audit load (not in the GP as such).

### Q Why is Solana-style "one optimised codebase" a resilience problem per the Graypaper?
- [x] A protocol defined by one implementation creates structural centralisation, with outages as evidence
- [ ] It has too many validators
- [ ] Rust is unsafe
- [ ] It uses proof of history
> Why: Previous Work, "High-Performance Fully Synchronous Networks"; Ethereum's multiple clean-room implementations are the contrast.

### Q Why does a 24-hour lookup anchor make sense?
- [ ] It is the preimage expiry
- [ ] It is the audit period
- [x] Refine must be reproducible from finalised, reasonably recent state, and nodes need only keep 24 hours of headers
- [ ] It matches the epoch
> Why: Overview, "The Core Model and Services" (lookup anchor finalised and reasonably recent) and chapter 5 (keep 24 hours of headers). The link between them is reasoning.

### Q Why accept fixed validator (1023) and core (341) counts?
- [ ] For simpler governance
- [ ] To match Polkadot
- [ ] Because 1024 is too many
- [x] Three validators per core and 1023 is a size where the erasure rate is optimal; the whole capacity model is sized from them
> Why: Erasure Coding appendix (1023 is in the optimal set) and the Discussion (1,023 validators, three per core).

### Q A critic says "Keccak and Blake2b both? That is inconsistent." What is the Graypaper's reason?
- [ ] Keccak is required by Safrole
- [x] Keccak is used where legacy systems (bridges) must verify commitments cheaply; Blake2b everywhere else
- [ ] Blake2b is deprecated
- [ ] Keccak is faster for small inputs
> Why: §7.

### Q Which factor does JAM gain over Polkadot parachains through services instead of chains?
- [x] Accessibility and coherency: no chain to build or slot to win, and services share a synchronous accumulate stage
- [ ] None; it is the same
- [ ] Resilience only
- [ ] Generality only
> Why: Previous Work, "Polkadot", on accessibility (auctions, deposits) and composability.

### Q Which statement about roll-ups best matches the Graypaper?
- [ ] They are fully decentralised
- [ ] They are cheaper than JAM
- [ ] They are the model JAM copies
- [x] They offer no grand consolidation: heterogeneous latency, security and economics across vendors
> Why: Previous Work, "Ethereum": no "grand consolidation" of heterogeneous properties across roll-up vendors.

## Level 3

### Q Explain the size-coherency antagonism and JAM's answer.
> Hint: distance in state, fragmentation, pipeline.
> Answer: As state grows it takes more space, the distance between state components grows, and the time for all effects of an event to propagate grows, so the system becomes less coherent. The usual fix is to split into independent subsystems, which loses composability. JAM instead pipelines a scalable, mostly coherent in-core stage into a synchronous, fully coherent on-chain stage, bounding asynchrony to the pipeline length.

### Q Why refine in-core and accumulate on-chain?
> Hint: scale versus synchrony.
> Answer: Everybody doing everything does not scale. Refine is stateless and can run on a few validators per core, so services can scale in input size and computation. Accumulate is stateful and must be synchronous and coherent, so it runs on-chain with a small gas budget. Rewards and penalties make in-core work comparably secure, leaving scalability versus synchronicity as the only difference.

### Q Why ELVES auditing rather than validity proofs?
> Hint: cost and centralisation.
> Answer: The Graypaper cites RISC-Zero proving at over 61,000 times as long as simply recompiling and executing, and a 66,000,000× cost multiplier. SNARKs "present no great escape from decentralization and the need for redundancy", so provers still need multiple incentivised parties, multiplying cost again, and real deployments show a pit of centralisation. ELVES gets security from crypto-economics and random audits at a fraction of the cost.

### Q Name the five driving factors and one line on each.
> Hint: R, G, P, C, A.
> Answer: Resilience: hard to stop, corrupt or censor. Generality: Turing-complete computation. Performance: quick and cheap computation. Coherency: state elements can causally affect each other, so apps compose. Accessibility: negligible barriers to building, easy, cheap and permissionless.

### Q What does JAM take from Polkadot and what does it change?
> Hint: ELVES, parachains.
> Answer: It keeps ELVES security and the idea of partitioned work across cores. It replaces isolated parachains and asynchronous XCMP with services that share a synchronous accumulate stage, and replaces slot auctions with coretime and authorizers, improving coherency and accessibility.

### Q Why a common clock, and what is it used for?
> Hint: one use only.
> Answer: JAM explicitly assumes a universally known time, noting NTP is pragmatic and resilient. It uses it only to treat future-dated blocks as temporarily invalid, which supports Safrole's slot-based authoring.

### Q Why services without keys?
> Hint: no transactor.
> Answer: All accounts are services with code; none is controlled by a secret key, so none needs a nonce. External input enters through refine, paid for by coretime via authorizers, so no transaction signer is required.

### Q Why does the header carry the prior, not the posterior, state root?
> Hint: pipelining.
> Answer: To pipeline block computation and Merklization: an author can seal and publish before re-Merklizing the new state. The cost is that an importer learns agreement only from the next header, which recent history corrects with β†.

### Q Which rationale points are NOT in the Graypaper, and how would you answer honestly if asked?
> Hint: BABE, WASM.
> Answer: The GP does not argue Safrole against BABE and does not discuss WASM. I would say so, give the GP's own reasons (fork minimisation via anonymous tickets; RISC-V tooling and recompiler suitability), and label anything further as community rationale.

### Q Why 1023 validators rather than a round 1000?
> Hint: erasure coding.
> Answer: The erasure code's rate F(v):v is optimal (F(v) = v/3 + 1) only for certain v, and 1023 is one of them, giving 341 cores with three guarantors each. A value just below an optimal one, like 1022, has a rate of about 1:4.5.
