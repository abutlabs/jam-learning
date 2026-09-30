#!/usr/bin/env python3
"""Check the site before it is built or published. Exits 1 and lists every problem.

- Every lesson a section's data/course.json lists exists (site/<section>/content/...), and
  every lesson file is listed.
- Links between lessons resolve: lesson.html?lesson=<track>/<lesson> within a section,
  ../<section>/lesson.html?lesson=... across sections, and relative file links.
- It is a public site: nothing may point where a reader cannot follow.
    * no links into github.com/abutlabs/lasair (a private repository)
    * no Netlify URLs (the old, password-protected home of the lasair course)
    * no local absolute paths (/Users/..., /home/...)
    * no real run ids of our own networks (NET-YYYYMMDDTHHMMSSZ). A reader gets their own
      from `obs begin`; examples use an obviously made-up net (mynet, localnet, example)
      or a placeholder such as <your run id>.
    * no root-absolute href/src in pages, scripts or styles (the site is served from
      /jam-learning/, so "/x" would leave it)
- Every page has the one top bar: an empty <nav id="site-nav"> followed by the script
  assets/js/nav.js, which fills it, and no bar of its own (nav-links, a theme toggle).

    python3 tools/check.py

Stdlib only.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
SECTIONS = ("together", "lasair", "observability")
EXAMPLE_NETS = {"mynet", "localnet", "example", "yournet", "your-net", "net"}

MD_LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
LESSON = re.compile(r"^((?:\.\./(\w+)/)?)lesson\.html\?lesson=([\w.-]+)/([\w.-]+)(?:#[\w-]*)?$")
RUN_ID = re.compile(r"\b([a-z0-9][a-z0-9-]*?)-20\d{6}T\d{6}Z\b")
FORBIDDEN = [
    (re.compile(r"github\.com/abutlabs/lasair(?!-)"), "links into the private lasair repository"),
    (re.compile(r"netlify\.app"), "points at the old Netlify site"),
    (re.compile(r"/Users/[A-Za-z]|/home/[a-z]+/"), "a local absolute path"),
]
ROOT_ABS = re.compile(r"""(?:href|src)\s*=\s*["']/(?!/)""")
NAV_SLOT = '<nav id="site-nav" class="top-nav" aria-label="Main navigation"></nav>'
SITE_NAV = re.compile(re.escape(NAV_SLOT) + r'\s*<script src="((?:\.\./)*)assets/js/nav\.js"></script>')
OWN_BAR = re.compile(r'class="nav-links"|id="theme-toggle"|class="top-nav"')


def lessons(section):
    with open(os.path.join(SITE, section, "data", "course.json"), encoding="utf-8") as fh:
        course = json.load(fh)
    out = set()
    for track in course["tracks"]:
        items = track.get("lessons") or [l for s in track.get("sections", []) for l in s["lessons"]]
        for lesson in items:
            out.add("%s/%s" % (track["id"], lesson["id"]))
    return out


def text_files():
    for ext in ("md", "html", "js", "json", "css", "webmanifest"):
        for path in glob.glob(os.path.join(SITE, "**", "*." + ext), recursive=True):
            yield path      # the generated OCaml toplevel too: a rebuild embeds the builder's opam paths


def main():
    problems = []
    listed = {s: lessons(s) for s in SECTIONS}
    for s in SECTIONS:
        for key in sorted(listed[s]):
            if not os.path.isfile(os.path.join(SITE, s, "content", key + ".md")):
                problems.append("%s: course.json lists %s, which has no .md" % (s, key))
        for path in glob.glob(os.path.join(SITE, s, "content", "*", "*.md")):
            if os.path.basename(path).startswith("_"):     # authoring templates, not lessons
                continue
            key = os.path.relpath(path, os.path.join(SITE, s, "content"))[:-3]
            if key not in listed[s]:
                problems.append("%s: %s is not listed in course.json" % (s, key))

    for path in text_files():
        rel = os.path.relpath(path, ROOT)
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        for n, line in enumerate(text.splitlines(), 1):
            for rx, why in FORBIDDEN:
                if rx.search(line):
                    problems.append("%s:%d: %s" % (rel, n, why))
            for m in RUN_ID.finditer(line):
                if m.group(1) not in EXAMPLE_NETS:
                    problems.append("%s:%d: a run id of one of our networks (%s)" % (rel, n, m.group(0)))
            if not path.endswith(".md") and ROOT_ABS.search(line):
                problems.append("%s:%d: a root-absolute URL" % (rel, n))
        if path.endswith(".md"):
            section = os.path.relpath(path, SITE).split(os.sep)[0]
            for target in MD_LINK.findall(text):
                if re.match(r"^(https?:|mailto:|#)", target):
                    continue
                m = LESSON.match(target)
                if m:
                    sec = m.group(2) or section
                    key = "%s/%s" % (m.group(3), m.group(4))
                    if sec not in listed or key not in listed[sec]:
                        problems.append("%s: broken lesson link %s" % (rel, target))
                    continue
                bare = target.split("#")[0].split("?")[0]
                if bare.endswith((".html", "/")):
                    base = os.path.join(SITE, section)       # pages resolve from the section dir
                else:
                    base = os.path.dirname(path)
                dest = os.path.normpath(os.path.join(base, bare))
                if not os.path.exists(dest):
                    problems.append("%s: broken link %s" % (rel, target))

    for path in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True):
        rel = os.path.relpath(path, ROOT)
        with open(path, encoding="utf-8") as fh:
            html = fh.read()
        bars = SITE_NAV.findall(html)
        depth = os.path.relpath(path, SITE).count(os.sep)
        if bars != ["../" * depth]:
            problems.append("%s: needs the shared top bar once (site-nav + %sassets/js/nav.js)"
                            % (rel, "../" * depth))
        if OWN_BAR.search(html.replace(NAV_SLOT, "")):
            problems.append("%s: writes its own top bar; assets/js/nav.js is the only one" % rel)

    for p in problems:
        print(p)
    print("%d problem(s)" % len(problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
