---
id: FR-075
title: "Reject dangerous generation inputs and options"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-072"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: "depends_on"
---
# [FR-075] Reject dangerous generation inputs and options

## Description

The repository SHALL refuse, in the same process and before the generator is
invoked, every schema construct and every generator option that can place
caller-controlled Python in the generated source or cause the generator to load
caller-controlled content.

## Inputs

- The prepared documents of [FR-074](./FR-074-prepare-schema-for-python-generation.md)
- The resolved argument vector of the named profile
- The vector keys the two advisories of [FR-072](./FR-072-pin-the-python-generation-toolchain.md) name

## Outputs

- `python_backend/adapter/guard.py` exposing `assert_schema_safe(document)` and `assert_argv_safe(argv)`
- `python_backend/refusals.json`: the closed refusal register — each refusal code, what it refuses, and the advisory or constraint that obliges it

## Behavior

- Both guards SHALL be Python functions in the same interpreter as the runner of [FR-076](./FR-076-run-python-generation-sandboxed.md), so that the runner can call them before it spawns anything and the zero-spawn assertion is satisfiable.
- `assert_schema_safe` SHALL refuse a document carrying `x-python-import`, `x-python-type`, `customTypePath`, `customBasePath`, or `default_factory` as an object key at any position, including inside `$defs`, `properties`, `items`, `prefixItems`, `propertyNames`, `patternProperties`, `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else`, `unevaluatedItems`, and `unevaluatedProperties`.
- The five-key set SHALL be the measured executable surface of the pinned `0.76.0`: its `JsonSchemaObject` binds `customTypePath` and `customBasePath`, its parser reads `x-python-import` and `x-python-type` as Python symbols to emit, and `default_factory` is the vector GHSA-386q-5hp3-95m9 names.
- `assert_schema_safe` SHALL refuse a `$ref` whose value carries any URI scheme, so no remote reference reaches the generator even though the profile also disables fetching and no HTTP transport is installed; the three defences are independent and none substitutes for another.
- `assert_schema_safe` SHALL refuse a `$ref` that escapes the input set through a filesystem path, whether absolute, `..`-relative, or a Windows drive-letter form, while admitting a local pointer and a plain sibling-filename reference into the input set.
- `assert_argv_safe` SHALL refuse an argument vector containing any option in the FR-073-CON-2 prohibited set, matching on the exact option token so that neither `--base-class=X` nor `--base-class X` passes.
- `assert_argv_safe` SHALL refuse `--allow-remote-refs`, `--allow-private-network`, `--url`, `--http-backend`, `--http-headers`, `--http-query-parameters`, `--http-ignore-tls`, `--http-local-ref-path`, `--http-timeout`, `--lockfile`, `--update-lock`, and `--watch`.
- `assert_argv_safe` SHALL refuse an option token absent from its declared allow-list, so a future upstream option is refused until it is reviewed rather than admitted by default.
- Each guard SHALL raise an error naming the refusal code, the offending construct, and the JSON pointer or argument index at which it was found, writing no output file.
- The maintainer SHALL treat the refusal register as closed, so that narrowing it to make an input pass is forbidden and widening it is a specification amendment.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-075-CON-1 | The maintainer SHALL NOT narrow the refusal register to make a schema or a profile pass; the register's contents are a specification statement. | Security | Test |
| FR-075-CON-2 | The refusal register SHALL be a superset of the three keys FR-043 forbids; removing any of those three regresses a merged requirement. | Security | Test |
| FR-075-CON-3 | `assert_argv_safe` SHALL refuse an unrecognised option rather than pass it through, because an allow-list that defaults to admit is not an allow-list. | Security | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-075-AC-1 | For every one of the five forbidden keys placed at a generated position drawn from the document root, every `$defs` entry, and every applicator keyword the Behavior section names, the guard refuses naming the key and the pointer. | Property |
| FR-075-AC-2 | Every key the refusal register names is a key the installed generator's own source binds, read from the installed distribution; and the three keys FR-043 forbids are all present. | Test |
| FR-075-AC-3 | A `$ref` of `https://example.invalid/x.json`, `file:///x.json`, `/etc/passwd`, `../outside.json`, and `C:\\x.json` are each refused naming the pointer. | Test |
| FR-075-AC-4 | A local `$ref` of the form `#/$defs/Name` and a sibling-filename `$ref` of the form `common.schema.json#/$defs/Name` are both accepted. | Test |
| FR-075-AC-5 | For every prohibited option, in both the `--opt value` and `--opt=value` forms and at a generated position in the vector, the guard refuses naming the token and its index. | Property |
| FR-075-AC-6 | An option token absent from the allow-list is refused naming the token and its index. | Test |
| FR-075-AC-7 | Every declared profile's argument vector passes `assert_argv_safe`, so the declared set and the guard cannot disagree. | Test |
| FR-075-AC-8 | A refused request writes no file and spawns no process, asserted by an instrumented spawn and an instrumented writer. | Test |
| FR-075-AC-9 | The malicious-schema regression corpus refuses every document, with at least one document per forbidden key, per refused `$ref` shape, and per prohibited option, and generates nothing. | Test |
| FR-075-AC-10 | The refusal register's codes are unique, every code the guards can raise appears in it, and every code in it is raisable by some input. | Test |
| FR-075-AC-11 | The generation entry point calls `assert_schema_safe` and `assert_argv_safe` before any other work, asserted by ordering instrumentation rather than by inspection. | Test |

## Dependencies

- **Upstream**: [FR-072](./FR-072-pin-the-python-generation-toolchain.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md)
- **Downstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md)
