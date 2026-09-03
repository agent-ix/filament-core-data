---
id: FR-018
title: "Record the structural schema-source decision"
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
# [FR-018] Record the structural schema-source decision

## Description

When every capability has retained evidence, the feasibility report SHALL apply
the architecture pass rule as written in the ADR, state a recommendation with
its cost, and leave the decision to the owner.

The owner SHALL record the decision in a normative ADR (ADR-0005: TypeSpec is
the structural source).

## Inputs

- Official-emitter, custom-emitter, native compile, golden, compatibility,
  diagnostic, determinism, performance, and limitation evidence
- The issue #8 capability matrix and pass/fail rule
- Current and expected emitter-framework maintenance surface

## Outputs

- Per-capability pass/partial/fail/not-applicable table
- Go/no-go recommendation with extension-maintenance cost and cost-of-error
- Proposed ADR resolution and retained owner decision gate

## Behavior

- The report SHALL apply only the pass rule recorded in the ADR.
- The report SHALL NOT add pass conditions (such as pre-accepted ownership,
  budget, or upgrade SLA) that the ADR does not state.
- The report SHALL record a real toolchain defect as a tracked defect with its
  workaround, not as a rejection of the source.
- Current Avro and all consumers SHALL remain unchanged until later compatibility,
  migration-readiness, and cutover gates pass.
- The report SHALL distinguish a recommendation from the owner decision that
  resolves the ADR.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-018-AC-1 | Every required capability has retained commands, generated samples, compile results, and one pass/partial/fail disposition with rationale. | Analysis (TC-119) |
| FR-018-AC-2 | The recommendation quantifies custom extension ownership/maintenance and the cost of selecting the wrong source. | Analysis (TC-120) |
| FR-018-AC-3 | The owner decision is recorded in a normative ADR that supersedes the conditional ADR and names the selected source. | Inspection (TC-121) |
| FR-018-AC-4 | The spike cannot self-promote or self-reject an ADR; the decision is the owner's. | Inspection (TC-122) |

## Dependencies

- **Upstream**: [FR-017](./FR-017-prove-spike-compatibility.md), architecture issue #8
- **Downstream**: issue #9 semantic IR specification (TypeSpec frontend)
