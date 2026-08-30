---
id: ADR-0001
title: "Assign data authority by concern"
type: ADR
status: normative
---
# ADR-0001: Assign data authority by concern

## Context

Agent IX authors durable knowledge in Markdown, persists transactional and
operational occurrences in PostgreSQL and other runtime stores, exchanges data
through JSON and Avro today, and needs generated language, wire, and analytical
representations. Calling any one of these universally canonical confuses edit
authority with transport or presentation convenience.

## Decision

Assign authority per concern using the matrix in [authority.md](../authority.md).
Typed Markdown is authoritative for reviewed human/agent-authored knowledge.
Owning runtime stores are authoritative for transactional and operational
occurrences. Versioned schema packages govern interface conformance. Generated
code, analytics, reports, and UI views are derived and carry provenance.

## Consequences

- A semantic concept can have many representations without multiple authorities
  for the same concern.
- Markdown remains first-class for LLMs and review without forcing every run or
  database row to be authored as a document.
- Imports and bidirectional lenses must declare edit direction and conflict policy.
- A convenient projection cannot silently become authoritative.

## Alternatives considered

- **Markdown universally canonical:** rejected because accumulated runtime state
  and high-volume observations require transactional/operational ownership.
- **Database universally canonical:** rejected because prose, decisions, Git
  review, and LLM-oriented authored knowledge lose first-class status.
- **Schema/wire universally canonical:** rejected because validation and
  transport contracts do not own every lifecycle or presentation concern.

## Compatibility

This narrows Quire's “Markdown is canonical” statement to its typed-document
boundary and preserves current database, Avro, and generated-binding behavior.
No source or consumer changes in issue #8.

## Supersession

Supersedes no prior decision. Any successor must preserve explicit authority and
provenance or explain a compatible replacement.
