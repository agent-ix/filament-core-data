---
id: ARCH-CONTRACTS-V1
title: "Semantic contract v1"
status: provisional
resolution_gate: "https://github.com/agent-ix/filament-core-data/issues/9"
---
# Semantic contract v1

This record specifies the portable data contracts proposed by issue #9. It is
executable and suitable for independent implementations. It remains provisional
on issue #9 until its IR fields are frozen. It does not implement a compiler,
publish a package, change a consumer, or alter the current Avro contract.

## Authority and layers

The v1 structural source is TypeSpec, per
[ADR-0005](adr/0005-typespec-structural-source.md). Package metadata, mappings,
build profiles, locks, and compatibility evidence are separate versioned inputs
because a structural type language cannot express all of their concerns. The
TypeSpec frontend normalizes the compiled program and these inputs into
`semantic-ir-v1`. The IR is the versioned compiler exchange boundary, not a
second authoring source. JSON Schema 2020-12 and Protobuf are official-emitter
projections of the TypeSpec source, never authoring sources.

Existing Avro remains a compatibility representation until its reader retirement
gate.
Markdown, JSON, database rows, Protobuf messages, Avro values, Arrow/Parquet
batches, CSV/TSV files, and generated language objects are representations or
projections selected for concrete boundaries.

```text
structural source + package + mappings + profile + lock
                         |
                    semantic IR
                         |
            target or representation contract
                         |
              output manifest + diagnostics
```

## Published schema inventory

All identifiers below are rooted at
`https://schemas.agent-ix.org/filament-core-data/v1/`.

| Schema | Contract |
|---|---|
| `common.schema.json` | SemVer, digests, identities, origins, extensions, diagnostics, and result states |
| `semantic-ir.schema.json` | Source-independent IR envelope, definitions, occurrences, types, fields, constraints, roles, and recursion |
| `package-manifest.schema.json` | Package identity/version, sources, imports, exports, named profiles, targets, and mappings |
| `package-lock.schema.json` | Exact transitive closure, content/source identities, canonicalization, and fingerprint |
| `mapping.schema.json` | Correspondences plus typed codec/lens/projection/extraction/rendering/aggregation/enrichment/materialization behavior |
| `profile.schema.json` | Authority, edit direction, round trip, unknown policy, omissions, enrichment, and lifetime |
| `representation.schema.json` | Markdown, JSON, PostgreSQL, Protobuf, Avro, Arrow/Parquet, CSV, and TSV refinements |
| `compiler-request.schema.json` | Locked compiler input and backend capability boundary |
| `output-manifest.schema.json` | Complete emitted-file inventory, result state, diagnostics, and normalized fingerprint |
| `target-contract.schema.json` | Rust, TypeScript, Python, and JSON Schema API/runtime expectations and backend qualification |
| `compatibility-report.schema.json` | Per-change and aggregate compatibility dispositions, consumers, evidence, and gates |
| `legacy-adapter.schema.json` | Explicit source/target versions, preservation, omissions, diagnostics, and retirement prerequisites |
| `consumer-policy.schema.json` | Dynamic/generated mode and preserve/reject/surface policy over one identity graph |

Positive, negative, compatibility, representation, Markdown, package-graph, and
legacy evidence is published under `fixtures/semantic/v1/`; `1.1.0` golden
documents, `negative/reader-cases.json` (cross-field rules a schema cannot
express), and the `v1-fixture-digests.json` byte baseline sit beside them. A consumer can
validate it using only these files and a JSON Schema 2020-12 implementation.

## Semantic model

The closed structural vocabulary is scalar, record, enum, discriminated union,
alias/newtype, sequence, map, and semantic reference. Structural kind is
orthogonal to namespaced roles such as entity, event, observation, evidence, or
report. This lets one record carry several domain meanings without creating
different incompatible structural kinds.

Package, type, field, variant, constraint, occurrence, mapping, and profile
identities are explicit. Display names, generated identifiers, source paths,
documentation, timestamps, and database revisions never substitute for stable
semantic identity. Definitions and occurrences remain separate.

