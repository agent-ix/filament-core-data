---
id: SR-16489
title: PLAT-206 PR 342 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data@e5992136b125d3c40b3e94ab15b6128e5f865ca5; PR 342; PLAT-206, PLAT-900;
  spec/functional/FR-149, spec/tests.md, test/module-manifest.test.ts, schema/semantic/v1/module-manifest.schema.json
review_set: subset
---

## Summary

Ticket: PLAT-206 (also PLAT-900). This is a planless gap analysis of FR-149
(AC-1 to AC-5) against the computed matrix (`quoin matrix --repo . --json`,
quoin 0.29.1), the tagged tests and the schema.

## Verdict

FIX. The computed matrix reports all five FR-149 criteria as `untagged`. The
new tests use the comment form `/** Traces: TC-189x; FR-149-AC-n. */`, and the
repository's traceability model does not bind that form. The TS form it does
bind is `/// Trace: FR-...` (test/semantic-contract.test.ts:631 binds
FR-019-AC-2). The AC-5 content gap is recorded as SR-16488 FND-001.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-149-AC-1 to AC-5 are `untagged` in the computed matrix, with no binder. The 13 new tests carry `/** Traces: TC-1898..1902; FR-149-AC-n. */`, which the declared trace-tag grammar does not match. They need the recognised `/// Trace: FR-149-AC-n` marker. | test/module-manifest.test.ts:126-388 |

## Coverage

The diff was examined against origin/main 1fc5c787. No PR file was edited. TC-1898 to TC-1902 and FR-149 do not collide:
origin/main ends at TC-1896 and FR-148, open PR #340 adds TC-1897 and FR-153,
and PR #84 adds no ids. spec/tests.md has one AC-to-TC row per FR-149
criterion. `quire validate` exits 0 on FR-149 with grammar warnings:
`ears:non-singular` at lines 42, 45 and 46, and `quality:agentless-passive` at
line 40. `emit --check` is clean at the PR head. The tree merged with current
origin/main is not clean, because main's own #341 added `MapBound` to
semantic_ir_schema.py without regenerating `__init__.py`. That drift is in
main, not in this PR.

Nothing was vendored. The tests use inline manifests only, and no module
manifest was copied in. Versions are recorded in schema/package.json
(`@agent-ix/semantic-schema` 0.3.0) and crates/semantic-schema/Cargo.toml
(0.3.0, tag semantic-schema-v0.3.0). The schema has already changed on main
since that tag (#331, #333, #341). quire-rs consumes the crate at branch=main,
locked at 6f3da0f8, so this PR has to bump nothing. Releases go out as a
separate release PR.

Plan completion: not assessed

The whole-tree matrix holds 278 tagged, 1562 untagged, 4 tagged-by-ignored-test and 380 method-without-symbol criteria; that is context only.

## Dispositions

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | ce8b1660: the tests carry `/// Trace: FR-149-AC-n`. `quoin matrix` (0.29.1) reports FR-149-AC-1 to AC-5 as tagged, with 2, 3, 2, 2 and 8 binders. |
