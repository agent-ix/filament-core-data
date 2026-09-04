---
id: Plan-007
title: "Promote the issue #4 prototype emitters into src/"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-040"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-042"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-044"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-018"
    type: references
---
# Implementation Plan: Promote the prototype emitters

Issue: `agent-ix/filament-core-data#27`. Reviews: SR-055..062 under
`spec/reviews/27-promote-prototype-emitters/`. Predecessor bundles: Plan-005
(IR v1.1), Plan-006 (semantic-core grammar). Sequence of record:
#27 -> #19 -> {#21, #22, #23} -> #11, with #20 built independently in parallel.

## Requirements Summary

### Stakeholder and User Requirements

- [ ] **StR-001:** Keep the semantic data system governed while its generators become owned code.
- [ ] **US-009:** Let the package tickets build from an owned, tested, deterministic compiler instead of a frozen spike.

### Functional Requirements

- [ ] **FR-040:** A written disposition for each of the fourteen enumerated prototype components, plus an `authored` ledger for files the promotion writes.
- [ ] **FR-041:** The semantic-IR emitter under `src/compiler/`, behind one six-symbol build interface, with `generator` and `baseDir` as explicit inputs and a locale-independent ordering.
- [ ] **FR-042:** The TypeScript and Rust backends as pure IR-to-source functions reproducing the committed issue #4 goldens, with missing-base and cycle guards.
- [ ] **FR-043:** The Python JSON Schema adapter with its closed forbidden-key set and pinned generator constants.
- [ ] **FR-044:** The frozen spike replays through the promoted compiler with exactly one declared evidence delta and a seeded Rust lockfile.

### Non-Functional Requirements

- [ ] **NFR-017:** Byte-identical output for identical inputs, with cwd, locale, and transitive resolution supplied explicitly.
- [ ] **NFR-018:** No publication, no consumer move, no export-surface change, and a clean restore.

## Dependency Graph

```text
Task-060 -> Task-061 -> Task-062 --\
                    \               +-> Task-064 -> Task-065 -> Task-066 -> Task-067
                     +-> Task-063 -/
```

- Task-060 fixes the guards first: the changed-path allowlist in `test/typespec-feasibility.test.ts` that actually enforces NFR-006, and the red assertions for everything that follows.
- Task-061 lands the emitter and the build interface; both backends and the adapter are reached through it.
- Task-062 (language backends) and Task-063 (Python adapter) touch disjoint files and run in parallel after Task-061.
- Task-064 rewires the spike, which needs all three promoted modules.
- Task-065 writes the inventory last, because FR-040-AC-3 and FR-040-AC-5 can only be checked once every `src/compiler/` file exists. This is the ordering answer to SR-058 FND-320: the apparent FR-040 -> FR-041 -> FR-040 cycle is a task order, not a requirement cycle.
- Task-066 runs the cross-cutting determinism and non-disruption gates over the finished tree.
- Task-067 is the closing gate: code review, gap analysis, PR.

### Cross-cutting constraints

- NFR-017 permits `src/compiler/**`, `spikes/typespec-feasibility/{scripts,package.json,evidence/custom.json,README.md}`, `spikes/typespec-feasibility/emitter/**` for deletion only, `package.json`, `pnpm-lock.yaml`, `Makefile`, `biome.json`, `tsconfig*.json`, `test/**`, `docs/semantic-data-system/typespec-feasibility.md`, `spec/**`, `plan/**`, `reviews/**`.
- Prohibited: every other retained spike file, `schema/**`, `fixtures/**`, `packages/**`, `agent_ix_core_data/**`, `src/generated.ts`, `audit/**`, `pyproject.toml`, `poetry.lock`, `tests/**`, `.github/**`, and every corpus repository.
- No dependency is added; `@typespec/*` stay exact devDependency pins. No `file:`/`link:` specifier survives. No `.npmrc` is committed.
- The committed issue #4 goldens are the differential oracle and are never regenerated.

## The Seams

`src/compiler/` holds `ir.mjs` (the walker), `compile.mjs` (`compileSemanticIr`),
`backends/typescript.mjs`, `backends/rust.mjs`, `backends/python-schema.mjs`,
`emitters/semantic-ir/{index.mjs,package.json}` (the `$onEmit` entry point loaded
by absolute path), `cli.mjs`, `index.mjs` (the six-symbol interface),
`index.d.mts` (its declarations), and `inventory.json`. Everything is `.mjs`
because `tsp` loads the emitter at runtime; `biome` formats it and the
declarations are exercised from a TypeScript test so `tsc --noEmit` catches
drift. `spikes/typespec-feasibility/scripts/run-experiment.mjs` imports the
interface and shells the CLI, and stamps the historical generator identity so the
retained IR stays byte-identical. Tests live in `test/compiler.test.ts` and trace
TC-320..397.

## Test Plan

- [ ] **TC-379, TC-390:** changed-path allowlist and permitted-path gate (authored first, green last).
- [ ] **TC-331..348:** interface, IR byte-identity, diagnostics, determinism, `tsp --emit` parity, namespace scope, locus form, ordering, lint and declaration coverage, pins and licence.
- [ ] **TC-349..360:** TypeScript and Rust goldens, purity, missing-base and cycle guards, rename and optional rendering, inventory limitation, unchanged goldens.
- [ ] **TC-361..369:** adapter golden, forbidden keys, `$id` and title handling, `RecordString` localisation, purity, unchanged Python evidence, pinned constants, no process spawn.
- [ ] **TC-370..382, TC-397:** spike replay, declared delta, lockfile seeding and `--check` failure, dependency removal, frozen-lockfile install, allowlist, changed-path proof, doc and NFR-006 notes.
- [ ] **TC-383..389:** repeat-run identity, collator independence, explicit `baseDir`, seeded lockfile, pin inspection, issue #42 record.
- [ ] **TC-390..396:** permitted paths, manifest and packed-file surface, licence, dependency sets, restore rehearsal, no publication.

### Entrance Criteria

- US-009, FR-040..044, NFR-017, NFR-018, TC-320..397 and SR-055..062 validate with Quire (done 2026-09-03).
- Issue #42 is filed and TC-370 and TC-382 are recorded as blocked on it.

### Exit Criteria

- `make lint`, `make test`, `make build` and `make typecheck` green.
- Every TC-320..397 except TC-370 and TC-382 passing.
- The retained-evidence diff is exactly one field of `evidence/custom.json`.
- Code review and gap analysis recorded under `reviews/`, PR opened against main.
