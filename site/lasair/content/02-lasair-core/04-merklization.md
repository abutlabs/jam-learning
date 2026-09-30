---
title: Merklization
duration: 30 min
---

# Merklization

Merkle trees are everywhere in blockchain. They let us commit to large amounts of data with a single hash, and prove individual elements without revealing everything. JAM uses two kinds: a **binary Patricia Merkle trie** for the state (Graypaper appendix D, "State Merklization") and **binary Merkle trees** over sequences (appendix E, "General Merklization").

**In lasair:** `lib/merklization.ml` (the general trees, state-key constructors, MMRs) and `lib/state_db.ml` (the state trie and its proofs).

## Why Merkle Trees?

Imagine you have a database with millions of entries. How do you:

1. **Commit** to the entire state with a small fingerprint?
2. **Prove** a specific entry exists without sharing everything?
3. **Detect** if anything changed?

Merkle trees solve all three.

## The Basic Idea

```
                    Root Hash
                        │
              ┌─────────┴─────────┐
              │                   │
           Hash01              Hash23
              │                   │
         ┌────┴────┐         ┌────┴────┐
         │         │         │         │
       Hash0    Hash1      Hash2    Hash3
         │         │         │         │
        L0        L1        L2        L3
      "alice"   "bob"    "carol"   "dave"
```

- **Leaves** are hashes of actual data
- **Internal nodes** are hashes of their children
- **Root** is a single 32-byte commitment to everything

## The Graypaper's Binary Merkle Tree

The Graypaper builds its sequence trees with one *node function* N (appendix E, eq. merklenode): an empty sequence is the zero hash, a single item is itself, and anything longer splits at ⌈n/2⌉ and hashes the prefix `node` with the two halves. From `lib/merklization.ml` (abridged: lasair defines its `split` inline):

```ocaml
let prefix_node = Bytes.of_string "node"

(** Node function N: build Merkle tree from sequence of items *)
let rec merkle_node (items : bytes list) (hash_fn : hash_fn) : bytes =
  match items with
  | [] -> zero_hash
  | [item] -> item
  | _ ->
    let mid = (List.length items + 1) / 2 in     (* ceil(n/2) *)
    let left, right = split mid items in
    let left_hash = merkle_node left hash_fn in
    let right_hash = merkle_node right hash_fn in
    hash_fn (Bytes.concat Bytes.empty [prefix_node; left_hash; right_hash])

(** Well-balanced Merkle root M_B *)
let merkle_root_balanced (items : bytes list) (hash_fn : hash_fn) : bytes =
  match items with
  | [] -> zero_hash
  | [item] -> hash_fn item
  | _ -> merkle_node items hash_fn
```

Two details catch implementers:

- **No duplication of odd elements.** Some tree designs copy the last element to make pairs. The Graypaper splits unevenly instead: five items split 3 + 2, then 2 + 1.
- **The prefix is the four bytes `node`.** The Graypaper typesets it as `$node`; the `$` marks it as a byte string and is not hashed. Hashing the `$` is a real bug lasair once had (see the Traces lesson).

The same appendix defines a *constant-depth* variant M (leaves prefixed `leaf`, padded to a power of two) used for segment roots, and the Merkle Mountain Range behind the accumulation-output belt in recent history. Lasair implements both in the same file.

## Merkle Proofs

A proof shows that a leaf is part of the tree:

```
To prove L1 is in the tree:

                    Root Hash  ← Verify: node(Hash01, Hash23) = Root
                        │
              ┌─────────┴─────────┐
              │                   │
           Hash01                 Hash23  ← Sibling (provided)
              │
         ┌────┴────┐
         │         │
       Hash0       Hash1  ← Verify: node(Hash0, Hash1) = Hash01
         │         │
        L0        [L1]    ← The leaf we're proving
      (sibling)   (target)
```

The proof is: `[Hash23, Hash0]` — just the siblings along the path, top to bottom.

## In Lasair: Merkle Proofs

The Graypaper's *trace* function T returns exactly those siblings, from the top of the tree down. Lasair builds it with `merkle_trace` and checks one with `verify_merkle_trace`, which replays the same uneven ⌈n/2⌉ splits:

