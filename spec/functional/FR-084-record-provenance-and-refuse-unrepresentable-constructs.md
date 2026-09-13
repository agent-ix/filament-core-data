---
id: FR-084
title: "Record kernel provenance and refuse an unrepresentable construct"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-084] Record kernel provenance and refuse an unrepresentable construct

## Description

The kernel IR document SHALL carry a `source` block and a `package` block that
name exactly which bytes it was produced from, every generated package SHALL
carry the same fingerprint back out, this requirement SHALL record the two
representability losses it declares in a closed register with a stable
diagnostic code apiece, and any construct outside the closed keyword set or
outside that register SHALL refuse generation rather than be approximated.

A generated package that cannot be traced to the bytes it came from is not
evidence of anything: a consumer holding a Rust crate and a Pydantic module
cannot tell whether they were generated from the same kernel unless both carry
the same digest, and a reviewer cannot tell whether a committed generated tree
is stale unless the digest it carries can be recomputed from the bundle. That is
what the `source.digest` and the package fingerprint are for, and it is why both
are computed over the bundle bytes rather than over a version string.

The register is closed for the same reason the keyword set is closed. A lowering
that silently approximates one construct it has no representation for will
silently approximate the next one, and the resulting package is *wrong* rather
than *missing* — a check the validator skips, a value it substitutes. Two losses
are declared here because both were measured against the committed bundle and
neither can be repaired without editing a published schema, which this
requirement refuses to do. A third loss is not a code change; it is an edit to
the register table below, a new registered diagnostic code, and an issue filed
against the contract owner, in that order.

## Inputs

- `schema/semantic/v1/semantic-ir.schema.json`, whose root requires `contractVersion`, `source`, `package`, `types`, `occurrences`, and `extensions`, whose `source` requires `identity`, `version`, `dialect`, and `digest`, and whose `package` requires `identity`, `version`, `manifestDigest`, `mappingVersions`, `profileVersions`, and `lockDigest`, all under `additionalProperties: false`
- `schema/semantic/v1/common.schema.json#/$defs/frontendDialect`, whose enum is exactly `typespec` and `spec-bundle`; `#/$defs/sha256`, whose pattern is `^sha256:[0-9a-f]{64}$`; `#/$defs/packageIdentity`; and `#/$defs/semver`
- The 30 documents of `packages/semantic-core/generated/json-schema/` and their gating target `make semantic-core-check`
- `packages/semantic-core/main.tsp`, the authored source, and `packages/semantic-core/inventory.json`, its declaration inventory
- `packages/semantic-core/kernel-scalars.json`, whose `JsonObject` row prescribes the `record` / `fields: []` / `unknownPolicy: preserve` lowering
- `src/compiler/diagnostics.mjs`, the closed `DIAGNOSTIC_CODES` registry [FR-049](./FR-049-emit-stable-source-located-diagnostics.md) owns, which every code this requirement emits must join
- `crates/semantic-ir/RULES.md`, which derives `presence` from `multiplicity.lower` and reports the disagreement as `PRESENCE_MULTIPLICITY_MISMATCH`
- `spec/reviews/21-rust-serde-backend/failure-domain.md` FND-956, which records the adjacent gap that there is no way to say "optional, but non-empty when present"
- The kernel manifest and lock FR-081 declares, from which the `package` block's digests are read

## Outputs

- `src/compiler/frontend/json-schema/provenance.mjs`, exporting `bundleDigest(files)`, `sourceBlock(bundle)`, and `packageBlock(manifest, lock)`
- `src/compiler/frontend/json-schema/representability.mjs`, exporting `KERNEL_LOSSES`, the closed register, and `decide(construct)` returning either a register row or a refusal
- The matching `.d.mts` declarations for both
- Three added members of `DIAGNOSTIC_CODES` in `src/compiler/diagnostics.mjs`: `KERNEL_UNCONSTRAINED_VALUE`, `KERNEL_REQUIRED_COLLECTION_PRESENCE`, and `UNSUPPORTED_SCHEMA_KEYWORD`
- The `source` and `package` blocks of the emitted kernel IR document at `packages/semantic-kernel/semantic-ir.json`
- `packages/semantic-kernel/losses.json`, the serialized closed loss register, carrying one row per declared loss with its code, its construct, its effect, and the number of the issue filed against the contract owner
- `scripts/build-semantic-kernel.mjs`, the orchestrating generator, whose `--check` verb regenerates and compares rather than writing
- A fingerprint triple carried by each of the four generated packages
- `docs/semantic-data-system/compiler-diagnostics.md`, regenerated by `scripts/build-compiler-docs.mjs` as a consequence of the three added registry members and never hand-edited

