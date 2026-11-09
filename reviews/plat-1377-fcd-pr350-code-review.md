---
id: SR-16497
title: "Code review — PLAT-1377 package READMEs for semantic-core and semantic-schema (filament-core-data PR 350)"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; packages/semantic-core/README.md, packages/semantic-core/docs/images/*, schema/README.md, schema/docs/images/*"
review_set: subset
---

## Summary

Ticket: PLAT-1377. PR head: `f1e3295` (branch `docs/package-readmes`), one commit over `origin/main`. Scope is `git diff origin/main...HEAD`: two READMEs, two `figures.py` definition files and six rendered SVGs. Docs and figure definitions only, with no production code. Quoin `gap-analysis` was skipped because no production code changed. No `.rs`, React or `spec/` files changed, so no other lane applies. No gate was run, as the brief asked.

What was measured, independently of the PR text:

- **Counts.** `inventory.json` lists 21 models, 1 union, 6 wire unions, 4 enums and 5 scalars, 37 in all. `generated/json-schema/` holds 37 files, and their names match the inventory set exactly. `kernel-scalars.json` has 11 scalars and `lowering.json` has 62 rows. The member lists of `KernelScalar`, `EdgeCategory`, `ConstraintKeyword` and `DefaultKind` in the README table match `main.tsp`. `schema/semantic/v1/` holds 13 `*.schema.json` files plus `construct-vocabulary.json`. Every `$id` has the form `https://schemas.agent-ix.org/filament-core-data/v1/<file>`. The `required` lists of the module manifest and the semantic block match the README.
- **Versions.** semantic-core `package.json` is 0.4.2, and `main.tsp` uses `@jsonSchema(".../semantic-core/0.4.2/")`. The peer dependencies are both 1.15.0. The make targets `semantic-core-compile`, `-generate` and `-check` exist, and so does `scripts/generate.mjs`.
- **Runnable snippets.** I ran `npm pack` on semantic-core and extracted the tarball into a scratch `node_modules`. The tarball's file list is the README, `main.tsp`, `generated/`, the three tables and `package.json`, with no `docs/images`. The TypeSpec Usage snippet compiles with `tsp compile --no-emit` (TypeSpec 1.15.0). The Ajv snippet prints `true` then `false`, and the error is at `/name`. The semantic-schema snippet prints `true`, `false` and `must have required property 'manifest_version'`. I used Ajv 8.20.0.
- **Figures.** `render.py docs/images/figures.py --check` from dev-tools docs-figures exits 0 in both packages, and the tree stays clean. Each `<img alt>` is byte-equal to its SVG's `aria-label`. The SVGs are 10–30 KB. The values come from the package files, with none typed by hand.
- **Vendoring.** Only `figures.py` and the rendered SVGs are added. The engine (`docs_figures`) is imported through `render.py` and not copied into the repo.
- **Public-repo hygiene.** I found no roadmap, delivery order, research content or `quire-research` reference, and no ticket, FR, plan or SHA ids in the new text.
- **Ceremony.** None was added. `make semantic-core-check` is a real regeneration check.
- **docs-style.** The structure matches the tl-* READMEs: title, badges, lede, hero, Getting started, Usage, Reference, Building and testing, Contributing, License. The Discord badge and invite link are identical to tl-*. The style grep finds only plain-fact hits ("does not change with the package version", and the "does not" in the alt text).

## Verdict

**CHANGES REQUESTED (minor).** The counts, file lists, `$id` statements and versions are correct. Both Usage snippets run, and the figures are real generator output. There is no vendoring, leak or ceremony. Three medium findings should be fixed before merge. FND-001 covers figures that may not render on npm. FND-002 and FND-003 are two factual sentences the schemas contradict. FND-004 and FND-005 are low and can be fixed in the same round.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The figures use relative `src`/`srcset` paths (`docs/images/*.svg`), and the PR says the npm page "renders from the repo". The tarball excludes `docs/images` (verified with `npm pack`). Whether npmjs.com resolves a relative path against `repository.directory` (`packages/semantic-core`, `schema`) in a monorepo is not established. If it resolves against the repository root instead, the image is a 404, because the root has no `docs/images/`. The `<img>` fallback is the part that has to work there. Use absolute `https://raw.githubusercontent.com/agent-ix/filament-core-data/main/<pkg>/docs/images/NAME-{light,dark}.svg` URLs in `src` and `srcset`. The repo is public, and raw serves the SVGs as `image/svg+xml` (measured), so they render on both GitHub and npm. The only cost is that a branch preview shows `main`'s figures. | packages/semantic-core/README.md:17-20, packages/semantic-core/README.md:94-97, schema/README.md:15-18 |
| FND-002 | medium | "`module-manifest.schema.json` references `common.schema.json`, so both are loaded" is false. The module-manifest schema has no external `$ref`, because its `semantic` block is inlined. Ajv compiles it alone, without `common.schema.json`. The schema that references `common.schema.json` (`#/$defs/semver`, `packageIdentity`, `manifestTarget`) is `module-semantic-block.schema.json`. Drop the sentence and the `addSchema` line, or switch the example to the semantic block. | schema/README.md:32-33, schema/README.md:43 |
| FND-003 | medium | "A `Decimal` field needs a `decimal` policy, and the name must be an identifier." introduces the Ajv example as though `FieldDecl.json` enforces both rules. It enforces only the identifier rule. `validate({name:"amount", type:{target:{kind:"KernelScalar",value:"Decimal"}}})` returns `true` with no `decimal` (measured). `main.tsp:113` marks it as a reader rule ("Reader: `decimal` iff target is Decimal"). Say which rules the schema checks, or drop the Decimal clause. | packages/semantic-core/README.md:53 |
| FND-004 | low | The Usage scripts are not runnable from Getting started alone. They import `ajv/dist/2020.js`, which is not a dependency of either package, and they use ESM `import`, so they need a `.mjs` file or `"type": "module"`. Add `npm install ajv` and name the file `validate.mjs`. | packages/semantic-core/README.md:55, schema/README.md:35 |
| FND-005 | low | Three sentences repeat nearby content, which the docs-style "cut any sentence that repeats a figure, a table or the previous sentence" rule removes. "Three tables ship beside the schemas: …" repeats the hero figure and the Reference table. "The namespace holds 37 declarations, and each has a generated schema." restates the inventory figure that follows it. The build-from-clone `node packages/semantic-core/scripts/generate.mjs` in Getting started duplicates `make semantic-core-generate` in Building and testing. | packages/semantic-core/README.md:13-15, packages/semantic-core/README.md:92, packages/semantic-core/README.md:33-36 |

## Review Scope

| Unit | Role | Result |
| --- | --- | --- |
| `packages/semantic-core/README.md` lede, counts, Reference tables, `$id` statement | examined | Facts correct; FND-005 |
| `packages/semantic-core/README.md` Getting started and Building and testing | examined | Commands and targets exist; FND-005 |
| `packages/semantic-core/README.md` Usage (tsp + Ajv) | examined | Both run against the packed tarball; FND-003, FND-004 |
| `schema/README.md` lede, Reference table, `$id` statement | examined | 13 schemas + vocabulary, `$id` form, required lists correct |
| `schema/README.md` Usage | examined | Runs; FND-002, FND-004 |
| `<picture>` embeds and alt text (3 figures) | examined | Alt equals `aria-label` verbatim; FND-001 |
| `packages/semantic-core/docs/images/figures.py`, `schema/docs/images/figures.py` | examined | Values read from package data; no engine copy |
| Rendered SVGs (6) | examined | `render.py --check` exit 0 in both packages |
| `package.json` `files` and `repository.directory` (both packages) | context_only | Images excluded from tarball |
| dev-tools `docs-style` and `docs-figures` skills; tl-* READMEs | context_only | Structure and badge parity |

## Dispositions

Round 1, head `d224a33` (fix commit `c07644b`, plus a trailing commit that adds this file under `reviews/`). The fix commit also releases semantic-core 0.4.3 and semantic-schema 0.4.2. Version bump check: `package.json`, the `main.tsp` `@jsonSchema` root, all 37 generated schemas, and the semantic-kernel index, IR and parity goldens are updated. The test module fixtures are updated as well. `git grep 'semantic-core/0\.4\.2'` outside `reviews/` finds nothing. `generate.mjs --check` reports "up to date (37 files)", and `render.py --check` exits 0 in both packages. Both Usage snippets were re-run and print the documented output. GitHub reports `MERGEABLE`. No full gate was run, per the brief.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | All three `<picture>` embeds use absolute `https://raw.githubusercontent.com/agent-ix/filament-core-data/main/<pkg>/docs/images/...` URLs in `src` and `srcset`. The paths match files on the branch. |
| FND-002 | still-open | The false claim is gone, but the new rationale is also wrong. It says `common.schema.json` "is loaded as well, because `module-semantic-block.schema.json` references it", yet the script never loads `module-semantic-block.schema.json`, and `module-manifest.schema.json` has no external `$ref`. With the `addSchema(load("common.schema.json"))` line removed, the script prints the same `true` / `false` / `must have required property 'manifest_version'` (measured). Delete the sentence and that line. |
| FND-003 | fixed | The README now says the schema checks the shape and the name, and that the `Decimal` → `decimal` rule is enforced by the semantic-core reader. |
| FND-004 | fixed | Both Usage sections say to run `npm install ajv` and save the script as an ES module (`validate.mjs`). |
| FND-005 | fixed | The "Three tables ship beside the schemas" and "The namespace holds 37 declarations" sentences are removed. The build-from-clone step now points to Building and testing. |
