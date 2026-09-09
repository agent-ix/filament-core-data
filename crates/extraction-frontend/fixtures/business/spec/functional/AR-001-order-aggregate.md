---
id: AR-001
title: Order Aggregate
object: aggregate_root
type: FR
name: OrderAggregate
relationships:
  - target: FR-001
    type: aggregates
  - target: VO-001
    type: contains
  - target: EV-001
    type: emits
  - target: EN-001
    type: references
---

# AR-001: Order Aggregate

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| root | Order | 1 | |

## Members

The `Order` entity and its `OrderLine` value objects.
