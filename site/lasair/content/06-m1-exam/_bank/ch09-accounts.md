---
chapter: ch09-accounts
---

## Level 1

### Q What is a service in JAM most analogous to in Ethereum?
@ State touched
- [ ] An externally owned account with a private key
- [x] A smart contract: code, storage and a balance
- [ ] A block producer
- [ ] A transaction pool
> Why: GP §9 opening: a service "is somewhat analogous to a smart contract in Ethereum in that it includes amongst other items, a code component, a storage component and a balance".

### Q Which Greek letter holds all service accounts in state?
@ State touched
- [ ] α
- [ ] χ
- [x] δ
- [ ] ψ
> Why: δ ∈ 𝔻⟨ℕ_S → 𝔸⟩, a dictionary from service id to account (GP §9).

### Q What type is a service identifier?
@ State touched
- [ ] A 32-byte hash
- [x] A 32-bit natural number
- [ ] An Ed25519 public key
- [ ] A 64-bit balance
> Why: GP §9: ℕ_S ≡ ℕ_{2³²}.

### Q What does a service account's storage component map?
@ State touched
- [ ] Hashes to preimages
- [x] Arbitrary byte-string keys to byte-string values
- [ ] Timeslots to balances
- [ ] Core indices to authorizers
> Why: GP §9: storage ∈ 𝔻⟨𝕐 → 𝕐⟩.

### Q What does the preimage lookup dictionary map?
@ State touched
- [x] A hash to the data it is the hash of
- [ ] A key to a value, like storage
- [ ] A service id to its code
- [ ] A slot to a request
> Why: GP §9: preimages ∈ 𝔻⟨ℍ → 𝕐⟩, with the invariant that the key is the Blake2b hash of the value.

### Q What is the key of the preimage request dictionary?
@ The four preimage states (eq. historicallookup)
- [ ] A hash alone
- [x] A pair of hash and length
- [ ] A slot number
- [ ] A storage key
> Why: GP §9: requests ∈ 𝔻⟨(ℍ, ℕ_L) → ⟦ℕ_T⟧_{:3}⟩.

### Q What is the value of a preimage request entry?
@ The four preimage states (eq. historicallookup)
- [ ] The preimage data
- [ ] A balance deposit
- [x] A sequence of up to three timeslots
- [ ] The requesting service id
> Why: the historical status is ⟦ℕ_T⟧_{:3}; its length encodes one of four modes.

### Q A request entry holds an empty sequence []. What does that mean?
@ The four preimage states (eq. historicallookup)
- [x] The preimage is requested but not yet supplied
- [ ] The preimage is available
- [ ] The preimage has been expunged
- [ ] The request was cancelled
> Why: GP §9 semantics: h = [] means requested, not yet supplied.

### Q A request entry holds one timeslot [x]. What does that mean?
@ The four preimage states (eq. historicallookup)
- [ ] Requested but missing
- [x] Available since slot x
- [ ] Unavailable since slot x
- [ ] Available until slot x
> Why: one entry means available from time h₀.

### Q A request entry holds two timeslots [x, y]. What does that mean?
@ The four preimage states (eq. historicallookup)
- [ ] Available from x and again from y
- [x] Was available from x, unavailable since y
- [ ] Requested at x, supplied at y
- [ ] Available only at x and y
> Why: two entries mean previously available from h₀, now unavailable since h₁.

### Q A request entry holds three timeslots [x, y, z]. What does that mean?
@ The four preimage states (eq. historicallookup)
- [ ] Unavailable since z
- [ ] Requested three times
- [x] Available since z, having previously been available from x until y
- [ ] Available from x to z
> Why: three entries: available from h₂, previously available from h₀ until h₁.

### Q Where does preimage data enter state from?
@ Inputs
- [ ] A service writing it during accumulation
- [x] The preimages extrinsic E_P
- [ ] The guarantees extrinsic
- [ ] The header
> Why: GP §9: "preimage data is supplied extrinsically, whereas storage data originates as part of the service's accumulation".

