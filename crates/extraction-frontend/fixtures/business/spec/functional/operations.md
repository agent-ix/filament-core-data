---
id: OP-001
title: Basket
object: entity
type: FR
name: Basket
---

# OP-001: Basket

## Description

The `operations` artifact FR-094 names: an entity whose operations carry
parameters, returns, and requires/ensures clause references.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| lines | OrderLine | * | |

## Invariants

### non_empty

```ocl
context Basket inv non_empty: self.lines->notEmpty()
```

### capped

```ocl
context Basket inv capped: self.lines->size() <= 100
```

## Operations

### addLine

| Param | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| line | OrderLine | 1 | |
| quantity | Integer | 1 | |

Returns: Basket [1]
Pre: non_empty
Post: capped, non_empty

### clear

Post: non_empty

### total

Returns: Decimal(10,2) [1]
