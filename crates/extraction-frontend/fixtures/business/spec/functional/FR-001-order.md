---
id: FR-001
title: Order Entity
object: entity
type: FR
name: Order
relationships:
  - target: SM_001
    type: owns
  - target: EN_001
    type: references
  - target: NE_001
    type: contains
  - target: US-001
    type: traces_to
  - target: StR-001
    type: implements
  - target: FR-002
    type: depends_on
---

# FR-001: Order Entity

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| status | OrderStatus | 1 | |
| lines | OrderLine | 1..* | |
| tags | String | * | |
| total | Decimal(10,2) [USD] | 1 | min: 0 |
| note | String | 0..1 | maxLength: 200 |

## Invariants

### positive_total

```ocl
context Order inv positive_total: self.total >= 0
```

### capped

```ocl
   context Order inv capped:
	self.lines->size() <= 100


```
