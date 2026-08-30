---
id: NFR-006
title: "TypeSpec feasibility spike is isolated and reproducible"
type: NFR
quality_attribute: maintainability
verification_method: test
evidence:
  - kind: test_case
    ref: "test/typespec-feasibility.test.ts"
  - kind: analysis_report
    ref: "spikes/typespec-feasibility/evidence/validation.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-014"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-017"
    type: "constrains"
---
# [NFR-006] TypeSpec feasibility spike is isolated and reproducible

## Statement

The experiment SHALL run from exact locked dependencies in an isolated spike
directory, regenerate deterministically in a clean temporary output, and publish
or replace zero current schemas, packages, generated bindings, or consumers.

## Scope

- Applies to TypeSpec sources, custom emitter, generated experimental output,
  native compile fixtures, compatibility fixtures, commands, and evidence.
- Applies to dependency and changed-path boundaries for issue #4.

## Rationale

The experiment exists to reduce architectural risk. Allowing it to become an
implicit production dependency or to overwrite the Avro baseline would create the
cutover before the decision gate has been reviewed.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Unpinned direct spike dependencies | 0 | 0 | lock/package inspection |
| Unexplained normalized differences across two clean runs | 0 | 0 | deterministic generation test |
| Changes to current schema/generated/runtime/consumer paths | 0 | 0 | changed-path inspection |
| Package publications or registry/catalog mutations | 0 | 0 | release-state inspection |

## Verification

Tests run generation twice in separate temporary directories, compare normalized
manifests, inspect exact dependency versions and allowed paths, and assert that no
publish or canonical replacement command is part of the experiment.

## Dependencies

- **Upstream**: [FR-014](../functional/FR-014-pin-typespec-experiment.md)
- **Downstream**: issue #4 merge gate
