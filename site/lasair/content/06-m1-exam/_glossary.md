<!--
M1 UNDERSTANDING GLOSSARY (not a lesson; tools/lasair/build_glossary_data.py builds
site/lasair/data/glossary.json from it, and tools/check.py fails the build if that json is
stale or an entry breaks a rule below).

On the exam page's cards and on this track's lessons, a term's first use in each section
gets a dotted underline; hovering, tapping or focusing it shows the entry.

### EOA (externally owned account)
also: externally owned account
An Ethereum account controlled by ...

- "### " starts an entry. The heading is the tooltip's bold name. The text before " ("
  is matched in the page; "also:" (optional, the line right after) lists more forms.
- A form matches case-sensitively, plus with a plural s, and a lower-case form also with
  a capital first letter. Not after a letter, digit, _ or - ("in-core" is not "core"),
  nor before a letter, digit or _. The longest form wins where two overlap.
- Every form must be used somewhere in the track, belong to one entry only, and contain
  no Greek letter (app.js explains those itself).
- The explanation: plain words first, at most 320 characters, no em-dashes. Facts as in
  the sheets: checkable in the GP 0.8.0 tex or the repo record. Where the Ethereum
  comparison breaks, say so.
- No "### " entry for a word whose everyday meaning is the right one: an underline
  promises something the reader does not already know.
-->

## Names

### JAM (Join-Accumulate Machine)
The protocol this course is about, specified in the Gray Paper. Work is split in two: a heavy part run in-core by a few validators, and a light part accumulated on-chain by every validator.

### GP (Gray Paper)
also: Gray Paper, Graypaper
JAM's formal specification, by Gavin Wood. This course follows version 0.8.0. Names such as eq:valcount or sec:keyrotation are labels of its equations and sections.

### M1 (milestone 1)
The first milestone of a JAM implementation: a block importer, which checks each block and computes the state it leads to. It covers Gray Paper chapters 3 to 13.

### block importer
also: importer, block import
A client that checks each incoming block and computes the state it leads to. M1 asks for exactly this.

### lasair
abutlabs' JAM client, written in OCaml. It passes every published Gray Paper 0.8.0 conformance vector, and the course uses its code and its bugs as examples.

### PolkaJam
Parity's JAM client. lasair's results are compared with it byte for byte, and both run on shared test nets.

### jamswap
abutlabs' order-book exchange that runs as a JAM service: refine matches the orders in a batch auction, accumulate settles the balances. The course's running example.

### OCaml
A functional programming language with strong static types. lasair is written in it.

### tiny (test configuration)
The small parameter set of the test vectors: 6 validators, 2 cores and 12-slot epochs. "full" is the real one: up to 1,023 validators, 341 cores and 600-slot epochs.

### fuzzer
A tester that feeds a client many generated blocks and compares its state with a reference client's. The official conformance fuzzer found most of the lasair divergences this course studies.

### RFC (request for comments)
A numbered proposal or standard. RFC 7693 is the IETF document that defines Blake2; RFC-31, CoreJam, is the Polkadot Fellowship proposal JAM grew from.

### CoreJam
RFC-31, the Polkadot Fellowship proposal before the Gray Paper: a collect, refine, join and accumulate model, which JAM grew from.

### PR (pull request)
A proposed change to a repository. "GP PR #526" is a change to the Gray Paper's text.

## Ethereum and other chains

### EOA (externally owned account)
also: externally owned account
An Ethereum account controlled by a private key, such as a user's wallet. It signs transactions and has a nonce. JAM has none: every account is a service, run by its own code, and no user calls a service with a signed transaction.

### nonce
A counter in each Ethereum account: every transaction must carry the next number, so a signed transaction cannot be replayed. JAM services need none, since no secret key controls them.

### smart contract
also: contract account
Code deployed on a chain, with its own storage and balance, run by every node when called. A JAM service is the closest match, but its code has two entry points, refine and accumulate.

### EVM (Ethereum Virtual Machine)
Ethereum's virtual machine: a 256-bit stack machine that charges gas per opcode. JAM's counterpart is the PVM.

### mempool
The pool of pending transactions that Ethereum nodes pass around until a block includes them. JAM has none: work-packages go straight to the 3 validators serving one core.

### calldata
The input data of an Ethereum transaction. Rollups once posted their batches as calldata.

