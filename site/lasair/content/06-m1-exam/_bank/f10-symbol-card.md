---
chapter: f10-symbol-card
---

## Level 1

### Q What is σ?
@ The whole state
- [x] The whole chain state
- [ ] The service accounts only
- [ ] The current timeslot
- [ ] The block header
> Why: σ is the complete state, a tuple of 17 components (ch. 4).

### Q What is Υ?
@ The whole state
- [ ] The PVM
- [x] The block transition function: σ′ = Υ(σ, B)
- [ ] The ticket lottery
- [ ] The upper bound on gas
> Why: Υ turns the prior state and a block into the posterior state.

### Q What is κ?
@ Validators and consensus
- [ ] The previous epoch's validators
- [ ] Validator keys queued for the future
- [x] The active validator set for this epoch
- [ ] The ticket accumulator
> Why: κ holds the keys of the validators active now (ch. 6).

### Q What is λ?
@ Validators and consensus
- [ ] The active validator set
- [ ] The staging validator keys
- [ ] The entropy pool
- [x] The previous epoch's validator set
> Why: λ is kept to verify signatures made by last epoch's set.

### Q What is ι?
@ Validators and consensus
- [x] Validator keys staged for the future, set by a privileged service
- [ ] The active validator set
- [ ] The offenders' keys
- [ ] The authorizer queue
> Why: ι is the staging set; the delegator service χ_V designates it.

### Q What is γ?
@ Validators and consensus
- [ ] The disputes record
- [x] The Safrole state
- [ ] The service accounts
- [ ] The statistics
> Why: γ holds γ_P, γ_Z, γ_S and γ_A (ch. 6).

### Q What is γ_P?
@ Validators and consensus
- [ ] The ticket accumulator
- [ ] The slot-sealer sequence
- [x] The validator keys pending for the next epoch
- [ ] The ring root
> Why: γ_P is Safrole's pending set, which becomes κ at the next epoch.

### Q What is γ_S?
@ Validators and consensus
- [ ] The pending validator keys
- [ ] The epoch's ring root
- [ ] The list of offenders
- [x] The sequence saying who may seal each slot of the epoch
> Why: γ_S is the slot-sealer sequence: tickets, or fallback keys.

### Q What is γ_A?
@ Validators and consensus
- [x] The ticket accumulator: the best tickets submitted so far
- [ ] The active validator set
- [ ] The accumulation outputs
- [ ] The authorizer pool
> Why: γ_A collects tickets during the epoch's submission period.

### Q What is η?
@ Validators and consensus
- [ ] The epoch length
- [x] The entropy pool: on-chain randomness
- [ ] The extrinsic
- [ ] The recent history
> Why: η₀ accumulates each block's VRF output; η₁ to η₃ are earlier snapshots.

### Q What is ψ?
@ Validators and consensus
- [ ] The PVM invocation
- [ ] The privileged services
- [x] The disputes record: good, bad and wonky reports and offenders
- [ ] The pending reports
> Why: ψ = (ψ_G, ψ_B, ψ_W, ψ_O), ch. 10.

### Q What is ψ_O?
@ Validators and consensus
- [ ] Reports judged good
- [ ] Reports judged bad
- [ ] The previous validator set
- [x] The keys of validators found to have misbehaved (offenders)
> Why: ψ_O is the offenders set.

### Q What is ρ?
@ Work and reports
- [x] The pending work-report on each core, waiting to become available
- [ ] The ready queue
- [ ] The recently accumulated packages
- [ ] The authorizer pool
> Why: ρ is the availability assignments, one per core (ch. 11).

### Q What is bold R?
@ Work and reports
- [ ] The recent history
- [x] The work-reports that became available in this block
- [ ] The registrar service
- [ ] The prior state root
> Why: Bold R is the newly available work-reports (ch. 11, 12).

### Q What is R*?
@ Work and reports
- [ ] All reports ever accumulated
- [ ] The rejected reports
- [x] The sequence of work-reports this block will accumulate
- [ ] The reports in the guarantees extrinsic
> Why: R* = R! then the queued reports whose dependencies are met (ch. 12).

