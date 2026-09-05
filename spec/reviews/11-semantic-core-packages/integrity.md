---
id: SR-141
title: "Integrity review of the semantic kernel packages"
type: SpecReview
analysis: integrity
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# Integrity review

## Summary

Checked for statements that contradict each other, criteria that no test case
reaches, and claims the specification cannot support.

## Verdict

**CONDITIONAL** — no contradiction found; two claims are stronger than their
evidence.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1350 | low     | `FR-081-CON-5` forbids this requirement implementing a generator while FR-085..087 generate; the two are consistent because CON-5 is scoped to FR-081, which declares rather than produces | FR-081-CON-5, FR-085, FR-086, FR-087 |
| FND-1351 | medium  | The specification asserts determinism across three language toolchains but pins the toolchain for only some of them; an unpinned formatter moves a byte-compared artifact | NFR-028 |
| FND-1352 | medium  | No criterion is orphaned, but twelve carry more than one obligation, so twelve of the 312 mappings are weaker than the count implies | SR-142 |
| FND-1353 | low     | The bundle declaration is required to be a committed artifact read at run time rather than a list restated in a module, which is the same discipline that made the #21 support matrix enforceable | FR-081-CON-2 |

## The determinism claim

`NFR-028` asserts byte-identical output across runs. Issue #23 learned the
precise shape of this: its `toolchain_fingerprint` is computed over the
**declared** toolchain only, explicitly so that a patch-level interpreter or a
formatter bump cannot move a byte-compared artifact, and it names that coupling
as issue #42's.

A three-language determinism claim has three of those couplings. FND-1351 is
not a claim that the specification is wrong — it is that the claim is only as
strong as the weakest pin behind it, and the pins are not yet uniform across
Rust, TypeScript and Python.

## What was checked and found sound

- Every one of the 312 criteria appears in exactly one `Traces To` cell.
- No requirement forbids what another requires.
- The prohibited-path lists do not overlap the output paths, so no requirement
  is unsatisfiable by construction.
