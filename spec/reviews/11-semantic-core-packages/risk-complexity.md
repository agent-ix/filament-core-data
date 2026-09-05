---
id: SR-144
title: "Risk and complexity review of the semantic kernel packages"
type: SpecReview
analysis: risk-complexity
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# Risk and complexity review

## Summary

Four generated targets in three languages, with a cross-language agreement
obligation on top. The complexity is not in any one generator; it is in the
claim that they agree.

## Verdict

**CONDITIONAL** — the highest risk is a silent disagreement between languages
that every individual suite reports as green.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1360 | high    | Cross-language agreement can fail while all three per-language suites pass, and nothing outside FR-090 would report it | FR-090 |
| FND-1361 | medium  | Three toolchains means three determinism couplings; a formatter bump in any one moves a byte-compared artifact in that language only | NFR-028 |
| FND-1362 | medium  | The Rust target carries an unresolved pattern gap that must not be closed by weakening what #21 refused to weaken | FR-086, GAP-002 |
| FND-1363 | low     | Package metadata for three ecosystems is mechanical but unforgiving: a wrong `files` list ships a package that imports and then fails at the first `$ref` | FR-085, FR-086, FR-087 |

## The agreement risk, concretely

Each language package will have a suite that passes. The question FR-090 asks
is different: given one input, do the three produce the same answer about
serialized names, nullability, defaults, unknown states and relation
semantics?

That question has exactly the shape the conformance corpus exists to answer,
and the corpus already exists — 111 cases, four bases, an independent oracle.
FR-090 should be evidenced through it rather than through a fourth comparison
written for this issue. A comparison written alongside the thing it compares
tends to agree with it.

## Precedent worth carrying

`#21` shipped a proved hand-written validator rather than degrading a
constrained field to `String`, and measured the equivalence over 1,211,394
subjects. `#22` refused to move two corpus cases because a backend may not edit
the yardstick it is measured against. Both are the same instinct, and both
apply here: this issue packages three implementations of one contract, and the
cheapest way to make them agree is to weaken what they must satisfy.
