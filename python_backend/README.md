# The qualified Python generation route

Issue [#23](https://github.com/agent-ix/filament-core-data/issues/23).
Requirements: FR-072..FR-080, NFR-026, NFR-027. Plan:
`plan/Plan-012-python-pydantic-backend/`.

This directory is **not** a Python code generator. The generator is the MIT
`datamodel-code-generator`, pinned at `0.76.0`, above both published advisory
floors. What lives here is the smallest AGPL surface that makes that generator
trustworthy, plus the measured evidence for what it does and does not carry.

## What is here

| Path | What it is |
|---|---|
| `toolchain.json` | The **declared** pins: generator, Pydantic, msgspec, type checker, and the Python *minor* series. No patch-level interpreter version and no formatter entry — a host reading inside a byte-compared artefact is the issue #42 coupling |
| `advisories.json` | GHSA-386q-5hp3-95m9 and GHSA-5578-w22f-pfx9, their ranges, their first-patched versions, and the derived floor `0.64.0` |
| `profiles.json` | One immutable profile per output family; `options` is the complete argument vector |
| `refusals.json` | The closed refusal register: five executable schema keys, four reference shapes, three argument classes |
| `limits.json` | The timeout, the kill grace, the maximum input size, and the environment allow-list — values, so a constraint against widening one has contents |
| `adapter/` | Pure: profiles, the `unevaluatedProperties` preparation pass, the two guards, canonical JSON, and the formatter-agreeing renderer. No process, no socket, no clock |
| `runner/` | Impure: distributions, the sandboxed subprocess, the `ast` inspection, the qualification, the emitter, the validation, the corpus account |
| `qualification/probes/` | Twenty single-construct probes, each with a detector and an expected retention per family |
| `qualification/malicious/` | Sixty-seven documents, each carrying one injection construct or one prohibited option |
| `qualification/report.json` | The measured verdicts. Generated; never hand-edited |
| `qualification/gaps.json` | One row per construct and affected family, with a severity and a disposition |
| `qualification/corpus-account.json` | What the generated surface decides about the conformance corpus. **An advisory account, not an adapter result** |
| `qualification/validation.json` | Per profile: what was exercised, and what is static-only or not emitted |
| `generated/<profile-id>/` | The emitted packages. Regenerated and byte-compared |
| `examples/` | Ordinary consumers, executed by the suite |

## The verdicts

| Family | Verdict | What it loses |
|---|---|---|
| `pydantic_v2.BaseModel` | qualified-with-conditions | `uniqueItems` |
| `pydantic_v2.dataclass` | qualified-with-conditions | `uniqueItems` |
| `msgspec.Struct` | qualified-with-conditions | object closure, string formats, pattern-keyed maps, `uniqueItems`, absent-versus-null |
| `dataclasses.dataclass` | not-qualified | eleven constructs, the whole constraint layer included |
| `typing.TypedDict` | not-qualified | nine constructs, likewise, and it has no runtime validation to exercise |

The rule is stated rather than arithmetic: a family that cannot carry the
constraint layer is not qualified, because a surface that keeps the shape and
drops every bound is a schema-shaped `dict` with better autocomplete. Every loss
has a row in `gaps.json`, and FR-080 exercises each recorded loss in the
direction that proves it real.

## The one rewrite this repository owns

The official TypeSpec emitter seals a model with `unevaluatedProperties`,
usually as the always-false schema `{"not": {}}`. Measured against the pinned
generator, neither is read: every sealed contract type generates as an **open**
Python model, in every family, silently. `adapter/prepare.py` rewrites it, and
`tests/test_python_backend_runner.py` asserts the difference in both directions
rather than describing it.

No profile carries `--extra-fields`. The measurement is the reason: with
`additionalProperties: false` the generator already closes both Pydantic
families and `TypedDict`, and the blanket flag also closes models the schema
leaves **open** — a loss in the opposite direction that no closure gate would
catch.

## Running it

```bash
make test-python                                        # the gates
poetry run python -m python_backend.runner.qualify      # re-measure the verdicts
poetry run python -m python_backend.runner.emit         # regenerate the packages
poetry run python -m python_backend.runner.corpus_account
poetry run python -m python_backend.runner.validate
```

Each takes `--check`, which fails when a committed artefact differs from a fresh
measurement. Nothing here opens a network connection.

## What this does not do

- It publishes nothing. The issue #23 safety gate forbids PyPI publication and
  backend consumer migration; publication is issue #11 and additionally passes
  agent-ix/quoin#290.
- It does not wire the conformance corpus's `python-backend` adapter slot. That
  slot needs a reader that emits contract diagnostics with registry codes, which
  a package of generated types cannot be. The account here says what the
  generated surface *can* decide — 68 of 106 cases, agreeing with the oracle on
  all 68 — and the reader is filed as issue #65.
- It does not decide GAP-011. Its disposition is recorded in `gaps.json`.
- It owns no hand-written Python generator, and FR-077-CON-1 forbids introducing
  one absent a reviewed P0 gap.
