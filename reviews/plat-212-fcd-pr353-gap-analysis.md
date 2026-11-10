---
id: SR-16499
title: "Gap analysis — PLAT-212 import_types schema shape vs quire-rs FR-069 and quoin FR-070 (filament-core-data PR 353)"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; schema/semantic/v1/module-manifest.schema.json, schema/semantic/v1/module-semantic-block.schema.json, test/module-manifest.test.ts, test/module-semantic-block.test.ts"
review_set: subset
---

## Summary

Ticket: PLAT-212. PR head `59236b34`. This is a manual check of acceptance criteria against tests. filament-core-data has no FR of its own for `import_types`. The governing ACs are in quire-rs FR-069 and quoin FR-070, read from `origin/main` of each repo. A `quoin matrix` run over this repo cannot see those criteria, so it was not used. Plan completion: not assessed. No tests were executed, because vitest could not run when `pnpm install` was blocked. The case-by-case trigger analysis is by reading only.

Only the shape refusals that JSON Schema can express belong to this repo. These are: not an object, not an array, an empty list, a duplicate name, an empty name, a non-string entry, and (block only) a key that is not a package identity. The "key absent from `imports`" refusal, the provider-export check (`semantic.unknown-import-type`), the unused or unresolved import warnings, `$ref` admission and cycles are loader behaviours in quire-rs and quoin. They are out of scope here.

| AC (shape portion) | module-manifest.schema.json | module-semantic-block.schema.json |
| --- | --- | --- |
| FR-069-AC-16 / FR-070-AC-8: no `import_types` validates as before | `accepts(semantic({}))` | "loads a block with no import_types exactly as before" |
| FR-069-AC-16 / FR-070-AC-8: with `import_types` validates | `accepts(... import_types ...)` | known-good fixture now carries `import_types` |
| FR-069-AC-16 / FR-070-AC-9: non-array, empty, duplicate, empty name, non-string refused | it.each, keyword asserted | it.each |
| FR-069-AC-16 / FR-070-AC-9: non-object `import_types` refused | **not tested** (FND-001) | it.each "a non-object" |
| FR-070: key is `<org>/<repo>` | not constrained (mirrors manifest `imports`) | it.each "a key that is not a package identity" |
| key absent from `imports` | loader-owned | loader-owned |

## Verdict

**Minor gap.** Every refusal the schema can express is tested for the semantic block. The manifest schema is missing a test for one case, non-object `import_types`. The schema does refuse it through `type: object`, so this is a coverage gap and not a behaviour gap. No stubs or inflated coverage were found.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | The manifest-side PLAT-212 cases leave out the non-object `import_types` refusal that FR-069-AC-16 and FR-070-AC-9 list, for example `import_types: "Entity"` → keyword `type`. The semantic-block test has it, and the manifest test does not. | test/module-manifest.test.ts:872-885 |

## Review Scope

| Unit | Role | Result |
| --- | --- | --- |
| quire-rs FR-069-AC-16 | examined | Shape portion covered except manifest non-object (FND-001) |
| quoin FR-070-AC-8 | examined | Covered in both files |
| quoin FR-070-AC-9 | examined | Covered except manifest non-object (FND-001) |
| quire-rs FR-069-AC-17..20 | context_only | Loader-side; no fcd obligation |
| quoin FR-070-AC-10..13 | context_only | Install-side; no fcd obligation |
