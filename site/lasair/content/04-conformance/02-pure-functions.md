# Pure Functions: Shuffle, Codec, Trie, Erasure

These four categories test deterministic functions: same input, same
output, no state. They are the foundation everything else stands on.

## Shuffle (Graypaper Appendix F)

JAM assigns validators to cores with a Fisher-Yates shuffle whose
randomness comes from hashing an entropy seed — every client must produce
the *identical* permutation.

**Vector**: `vectors/shuffle/shuffle_tests.json` — a sequence length and a
32-byte entropy; the expected permutation.

```bash
dune exec bin/examples.exe -- shuffle
```

```
INPUT  sequence  : [0; 1; 2; 3; 4; 5; 6; 7]  (identity, n=8)
INPUT  entropy   : ffffffffffffffffffffffffffffffff…
EXPECT permutation: [1; 2; 6; 0; 7; 4; 3; 5]
GOT    permutation: [1; 2; 6; 0; 7; 4; 3; 5]
VERDICT: PASS
```

One byte of entropy difference produces a completely different
permutation — which is exactly the point: nobody can predict or bias the
validator-to-core assignment.

## Codec (Appendix C)

JAM's wire format. Every structure — headers, work reports, extrinsics —
has exactly one valid encoding. Vectors come in *pairs*: a `.bin` file
(canonical bytes) and a `.json` file (the same value, human-readable).
The test: decode the binary, re-encode it, get identical bytes.

```bash
dune exec bin/examples.exe -- codec
```

```
INPUT  vectors/codec/tiny/work_report.bin (483 bytes)
DECODED work report:
  core_index    : 3
  package hash  : 30466e0ae1b05dde…
  results       : 2 work item(s)
  bytes consumed: 483 of 483
RE-ENCODED: 483 bytes — identical
VERDICT: PASS
```

(The same fixture was 445 bytes under Graypaper 0.7.2. In 0.8.0 a work
report's availability spec carries its erasure-shard count and its
refinement context gained two fields, among other changes.)

The interesting detail is the **compact natural** encoding: integers take
1–9 bytes depending on magnitude, with the leading byte's high bits
declaring the length. Get one compact wrong and every following byte
shifts — which is why round-trip identity is such a strong check.

## Trie (Appendix D)

All of JAM's state — every account, every storage entry — lives in one
binary Patricia Merkle trie whose 32-byte root *is* the state commitment.
Vectors give a set of key/value pairs and the expected root.

```bash
dune exec bin/examples.exe -- trie
```

```
INPUT  1 key/value pair(s):
  3dbc5f775f615695… -> 4227b4a465084852…
EXPECT root: 5fd68f074c914741601931d64c6c772c18ab8a4cd0cd3a4fff0611a5d97ecc94
VERDICT: PASS
```

The same single pair had a different root under Graypaper 0.7.2: 0.8.0
moved the trie's node-type bits to the most significant end of the first
byte, so every root changed.

Every trace test ends by computing this root over the full post-state —
the trie is the final arbiter of every other test in the suite.

## Erasure coding (Appendix H)

Availability: work-package bundles are Reed-Solomon coded into shards,
one per validator, such that about a third of the shards reconstructs the
data: any 342 of 1023 on the full spec. (The exact count is the
Graypaper's ecoriginalshards(v), the largest d ≤ ⌊v/3⌋ + 1 that divides
a 4104-byte segment into 2d-byte pieces; on the tiny spec that is 3 of 6,
a half, where 0.7.2 used 2.) Vectors give the data and the expected
shard bytes.

```bash
dune exec bin/examples.exe -- erasure
```

```
INPUT  data: 100 bytes
EXPECT 6 shards
  shard 0: c39caf301288501d98f635ed7d28be53… (34 bytes)
VERDICT: PASS
```

Lasair calls into a Rust FFI for the Galois-field arithmetic — and the
vectors don't care: bytes in, bytes out, identical across languages.
