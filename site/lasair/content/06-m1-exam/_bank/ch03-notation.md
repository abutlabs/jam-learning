---
chapter: ch03-notation
---

## Level 1

### Q In the Gray Paper, what does a lower-case Greek letter such as σ or κ usually denote?
@ Typography
- [ ] A function introduced by the paper
- [x] A value with a consistent meaning throughout the paper, such as a state component
- [ ] A set that lasts the whole paper
- [ ] An imported function such as a hash
> Why: §3.1: values which hold a consistent meaning throughout the work use lower-case Greek letters, e.g. σ the state.

### Q What does an upper-case Greek letter such as Υ or Ψ denote?
@ Typography
- [x] A function introduced by the paper itself
- [ ] A state component
- [ ] A set of numbers
- [ ] A local index variable
> Why: §3.1: non-context-dependent functions introduced in the work use upper-case Greek, e.g. Υ the state-transition function.

### Q What does a calligraphic letter such as ℋ denote?
@ Typography
- [ ] A state component
- [ ] A set of sequences
- [x] An imported function not defined by the paper, such as Blake2b
- [ ] A protocol constant
> Why: §3.1: imported functions used but not introduced by the work are calligraphic, e.g. ℋ the Blake2 hash.

### Q What does a blackboard-bold letter such as ℕ denote?
@ Typography
- [ ] A local Boolean
- [x] A set that keeps its definition throughout the paper
- [ ] A posterior state value
- [ ] A PVM register
> Why: §3.1: sets are usually written in blackboard typeface, e.g. ℕ all naturals including zero.

### Q What does bold type (for example **s** or **a**) signal?
@ Typography
- [x] A sophisticated or multidimensional value, typically a sequence or set, often local to one equation
- [ ] A constant that differs between tiny and full
- [ ] A value that has been hashed
- [ ] A value serialized with the codec
> Why: §3.1: bold emphasises that a term is sophisticated or multidimensional, especially sequences and sets.

### Q What does y ≺ x mean?
@ Functions and operators
- [ ] y is smaller than x
- [ ] y is computed before x
- [x] y may be defined purely in terms of x
- [ ] y is a subsequence of x
> Why: §3.2: the precedes relation, y ≺ x ⇔ there exists f with y = f(x). The Overview's dependency graph is written with it.

### Q What does the substitute-if-nothing function return for ∅(∅, 1, ∅, 2)?
@ Functions and operators
- [ ] ∅
- [x] 1
- [ ] 2
- [ ] 3
> Why: §3.2: it returns the first argument that is not ∅. The paper's own example gives 1.

### Q What does the symbol ∅ mean in the Gray Paper?
@ Sets
- [ ] An error or invalid value
- [ ] Boolean false
- [x] A value validly left without a specific value (none)
- [ ] The zero hash
> Why: §3.3: ∅ indicates a term validly left without a value; its cardinality is zero.

### Q Which symbol marks an unexpected failure or invalid value?
@ Sets
- [ ] ∅
- [ ] ⊥
- [x] ∇
- [ ] H⁰
> Why: §3.3 uses ∇ for error and deliberately avoids ⊥, which could be read as Boolean false.

### Q What does A? mean for a set A?
@ Sets
- [x] A together with the extra element ∅ (an optional value)
- [ ] The power set of A
- [ ] The cardinality of A
- [ ] A with duplicates removed
> Why: §3.3: A? ≡ A ∪ {∅}. In code this is an option type.

### Q What does f^# mean?
@ Sets
- [ ] The inverse of f
- [ ] f applied twice
- [x] f applied to every member of a set or sequence
- [ ] The hash of f's output
> Why: §3.3 and §3.7: the # superscript maps a function over all items.

### Q Does ℕ include zero?
@ Numbers
- [x] Yes
- [ ] No, it starts at 1
- [ ] Only when subscripted
- [ ] Only for sequence lengths
> Why: §3.4: ℕ = {0, 1, …}, the naturals including zero.

