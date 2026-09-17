---
id: DM_001
title: Ordering
object: domain
type: FR
relationships:
  - target: FR-001
    type: contains
  - target: AR_001
    type: contains
  - target: EN_001
    type: contains
---

# DM_001: Ordering

## Bounded Context

Everything from a basket becoming an order to its shipment. Entities live
in their own artifacts; this domain declares a boundary, not data.

## Ubiquitous Language

| Term | Description |
|------|-------------|
| Order | A customer's request for goods |
| Fulfilment | The pick, pack and ship work that completes a placed order |
