---
id: Task-014
title: "Census review and drift refresh"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-010"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-012"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-013"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-073"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-058"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-074"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-075"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-076"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-077"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-086"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-087"
    type: verifies
---
# Task-014: Census review and drift refresh

## Scope

Refresh volatile branch, board, pull-request, access, and corpus facts; invalidate
or refresh affected evidence; then publish the source-cited issue #10 SpecReview
and its unresolved gate register.

## Subtasks

- [x] Capture a separate sign-off refresh and compare it with the initial snapshot.
- [x] Refresh or invalidate every contract-affecting drifted record.
- [x] Link all inventory, parity, conflict, missing-contract, impact, and validation artifacts.
- [x] Disposition each issue acceptance criterion with evidence.
- [x] Demonstrate one repeated concept and one unconfirmed consumer end to end.

## Deliverables

- `audit/filament-contract-census/signoff-refresh.json`
- `reviews/2026-08-29-filament-contract-census.md`

## Notes

- A drifted source can yield a partial review, but never a false ready disposition.
- All implementation, migration, publication, enforcement, and retirement gates remain named and closed.
