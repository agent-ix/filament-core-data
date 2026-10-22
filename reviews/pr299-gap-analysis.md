---
id: SR-11704
title: PR 299 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data@f637037e6e319b8c35656687ad11aae307bbab28; PR 299;
  crates/extraction-frontend/fixtures/**, crates/semantic-schema/src/lib.rs
review_set: subset
---

## Summary

Ticket: none found. This gap analysis covers only the PR diff. It checks three things: that the fixture version change is complete, that the regenerated goldens are faithful, and that nothing else consumes `SEMANTIC_CORE_SCHEMAS` or the old version string.

## Verdict

PASS on the diff's own content. The blocking self-consistency defect is recorded in SR-11703 FND-001.

Fixtures are complete. `git grep 0.3.2` over `crates`, `spec` and `docs` finds no remaining reference. Every module manifest declares `semantic_core: 0.3.3`, except the deliberate `9.9.9` in `negatives/MODULE_REFUSED`. Every fixture `$ref` names `semantic-core/0.3.3`.

The goldens were not hand-edited. Re-running `make extraction-frontend-goldens` (with the schema crate patched to its in-tree path) reproduces every committed `expected/` file byte for byte. A token diff shows the only change is the `manifestDigest`/`lockDigest` values plus the `embedded: 0.3.3` text in the `MODULE_REFUSED` diagnostic. Both follow from the manifest edits.

Consumers. `SEMANTIC_CORE_SCHEMAS` is referenced only inside `crates/semantic-schema/src/lib.rs` in this repo. Outside it, quire-rs reads it. The repo has no CHANGELOG, so there is none to update.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

Plan completion: not assessed

## Dispositions

| FND | outcome | sha |
| --- | --- | --- |
| FND-001 | no action: placeholder, no findings; the blocking defect is SR-11703 FND-001, fixed in faae976f | faae976f |
