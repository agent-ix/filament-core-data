---
id: SR-188
title: "Code review (Rust lane) — PR #264 semantic-ir arbitrary depth, operation redefines, text profile"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@29858a01dca8b685fb0587822c407999f6cf5b6c; crates/semantic-ir/src/{json,rules,constructs,schema,lib,patch}.rs, crates/semantic-ir/RULES.md, crates/extraction-frontend/src/identity.rs, crates/extraction-frontend/tests/identity.rs, crates/conformance-adapter/{src/main.rs,tests/corpus.rs}, test/compiler-core.test.ts"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: reviews
---

# Code review (Rust lane) — PR #264

## Summary

Ticket: AGE-2224 (primary), with AGE-2225 and AGE-2226 in the same PR.
Diff scope `git diff origin/main...HEAD` at the reviewed sha in `scope`.
`rust-review` ran as a lane of this review. The TypeScript change is a
two-line type widening in `test/compiler-core.test.ts` for the new `allOf`
branch whose `if` has no `properties`; it is correct.

Examined for recursion on every depth-driven path: `Json` `Drop`, `Clone`,
`PartialEq`, `Debug` (both forms), `parse_with` (open containers on a heap
`Vec<Open>`; a partially built value drops element by element through the
iterative `Drop`), `write_iteratively` (both writers), `rules::composite_walk`
and `package_walk` (colour DFS over explicit frames, O(V+E) through the new
identity index), `Document::resolve` and `walk_alias` (loops), and
`constructs::ancestors` / `ancestors_reach` (frontier loops). No native
recursion whose depth grows with the input remains on parse, serialize,
drop or `decide`. The 1,000,000-level tests are real: they run on 256 KiB
and 512 KiB threads and exercise read, clone, compare, both writers,
`Debug`, drop, a malformed deep input, and `decide`. `MAX_DEPTH` and
`DEPTH_LIMIT` are gone; `ReadLimits` and `RuleLimits` replace them with no
compiled-in depth and no compatibility shim. The `redefines` and
`textProfile` members are closed in `OPERATION_MEMBERS`, `FIELD_MEMBERS`
and `TYPE_MEMBERS`, matching the JSON Schema.

## Verdict

**PASS WITH FINDINGS** — no high. One medium: with the 256 cap gone, the per-type
alias and supertype walks are unbounded, so `decide` is still superlinear
in the length of an alias chain (faster than `origin/main`, but a
100,000-link chain is not decided in practical time).

## Gates

Run at the reviewed sha through `~/dev/worktrees/locked-build.sh`:
`cargo test --offline --locked --no-fail-fast -p agent-ix-semantic-ir -p agent-ix-extraction-frontend -p agent-ix-conformance-adapter`
passed, 31 test binaries, 0 failures (semantic-ir 41 unit tests).
`poetry run pytest -q`: 4 failed, 509 passed. The same 4 tests
(`test_tc341_the_corpus_publishes_nothing`,
`test_no_backend_path_reaches_a_published_manifest`, and two in
`test_semantic_kernel.py`) also fail on `origin/main` (68c0acba), so the
author's claim holds and they are not caused by this PR.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1670 | medium | `walk_alias` runs once per alias type and `ancestors` once or more per type, each walking the whole chain with no cap, so `decide` stays superlinear on a long alias chain: measured in release on a schema-valid bundle, 2,000 / 4,000 / 8,000 aliases take 0.44 s / 2.1 s / 11.9 s (about 5.5x per doubling), so the 100,000-link chain FR-059 says is walked "of any length" is not decided in practical time. Not a regression: `origin/main` takes 6.7 s / 49 s at 1,000 / 2,000, and the new identity index is a large improvement. Memoise each alias's walk result and each type's ancestor set, and add a `decide` test over a long chain | crates/semantic-ir/src/rules.rs:468, crates/semantic-ir/src/rules.rs:669-702, crates/semantic-ir/src/constructs.rs:238-256 |
| FND-1671 | low | `patch::substitute` still recurses on the template's depth; it is reachable from the public `patch::apply` over a `Json`, so a deep `x-repeat` template overflows the stack | crates/semantic-ir/src/patch.rs:108-130 |
| FND-1672 | low | A doc comment for `operations_bundle` ("A `Base` and a `Sub` specializing it …") is stranded above `HEADER`, so `HEADER`'s doc describes the wrong item | crates/semantic-ir/src/lib.rs:203-206 |
