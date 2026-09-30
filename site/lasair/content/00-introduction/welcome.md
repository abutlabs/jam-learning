---
title: Welcome to Learning Lasair
duration: 5 min
---

# Welcome to Learning Lasair

You're about to learn OCaml by reading and writing production blockchain code.

This isn't a typical programming course. We won't start with "Hello World" or build a todo app. Instead, you'll learn by exploring **lasair**, a real implementation of the JAM protocol competing for the Web3 Foundation's JAM Implementer's Prize.

## What is Lasair?

**Lasair** (Irish: "flame") is an OCaml implementation of the JAM protocol, following Graypaper v0.8.0. It's about 60,000 lines of carefully crafted functional code that:

- Implements a RISC-V virtual machine (PVM)
- Handles cryptographic operations (Ring VRF, Ed25519, Blake2b)
- Manages state transitions for a blockchain consensus protocol
- Processes work packages and service accumulation

By the end of this course, you'll understand all of it.

## Why OCaml?

OCaml is a functional programming language with:

- **Strong static typing** - The compiler catches errors before runtime
- **Type inference** - You write less boilerplate, the compiler figures out types
- **Pattern matching** - Elegant handling of data structures
- **Modules and functors** - Powerful abstraction mechanisms

These features make OCaml excellent for implementing complex protocols where correctness matters.

## What is JAM?

JAM (Join-Accumulate Machine) is a next-generation blockchain protocol defined in the [Graypaper](https://graypaper.com). It's designed to be:

- **Scalable** - Parallel work execution across cores
- **Secure** - Formal specification, deterministic execution
- **Flexible** - Services can define custom logic

This course follows Graypaper **v0.8.0**, the version lasair implements. The Graypaper lectures were recorded against earlier versions; where v0.8.0 differs, the lecture notes say what changed.

The JAM Implementer's Prize awards teams that build conformant implementations. Lasair is our entry.

## Course Philosophy

### Simple, Not Easy

These words aren't synonyms—they're orthogonal concepts:

- **Simple** means *one fold*—untangled, no hidden dependencies, each piece does one thing. Simplicity is about **structure**.
- **Easy** means *adjacent*—within reach, familiar, low friction. Easiness is about **proximity to you**.

Something can be simple but hard to reach (functional programming if you've never seen it). Something can be easy but complex (copy-pasting tangled code that happens to work).

This course chooses **simple**. The Notation module isn't easy—it uses functors, phantom types, and advanced OCaml features. But it's *simple*: each type does one thing, boundaries are clear, nothing is entangled. Once you understand it, you can hold it in your head.

We won't hide complexity. We'll show you structurally simple code and give you the context to understand it. The goal isn't speed—it's clarity that compounds.

### Learn by Doing

Every lesson includes exercises. Some run in your browser. Others need a local OCaml install. The exercises aren't optional—they're where learning happens.

### Real Code, Real Context

Every example comes from lasair. When you learn about pattern matching, you'll see how lasair uses it to decode RISC-V instructions. When you learn about functors, you'll see how lasair uses them to create type-safe bounded integers.

## Prerequisites

This course assumes you:

- Can program in some language (Python, JavaScript, Rust—anything)
- Are comfortable with a terminal
- Have basic familiarity with git

No prior OCaml or blockchain experience required.

## Setting Up

For the first two tracks (OCaml Foundations and Functional Patterns), you can use your browser. We'll add an interactive REPL soon.

For Tracks 3-5, you'll need OCaml installed locally:

```bash
# Install opam (OCaml package manager)
# macOS:
brew install opam

# Ubuntu/Debian:
apt install opam

# Initialize opam
opam init
eval $(opam env)

# Install OCaml and development tools
opam switch create 5.1.1
opam install dune merlin ocaml-lsp-server utop
```

lasair's source repository is not public at the moment. The lessons quote the code they discuss and name the file it lives in (for example `lib/pvm.ml`), so you can follow along without a checkout. If you have access to the source, `dune build` in the checkout builds everything.

If all goes well, you're ready.

## How to Use This Course

1. **Read actively** - Don't skim. Pause and think about each concept.
2. **Type the code** - Don't copy-paste. Typing builds muscle memory.
3. **Do the exercises** - They're not optional. Learning requires practice.
4. **Read lasair** - After each lesson, study the lasair code it quotes.
5. **Ask questions** - Open an issue on the [jam-learning repository](https://github.com/abutlabs/jam-learning).

## Choose Your Path

Different starting points for different backgrounds:

### Visual Learner? Start with Graypaper Lectures
Watch Gavin Wood explain the JAM protocol directly. Each video includes ELI5 explanations and connections to Lasair's implementation.

[Start with Graypaper Lectures →](lesson.html?lesson=011-graypaper-lectures/01-nomenclature)

### New to OCaml?
Master the language fundamentals first. Types, pattern matching, modules, and functors.

[Start with OCaml Foundations →](lesson.html?lesson=001-ocaml-foundations/01-types-and-values)

### Know OCaml? Dive into JAM
Understand the protocol architecture before exploring code.

[Start with JAM Protocol →](lesson.html?lesson=01-jam-protocol/01-what-is-jam)

### Ready to Read Code?
Jump straight into Lasair's core modules.

[Start with Lasair Core →](lesson.html?lesson=02-lasair-core/01-notation)
