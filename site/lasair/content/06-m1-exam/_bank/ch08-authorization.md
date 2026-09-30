---
chapter: ch08-authorization
---

## Level 1

### Q What problem does the authorization system solve?
@ What this is for
- [x] Separating the purchase and assignment of coretime from the work done with it
- [ ] Choosing block authors
- [ ] Detecting duplicate reports
- [ ] Encrypting work-packages
> Why: §8: it disentangles intention of usage for coretime from the specification and submission of a particular workload.

### Q Which two existing interaction patterns does JAM want to support with authorization?
@ What this is for
- [ ] Bitcoin-style and Solana-style
- [x] Ethereum-style and Polkadot-style
- [ ] Cosmos-style and Avalanche-style
- [ ] Client-server and peer-to-peer
> Why: §8: flexibility to support both Ethereum-style and Polkadot-style interaction patterns.

### Q In the Ethereum model, who buys the resource used by a transaction?
@ What this is for
- [x] The same agent who authors the transaction
- [ ] A parachain team, for months at a time
- [ ] The block author
- [ ] Nobody; it is free
> Why: §8: gas is procured at introduction on-chain and the purchaser is the author of the transaction.

### Q In Polkadot's model, how is the resource procured?
@ What this is for
- [ ] Per transaction, by the sender
- [x] A parachain slot bought with a large deposit, typically for 24 months
- [ ] By staking DOT per block
- [ ] By validator vote
> Why: §8 describes a parachain slot procured with a substantial deposit for typically 24 months.

### Q What are the three key concepts of the authorization system?
@ What this is for
- [x] Authorizers, tokens and traces
- [ ] Pools, queues and cores
- [ ] Tickets, seals and markers
- [ ] Guarantees, assurances and audits
> Why: §8.1 names Authorizers, Tokens and Traces.

### Q What is a token?
@ What this is for
- [ ] A unit of currency
- [x] Opaque data included with a work-package to argue it should be authorized
- [ ] A Safrole ticket
- [ ] A validator key
> Why: §8.1: a Token is opaque data to help make an argument that the work-package should be authorized.

### Q What is a trace?
@ What this is for
- [ ] A log of PVM instructions
- [x] Opaque data characterizing a successful authorization
- [ ] The history of a service's balance
- [ ] A header field
> Why: §8.1: a Trace helps characterize or describe some successful authorization.

### Q What is an authorizer?
@ What this is for
- [x] PVM logic, run within fixed limits, that decides whether a package is authorized on a core
- [ ] A validator with signing rights
- [ ] A privileged service id
- [ ] A header signature
> Why: §8.1: a piece of logic that determines whether a work-package, with its token, is authorized for execution on a particular core.

### Q How is an authorizer identified in 0.8.0?
@ State touched
- [ ] By its service id
- [ ] By the hash of its code alone
- [x] By the hash of its PVM code hash concatenated with its configuration blob
- [ ] By its index in the pool
> Why: §8.1 in 0.8.0 says code hash; 0.7.2 said code.

### Q Where does the authorization check itself (is-authorized) run?
@ What this is for
- [ ] On-chain, by every validator
- [x] In-core, as part of processing the work-package
- [ ] In the header seal
- [ ] During accumulation
> Why: §8.1: the determination happens entirely in-core; on-chain logic only tracks which authorizers each core allows.

### Q What is α[c]?
@ State touched
- [x] The authorizer pool of core c: the authorizers allowable on that core now
- [ ] The authorizer queue of core c
- [ ] The core's pending report
- [ ] The core's statistics
> Why: eq. authstatecomposition: α is the authorizer pool per core.

### Q What is φ[c]?
@ State touched
- [ ] The authorizer pool of core c
- [x] The authorizer queue of core c, from which the pool is filled
- [ ] The privileges of core c
- [ ] The accumulated set of core c
> Why: φ is the per-core authorizer queue.

