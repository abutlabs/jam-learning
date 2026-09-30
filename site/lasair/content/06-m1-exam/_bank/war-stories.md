---
chapter: war-stories
---

## Level 1

### Q What was lasair's F1 bug?
@ Ch. 3 Notation and the codec
- [x] A work-report's core index was read as one byte, but it is a compact natural and core 340 needs two
- [ ] A missing signature check
- [ ] A slow Merkle root
- [ ] A wrong hash function in the header
> Why: Tiny's cores 0 and 1 hid it; L2b (full spec) found it at step 2.

### Q What was F4 about?
@ Ch. 3 Notation and the codec
- [ ] The ring root offset
- [x] The ticket-accumulator length written as one byte, so at full it could never reach 600
- [ ] A disputes vote count
- [ ] A PVM register
> Why: 600 is compact 0x82 0x58. The epoch always fell back to the key sequence.

### Q What found F4?
@ Ch. 3 Notation and the codec
- [ ] The live fuzzer
- [ ] A user report
- [x] The offline L4 safrole adapter on a full-spec vector
- [ ] A PolkaJam differential
> Why: It was found offline, not by the fuzzer.

### Q What is the common lesson of F1, F4 and F7?
@ Ch. 3 Notation and the codec
- [ ] Always use big-endian
- [ ] Never use compact encoding
- [ ] Hash everything twice
- [x] Tiny hides every width bug below 128: a small constant is a codec width waiting to fail
> Why: All three wrote a compact natural as a single octet.

### Q What was wrong with lasair's extrinsic hash in the Header story?
@ Ch. 5 Header
- [x] It hardcoded the disputes component as empty
- [ ] It hashed the seal
- [ ] It used Keccak
- [ ] It skipped the tickets
> Why: The first block with real verdicts failed bad_extrinsic_hash.

### Q What is the lesson of the extrinsic-hash story?
@ Ch. 5 Header
- [ ] Hash functions are slow
- [x] A component you have never seen populated is still hashed
- [ ] Disputes are rare, so ignore them
- [ ] Headers should be larger
> Why: The header commits to all five extrinsics.

### Q What was F3?
@ Ch. 6 Safrole
- [ ] A ticket count bug
- [ ] A wrong entropy rotation
- [x] The ring root γ_z was sliced at a hardcoded offset correct only for tiny
- [ ] A missing seal check
> Why: 2016 = 6 × 336 at tiny; at full it is 343 728.

### Q What caused finding #7, the stale-ticket fork?
@ Ch. 6 Safrole
- [ ] A network partition
- [ ] A bad signature library
- [ ] A clock skew
- [x] Tickets were verified against the entropy and ring root of the best block at gossip time, not of the branch being extended
> Why: η₂ differs per branch under a fork; the fix re-verifies pooled tickets against the authoring parent.

### Q Which function fixed finding #7?
@ Ch. 6 Safrole
- [x] `Authoring.ticket_revalidate`
- [ ] `process_disputes`
- [ ] `classify_verdict`
- [ ] `compute_extrinsic_hash`
> Why: It re-verifies every pooled ticket against the parent's posterior γ_z' and η₂'.

### Q What is the lesson of finding #7?
@ Ch. 6 Safrole
- [ ] Gossip is unreliable
- [x] A proof is only valid in the context it names, and the context is per branch
- [ ] Always use fallback mode
- [ ] Tickets are optional
> Why: Recorded in docs/FINALITY_PLAN.md loops 5 and 7.

### Q What diverged in B1?
@ Ch. 7 Recent history
- [ ] The header seal
- [ ] A storage value
- [x] The accumulation-output set and recent history: same entries, different order
- [ ] The validator set
> Why: Seed 1551410130, step 2854.

### Q What was the cause of B1?
@ Ch. 7 Recent history
- [ ] A wrong hash
- [ ] A missing output
- [ ] A duplicated block
- [x] The (service, hash) output set was sorted by service alone, not the full tuple
> Why: When one service accumulated twice, the two pairs kept insertion order.

### Q What is the lesson of B1?
@ Ch. 7 Recent history
- [x] Every set that reaches the trie has a total order
- [ ] Sets should be avoided
- [ ] Sort by value, not key
- [ ] Use Keccak everywhere
> Why: One canonical encoder should be the only path to state.

### Q What went wrong in B3?
@ Ch. 9 Service accounts
- [ ] A service was created twice
- [x] A read of another service's storage returned NONE
- [ ] A write was lost
- [ ] A transfer was doubled
> Why: The foreign service was loaded with empty storage and read with the raw key, not the interleaved state key.

### Q What was B9?
@ Ch. 9 Service accounts
- [ ] A missing privilege check
- [ ] A double eject
- [x] A new service was given an id that already existed in state
- [ ] A wrong balance
> Why: The "taken" check only looked at the current invocation, not state.

