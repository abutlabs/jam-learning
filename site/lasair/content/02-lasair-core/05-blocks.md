---
title: Headers and Blocks
duration: 25 min
---

# Headers and Blocks

Blocks are the heartbeat of JAM. Every 6 seconds, a new block extends the chain. Understanding block structure is essential for implementing the protocol.

The layouts below are the Graypaper 0.8.0 ones (header chapter 5 and the serialization appendix). The validation code in this lesson is a teaching sketch; the next track's [Block Import Pipeline](lesson.html?lesson=03-mastery/03-block-import) shows how lasair really does it.

## Block Anatomy

A JAM block has two parts:

```
┌─────────────────────────────────────────────────────────────┐
│                         BLOCK                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HEADER (variable size, in this order)                      │
│  ├── parent            : hash (32 bytes)          H_p       │
│  ├── parent_state_root : hash (32 bytes)          H_r       │
│  ├── extrinsic_hash    : hash (32 bytes)          H_x       │
│  ├── slot              : u32 (4 bytes)            H_t       │
│  ├── epoch_mark        : option (variable)        H_e       │
│  ├── tickets_mark      : option (E × 33 bytes)    H_w       │
│  ├── author_index      : u16 (2 bytes)            H_i       │
│  ├── entropy_source    : VRF signature (96 bytes) H_v       │
│  ├── offenders_mark    : list of Ed25519 keys     H_o       │
│  └── seal              : signature (96 bytes)     H_s       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  EXTRINSIC (variable size)                                  │
│  ├── tickets          : list of (entry index, ring proof)   │
│  ├── preimages        : list of (service, blob)             │
│  ├── guarantees       : list of guarantee                   │
│  ├── assurances       : list of assurance                   │
│  └── disputes         : verdicts, culprits, faults          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## In Lasair: Block Types

From `conformance/trace_types.ml`, the types the importer and the fuzz target decode into (abridged):

```ocaml
type trace_header = {
  parent : bytes;                     (* 32 *)
  parent_state_root : bytes;          (* 32 *)
  extrinsic_hash : bytes;             (* 32 *)
  slot : int;
  epoch_mark : trace_epoch_mark option;
  tickets_mark : header_ticket list option;
  author_index : int;
  entropy_source : bytes;             (* 96: Bandersnatch VRF signature *)
  offenders_mark : bytes list;        (* Ed25519 keys *)
  seal : bytes;                       (* 96: Bandersnatch signature *)
}

type trace_block = {
  header : trace_header;
  extrinsic : trace_extrinsic;
}
```

## Header Fields Explained

### parent

The hash of the previous block's header:

```ocaml
let parent_hash parent_header =
  blake2b_256 (encode_header parent_header)

let validate_parent ~parent_header block =
  if block.header.parent = parent_hash parent_header then
    Ok ()
  else
    Error `Invalid_parent
```

### parent_state_root

The Merkle root of the state *after the parent block*, which is the state this block is applied to:

```ocaml
let validate_state_root ~pre_state block =
  if block.header.parent_state_root = State_db.root pre_state then
    Ok ()
  else
    Error `Bad_parent_state_root
```

A block therefore never commits to its *own* result. That arrives one block later, in its child's header.

### extrinsic_hash

A commitment to the extrinsic. It is not a plain hash of the encoded extrinsic: each of the five parts is hashed separately and the hashes are combined, so one part can be proven without the others. Guarantees are committed by their work-report hash, and since Graypaper 0.8.0 preimages are committed item by item, as (service index, Blake2b(data)) pairs, so a single report or preimage can be proven included without its data:

```ocaml
let validate_extrinsic_hash block =
  if block.header.extrinsic_hash = compute_extrinsic_hash block.extrinsic then
    Ok ()
  else
    Error `Bad_extrinsic_hash
```

### slot

The time slot when this block was produced. It must be later than the parent's, and not in the future:

```ocaml
let validate_slot ~parent_slot block =
  if block.header.slot > parent_slot then
    Ok ()
  else
    Error `Bad_slot
