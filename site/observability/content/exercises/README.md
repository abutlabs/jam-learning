# Labs and exercises

Hands-on work for the course. Each lab says what it needs. Every lab that looks at a
network has you start it first, on your own machine, from public repositories and images
(lesson 0.4), then read your own run. Lab 2 and the two exercise sets need no Docker at
all.

| | What you do | Needs | Goes with |
|---|---|---|---|
| [Lab 1: Start the stack](lesson.html?lesson=exercises/lab-1-start-the-stack) | start the stack, check every service, find your way around Grafana and Alloy, put a network on it | Docker; jamswap for the last step | track 1 |
| [Lab 2: JIP-3 without Docker](lesson.html?lesson=exercises/lab-2-jip3-without-docker) | run the JIP-3 receiver as a plain process, feed it from the synthetic sender, read what it derives | Python only | lessons 2.1 and 2.3 |
| [Lab 3: Register a process](lesson.html?lesson=exercises/lab-3-register-a-process) | serve a tiny fake `/metrics`, register it, watch it appear on the dashboards | Docker, the stack | lessons 1.4 and 2.2 |
| [Lab 4: Replay the case study](lesson.html?lesson=exercises/lab-4-replay-the-case-study) | make your own `lasair6` fall behind the way the case study's did (a throttled guarantor), then answer the case study's questions from your own data | Docker, the stack, jamswap | track 5 |
| [PromQL exercises](lesson.html?lesson=exercises/promql) | read and write queries; answers included | nothing, or Prometheus to check | lesson 3.7 |
| [LogQL exercises](lesson.html?lesson=exercises/logql) | read and write log queries; answers included | nothing, or Loki to check | lesson 3.8 |

## How the answers work

Every exercise has its answer in a collapsed block under it. Try first, then open it:

<details>
<summary>Answer</summary>

Like this. On GitHub and on the course site, click the line above to open or close it.

</details>

Where an answer quotes a number from a real run, it is what the query returned on the
course author's machine, and the exercise says which network it was. Your own run will
give other numbers; the answer says what should match.

## A note on outputs

Output shown in a lab was captured by running the command, unless the lab says it shows
the *expected* output. Parts of labs 1 and 3 need a stack and a scraped target, and their
expected output there is worked out from the code (`obs`, `alloy/config.alloy`), not
captured: if yours differs, the difference is worth understanding, and worth reporting.
