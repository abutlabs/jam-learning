# Borrowed Failures: the Seed Campaign

> **This lesson is history.** The seed campaign ran during lasair's M1
> work, on **Graypaper 0.7.2**. Its seeds and corpora are archived with
> lasair's `gp-0.7.2-final` tag and are not replayed against 0.8.0, whose
> wire format and state transition changed; the 0.8.0 regression corpus
> is being rebuilt from the published 0.8.0 fuzzer reports. The method
> carries over unchanged.

After the thousand curated vectors were green and the binary codec was
oracle-proven, lasair faced the gap every conformance team hits: the
official fuzzer is private. You cannot rehearse against an examiner you
have never met.

But you can rehearse against everyone else's exams. The jam-conformance
repo publishes `fuzz-reports/` — failure traces from real fuzzing runs
against other teams' clients: jamduna, typeberry, boka, jamzig, and a
dozen more. Each report carves the few blocks around a divergence into
ordinary trace-vector files: pre-state, block, expected post-state.
**205 seeds, 746 vectors, every one a bug that broke somebody.**

When lasair first ran them: **210 failures**. Three days later: zero.
This lesson is about what lived in that gap — because none of it was
visible from the curated vectors.

## Why curated vectors lie by omission

Curated vectors are honest blocks in tidy circumstances: the same six
validators forever, services that never probe wild pointers, gas
budgets that never overflow a block. The pass list proves your happy
path. It says nothing about the rules that only *bind* under stress:

- **Validator rotation didn't exist.** At every epoch boundary the sets
  must rotate — `(γ_k′, κ′, λ′, γ_z′) = (Φ(ι), γ_k, κ, ring-root)` —
  but with identical sets each epoch, copying the old bytes passes 1,000
  vectors. The seeds changed the staging set mid-session and the whole
  chain of derived state (fallback sealer schedule, guarantor
  assignments, signature key sets) came due at once.
- **The block gas ceiling never bound.** Tiny's accumulation budget is
  20M gas; curated blocks never exceeded it. Seed sessions queue three
  10M reports, and GP's `accseq` answers with *gas-prefix rounds*: two
  reports merge into round one, the third waits — together with round
  one's deferred transfers — for round two. A service that deliberately
  panics in round two must not undo round one. Sequencing you cannot
  observe until something exceeds the budget.
- **Nobody ever signed from the previous epoch.** A guarantee carried
  across an epoch boundary verifies against λ′, under the *previous*
  rotation's assignment. One seed (guarantee at slot 47, block at slot
  50, epoch length 12) was rejected as `bad_signature` for months of
  hypothetical fuzzing — fixed in an afternoon because the seed's
  expected state said plainly: this block is valid.

## The adversarial services

The deepest finds came from the fuzzer's own test services, which are
small adversaries. They probe `fetch` with out-of-context selectors,
pass wild buffer pointers, transfer with maxed-out u64 amounts, and
end scripts with deliberate panic instructions. Three favorites:

**The mistagged error.** Work-result errors carry a discriminant —
out-of-gas is 1, panic is 2, and so on. Lasair's trace pipeline had
flattened every error to "some error" and re-encoded them all as 1.
The service *decodes its operand's result and branches on the exact
variant*. One wrong tag sent it down a different code path with
different gas and different storage writes. The corpus answer key
showed a single state byte off; the service's own log line — it logs
every instruction it decodes — named the wrong branch.

**The 1-in-256 amnesiac.** Storage state keys interleave the service id
at even byte positions. Account records live under keys starting
`0xFF`. Lasair's storage loader skipped any key starting `0xFF` as "an
account record" — which silently destroyed the storage of every service
whose id is `0xff mod 256`. Such a service reads its init flag, finds
nothing, logs `Skipping instruction execution, not initialized`, and
halts early. The fix is to match the account key's *exact* layout
(`0xFF` + id at odd positions + zeros) instead of one byte. Heuristics
on hash-shaped keys eventually collide; the corpus found the collision
for us.

**The wild pointer that must kill you.** Per the Graypaper, a host call
whose output range is unwritable PANICS the invocation. Lasair's `read`
soft-failed instead — leaving the service alive to run 41,000 more gas
than the reference before dying somewhere else. The expected statistics
pinned the reference's death at gas 94,157; when the fix landed, lasair
died at exactly 94,157. Conformance is agreement about *failure points*
as much as success.

## Process lessons, paid for in hours

Three meta-lessons from this campaign are worth more than any single
rule:

1. **A commit message is not a patch.** The `read` fix above was
   "committed" once before — a patch script staged it in memory,
   asserted on a second edit, and died before writing the file. The
   message landed; the code didn't. Hours later the "already-fixed" bug
   was re-diagnosed from scratch. Verify with `grep` that the change is
   *on disk* before trusting your own history.
2. **The boundary is part of the spec.** With every vector green, a
   ten-minute adversarial smoke test — random bytes as protocol frames —
   killed the target process: a malformed *frame length* threw past the
   per-message exception handler. Against the real fuzzer that is one
   poisoned frame from a failed run. Decode errors answer an error
   message; framing errors drop the connection; nothing, ever, drops
   the process.
3. **Borrow failures, not code.** Published test data — vectors,
   recorded sessions, failure seeds — exists for every implementer to
   use, and this whole lesson is built on it. Other teams'
   *implementations* are a different matter: a JAM client must be your
   own work, and any consultation of another implementation — even just
   reading its source to settle an ambiguous Graypaper sentence — must
   be disclosed at submission. Keep a dated disclosure file in the repo
   from day one (lasair's is `docs/DISCLOSURES.md`), and prefer the
   spec text plus the corpus: an answer key tells you *that* you are
   wrong without telling you someone else's *how*, which is exactly the
   kind of help that keeps the work yours.

## The scoreboard, and what it bought

On the 0.7.2 corpus, at the end of the campaign:

```
fuzz-report seeds      746/746
recorded sessions      204/204   (forks included, byte-exact)
families over socket  1000/1000  (genesis-chained, binary)
curated gate            23/23    (never regressed once)
```

Eleven distinct Graypaper rules were fixed in this campaign, every one
provoked by a specific failing vector, verified against the full corpus
and the curated thousand before commit. That is the forensic loop from
the earlier lessons running at full speed — with one upgrade: when your
examiner is private, **borrow everyone else's failures.** They already
paid for them.