```ocaml
let verify_merkle_trace ~(root : bytes) ~(leaf : bytes) ~(index : int)
    ~(total : int) ~(proof : bytes list) (hash_fn : hash_fn) : bool =
  if index < 0 || index >= total then false
  else
    let combine a b = hash_fn (Bytes.concat Bytes.empty [prefix_node; a; b]) in
    let rec go count idx copath =
      if count <= 1 then Some (leaf, copath)
      else
        match copath with
        | [] -> None                                  (* proof too short *)
        | sib :: rest ->
          let mid = (count + 1) / 2 in
          if idx < mid then
            (match go mid idx rest with
             | Some (sub, rest') -> Some (combine sub sib, rest')  (* leaf LEFT *)
             | None -> None)
          else
            (match go (count - mid) (idx - mid) rest with
             | Some (sub, rest') -> Some (combine sib sub, rest')  (* leaf RIGHT *)
             | None -> None)
    in
    match go total index proof with
    | Some (r, []) -> Bytes.equal r root        (* the co-path must be used up *)
    | _ -> false
```

This is how an erasure-coded shard is checked against a work report's erasure root (the Networking track's CE-137/138). A verifier that assumed a power-of-two tree, reading the index bit by bit, would disagree with it whenever the leaf count is not a power of two, for example the 6 shards of the tiny spec.

## JAM's State Trie

The state is committed by a **binary Patricia Merkle trie** over **31-byte keys**. Each bit of the key, most significant bit of the first byte first, chooses left (0) or right (1):

```
Key: 0x1A3F... (binary: 0001 1010 0011 1111 ...)

                     Root (branch on bit 0)
                      │
          ┌───────────┴───────────┐
          0                       1
          │                       │
       (branch on bit 1)        (empty: zero hash)
          │
    ┌─────┴─────┐
    0           1
    │           │
  (leaf:      (leaf:
   one key)    one key)
```

A subtree holding exactly one key is a single **leaf**, however deep it sits. A subtree holding none is the zero hash. There are no other node kinds.

## In Lasair: Trie Structure

Every node is exactly **64 bytes**, and its first bits say what it is (appendix D, functions B and L):

| Node | First byte | Bytes 1..31 | Bytes 32..63 |
|---|---|---|---|
| Branch | `0` + 7 bits of the left hash | rest of the left child's hash | the right child's hash |
| Embedded-value leaf (value ≤ 32 bytes) | `10` + 6-bit value length | the 31-byte key | the value, zero-padded |
| Regular leaf (value > 32 bytes) | `11000000` | the 31-byte key | Blake2b-256 of the value |

A branch has room for only 511 bits of child hashes, so the left child's hash loses its first bit to the discriminator. From `lib/state_db.ml` (abridged: length assertions dropped):

```ocaml
let branch (left : bytes) (right : bytes) : bytes =
  let result = Bytes.create 64 in
  (* Head: first byte of left with MSB cleared *)
  let head = (Bytes.get_uint8 left 0) land 0x7f in
  Bytes.set_uint8 result 0 head;
  Bytes.blit left 1 result 1 31;
  Bytes.blit right 0 result 32 32;
  result

let leaf (k : bytes) (v : bytes) : bytes =
  let result = Bytes.create 64 in
  let vlen = Bytes.length v in
  if vlen <= 32 then begin
    Bytes.set_uint8 result 0 (0x80 lor vlen);        (* inline value *)
    Bytes.blit k 0 result 1 31;
    Bytes.blit v 0 result 32 vlen;
    Bytes.fill result (32 + vlen) (32 - vlen) '\x00'
  end else begin
    Bytes.set_uint8 result 0 0xC0;                   (* hashed value *)
    Bytes.blit k 0 result 1 31;
    Bytes.blit (hash v) 0 result 32 32
  end;
  result
```

A node's identity is the Blake2b-256 hash of its 64 bytes, and the whole trie's root is computed by recursive partition on the key bits (abridged):

```ocaml
let rec merkle_state (kvs : kv list) (bit_idx : int) : bytes =
  match kvs with
  | [] -> Bytes.make 32 '\x00'                        (* empty: zero hash *)
  | [{ key; value }] -> hash (leaf key value)         (* one key: a leaf *)
  | _ ->
    let left, right = List.partition (fun kv -> not (get_bit kv.key bit_idx)) kvs in
    hash (branch (merkle_state left (bit_idx + 1)) (merkle_state right (bit_idx + 1)))
```

The official trie test vectors only caught up with this layout in their 0.8.0 release, listed there as a fix: discriminators in the most significant bits of the first byte, key bits read most-significant first. The Graypaper itself has specified this layout since 0.4.0, when its `bits` function became most-significant first. Lasair's `State_db` already matched it; its 0.8.0 migration only deleted a test-only copy of the trie that had followed the old vectors.

