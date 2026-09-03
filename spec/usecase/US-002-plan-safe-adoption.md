---
id: US-002
title: "Plan safe semantic-data adoption"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
---
# [US-002] Plan safe semantic-data adoption

## Story

**As an** implementer or reviewer of a semantic-data ticket
**I want** accepted decisions, provisional mechanisms, compatibility obligations, and promotion gates to be explicit
**So that** I can make progress without disrupting active consumers or presenting unproven architecture as settled.

## Context

The program spans schema authoring, generated packages, module repositories,
several runtimes, PostgreSQL, and analytical formats. Some work can proceed in
parallel, but consumer changes must wait for compatibility and human-promotion
evidence.

## Acceptance Examples (Illustrative)

### [US-002-EX-1] TypeSpec choice before the owner decision

- **Given** an implementer reads the schema-authoring decision
- **When** the owner has not yet recorded the decision
- **Then** TypeSpec is identified as preferred but provisional and the resolution ticket (issue #4) is named

### [US-002-EX-2] Proposed database cutover

- **Given** a reviewer evaluates a persistence migration
- **When** compatibility, backup, backfill, and rollback gates have not passed
- **Then** the record identifies the migration as blocked rather than ready to merge

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| US-002-AC-1 | Before the owner records the decision, the record labels TypeSpec provisional and names the resolution ticket (issue #4). | Review (TC-036) |
| US-002-AC-2 | Before compatibility, backup, backfill, rollback, and promotion gates pass, the record identifies a database cutover as blocked. | Review (TC-037) |

## Constraints (Contextual)

The record must remain useful while repository heads and project-board states
change; volatile facts therefore require dated snapshots and owning tickets.

## Dependencies (Contextual)

The story depends on the program ticket hierarchy and drives package,
compatibility, roadmap, and decision-record requirements.

## Priority and Risk (Informative)

Priority is high because an implied or missing gate could permit a major contract
or data migration to merge as incidental feature work.

## Traceability (Informative)

This story drives [FR-001](../functional/FR-001-indexed-architecture-record.md),
[FR-005](../functional/FR-005-generated-package-contract.md),
[FR-007](../functional/FR-007-compatibility-and-program-gates.md), and
[FR-008](../functional/FR-008-decision-and-conflict-records.md).
