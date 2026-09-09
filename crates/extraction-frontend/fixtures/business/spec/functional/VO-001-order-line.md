---
id: VO-001
title: Order Line
object: value_object
type: FR
name: OrderLine
relationships:
  - target: EN-001
    type: composes
---

# VO-001: Order Line

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| sku | String | 1 | pattern: /^[A-Z0-9-]+$/ |
| quantity | Integer | 1 | min: 1 |
| kind | String | 1 | enumValues: physical\|digital |
