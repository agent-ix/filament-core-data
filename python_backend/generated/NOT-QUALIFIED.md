# Families with no emitted package

These families were declared, measured, and judged. The absence of a
package is a recorded decision, not an omission.

## `stdlib_dataclass` — not-qualified

Output family: `dataclasses.dataclass`.

Constructs it loses:

- `alias`
- `closure-additional`
- `closure-unevaluated`
- `constraints-array-unique`
- `constraints-numeric`
- `constraints-string`
- `description`
- `map-additional`
- `map-pattern`
- `string-format`
- `union-discriminated`

## `typed_dict` — not-qualified

Output family: `typing.TypedDict`.

Constructs it loses:

- `constraints-array-unique`
- `constraints-numeric`
- `constraints-string`
- `default-non-nullable`
- `description`
- `map-additional`
- `map-pattern`
- `string-format`
- `union-discriminated`