Fields independently encode required/optional presence, nullable/non-nullable
values, and no/semantic/representation/migration defaults. Constraints retain
their identity, keyword, operands, applicability, diagnostic, and origin.
Recursive references retain graph identity. Open and closed definitions declare
whether unknowns are preserved, rejected, or surfaced; unknowns never become a
known zero value.

### Contract 1.1.0 (issue #34)

Contract `1.1.0` is additive to `1.0.0` and lives in the same schema file,
discriminated by `contractVersion`. A `1.1.0` field carries an explicit
`multiplicity { lower, upper?, ordered?, unique? }` (absent `upper` is
unbounded) from which `presence` is derived, and may carry a UCUM `unit` when
its `typeRef` resolves, through aliases, to a scalar. The normalized
serialization materializes `multiplicity`, `presence`, and `nullable` on every
`1.1.0` field and adds no bytes to a `1.0.0` document.

Field presence is authored rather than derived in contract `1.2.0`
([issue #93](https://github.com/agent-ix/filament-core-data/issues/93)):
[FR-106](../../spec/functional/FR-106-author-field-presence-independently.md)
states the rule that carries `Field.presence` as `required` or `optional`
independently of `multiplicity`, `nullable`, and the default kind.

A record type definition carries first-class `relationships[]` (verb, FR-040
category, `composite` flag, target identity, multiplicity, origin),
`operations[]` (params as field nodes, bounded `returns`, `pre[]`/`post[]`
bound by `clauseId`), and any type definition carries `clauses[]`
(`language` of `quire`, `ocl`, `sysml`, `fretish`, or `<ns>:<name>`; `clauseId` unique
per type; opaque `text`; `sourceSpan` when source-originated). The IR never
parses clause text. Relationship targets resolve to a document type or a lock
export; composite relationship graphs are acyclic. The same rule governs a
`reference`-kind definition's `target`, and for both kinds a third source
resolves: an export named by a declared manifest import. A target resolving to
none of the three is refused (ADR-0009).

The constraint `keyword` is a closed set (`min`, `max`, `exclusiveMin`,
`exclusiveMax`, `pattern`, `minLength`, `maxLength`, `enumValues`, `nonEmpty`,
`unique`, `format`) with typed operands per keyword and an applicability table
over the resolved kind. In a `1.1.0` document `source.dialect` is `typespec` or
`spec-bundle`; the JSON Schema draft URI is the `1.0.0` constant only. Manifest
targets bind to the declared registry: generated targets or representation
formats, each defined once in `common.schema.json`. The worked example
`fixtures/semantic/v1/positive/config-version-v1-1.json` lifts config-service
FR-006 `ConfigVersion` with zero declared loss (`config-version-v1-1-loss.json`).

### Identity minting (issue #87)

There is one identity-minting rule, and it is stated here once. FR-034, the
semantic-core lowering, is its origin: where this section differs from
FR-034's shorter form (the case-preserving `slug` applied to every part, the
`variant` slot, the package-identity root, the slugged and lower-cased code
namespace), this section governs. Its two implementations are the TypeSpec
frontend (FR-053, `src/compiler/frontend/typespec/identity.mjs`) and the
spec-bundle extraction frontend (FR-095,
`crates/extraction-frontend/src/identity.rs`); each implements it unchanged,
neither widens, narrows, nor restyles it, and an identity is a function of the
declaration and its package alone — no decorator, frontmatter key, or option
overrides one. Two frontends reading the same declaration therefore mint the
same identity, which is what makes their documents comparable (FR-098). The
shared table `crates/extraction-frontend/fixtures/identity-cases/identity-cases.json`
(FR-095-AC-16) is authored from this section and is the evidence that both
implementations agree.

Every identity is rooted at the package identity, `ix://<package identity>/`,
and occupies exactly one of these slots, whose parts are listed in order.
Every part of every slot is slugged, the `type` name included:

| Slot | Identity | Parts |
|---|---|---|
| `type` | `type/<slug(Name)>` | the type's name; a kernel scalar definition is `type/<KernelScalar>` (a kernel scalar name is alphanumeric, so its slug is itself) |
| `field` | `field/<Name>-<field>` | owner type, field; an operation parameter is `field/<Name>-<operation>-<param>` (there is no `param/` slot) |
| `variant` | `variant/<Name>-<member>` | owner enum or union, member |
| `relationship` | `relationship/<Name>-<verb>-<TargetName>` | owner record, verb, target type name |
| `operation` | `operation/<Name>-<name>` | owner record, operation |
| `clause` | `clause/<Name>-<clauseId>` | owner type, clause id |
| `constraint` | `constraint/<Name>-<field>-<keyword>` for a field constraint; `constraint/<Name>-<keyword>` for a type constraint | owner, (field,) keyword |

`<Name>` is the declaring type's name part. The TypeSpec frontend takes it
from the declaration name. The spec-bundle frontend takes it from the
declaring artifact's id (FR-143): artifact `FR-001` titled `Order` has
identity `type/FR-001` and `displayName` `Order`, and its field `note` is
`field/FR-001-note`. The type's name is its `displayName`.

The alias a constrained field mints is a `type` identity whose tail is
`slug(Name)` followed by `slug(field)` with its first character upper-cased:
`Note`, `revision` → `type/NoteRevision`; `Note`, `created_at` →
`type/NoteCreated-at`. The alias node's `displayName` is `<Name>` followed by
the field name verbatim with its first character upper-cased: `NoteRevision`,
`NoteCreated_at`. The field's `typeRef` is retargeted to the alias identity and
the constraint's `appliesTo` names it.

`slug(value)` replaces every run of characters outside `[A-Za-z0-9]` with one
`-` and trims leading and trailing `-`; case is preserved (`Config Version` →
`Config-Version`, `Config_Version` → `Config-Version`, `created_at` →
`created-at`, `versionNumber` → `versionNumber`). Each part is slugged and
the parts are joined by `-`. A part is never dropped: if a part slugs to the
empty string (`_`, `--`, `***`), the frontend raises `UNSLUGGABLE_NAME` at
that declaration and mints nothing for it. Because parts may themselves
contain `-`, the parts are not recoverable from an identity, which is why the
collision rule below runs over every minted identity of every slot rather
than per list.

A constraint's `diagnosticCode` is
`agent-ix.<slug(package name) lower-cased>.<UPPER_SNAKE(owner parts…)>_<UPPER_SNAKE(keyword)>`,
where `UPPER_SNAKE` is `slug` with every `-` replaced by `_` and every letter
upper-cased, and `<package name>` is the part of the package identity after
`<org>/`. The `agent-ix.` prefix is the literal the `diagnostic.code` pattern
of `common.schema.json` requires and does not vary with `<org>`. A camelCase
keyword or name is not split: `minLength` is `MINLENGTH`. Package
`agent-ix/records-and-scalars`, record `Note`, field `revision`, keyword `min`
gives `agent-ix.records-and-scalars.NOTE_REVISION_MIN`. The code is a datum of
the document, the code a consumer raises when the constraint fails, and always
matches the `diagnostic.code` pattern. A `diagnosticCode` is not an identity:
because `UPPER_SNAKE` folds case, two constraints on distinct identities may
carry one code across records (`Status.id` and `status.id` under `min` both
give `STATUS_ID_MIN`), and only FR-093's per-record duplicate check
(`DUPLICATE_CONSTRAINT`) refuses a repeated code.

Three cases partition the ways two nodes can claim one name or one identity,
and they are checked in this order:

- (a) **Equal names, before minting.** Two documents with equal verbatim
  `displayName`, or a `displayName` equal to a kernel scalar the bundle uses,
  are refused as `DUPLICATE_TYPE_NAME` at the later document, before any
  identity of either is minted. (The TypeSpec compiler refuses duplicate
  declarations itself, so the TypeSpec frontend never reaches this case.)
- (b) **Distinct names, one slug.** Two distinct declaration names whose
  slugs coincide (`created_at` beside `created__at`; two enumeration rows
  `a b` and `a_b`) are refused as `UNSLUGGABLE_NAME` at the later
  declaration, FR-053's rule, which the spec-bundle frontend adopts.
- (c) **Any other two nodes minting one identity** — a minted alias beside an
  author-named type (`NoteRevision` beside `Note.revision`), a field beside
  an operation parameter of the same owner — are refused as
  `DUPLICATE_IDENTITY` (an `error`, blocking) at the later node, naming both
  identities and carrying the earlier locus as a related locus; the frontend
  never emits a colliding identity.

"Later" is by this order: a kernel definition ranks before every authored
declaration; authored declarations rank by source path relative to the
package root (the bundle root, for a spec bundle), then start line, then
start column. Distinct names with distinct slugs — `Status` and `status` —
are distinct identities, not a collision under any case.

Code namespaces are frontend-owned: the spec-bundle frontend raises every
case under `agent-ix.extraction-frontend.*`; on the TypeSpec side case (b) is
the compiler's `agent-ix.compiler.UNSLUGGABLE_NAME` and case (c) is refused by
the reader as `agent-ix.semantic-ir.DUPLICATE_IDENTITY`. Two known deviations
of the TypeSpec frontend from this section — `identity.mjs` drops an empty
part instead of raising `UNSLUGGABLE_NAME`, and `lower.mjs` leaves case (c)
to the reader instead of refusing it before emission — are
filament-core-data#94.

### Contract 1.2.0 (issues #93 and #146)

Contract `1.2.0` is additive to `1.1.0`. A `1.1.0` document carrying any node
this section adds is refused with `SCHEMA_VIOLATION`.

**Unconstrained value.** The scalar `any` is an unconstrained JSON value:
number, string, boolean, null, array or object. It is never a zero-field
record, whose meaning is *any JSON object*.

**Presence.** `Field.presence` is authored and independent of
`multiplicity`. `PRESENCE_MULTIPLICITY_MISMATCH` applies to `1.0.0` and
`1.1.0` documents only. Normalization materializes absent multiplicity and
nullable values and keeps the authored presence.

**Model members.**

| Member | Node | Meaning | Reader codes |
|---|---|---|---|
| `supertypes` | type | The types this type specializes, of the same kind; the graph is acyclic | `UNRESOLVED_CONSTRUCT_REF`, `CONSTRUCT_TARGET_KIND`, `SUPERTYPE_CYCLE` |
| `abstract` | type | The type has no direct instances | — |
| `subsets` | field | Supertype fields whose values include this field's values | `UNRESOLVED_FEATURE_REF` |
| `redefines` | field | The supertype field this field narrows; its multiplicity lies within the redefined bounds | `UNRESOLVED_FEATURE_REF`, `INVALID_REDEFINITION` |
| `frame` | operation | Feature paths the operation `modifies`, `creates` and `deletes`, each starting at a field or parameter | `UNRESOLVED_FRAME_PATH` |
| `requires`, `ensures` | operation | Inline pre- and postconditions, each `{language, text}` | — |
| `populations` | document | Named instance extents: type references with a multiplicity | `UNRESOLVED_TYPE_REF` |

Clauses are Quire: a clause `language` is `ocl`, `sysml`, `fretish`, `quire`
or a registered `namespace:name`. No reader translates a clause between
languages, and an unsupported meaning is refused, never approximated.

**Constructs.** One type-definition `kind` per business object type. Each
construct carries its built-in rules; a member outside its kind's list is
refused. Every construct except `enumeration` may carry `relationships` and
`operations`.

| `kind` | Required members | Built-in rules | Quire meaning |
|---|---|---|---|
| `entity` | `fields`, `identityFields` | `identityFields` non-empty, naming fields of the type or a supertype | A class whose instances are told apart by the identity fields |
| `value_object` | `fields` | No `identityFields` | A datatype equal by all fields |
| `nested_entity` | `fields`, `identityFields`, `owner` | `owner` is an `entity`, `nested_entity` or `aggregate_root` | A class composed by its owner; identity is local to the owner |
| `aggregate_root` | `fields`, `identityFields`, `clauses`, `members` | At least one clause; members are `entity`, `value_object`, `nested_entity` or `enumeration` | A consistency boundary whose clauses are invariants over its members |
| `enumeration` | `variants` | No `fields`; the variant set is closed | An enumeration of exactly its variants |
| `event` | `fields`, `occurrenceField` | No `identityFields`; the occurrence field resolves to scalar `datetime` | An immutable record of one occurrence at that instant |
| `state_machine` | `operations`, `states`, `transitions` | At least one operation; `from`/`to` name states, `trigger` names an operation, `guard` names a clause by `clauseId`, `emits` names events | A state machine firing a transition on its trigger when its guard holds |
| `process` | `fields`, `identityFields`, `steps` | Step `consumes`/`emits` name events | A class whose instances run steps that consume and emit events |
| `repository` | `operations`, `persists` | At least one operation; no `fields`; `persists` names `entity` or `aggregate_root` types | An interface of persistence operations holding no state |
| `domain` | `members`, `vocabulary` | No `fields` or `operations`; no member is a domain; a type belongs to at most one domain | A namespace for its members and vocabulary, not a data type |

A broken construct reference raises `UNRESOLVED_CONSTRUCT_REF` or
`CONSTRUCT_TARGET_KIND`; a wrong occurrence field raises
`INVALID_OCCURRENCE_FIELD`; a guard naming no clause raises
`DANGLING_CLAUSE_REF`; a type in two domains raises
`MULTIPLE_DOMAIN_MEMBERSHIP`. A backend without a rendering for a construct
refuses the document and never renders the construct as a record; the
per-construct renderings are filament-core-data#147 and #150.

## Packages, locks, and fingerprints

A package identity is opaque `owner/name`, independent of registry URL or
checkout path. Imports name compatible versions and required exports or
capabilities. Exports refer to stable semantic identities; profiles select
public exports, targets, mappings, options, and compatibility posture without
mutating definitions.

Locks resolve the complete dependency graph to exact versions, content digests,
source identities, and dependencies. Package cycles are rejected with every
locus. Recursive type graphs are preserved and are not package cycles.

The v1 fingerprint uses SHA-256 over a named
`RFC8785-JCS-with-identity-sorted-sets-v1` canonical byte form. It includes
schema bytes, manifest, mappings, profiles, resolved packages, and compiler
contract version. Object ordering and semantically-set ordering are normalized.
Source path, working directory, timestamp, hostname, and locale are excluded.
Every included semantic byte change changes the fingerprint; excluded ordering
does not.

## Mappings and profiles

Exports, targets, mappings, and profile options are independent selections.
Profiles declare authority, edit direction, round-trip level, unknown behavior,
allowed omissions, enrichment, and materialization lifetime. Preservation is
one of byte-lossless, structure-lossless, semantic-lossless, declared-lossy, or
one-way.

Transformation variants have distinct obligations:

- codecs define encoding/decoding behavior;
- lenses define get-put, put-get, and put-put laws plus conflict policy;
- projections and extractions define selected loci and declared omissions;
- renderings define presentation without claiming semantic authority;
- aggregations define grouping, window, ordering, late-data, and aggregate semantics;
- enrichments name external sources and preserve them in provenance;
- materializations name lifetime and external writes.

Every transform declares purity, determinism, reads, writes, failure states, and
retry idempotency. Pure transforms have no external effects. Declared loss lists
every omitted identity; undeclared loss fails.

## Representation profiles

The representation fixture catalog records required mapping fields, best-fit
uses, explicit non-uses, and compatibility methods. Markdown maps frontmatter,
headings, prose, tables, lists, fenced blocks, relationships, and extraction
loci, and distinguishes byte, structural, and semantic round trips. JSON names
media type, schema, discriminator, canonicalization, and unknown policy.

PostgreSQL profiles describe logical mapping and provenance only; physical DDL,
indexes, transactions, and migrations remain consumer-owned. Protobuf profiles
use explicit numbers and permanent reservations—declaration order assigns
nothing. Avro is explicitly a compatibility bridge. Arrow/Parquet declare order,
types, nullability, metadata, partitioning, and loss. CSV/TSV require an external
schema and forbid implicit type inference.

Protobuf, Arrow, and Parquet are presently unselected in the fixture catalog
because no accepted consuming boundary supplies their performance and
compatibility gate. Describing a format does not select it.

## Compiler and generated targets

The compiler request contains the complete locked IR, selected profile,
mappings, backend identity/version/features/options, and a relative output root.
The output manifest reconciles every emitted file to its digest, media type, and
semantic identities. Invalid, unsupported, or unavailable results emit zero
files and at least one diagnostic.

All adapters and backends share diagnostics with a stable namespaced code,
severity, message, owner, source locus, causal chain, related loci, and blocking
disposition. Unsupported features fail or use an explicitly approved lossy
target. They never degrade to `any`, generic maps, or empty models.

Rust exposes native structs, enums, newtypes, unions, Serde behavior, and
framework-neutral validation. TypeScript pairs static types with runtime
validation from the same lock. Python uses qualified generation for Pydantic v2
and standard dataclasses through a governed schema adapter; authored decorators
or custom `@` tags are not a schema language. Generated semantic packages
exclude UI, ORM, SQLAlchemy, Tauri, network clients, database migrations, and
application services.

Upstream generators are qualified first. Any retained Agent IX custom compiler
or code generator is a separately versioned reusable product licensed
AGPL-3.0-or-later, with its own conformance, release, ownership, security, and
incident gates. No such implementation is part of issue #9.

## Compatibility

Reports classify patch, additive, conditional, breaking, unknown, and invalid
changes across semantic, profile, mapping, representation, and generated-target
surfaces. Cross-target disagreement produces the most restrictive result and
names the disagreement. Unknown or stale consumers remain visible and prevent a
compatible promotion.

Required additions, removals, incompatible meaning/type changes, stable identity
changes, and unknown-policy tightening are breaking. Optional additions are
additive only when every target and known consumer preserves, ignores, or
surfaces them as declared. Open/closed enum behavior is consumer policy, not a
language default. Authority, edit direction, preservation, loss, provenance,
and lifetime changes may break an unchanged structural schema. Reuse of a
reserved Protobuf name or number is breaking and invalid.

## Dynamic and legacy consumers

Dynamic validation and finite generated exports share package, type, field,
profile, mapping, and fingerprint identities. Static consumers declare whether
unknown modules and extensions are preserved, rejected, or surfaced. Legacy
adapters name exact source and target versions, preservation, omissions,
diagnostics, and retirement prerequisites.

The retained Quoin manifest inventory and Avro bridge are compatibility
controls. Missing versions, imports, adapters, contradictory identities, and
unknown required capabilities fail with diagnostics and no empty-model success.
Quire retains document parsing/rendering; Quoin retains registry and install
policy; modules retain their domain contracts; the compiler compiles; consumers
retain application and persistence policy.

## Safety and reproducibility

Locked validation and future compilation are offline and deterministic. Paths,
timestamps, hostnames, locale, and map ordering are normalized or excluded.
Schemas, metadata, mappings, examples, options, names, and references are
untrusted. Implementations must prevent code execution, undeclared network
access, path/symlink escape, and writes outside a fresh output root. Graph depth,
reference expansion, collection sizes, input bytes, and diagnostic volume must
have declared finite limits and terminate with source-located diagnostics.

## Promotion boundary

Issue #9 may change requirements, these contract schemas, examples, fixtures,
tests, reviews, and plans. It may not implement a production compiler, publish
or enforce a package, change a catalog pin, migrate a database, alter a consumer,
rewrite Quoin manifests, change current Avro/generated bindings, or retire a
legacy path. Those actions remain separately ticketed and gated.

The structural-source decision is recorded: the owner selected TypeSpec on
[issue #4](https://github.com/agent-ix/filament-core-data/issues/4)
(2026-09-03, ADR-0005). This document remains provisional on issue #9 only for
its IR field set and must not trigger downstream adoption on its own.
