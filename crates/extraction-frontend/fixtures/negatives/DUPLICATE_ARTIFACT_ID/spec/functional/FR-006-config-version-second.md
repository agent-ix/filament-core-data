---
id: FR-006
title: ConfigVersion Entity (second declaration)
object: entity
type: FR
name: ConfigVersionAgain
relationships:
  - target: "ix://agent-ix/config-service/FR-005"
    type: references
---

# FR-006: ConfigVersion Entity

## Description

The service SHALL persist configuration versions as immutable `ConfigVersion` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| versionNumber | Integer | 1 | min: 1 |
| data | JsonObject | 1 | |
| hash | String | 1 | nonEmpty |
| parent | ConfigVersion | 0..1 | |
| createdAt | Timestamp | 1 | |
| createdBy | String | 1 | maxLength: 64 |

## Relationships

- `overlay`: belongs_to → ConfigOverlay (FR-005)

## Invariants

### immutable

```ocl
context ConfigVersion inv immutable: self.versionNumber = self.versionNumber@pre and self.data = self.data@pre and self.hash = self.hash@pre
```
