---
id: FR-017
title: "Prove deterministic native and compatibility behavior"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/typespec-feasibility.test.ts"
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/validation.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-015"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-016"
    type: "depends_on"
---
# [FR-017] Prove deterministic native and compatibility behavior

## Description

For unchanged pinned inputs, the experiment SHALL produce byte-identical
normalized outputs, compile and execute representative native consumers, validate
cross-language golden fixtures, and classify controlled patch, additive, and
breaking schema changes consistently.

## Inputs

- Generated output from official and custom emitter paths
- Shared valid, invalid, optional, nullable, extension, and result fixtures
- Baseline, patch, additive, and breaking schema revisions

## Outputs

- Repeat-generation fingerprints and diffs
- Native compile/consumer results
- Cross-language golden compatibility results
- Compatibility classifications and performance measurements

## Behavior

- Generated timestamps, absolute paths, or nondeterministic map order SHALL NOT
  affect governed output.
- Every native package SHALL compile in its native toolchain before a capability
  can pass.
- A shared fixture SHALL have the same accept/reject meaning in every applicable
  language and schema validator, or the mismatch SHALL fail the capability.
- The classifier SHALL distinguish documentation-only/patch, backward-compatible
  additive, and breaking identity/type/requiredness/removal changes.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-017-AC-1 | Two clean generations from unchanged inputs have the same normalized fingerprint and zero unexplained byte differences. | Property (TC-113) |
| FR-017-AC-2 | Rust, TypeScript, and Python outputs compile and their consumers construct the shared valid fixture. | Test (TC-114) |
| FR-017-AC-3 | Valid and invalid golden fixtures receive equivalent cross-language and JSON Schema dispositions, with any target exception explicit. | Test (TC-115) |
| FR-017-AC-4 | Cross-package references remain resolvable after generation and compatibility examples classify as patch, additive, or breaking. | Test (TC-116..TC-117) |
| FR-017-AC-5 | Source diagnostics and generation duration/output size are retained without turning performance observation into an unsupported production claim. | Analysis (TC-118) |

## Dependencies

- **Upstream**: [FR-015](./FR-015-exercise-typespec-emitter-paths.md), [FR-016](./FR-016-emit-semantic-ir-and-native-types.md)
- **Downstream**: [FR-018](./FR-018-resolve-structural-schema-source.md), issue #7
