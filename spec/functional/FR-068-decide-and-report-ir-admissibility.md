---
id: FR-068
title: "Decide and report the admissibility of an IR document"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-068] Decide and report the admissibility of an IR document

## Description

The TypeScript backend SHALL decide, from the published contract alone, whether
a semantic IR document is admissible for generation, and SHALL report every
reason it is not as a stable diagnostic located by a JSON pointer, so that the
backend's answer can be compared with an oracle that never saw its code.

This is the backend's own reader, and it is deliberately a second implementation
beside `src/compiler/ir/reader.mjs` rather than a call into it. A backend that
asks the compiler whether the compiler's own output is valid produces agreement
and no evidence: the two would fail together on every rule the compiler gets
wrong, and the conformance run would report a pass. The corpus of issue #20 is
an independent yardstick only for as long as the thing it measures was written
independently of it, and the same is true one layer down.

Two decisions are separated here and must not be conflated. *Admissibility* is a
contract-level judgement about the document — the judgement the oracle also
makes, in the vocabulary the corpus registers, and the only one an adapter
answer carries. *Representability* is a target-level judgement about TypeScript
— whether this backend can render an admissible document — and it is carried in
this backend's own diagnostic namespace and never mixed into an admissibility
answer. A document can be admissible and unrepresentable; that is a refusal to
generate, not a claim that the document is invalid.

## Inputs

- A semantic IR document at `contractVersion` `1.0.0` or `1.1.0`
- The input bundle members that carry package context: `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, as `conformance/schema/input-bundle.schema.json` composes them
- `schema/semantic/v1/semantic-ir.schema.json` and `schema/semantic/v1/common.schema.json`
- `conformance/diagnostic-codes.json`, the corpus's closed register of the thirty codes an admissibility answer may carry, read by a test rather than by the backend
- `docs/semantic-data-system/contracts-v1.md`, the prose contract the rules are read from
- The declared limits of `schema/semantic/v1/compiler-request.schema.json#/properties/limits`

## Outputs

- `src/compiler/backends/typescript-v1/admit.mjs`: `admitIr(bundle, { limits, referencePolicy })` returning `{ resultState, diagnostics }`, where each diagnostic is `{ pointer, diagnostic }`
- `src/compiler/backends/typescript-v1/admit.d.mts` declaring that surface
- `src/compiler/backends/typescript-v1/loss.mjs`: `representability(ir)` returning the declared target losses, and `REFERENCE_POLICY`, the single named GAP-011 policy constant
- `src/compiler/backends/typescript-v1/loss.d.mts` declaring that surface

## Behavior

### The structural layer

- `admitIr` SHALL validate the document against the published `semantic-ir.schema.json` with a JSON Schema 2020-12 implementation.
- Where more than one schema error reports the same instance location, `admitIr` SHALL emit exactly one diagnostic at the deepest failing location rather than one per error.
- `admitIr` SHALL report a schema failure as `agent-ix.semantic-ir.SCHEMA_VIOLATION`.
- If the bundle carries no `ir` object, then `admitIr` SHALL emit one `agent-ix.semantic-ir.INVALID_DOCUMENT` at the pointer `""`.
- If the structural layer emits any diagnostic, then `admitIr` SHALL NOT consult the cross-field rules, so that a structurally invalid document yields one explanation rather than a cascade.

### The cross-field rules

- `admitIr` SHALL report each rule below under the code named beside it:

