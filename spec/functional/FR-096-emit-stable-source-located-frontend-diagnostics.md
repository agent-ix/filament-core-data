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
`agent-ix.extraction-frontend.*` registry whose severity, blocking disposition,
and locus rule are fixed per code, so that two lifts of one defective bundle
report the same bytes and a consumer can key automation on the code.

## Rationale

The registry is enablement: every diagnostic FR-091 through FR-095 and FR-097
raise is a `Code` variant, so the enum is built immediately after FR-091. The
locus rule is the declared reading of issue #61, cited here: the engine's locus
is authoritative and the frontend derives no other. Engine diagnostics are
wrapped, not passed through: the wire code is always `ENGINE_DIAGNOSTIC` and
the engine's own code and reason open the message, as
`<engine code> (reason: <reason>): <engine message>`, with `causes` empty —
the `diagnostic` schema types `causes.items` as `diagnostic`, whose `code`
pattern admits only `agent-ix.*` codes, so a `semantic.*` code cannot live
there and the document stays schema-valid; this requirement is the single
authority for that mapping, and FR-091 refers to it. The reader's codes
(`agent-ix.semantic-ir.*`, `agent-ix.compiler.*`) are never emitted as the
frontend's own; a reader finding at lift time is carried under the frontend's
`INVALID_IR` with the reader's diagnostic in `causes`. The `LIMIT_*` codes are
raised by the limit checks NFR-031 owns.

## Inputs

- The `SemanticDiagnostic` list of FR-091, each with `code`, `severity`, `line`, `column`, and `reason`
- The frontend's own defects from FR-091 through FR-095 and FR-097, and the limit breaches of NFR-031
- The `agent_ix_semantic_ir::decide` diagnostics FR-097 obtains at lift time
- `common.schema.json#/$defs/diagnostic`

## Outputs

- `crates/extraction-frontend/src/diagnostics.rs`: `enum Code` (closed), `Code::severity()`, `Code::blocking()`, `struct Diagnostic`, `sort_diagnostics`
- `docs/semantic-data-system/extraction-frontend-diagnostics.md`, generated from the enum
- The diagnostics JSON array, written by FR-097 as the `<out>.diagnostics.json` sidecar on every lift, one `common.schema.json#/$defs/diagnostic` per entry

## Behavior

### The registry

- The frontend SHALL define `Code` as a closed enum over exactly: `MODULE_WITHOUT_SEMANTIC_BLOCK`, `MODULE_REFUSED`, `BUNDLE_UNIDENTIFIED`, `DUPLICATE_ARTIFACT_ID`, `UNKNOWN_OBJECT_TYPE`, `UNRESOLVED_TYPE_TOKEN`, `STALE_TYPE_TOKEN`, `IMPORT_UNSUPPORTED`, `KERNEL_NAME_SHADOWED`, `UNNAMEABLE_ARTIFACT`, `ARTIFACT_NOT_LOWERED`, `DUPLICATE_TYPE_NAME`, `DUPLICATE_CONSTRAINT`, `CONSTRAINT_NOT_APPLICABLE`, `DECLARED_LOSS`, `UNRESOLVED_RELATIONSHIP_TARGET`, `UNKNOWN_EDGE_VERB`, `UNSLUGGABLE_NAME`, `OUTPUT_UNWRITABLE`, `LIMIT_MAX_DOCUMENTS`, `LIMIT_MAX_DOCUMENT_BYTES`, `LIMIT_MAX_FIELDS_PER_RECORD`, `LIMIT_MAX_CLAUSE_BYTES`, `LIMIT_MAX_DEPTH`, `ENGINE_DIAGNOSTIC`, `INVALID_IR`.
- The frontend SHALL fix one severity and one blocking disposition per code: `DECLARED_LOSS` is `info`, non-blocking; `KERNEL_NAME_SHADOWED` is `warning`, non-blocking; `ARTIFACT_NOT_LOWERED` is `warning`, non-blocking when the engine reason is `legacy-form` and `error`, blocking otherwise; `ENGINE_DIAGNOSTIC` takes the mapped engine severity and blocks if and only if that severity is `error`; every other code is `error`, blocking.
- The frontend SHALL serialise the wire `code` as `agent-ix.extraction-frontend.<NAME>`.
- The frontend SHALL serialise every wire `code` so that it matches the published code pattern.
- The frontend SHALL NOT name a code as a string literal in any module under `crates/extraction-frontend/src/`.
- The frontend SHALL NOT emit any `agent-ix.compiler.*` or `agent-ix.semantic-ir.*` code as its own.

### Engine diagnostics

- The frontend SHALL turn each `SemanticDiagnostic` into one `ENGINE_DIAGNOSTIC` whose message is `<engine code> (reason: <reason>): <engine message>` and whose `causes` is empty, so the engine's `code`, `reason`, and `message` are carried in the message and the wrapper validates as a `diagnostic`.
- The frontend SHALL map the engine severity `error` to `error`, `warning` to `warning`, and `advisory` to `info`.
- The frontend SHALL NOT drop, merge, re-rank, or re-word an engine diagnostic.

### Reader diagnostics

- The frontend SHALL turn each diagnostic `agent_ix_semantic_ir::decide` returns at lift time into one `INVALID_IR` whose message names the reader's code and instance pointer and whose `causes[0]` reproduces the reader's diagnostic.
- The frontend SHALL emit `INVALID_IR` with no `locus`.

### Locus

- The frontend SHALL give every diagnostic about a document a `locus` with `sourceIdentity` `ix://<org>/<name>/spec`, `path` the document's bundle-root-relative path, and `startLine` and `startColumn` exactly as the engine or the frontend located it.
- If an engine diagnostic carries `line` `0` or no `line`, then the frontend SHALL emit it with no `locus` and with the document's bundle-root-relative path in the message.
- The frontend SHALL give a diagnostic about a module a `locus` at the manifest, line 1, column 1.
- The frontend SHALL give a diagnostic about the bundle as a whole a `locus` at `spec.md`, line 1, column 1.

