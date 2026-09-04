# TypeScript backend regression fixture

`input/semantic-ir.json` is the conformance core IR reduced to the one document
that exercises every supported IR kind. `expected/` is the deterministic package
produced by `make generate-typescript`; it is a regression baseline, not an
oracle. The independent oracle remains the conformance adapter, and runtime
instance behavior is checked by the AJV differential fixtures.

`type-level.ts` typechecks the exported surface under `exactOptionalPropertyTypes`.
The `negative/` programs are deliberately compiled separately: each records the
specific TypeScript diagnostic that proves a forbidden surface does not compile.
