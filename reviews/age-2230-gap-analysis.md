---
id: SR-195
title: AGE-2230 gap-analysis of PR 269
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data@3a5a28054edece086ca240cce77243804a05edd3; AGE-2230;
  Makefile, package.json, packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py,
  packages/semantic-kernel/examples/python/pydantic_v2_dataclass.py, packages/semantic-kernel/python/NOT-QUALIFIED.md,
  packages/semantic-kernel/python/msgspec_struct/DecimalPolicy.py, packages/semantic-kernel/python/msgspec_struct/KernelScalar.py,
  packages/semantic-kernel/python/pydantic_v2_basemodel/DecimalPolicy.py, packages/semantic-kernel/python/pydantic_v2_basemodel/KernelScalar.py,
  packages/semantic-kernel/python/pydantic_v2_dataclass/DecimalPolicy.py, packages/semantic-kernel/python/pydantic_v2_dataclass/KernelScalar.py,
  python_backend/adapter/prepare.py, python_backend/generated/NOT-QUALIFIED.md, python_backend/generated/msgspec_struct/__init__.py,
  python_backend/generated/msgspec_struct/semantic_ir_schema.py, python_backend/generated/pydantic_v2_basemodel/__init__.py,
  python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py, python_backend/generated/pydantic_v2_dataclass/__init__.py,
  python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py, python_backend/kernel/emit.py,
  python_backend/qualification/gaps.json, python_backend/qualification/probes/constraints-decimal-policy.json,
  python_backend/qualification/report.json, python_backend/qualification/validation.json,
  spec/functional/FR-074-prepare-schema-for-python-generation.md, tests/test_conformance_corpus.py,
  tests/test_python_backend_adapter.py, tests/test_python_backend_qualification.py,
  tests/test_semantic_kernel.py
review_set: subset
relationships:
- target: ix://agent-ix/filament-core-data/FR-136
  type: references
---

## Summary

Ticket: AGE-2230. Computed traceability for the PR scope exposes pre-existing untagged obligations. This is a diff-scoped review, not a claim of full repository assurance.

## Verdict

**FAIL** — Untagged criteria remain in the reviewed scope. Baseline debt is distinguished from introduced defects.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-079-AC-8 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-079-emit-the-python-package-layout.md:72 |
| FND-002 | medium | FR-077-AC-8 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-077-qualify-each-python-output-family.md:76 |
| FND-003 | medium | FR-080-AC-3 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-080-type-check-and-validate-generated-python.md:66 |
| FND-004 | medium | FR-087-AC-15 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-087-generate-the-kernel-python-package.md:131 |
| FND-005 | medium | FR-136-AC-2 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md:160 |
| FND-006 | medium | FR-136-AC-3 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md:161 |
| FND-007 | medium | FR-136-AC-8 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md:166 |
| FND-008 | medium | FR-136-AC-11 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md:169 |
| FND-009 | medium | FR-136-AC-12 is untagged in the computed matrix. Existing legacy TC docstrings and Traces: comments do not create a Trace: binding. This is baseline trace debt exposed by the review, not an introduced runtime regression; record its disposition separately from the PR defects. | spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md:170 |

## Coverage

Reviewed the exact requested commit against origin/main. No repository source, test, spec, branch or PR mutation was made. No applicable AssuranceProfile was found. The repository uses function tests and existing compact TC docstrings; no class-style migration was imposed.

Generated DecimalPolicy fields and exports were compared with the owned schema in all three families; qualification count deltas match one additional declared/exercised type per family. No new copied upstream implementation, stub, internal mocking, lowered threshold, warning suppression, or hand-written generator was found in this diff. The tomllib publication-manifest fix matches package-mode=false, and the E501 edit changes prose wrapping only.

Runtime evidence: npm pack --dry-run --json completed and listed 336 semantic-kernel paths, including bundle.json. A read-only probe using installed pydantic 2.12.5 and msgspec 0.21.1 demonstrated the DecimalPolicy loss; the schema validator rejected the same value. Existing environment: /home/peter/.cache/pypoetry/virtualenvs/filament-core-data-tools-0lTvIk17-py3.13/bin/python, with PYTHONDONTWRITEBYTECODE=1. git diff --check passed.

make lint-python could not provision its default Poetry environment within the sandbox: destination ~/.cache/pypoetry/virtualenvs was not writable, exit 2. No lint or full Python-suite pass is claimed. The PR author's reported Black failures remain unverified by this reviewer. The canonical gate is owned by the lead and was not observed here.

Tooling: on terra, /home/peter/.local/bin/quoin 0.28.3 and /home/peter/.local/bin/quire 0.36.2 (engine 0.50.2). The skill's quoin write --types SpecReview command rejected with "write requires <repo_dir>"; its documented complete schema fallback was used. Matrix emitted DuplicateArchetype and DuplicateInverseEdge warnings but returned computed output. No older binary was substituted.

Reconciliation: quire matrix --scope /home/peter/dev/worktrees/age-2230-code --format json; no run evidence read. Whole matrix: 2155 obligations, 1589 untagged, 183 tagged, 4 tagged-by-ignored-test, 379 method-without-symbol. The nine specific baseline findings are the directly examined missing bindings, not an exhaustive finding inventory for the whole matrix. Reverse inspection inventoried four changed behaviors (generated decimal models, qualification measurement, publication checks, emit documentation); all have owning requirements, no source or test stub identified in changed code. Optional full semantic audit skipped; ordinary code-to-test intent review performed.

Plan completion: not assessed

## Examined Scope

```yaml
scope:
- id: FR-079-AC-8
  path: spec/functional/FR-079-emit-the-python-package-layout.md
  role: examined
  excerpt: No path under `python_backend/` is reachable from any published package
    manifest, checked against the packed file list rather than the manifest text alone.
- id: FR-077-AC-8
  path: spec/functional/FR-077-qualify-each-python-output-family.md
  role: examined
  excerpt: The report is byte-identical on a second measurement, and `--check` fails
    against a mutated committed artefact.
- id: FR-080-AC-3
  path: spec/functional/FR-080-type-check-and-validate-generated-python.md
  role: examined
  excerpt: Every generated type in a `validating` profile is either exercised with
    a schema-built conforming value and a forbidden one, or named in `validation.json`
    with one of the two declared reasons; the per-profile exercised and unexercised
    counts are frozen by `--check`, and a mutated count fails it.
- id: FR-080-AC-4
  path: spec/functional/FR-080-type-check-and-validate-generated-python.md
  role: examined
  excerpt: For each constraint a demonstrated family retains, a non-conforming value
    is rejected by that family's runtime, naming the constraint.
- id: FR-087-CON-5
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: This requirement SHALL add no path under `packages/semantic-kernel/` to
    `pyproject.toml`'s `packages` or `include`, to any npm manifest's `files` or `exports`,
    or to any workflow under `.github/`. Publication passes `agent-ix/quoin#290`.
- id: FR-087-AC-15
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: No path under `packages/semantic-kernel/` appears in the packed file list
    of any distribution this repository builds, checked against the packed list rather
    than the manifest text alone; and no file under `.github/` names `semantic-kernel`.
- id: FR-087-AC-16
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: Each kernel example runs, constructs a conforming kernel value, round-trips
    it, and raises on a value the kernel bundle forbids. For `msgspec_struct` the
    conforming value is one of the twenty-six kernel types that family can decode,
    and the example additionally pins the four it cannot as finding F2 below.
