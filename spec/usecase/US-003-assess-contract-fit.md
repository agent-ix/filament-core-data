---
id: US-003
title: "Assess Filament contract fit before migration"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
---
# [US-003] Assess Filament contract fit before migration

## Story

**As an** owner or reviewer of a Filament data-contract migration
**I want** a source-cited comparison of the current contracts and their consumers
**So that** I can distinguish compatible extension work from duplication, loss, and breaking change before approving implementation.

## Context

Filament currently expresses related concepts through Avro, Python models,
Rust/Serde/Specta types, TypeScript interfaces, PostgreSQL schemas, JSON-lines
records, and Quire extraction. Repository activity and compatibility work are
ongoing, so migration design needs a revision-pinned account of what actually
exists rather than an assumed target model.

## Acceptance Examples (Illustrative)

### [US-003-EX-1] Repeated concept is comparable

- **Given** a concept appears in more than one language or representation
- **When** a reviewer follows its inventory entry
- **Then** the reviewer can locate every source definition and compare field identity, optionality, defaults, versioning, and known transformations

### [US-003-EX-2] Unverified consumer remains explicit

- **Given** a payload has a suspected consumer that cannot be confirmed at the pinned revision
- **When** the audit records its impact
- **Then** the consumer is marked unknown with evidence and reduced confidence rather than omitted or treated as compatible

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| US-003-AC-1 | For a concept represented by multiple contracts, a reviewer can resolve every cited definition and compare identity, fields, optionality, defaults, versioning, and transformations. | Demonstration (TC-086) |
| US-003-AC-2 | For an unconfirmed consumer, the review reports an explicit unknown state, supporting evidence, consequence, and confidence rather than compatibility. | Demonstration (TC-087) |

## Options (Exploratory)

The inventory may be assembled with repository-native search, schema parsers,
database migration inspection, generated-schema inspection, or small audit
scripts. These are evidence-collection choices and do not establish the future
compiler implementation.

## Constraints (Contextual)

The audit is read-only with respect to every examined repository. Volatile branch,
board, corpus, and package facts must be timestamped and pinned to immutable
revisions where possible.

## Dependencies (Contextual)

The governed corpus baseline in `agent-ix/quire-rs#385` must be complete or
explicitly pinned. The compatibility-shim work in
`agent-ix/filament-parser-lib#8` may remain in review, but its current revision
and unresolved disposition must be represented.

## Priority and Risk (Informative)

Priority is high because an incomplete consumer or field census can turn an
apparently additive schema change into a breaking runtime or persisted-data
change.

## Notes (Informative)

This story produces decision evidence. It neither selects the final schema source
nor authorizes a consumer, database, wire-format, or publication migration.

## Traceability (Informative)

This story drives [FR-009](../functional/FR-009-snapshot-audit-inputs.md) through
[FR-013](../functional/FR-013-publish-contract-census-review.md) and is constrained
by [NFR-004](../non-functional/NFR-004-reproducible-contract-census.md) and
[NFR-005](../non-functional/NFR-005-read-only-contract-audit.md).