### Q What is the maximum size of each core's pool?
@ State touched
- [ ] 4
- [x] 8
- [ ] 80
- [ ] 600
> Why: α ∈ ⟦⟦ℍ⟧_{:O}⟧_C with O = 8.

### Q How many entries does each core's queue have?
@ State touched
- [ ] At most 8
- [ ] Exactly 8
- [x] Exactly 80
- [ ] Exactly E
> Why: φ ∈ ⟦⟦ℍ⟧_Q⟧_C with Q = 80.

### Q Do the pool and queue sizes differ between tiny and full?
@ State touched
- [x] No, both are 8 and 80; only the number of cores differs
- [ ] Yes, tiny uses 2 and 20
- [ ] Yes, tiny uses 8 and 12
- [ ] Only the queue differs
> Why: O and Q are the same; C is 2 at tiny and 341 at full.

### Q Who may alter φ?
@ Validation rules and what they guard
- [ ] Any service during refine
- [ ] The block author
- [x] An appropriately privileged service, from its accumulate logic
- [ ] Nobody after genesis
> Why: §8.2 note: φ may be altered only through an exogenous call from the accumulate logic of an appropriately privileged service.

### Q Which host call writes a core's authorizer queue?
@ Validation rules and what they guard
- [ ] bless
- [x] assign
- [ ] designate
- [ ] solicit
> Why: assign replaces a core's 80-entry queue; χ names the assigner per core.

### Q Which queue entry is appended to a core's pool each block?
@ The transition in plain English
- [ ] The first entry
- [x] The entry at index H_T mod 80, from the posterior queue φ'
- [ ] A random entry
- [ ] The entry used by the last guarantee
> Why: α'[c] appends φ'[c][H_T] with cyclic subscription.

### Q What is removed from a core's pool when the block guarantees a report on that core?
@ The transition in plain English
- [ ] Every copy of the report's authorizer
- [x] The leftmost occurrence of the authorizer the report used
- [ ] The oldest entry
- [ ] Nothing
> Why: F(c) = α[c] ∖ₗ {authorizer of the report}; sequence minus removes the leftmost only.

### Q After append, how many pool entries are kept?
@ The transition in plain English
- [ ] All of them
- [ ] The first 8
- [x] The last 8
- [ ] The last 80
> Why: The ← operator keeps the final O = 8 entries.

### Q Must the pool update run before or after accumulation?
@ The transition in plain English
- [ ] Before
- [x] After, because it reads φ' which accumulation defines
- [ ] It does not matter
- [ ] In parallel with guarantees only
> Why: §8.2: α' depends on φ', so it must be computed after accumulation.

### Q What does the on-chain check require of a guaranteed report's authorizer?
@ Validation rules and what they guard
- [x] It is in the pool α of the report's core
- [ ] It is in the queue φ
- [ ] It is a privileged service
- [ ] It has a positive balance
> Why: Chapter 11 checks the report's authorizer against the core's pool.

### Q How many cores' pools exist at full?
@ State touched
- [ ] 8
- [ ] 80
- [x] 341
- [ ] 1023
> Why: α has one pool per core, C = 341 (2 at tiny).

### Q What type of values are stored in the pool and queue?
@ State touched
- [x] Hashes identifying authorizers
- [ ] Service ids
- [ ] Validator keys
- [ ] Work-package bodies
> Why: Both are sequences of ℍ.

### Q Which state component names the service allowed to assign a core's queue?
@ Validation rules and what they guard
- [ ] α
- [ ] δ
- [x] χ, the privileges
- [ ] ψ
> Why: χ holds the per-core assigners.

### Q Which extrinsic tells the pool transition which authorizer was used?
@ Inputs
- [ ] E_A
- [x] E_G, the guarantees
- [ ] E_T
- [ ] E_P
> Why: The report in each guarantee names its authorizer and core.

