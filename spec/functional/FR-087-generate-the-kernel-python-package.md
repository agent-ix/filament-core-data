---
id: FR-087
title: "Generate the kernel Python package"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-087] Generate the kernel Python package

## Description

The repository SHALL generate the semantic kernel's Python packages by running
the already-qualified issue #23 route — the pinned MIT `datamodel-code-generator`
`0.76.0`, the immutable profiles of `python_backend/profiles.json`, the closed
refusal register of `python_backend/refusals.json`, the sandboxed runner, the
`enforce`-mode inspection, and the byte-compared emitter — over the thirty
committed kernel JSON Schema documents of
`packages/semantic-core/generated/json-schema/`, adding exactly one new
component: a pure reference-localization pass that rewrites the *input* so the
existing guard admits it unmodified. This requirement orchestrates a measured
route; it does not build a second one, it edits no byte of the route it calls,
and it publishes nothing.

## Inputs

- The thirty committed documents of `packages/semantic-core/generated/json-schema/`, produced by the pinned official `@typespec/json-schema` emitter under [FR-033](./FR-033-emit-semantic-core-json-schema.md), byte-gated by `make semantic-core-check`, and indexed by [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md)
- `packages/semantic-core/generated/toolchain.json`: the emitting compiler and emitter versions, the `base` of `https://schemas.agent-ix.org/semantic-core/0.1.0/`, the ordered `files` list, and the bundle `digest`
- The kernel bundle declaration and generation manifest of FR-081, which names this bundle as the Python route's input set
- `python_backend/profiles.json`, `python_backend/refusals.json`, `python_backend/limits.json`, and `python_backend/toolchain.json`, all read and none edited
- `python_backend/qualification/report.json`: the measured verdicts that decide which families emit

## Outputs

- `python_backend/kernel/__init__.py`, a new subpackage that holds everything this requirement adds on the Python side; it sits under `python_backend/` so the repository's existing `mypy`, `ruff`, and `black` configuration already reaches it and `pyproject.toml` needs no edit
- `python_backend/kernel/localize.py` exposing `localize_bundle(documents, base)`, returning the localized documents and the ordered rewrite record in the `Rewrite` shape `python_backend/adapter/prepare.py` already defines
- `python_backend/kernel/emit.py`, the kernel emit driver, with a `--check` verb
- `packages/semantic-kernel/python/<profile-id>/`: one package tree per demonstrated family, each with one module per kernel document, an `__init__.py`, a `README.md`, and a `PROVENANCE.json`
- `packages/semantic-kernel/python/NOT-QUALIFIED.md`: the recorded absence of a package for every family the qualification judged `not-qualified`
- `packages/semantic-kernel/examples/python/<profile-id>.py`: one ordinary consumer per demonstrated family, authored under [FR-089](./FR-089-provide-independent-consumer-examples.md) so every language keeps its examples in one place
- `tests/test_semantic_kernel.py`, the gate for everything this requirement asserts
- The `localization` record inside each `PROVENANCE.json`: every rewritten `$ref`, every dropped `$id`, and every restored `title`, by document and JSON pointer

## Behavior

### The localization pass