### Q What set is ℕ_n?
@ Numbers
- [ ] Naturals up to and including n
- [x] Naturals strictly less than n
- [ ] Naturals of exactly n bits
- [ ] Integers from −n to n
> Why: §3.4: ℕ_n = {x ∈ ℕ : x < n}.

### Q ℤ_{2…5} is which set?
@ Numbers
- [ ] {2, 3, 4, 5}
- [x] {2, 3, 4}
- [ ] {3, 4, 5}
- [ ] {3, 4}
> Why: §3.4: ℤ_{a…b} is the half-open interval [a, b). The paper's example gives {2, 3, 4}.

### Q What does ℤ_{a…+b} denote?
@ Numbers
- [ ] Integers from a to b inclusive
- [x] Offset/length form: the integers in [a, a+b)
- [ ] Integers greater than a+b
- [ ] b copies of a
> Why: §3.4: ℤ_{a…+b} is short for ℤ_{a…a+b}.

### Q The set of blob lengths ℕ_L is equivalent to which set?
@ Numbers
- [ ] ℕ_{2^8}
- [ ] ℕ_{2^16}
- [x] ℕ_{2^32}
- [ ] ℕ_{2^64}
> Why: §3.4: ℕ_L, the set of octet-sequence lengths, equals ℕ_{2^32}.

### Q What is a dictionary 𝔻⟨K→V⟩?
@ Dictionaries
- [x] A set of key→value pairs with at most one value per key
- [ ] A sequence of values indexed by position
- [ ] A function from V back to K
- [ ] A set of keys only
> Why: §3.5: a partial mapping represented as its enumerable pairs, each key associated with at most one value.

### Q What happens if a block relies on subscripting a dictionary with a key that is not present?
@ Dictionaries
- [ ] The result is ∅ and processing continues
- [ ] The result is the zero hash
- [x] The block is invalid
- [ ] The key is inserted with a default value
> Why: §3.5: subscripting implicitly asserts the key exists; if it does not, the result is undefined and any block relying on it must be considered invalid.

### Q When two dictionaries are combined with ∪ and both contain the same key, which value wins?
@ Dictionaries
- [ ] The left operand's
- [x] The right operand's
- [ ] Neither; the key is removed
- [ ] The block is invalid
> Why: §3.5: d ∪ e ≡ (d ∖ keys(e)) ∪ e, prioritising the right-side operand.

### Q What does 𝒱(d), the values of a dictionary, return when two keys share a value?
@ Dictionaries
- [x] A set containing that value once
- [ ] A sequence containing it twice
- [ ] An error
- [ ] Only the value of the first key
> Why: §3.5: the co-domain of 𝒱 is a set, so equal values appear once.

### Q If t = (a: 3, b: 5), what is t_b?
@ Tuples
- [ ] 3
- [x] 5
- [ ] (3, 5)
- [ ] b
> Why: §3.6: named tuple components are accessed by subscripting the name. This is why the paper writes H_T, H_P and so on.

### Q What does ⟦T⟧ₙ denote?
@ Sequences
- [ ] Sequences of T of at most n elements
- [x] Sequences of exactly n elements of T
- [ ] Sequences of at least n elements of T
- [ ] The n-th element of T
> Why: §3.7: exactly n; the :n and n: subscripts mean at most n and at least n.

### Q What does ⟦T⟧_{:n} denote?
@ Sequences
- [x] Sequences of at most n elements of T
- [ ] Sequences of exactly n elements
- [ ] Sequences of at least n elements
- [ ] The first n elements of T
> Why: §3.7: ⟦T⟧_{:n} is at most n. The authorizer pool is ⟦ℍ⟧_{:O}.

### Q What is [0, 1, 2, 3]_{1…+2}?
@ Sequences
- [ ] [0, 1]
- [x] [1, 2]
- [ ] [1, 2, 3]
- [ ] [2, 3]
> Why: §3.7: two elements starting at index 1, as in the paper's own example.

