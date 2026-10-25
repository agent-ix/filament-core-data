---
id: SR-11703
title: PR 299 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@f637037e6e319b8c35656687ad11aae307bbab28; PR 299;
  Cargo.lock, crates/extraction-frontend/Cargo.toml, crates/semantic-schema/src/lib.rs,
  crates/extraction-frontend/fixtures/**
review_set: subset
---

## Summary

Ticket: none found. The branch `fcd-quire-rs-bump` and the PR title name no Linear ticket. One pass: code-review with the rust-review lane. Builds ran through `locked-build.sh`. The extraction-frontend and semantic-schema tests ran twice: once under the committed lock, and once with a local `[patch]` that points the git `agent-ix-semantic-schema` at `crates/semantic-schema`. `make extraction-frontend-goldens` was also re-run under that patch.

## Verdict

FAIL, one blocking finding (FND-001).

Checked and correct. The quire-rs rev moves to fd1cdd9 in both `Cargo.toml` and `Cargo.lock`. `SC_ENUM_VALUE_NAME` follows the sibling constant pattern, and its `SEMANTIC_CORE_SCHEMAS` entry is in alphabetical order. The embedded list now has 31 entries, the same as the 31 files under `packages/semantic-core/generated/json-schema/`. All 31 files carry a `semantic-core/0.3.3` `$id`. quire-rs fd1cdd9 (`src/semantic/embedded.rs`) reads the bundle version from the first entry's `$id` and serves `SEMANTIC_CORE_SCHEMAS` whole, so this entry is all the engine needs to stop raising `schema-ref-unshipped` on `EnumValue.json`'s `$ref`. With the patch applied, all 31 test binaries pass, and the goldens regenerate byte-identical to the committed ones.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | As committed, the PR is not self-consistent. `Cargo.lock` resolves the git `agent-ix-semantic-schema` (branch=main) to 6a9ffdf6. That commit embeds 0.3.3 ids but has no `EnumValueName.json` entry, so every lift is refused with `semantic.schema-ref-unshipped`. Under `cargo test --locked -p agent-ix-extraction-frontend` (the command `make extraction-frontend-test` and `make rust` run), 8 test binaries fail: 1, 3, 4, 4, 5, 6, 11 and 17 failures. Merging it turns main red until a follow-up PR re-locks. The fix belongs in this PR: add `[patch."https://github.com/agent-ix/filament-core-data"] agent-ix-semantic-schema = { path = "crates/semantic-schema" }` to the root `Cargo.toml` and re-lock. With that patch, all 31 binaries pass and the goldens reproduce. It also stops the workspace from testing the engine against a stale copy of its own schema crate. Root-workspace patches do not reach downstream consumers such as QSL. | Cargo.lock:36-38; Cargo.toml:23-35 |
| FND-002 | medium | No test checks that the embedded semantic-core bundle is closed, meaning every `$ref` in a `SEMANTIC_CORE_SCHEMAS` document names a document that is also embedded, or every generated file is embedded. That missing check is how main shipped a 0.3.3 bundle whose `EnumValue.json` refs an unembedded `EnumValueName.json`. The existing tests only check that each embedded document has a matching `$id`. | crates/semantic-schema/src/lib.rs:304-318 |
| FND-003 | low | The doc comment states a document count ("those 31 documents"). The count has to be edited every time the bundle changes, and it already went stale once (it said 30). Drop the number. | crates/semantic-schema/src/lib.rs:230 |

## Examined scope

```yaml
scope:
- id: crates/extraction-frontend/Cargo.toml#quire-rs
  path: crates/extraction-frontend/Cargo.toml
  role: examined
  excerpt: "quire-rs = { git = \"https://github.com/agent-ix/quire-rs\", rev = \"fd1cdd9d302bfd870517cc2e009b8646757c12f1\" }"
- id: Cargo.lock#agent-ix-semantic-schema
  path: Cargo.lock
  role: examined
  excerpt: "source = \"git+https://github.com/agent-ix/filament-core-data?branch=main#6a9ffdf676faf070427d76459a80c8743c3eb0ed\""
- id: crates/semantic-schema/src/lib.rs#SEMANTIC_CORE_SCHEMAS
  path: crates/semantic-schema/src/lib.rs
  role: examined
  excerpt: "(\"EnumValueName.json\", SC_ENUM_VALUE_NAME),"
- id: crates/semantic-schema/src/lib.rs#tests
  path: crates/semantic-schema/src/lib.rs
  role: examined
  excerpt: "every_embedded_semantic_core_schema_is_well_formed_json_with_a_matching_id"
- id: quire-rs@fd1cdd9 src/semantic/embedded.rs
  path: quire-rs src/semantic/embedded.rs
  role: context_only
  excerpt: "pub fn semantic_core_bundle(version: &str) -> Option<...> { if version == embedded_semantic_core_version() { Some(agent_ix_semantic_schema::SEMANTIC_CORE_SCHEMAS) } else { None } }"
```

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | faae976f: the root `[patch."https://github.com/agent-ix/filament-core-data"]` points at `crates/semantic-schema`, and the lock now has a single path `agent-ix-semantic-schema` with no git 6a9ffdf6 entry. The reviewer re-measured at f567e813: `cargo metadata --locked` succeeds; `cargo test --locked --no-fail-fast -p agent-ix-extraction-frontend -p agent-ix-semantic-schema` passes in all binaries with no local change; `make extraction-frontend-check` exits 0. |
| FND-002 | fixed | faae976f: `every_semantic_core_ref_names_an_embedded_document`. Mutation check: deleting the `EnumValueName.json` entry makes it fail with "EnumValue.json refs EnumValueName.json, which is not embedded". |
| FND-003 | fixed | faae976f: the count is removed from the doc comment. |
