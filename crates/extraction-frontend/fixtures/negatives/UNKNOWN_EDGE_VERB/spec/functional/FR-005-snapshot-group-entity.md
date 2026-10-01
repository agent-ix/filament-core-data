---
id: FR-005
title: SnapshotGroup
object: entity
type: FR
---

# FR-005: SnapshotGroup

## Description

The service SHALL persist configuration overlays as named `SnapshotGroup` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| name | String | 1 | nonEmpty |
