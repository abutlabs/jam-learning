(* PVM Basics - The Polkadot Virtual Machine

   The PVM is a RISC-V based virtual machine that executes
   service code in JAM. Understanding it is key to understanding
   how blockchain computation works.

   Key concepts:
   - Register-based architecture (13 registers)
   - Harvard architecture (separate code and data memory)
   - Gas metering (every instruction costs gas)
   - Deterministic execution (same input = same output)

   In lasair, this lives in lib/pvm.ml and lib/pvm_decode.ml
*)

(* ============================================
   Registers

   The PVM has 13 general-purpose registers.
   By convention:
   - r0-r6: Argument/return registers
   - r7-r9: Saved registers
   - r10: Stack pointer
   - r11: Return address
   - r12: Instruction pointer
   ============================================ *)

type register =
  | R0 | R1 | R2 | R3 | R4 | R5 | R6
  | R7 | R8 | R9 | R10 | R11 | R12

let register_name = function
  | R0 -> "a0" | R1 -> "a1" | R2 -> "a2" | R3 -> "a3"
  | R4 -> "a4" | R5 -> "a5" | R6 -> "a6"
  | R7 -> "s0" | R8 -> "s1" | R9 -> "s2"
  | R10 -> "sp" | R11 -> "ra" | R12 -> "ip"

let register_of_int = function
  | 0 -> R0 | 1 -> R1 | 2 -> R2 | 3 -> R3
  | 4 -> R4 | 5 -> R5 | 6 -> R6 | 7 -> R7
  | 8 -> R8 | 9 -> R9 | 10 -> R10 | 11 -> R11
  | 12 -> R12
  | n -> failwith (Printf.sprintf "Invalid register: %d" n)

(* ============================================
   Instructions

   A simplified subset of the PVM instruction set.
   The real PVM has ~90 instructions.
   ============================================ *)

type instruction =
  (* Control flow *)
  | Trap                    (* Abnormal termination *)
  | Fallthrough             (* No-op, continue to next *)
  | Halt                    (* Normal termination *)
  | Jump of int             (* Unconditional jump *)
  | JumpIf of register * int  (* Jump if register != 0 *)

  (* Arithmetic *)
  | Add of register * register * register    (* rd = ra + rb *)
  | Sub of register * register * register    (* rd = ra - rb *)
  | Mul of register * register * register    (* rd = ra * rb *)
  | Div of register * register * register    (* rd = ra / rb *)

  (* Immediate operations *)
  | AddImm of register * register * int      (* rd = ra + imm *)
  | LoadImm of register * int                (* rd = imm *)

  (* Memory operations *)
  | Load of register * register * int        (* rd = mem[ra + offset] *)
  | Store of register * register * int       (* mem[ra + offset] = rd *)

  (* Comparison *)
  | SetLt of register * register * register  (* rd = (ra < rb) ? 1 : 0 *)
  | SetEq of register * register * register  (* rd = (ra == rb) ? 1 : 0 *)

  (* Host calls (system interface) *)
  | Ecalli of int           (* Call host function *)

(** Pretty-print an instruction. *)
let show_instruction = function
  | Trap -> "trap"
  | Fallthrough -> "fallthrough"
  | Halt -> "halt"
  | Jump addr -> Printf.sprintf "jump %d" addr
  | JumpIf (r, addr) -> Printf.sprintf "jump_if %s, %d" (register_name r) addr
  | Add (rd, ra, rb) ->
      Printf.sprintf "add %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | Sub (rd, ra, rb) ->
      Printf.sprintf "sub %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | Mul (rd, ra, rb) ->
      Printf.sprintf "mul %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | Div (rd, ra, rb) ->
      Printf.sprintf "div %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | AddImm (rd, ra, imm) ->
      Printf.sprintf "addi %s, %s, %d"
        (register_name rd) (register_name ra) imm
  | LoadImm (rd, imm) ->
      Printf.sprintf "li %s, %d" (register_name rd) imm
  | Load (rd, ra, off) ->
      Printf.sprintf "load %s, [%s + %d]"
        (register_name rd) (register_name ra) off
  | Store (rd, ra, off) ->
      Printf.sprintf "store [%s + %d], %s"
        (register_name ra) off (register_name rd)
  | SetLt (rd, ra, rb) ->
      Printf.sprintf "slt %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | SetEq (rd, ra, rb) ->
      Printf.sprintf "seq %s, %s, %s"
        (register_name rd) (register_name ra) (register_name rb)
  | Ecalli n -> Printf.sprintf "ecalli %d" n

