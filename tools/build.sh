#!/usr/bin/env bash
# Build the site: check it (tools/check.py), copy site/ to OUT, and put a content hash on
# every stylesheet and script reference so a new deploy is never mixed with a cached old
# one. The GitHub Pages workflow (.github/workflows/pages.yml) and a local preview run it.
#
#   tools/build.sh [OUT]            # default: _site
#
# Preview what Pages will serve, under the same sub-path as abutlabs.github.io/jam-learning/:
#
#   tools/build.sh /tmp/preview/jam-learning
#   (cd /tmp/preview && python3 -m http.server 8000 --bind 127.0.0.1)
#   open http://127.0.0.1:8000/jam-learning/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
OUT="${1:-$ROOT/_site}"
# OUT is deleted below, so refuse any OUT that holds more than an old build: the repo or a
# directory above it, a directory inside it other than _site, a git checkout, or a
# non-empty directory that is not a previous build (index.html and assets/)
OUT="$(python3 - "$ROOT" "$OUT" <<'PY'
import os, sys
root, out = sys.argv[1], os.path.realpath(sys.argv[2])
def within(p, d): return p == d or p.startswith(d.rstrip(os.sep) + os.sep)
is_build = os.path.isfile(os.path.join(out, "index.html")) and os.path.isdir(os.path.join(out, "assets"))
why = ("it contains the repo" if within(root, out)
       else "it is inside the repo (use _site)" if within(out, root) and not within(out, os.path.join(root, "_site"))
       else "it is a git checkout" if os.path.exists(os.path.join(out, ".git"))
       else "it is not empty and not a previous build" if os.path.isdir(out) and os.listdir(out) and not is_build
       else "")
if why:
    sys.exit("refusing to build into %s: %s" % (sys.argv[2], why))
print(out)
PY
)"
python3 "$ROOT/tools/check.py"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/site/." "$OUT/"
# authoring files (_TEMPLATE.md, _bank/, ...) feed the builders in tools/; readers never load them
find "$OUT" -mindepth 1 \( -name '__pycache__' -o -name '.DS_Store' -o -name '_*' \) -prune -exec rm -rf {} +
python3 "$ROOT/tools/stamp_assets.py" "$OUT"
echo "built $OUT"
