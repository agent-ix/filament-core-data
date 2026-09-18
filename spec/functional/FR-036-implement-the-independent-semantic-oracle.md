---
id: FR-036
title: "Implement the independent JSON-level semantic oracle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
---
# [FR-036] Implement the independent JSON-level semantic oracle

## Description

The repository SHALL ship one JSON-level semantic oracle that decides, for any
conformance input bundle, the result state and the ordered diagnostic list the
published contract requires, implemented from the contract text and schemas and
from no implementation under test.

## Inputs

- A conformance input bundle (FR-035): `ir`, and optionally `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`
- The published schemas under `schema/semantic/v1/`
- `conformance/diagnostic-codes.json`: the corpus diagnostic-code register

## Outputs

- `conformance/oracle/oracle.mjs`: the verdict engine
- `conformance/oracle/schema-layer.mjs`: the pinned JSON Schema 2020-12 layer
- `conformance/oracle/index.mjs`: the stable import surface (FR-039)
- `conformance/diagnostic-codes.json`: one row per diagnostic code with its rule, its deciding layer, and the contract clause that obliges it
- A verdict object `{ contractVersion, resultState, diagnostics[], normalized }`

## Behavior

- The oracle SHALL validate each present bundle member against its published v1 schema with a JSON Schema 2020-12 implementation pinned in `devDependencies`.
- The oracle SHALL report a schema violation as one diagnostic per distinct failing instance location, discarding any location that is a strict prefix of another reported location, so that one violation inside a `oneOf` or `allOf` cascade yields one diagnostic at the deepest failing node.
- The oracle SHALL return only the schema layer's diagnostics when that layer produced any, so that a schema-decided case is decided once.
- The oracle SHALL decide the cross-field rules the schema cannot express: presence derived from multiplicity; `ordered` and `unique` only on a collection; `unit` only where `typeRef` resolves through aliases to a scalar; the closed constraint keyword vocabulary with its per-keyword operand types and applicability table; a `pattern` operand that compiles under ECMA-262; clause id uniqueness per type; a `sourceSpan` on a source-originated clause; `pre` and `post` binding to a declared `clauseId`; relationship target resolution to a document type or a manifest export; the declared edge-category set; acyclic composite relationship graphs; and duplicate field and parameter names.
- The oracle SHALL decide the rules that no reader in this repository decides at the merge base of this branch: document-wide identity uniqueness across types, fields, variants, constraints, relationships, operations, clauses, and occurrences; alias cycles; `occurrences[].definition` resolution; `union` variant `payloadType` resolution; and `sequence.items` and `map.values` resolution.
- The oracle SHALL decide the package-context rules when the bundle supplies the member each needs: an import the lock does not resolve; a cycle in the lock's package graph; a `manifestDigest` in the IR that differs from the bundle's `manifestDigest`; a mapping naming an identity no declaration owns; an entity-role type that the manifest neither exports nor the profile declares an allowed omission; and a `required: true` extension whose identity the consumer policy does not list while that policy rejects unknown extensions.
- The oracle SHALL emit no diagnostic for a package-context rule whose bundle member is absent, so that a document-only case is decided by the document rules alone.
- The oracle SHALL reuse verbatim every diagnostic code that `fixtures/semantic/v1/negative/reader-cases.json` already froze.
- The oracle SHALL mint a new diagnostic code only with a `conformance/diagnostic-codes.json` row naming the contract clause that obliges the rule.
- The oracle SHALL emit every diagnostic as a `common.schema.json#/$defs/diagnostic` document, with `owner` set to the identity of the nearest owning declaration, `blocking` set to `true` for severity `error`, and `locus` taken verbatim from the addressed node's `origin.source` or, absent that, from its nearest ancestor's.
- The oracle SHALL return `resultState` `success` when it emits no diagnostic, `invalid` when it emits at least one diagnostic of severity `error`, and `lossy` when it emits at least one diagnostic and none of severity `error`, so that the three states are exhaustive and disjoint.
- The oracle SHALL never return `unsupported`, `unavailable`, or `partial`, which are adapter states and not verdicts.
- The oracle SHALL order diagnostics by `pointer` under a code-point comparison, then by `code`, then by `message`, then by the canonical form of the diagnostic, so that no two diagnostics tie.
- The oracle SHALL apply no locale-sensitive comparison when it orders diagnostics or sorts object keys.
- The oracle SHALL compute `normalized` as the FR-027 normalized serialization in the corpus canonical form `agent-ix-conformance-jcs-v1`, materializing `nullable` as a literal boolean on every field and operation parameter and no other member: `nullable` materializes `true` only where the authored member is the JSON literal `true`; every other value or its absence — `null`, `false`, a number, a string, an array, or an object, or no member at all — materializes `false` (fcd#187), matching the rule FR-050, FR-059, and FR-069 state for the four adapters, so a schema-invalid document's `normalized` stays comparable across the oracle and every adapter. `multiplicity` and `presence` are schema-required and independently authored (FR-027, FR-106); the oracle never materializes either, so a well-formed `2.0.0` document — whose schema already requires `multiplicity`, `presence`, and `nullable` on every field — gains no member beyond a literal `nullable`.
- The oracle SHALL detect a cycle in an alias chain, a composite relationship graph, and a lock package graph before any depth bound applies.
- The oracle SHALL report each detected cycle under that cycle's own diagnostic code.
- The oracle SHALL bound acyclic reference expansion, composite-relationship expansion, and package-graph expansion at a declared finite depth of 256, and emit `agent-ix.semantic-ir.DEPTH_LIMIT_EXCEEDED` at the node that exceeds it.
- The oracle SHALL classify a pair of bundles for a `compatibility` case over the IR surface only, as `patch`, `additive`, `conditional`, `breaking`, `unknown`, or `invalid`, taking a required field addition, any removal, a resolved-type change, a nullability change, a structural-kind change, a stable identity change, and an unknown-policy tightening as `breaking`; a constraint relaxation as `additive`; a constraint tightening and an added enum or union variant as `conditional`; a display-name or documentation-only change as `patch`; and an unclassifiable change as `unknown`.
- The oracle SHALL classify an optional field addition as `additive` only when the bundle's consumer policy preserves or surfaces unknown members, and as `conditional` otherwise or when no consumer policy is supplied.
- The oracle SHALL rank classifications, most restrictive first, as `invalid`, `breaking`, `unknown`, `conditional`, `additive`, `patch`, and report the most restrictive classification any change produced.
- The oracle SHALL name every change that contributed to a reported classification, with its pointer.
- The oracle SHALL record in `conformance/README.md` that its classification covers the IR surface only, and that `compatibility-report.schema.json` and FR-025 remain the authority for the profile, mapping, representation, generated-target, and consumer-evidence surfaces.
- The oracle SHALL execute no code from the bundle, open no network connection, read no clock, read no environment variable, read no path outside `conformance/` and `schema/`, and write no file.
- If the oracle is asked for a verdict on a value that is not an input bundle, then it SHALL return `invalid` with exactly one `agent-ix.semantic-ir.INVALID_DOCUMENT` diagnostic at pointer `""`.
- If a `negative` case yields other than exactly one oracle diagnostic, then the corpus gate SHALL fail and name that case.
- If an expected diagnostic addresses a node under an `origin.source` and its `locus` differs from the locus the oracle emits, then the corpus gate SHALL fail and name that diagnostic.
- The oracle SHALL NOT import, execute, or read the output of `spikes/typespec-feasibility/`, `test/semantic-ir-v1-1-reader.ts`, `tests/semantic_ir_reader.py`, `src/`, or any adapter under `conformance/adapters/`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-036-CON-1 | The oracle SHALL depend on no package outside the JSON Schema validator and format package already pinned in `devDependencies`. | Portability | Analysis |
| FR-036-CON-2 | The oracle SHALL be pure with respect to a bundle, so that two verdicts for one input are byte-identical including diagnostic order. | Determinism | Test |
| FR-036-CON-3 | The oracle SHALL emit only codes that `conformance/diagnostic-codes.json` declares, with every declared row exercised by at least one case. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-036-AC-1 | For every corpus case, the oracle's verdict equals the case's authored `expected` block, including diagnostic codes, order, pointers, severities, and loci. | Test |
| FR-036-AC-2 | Two oracle runs over the corpus produce byte-identical output, and the diagnostic order is unchanged under `LC_ALL=tr_TR.UTF-8`. | Test |
| FR-036-AC-3 | A self-referential alias and a mutually recursive alias pair each yield exactly one `ALIAS_CYCLE` diagnostic; an acyclic alias chain longer than 256 links yields `DEPTH_LIMIT_EXCEEDED` at the node that exceeds it. | Test |
| FR-036-AC-4 | Document-wide duplicate identity, alias cycle, unresolved occurrence definition, unresolved union payload, and unresolved sequence or map element are five distinct diagnostic codes. | Test |
| FR-036-AC-5 | A static check reports zero imports of a path under `spikes/`, `src/`, `test/`, `tests/`, or `conformance/adapters/` from `conformance/oracle/`, and zero clock, network, or environment reads. | Analysis |
| FR-036-AC-6 | For every `2.0.0` document in the corpus whose `nullable` members are all already the JSON literal `true` or `false`, `normalized` is byte-identical to the corpus canonical form of the input and no member is added; for any other `2.0.0` document, `normalized` differs from that canonical form only in materializing each such `nullable` as `=== true` (fcd#187). | Test |
| FR-036-AC-7 | A pair carrying both an optional and a required addition classifies `breaking` and names both changes; the same optional addition alone classifies `additive` under a preserving consumer policy and `conditional` with no policy. | Test |
| FR-036-AC-8 | Every diagnostic the oracle emits validates against `common.schema.json#/$defs/diagnostic` and carries the `owner`, `blocking`, `causes`, and `related` members that schema requires. | Test |
| FR-036-AC-9 | Each of the six package-context rules fires on a bundle that supplies the member it needs, and none fires on a bundle that omits it. | Test |
| FR-036-AC-10 | Every schema-decided case yields one diagnostic at the deepest failing instance location, and no ancestor location is reported beside it. | Test |
| FR-036-AC-11 | Every code the oracle emits has a `conformance/diagnostic-codes.json` row citing a contract clause, and the sixteen codes frozen in `reader-cases.json` are reused verbatim. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md)
- **Downstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), [FR-039](./FR-039-account-for-corpus-coverage-and-import.md)
