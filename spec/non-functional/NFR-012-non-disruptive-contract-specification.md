---
id: NFR-012
title: "Non-disruptive semantic contract specification"
type: NFR
quality_attribute: compatibility
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "constrains"
---
# [NFR-012] Non-disruptive semantic contract specification

## Statement

Issue #9 SHALL define and validate the semantic IR, package, mapping, profile,
compatibility, and target contracts without changing runtime schemas, current
generated packages, consumers, databases, Quire/Quoin behavior, publication,
catalog pins, or enforcement.

## Scope

- Permitted: requirements, normative contract documents and schemas, examples, conformance fixtures, tests, reviews, and plans owned by issue #9.
- Prohibited: compiler production code, registry publication, source-of-truth cutover, schema enforcement, consumer adoption, data migration, and legacy retirement.

## Rationale

This specification is the shared dependency for many active repositories. A
contract review must not smuggle in a partial migration or invalidate feature
work before consumers can assess it.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Runtime/source consumer files changed by issue #9 | 0 | 0 | Changed-path gate |
| Current Avro or module fixtures invalidated | 0 | 0 | Existing-suite comparison |
| Packages published or catalog pins changed | 0 | 0 | Registry and diff inspection |
| Downstream gates bypassed | 0 | 0 | Plan and review inspection |

## Verification

Compare the issue branch with its base, run all existing tests unchanged, validate
new contract fixtures separately, and inspect package registries, catalog pins,
database files, and downstream repositories for zero mutation.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-012-AC-1 | The owner records the v1 structural-source decision (TypeSpec, ADR-0005) before the issue #9 normative contract merges. | Inspection |
| NFR-012-AC-2 | Compiler, publication, enforcement, database, consumer-migration, and retirement work remains in separately gated tickets. | Inspection |

## Dependencies

- **Upstream**: issue #4 feasibility evidence, issues #8/#10 architecture and census
- **Downstream**: every compiler, package, migration, publication, enforcement, and retirement ticket
