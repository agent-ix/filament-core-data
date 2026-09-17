---
id: NFR-044
title: "Preserve semantic IR revision compatibility"
type: NFR
quality_attribute: compatibility
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-106"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-139"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-142"
    type: "constrains"
---
# NFR-044: Preserve semantic IR revision compatibility

## Statement

The semantic IR schema and its readers SHALL keep the reader verdict and
canonical bytes of every published `1.0.0` and `1.1.0` semantic IR document
while they admit contract revision `2.0.0`.

## Scope

- Applies to the published semantic IR schema, the Node, Python and Rust
  readers, the normalizer and the compatibility classifier.
- Excludes a document authored as `2.0.0`, which carries the `any` scalar,
  authored presence, the model members of FR-141 or the constructs of FR-142.

## Rationale

Contract `2.0.0` is additive (issue #93, issue #146, issue #172). A consumer that reads
`1.1.0` documents receives the same valid document and the same fingerprint,
and a `2.0.0` node inside a `1.1.0` document is refused, never read as a
`1.1.0` node.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Published `1.1.0` reader verdicts | Identical | Identical | Differential test |
| Published `1.1.0` canonical bytes | Identical | Identical | Snapshot test |
| `1.1.0` to `2.0.0` classification | Additive | Additive | Compatibility test |

## Verification

The conformance corpus runs every reader over every published `1.0.0` and
`1.1.0` case and compares canonical bytes to the committed fixtures; the
compatibility classifier classifies the `1.1.0` to `2.0.0` uplift.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-044-AC-1 | Every published `1.0.0` and `1.1.0` fixture keeps its Node, Python and Rust reader verdict and its canonical bytes under the `2.0.0` schema, and a `1.1.0` document carrying any `2.0.0` node is refused with `SCHEMA_VIOLATION`. | Test (TC-1756) |
| NFR-044-AC-2 | The compatibility classifier reports the `1.1.0` to `2.0.0` uplift of one document as additive. | Test (TC-1757) |
