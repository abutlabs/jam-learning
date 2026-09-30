---
chapter: f08-audits-and-disputes
---

## Level 1

### Q What is the Ethereum idea closest to JAM auditing?
@ What you already know
- [ ] Gas estimation
- [x] Fraud proofs for optimistic rollups
- [ ] ENS name resolution
- [ ] EIP-1559 fee burning
> Why: Both catch a wrong off-chain result. JAM's audits are mandatory and proactive, within seconds, instead of an optional challenge window of days.

### Q Which scheme does the Gray Paper say its auditing is theoretically equivalent to?
@ What JAM does
- [ ] Casper FFG
- [ ] Tendermint
- [x] ELVES
- [ ] Nakamoto consensus
> Why: auditing.tex opens: the system is theoretically equivalent to that in ELVES.

### Q How does a validator choose which reports to audit first?
@ What JAM does
- [ ] The block author assigns them
- [ ] It audits every report
- [x] With its own VRF, selecting 10 cores from the block's newly available reports
- [ ] By lowest core index
> Why: Tranche 0 is a verifiably random selection of ten cores (auditing.tex).

### Q What does an auditor publish before auditing?
@ What JAM does
- [x] An announcement of what it will audit, with its VRF evidence
- [ ] A new work-package
- [ ] A ticket
- [ ] An assurance
> Why: Validators declare and prove their requirement first, so others can check the selection.

### Q On average, how many audits does each work-report get at full scale?
@ What JAM does
- [ ] 3
- [ ] 10
- [x] About 30
- [ ] 683
> Why: Discussion: a mean of ten audits per validator per timeslot, and thus 30 audits per work-report.

### Q How often does a new audit tranche begin?
@ What JAM does
- [ ] Every block
- [x] Every 8 seconds
- [ ] Every epoch
- [ ] Every 6 seconds
> Why: C_trancheseconds = 8 (auditing.tex).

### Q What is a no-show?
@ The words and symbols
- [ ] A block with no extrinsic
- [x] An announced auditor that has not delivered a judgment
- [ ] A validator that skipped its sealing slot
- [ ] A report nobody assured
> Why: Later tranches recruit more auditors for reports whose announced auditors have not returned judgments.

### Q What triggers extra auditors in a later tranche?
@ What JAM does
- [ ] A new epoch
- [x] No-shows, or a negative judgment
- [ ] A full block
- [ ] A slow network
> Why: New tranches may add reports because a negative judgment was received or judgments fall short of announcements.

### Q What must be true before a validator votes to finalise a block in GRANDPA?
@ What JAM does
- [ ] The block must be one epoch old
- [x] The validator must see the block as audited
- [ ] Every validator must have assured it
- [ ] The block must have no guarantees
> Why: "For any block we must judge it to be audited before we vote for the block to be finalized in Grandpa."

### Q If more than one third of validators judge a report invalid, what happens to the block that carries it?
@ What JAM does
- [ ] It is finalised with a warning
- [x] It is ban-listed: it and its descendants are disregarded
- [ ] Only the report is removed
- [ ] Nothing until the next epoch
> Why: auditing.tex: the block which includes the report is ban-listed; it and all its descendants are disregarded.

### Q How many judgments does a verdict carry?
@ What JAM does
- [ ] Any number
- [ ] All validators
- [x] Exactly two-thirds-plus-one of the validator set
- [ ] Exactly one third
> Why: |judgments| = ⌊2|k|/3⌋ + 1 (ch. 10).

### Q A verdict where no judgment is positive is called...
@ What JAM does
- [ ] Good
- [x] Bad
- [ ] Wonky
- [ ] Void
> Why: Zero positive judgments means bad; all positive means good; exactly one third positive means wonky.

### Q Who is a culprit?
@ What JAM does
- [x] A guarantor who signed a report judged bad
- [ ] An auditor who failed to show up
- [ ] A validator who voted against the verdict
- [ ] A block author who included the verdict
> Why: Culprits are guarantors of a bad report, proven by their own guarantee signature.

### Q Who is a fault?
@ What JAM does
- [ ] A guarantor of a bad report
- [ ] A no-show auditor
- [x] A validator whose signed judgment went against the verdict
- [ ] A validator who missed an assurance
> Why: Faults are judges on the losing side (valid on a bad report, or invalid on a good one).

### Q Which symbol is the chain's disputes record?
@ The words and symbols
- [ ] ρ
- [ ] ξ
- [x] ψ
- [ ] γ
> Why: ψ holds the good, bad and wonky report hashes and the offender keys.

