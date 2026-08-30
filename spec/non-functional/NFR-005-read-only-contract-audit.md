---
id: NFR-005
title: "Contract audit remains read-only"
type: NFR
quality_attribute: compatibility
verification_method: inspection
evidence:
  - kind: inspection_checklist
    ref: "reviews/2026-08-29-filament-contract-census.md"
  - kind: test_case
    ref: "test/contract-census.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-009"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-013"
    type: "constrains"
---
# [NFR-005] Contract audit remains read-only

## Statement

The issue #10 delivery SHALL add audit requirements, tooling, evidence, and review
artifacts only while leaving every examined contract, generated package, runtime,
database, corpus document, catalog pin, enforcement rule, and external repository
unchanged.

## Scope

- Applies to all local and remote repositories examined by issue #10.
- Allows new audit artifacts and audit-only validation code in
  `filament-core-data`.
- Excludes schema fixes, DTO rewrites, database migrations, consumer changes,
  corpus normalization, publication, and enforcement promotion.

## Rationale

The purpose of the census is to expose compatibility and sequencing risks before
implementation. Mixing fixes into evidence collection would alter the measured
baseline and interfere with active feature branches.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Examined external repositories changed by issue #10 | 0 | 0 | repository status inspection |
| Existing runtime, schema, database, generated, or corpus files changed by issue #10 | 0 | 0 | final diff classification |
| Packages, catalog pins, or enforcing releases published by issue #10 | 0 | 0 | release and catalog inspection |
| Findings hidden by weakened constraints or downgraded compatibility expectations | 0 | 0 | review inspection |

## Verification

The final diff is classified by file purpose, external repository states are
compared with the initial snapshot, and release/catalog evidence confirms that
the audit made no operational or contract change.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-005-AC-1 | Issue #10 changes zero files in any examined external repository. | Test (TC-078) |
| NFR-005-AC-2 | Issue #10 changes zero pre-existing runtime, schema, database, generated, or corpus files. | Test (TC-079) |
| NFR-005-AC-3 | Issue #10 publishes zero packages and changes zero catalog or enforcement state. | Inspection (TC-080) |
| NFR-005-AC-4 | Review finds zero requirements weakened to obtain a ready disposition. | Inspection (TC-081) |

## Dependencies

- **Upstream**: issue #10 safety gate
- **Downstream**: issue #10 merge gate