## Behavior

### The source block

- `source.identity` SHALL be `ix://agent-ix/semantic-core/source/main.tsp`, naming `packages/semantic-core/main.tsp`, the authored source.
- `source.version` SHALL be `0.1.0`, the version segment the bundle's own `$id`s carry — `https://schemas.agent-ix.org/semantic-core/0.1.0/TypeRef.json` and its twenty-nine siblings — so the IR's declared version and the bundle's declared version cannot disagree without a test failing.
- `source.dialect` SHALL be `typespec`.
- The reason SHALL be recorded rather than left implicit: `common.schema.json#/$defs/frontendDialect` admits exactly `typespec` and `spec-bundle` and declares no `json-schema` value, and the JSON Schema bundle is the pinned official `@typespec/json-schema` emitter's deterministic projection of `main.tsp` — the transport this lowering reads, not the source the kernel was authored in. Declaring `typespec` states the authored origin; declaring `spec-bundle` would be false.
- This requirement SHALL file an issue against the live contract owner asking whether a projection of a declared dialect deserves a dialect value of its own, SHALL record that issue's number beside the `source.dialect` decision, and SHALL NOT edit `common.schema.json` to add one. `agent-ix/filament-core-data#59` records that the closed issue #9 can no longer own the contract-gap register, so the issue is filed against a live owner rather than added to a register with none.
- `source.digest` SHALL be `sha256:` followed by the lower-case hexadecimal SHA-256 of the FR-048 canonical encoding of the array of `[path, fileDigest]` pairs covering all 30 documents of `packages/semantic-core/generated/json-schema/`, where `path` is repository-root-relative and `fileDigest` is `sha256:` plus the hex SHA-256 of that file's bytes, and the array is ordered by `path` under code-point comparison.
- The digest SHALL be taken over the bundle bytes and not over `main.tsp`, because the bundle is what this lowering read; the resulting asymmetry — a `source.identity` naming the `.tsp` beside a digest over its projection — SHALL be stated in the same issue as the dialect question rather than hidden by digesting a file the lowering never opened.
- Changing any byte of any of the 30 documents SHALL change `source.digest`, and `make semantic-core-check`, which gates the bundle byte-for-byte against a fresh emitter run, SHALL be the check that keeps that digest meaningful.
- `provenance.mjs` SHALL read no clock, no environment variable, and no network, and SHALL take the file bytes as an argument, so the digest is a function of the bundle and of nothing else.

### The package block

- `package.identity` SHALL be `agent-ix/semantic-core`, which matches `common.schema.json#/$defs/packageIdentity`, and SHALL be the same `agent-ix/semantic-core` segment every identity FR-083 mints carries.
- `package.version` SHALL equal `source.version`, because the kernel package and the kernel source are versioned as one artifact and a divergence between them would be unresolvable by a consumer holding only the IR.
- `package.manifestDigest` and `package.lockDigest` SHALL be the digests of the kernel manifest and lock FR-081 declares, computed under the FR-048 canonicalization and never restated as constants.
- `package.mappingVersions` and `package.profileVersions` SHALL be the empty array where the kernel declares no mapping and no profile, which `semantic-ir.schema.json` permits because neither array carries a `minItems`; the empty array SHALL be emitted rather than the member omitted, since both members are `required`.
- The emitted document SHALL declare `contractVersion` `1.1.0` and SHALL carry `occurrences` and `extensions` as empty arrays, because the root requires both and the kernel declares neither.

### The fingerprint the generated packages carry

