---
id: FR-129
title: "Admit a static bundle against real native artifact bytes"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-018"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-127"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-128"
    type: "depends_on"
---
# FR-129: Admit a static bundle against real native artifact bytes

## Description

The producer SHALL carry one admitted static fixture whose native artifact
reference names a real native rule-model artifact rather than a placeholder, whose
declared native raw-byte digest is the SHA-256 of that artifact's exact bytes,
whose every endpoint model type resolves to an export mapping drawn from that
artifact's own export table, and whose one relationship resolves its `source` and
its `target` to two distinct native type exports of that table.
The producer SHALL compute the native digest over the artifact's raw bytes with
no canonicalization applied first.
The producer SHALL carry that digest in the native raw-byte digest domain.
The producer SHALL NOT compute that digest over a canonical-JSON rendering.
The producer SHALL NOT carry that digest in the producer canonical-JSON domain,
which remains a separate domain even where two hash texts coincide.
The producer SHALL NOT admit a static fixture whose native raw-byte digest
matches no artifact as evidence that endpoint model types resolve, because a
digest with no artifact behind it has no export table for a type to resolve
against.

This requirement owns the repository-local fixture qualification boundary, not
native-model admission. The fixture verifier SHALL consume the committed native
artifact bytes and the adjacent export-table manifest emitted by the pinned
native producer recipe as explicit inputs. The runtime seam that admits a
constructor-admitted native model together with an `AdmittedStaticBundle`
remains owned by `quire-spec-language::linking::composed::producer`; this
repository SHALL NOT duplicate that native reader, model admission, or
hard-clamped compiler work accounting.

## Inputs

- The exact bytes of one native rule-model artifact that the native language
  admits as a native model
- That artifact's declared export table, carrying each export's kind and ordered
  path
- The configuration-declared `maximumNativeArtifactBytes`,
  `maximumNativeExportTableBytes`, `maximumNativeExports`,
  `maximumNativeExportPathSegments`, and
  `maximumNativeDefinitionClosureEntries` bounds
- The configuration document that selects the admissible digest domains, digest
  versions, and revision namespaces
- The endpoint, relationship, component, and correspondence declarations of the
  fixture bundle

## Outputs

- One admitted static fixture whose native artifact reference, raw-byte digest,
  export mappings, and relationship resolve against a real native rule-model
  artifact
- The recomputed SHA-256 of the artifact's exact bytes, equal to the declared
  native raw-byte digest
- A named refusal for a fixture whose declared native digest does not equal the
  recomputed digest of the bytes it names

## Behavior

- The producer SHALL name, in the fixture's native artifact reference, one native
  rule-model artifact that the native language admits as a native model.
- The producer SHALL select that artifact as the one the native-side producer-model
  admission seam consumes, and SHALL NOT select an artifact belonging to the
  downstream compiled-protocol intake, which admits the native language's own
  emitted package rather than this bundle.
- The producer SHALL compute the fixture's native raw-byte digest as the SHA-256
  of that artifact's exact bytes.
- The producer SHALL NOT canonicalize, reserialize, reformat, or otherwise
  transform the artifact's bytes before computing that digest.
- The producer SHALL carry that digest in the native raw-byte digest domain.
- The producer SHALL NOT carry that digest in the producer canonical-JSON digest
  domain.
- The producer SHALL keep the native raw-byte digest and the producer canonical
  digest distinct members even where their hash texts coincide.
- The producer SHALL draw every *model type* export mapping of the fixture from
  the named artifact's own export table, taking each export's kind and ordered
  path as that table declares them.
- The producer SHALL author the component, endpoint, and relationship record
  export mappings itself, because the native export table declares no export of
  those kinds and FR-116 owes one mapping to each such record.
- The producer SHALL resolve each endpoint's model type through an export mapping
  carried by the correspondence that binds that endpoint's own producer object and
  native artifact, never through a mapping carried by another correspondence.
- The producer SHALL resolve every endpoint `typeIdentity` of the fixture to one
  of that table's type exports.
- The producer SHALL declare in the fixture one relationship whose `source` and
  whose `target` resolve to two distinct native type exports of that table.
- The producer SHALL NOT satisfy the preceding behavior with a self-relationship,
  whose two ends resolve to one type export and therefore exercise no distinction.
- The producer SHALL carry in the fixture one admitted direction from the closed
  direction vocabulary.
