# Traces: Full Block Import

Everything converges here. A trace vector is a complete pre-state (every
key/value in the chain's trie), one block, and the expected post-state.
The test is brutal in its simplicity:

> Import the block. Compute your post-state's Merkle root. It either
> equals the expected root, or you failed.

There are eight families, 1,000 blocks in all, in the Graypaper 0.8.0
corpus (the 0.7.2 corpus had the same eight) — and lasair passes **all
1,000**, both in-process and over the fuzzer's binary socket protocol:

| Family | What it stresses |
|---|---|
| fallback | the consensus skeleton: clock, entropy, stats |
| safrole | tickets, epochs, sealing keys |
| storage / storage_light | service storage via real PVM execution, gas, footprints |
| preimages / preimages_light | solicit/provide/forget lifecycle |
| fuzzy / fuzzy_light | *everything at once* — service creation/destruction, transfers, upgrades, checkpoints, panics — **plus deliberately invalid blocks** |

```bash
dune exec bin/examples.exe -- trace
```

```
Vector: vectors/traces/storage/00000006.json
  Pre-state: 21 entries
  Pre-state root: OK
  Post-state root: OK
VERDICT: PASS
```

## Why one byte fails the root

The post-state root commits to *every* byte of *every* state entry: a
service's gas statistics, the order of entries in the accumulated-set
ring, the timeslot stamped on a preimage request. During lasair's
conformance campaign (on Graypaper 0.7.2), single-byte diffs traced back to things like:

- a gas counter 10 too high (the `gas` host call returned its pre-charge
  value),
- a Merkle prefix encoded as `"$node"` when the Graypaper's `$` was
  notation, not a literal,
- statistics attributing one service's work to another.

Each was invisible in isolation and fatal in the root. That is the
genius of the trace format: it makes *the entire implementation* one
falsifiable claim.

## The adversarial twist

Roughly one fuzzy vector in twenty is an **invalid block** — a forged
code hash, a mutated guarantee. Its expected post-state is byte-identical
to the pre-state: the only conformant behavior is to *reject the block
wholesale*. Passing these means your validation rules fire before any
state is touched — exactly what a node needs when the official fuzzer
(or a real adversary) starts feeding it garbage.

Explore real vectors interactively in the
[Conformance Explorer](conformance.html) — including the storage
blocks, the service-creation fuzzy block, and the adversarial block 143.
