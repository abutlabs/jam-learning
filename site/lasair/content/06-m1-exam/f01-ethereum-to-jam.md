---
title: "F1 · The Ethereum → JAM dictionary"
duration: 12 min
exam_portion: foundation
gp_chapter: F
---

# F1 · The Ethereum → JAM dictionary

<span class="lecture-badge">M1 Understanding · Foundations</span>

You already know a blockchain well. This page maps what you know onto JAM's words, so
the Gray Paper stops sounding foreign. Read the last column carefully: an analogy that
is 80% right is useful, but the other 20% is where the protocol lives.

## How to read this dictionary

Each row has four parts. The Ethereum idea you know. The JAM idea that plays the same
role. The name or symbol the Gray Paper uses, so you recognise it later. And where the
analogy breaks, which is usually the interesting part.

<div class="eth-says">Rule of thumb: Ethereum does everything in one place. JAM splits almost everything into an expensive part done by a few (in-core) and a cheap part done by all (on-chain).</div>

## State and accounts

| Ethereum | JAM | Gray Paper | Where the analogy breaks |
|---|---|---|---|
| World state | The state | σ (sigma), ch. 4 | Ethereum's state is almost all accounts. JAM's σ has 17 parts: accounts plus validator sets, per-core queues, history, disputes and statistics |
| Contract account | Service account | δ (delta), ch. 9 | A service's code has two entry points, refine and accumulate, not one |
| Externally owned account (EOA) with a nonce | Nothing | none | JAM has no transactor. Every account is a service, controlled by its code, so there are no nonces |
| Contract storage | Service storage, plus preimages | δ entries, ch. 9 | Services also hold preimages: data looked up by its hash. Service code itself is stored this way, as a preimage of the code hash |
| Deploying a contract | Creating a service | the `new` host call, App. B | Only a running service can create another, from its accumulate code. There is no deploy transaction |

## Transactions and execution

| Ethereum | JAM | Gray Paper | Where the analogy breaks |
|---|---|---|---|
| A transaction | A work-item inside a work-package | ch. 14 | A work-package bundles up to 16 work-items, each naming a service and carrying a payload |
| The mempool | Work-packages sent to a core's validators | ch. 14, 15 | Packages go to the 3 validators serving one core, not to the whole network |
| Who pays: the signer, in ETH, per transaction | Coretime, bought in advance and assigned to an authorizer | ch. 8 | Payment is separated from the work. An *authorizer* (a small piece of code) decides which packages may use a core |
| Gas | Gas still exists, plus coretime | ch. 4 | Gas still meters the virtual machine. But the resource you buy is coretime, not gas at the point of use. Metering differs too: the EVM prices each opcode, while the PVM charges a whole basic block's gas before running it, costed in virtual CPU cycles by a simplified model of a CPU (App. A, sec:gascostmodel, eq:gascostforblock) |
| EVM | PVM, the Polkadot Virtual Machine | App. A | PVM is RISC-V (RV64EM): 13 registers of 64 bits and paged memory, not a 256-bit stack machine. It is designed to be recompiled to native code |
| Executing a contract call | Refine (in-core) then accumulate (on-chain) | Ψ_R, Ψ_A, App. B | One job becomes two runs: a heavy, stateless refine by a few validators, then a light, stateful accumulate by every node |
| Synchronous calls between contracts | Deferred transfers between services | ch. 12 | No synchronous cross-service calls. A service sends a transfer with a memo; the receiver sees it when it next accumulates |

## Data and security

| Ethereum | JAM | Gray Paper | Where the analogy breaks |
|---|---|---|---|
| Rollup sequencer and executor | The 3 validators serving a core (guarantors) | ch. 11, 15 | They are the chain's own validators, rotated between cores, not an outside operator |
| Rollup batch commitment posted to L1 | A work-report inside a guarantee | ch. 11, 14 | The report carries 2 or 3 validator signatures, and those validators are accountable if it is wrong |
| Data availability layer (blobs, DAS) | Erasure-coded pieces held by every validator, plus assurances | ch. 11, 16, Erasure Coding appendix | Availability is decided on-chain: a report becomes *available* when more than 2/3 of validators say they hold their piece |
| Fraud proofs with a challenge window | Auditing, then disputes | ch. 17, ch. 10 | Audits are proactive and random, in 8-second rounds. Finality waits for them, so there is no week-long window |
| Slashing | Offenders recorded by disputes | ψ (psi), ch. 10 | The Gray Paper records who misbehaved; the staking and slashing system itself is out of its scope. On-chain, the key-nullifier Φ (eq:blacklistfilter) replaces an offender's whole key with zeros: when the staged keys ι move into γ_P at an epoch change, and in the guarantor assignments |

