---
id: FR-006
title: ConfigVersion Entity
object: entity
type: FR
name: ConfigVersion
relationships:
  - target: EN-001
    type: references
  - target: "ix://agent-ix/config-service/EN-001"
    type: references
  - target: FR-005
    type: contains
  - target: FR-005
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
