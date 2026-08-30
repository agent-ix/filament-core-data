---
id: FR-001
title: "Indexed architecture record with explicit status"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/semantic-architecture.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-002"
    type: "implements"
---
# [FR-001] Indexed architecture record with explicit status

## Description

The architecture record SHALL expose one root index that links every architecture
document, ADR, corpus-review method, feasibility decision, and program-roadmap
artifact while identifying each artifact as normative, provisional, informative,
or historical.

## Behavior

- The record SHALL identify the current artifact for every covered topic.
- When an artifact is superseded, the record SHALL link the successor.
- When an artifact is superseded, the record SHALL retain the historical artifact
  with a non-normative status.
- When a provisional artifact names an evidence gate, the record SHALL link the
  ticket or review that resolves the gate.
- The supersession graph SHALL be acyclic.
- The supersession graph SHALL resolve every historical artifact to at most one
  current successor.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-001-CON-1 | The record SHALL be reviewable without access to prior chat transcripts. | Usability | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-001-AC-1 | One root index links every required architecture document and ADR. | Test (TC-001) |
| FR-001-AC-2 | Every indexed artifact has exactly one current status from normative, provisional, informative, or historical. | Test (TC-002) |
| FR-001-AC-3 | Every provisional artifact names and links its resolution gate. | Inspection (TC-003) |
| FR-001-AC-4 | A superseded-decision fixture retains the historical record and resolves to one current successor. | Test (TC-004) |
| FR-001-AC-5 | A cyclic supersession fixture fails validation instead of looping or selecting an arbitrary current decision. | Test (TC-053) |

## Dependencies

- **Upstream**: [US-002](../usecase/US-002-plan-safe-adoption.md)
- **Downstream**: every other architecture-record requirement in this bundle