- Each of the four generated packages SHALL carry the same fingerprint triple: `source.digest`, `package.version`, and the `fingerprintIr` of the emitted IR document computed by `src/compiler/ir/normalize.mjs`.
- The TypeScript package SHALL carry it in the `provenance.ts` [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) generates; the Rust crate, the Python package, and the modular JSON Schema package SHALL each carry the identical three values in the metadata surface their own backend emits.
- The three values SHALL be byte-identical across the four packages, asserted by a test that reads all four rather than by generating one and asserting about the others.
- A consumer holding two of the four packages SHALL be able to decide whether they came from the same kernel by comparing the triple alone, without a network call and without reading this repository.
- The fingerprint SHALL NOT include a build timestamp, a host name, a tool path, or a package-manager version, because any of those would make two generations of the same bundle compare unequal and would destroy the only property the fingerprint exists to provide.

### The closed loss register

- `representability.mjs` SHALL export `KERNEL_LOSSES` as a frozen register carrying exactly the two rows below and no others, and `scripts/build-semantic-kernel.mjs` SHALL serialize it to `packages/semantic-kernel/losses.json`, which is this issue's own register and not the corpus's.

| Loss | Construct | Registered code | Effect on the IR | Owner issue |
|---|---|---|---|---|
| Unconstrained value | `DefaultDecl.json`'s `value`, `unknown` in `main.tsp` and `{}` in the emitted schema | `agent-ix.compiler.KERNEL_UNCONSTRAINED_VALUE` | Lowered under the `kernel-scalars.json` `JsonObject` form — `kind: record`, `fields: []`, `unknownPolicy: "preserve"` — which narrows "any JSON value" to "any JSON object" | Filed against the contract owner; the number is recorded in the register row |
| Required-but-possibly-empty collection | `OperationDecl.json`'s `params`, listed in `required` with no `minItems` | `agent-ix.compiler.KERNEL_REQUIRED_COLLECTION_PRESENCE` | `multiplicity.lower: 0` forces `presence: "optional"`, so the IR cannot say "the member must be present and may be empty" | Filed against the contract owner; the number is recorded in the register row |

- The first row's narrowing SHALL be stated as a narrowing and not as a mapping: IR v1.1 carries no any-type, `field.defaultValue` is schema-typed `{}` while `field.typeRef` is a single `semanticIdentity` that must resolve to a declared type, and the `JsonObject` lowering is the nearest declared form. A `DefaultDecl` whose `value` is a JSON string, number, boolean, array, or `null` is admitted by the bundle and not describable by the minted `DefaultDeclValue`.
- The second row's cause SHALL be cited to `crates/semantic-ir/RULES.md`, which derives `presence` from `multiplicity.lower` and reports a stated `presence` that disagrees as `PRESENCE_MULTIPLICITY_MISMATCH`; stating `presence: "required"` beside `lower: 0` to preserve the JSON Schema meaning would produce a document the reader rejects, so the loss is taken rather than the rule broken.
- The second row SHALL cite FND-956 of `spec/reviews/21-rust-serde-backend/failure-domain.md` as the adjacent recorded gap — that `nonEmpty` applies to the `sequence` and `map` kinds and so cannot say "optional, but non-empty when present" — rather than restating it as a new finding.
- Both codes SHALL be added to `DIAGNOSTIC_CODES` in `src/compiler/diagnostics.mjs` as members of `COMPILER_CODES`, so they carry the `agent-ix.compiler.` prefix and match `common.schema.json#/$defs/diagnostic`'s code pattern; neither belongs in `READER_CODES`, because neither names a defect in the shape of an IR document.
- Both codes SHALL be registered as advisory — severity `warning`, `blocking` false — through the `advisory` helper `src/compiler/diagnostics.mjs` already exposes, because a declared loss is recorded and generated from while an undeclared one refuses; the register is the gate, and the severity follows from the row's existence rather than the row from the severity.
- Each declared loss SHALL be emitted once per occurrence, located at the owning construct, and SHALL name the register row, the minted type identity it affects, and the issue number filed against the contract owner.
- The register SHALL be closed: `decide` SHALL return a row only for a construct one of the two rows names, and every other unrepresentable construct SHALL refuse.
- Adding a third row SHALL require an edit to the table above, a new member of `DIAGNOSTIC_CODES`, a row in `packages/semantic-kernel/losses.json`, and a filed issue; a loss recorded in code without all four SHALL fail the register's own bijection test.
- A declared loss SHALL NOT be recorded by adding a row to `conformance/contract-gaps.json` or `conformance/divergences.json`; those registers belong to the corpus owner, and this requirement records its losses in its own register and asks the contract owner by issue.
- No call site SHALL spell a diagnostic code as a string literal, following FR-049 and FR-063-AC-16.

