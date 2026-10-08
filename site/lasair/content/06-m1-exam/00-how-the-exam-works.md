---
title: "How this track works: what an M1 importer must understand"
duration: 10 min
exam_portion: reference
---

# How this track works: what an M1 importer must understand

<span class="lecture-badge">M1 Understanding</span>

M1 is the first milestone of the JAM Implementer's Prize: a client that imports blocks
correctly. Passing the conformance fuzzer shows that an importer computes the right
state; it does not show that anyone understands *why* each rule is there. This track is
about the second part: the protocol an M1 importer implements, chapter by chapter, for
anyone learning the chain. (As context: the Web3 Foundation also runs an M1 examination
interview for prize applicants, and its scope, Graypaper chapters 3–13 plus JAM's
architecture, design rationale and the PVM, is the scope this track covers. The track is
independent: the Web3 Foundation did not write, review or endorse it.)

## What it covers

Chapters 3–13 of the Graypaper are the state-transition function: what every node does
when it imports a block. Three further pages hold the whole machine together:

| Page | What it covers |
|---|---|
| **Ch. 3–13 sheets** | One sheet per chapter: the state it owns, the transition in plain English, the traps |
| **C · Architecture** | JAM's architecture: chapter 4 plus the Discussion chapter, the whole machine in one picture |
| **D · Design rationale** | Why JAM is built this way: chapters 1, 2 and 20 plus the non-Graypaper JAM literature |
| **E · PVM** | The PVM and its invocations, Appendices A and B, plus codec and Merklization at skim level |

Recall of symbols is not the point. Explaining *mechanism* and *why* is: pick any rule and
say what would break without it.

**The Graypaper here is 0.8.0.** lasair's M1 conformance was against 0.7.2: every
fuzzer lane went green on image `v1.4.2`, and the last 0.7.2 state is tagged
`gp-0.7.2-final`. lasair has since migrated to 0.8.0 (`v2.0.0`; plan and evidence in
`docs/GP_0_8_0_PLAN.md` in lasair) and passes every published 0.8.0 vector. The official
fuzzer's first 0.8.0 batch against lasair's image found four bugs, fixed on 2026-09-30
(lasair 2.0.1); the full 0.8.0 lane sweep is still to come. Each sheet carries a "what
changed" box, and the [what changed](lesson.html?lesson=06-m1-exam/delta-072-080) page
reads the whole diff chapter by chapter. Knowing both versions ("lasair's M1 build
targeted 0.7.2; in 0.8.0 this became …") is the clearest sign you understand a rule
rather than a snapshot of it.

<div class="callout callout-warning">
<div class="callout-title">0.7.2 → 0.8.0: the biggest rewrite is in the PVM</div>

Appendix A (the PVM) changed more than any chapter. In 0.7.2 every instruction cost one
unit of gas. In 0.8.0 the whole basic block is charged in advance, each time execution
enters it or jumps back to its start. The cost comes from a simulated CPU pipeline
(`eq:gascostforblock`). If the remaining gas cannot cover the block, the machine stops
out of gas and the counter is left unchanged. The `sbrk` instruction is gone: the heap now
grows through the `grow_heap` host call, id 1, in Appendix B, which moves every host-call
id after `gas` (0) up by one. The PVM page is written on the 0.8.0 text.

</div>

**The war stories are evidence.** Every bug closed in lasair's conformance campaign is a
protocol lesson someone ran through a differential harness. The
[war stories](lesson.html?lesson=06-m1-exam/war-stories) page files each one under its
chapter. They are the fastest way to see why a rule matters.

## How to use this track

0. **New to JAM? Start with [Foundations](lesson.html?lesson=06-m1-exam/f00-start-here)**
   (F0 to F10, about ten minutes each). It follows one jamswap order through JAM in plain
   English with an Ethereum comparison at every step, and it makes everything below readable.
1. Read the question bank for a chapter **before** the chapter, so the reading has targets.
2. Read the Graypaper section (0.8.0 text) with the existing
   [Graypaper Lectures](lesson.html?lesson=011-graypaper-lectures/16-overview) beside it.
3. Trace each rule to the lasair source named in the sheet's pointers.
4. Write the chapter sheet from memory. Then correct it against the page here.
5. Work the chapter up the difficulty slider in the [Exam Room](exam.html): **1 Learn**
   (read each section, then multiple-choice checks), **2 Recall** (multiple choice across
   the chapter, aim for 80%), **3 Explain** (open questions with a hint first),
   **4** (every question, no hints), **5 Pressure** (★ questions, two minutes each).
   Starting cold, begin at 1. Grade yourself honestly at levels 3 to 5.
6. Next day, re-explain the previous chapter cold for five minutes before starting the new one.

When the chapters feel solid, the two
[full run-throughs](lesson.html?lesson=06-m1-exam/mock-1) test all of it in one sitting,
with a timer.

A word with a dotted underline explains itself: hover over it, tap it or tab to it. Every
Greek letter does, and on this track's pages and in the Exam Room so do the hard terms and
abbreviations (EOA, DA, work-report, tranche...), each at its first use in a section.
