---
chapter: f03-the-work-package
---

## Level 1

### Q Since JAM has no user transactions, how does Alice's order get into JAM?
@ What JAM does
- [ ] As a signed transaction in a mempool
- [x] As data inside a work-item, inside a work-package
- [ ] As a header field
- [ ] As a preimage
> Why: Work arrives in work-packages built by a work-package builder; jamswap orders ride in a work-item's payload.

### Q Who assembles work-packages?
@ What JAM does
- [ ] The block author
- [ ] Every validator
- [x] A builder
- [ ] The service itself, on-chain
> Why: The GP mentions data supplied "by the work-package builder"; jamswap's builder assembles each market's round.

### Q How many work-items can one work-package hold?
@ The words and symbols
- [ ] Exactly 1
- [ ] Up to 8
- [x] 1 to 16
- [ ] Up to 341
> Why: The work-items field is a sequence of 1 to C_maxpackageitems = 16 items.

### Q What does a work-item name?
@ What JAM does
- [x] One service, the code hash it expects, a payload and gas limits
- [ ] A core and a validator
- [ ] A block hash and a slot
- [ ] An authorizer and its token
> Why: eq. workitem: service index, code hash, payload, refine gas limit, accumulate gas limit, export count, imports, extrinsics.

### Q In jamswap, what is the work-item's payload?
@ What JAM does
- [ ] Alice's private key
- [x] One round's batch for one market, with Alice's signed order inside
- [ ] The whole chain state
- [ ] A single token balance
> Why: jamswap's builder assembles each market's round into a tagged payload; public orders carry the trader's key and signature.

### Q What is the authorization token?
@ What JAM does
- [ ] A fee paid in DOT
- [x] Opaque data arguing that the package may use the core
- [ ] A validator's signature
- [ ] The hash of the previous block
> Why: authorization.tex: a Token is opaque data included with a work-package to help argue it should be authorized.

### Q What is the "anchor" in the refinement context?
@ What JAM does
- [ ] The first block ever
- [x] The recent block the work was prepared against
- [ ] The block the report will land in
- [ ] The finalized block used for audits
> Why: The context names an anchor (hash, slot, state root, belt peak) that must be in recent history when the report lands.

### Q What is the "lookup anchor" for?
@ What JAM does
- [x] Fixing which block's state is used for historical preimage lookups
- [ ] Choosing the core
- [ ] Choosing the guarantors
- [ ] Setting the gas price
> Why: The authorizer code, for example, is fetched by historical lookup at the lookup anchor's slot (§14).

### Q What are prerequisites in a work-package?
@ What JAM does
- [ ] Required validator signatures
- [ ] Minimum token balances
- [x] Other packages that must be handled before this one
- [ ] Required cores
> Why: The context carries a set of prerequisite work-package hashes; accumulation waits for them.

### Q What is an authorizer identified by?
@ What JAM does
- [ ] The service id that hosts it
- [ ] Its creator's key
- [x] The hash of its code hash concatenated with its configuration
- [ ] The core index
> Why: eq.: the implied authorizer is Blake2b(auth code hash ⌢ auth config).

### Q What is the authorizer pool?
@ The words and symbols
- [x] Per core, the authorizers currently allowed to use it (at most 8)
- [ ] The set of all services
- [ ] The validators assigned to a core
- [ ] The queue of pending reports
> Why: α holds, per core, up to O = 8 authorizer hashes.

### Q What is the authorizer queue?
@ The words and symbols
- [ ] A list of pending work-packages
- [x] Per core, 80 upcoming authorizers that refill the pool
- [ ] A list of validators waiting to join
- [ ] The mempool
> Why: φ holds, per core, Q = 80 authorizer hashes; one enters the pool each block.

### Q Which symbol is the authorizer pool?
@ The words and symbols
- [ ] φ
- [ ] ρ
- [x] α
- [ ] β
> Why: α is the authorizer pool; φ is the queue.

