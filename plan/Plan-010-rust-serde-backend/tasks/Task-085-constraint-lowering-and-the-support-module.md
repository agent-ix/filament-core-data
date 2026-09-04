---
id: Task-085
title: "Constraint lowering and the generated support module"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-083"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-084"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-677"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-678"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-685"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-686"
    type: verifies
---
# Task-085: Constraint lowering and the generated support module

## Scope

Land `constraints.mjs` and the generated `src/support.rs`: fallible constructors, the eleven keywords on their applicable subjects, and the named types the mapping depends on.

## Subtasks

- [ ] Emit `Nullable<T>`, `present_or_absent`, `SemanticValue` with `NumberLexeme` and ordered `Object`, `UnknownMembers`, `Extension`, `SemanticIdentity`, `SourceLocusPath` with both predicates, and `ValidationError`.
- [ ] Emit the four validated scalar newtypes `Date`, `DateTime`, `Duration`, `Uuid`.
- [ ] Lower the eleven keywords, with instants for `date`/`datetime` bounds and the `UNORDERED_SUBJECT` refusal for `duration` bounds.
- [ ] Lower `enumValues` and `unique` with the declared equality, and `minLength`/`maxLength` with the declared count.
- [ ] Emit the matcher runtime and the format registry, and the `UNKNOWN_FORMAT` refusal.
- [ ] Route every `Deserialize` through `try_new`.

## Deliverables

- `src/compiler/backends/rust-serde/constraints.mjs`
- the generated `src/support.rs`

## Notes

The support module has no dependency beyond `serde`; the matcher is generated, not linked.
