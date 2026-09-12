---
id: FR-112
title: "Emit versioned digest selections"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
---
# FR-112: Emit versioned digest selections

## Description

The producer SHALL emit every digest as a four-member selection
`{ algorithm, domain, version, value }` whose `version` is the authored
digest-domain normalization revision, mapping 1:1 onto the consumer's
`SelectedDigest { domain, version, algorithm, value }`.

## Inputs

- The producer canonical-object bytes to be digested, in Filament Canonical
  JSON 1, with the object's own digest member excluded.
- The native artifact or definition raw bytes to be digested.
- The configuration document's selected digest domain and normalization
  revision for each digest class.

## Outputs

- A four-member digest selection carrying `algorithm`, `domain`, `version`, and
  `value` for every emitted producer-object and native digest.
- A blocking refusal naming the offending digest selection when a domain,
  `version`, or `value` is substituted, absent, unknown, or mismatched.

## Behavior

- The producer SHALL emit every producer canonical-object digest as
  `{ algorithm: "sha256", domain: "filament-canonical-json-1", version: "1",
  value: "sha256:<lowercase-hex>" }`.
- The producer SHALL emit every native raw-byte digest as
  `{ algorithm: "sha256", domain: "quire-native-bytes-1", version: "1",
  value: "sha256:<lowercase-hex>" }`.
- The producer SHALL author `version` as the digest-domain normalization
  revision declared in the configuration document.
- The producer SHALL NOT derive `version` from the domain spelling.
- The consumer SHALL NOT default an absent `version`.
- The producer SHALL emit every `value` as the literal prefix `sha256:`
  followed by lowercase hexadecimal.
- The producer SHALL refuse a canonical-object digest submitted in the
  `quire-native-bytes-1` domain.
- The producer SHALL refuse a native raw-byte digest submitted in the
  `filament-canonical-json-1` domain.
- The producer SHALL refuse a digest selection whose recomputed `value`
  differs from its declared `value`.
- The producer SHALL refuse a digest selection whose `version` is absent.
- The producer SHALL refuse a digest selection whose `version` is not a
  declared normalization revision of its named domain.
- The producer SHALL refuse a bare hash string presented in place of a digest
  selection.
- The producer SHALL emit each digest refusal as a blocking input refusal.
- The producer SHALL NOT emit a digest refusal as a warning, a cache miss, or
  an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-112-CON-1 | The producer SHALL refuse a bare hash string as a binding digest, because it carries no digest domain. | Integrity | Test |
| FR-112-CON-2 | The producer SHALL exclude an object's own digest member from the bytes that object digests. | Integrity | Test |
| FR-112-CON-3 | The producer SHALL keep a digest `version` a separate authored member from its `domain`, never supplied by the domain spelling. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-112-AC-1 | A producer emits a canonical-object digest as `{ algorithm: "sha256", domain: "filament-canonical-json-1", version: "1", value: "sha256:<lowercase-hex>" }` and a native raw-byte digest as the same shape under `quire-native-bytes-1` version `1`, and each member arrives at the consumer's `SelectedDigest` without a defaulted member. | Test |
| FR-112-AC-2 | A canonical-object digest submitted under domain `quire-native-bytes-1` refuses, and a native raw-byte digest submitted under domain `filament-canonical-json-1` refuses. | Test |
| FR-112-AC-3 | A digest selection whose recomputed value differs from its declared value refuses with a blocking refusal rather than a warning or a refetch invitation. | Test |
| FR-112-AC-4 | A digest selection with an absent `version` refuses, and one naming a `version` undeclared for its domain refuses. | Test |
| FR-112-AC-5 | A bare hash string presented in place of a four-member digest selection refuses and binds nothing. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections, including the selected digest domains and
  their normalization revisions.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for canonical digests.
