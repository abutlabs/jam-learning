---
title: "Ch. 8 Authorization"
duration: 30 min
exam_portion: random
exam_bucket: small
gp_chapter: 8
gp_words: 598
gp_tex: text/authorization.tex
lasair: lib/authorization.ml, conformance/authorizations_stf.ml, conformance/stf_guarantees.ml
---

# Ch. 8 Authorization

<span class="lecture-badge">M1 Understanding · Graypaper ch. 8</span>

Authorization is how JAM separates *who paid for coretime* from *what work runs on it*.
Ethereum ties both to one signing account; Polkadot ties a slot to a parachain for months.
JAM wants both patterns, so it puts a small piece of logic, the authorizer, between the
core and the work-package. On-chain, the chapter is only two state components and one
transition, but the rationale is the substance.

## Examiner sheet

### State touched
| Symbol | Name | Shape | What it holds |
|---|---|---|---|
| α | authorizer pool | per core (341 / tiny 2), a sequence of **at most O = 8** hashes (eq:authstatecomposition) | the authorizers a work-package on this core may currently use |
| φ | authorizer queue | per core, a sequence of **exactly Q = 80** hashes | the upcoming authorizers, indexed by slot |

An authorizer hash is Blake2b of (the authorizer's PVM **code hash** ++ its configuration
blob). Tokens (in the package) and traces (on success) are opaque data meaningful only to
that code.

### Inputs
H_T (the slot indexes the queue), the guarantees extrinsic E_G (which authorizer each
reported package used, per core), and φ' (the queue after accumulation, since a
privileged service may have rewritten it).

### The transition in plain English
For each core: start from the current pool. If this block carries a guarantee for that
core, remove from the pool the leftmost occurrence of the authorizer that guarantee's
report names. Then append the queue entry at position H_T mod 80. Finally keep only the
last 8. Because the queue may have been changed by accumulation in this same block, the
pool update must run *after* accumulation. (eq. in §8.2)

```
α'[c] = last-8( F(c) ++ [ φ'[c][ H_T mod 80 ] ] )
F(c)  = α[c] minus-leftmost {authorizer of the guarantee for core c}   if such a guarantee exists
      = α[c]                                                             otherwise
```

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| A guaranteed report's authorizer must be in α[c] for its core (checked in ch. 11, eq:reportcoresareunused, against the *prior* pool α, not α') | running work on a core nobody paid for; is-authorized is proven in-core, but the *set* of allowed authorizers is on-chain |
| φ may only be written by an appropriately privileged service's accumulate logic (the `assign` host call; χ names the assigner per core) | anyone reprogramming what a core accepts |
| pool ≤ 8, queue = 80 exactly | unbounded state; the queue is a ring buffer over slots |
| append then trim, so the newest entry always enters | starvation: a full pool still rotates one entry per block |

### Edge cases
- **Empty block.** No removal; one append; oldest entry falls off once the pool is full.
  The pool therefore rotates continuously even when idle.
- **Queue entry repeats.** The pool may hold duplicates; removal takes only the leftmost.
- **Guarantee with an authorizer not in the pool.** The guarantee is invalid (ch. 11,
  eq:reportcoresareunused); α is untouched by it.
- **Two guarantees for one core in a block.** Not allowed (ch. 11: one report per core
  per block), so F(c) removes at most one entry.
- **Zero hash in the queue.** Allowed; it simply enters the pool as an authorizer no
  code will match.
