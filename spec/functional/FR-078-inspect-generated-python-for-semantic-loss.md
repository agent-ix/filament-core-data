---
id: FR-078
title: "Inspect generated Python source for silent semantic loss"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "depends_on"
---
# [FR-078] Inspect generated Python source for silent semantic loss

## Description

The repository SHALL inspect every generated Python module and fail generation
when a type degrades to `Any` or to an unconstrained mapping at a position where
the input schema constrained it, accounting for every degradation the schema
itself sanctions rather than merely tolerating it.

## Inputs

- The generated file map from [FR-076](./FR-076-run-python-generation-sandboxed.md)
- The prepared input schema and its `preparation` record

## Outputs

- `python_backend/runner/inspect_source.py` exposing `inspect_generated(files, schema)` returning an `InspectionReport`
- An `InspectionReport` carrying every permissive annotation found, its module, its symbol, its line, and the schema pointer it is attributed to

## Behavior

- The inspection SHALL parse each generated module with the standard library `ast`, importing and executing none of them, because executing generated code to inspect it defeats the purpose of inspecting it.
- The inspection SHALL find every annotation naming `Any`, `object`, `dict[str, Any]`, `Mapping[str, Any]`, `typing.Dict[str, Any]`, and the bare `dict` and `list` forms, at any nesting depth inside an annotation expression.
- The inspection SHALL attribute every such annotation to a schema pointer and classify it `sanctioned` when the schema node at that pointer is genuinely unconstrained — the `true` schema, an empty object schema, an `object` type with neither `properties` nor `additionalProperties` nor `patternProperties`, or an explicitly typeless node — and `degraded` otherwise.
- The inspection SHALL fail generation on a `degraded` classification, naming the module, the symbol, the annotation, and the schema pointer whose constraint was lost.
- The inspection SHALL classify an annotation it cannot attribute to any schema pointer as `unattributed` and fail on it, because an unexplained `Any` is the failure this requirement exists to catch and a permissive default would make the whole inspection decorative.
- The inspection SHALL additionally fail on a generated module that contains an `import` of a module outside the declared allow-list of the standard library, `pydantic`, `msgspec`, and `typing_extensions`, because a schema-driven import is the shape both advisories describe.
- The inspection SHALL additionally fail on any executable statement at module level other than imports, assignments of type aliases, class definitions, and the generator's own `model_rebuild` calls.
- The inspection SHALL report findings deterministically, ordered by module path, then line, then column.
- The `InspectionReport` SHALL carry a census counting the sanctioned, degraded, and unattributed annotations, so a growing permissive surface is visible even when no row fails.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-078-CON-1 | The maintainer SHALL NOT reclassify a `degraded` finding as `sanctioned` to reach green; the schema node decides the classification. | Integrity | Branch diff and gate |
| FR-078-CON-2 | The maintainer SHALL treat the import allow-list as closed, so widening it is a specification amendment citing the construct that needs it. | Security | Gate |
| FR-078-CON-3 | The inspection SHALL NOT execute or import generated code. | Security | Inspection and test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-078-AC-1 | A generated module whose field is annotated `Any` at a position where the schema declares `{"type": "string"}` fails, naming the module, the symbol, and the schema pointer. | Test |
| FR-078-AC-2 | A generated module whose field is annotated `Any` at a position where the schema is the `true` schema is classified `sanctioned` and passes. | Test |
| FR-078-AC-3 | Generating from every published `schema/semantic/v1/*.schema.json` under every declared profile yields zero `degraded` and zero `unattributed` findings, and the sanctioned census equals the number of genuinely unconstrained schema nodes. | Test |
| FR-078-AC-4 | An annotation nested inside `list[...]`, `dict[str, ...]`, and a union is found, not only a top-level one. | Test |
| FR-078-AC-5 | A generated module importing `os` is failed naming the import. | Test |
| FR-078-AC-6 | A generated module containing a module-level call other than `model_rebuild` is failed naming the statement and its line. | Test |
| FR-078-AC-7 | The inspection neither imports nor executes the module under inspection, asserted by instrumenting the import machinery for the duration of the call. | Test |
| FR-078-AC-8 | The report's ordering is stable across two runs over the same files presented in a different order. | Property |
| FR-078-AC-9 | An annotation the inspection cannot attribute to a schema pointer fails rather than passing. | Test |
| FR-078-AC-10 | With the inspection's degraded check reverted, the probe of FR-078-AC-1 passes; with it restored, it fails. | Test |

## Dependencies

- **Upstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md)
- **Downstream**: [FR-079](./FR-079-emit-the-python-package-layout.md), [FR-080](./FR-080-type-check-and-validate-generated-python.md)
