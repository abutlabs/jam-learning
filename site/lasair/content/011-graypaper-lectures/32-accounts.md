---
title: "9.0 Service Accounts"
duration: 20 min
video: https://www.youtube.com/watch?v=JGeKdpYEZs4
---

# Graypaper Section 9: Service Accounts

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM manages service accounts - the fundamental units that hold code, storage, and balance. Unlike Ethereum smart contracts, JAM services split their code into two isolated entry points.

## What This Section Covers

- Service account structure
- Code and entry points (Refine vs Accumulate)
- Storage and preimage lookups
- Balance and storage deposits
- Service privileges

## Service Accounts Overview

A **service account** in JAM is analogous to a smart contract in Ethereum, but with key differences:

```
Service Account contains:
  storage      -- Arbitrary key→value (on-chain only)
  preimages    -- Hash→blob lookup (available in-core too)
  requests     -- Preimage request tracking
  codehash     -- Hash of (metadata, code) blob
  balance      -- Token balance
  min_acc_gas  -- Min gas per work-item for accumulate
  min_memo_gas -- Min gas per deferred-transfer
  created      -- Creation timeslot
  last_acc     -- Last accumulation timeslot
  parent       -- Parent service that created this
```

<div class="callout callout-info">

**ELI5: Service Accounts**

Think of a service account like a business:
- **Storage** = Filing cabinets (internal records)
- **Preimages** = Published documents (anyone can request copies)
- **Code** = Business procedures (how to process requests)
- **Balance** = Bank account (pays for operations)
- **Parent** = The company that founded this business

</div>

## The Two Entry Points

JAM code has **two separate entry points** with different environments:

| Entry Point | Index | Where | State Access | Throughput |
|-------------|-------|-------|--------------|------------|
| **Refine** | 0 | In-core | Read-only preimages | ~300x |
| **Accumulate** | 1 | On-chain | Full read/write | 1x |

<div class="lasair-connection">

### In Lasair: Entry Points

```ocaml
(* lib/accounts.ml *)

(** Entry point identifiers *)
type entry_point =
  | Refine      (** 0: In-core, stateless refinement *)
  | Accumulate  (** 1: On-chain, stateful accumulation *)

let entry_point_index : entry_point -> int = function
  | Refine -> 0
  | Accumulate -> 1
```

</div>

<div class="callout callout-info">

**ELI5: Refine vs Accumulate**

Imagine processing tax returns:
- **Refine** = Calculator work (anyone can verify, no permanent records)
- **Accumulate** = Filing with the IRS (official records updated)

Refine can run on many machines in parallel (fast!), while Accumulate must run on the main chain (slow but authoritative).

</div>

## Service Account Structure

<div class="lasair-connection">

### In Lasair: Account Type

```ocaml
(* lib/accounts.ml *)

type service_account = {
  storage: (bytes * bytes) seq;       (** Arbitrary key→value storage *)
  preimages: (hash * bytes) seq;      (** Hash→preimage lookup *)
  requests: ((hash * int) * preimage_status) seq;  (** (hash, len)→status *)
  gratis: balance;                    (** Free storage credit *)
  codehash: hash;                     (** Hash of (metadata, code) blob *)
  balance: balance;                   (** Token balance *)
  min_acc_gas: gas;                   (** Min gas per work-item for accumulate *)
  min_memo_gas: gas;                  (** Min gas per deferred-transfer *)
  created: timeslot;                  (** Creation timeslot *)
  last_acc: timeslot;                 (** Most recent accumulation *)
  parent: service_id;                 (** Parent service that created this *)
}
```

</div>

## Preimage Lookups

Preimages are special - they're available both on-chain AND in-core:

```
Preimage vs Storage:
┌─────────────────────────┬───────────────┬───────────────┐
│                         │ Storage       │ Preimages     │
├─────────────────────────┼───────────────┼───────────────┤
│ Key type                │ Arbitrary     │ Hash only     │
│ Data source             │ Accumulation  │ Extrinsic     │
│ In-core access          │ No            │ Yes           │
│ Removal                 │ Immediate     │ Delayed       │
│ Historical tracking     │ No            │ Yes           │
└─────────────────────────┴───────────────┴───────────────┘
```

