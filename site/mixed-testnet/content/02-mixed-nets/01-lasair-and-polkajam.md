# lasair and PolkaJam on one chain

`lasair-pj` is three lasair validators and three PolkaJam validators on one chain: one
genesis, one GRANDPA finality both clients vote in, and the exchange on top. Each
validator holds only its own key, so neither client can carry the chain alone: blocks
from both must be imported by both.

## 1. Start it

```sh
./dex up NET=lasair-pj
```

The first time, this builds a PolkaJam image from PolkaJam's public release (the lasair
nodes use the public `ghcr.io/abutlabs/lasair` image). Then:

```
✓ lasair-pj up: validators (index order) = lasair,lasair,lasair,polkajam,polkajam,polkajam
  keys: LASAIR_DEV_ALL_KEYS=0
  one head + finality: ./dex heads NET=lasair-pj
DEX starting (genesis service)…
✓ DEX ready → http://localhost:8206
```

`./dex heads NET=lasair-pj` shows every node's best and finalized block side by side:
the lasair nodes and the PolkaJam nodes should agree.

## 2. Soak it

```sh
./dex soak NET=lasair-pj 600
```

The same four checks as on `lasair6`, and here they mean more: **one head** and
**finality** across two independent implementations, and **state parity** says the
exchange's state is byte-identical whether you read it from a lasair node or a PolkaJam
node.

## 3. Compare the two clients

Both clients stream [JIP-3](https://github.com/polkadot-fellows/JIPs) telemetry to the
stack, so the **Block life** row on Chain health covers all six validators. In Grafana's
Explore, ask per node:

```
sum by (node) (jam_block_stage_seconds_count{net="lasair-pj", stage="finalized"})
```

The `lm` nodes are lasair, the `pj` nodes PolkaJam. Do both clients report the same number
of finalized-stage events over the same run? If not, work out why from the JIP-3
definitions: what does each event mean when one GRANDPA round finalizes several blocks at
once? This is the kind of difference mixed nets exist to surface, and the JIPs are where
it gets settled.

Both clients also serve [JIP-2](https://github.com/polkadot-fellows/JIPs), the node RPC
the exchange uses. Check a PolkaJam node the way you would check your own
([track 3](lesson.html?lesson=03-bring-your-client/01-join-a-net)); its RPC is on the host
at port 42603:

```sh
python3 offchain/jip2_check.py ws://127.0.0.1:42603
```

## The control

`./dex up NET=pj6` runs six PolkaJam validators with no lasair at all; there the exchange
deploys its service at runtime through the chain's Bootstrap service instead of starting
in genesis. A result that holds on `lasair6`, `pj6` and `lasair-pj` is a result about the
protocol, not about one client.

Next: [put your client on a net](lesson.html?lesson=03-bring-your-client/01-join-a-net).
