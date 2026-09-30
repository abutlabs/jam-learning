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
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/_site}"
python3 "$ROOT/tools/check.py"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/site/." "$OUT/"
# authoring files (_TEMPLATE.md, _bank/, ...) feed the builders in tools/; readers never load them
find "$OUT" -mindepth 1 \( -name '__pycache__' -o -name '.DS_Store' -o -name '_*' \) -prune -exec rm -rf {} +
python3 "$ROOT/tools/stamp_assets.py" "$OUT"
echo "built $OUT"
