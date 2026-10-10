---
id: SR-253
title: AGE-2230 ears-conformance review of conditional rewrite declaration
type: SpecReview
analysis: ears-conformance
scope: agent-ix/filament-core-data@3a5a28054edece086ca240cce77243804a05edd3; AGE-2230;
  amended FR-074 behavior and AC-8
review_set: subset
relationships:
- target: ix://agent-ix/filament-core-data/FR-074
  type: references
---

## Summary

PASS for the amended declaration and criterion.

## Verdict

PASS for changed specification scope.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Exact frozen review: 70aab4dde9b6dafd8a79ce2072d1d4a02158cc1d, GitHub and clean worktree confirmed; base c620d6be99654a7a77f0ecc2f97d3c7136402651. All 29 changed files scoped and inspected. The final commit changes formatting only. No repository edits, push, merge, workflow edits or extra agents. Python code review, gap analysis, base spec review and EARS apply; no Rust, React, changed structure/dependency/object lens applies. No applicable AssuranceProfile found. Existing function-based test idiom retained. No new source stub, internal mock, lowered coverage threshold or generated-source patching found.

The existing canonical log /tmp/age2230-pr-final.log is explicitly for predecessor 5318cb90281a86050a9ce1dbaef27c6946f6d8ec, not an exact-head gate. It records Python 516 passed / 1 inherited TC-1059 failure, a Node legacy-avro-retirement failure caused by files=['package.json'], inherited Rust registry/clippy failures, and local formatting/Ruff failures. The final formatting-only diff addresses each shown local formatting/Ruff location without behavioral edits, but cannot repair the legacy-avro assertion. No new runtime build was launched and no exact-head canonical gate pass is claimed.

Source review verifies the new schema transform preserves bounds by copying the original branches, intersects the existing scale maximum, requires disjoint exhaustive integer precision tags, and declines ambiguous predicates. Published schema and workflow files have no diff. Generated backend Scalar carries float32/float64, kernel DecimalPolicy has maximum 38, and generated bounds/types agree with the owned source. The Makefile selects the same repository-local Poetry environment for Node and Python lanes. Qualification records explicitly retain the numeric relation for three validating families and record the two static families' loss.

Fresh Quire matrix computed successfully on this exact head: 2155 obligations; 1559 untagged, 379 method-without-symbol, 213 tagged, 4 tagged-by-ignored-test. FR-074-AC-8 and CON-2 bind both preparation tests; FR-080-AC-4 binds the runtime rejection test. Compared with the earlier b43ed2 matrix, exactly those three previously untagged obligations become tagged; no status regresses. Whole-repository gap verdict remains FAIL for inherited trace debt. PR delta has no new trace gap. This is not a repository assurance pass. Plan completion: not assessed. Optional semantic gap pass was not requested and was not run.

FR-074 validation exit 0. Amended permission, fidelity, rewrite-record and unsupported-shape statements are atomic and observable; AC-8 names its allowed exception. No changed dependency edges or object definitions. The rewrite record is a functional generation result, not new file-tracking machinery. Quire emits the existing duplicate module/archetype/inverse-edge and inline-data-schema warnings; output is available and no fallback binary was used.

## Examined Scope

```yaml
scope:
- id: spec/functional/FR-074-prepare-schema-for-python-generation.md
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: '- When a `decimalPolicy` object carries an exhaustive integer `precision`
    range and one `if`/`then` scale bound for each value in that range, the pass MAY
    replace that object''s conditional `allOf` with an equivalent `oneOf` of object
    branches.

    - Each branch of that declared rewrite SHALL copy the original object shape and
    bounds, adding only its precision tag and corresponding scale maximum.

    - The pass SHALL record the declared rewrite as `conditional-numeric-to-one-of`.

    - A partial, non-integer, extra-predicate, or otherwise ambiguous set of clauses
    SHALL remain unchanged.'
- id: FR-074-AC-8
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: Over the thirteen published documents, the prepared set carries the same
    multiset of constraint keywords as the input set and the same set of `$ref` values,
    with only the declared rewrites (including the equivalent `decimalPolicy` conditional-to-`oneOf`
    relation) as differences.
```

## Final exact-head confirmation

Final immutable head 3a5a28054edece086ca240cce77243804a05edd3. The only change after the preceding review is removal of the root files allowlist. package.json now exactly matches c620d6be. Supplied exact-head focused logs show legacy-avro-retirement 1/1, Python adapter 271/271, Ruff and format all exit 0; git diff --check exits 0. Evidence paths: /home/peter/dev/worktrees/logs/age-2230-{legacy-avro,python-adapter,ruff,format}-3a5a2805.log. The manifest comparison at /home/peter/dev/worktrees/logs/age-2230-npm-pack-manifest-vs-c620.json compares 2079 baseline pack paths with 2079 paths for this manifest on the baseline tree, identical with empty differences. That is manifest causality evidence, not a claim the full current pack contents have no legitimate generated-artifact changes.

FND-007 is fixed. FND-001 is explicitly reclassified as inherited baseline debt: restoring the original manifest restores the original pack prohibition failure. FND-002 retains its baseline deferral. No introduced code-review finding remains; PASS for the PR delta, subject to the leader's exact final aggregate new-failure-minus-baseline gate. This is not a full CI or repository assurance PASS.

The matrix and FR-074 validation were freshly run at 70aab4dd; the final diff changes only package.json, so all specification/source/test trace inputs are identical on 3a5a2805. Matrix reuse is stated explicitly. Prior FND-005/006 and gap FND-010 remain fixed by the source and trace fixes already recorded. No new spec, code, or trace change was introduced by this final manifest fix.
