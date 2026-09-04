---
id: FR-073
title: "Declare immutable Python target profiles"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-072"
    type: "depends_on"
---
# [FR-073] Declare immutable Python target profiles

## Description

The repository SHALL declare one immutable target profile per supported
combination of Python version, Pydantic version, and generator output family,
and every generation SHALL take every generator option from exactly one
declared profile it names.

## Inputs

- The pinned toolchain of [FR-072](./FR-072-pin-the-python-generation-toolchain.md)
- The five upstream output families: `pydantic_v2.BaseModel`, `pydantic_v2.dataclass`, `dataclasses.dataclass`, `typing.TypedDict`, `msgspec.Struct`

## Outputs

- `python_backend/profiles.json`: the declared profiles
- `python_backend/adapter/profiles.mjs` exporting `loadProfiles()`, `profileById(id)`, and `profileDigest(profile)`

## Behavior

- Each profile SHALL carry an `id`, the `outputModelType`, the `targetPythonVersion`, the `targetPydanticVersion` where the family is a Pydantic family, the ordered `options` list, the `runtimeValidation` disposition, and the `verdict` reference into [FR-077](./FR-077-qualify-each-python-output-family.md).
- The declared profile set SHALL cover all five output families, so that a family judged unsuitable is declared and judged rather than omitted and forgotten.
- Each profile's `options` SHALL be a complete argument vector, so that the runner adds, removes, and reorders nothing at call time.
- The runner SHALL refuse a caller-supplied generator option.
- Every profile SHALL declare `--disable-timestamp`, so the output carries no clock reading.
- Every profile SHALL declare `--formatters` explicitly, because the upstream warns that its default external formatters become opt-in in a future version and an implicit default is not a pin.
- Every profile SHALL declare `--no-allow-remote-refs` and none of `--allow-remote-refs`, `--allow-private-network`, `--url`, or any `--http-*` option.
- Every profile SHALL declare `--strict-refs`, so an unresolved local pointer is an error rather than a fallback `Any` model.
- Every Pydantic profile SHALL declare both `--extra-fields forbid` and `--strict-nullable`, because the upstream defaults are `allow` and a widened `T | None`, and both silently weaken a closed, non-nullable contract.
- `profileDigest` SHALL return the SHA-256 over the profile's canonical JSON in the repository's `agent-ix-conformance-jcs-v1` form.
- The runner SHALL record the profile digest with every generation result.
- The qualification report SHALL cite the profile digest beside each verdict, so that editing a profile changes its digest and invalidates the verdict that cites it rather than silently inheriting it.
- `loadProfiles` SHALL return a deep copy of the declared set, performing no network and no clock access, so a caller cannot mutate what a later call returns.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-073-CON-1 | The maintainer SHALL NOT reach a green gate by relaxing a profile option; a construct a profile cannot carry is a qualification finding, not a configuration change. | Integrity | Branch diff and gate |
| FR-073-CON-2 | A profile SHALL NOT declare `--custom-template-dir`, `--custom-formatters`, `--validators`, `--additional-imports`, `--import-overrides`, `--type-mappings`, `--type-overrides`, `--extra-template-data`, `--class-decorators`, `--base-class`, `--base-class-map`, `--input-model`, or `--install-skill`; each of those places caller-controlled Python in the output or loads caller-controlled code. | Security | Profile gate |
| FR-073-CON-3 | Adding a profile SHALL add a qualification verdict in the same change; a profile without a verdict is not a supported target. | Integrity | Gate |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-073-AC-1 | `profiles.json` declares exactly one profile per supported output family, all five families are present, and every id is unique. | Test |
| FR-073-AC-2 | Every profile's options contain `--disable-timestamp`, `--strict-refs`, `--no-allow-remote-refs`, and an explicit `--formatters`. | Test |
| FR-073-AC-3 | Every Pydantic profile's options contain `--extra-fields forbid` and `--strict-nullable`. | Test |
| FR-073-AC-4 | No profile's options contain any member of the FR-073-CON-2 prohibited option set, checked by exact option name rather than by substring. | Test |
| FR-073-AC-5 | A generation request naming an undeclared profile id is refused naming the id and listing the declared ids. | Test |
| FR-073-AC-6 | A generation request supplying its own generator option is refused, whether the option is prohibited, permitted, or already present in the profile. | Test |
| FR-073-AC-7 | `profileDigest` is stable across two calls, differs when any option changes, and differs when option order changes. | Test |
| FR-073-AC-8 | Each profile's recorded `targetPythonVersion` and `targetPydanticVersion` are values the pinned generator accepts, checked against the generator's own declared choices rather than against a copy of them. | Test |
| FR-073-AC-9 | `loadProfiles` returns a copy: mutating the returned value does not change what a second call returns. | Test |
| FR-073-AC-10 | Every profile id appearing in `profiles.json` appears in the qualification report, and every verdict in the report names a declared profile. | Test |

## Dependencies

- **Upstream**: [FR-072](./FR-072-pin-the-python-generation-toolchain.md)
- **Downstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
