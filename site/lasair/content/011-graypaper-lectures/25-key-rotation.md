---
title: "6.3 Key Rotation"
duration: 5 min
video: https://www.youtube.com/watch?v=pn4FK4fScMg
---

# Graypaper Section 6.3: Key Rotation

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM rotates validator keys across epochs, maintaining security while enabling smooth transitions.

## What This Lecture Covers

- Four validator key sets
- Epoch boundary rotation
- Nullifying slashed validators
- Ring root computation

## Four Key Sets

JAM maintains four sets of validator keys:

| Symbol | Name | Purpose |
|--------|------|---------|
| ι (iota) | Staging | Keys being prepared for future |
| γ_k | Pending | Keys staged for next epoch |
| κ (kappa) | Current | Active keys for this epoch |
| λ (lambda) | Previous | Last epoch's keys (for verification) |

In the full configuration each set contains 1023 validator key rings.

<div class="callout callout-warning">

**Changed in GP 0.8.0:** there is no validator-count constant V any more. Each of ι, γ_P, κ and λ is a *sequence* whose length is drawn from 𝕍 = {3c : 2 ≤ c ≤ C}, i.e. a multiple of 3 from 6 up to 3C = 1023 (section 6.3, eq. `valcount`). The four sequences may differ in length, e.g. when the delegator designates a smaller or larger staging set ι. In state they are therefore serialized with a length prefix (appendix D.1, C(4) and C(7)-C(9)).

</div>

<div class="callout callout-info">

**ELI5: The Key Pipeline**

Think of a restaurant's shift schedule:
- **ι (Staging)** = New hires being trained
- **γ_k (Pending)** = Staff scheduled for tomorrow
- **κ (Current)** = Today's working staff
- **λ (Previous)** = Yesterday's staff (still on payroll for cleanup)

Each day (epoch), everyone moves one position forward.

</div>

## Key Ring Structure

Each validator's key ring is 336 bytes:

```
KeyRing = (
  bandersnatch: 32 bytes,   -- Block sealing, VRF
  ed25519: 32 bytes,        -- GRANDPA signing
  bls: 144 bytes,           -- Aggregated signatures
  metadata: 128 bytes       -- IP address, name, etc.
)
```

<div class="lasair-connection">

### In Lasair: Key Ring Type

```ocaml
(* From lib/definitions.ml - Validator key set 𝕂 *)
type validator_keys = {
  ed: ed_key;           (* Ed25519 key for signing *)
  bs: bs_key;           (* Bandersnatch key for VRF *)
  bls: bls_key;         (* BLS key for aggregation *)
  metadata: bytes;      (* Additional metadata *)
}

(* From lib/cores.ml *)
(** Validator set - array of validator keys *)
type validator_set = validator_keys seq
```

The array's length is whatever the sequence holds; nothing in the type pins it to 1023. (The on-wire order is Bandersnatch, Ed25519, BLS, metadata, as in the table above.)

</div>

## Epoch Rotation

