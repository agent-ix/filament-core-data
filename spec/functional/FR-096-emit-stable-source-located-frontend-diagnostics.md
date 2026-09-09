---
id: FR-096
title: "Emit stable, source-located frontend diagnostics from a closed registry"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
---
# [FR-096] Emit stable, source-located frontend diagnostics from a closed registry

## Description

The extraction frontend SHALL report every defect through a closed
`agent-ix.extraction-frontend.*` registry whose severity and blocking
disposition are fixed per code, SHALL carry every engine diagnostic through
with its own locus, and SHALL write no document when any diagnostic blocks, so
that two lifts of one defective bundle report the same bytes and a consumer
can key automation on the code.

## Inputs

- The `SemanticDiagnostic` list of FR-091, each with `code`, `severity`, `line`, `column`, and `reason`
- The frontend's own defects from FR-091 through FR-095 and FR-097
- `common.schema.json#/$defs/diagnostic`

## Outputs

- `crates/extraction-frontend/src/diagnostics.rs`: `enum Code` (closed), `Code::severity()`, `Code::blocking()`, `struct Diagnostic`, `sort_diagnostics`
- `docs/semantic-data-system/extraction-frontend-diagnostics.md`, generated from the enum
- A diagnostics JSON array beside the document, one `common.schema.json#/$defs/diagnostic` per entry

## Behavior

### The registry

- `Code` SHALL be a closed enum over exactly: `MODULE_WITHOUT_SEMANTIC_BLOCK`, `MODULE_REFUSED`, `BUNDLE_UNIDENTIFIED`, `UNKNOWN_OBJECT_TYPE`, `UNRESOLVED_TYPE_TOKEN`, `AMBIGUOUS_TYPE_TOKEN`, `FOREIGN_TYPE_TOKEN`, `STALE_TYPE_TOKEN`, `UNNAMEABLE_ARTIFACT`, `ARTIFACT_NOT_LOWERED`, `DUPLICATE_TYPE_NAME`, `DECLARED_LOSS`, `UNRESOLVED_RELATIONSHIP_TARGET`, `UNKNOWN_EDGE_VERB`, `UNSLUGGABLE_NAME`, `OUTPUT_UNWRITABLE`, `LIMIT_MAX_DOCUMENTS`, `LIMIT_MAX_DOCUMENT_BYTES`, `LIMIT_MAX_FIELDS_PER_RECORD`, `LIMIT_MAX_CLAUSE_BYTES`, `LIMIT_MAX_DEPTH`, `ENGINE_DIAGNOSTIC`, `INVALID_IR`.
- Every code SHALL carry a fixed severity and blocking disposition: `DECLARED_LOSS` is `info`, non-blocking; `ARTIFACT_NOT_LOWERED` is `warning`, non-blocking when the engine reason is `legacy-form` and `error`, blocking otherwise; `ENGINE_DIAGNOSTIC` takes the engine's mapped severity and blocks if and only if that severity is `error`; every other code is `error`, blocking.
- The wire `code` SHALL be `agent-ix.extraction-frontend.<NAME>` and SHALL match the published code pattern.
- No module under `crates/extraction-frontend/src/` SHALL name a code as a string literal.

### Engine diagnostics

- Each `SemanticDiagnostic` SHALL become one `ENGINE_DIAGNOSTIC` whose message begins with the engine's own code, whose `causes` carries one nested diagnostic reproducing the engine's `code`, `message`, and `reason`, and whose severity maps `error→error`, `warning→warning`, `advisory→info`.
- The frontend SHALL NOT drop, merge, re-rank, or re-word an engine diagnostic.

### Locus (issue #61, unruled)

- Every diagnostic about a document SHALL carry `locus` with `sourceIdentity` `ix://<org>/<name>/spec`, `path` the document's bundle-root-relative path, and `startLine` and `startColumn` exactly as the engine or the frontend located it. This is the declared reading of issue #61: the engine's locus is authoritative and the frontend derives no other; the frontend cites #61.
- A diagnostic about a module or the bundle as a whole SHALL carry `locus` at the manifest or `spec.md` at line 1, column 1.

### Shape, order, and effect

