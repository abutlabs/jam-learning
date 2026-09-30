---
chapter: e-invocations
---

## Level 1

### Q What is a host call?
@ Result constants
- [x] A request from PVM code to its environment (via `ecalli`) for something the VM cannot do itself, such as reading storage
- [ ] A call from one service's code directly into another service's code
- [ ] A network message between validators
- [ ] A call into the operating system of the validator node
> Why: `ecalli` exits the machine with host × index; the invocation's host-call handler performs the operation and resumes the machine.

### Q In which register does a host call put its result?
@ Result constants
- [ ] ω₀
- [x] ω₇
- [ ] ω₁
- [ ] ω₁₂
> Why: Results go in register 7; arguments come from registers 7 to 12.

### Q What does the result constant OK equal?
@ Result constants
- [ ] 1
- [ ] 2⁶⁴ − 9
- [x] 0
- [ ] 2⁶⁴ − 1
> Why: OK = 0 is general success (App. B, host-call result constants).

### Q Which result constant means "the item does not exist"?
@ Result constants
- [ ] WHO
- [ ] HUH
- [ ] WHAT
- [x] NONE
> Why: NONE = 2⁶⁴ − 1. WHO is for an unknown index such as a service or machine.

### Q What does the result WHAT mean?
@ Result constants
- [x] Host-call name (index) unknown
- [ ] Memory out of bounds
- [ ] Insufficient funds
- [ ] Operation not allowed
> Why: WHAT = 2⁶⁴ − 2, returned for an unknown host-call index.

### Q Which result constant means "insufficient funds"?
@ Result constants
- [ ] LOW
- [x] CASH
- [ ] HUH
- [ ] FULL
> Why: CASH = 2⁶⁴ − 7. LOW is "gas limit too low".

### Q Which result constant is returned when a service lacks the privilege for an operation?
@ Result constants
- [ ] CORE
- [ ] OOB
- [x] HUH
- [ ] WHO
> Why: HUH = 2⁶⁴ − 9: the operation is invalid, including insufficient privilege.

### Q How much gas does an unknown host call cost in 0.8.0?
@ Result constants
- [ ] 48
- [ ] 10
- [ ] 0
- [x] 1000
> Why: An unknown call costs 1000 and returns WHAT (0.7.2: 10).

### Q What are the three PVM invocations in the protocol?
@ The three invocations
- [x] Is-authorized, refine, accumulate
- [ ] Refine, audit, finalize
- [ ] Guarantee, assure, accumulate
- [ ] Authorize, execute, transfer
> Why: Appendix B defines Ψ_I, Ψ_R and Ψ_A.

### Q Where does accumulation run?
@ The three invocations
- [ ] Off-chain, by the service owner
- [x] On-chain, by every validator importing the block
- [ ] In-core, by the guarantors only
- [ ] Only on the block author
> Why: Refine and is-authorized run in-core; accumulate runs on-chain for everyone.

### Q Which invocation checks that a work-package may use a core?
@ The three invocations
- [ ] On-transfer
- [ ] Refine
- [x] Is-authorized
- [ ] Accumulate
> Why: Ψ_I runs the authorizer code for the package.

### Q What gas limit does the is-authorized invocation get?
@ The three invocations
- [ ] 5 000 000 000
- [ ] Whatever the package asks for
- [ ] 10 000 000
- [x] 50 000 000 (G_I)
> Why: G_I = 50 000 000.

### Q What state may the refine invocation read?
@ The three invocations
- [x] Only preimages via historical lookup as of the lookup-anchor time
- [ ] The full current service state
- [ ] Storage of any service
- [ ] Nothing at all
> Why: Refine is stateless except for historical lookup, so any node can reproduce it later.

### Q What is the accumulate context made of?
@ The three invocations
- [ ] One implication context
- [x] A pair of implication contexts: regular x and exceptional y
- [ ] Nothing
- [ ] The inner machines and exports
> Why: The collapse picks y on panic or out-of-gas, x otherwise.

### Q Which host call copies the regular context into the exceptional one (y ← x)?
@ Accumulate functions
- [ ] provide
- [ ] bless
- [x] checkpoint
- [ ] yield
> Why: checkpoint is the only writer of y. A panic reverts to the last checkpoint.

### Q What does the `gas` host call return?
@ General functions
- [ ] The gas used so far
- [ ] The block gas limit
- [ ] The service's minimum accumulate gas
- [x] The remaining gas
> Why: gas (index 0) puts the remaining gas in ω₇.

### Q What does `grow_heap` do?
@ General functions
- [x] Extends the writable heap region up to a requested page
- [ ] Allocates stack
- [ ] Frees heap pages
- [ ] Increases the gas limit
> Why: grow_heap (index 1, new in 0.8.0) replaces the removed `sbrk` instruction.

