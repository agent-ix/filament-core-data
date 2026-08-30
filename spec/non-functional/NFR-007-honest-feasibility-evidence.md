---
id: NFR-007
title: "Feasibility evidence preserves adverse and partial results"
type: NFR
quality_attribute: reliability
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/capabilities.json"
  - kind: analysis_report
    ref: "reviews/2026-08-29-typespec-feasibility.md"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-015"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-018"
    type: "constrains"
---
# [NFR-007] Feasibility evidence preserves adverse and partial results

## Statement

Every assessed capability SHALL retain its method, command, exact tool version,
observed result, limitation, consequence, rationale, and confidence; failed or
partial behavior SHALL NOT be hidden, reclassified, or weakened to make TypeSpec
pass the selection gate.

## Scope

- Applies to official and custom emitter capabilities, native toolchains,
  compatibility and performance observations, and maintenance judgments.
- Applies to the report, machine-readable evidence, review, and ADR proposal.

## Rationale

Custom emitters can make almost any source language appear feasible in a small
demo. The actual decision depends on which semantics are native, which are owned
extensions, and how much compiler/API churn the ecosystem accepts.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Required capabilities without a disposition and evidence | 0 | 0 | evidence-schema validation |
| Partial/failing results reported as unqualified pass | 0 | 0 | independent review |
| Manual cost/confidence judgments without method and rationale | 0 | 0 | review |
| Requirements weakened after adverse evidence | 0 | 0 | specification diff inspection |

## Verification

The capability evidence schema rejects missing commands, versions, results,
limitations, consequences, rationales, or confidence. Review compares the report
with raw outputs and the unchanged requirement gate.

## Dependencies

- **Upstream**: [FR-015](../functional/FR-015-exercise-typespec-emitter-paths.md), [FR-018](../functional/FR-018-resolve-structural-schema-source.md)
- **Downstream**: human ADR-0004 promotion
