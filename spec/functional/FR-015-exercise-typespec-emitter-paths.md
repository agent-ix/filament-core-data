---
id: FR-015
title: "Exercise official TypeSpec schema and wire emitters"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/typespec-feasibility.test.ts"
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/capabilities.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-014"
    type: "depends_on"
---
# [FR-015] Exercise official TypeSpec schema and wire emitters

## Description

The experiment SHALL compile the representative sources through the official
JSON Schema and Protobuf paths, test TypeSpec package/version/deprecation and
diagnostic behavior, and retain both supported output and target limitations.

## Inputs

- Pinned representative TypeSpec sources
- Official TypeSpec JSON Schema, Protobuf, and versioning packages
- Valid, additive, breaking, and intentionally invalid fixtures

## Outputs

- JSON Schema 2020-12 output
- Protobuf 3 output for its declared wire projection
- Captured diagnostics and per-capability dispositions

## Behavior

- JSON Schema emission SHALL test stable identifiers, modular references,
  constraints, sealed-object policy, recursive types, and discriminated results.
- Protobuf emission SHALL use explicit stable field numbers and reservations.
- The experiment SHALL limit Protobuf tests to the named wire projection without
  claiming universal model fidelity.
- Unsupported or lossy semantics SHALL remain failed, partial, or explicitly
  mapped rather than prompting a source edit whose only purpose is a green test.
- Invalid source SHALL produce a source-located nonzero diagnostic outcome.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-015-AC-1 | Official JSON Schema output is draft 2020-12, modularly identified, sealed as configured, recursively resolvable, and preserves constraints plus discriminated results. | Test (TC-097..TC-099) |
| FR-015-AC-2 | Official Protobuf output preserves its declared package, stable field numbers, reservations, optionality behavior, and explicit wire-only scope. | Test (TC-100..TC-101) |
| FR-015-AC-3 | Invalid source and unsupported target constructs retain nonzero, source-located diagnostics and a consequence. | Test (TC-102) |
| FR-015-AC-4 | Cross-package versioning and deprecation declarations compile or receive a precise limitation disposition. | Analysis (TC-103) |

## Dependencies

- **Upstream**: [FR-014](./FR-014-pin-typespec-experiment.md)
- **Downstream**: [FR-017](./FR-017-prove-spike-compatibility.md), [FR-018](./FR-018-resolve-structural-schema-source.md)
