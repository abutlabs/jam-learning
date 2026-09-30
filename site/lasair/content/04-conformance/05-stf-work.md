# State Transitions III: Reports, Preimages, Accumulate

The work pipeline — where JAM stops being a consensus engine and starts
being a computer.

## Reports STF (guarantee validation)

A *guarantee* is a work report plus two or three guarantor signatures.
Before a report may sit on a core, ~15 validity rules apply: core
bounds, rotation windows, anchor recency against recent history, the
state root of the anchor block, per-service code-hash matches, gas
limits, sorted-unique credentials, and the ed25519 signatures themselves
(over `jam_guarantee ++ blake2b(encode(report))`). Graypaper 0.8.0 added
more: the anchor's slot must match its recent-history entry, the report's
erasure-shard count must equal the current validator count, and only the
first |κ′|/3 cores are active.

```bash
dune exec bin/examples.exe -- reports
```

The vector set is mostly *invalid* reports — one per rule. This is the
STF that taught lasair block rejection: the fuzzy trace family contains
whole blocks that must be refused because one work result lies about its
service's code hash.

## Preimages STF (the data-availability contract)

Services don't store big blobs in state — they store *requests* for
them: "(hash, length), unprovided". Anyone may then supply the matching
blob in a block body. The STF integrates a blob only if its request
exists and is still unprovided, then stamps the request with the
timeslot.

```bash
dune exec bin/examples.exe -- preimages
```

A real request entry from `preimage_needed-1`:

```json
"preimage_requests": [
  { "key": { "hash": "0x9e0e7d32...", "length": 46 },
    "value": [] }          // [] = solicited, not yet provided
]
```

After provision, `"value": [42]` — provided at slot 42. The value list
is the request's life story: `[]` wanted, `[t1]` provided, `[t1,t2]`
unrequested, `[t1,t2,t3]` re-requested. Two timeslots and a cooldown
(D = 32 slots on tiny) gate forgetting — these vectors are where
lasair's solicit/forget/expunge host calls were proven.

## Accumulate STF (real PVM execution)

The deepest test in the suite: vectors carry **actual service bytecode**
(the same RISC-V-derived PVM programs every client must run), service
accounts with storage and balances, and work reports ready to
accumulate. The implementation must:

1. invoke each service's ACCUMULATE entry point inside the PVM
   (program counter 5, standard memory layout),
2. meter gas **exactly** — per basic block from the Graypaper 0.8.0
   pipeline model, plus each host call's price from the host-call gas
   table (under 0.7.2 it was 1 per instruction and 10 per host call),
3. apply every storage write, transfer, service creation the code makes,
4. report the gas consumed in the service statistics.

```bash
dune exec bin/examples.exe -- accumulate
```

There is no "close enough" here: if your interpreter executes one extra
instruction, or prices one basic block differently, the gas figure in
your post-state differs and the vector fails. Lasair's PVM was verified bit-for-bit against the reference
polkavm interpreter — every program counter, every register, across
runs of hundreds of thousands of steps — and these vectors are why that
rigor was necessary.