### Q What does `fetch` do?
@ General functions
- [ ] Loads another service's code
- [x] Copies invocation data (selected by ω₁₀) into memory: parameters, entropy, payloads, items and so on
- [ ] Downloads a preimage from the network
- [ ] Reads a storage key
> Why: One call with 16 selectors gives each invocation access to exactly the data it is allowed.

### Q What does `lookup` return?
@ General functions
- [ ] Account metadata
- [ ] A storage value
- [x] A preimage by its hash, for this or another service
- [ ] A segment
> Why: lookup (index 3) returns the preimage of a hash.

### Q What does `read` access?
@ General functions
- [ ] The authorizer trace
- [ ] Preimages
- [ ] Inner PVM memory
- [x] Storage values by key, for this or another service
> Why: read (index 4) returns the storage value of a key.

### Q Which service's storage can `write` modify?
@ General functions
- [x] Only the calling service's own
- [ ] Only the manager's
- [ ] Any service's
- [ ] Any service that has requested it
> Why: write sets the caller's own storage.

### Q What does `info` return?
@ General functions
- [ ] The validator set
- [x] An account's metadata: code hash, balance, threshold, gas minimums, sizes and dates
- [ ] A storage value
- [ ] The block header
> Why: info (index 6) encodes an account's metadata.

### Q What does `export` do in refine?
@ Refine functions
- [ ] Transfers tokens
- [ ] Writes storage
- [x] Appends a 4104-octet segment to the package's exports
- [ ] Publishes a preimage
> Why: export pads the data to a 4104-octet segment and returns its index; exported segments can be imported by later work-packages.

### Q What does the `machine` host call create?
@ Refine functions
- [ ] A new validator
- [ ] A copy of the current machine
- [ ] A new service
- [x] An inner PVM instance that refine code can run
> Why: machine builds an inner VM from code in memory; invoke runs it.

### Q Which host call runs an inner machine?
@ Refine functions
- [x] invoke
- [ ] pages
- [ ] peek
- [ ] machine
> Why: invoke runs inner machine r7 with a gas budget and registers.

### Q What does `bless` set?
@ Accumulate functions
- [ ] The validator set
- [x] The privileges: manager, per-core assigners, delegator, registrar, always-accumulate services
- [ ] A storage value
- [ ] A service's code hash
> Why: bless rewrites χ. In 0.8.0 only the manager may call it.

### Q What does `assign` set?
@ Accumulate functions
- [ ] A preimage request
- [ ] Service privileges
- [x] A core's authorizer queue (80 hashes) and its next assigner
- [ ] Validator keys
> Why: assign (index 16) writes φ[c].

### Q What does `designate` set?
@ Accumulate functions
- [ ] The manager
- [ ] The next service id
- [ ] A core's queue
- [x] The staging validator set ι
> Why: Only the delegator may call designate.

### Q What does `new` do?
@ Accumulate functions
- [x] Creates a new service account
- [ ] Creates a new validator
- [ ] Creates a work-package
- [ ] Creates an inner PVM
> Why: new (index 19) creates a service with a code hash and gas minimums.

### Q When does a `transfer` deliver tokens to the destination?
@ Accumulate functions
- [ ] Never: it only records intent
- [x] It deducts now and delivers later, as a deferred transfer processed when the destination accumulates
- [ ] Immediately, inside the call
- [ ] At the end of the epoch
> Why: Transfers are deferred and credited before the destination's accumulation runs.

### Q What do `solicit`, `query`, `forget` and `provide` manage together?
@ Accumulate functions
- [ ] Core assignment
- [ ] Validator rotation
- [x] The lifecycle of preimage requests
- [ ] Inner machines
> Why: A service requests a preimage, checks its status, forgets it later, and anyone can provide the data.

### Q What does `yield` set?
@ Accumulate functions
- [ ] The next service id
- [ ] The service's balance
- [ ] The gas limit
- [x] The service's 32-octet accumulation output (yield hash)
> Why: yield takes 32 octets from memory; it feeds θ and the recent-history belt.

### Q Who may call `designate`?
@ Privilege model
- [x] The delegator
- [ ] The registrar
- [ ] The manager
- [ ] Any service
> Why: The delegator (χ_v) designates ι.

### Q What may the registrar do that others cannot?
@ Privilege model
- [ ] Assign cores
- [x] Create services with chosen ids below 2¹⁶
- [ ] Designate validators
- [ ] Bless privileges
> Why: Ids below 2¹⁶ are reserved for the registrar.

### Q What is special about always-accumulate services?
@ Privilege model
- [ ] They never pay gas
- [ ] They can write other services' storage
- [x] They are accumulated every block with a gas allowance even without work
- [ ] They run refine on-chain
> Why: χ_z lists them with their gas.

## Level 2

