---
id: SR-145
title: "Scope boundary review of the semantic kernel packages"
type: SpecReview
analysis: scope-boundary
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# Scope boundary review

## Summary

The issue is titled "Generate **and publish** semantic-core packages". This
specification generates and does not publish, and the boundary is drawn
explicitly rather than left to be inferred from what the code happens to do.

## Verdict

**PASS** — the boundary is stated, constrained and testable.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1340 | low     | Publication is excluded by constraint, not by omission: no step may invoke `cargo publish`, `npm publish` or a PyPI upload | FR-086-CON-2 |
| FND-1341 | low     | The prohibited-path lists name existing artifacts the issue must leave byte-unchanged, so the boundary is checkable rather than declarative | FR-081-CON-1, FR-086-CON-10 |
| FND-1342 | medium | The deliverable the issue title promises is only half delivered by this specification, and the other half is gated on a human decision that has not been taken | agent-ix/quoin#290 |

## Why the boundary is where it is

Publication passes `agent-ix/quoin#290`, a human sign-off. The campaign's own
rule is that pulling the build forward does not pull the promotion gate
forward: the compiler chain was pulled forward on 2026-09-03 precisely on the
understanding that the promotion gate stayed where it was.

Building the packages and stopping at the gate is therefore the whole of what
this issue may do. FND-1342 records that the title over-promises relative to
what is deliverable, so a later reader does not treat the unpublished packages
as an incomplete delivery.

## What this issue must not touch

`packages/semantic-core/generated/`, `schema/semantic/v1/`, the fixture trees,
the repository root `package.json`, `src/compiler/backends/**`, `Cargo.lock`,
`rust-toolchain.toml`, `rustfmt.toml`, `.cargo/config.toml`, `tsconfig.json`
and `.github/**`.

Those lists are byte-unchanged assertions rather than intentions. The
merge-degrading guard family — eight instances across this campaign — is the
reason they are stated as tree assertions over a fixed set rather than as a
diff against a moving ref.
