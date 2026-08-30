---
id: ARCH-003
title: "Concern-specific data authority"
status: normative
---
# Concern-specific data authority

No format is universally canonical. Authority follows the concern and is
separate from whichever projection is easiest to render, transmit, or query.

## Authority matrix

| Concern | Authoritative source | Derived representations | Edit direction | Provenance obligation |
|---|---|---|---|---|
| Human/agent-authored durable knowledge | Reviewed typed Markdown plus its module contract | JSON extraction, graph records, UI views, LLM chunks, reports | Edit Markdown; re-extract derived views | Artifact identity/version, module and archetype versions, extraction tool |
| Schema/package definitions | Accepted schema source plus package metadata | JSON Schema and generated Rust, TypeScript, Python, wire descriptors | Edit accepted source/metadata; regenerate | Package/type identity and version, compiler/emitter versions |
| Transactional application state | Owning PostgreSQL database or explicitly named event store | APIs, reports, analytical tables, Markdown snapshots | Write through owning application transaction | Tenant/aggregate identity, schema version, transaction/event position |
| Operational observations | Owning run/evidence/event store | Dashboards, alerts, reports, Markdown summaries | Append or correct through owning system policy | Run, source, time, tool/config, evidence hash |
| Interface payload conformance | Versioned interface schema package | Protobuf/JSON/Avro payload bytes and client types | Change schema package under compatibility policy | Package/version, message type, codec/profile |
| Analytical datasets | Never independent when derived; source stores remain authoritative | Arrow batches, Parquet files, CSV/TSV exports | Recompute from sources and mapping | Source identities/versions, query/mapping, timestamp, loss/enrichment |
| Generated language code | Never independent; generated from the accepted package source | Compiled libraries and application adapters | Regenerate; do not hand-author contract drift | Source digest, package version, generator version |
| Rendered reports and UI views | Never independent unless explicitly authored as a new artifact | HTML, PDF, Markdown, React views | Change source or declared presentation mapping | Source/run identities, profile, timestamp, declared omissions |

## Two representative cases

For an authored requirement, typed Markdown is authoritative and its JSON,
database index, embeddings, and generated views are derived. Quire validates
and extracts the artifact but does not become the vocabulary owner.

For a verification run, the owning runtime store is authoritative. A Markdown
report is a presentation projection suitable for humans and LLMs. Editing that
report does not mutate or replace the run unless a separately defined import
process validates and records a new occurrence.

## Equivalence is declared, not assumed

- Byte-exact equivalence is required for Quire byte-splice paths and archival
  reproduction where stated.
- Structural equivalence is enough for normalized JSON or Markdown formatting.
- Semantic equivalence permits representation-specific arrangement while
  preserving meaning and identity.
- Projected equivalence intentionally omits or aggregates data and therefore
  requires declared loss and provenance.

## Conflict rule

If two sources appear authoritative for the same concern, promotion stops. The
owner records whether one source is a projection, whether the concerns are
actually distinct, or whether an ADR and migration are required. Last-writer-wins
between independent authorities is not an accepted conflict policy.