- id: FR-136-AC-2
  path: spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md
  role: examined
  excerpt: A `python-pydantic-v2` request over an accepted IR document returns state
    `success` with a non-empty file set and zero blocking diagnostics
- id: FR-136-AC-3
  path: spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md
  role: examined
  excerpt: A `python-dataclass` request over the same document returns state `success`
    under its own profile
- id: FR-136-AC-8
  path: spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md
  role: examined
  excerpt: A `python-pydantic-v2` and a `python-dataclass` request over a `2.0.0`
    document whose `ConfigVersion` is an `entity` each return state `success` with
    a `ConfigVersion.py` module declaring class `ConfigVersion`, and a `constructs.py`
    whose `TYPE_KIND` maps it to `entity` and whose `IDENTITY_FIELDS` maps it to `id`
- id: FR-136-AC-11
  path: spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md
  role: examined
  excerpt: Over the constructs fixture, in both Python targets, two `Order` instances
    with one `id` and different other fields are equal and hash equal, instances with
    different `id`s are unequal, an `Order` is an instance of `Party`, `Party()` raises
    `TypeError`, assigning an `Order`'s `id` raises `AttributeError` while assigning
    its `status` succeeds, assigning a field of an `OrderPlaced` instance raises,
    and `hash` of an `OrderPlaced` raises `TypeError`
- id: FR-136-AC-12
  path: spec/functional/FR-136-register-the-python-backends-in-the-generation-seam.md
  role: examined
  excerpt: '`constructs.py` over an entity titled `Config Overlay` and a repository
    titled `Order Repository` keys every table `ConfigOverlay` and `OrderRepository`
    and compiles; rendering beside a generated `constructs.py` or `Constructs.py`,
    refining a type whose field holds an abstract type, and refining an identity field
    its class does not declare each raise `ConstructError`, while a field holding
    a `reference` to the abstract type refines'
- id: python_backend/generated/msgspec_struct/__init__.py
  path: python_backend/generated/msgspec_struct/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with'
- id: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  path: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  role: examined
  excerpt: from __future__ import annotations
- id: python_backend/generated/pydantic_v2_basemodel/__init__.py
  path: python_backend/generated/pydantic_v2_basemodel/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with'
- id: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  role: examined
  excerpt: from __future__ import annotations
- id: python_backend/generated/pydantic_v2_dataclass/__init__.py
  path: python_backend/generated/pydantic_v2_dataclass/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with'
- id: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  role: examined
  excerpt: from __future__ import annotations
- id: python_backend/kernel/emit.py
  path: python_backend/kernel/emit.py
  role: examined
  excerpt: '"""The kernel Python emit driver (FR-087).'
- id: python_backend/qualification/validation.json
  path: python_backend/qualification/validation.json
  role: examined
  excerpt: '{'
- id: tests/test_conformance_corpus.py
  path: tests/test_conformance_corpus.py
  role: examined
  excerpt: "\"\"\"Issue #20 \u2014 the Python half of the conformance gate (TC-642,\
    \ NFR-016-AC-3)."
- id: tests/test_python_backend_qualification.py
  path: tests/test_python_backend_qualification.py
  role: examined
  excerpt: "\"\"\"Issue #23 \u2014 the qualification, the layout, and the validation"
- id: tests/test_semantic_kernel.py
  path: tests/test_semantic_kernel.py
  role: examined
  excerpt: '"""The Python kernel target (issue #11, FR-087).'
- id: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py::DecimalPolicy
  path: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  role: examined
  excerpt: "class DecimalPolicy(BaseModel):\n    model_config = ConfigDict(\n    \
    \    extra='forbid',\n    )\n    precision: Annotated[int, Field(ge=1, le=38)]\n\
    \    scale: Annotated[int, Field(ge=0, le=38)]"
```

## Dispositions

Round 1 reviewed 345a1929a741b0d5a1e8eac5ef50a6ffadbd7cd6.

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-002 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-003 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-004 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-005 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-006 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-007 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-008 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |
| FND-009 | deferred | Pre-existing trace-tag debt is outside AGE-2230's requested Python failure repair. This PR did not create the missing binding; a repository traceability remediation owns it. No traceability pass is claimed. |

## Disposition evidence (round 1)

Baseline trace findings are explicitly deferred as outside this repair. The original matrix result and findings remain unchanged; no new matrix pass is claimed.

## New findings (disposition pass 2)

Reviewed b43ed20078637031a7330e2bff3ebb93fbb28838.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-010 | medium | New DecimalPolicy runtime regressions have no recognized Trace: binding; their prose claims FR-136-AC-12, which specifies constructs.py slug/collision/abstract-reference/identity behavior and is not asserted here. The new preparation regression likewise has only a TC prose docstring. Add recognized bindings to the actual constraint and preparation obligations asserted, with unique test identities (TC-870 is currently reused). | tests/test_python_backend_qualification.py:363 |

## Dispositions (round 2)

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-010 | still-open | New DecimalPolicy runtime regressions have no recognized Trace: binding; their prose claims FR-136-AC-12, which specifies constructs.py slug/collision/abstract-reference/identity behavior and is not asserted here. The new preparation regression likewise has only a TC prose docstring. Add recognized bindings to the actual constraint and preparation obligations asserted, with unique test identities (TC-870 is currently reused). |

## Disposition evidence (round 2)

**FAIL — not mergeable.** Current findings and gate failures above supersede historical verdict prose.

Exact archive: b43ed20078637031a7330e2bff3ebb93fbb28838; base c620d6be99654a7a77f0ecc2f97d3c7136402651. All 21 changed files inspected. No workflow, Rust, Cargo, spec or plan files changed. Code/Python review and gap analysis apply; Rust and changed-spec methods do not. No applicable AssuranceProfile found. No source edits, pushes, merges or agents.

Locked fresh probes: DOMAIN_PROBES_RC=1; four schema-equivalence counterexamples in preparation-probes.json. Integer grid 1640 cells per family all matches authoritative DecimalPolicy schema. Five extra cases show Pydantic coercion (3 each; no regression attribution established) and explicitly recorded msgspec closure loss (1); these are not counted as new findings. decimal-runtime-probes.json contains every mismatch. The earlier FND003 scale<=precision defect remains fixed on the integer domain.

Computed matrix: strict RC1; 2155 obligations, {'untagged': 1562, 'method-without-symbol': 379, 'tagged': 210, 'tagged-by-ignored-test': 4}. FR074AC8/CON2, FR077AC3, FR080AC4 and FR136AC12 untagged. Prior SR195 findings001-009 retain their explicit baseline-debt deferrals; only new regression-test trace gaps are raised. No whole-repository assurance pass claimed.

Parent exact-head gate reports test-python 513 passed /4 failed: generated tree mismatch, mutation check still red, TC1059 workflow mismatch, and kernel provenance regeneration bounds drift. No full gate pass claimed. Kernel provenance drift is confirmed inherited: base c620d6be and b43ed2 committed kernel DecimalPolicy.py allow maximum2147483647, while the owned semantic-core generated DecimalPolicy.json says38. Regenerate through the owned pipeline. Backend generated-tree mismatch causality is not established by this review; parent reported gate failure is retained as blocking acceptance evidence. No review invokes or modifies workflow configuration.

Prior SR194 FND001 packing repair is still present (private root files=[package.json]); FND003 relation works; source-postprocessor FND004 is removed in58feca385c. SR194 FND002 remains open. Shell/manifest repairs introduce no extra mocking, stub, vendored implementation or threshold reduction. The AC8 subtree exclusion is explicitly raised as FND006.

## Current examined scope

```yaml
scope:
- id: package.json
  path: package.json
  role: examined
  excerpt: "{\n\t\"name\": \"@agent-ix/filament-core-data\",\n\t\"version\": \"0.1.0\"\
    ,\n\t\"description\": \"Semantic contract compiler and generated kernel packages\
    \ for Agent IX.\",\n\t\"author\": \"Agent IX\",\n\t\"license\": \"AGPL-3.0-or-later\"\
    ,\n\t\"private\": true,\n\t\"files\": [\"package.json\"],\n\t\"type\": \"module\"\
    ,\n\t\"packageManager\": \"pnpm@10.33.4\",\n\t\"scripts\": {\n\t\t\"build\": \"\
    tsc -p tsconfig.build.json\",\n\t\t\"test\": \"vitest run\",\n\t\t\"typecheck\"\
    : \"tsc --noEmit -p tsconfig.json\",\n\t\t\"lint\": \"biome format . && tsc --noEmit\
    \ -p tsconfig.json && node scripts/build-compatibility-cases.mjs --check "
