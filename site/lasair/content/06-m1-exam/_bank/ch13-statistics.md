---
chapter: ch13-statistics
---

## Level 1

### Q Which state component holds activity statistics?
@ State touched
- [ ] ψ
- [x] π
- [ ] θ
- [ ] ξ
> Why: GP §13: π ≡ (π_V, π_L, π_C, π_S).

### Q How many parts make up π?
@ State touched
- [ ] Two
- [ ] Three
- [x] Four: current-epoch validator stats, last-epoch validator stats, core stats, service stats
- [ ] Six
> Why: GP §13: "π, which is thus a tuple of four elements".

### Q What is π_V?
@ State touched
- [x] The accumulator of validator statistics for the present epoch
- [ ] Validator statistics from last epoch
- [ ] Core statistics
- [ ] Service statistics
> Why: GP §13: one record serves "as an accumulator for the present epoch" (π_V) and one holds completed statistics (π_L).

### Q What is π_L?
@ State touched
- [ ] The current epoch's validator statistics
- [x] The completed validator statistics of the previous epoch
- [ ] Per-core load
- [ ] The list of offenders
> Why: GP §13: "we retain one record of completed statistics (π_L)".

### Q Does the JAM chain pay validator rewards itself?
@ The transition in plain English
- [ ] Yes, per block
- [x] No: it records activity so a staking subsystem can act on it
- [ ] Yes, per epoch
- [ ] Only for guarantors
> Why: GP §13: "The JAM chain does not explicitly issue rewards", leaving it to the staking subsystem.

### Q How many counters does each validator record hold?
@ State touched
- [ ] Three
- [ ] Four
- [x] Six
- [ ] Eight
> Why: GP §13: blocks, tickets, preimage count, preimage size, guarantees, assurances.

### Q What does the "blocks" counter count?
@ State touched
- [x] Blocks produced by the validator
- [ ] Blocks the validator imported
- [ ] Blocks finalized with the validator's vote
- [ ] Blocks in the epoch
> Why: GP §13: "The number of blocks produced by the validator."

### Q What does the "tickets" counter count?
@ State touched
- [ ] Tickets the validator submitted as a ring proof
- [x] Tickets introduced by the validator, i.e. included in blocks it authored
- [ ] Tickets that won a slot
- [ ] Tickets verified by the validator
> Why: GP §13: the author gets +|E_T| for its block.

### Q What does the "preimage size" counter count?
@ State touched
- [ ] Number of preimages
- [x] Total octets across all preimages the validator introduced
- [ ] Largest preimage seen
- [ ] Bytes of storage used
> Why: GP §13 lists preimage count and preimage size separately; size is the total octets.

### Q What does the "guarantees" counter count?
@ State touched
- [ ] Reports the validator audited
- [x] Reports guaranteed by the validator
- [ ] Guarantees included by the author
- [ ] Assurances received
> Why: GP §13: guarantees count reports the validator guaranteed; updated for each validator in the reporters set.

### Q What does the "assurances" counter count?
@ State touched
- [ ] Reports that became available
- [x] Availability assurances made by the validator
- [ ] Assurances included in blocks it authored
- [ ] Assurance timeouts
> Why: GP §13: "The number of availability assurances made by the validator."

### Q Which validator activity cannot be tracked on-chain directly?
@ The transition in plain English
- [ ] Block production
- [ ] Guarantees
- [x] Grandpa, Beefy and auditing activity
- [ ] Assurances
> Why: GP §13: block production, reports and assurances are trackable on-chain; Grandpa, Beefy and auditing "cannot".

### Q How many entries does π_V have?
@ State touched
- [ ] Always 1 023
- [x] One per validator in κ: |π_V| = |κ|
- [ ] One per core
- [ ] One per service
> Why: GP 0.8.0 §13: |π_V| = |κ|, |π_L| = |λ|.

### Q How often are core and service statistics reset?
@ The transition in plain English
- [ ] Every epoch
- [x] Every block: they are per-block statistics
- [ ] Never
- [ ] Every rotation period
> Why: GP §13.2: core and service statistics "are tracked only on a per-block basis unlike the validator statistics".

### Q What happens to π_V and π_L at an epoch boundary?
@ The transition in plain English
- [ ] Both reset to zero
- [x] π_L takes the finished π_V, and π_V restarts at zero
- [ ] π_V is added into π_L
- [ ] Nothing changes
> Why: GP §13: when e' ≠ e, (π_V‡, π_L') = (zeros, π_V†).

