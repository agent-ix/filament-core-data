# Kernel Python package: `pydantic_v2_basemodel`

Output family: `pydantic_v2.BaseModel`.
Runtime validation: validating.
Qualification verdict: **qualified-with-conditions**.

Generated from the semantic kernel bundle
`https://schemas.agent-ix.org/semantic-core/0.2.0/` (`@agent-ix/semantic-core` 0.2.0, digest `sha256:ef79c5dea98c19643b20daa8899951a4782d6248527a0647c114c6f76cca8aea`)
through `python_backend/kernel/emit.py`, by the pinned
`datamodel-code-generator`. Do not edit by hand: the tree is
regenerated and byte-compared.

## What this package does not carry

- `constraints-array-unique`

Each is recorded in `python_backend/qualification/gaps.json` with a
severity and a disposition. A construct measured as lost and absent
from that register fails the qualification gate. A family generated
for the kernel does not become a better family.

No document of this bundle uses `uniqueItems`, so the `constraints-array-unique` loss recorded for this family is not exercised by this input set. That is a property of the bundle, not a repair of the family: the family still loses the construct wherever an input uses it. `UniqueConstraint.json` declares a kernel constraint *keyword* as data and is unaffected.

## Conditions this verdict depends on

- the FR-074 preparation pass rewrites `unevaluatedProperties` (python_backend/adapter/prepare.py rule `unevaluated-properties-to-additional`)
- the profile declares `--strict-nullable` (python_backend/profiles.json option `--strict-nullable`)
- the profile declares `--field-constraints` and `--use-annotated` (python_backend/profiles.json options `--field-constraints`, `--use-annotated`)

## Findings measured over this bundle

### F1 — `agent-ix/filament-core-data#79`

`ConstraintKeyword.format` is a `StrEnum` member that shadows `str.format`, so `mypy --strict` reports one error at `ConstraintKeyword.py:20`. FR-029's keyword vocabulary is closed and owned by `#35`; the pinned generator renders a member name verbatim.

Affected types: `ConstraintKeyword`.

These are recorded, not repaired. Each names the issue that owns the
decision; none is silenced by a checker override, a generator option, a
profile revision, or an edit to the qualification register.

## How the kernel bundle reaches this generator

The bundle `$ref`s by absolute `$id`, which `python_backend/adapter/guard.py`
refuses with `PY-REF-010` — correctly: an absolute-URI reference does make
the generator a fetcher of caller-chosen content. The repair is in the
input, never in the register: `python_backend/kernel/localize.py` rewrites
each base-prefixed `$ref` to its bare sibling filename and drops the root
`$id`, and the unmodified guard then admits the result. Every rewrite is
recorded by document and JSON pointer in `PROVENANCE.json` under
`localization`.

The same pass restores each document's `title` from its filename. The
official `@typespec/json-schema` emitter states a model's identity as its
absolute `$id` and emits no `title`, and the generator derives a class
name from a `title` or a `$defs` key and from nothing else. The restored
name is recovered rather than invented: it is the identity the `$id`
encodes and the name the Rust, TypeScript, and JSON Schema kernel targets
already carry.

## Licence

The generated source is AGPL-3.0-or-later, like the rest of this
repository. The generator is MIT and is attributed in
`PROVENANCE.json`.

This package is not published. Publication passes
`agent-ix/quoin#290` and the issue #23 safety gate, and reaches no
distribution manifest.