| Rule | Code |
|---|---|
| A `typeRef` resolves, through aliases, to a declared definition | `UNRESOLVED_TYPE_REF` |
| A `sequence`'s `items` and a `map`'s `values` resolve to a declared definition | `UNRESOLVED_ELEMENT_TYPE` |
| A variant's `payloadType` resolves to a declared definition | `UNRESOLVED_VARIANT_PAYLOAD` |
| An occurrence's `definition` resolves to a declared definition | `UNRESOLVED_OCCURRENCE_DEFINITION` |
| An alias chain revisits a definition already on the chain | `ALIAS_CYCLE` |
| A resolution walk exceeds the declared depth bound | `DEPTH_LIMIT_EXCEEDED` |
| Node identities are unique within each list | `DUPLICATE_IDENTITY` |
| Field names are unique within a record | `DUPLICATE_FIELD_NAME` |
| Operation parameter names are unique within an operation | `DUPLICATE_PARAM` |
| `clauseId` is unique within a type | `DUPLICATE_CLAUSE_ID` |
| An operation's `pre` and `post` name a `clauseId` declared on the same type | `DANGLING_CLAUSE_REF` |
| A source-originated clause carries a `sourceSpan` | `MISSING_SOURCE_SPAN` |
| A constraint keyword applies to the scalar its subject resolves to | `CONSTRAINT_NOT_APPLICABLE` |
| A bound operand is typed and ranged for its resolved scalar | `INVALID_OPERAND` |
| A `pattern` regex compiles under ECMA-262 | `INVALID_PATTERN` |
| A relationship target resolves to a document type or a lock export | `UNRESOLVED_RELATIONSHIP_TARGET` |
| The graph of `composite: true` relationships is acyclic | `COMPOSITE_CYCLE` |
| A `1.1.0`-only node does not appear in a `1.0.0` document | `V1_1_NODE_IN_V1_0` |
| `presence` agrees with `multiplicity.lower` | `PRESENCE_MULTIPLICITY_MISMATCH` |
| `multiplicity.upper`, where present, is not less than `lower` | `INVALID_MULTIPLICITY` |
| `ordered` and `unique` appear only where `upper` is absent or greater than one | `FLAGS_ON_NON_COLLECTION` |
| `unit` appears only on a field resolving to a `scalar` | `UNIT_ON_NON_SCALAR` |
| Every manifest import resolves to a package the lock carries | `UNRESOLVED_IMPORT` |
| The package import graph is acyclic | `PACKAGE_CYCLE` |
| The lock agrees with the manifest and the source digests it records | `STALE_LOCK` |
| A mapping names a target the published target vocabulary declares | `UNKNOWN_MAPPING_TARGET` |
| A mapping that loses information declares that loss | `UNDECLARED_LOSS` |
| A `required: true` extension names a capability the consumer policy admits | `UNKNOWN_REQUIRED_EXTENSION` |

- Every code in the table SHALL be written with the `agent-ix.semantic-ir.` prefix the register publishes.
- If an alias chain is both cyclic and deeper than the bound, then `admitIr` SHALL report `ALIAS_CYCLE`, because a cycle is the more specific fact and a depth report would hide it.
- `admit.mjs` SHALL declare its own closed code register as an exported frozen
  object, in the manner of `DIAGNOSTIC_CODES`, and SHALL spell a code nowhere
  else.
- That register SHALL stand in exact bijection with the `agent-ix.semantic-ir.`
  codes of `conformance/diagnostic-codes.json`, asserted in both directions by a
  test rather than by an import, because a module under `src/` that reads the
  corpus at run time makes the corpus a dependency of the thing it judges.
- `admitIr` SHALL mint no code outside that register.

### The result state

- If `admitIr` emits no diagnostic, then it SHALL return `resultState` `success`.
- If `admitIr` emits any diagnostic of severity `error`, then it SHALL return `resultState` `invalid`.
- If `admitIr` emits diagnostics and none has severity `error`, then it SHALL return `resultState` `lossy`.
- `admitIr` SHALL NOT return `partial`, `unsupported`, or `unavailable`, because the published contract states no rule that assigns them, which `conformance/contract-gaps.json` records as GAP-006.

### Diagnostic form and order

