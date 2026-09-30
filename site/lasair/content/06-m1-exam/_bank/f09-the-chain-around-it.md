---
chapter: f09-the-chain-around-it
---

## Level 1

### Q How long is a JAM slot?
@ What JAM does
- [ ] 2 seconds
- [x] 6 seconds
- [ ] 12 seconds
- [ ] 1 minute
> Why: C_slotseconds = 6 (Overview, Epochs and Slots).

### Q How long is a JAM epoch at full scale?
@ What JAM does
- [ ] 32 slots
- [ ] 100 slots
- [x] 600 slots, one hour
- [ ] 7 200 slots
> Why: E = 600 slots × 6 s = 3 600 s. (32 slots is Ethereum's epoch.)

### Q When does the JAM Common Era begin?
@ What JAM does
- [ ] Midnight UTC, 1 January 2024
- [x] Midday UTC, 1 January 2025
- [ ] The genesis block's wall-clock time, whenever that is
- [ ] Unix time zero
> Why: Overview, Time: 1200 UTC on January 1, 2025.

### Q Which list is exactly the five kinds of extrinsic data in a JAM block?
@ What JAM does
- [x] Tickets, disputes, preimages, assurances, guarantees
- [ ] Transactions, receipts, logs, uncles, withdrawals
- [ ] Tickets, votes, blobs, receipts, reports
- [ ] Guarantees, audits, transfers, tickets, votes
> Why: E = (E_T, E_D, E_P, E_A, E_G) (eq. extrinsic).

### Q Are there user transactions in a JAM block?
@ What JAM does
- [ ] Yes, like Ethereum
- [x] No; user work enters through work-packages sent to a core
- [ ] Only for balance transfers
- [ ] Only for privileged services
> Why: The five extrinsics are protocol data; there is no transactor (Overview, On Services and Accounts).

### Q What is a Safrole ticket?
@ What JAM does
- [ ] A fee paid to seal a block
- [x] An anonymous ring-VRF bid by a member of the next validator set for sealing slots
- [ ] A signed vote for finality
- [ ] A receipt for an accumulated report
> Why: Tickets are ring-VRF proofs; the ring hides which member made them.

### Q Tickets decide who seals which epoch?
@ What JAM does
- [ ] The current epoch
- [x] The next epoch
- [ ] The epoch after next
- [ ] Only the final slot of each epoch
> Why: The accumulated tickets become the next epoch's slot-sealer sequence.

### Q During which part of an epoch are tickets accepted (full scale)?
@ What JAM does
- [x] The first 500 slots
- [ ] The last 100 slots
- [ ] Only the first slot
- [ ] The whole epoch
> Why: No tickets once the slot phase reaches Y = 500 (10 at tiny).

### Q What happens if too few tickets are collected?
@ What JAM does
- [ ] Block production stops
- [ ] The previous epoch's order is reused
- [x] A fallback sequence of keys is picked from the active set using entropy
- [ ] Anyone may seal any slot
> Why: γ_S' = F(η₂', κ') when the ticket contest does not complete (eq. slotkeysequence).

### Q What does η hold?
@ The words and symbols
- [ ] The validator set
- [x] On-chain randomness (the entropy pool)
- [ ] Recent block hashes
- [ ] The ticket accumulator
> Why: η is the entropy pool; each block mixes in the author's VRF output.

### Q What is κ?
@ The words and symbols
- [ ] Last epoch's validators
- [ ] The staging validators
- [x] The active validator set for this epoch
- [ ] The key of the block author
> Why: κ is active; the previous set is λ and the staging set is ι (plain names in this lesson).

### Q What lives in γ?
@ The words and symbols
- [ ] Service accounts
- [x] Safrole's bookkeeping: pending keys, the next sealing order, collected tickets
- [ ] Disputes
- [ ] Recent history
> Why: γ is the Safrole state (ch. 6).

### Q Which state root does a JAM header carry?
@ What JAM does
- [ ] The posterior state root, like Ethereum
- [x] The prior state root: the state the block was built on
- [ ] No state root at all
- [ ] The state root of the last finalised block
> Why: H_R is the root of the prior state, the parent's posterior (ch. 5).

### Q Why does JAM put the prior state root in the header?
@ Why it is built this way
- [ ] To save 32 bytes
- [x] To pipeline block computation, in particular Merklization
- [ ] Because the posterior root is secret
- [ ] To make light clients slower
> Why: header.tex: "to facilitate the pipelining of block computation and in particular of Merklization".

### Q What does GRANDPA do?
@ What JAM does
- [ ] Picks the next block author
- [x] Finalises blocks, voting only for audited ones
- [ ] Erasure-codes bundles
- [ ] Runs accumulate
> Why: Safrole extends the chain; GRANDPA finalises it, after audits (ch. 19, ch. 17).

### Q How many recent blocks does recent history keep?
@ What JAM does
- [ ] 1
- [x] 8
- [ ] 600
- [ ] 24 hours' worth
> Why: C_recenthistorylen = 8 (ch. 7).

### Q What does the epoch marker in the header announce?
@ What JAM does
- [ ] The winners of the ticket contest
- [x] The keys of the next validator set in line, plus entropy, on the first block of an epoch
- [ ] The offenders found by disputes
- [ ] The block author's index
> Why: The epoch marker carries η₀, η₁ and the (Bandersnatch, Ed25519) keys of the newly pending set.

### Q Which chain does a JAM node build on?
@ Why it is built this way
- [ ] The longest chain by block count
- [x] The one with the most ticket-sealed blocks that contains no disregarded block
- [ ] The one with the most transactions
- [ ] The one the previous author chose
> Why: Best chain (ch. 19): the most ancestor blocks whose author used a slot-sealer ticket rather than a fallback key, among chains with no disregarded block.

## Level 2

### Q A block arrives claiming a slot 3 seconds in the future. What does a node do?
- [ ] Rejects it forever
- [x] Treats it as not yet valid; it may become valid as time passes
- [ ] Accepts it immediately
- [ ] Punishes the author
> Why: H_T × 6 ≤ wall clock; blocks invalid by this rule may become valid later (ch. 5).

### Q The chain moves from epoch 9 to epoch 10. What happens to the validator sets?
- [ ] Nothing until finality
- [x] They shift one step: the old active set becomes previous, the pending set becomes active, staging moves into pending
- [ ] A brand new random set is elected
- [ ] Only the block author changes
> Why: λ' = κ, κ' = γ_P, γ_P' = Φ(ι) at an epoch change (ch. 6).

### Q Why keep the previous epoch's validator set at all?
- [ ] To pay them rewards
- [x] Judgments and guarantees made under the previous set are still verified against it
- [ ] Because the active set is incomplete
- [ ] To seal the next block
> Why: Dispute judgments are checked against κ or λ depending on the epoch they concern (K(a), ch. 10), and a guarantee from the previous rotation across an epoch boundary is checked against λ′ (ch. 11).

### Q Your jamswap fill shows "Finalizing". What is the chain waiting for?
- [ ] More assurances
- [x] Auditing of the block, then GRANDPA votes to finalise it
- [ ] The next epoch
- [ ] The guarantors to re-sign
> Why: Validators vote in GRANDPA only for audited blocks; jamswap's README says it takes about 2 to 4 blocks.

### Q An importer computes a state root after block N. When does it learn whether the network agrees?
- [ ] Immediately, from block N's header
- [x] When block N+1 arrives and its header carries that root as its prior state root
- [ ] Only at finality
- [ ] Never; roots are not compared
> Why: The header commits to the prior state root, so the next header confirms the last result.

### Q What makes Safrole's ticket schedule harder to attack than a public proposer schedule?
- [x] Only each ticket's owner knows which slots are theirs until it seals
- [ ] Tickets are more expensive
- [ ] The schedule changes every slot
- [ ] Nobody seals blocks in ticket mode
> Why: Reasoning from the ring-VRF anonymity: the author is revealed only by the seal. (The GP frames Safrole's goal as fork minimisation.)

## Level 3

### Q Describe how JAM decides who writes each block.
> Hint: tickets, next epoch, fallback.
> Answer: During the first 500 slots of an epoch, validators of the next set submit anonymous ring-VRF tickets in blocks. The best 600 tickets become the sealing order for the next epoch, arranged across its slots. Only a ticket's owner knows its slot until it seals the block. If the contest does not fill, a fallback order is picked from the active validators using the entropy pool, which is public but keeps blocks flowing.

### Q Contrast JAM's header with an Ethereum header.
> Hint: state root, author, signatures.
> Answer: An Ethereum header commits to the state root after the block. JAM's commits to the prior state root, to allow pipelining of Merklization. JAM's header also carries a Safrole seal and a VRF output for entropy, an author index into the active set, markers (epoch, winning tickets, offenders) and a hash committing to the five extrinsics.

### Q Put the whole order journey in six steps, naming where each happens.
> Hint: off-chain, on-chain, safety net.
> Answer: 1) The order goes into a work-package sent to a core. 2) Refine runs on that core, off-chain, by two or three guarantors, producing a work-report. 3) The signed guarantee lands in a block and waits in ρ. 4) Validators assure they hold pieces; over two thirds makes it available. 5) Every node runs accumulate on-chain and the trade settles. 6) Auditors re-run the work; once the block is audited GRANDPA can finalise it.
