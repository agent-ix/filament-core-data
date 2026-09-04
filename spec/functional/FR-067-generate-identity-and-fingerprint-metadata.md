---
id: FR-067
title: "Generate identity and fingerprint metadata"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
---
# [FR-067] Generate identity and fingerprint metadata

## Description

The generated package SHALL carry, as ordinary exported readonly data, the
semantic identity of every type and field it renders and the provenance of the
document it was generated from, so that a consumer can name what it is holding
and prove which contract it came from without reflection, without a decorator,
and without reading a side-car file at run time.

## Inputs

- A semantic IR document at `contractVersion` `1.1.0`, admitted by [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- The document's `source` block: `identity`, `version`, `dialect`, and `digest`
- The document's `package` block: `identity`, `version`, `manifestDigest`, `mappingVersions`, `profileVersions`, and `lockDigest`
- The document's `contractVersion`
- Each type's `identity`, `roles[]`, and, for a `record`, its `fields[].identity` and `relationships[]`
- The normalized IR fingerprint, computed by the backend through [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), which the document does not carry because a document cannot contain its own digest
- The backend identity and backend version the target contract of [FR-063](./FR-063-declare-the-generation-backend-seam.md) declares

## Outputs

- `src/compiler/backends/typescript-v1/metadata.mjs` exporting `renderIdentity(model)` and `renderMetadata(model)`
- `src/compiler/backends/typescript-v1/metadata.d.mts` declaring both functions and the generated `SemanticMetadata`, `RelationshipDescriptor`, and identity-map shapes
- The generated `identity.ts` and `metadata.ts` modules of the emitted package

## Behavior

### The identity maps

- `renderIdentity` SHALL emit one exported readonly map from each generated TypeScript type identifier to that type's semantic identity, declared `as const`.
- `renderIdentity` SHALL emit one exported readonly map from each `<Type>.<field>` key to that field's semantic identity, declared `as const`.
- `renderIdentity` SHALL order the entries of both maps by key, compared by code point rather than by locale.
- `renderIdentity` SHALL emit an entry for every type the package exports, so the type-identity map is exhaustive by construction.
- The generated identity map SHALL be typed as `Record<ExportedTypeName, string>` over a union of the exported names, so that a missing entry and an entry for an unexported name each fail `tsc --noEmit` rather than passing unnoticed.
- `renderIdentity` SHALL emit, for every type, a readonly array of that type's `roles[]`, ordered as the document orders them, because a role is contract data a consumer may dispatch on.
- `renderIdentity` SHALL emit, for every `record` type, one readonly relationship descriptor per declared relationship, carrying `verb`, `category`, `composite`, the `target` identity, and the relationship's `multiplicity` lower and upper bounds.
- `renderIdentity` SHALL emit an empty relationship descriptor list for a `record` declaring no relationship, rather than omitting the member, so a consumer reads one shape.

### The metadata module

- `renderMetadata` SHALL emit one exported frozen `as const` object carrying `contractVersion`, `source.identity`, `source.version`, `source.dialect`, `source.digest`, `package.identity`, `package.version`, `package.manifestDigest`, `package.mappingVersions`, `package.profileVersions`, `package.lockDigest`, and the IR fingerprint.
- `renderMetadata` SHALL compute the IR fingerprint as the canonical digest of the *normalized* document, so two documents differing only in the order of an identity-keyed set carry the same fingerprint.
- `renderMetadata` SHALL emit `mappingVersions` and `profileVersions` as readonly arrays in the order the document carries them, because those arrays are ordered contract data rather than sets.
- `renderMetadata` SHALL emit the backend identity and the backend version alongside the provenance, so a consumer can say which generator produced the bytes it is holding.
- The generated `metadata.ts` SHALL import nothing from the generated validators, so a consumer reading metadata alone does not pull validator code into a bundle.
- The generated `identity.ts` SHALL import nothing from the generated validators, for the same reason.

### What metadata may not carry

- `renderMetadata` SHALL emit no wall-clock value, no generation timestamp, and no build date.
- `renderMetadata` SHALL emit no hostname and no machine identifier.
- `renderMetadata` SHALL emit no user name, no user id, and no home directory.
- `renderMetadata` SHALL emit no working directory and no absolute path.
- `renderMetadata` SHALL emit no tool path, no interpreter path, and no environment variable value.
- The generated banner at the head of every emitted file SHALL name the backend identity, the backend version, and the IR fingerprint.
- The generated banner SHALL NOT name a clock value.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-067-CON-1 | The generated metadata SHALL carry no timestamp, hostname, user, working directory, or tool path. Each is a determinism leak this repository has shipped before, and each is named here so a test can look for it by name rather than by judgement. | Determinism | Static analysis |
| FR-067-CON-2 | The identity map SHALL be exhaustive over the exported types by construction, so an added export with no identity entry fails the typecheck rather than producing a partial map at run time. | Correctness | Compile |
| FR-067-CON-3 | The metadata module SHALL NOT import the validator module, so a metadata-only import does not retain the validators in a bundle. | Portability | Bundle-surface test |
| FR-067-CON-4 | The backend SHALL compute the fingerprint over the normalized document rather than over the file bytes, so a re-serialized document with the same meaning does not change it. | Correctness | Property |
| FR-067-CON-5 | Identity strings SHALL be copied from the document verbatim, never minted, shortened, or re-cased by the backend, because an identity that moves with a rename is defect DEF-PROTO-008. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-067-AC-1 | The generated type-identity map carries one entry per exported type, with the identity byte-equal to the document's, for every positive fixture. | Test |
| FR-067-AC-2 | The generated field-identity map carries one entry per field of every exported `record`, keyed `<Type>.<field>`. | Test |
| FR-067-AC-3 | Both identity maps are ordered by key under code-point comparison, and the order is unchanged under `LC_ALL=tr_TR.UTF-8`. | Property |
| FR-067-AC-4 | A generated package with one type removed from the identity map fails `tsc --noEmit`, and one with an entry for an unexported name fails likewise. | Compile |
| FR-067-AC-5 | The metadata object carries all eleven provenance values plus the fingerprint, each byte-equal to the document's value or to the computed digest. | Test |
| FR-067-AC-6 | Two documents differing only in the order of `types`, `fields`, `constraints`, and `extensions` produce the same generated fingerprint; two differing in any semantic value produce different ones. | Property |
| FR-067-AC-7 | Every emitted file's banner names the backend identity, the backend version, and the fingerprint, and no emitted byte matches a date, time, hostname, user, or absolute-path pattern. | Static |
| FR-067-AC-8 | Generating the same document twice at different wall-clock times produces byte-identical `identity.ts` and `metadata.ts`. | Snapshot |
| FR-067-AC-9 | `roles[]` is exposed per type as a readonly array equal to the document's, including the empty array for a type declaring none. | Unit |
| FR-067-AC-10 | A `record` declaring two relationships exposes two descriptors carrying `verb`, `category`, `composite`, `target`, and the multiplicity bounds; a `record` declaring none exposes an empty array. | Unit |
| FR-067-AC-11 | Importing only `metadata.ts` from the generated package produces a bundle containing no validator symbol, measured by the FR-071 bundle-surface fixture. | Analysis |
| FR-067-AC-12 | Renaming a type's `displayName` while leaving its `identity` unchanged leaves every identity-map value unchanged. | Unit |
| FR-067-AC-13 | The metadata module typechecks under `tsc --noEmit` with no `any` and no assertion, and its declared type matches `metadata.d.mts`. | Compile |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md)
