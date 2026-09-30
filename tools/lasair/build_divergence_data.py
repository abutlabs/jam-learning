#!/usr/bin/env python3
"""Build the Divergence Lab data file for the Learning Lasair site.

Each entry is a real divergence from lasair's live JAM conformance fuzzer
campaign: the report metadata, the ACTUAL diverging state keys (expected vs
computed bytes, pulled straight from the fuzzer's report.json), the trace that
found the cause, the root cause, and the code fix. Hand-authored teaching
metadata is merged with the real diff bytes so the page teaches from evidence,
not prose.

Usage:
  python3 tools/build_divergence_data.py <fuzzer-runs-dir> <out.json>
  (defaults: ../fuzzer-runs  site/data/divergences.json, relative to repo root)
"""
import json, os, sys

# First key byte -> JAM state component (the report's first hypothesis).
COMPONENT = {
    0x01: "C(1) auth pools", 0x02: "C(2) auth queue", 0x03: "C(3) recent history β",
    0x04: "C(4) safrole", 0x05: "C(5) disputes", 0x06: "C(6) entropy η",
    0x07: "C(7) staging validators ι", 0x08: "C(8) current validators κ",
    0x09: "C(9) previous validators λ", 0x0b: "C(11) reports ρ",
    0x0c: "C(12) privileges χ", 0x0d: "C(13) statistics π",
    0x0e: "C(14) ready queue θ", 0x10: "C(16) accumulation output",
    0xff: "service account record",
}

def component_of(key_hex):
    b = int(key_hex[:2], 16)
    chap = COMPONENT.get(b)
    # a chapter key is the first byte then all zeros; otherwise service storage
    if chap and key_hex[2:].strip("0") == "":
        return chap
    if b == 0xff and key_hex[2:].strip("0") == "":
        return COMPONENT[0xff]
    return "service-storage"

