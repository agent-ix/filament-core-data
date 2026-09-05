---
id: SR-143
title: "Dependency review of the semantic kernel packages"
type: SpecReview
analysis: dependency
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# Dependency review

## Summary

Every upstream this issue needs is merged. The one thing it waits on is a human
decision, not code.

## Verdict

**PASS** — no unmet code dependency; one declared gate.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1320 | low     | All three codegen backends are merged on `main`, so the generators this issue drives exist | #21 `89e0ea1`, #22 `65ea7fa`, #23 `4e5c241` |
| FND-1321 | low     | The grammar this issue packages is merged and published as `@agent-ix/semantic-core@0.1.0` | #35, #40 |
| FND-1322 | medium | Publication is blocked on a human gate that has not moved, and no code change in this repository can unblock it | agent-ix/quoin#290 |
| FND-1323 | medium | The Rust target inherits an unresolved contract gap: RE2 cannot compile the published `sourceLocus` pattern, which #21 carried with a proved hand-written validator rather than a weakened pattern | #21, GAP-002 |

## Upstreams, with their merge commits

| Dependency | State |
|---|---|
| `#34` IR v1.1 | merged `014bff7` |
| `#35` semantic-core grammar | merged `d48b8da` |
| `#19` compiler core | merged `f412bda` |
| `#20` conformance corpus | merged `c1b8807`, repaired `9a623c9` |
| `#21` Rust/Serde backend | merged `89e0ea1` |
| `#22` TypeScript backend | merged `65ea7fa` |
| `#23` Python backend | merged `4e5c241` |

## What depends on this issue

`agent-ix/quoin#287` cannot start until this issue produces package
coordinates. That ticket locks "package coordinates, fingerprints, targets and
the imported `semantic-core` version"; locking coordinates nothing publishes
would pin a fiction that validates, which is worse than an absent lock because
it reports success.

## The inherited Rust gap

`#21` found that RE2 — and therefore the Rust `regex` crate — cannot compile
the published `sourceLocus` pattern, which uses four ECMAScript lookaheads. It
did not weaken the pattern or degrade the field to an unvalidated `String`; it
carried a hand-written validator with the equivalence measured differentially
over 1,211,394 subjects at zero disagreements.

This issue packages that crate. The gap travels with it, and FR-086 must not
resolve it by relaxing what #21 refused to relax.
