# A Field Guide to Divergence Classes

Divergences from one client's live fuzzer campaign: lasair's M1
campaign, on **Graypaper 0.7.2** (B1–B9), and then the first 0.8.0 batch
(at the end). Some details are 0.7.2's (B5's gas prices, for example),
but the classes are not version-specific. Each is read the
way the previous lesson teaches: *which* key diverged, *how* the bytes
differed, *why* the reference was right, and the **class** of bug it
taught — because the class is what you fix, and the class is what
generalizes to a protocol you have never seen.

A useful frame before the cases. Every early divergence lived in one
subsystem — accumulation, where services execute and emit output — along
three axes: does an output **exist**, in what **order**, with what
**value**. Deeper runs then reach *new* subsystems: validator
management, gas accounting, cross-service access. The taxonomy is not
trivia; it is where you look first.

---

## B1 — Ordering · the accumulation-output set

- **Diverged:** `0x10…` (accumulation output) and, downstream, `0x03…`
  (recent history β, which Merklizes over it).
- **The bytes:** same length, the same entries in a different order.

The accumulation output is a GP **set** of `(service_id, hash)` pairs.
We emitted it sorted by `service_id` alone. When one service accumulates
twice in a block (two rounds), it produces two entries with the *same*
id, and ours kept insertion order while the reference sorted by the full
key `(service_id, hash)`. The mis-ordered set hashed differently, and
because recent history commits to that hash, the error cascaded into a
second key.

**Class — canonical ordering.** Wherever the protocol defines a *set* or
an ordered sequence that reaches the trie, it has a total order, and you
must emit it in exactly that order. The fix is not "sort here"; it is to
make the canonical encoder the *only* path a set takes to state, so no
call site can ever emit one unsorted.

---

## B2 — Existence · host-call fault ordering

- **Diverged:** the accumulation output, statistics, and a service
  account — four keys, one cause.
- **The bytes:** an entry present that should not have been.

A service's `read` host call was handed an out-of-range key pointer for
a service that did not exist. We resolved the (missing) service first,
found nothing, and returned NONE — letting the invocation run on and
*yield* a result. The reference reads the key from memory **first**, the
bad pointer faults, and the invocation panics with no yield. One
spurious yield then cascaded into the output set, the statistics, and an
account.

**Class — memory-fault ordering.** A host call must read and validate
*all* of its input memory (faulting on any bad range) **before** any
service or state logic. The order of "check the pointer" versus "look up
the service" is not an implementation detail — it decides whether the
block panics or commits. Audit every host call for the same shape.

---

## B3 — Value · the cross-service read

- **Report:** seed 1071703991, step 6628, ~2,200 blocks deep.
- **Diverged:** one service-storage key, an 8-byte value, completely
  different.

A service accumulating two operands wrote an 8-byte value that depended
on data it `read` from **another service's** storage (service 1116759087,
key `"data"`, 128 bytes). We returned NONE for that read; the reference
returned the real 128 bytes, and the divergent input produced a
divergent fold. Two mistakes combined: the closure that loaded a foreign
service for cross-service calls loaded it with *empty* storage, and the
read path addressed foreign storage by the raw key instead of the full
state key interleaved with the *foreign* service's id.

Note the method: operands, entropy, and `info` were all verified
byte-exact *first*; only then did the thirteen `read` calls reveal the
one that came back empty — and a check of the pre-state confirmed the
value was really there.

**Class — cross-service access.** Any host call that can target a
foreign service must load that service's full data and key it correctly.
Storage keys interleave the *owning* service's id; preimages key by raw
hash. Get the keying wrong and the data is invisible even when loaded.

---

## B4 — Privilege · the writeback that wasn't gated

- **Report:** seed 2919757377, step 17,593, ~5,900 blocks deep — the
  first divergence in a *new* subsystem.
- **Diverged:** `0x07…`, the staging validator set ι, 2,016 bytes
  (six validators × 336), wholly replaced.

A `designate` host call set ι, but the invoker was service 0, the
**manager** — not the **delegate** (the privileged role that may set
validators). It had `bless`ed the delegatorship to itself earlier in the
same block. The reference kept ι unchanged; we applied the designate.

