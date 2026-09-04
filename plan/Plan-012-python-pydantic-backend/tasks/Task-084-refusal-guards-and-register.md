---
id: Task-084
title: "The refusal guards, the closed register, and the malicious-schema corpus"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-075"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-873"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-874"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-875"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-876"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-877"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-878"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-879"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-880"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-881"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-882"
    type: verifies
---
# Task-084: The refusal guards, the closed register, and the malicious-schema corpus

## Scope

Refuse, in the same interpreter and before any spawn, every schema key and every generator option that can put caller-controlled Python in the output.

## Subtasks

- [ ] Implement `assert_schema_safe` over the five measured executable keys at every applicator position, and the ref-shape refusals.
- [ ] Implement `assert_argv_safe` as an allow-list that refuses an unrecognised token, in both option spellings and at any index.
- [ ] Author `python_backend/refusals.json` with unique codes, each citing its advisory or constraint.
- [ ] Assert every register key against the installed generator's own source, so the register is measured rather than asserted.
- [ ] Build the malicious-schema regression corpus covering every key, every refused ref shape, and every prohibited option.
- [ ] Property-test key placement and option placement over generated positions rather than a handful of enumerated ones.

## Deliverables

- `python_backend/adapter/guard.py`, `python_backend/refusals.json`
- `python_backend/qualification/malicious/`
- `tests/test_python_backend_guard.py`

## Notes

- The five keys are the measured surface of `0.76.0`: `JsonSchemaObject` binds `customTypePath` and `customBasePath`, the parser reads `x-python-import` and `x-python-type`, and `default_factory` is GHSA-386q-5hp3-95m9's vector. FR-043's three are a subset, which the gate asserts.
- Remote refs are refused three independent ways; none substitutes for another.
