---
id: NFR-036
title: "Byte-exact producer output"
type: NFR
quality_attribute: functional_suitability
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-118"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "constrains"
---
# NFR-036: Byte-exact producer output

## Statement

The producer SHALL emit byte-identical Filament Canonical JSON 1 bytes and
byte-identical digests for one admitted static bundle across repeated runs,
across separate processes, across host architectures, and across member
insertion orders.

The producer SHALL derive no canonical byte from a locale, an environment
variable, a working directory, a wall clock, or a network read.

## Scope

- Applies to: the canonical bytes and the digest values the producer emits for
  one admitted static bundle — its model, components, endpoints, relationships,
  configuration, static closure, and correspondence records.
- Does not apply to: populations, snapshots, windows, workflow instances,
  relationship instances, observations, progress records, and observation
  closures, which are separate later assessment inputs and are not members of
  the static bundle.
- Operational context: an offline run over a fixed static bundle, with every
  selection — digest domain, digest normalization revision, revision namespace,
  and canonical-form domain — supplied explicitly by the configuration
  document.

## Rationale

A digest is only a binding if the bytes under it are a function of the declared
document alone. If two runs of the producer over one admitted static bundle
disagree by a byte, then every digest a consumer validates becomes a claim about
one host on one afternoon, and a genuine digest mismatch cannot be told from a
host difference — which is precisely the refusal
[FR-112](../functional/FR-112-emit-versioned-digest-selections.md) makes
blocking.

The exact-decimal numeric domain of
[FR-118](../functional/FR-118-validate-filament-canonical-json-1.md) is the
most fragile part of that function. A binary floating-point coercion anywhere
between parsing and serialization silently makes canonical bytes a property of
the host's floating-point behaviour rather than of the declared value, and it
does so without refusing, which is why float coercion incidents are measured at
zero rather than bounded.

Insertion order is the second leak. Object key order and set-array member order
are declared properties of the document, so the order in which members reached
the producer must not survive into the bytes; conversely a semantic-order array
must keep exactly the order the producer declared. Both directions are the same
measurement: the digest is a function of the declaration, not of the walk.

Ambient inputs are excluded rather than pinned. The producer declares; it reads
no clock, consults no environment, resolves no working directory, and opens no
socket, so there is no ambient value to normalize and no host-varying input to
carry in evidence.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Canonical-byte agreement between two producer runs over one admitted static bundle, in one process and across two processes | 100% | 100% | Repeat-run byte comparison |
| Digest agreement across permuted object-key and set-array member insertion orders of one admitted static bundle | 100% | 100% | Permuted-input digest comparison |
| Canonical-byte agreement across host architectures for one admitted static bundle | 100% | 100% | Cross-architecture byte comparison against a committed golden |
| Canonical-byte agreement across a changed locale, environment, and working directory | 100% | 100% | Varied-environment run against the committed golden |
| Binary floating-point coercion incidents on a numeric value between parsing and serialization | 0 | 0 | Static analysis of the numeric path with a planted-token control |
| Semantic-order arrays whose emitted order differs from the producer-declared order | 0 | 0 | Order-preservation comparison per semantic-order array |
| Ambient inputs read while canonicalizing a bundle (locale, environment variable, working directory, clock, network) | 0 | 0 | Static analysis with a named exemption list, plus an instrumented offline run |
| Canonical bytes that differ between a run with a warm cache and a run with a cold cache | 0 | 0 | Repeat-run byte comparison |

## Verification

Canonicalize and digest one admitted static bundle twice within one process and
twice in two separate processes, and compare every run's bytes and digests
against each other and against the committed golden bytes; repeat the run with
the object keys and the set-array members supplied in a permuted insertion
order and confirm the digests are unchanged, and with one semantic-order array
permuted and confirm the digest changes; repeat the run on a second host
architecture and compare against the same golden; repeat the run with the
locale, the environment, and the working directory set to values a second host
would carry and compare against the same golden; audit the numeric path for
every binary floating-point type and conversion, confirm each reported hit is
on the named exemption list, and confirm the audit fails on a scratch copy
carrying a planted float conversion; and run the whole suite offline in an
unprivileged network namespace with an instrumented run recording every clock,
environment, and socket read. Every gate reports the number it measured, and a
gate that cannot run fails saying so rather than passing.

## Dependencies

- **Upstream**: [FR-117](../functional/FR-117-admit-a-static-producer-bundle.md) admits the static producer bundle whose bytes this requirement constrains; [FR-112](../functional/FR-112-emit-versioned-digest-selections.md) selects the digest domains and normalization revisions
- **Downstream**: [FR-118](../functional/FR-118-validate-filament-canonical-json-1.md) defines the canonical form these measurements hold byte-exact; [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative producer contract
