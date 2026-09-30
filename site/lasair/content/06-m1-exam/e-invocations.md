---
title: "E · PVM invocations and host calls (Appendix B)"
duration: 90 min
exam_portion: fixed
gp_chapter: E
gp_words: 6066
gp_tex: text/pvm_invocations.tex
lasair: lib/pvm_host.ml, conformance/refine.ml, conformance/accumulate_stf.ml, conformance/accumulate_stf_v2.ml
---

# E · PVM invocations and host calls (Appendix B)

<span class="lecture-badge">M1 Understanding · E · Appendix B, invocations and host calls</span>

Appendix B is where the PVM meets the protocol: the three places the machine is invoked
(is-authorized, refine, accumulate), the context each one may touch, and the host calls
that touch it. This is also where most of lasair's live-fuzzer divergences lived, so the
war stories are dense. Every rule below was checked against the 0.8.0 tex; host-call
numbers and gas constants are 0.8.0.

## Chapter sheet

### Result constants
| Name | Value | Meaning |
|---|---|---|
| OK | 0 | success |
| NONE | 2⁶⁴ − 1 | item does not exist |
| WHAT | 2⁶⁴ − 2 | host-call name unknown |
| OOB | 2⁶⁴ − 3 | inner-PVM memory index not accessible |
| WHO | 2⁶⁴ − 4 | index (service, machine) unknown |
| FULL | 2⁶⁴ − 5 | storage full or resource already allocated |
| CORE | 2⁶⁴ − 6 | core index unknown |
| CASH | 2⁶⁴ − 7 | insufficient funds |
| LOW | 2⁶⁴ − 8 | gas limit too low |
| HUH | 2⁶⁴ − 9 | operation invalid, including insufficient privilege |

Inner-PVM outcomes returned by `invoke`: HALT 0, PANIC 1, FAULT 2, HOST 3, OOG 4.
Results are placed in register 7; arguments come from registers 7 to 12. Every host call
first charges its gas g and exits oog if ϱ < g; an unknown call costs 1000 and returns
WHAT. Memory-sized costs are `base + ⌈rate × octets / 1024⌉`.

### The three invocations
| | Is-authorized Ψ_I | Refine Ψ_R | Accumulate Ψ_A |
|---|---|---|---|
| where | in-core, by guarantors | in-core, by guarantors | on-chain, by everyone |
| code | package's authorizer code (≤ 64 000 octets, else BIG; ∅ → BAD) | service code at the lookup-anchor time via historical lookup (≤ 4 000 000, else BIG; missing service or code → BAD) | service's current code (missing or oversize → silent no-op) |
| entry pc | 0 | 0 | **5** |
| gas | G_I = 50 000 000 | the work item's refine gas limit | the gas given by the accumulation scheduler |
| arguments | E₂(core) | E(core, item index, service, var payload, H(package)) | E(slot, service, item count) |
| context | none | (inner machines m, exports e) | a *pair* of implication contexts (regular x, exceptional y) |
| state access | none | historical lookup only | full partial state via the context |
| output | trace blob or error, gas | output blob or error, exports, gas | post-state, deferred transfers, yield hash, gas used, provisions |
| host calls | gas, grow_heap, fetch | + historical_lookup, export, machine, peek, poke, pages, invoke, expunge | + lookup, read, write, info, bless, assign, designate, checkpoint, new, upgrade, transfer, eject, query, solicit, forget, yield, provide |

