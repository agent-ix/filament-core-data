---
id: Task-082
title: "Stable identifier derivation and the pinned reserved-word list"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-081"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-658"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-659"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-660"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-661"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-662"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-663"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-664"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-665"
    type: verifies
---
# Task-082: Stable identifier derivation and the pinned reserved-word list

## Scope

Land `names.mjs`: pure, total, ambient-free derivation from the semantic identity, refusing rather than mangling. SR-082 FND-950 and FND-951 are the two defects this task exists to prevent.

## Subtasks

- [ ] Pin the Rust reserved and reserved-for-future word set for the declared edition, with its transcribed provenance beside it.
- [ ] Implement the segmenter, the three case renderings, the `_` prefix, the `r#` raw form and the four keywords with no raw form.
- [ ] Implement the `XID_Start`/`XID_Continue` refusal and the locale-independent simple case mapping.
- [ ] Implement `crateName`, replacing `/` with `-`.
- [ ] Implement the four declared scopes and the `NAME_COLLISION` refusal, with no counter, hash or positional suffix anywhere.
- [ ] Write the injectivity, order-independence, position-independence and locale-independence property tests.

## Deliverables

- `src/compiler/backends/rust-serde/names.mjs`
- `src/compiler/backends/rust-serde/reserved-words.json`

## Notes

Derivation reads the identity's final segment; `displayName` reaches the crate only as documentation text.