- The producer SHALL omit from the fixture's export mappings every native export
  whose kind the static export vocabulary does not represent.
- The producer SHALL record that omission as a stated partition of the assessment
  half rather than as an unexplained absence.
- If a fixture's declared native raw-byte digest does not equal the recomputed
  SHA-256 of the bytes it names, then the producer SHALL refuse the fixture.
- The producer SHALL supply the complete transitive native definition closure the
  fixture's correspondence requires, discovering no omitted entry on the
  consumer's behalf.
- The producer SHALL keep the fixture's admission dependent on no environment
  variable, working directory, wall clock, or network input.
- The producer SHALL commit the named artifact's exact bytes into this repository
  as a fixture asset, so the declared digest and the declared export mappings are
  both checkable against bytes this repository holds.
- The producer SHALL NOT vendor, copy, or re-emit the native artifact's own
  format, reader, or export vocabulary into this repository; committing one
  artifact's bytes as a fixture asset is not such a re-emission.
- The producer SHALL recompute the declared native raw-byte digest from the
  committed fixture asset during verification rather than during admission, which
  reads no native bytes.
- While qualifying the committed fixture, the fixture verifier SHALL first admit
  the static bundle, then enforce every named native-evidence bound from that
  admitted bundle's configuration before parsing or iterating the bounded input.
- If the native artifact bytes, export-table bytes, export count, export-path
  segment count, or native definition-closure count exceeds its declared bound,
  then the fixture verifier SHALL refuse under `DOCUMENT_RESOURCE_LIMIT`, naming
  the exceeded bound.
- While qualifying the committed fixture, the fixture verifier SHALL require the
  export-table manifest's artifact identity and raw-byte digest to equal the
  selected native artifact identity and the recomputed digest, and SHALL require
  each endpoint model-type mapping to match one table entry by both kind and
  ordered path.
- If a model-type mapping's kind or ordered path is absent from the selected
  native artifact's export-table manifest, then the fixture verifier SHALL refuse
  under `EXPORT_FOREIGN`; it SHALL NOT accept a coinciding final path segment.
- If a regenerated artifact replaces the committed fixture asset, then the
  producer SHALL refuse the fixture until its declared digest and export mappings
  are updated to match the replacing bytes.
- The producer SHALL keep its own objects in the producer canonical-JSON digest
  domain and the native model bytes in the native raw-byte digest domain.
- The producer SHALL NOT substitute either domain for a digest domain owned by
  the downstream protocol consumer.
- The producer SHALL name the artifact's identity and revision in the fixture.
- The producer SHALL treat the committed bytes' digest, not that revision, as what
  detects a regenerated artifact.
- The producer SHALL NOT introduce a wire, reference, or tracing schema for the
  native side in carrying this fixture.
- The producer SHALL retain the existing correspondence record's authored members
  unchanged in carrying this fixture.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-129-CON-1 | The producer SHALL compute the fixture's native raw-byte digest as SHA-256 over the artifact's exact bytes, canonicalizing none of them first. | Integrity | Test |
