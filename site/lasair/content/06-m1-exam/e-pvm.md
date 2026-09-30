---
title: "E · PVM (Appendix A)"
duration: 90 min
exam_portion: fixed
gp_chapter: E
gp_words: 7240
gp_tex: text/pvm.tex
lasair: lib/pvm.ml, lib/pvm_decode.ml, lib/pvm_gas.ml, lib/pvm_program.ml, lib/pvm_host.ml, lib/pvm_trace.ml, tools/pvm-replay
---

# E · The Polkadot Virtual Machine (Appendix A)

<span class="lecture-badge">M1 Understanding · E · Appendix A, the PVM</span>

Appendix A is the longest text in the M1 material and the one place where the 0.8.0
paper differs most from the 0.7.2 lasair implemented for M1. Understanding it is not
reciting opcodes. It is knowing how the machine decodes a program, what happens on each exit, how gas is charged, how memory is
laid out, and why. Everything below was checked against the 0.8.0 tex.

## Chapter sheet

### The machine in one paragraph
A RISC-V RV64EM derivative: 13 registers of 64 bits, a 32-bit paged address space with
4 KiB pages each writable, read-only or inaccessible, and a program blob that carries its
own opcode bitmask and dynamic jump table. Execution is a fold of single steps Ψ₁ until
an exit. There are five exits: **halt**, **panic**, **out-of-gas**, **page fault** with
the faulting page address, and **host call** with the call index. On halt or panic the
returned instruction counter is 0; on every other exit it points at the instruction that
caused the exit and the machine state is the state *before* that instruction, so the
environment can fix the cause (map a page, add gas, run the host call) and resume.

### The Ψ signature (0.8.0)
```
Ψ : (blob 𝔭, pc ı, gas ϱ, bool ϱ̃, regs φ[13], ram μ)
  → (exit ε, pc, gas, bool, regs, ram)
```
The Boolean **ϱ̃ is the "gas already charged for the current basic block" flag**. The
tex writes it as a tilde over the gas symbol ϱ; φ is the register file throughout the
PVM appendix. It is new in 0.8.0 and is the visible surface of the new gas model
(below). The gas Ψ returns is now the unsigned ℕ_G; 0.7.2's Ψ returned a signed ℤ_G that
went negative on out-of-gas. (Ψ_H still returns ℤ_G: a host call that cannot pay
generally leaves ϱ′ = ϱ − g < 0.) Ψ_H, the host-call-aware wrapper, starts with ϱ̃ = ⊥.
Inner machines created by `machine` start with their flag ⊥ and carry it across `invoke`
calls (the inner-PVM record 𝕀 = (code, ram, pc, flag g̃), eq:innerpvm).

### Program decoding (§A.2, `deblob`)
The blob is `E(|j|) ++ E₁(z) ++ E(|c|) ++ E_z(j) ++ E(c) ++ E(k)`:
- **c** instruction data, **k** opcode bitmask with |k| = |c| and k_i = 1 exactly where an
  opcode octet starts, **j** the dynamic jump table of |j| entries each z octets wide.
- `deblob(𝔭, ı)` also validates the whole blob (every instruction reachable by skipping is
  a known opcode, the final instruction is a terminator) and that ı is a valid opcode
  position. If either fails Ψ panics before executing anything. The `machine` host call
  returns HUH on the same failure.
- **skip(i)** = min(24, j) for the least j with (k ++ [1, 1, …])_{i+1+j} = 1, i.e. the
  octets to the next opcode minus one, capped at 24 (eq:skip): the next instruction is
  at i + 1 + skip(i). An instruction's own length is implicit, at most 16, and
  undefined argument octets past the end of c read as zero (ζ = c ++ 0…, eq:instructions),
  so running off the end traps rather than reading garbage.

### Basic blocks and terminators (§A.3)
Terminators T: `trap`, `fallthrough`, `jump`, `jump_ind`, `load_imm_jump`,
`load_imm_jump_ind`, the six register branches and the ten immediate branches. Block
starts ϖ are index 0 plus every position after a terminator, intersected with valid
opcode positions. 𝔏(ı) is the start of ı's block. Three control rules:

| Rule | Behaviour |
|---|---|
| `sjump(b)` static jump | panic unless b ∈ ϖ |
| `branch(b, C)` | panic unless **both** b and the fall-through target are in ϖ, whether or not C holds; else go to b if C, fall through otherwise |
| `djump(a)` dynamic jump | halt if a = 2³² − 2¹⁶; panic if a = 0, a > 2·\|j\|, a odd, or j[a/2 − 1] ∉ ϖ; else jump to j[a/2 − 1] |

