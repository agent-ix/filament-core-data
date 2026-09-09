---
id: FR-097
title: "Normalize, validate, and write the lifted IR document"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: "constrained_by"
---
# [FR-097] Normalize, validate, and write the lifted IR document

## Description

The extraction frontend SHALL validate every document it assembles against the
published IR schema before writing it, SHALL serialize it in one declared
canonical byte form, and SHALL write it atomically together with its
fingerprint, so that "the same lift" is a byte comparison and a document that
fails its own schema never reaches disk.

## Inputs

- The assembled IR document of FR-093, FR-094, and FR-095, as an in-memory `serde_json::Value`
- `schema/semantic/v1/semantic-ir.schema.json` and `schema/semantic/v1/common.schema.json`, embedded into the crate at build time with `include_str!`
- The `jsonschema` crate at the `~0.18` line quire-rs already pins (NFR-033)
- An output path for the document and, derived from it, the sidecar path `<out>.fingerprint`

## Outputs

- `crates/extraction-frontend/src/validate.rs`: `validate_document(&Value) -> Vec<Diagnostic>`, one `agent-ix.compiler.INVALID_IR` per schema error at the failing instance pointer
- `crates/extraction-frontend/src/canonical.rs`: `canonical_bytes(&Value) -> Vec<u8>` and `fingerprint(&[u8]) -> String`
- `crates/extraction-frontend/src/write.rs`: `write_atomic(out, bytes, fingerprint) -> Result<(), Refusal>`
- The written document at `<out>`, and `<out>.fingerprint` holding `{"algorithm":"rfc8785-v1","digest":"sha256:<64 hex>"}`

## Behavior

### Validation

- The frontend SHALL validate the assembled document against the embedded `semantic-ir.schema.json`, resolving `common.schema.json#/$defs/*` references from the embedded copy and from no other source.
- If validation fails, then the frontend SHALL emit one blocking `agent-ix.compiler.INVALID_IR` diagnostic per schema error, naming the failing instance pointer, and SHALL NOT write the document.
- A test SHALL compute the SHA-256 of each embedded schema and compare it to the SHA-256 of the file at the same path in the working tree, so that an edit to the published schema that the embedded copy does not follow fails the frontend's own suite rather than passing silently.

### Canonical form (declared reading of issue #67)

- The written document SHALL be the unextended RFC 8785 JCS form: object members ordered by their names' UTF-16 code units, no insignificant whitespace, numbers rendered by the ECMAScript `Number::toString` algorithm, strings escaped as `JSON.stringify` escapes them, and every array in document order. This is the form the conformance corpus compares byte for byte, and the form issue #22 declared for its `normalized` answer; issue #67 records that the published contract names two algorithms and rules on neither, and this requirement takes the same reading as #22 rather than a third.
- Before serialization the frontend SHALL sort every node list — `types`, and within each type `fields`, `variants`, `constraints`, `relationships`, `operations`, `clauses`, and `extensions`, and within each operation `params` — by `identity` under a locale-independent code-point comparison. FR-046 imposes the same order on the TypeSpec frontend, so after FR-050 `normalizeIr` the two frontends' documents for one shared case agree byte for byte.
- The frontend SHALL NOT apply the identity-sorted-set extension of FR-048 to the written bytes; that form belongs to the fingerprint of a lock and is not what a reader of the document compares.

### Fingerprint

- The frontend SHALL compute `sha256:<64 lowercase hex>` over exactly the bytes it writes, and SHALL record it in the sidecar under the identity domain quire-agent-a owns: `algorithm` is `rfc8785-v1` and the digest member is prefixed `sha256:`, matching `quire.verification.jcs`. The frontend SHALL NOT define a second canonicalization or digest scheme.
- The sidecar itself SHALL be written in the same canonical form.

### Determinism

- Two lifts of one bundle under one module set SHALL produce identical document bytes and identical sidecar bytes.
- A lift SHALL produce the same bytes regardless of `CARGO_TARGET_DIR`, the working directory, `HOME`, the process locale, and the wall clock; no emitted byte SHALL derive from any of them.

### Atomic write

