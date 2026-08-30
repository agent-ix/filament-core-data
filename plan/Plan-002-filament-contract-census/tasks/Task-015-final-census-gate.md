---
id: Task-015
title: "Reproducibility and read-only gate"
type: Task
status: done
track: Gate
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-014"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-004"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-005"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-078"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-079"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-080"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-081"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-082"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-083"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-084"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-085"
    type: verifies
---
# Task-015: Reproducibility and read-only gate

## Scope

Run the complete matrix, schema/determinism/source-locus validators, Quire gates,
repository/diff/release inspections, code review, and gap analysis; update the
plan and matrix only when retained evidence passes.

## Subtasks

- [x] Run all project tests and audit-only contract cases twice against unchanged evidence.
- [x] Validate Quire requirements, reviews, and plan artifacts.
- [x] Confirm zero examined-external-repository mutations and classify every local changed path.
- [x] Confirm zero publication, catalog, enforcement, database, corpus, or runtime change.
- [x] Complete code review and requirement-to-test-to-evidence gap analysis.

## Deliverables

- `audit/filament-contract-census/validation.json`
- Updated Test Matrix, plan/task status, and log
- Final code-review and gap-analysis SpecReview artifacts

## Notes

- Any failed gate returns the owning task to `in_progress`; it never weakens the criterion.
- Passing this task accepts the census evidence only, not any migration recommendation.
