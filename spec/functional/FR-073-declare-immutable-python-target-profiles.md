---
id: FR-073
title: "Declare immutable Python target profiles"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-072"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: "depends_on"
---
# [FR-073] Declare immutable Python target profiles

## Description

The repository SHALL declare exactly one immutable target profile per supported
generator output family at the declared Python and Pydantic versions, and every
generation SHALL take every generator option from exactly one declared profile
it names.

## Inputs

- The pinned toolchain of [FR-072](./FR-072-pin-the-python-generation-toolchain.md)
- The five upstream output families: `pydantic_v2.BaseModel`, `pydantic_v2.dataclass`, `dataclasses.dataclass`, `typing.TypedDict`, `msgspec.Struct`

## Outputs

- `python_backend/profiles.json`: the declared profiles
- `python_backend/adapter/profiles.py` exposing `load_profiles()`, `profile_by_id(id)`, and `profile_digest(profile)`

## Behavior

- The declared set SHALL carry exactly one profile per output family, all five families present, at the single declared Python minor version and the single declared Pydantic version of [FR-072](./FR-072-pin-the-python-generation-toolchain.md); a second Python or Pydantic version is a second declared set and a specification amendment.
- Each profile SHALL carry an `id`, the `outputModelType`, the ordered `options` list, a `runtimeValidation` value of `validating` or `static-only`, and the `verdict` [FR-077](./FR-077-qualify-each-python-output-family.md) measured for it.
- The declared set SHALL cover a family judged unsuitable rather than omit it, so that an unsuitable family is measured and declared instead of forgotten.
- Each profile's `options` SHALL be a complete argument vector, so that the runner adds, removes, and reorders nothing at call time.
- The runner SHALL refuse a caller-supplied generator option.
- Every profile SHALL declare `--disable-timestamp`, so the output carries no clock reading.
- Every profile SHALL declare `--formatters builtin`, the generator's dependency-free formatter, so that no external formatter version participates in generation and the pinned version warning about default external formatters becoming opt-in cannot move the output.
- Every profile SHALL declare `--no-allow-remote-refs` and none of `--allow-remote-refs`, `--allow-private-network`, `--url`, or any `--http-*` option.
- Every profile SHALL declare `--strict-refs`, so an unresolved local pointer is an error rather than a fallback `Any` model.
- Every profile SHALL declare `--field-constraints`, `--use-annotated`, `--use-standard-collections`, and `--use-union-operator`, because the `conint`/`constr` call form these replace is not a valid type annotation and fails the strict type checking of [FR-080](./FR-080-type-check-and-validate-generated-python.md), which no permitted remedy could then repair.
- Every profile SHALL declare `--strict-nullable`, because without it a field the schema declares non-nullable with a default renders as `T | None`, which admits a value the contract forbids.
- No profile SHALL declare `--extra-fields`: measured against the pinned generator, `additionalProperties: false` already yields `extra='forbid'` for both Pydantic families and `closed=True` for `TypedDict`, while `--extra-fields forbid` closes models the schema leaves open, which is a loss in the opposite direction and one no acceptance criterion for closure would catch.
- No profile SHALL declare `--use-missing-sentinel`: it is the only measured option that distinguishes an absent field from a null one in the Pydantic families, and against Pydantic `2.12.5` it renders `pydantic_core.MISSING` in a type position that the pinned type checker rejects, so it is recorded as a retained gap rather than adopted.
- `profile_digest` SHALL return the SHA-256 over the profile's `id`, `outputModelType`, and `options` in the repository's `agent-ix-conformance-jcs-v1` canonical form, excluding the `verdict` and `runtimeValidation` members, so that recording a measured verdict does not invalidate the digest that verdict cites.
- `load_profiles` SHALL return a deep copy of the declared set, performing no network and no clock access, so a caller cannot mutate what a later call returns.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-073-CON-1 | The maintainer SHALL NOT reach a green gate by relaxing a profile option; a construct a profile cannot carry is a qualification finding, not a configuration change. | Integrity | Test |
| FR-073-CON-2 | A profile SHALL NOT declare `--custom-template-dir`, `--custom-formatters`, `--validators`, `--additional-imports`, `--import-overrides`, `--type-mappings`, `--type-overrides`, `--extra-template-data`, `--class-decorators`, `--base-class`, `--base-class-map`, `--input-model`, or `--install-skill`; each of those places caller-controlled Python in the output or loads caller-controlled code. | Security | Test |
| FR-073-CON-3 | Adding a profile SHALL add a qualification verdict for it in the same change; the gate for this lives with [FR-077](./FR-077-qualify-each-python-output-family.md), which measures the verdict, so that FR-073 does not depend on the artefact FR-077 produces. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-073-AC-1 | `profiles.json` declares exactly one profile per supported output family, all five families are present, and every id is unique. | Test |
| FR-073-AC-2 | Every profile's options contain `--disable-timestamp`, `--strict-refs`, `--no-allow-remote-refs`, and `--formatters builtin`. | Test |
| FR-073-AC-3 | Every profile's options contain `--field-constraints`, `--use-annotated`, `--strict-nullable`, `--use-standard-collections`, and `--use-union-operator`, and contain neither `--extra-fields` nor `--use-missing-sentinel`. | Test |
| FR-073-AC-4 | No profile's options contain any member of the FR-073-CON-2 prohibited set, checked by exact option name rather than by substring. | Test |
| FR-073-AC-5 | A generation request naming an undeclared profile id is refused naming the id and listing the declared ids. | Test |
| FR-073-AC-6 | A generation request supplying its own generator option is refused, whether the option is prohibited, permitted, or already present in the profile. | Test |
| FR-073-AC-7 | `profile_digest` is stable across two calls, differs when any option value changes, differs when option order changes, and is unchanged by recording or changing the profile's `verdict` or `runtimeValidation`. | Property |
| FR-073-AC-8 | Every profile's `outputModelType` and the declared Python version are values the installed generator's own option parser accepts, read from the installed distribution rather than from a copy of its choices. | Test |
| FR-073-AC-9 | Mutating the value `load_profiles` returns does not change what a second call returns, for a mutation at any depth of the returned structure. | Property |
| FR-073-AC-10 | Every declared profile id appears in the qualification report and every verdict in the report names a declared profile; this criterion is measured in the FR-077 step. | Test |

## Dependencies

- **Upstream**: [FR-072](./FR-072-pin-the-python-generation-toolchain.md), [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md)
- **Downstream**: [FR-074](./FR-074-prepare-schema-for-python-generation.md), [FR-075](./FR-075-reject-dangerous-generation-inputs.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
