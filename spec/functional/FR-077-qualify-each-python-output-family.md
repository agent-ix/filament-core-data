---
id: FR-077
title: "Qualify each Python output family against measured evidence"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-035"
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
- A qualification corpus of small, single-construct JSON Schema probes, each carrying the construct it isolates and the semantics a conforming Python surface must preserve
- The published `schema/semantic/v1/*.schema.json` documents as the realistic whole-bundle input
- The conformance corpus of [FR-035](./FR-035-define-the-conformance-corpus.md) and its `python-backend` adapter slot

## Outputs

- `python_backend/qualification/probes/`: one file per probe, each declaring its construct, its schema, and its expected retention per family
- `python_backend/qualification/report.json`: per family, the verdict, the toolchain fingerprint, the profile digest, the retained constructs, the lost constructs, and the evidence pointer for each
- `python_backend/qualification/gaps.json`: the retained-gap register, each row naming the construct, the affected families, the severity, whether the owned adapter can close it, and the disposition

## Behavior

- The qualification SHALL cover, at minimum, these construct areas: local references, recursion through a self-reference, enumerations, unions, discriminated unions, maps by `additionalProperties` and by `patternProperties`, optional versus nullable versus defaulted fields, object closure, string and numeric and array constraints, string formats, property aliases whose wire name is not a Python identifier, schema extensions, provenance-bearing shapes, and contract version transitions.
- Each probe SHALL declare its expected retention per family as data, so a family's verdict is computed from measurements rather than asserted in prose.
- The report SHALL record each verdict as one of `qualified`, `qualified-with-conditions`, or `not-qualified`, naming the conditions or the reasons in each case.
- `qualified-with-conditions` SHALL name every condition as a profile option or an adapter rewrite that is actually declared, so a condition is a thing the repository does rather than a thing it recommends.
- The qualification SHALL declare, measure, and report a family whose verdict is `not-qualified` rather than omit it.
- The qualification SHALL demonstrate both the `pydantic_v2.BaseModel` and the `pydantic_v2.dataclass` family by a generated artefact that imports, validates a conforming value, and rejects a non-conforming one.
- The report SHALL state the `dataclasses.dataclass` disposition explicitly, naming exactly which constructs that family drops.
- The gate SHALL fail when a construct measured as lost is absent from `gaps.json` or carries no severity and disposition there.
- Where the owned adapter of [FR-074](./FR-074-prepare-schema-for-python-generation.md) closes a gap, its register row SHALL cite both the rule that closes it and the probe that proves it closed.
- Where a schema rewrite cannot close a gap, its register row SHALL name the upstream issue or the reviewed decision it awaits.
- The register SHALL record no hand-written generator as a disposition absent a reviewed P0 gap recorded against it.
- The qualification SHALL run the conformance corpus of [FR-035](./FR-035-define-the-conformance-corpus.md) against the generated Python surface where the `python-backend` adapter slot is available, recording every case it cannot run as an unmet row naming the blocking dependency, reporting no unrun case as a pass, and editing no corpus file.
- The report SHALL be regenerable, byte-identical on a second run from the same toolchain, and checked by a `--check` mode that fails when the committed report differs from a fresh measurement.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-077-CON-1 | This requirement SHALL introduce no hand-written Python generator: a gap the maintainer judges P0 goes to the program owner as a reviewed decision recorded in `gaps.json`, and the generator remains upstream until that review lands. | Integrity | Register and branch diff |
| FR-077-CON-2 | The maintainer SHALL NOT weaken a probe's expected retention to make a family pass; a probe expectation is derived from the contract, not from the measurement. | Integrity | Branch diff and gate |
| FR-077-CON-3 | The corpus of issue #20 SHALL NOT be edited, rebaselined, or blessed from a run by this requirement; its `blessedFromRun` stays false. | Integrity | Branch diff against `origin/main` |
| FR-077-CON-4 | The coverage account SHALL report an unmet corpus row as unmet, never as a pass. | Integrity | Gate |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-077-AC-1 | Every construct area the Behavior section names has at least one probe, and every probe declares an expected retention for all five families. | Test |
| FR-077-AC-2 | `report.json` carries exactly one verdict per declared profile, and every verdict cites the toolchain fingerprint and the profile digest that produced it. | Test |
| FR-077-AC-3 | The measured retention for every probe and family equals the probe's declared expectation, and a deliberately altered expectation makes the gate red. | Test |
| FR-077-AC-4 | Every construct measured as lost by any family appears in `gaps.json`; a lost construct removed from the register fails the gate. | Test |
| FR-077-AC-5 | The Pydantic `BaseModel` artefact and the Pydantic dataclass artefact each import, accept a conforming value, and raise on a non-conforming one, over the same fixture. | Integration |
| FR-077-AC-6 | The stdlib dataclass verdict is present and its report entry enumerates the constructs it drops, including at least numeric bounds, string patterns, string formats, object closure, and property aliases. | Test |
| FR-077-AC-7 | Every `qualified-with-conditions` condition names a profile option present in that profile or an adapter rule present in `prepare.mjs`. | Test |
| FR-077-AC-8 | The report is byte-identical on a second measurement, and `--check` fails against a mutated committed report. | Test |
| FR-077-AC-9 | The conformance-corpus account states the number of rows run, passed, and unmet, and the unmet count matches the number of rows the blocking dependency prevents; no unrun row is counted as a pass. | Test |
| FR-077-AC-10 | The conformance corpus files are unchanged from `origin/main` on this branch. | Analysis |
| FR-077-AC-11 | `gaps.json` contains no row whose disposition is a hand-written generator, absent a recorded reviewed P0 decision naming the reviewer and the date. | Test |
| FR-077-AC-12 | A probe whose construct no family retains is reported as a gap affecting all five families rather than as a corpus defect. | Test |

## Dependencies

- **Upstream**: [FR-035](./FR-035-define-the-conformance-corpus.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-076](./FR-076-run-python-generation-sandboxed.md)
- **Downstream**: [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), [FR-080](./FR-080-type-check-and-validate-generated-python.md)
