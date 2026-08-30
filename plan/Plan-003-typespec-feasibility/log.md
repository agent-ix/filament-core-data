---
type: log
title: "Plan-003 — Update Log"
description: "Chronological log of changes to the Plan-003 bundle."
---
# Plan-003 — Update Log

## History

* **2026-08-29** — Plan created from the validated issue #4 specification with eight tasks, parallel official/custom emitter tracks, one native/golden join, and one human-gated recommendation.
* **2026-08-29** — Task-016 produced the expected 6/6 red baseline on absent experiment evidence. Initial tool probing found Node/pnpm, Rust/Cargo, and Python; ambient `protoc`, Pydantic, and PyArrow are absent and must remain explicit or be supplied through exact local dependencies.
* **2026-08-29** — Tasks 017–019 pinned TypeSpec 1.15.0 and official JSON Schema/Protobuf emitters, compiled the modular representative slice, retained a source-located invalid case, and emitted 18 source-located semantic IR types. The raw JSON Schema bundle exposed a cross-namespace relative-`$id` defect for `RecordString`; validation-only URI normalization is retained and the P0 capability remains partial.
* **2026-08-29** — Tasks 019–020 generated and executed TypeScript and Rust/Serde prototype consumers. The hand-written Python prototype was replaced by pinned `datamodel-code-generator` 0.76.0 after qualification: Pydantic 2.12.5 round-trips the complete golden and standard-dataclass output imports and constructs. Security-sensitive schema extensions are rejected before generation.
* **2026-08-29** — Tasks 021–022 produced identical clean fingerprints, classified patch/additive/breaking examples, retained every adverse result, selected modular JSON Schema 2020-12 as the fallback, and left ADR-0004 provisional. Compiler epic #5 was decomposed into governed AGPL subissues #18–#27; repository creation, ownership, releases, and publication remain human-gated.
* **2026-08-29** — Task-023 entered final review with 28/28 repository tests passing, 129/129 matrix cases complete, deterministic regeneration passing, and format/typecheck/build clean. No current schema, consumer, runtime, database, catalog, package publication, or external repository content was mutated by the spike.
* **2026-08-29** — Task-023 completed after SR-014..016 accepted the isolated evidence, code review found no blocking defect, exact matrix/acceptance-criterion reconciliation closed, and Quire validated 82/82 documents grammar-clean. The evidence packet recommends GO for the modular JSON Schema fallback and HOLD for TypeSpec promotion, compiler-repository creation, and every disruptive downstream action pending human review.
