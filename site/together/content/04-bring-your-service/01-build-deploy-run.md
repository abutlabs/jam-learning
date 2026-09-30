# Build, deploy and run your service

A JAM chain is only as interesting as the services on it. Every net in this section can
run yours beside jamswap: build it for Graypaper 0.8.0, deploy it at runtime over JIP-2,
send it work, and watch it on the same dashboards.

## 1. Build it for GP 0.8.0

No public service SDK targets GP 0.8.0 yet: the published `jam-pvm-build` and
`jam-pvm-common` 0.1.28 build for 0.7.2, whose PVM still has `sbrk` and the old host-call
numbers, so their blobs do not run on a 0.8.0 node. jamswap's
[`tools/jam080`](https://github.com/abutlabs/jamswap/tree/main/tools/jam080) is the
smallest change to that toolchain that produces a 0.8.0 blob (Apache-2.0, every modified
file marked), and it builds any service crate:

```sh
rustup toolchain install nightly-2025-05-10 --component rust-src   # once
cargo build --release --manifest-path tools/jam080/builder/Cargo.toml
# in your service crate's Cargo.toml:
#   jam-pvm-common = { path = "<jamswap>/tools/jam080/jam-pvm-common", default-features = false, features = ["service"] }
#   polkavm-derive = "0.36"
tools/jam080/builder/target/release/jam080-build <your-service-crate> --out <dir>
```

It writes a `.jam` blob and prints its code hash. jamswap's own service
(`service/`) is a complete example of refine and accumulate written against it.

## 2. Deploy it at runtime

On a net whose chain has a Bootstrap service (id 0), `offchain/deploy.py` creates your
service over JIP-2 alone: a work-item to the Bootstrap service creates the account, your
code goes in as a preimage the new account requested, and the tool waits until the code
is available where refine will look for it. The simplest place to run it is inside the
net's exchange container, which already holds the chain spec:

```sh
docker cp your-service.jam lasair6-dex-1:/tmp/your-service.jam
docker exec lasair6-dex-1 python3 /app/deploy.py --rpc ws://reader:19800 \
    --chain-spec /shared/spec.json --code /tmp/your-service.jam \
    --no-setup --state /tmp/your-service.json
```

On `lasair6` it takes about half a minute:

```
deploy: <your service> (<n> bytes, hash <code hash>..)
deploy: Bootstrap service 0: jam-bootstrap-service 0.1.29
deploy: CreateService(id <id>, <n> bytes, endowment 1000000000) to service 0: package ... on core 0, anchor #<slot>
deploy: service <id> created
deploy: submitPreimage(<id>, <n> bytes) at #<slot>
deploy: service <id> ready (created #<slot>, balance ...)
SERVICE_ID=<id>
```

(`--no-setup` skips the exchange's own market setup; `--state` keeps your deployment's
record apart from the exchange's.)

## 3. Send it work

A service does its work in refine, on the payloads of the work-items addressed to it.
jamswap's off-chain side has the pieces: `offchain/workpackage.py` builds GP 0.8.0
work-packages (items, authorization, context) and `offchain/chain.py`'s `Jip2Chain`
submits them with JIP-2 `submitWorkPackage`, for any service id (`for_service`). The
exchange's round builder, `offchain/round.py`, is a worked example of a service's
off-chain half.

## 4. Watch it

Your service's work-packages and accumulations happen on the same chain the dashboards
already show: heads, finality, and, from nodes that send JIP-3, each block's life. For
panels of your own, jamswap's `observability/gen_dashboards.py` is a worked example of a
service adding dashboards for itself.

## 5. Share it

Open an issue in [jamswap](https://github.com/abutlabs/jamswap/issues): a second service
running beside the exchange, on every net, is exactly the kind of evidence that tells
client teams their node is ready for real workloads.
