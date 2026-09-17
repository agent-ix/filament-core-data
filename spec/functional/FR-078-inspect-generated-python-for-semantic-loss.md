---
id: FR-078
title: "Inspect generated Python source for silent semantic loss"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-026"
    type: "depends_on"
---
# [FR-078] Inspect generated Python source for silent semantic loss

## Description

The repository SHALL inspect every generated Python module without executing
it, reporting every permissive annotation with the schema node it came from and
refusing to emit a package whose type degrades to `Any` or to an unconstrained
mapping at a position the input schema constrained.

## Inputs

- The generated file map from [FR-076](./FR-076-run-python-generation-sandboxed.md)
- The prepared input set and its `preparation` record

## Outputs

- `python_backend/runner/inspect_source.py` exposing `inspect_generated(files, documents, mode)` returning an `InspectionReport`
- An `InspectionReport` carrying every permissive annotation found, its module, its symbol, its line, its attributed schema pointer, and its classification

## Behavior

- The inspection SHALL take a `mode` of `report` or `enforce`: `report` classifies and counts without raising and is what [FR-077](./FR-077-qualify-each-python-output-family.md) measures through, `enforce` raises on a `degraded` or `unattributed` finding and is what the emission path of [FR-079](./FR-079-emit-the-python-package-layout.md) runs.
- The inspection SHALL parse each generated module with the standard library `ast`, importing and executing none of them, because executing generated code to inspect it defeats the purpose of inspecting it.
- The inspection SHALL find every annotation naming `Any`, `object`, or a bare `dict` or `list`, and every parameterised `dict` or `Mapping` whose value type is `Any`, at any depth of an annotation expression including inside a union, a `list[...]`, a `dict[...]`, and an `Annotated[...]`.
- The inspection SHALL attribute each finding to a schema node by mapping the enclosing generated symbol to the `$defs` key or `title` the generator derived it from, and the annotated attribute to the property of that node, because the generator preserves both and no option that would carry richer provenance is permitted.
- Where a generated symbol is a de-duplicated or numbered variant of a declared name, the inspection SHALL attribute it to the declared name it varies and record the variant, so the mapping is visible rather than assumed.
- The inspection SHALL classify a finding `sanctioned` when the attributed schema node is genuinely unconstrained — the `true` schema, an empty object schema, an `object` type with none of `properties`, `additionalProperties`, or `patternProperties`, or an explicitly typeless node — and `degraded` otherwise.
- The inspection SHALL treat `x-agent-ix-extensions` as constraining unless every extension it lists is the `kernel-scalar` or `doc` extension, because an extension can carry wire-affecting meaning JSON Schema does not assert.
- The inspection SHALL classify a finding it cannot attribute as `unattributed`.
- In `enforce` mode the inspection SHALL raise on a `degraded` finding, naming the module, the symbol, the annotation, and the attributed schema pointer.
- In `enforce` mode the inspection SHALL raise on an `unattributed` finding, because an unexplained `Any` is the failure this requirement exists to catch and a permissive default would make the whole inspection decorative.
- The inspection SHALL raise in `enforce` mode on a generated module importing a module outside the declared allow-list of the standard library, `pydantic`, `msgspec`, `typing_extensions`, and the generated package's own sibling modules, because a schema-driven import is the shape both advisories describe.
- The inspection SHALL raise in `enforce` mode on any module-level statement other than an import, a type-alias assignment, a class definition, an `__all__` assignment, and the generator's own `model_rebuild` calls.
- The inspection SHALL report findings deterministically, ordered by module path, then line, then column.
- The `InspectionReport` SHALL carry a census counting the sanctioned, degraded, and unattributed findings, so a growing permissive surface is visible even when nothing fails.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-078-CON-1 | The schema node decides the classification; the maintainer SHALL NOT reclassify a `degraded` finding as `sanctioned` to reach green. | Integrity | Test |
| FR-078-CON-2 | The maintainer SHALL treat the import allow-list as closed, so widening it is a specification amendment citing the construct that needs it. | Security | Test |
| FR-078-CON-3 | The inspection SHALL neither execute nor import generated code in either mode. | Security | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-078-AC-1 | In `enforce` mode a module whose attribute is annotated `Any` where the schema declares a string raises, naming the module, the symbol, and the schema pointer. | Test |
| FR-078-AC-2 | Each of the four sanctioned schema shapes yields a `sanctioned` classification and no failure in either mode. | Test |
| FR-078-AC-3 | Generating from the thirteen published documents under every declared profile yields zero `degraded` and zero `unattributed` findings, and every sanctioned finding's attributed pointer names a schema node that is unconstrained by an independent read of the schema. | Integration |
| FR-078-AC-4 | For a generated annotation placed at any depth of a union, a `list[...]`, a `dict[...]`, and an `Annotated[...]`, the finding is reported. | Property |
| FR-078-AC-5 | In `enforce` mode a generated module importing `os` raises naming the import; a module importing a sibling generated module does not. | Test |
| FR-078-AC-6 | In `enforce` mode a module-level call other than `model_rebuild` raises naming the statement and its line. | Test |
| FR-078-AC-7 | Neither mode imports or executes the module under inspection, asserted by instrumenting the import machinery for the duration of the call. | Test |
| FR-078-AC-8 | The report's ordering is identical across two runs over the same files presented in a different order. | Property |
| FR-078-AC-9 | In `enforce` mode an unattributable annotation raises; in `report` mode the same input yields an `unattributed` census entry and no failure. | Test |
| FR-078-AC-10 | With the `degraded` branch of the classifier disabled, the AC-1 probe passes; with it restored, the probe fails — run as a mutation over an injected classifier seam rather than by editing a committed file. | Test |
| FR-078-AC-11 | A de-duplicated or numbered generated symbol is attributed to the declared name it varies, and the variant is recorded in the report. | Test |
| FR-078-AC-12 | In `enforce` mode a `RootModel[Any]` generated from the `json-schema` document of an `any` kernel scalar carrying `x-agent-ix-semantic-id`, `x-agent-ix-origin`, `x-agent-ix-unknown-policy`, and an `x-agent-ix-extensions` list holding only the `kernel-scalar` extension is `sanctioned` and raises nothing; the same document carrying `x-agent-ix-constraints`, or an `x-agent-ix-extensions` list holding any other extension, raises a `degraded` finding. | Test (TC-1770) |

## Dependencies

- **Upstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md), [NFR-026](../non-functional/NFR-026-sandboxed-python-generation.md)
- **Downstream**: [FR-077](./FR-077-qualify-each-python-output-family.md), [FR-079](./FR-079-emit-the-python-package-layout.md), [FR-080](./FR-080-type-check-and-validate-generated-python.md)
