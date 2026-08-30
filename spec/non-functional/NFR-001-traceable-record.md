---
id: NFR-001
title: "Architecture record remains traceable and internally consistent"
type: NFR
quality_attribute: maintainability
verification_method: test
evidence:
  - kind: test_case
    ref: "test/semantic-architecture.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-001"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-008"
    type: "constrains"
---
# [NFR-001] Architecture record remains traceable and internally consistent

## Statement

The architecture record SHALL maintain complete internal navigation and explicit
traceability from principles and decisions to their requirements, gates, and
superseded records.

## Scope

- Applies to the architecture bundle, ADRs, requirements, review method, and roadmap.
- Applies whenever an indexed record is added, renamed, superseded, or removed.

## Rationale

The record is useful only if humans and agents can determine which decision is
current and why it governs downstream work.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Indexed required artifacts | 100% | 100% | automated link and inventory test |
| Broken internal links | 0 | 0 | automated link test |
| Unstatused indexed artifacts | 0 | 0 | schema and inventory test |
| Known conflicts without disposition | 0 | 0 | review inspection |

## Verification

Automated link/inventory checks and architecture inspection verify the index,
status, gate, relationship, and supersession invariants.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-001-AC-1 | The root index includes 100% of the architecture artifacts required by this specification. | Test (TC-038) |
| NFR-001-AC-2 | The architecture bundle contains zero broken internal links. | Test (TC-039) |
| NFR-001-AC-3 | The root index contains zero artifacts without exactly one current status. | Test (TC-040) |
| NFR-001-AC-4 | The conflict register contains zero known conflicts without a disposition. | Review (TC-041) |

## Dependencies

- **Upstream**: [FR-001](../functional/FR-001-indexed-architecture-record.md), [FR-008](../functional/FR-008-decision-and-conflict-records.md)
- **Downstream**: documentation checks and specification review
