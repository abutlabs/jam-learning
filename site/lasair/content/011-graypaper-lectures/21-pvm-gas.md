---
title: "4.7 VM and Gas"
duration: 8 min
video: https://www.youtube.com/watch?v=UXujxrshzDQ
---

# Graypaper Section 4.7: Virtual Machine and Gas

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section introduces the Polkadot Virtual Machine (PVM) - JAM's execution environment - and the gas metering system that limits computation.

## What This Lecture Covers

- PVM architecture overview
- The PVM invocation function Ψ (Psi)
- Registers, memory, and gas
- Exit conditions and host calls
- Memory access permissions

## The PVM Execution Function

The PVM is defined by a single function **Ψ** (Psi):

```
Ψ(code, pc, gas, charged, regs, mem) → (exit, pc', gas', charged', regs', mem')
```

| Input | Description |
|-------|-------------|
| code | Program bytecode |
| pc | Program counter (current instruction) |
| gas | Gas available for execution |
| charged | Whether the current basic block's gas is already paid (GP 0.8.0) |
| regs | 13 registers (64-bit each) |
| mem | Memory (RAM) |

| Output | Description |
|--------|-------------|
| exit | How execution ended |
| pc' | Final program counter |
| gas' | Remaining gas (never negative in GP 0.8.0) |
| charged' | The gas-charged flag after the run |
| regs' | Final register values |
| mem' | Final memory state |

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the signature in section 4.7 gained a Boolean, the *gas-charged flag*, on both sides, and the result gas is now an unsigned 64-bit value (0.7.2 returned signed gas, negative meaning "tried to run past the limit"). (Separately, the video's Ξ is an older name: in current versions Ξ is the work-report computation function, section 14.4, and the PVM is Ψ.)

</div>

<div class="callout callout-info">

**ELI5: The Game Console**

Think of PVM like a video game console:
- **code** = The game cartridge
- **pc** = Which instruction the CPU is on
- **gas** = Battery life (limited play time)
- **regs** = The controller buttons being pressed
- **mem** = The game's save data

When you "run" the game, it processes until something happens (you win, you die, battery dies, or you pause to do something special).

</div>

## Registers

PVM has **13 registers**, each holding a 64-bit value:

```
Registers: ℕ₂⁶⁴ × 13

φ0, φ1, φ2, ... φ12  -- All 64-bit unsigned integers
```

(Older drafts wrote the registers as ω; GP 0.8.0 uses φ.)

These are the "working memory" for computations - fast to access, limited in number.

<div class="lasair-connection">

### In Lasair: PVM Registers

```ocaml
(* From lib/pvm.ml *)

(** Number of registers *)
let c_register_count = 13

(** Register file: 13 64-bit registers *)
type registers = reg_value array   (* reg_value = int64 *)

(** Create empty register file *)
let empty_registers () : registers =
  Array.make c_register_count 0L

(** Get register value (clamped to valid range) *)
let get_reg (regs : registers) (idx : int) : reg_value =
  if idx < 0 || idx >= c_register_count then 0L
  else regs.(idx)

(** Set register value (returns a NEW array) *)
let set_reg (regs : registers) (idx : int) (value : reg_value) : registers =
  if idx < 0 || idx >= c_register_count then regs
  else begin
    let regs' = Array.copy regs in
    regs'.(idx) <- value;
    regs'
  end
```

</div>

## Gas Metering

Gas limits computation to prevent infinite loops:

```
gas_in:  ℕ₂⁶⁴        -- Unsigned 64-bit
gas_out: ℕ₂⁶⁴        -- Unsigned 64-bit (GP 0.8.0)
```

In GP 0.8.0 gas is charged **per basic block, up front**. On the first step, and every time execution enters a basic block (or jumps back to the start of the current one), the whole block's cost is deducted before any of its instructions run. If the remaining gas is less than the block's cost, execution stops with out-of-gas and the gas counter is left unchanged. So the output gas never goes negative.

The cost of a block is not a sum of per-instruction prices. It is the number of cycles a simplified out-of-order CPU pipeline needs to retire the block: 4 instructions decoded and 5 started per cycle, a 32-entry reorder buffer, execution units ALU 4, LOAD 4, STORE 4, MUL 1, DIV 1, with register dependencies tracked. The charge is max(cycles − 3, 1) (appendix A.9 Gas Cost Model, eq. `gascostforblock`; per-instruction cycle and unit costs in A.10 Gas Cost Tables).

<div class="callout callout-warning">

**Changed in GP 0.8.0:** up to 0.7.2 every instruction cost 1 gas (the instruction tables had a gas column), gas was deducted instruction by instruction, and the result gas was signed, so a run could end slightly negative. The lecture describes that older model. 0.8.0 removed the gas column and replaced it with the per-block pipeline model above (Graypaper PR #508).

</div>

<div class="callout callout-info">

**ELI5: The Prepaid Phone**

Like a prepaid phone card:
- Start with 100 minutes (gas_in)
- Before each call, the phone works out how long the whole call will take and takes those minutes up front
- If you don't have enough minutes for the whole call, the call is never placed, and your balance stays where it was
- You can never go negative

Each basic block is one "call": paid in full before it starts.

</div>

<div class="lasair-connection">

### In Lasair: Gas Accounting

The block-cost simulator lives in `lib/pvm_gas.ml` (`block_cost`, memoised per program). The interpreter loop in `lib/pvm.ml` charges it on block entry:

```ocaml
(* From lib/pvm.ml, core_run (abridged) *)
if not !charged
   && (let cost = Int64.of_int (Pvm_gas.block_cost inf (Pvm_gas.block_start inf p)) in
       if Int64.compare !gas cost < 0 then true            (* not enough: stop *)
       else (gas := Int64.sub !gas cost; charged := true; false))
then exit := Some OutOfGas                                (* gas left unchanged *)
```

`charged` is the GP's gas-charged flag. It is cleared after a block-terminating instruction (a jump, branch or fallthrough) so the next block is charged on entry.

</div>

## Memory Model

PVM memory has two dimensions for each byte:

```
𝕄 = (v, a)

v: 𝕐²³²       -- Values: 2³² bytes of actual data
a: {W, R, ∅}ᵖ  -- Access per page, p = 2³² / 4096
```

Each byte in memory has a value (0-255). Access permissions (W = writable, R = read-only, ∅ = unmapped) are set per **page** of Z_P = 4096 bytes: every byte in a page shares that page's permission (section 4.7, eq. `pvmmemory`). A fault reports the address of the page at fault. Any access below address 2¹⁶ panics outright rather than faulting (appendix A.4).

<div class="callout callout-info">

**ELI5: The Library**

Think of memory like a library:
- Some books you can borrow and write in (Writable)
- Some books you can only read in the library (Readable)
- Some shelves are empty/restricted (Inaccessible)

If you try to write in a read-only book → **Page fault!**
If you try to access a restricted shelf → **Page fault!**

</div>

<div class="lasair-connection">

### In Lasair: Memory with Permissions

```ocaml
(* From lib/pvm.ml *)

(** Page size in bytes *)
let c_page_size = 4096

(** First 64KB of memory is always inaccessible *)
let c_inaccessible_threshold = 65536  (* 2^16 *)

(** Memory access permission *)
type access =
  | Inaccessible
  | ReadOnly
  | ReadWrite

(** RAM page *)
type page = {
  data: bytes;
  access: access;
}

(** RAM state - sparse page table using Hashtbl for O(1) lookups *)
type ram = (int, page) Hashtbl.t
```

The permission lives on the page, exactly as in the Graypaper; only pages that exist are stored.

</div>

## Exit Conditions

Execution stops for one of five reasons:

| Symbol | Condition | Meaning |
|--------|-----------|---------|
| □ | Halt | Normal termination |
| ⚡ | Panic | Irregular termination (error) |
| ∞ | Out of Gas | Ran out of computational budget |
| ⌁ | Page Fault | Invalid memory access (+ fault address) |
| ☎ | Host Call | External call (+ call identifier) |

<div class="lasair-connection">

### In Lasair: Exit Conditions

```ocaml
(* From lib/pvm.ml *)

(** Exit reason from PVM execution *)
type exit_reason =
  | Halt                  (** Normal termination *)
  | Panic                 (** Error condition *)
  | OutOfGas              (** Ran out of gas *)
  | PageFault of int64    (** Memory access fault with page address *)
  | HostCall of int64     (** Host call with identifier *)
```

</div>

## Host Calls

Host calls let PVM code interact with the outside world:

```
Exit: HostCall(n)  -- n identifies which host function to call
```

The host (JAM itself) handles these calls and may:
- Read/write external state
- Return data to the PVM
- Resume execution after handling

<div class="callout callout-info">

**ELI5: System Calls**

Like when a program needs something from the operating system:
- "Hey OS, I need to read a file" → Host call
- "Hey OS, what time is it?" → Host call
- "Hey OS, send this network packet" → Host call

The program pauses, the OS does the work, then the program continues.

</div>

<div class="callout callout-warning">

**Changed in GP 0.8.0:** host calls got their own price list and new numbers (Graypaper PR #517). Each host call now charges its own base cost, plus a per-KiB or per-page term for some, from the table of constants M in appendix I.4.5 (for example `gas` 48, `info` 703, `read` 2407 plus key and value terms); an unknown host call costs 1000. In 0.7.2 nearly every host call cost a flat 10. The ids were renumbered because the heap now grows through a host call, `grow_heap` = 1: the `sbrk` instruction was removed from the instruction set. In lasair the table is `host_call_cost` in `lib/pvm_host.ml`.

</div>

## The Complete Picture

```
            ┌─────────────────────────────────────────┐
            │              PVM Instance               │
            │  ┌─────────┐  ┌─────────┐  ┌────────┐  │
   code ───►│  │   PC    │  │  Regs   │  │  Gas   │  │
            │  │ (inst.) │  │  (13)   │  │ counter│  │
            │  └─────────┘  └─────────┘  └────────┘  │
            │         ┌─────────────────────┐        │
            │         │      Memory         │        │
            │         │   (v: values)       │        │
            │         │   (a: access/page)  │        │
            │         └─────────────────────┘        │
            └─────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────┐
            │           Exit Condition                │
            │  □ Halt  │  ⚡ Panic  │  ∞ OOG         │
            │  ⌁ Page Fault (addr) │  ☎ Host (id)   │
            └─────────────────────────────────────────┘
```

## Key Takeaways

1. **Ψ function** - Single function defines all PVM execution
2. **13 registers** - 64-bit working memory
3. **Gas is paid per basic block, up front** - Not enough for the next block: out-of-gas, counter unchanged (GP 0.8.0)
4. **Memory has permissions** - Each byte has a value; each 4096-byte page has an access level
5. **Five exit conditions** - Halt, Panic, OOG, PageFault, HostCall

## What's Next

This completes the Overview section. Continue with **Section 5** to learn about block headers and their structure.

[Back to Graypaper Lectures &rarr;](index.html)
