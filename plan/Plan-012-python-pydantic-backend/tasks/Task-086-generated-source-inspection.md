---
id: Task-086
title: "The non-executing generated-source inspection in both modes"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-908"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-909"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-910"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-911"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-912"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-913"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-914"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-915"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-916"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-917"
    type: verifies
---
# Task-086: The non-executing generated-source inspection in both modes

## Scope

Read generated Python with `ast`, attribute every permissive annotation to a schema node, and refuse a package that degrades a constraint — while leaving a reporting mode that measures without refusing.

## Subtasks

- [x] Implement `inspect_generated(files, documents, mode)` with `report` and `enforce`.
- [x] Find `Any`, `object`, bare `dict`/`list`, and `Any`-valued mappings at any annotation depth.
- [x] Attribute a finding by mapping the enclosing generated symbol to its `$defs` key or `title`, resolving numbered and de-duplicated variants to the name they vary and recording the variant.
- [x] Classify `sanctioned` on the four unconstrained schema shapes and `degraded` otherwise; classify `unattributed` when attribution fails.
- [x] Enforce the import allow-list and the module-level statement allow-list.
- [x] Provide an injected classifier seam so the mutation gate can disable the degraded branch without editing a committed file.
- [x] Instrument the import machinery to prove neither mode imports a generated module.

## Deliverables

- `python_backend/runner/inspect_source.py`
- `tests/test_python_backend_inspect.py`

## Notes

- The reporting mode exists because a check that fails generation cannot also be the instrument that measures a lossy family; FR-077 measures through it.
- Attribution is stated rather than assumed, because the generator carries no provenance into its output and every option that would is prohibited.
