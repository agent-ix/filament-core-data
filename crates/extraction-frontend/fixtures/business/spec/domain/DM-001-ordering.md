---
id: DM-001
title: Ordering
object: domain
type: FR
relationships:
  - target: FR-001
    type: contains
  - target: AR-001
    type: contains
  - target: EN-001
    type: contains
---

# DM-001: Ordering

## Bounded Context

Everything from a basket becoming an order to its shipment. Entities live
in their own artifacts; this domain declares a boundary, not data.
