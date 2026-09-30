# State Transitions II: Safrole, Disputes, Assurances

The consensus trio. These STFs verify *cryptography*, so the vectors
embed real signatures — Ring-VRF proofs and ed25519 — and a conformant
client must verify them with the exact context strings the Graypaper
prescribes.

## Safrole STF (γ — block production)

JAM elects block authors by anonymous lottery: validators submit
Ring-VRF *tickets* during an epoch; the best tickets win the right to
author specific future slots. The ring proof shows "one of the
validators made this" without revealing which one.

```bash
dune exec bin/examples.exe -- safrole
```

Input: a slot, entropy, and the ticket extrinsic. The STF must verify
each ring proof against the epoch's ring root (lasair calls the
bandersnatch Ring-VRF through Rust FFI), insert tickets in sorted order,
and at epoch boundaries rotate the sealing-key series. Error vectors
include duplicate tickets, bad proofs, and out-of-order submissions —
all must be *rejected with the right error code*.

## Disputes STF (ψ — judging bad work)

When validators disagree about a work report, they vote. A verdict
carries ⌊2|k|/3⌋+1 signed judgments from the validator set k it names
(the current or the previous epoch's); the STF tallies them into
good/bad/wonky sets, records offenders (with culprit/fault proofs), and
scrubs disputed work from the cores. Graypaper 0.8.0 tightened the rules:
at most 16 verdicts and 16 each of culprits and faults per block, no
minimum of two culprits for a bad verdict, and renumbered error codes
(the vectors' `not-enough-culprits` is gone, `bad-votes-count` is new).

```bash
dune exec bin/examples.exe -- disputes
```

The signature contexts are part of the protocol: `jam_valid` and
`jam_invalid` prefix the message a judge signs. Sign the wrong context
and the signature is meaningless — vectors check this.

## Assurances STF (availability voting)

After a report is guaranteed onto a core, validators attest they hold
their erasure-coded shard by signing a per-core bitfield (context
`jam_available`). When more than 2/3 of validators (⌊2|κ|/3⌋+1) assure a
core, the report becomes **available** and graduates to accumulation.

```bash
dune exec bin/examples.exe -- assurances
```

From `assurance_for_not_engaged_core-1`:

```json
"input": {
  "assurances": [
    { "anchor": "0xd61a...", "bitfield": "0x03",
      "validator_index": 0, "signature": "0x3dbe..." },
    ...
  ],
  "slot": 12,
  "parent": "0xd61a..."
}
```

Bitfield `0x03` = bits for cores 0 and 1 — this validator holds shards
for both. The anchor must be the parent block's hash. Six validators,
threshold five: the vectors walk every edge of the counting. (This one is
an error case: a bit is set for a core that has no report waiting.)