## No Extensions: Leaves Do the Compressing

Tries in other chains (Ethereum's, for example) have *extension* nodes that compress a run of single-child branches. JAM's trie needs none:

```
Other tries:                       JAM:
        │                              │
    Extension                        Leaf
    prefix: 0010                 (the whole 31-byte key,
        │                         at the first depth where
      Value                        it is alone)
```

A key's leaf sits at the first depth where its subtree holds no other key, so a sparse region costs one node, not a chain. The full key is stored in the leaf, so a proof can tell "this key" from "some other key that ends up here".

## In Lasair: Trie Operations

Lasair keeps no tree in memory. `State_db.t` is an ordered map from 31-byte keys to values, plus a cached root:

```ocaml
type t = {
  map: bytes KeyMap.t;          (* 31-byte key -> value *)
  mutable root: bytes option;   (* memoized Merkle root *)
}

let get (db : t) (key : bytes) : bytes option = ...
let set (db : t) (key : bytes) (value : bytes) : t = ...    (* clears the cached root *)
let remove (db : t) (key : bytes) : t = ...

let root (db : t) : bytes =
  match db.root with
  | Some r -> r
  | None -> let r = compute_root db in db.root <- Some r; r
```

Reads and writes are map operations; the root is recomputed from scratch, once, when someone asks for it. It is simple and obviously correct, and correctness came first. Its cost grows with the whole state rather than with what changed.

## State Roots in Blocks

Every block header contains the prior state root:

```ocaml
type header = {
  parent : hash;
  parent_state_root : hash;  (* H_R: root of the state after the PARENT block *)
  extrinsic_hash : hash;
  slot : int;
  (* ... *)
}
```

H_R is the posterior state root of the *parent*, so a block commits to the state it was built on, and the state *it* produces is committed by its child. The root commits to everything in σ:

- the authorizer pools and queues, recent history, Safrole state, disputes, entropy
- the staging, active and previous validator sets
- availability assignments, the timeslot, privileges, statistics
- the accumulation queue, the accumulation history and the last accumulation outputs
- every service account, its storage, its preimages and its preimage requests

## In Lasair: Computing State Root

The state is first flattened into key/value pairs, each component under a key built by the Graypaper's constructor C (appendix D). A state component gets `C(i) = [i, 0, 0, …]`; a service account gets `C(255, s)`, with the service id's four bytes interleaved with zeros; a storage item, preimage or request gets `C(s, h)`, the service id interleaved with the start of a Blake2b hash. From `lib/merklization.ml` (abridged):

```ocaml
let state_key_from_index (idx : int) : bytes =
  let key = Bytes.make state_key_size '\x00' in       (* 31 bytes *)
  Bytes.set key 0 (Char.chr idx);
  key

let state_key_from_index_service (idx : int) (service_id : int) : bytes =
  let key = Bytes.make state_key_size '\x00' in
  Bytes.set key 0 (Char.chr idx);
  (* Service ID encoded as 4 bytes, interleaved with zeros *)
  Bytes.set key 1 (Char.chr (service_id land 0xFF));
  Bytes.set key 3 (Char.chr ((service_id lsr 8) land 0xFF));
  Bytes.set key 5 (Char.chr ((service_id lsr 16) land 0xFF));
  Bytes.set key 7 (Char.chr ((service_id lsr 24) land 0xFF));
  key
```

So C(3) = `03 00 00 …` is recent history, C(8) is the active validator set κ, C(13) is statistics. The state root is then just the trie root over all of those pairs: `State_db.root`.

## Proof Generation

To prove a value, hand over the node encodings on the path from the root to its key. This is what the JAMNP-S state request (CE-129) sends as *boundary nodes*, and `State_db.prove_key` checks such a list against a root:

```ocaml
type proven =
  | Proven_value of bytes       (* the key's leaf embeds its value (<= 32 octets) *)
  | Proven_value_hash of bytes  (* the key's leaf commits to H(value) *)
  | Proven_absent               (* its path ends in an empty branch or another key's leaf *)

let prove_key ~(root : bytes) ~(key : bytes) (nodes : bytes list)
  : (proven, string) result = ...
```

It walks from the root: at a branch it follows the key's next bit to the child hash (matching a left child on 255 bits); at a leaf it compares the stored key. Absence is provable too: the path ends at the zero hash or at a leaf for a different key. `lasair_reader`, lasair's JIP-2 RPC server, uses this, so every state value it returns has been checked against a block's state root.

## Batch Updates

A block's state transition makes many writes, then asks for the root once (an illustrative sketch, not lasair's code):

