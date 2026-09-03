---
id: Task-032
title: "Cross-contract conformance and assurance"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-028"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-029"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-031"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-177"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-178"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-181"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-182"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-183"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-185"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-186"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-187"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-188"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-189"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-190"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-191"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-192"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-193"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-194"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-196"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-197"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-202"
    type: verifies
---
# Task-032: Cross-contract conformance and assurance

## Scope

Join every contract family through deterministic, offline, cross-target,
hostile-input, independent-reader, unchanged-suite, and non-publication evidence.

## Subtasks

- [x] Run two isolated canonicalization/validation passes under varied environment and compare all retained outputs.
- [x] Execute shared positive, negative, recursive, extension, compatibility, and legacy fixtures through independent validators.
- [x] Exercise path traversal, symlink, remote reference, payload execution, oversized graph, cycle, and diagnostic-volume cases within declared limits.
- [x] Inventory every public schema/example pair and all executable test dependencies and security dispositions.
- [x] Run existing suites unchanged and inspect package/publication/catalog state.
- [x] Run code review and gap analysis over exact TC-130..202 trace tags.

## Deliverables

- Green contract and conformance suite with retained evidence.
- Code-review and gap-analysis artifacts.
- Final non-disruption diff and publication report.

## Notes

- This task may not mark TC-199 complete.
- A test-only independent reader cannot become a production compiler by implication.
