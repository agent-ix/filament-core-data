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
semantic identity of every type and field it renders, every contract datum of
the document that the type surface does not itself express, and the provenance
of the document it was generated from, so that a consumer can name what it is
holding and prove which contract it came from without reflection, without a
decorator, and without reading a side-car file at run time.

## Inputs

- A semantic IR document at `contractVersion` `2.0.0`, admitted by [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- The document's `source` block: `identity`, `version`, `dialect`, and `digest`
- The document's `package` block: `identity`, `version`, `manifestDigest`, `mappingVersions`, `profileVersions`, and `lockDigest`
- The document's `contractVersion`
- The document's top-level `extensions[]` and `occurrences[]`
- Each type's `identity`, `roles[]`, `unknownPolicy`, and `extensions[]`, and, for a `record`, its `fields[]` with their `identity`, `unit`, and `extensions[]`, and its `relationships[]`
- The resolved model [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) builds, which carries the minted TypeScript identifier beside each identity
- The normalized IR fingerprint, computed by the backend through [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), which the document does not carry because a document cannot contain its own digest
- The backend identity and backend version the target contract of [FR-063](./FR-063-declare-the-generation-backend-seam.md) declares

## Outputs

- `src/compiler/backends/typescript-v1/metadata.mjs` exporting `renderIdentity(model)` and `renderProvenance(model)`. The compiler source module keeps its name; ADR-0007 governs the names of generated artifacts, not of the compiler's own modules
- `src/compiler/backends/typescript-v1/metadata.d.mts` declaring both functions and the generated `Provenance`, `RelationshipDescriptor`, `ExtensionDescriptor`, `OccurrenceDescriptor`, and identity-map shapes
- The generated `identity.ts` and `provenance.ts` modules of the emitted package

## Behavior

### The identity maps

- `renderIdentity` SHALL emit one exported readonly map from each generated TypeScript type identifier to that type's semantic identity, declared `as const`.
- `renderIdentity` SHALL emit one exported readonly map from each `<Type>.<field>` key to that field's semantic identity, declared `as const`.
- The `as const` assertion is what makes these maps readonly and their values literal types, and [FR-066](./FR-066-generate-runtime-validators.md) exempts it by name from the type-assertion prohibition it places on generated source, so the two requirements agree rather than contradict.
- `renderIdentity` SHALL order the entries of both maps by key, compared by code point rather than by locale.
- `renderIdentity` SHALL emit an entry for every type the package exports, so the type-identity map is exhaustive by construction.
- The generated identity map SHALL be typed as `Record<ExportedTypeName, string>` over a union of the exported names, so that a missing entry and an entry for an unexported name each fail `tsc --noEmit` rather than passing unnoticed.

### The contract data the type surface does not carry

- A generated TypeScript type expresses structure and nothing else, so every other contract datum the IR document carries SHALL reach the consumer through this module. Nothing in the document is dropped, and the committed bases make that a live obligation rather than a precaution: `conformance/bases/core-2-0.json` and `conformance/bases/package-2-0.json` each carry an occurrence, a document-level extension, and a field declaring `unit: "ms"`, and the `typescript` target contract sets `unsupportedFeaturePolicy: "fail"`, so a silent drop is not available.
- `renderIdentity` SHALL emit, for every type, a readonly array of that type's `roles[]`, ordered as the document orders them, because a role is contract data a consumer may dispatch on.
- `renderIdentity` SHALL emit `TYPE_IDENTITY_FIELDS`, mapping every `identified` construct to the names of its identity fields in the order `identityFields` declares them; any other type has no entry, and the map is emitted, empty, when the document declares no `identified` construct, so a consumer reads one surface.
- Where the document carries a construct member beyond identity fields, or a population, `renderIdentity` SHALL also emit the descriptor interfaces `TransitionDescriptor`, `StepDescriptor`, `TermDescriptor`, `OperationContractDescriptor` and `PopulationDescriptor`, and these maps keyed by generated identifier, each with an entry only for a type carrying the member: `TYPE_SUPERTYPES`, `TYPE_ABSTRACT`, `TYPE_OWNER`, `TYPE_MEMBERS`, `TYPE_OCCURRENCE_FIELD`, `TYPE_EQUALITY`, `TYPE_IMMUTABLE`, `TYPE_STATES`, `TYPE_TRANSITIONS`, `TYPE_STEPS`, `TYPE_PERSISTS`, and `TYPE_VOCABULARY`; `FIELD_SUBSETS` and `FIELD_REDEFINES`, keyed `<Type>.<field>`; `OPERATION_CONTRACTS`, keyed `<Type>.<operation>`; and `POPULATIONS`, the document's populations in order. A document of records and entities emits none of them, so its identity module is unchanged.
- Clauses [#159](https://github.com/agent-ix/filament-core-data/issues/159), transition guards [#160](https://github.com/agent-ix/filament-core-data/issues/160), transitions [#161](https://github.com/agent-ix/filament-core-data/issues/161), `subsets` [#162](https://github.com/agent-ix/filament-core-data/issues/162), operation frames [#163](https://github.com/agent-ix/filament-core-data/issues/163) and populations [#164](https://github.com/agent-ix/filament-core-data/issues/164) are carried as data and enforced by no generated code, each the owning issue's declared loss: the backend emits one non-blocking `CONSTRUCT_MEMBER_UNENFORCED` per member kind the document declares, and `loss.mjs` names each in `RENDERED_NOT_LOST`.
- `renderIdentity` SHALL emit, for every type, that type's declared `unknownPolicy`, including for the seven kinds on which FR-066 gives it no validation effect.
- `renderIdentity` SHALL emit, for every `record`, one readonly relationship descriptor per declared relationship, carrying the relationship's `identity`, `verb`, `category`, `composite`, `target` identity, and `multiplicity` lower and upper bounds.
- `renderMetadata` SHALL render every declared `operation` as a readonly descriptor carrying its identity, name, parameter descriptors, `returns` where present, and its `pre` and `post` clause ids, because an operation is contract data a consumer may dispatch on and no generated function is emitted for it.
- `renderMetadata` SHALL render every declared `clause` as a readonly descriptor carrying its identity, `language`, `clauseId`, opaque `text` and `sourceSpan` where present, and SHALL NOT parse the text, because `agent-ix/quire-contract-ir#52` owns clause semantics and the IR itself never parses it.
- `renderMetadata` SHALL render every field's `defaultKind` and, where the kind is not `none`, its `defaultValue`, so that a `representation` or `migration` default is visible to a consumer even though [FR-066](./FR-066-generate-runtime-validators.md)'s generated validator applies only a `semantic` one.
- This requirement SHALL be the only place a relationship descriptor is rendered; [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) renders none, because a relationship is not a member of a record's serialized shape and two descriptors of one relationship in two modules would be two answers to one question.
- `renderIdentity` SHALL emit an empty relationship descriptor list for a `record` declaring no relationship, rather than omitting the member, so a consumer reads one shape.
- `renderIdentity` SHALL emit, for every field declaring a `unit`, that unit string beside the field's identity, and SHALL emit no unit member for a field declaring none.
- `renderMetadata` SHALL emit the document's top-level `extensions[]` as a readonly array of descriptors, each carrying `identity`, `version`, `required`, `capability` where the extension declares one, and `payload`.
- `renderIdentity` SHALL emit each type's `extensions[]` and each field's `extensions[]` as readonly arrays of the same descriptor shape, keyed by the type identifier and by the `<Type>.<field>` key respectively.
- Together these three extension surfaces are the extension API the issue's first deliverable names, and they SHALL expose every extension the document carries rather than the single `doc` extension FR-064 consumes for JSDoc.
- `renderMetadata` SHALL emit the document's `occurrences[]` as a readonly array of descriptors, each carrying `identity`, `definition`, `observedAt`, and `value`.
- `renderMetadata` SHALL emit an empty array where the document carries no occurrence, so the member is always present.

### The metadata module

- `renderMetadata` SHALL emit one exported frozen `as const` object carrying `contractVersion`, `source.identity`, `source.version`, `source.dialect`, `source.digest`, `package.identity`, `package.version`, `package.manifestDigest`, `package.mappingVersions`, `package.profileVersions`, `package.lockDigest`, and the IR fingerprint.
- `renderProvenance` SHALL compute the IR fingerprint as the canonical digest of the *normalized* document, so two documents differing only in the order of an identity-keyed set carry the same fingerprint.
- `renderProvenance` SHALL emit `mappingVersions` and `profileVersions` as readonly arrays in the order the document carries them, because those arrays are ordered contract data rather than sets.
- `renderProvenance` SHALL emit the backend identity and the backend version alongside the provenance, so a consumer can say which generator produced the bytes it is holding.
- The generated `provenance.ts` SHALL import nothing at all, so a consumer reading provenance alone reaches neither validator nor identity code.
- The generated `identity.ts` SHALL import nothing from the generated validators, for the same reason.

### What metadata may not carry

- `renderProvenance` SHALL emit no wall-clock value, no generation timestamp, and no build date.
- `renderProvenance` SHALL emit no hostname and no machine identifier.
- `renderProvenance` SHALL emit no user name, no user id, and no home directory.
- `renderMetadata` SHALL emit no working directory and no absolute path.
- `renderMetadata` SHALL emit no tool path, no interpreter path, and no environment variable value.
- An `occurrence` carries an `observedAt` timestamp authored in the document, and `renderMetadata` SHALL copy that value verbatim; it is contract data the document supplies rather than a clock the backend read, and the prohibition above is on the latter.
- The generated banner at the head of every emitted file SHALL name the backend identity, the backend version, and the IR fingerprint.
- The generated banner SHALL NOT name a clock value.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-067-CON-1 | The generated metadata SHALL carry no timestamp, hostname, user, working directory, or tool path the backend itself read. Each is a determinism leak this repository has shipped before, and each is named here so a test can look for it by name rather than by judgement. | Determinism | Static analysis |
| FR-067-CON-2 | The identity map SHALL be exhaustive over the exported types by construction, so an added export with no identity entry fails the typecheck rather than producing a partial map at run time. | Correctness | Compile |
| FR-067-CON-3 | The metadata module SHALL NOT import the validator module, so a metadata-only import does not reach the validators. | Portability | Reachable-symbol walk |
| FR-067-CON-4 | The backend SHALL compute the fingerprint over the normalized document rather than over the file bytes, so a re-serialized document with the same meaning does not change it. | Correctness | Property |
| FR-067-CON-5 | Identity strings SHALL be copied from the document verbatim, never minted, shortened, or re-cased by the backend, because an identity that moves with a rename is defect DEF-PROTO-008. | Integrity | Test |
| FR-067-CON-6 | The backend SHALL render every node the IR document carries through this requirement or through another, dropping none without a declared representability loss, because the `typescript` target contract sets `unsupportedFeaturePolicy: "fail"`. | Completeness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-067-AC-1 | The generated type-identity map carries one entry per exported type, with the identity byte-equal to the document's, for every positive fixture. | Test |
| FR-067-AC-2 | The generated field-identity map carries one entry per field of every exported `record`, keyed `<Type>.<field>`. | Test |
| FR-067-AC-3 | Both identity maps are ordered by key under code-point comparison, and the order is unchanged under `LC_ALL=tr_TR.UTF-8`. | Property |
| FR-067-AC-4 | A generated package with one type removed from the identity map fails `tsc --noEmit`, and one with an entry for an unexported name fails likewise. | Compile |
| FR-067-AC-5 | The metadata object carries all eleven provenance values plus the fingerprint, each byte-equal to the document's value or to the computed digest. | Test |
| FR-067-AC-6 | Two documents differing only in the order of `types`, `fields`, `constraints`, and `extensions` produce the same generated fingerprint; two differing in any semantic value produce different ones. | Property |
| FR-067-AC-7 | Every emitted file's banner names the backend identity, the backend version, and the fingerprint, and no emitted byte outside a copied `occurrences[].observedAt` value matches a date, time, hostname, user, or absolute-path pattern. | Static |
| FR-067-AC-8 | Generating the same document twice at different wall-clock times produces byte-identical `identity.ts` and `provenance.ts`. | Snapshot |
| FR-067-AC-9 | `roles[]` is exposed per type as a readonly array equal to the document's, including the empty array for a type declaring none. | Unit |
| FR-067-AC-10 | A `record` declaring two relationships exposes two descriptors carrying `identity`, `verb`, `category`, `composite`, `target`, and the multiplicity bounds; a `record` declaring none exposes an empty array; and no relationship descriptor appears in `types.ts`. | Unit |
| FR-067-AC-11 | A single-type import of `provenance.ts` reaches no validator symbol, measured by the FR-071 reachable-symbol walk rather than by a bundler. | Analysis |
| FR-067-AC-12 | Renaming a type's `displayName` while leaving its `identity` unchanged leaves every identity-map value unchanged. | Unit |
| FR-067-AC-13 | The metadata module typechecks under `tsc --noEmit` with no `any` and no type assertion other than `as const`, and its declared type matches `metadata.d.mts`. | Compile |
| FR-067-AC-14 | Generating from `conformance/bases/core-2-0.json` and `conformance/bases/package-2-0.json` exposes each document's occurrence, its document-level extension, and the `unit: "ms"` of its declaring field, each byte-equal to the document's value. | Test |
| FR-067-AC-15 | Every type-level and field-level `extensions[]` entry of a fixture document appears as a descriptor carrying `identity`, `version`, `required`, `capability` where declared, and `payload`, including the `doc` extension FR-064 also renders as JSDoc. | Test |
| FR-067-AC-16 | An audit that walks every node of a fixture IR document finds each one either rendered by a generated module or named in a declared representability loss, and a seeded unrendered node makes the audit fail. | Test |
| FR-067-AC-18 | An operation, a clause and a `migration` default each appear in the generated metadata as readonly descriptor data, and none of the three causes generation to refuse. | Unit |
| FR-067-AC-19 | For a `2.0.0` document declaring two entities and no other identity-bearing type, `TYPE_IDENTITY_FIELDS` equals the two entities' identity field names, and a document of records emits the map empty. | Unit (TC-1763) |
| FR-067-AC-20 | Generating the contract `2.0.0` constructs fixture emits each construct map with an entry for exactly the types carrying the member, `OPERATION_CONTRACTS["OrderLifecycle.advance"]` carrying its frame and Quire clauses, `POPULATIONS` naming `OpenOrders`, and the lifted `config-version-table` golden's identity module emits none of them. | Unit (TC-1773) |
| FR-067-AC-17 | Each type's declared `unknownPolicy` appears in the metadata for all eight kinds, including the `union` declaring `surface` and the `map` declaring `preserve` in the committed bases. | Unit |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md)