# Hand-authored teaching metadata, keyed by divergence id. The diff bytes come
# from the real report; everything here is the lesson around them.
META = [
 {"id":"B1","title":"The accumulation-output set, sorted wrong","axis":"ordering",
  "cls":"canonical ordering","report":"run-41d85c00edde6cbc9eef8b9097ee046e","seed":"1551410130","step":2854,"imports":951,
  "story":"The accumulation output is a GP set of (service_id, hash) pairs. We sorted it "
    "by service_id alone. When one service accumulates twice in a block it emits two pairs "
    "with the same id; ours kept insertion order, the reference sorts by the full key. The "
    "mis-ordered set hashed differently, and recent history β commits to that hash, so the "
    "error cascaded into a second key.",
  "trace":"Two diverging keys, same length, same entries different order — the signature of "
    "an ordering bug, not a value bug.",
  "cause":"GP sets have a total order over the FULL key tuple. Sorting by a prefix is wrong "
    "the moment two entries share that prefix.",
  "fix":"sort lastaccout C(16) by (service_id, hash), not service_id alone — and route every "
    "set through one canonical encoder so no call site can emit one unsorted.",
  "lesson":"Wherever the protocol defines a set or ordered sequence that reaches the trie, it "
    "has a total order. Make the canonical encoder the only path to state."},
 {"id":"B2","title":"The host call that faulted too late","axis":"existence",
  "cls":"host memory-fault ordering","report":"run-9a6b6a95c27aee6b20b3ac47e287a64c","seed":"431662357","step":595,"imports":211,
  "story":"A service read host call got an out-of-range key pointer for a service that did not "
    "exist. We resolved the (missing) service first, found nothing, returned NONE — and let the "
    "invocation run on and yield. The reference reads the key from memory FIRST; the bad pointer "
    "faults and the invocation panics with no yield. One spurious yield cascaded into the output "
    "set, the statistics, and an account.",
  "trace":"Four diverging keys, one cause: an entry present that should not exist.",
  "cause":"A host call must read and validate ALL input memory (faulting on any bad range) "
    "BEFORE any service or state logic. The order decides panic-vs-commit.",
  "fix":"host_read reads + range-checks the key from memory before resolving the target service.",
  "lesson":"The order of 'check the pointer' vs 'look up the service' is protocol-visible. Audit "
    "every host call for the same shape."},
 {"id":"B3","title":"The cross-service read that came back empty","axis":"value",
  "cls":"cross-service access","report":"run-c0caff7e515e9194027c07a538e87b29","seed":"1071703991","step":6628,"imports":2239,
  "story":"A service accumulating two operands wrote an 8-byte value derived from data it READ "
    "from another service's storage (service 1116759087, key \"data\", 128 bytes). We returned "
    "NONE; the reference returned the real bytes, and the divergent input produced a divergent "
    "fold. Two mistakes: the closure that loads a foreign service loaded it with EMPTY storage, "
    "and the read addressed foreign storage by the raw key instead of the state key interleaved "
    "with the FOREIGN service's id.",
  "trace":"Operands, entropy and info were verified byte-exact FIRST; only then did the 13 read "
    "calls reveal the one that came back empty — and the pre-state confirmed the value was there.",
  "cause":"Any host call that can target a foreign service must load that service's full data and "
    "key it correctly. Storage interleaves the OWNING service's id; preimages key by raw hash.",
  "fix":"lookup_service loads the foreign service's storage; the foreign-read branch interleaves "
    "the key with the target service id via storage_state_key_for.",
  "lesson":"Get the keying wrong and the data is invisible even when loaded. Verify each operand "
    "byte-exact before suspecting execution."},
 {"id":"B4","title":"The validator set the manager could not set","axis":"privilege",
  "cls":"privilege-gated writeback","report":"run-f62d9e03c9f40e4e2bd69329f59a74a9","seed":"2919757377","step":17593,"imports":5888,
  "story":"A designate set the staging validators ι, but the invoker was service 0 — the MANAGER, "
    "not the DELEGATE (the role that may set validators). It had blessed the delegatorship to "
    "itself the same block. The reference kept ι unchanged; we applied it.",
  "trace":"ι (2,016 bytes = six validators × 336) wholly replaced. No OTHER key diverged — the "
    "tell that the host call returned OK (gas/stats unchanged) and only the writeback was wrong.",
  "cause":"Privileged operations record their request and return success; whether the effect "
    "SURVIVES is decided at the merge by who held the privilege at round start.",
  "fix":"gate the ι writeback on the round-start delegator (inv = pv0.pv_delegator), exactly as "
    "the auth-queue write is gated on the round-start assigner — NOT on the manager.",
  "lesson":"Enforce privilege at the writeback, never by faking a failure in the host call. A "
    "first attempt that rejected inside the host function shifted gas and broke a different key — "
    "the gate caught it."},
 {"id":"B5","title":"The checkpoint you could not afford","axis":"value",
  "cls":"out-of-gas effect ordering","report":"run-0526ef3d904f5e397a6f443eee8d1941","seed":"1502007736","step":6306,"imports":2140,
  "story":"A service with a tiny gas budget wrote a storage value, then made a checkpoint call — "
    "and that call ran it out of gas (gas 7, cost 10, result −3). On out-of-gas an invocation "
    "reverts to its last checkpoint. Ours snapshotted INSIDE the failing checkpoint call, "
    "capturing the just-made write, so the revert kept it. The reference runs out of gas BEFORE "
    "taking the snapshot and reverts to the previous checkpoint, before the write.",
  "trace":"pre == exp ≠ got — the reference left the key unchanged and we modified it. That single "
    "observation pointed straight at a wrongly-kept write.",
  "cause":"A host call that cannot afford its gas must not apply its effect. For most calls this "
    "is invisible — OOG reverts everything since the last checkpoint anyway. But checkpoint is "
    "special: its effect IS the revert target.",
  "fix":"a checkpoint that can't afford its gas does not snapshot; the prior checkpoint stays the "
    "revert target. Gas still goes negative, so the PVM OOGs the next step.",
  "lesson":"A checkpoint you cannot pay for must not become the place you roll back to."},
 {"id":"B6","title":"The sibling fixed before the fuzzer found it","axis":"value",
  "cls":"cross-service access (proactive)","report":None,"seed":"(none — proactive)","step":None,"imports":None,
  "story":"B3 fixed foreign-service STORAGE reads. The same closure loaded foreign PREIMAGES as an "
    "empty list — so a cross-service lookup (preimage by hash) of another service would return "
    "NONE exactly as the storage read had. Same class, different host call. Found by auditing B3's "
    "class, fixed and corpus-verified before any lane reached it.",
  "trace":"No report. The taxonomy is the tool: every confirmed bug is a template for its siblings.",
  "cause":"A class of bug, once named, enumerates its instances. Cross-service access is one "
    "closure feeding many host calls.",
  "fix":"lookup_service loads foreign preimages too (keyed by raw blake2b hash, no interleave).",
  "lesson":"When you fix one instance of a class, fix the others in the same change. One report "
    "becomes many fixes, and the next run starts deeper."},
 {"id":"B7","title":"The eject you could do twice","axis":"value",
  "cls":"in-invocation mutation visibility","report":"run-1fb56fe7ec0450995a9d18885097323e","seed":"2365413577","step":11794,"imports":4020,
  "story":"A clean double-count: we credited a service the same 173,551 twice. The trace showed "
    "service 0 making TWO eject calls for the same target (3108400684). Eject deletes a service "
    "and the caller inherits its balance. The first succeeded; the second should have found "
    "nothing and returned WHO, but it re-found the target and inherited the balance again.",
  "trace":"The magnitude was the tell — exactly twice the expected delta. The second eject "
    "resolved its target through lookup_service, which reads the immutable pre-round snapshot.",
  "cause":"Within a round every invocation sees the same PRE-ROUND snapshot of OTHER services — "
    "correct, and why the lookup reads an immutable base. But a service the invocation ITSELF "
    "deletes must be shadowed; the snapshot does not know what this execution already changed.",
  "fix":"host_eject records ejected ids (acc_ejected) and excludes them from target resolution, "
    "so the second eject sees nothing and WHOs — matching the reference.",
  "lesson":"A snapshot view is right for base state and wrong for the invocation's own deletions "
    "and creations. Whenever you resolve against an immutable snapshot, ask what THIS execution "
    "already changed."},
 {"id":"B8","title":"The role you cannot give yourself away","axis":"privilege",
  "cls":"privilege ownership","report":"run-04d280c8c7e56f73eb9184e3a0837931","seed":"3070419911","step":20674,"imports":6951,
  "story":"Two blesses, one block. First the MANAGER blessed the delegate role to service "
    "1444745969 — legitimate, applied. Then that same service, now the delegate but NOT the "
    "manager, blessed the delegatorship back to zero. We applied that too, zeroing the field in "
    "the privileges record C(12). The reference kept 1444745969 — a delegate cannot bless its "
    "own role away.",
  "trace":"One diverging key: the C(12) delegator (bytes 12-15) zeroed where the reference holds "
    "a service id. The two BLESS-WB log lines told the whole story — a valid manager bless, then "
    "a non-manager self-bless we should have ignored.",
  "cause":"Not every privilege is owned the same way. A per-core ASSIGNER may be moved by its own "
    "current holder; the singleton MANAGER, DELEGATE and REGISTRAR roles are the manager's alone. "
    "Our writeback used the assigner rule (manager OR current holder) for all of them.",
  "fix":"gate the delegate and registrar writebacks on is_manager alone, matching the manager "
    "field; only the per-core assigner keeps the manager-or-holder rule.",
  "lesson":"Read the ownership rule per field. A uniform 'holder or manager' is too coarse — "
    "per-resource privileges and singleton roles are owned differently."},
 {"id":"B9","title":"The service id you minted twice","axis":"value",
  "cls":"identity allocation","report":"run-770a5750e02cdf158fe2f018eeb9469b","seed":"3743464522","step":5741,"imports":1935,
  "story":"A `new` host call mints a fresh service id from I() = blake(E(s) ++ eta'_0 ++ E(t)) "
    "mod range + 2^16, advancing 42 per creation and skipping any id already taken. We computed "
    "983279732 and used it — but that id had been created at an earlier step and already existed "
    "in state. The reference saw it taken and bumped to 983279733; we did not, so we reused the "
    "id and OVERWROTE the existing service, corrupting its account and storage.",
  "trace":"Four diverging keys at once — a service account, its storage, and a reference to it in "
    "another service — all off by one in the low byte (..74 vs ..75). The shape screamed a single "
    "id computed one too low.",
  "cause":"Our 'taken' check looked only at the current service and the invocation's "
    "other_services overlay, not at services that exist in STATE. A service created in a prior "
    "block lives in state, reached through the snapshot lookup, not the overlay.",
  "fix":"'taken' also consults ctx.lookup_service (the state snapshot the cross-service reads "
    "use), and the minted id runs through the collision check — so a new id skips every existing "
    "service, as the reference does.",
  "lesson":"When you allocate a globally-unique identifier, 'unique' means against ALL existing "
    "holders, not just your local working set. An allocator that checks only its overlay will "
    "hand out a live id and silently clobber what was there."},
]

