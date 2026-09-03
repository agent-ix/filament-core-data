---
id: FR-007
title: "Compatibility, feasibility, review, and program gates"
type: FR
verification_method: inspection
evidence:
  - kind: inspection_checklist
    ref: "spec/reviews/risk-complexity.md"
  - kind: test_case
    ref: "test/semantic-architecture.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-002"
    type: "implements"
---
# [FR-007] Compatibility, feasibility, review, and program gates

## Description

The architecture record SHALL define compatibility rules, the TypeSpec
feasibility decision, corpus-review method, migration waves, and human promotion
gates that later tickets must satisfy before disruptive changes merge.

## Behavior

- The compatibility policy SHALL classify patch, additive, and breaking changes
  across all generated targets.
- Until the owner records the decision, the TypeSpec decision SHALL remain
  provisional.
- The corpus-review method SHALL require machine-readable inventories,
  evidence-backed findings, type-fit dispositions, and repo impact bands.
- The roadmap SHALL order readers before writers and additive migrations before
  destructive cleanup.
- The program roadmap SHALL name an explicit human go-or-hold gate for every
  enforcement, database, package-publication, and legacy-retirement step.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-007-CON-1 | Until its known consumers pass cutover, the compatibility policy SHALL preserve Avro as a compatibility representation. | Compatibility | Inspection |
| FR-007-CON-2 | A high corpus failure rate SHALL pause promotion rather than automatically weaken the contract. | Safety | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-007-AC-1 | Compatibility rules cover required fields, removals, renames, enums, unknown fields, and Protobuf reservations. | Inspection (TC-025) |
| FR-007-AC-2 | The TypeSpec pass/fail criteria are explicit and the recorded decision (ADR-0005) cites them. | Inspection (TC-026) |
| FR-007-AC-3 | The review method accounts for every canonical repo, declared type, and repeated contract family in scope. | Analysis (TC-027) |
| FR-007-AC-4 | The roadmap contains compatibility, advisory, database rollback, publication, and final cutover gates. | Inspection (TC-028) |

## Dependencies

- **Upstream**: [US-002](../usecase/US-002-plan-safe-adoption.md)
- **Downstream**: all feasibility, audit, compiler, publication, and migration tickets
