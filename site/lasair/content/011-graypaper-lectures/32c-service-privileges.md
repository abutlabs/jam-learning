---
title: "9.4 Service Privileges"
duration: 8 min
video: https://www.youtube.com/watch?v=fND-n4gtxxI
---

# Graypaper Section 9.4: Service Privileges

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains the **privilege system** - a small set of special services that have elevated capabilities to manage core protocol functionality.

## What This Section Covers

- The χ (chi) privilege tuple
- Manager, Delegator, and Registrar roles
- Assigner services for core-time
- Always-accumulate services

## The Privilege System

JAM needs certain services with special powers to:
- Set validator keys (staking system)
- Manage core-time allocation (coretime market)
- Create protected services (system services)

<div class="callout callout-info">

**ELI5: System Administrators**

Think of JAM like an operating system:
- **Manager** = Root/Administrator - can change who has other admin powers
- **Delegator** = Controls which validators run the network
- **Registrar** = Controls which programs can be installed in protected space
- **Assigners** = Per-core managers for scheduling work

Most services are regular "users" - but these special services are "admins."

</div>

## The χ (Chi) Tuple

The privilege state is a simple tuple:

```
χ = (manager, delegator, registrar, assigners, always_accers)

Where:
  manager      ∈ service_id     -- Can modify privileges
  delegator    ∈ service_id     -- Can set staging validator set (ι)
  registrar    ∈ service_id     -- Can create protected services
  assigners    ∈ [service_id]   -- One per core (C = 341), modifies auth queue
  always_accers ∈ {service_id → gas}  -- Auto-accumulate each block
```

<div class="lasair-connection">

### In Lasair: Privileges Type

```ocaml
(* lib/accounts.ml *)

type privileges = {
  manager: service_id;      (** Can modify privileges *)
  delegator: service_id;    (** Can set staging set *)
  registrar: service_id;    (** Can create protected services *)
  assigners: service_id seq;  (** One per core, modifies auth queue *)
  always_accers: (service_id * gas) seq;  (** Auto-accumulate services *)
}
```

</div>

## Manager Service

The **manager** is like "root" - it can modify the other privilege fields:

```
Manager capabilities:
  - Set new manager (transfer root)
  - Set delegator service
  - Set registrar service
  - Modify assigners list
  - Add/remove always-accumulate services
```

The manager does all of this with one host call, `bless` (Ω_B), which sets the whole tuple (manager, assigners, delegator, registrar, always-accumulate dictionary) at once.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** `bless` is restricted to the manager: if the calling service is not χ_M, it returns `HUH` and changes nothing (`pvm_invocations.tex`, appendix B.7). It is host call 15 and costs M_B,c + n·M_B,ℓ = 422 + 20 per always-accumulate entry. The published 0.8.0 test vectors still follow the older behaviour (a non-manager may call `bless`, and accumulation keeps only the roles that service owns); lasair follows the vectors behind a single switch, `bless_refuses_non_manager` in `lib/pvm_host.ml`, so it can adopt the strict text when the vectors do.

</div>

<div class="callout callout-warning">

**Why Have a Manager?**

We don't know ahead of time how governance will evolve. The manager allows the protocol to be upgraded and reconfigured through governance rather than hard forks.

If we were 100% certain we'd never need to change anything, manager could be null (a non-existent service). But that's a big assumption.

</div>

## Delegator Service

The **delegator** controls the validator set:

```
Delegator capabilities:
  - Set the staging validator set (ι), via the designate host call
  - Staged keys become pending (γ_P) at the next epoch boundary
    and active (κ) at the one after
  - Typically connected to a staking/election system
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the validator count is no longer the constant V = 1023. `designate` (Ω_D, host call 17) now takes the number of keys z in a register and reads z × 336 octets; it returns `HUH` unless z is a valid validator-set size (a multiple of 3 from 6 up to 3C = 1023, the set 𝕍 of `safrole.tex` eq. `valcount`) and the caller is the delegator. Its cost grows with z: M_D,c + z·M_D,ℓ = 1100 + 302z. So the delegator can now resize the validator set.

</div>

This enables:
- Proof-of-stake with elected validators
- Changing validator set without hard forks
- On-chain governance of validator selection

## Registrar Service

The **registrar** controls protected service creation:

```
Protected service range: indices below S = 2^16