- id: packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py
  path: packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py
  role: examined
  excerpt: "\"\"\"An ordinary consumer of the kernel `pydantic_v2_basemodel` package\
    \ (FR-089).\n\nImports the generated package, the standard library and the family's\
    \ runtime,\nand nothing else. The caller puts `packages/semantic-kernel` on the\
    \ path and\nthe tree imports as `python.<profile-id>` \u2014 that is the only\
    \ accommodation an\nordinary consumer makes, and it is the one any unpublished\
    \ tree requires.\nPublication passes `agent-ix/quoin#290`.\n\"\"\"\n\nfrom __future__\
    \ import annotations\n\nfrom typing import Any\n\nfrom pydantic import ValidationError\n\
    from python.pydanti"
- id: packages/semantic-kernel/examples/python/pydantic_v2_dataclass.py
  path: packages/semantic-kernel/examples/python/pydantic_v2_dataclass.py
  role: examined
  excerpt: '"""An ordinary consumer of the kernel `pydantic_v2_dataclass` package
    (FR-089).


    Imports the generated package, the standard library and the family''s runtime,

    and nothing else. The caller puts `packages/semantic-kernel` on the path and

    the tree imports as `python.<profile-id>`. Publication passes

    `agent-ix/quoin#290`.

    """


    from __future__ import annotations


    from typing import Any


    from pydantic import TypeAdapter, ValidationError


    from python.pydantic_v2_dataclass.FieldDecl import FieldDecl

    from python.pydantic_v2_dataclass.SourceLocus import '
- id: packages/semantic-kernel/python/NOT-QUALIFIED.md
  path: packages/semantic-kernel/python/NOT-QUALIFIED.md
  role: examined
  excerpt: "# Families with no emitted kernel package\n\nThese families were declared,\
    \ measured, and judged. The absence of a\npackage is a recorded decision, not\
    \ an omission, and the verdict is\nnever re-run with an altered probe set in order\
    \ to emit one.\n\n## `stdlib_dataclass` \u2014 not-qualified\n\nOutput family:\
    \ `dataclasses.dataclass`.\n\nConstructs it loses:\n\n- `alias`\n- `closure-additional`\n\
    - `closure-unevaluated`\n- `constraints-array-unique`\n- `constraints-decimal-policy`\n\
    - `constraints-numeric`\n- `constraints-string`\n- `description`\n- `map-additional`\n\
    - `map-"
- id: python_backend/adapter/prepare.py
  path: python_backend/adapter/prepare.py
  role: examined
  excerpt: '"""The owned schema preparation pass (FR-074).


    One rewrite, measured rather than assumed. The official TypeSpec JSON Schema

    emitter states a sealed model with `unevaluatedProperties`, usually as the

    always-false schema `{"not": {}}`. The pinned generator reads neither: measured

    against it, `unevaluatedProperties: {"not": {}}` produces `extra=''allow''`

    in both Pydantic families and no `closed=True` in `TypedDict`, while

    `additionalProperties: false` produces `extra=''forbid''` and `closed=True`. Every

    sealed contract type would otherwise generate '
- id: python_backend/generated/NOT-QUALIFIED.md
  path: python_backend/generated/NOT-QUALIFIED.md
  role: examined
  excerpt: "# Families with no emitted package\n\nThese families were declared, measured,\
    \ and judged. The absence of a\npackage is a recorded decision, not an omission.\n\
    \n## `stdlib_dataclass` \u2014 not-qualified\n\nOutput family: `dataclasses.dataclass`.\n\
    \nConstructs it loses:\n\n- `alias`\n- `closure-additional`\n- `closure-unevaluated`\n\
    - `constraints-array-unique`\n- `constraints-decimal-policy`\n- `constraints-numeric`\n\
    - `constraints-string`\n- `description`\n- `map-additional`\n- `map-pattern`\n\
    - `string-format`\n- `union-discriminated`\n\n## `typed_dict` \u2014 not-qualified\n\
    \nOu"
- id: python_backend/generated/msgspec_struct/__init__.py
  path: python_backend/generated/msgspec_struct/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, Tex'
