---
id: FR-008
title: "Architecture decisions and conflict dispositions"
type: FR
verification_method: inspection
evidence:
  - kind: inspection_checklist
    ref: "spec/reviews/base.md"
  - kind: test_case
    ref: "test/semantic-architecture.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-002"
    type: "implements"
---
# [FR-008] Architecture decisions and conflict dispositions

## Description

The architecture record SHALL contain ADRs for concern-specific authority,
generated-package ownership, best-fit representations, and the conditional
TypeSpec selection while dispositioning conflicts with existing Quire and module
architecture.

## Behavior

- Each ADR SHALL state status, context, decision, consequences, alternatives,
  compatibility effect, and supersession behavior.
- The record SHALL explicitly reconcile Quire's Markdown-canonical boundary with
  concern-specific authority.
- The record SHALL preserve Quire's removal of rendering/templates and its
  current exclusion of generated Rust types from Quire core.
- The record SHALL disposition the difference between unified-archetype intent
  and current separate artifact/object manifest structures.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-008-AC-1 | Four required ADRs exist and have unambiguous statuses. | Test (TC-029) |
| FR-008-AC-2 | Every known Quire conflict has a compatibility, preserve, or supersede disposition. | Analysis (TC-030) |
| FR-008-AC-3 | No ADR moves rendering or cross-language generation into Quire core. | Inspection (TC-031) |
| FR-008-AC-4 | The conditional TypeSpec ADR records a fallback and a named resolution ticket. | Inspection (TC-032) |

## Dependencies

- **Upstream**: [FR-001](./FR-001-indexed-architecture-record.md), [FR-003](./FR-003-ownership-boundaries.md)
- **Downstream**: companion Project 18 architecture ADRs and all implementation plans