### Q What does cyclic subscription s[i] with the ↺ mark compute?
@ Sequences
- [ ] s[i] or ∅ if i is out of range
- [x] s[i mod |s|]
- [ ] s[|s| − i]
- [ ] The last element of s
> Why: §3.7: modulo subscription wraps around the length. The authorizer queue is read this way at index H_T.

### Q In a sequence comprehension, what does ⟸ (rather than ∈) signal?
@ Sequences
- [x] The elements are taken in order, so the result's order matters
- [ ] The elements are taken without duplicates
- [ ] The elements are hashed first
- [ ] The comprehension is over a dictionary
> Why: §3.7 Construction: ⟸ is used when ordering matters; ∈ is unordered.

### Q What does the overleft-arrow notation ←sⁿ (last n) keep?
@ Sequences
- [ ] The first n elements
- [x] The final n elements
- [ ] Every n-th element
- [ ] The elements at indices below n
> Why: §3.7 Editing: the right arrow keeps the first n and the left arrow the final n. Recent history and the authorizer pool keep their newest entries this way.

### Q What does s ∖ₗ {v} (sequence subtraction) remove?
@ Sequences
- [ ] Every element equal to v
- [x] Only the leftmost element equal to v
- [ ] Only the rightmost element equal to v
- [ ] The element at index v
> Why: §3.7 Editing: some sequence s excepting the left-most element equal to v.

### Q What is bits([160, 0])?
@ Sequences
- [x] [1, 0, 1, 0, 0, …], most significant bit first
- [ ] [0, 0, 0, 0, 0, 1, 0, 1, …], least significant bit first
- [ ] [160, 0]
- [ ] [1, 6, 0, 0]
> Why: §3.7 Boolean values: bits() lists bits most significant first; 160 = 0b10100000.

### Q Is an octet treated as exactly the same thing as a natural number below 256?
@ Sequences
- [ ] Yes, they are interchangeable in all contexts
- [x] No: an octet always serializes to itself, a natural may serialize to several octets
- [ ] Only when inside a hash
- [ ] Only in the PVM
> Why: §3.7 Octets and Blobs: the two are coerced but not treated as exactly equivalent, especially for serialization.

### Q What is ℍ?
@ Cryptography
- [ ] The set of Bandersnatch keys
- [x] The set of 256-bit (32-octet) values that hashes output
- [ ] The Keccak function
- [ ] The header
> Why: §3.8: ℍ denotes 256-bit values equivalent to 𝕐₃₂.

### Q Which hash function is ℋ, the default?
@ Cryptography
- [x] Blake2b-256
- [ ] Keccak-256
- [ ] SHA-256
- [ ] Blake3
> Why: §3.8: ℋ is the Blake2b 256-bit hash (RFC 7693).

### Q Which hash is ℋ_K?
@ Cryptography
- [ ] Blake2s-256
- [ ] SHA3-512
- [x] Keccak-256
- [ ] Poseidon
> Why: §3.8: ℋ_K is Keccak-256, as used by Ethereum.

### Q What is H⁰?
@ Cryptography
- [ ] The genesis header hash
- [x] The zero hash, 32 zero octets
- [ ] The hash of the empty string
- [ ] The first entropy value
> Why: §3.8: H⁰ is the value equal to [0]₃₂.

### Q Before a value is hashed, what is done to it?
@ Cryptography
- [x] It is passed through the serialization codec ℰ
- [ ] It is sorted
- [ ] It is compressed
- [ ] It is signed
> Why: §3.8: inputs of a hash function should be passed through ℰ to yield an octet sequence.

### Q ℰ₄(x) asserts what about x?
@ Cryptography
- [ ] x is a 4-bit value
- [x] x is a natural below 2^32, encoded as 4 octets
- [ ] x has 4 elements
- [ ] x is 4 bytes after compact encoding
> Why: §3.8: the subscript gives the number of octets; ℰ₄(x) asserts x ∈ ℕ_{2^32} and yields 𝕐₄.

### Q How long is an Ed25519 signature?
@ Cryptography
- [ ] 32 octets
- [x] 64 octets
- [ ] 96 octets
- [ ] 784 octets
> Why: §3.8: Ed25519 signatures are in 𝕐₆₄.

