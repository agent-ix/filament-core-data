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
  - target: "ix://agent-ix/filament-core-data/FR-096"
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

The extraction frontend SHALL run every document it assembles through the
independent reader `agent_ix_semantic_ir::decide` at lift time, serialize it in
the reader's canonical form, and write it atomically with its sidecars, so that
"the same lift" is a byte comparison and a document the reader rejects never
reaches disk.

## Rationale

`crates/semantic-ir` is a runtime `path` dependency of this crate. The charter
forbids a dependency from `crates/semantic-ir` to this crate, not the reverse;
`crates/conformance-adapter` already depends on it by path. Consuming the reader
at lift time closes the gap in which a schema-valid document with a composite
cycle, a duplicate identity, or a dangling clause reference was written and
fingerprinted as good. It also removes three re-implementations: a JSON Schema
validator (the `jsonschema` crate), an RFC 8785 writer, and an ECMAScript number
formatter, each of which the reader already owns. The document form is
`agent-ix-conformance-jcs-v1` exactly as `crates/semantic-ir` writes it — the
form issue #22 declared for its `normalized` answer; issue #67 records that the
published contract names two algorithms and rules on neither, and this
requirement takes the #22 reading rather than a third. That form orders object
members by code point, which coincides with RFC 8785's UTF-16 order on every
name the schema admits. The identity-sorted-set extension of FR-048 belongs to
the fingerprint of a lock and is not applied to the written bytes. FR-046
imposes the same node-list order on the TypeSpec frontend, so FR-050
`normalizeIr` of the emitted document is the identity on its bytes. The
fingerprint sidecar carries the identity domain quire-agent-a owns
(quire-specification FR-018) verbatim, so the frontend defines no second
digest scheme. FR-050's node reader is the second, cross-language reader in the
test suite.

## Inputs

- The assembled IR document of FR-093, FR-094, and FR-095, as an in-memory `serde_json::Value` with `multiplicity`, `presence`, and `nullable` materialized on every field and parameter
- `agent_ix_semantic_ir::decide`, `agent_ix_semantic_ir::normalize::normalized`, and the crate's `Verdict { result_state, diagnostics, normalized }`, reached as a runtime `path` dependency on the workspace member `crates/semantic-ir`
- An output path `<out>`, the bundle root, and the module roots (FR-099)

## Outputs

- `crates/extraction-frontend/src/validate.rs`: `validate_document(&Value) -> Vec<Diagnostic>`, one `INVALID_IR` per reader diagnostic per FR-096
- `crates/extraction-frontend/src/canonical.rs`: `sort_node_lists(&mut Value)` and `canonical_bytes(&Value) -> Vec<u8>`, the latter a call to `normalized`
- `crates/extraction-frontend/src/write.rs`: `write_lift(out, document, fingerprint, diagnostics, provenance) -> Result<(), Refusal>`
- On a successful lift: `<out>`, `<out>.fingerprint`, `<out>.diagnostics.json`, `<out>.provenance.json`
- On a blocked lift: `<out>.diagnostics.json` only
- `<out>.fingerprint` holding `{"domain":"quire.verification.jcs","version":"rfc8785-v1","algorithm":"sha256","digest":"sha256-jcs:<64 hex>"}`

## Behavior

### Validation at lift time

- The frontend SHALL call `agent_ix_semantic_ir::decide` on the bundle `{"ir": <document>}` after node lists are sorted and before any write.
- If `decide` returns a `result_state` other than success or a non-empty diagnostic list, then the frontend SHALL raise one blocking `INVALID_IR` per reader diagnostic, shaped per FR-096.
- The frontend SHALL treat every reader diagnostic — schema and cross-field alike, including `COMPOSITE_CYCLE`, `DUPLICATE_IDENTITY`, `DANGLING_CLAUSE_REF`, and `UNRESOLVED_TYPE_REF` — as a lift-time refusal of the document.

### Canonical form (declared reading of issue #67)