### Q Which header field indexes the queue?
@ Inputs
- [ ] H_I
- [x] H_T, the timeslot
- [ ] H_P
- [ ] H_E
> Why: The appended entry is φ'[c][H_T] with cyclic subscription.

### Q How is the queue read with the timeslot?
@ The transition in plain English
- [ ] Directly, index = slot
- [x] Cyclically, index = slot mod 80
- [ ] By epoch
- [ ] By core index
> Why: The ↺ subscription wraps around the queue length Q = 80.

### Q Can the pool contain the same authorizer twice?
@ Edge cases
- [x] Yes
- [ ] No, it is a set
- [ ] Only in tiny
- [ ] Only if the manager allows it
> Why: The pool is a sequence; duplicates can arrive from the queue.

### Q How many reports can a block guarantee per core?
@ Edge cases
- [ ] Any number
- [x] One, so at most one pool entry is removed per core per block
- [ ] Two
- [ ] Three, one per guarantor
> Why: Chapter 11 allows one report per core per block.

## Level 2

### Q A block has no guarantees at all. What happens to each core's pool?
- [ ] Nothing
- [x] One queue entry is appended and the oldest falls off once the pool holds 8
- [ ] It is cleared
- [ ] It is refilled from the whole queue
> Why: No removal happens, but the append and trim run every block.

### Q A core's pool is [A, B, A]. The block guarantees a report using A on that core. Before the append, what is F(c)?
- [ ] [B]
- [x] [B, A]
- [ ] [A, B]
- [ ] [A, B, A]
> Why: ∖ₗ removes only the leftmost A.

### Q The pool holds 8 entries and the block uses none. Where does the newest queue entry go?
- [ ] It is dropped because the pool is full
- [x] It is appended and the oldest entry is dropped by the trim
- [ ] It replaces a random entry
- [ ] It waits for a free slot
> Why: Append first, then keep the last 8; the pool never blocks.

### Q A service calls assign for a core in this block's accumulation. When does the new queue affect the pool?
- [x] In this same block, because α' reads φ'
- [ ] Next block
- [ ] Next epoch
- [ ] After 80 blocks
> Why: α' ≺ (H, E_G, φ', α) and runs after accumulation.

### Q At slot 165, which queue index is appended?
- [ ] 165
- [ ] 65
- [x] 5
- [ ] 16
> Why: 165 mod 80 = 5.

### Q A report cites an authorizer not in its core's pool. What happens?
- [ ] It is accepted and the authorizer is added
- [x] The guarantee is invalid and α is unaffected by it
- [ ] It is queued for next block
- [ ] It is accepted if the token is valid
> Why: The pool membership check is on-chain; is-authorized alone is not enough.

### Q Why does a full pool never starve new authorizers?
- [ ] Because it has 80 entries
- [x] Because every block appends one queue entry and trims the oldest
- [ ] Because the manager resets it
- [ ] Because guarantees add entries
> Why: The pool rotates continuously even when idle.

### Q What changed about authorization in 0.8.0?
- [ ] The pool grew to 16
- [x] The authorizer hash is over the code hash plus configuration, not the code
- [ ] The queue is indexed by epoch
- [ ] The pool update moved before accumulation
> Why: The only textual change is "code" to "code hash"; the transition is unchanged.

### Q Which is the difference between ch. 8 authorization and ch. 11 guarantor assignment?
- [x] Authorization decides which work may use a core; assignment decides which validators may guarantee for it
- [ ] They are the same mechanism
- [ ] Assignment decides which authorizers are pooled
- [ ] Authorization rotates validators
> Why: The sheet's war story makes this distinction.

### Q A queue slot holds the zero hash. What happens when it rotates into the pool?
- [ ] The block is invalid
- [x] It enters the pool as an authorizer no code will match
- [ ] It is skipped
- [ ] The core is disabled
> Why: The transition does not special-case it; it is an ordinary hash.

