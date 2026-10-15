---
id: SR-11093
title: "Code review of filament-core-data PR #285: stop tracking the generated coverage report"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@5bb41bb199be40a5101a7d6efbb06274c13638b8; PR #285 conformance/runner/differential.mjs, conformance/tools/format-json.mjs, conformance/README.md, conformance/coverage.json (deleted), test/conformance-corpus.test.ts"
review_set: subset
---
# Code review of filament-core-data PR #285

## Summary

Ticket: QSL-758. Read in place, no build. Diff verified with
`git diff origin/main...HEAD` (one commit, 7 files, +18/-420).

Examined:
- `conformance/coverage.json` is deleted and nothing writes it: `writeCoverage`,
  `COVERAGE_PATH` and the `writeFileSync` import are gone from
  `differential.mjs`; the CLI entry now only prints the report (clean).
- `git grep 'coverage.json|writeCoverage|COVERAGE_PATH'` at HEAD outside
  `plan/` and `reviews/`: the only code hit is the formatter path hint in
  `renderCoverage` (`formatJson(coverage, "coverage.json")`), which picks the
  biome language from the extension and reads or writes no file (clean). No
  hit in `.github/workflows`, `Makefile`, `package.json` or `scripts/`
  (clean). Spec hits are in SR-11094.
- No `.gitignore` entry is needed: no code path creates the file (clean).
- TC-626 replacement: asserts `totalCases` of a manifest with one added case
  equals `manifest.cases.length + 1`. `buildCoverage` sets
  `totalCases: manifest.cases.length`; a regression that counted cases from
  the register, the adapter rows, or a constant would fail it (not vacuous).
- TC-634 replacement: renders the account in a child `node` process with
  `cwd: "/"` and compares it with an in-process run from the repo root. Any
  `process.cwd()`-relative path or cwd-derived value in the account makes it
  fail (not vacuous).
- Gate: `cleanup-fcd-test2.log` reports 94 of 94 passed. The earlier
  `cleanup-fcd-test.log` failed 9 tests (TC-302 x2, TC-305, TC-307, TC-309,
  TC-312, TC-632, TC-636 x2), all harness runs whose python adapter died on
  `ModuleNotFoundError: No module named 'jsonschema'`; `poetry install` then
  installed the deps (EXIT=0). Environment-caused and unrelated to this diff
  (clean).

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Verdict

**PASS** for the code. No live reader or writer of the report remains, and
both replacement tests test behaviour and can fail.

Recorded, not blocking:
- low: TC-626 still names its baseline `committed`, and its
  `expect(regenerated).not.toBe(committed)` compares a full run with an
  adapter-less `buildCoverage`, so it differs for an unrelated reason; the
  `totalCases` assertion carries the test.
- low: TC-634's row (FR-039-AC-9) says "and under a different locale"; the
  test varies only the working directory (pre-existing, unchanged here).
- Not a finding: the coder ran the focused corpus test only. AC 3 of
  QSL-758 ("FCD gate passes") still needs the pre-merge `make ci`.
