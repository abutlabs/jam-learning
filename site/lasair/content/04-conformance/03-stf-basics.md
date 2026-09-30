# State Transitions I: History, Statistics, Authorizations

Every STF vector has the same shape:

```json
{
  "input":      { ... what the block brings ... },
  "pre_state":  { ... state before ... },
  "output":     { ... return value, often null or an error code ... },
  "post_state": { ... state after — must match EXACTLY ... }
}
```

The implementation applies its transition function to `(input,
pre_state)` and must reproduce `(output, post_state)` byte for byte.
Vectors deliberately include error cases — a conformant client must
*fail identically*, not just succeed identically.

## History STF (β — recent blocks)

Keeps the last 8 blocks' header hashes, state roots, reported work
packages and (new in Graypaper 0.8.0) timeslots, plus a Merkle Mountain
Belt of accumulation outputs.

**The subtle rule this teaches**: a block's own state root isn't known
when its history entry is written — so each block *patches its parent's
entry* with `parent_state_root` from the header. Guarantee anchors are
validated against this patched view.

```bash
dune exec bin/examples.exe -- history
```

Sample input fields from `progress_blocks_history-1`:

```json
"input": {
  "header_hash":       "0x530e...",
  "parent_state_root": "0x0e6c...",
  "accumulate_root":   "0x8720...",
  "slot":              0,
  "work_packages":     [ ... ]
}
```

## Statistics STF (π — validator activity)

Counts per validator: blocks authored, tickets, preimages, guarantees,
assurances — with a current-epoch and a last-epoch record that rotate at
epoch boundaries.

```bash
dune exec bin/examples.exe -- statistics
```

A lesson lasair learned the hard way: the rotation triggers when the
*epoch index* changes — `floor(slot/E) > floor(prev_slot/E)` — not when
`slot mod E == 0`. Blocks can skip the boundary slot entirely (a chain
can jump from slot 179 to 182), and the vectors test exactly that.

## Authorizations STF (α, φ — who may use a core)

Each core has a pool (max 8) of authorizer hashes; a work package must be
signed off by one of them. Used authorizers are consumed; the pool
refills from a per-core queue of 80.

```bash
dune exec bin/examples.exe -- authorizations
```

From `progress_authorizations-3`:

```json
"input": {
  "slot": 57,
  "auths": [ { "core": 1, "auth_hash": "0x678d..." } ]
}
```

Three small subsystems — but each one is consensus-critical: get the
pool rotation wrong and your node forks off the network at the first
authorized work package.
