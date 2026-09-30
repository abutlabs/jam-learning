#!/usr/bin/env python3
"""Cache-busting for the built site: every reference in an HTML page (at any depth) to a
local stylesheet or script gets ?v=<first 10 hex digits of the file's SHA-256>. A changed
file gets a new URL, so no visitor runs a new page with an old cached script. References
resolve relative to the page (site/lasair/lesson.html -> ../assets/js/app.js). The lasair
section's service worker matches cached files ignoring the query, so offline use is
unaffected.

    python3 tools/stamp_assets.py DIR

Exits 1 if nothing was stamped (the build is then not what it should be). Stdlib only.
"""
import glob
import hashlib
import os
import re
import sys

REF = re.compile(r'(href|src)="((?:\.\./)*(?:assets/)?(?:css|js)/[^"?#]+\.(?:css|js))"')


def stamp(out_dir):
    stamped = 0
    for page in sorted(glob.glob(os.path.join(out_dir, "**", "*.html"), recursive=True)):
        with open(page, encoding="utf-8") as fh:
            html = fh.read()

        def sub(m):
            nonlocal stamped
            path = os.path.normpath(os.path.join(os.path.dirname(page), m.group(2)))
            if not os.path.isfile(path):
                return m.group(0)
            with open(path, "rb") as fh:
                digest = hashlib.sha256(fh.read()).hexdigest()[:10]
            stamped += 1
            return '%s="%s?v=%s"' % (m.group(1), m.group(2), digest)
        with open(page, "w", encoding="utf-8") as fh:
            fh.write(REF.sub(sub, html))
    return stamped


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: stamp_assets.py DIR")
    n = stamp(sys.argv[1])
    print("stamped %d asset references" % n)
    sys.exit(0 if n else 1)