The dynamic address is (table index + 1) × 2 because LLVM assumes jump targets are
aligned; 2³² − 2¹⁶ is the conventional return address that means "halt", which is why
register 0 (RA) is initialised to it.

### Single step Ψ₁ (§A.4), in order
1. **Gas.** If ϱ̃ = ⊤, continue. Else compute ϱ^Δ, the cost of the *whole* basic block
   starting at 𝔏(ı); if ϱ ≥ ϱ^Δ, charge it and set ϱ̃ = ⊤; otherwise exit **oog with the
   gas counter unchanged** and ϱ̃ = ⊥. No instruction runs inside a block that has not
   been paid for in full.
2. **Memory.** Collect every address the instruction would read (r) or write (w). Any
   address below 2¹⁶ panics immediately. Otherwise, if some address is not readable
   (for r) or not writable (for w), exit **fault** with the lowest offending address
   rounded down to its page; pc, registers and memory unchanged. A block charged on this
   step stays charged and ϱ̃ stays ⊤, so resuming after the fault does not pay again.
3. **Execute.** Default: ε = continue, ı' = ı + 1 + skip(ı), registers and memory
   unchanged except as the instruction table says.
4. **Flag update.** ϱ̃* = ⊥ if the step could not charge, or if the instruction was a
   terminator and the step continued (the rule also lists a host-call result, but no
   terminator can produce one). So the next block gets charged on entry. `ecalli` is
   *not* a terminator: after a host call the machine resumes inside the same block with
   ϱ̃ still ⊤, so a block is never charged twice.

### Immediates and sign handling
Immediates are little-endian with elided high octets: elided octets are 0 if the top bit
of the last present octet is 0, else 255 (`sext_n`). Register nibbles: r_A = min(12, byte
mod 16), r_B = min(12, byte ÷ 16); the third register of three-register forms is a whole
octet clamped to 12. Offsets are ı plus a signed immediate. 32-bit arithmetic results are
sign-extended to 64 bits (`sext₄`), which is the RV64 convention.

### Argument-shape families (with representative opcodes)
| Family | Opcodes | Examples |
|---|---|---|
| no arguments | 0–2 | `trap` (panic), `fallthrough` (sjump to next block), `unlikely` (no-op hint, 0.8.0) |
| one immediate | 10 | `ecalli` → host × imm |
| one register + 64-bit immediate | 20 | `load_imm_64` |
| two immediates | 30–33 | `store_imm_u8…u64` |
| one offset | 40 | `jump` |
| one register + one immediate | 50–62 | `jump_ind`, `load_imm`, `load_u8…u64`, `load_i8…i32`, `store_u8…u64` |
| one register + two immediates | 70–73 | `store_imm_ind_*` |
| one register + immediate + offset | 80–90 | `load_imm_jump`, `branch_eq_imm` … `branch_gt_s_imm` |
| two registers | 100–110 | `move_reg`, `count_set_bits_*`, `leading/trailing_zero_bits_*`, `sign_extend_8/16`, `zero_extend_16`, `reverse_bytes` |
| two registers + immediate | 120–161 | `store_ind_*`, `load_ind_*`, `add_imm_32/64`, `and/xor/or_imm`, `mul_imm_*`, `set_lt/gt_*_imm`, shifts and rotates (with `_alt` forms where the immediate is the value shifted), `cmov_iz/nz_imm`, `neg_add_imm_*` |
| two registers + offset | 170–175 | `branch_eq/ne/lt_u/lt_s/ge_u/ge_s` |
| two registers + two immediates | 180 | `load_imm_jump_ind` |
| three registers | 190–230 | `add/sub/mul_32/64`, `div_u/s`, `rem_u/s`, shifts, `and/xor/or`, `mul_upper_s_s/u_u/s_u`, `set_lt_*`, `cmov_*`, `rot_l/r_*`, `and_inv`, `or_inv`, `xnor`, `max/min(_u)` |

### Arithmetic traps worth knowing
- **Division by zero never traps.** `div_*` by 0 yields 2⁶⁴ − 1 (all ones); `rem_*` by 0
  yields the dividend.
