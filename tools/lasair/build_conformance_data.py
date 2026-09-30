#!/usr/bin/env python3
"""Build annotated conformance-vector data for the Learning Lasair site.

Decodes JAM block-import trace vectors (jam-conformance, GP v0.7.2) into
human-readable JSON: block anatomy, a derived event timeline, and an
annotated state diff. Every decoding rule here was verified against the
vectors while bringing lasair to 606/606 trace conformance.

Usage:
  python3 tools/build_conformance_data.py <jam-conformance>/test-vectors/traces <out-dir>
"""

import hashlib
import json
import os
import sys

EPOCH = 12
VALIDATORS = 6
SUPERMAJORITY = (2 * VALIDATORS) // 3  # available when votes > this

# Curated showcase vectors: (family, block, why-it-matters)
SHOWCASE = [
    ("fallback", "00000001",
     "The simplest possible block: no work, no tickets. Only the clock "
     "(timeslot), entropy accumulator and validator statistics change. "
     "Start here to see the smallest state delta a block can make."),
    ("safrole", "00000011",
     "Safrole ticket submission: validators submit Ring-VRF tickets that "
     "decide future block authorship. Watch C(4) (safrole state) absorb "
     "the tickets while everything else stays still."),
    ("storage", "00000006",
     "The first real accumulation in the storage family. Two work reports "
     "become available (enough validators assured them), the service's "
     "accumulate code runs in the PVM for 478,680 gas, writes storage, "
     "and the accumulated-set ring C(15) records the package hashes."),
    ("storage", "00000025",
     "Two reports become available in the same block, on different cores, "
     "guaranteed 5 slots apart. The accumulated-set entry is a SET — "
     "serialized in lexicographic hash order, not core order. This block "
     "is the only place in the family that exposes the difference."),
    ("storage", "00000038",
     "Dependency ordering. One available report DECLARES a prerequisite, "
     "so per the Graypaper it must take the queue path (W^Q) and "
     "accumulate after the dependency-free report — even though its "
     "prerequisite is already satisfied. Operand order changes what the "
     "service computes, so getting this wrong breaks the state root."),
    ("storage", "00000056",
     "Out-of-gas rollback. The invocation has a gas limit of just 116,976; "
     "the service runs out mid-write. Per the Graypaper only a HALT "
     "commits — every storage change is discarded, but the gas still "
     "counts in the service statistics. The state root only balances if "
     "you do both."),
    ("storage_light", "00000076",
     "A report becomes available but DECLARES an unsatisfied prerequisite, "
     "so instead of accumulating it parks in the ready-queue ring C(14) "
     "at slot mod 12. Nothing accumulates; last-accumulation timestamps "
     "must NOT move."),
    ("preimages", "00000008",
     "The preimages extrinsic at work: the block body carries 5 blobs "
     "answering earlier solicitations. Each lands under its preimage key "
     "C(s, E4(2^32-2) ++ h) and stamps its request entry with this slot. "
     "The block author's validator stats count all 5 (612 octets)."),
    ("preimages", "00000013",
     "The bootstrap service deliberately panics (it tries to forget a "
     "request that is not yet expungeable). Per the Graypaper the panic "
     "discards every state change the invocation made — but the gas it "
     "burned still lands in the statistics."),
    ("fuzzy", "00000006",
     "The fuzzy family throws everything at once. Here the service CREATES "
     "two new services mid-accumulation: their ids derive from "
     "blake2b(service ++ entropy ++ slot), the second exactly 42 above the "
     "first — the Graypaper's '+42 bump' in the wild. Each newborn starts "
     "life as a single unprovided request for its own code."),
    ("fuzzy", "00000143",
     "An ADVERSARIAL block: one work result claims a code hash that does "
     "not match the service's actual code. A conformant node must reject "
     "the whole block — the expected post-state is byte-identical to the "
     "pre-state. Importing it at all is the failure."),
]

