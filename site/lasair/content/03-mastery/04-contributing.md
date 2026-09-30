---
title: Contributing to Lasair
duration: 20 min
---

# Contributing to Lasair

You've learned OCaml. You understand JAM. You've studied lasair's architecture. This lesson covers the practical side: how work on lasair is done, day to day, and the habits that got it through the conformance fuzzer.

A note before you start: **lasair's source repository is private** at the time of writing, so this course can name its files but not link to them. Everything below applies just as well to a JAM client of your own, and that is the best way to use it.

## The Mission

Lasair is competing for the JAM Implementer's Prize (language set D, "correct code"). Every piece of work serves one of:

- A complete, correct JAM implementation of Graypaper 0.8.0
- Passing conformance tests, and the official fuzzer
- Demonstrating OCaml's viability for blockchain
- Building something that matters

M1 (the importer) was passed on Graypaper 0.7.2. The client now implements 0.8.0 and works on M2, the full validating node.

## Getting Started

### Build

Lasair needs OCaml ≥ 5.1, dune 3.x, and a Rust toolchain for its FFI crates:

```bash
# One-time: the official test vectors, pinned as a git submodule
git submodule update --init --depth 1 vectors

# One-time: the Rust FFI libraries (Ring VRF, Ed25519, erasure coding, QUIC)
for c in bandersnatch-ffi ed25519-ffi erasure-ffi quic-ffi hello-ffi; do
  (cd rust/$c && cargo build --release)
done

# Build and run the unit tests
dune build
dune test --force
```

### Project Structure

```
lasair/
├── lib/                    # Core protocol library, one module per GP chapter
│   ├── notation.ml         # Type building blocks
│   ├── definitions.ml      # Protocol constants
│   ├── spec.ml             # tiny / full / chainspec parameters
│   ├── serialization.ml    # JAM codec
│   ├── merklization.ml     # Merkle trees, state keys
│   ├── state_db.ml         # State key-values, trie root, proofs
│   ├── pvm.ml, pvm_gas.ml, pvm_host.ml   # PVM, gas model, host calls
│   └── ...
├── conformance/            # The importer and the test harnesses
│   ├── trace_runner.ml     # Block import (Trace_runner.import_block)
│   ├── block_codec.ml      # Binary block codec
│   └── ...
├── jamnp/                  # The node: JAMNP-S networking, authoring, finality
├── bin/                    # runner.exe, conformance_target (the fuzz target),
│                           # lasair_client (the node), lasair_reader (JIP-2 RPC)
├── rust/                   # FFI crates
├── test/                   # Unit tests
├── scripts/                # conformance.sh (the gate), live-network scripts
└── vectors/                # Official test vectors (submodule)
```

## Code Style

### Follow the Graypaper

Lasair maps directly to the Graypaper. When implementing, cite the equation you are implementing:

```ocaml
(* GP 0.8.0 reporting_assurance.tex, eq. ...: a core becomes available
   with more than two-thirds of |κ| assurances *)
let available ~assurances ~kappa_size =
  assurances > (2 * kappa_size) / 3
```

The module names follow the Graypaper's chapter files (`safrole.ml`, `accumulation.ml`, `statistics.ml`, …), so a diff between Graypaper versions tells you which modules to open.

### Type-Driven Development

Let types guide implementation:

```ocaml
(* Define types first *)
type work_error =
  | OutOfGas
  | Panic
  | BadExports
  | Oversize
  | BadCode
  | CodeOversize

(* Types make illegal states unrepresentable *)
type validated_block = private ValidatedBlock of block
(* Can only create via validation function *)
```

### Functional Style

Prefer immutable data and pure functions:

```ocaml
(* Good: Pure transformation *)
let apply_ticket state ticket =
  { state with tickets = ticket :: state.tickets }

(* Avoid: Mutation *)
let apply_ticket_bad state ticket =
  state.tickets <- ticket :: state.tickets;  (* No! *)
  state
```

Lasair's node is built the same way: a pure kernel (`step : state → event → state × effect list`) that both a deterministic simulator and the real QUIC node drive.

### Error Handling

Use Result types, not exceptions, for expected failures:

```ocaml
(* Good: Explicit errors *)
let parse_header bytes =
  if Bytes.length bytes < header_size then
    Error `HeaderTooShort
  else
    Ok (decode_header bytes)

