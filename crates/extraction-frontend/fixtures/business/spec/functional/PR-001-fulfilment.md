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

| Step | Kind | Consumes | Emits | Description |
|------|------|----------|-------|-------------|
| placed | event | EV-001 | | Start a run when the order is placed |
| picked | command | | | Pick and pack every line |
| shipped | wait | | | Wait for the carrier to confirm the hand-over |