### Q How long is a (singly contextualized) Bandersnatch VRF signature?
@ Cryptography
- [ ] 64 octets
- [x] 96 octets
- [ ] 144 octets
- [ ] 784 octets
> Why: §3.8: Bandersnatch signatures are in 𝕐₉₆.

### Q How long is a Bandersnatch Ring VRF proof?
@ Cryptography
- [ ] 96 octets
- [ ] 144 octets
- [ ] 512 octets
- [x] 784 octets
> Why: §3.8: Ring VRF proofs are in 𝕐₇₈₄, under a ring root in 𝕐₁₄₄.

### Q What distinguishes a Ring VRF proof from a plain Bandersnatch signature?
@ Cryptography
- [ ] The Ring VRF proof has no VRF output
- [x] The signer is anonymous within the ring rather than identified
- [ ] The Ring VRF proof does not bind a message
- [ ] The Ring VRF proof uses Ed25519
> Why: §3.8: both imply a member used their secret with context and message; the member is identified in the signature and anonymous in the ring proof.

### Q The VRF output 𝒴 of a Bandersnatch signature depends on which inputs?
@ Cryptography
- [x] The key and the context x, but not the message m
- [ ] The message m only
- [ ] The key, x and m
- [ ] The ring root only
> Why: §3.8: the VRF output is a high-entropy hash influenced by x but not by m.

### Q What are BLS12-381 keys used for?
@ Cryptography
- [ ] Sealing blocks
- [ ] Signing guarantees
- [x] Beefy commitments for bridges (outside M1)
- [ ] Ticket proofs
> Why: §3.8 defines BLS keys (𝕐₁₄₄); they serve Beefy, not the M1 state transition.

### Q What is the epoch length E in the full configuration?
@ Constants worth knowing
- [ ] 12 slots
- [ ] 100 slots
- [x] 600 slots
- [ ] 3600 slots
> Why: Definitions: E = 600 slots of P = 6 s, one hour. Tiny uses 12.

### Q How many cores C in the full configuration?
@ Constants worth knowing
- [ ] 2
- [ ] 300
- [x] 341
- [ ] 1023
> Why: Definitions: C = 341. Tiny uses 2.

### Q What is the slot period P?
@ Constants worth knowing
- [ ] 2 seconds
- [x] 6 seconds
- [ ] 12 seconds
- [ ] 60 seconds
> Why: Definitions: P = 6 seconds, the same in tiny and full.

### Q How many entries does recent history keep (H)?
@ Constants worth knowing
- [ ] 4
- [x] 8
- [ ] 16
- [ ] 24
> Why: Definitions: H = 8 blocks, in both configurations.

### Q What are the authorizer pool size O and queue size Q?
@ Constants worth knowing
- [x] 8 and 80
- [ ] 80 and 8
- [ ] 8 and 600
- [ ] 16 and 80
> Why: Definitions: O = 8, Q = 80, same in tiny and full.

## Level 2

### Q A reader sees `𝔻⟨ℍ→ℍ⟩` in the recent-history definition. Which OCaml-style type best models it?
- [ ] `hash list`
- [x] a map from hash to hash with unique keys
- [ ] `(hash * hash) list` allowing repeated keys
- [ ] `hash option`
> Why: A dictionary allows at most one value per key (§3.5); a list of pairs permits duplicates.

### Q A lasair function writes the ticket accumulator's length as one octet. At which configuration does this first go wrong?
- [ ] Tiny, because E = 12 needs a two-octet length
- [x] Full, because a length of 600 is at least 128 and needs a multi-octet compact encoding
- [ ] Neither, lengths are always one octet
- [ ] Both, lengths are always four octets
> Why: Compact naturals use one octet only below 128. This was lasair's F4 bug: correct for 12, wrong for 600.

