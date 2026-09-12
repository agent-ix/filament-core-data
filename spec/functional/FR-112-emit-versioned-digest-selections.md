---
id: FR-112
title: "Emit versioned digest selections"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-118"
    type: "depends_on"
---
# FR-112: Emit versioned digest selections

## Description

The producer SHALL emit every digest it authors for a producer object, a native
artifact, or a native definition as a four-member selection
`{ algorithm, domain, version, value }` whose `version` is the authored
digest-domain normalization revision, mapping 1:1 onto the consumer's
`SelectedDigest { domain, version, algorithm, value }`.

## Inputs

- The Filament Canonical JSON 1 byte string of the producer object to be
  digested, as
  [FR-118](./FR-118-validate-filament-canonical-json-1.md) produces it.
- The native artifact or definition raw bytes to be digested.
- The configuration document's selected digest domain and normalization
  revision for each digest class, drawn from the closed admissible digest
  vocabulary this requirement fixes.

## Outputs

- A four-member digest selection carrying `algorithm`, `domain`, `version`, and
  `value` for every producer-object and native digest the producer authors.
- A blocking refusal naming the offending digest selection when a domain,
  `version`, or `value` is substituted, absent, unselected, or mismatched.

## Behavior

- The producer SHALL emit every digest it authors as the four-member selection
  `{ algorithm, domain, version, value }`.
- The producer SHALL emit `algorithm: "sha256"` on every digest selection it
  authors.
- The producer SHALL treat `{ domain: "filament-canonical-json-1",
  version: "1" }` and `{ domain: "quire-native-bytes-1", version: "1" }` as the
  complete closed admissible digest vocabulary of this interface.
- The producer SHALL emit, for each digest class, the domain and normalization
  revision that the configuration document selects from that closed
  admissible digest vocabulary.
- The producer SHALL emit every producer canonical-object digest under the
  domain `filament-canonical-json-1`.
- The producer SHALL emit every native raw-byte digest under the domain
  `quire-native-bytes-1`.
- The producer SHALL author `version` as the digest-domain normalization
  revision the configuration document selects.
- The producer SHALL NOT derive `version` from the domain spelling.
- The producer SHALL emit `version` on every digest selection it authors, so
  that no consumer needs a default for an absent `version`.
- The producer SHALL emit every `value` as the literal prefix `sha256:`
  followed by lowercase hexadecimal.
- The producer SHALL compute every canonical-object digest over the Filament
  Canonical JSON 1 byte string that FR-118 produces for that object.
- The producer SHALL NOT take the transmitted wire member order of a record as
  digest input, because member order is a transmission concern and not a
  canonical-byte concern.
- The producer SHALL refuse a canonical-object digest submitted in the
  `quire-native-bytes-1` domain.
- The producer SHALL refuse a native raw-byte digest submitted in the
  `filament-canonical-json-1` domain.
- The producer SHALL refuse a digest selection whose recomputed `value`
  differs from its declared `value`.
- The producer SHALL refuse a digest selection whose `version` is absent.
- The producer SHALL refuse a digest selection whose `domain` or `version`
  lies outside the closed admissible digest vocabulary.
- The producer SHALL refuse a digest selection whose `domain` and `version`
  pair the configuration document does not declare as a selection.
- The producer SHALL refuse a bare hash string presented in place of a digest
  selection.
- The producer SHALL admit a source-provenance locus whose `ArtifactRef.digest`
  member is one raw-byte digest string, which this requirement does not govern.
- The producer SHALL emit each digest refusal as a blocking input refusal.
- The producer SHALL NOT emit a digest refusal as a warning, a cache miss, or
  an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-112-CON-1 | The producer SHALL refuse a bare hash string as a binding digest, because it carries no digest domain. | Integrity | Test |
| FR-112-CON-2 | The producer SHALL take every canonical-object digest input from the FR-118 canonicalizer output for that object rather than from its own serializer, so that the self-digest exclusion FR-118 owns applies unchanged and is not restated here. | Traceability | Test |
| FR-112-CON-3 | The producer SHALL keep a digest `version` a separate authored member from its `domain`, never supplied by the domain spelling. | Traceability | Test |
| FR-112-CON-4 | The producer SHALL scope this requirement to the digest members it authors for producer objects, native artifacts, and native definitions, excluding the consumer-owned `ArtifactRef.digest` raw-byte digest string and the consumer-owned `NativeSource.revision` native authority label, neither of which it refuses. | Interface | Test |
| FR-112-CON-5 | The producer SHALL read its digest domain and normalization-revision selections from the configuration document, which selects among the members of the closed admissible digest vocabulary this requirement fixes. | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-112-AC-1 | A producer emits a canonical-object digest as `{ algorithm: "sha256", domain: "filament-canonical-json-1", version: "1", value: "sha256:<lowercase-hex>" }` and a native raw-byte digest as the same shape under `quire-native-bytes-1` version `1`, and every member matches the identically named member of the pinned consumer `SelectedDigest` wire contract, with no member absent and none requiring a default. | Contract |
| FR-112-AC-2 | A canonical-object digest submitted under domain `quire-native-bytes-1` refuses, and a native raw-byte digest submitted under domain `filament-canonical-json-1` refuses. | Test |
| FR-112-AC-3 | A digest selection whose recomputed value differs from its declared value refuses with a blocking refusal rather than a warning or a refetch invitation. | Test |
| FR-112-AC-4 | A digest selection with an absent `version` refuses, one whose `domain` or `version` lies outside the closed admissible digest vocabulary refuses, and one inside that vocabulary whose pair the configuration document does not select refuses. | Test |
| FR-112-AC-5 | A bare hash string presented in place of a four-member digest selection refuses and binds nothing. | Test |
| FR-112-AC-6 | A conforming source-provenance locus carrying `ArtifactRef.digest` as one raw-byte digest string and `NativeSource.revision` as an editable native authority label is admitted, and neither member refuses as a malformed digest selection. | Test |
| FR-112-AC-7 | One producer object serialized for transmission under two different wire member orders yields one identical digest `value`, because the digest input is the FR-118 canonical byte string and never the transmitted member order. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections, including which members of the closed
  admissible digest vocabulary this bundle selects.
- [FR-118](./FR-118-validate-filament-canonical-json-1.md) produces the
  Filament Canonical JSON 1 byte string this requirement digests, and owns the
  exclusion of an object's own digest member from those bytes; the canonical
  bytes therefore precede every digest taken over them.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment does not own:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which carries
  `SelectedDigest { domain, version, algorithm, value }`.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer reads each `SelectedDigest` member directly and defaults
  none, and it recomputes a digest by canonicalizing the received document
  under Filament Canonical JSON 1 before hashing rather than by hashing the
  bytes as transmitted.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for canonical digests.
