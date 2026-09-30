---
title: Definitions Module
duration: 20 min
---

# Definitions Module

The Graypaper's constants appendix fixes the numbers the protocol runs on: how many cores, how long an epoch lasts, how much gas a report may spend. Understanding these values is essential for understanding the protocol's constraints.

Lasair keeps them in two places, and the split is the first thing to learn:

- **`lib/spec.ml`** holds the values that differ between the **tiny** spec (6 validators, 2 cores: the one most test vectors and the fuzzer's trace lanes use) and the **full** spec (up to 1023 validators, 341 cores). One process runs one spec, chosen at start-up, so every such value is a *function* that reads the active spec.
- **`lib/definitions.ml`** holds a compile-time table, `Definitions.Constants`, with the full-spec values that lasair's own library modules use.

## The Source of Truth

Open `lib/spec.ml`. Its header calls it the "single source of truth" for spec-dependent values:

```ocaml
type config = {
  spec_name : string;              (* "tiny", "full", or "custom" (a chainspec's) *)
  epoch_length : int;              (* E: blocks per epoch *)
  num_cores : int;                 (* C *)
  epoch_tail_start : int;          (* Y: ticket submission cutoff *)
  rotation_period : int;           (* R: guarantor rotation period *)
  max_tickets_per_extrinsic : int; (* K *)
  preimage_expunge_period : int;   (* D *)
  max_lookup_anchor_age : int;     (* L *)
  block_acc_gas : int64;           (* G_T *)
  max_refine_gas : int64;          (* G_R *)
}

let current : config ref = ref tiny
let epoch_length () = (!current).epoch_length
let num_cores () = (!current).num_cores
```

And `lib/definitions.ml`, for the values that never change:

```ocaml
module Constants = struct
  let c_core_count = 341           (* Total number of cores *)
  let c_slot_seconds = 6           (* Slot period in seconds *)
  let c_epoch_len = 600            (* Epoch length in timeslots *)
  let c_max_package_items = 16     (* Max work items per package *)
  let c_max_bundle_size = 13_791_360       (* Max work-package bundle size *)
  let c_max_report_var_size = 48 * 1024    (* Max unbounded blobs in report *)
  (* ... *)
end
```

When the Graypaper names a constant with a sans-serif capital (C, E, P, …), you will find most of them in one of these two files. A few live next to the code that uses them: the host-call gas prices M in `lib/pvm_host.ml`, the dispute limits N_V and N_O in `conformance/disputes_stf.ml`.

## Graypaper Notation Mapping

The values are the Graypaper 0.8.0 constants (definitions appendix). The lasair name is the `Definitions.Constants` entry, or the `Spec` accessor where the value depends on the spec.

| Graypaper | Lasair | Value (full) | Meaning |
|-----------|--------|-------|---------|
| C | `c_core_count`, `Spec.num_cores ()` | 341 | Number of cores (tiny: 2) |
| E | `c_epoch_len`, `Spec.epoch_length ()` | 600 | Slots per epoch (tiny: 12) |
| P | `c_slot_seconds` | 6 | Seconds per slot |
| Y | `c_epoch_tail_start` | 500 | Slot in the epoch at which ticket submission ends |
| I | `c_max_package_items` | 16 | Work items per package |
| W_B | `c_max_bundle_size` | 13,791,360 | Max work-package bundle size, in octets |
| W_R | `c_max_report_var_size` | 48 · 2¹⁰ | Max total size of a report's unbounded blobs |
| W_C | `c_max_service_code_size` | 4,000,000 | Max service code size |

**What happened to V?** Up to Graypaper 0.7.2, V = 1023 was a constant. In 0.8.0 it is gone: a validator set may change size at an epoch boundary, to any size in 𝕍 = {6, 9, 12, …, 1023} (multiples of 3 from 6 up to 3C). The live size is |κ|, read from state. `Spec.num_validators ()` returns the capacity 3C (6 on tiny, 1023 on full). `Definitions.Constants` still carries `c_val_count = 1023` and a few other 0.7-era entries (`c_ticket_entries`, `c_ec_piece_size`, `c_segment_ec_pieces`) that 0.8.0 turned into derived quantities. The conformance code reads `Spec`, not these entries.

## Time Constants

JAM's timing is built on slots and epochs:

```ocaml
(* Basic time units *)
let c_slot_seconds = 6              (* P: 6 seconds *)
let c_epoch_len = 600               (* E: 600 slots = 1 hour *)

(* Derived timing (computed here; lasair has no such binding) *)
let seconds_per_epoch = c_slot_seconds * c_epoch_len
(* = 3600 seconds = 1 hour *)

(* Ticket timing *)
let c_epoch_tail_start = 500        (* Y: tickets accepted while slot-in-epoch < 500 *)
(* the last E - Y = 100 slots of an epoch accept no tickets *)
```

Tickets are the Safrole lottery entries for the *next* epoch's slots. Submission closes at slot Y so that the winners are fixed before the epoch ends.

## Helper Functions

Definitions also provides time-related helpers (from `lib/definitions.ml`):

```ocaml
(* Current epoch from timeslot *)
let epoch_of_slot (slot : timeslot) : epoch =
  Int32.to_int slot / Constants.c_epoch_len

(* Slots remaining in current epoch *)
let slots_remaining_in_epoch (slot : timeslot) : int =
  Constants.c_epoch_len - (Int32.to_int slot mod Constants.c_epoch_len)

(* Is ticket submission still open? *)
let ticket_submission_open (slot : timeslot) : bool =
  (Int32.to_int slot mod Constants.c_epoch_len) < Constants.c_epoch_tail_start

(* Is a service index public (>= 2^16)? *)
let is_public_service (id : service_id) : bool =
  Int32.to_int id >= Constants.c_min_public_index
```

## Size Limits

JAM imposes size limits to bound resource usage:

```ocaml
(* Work packages *)
let c_max_package_items = 16             (* I: items per package *)
let c_max_package_imports = 3072         (* imported segments per package *)
let c_max_package_exports = 3072         (* exported segments per package *)
let c_max_package_xts = 128              (* extrinsics per package *)
let c_max_bundle_size = 13_791_360       (* W_B: bundle size, octets *)
let c_max_report_var_size = 48 * 1024    (* W_R: a report's unbounded blobs *)

(* Code *)
let c_max_auth_code_size = 64_000        (* W_A: is-authorized code *)
let c_max_service_code_size = 4_000_000  (* W_C: service code *)

(* Memory and data *)
let c_pvm_page_size = 4096               (* Z_P: PVM page size *)
let c_segment_size = 4104                (* W_G: an exported/imported segment *)
let c_memo_size = 128                    (* W_T: a transfer memo *)
```

## Gas Limits

Execution is bounded by gas:

```ocaml
let c_report_acc_gas = 10_000_000        (* G_A: accumulating one work report *)
let c_package_auth_gas = 50_000_000      (* G_I: Is-Authorized *)
let c_package_ref_gas = 5_000_000_000    (* G_R: Refine, per package *)
let c_block_acc_gas = 3_500_000_000      (* G_T: all accumulation in a block *)
```

On the tiny spec `Spec` lowers two of these: G_T is 20,000,000 and G_R is 1,000,000,000.

The PVM's own prices are not in this table. Since Graypaper 0.8.0 gas is charged per basic block, on entry, at a cost computed by a model of a CPU pipeline, and each host call has its own formula (see the PVM and host-call lessons).

## Cryptographic Sizes

Key, signature and proof sizes, as `lib/definitions.ml` types them:

```ocaml
type ed_key = Hash.t              (* Ed25519 public key: 32 bytes *)
type ed_signature = Blob64.t      (* Ed25519 signature: 64 bytes *)
type bs_key = Hash.t              (* Bandersnatch public key: 32 bytes *)
type bs_signature = Blob96.t      (* Bandersnatch signature (seal, VRF): 96 bytes *)
type ring_proof = Blob784.t       (* Bandersnatch Ring VRF proof (a ticket): 784 bytes *)
type bls_key = Blob144.t          (* BLS public key: 144 bytes *)
type ring_root = Blob144.t        (* Bandersnatch ring root: 144 bytes *)
```

A validator's key record in state is 336 bytes: Bandersnatch key (32), Ed25519 key (32), BLS key (144), metadata (128).

## Economic Constants

Services pay for the state they occupy with a minimum balance:

```ocaml
(* Deposits *)
let c_base_deposit = 100         (* B_S: every service *)
let c_item_deposit = 10          (* B_I: per storage item *)
let c_byte_deposit = 1           (* B_L: per octet of storage *)

(* Minimum balance for a service's state *)
let min_deposit ~items ~bytes : balance =
  let open Int64 in
  add (of_int Constants.c_base_deposit)
    (add
      (mul (of_int Constants.c_item_deposit) (of_int items))
      (mul (of_int Constants.c_byte_deposit) (of_int bytes)))
```

The Graypaper's full rule (eq. deposits) also subtracts the service's *gratis* allowance and floors at zero: max(0, B_S + B_I·items + B_L·octets − gratis). The host calls use that full version (`Pvm_host.service_threshold`).

## Recent History and Timeouts

How much history JAM keeps, and how long things may wait:

```ocaml
let c_recent_history_len = 8        (* H: recent blocks kept in β *)
let c_assurance_timeout = 5         (* U: slots before an unavailable report is dropped *)
let c_max_lookup_anchorage = 14_400 (* L: max age of a lookup anchor (1 day) *)
let c_expunge_period = 19_200       (* D: before an unreferenced preimage may go *)
let c_auth_pool_size = 8            (* O: authorizers per core pool *)
let c_auth_queue_size = 80          (* Q: authorizers per core queue *)
```

## Using Constants

Throughout lasair, these values are read where they are needed:

```ocaml
(* In lib/cores.ml: fixed values from the compile-time table *)
let core_count = Constants.c_core_count
let rotation_period = Constants.c_rotation_period

(* In the conformance STF (conformance/trace_runner.ml): the live spec *)
let new_epoch =
  header.slot / (Stf_config.epoch_length ())
  > prev_slot / (Stf_config.epoch_length ())
```

`Stf_config` re-exports the `Spec` accessors for the conformance code, so the same importer runs the tiny vectors, the full vectors and a node started from a chainspec.

## Type Aliases

Definitions also establishes type aliases:

```ocaml
(* Numeric types *)
type balance = int64       (* N_{2^64} *)
type gas = int64           (* N_{2^64} *)
type service_id = int32    (* N_{2^32} *)
type timeslot = int32      (* N_{2^32} *)
type pvm_reg = int64       (* a PVM register *)

(* Index types *)
type core_index = int
type validator_index = int
type epoch = int
```

Balances, gas and registers are unsigned 64-bit in the Graypaper but live in OCaml's signed `int64`. Values of 2⁶³ and above then look negative, so every comparison on them must be unsigned (`Int64.unsigned_compare`). The next lesson shows a real bug from exactly this.

## Configuration Variants

The tiny and full specs, from `lib/spec.ml`:

```ocaml
let tiny : config = {
  spec_name = "tiny";
  epoch_length = 12;
  num_cores = 2;
  epoch_tail_start = 10;
  rotation_period = 4;
  max_tickets_per_extrinsic = 3;
  preimage_expunge_period = 32;
  max_lookup_anchor_age = 24;
  block_acc_gas = 20_000_000L;
  max_refine_gas = 1_000_000_000L;
}

let full : config = {
  spec_name = "full";
  epoch_length = 600;
  num_cores = 341;
  epoch_tail_start = 500;
  rotation_period = 10;
  max_tickets_per_extrinsic = 16;
  preimage_expunge_period = 19200;
  max_lookup_anchor_age = 14400;
  block_acc_gas = 3_500_000_000L;
  max_refine_gas = 5_000_000_000L;
}

(* V as a spec quantity: the capacity 3C (tiny 6, full 1023) *)
let num_validators () = 3 * num_cores ()
```

A node started from a JIP-4 chainspec runs whatever parameters its `protocol_parameters` blob names (`Spec.set_config`).

## Exercise: Derive Values

Using the full-spec constants, calculate:

1. How many seconds in an epoch?
2. How many blocks per day, and how many validator-slots per day with a full set of 1023 validators?
3. How much refine gas can the whole system spend in one slot if every core refines one maximal package? How does that compare with the accumulation budget G_T?

```ocaml
(* Your calculations here *)
```

<details>
<summary>Click to see answers</summary>

```ocaml
(* 1. Seconds per epoch *)
let seconds_per_epoch = c_epoch_len * c_slot_seconds
(* = 600 * 6 = 3600 seconds = 1 hour *)

(* 2. Blocks (slots) per day, and validator-slots at the maximum set size *)
let slots_per_day = (24 * 60 * 60) / c_slot_seconds
(* = 86400 / 6 = 14400 slots *)
let validator_slots_per_day = slots_per_day * 1023
(* = 14400 * 1023 = 14,731,200 validator-slots *)

(* 3. Refine gas per slot across all cores *)
let refine_gas_per_slot =
  Int64.mul (Int64.of_int c_core_count) (Int64.of_int c_package_ref_gas)
(* = 341 * 5,000,000,000 = 1,705,000,000,000 gas *)
```

Refine runs off-chain, in parallel, on each core's guarantors, so ~1.7 trillion gas per slot is spread over 341 cores. Accumulation runs on-chain on every validator, so a whole block gets G_T = 3,500,000,000. The Graypaper asks that G_T be no smaller than G_A · C plus the always-accumulate budgets: 10,000,000 × 341 = 3,410,000,000 fits.

</details>

## Exercise: Add a New Constant

Imagine the Graypaper adds a new constant: `C_MAX_TRANSFERS = 16` (maximum transfers per accumulate).

1. Where would you add it: `Definitions.Constants` or `Spec`?
2. How would you name it?
3. Where would it be used?

<details>
<summary>Click to see answer</summary>

If tiny and full use the same value, it belongs in `Definitions.Constants` (and the PVM's parameter blob). If the test-vector tables give different tiny and full values, it belongs in `Spec.config` with an accessor, like `max_tickets_per_extrinsic`.

```ocaml
(* In lib/definitions.ml, near the other limits *)
let c_max_transfers = 16   (* Maximum transfers per accumulate *)

(* Used where transfers are created: the transfer host call and the
   accumulation writeback (lib/pvm_host.ml, conformance/accumulate_stf.ml) *)
let validate_transfers transfers =
  if List.length transfers > c_max_transfers then
    Error `Too_many_transfers
  else
    Ok transfers
```

</details>

## Key Takeaways

1. **Two tables** - `Spec` for values that differ between tiny and full, `Definitions.Constants` for the rest
2. **Graypaper alignment** - Names map to the constants appendix
3. **V is no longer a constant** - since GP 0.8.0 the validator set size is live state; 3C is only the capacity
4. **Helper functions** - Common calculations provided
5. **Unsigned values in signed types** - compare 64-bit protocol values unsigned

## Next Up

We've seen constants. Now let's see how data is encoded: [The JAM Codec →](lesson.html?lesson=02-lasair-core/03-serialization)