### Refusal

- A JSON Schema keyword outside the closed set FR-082 admits SHALL refuse generation under `agent-ix.compiler.UNSUPPORTED_SCHEMA_KEYWORD`, blocking, naming the keyword and the JSON pointer at which it occurs.
- An unrepresentable construct that no `KERNEL_LOSSES` row names SHALL refuse generation under `agent-ix.compiler.UNSUPPORTED_LOSS`, which `DIAGNOSTIC_CODES` already carries, naming the construct and the owning identity.
- A construct that would produce an identity outside `common.schema.json#/$defs/semanticIdentity` SHALL refuse under the same code rather than be escaped, transliterated, or truncated into a conforming string, which is the refusal FR-083 defers to here.
- A refusal SHALL emit no IR document and no generated file, so a partial artifact cannot be mistaken for a complete one; the answer is the diagnostic set alone.
- A refusal SHALL NOT be downgraded to a declared loss, to an advisory, or to a suppression, and SHALL NOT be silenced by a flag, an environment variable, or a caller-supplied option; there is no option that turns a refusal into an approximation.
- A keyword outside the closed set SHALL NOT be dropped silently, which is the specific failure this arm exists to prevent: a dropped `pattern` or `minimum` produces a generated validator that accepts values the contract forbids, and the package is then wrong rather than incomplete.
- Every diagnostic this requirement emits SHALL validate against `common.schema.json#/$defs/diagnostic` and SHALL be ordered by the `sortDiagnostics` of `src/compiler/diagnostics.mjs`, which compares by code point and not by a locale-sensitive collation.
- Neither `provenance.mjs` nor `representability.mjs` SHALL throw for any bundle; a defect in a read document is a returned diagnostic.

### What is never edited

