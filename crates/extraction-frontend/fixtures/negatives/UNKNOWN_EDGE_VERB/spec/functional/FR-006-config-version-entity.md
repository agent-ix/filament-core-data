---
id: FR-006
title: ConfigVersion Entity
object: entity
type: FR
name: ConfigVersion
relationships:
  - target: FR-005
    type: frobnicates
---

# FR-006: ConfigVersion Entity

## Description

The service SHALL persist configuration versions as immutable `ConfigVersion` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| versionNumber | Integer | 1 | min: 1 |
