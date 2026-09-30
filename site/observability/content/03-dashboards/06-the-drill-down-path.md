# When something looks wrong: the drill-down path

A red stat, a missing node, a line that stops. The first reaction is to guess. The better
one is to walk down, each level answering one question, until the answer is in front of
you.

```text
  1. Run tile        is the run active, ended on purpose, or stalled?
        │
  2. whole run       (if the range does not cover it) set it to the run's own start → end
        │
  3. Nodes table     which node, and how: advancing, stopped during the run, net stalled?
        │
  4. Node detail     why it stopped: Why it stopped, Last words, Lifecycle
        │
  5. Explore         its logs across the whole net, or any metric by hand
```

Two rules make the top of this path trustworthy, and both come from the same idea: judge a
run by what happened *during* it, not by the clock at the moment you happen to be looking.

- **"Stopped during the run" is relative, not absolute.** A node counts as stopped only if
  its best slot went quiet more than a minute before the rest of the net's did. A network
  taken down all at once — every node stopping within the same few seconds — is a
  teardown, and a teardown is never counted, however long ago it happened.
- **An ended run is judged at its end.** Once a run has a recorded end, every run-scoped
  stat and table on it reads its last figures as of that end, not as of "now". A month-old
  finished run still shows what was true when it finished, not "no data".

## Level 1: the Run tile

The top-left tile of the Network overview reads the run's own record:

- **blue, "run active since HH:MM:SS"** — no end recorded yet;
- **grey, "run ended HH:MM:SS — net shut down"** — it has an end, and that is all this
  tile says: the run is over, nothing here is a failure;
- **red, "net stalled since HH:MM:SS — run not ended"** — no node's best slot has moved
  for over a minute, and there is *no* recorded end. This is the one that means look
  closer: the net has gone quiet without anyone telling the stack it was supposed to.

A run with no `obs begin`/`obs end` record at all (lesson 1.4) shows "no run record"; the
tile has nothing to read.

## Level 2: whole run

If the time range does not cover the whole run — the default *Last 1 hour* on a run from
last week, say — every run-scoped stat and table looks empty or stale before you have even
started. Click **whole run**, top right of any run-scoped dashboard. It sets the range to
the run's recorded start through its recorded end (a minute either side), the same range
`./obs link` prints. A live run has no end yet, so its whole-run range runs to "now" and
keeps moving.

## Level 3: the Nodes table

Back on the Network overview, the Nodes table's **state** column says which node, and how:

- **advancing** — its best slot moved within a minute of the net's newest move, as of the
  run's end (or now, for a live run);
- **stopped during the run** (red) — it went quiet more than a minute before the rest of
  the net's did, while the run was still on;
- **net stalled** (grey) — no node in the net was still advancing.

`last advanced` says when its best slot last moved; `stopped`, `why` and `exit code` come
from the lifecycle service's Docker events, and are empty for a node that never stopped in
the range (or that is not a Docker container at all — lifecycle only watches Docker).
Click a row, or a node's line on any graph (Chain health, lasair's, jamswap's), for **Node
detail**.

## Level 4: Node detail

One node, one page:

- **State**: the same three values as the table, for this node alone.
- **Why it stopped**: the container's last stop in the range, from Docker (via
  lifecycle): *teardown* (the net was shut down), *killed* (a signal, no stop first, such
  as `docker kill`), *oom* (the kernel killed it for memory), *crashed* (exited non-zero
  by itself, with its code), *stopped* (`docker stop`) or *exited* (0, by itself). Red
  when it was killed, OOM-killed or crashed while its run was still on. Orange, *running,
  stalled since*, means the container is still up but its best slot has not moved for over
  a minute — hung, or cut off (check *Scraped* and *Last scrape* beside it). A node
  registered with `./obs register` rather than run in Docker has no lifecycle record at
  all, so this stays "not stopped" even after it goes quiet: only the state and the
  metrics can tell you it stopped.
- **Last words**: its last 20 log lines in the range — what it said just before, if
  anything.
- **Lifecycle**: every Docker event for its container (create, start, restart, kill, oom,
  stop, die with its exit code, destroy), newest first, from the same source as the *Why
  it stopped* stat.
- Below: its chain, work-packages, resources, then its full logs.

## Level 5: Explore

For anything the dashboards do not already show — a metric by hand, a search across every
node's logs at once, a query you are still shaping — open Grafana's **Explore** with the
Prometheus or Loki datasource. Every per-node line and table row links to it, scoped to
that node and the run's time range.

## Try it 1: a run that ended on purpose

Generate: start `lasair6` (lesson 0.4), let it run ten minutes, then end it the normal way,
from the jamswap checkout:

```sh
./dex down
```

`./dex down` annotates the run (`lasair6 down`), records its end (`obs end`), and only
then removes the containers. Analyse: from the observability checkout, open the finished
run on the Network overview:

```sh
./obs link <your run id> -d overview
```

What you should see:

- **Run**: grey, *run ended HH:MM:SS — net shut down*.
- **Nodes advancing 6, Nodes stopped during the run 0**, both green, although no node
  reports any more: the stats describe the run at its end, not now.
- **Nodes table**: lm0 through lm5 all *advancing*, with the same `last advanced` time, a
  few seconds before the run's end. Nodes that fail rarely fail within the same second; a
  network being switched off does.
- **Why it stopped** on any node's Node detail: *teardown*, grey.

