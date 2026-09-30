---
chapter: ch04-overview
---

## Level 1

### Q What two things define a blockchain in the Gray Paper's view?
@ State touched
- [x] A genesis state and a block-level state-transition function
- [ ] A consensus algorithm and a fork-choice rule
- [ ] A validator set and a token
- [ ] A header format and a hash function
> Why: §4: σ' ≡ Υ(σ, B); JAM is defined by Υ and a genesis state σ⁰.

### Q In σ' ≡ Υ(σ, B), what is σ'?
@ State touched
- [ ] The prior state
- [x] The posterior state after the block
- [ ] The genesis state
- [ ] The state root in the header
> Why: The prime marks the posterior state; σ is the prior state and B the block.

### Q How many components does the state tuple σ have in 0.8.0?
@ State touched
- [ ] 9
- [ ] 13
- [x] 17
- [ ] 21
> Why: eq. statecomposition lists α, β, θ, γ, δ, η, ι, κ, λ, ρ, τ, φ, χ, ψ, π, ω, ξ.

### Q Which state component holds the service accounts?
@ State touched
- [ ] α
- [ ] χ
- [x] δ
- [ ] π
> Why: δ is the service-account state, analogous to the Yellow Paper's accounts.

### Q Which state component is the active validator set?
@ State touched
- [ ] ι
- [x] κ
- [ ] λ
- [ ] γ
> Why: κ is active; λ the previous (archived) set; ι staging.

### Q Which state component is the previous epoch's validator set?
@ State touched
- [ ] ι
- [ ] κ
- [x] λ
- [ ] ψ
> Why: Validators are identified within κ, archived in λ and enqueued from ι.

### Q Which state component holds validator keys queued (staged) for a future epoch?
@ State touched
- [x] ι
- [ ] κ
- [ ] λ
- [ ] η
> Why: ι is the staging set, written by the privileged validator-designating service during accumulation.

### Q What does η hold?
@ State touched
- [ ] The timeslot
- [ ] Validator statistics
- [x] The on-chain entropy pool
- [ ] Ticket proofs
> Why: §4: an on-chain entropy pool is retained in η (four accumulators).

### Q What does τ hold?
@ State touched
- [x] The most recent block's timeslot
- [ ] The epoch index
- [ ] The number of tickets
- [ ] The wall-clock time
> Why: τ is the timeslot index of the most recent block.

### Q What is α?
@ State touched
- [ ] The authorizer queue
- [x] The authorizer pool, per core
- [ ] The accumulation queue
- [ ] The availability bitfield
> Why: α holds each core's authorizers work must satisfy when reported; φ is the queue that fills it.

### Q What is φ?
@ State touched
- [x] The per-core authorizer queue
- [ ] The privileges
- [ ] The disputes state
- [ ] The accumulated history
> Why: φ is the queue from which the authorizer pool α is filled.

### Q What does ρ hold (called availability assignments in 0.8.0)?
@ State touched
- [ ] The recent block hashes
- [x] Each core's work-report guarantee awaiting availability, if any
- [ ] The ready queue
- [ ] Validator statistics
> Why: ρ is each core's currently assigned work-report guarantee whose package availability must still be assured. 0.8.0 renamed it from "reports".

### Q Which component tracks judgments (good, bad, wonky reports and offenders)?
@ State touched
- [ ] π
- [ ] χ
- [x] ψ
- [ ] ω
> Why: judgments are tracked in ψ (chapter 10).

### Q Which component holds validator (activity) statistics?
@ State touched
- [x] π
- [ ] ψ
- [ ] θ
- [ ] ξ
> Why: π holds activity statistics (chapter 13).

### Q Which component lists service ids holding privileged status?
@ State touched
- [ ] δ
- [x] χ
- [ ] α
- [ ] ι
> Why: The identities of privileged services are tracked in χ.

### Q Which two components hold reports ready to accumulate and recently accumulated packages?
@ State touched
- [ ] ρ and β
- [x] ω and ξ
- [ ] θ and π
- [ ] α and φ
> Why: ω holds reports ready but waiting; ξ holds recently accumulated work-package hashes.

