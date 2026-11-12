---
id: SR-16500
title: PLAT-1482 PR 355 code-review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; PR 355; schema/semantic/v1/module-manifest.schema.json, test/module-manifest.test.ts, python_backend/generated"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-149
    type: references
---

## Summary

Ticket: PLAT-1482. This reviews `git diff origin/main...HEAD` at 047ef541.
The change adds an optional closed `where` object ({field, values}) to
`RequiredRelation` and an optional closed `record_validation` object
({schema, locate_absence_at}) to `ArtifactTypeEntry`. It adds four vitest
cases.

- `npx vitest run test/module-manifest.test.ts` passes 46 of 46.
- `cargo test -p agent-ix-semantic-schema` passes. The crate embeds the file
  through `include_str!` (crates/semantic-schema/src/lib.rs:39), so it needs no
  edit.
- A mutation check ran 12 mutants over the new tests. The removed keys were
  `where.additionalProperties`, `values.minItems`, the field and value
  patterns, `where.required`, `rv.required` (schema and locate),
  `rv.additionalProperties`, the locate pattern, and each whole key. The tests
  killed 11 of 12. The mutant that survived removes `record_validation.schema`
  `minLength` (see the spec-review SR on FR-149-AC-11).
- The diff adds no version, digest or SHA bookkeeping. The repo does not
  require a schema `version` or changelog entry in a PR, because packages bump
  versions at release.
- The npm and pypi packaging ship the schema file itself and derive no copy
  from it, except the committed `python_backend/generated` packages (FND-001).

## Verdict

FAIL: the PR leaves the repo red. The schema and the tests are otherwise
sound.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The committed Python packages were not regenerated, so TC-921 `test_the_generated_tree_regenerates_byte_for_byte` fails on the PR head and passes on origin/main. A fresh `python -m python_backend.runner.emit` also adds a `Value` alias for the untitled `where.values` items, which collides with `semantic_ir_schema.Value` and drops `Value` from the top-level exports of all three packages. Regenerate, and title the items or name the defs so no export is lost. | tests/test_python_backend_qualification.py:245, python_backend/generated/msgspec_struct/__init__.py:19 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | Round 1 (cb53d607): the 9 generated files are regenerated, the `where.values` item is `$defs/WhereValue`, and TC-921 passes. Compared with origin/main, all three packages' `__init__` and `module_manifest_schema` only gain RecordValidation, Where and WhereValue, and `Value` is still exported. |
