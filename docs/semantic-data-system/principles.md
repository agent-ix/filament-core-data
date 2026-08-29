---
id: ARCH-001
title: "Semantic data architecture principles"
status: normative
---
# Semantic data architecture principles

## 1. Model meaning before representation

A domain concept is not its Markdown file, JSON object, database row, Protobuf
message, Arrow batch, or generated Rust struct. Those are representations of a
semantic definition or occurrence. The architecture names the concept,
identity, constraints, relationships, lifecycle, and authority before selecting
a representation.

Concrete domain types remain the normal programming model. This is not a demand
for a universal entity-attribute-value envelope, a single `Document` supertype,
or a single runtime store.

## 2. Authority is concern-specific

Human- and agent-authored durable knowledge is authoritative as typed Markdown.
Transactional and operational occurrences are authoritative in the store owned
by their runtime. Versioned interface packages define payload conformance.
Analytical tables and reports are derived projections with provenance. Generated
types are reproducible artifacts, never an independent authoring source.

See [authority.md](authority.md).

## 3. Text remains first-class

LLMs, humans, code review, Git, and portable tooling benefit from text. Markdown
is therefore a first-class authored and presentation representation, not a
fallback after structured data. Text projections must preserve identity,
provenance, status, and declared loss so they can be analyzed without being
mistaken for a runtime authority.

## 4. One semantic source, many explicit projections

Schema packages declare exports. Build profiles select generation targets.
Mappings describe how a type appears in Markdown, JSON, tables, databases,
messages, or reports. Those are separate choices. Selecting Python output does
not imply decorators; selecting Protobuf does not define PostgreSQL storage;
selecting Markdown does not imply that every runtime occurrence is document-authored.

## 5. Best fit beats universal format

JSON and JSON Schema are portable interchange and validation surfaces. Protobuf
is a compact, strongly typed service boundary when measurement justifies it.
Arrow and Parquet serve columnar analytics and bulk exchange. PostgreSQL owns
transactional state. Avro remains a current compatibility representation until
known consumers pass cutover. CSV and TSV are constrained interchange views.

## 6. Preserve uncertainty and loss

Unknown, stale, unsupported, unavailable, invalid, and lossy states remain
explicit. A transform may not silently coerce them into apparent success. A
derived view cannot become authoritative merely because it is convenient to
query or render.

## 7. Generated packages stay framework-neutral

Generated Rust, TypeScript, Python, and JSON Schema packages contain semantic
contracts, validators, codecs, and metadata. UI components, ORM models, Tauri
commands, persistence migrations, network clients, and application policy are
consumer adapters outside those packages.

## 8. Compatibility precedes replacement

Readers move before writers. Changes remain additive while old consumers exist.
Every database, publication, enforcement, and retirement action has a human
go-or-hold gate, retained evidence, and rollback path. A high failure rate pauses
promotion; it does not automatically weaken the intended contract.

## 9. Dynamic and static ecosystems coexist

Quire and Quoin can discover open module vocabularies at runtime. Generated
language packages are finite and versioned at build time. A dynamic extension
that is unknown to a static consumer remains an explicit unknown extension; it
does not corrupt the shared kernel or require every consumer to regenerate
immediately.

## 10. Durable decisions outlive conversations

Normative choices, provisional mechanisms, conflicts, supersession, and gates
live in this indexed record. Chat history and issue discussion may explain how a
decision emerged but are never required to interpret it.
