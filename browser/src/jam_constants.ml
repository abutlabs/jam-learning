(* JAM Protocol Constants

   These constants define the fundamental parameters of the JAM protocol.
   They come directly from the Graypaper specification.

   In lasair, these live in lib/definitions.ml
*)

(** Number of cores in the JAM network.
    Each core can process work packages in parallel. *)
let c_core_count = 341

(** Number of validators in the network.
    Validators participate in consensus and block production. *)
let c_validator_count = 1023

(** Number of slots in an epoch.
    An epoch is the fundamental time unit for validator rotation. *)
let c_epoch_length = 600

(** Duration of each slot in seconds. *)
let c_seconds_per_slot = 6

(** Maximum size of a work package in bytes. *)
let c_max_work_package_size = 12 * 1024 * 1024  (* 12 MB *)

(** Size of a memory page in the PVM (bytes). *)
let c_page_size = 4096

(** Size of a hash output (bytes).
    JAM uses Blake2b-256. *)
let c_hash_size = 32

(* ============================================
   Derived Calculations

   These functions compute useful values from
   the base constants.
   ============================================ *)

(** Calculate which epoch a given slot belongs to.

    Example:
      epoch_of_slot 0 = 0      (slot 0 is in epoch 0)
      epoch_of_slot 599 = 0    (slot 599 is still epoch 0)
      epoch_of_slot 600 = 1    (slot 600 starts epoch 1)
*)
let epoch_of_slot slot =
  slot / c_epoch_length

(** Calculate the first slot of a given epoch.

    Example:
      first_slot_of_epoch 0 = 0
      first_slot_of_epoch 1 = 600
      first_slot_of_epoch 5 = 3000
*)
let first_slot_of_epoch epoch =
  epoch * c_epoch_length

(** Check if a slot is an epoch boundary (first slot of an epoch).

    Epoch boundaries are important because:
    - Validator sets rotate
    - Entropy is refreshed
    - Statistics are reset
*)
let is_epoch_boundary slot =
  slot mod c_epoch_length = 0

(** Calculate how many complete epochs fit in a duration (seconds). *)
let epochs_in_seconds seconds =
  let slots = seconds / c_seconds_per_slot in
  slots / c_epoch_length

(** Calculate timestamp from slot number (seconds since genesis). *)
let timestamp_of_slot slot =
  slot * c_seconds_per_slot

(** Number of slots per day. *)
let slots_per_day =
  (24 * 60 * 60) / c_seconds_per_slot  (* 14,400 *)

(** Number of epochs per day. *)
let epochs_per_day =
  slots_per_day / c_epoch_length  (* 24 *)

(* ============================================
   Validator Calculations
   ============================================ *)

(** Validators per core (approximate).
    Not all validators work on every core. *)
let validators_per_core =
  c_validator_count / c_core_count

(** Total validator-slots in an epoch.
    Each validator has one slot per epoch to potentially author a block. *)
let validator_slots_per_epoch =
  c_validator_count * c_epoch_length

(* ============================================
   Interactive Examples

   Try these in the REPL:

   > epoch_of_slot 1234;;
   > is_epoch_boundary 600;;
   > epochs_in_seconds 86400;;  (* one day *)
   > timestamp_of_slot 100;;
   ============================================ *)
