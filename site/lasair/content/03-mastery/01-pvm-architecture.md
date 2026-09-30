---
title: PVM Architecture
duration: 35 min
---

# PVM Architecture

The Polkadot Virtual Machine (PVM) is the execution engine of JAM. Every service runs on PVM. Understanding its architecture is essential for working with lasair's interpreter — and lasair's PVM is verified **bit-identical** to Parity's open-source polkavm implementation, gas included, via a record-replay harness.

This lesson describes the PVM of **Graypaper 0.8.0**. Two things changed from 0.7.x that older material gets wrong: gas is now charged per *basic block* from a pipeline model (0.7.x charged 1 per instruction), and the `sbrk` instruction is gone (the heap grows through the `grow_heap` host call).

## What is PVM?

PVM is a **RISC-V-derived virtual machine** designed for blockchain execution:

- **Deterministic** - Same input always produces same output
- **Metered** - Gas limits prevent infinite loops
- **Sandboxed** - No access to host system
- **Simple** - Small register file, small instruction set, easy to verify

"RISC-V-derived" matters: PVM borrows RISC-V's load/store philosophy and
operation set, but it is **its own ISA** with its own register file,
instruction encoding, and program format, defined in the Graypaper's PVM
appendix. Knowledge of RISC-V helps; assuming RISC-V encodings will mislead
you.

## The Register File: 13 Registers

PVM has **13 general-purpose 64-bit registers** — not RISC-V's 32:

```
┌─────────────────────────────────────────────────────────────┐
│                    PVM Register File                         │
├─────────────────────────────────────────────────────────────┤
│  ω0   (RA)    : Return address                              │
│  ω1   (SP)    : Stack pointer                               │
│  ω2-ω4  (T0-T2) : Temporaries                               │
│  ω5-ω6  (S0-S1) : Saved registers                           │
│  ω7-ω12 (A0-A5) : Arguments / results                       │
│                                                              │
│  At startup A0 = args pointer, A1 = args length.            │
│  Host calls take their arguments in ω7.. and answer in ω7   │
├─────────────────────────────────────────────────────────────┤
│  pc         : Program counter (instruction counter)         │
│  gas        : Remaining gas (unsigned 64-bit)               │
└─────────────────────────────────────────────────────────────┘
```

There is **no hardwired zero register** — all 13 registers are writable.

## In Lasair: PVM State

From `lib/pvm.ml`:

```ocaml
(** Number of registers *)
let c_register_count = 13

(** Register file: 13 64-bit registers *)
type registers = reg_value array

(** Memory access permission *)
type access =
  | Inaccessible
  | ReadOnly
  | ReadWrite

(** RAM state - sparse page table using Hashtbl for O(1) lookups *)
type ram = (int, page) Hashtbl.t

(** Full machine state *)
type machine = {
  program: program;
  pc: int64;                (** Instruction counter *)
  gas: int64;               (** Gas remaining *)
  regs: registers;
  mem: ram;
  heap_ptr: int64;          (** Current heap end (grow_heap) *)
  heap_end: int64;          (** First address past the last possible RW page (grow_heap limit) *)
  gas_charged: bool;        (** GP 0.8.0: has the current basic block's gas been charged? *)
  pending_exit: exit_reason option;
    (** An exit a host call demands before the next instruction runs *)
}

(** Exit reason from PVM execution *)
type exit_reason =
  | Halt                  (** Normal termination *)
  | Panic                 (** Error condition *)
  | OutOfGas              (** Ran out of gas *)
  | PageFault of int64    (** Memory access fault with page address *)
  | HostCall of int64     (** Host call with identifier *)
```

## The Program Blob: Code + Bitmask + Jump Table

PVM instructions are **variable-length** — an opcode byte followed by zero
or more operand bytes. So how does the machine know where instructions
start? The program blob carries three parts:

```ocaml
(* From lib/pvm.ml *)
type program = {
  code: bytes;              (** Instruction data *)
  bitmask: bytes;           (** Opcode bitmask (1 bit per byte) *)
  jump_table: int64 array;  (** Dynamic jump targets *)
}
```

- **code** — the raw instruction bytes
- **bitmask** — one bit per code byte; a 1 marks the start of an
  instruction. Jumping to a position whose bit is 0 is a panic.
- **jump_table** — the only valid targets for *dynamic* (computed) jumps.
  Static branches encode an offset; dynamic jumps go through this table.

The length of an instruction's operands is the **skip distance**: the gap
to the next set bit in the bitmask (capped at 24 bytes). The decoder reads
the opcode, then interprets the following `skip` bytes as operands:

```ocaml
(* From lib/pvm.ml - the heart of the fetch/decode step *)
let skip = skip m.program m.pc in
let instr = Pvm_decode.decode m.program.code pc_int skip in
```

