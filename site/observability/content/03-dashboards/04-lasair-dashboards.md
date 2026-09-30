# The lasair dashboards

A client's own dashboards go deeper than the platform ones. lasair keeps six, as code, in
its own repository. That repository is not public, so with the public checkouts of this
course your Grafana has no `lasair` folder. This lesson is a tour of what they show, so
you know what a client's own dashboards are for; it ends with the queries that give you
their main answers in Explore, on your own `lasair6` run, from the metrics the published
lasair image exports. (If you do have a lasair checkout next to the others, `./obs up`
mounts its folder like jamswap's.)

Four (`lasair-*`) are generated from lasair's own metrics and add a **node** selector. Its
list comes from `lasair_status_alive_time`, a series only lasair exports, so on a mixed
network these dashboards show only the lasair nodes even though other clients export
`jam_*` series too. The other two, validator duties and Memory, came from jamswap's first
monitoring setup.

## lasair node overview (`lasair-node`)

**Is each lasair node healthy right now?**

- Stats: best height (highest node), finalized height (lowest node), finality lag worst
  node (PASS ≤ 12 blocks), nodes short of validators (PASS = 0: fewer validators connected
  than wanted), blocks rejected on import, errors logged.
- A **Nodes** table from `jam_node_info`: version, GP version, spec, validator index.
- Rows for the chain (heights, lag, authored and imported per minute, rejects by reason,
  re-orgs, import and authoring time, block size, extrinsics), peers (by role, validators
  connected against wanted, Safrole tickets, assurances and audits), memory (RSS and OCaml
  heap; states, blocks and shards held), and warnings (per minute by component, JIP-3
  sender health, and the warn/error log lines).

Use it as the lasair counterpart of Chain health, with the reasons attached.

## work-package lifecycle (`lasair-wp`)

**Where does a work-package's time go, and why do packages expire before they are
guaranteed?** The most important lasair dashboard for anything built on JAM, and the one
the case study is about.

Every time here is measured on the guarantor that accepted the package from its builder,
from that acceptance to each stage: *shared* with the core's co-guarantors (CE-134),
*refined*, *cosigned* (enough signatures), *guaranteed*, *included* in a block on the best
chain, *available*, *audited*, *accumulated*, *finalized*.

- **Stats**: received, refused at intake, accepted, accumulated, **Expired · PASS = 0**,
  **Abandoned · PASS = 0**, in flight now, oldest in flight.
- **Where the time goes**: bars of the median and p90 time from acceptance to each stage,
  in pipeline order, and how many packages reached each stage. *A big step between two bars
  is where the time goes.*
- **Outcomes and expiry**: outcomes by reason, **how far expired packages got**
  (`last_stage`), age at outcome, **anchor age on arrival** (with the window of 8 marked),
  expired per 10 minutes, in flight, intake refusals by reason.
- **Pipeline flow**: CE-133 work-items, CE-134 co-guaranteeing, CE-135 guarantees per
  minute, the guarantor queue, **refine time per package**, co-sign time per share, and the
  guarantor's warning and error lines.

The rule behind the expiry panels: a package must be reported while its anchor is among the
last 8 blocks. A package that arrives with an old anchor, or waits too long before
*guaranteed*, expires.

## lasair networking (`lasair-net`)

**What is lasair saying on the network, how fast do peers answer, and what fails?** Traffic
is split by JAMNP-S protocol: UP-0 block announcements and each CE request kind.

- Stats: streams per minute, bytes in and out per second, network errors (range),
  **stream-credit timeouts · PASS = 0**, validator peers on the worst node.
- Traffic by protocol: streams, messages, bytes received and sent.
- Latency: request latency p50 and p95 by protocol, stream lifetime p95, threads waiting on
  the network.
- Errors and stream accounting: errors by protocol and reason, timeouts, streams
  outstanding, send failures.
- Peers and connections: peers by role, connections, dials and refusals.

## lasair PVM (`lasair-pvm`)

**How fast does lasair's PVM refine work, and for which service?** A guarantor, a
co-guarantor and an auditor each refine work-items; each item is timed once, around its
refine call.

- Stats: items refined, gas refined, **mean gas/s**, p95 item refine time, error digests
  (PASS = 0), refine faults (PASS = 0).
- Gas per second by service (5-minute average and latest item), time per item p50 and p95,
  items by service and result, and **PVM busy** (refine seconds per second: near 1 means
  the node spent the whole time refining; it can exceed 1 when refines overlap).
- Per package: guarantor refine time, co-sign time, audit evaluation time, Is-Authorized
  time and gas, error digests by result.

The *Mean gas/s (range)* stat is
`sum(increase(jam_refine_gas_total[$__range])) / sum(increase(jam_refine_seconds_sum[$__range]))`:
gas used divided by wall time, over the whole time range. Higher is faster. The *Refine
gas/s by service* graph is the same over a moving 5-minute window, with `rate`.

## lasair validator duties (`obs-lasair`)

**Is every lasair validator doing its whole job?** Each line is one node, in events per
minute. Authoring, co-signing (CE-134), distributing guarantees (CE-135), guaranteeing
(CE-133), assuring and auditing should all move while work flows; panels titled
*refusals* and *failures* should stay at zero.

- Stats: silent authors (none in 5 min, PASS = 0), CE-134 mismatched (PASS = 0: a
  co-signature over a different report means non-determinism), refine failures, own blocks
  rejected, audit judgments rejected (all PASS = 0), work guaranteed (PASS > 0).
- Panels: blocks authored, CE-134 co-signing and refusals, CE-133 guaranteed and CE-135
  included, assurances, audits, the guarantor pipeline (ready, held, busy),
  **Refine seconds (average per package)**, **Package anchor age on arrival (window = 8)**
  and **Packages expired (anchor too old), per 10 min**.

It reads lasair's older metric names (`lasair_blocks_authored_total`,
`lasair_guarantor_refine_seconds`, `lasair_ce133_expired_total`...), which older and newer
builds both export, so it works on lasair 2.1.2, the image jamswap runs. That made it the
case study's main lasair view. One exception: the anchor-age panel reads
`lasair_ce133_anchor_age_slots`, a metric added during the case study itself, so 2.1.2 has
no anchor-age data.

