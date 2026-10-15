---
id: SR-11243
title: QSL-787 PR 287 spec-review
type: SpecReview
analysis: base
scope: agent-ix/filament-core-data@3f3c1a5714de5a7cb7490e7780ad67f4f41c3c8c; PR 287;
  spec/functional/FR-087-generate-the-kernel-python-package.md; spec/tests.md
review_set: subset
---

## Summary

Ticket: QSL-787. The PR removes the FR-087-AC-15 row from FR-087 and rewords TC-1065 in `spec/tests.md` to cover FR-087-AC-14 and FR-087-AC-16 only, with no packed-file wording left.

## Verdict

PASS. Outside `reviews/`, `git grep` at the head finds no remaining `FR-087-AC-15` and no stale TC-1065 text. TC-1065 appears only in `spec/tests.md` and in the test banner and docstrings, all matching AC-14 and AC-16. FR-087's frontmatter relationships target US-014, FR-081 and NFR-028/029/030 only, with no edge to the deleted AC. Its statement, findings and dependencies never named AC-15. The statement clause that the tree "SHALL be reachable from no distribution manifest" is still verified through FR-087-CON-5 (TC-1059). The numbering gap from AC-14 to AC-16 is acceptable: FR-087 already skips AC-11, and renumbering would only churn ids. NFR-030 and Task-122 hold no reference to the packed list.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Spec-review base over the two changed spec files, plus the FR-087 statement and frontmatter, NFR-030 and Plan-013 Task-122 as context. AC-15 and TC-1065 still appear in historical `reviews/` records, which are left unchanged as history.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: TC-1065
  path: spec/tests.md
  role: examined
  excerpt: "A full generation leaves every byte of the semantic-core bundle unchanged, every example runs clean under -W error, and msgspec refuses exactly the four finding-F2 kernel types | Snapshot | P0 | FR-087-AC-14, FR-087-AC-16"
- id: FR-087-CON-5
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: context_only
  excerpt: "This requirement SHALL add no path under packages/semantic-kernel/ to pyproject.toml's packages or include, or to any npm manifest's files or exports."
- id: FR-087
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: "The emitted tree SHALL live under packages/semantic-kernel/python/ ... and SHALL be reachable from no distribution manifest"
```