### rollup
also: roll-up
A chain that runs its transactions off the main chain and posts the results there. Optimistic rollups allow fraud proofs during a challenge window; SNARK rollups post validity proofs. In JAM, the chain's own validators do the executing, on cores.

### L2 (layer 2)
also: L1
A chain built on a base chain (layer 1, L1), which it relies on for security and settlement. Rollups are L2s.

### sequencer
The operator that orders a rollup's transactions. JAM has no outside operator: a core's work is done by the chain's own validators.

### fraud proof
also: fraud-proof
Evidence that a posted result is wrong, which reverts it and punishes its poster. Optimistic rollups wait days for them; JAM's audits check within seconds, before finality.

### RANDAO
Ethereum's on-chain randomness: each proposer mixes in a value, and the mix helps pick future proposers. JAM's counterpart is the entropy pool, fed by block authors' VRF outputs.

### Casper FFG
also: FFG
Ethereum's finality gadget (Friendly Finality Gadget): validators vote on checkpoints, and a two-thirds vote finalizes them. JAM's counterpart is GRANDPA.

### ETH
Ether, Ethereum's native token, divisible into 10¹⁸ wei.

### DOT
Polkadot's native token. In the jamswap examples, Alice buys DOT and pays in USDC.

### USDC
A token meant to stay worth one US dollar (a stablecoin). In the jamswap examples, the currency Alice pays in.

### Polkadot
The multi-chain network JAM grew out of. JAM reuses much of its machinery: ELVES auditing, GRANDPA finality, BEEFY for bridges.

### parachain
A chain secured by Polkadot's validators, attached to its main chain (the relay chain). The GP notes a parachain slot is procured with a substantial deposit, typically for 24 months. JAM offers services and coretime instead.

### XCMP
Polkadot's cross-chain message passing between parachains. The GP calls it asynchronous and coarse-grained, one reason JAM rethinks how services work together.

### BABE
Polkadot's block production (Blind Assignment for Blockchain Extension): a VRF lottery per slot, so one slot can have more than one winner. JAM uses Safrole instead.

### Sassafras
A Polkadot block-production design with anonymous tickets and exactly one author per slot. Safrole is a simplified variant of it.

### GRANDPA
The finality gadget JAM takes from Polkadot: validators vote on the best chain, and a two-thirds supermajority finalizes a block for good. In JAM it votes only for blocks whose work-reports have been audited.

### BEEFY
A finality protocol for bridges. For each finalized block, every validator makes a BLS signature over the latest accumulation-output commitment, so other chains can check JAM's finality cheaply.

### light client
A node that follows a chain without importing every block, trusting signed proofs of finality instead.

### WASM (WebAssembly)
also: WebAssembly
A portable bytecode format, which Polkadot's parachains run in. JAM's PVM is based on RISC-V instead.

### SNARK
A short proof that a computation was done correctly, quick to check (succinct non-interactive argument of knowledge). The GP does not use them for JAM's work: producing the proof is still far slower than running the code.

### ZK (zero-knowledge)
A proof that reveals nothing but the claim itself. "ZK proofs" here means SNARK-style validity proofs, which JAM replaces with auditing.

## Consensus, time and security

### validator
A staked node that makes and checks blocks. A JAM set holds at most 1,023 (a multiple of 3, at least 6). Besides importing blocks, each one guarantees work on a core, assures availability and audits.

### staking
also: stake
Locking tokens as a deposit to become a validator, so that misbehavior can cost them.

### slashing
Destroying part of a misbehaving validator's stake. The GP only records the offenders; staking and slashing are outside its scope.

### finality
also: finalized, finalised
The point after which a block can never be reverted. In JAM, GRANDPA provides it, and only for blocks whose work-reports have been audited.

### supermajority
More than two thirds of the validators. JAM's security assumes at least two thirds plus one are honest and live.

### best block
The block a node builds on and votes for: it descends from the last finalized block, is audited, holds no equivocation, and has the most ancestors sealed with tickets.

### equivocation
Two different valid blocks for the same timeslot. A node never picks as best a chain whose unfinalized part holds one.

### timeslot
also: slot
A 6-second window in which at most one block can be made. τ counts them from the JAM Common Era.

