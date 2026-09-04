---
id: Task-082
title: "The five immutable target profiles and the option allow-list"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-854"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-855"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-856"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-857"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-858"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-859"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-860"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-861"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-862"
    type: verifies
---
# Task-082: The five immutable target profiles and the option allow-list

## Scope

Declare one profile per output family, the complete argument vector for each, and the digest that lets a verdict cite a profile without invalidating itself.

## Subtasks

- [ ] Author `python_backend/profiles.json` with one profile per family, each carrying `id`, `outputModelType`, `options`, `runtimeValidation`, and `verdict`.
- [ ] Implement `python_backend/adapter/profiles.py`: `load_profiles` returning a deep copy, `profile_by_id`, and `profile_digest` over `id`, `outputModelType`, and `options` alone.
- [ ] Implement the canonical-JSON helper for `agent-ix-conformance-jcs-v1` in `python_backend/adapter/jcs.py`; the corpus's own implementation is under a prohibited path and may not be imported.
- [ ] Gate the required options, the prohibited options, and the two deliberately rejected ones — `--extra-fields` and `--use-missing-sentinel`.
- [ ] Gate the declared output model types and Python version against the installed generator's own option parser.

## Deliverables

- `python_backend/profiles.json`
- `python_backend/adapter/profiles.py`, `python_backend/adapter/jcs.py`
- `tests/test_python_backend_profiles.py`

## Notes

- `--extra-fields forbid` is rejected on measurement, not on taste: `additionalProperties: false` already closes both Pydantic families and `TypedDict`, and the blanket flag closes models the schema leaves open.
- `--use-missing-sentinel` is the only measured way to separate absent from null in the Pydantic families, and it renders `pydantic_core.MISSING` in a type position that strict `mypy` rejects. It stays out and becomes a gap row.
- The digest excludes the verdict so recording a measurement does not invalidate the measurement.
