---
id: FR-050
title: "Validate and normalize the emitted semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-050] Validate and normalize the emitted semantic IR

## Description

The compiler SHALL validate every IR document it emits or reads against the
published schema and against the cross-field rules the schema cannot express,
and SHALL define one normalized serialization and fingerprint over it, so that
"the same IR" is a byte comparison rather than a judgement.

## Inputs

- A semantic IR document at `contractVersion` `2.0.0`
- `schema/semantic/v1/semantic-ir.schema.json` and `common.schema.json`
- `importedExports`: the type identities the FR-047 resolution exports from imported packages, or the marker `unknown` when no resolution is available
- `fixtures/semantic/v1/negative/reader-cases.json`, the issue #34 cross-field negative cases

## Outputs

- `src/compiler/ir/reader.mjs`: `readContractIr(document, { importedExports, limits })` returning diagnostics
- `src/compiler/ir/normalize.mjs`: `canonicalIr(document)` and `normalizeIr(document)` returning strings, and `fingerprintIr(document)` returning `sha256:<64 hex>`
- `src/compiler/ir/schema.mjs`: `validateIrDocument(document)` returning schema diagnostics
- `src/compiler/ir/applicability.mjs`: the one constraint applicability table the frontend and the reader share
- `src/compiler/schema-validate.mjs`: the compiled published-schema set, keyed by repository root

## Behavior

### Schema validation

- `validateIrDocument` SHALL validate against the published schema with a JSON Schema 2020-12 implementation.
- If validation fails, then `validateIrDocument` SHALL emit one `agent-ix.compiler.INVALID_IR` diagnostic per schema error, naming the failing instance pointer.

### Cross-field rules

- `readContractIr` SHALL enforce the FR-027..FR-029 cross-field rules, each with the code named here:

