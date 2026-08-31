---
id: StR-001
title: "Durable semantic data governance"
type: StR
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "spec/reviews/integrity.md"
  - kind: test_case
    ref: "spec/tests.md#tc-033"
  - kind: test_case
    ref: "spec/tests.md#tc-086"
  - kind: test_case
    ref: "spec/tests.md#tc-129"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-001"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-002"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-003"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-004"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-005"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-006"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-007"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-009"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-010"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-011"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-012"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-013"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-008"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-014"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-015"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-016"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-017"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-018"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-019"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-020"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-021"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-022"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-023"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-024"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-025"
    type: "satisfied_by"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-026"
    type: "satisfied_by"
---
# [StR-001] Durable semantic data governance

## Stakeholder Need

Agent IX architecture maintainers require the semantic data program to preserve
one durable, reviewable account of data authority, ownership, representations,
compatibility, and unresolved decisions so that concurrent Filament, Quire, and
Quoin work can evolve without creating competing contracts or unsafe cutovers.

## Rationale

The ecosystem already represents overlapping concepts in Markdown, Avro,
Pydantic, Rust, TypeScript, JSON, and PostgreSQL. A major architectural change
without a durable record would force each repository to reconstruct decisions
from conversations and would make active feature work vulnerable to unnoticed
contract changes.

## Validation Criteria

| ID | Criteria | Validation |
|---|---|---|
| StR-001-VC-1 | Starting from the root index, a reader can identify concern-specific authority and ownership, decision status, conflict dispositions, and every disruptive adoption gate. | Demonstration |

## Stakeholders

- Agent IX architecture and platform maintainers.
- Quire and Quoin module maintainers.
- Filament service, CLI, IDE, frontend, and data maintainers.
- External projects consuming generated semantic packages.

## Context and Assumptions

Many repositories will continue feature work while this program proceeds. The
architecture record is therefore implemented before compiler or migration work
and cannot itself change runtime contracts.

## Stakeholder Constraints (Contextual)

The record must remain useful to humans and LLM agents, must avoid assuming one
universal wire format, and must preserve Quire's direct-Markdown and no-rendering
boundary.

## Dependencies

The need depends on the Project 17 and Project 18 program epics and informs every
later semantic compiler, module-package, and migration ticket.

## Priority and Risk (Informative)

Priority is P0 because later implementation decisions depend on this vocabulary.
Risk is architectural divergence and disruption of unrelated feature work if the
need is not met.

## Traceability

This need drives the architecture-record requirements in
[FR-001](../functional/FR-001-indexed-architecture-record.md) through
[FR-008](../functional/FR-008-decision-and-conflict-records.md), the census
requirements [FR-009](../functional/FR-009-snapshot-audit-inputs.md) through
[FR-013](../functional/FR-013-publish-contract-census-review.md), and the
feasibility requirements [FR-014](../functional/FR-014-pin-typespec-experiment.md)
through [FR-018](../functional/FR-018-resolve-structural-schema-source.md), and
the shared semantic-contract requirements
[FR-019](../functional/FR-019-select-v1-structural-source-and-ir.md) through
[FR-026](../functional/FR-026-preserve-dynamic-and-legacy-boundaries.md).
