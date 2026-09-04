---
id: FR-080
title: "Type-check and runtime-validate every generated Python surface"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [FR-080] Type-check and runtime-validate every generated Python surface

## Description

The repository SHALL type-check every generated Python surface statically and
exercise every surface it records as validating at run time, against conforming
and non-conforming values drawn from the contract, so that a surface which
type-checks but accepts invalid data is caught.

## Inputs

- The emitted packages of [FR-079](./FR-079-emit-the-python-package-layout.md), which exist only for demonstrated profiles
- The verdicts and `runtimeValidation` values of [FR-077](./FR-077-qualify-each-python-output-family.md)
- The published documents and the probe corpus, which supply the constraints the values are drawn from

## Outputs

- A pinned `mypy` configuration scoped to `python_backend/generated/**` and `python_backend/examples/**`
- `python_backend/qualification/validation.json`: per profile and per generated type, the conforming and non-conforming values exercised and the outcome

## Behavior

- The gate SHALL run the type checker over every emitted module and every example under `strict` settings, with no per-file ignore and no `type: ignore` comment in generated or example source.
- The gate SHALL run the type checker at the exact version `toolchain.json` records, failing with a provisioning message rather than skipping when it is absent.
- The gate SHALL cover only demonstrated profiles, recording each undemonstrated family in `validation.json` as not emitted rather than as passing, because a `not-qualified` family has no emitted tree.
- The gate SHALL exercise every generated type in a profile whose `runtimeValidation` is `validating` with a value built from that type's own schema node and a value the contract forbids.
- The gate SHALL name in `validation.json`, with the reason, every type it could not exercise.
- The reason SHALL be one of two measured facts: no schema node carries that type's property set, or the value built from its schema node was rejected by the family's own runtime. A type counted as exercised without both a conforming and a forbidden value SHALL NOT be reported as exercised.
- The conforming value SHALL be built from the schema — its required members, its combinators, its `$ref` targets resolved in the document that wrote them, and one enumerated sample per pattern the published schemas use — so that it comes from the contract rather than from what the generated code happens to accept.
- `validation.json` SHALL record the exercised and unexercised counts per profile, frozen by `--check`, so that a change which stops exercising a type moves a committed number and reds a gate rather than passing against a literal the code supplies.
- The gate SHALL fail, naming the type, the field, and the constraint, when the family's own runtime — Pydantic validation for the two Pydantic families, `msgspec` decoding for `msgspec.Struct` — accepts a value the contract forbids.
- `validation.json` SHALL record a profile whose `runtimeValidation` is `static-only` as covered by static checking alone, never as runtime-covered.
- The gate SHALL assert, for every constraint a demonstrated family is recorded as losing, that the generated surface really does accept the value the contract forbids, so the recorded verdict is falsifiable rather than asserted.
- The gate SHALL run its falsification cases against generation into a scratch directory with a mutated probe schema, never against the committed tree, so that the freeze of FR-079-AC-4 and the falsification of a verdict do not contradict each other.
- The coverage account SHALL state, per profile, the number of generated types, the number exercised, and the number of constraints exercised, failing when any generated type in a validating profile is unexercised.
- Every test in this requirement SHALL run rather than skip, reporting an absent tool as a failure with a provisioning message.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-080-CON-1 | The maintainer SHALL NOT add a `type: ignore`, an `Any` cast, a per-module checker override, or a narrowing of the checker configuration to reach green; a type the checker rejects is a qualification finding. | Integrity | Test |
| FR-080-CON-2 | The coverage account SHALL NOT count a skipped test, because the suite fails with a provisioning message instead of skipping. | Reliability | Test |
| FR-080-CON-3 | The author SHALL derive the non-conforming values from the contract's constraints rather than from what the generated code happens to reject; a value chosen because the code rejects it proves nothing. | Integrity | Manual |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-080-AC-1 | The pinned type checker reports zero errors over every emitted module and every example under strict settings. | Analysis |
| FR-080-AC-2 | No generated or example source contains a `type: ignore` comment, and the checker configuration declares no per-module override and no relaxation of `strict`. | Static |
| FR-080-AC-3 | Every generated type in a `validating` profile is either exercised with a schema-built conforming value and a forbidden one, or named in `validation.json` with one of the two declared reasons; the per-profile exercised and unexercised counts are frozen by `--check`, and a mutated count fails it. | Integration |
| FR-080-AC-4 | For each constraint a demonstrated family retains, a non-conforming value is rejected by that family's runtime, naming the constraint. | Integration |
| FR-080-AC-5 | For each constraint a demonstrated family is recorded as losing, generation into a scratch directory from the corresponding probe produces a surface that accepts the forbidden value. | Integration |
| FR-080-AC-6 | `validation.json` records every `static-only` profile as static-only and every undemonstrated family as not emitted, and the coverage account counts neither as runtime-covered. | Test |
| FR-080-AC-7 | With the type checker absent, the gate fails with a provisioning message naming the Poetry group; it does not skip. | Test |
| FR-080-AC-8 | The suites added by this change report zero skipped tests, read from the run's own report rather than by inspection. | Test |
| FR-080-AC-9 | A probe schema whose constraint is removed produces, into a scratch directory, a surface that accepts the previously rejected value, and the runtime-validation gate reports that difference. | Integration |

## Dependencies

- **Upstream**: [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-079](./FR-079-emit-the-python-package-layout.md), [NFR-027](../non-functional/NFR-027-reproducible-non-disruptive-python-generation.md)
- **Downstream**: issue #11
