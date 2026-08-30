---
id: SR-004
title: "Dependency review of the semantic architecture and contract census"
type: SpecReview
analysis: dependency
scope: "StR-001, FR-001..013, NFR-001..005"
review_set: all
---
# Dependency review

## Summary

All stakeholder, functional, and non-functional requirements have one logical
classification and form an acyclic prerequisite graph. The issue #10 path starts
only after the architecture foundation, then snapshots inputs before inventory,
parity, impact, and final review.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-005 | low | No dependency cycle exists; FR-001, FR-002, and FR-003 are the enabling foundation for the remaining architecture record. | FR-001, FR-002, FR-003 |

## Classification

| Requirement | Class | Rationale |
|---|---|---|
| StR-001 | Feature | Defines the stakeholder-visible governance outcome. |
| FR-001 | Enablement | Establishes record navigation, status, and supersession. |
| FR-002 | Enablement | Establishes concern-specific authority used by later sections. |
| FR-003 | Enablement | Establishes ownership boundaries used by packages and ADRs. |
| FR-004 | Feature | Documents the semantic metamodel and planes. |
| FR-005 | Feature | Documents the generated-package consumer contract. |
| FR-006 | Feature | Documents representations and transformations. |
| FR-007 | Feature | Documents compatibility, feasibility, review, and gates. |
| FR-008 | Feature | Records accepted and conditional decisions and conflicts. |
| NFR-001 | Cross-cutting | Constrains traceability across the record. |
| NFR-002 | Cross-cutting | Constrains readability across the record. |
| NFR-003 | Cross-cutting | Constrains every issue #8 change to documentation and evidence. |
| FR-009 | Enablement | Pins and qualifies every source used by the census. |
| FR-010 | Enablement | Builds the source-cited contract inventory used by all analysis. |
| FR-011 | Feature | Produces parity, conflict, and missing-contract dispositions. |
| FR-012 | Feature | Produces repository and concept impact recommendations. |
| FR-013 | Feature | Publishes the navigable acceptance review. |
| NFR-004 | Cross-cutting | Constrains census evidence to reproducible, validated output. |
| NFR-005 | Cross-cutting | Constrains all census work to read-only behavior. |

## Dependency Graph

```mermaid
graph TD
  StR-001 --> FR-001
  StR-001 --> FR-002
  StR-001 --> FR-003
  FR-002 --> FR-004
  FR-003 --> FR-004
  FR-003 --> FR-005
  FR-004 --> FR-005
  FR-002 --> FR-006
  FR-004 --> FR-006
  FR-001 --> FR-007
  FR-001 --> FR-008
  FR-003 --> FR-008
  FR-001 --> NFR-001
  FR-008 --> NFR-001
  FR-001 --> NFR-002
  FR-007 --> NFR-003
  FR-008 --> NFR-003
  StR-001 --> FR-009
  FR-009 --> FR-010
  FR-010 --> FR-011
  FR-010 --> FR-012
  FR-011 --> FR-012
  FR-009 --> FR-013
  FR-011 --> FR-013
  FR-012 --> FR-013
  FR-009 --> NFR-004
  FR-010 --> NFR-004
  FR-011 --> NFR-004
  FR-012 --> NFR-004
  FR-009 --> NFR-005
  FR-013 --> NFR-005
```

## Topological Order

1. FR-001, FR-002, and FR-003.
2. FR-004 and FR-007.
3. FR-005 and FR-006.
4. FR-008 and the issue #8 NFR verification gates.
5. FR-009, after the governed corpus baseline is pinned.
6. FR-010.
7. FR-011, then FR-012.
8. FR-013 with NFR-004 and NFR-005 as final issue #10 gates.

## Cycles

None detected.
