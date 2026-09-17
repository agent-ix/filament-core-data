---
id: Flow
title: Flow
type: interface
object: interface
---

# [Flow] Flow

## Description

The flow interface of TC-197 fixture Y: one feature, the field `Flow/rate` typed `Count` `{1,1}`.

## Contract

```yaml
name: Flow
fields:
  - name: rate
    type: Count
    multiplicity: 1..1
operations: []
```

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| rate | Count | 1..1 | |

## Operations

The interface declares no operations; its one feature is the field `rate`.
