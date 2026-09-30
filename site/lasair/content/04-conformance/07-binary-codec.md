# The Binary Codec: An Oracle in Every Vector

The official fuzzer does not speak JSON. It speaks the JAM codec — a
compact, deterministic binary encoding — over a Unix socket. A client
that passes every trace vector but cannot parse the wire format fails
conformance before importing a single block.

Lasair's trace pipeline grew up on the `.json` side of the corpus. But
every vector ships as a **pair**: `00000001.json` and `00000001.bin`,
the same pre-state, block, and post-state in both encodings. That pair
is a perfect oracle — for the codec, the JSON twin plays the role the
post-state root plays for the STF.

## The shape of the wire

Three building blocks compose the entire format (`conformance/block_codec.ml`):

- **Fixed-width material** — hashes are 32 bytes, Ed25519 signatures 64,
  Bandersnatch ring proofs 784, a VRF output 96. No length prefix; the
  Graypaper fixes the size.
- **Compact integers** — lengths and counts use a variable-length
  encoding (1 byte below 128, prefix bits encode the width above).
- **Discriminants** — an optional field is one byte, `0` or `1`; a
  one-byte tag picks union variants. Anything else is malformed.

A block header is just these in sequence: three hashes, a u32 slot, an
optional epoch mark, an optional tickets mark, a u16 author index, the
VRF entropy source, a compact-counted offender list, the seal. Decode
and encode are mirror images, ~200 lines each.

## The round-trip property

The proof is `bin/codec_check.exe`, and it states the property the way
the trace runner states state correctness — as bytes or failure:

```
decode(bin)            must consume every byte, and
encode(decode(bin))    must equal bin, byte for byte
```

over **every binary artifact in the vectors**: the codec fixtures
(headers, every extrinsic component, full blocks) and all 1,000 trace
vectors across the eight families, 1,015 files on the Graypaper 0.8.0
corpus. It runs inside `scripts/conformance.sh`, so the codec can never
silently regress.

## The bug that failed 633 vectors

When the harness first ran (during the M1 campaign, on the Graypaper
0.7.2 corpus), 633 of 633 reachable checks failed — and then the process
was OOM-killed. The cause was one line.

`Serialization.decode_compact` returns `(value, bytes_consumed)`.
The codec's wrapper assumed it returned `(value, new_offset)`:

```ocaml
(* wrong: 'consumed' is a byte count, not a position *)
let dec_compact b off =
  let (v, consumed) = decode_compact b off in
  (Int64.to_int v, consumed)        (* offset teleports to ~1 *)

(* right *)
  (Int64.to_int v, off + consumed)
```

Every decode past the first compact integer read from the wrong place.
Worse: because the bogus "offset" pointed *backward*, a list decoder
could loop without ever advancing, growing its accumulator until the
kernel killed the process. One contract mismatch, three symptoms —
wrong bytes, false structure errors, and an OOM that looked like a
memory leak.

Two durable lessons came out of the fix:

1. **Cursor discipline is a contract.** Every decoder in
   `block_codec.ml` takes `(buf, offset)` and returns `(value, offset')`
   — the *new absolute position*, never a count. Mixing the two
   conventions in one module is how 633 failures hide behind one line.
2. **Fail fast beats fail eventually.** A list count is garbage if it
   exceeds the bytes remaining (every element costs at least one byte).
   Checking that up front turns "allocate toward an OOM" into an
   immediate, named error — exactly the behavior a fuzz target needs
   when an adversary controls the length fields.

## Why the oracle pattern matters

The fix took minutes; *finding* it took one failing fixture and a size
calculation. `header_0.bin` was 777 bytes; summing the Graypaper field
widths for its JSON twin also gave 777. (In the 0.8.0 corpus the same
fixture is 778 bytes: its epoch mark's validator list gained a
length prefix.) So the format understanding
was right and the plumbing was wrong — a conclusion available only
because every binary vector carries its own answer key.

That is the recurring shape of this campaign: never test against your
own understanding when the corpus ships an answer key. The
`.bin`/`.json` pairs make every codec claim falsifiable without ever
looking at anyone else's code.

Next: the fuzz-proto target speaks this codec over a socket —
`Initialize`, `ImportBlock`, `StateRoot` — and the recorded example
sessions in jam-conformance become the next oracle.
