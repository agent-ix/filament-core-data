---
id: SR-11083
title: "QSL-769 filament-core-data PR 284 gap analysis: alias construct shape"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@78d690e1d59471588aaee85a4d87bd2dc13e1afd; FR-142-AC-15, FR-100 alias statement, TC-1772 (shape:alias); test/construct-alias.test.ts, test/reader-contract.test.ts, tests/test_reader_contract.py, src/compiler/backends/rust-serde/harness/detectors.mjs"
review_set: subset
---

## Summary

Plan completion: not assessed

Ticket: QSL-769. A manual check of acceptance criteria against tests,
limited to the criteria this diff touches. `quoin matrix` was not run.

- FR-142-AC-15 says `Instant` resolves through an alias to native
  `Timestamp` and `datetime` in all three readers. Covered: the Node test
  `reader-contract.test.ts` (resolveKind after binding) and the Python test
  `test_reader_contract.py` (`type_index` then `resolve_kind`). The
  refusal pointers moved to `/ir/types/2`, because the fixture gained
  `InstantAlias`.
- The `shape:alias` mapping row is backed by TC-1772. The detector builds an
  alias construct and asserts row `shape:alias` and a non-empty inner type.
  The register binds the row to TC-1772.
- The FR-100 alias statement has no AC of its own. The behaviour change it
  governs is code-review SR-11082 FND-002 and is not repeated here.

Code with no owning requirement: none beyond what SR-11082 FND-002 covers.
No stubs. The coverage counts move only where the regenerated schema
changes reach.

## Verdict

CLEAN for this method, apart from FND-002 in SR-11082. One low is recorded:
`test/construct-alias.test.ts` is tagged FR-142-AC-15, but it asserts how
the backends render an alias construct, which AC-15 does not state.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |
