---
id: SR-11190
title: QSL-769 PR 286 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@3e33a1aeeb319d65f49ff2168dd4f1d25afe505e; PR 286;
  tests/test_semantic_kernel.py
review_set: subset
---

## Summary

Ticket: QSL-769. The test edit deletes only the `.github` rglob assertion in `test_the_emitted_set_the_manifests_and_the_generator_are_as_declared` and rewords its comment. The CON-4, CON-5 manifest and CON-6 assertions are unchanged, and no other behaviour changed. The deleted assertion guarded no publication: no workflow publishes the kernel tree. The PR body says publication "stays guarded by the manifest and packed-file-list checks". The packed-file-list check (TC-1065, AC-15) cannot fail, though.

## Verdict

FINDINGS: one medium, raised against the PR-body claim. It is a recorded medium and does not block merge. The test edit itself is correct.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | The AC-15 packed-list check runs `npm pack --dry-run` on the private root, whose `.npmignore` is `*`. It cannot fail, and it never packs the two published packages. The PR body's "packed-file-list checks" guard is vacuous. Publication is actually safe because those packages' `files` lists stay inside their own directories. | tests/test_semantic_kernel.py:468-478 |

## Coverage

Code-review over the one changed Python test, plus the TC-1065 test the PR body leans on. Recorded low: the CON-5 manifest assertion reads only the root `package.json` and `pyproject.toml`, not `packages/semantic-core/package.json` or `schema/package.json`, although CON-5 says "any npm manifest". This predates the PR. No build was run. The coder's focused log shows 10 passed.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: tests/test_semantic_kernel.py
  path: tests/test_semantic_kernel.py
  role: examined
  excerpt: "# CON-5: no distribution manifest names the semantic-kernel tree.\n    for manifest in (REPO / \"package.json\", REPO / \"pyproject.toml\"):\n        assert \"semantic-kernel\" not in manifest.read_text(encoding=\"utf-8\")"
- id: .npmignore
  path: .npmignore
  role: context_only
  excerpt: "# The private workspace root has no distribution payload. ...\n*"
```

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 5dd885c3b545131b1ca9d64adc754c9e5ae32131 (PR body corrected at this head; the vacuous TC-1065 check is unchanged and needs a follow-up ticket) |
