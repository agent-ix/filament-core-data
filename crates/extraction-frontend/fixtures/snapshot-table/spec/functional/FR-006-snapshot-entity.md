---
id: FR-006
title: Snapshot Entity
object: entity
type: FR
name: Snapshot
relationships:
  - target: "ix://agent-ix/docs-service/FR-005"
    type: references
---

# FR-006: Snapshot Entity

## Description

The service SHALL persist configuration versions as immutable `Snapshot` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| versionNumber | Integer | 1 | min: 1 |
| data | JsonObject | 1 | |
| hash | String | 1 | nonEmpty |
| parent | Snapshot | 0..1 | |
| createdAt | Timestamp | 1 | |
| createdBy | String | 1 | maxLength: 64 |

## Invariants

### immutable

```ocl
context Snapshot inv immutable: self.versionNumber = self.versionNumber@pre and self.data = self.data@pre and self.hash = self.hash@pre
```
