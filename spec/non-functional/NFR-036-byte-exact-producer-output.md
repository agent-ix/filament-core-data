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
  canonical-form domain, and the `numericResourceLimit` of
  [FR-118](../functional/FR-118-validate-filament-canonical-json-1.md) —
  supplied explicitly by the configuration document.
- Named architecture set: `x86_64-unknown-linux-gnu` and
  `aarch64-unknown-linux-gnu`, which are the two architectures every
  cross-architecture measurement below is taken over.

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
socket, so there is no ambient value to normalize, no host-varying input to
carry in evidence, and no ambient read that any exemption admits.

The admit-versus-refuse decision is measured beside the bytes. FR-118 takes its
numeric resource limit from a declared configuration member rather than from the
host, so one configuration document refuses the same numbers on every
architecture of the named set; without that agreement two hosts could report
100% byte agreement while disagreeing on which documents exist at all.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Digested documents of one admitted static bundle whose canonical byte string agrees between two runs in one process and between two runs in two separate processes, as a percentage of that bundle's digested documents | 100% | 100% | Repeat-run byte comparison of every digested document against that bundle's committed golden byte strings (`golden-approval-testing`) |
| Digested documents whose digest is unchanged when the bundle's object keys and set-array members are supplied in a permuted insertion order, as a percentage of that bundle's digested documents over the declared permutation set | 100% | 100% | Paired-run digest comparison, one pair per permutation in the declared set, differing only in insertion order (`metamorphic-testing`) |
| Digested documents whose canonical byte string agrees across the named architecture set, and admit-versus-refuse decisions that agree across it under one configuration document's declared `numericResourceLimit`, as a percentage of that bundle's digested documents and of its refused numeric values | 100% | 100% | Per-architecture byte and refusal comparison against one committed golden, run on `x86_64-unknown-linux-gnu` and on `aarch64-unknown-linux-gnu` (`golden-approval-testing`) |
| Digested documents whose canonical byte string agrees across a changed locale, environment, and working directory, as a percentage of that bundle's digested documents | 100% | 100% | Varied-environment run compared against the same committed golden (`golden-approval-testing`) |
| Binary floating-point coercion sites reached by a numeric value between parsing and serialization, counted over the declared numeric-path population — the producer crate's number parse seam, its coefficient-and-exponent representation, its canonical serializer, and the pinned JSON parser entry point each of those calls (unit: coercion sites) | 0 | 0 | Static analysis of that declared population, with a planted float conversion on a scratch copy as the control that the scan fails (`sast`) |
| Semantic-order arrays of one admitted static bundle whose emitted member order differs from the producer-declared order (unit: arrays) | 0 | 0 | Per-array comparison of the emitted order against the declared order, with a permuted-array paired run whose digest must differ (`metamorphic-testing`) |
| Ambient inputs read while canonicalizing one admitted static bundle — a locale, an environment variable, a working directory, a clock, or a network read — counted with no exemption, since the Statement excludes them outright (unit: reads) | 0 | 0 | Static analysis of the canonicalization call graph, plus an instrumented offline run in an unprivileged network namespace recording every such read (`sast` plus `runtime-monitoring`) |

## Verification

Canonicalize and digest one admitted static bundle twice within one process and
twice in two separate processes, and compare every run's bytes and digests
against each other and against the committed golden bytes; repeat the run with
the object keys and the set-array members supplied in a permuted insertion
order and confirm the digests are unchanged, and with one semantic-order array
permuted and confirm the digest changes; repeat the run on each architecture of
the named set — `x86_64-unknown-linux-gnu` and `aarch64-unknown-linux-gnu` —
and compare both the bytes and the set of numeric values refused under the
configuration document's declared `numericResourceLimit` against the same
golden; repeat the run with the locale, the environment, and the working
directory set to values a second host would carry and compare against the same
golden; audit the declared numeric-path population for every binary
floating-point type and conversion, confirm the audit reports no hit rather
than excusing one, and confirm it fails on a scratch copy carrying a planted
float conversion; and run the whole suite offline in an unprivileged network
namespace with an instrumented run recording every clock, environment, and
socket read. Every gate reports the number it measured, and a gate that cannot
run fails saying so rather than passing.

The apparatus these gates need is not producer behaviour and is owned by
Plan-017: the committed golden byte strings and their location, the second
architecture of the named set and the runner that provides it, the planted-token
control for the float audit, the instrumented ambient-read run, and the
unprivileged network namespace. Where Plan-017 has not yet provided one of them,
the gate depending on it fails reporting that it did not run.

## Dependencies

- **Upstream**: [FR-118](../functional/FR-118-validate-filament-canonical-json-1.md) defines the canonical form, the digest input, and the declared `numericResourceLimit` these measurements hold byte-exact; [FR-117](../functional/FR-117-admit-a-static-producer-bundle.md) admits the static producer bundle whose bytes and digests are measured
- **Downstream**: none — no artifact in this repository depends on this requirement; its own declared edges `constrains` FR-118 and FR-117
- **Assumed external contract, not owned here**: the consumer contract at `ix://agent-ix/quire-spec-language/src/protocol_artifact/wire.rs`, pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose `SelectedDigest` and `Revision` members carry the digests these measurements hold byte-exact; a consumer recomputes a digest by canonicalizing the received document under FR-118, so this requirement's byte agreement is what makes that recomputation reproducible
- **Apparatus owner**: Plan-017 owns the committed golden, the second architecture of the named set, the planted-token control, the instrumented ambient-read run, and the offline namespace
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative producer contract for Filament Canonical JSON 1 and for the producer/native correspondence these bytes carry
