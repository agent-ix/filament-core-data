---
id: Task-013
title: "Repository and concept impact"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-011"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-012"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-012"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-069"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-070"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-071"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-072"
    type: verifies
---
# Task-013: Repository and concept impact

## Scope

Assess every repository and concept family for effort, risk, dependencies,
migration wave, confidence, affected systems, compatibility controls, named
gates, and overlap with active work.

## Subtasks

- [x] Score repository and concept-family effort/risk/dependency/wave/confidence.
- [x] Name affected producers, consumers, storage, wire, and generated-package surfaces.
- [x] Attach controls and implementation gates to every disruptive disposition.
- [x] Record active issues/PRs and sequencing consequences.
- [x] Label all outputs recommendations, never approvals.

## Deliverables

- `audit/filament-contract-census/impact.json`
- `audit/filament-contract-census/impact.md`

## Notes

- A high-risk or XL record is evidence for later decomposition, not authority to start it.
