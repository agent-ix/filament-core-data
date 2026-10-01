---
id: FR-006
title: Snapshot Entity
object: entity
type: FR
name: Snapshot
relationships:
  - target: EN_001
    type: references
  - target: "ix://agent-ix/docs-service/EN_001"
    type: references
  - target: FR-005
    type: contains
  - target: FR-005
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
