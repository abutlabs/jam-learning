---
title: "F10 · Symbol card: every Greek letter in plain English"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

# F10 · Symbol card

<span class="lecture-badge">M1 Understanding · Foundations</span>

Keep this page open while you read the chapter sheets. Every symbol here is checked
against the Gray Paper 0.8.0 preamble, where the paper defines its own notation. On any
page of this site you can also tap a Greek letter to see its name.

## How to use this card

Read the plain name first, then the symbol. Keep the card open while you read, but aim
to say "ρ, the availability assignment on each core" without looking it up. Aim to know
the first four groups cold.

A **prime** after a symbol always means "after this block": τ is the slot before the
block, τ′ the slot after it. That one convention unlocks most equations.

## The whole state

| Symbol | Plain name | What it holds | Chapter |
|---|---|---|---|
| σ | the state | everything; the tuple of the 17 parts below | 4 |
| Υ | the block transition | σ′ = Υ(σ, B): the rule that turns the old state and a block into the new state | 4 |

## Validators and consensus

| Symbol | Plain name | What it holds | Chapter |
|---|---|---|---|
| κ | active validators | the keys of this epoch's validator set | 6 |
| λ | previous validators | last epoch's set, still used to verify judgments and guarantees made under it | 6 |
| ι | staging validators | keys queued for the future, set by a privileged service | 6 |
| γ | Safrole state | γ_P the next epoch's keys, γ_Z their ring root, γ_S who seals each slot, γ_A the ticket accumulator | 6 |
| η | entropy | on-chain randomness: η₀ the running accumulator, η₁ to η₃ snapshots from earlier epochs | 6 |
| ψ | disputes | ψ_G good reports, ψ_B bad reports, ψ_W wonky reports, ψ_O offenders' keys | 10 |

Mnemonic: **κ λ ι** run "now, before, next". κ for the **k**ey holders now.

## Work and reports

