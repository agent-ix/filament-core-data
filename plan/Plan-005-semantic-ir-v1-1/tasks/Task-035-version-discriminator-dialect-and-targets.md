---
id: Task-035
title: "Version discriminator, dialect, and target binding"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-034"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-227"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-228"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-229"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-230"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-246"
    type: verifies
---
# Task-035: Version discriminator, dialect, and target binding

## Scope

Introduce `contractVersion` `"1.1.0"` alongside `"1.0.0"` in the single `semantic-ir.schema.json`, make `source.dialect` conditional on it, and bind manifest targets to one shared enumeration.

## Subtasks

- [ ] Change `contractVersion` from a `1.0.0` const to an enum of `1.0.0` and `1.1.0`; reject every other value before emission (TC-246).
- [ ] Under `1.1.0`, restrict `source.dialect` to `typespec` or `spec-bundle`; under `1.0.0`, keep the v1 constant (TC-227, TC-228, TC-231).
- [ ] Move the five-value target enumeration into `common.schema.json` and `$ref` it from `package-manifest.targets`, `profiles[].targets`, and `target-contract.target` (TC-229, TC-230).
- [ ] Add a `1.1.0` golden fixture per dialect (including a hand-authored `spec-bundle` document) and negative cases for the retired constant, `avro`, `go`, and `1.2.0`.
- [ ] Add the ADR-0005-citing diagnostic code for the retired dialect to the diagnostic inventory.

## Deliverables

- Discriminated schema accepting both versions.
- Shared target enumeration.
- Version and dialect fixtures.

## Notes

- This task alone introduces the discriminator; later tasks add conditional branches under it.
- `additionalProperties: false` stays; new properties are added per version branch.
