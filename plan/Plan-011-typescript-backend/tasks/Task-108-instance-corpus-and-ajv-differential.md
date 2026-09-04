---
id: Task-108
title: "The authored instance corpus and the ajv differential"
type: Task
status: in_progress
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-107"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-776"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-777"
    type: verifies
---
# Task-108: The authored instance corpus and the ajv differential

## Scope

Land the instance evidence. The conformance corpus carries no instance payloads — `conformance/schema/input-bundle.schema.json` is `additionalProperties: false` over `ir`, `manifest`, `manifestDigest`, `lock`, `profile`, `mappings` and `consumerPolicy` — so the validators need an authored corpus and a second decider.

## Subtasks

- [x] Author the instance corpus under `test/fixtures/backends/typescript/instances/`: each case naming the IR document, the type identity, the payload, the expected verdict, and for a rejection the expected RFC 6901 pointer and code.
- [x] Author every case from the contract, never from a run. `provenance.blessedFromRun` is the discipline being copied: an expectation captured from the generator is the generator checking itself.
- [x] Cover the four presence/nullability combinations, all three `unknownPolicy` values, every constraint keyword at its boundary and one past it, a recursive value, a collection with `unique` and with `ordered`, and each object-shape hazard.
- [ ] Author a JSON Schema 2020-12 document beside each case for the same type, and run the differential: the generated validator's accept/reject verdict agrees with `ajv@8.20.0`, already a pinned devDependency.
- [ ] Report a disagreement between the two deciders as a finding rather than adjusting whichever one is convenient.

## Deliverables

- `test/fixtures/backends/typescript/instances/**` — the authored cases and their JSON Schema documents
- The differential check in `test/typescript-backend.test.ts`

## Notes

- Two deciders written independently from the same contract are evidence; one generator checking its own output is not. That is the whole reason this task exists.
- Do not add a dependency. `ajv@8.20.0` and `ajv-formats@3.0.1` are already pinned devDependencies; `spec/spec.md` §2.2 forbids adding another.
- `test/fixtures/**` is not in `package.json` `files`, so nothing here reaches the published tarball.