FAMILY_EXPLAINERS = {
    "fallback": (
        "Fallback blocks exercise the consensus skeleton with no work: "
        "timeslot, entropy, history and statistics transitions only. If "
        "these fail, nothing else can pass."),
    "safrole": (
        "Safrole is JAM's block-production lottery. Validators submit "
        "anonymous Ring-VRF tickets during an epoch; the best tickets win "
        "future authoring slots. These vectors exercise ticket validation, "
        "epoch transitions and the sealing-key marker."),
    "storage": (
        "The storage family runs a real service that stress-tests service "
        "storage. Each block: (1) new work reports are guaranteed onto "
        "cores, (2) validators assure availability of earlier reports, "
        "(3) once a report has a super-majority of assurances it becomes "
        "available and the service's ACCUMULATE entry point executes in "
        "the PVM — reading, writing and deleting storage keys via host "
        "calls, metered by gas. The post-state root certifies every byte: "
        "storage entries, the service's octet/item footprint, gas "
        "statistics, the accumulated-set ring and the ready queue."),
    "storage_light": (
        "Same service and lifecycle as the storage family, but each work "
        "report carries a single work item, isolating the per-report "
        "machinery (availability, queueing, ordering) from multi-item "
        "aggregation."),
    "preimages": (
        "The preimages family exercises JAM's data-availability contract "
        "for service code and data. The service SOLICITS hashes it wants "
        "(host call 23), the chain later receives matching blobs in the "
        "block body (the E_P extrinsic), lookups serve them back (host "
        "call 2), and FORGET (24) begins the two-step expunge dance "
        "governed by the D=32-slot turnaround period."),
    "preimages_light": (
        "Single-work-item variant of the preimages family."),
    "fuzzy": (
        "Seed-generated chaos: every feature at once, plus deliberately "
        "invalid blocks. Services create and destroy other services, "
        "transfer funds, upgrade their own code, checkpoint and panic; "
        "roughly one vector in twenty is adversarial and must be rejected "
        "outright. This family is the closest thing to the official "
        "fuzzer's behavior that ships as static vectors."),
    "fuzzy_light": (
        "Single-work-item variant of the fuzzy family."),
}

CHAPTER_KEYS = {
    1: ("alpha", "authorizer pool", "Per-core pool of authorizer hashes"),
    2: ("phi", "authorizer queue", "Per-core queue feeding the pool"),
    3: ("beta", "recent history", "Last H=8 block hashes, state roots, MMR"),
    4: ("gamma", "safrole state", "Ticket accumulator, sealing keys, epoch root"),
    5: ("psi", "disputes", "Judgments: good/bad/wonky reports, offenders"),
    6: ("eta", "entropy", "Entropy accumulator (4 x 32 bytes)"),
    7: ("iota", "staging validators", "Next epoch's validator keys"),
    8: ("kappa", "active validators", "Current epoch's validator keys"),
    9: ("lambda", "previous validators", "Last epoch's validator keys"),
    10: ("rho", "pending reports", "Per-core: guaranteed report awaiting assurances"),
    11: ("tau", "timeslot", "Most recent block's slot (u32)"),
    12: ("chi", "privileges", "Manager/assigner/delegator services, always-accumulate"),
    13: ("pi", "statistics", "Validator, core and service activity counters"),
    14: ("theta", "ready queue", "12-ring queue of dependent work reports"),
    15: ("xi", "accumulated", "12-ring history of accumulated package hashes"),
    16: ("theta-out", "last-acc outputs", "Most recent accumulation output hashes"),
}


def rd_compact(b, p):
    f = b[p]
    if f < 0x80:
        return f, p + 1
    l = 0
    for i in range(7, -1, -1):
        if f >> i & 1:
            l += 1
        else:
            break
    if l == 8:
        return int.from_bytes(b[p+1:p+9], "little"), p + 9
    return ((f & ((1 << (7 - l)) - 1)) << (8 * l)) | int.from_bytes(b[p+1:p+1+l], "little"), p + 1 + l


def classify_key(khex, preimage_keys):
    kb = bytes.fromhex(khex)
    if kb[0] == 0xFF and all(kb[i] == 0 for i in (2, 4, 6)):
        sid = kb[1] | kb[3] << 8 | kb[5] << 16
        return ("account", f"service {sid} account",
                "Code hash, balance, gas minimums, storage footprint (octets/items), gratis, timestamps")
    first = kb[0]
    if first in CHAPTER_KEYS and all(b == 0 for b in kb[1:]):
        sym, name, desc = CHAPTER_KEYS[first]
        return (f"c{first}", f"C({first}) {name} ({sym})", desc)
    if khex in preimage_keys:
        return ("preimage", f"service-{preimage_keys[khex][0]} preimage blob",
                f"Blob of {preimage_keys[khex][1]} bytes, keyed C(s, E4(2^32-2) ++ blake2b(blob))")
    sid = kb[0] | kb[2] << 8 | kb[4] << 16 | kb[6] << 24
    return ("service-data", f"service-{sid} data entry",
            "Storage entry C(s, E4(2^32-1)++key), preimage blob, or request entry "
            "C(s, E4(len)++hash) — positions 1,3,5,7,8..30 carry blake2b bytes, so the "
            "original key is unrecoverable by design")


