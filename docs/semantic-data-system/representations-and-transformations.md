---
id: ARCH-007
title: "Representations, mappings, and transformations"
status: normative
---
# Representations, mappings, and transformations

## Projection configuration

Projection configuration answers two independent questions:

1. **What is exported and generated?** A profile selects package exports and
   targets such as Rust, TypeScript, Python, JSON Schema, Markdown, or Protobuf.
2. **How is it represented?** Named mappings specify field, section, table,
   column, message-number, or storage correspondence and preservation rules.

Illustrative syntax, not the final schema:

```yaml
package: agent-ix.qa
profile: portable-and-analytics
exports: [TestCase, VerificationRun, Finding]
targets: [rust, typescript, python, json-schema, markdown, protobuf, arrow]
mappings:
  markdown: qa-report-v1
  protobuf: qa-events-v1
  arrow: qa-observations-v1
```

This example is intentionally not a Python decorator. Python receives generated
typed models like other languages; it is not an ambiguous `@schema` authoring
surface.

## Transformation taxonomy

| Transformation | Contract |
|---|---|
| Codec | Encode/decode within a declared byte, structural, or semantic round trip. |
| Lens | Read and possibly update through a view with explicit get/put laws and edit authority. |
| Projection | Select or reshape for a purpose; omitted information is declared. |
| Extraction | Read semantic fields and relationships from an authored or stored representation. |
| Rendering | Produce a presentation view; it does not imply an inverse or become source authority. |
| Aggregation | Combine occurrences with declared grouping, window, and aggregation semantics. |
| Enrichment | Add data from named external sources and record those reads. |
| Materialization | Persist a derived output with version and provenance for reuse. |

## Markdown mappings

Typed Markdown remains a structured text representation rather than an opaque
blob. A mapping may address:

- **frontmatter** for identity, type, versions, status, relationships, and
  machine-oriented scalar metadata;
- **headings** for named semantic sections and hierarchy;
- **prose** for explanation that must remain human- and LLM-readable;
- **tables** for repeated typed rows with stable ID and column semantics;
- lists and fenced blocks when a module contract explicitly maps them.

Quire owns parsing, validation, extraction, and byte-splice operations over
these structures. Rendering a presentation or generating language packages is
outside Quire core.

## Representation decision table

| Representation | Best fit | Explicit non-use |
|---|---|---|
| Markdown | Authored knowledge, durable decisions, reviewable reports, LLM text | High-rate transactional occurrence store or compact service wire |
| JSON / JSON Schema | Portable APIs, dynamic validation, fixtures, LLM/tool exchange | High-volume columnar analytics or compact binary hot path by default |
| PostgreSQL | Transactional state, constraints, joins, operational queries | Canonical authored prose or immutable portable package distribution |
| Protobuf | Measured compact typed RPC/events with controlled evolution | Universal internal object model, authored knowledge, or analytics table |
| Avro | Existing shared compatibility contract and Avro-native streaming boundaries | Assumed future universal source before consumer cutover evidence |
| Arrow | In-memory columnar interchange, vectorized analysis, dataframe boundaries | Transaction processing, human authoring, or long-term storage alone |
| Parquet | Durable compressed analytical datasets and accumulated QA evidence | Low-latency transactional updates or rich authored narrative |
| CSV / TSV | Constrained flat interchange with an external schema/profile | Nested authoritative data, implicit type inference, or lossless round trip |

## Profile contract

Every representation profile states:

- source authority and permitted edit direction;
- preservation level and allowed loss;
- compatibility policy and unknown-field behavior;
- schema/package, target, mapping, and profile versions;
- required provenance and materialization lifetime;
- performance evidence that justifies a specialized format.

## Outcomes and provenance

A transform that cannot satisfy its declared contract returns an explicit
`unsupported`, `invalid`, `unavailable`, or `lossy` outcome. Lossy may be a
successful outcome only when the profile allows it and names the lost fields or
semantics. A failed or partial projection does not become authoritative.

Every materialized projection retains at least:

- source identity and source version;
- target profile and target profile version;
- mapping version and compiler/transformer version;
- transformation timestamp;
- declared preservation level, omissions, enrichments, and outcome;
- external source identities when enrichment reads them.

## Purity and effects

Every transformation definition declares whether it is deterministic, pure, or
effectful. Pure transformations read only their input and configuration.
Effectful transformations identify every external read or write, retry/idempotency
expectation, and evidence boundary in the later runtime specification. A mapping
cannot hide network access, database writes, time dependence, or nondeterminism.
