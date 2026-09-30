---
title: The Block-Propagation Grid
duration: 25 min
---

# The Block-Propagation Grid

Full connectivity means every validator *can* reach every other. But if an author
announced each new block directly to all ~1000 validators, block gossip would be
O(V) fan-out per node. JAMNP-S avoids that with a **grid**: you announce only to
your grid neighbours, and blocks reach everyone else in two or three hops.

## The grid structure

> Two validators are neighbours in the grid if:
> - they are validators in the **same epoch** and either have the same row
>   (`index / W`) or the same column (`index % W`), where `W = floor(sqrt(V))`,
>   `V` being the number of validators; **or**
> - they are validators in **different epochs** but have the same index.

Picture the `V` validators laid out row-major in a `W × W`-ish grid. Your
neighbours are everyone in your row plus everyone in your column — a "plus"
shape. With `V = 1023`, `W = 31`, so each validator has roughly `2·31 − 2 ≈ 60`
neighbours instead of 1022. The same-index rule across the previous/current/next
epoch grids stitches the three sets together so blocks flow across a validator-set
rotation.

## When a UP-0 stream is opened

The grid decides which *connections* carry a block-announcement (UP-0) stream:

> UP-0 should be opened between two connected nodes if either:
> - both nodes are validators and are neighbours in the grid, or
> - at least one of the nodes is not a validator.

So you still **connect** to every validator (Lesson 3), but you only open the
announcement stream to grid neighbours (and to non-validators, who get
everything). Blocks reach non-neighbours because every node re-announces the
blocks it imports — a second and third hop across the grid.

## In lasair

lasair computes the grid straight from on-chain data. A validator is identified
by its Ed25519 key, which lives in the validator sets in state (the active set
κ is state key 8, 336-byte records, Ed25519 at offset +32) — the very same key
it presents in its QUIC certificate. The node keeps the previous, current and
next sets (λ, κ, γ_P) of its best block, re-read whenever they change
(`jamnp/live_sets.ml`), and maps a peer's key to its indices in each:

```ocaml
(* jamnp/live_sets.ml *)
let grid_width (n : int) : int =                        (* W = floor(sqrt |set|) *)
  if n <= 0 then 1 else max 1 (int_of_float (sqrt (float_of_int n)))

(* Grid neighbours within one set of [n] validators *)
let same_set_neighbours ~(n : int) (i : int) (j : int) : bool =
  let w = grid_width n in
  i <> j && (i / w = j / w || i mod w = j mod w)
```

The predicate that gates opening a UP-0 stream follows the spec's clauses
exactly — open if either side is not a validator of the three sets;
otherwise open if we are neighbours in one set (same row or column) or
share an index across two sets:

```ocaml
let announce (t : t) ~(ours : set -> int list) ~(peer : bytes) : bool =
  let sets = [ t.lambda; t.kappa; t.gamma_k ] in
  let mine = List.mapi (fun k s -> (k, s, ours s)) sets
  and theirs = List.mapi (fun k s -> (k, indices_of_ed25519 s peer)) sets in
  let validator l = List.exists (fun (_, idx) -> idx <> []) l in
  if not (validator (List.map (fun (k, _, idx) -> (k, idx)) mine)) || not (validator theirs)
  then true                                          (* a non-validator: open *)
  else
    List.exists (fun (k, s, is) ->
        List.exists (fun (k', js) ->
            List.exists (fun i ->
                List.exists (fun j ->
                    if k = k' then same_set_neighbours ~n:(size s) i j   (* same set *)
                    else i = j) js) is)                                  (* same index *)
          theirs)
      mine

(* bin/lasair_client.ml *)
let should_announce_to peer_ed =
  match peer_ed with
  | None -> true                                     (* unknown => open (superset) *)
  | Some ed -> LS.announce (live_sets ()) ~ours ~peer:ed
```

In `run_peer`, a peer that fails this test still gets a connection (required
connectivity) but is served **CE-128 only** — no UP-0 stream:

```ocaml
if announce then begin
  (* grid neighbour (or a non-validator): carry the UP-0 announcement stream *)
  let up_stream, theirs = Transport.up0_client_handshake conn (up0_handshake ()) in
  sync_to conn theirs.Wire.Up0.final.Wire.hash;
  up0_loops conn up_stream
end else
  (* hold the connection open for CE-128 back-fill only *) ...
```

## A worked example (the one you can run)

The mixed testnet has `V = 6`, so `W = floor(sqrt(6)) = 2`. Laying indices 0–5
into a 2-wide grid:

```
        col 0   col 1
row 0     0       1
row 1     2       3
row 2     4       5
```

Take **index 3** (row 1, col 1). Its neighbours are its row (index 2) and its
column (indices 1 and 5): **{1, 2, 5}**. Not {0, 4}. Running the mesh, lasair node
`own=3` logs precisely this:

```
[peer …:40061] connected (…)                              # idx 1 → announce
[peer …:40062] connected (we initiate)                    # idx 2 → announce
[peer …:40065] connected (…)                              # idx 5 → announce
[peer …:40060] connected (fallback, CE-128 only: not a grid neighbour)   # idx 0
[peer …:40064] connected (we initiate, CE-128 only: not a grid neighbour)# idx 4
```

Index 3 announces to {1, 2, 5} and holds CE-128-only connections to {0, 4} — an
exact match for the grid neighbourhood. And the chain still converges: all lasair
nodes reach the same head and state root, and PolkaJam re-derives lasair's blocks,
because {0, 4} learn index 3's blocks from a shared neighbour re-announcing them.

This is the specific behaviour described on the docs' *Block Propagation Grid*
page — where the example uses a 31-wide grid and shows index 32 = coordinate
(1, 1) fanning out to its row and column — reproduced faithfully at `V = 6`.

## Fallbacks and honesty

- **Freerun dev genesis.** When lasair builds a genesis without on-chain Ed25519
  keys (the two-process `mesh-rotate.sh` demo), no peer's key is found in the
  sets, so `announce` treats everyone as a non-validator, returns `true`, and
  the node falls back to a **full mesh** of UP-0 streams. That is a correct superset — it never drops an
  announcement — just not the narrowed grid. The grid engages whenever the
  validator keys are on chain, as in the PolkaJam mixed network.

- **Cross-epoch neighbours.** The same-index-across-sets rule matters when the
  validator sets change between epochs. lasair implements it (the `i = j` case
  above), over the same three sets it connects by (Lesson 3). Since Graypaper
  0.8.0 the sets can also change *size*, and each set's grid width follows its
  own size.

The grid is the payoff of everything before it: identities let you know *who* a
peer is, connectivity puts you in touch with all of them, and the grid turns that
into efficient, spec-shaped block propagation.