### Q What is β?
@ State touched
- [ ] The Safrole state
- [x] Recent history of blocks plus the accumulation-output belt
- [ ] The Beefy state
- [ ] The balance table
> Why: β holds the most recent blocks' details (chapter 7).

### Q What is γ?
@ State touched
- [x] The Safrole state: pending keys, ring root, sealer sequence, ticket accumulator
- [ ] The guarantor assignments
- [ ] The gas budget
- [ ] The Grandpa votes
> Why: all other state concerning determination of validator keys is held in γ.

### Q What two parts make up a block B?
@ Inputs
- [x] A header H and an extrinsic E
- [ ] A state root and a signature
- [ ] A parent hash and a body of transactions
- [ ] A seal and a set of work-packages
> Why: eq. block: B ≡ (H, E).

### Q How many components does the extrinsic have?
@ Inputs
- [ ] 3
- [ ] 4
- [x] 5
- [ ] 7
> Why: eq. extrinsic: tickets, disputes, preimages, assurances, guarantees.

### Q Which extrinsic carries new work-reports signed by guarantors?
@ Inputs
- [ ] E_A
- [x] E_G
- [ ] E_P
- [ ] E_T
> Why: E_G, the guarantees, carries reports of completed work whose accuracy validators guarantee.

### Q Which extrinsic carries validators' statements of which packages' data they hold?
@ Inputs
- [x] E_A, assurances
- [ ] E_G, guarantees
- [ ] E_D, disputes
- [ ] E_T, tickets
> Why: availability: assurances by each validator about data they received and store.

### Q Which extrinsic carries data a service has requested to be available for lookup?
@ Inputs
- [ ] E_T
- [ ] E_A
- [x] E_P, preimages
- [ ] E_D
> Why: preimages: static data requested to be available for workloads to fetch on demand.

### Q What are tickets (E_T) used for?
@ Inputs
- [ ] Paying for coretime
- [x] Selecting which validators may author blocks in future slots
- [ ] Voting on disputes
- [ ] Reporting work
> Why: tickets feed the mechanism that manages selection of validators for block authoring (Safrole).

### Q What is the tuple order of the extrinsic in eq. extrinsic?
@ Inputs
- [x] Tickets, disputes, preimages, assurances, guarantees
- [ ] Guarantees, assurances, preimages, disputes, tickets
- [ ] Tickets, preimages, guarantees, assurances, disputes
- [ ] Disputes, tickets, guarantees, preimages, assurances
> Why: E ≡ (E_T, E_D, E_P, E_A, E_G).

### Q Which posterior component depends on the header alone?
@ The dependency graph
- [x] τ'
- [ ] η'
- [ ] κ'
- [ ] β†
> Why: τ' ≺ H. β† needs β as well; η' needs τ and η.

### Q What does the dagger (†, ‡) on a component mean?
@ The dependency graph
- [ ] The posterior value
- [x] An intermediate value used by more than one later step
- [ ] A value from the previous epoch
- [ ] A hashed value
> Why: The only synchronous entanglements are visible through the dagger intermediates.

### Q Which is processed first for ρ: disputes, assurances or guarantees?
@ The dependency graph
- [x] Disputes (ρ†), then assurances (ρ‡), then guarantees (ρ')
- [ ] Guarantees, then assurances, then disputes
- [ ] Assurances, then disputes, then guarantees
- [ ] All three at once
> Why: ρ† ≺ (E_D, ρ); ρ‡ ≺ (E_A, ρ†); ρ' ≺ (E_G, ρ‡, κ, τ').

### Q Which comes later in the graph: accumulation or preimage integration?
@ The dependency graph
- [ ] Preimage integration comes first
- [x] Preimage integration comes after accumulation
- [ ] They are the same step
- [ ] Neither touches δ
> Why: δ' ≺ (E_P, δ‡, τ') where δ‡ is post-accumulation. The paper says accumulation can happen before preimages are folded in.

### Q Which component is computed from the posterior queue φ' produced by accumulation?
@ The dependency graph
- [ ] φ'
- [x] α'
- [ ] β†
- [ ] ρ'
> Why: α' ≺ (H, E_G, φ', α), so the pool update runs after accumulation.

