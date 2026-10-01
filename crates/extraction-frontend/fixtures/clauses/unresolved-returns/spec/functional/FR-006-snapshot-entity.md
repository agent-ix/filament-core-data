---
id: FR-006
title: Snapshot Entity
object: entity
type: FR
name: Snapshot
---

# FR-006: Snapshot Entity

## Description

The service SHALL persist configuration versions as immutable `Snapshot` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| versionNumber | Integer | 1 | min: 1 |

## Operations

### latest

Returns: Nonesuch [0..1]