### Shape, order, and effect

- The frontend SHALL serialise each diagnostic as `common.schema.json#/$defs/diagnostic` with `owner` `ix://agent-ix/filament-core-data/extraction-frontend`, `blocking` from the registry, `causes`, and `related`.
- The frontend SHALL order diagnostics in `sort_diagnostics` by `locus.path`, `startLine`, `startColumn`, `code`, then `message`, under code-point comparison.
- The frontend SHALL place every diagnostic with no `locus` before every diagnostic with one, ordered among themselves by `code` then `message`.
- If any diagnostic is blocking, then the frontend SHALL mark the lift blocked; FR-097 owns the write effect and FR-099 the exit code of a blocked lift.
- The frontend SHALL emit no message containing an absolute path, a timestamp, a hostname, or a duration.
- If a token exceeds 100 characters, then the frontend SHALL truncate it with `…` so that the message carrying it is at most 120 characters.
- The frontend SHALL generate `docs/semantic-data-system/extraction-frontend-diagnostics.md` from the enum, listing every code with its severity, blocking disposition, and owner.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-096-CON-1 | The frontend SHALL compute severity and blocking from `Code` alone, plus the engine severity for `ENGINE_DIAGNOSTIC` and the engine reason for `ARTIFACT_NOT_LOWERED`, never from the message or the caller. | Integrity | Static analysis |
| FR-096-CON-2 | The frontend SHALL carry a reader finding of FR-097 only under `INVALID_IR` with the reader's diagnostic in `causes`. | Integrity | Test |
| FR-096-CON-3 | The frontend SHALL serialise the diagnostic list as a pure function of that list. | Determinism | Snapshot |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-096-AC-1 | Every `Code` variant serialises to a code matching the published pattern and, instantiated, validates as a `diagnostic` against `common.schema.json`, including a variant instantiated with no `locus`. | Test (TC-1259) |
| FR-096-AC-2 | The severity and blocking table above holds for every variant, asserted variant by variant, including `KERNEL_NAME_SHADOWED` as `warning` non-blocking and `INVALID_IR`, `DUPLICATE_CONSTRAINT`, `CONSTRAINT_NOT_APPLICABLE`, `IMPORT_UNSUPPORTED`, and `DUPLICATE_ARTIFACT_ID` as `error` blocking. | Test (TC-1260) |
| FR-096-AC-3 | A grep of `crates/extraction-frontend/src/` finds no string literal beginning `agent-ix.extraction-frontend.`, `agent-ix.compiler.`, or `agent-ix.semantic-ir.`; the only spelling is the enum's `Display`; planting one such literal in `lower.rs` fails the gate. | Static (TC-1261) |
| FR-096-AC-4 | The `legacy` fixture yields one `ENGINE_DIAGNOSTIC` of severity `warning` whose message begins `semantic.legacy-properties-form (reason: ` and carries the engine message after `): `, whose `causes` is empty, and whose locus is line 17, column 1. | Test (TC-1262) |
| FR-096-AC-5 | An engine `advisory` maps to `info`, non-blocking; an engine `error` maps to `error`, blocking; the wire code of each is `agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC`. | Test (TC-1263) |
| FR-096-AC-6 | A `Type` cell `Sting` at row 14 yields `UNRESOLVED_TYPE_TOKEN` with locus `{path, startLine: 14, startColumn: 3}` and `sourceIdentity` `ix://agent-ix/config-service/spec`. | Test (TC-1264) |
| FR-096-AC-7 | A refused module yields `MODULE_REFUSED` with locus at the manifest, line 1, column 1. | Test (TC-1265) |
| FR-096-AC-8 | `sort_diagnostics` yields the same order for a list and its reverse, and across two `LC_ALL` settings, with every locus-free diagnostic first. | Property (TC-1266) |
| FR-096-AC-9 | The `negatives/DUPLICATE_TYPE_NAME` fixture lifted twice produces diagnostic bytes identical to each other and to its committed `expected/diagnostics.json`. | Snapshot (TC-1267) |
| FR-096-AC-10 | A blocking lift leaves a fresh `--out` absent, leaves a pre-existing `--out` byte-unchanged, and exits `1`; a warning-only lift writes the file and exits `0`. | Test (TC-1268) |
| FR-096-AC-11 | A 4000-character type token appears in no message longer than 120 characters. | Test (TC-1269) |
| FR-096-AC-12 | A pattern scan over every diagnostic emitted across the fixture corpus finds no absolute path, timestamp, hostname, or duration. | Test (TC-1270) |
| FR-096-AC-13 | `docs/semantic-data-system/extraction-frontend-diagnostics.md` lists every code with severity, blocking, and owner, and regenerating it from the enum reproduces the committed file byte for byte. | Test (TC-1271) |
| FR-096-AC-14 | The set of `fixtures/negatives/<CODE>/` directories FR-098 lists equals the set of enum variants, so every registry code has one fixture or one named constructing test. | Static (TC-1272) |
| FR-096-AC-15 | An engine diagnostic injected with `line: Some(0)` serialises with no `locus`, with the document path in its message, and validates against `common.schema.json`. | Test (TC-1345) |
| FR-096-AC-16 | A reader diagnostic returned by `decide` at lift time appears as exactly one `INVALID_IR` with no `locus`, the reader's code and instance pointer in the message, and the reader's diagnostic in `causes[0]`. | Test (TC-1346) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-049](./FR-049-emit-stable-source-located-diagnostics.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), `ix://agent-ix/quire-rs/FR-072`
- **Downstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