- Each diagnostic SHALL serialise as `common.schema.json#/$defs/diagnostic` with `owner` `ix://agent-ix/filament-core-data/extraction-frontend`, `blocking` from the registry, `causes`, and `related`.
- `sort_diagnostics` SHALL order by `locus.path`, `startLine`, `startColumn`, `code`, then `message`, under code-point comparison, and a diagnostic with no locus SHALL sort first.
- If any diagnostic is blocking, then the frontend SHALL write no IR document, SHALL leave a pre-existing output path byte-unchanged, and SHALL exit non-zero; a non-blocking-only lift SHALL write the document and exit zero.
- No message SHALL contain an absolute path, a timestamp, a hostname, or a duration; a token longer than 100 characters SHALL be truncated with `…` so that no message exceeds 120 characters on its account.
- `docs/semantic-data-system/extraction-frontend-diagnostics.md` SHALL list every code with its severity, blocking disposition, and owner, generated from the enum, and a test SHALL fail when the document and the enum disagree.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-096-CON-1 | Severity and blocking SHALL be functions of `Code` alone (plus the engine severity for `ENGINE_DIAGNOSTIC` and the engine reason for `ARTIFACT_NOT_LOWERED`), never of the message or the caller. | Integrity | Static analysis |
| FR-096-CON-2 | The frontend SHALL NOT emit any `agent-ix.compiler.*` or `agent-ix.semantic-ir.*` code as its own; a reader finding of FR-097 is carried under `INVALID_IR` with the reader's code in `causes`. | Integrity | Test |
| FR-096-CON-3 | Diagnostic serialisation SHALL be a pure function of the diagnostic list; two lifts of one bundle produce identical diagnostic bytes. | Determinism | Snapshot |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-096-AC-1 | Every `Code` variant serialises to a code matching the published pattern and, instantiated, validates as a `diagnostic` against `common.schema.json`. | Test (TC-1259) |
| FR-096-AC-2 | The severity and blocking table above holds for every variant, asserted variant by variant. | Test (TC-1260) |
| FR-096-AC-3 | A grep of `crates/extraction-frontend/src/` finds no string literal beginning `agent-ix.extraction-frontend.`; the only spelling is the enum's `Display`. | Analysis (TC-1261) |
| FR-096-AC-4 | The `legacy-form` control yields one `ENGINE_DIAGNOSTIC` of severity `warning` whose message begins `semantic.legacy-properties-form`, whose `causes[0]` reproduces the engine code and reason, and whose locus is line 17, column 1. | Test (TC-1262) |
| FR-096-AC-5 | An engine `advisory` maps to `info`, non-blocking; an engine `error` maps to `error`, blocking. | Test (TC-1263) |
| FR-096-AC-6 | A `Type` cell `Sting` at row 14 yields `UNRESOLVED_TYPE_TOKEN` with locus `{path, startLine: 14, startColumn: 3}` and `sourceIdentity` `ix://agent-ix/config-service/spec`. | Test (TC-1264) |
| FR-096-AC-7 | A refused module yields `MODULE_REFUSED` with locus at the manifest, line 1, column 1. | Test (TC-1265) |
| FR-096-AC-8 | `sort_diagnostics` yields the same order for a list and its reverse, and across two `LC_ALL` settings. | Property (TC-1266) |
| FR-096-AC-9 | A three-defect fixture lifted twice produces identical diagnostic bytes. | Snapshot (TC-1267) |
| FR-096-AC-10 | A blocking lift leaves a fresh `--out` absent, leaves a pre-existing `--out` byte-unchanged, and exits non-zero; a warning-only lift writes the file and exits zero. | Test (TC-1268) |
| FR-096-AC-11 | A 4000-character type token appears in no message longer than 120 characters. | Test (TC-1269) |
| FR-096-AC-12 | A pattern scan over every diagnostic emitted across the fixture corpus finds no absolute path, timestamp, hostname, or duration. | Test (TC-1270) |
| FR-096-AC-13 | `docs/semantic-data-system/extraction-frontend-diagnostics.md` lists every code with severity, blocking, and owner, and a test fails when the document and the enum disagree. | Test (TC-1271) |
| FR-096-AC-14 | Every registry code is emitted by at least one test, asserted by a coverage set collected at run time. | Test (TC-1272) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), `ix://agent-ix/quire-rs/FR-072`
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