- `python_backend/adapter/guard.py` refuses a `$ref` carrying any URI scheme with `PY-REF-010`, through `_classify_ref`'s `_SCHEME` match; the kernel bundle `$ref`s exclusively by absolute `$id`, thirty-five of them, every one under `https://schemas.agent-ix.org/semantic-core/0.1.0/`. Every kernel document therefore reaches `assert_schema_safe` as a refusal today, and this pass exists to change the input rather than the refusal.
- `localize_bundle` SHALL rewrite a `$ref` whose value begins with the declared package base to the remainder of that value — the bare sibling document filename, optionally followed by its `#`-fragment — leaving a local `#`-pointer untouched.
- If a `$ref` does not begin with the declared package base, then `localize_bundle` SHALL leave it byte-identical, so an unexpected reference reaches `assert_schema_safe` and is refused there rather than being localized into acceptability.
- `localize_bundle` SHALL delete the per-document `$id` member, and only the document-root `$id`, because the localized bundle resolves by relative filename and a retained absolute `$id` would re-establish the absolute base the sibling references were just rewritten away from.
- `localize_bundle` SHALL give a document that carries no `title` the `title` its own filename states — the `.json` basename — and SHALL leave a document that already carries one untouched. The official `@typespec/json-schema` emitter states a model's identity as its absolute `$id` and emits no `title`; none of the thirty kernel documents carries one. The generator derives a class name from a `title` or a `$defs` key and from nothing else, so without this rule every one of the thirty modules declares `class Model`, the FR-079 collision rule correctly excludes a name thirty modules each declare, and `__all__` comes out empty — a naming failure misreported as a thirty-way collision.
- The restored `title` is recovered, not invented: it is the same identity the document's `$id` encodes, the same name its filename states, and the same name the Rust, TypeScript, and JSON Schema kernel targets already carry. Restoring it also restores FR-078 attribution for the document-root node, whose pointer is the empty string and which is therefore corroborated by no `$defs` key; without the `title` that node is `unattributed` and the `enforce`-mode inspection refuses the package. The repair belongs to the input here too — `python_backend/runner/inspect_source.py` stays byte-identical to `origin/main`.
- `localize_bundle` SHALL preserve `$schema` and every other keyword byte-for-byte, SHALL introduce no keyword the input did not carry other than the `title` the preceding rule restores, and SHALL delete no constraint keyword.
- `localize_bundle` SHALL be a pure function: deep-equal on every call, inputs unmutated, no clock, no network, no filesystem write — the same purity `python_backend/adapter/prepare.py` holds, and asserted the same way.
- The pass SHALL record each rewrite with its rule, its document, and its JSON pointer, so a generated difference is attributable to a rule rather than to the pass as a whole.
- The pipeline SHALL be: read the committed documents, `localize_bundle`, then `prepare_documents` — the in-memory form `python_backend/adapter/prepare.py` already exposes for exactly this case — then `assert_schema_safe` over every prepared document and `assert_argv_safe` over the resolved vector, then `generate`. Localization SHALL run before the preparation pass and therefore before the guard-facing input `prepare_input_set` would otherwise produce, so that what the guard inspects is what the generator receives.
- `prepare_documents` SHALL then apply its declared `unevaluatedProperties` rewrite to each of the twenty-one sealed kernel object schemas, so every sealed kernel type generates as a closed Python model rather than an open one.

### What the localization pass may not do

- This requirement SHALL NOT add a row to `python_backend/refusals.json`, SHALL NOT remove one, and SHALL NOT change the meaning of `PY-REF-010` or of any other code. The register is closed by FR-075-CON-1; widening it is a specification amendment and this is not one.
- This requirement SHALL NOT edit `_classify_ref`, `ALLOWED_OPTIONS`, `NETWORK_OPTIONS`, `_OPTION_VALUES`, `_FLAGS`, or `FORBIDDEN_KEYS` in `python_backend/adapter/guard.py`.
- This requirement SHALL NOT add, remove, or reorder a generator option, SHALL NOT declare a new profile in `python_backend/profiles.json`, and SHALL NOT pass `--allow-remote-refs`, `--http-local-ref-path`, or any other option `python_backend/adapter/guard.py` refuses. The profile is the complete argument vector and the runner adds nothing to it.
- The localized documents SHALL pass `assert_schema_safe` unchanged and unassisted; the guard SHALL NOT be invoked in a relaxed mode, given an exemption list, or skipped for this input set.
- A guard weakened to admit an input is the failure this requirement exists to avoid: the refusal is correct — an absolute-URI `$ref` does make the generator a fetcher of caller-chosen content — and the kernel bundle is simply not a document the guard's contract permits in that spelling. The repair belongs to the input, in a pass a reader can read and a test can compare, and never to the register.
- Every existing path under `python_backend/adapter/`, `python_backend/runner/`, `python_backend/qualification/`, and `python_backend/generated/`, and every existing `python_backend/*.json`, SHALL be read and imported and SHALL NOT be edited. Everything this requirement adds on the Python side lives in the new `python_backend/kernel/` subpackage.
- This requirement SHALL change no byte under `packages/semantic-core/`; the localization is in memory, `make semantic-core-check` stays green, and the published `$id`s stay published.

