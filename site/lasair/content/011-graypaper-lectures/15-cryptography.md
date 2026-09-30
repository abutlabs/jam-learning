---
title: "3.8 Cryptography"
duration: 3 min
video: https://www.youtube.com/watch?v=2IzvXCE0G5w
---

# Graypaper Section 3.8: Cryptography

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section defines the cryptographic primitives used throughout JAM - hashing, signing, and encoding functions that secure the protocol.

## What This Lecture Covers

- Hash functions (Blake2b, Keccak)
- Signature schemes (Ed25519, BLS, Bandersnatch)
- Ring VRFs and anonymous signing
- Serialization encoding

## Hash Functions

JAM uses **Blake2b** as its primary hash function:

```
ℋ(x) = Blake2b-256(x)

Result: 32-byte hash value (ℍ type)
```

**Keccak-256** is used only for BEEFY (Ethereum compatibility):

```
ℋ_K(x) = Keccak-256(x)
```

<div class="callout callout-info">

**ELI5: Hash Functions**

A hash function is like a fingerprint machine:
- Put in any data (a document, image, number)
- Get out a fixed-size "fingerprint" (32 bytes)
- Same input always gives same fingerprint
- Can't reverse it to get the original data
- Even tiny changes to input completely change the fingerprint

</div>

### Truncated Hashes

Sometimes we only need part of a hash:

```
ℋ_n(x) = first n bytes of ℋ(x)

ℋ₄(data) = 4-byte hash (for compact identifiers)
```

<div class="lasair-connection">

### In Lasair: Hash Types

```ocaml
(* lib/notation.ml - Hash type definition *)

(** ℍ - 256-bit hash = 𝔹₃₂ *)
module Hash = Blob_fixed(struct let size = 32 end)
type hash = Hash.t

(* Hash computation: lasair's is Utilities.blake2b_256 in lib/utilities.ml,
   (bytes -> bytes). Sketched as an external binding: *)
external blake2b_256 : bytes -> hash = "blake2b_256_stub"

(* Truncated hash: ℋ_n *)
let hash_truncate (n : int) (h : hash) : bytes =
  Bytes.sub (Hash.to_bytes h) 0 n
```

</div>

## Serialization Encoding

The encoder function converts structured data to bytes:

```
ℰ(x) = JAM-codec-encoded bytes of x
ℰ⁻¹(b) = decode bytes back to structure

ℰ₄(n) = encode natural number n as 4 bytes (little-endian)
```

<div class="lasair-connection">

### In Lasair: JAM Codec Encoding

```ocaml
(* lib/serialization.ml *)

(** ℰ₄ - Encode 32-bit integer (little-endian) *)
let encode_u32 (n : int) : bytes =
  let b = Bytes.create 4 in
  Bytes.set_int32_le b 0 (Int32.of_int n);
  b

(** ℰ - Generic JAM codec encoding *)
let encode_seq (encode_elem : 'a -> bytes) (items : 'a array) : bytes =
  let prefix = encode_compact_nat (Array.length items) in
  let encoded = Array.map encode_elem items in
  Bytes.concat Bytes.empty (prefix :: Array.to_list encoded)
```

</div>

## Signature Schemes

JAM uses three signature schemes for different purposes:

### 1. Ed25519 (General Signing)

```
Standard digital signatures
Public key: 32 bytes
Signature: 64 bytes

Used for: Block sealing, general authentication
```

### 2. BLS (Aggregatable Signatures)

```
Signatures that can be combined
Public key: 144 bytes
Signature: 96 bytes

Used for: Finality (GRANDPA/BEEFY) - many validators sign, combine into one
```

### 3. Bandersnatch (VRF + Ring Signatures)

```
Advanced scheme for:
- Verifiable Random Functions (VRF)
- Anonymous ring signatures

Public key: 32 bytes
Signature: 96 bytes
Ring root: 144 bytes
```