- **Signed overflow**: −2³¹ ÷ −1 (32-bit) and −2⁶³ ÷ −1 (64-bit) return the dividend;
  the matching `rem_s` returns 0.
- **Rounding**: signed division rounds toward zero (`rtz`); signed remainder takes the
  sign of the numerator with the modulo of the absolute values (`smod`).
- **Shifts** use the low 5 or 6 bits of the count (mod 32 / mod 64). `shar` is arithmetic.
- **Loads** are little-endian; `load_i*` sign-extend, `load_u*` zero-extend. Any load or
  store that straddles into an inaccessible page faults on the lowest bad page; there is
  no alignment requirement.

### Host-call wrapper Ψ_H (§A.6)
Runs Ψ; on **host × h** it applies the mutator f(h, ϱ, φ, μ, x) and, if f says continue,
resumes at ı' + 1 + skip(ı') with the new gas, registers, memory and context; if f says
halt/panic/oog, that becomes the exit. Other exits pass through. Ψ_H begins with ϱ̃ = ⊥
and hands the flag through a successful host call unchanged.

### Standard program initialisation Y (§A.7)
The JAM program blob 𝔧 is `E₃(|o|) ++ E₃(|w|) ++ E₂(z) ++ E₃(s) ++ o ++ w ++ E₄(|𝔭|) ++ 𝔭`
(eq:conditions): read-only data o, initial heap data w, z extra zero heap pages, stack
size s, PVM blob 𝔭. (0.8.0 names the two blobs 𝔧 and 𝔭; 0.7.2 wrote p and c.)
Constants: page Z_P = 2¹², zone Z_Z = 2¹⁶, argument area Z_I = 2²⁴. P(x) rounds up to a
page and Z(x) up to a zone (the tex writes the zone-rounding function as Z(x); do not
confuse it with the constants Z_Z, Z_P, Z_I). It must hold that
`5·Z_Z + Z(|o|) + Z(|w| + z·Z_P) + Z(s) + Z_I ≤ 2³²`, otherwise Y = ∅ and Ψ_M returns
panic with zero gas used.

| Region | Start | Access |
|---|---|---|
| (guard) | 0 … Z_Z | none, and anything below 2¹⁶ panics anyway |
| read-only data o, padded to a page | Z_Z | R |
| heap: w then z zero pages, padded | 2·Z_Z + Z(\|o\|) | W |
| stack, P(s) octets ending at the stack top | 2³² − 2·Z_Z − Z_I − P(s) | W |
| arguments a, padded to a page | 2³² − Z_Z − Z_I | R |
| everything else | | none |

