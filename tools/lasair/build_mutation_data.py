#!/usr/bin/env python3
"""Enrich the mutation engine's per-class report (bin/fuzz_driver
--mutate-report) into site/data/mutation.json for the Mutation Lab page.

Usage: build_mutation_data.py <report.json> [rounds] [families]
"""
import json, sys, os

# Hand-authored teaching metadata, keyed by mutation class. The counts and
# the real rejection reason come from the engine's report.
META = {
    "seal-bitflip": ("header-crypto",
        "Flip one bit in the 96-byte block seal.",
        "the header seal (Bandersnatch IETF VRF)"),
    "vrf-bitflip": ("header-crypto",
        "Flip one bit in the 96-byte entropy-source VRF signature.",
        "the entropy-source VRF verification"),
    "author-out-of-range": ("header-crypto",
        "Set the author index past the validator count.",
        "the author-index bound"),
    "author-swap": ("header-crypto",
        "Name a different (valid) validator as author.",
        "the header seal (signed by the real author's key)"),
    "parent-tamper": ("header-crypto",
        "Flip one bit in the parent-block hash.",
        "the parent lookup (no such block on this chain)"),
    "extrinsic-hash-tamper": ("commitment",
        "Flip one bit in the header's extrinsic-hash commitment.",
        "the extrinsic-hash commitment"),
    "truncate": ("decode",
        "Cut a random tail off the encoded block.",
        "the codec (decode runs out of bounds)"),
    "garbage-append": ("decode",
        "Append junk bytes after a well-formed block.",
        "the frame check (trailing bytes after the body)"),
    "assurance-reorder": ("ordering",
        "Swap two availability assurances, then recompute the extrinsic hash.",
        "the header seal (it signs the recomputed hash)"),
    "assurance-duplicate": ("ordering",
        "Duplicate an assurance, then recompute the extrinsic hash.",
        "the header seal (it signs the recomputed hash)"),
    "ticket-reorder": ("ordering",
        "Swap two safrole tickets, then recompute the extrinsic hash.",
        "the header seal (it signs the recomputed hash)"),
    "guarantee-sig-bitflip": ("signature",
        "Flip a bit in a guarantee credential, then recompute the extrinsic hash.",
        "the header seal (it signs the recomputed hash)"),
    "assurance-sig-bitflip": ("signature",
        "Flip a bit in an assurance signature, then recompute the extrinsic hash.",
        "the header seal (it signs the recomputed hash)"),
    "random-flip": ("liveness",
        "Flip one random bit anywhere in the block.",
        "whichever layer the bit lands under (or none — a benign flip)"),
}

GROUPS = {
    "header-crypto": "Header cryptography",
    "commitment": "The extrinsic-hash commitment",
    "decode": "Decode & framing",
    "ordering": "Ordering / uniqueness",
    "signature": "Signature layer",
    "liveness": "Broad random flips",
}

WALLS = [
    {"id": "frame", "name": "Frame", "desc":
        "The length prefix and exact-consumption check. Malformed frames "
        "are answered and the connection dropped — never the process."},
    {"id": "codec", "name": "Codec", "desc":
        "Every field decodes with bounds checks. Truncated or oversized "
        "input fails fast as a named error, never an allocation blow-up."},
    {"id": "header", "name": "Header seal", "desc":
        "The seal is a Bandersnatch VRF over the whole unsigned header — "
        "including the author and the extrinsic-hash. Touch any of them "
        "without the validator's key and it no longer verifies."},
    {"id": "commit", "name": "Extrinsic commitment", "desc":
        "The extrinsic-hash commits to every extrinsic byte. Change the "
        "extrinsic and either this check fails, or — if you recompute it — "
        "the seal above does. There is no keyless gap between them."},
]

def main():
    report = sys.argv[1]
    rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    families = sys.argv[3].split(",") if len(sys.argv) > 3 else []
    data = json.load(open(report))
    classes = []
    tot = dict(applied=0, rejected=0, alive_ok=0, wrong_accept=0, crash=0, hang=0)
    for c in data["classes"]:
        name = c["class"]
        group, corrupts, wall = META.get(name, ("liveness", "", "—"))
        for k in tot:
            tot[k] += c.get(k, 0)
        verdict = ("rejected" if c["rejected"] > 0 and c["wrong_accept"] == 0
                   else "alive" if c["alive_ok"] > 0 else "—")
        classes.append({
            "class": name, "group": group, "group_label": GROUPS[group],
            "corrupts": corrupts, "expect": "Alive" if name == "random-flip" else "Reject",
            "wall": wall, "reason": c.get("sample_reason", ""),
            "applied": c["applied"], "rejected": c["rejected"],
            "alive_ok": c["alive_ok"], "wrong_accept": c["wrong_accept"],
            "crash": c["crash"], "hang": c["hang"], "verdict": verdict,
        })
    out = {
        "summary": {
            "total_checks": tot["applied"],
            "rejected": tot["rejected"], "alive_ok": tot["alive_ok"],
            "wrong_accept": tot["wrong_accept"], "crash": tot["crash"],
            "hang": tot["hang"], "rounds": rounds, "families": families,
        },
        "walls": WALLS,
        "classes": classes,
    }
    here = os.path.dirname(os.path.abspath(__file__))
    dst = os.path.join(here, "..", "site", "data", "mutation.json")
    json.dump(out, open(dst, "w"), indent=1)
    print(f"wrote {dst}: {tot['applied']} checks, "
          f"{tot['wrong_accept']} wrong-accept, {tot['crash']} crash, {tot['hang']} hang")

if __name__ == "__main__":
    main()
