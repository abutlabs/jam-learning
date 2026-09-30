---
title: "4.5 Best Block"
duration: 2 min
video: https://www.youtube.com/watch?v=C7D4DzUhV_M
---

# Graypaper Section 4.5: Best Block

<span class="lecture-badge">Gavin Wood Lecture Series</span>

This section explains how JAM determines which block is the "best" - the canonical chain head that validators should build upon.

## What This Lecture Covers

- Fork choice rules
- Finality via GRANDPA
- Building on the best chain
- Handling competing chain heads

## The Fork Problem

Blockchains can fork - multiple valid blocks may extend the same parent:

```
         ┌──► Block A1 ──► Block A2
Block 0 ─┤
         └──► Block B1 ──► Block B2 ──► Block B3
```

Which chain should we follow? JAM needs rules to decide.

<div class="callout callout-info">

**ELI5: Choosing the Right Path**

Imagine you're hiking and the trail splits. Both paths look valid, but you need to pick one. In JAM:
- **GRANDPA** is like trail markers that say "this path is DEFINITELY correct"
- **Fork choice rules** help when there are no markers yet

You always trust the markers (finality). When there are none, you use special rules to pick the most promising path.

</div>

## Two Levels of "Best"

JAM has two ways to determine the best block:

### 1. Finalized (via GRANDPA)

GRANDPA provides **absolute finality** - once finalized, a block cannot be reverted:

```
Finalized blocks: Block 0 ◄── Block 1 ◄── Block 2
                                           ▲
                                     GRANDPA says:
                                     "This is final!"
```

Always trust GRANDPA's finality decisions.

### 2. Best Unfinalized (Fork Choice)

For blocks not yet finalized, JAM uses fork choice rules to pick the "probably best" chain:

```
Finalized: [Block 0] ─── [Block 1] ─── [Block 2]
                                          │
Unfinalized:                              ├──► Block 3a ──► Block 4a
                                          │
                                          └──► Block 3b

Fork choice picks: Block 4a (if it has more ticket-sealed blocks)
```

<div class="lasair-connection">

### In Lasair: Best Block Selection

```ocaml
(* Illustrative sketch (not lasair's code) - Best block determination *)

(** The "best" block for different purposes *)
type best_block =
  | Finalized of header    (** GRANDPA-finalized, immutable *)
  | BestHead of header     (** Best unfinalized, may change *)

(** Get the finalized block (always safe) *)
let get_finalized (state : chain_state) : header =
  state.grandpa_finalized

(** Get the best head for block production.
    This may be ahead of finalized and could be reorged. *)
let get_best_head (state : chain_state) : header =
  match apply_fork_choice_rules state.heads with
  | Some best -> best
  | None -> state.grandpa_finalized  (* Fallback to finalized *)

(** Fork choice (Graypaper section 19): among acceptable heads, pick the one
    with the most ticket-sealed (not fallback-sealed) unfinalized ancestors *)
let apply_fork_choice_rules (heads : header list) : header option =
  heads
  |> List.filter acceptable   (* descends from finalized, audited, no equivocation *)
  |> List.sort compare_by_weight
  |> List.hd_opt

(** Compare chains by "weight" - the number of ticket-sealed blocks *)
let compare_by_weight (a : header) (b : header) : int =
  let weight_a = ticketed_ancestors a in
  let weight_b = ticketed_ancestors b in
  compare weight_b weight_a  (* Higher weight wins *)
```

</div>

## When to Use Which

| Situation | Use | Why |
|-----------|-----|-----|
| Displaying balance | Finalized | Won't change |
| Building a block | Best head | Want latest state |
| Processing payment | Finalized | Guarantee it stays |
| Validator duties | Best head | Build on most likely chain |

<div class="callout callout-info">

**ELI5: Bank Balance vs. Pending**

Like your bank account:
- **Finalized** = Your actual balance (confirmed transactions)
- **Best head** = Including pending transactions (might change)

You'd never spend based on pending deposits. Same in JAM - use finalized for anything that matters, best head for building the future.

</div>

## GRANDPA Finality

GRANDPA (GHOST-based Recursive Ancestor Deriving Prefix Agreement) provides finality:

1. Validators **vote** on blocks they consider final
2. When 2/3+ agree, the block is **finalized**
3. Finalized blocks are **irreversible**

```
Block 1 ──► Block 2 ──► Block 3 ──► Block 4 ──► Block 5
   │           │
   ▼           ▼
 Final       Final      ◄─── 2/3+ validators voted
```

<div class="lasair-connection">

### In Lasair: Finality Tracking

```ocaml
(* Illustrative sketch (not lasair's code; its GRANDPA lives in
   jamnp/grandpa.ml) - GRANDPA finality *)

(** Track finality status *)
type finality_state = {
  last_finalized: header;         (** Most recent finalized block *)
  pending_votes: vote_set;        (** Votes not yet achieving finality *)
  finality_threshold: int;        (** 2/3 of validator set *)
}

(** Check if a block has achieved finality *)
let is_finalized (state : finality_state) (block : header) : bool =
  block.number <= state.last_finalized.number

(** Process a finality vote *)
let process_vote (state : finality_state) (vote : finality_vote)
    : finality_state =
  let votes = add_vote state.pending_votes vote in
  if count_votes votes vote.target >= state.finality_threshold then
    { state with
      last_finalized = vote.target;
      pending_votes = clear_votes_below votes vote.target }
  else
    { state with pending_votes = votes }
```

</div>

## Fork Choice Rules Summary

When GRANDPA hasn't finalized, the Graypaper (section 19) first limits the candidates to *acceptable* blocks:

1. **Descends from the finalized block**
2. **Is audited** (all its newly available reports have passed auditing)
3. **Contains no equivocation** (no two unfinalized ancestors at the same timeslot) and no block that accumulates a report at least a third of validators judge invalid

Among those, it picks the head with **the most ancestors sealed with a ticket** rather than a fallback key. Ticket seals are the more secure mode, so this favours the chain that Safrole ran normally on. This is also the chain on which the node casts its GRANDPA votes.

## Key Takeaways

1. **GRANDPA = finality** - Trust finalized blocks absolutely
2. **Best head = building** - Use for block production
3. **Fork choice rules** - Handle competing chains gracefully
4. **Different uses** - Match the guarantee level to your need

## What's Next

Continue with **Section 4.7: VM and Gas** to understand JAM's virtual machine execution model.

[Next: 4.7 VM and Gas &rarr;](lesson.html?lesson=011-graypaper-lectures/21-pvm-gas)
