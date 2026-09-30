---
chapter: ch12-accumulation
---

## Level 1

### Q What does accumulation do, in one line?
@ What this is for
- [ ] Chooses the next validator to seal a block
- [x] Runs the Accumulate code of each service that has newly available work, and folds the results into on-chain state
- [ ] Runs each service's refine code on the guarantors
- [ ] Checks guarantor signatures on work-reports
> Why: Accumulation is the on-chain, stateful half of JAM's execution model.

### Q Is accumulation executed in-core or on-chain?
@ What this is for
- [ ] By the block author only
- [ ] Off-chain, by auditors
- [x] On-chain, by every node
- [ ] In-core, by the three guarantors
> Why: Refinement is in-core; accumulation runs on-chain as part of the block state transition.

### Q Which PVM entry point does accumulation invoke?
@ The transition in plain English
- [x] Ψ_A (Accumulate)
- [ ] Ψ_I (Is-Authorized)
- [ ] Ψ_R (Refine)
- [ ] Ψ_M (Marshalling)
> Why: Δ₁ invokes Ψ_A for each service with its operands and gas.

### Q Which Greek letter is the ready queue?
@ State touched
- [ ] ξ
- [ ] θ
- [ ] ρ
- [x] ω
> Why: ω holds available reports waiting on unmet dependencies (eq. readyspec; the preamble defines the ready queue as ω in both 0.7.2 and 0.8.0). ξ is accumulated history, θ accumulation outputs.

### Q Which Greek letter is the accumulated history?
@ State touched
- [x] ξ
- [ ] ω
- [ ] χ
- [ ] β
> Why: ξ records, per slot, the package hashes accumulated.

### Q How many entries do ξ and ω each have?
@ State touched
- [ ] 8, like recent history
- [ ] Unbounded
- [x] E, one per slot of an epoch (600 at full, 12 at tiny)
- [ ] 341, one per core
> Why: Both are sequences of length C_epochlen: one epoch is the dependency horizon.

### Q What does ω store for each waiting report?
@ State touched
- [ ] The report and its guarantors
- [ ] Only the package hash
- [ ] The report and its gas used
- [x] The report and the set of package hashes it still depends on
> Why: eq. readyspec: a sequence of (report, dependency hashes) per slot.

### Q What is θ (theta) after accumulation?
@ State touched
- [ ] The set of timed-out reports
- [ ] The staging validator set
- [ ] The total gas used
- [x] The accumulation outputs: (service, yield hash) pairs from this block
> Why: θ' feeds recent history's Keccak belt (chapter 7).

### Q Which privilege holder sets the next validator keys (ι)?
@ State touched
- [ ] Any service
- [ ] The registrar
- [x] The delegator (validator designator)
- [ ] The manager
> Why: ι' comes from the delegator's post-state.

### Q Which privilege holder writes a core's authorizer queue φ[c]?
@ State touched
- [ ] The manager
- [ ] The core's guarantors
- [x] That core's assigner
- [ ] The block author
> Why: φ'[c] comes from assigner c's post-state.

### Q What is the always-accumulate map?
@ State touched
- [ ] A list of services that can never be removed
- [ ] Services allowed to create other services
- [ ] The set of services with pending preimages
- [x] Services that are accumulated every block with a given amount of free gas, even with no work
> Why: χ_Z, the always-accumulate map, gives service → free gas.

### Q Which reports are accumulated immediately, without entering the ready queue?
@ The transition in plain English
- [ ] Reports with the smallest gas limit
- [ ] Reports older than one epoch
- [x] Reports with no prerequisites and an empty segment-root lookup
- [ ] All reports from the first core
> Why: Those form **R**!; the rest go into **R**^Q with their dependencies.

### Q What removes a dependency from a waiting report?
@ The transition in plain English
- [ ] The report timing out
- [x] The depended-on package being accumulated (its hash appearing in ξ or among newly accumulated reports)
- [ ] The manager's approval
- [ ] A new guarantee for the same core
> Why: Dependencies already in ξ∪ are dropped, and editing removes those just accumulated.

### Q What is the block's total accumulation gas G_T at full spec?
@ The transition in plain English
- [ ] 10 million
- [ ] 50 million
- [x] 3.5 billion
- [ ] 5 billion
> Why: C_blockaccgas = 3,500,000,000. 10 M is G_A per report, 5 G is G_R for refine.

### Q What is G_A?
@ The transition in plain English
- [ ] The block total for accumulation
- [x] The accumulation gas allocated per work-report (10 million)
- [ ] The is-authorized gas
- [ ] The refine gas per package
> Why: C_reportaccgas = 10,000,000.

