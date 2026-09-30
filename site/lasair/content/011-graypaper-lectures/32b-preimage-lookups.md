---
title: "9.2 Preimage Lookups"
duration: 12 min
video: https://www.youtube.com/watch?v=4leVpNtf3iw
---

# Graypaper Section 9.2: Preimage Lookups

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This deep dive explains the **preimage lookup system** - a critical mechanism that enables parachains and other services to store large code blobs (like PVF code) that are too big for work packages but must be available for validation.

## What This Section Covers

- What preimages are and why we need them
- The historical lookup function Λ
- Availability status tracking
- Invariants and guarantees

## The Problem: Large Code Blobs

Parachains need their **Parachain Validation Function (PVF)** - megabytes of WebAssembly code - available when validating blocks. But this code is:
- Too large to include in every work package
- Needed by guarantors and auditors
- Must be available for the auditing window (~8 hours)

<div class="callout callout-info">

**ELI5: The Library Analogy**

Imagine you're taking an open-book exam:
- You can't carry the entire textbook into each exam room (too heavy)
- But you need to reference specific pages during the exam
- Solution: Store the textbook in the library with a catalog system
- The catalog tracks: "This book is available from Monday to Friday"

Preimages work the same way:
- Store large code blobs in the service account (the library)
- Work packages just reference the hash (the catalog number)
- The system tracks when each blob was available

</div>

## The Λ Function

The core of preimage lookups is the **Λ (Lambda) function**:

```
Λ(account, timeslot, hash) → blob | nothing

Where:
  account   -- The service account
  timeslot  -- A recent timeslot (within auditing window)
  hash      -- The Blake2b hash of the data we want

Returns:
  The preimage (blob) if it was available at that timeslot
  Nothing otherwise
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

## Availability Status

A preimage goes through lifecycle stages tracked by **status**:

```
Status encoding (sequence of timeslots):
  []           → Requested (not yet supplied)
  [t0]         → Available since t0
  [t0, t1]     → Was available t0-t1, now unavailable
  [t0, t1, t2] → Re-available since t2 (was available t0-t1)
```

<div class="callout callout-info">

**ELI5: Availability States**

Think of a hotel room:
- **Requested**: Guest booked, room being prepared (no one can use it yet)
- **Available [t0]**: Room ready since Monday (anyone can use from Monday onward)
- **Unavailable [t0, t1]**: Was available Mon-Fri, now closed for renovation
- **Re-available [t0, t1, t2]**: Was Mon-Fri, closed, reopened Sunday

The "re-available" state is limited to one cycle - if you want to make it unavailable again, you can't. This keeps the state bounded (max 3 timeslots).

</div>

<div class="lasair-connection">

### In Lasair: Preimage Status Type

```ocaml
(* lib/accounts.ml *)

(** Preimage availability status *)
type preimage_status =
  | Requested                          (** Requested, not yet supplied *)
  | Available of timeslot              (** Available since t0 *)
  | Unavailable of timeslot * timeslot (** Was available t0-t1, now unavailable *)
  | Reavailable of timeslot * timeslot * timeslot  (** Available again since t2 *)

(** Convert status to timeslot sequence for serialization *)
let status_to_timeslots : preimage_status -> timeslot array = function
  | Requested -> [||]
  | Available t0 -> [|t0|]
  | Unavailable (t0, t1) -> [|t0; t1|]
  | Reavailable (t0, t1, t2) -> [|t0; t1; t2|]

(** Convert timeslot sequence to status *)
let timeslots_to_status (ts : timeslot array) : preimage_status option =
  match Array.length ts with
  | 0 -> Some Requested
  | 1 -> Some (Available ts.(0))
  | 2 -> Some (Unavailable (ts.(0), ts.(1)))
  | 3 -> Some (Reavailable (ts.(0), ts.(1), ts.(2)))
  | _ -> None
```

</div>

## The I(l, t) Helper

To check if a preimage was available at a specific timeslot, we use the **I helper**:

```
I(status, t) → true/false

Rules:
  Requested         → false (never available)
  Available(t0)     → t >= t0
  Unavailable(t0,t1) → t0 <= t < t1
  Reavailable(t0,t1,t2) → (t0 <= t < t1) OR (t >= t2)
```

<div class="lasair-connection">

### In Lasair: Availability Check

```ocaml
(* lib/accounts.ml *)

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

## Visual: Availability Timeline

```
Timeline:     slot 100    slot 200    slot 300    slot 400
                |           |           |           |
                v           v           v           v

Requested:    ─────────────────────────────────────────────
              (never available)

Available(100):
              ──────[████████████████████████████████████──
                    ^
                    available from here onward

Unavailable(100, 300):
              ──────[████████████████]─────────────────────
                    ^                ^
                    available        unavailable

Reavailable(100, 200, 350):
              ──────[████]──────────────────────[███████───
                    ^    ^                      ^
                 avail  unavail              re-avail
```

## The Request Manifest

Each service maintains a **request manifest** - a dictionary mapping `(hash, length)` to status:

