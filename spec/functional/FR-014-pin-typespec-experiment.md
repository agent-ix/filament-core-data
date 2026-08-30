---
id: FR-014
title: "Pin the TypeSpec experiment and representative semantic slice"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/typespec-feasibility.test.ts"
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/report.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-004"
    type: "implements"
---
# [FR-014] Pin the TypeSpec experiment and representative semantic slice

## Description

When the feasibility experiment runs, it SHALL use exact tool/package versions
and compile a source-cited vertical slice containing an artifact, semantic object,
relation, event, verification run, evidence, discriminated result, recursive
reference, extension policy, and distinct optional and nullable fields.

## Inputs

- The issue #8 TypeSpec capability gate
- The issue #10 contract census and conflict ledger
- Exact TypeSpec compiler, library, emitter, language-toolchain, and validation versions

## Outputs

- Pinned experimental package and lock metadata
- Modular TypeSpec sources and mapping metadata
- Machine-readable toolchain and slice inventory

## Behavior

- The experiment SHALL name the semantic identity and data-plane role of every
  representative type rather than treating same-named projections as equivalent.
- At least two local packages SHALL import a shared semantic core without
  flattening the declaring package or version.
- Recursive relations SHALL compile for targets that support recursion and
  receive an explicit projection disposition for targets that do not.
- Optional absence and explicit null SHALL remain distinguishable wherever the
  target representation can preserve them and otherwise record declared loss.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-014-AC-1 | Evidence records exact versions and immutable lock inputs for every compiler, emitter, generator, validator, and native compiler used. | Test (TC-089) |
| FR-014-AC-2 | Two modular source packages import the semantic core while retaining package identity, version, and source provenance. | Test (TC-090) |
| FR-014-AC-3 | The slice contains artifact, semantic object, relation, event, verification run, evidence, discriminated result, recursion, extension policy, optional fields, and explicit null. | Test (TC-091..TC-096) |

## Dependencies

- **Upstream**: [US-004](../usecase/US-004-evaluate-structural-schema-source.md), issue #8, issue #10
- **Downstream**: [FR-015](./FR-015-exercise-typespec-emitter-paths.md), [FR-016](./FR-016-emit-semantic-ir-and-native-types.md)