- id: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  path: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom msgspec import UNSET, Meta, Struct, UnsetType,\
    \ field\n\nfrom . import common_schema\n\n\nclass ContractVersion(Enum):\n   \
    \ field_2_0_0 = '2.0.0'\n\n\nclass Package(Struct):\n    identity: common_schema.PackageIdentity\n\
    \    lockDigest: common_schema.Sha256\n    manifestDigest: common_schema.Sha256\n\
    \    mappingVersions: list[common_schema.Semver]\n    profileVersions: list[common_sc"
- id: python_backend/generated/pydantic_v2_basemodel/__init__.py
  path: python_backend/generated/pydantic_v2_basemodel/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, Tex'
- id: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom pydantic import AwareDatetime, BaseModel, ConfigDict,\
    \ Field, RootModel\nfrom typing_extensions import TypeAliasType\n\nfrom . import\
    \ common_schema\n\n\nclass ContractVersion(Enum):\n    field_2_0_0 = '2.0.0'\n\
    \n\nclass Package(BaseModel):\n    model_config = ConfigDict(\n        extra='forbid',\n\
    \    )\n    identity: common_schema.PackageIdentity\n    lockDigest: common_schema.Sha25"
- id: python_backend/generated/pydantic_v2_dataclass/__init__.py
  path: python_backend/generated/pydantic_v2_dataclass/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, Tex'
- id: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom pydantic import AwareDatetime, ConfigDict, Field\n\
    from pydantic.dataclasses import dataclass\n\nfrom . import common_schema\n\n\n\
    class ContractVersion(Enum):\n    field_2_0_0 = '2.0.0'\n\n\n@dataclass(config=ConfigDict(extra='forbid'))\n\
    class Package:\n    identity: common_schema.PackageIdentity\n    lockDigest: common_schema.Sha256\n\
    \    manifestDigest: common_schema.Sha256\n    ma"
- id: python_backend/kernel/emit.py
  path: python_backend/kernel/emit.py
  role: examined
  excerpt: "\"\"\"The kernel Python emit driver (FR-087).\n\nThis orchestrates a measured\
    \ route; it does not build a second one. The issue\n#23 pipeline \u2014 the pinned\
    \ MIT `datamodel-code-generator`, the\nimmutable profiles, the closed refusal\
    \ register, the sandboxed runner, the\n`enforce`-mode inspection and the byte-compared\
    \ emitter \u2014 is reached by import\nand edited nowhere. Exactly one component\
    \ is new: the pure reference\nlocalization of `python_backend/kernel/localize.py`,\
    \ which rewrites the *input*\nso the existing guard admits it unmodified.\n\n\
    The pipeline, in o"
- id: python_backend/qualification/gaps.json
  path: python_backend/qualification/gaps.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. One row per construct and affected\
    \ family. A construct measured as lost with no row here fails the gate; removing\
    \ a row fails the gate. No row may dispose a gap to a hand-written generator absent\
    \ a recorded reviewed P0 decision.\",\n\t\"gaps\": [\n\t\t{\n\t\t\t\"construct\"\
    : \"array uniqueItems\",\n\t\t\t\"probe\": \"constraints-array-unique\",\n\t\t\
    \t\"family\": \"pydantic_v2_basemodel\",\n\t\t\t\"severity\": \"medium\",\n\t\t\
    \t\"closableByPreparation\": false,\n\t\t\t\"disposition\": \"recorded; the pinned\
    \ generator does not carry this construct into this fami"
- id: python_backend/qualification/probes/constraints-decimal-policy.json
  path: python_backend/qualification/probes/constraints-decimal-policy.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. Cross-property numeric conditions\
    \ must survive generation.\",\n\t\"id\": \"constraints-decimal-policy\",\n\t\"\
    construct\": \"decimal precision and scale condition\",\n\t\"note\": \"Scale must\
    \ not exceed precision when both properties are present.\",\n\t\"detector\": {\n\
    \t\t\"kind\": \"regex\",\n\t\t\"pattern\": \"(?s)(?:(?=.*Literal\\\\[1\\\\])(?=.*le=1)|(?=.*tag=1)(?=.*Meta\\\
    \\(.*le=1))\"\n\t},\n\t\"schema\": {\n\t\t\"$defs\": {\n\t\t\t\"decimalPolicy\"\
    : {\n\t\t\t\t\"type\": \"object\",\n\t\t\t\t\"title\": \"DecimalPolicy\",\n\t\t\
    \t\t\"required\": [\n\t\t\t\t\t\"precision\",\n\t\t\t\t\t\"scale\"\n\t\t\t\t],\n\
    \t\t\t\t\""
- id: python_backend/qualification/report.json
  path: python_backend/qualification/report.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. Generated by `python_backend/runner/qualify.py`;\
    \ never hand-edited.\",\n\t\"verdicts\": [\n\t\t{\n\t\t\t\"profileId\": \"pydantic_v2_basemodel\"\
    ,\n\t\t\t\"outputModelType\": \"pydantic_v2.BaseModel\",\n\t\t\t\"runtimeValidation\"\
    : \"validating\",\n\t\t\t\"verdict\": \"qualified-with-conditions\",\n\t\t\t\"\
    retained\": [\n\t\t\t\t\"alias\",\n\t\t\t\t\"closure-additional\",\n\t\t\t\t\"\
    closure-unevaluated\",\n\t\t\t\t\"const\",\n\t\t\t\t\"constraints-decimal-policy\"\
    ,\n\t\t\t\t\"constraints-numeric\",\n\t\t\t\t\"constraints-string\",\n\t\t\t\t\
    \"default-non-nullable\",\n\t\t\t\t\"description\",\n\t\t\t\t\"enum\",\n\t\t\t\
    \t\"map-additi"
- id: python_backend/qualification/validation.json
  path: python_backend/qualification/validation.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-080. Generated by `python_backend/runner/validate.py`;\
    \ never hand-edited. A `static-only` family and an unemitted family are recorded\
    \ as such and are never counted as runtime-covered.\",\n\t\"profiles\": [\n\t\t\
    {\n\t\t\t\"profileId\": \"pydantic_v2_basemodel\",\n\t\t\t\"verdict\": \"qualified-with-conditions\"\
    ,\n\t\t\t\"runtimeValidation\": \"validating\",\n\t\t\t\"coverage\": \"runtime\"\
    ,\n\t\t\t\"declaredTypes\": 250,\n\t\t\t\"validatingTypes\": 179,\n\t\t\t\"nonValidatingDeclarations\"\
    : 71,\n\t\t\t\"exercisedTypes\": 73,\n\t\t\t\"unexercisedValidatingTypes\": 106,\n\
    \t\t\t\"constraintsE"
- id: tests/test_conformance_corpus.py
  path: tests/test_conformance_corpus.py
  role: examined
  excerpt: "\"\"\"Issue #20 \u2014 the Python half of the conformance gate (TC-642,\
    \ NFR-016-AC-3).\n\nThe corpus is language-neutral JSON. This suite reads it with\
    \ the already\npinned `jsonschema` and asserts, in a second language and a second\
    \ JSON Schema\nimplementation, the properties that must not depend on the oracle's\
    \ own\nruntime: every case and base validates, every provenance quote still occurs,\n\
    every diagnostic is a published diagnostic, and every\nexpected pointer addresses\
    \ a node the built bundle carries.\n\nIt adds no dependency and opens no network\
    \ connection"
- id: tests/test_python_backend_adapter.py
  path: tests/test_python_backend_adapter.py
  role: examined
  excerpt: "\"\"\"Issue #23 \u2014 profiles, preparation, and guards (FR-073..FR-075,\
    \ TC-854..882).\n\nTrace ids live in each test's own docstring; see the note in\n\
    `tests/test_python_backend_toolchain.py`.\n\"\"\"\n\nfrom __future__ import annotations\n\
    \nimport json\nimport pathlib\nimport re\nimport sys\nfrom typing import Any\n\
    \nimport pytest\n\nREPO = pathlib.Path(__file__).resolve().parents[1]\nsys.path.insert(0,\
    \ str(REPO))\n\nfrom python_backend.adapter import guard, prepare, profiles  #\
    \ noqa: E402\n\nPUBLISHED = sorted((REPO / \"schema\" / \"semantic\" / \"v1\"\
    ).glob(\"*.schema.json\"))\nS"
- id: tests/test_python_backend_qualification.py
  path: tests/test_python_backend_qualification.py
  role: examined
  excerpt: "\"\"\"Issue #23 \u2014 the qualification, the layout, and the validation\n\
    (FR-077, FR-079, FR-080, TC-895..907, TC-918..935).\n\nTrace ids live in each\
    \ test's own docstring; see the note in\n`tests/test_python_backend_toolchain.py`.\n\
    \"\"\"\n\nfrom __future__ import annotations\n\nimport json\nimport pathlib\n\
    import subprocess\nimport sys\nimport tomllib\nfrom typing import Any\n\nimport\
    \ pytest\n\nREPO = pathlib.Path(__file__).resolve().parents[1]\nsys.path.insert(0,\
    \ str(REPO))\n\nfrom python_backend.adapter import prepare, profiles  # noqa:\
    \ E402\nfrom python_backend.runner im"
- id: tests/test_semantic_kernel.py
  path: tests/test_semantic_kernel.py
  role: examined
  excerpt: "\"\"\"The Python kernel target (issue #11, FR-087).\n\nThe issue #23 route\
    \ is reached by import and edited nowhere. Exactly one\ncomponent is new \u2014\
    \ the pure reference localization of\n`python_backend/kernel/localize.py` \u2014\
    \ and these tests exist to hold that line:\nthe guard is unmodified and unassisted,\
    \ the refusal register is closed, the\nprofiles are frozen, and the repair is\
    \ in the input.\n\nTwo measured findings are pinned here rather than silenced.\
    \ F1\n(`agent-ix/filament-core-data#79`) is a `StrEnum` member that shadows a\
    \ `str`\nmethod; F2 (`agent-ix/f"
- id: FR-074-CON-2
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: The maintainer SHALL NOT add a rewrite that removes a constraint to make
    a family pass; a family that cannot carry a constraint is a verdict, not a rewrite.
- id: FR-074-AC-8
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: Over the thirteen published documents, the prepared set carries the same
    multiset of constraint keywords as the input set and the same set of `$ref` values,
    with only the declared rewrites as differences.
- id: FR-080-AC-4
  path: spec/functional/FR-080-type-check-and-validate-generated-python.md
  role: examined
  excerpt: For each constraint a demonstrated family retains, a non-conforming value
    is rejected by that family's runtime, naming the constraint.
```

## Dispositions (round 3)

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-010 | fixed | ede23b0e4d3b0d4a007147630fcf89efe21b40d6 |

## Disposition evidence (round 3)

**PASS for PR traceability delta; FAIL for whole-repository inherited traceability.**

Exact frozen review: 70aab4dde9b6dafd8a79ce2072d1d4a02158cc1d, GitHub and clean worktree confirmed; base c620d6be99654a7a77f0ecc2f97d3c7136402651. All 29 changed files scoped and inspected. The final commit changes formatting only. No repository edits, push, merge, workflow edits or extra agents. Python code review, gap analysis, base spec review and EARS apply; no Rust, React, changed structure/dependency/object lens applies. No applicable AssuranceProfile found. Existing function-based test idiom retained. No new source stub, internal mock, lowered coverage threshold or generated-source patching found.

The existing canonical log /tmp/age2230-pr-final.log is explicitly for predecessor 5318cb90281a86050a9ce1dbaef27c6946f6d8ec, not an exact-head gate. It records Python 516 passed / 1 inherited TC-1059 failure, a Node legacy-avro-retirement failure caused by files=['package.json'], inherited Rust registry/clippy failures, and local formatting/Ruff failures. The final formatting-only diff addresses each shown local formatting/Ruff location without behavioral edits, but cannot repair the legacy-avro assertion. No new runtime build was launched and no exact-head canonical gate pass is claimed.

Source review verifies the new schema transform preserves bounds by copying the original branches, intersects the existing scale maximum, requires disjoint exhaustive integer precision tags, and declines ambiguous predicates. Published schema and workflow files have no diff. Generated backend Scalar carries float32/float64, kernel DecimalPolicy has maximum 38, and generated bounds/types agree with the owned source. The Makefile selects the same repository-local Poetry environment for Node and Python lanes. Qualification records explicitly retain the numeric relation for three validating families and record the two static families' loss.

Fresh Quire matrix computed successfully on this exact head: 2155 obligations; 1559 untagged, 379 method-without-symbol, 213 tagged, 4 tagged-by-ignored-test. FR-074-AC-8 and CON-2 bind both preparation tests; FR-080-AC-4 binds the runtime rejection test. Compared with the earlier b43ed2 matrix, exactly those three previously untagged obligations become tagged; no status regresses. Whole-repository gap verdict remains FAIL for inherited trace debt. PR delta has no new trace gap. This is not a repository assurance pass. Plan completion: not assessed. Optional semantic gap pass was not requested and was not run.

FR-074 validation exit 0. Amended permission, fidelity, rewrite-record and unsupported-shape statements are atomic and observable; AC-8 names its allowed exception. No changed dependency edges or object definitions. The rewrite record is a functional generation result, not new file-tracking machinery. Quire emits the existing duplicate module/archetype/inverse-edge and inline-data-schema warnings; output is available and no fallback binary was used.

## Final examined scope

```yaml
scope:
- id: spec/functional/FR-074-prepare-schema-for-python-generation.md
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: '- When a `decimalPolicy` object carries an exhaustive integer `precision`
    range and one `if`/`then` scale bound for each value in that range, the pass MAY
    replace that object''s conditional `allOf` with an equivalent `oneOf` of object
    branches.

    - Each branch of that declared rewrite SHALL copy the original object shape and
    bounds, adding only its precision tag and corresponding scale maximum.

    - The pass SHALL record the declared rewrite as `conditional-numeric-to-one-of`.

    - A partial, non-integer, extra-predicate, or otherwise ambiguous set of clauses
    SHALL remain unchanged.'
- id: FR-074-AC-8
  path: spec/functional/FR-074-prepare-schema-for-python-generation.md
  role: examined
  excerpt: Over the thirteen published documents, the prepared set carries the same
    multiset of constraint keywords as the input set and the same set of `$ref` values,
    with only the declared rewrites (including the equivalent `decimalPolicy` conditional-to-`oneOf`
    relation) as differences.
- id: Makefile
  path: Makefile
  role: examined
  excerpt: '# =============================================================================

    # filament-core-data Makefile

    # =============================================================================

    # Delegates to pnpm scripts. The agent-ix/nodejs-actions reusable CI/release

    # workflows drive `make install`, `make lint`, `make test`, `make build`.

    # =============================================================================


    # Keep every Poetry-backed lane on the same repository-local environment. This

    # prevents the Python adapter launched by the Node matrix from resolving a

    # different interpreter '
- id: package.json
  path: package.json
  role: examined
  excerpt: "{\n\t\"name\": \"@agent-ix/filament-core-data\",\n\t\"version\": \"0.1.0\"\
    ,\n\t\"description\": \"Semantic contract compiler and generated kernel packages\
    \ for Agent IX.\",\n\t\"author\": \"Agent IX\",\n\t\"license\": \"AGPL-3.0-or-later\"\
    ,\n\t\"private\": true,\n\t\"type\": \"module\",\n\t\"packageManager\": \"pnpm@10.33.4\"\
    ,\n\t\"scripts\": {\n\t\t\"build\": \"tsc -p tsconfig.build.json\",\n\t\t\"test\"\
    : \"vitest run\",\n\t\t\"typecheck\": \"tsc --noEmit -p tsconfig.json\",\n\t\t\
    \"lint\": \"biome format . && tsc --noEmit -p tsconfig.json && node scripts/build-compatibility-cases.mjs\
    \ --check && node scripts/build-compiler-docs.mjs --check\",\n\t\t\"format\":\
    \ \"biome format --"
- id: packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py
  path: packages/semantic-kernel/examples/python/pydantic_v2_basemodel.py
  role: examined
  excerpt: "\"\"\"An ordinary consumer of the kernel `pydantic_v2_basemodel` package\
    \ (FR-089).\n\nImports the generated package, the standard library and the family's\
    \ runtime,\nand nothing else. The caller puts `packages/semantic-kernel` on the\
    \ path and\nthe tree imports as `python.<profile-id>` \u2014 that is the only\
    \ accommodation an\nordinary consumer makes, and it is the one any unpublished\
    \ tree requires.\nPublication passes `agent-ix/quoin#290`.\n\"\"\"\n\nfrom __future__\
    \ import annotations\n\nfrom typing import Any\n\nfrom pydantic import ValidationError\n\
    from python.pydantic_v2_basemodel.FieldDecl import FieldDecl\nfrom pyt"
- id: packages/semantic-kernel/examples/python/pydantic_v2_dataclass.py
  path: packages/semantic-kernel/examples/python/pydantic_v2_dataclass.py
  role: examined
  excerpt: '"""An ordinary consumer of the kernel `pydantic_v2_dataclass` package
    (FR-089).


    Imports the generated package, the standard library and the family''s runtime,

    and nothing else. The caller puts `packages/semantic-kernel` on the path and

    the tree imports as `python.<profile-id>`. Publication passes

    `agent-ix/quoin#290`.

    """


    from __future__ import annotations


    from typing import Any


    from pydantic import TypeAdapter, ValidationError


    from python.pydantic_v2_dataclass.FieldDecl import FieldDecl

    from python.pydantic_v2_dataclass.SourceLocus import SourceLocus


    FIELD: TypeAdapter[FieldDecl] = TypeA'
- id: packages/semantic-kernel/python/NOT-QUALIFIED.md
  path: packages/semantic-kernel/python/NOT-QUALIFIED.md
  role: examined
  excerpt: "# Families with no emitted kernel package\n\nThese families were declared,\
    \ measured, and judged. The absence of a\npackage is a recorded decision, not\
    \ an omission, and the verdict is\nnever re-run with an altered probe set in order\
    \ to emit one.\n\n## `stdlib_dataclass` \u2014 not-qualified\n\nOutput family:\
    \ `dataclasses.dataclass`.\n\nConstructs it loses:\n\n- `alias`\n- `closure-additional`\n\
    - `closure-unevaluated`\n- `constraints-array-unique`\n- `constraints-decimal-policy`\n\
    - `constraints-numeric`\n- `constraints-string`\n- `description`\n- `map-additional`\n\
    - `map-pattern`\n- `string-format`\n- `union-discriminated`"
- id: packages/semantic-kernel/python/msgspec_struct/DecimalPolicy.py
  path: packages/semantic-kernel/python/msgspec_struct/DecimalPolicy.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  DecimalPolicy.json\n\
    \nfrom __future__ import annotations\n\nfrom typing import Annotated\n\nfrom msgspec\
    \ import Meta, Struct\n\n\nclass DecimalPolicy(Struct):\n    precision: Annotated[int,\
    \ Meta(ge=1, le=38)]\n    scale: Annotated[int, Meta(ge=0, le=38)]\n"
- id: packages/semantic-kernel/python/msgspec_struct/KernelScalar.py
  path: packages/semantic-kernel/python/msgspec_struct/KernelScalar.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  KernelScalar.json\n\n\
    from __future__ import annotations\n\nfrom enum import StrEnum\n\n\nclass KernelScalar(StrEnum):\n\
    \    UUID = 'UUID'\n    Boolean = 'Boolean'\n    Integer = 'Integer'\n    Decimal\
    \ = 'Decimal'\n    Float32 = 'Float32'\n    Float64 = 'Float64'\n    String =\
    \ 'String'\n    Timestamp = 'Timestamp'\n    Duration = 'Duration'\n    Bytes\
    \ = 'Bytes'\n    JsonObject = 'JsonObject'\n"
- id: packages/semantic-kernel/python/pydantic_v2_basemodel/DecimalPolicy.py
  path: packages/semantic-kernel/python/pydantic_v2_basemodel/DecimalPolicy.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  DecimalPolicy.json\n\
    \nfrom __future__ import annotations\n\nfrom typing import Annotated\n\nfrom pydantic\
    \ import BaseModel, ConfigDict, Field\n\n\nclass DecimalPolicy(BaseModel):\n \
    \   model_config = ConfigDict(\n        extra='forbid',\n    )\n    precision:\
    \ Annotated[int, Field(ge=1, le=38)]\n    scale: Annotated[int, Field(ge=0, le=38)]\n"
- id: packages/semantic-kernel/python/pydantic_v2_basemodel/KernelScalar.py
  path: packages/semantic-kernel/python/pydantic_v2_basemodel/KernelScalar.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  KernelScalar.json\n\n\
    from __future__ import annotations\n\nfrom enum import StrEnum\n\n\nclass KernelScalar(StrEnum):\n\
    \    UUID = 'UUID'\n    Boolean = 'Boolean'\n    Integer = 'Integer'\n    Decimal\
    \ = 'Decimal'\n    Float32 = 'Float32'\n    Float64 = 'Float64'\n    String =\
    \ 'String'\n    Timestamp = 'Timestamp'\n    Duration = 'Duration'\n    Bytes\
    \ = 'Bytes'\n    JsonObject = 'JsonObject'\n"
- id: packages/semantic-kernel/python/pydantic_v2_dataclass/DecimalPolicy.py
  path: packages/semantic-kernel/python/pydantic_v2_dataclass/DecimalPolicy.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  DecimalPolicy.json\n\
    \nfrom __future__ import annotations\n\nfrom typing import Annotated\n\nfrom pydantic\
    \ import ConfigDict, Field\nfrom pydantic.dataclasses import dataclass\n\n\n@dataclass(config=ConfigDict(extra='forbid'))\n\
    class DecimalPolicy:\n    precision: Annotated[int, Field(ge=1, le=38)]\n    scale:\
    \ Annotated[int, Field(ge=0, le=38)]\n"
- id: packages/semantic-kernel/python/pydantic_v2_dataclass/KernelScalar.py
  path: packages/semantic-kernel/python/pydantic_v2_dataclass/KernelScalar.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  KernelScalar.json\n\n\
    from __future__ import annotations\n\nfrom enum import StrEnum\n\n\nclass KernelScalar(StrEnum):\n\
    \    UUID = 'UUID'\n    Boolean = 'Boolean'\n    Integer = 'Integer'\n    Decimal\
    \ = 'Decimal'\n    Float32 = 'Float32'\n    Float64 = 'Float64'\n    String =\
    \ 'String'\n    Timestamp = 'Timestamp'\n    Duration = 'Duration'\n    Bytes\
    \ = 'Bytes'\n    JsonObject = 'JsonObject'\n"
- id: python_backend/adapter/prepare.py
  path: python_backend/adapter/prepare.py
  role: examined
  excerpt: '"""The owned schema preparation pass (FR-074).


    One rewrite, measured rather than assumed. The official TypeSpec JSON Schema

    emitter states a sealed model with `unevaluatedProperties`, usually as the

    always-false schema `{"not": {}}`. The pinned generator reads neither: measured

    against it, `unevaluatedProperties: {"not": {}}` produces `extra=''allow''`

    in both Pydantic families and no `closed=True` in `TypedDict`, while

    `additionalProperties: false` produces `extra=''forbid''` and `closed=True`. Every

    sealed contract type would otherwise generate as an open Python model, in every

    family, silently'
- id: python_backend/generated/NOT-QUALIFIED.md
  path: python_backend/generated/NOT-QUALIFIED.md
  role: examined
  excerpt: "# Families with no emitted package\n\nThese families were declared, measured,\
    \ and judged. The absence of a\npackage is a recorded decision, not an omission.\n\
    \n## `stdlib_dataclass` \u2014 not-qualified\n\nOutput family: `dataclasses.dataclass`.\n\
    \nConstructs it loses:\n\n- `alias`\n- `closure-additional`\n- `closure-unevaluated`\n\
    - `constraints-array-unique`\n- `constraints-decimal-policy`\n- `constraints-numeric`\n\
    - `constraints-string`\n- `description`\n- `map-additional`\n- `map-pattern`\n\
    - `string-format`\n- `union-discriminated`\n\n## `typed_dict` \u2014 not-qualified\n\
    \nOutput family: `typing.TypedDict`.\n\nConstructs it lo"
- id: python_backend/generated/msgspec_struct/__init__.py
  path: python_backend/generated/msgspec_struct/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, TextProfile,
    UnknownPolicy

    from .compatibility_report'
- id: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  path: python_backend/generated/msgspec_struct/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom msgspec import UNSET, Meta, Struct, UnsetType,\
    \ field\n\nfrom . import common_schema\n\n\nclass ContractVersion(Enum):\n   \
    \ field_2_0_0 = '2.0.0'\n\n\nclass Package(Struct):\n    identity: common_schema.PackageIdentity\n\
    \    lockDigest: common_schema.Sha256\n    manifestDigest: common_schema.Sha256\n\
    \    mappingVersions: list[common_schema.Semver]\n    profileVersions: list[common_schema.Semver]\n\
    \    version: common_schema.Semver\n\n\nc"
- id: python_backend/generated/pydantic_v2_basemodel/__init__.py
  path: python_backend/generated/pydantic_v2_basemodel/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, TextProfile,
    UnknownPolicy

    from .compatibility_report'
- id: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom pydantic import AwareDatetime, BaseModel, ConfigDict,\
    \ Field, RootModel\nfrom typing_extensions import TypeAliasType\n\nfrom . import\
    \ common_schema\n\n\nclass ContractVersion(Enum):\n    field_2_0_0 = '2.0.0'\n\
    \n\nclass Package(BaseModel):\n    model_config = ConfigDict(\n        extra='forbid',\n\
    \    )\n    identity: common_schema.PackageIdentity\n    lockDigest: common_schema.Sha256\n\
    \    manifestDigest: common_schema.Sha256\n    map"
- id: python_backend/generated/pydantic_v2_dataclass/__init__.py
  path: python_backend/generated/pydantic_v2_dataclass/__init__.py
  role: examined
  excerpt: '"""Generated package. Do not edit: regenerate with

    `poetry run python -m python_backend.runner.emit`.


    `__all__` carries every type name exactly one module declares. Names

    several modules declare are different types that happen to share a

    local name; they are reachable as `<module>.<Name>`."""


    from .common_schema import Diagnostic, Extension, FilamentSemanticContractCommonTypesV1,
    FrontendDialect, GeneratedOrigin, ManifestTarget, Origin, Origin1, Origin2, PackageIdentity,
    RepresentationFormat, ResultState, SemanticIdentity, Semver, Sha256, TextProfile,
    UnknownPolicy

    from .compatibility_report'
- id: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  path: python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py
  role: examined
  excerpt: "# generated by datamodel-codegen:\n#   filename:  semantic-ir.schema.json\n\
    \nfrom __future__ import annotations\n\nfrom enum import Enum\nfrom typing import\
    \ Annotated, Any, Literal\n\nfrom pydantic import AwareDatetime, ConfigDict, Field\n\
    from pydantic.dataclasses import dataclass\n\nfrom . import common_schema\n\n\n\
    class ContractVersion(Enum):\n    field_2_0_0 = '2.0.0'\n\n\n@dataclass(config=ConfigDict(extra='forbid'))\n\
    class Package:\n    identity: common_schema.PackageIdentity\n    lockDigest: common_schema.Sha256\n\
    \    manifestDigest: common_schema.Sha256\n    mappingVersions: list[common_schema.Semver]\n\
    \    prof"
- id: python_backend/kernel/emit.py
  path: python_backend/kernel/emit.py
  role: examined
  excerpt: "\"\"\"The kernel Python emit driver (FR-087).\n\nThis orchestrates a measured\
    \ route; it does not build a second one. The issue\n#23 pipeline \u2014 the pinned\
    \ MIT `datamodel-code-generator`, the\nimmutable profiles, the closed refusal\
    \ register, the sandboxed runner, the\n`enforce`-mode inspection and the byte-compared\
    \ emitter \u2014 is reached by import\nand edited nowhere. Exactly one component\
    \ is new: the pure reference\nlocalization of `python_backend/kernel/localize.py`,\
    \ which rewrites the *input*\nso the existing guard admits it unmodified.\n\n\
    The pipeline, in order, because the order is the property:\n\n    read"
- id: python_backend/qualification/gaps.json
  path: python_backend/qualification/gaps.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. One row per construct and affected\
    \ family. A construct measured as lost with no row here fails the gate; removing\
    \ a row fails the gate. No row may dispose a gap to a hand-written generator absent\
    \ a recorded reviewed P0 decision.\",\n\t\"gaps\": [\n\t\t{\n\t\t\t\"construct\"\
    : \"array uniqueItems\",\n\t\t\t\"probe\": \"constraints-array-unique\",\n\t\t\
    \t\"family\": \"pydantic_v2_basemodel\",\n\t\t\t\"severity\": \"medium\",\n\t\t\
    \t\"closableByPreparation\": false,\n\t\t\t\"disposition\": \"recorded; the pinned\
    \ generator does not carry this construct into this family and no schema rewrite\
    \ can add it. Upstream is t"
- id: python_backend/qualification/probes/constraints-decimal-policy.json
  path: python_backend/qualification/probes/constraints-decimal-policy.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. Cross-property numeric conditions\
    \ must survive generation.\",\n\t\"id\": \"constraints-decimal-policy\",\n\t\"\
    construct\": \"decimal precision and scale condition\",\n\t\"note\": \"Scale must\
    \ not exceed precision when both properties are present.\",\n\t\"detector\": {\n\
    \t\t\"kind\": \"regex\",\n\t\t\"pattern\": \"(?s)(?:(?=.*Literal\\\\[1\\\\])(?=.*le=1)|(?=.*tag=1)(?=.*Meta\\\
    \\(.*le=1))\"\n\t},\n\t\"schema\": {\n\t\t\"$defs\": {\n\t\t\t\"decimalPolicy\"\
    : {\n\t\t\t\t\"type\": \"object\",\n\t\t\t\t\"title\": \"DecimalPolicy\",\n\t\t\
    \t\t\"required\": [\"precision\", \"scale\"],\n\t\t\t\t\"properties\": {\n\t\t\
    \t\t\t\"precision\": {\n\t\t\t\t\t\t\"type\": \"integer\",\n\t\t\t\t\t\t"
- id: python_backend/qualification/report.json
  path: python_backend/qualification/report.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-077. Generated by `python_backend/runner/qualify.py`;\
    \ never hand-edited.\",\n\t\"verdicts\": [\n\t\t{\n\t\t\t\"profileId\": \"pydantic_v2_basemodel\"\
    ,\n\t\t\t\"outputModelType\": \"pydantic_v2.BaseModel\",\n\t\t\t\"runtimeValidation\"\
    : \"validating\",\n\t\t\t\"verdict\": \"qualified-with-conditions\",\n\t\t\t\"\
    retained\": [\n\t\t\t\t\"alias\",\n\t\t\t\t\"closure-additional\",\n\t\t\t\t\"\
    closure-unevaluated\",\n\t\t\t\t\"const\",\n\t\t\t\t\"constraints-decimal-policy\"\
    ,\n\t\t\t\t\"constraints-numeric\",\n\t\t\t\t\"constraints-string\",\n\t\t\t\t\
    \"default-non-nullable\",\n\t\t\t\t\"description\",\n\t\t\t\t\"enum\",\n\t\t\t\
    \t\"map-additional\",\n\t\t\t\t\"map-pattern\",\n\t\t\t\t\"optional-vs-null\"\
    ,\n"
- id: python_backend/qualification/validation.json
  path: python_backend/qualification/validation.json
  role: examined
  excerpt: "{\n\t\"$comment\": \"Issue #23, FR-080. Generated by `python_backend/runner/validate.py`;\
    \ never hand-edited. A `static-only` family and an unemitted family are recorded\
    \ as such and are never counted as runtime-covered.\",\n\t\"profiles\": [\n\t\t\
    {\n\t\t\t\"profileId\": \"pydantic_v2_basemodel\",\n\t\t\t\"verdict\": \"qualified-with-conditions\"\
    ,\n\t\t\t\"runtimeValidation\": \"validating\",\n\t\t\t\"coverage\": \"runtime\"\
    ,\n\t\t\t\"declaredTypes\": 250,\n\t\t\t\"validatingTypes\": 179,\n\t\t\t\"nonValidatingDeclarations\"\
    : 71,\n\t\t\t\"exercisedTypes\": 73,\n\t\t\t\"unexercisedValidatingTypes\": 106,\n\
    \t\t\t\"constraintsExercised\": 303,\n\t\t\t\"typesRejectingAnEmptyOrUndecla"
- id: tests/test_conformance_corpus.py
  path: tests/test_conformance_corpus.py
  role: examined
  excerpt: "\"\"\"Issue #20 \u2014 the Python half of the conformance gate (TC-642,\
    \ NFR-016-AC-3).\n\nThe corpus is language-neutral JSON. This suite reads it with\
    \ the already\npinned `jsonschema` and asserts, in a second language and a second\
    \ JSON Schema\nimplementation, the properties that must not depend on the oracle's\
    \ own\nruntime: every case and base validates, every provenance quote still occurs,\n\
    every diagnostic is a published diagnostic, and every\nexpected pointer addresses\
    \ a node the built bundle carries.\n\nIt adds no dependency and opens no network\
    \ connection.\n\"\"\"\n\nfrom __future__ import annotations\n\nimport "
- id: tests/test_python_backend_adapter.py
  path: tests/test_python_backend_adapter.py
  role: examined
  excerpt: "\"\"\"Issue #23 \u2014 profiles, preparation, and guards (FR-073..FR-075,\
    \ TC-854..882).\n\nTrace ids live in each test's own docstring; see the note in\n\
    `tests/test_python_backend_toolchain.py`.\n\"\"\"\n\nfrom __future__ import annotations\n\
    \nimport copy\nimport json\nimport pathlib\nimport re\nimport sys\nfrom typing\
    \ import Any\n\nimport pytest\n\nREPO = pathlib.Path(__file__).resolve().parents[1]\n\
    sys.path.insert(0, str(REPO))\n\nfrom python_backend.adapter import guard, prepare,\
    \ profiles  # noqa: E402\n\nPUBLISHED = sorted((REPO / \"schema\" / \"semantic\"\
    \ / \"v1\").glob(\"*.schema.json\"))\nSPIKE = (\n    REPO\n    / \"spikes\"\n\
    \    /"
- id: tests/test_python_backend_qualification.py
  path: tests/test_python_backend_qualification.py
  role: examined
  excerpt: "\"\"\"Issue #23 \u2014 the qualification, the layout, and the validation\n\
    (FR-077, FR-079, FR-080, TC-895..907, TC-918..935).\n\nTrace ids live in each\
    \ test's own docstring; see the note in\n`tests/test_python_backend_toolchain.py`.\n\
    \"\"\"\n\nfrom __future__ import annotations\n\nimport json\nimport pathlib\n\
    import subprocess\nimport sys\nimport tomllib\nfrom typing import Any\n\nimport\
    \ pytest\n\nREPO = pathlib.Path(__file__).resolve().parents[1]\nsys.path.insert(0,\
    \ str(REPO))\n\nfrom python_backend.adapter import prepare, profiles  # noqa:\
    \ E402\nfrom python_backend.runner import emit, qualify, validate  # noqa: E402\n\
    from py"
- id: tests/test_semantic_kernel.py
  path: tests/test_semantic_kernel.py
  role: examined
  excerpt: "\"\"\"The Python kernel target (issue #11, FR-087).\n\nThe issue #23 route\
    \ is reached by import and edited nowhere. Exactly one\ncomponent is new \u2014\
    \ the pure reference localization of\n`python_backend/kernel/localize.py` \u2014\
    \ and these tests exist to hold that line:\nthe guard is unmodified and unassisted,\
    \ the refusal register is closed, the\nprofiles are frozen, and the repair is\
    \ in the input.\n\nTwo measured findings are pinned here rather than silenced.\
    \ F1\n(`agent-ix/filament-core-data#79`) is a `StrEnum` member that shadows a\
    \ `str`\nmethod; F2 (`agent-ix/filament-core-data#125`) is `msgspec`'s refusal\
    \ of "
```

## Final verdict

PASS for PR delta; FAIL for inherited repository traceability.

Final immutable head 3a5a28054edece086ca240cce77243804a05edd3. The only change after the preceding review is removal of the root files allowlist. package.json now exactly matches c620d6be. Supplied exact-head focused logs show legacy-avro-retirement 1/1, Python adapter 271/271, Ruff and format all exit 0; git diff --check exits 0. Evidence paths: /home/peter/dev/worktrees/logs/age-2230-{legacy-avro,python-adapter,ruff,format}-3a5a2805.log. The manifest comparison at /home/peter/dev/worktrees/logs/age-2230-npm-pack-manifest-vs-c620.json compares 2079 baseline pack paths with 2079 paths for this manifest on the baseline tree, identical with empty differences. That is manifest causality evidence, not a claim the full current pack contents have no legitimate generated-artifact changes.

FND-007 is fixed. FND-001 is explicitly reclassified as inherited baseline debt: restoring the original manifest restores the original pack prohibition failure. FND-002 retains its baseline deferral. No introduced code-review finding remains; PASS for the PR delta, subject to the leader's exact final aggregate new-failure-minus-baseline gate. This is not a full CI or repository assurance PASS.

The matrix and FR-074 validation were freshly run at 70aab4dd; the final diff changes only package.json, so all specification/source/test trace inputs are identical on 3a5a2805. Matrix reuse is stated explicitly. Prior FND-005/006 and gap FND-010 remain fixed by the source and trace fixes already recorded. No new spec, code, or trace change was introduced by this final manifest fix.
