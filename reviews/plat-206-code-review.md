---
id: SR-16488
title: PLAT-206 PR 342 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@e5992136b125d3c40b3e94ab15b6128e5f865ca5; PR 342; PLAT-206, PLAT-900;
  schema/semantic/v1/module-manifest.schema.json, python_backend/generated/**, test/module-manifest.test.ts,
  spec/functional/FR-149, spec/tests.md, spec/spec.md, docs/semantic-data-system/contracts-v1.md
review_set: subset
---

## Summary

Ticket: PLAT-206 (also PLAT-900). The PR types `ArtifactTypeEntry.data_schema`
with the same two-branch `oneOf` that `ObjectTypeEntry.data_schema` uses. It
also declares eight root keys of the module manifest. Each key was compared
with the quire-rs loader at origin/main 9cc35ca (`src/vocab.rs`,
`src/traceability.rs`, `src/loader/manifest.rs`, `src/grammar/mod.rs`,
`src/grammar/property.rs`). Nine live module manifests (origin/main of
spec-artifacts-process, -iso, -app and spec-objects-*) were validated against
the PR schema and against the origin/main schema with jsonschema 4.26.

These match quire-rs: `lexicon`, `observable_verbs` and `vacuous_predicates`
are open, and `ambiguity_terms` is closed. `property_idioms` is open, and its
`shape` enum lists all 10 PropertyShape values. The `grammar_severity` key
pattern is equivalent to `is_severity_key`, and its levels are
off/warning/error. `verification_catalog` is closed and requires non-blank
name, class and definition. The marker `language` enum is complete (rust,
python, typescript, alias ts). `RequiredRelation.direction` and its `check`
token match. Every quire-rs struct marked `deny_unknown_fields` is
`additionalProperties: false`, and no other struct is. The `data_schema`
branch is identical to the object-type branch. All 9 live modules bind
`{schema: <path>.json}` and none carries `digest`.

The traceability model is incomplete (FND-001). The live process module
fails validation on the key this PR introduces.

## Verdict

FIX. One high finding: the traceability `$defs` leave out four members that
quire-rs reads, so spec-artifacts-process is refused. One medium finding: the
negative tests for TC-1900, TC-1901 and TC-1902 pass against the pre-change
schema. Four low findings. `emit --check` is clean at the PR head. The 18
module-manifest vitest tests and 271 Python adapter tests pass.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The traceability model leaves out four members that quire-rs declares. (1) `TraceTarget` has no `from` (`table_row`/`list_item`/`heading`) and no `pattern`, and requires `id_column` unconditionally. quire-rs TraceTargetWire requires `id_column` only for `table_row`. (2) `ColumnVocabularies` has no `retired`. (3) `TraceMarkerForm` used for `trace_tags.implements` has no `syntax` (`rust_attribute`, Rust only). The live spec-artifacts-process manifest is refused at `traceability/trace_tags/implements` ('syntax' unexpected) and at `traceability/vocabularies` ('retired' unexpected). This contradicts FR-149 Behavior ("each entry with the required and optional members the quire-rs reader declares") and FR-149-AC-5 ("exercising every member"). | schema/semantic/v1/module-manifest.schema.json:951-1000, 1143-1212 |
| FND-002 | medium | The negative tests for TC-1900, TC-1901 and TC-1902 would pass without the change. With the origin/main schema swapped in, 11 of 18 tests still pass. The 5 `rejects` tests for grammar_severity, verification_catalog and traceability (3 tests) are among them, because root `additionalProperties: false` refuses the undeclared key. `rejects()` checks only the boolean. It should assert the failing instancePath and keyword under the key, for example `/traceability/required_relations/0/edges` with `minItems`. | test/module-manifest.test.ts:108-110, 190, 219, 353, 365, 388 |
| FND-003 | low | The `ObligationSource` oneOf refuses `target` together with `section` or `id_format`. quire-rs `TraceabilityModel::validate` refuses only `target` together with `archetype`, and accepts and ignores section/id_format alongside `target`. The schema is therefore stricter than the loader, although FR-149 says the schema mirrors quire-rs. | schema/semantic/v1/module-manifest.schema.json:1302-1330 |
| FND-004 | low | `CombinatorialColumns.strength` has `minimum: 0`, but quire-rs refuses strength 0 at load. That is a single-field rule, not a cross-reference left to the consumer, so the schema admits a value the loader refuses. | schema/semantic/v1/module-manifest.schema.json:1230 |
| FND-005 | low | The scalar-or-list `section` oneOf is written out inline in TraceTarget, DocumentReference and ObligationSource rather than defined once as `$defs/SectionNames`, the one type quire-rs has. The generated Python packages get anonymous aliases Section to Section7 and Section1Item/3Item/5Item/7Item. | schema/semantic/v1/module-manifest.schema.json:972, 1031, 1280 |
| FND-006 | low | The PR body says the Direction1 to Direction2 rename is only a name-counter side effect. The regeneration also drops `Direction` from the root `__init__` exports of all three generated packages, because it now collides with the new module_manifest_schema `Direction`. It is listed as a colliding name in each README. No Python, TS or Rust consumer under /home/peter/dev imports root `Direction` or `Direction1`, so nothing breaks, but the public-surface change is undocumented. | python_backend/generated/msgspec_struct/__init__.py:19, python_backend/generated/msgspec_struct/README.md:34 |

## Dispositions

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | ce8b1660: TraceTarget declares `from` (table_row/list_item/heading) and `pattern`, with a oneOf requiring `id_column` and no `pattern` for table_row, and `pattern` and no `id_column` for list_item or heading. `ColumnVocabularies.retired` is added. A new `TraceImplementsForm` carries `syntax: rust_attribute`, guarded by `not` for non-Rust languages, while markers and legacy still refuse `syntax`. All 9 live manifests now raise no error under any of the 8 keys. |
| FND-002 | fixed | ce8b1660: `rejects(extra, path, keyword)` asserts the instancePath and keyword. With the origin/main schema swapped in, 16 of 22 tests fail. The 6 that pass are the 5 pre-existing tests and the inline/reference acceptance test. |
| FND-003 | fixed | ce8b1660: the ObligationSource target branch is now `required: [target], not: {required: [archetype]}`, matching quire-rs. |
| FND-004 | fixed | ce8b1660: `strength` has `minimum: 1`, and a test refuses 0 at `/combinatorial/strength` with keyword minimum. |
| FND-005 | fixed | ce8b1660: the list form is hoisted to `$defs/SectionList`. The string-or-list oneOf stays inline at each use; FR-149 gives the reason (a root-level oneOf definition is classified as degraded by Python generation). Generated aliases drop from Section..Section7 to Section, SectionList and SectionListItem. |
| FND-006 | fixed | The PR body now states that root `Direction` is dropped and that the regeneration picks up main's `MapBound`. `emit --check` exits 0 at ce8b1660. |