Registers (eq:registers): φ₀ (RA) = 2³² − 2¹⁶ (return here = halt), φ₁ (SP) =
2³² − 2·Z_Z − Z_I, φ₇ = address of a, φ₈ = |a|, all others 0. Note the asymmetry in the
tex itself: the address-space *condition* uses Z(s) (64 KiB zone rounding) while the
mapped stack uses P(s), as does `grow_heap`'s heap-growth bound b (pvm_invocations.tex);
the 0.8.0 vectors compute that b with Z(s) instead (deviation GP #538, below).

### Argument invocation Ψ_M (§A.8)
Ψ_M(jam blob, pc, gas, args, f, context): Y the blob, run Ψ_H. Result:
oog → (u, oog); halt with [φ'₇, φ'₇ + φ'₈) readable → (u, that memory); halt otherwise →
(u, empty blob); any other exit → (u, panic). u = ϱ − max(ϱ', 0), so gas used is never
more than gas given. The three protocol invocations (is-authorized, refine, accumulate)
all go through Ψ_M with pc 0, 0 and 5 respectively.

### Gas cost model (§A.9–A.10, new in 0.8.0)
Gas is charged **per basic block**, and the block's cost is the number of cycles a
simplified out-of-order CPU model needs to retire it, minus 3, floored at 1
(eq:gascostforblock). The model:
4 decode slots per cycle, at most 5 instruction starts per cycle, execution units
(ALU 4, LOAD 4, STORE 4, MUL 1, DIV 1), a reorder buffer of at most 32 live entries,
dependencies tracked through destination registers, and `move_reg` handled in the
front end as a rename (0 cycles, 1 decode slot). Representative per-instruction costs
(cycles, decode slots): simple 64-bit ALU 1 cycle and 1 decode slot when the destination
register is also a source, 2 decode slots when it is not (𝔓(1, 2)), 32-bit variants 2 cycles, loads and stores 25 (𝔪), multiply 3–6, divide and
remainder 60 with 4 decode slots, `jump` 15, `jump_ind` 22, `ecalli` 100 with 4 decode
slots, `trap` and `fallthrough` 2, `unlikely` 40, branches 𝔟 = 1 if either target is an
`unlikely` or `trap` octet, else 20. The `unlikely` instruction exists purely to make a
cold branch cheap.

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in Appendix A (GP #508, #517 and the vector deviations)</div>

- **Gas model.** 0.7.2 charged a flat 1 gas per instruction on every step. 0.8.0 charges
  per basic block in advance via the CPU-simulation cost ϱ^Δ, adds the ϱ̃ flag to Ψ, Ψ₁
  and Ψ_H (and g̃ to the inner-PVM record), and reports out-of-gas *without* draining the
  counter: Ψ returns unsigned gas ℕ_G, where 0.7.2 returned a signed ℤ_G that went
  negative. lasair: `Pvm_decode.gas_cost` was literally `fun _ -> 1`; migration Phase 4
  (Gate 4, 2026-09-23) replaced it with the pipeline simulator in `lib/pvm_gas.ml`, 0
  divergent steps against polkavm in `scripts/pvm-differential.sh`.
- **`sbrk` removed.** Opcode 101 was `sbrk` (grow the writable heap frontier by the
  register amount, returning the old frontier). It is gone; heap growth is now the
  `grow_heap` host call (Appendix B). The two-register opcodes above it
  (`count_set_bits_64` … `reverse_bytes`) moved from 102–111 down to 101–110.
- **`unlikely`** (opcode 2) added as a no-op branch-cost hint.
- **Branches** must have *both* targets in ϖ regardless of the condition; 0.7.2 only
  checked the taken target.
- **Decoding is validated up front.** deblob(𝔭, ı) now accepts the blob only if every
  instruction walked from 0 is valid and the last is a terminator, and ı is a valid
  instruction; 0.7.2's rule that an invalid opcode executes as `trap` (opcode 0) is gone.
- **Host calls (Appendix B; ids from GP #508, prices from GP #517).** `grow_heap` takes
  id 1 and every other id except `gas` (0) moves up by one (`fetch` 2 … `provide` 27).
  The 0.7.2 cost of 10 per call (`transfer` added its allowance t) becomes the per-call
  table M: a constant, plus where relevant a per-1024-octet term priced by
  𝒢(L, ℓ) = ⌈L·ℓ/1024⌉ (eq:fnmemgas) or a per-page / per-item term; an unknown call
  costs M_∅ = 1000 (was 10). `invoke` costs M_K + g_R (M_K = 968) and refunds the
  inner machine's unused g_R′, so a caller with ϱ < M_K + g_R exits oog before the inner
  machine runs. That pre-check is the tex's general host-call rule (oog when ϱ < g), not
  a vector deviation.
- Vector deviations to know by number (from the jam-test-vectors 0.8.0 changelog, via
  `docs/GP_0_8_0_PLAN.md` Phase 4): GP #533 (a `grow_heap` that cannot pay drains the
  counter to zero and exits oog, where the tex leaves the counter unchanged) and GP #538
  (`grow_heap`'s address-space limit rounds the stack reservation up to the 64 KiB zone:
  the vectors compute its bound b with Z(s) where the tex writes P(s); Y's own condition
  already uses Z(s)). One more that lasair measured itself (Phase 4 ledger): the
  vectors' block costs do *not* count a `cmov` destination as a dependency source
  (polkavm before commit c43e557), although the tex's source set š does, since cmov
  keeps the destination's old value when the condition fails; lasair follows the
  vectors via `Pvm_gas.cmov_dest_is_source = false`.

</div>

### War story
<div class="lasair-connection">

**The sbrk frontier, and how "bit-identical" was earned.** lasair's PVM claim rests on
`tools/pvm-replay`: recorded lasair invocations are replayed through Parity's polkavm
and the program counter and all thirteen registers are diffed step by step
(`docs/DISCLOSURES.md`). By 2026-06-10 the M1 plan records "PVM bit-verified against
polkavm, exact gas", after `docs/notes/gas-mismatch-analysis.md` had documented the earlier
phase where all 30 accumulate vectors matched on state but gas was off by −16 to +83.
The last two failing fuzz seeds in the seed campaign were "PVM memory accessibility vs
polkavm, the sbrk frontier" (`docs/M1_PLAN.md`): exactly where the writable heap ends
after `sbrk`, which decides whether a store faults or succeeds. turbojam's `machine.cpp`
and polkavm's source were consulted for the semantics and the behaviour was implemented
independently (disclosed). The lesson: the memory model is not a detail; the
page map decides panic versus commit, and 0.8.0 moved that frontier into a priced host
call precisely because it was protocol-visible.

</div>

### Source pointers
- `lib/pvm.ml`: `step`, `execute`, `skip`, `parse_program`, `init_standard`, `is_readable`,
  `is_writable`, `c_inaccessible_threshold` (2¹⁶), `c_dyn_addr_align`, the `inner_*` exit
  constructors, `mul_upper_*`, `sign_extend`
- `lib/pvm_decode.ml`: `decode`, `opcode_at`, `is_terminator` (the old constant
  `gas_cost` is gone)
- `lib/pvm_gas.ml`: `analyse`, `block_start` (𝔏), `simulate` (𝔛), `block_cost` (ϱ^Δ),
  `inst_cost` (the gas cost table), `cmov_dest_is_source`
- `lib/pvm_host.ml`: `host_grow_heap`, `host_machine`, `host_invoke`
- `lib/pvm_program.ml`: `parse_standard_program`, `init_memory_regions`, `init_registers`,
  `heap_start`, `heap_end`, `round_to_page`, `round_to_zone`, `calculate_skip`
- `lib/pvm_trace.ml` and `tools/pvm-replay`: the polkavm differential
- `docs/notes/pvm.md`, `docs/notes/pvm-testing-guide.md`; lectures `011-graypaper-lectures/21-pvm-gas`

## Question bank

### Q1 ★ Write Ψ's signature and name every exit reason. What does the returned instruction counter mean in each case?
<details><summary>Model answer</summary>

Ψ takes the program blob, an instruction counter, a gas amount, the gas-charged flag,
thirteen 64-bit registers and the RAM, and returns an exit reason plus the same five
items. Exits: halt, panic, out-of-gas, fault paired with the faulting page address, and
host paired with the host-call index. After halt or panic the counter is returned as 0.
After oog, fault or host it indexes the instruction that *caused* the exit and the
machine state is the state before that instruction, so the environment can supply gas,
map the page or perform the host call and resume at exactly that point. Ψ_H does the
resume for host calls by advancing to ı' + 1 + skip(ı').

</details>

### Q2 ★ What is the Boolean argument that Ψ gained in 0.8.0, and why is it needed?
<details><summary>Model answer</summary>

It is ϱ̃ (a tilde over the gas symbol; φ is the register file), the flag saying whether
the gas for the current basic block has already been charged. 0.8.0 charges gas once per
basic block, in advance, for the whole block. When execution is interrupted mid-block by
a host call or a fault and later resumed, the machine must not charge the block again,
so the flag is threaded through Ψ₁, Ψ, Ψ_H and
the inner-PVM record 𝕀 used by `invoke`. It is cleared to ⊥ after a terminator instruction
continues (a new block begins), and it is left ⊥ when the machine could not afford the
block so that a retry with more gas charges it. A host call does not clear it, because
`ecalli` is not a terminator and execution resumes inside the same block.

</details>

### Q3 ★ Explain the program blob format and what `deblob` validates.
<details><summary>Model answer</summary>

The blob is the jump-table length, the jump-table entry width z, the code length, the
jump table itself as z-octet naturals, then the instruction data c and the opcode
bitmask k of equal length. `deblob` checks that the blob parses uniquely, that walking c
by skip distances from 0 lands only on known opcodes, that the last instruction is a
terminator, and that the requested instruction counter is a valid opcode position
(k_ı = 1 and c_ı a known opcode). If any of that fails, Ψ panics without executing;
the `machine` host call returns HUH instead of creating the inner machine.

</details>

### Q4 What is the skip function and why does the PVM count instructions in octets?
<details><summary>Model answer</summary>

Instructions are variable length, so the counter is an octet index and the bitmask k
marks which octets are opcodes. skip(i) is the number of octets minus one to the next
set bit in k (with an infinite run of ones appended so the last instruction is well
defined), capped at 24. The next instruction is at i + 1 + skip(i). Instruction length is
implicit and at most 16; argument octets beyond the end of c are read as zero, which
turns a run off the end of the program into a trap rather than undefined behaviour.

</details>

### Q5 ★ What is a basic block, which instructions terminate one, and what happens on a jump to something that is not a block start?
<details><summary>Model answer</summary>

A basic block is a maximal straight-line run: it starts at index 0 or right after a
terminator and ends at the next terminator. Terminators are trap, fallthrough, the two
jumps (`jump`, `jump_ind`), the two load-immediate-and-jump forms, and all sixteen
branches. Static jumps and both targets of a conditional branch must be block starts
or the machine panics; a dynamic jump must resolve through the jump table to a block start or panic,
with one exception: the address 2³² − 2¹⁶ means halt. Blocks matter because 0.8.0
charges gas per block, so control flow may only enter a block at its priced start.

</details>

### Q6 Describe the memory model: pages, access map, the 64 KiB rule, and the fault address.
<details><summary>Model answer</summary>

A 32-bit octet address space split into 4096-octet pages, each marked W, R or
inaccessible. Readable addresses are those on a non-inaccessible page, writable those on
a W page. Any access to an address below 2¹⁶ panics outright, whatever the page map
says, because the first zone is a permanent guard. Any other access to a page the
instruction may not use exits with a fault carrying the lowest offending address rounded
down to its page start, and the machine state is unchanged so the host can map the page
and resume. Standard programs get read-only data, a heap, a stack and an argument area,
separated by unmapped zones.

</details>

### Q7 ★ Lay out standard program memory and the initial registers.
<details><summary>Model answer</summary>

Zones are 64 KiB, pages 4 KiB. Read-only data starts at one zone (0x10000) and is padded
to a page. The heap (initial data w plus z zero pages) starts at 2 zones + Z(|o|), one
guard zone above the zone-rounded read-only data. The stack occupies P(s) octets ending at
2³² − 2 zones − 16 MiB. The argument area of up to 16 MiB starts at 2³² − 1 zone − 16 MiB.
Everything else is inaccessible. Registers: RA is 2³² − 2¹⁶ so that returning from the
entry function halts; SP is the stack top; register 7 holds the argument address and
register 8 the argument length; the rest are zero. The blob must satisfy
5 zones + Z(|o|) + Z(|w| + z pages) + Z(s) + 16 MiB ≤ 4 GiB (Z rounds up to a zone) or
initialisation fails and the invocation is a panic with zero gas used.

</details>

### Q8 How does Ψ_M turn a machine exit into an invocation result, and how is gas used computed?
<details><summary>Model answer</summary>

After Ψ_H returns: out-of-gas maps to oog; a halt whose registers 7 and 8 describe a
readable range returns that memory as the output blob; a halt whose range is not readable
returns the empty blob; a fault or panic maps to panic. Gas used is the gas supplied
minus the remaining counter clamped at zero, so it can never exceed what was supplied
even if a host call drove the counter negative. Refine, accumulate and is-authorized
all consume this triple of (gas used, output or error, context).

</details>

### Q9 ★ Explain the 0.8.0 gas cost model in plain English. Why per basic block?
<details><summary>Model answer</summary>

Instead of one gas per instruction, each basic block has a fixed price computed once
from its instructions: a small model of an out-of-order CPU has four decode slots per
cycle (an instruction needs one to four), starts up to five instructions, respects
execution-unit limits (four ALU, four load, four store, one multiply, one divide) and
register dependencies, and counts the cycles until everything retires; the price is
that count minus 3, at least 1. Loads and stores take 25 cycles, division 60, a host call
100, a branch 20, or only 1 when either of its targets (taken or fall-through) is an
`unlikely` or `trap` instruction. Charging per block means the price is a property of the
program text, so it can be precomputed and cached, and the machine never has to check gas
inside straight-line code. It also means gas tracks real execution time
far better than a flat count, which is the whole point of gas. Measured on lasair
(jamswap, 2026-09-24): an in-PVM ed25519 verify costs about 5.29M gas under 0.8.0 against
1.31M under the flat 0.7.2 count, and a Groth16 verify about 247M. A work-report's whole
accumulate budget G_A is 10M while refine gets G_R = 5×10⁹, so signature checks belong in
refine (jamswap `docs/LASAIR_INTERNALS.md`).

</details>

### Q10 What are the division and remainder edge cases?
<details><summary>Model answer</summary>

Dividing by zero does not trap: unsigned and signed division return all ones (2⁶⁴ − 1)
and remainder returns the dividend. Signed overflow, the most negative value divided by
−1, returns the dividend for division and 0 for remainder. Signed division rounds toward
zero and signed remainder keeps the numerator's sign. 32-bit forms operate on the low
32 bits and sign-extend the result to 64. These are exactly RISC-V's conventions and they
exist so that no arithmetic instruction can cause an exit.

</details>

### Q11 What did `sbrk` do in 0.7.2 and what replaced it?
<details><summary>Model answer</summary>

`sbrk` (opcode 101) took a size in a register and returned the smallest address at or
above the heap start such that the requested range was not yet readable and became
writable: a heap-frontier bump baked into the instruction set, with no gas beyond the
flat 1. In 0.8.0 it is removed and the opcodes above it shift down. Heap growth is now
the `grow_heap` host call (id 1): the caller passes in φ₇ the desired heap end as a page
index (last writable page plus one). If that is not above the current end h, or exceeds
the limit b, the call costs only 275 and returns h; otherwise it makes pages [h, φ₇)
writable, costs 275 plus 121 per new page, and returns φ₇. It speaks in pages where
`sbrk` spoke in octet addresses. If it cannot pay, the tex exits oog with the counter
unchanged; the 0.8.0 vectors (deviation GP #533) drain it to zero. lasair removed the
opcode in migration Phase 4: its decoder's two-register group is now 100–110 with
101 = `count_set_bits_64`, and heap growth is `host_grow_heap` in `lib/pvm_host.ml`.

</details>

### Q12 How are immediates encoded, and what is the difference between `shlo_l_imm` and `shlo_l_imm_alt`?
<details><summary>Model answer</summary>

Immediates are little-endian with high octets elided; the elided octets are all zeros if
the top bit of the highest present octet is clear and all ones if it is set, so small
negative numbers are one octet. Lengths come from the skip distance and, for forms with
two immediates, from a 3-bit length field (value mod 8, capped at 4) for the first one:
the octet after the opcode for `store_imm_*`, the high nibble of the register octet for
the one-register forms, and the octet after the register octet for `load_imm_jump_ind`.
In `shlo_l_imm` the register is the value and the immediate is the shift count; in the
`_alt` form the immediate is the value and the register is the count. The pair exists
because compilers need both and the ISA has no third operand.

</details>

### Q13 ★ Walk through what happens when a program executes `ecalli` at the end of a basic block and the host call succeeds.
<details><summary>Model answer</summary>

Ψ₁ sees ϱ̃ = ⊤ (the block was paid on entry), no memory access, and returns host × imm
with the counter still at the `ecalli`. Since `ecalli` is not a terminator the flag stays
⊤. Ψ_H runs the mutator: it charges the host call's own gas (base plus per-KiB terms
where memory is involved), reads and writes registers and memory, and returns continue.
Ψ_H resumes at ı + 1 + skip(ı), the instruction after the `ecalli`, which is still inside
the same basic block, so nothing is charged again; the block's terminator then clears ϱ̃
and the *next* block is charged on its first step. (A block cannot "end in" an `ecalli`:
only terminators end blocks.) If the mutator instead returns oog, panic or halt, that
becomes the invocation's exit with the counter pointing at the `ecalli`.

</details>

### Q14 What guarantees that gas bounds execution time, and what is left to the implementer?
<details><summary>Model answer</summary>

Every block is paid before it runs, every host call has a base cost (plus a
per-1024-octet term where it touches variable-sized memory), `invoke` charges the inner
machine's usage, and an unknown host call costs 1000. The Graypaper leaves it as "a rather
important implementation detail" that the wall-clock time of Ψ be roughly proportional
to gas regardless of other operands, which is why `pages`, `grow_heap` and the memory
terms are priced and why RAM allocation is never unbounded from invocation arguments.
lasair's profiling (`docs/PERF_FINDINGS.md`) found the per-block cost dominated by
crypto FFI and STF, not by the PVM interpreter.

</details>

### Q15 What is the jump-table alignment factor and why does it exist?
<details><summary>Model answer</summary>

Z_A = 2. A dynamic jump address a must be a non-zero even number no larger than
2·|j|; the target is j[a/2 − 1]. The Graypaper attributes this to LLVM assuming that
computed jump destinations have a particular alignment; rather than fight the toolchain
the ISA indexes the table by (index + 1) × 2. The value 2³² − 2¹⁶ is reserved as the
halt address, which is what makes "return from main" end the program.

</details>