### Q Why can't a preimage simply be deleted once supplied?
@ The transition in plain English
- [ ] Deletion is too expensive in gas
- [x] Refine runs in-core against historical state, so the history of its availability must be kept for auditing
- [ ] Preimages are owned by the manager
- [ ] The trie cannot delete keys
> Why: GP §9: it goes through being marked unavailable and only later removed, "so that historical information on its existence is retained", because Refine queries it in-core.

### Q What is the lookup anchor?
@ The transition in plain English
- [ ] The first block of an epoch
- [x] A historical, recently finalized state that in-core Refine uses for preimage lookups
- [ ] The block that created the service
- [ ] The newest block in recent history
> Why: GP §9: "we thus name a historical state, the lookup anchor which must be considered recently finalized".

### Q What does the historical lookup function Λ return?
@ The four preimage states (eq. historicallookup)
- [ ] The storage value for a key
- [x] The preimage of a hash if it was available to that service at the given slot, else ∅
- [ ] The balance at a past slot
- [ ] The latest version of the service's code
> Why: GP §9: Λ(a, t, h) returns a_p[h] when the request status says it was available at t, else ∅.

### Q What is the preimage expunge period D at full spec?
@ Validation rules and what they guard
- [ ] 600 slots
- [ ] 14 400 slots
- [x] 19 200 slots
- [ ] 28 800 slots
> Why: Definitions: D = 19 200 (tiny 32), the period after which an unreferenced preimage may be expunged.

### Q How many code entry-points does a service have, and what are they?
@ The transition in plain English
- [ ] One: execute
- [x] Two: refine (index 0, in-core, stateless) and accumulate (index 1, on-chain, stateful)
- [ ] Three: authorize, refine, accumulate
- [ ] Two: deploy and call
> Why: GP §9.1 lists entry-points 0 refine and 1 accumulate. Is-authorized belongs to the authorizer, not the service.

### Q How does a service's code hash relate to its actual code?
@ State touched
- [ ] The code is stored in storage under the key "code"
- [x] The code hash's preimage, in the service's preimage lookup, encodes (metadata, code)
- [ ] The hash is the address of the code on the PVM
- [ ] The code lives in the header
> Why: GP §9.1: (metadata, code) are decoded from a_p[code hash]; if absent the service has no code.

### Q What do the two gas limits in an account specify?
@ State touched
- [ ] Refine gas and is-authorized gas
- [x] Minimum gas per work-item for accumulate, and minimum gas per deferred transfer
- [ ] Maximum gas per block and per epoch
- [ ] Gas price and gas limit
> Why: GP §9.1: a_g is the minimum accumulate gas per work-item, a_m per deferred transfer.

### Q Which three usage fields record an account's history?
@ State touched
- [ ] Nonce, owner, version
- [x] Creation slot, most recent accumulation slot, parent service
- [ ] Balance, deposit, gratis
- [ ] First, last and next storage key
> Why: GP §9: "the time slot at creation, the time slot at the most recent accumulation and the parent service".

### Q What is the gratis storage offset a_f?
@ State touched
- [ ] A free gas allowance
- [x] An amount subtracted from the threshold balance, a storage deposit credit
- [ ] The number of free storage items
- [ ] The balance given at creation
> Why: GP §9.3: the threshold subtracts a_f; the manager can bestow such credits (§9.4).

### Q What is the threshold balance a_t?
@ The transition in plain English
- [ ] The maximum balance a service may hold
- [x] The minimum balance a service needs given its storage footprint
- [ ] The balance that triggers accumulation
- [ ] The transfer fee
> Why: GP §9.3 defines a_t as the minimum (threshold) balance in terms of storage footprint.

### Q What is the base deposit B_S?
@ Validation rules and what they guard
- [ ] 1
- [ ] 10
- [x] 100
- [ ] 1 000
> Why: Definitions: B_S = 100, the basic minimum balance all services require.

### Q What is the per-item deposit B_I?
@ Validation rules and what they guard
- [ ] 1
- [x] 10
- [ ] 34
- [ ] 81
> Why: Definitions: B_I = 10 per item of elective service state.

