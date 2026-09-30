<!--
FOUNDATIONS STYLE GUIDE (not a lesson; ignored by the link checker)

Reader: a developer who knows Ethereum well (accounts, contracts, gas, EVM, rollups, data availability,
PoS validators, finality). Knows almost none of the Gray Paper yet. The notation-heavy chapter
sheets are too dense to start from. These lessons come FIRST and make the sheets readable.

Frontmatter:
---
title: "F4 · One order's journey: refine on a core"
duration: 10 min
exam_portion: foundation
gp_chapter: F
---

Structure, every story lesson (F2–F9), these ## headings exactly:
## What you already know        (the Ethereum idea this builds on; 2-4 sentences; use <div class="eth-says">…</div> for the one-line Ethereum comparison)
## What JAM does                (plain English, short paragraphs, the jamswap order as the running example)
## The picture                  (ONE inline SVG, see below, then 2-3 sentences walking it)
## The words and symbols        (a small table: plain name | Gray Paper name | symbol | chapter. At most 3 NEW symbols per lesson; plain name always first)
## Why it is built this way     (the design reason, from the GP; anything not in the GP says "(not in the GP)")
## Questions to ask yourself   (2-3 questions in plain words + one line each on where the answer lives: link lesson.html?lesson=06-m1-exam/<sheet>)
F0, F1, F10 may use their own ## headings.

Running example: a trader (Alice) places a jamswap limit order, "buy 10 DOT, pay at most 7 USDC each".
Use only jamswap facts that are in submodules/jamswap/README.md, docs/HOW_IT_WORKS.md,
docs/ARCHITECTURE.md, docs/SEALED_ORDERS.md. If a jamswap detail is not recorded, keep the
example generic ("the service's refine code matches the orders") rather than inventing.

Accuracy: every protocol fact from the GP 0.8.0 tex (submodules/graypaper/text/) or the
already fact-checked sheets in content/06-m1-exam/. Symbols per the 0.8.0 preamble:
ready queue is ω (never ϑ); header fields use CAPITAL subscripts (H_T, H_R, H_P, H_X, H_E, H_W, H_O, H_I, H_V, H_S, H_A); newly available reports are bold R; R* is the accumulatable
sequence. Validator-set sizes are 3c for 2 ≤ c ≤ C. Tiny ticket bound: do not state.

Tone: short sentences, one idea each, no em-dashes, no jargon before its plain meaning.
An Ethereum comparison is an aid, not a claim of equivalence: say where the analogy breaks.

SVG diagrams (inline, in the markdown):
- One <svg class="fdiag" viewBox="0 0 360 H" role="img" aria-label="…"> per lesson, H ≤ 520.
- NO blank lines anywhere inside the <svg>…</svg> block (markdown would break it).
- Vertical flow, top to bottom (phones). At most 6 boxes. Labels at most 4 words; a second
  line in <text class="muted">. Font sizes come from CSS; do not set font-size.
- Classes only, no colours: rect.box (plain), rect.box.hot (the step this lesson is about),
  rect.box.ok (done/final), rect.zone (dashed grouping e.g. "off-chain"), path/line.arrow,
  the arrowhead marker's path gets class "arrowhead". text.title, text.muted, text.hot-text.
- Marker ids must be unique per lesson: <marker id="ah-f04" …>.
- Boxes ~300 wide, x=30; rx=8.

Question bank: content/06-m1-exam/_bank/<lesson id>.md in the _bank/_FORMAT.md format.
Level 1: 12-18 basic questions tagged "@ <## heading>" of this lesson. Level 2: 5-8 applied.
Level 3: 3-5 open. Run: python3 tools/build_exam_data.py --check (no WARN for your files).
-->
