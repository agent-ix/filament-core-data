---
id: SR-015
title: "Code review of the TypeSpec feasibility spike"
type: SpecReview
analysis: base
scope: "spikes/typespec-feasibility/, test/typespec-feasibility.test.ts"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-003"
    type: reviews
---
# Code review of the TypeSpec feasibility spike

## Summary

The implementation is complete for an isolated feasibility spike. It retains
failures, compiles and executes actual generated consumers, makes no publication
or production mutation, and contains no defect that needs repair before evidence
review. The custom emitter and generators are suitable only as experimental
evidence; the report and capability record prevent their accidental promotion.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-027 | low | No blocking implementation defect was found. The large orchestration script is acceptable for a bounded spike but must not be copied into production; compiler issues #18–#27 own its decomposition and hardening. | `scripts/run-experiment.mjs`, compiler epic #5 |

## Test and Boundary Review

- Six substantive Vitest tests carry exact tags for all 41 issue #4 Test Cases
  and all 23 scoped acceptance criteria. The full repository suite passes 28/28.
- Tests and generated consumers exercise real TypeSpec compilation, official and
  custom emission, AJV, protobuf parsing, TypeScript compilation/execution,
  Pydantic validation, dataclass construction, Cargo checking, Rust execution,
  deterministic regeneration, Git changed-path checks, and report assertions.
- Positive and negative goldens are both required. No mock, skip, placeholder
  assertion, coverage exclusion, warning suppression, or success-on-failure path
  substitutes for a required capability.
- Child processes use executable plus argument arrays rather than shell
  interpolation. Compiler output and native build products use experiment-local
  temporary directories. Generation rejects known executable Python schema
  extensions before invoking the upstream generator.
- Direct versions are exact-pinned, the Python environment is local and ignored,
  Cargo execution is locked/offline after lock creation, generated packages are
  unpublished, and no generated surface enters root package exports.

## Spec-Code Alignment

FR-014..018, NFR-006..007, and US-004 are implemented without weakening the P0
pass rule. In particular, the JSON Schema URI workaround is recorded as a
partial capability rather than presented as native success; missing `protoc` is
retained; TypeSpec selection remains false; the fallback is explicit; and
ADR-0004 remains provisional. IR assertions cover the semantic metadata required
by FR-016 rather than merely checking that files exist.

No current Avro file, generated production binding, runtime consumer, database,
catalog, registry, publication configuration, or external repository content is
changed. The changed-path allowlist fails closed outside the issue #4 spec, plan,
review, test, dependency, and spike surfaces.