### Q What is the block accumulation budget, exactly?
@ The transition in plain English
- [ ] G_R × C
- [ ] G_A × C only
- [x] The larger of G_T and G_A × C plus the always-accumulate free gas
- [ ] G_T only
> Why: g = max(G_T, G_A·C + Σz) (eq. finalstateaccumulation).

### Q In which order does accumulation run reports?
@ The transition in plain English
- [ ] Largest gas first
- [x] In the order of **R*** (immediate reports first, then released queued ones), taking the largest prefix that fits in the gas budget
- [ ] Random order
- [ ] By service index
> Why: Δ+ takes the largest prefix of reports whose limits fit, then recurses on the rest.

### Q Within one round, how is work grouped for execution?
@ The transition in plain English
- [ ] By guarantor
- [ ] One invocation per digest
- [ ] By core
- [x] By service: each service's digests and incoming transfers go into one Accumulate invocation
> Why: Δ* runs Δ₁ once per affected service.

### Q What gas does one service's accumulate invocation receive?
@ The transition in plain English
- [ ] Whatever the block has left
- [ ] A fixed 10 million
- [x] Its free gas, plus gas of transfers to it, plus the gas limits of its digests
- [ ] Its balance divided by the gas price
> Why: Δ₁ sums the three sources.

### Q What happens to transfers emitted by a service during accumulation?
@ Edge cases
- [x] They are delivered to the destination in the next Δ+ round, arriving as its first operands
- [ ] They wait until the next block
- [ ] They are applied immediately in the same invocation
- [ ] They are discarded
> Why: Deferred transfers feed the recursion; their gas adds to the destination's budget.

### Q What is recorded in ξ' after accumulation?
@ The transition in plain English
- [ ] Only the failed reports
- [x] ξ shifts by one and the hashes of the reports accumulated this block go in its last slot
- [ ] The report bodies
- [ ] Nothing, ξ is fixed
> Why: eq. finalstateaccumulation.

