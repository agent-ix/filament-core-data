---
id: SR-15521
title: STD-295 PR 301 spec-review EARS conformance
type: SpecReview
analysis: ears-conformance
scope: "agent-ix/filament-core-data@2469e44cf3ad15cf6f1df0fc7ba35c6b803070cb; PR 301; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md"
review_set: subset
---

## Summary

Ticket: STD-295. EARS pass of `/quoin:spec-review` over every SHALL statement in FR-146 at head 2469e44c: 38 SHALL lines in Description, Behavior and Constraints. The quire engine's grammar linter (`quire validate` on the file) raises no warning. The findings below come from a manual reading, because the linter checks one line at a time and misses statements that wrap across lines.

## Verdict

PASS with low findings only. Every refusal statement uses the event-driven or unwanted-behaviour form ("If ..., then the reader SHALL refuse `<code>` at <locus>"), with a named agent and a code. The Behavior statements are ubiquitous with a named agent (the reader, every generation backend, the compatibility classifier).

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | Several bullets bind two or three obligations in one statement, or mix MAY and SHALL: Clock resolution (two SHALLs), clock field shape (a SHALL plus a conditional SHALL refuse), `dimensions` (MAY plus SHALL), name and identity (two SHALLs), units (SHALL plus MAY), the root unit (two SHALLs), unresolved dimension and unit references (two conditions with two SHALLs), and unit-typed member (three obligations). Each should become one statement per obligation, so that a TC can trace each one separately. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:82-84, 91-96, 106-109, 123-127, 136-141, 173-178 |
| FND-002 | low | Three statements name no agent. "The normalized form (FR-069) SHALL keep ..." and "A document with no `dimensions` and no `units` SHALL serialize with neither member" should name the normalizer. "No member of the IR SHALL carry a clock's value" is a negative ubiquitous statement with no agent and no verification: it is already enforced by INVALID_CLOCK_FIELD (`defaultValue`) and by populations naming objects, so it belongs in the rationale. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:100-102, 182-188 |

## Coverage

All 38 SHALL lines were read. The refusal statements for CLOCK_OUTSIDE_FIELD, INVALID_CLOCK_FIELD, UNRESOLVED_DIMENSION_REF, UNRESOLVED_UNIT_REF, INVALID_UNIT_GRAPH, INVALID_OPERAND, UNRESOLVED_TYPE_REF, INVALID_QUANTITY_MEMBER and UNDECLARED_LOSS each have a trigger, an agent, a code and a locus. Whether those codes are exclusive, and where INVALID_UNIT_GRAPH is located, are semantic questions recorded in SR-15522.

## Examined scope

```yaml
scope:
- {id: FR-146, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Every IR reader SHALL resolve the native reference `ix://quire/native/Clock` as a field type that names no node of the document, as it resolves the other native references of FR-092, and SHALL resolve it to no IR scalar."}
- {id: FR-146-CON-1, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Every IR reader SHALL return the same verdict, code and locus for each clock, dimension, unit and unit-reference case of this requirement."}
- {id: FR-146-CON-2, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them."}
```

## New findings (disposition pass 1)

Head edceaaac288b147eb40d37ba46ccbd2673dbd4d0.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-003 | low | Line 271, "The fingerprint form (FR-069) SHALL keep the same authored order", names no agent; name the canonicalizer or fingerprint function (`fingerprintIrForTarget`). | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:271-275 |

## Dispositions

Round 1, head edceaaac288b147eb40d37ba46ccbd2673dbd4d0 (fix commit edceaaa).

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | still-open | Most cited bullets are split (clock shape, dimensions, unit-typed member), but three compound statements remain: lines 177-178 ("A unit node SHALL carry ... and SHALL admit an optional `target`"), 181-182 ("`dimension` and `target` SHALL be semantic identities, and `scale` and `offset` SHALL be strings"), 183-184 ("A unit edge SHALL mean ..., and a unit with no `target` SHALL be its dimension's root"), plus 237-238 (SHALL NOT resolve ... and SHALL raise no diagnostic). Low severity; split, or the lead records accepted-no-change. |
| FND-002 | fixed | - |
| FND-001 | fixed | round 2, head e8a665f |
| FND-003 | fixed | round 2, head e8a665f |
