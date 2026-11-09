---
id: SR-16490
title: PLAT-1369 PR 343 code-review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; PR 343; schema/semantic/v1/module-manifest.schema.json, fixtures/semantic/v1/positive/module-manifest.json, python_backend/generated, python_backend/qualification/validation.json, test/module-manifest.test.ts"
review_set: subset
---

## Summary

Ticket: PLAT-1369. The PR adds the eight `LocatorAssert` members, the
`composite` and `symmetric` edge-type flags, a `type`-tagged `LintRuleEntry`,
and the `plain_language_profiles` and `clause_sets` root keys to the module
manifest schema. It also updates the positive fixture to the new lint-rule
model, regenerates the Python outputs, and adds tests for FR-149 AC-6 to AC-9.

Each new member was checked against the quire-rs main readers:
`LocatorAssert` (src/extract/locator.rs, deny_unknown_fields, 14 members),
`EdgeTypeDef` (src/vocab.rs), `LintRule` (src/lint.rs, serde
`tag = "type"`), `PlainLanguageProfile` (src/plain_language.rs,
deny_unknown_fields) and `Manifest` (src/loader/manifest.rs,
deny_unknown_fields). The schema's root property set is the same as the
loader's 26 `Manifest` fields. `LocatorAssert`, `EdgeTypeEntry` and
`PlainLanguageProfile` carry exactly the reader's members, with matching
types and required sets. Leaving `semantic.semantic_core` out is correct,
because adding it back would be a compat layer.

`pnpm exec vitest run test/module-manifest.test.ts` passed 35 of 35 tests.
`biome format` reports no problems in the changed files.

## Verdict

PASS with one medium finding. The generated Python `LintRuleEntry` types
(pydantic BaseModel, pydantic dataclass and msgspec) have no fields for the
per-variant members, which are declared only inside `allOf`/`if`/`then`.
A Python consumer that parses a rule therefore silently drops `pattern`,
`column`, `allowed` and `annotation_pattern`. The low finding is a
pre-existing count snapshot that has a drift gate.

Pre-existing failures, confirmed not caused by this PR:

- The `constr(pattern=...)` annotation on `grammar_severity` is already on
  origin/main at basemodel line 960 and dataclass line 878 (#342). This PR
  adds no `constr(` line. mypy could not be run here: the local mypy install
  is broken (ModuleNotFoundError) and no .venv is provisioned.
- `biome format .` flags only fixtures/semantic/v1/map-keys-bound/cases.json
  and map-keys-bound.json. Those files came from #341 and are not in this
  diff. The `organizeImports` complaint on test/module-manifest.test.ts is
  at lines 1-5, which this PR does not touch.
- The `.venv/bin/python` ENOENT vitest cases come from the environment. The
  changed test file passes in full.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | Generated Python LintRuleEntry (all three profiles) has no `pattern`, `column`, `allowed` or `annotation_pattern` field, because those members are declared only under `allOf`/`if`/`then`. Parsing a rule through the Python types silently drops them. Fix: declare them as typed optional properties on LintRuleEntry and keep the `if`/`then` blocks for `required` only. | python_backend/generated/pydantic_v2_basemodel/module_manifest_schema.py:429, python_backend/generated/msgspec_struct/module_manifest_schema.py:402, schema/semantic/v1/module-manifest.schema.json:877 |
| FND-002 | low | Pre-existing ceremony: python_backend/qualification/validation.json is a committed snapshot of type counts (`declaredTypes`, `constraintsExercised`, ...), kept in sync by `validate --check` comparing bytes. Every schema change has to regenerate it, which here is 757 lines of churn. It is not introduced by this PR and should be deleted in its own change. | python_backend/qualification/validation.json:9, python_backend/runner/validate.py:526 |
