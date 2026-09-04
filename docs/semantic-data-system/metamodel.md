---
id: ARCH-005
title: "Semantic metamodel and data planes"
status: provisional
resolution_gate: "https://github.com/agent-ix/filament-core-data/issues/9"
---
# Semantic metamodel and data planes

The separation in this document is the preferred model for issue #9. Exact
field names, serialization, and compiler APIs remain provisional until that
specification passes. The architectural distinctions below constrain the spike:
they may be refined, but must not be collapsed without a superseding ADR.

## Compiler metamodel

Compiler definitions describe what can be generated and how:

| Definition | Purpose |
|---|---|
| `PackageDefinition` | Package identity, version, dependencies, exports, compatibility, and metadata. |
| `TypeDefinition` | Stable semantic type identity, structural kind, fields/variants, constraints, relationships, and semantic roles. |
| `FieldDefinition` | Stable field identity, name, type expression, presence, default semantics, documentation, and evolution metadata. |
| `MappingDefinition` | Correspondence between semantic structure and a named representation profile. |
| `ProfileDefinition` | Selected exports, targets, mappings, options, and compatibility posture. |
| `TransformationDefinition` | Source/target contracts, preservation level, determinism, purity/effects, failure outcomes, and provenance rules. |

These are compiler inputs and intermediate representation nodes. Application
domain values do not have to carry this metadata in a universal envelope.

## Reusable semantic kernel

The kernel is intentionally small and representation-independent:

- semantic references and version references;
- temporal instants, intervals, and clocks where domain-neutral;
- provenance and evidence references;
- explicit availability, staleness, support, and loss states;
- extensions and annotations with namespaced identity;
- result/outcome shapes that preserve typed failure.

Domain entities, requirements, tests, runs, reports, and events live in module
packages. They can use kernel types but do not inherit one generic entity class.

*Amendment (issue #35, 2026-09-03).* "Small" includes the L3 declaration
grammar: the kernel package `semantic-core` declares what a field, type
reference, constraint, relation, operation, clause reference, and enum value
*is*, plus the closed `KernelScalar` set, and nothing else; its exact
declaration inventory is `packages/semantic-core/inventory.json` and the kernel
scope test fails on any addition outside it. Domain vocabulary (entity,
endpoint, process, requirement, …) stays in module packages that import the
grammar; the other kernel concepts listed above arrive in their own tickets.

## Data planes

| Plane | Primary concepts | Typical authority | Typical projections |
|---|---|---|---|
| Meta | Packages, type definitions, mappings, profiles, compatibility rules | Accepted schema/package source | JSON Schema, language bindings, registry metadata |
| Definition | Requirements, architecture, plans, policy, domain definitions | Typed Markdown or another explicitly owned authoring source | Extracted JSON, graph, search index, LLM text |
| Execution and observation | Runs, events, results, evidence, incidents, measurements | Runtime store or event log | Reports, dashboards, Arrow/Parquet datasets |
| Presentation | Documents, reports, UI views, tables, exports | Usually derived; authored presentation is explicit | Markdown, HTML, PDF, React views, CSV/TSV |

A concept has one primary plane for a given occurrence, but semantic identity is
not the plane. A `VerificationRun` definition belongs to the definition plane;
one executed run belongs to execution/observation; a Markdown run report belongs
to presentation. They are linked objects, not three encodings with identical
authority.

## Orthogonal classifications

Structural kind and semantic role are independent. A record-shaped value can be
an entity, value object, event, command, observation, evidence item, report, or
projection. A semantic role can be applied across structural kinds. Generator
logic must not infer business meaning solely from `record`, `enum`, `array`, or
document layout.

Definitions and occurrences are also independent. A `TestCase` definition is
not a `TestExecution`; an `IncidentType` is not an incident occurrence; a report
is not the observation set it summarizes.

## Identity model

| Identity | Uniqueness and version rule | Must not depend on |
|---|---|---|
| Package identity | Globally namespaced owner/name plus independently evolving semantic version | Registry URL or checkout path |
| Semantic type identity | Package identity plus stable type key; version follows package compatibility policy | Rust/TS/Python identifier, file path, display label |
| Definition identity | Stable authored identifier or UUID within its owning domain plus definition version | Heading position, rendered text, database surrogate key |
| Occurrence identity | Owning runtime/domain key plus occurrence/event version where applicable | Report row number, export filename, current projection location |

Moving an artifact, renaming a display label, reformatting Markdown, changing a
database index, or rendering a new view does not silently change the semantic
identity represented. A genuine identity change is an explicit new definition
or occurrence and carries lineage to its predecessor when relevant.

## Open modules and finite packages

A dynamic consumer may load a previously unknown module, preserve its
namespaced types as generic validated data, and expose plugin behavior. A static
consumer knows a finite generated export set. When it receives an unknown
extension it must preserve, reject, or surface it according to its profile; it
must not misclassify it as a known type.

Core fields needed for routing and provenance stay in the stable kernel. Module
extensions remain namespaced and versioned. Regeneration is required only when
a static consumer elects to use a new module's native types.

## Explicit non-goals

- One universal `SemanticObject` runtime envelope.
- Treating filenames or document headings as global identity.
- Requiring every operational occurrence to be authored in Markdown.
- Making the compiler source itself a database for application state.
- Closing Quire/Quoin's dynamic module ecosystem to only compiled packages.