### Q Who can change the authorizer queue?
@ What JAM does
- [ ] Any service
- [ ] The block author
- [x] Only an appropriately privileged service, from accumulate
- [ ] The builder
> Why: authorization.tex: φ may be altered only through an exogenous call from the accumulate logic of a privileged service.

### Q What is the size limit on a work-package's whole auditable bundle?
@ The words and symbols
- [ ] 48 KB
- [ ] 1 MB
- [x] 13 791 360 bytes
- [ ] Unlimited
> Why: W_B = 13,791,360 (eq. in §14).

### Q What must the refine gas limits of all items in a package stay below?
@ The words and symbols
- [ ] 10 000 000
- [ ] 50 000 000
- [x] 5 000 000 000
- [ ] 3 500 000 000
> Why: The sum of refine gas limits must be below G_R = 5×10⁹.

## Level 2

### Q A coretime buyer wants only their own packages to run on core 7. What do they rely on?
- [ ] Signing each package with a validator key
- [x] Their authorizer being in core 7's pool, and it rejecting other packages' tokens
- [ ] Registering core 7 in their service storage
- [ ] Paying the block author directly
> Why: The pool says which authorizers may use a core; each authorizer decides, via its token check, which packages to accept.

### Q A work-package lists 17 work-items. What happens?
- [ ] The 17th is dropped
- [ ] It is split across two cores
- [x] It is not a valid work-package
- [ ] It is valid at full size only
> Why: The items field is a sequence of 1 to 16.

### Q Why must a work-package name an anchor block at all?
- [ ] So validators can charge fees
- [x] Refine cannot read live state, so the package must say which state it was built against
- [ ] So the header can link to it
- [ ] To choose the core
> Why: Refine is stateless; the chain later checks that the anchor is a recent block it recognises.

### Q A package's work-items ask for accumulate gas limits summing to 12 000 000. Is the package acceptable?
- [ ] Yes, any sum is fine
- [x] No, the sum of accumulate gas limits must be below 10 000 000
- [ ] Yes, if the core is free
- [ ] Only at tiny
> Why: Σ accumulate gas limits < G_A = 10⁷ per package (work_packages_and_reports.tex).

### Q Why does JAM separate "who paid for coretime" from "what work runs"?
- [ ] To hide users' identities
- [x] To support both the Ethereum pattern and the Polkadot pattern of buying capacity
- [ ] To reduce block size
- [ ] Because services cannot hold balances
> Why: authorization.tex: the authorization system disentangles purchase of coretime from the work, supporting both interaction patterns.

### Q Where must the authorizer's code be available?
- [ ] In the block header
- [ ] On the guarantor's disk only
- [x] As a preimage of the hosting service, at the lookup anchor
- [ ] In the authorizer pool
> Why: The auth code is found by historical lookup in the hosting service's account at the lookup anchor's slot.

## Level 3

### Q Describe the nesting from Alice's order up to the work-package.
> Hint: order, payload, work-item, package.
> Answer: Alice's signed order is an entry in jamswap's round payload. The payload is the input of one work-item addressed to the jamswap service, with refine and accumulate gas limits. The work-item sits in a work-package together with an authorization token, the authorizer (code hash and config), and a refinement context naming the anchor, the lookup anchor and any prerequisites.

### Q What problem does the authorization system solve, in plain words?
> Hint: think about who pays and who submits.
> Answer: It separates buying core capacity from deciding what runs on it. A buyer arranges for their authorizer to sit in a core's queue and pool; the authorizer's code checks each package's token in-core. This lets JAM support pay-as-you-go and buy-in-advance patterns without any "transactor" account.

### Q Why does a work-package carry a refinement context?
> Hint: what can refine not see?
> Answer: Refine is stateless, so the package must fix which chain state it was built against: the anchor block for validation and the lookup anchor for historical preimage lookups. When the report lands, the chain checks the anchor is one of its recent blocks and the lookup anchor is recent enough, so everyone agrees on the inputs.
