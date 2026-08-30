---
id: NFR-002
title: "Architecture record is standalone and unambiguous"
type: NFR
quality_attribute: usability
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-001"
    type: "constrains"
---
# [NFR-002] Architecture record is standalone and unambiguous

## Statement

The architecture record SHALL let a maintainer determine current principles,
ownership, terminology, provisional decisions, and next gates without consulting
chat history or inferring unstated defaults.

## Scope

- Applies to human maintainers, external consumers, and LLM agents.
- Applies to the root index and every normative or provisional architecture document.

## Rationale

The record is intended to survive context loss and coordinate work across many
repositories and sessions.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Required architecture topics answerable from linked documents | 100% | 100% | structured review |
| Undefined normative terms found by review | 0 | 0 | terminology inspection |
| Decisions requiring chat history to interpret | 0 | 0 | reviewer demonstration |

## Verification

A reviewer follows only the root index and linked repository artifacts to answer
the authority, ownership, representation, package, compatibility, status, and
next-gate questions defined by this specification.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-002-AC-1 | A reviewer can answer every required architecture topic using only the root index and linked repository artifacts. | Review (TC-042) |
| NFR-002-AC-2 | Terminology inspection finds zero undefined normative terms. | Review (TC-043) |
| NFR-002-AC-3 | A reviewer can interpret every normative and provisional decision without chat history. | Review (TC-044) |

## Dependencies

- **Upstream**: [FR-001](../functional/FR-001-indexed-architecture-record.md)
- **Downstream**: architecture review and implementation handoff
