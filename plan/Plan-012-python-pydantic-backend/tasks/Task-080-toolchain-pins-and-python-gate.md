---
id: Task-080
title: "Dependency group, declared pins, advisory gate, and the Python test entry point"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-072"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-845"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-846"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-847"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-848"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-849"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-850"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-851"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-852"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-853"
    type: verifies
---
# Task-080: Dependency group, declared pins, advisory gate, and the Python test entry point

## Scope

Land the `python-backend` Poetry group, the two declared records, the advisory gate, the Make target that gives every Python gate somewhere to run, and the failing suites the rest of the bundle turns green.

## Subtasks

- [x] Add the `python-backend` Poetry group pinning `datamodel-code-generator==0.76.0`, `pydantic==2.12.5`, `msgspec`, and `mypy` exactly, with neither the `http` nor the `httpx2` extra.
- [x] Author `python_backend/toolchain.json` with the declared pins only — generator, Pydantic, msgspec, type checker, and the Python **minor** series — and no formatter entry and no patch-level interpreter version.
- [x] Author `python_backend/advisories.json` transcribing both advisories, their ranges, their first-patched versions, and their vector keys.
- [x] Implement `python_backend/runner/toolchain.py`: read installed distribution metadata, compare against the derived floor by ordered version comparison, and fail with a provisioning message when a distribution is absent.
- [x] Add a `test-python` Make target and make `make test` run both halves, because `make test` is vitest today and every Python gate in this bundle would otherwise have nowhere to run.
- [x] Add `tests/test_python_backend_toolchain.py` with the TC-845..853 gates, red at first.

## Deliverables

- `pyproject.toml`, `poetry.lock`
- `python_backend/toolchain.json`, `python_backend/advisories.json`
- `python_backend/runner/toolchain.py`
- `Makefile`, `tests/test_python_backend_toolchain.py`

## Notes

- The advisory gate reads the installed distribution, never `toolchain.json`, so a stale record is a failure rather than a belief.
- No host-observed patch version enters a committed artefact: that is the issue #42 coupling and it stays out.
- `package.json` is prohibited, so the entry point is a Make target and not a package script.