- The frontend SHALL write the document to a temporary file in the output file's own directory and rename it over `<out>` only after the whole document and the sidecar are on disk, so that a reader never observes a partial document.
- If any diagnostic is blocking, then the frontend SHALL write no document, SHALL leave a pre-existing `<out>` and `<out>.fingerprint` byte-unchanged, and SHALL leave no temporary file behind.
- If the output directory does not exist or is not writable, then the frontend SHALL refuse with `agent-ix.extraction-frontend.OUTPUT_UNWRITABLE` naming the path, and SHALL treat the refusal as blocking.

### Cross-reader gate

- The frontend's test suite SHALL run the emitted fixture documents through the FR-050 reader by shelling out to `node src/compiler/cli.mjs inspect --ir <file>` and SHALL require zero diagnostics.
- The frontend's test suite SHALL run the same documents through the independent reader by calling `agent_ix_semantic_ir::decide` on the input bundle `{"ir": <document>}` through a test-only `dev-dependency`, and SHALL require `result_state` `success` with zero diagnostics.
- If `node` or the adapter binary is absent, then those tests SHALL fail naming what could not run; they SHALL NOT skip.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-097-CON-1 | `crates/extraction-frontend` SHALL reach `crates/semantic-ir` only as a `dev-dependency`, never as a runtime dependency, changing no byte of that crate, so the reader stays an oracle the frontend is measured against rather than an implementation it shares. | Integrity | Static analysis |
| FR-097-CON-2 | The frontend SHALL implement the canonical serializer as a pure function of the document value, reading no clock, environment variable, or file. | Determinism | Static analysis |
| FR-097-CON-3 | The frontend SHALL embed the published schema files byte for byte, never a patched or reduced copy. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-097-AC-1 | The SHA-256 of each embedded schema equals the SHA-256 of `schema/semantic/v1/semantic-ir.schema.json` and `common.schema.json` in the tree; altering one byte of the tree copy fails the test. | Test (TC-1273) |
| FR-097-AC-2 | A fault-injected document missing `unknownPolicy` on one type yields exactly one blocking `INVALID_IR` naming that type's instance pointer, and no file is written. | Test (TC-1274) |
| FR-097-AC-3 | The bytes written for the `config-version` fixture contain no whitespace outside strings, have every object's members in UTF-16 code-unit order, and re-parse to a value equal to the assembled document. | Test (TC-1275) |
| FR-097-AC-4 | Every node list in the written document is sorted by `identity` under code-point order, and the order is unchanged when compared against `Intl.Collator` orderings for at least two locales. | Property (TC-1276) |
| FR-097-AC-5 | The numbers `1`, `0`, `64`, and `1.5` are rendered `1`, `0`, `64`, and `1.5`; a string containing `"`, `\`, a newline, and `U+0001` is escaped as `JSON.stringify` escapes it. | Test (TC-1277) |
| FR-097-AC-6 | `<out>.fingerprint` parses to `{"algorithm":"rfc8785-v1","digest":"sha256:…"}` and the digest equals SHA-256 over the written document bytes, recomputed independently in the test. | Test (TC-1278) |
| FR-097-AC-7 | Two consecutive lifts of the `config-version` fixture produce byte-identical documents and sidecars. | Test (TC-1279) |
| FR-097-AC-8 | A lift run with a different `CARGO_TARGET_DIR`, working directory, `HOME`, and `LC_ALL` produces the same bytes as TC-1279. | Test (TC-1280) |
| FR-097-AC-9 | A lift that raises a blocking diagnostic leaves a pre-existing `<out>` byte-unchanged and leaves no file in the output directory other than those present before the run. | Test (TC-1281) |
| FR-097-AC-10 | A lift into a directory that does not exist refuses with `OUTPUT_UNWRITABLE` naming the path and exits non-zero. | Test (TC-1282) |
| FR-097-AC-11 | `node src/compiler/cli.mjs inspect` reports zero diagnostics for every emitted fixture document, and the test fails naming `node` when it is absent. | Test (TC-1283) |
| FR-097-AC-12 | `agent_ix_semantic_ir::decide` returns `success` with zero diagnostics for every emitted fixture document, `crates/extraction-frontend/Cargo.toml` names `agent-ix-semantic-ir` only under `[dev-dependencies]`, and `crates/semantic-ir/**` is byte-unchanged from `main`. | Test (TC-1284) |

## Dependencies

- **Upstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), [NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md)
