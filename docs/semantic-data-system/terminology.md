---
id: ARCH-002
title: "Semantic data terminology"
status: normative
---
# Semantic data terminology

| Term | Meaning |
|---|---|
| Semantic definition | A versioned declaration of a type, constraint, relationship, process, event, or policy. |
| Occurrence | A concrete event, run, result, record, observation, or authored artifact that conforms to a semantic definition. |
| Artifact | A durable authored unit, commonly typed Markdown, that may carry one or more semantic definitions or report occurrences. |
| Authority | The representation and owner whose accepted change controls a concern. |
| Derived representation | Reproducible output whose meaning is controlled elsewhere. It is not independently editable as authority. |
| Projection | A purpose-specific derived view that may select, aggregate, reorder, enrich, or intentionally lose information. |
| Codec | A reversible encoding/decoding operation within a declared preservation level. |
| Lens | A bidirectional view with explicit get/put laws and a declared edit direction. |
| Mapping | Declarative correspondence between semantic fields/structures and a representation. |
| Export | The semantic types a package makes available. |
| Target | A generated language, schema, wire, storage, or analytical output. |
| Profile | A named set of exports, targets, mappings, compatibility, and generation options. |
| Materialization | Persisting a projection so it can be queried or transported independently while retaining provenance. |
| Provenance | Source identity/version, target profile/version, mapping version, timestamp, tool version, and declared loss/effects. |
| Compatibility representation | A retained format required by current consumers but not necessarily the future schema-authoring source. |
| Structural kind | How data is shaped, such as entity, value object, event, process, or document. |
| Semantic role | What a value means in a context, independent of structural kind. |
| Data plane | The primary architectural context in which a concept is defined, observed, or presented. |
| Semantic kernel | Small reusable runtime value types shared across module packages. |
| Semantic IR | Compiler-oriented representation of package/type/mapping/profile definitions. It is not the universal runtime domain model. |
| Static consumer | A consumer compiled against a finite package export set. |
| Dynamic consumer | A consumer able to discover module/type definitions at runtime. |

## Preservation levels

| Level | Contract |
|---|---|
| byte-exact | The original bytes round-trip identically. |
| structural | Parsed fields and structure round-trip; formatting may differ. |
| semantic | Meaning and declared identity round-trip; representation detail may differ. |
| projected | A declared subset, aggregation, or enrichment is produced; loss is explicit. |

## Decision labels

The governing labels are defined by the [root index](index.md): normative,
provisional, informative, and historical. “Preferred” is not a decision status;
it must be paired with one of those labels and, when provisional, a resolution
gate.