(* Avoid: Exceptions for expected failures *)
let parse_header_bad bytes =
  if Bytes.length bytes < header_size then
    failwith "header too short"  (* No! *)
  else
    decode_header bytes
```

A fuzz target makes this concrete: adversarial input is *expected*. A decode error must become an error message on the wire, never an exception that escapes and kills the process.

## Finding Work

### Conformance Tests

The primary goal is passing conformance tests:

```bash
# Every vector family; storage traces run real PVM workloads
dune exec bin/runner.exe

# Just the verdict / just the failures
dune exec bin/runner.exe 2>&1 | tail -3
dune exec bin/runner.exe 2>&1 | grep FAIL

# One suite (the filter is a regex), or one test in it
dune exec bin/runner.exe -- test "Accumulate STF"
dune exec bin/runner.exe -- test "Traces .storage." 5
```

Failing tests show exactly what needs fixing.

### The Gate

Before anything is committed, the whole gate runs:

```bash
bash scripts/conformance.sh     # 48 "ok:" lines, 2 "skip:", exit 0
```

It covers every official GP 0.8.0 vector family at tiny and full spec, the 1000 block-import traces in-process and over the fuzzer's socket protocol, the PVM differential against polkavm, a mutation smoke test, re-import of lasair's own authored blocks, and the banked fuzzer regressions. The gate's high-water marks only ever go up: a change that makes any line worse does not go in.

### Graypaper Sections

The work is organized by Graypaper section. For the 0.7.2 → 0.8.0 migration, the diff of each chapter's `.tex` file mapped one-to-one onto lasair modules:

| GP 0.8.0 file | What changed | Lasair modules |
|---|---|---|
| `pvm.tex` | gas model, `sbrk` removed | `lib/pvm.ml`, `pvm_gas.ml`, `pvm_decode.ml` |
| `pvm_invocations.tex` | `grow_heap`, host-call prices | `lib/pvm_host.ml` |
| `reporting_assurance.tex` | ρ layout, refine context, erasure shards | `lib/reporting.ml`, `conformance/reports_stf.ml` |
| `judgments.tex` | verdict limits, error codes | `lib/judgments.ml`, `conformance/disputes_stf.ml` |
| `safrole.tex` | resizable validator sets | `lib/safrole.ml`, `conformance/safrole_stf.ml` |
| `merklization.tex` | trie bit order | `lib/merklization.ml`, `lib/state_db.ml` |

## Making Changes

### Create a Branch

```bash
git checkout -b fix/host-call-xyz
```

### Write Tests First

A test that fails without the fix. Every fix from the fuzzer's first 0.8.0 batch came with one:

```ocaml
(* test/pvm_host_test.ml *)

let test_host_call_gas () =
  (* the gas call costs 48 and answers with the gas left AFTER that *)
  let result = Pvm_host.host_gas (context ~gas:1000L) (registers ()) (memory ()) in
  Alcotest.(check int64) "gas returned" 952L (Pvm.get_reg result.new_regs 7)