### epoch
600 timeslots: one hour. Block authors and validator sets change at an epoch boundary. (Tiny test vectors use 12 slots.)

### JAM Common Era
Time zero for JAM's timeslots: midday UTC on 1 January 2025.

### UTC
Coordinated Universal Time, the world's reference clock.

### NTP (Network Time Protocol)
How computers set their clocks over the internet. JAM assumes every node knows the time, and the GP calls relying on NTP for it pragmatic and resilient.

### Safrole
JAM's block production: an anonymous ticket lottery picks each slot's author for the next epoch, so normally nobody knows an author until its block appears. If too few tickets are submitted, a fallback key sequence is used.

### ticket
An anonymous entry in Safrole's lottery for authoring a slot, proved with a ring VRF. The best tickets submitted in an epoch become the next epoch's author order.

### fallback
Safrole's backup: when too few tickets were submitted, the next epoch's authors are a known key sequence drawn with entropy, not tickets. Fallback blocks count for less in the best-block choice.

### seal
also: sealing, sealer
The block author's Bandersnatch signature over the header (H_S). In ticket mode it also shows the author holds that slot's winning ticket.

### entropy
JAM's on-chain randomness (η): every block author's VRF output is mixed in. It drives Safrole, the fallback key sequence and which validators serve which core.

### VRF (verifiable random function)
A function whose output looks random and comes with a proof that a given key made it, so nobody can bias or forge it. JAM uses Bandersnatch VRFs in seals, entropy, tickets and audit selection.

### ring VRF
also: ring root
A VRF proof made on behalf of a group (ring) of keys without revealing which key: a ticket shows that some validator made it, not which one. The ring root commits to the epoch's keys.

### Bandersnatch
An elliptic curve used for JAM's VRFs: block seals, entropy and the ring VRF of tickets.

### Ed25519
A fast signature scheme. JAM validators sign guarantees, assurances and judgments with their Ed25519 keys, and offenders are recorded by these keys.

### BLS (Boneh-Lynn-Shacham)
also: BLS12-381
A signature scheme whose signatures can be combined into one. JAM uses it on the BLS12-381 curve for BEEFY, so bridges can check finality cheaply.

## Hashes and data

### hash
A short fixed-size fingerprint of data: 32 bytes in JAM. Changing any bit of the data changes the hash completely, so a hash commits to its data.

### Blake2b
JAM's main hash function, with 256-bit output (RFC 7693). Headers, state keys and most commitments use it.

### Keccak
Ethereum's hash function (Keccak-256). JAM uses it only where bridges need it: the accumulation-output belt and BEEFY.

### preimage
The data behind a hash: if h is the hash of d, then d is h's preimage. Services store data as preimages, looked up by hash; a service's code is the preimage of its code hash.

