---
id: EV_001
title: Order Placed
object: event
type: FR
name: OrderPlaced
relationships:
  - target: VO_001
    type: carries
  - target: AR_001
    type: references
---

# EV_001: Order Placed

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| orderId | UUID | 1 | |
| placedAt | Timestamp | 1 | |

## Schema

```json
{ "type": "object", "required": ["orderId", "placedAt"] }
```
