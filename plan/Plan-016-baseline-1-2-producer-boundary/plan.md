---
id: Plan-016
title: "Baseline 1.2 producer and consumer boundary"
type: Plan
status: pending
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-106", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-107", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-108", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-109", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-110", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-111", type: references }
---
# Implementation Plan: Baseline 1.2 producer and consumer boundary

## Admission gate

This plan is not implementation authorization. It starts only after FCD PR #97
and A's corresponding package contract are accepted. FCD #93 remains preserved
at `c95dff8` until those selections and this plan are accepted.

## Requirements and dependency graph

- FR-106/107 define the producer model/schema delta.
- FR-108 defines finite populations, record/member identity, availability, and
  all three half-open clock forms.
- FR-109 defines static closure, assessment inputs, and digest domains.
- FR-110/111 are future IN01/IN02 integration controls, not a new repository
  or an implied C delivery.

`accepted FR-106..FR-111 -> Task-140 producer schema and producer interface
-> Task-141 native consumer boundary -> Task-142 #93 resume decision`.

## Test plan

| Work | Planned evidence |
| --- | --- |
| Producer schema and distinguishing cases | TC-1373..TC-1379 |
| Static/assessment consumer boundary and digest correspondence | TC-1380..TC-1381 |
| Future IN01 inventory controls | TC-1382..TC-1384 |
| Future IN02 compatibility-impact controls | TC-1385..TC-1387 |

## Task file mapping

| Task | Exit condition | Status |
| --- | --- | --- |
| Task-140 | Producer preserves the accepted model, population, clock, and digest domains; TC-1373..TC-1379 become traced controls | blocked on acceptance |
| Task-141 | A/D static and assessment boundaries agree; TC-1380..TC-1381 become traced controls | blocked on acceptance and A selection |
| Task-142 | #93 is rebased or preserved only with exact selected SHAs and loss/refusal evidence | blocked on Tasks 140–141 |

## Coordination rules

- D owns the producer/schema proposal; A owns native package/consumer
  integration. F/E retain observation and temporal successor semantics.
- C's existing extraction and assurance work is historical context, not a new
  producer/schema or adapter assignment.
- A static link never gains a hidden population/window/runtime dependency, and
  an assessment never replaces static closure.
