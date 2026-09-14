---
id: SR-214
title: "base review of the endpoint type-resolution and direction batch"
type: SpecReview
analysis: base
scope: "spec/functional/FR-127, spec/functional/FR-128, spec/functional/FR-129, spec/usecase/US-018"
review_set: subset
---

## Summary

The base checklist was applied to the four artifacts of the endpoint
type-resolution and direction batch: ID formats, uniqueness and sequence are
clean, every relative link resolves, and `quire validate` reports the batch free
of errors and warnings. The batch fails the coverage rule outright because no
test case is bound to any of its twenty-seven acceptance criteria yet, and it
carries three substantive gaps: refusals are named in prose rather than by the
stable codes the crate already defines, no bound is stated on the native artifact
this batch newly reads, and one acceptance criterion silently requires six
fixtures rather than one.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| ------- | -------- | -------------------------------- | ------ | ------ |
| FND-701 | high | No test case is bound to any acceptance criterion in the batch: FR-127 carries nine, FR-128 eight and FR-129 ten, and `spec/tests.md` binds none of the twenty-seven. The coverage rule, the error-path rule and the constraint-boundary rule are all unmet until the matrix step allocates TC-1700 onward. | FR-127, FR-128, FR-129 | correct-requirement-no-evidence |
| FND-702 | medium | The batch names its refusals by description ("a refusal distinct from the one raised for a declared record", "refused at the admission seam") but never by stable code, while the crate already defines stable codes for exactly this purpose. No acceptance criterion can assert on a code that the requirement does not name, so a correct-looking test could pass on the wrong refusal. | FR-127-AC-2, FR-127-AC-3, FR-128-AC-3, FR-129-AC-5 | wrong-requirement |
| FND-703 | medium | FR-129 makes the producer read a native artifact for the first time, and states no bound on it: no maximum artifact byte length, no maximum export-table cardinality, and no bound on the transitive native definition closure it requires complete. The static document already carries a one-megabyte ceiling; the artifact on the other side of the correspondence carries none. | FR-129, FR-129-CON-1 | missing-requirement |
| FND-704 | medium | FR-127-AC-4 requires admission "under each of `enum`, `object`, `record`, `reference`, `scalar`, and `variant` in turn", which is six admitted fixtures presented as one criterion. FR-127-AC-3 has the same shape across five refused kinds. Stated this way the criteria understate the fixture count the matrix must allocate, and a partial implementation covering two kinds would read as satisfying the row. | FR-127-AC-3, FR-127-AC-4 | wrong-requirement |
| FND-705 | low | FR-128 closes the direction vocabulary but leaves `category`, `lifecycle` and `ownership` as unvalidated producer-defined strings in the same `RelationshipSemantics` record, and the batch does not say whether that asymmetry is deliberate. A reader cannot tell from the batch whether the other three are out of scope by decision or by omission. | FR-128 | missing-requirement |
| FND-706 | low | US-018 states the need for real native bytes but names no criterion for what makes an artifact the right one to select, beyond its being real. Two different real artifacts would both satisfy every acceptance example, so the story does not constrain the choice the fixture makes. | US-018 | missing-requirement |
