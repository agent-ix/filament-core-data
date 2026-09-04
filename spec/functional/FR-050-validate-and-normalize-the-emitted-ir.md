---
id: FR-050
title: "Validate and normalize the emitted semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
---
# [FR-050] Validate and normalize the emitted semantic IR

## Description

The compiler SHALL validate every IR document it emits or reads against the
published schema and against the cross-field rules the schema cannot express,
and SHALL define one normalized serialization and fingerprint over it, so that
"the same IR" is a byte comparison rather than a judgement.

## Inputs

- A semantic IR document at `contractVersion` `1.0.0` or `1.1.0`
- `schema/semantic/v1/semantic-ir.schema.json` and `common.schema.json`
- The lock exports a relationship target may resolve to
- `fixtures/semantic/v1/negative/reader-cases.json`, the issue #34 cross-field negative cases

## Outputs

- `src/compiler/ir/reader.mjs`: `readContractIr(document, { lockExports })` returning diagnostics
- `src/compiler/ir/normalize.mjs`: `canonicalIr(document)` and `normalizeIr(document)` returning strings, and `fingerprintIr(document)` returning `sha256:<64 hex>`
- `src/compiler/ir/schema.mjs`: `validateIrDocument(document)` returning schema diagnostics

## Behavior

- `validateIrDocument` SHALL validate against the published schema with a JSON Schema 2020-12 implementation.
- If validation fails, then `validateIrDocument` SHALL emit one `agent-ix.compiler.INVALID_IR` diagnostic per schema error, at the failing instance pointer.
- `readContractIr` SHALL enforce the FR-027..FR-029 cross-field rules: multiplicity bounds, collection-only `ordered`/`unique` flags, presence derived from `lower`, `unit` only on a `typeRef` that resolves through aliases to a `scalar`, constraint applicability over the resolved kind, typed operands per keyword, a compiling `pattern` regex, relationship targets resolving to a document type or a lock export, acyclic composite relationship graphs, `clauseId` unique per type, `pre`/`post` bound to a declared `clauseId`, operation parameter names unique, `relationships`/`operations` only on `record`, and identity uniqueness within each node list.
- `readContractIr` SHALL require `multiplicity` on every field of a `1.1.0` document.
- For a `1.0.0` document, `readContractIr` SHALL derive each field's multiplicity from its `presence`.
- `canonicalIr` SHALL be the FR-048 canonical byte form of the document.
- For a `1.1.0` document, `normalizeIr` SHALL materialize `multiplicity`, `presence`, and `nullable` on every field and every operation parameter before canonicalising.
- For a `1.0.0` document, `normalizeIr` SHALL add no bytes beyond canonicalisation.
- `fingerprintIr` SHALL be the SHA-256 of `normalizeIr`'s output.
- The compiler SHALL validate its own emitted document before writing it.
- If that validation fails, then the compiler SHALL treat the failure as a blocking diagnostic rather than writing an invalid document.
- The compiler's reader SHALL agree with the issue #34 test-scoped reader and the Python reader on the diagnostic codes produced for every case in `fixtures/semantic/v1/negative/reader-cases.json`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-050-CON-1 | The compiler's reader is deliberately a third implementation beside the issue #34 TypeScript and Python readers; it SHALL NOT import either, so their agreement remains evidence rather than a tautology. | Correctness | Static analysis and differential test |
| FR-050-CON-2 | `test/semantic-ir-v1-1-reader.ts` and `tests/semantic_ir_reader.py` SHALL NOT be edited by this requirement. | Non-disruption | Branch diff |
| FR-050-CON-3 | Normalization SHALL be idempotent: normalizing a normalized document yields identical bytes. | Correctness | Property test |
| FR-050-CON-4 | The reader SHALL terminate on a cyclic alias chain and on a cyclic composite relationship graph rather than recursing without bound. | Safety | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-050-AC-1 | Every positive `1.1.0` fixture under `fixtures/semantic/v1/positive/` validates and yields zero reader diagnostics. | Test |
| FR-050-AC-2 | Every case in `negative/reader-cases.json` yields the expected diagnostic code from the compiler's reader. | Test |
| FR-050-AC-3 | For every case in `negative/reader-cases.json`, the compiler's reader, the issue #34 TypeScript reader, and the Python reader produce the same set of codes. | Test |
| FR-050-AC-4 | `src/compiler/ir/reader.mjs` imports no module under `test/` or `tests/`, and `test/semantic-ir-v1-1-reader.ts` and `tests/semantic_ir_reader.py` are byte-unchanged from `origin/main`. | Analysis |
| FR-050-AC-5 | `normalizeIr` materializes `multiplicity`, `presence`, and `nullable` on every `1.1.0` field and operation parameter, and leaves a `1.0.0` document's field set unchanged. | Test |
| FR-050-AC-6 | `normalizeIr(normalizeIr(d))` equals `normalizeIr(d)` for every positive fixture and for generated documents. | Property |
| FR-050-AC-7 | Two documents differing only in object key order and in identity-keyed array order have the same `fingerprintIr`; two differing in any semantic value do not. | Property |
| FR-050-AC-8 | An emitted document that fails validation is not written, and the failure is a blocking diagnostic naming the failing pointer. | Test |
| FR-050-AC-9 | A document whose alias chain is cyclic and one whose composite relationships are cyclic each produce a diagnostic and terminate within the declared node limit. | Test |
| FR-050-AC-10 | `INVALID_IR` diagnostics name the failing instance pointer, verified against a hand-computed pointer for a malformed fixture. | Test |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
