---
id: SR-12007
title: QSL-816 PR 292 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@8d2df33ddf9dfced2bb0b691fe537e5fb1e1bd8d; PR 292;
  crates/extraction-frontend/src/bundle.rs, crates/extraction-frontend/tests, fixtures,
  spec/functional/FR-091, FR-092, spec/usecase/US-015, spec/tests.md
review_set: subset
---

## Summary

Ticket: QSL-816. The PR marks a document `composed` in `Bundle::load` when its
frontmatter `type` is neither an active archetype name of an accepted module
nor equal to its own `object`. A composed document reports `object() == None`,
so extract, resolve and lower skip it, and it is filtered out of the
`BundleIndex`. Every consumer of `object` goes through `Document::object()`
(extract.rs:48, resolve.rs:289, lower.rs:1105/1115, bundle.rs:344, 633), so the
skip is applied consistently. The rust-review lane found no panic, unsafe,
integer or lock issue in the change.

The fixture churn is legitimate: 70 fixtures move `type: FR` to their own
`object` value. All 14 regenerated goldens were compared as parsed JSON
against `origin/main`, and each differs only at `/source/digest` (the input
bundle bytes changed), so no lowering output changed.

## Verdict

FIX. One high: the new composed-document statement contradicts the
`UNKNOWN_OBJECT_TYPE` statements, and the AC-6 fixture was edited from
`type: FR` to `type: widget` so TC-1205 still passes. AC-6 now holds only
when `type` equals `object`. One medium: any `type` value that is not an
object type, including a typo, now drops a valid object document without a
diagnostic.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The new FR-091 composed statement skips `type: FR` + `object: widget` silently, while the AC-6 statements say any document whose `object` no module declares SHALL emit UNKNOWN_OBJECT_TYPE. The two SHALLs conflict. The UNKNOWN_OBJECT_TYPE fixture was changed to `type: widget` so TC-1205 passes. AC-6 survives only through the `type == object` clause, and no test covers `type: FR` with an undeclared object. | spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md:69-72, crates/extraction-frontend/src/bundle.rs:235-249, crates/extraction-frontend/fixtures/negatives/UNKNOWN_OBJECT_TYPE/spec/functional/FR-007-widget.md |
| FND-002 | medium | The rule treats any `type` that is not an object type and not equal to `object` as an artifact type. A typo or case variant (`type: entitty`, `type: Entity`) on a document with a valid `object: entity` used to lift, and now it vanishes with no diagnostic. The only symptom is a downstream unresolved-reference error in some other document. The planner's intent covered artifact-type ids such as FR, not every unknown type. | crates/extraction-frontend/src/bundle.rs:239-247 |

## Coverage

Code review and rust-review of bundle.rs and the test edits. Read every
`object()` and `frontmatter` consumer to confirm the skip is applied the same
way everywhere. Compared all 14 goldens structurally against `origin/main`.
Grepped the fixtures for any remaining `type: FR` + `object:` document: none
are left. No build was run, because the author's crate suite with clippy and
fmt passed at EXIT=0.

Downstream risk, not a defect of this PR: a QSL intake test
(`qsl-semantics/tests/it/model_intake.rs`, `type: FR` + `object: entity`) and
any real bundle authored as `type: FR` + `object:` stop lifting silently when
they adopt this revision. quire-rs fixtures carry the same shape but do not
consume extraction-frontend.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: FR-091
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "The frontend SHALL skip, without a diagnostic, a composed document: a document whose frontmatter `type` is neither an object type a loaded module declares nor the document's own `object` (an artifact type such as `FR`, `US`, or `TC`), even when it carries `object:`."
- id: FR-091-AC-6
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "A document with `object: widget`, which no module declares, yields `UNKNOWN_OBJECT_TYPE` at that document and is not lowered; a document with no `object` yields no diagnostic."
- id: FR-091-AC-12
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "A document with `type: FR` and `object: entity`, one with `type: FR` and `object: enumeration`, and one with `type: FR` and no `object` yield no extraction, no diagnostic, and no `BundleIndex` entry; a document with `type: entity` and `object: entity`, and one with `type: enumeration` and `object: enumeration`, are extracted."
- id: FR-092-AC-7
  path: spec/functional/FR-092-resolve-type-tokens-to-declared-artifacts.md
  role: examined
  excerpt: "An artifact with `type: enumeration` and `object: enumeration` named in a cell resolves to `Enumeration`, its `typeRef` is the enumeration's `type/` identity, and the same title under `type: entity` and `object: entity` resolves to `Object`."
- id: US-015-EX-1
  path: spec/usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md
  role: examined
  excerpt: "Given a bundle whose `FR-006` is an `entity` document (`type: entity`, `object: entity`), a typed `## Properties` table, a frontmatter `relationships:` entry `belongs_to` -> `FR-007`, and an `## Invariants` `ocl` fence"
- id: crates/extraction-frontend/src/bundle.rs
  path: crates/extraction-frontend/src/bundle.rs
  role: examined
  excerpt: "document.composed = frontmatter.and_then(|fm| fm.get(\"type\")?.as_str()).is_some_and(|doc_type| { !object_type_names.contains(doc_type) && Some(doc_type) != object });"
```
