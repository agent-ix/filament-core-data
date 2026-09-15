---
id: Plan-012
title: "Qualified Python generation route for the semantic contract"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-072"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-074"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-075"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-080"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: references
---
# Implementation Plan: Qualified Python generation route

Issue: `agent-ix/filament-core-data#23`. Reviews: SR-097..SR-104 under
`spec/reviews/23-python-pydantic-backend/`. Predecessor bundle: Plan-009.
Runs beside issues #21 and #22, which hold FR-054..FR-071, NFR-022..NFR-025,
US-011..US-012, and TC-645..TC-844; this bundle touches none of their paths and
rebases after them.

This is a **qualification**, not a code-generator project. The generator is the
MIT `datamodel-code-generator` at `0.76.0`, pinned above both published advisory
floors. What this repository owns is the smallest AGPL surface that makes that
generator trustworthy: a schema preparation pass, two refusal guards, a
sandboxed runner, a non-executing source inspection, a package layout, and the
measured verdicts. FR-077-CON-1 forbids introducing a hand-written generator
absent a reviewed P0 gap.

## Requirements Summary

### Stakeholder and User Requirements

- [x] **StR-001:** Keep the semantic contract governed by evidence a reviewer can check.
- [x] **US-013:** Give Python consumers types that carry the contract's constraints rather than a generator's defaults, without acquiring a generator to maintain.

### Functional Requirements

- [x] **FR-072:** Declared pins, the advisory floor over GHSA-386q-5hp3-95m9 and GHSA-5578-w22f-pfx9, the `python-backend` dependency group, and gates that fail rather than skip.
- [x] **FR-073:** Five immutable profiles, one per output family; the option allow-list; `profile_digest` over the options alone.
- [x] **FR-074:** The owned `unevaluatedProperties` rewrite and the multi-document input mode, additive to FR-043 and touching neither it nor the published schemas.
- [x] **FR-075:** The five-key schema refusal set, the ref-shape refusals, the argument allow-list, and the closed refusal register.
- [x] **FR-076:** One sandboxed runner: guards first, scratch root, allow-listed environment, stated limits, declared-toolchain fingerprint, byte-identical repeat.
- [x] **FR-077:** The probe corpus, the per-family verdicts, the retained-gap register, and the read-only corpus account.
- [x] **FR-078:** The `ast` inspection in reporting and enforcing modes, with a stated attribution rule.
- [x] **FR-079:** The package layout, provenance, README, examples, and content fingerprint — published nowhere.
- [x] **FR-080:** Strict type checking over every emitted surface and falsifiable runtime validation of every recorded verdict.

### Non-Functional Requirements

- [x] **NFR-026:** Schema treated as executable input: refusal before spawn, no network, allow-listed environment, no execution during inspection, no gate that skips.
- [x] **NFR-027:** Same-host byte identity, a `--check`ed report, no host-observed reading inside a byte-compared artefact, no publication, and changed-path gates that actually assert.

## Dependency Graph

```text
Task-080 -> Task-082 -> Task-083 --\
Task-081 --/                        +-> Task-085 -> Task-086 -> Task-087 -> Task-089 -> Task-090 -> Task-091 -> Task-092
              Task-082 -> Task-084 -/                              \-> Task-088 ------------------/
```

- Task-080 lands the dependency group, the two records, the advisory gate, the `make test-python` entry point, and the failing suites, so every later task turns a real red gate green.
- Task-081 converts the six merged suites that still baseline on a moving ref. It is a prerequisite, not a courtesy: with those six unconverted, any new directory this bundle adds makes them red, and the only alternative is widening six permitted-path lists, which issue #55 records as how a guard gets disabled incrementally.
- Task-082 declares the profiles; Task-083 and Task-084 read the profile set and run in parallel.
- Task-085 is the runner and the critical path: everything downstream measures through it.
- Task-086 precedes Task-087 because the qualification measures through the inspection's reporting mode.
- Task-088 (the corpus account and the filed reader ticket) depends only on Task-087's generated Pydantic surface and runs beside Task-089.
- Task-091 produces the security and reproducibility evidence; Task-092 is the closing gate.

### Cross-cutting constraints

- NFR-026 and NFR-027 permit `python_backend/**`, `spec/**`, `plan/Plan-012-python-pydantic-backend/**`, `reviews/**`, `tests/**`, `test/**`, `pyproject.toml`, `poetry.lock`, and `Makefile`, and prohibit everything else — in particular `schema/**`, `fixtures/**`, `conformance/**`, `spikes/**`, `packages/**`, `src/**`, `docs/**`, `scripts/**`, `package.json`, `pnpm-lock.yaml`, `biome.json`, and `.github/**`.
- `package.json` is prohibited outright because issue #9's own gate requires it byte-identical to `main`, so the Python entry point is a Make target rather than a package script.
- No permitted-path entry is added to any merged suite's list. Task-081 fixes the encoding instead.
- Nothing is published. The safety gate on #23 forbids PyPI publication and consumer migration; publication is issue #11 and additionally passes agent-ix/quoin#290.
- No file under `conformance/` changes. The `python-backend` adapter slot stays `unavailable` and its rows stay unmet.
- Every original file is AGPL-3.0-or-later; the MIT upstream stays an attributed, pinned dependency with its licence preserved.

## The Seams

