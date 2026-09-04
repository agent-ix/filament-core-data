---
id: FR-036
title: "Implement the independent JSON-level semantic oracle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "depends_on"
---
# [FR-036] Implement the independent JSON-level semantic oracle

## Description

The repository SHALL ship one JSON-level semantic oracle that decides, for any
semantic IR document, the result state and the ordered diagnostic list the
published contract requires, implemented from the contract text and schemas and
from no implementation under test.

## Inputs

- A semantic IR document (contract version `1.0.0` or `1.1.0`)
- Optional resolution context: the lock's exported identities and the declared package graph
- The published schemas under `schema/semantic/v1/`

## Outputs

- `conformance/oracle/oracle.mjs`: the verdict engine
- `conformance/oracle/index.mjs`: the stable import surface (FR-039)
- A verdict object `{ contractVersion, resultState, diagnostics[], normalized }` matching `adapter-result.schema.json`

## Behavior

- The oracle SHALL validate the document against `semantic-ir.schema.json` with a JSON Schema 2020-12 implementation.
- The oracle SHALL report each schema violation as one diagnostic carrying `agent-ix.semantic-ir.SCHEMA_VIOLATION` and the failing instance pointer.
- The oracle SHALL then decide the cross-field rules the schema cannot express: presence derived from multiplicity, `unit` only on a reference that resolves through aliases to a scalar, the closed constraint keyword vocabulary and its per-keyword operand types and applicability table, clause id uniqueness per type, `pre`/`post` binding to a declared `clauseId`, relationship target resolution to a document type or a lock export, acyclic composite relationship graphs, relationships and operations only on `record` kinds, and the `1.1.0` requirement that every field declares `multiplicity`.
- The oracle SHALL decide the rules that no reader in this repository decides today: document-wide identity uniqueness across types, fields, variants, constraints, relationships, operations, clauses, and occurrences; alias cycles as their own diagnostic distinct from an unresolved reference; `occurrences[].definition` resolution to a declared type; `union` variant `payloadType` resolution; `sequence.items` and `map.values` resolution; and a `required: true` extension whose `capability` no declared consumer policy admits.
- The oracle SHALL return `resultState` `success` when it emits no diagnostic, `invalid` when it emits at least one diagnostic of severity `error`, and `lossy` when every diagnostic is a declared-loss diagnostic.
- The oracle SHALL emit every diagnostic with a `code` matching the `common.schema.json` diagnostic code pattern, a `pointer`, a `severity`, a `message`, and, when the addressed node or its nearest ancestor carries an `origin.source`, the `locus` taken verbatim from that origin.
- The oracle SHALL order diagnostics by `pointer` under a byte-wise comparison of the pointer's UTF-8 encoding, then by `code`, then by `message`.
- The oracle SHALL apply no locale-sensitive comparison when it orders diagnostics.
- The oracle SHALL compute `normalized` as the FR-027 normalized serialization: a `1.1.0` document materializes `multiplicity`, `presence`, and `nullable` on every field and operation parameter, a `1.0.0` document gains no bytes, and object keys are sorted by code point.
- The oracle SHALL terminate on a cyclic type graph, a self-referential alias, and a self-referential composite relationship without unbounded recursion.
- The oracle SHALL bound reference expansion at a declared finite depth of 256 and emit `agent-ix.semantic-ir.DEPTH_LIMIT_EXCEEDED` at the node that exceeds it.
- The oracle SHALL classify a pair of documents for a `compatibility` case as `patch`, `additive`, `conditional`, `breaking`, `unknown`, or `invalid`, taking a required field addition, any removal, a resolved-type change, a stable identity change, and an unknown-policy tightening as `breaking`; an optional field addition and a constraint relaxation as `additive`; a constraint tightening and an added enum variant as `conditional`; a display-name or documentation-only change as `patch`; and an unclassifiable change as `unknown`.
- The oracle SHALL report the most restrictive classification when a document pair carries several changes.
- The oracle SHALL name every change that contributed to a reported classification.
- The oracle SHALL execute no code from the document, open no network connection, read no path outside `conformance/` and `schema/`, and write no file.
- If the oracle is asked for a verdict on a value that is not a JSON object, then it SHALL return `invalid` with exactly one `agent-ix.semantic-ir.INVALID_DOCUMENT` diagnostic at pointer `""`.
- The oracle SHALL NOT import, execute, or read the output of `spikes/typespec-feasibility/`, `test/semantic-ir-v1-1-reader.ts`, `tests/semantic_ir_reader.py`, or any adapter under `conformance/adapters/`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-036-CON-1 | The oracle module SHALL depend on no package outside the pinned JSON Schema validator already in `devDependencies`. | Portability | Analysis |
| FR-036-CON-2 | The oracle SHALL be pure with respect to a case: two verdicts for the same input are byte-identical, including diagnostic order. | Determinism | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-036-AC-1 | For every corpus case, the oracle's verdict equals the case's authored `expected` block, including diagnostic codes, order, pointers, and loci. | Test |
| FR-036-AC-2 | Running the oracle twice over the whole corpus produces byte-identical output, and the diagnostic order is unchanged when the process locale is set to `tr_TR.UTF-8`. | Test |
| FR-036-AC-3 | The oracle returns `DEPTH_LIMIT_EXCEEDED` rather than recursing without bound on a self-referential alias, a mutually recursive alias pair, and a self-referential composite relationship. | Test |
| FR-036-AC-4 | The oracle reports document-wide duplicate identity, alias cycle, unresolved occurrence definition, unresolved union payload, and unresolved sequence or map element as five distinct diagnostic codes. | Test |
| FR-036-AC-5 | A static check reports zero imports of a path under `spikes/`, `src/`, `test/`, `tests/`, or `conformance/adapters/` from `conformance/oracle/`. | Analysis |
| FR-036-AC-6 | The oracle's `normalized` output for a `1.0.0` document is byte-identical to the canonical form of the input document. | Test |
| FR-036-AC-7 | For a document pair carrying both an optional addition and a required addition, the oracle classifies the pair `breaking` and names both changes. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-039](./FR-039-account-for-corpus-coverage-and-import.md)