<div class="callout callout-info">

**ELI5: Why Multiple Signature Types?**

- **Ed25519**: Fast, simple signatures. "I signed this."
- **BLS**: Combinable signatures. "All 100 of us signed this" in one small signature.
- **Bandersnatch**: Anonymous + random. "Someone from this group signed this, and here's a verifiable random number."

</div>

## Bandersnatch Ring VRF

The most advanced cryptographic tool in JAM:

```
Ring VRF allows:
1. Sign as anonymous member of known set
2. Prove membership without revealing identity
3. Generate verifiable random output

Used for: SAFROLE block production tickets
```

<div class="lasair-connection">

### In Lasair: Bandersnatch Types

```ocaml
(* lib/bandersnatch.ml (types; function bodies elided) *)

(** Bandersnatch public key (compressed point, 32 bytes) *)
type public_key = bytes

(** VRF output (32 bytes, derived from proof) *)
type vrf_output = bytes

(** Schnorr-like VRF signature (96 bytes) - the signer is known:
    block seals and the entropy source *)
type schnorr_signature = bytes

(** Ring VRF proof (784 bytes) - the signer is anonymous: tickets *)
type ring_proof = bytes

(** Ring root - commitment to a set of public keys (144 bytes) *)
type ring_root = bytes

(** Result of signature verification *)
type verify_result =
  | Valid of vrf_output  (** Signature valid, returns VRF output *)
  | Invalid             (** Signature invalid *)
```

</div>

## VRF (Verifiable Random Function)

VRFs produce random-looking outputs that can be verified:

```
VRF(secret_key, context) → (output, proof)

Properties:
- Output appears random
- Signer cannot control/bias the output
- Anyone can verify output is correct for that key
```

<div class="lasair-connection">

### In Lasair: VRF Usage

```ocaml
(* Illustrative sketch (not lasair's code) - VRF in block production *)

(** Ticket VRF context (Graypaper 6.7, eq. ticketsextrinsic):
    X_T ⌢ η'_2 ++ attempt, i.e. "jam_ticket_seal", the epoch
    randomness η'_2, then the one-octet entry index *)
let ticket_context (eta2 : bytes) (attempt : int) : bytes =
  Bytes.concat Bytes.empty [
    Bytes.of_string "jam_ticket_seal";
    eta2;
    Bytes.make 1 (Char.chr attempt);
  ]

(** Generate ticket using VRF *)
type ticket = {
  identifier: bytes;  (* VRF output - the "random" ticket ID *)
  attempt: int;       (* < ceil(2E / |γ_P'|) since GP 0.8.0; 0 or 1 at 1023 validators *)
  proof: ring_proof;  (* 784 octets *)
}

(* Validator cannot choose their ticket ID - it's determined by
   their key and the context. They can only choose to reveal or not. *)
```

</div>

## Domain Separation

Different uses of crypto are kept separate with context strings:

```
"jam_ticket_seal"  -- Block production tickets and ticketed seals
"jam_entropy"      -- Entropy accumulation
"jam_audit"        -- Audit selection
"jam_announce"     -- Audit announcements
```

(The Graypaper typesets these as `$jam_...`; lasair signs and verifies the name without the `$`, and matches the test vectors that way.)

This ensures signatures for one purpose can't be replayed for another.

## Key Takeaways

1. **ℋ (Blake2b)** - Primary hash function, 32-byte output
2. **ℰ (JAM codec)** - Serialization encoding
3. **Ed25519** - Standard signatures
4. **BLS** - Aggregatable signatures for finality
5. **Bandersnatch** - Ring VRF for anonymous, random signing
6. **Domain separation** - Context strings prevent cross-purpose attacks

## What's Next

With the notation foundation complete, continue to **Section 4: Overview** to understand JAM's high-level architecture.

[Next: 4.0 Overview &rarr;](lesson.html?lesson=011-graypaper-lectures/16-overview)
