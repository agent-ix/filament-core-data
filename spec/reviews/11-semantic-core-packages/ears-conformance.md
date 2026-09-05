---
id: SR-142
title: "EARS conformance review of the semantic kernel packages"
type: SpecReview
analysis: ears-conformance
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# EARS conformance review

## Summary

Measured with `quire validate --summary` over the fourteen documents this issue
adds: **7 of 14 are grammar-clean (50%)**, with **12 `ears:non-singular`
findings** across seven documents. No `unclassifiable` or `missing-subject`
finding was raised.

## Verdict

**CONDITIONAL** — twelve statements pack more than one obligation. The matrix
must not be called complete while they stand.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1300 | high    | Twelve requirement statements carry more than one `SHALL`, so their criteria cannot map cleanly to one test case each | FR-082:148, FR-083:135, FR-084:150, FR-086:123/128/131, FR-089:251/252, FR-090:297/305/307 |
| FND-1301 | medium  | The Test Matrix maps 312/312 criteria while twelve of those criteria are non-singular, so the coverage they appear to have is illusory | spec/tests.md TC-1000..1108 |
| FND-1302 | low     | Half the documents are grammar-clean; the seven that are not are all functional requirements, none non-functional | spec/functional/ |

## Evidence

`quire validate --scope . "spec/functional/FR-08*.md" … --summary`:

```
7/14 docs grammar-clean (50%); 12 grammar finding(s): ears:non-singular=12
```

## Bad rule or bad corpus

**Bad corpus.** Read rather than inferred. `FR-086-CON-2` states that the
committed `Cargo.toml` shall carry `publish = false` **and** that no step shall
invoke `cargo publish` — two obligations, verifiable independently, failing for
different reasons. `FR-086-CON-7` packs three: no registry contact, an offline
build against a pinned crate, and a failure when that crate is absent.

The rule reads these correctly. The statements genuinely carry more than one
obligation, and splitting them is work rather than a rule to widen.

## Disposition

The twelve are owned by this issue and must be split before the matrix is
marked complete. Every matrix row remains `🚧 planned`, so no coverage is being
claimed that these findings would undermine — the illusory-coverage risk in
FND-1301 is recorded against a matrix that claims nothing yet.