- Every emitted diagnostic SHALL validate against `common.schema.json#/$defs/diagnostic`.
- `admitIr` SHALL carry the RFC 6901 pointer beside the diagnostic rather than inside it, because the published diagnostic is sealed against an in-document location, which `conformance/contract-gaps.json` records as GAP-003.
- `admitIr` SHALL order diagnostics by pointer, then code, then message, then canonical form, comparing every one of them by code point.
- `admitIr` SHALL NOT order diagnostics by any locale-sensitive comparison, so that the answer does not move with the host's ICU data.
- Each diagnostic's `owner` SHALL be the nearest enclosing node's `identity`, and the backend's own identity where no ancestor carries one.

### Target representability

- `representability` SHALL report a construct the TypeScript target has no representation for as a declared loss naming the owning type's identity and the construct.
- `representability` SHALL treat an `operation` as declared loss, because the generated surface is data rather than behaviour.
- `representability` SHALL treat a `clause` as declared loss, because formal clause text is not parsed here and `agent-ix/quire-contract-ir#52` owns clause semantics.
- `representability` SHALL treat a `format` constraint whose name this backend implements no check for as declared loss.
- `representability` SHALL treat a `defaultKind` of `representation` or `migration` as declared loss at generation time, because neither is a value the generated type can carry.
- Because the committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json` sets `unsupportedFeaturePolicy` to `fail`, a declared loss SHALL block generation rather than degrade it.
- `representability` SHALL report every loss under the `agent-ix.typescript-backend.` prefix.
- `representability` SHALL NOT contribute a diagnostic to an admissibility answer, because a target's inability to render a document is not a statement that the document is invalid.

### The GAP-011 reference policy

- `REFERENCE_POLICY` SHALL be the one place the backend decides whether a `reference` kind's unresolvable `target` is a defect, admitting exactly the two settings `strict` and `open`.
- `REFERENCE_POLICY` SHALL default to `strict`, under which an unresolvable `reference` target yields `UNRESOLVED_TYPE_REF` at `/ir/types/<index>/target`.
- The default SHALL be recorded as conformance with the corpus's published reading, which cases REF-001..004 pin, rather than as a ruling on the contract.
- `docs/semantic-data-system/contracts-v1.md` states a resolution rule for relationship targets and none for a `reference` target; that gap is `conformance/contract-gaps.json` GAP-011, it is owned by `agent-ix/filament-core-data#9`, and this requirement SHALL NOT settle it.
- When issue #9 settles GAP-011, changing this backend to the settled reading SHALL be one edit to `REFERENCE_POLICY`, requiring no change elsewhere in the backend.

### Independence, bounds, and purity

