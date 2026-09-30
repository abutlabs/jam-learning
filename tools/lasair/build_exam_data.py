#!/usr/bin/env python3
"""Build site/lasair/data/exam.json from the M1 Understanding lessons.

The markdown lessons in site/lasair/content/06-m1-exam/ are the single source of truth for
the question banks. This script extracts every "### Q<n>" question and its
<details> model answer, together with the lesson's frontmatter, so exam.html
can run flashcards, random-draw mock exams and the grade ledger without any
duplicated content.

Usage:  python3 tools/lasair/build_exam_data.py     # writes site/lasair/data/exam.json
        python3 tools/build_exam_data.py --check    # parse only, exit 1 on problems
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CONTENT = ROOT / "site" / "lasair" / "content" / "06-m1-exam"
OUT = ROOT / "site" / "lasair" / "data" / "exam.json"
TRACK_ID = "06-m1-exam"

FRONT_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)
Q_RE = re.compile(r"^###\s+Q(\d+)\s*(★)?\s*(.+?)\s*$", re.M)
DETAILS_RE = re.compile(
    r"<details>\s*<summary>[^<]*</summary>\s*(.*?)\s*</details>", re.S
)


def parse_frontmatter(text):
    m = FRONT_RE.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')
    return meta, text[m.end():]


def parse_questions(body):
    """Return [{n, star, q, a}] from the '## Question bank' section."""
    idx = body.find("## Question bank")
    if idx < 0:
        return []
    bank = body[idx:]
    heads = list(Q_RE.finditer(bank))
    out = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(bank)
        chunk = bank[h.end():end]
        d = DETAILS_RE.search(chunk)
        out.append({
            "n": int(h.group(1)),
            "star": bool(h.group(2)),
            "q": h.group(3).strip(),
            "a": d.group(1).strip() if d else "",
        })
    return out


SKIP_SECTIONS = re.compile(r"source pointers|external sources|question bank", re.I)
BOLD_BULLET = re.compile(r"^\s*[-*]\s+\*\*(.+?)\*\*[.:]?\s*(.+)$")


def strip_md(t):
    t = re.sub(r"`([^`]*)`", r"\1", t)
    t = re.sub(r"\*\*([^*]*)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]*)\*", r"\1", t)
    t = re.sub(r"<[^>]+>", "", t)
    return t.strip()


def parse_sections(body):
    """Split the teaching part of a lesson into study sections.

    Chapter sheets: the intro paragraph plus every '### ' under '## Chapter sheet'.
    Reference pages (no examiner sheet): every '## ' before the question bank.
    """
    qb = body.find("## Question bank")
    teach = body[:qb] if qb >= 0 else body
    sections = []
    if "## Chapter sheet" in teach:
        head, sheet = teach.split("## Chapter sheet", 1)
        intro = re.sub(r"^#\s.*$|<span class=\"lecture-badge\">.*?</span>", "", head, flags=re.M).strip()
        if intro:
            sections.append({"title": "What this is for", "md": intro})
        parts = re.split(r"^###\s+(.+)$", sheet, flags=re.M)
    else:
        parts = re.split(r"^##\s+(.+)$", teach, flags=re.M)
        intro = re.sub(r"^#\s.*$|<span class=\"lecture-badge\">.*?</span>", "", parts[0], flags=re.M).strip()
        if intro:
            sections.append({"title": "Where we are", "md": intro})
    for i in range(1, len(parts), 2):
        title, md = parts[i].strip(), parts[i + 1].strip()
        if not md or SKIP_SECTIONS.search(title):
            continue
        sections.append({"title": title, "md": md})
    return sections


def table_cards(md):
    """Recall cards from markdown tables: first column is the cue, the rest the answer."""
    cards, lines = [], md.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].lstrip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[-:| ]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows = []
            j = i + 2
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                if len(cells) >= 2 and cells[0] and any(cells[1:]):
                    rows.append(cells)
                j += 1
            # skip trailing "chapter number" style columns that are too short to teach
            keep = [k for k in range(1, len(header)) if any(len(strip_md(r[k])) > 3 for r in rows if k < len(r))]
            for r in rows:
                ans = " · ".join(r[k] for k in keep if k < len(r) and r[k])
                if ans:
                    cards.append({"cue": r[0], "ans": ans, "cueLabel": header[0], "ansLabel": " · ".join(header[k] for k in keep)})
            i = j
        else:
            i += 1
    return cards


def bullet_cards(md):
    out = []
    for line in md.splitlines():
        m = BOLD_BULLET.match(line)
        if m and len(strip_md(m.group(2))) > 15:
            out.append({"cue": m.group(1).rstrip(".:"), "ans": m.group(2).strip(), "cueLabel": "", "ansLabel": ""})
    return out


def recall_groups(sections):
    """Groups of >= 3 sibling cards (a table or a bullet list), so distractors come
    from the same group and are plausible."""
    groups = []
    for si, sec in enumerate(sections):
        for cards in (table_cards(sec["md"]), bullet_cards(sec["md"])):
            if len(cards) >= 3:
                groups.append({"section": si, "title": sec["title"], "cards": cards})
    return groups


BANK = CONTENT / "_bank"


def parse_bank(text, name, problems):
    """Parse _bank/<lesson>.md into {"1": [mc], "2": [mc], "3": [open]}."""
    _, body = parse_frontmatter(text)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    out = {"1": [], "2": [], "3": []}
    for lv_m in re.finditer(r"^##\s+Level\s+([123])\s*$(.*?)(?=^##\s+Level|\Z)", body, re.M | re.S):
        lv, chunk = lv_m.group(1), lv_m.group(2)
        items = re.split(r"^###\s+Q\s+", chunk, flags=re.M)[1:]
        for n, it in enumerate(items, 1):
            lines = it.strip().splitlines()
            q = lines[0].strip()
            rest = lines[1:]
            where = f"{name} L{lv} #{n}"
            sec = next((l[1:].strip() for l in rest if l.startswith("@")), "")
            if lv in ("1", "2"):
                opts = []
                for l in rest:
                    m = re.match(r"^\s*-\s+\[( |x|X)\]\s+(.+)$", l)
                    if m:
                        opts.append({"text": m.group(2).strip(), "correct": m.group(1).lower() == "x"})
                why = " ".join(l[1:].strip() for l in rest if l.startswith(">")).strip()
                why = re.sub(r"^Why:\s*", "", why)
                if not 3 <= len(opts) <= 5:
                    problems.append(f"{where}: {len(opts)} options (need 3-5): {q[:60]}")
                if sum(o["correct"] for o in opts) != 1:
                    problems.append(f"{where}: needs exactly one [x]: {q[:60]}")
                if not why:
                    problems.append(f"{where}: missing '> Why:': {q[:60]}")
                out[lv].append({"q": q, "sec": sec, "opts": opts, "why": why})
            else:
                blk = "\n".join(l[1:].lstrip() if l.startswith(">") else l for l in rest)
                hm = re.search(r"Hint:\s*(.*?)(?=\nAnswer:|\Z)", blk, re.S)
                am = re.search(r"Answer:\s*(.*)", blk, re.S)
                if not am or not am.group(1).strip():
                    problems.append(f"{where}: missing '> Answer:': {q[:60]}")
                out[lv].append({"q": q, "sec": sec, "hint": hm.group(1).strip() if hm else "",
                                "a": am.group(1).strip() if am else ""})
    return out


def build():
    problems = []
    chapters = []
    for path in sorted(CONTENT.glob("*.md")):
        if path.name.startswith("_"):
            continue
        text = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        portion = meta.get("exam_portion", "")
        if not portion:
            problems.append(f"{path.name}: missing exam_portion")
            continue
        qs = parse_questions(body)
        for q in qs:
            if not q["a"]:
                problems.append(f"{path.name}: Q{q['n']} has no <details> model answer")
        sections = parse_sections(body) if portion != "mock" else []
        bank_path = BANK / f"{path.stem}.md"
        bank = parse_bank(bank_path.read_text(encoding="utf-8"), bank_path.name, problems) if bank_path.exists() else {"1": [], "2": [], "3": []}
        titles = [x["title"].lower() for x in sections]
        for lv in ("1", "2", "3"):
            for item in bank[lv]:
                t = item.pop("sec").lower()
                item["si"] = next((i for i, tt in enumerate(titles) if t and (t in tt or tt in t)), -1)
        groups = recall_groups(sections)
        chapters.append({
            "sections": sections,
            "bank": bank,
            "recall": groups,
            "id": path.stem,
            "lesson": f"{TRACK_ID}/{path.stem}",
            "title": meta.get("title", path.stem),
            "portion": portion,
            "bucket": meta.get("exam_bucket", ""),
            "chapter": meta.get("gp_chapter", ""),
            "words": int(meta["gp_words"]) if meta.get("gp_words", "").isdigit() else None,
            "duration": meta.get("duration", ""),
            "questions": qs,
        })
    order = {"foundation": -1, "reference": 0, "random": 1, "fixed": 2, "mock": 3}
    chapters.sort(key=lambda c: (order.get(c["portion"], 9), str(c["chapter"]).zfill(2), c["id"]))
    data = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "portions": {
            "A": {"label": "Small section (random)", "minutes": 20},
            "B": {"label": "Large section (random)", "minutes": 35},
            "C": {"label": "Architecture", "minutes": 20},
            "D": {"label": "Design rationale", "minutes": 20},
            "E": {"label": "PVM / appendix", "minutes": 25},
        },
        "grades": ["P", "M", "D", "U", "F"],
        "chapters": chapters,
    }
    return data, problems


def main():
    data, problems = build()
    total_q = sum(len(c["questions"]) for c in data["chapters"])
    for p in problems:
        print(f"[WARN] {p}")
    total_r = sum(len(g["cards"]) for c in data["chapters"] for g in c["recall"])
    total_s = sum(len(c["sections"]) for c in data["chapters"])
    for lv in ("1", "2", "3"):
        print(f"bank level {lv}: {sum(len(c['bank'][lv]) for c in data['chapters'])} items")
    print(f"{len(data['chapters'])} lessons, {total_q} questions, {total_s} study sections, {total_r} recall cards")
    if "--check" in sys.argv:
        sys.exit(1 if problems else 0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
