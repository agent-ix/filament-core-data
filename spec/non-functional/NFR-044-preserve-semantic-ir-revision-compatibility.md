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

The semantic IR schema and its readers SHALL refuse every document declaring
`contractVersion` `1.0.0` or `1.1.0` with `SCHEMA_VIOLATION`, and SHALL keep
the reader verdict and canonical bytes of every published fixture declaring
`contractVersion` `2.0.0` (fcd#179: `1.0.0` and `1.1.0` are deleted contracts,
not additively subsumed ones).

## Scope

- Applies to the published semantic IR schema, the Node, Python and Rust
  readers, the normalizer and the compatibility classifier.
- Excludes a document authored as `2.0.0`, which carries the `any` scalar,
  authored presence, the model members of FR-141 or the constructs of FR-142.

## Rationale

Contract `2.0.0` is the only contract the schema admits (fcd#179). A document
declaring `1.0.0` or `1.1.0` is refused outright, before a reader evaluates
any field, so no reader ever derives a verdict from a deleted contract's
rules. A fixture already ported to `2.0.0` keeps its reader verdict and
canonical bytes; a contract-version move classifies under FR-051's general
rule, never a special case tied to the specific versions `1.1.0` and `2.0.0`.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| A document declaring `contractVersion` `1.0.0` or `1.1.0` | Refused with `SCHEMA_VIOLATION` | Refused with `SCHEMA_VIOLATION` | Schema test |
| Published `2.0.0` fixture reader verdicts and canonical bytes | Identical | Identical | Differential and snapshot test |
| A contract-version move | Conditional | Conditional | Compatibility test |

## Verification

The conformance corpus runs every reader over every published `2.0.0` case
and compares canonical bytes to the committed fixtures, and confirms a
fixture still declaring `1.0.0` or `1.1.0` is refused; the compatibility
classifier classifies a contract-version move as conditional.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-044-AC-1 | Every published fixture declaring `contractVersion` `2.0.0` keeps its Node, Python and Rust reader verdict and its canonical bytes; a published fixture still declaring `1.0.0` or `1.1.0` is refused by every reader with `SCHEMA_VIOLATION` at `contractVersion`. | Test (TC-1756) |
| NFR-044-AC-2 | The compatibility classifier reports a contract-version move, such as `1.1.0` to `2.0.0`, as `conditional`, never a version-literal-specific `additive` special case. | Test (TC-1757) |