### Q Which two consensus mechanisms does JAM use?
@ Key concepts to be able to explain
- [ ] BABE and Grandpa
- [x] Safrole for block production and Grandpa for finality
- [ ] Proof of work and Beefy
- [ ] Sassafras and Tendermint
> Why: §4 Which History: Safrole governs extension; Grandpa governs finalization.

### Q When does the JAM Common Era begin?
@ Key concepts to be able to explain
- [ ] Midnight UTC, 1 January 2024
- [x] 12:00 UTC, 1 January 2025
- [ ] 12:00 UTC, 1 January 2026
- [ ] The Polkadot genesis block
> Why: §4 Time: 1200 UTC on 1 January 2025 (Unix 1 735 732 800).

### Q What is the slot length and the full epoch length in wall time?
@ Key concepts to be able to explain
- [x] 6 seconds, one hour
- [ ] 2 seconds, ten minutes
- [ ] 12 seconds, one day
- [ ] 6 seconds, one day
> Why: E = 600 slots of 6 seconds, 3600 seconds.

### Q How wide is a timeslot index?
@ Key concepts to be able to explain
- [ ] 16 bits
- [x] 32 bits
- [ ] 64 bits
- [ ] 256 bits
> Why: eq. time: the timeslot set is ℕ_{2^32}; it lasts until mid-August 2840.

### Q How many registers does the PVM have, and how wide are they?
@ Key concepts to be able to explain
- [ ] 16 registers of 32 bits
- [x] 13 registers of 64 bits
- [ ] 32 registers of 64 bits
- [ ] 8 registers of 64 bits
> Why: §4 VM: 13 registers, each a 64-bit quantity; the PVM is based on RV64EM.

### Q What is the PVM page size?
@ Key concepts to be able to explain
- [ ] 1024 octets
- [x] 4096 octets
- [ ] 65 536 octets
- [ ] 16 MB
> Why: Z_P = 2^12 = 4096.

### Q Which is NOT one of the PVM exit reasons?
@ Key concepts to be able to explain
- [ ] halt
- [ ] out of gas
- [ ] page fault
- [x] timeout
> Why: Exit reasons are halt, panic, out-of-gas, page fault (with address) and host call.

### Q What does a balance consist of?
@ Key concepts to be able to explain
- [x] A natural below 2^64
- [ ] A signed 128-bit integer
- [ ] A natural below 2^32
- [ ] A rational number
> Why: eq. balance: 𝔹 ≡ ℕ_{2^64}; the named denomination is 10⁹ units.

### Q What is refinement in JAM?
@ Key concepts to be able to explain
- [ ] On-chain stateful execution
- [x] In-core, largely stateless processing of work-package input into a small output
- [ ] Validator key rotation
- [ ] The finality protocol
> Why: §4: refinement is the high-performance stateless processor executed in-core.

### Q What is accumulation?
@ Key concepts to be able to explain
- [ ] The stateless in-core stage
- [x] The on-chain stateful stage that can transfer balance and call other services
- [ ] Collecting tickets
- [ ] Merklizing the state
> Why: The accumulator code is stateful, closer to an Ethereum contract.

### Q Does JAM have a "transactor" account that signs transactions?
@ Key concepts to be able to explain
- [ ] Yes, every service call is signed by one
- [x] No: coretime is prepurchased and assigned to an authorization agent
- [ ] Only for preimages
- [ ] Only for tickets
> Why: §4: in JAM there is no concept of a transactor; coretime replaces the gas-purchase model.

### Q A block whose timeslot is in the future is:
@ Validation rules and what they guard
- [ ] Permanently invalid
- [x] Temporarily invalid; it may become valid as time advances
- [ ] Valid if the author is honest
- [ ] Valid but not finalizable
> Why: §4 Time: blocks are temporarily invalid if their timeslot is in the future.

## Level 2

### Q A block has an empty extrinsic and does not cross an epoch boundary. Which component certainly does NOT change?
- [ ] τ
- [ ] β
- [ ] α
- [x] ψ
> Why: ψ changes only from the disputes extrinsic. τ, β and α (queue rotation) change every block.

