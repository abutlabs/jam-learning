---
title: Identity — Certificates, the Name N(k), and ALPN
duration: 25 min
---

# Identity — Certificates, the Name N(k), and ALPN

Before a single byte of application data flows, two JAM nodes complete a TLS 1.3
handshake over QUIC in which **each proves an Ed25519 identity**. Three
mechanisms do the work, all from the spec's *Encryption and handshake* section.

## 1. The certificate

Each peer presents an X.509 certificate that must:

- use **Ed25519** as the signature algorithm,
- carry the peer's Ed25519 public key (for a validator, the one published on
  chain),
- have **exactly one** subject alternative name (SAN), derived from that key.

Self-signing is recommended but not required. The connection must be closed if
the peer sends no certificate or one that fails these checks. Crucially, when you
*accept* a connection you don't know the peer's key in advance — but you can
still check that the key inside the cert and the SAN derived from it are
**consistent**.

In lasair the certificate is built in Rust from an Ed25519 seed:

```rust
// rust/quic-ffi/src/jamnp.rs
pub fn ed25519_cert(seed: &[u8; 32])
    -> Result<(CertificateDer, PrivateKeyDer, [u8; 32]), _>
{
    let signing = SigningKey::from_bytes(seed);
    let pubkey  = signing.verifying_key().to_bytes();
    let mut params = CertificateParams::new(vec![])?;
    // The identity is the SAN; the DN only has to be non-empty
    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, jamnp_san(&pubkey));
    params.distinguished_name = dn;
    params.subject_alt_names = vec![SanType::DnsName(jamnp_san(&pubkey).try_into()?)];
    let cert = params.self_signed(&key_pair)?;
    // ...
}
```

The non-empty DN is an interop lesson. The spec only constrains the SAN, and
lasair first left the subject name empty. A self-signed certificate's issuer
is its subject, and X.509 (RFC 5280) requires a non-empty issuer name, so a
strict parser in another client (JavaJAM) refused every lasair handshake.
lasair now puts N(k) in the common name as well.

The validation side is `verify_cert_shape`, invoked during the handshake by the
custom `JamnpVerifier`. It parses the presented certificate and enforces the full
rule set:

```rust
// SubjectPublicKeyInfo must be Ed25519 (OID 1.3.101.112), 32 bytes
if spki.algorithm.algorithm != OID_SIG_ED25519 { return Err(...); }
// EXACTLY ONE DNS SAN, equal to N(pk)
match dns_names.as_slice() {
    [name] if *name == jamnp_san(&pk) => Ok(pk),
    [name]                            => Err("SAN mismatch"),
    []                                => Err("no DNS SAN"),
    many                              => Err("must carry exactly one DNS SAN"),
}
```

This is stricter than "does it parse" — a peer presenting a 32-byte key of the
wrong algorithm, or zero/extra SANs, is rejected, exactly as a conformant
PolkaJam or JAM-DUNA node would reject it.

## 2. The name N(k)

The SAN ties the TLS identity to the Ed25519 key with no certificate authority.
Given a 32-byte key `k`, the spec defines:

```math
B(n, l) = []                                    when l = 0
        = [ alphabet[n mod 32] ] ++ B(n / 32, l-1)   otherwise
N(k)    = "e" ++ B( E₃₂⁻¹(k), 52 )
```

with `alphabet = "abcdefghijklmnopqrstuvwxyz234567"`. Read this carefully,
because two details trip people up:

- **`E₃₂⁻¹(k)` reads `k` as a *little-endian* 256-bit integer** (the Gray Paper
  serialization codec is little-endian). It is *not* RFC-4648 base-32, which
  would read the bytes big-endian.
- **`B` emits the least-significant base-32 digit first** — `n mod 32`, then
  `n / 32`, and so on for 52 digits. The result is prefixed with `"e"`, giving a
  53-character name.

lasair implements this directly (`base32_le` in `rust/quic-ffi/src/jamnp.rs`,
mirrored on the OCaml side in `conformance/dev_accounts.ml`): a little-endian
big-integer repeatedly divided by 32, emitting each remainder.