### Q Which is the correct reading of ⟦ℍ⟧_{:O} for the authorizer pool?
- [ ] Exactly O hashes
- [x] At most O hashes
- [ ] At least O hashes
- [ ] O hashes plus one optional
> Why: The :n subscript means at most n (§3.7). The pool may hold fewer than 8 authorizers.

### Q A table cell says "0.8.0 derives the ticket entry bound as ⌈2E / |γ_P'|⌉". With E = 600 and 1023 validators, what is it?
- [ ] 1
- [x] 2
- [ ] 3
- [ ] 16
> Why: 1200 / 1023 is about 1.17, and its ceiling is 2, matching the 0.7.2 constant N = 2 at full.

### Q Using the same 0.8.0 formula at tiny (E = 12, 6 validators), what does the text give, and what do lasair's 0.7.2 build and the vectors README use?
- [ ] 3 from the text; 4 in lasair
- [x] 4 from the text; 3 in lasair's 0.7.2 build and the 0.8.0 vectors README
- [ ] 2 everywhere
- [ ] 6 everywhere
> Why: 24 / 6 = 4. The sheets record that text and vectors disagree at tiny; say so if asked.

### Q Which statement about V in 0.8.0 is correct?
- [ ] V = 1023 is a fixed constant and a codec width
- [x] It is no longer a constant; the active set size must be 3c with c from 2 up to C (6 to 1023), and validator sequences are length-prefixed
- [ ] V is derived from E
- [ ] V was renamed K
> Why: GP #514/#527 removed the constant. safrole.tex defines the allowed sizes as {3c : c ∈ ℕ_{2…C+1}}; ℕ_{a…b} is half-open, so c runs from 2 to C.

### Q An equation writes ←(α[c] ⧺ x)^O. What is computed?
- [x] Append x to the pool, then keep the last O entries
- [ ] Prepend x, then keep the first O entries
- [ ] Replace α[c] with x repeated O times
- [ ] Remove x from the pool
> Why: ⧺ appends one element and the left arrow keeps the final n (§3.7). This is the authorizer pool update.

### Q Two sequences [1, 2, 3] and [1, 2, 3, 1]: which is smaller under the paper's ordering?
- [x] [1, 2, 3]
- [ ] [1, 2, 3, 1]
- [ ] They are equal
- [ ] They are not comparable
> Why: §3.7: sequences of ordered elements order lexicographically, and a proper prefix is smaller; the paper gives this example.

### Q A set of (service, hash) pairs must reach the state trie in a canonical order. What does that imply for an implementation?
- [ ] Insertion order is fine
- [ ] Sort by service id only
- [x] Sort by the full tuple, service id and then hash
- [ ] Sort by hash only
> Why: Sets that are serialized need a total order over the full element. lasair's B1 bug sorted by service id alone.

### Q The order-unique construction applied to [1, 3, 2, 3] gives?
- [ ] [1, 3, 2]
- [x] [1, 2, 3]
- [ ] [3, 3, 2, 1]
- [ ] [1, 2, 3, 3]
> Why: §3.7: it orders ascending and excludes duplicates; the paper's own example.

### Q Where in the protocol is Keccak, rather than Blake2b, used?
- [ ] The header hash
- [ ] State keys
- [x] The accumulation-output belt in recent history (and Beefy)
- [ ] Work-package hashes
> Why: Recent history uses Keccak throughout the belt to maximise compatibility with legacy systems.

### Q A hash result is written ℋ(ℰ(x)). Why is ℰ there?
- [x] Hash functions act on octet sequences, so the value is serialized first
- [ ] To compress x
- [ ] To sign x
- [ ] To sort x
> Why: §3.8: inputs to hashes are passed through the codec; for an octet sequence ℰ is the identity.

### Q Which pair of constants differs between tiny and full?
- [ ] Slot period P and recent history H
- [x] Epoch length E and core count C
- [ ] Authorizer pool O and queue Q
- [ ] Slot period P and queue Q
> Why: E is 12/600 and C is 2/341. P, H, O and Q are the same in both.

