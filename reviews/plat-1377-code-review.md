---
id: SR-16496
title: PLAT-1377 PR 345 code-review (semantic-core 0.4.0 release prep)
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@7639e4ea612bbbd6de2322acb5dc47064acd4434; PR 345;
  packages/semantic-core/**, packages/semantic-kernel/**, crates/extraction-frontend/fixtures/modules/**
review_set: subset
---

## Summary

Ticket: PLAT-1377. One pass: code-review, scoped to `git diff origin/main...HEAD` (one commit, 74 files, version label only). The branch contains origin/main. gap-analysis was not run: the diff adds no behaviour, requirement or acceptance criterion, only a version label and the regenerated files that carry it.

Measured on the PR head:

- `make semantic-core-check`: projection up to date (37 files).
- `make semantic-kernel-check`: 98 artifacts current; the crate tree, manifest, rustfmt and offline build gates pass.
- `make semantic-kernel-python-check` and `make semantic-kernel-parity-check`: exit 0.
- vitest `semantic-core`, `semantic-kernel`, `semantic-contract`, `module-semantic-block`, `semantic-ir-v1-1`: 149/149 pass once the worktree has a Poetry venv. The PR body's single failure (no `jsonschema`) came from a missing venv, not from the change.
- `cargo test --locked -p agent-ix-extraction-frontend -p agent-ix-semantic-schema` through `locked-build.sh`: every binary passes, 0 failures. The 0.4.0 fixture `$ref`s resolve against the in-tree embedded bundle, and the committed goldens still match.

## Verdict

PASS with no blocking finding. Mergeable. The release procedure needs the corrections below before the publish is dispatched.

Checked and correct:

1. main carries the IR-994 form, and 0.4.0 differs from published 0.3.3. In `main.tsp`, `TypeRef.target` is the `@oneOf union TypeRefTarget { SemanticId: {kind, value}, KernelScalar: {kind, value} }`. The `Min/Max/ExclusiveMin/ExclusiveMax` constraint values and `EnumValuesConstraintValues` are `{kind: "number"|"string", value}` unions. `ConstraintDecl` is a `{kind: "<Constraint>", value: <record>}` oneOf. At tag `semantic-core-v0.3.3`, `TypeRef.target` is a bare `anyOf [SemanticId, KernelScalar]`, `MinConstraint.value` is `anyOf [number, string]`, `ConstraintDecl` is an untagged `anyOf` of `$ref`s, and `TypeRefTarget.json` does not exist (31 files then, 37 now). The only commits on `packages/semantic-core` between the tag and main are 7e6f209e (IR-994) and 13e05e83 (STD-399, `kernel-scalars.json` wording).
2. Version agreement. `package.json`, the `@jsonSchema` base in `main.tsp`, every regenerated `$id`/`$ref`, `semantic-kernel/semantic-ir.json` `source.version`, `json-schema/index.json` `base`, the five parity goldens, the three Python READMEs and the 25 extraction-frontend fixture `$ref`s all read 0.4.0. `git grep` finds no other 0.3.3 or 0.3.2 reference outside `reviews/` (historical) and `Cargo.lock` (unrelated crates). The tests derive the base URL from `package.json` (`test/semantic-core.test.ts:35,465`), so there is no second literal to drift.
3. The two `*-retired-semantic-core-version` negative cases (`fixtures/semantic/v1/negative/cases.json:237,437`) set the removed `semantic_core` key and expect `UNKNOWN_KEY`. The value is arbitrary, and leaving it at 0.3.3 is correct.
4. In-repo consumers. `agent-ix-semantic-schema` (crate 0.3.0) embeds the generated files through `include_str!`, and the root `[patch]` points the workspace at the in-tree crate, so the extraction frontend tests the 0.4.0 bundle. The semantic-kernel Rust/TS package version (0.3.1) is the kernel's own, independent of semantic-core, and its publication is gated off (`publish = false`). Nothing else in this repo pins semantic-core.
5. Value test. The diff adds no digest, pin, count or ledger. It is a version label plus the files the emitter derives from it.

Release procedure (`.github/workflows/schema-release.yml`), judged:

- The workflow is `workflow_dispatch` only. A tag records a release and does not trigger one. The `test`/`lint`/`publish-npm` jobs check out **the dispatch ref**: the default branch's HEAD unless `--ref` is given. Dispatch with `gh workflow run schema-release.yml --repo agent-ix/filament-core-data --ref semantic-core-v0.4.0 -f package=semantic-core -f version=0.4.0`, so the bytes published are the tagged bytes (FND-002).
- No version-must-match gate exists. `npm version --no-git-tag-version --allow-same-version <input>` overwrites `package.json` with whatever was typed. A typo (for example `0.4.1`) publishes a package whose version disagrees with every `$id` base (FND-002). The `npm view` guard turns a re-run into a silent no-op ("Already published"), so a wrong first publish is not corrected by re-dispatching.
- Inputs `package=semantic-core version=0.4.0` are correct. The `test` job runs the full `make test-node` at the dispatch ref, so that suite must be green at the tag. Nothing else is required of this PR.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The release notes in the PR body, which the coder proposes as the GitHub Release text, list only "`TypeRef.target` and constraint values now use the tagged `{kind, value}` form". They omit two other breaking changes since 0.3.3. First, `ConstraintDecl` itself changed from an untagged `anyOf` of constraint records to a `{kind: "<XConstraint>", value: <record>}` oneOf, so every constraint entry gains a wrapper. Second, `EnumValuesConstraint.values` became a tagged union too. Six new documents were also added (`TypeRefTarget`, `Min/Max/ExclusiveMin/ExclusiveMaxConstraintValue`, `EnumValuesConstraintValues`). A consumer that follows the notes, such as the quoin AC-6 ConstraintDecl check this ticket schedules, would still reject 0.4.0 constraint lists. Fix the Release text before publishing. No repo change is needed. | PR #345 body; packages/semantic-core/main.tsp:143-243; generated/json-schema/ConstraintDecl.json |
| FND-002 | medium | The proposed procedure ("tag on the merge commit, GitHub Release, workflow_dispatch package=semantic-core version=0.4.0") does not name the dispatch ref. `schema-release.yml` publishes from the ref it is dispatched on (default: main HEAD at dispatch time, not the tag), and `npm version --allow-same-version "${{ inputs.version }}"` accepts any typed version with no check against `package.json` or the `$id` base. Either slip publishes 0.4.0 bytes that differ from the tag, or publishes a version label that disagrees with the schema ids. The `npm view` early exit means a re-dispatch cannot correct it. Dispatch with `--ref semantic-core-v0.4.0` and `version=0.4.0` exactly. The durable fix (a follow-up, not this PR) is to drop the `version` input and read it from `package.json`. | .github/workflows/schema-release.yml:56-70,254,283,292 |
| FND-003 | medium | The PR body states "pin bumps follow after the tag is published". quire-rs does not pin a tag: its `Cargo.toml` takes `agent-ix-semantic-schema = { git = ..., branch = "main" }`, locked at 6f3da0f8. Merging this PR changes the bundle version that crate embeds on main to 0.4.0. The next `cargo update` in quire-rs will then refuse its 41 fixture `$ref`s to `semantic-core/0.3.3/` (`crates/quire-fixtures/fixtures/**`) as unshipped. That happens independently of the npm publish. Plan a quire-rs relock-plus-repoint PR to land with this merge, and add it to PLAT-1377's consumer list. | Cargo.toml (quire-rs origin/main):115; crates/semantic-schema/Cargo.toml:13-15 |
