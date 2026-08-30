---
id: Task-001
title: "Architecture contract tests"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-003"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-001"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-002"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-003"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-004"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-038"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-039"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-040"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-045"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-053"
    type: verifies
---
# Task-001: Architecture contract tests

## Scope

Add a Vitest suite that defines the required artifact manifest, parses document
status/gate metadata, checks internal links and forbidden paths, and exercises
positive and negative supersession fixtures before the architecture files exist.

## Subtasks

- [x] Define the expected document and ADR inventory as test data.
- [x] Add helpers for frontmatter/status extraction and repository-relative link validation.
- [x] Add invalid fixtures for missing/multiple status, missing provisional gate, ambiguous successor, and supersession cycle.
- [x] Add a changed-path allowlist that rejects runtime and generated source changes.
- [x] Run the suite and retain the expected red baseline before authoring documents.

## Deliverables

- `test/semantic-architecture.test.ts`
- `test/fixtures/semantic-architecture/` negative fixtures if inline fixtures are insufficient
- Recorded failing TDD baseline followed by passing evidence in Task-008

## Notes

- Do not modify the existing Avro generation test.
- This task unblocks every architecture-document task.
