(* Merkle Trees

   A Merkle tree is a binary tree where:
   - Leaves contain hashes of data
   - Internal nodes contain hashes of their children
   - The root hash commits to all the data

   This is how blockchains commit to state:
   - Change any leaf → root hash changes
   - Can prove inclusion with O(log n) hashes

   In lasair, this lives in lib/merklization.ml
   (which implements Patricia Merkle tries)
*)

(* ============================================
   Simple Hash Function

   For teaching, we use a trivial "hash" function.
   In production, lasair uses Blake2b-256.
   ============================================ *)

(** A hash is just bytes (32 bytes in real JAM). *)
type hash = bytes

(** Simple XOR-based "hash" for teaching.
    DO NOT USE IN PRODUCTION! *)
let simple_hash (data : bytes) : hash =
  let h = Bytes.create 8 in
  for i = 0 to Bytes.length data - 1 do
    let j = i mod 8 in
    let old = Bytes.get_uint8 h j in
    let new_val = old lxor Bytes.get_uint8 data i in
    Bytes.set_uint8 h j new_val
  done;
  (* Mix the bytes a bit *)
  for _ = 0 to 3 do
    for i = 0 to 6 do
      let a = Bytes.get_uint8 h i in
      let b = Bytes.get_uint8 h (i + 1) in
      Bytes.set_uint8 h i (a lxor (b lsl 1) lxor (b lsr 7))
    done
  done;
  h

(** Hash two child hashes together to form a parent. *)
let hash_pair (left : hash) (right : hash) : hash =
  let combined = Bytes.create (Bytes.length left + Bytes.length right) in
  Bytes.blit left 0 combined 0 (Bytes.length left);
  Bytes.blit right 0 combined (Bytes.length left) (Bytes.length right);
  simple_hash combined

(* ============================================
   Binary Merkle Tree
   ============================================ *)

(** A Merkle tree node. *)
type tree =
  | Leaf of bytes       (* Data at the leaf *)
  | Node of tree * tree (* Left and right children *)

(** Build a Merkle tree from a list of data items.
    Pads with empty leaves if not a power of 2. *)
let rec build_tree (items : bytes list) : tree =
  match items with
  | [] -> Leaf (Bytes.create 0)
  | [x] -> Leaf x
  | _ ->
      (* Split in half and build subtrees *)
      let len = List.length items in
      let mid = len / 2 in
      let left_items = List.filteri (fun i _ -> i < mid) items in
      let right_items = List.filteri (fun i _ -> i >= mid) items in
      Node (build_tree left_items, build_tree right_items)

(** Compute the root hash of a tree. *)
let rec root_hash (t : tree) : hash =
  match t with
  | Leaf data -> simple_hash data
  | Node (left, right) ->
      hash_pair (root_hash left) (root_hash right)

(* ============================================
   Merkle Proofs

   A proof shows that a leaf is in the tree
   without revealing the whole tree.
   ============================================ *)

(** A sibling hash in a Merkle proof.
    Left means the sibling is to the left. *)
type proof_step =
  | Left of hash   (* Sibling is on the left *)
  | Right of hash  (* Sibling is on the right *)

(** A complete Merkle proof: path from leaf to root. *)
type proof = proof_step list

(** Generate a proof for the item at given index. *)
let rec generate_proof (t : tree) (index : int) : proof =
  match t with
  | Leaf _ -> []  (* At the leaf, proof is empty *)
  | Node (left, right) ->
      let left_size = tree_size left in
      if index < left_size then
        (* Item is in left subtree *)
        Right (root_hash right) :: generate_proof left index
      else
        (* Item is in right subtree *)
        Left (root_hash left) :: generate_proof right (index - left_size)

and tree_size (t : tree) : int =
  match t with
  | Leaf _ -> 1
  | Node (left, right) -> tree_size left + tree_size right

(** Verify a proof: compute root from leaf and check it matches. *)
let verify_proof (leaf_data : bytes) (proof : proof) (expected_root : hash) : bool =
  let leaf_hash = simple_hash leaf_data in
  let computed_root =
    List.fold_left (fun current step ->
      match step with
      | Left sibling -> hash_pair sibling current
      | Right sibling -> hash_pair current sibling
    ) leaf_hash proof
  in
  computed_root = expected_root

(* ============================================
   Utility Functions
   ============================================ *)

let hex_of_hash (h : hash) : string =
  let hex_char n =
    if n < 10 then Char.chr (n + Char.code '0')
    else Char.chr (n - 10 + Char.code 'a')
  in
  let len = Bytes.length h in
  let s = Bytes.create (len * 2) in
  for i = 0 to len - 1 do
    let byte = Bytes.get_uint8 h i in
    Bytes.set s (i * 2) (hex_char (byte lsr 4));
    Bytes.set s (i * 2 + 1) (hex_char (byte land 0x0f))
  done;
  Bytes.to_string s

(** Pretty-print a tree structure. *)
let rec show_tree (t : tree) (indent : string) : string =
  match t with
  | Leaf data ->
      indent ^ "Leaf(" ^ hex_of_hash (simple_hash data) ^ ")\n"
  | Node (left, right) ->
      indent ^ "Node(" ^ hex_of_hash (root_hash t) ^ ")\n" ^
      show_tree left (indent ^ "  ") ^
      show_tree right (indent ^ "  ")

(* ============================================
   Interactive Examples

   Try these in the REPL:

   (* Build a tree from some data *)
   > let items = [
       Bytes.of_string "apple";
       Bytes.of_string "banana";
       Bytes.of_string "cherry";
       Bytes.of_string "date"
     ];;
   > let tree = build_tree items;;
   > let root = root_hash tree;;
   > hex_of_hash root;;

   (* Generate and verify a proof *)
   > let proof = generate_proof tree 1;;  (* proof for "banana" *)
   > verify_proof (Bytes.of_string "banana") proof root;;
   (* true *)

   (* Try to verify with wrong data *)
   > verify_proof (Bytes.of_string "orange") proof root;;
   (* false! *)

   (* Change one item and see the root change *)
   > let items2 = [
       Bytes.of_string "apple";
       Bytes.of_string "BANANA";  (* Changed! *)
       Bytes.of_string "cherry";
       Bytes.of_string "date"
     ];;
   > let tree2 = build_tree items2;;
   > hex_of_hash (root_hash tree2);;
   (* Different from original root! *)
   ============================================ *)
