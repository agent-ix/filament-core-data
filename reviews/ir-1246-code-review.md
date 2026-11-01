---
id: SR-16480
title: "Code review of IR-1246 package-cycle fixture edges"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; IR-1246; PR #335; crates/semantic-ir/src/rules.rs cfg(test) package_ring helper"
review_set: subset
---

## Summary

Ticket: IR-1246. Independent code review with the Rust lane of frozen head
`754904b85cfe2cfe8b3a68c8a3de29128c4306c1`, against
`6c88c7efbbc87a6c87bab5a98ea6dff2aa5927ba`. The only change renames the
fixture edge variable and JSON member from `dependencies` to `imports`.
All edits are inside the existing cfg(test) module. No production traversal,
assertion, depth bound, schema, specification, dependency or CI change occurs.

## Verdict

**PASS** — the real defect is fixture staleness, not an uncorrected AGE-2224
depth cap. History inspection confirms `68ace480f` used `dependencies` in
both the iterative walker and this helper. IR-1105 commit `6bd8f048f` (#326)
moved the production edge lookup and diagnostic pointer to `imports` without
updating the helper. FR-035, the published package-graph schema and the current
Rust schema validator all require `imports`; restoring that fixture field
makes the cycle edges visible to the genuine unchanged walker.

The closed/open 300-package and 100,000-package controls remain unchanged.
Both 100,000-package checks still execute on the existing 512 KiB thread,
and its join propagates a child assertion failure. The iterative colour DFS
has no graph-depth cutoff. This unit test directly tests graph traversal;
it does not claim full package-schema admission for its minimal graph fixture.

No applicable AssuranceProfile was found under spec/. Existing repository
contribution/toolchain conventions and Rust testing/style guidance were
considered. No new trace or matrix claim is added by this helper correction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Scope

The following examined and context-only units use verbatim excerpts.

```yaml
scope:
- id: FR-059-AC-19
  path: spec/functional/FR-059-answer-the-conformance-corpus-from-rust.md
  role: examined
  excerpt: A ring of 300 composite relationships and a ring of 100,000, each over record types, are reported
    as one `COMPOSITE_CYCLE`, and a chain of the same lengths that does not close is not; a ring of 300
    and of 100,000 packages in the selected package graph is reported as a package cycle and a chain is
    not; the 100,000 cases run on a 512 KiB stack.
- id: FR-035
  path: spec/functional/FR-035-define-the-conformance-corpus.md
  role: examined
  excerpt: '`packageGraph` SHALL carry `rootPackage` and an identity-ordered `packages` array; each entry
    carries only `identity`, `version`, `imports`, and `exports`. `rootPackage`, entry identities, and
    imports use package identities; exports use semantic identities. The root appears exactly once among
    the package entries. Imports and exports are ordered by identity.'
- id: package-graph.schema package edges
  path: conformance/schema/package-graph.schema.json
  role: examined
  excerpt: '"required": ["identity", "version", "imports", "exports"]'
- id: package_walk
  path: crates/semantic-ir/src/rules.rs
  role: context_only
  excerpt: .and_then(|package| package.get("imports"))
- id: package_ring
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: r#"{{"identity":"ix://acme/pkg{position}","imports":[{imports}]}}"#
- id: TC-1821 package cycle control
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: "fn tc_1821_a_package_cycle_of_any_length_is_reported() {\n        assert!(package_cycle(&package_ring(300,\
    \ true)).is_some());\n        assert!(package_cycle(&package_ring(300, false)).is_none());\n     \
    \   on_a_small_stack(|| {\n            assert!(package_cycle(&package_ring(100_000, true)).is_some());\n\
    \            assert!(package_cycle(&package_ring(100_000, false)).is_none());\n        });\n    }"
- id: on_a_small_stack
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: .stack_size(512 * 1024)
```

## Validation Evidence

The reviewer inspected existing evidence rather than running more Cargo,
consistent with the user's single-test limit and this fixture-only diff.

- `/tmp/ir1246-red.status` is 101. `/tmp/ir1246-red.log` shows exactly one
  selected test failing at the closed 300-package cycle assertion on main.
- `/tmp/ir1246-green.status` is 0. `/tmp/ir1246-green.log` shows the same
  exact test passing, so its closed/open 300- and 100,000-package assertions
  all execute successfully, including both small-stack cases.
- `/tmp/ir1246-fmt.status` is 0; formatter output is empty.
- `/tmp/ir1246-clippy.status` is 0; its log shows the touched semantic-ir
  crate checking successfully without warnings.
- Source and diff inspection confirm the production walker, current schema
  and every assertion are unchanged. No suppression, skip, memory/depth
  increase, compatibility path or vendored implementation is introduced.

Code-review and the Rust lane ran as one method/artifact. Gap analysis is
inapplicable because the changed lines are a cfg(test) fixture, not production
behavior. Spec review and its sub-analyses are inapplicable because no spec or
plan changes. No broad test suite, backend proof or extra build was run.
