# jamswap: an exchange that runs as a JAM service

jamswap is a decentralized exchange with a real order book and a real matching engine,
running on JAM. It is worth running on your net because it exercises most of what a JAM
chain does for a service: work-packages refined on cores, guarantees and availability,
accumulation, preimages, and finality, all under load.

## Why it needs JAM

On most chains every validator re-executes every transaction, so heavy computation is
expensive, and decentralized exchanges settle for a pricing formula instead of an order
book. JAM's **refine** phase is different: a work-package is computed by the few
validators assigned to its core, then re-executed by randomly selected auditors, and a
wrong result is provable and costs the signers their stake. That is the shape of a
matching engine: heavy, parallel, deterministic.

| JAM phase | jamswap's job |
|---|---|
| **Refine** | the matching engine: which orders trade, at what price |
| **Accumulate** | settlement: move balances, record the new order book |

## How it trades

- **Batches, not a race.** Orders collect for one round (a JAM slot, 6 seconds) and clear
  together at a single price, so there is no first-come advantage to buy.
- **Deterministic matching.** Integer-only, no randomness: anyone who re-executes a round
  gets the byte-identical result, which is what makes auditing it decisive.
- **Your keys.** Each account signs its orders with its own key; refine checks the
  signatures, so not even the builder that submits a round can forge an order.
- **Sealed orders.** By default an order can be committed now and revealed only in the
  round it trades (commit–reveal), so nobody can react to it before it clears. An opt-in
  mode encrypts orders to a committee until the batch closes (the committee is simulated
  today).

## Where to read more

The full explainer, including sealed orders, throughput and costs, is in jamswap's
[`docs/HOW_IT_WORKS.md`](https://github.com/abutlabs/jamswap/blob/main/docs/HOW_IT_WORKS.md).
The service is Rust compiled to a PVM blob (`service/`), the off-chain builder and
exchange server are Python (`offchain/`), and every piece is open source.

Next: [run it and read its verdict](lesson.html?lesson=01-jamswap/02-run-it).
