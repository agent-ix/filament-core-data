---
id: FR-075
title: "Reject dangerous generation inputs and options"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: "depends_on"
---
# [FR-075] Reject dangerous generation inputs and options

## Description

The repository SHALL refuse, before the generator is invoked, every schema
construct and every generator option that can place caller-controlled Python in
the generated source or cause the generator to load caller-controlled content.

## Inputs

- The prepared schema document of [FR-074](./FR-074-prepare-schema-for-python-generation.md)
- The resolved argument vector of the named profile
- The two advisories of [FR-072](./FR-072-pin-the-python-generation-toolchain.md), which name the schema keys that were the injection vector

## Outputs

- `python_backend/adapter/guard.mjs` exporting `assertSchemaSafe(schema)` and `assertArgvSafe(argv)`
- The declared refusal register `python_backend/refusals.json`: each refusal code, what it refuses, and the advisory or constraint that obliges it

## Behavior

- `assertSchemaSafe` SHALL refuse a document carrying `x-python-import`, `customTypePath`, or `default_factory` at any depth, as an object key at any position including inside `$defs`, `properties`, `items`, and every applicator.
- `assertSchemaSafe` SHALL additionally refuse `x-python-type` and `customBasePath`. Both are live in the pinned `0.76.0`: `JsonSchemaObject` binds `customBasePath` beside `customTypePath`, and the parser reads `x-python-type` as a serialized Python type expression to emit. The five-key set is therefore the measured executable surface of the pinned version, not a guess.
- `assertSchemaSafe` SHALL refuse a `$ref` whose value is an absolute URI with a scheme other than the local pointer form, so no remote reference is presented to the generator even though the profile also disables fetching; the two are independent defences and neither substitutes for the other.
- `assertSchemaSafe` SHALL refuse a `$ref` that escapes the document through a filesystem path, whether absolute, `..`-relative, or a Windows drive-letter form.
- `assertArgvSafe` SHALL refuse an argument vector containing any option in the FR-073-CON-2 prohibited set, matching on the exact option token so that neither `--base-class=X` nor `--base-class X` passes.
- `assertArgvSafe` SHALL refuse `--allow-remote-refs`, `--allow-private-network`, `--url`, `--http-backend`, `--http-headers`, `--http-query-parameters`, `--http-ignore-tls`, `--http-local-ref-path`, `--http-timeout`, `--lockfile`, `--update-lock`, and `--watch`.
- `assertArgvSafe` SHALL refuse an option token it does not recognise, so a future upstream option is refused until it is reviewed rather than admitted by default.
- Each guard SHALL raise an error naming the refusal code, the offending construct, and the JSON pointer or argument index at which it was found, writing no output file.
- The maintainer SHALL treat the refusal register as closed, so that narrowing it to make an input pass is forbidden and widening it is a specification amendment.
- Both guards SHALL be pure functions that run before any process is spawned and before any file is written.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-075-CON-1 | The maintainer SHALL NOT narrow the refusal register to make a schema or a profile pass. | Security | Branch diff and gate |
| FR-075-CON-2 | The refusal register SHALL be a superset of FR-043's three-key set; removing any of those three is a regression of the merged requirement. | Security | Gate |
| FR-075-CON-3 | `assertArgvSafe` SHALL refuse an unrecognised option rather than pass it through, because an allow-list that defaults to admit is not an allow-list. | Security | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-075-AC-1 | Each of the five forbidden schema keys — `x-python-import`, `x-python-type`, `customTypePath`, `customBasePath`, `default_factory` — is refused when present at the document root, inside a `$defs` entry, inside a nested `properties` map, and inside an `items` subschema, naming the key and the pointer. | Test |
| FR-075-AC-2 | The three keys FR-043 forbids are all present in the refusal register, so the merged constraint is preserved; and every key the register names is a key the pinned generator's own source binds, asserted against the installed distribution rather than against a copy. | Test |
| FR-075-AC-3 | A `$ref` of `https://example.invalid/x.json`, of `/etc/passwd`, of `../outside.json`, and of `C:\\x.json` are each refused naming the pointer. | Test |
| FR-075-AC-4 | A local `$ref` of the form `#/$defs/Name` is accepted. | Test |
| FR-075-AC-5 | Every option in the prohibited set is refused in both `--opt value` and `--opt=value` forms, and at any position in the vector. | Test |
| FR-075-AC-6 | An option token the guard does not recognise is refused naming the token and its index. | Test |
| FR-075-AC-7 | Every declared profile's argument vector passes `assertArgvSafe`, so the declared set and the guard cannot disagree. | Test |
| FR-075-AC-8 | A refused request writes no file and spawns no process, asserted by an instrumented spawn and an instrumented writer. | Test |
| FR-075-AC-9 | A malicious-schema regression corpus of at least 32 documents, each carrying one injection construct, produces 32 refusals and zero generated files. | Fuzz |
| FR-075-AC-10 | The refusal register's codes are unique, and every code the guards can raise appears in the register. | Test |

## Dependencies

- **Upstream**: [FR-072](./FR-072-pin-the-python-generation-toolchain.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- **Downstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md)