(For speed, lasair decodes each program once and caches the result, keyed by the program's content, so the hot loop reads pre-decoded instructions. The semantics are the same.)

This design means immediates are encoded in exactly as many bytes as the
gap allows — one source of the codec-style off-by-one bugs that conformance
vectors love to catch.

## Memory Model

PVM uses **sparse paged memory** with per-page access control:

- Page size: 4096 bytes
- Pages exist only when allocated (a hash table, not a flat array)
- Each page is `Inaccessible`, `ReadOnly`, or `ReadWrite`
- **The first 64 KB is always inaccessible** — any access below 2¹⁶
  *panics* the machine, so null-pointer dereferences stop the program
  instead of silently reading zeros (an inaccessible page higher up
  exits with a page fault instead)

A *standard program* (the Graypaper's Y function, `lib/pvm_program.ml`)
lays out its 32-bit address space in zones (Z = 2¹⁶, I = 2²⁴):

```
┌─────────────────────────────────────────────────────────────┐
│              Standard Program Memory Layout                  │
├─────────────────────────────────────────────────────────────┤
│  0x00000000 ─┬─ Always inaccessible (first 64 KB = Z)       │
│  Z           │  Read-only data (padded to page)             │
│  2Z + ...   ─┼─ Read-write data + heap (grows via grow_heap)│
│              │            ...                                │
│  2³² −2Z −I ─┼─ Stack (fixed size s, grows down toward SP)  │
│  2³² −Z −I  ─┼─ Arguments (read-only)                       │
│  2³²        ─┴─                                              │
└─────────────────────────────────────────────────────────────┘
```

And the registers start as (from `lib/pvm_program.ml`):

```ocaml
let init_registers (args : bytes) : int64 array =
  let regs = Array.make 13 0L in
  regs.(0) <- Int64.of_int (0x100000000 - 0x10000);  (* RA = 2^32 - 2^16 *)
  regs.(1) <- Int64.of_int (0x100000000 - 2 * init_zone_size - init_input_size);  (* SP *)
  regs.(7) <- Int64.of_int (0x100000000 - init_zone_size - init_input_size);  (* A0 = args ptr *)
  regs.(8) <- Int64.of_int (Bytes.length args);  (* A1 = args len *)
  regs
```

Returning to that initial RA value (2³² − 2¹⁶, an inaccessible address) is
how a program signals a clean **halt**.

## Instruction Set

The Graypaper defines ~90+ opcodes, grouped by operand shape. From
`lib/pvm_decode.ml`:

```ocaml
type instruction =
  (* No operands *)
  | Trap                                              (* 0 *)
  | Fallthrough                                       (* 1 *)
  | Unlikely                                          (* 2 - GP 0.8.0: a branch hint, no-op *)
  (* One immediate *)
  | Ecalli of { imm: int64 }                          (* 10 - host call *)
  | Jump of { offset: int64 }                         (* 40 *)
  (* Register + immediate *)
  | Load_imm_64 of { ra: int; imm: int64 }            (* 20 *)
  | Jump_ind of { ra: int; imm: int64 }               (* 50 - dynamic jump *)
  | Load_u8 of { ra: int; addr: int64 }               (* 52 *)
  | Store_u64 of { ra: int; addr: int64 }             (* 62 *)
  (* Register + register + immediate *)
  | Branch_eq_imm of { ra: int; imm: int64; offset: int64 }   (* 81 *)
  (* ... loads/stores signed & unsigned, 8/16/32/64-bit,
     ALU ops in 32- and 64-bit variants, branches, ... *)
```

Notice what's *not* RISC-V here: `Ecalli` carries the host-call ID as an
**immediate** (not a register), loads are explicit about sign- vs
zero-extension (`Load_i8` vs `Load_u8`), and most ALU operations come in
both 32-bit and 64-bit variants.

Graypaper 0.8.0 changed the opcode table: it added `unlikely` (opcode 2)
and removed `sbrk` (opcode 101). The rest of sbrk's two-register group
moved down by one (`count_set_bits_64` is now 101, …, `reverse_bytes`
110), so a 0.7.x decoder misreads that whole group.

## Gas Metering

In Graypaper 0.8.0, gas is charged **per basic block, on entry**. A basic
block is a run of instructions that ends at a *termination* instruction:
`trap`, `fallthrough`, a jump, a load-and-jump or a branch. (`ecalli` does
not end a block.) On the first step, and every time execution enters a
block (or jumps back to the start of the current one), the machine charges
the cost of the **whole block** before running any of it:

- **The price** of a block comes from a model of a simplified out-of-order
  CPU: 4 decode slots and 5 issue slots per cycle, a 32-entry reorder
  buffer, execution units (ALU, load, store, multiply, divide) and
  register dependencies. The block costs max(cycles − 3, 1). Lasair's
  implementation is `lib/pvm_gas.ml`, which cites the Graypaper function
  behind every rule.
- **Not enough gas:** if the remaining gas is less than the block's cost,
  the machine exits **out-of-gas with the counter unchanged**. Nothing in
  the block runs.

```ocaml
(* From lib/pvm.ml (simplified): at a point where the block is not yet charged *)
let cost = Int64.of_int (Pvm_gas.block_cost inf (Pvm_gas.block_start inf pc)) in
if Int64.compare !gas cost < 0 then exit := Some OutOfGas   (* gas unchanged *)
else (gas := Int64.sub !gas cost; charged := true)
```

Host calls are priced separately, by the Graypaper's host-call gas table
(the next lesson).

**What changed from 0.7.x:** 0.7.x charged every instruction 1 gas, just
before it ran, and an out-of-gas exit could leave the counter negative.
Implementations built for 0.7.x (lasair's included, until its 0.8.0
migration) had a `gas_cost` that returned 1 for everything. Every
accumulate test vector was regenerated with the new costs, so a 0.7.x gas
model fails them all.

Lasair's gas accounting is verified exact against polkavm, whose open-source
simulator implements the same model: the record-replay harness in
`tools/pvm-replay/` replays recorded executions instruction by instruction
and compares `(pc, gas)` at every step.

## The Execution Loop

```ocaml
(* A sketch of lib/pvm.ml's loop *)
let step (m : machine) : step_result =
  (* 1. Entering a basic block? Charge the whole block first *)
  if not m.gas_charged && m.gas < block_cost m.program m.pc then
    out_of_gas m                          (* gas unchanged *)
  else
    let m = if m.gas_charged then m else charge_block m in
    (* 2. PC must be on an instruction boundary *)
    if not (bitmask_valid m.program m.pc) then panic m
    else
      (* 3. Skip distance tells us the operand length *)
      let skip = skip m.program m.pc in
      let instr = Pvm_decode.decode m.program.code pc_int skip in
      (* 4. Execute; PC advances by 1 + skip unless we branched.
            A termination instruction clears gas_charged, so the
            next step charges the next block *)
      execute m instr
```

The machine single-steps until `step` returns an exit reason: `Halt`,
`Panic`, `OutOfGas`, `PageFault`, or `HostCall`.

## Host Calls

When PVM executes `ecalli n`, execution pauses with `HostCall n` and the
host (lasair) takes over. The Graypaper 0.8.0 table; from
`lib/pvm_host.ml`:

```
 0 gas        8 export     16 assign      24 solicit
 1 grow_heap  9 machine    17 designate   25 forget
 2 fetch     10 peek       18 checkpoint  26 yield
 3 lookup    11 poke       19 new         27 provide
 4 read      12 pages      20 upgrade
 5 write     13 invoke     21 transfer   100 log (JIP-1)
 6 info      14 expunge    22 eject
 7 historical_lookup  15 bless  23 query
```

`grow_heap` (1) is new in 0.8.0, and every call after it moved up by one
from its 0.7.x number. `log` (100) is not in the Graypaper: it is a debug
call defined by JIP-1, charged like an unknown host call.

Results come back in A0 using sentinel values near 2⁶⁴:

```ocaml
(* From lib/pvm.ml *)
let host_none = Int64.sub 0L 1L    (* 2^64 - 1: Item does not exist *)
let host_what = Int64.sub 0L 2L    (* 2^64 - 2: Name unknown *)
let host_oob  = Int64.sub 0L 3L    (* 2^64 - 3: Memory index not accessible *)
(* ... *)
let host_ok = 0L                   (* Success *)
```

The next lesson covers these in depth.

## Refine vs Accumulate: Two Entry Points

A service's code has two entry points, given as **instruction-counter
values**: the Graypaper runs refine as Ψ_M(c, 0, …) and accumulate as
Ψ_M(c, 5, …), so execution starts at byte offset 0 or 5 of the code.
Getting this wrong is a
classic implementation trap: lasair once used entry 10 in one code path,
following an SDK convention instead of the Graypaper.

| | Refine | Accumulate |
|------------|--------|------------|
| Entry point | 0 | 5 |
| Runs | in-core (off-chain, parallel) | on-chain (every validator) |
| Purpose | heavy computation over work items | integrate results into state |
| Characteristic host calls | `export`, `machine`/`peek`/`poke`/`invoke` (inner PVMs), `historical_lookup` | `read`/`write` (service storage), `transfer`, `new`, `upgrade`, `bless`, `checkpoint` |

Refine does the expensive work where it's cheap (in-core, one core's
worth of validators); accumulate applies the results where they're
authoritative (on-chain, everyone). The gas regimes and available host
calls differ accordingly.

## Exercise: Trace Execution

Given this PVM program (pseudo-assembly with byte offsets — remember,
instructions are variable-length):

```
pc=0:  load_imm  ω7, 5       # 3 bytes: opcode + reg + imm
pc=3:  load_imm  ω8, 3       # 3 bytes
pc=6:  add_64    ω9, ω7, ω8  # 3 bytes: opcode + 2 packed regs + dest
pc=9:  ecalli    0           # 2 bytes -> HostCall 0 ("gas")
pc=11: trap                  # 1 byte
```

Suppose the gas model prices this basic block (pc 0 up to and including
the `trap`, since `ecalli` does not end a block) at `c` gas. Starting with
gas = 1000, trace `(pc, gas, registers)` after each step:

<details>
<summary>Click to see trace</summary>

```
Initial:
  ω7=0, ω8=0, ω9=0, pc=0, gas=1000

Entering the block:          gas = 1000 - c   (charged once, up front)
After load_imm ω7, 5:        ω7=5            pc=3,  gas = 1000 - c
After load_imm ω8, 3:        ω8=3            pc=6,  gas = 1000 - c
After add_64 ω9, ω7, ω8:     ω9=8            pc=9,  gas = 1000 - c
After ecalli 0:              exit = HostCall 0
  The host charges the gas call's own cost (48 in GP 0.8.0),
  puts the remaining gas, 1000 - c - 48, in ω7, and resumes at pc=11
  WITHOUT charging the block again: it is already paid for.
```

The instructions themselves cost nothing individually; the block was paid
for on entry. The PC advanced by each instruction's *byte length*, not a
fixed 4. (Under Graypaper 0.7.x the same trace ran 1000, 999, 998, 997,
then 996 at the host call.)

</details>

## Exercise: Implement a Simple Instruction

Implement the 64-bit XOR instruction (`Xor_64 { rd; ra; rb }`):

```ocaml
let execute_xor_64 (regs : registers) rd ra rb : registers =
  (* TODO: XOR ra and rb, store in rd *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let execute_xor_64 (regs : registers) rd ra rb : registers =
  let v1 = regs.(ra) in
  let v2 = regs.(rb) in
  let result = Int64.logxor v1 v2 in
  let regs' = Array.copy regs in
  regs'.(rd) <- result;
  regs'
```

Note: unlike RISC-V, there is no hardwired zero register to special-case —
all 13 PVM registers are writable. (Lasair returns a fresh array to keep
stepping purely functional.)

</details>

## Exercise: Gas Calculation

A loop compiles to 6 PVM instructions, one basic block that ends at its
branch:

```
loop:
  load_u32   ω7, ...
  add_imm_32 ω7, ω7, 1
  store_u32  ω7, ...
  add_imm_64 ω8, ω8, 4
  add_imm_64 ω9, ω9, -1
  branch_ne_imm ω9, 0, loop
```

Suppose the gas model prices this block at `c` gas. If ω9 starts at 1000,
how much gas does the loop consume? What happens if the gas remaining at
loop entry is 999·c + (c − 1)?

<details>
<summary>Click to see answer</summary>

```
The branch jumps back to the start of the block, so the block is
charged again on every iteration: c per iteration, 1000 * c in total.

With 999*c + (c - 1) gas, 999 iterations run and leave c - 1 gas.
Entering the block for the 1000th time needs c. The machine exits
OutOfGas BEFORE running any of that iteration, and the gas counter
stays at c - 1: under GP 0.8.0 it never goes negative, and the
failed charge takes nothing.

Under GP 0.7.x (1 gas per instruction) the same situation ran
instructions one at a time until the counter went below zero, and
the out-of-gas exit reported that negative value.
```

(The block's exact `c` comes from the pipeline model: the memory accesses
and the dependency chain through ω7 dominate it. Computing it by hand is
a good way to learn `lib/pvm_gas.ml`, and a bad way to spend an
afternoon.)

</details>

## Key Takeaways

1. **RISC-V-derived, not RISC-V** - Own ISA, own encoding, own register file
2. **13 registers** - RA, SP, T0-T2, S0-S7; A0-A2 alias ω7-ω9; no zero register
3. **Variable-length instructions** - The opcode bitmask marks instruction
   starts; the skip distance sizes the operands
4. **Sparse paged memory** - 4 KB pages with access control; first 64 KB
   always faults
5. **Gas per basic block (GP 0.8.0)** - charged on entry from a pipeline
   model; not enough gas means out-of-gas with the counter unchanged
6. **Entry points are instruction counters** - Refine = 0, accumulate = 5
7. **Verified bit-identical** - Lasair's interpreter matches reference
   polkavm instruction-by-instruction

## Next Up

Let's explore the host call interface in detail: [Host Calls →](lesson.html?lesson=03-mastery/02-host-calls)
