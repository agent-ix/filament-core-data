---
id: US-001
title: "Understand data authority and ownership"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
---
# [US-001] Understand data authority and ownership

## Story

**As an** architecture or module maintainer
**I want** to identify the authoritative source and owner for each kind of data
**So that** I can extend the ecosystem without creating a competing schema or treating a projection as canonical.

## Context

Markdown is central for authored knowledge, PostgreSQL owns operational records,
and several language and wire representations exist at application boundaries.
The correct authority therefore depends on the concern rather than on one global
format choice.

## Acceptance Examples (Illustrative)

### [US-001-EX-1] Authored requirement

- **Given** a requirement authored and reviewed by humans and agents
- **When** a maintainer checks the authority matrix
- **Then** typed Markdown is identified as authoritative and generated views are identified as derived

### [US-001-EX-2] Runtime verification run

- **Given** an accumulated verification execution
- **When** a maintainer checks the authority matrix
- **Then** the owning runtime store is identified as authoritative and a Markdown report is identified as a projection

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| US-001-AC-1 | For authored durable knowledge, the record identifies typed Markdown as authoritative and generated views as derived. | Review (TC-034) |
| US-001-AC-2 | For an accumulated verification run, the record identifies the owning runtime store as authoritative and a Markdown report as a projection. | Review (TC-035) |

## Constraints (Contextual)

The record must preserve Quire's direct-Markdown model without forcing runtime
records to be authored as documents.

## Dependencies (Contextual)

The story depends on the current Quire, Quoin, module, and Filament ownership
boundaries and informs the authority, ownership, metamodel, and representation
requirements.

## Priority and Risk (Informative)

Priority is high. An incorrect authority choice causes divergent edits,
lossy round trips, and incompatible consumer contracts.

## Traceability (Informative)

This story drives [FR-002](../functional/FR-002-concern-specific-authority.md),
[FR-003](../functional/FR-003-ownership-boundaries.md),
[FR-004](../functional/FR-004-metamodel-and-data-planes.md), and
[FR-006](../functional/FR-006-representations-and-transformations.md).
