---
id: SR-146
title: "Failure domain review of the semantic kernel packages"
type: SpecReview
analysis: failure-domain
scope: "US-014, FR-081..090, NFR-028..030"
review_set: all
---
# Failure domain review

## Summary

Asks what breaks, who notices, and how long a wrong answer survives.

## Verdict

**CONDITIONAL** — one failure mode is silent by construction and needs an
explicit detector.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1370 | high    | A generated package that disagrees with the grammar in a direction no fixture exercises fails nowhere: it imports, type-checks and validates, and is wrong only for inputs nobody wrote a case for | FR-090 |
| FND-1371 | medium  | A stale generated package is indistinguishable from a current one at the import site; only the fingerprint distinguishes them, and only if something compares it | FR-081, FR-084 |
| FND-1372 | medium  | The blast radius of a wrong kernel is every consumer of every module, because the kernel is what the modules import | US-014 |
| FND-1373 | low     | Generation refusing is safe: FR-084 refuses an unrepresentable construct rather than emitting a degraded type, which fails loudly at build time | FR-084 |

## The silent mode

A generated type is wrong in the way that matters when it accepts something the
contract forbids, or rejects something the contract admits, for an input no
fixture contains. Every suite passes. The package imports. The failure appears
later, in a consumer, as a type that does not describe its data.

This program has met that shape repeatedly today, in a smaller form: a test
whose subject was refused before the guard ran, so deleting the guard changed
nothing; a binder that could not read a file and reported its rows as unbacked;
a census that read zero types and reported a clean run. In each case the tool
said what it always says.

The detector is the conformance corpus, not a new comparison. It carries 111
cases and an independent oracle that was written against the contract rather
than against any implementation.

## What fails loudly, and should stay that way

`FR-084`'s refusal path is the good case: an unrepresentable construct stops
generation with a named diagnostic rather than emitting `String` or `Value`.
The Rust backend held that line under real pressure — RE2 could not compile a
published pattern, and #21 wrote a proved validator rather than degrade the
field. Preserve that: the loud failure is the feature.