Registrar capabilities:
  - Create services in protected index range
  - Only the registrar can do this
  - Regular services get indices of at least S = 2^16
```

Why protect some indices?
- System services (parachains, coretime market) need stable addresses
- Prevents squatting on low indices
- Ensures critical infrastructure is controlled

## Assigner Services

Each core has an **assigner** - a service that can modify that core's authorization queue:

```
assigners[core] = service_id

Assigner capability for core c:
  - Modify authorization queue φ[c]
  - Schedule which authorizers can use that core
  - This is how coretime market allocates access
```

<div class="lasair-connection">

### In Lasair: Assigner Check

```ocaml
(* lib/accounts.ml *)

(** Check if a service can assign authorizers for a core *)
let can_assign_core (priv : privileges) (s : service_id) (core : int) : bool =
  core >= 0 && core < Array.length priv.assigners &&
  Int32.equal priv.assigners.(core) s
```

</div>

## Always-Accumulate Services

Some services need to run every block, regardless of work reports:

```
always_accers = [(service_id, gas), ...]

Each block:
  - These services get accumulated automatically
  - Each gets its specified gas allocation
  - Used for: block rewards, epoch transitions, housekeeping
```

<div class="callout callout-info">

**ELI5: Cron Jobs**

Always-accumulate services are like cron jobs:
- They run every block automatically
- No need for external triggers
- Perfect for periodic maintenance tasks

Example uses:
- Distribute block rewards
- Update validator statistics
- Process epoch boundaries

</div>

## Visual: Privilege Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Privilege System χ                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Manager (service 0x0001)                                │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ Can set: manager, delegator, registrar, assigners  │ │   │
│  │ │ Can modify: always_accers                          │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           ├──→ Delegator (service 0x0002)                       │
│           │      └── Can set staging validator set ι            │
│           │                                                     │
│           ├──→ Registrar (service 0x0003)                       │
│           │      └── Can create protected services              │
│           │                                                     │
│           └──→ Assigners [one per core]                         │
│                  ├── Core 0: service 0x0100 → sets φ[0]         │
│                  ├── Core 1: service 0x0100 → sets φ[1]         │
│                  ├── Core 2: service 0x0100 → sets φ[2]         │
│                  └── ... (341 cores total)                      │
│                                                                 │
│  Always-Accumulate:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ (0x0010, 1_000_000_gas) → Runs every block              │   │
│  │ (0x0011, 500_000_gas)   → Runs every block              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Null Privileges

A privilege can point to a non-existent service:

```
If manager = 0xFFFFFFFF (non-existent):
  - No service can modify privileges
  - Effectively "locked" forever
  - Use with extreme caution!
```

This allows "burning" admin keys if desired, but it's irreversible.

## Typical Setup

In practice, the privilege structure might look like:

```
manager    → Governance service (handles upgrades/votes)
delegator  → Staking service (NPoS election)
registrar  → Parachains service (manages system parachains)
assigners  → All point to Coretime service (market-based allocation)

always_accers:
  - Statistics service (update validator stats)
  - Rewards service (distribute block rewards)
```

<div class="lasair-connection">

### In Lasair: Manager Check

```ocaml
(* lib/accounts.ml *)

(** Check if a service has manager privilege *)
let is_manager (priv : privileges) (s : service_id) : bool =
  Int32.equal priv.manager s
```

</div>

## Key Takeaways

1. **χ tuple** - Small set of privileged service references
2. **Manager** - Root privilege, can modify other privileges
3. **Delegator** - Controls validator set
4. **Registrar** - Controls protected service creation
5. **Assigners** - Per-core, control authorization queues
6. **Always-accers** - Services that run every block automatically
7. **Governance-ready** - Allows protocol evolution without hard forks

## Graypaper References

- Section 9.4: Service Privileges
- The χ tuple definition
- Privilege modification during accumulation

## What's Next

Return to the main accounts section to see how all the pieces fit together.

[Back to 9.0 Accounts &rarr;](lesson.html?lesson=011-graypaper-lectures/32-accounts)
