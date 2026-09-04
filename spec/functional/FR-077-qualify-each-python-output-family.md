---
id: FR-077
title: "Qualify each Python output family against measured evidence"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-035"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [FR-077] Qualify each Python output family against measured evidence

## Description

The repository SHALL measure, per output family, which contract constructs the
pinned generator retains and which it loses, SHALL record one verdict per family
with the evidence that produced it, and SHALL record every retained gap rather
than repair it silently or leave it implied.

## Inputs

- The five declared profiles of [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- A qualification corpus of small, single-construct JSON Schema probes, each declaring the construct it isolates, the detector that decides retention, and the retention a conforming Python surface must show per family
- The thirteen published `schema/semantic/v1/*.schema.json` documents as the realistic whole-set input
- The conformance corpus of [FR-035](./FR-035-define-the-conformance-corpus.md), read only

## Outputs

- `python_backend/qualification/probes/`: one file per probe
- `python_backend/qualification/report.json`: per family, the verdict, the toolchain fingerprint, the profile digest, the retained constructs, the lost constructs, and the evidence pointer for each
- `python_backend/qualification/gaps.json`: the retained-gap register, one row per construct and affected family
- `python_backend/qualification/corpus-account.json`: the read-only conformance-corpus account

## Behavior

- The qualification SHALL cover, at minimum, these construct areas: local references, cross-document references, recursion through a self-reference, mutual recursion across two documents, enumerations, unions, discriminated unions, maps by `additionalProperties` and by `patternProperties`, required-nullable versus optional versus defaulted fields, object closure by `additionalProperties` and by `unevaluatedProperties`, string constraints, numeric constraints, array constraints including `uniqueItems`, string formats, `const`, property aliases whose wire name is not a Python identifier, descriptions, and schema extensions.
- Each probe SHALL declare its expected retention per family as data beside a named detector, so that a family's verdict is computed from measurements rather than asserted in prose, and a wrong expectation is a red gate rather than a silent agreement.
- The report SHALL record each verdict as exactly one of `qualified`, `qualified-with-conditions`, or `not-qualified`, admitting no other verdict word in any artefact of this change and leaving `runtimeValidation` the separate two-valued member FR-073 declares.
- The term **demonstrated profile** SHALL mean, wherever this change uses it, a profile whose verdict is not `not-qualified`.
- The qualification SHALL declare, measure, and report a family whose verdict is `not-qualified` rather than omit it.
- The qualification SHALL demonstrate both the `pydantic_v2.BaseModel` and the `pydantic_v2.dataclass` family by a generated artefact that imports, validates a conforming value, and rejects a non-conforming one.
- The report SHALL state the `dataclasses.dataclass` disposition explicitly, naming exactly which constructs that family drops.
- `gaps.json` SHALL carry one row per construct and affected family, each with a severity, a closability, and a disposition, so that a construct four families retain and one loses is described for the family that loses it.
- The gate SHALL fail when a construct measured as lost by a family has no row for that family in `gaps.json`.
- Where the owned pass of [FR-074](./FR-074-prepare-schema-for-python-generation.md) closes a gap, its register row SHALL cite both the rule that closes it and the probe that proves it closed.
- Where no schema rewrite can close a gap, its register row SHALL name the reviewed decision or upstream change it awaits.
- The register SHALL record no hand-written generator as a disposition absent a reviewed P0 gap recorded against it, naming the reviewer and the date.
- The qualification SHALL take its per-family measurement through the reporting mode of [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), which never fails a generation, so that a lossy family can be measured and reported rather than suppressed by the enforcing mode.
- `corpus-account.json` SHALL be a read-only advisory account rather than an adapter result, recording per conformance case whether the generated `pydantic_v2.BaseModel` surface accepts or rejects the case's `ir` member, whether that answer agrees with the oracle's `resultState`, and `undecidable-by-this-surface` for every case the generated surface cannot decide.
- The account SHALL state plainly that the `python-backend` adapter slot remains `unavailable`, that the corpus therefore records its rows for this backend as unmet, and that wiring the slot needs an IR reader emitting `conformance/schema/adapter-result.schema.json` documents with contract diagnostic codes — an artefact a generated type package cannot produce — which this change names as a follow-up rather than delivers.
- The account SHALL report an agreement figure only over the cases it actually decided, beside the count it could not decide, never presenting agreement as corpus coverage.
- This requirement SHALL change no byte under `conformance/`.
- The report and the account SHALL be regenerable, byte-identical on a second measurement from the same declared toolchain, and checked by a `--check` mode that fails when a committed artefact differs from a fresh measurement.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-077-CON-1 | This requirement SHALL introduce no hand-written Python generator: a gap the maintainer judges P0 goes to the program owner as a reviewed decision recorded in `gaps.json`, and the generator remains upstream until that review lands. | Integrity | Test |
| FR-077-CON-2 | The maintainer SHALL derive a probe's expected retention from the contract rather than from the measurement, never weakening an expectation to make a family pass. | Integrity | Manual |
| FR-077-CON-3 | The conformance corpus SHALL NOT be edited, rebaselined, or blessed from a run by this requirement; its `blessedFromRun` stays false and its registry keeps the `python-backend` slot `unavailable`. | Integrity | Analysis |
| FR-077-CON-4 | The corpus account SHALL report an unmet row as unmet and an undecidable case as undecidable, never as a pass. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-077-AC-1 | Every construct area the Behavior section names has at least one probe, and every probe declares a detector and an expected retention for all five families. | Test |
| FR-077-AC-2 | `report.json` carries exactly one verdict per declared profile, each citing the declared-toolchain fingerprint and the profile digest that produced it. | Test |
| FR-077-AC-3 | The measured retention for every probe and family equals the probe's declared expectation, and a mutated expectation makes the gate red. | Integration |
| FR-077-AC-4 | Every construct-and-family pair measured as lost has a row in `gaps.json` with a severity, a closability, and a disposition; removing a row makes the gate red. | Test |
| FR-077-AC-5 | The Pydantic `BaseModel` and Pydantic dataclass artefacts each import, accept a conforming value, and raise on a non-conforming one, over the same fixture. | Integration |
| FR-077-AC-6 | The stdlib dataclass verdict is present and enumerates the constructs it drops, including at least numeric bounds, string patterns, string formats, object closure, discriminated unions, and property aliases. | Integration |
| FR-077-AC-7 | Every `qualified-with-conditions` condition names an option present in that profile or a rule present in `prepare.py`. | Test |
| FR-077-AC-8 | The report and the account are byte-identical on a second measurement, and `--check` fails against a mutated committed artefact. | Snapshot |
| FR-077-AC-9 | The corpus account states the number of cases decided, agreed, disagreed, and undecidable; the four sum to the corpus case count; and it states that the backend's corpus rows remain unmet. | Test |
| FR-077-AC-10 | Every file under `conformance/` is byte-identical to `origin/main` on this branch. | Analysis |
| FR-077-AC-11 | `gaps.json` contains no row whose disposition is a hand-written generator, absent a recorded reviewed P0 decision naming the reviewer and the date. | Test |
| FR-077-AC-12 | A probe whose construct no family retains yields five `gaps.json` rows, one per family, rather than one row or a corpus defect. | Test |
| FR-077-AC-13 | No verdict word outside the declared three appears in `report.json`, `profiles.json`, `gaps.json`, or `spec/tests.md`. | Static |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md)
- **Downstream**: [FR-079](./FR-079-emit-the-python-package-layout.md), [FR-080](./FR-080-type-check-and-validate-generated-python.md)
