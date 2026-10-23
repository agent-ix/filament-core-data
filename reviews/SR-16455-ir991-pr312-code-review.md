---
id: SR-16455
title: "IR-991 PR 312 code, Rust and TypeScript review"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@d3080d6f24f05428b35c1a450b2ab78a055b0930; IR-991 PR #312; Rust and TypeScript readers, schema, graph, diagnostics, fixtures and focused tests"
review_set: subset
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-146", type: references }
---
# SR-16455: IR-991 PR 312 code, Rust and TypeScript review

## Summary

Independent review of the exact PR head, restricted to the diff against FCD main 5a6bc505. The Rust and TypeScript readers admit Clock only in field positions and well-formed quantity references in member positions, validate the dimension/unit graph, and preserve distinct schema versus semantic diagnostics. The authored raw cases cover graph cycles, duplicate identities, canonical i128 operands, Clock shape, quantity shape and malformed references. The two language implementations and the independently checked TypeScript reader were inspected for ordering and diagnostic parity.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Scope examined

- FR-146-AC-1: Clock field admission and no synthetic IR scalar, including the already merged IR-990 behavior.
- FR-146-AC-2: Clock non-field rejection and field-shape diagnostic precedence.
- FR-146-AC-3: admitted base, derived and dimensionless dimensions with root and scaled units.
- FR-146-AC-4: graph references, cycles, duplicate identities, ordering and root constraints.
- FR-146-AC-5: canonical rational and i128 boundary handling.
- FR-146-AC-6 and AC-9: quantity type references, shape and qualified names.
- AC-7 classifier mapping and AC-8 generation backend loss are excluded to IR-993; this PR does not claim their completion.
- Reviewed the 21 changed paths, including the generated fixture datasets, schema and diagnostic registry. No CI or gate file changed. `git diff --check` passed. The author-reported focused tests were treated as evidence to inspect, not independently rerun; no aggregate gate was run.

## Verdict

PASS for the diff-scoped code/Rust/TypeScript review at the exact head. The separate gap-analysis artifact records missing matrix trace bindings.
