---
id: Plan-002
title: "Filament contract census and parity review"
type: Plan
status: complete
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-009"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-010"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-012"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-004"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-005"
    type: references
---
# Implementation Plan: Filament contract census and parity review

## Requirements Summary

### Stakeholder Requirements

- [x] **StR-001:** Extend the durable semantic-data record with source-cited evidence for safe migration decisions.

### Functional Requirements

- [x] **FR-009:** Pin repositories, corpus/catalog inputs, worktrees, active work, collection access, and pre-sign-off drift.
- [x] **FR-010:** Inventory every in-scope contract family with explicit source, ownership, producer/consumer, version, identity, optionality, provenance, and loss state.
- [x] **FR-011:** Compare repeated concepts and publish parity, conflict, and missing-contract dispositions without assuming equivalence.
- [x] **FR-012:** Assess repository and concept impact, active overlap, effort, risk, dependencies, wave, controls, and confidence.
- [x] **FR-013:** Publish the validated SpecReview and retain every limitation and remaining implementation gate.

### Non-Functional Requirements

- [x] **NFR-004:** Make normalized census evidence deterministic, schema-valid, source-resolvable, and explicit about manual judgment.
- [x] **NFR-005:** Change audit artifacts in `filament-core-data` only; leave examined contracts and all operational state unchanged.

## Dependency Graph

### Core dependency edges

- `Task-009 -> Task-010..Task-015`
  Reason: executable evidence schemas and red contract tests define the record shape and safety boundary before collection.
- `Task-010 -> Task-011`
  Reason: inventory evidence is meaningful only against immutable revisions and qualified collection sources.
- `Task-011 -> Task-012, Task-013`
  Reason: parity and impact analysis require stable contract identifiers and source loci.
- `Task-012 -> Task-013`
  Reason: impact controls and migration waves depend on the actual mismatch disposition.
- `Task-010 + Task-012 + Task-013 -> Task-014`
  Reason: the acceptance review requires refreshed inputs, parity/conflict evidence, and impact recommendations.
- `Task-014 -> Task-015`
  Reason: the final reproducibility/read-only gate inspects the completed review and its linked evidence.

### Shared dependencies

- Stable audit identifiers, explicit state enums, evidence-locus shape, and deterministic normalization are shared by every machine-readable artifact.
- The Task-010 repository snapshot is immutable evidence; later volatile refresh facts are recorded separately instead of rewriting the original observation.
- `filament-core-service#1` through `#4`, `filament-parser-lib#8`, `quire-rs#385`, and `filament-ide-rs#511` are existing program evidence, not work recreated by this plan.

### Cross-cutting constraints

- `NFR-004` applies to all JSON evidence and every manual method/rationale/confidence field.
- `NFR-005` applies to every task and prohibits schema fixes, DTO rewrites, database/corpus/catalog changes, package publication, enforcement, and external-repository mutation.
- Contract-affecting drift invalidates only affected evidence and blocks readiness; it never weakens the expected contract.

### The seams

Audit-only JSON evidence and its schema-aware Vitest suite live under
`audit/filament-contract-census/` and `test/contract-census.test.ts`. Source
repositories are read at their recorded revisions through Git, checked-in files,
generated loci, and authenticated GitHub metadata. No collector writes outside
`filament-core-data`, and no existing runtime or generated source path is edited.

## Test Plan

### Snapshot and source completeness

- [x] **TC-054:** Validate complete repository identity, branch, immutable HEAD, dirty state, and worktree fields.
- [x] **TC-055:** Validate immutable governed-corpus and catalog/module pins.
- [x] **TC-056:** Analyze source-cited in-flight contract work.
- [x] **TC-057:** Reject unstable or unavailable inputs without consequence/confidence dispositions.
- [x] **TC-058:** Require drift or explicit no-drift evidence from the pre-sign-off refresh.
- [x] **TC-088:** Require collection method/version/access and complete enumeration or an incomplete result.

### Inventory

- [x] **TC-059:** Require a disposition for every repository and contract family.
- [x] **TC-060:** Resolve every inventory record to source or a generated locus.
- [x] **TC-061:** Preserve unknown, unavailable, none, and not-applicable states.
- [x] **TC-062:** Preserve authored/generated/persisted/wire/analytical/extracted representation roles.
- [x] **TC-063:** Reject duplicate identifiers and orphan evidence references.

### Parity, conflicts, and impact

- [x] **TC-064:** Require exactly one allowed fit disposition per contract.
- [x] **TC-065:** Require parity or explicit not-comparable evidence for repeated concepts.
- [x] **TC-066:** Trace every material field/semantic mismatch into the conflict ledger.
- [x] **TC-067:** Reject `fit` when equivalence evidence is incomplete.
- [x] **TC-068:** Reuse and disposition the four existing dynamic-schema issues.
- [x] **TC-069:** Require effort/risk/dependency/wave/confidence per repository and concept.
- [x] **TC-070:** Require affected systems, compatibility controls, and gates for disruptive findings.
- [x] **TC-071:** Record active-work overlap and sequencing consequences.
- [x] **TC-072:** Reject impact records that imply migration approval.

