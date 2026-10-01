---
id: FR-006
title: Snapshot Entity
object: entity
type: FR
traces:
  - US-002
status: IMPLEMENTED
---

# FR-006: Snapshot Entity

## Description
The service SHALL define a `Snapshot` table with the following columns:

## Properties
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | primary key |
| `sequence` | int | required |
| `payload` | Dict[str, Any] | JSON column |
| `created_at` | datetime | defaults to now |
## Dependencies

- [FR-005](./FR-005-snapshot-group-entity.md) (SnapshotGroup) — parent entity

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-006-AC-1 | Versions are immutable once created | Test |