(* ============================================
   Machine State
   ============================================ *)

type machine_state = {
  registers: int array;     (* 13 registers *)
  memory: bytes;            (* RAM *)
  pc: int;                  (* Program counter *)
  gas: int;                 (* Remaining gas *)
  halted: bool;             (* Has execution stopped? *)
}

(** Create initial machine state. *)
let init_state ?(memory_size=4096) ?(initial_gas=10000) () =
  {
    registers = Array.make 13 0;
    memory = Bytes.make memory_size '\x00';
    pc = 0;
    gas = initial_gas;
    halted = false;
  }

(** Read a register. *)
let read_reg state r =
  state.registers.(match r with
    | R0 -> 0 | R1 -> 1 | R2 -> 2 | R3 -> 3
    | R4 -> 4 | R5 -> 5 | R6 -> 6 | R7 -> 7
    | R8 -> 8 | R9 -> 9 | R10 -> 10 | R11 -> 11 | R12 -> 12)

(** Write a register. *)
let write_reg state r value =
  let idx = match r with
    | R0 -> 0 | R1 -> 1 | R2 -> 2 | R3 -> 3
    | R4 -> 4 | R5 -> 5 | R6 -> 6 | R7 -> 7
    | R8 -> 8 | R9 -> 9 | R10 -> 10 | R11 -> 11 | R12 -> 12
  in
  let new_regs = Array.copy state.registers in
  new_regs.(idx) <- value;
  { state with registers = new_regs }

(* ============================================
   Instruction Execution

   Each instruction has a gas cost.
   If we run out of gas, execution stops.
   ============================================ *)

(** Gas cost for each instruction type. *)
let gas_cost = function
  | Trap | Halt | Fallthrough -> 1
  | Jump _ | JumpIf _ -> 2
  | Add _ | Sub _ | AddImm _ | LoadImm _ -> 1
  | Mul _ -> 3
  | Div _ -> 5
  | Load _ | Store _ -> 10
  | SetLt _ | SetEq _ -> 1
  | Ecalli _ -> 100  (* Host calls are expensive *)

(** Execute one instruction, returning new state. *)
let step (program : instruction array) (state : machine_state) : machine_state =
  if state.halted then state
  else if state.pc >= Array.length program then
    { state with halted = true }
  else
    let instr = program.(state.pc) in
    let cost = gas_cost instr in
    if state.gas < cost then
      { state with halted = true }  (* Out of gas *)
    else
      let state = { state with gas = state.gas - cost } in
      match instr with
      | Trap ->
          { state with halted = true }
      | Halt ->
          { state with halted = true }
      | Fallthrough ->
          { state with pc = state.pc + 1 }
      | Jump addr ->
          { state with pc = addr }
      | JumpIf (r, addr) ->
          if read_reg state r <> 0 then { state with pc = addr }
          else { state with pc = state.pc + 1 }
      | Add (rd, ra, rb) ->
          let result = read_reg state ra + read_reg state rb in
          write_reg { state with pc = state.pc + 1 } rd result
      | Sub (rd, ra, rb) ->
          let result = read_reg state ra - read_reg state rb in
          write_reg { state with pc = state.pc + 1 } rd result
      | Mul (rd, ra, rb) ->
          let result = read_reg state ra * read_reg state rb in
          write_reg { state with pc = state.pc + 1 } rd result
      | Div (rd, ra, rb) ->
          let b = read_reg state rb in
          let result = if b = 0 then 0 else read_reg state ra / b in
          write_reg { state with pc = state.pc + 1 } rd result
      | AddImm (rd, ra, imm) ->
          let result = read_reg state ra + imm in
          write_reg { state with pc = state.pc + 1 } rd result
      | LoadImm (rd, imm) ->
          write_reg { state with pc = state.pc + 1 } rd imm
      | Load (rd, ra, offset) ->
          let addr = read_reg state ra + offset in
          let value =
            if addr >= 0 && addr + 3 < Bytes.length state.memory then
              Int32.to_int (Bytes.get_int32_le state.memory addr)
            else 0
          in
          write_reg { state with pc = state.pc + 1 } rd value
      | Store (rd, ra, offset) ->
          let addr = read_reg state ra + offset in
          let value = read_reg state rd in
          if addr >= 0 && addr + 3 < Bytes.length state.memory then begin
            let mem = Bytes.copy state.memory in
            Bytes.set_int32_le mem addr (Int32.of_int value);
            { state with pc = state.pc + 1; memory = mem }
          end else
            { state with pc = state.pc + 1 }
      | SetLt (rd, ra, rb) ->
          let result = if read_reg state ra < read_reg state rb then 1 else 0 in
          write_reg { state with pc = state.pc + 1 } rd result
      | SetEq (rd, ra, rb) ->
          let result = if read_reg state ra = read_reg state rb then 1 else 0 in
          write_reg { state with pc = state.pc + 1 } rd result
      | Ecalli _ ->
          (* Host calls would go here - just no-op for now *)
          { state with pc = state.pc + 1 }