- The frontend SHALL sort every node list — `types`, and within each type `fields`, `variants`, `constraints`, `relationships`, `operations`, `clauses`, and `extensions`, within each field and each operation parameter `extensions`, within each operation `params`, and the top-level `occurrences` and `extensions` — by `identity` under a locale-independent code-point comparison before calling `decide`; these are exactly the sets FR-050's `normalizeIr` declares (`IDENTITY_SETS`).
- The frontend SHALL obtain the written bytes as `agent_ix_semantic_ir::normalize::normalized(&{"ir": <document>})` over the sorted document and from no other serializer.
- The frontend SHALL materialize `multiplicity`, `presence`, and `nullable` on every field and operation parameter before serialization, so that `normalized` adds no member and the written bytes re-parse to the assembled value.
- The frontend SHALL NOT link the `jsonschema` crate.
- The frontend SHALL NOT implement a JSON canonicalizer, an object-member ordering, or a number formatter of its own.
- The frontend SHALL NOT apply the identity-sorted-set extension of FR-048 to the written bytes.

### Fingerprint

- The frontend SHALL compute SHA-256 over exactly the document bytes it writes.
- The frontend SHALL record the digest in `<out>.fingerprint` as the members `domain` `quire.verification.jcs`, `version` `rfc8785-v1`, `algorithm` `sha256`, and `digest` `sha256-jcs:` followed by 64 lowercase hexadecimal digits, the shape quire-specification FR-018 fixes.
- The frontend SHALL NOT define a second canonicalization or digest scheme.
- The frontend SHALL serialize each sidecar through the same `normalized` call as the document.

### Determinism

- The frontend SHALL produce identical document bytes and identical sidecar bytes for two lifts of one bundle under one module set.
- The frontend SHALL derive no emitted byte from `CARGO_TARGET_DIR`, the working directory, `HOME`, the process locale, or the wall clock.

### Atomic write and sidecars

