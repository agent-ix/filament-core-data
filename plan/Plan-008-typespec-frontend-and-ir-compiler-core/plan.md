---
id: Plan-008
title: "TypeSpec frontend and versioned semantic IR compiler core"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-047"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-049"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-051"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-053"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: references
---
# Implementation Plan: TypeSpec frontend and semantic IR compiler core

Issue: `agent-ix/filament-core-data#19`. Reviews: SR-065..072 under
`spec/reviews/19-typespec-frontend-and-ir-compiler-core/`. Predecessor bundles:
Plan-005 (IR v1.1), Plan-006 (semantic-core grammar), Plan-007 (prototype
promotion). Sequence of record: #27 -> #19 -> {#21, #22, #23} -> #11, with #20
built independently in parallel and never read from here.

## Requirements Summary

### Stakeholder and User Requirements

- [x] **StR-001:** Keep the semantic data system governed while its compiler becomes real.
- [x] **US-010:** One command reads a package's sources, manifest, imports, profile, and lock and produces one versioned IR document with its diagnostics.

### Functional Requirements

- [x] **FR-045:** One frontend seam and dialect registry; `spec-bundle` registered and refused, not guessed.
- [x] **FR-053:** A closed fifteen-decorator TypeSpec vocabulary and one identity minting rule shared with FR-034.
- [x] **FR-046:** The lowering from a compiled TypeSpec program to contract IR `1.1.0`, through a confined `CompilerHost`.
- [x] **FR-047:** Package graph resolution with exact JSON source loci, deterministic candidate selection, and cycle diagnostics.
- [x] **FR-048:** The RFC 8785 canonical form, the byte sets every digest is defined over, and lock build and verification.
- [x] **FR-049:** Two registered diagnostic namespaces, deterministic ordering, sort-before-truncate, and declared limits.
- [x] **FR-050:** Schema validation, a 22-rule cross-field reader, the normalized serialization, and the IR fingerprint.
- [x] **FR-051:** The compatibility classifier and the two contract-version projections under one published policy.
- [x] **FR-052:** `compilePackage` and the `compile`, `inspect`, and `diff` verbs behind the narrow interface.

### Non-Functional Requirements

- [x] **NFR-019:** Byte-identical output across every host-varying input, with every read observed by one injected host.
- [x] **NFR-020:** Untrusted input, finite limits, no code execution, no network, no path escape, no stray write.
- [x] **NFR-021:** No publication, no consumer move, no export-surface change, no frozen byte touched, clean restore.

## Dependency Graph

```text
Task-068 -> Task-069 -> Task-070 -> Task-071 -> Task-072 -> Task-073 -> Task-074 --\
                     \                                                              +-> Task-077 -> Task-078 -> Task-079
                      +-> Task-075 -> Task-076 -------------------------------------/
```

### Task file mapping

| Task | File | Status | Track |
|---|---|---|---|
| Task-068 | [Task-068](./tasks/Task-068-guards-and-red-suite.md) | done | A |
| Task-069 | [Task-069](./tasks/Task-069-host-diagnostics-and-json-loci.md) | done | A |
| Task-070 | [Task-070](./tasks/Task-070-canonicalization-digests-and-lock.md) | done | A |
| Task-071 | [Task-071](./tasks/Task-071-package-graph-resolution.md) | done | A |
| Task-072 | [Task-072](./tasks/Task-072-frontend-seam.md) | done | A |
| Task-073 | [Task-073](./tasks/Task-073-semantic-vocabulary-and-identities.md) | done | A |
| Task-074 | [Task-074](./tasks/Task-074-typespec-structural-lowering.md) | done | A |
| Task-075 | [Task-075](./tasks/Task-075-ir-reader-and-normalization.md) | done | B |
| Task-076 | [Task-076](./tasks/Task-076-compatibility-diff-and-evolution.md) | done | B |
| Task-077 | [Task-077](./tasks/Task-077-pipeline-cli-and-interface.md) | done | A |
| Task-078 | [Task-078](./tasks/Task-078-determinism-safety-and-non-disruption-gates.md) | done | A |
| Task-079 | [Task-079](./tasks/Task-079-review-gap-analysis-and-pr.md) | done | A |

- Task-068 fixes the guards first. Six changed-path allowlists on `main` were written by earlier tickets against their own branches and fail on any path a later ticket adds; each is scoped, as issue #27 scoped five of them, and the red suite is authored before any implementation file exists.
- Task-069 lands the three primitives everything else needs: the injected host (the mechanism that makes every NFR-019 and NFR-020 claim observable rather than asserted), the diagnostic registry, and the JSON pointer locator.
- Task-070 and Task-071 are the package side; Task-071 also authors the fixture package corpus under `test/fixtures/compiler/packages/**` that most later criteria run on.
- Task-072, Task-073, and Task-074 are the frontend, split exactly where SR-071 FND-603 asked: the seam, the vocabulary and identity minting, then the structural lowering.
- Task-075 and Task-076 (track B) depend only on Task-069 and the published schemas, so they run in parallel with the package and frontend work.
- Task-077 joins both tracks behind `compilePackage` and the CLI.
- Task-078 runs the cross-cutting determinism, safety, and non-disruption gates over the finished tree and publishes the two documents.
- Task-079 is the closing gate: code review, gap analysis, PR. FR-049's registry-completeness criteria (FR-049-AC-2, AC-3, CON-3) close here rather than in Task-069, which is the ordering answer to SR-068 FND-543.

### Cross-cutting constraints