### blob
A sequence of bytes treated as opaque data: a service's code, a preimage, a work-item's extrinsic data. (Ethereum's "blobs" are different: cheap temporary data for rollups.)

### Merkle tree
also: Merkle
A tree of hashes whose root commits to every leaf. A short proof (a path of hashes) shows that one leaf is in the tree.

### trie
A tree keyed by the bits of each key. JAM's state is a binary Patricia Merkle trie, and its root hash is the state root.

### Merklization
also: Merklize, Merklized
Computing the single root hash that commits to a structure, such as the whole state.

### MMR (Merkle Mountain Range)
An append-only list of hashes kept as a few perfect Merkle trees (the peaks). Appending and proving inclusion are both cheap.

### MMB (Merkle Mountain Belt)
also: Merkle mountain belt
JAM's variant of an MMR, kept in recent history (β_B): every block appends the root of its accumulation outputs, hashed with Keccak.

### super-peak
The single hash that commits to all the peaks of an MMR or belt. The latest super-peak is what BEEFY signatures cover.

### erasure coding
also: erasure code, erasure-code, erasure-coded, erasure-coding
Splitting data into pieces so that any large enough subset rebuilds it. JAM makes one piece per validator, and any 342 of 1,023 suffice (Reed-Solomon over GF(2¹⁶)).

### Reed-Solomon
The erasure code JAM uses, over the 16-bit field GF(2¹⁶).

### GF (Galois field)
A finite field. GF(2¹⁶) has 65,536 elements; Reed-Solomon coding does its arithmetic there.

### chunk
also: shard
One validator's piece of erasure-coded data. Each assurer keeps its chunks and checks them against the report's erasure root.

### DA (data availability)
also: data availability
Making sure data can be fetched by whoever needs it. JAM spreads erasure-coded chunks over all validators: the Audit DA keeps work bundles until finality, a longer-lived store keeps exported segments for 28 days.

### availability
A work-report is available once more than two thirds of the validators assure they hold its chunks. Only then can it be accumulated.

### availability specification
also: availability spec
The part of a work-report that pins down its erasure-coded data: package hash, bundle length, erasure root, chunk count, segment root and segment count.

### codec
also: serialization, serialize, serialized, serializes
The rules for turning values into bytes and back: the GP's ℰ. Fixed-width integers are little-endian; a variable-length sequence starts with its length as a compact natural.

### compact natural
A variable-length integer encoding in the codec: small numbers take one byte, larger ones more, and the first byte says how many follow.

### little-endian
Least significant byte first. 4,807 (hex 12C7) as 2 bytes is C7 12.

### MSB (most significant bit)
The highest bit of a byte. MSB-first means reading bits from the top, as the state trie does with keys.

## Services and state

### service
JAM's counterpart of a contract account: code, storage and a balance, identified by a 32-bit id. Its code has two entry points, refine and accumulate.

### core
A unit of JAM's parallel compute: not a CPU, but compute time served by 3 validators at a time. There are 341; a smaller validator set activates one per 3 validators.

### in-core
Done by the few validators serving one core, not by the whole chain: refine, guaranteeing, auditing. Its capacity grows with the number of cores.

### on-chain
Done by every validator as part of importing a block: accumulate and every state change. Synchronous, but limited by what one node can do.

### off-chain
Outside the chain's state transition: messages between nodes, refine, erasure coding, audits. An importer does not run it.

### coretime
The right to use a core, bought in advance and given to an authorizer. JAM's main resource, where Ethereum charges gas per transaction.

### posterior (state)
also: prior state
The state after a block or a step, written with a prime (σ′). The prior state is the one before it (σ).

### state root
The Merkle root of the whole state. A JAM header carries the parent's posterior state root, so an author can seal a block before computing its own.

### STF (state-transition function)
also: state transition, state-transition function
The function Υ that takes a state and a block to the next state. M1 is implementing it; the test vectors check it piece by piece.

### header
A block's summary in ten fields: parent hash, prior state root, extrinsic hash, slot, epoch, tickets and offenders markers, author index, VRF signature and seal. The seal signs the rest.

### extrinsic
Data from outside the state. A block's extrinsic has 5 parts: tickets, disputes, preimages, assurances, guarantees; no user transactions. A work-item's extrinsics are blobs sent with its package.

### recent history
What the chain remembers of its last 8 blocks (β): header hashes, state roots and reported packages, plus the accumulation-output belt.

### privileged service
also: privileged, privileges
One of the services named in χ with special powers: the manager, the per-core assigners, the delegator, the registrar, and the always-accumulate services.

### manager
also: manager service
The privileged service that may change the privileges in χ and grant storage deposit credits (gratis storage).

### assigner
A privileged service, one per core, that may set that core's authorizer queue.

### delegator
The privileged service that may set the staging validator keys ι, with the designate host call.

### registrar
The privileged service that alone may create services with ids below 2¹⁶, the protected range.

### always-accumulate
The services named in χ that accumulate in every block, each with a basic gas allowance, whether or not a report names them.

### designate
The host call by which the delegator sets the staging validator keys (ι), the validators queued for a later epoch.

### gratis
A service's gratis storage offset: an allowance, granted by the manager, subtracted from its threshold balance.

### threshold balance
The minimum balance a service must keep for its storage: 100, plus 10 per item, plus 1 per byte, minus its gratis offset.

### footprint
How much storage a service uses: its number of items and of bytes. It sets the threshold balance.

### deposit
The balance a service must keep per item and per byte it stores: the price of on-chain storage. See threshold balance.

### expunge
Delete for good: an unreferenced preimage may be removed once 19,200 slots have passed.

### deferred transfer
A payment, with a 128-byte memo, that one service makes to another from accumulate. The receiver gets it in a later accumulation round, not as a synchronous call.

## Work: package, report, guarantee

### authorizer
Small code that decides which work-packages may use a core. Its hash must be in the core's authorizer pool, and the is-authorized invocation runs it.

### authorizer pool
The up to 8 authorizer hashes a core accepts right now (α). Each block, the one used is removed and one comes in from the authorizer queue.

### authorizer queue
The 80 upcoming authorizer hashes per core (φ), set by the core's assigner service.

### is-authorized
also: Is-Authorized
The PVM run of an authorizer's code on a work-package (Ψ_I), with 50 million gas: it decides whether the package may use the core.

### work-package
A bundle of 1 to 16 work-items for one core, with its authorization and a refinement context. JAM's counterpart of a batch of transactions.

### work-item
also: work item
One job inside a work-package: it names a service, carries a payload and gas limits, and lists the segments it imports and how many it exports.

### work-report
also: work report
What refining a work-package produces: one work-digest per item, plus the availability spec, context, core and authorizer. Guarantors sign it; accumulate applies it.

### work-digest
also: work-result
One work-item's entry in a work-report: service, code hash, payload hash, accumulate gas limit and refine's result (a blob or an error), plus refine's gas used, imports, extrinsics and exports. The GP calls it this since 0.6.5; before, a work-result.

### refine
A service's heavy entry point (Ψ_R, entry point 0): run in-core by one core's validators, stateless, with up to 5 billion gas per package. Its output goes into the work-report.

### accumulate
also: accumulation
A service's on-chain entry point (Ψ_A, entry point 1): run by every validator to apply refine's results to the service's state. Light: 10 million gas per report.

### refinement context
The chain a work-package was built against: an anchor block, a lookup-anchor block and any prerequisite packages. Checked when the report is guaranteed.

### anchor
The recent block a work-package says it was built against. It must be among the last 8 blocks in recent history, with matching state and BEEFY roots.

### lookup anchor
also: lookup-anchor
The block whose state refine reads preimages from (historical lookup). It may be at most 14,400 slots (one day) old.

### prerequisite
A work-package that must be accumulated before this one. Prerequisites plus packages imported from count toward a limit of 8 dependencies.

### segment
A 4,104-byte piece of data a work-item exports, kept erasure-coded by the validators for 28 days so later work-packages can import it. At most 3,072 imports and 3,072 exports per package.

### bundle
The work-package plus everything needed to re-run it: extrinsic data and imported segments with their proofs. At most 13,791,360 bytes; auditors fetch it from the Audit DA.

### guarantee
also: guarantor
A work-report signed by 2 or 3 of the validators assigned to its core (the guarantors), put in a block. The guarantors are accountable if the report is wrong.

### assurance
also: assurer
A validator's signed statement, in a block, of which cores' chunks it holds. Once more than two thirds assure a report's chunks, the report is available.

### ready queue
also: accumulation queue
Work-reports that are available but wait for a prerequisite to be accumulated (ω). Each is accumulated once its dependencies are.

## Audits and disputes

### auditing
also: auditor
Re-running refine to check a work-report. After a report becomes available, a secret random sample of validators audits it, in 8-second tranches; a wrong result starts a dispute. Finality waits for audits.

### tranche
One 8-second round of audit selection. For each auditor who fails to deliver (a no-show), about two more validators join in the next tranche.

### no-show
An auditor who announced an audit but has not delivered its judgment in time. Each no-show brings in more auditors.

### ELVES
Polkadot's auditing and judging scheme (ePrint 2024/961). JAM's is theoretically equivalent: its backing, approval and inclusion are JAM's guaranteeing, auditing and accumulation.

### dispute
The process that settles whether a work-report is valid. Validators sign judgments; a verdict in a block records the report as good, bad or wonky. A bad report is removed and its guarantors punished.

### judgment
One validator's signed vote that a work-report is valid or not. Enough judgments in a block form a verdict.

### verdict
A block's record of the judgments on one report: exactly two thirds plus one positive means good, zero means bad, one third means wonky.

### wonky
A verdict where exactly one third of the judgments are positive: the report's validity seems impossible to judge. Like a bad report, it is cleared from its core.

### culprit
A guarantor who signed a work-report that a verdict found bad. Recorded as an offender.

### fault
also: FAULT, page fault
In disputes: a validator whose signed judgment contradicts the verdict, recorded as an offender. In the PVM: FAULT, the exit when the program touches memory it may not access.

### offender
A validator found to have misbehaved, as a culprit or a fault. Its Ed25519 key is kept in ψ, and it is zeroed out of later validator sets.

## The PVM

### PVM (Polkadot Virtual Machine)
also: Polkadot Virtual Machine
JAM's virtual machine, based on RISC-V (RV64EM): 13 registers of 64 bits, paged memory, gas charged per basic block. It runs is-authorized, refine and accumulate.

### RISC-V
An open instruction set for real CPUs. The PVM is based on its RV64EM variant, which brings existing compilers such as LLVM.

### RV64EM
RISC-V's 64-bit base with the E (embedded: fewer registers) and M (multiply and divide) extensions.

### ISA (instruction set architecture)
The list of instructions a machine understands and what each one does.

### LLVM
A compiler toolkit behind Rust's and many C and C++ compilers. Its existing RISC-V support is one reason the PVM is RISC-V.

### CPU (central processing unit)
A computer's processor. A JAM core is not a CPU.

### ALU (arithmetic logic unit)
The part of a CPU that does arithmetic. The PVM's gas model simulates a CPU with several kinds of units.

### register
One of the PVM's 13 64-bit working variables. A host call reads its arguments from registers and writes its result to register 7.

### RA (return address)
Register 0. At the start it holds 2³² − 2¹⁶, so returning from the entry function halts the program.

### SP (stack pointer)
Register 1. At the start it points to the top of the stack region.

### decode slot
In the PVM gas model's simulated CPU, each cycle has 4 decode slots, and decoding an instruction uses 1 or more of them. Not a timeslot.

### opcode
The number that says which instruction this is.

### basic block
A run of PVM instructions entered only at its start and left only at its end. Since 0.8.0, the PVM charges a basic block's whole gas cost each time execution enters it.

### bitmask
Part of a PVM program: one bit per byte of code, set where an instruction starts.

### jump table
The list of code addresses a PVM program may jump to indirectly. An indirect jump names a position in this table, never a raw address.

### program blob
A PVM program as bytes: its jump table, its code and its opcode bitmask.

### gas
A budget of computation. Every PVM run gets a gas limit and stops, out of gas, when it runs out. JAM sells coretime, but still meters refine and accumulate in gas.

### host call
also: host-call
A PVM program's request to its host, made with the ecalli instruction: read storage, look up a preimage, transfer, create a service. Each has a gas cost.

### ecalli
The PVM instruction that makes a host call.

### HALT
also: halt
PVM exit: the program finished normally.

### PANIC
also: panic
PVM exit: the program hit a trap or did something invalid. In refine the result becomes an error; in accumulate, changes since the last checkpoint are dropped.

### OOG (out of gas)
also: out-of-gas
PVM exit: the gas ran out. In refine the result becomes an error; in accumulate, changes since the last checkpoint are dropped.

### HOST
PVM exit: the program made a host call. The host handles it, then the program continues.

## Host-call result codes

### OK
Host-call result 0: success.

### NONE
Host-call result 2⁶⁴ − 1: the item does not exist.

### WHAT
Host-call result 2⁶⁴ − 2: the host-call name is unknown.

### OOB (out of bounds)
Host-call result 2⁶⁴ − 3: the inner PVM's memory index is not accessible.

### WHO
Host-call result 2⁶⁴ − 4: the index (for example a service id) is unknown.

### FULL
Host-call result 2⁶⁴ − 5: storage is full, or the resource is already allocated.

### CORE
Host-call result 2⁶⁴ − 6: the core index is unknown.

### CASH
Host-call result 2⁶⁴ − 7: insufficient funds.

### LOW
Host-call result 2⁶⁴ − 8: the gas limit is too low.

### HUH
Host-call result 2⁶⁴ − 9: the operation is invalid. For example, the item is already solicited, cannot be forgotten, or the caller lacks the privilege.

## Tools

### FFI (foreign function interface)
How a program in one language calls code written in another: lasair's OCaml calls its Ed25519 and Bandersnatch libraries this way.

### ASN (ASN.1)
The schema language the official test vectors are described in.

### JAMNP (JAM networking protocol)
also: JAMNP-S
How JAM nodes talk to each other. JAMNP-S is its simple first version.
