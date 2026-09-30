# The symptom

*A case in six parts: a real investigation from 2026-09-28, in the order it happened, with
the queries that answered each question. The runs were on the course author's machine, so
you read their numbers here. Every query works on your own runs, and
[lab 4](lesson.html?lesson=exercises/lab-4-replay-the-case-study) has you reproduce the
failure on your own `lasair6` and answer the same questions from your own data.*

## The call

The `lasair6` network is six lasair validators on one genesis, with jamswap's DEX on top.
Earlier that day, a mixed network (three lasair, three PolkaJam) had passed a full
one-hour soak on lasair 2.1.2, and `lasair6` had passed 25 minutes but failed a full hour,
for a reason nobody could see yet. So the hour on `lasair6` was run again, this time with
every node reporting into the dashboards.

```sh
LASAIR_IMAGE=ghcr.io/abutlabs/lasair:2.1.2 LASAIR_DATA_DIR=/data soak/run lasair6 3600
```

The network came up at 15:39:15 UTC; every series and annotation of that hour carried the
run id the stack gave it. The load started a minute later. An hour and three minutes after
that, the verdict:

```text
VERDICT (orders + chain): FAIL
```

## What the report said

| Check | Result |
|---|---|
| offered load | **FAIL**: 1,440 offered, 519 refused |
| clearing SLO | **FAIL**: 0.6643 (572 cleared, 289 still open after 600 s) |
| SEALED zero-loss | **FAIL**: 33 sealed orders stuck |
| one head, liveness, finality, authoring, state parity | PASS, all five |
| clear latency | p50 160 s, p99 1,624 s |

And the reason for the refusals, from the load generator's log:

```text
op buy failed: HTTP Error 400: Bad Request: open-order limit reached (50 per market) — cancel or let some clear before placing more
```

## Sorting the evidence

First, the rule from lesson 4.3: sort the failures into chain and application.

- **Chain: all green.** One head on 630 of 630 samples, 659 finalized slots hash-checked, no
  conflict, every validator authoring, and byte-identical DEX state on all six nodes. The
  network agreed with itself the whole hour.
- **Application: all red.** And the three failures are one failure seen three ways. Orders
  stopped clearing, so each account's open orders piled up to the cap of 50, so new orders
  were refused. Nothing was *lost*: the 289 misses are orders still open, not expired or
  dropped. The sealed orders stuck for the same reason.

So the question is not "is the chain broken?" but **"why did orders stop clearing on a
healthy chain?"**

## What else we knew

Three earlier results from the same day, from jamswap's published soak results
(`soak/reports/2026-09-28.md` in the jamswap repository):

| Net | lasair | Duration | Result |
|---|---|---|---|
| 3 lasair + 3 PolkaJam (`lasair-pj`) | 2.1.2 | 1 hour | PASS, 0 refused |
| 6 lasair (`lasair6`) | 2.1.2 | 1 hour | FAIL, 387 refused |
| 6 lasair (`lasair6`) | 2.1.2 | 25 minutes | PASS, 0 refused |

Two things follow. The same load passes when PolkaJam nodes share the work, so the problem
is something lasair does alone. And lasair alone passes 25 minutes but fails an hour, so it
is something that gets **worse with time**. Not a crash, not a wrong answer: a slowdown.

## Suspects

1. The DEX itself (its matching, its API).
2. The chain's consensus (heads, finality).
3. The validators' work on the DEX's rounds: guaranteeing, which includes refining each
   round's work-package.

Suspect 2 has an alibi: every chain check passed, on every sample. Suspect 1 is unlikely
since the same DEX passes on `lasair-pj`, but it is where the symptom showed, so it is
where to look first: *when* did it start, and what did the DEX see?

## How the run was opened

The run was recorded by jamswap's first monitoring setup, the predecessor of this stack:
Prometheus and Grafana only. Its container logs were never collected (there was no Loki
yet); lesson 5.4 deals with that. The investigation opened it the way you open yours, one
dashboard per question:

```sh
./obs link <run> -d dex           # the DEX: lesson 5.2
./obs link <run> -d obs-lasair    # lasair validator duties: lesson 5.3
./obs link <run> -d chain         # Chain health: the detour in lesson 5.2
```

In the queries of this track, `<run>` stands for a run id: the investigation's, or, when
you follow along, yours. For a single number about a finished run, evaluate at its end
(lesson 3.7, *Querying a finished run*).

The run's annotations marked its story on every graph (times UTC):

| Time | Mark |
|---|---|
| 15:39:15 | blue: `lasair6 up: validators lasair,lasair,lasair,lasair,lasair,lasair; lasair ghcr.io/abutlabs/lasair:2.1.2` |
| 15:40:28 | blue: `soak: load on` |
| 16:40:39 | blue: `soak: load off, draining 180 s (offered 1440, refused 519, busy 0)` |
| 16:43:25 to 16:43:28 | red and green: one mark per check, red for `clearing SLO`, `SEALED zero-loss`, `orders`, `offered load` and the verdict, green for the chain checks |
| 16:43:28 | blue: `lasair6 down` |

Next: [The DEX backlog](lesson.html?lesson=05-case-study/02-the-dex-backlog)