The subtle part — and the lesson — is *where* the check belongs. The
host call correctly returns **OK** (so the service's gas and statistics
are unchanged, which is why no other key diverged). The privilege is
enforced at the **writeback**: ι is committed only if the invoker held
the delegate role at the start of the round, exactly as the
authorization-queue write is gated on the round-start assigner and not
on the manager. A first attempt that rejected the call inside the host
function instead shifted the service's gas and broke a *different* key —
the gate caught it, and it was reverted.

**Class — privilege-gated writeback.** Privileged operations (bless,
assign, designate) record their request and return success; whether the
effect *survives* is decided at the merge, by who owned the privilege at
round start. Enforce at the writeback, never by faking a failure in the
host call.

---

## B5 — Gas · the checkpoint you could not afford

- **Report:** seed 1502007736, step 6306.
- **Diverged:** one service-storage key; `pre == exp ≠ got`. The
  reference left it unchanged at `ff09…`; we wrote `ff0d…`.

`pre == exp` is the tell: we modified a key the reference did not. A
service with a tiny gas budget wrote a storage value, then made a
`checkpoint` call — and that call ran it out of gas (gas 7, cost 10,
result −3). On out-of-gas, an invocation reverts to its last checkpoint.
Ours snapshotted the state *inside* the failing checkpoint call —
capturing the just-made write — so the revert kept it. The reference
runs out of gas *before* taking the snapshot, so it reverts to the
*previous* checkpoint, from before the write.

**Class — out-of-gas effect ordering.** A host call that cannot afford
its gas must not apply its effect. For most calls this is invisible —
out-of-gas reverts everything since the last checkpoint anyway. But
`checkpoint` is special: its effect *is* the revert target. A checkpoint
you cannot pay for must not become the place you roll back to.

---

## B6 — the sibling you fix before the fuzzer finds it

- **No report.** Found by auditing B3's class.

B3 fixed foreign-service *storage* reads. The same closure that loaded
foreign storage loaded foreign *preimages* as an empty list — so a
cross-service `lookup` (preimage by hash) of another service would return
NONE exactly as the storage read had. Same class, different host call.
Fixed by loading foreign preimages too, verified against the full
seed corpus, and banked — all before any lane reached it.

**Class — proactive closure.** This is the whole point of a taxonomy.
Every confirmed bug is a template: when you fix one instance, enumerate
the others in its class and fix them in the same change. One report
becomes many fixes, and the fuzzer's next run starts from a deeper, more
honest place.

---

## B7 — Value · the eject you could do twice

- **Report:** seed 2365413577, step 11,794, ~4,000 blocks deep.
- **Diverged:** a service **account record** (its `balance`) and, with it,
  the statistics. `pre + 173551 = exp`, but we had `pre + 2×173551`.

A clean *double*-count: we credited a service the same 173,551 twice. The
tell, again, was the magnitude — exactly twice the expected delta. The
trace showed service 0 making **two `eject` calls for the same target**.
Eject deletes a service and the caller inherits its balance. The first
succeeded. The second should have found nothing — the service was already
gone — and returned WHO. Instead it succeeded again and inherited the
balance a second time.

The cause is a subtle interaction with *parallel accumulation semantics*.
Within a round, every service's invocation sees the same **pre-round**
snapshot of all *other* services — that is correct, and it is why the
cross-service lookup reads an immutable base state. But a service the
invocation *itself* deletes must be shadowed: the running `other_services`
list dropped the ejected target, yet the second eject fell through to the
snapshot lookup, which faithfully re-found it. The pre-round base is the
right floor for *other* services' state; it must not resurrect entities
*this* invocation has destroyed.

The fix records ejected ids for the invocation and excludes them from
resolution, so the second eject sees nothing and WHOs — matching the
reference exactly.

**Class — in-invocation mutation visibility.** A snapshot-based view of
foreign state is right for *base* state and wrong for the invocation's own
deletions and creations. Whenever you resolve an entity against an
immutable snapshot, ask: what has *this* execution already changed about
it? The snapshot does not know, and it will happily hand you back
something you just destroyed.

## B8 — Privilege · the role you cannot give yourself away

- **Report:** seed 3070419911, step 20,674, ~6,950 blocks deep — the deepest
  the fuzzer had reached at the time.
- **Diverged:** the privileges record C(12). Its `delegator` field (bytes
  12–15) should hold a service id; we had it zeroed.