def decode_ring(b):
    rings, p = [], 0
    try:
        while p < len(b) and len(rings) < EPOCH:
            cnt, p = rd_compact(b, p)
            hs = [b[p + 32 * i: p + 32 * i + 32].hex() for i in range(cnt)]
            p += cnt * 32
            rings.append(hs)
    except Exception:
        pass
    return rings


def decode_stats_services(b):
    """Service entries from the C(13) statistics record."""
    out = []
    try:
        p = VALIDATORS * 2 * 24  # two validator sets x 24-byte records
        for _ in range(2):       # cores
            for _ in range(8):
                _, p = rd_compact(b, p)
        n, p = rd_compact(b, p)
        names = ["provided_count", "provided_size", "refine_count", "refine_gas",
                 "imports", "xt_count", "xt_size", "exports", "acc_count", "acc_gas"]
        for _ in range(n):
            sid = int.from_bytes(b[p:p+4], "little")
            p += 4
            vals = {}
            for nm in names:
                v, p = rd_compact(b, p)
                vals[nm] = v
            out.append({"service": sid, **vals})
    except Exception:
        pass
    return out


def core_votes(assurances):
    votes = [0, 0]
    for a in assurances:
        bf = int(a.get("bitfield", "0x0"), 16)
        for c in range(2):
            if bf >> c & 1:
                votes[c] += 1
    return votes