### Q Why must disputes be processed before assurances for ρ?
- [x] So a report judged bad in this block is cleared before it could become available and be accumulated
- [ ] Because assurances are signed with the disputes key
- [ ] Because disputes are larger
- [ ] Because the header orders them that way
> Why: ρ† clears bad or wonky reports; ρ‡ then counts assurances against ρ†.

### Q At an epoch boundary, which rotation is correct?
- [ ] κ' ← ι and λ' ← γ_P
- [x] λ' ← κ and κ' ← γ_P, with γ_P' ← Φ(ι)
- [ ] κ' ← λ and λ' ← κ
- [ ] ι' ← κ and κ' ← ι
> Why: The previous active set is archived, the pending set becomes active, and the staging set (offenders nulled by Φ) becomes pending.

### Q At an epoch boundary, where are offenders' keys nulled?
- [ ] On the way from γ_P to κ
- [x] On the way in from ι to γ_P', by Φ
- [ ] In λ'
- [ ] They are never nulled
> Why: γ_P' ← Φ(ι); Φ replaces keys of validators in the offenders set.

### Q An implementation computes α' before accumulation runs. What is the risk?
- [ ] None, α is independent of accumulation
- [x] It uses the prior queue φ instead of φ', missing an assign made this block
- [ ] It double-counts assurances
- [ ] It breaks the header seal
> Why: α' ≺ (H, E_G, φ', α); φ' is defined by accumulation.

### Q Which pair can be computed in parallel with no ordering constraint between them?
- [x] ψ' and η'
- [ ] ρ† and ρ‡
- [ ] δ‡ and δ'
- [ ] φ' and α'
> Why: ψ' ≺ (E_D, ψ) and η' ≺ (H, τ, η) share no inputs derived from each other; the other pairs are chained.

### Q Which component does NOT enter accumulation's inputs in the dependency graph?
- [ ] ω (ready queue)
- [ ] χ (privileges)
- [x] E_P (preimages extrinsic)
- [ ] ι (staging set)
> Why: Accumulation reads R*, ω, ξ, δ, χ, ι, φ, τ, τ'. Preimages are integrated afterwards.

### Q What is R* in the graph?
- [ ] The set of all guarantees in the block
- [x] The work-reports this block will accumulate, which start from the reports its assurances just made available
- [ ] The accumulated package hashes
- [ ] The tickets that won
> Why: The graph writes R* ≺ (E_A, ρ†). Chapter 12 defines **R** as the newly available reports and R* = R! ⌢ Q(q) as the accumulatable sequence, which also draws on the ready queue ω.

### Q Which statement about the header's state root is right?
- [ ] It commits to the posterior state of this block
- [x] It commits to the prior state, the parent's posterior
- [ ] It commits to the extrinsic
- [ ] It is optional
> Why: H_R = merklize(σ), the prior state; chapter 5 explains this is for pipelining.

### Q In-core computation is reproducible by any synced node. What does it need?
- [x] The service's refine code, the authorizer code and any preimage lookups made
- [ ] The whole service state δ
- [ ] The current validator set
- [ ] The Grandpa votes
> Why: §4 In-core consensus: requirements include only refinement code, authorizer code and preimage lookups.

### Q When does the paper say an extension of the chain must be reverted and not finalized?
- [ ] When it contains an empty block
- [x] When it contains a block reporting data that any other block's state has tagged invalid
- [ ] When two authors seal the same slot
- [ ] When the epoch changes
> Why: §4 Which History: such extensions are reverted and Grandpa must not finalize them.

### Q Which three stages make in-core results trustworthy?
- [ ] Sealing, finalizing, bridging
- [x] Guaranteeing, assuring, auditing (and potentially judging)
- [ ] Refining, accumulating, merklizing
- [ ] Ticketing, rotating, rewarding
> Why: §4 In-core consensus names guaranteeing, assuring, auditing and judging.

### Q Roughly how much more computation does the paper expect in-core than a single machine running the PVM at full speed?
- [ ] 10 times
- [ ] 50 times
- [x] Upwards of 300 times
- [ ] 1023 times
> Why: §4 In-core consensus: upwards of 300 times.

