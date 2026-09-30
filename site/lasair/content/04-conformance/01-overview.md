# How Every JAM Client Proves Itself

There is no reference implementation of JAM — by design. The Graypaper is
the only authority, and **every client must independently derive the same
behavior from it**. So how do a TypeScript node (typeberry), a Swift node
(boka), a Zig node (jamzig), a Rust node (polkajam) and an OCaml node
(lasair) prove they agree?

**Shared test vectors.** The community maintains
[w3f/jam-test-vectors](https://github.com/w3f/jam-test-vectors) (mirrored
in [davxy/jam-conformance](https://github.com/davxy/jam-conformance)):
thousands of JSON/binary fixtures, each describing an input and the exact
output a conformant implementation must produce. If two clients pass the
same vectors, they agree — without ever reading each other's code.

Lasair implements **Graypaper 0.8.0** and passes every published 0.8.0
vector: the component vectors at both the tiny spec (6 validators / 2
cores) and the full spec (1023 validators / 341 cores), and the
block-import traces at tiny (upstream publishes no full-spec traces). Its
gate, `scripts/conformance.sh`, runs all of them on every change and
prints 48 `ok:` lines when everything holds. This track walks through
every category with a runnable example.

Some later lessons tell the story of lasair's M1 campaign, which ran on
**Graypaper 0.7.2** (the M1 milestone was passed there, on the v1.x
images). Those lessons say so where they begin; the method carries over
unchanged, while some protocol details changed in 0.8.0.

## The three shapes of conformance test

| Shape | Categories | What is checked |
|---|---|---|
| **Pure function** | shuffle, codec, trie, erasure | `f(input) == expected_output`, byte for byte |
| **State transition (STF)** | history, statistics, authorizations, safrole, disputes, assurances, reports, preimages, accumulate | `apply(input, pre_state) == (output, post_state)` |
| **Block import (traces)** | fallback, safrole, storage, storage_light, preimages, preimages_light, fuzzy, fuzzy_light | import a full block onto a full pre-state; the resulting **Merkle root** must match exactly |

The shapes nest: traces exercise every STF at once, and the STFs lean on
the pure functions. A bug anywhere surfaces as one wrong byte in a state
root.

## Run the examples

Everything in this track is runnable from the lasair repository (which
is private at the time of writing; the commands show what each check
does):

```bash
# list all categories
dune exec bin/examples.exe

# run one
dune exec bin/examples.exe -- shuffle

# run every category end to end
dune exec bin/examples.exe -- all
```

Each example loads a **real vector** (the same file every other client
tests against), prints its input, runs lasair's production code path, and
compares the result with the expected output.

## Why this design is beautiful

A conformance vector is a *theorem about the protocol* stated in bytes.
When the fuzzy family says "importing block 143 must leave the state
untouched," it doesn't matter whether your client is written in OCaml or
Zig, whether you use a trie library or hand-rolled Merkle code — the
post-state root either matches or it doesn't. The vectors turn the
Graypaper's mathematics into something every implementation can be held
to, mechanically, forever.