- If `<out>` or any sidecar path lies under the bundle root or under a module root, then the frontend SHALL refuse with `OUTPUT_UNWRITABLE` naming the path before loading the bundle.
- If the output directory does not exist or is not writable, then the frontend SHALL refuse with `OUTPUT_UNWRITABLE` naming the path.
- If two of `<out>`, the fingerprint sidecar path, the diagnostics sidecar path, and the provenance sidecar path resolve to one file, then the frontend SHALL refuse with `OUTPUT_UNWRITABLE` naming both options before loading the bundle.
- The frontend SHALL treat an `OUTPUT_UNWRITABLE` refusal as blocking and write nothing.
- The frontend SHALL write each of `<out>.diagnostics.json`, `<out>.provenance.json`, `<out>.fingerprint`, and `<out>` to a temporary file in the output file's own directory and rename it over its final path.
- The frontend SHALL rename the four files in the order `<out>.diagnostics.json`, `<out>.provenance.json`, `<out>.fingerprint`, `<out>`, so that a reader observing `<out>` observes its sidecars.
- The frontend SHALL write all four files on every lift with no blocking diagnostic, regardless of which FR-099 options are given.
- If any diagnostic is blocking, then the frontend SHALL write `<out>.diagnostics.json` and nothing else.
- If any diagnostic is blocking, then the frontend SHALL leave a pre-existing `<out>`, `<out>.fingerprint`, and `<out>.provenance.json` byte-unchanged.
- The frontend SHALL leave no temporary file behind after any lift.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-097-CON-1 | The frontend SHALL depend on `crates/semantic-ir` only as a runtime `path` dependency on that workspace member, whose bytes stay unchanged under NFR-032. | Integrity | Static analysis |
| FR-097-CON-2 | The frontend SHALL reach every written byte through `agent_ix_semantic_ir::normalize::normalized`, calling no `serde_json` serializer under `src/`. | Determinism | Static analysis |
| FR-097-CON-3 | The frontend SHALL call `decide` on every document before any write of `<out>`; no code path writes `<out>` without a success verdict. | Integrity | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-097-AC-1 | `crates/extraction-frontend/Cargo.toml` names `agent-ix-semantic-ir` under `[dependencies]` with `path = "../semantic-ir"` and names no `jsonschema`; `cargo tree -p agent-ix-extraction-frontend` lists no direct `jsonschema` edge, and every `jsonschema` line it lists sits under `quire-rs`, which links it for its own frontmatter schemas (NFR-033). | Static (TC-1273) |
| FR-097-AC-2 | A fault-injected document missing `unknownPolicy` on one type yields exactly one blocking `INVALID_IR` naming that type's instance pointer, and no `<out>`, `<out>.fingerprint`, or `<out>.provenance.json` is written. | Test (TC-1274) |
| FR-097-AC-3 | The bytes written for the `config-version-table` fixture equal `decide({"ir": doc}).normalized` and equal the committed `expected/semantic-ir.json`; parsing them and calling `normalized` again reproduces them. | Test (TC-1275) |
| FR-097-AC-4 | Every node list in the written document is sorted by `identity` under code-point order, and the order equals the code-point sort computed in `node` under two `LC_ALL` values (`en_US.UTF-8`, `de_DE.UTF-8`); an `Intl.Collator` is not the reference, because a collator's primary level is case-insensitive and orders `Ordering` before `OrderLifecycle` where code point orders `L` before `i`, so it would disagree with FR-050's `normalizeIr` on the emitted lists. | Property (TC-1276) |
| FR-097-AC-5 | `node -e` importing `src/compiler/ir/normalize.mjs` and applying FR-050 `normalizeIr` to every emitted fixture document returns the emitted bytes unchanged. | Test (TC-1277) |
| FR-097-AC-6 | `<out>.fingerprint` parses to exactly the members `domain` `quire.verification.jcs`, `version` `rfc8785-v1`, `algorithm` `sha256`, and `digest` `sha256-jcs:<64 hex>`, and the digest equals `sha256sum` over the written document bytes. | Test (TC-1278) |
| FR-097-AC-7 | Two consecutive lifts of the `config-version-table` fixture produce documents and sidecars byte-identical to each other and to the committed `expected/` goldens. | Test (TC-1279) |
| FR-097-AC-8 | A lift run with a different `CARGO_TARGET_DIR`, working directory, `HOME`, and `LC_ALL` produces the same bytes as TC-1279 and as the committed golden. | Test (TC-1280) |
| FR-097-AC-9 | A lift that raises a blocking diagnostic leaves a pre-existing `<out>`, `<out>.fingerprint`, and `<out>.provenance.json` byte-unchanged, writes `<out>.diagnostics.json`, and leaves no other new file in the output directory. | Test (TC-1281) |
| FR-097-AC-10 | A lift into a directory that does not exist refuses with `OUTPUT_UNWRITABLE` naming the path and exits `2`. | Test (TC-1282) |
| FR-097-AC-11 | `node src/compiler/cli.mjs inspect --ir` reports zero diagnostics for every emitted fixture document, and the test fails naming `node` when it is absent. | Test (TC-1283) |
| FR-097-AC-12 | `decide` returns success with zero diagnostics for every emitted positive fixture document, asserted from the lift's own verdict and again by the test calling `decide` on the written bytes. | Test (TC-1284) |
| FR-097-AC-13 | A lift with `--out` under the bundle root, and one with `--out` under a module root, each refuse with `OUTPUT_UNWRITABLE` naming the path before any document is loaded and write nothing. | Test (TC-1340) |
| FR-097-AC-14 | A warning-only lift with no `--diagnostics` or `--provenance` option writes `<out>`, `<out>.fingerprint`, `<out>.diagnostics.json`, and `<out>.provenance.json`; the four are the only new files in the output directory. | Test (TC-1341) |
| FR-097-AC-15 | The `negatives/INVALID_IR` bundle, whose frontmatter declares `A contains B` and `B contains A`, refuses at lift time with `INVALID_IR` carrying the reader's `COMPOSITE_CYCLE` in `causes[0]` and writes no document. | Test (TC-1342) |
| FR-097-AC-16 | `lift --out o.json --diagnostics o.json` and `lift --out o.json --diagnostics d.json --provenance d.json` each refuse with `OUTPUT_UNWRITABLE` naming both colliding options, exit `2`, and write nothing. | Test (TC-1339) |

## Dependencies

- **Upstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), `ix://agent-ix/quire-specification/FR-018`
- **Downstream**: [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), [NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md)
