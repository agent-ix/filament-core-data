---
id: Plan-013
title: "Semantic kernel packages for Rust, TypeScript, Python and JSON Schema"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-81"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-82"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-83"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-84"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-85"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-86"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-87"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-88"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-89"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-90"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-28"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-29"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-30"
    type: references
---
# Plan-013: semantic kernel packages

## Scope

Generate the shared semantic kernel as native packages for three languages and
as modular JSON Schema, from the grammar `#35` published and the three codegen
backends `#21`, `#22` and `#23` merged.

**Build only.** Publication passes `agent-ix/quoin#290`, a human sign-off that
has not moved. No step invokes `cargo publish`, `npm publish` or a PyPI upload.

## Requirements covered

US-014, FR-081..FR-090, NFR-028..NFR-030 — 312 acceptance criteria and
constraints, mapped to TC-1000..TC-1108 in `spec/tests.md`.

## Order

The bundle declaration comes first because every later task reads it, and the
cross-language agreement comes last because it is the only task that can fail
while all three language tasks pass.

| Task | Subject | Depends on |
|---|---|---|
| Task-117 | Bundle declaration and the staleness gate | — |
| Task-118 | JSON Schema lowering and anonymous-construct naming | Task-117 |
| Task-119 | Provenance and the refusal path | Task-118 |
| Task-120 | TypeScript kernel package | Task-119 |
| Task-121 | Rust kernel crate | Task-119 |
| Task-122 | Python kernel package | Task-119 |
| Task-123 | Modular JSON Schema index | Task-119 |
| Task-124 | Independent consumer examples | Task-120, Task-121, Task-122 |
| Task-125 | Cross-language agreement through the conformance corpus | Task-124 |
| Task-126 | Determinism, portability and non-disruption gates | Task-125 |

## Quality gates

1. **After Task-119** — a construct the register does not name refuses with a
   diagnostic rather than emitting a degraded type. `#21` held this line when
   RE2 could not compile a published pattern; it wrote a proved validator
   rather than degrade the field to `String`.
2. **After Task-123** — every target regenerates byte-identically and the
   staleness gate fails when a source moves.
3. **After Task-125** — agreement is measured through the existing conformance
   corpus, not through a comparison written for this issue. SR-144 FND-1360:
   a comparison written beside the thing it compares tends to agree with it.
4. **Before the pull request** — the twelve non-singular statements SR-142
   found are split, or the matrix is not called complete.

## Open findings carried from the review

| Finding | Disposition |
|---|---|
| FND-1380 twelve non-singular statements | split before the matrix is complete |
| FND-1381 cross-language disagreement passes every per-language suite | Task-125 evidences through the corpus |
| FND-1382 a wrong package fails nowhere | Task-125; the corpus is the detector |
| FND-1383 no `Manual` row for fitness to publish | add one, `🚧` pending the owner |
