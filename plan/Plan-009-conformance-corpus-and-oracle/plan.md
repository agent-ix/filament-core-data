---
id: Plan-009
title: "Semantic conformance corpus and independent differential oracle"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-038"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-039"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: references
---
# Implementation Plan: Semantic conformance corpus and differential oracle

Issue: `agent-ix/filament-core-data#20`. Reviews: SR-047..054 under
`spec/reviews/20-conformance-corpus/`. Predecessor bundle: Plan-006
(semantic-core grammar). Runs in parallel with issue #27 and issue #19 by
design: the corpus is the yardstick #19 is judged against, so it is authored
independently of #19's implementer.

## Requirements Summary

### Stakeholder and User Requirements

- [x] **StR-001:** Keep the semantic contract governed by evidence a reviewer can check without running the thing being judged.
- [x] **US-008:** Let a reviewer judge the compiler and its backends against a contract-derived corpus rather than against their own output.

### Functional Requirements

- [x] **FR-035:** Versioned corpus under `conformance/`: input bundles, base-plus-patch cases, contract-cited provenance, raw-byte digests, minimization budget, SemVer rules.
- [x] **FR-036:** Independent oracle: pinned schema layer with the deepest-location collapse rule, cross-field rules, package-context rules, the diagnostic-code register, exhaustive `resultState`, IR-surface compatibility classification, cycle-before-depth, and no import of a judged implementation.
- [x] **FR-037:** Differential harness: adapter registry with four declared slots, `caseDigest` binding, oracle-only comparison, declared `unsupported` and `unavailable`, divergence register with owner and verdict, clock-free report, separate audit target.
- [x] **FR-038:** Construct register of 22 families with four case classes per row or a justified `notApplicable`, the six package negatives, the four presence/nullability combinations, recursion and cycles, the defect register, and the unmet serialization area.
- [x] **FR-039:** Generated coverage account, proposed promotion thresholds, committed mutation catalogue, and the import API — with no change to the published package surface.

### Non-Functional Requirements

- [x] **NFR-015:** No expectation blessed from a run; byte-identical verdicts, reports, and coverage across runs, locales, and working directories; disagreements recorded, never absorbed.
- [x] **NFR-016:** Everything the corpus owns lives under `conformance/`; no change to `spikes/`, `src/`, `packages/`, `schema/`, `fixtures/`, `docs/`, `.github/`, either lockfile, or the package surface.

## Dependency Graph

```text
Task-048 -> Task-049 -> Task-050 -> Task-051 --\
                              \                 +-> Task-054 -> Task-055 -> Task-056
                               +-> Task-052 ---/
                     Task-049 -> Task-053 -----/
```

- Task-048 lands the conformance schemas, the changed-path guard, and the failing suites before any case exists, so every later task has a red gate to turn green.
- Task-049 lands the bases, the patch dialect, the manifest, and the digest machinery; every case and the oracle read through it.
- Task-050 lands the oracle. It is the critical path: the corpus gate for a negative case is an oracle verdict.
- Task-051 (document families) and Task-052 (package, version, compatibility families, defect and contract-gap registers) author the cases and run in parallel once the oracle exists.
- Task-053 (harness, registry, stub adapters, divergence register) depends only on the corpus loader and a verdict, so it runs beside the case work.
- Task-054 joins them: coverage, thresholds, mutations, import API.
- Task-055 produces the determinism, locale, directory, and offline evidence and wires the Make targets.
- Task-056 is the closing gate.

### Cross-cutting constraints

- NFR-016 permits `conformance/**`, `spec/**`, `plan/**`, `reviews/**`, `spec/reviews/**`, `test/conformance-corpus.test.ts`, `tests/test_conformance_corpus.py`, `Makefile` (new targets), and the cumulative changed-path allow-lists the earlier tickets' gates carry in `test/*.test.ts`, which every ticket extends.
- Prohibited: `/spikes/**`, `/src/**`, `/packages/**`, `/schema/**`, `/fixtures/**`, `/docs/**`, `/.github/**`, `/package.json`, `/pyproject.toml`, `/biome.json`, `/tsconfig*.json`, and both lockfiles. `package.json` is prohibited outright because issue #9's own gate requires it byte-identical to `main`, so the Make targets call `node` directly rather than adding a script.
- The oracle imports no judged implementation and reads no clock, network, or environment. The audit target is the only entry point that reads a clock.
- Every expected result is authored from a contract clause the case quotes. No expectation is captured from a run.
- The prototype emitter may be read and may be run read-only into a scratch output directory; nothing under `spikes/` changes.

## The Seams

`conformance/schema/` composes the published v1 schemas into the input bundle,
the case, the manifest, and the adapter result. `conformance/bases/` holds the
contract-valid bundles; `conformance/cases/<family>/` the cases.
`conformance/oracle/` is the verdict engine and the import API and depends on
nothing in the repository outside `schema/`. `conformance/adapters/` holds the
registry and the stub adapters the harness tests drive.
`conformance/runner/` is the harness. The registers —
`diagnostic-codes.json`, `divergences.json`, `contract-gaps.json`,
`defects.json`, `thresholds.json`, `mutations.json` — sit at the
`conformance/` root beside the generated `coverage.json`.
`test/conformance-corpus.test.ts` and `tests/test_conformance_corpus.py` are the
two suites; the Python suite reads the same JSON with the already-pinned
`jsonschema` so `poetry run pytest` has a real gate.

