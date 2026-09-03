---
id: Task-040
title: "Second reader and round-trip gate"
type: Task
status: in_progress
track: Gate
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-039"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-232"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-233"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-247"
    type: verifies
---
# Task-040: Second reader and round-trip gate

## Scope

Close the slice: prove two independent readers agree on every v1.1 fixture, prove the normalized round-trip over generated documents, and prove the fixture inventory is complete.

## Subtasks

- [x] Implement a test-only Python reader under `tests/` (pytest) using `jsonschema` from the poetry dev group plus the FR-027..030 cross-field rules; run it over every golden and negative fixture and compare verdicts with the Vitest reader (TC-232).
- [x] Add a generator for `1.1.0` documents covering all five node kinds and a property test that normalized serialization round-trips byte-identically (TC-233).
- [x] Add a static inventory check: every new node kind has at least one golden and one negative fixture (TC-247).
- [x] Re-run the Task-034 baselines: spike byte-identical, v1 fixture hashes unchanged, changed-path guard green.
- [ ] Run `/code-review` and `/gap-analysis`; resolve findings; comment "mergeable" on the PR.

## Deliverables

- Python second reader (test scope).
- Round-trip property and generator.
- Gap-analysis and code-review SpecReviews under `reviews/`.

## Notes

- FR-020-AC-7/AC-8 verify what Tasks 036..038 define, so this gate follows them (SR-030 FND-070).
- The Python reader adds no runtime dependency to the published package.
