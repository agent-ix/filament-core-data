---
id: Task-081
title: "Convert the six changed-path gates that still baseline on a moving ref"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-943"
    type: verifies
---
# Task-081: Convert the six changed-path gates that still baseline on a moving ref

## Scope

Move `typespec-feasibility`, `semantic-contract`, `semantic-core`, `semantic-ir-v1-1`, `semantic-architecture`, and `contract-census` off `changedPathsFrom(root, "main" | "origin/main")` and onto `changedPathsOf` with sentinels resolved from history — the open defect of issue #51 — rather than adding a seventh permitted-path entry to each, which issue #55 records as how those guards were disabled incrementally.

## Subtasks

- [x] Confirm each sentinel from history rather than guess it: `git log --diff-filter=A -1 -- <path>` must name the commit that owns the requirement the suite guards.
- [x] Convert each of the six suites to `changedPathsOf(root, <sentinel>)`, leaving every permitted-path list byte-identical.
- [x] Assert in `test/python-backend.test.ts` that no gate under `test/` resolves a range from `main` or `origin/main` and that every `git diff` in a gate passes `--no-renames`.
- [x] Rehearse each converted suite in a scratch clone: a prohibited path introduced into a simulated post-merge tree must still fail it.
- [x] Rehearse the loud-failure direction: with the sentinel absent from history, the gate must fail saying it did not run.

## Deliverables

- `test/typespec-feasibility.test.ts`, `test/semantic-contract.test.ts`, `test/semantic-core.test.ts`, `test/semantic-ir-v1-1.test.ts`, `test/semantic-architecture.test.ts`, `test/contract-census.test.ts`
- `test/python-backend.test.ts` (the guard-range analysis)

## Notes

- Confirmed sentinels: `spikes/typespec-feasibility/main.tsp` (90978f9), `schema/semantic/v1/semantic-ir.schema.json` (063fe73), `packages/semantic-core/main.tsp` (d48b8da), `fixtures/semantic/v1/positive/semantic-ir-v1-1.json` (014bff7), `docs/semantic-data-system/metamodel.md` (3722184), `audit/filament-contract-census/inventory.json` (3832e07).
- This task adds no entry to any permitted-path list. If a conversion would need one, the conversion is wrong.
- Issue #51 is the owning ticket; this bundle fixes it because it is a hard prerequisite, not a nicety.
