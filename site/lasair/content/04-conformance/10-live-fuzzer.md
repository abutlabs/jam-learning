# The Live Fuzzer: Anatomy of a Divergence

The mutation engine made lasair its own examiner, and the borrowed seeds
let it sit other teams' exams. Eventually you face the real one: you
submit a Docker image to the conformance fuzzer, it runs your client
against a reference implementation for up to a million steps, and it
hands back a single verdict — **Failed**, with a report.

This lesson is not about a particular bug. It is about the *skill* every
protocol engineer needs and almost no tutorial teaches: how to read a
state-root divergence and turn it into a root cause. Master this and the
fuzzer stops being a wall and becomes a teacher that never runs out of
lessons.

Lasair learned it on Graypaper 0.7.2, where every fuzzer lane
(Minifuzz, L2a, L2b, L3a, L3b) ended green and M1 was passed; the
examples here come from that campaign. The fuzzer has since moved to
0.8.0. Its first 0.8.0 batch against lasair's 2.0.0 image found four
bugs, all fixed on 2026-09-30 in 2.0.1 (the next lesson ends with them),
and the full 0.8.0 lane sweep is still ahead.

## The loop

The shape of a live conformance campaign:

1. **Submit** an image (a specific version or commit hash — each is a
   per-build audit trail).
2. The fuzzer runs **preflight** (a handshake and a few blocks) then a
   **fuzz session**: it generates adversarial blocks, imports each into
   both your client and a reference, and compares the **posterior state
   root** after every block.
3. The first time the roots disagree, the session stops and emits a
   **report**: the handful of blocks around the divergence, as ordinary
   trace vectors (pre-state, block, expected post-state), plus a
   `report.json` naming exactly which state keys differ.
4. You reproduce it locally, find the cause, fix the **class** of bug,
   prove you broke nothing, and resubmit.

"Failed" is not bad news. **Failed-with-a-report is the fuzzer handing
you the next bug to kill.** A run that fails at step 17,000 taught you
more than a run that failed at step 600.

## No partial credit — and why that is good news

The comparison is a single hash over the *entire* posterior state. One
wrong byte anywhere fails the whole block. There is no "92% correct."

This sounds brutal, and for a while it is: a client sits at "fails
almost immediately" until its weakest deterministic rule becomes
bit-exact. But the same property is why strong teams seem to pass "in
one moment." Once the last divergent rule is fixed, *every* key matches
at *every* step and the client flips from fails-fast to
passes-indefinitely all at once. You are never grinding toward a
percentage. You are closing the gap to a **phase transition**.

## Reading the report

A `report.json` is small and it is the whole game. The fields that matter:

```json
"error": { "state_diff": {
  "roots":   { "exp": "0x4d73…", "got": "0x4bb3…" },
  "keyvals": [ { "key": "0x07000000…",
                 "diff": { "exp": "0x2105…", "got": "0x151e…" } } ]
}}
```

Read it in three moves:

- **How deep did it get?** `stats.imported` is the number of blocks that
  matched before the stop. Track it per seed — but never compare it
  *across* seeds. Each fuzz run picks a different seed, and the depth to
  the first divergence is a property of the seed, not your progress. A
  run that dies at 2,000 and a run that dies at 6,000 can both be
  forward motion.
- **What diverged?** Each `keyvals` entry is one state key your client
  got wrong. The *first byte* of the key tells you the state component:
  `03` recent history β, `06` entropy η, `07` staging validators ι,
  `0a` availability ρ, `0d` statistics π, `10` accumulation output;
  anything else is a **service-storage** key. A divergence in `07` is a
  validator-management bug; one in a service-storage key is an
  accumulation/execution bug. The component *is* the first hypothesis.
- **How wrong?** Compare `exp` and `got` byte for byte. Same length,
  one byte off? A counter or a sort order. Wildly different from byte 0?
  A whole value replaced. **And check the pre-state**: if
  `pre == exp ≠ got`, the reference *left the key unchanged and you
  modified it* — you applied something that should not have happened.
  That single observation has cracked more divergences than any amount
  of staring at the block.

## The forensic loop

The bytes tell you *where*. To find *why*, reproduce and trace:

1. **Replay.** `seed_check` (wrapped by `replay-report.sh`) runs the
   report's trace steps through your real STF in-process and prints the
   first failing step with its diverging key and expected-vs-computed
   bytes. The reference already told you the answer; replay lets you
   watch your client get it wrong.
2. **Trace the host-call I/O.** A service executes inside the PVM by
   making host calls — `read`, `write`, `lookup`, `info`, `designate`,
   `checkpoint`, `gas`. Turn on the host log and watch the failing
   service's calls in order. The wrong byte in the post-state always
   traces back to a host call that returned the wrong thing, or an
   effect applied at the wrong time. In one campaign the culprit was a
   single `read` of *another service's* storage that came back empty; in
   another, a `gas` value going negative on a `checkpoint`.
3. **Find the divergent input, not the divergent output.** Your PVM is
   bit-identical to the reference's (prove this once with a replay rig
   and never doubt it again). So if the output differs, an *input* to
   the computation differed — a host call's return value, an operand
   decoded from state, an effect that should have been gated. Hunt the
   input.
4. **Fix the class, not the case.** When you find that foreign-service
   *storage* reads returned empty, ask immediately: what about foreign
   *preimage* lookups? Same bug, different host call — fix both before
   the fuzzer ever reaches the second. This is the move that bends the
   campaign from one-bug-per-submission to one-*class*-per-submission.

## Two rules paid for in lost days

- **Trust the trace, not the analogy.** A divergence will often *look*
  like a previous one — same service, same neighbourhood of state. The
  pattern is a useful prior, never a diagnosis. More than once the
  "obvious" cause was wrong and the byte-level trace pointed somewhere
  entirely different. Let the bytes overrule your intuition.
- **Verify before you ship.** A plausible fix that passes the one seed
  in front of you can break three you already had. Every fix runs the
  full regression gate — the curated suites, the codec oracle, the
  mutation smoke, and *every banked divergence* — before it is allowed
  near a resubmission. A green seed is a hypothesis; a green gate is a
  fact. One campaign's "obvious" fix was caught by the gate making a
  different seed worse, and reverted within the minute.

The next lesson is a field guide: six real divergences from one client's
live campaign, each read exactly this way — the diff, the reason for the
diff, and the class of bug it taught.
