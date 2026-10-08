#!/usr/bin/env python3
"""Build site/lasair/data/glossary.json from content/06-m1-exam/_glossary.md.

The glossary explains the hard terms and abbreviations of M1 Understanding: in the
exam page's cards and on the track's lessons, a term's first use in each section gets a
dotted underline, and hovering, tapping or focusing it shows its entry (assets/js/app.js).

Usage:  python3 tools/lasair/build_glossary_data.py           # writes the json
        python3 tools/lasair/build_glossary_data.py --check   # parse only, exit 1 on problems

tools/check.py runs build() too, so the build fails on a broken entry or on a json that
is not what the markdown builds. Stdlib only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TRACK = ROOT / "site" / "lasair" / "content" / "06-m1-exam"
SOURCE = TRACK / "_glossary.md"
OUT = ROOT / "site" / "lasair" / "data" / "glossary.json"

MAX_TIP = 320                     # characters: a tooltip, not a lesson
GREEK = re.compile(r"[Ͱ-Ͽ]")  # app.js explains Greek letters itself


def parse(text):
    """[(term, also_line, tip_lines, line_number)] from the ### entries; other headings
    only group them."""
    text = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    entries, cur = [], None
    for n, line in enumerate(text.splitlines(), 1):
        if line.startswith("### "):
            cur = [line[4:].strip(), "", [], n]
            entries.append(cur)
        elif line.startswith("#"):
            cur = None
        elif cur is not None and line.startswith("also:") and not cur[2]:
            cur[1] = line[5:]
        elif cur is not None and line.strip():
            cur[2].append(line.strip())
    return entries


def uses(form, corpus):
    """How often the page code would match form (or form + s) in the track's text.
    Mirrors app.js: no letter, digit, _ or - before; no letter, digit, _ or file extension
    (".tex") after; a lower case first letter also matches capitalised."""
    first = re.escape(form[0])
    if form[0].islower():
        first = "[%s%s]" % (re.escape(form[0]), re.escape(form[0].upper()))
    return len(re.findall(r"(?<![\w-])%s%s(?:e?s)?(?!\w|\.\w)" % (first, re.escape(form[1:])), corpus))


def build():
    problems, out, owner = [], [], {}
    pages = [p for p in TRACK.glob("*.md") if not p.name.startswith("_")]
    corpus = "\n".join(p.read_text(encoding="utf-8") for p in sorted(pages + list((TRACK / "_bank").glob("*.md"))))
    for term, also, tip_lines, n in parse(SOURCE.read_text(encoding="utf-8")):
        where = "_glossary.md:%d %s" % (n, term)
        head = term.split(" (")[0].strip()
        forms = [head] + [f.strip() for f in also.split(",") if f.strip()]
        tip = " ".join(tip_lines)
        if not tip:
            problems.append("%s: no explanation" % where)
        if len(tip) > MAX_TIP:
            problems.append("%s: %d characters, over %d" % (where, len(tip), MAX_TIP))
        if ": " in term:
            problems.append("%s: a term may not contain ': ' (the tooltip splits there)" % where)
        if "—" in term + tip:
            problems.append("%s: an em-dash" % where)
        for f in forms:
            if GREEK.search(f):
                problems.append("%s: form %r has a Greek letter" % (where, f))
            elif f in owner:
                problems.append("%s: form %r is already %s's" % (where, f, owner[f]))
            elif not uses(f, corpus):
                problems.append("%s: form %r is not used in the track" % (where, f))
            owner[f] = term
        out.append({"term": term, "forms": forms, "tip": tip})
    return out, problems


def main():
    entries, problems = build()
    for p in problems:
        print("[WARN] %s" % p)
    print("%d glossary entries, %d forms" % (len(entries), sum(len(e["forms"]) for e in entries)))
    if "--check" in sys.argv:
        sys.exit(1 if problems else 0)
    OUT.write_text(json.dumps(entries, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote %s" % OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