### Q A service calls `read` with a key pointer into inaccessible memory, for a service id that does not exist. What happens?
- [ ] ω₇ ← NONE
- [ ] Nothing, the call is ignored
- [ ] ω₇ ← WHO
- [x] The invocation panics
> Why: Memory is read before any service logic, so the bad pointer panics first. This is lasair's B2 bug.

### Q A service calls `transfer` to a destination that does not exist. What is returned?
- [x] WHO
- [ ] NONE
- [ ] CASH
- [ ] HUH
> Why: WHO is for an unknown service index.

### Q A `transfer` passes a gas limit below the destination's minimum memo gas. What is returned?
- [ ] HUH
- [x] LOW
- [ ] CASH
- [ ] WHO
> Why: LOW means the gas limit is too low.

### Q A `transfer` would leave the sender's balance below its threshold. What is returned?
- [ ] FULL
- [ ] LOW
- [x] CASH
- [ ] OOB
> Why: CASH is insufficient funds.

### Q A `write` would push the service's threshold balance above its balance. What is returned?
- [ ] CASH
- [ ] HUH
- [ ] NONE
- [x] FULL
> Why: write returns FULL when storage would exceed what the balance can back.

### Q A service that is not the manager calls `bless` in 0.8.0. What is returned per the text?
- [x] HUH
- [ ] WHO
- [ ] OK, and the privileges change
- [ ] The invocation panics
> Why: 0.8.0 adds a HUH case for a non-manager caller (GP #519). The vectors flag #558 as possibly changing it again.

### Q A service calls `assign` for core 400 at full spec. What is returned?
- [ ] OOB
- [x] CORE
- [ ] WHO
- [ ] HUH
> Why: CORE if the core index is ≥ C = 341.

### Q A service with 7 gas left calls `checkpoint`, which costs more. What must happen?
- [ ] The checkpoint is free when gas is low
- [ ] The checkpoint is taken and gas goes negative
- [x] The call cannot pay, no snapshot is taken, and a later revert goes back to the previous checkpoint
- [ ] ω₇ ← LOW
> Why: A host call that cannot pay has no effect. This is lasair's B5 bug.

### Q A service writes storage, never checkpoints, then panics. What survives?
- [ ] Everything except transfers
- [ ] The write
- [ ] The write, but not the yield
- [x] Nothing it did in this invocation (the exceptional context y is the state before it ran)
> Why: On panic the collapse takes y, which only checkpoint updates.

### Q A refine program calls `machine` when 63 inner machines already exist. What is returned?
- [x] FULL
- [ ] OOB
- [ ] WHO
- [ ] HUH
> Why: FULL if 63 machines exist; HUH is for a blob that fails deblob.

### Q A refine program calls `peek` on machine id 9, which does not exist. What is returned?
- [ ] OOB
- [x] WHO
- [ ] HUH
- [ ] NONE
> Why: WHO for an unknown machine index. OOB is for an inaccessible inner memory range.

### Q Refine calls `invoke` with a budget g_R such that its remaining gas is below 968 + g_R. What happens?
- [ ] ω₇ ← LOW
- [ ] ω₇ ← OOG
- [x] The outer invocation exits out-of-gas before the inner machine runs
- [ ] The inner machine runs with whatever gas remains
> Why: invoke costs 968 + g_R, charged up front (the invoke pre-check).

### Q An inner machine exits on a host call. Where does its stored pc point for the next `invoke`?
- [ ] At pc 0
- [ ] At the `ecalli`
- [ ] At the start of the block
- [x] Past the `ecalli`, so it continues after it
> Why: On HOST the stored pc is advanced past ecalli; on FAULT it stays so the caller can fix memory and retry.

### Q An accumulating service calls `fetch` with selector 7 (the encoded package). What is returned?
- [x] NONE, because accumulate only gets selectors 0, 1, 14 and 15
- [ ] It panics
- [ ] The package
- [ ] WHAT
> Why: Selector availability depends on the invocation; nothing selected returns NONE.

### Q In refine, what does `fetch` selector 1 (entropy) return?
- [ ] NONE
- [x] The zero hash
- [ ] η' from the block
- [ ] The authorizer trace
> Why: Ψ_R passes H⁰ as fetch's entropy argument (eq. refinemutator). The reason, reproducibility when auditors re-run refine, is a derivation, not GP text.

### Q A service calls `new` with a non-zero gratis value but is not the manager. What is returned?
- [ ] CASH
- [ ] FULL
- [x] HUH
- [ ] WHO
> Why: Only the manager may create gratis services.

### Q How does `new` choose the id of an ordinary (non-registrar) new service?
- [ ] A hash of the code
- [ ] The caller chooses any id
- [ ] The lowest unused id
- [x] The context's next-free id, then the context advances by 42 through a collision check
> Why: next-free-id starts pseudo-random from a hash including η' and the slot, and each new service advances it by 42, skipping taken ids.

### Q A service calls `solicit` for a (hash, length) it has never requested and can afford. What is the request status afterwards?
- [x] [] (requested, not yet provided)
- [ ] [0]
- [ ] [t] (available since now)
- [ ] It is removed
> Why: A new request is recorded as the empty sequence; provision later makes it available.

### Q What is `write` with a zero value length used for?
- [ ] Writing an empty value
- [x] Deleting the key
- [ ] Reading the value
- [ ] It is invalid
> Why: r10 = 0 deletes the storage item.

### Q An accumulate invocation is started for a service whose code is missing. What happens?
- [ ] The block is invalid
- [ ] It returns WHO
- [x] No code runs: incoming transfers are still credited to the balance, with no yield and zero gas used
- [ ] It panics
> Why: Ψ_A with missing or oversize code returns the post-transfer state, no deferred transfers, no yield, gas 0 (eq. accinvocation). Refine would report BAD instead.

## Level 3

### Q Why must a host call validate its memory arguments before any other logic?
> Hint: lasair's B2.
> Answer: The order decides the outcome everyone must agree on: a bad pointer panics the invocation, while a lookup of a missing service returns NONE and continues. lasair checked the service first, returned NONE and let the invocation yield, while the reference panicked. The whole state diverged from one ordering choice.

### Q Explain the accumulate context pair and why checkpoint exists.
> Hint: What should survive a panic?
> Answer: x is the context being built; y is what survives if the invocation panics or runs out of gas. checkpoint copies x into y, so a service can commit progress. Without it, a panic loses everything the invocation did.

### Q Why does refine get only historical lookup and the zero hash for entropy?
> Hint: Who re-runs refine, and when?
> Answer: Refine must give the same result when auditors re-run it later on possibly different chain state. The GP says historical lookup is designed to give the same result for any time auditing may occur, so refine reads preimages only as they were at the lookup-anchor time. Withholding block entropy (it gets the zero hash) follows the same logic; that part is a derivation, not GP text.

### Q Why is `transfer` deferred rather than immediate?
> Hint: Accumulation of different services is meant to be parallelisable.
> Answer: The mechanism (GP): the sender's balance drops inside the call, the transfer joins the deferred list, and the destination's balance is credited before its own accumulation runs, which receives the transfer among its inputs. The sender also pays the transfer's gas limit, which funds the destination's processing. The reason, keeping each service's accumulation independent so it can be parallelised, is a derivation, not GP text.

### Q Walk through the life of a preimage request.
> Hint: solicit, provide, query, forget.
> Answer: A service solicits (hash, length), recorded as an empty status. Someone provides the data, recorded as a provision and integrated so the status says when it became available. The service can query the status, and later forget it, which marks it unavailable and, after the expunge period, removes it.

### Q Why did 0.8.0 replace `sbrk` with a host call?
> Hint: Gas and protocol visibility.
> Answer: The GP records the change, not the reason. What is in the text: grow_heap (host call 1) costs a base 275 gas plus 121 per additional page, whereas sbrk was an instruction inside the flat instruction cost. A plausible reason (derivation, not GP text): heap growth changes the page map, which decides whether later stores fault, so it is protocol-visible work that should be priced by size.

### Q What does each privilege role in χ allow?
> Hint: Five roles.
> Answer: The manager may bless (rewrite all privileges) and create gratis services. Each core's assigner may assign that core's authorizer queue. The delegator may designate the next validator set. The registrar may create services with ids below 2¹⁶. Always-accumulate services are accumulated every block with a gas allowance.

### Q What happens when refine's inner machine faults on a page, and how does the refine code recover?
> Hint: Where does the stored pc point?
> Answer: invoke returns FAULT with the page address. The stored pc stays on the faulting instruction, so the refine code can use `pages` to map it and call invoke again to retry.

### Q What did lasair's B5 teach about checkpoint?
> Hint: Gas 7, cost 10.
> Answer: A host call that cannot pay must have no effect. lasair took the snapshot before failing the gas check, so the revert kept a write made just before. The reference could not pay, never snapshotted, and reverted further back.

### Q Why is the expunge period D longer than the lookup anchorage?
> Hint: Audits happen after reporting.
> Answer: D = 19 200 slots is the 14 400-slot lookup anchorage plus an eight-hour margin, so a preimage cannot be removed while an audit of a report that looked it up could still happen. Historical lookups then give the same answer whenever they are checked.

### Q Why does 0.8.0 price host calls individually instead of a flat cost?
> Hint: What did a flat 10 gas mean for an expensive call like `new`?
> Answer: The GP requires gas to be approximately proportional to computation time (Overview, the PVM and gas). Host calls do very different amounts of work and some scale with memory size, so 0.8.0 gives each a base cost plus per-1024-octet terms where relevant. The link from the flat 10 to under-pricing is a derivation, not GP text.