## Validators, time and consensus

| Ethereum | JAM | Gray Paper | Where the analogy breaks |
|---|---|---|---|
| The validator set | Active set, previous set, staging set | κ, λ, ι (kappa, lambda, iota), ch. 6 | JAM keeps three as top-level parts of σ: this epoch's, last epoch's (still used to verify judgments and guarantees made under the previous set), and the next ones queued up. A fourth, the pending set γ_P inside Safrole's state γ, holds next epoch's keys: at each epoch change it becomes Φ(ι), the staged keys with offenders zeroed (sec:keyrotation). A set's size is not fixed: any multiple of 3 from 6 to 3C = 1023 (eq:valcount). Only the first \|κ'\|/3 of the 341 cores are active, 3 validators each |
| 12-second slot, 32-slot epoch | 6-second slot, 600-slot epoch (one hour) | τ (tau), E, ch. 4 | Slots count from the "JAM Common Era", midday UTC on 1 January 2025 |
| Proposer selection by RANDAO | Safrole: a ticket lottery | γ (gamma), ch. 6 | Tickets are anonymous (ring VRF), so the next author is normally unknown until they publish |
| On-chain randomness (RANDAO mix) | The entropy pool | η (eta), ch. 6 | Fed by each block author's VRF output |
| Finality (Casper FFG) | GRANDPA | ch. 19 | GRANDPA only votes for chains whose reports have been audited |

## Blocks, roots and money

| Ethereum | JAM | Gray Paper | Where the analogy breaks |
|---|---|---|---|
| Block = header + transactions | Block = header + extrinsic | H, E, ch. 4 | The extrinsic has 5 parts: tickets, disputes, preimages, assurances, guarantees. There is no list of user transactions |
| State root of *this* block's result | State root of the *parent's* result | H_R, ch. 5 | JAM's header commits to the prior state, so authors can seal before re-computing the Merkle root. Pipelining is the reason |
| Logs and receipts | Accumulation outputs, committed into recent history | θ, β (theta, beta), ch. 7, 12 | Each service may yield one hash per accumulation; those are Merklized (with Keccak, for bridges) into a belt kept in β |
| ETH, 10¹⁸ wei | The native token, 10⁹ base units | ch. 4 Economics | Balances are 64-bit, so at most about 18 × 10⁹ tokens can ever exist |

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0: what changed on this page</div>

- **The validator count is no longer a constant.** 0.7.2 fixed V = 1023. In 0.8.0 each
  validator key sequence has a size in 𝕍, any multiple of 3 from 6 to 3C = 1023
  (eq:valcount). C = 341 stays fixed, but only the first |κ'|/3 cores are active
  (Guarantor Assignments, sec:coresandvalidators).
- **Gas is charged per basic block.** 0.7.2 charged a flat 1 gas per instruction as it
  ran. 0.8.0 charges a whole basic block in advance, costed in virtual CPU cycles by a
  simplified CPU model (App. A, sec:gascostmodel, eq:gascostforblock). The budgets
  G_A = 10 million and G_R = 5 billion are unchanged.

</div>

## Where the analogy breaks hardest

Three differences matter most.

1. **Two runs, not one.** Every job is refined in-core, then accumulated on-chain.
   Almost every chapter from 11 to 14 exists to make that split safe.
2. **No transactor.** Nobody signs a transaction and pays for it. Coretime is bought
   in advance, and authorizers decide who may use it.
3. **The header commits to the prior state.** It sounds small, but recent history
   (ch. 7) has a whole mechanism to fill in the missing root one block later.

If you remember nothing else from this page, remember those three.
