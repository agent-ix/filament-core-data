---
id: NE_001
title: Shipment
object: nested_entity
type: FR
name: Shipment
relationships:
  - target: VO_001
    type: contains
  - target: EN_001
    type: references
---

# NE_001: Shipment

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| carrier | String | 1 | nonEmpty |

## Parent

`Order` (FR-001) owns every shipment.
