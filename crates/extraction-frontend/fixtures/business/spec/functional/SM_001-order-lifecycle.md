---
id: SM_001
title: Order Lifecycle
object: state_machine
type: FR
name: OrderLifecycle
relationships:
  - target: EV_001
    type: raises
  - target: EN_001
    type: references
---

# SM_001: Order Lifecycle

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| current | OrderStatus | 1 | |

## Operations

### advance

| Param | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| to | OrderStatus | 1 | |

Returns: OrderStatus [1]

## States

| State | Description |
|-------|-------------|
| draft | The order is being assembled |
| placed | The customer committed to the order |
| shipped | The carrier holds the order |
| cancelled | The order ended before shipment |

## Transitions

| From | To | Trigger | Guard | Emits |
|------|----|---------|-------|-------|
| draft | placed | advance | | EV_001 |
| placed | shipped | advance | | |
| placed | cancelled | advance | | |
