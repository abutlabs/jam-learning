# Lab 4: Replay the case study

**Needs:** the observability and jamswap checkouts side by side (lesson 0.4), Docker with
room for `lasair6`, the stack running (`./obs up`). **Time:** about 45 minutes: 5 to start,
25 of load, 15 to analyse.

In track 5, a `lasair6` network under trading load fell behind because its guarantors
refined full rounds too slowly for the anchor window. You make the same thing happen on
your own `lasair6`, with public images only, then answer the case study's questions from
your own data. You cannot make lasair's code slower by hand, but you can give one
validator less CPU: the same fault, made on purpose, and switched off again at the end.

The *what you should see* notes come from the author's run of these steps on 2026-09-29,
with the images jamswap pins (lasair 2.1.2). Your numbers will differ with your machine;
the order of events should not.

## 1. Generate: a network under load

```sh
cd jamswap
./dex up        # lasair6: six lasair validators and the DEX; a few minutes
./dex load      # 12 crossing pairs of orders a minute, 20% sealed
```

Then, from the observability checkout, keep your run id at hand:

```sh
RUN=$(./obs current lasair6); echo "$RUN"
./obs link "$RUN" -d dex        # your DEX dashboard; keep it open
```

Let it trade for five minutes. That is your baseline: small rounds, a small mempool,
refines of a second or two, nothing refused.

## 2. Inject the fault: a slow guarantor

`lm0` is the guarantor the DEX's builder tries first (the reader beside it hands each
work-package to the first lasair guarantor that takes it), so it refines most rounds. Mark
the moment, then give it a quarter of a CPU:

```sh
./obs annotate "$RUN" "lm0 throttled to 0.25 CPU" --tags chaos
docker update --cpus 0.25 lasair6-lm0-1
```

Leave it for 20 minutes. To undo it at any time, give it back every CPU Docker has:

```sh
docker update --cpus "$(docker info --format '{{.NCPU}}')" lasair6-lm0-1
```

