---
id: Task-104
title: "Representability and declared loss under a `fail` policy"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-103"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-802"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-804"
    type: verifies
---
# Task-104: Representability and declared loss under a `fail` policy

## Scope

Land `loss.mjs`: the target-level judgement about what TypeScript can represent, in the backend's own diagnostic namespace, never mixed into an admissibility answer.

## Subtasks

- [ ] Implement `representability(ir)` returning the declared target losses, each naming the construct and its owning type identity under the `agent-ix.typescript-backend.` prefix.
- [ ] Declare the losses: an operation (the generated surface is data, not behaviour); a clause (clause semantics belong to `agent-ix/quire-contract-ir#52`); an unimplemented `format` name; a `defaultKind` of `representation` or `migration` at generation time; and an ordering constraint — `min`, `max`, `exclusiveMin`, `exclusiveMax` — on a `duration` subject, because ISO-8601 designators have no total order and inventing one is worse than refusing.
- [ ] Keep representability out of the admissibility answer entirely. A document can be admissible and unrepresentable; that is a refusal to generate, not a claim that the document is invalid, and the separation is what keeps the adapter's positional diagnostic comparison from failing on target-specific loss.
- [ ] Honour the committed target contract's `unsupportedFeaturePolicy` of `fail`: a declared loss emits zero files under manifest state `unsupported`, while an admissibility `lossy` result generates with files under state `lossy`.
- [ ] Assert that a `union` at `unknownPolicy: "surface"` and a `map` at `unknownPolicy: "preserve"` — both of which the committed bases carry — yield neither a diagnostic nor a declared loss, because `unknownPolicy` is meaningful only on a `record`.
- [ ] Add the static analysis: `admit.mjs` and `loss.mjs` import no module of the compiler's reader, schema layer, applicability table or diff, and none under `conformance/`.

## Deliverables

- `src/compiler/backends/typescript-v1/loss.mjs`, `loss.d.mts`

## Notes

- The `bytes` reading and the union discriminator's wire shape are open contract questions filed as issue #58, where issue #21 has already recorded a differing reading. This backend states its reading as a declared decision pending #58 and does not present it as settled.
- `conformance/thresholds.json` permits this slot zero divergences, so a reading that #58 settles the other way produces a reported failure for the owner, not a suppression.
