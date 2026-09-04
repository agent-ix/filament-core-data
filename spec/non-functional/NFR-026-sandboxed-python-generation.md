---
id: NFR-026
title: "Sandboxed Python generation from untrusted schema"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-075"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "depends_on"
---
# [NFR-026] Sandboxed Python generation from untrusted schema

## Statement

Python generation SHALL treat every input schema as potentially executable
input: it SHALL refuse the declared dangerous constructs and options before
invoking the generator, SHALL run the generator as a subprocess with no network
access and a minimal environment inside a scratch root it owns, SHALL run only a
version outside every declared advisory range, and SHALL inspect the generated
source without executing it. Each obligation is stated separately as its own
acceptance criterion below.

## Scope

- Applies to: `python_backend/adapter/**`, `python_backend/runner/**`, `python_backend/profiles.json`, `python_backend/refusals.json`, and the `python-backend` dependency group.
- Permitted paths: `python_backend/**`, `spec/**`, `plan/**`, `tests/**`, `test/**`, `reviews/**`, `pyproject.toml`, `poetry.lock`, `Makefile`, `biome.json`.
- Prohibited paths: `schema/**`, `fixtures/**`, `src/compiler/**`, `conformance/**`, `spikes/**`, `packages/**`, `agent_ix_core_data/**`, `package.json`, `pnpm-lock.yaml`, `.github/**`.

## Rationale

Both published advisories against this generator are code injection through
schema content: GHSA-386q-5hp3-95m9 through `default_factory` and
GHSA-5578-w22f-pfx9 through `x-python-import` and `customTypePath` reaching
generated import statements. The pinned `0.76.0` is outside both ranges, but the
mechanism is not a historical accident — the generator's design reads schema
extensions as Python symbols, and its command line offers custom template
directories, custom formatters, additional imports, import overrides, type
mappings, extra template data, class decorators, and base classes, each of which
places caller-controlled Python in the output. A pin protects against the two
known instances; the guards protect against the class.

Remote reference fetching is a second surface: a `$ref` to a URL makes the
generator a fetcher of attacker-chosen content. Three independent defences apply
— the profile disables it, the guard refuses the reference, and the HTTP extra is
not installed so there is no transport — because a single defence that is
misconfigured once is no defence.

Generated source is the last place a compromise becomes visible, so it is read
with `ast` rather than imported: importing a module to check whether it is safe
runs it first.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Installed generator versions inside a declared advisory range | 0 | 0 | Advisory gate |
| Injection constructs reaching the generator | 0 | 0 | Guard tests over the malicious-schema corpus |
| Prohibited generator options in any declared profile | 0 | 0 | Profile gate |
| Sockets opened during generation | 0 | 0 | Instrumented `socket.socket` |
| Reads or writes outside the scratch root and the caller-named output | 0 | 0 | Instrumented runner |
| Generated modules imported or executed by the inspection | 0 | 0 | Instrumented import machinery |
| Imports in generated source outside the declared allow-list | 0 | 0 | AST inspection |
| Malicious-schema corpus documents that generate rather than refuse | 0 | 0 | Regression corpus |
| Gates that skip when a pinned tool is absent | 0 | 0 | Falsification run |

## Verification

Run the malicious-schema regression corpus and confirm every document is refused
with a code from the register and produces no file; assert an instrumented spawn
counter reads zero for each; run generation with `socket.socket` instrumented and
confirm zero sockets; run generation with a shadowing `datamodel-codegen` earlier
on `PATH` and confirm the pinned distribution's entry point is the one invoked;
synthesize an installed version inside each advisory range and confirm the gate
fails naming the advisory; remove the generator distribution and confirm the gate
fails with a provisioning message rather than skipping; instrument the import
machinery during source inspection and confirm no generated module is imported;
assert by dependency-set inspection that neither HTTP extra is resolved.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-026-AC-1 | Every document in the malicious-schema regression corpus is refused before any process is spawned, and the corpus has at least 32 documents covering all five forbidden schema keys, remote refs, path-escaping refs, and every prohibited option. | Fuzz |
| NFR-026-AC-2 | The advisory gate fails for a synthesized version inside either published range and for any version below the derived floor. | Test |
| NFR-026-AC-3 | Generation opens zero sockets, measured by instrumentation rather than by inspection. | Test |
| NFR-026-AC-4 | Generation reads and writes nothing outside its scratch root and the caller-named output path. | Test |
| NFR-026-AC-5 | The source inspection neither imports nor executes any generated module. | Test |
| NFR-026-AC-6 | No generated module imports outside the declared allow-list, and a synthetic module importing `os` is failed. | Test |
| NFR-026-AC-7 | Neither the `http` nor the `httpx2` extra is present in the resolved dependency set. | Test |
| NFR-026-AC-8 | Every gate in scope fails with a provisioning message when its pinned tool is absent, and none skips. | Test |
| NFR-026-AC-9 | No path this branch changes falls under the prohibited list. | Analysis |
| NFR-026-AC-10 | The refusal register is a superset of FR-043's three-key set, and every key it names is bound by the pinned generator's own source. | Test |

## Dependencies

- **Upstream**: [NFR-010](./NFR-010-safe-schema-and-code-generation.md), [NFR-020](./NFR-020-bounded-and-safe-compilation.md)
- **Downstream**: [FR-075](../functional/FR-075-reject-dangerous-generation-inputs.md), [FR-076](../functional/FR-076-run-python-generation-sandboxed.md), [FR-078](../functional/FR-078-inspect-generated-python-for-semantic-loss.md)