### Q What was B6?
@ Ch. 9 Service accounts
- [ ] A bug found by the fuzzer
- [ ] A disputes bug
- [ ] A PVM bug
- [x] The sibling of B3 (foreign preimages loaded empty), fixed before any fuzzer lane reached it
> Why: A class of bug, once named, enumerates its instances.

### Q What was the disputes "blind spot"?
@ Ch. 10 Disputes
- [x] The disputes STF passed its vectors but was never called on block import
- [ ] Disputes were too slow
- [ ] Disputes had no signatures
- [ ] Disputes vectors failed
> Why: A proven component is not a wired component.

### Q What was F5?
@ Ch. 10 Disputes
- [ ] A wrong hash
- [x] Vote counts and bitfield sizes computed once at load time, frozen at tiny values
- [ ] A bad seal
- [ ] A missing culprit
> Why: A full verdict has 683 votes; the decoder read 5 and ran ~45 KB short.

### Q What is the lesson of F5?
@ Ch. 10 Disputes
- [ ] Always run tiny first
- [ ] Use bigger integers
- [x] Evaluation time is part of the spec: spec-dependent values must be functions
- [ ] Never decode disputes
> Why: The L0 lint now flags module-level bindings that call spec accessors.

### Q What was F6?
@ Ch. 11 Reporting and assurance
- [ ] A late timeout
- [ ] A wrong guarantor
- [ ] A missing assurance signature
- [x] Core popularity read only byte 0 of the assurance bitfield, so cores 8 and above were always zero at full
> Why: A core's bit is byte c/8, bit c mod 8.

### Q What did F8 and F9 get wrong?
@ Ch. 11 Reporting and assurance
- [x] The availability supermajority was hardcoded as 5 (tiny) instead of 683 (full)
- [ ] The rotation period
- [ ] The report size
- [ ] The number of cores
> Why: Reports would have become available with 5 of 1023 assurances.

### Q What does dependency-layered accumulation require when a layer panics?
@ Ch. 12 Accumulation
- [ ] The whole block reverts
- [x] Only that layer reverts
- [ ] Nothing reverts
- [ ] The next block is skipped
> Why: The largest class left after the seed campaign (no_forks step 46, ~22 seeds).

### Q What was B4?
@ Ch. 12 Accumulation
- [ ] A double transfer
- [ ] A missing yield
- [x] `designate` changed ι even though the caller was the manager, not the delegator
- [ ] A wrong service id
> Why: Fix: gate the ι writeback on the round-start delegator.

### Q What was B7?
@ Ch. 12 Accumulation
- [ ] A late fault
- [ ] A wrong gas limit
- [ ] A checkpoint bug
- [x] The same service could be ejected twice, crediting its balance twice
> Why: The second eject re-found the target in the pre-round snapshot.

### Q What was B2?
@ App. A PVM
- [x] A host call checked the service before the key pointer, so a bad pointer returned NONE instead of panicking
- [ ] A division bug
- [ ] A wrong page size
- [ ] A jump-table error
> Why: The order of checks is protocol-visible.

### Q What was B5?
@ App. B Host calls
- [ ] A transfer to a missing service
- [x] A checkpoint that could not pay its gas still took the snapshot, so the revert kept a write
- [ ] A bad fetch selector
- [ ] An unknown host call
> Why: Gas 7, cost 10, result −3.

### Q What did profiling find in "the 137 KB copy"?
@ App. A PVM
- [ ] Signatures were slow
- [ ] Merklization was slow
- [x] Every PVM step copied a 137 KB bitmask in `skip`
- [ ] The network was slow
> Why: Fixing it gave about 30×.

### Q What did the mutation engine find first?
@ App. C and D Codec and trie
- [ ] A missing signature
- [ ] A crash in the PVM
- [ ] A wrong state root
- [x] Trailing bytes after a block were silently accepted
> Why: Fixed with require_consumed.

### Q Which part of state diverged in every banked fuzz-lane report?
@ The corpus lesson
- [x] The accumulate service-execution output
- [ ] Safrole state
- [ ] Disputes
- [ ] The validator sets
> Why: Existence (B2), ordering (B1) and value (B3).

### Q What are the four beats of telling a war story?
@ How to tell one in 60 seconds
- [ ] Setup, conflict, climax, resolution
- [x] What diverged, which rule, how I found it, what I learned
- [ ] Who, what, when, where
- [ ] Symptom, blame, fix, test
> Why: The format on the war-stories page.

## Level 2

### Q Which lasair story best illustrates Recent History?
- [ ] B7
- [ ] F5
- [x] B1
- [ ] F3
> Why: B1 corrupted θ and cascaded into β's belt.

### Q Which two stories belong under Disputes?
- [ ] B1 and B3
- [ ] B5 and B2
- [ ] F4 and finding #7
- [x] The block-import blind spot and F5 (vote counts frozen at tiny)
> Why: Both are filed under ch. 10.

