---
id: SR-045
title: "Code review of the semantic-core declaration grammar"
type: SpecReview
analysis: code-review
scope: "packages/semantic-core/, fixtures/semantic-core/, test/semantic-core.test.ts, test/semantic-core-reader.ts, test/semantic-core-lowerer.ts, tests/semantic_ir_reader.py, Makefile, docs amendments"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-006"
    type: reviews
---
# Code review of the semantic-core declaration grammar

## Summary

Issue #35 adds a compiling TypeSpec grammar package with a pinned declaration
inventory, an official JSON Schema projection committed with its toolchain
record, a test-scoped grammar reader and reference lowerer, and fixtures that
prove the FR-006 `ConfigVersion` declarations validate, read clean, lower to a
`1.1.0` document accepted by both IR readers, and match the issue #34 fixture
structurally. Two findings were repaired before this artifact was written; the
rest are accepted limits with their consequence named.

## Verdict

**CONDITIONAL** — no high finding; one medium accepted limit (the poetry
dependency of TC-279, as TC-232 before it) and lows recorded.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-230 | medium | Resolved during review: `generate.mjs --check` threw an `ENOENT` stack trace when `generated/json-schema/` was absent instead of naming the missing directory; it now reports the path and the regenerate command. | packages/semantic-core/scripts/generate.mjs |
| FND-231 | medium | Accepted limit: TC-279 shells out to `poetry run python` for the second reader and fails hard without the poetry environment, matching SR-035 FND-123 by design. | test/semantic-core.test.ts, TC-279 |
| FND-232 | low | Resolved during review: the suite imported `node:fs` twice; merged into one import. | test/semantic-core.test.ts |
| FND-233 | low | The FR-006 declaration fixture carries its lowering context (`clauseText`, `fieldLoci`, `relationLoci`, `package`, `sourceLocus`) beside the declarations in one file; FR-034 treats the context as a separate input, and the reader ignores the extra keys. Recorded so issue #36 does not read the packaging as grammar. | fixtures/semantic-core/positive/config-version-field-decls.json |
| FND-234 | low | The `Any`-member mutation tests locate the enum tail by the literal `"  JsonObject,\n}"`; a reformat of `main.tsp` would make the mutation a no-op, which the tests guard by asserting the mutation applied. | test/semantic-core.test.ts (TC-249, TC-258) |
| FND-235 | low | TC-264 mutates a committed generated file and restores it in `finally`; an interrupted run leaves the tree dirty until `make semantic-core-generate` is re-run. | test/semantic-core.test.ts (TC-264) |
| FND-236 | low | `generate.mjs` spawns biome once per emitted file (31 spawns); acceptable at this size, revisit if the inventory grows. | packages/semantic-core/scripts/generate.mjs |
| FND-237 | low | The Python `--read` mode prints a traceback on a missing file; it is test evidence only. | tests/semantic_ir_reader.py |
| FND-238 | low | No stub, skipped case, mock, placeholder return, `TODO`, warning suppression, or unowned production behavior was found; every changed path is inside the NFR-014 permitted set; `pnpm-lock.yaml` and `package.json` are untouched. | Plan-006 |

## Test and Boundary Review

- Thirty Vitest cases carry every TC-248..279 tag except the manual TC-274;
  the Python side gained a `--read`/`--export` mode used by TC-279.
- Grammar: 21 models, one union, four enums, four scalars, exactly
  `inventory.json`; mutation runs that inject `Entity` and `Any` fail the
  inventory test naming the declaration.
- Projection: 30 files, absolute `$id`, sealed with
  `unevaluatedProperties: {not: {}}`; the #31 normalization is recorded as a
  no-op because this grammar emits no relative `$id`; output is piped through
  biome so `pnpm format` is idempotent; the check names a mutated file.
- Fixtures: 36 shape negatives (≥1 per declaration), 14 reader-rule negatives
  rejected at their locus, FR-006 declaration set reads clean and validates per
  element.
- Lowering: 62 rows all `loss: none`, completeness checked against the compiled
  program; the lowered document validates as `1.1.0`, both IR readers return no
  diagnostics with `ConfigOverlay` supplied as a lock export, and the
  structural comparison with the issue #34 fixture holds.

## Spec-Code Faithfulness

- FR-031: inventory, IR-aligned patterns, closed vocabularies with a parity
  test against the IR schema, reader-enforced rules — implemented and traced.
- FR-032: `kernel-scalars.json` with `unitAllowed`, no `Any`, corpus families.
- FR-033: official emitter only, `toolchain.json` pinned to the lockfile,
  byte-identical check, per-model negatives.
- FR-034: identity minting, package-local kernel definitions with the
  `kernel-scalar` extension, alias-per-constrained-field, named extensions,
  clause text from the context map; FR-034 gained one sentence during
  implementation (absent `TypeRef.multiplicity` lowers to `1..1`).
- NFR-014: inventory equality, changed-path guard, spike diff empty, official
  emitters only, two one-paragraph amendments (TC-274 recorded in the plan log).