### Q What is the per-byte deposit B_L?
@ Validation rules and what they guard
- [x] 1
- [ ] 10
- [ ] 100
- [ ] 4 096
> Why: Definitions: B_L = 1 per octet.

### Q How many items does one preimage request count as in a_i?
@ The transition in plain English
- [ ] 0
- [ ] 1
- [x] 2
- [ ] 3
> Why: GP §9.3: a_i = 2·|a_l| + |a_s|.

### Q What fixed overhead does each preimage request add to a_o, besides its length?
@ The transition in plain English
- [ ] 34 octets
- [x] 81 octets
- [ ] 32 octets
- [ ] 128 octets
> Why: GP §9.3: each (h, z) in requests contributes 81 + z.

### Q What fixed overhead does each storage item add to a_o, besides key and value lengths?
@ The transition in plain English
- [x] 34 octets
- [ ] 81 octets
- [ ] 32 octets
- [ ] 0 octets
> Why: GP §9.3: each storage pair contributes 34 + |value| + |key|.

### Q Which state component holds service privileges?
@ State touched
- [ ] δ
- [x] χ
- [ ] φ
- [ ] ι
> Why: GP §9.4: privileges are held in χ.

### Q How many kinds of privilege does χ hold in 0.8.0?
@ State touched
- [ ] Three
- [ ] Four
- [x] Five: manager, delegator, registrar, assigners, always-accumulate
- [ ] Six
> Why: GP §9.4: χ ≡ (manager, delegator, registrar, assigners, always-accumulate).

### Q What can the manager service do?
@ State touched
- [x] Alter χ from block to block and bestow storage deposit credits
- [ ] Set the staging validator keys
- [ ] Create services in the protected id range
- [ ] Rewrite the authorizer queue for a core
> Why: GP §9.4: the manager "is the service able to effect an alteration of χ ... as well as bestow services with storage deposit credits".

### Q Which privileged service may set the staging validator set ι?
@ State touched
- [ ] The manager
- [x] The delegator
- [ ] The registrar
- [ ] Any always-accumulate service
> Why: GP §9.4: "The next, delegator, is able to set ι."

### Q What can the registrar do that others cannot?
@ State touched
- [ ] Transfer balance for free
- [x] Create new service accounts with indices in the protected range
- [ ] Change the authorizer queue
- [ ] Skip the threshold balance
> Why: GP §9.4: the registrar "alone is able to create new service accounts with indices in the protected range".

### Q What is χ's assigners component?
@ State touched
- [ ] One manager per epoch
- [x] One service per core, able to alter that core's authorizer queue φ
- [ ] The list of validators assigned to each core
- [ ] The guarantors of each report
> Why: GP §9.4: assigners ∈ ⟦ℕ_S⟧_C, "capable of altering the authorizer queue φ, one for each core".

### Q What is the always-accumulate dictionary?
@ State touched
- [ ] Services that never accumulate
- [x] Services that accumulate in every block, each with a basic gas amount
- [ ] Services with unlimited balance
- [ ] The queue of reports waiting to accumulate
> Why: GP §9.4: a dictionary from service id to gas; those services "automatically accumulate in each block".

### Q What did lasair's B3 bug get wrong?
@ War story
- [ ] Service ids were minted twice
- [x] A read of another service's storage returned nothing: foreign storage was not loaded and the key was not interleaved with the foreign id
- [ ] Balances overflowed
- [ ] The gratis offset was ignored
> Why: B3 in the Divergence Lab (seed 1071703991, step 6628).

### Q Did accounts.tex change between GP 0.7.2 and 0.8.0?
@ 0.7.2 → 0.8.0
- [x] No textual change in the chapter
- [ ] The registrar was added
- [ ] Preimage requests gained a fourth slot
- [ ] Storage deposits were removed
> Why: `git diff v0.7.2 v0.8.0 -- text/accounts.tex` is empty; the registrar already existed in 0.7.2.

## Level 2

### Q A service stores 2 items (keys 4 and 6 bytes, values 10 and 20 bytes) and has no preimage requests. What are a_i and a_o?
- [ ] a_i = 2, a_o = 40
- [x] a_i = 2, a_o = 108
- [ ] a_i = 4, a_o = 108
- [ ] a_i = 2, a_o = 202
> Why: a_i = |a_s| = 2; a_o = (34 + 10 + 4) + (34 + 20 + 6) = 48 + 60 = 108.

