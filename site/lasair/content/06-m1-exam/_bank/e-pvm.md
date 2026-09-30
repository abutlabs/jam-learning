---
chapter: e-pvm
---

## Level 1

### Q How many registers does the PVM have?
@ The machine in one paragraph
- [x] 13
- [ ] 32
- [ ] 16
- [ ] 8
> Why: The PVM has 13 registers (GP 0.8.0 §4 and App. A). RISC-V has 16 in the E variant; two are reserved for the OS and one is fixed at zero, leaving 13.

### Q How wide is each PVM register?
@ The machine in one paragraph
- [ ] 32 bits
- [x] 64 bits
- [ ] 16 bits
- [ ] 128 bits
> Why: Registers are naturals below 2⁶⁴, i.e. 64-bit (eq. gasregentry).

### Q Which RISC-V variant is the PVM based on?
@ The machine in one paragraph
- [ ] RV64GC
- [ ] RV32EM
- [x] RV64EM
- [ ] RV32IM
> Why: The Overview says the PVM is based on RISC-V "specifically the RV64EM variant". (Older course notes said RV32EM; that is wrong for current JAM.)

### Q What is the PVM memory page size?
@ The machine in one paragraph
- [ ] 1 KiB
- [ ] 16 KiB
- [ ] 64 KiB
- [x] 4 KiB (2¹² octets)
> Why: Z_P = 2¹² = 4096 octets (Definitions appendix, Cpvmpagesize).

### Q How large is the PVM address space?
@ The machine in one paragraph
- [x] 2³² octets (32-bit addresses)
- [ ] 2¹⁶ octets
- [ ] 2⁶⁴ octets
- [ ] 2²⁴ octets
> Why: RAM is a 2³²-octet value blob plus a per-page access map (eq. pvmmemory).

### Q What three access states can a PVM page have?
@ The machine in one paragraph
- [ ] Owned, shared, or free
- [x] Writable, read-only, or inaccessible
- [ ] Mapped, cached, or swapped
- [ ] Executable, writable, or read-only
> Why: Each page's access is W, R or ∅ (none). Code is not in RAM at all, so there is no "executable" state.

### Q Which of these is NOT one of the PVM's exit reasons?
@ The machine in one paragraph
- [ ] out-of-gas
- [ ] halt
- [x] overflow
- [ ] host call
> Why: The five exits are halt, panic, out-of-gas, page fault (with address) and host call (with index). Arithmetic overflow simply wraps.

### Q Which exit carries an address with it?
@ The machine in one paragraph
- [ ] panic
- [ ] halt
- [ ] host call
- [x] page fault
> Why: A fault reports the lowest offending address rounded down to its page. A host call carries the call index, not an address.

### Q After a halt or a panic, what instruction counter does Ψ return?
@ The machine in one paragraph
- [x] 0
- [ ] 2³² − 2¹⁶
- [ ] The instruction after the halting one
- [ ] The halting instruction itself
> Why: On halt or panic the returned counter is 0. On the other exits it points at the instruction that caused the exit so the environment can resume.

### Q What does the Boolean that Ψ gained in 0.8.0 record?
@ The Ψ signature
- [ ] Whether the machine is inside a host call
- [x] Whether gas has already been charged for the current basic block
- [ ] Whether the program has halted
- [ ] Whether memory is writable
> Why: φ is the gas-charged flag of the 0.8.0 per-basic-block gas model. It stops a block being charged twice.

### Q What value does Ψ_H start the gas-charged flag at?
@ The Ψ signature
- [ ] ⊤ (true)
- [ ] It has no flag
- [x] ⊥ (false)
- [ ] Whatever the caller passed in the register
> Why: Ψ_H begins with φ = ⊥, so the first block is charged on entry.

### Q In the program blob, what does the opcode bitmask k mark?
@ Program decoding
- [ ] Which instructions are jump targets
- [ ] Which registers each instruction uses
- [ ] Which pages are writable
- [x] Which octets of the code are the start of an instruction
> Why: k has one bit per code octet and k_i = 1 exactly where an opcode starts. Instruction lengths are implicit from it.

