---
id: SM-001
title: Order Lifecycle
object: state_machine
type: FR
name: OrderLifecycle
relationships:
  - target: EV-001
    type: raises
  - target: EN-001
    type: references
---

# SM-001: Order Lifecycle

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

## States & Transitions

```mermaid
stateDiagram-v2
    draft --> placed
    placed --> shipped
    placed --> cancelled
```
