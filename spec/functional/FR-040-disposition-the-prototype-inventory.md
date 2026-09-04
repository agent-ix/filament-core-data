---
id: FR-040
title: "Disposition every issue #4 prototype component"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-017"
    type: "depends_on"
---
# [FR-040] Disposition every issue #4 prototype component

## Description

The maintainer SHALL record a written disposition for every issue #4 prototype
component enumerated below, where each disposition is exactly one of `retain`,
`rewrite`, `replace-with-official`, or `discard` and cites the evidence that
justifies it.

## Inputs

The prototype component set is this enumeration; it is the oracle, and no count
stands in for it. Each entry names the spike path and the exact symbols it
covers.

1. Semantic-IR emitter — `spikes/typespec-feasibility/emitter/index.mjs` (`$onEmit`, `record`, `metadataOf`, `semanticRole`, `sourceOf`, `namespaceOf`, `versionRecord`)
2. TypeScript backend — `scripts/run-experiment.mjs` (`emitTypeScript`, `tsType`, `simpleReferences`, `enumMembers`, `replaceEnumMember`)
3. Rust/Serde backend — `scripts/run-experiment.mjs` (`emitRust`, `rustType`, `snake`, `inheritedFields`)
4. Python JSON Schema adapter — `scripts/run-experiment.mjs` (`normalizeJsonSchemaForPython`)
5. Python generator pins and invocation — `scripts/run-experiment.mjs` (`pydanticVersion`, `datamodelCodegenVersion`, `pythonGeneratorArguments`)
6. Determinism helpers — `scripts/run-experiment.mjs` (`canonical`, `fingerprint`)
7. Python virtualenv bootstrap — `scripts/run-experiment.mjs` (`ensurePython`)
8. Golden consumer programs — `scripts/run-experiment.mjs` (`emitConsumers`)
9. Codegen-confidence fixtures — `scripts/run-experiment.mjs` (`fixture`, `invalidFixture`)
10. Arrow projection writer — `scripts/run-experiment.mjs` (the `generated/custom/arrow/schema.json` writer)
11. Markdown mapping writer — `scripts/run-experiment.mjs` (the `generated/custom/markdown/mappings.json` writer)
12. Protobuf mapping writer — `scripts/run-experiment.mjs` (the `generated/custom/protobuf/mapping.json` writer)
13. Compatibility classifier — `scripts/run-experiment.mjs` (`classify`)
14. Official emitter invocations — `scripts/run-experiment.mjs` (the `@typespec/json-schema` and `@typespec/protobuf` compile calls)

Also read: `spikes/typespec-feasibility/evidence/capabilities.json`, whose
sixteen capability records carry the issue #4 disposition and confidence.

## Outputs

- `src/compiler/inventory.json` with two arrays:
  - `components`: one record per enumerated component, each carrying `component`, `source` (the spike path plus the symbol list), `capability` (the `capabilities.json` id that judged it, or `null` when no capability record covers it), `disposition`, `targets` (an array of promoted `src/compiler/` paths, empty when the component is not promoted), `evidence`, and `limitation`
  - `authored`: one record per `src/compiler/` file that has no issue #4 ancestor, each carrying `path` and `reason`
- A `## Promotion inventory` section in `docs/semantic-data-system/typespec-feasibility.md` naming the per-disposition counts and linking the inventory

## Behavior

- The inventory `components` array SHALL hold one record for each of the fourteen components enumerated in Inputs, keyed by that component name.
- The inventory SHALL hold no `components` record whose `source` is absent or empty.
- Every `components` record SHALL carry a `disposition` drawn from the closed set `retain`, `rewrite`, `replace-with-official`, `discard`.
- Every `retain` and `rewrite` record SHALL name at least one `targets` path that exists under `src/compiler/`.
- Every `replace-with-official` and `discard` record SHALL carry an empty `targets` array.
- Every `components` record SHALL carry a `limitation` string stating what the component was **not** qualified against.
- If a `components` record's only stated `evidence` is that the representative golden passed, then the inventory test SHALL reject that record.
- The inventory SHALL record the Rust and TypeScript backends as qualified against the issue #4 representative slice only, naming the absent conformance corpus, property/fuzz suite, compatibility matrix, and downstream adoption.
- If a file under `src/compiler/` is neither in some record's `targets` nor in the `authored` array, then the inventory test SHALL fail naming that file.
- If a `components` record names a `capability` whose `capabilities.json` disposition is `partial`, then that record's `limitation` SHALL restate that capability's recorded `limitation`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-040-CON-1 | The inventory test SHALL fail a `retain` or `rewrite` record whose named `capability` is `partial` in `capabilities.json` and whose `limitation` omits that capability's recorded limitation. | Integrity | Inventory test |
| FR-040-CON-2 | The inventory test SHALL reject any `disposition` outside the four-value set; a fifth value requires amending this requirement before the inventory. | Integrity | Inventory test |
| FR-040-CON-3 | The `authored` array SHALL name only files the promotion itself creates. | Integrity | Inventory test |
| FR-040-CON-4 | The maintainer SHALL NOT use the `authored` array to excuse a promoted component from a `components` record. | Integrity | Inventory test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-040-AC-1 | `src/compiler/inventory.json` `components` holds exactly the fourteen component names enumerated in Inputs, each with a non-empty `source`; a missing or extra name fails the test. | Test |
| FR-040-AC-2 | Every record's `disposition` is in the closed four-value set, and a mutated record carrying a fifth value fails the inventory test. | Test |
| FR-040-AC-3 | Every `retain`/`rewrite` record names at least one existing `src/compiler/` target and every `replace-with-official`/`discard` record carries an empty `targets` array. | Test |
| FR-040-AC-4 | Every record carries a non-empty `limitation`, and a mutated record whose `evidence` is only "representative golden passed" is rejected. | Test |
| FR-040-AC-5 | Every file under `src/compiler/` is either in exactly one record's `targets` or in the `authored` array, and every `authored` entry carries a reason. | Test |
| FR-040-AC-6 | `docs/semantic-data-system/typespec-feasibility.md` carries a `## Promotion inventory` section whose per-disposition counts equal the inventory's. | Test |
| FR-040-AC-7 | Every record naming a `partial` capability restates that capability's recorded limitation; a mutated record that drops it fails. | Test |

## Dependencies

- **Upstream**: [US-009](../usecase/US-009-build-from-a-supported-compiler.md), [FR-017](./FR-017-prove-spike-compatibility.md)
- **Downstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-042](./FR-042-promote-the-language-backends.md), [FR-043](./FR-043-govern-the-python-generation-adapter.md)