# The actual code fix, before -> after (the load-bearing lines, paraphrased to
# the essential change). Shown on the page so a reader sees the fix, not just
# a description of it.
FIX_CODE = {
 "B1": ("conformance/stf_guarantees.ml — sort the C(16) output set",
   "List.sort (fun a b -> compare a.service_id b.service_id) yields",
   "List.sort (fun a b -> compare (a.service_id, a.hash) (b.service_id, b.hash)) yields"),
 "B2": ("lib/pvm_host.ml — read the key before resolving the service",
   "let svc = resolve_service service_id in\n(* ... *) read_key_from_memory mem key_ptr",
   "if not (is_range_readable mem key_ptr key_len) then None  (* fault first *)\nelse let svc = resolve_service service_id in ..."),
 "B3": ("conformance/stf_guarantees.ml + lib/pvm_host.ml — load + interleave foreign storage",
   "lookup_service sid = service_account_of_decoded acct ch ~storage:[] ..\n(* host_read foreign: *) List.assoc_opt key svc.storage",
   "lookup_service sid = ..~storage:(load_service_storage db0 sid)..\n(* host_read foreign: *) let k = storage_state_key_for (target_id) key in\nList.assoc_opt k svc.storage"),
 "B4": ("conformance/stf_guarantees.ml — gate the ι writeback on the delegate",
   "match acc.acc_designate with\n| Some v -> State_db.set db (make_state_key 7) v",
   "match acc.acc_designate with\n| Some v when inv = pv0.pv_delegator -> State_db.set db (make_state_key 7) v\n| _ -> db"),
 "B5": ("lib/pvm_host.ml — a checkpoint it can't afford takes no snapshot",
   "let host_checkpoint ctx .. =\n  let cp = snapshot ctx in   (* always *)\n  { .. checkpoint = Some cp }",
   "let host_checkpoint ctx .. =\n  let new_gas = ctx.gas_remaining - 10 in\n  if new_gas < 0 then { .. (* no snapshot; OOG next step *) }\n  else { .. checkpoint = Some (snapshot ctx) }"),
 "B6": ("conformance/stf_guarantees.ml — load foreign preimages too",
   "lookup_service sid = ..~preimages:[]",
   "lookup_service sid = ..~preimages:(load_service_preimages db0 sid)"),
 "B7": ("lib/pvm_host.ml — an ejected service is gone for the rest of the invocation",
   "let target =\n  match other_services with .. | None -> lookup_service dest_id",
   "let already_ejected = List.mem dest_id acc.acc_ejected in\nlet target =\n  if already_ejected then None\n  else match other_services with .. | None -> lookup_service dest_id"),
 "B8": ("conformance/stf_guarantees.ml — delegate/registrar need continuous ownership",
   "pv_delegator = if is_manager || pv0.pv_delegator = inv then v else pv0.pv_delegator",
   "let held_continuously start cur = start = inv && cur = inv in\npv_delegator = if is_manager || held_continuously round_start_pv.pv_delegator pv0.pv_delegator\n               then v else pv0.pv_delegator"),
 "B9": ("lib/pvm_host.ml — a new id must skip ids taken in state",
   "let taken id = id = self || List.mem_assoc id other_services in\nlet new_id = ctx.nextfree   (* raw, unchecked *)",
   "let taken id = id = self || List.mem_assoc id other_services\n            || (match ctx.lookup_service with Some f -> f id <> None | None -> false) in\nlet new_id = check ctx.nextfree   (* skip every taken id *)"),
}

