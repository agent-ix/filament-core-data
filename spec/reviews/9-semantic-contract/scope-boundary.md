---
id: SR-023
title: "Scope review of the semantic package and projection contract"
type: SpecReview
analysis: scope-boundary
scope: "US-005, FR-019..026, NFR-008..012"
review_set: all
---
# Scope and boundary review

## Summary

Issue #9 owns normative contract documents, schemas, examples, fixtures, and
contract-verification tests in `filament-core-data`. It does not own a production
compiler, package publication, Quoin registry behavior, module adoption,
consumer cutover, database schema, migration, or retirement of existing Avro
readers. JSON Schema 2020-12 is the proposed structural source; TypeSpec remains
non-authoritative, and Avro remains a compatibility representation.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-037 | low | Ownership is explicit and non-overlapping: compiler, registry, module, runtime-consumer, and database changes remain outside this ticket and require their own gates. | FR-021-AC-6, FR-024-AC-5..6, FR-026-AC-6, NFR-012 |

## Boundary Allocation

| Concern | Owner |
|---|---|
| Semantic IR, package, mapping, profile, and representation contracts | filament-core-data issue #9 |
| Reusable compiler and custom code generation | Separate AGPL compiler epic/repository |
| Quoin package registry, transport, and installation | quoin #293 and #287 |
| Quire parsing and document semantics | quire-rs / Quire modules |
| Runtime consumer adoption and cutover | Each consumer repository under separate gate |
| Physical SQL schema and migration | Owning service under database migration approval |

External inputs are JSON Schema 2020-12, retained issue #4 feasibility evidence,
the current Avro bridge, and the audited module corpus. They are dependencies,
not authorities silently imported into this ticket.
