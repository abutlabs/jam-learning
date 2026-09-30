---
title: "9.3 Account Footprint & Threshold"
duration: 8 min
video: https://www.youtube.com/watch?v=jI9k5PUGR9M
---

# Graypaper Section 9.3: Account Footprint and Threshold Balance

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM calculates the **minimum balance** a service needs based on its storage usage. This is similar to Polkadot's "existential deposit" but computed dynamically.

## What This Section Covers

- Storage footprint calculation (items and bytes)
- Threshold balance formula
- Deposit constants
- The gratis (free credit) mechanism

## The Storage Problem

Services store data on-chain. This data has real costs:
- Validators must store it
- It consumes network resources
- Without limits, spam would fill the chain

<div class="callout callout-info">

**ELI5: Rent for Storage**

Think of on-chain storage like renting a storage unit:
- **Base rent** = Just having an account costs something
- **Per-locker fee** = Each item (key) costs extra
- **Per-cubic-foot fee** = Bigger items cost more

Your minimum balance must cover your "rent" or you get evicted!

</div>

## Two Metrics: Items and Octets

JAM tracks two things about each account:

### Items (I)

```
I = 2 × len(requests) + len(storage)

Where:
  requests = Preimage request entries (hash, length → status)
  storage  = Key-value storage entries
```

Why `2×` for requests? Each request entry is counted double because it's more complex (hash + length + status tracking).

### Octets (L)

```
L = Σ (81 + preimage_length) for each request
  + Σ (34 + key_length + value_length) for each storage entry

Where:
  81 = Overhead per request entry (hash + length + status encoding)
  34 = Overhead per storage entry (32-byte key + 2-byte length prefix)
```

<div class="lasair-connection">

### In Lasair: Storage Metrics

```ocaml
(* lib/accounts.ml *)

(** Count storage items (equation from graypaper) *)
let storage_items (a : service_account) : int =
  2 * Array.length a.requests + Array.length a.storage

(** Count storage octets.
    For requests: 81 + preimage_length per entry
    For storage: 34 + key_length + value_length per entry *)
let storage_octets (a : service_account) : int64 =
  let request_octets = Array.fold_left (fun acc ((_, len), _) ->
    Int64.add acc (Int64.of_int (81 + len))
  ) 0L a.requests in
  let storage_octets = Array.fold_left (fun acc (k, v) ->
    Int64.add acc (Int64.of_int (34 + Bytes.length k + Bytes.length v))
  ) 0L a.storage in
  Int64.add request_octets storage_octets
```

</div>

## Threshold Balance Formula

The minimum balance (T) is computed as:

```
T = base + (items × item_deposit) + (octets × byte_deposit) - gratis

Where (from constants):
  base         = 100 units
  item_deposit = 10 units per item
  byte_deposit = 1 unit per byte
  gratis       = Free storage credit (from manager service)
```

<div class="lasair-connection">

### In Lasair: Threshold Calculation

```ocaml
(* lib/definitions.ml - Constants *)
let c_base_deposit = 100         (* Basic minimum balance *)
let c_item_deposit = 10          (* Per-item deposit *)
let c_byte_deposit = 1           (* Per-byte deposit *)

(* lib/accounts.ml *)

(** Compute minimum (threshold) balance.
    Account is valid only if balance >= minbalance. *)
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

## Example Calculation

Let's calculate the threshold for a service with:
- 3 preimage requests (avg 1000 bytes each)
- 5 storage entries (avg 100 bytes each)
- 0 gratis

```
Items:
  I = 2 × 3 + 5 = 11 items

Octets:
  L = 3 × (81 + 1000) + 5 × (34 + 100)
    = 3 × 1081 + 5 × 134
    = 3243 + 670
    = 3913 bytes

Threshold:
  T = 100 + (11 × 10) + (3913 × 1) - 0
    = 100 + 110 + 3913
    = 4123 units
```

This service needs at least 4123 units to stay alive!

## The Gratis Mechanism

The **gratis** field provides free storage credit:

```
gratis: balance  -- Free storage credit

Effect:
  Threshold = max(0, calculated_threshold - gratis)
```

<div class="callout callout-info">

**ELI5: The Scholarship**

Gratis is like a storage scholarship:
- Normally you pay rent based on usage
- Manager service can grant "scholarships"
- This reduces your minimum balance requirement
- System services often get gratis to operate without holding large balances

</div>

Only the **manager service** can grant gratis. This prevents abuse while allowing privileged services to subsidize important infrastructure.

## Balance Enforcement

The threshold is enforced when:
1. **Reducing balance** - Can't go below threshold
2. **Increasing storage** - Must have room for new threshold

```
Before transfer out:
  if new_balance < threshold:
    REJECT transfer

Before adding storage:
  new_threshold = calculate_threshold(new_storage)
  if balance < new_threshold:
    REJECT storage operation
```

<div class="lasair-connection">

### In Lasair: Balance Check

```ocaml
(* lib/accounts.ml *)

(** Check if account has sufficient balance *)
let has_sufficient_balance (a : service_account) : bool =
  Int64.compare a.balance (min_balance a) >= 0
```

</div>

## Visual: Threshold Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   Threshold Balance Calculation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Storage Metrics:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ requests: [R1, R2, R3]  →  Items: 2×3 = 6                  │ │
│  │ storage:  [S1, S2, S3, S4, S5]  →  Items: 5                │ │
│  │                                                            │ │
│  │ Total Items (I) = 6 + 5 = 11                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Requests: 81 + size for each                               │ │
│  │ Storage:  34 + key + value for each                        │ │
│  │                                                            │ │
│  │ Total Octets (L) = sum of all sizes                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Threshold Formula:                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  T = 100 + (I × 10) + (L × 1) - gratis                     │ │
│  │      ───   ────────   ───────   ──────                     │ │
│  │      base   items     bytes     credit                     │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Balance Requirement:                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  balance ≥ T   (always enforced)                           │ │
│  │                                                            │ │
│  │  If balance < T → account operations restricted            │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Design?

This approach has advantages:

1. **Proportional costs** - Store more, pay more
2. **No surprise evictions** - Balance checked before operations
3. **Flexibility** - Gratis allows exceptions for system services
4. **Simple formula** - Easy to compute and verify

<div class="callout callout-warning">

**Implementation Note**

As Gavin mentions: the implementation must track I and L itself. The Graypaper just defines equivalences - it doesn't tell you how to maintain these counts. Implementations typically update these values incrementally when storage changes.

</div>

## Key Takeaways

1. **Items (I)** = Count of storage entries (requests count double)
2. **Octets (L)** = Total bytes used (including overhead per entry)
3. **Threshold (T)** = base + items×10 + bytes×1 - gratis
4. **Balance must always ≥ Threshold**
5. **Gratis** = Free credit from manager service
6. **Enforcement** = Checked on balance reduction or storage increase

## Graypaper References

- Section 9.3: Account Footprint and Threshold Balance
- Equations for I and L calculation
- Threshold formula with deposit constants

## What's Next

Return to the main accounts section or explore service privileges.

[Back to 9.0 Accounts &rarr;](lesson.html?lesson=011-graypaper-lectures/32-accounts)