### Q How many fields does each core statistics record have?
@ State touched
- [ ] Four
- [ ] Six
- [x] Eight
- [ ] Ten
> Why: GP §13.2: DA load, popularity, imports, extrinsic count, extrinsic size, exports, bundle length, gas used.

### Q What is a core's "popularity"?
@ State touched
- [ ] How many services use the core
- [x] The number of assurances in this block that marked the core's data available
- [ ] How many guarantors are assigned to it
- [ ] Its accumulated gas
> Why: GP §13.2: popularity = Σ_{a ∈ E_A} a.availabilities[c].

### Q Which reports feed a core's imports, exports, extrinsic and gas counters?
@ Inputs
- [x] The incoming reports I, guaranteed in this block
- [ ] The reports that became available
- [ ] The ready queue
- [ ] All reports in recent history
> Why: GP §13.2: R(c) sums over digests of reports in I with that core.

### Q Which reports feed a core's DA load D(c)?
@ Inputs
- [ ] Incoming reports
- [x] Reports that just became available (W)
- [ ] Reports in the wonky set
- [ ] Reports accumulated this block
> Why: GP §13.2: D(c) sums over reports in W, the newly available ones.

### Q What does a core's bundle length L(c) sum?
@ The transition in plain English
- [ ] Segment counts
- [x] The bundle lengths of incoming reports on that core
- [ ] Gas used by refine
- [ ] Extrinsic sizes only
> Why: GP §13.2: L(c) = Σ bundle length over incoming reports with that core.

### Q What is the segment size used in D(c)?
@ The transition in plain English
- [ ] 684 bytes
- [ ] 4 096 bytes
- [x] 4 104 bytes
- [ ] 4 488 bytes
> Why: Definitions: W_G (segment size) = 4 104, used in D(c) = bundle length + 4104·⌈segments·65/64⌉.

### Q Which services get a service statistics entry this block?
@ The transition in plain English
- [ ] All services in δ
- [x] Those reported in incoming digests, provided a preimage, or accumulated
- [ ] Only always-accumulate services
- [ ] Only services that paid fees
> Why: GP §13.2: s = s^R ∪ s^P ∪ keys(accumulation stats).

### Q What does a service's "refinement" statistic pair hold?
@ State touched
- [ ] Imports and exports
- [x] The number of its work-digests in incoming reports and their total refine gas
- [ ] Preimage count and size
- [ ] Accumulate count and gas
> Why: GP §13.2: refinement = (R(s)_n, R(s)_gas).

### Q What does a service's "provision" statistic pair hold?
@ State touched
- [x] A count and total size of preimages provided
- [ ] Balance and threshold
- [ ] Storage items and octets
- [ ] Refine and accumulate gas
> Why: GP §13.2: provision sums (1, |data|) over entries of E_P. As printed, that sum is not filtered by service s, which looks like an oversight in the text; the intended meaning is the count and size of preimages provided for the service.

