---
id: FR-038
title: "Cover every IR construct and compatibility rule with four case classes"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: "depends_on"
---
# [FR-038] Cover every IR construct and compatibility rule with four case classes

## Description

The conformance corpus SHALL declare a construct register naming every IR
construct family and compatibility rule it verifies, and SHALL carry a
`positive`, a `negative`, a `boundary`, and an `evolution` case for every row of
that register, or a written justification for a class that row cannot carry.

## Inputs

- The IR node set of `semantic-ir.schema.json` and `common.schema.json`
- The package, lock, mapping, profile, and consumer-policy contracts of `schema/semantic/v1/`
- The compatibility dispositions of FR-025 and `compatibility-report.schema.json`
- The issue #19 acceptance criteria as they stand in the issue at the time the register row is authored: invalid imports, cycles, unknown mappings, duplicate identities, stale locks, unsupported loss, recursion, discriminators, nullability versus optionality, version transitions, provenance, and source loci

## Outputs

- `conformance/corpus.json` `constructRegister[]`: one row per construct or rule, each with `id`, `title`, `family`, the contract `sources` it is read from, its `decidedBy` layer, the criterion it exercises, and any `notApplicable` class with its justification
- `conformance/defects.json`: the defect register, one row per defect discovered in an implementation
- The case files that satisfy the register

## Behavior

- The corpus SHALL declare the register families `envelope`, `identity`, `scalar`, `alias`, `enum`, `sequence-map`, `union`, `reference`, `field-presence`, `field-default`, `unit`, `constraint`, `recursion`, `relationship`, `operation`, `clause`, `provenance`, `unknown`, `extension`, `package`, `version`, and `compatibility`.
- The corpus SHALL carry, for every register row, at least one case of each of the classes `positive`, `negative`, `boundary`, and `evolution`.
- The coverage gate SHALL accept a class a register row declares `notApplicable` with a written justification and a contract citation, where the construct carries no limit to sit on or admits no version transition.
- If a register row is missing a class that it does not declare `notApplicable`, then the coverage gate SHALL fail and name the row and the class.
- A `positive` case SHALL exercise the construct in its accepted form.
- A `negative` case SHALL violate exactly one contract rule about the construct.
- A `boundary` case SHALL sit on a declared limit of the construct.
- An `evolution` case SHALL change the construct across a contract or package version transition.
- The corpus SHALL carry a `negative` case for each of: an import naming a package the lock does not resolve; a lock package-graph cycle; a mapping naming an identity no declaration owns; a duplicate semantic identity; a `manifestDigest` the manifest no longer hashes to; and an entity-role type the manifest neither exports nor the profile declares an allowed omission.
- The corpus SHALL carry cases in which nullability and optionality vary independently across all four combinations of `presence` and `nullable`.
- The corpus SHALL carry a `negative` case in which a union declares a variant whose `payloadType` no type declares.
- The corpus SHALL carry a `positive` case in which two union variants share one payload type.
- The corpus SHALL carry cases for direct recursion, mutual recursion through two records, an alias cycle, and a composite relationship cycle.
- The corpus SHALL distinguish a preserved recursive type graph from a rejected package cycle by diagnostic code.
- The corpus SHALL carry an `evolution` case for a package version transition that adds one export and removes another.
- The corpus SHALL record, in `conformance/defects.json`, each defect discovered in an implementation with its owning issue, its `documentExpressible` flag, and either the case that reproduces it or the static check that detects it.
- The corpus SHALL carry the reproducing case that every `documentExpressible` defect row names.
- A defect row whose `documentExpressible` is `false` SHALL name the process property it concerns and the static check that detects it, so that a locale-dependent sort or a working-directory-dependent path is recorded rather than silently uncovered.
- The corpus SHALL record, for every register row, whether its expectation is decided by the schema layer, by the oracle's cross-field rules, or by the oracle's compatibility classification.
- The corpus SHALL record every construct the ticket names that the published IR has no node for — generic type parameters, renames, and deprecations — as a `contract-gaps.json` row rather than as a register row.
- The corpus SHALL NOT derive a register row from an implementation's feature list.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-038-CON-1 | Every register row SHALL name at least one `source` that resolves to an existing path under `schema/semantic/v1/`, `docs/semantic-data-system/`, or `fixtures/semantic/v1/`. | Traceability | Test |
| FR-038-CON-2 | Every issue #19 acceptance criterion the register lists SHALL be covered by at least one case, with the criterion quoted in the row so the register does not silently follow a re-specification. | Traceability | Test |
| FR-038-CON-3 | Cross-language generated-package serialization parity SHALL be recorded as an unmet register area owned by issues #21, #22, #23, and #11, because no generated package exists to serialize. | Completeness | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-038-AC-1 | Every construct-register row carries a `positive`, a `negative`, a `boundary`, and an `evolution` case, or declares that class `notApplicable` with a justification; removing a case fails the gate and names the row and the class. | Test |
| FR-038-AC-2 | The corpus carries a passing negative case for each of unresolved import, package cycle, unknown mapping, duplicate identity, stale manifest digest, and undeclared loss, each at an exact source locus. | Test |
| FR-038-AC-3 | Four cases realize the four `presence` by `nullable` combinations and the oracle distinguishes all four normalized forms. | Test |
| FR-038-AC-4 | Direct and mutual recursion are accepted, an alias cycle and a composite relationship cycle are rejected, and a package cycle carries a different diagnostic code from a recursive type graph. | Test |
| FR-038-AC-5 | Every `documentExpressible` defect row has a reproducing case that fails on a bundle carrying the defect, and every other defect row names the static check that detects it. | Test |
| FR-038-AC-6 | Every register row declares its deciding layer, and the layer that produced the oracle's diagnostics for that row's cases is the declared one. | Test |
| FR-038-AC-7 | A union variant whose `payloadType` no type declares is rejected at that variant's locus, and a union whose two variants share one payload type is accepted. | Test |
| FR-038-AC-8 | An export added and removed across a package version produces the result the register row states. | Test |
| FR-038-AC-9 | Every register row's `sources` resolve to existing paths, and every listed issue #19 criterion is quoted in its row and covered by a case. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: [FR-039](./FR-039-account-for-corpus-coverage-and-import.md), issue #19
