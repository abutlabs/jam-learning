---
title: "Ch. 9 Service Accounts"
duration: 45 min
exam_portion: random
exam_bucket: either
gp_chapter: 9
gp_words: 1583
gp_tex: text/accounts.tex
lasair: lib/accounts.ml, conformance/preimages_stf.ml, lib/pvm_host.ml (account host calls), lib/state_keys.ml
---

# Ch. 9 Service Accounts

<span class="lecture-badge">M1 Understanding · Graypaper ch. 9</span>

A service is JAM's only kind of account: balance, code, storage, and a preimage lookup
system, but no secret key and no nonce. The chapter defines the account tuple, how code
is found, the four-state life of a preimage, the historical lookup function that makes
in-core reads deterministic, the storage footprint and threshold balance, and the five
privileges. Every host call in Appendix B reads or writes something defined here, so the
chapter can be approached from either the state side or the execution side.

## Chapter sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| δ ∈ 𝔻⟨ℕ₂³² → 𝔸⟩ | service accounts | one account per 32-bit service id (eq. serviceaccounts) |
| a_s | storage | 𝔻⟨𝕐 → 𝕐⟩, arbitrary key/value, on-chain only |
| a_p | preimages | 𝔻⟨ℍ → 𝕐⟩, hash → data, readable in-core |
| a_l | requests | 𝔻⟨(ℍ, ℕ_L) → ⟦slot⟧_{:3}⟩, availability history per (hash, length) |
| a_f | gratis | free storage credit subtracted from the threshold |
| a_c | code hash | which preimage holds (metadata, code) |
| a_b | balance | tokens, ℕ₂⁶⁴ |
| a_g | min accumulate gas | minimum gas per work-item to run accumulate |
| a_m | min memo gas | minimum gas per deferred transfer |
| created, last-accumulated, parent | usage metadata | the slot the service was created, the slot it last accumulated, and the creating service's id |
| χ = (χ_M, χ_V, χ_R, χ_A, χ_Z) | privileges | manager, delegator, registrar, per-core assigners, always-accumulate dict (eq. privilegesspec) |

Derived, not stored as inputs: a_i items and a_o octets, both written explicitly into
the Merklized account record C(255, s); and a_t threshold balance, which is *not*
serialized (it is recomputed from a_i, a_o and a_f; the `info` host call returns it).

