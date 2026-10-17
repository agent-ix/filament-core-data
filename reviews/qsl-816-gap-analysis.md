---
id: SR-12008
title: QSL-816 PR 292 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data@8d2df33ddf9dfced2bb0b691fe537e5fb1e1bd8d; PR 292;
  FR-091-AC-12, TC-1841, FR-092-AC-7, US-015-EX-1
review_set: subset
---

## Summary

Ticket: QSL-816. TC-1841 is tagged to FR-091-AC-12 and runs the five
documents the AC names. FR-092-AC-7 (TC-1216) and US-015-EX-1 are backed
through the reworded fixtures, and their goldens differ only in the source
digest. Two gaps remain. The upstream contract QSpec FR-154-AC-14 has a
second clause the frontend does not implement. And TC-1841 does not pin the
registry branch of the rule or the full index clause of the AC.

## Verdict

FIX. One high: QSpec FR-154-AC-14 says a document of an object type
declares one node whether or not it carries `object:`, classified by `type`
alone. The frontend still classifies by `object` (`Document::object()`), so
`type: entity` with no `object:` is skipped, and `type: entity` with
`object: enumeration` lifts as an enumeration. One medium: TC-1841 is
satisfied by the rule `type != object` alone.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | QSpec FR-154-AC-14 (which this PR implements) says an object-type document declares one node whether or not it carries `object:`, classified by `type` alone. The frontend keys every step on `object()`. FR-091 still skips a `type: entity` document that has no `object:`, and `type: entity` + `object: enumeration` lifts as an enumeration. Neither case is specified in FR-091 or tested. | crates/extraction-frontend/src/bundle.rs:112-119, crates/extraction-frontend/src/extract.rs:48, spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md:71 |
| FND-002 | medium | TC-1841 cannot fail when the registry lookup `!object_type_names.contains(doc_type)` is removed. Every positive case, here and in all fixtures, has `type == object`, so the rule `type != object` alone passes the whole suite. The `BundleIndex` clause of AC-12 is asserted for FR-204 only, not FR-271 or FR-100. No case covers `type: FR` with an undeclared `object`. | crates/extraction-frontend/tests/bundle.rs:381-425 |

## Coverage

Gap analysis was done by hand against the named ACs. The Test Matrix was not
recomputed. AC-12 maps to TC-1841, and TC-1841 is in `spec/tests.md`. Each
golden changed only at `/source/digest`, so the fixture edits backing
FR-092-AC-7 and US-015-EX-1 have unchanged lowering output. No build was run.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: FR-091-AC-12
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: examined
  excerpt: "A document with `type: FR` and `object: entity`, one with `type: FR` and `object: enumeration`, and one with `type: FR` and no `object` yield no extraction, no diagnostic, and no `BundleIndex` entry; a document with `type: entity` and `object: entity`, and one with `type: enumeration` and `object: enumeration`, are extracted."
- id: TC-1841
  path: spec/tests.md
  role: examined
  excerpt: "A document with type: FR and object: entity or object: enumeration, and one with type: FR and no object, yield no extraction, diagnostic or BundleIndex entry; documents with type: entity and type: enumeration naming their own object are extracted"
- id: FR-092-AC-7
  path: spec/functional/FR-092-resolve-type-tokens-to-declared-artifacts.md
  role: examined
  excerpt: "An artifact with `type: enumeration` and `object: enumeration` named in a cell resolves to `Enumeration`, its `typeRef` is the enumeration's `type/` identity, and the same title under `type: entity` and `object: entity` resolves to `Object`."
- id: US-015-EX-1
  path: spec/usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md
  role: examined
  excerpt: "Given a bundle whose `FR-006` is an `entity` document (`type: entity`, `object: entity`), a typed `## Properties` table, a frontmatter `relationships:` entry `belongs_to` -> `FR-007`, and an `## Invariants` `ocl` fence"
- id: FR-091
  path: spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md
  role: context_only
  excerpt: "The frontend SHALL skip a document with no `object` frontmatter without a diagnostic; requirement, use-case, and review artifacts are not domain declarations."
```