| Symbol | Plain name | What it holds | Chapter |
|---|---|---|---|
| ρ | availability assignments | per core, the guarantee (work-report, guarantee slot, guarantors' signatures) plus the slot it was reported, while it waits to become available (eq:reportingstate) | 11 |
| **R** | newly available reports | work-reports that became available in this block | 11, 12 |
| **R**! | ready at once | the newly available reports with no prerequisites and no segment-root lookups | 12 |
| **R**^Q | must wait | the other newly available reports, queued with their dependencies | 12 |
| **R*** | accumulatable | the ordered reports this block may accumulate: **R**! then the queued reports whose dependencies are now met. Gas may run out first, so only its first n reports are accumulated (eq:finalstateaccumulation) | 12 |
| ω | ready queue | available reports still waiting on prerequisites, kept per slot | 12 |
| ξ | recently accumulated | work-package hashes accumulated in the last epoch's worth of slots | 12 |
| θ | accumulation outputs | this block's (service, hash) results from accumulation | 7, 12 |

Mnemonic: ρ is the **r**eport **r**esting on a core. ω, the last Greek letter, holds the
reports that come **last** because they are waiting.

## Accounts and services

| Symbol | Plain name | What it holds | Chapter |
|---|---|---|---|
| δ | service accounts | every service: balance, code hash, storage, preimages, gas minimums | 9 |
| χ | privileged services | χ_M the manager, χ_A the per-core assigners, χ_V the delegator (sets the next validators), χ_R the registrar, χ_Z the always-accumulate list | 9 |
| α | authorizer pool | per core, up to 8 authorizers that work on that core may use | 8 |
| φ | authorizer queue | per core, 80 upcoming authorizers, one fed into the pool each block | 8 |

Mnemonic: **δ** for the **d**ata of services. **α** and **φ** are a pair: the queue φ
feeds the pool α.

## Time and bookkeeping

| Symbol | Plain name | What it holds | Chapter |
|---|---|---|---|
| τ | timeslot | the slot of the most recent block (6-second slots) | 4, 6 |
| β | recent history | β_H: the last 8 blocks (header hash, state root, output root, slot, reported packages); β_B: the accumulation-output belt | 7 |
| π | statistics | π_V this epoch's validator counts, π_L last epoch's, π_C per core, π_S per service | 13 |

Mnemonic: **β** for **b**locks behind us. **π** for **p**erformance.

## Marks on symbols

| Mark | Meaning | Example |
|---|---|---|
| prime ′ | the value after this block | κ′ is the active set after this block |
| dagger † and double dagger ‡ | a named value halfway through the block, used by more than one later step | ρ† after disputes, ρ‡ after assurances |
| subscript letter | a named part of a tuple | H_T the header's timeslot, γ_A the ticket accumulator |
| bold letter | a sequence or set built inside an equation | **R**, the newly available reports |

## Letters and constants

| Symbol | Plain name | Value or meaning | Chapter |
|---|---|---|---|
| B | a block | B = (H, E) | 4 |
| H | the header | fields in capitals: H_P parent hash, H_R prior state root, H_X extrinsic hash, H_T timeslot, H_E epoch mark, H_W winners mark, H_O offenders mark, H_I author index, H_V entropy-source VRF signature, H_S seal. H_A, the author's Bandersnatch key, is derived from κ′[H_I] and not serialized | 5 |
| **E** | the extrinsic | E_T tickets, E_D disputes, E_P preimages, E_A assurances, E_G guarantees | 4 |
| C | core count | 341 (2 in the tiny test configuration) | Definitions |
| E (constant) | epoch length | 600 slots (12 in tiny) | Definitions |
| P | slot period | 6 seconds | Definitions |
| 𝕍 | allowed validator-set sizes | multiples of 3 from 6 up to 3C (eq:valcount); the full configuration uses 1023. Only the first \|κ′\|/3 cores are active | 6, 11 |
| G_A | accumulate gas per report | 10 000 000 | Definitions |
| G_R | refine gas per work-package | 5 000 000 000 | Definitions |
| G_T | accumulate gas per block, in total | 3 500 000 000 | Definitions |
| N_V | verdicts per block | at most 16 in the disputes extrinsic (eq:disputesextrinsics) | 10 |
| N_O | culprits or faults per block | at most 16 culprits and, separately, at most 16 faults (eq:disputesextrinsics) | 10 |
| M_□ | host-call gas prices | the gas terms of host call Ω_□: a constant M_□ (written M_□,c when other terms exist), plus for some calls a per-1024-octet term M_□,ℓ or a per-page term M_□,p. Example: M_G = 48 for `gas`. An unknown host call costs M_∅ = 1000 | App. B, Definitions |

Careful: bold **E** is the extrinsic, and the sans-serif E is the epoch length. Context
always tells you which.

## PVM invocations

| Symbol | Plain name | What it runs |
|---|---|---|
| Ψ | the PVM | runs a program with some gas, registers and memory until it halts, panics, runs out of gas, faults or makes a host call |
| Ψ_1 | one step | a single instruction. On the first step, and each time execution enters a basic block or jumps back to its start, it first charges the whole block's gas ϱ^Δ, a cycle count from a simplified CPU model (eq:gascostforblock). If the gas left is too small, it exits out-of-gas and the counter is unchanged |
| Ψ_H | with host calls | Ψ plus the handling of host calls |
| Ψ_M | a full program run | sets up memory and arguments, then runs |
| Ψ_I | is-authorized | the authorizer check, in-core |
| Ψ_R | refine | the heavy, stateless work, in-core |
| Ψ_A | accumulate | the light, stateful update, on-chain |
| Ω | host calls | one function per host call, e.g. Ω_R read, Ω_W write. Each has a numeric id and a gas cost built from the M constants. grow_heap (Ω with the Gemini sign as subscript) is id 1 |

Mnemonic: the three that matter most spell the lifecycle, **I**, **R**, **A**: is it
allowed, do the work, apply it.

## Letters reused inside the PVM

Appendix A gives some Greek letters a local meaning. Do not mix them up with the state.

| Symbol | Plain name | What it holds |
|---|---|---|
| ϱ | gas counter | the gas left. This is varrho, not ρ the availability assignments |
| ϱ̃ | gas-charged flag | ⊤ once the current basic block's gas has been paid |
| φ | registers | the 13 registers of 64 bits. The GP draws them as the curly φ (varphi) and the authorizer queue as the straight ϕ (phi). This site writes both as φ, and its tap-to-name always says authorizer queue |
| μ | memory | the PVM's RAM |
| ı | instruction counter | the program counter (a dotless i) |
| ε | exit reason | halt, panic, out-of-gas, fault or host call (a single step Ψ_1 can also return continue) |
| ϖ | basic-block starts | where each basic block begins; a jump, branch or dynamic-jump target outside this set makes the machine panic |

<div class="callout callout-warning">
<div class="callout-title">What changed in GP 0.8.0</div>

- ρ is now called the **availability assignments**. Each entry holds the whole guarantee
  (work-report, guarantee slot and guarantors' signatures) plus the slot it was reported
  (eq:reportingstate). In 0.7.2 it was "the pending reports" and held only the report and
  that slot.
- The constant V = 1023 is gone. κ, λ, ι and γ_P have a length from 𝕍, any multiple of 3
  from 6 to 3C (eq:valcount), and only the first |κ′|/3 cores are active.
- Each β_H entry gained a slot t (eq:recenthistoryspec), set to the block's H_T
  (eq:recenthistorydef).
- New constants: N_V and N_O bound the disputes extrinsic (eq:disputesextrinsics), and
  the M constants price each host call. 0.7.2 charged a flat 10 gas per host call (plus t
  for `transfer`) and 10 for an unknown one.
  The ticket-entries constant N is gone: the attempt bound is now computed from |γ_P′|
  (eq:ticketsextrinsic).
- Ψ carries the new flag ϱ̃, and gas is charged per basic block, not per instruction
  (eq:gascostforblock).
- The new host call grow_heap took id 1. `gas` stays 0; every other id moved up by one
  (`fetch` 1 → 2 through `provide` 26 → 27).

</div>
