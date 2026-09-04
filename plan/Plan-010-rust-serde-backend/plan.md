---
id: Plan-010
title: "Rust/Serde semantic codegen backend"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-057"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-060"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-062"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: references
---
# Implementation Plan: Rust/Serde semantic codegen backend

Issue: `agent-ix/filament-core-data#21`. Reviews: SR-077..084 under
`spec/reviews/21-rust-serde-backend/`. Predecessor bundle: Plan-009 (the
conformance corpus and oracle), whose `rust-backend` adapter slot this plan
fills. Runs in parallel with issues #22 and #23, which answer the same mapping
questions in TypeScript and Python and share no generated code with this one.

## Requirements Summary

### Stakeholder and User Requirements

- [ ] **StR-001:** Keep the semantic contract governed by evidence a reviewer can check without running the thing being judged.
- [ ] **US-011:** Hand a Rust consumer a crate whose types are the contract, so a contract change becomes a build failure rather than a silent drift.

### Functional Requirements

- [ ] **FR-054:** One total mapping keyed on `kind`, with the eight-row field-axis composition and its serde attributes, the reference graph over every edge, and a named refusal wherever the contract declares no form.
- [ ] **FR-055:** Identifiers derived from the semantic identity by a pure total function, refusing rather than mangling, with collisions raised and never suffixed away.
- [ ] **FR-056:** The emitted crate: finite static exports, a named dynamic surface, derived documentation, provenance constants, the output manifest, and `publish = false` on every manifest.
- [ ] **FR-057:** Constraint enforcement at the construction and deserialization boundary, and the ECMA-262-under-RE2 decision procedure that answers GAP-002 with a proved validator rather than a weakened pattern.
- [ ] **FR-058:** Two closed diagnostic sets, a refusal that writes no file, and no silent substitution of `String`, an open value, or an untyped map.
- [ ] **FR-059:** The `rust-backend` adapter, its independent Rust reader, and agreement with the oracle on 111 of 111 cases.
- [ ] **FR-060:** Byte-identical, formatter-clean output, frozen goldens with a separately written digest baseline, and a support matrix that lists no row supported without measured evidence.
- [ ] **FR-061:** Two consumers built from the packaged artifact, offline, with no registry contact.
- [ ] **FR-062:** A branch register generated from the vocabularies and a mutation catalogue generated from an operator set, so neither can be shrunk to pass.

### Non-Functional Requirements

- [ ] **NFR-022:** Deterministic and hermetic generation; no clock, network, environment, locale, hostname or path outside the request reaches an emitted byte.
- [ ] **NFR-023:** No crate published, no published schema or fixture changed, one conformance path written, and a changed-path range fixed at both ends by history.

## Dependency Graph

```text
Task-080 ─┬─ Task-081 ── Task-082 ── Task-083 ─┬─ Task-085 ── Task-086 ── Task-090 ── Task-091 ─┐
          │              Task-084 ─────────────┘                                                │
          └─ Task-087 ── Task-088 ── Task-089 ───────────────────────────────────────────────── ┴─ Task-092 ── Task-093 ── Task-094 ── Task-095
```

Task-084 depends on Task-081 only, so the pattern work and the mapping work run
in parallel once the registry exists. Track C is entered at Task-080 and runs
beside Track B throughout, because its length is set by an artifact outside this
ticket rather than by the mapping table.

## Execution Tracks

| Track | Tasks | What it is | Runs beside |
|---|---|---|---|
| A | Task-080..082 | Enablement: the workspace, the diagnostic registry, the identifier derivation | — |
| B | Task-083..086 | The generator: mapping, patterns, constraints, crate emission | C |
| C | Task-087..089 | The independent Rust reader and the conformance adapter | B |
| D | Task-090..095 | Evidence and closure: determinism, consumers, census, gates, review | — |