### Q A service with no storage has one preimage request for a 100-byte preimage and gratis 0. What is its threshold balance?
- [ ] 100
- [ ] 181
- [x] 301
- [ ] 320
> Why: a_i = 2, a_o = 81 + 100 = 181. a_t = 100 + 10·2 + 1·181 − 0 = 301.

### Q A service's gratis offset exceeds B_S + B_I·a_i + B_L·a_o. What is its threshold balance?
- [ ] Negative
- [x] 0
- [ ] B_S
- [ ] Undefined
> Why: a_t ≡ max(0, …); the max clamps it at zero.

### Q Refine asks Λ for a preimage at slot 500. The request status is [300, 450]. What does Λ return?
- [ ] The preimage
- [x] ∅: it was available from 300 until 450, not at 500
- [ ] An error that halts refine
- [ ] The preimage, because it was supplied once
> Why: for [x, y], I is x ≤ t < y; 500 is not below 450.

### Q Status is [300, 450, 480]. Is the preimage available at slot 500?
- [x] Yes: available again since 480
- [ ] No: unavailable since 450
- [ ] Only if 500 < 480
- [ ] It depends on the service balance
> Why: for [x, y, z], I is x ≤ t < y ∨ z ≤ t; 480 ≤ 500.

### Q Status is [300, 450, 480]. Is the preimage available at slot 400?
- [x] Yes: 300 ≤ 400 < 450
- [ ] No: only available after 480
- [ ] No: three-slot statuses are always unavailable in the past
- [ ] Only in accumulate
> Why: the first disjunct x ≤ t < y holds.

### Q The preimage dictionary holds data d under key h, but h ≠ Blake2b(d). What does the GP say?
- [ ] It is allowed if the manager set it
- [x] It cannot happen: every stored preimage must hash to its key and have a request status
- [ ] Λ returns the data anyway
- [ ] It is expunged at the next epoch
> Why: GP §9.2 invariants: h = H(d) and (h, |d|) ∈ keys of a_l.

### Q A service's code hash has no entry in its preimage lookup. What are its code and metadata?
- [ ] The zero code
- [x] Both ∅: the service is not functional
- [ ] The previous code
- [ ] The manager's code
> Why: GP §9.1: (metadata, code) = (∅, ∅) otherwise.

### Q Two services exist. Service A reads a storage key of service B during accumulation. In the state trie, how is B's value found?
- [ ] By the raw key alone
- [x] By a state key built from B's service id interleaved with the Blake2b hash of the prefixed key
- [ ] By A's service id and the key
- [ ] Storage of other services cannot be read
> Why: storage state keys embed the owning service (App. D). Getting this wrong was lasair's B3.

