---
id: NFR-044
title: "Refuse retired semantic IR contract versions"
type: NFR
quality_attribute: compatibility
---
# NFR-044: Refuse retired semantic IR contract versions

## Statement

The semantic IR schema and its readers SHALL refuse every document declaring
`contractVersion` `1.0.0` or `1.1.0` with `SCHEMA_VIOLATION`, because `2.0.0`
is the only contract the schema admits.

## Scope

- Applies to the published semantic IR schema, the Node, Python and Rust
  readers and the compatibility classifier.

## Rationale

Contract `2.0.0` is the only contract the schema admits. A document
declaring `1.0.0` or `1.1.0` is refused outright, before a reader evaluates
any field, so no reader ever derives a verdict from a deleted contract's
rules. A contract-version move classifies under FR-051's general rule, never
a special case tied to the specific versions `1.1.0` and `2.0.0`.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| A document declaring `contractVersion` `1.0.0` or `1.1.0` | Refused with `SCHEMA_VIOLATION` | Refused with `SCHEMA_VIOLATION` | Schema test |
| A contract-version move | Conditional | Conditional | Compatibility test |

## Verification

Every reader is run over a document still declaring `1.0.0` or `1.1.0` and
must refuse it; the compatibility classifier classifies a contract-version
move as conditional.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-044-AC-1 | A document still declaring `1.0.0` or `1.1.0`, exercised over an inline document, is refused by every reader with `SCHEMA_VIOLATION` at `contractVersion`. | Test (TC-1756) |
| NFR-044-AC-2 | The compatibility classifier reports a contract-version move, such as `1.1.0` to `2.0.0`, as `conditional`, never a version-literal-specific `additive` special case. | Test (TC-1757) |
