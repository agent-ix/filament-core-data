---
id: FR-076
title: "Run Python generation sandboxed and deterministically"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-075"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-074"
    type: "depends_on"
---
# [FR-076] Run Python generation sandboxed and deterministically

## Description

The repository SHALL own one sandboxed runner that invokes the pinned generator,
and that runner SHALL treat the schema as potentially executable input,
running with no network, inside a scratch root it creates and owns, under
declared finite limits, and producing byte-identical output for the same input,
profile, and toolchain.

## Inputs

- A prepared schema document from [FR-074](./FR-074-prepare-schema-for-python-generation.md)
- A declared profile id from [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- The pinned generator resolved from the installed distribution, not from `PATH`

## Outputs

- `python_backend/runner/generate.py` exposing `generate(schema, profile_id, out_dir)` returning a `GenerationResult`
- A `GenerationResult` carrying the generated file map, the profile digest, the input schema digest, the toolchain fingerprint, the `preparation` record, and the runner's declared limits

## Behavior

- The runner SHALL call `assertSchemaSafe` and `assertArgvSafe` from [FR-075](./FR-075-reject-dangerous-generation-inputs.md) before it spawns anything, refusing rather than generating when either raises.
- The runner SHALL confine the generator's input document and output to a scratch directory it creates, so the generator reads and writes no path the caller did not name.
- The runner SHALL invoke the generator as a subprocess of the pinned interpreter — resolved through the installed distribution's entry point rather than through a `PATH` lookup — so a shadowing executable cannot be selected.
- The runner SHALL pass a minimal environment: no proxy variables, no `PYTHONPATH` the caller supplied, and a fixed `PYTHONHASHSEED`, so hash-ordered iteration cannot vary the output.
- The runner SHALL keep the output free of any date, time, hostname, absolute path, or user name by relying on the profile's `--disable-timestamp` rather than on a clock override.
- The runner SHALL enforce a declared wall-clock timeout and a declared maximum input size, terminating the subprocess and failing with the limit and its value when either is exceeded.
- The runner SHALL fail when the generator exits non-zero, emits a diagnostic on standard error the declared allow-list does not name, or writes zero files, so an empty output is never success.
- The runner SHALL fail on any Python warning the generator raises that the declared allow-list does not name, because the pinned version warns that its default formatters become opt-in, and an unpinned formatter is a reproducibility hole.
- The runner SHALL record with each result a toolchain fingerprint computed over the generator version, the interpreter version, the Pydantic and msgspec versions, the formatter versions, the profile digest, and the input schema digest.
- The runner SHALL produce byte-identical file maps and an identical fingerprint for two generations from the same input, profile, and toolchain, the second running from a scratch root that shares nothing with the first.
- The runner SHALL open no network connection, asserted by an instrumented socket rather than by inspection alone.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-076-CON-1 | The runner SHALL live outside `src/compiler/`, because [FR-043](./FR-043-govern-the-python-generation-adapter.md)-AC-8 requires that no module under `src/compiler/` spawns a process, and that gate stays green. | Compatibility | Module scan |
| FR-076-CON-2 | The runner SHALL NOT import the generator in-process, because the subprocess boundary is the sandbox and an in-process call would put schema-driven code execution in the test interpreter. | Security | Inspection and test |
| FR-076-CON-3 | The maintainer SHALL NOT widen the stderr or warning allow-list to make a run green; an unexpected diagnostic is a finding. | Integrity | Branch diff and gate |
| FR-076-CON-4 | Generation SHALL NOT be run as part of `make test` against a network-reachable input; every gate input is a committed local document. | Security | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-076-AC-1 | Generating the same prepared document under the same profile twice, each into a fresh scratch root, yields byte-identical file maps and an identical toolchain fingerprint. | Test |
| FR-076-AC-2 | No generated file contains a date, a time, an absolute path from the generating host, a user name, or a hostname. | Test |
| FR-076-AC-3 | A schema that `assertSchemaSafe` refuses causes the runner to raise before any subprocess is spawned, asserted by an instrumented spawn counter reading zero. | Test |
| FR-076-AC-4 | A generation exceeding the declared timeout terminates the subprocess and fails naming the timeout and its value; the scratch root is removed. | Test |
| FR-076-AC-5 | An input larger than the declared maximum fails naming the limit before the subprocess is spawned. | Test |
| FR-076-AC-6 | A generator run that writes zero files fails rather than reporting success. | Test |
| FR-076-AC-7 | An unexpected warning on standard error fails the run naming the warning; the allow-list is enumerated in the result. | Test |
| FR-076-AC-8 | No socket is opened during a generation, asserted by instrumenting `socket.socket` for the duration of the call. | Test |
| FR-076-AC-9 | The runner resolves the generator through the installed distribution's entry point; with a shadowing executable earlier on `PATH`, the pinned one is still the one invoked. | Test |
| FR-076-AC-10 | The subprocess environment contains no `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, or caller-supplied `PYTHONPATH`, and `PYTHONHASHSEED` is fixed. | Test |
| FR-076-AC-11 | With the generator distribution absent, the runner fails with a provisioning message naming the dependency group and does not skip. | Test |
| FR-076-AC-12 | No module under `src/compiler/` spawns a process after this change, so FR-043-AC-8 is still satisfied. | Analysis |

## Dependencies

- **Upstream**: [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-074](./FR-074-prepare-schema-for-python-generation.md), [FR-075](./FR-075-reject-dangerous-generation-inputs.md)
- **Downstream**: [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), [FR-079](./FR-079-emit-the-python-package-layout.md)