- **Inactive core (0.8.0, GP #514).** C stays 341, but only the first |κ'|/3 cores are
  *active*. A guarantee on an inactive core is invalid (eq:guarantorsig requires
  c < |κ'|/3), yet the pool update still runs for every c ∈ N_C, so an inactive core's
  pool keeps rotating from its queue with nothing consuming it.

### War story
<div class="lasair-connection">

**The authorization STF was right; the importer never ran it.** Across the three
banked 0.7.2 fuzz-lane reports (`docs/CONFORMANCE_RETROSPECTIVE.md` §6) nothing diverged
in block import, guarantees, assurances, Safrole, validator sets, disputes or entropy;
every divergence was in accumulation's service-execution output, and the component STF
(`conformance/authorizations_stf.ml`) passed every authorizations vector. Then the GP
0.8.0 pre-release validity audit (2026-09-24, `docs/TINY_TO_FULL_AUDIT.md` 4th sweep)
found that the block importer had **never written α'**, and that the
"authorizer ∈ α[c]" check lived only in the component harness. No import-path (trace)
vector could see it: every trace vector's pools and queues hold one repeated hash, so
removing one copy and appending another leaves α' = α. The fix routes the importer
through the same `next_pool` the vectors test (`Stf_guarantees.update_auth_pools`),
rejects a report whose authorizer is not in the prior pool (`core_unauthorized`), and
makes lasair's own authoring cite a pool authorizer. The lesson: a component that
passes its vectors is not a client that runs it. Also know the difference: guarantor
*assignment* (which validators may guarantee for which core, fixed during the seed
campaign in `docs/M1_PLAN.md`) is ch. 11; *authorization* (which work may use the core)
is ch. 8.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- Ch. 8's prose now identifies an authorizer by the hash of its **code hash**
  concatenated with the configuration blob (0.7.2's ch. 8 said "code"; GP #522). This
  is a wording fix, not a new rule: ch. 14's formal definition p_a ≡ H(p_u ⌢ p_f) was
  already code-hash-based in 0.7.2. The pool/queue transition is unchanged.
- Active cores (GP #514): C stays 341, but only the first |κ'|/3 cores are active, and a
  guarantee on an inactive core is invalid (eq:guarantorsig). α' is still computed for
  all C cores.
- Host calls around this chapter (App. B): `grow_heap` took id 1 (GP #508), so `bless`
  is now 15 (was 14) and `assign` 16 (was 15). `assign` costs M_A = 1818 gas (was a flat
  10; GP #517). `bless` now answers HUH unless the caller is the manager (GP #519).
  Is-Authorized gains `grow_heap`, and an unknown host call there costs M_∅ = 1000 gas
  (was 10).

</div>

### Source pointers
- `conformance/authorizations_stf.ml` — `next_pool` (the one α' rule, sizes 8 and 80)
  and `apply_authorizations_stf` (vector-tested)
- `conformance/stf_guarantees.ml` — `update_auth_pools` (α' on block import, called from
  `trace_runner.import_block` after `process_guarantees`, which runs accumulation, so it
  reads φ') and the `core_unauthorized` pool check
- `lib/authorization.ml` — an early model (`transition_pool`, `transition_all`,
  `get_from_queue`, `remove_authorizer`), not on the import path. Do not quote its sizes:
  its queue length is the epoch length (600), not Q = 80, and `compute_authorizer` is a stub
- `docs/notes/authorization.md`; lectures `011-graypaper-lectures/31-authorization`,
  `31b-auth-pool-queue`

## Question bank

### Q1 ★ What are the authorizer pool and the authorizer queue? Who writes each, and how does an entry move from queue to pool?
<details><summary>Model answer</summary>

Both are per-core. The pool α[c] is the up-to-8 authorizer hashes a work-package
reported on core c may currently cite. The queue φ[c] is a fixed ring of 80 hashes,
indexed by slot. Every block, for every core, the entry φ'[c][H_T mod 80] is appended to
the pool and the pool is trimmed to its newest 8. Only a privileged service can write
the queue, from accumulation, through the `assign` host call; the pool is written only by
this transition. So a coretime buyer's service programs the queue, and the chain rotates
the queue into the pool on a schedule.

</details>

### Q2 ★ What is an authorizer, what does it authorize, and how does a package prove it is authorized?
<details><summary>Model answer</summary>

An authorizer is PVM logic, identified by Blake2b(code hash ++ configuration), that runs
in-core within a fixed gas limit and decides whether a given work-package, including its
opaque token, may execute on a given core, yielding an opaque trace on success. The
proof is not on-chain: the guarantors run the is-authorized entry point during
refinement, and the resulting trace is included in the work-report. On-chain logic only
checks that the authorizer hash the report names is in the core's pool at the time the
report is guaranteed (eq:reportcoresareunused). Is-Authorized (Ψ_I, eq:isauthinvocation)
gets G_I = 50,000,000 gas and code of at most W_A = 64,000 octets; its only argument is
the 2-byte core index, and it reads the package, token and configuration through
`fetch`. Its host calls are `gas`, `fetch` and, new in 0.8.0, `grow_heap`; any other
costs M_∅ = 1000 gas and returns WHAT (out-of-gas if that leaves the counter negative).
The design keeps the *policy* off-chain and cheap, and the *permission set* on-chain and
small.

</details>

### Q3 How is α' computed?
<details><summary>Model answer</summary>

Per core: if the guarantees extrinsic contains a report for that core, remove from the
pool the leftmost occurrence of the authorizer that report names (the sequence-minus
operator removes one element, not all equal ones). Then append the queue entry at index
H_T mod 80 from the *posterior* queue φ'. Then keep only the last 8. Because φ' is
defined by accumulation, this step runs after accumulation in the block.

</details>

### Q4 What are the sizes at tiny and full, and what happens when the pool is full?
<details><summary>Model answer</summary>

Pool capacity 8 and queue length 80 are the same in both configurations; only the number
of cores differs (2 tiny, 341 full). When the pool is full the new entry is still
appended and the oldest entry is dropped by the trim, so the pool never blocks and every
authorizer eventually ages out unless the queue re-supplies it. In 0.8.0 C is still
fixed, but only the first |κ'|/3 cores are active (GP #514): a guarantee on an inactive
core is invalid (eq:guarantorsig), while α' is still computed for every core.

</details>

### Q5 Who is allowed to change φ, and through what?
<details><summary>Model answer</summary>

Only the accumulate logic of the service that χ names as the assigner for that core,
via the `assign` host call (Appendix B, index 16 in 0.8.0, was 15; gas M_A = 1818): the
call takes a core index c, a pointer to 80 hashes and a successor service id a (r7..r9).
In order: it panics if those 80 × 32 bytes are not readable; returns CORE if c ≥ C; HUH
if the caller is not that core's assigner; WHO if a ∉ N_S (a ≥ 2^32; the service need not
exist); otherwise OK, replacing the whole 80-entry queue for the core and naming a as the
new assigner. Formally φ'[c] is read from the post-state of accumulating χ_A[c]
(eq:accpar); if the manager and the assigner both move χ_A[c] in the same round, the
manager's choice wins (the R(o, a, b) rule). The manager sets the assigners in the first
place through `bless` (restricted to the manager in 0.8.0, GP #519). Ordinary services
cannot touch the queue.

</details>

### Q6 Why does JAM separate authorization from the service that executes the work?
<details><summary>Model answer</summary>

To support both interaction patterns at once. Ethereum-style: the resource (gas) is bought
at submission by the same account that authored the transaction. Polkadot-style: a
parachain slot is bought for months by a team unrelated to the block author. JAM's
coretime is bought in advance and assigned to an *authorization agent*; the agent's
authorizer decides which packages may consume it. A service therefore never needs a
"transactor": the package carries a token, the authorizer judges it, and the core's pool
says which authorizers are live. The same service can be driven by many payers, and one
payer can drive many services.

</details>