| Rule | Code |
|---|---|
| `multiplicity.lower` is a non-negative integer and `upper`, where present, is an integer not less than `lower` | `agent-ix.semantic-ir.INVALID_MULTIPLICITY` |
| `ordered` and `unique` appear only where `upper` is absent or greater than 1 | `agent-ix.semantic-ir.FLAGS_ON_NON_COLLECTION` |
| every field declares `multiplicity` | `agent-ix.semantic-ir.MISSING_MULTIPLICITY` |
| a `typeRef` resolves, through aliases, to a definition | `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF` |
| `unit` is a non-empty symbol | `agent-ix.semantic-ir.INVALID_UNIT` |
| `unit` appears only on a field resolving to a `scalar` | `agent-ix.semantic-ir.UNIT_ON_NON_SCALAR` |
| a constraint keyword is one of the closed eleven | `agent-ix.semantic-ir.UNKNOWN_CONSTRAINT_KEYWORD` |
| a constraint keyword applies to its resolved subject | `agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE` |
| a `pattern` regex compiles under ECMA-262 | `agent-ix.semantic-ir.INVALID_PATTERN` |
| a bound operand is typed for its scalar | `agent-ix.semantic-ir.INVALID_OPERAND` |
| `relationships` and `operations` appear only on a `record` | `agent-ix.semantic-ir.NODES_ON_NON_RECORD` |
| a relationship target resolves to a document type or an imported export | `agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET` |
| a relationship category is one of the closed seven | `agent-ix.semantic-ir.UNKNOWN_EDGE_CATEGORY` |
| the composite relationship graph is acyclic | `agent-ix.semantic-ir.COMPOSITE_CYCLE` |
| `clauseId` is unique within a type | `agent-ix.semantic-ir.DUPLICATE_CLAUSE_ID` |
| a clause language is core or namespaced | `agent-ix.semantic-ir.UNKNOWN_CLAUSE_LANGUAGE` |
| a source-originated clause carries a `sourceSpan` | `agent-ix.semantic-ir.MISSING_SOURCE_SPAN` |
| operation `pre` and `post` name a declared `clauseId` | `agent-ix.semantic-ir.DANGLING_CLAUSE_REF` |
| operation parameter names are unique | `agent-ix.semantic-ir.DUPLICATE_PARAM` |
| node identities are unique within each list; an extension `identity` is unique per node (within one node's `extensions[]` and within the document-level `extensions[]`) and is never entered into the declaration-identity set, so two definitions each carrying `ix://agent-ix/semantic-core/ext/kernel-scalar` are admissible | `agent-ix.semantic-ir.DUPLICATE_IDENTITY` |
| the document is an object | `agent-ix.semantic-ir.INVALID_DOCUMENT` |

- Where `importedExports` is the marker `unknown`, `readContractIr` SHALL suppress `UNRESOLVED_RELATIONSHIP_TARGET` for a target absent from the document and SHALL report the suppression to its caller, rather than reporting a defect it cannot see or passing a target it cannot check.
- `readContractIr` SHALL terminate on a cyclic alias chain, a cyclic composite relationship graph, and a document whose node count exceeds `maxNodes`, whose nesting exceeds `maxDepth`, or any of whose arrays exceeds `maxCollectionItems`, raising the corresponding limit diagnostic rather than recursing without bound.

### Normalization

- `canonicalIr` SHALL be the FR-048 canonical byte form of the document, with `types`, `fields`, `variants`, `constraints`, `relationships`, `operations`, `clauses`, and `extensions` declared as identity-keyed sets.
- `normalizeIr` SHALL materialize `multiplicity`, `presence`, and `nullable` on every field and every operation parameter before canonicalising.
- `fingerprintIr` SHALL be `digest` of `normalizeIr`'s output.
- The compiler SHALL validate its own emitted document before writing it.
- If that validation fails, then the compiler SHALL treat the failure as a blocking diagnostic rather than writing an invalid document.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-050-CON-1 | The compiler's reader is deliberately a third implementation beside the issue #34 TypeScript and Python readers; it SHALL NOT import either, so their agreement remains evidence rather than a tautology. Their agreement is a drift guard; the schema and FR-027..029 remain the authority. | Correctness | Static analysis and differential test |
| FR-050-CON-2 | This requirement SHALL NOT edit `tests/semantic_ir_reader.py`. Invoking the Python reader from a test under `test/` is not an edit. `test/semantic-ir-v1-1-reader.ts` is exempted from this constraint (fcd#179 deleted contracts 1.0.0 and 1.1.0, which that reader also read, and ported it to 2.0.0 only). | Non-disruption | Branch diff |
| FR-050-CON-3 | Normalization SHALL be idempotent: normalizing a normalized document yields identical bytes. | Correctness | Property test |
| FR-050-CON-4 | The reader SHALL terminate on every cyclic or oversized input rather than recursing without bound. | Safety | Fuzz |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-050-AC-1 | Every published positive fixture under `fixtures/semantic/v1/positive/` declaring contract `2.0.0` validates and yields zero reader diagnostics; `semantic-ir.json` and `config-version-v1-1.json` stay frozen at their deleted contracts as refused negative evidence (fcd#179) and are excluded. | Test |
| FR-050-AC-2 | Every case in `negative/reader-cases.json` yields the expected diagnostic code from the compiler's reader. | Test |
| FR-050-AC-3 | For every case in `negative/reader-cases.json`, the compiler's reader, the issue #34 TypeScript reader, and the Python reader produce the same set of codes; a disagreement fails the suite. | Integration |
| FR-050-AC-4 | `src/compiler/ir/reader.mjs` imports no module under `test/` or `tests/`, and `tests/semantic_ir_reader.py` is byte-unchanged from `origin/main` (fcd#179 ported `test/semantic-ir-v1-1-reader.ts` to contract 2.0.0, so it is exempted here). | Analysis |
| FR-050-AC-5 | `normalizeIr` materializes `multiplicity`, `presence`, and `nullable` on every field and operation parameter. | Test |
| FR-050-AC-6 | `normalizeIr(normalizeIr(d))` equals `normalizeIr(d)` for every positive fixture and for generated documents. | Property |
| FR-050-AC-7 | Two documents differing only in object key order and in identity-keyed array order have the same `fingerprintIr`; two differing in any semantic value do not. | Property |
| FR-050-AC-8 | An emitted document that fails validation is not written, and the failure is a blocking diagnostic naming the failing pointer. | Test |
| FR-050-AC-9 | A document whose alias chain is cyclic, one whose composite relationships are cyclic, one exceeding `maxNodes`, and one exceeding `maxDepth` each produce a diagnostic and terminate. | Test |
| FR-050-AC-10 | `INVALID_IR` diagnostics name the failing instance pointer, verified against a hand-computed pointer for a malformed fixture. | Test |
| FR-050-AC-11 | Every rule of the code table fires on a constructed document and produces exactly its named code. | Test |
| FR-050-AC-12 | With `importedExports` set to `unknown`, a relationship target absent from the document produces no diagnostic and one recorded suppression; with the resolution supplied, the same document produces `UNRESOLVED_RELATIONSHIP_TARGET`. | Test |
| FR-050-AC-13 | Over 512 mutated documents the reader returns diagnostics and never throws. | Fuzz |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md)
- **Downstream**: [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md), [FR-052](./FR-052-provide-the-compiler-command-line.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