`python_backend/` holds the whole backend, in one language. `adapter/` is pure:
`profiles.py`, `prepare.py`, `guard.py`, and the canonical-JSON helper. `runner/`
is the impure half: `toolchain.py` reads installed distributions, `generate.py`
spawns the generator, `inspect_source.py` reads generated text with `ast`,
`qualify.py` drives the probe corpus, `emit.py` writes the package tree, and
`corpus_account.py` reads the conformance corpus without registering against it.
The declared data — `toolchain.json`, `advisories.json`, `profiles.json`,
`refusals.json`, `limits.json` — sits at the `python_backend/` root.
`qualification/` holds the probes and the measured `report.json`, `gaps.json`,
`corpus-account.json`, and `validation.json`. `generated/<profile-id>/` and
`examples/` hold the emitted trees. `tests/test_python_backend*.py` is the gate;
`test/python-backend.test.ts` carries only the tree assertions the vitest suite
is the natural home for — packaging, changed paths, and guard-range analysis.

## Test Plan

- [x] **TC-845..853:** pinned versions, advisory ranges and floor, ordered comparison, provisioning failure, extras, record-versus-lock agreement, no host reading.
- [x] **TC-854..862:** the five profiles, the required options, the prohibited options, the two rejected options, undeclared-profile and caller-option refusal, digest stability, parser agreement, deep copy.
- [x] **TC-863..872:** the rewrite at any depth, the closure difference it makes, the conflicting-closure error, the preparation record, purity, the lookahead pattern, keyword and `$ref` preservation, and the untouched merged artefacts.
- [x] **TC-873..882:** the five keys at generated positions, the register measured against the installed generator, the ref shapes, the option allow-list in both spellings, guard ordering, and the malicious corpus.
- [x] **TC-883..894:** repeat byte identity, host-leak scan, refusal before spawn, timeout and scratch removal, size boundary, empty output, stderr allow-list, socket instrumentation, entry-point resolution, environment, provisioning failure, limits, and the `src/compiler/` spawn scan.
- [x] **TC-895..907:** probe coverage and detectors, verdicts and their citations, expectation agreement, the gap register, the two Pydantic demonstrations, the stdlib disposition, condition grounding, `--check`, the corpus account, the untouched corpus, the generator ban, per-family gap rows, and the closed verdict vocabulary.
- [x] **TC-908..917:** degraded and sanctioned classification, the published-schema census, nested annotations, the import allow-list, module-level statements, non-execution, ordering, the two modes, the classifier mutation, and symbol-variant attribution.
- [x] **TC-918..926:** layout and duplicate names, clean import, provenance, `--check`, examples, the `not-qualified` branch and the pre-write refusal, manifest identity, packed-file reachability, and the content fingerprint.
- [x] **TC-927..935:** strict type checking, ignore ban, per-type exercise, retained-constraint rejection, lost-constraint falsification, the static-only record, provisioning failure, the skip census, and the weakened-probe mutation.
- [x] **TC-936..939:** the malicious corpus and the advisory gate, socket and filesystem instrumentation with emission ordering, non-execution and the register superset, and the provisioning and changed-path census.
- [x] **TC-940..943:** double generation and the artefact scan, report `--check`, the changed-path and manifest analysis, and the guard-range conversion with its post-merge perturbation.
- [ ] **TC-944:** the recorded human review of the four irreducibly manual obligations.

### Entrance Criteria

- US-013, FR-072..080, NFR-026..027 and TC-845..944 validate with Quire: zero errors and zero grammar findings on the files in scope.
- SR-097..SR-104 are written and their findings are applied or dispositioned.
- `make test` and `poetry run pytest -q` green on the base commit.

### Exit Criteria

- Every one of TC-845..944 passes, and the 644 prior rows pass unchanged.
- Two clean generations agree byte-for-byte on one host; the report, the gap register, the corpus account, and every generated tree pass `--check`.
- No changed path is prohibited; no merged permitted-path list gained an entry; no changed-path gate resolves its range from a moving ref.
- Three measured states are recorded: branch, simulated post-merge with an empty diff, and post-merge with an unrelated sibling change on top.
- Code review and gap analysis report no unaddressed blocking finding; the PR carries a "mergeable" comment.

## Remaining Work

### Track A: Foundations (serial)

- **A1 = Task-080** Dependency group, records, advisory gate, `make test-python`, red suites — Medium.
- **A2 = Task-081** Convert the six moving-baseline changed-path suites — Medium; exit: each converted suite still fails on a prohibited path in a simulated post-merge tree, and fails loudly when its sentinel is absent.
- **A3 = Task-082** Profiles, option allow-list, and `profile_digest` — Medium.

### Track B: Adapter (parallel after A3)

- **B1 = Task-083** The preparation pass and the multi-document input mode — Medium; exit: the closure difference is demonstrated on a real generation.
- **B2 = Task-084** The guards, the refusal register, and the malicious-schema corpus — Medium; exit: every register key is measured against the installed generator.

### Track C: Generation and measurement (serial)

- **C1 = Task-085** The sandboxed runner and its limits — Hard; exit: two generations agree byte-for-byte and no socket opens.
- **C2 = Task-086** The `ast` inspection in both modes — Hard; exit: the published schemas yield zero degraded and zero unattributed findings and the classifier mutation reds the probe.
- **C3 = Task-087** The probe corpus, the verdicts, and the gap register — Hard; exit: every measured loss has a row and a mutated expectation reds the gate.

### Track D: Delivery (parallel after C3)

- **D1 = Task-088** The read-only corpus account and the filed adapter-reader ticket — Medium.
- **D2 = Task-089** The package layout, provenance, README, and examples — Medium.
- **D3 = Task-090** Strict type checking and falsifiable runtime validation — Hard.

### Track E: Evidence and gate

- **E1 = Task-091** NFR-026 and NFR-027 evidence: instrumentation, the three measured states, the artefact scan — Medium.
- **Gate = Task-092** Code review, gap analysis, PR — closes when the "mergeable" comment is posted.