## Memory (`obs-memory`)

**Does lasair's memory stay bounded as the chain grows?** RSS and the OCaml heap should
flatten while finalized height keeps climbing.

- The verdict stat: **RSS per finalized block, 30-minute slope, worst node · PASS ≤ 8 KB
  (after warm-up)**. It is `deriv(RSS) / deriv(finalized height)`: how many bytes of
  memory each finalized block costs. Near zero means memory is bounded; a steady positive
  value means a leak proportional to chain length.
- Info stats: peak RSS, largest OCaml heap, GC compactions this run.
- Panels: RSS per node, RSS against finalized height, the slope over time, OCaml heap and
  top heap, live bytes, compactions, block-tree entries per table, GRANDPA stores.

The slope needs time to settle: ignore it for the first half hour of a run.

## Their answers, in Explore, on your own run

lasair builds from before the `jam_*` work, such as 2.1.2, export only `lasair_*` names:
on the lasair dashboards, validator duties and Memory would work in full (except the
anchor-age panel), and the others only in their panels that read `lasair_*` names. Every
panel is a query, so you do not need the dashboards to ask their questions. Start
`lasair6` with load (`./dex up`, then `./dex load`), let it run ten minutes, open
**Explore** in your Grafana with the *Prometheus* datasource, and set `RUN` in these
queries to your run id (`./obs current lasair6`):

| Question (the panel it comes from) | Query |
|---|---|
| How long does each node take to refine a package, on average? (*Refine seconds*, validator duties) | `rate(lasair_guarantor_refine_seconds_sum{run_id="RUN"}[5m]) / rate(lasair_guarantor_refine_seconds_count{run_id="RUN"}[5m])` |
| And the latest package, per node? | `lasair_guarantor_refine_seconds{run_id="RUN"}` |
| How many work-items does each node guarantee per minute? (*CE-133 guaranteed*) | `sum by (node) (60 * rate(lasair_ce133_guaranteed_total{run_id="RUN"}[5m]))` |
| How many guarantees land in blocks? (*CE-135 included*) | `sum by (node) (60 * rate(lasair_ce135_included_total{run_id="RUN"}[5m]))` |
| Are packages expiring? (*Packages expired, per 10 min*) | `sum by (node) (increase(lasair_ce133_expired_total{run_id="RUN"}[10m]))` |
| Is every node authoring? (*Blocks authored*) | `60 * rate(lasair_blocks_authored_total{run_id="RUN"}[2m])` |
| Is the guarantor falling behind? (*guarantor queue*) | `lasair_ce133_queue_depth{run_id="RUN"}` |
| Is memory bounded? (*RSS per node*, Memory) | `lasair_mem_rss_bytes{run_id="RUN"}` |
| Is each node connected to the others? (*validators connected*) | `lasair_validators_connected{run_id="RUN"}` |

On a healthy `lasair6` under the default load you should see refine times of a fraction of
a second to a few seconds per package, most guarantees made by `lm0` (the guarantor the
DEX's builder tries first), few or no expiries, and every node authoring. A node that
refined nothing in the window shows `NaN` in the first query (zero divided by zero): read
it as "no packages", not as an error.

Track 5 turns these same queries on a failing run, and lab 4 has you make one fail.

Next: [The DEX and Soak runs dashboards](lesson.html?lesson=03-dashboards/05-dex-and-soak-runs)
