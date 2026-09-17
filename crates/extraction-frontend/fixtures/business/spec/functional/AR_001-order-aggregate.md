---
id: AR_001
title: Order Aggregate
object: aggregate_root
type: FR
name: OrderAggregate
relationships:
  - target: FR-001
    type: aggregates
  - target: VO_001
    type: contains
  - target: EV_001
    type: emits
  - target: EN_001
    type: references
---

# AR_001: Order Aggregate

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| root | Order | 1 | |

## Members

The `Order` entity and its `OrderLine` value objects.

## Invariants

### single_root

```ocl
context OrderAggregate inv single_root: self.root <> null
```