- No file under `schema/**` SHALL be edited to make a construct representable — not `semantic-ir.schema.json` to admit an any-type, not `common.schema.json#/$defs/frontendDialect` to add a `json-schema` value, and not `#/$defs/field` to admit an inline `typeRef`.
- No file under `packages/semantic-core/generated/json-schema/` SHALL be edited, and `packages/semantic-core/main.tsp` SHALL NOT be edited to remove a construct this lowering finds inconvenient; the bundle is the measured input and editing it would make the measurement describe a bundle nobody ships.
- Where the published contract and the kernel bundle disagree, the disagreement SHALL be recorded as a register row or a filed issue and SHALL remain visible; absorbing it into a schema edit is how a contract defect stops being visible, which `agent-ix/filament-core-data#57` already records for the committed target-contract licence.
- This requirement SHALL NOT edit any file under `conformance/` — `contract-gaps.json` and `divergences.json` included — nor under `fixtures/`, nor `src/compiler/cli.mjs`, nor `package.json`, nor any module under `src/compiler/backends/`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-084-CON-1 | This requirement SHALL close `KERNEL_LOSSES` at exactly the two declared rows and put it in bijection with the loss codes it adds to `DIAGNOSTIC_CODES`, asserted in both directions; a code with no row and a row with no code each fail. | Integrity | Test |
| FR-084-CON-2 | No file under `schema/**`, `fixtures/**`, `conformance/**`, `packages/semantic-core/**`, or `src/compiler/backends/**`, and neither `src/compiler/cli.mjs` nor `package.json`, SHALL appear in this requirement's change set; representability is achieved by refusing, never by widening a published contract. Its own artifacts are `src/compiler/frontend/json-schema/provenance.mjs` and `representability.mjs` with their `.d.mts` declarations, `packages/semantic-kernel/semantic-ir.json`, `packages/semantic-kernel/losses.json`, `scripts/build-semantic-kernel.mjs`, `src/compiler/diagnostics.mjs`, the regenerated `docs/semantic-data-system/compiler-diagnostics.md`, and `test/semantic-kernel.test.ts`. | Non-disruption | Change-set diff |
| FR-084-CON-3 | A refusal SHALL NOT be suppressible by any caller-supplied option, environment variable, or flag; a search for a bypass finds none. | Safety | Static |
| FR-084-CON-4 | `provenance.mjs` SHALL compute `source.digest` as a pure function of the supplied file bytes and paths, reading no file system, clock, environment variable, or socket of its own. | Determinism | Property |
| FR-084-CON-5 | The fingerprint triple SHALL contain no timestamp, host name, absolute path, or tool version, so two generations of the same bundle on two hosts compare equal. | Determinism | Static |
| FR-084-CON-6 | Neither module SHALL throw for any input, so a hostile or truncated document yields a diagnostic set rather than ending the run with no answer. | Safety | Fuzz |
| FR-084-CON-7 | This requirement SHALL NOT relax, reorder, or reword any existing member of `DIAGNOSTIC_CODES`; it adds three members and changes none. | Non-disruption | Registry diff |
| FR-084-CON-8 | Each declared loss row SHALL name a filed issue against a live contract owner; a row whose issue member is empty fails the register's own test, so a loss cannot be declared and then left unowned. | Traceability | Test |
| FR-084-CON-9 | The two declared losses SHALL be recorded in `packages/semantic-kernel/losses.json` and each SHALL oblige an issue filed against the contract owner; neither SHALL be repaired by editing a published schema, and neither SHALL be recorded by editing `conformance/contract-gaps.json` or `conformance/divergences.json`, which belong to the corpus owner and not to this issue. | Non-disruption | Change-set diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-084-AC-1 | The emitted kernel IR validates against `schema/semantic/v1/semantic-ir.schema.json` at `contractVersion` `1.1.0`, carrying every required member of `source` and `package` and no member `additionalProperties: false` forbids. | Test |
| FR-084-AC-2 | `source.dialect` is `typespec`, a member of `common.schema.json#/$defs/frontendDialect`; a test asserts that enum still carries no `json-schema` value, so adding one upstream fails here rather than silently changing the meaning of this document. | Test |
| FR-084-AC-3 | `source.digest` recomputed independently in the test from the 30 files of `packages/semantic-core/generated/json-schema/` equals the value the document carries, and mutating one byte of one document changes it. | Test |
| FR-084-AC-4 | `source.version`, `package.version`, and the `0.1.0` segment of every `$id` in the bundle are the same string; changing one alone fails. | Unit |
| FR-084-AC-5 | `package.identity` is `agent-ix/semantic-core`, matches `common.schema.json#/$defs/packageIdentity`, and equals the owner segment of every identity FR-083 mints. | Unit |
| FR-084-AC-6 | `package.manifestDigest` and `package.lockDigest` equal the FR-048 canonical digests of the kernel manifest and lock recomputed in the test, and `mappingVersions` and `profileVersions` are present as empty arrays. | Test |
| FR-084-AC-7 | The TypeScript, Rust, Python, and JSON Schema packages each carry `source.digest`, `package.version`, and `fingerprintIr` of the IR, all three byte-identical across the four, read from the four generated trees in one test. | Integration |
| FR-084-AC-8 | Generating twice from the same bundle on two working directories with differing paths and cleared environments produces identical fingerprints, and no generated file contains a timestamp, host name, or absolute path. | Integration |
| FR-084-AC-9 | `KERNEL_LOSSES` has exactly two rows and stands in bijection with the rows of `packages/semantic-kernel/losses.json`, which `scripts/build-semantic-kernel.mjs --check` regenerates and compares byte for byte; a test adding a third row without a registered code, and one adding a code without a row, each fail. | Unit |
| FR-084-AC-10 | Lowering the committed bundle emits exactly one `agent-ix.compiler.KERNEL_UNCONSTRAINED_VALUE` located at `DefaultDecl.json`'s `value`, naming the minted `DefaultDeclValue` identity, and the emitted type carries `kind: "record"`, `fields: []`, `unknownPolicy: "preserve"`. | Test |
| FR-084-AC-11 | Lowering the committed bundle emits exactly one `agent-ix.compiler.KERNEL_REQUIRED_COLLECTION_PRESENCE` located at `OperationDecl.json`'s `params`, and the emitted field carries `multiplicity.lower: 0` with `presence: "optional"`, which `src/compiler/ir/reader.mjs` admits with no `PRESENCE_MULTIPLICITY_MISMATCH`. | Test |
| FR-084-AC-12 | Both loss codes are members of `DIAGNOSTIC_CODES` carrying the `agent-ix.compiler.` prefix, severity `warning` and `blocking` false; both diagnostics validate against `common.schema.json#/$defs/diagnostic`; and the whole document still generates all four packages with those two diagnostics present. | Test |
| FR-084-AC-13 | A synthetic document carrying a keyword outside the closed set — `oneOf`, `additionalProperties`, `patternProperties`, `allOf`, `if`, `maxItems`, `multipleOf`, and `format`, exercised one at a time — refuses under `agent-ix.compiler.UNSUPPORTED_SCHEMA_KEYWORD` naming the keyword and its pointer, emits no IR document, and emits no generated file. | Test |
| FR-084-AC-14 | A synthetic unrepresentable construct that no register row names refuses under `agent-ix.compiler.UNSUPPORTED_LOSS` and is never reported as a declared loss; a test that renames it to one of the two declared constructs is the only way to reach a loss row. | Unit |
| FR-084-AC-15 | A synthetic enum member whose value carries a code point outside `common.schema.json#/$defs/semanticIdentity` refuses, and no emitted identity is escaped, transliterated, or truncated. | Unit |
| FR-084-AC-16 | No caller-supplied option, environment variable, or flag turns any refusal in AC-13, AC-14, or AC-15 into a document; every option surface is enumerated in the test and each is exercised. | Test |
| FR-084-AC-17 | Every diagnostic this requirement emits is a member access on `DIAGNOSTIC_CODES`; no module under `src/compiler/frontend/json-schema/` spells the literal prefix `agent-ix.`. | Static |
| FR-084-AC-18 | The change set of this requirement touches no file under `schema/`, `fixtures/`, `conformance/`, `packages/semantic-core/`, or `src/compiler/backends/`, and neither `src/compiler/cli.mjs` nor `package.json`; it adds exactly three members to `DIAGNOSTIC_CODES` while modifying none, and `docs/semantic-data-system/compiler-diagnostics.md` matches a fresh run of `scripts/build-compiler-docs.mjs`. | Analysis |
| FR-084-AC-19 | Over 512 mutated bundles neither `provenance.mjs` nor `representability.mjs` throws, each returns an answer, and each leaves its argument byte-unchanged. | Fuzz |
| FR-084-AC-20 | Each of the two register rows names a filed issue against a live contract owner, and the `source.dialect` decision names the issue asking whether a projection of a declared dialect deserves a dialect value of its own; a row or decision with no issue number fails. | Inspection |
| FR-084-AC-21 | Diagnostic order is byte-identical when the suite is re-run under `LC_ALL=tr_TR.UTF-8` and from a different working directory. | Integration |

