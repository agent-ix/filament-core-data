---
id: FR-001
title: Order Entity
object: entity
type: FR
name: Order
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