### Which families emit

- The demonstrated set SHALL be exactly the families `python_backend/qualification/report.json` records as `qualified-with-conditions`: `pydantic_v2.BaseModel`, `pydantic_v2.dataclass`, and `msgspec.Struct`.
- No package SHALL be emitted for `dataclasses.dataclass` or `typing.TypedDict`, which the qualification judged `not-qualified` for losing the whole constraint layer; their absence SHALL be recorded in `packages/semantic-kernel/python/NOT-QUALIFIED.md` with the verdict and the lost constructs, so it is a declared decision rather than an omission.
- This requirement SHALL read the verdicts through `python_backend.runner.emit.demonstrated` rather than restate them, so a re-measurement that moves a verdict moves the emitted set without an edit here.
- Each demonstrated package's `README.md` SHALL carry that family's recorded conditions and losses verbatim from the qualification, including `msgspec.Struct`'s loss of object closure, string formats, pattern-keyed maps, and absent-versus-null. A family generated for the kernel does not become a better family.
- No document of the kernel bundle uses `uniqueItems`; the `uniqueItems` loss recorded for all three demonstrated families is therefore not exercised by this input set, and the package README SHALL state that as a property of this bundle rather than as a repair of the family. `UniqueConstraint.json` declares a kernel constraint *keyword* as data and is unaffected.

### Reusing the route rather than copying it

- `python_backend/kernel/emit.py` SHALL reach the issue #23 route by importing it — `python_backend.adapter.prepare.prepare_documents`, `python_backend.adapter.profiles.profile_by_id`, `python_backend.adapter.render.render`, `python_backend.adapter.jcs.digest`, `python_backend.runner.generate.generate`, `python_backend.runner.inspect_source.inspect_generated`, `python_backend.runner.toolchain.toolchain`, and `python_backend.runner.emit.collisions` and `demonstrated` — and SHALL NOT fork the route, vendor a copy of it, or edit `python_backend/runner/emit.py`, whose `PUBLISHED` constant names the issue #23 input set and stays as it is.
- Where a layout rule of `python_backend/runner/emit.py` is reachable only as a module-private function, the kernel driver SHALL re-derive it from the same public helpers, and a gate SHALL assert that the two produce identical `__init__.py` text and an identical content fingerprint for one file map, so the duplication cannot drift silently. A duplicated rule with no equality gate is how two emitters start disagreeing.

### The emitted layout and provenance

- The emitted tree SHALL live under `packages/semantic-kernel/python/`, alongside the kernel's other target packages, and SHALL be reachable from no distribution manifest: not from an npm `files` or `exports` entry, not from `pyproject.toml`'s `packages` or `include`, and not from any workflow under `.github/`.
- The layout SHALL be the declared FR-079 layout: one module per input document, an `__init__.py` whose `__all__` is sorted and complete, and a `README.md` naming the family, the verdict, the conditions, and what the package does not carry — measured at thirty-one modules for `pydantic_v2_basemodel` over this bundle.
- The FR-079 name-collision rule SHALL apply unchanged, through the imported `collisions`: a name two modules each declare is excluded from `__all__`, stays reachable as `<module>.<Name>`, and is recorded in `PROVENANCE.json` and the README; a name one module declares twice raises.
- `PROVENANCE.json` SHALL carry the input digest over the localized-and-prepared input set, the profile digest, the toolchain fingerprint computed over the *declared* toolchain, and the content fingerprint over the package's file map excluding `PROVENANCE.json` itself.
- `PROVENANCE.json` SHALL additionally carry the kernel bundle's identity: the `base` and `digest` of `packages/semantic-core/generated/toolchain.json` and the `@agent-ix/semantic-core` version that base encodes, so a package can be traced to the exact bundle it was generated from.
- `PROVENANCE.json` SHALL carry the `localization` record and the `preparation` record as separate members, so the two input rewrites are attributable independently.
- `PROVENANCE.json` SHALL preserve the upstream MIT attribution of `datamodel-code-generator` verbatim, naming its version `0.76.0` and its licence `MIT`, and SHALL declare the generated source `AGPL-3.0-or-later`. The attribution is not replaced by the AGPL header.
- `PROVENANCE.json` SHALL carry no clock reading and no host-observed version, and SHALL carry `published: false` with `agent-ix/quoin#290` named as the gate.
- Every committed JSON artefact this requirement writes SHALL be serialized through `python_backend.adapter.render.render`, so the byte comparison and `make lint` agree instead of contradicting each other.

