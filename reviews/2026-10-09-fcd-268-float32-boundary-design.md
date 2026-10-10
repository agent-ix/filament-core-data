# Float32 JSON Schema boundary design (AGE-2229 / FCD-268)

Contract: the TypeScript/oracle evaluates a JSON number `x` by round-to-nearest-even binary32, then applies the authored constraint to that rounded value. JSON Schema/Ajv compares the original binary64 `x`; each emitted boundary therefore represents the exact preimage under `fround`.

| authored condition | accepted rounded values | JSON Schema representation for doubles |
|---|---|---|
| `min(c)` | `fround(x) >= fround(c)` | lower midpoint between predecessor and `r=fround(c)`; inclusive at midpoint when ties-to-even rounds to `r`, otherwise use exclusive lower bound; if predecessor is `-Infinity`, use finite overflow midpoint between `-FLOAT32_MAX` and overflow |
| `max(c)` | `fround(x) <= fround(c)` | upper midpoint between `r` and successor; inclusive at midpoint when ties-to-even rounds to `r`, otherwise use exclusive upper bound; if successor is `+Infinity`, use finite overflow midpoint |
| `exclusiveMin(c)` | `fround(x) > fround(c)` | same lower midpoint, but exact `r` excluded; combine midpoint strictness with `exclusiveMinimum`/`minimum` so ties that round to `r` are excluded |
| `exclusiveMax(c)` | `fround(x) < fround(c)` | same upper midpoint, but exact `r` excluded; combine midpoint strictness with `exclusiveMaximum`/`maximum` |
| `enum` | `fround(x)` equals one authored float32 value | preserve enum values as float32 representatives; add range only as needed; every neighbor and midpoint must agree with TS/oracle |
| `unique` | uniqueness after binary32 rounding | schema alone cannot express post-rounding uniqueness; retain semantic metadata/reader behavior and test duplicate rounded values |
| defaults | default value is validated by rounded semantics | defaults must remain finite JSON numbers; never serialize `Infinity`/`NaN`/`null`; overflow endpoints use finite midpoint |

Boundary matrix must cover each authored bound at predecessor, exact, successor, both binary64 midpoints, signed zero, smallest subnormals, `+/-FLOAT32_MAX`, and finite overflow midpoints, comparing TS, Ajv, and the oracle.