- NFR-019 permits `src/compiler/{frontend,packages,ir,compat}/**`, `src/compiler/{diagnostics,inspect,json-locus,pipeline,host,cli,index}.mjs`, `src/compiler/index.d.mts`, `test/fixtures/compiler/**`, `test/**`, `spec/**`, `plan/**`, `reviews/**`, `scripts/**`, the two new `docs/semantic-data-system/` documents, `Makefile`, and `package.json` `scripts`.
- Prohibited, meaning no byte changes: `src/compiler/{ir,compile,identity}.mjs`, `src/compiler/emitters/**`, `src/compiler/backends/**`, `src/compiler/inventory.json`, `schema/**`, `fixtures/semantic/**`, `fixtures/semantic-core/**`, `packages/**`, `spikes/**`, `conformance/**`, `tests/**`, `test/semantic-ir-v1-1-reader.ts`, `test/semantic-core-reader.ts`, `test/semantic-core-lowerer.ts`, `agent_ix_core_data/**`, `src/generated.ts`, `audit/**`, `.github/**`, and every corpus repository. Reading them, and invoking `poetry run python tests/semantic_ir_reader.py`, remain permitted.
- No dependency is added; `@typespec/*` stay exact devDependency pins. No `file:`/`link:` specifier. No `.npmrc` is committed. Every added manifest is AGPL-3.0-only.
- Every changed-path gate uses `git diff --no-renames`, the lesson Plan-007's Task-067 paid for.
- The four committed issue #4 goldens and the frozen prototype modules are the differential oracle for the promotion and are never touched.

## The Seams

```text
cli.mjs
  └─ pipeline.mjs  compilePackage: resolve → lock → frontend → validate → write
       ├─ packages/{manifest,resolve,lock,canonical}.mjs   + json-locus.mjs
       ├─ frontend/seam.mjs ── frontend/typespec/{frontend,host,lower}.mjs
       │                        └─ frontend/typespec/{identity,vocabulary}.mjs
       │                             └─ frontend/typespec/lib/{main.tsp,lib.mjs}
       │                        frontend/spec-bundle/frontend.mjs   (issue #36)
       ├─ ir/{schema,reader,normalize}.mjs
       ├─ compat/{diff,evolution}.mjs
       ├─ inspect.mjs
       ├─ diagnostics.mjs
       └─ host.mjs        one injected host; nothing below it touches node:fs
```

The decorator library is delivered to a compiled package through the TypeSpec
compiler's `additionalImports` at an absolute path, so no package under
compilation ever names a path outside its own root. The injected host implements
`readFile`, `stat`, `realpath`, and `getJsImport`, which is how confinement and
the refusal of package-supplied JavaScript are enforced rather than asserted.
Both routes were proven against the pinned `@typespec/compiler` 1.15.0 before the
plan was written.

Tests live in `test/compiler-core.test.ts` and trace TC-398..619.

## Test Plan

- [x] **TC-398..411:** the seam, the dialect registry, the refusal of `spec-bundle`, the shared harness, the never-throw discipline.
- [x] **TC-412..431:** the fifteen decorators, argument validation, identity minting against FR-034, the constraint alias, the four extensions, declared loss.
- [x] **TC-432..455:** the structural-kind and scalar tables, roles, multiplicity, nullability, defaults, units, kernel scalars, the envelope, ordering, origins, the confined host, and the frozen-prototype proof.
- [x] **TC-456..476:** manifest reading and loci, candidate selection, exports and capabilities, cycles, profiles, mappings, targets, confinement, and the graph-case corpus.
- [x] **TC-477..491:** the RFC 8785 vectors, every digest's byte set, the fingerprint's inclusion and exclusion contract, lock build and verification.
- [x] **TC-492..509:** the two registered namespaces, code shape, ordering, sort-before-truncate, limits, blocking discipline, and the published registry.
- [x] **TC-510..526:** schema validation, the 22 cross-field rules, three-reader agreement, normalization, idempotence, the fingerprint, termination.
- [x] **TC-527..546:** every compatibility case, the family map, the two projections and their goldens, the round trip, the published policy.
- [x] **TC-547..566:** `emit-ir` unchanged, the five compile phases, the three verbs, exit codes, the fifteen-symbol interface, and the unchanged package manifest.
- [x] **TC-567..578:** repeat-run and varied-environment byte identity, ambient-input analysis, permutation and collator independence, injected-host observation.
- [x] **TC-579..589:** the four size limits, path escape, module refusal, no network, the writer, cyclic termination, the fuzz run, message truncation.
- [x] **TC-590..597:** changed paths, package manifest, frozen paths, the issue #4 goldens, `conformance/`, the restore rehearsal, licences, no publication.
- [x] **TC-598..619:** the permutation, boundary, error-path, state-transition, and edge-case rows.

### Entrance Criteria

- US-010, FR-045..053, NFR-019..021, TC-398..619 and SR-065..072 validate with Quire (done 2026-09-04).
- `origin/main` at 51febd4 with the promoted prototype compiler in `src/compiler/`.
- The `additionalImports` and injected-`CompilerHost` routes proven against `@typespec/compiler` 1.15.0.

### Exit Criteria

- `make lint`, `make test`, `make build` and `make typecheck` green, with measured counts recorded.
- Every TC-398..619 passing, or recorded as blocked against a named issue.
- No byte changed under any prohibited path, proven by `git diff --no-renames` against `origin/main`.
- Code review and gap analysis recorded under `reviews/`, PR opened against main, not merged.
