---
id: SR-16498
title: "Code review — PLAT-212 optional semantic.import_types in the module manifest schemas (filament-core-data PR 353)"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; schema/semantic/v1/module-manifest.schema.json, schema/semantic/v1/module-semantic-block.schema.json, schema/package.json, fixtures/semantic/v1/positive/module-semantic-block.json, test/module-manifest.test.ts, test/module-semantic-block.test.ts, python_backend/generated/**"
review_set: subset
---

## Summary

Ticket: PLAT-212. PR head `59236b34` (branch `plat-212-import-types`), one commit over `origin/main`. Scope is `git diff origin/main...HEAD`: 17 files. The two schema files get an optional `import_types` property, the positive semantic-block fixture gets one entry, both vitest files get new cases, the three generated Python backends are regenerated, and `@agent-ix/semantic-schema` goes from 0.4.3 to 0.5.0. No Rust, React or `spec/` files changed. The reference ACs are quire-rs FR-069-AC-16..20 and quoin FR-070-AC-8..13, read from `origin/main` of each repo after a fetch.

Nothing was executed. `pnpm install` was blocked, so vitest, `biome format`, `tsc`, `make lint` and `make test` (including the byte-for-byte Python regeneration test in `tests/test_python_backend_qualification.py:245`) were not run. Every statement below comes from reading the code.

What I checked by reading:

- **Shape.** In both files `import_types` is `type: object`, and each `additionalProperties` value is an array of `type: string, minLength: 1` items with `minItems: 1` and `uniqueItems: true`. That matches FR-070 ("maps `<org>/<repo>` to a non-empty array of unique, non-empty type-name strings") and the FR-069 Dependencies line.
- **Consistency between the two files.** The descriptions and value shapes are the same. The semantic block adds `propertyNames: $ref common.schema.json#/$defs/packageIdentity`, and the manifest has no key pattern. Each file follows the pattern of its own sibling `imports`: the manifest's `imports` has no `propertyNames` either. That divergence already existed and is documented in `docs/semantic-data-system/contracts-v1.md:52`, so it is not a finding. The "key absent from `imports`" refusal cannot be written in JSON Schema. FR-069 and FR-070 give it to the loaders, so leaving it out of the schema is correct.
- **Closed objects.** The `semantic` object in the manifest and the root of the semantic block both still have `additionalProperties: false`. The new key is a declared property, and no required key was added (FR-070-CON-1).
- **Tests.** The helpers (`base`, `accepts`, `validator`, `buildAjv` with `allErrors: true, strict: true`) exist and behave as the new cases expect. Each manifest refusal case triggers the keyword it asserts. The block cases cover non-object, non-array, empty, duplicate, empty-string, non-string and bad-key inputs. The block tests check only `false`. That is still meaningful, because the known-good fixture now carries `import_types`: if the property were undeclared, the positive test would fail, so each refusal has to come from the constraint it names.
- **Generated Python.** All three backends add `ImportTypesAdditionalProperty`/`...Item` aliases and an optional `import_types` field. The field types are `dict[str, ...]` in the manifest and `dict[common_schema.PackageIdentity, ...]` in the block, with `min_length` on the list and on each item. The `__init__` exports and README shared-name lists change the same way as the existing `ImportsAdditionalProperty`. The basemodel backend has no TypeAliasType names in `__all__`, which matches what it already does. The output looks like real generator output, but byte-for-byte regeneration was not executed.
- **Versions.** `schema/package.json` 0.4.3 → 0.5.0 is a minor bump for an additive key on a 0.x line, which is right. No `0.4.3` string is left outside lockfiles and `reviews/`. The Rust crate `agent-ix-semantic-schema` stays at 0.3.0. quire-rs uses it as `{ git = ..., branch = "main" }` (quire-rs `Cargo.toml:115`), so the crate version plays no part in resolution, and the crate also stayed at 0.3.0 through the npm 0.4.x releases. Leaving it there is acceptable. quoin pins the npm package at exactly `0.4.2`, so quoin has to bump to 0.5.0 to pick this up (FR-070 states this).
- **Hygiene.** No vendoring, no ceremony, and nothing private in a public repo.

## Verdict

**CHANGES REQUESTED (minor).** The schema change is correct and matches both specs, both files are consistent with their own conventions, `additionalProperties: false` is unchanged, and the bump is right. FND-001 will probably turn `pnpm run lint` (`biome format .`) red and should be fixed before merge. FND-002 is a one-line doc fix.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | `{ "NotAPackage": ["Entity"] }` quotes a key that needs no quotes. Biome's formatter default (`quoteProperties: "asNeeded"`, not overridden in `biome.json`) rewrites it to `{ NotAPackage: ["Entity"] }`. `pnpm run lint` runs `biome format .` in check mode, so `make lint` would fail. No other test file has an unneeded quoted key. Not executed; drop the quotes. | test/module-semantic-block.test.ts:94 |
| FND-002 | low | The contract index lists the semantic block's fields as "contract version, package identity, exports, imports, targets, and mappings", which leaves out the new `import_types`. | docs/semantic-data-system/contracts-v1.md:51 |

## Review Scope

| Unit | Role | Result |
| --- | --- | --- |
| `module-manifest.schema.json` `semantic.import_types` | examined | Shape correct; closed object intact |
| `module-semantic-block.schema.json` `import_types` | examined | Shape correct; `propertyNames` matches sibling `imports` |
| `schema/package.json` version | examined | 0.5.0 correct |
| `crates/semantic-schema/Cargo.toml` version 0.3.0 | examined | Acceptable (git dep on `main`) |
| `fixtures/semantic/v1/positive/module-semantic-block.json` | examined | Valid against new shape |
| `test/module-manifest.test.ts` PLAT-212 block | examined | Cases valid by reading |
| `test/module-semantic-block.test.ts` PLAT-212 cases | examined | Cases valid by reading; FND-001 |
| `python_backend/generated/**` | examined | Consistent with generator conventions; regeneration not executed |
| `docs/semantic-data-system/contracts-v1.md` | examined | FND-002 |
| quire-rs FR-069-AC-16..20, quoin FR-070-AC-8..13 | context_only | Shape portion is fcd's; rest is loader-side |