### Q What is R!?
@ Work and reports
- [ ] Reports that failed to become available
- [ ] Reports judged bad
- [ ] Reports still in ρ
- [x] Newly available reports with no prerequisites and no segment-root lookups
> Why: R! can be accumulated immediately.

### Q What is ω?
@ Work and reports
- [x] The ready queue: available reports waiting on prerequisites
- [ ] The recently accumulated packages
- [ ] The accumulation outputs
- [ ] The statistics
> Why: ω holds reports that are available but not yet accumulatable, per slot.

### Q What is ξ?
@ Work and reports
- [ ] The ready queue
- [x] Work-package hashes accumulated in recent slots
- [ ] The pending reports
- [ ] The ticket accumulator
> Why: ξ lets accumulation know which dependencies are already done and stops repeats.

### Q What is θ?
@ Work and reports
- [ ] The block's timeslot
- [ ] The ticket accumulator
- [x] This block's accumulation outputs: (service, hash) pairs
- [ ] The authorizer queue
> Why: θ is merged into the recent-history belt (ch. 7, 12).

### Q What is δ?
@ Accounts and services
- [ ] The disputes record
- [ ] The entropy pool
- [ ] The block transition
- [x] The service accounts
> Why: δ is the service-account component of the state (ch. 9).

### Q What is χ?
@ Accounts and services
- [x] The privileged services
- [ ] The service accounts
- [ ] The statistics
- [ ] The staging validator set
> Why: χ = manager, assigners, delegator, registrar, always-accumulate list (ch. 9).

### Q What is χ_M?
@ Accounts and services
- [ ] The per-core assigners
- [x] The manager service
- [ ] The delegator
- [ ] The registrar
> Why: χ_M is the manager, which can set the other privileges.

### Q What is α?
@ Accounts and services
- [ ] The authorizer queue, per core
- [ ] The active validator set
- [x] The authorizer pool, per core
- [ ] The accumulation outputs
> Why: α holds up to 8 authorizers per core (ch. 8).

### Q What is φ?
@ Accounts and services
- [ ] The authorizer pool, per core
- [ ] The privileged services
- [ ] The entropy pool
- [x] The authorizer queue, per core
> Why: φ has 80 entries per core and feeds α one per block.

### Q What is τ?
@ Time and bookkeeping
- [x] The timeslot of the most recent block
- [ ] The epoch length
- [ ] The ticket accumulator
- [ ] The total accumulation gas
> Why: τ counts 6-second slots from the JAM Common Era.

### Q What is β?
@ Time and bookkeeping
- [ ] The Safrole state
- [x] The recent history of the last 8 blocks, plus the accumulation-output belt
- [ ] The block's extrinsic
- [ ] The statistics
> Why: β = (β_H, β_B), ch. 7.

### Q What is π?
@ Time and bookkeeping
- [ ] The disputes record
- [ ] The PVM
- [x] The activity statistics
- [ ] The privileged services
> Why: π holds validator, core and service statistics (ch. 13).

### Q What does a prime, as in κ′, mean?
@ Marks on symbols
- [ ] The value one epoch ago
- [ ] The value in the tiny configuration
- [ ] An error value
- [x] The value after this block
> Why: Posterior values carry a prime.

### Q What does a dagger, as in ρ†, mean?
@ Marks on symbols
- [x] A named value partway through the block, used by later steps
- [ ] The final value after the block
- [ ] A value that is invalid
- [ ] A value from the genesis state
> Why: Daggers mark intermediate values (ch. 4 dependency graph).

### Q What is H_T?
@ Letters and constants
- [ ] The header's parent hash
- [x] The header's timeslot
- [ ] The ticket accumulator
- [ ] The total accumulation gas
> Why: Header fields are written with capital subscripts; T is the timeslot.

### Q What is H_R?
@ Letters and constants
- [ ] The header's seal
- [ ] The registrar
- [x] The header's prior state root
- [ ] The recent history
> Why: H_R commits to the parent's resulting state (ch. 5).

