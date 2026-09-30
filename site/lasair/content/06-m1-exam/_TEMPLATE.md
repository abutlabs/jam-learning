---
title: "Ch. N Chapter Name"
duration: 30 min
exam_portion: random
exam_bucket: small
gp_chapter: N
gp_words: 0
gp_tex: text/chapter.tex
lasair: lib/chapter.ml, conformance/chapter_stf.ml
---

<!--
TEMPLATE for M1 Understanding lessons. Copy, fill, delete this comment.

Frontmatter keys are read by tools/build_exam_data.py:
  exam_portion : random | fixed | reference | mock
  exam_bucket  : small | large | either          (random portion only)
  gp_chapter   : chapter number (random) or portion letter C/D/E (fixed)
  gp_tex       : file under submodules/graypaper/text/ this sheet was checked against (GP 0.8.0)
  lasair       : comma-separated source pointers

Body rules:
  - "## Examiner sheet" first, "## Question bank" second. Keep those exact headings: the build
    script and lesson.js parse them (the chapter sheet sits under "## Examiner sheet").
  - Every question is "### Q<n> <text>" — add ★ after Q<n> for the hardest, most central questions.
  - The model answer follows immediately in <details><summary>Model answer</summary> … </details>.
    Leave a blank line after <summary> and before </details> so markdown renders inside.
  - Write answers in plain English first, symbols second. The point is the mechanism and the why.
  - Every rule claimed must be checked against the 0.8.0 tex, not memory. Cite the equation label
    (e.g. eq:recenthistorydef) when it helps the reader find it.
  - Deltas 0.7.2 → 0.8.0 go in a callout-warning and come from `git diff v0.7.2 v0.8.0 -- text/<file>`.
  - War stories are lasair history; cite the lasair doc they are recorded in (code font, no link).
-->

# Ch. N Chapter Name

<span class="lecture-badge">M1 Understanding · Graypaper ch. N</span>

One-paragraph orientation: what this chapter is *for* in the protocol, in two or three sentences.

## Examiner sheet

### State touched
| Symbol | Name | What it holds |
|---|---|---|
| α | authorizer pool | … |

### Inputs
Which header fields and which extrinsic components this transition reads.

### The transition in plain English
Five to ten sentences. No symbols. What goes in, what comes out, in what order.

### Validation rules and what they guard
| Rule | Guards against |
|---|---|
| … | … |

### Edge cases
- Empty extrinsic
- Epoch boundary
- …

### War story
<div class="lasair-connection">

**Name of the bug.** Symptom → GP rule → how it was found → fix → lesson. Recorded in `docs/….md`.

</div>

### 0.7.2 → 0.8.0
<div class="callout callout-warning">
<div class="callout-title">What changed in this chapter</div>

- …

</div>

### Source pointers
- `lib/chapter.ml` — teaching module (types + pure helpers)
- `conformance/chapter_stf.ml` — the vector-tested transition
- `docs/notes/chapter.md` — original study notes

## Question bank

### Q1 ★ Question text?
<details><summary>Model answer</summary>

Answer.

</details>

### Q2 Question text?
<details><summary>Model answer</summary>

Answer.

</details>