### Q What is the "j" component of a PVM program blob?
@ Program decoding
- [x] The dynamic jump table
- [ ] The stack size
- [ ] The opcode bitmask
- [ ] The read-only data
> Why: The blob holds j (jump table, each entry z octets), c (instruction data) and k (bitmask).

### Q What happens if the program blob fails `deblob` validation?
@ Program decoding
- [ ] It halts with an empty output
- [x] The machine panics before executing anything
- [ ] The invalid instructions are skipped
- [ ] It exits out-of-gas
> Why: deblob validates the whole blob and the starting position; if either fails, Ψ panics immediately.

### Q What does `skip(i)` tell you?
@ Program decoding
- [ ] How far a branch jumps
- [ ] How many registers the instruction reads
- [x] How many argument octets follow the opcode, so the next instruction is at i + 1 + skip(i)
- [ ] How much gas the instruction costs
> Why: skip counts octets to the next set bit in k (capped), giving the instruction's argument length.

### Q What is a basic block in the PVM?
@ Basic blocks
- [ ] A function in the source program
- [ ] One host call and its arguments
- [ ] Any 4 KiB page of code
- [x] A run of instructions that starts at a block start and ends at a terminator instruction
> Why: Block starts are index 0 plus every position after a terminator. Execution only enters a block at its start.

### Q Which of these is a basic-block terminator?
@ Basic blocks
- [x] `jump`
- [ ] `load_u32`
- [ ] `add_64`
- [ ] `ecalli`
> Why: Terminators are trap, fallthrough, the jumps, the load-and-jumps and all branches (set T, §A.3). `ecalli` is not a terminator.

### Q Is `ecalli` (the host-call instruction) a basic-block terminator?
@ Basic blocks
- [ ] Only in accumulate
- [x] No: after a host call execution resumes inside the same block
- [ ] Yes: every host call ends a block
- [ ] Only when the host call fails
> Why: ecalli is not in the terminator set T, so the block is not re-charged after a host call.

### Q What happens on a static jump to an address that is not a basic-block start?
@ Basic blocks
- [ ] It faults with that address
- [ ] It halts
- [x] It panics
- [ ] It jumps anyway
> Why: sjump(b) panics unless b is a block start (b ∈ ϖ).

### Q What special dynamic-jump address means "halt"?
@ Basic blocks
- [ ] 0
- [ ] 2³² − 1
- [ ] 2¹⁶
- [x] 2³² − 2¹⁶
> Why: djump to 2³² − 2¹⁶ halts. Register 0 (the return address) is initialised to this value, so "return from main" ends the program.

### Q What does a dynamic jump to address 0 do?
@ Basic blocks
- [x] Panics
- [ ] Halts
- [ ] Is a no-op
- [ ] Jumps to the program start
> Why: djump panics if a = 0, if a is odd, if a exceeds twice the table length, or if the table entry is not a block start.

### Q Accessing any address below 2¹⁶ causes what?
@ Single step
- [ ] A page fault
- [x] A panic
- [ ] Nothing: it reads zeros
- [ ] An out-of-gas exit
> Why: Any read or write address below 2¹⁶ panics immediately; faults are only for inaccessible pages above that.

### Q What does `trap` (opcode 0) do?
@ Argument-shape families
- [ ] Halts successfully
- [ ] Nothing, it is a hint
- [x] Panics
- [ ] Calls the host
> Why: trap sets the exit to panic.

### Q What does `unlikely` (opcode 2, new in 0.8.0) do when executed?
@ Argument-shape families
- [ ] Halts
- [ ] Panics
- [ ] Skips the next instruction
- [x] Nothing: it is a hint that makes branches to it cheap in the gas model
> Why: unlikely has no effect on state. Branches whose target is an unlikely or trap octet cost 1 instead of 20.

