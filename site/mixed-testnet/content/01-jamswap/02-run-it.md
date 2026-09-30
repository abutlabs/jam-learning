# Run it and read its verdict

You will start the observability stack, start `lasair6` (six lasair validators, finalizing
with GRANDPA, and the exchange), trade on it, and run the soak test whose verdict is what
every net in this section is judged by.

## 1. Start the stack and the net

With `jamswap` and `observability` cloned side by side:

```sh
cd observability && ./obs up && cd ..
cd jamswap
./dex up
```

`./dex up` starts the default net, `lasair6`. It prints the dashboards for your run, then
waits for the chain to warm up (Safrole tickets and the first finality, a few minutes):

```
obs: run lasair6-<start time>
  platform/Chain health    http://localhost:3300/d/obs-chain?...
  jamswap/DEX              http://localhost:3300/d/obs-dex?...
  jamswap/Soak runs        http://localhost:3300/d/obs-soak-runs?...
net starting — warming up (Safrole tickets + finality bootstrap, ~5 min)…
✓ finality live
✓ DEX ready → http://localhost:8081
```

Open the exchange at `http://localhost:8081` and place an order or two. `./dex status`
shows the market; `./dex heads` shows every node's head and finalized block.

## 2. Watch the chain

Open **Chain health** from the links above. Each lasair node streams
[JIP-3](https://github.com/polkadot-fellows/JIPs) telemetry to the stack, so the
**Block life** row shows how long a block takes to reach each stage (authored, verified,
executed, best, finalized). With six lasair validators and 6-second slots, expect a
median time to finality of a few seconds; read your own value off the panel.

## 3. Soak it

```sh
./dex soak 600
```

This turns on a load generator for 10 minutes (orders from many accounts, a fifth of
them sealed), lets the chain drain for 3 more, and then judges the run. The verdict is four
checks, called A1–A4 across jamswap's nets:

```
one head            : PASS  (... samples ok, max lag <n> slots, 0 divergence episode(s) ...)
finality            : PASS  (finalizing, required; 0 conflict(s), 0 regression(s), ... finalized slots hash-checked)
state parity        : PASS  (all digests agree; service 100, <n> keys at final slot <slot> ...)
VERDICT (orders + chain): PASS
==> offered load   : PASS  (<n> orders offered, 0 refused, 0 busy; ...)
```

| Check | What it proves |
|---|---|
| **A1** one head | every node's best block agreed at every sample |
| **A2** finality | the finalized head advanced on every node, with the same hash, never backwards |
| **A3** state parity | the exchange's state (books, balances, orders) is byte-identical on every node |
| **A4** the verdict | orders settled and the load was served (almost nothing turned away) |

The **Soak runs** dashboard shows the same run as it happens: orders offered, settled and
their latency, next to the chain.

## 4. Stop it

```sh
./dex down
```

Your run stays in the stack. From the observability directory, `./obs runs --net lasair6`
lists your runs and `./obs link <run id> --all` prints every dashboard for one of them.

Next: the same exchange on [lasair and PolkaJam together](lesson.html?lesson=02-mixed-nets/01-lasair-and-polkajam).
