---
id: Task-010
title: "Pinned source and active-work snapshot"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-009"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-009"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-054"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-055"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-056"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-057"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-058"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-088"
    type: verifies
---
# Task-010: Pinned source and active-work snapshot

## Scope

Capture the complete repository, worktree, branch, governed corpus, catalog pin,
package, GitHub access, and active contract-work baseline without changing any
examined source.

## Subtasks

- [x] Enumerate in-scope repositories and canonical remotes.
- [x] Record branches, immutable HEADs, dirty state, and every worktree.
- [x] Pin quire-corpus and Quoin module/catalog inputs.
- [x] Record current issues/PRs affecting DTO, persistence, extraction, schema, and API surfaces.
- [x] Record collection commands, versions, access results, pagination completeness, and limitations.

## Deliverables

- `audit/filament-contract-census/snapshot.json`
- `audit/filament-contract-census/snapshot.md`

## Notes

- Preserve dirty repositories exactly as found.
- The sign-off refresh is a separate Task-014 observation.