**Accumulate specifics.** Before running, the service's balance is credited with every
deferred transfer in the item list. The context is initialised by I(state, service) with
next-free-id = check(H(E(service, η', H_T)) mod (2³² − 2¹⁶ − 2⁸) + 2¹⁶): a pseudo-random
service id, skipping any that exist. The collapse C picks the **exceptional** dimension y
if the machine ended in oog or panic, otherwise x; a 32-octet output becomes the yield.
Only `checkpoint` ever writes y (y ← x), so a service that never checkpoints and panics
loses everything it did.

### General functions (gas, grow_heap and fetch in all three invocations; lookup, read, write and info in accumulate only)
| # | Name | Gas | What it does | Notable results |
|---|---|---|---|---|
| 0 | gas | 48 | r7 ← remaining gas | |
| 1 | grow_heap | 275 + 121/page | r7 = desired end page of the RW region; r7 ← the heap end after the call (h, or the requested end if it grew); extends W pages [a, r7) if r7 > h and within bound b | oog if unaffordable (the GP text leaves ϱ unchanged; the 0.8.0 vectors drain it to 0, GP #533, and lasair follows the vectors); no-op (cost 275) if r7 ≤ h or r7 > b |
| 2 | fetch | per case, see below | r10 selects what to copy into memory at r7, from offset r8, up to r9 octets; r7 ← total length | NONE if nothing selected; panic if destination not writable |
| 3 | lookup | 600 + 248/KiB | preimage of hash at r8 for service r7 (self if own id or 2⁶⁴−1); copy to r9, offset r10, len r11 | NONE; panic on unreadable hash or unwritable out |
| 4 | read | 2407 + 1736/KiB key + 248/KiB value | storage value of key mem[r8..+r9] of service r7 (self if 2⁶⁴−1) into r10, offset r11, len r12 | NONE; panic on unreadable key |
| 5 | write | 2442 + 3358/KiB key + 216/KiB value | set own storage mem[r7..+r8] ← mem[r9..+r10]; r10 = 0 deletes; r7 ← previous length or NONE | FULL if threshold balance exceeds balance after the write |
| 6 | info | 703 | encode account r7 (self if 2⁶⁴−1): code hash, balance, threshold, min accumulate gas, min memo gas, octets, items, gratis, created, last accumulated, parent; copy to r8 | NONE |

`fetch` selectors: 0 protocol parameters (a fixed list of constants, each fixed-width), 1 entropy η',
2 authorizer trace, 3 any item's extrinsic [r11][r12], 4 our item's extrinsic [r11],
5 any item's import segment [r11][r12], 6 our import [r11], 7 the encoded package,
8 authorizer config, 9 authorizer token, 10 refine context, 11 all work-item summaries,
12 one summary [r11], 13 one payload [r11], 14 all accumulate items, 15 one accumulate
item [r11]. Which are available depends on the invocation (accumulate gets only 0, 1, 14,
15; is-authorized only 0 and 7–13; refine everything but 14 and 15, and in refine
selector 1 returns the zero hash rather than real entropy).

### Refine functions (context: machines m, exports e)
| # | Name | Gas | What it does | Results |
|---|---|---|---|---|
| 7 | historical_lookup | 1125 + 264/KiB | like lookup but via Λ(account, lookup-anchor time, hash): the preimage as it was available then | NONE; panic on bad pointers |
| 8 | export | 3521 | append mem[r7..+min(r8, 4104)] zero-padded to a 4104-octet segment; r7 ← segment index (offset ς + count) | FULL if ς + \|e\| ≥ 3072; panic if unreadable |
| 9 | machine | 1862 + 112/KiB code | create inner PVM from code mem[r7..+r8] with pc r9, empty RAM, flag ⊥; r7 ← new id (lowest free) | FULL if 63 machines exist (checked first, before the code pointer); panic if unreadable; HUH if deblob(code, pc) fails |
| 10 | peek | 377 + 336/KiB | copy inner machine r7's memory [r9..+r10] into outer [r8..] | WHO, OOB, panic if outer not writable |
| 11 | poke | 297 + 224/KiB | copy outer [r8..+r10] into inner r7's memory [r9..] | WHO, OOB, panic if outer not readable |
| 12 | pages | free 212 + 118/page; alloc 275 + 121/page; setmode 130 + 29/page; invalid 80 | on machine r7, pages [r8, r8 + r9): r10 = 0 free, 1 zero + R, 2 zero + W, 3 keep + R, 4 keep + W | WHO; HUH if r10 > 4, r8 < 16, range overflows, or mode-change on an unmapped page |
| 13 | invoke | 968 + g_R | mem[r8..+112] = E₈(g_R) ++ 13 × E₈(regs); run inner machine r7 with that gas and those registers; write back gas left and registers; r7 ← HALT/PANIC/OOG/FAULT/HOST, r8 ← fault address or host index; charges 968 + g_R and refunds the unused g_R′, so the net cost is 968 plus the inner gas actually used | WHO (no refund: the full 968 + g_R is charged); panic if the 112 octets are not writable; **oog before running if ϱ < 968 + g_R** |
| 14 | expunge | 335 | remove machine r7; r7 ← its pc | WHO |

An inner machine record is (code, ram, pc, gas-charged flag). On a HOST exit the stored pc
is advanced past the `ecalli` so the next `invoke` continues after it; on FAULT it stays
on the faulting instruction so the caller can `pages` and retry.

### Accumulate functions (context pair (x, y))
| # | Name | Gas | What it does | Results |
|---|---|---|---|---|
| 15 | bless | 422 + 20/item | r7 manager, r8 → 4·C octets of per-core assigners, r9 delegator, r10 registrar, r11 → n pairs (service, gas) of always-accumulate | **HUH unless caller is the manager**; WHO if m, v, r not valid ids; panic on unreadable |
| 16 | assign | 1818 | core r7: queue ← 80 hashes at r8, assigner[c] ← r9 | CORE if r7 ≥ C; HUH unless caller is that core's assigner; WHO |
| 17 | designate | 1100 + 302/validator | ι ← r8 validator key sets of 336 octets at r7 | HUH unless r8 is a permitted validator-set size (the set 𝕍 of the Definitions appendix) and the caller is the delegator |
| 18 | checkpoint | 103 | y ← x; r7 ← remaining gas | |
| 19 | new | 3855 | create service: code hash at r7, code length r8, min accumulate gas r9, min memo gas r10, gratis r11, desired id r12; new account starts with balance = its own threshold, one request for (hash, length), created = slot, parent = caller; caller pays the threshold | panic if the hash is unreadable or r8 ≥ 2³²; HUH if gratis ≠ 0 and caller is not manager; CASH if caller would fall below its threshold; registrar may pick an id below 2¹⁶ (FULL if taken); otherwise id = next-free-id and the context's next id advances by 42 through check() |
| 20 | upgrade | 1028 | own code hash ← mem[r7..+32], min accumulate gas ← r8, min memo gas ← r9 | panic if unreadable |
| 21 | transfer | 575 + l (l only when the transfer is queued; any failure costs 575) | deferred transfer to r7 of r8 tokens with gas l = r9 and 128-octet memo at r10; deduct now, deliver later | WHO if destination unknown; LOW if l below the destination's min memo gas; CASH if balance would fall below threshold |
| 22 | eject | 458 | delete service r7 whose code hash is E₃₂(caller id), which holds exactly 2 items (items = 2·\|requests\| + \|storage\|; together with the request check, that means one request and no storage) and whose request (hash at r8, length max(81, octets) − 81) is expired; credit its balance to caller | WHO; HUH if not exactly 2 items or request missing/unexpired |
| 23 | query | 643 | status of own request (hash at r7, length r8): r7 ← count + 2³²·x, r8 ← y (+ 2³²·z) | HUH if r8 is not a valid length (≥ 2³², checked before the hash pointer); NONE if no request |
| 24 | solicit | 2193 | request preimage (hash at r7, length r8): new → []; [x, y] → [x, y, t] | HUH if r8 ≥ 2³² (checked before the hash pointer); HUH if already requested in another state; FULL if balance drops below threshold |
| 25 | forget | 3250 | (hash, length): [] or expired [x, y] → drop request and preimage; [x] → [x, t]; [x, y, w] with y expired → [w, t] | HUH if r8 ≥ 2³² (checked before the hash pointer); HUH otherwise |
| 26 | yield | 98 | own yield ← 32 octets at r7 | panic if unreadable |
| 27 | provide | 3980 + 2264/KiB | provide preimage data mem[r8..+r9] for service r7 (self if 2⁶⁴−1), recorded in provisions | HUH if r9 ≥ 2³² (checked before the data pointer); WHO if service unknown; HUH if that service has not requested (H(data), len) with empty status, or if already provided |

Expiry throughout uses D = C_expungeperiod = 19 200 slots (tiny 32): a request
"unavailable since y" may be forgotten or ejected once y < t − D. The Graypaper derives
D as the lookup anchorage (14 400) plus an eight-hour audit margin so that historical
lookups give the same answer whenever an audit could happen.

### Privilege model (χ), as the host calls enforce it
- **manager** (χ_m): may `bless` (rewrite all of χ) and create gratis services.
- **assigners** (χ_a, one per core): may `assign` that core's authorizer queue and hand
  the role on.
- **delegator** (χ_v): may `designate` the staging validator set ι.
- **registrar** (χ_r): may create services with chosen ids below 2¹⁶.
- **always-accumulate** (χ_z): services accumulated every block with a gas allowance
  even without work.

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in Appendix B</div>

- **`grow_heap` = 1 inserted**, so every other host-call index shifted up by one
  (fetch 1→2, lookup 2→3, … provide 26→27). lasair's `pvm_host.ml` `Id` module uses the
  0.8.0 numbering (GP 0.8.0 Phase 4).
- **Gas per host call** moved from a flat constant (0.7.2: g = 10 for every call, unknown
  ones included, except `transfer` at 10 + t) to a per-call base plus per-1024-octet memory terms, all listed in the
  Definitions appendix
  (e.g. read 2407 + 1736/KiB key + 248/KiB value, write 2442, new 3855, provide 3980).
  Unknown calls cost 1000.
- **Inner machines carry the gas-charged flag**; `machine` validates the requested pc
  with `deblob(p, i)`, not just the blob: the code must be valid from instruction 0 and end
  in a basic-block terminator, and i must be a valid instruction start (pvm.tex, deblob).
  `machine` also gained FULL at 63 inner machines, checked before the code pointer (only
  the gas charge comes earlier).
- **`invoke` pre-check**: the cost is 968 + g_R and is charged before the inner run, so
  an unaffordable `invoke` exits oog without running (confirmed against vectors). In 0.7.2
  `invoke` cost 10 and the inner budget never came out of the outer counter; now the outer
  counter pays 968 + g_R and gets the unused g_R′ back.
- **`bless` from a non-manager returns HUH**: a new case in Ω_B in the 0.8.0 text (0.7.2
  had only the panic and WHO cases). The vectors' Deviations note cites GP #519 and #558
  may change it again, so lasair implements it behind one named predicate
  (`bless_refuses_non_manager`, currently false to match the vectors). Set it to the
  strict text and 36 of the 1,406 vector and trace checks fail, among them the accumulate
  vector `bless_from_non_manager` and a dozen fuzzy traces: the published vectors really
  do let a non-manager call `bless`.
- **`designate` takes a count**: r8 = z key sets, gas 1100 + 302·z, HUH unless
  z ∈ 𝕍 = {3c : 2 ≤ c ≤ C} (multiples of three from 6 to 3C, which is 1023 on the full
  spec; eq. valcount) and the caller is the delegator. 0.7.2 read exactly V = 1023 keys;
  V is no longer a constant.
- **Length check first**: `query`, `solicit`, `forget` and `provide` now return HUH when
  the length register is not in ℕ_L (2³² or more), before the hash or data pointer is read.
- **`fetch` selector 0** lost V, N, W_E and W_P from the parameter blob; none of the four
  is a constant in 0.8.0.
- Unchanged despite appearances: `fetch` selectors 14 and 15 and the registrar path in
  `new` already existed in 0.7.2.
- New accumulate vectors exist for behaviours that had none in 0.7.2: always-accumulate,
  assign from a non-assigner, upgrade, foreign preimage lookup, provide, create service,
  designate with an invalid count, preimage length bound, transfer to a live service,
  bless from a non-manager (`docs/GP_0_8_0_PLAN.md` Phase 4).

</div>

### War stories
<div class="lasair-connection">

**B2, the host call that faulted too late** (seed 431662357, step 595). A `read` arrived
with an out-of-range key pointer for a service that did not exist. lasair resolved the
missing service first, returned NONE, and let the invocation run on and yield. The
reference reads the key from memory *first*; the bad pointer panics the invocation and
there is no yield. One spurious yield cascaded into θ, the statistics and an account.
Rule learned: every host call validates all input memory before any state logic; the
order decides panic versus commit. Check the tables above: each "panic if unreadable"
row comes before the WHO/NONE rows for exactly this reason.

**B5, the checkpoint you could not afford** (seed 1502007736, step 6306). A service with
7 gas left wrote storage and then called `checkpoint`, which costs more than 7. lasair
took the snapshot inside the failing call, so the oog revert kept the write. The
reference charges first, cannot, and never snapshots, so the revert goes back to the
previous checkpoint, before the write. Rule learned: a host call that cannot pay must
have no effect, and for `checkpoint` the effect *is* the revert target. The gas went to
−3 (7 − 10 under 0.7.2's flat charge; 0.8.0's checkpoint costs 103), which is why lasair's forensics log "gas −3" as the signature of this bug.

Both are recorded in the Divergence Lab (`divergences.html`) and
`docs/CONFORMANCE_RETROSPECTIVE.md` §6, which observes that every live-fuzzer divergence
was in accumulate's service-execution output: existence (B2), ordering (B1) or value (B3).

</div>

### Source pointers
- `lib/pvm_host.ml`: `dispatch`, `execute_host_call`, `host_call_cost` and the `Gas`
  table, `host_gas`, `host_grow_heap`, `host_fetch`,
  `host_lookup`, `host_read`, `host_write`, `host_info`, `host_historical_lookup`,
  `host_export`, `host_machine`, `host_peek`, `host_poke`, `host_pages`, `host_invoke`,
  `host_expunge`, `host_bless`, `host_assign`, `host_designate`, `host_checkpoint`,
  `host_new`, `host_upgrade`, `host_transfer`, `host_eject`, `host_query`, `host_solicit`,
  `host_forget`, `host_yield`, `host_provide`, `is_range_readable`, `is_range_writable`,
  `service_threshold`, and the `refine_host_ids` / `accumulate_host_ids` /
  `is_authorized_host_ids` sets (0.8.0 numbering, `Id` module)
- `conformance/refine.ml`: `execute_refine`, `build_refine_args`, `exports_root`
- `conformance/accumulate_stf.ml`: `execute_accumulate`, `build_accumulate_args`,
  `apply_accumulate_stf`; `accumulate_stf_v2.ml` for the dependency-layered scheduler
- `docs/notes/pvm.md` (host-call section); Divergence Lab B2, B3, B5

## Question bank

### Q1 ★ Name the three PVM invocations, where each runs, what code it runs, and what it may read or write.
<details><summary>Model answer</summary>

Is-authorized runs in-core on the guarantors with the package's authorizer code, sees
only the core index and the package, and can touch nothing; it yields a trace or an
error. Refine runs in-core with the service's code as it was at the lookup anchor,
sees the package, its item, the trace, imports and extrinsics, may create inner machines
and export segments, and may read historical preimages, but has no access to chain
state. Accumulate runs on-chain with the service's current code, receives the available
work digests and deferred transfers, and may read and write its own storage and
preimages, transfer, create and upgrade services, and if privileged rewrite χ, the
authorizer queue or the staging validator set. Entry pc is 0, 0 and 5 respectively.

</details>

### Q2 ★ Explain the accumulate context pair (x, y), checkpoint, and the collapse function.
<details><summary>Model answer</summary>

Accumulation runs against two copies of an "implications" record: the regular one x,
which every host call mutates, and the exceptional one y, which only `checkpoint` writes
by copying x into it. When the machine finishes, the collapse C chooses: if the exit was
out-of-gas or panic, the result is y (state, deferred transfers, yield, provisions), so
everything since the last checkpoint is discarded; otherwise the result is x, and a
32-octet output blob becomes the yield. The implication record holds the service id, the
partial state, the next free service id, the transfer list, the yield and the
provisions. This is the mechanism that makes a panicking service revert cleanly without
touching any other service's work.

</details>

### Q3 ★ How is a new service id chosen, and why can two services never collide by design?
<details><summary>Model answer</summary>

The context initialiser sets next-free-id = check(H(E(caller id, η', H_T)) as a 32-bit
number mod (2³² − 2¹⁶ − 2⁸) + 2¹⁶), where check() walks forward until it finds an id
not in the accounts. Each `new` uses that id and advances the counter by 42 through
check() again. Ids below 2¹⁶ are reserved for the registrar, which may choose them
explicitly (FULL if taken). Because the sequence depends on the entropy accumulator and
the slot, no service can predict it, so nobody can grief the block author; and the
Graypaper says that if a block nevertheless attaches one id to two services the block is
invalid. lasair's B9 ("the service id you minted twice") broke the check() half of this
rule: its `new` minted an id an earlier block had already created and overwrote that
service.

</details>

### Q4 What does `fetch` do and why does it exist as one call with sixteen selectors?
<details><summary>Model answer</summary>

`fetch` copies protocol-provided data into the machine's memory: selector 0 is the
protocol-parameter blob (a fixed list of constants), 1 the entropy, 2 the authorizer trace, 3 to 6 extrinsics and imports by
index, 7 to 13 the package and its items and payloads, 14 and 15 the accumulate item
list. The caller passes destination, offset and length in registers 7 to 9 and gets the
total length back, or NONE if the selector does not apply to this invocation. It exists
because the Graypaper deliberately avoids passing unbounded data as invocation
arguments: RAM allocation from arguments could inflate gas unpredictably. Each selector
has its own gas base and per-KiB rate.

</details>

### Q5 ★ Describe `read` and `write` including their failure results, and the balance rule.
<details><summary>Model answer</summary>

`read` takes a service (own id or 2⁶⁴ − 1 for self), a key pointer and length, a
destination, an offset and a length; it panics if the key range is unreadable, returns
NONE if the service or key is absent, and otherwise copies the value and returns its
full length. `write` takes key pointer and length and value pointer and length; length 0
deletes; it panics on unreadable ranges, and returns FULL without writing if the
account's threshold balance (base deposit plus per-item and per-octet deposits, less any
gratis offset) would
exceed its balance after the write; on success it returns the previous value's length
or NONE. Reading another service's storage is allowed; writing is not.

</details>

### Q6 What is the order of checks inside a host call, and why does it matter?
<details><summary>Model answer</summary>

First gas: if the call's cost exceeds the counter, exit oog with nothing changed. Then
input memory: any unreadable argument range panics the invocation. Only then state
logic: service lookups, privilege checks, balances, producing WHO, HUH, CASH, FULL and so
on. The order is protocol-visible because a panic reverts to the last checkpoint and
yields nothing, while a NONE lets the service continue and possibly yield. lasair's B2
divergence was exactly a state lookup performed before the pointer check. Two 0.8.0
exceptions come before the pointer check: `machine` returns FULL when 63 inner machines
already exist, and `query`, `solicit`, `forget` and `provide` return HUH when the length
register is 2³² or more.

</details>

### Q7 How do `machine`, `invoke`, `peek`, `poke`, `pages` and `expunge` fit together?
<details><summary>Model answer</summary>

They let refine run nested PVMs. `machine` creates an inner machine from a code blob
and a pc (HUH if the blob or pc is invalid, FULL at 63 machines). `pages` maps, unmaps
or changes the access mode of page ranges in the inner memory, never below page 16.
`poke` and `peek` move data in and out. `invoke` hands the inner machine a gas budget
and thirteen registers via a 112-octet block in memory, runs it, writes back the
remaining gas and registers, and reports HALT, PANIC, OOG, FAULT with the address, or
HOST with the call index; on HOST the stored pc is advanced past the `ecalli` so the
outer program can service the call and `invoke` again, on FAULT it stays put so the
outer program can map the page and retry. After HALT or PANIC the stored pc is 0 (Ψ
returns 0 on a final halt). `expunge` deletes the machine and returns its pc. The outer
call charges 968 plus whatever the inner machine used, and needs 968 + g_R available up
front or it exits oog without running the inner machine.

</details>

### Q8 ★ Walk through `transfer`: arguments, checks, and when the balance moves.
<details><summary>Model answer</summary>

Registers: destination, amount, a gas limit l that is added to the receiver's accumulate
budget when it processes the transfer, and a pointer to a 128-octet memo. Panic if the
memo is unreadable. WHO if the destination does not exist. LOW if the gas is below the
destination's minimum memo gas. CASH if the sender's balance minus the amount would be
below its own threshold. Otherwise the
amount is deducted from the sender now and a deferred transfer (source, destination,
amount, memo, gas) is appended to the context; it is credited to the destination at the
start of that service's accumulation, when the destination's balance is bumped by the
sum of incoming transfers before its code runs. Cost 575 plus the forwarded gas, but the
forwarded gas is charged only when the transfer is queued: a WHO, LOW, CASH or panic
outcome costs 575.

</details>

### Q9 What does `solicit`, `query`, `forget` and `provide` implement together?
<details><summary>Model answer</summary>

The preimage request lifecycle. `solicit` records that the service wants a preimage of
a given hash and length: the request status starts empty. Anyone can then include the
data in the preimages extrinsic, or a service can `provide` it during accumulation, after
which the status becomes [available-since]. `forget` moves through the states: an
available preimage becomes unavailable-since [x, t]; a request that has been unavailable
longer than the expunge period can be dropped, along with the preimage octets, and a
re-solicited one [x, y, w] with an expired y collapses to [w, t]. `query` reports the
count of slots and their values. `solicit` returns FULL if the request's footprint would
push the account below its threshold, which is how storage is paid for.

</details>

### Q10 What are `bless`, `assign` and `designate`, and who may call each?
<details><summary>Model answer</summary>

`bless` rewrites the whole privilege record χ: manager, per-core assigners, delegator,
registrar and the always-accumulate set with gas allowances; in 0.8.0 only the current
manager may call it (HUH otherwise). `assign` writes a core's 80-entry authorizer queue
and may hand the assigner role to another service; only that core's current assigner
may call it, and a bad core index returns CORE. `designate` sets the staging validator
set ι from an array of z 336-octet key sets (z in r8); only the delegator may call it,
and in 0.8.0 z must be a permitted validator-set size, z ∈ 𝕍 = {3c : 2 ≤ c ≤ C}
(multiples of three from 6 to 3C, 1023 on the full spec), since the validator count is no
longer a constant. These are the only ways the protocol's governance
parameters change, which is why the manager service is the closest thing JAM has to a
root account.

</details>

### Q11 What does `eject` do and what conditions must hold?
<details><summary>Model answer</summary>

It lets a service reclaim a dead child. The target must exist, not be the caller, and
have as its code hash the 32-octet encoding of the caller's id, meaning it was created
to be ejectable by the caller. It must hold exactly two items (items =
2·|requests| + |storage|) and have a request for the given hash with length
max(81, octets) − 81, which together mean one preimage request and no storage, and that
request must be unavailable for longer than the expunge period. Then the account is deleted and
its balance added to the caller's. Anything else is WHO or HUH. lasair's B7 divergence
("the eject you could do twice", seed 2365413577, step 11794) was a second `eject` of the
same target within one round re-finding it in the pre-round snapshot and inheriting the
balance again; a service the invocation itself deletes must be shadowed.

</details>

### Q12 ★ What changed in host-call gas between 0.7.2 and 0.8.0, and what does it mean for a service author?
<details><summary>Model answer</summary>

0.7.2 charged a flat 10 gas per host call, plus the forwarded gas on a queued `transfer`
(the schedule lasair ran until its Phase 4 migration). 0.8.0 gives
every call a measured base cost plus memory-proportional terms per 1024 octets: `gas` is
48, `checkpoint` 103, `read` 2407 plus key and value rates, `write` 2442, `new` 3855,
`provide` 3980 plus 2264 per KiB, `invoke` 968 plus the inner budget, and an unknown
name costs 1000. Together with the per-basic-block instruction pricing (a block costs
max(cycles − 3, 1) gas from the pipeline model, eq. gascostforblock), a service's gas now
reflects real work: a storage write's base cost is about 2400 virtual CPU cycles' worth of
computation. For a service author the budgets now bind: measured on lasair's jamswap
services under 0.8.0, one in-PVM ed25519 verification costs about 5.29M gas (1.31M under
0.7.2), against a whole work-report's accumulate allowance G_A = 10 000 000, so signature
checks belong in refine (G_R = 5 000 000 000). lasair's Phase 4 migration keeps the table
in one place (`Gas` and `host_call_cost` in `lib/pvm_host.ml`); handlers charge the same
amounts inline, and `LASAIR_GAS_CHECK=1` cross-checks the two on every call except
`grow_heap`, `invoke` and `transfer`, whose charge depends on more than the registers.

</details>

### Q13 How is the refine invocation's code found, and why is the expunge period defined the way it is?
<details><summary>Model answer</summary>

Refine does not use the service's current code. It uses the historical lookup Λ on the
service account at the package's lookup-anchor time to fetch the code hash named by the
work item; if the service or code is missing the item's result is BAD, if the code
exceeds 4 000 000 octets it is BIG. Historical lookup must return the same answer at any
time an audit might run, up to two epochs after accumulation, and the lookup anchor may
itself be up to 14 400 slots old, so the expunge period is set to 14 400 plus an
eight-hour margin, 19 200 slots: a preimage cannot be forgotten while any auditor might
still need it.

</details>

### Q14 What happens when accumulate is invoked for a service whose code is missing or too large?
<details><summary>Model answer</summary>

The invocation does not run at all. The result is the partial state with only the
deferred transfers credited to the service's balance, no transfers out, no yield, zero
gas used and no provisions. This is a silent no-op rather than an error because the
accumulation scheduler has already committed to processing the item and the funds must
not be lost. A transfer-only item list is not a special case: if the code exists it runs
(transfers come first in the item list, eq. accone), and because both context dimensions
start from the already-credited state, even a panic keeps the credit.

</details>

### Q15 What are the fixed sizes a host-call implementer must know?
<details><summary>Model answer</summary>

Hashes 32 octets; a validator key set 336 octets; a transfer memo 128; an export segment
4104 with at most 3072 exports and 3072 imports per package; the `invoke` register block
112 octets (8 for gas plus 13 × 8); an authorizer queue 80 × 32 octets; per-core
assigners 4 octets each; always-accumulate entries 12 octets (4-octet id plus 8-octet
gas); at most 63 inner machines; pages below index 16 are never mappable; service ids
below 2¹⁶ are reserved for the registrar.

</details>
