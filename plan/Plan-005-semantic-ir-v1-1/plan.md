---
id: Plan-005
title: "Semantic IR v1.1: multiplicity, units, relationships, operations, clauses, closed constraints"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: references
---
# Implementation Plan: Semantic IR v1.1

Issue: `agent-ix/filament-core-data#34`. Reviews: SR-027..034 under
`spec/reviews/34-semantic-ir-v1-1/`. Predecessor bundle: Plan-004.

## Requirements Summary

### Stakeholder and User Requirements

- [ ] **StR-001:** Keep the durable semantic contract governed and additive while Wave 4 module declarations become representable.
- [ ] **US-006:** Let a module author's fields, multiplicities, units, relationships, operations, and formal clauses survive into the IR without loss.

### Functional Requirements

- [ ] **FR-020 (AC-7, AC-8):** Five new node kinds round-trip byte-identically; two independent readers agree on every fixture.
- [ ] **FR-027:** Field `multiplicity` and `unit`, derived `presence`, kind resolution through aliases, materialization rule, classifier rules.
- [ ] **FR-028:** `relationships[]`, `operations[]`, `clauses[]` with target resolution, composite acyclicity, `clauseId` binding, opaque `text`, FR-040 category parity.
- [ ] **FR-029:** Closed constraint keyword enumeration, per-keyword typed operands and applicability, compiled regex check.
- [ ] **FR-030:** `contractVersion` `1.0.0`/`1.1.0` discriminator in one schema file, version-conditional `source.dialect`, shared target enumeration.

### Non-Functional Requirements

- [ ] **NFR-013:** Additive revision: v1 fixtures unchanged, spike byte-identical, compatibility corpus records `additive`, changed-path gate, fixture inventory.

## Dependency Graph

```text
Task-034 -> Task-035 -> Task-036 -> Task-038 --\
                    \                          +-> Task-039 -> Task-040
                     +-> Task-037 -------------/
```

- Task-034 fixes the red suite, the changed-path guard, and the spike/v1-fixture baselines before any schema edit.
- Task-035 decides the discriminator every version-conditional rule depends on (SR-030 FND-071); nothing else may edit `semantic-ir.schema.json` before it lands.
- Task-036 (fields) and Task-037 (constraints) touch disjoint `$defs` and run in parallel after Task-035.
- Task-038 reuses the FR-027 `multiplicity` object and so follows Task-036.
- Task-039 joins the three node families in the `ConfigVersion` worked-example fixture, the compatibility corpus entry, and `contracts-v1.md`.
- Task-040 is the closing gate: FR-020-AC-7/AC-8 verify the nodes Tasks 036..038 define, so they close the slice rather than precede it (SR-030 FND-070).

### Cross-cutting constraints

- NFR-013 permits edits only under `docs/semantic-data-system/contracts-v1.md`, `schema/semantic/v1/`, `fixtures/semantic/v1/`, `spec/`, `test/`, `tests/` (Python second reader, test-only), `pyproject.toml`/`poetry.lock` (test deps), `reviews/`, `plan/`.
- `spikes/`, `src/`, generated packages, catalog pins, and every corpus repository (config-service included) are read-only.
- Every schema change keeps `contractVersion: "1.0.0"` documents valid byte-for-byte and adds no derived bytes to them.

## The Seams

All v1.1 rules live in `schema/semantic/v1/semantic-ir.schema.json`,
`package-manifest.schema.json`, `target-contract.schema.json`, and
`common.schema.json`, discriminated by `contractVersion`. Cross-field rules that
JSON Schema cannot express (kind resolution through aliases, clause binding,
target resolution, composite acyclicity, keyword applicability, regex
compilation) are implemented twice: in the TypeScript Vitest reader under
`test/` and in a Python `jsonschema` reader under `tests/`, and
TC-232 compares them. Fixtures attach under `fixtures/semantic/v1/positive/`
and `fixtures/semantic/v1/negative/cases.json`.

## Test Plan

