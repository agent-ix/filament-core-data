---
id: SR-011
title: "Filament contract census and parity review"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data#10 and audit/filament-contract-census/"
review_set: all
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-009"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-010"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-011"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-012"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-013"
    type: reviews
---
# Filament contract census and parity review

## Summary

**PASS for the read-only evidence baseline; HOLD for disruptive implementation.**
The census is complete and reproducible for its declared scope, preserves all
known uncertainty, and supports the next specification decisions without
authorizing contract, consumer, storage, publication, enforcement, or retirement
changes.

## Scope

This review accepts or rejects the evidence package for
`agent-ix/filament-core-data#10`. It examines the eight repositories, fifteen
contract families, current governed corpus and module pins, named active work,
and repeated semantic concepts in the issue scope. It does not approve a schema,
DTO, database, consumer, publication, enforcement, or retirement change.

The immutable and volatile source boundary is recorded in
[snapshot.json](../audit/filament-contract-census/snapshot.json). The final
source refresh found no committed contract drift. Project 17 and 18 collection
results remain explicitly incomplete because both authenticated CLI queries
reached their 200-item cap.

## Method

The audit used read-only Git source inspection at recorded commits, authenticated
GitHub issue/PR/project queries with access and enumeration metadata, exact file
and line loci, and executable Vitest evidence contracts. It then normalized each
surface into an inventory record; reconciled those records exactly once into a
concept comparison; recorded field/semantic conflicts and missing contracts; and
scored repository and concept impact with an attributable manual method,
rationale, and confidence.

The machine-readable evidence is:

- [inventory.json](../audit/filament-contract-census/inventory.json)
- [parity.json](../audit/filament-contract-census/parity.json)
- [conflicts.json](../audit/filament-contract-census/conflicts.json)
- [missing-contracts.json](../audit/filament-contract-census/missing-contracts.json)
- [impact.json](../audit/filament-contract-census/impact.json)
- [validation.json](../audit/filament-contract-census/validation.json)

## Evidence Summary

The census contains 24 independently owned contract surfaces covering every
in-scope repository and contract family. Eleven concept groups consume those
records exactly once, with 11 explicit conflicts and seven missing or extension
contracts. All eight repository records and all 11 concept-impact records carry
effort, risk, dependencies, migration wave, confidence, rationale, recommendation,
and `approvalStatus: not-approved`.

The principal result is a split model: existing contracts are usually fit for
their own data plane, while shared semantic kernels and explicit projection
mappings are required across planes. A universal DTO or universal Protobuf wire
format would erase rather than solve identity, lifecycle, optionality, authority,
and provenance differences.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-012 | high | Document, Artifact, ObjectType, and Graph names conceal different identity planes, authority, open/closed vocabularies, and provenance; shared kernels plus explicit mappings are required. | `PAR-002`, `CONFLICT-001..005`, `INV-001..006`, `INV-009..015` |
| FND-013 | high | Database entities are representation-local physical contracts. Any alignment requires a separately approved database migration with compatibility and rollback evidence. | `PAR-007`, `CONFLICT-009`, repository impacts for core-service and ide-rs |
| FND-014 | high | Module DSL, registry, catalog, and application configuration have a deliberate ownership split but lack one accepted manifest/package mapping contract. | `PAR-005`, `CONFLICT-008`, `MISSING-006` |
| FND-015 | medium | Current domain-event publication is locally useful but lacks a versioned event envelope and has an unconfirmed consumer set. | `PAR-003`, `CONFLICT-006`, `MISSING-003` |
| FND-016 | medium | The Quire parser shim has the correct authority direction, but exact Python adapter mapping and final compatibility disposition remain open. | `PAR-004`, `CONFLICT-007`, `filament-parser-lib#8` |
| FND-017 | medium | Protobuf is absent but not presently required; NDJSON remains a suitable representation-local transport until a concrete interface supplies stronger constraints. | `PAR-008`, `PAR-010`, `MISSING-001` |
| FND-018 | medium | Arrow/Parquet is a useful future analytical projection only after run/result/evidence identity, provenance, and aggregation semantics stabilize. | `PAR-011`, `MISSING-002`, `filament-core-data#13` |
| FND-019 | low | The pinned `quire-corpus` truth set is fit for complete-graph verification and must not be mistaken for the semantic-module or business-schema corpus. | `PAR-009`, `INV-022` |

## Limitations

