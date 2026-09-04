---
id: FR-051
title: "Diff two semantic contracts and govern IR schema evolution"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-026"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
---
# [FR-051] Diff two semantic contracts and govern IR schema evolution

## Description

The compiler SHALL classify the difference between two semantic contracts into a
compatibility report, and SHALL project an IR document between contract versions
under one published policy, so that a revision's disposition is computed from the
artefacts rather than asserted in a pull-request description.

Classification and projection ship as one requirement because a cross-version
diff projects before it compares, both consume `normalizeIr`, and both are
governed by the one policy document this requirement publishes.

## Inputs

- Two semantic IR documents, old and new
- Optionally the old and new selected profile documents and their mapping documents
- Optionally the old and new Protobuf field-number reservation registries
- Optionally consumer policy documents valid against `schema/semantic/v1/consumer-policy.schema.json`, and a `consumerEvidenceStatus` of `current`, `stale`, or `unknown`
- Optionally per-target dispositions supplied by a qualified backend
- Optionally the retained legacy bridges the new contract declares (FR-026)

## Outputs

- `src/compiler/compat/diff.mjs`: `diffSemanticContract(request)` returning a document valid against `schema/semantic/v1/compatibility-report.schema.json`
- `src/compiler/compat/evolution.mjs`: `readIrAsContract(document, targetVersion, { dialect })` returning `{ document, loss, diagnostics }`
- `fixtures/compiler/compatibility/family-map.json`: the observed-change family to report family map, as data
- `fixtures/compiler/compatibility/cases/**`: one constructed input pair per case of `fixtures/semantic/v1/compatibility/cases.json`, which remains the read-only case index
- `fixtures/compiler/evolution/`: the golden backward and forward projections
- `docs/semantic-data-system/ir-compatibility-policy.md`: the published policy

## Behavior

### Classification

- The diff SHALL emit one change entry per differing identity, carrying `identity`, `family`, `surface`, `disposition`, `rationale`, `affectedConsumers`, and `targetResults`.
- Where a change has no owning node identity — a contract-version change, a constraint-vocabulary change, a kernel-scalar change — the diff SHALL use the new document's `source.identity` as the change identity, because the report schema requires one.
- The diff SHALL rank dispositions `patch` < `additive` < `conditional` < `unknown` < `breaking` < `invalid`, matching the ranking the issue #9 contract tests already assert.
- The diff SHALL set `aggregateDisposition` to the most restrictive entry disposition, and each entry's disposition to the most restrictive of its `targetResults` where any are supplied.
- The diff SHALL classify by this closed table, whose observed-change families are those of `fixtures/semantic/v1/compatibility/cases.json` and whose report families are those of `compatibility-report.schema.json`:

| Observed change | Report `family` | `surface` | Disposition |
|---|---|---|---|
| Documentation or rationale only, no semantic value changed | `documentation` | `semantic` | `patch` |
| Optional field added, every consumer preserves or surfaces unknowns, evidence current | `field` | `semantic` | `additive` |
| Optional field added, consumer evidence stale | `field` | `semantic` | `conditional` |
| Required field added or any field removed | `field` | `semantic` | `breaking` |
| Stable identity changed | `identity` | `semantic` | `breaking` |
| Scalar domain widened | `type` | `semantic` | `conditional` |
| Union variant removed | `union` | `semantic` | `breaking` |
| Constraint operand corrected with no semantic value change | `constraint` | `semantic` | `patch` |
| Enum member added, consumer policy `reject` | `enum` | `semantic` | `breaking` |
| Enum member added, consumer policy `surface` or `preserve` | `enum` | `semantic` | `additive` |
| `unknownPolicy` tightened toward `reject` | `unknown-policy` | `semantic` | `breaking` |
| Multiplicity widened; narrowed; `ordered` or `unique` flipped | `field` | `semantic` | `additive`; `breaking`; `breaking` |
| `unit` changed | `field` | `semantic` | `breaking` |
| Relationship added; removed; retargeted; `composite` flipped | `type` | `semantic` | `additive`; `breaking`; `breaking`; `breaking` |
| Operation added; `returns` changed | `type` | `semantic` | `additive`; `breaking` |
| Clause added; removed; `language` changed | `type` | `semantic` | `additive`; `breaking`; `breaking` |
| Constraint keyword added to the vocabulary; removed; operands retyped | `constraint` | `semantic` | `additive`; `breaking`; `breaking` |
| Kernel scalar member added; removed; re-represented | `type` | `semantic` | `additive`; `breaking`; `breaking` |
| `contractVersion` `1.0.0` to `1.1.0` adding only the declared nodes | `generated-api` | `target` | `additive` |
| Generated name changed with no semantic identity change | `generated-api` | `target` | `patch` |
| Profile `allowedOmissions` gained an identity | `profile` | `profile` | `breaking` |
| Profile `authority` changed with an unchanged structural shape | `authority` | `profile` | `breaking` |
| Mapping `editDirection` changed | `mapping` | `mapping` | `conditional` |
| Loss present in the new contract and not in `omittedIdentities` | `loss` | `representation` | `breaking` |
| A reserved Protobuf field name or number reused | `protobuf-reservation` | `target` | `invalid` |
| Any change whose consumer evidence is `unknown` | the observed family | its surface | `unknown` |

- `fixtures/compiler/compatibility/family-map.json` SHALL carry that observed-family to report-family map as data, and the implementation SHALL read it rather than restating it.
- If an input the table needs is absent — no profile documents, no mapping documents, no reservation registry, no per-target dispositions — then the diff SHALL omit the families that need it rather than classifying them, and SHALL name each omitted family in `requiredGates`.
- The diff SHALL set `oldFingerprint` and `newFingerprint` from `fingerprintIr` (FR-050) and `retainedBridges` from the bridges the caller declares the new contract still carries.
- If the two documents have equal fingerprints, then the diff SHALL emit exactly one `documentation` change of disposition `patch`, identified by the new document's `source.identity`, because the report schema requires a non-empty `changes` array.

