# Why build JAM together

JAM is one protocol with many independent clients, and the point of it is the services
that run on it. Neither is proven by the Graypaper or the conformance vectors alone. The
vectors check one client's state transitions against a reference, block by block. They
cannot show that validators running *different* clients agree on one chain in real time,
finalize it together, and keep a real service's state byte-identical on every node. Only
running them together shows that, and every client team gains when it happens before
mainnet rather than on it.

This section gives you a shared workload to do it with: **jamswap**, an order-book
exchange that runs as a JAM service.

- It runs on nets of any mix of clients. Today: six lasair validators, six PolkaJam
  validators, and three of each on one chain.
- It reaches the chain only through the [JIP-2](https://github.com/polkadot-fellows/JIPs)
  node RPC, so any client that serves JIP-2 can run it.
- Its soak test ends in a verdict every client team can read: one head on every node,
  finality advancing everywhere with the same hash, the exchange's trades settling, and
  the service's state byte-identical on every client.

## What you can do here

1. **Run jamswap** on a net yourself and read what its verdict proves
   ([track 1](lesson.html?lesson=01-jamswap/02-run-it)).
2. **Run a mixed net**, lasair and PolkaJam on one chain, and compare the two clients
   ([track 2](lesson.html?lesson=02-mixed-nets/01-lasair-and-polkajam)).
3. **Bring your client**: check your node in one command, add it to a net, soak it
   ([track 3](lesson.html?lesson=03-bring-your-client/01-join-a-net)).
4. **Bring your service**: build it for GP 0.8.0, deploy it at runtime, run it beside
   jamswap ([track 4](lesson.html?lesson=04-bring-your-service/01-build-deploy-run)).

Everything runs on your machine from public images: lasair from `ghcr.io/abutlabs/lasair`,
PolkaJam from its public release, built into a local image the first time a net needs it.
To see what the nets are doing, run the observability stack beside them; the course
[Learning Observability](../observability/index.html) teaches reading it.

## You will need

- Docker (Docker Desktop on macOS works), about 8 GB of memory free, and Python 3.
- `git clone https://github.com/abutlabs/jamswap` and
  `git clone https://github.com/abutlabs/observability` **side by side in one directory**:
  jamswap finds the stack as `../observability`.