- `admit.mjs` and `loss.mjs` SHALL NOT import `src/compiler/ir/reader.mjs`, `src/compiler/ir/schema.mjs`, `src/compiler/ir/applicability.mjs`, or `src/compiler/compat/diff.mjs`.
- `admit.mjs` and `loss.mjs` SHALL NOT import any module under `conformance/`.
- `admitIr` SHALL terminate on a cyclic document, on one exceeding `maxDepth`, on one exceeding `maxNodes`, and on one whose arrays exceed `maxCollectionItems`, reporting the corresponding bound rather than recursing without bound.
- `admitIr` SHALL truncate its diagnostic list at `maxDiagnostics` rather than growing it without bound.
- `admitIr` SHALL read no clock, no environment variable, and no network.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-068-CON-1 | The backend's reader is deliberately a second implementation beside the compiler's; it SHALL NOT import the compiler's reader, its schema layer, or its applicability table, so that agreement between them is evidence rather than a tautology. | Correctness | Static analysis |
| FR-068-CON-2 | The admissibility code vocabulary SHALL stand in bijection with the `agent-ix.semantic-ir.` half of `conformance/diagnostic-codes.json`, so a rule with no registered code is reported as target representability under the backend's own prefix rather than minted into `agent-ix.semantic-ir.`. The bijection is asserted by a test; no module under `src/` imports or reads a file under `conformance/`. | Integrity | Test |
| FR-068-CON-3 | `REFERENCE_POLICY` SHALL be the only place in the backend that decides reference-target resolution, so a search for that decision elsewhere finds nothing. | Maintainability | Static analysis |
| FR-068-CON-4 | This requirement SHALL NOT edit any file under `conformance/cases/`, `conformance/bases/`, or `conformance/oracle/`; a disagreement with the oracle is recorded, never absorbed. | Non-disruption | Change-set diff |
| FR-068-CON-5 | `admitIr` SHALL leave its argument byte-identical, so the bundle a caller passes is never mutated by the decision made about it. | Correctness | Property test |
| FR-068-CON-6 | Neither module SHALL throw for any input, so every refusal is a returned diagnostic and a hostile document cannot end a conformance run. | Safety | Fuzz |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-068-AC-1 | Every positive fixture under `fixtures/semantic/v1/positive/` and every conformance base yields `resultState` `success` and zero diagnostics. | Test |
| FR-068-AC-2 | Every rule of the code table fires on a constructed document and produces exactly its named code at a hand-computed pointer. | Test |
| FR-068-AC-3 | A document with three schema errors at one instance location yields one `SCHEMA_VIOLATION` at the deepest failing location, not three. | Unit |
| FR-068-AC-4 | A structurally invalid document yields only structural diagnostics; no cross-field code appears in its answer. | Unit |
| FR-068-AC-5 | A document that is both alias-cyclic and over the depth bound yields `ALIAS_CYCLE` and not `DEPTH_LIMIT_EXCEEDED`. | Unit |
| FR-068-AC-6 | The three `resultState` values are produced by a document with no diagnostic, one with an error diagnostic, and one with only non-error diagnostics; no other value is ever returned. | Test |
| FR-068-AC-7 | Diagnostic order is byte-identical when the suite is re-run under `LC_ALL=tr_TR.UTF-8` and from a different working directory. | Integration |
| FR-068-AC-8 | Every diagnostic the module emits over the whole corpus validates against `common.schema.json#/$defs/diagnostic`, and no diagnostic object carries a pointer member. | Property |
| FR-068-AC-9 | Every code the module can emit is present in `conformance/diagnostic-codes.json`, and a deliberately minted code fails the check. | Static |
| FR-068-AC-10 | An IR carrying an operation, a clause, an unimplemented `format`, and a `migration` default yields four declared losses naming those four constructs and their owning type identities, all under the `agent-ix.typescript-backend.` prefix. | Test |
| FR-068-AC-11 | A declared loss blocks generation and contributes no member to the admissibility answer for the same document. | Test |
| FR-068-AC-12 | With `REFERENCE_POLICY` at `strict`, an unresolvable `reference` target yields `UNRESOLVED_TYPE_REF` at `/ir/types/<index>/target`; with it at `open`, the same document yields no diagnostic; no other line of the backend changes between the two runs. | Test |
| FR-068-AC-13 | `admit.mjs` and `loss.mjs` contain no import of the compiler's reader, schema layer, applicability table, or diff module, and none of any module under `conformance/`. | Static |
| FR-068-AC-14 | A document exceeding each of `maxDepth`, `maxNodes`, `maxCollectionItems`, and `maxDiagnostics` returns the corresponding bounded answer and does not throw. | Test |
| FR-068-AC-15 | Over 512 mutated documents the module returns an answer, never throws, and leaves its input byte-unchanged. | Fuzz |
| FR-068-AC-16 | A run with every environment variable cleared but `PATH` produces an identical answer for every corpus case. | Integration |

## Dependencies

- **Upstream**: [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-036](./FR-036-implement-the-independent-semantic-oracle.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md)
- **Downstream**: [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions**: GAP-003 (the sealed diagnostic carries no in-document location) and GAP-006 (`resultState` admits values no rule assigns) are recorded in `conformance/contract-gaps.json` and owned by `agent-ix/filament-core-data#9`; GAP-011 (the resolution rule for a `reference` target) is owned by the same issue and is the dependency this requirement declares rather than resolves.
