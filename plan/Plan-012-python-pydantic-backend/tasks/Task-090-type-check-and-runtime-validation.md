---
id: Task-090
title: "Strict type checking and falsifiable runtime validation"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-080"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-927"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-928"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-929"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-930"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-931"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-932"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-933"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-934"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-935"
    type: verifies
---
# Task-090: Strict type checking and falsifiable runtime validation

## Scope

Type-check every emitted surface under strict settings and exercise every validating surface against values drawn from the contract, including the values a losing family is recorded as accepting.

## Subtasks

- [ ] Add the scoped `mypy` configuration with no per-module override and no relaxation of `strict`.
- [ ] Exercise every generated type in a validating profile with a conforming and a non-conforming value per retained constraint.
- [ ] Falsify every recorded loss: generate from the corresponding probe into a scratch directory and assert the surface accepts the value the contract forbids.
- [ ] Falsify the gate itself: remove a constraint from a probe schema, generate into a scratch directory, and assert the runtime-validation gate reports the difference.
- [ ] Emit `validation.json` recording static-only and undemonstrated families as such.
- [ ] Read the skip count from the run's own report and fail on any skip.

## Deliverables

- `python_backend/qualification/validation.json`
- `tests/test_python_backend_validation.py`
- the `mypy` configuration

## Notes

- Every falsification runs against a scratch generation, never against the committed tree, so the freeze and the falsification do not contradict each other.
- Non-conforming values come from the contract's constraints, not from what the generated code happens to reject; TC-944 records that as a human review.