### Q Why did the F-series bugs survive tiny testing?
- [x] At tiny the values are small (under 128, or 6 validators), so a fixed byte or a literal happens to match
- [ ] Tiny tests were skipped
- [ ] Tiny vectors were wrong
- [ ] The fuzzer only ran tiny
> Why: tiny hides width and constant bugs.

### Q B4 and B8 were fixed at the writeback, not inside the host call. Why?
- [ ] It is faster
- [x] Faking a failure in the host call changed gas and broke a different key; the privilege rule applies to what is written back
- [ ] The reference does not have host calls
- [ ] Host calls cannot fail
> Why: A first B4 attempt shifted gas; the gate caught it.

### Q Finding #7 involved two different moments of ticket verification. Which two?
- [ ] Authoring and finality
- [ ] Refine and accumulate
- [x] Gossip time (pool) and import time
- [ ] Epoch start and epoch end
> Why: They used different η₂ and γ_z contexts.

### Q What was the order of the seed campaign's failure count?
- [ ] 38 then 210
- [ ] 205 then 0
- [ ] 0 throughout
- [x] 210 failures after all STFs were green, then 38 after a block-validation campaign
> Why: Passing every STF is necessary, not sufficient.

### Q How was the disputes component audited before it was wired into block import?
- [x] By decoding all 60 disputes vectors into a truth table
- [ ] By running the live fuzzer only
- [ ] It did not verify them
- [ ] By reading typeberry's source
> Why: That audit found the verdict-tally and judgment-age errors.

### Q What is the honest framing sentence for telling a war story?
- [ ] "I wrote the fix myself."
- [x] "The AI wrote the fix; I ran the differential, read the trace, and had to understand the rule to judge whether the fix was right."
- [ ] "We copied the reference."
- [ ] "The fuzzer found it, so it does not count."
> Why: AI use was disclosed in writing; this is both true and sufficient.

### Q B2 and B5 have a shared lesson. What is it?
- [ ] Host calls should be removed
- [ ] Panic is never correct
- [x] A host call's order of checks and its failure path are protocol-visible: validate memory first, and a call that cannot pay has no effect
- [ ] Always use more gas
> Why: Both diverged on panic versus commit.

### Q Which war story is about evaluation time rather than values?
- [ ] B9
- [ ] F6
- [ ] B1
- [x] F5
> Why: Constants computed at module load froze at the tiny spec.

## Level 3

### Q Tell the B1 story in four beats.
> Hint: What diverged, which rule, how found, what learned.
> Answer: The accumulation-output set and recent history diverged: same entries, different order. θ is a Graypaper set of (service, hash) pairs and must be totally ordered by the full tuple; lasair sorted by service alone. Found by a live fuzzer seed at step 2854 by decoding expected against got. Lesson: every set reaching the trie has a total order, so one canonical encoder must be the only path to state.

### Q Tell the disputes blind-spot story in four beats.
> Hint: Proven versus wired.
> Answer: A disputes-carrying block failed extrinsic-hash checks because disputes were hardcoded empty, and behind that the disputes STF was never called on import. The rules are the header's extrinsic hash and ch. 10's ψ' and ρ†. Found by a full-spec fuzzer seed carrying the corpus's first real verdicts. Lesson: a proven component is not a wired one.

### Q Tell finding #7 in four beats.
> Hint: Two verification contexts.
> Answer: lasair rejected PolkaJam's ticket-sealed blocks, then its own, with bad_ticket_proof. Ticket proofs are made against η₂ and the ring root of the branch; lasair checked pooled tickets against the gossip-time best block, not the authoring parent. Found live on the mixed network by log forensics. Lesson: a proof is only valid in its named context, and that context is per branch.

### Q Tell the F4 story in four beats.
> Hint: 600 tickets.
> Answer: At full spec the epoch always fell back to fallback sealing. The ticket accumulator's length is a compact natural, and lasair wrote one byte, so it could never hold 600. Found offline by the L4 safrole adapter on a full vector. Lesson: tiny hides width bugs; small constants are codec widths waiting to fail.

### Q Tell B5 in four beats.
> Hint: Gas 7, cost 10.
> Answer: A service's storage write survived an out-of-gas revert. On out-of-gas, accumulation reverts to the last checkpoint; lasair took the snapshot before failing the gas check, so the write became the rollback point. Found by a fuzzer seed at step 6306. Lesson: a host call that cannot pay must have no effect.

### Q What does the corpus lesson tell you about where JAM implementations go wrong?
> Hint: Which state diverged across all three reports.
> Answer: Across all banked fuzz reports, only the accumulate service-execution output diverged: whether a service yields, in what order outputs serialize, and what bytes it writes. The big STF rules held; the risk is in host-call semantics during accumulation.
