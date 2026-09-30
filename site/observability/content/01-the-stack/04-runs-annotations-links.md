# Runs, annotations and links

## A run is one life of a network

You will start the same network many times: to test a fix, to repeat a failure, to compare
two builds. If every start wrote into the same series, the runs would blur into each
other. So each start gets a **run id**, and every series, log line and annotation from that
start carries it:

```text
lasair6-yyyymmddTHHMMSSZ
└─net─┘ └── UTC start ─┘
```

Dashboards pick a net and then a run. Queries select `run_id="..."`. Two runs of the same
network sit side by side and never mix.

## The run commands

```sh
./obs new-run NET          # print a fresh run id for NET (records nothing)
./obs begin NET            # record the start of NET's run, print its id
./obs end NET              # record its end, drop NET's file targets
./obs current NET          # NET's current run id (exit status 1 if none)
./obs runs [--net NET]     # the recorded runs, newest first (--json for scripts)
./obs backfill [--dry-run] # write obs_run_* for ended runs the lifecycle service missed
```

`begin` also ends the net's previous run, if one is open. A Docker network passes the id
`begin` printed to its containers through the `org.abutlabs.obs.run_id` label:

```sh
export OBS_RUN_ID=$(./obs begin mynet)      # prints mynet-<UTC time>
docker compose up -d                        # labels read ${OBS_RUN_ID}
./obs end mynet                             # before docker compose down
```

Keep the same `OBS_RUN_ID` while the network runs: a changed label makes Compose recreate
the container. A container with no run id label gets `<net>-adhoc`.

Run records (net, start, end) are small JSON files in `~/.cache/abutlabs-obs/runs/`.
They are what lets a link open a finished run with its exact time range.

The lifecycle service (lesson 1.1) turns each record into `obs_run_info`,
`obs_run_start_timestamp_seconds` and `obs_run_end_timestamp_seconds` in Prometheus, which
the Run tile and the "whole run" link read (lesson 3.6). A run that ended before the
lifecycle service was collecting has a record on disk but none of those series. `obs
backfill` closes that gap: it finds ended runs with no `obs_run_end_timestamp_seconds` and
writes what the service would have exported, over each run's own range.

```text
$ ./obs backfill --dry-run
every ended run has its run metrics
```

Run it without `--dry-run` when it lists runs to catch up: it writes their `obs_run_*`
series into Prometheus and prints `written; Prometheus loads the new blocks within a
minute`.

## Processes on your machine: `register`

A process outside Docker is registered with its net, run id, job and targets. Try it:
nothing needs to listen on those ports for the commands to work (lab 3 registers a process
that does). To keep your real state clean, point `OBS_STATE` at a scratch folder first;
Alloy then never reads these targets:

```sh
export OBS_STATE=/tmp/obs-scratch
run=$(./obs new-run localnet)
./obs register localnet "$run" myclient v0@host.docker.internal:9615 v1@host.docker.internal:9616 -v
./obs register localnet "$run" myclient v0@127.0.0.1:40000 --jip3 -v
./obs current localnet
./obs runs
```

It prints this shape (your run id carries your time):

```text
obs: localnet <run>: myclient v0 v1 (scrape)
obs: localnet <run>: myclient v0 (jip3)
<run>
<run>          localnet     <date> <HH:MM> -> running
```

The first `register` wrote `targets/localnet--myclient.json` in the state folder, the file
Alloy reads when the state folder is the stack's own:

```json
[
 {
  "targets": [
   "host.docker.internal:9615"
  ],
  "labels": {
   "net": "localnet",
   "run_id": "<run>",
   "job": "myclient",
   "node": "v0",
   "client": "myclient"
  }
 },
 {
  "targets": [
   "host.docker.internal:9616"
  ],
  "labels": {
   "net": "localnet",
   "run_id": "<run>",
   "job": "myclient",
   "node": "v1",
   "client": "myclient"
  }
 }
]
```