### Preimage Status

Preimages track their availability history for auditing:

```
Status encodings:
  []           -- Requested but not yet supplied
  [t0]         -- Available since t0
  [t0, t1]     -- Was available t0-t1, now unavailable
  [t0, t1, t2] -- Available again since t2
```

<div class="lasair-connection">

### In Lasair: Preimage Status

```ocaml
(* lib/accounts.ml *)

(** Preimage availability status *)
type preimage_status =
  | Requested                          (** Requested, not yet supplied *)
  | Available of timeslot              (** Available since t0 *)
  | Unavailable of timeslot * timeslot (** Was available t0-t1, now unavailable *)
  | Reavailable of timeslot * timeslot * timeslot  (** Available again since t2 *)

(** Check if preimage was available at given timeslot.
    Implements the I(l, t) helper from graypaper equation 127. *)
let was_available_at (status : preimage_status) (t : timeslot) : bool =
  match status with
  | Requested -> false
  | Available t0 -> Int32.compare t0 t <= 0
  | Unavailable (t0, t1) -> Int32.compare t0 t <= 0 && Int32.compare t t1 < 0
  | Reavailable (t0, t1, t2) ->
    (Int32.compare t0 t <= 0 && Int32.compare t t1 < 0) ||
    Int32.compare t2 t <= 0
```

</div>

<div class="callout callout-info">

**ELI5: Why Track Preimage History?**

For auditing! If someone claims "I couldn't look up this data," we need to prove whether the data was actually available at that time.

It's like keeping library checkout records - we can prove exactly when a book was on the shelf vs checked out.

</div>

## Storage Deposits

Accounts must maintain a minimum balance based on storage usage:

```
minbalance = base + items×itemDeposit + octets×byteDeposit - gratis

Where:
  items  = 2×len(requests) + len(storage)
  octets = sum of all stored data sizes
  gratis = free storage credit (from privileged service)
```

<div class="lasair-connection">

### In Lasair: Balance Calculation

```ocaml
(* lib/accounts.ml *)

(** Count storage items *)
let storage_items (a : service_account) : int =
  2 * Array.length a.requests + Array.length a.storage

(** Count storage octets *)
let storage_octets (a : service_account) : int64 =
  let request_octets = Array.fold_left (fun acc ((_, len), _) ->
    Int64.add acc (Int64.of_int (81 + len))
  ) 0L a.requests in
  let storage_octets = Array.fold_left (fun acc (k, v) ->
    Int64.add acc (Int64.of_int (34 + Bytes.length k + Bytes.length v))
  ) 0L a.storage in
  Int64.add request_octets storage_octets

(** Compute minimum balance *)
let min_balance (a : service_account) : balance =
  let items = Int64.of_int (storage_items a) in
  let octets = storage_octets a in
  let base = Int64.of_int Constants.c_base_deposit in
  let item_cost = Int64.mul (Int64.of_int Constants.c_item_deposit) items in
  let byte_cost = Int64.mul (Int64.of_int Constants.c_byte_deposit) octets in
  let total = Int64.add base (Int64.add item_cost byte_cost) in
  let result = Int64.sub total a.gratis in
  if Int64.compare result 0L < 0 then 0L else result
```

</div>

## Historical Lookup

The Λ (Lambda) function enables deterministic auditing:

```
Λ(account, timeslot, hash) → preimage | None

Returns the preimage ONLY if it was available at that timeslot.
```

<div class="lasair-connection">

### In Lasair: Historical Lookup