def truncate(hexv, head=24, tail=16):
    if len(hexv) <= (head + tail) * 2:
        return hexv, False
    return hexv[:head*2] + "…" + hexv[-tail*2:], True

def main():
    runs_dir = sys.argv[1] if len(sys.argv) > 1 else "../fuzzer-runs"
    out = sys.argv[2] if len(sys.argv) > 2 else "site/data/divergences.json"
    entries = []
    for m in META:
        e = dict(m)
        if m["id"] in FIX_CODE:
            cap, before, after = FIX_CODE[m["id"]]
            e["fix_code"] = {"caption": cap, "before": before, "after": after}
        e["keys"] = []
        if m["report"]:
            rj = os.path.join(runs_dir, m["report"], "report", "report.json")
            try:
                d = json.load(open(rj))
                for kv in d["error"]["state_diff"]["keyvals"]:
                    k = kv["key"][2:]
                    exp = kv["diff"]["exp"][2:]; got = kv["diff"]["got"][2:]
                    expt, _ = truncate(exp); gott, _ = truncate(got)
                    first = next((i for i in range(min(len(exp), len(got))//2)
                                  if exp[i*2:i*2+2] != got[i*2:i*2+2]), None)
                    e["keys"].append({
                        "component": component_of(k), "key": k[:16] + "…",
                        "bytes": len(exp)//2, "exp": expt, "got": gott,
                        "first_diff": first})
                e["root_hex"] = {"exp": d["error"]["state_diff"]["roots"]["exp"][:18] + "…",
                                 "got": d["error"]["state_diff"]["roots"]["got"][:18] + "…"}
            except (FileNotFoundError, KeyError) as ex:
                e["keys_note"] = f"(report bytes unavailable: {ex})"
        entries.append(e)
    payload = {
        "summary": {
            "total": len(entries),
            "fixed": len([e for e in entries if e["id"] != "B6"]) + 1,
            "classes": sorted(set(e["cls"].replace(" (proactive)", "") for e in entries)),
            "deepest": max(e["imports"] for e in entries if e["imports"]),
        },
        "divergences": entries,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(payload, open(out, "w"), indent=1)
    print(f"wrote {out}: {len(entries)} divergences, "
          f"{sum(len(e['keys']) for e in entries)} real diff keys")

if __name__ == "__main__":
    main()
