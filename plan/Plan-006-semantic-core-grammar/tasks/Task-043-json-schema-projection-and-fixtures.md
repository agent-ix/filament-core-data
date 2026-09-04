---
id: Task-043
title: "JSON Schema projection, toolchain pin, and fixtures"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-042"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-033"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-250"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-259"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-261"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-262"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-263"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-264"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-265"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-266"
    type: verifies
---
# Task-043: JSON Schema projection, toolchain pin, and fixtures

## Scope

Emit the package with the official `@typespec/json-schema` emitter, apply and record the #31 normalization, commit the output, and author the FR-006 `FieldDecl[]` and per-model negative fixtures.

## Subtasks

- [ ] `make semantic-core-generate` / `make semantic-core-check`: run `tsp compile` with `seal-object-schemas: true`, apply the normalization (absolute `$id` under the package base; record a no-op when nothing is relative), write `generated/json-schema/*.json` and `toolchain.json` with compiler/emitter/normalization versions and an output digest (TC-261, TC-264, TC-265, TC-266).
- [ ] Author `fixtures/semantic-core/positive/config-version-field-decls.json` from FR-006 rows (`id` UUID identity, `versionNumber` Integer min 1, `data` JsonObject, `hash` String, `createdAt` Timestamp, `createdBy` String, plus the `overlay` and `parent` RelationDecls and the `immutable` ClauseRef) and validate each element against `FieldDecl.json` with Ajv strict (TC-262, TC-259).
- [ ] Author at least one negative shape fixture per grammar model under `fixtures/semantic-core/negative/` and assert each fails its model schema (TC-263); assert a twelfth keyword is rejected (TC-250).

## Deliverables

- Committed emitted schemas and `toolchain.json`.
- FR-006 and negative fixtures with tests.

## Notes

- Accept either sealing form the emitter produces.
- Do not hand-edit generated files; the check script must pass.
