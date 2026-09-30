# How to use this course

## The path

| Track | You learn | Lessons |
|---|---|---|
| 0 Welcome | Why observe, the words you need, reading your first dashboard, how the course works | 4 |
| 1 The stack | Each service, how they connect, running it, runs and links | 4 |
| 2 Telemetry from JAM nodes | The `jam_*` metrics, the three ingestion paths, JIP-3 and JIP-2, lasair's telemetry, plugging in a client | 5 |
| 3 Reading the dashboards | Every dashboard and the question it answers; the drill-down path when something looks wrong; PromQL and LogQL | 8 |
| 4 Soak tests | What a soak proves, running one, reading its results | 3 |
| 5 Case study | A real failing soak, from symptom to cause to proof of the fix, and how to reproduce its faults on your own network | 6 |
| 6 Mixed networks | lasair and PolkaJam on one chain; what cross-client telemetry reveals; adding a client | 3 |
| Labs | Hands-on labs, and PromQL and LogQL exercises with answers | 7 |

Read the tracks in order the first time. Each lesson takes 5 to 10 minutes. Lessons are
numbered track.lesson: lesson 3.6 is the sixth lesson of track 3. Tracks 1 to 3 are the
reference you will come back to; track 5 is where it comes together. When a word stops
making sense, go back to [The words you need](lesson.html?lesson=00-welcome/02-the-words-you-need).
For JAM itself (slots, work-packages, guarantees, finality), the sibling course,
[Learning lasair](../lasair/), teaches the protocol.

## Generate, then analyse

Every lab and worked example in this course has the same two steps:

1. **Generate.** You start the observability stack and a JAM network on your own machine,
   from public repositories and published images, and run it, load it, or break it on
   purpose.
2. **Analyse.** You open *your* Grafana on *your* run and read what happened.

Numbers quoted in the lessons come from runs on the course author's machine, mostly on
2026-09-28, and are there to show what a result looks like. Yours will differ: another
machine, another day, another run. What should match is the shape, and each lesson says
which shape to expect.

## What you need

- Docker with Compose v2, Python 3.8 or newer, and git.
- Room for a small network. The `lasair6` network is fifteen containers (six validators,
  a reader beside each, the DEX, a builder and a checker), sixteen with the load
  generator, next to the stack's nine.
  jamswap's own results were measured on an Apple M1 Pro with 8 GB for Docker Desktop; the
  first start pulls a few GB of images.
- Two public repositories, side by side in one folder:

```sh
mkdir jam && cd jam
git clone https://github.com/abutlabs/observability
git clone https://github.com/abutlabs/jamswap
```

[observability](https://github.com/abutlabs/observability) is the stack.
[jamswap](https://github.com/abutlabs/jamswap) is a DEX on JAM, and it defines the networks
this course runs: `lasair6` (six lasair validators), `lasair-pj` (three lasair and three
PolkaJam) and `pj6` (six PolkaJam). Its lasair nodes run the published image
`ghcr.io/abutlabs/lasair:2.1.2`; its PolkaJam nodes are built on your machine from
PolkaJam's public release.

Side by side matters twice: `./obs up` mounts every sibling checkout's
`observability/dashboards/` folder as a Grafana folder (that is how jamswap's dashboards
appear), and jamswap's `./dex` finds the stack at `../observability`. If yours live
elsewhere, set `JAMSWAP_DIR=/path/to/jamswap` for `./obs up` and
`OBS_HOME=/path/to/observability` for `./dex`.

lasair's own dashboards live in lasair's repository, which is not public. Lesson 3.4 says
what they show and how to get the same answers in Explore from the metrics your lasair
nodes export.

Several lessons need no running network at all. The labs say what each one needs.

## Your first run

```sh
cd observability && ./obs up     # the stack; your Grafana is http://localhost:3300
cd ../jamswap && ./dex up        # lasair6: six lasair validators and the DEX (~5 min)
./dex load                       # optional: steady trading load
./dex down                       # when you are done: ends the run, removes the network
```

`./dex up` begins a run in the stack, gives every container the run id, and prints it with
three dashboard links into the Grafana you just started:

```text
obs: run lasair6-<the UTC time it started>
  platform/Chain health    http://localhost:3300/d/obs-chain?orgId=1&var-run_id=<your run id>&var-net=lasair6&from=<its start>&to=now&refresh=10s
  jamswap/DEX              http://localhost:3300/d/obs-dex?...
  jamswap/Soak runs        http://localhost:3300/d/obs-soak-runs?...
```

To find your run again later, from the observability checkout:

```sh
./obs current lasair6            # the network's current run id
./obs runs --net lasair6         # every run of it, newest first
./obs link <your run id> --all   # every dashboard, opened on that run and its time range
```

From the jamswap checkout, `./dex link` prints the same links for the current run.

## Conventions

- `./obs` is the CLI in the observability checkout; `./obs -h` lists every command.
  `./dex` is jamswap's; `./dex obs <command>` runs `./obs <command>` from there.
- Ports are the defaults: Grafana `3300`, Prometheus `9390`, Loki `3100`, Pushgateway
  `9091`, Alloy `12345`, JIP-3 `9910`. Each is on your machine only (bound to `127.0.0.1`)
  and each can be moved with an environment variable (lesson 1.3).
- `<net>`, `<your run id>` and `$RUN` are placeholders for your own values. A run id is the
  network's name and the UTC time its run began, `lasair6-yyyymmddTHHMMSSZ`. In a shell,
  `RUN=$(./obs current lasair6)` saves typing.
- Output shown as a *shape* (with `<...>` or `...` in it) is what a command prints; the
  values are yours.

## What your nodes report

The lasair image jamswap runs, 2.1.2, is from before lasair adopted the common `jam_*`
names and its JIP-3 telemetry sender. So on your networks:

- a lasair node's own `/metrics` carries only `lasair_*` names (`lasair_slot`,
  `lasair_finalized_slot`, `lasair_guarantor_refine_seconds`, ...);
- its `jam_*` series (best and finalized slot, the hash comparison) come from the JIP-2
  path: every lasair node has a *reader* beside it that serves JIP-2, which the stack polls
  (lesson 2.2), and jamswap's `netwatch` exports them too;
- it sends no JIP-3 telemetry, so panels built on JIP-3, such as Chain health's *Block
  life*, stay empty for lasair nodes and fill for PolkaJam nodes (track 6).

Newer lasair builds export the `jam_*` names as well, keep the old names as aliases, and
send JIP-3; they are not published as an image yet. Where it matters, a lesson names both,
for example `jam_wp_anchor_age_slots`, which newer lasair builds also export under its
older name `lasair_ce133_anchor_age_slots` (2.1.2 has neither).

## Checking yourself

Each track has labs or exercises. The PromQL and LogQL exercises have their answers in
collapsed blocks: try first, then open them.

Next: [The nine services](lesson.html?lesson=01-the-stack/01-components)