### Q A core's pool is [X, Y]. The block guarantees a report on another core using X. What happens to this core's pool?
- [ ] X is removed
- [x] Nothing is removed; only the queue entry is appended
- [ ] Both are removed
- [ ] The block is invalid
> Why: Removal applies only to the core the report is for.

### Q A core has 5 pool entries and no guarantee. After the block, how many entries?
- [ ] 5
- [x] 6
- [ ] 8
- [ ] 4
> Why: One is appended; the trim to 8 has no effect below 8.

### Q Which service can call assign for core 3?
- [ ] Any service
- [x] The service χ names as core 3's assigner
- [ ] The manager only
- [ ] The block author
> Why: assign requires the caller to be that core's assigner, otherwise it returns HUH.

### Q If the queue is filled with one authorizer A in all 80 slots, what does the pool become over time?
- [x] Eventually 8 copies of A
- [ ] Just one A
- [ ] Empty
- [ ] Unchanged forever
> Why: Each block appends A and trims the oldest.

### Q Where would a Polkadot-style long-term coretime owner put their authorizer?
- [ ] In the header
- [x] In the core's queue, via the assigner service
- [ ] In the ready queue
- [ ] In recent history
> Why: The queue is the programmable schedule that feeds the pool.

## Level 3

### Q Explain the pool and queue transition in your own words.
> Hint: remove, append, trim.
> Answer: For each core, if the block guarantees a report on it, remove the leftmost copy of that report's authorizer from the pool. Then append the queue entry at the block's slot modulo 80, from the queue as it stands after accumulation, and keep only the newest 8.

### Q Why does JAM separate authorization from the service that runs the work?
> Hint: Ethereum and Polkadot.
> Answer: To support both patterns: Ethereum, where the transaction author buys the resource, and Polkadot, where a team buys a slot long-term for others to use. Coretime is bought ahead and assigned to an authorization agent whose logic decides which packages may use it, so there is no transactor.

### Q Why must the pool update run after accumulation?
> Hint: which queue does it read?
> Answer: It appends from φ', the posterior queue. A privileged service can rewrite a core's queue with assign during accumulation, and that change must be visible in the same block.

### Q Where is authorization checked on-chain versus in-core?
> Hint: policy and permission set.
> Answer: In-core, the guarantors run the authorizer's is-authorized code on the package and token. On-chain, the chain only checks that the authorizer the report names is in the core's pool. Policy stays off-chain and cheap; the permission set stays on-chain and small.

### Q Who controls a core's queue, and through what?
> Hint: χ and a host call.
> Answer: The service χ names as that core's assigner, from its accumulate logic, via the assign host call. It replaces the core's 80-entry queue and names the successor assigner. Ordinary services cannot touch it.

### Q What are tokens and traces, and why are they opaque?
> Hint: meaning belongs to the authorizer.
> Answer: A token is data in the package arguing it should be authorized; a trace describes a successful authorization. They are opaque because only the authorizer's PVM code interprets them, which keeps the protocol agnostic about payment schemes.

### Q What happens to a pool on a block with no guarantees, and why is that design sensible?
> Hint: rotation.
> Answer: Nothing is removed, one queue entry is appended and the pool is trimmed to 8. The pool keeps rotating with the schedule even when idle, so stale authorizers age out.

### Q Why does removal take only the leftmost matching authorizer?
> Hint: duplicates.
> Answer: The pool can hold duplicates, and one guarantee uses one authorization. Removing a single copy consumes exactly one use while leaving others available.

### Q How does an authorizer's identity differ between 0.7.2 and 0.8.0?
> Hint: code versus code hash.
> Answer: In 0.8.0 it is the hash of the authorizer's code hash concatenated with its configuration blob; the 0.7.2 text said the code itself. The pool and queue transition did not change.

### Q What is the difference between authorization and guarantor assignment?
> Hint: work versus validators.
> Answer: Authorization decides which work-packages may use a core, through the pool. Guarantor assignment, in chapter 11, decides which validators may guarantee reports for a core. Different chapters, different state.
