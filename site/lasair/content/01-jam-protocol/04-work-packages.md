---
title: Work and Services
duration: 30 min
---

# Work and Services

This is where JAM's real power lies. Work packages are the computational payload of the system. Services are the programs that process them. Understanding this flow is key to understanding lasair.

## The Work Package

A work package is a bundle of computation to be executed:

```
┌─────────────────────────────────────────────────────────────┐
│                      Work Package                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Authorization                                               │
│  ├── auth_code_host    (service holding the authorizer code)│
│  ├── auth_code_hash    (authorization code)                 │
│  ├── auth_config       (authorizer configuration)           │
│  └── auth_token        (argument for this package)          │
│                                                              │
│  Context                                                     │
│  ├── anchor            (recent block: hash, slot,           │
│  │                      posterior state root, BEEFY root)   │
│  ├── lookup_anchor     (block for historical lookups:       │
│  │                      hash, slot, posterior state root)   │
│  └── prerequisites     (packages that must come first)      │
│                                                              │
│  Work Items (1 to 16)                                        │
│  ├── item[0]: { service, code_hash, payload,                │
│  │              refine_gas, accumulate_gas,                 │
│  │              imports, extrinsics, export_count }         │
│  └── ...                                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## In Lasair: Refinement Context

The refinement context is the part every guarantor, auditor and block importer must agree on. From `conformance/trace_types.ml`:

```ocaml
type trace_refine_context = {
  rc_anchor: bytes;                   (* anchor block hash *)
  rc_anchor_slot: int;                (* GP 0.8.0 (#526) *)
  rc_state_root: bytes;               (* anchor's posterior state root *)
  rc_beefy_root: bytes;               (* anchor's accumulation-output super-peak *)
  rc_lookup_anchor: bytes;
  rc_lookup_anchor_slot: int;
  rc_lookup_anchor_state_root: bytes; (* GP 0.8.0 (#526) *)
  rc_prerequisites: bytes list;
}
```

The work package and work item themselves follow section 14.3 of the Graypaper: a package is (auth token, auth code host, auth code hash, auth config, context, 1 to 16 items), and an item is (service, code hash, payload, refine gas limit, accumulate gas limit, export count, imports, extrinsics).

## The Two-Phase Execution Model

JAM separates computation into two distinct phases:

### Phase 1: Refine (Off-Chain, Heavy)

```
┌─────────────────────────────────────────────────────────────┐
│                    REFINE PHASE                              │
│                                                              │
│  Input: Work Item + imported segments + extrinsic data      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    PVM Instance                      │    │
│  │                                                      │    │
│  │  • Load refine code (from code_hash)                │    │
│  │  • Execute with payload as input                    │    │
│  │  • Can look up preimages as of the lookup anchor    │    │
│  │  • CANNOT read or write service storage             │    │
│  │  • Can export data segments                         │    │
│  │  • Gas metered                                      │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Output: Work Result (small; ≤ 48 KiB per whole report)     │
│                                                              │
│  Time limit: Multiple seconds allowed                       │
│  Execution: Parallel across cores                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Accumulate (On-Chain, Fast)

```
┌─────────────────────────────────────────────────────────────┐
│                   ACCUMULATE PHASE                           │
│                                                              │
│  Input: Work Results (from refine) + Current State          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    PVM Instance                      │    │
│  │                                                      │    │
│  │  • Load accumulate code                             │    │
│  │  • Process work results                             │    │
│  │  • CAN write service state                          │    │
│  │  • CAN transfer to other services                   │    │
│  │  • Strict gas limit                                 │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Output: State mutations                                     │
│                                                              │
│  Time limit: Must complete in one slot                      │
│  Execution: Sequential                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Why Two Phases?

This design provides:

1. **Scalability** - Heavy computation happens off-chain
2. **Parallelism** - Refine runs on every active core simultaneously (341 at full size)
3. **Determinism** - Accumulate is verified by all validators
4. **Efficiency** - Only small results go on-chain

## Refine, Sketched

```ocaml
(* Illustrative sketch (not lasair's code). The real Refine invocation
   Ψ_R is in the Graypaper's appendix B.3. *)
let refine ~service ~work_item ~context =
  (* Load the refine code: the preimage of code_hash, as of the lookup anchor *)
  let code = historical_lookup service context.lookup_anchor_slot work_item.code_hash in

  (* Create a PVM instance; refine has no storage access at all *)
  let pvm = Pvm.create
    ~code
    ~gas:work_item.refine_gas_limit
  in

  (* Set input *)
  Pvm.set_input pvm work_item.payload;

  (* Execute *)
  match Pvm.run pvm with
  | Ok output ->
    let gas_used = work_item.refine_gas_limit - Pvm.remaining_gas pvm in
    Ok { output; gas_used }
  | Error e ->
    Error e
```

## Work Results

The output of refine is a **work result**, which the Graypaper calls a *work-digest* (section 11.1, eq. workdigest):

```ocaml
(* Illustrative sketch (not lasair's code) of the Graypaper's fields *)
type work_digest = {
  service_id : service_id;
  code_hash : hash;
  payload_hash : hash;       (* Hash of original payload *)
  accumulate_gas : int64;    (* Gas limit for this item's accumulation *)
  result : work_output;
  (* refine load: *)
  gas_used : int64;
  imports : int; extrinsic_count : int; extrinsic_size : int; exports : int;
}

type work_output =
  | Success of bytes    (* Result data; all outputs + the auth trace ≤ 48 KiB *)
  | OutOfGas            (* Ran out of gas *)
  | Panic               (* Execution failed *)
  | BadExports          (* Export count differs from the item's claim *)
  | Oversize            (* Output would push the report past 48 KiB *)
  | BAD                 (* Code not found at the lookup anchor *)
  | BIG                 (* Code larger than 4,000,000 octets *)
```

## Accumulate, Sketched

```ocaml
(* Illustrative sketch (not lasair's code). The real Accumulate invocation
   Ψ_A is in the Graypaper's appendix B.4. *)
let accumulate ~service ~inputs ~state ~gas =
  (* inputs: every work-digest for this service in this round, plus the
     deferred transfers addressed to it; transfers credit the balance first *)
  let code = service_code state service in

  (* ONE PVM run per service per round, starting at instruction counter 5
     (the accumulate entry point). The code pulls each input with the fetch
     host call and changes state through host calls (read, write, transfer,
     new, yield, ...). *)
  match Pvm.run_program code ~pc:5 ~gas
          ~args:(encode (slot, service, List.length inputs)) with
  | Halt output -> commit state output     (* the regular dimension *)
  | Panic | OutOfGas -> rollback state     (* back to the last checkpoint *)
```

## Services: Long-Lived Programs

A service is a stateful program living on JAM:

```ocaml
(* Illustrative sketch of the Graypaper's service account (section 9) *)
type service = {
  (* Code: one blob with two entry points, refine and accumulate *)
  code_hash : hash;           (* its preimage (metadata + code) is in preimages *)

  (* Resources *)
  balance : int64;            (* Token balance *)
  min_item_gas : int64;       (* Min accumulate gas per work item (g) *)
  min_memo_gas : int64;       (* Min accumulate gas per incoming transfer (m) *)
  gratis : int64;             (* Storage the parent pays for (f) *)

  (* State: every item has its own key in the global state trie *)
  storage : (bytes, bytes) dict;
  preimages : (hash, bytes) dict;
  requests : (hash * int, slot list) dict;

  (* Bookkeeping *)
  created : slot; last_accumulated : slot; parent : service_id;
}
```

There is no `on_transfer` code any more: a transfer is delivered to the receiver's Accumulate as one of its inputs.

## Service Lifecycle

```
1. CREATE SERVICE
   └── Deploy code, set initial balance
           │
           ▼
2. RECEIVE WORK
   └── Work packages submitted by users
           │
           ▼
3. REFINE WORK
   └── Validators execute work items
           │
           ▼
4. ACCUMULATE RESULTS
   └── Results integrated into state
           │
           ▼
5. SERVICE INTERACTIONS
   └── Can transfer tokens, call other services
           │
           ▼
6. STATE UPDATED
   └── New state root in the next block header
```

## The PVM: Execution Environment

The Polkadot Virtual Machine runs all service code:

```
┌─────────────────────────────────────────────────────────────┐
│                         PVM                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Registers (13 × 64-bit)                                    │
│  ┌────┬────┬────┬─────┬─────┐                               │
│  │ φ0 │ φ1 │ φ2 │ ... │ φ12 │  (+ pc and gas counter)       │
│  └────┴────┴────┴─────┴─────┘                               │
│                                                              │
│  Memory (sparse 4KB pages, 32-bit layout)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 0x00000000        ...         0xFFFFFFFF            │   │
│  │ (faults)  RO data   RW+heap     Stack    Args       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Gas Counter (charged per basic block, on entry)            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  remaining: 8,543,291 / 10,000,000                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Host Calls (GP v0.8.0 ids)                                 │
│  ├── gas() = 0        - check remaining gas                 │
│  ├── grow_heap() = 1  - grow the heap (no sbrk instruction) │
│  ├── lookup() = 3     - read a stored preimage              │
│  ├── read() = 4       - read service storage                │
│  ├── write() = 5      - write service storage               │
│  ├── transfer() = 21  - send tokens to a service            │
│  ├── solicit() = 24   - request a preimage                  │
│  └── ... (28 host calls, ids 0-27, plus log = 100)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## In Lasair: PVM Types

```ocaml
(* From lib/pvm.ml *)

(** Register file: 13 64-bit registers *)
type registers = reg_value array

(** Full machine state *)
type machine = {
  program: program;
  pc: int64;                (** Instruction counter *)
  gas: int64;               (** Gas remaining *)
  regs: registers;
  mem: ram;
  heap_ptr: int64;          (** Current heap end (grow_heap) *)
  heap_end: int64;          (** First address past the last possible RW page (grow_heap limit b) *)
  gas_charged: bool;        (** GP 0.8.0: has the current basic block's gas been charged? *)
  pending_exit: exit_reason option;
  (** An exit a host call demands before the next instruction runs (e.g. the
      grow_heap out-of-gas deviation, GP #533) *)
}

(** Exit reason from PVM execution *)
type exit_reason =
  | Halt                  (** Normal termination *)
  | Panic                 (** Error condition *)
  | OutOfGas              (** Ran out of gas *)
  | PageFault of int64    (** Memory access fault with page address *)
  | HostCall of int64     (** Host call with identifier *)
```

## Guarantees: Work Attestations

When validators finish refining, they create a guarantee:

```ocaml
type work_report = {
  package_spec : availability_spec;  (* package hash, bundle length, erasure root,
                                        erasure shards (= |κ′|, new in v0.8.0),
                                        segment root, segment count *)
  context : refinement_context;
  core_index : int;
  authorizer_hash : hash;
  auth_trace : bytes;
  segment_root_lookup : (hash * hash) list;
  digests : work_digest array;       (* one per work item *)
  auth_gas_used : int64;
}

type guarantee = {
  report : work_report;
  slot : slot;
  credentials : credential array;  (* 2 or 3 validator signatures *)
}

type credential = {
  validator : validator_index;
  signature : signature;
}
```

A guarantee says: "We validators on core X (two or three of the three assigned) executed this work and got these results." Since v0.8.0 the core must also be active: its index must be below |κ′|/3.

## The Full Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. BUILDER SUBMITS WORK PACKAGE                            │
│     └── To the guarantors of a core                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. GUARANTORS CHECK AUTHORIZATION                          │
│     └── Authorizer must be in that core's pool (α)          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. CORE GROUP EXECUTES REFINE                              │
│     └── Each guarantor runs the work items                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. CORE GROUP CREATES GUARANTEE                            │
│     └── 2 or 3 sign the work report, erasure-code the data  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. GUARANTEE INCLUDED IN BLOCK                             │
│     └── Block producer includes in extrinsics               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. EVERY VALIDATOR RECEIVES ITS SHARD                      │
│     └── One erasure-coded chunk each, checked by Merkle proof│
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. ASSURANCES ACCUMULATE                                   │
│     └── Available once > 2/3 of κ assure it                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  8. ACCUMULATE RUNS ON-CHAIN                                │
│     └── Work results integrated into service state          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  9. STATE TRANSITION COMPLETE                               │
│     └── New state root in next block header                 │
└─────────────────────────────────────────────────────────────┘
```

## Constants

Key limits from the Graypaper:

```ocaml
let c_max_work_items = 16                  (* I: items per package *)
let c_max_bundle_size = 13_791_360         (* W_B: package + extrinsics + imports, octets *)
let c_max_report_var_size = 48 * 1024      (* W_R: all outputs + auth trace, octets *)
let c_assurance_timeout = 5                (* U: slots before an unavailable report is dropped *)
```

## Exercise: Trace a Work Package

Given this simplified work package:

```ocaml
let package = {
  authorization = {
    auth_code_host = 42;
    auth_code_hash = hash "auth_code";
    auth_config = bytes_of_string "allowed_user_123";
    auth_token = signature_of_user_123;
  };
  context = {
    anchor = latest_block_hash;
    lookup_anchor = latest_block_hash;
  };
  items = [|
    { service = 42; code_hash = hash "refine_v1";
      payload = bytes_of_string "compute(100)"; refine_gas_limit = 1_000_000L };
  |];
}
```

Trace through:
1. What does authorization check?
2. What can the refine code access?
3. What's in the work result?
4. What can accumulate do with it?

<details>
<summary>Click to see answer</summary>

```
1. AUTHORIZATION CHECK
   - Loads code at hash "auth_code" from service 42's preimages
   - Runs with the core index; reads config and token via fetch
   - Must return a trace (permission granted)
   - If fails, entire package rejected
   - Stateless: it cannot read any service's storage

2. REFINE ACCESS
   - Code loaded from hash "refine_v1"
   - Input: "compute(100)" payload
   - Can READ service 42's preimages as of the lookup_anchor
     (historical_lookup), imported segments and extrinsic data
   - CANNOT read or write service storage
   - Has 1,000,000 gas to work with

3. WORK RESULT
   {
     service_id = 42;
     code_hash = hash "refine_v1";
     payload_hash = hash "compute(100)";
     gas_used = 523_412;  (* however much it used *)
     result = Success (bytes_of_string "result: 42");
   }

4. ACCUMULATE
   - Runs service 42's accumulate code
   - Receives work result output "result: 42"
   - CAN write to service 42's storage
   - CAN transfer tokens to other services
   - CAN yield a 32-byte output hash (into the accumulation output log)
   - Its writes change the global state root
```

</details>

## Exercise: Design a Simple Service

Design a counter service that:
- Accepts "increment" and "decrement" work items
- Maintains a count in storage
- Only allows authorized users

Sketch the refine and accumulate logic:

<details>
<summary>Click to see solution</summary>

```ocaml
(* Refine: Parse command and validate. Refine cannot read storage,
   so reading the count is left to accumulate (or to an off-chain query). *)
let refine_counter payload =
  match parse_command payload with
  | "increment" -> Success (encode_delta 1)
  | "decrement" -> Success (encode_delta (-1))
  | _ -> Panic

(* Accumulate: Apply deltas to state *)
let accumulate_counter results =
  let current =
    match read_storage "count" with
    | Some v -> decode_int v
    | None -> 0
  in
  let deltas = List.filter_map decode_delta_result results in
  let new_count = current + List.fold_left (+) 0 deltas in
  write_storage "count" (encode_int new_count)

(* Authorization: Check caller is allowed. Is-Authorized is stateless,
   so the allow-list travels in the authorizer's configuration and the
   caller proves itself with a signature in the token. *)
let authorize_counter ~config ~token =
  let allowed = decode_list config in
  let caller, signature = decode_token token in
  if List.mem caller allowed && verify signature caller then
    Success
  else
    Panic
```

</details>

## Key Takeaways

1. **Work packages** - Bundles of computation with authorization
2. **Two phases** - Refine (heavy, off-chain) and accumulate (fast, on-chain)
3. **Services** - Long-lived stateful programs
4. **PVM** - Deterministic RISC-V execution environment
5. **Guarantees** - Validator attestations of work results
6. **Core groups** - 3 validators responsible per core
7. **Data availability** - Ensures results can be verified

## Track Complete!

You now understand the JAM protocol:
- What JAM is and why it exists
- How state and blocks are structured
- How validators reach consensus
- How work flows through the system

Ready to dive into lasair's implementation? [Notation Module →](lesson.html?lesson=02-lasair-core/01-notation)
