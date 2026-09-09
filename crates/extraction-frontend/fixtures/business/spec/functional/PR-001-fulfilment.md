---
id: PR-001
title: Fulfilment
object: process
type: FR
name: Fulfilment
relationships:
  - target: EV-001
    type: consumes
  - target: FR-001
    type: reads
  - target: FR-001
    type: operates_on
---

# PR-001: Fulfilment

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| order | Order | 1 | |

## Workflow

```mermaid
flowchart LR
    placed --> picked --> shipped
```