### Q What is E_G?
@ Letters and constants
- [ ] The epoch length
- [ ] The total accumulation gas
- [ ] The entropy pool
- [x] The guarantees part of the extrinsic
> Why: E = (E_T, E_D, E_P, E_A, E_G).

### Q What is C?
@ Letters and constants
- [x] The number of cores: 341
- [ ] The number of validators: 1023
- [ ] The epoch length: 600
- [ ] The slot length: 6
> Why: C = 341 in the Definitions.

### Q What is the epoch length E?
@ Letters and constants
- [ ] 12 slots
- [x] 600 slots
- [ ] 32 slots
- [ ] 6 seconds
> Why: E = 600; the tiny test configuration uses 12.

### Q What is G_T?
@ Letters and constants
- [ ] The accumulate gas per report: 10 million
- [ ] The refine gas per work-package: 5 billion
- [x] The total accumulate gas for a whole block: 3.5 billion
- [ ] The gas for one host call
> Why: G_T = 3 500 000 000 in the Definitions.

### Q What is Ψ_R?
@ PVM invocations
- [ ] The accumulate invocation
- [ ] The is-authorized invocation
- [ ] One PVM step
- [x] The refine invocation: the heavy, stateless work in-core
> Why: Ψ_R runs a work-item's refine code (App. B).

### Q What is Ψ_A?
@ PVM invocations
- [x] The accumulate invocation: the stateful update on-chain
- [ ] The refine invocation
- [ ] The is-authorized invocation
- [ ] The host-call wrapper
> Why: Ψ_A runs a service's accumulate code (App. B).

### Q What is Ψ_I?
@ PVM invocations
- [ ] The refine invocation
- [x] The is-authorized invocation: the authorizer check
- [ ] The accumulate invocation
- [ ] The single-step function
> Why: Ψ_I runs the authorizer's code in-core (App. B).

## Level 2

### Q Which symbol holds a report that has been guaranteed but is not yet available?
- [ ] ω
- [x] ρ
- [ ] ξ
- [ ] R*
> Why: ρ holds each core's pending report until assurances make it available or it times out.

### Q Which symbol holds a report that is available but still waiting for its prerequisite?
- [ ] ρ
- [ ] ξ
- [x] ω
- [ ] θ
> Why: The ready queue ω keeps available reports whose dependencies are not yet accumulated.

### Q Which symbol would you check to see whether a work-package was accumulated recently?
- [ ] ω
- [ ] β
- [ ] ρ
- [x] ξ
> Why: ξ keeps the hashes of recently accumulated work-packages.

### Q At an epoch boundary, which set becomes the new λ?
- [x] The old κ
- [ ] The old ι
- [ ] The old γ_P
- [ ] The old ψ_O
> Why: λ′ = κ: the outgoing active set becomes the previous set.

### Q At an epoch boundary, which set becomes the new κ?
- [ ] ι, the staging set
- [x] γ_P, the pending set
- [ ] λ, the previous set
- [ ] ψ_O, the offenders
> Why: κ′ = γ_P; the staging set ι moves into γ_P′ at the same time.

### Q A privileged service wants to change which authorizers a core will accept. Which symbol does it write?
- [ ] α, the authorizer pool
- [ ] χ, the privileges
- [x] φ, the authorizer queue
- [ ] δ, the accounts
> Why: Assigners write φ through the assign host call; α is refilled from φ by the chain.

## Level 3

### Q Name the three validator-set symbols and say what each is for.
> Hint: now, before, next.
> Answer: κ is the active set, which authors, guarantees and assures this epoch. λ is the previous epoch's set, still used to verify judgments and guarantees made under it. ι is the staging set, keys queued by the delegator service; at the epoch boundary ι moves into Safrole's pending set γ_P, and γ_P becomes κ.

### Q Follow one work-report through the symbols from guarantee to accumulation.
> Hint: ρ, R, ω, R*, ξ, θ.
> Answer: When guaranteed it sits in ρ on its core. When assurances pass two thirds it becomes part of R, the newly available reports. If its prerequisites are met it goes straight into R* and is accumulated; otherwise it waits in the ready queue ω. Once accumulated its package hash enters ξ, and any output hash its service yields appears in θ and is folded into recent history β.