### Q What is the result of `div_u_64` when dividing by zero?
@ Arithmetic traps
- [x] 2⁶⁴ − 1 (all ones)
- [ ] 0
- [ ] The dividend
- [ ] The machine panics
> Why: Division by zero never traps in the PVM; div_u yields 2⁶⁴ − 1.

### Q What does `rem_u_64` return when the divisor is zero?
@ Arithmetic traps
- [ ] It panics
- [x] The dividend
- [ ] 2⁶⁴ − 1
- [ ] 0
> Why: rem by zero returns ω_A, the dividend.

### Q Do PVM loads and stores require aligned addresses?
@ Arithmetic traps
- [ ] Yes, to their size
- [ ] Yes, to 8 octets
- [x] No: there is no alignment requirement
- [ ] Only stores do
> Why: There is no alignment rule; an access that crosses into an inaccessible page faults on the lowest bad page.

### Q Signed PVM division rounds in which direction?
@ Arithmetic traps
- [ ] To the nearest integer
- [ ] Toward negative infinity
- [ ] Away from zero
- [x] Toward zero
> Why: Signed division uses rtz, rounding toward zero.

### Q In standard program initialisation, what is the "zone" size Z_Z?
@ Standard program initialisation
- [x] 64 KiB (2¹⁶)
- [ ] 16 MiB (2²⁴)
- [ ] 1 MiB
- [ ] 4 KiB
> Why: Z_Z = 2¹⁶. The argument area Z_I is 2²⁴ and the page Z_P is 2¹².

### Q At what address does the read-only data section start in a standard program?
@ Standard program initialisation
- [ ] Right after the stack
- [x] Z_Z = 2¹⁶
- [ ] 2³² − 2¹⁶
- [ ] 0
> Why: The first 64 KiB are an inaccessible guard; read-only data o starts at Z_Z.

### Q Which register receives the address of the argument data at start-up?
@ Standard program initialisation
- [ ] ω₁₂
- [ ] ω₁
- [x] ω₇
- [ ] ω₀
> Why: ω₇ = address of the arguments and ω₈ = their length. ω₀ is the return address and ω₁ the stack pointer.

### Q What is register 1 (ω₁) initialised to?
@ Standard program initialisation
- [ ] The argument length
- [ ] The halt address
- [ ] Zero
- [x] The stack pointer, 2³² − 2·Z_Z − Z_I
> Why: ω₁ is SP, set to the top of the stack region.

### Q From which program counters do the three protocol invocations start?
@ Argument invocation
- [x] Is-authorized 0, refine 0, accumulate 5
- [ ] 0, 5 and 10
- [ ] Is-authorized 5, refine 0, accumulate 0
- [ ] All at 0
> Why: All three go through Ψ_M; accumulate's entry point is at pc 5.

### Q When a program halts, which memory becomes the invocation's output?
@ Argument invocation
- [ ] The first page of RAM
- [x] The range [ω₇, ω₇ + ω₈) if it is readable, else an empty blob
- [ ] The whole heap
- [ ] Register 7 as eight octets
> Why: Ψ_M returns the memory range named by ω₇ and ω₈ on halt, or an empty blob if it is not readable.

### Q In 0.8.0, how often is gas charged?
@ Gas cost model
- [ ] Once per invocation up front
- [ ] Once per instruction, 1 gas each
- [x] Once per basic block, on entry to the block
- [ ] Once per host call only
> Why: 0.8.0 charges the whole block's cost on entry. 0.7.2 charged 1 gas per instruction.

