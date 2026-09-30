# jamswap: an exchange that runs as a JAM service

jamswap is a decentralized exchange with a real order book and a real matching engine,
running on JAM. It is worth running on your net because it exercises most of what a JAM
chain does for a service: work-packages refined on cores, guarantees and availability,
accumulation, preimages, and finality, all under load.

## Where it sits among on-chain order books

jamswap is not the first exchange to match orders on-chain. Hyperliquid built a layer-1
chain for trading, with the order book in its protocol and every validator running the
matching engine; dYdX (v4) and Injective are app-chains with order books; Serum (later
OpenBook) and Phoenix run order books as programs on Solana; BitShares and Stellar had
them in their protocols years earlier. Each paid for matching with a chain of its own or
with a fast chain's per-transaction compute limits.

JAM offers a different trade. Its **refine** phase computes a work-package on the few
validators assigned to a core; randomly selected auditors re-execute it, and a provably
wrong result costs the signers their stake. So jamswap is an ordinary JAM service: no
chain of its own, the same security as every other service, and heavy per-batch work
paid by one core's validators and its auditors rather than by the whole network.

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