### Q Which extrinsic carries verdicts, culprits and faults?
@ The words and symbols
- [ ] E_A
- [x] E_D
- [ ] E_G
- [ ] E_P
> Why: E_D is the disputes extrinsic.

### Q What does ρ† represent?
@ The words and symbols
- [ ] The next epoch's validator set
- [x] The per-core pending reports after bad or wonky ones are removed
- [ ] The ready queue after accumulation
- [ ] The entropy after rotation
> Why: ρ† clears every core whose pending report was judged bad or wonky (eq. removenonpositive).

### Q Why does JAM audit instead of requiring zero-knowledge proofs?
@ Why it is built this way
- [ ] ZK proofs are not secure
- [x] The Gray Paper estimates proving costs orders of magnitude more than simply re-running
- [ ] Auditing needs no validators
- [ ] ZK proofs cannot run on RISC-V
> Why: Previous Work compares SNARK proving cost with recompiling and executing: tens of thousands of times more time, millions of times more cost.

## Level 2

### Q An announced auditor for report X never delivers a judgment. What happens next?
- [ ] X is declared bad
- [x] In the next tranche more validators select themselves to audit X
- [ ] X is finalised without it
- [ ] The auditor is added to ψ as a culprit
> Why: No-shows raise the number of required auditors (bias factor 2 per no-show on average).

### Q Guarantors signed a batch where you receive 10 DOT for 1 USDC. The block settling it is authored. What stops this from becoming permanent?
- [ ] Nothing; accumulated means final
- [ ] The assurers refuse to hold pieces
- [x] Auditors re-run refine, judge it invalid, the block is ban-listed and never finalised
- [ ] The service rejects it in accumulate
> Why: Finalisation waits for audits; over 1/3 negative judgments ban-list the block and its descendants.

### Q A verdict arrives while the bad report is still waiting in its core's slot, not yet available. What happens?
- [x] The core is cleared (ρ†), so the report never becomes available or accumulated
- [ ] The report is accumulated then reverted
- [ ] The verdict is invalid
- [ ] The report moves to the ready queue
> Why: Bad or wonky verdicts clear the pending assignment before assurances are counted.

### Q At full scale a verdict has 683 judgments and 341 are positive. Which verdict is it?
- [ ] Good
- [ ] Bad
- [x] Wonky
- [ ] Invalid count
> Why: ⌊1023/3⌋ = 341 positive is the wonky threshold.

### Q Why does no-show escalation make silencing auditors a bad strategy for an attacker?
- [ ] No-shows are slashed immediately
- [x] Each missing judgment recruits more auditors, so scrutiny grows
- [ ] The report is auto-rejected after one no-show
- [ ] Auditors cannot be silenced
> Why: Reasoning from the mechanism: later tranches enlarge the auditor set in proportion to no-shows.

### Q What happens to offenders' keys over time?
- [ ] They are deleted from ψ after an epoch
- [x] They stay in ψ and are replaced by null keys when they would rotate into the validator set
- [ ] They become guarantors automatically
- [ ] Nothing
> Why: Φ nulls offender keys as the staging set becomes pending; ψ keeps the offender set.

## Level 3

### Q Explain JAM auditing to an Ethereum developer in under a minute.
> Hint: optimistic rollups, but mandatory and fast.
> Answer: Only two or three guarantors run each piece of work, so JAM checks them. After a report becomes available, each validator uses a VRF to secretly and verifiably pick 10 cores' reports, announces it, rebuilds the data and re-runs refine, then publishes a judgment. About 30 auditors check each report; missing auditors trigger more every 8 seconds. Validators only vote to finalise audited blocks. It is like fraud proofs, but mandatory and done within seconds.

### Q What happens, step by step, if a guarantor lies?
> Hint: judgments, ban-list, verdict, punishment.
> Answer: Auditors re-run the work and publish invalid judgments. If over a third are invalid, the block carrying the report is ban-listed and honest validators build on a chain without it, so it is never finalised. A block author then includes a verdict with two-thirds-plus-one judgments in E_D, plus culprits (the lying guarantors' own signatures) and faults. Their keys enter ψ, the header's offenders marker lists them, and they are nulled out of future validator sets. If the report was still pending, its core is cleared.

### Q Why is auditing enough, rather than having every validator re-run everything?
> Hint: random, verifiable, unpredictable.
> Answer: Re-running everything is exactly the "everyone does everything" limit JAM avoids. Random selection by VRF means a guarantor cannot know or bribe its auditors in advance, and each auditor proves its selection, so about 30 independent checks per report, with escalation on no-shows, give high confidence at a fraction of the cost. (The selection mechanism is GP text; the bribery argument is reasoning.)
