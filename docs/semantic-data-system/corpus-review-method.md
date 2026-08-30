---
id: ARCH-010
title: "Semantic type and contract corpus review method"
status: normative
---
# Semantic type and contract corpus review method

The corpus reviews answer how well current types fit this architecture before a
compiler schema or migration is accepted. They are evidence-producing audits,
not broad rewrite tickets.

## Scope accounting

Each review declares:

- every canonical repository in scope and its exact commit;
- every discovered typed artifact, schema, DTO, model, enum, event, database
  table/view, wire descriptor, mapping, and repeated contract family;
- exclusions with owner and reason;
- unavailable repositories or generated outputs as explicit unknowns.

The Filament review is owned by
[filament-core-data#10](https://github.com/agent-ix/filament-core-data/issues/10).
The Quire/Quoin/module review is owned by
[quoin#288](https://github.com/agent-ix/quoin/issues/288).

## Machine-readable inventory

Each item records repository, path/symbol, language/format, declared identity,
kind, role, plane, authority, owner, current consumers, version source, and
evidence location. Repeated shapes are grouped only after semantic equivalence
is inspected; syntax similarity alone is insufficient.

## Type-fit disposition

| Disposition | Meaning |
|---|---|
| Fits | Current type and authority align with the semantic model. |
| Fits with mapping | Semantics align but a representation-specific adapter/mapping is required. |
| Split | One current type conflates multiple semantic concepts, roles, planes, or authorities. |
| Merge | Multiple definitions are semantically identical and should share one owned contract. |
| Preserve compatibility | Current format remains for consumers while a new source/projection is added. |
| Defer | Evidence is incomplete or active feature work makes a decision unsafe. |
| Conflict | Competing authority, identity, or behavior requires an ADR before implementation. |

Every finding cites concrete files/symbols, affected consumers, failure mode,
recommended disposition, confidence, and owning ticket. No aggregate score
substitutes for evidence.

## Impact bands

- **Band 0:** documentation or metadata only.
- **Band 1:** additive schema/package output with no consumer behavior change.
- **Band 2:** consumer adapter/read-path change with retained old representation.
- **Band 3:** writer, persistence, database, or published interface change.
- **Band 4:** destructive cutover or legacy retirement.

Bands 3 and 4 require a separately named rollback path and human promotion gate.

## Completeness and failure behavior

The review reports counts for repositories, files, symbols, declared types,
repeated families, dispositions, unknowns, and exclusions. A high corpus failure
rate pauses or holds promotion. It does not automatically weaken schemas,
discard failed artifacts, or reduce the review denominator.

## Required outputs

- versioned inventory and summary;
- evidence-backed findings;
- type-fit disposition table;
- repository impact map and active-work conflicts;
- proposed ownership/type mappings;
- unresolved unknowns and decisions;
- explicit recommendation for each downstream gate.