- [ ] **TC-208, TC-231, TC-234, TC-236:** v1 fixtures unchanged, v1 IR fixture valid, spike byte-identical, changed-path guard.
- [ ] **TC-227..230, TC-246:** dialect by version, retired constant rejected, manifest targets bound, unknown version rejected.
- [ ] **TC-203..207, TC-237, TC-238:** multiplicity, derived presence, flags, units, kind resolution, classifier rules.
- [ ] **TC-219..225, TC-244, TC-245:** closed keywords, typed operands, applicability, regex compilation, classifier rules.
- [ ] **TC-210..217, TC-239..243:** relationships, operations, clauses, target resolution, composite cycles, `clauseId` uniqueness, FR-040 parity.
- [ ] **TC-209, TC-218, TC-226, TC-235:** `ConfigVersion` worked example, compatibility corpus entry.
- [ ] **TC-232, TC-233, TC-247:** two-reader agreement, generated round-trip property, fixture inventory.

### Entrance Criteria

- US-006, FR-027..030, NFR-013, FR-020-AC-7/8, TC-203..247, and SR-027..034 validate with Quire (done 2026-09-03).
- `pnpm test` and `pnpm spike:typespec:check` pass on the base commit and their outputs are recorded as the Task-034 baseline.

### Exit Criteria

- All 45 issue #34 cases pass; the 202 prior cases pass unchanged.
- `spike:typespec:check` output is byte-identical to the baseline.
- The compatibility corpus records v1 → v1.1 as `additive` with the node list.
- Code review and gap analysis report no blocking finding; the PR carries a "mergeable" comment.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-034** Red suite, scope guard, and baselines — Medium; exit: every v1.1 case fails for an attributable reason, guard and baselines green.
- **A2 = Task-035** Version discriminator, dialect, and target binding — Medium; exit: `1.0.0` and `1.1.0` fixtures validate under one file; unknown version and retired dialect fail.
- **A3 = Task-036** Field multiplicity and units — Hard; exit: TC-203..207, TC-237, TC-238 green with derived presence and no v1 byte drift.
- **A4 = Task-038** Relationships, operations, and clauses — Hard; exit: TC-210..217, TC-239..243 green including FR-040 parity.

### Track B: Parallel after the discriminator

- **B1 = Task-037** Closed constraint vocabulary — Medium; exit: TC-219..225, TC-244, TC-245 green with one fixture per keyword.

### Track C: Join and gates

- **C1 = Task-039** Worked example, compatibility entry, and contract document — Medium; exit: TC-209, TC-218, TC-226, TC-235 green; `contracts-v1.md` describes v1.1.
- **Gate = Task-040** Second reader and round-trip property — Hard; exit: TC-232, TC-233, TC-247 green; then `/code-review` + `/gap-analysis`.

## Parallel Execution Summary

```text
time ->  Task-034 -> Task-035 -> Task-036 -> Task-038 --\
                              Task-037 -----------------+-> Task-039 -> Task-040 -> review + gap analysis
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-034 | A | NFR-013 | TC-208, TC-231, TC-234, TC-236 | done |
| Task-035 | A | FR-030 | TC-227..230, TC-246 | done |
| Task-036 | A | FR-027 | TC-203..207, TC-237, TC-238 | done |
| Task-037 | B | FR-029 | TC-219..225, TC-244, TC-245 | done |
| Task-038 | A | FR-028 | TC-210..217, TC-239..243 | todo |
| Task-039 | C | FR-027, FR-028, FR-029, NFR-013 | TC-209, TC-218, TC-226, TC-235 | todo |
| Task-040 | Gate | FR-020, US-006, NFR-013 | TC-232, TC-233, TC-247 | todo |

## Coordination Rules

- Task-035 is the only task that may introduce the `contractVersion` discriminator; later tasks add branches under it.
- Single-writer per `$defs` entry: `field` → Task-036; `constraint` → Task-037; `typeDefinition.relationships/operations/clauses` → Task-038; `source`, targets → Task-035.
- The Python reader is test-only evidence for TC-232; it is not a published package surface and adds no runtime dependency.
- No v1 positive fixture is edited; a v1.1 counterpart is added beside it when a case needs new bytes.
- Merge sequencing: Tasks 034..040 on `spec/34-semantic-ir-v1-1`, then `/code-review` and `/gap-analysis`, then the "mergeable" comment and squash merge verified on the tree.