### Q Which block accumulation gas budget G_T applies at full?
- [ ] 2 × 10⁷
- [ ] 10⁹
- [x] 3.5 × 10⁹
- [ ] 5 × 10⁹
> Why: Constants table: G_T = 3.5 × 10⁹ at full, 2 × 10⁷ at tiny. G_R, refine, is 5 × 10⁹.

### Q What is the lookup anchorage L in slots at full, and how long is that?
- [ ] 600 slots, one hour
- [x] 14 400 slots, 24 hours
- [ ] 19 200 slots, 32 hours
- [ ] 24 slots, 2.4 minutes
> Why: L = 14 400 slots × 6 s = 24 hours. Tiny uses 24 slots.

## Level 3

### Q How would you read a Gray Paper equation you have never seen?
> Hint: typography tells you the kind of each symbol.
> Answer: Classify each symbol by its face: lower Greek is a state component with a fixed meaning, upper Greek a function the paper defines, calligraphic an imported function, blackboard a set, bold a local sequence or set. A prime means posterior, a dagger an intermediate. Then read ≺ as "defined from" and the subscripts on sequences as length bounds.

### Q Why does the paper use ∇ for errors instead of ⊥?
> Hint: what else could ⊥ mean?
> Answer: ⊥ is Boolean false, which may be a valid successful result in some contexts. Using ∇ keeps "this operation failed" distinct from "the answer is false".

### Q What is the practical difference between ∅ and ∇?
> Hint: one is a legal value, one is not.
> Answer: ∅ means a term is validly without a value, such as an empty optional; processing continues. ∇ means the operation failed or the value is invalid, which typically makes the block or call fail.

### Q Why does the paper distinguish an octet from a natural below 256?
> Hint: think about serialization.
> Answer: An octet always serializes to itself, but a natural is encoded by the codec and may take several octets depending on its size and encoding variant. Confusing the two causes wrong lengths in the encoding.

### Q Explain the compact natural encoding and why it bit lasair.
> Hint: F4.
> Answer: Plain ℰ of a natural uses one octet for values below 128, and otherwise a prefix octet whose leading ones give the length, followed by more octets. lasair wrote the ticket accumulator's length as one octet, which is correct for 12 entries at tiny and wrong for 600 at full.

### Q What does subscripting a dictionary with a missing key imply, and why is that a sensible rule?
> Hint: the paper calls it an implicit assertion.
> Answer: Subscripting asserts the key exists; if it does not, the result is undefined and any block relying on it is invalid. It lets the paper write lookups tersely while making blocks that reference missing data invalid rather than silently defaulting.

### Q Why do Bandersnatch VRF outputs depend on the context but not the message?
> Hint: think about tickets and entropy.
> Answer: The GP states the output is influenced by the context x but not the message m. The reason (derivation, not GP text): tickets and entropy derive from the VRF output, so a validator cannot grind different messages for a better output; only the protocol-fixed context influences it.

### Q What is the difference between ⟦T⟧ₙ, ⟦T⟧_{:n} and ⟦T⟧_{n:}, and why does it matter for the codec?
> Hint: which ones need a length prefix?
> Answer: Exactly n, at most n, and at least n elements. A sequence of fixed known length is encoded without a length prefix, while variable-length ones carry a compact length prefix, so reading the bound correctly decides the byte layout.

### Q Which constants changed status in 0.8.0 and why does it matter to an implementer?
> Hint: V and N.
> Answer: The validator count V and the ticket entry constant N are no longer constants. The active set size must be 3c for some c from 2 up to C (the tex writes ℕ_{2…C+1}, a half-open range), validator sequences are length-prefixed, and the ticket entry bound is derived as ⌈2E / pending set size⌉. Code that treated V as a fixed width must change.

### Q Name the three cryptographic signature schemes in the paper and one use of each.
> Hint: 64, 96, 784 octets.
> Answer: Ed25519 (64 octets) signs guarantees, assurances and judgments. Bandersnatch VRF signatures (96 octets) seal blocks and give entropy. Bandersnatch Ring VRF proofs (784 octets) make anonymous Safrole tickets. BLS is also defined, for Beefy.
