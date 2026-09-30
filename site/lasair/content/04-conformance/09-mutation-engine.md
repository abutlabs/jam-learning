# Becoming the Examiner: the Mutation Engine

Every test so far has come with an answer key. Curated vectors ship an
expected post-state. Recorded sessions ship reference responses. Even
the borrowed-failure seeds ship the exact state the block should
produce. We have been taking closed-book exams with the grading rubric
attached.

The official fuzzer does not work that way. It takes a **valid** block
and deliberately corrupts it — flips a bit in a signature, lies about a
gas limit, duplicates a ticket, points a guarantee at the wrong core —
then fires thousands of these at your client and watches for three
sins:

1. **Crash** — the process dies (one bad frame length once killed ours).
2. **Hang** — it never answers.
3. **State corruption** — it changes state for a block it should reject.

There is no expected post-state for a corrupted block, because the
correct answer is always the same: reject it, change nothing, stay
alive. We call that the **trilogy**: *never crash, never hang, reject
without state change.*

## The no-answer-key trick

How do you test "reject without state change" when nobody computed the
right state? You bracket the mutant with ground truth:

```
import a block we KNOW is valid     → record the resulting state root
send a MUTATED copy of it           → assert: crash? hang? error returned?
send the ORIGINAL valid block again → assert: SAME root as a clean run
```

If the mutant left any residue in the target's state, the real block
that follows produces a different root than it does on an untouched
chain. **The valid chain itself becomes the detector.** No answer key
required — only blocks we already trust.

## Surgical mutations, fourteen classes

Pure random bytes mostly die at the codec layer ("bad list count",
"out of bounds"). The interesting probes are *targeted* — one class per
defensive layer:

- **Header crypto** — flip a bit in the seal, the entropy-source VRF, or
  the parent hash; name the wrong author; use an out-of-range author.
- **The extrinsic commitment** — flip a bit in the header's
  extrinsic-hash.
- **Decode & framing** — truncate the block, or append junk after it.
- **Ordering / signatures** — reorder or duplicate assurances and
  tickets, or flip a bit in a credential — then *recompute the
  extrinsic-hash* so the mutation is internally consistent.

That last detail is the whole game. And it taught us something the
curated vectors never could.

## The layered-commitment result

A JAM block is wrapped in nested cryptographic commitments. Watch what
happens when you try to slip a corrupted extrinsic past them:

- Change the extrinsic and leave the header alone → the
  **extrinsic-hash** no longer matches → `bad_extrinsic_hash`.
- Change the extrinsic *and recompute* the extrinsic-hash to match →
  now the **header seal** is wrong, because the seal is a signature over
  the whole unsigned header *including that hash* → `bad_seal`.

There is no keyless gap between the two. Every single one of our
"reorder", "duplicate", and "signature-flip" mutants — the ones that
recompute the hash — is caught by `bad_seal`, not by the inner rule we
were aiming at. We *cannot* reach the assurance-ordering or gas-ceiling
checks by mutation alone, because an attacker without a validator's key
cannot forge the seal. That is not a gap in the test — it is the
security property itself, demonstrated.

(The inner STF rules — ordering, gas, guarantor assignment — *are*
tested, by the [borrowed-failure seeds](lesson.html?lesson=04-conformance/08-borrowed-failures): those
are real, validly-signed adversarial blocks that get past the envelope
and exercise the rules directly. The two suites cover the two halves.)

## The first thing it caught

On its very first run the engine found a real bug. The "garbage-append"
class — a valid block followed by a few junk bytes — was **accepted,
1000 out of 1000**. The target decoded the block and silently ignored
the trailing bytes. A strict client must reject a frame it did not fully
consume; the fix was a one-line `require_consumed` check. With every
vector already green, only adversarial input could have surfaced this.

## Using it

```bash
# one pass over a family, writing a per-class report
dune exec bin/fuzz_driver.exe -- \
  --mutate vectors/traces/fuzzy --mutate-report /tmp/mutation.json

# soak: loop every family for 30 minutes with fresh seeds each round
dune exec bin/fuzz_driver.exe -- --mutate-soak 30 \
  --mutate vectors/traces/fallback \
  --mutate vectors/traces/safrole \
  --mutate vectors/traces/fuzzy
```

Each report row gives, per class: how many mutants fired, how many were
correctly rejected (with a real rejection reason), and any
crash / hang / wrong-accept — and the exact mutant, so a failure becomes
a regression test.

**See it live:** the [Mutation Lab](mutation.html) renders the real
results of a full run — every class, the wall that caught it, and the
trilogy scoreboard.

## The honest caveat

This is *our* examiner, not *the* examiner. Passing it raises
confidence; it does not prove conformance the way the real fuzzer will.
But it converts "we have only ever imported honest blocks" into "we have
fired thousands of hostile ones and held the trilogy every time" — the
difference between hoping to pass the exam and having rehearsed it.
