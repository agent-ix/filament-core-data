---
id: SR-11189
title: QSL-769 PR 286 spec-review
type: SpecReview
analysis: base
scope: agent-ix/filament-core-data@3e33a1aeeb319d65f49ff2168dd4f1d25afe505e; PR 286;
  spec/functional/FR-087-generate-the-kernel-python-package.md, spec/tests.md
review_set: subset
---

## Summary

Ticket: QSL-769. Reviewed the FR-087 and TC-1059 edits that remove the rule forbidding any `.github/` workflow from naming `semantic-kernel`, per the owner's ruling that naming it there is fine. The CON-5, AC-15 and TC-1059 edits are correct. No workflow publishes the kernel tree: `schema-release.yml` publishes only `packages/semantic-core` and `schema`, and names the kernel tree only in a `cargo fetch` cache-warming step and comments. So no narrower "a workflow must not publish it" clause is needed. One clause of the same rule is still in the FR-087 statement body.

## Verdict

FINDINGS: one high. The FR-087 layout statement still requires that the tree be reachable from no workflow under `.github/`. That contradicts the amended CON-5 and AC-15, and `schema-release.yml` breaks it.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The FR-087 statement still says the kernel tree SHALL NOT be reachable "from any workflow under `.github/`". The removed rule survives in the requirement body, and `schema-release.yml` contradicts it. | spec/functional/FR-087-generate-the-kernel-python-package.md:90 |

## Coverage

Base spec-review over the changed requirement units only. Recorded lows: CON-5 now reads "to `pyproject.toml`'s ..., to any npm manifest's `files` or `exports`." and lost the "or" in its list. No other spec, test, plan or doc cites the removed clause. Plan-010 mentions `.github/**` only for an unrelated Rust CI prohibition.

Plan completion: not assessed

## Examined scope

```yaml
scope:
- id: FR-087-CON-5
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: "This requirement SHALL add no path under `packages/semantic-kernel/` to `pyproject.toml`'s `packages` or `include`, to any npm manifest's `files` or `exports`. Publication passes `agent-ix/quoin#290`."
- id: FR-087-AC-15
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: "No path under `packages/semantic-kernel/` appears in the packed file list of any distribution this repository builds, checked against the packed list rather than the manifest text alone."
- id: FR-087
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: "The emitted tree SHALL live under `packages/semantic-kernel/python/`, alongside the kernel's other target packages, and SHALL be reachable from no distribution manifest: not from an npm `files` or `exports` entry, not from `pyproject.toml`'s `packages` or `include`, and not from any workflow under `.github/`."
- id: TC-1059
  path: spec/tests.md
  role: examined
  excerpt: "No not-qualified family emits and no distribution manifest names the tree, and the generator stays one pinned attributed third-party dependency"
- id: .github/workflows/schema-release.yml
  path: .github/workflows/schema-release.yml
  role: context_only
  excerpt: "case \"$PKG\" in semantic-core) DIR=\"packages/semantic-core\" ;; semantic-schema) DIR=\"schema\" ;; ... npm publish"
```

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 5dd885c3b545131b1ca9d64adc754c9e5ae32131 |
