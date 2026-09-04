---
id: FR-076
title: "Run Python generation sandboxed and deterministically"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-074"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-075"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-027"
    type: "depends_on"
---
# [FR-076] Run Python generation sandboxed and deterministically

## Description

The repository SHALL own one sandboxed runner that invokes the pinned generator,
treating every input schema as potentially executable input, running with no
network inside a scratch root it creates and owns, under declared finite limits,
and producing byte-identical output for the same input set, profile, and
declared toolchain.

## Inputs

- A prepared input set from [FR-074](./FR-074-prepare-schema-for-python-generation.md)
- A declared profile id from [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- The generator resolved from the installed distribution rather than from `PATH`

## Outputs

- `python_backend/runner/generate.py` exposing `generate(input_set, profile_id, out_dir)` returning a `GenerationResult`
- `python_backend/limits.json`: the declared limits — the wall-clock timeout in seconds, the maximum total input size in bytes, and the environment allow-list
- A `GenerationResult` carrying the generated file map, the profile digest, the input digest, the toolchain fingerprint, the `preparation` record, and the limits in force

## Behavior

- The runner SHALL be the single entry point, calling `assert_schema_safe` over every prepared document and `assert_argv_safe` over the resolved vector before it spawns anything and refusing rather than generating when either raises.
- The runner SHALL create a scratch directory under the process temporary root with a unique name it chooses, write the prepared input set into it, direct the generator's output into it, and remove it when the call ends, whether the call succeeded, failed, or timed out.
- The runner SHALL copy the generated file map out of the scratch root into `out_dir` only after the generation succeeded and the inspection of [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md) in its enforcing mode passed, so that a refused generation leaves no partial package at the caller-named path.
- The runner SHALL invoke the generator as a subprocess of the running interpreter through the installed distribution's console entry point, resolved from distribution metadata rather than by a `PATH` lookup, so a shadowing executable cannot be selected.
- The runner SHALL pass an environment built from the declared allow-list alone, so that `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY`, `PYTHONPATH`, `PYTHONSTARTUP`, and `HOME` reach the subprocess only as the allow-list sets them, and `PYTHONHASHSEED` is fixed.
- The runner SHALL rely on the profile's `--disable-timestamp` and `--formatters builtin` rather than on a clock override, keeping the output free of any date, time, hostname, absolute path, or user name.
- The runner SHALL refuse an input set whose total size exceeds the declared maximum before it spawns anything, naming the limit and its value.
- The runner SHALL terminate the subprocess and fail naming the timeout and its value when the declared wall-clock timeout elapses, sending a terminate signal and then a kill signal after a declared grace period.
- The runner SHALL fail when the generator exits non-zero, emits a diagnostic on standard error the declared allow-list does not name, or writes zero files, so an empty output is never success.
- The runner SHALL run the subprocess with Python warnings raised as errors, so the pinned version's own future-behaviour warnings surface as failures rather than as noise.
- The runner SHALL record with each result a toolchain fingerprint computed over the **declared** toolchain of [FR-072](./FR-072-pin-the-python-generation-toolchain.md), the profile digest, and the input digest, and over nothing the host observes, so that a patch-level interpreter move does not change it.
- The runner SHALL produce byte-identical file maps and an identical fingerprint for two generations from the same input set, profile, and declared toolchain, the second running from a scratch root that shares nothing with the first.
- The runner SHALL open no network connection, asserted by instrumentation rather than by inspection alone.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-076-CON-1 | The runner SHALL live outside `src/compiler/`, because FR-043-AC-8 requires that no module under `src/compiler/` spawns a process except the one named module FR-071 declares, and that gate stays green. | Compatibility | Static |
| FR-076-CON-2 | The runner SHALL NOT import the generator in-process, because the subprocess boundary is the sandbox and an in-process call would put schema-driven code execution in the test interpreter. | Security | Static |
| FR-076-CON-3 | The maintainer SHALL NOT widen the stderr or warning allow-list to make a run green; an unexpected diagnostic is a finding. | Integrity | Test |
| FR-076-CON-4 | Every input a gate generates from SHALL be a committed local document, never a network-reachable one. | Security | Static |
| FR-076-CON-5 | The declared limits SHALL live in `limits.json` with stated values, so that "a declared limit" names something a reader can check and a constraint against widening it has contents. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-076-AC-1 | Generating the same prepared input set under the same profile twice, each into a fresh scratch root, yields byte-identical file maps and an identical toolchain fingerprint. | Integration |
| FR-076-AC-2 | No generated file contains a date, a time, an absolute path from the generating host, a user name, or a hostname. | Integration |
| FR-076-AC-3 | A schema `assert_schema_safe` refuses causes the runner to raise before any subprocess is spawned, asserted by an instrumented spawn counter reading zero. | Test |
| FR-076-AC-4 | A generation exceeding the declared timeout terminates the subprocess, fails naming the timeout and its value, removes the scratch root, and leaves `out_dir` unchanged. | Integration |
| FR-076-AC-5 | An input set of exactly the declared maximum size proceeds and one byte larger fails naming the limit, before the subprocess is spawned in the failing case. | Test |
| FR-076-AC-6 | A generator run that writes zero files fails rather than reporting success. | Test |
| FR-076-AC-7 | A diagnostic on standard error outside the allow-list fails the run naming it, and the allow-list is enumerated in the result. | Integration |
| FR-076-AC-8 | No socket is opened during a generation, asserted by instrumenting `socket.socket` for the duration of the call. | Integration |
| FR-076-AC-9 | With a shadowing `datamodel-codegen` earlier on `PATH`, the pinned distribution's entry point is still the one invoked. | Integration |
| FR-076-AC-10 | The subprocess environment contains exactly the allow-listed names, carries no proxy variable and no caller `PYTHONPATH`, and fixes `PYTHONHASHSEED`. | Test |
| FR-076-AC-11 | With the generator distribution absent, the runner fails with a provisioning message naming the Poetry group and does not skip. | Test |
| FR-076-AC-12 | No module under `src/compiler/` spawns a process or imports the generator after this change, apart from the one module [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) names as the injected formatter — which no backend can reach, as this criterion also asserts — so FR-043-AC-8 is still satisfied. | Static |
| FR-076-AC-13 | The scratch root is absent after a successful call, after a failed call, and after a timed-out call. | Test |
| FR-076-AC-14 | `limits.json` states a timeout, a maximum input size, a kill grace period, and an environment allow-list, and the runner reads each of them rather than a literal. | Test |

## Dependencies

- **Upstream**: [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-074](./FR-074-prepare-schema-for-python-generation.md), [FR-075](./FR-075-reject-dangerous-generation-inputs.md), [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md), [NFR-027](../non-functional/NFR-027-reproducible-non-disruptive-python-generation.md)
- **Downstream**: [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), [FR-079](./FR-079-emit-the-python-package-layout.md)