### Q What happens to the gas counter when a block cannot be paid for in 0.8.0?
@ Gas cost model
- [ ] The block runs and the debt is recorded
- [ ] It drains to zero
- [ ] It goes negative
- [x] The machine exits out-of-gas and the counter is left unchanged
> Why: If ϱ < ϱ^Δ the step exits oog with gas unchanged. (The vectors deviate only for grow_heap, GP #533.)

### Q In the 0.8.0 gas model, what is a block's cost based on?
@ Gas cost model
- [x] The cycles a simplified out-of-order CPU model needs to run it, minus 3, at least 1
- [ ] The number of instructions in it
- [ ] A fixed 100 per block
- [ ] The number of octets in it
> Why: The cost ϱ^Δ comes from a CPU simulation with decode slots, execution units and a reorder buffer.

### Q Which instruction was removed from the PVM in 0.8.0?
@ 0.7.2 → 0.8.0
- [ ] `trap`
- [x] `sbrk`
- [ ] `ecalli`
- [ ] `fallthrough`
> Why: sbrk (opcode 101) was removed; heap growth is now the grow_heap host call.

### Q What does lasair's `tools/pvm-replay` do?
@ War story
- [ ] Generates random PVM programs
- [ ] Compiles services to PVM blobs
- [x] Replays recorded lasair invocations through Parity's polkavm and diffs pc and registers
- [ ] Measures host-call gas
> Why: The replay harness is the basis of lasair's "bit-identical PVM" claim (docs/DISCLOSURES.md).

## Level 2

### Q A program executes `store_u32` at address 0x1000. What happens?
- [ ] A page fault at 0x1000
- [ ] The store succeeds if the page is writable
- [ ] An out-of-gas exit
- [x] A panic, because the address is below 2¹⁶
> Why: 0x1000 = 4096 < 65536. Addresses below 2¹⁶ panic before the page map is consulted.

### Q A store targets address 0x20000, whose page is read-only. What is the exit?
- [x] Page fault, reporting the page address 0x20000
- [ ] Panic
- [ ] The store is silently dropped
- [ ] Halt
> Why: Above 2¹⁶, a write to a non-writable page faults with the lowest offending address rounded down to its page. State is unchanged.

### Q An 8-octet load starts 4 octets before the end of a readable page; the next page is inaccessible. What happens?
- [ ] It succeeds because the start address is readable
- [x] It faults, reporting the inaccessible next page
- [ ] It panics for misalignment
- [ ] It loads 4 octets and zero-pads
> Why: Every address the instruction touches must be accessible; the fault names the lowest bad page.

### Q `div_s_64` is executed with ω_A = −2⁶³ and ω_B = −1. What is the result?
- [ ] It panics on overflow
- [ ] 2⁶³ − 1
- [x] The dividend, −2⁶³
- [ ] 0
> Why: The signed overflow case returns ω_A. The matching rem_s returns 0.

### Q `rem_s_64` with ω_A = −7 and ω_B = 2. What sign does the result have?
- [ ] It panics
- [ ] It is always zero for negative numbers
- [ ] Positive (1)
- [x] Negative (−1), because the remainder takes the numerator's sign
> Why: smod takes the sign of the numerator with the modulo of the absolute values.

### Q A shift instruction `shlo_l_64` is given a count of 65. How far does it shift?
- [x] 1, because the count is taken mod 64
- [ ] 65, giving zero
- [ ] It panics
- [ ] 0, because the count is out of range
> Why: 64-bit shifts use the count mod 64 (eq. for shlo_l_64).

### Q A block contains `ecalli` in the middle. The host call succeeds. How many times is that block charged?
- [ ] Zero: host calls pay for the block
- [x] Once: the flag stays set and execution resumes inside the same block
- [ ] Once per instruction
- [ ] Twice: once before and once after the call
> Why: ecalli is not a terminator, so φ stays ⊤ after the host call and no re-charge happens.

### Q The next block costs 40 gas and 30 gas remains. What does Ψ return?
- [ ] Out-of-gas with gas drained to 0
- [ ] Runs as many instructions as 30 gas allows
- [x] Out-of-gas with 30 gas still recorded and φ = ⊥
- [ ] Panic
> Why: No instruction runs in an unpaid block; the counter is unchanged.

### Q A branch's taken target is a valid block start but its fall-through position is not. Under 0.8.0, what happens?
- [ ] It works if the condition is true
- [ ] It halts
- [ ] It falls through anyway
- [x] It panics regardless of the condition
> Why: 0.8.0 requires both targets to be block starts, whether or not the condition holds. 0.7.2 checked only the taken target.

### Q A dynamic jump uses address 6 and the jump table has 2 entries. What happens?
- [x] Panics, because 6 > 2·|j| = 4
- [ ] Jumps to entry 1
- [ ] Jumps to table entry 3
- [ ] Halts
> Why: djump panics if a > 2·|j|. Valid addresses are 2 and 4, giving entries 0 and 1.

### Q A dynamic jump uses address 3. What happens?
- [ ] Jumps to entry 1
- [x] Panics, because the address is odd
- [ ] Faults at address 3
- [ ] Jumps to entry 0
> Why: Dynamic addresses must be even: they are (index + 1) × 2 to match LLVM's alignment assumption.

### Q A program returns from its entry function without having changed ω₀. What exit results?
- [ ] Out-of-gas
- [ ] A fault at the top of memory
- [x] Halt, because ω₀ holds 2³² − 2¹⁶
- [ ] Panic, because 2³² − 2¹⁶ is not in the jump table
> Why: The initial return address is the halt address, so returning from main halts.

### Q A program halts with ω₇ = 0x30000 and ω₈ = 16, but that page is inaccessible. What does Ψ_M return?
- [ ] Panic
- [ ] A fault
- [ ] The 16 octets as zeros
- [x] Halt with an empty output blob
> Why: On halt, if the output range is not readable, Ψ_M returns an empty blob, not an error.

### Q An invocation is given 1000 gas and ends out-of-gas with the counter at −3 internally. What gas used is reported?
- [x] 1000
- [ ] 0
- [ ] 1003
- [ ] 997
> Why: u = ϱ − max(ϱ', 0), so gas used never exceeds gas given.

### Q A standard program's sizes violate 5·Z_Z + Q(|o|) + Q(|w| + z·Z_P) + Q(s) + Z_I ≤ 2³². What does Ψ_M return?
- [ ] A fault at the stack
- [x] Panic with zero gas used
- [ ] It runs with a smaller stack
- [ ] Out-of-gas
> Why: Y returns ∅ when the layout does not fit, and Ψ_M returns panic with zero gas used.

### Q A two-register ALU instruction writes a destination that is also one of its sources. Compared with a distinct destination, what differs in the gas model?
- [ ] It cannot be issued in the same cycle
- [ ] It costs twice the cycles
- [x] It uses 1 decode slot instead of 2
- [ ] Nothing
> Why: 𝔓(1, 2): one decode slot when the destination overlaps a source, two when it does not.

### Q A branch whose fall-through lands on an `unlikely` octet. What does the branch cost in the gas model?
- [ ] 40
- [ ] 2
- [ ] 20
- [x] 1
> Why: 𝔟 = 1 if either target is an unlikely or trap octet, otherwise 20.

### Q A program was written for 0.7.2 and uses `sbrk` to grow its heap. On 0.8.0, how should it grow the heap?
- [x] With the `grow_heap` host call
- [ ] By writing past the heap, which maps new pages
- [ ] With `store_imm` into the heap frontier
- [ ] It cannot; the heap is fixed
> Why: sbrk was removed; grow_heap (host call 1) extends the writable region.

### Q Two lasair fuzz seeds were left after the seed campaign, both about PVM memory. What were they about?
- [ ] Jump-table alignment
- [x] Memory accessibility at the sbrk heap frontier, compared with polkavm
- [ ] Register initialisation
- [ ] Division by zero
> Why: docs/M1_PLAN.md records the last two seeds as "PVM memory accessibility vs polkavm, the sbrk frontier".

## Level 3

### Q Why does the PVM return the state *before* the faulting instruction on a page fault?
> Hint: Who is expected to act after a fault, and what do they need to do?
> Answer: So the environment can fix the cause and resume. The caller (for an inner machine, the refine code via `pages`) can map the missing page and run the same instruction again. If the state had advanced, the instruction would be half-applied.

### Q Explain in two sentences why 0.8.0 charges gas per basic block.
> Hint: What does the CPU cost of one instruction depend on?
> Answer: Real cost depends on the instructions around it (pipelining, dependencies, execution units), so a whole block is a far better unit for pricing than one instruction. Charging a whole block on entry also means no instruction ever runs in a block that has not been paid for in full.

### Q What does the gas-charged flag φ prevent, and where is it reset?
> Hint: Think about host calls in the middle of a block.
> Answer: It prevents a block being charged twice, in particular after a host call resumes inside it. It is reset to ⊥ after a terminator continues (so the next block is charged on entry) or when a charge fails.

### Q Why is register 0 initialised to 2³² − 2¹⁶?
> Hint: What does a compiled `main` do when it finishes?
> Answer: It is the return address. When the entry function returns, it jumps to ω₀, and a dynamic jump to 2³² − 2¹⁶ means halt. So a normal return ends the program cleanly.

### Q Why does division by zero not trap in the PVM?
> Hint: What must every node agree on, and what would a trap add?
> Answer: The GP simply defines fixed results: all ones for unsigned and signed division by zero, the dividend for remainder by zero. The reasons (derivation, not GP text): every node must get the same deterministic result without an extra exceptional exit, and these values match what RISC-V itself defines.

### Q Describe the standard program memory layout from low to high addresses.
> Hint: Guard, then two data regions, then two regions near the top.
> Answer: An inaccessible 64 KiB guard; read-only data from 2¹⁶; one unallocated 64 KiB zone; the writable heap (initial data then zero pages); a large gap; the writable stack ending at 2³² − 2·Z_Z − Z_I; another unallocated zone; the read-only arguments from 2³² − Z_Z − Z_I; and a final inaccessible zone. Everything else is inaccessible.

### Q What does `deblob` validate, and why validate the whole program up front?
> Hint: What should never be discovered halfway through execution?
> Answer: That every instruction reachable by skipping is a known opcode, that the last one is a terminator, and that the starting pc is a valid instruction start. Validating up front means a bad program panics before doing any work instead of partway through.

### Q Why must a branch have both targets at block starts in 0.8.0, even the one not taken?
> Hint: The gas model prices blocks.
> Answer: Gas is charged per basic block on entry, so every possible control-flow edge must land at a block start. Checking both targets regardless of the condition makes a program's validity independent of runtime data.

### Q What is `unlikely` for, if it does nothing?
> Hint: Look at branch costs.
> Answer: It marks a cold path. A branch whose target (or fall-through) is an unlikely or trap octet costs 1 instead of 20, so compilers can make rarely taken error branches cheap.

### Q How does Ψ_M compute gas used, and why that formula?
> Hint: Gas can go below zero internally.
> Answer: u = ϱ − max(ϱ', 0). The internal counter can be driven negative, but the reported gas used is capped at the gas given, so nobody is charged more than they allowed.

### Q What did lasair's PVM war story teach about the memory model?
> Hint: sbrk and polkavm.
> Answer: The last two failing seeds were about exactly where the writable heap ended after `sbrk`, which decides whether a store faults or succeeds. The lesson: the page map is protocol-visible, so memory accessibility must match the reference exactly. (0.8.0 separately removed sbrk in favour of the grow_heap host call; the record does not link the two.)

### Q What is the difference between Ψ, Ψ_H and Ψ_M?
> Hint: Raw machine, host-call handling, protocol invocation.
> Answer: Ψ runs the raw machine to an exit. Ψ_H wraps it and handles host-call exits with a mutator function, resuming after each call. Ψ_M sets up a standard program from a JAM blob and arguments, runs Ψ_H, and turns the exit into a result blob or error plus gas used.
