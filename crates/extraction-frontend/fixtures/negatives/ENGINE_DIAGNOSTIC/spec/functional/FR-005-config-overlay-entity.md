---
id: FR-005
title: ConfigOverlay
object: entity
type: FR
---

# FR-005: ConfigOverlay

## Description

The service SHALL persist configuration overlays as named `ConfigOverlay` entities.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| name | String | 1 | nonEmpty |
