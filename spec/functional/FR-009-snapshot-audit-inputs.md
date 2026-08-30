---
id: FR-009
title: "Snapshot contract-audit inputs"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/contract-census.test.ts"
  - kind: log
    ref: "audit/filament-contract-census/snapshot.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-003"
    type: "implements"
---
# [FR-009] Snapshot contract-audit inputs

## Description

When contract evidence collection begins, the audit SHALL record a timestamped,
revision-pinned snapshot of every in-scope repository, governed corpus, relevant
package, active worktree, project dependency, and in-flight contract branch.

## Inputs

- Project 17 and Project 18 program relationships
- Local and remote repository metadata
- Governed Quire corpus revision and catalog/module pins
- Open branches, pull requests, and issues that can change contract surfaces

## Outputs

- Machine-readable audit snapshot
- Human-readable snapshot summary
- Explicit unavailable, dirty, stale, and unpinned observations

## Behavior

- The audit SHALL record repository identity, canonical URL, local path, default
  branch, inspected branch, immutable HEAD, dirty state, and worktree inventory.
- The audit SHALL identify in-flight DTO, persistence, extraction, schema, and API
  work from current project and pull-request evidence.
- The audit SHALL record the collection method, tool or API version, access
  result, and pagination completeness for each volatile external source.
- If an input cannot be pinned or inspected, then the audit SHALL retain the
  attempted source, failure reason, consequence, and confidence reduction.
- If a required API result is paginated, capped, rate-limited, or access-denied,
  then the audit SHALL enumerate every page or mark the source incomplete with
  its access failure, coverage consequence, and confidence reduction.
- Immediately before review sign-off, the audit SHALL refresh volatile branch,
  board, pull-request, and corpus facts and record any drift from the collection
  snapshot.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-009-AC-1 | Every in-scope repository has canonical URL, local availability, inspected branch, immutable HEAD, dirty state, and worktree disposition. | Test (TC-054) |
| FR-009-AC-2 | The governed corpus revision and every catalog or module pin used by the audit are recorded. | Test (TC-055) |
| FR-009-AC-3 | In-flight contract work includes current issue or pull-request evidence and affected contract families. | Analysis (TC-056) |
| FR-009-AC-4 | Every unavailable, dirty, stale, or unpinned input has an explicit consequence and confidence disposition. | Test (TC-057) |
| FR-009-AC-5 | A pre-sign-off refresh records drift or an explicit no-drift result for volatile facts. | Test (TC-058) |
| FR-009-AC-6 | Every volatile external collection records its method, version, access result, and complete-enumeration status; incomplete collections cannot appear complete. | Test (TC-088) |

## Dependencies

- **Upstream**: [US-003](../usecase/US-003-assess-contract-fit.md), `agent-ix/quire-rs#385`
- **Downstream**: [FR-010](./FR-010-inventory-filament-contracts.md), [FR-013](./FR-013-publish-contract-census-review.md)
