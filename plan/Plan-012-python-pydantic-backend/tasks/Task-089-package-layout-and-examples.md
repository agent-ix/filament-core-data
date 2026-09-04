---
id: Task-089
title: "The package layout, provenance, README, and examples"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-918"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-919"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-920"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-921"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-922"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-923"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-924"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-925"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-926"
    type: verifies
---
# Task-089: The package layout, provenance, README, and examples

## Scope

Write the emitted tree for every demonstrated profile, with provenance, a content fingerprint, a README that says what the family does not carry, and an ordinary consumer example.

## Subtasks

- [ ] Implement `emit.py`: run the enforcing inspection, then write one module per document, an `__init__.py` with a sorted `__all__`, `PROVENANCE.json`, and `README.md`.
- [ ] Raise on a duplicate type name across two documents rather than let one shadow the other.
- [ ] Record the MIT attribution verbatim beside `AGPL-3.0-only`, with no clock reading and no host-observed version.
- [ ] Write one example per demonstrated profile that constructs, round-trips, and rejects.
- [ ] Add the `--check` mode over the committed tree and the packed-file reachability gate.
- [ ] Record the reason for each `not-qualified` family in place of a package.

## Deliverables

- `python_backend/runner/emit.py`
- `python_backend/generated/<profile-id>/`, `python_backend/examples/*.py`
- `tests/test_python_backend_emit.py`, `test/python-backend.test.ts` (packaging half)

## Notes

- Nothing here reaches a publication manifest; the gate checks the packed file list, not the manifest text alone.
- The tree is committed because a fingerprint over an uncommitted tree proves nothing on a fresh checkout.