```

### epoch_mark

Present only in the first block of a new epoch. It announces the next epoch's randomness and the keys of the validators who will be active in it:

```ocaml
type trace_epoch_mark = {
  entropy : bytes;                  (* η₀: the entropy accumulator *)
  tickets_entropy : bytes;          (* η₁ *)
  validators : trace_validator list;  (* (Bandersnatch, Ed25519) for each
                                         validator of the next epoch *)
}
```

Since Graypaper 0.8.0 the validator list's length is not fixed (sets can change size at an epoch boundary), so it is encoded with a length prefix.

### tickets_mark

Present only in the first block after ticket submission closes, and only if the ticket accumulator is full: the E winning tickets (each a 32-byte ticket id plus a one-byte entry index) that will seal the next epoch's slots.

### author_index and seal

The author is identified by an index into the posterior active validator set, H_i ∈ ℕ_|κ′|. The seal is a Bandersnatch signature by that validator over the unsigned header:

```ocaml
let validate_seal ~post_state block =
  (* Ticket mode: the slot belongs to a ticket, and the seal must be a
     signature under the ticket's context by the author's key.
     Fallback mode: the slot's sealer key (γ_s′[slot]) must be the
     author's own key. *)
  let author_key = active_set post_state block.header.author_index in
  let context = seal_context post_state block.header.slot in
  if bandersnatch_verify author_key context
       (encode_unsigned_header block.header) block.header.seal then
    Ok ()
  else
    Error `Bad_seal
```

### entropy_source

A second Bandersnatch VRF signature (96 bytes) by the author, whose output feeds the entropy accumulator η₀. It is a signature, not a hash: anyone can verify that the author produced it, and the author cannot choose its value.

### offenders_mark

The Ed25519 keys of validators newly found misbehaving by this block's disputes (the culprits and faults). It must match the disputes extrinsic exactly.

## Extrinsic Types

### Tickets

Lottery entries for the next epoch's block production:

```ocaml
type ticket = {
  entry_index : int;          (* < n = ceil(2E / |γ_P′|) *)
  proof : ring_proof;         (* 784-byte Bandersnatch Ring VRF proof *)
}
```

The ring proof shows the ticket came from *some* validator of the next epoch's ring (the root γ_Z) without revealing which. Its VRF output is the ticket id. In Graypaper 0.8.0 the number of entries each validator may submit is n = ⌈2E / |γ_P′|⌉ (on the full spec with 1023 validators, 2; on tiny, 4). At most K tickets per block, and none once slot Y of the epoch has passed.

### Preimages

Data blobs made available on-chain:

```ocaml
type preimage = {
  requester : service_id;
  blob : bytes;
}
```

A preimage is accepted only if the service has an open request for exactly that hash and length. The list must be sorted and free of duplicates.

### Guarantees

Attestations of completed work:

```ocaml
type guarantee = {
  report : work_report;
  slot : int;                          (* when it was signed *)
  credentials : (int * bytes) list;    (* 2 or 3 (validator index, Ed25519 signature) *)
}
```

A guarantee needs **two or three** signatures from validators assigned to the report's core, in the current or the previous rotation. The report carries its package's availability spec (including, since 0.8.0, the number of erasure shards it was coded for), its refinement context and one digest per work item.

### Assurances

Data availability confirmations:

```ocaml
type assurance = {
  anchor : bytes;          (* must be the parent block's hash *)
  bitfield : bytes;        (* one bit per core, LSB first *)
  validator_index : int;
  signature : bytes;       (* Ed25519 *)
}
```

When more than two-thirds of the validators (⌊2|κ|/3⌋ + 1) have set a core's bit, the report on that core becomes available and moves on to accumulation.

### Disputes

Judgments on work reports, in three lists:

```ocaml
type disputes = {
  verdicts : verdict list;   (* report hash, epoch, ⌊2|k|/3⌋+1 judgments *)
  culprits : culprit list;   (* guarantors of a report judged bad *)
  faults : fault list;       (* auditors who voted against the verdict *)
}
```

A verdict carries a supermajority of signed judgments from the current or the previous validator set. The tally sorts the report into good, bad or wonky. A bad or wonky report is removed from its core, and the Ed25519 keys of culprits and faults join the offenders set, which is also why they appear in the header's offenders mark.

## Block Production

When a validator holds a slot (by ticket, or by the fallback key sequence), it builds a block (a sketch):

```ocaml
let produce_block state slot =
  let extrinsic = {
    tickets = collect_pending_tickets state;
    preimages = collect_solicited_preimages state;
    guarantees = collect_pending_guarantees state;
    assurances = collect_assurances state;       (* signed by the validators, not by us *)
    disputes = collect_pending_disputes state;
  } in

  let header = {
    parent = parent_hash state.best_header;
    parent_state_root = State_db.root state.db;
    extrinsic_hash = compute_extrinsic_hash extrinsic;
    slot;
    epoch_mark = if first_block_of_epoch state slot then Some (make_epoch_mark state) else None;
    tickets_mark = make_tickets_mark state slot;
    author_index = state.my_validator_index;
    entropy_source = vrf_sign state.my_key (entropy_context state);
    offenders_mark = new_offenders extrinsic.disputes;
    seal = Bytes.empty;  (* Filled last *)
  } in

  (* The seal signs everything above *)
  let seal = seal_sign state.my_key (seal_context state slot) (encode_unsigned_header header) in
  { header = { header with seal }; extrinsic }
```

Lasair's real authoring code lives in `conformance/authoring.ml` and `jamnp/chain.ml`, and every block it authors is re-imported through its own importer before it is trusted.

## Block Import

When receiving a block, validate everything (a sketch, in the order the checks are listed above):

```ocaml
let import_block ~parent_header ~pre_state block =
  let ( let* ) = Result.bind in

  (* Header validation *)
  let* () = validate_parent ~parent_header block in
  let* () = validate_slot ~parent_slot:parent_header.slot block in
  let* () = validate_state_root ~pre_state block in
  let* () = validate_extrinsic_hash block in
  let* () = validate_seal ~post_state:(safrole_step pre_state block) block in

  (* The state transition: every part reads and writes state
     in the order the Graypaper's dependencies allow *)
  apply_state_transition pre_state block
```

If anything fails, the block is rejected as a whole and the state does not change. There is no partial import.

## Block Serialization

Blocks are encoded using the JAM codec. The header, in field order (see the previous lesson for lasair's real encoder):

```ocaml
let encode_header h =
  Bytes.concat Bytes.empty [
    h.parent;                            (* 32 bytes *)
    h.parent_state_root;                 (* 32 bytes *)
    h.extrinsic_hash;                    (* 32 bytes *)
    encode_u32_le h.slot;                (* 4 bytes *)
    encode_option encode_epoch_mark h.epoch_mark;    (* validators length-prefixed *)
    encode_option encode_tickets_mark h.tickets_mark;  (* E tickets, no prefix *)
    encode_u16_le h.author_index;        (* 2 bytes *)
    h.entropy_source;                    (* 96 bytes *)
    encode_seq (fun k -> k) h.offenders_mark;   (* length-prefixed 32-byte keys *)
    h.seal;                              (* 96 bytes *)
  ]

let header_hash h =
  blake2b_256 (encode_header h)
```

## Exercise: Block Validation Order

An importer might validate in this order:

1. Parent hash
2. Slot number
3. Parent state root
4. Extrinsic hash
5. Seal

Why is this a sensible order? What would go wrong if it changed?

<details>
<summary>Click to see answer</summary>

```
The order matters for efficiency and security:

1. PARENT HASH first
   - Cheapest check (just compare 32 bytes)
   - Rejects orphan blocks immediately
   - No point validating a block we can't connect

2. SLOT NUMBER second
   - Also cheap (compare integers)
   - Rejects stale or future blocks

3. PARENT STATE ROOT third
   - Cheap if you kept the parent's posterior root, which an importer does
   - If it doesn't match, the block was built on a state we don't have

4. EXTRINSIC HASH fourth
   - Verifies body matches header
   - Must check before processing body
   - Prevents body substitution attacks

5. SEAL last among these
   - Most expensive (Bandersnatch verification)
   - Only worth checking if everything else passed
   - Proves the block author had the right to produce

If we checked the seal first:
   - We'd waste CPU on cryptography for invalid blocks
   - An attacker could make us verify signatures on garbage

Whatever the order, the result must be the same: any failure
rejects the whole block, and the state is untouched.
```

</details>

## Exercise: Decode a Block Header

Given this hex-encoded header (hashes and signatures shortened), decode it:

```
0x1234...5678  (32 bytes - parent)
0xabcd...ef01  (32 bytes - parent state root)
0x9876...5432  (32 bytes - extrinsic hash)
0x2a000000     (4 bytes - slot, little-endian)
0x00           (1 byte - no epoch mark)
0x00           (1 byte - no tickets mark)
0x0500         (2 bytes - author index, little-endian)
0x7f3c...      (96 bytes - entropy source)
0x00           (1 byte - offenders mark: length 0)
0x8e21...      (96 bytes - seal)
```

What is the slot number and author index? How many bytes is the whole header?

<details>
<summary>Click to see answer</summary>

```ocaml
(* Slot: 0x2a000000 in little-endian *)
let slot_bytes = [| 0x2a; 0x00; 0x00; 0x00 |]
let slot = 0x0000002a = 42

(* Author index: 0x0500 in little-endian *)
let author_bytes = [| 0x05; 0x00 |]
let author_index = 0x0005 = 5

(* Answer: slot = 42, author_index = 5 *)
(* Size: 32 + 32 + 32 + 4 + 1 + 1 + 2 + 96 + 1 + 96 = 297 bytes *)
```

</details>

## Key Takeaways

1. **Header + Extrinsic** - Two-part structure
2. **Parent chaining** - Each block references the previous
3. **State commitment** - H_r pins the state the block was built on
4. **Seal** - Cryptographic proof of authorship, by ticket or fallback key
5. **Extrinsic types** - Tickets, preimages, guarantees, assurances, disputes
6. **All or nothing** - A block that fails any check changes nothing

## Track Complete!

You now understand lasair's core modules:
- Notation and type building blocks
- Protocol constants in Definitions and Spec
- The JAM codec
- Merkle trees and state commitment
- Block structure and validation

Ready for the advanced topics? [PVM Architecture →](lesson.html?lesson=03-mastery/01-pvm-architecture)