Two blesses, one block. First the **manager** blessed the delegate role to
service 1444745969 — legitimate, and we applied it. Then that same service —
now the delegate, but *not* the manager — blessed the delegatorship back to
zero. We applied that too, zeroing the field. The reference kept 1444745969.

The rule: a per-core **assigner** may be moved by its own current holder
(assignment is an operational, per-core privilege). But the **manager**,
**delegate**, and **registrar** are single global roles that *only the manager*
may reassign. A delegate cannot bless its own role away. Our writeback used the
assigner rule for all of them — "the manager or the current holder may change
it" — which let the delegate zero itself.

The fix gates the delegate and registrar writebacks on `is_manager` alone,
matching the manager field; only the per-core assigner keeps the dual rule.

**Class — privilege ownership.** Not every privilege is owned the same way.
Per-resource privileges (a core's assigner) can be moved by the holder;
singleton roles (manager, delegate, registrar) are the manager's alone. Read
the ownership rule per field — a uniform "holder or manager" is too coarse.

## B9 — Identity · the service id you minted twice

- **Report:** seed 3743464522, step 5741.
- **Diverged:** four keys at once — a service account and its storage, plus a
  reference to it in another service's storage, all differing by one in the
  low byte (`…74` vs `…75`).

A `new` host call mints a fresh service id from `I() = blake(E(s) ‖ η′₀ ‖ E(t))
mod range + 2^16`, advancing by 42 per creation and **skipping any id already
taken**. We computed `983279732` and used it — but that id had been created at
an earlier step and already existed in state. The reference's collision check
saw it taken and bumped to `983279733`; we did not, so we **reused the id and
overwrote the existing service**, corrupting its account and storage.

The gap was in *what counts as taken*. Our check looked only at the current
service and the invocation's `other_services` overlay — not at services that
exist in **state**. A service created in a prior block lives in state, reached
on demand through the snapshot lookup, not in the overlay. So our "first free
id" wasn't free at all.

The fix makes `taken` consult the state (the same snapshot lookup the
cross-service reads use) and runs the minted id through the collision check, so
a new id skips every existing service — exactly as the reference does.

**Class — identity allocation.** When you allocate an identifier that must be
globally unique, "unique" means against *all* existing holders, not just the
ones in your working set. An allocator that only checks its local overlay will
hand out a live id and silently clobber what was there.

## Postscript: the first Graypaper 0.8.0 batch

The official fuzzer's first 0.8.0 run against lasair (image 2.0.0) stopped
six sessions. One was the fuzzer's own problem (its block source got
stuck while lasair matched the reference at every step). The other five
were four lasair bugs, each fixed on 2026-09-30 with a unit test that
fails without the fix. Every class is one you have met above:

- **Value · statistics.** Service statistics wrote a service's imports and
  exports as 0; the Graypaper sums them over the service's work digests.
  Invisible until a digest carried 65,535 of either.
- **Gas · the out-of-range fetch.** A `fetch` whose offset lies past the
  end of the value was priced on the 0 bytes copied; the Graypaper
  prices it on the requested length. 86 gas short, one storage key off.
- **Identity · `new` again.** After a taken id, `new` advanced the next
  free service id from the raw seed instead of the checked id it had just
  assigned, so the following id was one short: B9's class, in a new place.
- **Codec · signed comparison.** A compact natural of 2⁶³ or more (a work
  report's `auth_gas_used` of 2⁶⁴ − 70) was encoded in one byte because
  the comparison was signed. The report hash and the extrinsic hash came
  out wrong, and a valid block was rejected as `bad_extrinsic_hash`.

Each session is now banked as a regression (lasair's
`regression-reports/`), replayed by the gate through both the JSON path
and the binary socket path, since a codec bug is invisible to one of them.

## Why this is how you learn the protocol

You could read the Graypaper's privilege rules a dozen times and not
feel them. One divergence where the *manager* tries to designate and the
reference quietly refuses teaches the delegate/manager distinction
permanently — because you watched 2,016 bytes go wrong and traced them
back to a single ungated writeback. The fuzzer is a Socratic examiner:
it does not state the rule, it shows you a block where you broke it, and
makes you reconstruct the rule to make the bytes match.

Keep a field guide of your own. Every divergence, one entry: the key,
the diff, the reason, the class. The list is short — far shorter than
the number of bugs — because real protocol bugs cluster. Learn the
classes and you stop debugging a client. You start understanding a
protocol.
