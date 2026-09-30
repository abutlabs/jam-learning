---
title: "4.2 The State"
duration: 3 min
video: https://www.youtube.com/watch?v=3yE2Yl4RhEI
---

# Graypaper Section 4.2: The State

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section details JAM's complete state structure - all 17 components that together represent the blockchain's current condition.

## What This Lecture Covers

- Complete state structure (σ)
- What each Greek letter represents
- Difference from Ethereum's state
- State serialization and commitment

## JAM State vs Ethereum State

In Ethereum's Yellow Paper:
```
σ = accounts (smart contracts)
```

In JAM's Graypaper:
```
σ = 17 different components
δ = accounts (service accounts)
```

JAM uses **σ** for the complete state and **δ** (delta) for accounts.

## The 17 State Components

```
σ = (α, β, θ, γ, δ, η, ι, κ, λ, ρ, τ, φ, χ, ψ, π, ω, ξ)
```

(Graypaper v0.8.0, eq. `statecomposition`. The video predates some renamings, so a few letters differ from what you hear.)

| Symbol | Name | Purpose |
|--------|------|---------|
| **δ** (delta) | Accounts | Service account balances, code, storage |
| **η** (eta) | Entropy | Accumulated randomness (4 hashes) |
| **γ** (gamma) | Safrole | Block production state |
| **β** (beta) | Recent History | Recent block history and the accumulation-output belt |
| **α** (alpha) | Auth Pool | Per-core authorization requirements |
| **φ** (phi) | Auth Queue | Pending authorizations |
| **τ** (tau) | Time | Most recent block's timeslot |
| **ρ** (rho) | Availability Assignments | Per core, a guaranteed work report waiting for availability (v0.8.0 name; formerly "pending reports") |
| **ψ** (psi) | Judgments | Good, bad and wonky report sets, plus the offenders ψ_O |
| **χ** (chi) | Privileges | Service privilege assignments |
| **ι** (iota) | Staging Keys | Validator keys waiting to enter |
| **κ** (kappa) | Curr Keys | Current epoch validator keys |
| **λ** (lambda) | Prev Keys | Previous epoch validator keys |
| **π** (pi) | Statistics | Validator, core and service activity statistics |
| **θ** (theta) | Last Accumulation Outputs | The (service, hash) outputs yielded by the most recent block's accumulation |
| **ξ** (xi) | Accumulated | Recently accumulated work packages |
| **ω** (omega) | Ready Queue | Work reports waiting on their dependencies before accumulation |

<div class="callout callout-info">

**ELI5: State Components**

Think of the blockchain as a big company:
- **δ** = Bank accounts (service balances)
- **η** = Random number generator (for fairness)
- **γ** = Schedule (who produces next block)
- **β** = Recent meeting minutes (block history)
- **ρ** = Pending tasks (work reports)
- **κ, λ, ι** = Employee ID cards (validator keys)
- **ψ** = HR records (who's been naughty)

</div>

<div class="lasair-connection">

### In Lasair: Complete State

```ocaml
(* Illustrative sketch (not lasair's code) - Complete JAM state *)

(** α - Authorization pool.
    Per-core authorization requirements that work must satisfy. *)
type auth_pool = {
  pool: (core_index, hash seq) Dict.t;
}

(** β - Recent blocks.
    History of recent block headers for fork choice. *)
type recent_blocks = header seq

(** δ - Service accounts.
    Balance, code, storage for each service. *)
type accounts = (service_id, service_account) Dict.t

(** η - Entropy.
    Accumulated randomness from validators: ⟦ℍ⟧_4. *)
type entropy = {
  eta0: bytes;  (* The running accumulator *)
  eta1: bytes;  (* Its value at the end of the last epoch *)
  eta2: bytes;  (* ... two epochs ago *)
  eta3: bytes;  (* ... three epochs ago *)
}

(** γ - Safrole state.
    Block production algorithm state. *)
type safrole_state = {
  tickets: ticket_accumulator;
  validators: validator_info seq;
}

(** ρ - Availability assignments (v0.8.0 name).
    Per core: the guarantee (report + signatures) and the slot it was
    reported in, until the data is available or it times out. *)
type availability = (guarantee * timeslot) option seq

(** τ - Timeslot.
    Current chain time. *)
type time_state = timeslot

(** Complete JAM state: σ *)
type jam_state = {
  alpha: auth_pool;
  beta: recent_blocks;
  delta: accounts;
  eta: entropy;
  gamma: safrole_state;
  rho: availability;
  tau: time_state;
  (* ... other components *)
}
```

</div>

## State Commitment

The complete state is serialized and Merklized into a single hash:

```
state_root = M_σ(σ)
```

The state is first serialized into a dictionary T(σ) from 31-octet keys to encoded values (appendix D.1), and that dictionary is merklized as a binary Patricia trie (appendix D.2). The next block's header carries this root as its prior state root H_R, committing to the entire state.

<div class="lasair-connection">

### In Lasair: State Serialization

```ocaml
(* lib/state_db.ml - lasair keeps σ serialized: T(σ) as a map *)
type t = {
  map: bytes KeyMap.t;          (* 31-byte state key -> encoded value *)
  mutable root: bytes option;   (* memoized Merkle root *)
}

(** Compute Merkle root using Patricia Merkle Trie *)
let compute_root (db : t) : bytes =
  merkle_state (entries db) 0

(* Checking a header: its H_R must equal the root of the PRIOR state,
   i.e. State_db.root of the state after the parent block. *)
```

</div>

## Why 17 Components?

The partitioning enables:

1. **Parallel processing** - Most components transition independently
2. **Modular design** - Each component has clear responsibilities
3. **Efficient proofs** - Prove specific components without full state

## Key Takeaways

1. **17 components** - JAM state is much richer than Ethereum's
2. **δ for accounts** - Services, not σ like in Ethereum
3. **Greek letters** - Each maps to a specific protocol function
4. **Merkle commitment** - All state compressed to one hash

## What's Next

Continue with **Section 4.2.1: Dependency Graph** to understand how state components interact during transitions.

[Next: 4.2.1 Dependency Graph &rarr;](lesson.html?lesson=011-graypaper-lectures/19-dependency-graph)
