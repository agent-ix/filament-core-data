---
id: SR-11242
title: QSL-787 PR 287 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@3f3c1a5714de5a7cb7490e7780ad67f4f41c3c8c; PR 287;
  tests/test_semantic_kernel.py
review_set: subset
---

## Summary

Ticket: QSL-787. The test edit is a pure deletion of the AC-15 `npm pack --dry-run --json` block in `test_the_bundle_the_distribution_and_the_examples`, plus removal of `FR-087-AC-15` from the section banner and docstring. The AC-14 and AC-16 assertions are unchanged. `json` and `subprocess` stay imported and are still used elsewhere in the file.

## Verdict

PASS. The vacuity claim holds. The root `package.json` is `"private": true` with no `files` field, and the root `.npmignore` is `*`, so the dry-run pack lists only npm's always-included files (`package.json`, `README.md`, `LICENSE`). No `packages/semantic-kernel` path could appear, and neither published package was ever packed. The deleted block guarded no real risk. The two published manifests (`packages/semantic-core/package.json` `files`: main.tsp, generated/, inventory.json, kernel-scalars.json, lowering.json; `schema/package.json` `files`: semantic/) are relative to their own package directories and cannot reach `packages/semantic-kernel/`. The CON-5 manifest check is unchanged.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Code-review over the one changed Python test. Recorded low, not raised: the PR body says the root pack "packs nothing", but npm always packs the root `package.json`, `README.md` and `LICENSE`. That does not change the vacuity argument. No build was run. The coder's focused log shows 10 passed, EXIT 0.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: tests/test_semantic_kernel.py
  path: tests/test_semantic_kernel.py
  role: examined
  excerpt: "def test_the_bundle_the_distribution_and_the_examples() -> None:\n    \"\"\"TC-1065: FR-087-AC-14, FR-087-AC-16.\"\"\""
- id: .npmignore
  path: .npmignore
  role: context_only
  excerpt: "# The private workspace root has no distribution payload. ...\n*"
- id: package.json
  path: package.json
  role: context_only
  excerpt: "\"private\": true"
```