### Q Which step of a block can clear a core even when the extrinsic is empty?
- [ ] Guarantees filling ρ'
- [x] ρ‡ clearing a report that has timed out waiting for availability
- [ ] Disputes clearing ρ†
- [ ] Preimage integration
> Why: The availability timeout is measured in slots, so it fires without any extrinsic.

### Q What does π' depend on?
- [ ] Only the header
- [x] Most of the extrinsic, τ, κ', π, the header and accumulation statistics
- [ ] Only the guarantees
- [ ] Only ψ'
> Why: π' ≺ (E_G, E_P, E_A, E_T, τ, κ', π, H, accumulation statistics).

### Q What is the only place in the whole block where time enters from outside the chain?
- [x] The rule that a block's slot must not be in the future relative to the wall clock
- [ ] Ticket submission
- [ ] Accumulation gas
- [ ] Recent history
> Why: §4 Time: the time assumption is used in only one way: blocks with a future slot are temporarily invalid.

## Level 3

### Q Draw the dependency chain for ρ and explain why it has three intermediate steps.
> Hint: three extrinsics touch ρ.
> Answer: ρ† applies disputes, clearing cores whose report was judged bad or wonky. ρ‡ applies assurances, clearing reports that became available or timed out. ρ' applies new guarantees. Three extrinsics act on the same per-core slot in a fixed order, so each result must be named for the next to use.

### Q Why can preimages be integrated after accumulation?
> Hint: δ‡.
> Answer: δ' ≺ (E_P, δ‡, τ'), where δ‡ is the accounts after accumulation and transfers. The paper notes the availability extrinsic can be fully processed and accumulation can happen before preimages are folded in, which lets an implementation pipeline the work.

### Q Explain in-core versus on-chain execution in three sentences.
> Hint: who runs it, and is it stateful?
> Answer: In-core, only a core's guarantors run refinement, which is stateless and can take large inputs. On-chain, every node runs accumulation, which is stateful and small. Guaranteeing, assuring, auditing and judging give in-core results comparable security.

### Q What are the three goals the paper sets for fork handling, and which mechanism delivers each?
> Hint: minimise, resolve, finalize.
> Answer: Forks should rarely form, should resolve quickly, and a block not much older than the head should become finalized. Safrole delivers the first, Grandpa the third, and both the second.

### Q Walk through what changes on the first block of a new epoch.
> Hint: validator sets, entropy, markers.
> Answer: λ' takes κ, κ' takes the pending set γ_P, and γ_P' takes the staging set with offenders nulled. Entropy rotates: η₁' ← η₀, η₂' ← η₁, η₃' ← η₂. The sealer sequence is fixed from the ticket accumulator or falls back. The header must carry the epoch marker with the prior η₀, η₁ and the new pending keys.

### Q What does the Overview say about time, and how many ways does JAM use it?
> Hint: only one.
> Answer: JAM assumes an agreed clock measured from 12:00 UTC on 1 January 2025. It is used in only one way: a block whose slot is in the future is temporarily invalid until wall time catches up.

### Q What replaces Ethereum's transactor in JAM?
> Hint: coretime.
> Answer: Coretime is prepurchased and assigned to an authorization agent. The authorizer logic decides which work-packages may use it, so external input reaches a service without anyone signing a transaction from an account.

### Q Why did passing every STF vector not mean lasair could import blocks?
> Hint: the seed campaign.
> Answer: STF vectors test one arrow of the graph at a time. Full block import exercises the joins, and replaying fuzz seeds produced 210 failures in validation, rotation and ordering, fixed down to 38 and then closed, with dependency-layered accumulation the largest remaining class.

### Q What does the PVM invocation return, in words?
> Hint: exit reason first.
> Answer: An exit reason (halt, panic, out of gas, page fault with an address, or host call with an index), plus the resulting counter and registers, gas remaining, a Boolean for the basic-block gas flag, and the RAM.

### Q Name the five extrinsic kinds and the chapter that consumes each.
> Hint: T, D, P, A, G.
> Answer: Tickets go to Safrole (ch. 6), disputes to judgments (ch. 10), preimages to service accounts and preimage integration (ch. 9 and 12), assurances and guarantees to reporting and assurance (ch. 11).
