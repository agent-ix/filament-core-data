---
id: Task-105
title: "The resolved type model"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-104"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-755"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-765"
    type: verifies
---
# Task-105: The resolved type model

## Scope

Land `buildModel(ir)`: the single artifact every renderer of this backend consumes, so the shape five modules exchange is specified in one place rather than assumed five times.

## Subtasks

- [ ] Emit the package block, the contract version, and one entry per type definition.
- [ ] Per type carry the identity, the minted TypeScript identifier, the kind, the resolved scalar where the kind resolves to one through aliases, the ordered fields with their three axes (optional, nullable, collection) already decided, the ordered variants, the constraints resolved to their subject, the relationships, the operations, the extensions, the roles, the unknown policy, and the clauses.
- [ ] Carry the document-level extensions, the occurrences, and every field `unit`, because `conformance/bases/core-1-1.json` and `package-1-1.json` carry all three and a `fail` policy leaves no room for a silent drop.
- [ ] Decide every value from an IR member and never from a display name, a namespace prefix, or a rendered type string — the prototype's `role`, `nullable`, `recursive` and `extensionPoint` name heuristics are exactly the defect this excludes.
- [ ] Make `buildModel` the only module that walks the IR document, so a later node is added in one place.
- [ ] Make it pure, total over an admitted document, and idempotent; prove it leaves its argument byte-unchanged.
- [ ] Prove completeness over the `core-1-1` and `package-1-1` bases: every declared type, field, variant, constraint, relationship, operation, occurrence, document-level extension and field `unit` appears in the model, with counts agreeing against the source document.

## Deliverables

- `src/compiler/backends/typescript-v1/model.mjs`, `model.d.mts`

## Notes

- Four requirements named this model and none owned it before the review pass. It is the first implementation decision of the codegen track and everything in track B depends on it.
- Recursion is inherent in the IR and carries no marker: `typeRef`, `alias.target`, `sequence.items`, `map.values`, `variant.payloadType`, `relationship.target` and `operation.returns.typeRef` are all flat identities into one flat array. The model must represent a cycle without walking one.
