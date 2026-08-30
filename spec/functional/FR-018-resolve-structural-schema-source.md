---
id: FR-018
title: "Resolve TypeSpec or modular JSON Schema as structural source"
type: FR
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/report.md"
  - kind: analysis_report
    ref: "reviews/2026-08-29-typespec-feasibility.md"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-017"
    type: "depends_on"
---
# [FR-018] Resolve TypeSpec or modular JSON Schema as structural source

## Description

When every capability has retained evidence, the feasibility report SHALL apply
the architecture pass rule, recommend TypeSpec only when all P0 capabilities
pass, otherwise recommend modular JSON Schema 2020-12, and leave ADR promotion to
explicit human review.

## Inputs

- Official-emitter, custom-emitter, native compile, golden, compatibility,
  diagnostic, determinism, performance, and limitation evidence
- The issue #8 capability matrix and pass/fail rule
- Current and expected emitter-framework maintenance surface

## Outputs

- Per-capability pass/partial/fail/not-applicable table
- Go/no-go recommendation with extension-maintenance cost and cost-of-error
- Proposed ADR-0004 resolution and retained human promotion gate

## Behavior

- A partial or compensated P0 capability SHALL NOT be counted as a pass unless
  the accepted production design explicitly owns and funds the compensation.
- A failure SHALL select modular JSON Schema 2020-12 plus package/mapping/profile
  metadata, not Avro as a universal source.
- Current Avro and all consumers SHALL remain unchanged until later compatibility,
  migration-readiness, and cutover gates pass.
- The report SHALL distinguish a recommendation from the human decision that
  promotes or rejects ADR-0004.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-018-AC-1 | Every required capability has retained commands, generated samples, compile results, and one pass/partial/fail disposition with rationale. | Analysis (TC-119) |
| FR-018-AC-2 | The recommendation quantifies custom extension ownership/maintenance and the cost of selecting the wrong source. | Analysis (TC-120) |
| FR-018-AC-3 | Any failed P0 capability selects modular JSON Schema 2020-12 plus explicit metadata rather than Avro or a weakened requirement. | Test (TC-121) |
| FR-018-AC-4 | ADR-0004 remains provisional until an identified human reviewer accepts the report; the spike cannot self-promote it. | Inspection (TC-122) |

## Dependencies

- **Upstream**: [FR-017](./FR-017-prove-spike-compatibility.md), architecture issue #8
- **Downstream**: issue #9 semantic IR specification and human ADR-0004 review