## Test Plan

- [x] **TC-640..341:** changed-path gate, manifest diff, offline run, publication analysis.
- [x] **TC-280..289:** case, base, and manifest schemas; provenance quotes; digests; blessing ban; minimization budget; `test`-op rule; deletion and versioning gates; diagnostic shape; id, pattern, and directory rules.
- [x] **TC-290..301:** oracle verdict equality, determinism and locale, cycle before depth, five distinct codes, import and effect analysis, `1.0.0` normalization, compatibility classification, published diagnostic shape, package-context rules, schema-layer collapse, code register, non-bundle input.
- [x] **TC-302..313:** harness exit, seeded divergences, agreeing-but-wrong adapters, unmet rows, register reproduction and audit, report determinism, adapter failure, declared `unsupported`, runner source analysis, `caseDigest` binding, pointer compatibility, registry slots.
- [x] **TC-314..323:** class coverage, the six package negatives, presence and nullability, recursion and cycles, the defect register, deciding layers, union payloads, evolution cases, register sources and #19 criteria, the unmet serialization area.
- [x] **TC-626..332:** coverage regeneration, thresholds, mutation catalogue, import API, unknown id, registry and threshold mismatch, package surface, coverage determinism.
- [x] **TC-635..337:** provenance, cross-run determinism, import and effect analysis, register inspection, expectation-change rule.

### Entrance Criteria

- US-008, FR-035..039, NFR-015, NFR-016, TC-280..319 and TC-622..419, and SR-047..054 validate with Quire: zero errors, zero grammar findings (done 2026-09-03).
- `pnpm test` and `poetry run pytest` green on the base commit.

### Exit Criteria

- All 62 issue #20 cases pass; the 279 prior cases pass unchanged.
- `make conformance` exits zero; two runs, two locales, and two working directories produce byte-identical reports and coverage.
- The changed-path gate reports no prohibited path; `package.json` gains no `exports` or `files` entry; neither lockfile changes.
- Code review and gap analysis report no blocking finding; the PR carries a "mergeable" comment.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-048** Conformance schemas, changed-path guard, red suites — Medium.
- **A2 = Task-049** Bases, patch dialect, manifest, and digests — Hard; exit: bases validate, digests recompute, a flipped byte fails.
- **A3 = Task-050** The oracle — Hard; exit: every rule has a registered code and a contract citation; the oracle imports no judged implementation.

### Track B: Case authoring (parallel after the oracle)

- **B1 = Task-051** Document families — Hard; exit: every document-family register row has its four classes or a justified `notApplicable`.
- **B2 = Task-052** Package, version, and compatibility families; defect and contract-gap registers — Hard; exit: the six package negatives fail at exact loci and every recorded prototype divergence has a row.

### Track C: Harness and accounting

- **C1 = Task-053** Harness, registry, stub adapters, divergence register — Hard; exit: a seeded stub divergence fails and names the locus; two agreeing stubs both fail.
- **C2 = Task-054** Coverage, thresholds, mutations, import API — Medium; exit: coverage regenerates byte-identically and every catalogued mutation is detected.

### Track D: Evidence and gate

- **D1 = Task-055** Determinism, locale, directory, and offline evidence; Make targets; Python suite — Medium.
- **Gate = Task-056** Code review, gap analysis, PR — closes when the "mergeable" comment is posted.

## Parallel Execution Summary

```text
time ->  Task-048 -> Task-049 -> Task-050 -> Task-051 --\
                             \             Task-052 ----+-> Task-054 -> Task-055 -> Task-056
                              +-> Task-053 -------------/
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-048 | A | NFR-016 | TC-640..341 | done |
| Task-049 | A | FR-035 | TC-280..289 | done |
| Task-050 | A | FR-036 | TC-290..301 | done |
| Task-051 | B | FR-038 | TC-314, TC-316, TC-317, TC-319, TC-622, TC-624 | done |
| Task-052 | B | FR-038, NFR-015 | TC-315, TC-318, TC-623, TC-625, TC-638, TC-639 | done |
| Task-053 | C | FR-037 | TC-302..313 | done |
| Task-054 | C | FR-039 | TC-626..331 | done |
| Task-055 | D | NFR-015, NFR-016 | TC-291, TC-295, TC-307, TC-634..335, TC-642 | done |
| Task-056 | Gate | US-008 | — | in progress |

## Coordination Rules

- Task-049 alone writes `conformance/bases/**` and `conformance/corpus.json`; later tasks add cases, registers, and code.
- Task-051 and Task-052 own disjoint case families and disjoint register files, so they do not collide.
- `coverage.json` is generated only by `make conformance`; it is never hand-edited.
- Nothing in this bundle edits `spikes/`, `src/`, `packages/`, `schema/`, `fixtures/`, or `docs/`. Reading them is required; writing them is not permitted.
- Merge sequencing: Tasks 048..055 on `spec/20-conformance-corpus-and-oracle`, then `/code-review` and `/gap-analysis`, then the "mergeable" comment. The owner merges.