### Q What three fields does a service's accumulation statistic hold in 0.8.0?
@ 0.7.2 → 0.8.0
- [ ] Count, gas, balance
- [x] Count, transfer count, gas
- [ ] Items, octets, gas
- [ ] Imports, exports, gas
> Why: 0.8.0 accumulation statistic is (ℕ, ℕ, gas), gaining a transfer count (GP #502); default (0, 0, 0).

### Q Who gets the +1 in the "blocks" counter?
@ Validation rules and what they guard
- [ ] Every validator who assured
- [x] The block's author, H_I
- [ ] The guarantors
- [ ] The validator with the lowest ticket
> Why: GP §13: blocks += (v = H_I).

### Q What lasair bug is the F6 war story about?
@ War story
- [ ] Guarantee counts were doubled
- [x] Core popularity read only byte 0 of each assurance bitfield, zeroing cores 8 and up at full spec
- [ ] π_L never rotated
- [ ] Preimage sizes were in bits
> Why: F6 (`docs/TINY_TO_FULL_AUDIT.md`, `docs/LOCAL_L2B_FUZZER.md`): invisible at tiny with 2 cores.

### Q What honest-validator assumption does the GP make for oraclizing untrackable activity?
@ The transition in plain English
- [ ] Two-thirds honest
- [x] 50% honest, taking the median of validators' votes on each other
- [ ] One-third honest
- [ ] All honest
> Why: GP §13: validators vote on each other's efforts and "With an assumption of 50% honest validators, this gives an adequate means".

### Q What does a core's "gas used" statistic sum?
@ State touched
- [ ] Accumulate gas for the core's services
- [x] The refine gas used by work-digests in incoming reports on that core
- [ ] The block's total gas
- [ ] Is-authorized gas only
> Why: GP §13.2: gas used comes from R(c), summing digests of incoming reports with that core.

### Q Are validator statistics per block or per epoch?
@ The transition in plain English
- [ ] Per block
- [x] Per epoch, accumulated block by block
- [ ] Per rotation period
- [ ] Per core
> Why: GP §13: "The validator statistics are made on a per-epoch basis".

### Q Which validators get their "assurances" counter increased in a block?
@ Validation rules and what they guard
- [ ] Only the author
- [x] Every validator whose assurance is in E_A
- [ ] Every validator in κ
- [ ] Only guarantors of available reports
> Why: GP §13: assurances += (∃ a ∈ E_A : a.assurer = v).

## Level 2

### Q An epoch boundary block contains assurances. Are those assurances credited to the old or the new epoch's record?
- [x] The old one: assurances are added in π_V† before the rotation
- [ ] The new one
- [ ] Neither
- [ ] Both
> Why: 0.8.0: π_V† adds assurances over ℕ_{|κ|}, then rotation moves π_V† into π_L'.

### Q An epoch boundary block's author: which record gets its "blocks" +1?
- [ ] π_L, the finished epoch
- [x] π_V', the new epoch's fresh record
- [ ] Both
- [ ] Neither, boundary blocks are not counted
> Why: blocks, tickets, preimages and guarantees are added to π_V‡ after rotation, over ℕ_{|κ'|}.

### Q A block contains 3 tickets and 2 preimages of 100 and 50 bytes. How do the author's counters change?
- [ ] tickets +1, preimages +1, size +150
- [x] tickets +3, preimage count +2, preimage size +150
- [ ] tickets +3, preimage count +150
- [ ] Only blocks +1
> Why: the author gets +|E_T|, +|E_P| and +Σ|d| (GP §13).

### Q Three validators guaranteed one report in this block. Whose guarantees counter increases?
- [ ] Only the block author
- [x] Each of the three guarantors (those in the reporters set)
- [ ] Only the first signer
- [ ] None, until the report is available
> Why: guarantees += (κ'_v ∈ reporters) (GP §13).

### Q At full spec, cores 0 to 340 exist. A block's assurances all mark core 300 available. Using GP rules, what is core 300's popularity?
- [ ] 0
- [ ] 1
- [x] The number of assurances in the block
- [ ] 300
> Why: popularity sums the bitfield bit for that core across all assurances. lasair's F6 bug would have reported 0 for this core.

### Q Why did F6 pass every tiny test?
- [ ] Tiny had no assurances
- [x] Tiny has 2 cores, so every core's bit lives in byte 0 of the bitfield
- [ ] Tiny vectors skipped statistics
- [ ] The bug was only in the codec
> Why: reading only the first byte covers cores 0 to 7; tiny has only cores 0 and 1.

### Q A report was guaranteed in this block and another became available. Which one contributes to the core's DA load D(c)?
- [ ] The guaranteed one
- [x] The one that became available
- [ ] Both
- [ ] Neither
> Why: D(c) sums over W (just became available); L(c) and R(c) use incoming reports.

### Q A report has bundle length 10 000 and 64 exported segments. What does it add to its core's DA load?
- [ ] 10 000
- [x] 10 000 + 4104·65 = 276 760
- [ ] 10 000 + 4104·64
- [ ] 4104·65
> Why: D adds bundle length + W_G·⌈64·65/64⌉ = 10 000 + 4104·65.

### Q A service did not appear in any report, preimage or accumulation this block. What is its service statistics entry?
- [ ] Unchanged from last block
- [x] It has no entry: only active services appear
- [ ] All zeros
- [ ] Copied from π_L
> Why: π_S' is defined for s ∈ s only; service stats are per-block.

### Q A service accumulated but received no reports this block. What is its refinement statistic?
- [x] (0, 0): the sums over no digests
- [ ] Carried from last block
- [ ] Undefined
- [ ] Its accumulation gas
> Why: R(s) sums over incoming digests for s; an empty sum is zero.

### Q A reported service did not accumulate this block. What is its accumulation statistic?
- [ ] Undefined
- [x] (0, 0, 0)
- [ ] Carried from last block
- [ ] Its refine gas
> Why: GP §13.2: ∅(S[s], (0, 0, 0)) defaults to zeros.

### Q Validator set sizes are resizable in 0.8.0. What is |π_L| after a rotation that grew the set?
- [ ] |κ'|
- [x] |λ'|, the size of the previous set
- [ ] 1 023
- [ ] |ι|
> Why: 0.8.0: |π_L| = |λ|. π_L' = π_V†, sized for the old κ, which is now λ'.

### Q What is the difference between a validator's "tickets" counter and a ticket winning a slot?
- [x] The counter credits the block author for including tickets; it says nothing about whose tickets won
- [ ] They are the same thing
- [ ] The counter counts only winning tickets
- [ ] The counter is per core
> Why: tickets += |E_T| for v = H_I; ticket authors are anonymous by design.

### Q Why is the validator record indexed by position in κ and not by key?
- [ ] Keys are secret
- [x] Statistics are per epoch and aligned with the epoch's active set sequence (derivation, not GP text)
- [ ] Keys are too long
- [ ] Indices never change
> Why: the GP defines the counters over ℕ_{|κ|} and ℕ_{|κ'|}; the alignment with the set's sequence is how it is written.

### Q What are the 0.8.0 changes to the statistics chapter?
- [x] Unsized validator records (|π_V| = |κ|), assurances credited before rotation, accumulation stat gains a transfer count
- [ ] Rewards were added
- [ ] Core stats became per-epoch
- [ ] Auditing is now tracked
> Why: sheet's delta box, from `git diff v0.7.2 v0.8.0 -- text/statistics.tex` and GP #502/#514/#527.

## Level 3

### Q Why does JAM track statistics if it pays no rewards?
> Hint: who acts on the data?
> Answer: The chain facilitates information on validator activity reaching the staking subsystem, which decides rewards. It records what is objectively visible on-chain: blocks, tickets, preimages, guarantees and assurances, per validator per epoch.

### Q Explain the π_V† → π_V‡ → π_V' structure.
> Hint: which counters are credited before the epoch rotation?
> Answer: π_V† adds this block's assurances over the current κ. π_V‡ then rotates at an epoch boundary: π_L' takes π_V† and π_V‡ starts at zero. π_V' adds blocks, tickets, preimages and guarantees over κ'. So a boundary block's assurances close out the old epoch while its authoring counts for the new one.

### Q What do core statistics measure, and over which reports?
> Hint: two different report sets.
> Answer: Per block, from incoming (just-guaranteed) reports: imports, extrinsic count and size, exports, gas used and bundle length. From newly available reports: the DA load, bundle length plus segment storage. Popularity is the number of assurances marking the core available.

### Q Which services get statistics this block and what does each hold?
> Hint: three ways a service becomes active.
> Answer: Services reported in incoming digests, providing preimages, or accumulating. Each gets imports, extrinsic count and size, exports, refinement (count, gas), provision (count, size), and accumulation (count, transfer count, gas), defaulting to zeros where absent.

### Q Tell the F6 story in 60 seconds.
> Hint: one byte of a bitfield.
> Answer: Core popularity sums each assurance's bit for the core. lasair's writer read only the first byte of each bitfield, so cores 0 to 7 counted and 8 to 340 were zero. At tiny with 2 cores it was invisible; the first full-spec fuzzer session exposed it and v1.4.2 fixed it. The audit then hunted every width that was a tiny value instead of a function of the spec.

### Q Why can't auditing activity be tracked like block production?
> Hint: where does auditing happen?
> Answer: Auditing, Grandpa and Beefy happen off-chain, so there is no on-chain evidence of them. The GP suggests validators vote on each other's effort and a median is taken, assuming 50% honest validators.

### Q What changed in statistics between 0.7.2 and 0.8.0?
> Hint: sizes, ordering, and one new field.
> Answer: Validator records became unsized, sized to κ and λ. Assurances are now credited before the epoch rotation and the other counters after. Service accumulation statistics gained a transfer count, making the triple (count, transfers, gas).

### Q Why is D(c) computed from newly available reports rather than incoming ones?
> Hint: when does the data actually have to be stored?
> Answer: DA load reflects data validators must now keep available: the bundle and the exported segments of reports that have just become available. Incoming reports are only guaranteed so far; their availability is not yet assured. (The GP defines D(c) over newly available reports; this motivation is a derivation, not GP text.)

### Q What is the difference between π_V and π_L, and when does each change?
> Hint: accumulator versus archive.
> Answer: π_V accumulates the current epoch's per-validator counters every block. π_L holds the previous epoch's finished record and only changes at an epoch boundary, when it takes the final π_V.

### Q Why are core and service statistics per block while validator statistics are per epoch?
> Hint: what they are used for.
> Answer: The GP defines validator statistics per epoch because rewards are assessed per validator over an epoch. Core and service statistics describe what happened in this block's workload and are simply recomputed each block. The GP states the difference but gives no further reason (derivation for the "why").
