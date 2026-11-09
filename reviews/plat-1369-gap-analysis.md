---
id: SR-16491
title: PLAT-1369 PR 343 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; PR 343; spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md, schema/semantic/v1/module-manifest.schema.json, test/module-manifest.test.ts"
review_set: subset
---

## Summary

Ticket: PLAT-1369. This is a planless gap analysis of FR-149 AC-6 to AC-9
against the schema change and its tests. Plan completion was not assessed.
`quire matrix --scope .` lists FR-149-AC-6, AC-7, AC-8 and AC-9 as `tagged`
by test/module-manifest.test.ts at lines 666, 693, 715, 746, 791 and 806.
Every AC has an accept half and a refuse half, and each refusal checks a
specific instance path and keyword. That means a closed-root refusal cannot
satisfy a test about a nested member. All 35 tests pass.

The behaviour was probed with Ajv against the PR's schema:

- A `forbidden_section` or `table_column_values` rule that carries
  `pattern: {kind: "x"}` is accepted.
- A `table_column_values` rule with no `column` is refused.
- A `section_body_pattern` rule with an empty `pattern` is refused.
- Duplicate `ignored_uppercase_terms` are refused (`uniqueItems`).

## Verdict

PASS with one medium finding. The FR statement says "An object `pattern`
SHALL be refused" without a scope, but the schema refuses an object
`pattern` only on `section_body_pattern` rules. The low findings are an AC-8
refusal case that is not exercised and a schema constraint that goes beyond
both the FR and the loader.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-149 says "An object `pattern` SHALL be refused" with no scope, but `pattern` is typed only in the `section_body_pattern` `then` block. A `forbidden_section` or `table_column_values` rule with an object `pattern` validates (measured with Ajv). Fix: either declare `pattern` as a string at LintRuleEntry level (this also fixes SR-16490 FND-001), or scope the sentence to `section_body_pattern`. | spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md:54, schema/semantic/v1/module-manifest.schema.json:877 |
| FND-002 | low | AC-8 refuses "a `table_column_values` rule without `column` and `allowed`". The only test case omits `allowed` and keeps `column`, so a rule that is missing only `column` is never exercised. | test/module-manifest.test.ts:774 |
| FND-003 | low | `ignored_uppercase_terms` carries `uniqueItems: true`, which neither the FR nor the loader states. quire-rs deserializes it into a BTreeSet and silently removes duplicates, so the schema refuses a manifest that the loader accepts. | schema/semantic/v1/module-manifest.schema.json:334 |
