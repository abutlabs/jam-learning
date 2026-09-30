# Reading your first dashboard

Time to read a real dashboard, one panel at a time, on a network you start yourself. The
dashboard is **Chain health**; the network is jamswap's `lasair6`: six lasair validators
with a DEX on top.

## Generate: start the stack and a network

Clone the two repositories side by side if you have not yet (lesson 0.4 says why), then:

```sh
cd observability && ./obs up     # your stack; your Grafana is http://localhost:3300
cd ../jamswap && ./dex up        # six lasair validators and the DEX
```

The first `./dex up` pulls the published images, mints a genesis, starts the validators and
waits until the chain finalizes: a few minutes. Then it prints your run id and three links
into your Grafana:

```text
obs: run lasair6-<the UTC time it started>
  platform/Chain health    http://localhost:3300/d/obs-chain?orgId=1&var-run_id=<your run id>&var-net=lasair6&from=<its start>&to=now&refresh=10s
  jamswap/DEX              http://localhost:3300/d/obs-dex?...
  jamswap/Soak runs        http://localhost:3300/d/obs-soak-runs?...
```

Open the Chain health link. If you lost it, print it again from the observability
checkout:

```sh
./obs link "$(./obs current lasair6)" -d chain
```

Let the network run for ten minutes before you read on: several panels look back five
minutes.

## The top bar: which network, which run, which time

```text
 net [lasair6 ▾]   run_id [lasair6-… ▾]        ⏱ <a minute before your start> → now  ⟳ 10s
```

- **net** and **run_id** choose whose data you see. Every panel below filters on them.
- The **time range** starts a minute before your run began and runs to *now*, refreshing
  every 10 seconds, because the run is still going. Grafana shows times in your browser's
  time zone; the run id is in UTC.

## The question

The first panel is text. It says what the dashboard is for:

> **Is the net one chain that keeps growing and finalizing, on every node?**

Everything below is evidence for or against that one question.

## The five verdicts

```text
 ┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
 │ Nodes stopped │ One head      │ Finality lag, │ Finalized in  │ Finality      │
 │ during the run│ PASS = all on │ worst node    │ 5 min, slowest│ conflicts     │
 │ PASS = 0      │ one block     │ PASS ≤ 12     │ PASS > 0      │ PASS = 0      │
 └───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

Each is a **stat** panel: one number describing the run (its last value, or its value at
the run's end once it has ended). Its title says what passes; the colour says whether it
did. On a healthy run all five are green:

- **One head: PASS.** Every node holds the same block, compared by its hash.
- **Finality lag, worst node**: a small number, 0 to a few slots. No node's finalized block
  is far behind its best block; one epoch, 12 slots, is the limit.
- **Finalized in 5 min, slowest node**: tens of slots. The slowest node's finalized block
  moved that far in the last five minutes: finality keeps going.
- **Finality conflicts: 0.** Never two different blocks finalized at one height.
- **Nodes stopped during the run: 0.** Every node is still advancing. The tile only counts
  a node that falls silent while the rest of the net keeps going. Lesson 3.6 is about
  reading this tile and the ones like it, and has you make it turn red.

## The graphs

**Best slot per node**: six lines, one per node, climbing. They lie exactly on top of each
other, so you see what looks like one line. That is the point: all six nodes agree on the
head at every moment. A node falling behind would peel away below the others.

**Finalized slot per node**: the same shape, just under the best slot (on `lasair6`, often
right on it). Finality follows the head.

**Finality lag per node**: small numbers, far below the dashed red line at 12 (one epoch). A
dashed line is a threshold: trouble would be a line climbing toward it.

**Head agreement**: *distinct heads* and *distinct finalized blocks* both flat at 1, and the
spread of best slots 0 or 1. One chain.

**Height per node**: blocks since genesis, best solid and finalized dashed. It reads
`jam_best_height` and `jam_finalized_height`, which the lasair image jamswap runs (2.1.3)
exports from each node's own `/metrics`; JIP-2 and JIP-3 carry slots, not heights.

**Peers per node** shows each node's peers, and how many nodes answer JIP-2: 6.

**Block life**, the row at the bottom, reads JIP-3 telemetry, which every lasair node
sends to the stack: time to finality, and the median age of a block at each stage. On a
fresh `lasair6`, expect a time to finality of a few seconds.

If any of these is empty on your run, check the image in the `up` mark below: lasair
builds from before lasair adopted the `jam_*` names and JIP-3, such as 2.1.2, fill none of
them. An empty panel means "no data for this query", not "zero". Lesson 3.1 lists the
usual reasons.

Hover over any graph: a vertical line follows your mouse across **every** panel, and a
tooltip lists each series' value at that moment. Use it to line up events across panels.

## The marks

Vertical marks cross every graph. These are **annotations**, written by the tools that
started and drove your run. Hover over one to read it. On your run so far:

| Colour | Text | Written by |
|---|---|---|
| blue | `lasair6 up: validators lasair,lasair,lasair,lasair,lasair,lasair; lasair ghcr.io/abutlabs/lasair:2.1.3` | `./dex up` |
| purple | the run's begin, and each container's start | the lifecycle service |
| blue | `loadgen on` | `./dex load`, if you ran it |

Annotations are how you find out, weeks later, what a run was: the `up` mark says which
clients and which lasair image ran.

## End the run, and read it again

When you are done (or keep the network for the next tracks, and come back to this):

```sh
./dex down                            # from the jamswap checkout
./obs link <your run id> -d chain     # from the observability checkout
```

The link now has a fixed time range, from a minute before the run began to a minute after
it ended. Every line stops at the same moment, just before the blue `lasair6 down` mark.
*Nodes stopped during the run* still reads 0, even though no node reports any more by the
range's last minute: the network was switched off on purpose, and every node was still
advancing right up to that moment; none fell behind the others first. A normal end, not a
failure, and the dashboard says so without you having to work it out from the graphs.

## Reading any dashboard, in five steps

1. **The question**: read the text panel.
2. **Whose data, when**: check net, run and time range.
3. **The verdicts**: read the stats' colours, then their numbers.
4. **The shape**: follow the lines; look for the one that differs from the others.
5. **The marks**: line up what changed with what the tools say happened.

You have just generated data and read a dashboard of it. Everything else in this course is
more of the same, on other questions.

Next: [How to use this course](lesson.html?lesson=00-welcome/04-how-to-use-this-course)