```ocaml
(* lib/accounts.ml *)

(** Historical preimage lookup.
    Returns the preimage if it was available at the given timeslot. *)
let historical_lookup (a : service_account) (t : timeslot) (h : hash)
    : bytes option =
  (* First find the preimage by hash *)
  match Array.find_opt (fun (ph, _) ->
    Bytes.equal (Hash.to_bytes ph) (Hash.to_bytes h)
  ) a.preimages with
  | None -> None
  | Some (_, blob) ->
    (* Check if it was available at time t *)
    let len = Bytes.length blob in
    match Array.find_opt (fun ((rh, rlen), _) ->
      Bytes.equal (Hash.to_bytes rh) (Hash.to_bytes h) && rlen = len
    ) a.requests with
    | None -> None
    | Some (_, status) ->
      if was_available_at status t then Some blob else None
```

</div>

## Service Privileges

Special services have elevated capabilities:

| Privilege | Role |
|-----------|------|
| **Manager** | Can alter privileges and grant storage credits |
| **Delegator** | Can set the staging validator set |
| **Registrar** | Can create services in protected index range |
| **Assigners** | Per-core, can modify authorizer queues |
| **Always Accers** | Auto-accumulate each block with specified gas |

<div class="lasair-connection">

### In Lasair: Privileges

```ocaml
(* lib/accounts.ml *)

type privileges = {
  manager: service_id;      (** Can modify privileges *)
  delegator: service_id;    (** Can set staging set *)
  registrar: service_id;    (** Can create protected services *)
  assigners: service_id seq;  (** One per core, modifies auth queue *)
  always_accers: (service_id * gas) seq;  (** Auto-accumulate services *)
}

(** Check if a service has manager privilege *)
let is_manager (priv : privileges) (s : service_id) : bool =
  Int32.equal priv.manager s

(** Check if a service can assign authorizers for a core *)
let can_assign_core (priv : privileges) (s : service_id) (core : int) : bool =
  core >= 0 && core < Array.length priv.assigners &&
  Int32.equal priv.assigners.(core) s
```

</div>

## Summary Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      Service Account                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Code (via codehash → preimage)                             │  │
│  │ ┌─────────────────────────────────────────────────────────┐│  │
│  │ │  Entry 0: Refine (in-core, stateless, ~300x)           ││  │
│  │ │  Entry 1: Accumulate (on-chain, stateful, 1x)          ││  │
│  │ └─────────────────────────────────────────────────────────┘│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Storage              │  │ Preimages            │             │
│  │ key → value          │  │ hash → blob          │             │
│  │ (on-chain only)      │  │ (on-chain + in-core) │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Balance              │  │ Requests             │             │
│  │ tokens held          │  │ (hash,len) → status  │             │
│  │ must ≥ min_balance   │  │ tracks availability  │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  Metadata: created, last_acc, parent, min_acc_gas, min_memo_gas │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Two Entry Points** - Refine (in-core, fast) and Accumulate (on-chain, authoritative)
2. **Preimages** - Hash-addressed data available both in-core and on-chain
3. **Historical Tracking** - Preimage availability tracked for deterministic auditing
4. **Storage Deposits** - Minimum balance based on storage usage
5. **Privileges** - Special services control core assignment, validator sets, etc.

## Graypaper References

- Section 9: Service Accounts (`accounts.tex`, eq. `serviceaccount`)
- Section 9.2, eq. `historicallookup`: historical lookup function Λ and its helper I(l, t)
- Section 9.2: Preimage lookups and availability

## Deep Dives

Want more detail? Explore:

- [9.1 Code and Gas](lesson.html?lesson=011-graypaper-lectures/32d-code-and-gas) - Entry points, code storage, and gas limits
- [9.2 Preimage Lookups](lesson.html?lesson=011-graypaper-lectures/32b-preimage-lookups) - How preimage lookup and availability tracking works
- [9.3 Account Footprint](lesson.html?lesson=011-graypaper-lectures/32e-account-footprint) - Storage metrics and threshold balance
- [9.4 Service Privileges](lesson.html?lesson=011-graypaper-lectures/32c-service-privileges) - Manager, delegator, registrar, and assigners

## What's Next

Continue with **Section 10: Judgments** to understand how JAM handles disputes and slashing.

[Next: 10 Judgments &rarr;](lesson.html?lesson=011-graypaper-lectures/33-judgments)
