---
id: RP-001
title: Order Repository
object: repository
type: FR
name: OrderRepository
relationships:
  - target: FR-001
    type: persists
---

# RP-001: Order Repository

## Description

An authored fixture artifact.

## Invariants

### known_id

```ocl
context OrderRepository inv known_id: self.orders->forAll(o | o.id <> null)
```

## Operations

### findById

| Param | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | |

Returns: Order [0..1]
Pre: known_id

### save

| Param | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| order | Order | 1 | |

Returns: Order [1]
Post: known_id