### Q A non-manager service calls `bless` in GP 0.8.0. What happens?
- [ ] It succeeds if it is the delegator
- [x] It fails with HUH: only the manager may bless
- [ ] It changes only the always-accumulate set
- [ ] It panics
> Why: 0.8.0 text (App. B, GP #519): bless returns HUH unless the caller is the manager. The vectors defer this pending #558.

### Q Which privilege does a coretime marketplace service need in order to change which authorizers a core accepts?
- [ ] Manager
- [ ] Delegator
- [ ] Registrar
- [x] The assigner for that core
> Why: assigners, one per core, may alter φ for their core (GP §9.4, via `assign`).

### Q Which privilege decides who validates in the next epochs?
- [ ] Manager
- [x] Delegator, by setting ι
- [ ] Assigner
- [ ] Registrar
> Why: the delegator sets ι, which becomes γ_P and then κ.

### Q Why does a preimage request count as two items but a storage entry as one?
- [ ] Preimages are bigger
- [x] A request carries both the request record and the preimage data it will hold (derivation, not GP text)
- [ ] It is a typo in the GP
- [ ] Requests are stored twice for safety
> Why: the GP gives a_i = 2|a_l| + |a_s| without a stated reason; the two-part reading is a derivation.

### Q A preimage for (h, 50) is in E_P but the service has no request for (h, 50). What does the account invariant imply?
- [ ] It is stored anyway
- [x] It cannot become a stored preimage: every stored preimage needs a request status for its (hash, length)
- [ ] It is stored under a different length
- [ ] It becomes storage
> Why: invariant: (h, |d|) ∈ keys(a_l). The preimage STF rejects unsolicited preimages (ch. 12 preimage integration).

### Q Why does the historical lookup take a timeslot argument at all?
- [ ] To charge gas by age
- [x] Refine and its auditors must get the same answer at the lookup anchor's time, whatever has changed since
- [ ] To expire old services
- [ ] Because storage is versioned
> Why: GP §9.2: retaining history makes "judgments deterministic even without consensus on chain state".

## Level 3

### Q Explain the two entry points of a service and why they differ.
> Hint: in-core versus on-chain.
> Answer: Refine (0) runs in-core on a core's guarantors, is essentially stateless and turns large inputs into small outputs. Accumulate (1) runs on-chain by every validator, is stateful, and can change storage, balances and call other services. The split lets heavy computation scale across cores while state changes stay in consensus.

### Q Explain the four preimage request states.
> Hint: the length of the timeslot sequence is the state.
> Answer: [] requested but not supplied; [x] available since x; [x, y] was available from x, unavailable since y; [x, y, z] available again since z after an earlier window x to y. Λ uses these windows to answer "was it available at slot t".

### Q Why are preimage lookups separate from storage?
> Hint: who can read each, and when.
> Answer: Storage is on-chain only and written by accumulation. Preimages are supplied extrinsically, are keyed by their hash, and must be readable in-core by Refine at a historical state. That needs a history of availability, so preimages cannot be deleted freely the way storage can.

### Q Compute a threshold balance from a footprint and explain each term.
> Hint: a_t = max(0, B_S + B_I·a_i + B_L·a_o − a_f).
> Answer: B_S = 100 is the base. Each storage item is 1 item and each preimage request 2 items, at B_I = 10 each. Octets: 34 + key + value per storage item and 81 + length per request, at B_L = 1 each. Subtract the gratis offset, floor at 0.

### Q Name the five privileges and what each controls.
> Hint: one changes privileges, one validators, one ids, one cores, one automatic accumulation.
> Answer: The manager alters χ and grants deposit credits. The delegator sets the staging validator keys ι. The registrar creates services in the protected id range. The per-core assigners rewrite that core's authorizer queue. The always-accumulate dictionary lists services that accumulate each block with a base gas amount.

### Q What is the lookup anchor and why must it be finalized?
> Hint: auditors re-run Refine later.
> Answer: It is the historical state Refine uses for preimage lookups. It must be recently finalized so every validator, including auditors running Refine later, sees the same availability history and reaches the same result without needing consensus on the current state.

### Q Why does an account record its parent service, creation slot and last-accumulation slot?
> Hint: this is usage metadata, not logic.
> Answer: The GP records them as usage characteristics of the account. They let the protocol and services reason about an account's age, activity and lineage; the chapter defines them without further rules.

### Q Tell the B3 story in 60 seconds.
> Hint: two mistakes on one read.
> Answer: A fuzzer seed diverged at step 6628 because a service read another service's storage and lasair returned nothing. The foreign service was loaded without its storage, and the read used the raw key instead of the state key interleaved with the foreign service id. The fix loaded foreign storage and interleaved the key. Lesson: storage keys embed their owner.

### Q What are the two gas limits in an account for?
> Hint: work-items and transfers.
> Answer: a_g is the minimum gas each work-item must bring for this service's accumulate; a_m is the minimum gas for each deferred transfer to it. The GP states only the minimums; that they stop callers starting accumulation with too little gas to be useful is a derivation, not GP text.

### Q What does it mean that the code is identified by a hash?
> Hint: where the bytes actually live.
> Answer: The account stores only a code hash. The actual metadata and code are the decoding of the preimage of that hash in the service's own preimage lookup. If the preimage is missing the service has no code and is not functional.
