---
id: FR-001
title: Note
object: entity
type: FR
---

# FR-001: Note

## Description

The one record of the shared case: five fields over the kernel scalars String,
Integer, Timestamp and Boolean, one optional field, and one constrained field
(`revision`, `min: 1`) so the alias path is exercised on both sides.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | String | 1 | identity |
| body | String | 0..1 | |
| revision | Integer | 1 | min: 1 |
| createdAt | Timestamp | 1 | |
| active | Boolean | 1 | |
