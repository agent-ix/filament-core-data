---
id: EV-001
title: Order Placed
object: event
type: FR
name: OrderPlaced
relationships:
  - target: VO-001
    type: carries
  - target: AR-001
    type: references
---

# EV-001: Order Placed

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