### Review and cross-cutting verification

- [x] **TC-073:** Validate the SpecReview and all required evidence links.
- [x] **TC-074:** Disposition every issue acceptance criterion with cited evidence.
- [x] **TC-075:** Prevent readiness after contract-affecting drift.
- [x] **TC-076:** Name every remaining implementation and promotion gate.
- [x] **TC-077:** Preserve unknown and low-confidence findings.
- [x] **TC-078..081:** Prove zero external/runtime/publication/enforcement changes and zero weakened requirements.
- [x] **TC-082:** Validate every machine-readable evidence artifact.
- [x] **TC-083:** Prove deterministic normalized evidence from unchanged inputs.
- [x] **TC-084:** Resolve evidence references at recorded revisions.
- [x] **TC-085:** Require method, rationale, and confidence for manual assessments.
- [x] **TC-086:** Demonstrate end-to-end comparison of a repeated concept.
- [x] **TC-087:** Demonstrate that an unconfirmed consumer remains explicit and non-compatible.

### Entrance Criteria

- The issue #10 requirements, 100-percent mapped Test Matrix, and all eight composite SpecReview artifacts validate.
- `quire-rs#385` is closed and its governed corpus repository is available or explicitly pinned/unavailable.
- `filament-parser-lib#8` and `filament-ide-rs#511` remain snapshot inputs and do not block read-only collection.

### Exit Criteria

- TC-054 through TC-088 pass with retained automated or analysis evidence.
- Every issue #10 deliverable is linked from one validated SpecReview.
- A fresh volatile-source snapshot is recorded immediately before sign-off.
- The final diff changes audit requirements, plan, evidence, review, and audit-only tests/tooling; external and operational change counts remain zero.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-009** Audit evidence contract and red tests — Hard; exit: malformed, incomplete, non-deterministic, or migration-authorizing fixtures fail before evidence is authored.
- **A2 = Task-010** Pinned source and active-work snapshot — Hard; exit: every in-scope source has immutable revision/access/completeness evidence or an explicit incomplete disposition.
- **A3 = Task-011** Contract inventory — Hard; exit: every repository and contract family resolves to typed inventory records and evidence loci.
- **A4 = Task-012** Parity and conflict analysis — Hard; exit: repeated concepts have field-level evidence and unproven equivalence cannot be `fit`.
- **A5 = Task-013** Impact assessment — Hard; exit: each repository/concept has risk, effort, dependencies, wave, confidence, controls, and active-overlap consequence.
- **A6 = Task-014** Census SpecReview and drift refresh — Hard; exit: a validated review links all evidence and remains non-ready if sources drift.
- **Gate = Task-015** Reproducibility and read-only merge gate — measures evidence determinism/completeness and repository/release mutation; pass: all 35 issue #10 cases pass and prohibited change counts remain zero.

## Parallel Execution Summary

```text
Task-009 -> Task-010 -> Task-011 -> Task-012 -> Task-013 -> Task-014 -> Task-015
```

The evidence is deliberately serial: later analysis derives from immutable IDs
and sources created by earlier tasks. Repository scanning may be internally
concurrent only when each reader is read-only and writes through one normalized
evidence assembler.

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-009 | A | NFR-004, NFR-005 | TC-061, TC-063..064, TC-067, TC-072, TC-075, TC-077..085, TC-088 | done |
| Task-010 | A | FR-009 | TC-054..057, TC-088 | done |
| Task-011 | A | FR-010 | TC-059..063 | done |
| Task-012 | A | FR-011 | TC-064..068 | done |
| Task-013 | A | FR-012 | TC-069..072 | done |
| Task-014 | A | StR-001, FR-013 | TC-058, TC-073..077, TC-086..087 | done |
| Task-015 | Gate | StR-001, NFR-004, NFR-005 | TC-078..085 | done |

## Coordination Rules

- Treat every examined repository as read-only and preserve pre-existing dirty state exactly.
- Never fetch, checkout, reset, generate into, format, or test an examined repository when that action can mutate it; use existing files and read-only Git metadata.
- One normalized evidence assembler owns machine-readable output ordering and identifiers.
- Refresh volatile GitHub and worktree state only in Task-014; retain the original snapshot for drift comparison.
- Do not turn a census finding into a code, schema, database, consumer, package, catalog, or enforcement change in this plan.
- If collection access is incomplete, publish the limitation and lower confidence; do not infer absence.
- A final ready disposition is a recommendation for the next specification gate, not permission to migrate.