### Evolution

- `readIrAsContract(document, "1.0.0")` SHALL return the `1.0.0` projection of a `1.1.0` document: `contractVersion` `1.0.0`, `source.dialect` set to the `1.0.0` JSON Schema draft constant, and every `1.1.0`-only member — field `multiplicity` and `unit`, type `relationships`, `operations`, and `clauses` — removed and reported in `loss` as an identity list.
- `readIrAsContract(document, "1.1.0", { dialect })` SHALL return the `1.1.0` projection of a `1.0.0` document: `contractVersion` `1.1.0`, `source.dialect` set to `dialect`, every field's `multiplicity` derived from its `presence`, and `loss` empty.
- If the caller projects to `1.1.0` and declares no `dialect`, then `readIrAsContract` SHALL return a blocking `agent-ix.compiler.MISSING_TARGET_DIALECT` diagnostic and no document, because the schema forbids the `1.0.0` constant on a `1.1.0` document and the value cannot be derived.
- Where the target version equals the document's own, `readIrAsContract` SHALL return the document unchanged with empty `loss`.
- If the target version is outside `1.0.0` and `1.1.0`, then `readIrAsContract` SHALL return a blocking `agent-ix.compiler.UNKNOWN_CONTRACT_VERSION` diagnostic and no document.
- A projection SHALL carry `source.digest`, `package`, and every other envelope member verbatim, because a projection is a view of a compile's output and not a new compile.
- Each projection SHALL validate against the published schema at its target version.
- Within contract major version 1, the compiler SHALL accept a revision that adds an optional member or widens a closed vocabulary, and SHALL reject one that removes a member, retypes a member, or narrows a vocabulary, classifying each as `breaking`.
- The published policy SHALL state those four rules and the one-schema-file `contractVersion` discrimination that issue #34 already implemented, and SHALL cite it as the record rather than deciding it here.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-051-CON-1 | The diff SHALL NOT classify a family from an input it was not given; an absent input is a named gap, never a `patch`. | Honesty | Test |
| FR-051-CON-2 | The disposition rank SHALL be exactly `patch < additive < conditional < unknown < breaking < invalid`, matching the ranking already asserted by the issue #9 contract tests. | Consistency | Test |
| FR-051-CON-3 | A forward projection SHALL report every dropped identity; silently dropping a `1.1.0` member is a defect, not a projection. | Honesty | Test |
| FR-051-CON-4 | The diff SHALL NOT import a target backend; per-target dispositions are an input. | Portability | Static analysis |
| FR-051-CON-5 | `fixtures/semantic/v1/compatibility/cases.json` SHALL remain byte-unchanged; it is the read-only case index, and the constructed pairs live under `fixtures/compiler/compatibility/cases/**`. | Non-disruption | Branch diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-051-AC-1 | Every case in `fixtures/semantic/v1/compatibility/cases.json` is reproduced by a constructed input pair whose diff yields the case's `expected` disposition. | Test |
| FR-051-AC-2 | Every family the report schema declares is produced by at least one such case, and every observed family in the case index maps to a declared report family through `family-map.json`, which the implementation reads. | Test |
| FR-051-AC-3 | The `target-disagreement` case yields the most restrictive of its `targetResults`. | Test |
| FR-051-AC-4 | A diff run with no profile, mapping, reservation, or target-result inputs omits the `profile`, `authority`, `mapping`, `protobuf-reservation`, and `generated-api` families and names them in `requiredGates`. | Test |
| FR-051-AC-5 | Every produced report validates against `compatibility-report.schema.json`. | Test |
| FR-051-AC-6 | Diffing a document against itself yields one `patch` change identified by `source.identity` and an aggregate of `patch`. | Test |
| FR-051-AC-7 | The forward projection of `fixtures/semantic/v1/positive/semantic-ir-v1-1.json` equals the committed golden byte for byte, and its `loss` lists every dropped identity. | Snapshot |
| FR-051-AC-8 | The backward projection of a `1.0.0` document with a declared dialect equals the committed golden byte for byte and reports empty loss. | Snapshot |
| FR-051-AC-9 | A `1.0.0` document projected to `1.1.0` and back is byte-identical to the original. | Property |
| FR-051-AC-10 | Both projections validate against the published schema at their target `contractVersion`. | Test |
| FR-051-AC-11 | Two runs of the diff over the same inputs produce byte-identical reports. | Snapshot |
| FR-051-AC-12 | The published policy document states the four evolution rules, and a test fails when the document and the implemented ranking disagree. | Test |
| FR-051-AC-13 | Projecting to `1.1.0` with no dialect yields `MISSING_TARGET_DIALECT` and no document; projecting to `2.0.0` yields `UNKNOWN_CONTRACT_VERSION`; projecting to the document's own version returns it unchanged. | Test |
| FR-051-AC-14 | A projection carries `source.digest` and the `package` block verbatim from the input. | Test |
| FR-051-AC-15 | A revision that removes a member, retypes a member, or narrows a closed vocabulary is classified `breaking`; one that adds an optional member or widens a vocabulary is not. | Test |

## Dependencies

- **Upstream**: [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-026](./FR-026-preserve-dynamic-and-legacy-boundaries.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [NFR-013](../non-functional/NFR-013-additive-semantic-ir-revision.md)
- **Downstream**: [FR-052](./FR-052-provide-the-compiler-command-line.md), issue #11 publication
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md)
