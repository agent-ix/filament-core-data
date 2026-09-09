---
id: NE-001
title: Shipment
object: nested_entity
type: FR
name: Shipment
relationships:
  - target: VO-001
    type: contains
  - target: EN-001
    type: references
---

# NE-001: Shipment

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| carrier | String | 1 | nonEmpty |

## Parent

`Order` (FR-001) owns every shipment.
