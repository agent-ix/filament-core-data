---
id: FR-040
title: "Disposition every issue #4 prototype component"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
---
# [FR-040] Disposition every issue #4 prototype component

## Description

The promotion SHALL record a written disposition for every component of the
issue #4 prototype, where each disposition is exactly one of `retain`,
`rewrite`, `replace-with-official`, or `discard` and carries the evidence that
justifies it.

## Inputs

- `spikes/typespec-feasibility/emitter/index.mjs` (the `$onEmit` semantic-IR emitter)
- The generator, adapter, fixture, projection, evidence, and harness functions in `spikes/typespec-feasibility/scripts/run-experiment.mjs`
- `spikes/typespec-feasibility/evidence/capabilities.json` (the recorded disposition and confidence of each spike capability)

## Outputs

- `src/compiler/inventory.json`: one record per prototype component with `component`, `source` (the spike path), `disposition`, `target` (the promoted `src/` path, or `null`), `evidence`, and `limitation`
- A `## Promotion inventory` section in `docs/semantic-data-system/typespec-feasibility.md` naming the counts per disposition and linking the inventory

## Behavior

- The inventory SHALL contain one record for each of the thirteen prototype components enumerated in the Inputs.
- The inventory SHALL contain no record whose `source` is absent or empty.
- Every record SHALL carry a `disposition` drawn from the closed set `retain`, `rewrite`, `replace-with-official`, `discard`.
- Every `retain` and `rewrite` record SHALL name a `target` path that exists under `src/compiler/`.
- Every `replace-with-official` and `discard` record SHALL set `target` to `null`.
- Every record SHALL carry a `limitation` string stating what the component was **not** qualified against.
- If a record's only stated `evidence` is that the representative golden passed, then the inventory test SHALL reject that record.
- The inventory SHALL record the Rust and TypeScript backends as qualified against the representative slice only, naming the absent conformance corpus, property/fuzz suite, and downstream adoption.
- If a file under `src/compiler/` is not the `target` of any inventory record, then the inventory test SHALL fail naming that file.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-040-CON-1 | The inventory SHALL NOT record a disposition of `retain` for a component whose spike disposition in `capabilities.json` is `partial` without repeating that partiality in `limitation`. | Integrity | Inventory test |
| FR-040-CON-2 | The disposition set SHALL stay closed; adding a fifth value requires amending this requirement rather than the inventory file. | Integrity | Inventory test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-040-AC-1 | `src/compiler/inventory.json` holds thirteen records, one per enumerated prototype component, each with a spike source path that exists in the tree or in the promotion commit's parent. | Test |
| FR-040-AC-2 | Every record's `disposition` is in the closed four-value set, and a record carrying any other value fails the inventory test. | Test |
| FR-040-AC-3 | Every `retain`/`rewrite` record names an existing `src/compiler/` target and every `replace-with-official`/`discard` record names `null`. | Test |
| FR-040-AC-4 | Every record carries a non-empty `limitation`; a record whose `evidence` is only "representative golden passed" is rejected. | Test |
| FR-040-AC-5 | Every file under `src/compiler/` except the inventory itself is the target of exactly one record. | Test |
| FR-040-AC-6 | `docs/semantic-data-system/typespec-feasibility.md` gains a `## Promotion inventory` section whose per-disposition counts equal the inventory's. | Test |

## Dependencies

- **Upstream**: [US-009](../usecase/US-009-build-from-a-supported-compiler.md), [FR-017](./FR-017-prove-spike-compatibility.md)
- **Downstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-042](./FR-042-promote-the-language-backends.md), [FR-043](./FR-043-govern-the-python-generation-adapter.md)