What you should see: within a minute or two, lm0's refines take tens of seconds instead of
a second or two (the author's first throttled package: 33.65 s), packages start to expire
on `lm0`, rounds grow and the DEX's mempool climbs. Chain health stays green the whole
time: every node keeps one head and keeps finalizing. The chain is fine; the work on it is
not.

## 3. Analyse: the case study's questions, on your run

Explore works for all of them. For the terminal, paste this helper (it asks your
Prometheus and prints one line per series; it works in bash and zsh):

```sh
q() { curl -s -G http://localhost:9390/api/v1/query --data-urlencode "query=$1" \
      | python3 -c 'import json,sys; [print(r["metric"], r["value"][1]) for r in json.load(sys.stdin)["data"]["result"]]'; }
q "sum(lasair_ce133_guaranteed_total{run_id=\"$RUN\"})"
```

The queries below use `max_over_time(...[1h])` so that they also work for a while after
the network is gone; make the window at least as long as your run.

### 1. How many orders were offered, and how many refused?

<details>
<summary>Answer</summary>

```sh
q "sum(max_over_time(loadgen_ops_total{run_id=\"$RUN\"}[1h]))"
q "sum(max_over_time(loadgen_op_errors_total{run_id=\"$RUN\"}[1h]))"
```

Offered: about 24 a minute of load. Refused: most likely nothing yet (the second query
prints nothing, since the error counter does not exist until the first refusal). The DEX
refuses an order only when its account already has 50 open orders in that market; in the
case study that took half an hour of backlog. The early signs are the next questions.

</details>

### 2. When did it start?

In Explore, graph the refine time per node over the run:

```promql
rate(lasair_guarantor_refine_seconds_sum{run_id="RUN"}[5m]) / rate(lasair_guarantor_refine_seconds_count{run_id="RUN"}[5m])
```

(put your run id in place of `RUN`). When does `lm0`'s line leave the others?

<details>
<summary>Answer</summary>

At your annotation: the blue `lm0 throttled` mark sits right where `lm0`'s line climbs. The
other nodes stay where they were (a node that refined nothing in a window shows no point
there, or `NaN`). In the case study the climb came at minute 24, when full rounds reached
the guarantors; here you caused it, so you know the moment.

</details>

### 3. Did the rounds and the mempool grow?

<details>
<summary>Answer</summary>

```sh
q "sum by (market) (rate(jamswap_round_orders_sum{run_id=\"$RUN\"}[5m])) / sum by (market) (rate(jamswap_round_orders_count{run_id=\"$RUN\"}[5m]))"
q "max(max_over_time(jamswap_mempool_orders{run_id=\"$RUN\"}[1h]))"
```

Rounds grow past the baseline's ten or so orders, and the mempool climbs: on the author's
run, from 25 to 54 orders within three minutes of the throttle. The DEX's *Round sizes*
panel shows the same. In the case study, market-1 rounds sat at the 48-order cap from
minute 21, and the mempool peaked at 344.

</details>

### 4. How slow did refine get?

The worst five-minute average on any node, and the latest package per node:

<details>
<summary>Answer</summary>

```sh
q "max_over_time((max(rate(lasair_guarantor_refine_seconds_sum{run_id=\"$RUN\"}[5m]) / rate(lasair_guarantor_refine_seconds_count{run_id=\"$RUN\"}[5m])))[1h:15s])"
q "lasair_guarantor_refine_seconds{run_id=\"$RUN\"}"
```

Tens of seconds on `lm0`, against a second or two before the throttle. The second query
reads lasair's plain gauge of the latest refine (lesson 2.4). The case study's worst
five-minute average was 13.2 s, and a full round took 14 to 27 s.

</details>

### 5. Which node lost the most packages to expiry?

<details>
<summary>Answer</summary>

```sh
q "max by (node) (max_over_time(lasair_ce133_expired_total{run_id=\"$RUN\"}[1h]))"
```

`lm0`, the throttled one. Other nodes may show a few too: they guarantee some rounds, and
co-guarantee with `lm0`. In the case study, `lm0` had 10 of the 17.

</details>

### 6. What happened to one package that expired?

In the **Logs** dashboard (or Explore, Loki), find the expiries, take one package's hash
prefix, and search for it alone:

```logql
{net="lasair6", run_id="RUN", client="lasair"} |= "EXPIRED"
```

<details>
<summary>Answer</summary>

The prefix, searched across every node, gives its story in time order. On the author's
run: `[ce133] accepted package 0x…` on `lm0`; in the same second, the DEX's reader logged
`submitWorkPackage … taken by` lm0's address (CE-133); `[guarantor] refined package 0x…
in 33.65s` half a minute later; `EXPIRED (anchor_too_old)` three seconds after that. The
package was fine and the work was done; the window had closed. Lesson 5.4 reads the case
study's traced package the same way.

</details>

### 7. How fast do slots advance on your network?

<details>
<summary>Answer</summary>

```sh
q "deriv(max(jam_best_slot{run_id=\"$RUN\"})[10m:])"
```

About 0.28 slots per second on the author's run: one slot every 3.6 seconds, as on the
case study's runs, so the 8-block anchor window is about 30 seconds on this network, not
48. Lesson 5.5 explains why that matters.

</details>

### 8. What did the DEX's own clearing gauge say?

<details>
<summary>Answer</summary>

```sh
q "min(min_over_time(jamswap_order_clearing_slo{run_id=\"$RUN\"}[1h]))"
```

1, most likely, on every sample. The gauge counts only orders that reached an end, and
the orders stuck in the growing mempool have not. The DEX dashboard's *Orders open too
long* and the mempool are what show the backlog; a soak's verdict (lesson 4.3) is what
would count it.

</details>

### 9. Did the chain notice?

<details>
<summary>Answer</summary>

Open Chain health on your run: all five verdicts green. One head, finality lag and
finality progress do not measure how long a guarantor takes to refine a package, which is
why the case study's first lesson was that **a green Chain health does not mean the
network is doing its job**.

</details>

## 4. Undo the fault, and check the undo

```sh
docker update --cpus "$(docker info --format '{{.NCPU}}')" lasair6-lm0-1
./obs annotate "$RUN" "lm0 back to full CPU" --tags chaos
```

Give it ten minutes, then ask questions 2 to 5 again. Refine times on `lm0` should fall
back to their baseline, expiries stop growing, and the mempool drain. If they do, that is
the case study's proof in miniature: the same run, one thing changed back, the same
queries. If they do not, you have found something the case study did not: follow it the
same way.

## 5. End the run

From the jamswap checkout, `./dex down`. Your run stays in Prometheus and Loki for 30
days: `./obs link "$RUN" --all` opens every dashboard on it, with its two chaos marks.

## Going further

- **The case study's own experiment.** `soak/run lasair6 3600` runs the hour-long soak
  with the lasair image jamswap pins, 2.1.2, which is the build from before the fix.
  jamswap's published results say it failed after about 25 minutes on the machine that
  ran it. On a faster machine it may pass: refine time is CPU time. If it fails on yours,
  every question above has an answer that matches track 5.
- **Other faults.** Lesson 3.6 has you kill one validator and pause another, and read what
  the dashboards say about each.
- **Any panel is a query.** Pick one on the DEX dashboard, open *Explore* from its menu, and
  change it: per node instead of summed, another window, another run.
