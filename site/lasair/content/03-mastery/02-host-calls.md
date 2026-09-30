---
title: Host Calls
duration: 30 min
---

# Host Calls

Host calls are PVM's interface to the outside world. When service code needs to read state, transfer tokens, or interact with the system, it makes a host call. Understanding this interface is essential for writing and debugging services.

Everything here is Graypaper **0.8.0** (appendix B, "Virtual Machine Invocations"). The numbering and the prices changed from 0.7.x, so check which version any other source describes.

## The Host Call Mechanism

When PVM executes the `ecalli` instruction:

1. Execution pauses with the exit `HostCall n`, where `n` is the instruction's **immediate** (not a register)
2. The host charges the call's gas; if there is not enough, the machine exits out-of-gas
3. Arguments are read from registers **ω7 to ω12**
4. The host performs the operation, reading and writing PVM memory as needed
5. The result is written to **ω7** (a few calls also set ω8)
6. Execution resumes at the instruction after `ecalli`

```
┌─────────────────────────────────────────────────────────────┐
│                     Host Call Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PVM Code:                                                   │
│    load_imm ω7, -1       # service: 2^64-1 = "myself"        │
│    load_imm ω8, 0x20000  # key pointer                       │
│    load_imm ω9, 5        # key length                        │
│    load_imm ω10, 0x21000 # output pointer                    │
│    load_imm ω11, 0       # offset into the value             │
│    load_imm ω12, 256     # max bytes to copy                 │
│    ecalli 4              # read                              │
│    # ω7 now holds the value's length, or NONE                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                           │                                  │
│                           ▼                                  │
│  Host:                                                       │
│    1. Charge g = 2407 + ⌈1736·5/1024⌉ + ⌈248·256/1024⌉      │
│    2. Read the 5-byte key from memory (panic if unreadable)  │
│    3. Look it up in this service's storage                   │
│    4. Copy up to 256 bytes of the value to 0x21000           │
│    5. Set ω7 = the value's full length (or NONE)             │
│    6. Resume PVM                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Host Call Categories

Which calls exist depends on **where** the PVM is running. There are three invocations (Is-Authorized, Refine, Accumulate), and each has its own dispatch table. The identifiers:

### General (available in every invocation)

```
 0  gas         remaining gas
 1  grow_heap   extend the read-write heap (new in 0.8.0)
 2  fetch       read invocation data: parameters, entropy, the package, items...
```

Is-Authorized gets only these three.

### Service data (3–6 Accumulate only, 7–8 Refine only)

```
 3  lookup      a preimage by hash               (Accumulate)
 4  read        service storage                  (Accumulate)
 5  write       own storage                      (Accumulate)
 6  info        a service's account info         (Accumulate)
 7  historical_lookup  a preimage as of the lookup anchor   (Refine)
 8  export      export a segment                 (Refine)
```

### Inner PVMs (Refine only)

```
 9  machine     create an inner PVM