### Q Which accumulation statistics are recorded per service in 0.8.0?
@ 0.7.2 → 0.8.0
- [ ] Only gas used
- [ ] Balance and storage size
- [x] Items accumulated, transfers received, gas used
- [ ] Gas used and count
> Why: 0.8.0 added the transfer count (GP #502).

### Q What field does accumulation stamp on every service that had activity?
@ The transition in plain English
- [ ] Balance
- [ ] Code hash
- [ ] Creation slot
- [x] Last-accumulated slot, set to τ'
> Why: δ‡ sets lastacc = τ' for services in the statistics.

### Q When are the block's preimages (E_P) integrated?
@ The transition in plain English
- [ ] During refine
- [x] After accumulation, as the last step
- [ ] Before accumulation
- [ ] Only at epoch boundaries
> Why: δ' comes from E_P applied to δ‡, the post-accumulation state.

### Q A preimage in E_P must have been solicited in which state?
@ The transition in plain English
- [ ] The staging set ι
- [ ] The posterior accounts δ'
- [ ] Any future state
- [x] The prior accounts δ, and still not provided
> Why: Validity is checked against prior δ; integration then happens only if the request is still open after accumulation.

### Q How do privilege changes get merged when both the manager and the owner change one?
@ Validation rules and what they guard
- [x] The manager's change wins if the manager changed it; otherwise the owner's change stands
- [ ] The block is invalid
- [ ] Both changes are discarded
- [ ] The owner always wins
> Why: R(old, manager's value, owner's value).

### Q What happens if two services create a new service with the same index in one block?
@ Validation rules and what they guard
- [ ] The second is renumbered
- [x] The block is invalid
- [ ] The lower index wins
- [ ] Both are merged
> Why: Conflicting new, altered or removed indices invalidate the block.

### Q Where do accumulation outputs (θ') end up?
@ State touched
- [ ] Nowhere, they are discarded
- [ ] In the service's storage
- [x] In recent history's Keccak accumulation belt
- [ ] In the disputes state
> Why: β' appends the Merklized θ' to the belt (chapter 7).

### Q Which host call can supply a preimage during accumulation?
@ The transition in plain English
- [x] provide
- [ ] solicit
- [ ] lookup
- [ ] forget
> Why: provide supplies preimages, integrated into services whose request is open.

### Q Where do the newly available reports that accumulation consumes come from?
@ Inputs
- [ ] The disputes extrinsic
- [x] **R**, the reports that became available in chapter 11's assurance processing
- [ ] The ready queue only
- [ ] The guarantees extrinsic directly
> Why: **R** is chapter 11's output; accumulation splits it into **R**! and **R**^Q.

### Q Which privileged role may create services with indices below 2¹⁶?
@ State touched
- [x] The registrar
- [ ] Any assigner
- [ ] The manager
- [ ] The delegator
> Why: C_minpublicindex = 2¹⁶; indices below it may only be created by the Registrar (definitions.tex).

### Q How long can a report wait in the ready queue at most?
@ Edge cases
- [ ] 5 slots
- [ ] 8 blocks
- [x] About one epoch
- [ ] Forever
> Why: ω has E entries; its reports "were made available at most one epoch ago".

## Level 2

### Q Report A depends on package P. P is accumulated in this same block. What happens to A?
- [ ] A times out
- [x] A can be released from the queue and accumulated after P in this block
- [ ] A is invalid
- [ ] A must wait until the next block
> Why: Q releases layer by layer: once P's hash is accumulated, A's dependency set becomes empty.

### Q Reports A and B each depend on the other. What happens?
- [ ] The later one is dropped immediately
- [ ] The block is invalid
- [ ] Both are accumulated in core order
- [x] Both wait in the ready queue ω and are never released
> Why: The GP accepts such loops at reporting; neither dependency set ever empties, so accumulation never happens and "the reports are simply ignored".

### Q At full spec, G_A × C is 3.41 billion. Which is the block budget if there is no always-accumulate gas?
- [ ] 10 million
- [ ] 6.91 billion
- [x] 3.5 billion
- [ ] 3.41 billion
> Why: max(3.5 × 10⁹, 3.41 × 10⁹ + 0) = 3.5 × 10⁹.

### Q The always-accumulate services have free gas totalling 200 million. What is the full-spec block budget?
- [x] 3.61 billion
- [ ] 3.7 billion
- [ ] 3.5 billion
- [ ] 200 million
> Why: max(3.5 × 10⁹, 3.41 × 10⁹ + 2 × 10⁸) = 3.61 × 10⁹.

### Q The next report in line has gas limits exceeding the remaining budget. What does Δ+ do?
- [x] Stops the prefix before it; it stays for a later block
- [ ] Runs it anyway and charges the next block
- [ ] Skips it and runs the rest
- [ ] Invalidates the block
> Why: Δ+ takes the largest prefix that fits; the rest are not accumulated this round. Since g ≥ G_A·C + free gas, the immediate reports always fit, so what is left over is queued work, which stays in ω.

### Q Why is Δ+ recursive rather than a single pass?
- [ ] Because the PVM cannot run twice
- [ ] To support multiple cores
- [ ] To sort reports by gas
- [x] Real gas used is only known after execution, and transfers emitted in one round must be delivered in the next
> Why: Leftover gas plus transfer gas flows into the next round.

### Q A service accumulates two digests and receives one transfer. How many Ψ_A invocations does it get in that round?
- [ ] Three
- [ ] Two
- [ ] Zero until the transfer settles
- [x] One, with the transfer first and then both digests as operands
> Why: Δ₁ runs once per service per round.

### Q The previous block was at slot 100; slots 101 to 103 are skipped and the new block is at slot 104. What happens to the ready-queue (ω) entries for the skipped slots?
- [ ] They are kept unchanged
- [ ] They are accumulated
- [ ] They are moved to slot 104
- [x] They are emptied
> Why: ω' sets ω'[m − i] = [] for 1 ≤ i < τ' − τ, emptying the slots skipped since τ.

### Q A block has an empty extrinsic. Can any accumulation happen?
- [x] Yes: queued reports whose dependencies landed earlier can be released
- [ ] Only always-accumulate services are skipped
- [ ] No, E_A is required
- [ ] No, accumulation needs new guarantees
> Why: ω may release work deferred by gas earlier, always-accumulate services run, and ξ still shifts.

### Q A preimage was solicited, but a service provided it with the provide host call during accumulation. The same preimage is also in E_P. What happens to the E_P copy?
- [x] It is disregarded, because the request is no longer open
- [ ] The block is invalid
- [ ] It is stored twice
- [ ] It overwrites the provided one
> Why: Integration only applies to requests still open after accumulation.

### Q The manager changes the delegator privilege and the current delegator also changes it. Which value wins?
- [ ] The block is invalid
- [ ] The delegator's
- [x] The manager's
- [ ] Neither; the old value stays
> Why: R(o, a, b): the manager's value when the manager moved it.

### Q The manager does not touch the delegator privilege, but the delegator hands it to another service. What happens?
- [ ] The manager's old value is restored
- [ ] The block is invalid
- [ ] It needs the registrar's approval
- [x] The delegator's change stands
> Why: R falls back to the owner's change when the manager did not move it.

### Q A service had no digests, no transfers and no free gas this block. What is recorded for it in the accumulation statistics?
- [ ] Its balance
- [x] Nothing: statistics include only services with non-zero activity
- [ ] A zero entry
- [ ] Its last-accumulated slot
> Why: eq. accumulationstatisticsdef keeps only services with S(s) ≠ (0, 0, 0).

### Q Why are preimages integrated after accumulation rather than before?
- [ ] Because preimages are larger than reports
- [ ] Because the GP forgot to order them
- [ ] Because refine needs them first
- [x] So they are applied to the post-accumulation accounts, and a request already satisfied or removed during accumulation is skipped
> Why: The dependency graph lets assurances and accumulation proceed before E_P is folded in.

### Q At tiny spec, what is the block total accumulation gas G_T?
- [ ] 10 million
- [ ] 1 billion
- [x] 20 million
- [ ] 3.5 billion
> Why: lib/spec.ml tiny block_acc_gas = 20,000,000 (the tiny chain spec, not the GP's full constant).

### Q What changed about Δ+ in 0.8.0?
- [ ] It became parallel
- [ ] It was removed
- [ ] It runs only once per block
- [x] It returns the processed transfers, and its prefix test counts transfer gas and free gas as well as digest limits
> Why: The 0.8.0 recursion also uses g plus gas of new transfers minus gas used.

## Level 3

### Q Walk through accumulation in five steps.
> Hint: queue, execute, merge, integrate, preimages.
> Answer: First, split newly available reports into those with no dependencies (accumulate now) and those that must wait, and release queued reports whose dependencies are now met. Second, run Δ+: take the largest prefix of reports that fits the gas budget, group by service and invoke each service's Accumulate once, then recurse with leftover gas and new transfers. Third, merge each service's changes: accounts, privileges via R, the next validators from the delegator, authorizer queues from assigners. Fourth, integrate: θ' yields, statistics, lastacc stamps, shift ξ and re-index the ready queue ω. Fifth, integrate E_P preimages into the post-accumulation accounts.

### Q Why does JAM need a ready queue at all?
> Hint: prerequisites.
> Answer: A report may depend on packages that are not yet accumulated. It cannot run first without seeing their effects, so it waits in the ready queue ω with its unmet dependency hashes, up to one epoch, and is released when they land in ξ.

### Q How is the block gas budget chosen, and why the max?
> Hint: guarantee each core its allocation.
> Answer: g = max(G_T, G_A × C + Σ free gas). Each report was promised up to G_A, so the block must at least be able to give every core's report that much plus the always-accumulate services' free gas. G_T is the normal ceiling; the max ensures the budget is never below the guaranteed allocation. The Definitions say G_T should be no smaller than G_A·C plus the free gas.

### Q Why are privileges merged with the R function rather than last-writer-wins?
> Hint: parallel services, deterministic outcome.
> Answer: Several services run in the same round and may change the same privilege. R gives a deterministic rule: if the manager changed it, the manager wins; otherwise the owning service's own change stands. That lets a privilege be owned and handed on, while keeping the manager's authority.

### Q What happens to transfers between services in one block?
> Hint: rounds.
> Answer: A transfer emitted during a service's accumulate is not applied inside that invocation. Δ+ delivers it in the next round, where the destination receives it as an operand before its digests, and its gas is added to the destination's budget.

### Q What did 0.8.0 change in accumulation?
> Hint: statistics and Δ+.
> Answer: Per-service statistics became (items, transfers received, gas), adding the transfer count (GP #502). Δ+ now returns processed transfers and counts transfer and free gas in its prefix test. The staging set uses the bounded validator-set type. The bless host call became manager-only in the 0.8.0 text (#519), though the vectors deviate pending #558.

### Q Tell the dependency-layered accumulation war story.
> Hint: a panicking layer.
> Answer: In the seed campaign, lasair failed the no_forks session at step 46 and about 22 seeds because a panic in one accumulation layer reverted more than itself. The Graypaper's layered release means each layer's failure must only revert its own effects. Implementing that fixed the step and the seeds. Recorded in docs/M1_PLAN.md.

### Q Tell the B1 war story.
> Hint: sorting a set.
> Answer: θ, the accumulation output, is a set of (service, hash) pairs. lasair sorted by service id only; when one service yielded twice in a block, the two entries kept insertion order while the reference sorted by the full tuple. The Keccak belt in β commits to θ, so two state keys diverged (seed 1551410130, step 2854). Fix: sort by (service, hash). Lesson: every set that reaches the trie has a total order.

### Q Why are ξ and ω exactly one epoch long?
> Hint: horizon.
> Answer: They bound state. ξ remembers what was accumulated long enough to reject duplicates and resolve dependencies; ω keeps waiting reports for at most one epoch; the GP says its reports "were made available at most one epoch ago". (The design reason is reasoning, not GP text.)

### Q Why is accumulation executed sequentially in prefixes rather than all reports in parallel?
> Hint: you only know gas used after running.
> Answer: Gas limits are known in advance but actual gas used is not. Δ+ picks the largest prefix whose limits fit, runs it, and passes leftover gas to the next prefix. This keeps the block within budget deterministically while allowing unused gas to be reused.