def build_vector(path, family, block, why):
    v = json.load(open(path))
    header = v["block"]["header"]
    ext = v["block"]["extrinsic"]
    pre = {kv["key"][2:]: kv["value"][2:] for kv in v["pre_state"]["keyvals"]}
    post = {kv["key"][2:]: kv["value"][2:] for kv in v["post_state"]["keyvals"]}
    slot = header["slot"]

    # preimage extrinsic → computable state keys for annotation
    preimage_keys = {}
    for p in ext.get("preimages", []):
        blob = bytes.fromhex(p["blob"][2:])
        h = hashlib.blake2b(blob, digest_size=32).digest()
        sentinel = (2**32 - 2).to_bytes(4, "little") + h
        a = hashlib.blake2b(sentinel, digest_size=32).digest()
        sid = p.get("requester", 0)
        out = bytearray(31)
        n = sid.to_bytes(4, "little")
        out[0], out[2], out[4], out[6] = n
        out[1], out[3], out[5], out[7] = a[0], a[1], a[2], a[3]
        for i in range(23):
            out[8 + i] = a[4 + i]
        preimage_keys[bytes(out).hex()] = (sid, len(blob))

    guarantees = []
    for g in ext.get("guarantees", []):
        r = g["report"]
        guarantees.append({
            "core": r["core_index"],
            "package": r["package_spec"]["hash"][2:10],
            "bundle_len": r["package_spec"]["length"],
            "digests": [{"service": res["service_id"],
                         "gas_limit": res["accumulate_gas"],
                         "result": list(res["result"].keys())[0]}
                        for res in r["results"]],
            "prerequisites": [p[2:10] for p in r["context"].get("prerequisites", [])],
        })

    votes = core_votes(ext.get("assurances", []))

    # events derived from state machinery
    events = []
    if ext.get("tickets"):
        events.append(f"{len(ext['tickets'])} Safrole ticket(s) submitted by the author.")
    for g in guarantees:
        dep = (f" — declares prerequisite {g['prerequisites'][0]}…"
               if g["prerequisites"] else "")
        events.append(
            f"Core {g['core']}: package {g['package']}… guaranteed "
            f"({len(g['digests'])} work item(s), bundle {g['bundle_len']} bytes){dep}. "
            f"It now waits on this core for availability assurances.")
    if ext.get("assurances"):
        events.append(
            f"{len(ext['assurances'])} validator assurance(s): core 0 has {votes[0]}, "
            f"core 1 has {votes[1]} vote(s). A report becomes AVAILABLE when votes "
            f"exceed 2/3 of {VALIDATORS} validators (i.e. ≥ {SUPERMAJORITY + 1}).")

    # accumulated this block: xi ring 11 of post-state
    xi_post = decode_ring(bytes.fromhex(post.get("0f" + "0" * 60, "00" * EPOCH)))
    acc_now = xi_post[EPOCH - 1] if len(xi_post) == EPOCH else []
    if acc_now:
        pkgs = ", ".join(h[:8] + "…" for h in acc_now)
        events.append(
            f"ACCUMULATION: package(s) {pkgs} became available and were accumulated — "
            f"the service's accumulate entry point ran inside the PVM. The accumulated-set "
            f"ring C(15) records them (sorted, ring 11), aging out after {EPOCH} blocks.")
    # ready queue movement
    rq_pre = decode_ring(bytes.fromhex(pre.get("0e" + "0" * 60, "00" * EPOCH)))
    rq_post_raw = post.get("0e" + "0" * 60, "00" * EPOCH)
    if len(rq_post_raw) > 2 * EPOCH:
        events.append(
            f"READY QUEUE: at least one available report declares unsatisfied "
            f"prerequisites — it parks in ring {slot % EPOCH} of C(14) instead of "
            f"accumulating, and will run when its dependencies accumulate.")
    _ = rq_pre

    stats_post = decode_stats_services(bytes.fromhex(post.get("0d" + "0" * 60, "")))
    for srec in stats_post:
        if srec.get("acc_count"):
            events.append(
                f"Service {srec['service']} statistics: {srec['acc_count']} work item(s) "
                f"accumulated for {srec['acc_gas']:,} gas (exact PVM metering — every "
                f"instruction costs 1, host calls cost 10, log costs 10).")
        if srec.get("provided_count"):
            events.append(
                f"Service {srec['service']}: {srec['provided_count']} preimage(s) "
                f"totalling {srec['provided_size']} bytes provided via the block body.")
    if ext.get("preimages"):
        sizes = [len(p["blob"][2:]) // 2 for p in ext["preimages"]]
        events.append(
            f"E_P extrinsic: {len(sizes)} preimage blob(s) ({', '.join(map(str, sizes))} bytes) "
            f"answer earlier solicitations: each is stored under its hash and its request "
            f"entry is stamped with slot {slot}.")

    # annotated diff
    diff = []
    for k in sorted(set(pre) | set(post)):
        in_pre, in_post = k in pre, k in post
        if in_pre and in_post and pre[k] == post[k]:
            continue
        kind, label, desc = classify_key(k, preimage_keys)
        change = "modified" if (in_pre and in_post) else ("added" if in_post else "removed")
        entry = {"key": k, "kind": kind, "label": label, "desc": desc, "change": change,
                 "pre_len": len(pre[k]) // 2 if in_pre else None,
                 "post_len": len(post[k]) // 2 if in_post else None}
        if change == "modified":
            a, b = bytes.fromhex(pre[k]), bytes.fromhex(post[k])
            fb = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]),
                      min(len(a), len(b)))
            entry["first_diff_byte"] = fb
        diff.append(entry)

    return {
        "family": family,
        "block": block,
        "slot": slot,
        "why": why,
        "family_explainer": FAMILY_EXPLAINERS.get(family, ""),
        "extrinsic": {
            "tickets": len(ext.get("tickets", [])),
            "guarantees": guarantees,
            "assurance_votes": {"core0": votes[0], "core1": votes[1],
                                "count": len(ext.get("assurances", []))},
            "preimages": [{"requester": p.get("requester", 0),
                           "bytes": len(p["blob"][2:]) // 2}
                          for p in ext.get("preimages", [])],
        },
        "events": events,
        "accumulated_now": [h[:16] for h in acc_now],
        "service_stats": stats_post,
        "pre_state_entries": len(pre),
        "post_state_entries": len(post),
        "diff": diff,
    }


def main():
    traces_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    index = []
    for family, block, why in SHOWCASE:
        path = os.path.join(traces_dir, family, block + ".json")
        data = build_vector(path, family, block, why)
        out = f"{family}-{block}.json"
        json.dump(data, open(os.path.join(out_dir, out), "w"), indent=1)
        index.append({"family": family, "block": block, "slot": data["slot"],
                      "why": why, "file": out,
                      "diff_count": len(data["diff"]),
                      "accumulates": bool(data["accumulated_now"])})
        print(f"built {out}: {len(data['diff'])} diff entries, {len(data['events'])} events")
    json.dump(index, open(os.path.join(out_dir, "index.json"), "w"), indent=1)
    print(f"index: {len(index)} showcase vectors")


if __name__ == "__main__":
    main()
