---
id: Plan-003
title: "TypeSpec feasibility and structural schema-source decision"
type: Plan
status: complete
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-014"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-018"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-007"
    type: references
---
# Implementation Plan: TypeSpec feasibility and structural schema-source decision

## Requirements Summary

### Stakeholder and User Requirements

- [x] **StR-001:** Extend durable governance through retained source-selection evidence and a human promotion gate.
- [x] **US-004:** Let compiler owners exercise normal native consumers and select the fallback after an adverse P0 result.

### Functional Requirements

- [x] **FR-014:** Pin the complete toolchain and compile a modular representative semantic slice.
- [x] **FR-015:** Exercise official JSON Schema, Protobuf, versioning, and diagnostic paths.
- [x] **FR-016:** Emit deterministic semantic IR plus ordinary native and explicit projection artifacts.
- [x] **FR-017:** Prove clean regeneration, native compilation, shared goldens, and change classification.
- [x] **FR-018:** Publish capability dispositions, maintenance cost, recommendation, fallback, and human ADR gate.

### Non-Functional Requirements

- [x] **NFR-006:** Keep the exact-locked experiment isolated, deterministic, unpublished, and non-canonical.
- [x] **NFR-007:** Retain failed/partial evidence and prohibit weakening the pass rule.

## Dependency Graph

```text
Task-016 -> Task-017 -> Task-018 ----\
                         Task-019 ----+-> Task-020 -> Task-021 -> Task-022 -> Task-023
```

- Task-016 defines the executable evidence and failure contract before implementation.
- Task-017 pins one source/toolchain used by both emitter tracks.
- Tasks 018 and 019 may proceed independently but write disjoint official/custom output paths.
- Task-020 joins both tracks through native compilers and shared fixtures.
- Task-021 must validate complete outputs before the report can classify the tool.
- Task-022 applies the pass rule; Task-023 verifies the report but cannot promote ADR-0004.

## The Seams

The complete experiment lives under `spikes/typespec-feasibility/`; its test
contract lives in `test/typespec-feasibility.test.ts`. Existing Avro schema,
fixtures, generated source, package exports, and consumers are read-only controls.
The custom emitter may call the pinned TypeSpec compiler API and write only to a
caller-supplied temporary or experimental output directory. Official outputs,
custom outputs, raw diagnostics, normalized evidence, and the recommendation are
separate so one cannot rewrite the other's result.

## Test Plan

- [x] **TC-089..096:** exact tools, package imports, complete slice, identity, recursion, events, evidence/results, extensions, optionality, and null.
- [x] **TC-097..103:** official JSON Schema/Protobuf/versioning/diagnostic behavior.
- [x] **TC-104..112:** semantic IR and Rust/TypeScript/Python/JSON/Protobuf/Arrow/Markdown outputs.
- [x] **TC-113..118:** deterministic regeneration, native builds, shared goldens, references, compatibility, diagnostics, and measurements.
- [x] **TC-119..126:** capability completeness, cost, fallback, human gate, isolation, publication, evidence schema, and adverse-result integrity.
- [x] **TC-127..129:** one-command demonstration, failure demonstration, and root-index/recommendation walkthrough.

### Entrance Criteria

- The issue #4 requirements, 41 mapped cases, and eight composite specification reviews validate.
- PR #16/#17 content is available as the stacked architecture/census baseline; neither must be merged for isolated spike work.
- No runtime consumer, package publication, catalog, database, or enforcement change is included.

### Exit Criteria

- All 41 issue #4 cases pass with retained raw and normalized evidence.
- Rust, TypeScript, and Python consumers compile and execute against shared goldens.
- Two clean generations match; official/custom mismatches and all limitations remain explicit.
- The report makes one evidence-backed recommendation while ADR-0004 remains provisional.
- Format, typecheck, build, full tests, Quire validation, code review, gap analysis, and diff/release gates pass.

## Task File Mapping

| Task | Track | Owns | Verified by | Status |
|---|---|---|---|---|
| Task-016 | A | NFR-007 | TC-119, TC-121, TC-125..126 | done |
| Task-017 | A | FR-014 | TC-089..096 | done |
| Task-018 | B | FR-015 | TC-097..103 | done |
| Task-019 | C | FR-016 | TC-104..112 | done |
| Task-020 | A | US-004, FR-017 | TC-114..116, TC-127 | done |
| Task-021 | A | FR-017, NFR-006 | TC-113, TC-117..118, TC-123..124 | done |
| Task-022 | A | StR-001, FR-018, NFR-007 | TC-119..122, TC-126, TC-128..129 | done |
| Task-023 | Gate | NFR-006, NFR-007 | TC-089..129 | done |

## Coordination Rules

- Pin direct experiment dependencies exactly and record every external tool version.
- Keep official and custom outputs immutable during analysis; regenerate into clean directories.
- Do not add the spike package to root exports, `files`, publication scripts, or runtime dependencies.
- Do not change current Avro source/generated outputs or any external repository.
- A missing tool or failed target is evidence, not permission to skip or weaken a P0 case.
- A recommendation is not ADR acceptance; the stacked PR stops at the human selection gate.