| FR-129-CON-2 | The producer SHALL carry the native raw-byte digest and the producer canonical digest in distinct domains, even where their hash texts coincide. | Traceability | Test |
| FR-129-CON-3 | The producer SHALL select the native artifact the producer-model admission seam consumes, never one belonging to the downstream compiled-protocol intake. | Interface | Test |
| FR-129-CON-4 | The producer SHALL draw every fixture export mapping from the named package's own export table, authoring none of them independently of it. | Correctness | Test |
| FR-129-CON-5 | The producer SHALL resolve the fixture relationship's `source` and `target` to two distinct native type exports, never to one export reached twice. | Correctness | Test |
| FR-129-CON-6 | The producer SHALL keep the fixture's admission independent of environment variables, working directory, wall clock, and network reachability. | Portability | Test |
| FR-129-CON-7 | The producer SHALL vendor no part of the native artifact's format, reader, or export vocabulary into this repository, selecting against them instead. | Interface | Inspection |
| FR-129-CON-8 | The fixture verifier SHALL enforce the configuration-declared native artifact byte, export-table byte, export-count, export-path-segment, and native definition-closure bounds before parsing or iterating those inputs; the runtime native-model admission and its compiler work limits remain owned by the downstream native consumer. | Resource | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-129-AC-1 | One admitted static fixture names a real native rule-model artifact, and the SHA-256 recomputed from that artifact's exact bytes equals the fixture's declared native raw-byte digest. | Test |
| FR-129-AC-2 | The fixture's declared native raw-byte digest differs from the digest of any canonical-JSON rendering of the same artifact, and the producer canonical-JSON and native raw-byte domains remain distinct members that neither substitutes for. | Test |
| FR-129-AC-3 | The bounded export-table manifest names the selected native artifact and its recomputed raw-byte digest, and every endpoint `typeIdentity` of the fixture resolves to a type export carrying the exact kind and ordered path that manifest declares. | Test |
| FR-129-AC-4 | The fixture's relationship resolves its `source` and its `target` to two distinct native type exports of that table, and neither end is reached by resolving the other. | Test |
| FR-129-AC-5 | A fixture whose declared native raw-byte digest is altered by one character and whose producer bundle digest is then correctly resealed passes static admission but is refused by native-evidence verification under `DIGEST_MISMATCH`, rather than being rejected only because its outer producer digest is stale. | Test |
| FR-129-AC-6 | Every native export whose kind the static vocabulary does not represent is absent from the fixture's export mappings, and its absence is recorded as a stated partition of the assessment half. | Inspection |
| FR-129-AC-7 | The fixture carries one direction from the closed vocabulary, and its two endpoint records remain independent members. | Test |
| FR-129-AC-8 | The fixture's admission run with altered environment variables, working directory, wall clock, and no network reachability produces the identical admitted bundle. | Test |
| FR-129-AC-11 | Replacing the committed native artifact bytes while retaining the fixture's declared native digest causes native-evidence verification to refuse under `DIGEST_MISMATCH`; changing a model-type kind or ordered path in the export-table manifest while retaining the bytes causes verification to refuse under `EXPORT_FOREIGN`. | Test |
| FR-129-AC-12 | Each endpoint's model type resolves through an export mapping carried by the correspondence binding that endpoint's own producer object and native artifact, and a bundle resolving it through another correspondence's mapping is refused. | Test |
| FR-129-AC-13 | Each of the five native-evidence dimensions is admitted at its configuration-declared bound and refuses under `DOCUMENT_RESOURCE_LIMIT`, naming that dimension, when offered one unit beyond it. | Test |
| FR-129-AC-9 | No part of the native artifact's format, reader, or export vocabulary is vendored into this repository — the committed fixture asset is artifact bytes only — and the authored members of `ProducerNativeCorrespondence`, `ProducerObjectReference`, and `NativeArtifactReference` are unchanged. | Compile |
| FR-129-AC-10 | Production of this fixture is recorded as static admission against real native bytes only, and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) owns the
  configuration document and its explicitly named finite bounds, from which
  the fixture verifier reads every native-evidence limit.
- [FR-127](./FR-127-resolve-endpoint-type-identities-to-native-type-exports.md)
  defines the endpoint type-export resolution that this requirement evidences
  against a real export table.
- [FR-128](./FR-128-declare-a-closed-relationship-direction-vocabulary.md) defines
  the closed direction vocabulary that this requirement's fixture relationship
  carries one value of.
- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) owns the
  correspondence record, its native artifact reference, its native definition
  closure, and its export mappings, which this requirement populates rather than
  redefines.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) owns the four-member
  digest selection, its closed domain vocabulary, and the cross-domain
  substitution refusal that this requirement cites rather than restates.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) owns indivisible admission
  and the ambient-input prohibition this requirement's fixture is admitted under.
- [NFR-036](../non-functional/NFR-036-byte-exact-producer-output.md) constrains the
  admitted bundle's canonical bytes to be byte-exact.
- `ix://agent-ix/quire-spec-language` at revision
  `5d76043b2af4308141817ce4a4055b03a0e5288f`, file
  `src/linking/composed/producer.rs`, declares `admit_filament_producer_model`,
  the seam that consumes this repository's `AdmittedStaticBundle` together with an
  admitted native model, and `src/protocol_artifact/wire.rs` declares the closed
  `ExportKind` vocabulary whose export table this requirement's fixture selects
  against. The `native_protocol_handoff` example emits the native rule-model
  artifact and adjacent export-table manifest the fixture qualification tests
  consume. The downstream seam owns constructor admission of the native model,
  byte-digest comparison under hard-clamped work limits, and final composed
  admission. This repository qualifies the committed producer fixture against
  those emitted artifacts and does not duplicate the downstream native reader.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