```ocaml
let apply_mutations (db : State_db.t) mutations =
  List.fold_left
    (fun db (key, value_opt) ->
      match value_opt with
      | Some value -> State_db.set db key value
      | None -> State_db.remove db key)
    db
    mutations

(* One root computation for the whole block *)
let new_root = State_db.root (apply_mutations pre_state mutations)
```

## Exercise: Build a Simple Merkle Tree

Implement the Graypaper's well-balanced Merkle root over a list of items:

```ocaml
let merkle_root items =
  (* TODO:
     1. Zero items: the zero hash. One item: hash it.
     2. Otherwise split at ceil(n/2), recurse on each half,
        and hash "node" ++ left ++ right
  *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
let zero_hash = Bytes.make 32 '\x00'

let hash_node left right =
  blake2b_256 (Bytes.concat Bytes.empty [Bytes.of_string "node"; left; right])

let rec split n = function
  | l when n = 0 -> ([], l)
  | [] -> ([], [])
  | x :: rest -> let (a, b) = split (n - 1) rest in (x :: a, b)

(* N: a single item is returned as-is, not hashed *)
let rec node = function
  | [] -> zero_hash
  | [x] -> x
  | items ->
    let (l, r) = split ((List.length items + 1) / 2) items in
    hash_node (node l) (node r)

(* M_B: a single item IS hashed *)
let merkle_root = function
  | [] -> zero_hash
  | [x] -> blake2b_256 x
  | items -> node items
```

</details>

## Exercise: Verify a Proof

Given a proof as a list of steps from the leaf up, verify it:

```ocaml
type proof_step = Left of hash | Right of hash
(* Left s: our node is on the left, s is its right sibling *)

let verify_proof root proof leaf_hash =
  (* TODO:
     1. Start from the leaf hash
     2. Walk the proof, combining with siblings
     3. Check final hash equals root
  *)
```

<details>
<summary>Click to see solution</summary>

```ocaml
type proof_step = Left of hash | Right of hash

let verify_proof root proof leaf_hash =
  let final = List.fold_left
    (fun current step ->
      match step with
      | Left sibling -> hash_node current sibling
      | Right sibling -> hash_node sibling current)
    leaf_hash
    proof
  in
  Bytes.equal final root
```

Note the order: this proof runs leaf-to-root, while the Graypaper's trace T lists siblings root-to-leaf. Either works if the verifier agrees with the prover.

</details>

## Exercise: Proof Size Analysis

For a tree with N leaves:
1. What's the maximum proof length?
2. How does proof size grow with N?
3. Why is this efficient?

<details>
<summary>Click to see answers</summary>

```
1. Maximum proof length = ceil(log₂(N)) hashes
   For N = 1,000,000 leaves: ceil(log₂(1,000,000)) = 20 hashes

2. Proof size grows LOGARITHMICALLY with N
   - 1,000 leaves → ~10 hashes (320 bytes)
   - 1,000,000 leaves → ~20 hashes (640 bytes)
   - 1,000,000,000 leaves → ~30 hashes (960 bytes)

3. This is efficient because:
   - We can prove membership in a million-item set with just 20 hashes
   - The prover only needs to store/send siblings along one path
   - Verification is O(log N), not O(N)
   - The verifier doesn't need the whole tree
```

(The state trie is not balanced, but its keys are hashes or near-hashes, so a key's depth is also about log₂ of the number of keys. A trie proof sends 64-byte nodes rather than 32-byte hashes.)

</details>

## Key Takeaways

1. **Merkle roots** - Commit to large data with one hash
2. **Merkle proofs** - Prove membership with O(log N) data
3. **Two structures** - a well-balanced binary tree for sequences, a binary Patricia trie for state
4. **64-byte nodes, no extensions** - branches and two kinds of leaf; a lone key is one leaf at any depth
5. **State roots** - Every block commits to its parent's posterior state
6. **Absence is provable** - a path that ends at the zero hash or at another key's leaf

## Next Up

Now let's see how blocks and headers are structured: [Headers and Blocks →](lesson.html?lesson=02-lasair-core/05-blocks)
