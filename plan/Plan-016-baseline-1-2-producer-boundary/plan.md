---
id: Plan-016
title: "Baseline 1.2 producer and consumer boundary"
type: Plan
status: pending
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-100", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-101", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-102", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-103", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-104", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-105", type: references }
---
# Implementation Plan: Baseline 1.2 producer and consumer boundary

## Admission gate

This plan is not implementation authorization. It starts only after FCD PR #97
and A's corresponding package contract are accepted. FCD #93 remains preserved
at `c95dff8` until those selections and this plan are accepted.

## Requirements and dependency graph

- FR-100/101 define the producer model/schema delta.
- FR-102 defines finite populations, record/member identity, availability, and
  all three half-open clock forms.
- FR-103 defines static closure, assessment inputs, and digest domains.
- FR-104/105 are future IN01/IN02 integration controls, not a new repository
  or an implied C delivery.

`accepted FR-100/101 -> Task-140 producer schema -> accepted FR-102/103
interface -> Task-141 native consumer boundary -> Task-142 #93 resume decision`.

## Test plan

| Work | Planned evidence |
| --- | --- |
| Producer schema and distinguishing cases | TC-1355..TC-1361 |
| Static/assessment consumer boundary and digest correspondence | TC-1362..TC-1363 |
| Future IN01 inventory controls | TC-1364..TC-1366 |
| Future IN02 compatibility-impact controls | TC-1367..TC-1369 |

## Task file mapping

| Task | Exit condition | Status |
| --- | --- | --- |
| Task-140 | Producer preserves the accepted model, population, clock, and digest domains; TC-1355..TC-1361 become traced controls | blocked on acceptance |
| Task-141 | A/D static and assessment boundaries agree; TC-1362..TC-1363 become traced controls | blocked on acceptance and A selection |
| Task-142 | #93 is rebased or preserved only with exact selected SHAs and loss/refusal evidence | blocked on Tasks 140–141 |

## Coordination rules

- D owns the producer/schema proposal; A owns native package/consumer
  integration. F/E retain observation and temporal successor semantics.
- C's existing extraction and assurance work is historical context, not a new
  producer/schema or adapter assignment.
- A static link never gains a hidden population/window/runtime dependency, and
  an assessment never replaces static closure.