### Type checking, regeneration, and publication

- The emitter SHALL run the `enforce`-mode inspection before writing anything under `packages/semantic-kernel/python/`, so no package that degrades a constraint is written and then imported.
- Each emitted package SHALL import under the declared interpreter with no exception and no warning, with every forward reference resolved and no unresolved `ForwardRef` on any model.
- The pinned `mypy` at the version `python_backend/toolchain.json` records SHALL report zero errors over every emitted kernel module and every kernel example under `--strict`. The gate SHALL reach that tree by invoking the pinned checker on the path explicitly, so no `pyproject.toml` member, mypy override, or ruff exclusion is added. There SHALL be no per-module override, no relaxation of `strict`, and no `type: ignore` in generated or example source; a type the checker rejects is a finding, not a configuration problem.
- Regenerating from the unchanged committed bundle SHALL reproduce the committed kernel tree byte-for-byte, and the `--check` form SHALL fail naming the first differing path when any committed byte is mutated.
- Two generations from the same bundle, profile, and declared toolchain, each into a fresh scratch root, SHALL produce byte-identical file maps and an identical toolchain fingerprint.
- No PyPI publication, no `poetry publish`, no distribution build, and no tag push happens here. Publication is blocked on `agent-ix/quoin#290`, a human sign-off that has not moved, and on the issue #23 safety gate, and this requirement records that block by name rather than deferring it silently.
- Each kernel example SHALL run under `tests/test_semantic_kernel.py`, importing only the generated package, the standard library, and the family's runtime, constructing a conforming kernel value, round-tripping it, and raising on a value the kernel bundle forbids.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-087-CON-1 | The maintainer SHALL NOT widen `python_backend/refusals.json`, relax a guard, add a guard exemption, or add a generator option to make the kernel bundle generate. The localization pass rewrites the input and nothing else; a change under `python_backend/adapter/guard.py` or `python_backend/profiles.json` made in service of this requirement is a defect in this requirement. | Security | Static |
| FR-087-CON-2 | This requirement SHALL change no byte under `packages/semantic-core/`, so `make semantic-core-check` and [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md)'s byte gate both stay green and the localization stays an in-memory transform. | Integrity | Analysis |
| FR-087-CON-3 | The localization pass SHALL remain a schema-to-schema rewrite that post-processes no generated Python source, for the same reason FR-074-CON-1 gives: a text patch over generated code is a hand-written generator by another name. | Integrity | Test |
| FR-087-CON-4 | The maintainer SHALL NOT emit a package for a family the qualification judges `not-qualified`, nor re-run the qualification with an altered probe set to move a verdict in order to emit one. | Integrity | Test |
| FR-087-CON-5 | This requirement SHALL add no path under `packages/semantic-kernel/` to `pyproject.toml`'s `packages` or `include`, to any npm manifest's `files` or `exports`, or to any workflow under `.github/`. Publication passes `agent-ix/quoin#290`. | Compliance | Test |
| FR-087-CON-6 | This requirement SHALL introduce no second generator, no vendored copy, and no fork of `datamodel-code-generator`; the generator stays an attributed, pinned third-party dependency at `0.76.0`. | Compliance | Static |
| FR-087-CON-7 | Every existing path under `python_backend/adapter/`, `python_backend/runner/`, `python_backend/qualification/`, and `python_backend/generated/`, and every existing `python_backend/*.json`, SHALL be byte-identical to `origin/main`; the kernel route adds `python_backend/kernel/` and edits nothing it imports. | Non-disruption | Analysis |
| FR-087-CON-8 | `pyproject.toml` SHALL be byte-identical to `origin/main`: no new dependency, no new mypy override, no new ruff exclusion, and no lint or type-check exclusion for the generated kernel tree. The new subpackage lives under `python_backend/` precisely so the existing configuration already covers it. | Integrity | Static |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-087-AC-1 | Every one of the thirty-five absolute `$ref` values in the committed kernel bundle is refused by `assert_schema_safe` with `PY-REF-010` before localization, and every localized document passes the same unmodified guard afterwards. | Test |
| FR-087-AC-2 | After `localize_bundle`, no document carries a root `$id`, every `$ref` is a bare sibling filename naming a document present in the input set, every document carries a `title` equal to its filename stem, and `$schema` and every constraint keyword are byte-identical to the committed document. `title` is the only keyword the pass may introduce. | Property |
| FR-087-AC-3 | A `$ref` whose value does not begin with the declared package base survives `localize_bundle` byte-identical and is then refused by `assert_schema_safe` with its own code. | Test |
| FR-087-AC-4 | `python_backend/refusals.json`, `python_backend/profiles.json`, `python_backend/limits.json`, `python_backend/toolchain.json`, every file under `python_backend/adapter/`, `python_backend/runner/`, `python_backend/qualification/`, and `python_backend/generated/`, and `pyproject.toml` are byte-identical to `origin/main` on this branch. | Analysis |
| FR-087-AC-5 | Calling `localize_bundle` twice returns deep-equal results and leaves every input document deep-equal to its pre-call state; the pass opens no socket, reads no clock, and writes no file. | Property |
| FR-087-AC-6 | The `localization` record names every rewritten `$ref` and every dropped `$id` by document and pointer, and its counts equal the bundle's measured thirty-five references, thirty dropped `$id`s, and thirty restored titles. | Test |
| FR-087-AC-7 | Every sealed kernel object schema generates a closed Python model — `extra='forbid'` in both Pydantic families — and generating the same bundle without the preparation pass yields an open one, asserted in both directions. | Integration |
| FR-087-AC-8 | A package tree exists under `packages/semantic-kernel/python/` for exactly the families recorded as `qualified-with-conditions`, `NOT-QUALIFIED.md` records each `not-qualified` family with its verdict and lost constructs, and no tree exists for either. | Test |
| FR-087-AC-9 | Each emitted kernel package has one module per kernel document and an `__init__.py` whose `__all__` is sorted, complete, and free of every name more than one module declares; those names are reachable as `<module>.<Name>` and listed in `PROVENANCE.json`. | Test |
| FR-087-AC-10 | Each emitted kernel package imports under the declared interpreter with no exception and no warning, and no model retains an unresolved forward reference. | Integration |
| FR-087-AC-11 | `PROVENANCE.json` carries the input digest, the profile digest, the toolchain fingerprint, the content fingerprint, the kernel bundle base and digest, the `localization` and `preparation` records, the verbatim MIT attribution for `datamodel-code-generator 0.76.0`, `AGPL-3.0-or-later`, `published: false`, and `agent-ix/quoin#290`; and carries no clock reading and no host-observed version. | Test |
| FR-087-AC-12 | The pinned `mypy` reports zero errors under `--strict` over every module and example under `packages/semantic-kernel/python/`, invoked by path with no configuration change; no generated or example source contains `type: ignore`; and `pyproject.toml` declares no override for that tree. Blocked by finding F1 below. | Analysis |
| FR-087-AC-13 | Regenerating from the unchanged committed bundle reproduces the kernel tree byte-for-byte, `--check` fails naming a mutated committed file, and two generations into fresh scratch roots agree byte-for-byte and in fingerprint. | Snapshot |
| FR-087-AC-14 | No byte under `packages/semantic-core/` changes, and `make semantic-core-check` passes, after a full kernel generation. | Analysis |
| FR-087-AC-15 | No path under `packages/semantic-kernel/` appears in the packed file list of any distribution this repository builds, checked against the packed list rather than the manifest text alone; and `.github/` is byte-identical to `origin/main`. | Test |
| FR-087-AC-16 | Each kernel example runs, constructs a conforming kernel value, round-trips it, and raises on a value the kernel bundle forbids. For `msgspec_struct` the conforming value is one of the twenty-six kernel types that family can decode, and the example additionally pins the four it cannot as finding F2 below. | Integration |
| FR-087-AC-17 | `python_backend/kernel/emit.py` reaches the issue #23 route only by import, and for one file map its `__init__.py` text and content fingerprint are identical to what `python_backend/runner/emit.py` produces. | Test |
| FR-087-AC-18 | No generated kernel file contains a date, a time, an absolute path from the generating host, a user name, or a hostname, and no socket is opened during a kernel generation. | Integration |

