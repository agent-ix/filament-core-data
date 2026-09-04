---
id: Task-106
title: "The type projection and identifier minting"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-105"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-756"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-757"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-758"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-759"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-760"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-761"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-762"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-763"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-764"
    type: verifies
---
# Task-106: The type projection and identifier minting

## Scope

Land `types.mjs` and `names.mjs`: one declared rendering for each of the eight IR kinds and each of the nine scalars, with the three field axes kept distinct and identifiers minted collision-free.

## Subtasks

- [ ] Render each kind by its declared form: `scalar` as an exported alias to the TypeScript primitive; `record` as an interface with no `extends`, because the contract IR carries no base; `enum` as a union of string literals of the variant names; `union` as a discriminated union with an exported discriminant constant; `alias` as a type alias that survives so the validator has somewhere to hang its constraints; `reference` as an opaque branded type; `sequence` as `readonly T[]`; `map` as a string-keyed readonly index type.
- [ ] Render the three field axes independently and never collapse two of them: `presence` gives the `?`, `nullable` gives the `| null`, and a multiplicity whose `upper` is absent or greater than one gives the `readonly T[]`. The four presence/nullability combinations are four distinct rendered forms and `undefined` never appears in a required field's type.
- [ ] Render `unknownPolicy` only on a `record`; carry it into metadata for the other seven kinds with no rendering effect.
- [ ] Render the `ix://agent-ix/semantic-core/ext/doc` extension's text as a JSDoc comment on the declaration or property it sits on.
- [ ] Render no relationship descriptor — FR-067 is the descriptor's one owner — and no relationship or operation member inside a record's interface.
- [ ] Mint identifiers in `names.mjs`: derive from `displayName`, mangle a TypeScript reserved word deterministically, and raise `agent-ix.typescript-backend.IDENTIFIER_COLLISION` when two distinct identities would collide — detected while building the model, before any file could be emitted.
- [ ] Guard the hazardous names: `constructor`, `__proto__`, `toString`, and the generated discriminant constant's own name.
- [ ] Emit declarations in code-point order of `identity`; declaration order is not recoverable from the document.
- [ ] Render a cycle as an ordinary mutually-recursive TypeScript declaration without unbounded recursion in the renderer.
- [ ] Keep the renderer pure: same model in, same string out, no filesystem, clock, environment or network.
- [ ] Assert no `any` in a type position in rendered code, while leaving the word alone inside a JSDoc comment rendered from a `doc` extension.

## Deliverables

- `src/compiler/backends/typescript-v1/types.mjs`, `types.d.mts`
- `src/compiler/backends/typescript-v1/names.mjs`, `names.d.mts`

## Notes

- Do not read `src/compiler/backends/typescript.mjs` or `type-names.mjs` for anything but context. They consume the frozen FR-041 prototype IR — a different document shape — and their textual-substitution mechanism is what FR-042-CON-5 records as fragile.
- A `displayName` change with an unchanged `identity` changes the generated public API while the semantic contract did not change. The generated identity map is what makes that visible; the renderer never derives a semantic value from a display name.
- The union discriminator's wire shape is open as issue #58. State the reading; do not present it as settled.