## Dependencies

- **Upstream**: FR-081 (the kernel manifest and lock whose digests the `package` block carries), FR-082 (the lowering whose document this requirement stamps and whose closed keyword set it enforces), [FR-083](./FR-083-mint-names-for-anonymous-constructs.md) (the minted identities the register rows and the refusals name), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Downstream**: FR-085, FR-086, FR-087, FR-088 — each carries the fingerprint triple — and FR-090, whose cross-language corpus compares the four packages by that triple before it compares an instance
- **Constrained by**: NFR-028, NFR-029, NFR-030
- **Verified by**: `test/semantic-kernel.test.ts`, driven through `scripts/build-semantic-kernel.mjs` and its `--check` verb
- **Read and never edited**: every document under `schema/**`, every file under `packages/semantic-core/**`, `fixtures/**`, `conformance/**`, `src/compiler/backends/**`, `src/compiler/cli.mjs`, and `package.json`
- **Open contract questions this requirement records rather than decides**: whether the pinned `@typespec/json-schema` projection of a `typespec` source deserves a `frontendDialect` value of its own, and whether `source.digest` over a projection beside a `source.identity` naming the authored file is the intended reading; the narrowing of an unconstrained value to a `JsonObject`; and the absence of any IR form for a required-but-possibly-empty collection. Each is a filed issue against a live contract owner. `agent-ix/filament-core-data#59` records that the closed issue #9 can no longer own the contract-gap register, which is why none of these is filed there.