## Findings

Two measured facts this requirement records rather than repairs. Neither is a
defect in the input, in the guard, or in the checker, and neither may be
silenced here: the route is imported, not edited, and a gate made green by
hiding a measurement is worth nothing.

### F1 — a `StrEnum` member that shadows a `str` method

FR-029's closed constraint-keyword vocabulary contains `format`. The pinned
generator renders an enum member verbatim as an attribute name, and on a
`StrEnum` that attribute shadows `str.format`, which `mypy --strict` rejects:
one error per family, three in total, all at `ConstraintKeyword.py:20`. The
input is correct, the shadowing is real, and the four available silencings each
trade a measured fact for a green gate. FR-087-AC-12 is therefore blocked, not
satisfied, and the decision belongs to `agent-ix/filament-core-data#79`, which
states the options and names `#35` as the vocabulary's owner.

### F2 — `msgspec_struct` cannot decode four of the thirty kernel types

Both Pydantic families carry all thirty kernel types. `msgspec_struct` carries
twenty-six: `TypeRef` fails because `target` is a union of a pattern-constrained
string and a string enum, which `msgspec` refuses as two str-like members;
`FieldDecl` and `OperationDecl` fail through their `TypeRef`s; and
`ConstraintDecl` fails because the generator does not carry the schema's stated
`keyword` discriminator into a `tag_field`, leaving eleven untagged structs.
All four raise `TypeError` at decoder construction, not at decode time. Neither
union shape occurs in the thirteen published documents the issue #23
qualification probed, so neither is a `python_backend/qualification/gaps.json`
row, and FR-087-CON-4 and FR-087-CON-7 both forbid closing that hole from here.
The family is emitted with the loss recorded — in its `README.md`, in its
`PROVENANCE.json`, and as an executable assertion in its example — and the
decision belongs to `agent-ix/filament-core-data#125`.

## Dependencies

- **Upstream**: FR-081, [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md), [FR-074](./FR-074-prepare-schema-for-python-generation.md), [FR-075](./FR-075-reject-dangerous-generation-inputs.md), [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-078](./FR-078-inspect-generated-python-for-semantic-loss.md), [FR-079](./FR-079-emit-the-python-package-layout.md), [FR-080](./FR-080-type-check-and-validate-generated-python.md), [FR-033](./FR-033-emit-semantic-core-json-schema.md)
- **Constrained by**: NFR-028, NFR-029, NFR-030
- **Blocked**: publication of any emitted package passes `agent-ix/quoin#290` and the issue #23 safety gate; neither is decided here