The ordering is SR-080's logical dependency order, not the requirement
numbering. FR-055's derivation and FR-058's registry are modules that FR-054 and
every emitter call already assume exist, so they are tasked before the mapping
model even though the declared requirement graph puts FR-054 first. FR-058's
completeness criteria and the whole of FR-062 are censuses of a finished mapping
and are tasked last, which is SR-080 FND-931.

## Test Plan

Every task names the TC rows it turns green in its `verifies` edges; the matrix
rows themselves are authoritative in `spec/tests.md` and are not mirrored here.
The plan-level shape is:

| Phase | Rows | Gate |
|---|---|---|
| Enablement | TC-658..665, TC-690..691 | Derivation is injective-or-refusing; the registry throws on an unregistered code |
| Generation | TC-645..657, TC-666..689 | The mapping is total; every refusal writes no file; the matcher agrees with an ECMA-262 engine |
| Independent reader | TC-698..710 | 111 of 111 matched against the oracle, with the negative controls proving unmet stays reachable |
| Evidence | TC-711..736 | Two runs byte-identical; one platform row supported with named evidence, the rest unmet |
| Closure | TC-692..697, TC-725..730, TC-737..744 | Registry and register complete; the change set is permitted and does not accrete |

## Quality Gates

| Gate | When | Condition | Consequence if unmet |
|---|---|---|---|
| G1 Enablement | after Task-082 | `names.mjs` and `diagnostics.mjs` are pure, closed, and ambient-free | Track B does not start; every later module would inherit the defect |
| G2 GAP-002 | after Task-084 | The proved validator agrees with an ECMA-262 engine on every probed input, and the perturbations fail the harness | The pattern work is not carried forward; a weakened pattern is not an option |
| G3 Emission | after Task-086 | Every corpus base generates a crate that builds offline with warnings denied, and a blocking diagnostic writes no file | Track D does not start |
| G4 Oracle agreement | after Task-089 | The harness reports 111 matched, 0 unmet, 0 failed, exit 0 | The backend is wrong; a case, a base, a verdict, a threshold or the oracle is not touched to close it |
| G5 Determinism | after Task-090 | Two runs and four environment perturbations are byte-identical; one platform row is supported with named evidence | Recorded unmet with its owning issue, never construed as met |
| G6 Census | after Task-092 | Every branch row names a case; the mutation score is 1.0 over a generated catalogue | Closed by adding a case, never by dropping a mutation |
| G7 Non-disruption | after Task-094 | Every path permitted, none prohibited, no crate published, the revert leaves the suite green | The branch does not open a pull request |

## Declared limits

Two limits are closed with rather than around, and are stated here so the plan
does not read as promising what it cannot deliver.

1. **The second platform.** The ticket's fourth acceptance criterion needs two
   platforms. The repository's only CI is a Node-only reusable workflow on
   `workflow_dispatch` with no Rust toolchain, and `.github/**` is prohibited to
   this change by NFR-023. Exactly one platform row closes supported with named
   measured evidence; every other row closes unmet with its reason and issue
   #60.
2. **Five contract questions.** The locus pattern's line-terminator bypass
   (#56), the `AGPL-3.0-or-later` licence expression (#57), the union and
   `bytes` wire forms (#58), the contract-gap register's upkeep (#59), and the
   CI gap (#60) are filed against their artifact owners. Each touches a
   prohibited path, and deciding one inside this backend is the failure the
   independent corpus exists to catch.

## Exit Criteria

- [ ] Every task `done`, every gate G1..G7 passed or recorded unmet with its owning issue.
- [ ] `make lint`, `make test`, `poetry run pytest` green on the branch head.
- [ ] The same three suites green in a simulated post-merge state, and green again with a real unrelated sibling commit on top.
- [ ] Every guard added has a falsification run showing it bites with the fix reverted, and a perturbation run showing it still bites after a plausible unrelated change.
- [ ] SR-085 (code review) and SR-086 (gap analysis) recorded under `reviews/`.
- [ ] `crates/semantic-ir` has a named maintainer for the period after issue #21 closes, or the question is filed.
- [ ] No crate published, and the pull request opened but not merged.
