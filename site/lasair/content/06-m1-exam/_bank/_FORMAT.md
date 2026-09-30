---
chapter: <lesson id, e.g. ch05-header>
---

<!--
QUESTION BANK FORMAT (parsed by tools/build_exam_data.py; run it with --check)

One file per M1 Understanding lesson: _bank/<lesson id>.md. Three sections, exact headings.

## Level 1   BASIC multiple choice. Vocabulary, "what is X", "which chapter", "how many",
             "what does this symbol mean", "what happens first". One unambiguous right
             answer and three plausible wrong ones drawn from the same topic.
             Target 25-40 per chapter. Nothing here should need reasoning, only knowing.
## Level 2   APPLIED multiple choice. Scenarios, "which rule rejects this", "what changes
             if", ordering, tiny vs full numbers, cause and effect. Target 15-25.
## Level 3   SHORT OPEN questions answered aloud in 2-4 sentences, with a hint.
             Target 10-15. (Levels 4-5 use the question bank in the sheet.)

Level 1 and 2 item:

### Q What does the header's parent hash commit to?
@ The ten fields
- [x] The Blake2b hash of the parent header's encoding
- [ ] The Merkle root of the parent's posterior state
- [ ] The Keccak hash of the parent block's extrinsic
- [ ] The hash of the genesis header
> Why: H_P = Blake2b(E(parent header)) (GP 0.8.0 §5). It is what links each block to exactly one parent.

  "@ <section title>" is optional: the chapter-sheet ### section this question teaches
  from, copied from the sheet's heading. Level 1 uses it to ask the question right after
  that section is read. Exactly one "- [x]". 3 or 4 options. "> Why:" is required.

Level 3 item:

### Q Why does the header carry the prior state root rather than the posterior one?
> Hint: think about what an author wants to do before Merklization finishes.
> Answer: So block production and Merklization can be pipelined. The author can seal and
> publish before re-Merklizing the new state. The cost: an importer only learns whether its
> result agrees when the next block's header arrives.

Rules: every fact must be checkable in the GP 0.8.0 tex (submodules/graypaper/text/) or,
for lasair facts, in the repo record. No em-dashes. Markdown and `code` are allowed.
-->
