---
id: FR-006
title: ConfigVersion Entity
object: entity
type: FR
name: ConfigVersion
relationships:
  - target: US-002
    type: traces_to
  - target: StR-001
    type: implements
  - target: FR-005
    type: depends_on
---

# FR-006: ConfigVersion Entity

## Description

The service SHALL persist configuration versions as immutable `ConfigVersion` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| versionNumber | Integer | 1 | min: 1 |

## Relationships

- `overlay`: contains → ConfigOverlay (FR-005)
- `parent`: references → ConfigVersion (FR-006)