let () =
  Alcotest.run "PVM" [
    "host_calls", [
      Alcotest.test_case "gas" `Quick test_host_call_gas;
    ]
  ]
```

### Implement

```ocaml
(* lib/pvm_host.ml *)

let host_gas (ctx : host_context) (regs : registers) (mem : ram) : host_result =
  let new_gas = Int64.sub ctx.gas_remaining Gas.g in
  let regs' = set_reg regs 7 new_gas in
  { new_gas; new_regs = regs'; new_mem = mem; new_service = None; new_context = None }
```

### Document

```ocaml
(** [host_gas ctx regs mem] returns the remaining gas.

    Implements GP 0.8.0 appendix B, Omega_G (gas = 0): the gas
    counter after this call's own cost, in register 7.

    @param ctx The invocation's host context
    @return The updated gas and registers *)
let host_gas ctx regs mem =
  ...
```

## Pull Request Process

### Before Submitting

1. **Tests pass**: `dune test --force`
2. **Builds clean**: `dune build`
3. **The gate passes**: `bash scripts/conformance.sh`
4. **No warnings**: Check compiler output

### PR Description

```markdown
## Summary
Charge `fetch` on the bound z, not on the octets copied.

## Changes
- `Pvm_host.fetch_charge_len`: price an offset past the value's end
  on the requested length
- Add unit test

## Graypaper Reference
GP 0.8.0 appendix B, Omega_Y (fetch = 2)

## Testing
- New test fails without the fix
- Replays the fuzzer report that found it; gate: 48 ok
```

### Review Process

1. Automated checks run (CI)
2. Maintainer reviews code
3. Address feedback
4. Merge when approved

## Debugging Tips

### Printf Debugging

```ocaml
let process_block state block =
  Printf.eprintf "Processing block at slot %d\n%!" block.header.slot;
  ...
```

### Trace Output

Lasair's own switches, set from the environment:

```bash
# Verbose host-call and STF logging
LASAIR_DEBUG=1 dune exec bin/runner.exe -- test "Traces .storage." 5

# One line per PVM step, "pc gas r0..r12"
LASAIR_TRACE_FILE=/tmp/run.trace dune exec bin/runner.exe -- test "Accumulate STF" 19
```

### Interactive Testing

```bash
# Start utop with lasair loaded
dune utop lib

# Try things interactively
utop # open Lasair;;
utop # Serialization.encode_compact 1000L;;
```

## Common Pitfalls

### Endianness

JAM uses little-endian encoding:

```ocaml
(* Correct: little-endian *)
let encode_u32 n =
  let b = Bytes.create 4 in
  Bytes.set_int32_le b 0 (Int32.of_int n);
  b

(* Wrong: big-endian *)
let encode_u32_bad n =
  let b = Bytes.create 4 in
  Bytes.set_int32_be b 0 (Int32.of_int n);  (* No! *)
  b
```

### Epoch Boundaries

```ocaml
(* Correct: a new epoch when the epoch INDEX changes *)
let is_new_epoch ~prev_slot ~slot =
  slot / c_epoch_length > prev_slot / c_epoch_length

(* Wrong: slots can be skipped, so the boundary slot may never appear *)
let is_new_epoch_bad ~slot =
  slot mod c_epoch_length = 0
```

### Unsigned 64-bit Values

Balances, gas, registers and compact naturals are unsigned 64-bit values, but OCaml's `int64` is signed:

```ocaml
(* Correct: compare unsigned *)
let fits v limit = Int64.unsigned_compare v limit < 0

(* Wrong: 2^63 and above look negative, so they "fit" everything *)
let fits_bad v limit = v < limit
```

This one reached the official fuzzer: a compact natural of 2⁶⁴ − 70 was encoded in one byte, and a valid block was rejected.

## Resources

### Documentation

- [Graypaper](https://graypaper.com) - The specification
- [JAM test vectors](https://github.com/davxy/jam-test-vectors) - The conformance vectors
- [JAM Implementer Proposals](https://github.com/polkadot-fellows/JIPs) - The standards between clients
- [OCaml Manual](https://ocaml.org/manual/) - Language reference

### Tools

- `dune` - Build system
- `utop` - Interactive REPL
- `ocamlformat` - Code formatter
- `merlin` - IDE support

## Your First Contribution

Here's a concrete path, for lasair or for your own client:

1. **Read** a failing conformance test
2. **Trace** where it fails in the code
3. **Understand** what the Graypaper says should happen
4. **Implement** the fix
5. **Test** that it passes, and that the whole gate still does
6. **Submit** a PR

Every contribution matters. A one-line fix that makes a test pass is valuable.

## The Vision

Lasair isn't just code—it's a statement that:

- Functional programming works for systems programming
- OCaml can implement complex protocols
- Formal specifications can guide implementation
- Correctness can be demonstrated, not just claimed

You're not just learning. You're building the future.

## Track Complete!

Congratulations! You've completed the core of Learning Lasair:

- **Track 0.1**: OCaml foundations (preliminary)
- **Track 0.2**: Functional patterns (preliminary)
- **Track 1**: JAM protocol concepts
- **Track 2**: Lasair core modules
- **Track 3**: Mastery and contribution

You now have the knowledge to:
- Read and understand lasair's codebase
- Implement protocol features
- Debug conformance issues
- Contribute to the project

Next, see how a client proves it is correct: [Conformance →](lesson.html?lesson=04-conformance/01-overview)

---

*"Simple, not easy. Excellence earns autonomy."*

[Return to Course Overview →](index.html)