### The golden vector — and a warning

The dev account **Alice** has the all-zero seed and the published Ed25519 key
`3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29`. Applying the
written formula:

```
N(alice) = e3r2oc62zwfj3crnuifuvsxvbtlzetk4o5qyhetkhagsc2fgl2oka
```

This is pinned as a test:

```rust
// rust/quic-ffi/src/jamnp.rs  (tests)
#[test]
fn san_matches_written_spec_formula_for_alice() {
    let alice_pub = hex_to_32("3b6a27bc…59da29");
    assert_eq!(jamnp_san(&alice_pub),
               "e3r2oc62zwfj3crnuifuvsxvbtlzetk4o5qyhetkhagsc2fgl2oka");
}
```

⚠️ **The jam-docs "certs" page shows a *different* SAN for Alice**
(`ehnvcppgow2sc2yvdvdicu3ynonsteflxdxrehjr2ybekdc2z3iuq`). That same page carries
an explicit disclaimer: *"The DNS alt name was reported to be wrong, please do
not rely on it."* We verified from first principles that `ehnvc…` is neither the
little-endian nor the big-endian reading of the correct formula — it is simply
the known-bad example. lasair's value is the faithful implementation of the
*written* `N(k)`, and — the real proof — it is what interoperates with PolkaJam:
a lasair-keyed shared genesis derives each validator's Ed25519 key back *from*
its `peer_id`, and PolkaJam then completes the mutually-authenticated handshake
and imports lasair's blocks. If the name were wrong, mutual auth would fail and
no block would cross.

> **peer_id == N(k).** The node identifier you see in a bootnode string,
> `<peer_id>@<ip>:<port>`, *is* `N(k)` for the node's key. lasair prints its own
> at boot (`jamnp_peer_id my_ed`) and can invert one back to a key
> (`Chainspec.ed25519_of_peer_id`, in `conformance/chainspec.ml`) to drive the
> Preferred Initiator in the next lesson.

## 3. ALPN — chain isolation for free

TLS negotiates an *application protocol name*. JAMNP-S uses it to pin both the
protocol version and the **chain**:

```
jamnp-s/V/H            or   jamnp-s/V/H/builder
```

`V` is the protocol version: `1` since the spec's 2026-09-01 revision (it was
`0` before, and PolkaJam's GP 0.8.0 nightlies refuse `0`). `H` is the **first 8
nibbles (4 bytes) of the genesis header hash**, lower-case hex. lasair builds it
in `jamnp_alpn`:

```rust
pub const JAMNP_VERSION: u32 = 1;

pub fn jamnp_alpn(genesis_header_hash: &[u8], builder: bool) -> Vec<u8> {
    let h: String = genesis_header_hash.iter().take(4)   // 4 bytes = 8 nibbles
        .map(|b| format!("{:02x}", b)).collect();
    let base = format!("jamnp-s/{}/{}", JAMNP_VERSION, h);
    if builder { format!("{}/builder", base) } else { base }.into_bytes()
}
```

Because the genesis hash is baked into the negotiated protocol name, a node on
chain A **cannot even complete a handshake** with a node on chain B — TLS aborts
on ALPN mismatch. Chain isolation is enforced by the transport itself, before any
JAM logic runs.

The `/builder` suffix is used by a connection *initiator* that is acting as a
work-package builder, to request a builder-reserved slot. The accepting side
should always permit it; and, per the spec, guarantors accept work-package
submissions (CE-133, Lesson 5) on **any** connection regardless of how it was
opened — the builder suffix is a hint, not a gate.

## What to take away

lasair's identity layer is a complete, strict implementation of the JAMNP-S
handshake: Ed25519-only certificates, the `N(k)` SAN computed exactly as written
(and validated on both accept and connect), and ALPN that scopes every
connection to one genesis. The one subtlety — the `ehnvc…` example in the docs —
is a documented error in the *docs*, not in lasair, and the interop with PolkaJam
is the proof.