```
requests: ((hash, length), status) dict

Why include length?
  - Hash alone could have collisions (unlikely but possible)
  - Length acts as additional verification
  - Prevents accidentally getting wrong-sized data
```

<div class="lasair-connection">

### In Lasair: Service Account with Requests

```ocaml
(* lib/accounts.ml *)

type service_account = {
  storage: (bytes * bytes) seq;       (** Arbitrary key→value storage *)
  preimages: (hash * bytes) seq;      (** Hash→preimage lookup *)
  requests: ((hash * int) * preimage_status) seq;  (** (hash, len)→status *)
  (* ... other fields ... *)
}
```

</div>

## Invariants

The preimage system maintains strict invariants:

```
For all accounts a:
  For all (h, blob) in a.preimages:
    1. H(blob) = h                     (hash is correct)
    2. (h, len(blob)) ∈ keys(a.requests)  (request exists)
```

<div class="callout callout-warning">

**Invariant Intuition**

These invariants ensure:
1. You can't store garbage under a hash - the hash must match
2. You can't have preimages without a corresponding request (and payment)

The converse is allowed: you can have a request without a preimage yet (the "Requested" state).

</div>

## Workflow: Adding a Preimage

```
Step 1: Request
  - Service calls host function to request preimage (solicit)
  - Creates entry in requests: ((hash, len), Requested)
  - Pays deposit for storage
  - len must be a blob length (< 2^32), else the call returns HUH

Step 2: Supply
  - Someone (guarantor, user) supplies the actual blob
  - System verifies H(blob) = hash and len(blob) = expected
  - Adds to preimages dictionary
  - Updates status: Requested → Available(current_timeslot)

Step 3: Use
  - Work packages can now use Λ to look up the preimage
  - Auditors can verify against historical timeslot

Step 4: Forget (optional)
  - Service marks preimage as unavailable (forget)
  - Status: Available(t0) → Unavailable(t0, current_timeslot)
  - Blob stays for auditing window, then can be removed
```

<div class="callout callout-warning">

**Changed in GP 0.8.0:** the preimage host calls `query`, `solicit`, `forget` and `provide` now check the length argument first: if z is not a blob length (z ≥ 2^32) they return `HUH` instead of touching memory or state (`pvm_invocations.tex`, appendix B.7). With the 0.8.0 renumbering they are host calls 23, 24, 25 and 27.

</div>

## Why Historical Lookup Matters

The key insight is that **auditing happens later**:

```
Block 1000: Work package runs, uses preimage P
Block 1010: Auditor checks the work report
  - Auditor calls Λ(account, 1000, hash)
  - Must get same result as original execution
  - Even if preimage became unavailable at block 1005!
```

This is why we track availability windows, not just current state.

<div class="lasair-connection">

### In Lasair: Why Historical Matters

```ocaml
(* The historical_lookup function is called during auditing:

   When an auditor validates a work report from timeslot T:
   - They need the same preimages that were available at T
   - Current availability doesn't matter
   - Only the historical status at time T

   This enables deterministic auditing without consensus
   on current chain state. *)
```

</div>

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Preimage Lookup System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Service Account                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ preimages: hash → blob                                     │ │
│  │ ┌──────────┬─────────────────────────────────────────────┐ │ │
│  │ │  H(pvf)  │  <megabytes of PVF code>                    │ │ │
│  │ │  H(data) │  <other data blob>                          │ │ │
│  │ └──────────┴─────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │ requests: (hash, len) → status                             │ │
│  │ ┌───────────────────┬────────────────────────────────────┐ │ │
│  │ │ (H(pvf), 2MB)     │ Available(100)                     │ │ │
│  │ │ (H(data), 1KB)    │ Unavailable(50, 200)               │ │ │
│  │ │ (H(new), 500B)    │ Requested                          │ │ │
│  │ └───────────────────┴────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Lookup: Λ(account, timeslot, hash)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Find preimage by hash                                   │ │
│  │ 2. Find request by (hash, length)                          │ │
│  │ 3. Check was_available_at(status, timeslot)                │ │
│  │ 4. Return blob if available, None otherwise                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Preimages** - Large blobs stored by hash, retrieved via Λ function
2. **Historical lookup** - Returns data available at a past timeslot (for auditing)
3. **Status tracking** - Up to 3 timeslots encode full availability history
4. **Bounded state** - Re-availability is one-shot; can't toggle indefinitely
5. **Invariants** - Hash correctness and request existence are guaranteed

## Graypaper References

- Section 9.2: Preimage Lookups
- Section 9.2, eq. `historicallookup`: Λ and the I(l, t) availability check
- Section 9.2.1: Invariants on preimage state (eq. `preimageconstraints`)

## Deep Dives

Want more detail? Explore:

- [9.3 Account Footprint](lesson.html?lesson=011-graypaper-lectures/32e-account-footprint) - What each request and preimage costs in threshold balance

## What's Next

Return to the main accounts section or continue with service privileges.

[Back to 9.0 Accounts &rarr;](lesson.html?lesson=011-graypaper-lectures/32-accounts)
