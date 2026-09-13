---
id: FR-135
title: "Freeze the first contract major"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-020"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/NFR-040"
    type: "depends_on"
---
# FR-135: Freeze the first contract major

## Description

This requirement answers
[filament-core-data#12](https://github.com/agent-ix/filament-core-data/issues/12), the gate that approves
downstream migration readiness and freezes the first contract major.

The first contract major SHALL be frozen by a recorded human decision, taken
against a published candidate set, and SHALL NOT be derived from the absence of
known objections.

The decision is the deliverable. Everything else this requirement asks for
exists so that the decision is taken against evidence rather than against a
belief that things are probably fine: the candidate schema set, the package
locks, the compatibility report, the consumer census, the migration order, the
rollback plan, and the exceptions that are being accepted rather than fixed.

The exceptions matter most, because a freeze with no stated exceptions is
usually a freeze whose exceptions were not looked for. Each accepted finding
carries an owner and the condition under which it expires, so "we knew about it"
remains distinguishable from "we decided about it".

## Inputs

- The candidate schema set and its package locks
- The compatibility report over that set
- The consumer census, with a disposition per producer and consumer

## Outputs

- The frozen first major, and the compatibility window it commits to
- The recorded decision, its conditions, and its accepted exceptions

## Behavior

- The freeze SHALL publish the candidate schema set with its package locks
  before the decision is taken.
- The freeze SHALL name a disposition and an owner for every known producer and
  consumer.
- The freeze SHALL resolve every P0 compatibility finding before the decision.
- The freeze SHALL record each accepted lower finding with an owner and an
  expiry condition.
- The freeze SHALL state the supported compatibility window and the exact legacy
  representations retained within it.
- The freeze SHALL record the human decision and its conditions.
- The freeze SHALL NOT treat the absence of objections as an approval.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-135-CON-1 | A frozen major SHALL NOT change a published schema byte without a new major | Compatibility | Test |
| FR-135-CON-2 | The compatibility window SHALL name exact retained representations, not a category of them | Interface | Inspection |
| FR-135-CON-3 | An accepted finding without an owner or an expiry condition SHALL block the freeze | Process | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-135-AC-1 | Every known producer and consumer carries a disposition and a named owner | Inspection |
| FR-135-AC-2 | Every P0 compatibility finding is resolved, and each accepted lower finding names an owner and an expiry condition | Inspection |
| FR-135-AC-3 | The candidate schema set and its package locks are published before the decision is recorded | Inspection |
| FR-135-AC-4 | The compatibility window names each retained legacy representation exactly | Inspection |
| FR-135-AC-5 | Changing a published schema byte within the frozen major is detected and refused | Test |
| FR-135-AC-6 | The recorded decision names a human and its conditions, and no artifact treats silence as approval | Inspection |
| FR-135-AC-7 | The migration order and rollback plan are published, and the rollback is rehearsed rather than described | Demonstration |

## Dependencies

- **Upstream**: [NFR-040](../non-functional/NFR-040-releasable-and-version-matrixed-artifacts.md), which says what "supported" means before this names a supported version
- **Downstream**: [FR-134](./FR-134-retire-the-legacy-contract-at-boundaries-with-no-readers.md), which cannot retire a representation before the window that retains it is stated