Nothing here needs the lower levels: the Run tile alone answers it. **whole run** shows the
same picture over the full run: best and finalized slots climbing together, a purple
`run_begin` mark at the start, purple container stops and `run_end` at the end, and nothing
red in between.

Now try the opposite: start `lasair6` again, and this time remove it with plain
`docker compose -p lasair6 -f docker-compose.lasair6.yml down -v` from the jamswap checkout,
without `./dex down`. No end is recorded, so a minute later the Run tile turns red, *net
stalled since HH:MM:SS — run not ended*: the stack cannot tell a network that stopped on
purpose from one that died, unless someone tells it. Record the end afterwards with
`./obs end lasair6`.

## Try it 2: kill one validator

Generate: with `lasair6` running for a few minutes (`./dex up` again if you ended it in
*Try it 1*), mark the moment, then kill one node (from the observability checkout):

```sh
RUN=$(./obs current lasair6)
./obs annotate "$RUN" "killing lm1" --tags chaos
docker kill lasair6-lm1-1          # compose names its containers <net>-<service>-1
```

Analyse, in the order of the path:

- **At once, on Chain health**: `lm1`'s best and finalized slot lines go flat; the other
  five keep climbing, and keep finalizing, since GRANDPA needs 5 of the 6 votes. **One
  head** turns red: lm1's reader still answers, with a head that falls further behind
  (`jam_net_one_head` is 1 only when every node is within 3 slots).
- **After a minute, on the Network overview**: *Nodes stopped during the run* **1**, red.
  In the Nodes table, `lm1` reads **stopped during the run**, `stopped` at the kill, `why`
  **killed**, `exit code` **137**; the other five read *advancing*. A **red annotation**
  marks the kill on every graph: `killed` while its run was active is the lifecycle rule
  for red (a graceful stop or a clean exit is not). Your blue `killing lm1` mark sits just
  before it.
- **Node detail** for `lm1`: *State* stopped during the run; *Why it stopped* **killed**,
  red; *Exit code* 137 (SIGKILL: a `docker kill`, an OOM kill, or a stop that timed out);
  *Lifecycle* lists the `kill` event with its signal and the `die` with its exit code;
  *Last words* shows what `lm1` printed in its last seconds.

Docker does not restart a container you killed by hand, even with `restart:
unless-stopped`. Bring it back and watch it rejoin:

```sh
docker start lasair6-lm1-1
./obs annotate "$RUN" "lm1 started again" --tags chaos
```

A purple `start` mark appears, and `lm1` itself catches up within seconds: its own log
(`./dex logs lm1` from the jamswap checkout) shows it importing and finalizing again. Yet
One head stays red. Why? A lasair node reaches the stack by three paths (lesson 2.2): its
own `/metrics`, its JIP-3 stream, and its JIP-2 reader. Ask Explore for all three at once:

```
max by (node, source) (jam_best_slot{net="lasair6", run_id="<your run id>", node=~"lm0|lm1"})
```

`lm1`'s own metrics (the series without a `source`) and its `source="jip3"` series are back
level with `lm0` within seconds, but its `source="jip2"` series is stuck at the slot where
the node died: in lasair 2.1.3, the image jamswap runs, a reader whose node went away does
not reconnect (a known lasair bug). Two paths say "recovered", one says "stuck", and the
disagreement is the clue. Restart the reader:

```sh
docker restart lasair6-reader1-1
```

Within seconds `lm1`'s line jumps back to the others and One head returns to PASS. That is
a lesson of its own: before you blame a node, check the path you see it through. The node
was fine; the thing watching it was not.

When you end this run with `./dex down`, its Run tile turns grey like any other, and since
`lm1` recovered, *Nodes stopped during the run* reads 0 at the run's end. The red stays
where it belongs: the kill mark on every graph, and `lm1`'s Node detail over the whole run
still saying *killed*. The run ending normally and one node falling over partway through
it are two different facts, and the dashboards keep them apart.

(Do not kill a second node while the first is down: with 4 of 6 validators, GRANDPA cannot
finalize, and *Finalized in 5 min* goes red. That is a fine experiment too, once you know
what to expect: finality stalls, and resumes when a fifth node returns, which the
dashboards show once that node's reader is restarted too.)

## Try it 3: a node that hangs instead of dying

Generate: freeze a node without stopping it.

```sh
./obs annotate "$RUN" "pausing lm2" --tags chaos
docker pause lasair6-lm2-1
```

Analyse: on the Nodes table, `lm2` turns *stopped during the run* after a minute, as `lm1`
did, but `stopped`, `why` and `exit code` stay empty: Docker recorded no stop, because
there was none. On **Node detail**, *Why it stopped* reads **running, stalled since
HH:MM:SS**, orange: the container is running, and its best slot has not moved for over a
minute. That is what a hung process or a node cut off from its peers looks like, and only
the metrics can tell you. Then:

```sh
docker unpause lasair6-lm2-1
docker restart lasair6-reader2-1     # its reader lost the node while it was frozen
```

`lm2` catches up at once; on the dashboards it does so once its reader is back, as in
*Try it 2*.

## What a real failure looks like, in one line

**one** node red in the Nodes table (not all of them, not none), a red annotation instead
of a blue `down` mark at that moment, and Node detail's *Why it stopped* giving a reason
(`killed`, `oom`, `crashed`) with an exit code, or *Last words* showing an error before it
went quiet.

Next: [PromQL basics](lesson.html?lesson=03-dashboards/07-promql-basics)