A target is `[node@]host:port[/path]`. The node name defaults to the host, the path to
`/metrics`, and the client to the job (add `--label client=...` to override). `--jip2`
registers a JIP-2 RPC for the JIP-2 exporter to poll instead; `--jip3` registers a node's
JAMNP-S address so the JIP-3 receiver can name its telemetry connection. Registering a new
run id for a net drops that net's old targets. Ending the run removes them:

```text
$ ./obs end localnet -v
obs: localnet ended (run <run>)
$ ./obs runs
<run>          localnet     <date> <HH:MM> -> <date> <HH:MM>
$ ./obs current localnet; echo "exit $?"
exit 1
```

(`unset OBS_STATE` when you are done, so later commands use the stack's own state.)

## Annotations: marking what happened

An annotation is a mark on the time axis of every dashboard showing that run:

```sh
./obs annotate "$OBS_RUN_ID" "load on" --tags load            # a point, now
./obs annotate "$OBS_RUN_ID" "soak" --start start --end now   # a region over the run
./obs annotate "$OBS_RUN_ID" "clearing SLO 0.66" --tags fail  # drawn red
```

The tags `pass` and `fail` draw it green or red; anything else draws a blue *run event*.
`--start` and `--end` take `now`, `start` (the run's recorded start), or a Unix time in
seconds or milliseconds. The CLI writes annotations as Grafana's admin.

## Links: opening a run where it happened

A dashboard link needs the net, the run id and the time range. `obs link` builds it from
the run record:

```sh
./obs link RUN_ID                 # the Chain health dashboard
./obs link RUN_ID -d dex          # another dashboard, by uid with or without "obs-"
./obs link RUN_ID --all           # every dashboard that has a run selector
```

For your `lasair6` run (lesson 0.4), from the observability checkout:

```sh
RUN=$(./obs current lasair6)
./obs link "$RUN" -d dex
```

It prints a link into your Grafana with the net, the run and the time range filled in:

```text
http://localhost:3300/d/obs-dex?orgId=1&var-run_id=<your run id>&var-net=lasair6&from=<start - 1 min, in ms>&to=now&refresh=10s
```

The range runs from a minute before the recorded start to a minute after the recorded end.
While the run is still going, the link ends at `now` and refreshes every 10 seconds; run
the same command after `./dex down` and `to` becomes the end, a fixed number. For a run
this machine never recorded, `link` finds its net in Prometheus and falls back to the last
six hours.

`--all` prints one line per dashboard that has a run selector (folder/title, then the
link). With the observability and jamswap checkouts side by side, the lines have this
shape:

```text
platform/Chain health      http://localhost:3300/d/obs-chain?...
platform/Logs              http://localhost:3300/d/obs-logs?...
platform/Node detail       http://localhost:3300/d/obs-node?...
platform/Network overview  http://localhost:3300/d/obs-overview?...
jamswap/DEX                http://localhost:3300/d/obs-dex?...
jamswap/Soak runs          http://localhost:3300/d/obs-soak-runs?...
```

(Links shortened here. Every other project folder you plug in adds its dashboards; lasair's
own, in its non-public repository, would add a `lasair/` line each.)

## Batch results: `obs push`

A job that ends with results pushes them to the Pushgateway, grouped by job and run id, so
every result series carries the run id:

```sh
./obs push soak --group run_id=$OBS_RUN_ID --group net=mynet <<EOF
# TYPE soak_pass gauge
soak_pass 1
EOF
```

A push replaces only the metrics it names within that group, so a job can push progress
while it runs and results at the end. Groups stay until deleted:
`curl -X DELETE http://localhost:9091/metrics/job/soak/run_id/<id>/net/<net>`.

## jamswap does all of this for you

For jamswap's networks, `./dex up NET=<net>` begins a run, passes its id to every
container's labels, annotates the start and prints the dashboard links; `load`, `noload`,
`soak` and `down` annotate the run as they go; the soak pushes its results. You rarely
type these commands for a jamswap net. You will for your own networks.

Next: [The jam_* metrics](lesson.html?lesson=02-telemetry/01-the-jam-metrics)
