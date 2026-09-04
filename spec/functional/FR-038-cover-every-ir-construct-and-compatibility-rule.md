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
that register.

## Inputs

- The IR v1.1 node set: envelope, identity, structural kind, field presence and nullability, defaults, units, constraints, discriminated unions, recursion, relationships, operations, clauses, provenance, unknown policy, package and lock binding, contract version
- The compatibility dispositions of FR-025 and `compatibility-report.schema.json`
- The issue #19 acceptance criteria: invalid imports, cycles, unknown mappings, duplicate identities, stale locks, unsupported loss, recursion, discriminators, nullability versus optionality, version transitions, provenance, and source loci

## Outputs

- `conformance/corpus.json` `constructRegister[]`: one row per construct or rule, each with `id`, `title`, `family`, the contract `sources` it is read from, and the issue #19 acceptance criterion it exercises
- The case files that satisfy the register

## Behavior

- The corpus SHALL declare the register families `envelope`, `identity`, `kind`, `field-presence`, `field-default`, `unit`, `constraint`, `union`, `recursion`, `relationship`, `operation`, `clause`, `provenance`, `unknown`, `package`, `version`, and `compatibility`.
- The corpus SHALL carry, for every register row, at least one case of each of the classes `positive`, `negative`, `boundary`, and `evolution`.
- A `positive` case SHALL exercise the construct in its accepted form.
- A `negative` case SHALL violate exactly one contract rule about the construct.
- A `boundary` case SHALL sit on a declared limit of the construct.
- An `evolution` case SHALL change the construct across a contract or package version transition.
- The corpus SHALL carry a `negative` case for each of: an import naming a package the lock does not resolve; a package-graph cycle; a mapping naming an identity no type declares; a duplicate semantic identity; a lock whose `manifestDigest` no longer matches the manifest; and an omitted identity that the profile does not declare as loss.
- The corpus SHALL carry cases in which nullability and optionality vary independently across all four combinations of `presence` and `nullable`, so that neither can be inferred from the other.
- The corpus SHALL carry a `negative` case in which a discriminated union declares a variant whose `payloadType` no type declares, and a `positive` case in which two variants share one payload type.
- The corpus SHALL carry cases for direct recursion, mutual recursion through two records, an alias cycle, and a composite relationship cycle.
- The corpus SHALL distinguish a preserved recursive type graph from a rejected package cycle by diagnostic code.
- The corpus SHALL carry `evolution` cases for a `1.0.0` document read under `1.1.0` rules, a `1.1.0` document carrying a node `1.0.0` has no reader for, and a package version transition that adds and removes an export.
- The corpus SHALL carry a `defect` register section in which each row names a defect discovered in an implementation, its owning issue, and the case that reproduces it.
- The corpus SHALL carry the reproducing case that every `defect` register row names.
- The corpus SHALL record, for every register row, whether its expectation is decided by the schema, by the oracle's cross-field rules, or by the oracle's compatibility classification.
- If a register row has fewer than four classes of case, then the coverage gate SHALL fail and name the row and the missing classes.
- The corpus SHALL NOT derive a register row from an implementation's feature list.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-038-CON-1 | Every register row SHALL name at least one `source` that resolves to an existing path under `schema/semantic/v1/` or `docs/semantic-data-system/`. | Traceability | Test |
| FR-038-CON-2 | Every issue #19 acceptance criterion listed in the register SHALL be covered by at least one case. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-038-AC-1 | Every construct-register row carries at least one `positive`, one `negative`, one `boundary`, and one `evolution` case; removing any case fails the gate and names the row and class. | Test |
| FR-038-AC-2 | The corpus carries a passing negative case for each of invalid import, package cycle, unknown mapping, duplicate identity, stale lock, and undeclared loss, each with an exact source locus. | Test |
| FR-038-AC-3 | Four cases realize the four `presence` × `nullable` combinations and the oracle distinguishes all four normalized forms. | Test |
| FR-038-AC-4 | Direct recursion and mutual recursion are accepted, an alias cycle and a composite relationship cycle are rejected, and a package cycle is rejected with a different diagnostic code from a recursive type graph. | Test |
| FR-038-AC-5 | The `defect` register reproduces every prototype-emitter divergence recorded for this issue, and each such case fails against a document that carries the divergence. | Test |
| FR-038-AC-6 | Every register row declares its deciding layer (`schema`, `cross-field`, or `compatibility`), and the oracle's decision for each row's cases comes from that layer. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md)
- **Downstream**: [FR-039](./FR-039-account-for-corpus-coverage-and-import.md), issue #19
