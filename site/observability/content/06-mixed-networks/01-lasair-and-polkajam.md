# lasair and PolkaJam on one chain

A mixed network runs validators of different clients on one genesis. They must agree on
every block, every state root, every finalized head, while each is written independently.
It is the strongest test a client can face, and the hardest network to observe, because
the clients do not report the same way.

## Generate: start the mixed network

jamswap's `lasair-pj` runs six validators, each holding only its own key: lasair on
validators 0 to 2, stock PolkaJam on 3 to 5, one genesis, one finality (GRANDPA, 5 of 6
votes, so neither client finalizes without the other). With the stack up (lesson 0.4),
from the jamswap checkout:

```sh
./dex down                 # if lasair6 is still up: one network at a time is plenty
./dex up NET=lasair-pj     # three lasair, three PolkaJam, and the DEX
```

The first time, `up` builds a PolkaJam image on your machine: the build downloads
PolkaJam's public release (pinned by version and checksum) and wraps it. Because the stack
is running, `up` also points the PolkaJam nodes' JIP-3 telemetry at it
(`--telemetry obs-jip3:9910`). Start the stack first: a network started without it runs
without telemetry until you take it down and up again.

| Nodes | Client | How it reports |
|---|---|---|
| `lm0`, `lm1`, `lm2` | lasair 2.1.2 | its own `/metrics` (scraped; `lasair_*` names on this build), JIP-2 through a reader beside it, its container output |
| `pj3`, `pj4`, `pj5` | PolkaJam 0.1.29 | JIP-3 telemetry, its JIP-2 RPC, its container output |

PolkaJam serves no `/metrics`. Its only telemetry option is a JIP-3 push endpoint, so the
stack sees it through the JIP-3 receiver (events, and the metrics derived from them) and
the JIP-2 exporter (slots and block hashes). lasair is scraped directly, and each lasair
node has a reader, a small JIP-2 server labelled with `org.abutlabs.obs.jip2.node`, so
the JIP-2 exporter compares all six nodes. On top runs the DEX.

## Analyse: what the platform dashboards show

`./obs status` lists the run with every path, in this shape:

```text
lasair-pj      <your run id>       builder 1/1 up  dex 1/1 up  jip2 nodes 6  jip3 nodes 3  lasair 3/3 up  netwatch 1/1 up
```

On the **Network overview**, six rows and 2 clients. The *paths* column tells you how each
node is seen: **3** for a PolkaJam node (JIP-3, JIP-2, and jamswap's netwatch, which counts
as `metrics`), **2** for a lasair 2.1.2 node (JIP-2 and netwatch; its own metrics carry
only `lasair_*` names). The *version* column reads `0.1.29`, GP `0.8.0`, for the PolkaJam
nodes, from their JIP-3 node information message, and is empty for the lasair nodes:
JIP-2 cannot tell, and this lasair build exports no `jam_node_info`.

On **Chain health**, the one-head check is the JIP-2 exporter comparing **block hashes**
across all six nodes at the common slot, whatever client each runs. This is the view no
single client can give you: lasair knows its own head, PolkaJam knows its own, and only a
collector that asks both can say they are the same block.

Chain health's **Block life** row, empty on `lasair6`, fills here: the PolkaJam nodes send
every event it needs, so all five stages appear, from `authored` to `finalized`. On the
author's run (2026-09-29), the median time to finality moved between 7 and 13 seconds
over its first twenty minutes, with the other four stages within a few hundredths of a
second of a block first being seen: nearly all of a block's life is waiting for
finality. Watch *Time to finality
per node* for the three PolkaJam lines, and compare runs: a time to finality that grows
from run to run is a regression, whichever client caused it.

## What is fair to compare across clients

| Compare freely | Compare with care | Do not compare |
|---|---|---|
| best and finalized slot, finality lag | block import time (each client times its own import) | work-package stage times (different stages, lesson 2.1) |
| one head, finality conflicts (by hash) | refine time (lasair times each item; JIP-3's refined event carries per-item costs) | client-specific metrics |
| blocks authored per client | peers (definitions of "validator peer" can differ) | protocol labels (`CE-128` against `ce128`) |

When a comparison looks alarming, check first that both sides measure the same thing.

## What the soaks said

jamswap's published soak results for 2026-09-28 (`soak/reports/2026-09-28.md` in the
jamswap repository) tell the mixed network's story:

| lasair | Duration | Result |
|---|---|---|
| 2.1.1 | 10 min | PASS: 240 offered, 0 refused |
| 2.1.1 | 1 hour | FAIL (load): 17 of 1,440 refused, cause unseen |
| 2.1.2 | 1 hour | PASS: 0 refused, SLO 1.0000, p50 50 s / p99 523 s |

The failure on 2.1.1 had a cause nobody could see: the load generator logged only "Bad
Request", and its log went away with the network. That is itself an observability lesson.
Since then the soaks keep `loadgen.log` and `dex.log` in the run's folder, the load
generator prints the DEX's reason, and the stack's Loki keeps every container's output for
30 days.

In every run, one head held on every sample, finality had no conflict, and state parity
agreed on all six nodes: lasair and PolkaJam held byte-identical DEX state at the same
finalized block. And the same DEX load that the all-lasair network failed at the time
(track 5) passed here, because PolkaJam's co-guarantors refined fast enough.

Run your own: `soak/run lasair-pj 600` from the jamswap checkout, and compare its row in
the Soak runs table with a `soak/run lasair6 600`.

## Why this matters for observing

A mixed network gives you something a single-client network cannot: **two independent
implementations watching each other**. Each client reports not only what it did, but, in
its telemetry, what it thought of its peers. The next lesson shows what that revealed.

Next: [What cross-client telemetry reveals](lesson.html?lesson=06-mixed-networks/02-what-cross-client-telemetry-reveals)