### Inputs
The preimages extrinsic E_P (this chapter defines the state it lands in; ch. 12's
preimage-integration step does the landing, using τ'). Accumulation is the only other
writer: its host calls (Appendix B), plus two bookkeeping steps outside any host call.
Ψ_A credits incoming transfer amounts to a_b before the code runs (eq. accinvocation), and
ch. 12 sets a_a to τ' for every service in the accumulation statistics.

### The transition in plain English
This chapter defines *state*, and two functions over it, rather than a block step:

1. **Code lookup.** A service's code and metadata are whatever preimage sits under its
   code hash, decoded as (length-prefixed metadata, code). If that preimage is missing
   or malformed, both are ∅ and the service cannot run. Entry point 0 is refine
   (in-core, stateless); entry point 1 is accumulate (on-chain, stateful).
2. **Historical lookup Λ(a, t, h).** Return a_p[h] if the preimage is present *and* its
   request record says it was available at slot t; else ∅. Availability from the record
   l: [] never; [x] from x on; [x, y] from x until y; [x, y, z] from x until y, and again
   from z on. t must be within the last D = 19 200 slots (32 tiny) of H_T.
3. **Footprint and threshold.** Items = 2·|requests| + |storage|. Octets = Σ over
   requests (81 + length) + Σ over storage (34 + |key| + |value|). Threshold
   a_t = max(0, B_S + B_I·items + B_L·octets − gratis) with B_S = 100, B_I = 10, B_L = 1.

### The four preimage states (eq. historicallookup)
| record l | meaning | I(l, t) |
|---|---|---|
| [] | requested, not yet supplied | ⊥ |
| [x] | available since x | x ≤ t |
| [x, y] | was available x…y, now unavailable | x ≤ t < y |
| [x, y, z] | available x…y, unavailable, available again since z | x ≤ t < y ∨ z ≤ t |

The invariants: every preimage's key is its Blake2b, and every stored preimage has a
request record under (hash, length). Data cannot simply be deleted: it is marked
unavailable (`forget`) and can only be expunged after D slots, so history is retained
for auditors.

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| h = ℋ(d) for every (h, d) in a_p; (h, |d|) ∈ keys(a_l) (eq. preimageconstraints) | unsolicited or corrupt data; a preimage arriving without a service having requested it |
| preimage supplied only when the request record is [] (ch. 12 preimage integration) | resupplying an available or forgotten-but-not-expunged preimage |
| Λ answers from the *record*, not from presence alone | an in-core refine reading data that was not available at the lookup anchor; keeps audits deterministic |
| lookup slot t ∈ H_T − D … H_T | referencing preimage history older than the expunge horizon |
| balance ≥ threshold after any host call that grows the footprint or moves funds | state bloat and unfunded storage; the deposit is the price of on-chain bytes |
| a_g, a_m as minimums | accumulate being invoked with too little gas to run |
| χ_M alone may `bless` (0.8.0 text: HUH otherwise) and grant gratis (`new` with f ≠ 0: HUH otherwise); χ_V alone sets ι; χ_R alone creates protected-range ids; χ_A[c] alone edits φ[c] and may hand χ_A[c] on via `assign`; χ_Z accumulate every block with their gas | privilege escalation (see B4, B8) |
| request length z ∈ ℕ_L: `query`, `solicit`, `forget`, `provide` answer HUH when z ≥ 2³² (new in 0.8.0; it is the first case, so it wins over the panic on unreadable memory) | a request key (h, z) outside a_l's domain (ℍ, ℕ_L), taken from a 64-bit register |

### Edge cases
- **Code hash points at a missing preimage.** Service exists but is inert; refine and
  accumulate cannot run. Common right after `new` before the code is `provide`d.
- **Same hash, two lengths.** Requests are keyed by (hash, length); the preimage map is
  keyed by hash alone, so the record consulted by Λ is the one matching the stored
  length.
- **Forget then re-solicit.** `solicit` on [x, y] appends the current slot: [x, y, z].
  The bytes never left a_p, so nothing is re-provided (E_P and `provide` accept only a []
  record). The record is capped at three slots, so a later `forget` on [x, y, z] (once
  y < t − D) drops the oldest pair and gives [z, t]; the cycle can repeat. `forget` on []
  or on [x, y] with y < t − D expunges both the request and the preimage; a `forget` whose
  y is still within D answers HUH.
- **Gratis larger than the deposit.** Threshold clamps at zero; a service can be fully
  subsidised by the manager.
- **Foreign reads.** A service may read another service's storage and preimages through
  host calls; the state key for storage is interleaved with the *owning* service's id
  (B3).
- **Tiny.** D = 32 slots, so expunge is reachable in one short test; B_S/B_I/B_L are the
  same in both specs.

### War story
<div class="lasair-connection">

**B3: the cross-service read that came back empty.** Live fuzzer seed 1071703991,
step 6628. A service accumulating two operands wrote an 8-byte value derived from data
it had *read from another service's storage* (service 1116759087, key "data", 128 bytes).
lasair returned NONE; the reference returned the bytes; the divergent input produced a
divergent fold and a divergent root. Two mistakes at once: the closure that loaded a
foreign service loaded it with empty storage, and the read addressed foreign storage by
the raw key instead of the state key interleaved with the *foreign* service's id. Fix:
`lookup_service` loads the foreign storage and the foreign-read branch interleaves the
key via `storage_state_key_for`. Lesson: storage keys embed the owning service; preimages
key by raw hash; get the keying wrong and the data is invisible even when loaded.
Recorded in the Divergence Lab (`divergences.html`, B3). Its siblings in this chapter: B9
(a minted service id must skip ids already in *state*), B7 (an ejected service is gone
for the rest of the invocation), B4 and B8 (privilege writebacks gated on who held the
role at round start, singleton roles owned by the manager alone).

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- **No textual change** in `accounts.tex` between v0.7.2 and v0.8.0. The account tuple,
  the four-state preimage semantics, the footprint formula and the five privileges are
  identical.
- The behavioural changes that *touch* accounts live in Appendix B (`pvm_invocations.tex`),
  ch. 12 and the vectors:
  - **Host-call ids moved up by one** because `grow_heap` took id 1: lookup 3, read 4,
    write 5, info 6, bless 15, assign 16, designate 17, new 19, upgrade 20, transfer 21,
    eject 22, query 23, solicit 24, forget 25, provide 27. Each has its own cost g in the
    GP gas table instead of a flat 10. Most are a constant (info 703, query 643, solicit
    2 193, forget 3 250, new 3 855). A few add a size term: lookup, read, write and
    provide add memory gas ⌈L·ℓ/1024⌉ (eq. fnmemgas); bless adds 20 per always-accumulate
    entry, designate 302 per validator, and transfer adds the allowance l only when the
    transfer is queued.
  - **`bless`** answers HUH when the caller is not χ_M (0.7.2 had no caller check).
    lasair's plan and `lib/pvm_host.ml` record that the 0.8.0 test vectors follow the
    GP #519 deviation instead (a non-manager may bless; the writeback keeps only the roles
    it owns), with GP #558 pending. lasair follows the vectors behind one switch,
    `bless_refuses_non_manager` (false today).
  - **`query`, `solicit`, `forget`, `provide`** answer HUH when the length z ∉ ℕ_L.
  - **Accumulation statistics** become (N, T, G): work-items, processed transfers (#502),
    gas; an entry exists iff it is not (0, 0, 0) (eq. accumulationstatisticsdef). a_a is
    set to τ' for every service in that dictionary, so a service that only received
    transfers gets its last-accumulated slot updated even when it used no gas.
  See `docs/GP_0_8_0_PLAN.md`.

</div>

### Source pointers
- `lib/accounts.ml` — `historical_lookup`, `was_available_at`, `timeslots_to_status`,
  `get_code`, `storage_items`, `storage_octets`, `min_balance`, `is_manager`,
  `can_assign_core`
- `conformance/preimages_stf.ml` — `apply_preimages_stf`, `is_solicited`,
  `check_sorted_unique` (the vector-tested integration of E_P)
- `lib/pvm_host.ml` — `host_read`, `host_write`, `host_lookup`, `host_info`,
  `host_solicit`, `host_forget`, `host_provide`, `host_new`, `host_upgrade`,
  `host_transfer`, `host_eject`, `host_bless`, `host_assign`, `host_designate`
- `lib/state_keys.ml` — service-account and storage key interleaving
- `docs/notes/accounts.md`; lectures `011-graypaper-lectures/32…32e`

## Question bank

### Q1 ★ Name the fields of a service account and say what each is for.
<details><summary>Model answer</summary>

Storage (arbitrary key→value, on-chain only); preimages (hash→blob, readable in-core);
requests (per (hash, length), the availability history as up to three slots); gratis
(free storage allowance); code hash (which preimage is the code); balance; minimum
accumulate gas per work-item; minimum memo gas per deferred transfer; created slot;
last-accumulated slot; parent service id. Derived: item count and octet count, which
appear explicitly in the Merklized account record, and the threshold balance, which is
recomputed rather than stored (the `info` host call returns it).

</details>

### Q2 ★ How is a service's code found, and what are the two entry points?
<details><summary>Model answer</summary>

Take the preimage stored under the account's code hash and decode it as a length-prefixed
metadata blob followed by the code; if the preimage is absent or does not decode, both
are ∅ and the service is inert. Entry point 0 is refine: in-core, stateless apart from
recent preimages, run by guarantors. Entry point 1 is accumulate: on-chain, stateful, run
by every node with access to balances, storage, transfers and privileges. The code is
therefore itself a preimage, supplied through the same solicit/provide path as any data,
and upgraded by `upgrade` changing the hash.

</details>

### Q3 ★ Explain the four preimage states and the historical lookup function.
<details><summary>Model answer</summary>

The request record is a sequence of zero to three slots. Empty: requested, not supplied.
One slot x: available since x. Two slots x, y: was available from x, unavailable since y
(forgotten). Three slots x, y, z: available x…y, then again from z. Λ(a, t, h) returns
the preimage only if it is stored and the record says it was available at t: x ≤ t; or
x ≤ t < y; or x ≤ t < y ∨ z ≤ t. The point is refine: in-core code has no consensus
state, so lookups are answered as of the lookup anchor slot, and any auditor with a
recently finalized view gets the same answer.

</details>

### Q4 Why can preimage data not simply be deleted?
<details><summary>Model answer</summary>

Because refine reads it in-core and auditing happens later. If a preimage vanished, an
auditor re-running the work could not tell whether the guarantor's read was legitimate.
So removal is two-phase: `forget` marks it unavailable at slot y (the record becomes
[x, y]), and only after the expunge period D = 19 200 slots (about 32 hours; 32 slots
tiny) may it be dropped. History of existence is retained for the whole auditing window.

</details>

### Q5 ★ Give the footprint and threshold-balance formulas and the constants.
<details><summary>Model answer</summary>

Items a_i = 2·|requests| + |storage|. Octets a_o = Σ over request keys (h, z) of 81 + z,
plus Σ over storage pairs of 34 + |key| + |value|. Threshold a_t = max(0, B_S + B_I·a_i
+ B_L·a_o − a_f) with base deposit B_S = 100, item deposit B_I = 10, byte deposit B_L = 1,
and a_f the gratis offset the manager may grant. A host call that would leave balance
below threshold fails; this is how JAM prices state without a per-transaction fee.

</details>

### Q6 What are the five privileges and who may change them?
<details><summary>Model answer</summary>

Manager χ_M: may alter χ itself (via `bless`) and grant gratis storage. Delegator χ_V:
may set the staging validator set ι (`designate`). Registrar χ_R: alone may create
services with ids in the protected range. Assigners χ_A: one service id per core, each
may rewrite that core's authorizer queue (`assign`). Always-accumulate χ_Z: a dictionary
of service ids to gas, accumulated every block regardless of reports. Singleton roles are
the manager's to give; a per-core assigner may also be moved by its current holder
(lasair's B8 lesson). Mechanically (eq. accpar): χ'_M and χ'_Z come from the manager's
post-state; χ_A[c], χ_V and χ_R go through R(o, a, b), which takes the manager's change if
it made one, else the holder's own. New in the 0.8.0 text: `bless` answers HUH unless the
caller is χ_M.

</details>

### Q7 What differentiates storage from preimages?
<details><summary>Model answer</summary>

Keys: storage maps arbitrary blobs, preimages map a hash to the data with that hash.
Origin: storage is written by accumulation; preimage data arrives after a service
solicits it, either extrinsically through E_P or through a `provide` host call during
accumulation. Both land through the same preimage-integration function I, which fills
only a [] record (for provisions inside eq. accpar; for E_P in ch. 12's preimage
integration). Visibility: storage is on-chain only; preimages are also readable in-core
by refine. Deletion: storage values can be overwritten or removed freely; preimages go
through unavailable-then-expunge. Footprint cost differs (34 versus
81 bytes of overhead) and a request counts as two items.

</details>

### Q8 Why do service accounts need no nonce and no key?
<details><summary>Model answer</summary>

Nothing signs on behalf of a service. External data enters through refine in a
work-package that an authorizer (ch. 8) admitted, and state changes happen in accumulate,
which the chain invokes. Replay protection comes from the package pipeline (recent
history duplicates, accumulated set ξ) rather than a per-account counter. Payment comes
from coretime, not from a signer's balance.

</details>

### Q9 How is a new service id derived and what must the allocator check?
<details><summary>Model answer</summary>

`new` mints an id from a hash of the creating service, η₀' and the slot, mapped into the
non-protected range, and steps forward while the id is taken. "Taken" must mean against
*every* existing service in state, not just the invocation's working overlay. lasair's
B9 minted 983279732, an id created in an earlier block, and overwrote the live service;
the fix consults the state snapshot in the collision check.

</details>

### Q10 A refine execution at lookup-anchor slot t asks for hash h whose record is [x, y] with y < t. What is returned?
<details><summary>Model answer</summary>

∅. The preimage was forgotten at y, so for any t ≥ y it is unavailable, even though the
bytes may still physically sit in a_p until expunge. The request record, not the
presence of data, decides. If the service later re-solicits at slot z, `solicit` appends
z and the record becomes [x, y, z]; the bytes never left a_p, so nothing is provided
again, and lookups at t ≥ z succeed.

</details>
