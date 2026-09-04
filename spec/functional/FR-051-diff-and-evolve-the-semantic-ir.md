---
id: FR-051
title: "Diff two semantic contracts and govern IR schema evolution"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
---
# [FR-051] Diff two semantic contracts and govern IR schema evolution

## Description

The compiler SHALL classify the difference between two semantic contracts into a
compatibility report, and SHALL define and implement the policy by which a
reader of one IR contract version reads a document of the other, so that a
revision's disposition is computed from the artefacts rather than asserted in a
pull-request description.

## Inputs

- Two semantic IR documents, old and new
- Optionally the old and new selected profile documents and their mapping documents
- Optionally the old and new Protobuf field-number reservation registries
- Consumer policy documents valid against `schema/semantic/v1/consumer-policy.schema.json`, and a `consumerEvidenceStatus` of `current`, `stale`, or `unknown`
- Optionally per-target dispositions supplied by a qualified backend

## Outputs

- `src/compiler/compat/diff.mjs`: `diffSemanticContract(request)` returning a document valid against `schema/semantic/v1/compatibility-report.schema.json`
- `src/compiler/compat/evolution.mjs`: `readIrAsContract(document, targetVersion)` returning `{ document, loss }`
- `docs/semantic-data-system/ir-compatibility-policy.md`: the published policy
- `fixtures/compiler/evolution/`: the golden backward and forward projections

## Behavior

### Classification

- The diff SHALL emit one change entry per differing identity, carrying `identity`, `family`, `surface`, `disposition`, `rationale`, `affectedConsumers`, and `targetResults`.
- The diff SHALL rank dispositions `patch` < `additive` < `conditional` < `unknown` < `breaking` < `invalid`, and SHALL set `aggregateDisposition` to the most restrictive entry disposition, and each entry's disposition to the most restrictive of its `targetResults` where any are supplied.
- The diff SHALL classify by this closed table, which reproduces every case in `fixtures/semantic/v1/compatibility/cases.json`:

| Observed change | Report `family` | Disposition |
|---|---|---|
| Documentation or rationale only, no semantic value changed | `documentation` | `patch` |
| Optional field added, every consumer preserves or surfaces unknowns, evidence current | `field` | `additive` |
| Optional field added, consumer evidence stale | `field` | `conditional` |
| Required field added or any field removed | `field` | `breaking` |
| Stable identity changed | `identity` | `breaking` |
| Scalar domain widened | `type` | `conditional` |
| Union variant removed | `union` | `breaking` |
| Constraint operand corrected with no semantic value change | `constraint` | `patch` |
| Enum member added, consumer policy `reject` | `enum` | `breaking` |
| Enum member added, consumer policy `surface` or `preserve` | `enum` | `additive` |
| `unknownPolicy` tightened from `preserve` toward `reject` | `unknown-policy` | `breaking` |
| Multiplicity widened; multiplicity narrowed; `ordered` or `unique` flipped | `field` | `additive`; `breaking`; `breaking` |
| `unit` changed | `field` | `breaking` |
| Relationship added; removed; retargeted; `composite` flipped | `type` | `additive`; `breaking`; `breaking`; `breaking` |
| Operation added; `returns` changed | `type` | `additive`; `breaking` |
| Clause added; removed; `language` changed | `type` | `additive`; `breaking`; `breaking` |
| Constraint keyword added to the vocabulary; removed; operands retyped | `constraint` | `additive`; `breaking`; `breaking` |
| Kernel scalar member added; removed; re-represented | `type` | `additive`; `breaking`; `breaking` |
| `contractVersion` `1.0.0` to `1.1.0` with only the declared added nodes | `generated-api` | `additive` |
| Generated name changed with no semantic identity change | `generated-api` | `patch` |
| Profile `allowedOmissions` gained an identity | `profile` | `breaking` |
| Profile `authority` changed with an unchanged structural shape | `authority` | `breaking` |
| Mapping `editDirection` changed | `mapping` | `conditional` |
| Loss present in the new contract and not declared in `omittedIdentities` | `loss` | `breaking` |
| A reserved Protobuf field name or number reused | `protobuf-reservation` | `invalid` |
| Any change whose consumer evidence is `unknown` | the observed family | `unknown` |