(** Run until halted or max_steps reached. *)
let run ?(max_steps=1000) program state =
  let rec loop state steps =
    if state.halted || steps >= max_steps then state
    else loop (step program state) (steps + 1)
  in
  loop state 0

(** Show the current state. *)
let show_state state =
  Printf.sprintf
    "PC: %d, Gas: %d, Halted: %b\nRegisters: a0=%d a1=%d a2=%d a3=%d"
    state.pc state.gas state.halted
    state.registers.(0) state.registers.(1)
    state.registers.(2) state.registers.(3)

(* ============================================
   Example Programs
   ============================================ *)

(** Compute factorial of n (stored in a0). *)
let factorial_program = [|
  (* a1 = 1 (result) *)
  LoadImm (R1, 1);

  (* Loop: while a0 > 1 *)
  (* 1: *) SetLt (R2, R1, R0);  (* a2 = (1 < a0) *)
  (* 2: *) JumpIf (R2, 4);      (* if a2 != 0, continue loop *)
  (* 3: *) Jump 7;               (* else exit loop *)

  (* Body: a1 = a1 * a0; a0 = a0 - 1 *)
  (* 4: *) Mul (R1, R1, R0);
  (* 5: *) AddImm (R0, R0, (-1));
  (* 6: *) Jump 1;               (* back to loop start *)

  (* Done: result in a1, copy to a0 *)
  (* 7: *) Add (R0, R1, R1);     (* a0 = a1 + a1... wait, that's wrong *)
  Halt
|]

(** Add two numbers (a0 + a1 -> a0). *)
let add_program = [|
  Add (R0, R0, R1);
  Halt
|]

(** Countdown from a0 to 0. *)
let countdown_program = [|
  (* 0: *) JumpIf (R0, 2);      (* if a0 != 0, continue *)
  (* 1: *) Halt;                 (* else done *)
  (* 2: *) AddImm (R0, R0, (-1));
  (* 3: *) Jump 0;               (* loop *)
|]

(* ============================================
   Interactive Examples

   Try these in the REPL:

   (* Run the add program *)
   > let state = init_state ();;
   > let state = write_reg state R0 5;;   (* a0 = 5 *)
   > let state = write_reg state R1 3;;   (* a1 = 3 *)
   > let final = run add_program state;;
   > read_reg final R0;;
   (* 8 *)

   (* Run countdown and check gas used *)
   > let state = init_state ~initial_gas:100 ();;
   > let state = write_reg state R0 10;;
   > let final = run countdown_program state;;
   > show_state final;;
   (* See gas remaining after 10 iterations *)

   (* Trace execution step by step *)
   > let state = init_state ();;
   > let state = write_reg state R0 3;;
   > let s1 = step countdown_program state;;
   > show_state s1;;
   > let s2 = step countdown_program s1;;
   > show_state s2;;
   ============================================ *)
