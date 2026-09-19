---
id: FR-051
title: "Diff two semantic contracts into a compatibility report"
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
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
---
# [FR-051] Diff two semantic contracts into a compatibility report

## Description

The compiler SHALL classify the difference between two semantic contracts into a
compatibility report, so that a revision's disposition is computed from the
artefacts rather than asserted in a pull-request description.

## Inputs

- Two semantic IR documents, old and new
- Optionally the old and new selected profile documents and their mapping documents, each valid against its published schema
- Optionally the identities each mapping is observed to drop, which no mapping document carries and which therefore arrives as its own input
- Optionally the old and new Protobuf field-number reservation registries
- Optionally consumer policy documents valid against `schema/semantic/v1/consumer-policy.schema.json`, and a `consumerEvidenceStatus` of `current`, `stale`, or `unknown`
- Optionally per-target dispositions supplied by a qualified backend
- Optionally the retained legacy bridges the new contract declares (FR-026)

## Outputs

- `src/compiler/compat/diff.mjs`: `diffSemanticContract(request)` returning a document valid against `schema/semantic/v1/compatibility-report.schema.json`
- `src/compiler/compat/family-map.json`: the observed-change family to report family map, as data, and `src/compiler/family-map.mjs`, the one module that reads it — outside `compat/`, because no module under that directory may touch `node:fs`
- `test/fixtures/compiler/compatibility/cases/**`: one constructed input pair per case of `fixtures/semantic/v1/compatibility/cases.json`, which remains the read-only case index

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
| A type's `supertypes` changed | `type` | `semantic` | `breaking` |
| A type's `abstract` flag set; cleared | `type` | `semantic` | `breaking`; `additive` |
| A field's `subsets` changed | `field` | `semantic` | `breaking` |
| A field's `redefines` target changed | `field` | `semantic` | `breaking` |
| An operation's `frame` changed | `type` | `semantic` | `breaking` (classified with the owning operation; FR-013/FR-051 leave the frame's own body encoding and grant-range semantics to QSpec #101/#106) |
| A population added; removed; its `kind`, `members` or `extent` changed | `type` | `semantic` | `additive`; `breaking`; `breaking` |
| A construct table entry added; removed; its `identity`, `shape`, `members`, `rules`, `references`, `immutable` or `meaning` changed | `type` | `semantic` | `additive`; `breaking`; `breaking` |
| Generated name changed with no semantic identity change | `generated-api` | `target` | `patch` |
| Profile `allowedOmissions` gained an identity | `profile` | `profile` | `breaking` |
| Profile `authority` changed with an unchanged structural shape | `authority` | `profile` | `breaking` |
| Mapping `editDirection` changed | `mapping` | `mapping` | `conditional` |
| An observed dropped identity absent from that mapping's `omittedIdentities` | `loss` | `representation` | `breaking` |
| A reserved Protobuf field name or number reused | `protobuf-reservation` | `target` | `invalid` |
| Any change whose consumer evidence is `unknown` | the observed family | its surface | `unknown` |

- `src/compiler/compat/family-map.json` SHALL carry that observed-family to report-family map as data, and the implementation SHALL read it rather than restating it.
- The map SHALL live under `src/compiler/`, which `package.json` `files` ships, rather than under a fixture tree it does not, so an installed package can open it.
- If an input the table needs is absent — no profile documents, no mapping documents, no reservation registry, no per-target dispositions — then the diff SHALL omit the families that need it rather than classifying them, and SHALL name each omitted family in `requiredGates`.
- The diff SHALL set `oldFingerprint` and `newFingerprint` from `fingerprintIr` (FR-050) and `retainedBridges` from the bridges the caller declares the new contract still carries.
- If the two documents have equal fingerprints, then the diff SHALL emit exactly one `documentation` change of disposition `patch`, identified by the new document's `source.identity`, because the report schema requires a non-empty `changes` array.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-051-CON-1 | The diff SHALL NOT classify a family from an input it was not given; an absent input is a named gap, never a `patch`. | Honesty | Test |
| FR-051-CON-2 | The disposition rank SHALL be exactly `patch < additive < conditional < unknown < breaking < invalid`, matching the ranking already asserted by the issue #9 contract tests. | Consistency | Test |
| FR-051-CON-4 | The diff SHALL NOT import a target backend; per-target dispositions are an input. | Portability | Static analysis |
| FR-051-CON-5 | `fixtures/semantic/v1/compatibility/cases.json` SHALL remain byte-unchanged; it is the read-only case index, and the constructed pairs live under `test/fixtures/compiler/compatibility/cases/**`. | Non-disruption | Branch diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-051-AC-1 | Every case in `fixtures/semantic/v1/compatibility/cases.json` is reproduced by a constructed input pair whose diff yields the case's `expected` disposition. | Test |
| FR-051-AC-2 | Every family the report schema declares is produced by at least one such case, and every observed family in the case index maps to a declared report family through `family-map.json`, which the implementation reads. | Test |
| FR-051-AC-3 | The `target-disagreement` case yields the most restrictive of its `targetResults`. | Test |
| FR-051-AC-4 | A diff run with no profile, mapping, reservation, or target-result inputs omits the `profile`, `authority`, `mapping`, `protobuf-reservation`, and `generated-api` families and names them in `requiredGates`. | Test |
| FR-051-AC-5 | Every produced report validates against `compatibility-report.schema.json`. | Test |
| FR-051-AC-6 | Diffing a document against itself yields one `patch` change identified by `source.identity` and an aggregate of `patch`. | Test |
| FR-051-AC-11 | Two runs of the diff over the same inputs produce byte-identical reports. | Snapshot |
| FR-051-AC-15 | A revision that removes a member, retypes a member, or narrows a closed vocabulary is classified `breaking`; one that adds an optional member or widens a vocabulary is not. | Test |
| FR-051-AC-16 | A revision changing a type's `supertypes` (added or removed), a field's `subsets`, or a field's `redefines` target is classified `breaking`; one setting `abstract` is `breaking` and one clearing it is `additive`; a population or construct table entry added is `additive`, and one removed or changed is `breaking`; an operation's `frame` changed is classified `breaking`, with the owning operation (`type`), not as a family of its own. | Test (TC-1804) |
| FR-051-AC-17 | A construct table entry whose `identity`, `shape`, `members`, `rules`, `references`, or `immutable` changed, with `meaning` unchanged, is classified `breaking`; it is never absorbed into the document's own "equal fingerprints" `patch`. | Test (TC-1804) |

## Dependencies

- **Upstream**: [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-026](./FR-026-preserve-dynamic-and-legacy-boundaries.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Downstream**: [FR-052](./FR-052-provide-the-compiler-command-line.md), issue #11 publication
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md)