- The diff SHALL set `surface` to `semantic` for the IR families, `profile` for `profile` and `authority`, `mapping` for `mapping`, `representation` for `loss`, and `target` for `generated-api` and `protobuf-reservation`.
- If an input the table needs is absent — no profile documents, no mapping documents, no reservation registry — then the diff SHALL omit that family rather than classifying it, and SHALL name the omitted families in `requiredGates`.
- The diff SHALL set `oldFingerprint` and `newFingerprint` from `fingerprintIr` (FR-050) and `retainedBridges` from the bridges the new contract still declares.
- If the two documents have equal fingerprints, then the diff SHALL emit exactly one `documentation` change of disposition `patch` with the rationale that the contracts are identical, because the report schema requires a non-empty `changes` array.

### Evolution

- `readIrAsContract(document, "1.0.0")` SHALL return the `1.0.0` projection of a `1.1.0` document: `contractVersion` `1.0.0`, `source.dialect` set to the `1.0.0` JSON Schema draft constant, and every `1.1.0`-only member — field `multiplicity` and `unit`, type `relationships`, `operations`, and `clauses` — removed and reported in `loss` as an identity list.
- `readIrAsContract(document, "1.1.0")` SHALL return the `1.1.0` projection of a `1.0.0` document: `contractVersion` `1.1.0`, `source.dialect` taken from the caller-declared frontend dialect, every field's `multiplicity` derived from its `presence`, and `loss` empty.
- Each projection SHALL validate against the published schema at its target version.
- The projections SHALL be idempotent within a version and SHALL round-trip a `1.0.0` document through `1.1.0` and back to byte-identical `1.0.0`.
- The published policy SHALL state that within contract major version 1 a revision may add optional members and may widen a closed vocabulary, SHALL NOT remove or retype a member, SHALL NOT narrow a vocabulary, and SHALL be discriminated by `contractVersion` in one schema file.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-051-CON-1 | The diff SHALL NOT classify a family from an input it was not given; an absent input is a named gap, never a `patch`. | Honesty | Test |
| FR-051-CON-2 | The disposition rank SHALL be exactly `patch < additive < conditional < unknown < breaking < invalid`, matching the ranking already asserted by the issue #9 contract tests. | Consistency | Test |
| FR-051-CON-3 | A forward projection SHALL report every dropped identity; silently dropping a `1.1.0` member is a defect, not a projection. | Honesty | Test |
| FR-051-CON-4 | The diff SHALL NOT read a target backend; per-target dispositions are an input. | Portability | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-051-AC-1 | Every case in `fixtures/semantic/v1/compatibility/cases.json` is reproduced by a constructed input pair whose diff yields the case's `expected` disposition. | Test |
| FR-051-AC-2 | Every family the report schema declares is produced by at least one such case, and every case family maps to a declared report family through the documented table. | Test |
| FR-051-AC-3 | The `target-disagreement` case yields the most restrictive of its `targetResults`. | Test |
| FR-051-AC-4 | A diff run with no profile, mapping, or reservation inputs omits the `profile`, `authority`, `mapping`, and `protobuf-reservation` families and names them in `requiredGates`. | Test |
| FR-051-AC-5 | Every produced report validates against `compatibility-report.schema.json`. | Test |
| FR-051-AC-6 | Diffing a document against itself yields one `patch` change and an `additive`-free, `breaking`-free aggregate of `patch`. | Test |
| FR-051-AC-7 | The forward projection of `fixtures/semantic/v1/positive/semantic-ir-v1-1.json` equals the committed golden byte for byte, and its `loss` lists every dropped identity. | Test |
| FR-051-AC-8 | The backward projection of a `1.0.0` document equals the committed golden byte for byte and reports empty `loss`. | Test |
| FR-051-AC-9 | A `1.0.0` document projected to `1.1.0` and back is byte-identical to the original. | Property |
| FR-051-AC-10 | Both projections validate against the published schema at their target `contractVersion`. | Test |
| FR-051-AC-11 | Two runs of the diff over the same inputs produce byte-identical reports. | Test |
| FR-051-AC-12 | The published policy document states the four evolution rules, and a test fails when the document and the implemented ranking disagree. | Test |

## Dependencies

- **Upstream**: [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [NFR-013](../non-functional/NFR-013-additive-semantic-ir-revision.md)
- **Downstream**: [FR-052](./FR-052-provide-the-compiler-command-line.md), issue #11 publication
