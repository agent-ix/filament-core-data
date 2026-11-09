---
id: SR-16493
title: PLAT-847 PR 344 code-review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; PR 344; schema/semantic/v1/module-manifest.schema.json, test/module-manifest.test.ts, python_backend/generated/{msgspec_struct,pydantic_v2_basemodel,pydantic_v2_dataclass}/{__init__,module_manifest_schema}.py"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-149
    type: references
---

## Summary

Ticket: PLAT-847. This reviews `git diff origin/main...HEAD` at ac6d558. The
change removes `trace_tags.legacy` and the `TraceLegacyForm` definition from
the module manifest schema. It also drops the `rewrite_to` clause from the
`TraceabilityModel` description and the `legacy` mention from the
`TraceImplementsForm` description, takes `legacy` out of the every-member
positive fixture, and regenerates the three Python backends.

- The schema has no remaining `TraceLegacyForm`, `rewrite_to` or `legacy`
  member under `trace_tags`, and no `$ref` dangles. The only `legacy` left in
  the file is `grammar_severity.legacy_forms` (quoin FR-074), which is a
  different feature.
- `git grep` over the whole repository finds no other reference to
  `TraceLegacyForm`, `rewrite_to` or `trace_tags.legacy`. That covers the Rust
  `agent-ix-semantic-schema` crate (`include_str!` of the same file, so it
  picks the change up with no edit), the positive fixture
  `fixtures/semantic/v1/positive/module-manifest.json`, the negative cases,
  the docs and the TS sources. There are no generated TS types for this
  schema.
- `poetry run python -m python_backend.runner.emit --check` exits 0, so the
  committed generated output matches a fresh generation. The generated diff
  only removes the `TraceLegacyForm` class, the `legacy` field of
  `TraceTagGrammar`, and the import and `__all__` entries for that name.
  `LegacyForms` stays because it belongs to `legacy_forms`.
- `pnpm exec vitest run test/module-manifest.test.ts`: 35 of 35 pass.
- The negative case `trace({ trace_tags: { legacy: [form] } })` is now
  refused at `/traceability/trace_tags` with `additionalProperties`. That is
  an undeclared member of the closed `TraceTagGrammar`, which matches the
  quire-rs `deny_unknown_fields` refusal ("unknown field `legacy`"). The
  assertion can tell the two states apart: if `legacy` were still declared,
  the error would be at `/trace_tags/legacy/0` and the test would fail.

## Verdict

PASS with one low finding. The removal is complete and limited to the
legacy pieces.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | The `legacy` refusal now tests FR-149-AC-5's "undeclared member" clause, but it still sits in the test named "accepts syntax only on an implements form for Rust" and still passes a `form` that carries `syntax: rust_attribute`. The assertion is sound, but a reader of the test name expects a syntax refusal, and the input mixes two reasons for refusal. Move the case beside the other undeclared-member refusals, or name it, and pass a form without `syntax`. | test/module-manifest.test.ts:487-491 |