At each epoch boundary (when e' > e), keys rotate forward:

```
If new epoch (e' > e):
  γ'_P = Φ(ι)        -- Staging → Pending (offenders nulled)
  κ'   = γ_P         -- Pending → Current
  λ'   = κ            -- Current → Previous
  γ'_Z = O(γ'_P)     -- Compute new ring root

Otherwise:
  All keys stay the same
```

(Section 6.3. The condition is only the epoch change; there is no "no judgments" clause in current versions. The lecture's older lettering γ_k, γ_z is γ_P, γ_Z in GP 0.8.0.)

<div class="lasair-connection">

### In Lasair: Key Rotation

```ocaml
(* From lib/cores.ml - Epoch key rotation *)

(** Rotate validator sets at epoch boundary *)
let rotate_validator_sets ~(current : validator_state)
    ~(offenders : hash seq) : validator_state =
  {
    staging = current.staging;  (* Unchanged - set by delegator *)
    pending = filter_offenders current.staging offenders;
    active = current.pending;
    previous = current.active;
  }
```

The import path does the same on the serialized state in `conformance/stf_transitions.ml`: γ_P' := Φ(ι) "at whatever size ι has", then the ring root over |γ_P'| keys.

</div>

## Nullifying Slashed Validators

The nullification function **Φ** (Phi) zeros out keys of misbehaving validators:

```
Φ(keys) = keys, with every key whose Ed25519 part is in the offenders set ψ'_O
          replaced by a key of all zeroes
```

This prevents slashed validators from participating, even if they try to switch keys. (η is the entropy pool, not the nullifier; section 6.3, eq. `blacklistfilter`.)

<div class="lasair-connection">

### In Lasair: Nullification

```ocaml
(* From lib/cores.ml - Nullify slashed validators *)

(** Null validator key (all zeros) - used when validator is blacklisted *)
let null_validator_key : validator_keys = {
  bs = Hash.zero;
  ed = Hash.zero;
  bls = Blob144.zero;
  metadata = Bytes.make 128 '\x00';
}

(** Filter function Φ: replace offender keys with null *)
let filter_offenders (keys : validator_set) (offenders : hash seq)
    : validator_set =
  Array.map (fun k ->
    let is_offender = Array.exists (fun off ->
      Bytes.equal (Hash.to_bytes k.ed) (Hash.to_bytes off)
    ) offenders in
    if is_offender then null_validator_key else k
  ) keys
```

Offenders are matched by Ed25519 key, not by index: the offenders set ψ_O holds keys.

</div>

## Ring Root (γ_z)

The ring root is a cryptographic commitment (a Bandersnatch ring commitment, 144 bytes, not a Merkle root) to all Bandersnatch keys:

```
γ_Z = O([k_b | k ← γ'_P])

Where O computes the ring root from all bandersnatch keys in the pending sequence.
```

This root enables efficient ring signatures - proving membership without revealing identity.

<div class="callout callout-info">

**ELI5: The Group Photo**

The ring root is like a group photo of all validators:
- You can prove "I'm in this photo" (ring signature)
- But viewers can't tell WHICH person you are
- The photo (root) changes each epoch as staff rotates

</div>

<div class="lasair-connection">

### In Lasair: Ring Root

```ocaml
(* From conformance/stf_transitions.ml (abridged) - Ring root at an epoch change *)
let gk_count' = Stf_config.vset_count gamma_k' in
let gamma_z' =
  let keys = List.init gk_count' (fun v ->
    Option.value ~default:(Bytes.make 32 '\x00') (Stf_config.vset_bandersnatch gamma_k' v)) in
  Bandersnatch_ffi.make_ring_commitment
    (Stf_config.ring_keys_padded keys) (Stf_config.ring_capacity ())
```

One detail lasair found against the 0.8.0 test vectors (a set-resize vector): the ring is built at the full capacity 3C, with the actual keys padded by the padding point up to that size (`ring_keys_padded` in `conformance/stf_config.ml`). The Graypaper text itself just writes O over the key sequence.

</div>

## Rotation Summary

```
Epoch N:           Epoch N+1:
┌─────────┐        ┌─────────┐
│   ι     │ ──────►│  γ_k    │  (staging → pending)
├─────────┤        ├─────────┤
│  γ_k    │ ──────►│   κ     │  (pending → current)
├─────────┤        ├─────────┤
│   κ     │ ──────►│   λ     │  (current → previous)
├─────────┤        ├─────────┤
│   λ     │ ──────►│ (gone)  │  (previous → discarded)
└─────────┘        └─────────┘
```

## Key Takeaways

1. **Four key sequences** - Staging, Pending, Current, Previous (each 6 to 1023 keys, a multiple of 3, in GP 0.8.0)
2. **336 bytes/key** - Bandersnatch + Ed25519 + BLS + metadata
3. **Epoch rotation** - Keys shift forward at boundaries
4. **Nullification** - Zeros out slashed validators
5. **Ring root** - Enables anonymous ring signatures

## What's Next

Continue with **Section 6.4: Sealing and Entropy** to understand how blocks are authorized and randomness is accumulated.

[Next: 6.4 Sealing and Entropy &rarr;](lesson.html?lesson=011-graypaper-lectures/26-sealing-entropy)