The Project 17 and Project 18 collections are incomplete at 200 results. This
leaves ecosystem-wide active-work enumeration **unknown with low confidence**;
named dependencies and all local worktrees were inspected, but absence outside
that set is not inferred. The core-service baseline is medium-confidence because
two pre-existing dirty paths overlap package compatibility and were excluded from
committed contract claims. Quoin is likewise medium-confidence due to isolated
in-flight branches.

Consumer discovery for domain events is incomplete, so compatibility cannot be
claimed. Some generated and runtime contract behavior is evidenced by source
shape rather than observed production traffic. Those limitations are retained as
gates, not converted into optimistic defaults.

## Recommendations

1. Accept this census as the evidence baseline for further specification and
   detailed compiler/IR design.
2. Model shared semantic kernels and explicit data-plane projections; preserve
   physical persistence, UI, transport, and analytical contracts as owned views.
3. Keep Avro as the compatibility bridge while the language-neutral schema/IR
   gate is evaluated. Select Protobuf only for a concrete wire interface and
   Arrow/Parquet only for a specified analytical projection.
4. Complete the semantic-module corpus review and architecture/manifest decisions
   before package topology or generated adapters become normative.
5. Re-run a complete active-work census and the affected source loci at every
   disruptive implementation gate.

## Release Gate Disposition

**READY for evidence-review acceptance; HOLD for every disruptive promotion.**
The evidence package changes only issue #10 audit/specification/test surfaces and
authorizes no implementation migration.

- **Consumer migration — HOLD:** enumerate consumers, publish adapters and golden
  parity evidence, and obtain affected-owner approval.
- **Database — HOLD:** approve forward/backward migrations, backup/restore,
  mixed-version operation, and rollback evidence per database owner.
- **Wire-format — HOLD:** name the interface and justify JSON/NDJSON, Protobuf, or
  another fit-for-purpose projection with compatibility fixtures.
- **Package publication — HOLD:** settle schema/IR authority, generated surface,
  versioning, registry, provenance, and cross-language golden gates.
- **Enforcement — HOLD:** run corpus and consumer compatibility in advisory mode,
  with a passing threshold and exception policy, before making checks blocking.
- **Legacy retirement — HOLD:** prove caller inventory, read compatibility,
  migration completion, rollback window, and retained historical access.

The stacked architecture PR must be independently reviewed and merged before
this census can be retargeted to `main`. These holds are safety boundaries, not
defects in the audit.

## Acceptance Criteria Disposition

| Issue #10 criterion | Disposition | Evidence |
|---|---|---|
| Every in-scope repository and shared contract family has a disposition. | PASS | `snapshot.json` enumerates 8 repositories/15 families; `inventory.json` and `parity.json` cover every record exactly once. |
| Every finding cites a repository path and source location or generated-schema locus. | PASS | All 24 inventory records contain repository, commit, path, and valid start/end lines; the source-locus test resolves them. |
| Identity, nullability, defaults, version, provenance, ownership, producer, consumers, and lossiness are recorded. | PASS | `inventory.json` preserves each dimension and explicit known/none/not-applicable/unknown/unavailable states. |
| Each repository/concept family has S/M/L/XL effort, risk, dependency, and confidence. | PASS | `impact.json` contains all 8 repositories and 11 concepts with the required fields, rationale, controls, gate, and non-approval status. |

The dependency and safety clauses also pass for audit scope: `quire-rs#385` is
closed against the immutable corpus pin; parser issue #8 is explicitly retained
as an open gate; dynamic-schema issues core-service #1–#4 are reused rather than
duplicated; source collection was read-only; and the sign-off refresh records no
contract-affecting drift.

## Demonstrations

**Repeated concept — Document.** The Avro `CoreDocumentRecord`, Python domain and
SQLModel `Document`, Quire extraction object, Rust persistence/response types,
and TypeScript consumer binding were followed from `INV-001..006` and
`INV-009..015` into `PAR-002` and `CONFLICT-001..005`. String versus UUID and
definition-versus-occurrence identity, JSON-string versus structured frontmatter,
closed versus open kind vocabularies, and different provenance clocks prevent an
equivalence claim. The resulting `split-required` disposition leads to shared
semantic identity plus explicit projections, not replacement of every local type.

**Unconfirmed consumer — DomainEvent.** `INV-007` resolves the publisher source,
`PAR-003` compares its envelope, `CONFLICT-006` records missing event identity and
version/provenance semantics, and `MISSING-003` assigns the extension work. Because
the consumer observation remains unknown, the audit preserves that uncertainty,
marks the change not approved, and closes the consumer-migration gate until an
enumeration and additive bridge exist.