10  peek        read its memory
11  poke        write its memory
12  pages       set page access
13  invoke      run it
14  expunge     destroy it
```

### Accumulate only

```
15 bless       set the privileged services
16 assign      set a core's authorizer queue
17 designate   set the next validator keys
18 checkpoint  commit the state so far
19 new         create a service
20 upgrade     change own code
21 transfer    send tokens (and a memo) to a service
22 eject       remove a service, inherit its balance
23 query       status of a preimage request
24 solicit     request a preimage
25 forget      drop a preimage request
26 yield       set the accumulation output
27 provide     supply a preimage a service (possibly itself) requested
```

A call that is not in the current invocation's table (a `transfer` from Refine, say) is an **unknown** host call: it costs 1000 gas and sets ω7 = `WHAT`, and execution continues. Lasair also answers `log` (100), a debug call defined by JIP-1 rather than the Graypaper, which is priced the same way.

**What changed from 0.7.x:** `grow_heap` took identifier 1, so every call from `fetch` onwards is one higher than its 0.7.x number (0.7.x `fetch` was 1, `checkpoint` 17, `transfer` 20). A service built for 0.7.x calls the wrong functions on 0.8.0.

## In Lasair: Host Call Implementation

Each call is a function in `lib/pvm_host.ml` of the same shape: context, registers and memory in; new gas, registers, memory and, when the call changes them, the service account and the context out. `None` means the call panics the invocation. The simplest one:

```ocaml
let host_gas (ctx : host_context) (regs : registers) (mem : ram) : host_result =
  let gas_cost = Gas.g in                                   (* 48 *)
  let new_gas = Int64.sub ctx.gas_remaining gas_cost in
  (* GP Omega_G: r7 = the remaining gas AFTER this call's own cost *)
  let regs' = set_reg regs 7 new_gas in
  { new_gas; new_regs = regs'; new_mem = mem; new_service = None; new_context = None }
```

The detail in the comment is a real bug: lasair once returned the gas from *before* the charge, and block-import trace vectors came out with the wrong state root until it was fixed.

## Detailed Host Call Reference

Gas costs are the Graypaper 0.8.0 constants. A cost with a size term uses ⌈L·ℓ/1024⌉ for a rate L per 1024 octets and a size ℓ.

### gas (0)

Returns remaining gas.

```
Input:  (none)
Output: ω7 = gas remaining after this call
Cost:   48
```

### lookup (3)

Look up a preimage by its hash.

```
Input:  ω7  = service (2^64-1 or its own id = this service)
        ω8  = hash pointer (32 bytes in memory)
        ω9  = output pointer
        ω10 = offset into the preimage
        ω11 = max length to copy
Output: ω7 = the preimage's full length, or NONE if not found
Cost:   600 + ⌈248 · ω11 / 1024⌉
```

### read (4)

Read a value from a service's storage.

```
Input:  ω7  = service (2^64-1 = this service)
        ω8  = key pointer
        ω9  = key length
        ω10 = output pointer
        ω11 = offset into the value
        ω12 = max length to copy
Output: ω7 = the value's full length, or NONE if not found
Cost:   2407 + ⌈1736 · key_len / 1024⌉ + ⌈248 · ω12 / 1024⌉
```

### write (5)

Write to (or delete from) this service's own storage.

```
Input:  ω7  = key pointer
        ω8  = key length
        ω9  = value pointer
        ω10 = value length (0 = delete the key)
Output: ω7 = the previous value's length, or NONE if the key was new,
        or FULL if the new state would need more balance than it has
Cost:   2442 + ⌈3358 · key_len / 1024⌉ + ⌈216 · value_len / 1024⌉
```

### checkpoint (18) - Accumulate Only

Commit the accumulation state so far: if the invocation later panics or runs out of gas, it rolls back to here instead of to its start.

```
Input:  (none)
Output: ω7 = gas remaining after this call
Cost:   103
```

In all of these, a pointer range that the service cannot read (or, for output, write) **panics** the invocation. Once the gas is paid, the Graypaper checks memory before anything else, and the order matters: reading a key from a bad pointer for a service that does not exist must panic, not return NONE.

## In Lasair: Host Call Dispatch Table

From `lib/pvm_host.ml` (abridged):

```ocaml
let dispatch (host_id : int) (ctx : host_context) (regs : registers) (mem : ram) =
  match host_id with
  | 0 -> Some (host_gas ctx regs mem)
  | 1 -> host_grow_heap ctx regs mem
  | 2 -> host_fetch ctx regs mem
  | 3 -> host_lookup ctx regs mem
  | 4 -> host_read ctx regs mem
  | 5 -> host_write ctx regs mem
  | 6 -> host_info ctx regs mem
  | 7 -> host_historical_lookup ctx regs mem
  | 8 -> host_export ctx regs mem
  | 9 -> host_machine ctx regs mem
  (* ... 10-27 ... *)
  | 100 -> Some (host_log ctx regs mem)   (* JIP-1 debug log *)
  (* ... anything else: unknown *)
```

Each handler charges its own gas, computed from the same registers the call reads: a cost can depend on the arguments (a length, a `fetch` selector). If the result leaves the counter below zero, the driver (`execute_host_call`) discards the call's effects and exits out-of-gas. `host_call_cost` holds the same prices as one table: it prices a call that panics (whose handler returns no result), and with `LASAIR_GAS_CHECK=1` it cross-checks every handler's charge.

## Context-Dependent Availability

Each invocation passes its own dispatch function to the PVM (the Graypaper's F for Ψ_I, Ψ_R and Ψ_A), which is how the same identifier can mean something in one context and nothing in another. An illustrative sketch (lasair keeps the three sets as lists in `lib/pvm_host.ml`, checked by `in_invocation_set`):

```ocaml
type invocation = Is_authorized | Refine | Accumulate

let is_available invocation id =
  match invocation, id with
  | _, (0 | 1 | 2) -> true                          (* gas, grow_heap, fetch *)
  | Refine, (7 | 8 | 9 | 10 | 11 | 12 | 13 | 14) -> true
  | Accumulate, (3 | 4 | 5 | 6) -> true
  | Accumulate, n when n >= 15 && n <= 27 -> true
  | _ -> false                                      (* unknown: WHAT, 1000 gas *)
```

Older Graypaper versions had a fourth invocation, On-Transfer. It is gone: a deferred transfer (with its memo) is now one of the receiving service's accumulate inputs, alongside the work-report operands, and the service reads it with `fetch`.

## Error Handling

Host calls report results in ω7. Values near 2⁶⁴ are error codes:

```ocaml
(* From lib/pvm.ml *)
let host_none = Int64.sub 0L 1L    (* 2^64 - 1: Item does not exist *)
let host_what = Int64.sub 0L 2L    (* 2^64 - 2: Name unknown *)
let host_oob  = Int64.sub 0L 3L    (* 2^64 - 3: Memory index not accessible (inner PVMs) *)
let host_who  = Int64.sub 0L 4L    (* 2^64 - 4: Index unknown *)
let host_full = Int64.sub 0L 5L    (* 2^64 - 5: Storage full *)
let host_core = Int64.sub 0L 6L    (* 2^64 - 6: Core index unknown *)
let host_cash = Int64.sub 0L 7L    (* 2^64 - 7: Insufficient funds *)
let host_low  = Int64.sub 0L 8L    (* 2^64 - 8: Gas limit too low *)
let host_huh  = Int64.sub 0L 9L    (* 2^64 - 9: Invalid operation *)
let host_ok   = 0L                 (* Success *)
```

An error code is a normal return: the service reads it and carries on. Two things are not:

- **Out of gas.** If the remaining gas is below the call's cost, the machine exits out-of-gas, and in Accumulate the state rolls back to the last checkpoint. Since no part of the call ran, a `checkpoint` that cannot pay for itself does not become the rollback point.
- **Memory faults.** An unreadable input range or an unwritable output range panics the invocation.

## Exercise: Implement Host Read

Implement `read` for the invoking service's own storage (ω7 = 2⁶⁴ − 1), with the Graypaper's argument order:

```ocaml
let host_read_self ~storage ~gas regs mem =
  (* ω8 = key pointer, ω9 = key length, ω10 = output pointer,
     ω11 = offset into the value, ω12 = max length.
     Returns: `Out_of_gas, `Panic, or `Ok (gas', regs', mem') *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let memgas rate len = Int64.of_int ((rate * len + 1023) / 1024)

let host_read_self ~storage ~gas regs mem =
  let key_ptr = regs.(8) and key_len = Int64.to_int regs.(9) in
  let out_ptr = regs.(10) in
  let offset = Int64.to_int regs.(11) and max_len = Int64.to_int regs.(12) in

  (* 1. Gas first: 2407 + key term + value term (on the REQUESTED length) *)
  let cost = Int64.(add 2407L (add (memgas 1736 key_len) (memgas 248 max_len))) in
  if Int64.unsigned_compare gas cost < 0 then `Out_of_gas
  else
    let gas' = Int64.sub gas cost in
    (* 2. The key, before anything else: an unreadable key panics *)
    match read_memory mem key_ptr key_len with
    | None -> `Panic
    | Some key ->
      match Storage.find_opt key storage with
      | None -> `Ok (gas', set_reg regs 7 host_none, mem)
      | Some v ->
        let len = Bytes.length v in
        let f = min offset len in
        let l = min max_len (len - f) in
        (* 3. The output range must be writable, or panic *)
        match write_memory mem out_ptr (Bytes.sub v f l) with
        | None -> `Panic
        | Some mem' -> `Ok (gas', set_reg regs 7 (Int64.of_int len), mem')
```

Note that ω7 returns the value's **full** length, not the number of bytes copied: a service can call again with a larger buffer or a later offset.

</details>

## Exercise: Implement Storage Write

Implement `write`, ignoring the balance check:

```ocaml
let host_write ~storage ~gas regs mem =
  (* ω7 = key pointer, ω8 = key length,
     ω9 = value pointer, ω10 = value length (0 = delete)
     Returns: previous length or NONE in ω7 *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let host_write ~storage ~gas regs mem =
  let k_ptr = regs.(7) and k_len = Int64.to_int regs.(8) in
  let v_ptr = regs.(9) and v_len = Int64.to_int regs.(10) in
  let cost = Int64.(add 2442L (add (memgas 3358 k_len) (memgas 216 v_len))) in
  if Int64.unsigned_compare gas cost < 0 then `Out_of_gas
  else
    let gas' = Int64.sub gas cost in
    match read_memory mem k_ptr k_len with
    | None -> `Panic
    | Some key ->
      let previous = match Storage.find_opt key storage with
        | Some v -> Int64.of_int (Bytes.length v)
        | None -> host_none in
      let storage' =
        if v_len = 0 then Ok (Storage.remove key storage)
        else match read_memory mem v_ptr v_len with
          | None -> Error `Panic
          | Some v -> Ok (Storage.add key v storage) in
      match storage' with
      | Error `Panic -> `Panic
      | Ok storage' ->
        (* The real call also returns FULL, leaving storage unchanged,
           if the new footprint needs more balance than the service has *)
        `Ok (gas', set_reg regs 7 previous, storage')
```

</details>

## Exercise: Design a New Host Call

Design a host call for "get current slot number":

1. What call number would you assign?
2. What registers are used for input/output?
3. What's the gas cost?
4. Which contexts allow it?

<details>
<summary>Click to see answer</summary>

```ocaml
(* Call number: the next free one, 28 - or no new call at all:
   in Accumulate, fetch already exposes context data, and the
   slot is one of the accumulate arguments passed in at the
   entry point. *)

(* Registers:
   Input: none
   Output: ω7 = current slot number
*)

(* Gas cost: a small constant, like gas (48) - it only reads a value *)

(* Contexts: Accumulate (it runs on-chain, at a known slot).
   Not Refine: refine must give the same result whenever and
   wherever a guarantor or auditor runs it, so it must not see
   the current time. *)

let host_get_slot ctx regs =
  set_reg regs 7 (Int64.of_int ctx.timeslot)
```

That last point is the real design rule: Refine may only see what is fixed by the work package and its lookup anchor, which is why its preimage call is `historical_lookup`.

</details>

## Key Takeaways

1. **`ecalli n`** - The identifier is an immediate; arguments in ω7–ω12, result in ω7
2. **Three dispatch tables** - Is-Authorized, Refine and Accumulate each allow different calls; anything else is unknown (WHAT, 1000 gas)
3. **GP 0.8.0 numbering** - `grow_heap` is 1, and everything after it moved up by one
4. **Gas first, then memory** - not enough gas is out-of-gas; bad pointers panic
5. **Error codes are values** - NONE, WHAT, FULL… are ordinary results near 2⁶⁴
6. **Sandboxing** - Host calls are the only way to interact with outside world

## Next Up

Let's see how blocks flow through the system: [Block Import Pipeline →](lesson.html?lesson=03-mastery/03-block-import)
