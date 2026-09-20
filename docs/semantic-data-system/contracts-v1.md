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
legacy evidence is published under `fixtures/semantic/v1/`; `2.0.0` golden
documents, `negative/reader-cases.json` (cross-field rules a schema cannot
express), and the `v1-fixture-digests.json` byte baseline sit beside them. A consumer can
validate it using only these files and a JSON Schema 2020-12 implementation.
A document declaring `1.0.0` or `1.1.0` is refused by every reader, because
`2.0.0` is the only contract a document may declare (fcd#179 deleted both
contracts, and the fixtures once frozen at them, `semantic-ir.json` and
`config-version-v1-1.json`, along with them).

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

### Structural model detail (issue #34)

The IR declares exactly one `contractVersion`, `2.0.0`; the schema admits no other value and refuses a document declaring one with `SCHEMA_VIOLATION` at `contractVersion` before any other member is read (FR-050). A field carries an explicit `multiplicity { lower, upper?, ordered, unique }` (absent `upper` is unbounded; `ordered` and `unique` are required booleans on every multiplicity — fields, parameters, returns, relationship ends, and connection ends alike — `false` where `upper` is 0 or 1, and `true` there is refused with `FLAGS_ON_NON_COLLECTION`, since ordering and uniqueness describe a collection); its `presence` is authored independently ([FR-106](../../spec/functional/FR-106-author-field-presence-independently.md), [issue #93](https://github.com/agent-ix/filament-core-data/issues/93)), never derived from `multiplicity`, `nullable`, or the default kind, and `2.0.0` enforces no agreement between `presence` and `multiplicity.lower`: a required field with `lower: 0` and an optional field with `lower` at least `1` are both valid (FR-106-CON-1); fcd#179 deleted `PRESENCE_MULTIPLICITY_MISMATCH` along with the `1.0.0`/`1.1.0` contracts it checked. A field may carry a UCUM `unit` when its `typeRef` resolves, through aliases, to a scalar. Because the schema already requires `multiplicity`, `presence`, and `nullable` on every field, the normalized serialization carries them as authored rather than deriving or filling in a default.

A record type definition carries first-class `relationships[]` (category,
`composite` flag, `sourceEnd`/`targetEnd`, origin — see
[Relationships](#contract-200-issues-93-146-and-172) below),
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
over the resolved kind. `source.dialect` is `typespec` or `spec-bundle`. Manifest
targets bind to the declared registry: generated targets or representation
formats, each defined once in `common.schema.json`. The worked example
`fixtures/semantic/v1/positive/config-version-v2.json` lifts config-service
FR-006 `ConfigVersion` with zero declared loss (`config-version-v2-loss.json`).

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

Every identity is rooted at the package identity, `ix://<package identity>/`.
A type definition (including a kernel scalar definition) and a member (field,
operation parameter, relationship, operation, clause) mint no slot segment: a
type's identity is `ix://<package
identity>/<Name>`, and a member's identity is its owner's identity, `/`, and
the member's own part, nested as deep as the member sits (an operation
parameter is nested under its operation, which is nested under its type).
Every other slot — `variant`, `state`, `transition`, `step`, `constraint` —
still occupies `ix://<package identity>/<slot>/<tail>`. Every name part of
every slot is slugged; an artifact id part (`<Name>` in the spec-bundle
frontend) is verbatim, as the paragraph below the table states:

| Slot | Identity | Parts |
|---|---|---|
| `type` | `<Name>` | the type's name; a kernel scalar definition is `<KernelScalar>` (a kernel scalar name is alphanumeric, so its slug is itself) |
| `field` | `<Name>/<field>` | owner type identity, `/`, field slug; an operation parameter is `<Name>/<operation>/<param>`, nested under its operation's identity (there is no `param/` slot) |
| `variant` | `variant/<Name>-<member>` | owner enum or union, member |
| `relationship` | `relationship/<Name>-<verb>-<TargetName>` | owner record, verb, target type name |
| `operation` | `<Name>/<name>` | owner type identity, `/`, operation slug |
| `clause` | `clause/<Name>-<clauseId>` | owner type, clause id |
| `state` | `state/<Name>-<state>` | owner state machine, state |
| `transition` | `transition/<Name>-<from>-<to>-<trigger>` | owner state machine, from state, to state, trigger operation (a transition row has no name) |
| `step` | `step/<Name>-<step>` | owner process, step |
| `constraint` | `constraint/<Name>-<field>-<keyword>` for a field constraint; `constraint/<Name>-<keyword>` for a type constraint | owner, (field,) keyword |

`<Name>` is the declaring type's name part. The TypeSpec frontend takes it
from the declaration name, and slugs it. The spec-bundle frontend takes it
from the declaring artifact's id (FR-143) and passes that id through
verbatim: artifact `FR-001` titled `Order` has identity `FR-001` and
`displayName` `Order`, and its field `note` is `FR-001/note`; artifact
`AR_001` has identity `AR_001`, not `AR-001`. An id is not slugged
because an object id carries `_` and no `-` and `semanticIdentity` admits `_`
inside a segment (`[A-Za-z0-9._~:/-]`), so slugging an id would rewrite a
datum the pattern already accepts. An id carrying a character that pattern
does not admit inside a segment, or no ASCII alphanumeric at all (`_`), mints
no segment and is refused as `UNSLUGGABLE_NAME`. Every other part — a field,
member, verb, keyword, state, step, or clause name — is slugged on both
sides. The type's name is its `displayName`.

`slug(value)` replaces every run of characters outside `[A-Za-z0-9]` with one
`-` and trims leading and trailing `-`; case is preserved (`Config Version` →
`Config-Version`, `Config_Version` → `Config-Version`, `created_at` →
`created-at`, `versionNumber` → `versionNumber`). Each part is slugged and
the parts are joined by `-`. A part is never dropped: if a part slugs to the
empty string (`_`, `--`), the frontend raises `UNSLUGGABLE_NAME` at
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
  `a_b` and `a__b`) are refused as `UNSLUGGABLE_NAME` at the later
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

### Contract 2.0.0 (issues #93, #146 and #172)

Contract `2.0.0` carries model members and construct kinds declared as module
data ([ADR-0011](adr/0011-domain-packages-construct-kinds-are-module-data.md)),
beside the structural model [Structural model detail (issue #34)](#structural-model-detail-issue-34)
states.

**Unconstrained value.** The scalar `any` is an unconstrained JSON value:
number, string, boolean, null, array or object. It is never a zero-field
record, whose meaning is *any JSON object*.

**Presence.** `Field.presence` is authored and independent of
`multiplicity`; neither is derived from the other, and `2.0.0` enforces no
cross-field agreement between them (FR-106); fcd#179 deleted
`PRESENCE_MULTIPLICITY_MISMATCH` along with the `1.0.0`/`1.1.0` contracts it
checked. Because the schema requires `multiplicity`, `presence`, and `nullable` on
every field, normalization carries them as authored rather than deriving or
filling in a default.

**Relationships.** A `relationship` names `category` (one of `structural`,
`behavioral`, `dataflow`, `dependency`, `realization`, `governance`,
`traceability`), `composite`, `direction` (one of `source-to-target`,
`target-to-source`, `bidirectional`, `undirected`; lowering always emits
`source-to-target`), a `sourceEnd` and a `targetEnd`, and `origin` — never a
flat `verb`, `target` or `multiplicity` (fcd#199/#200). Each end carries
`multiplicity` and the `type` it names, and a `role`: the source end's `role`
is the edge vocabulary verb as authored and is always present; the target
end's is the registry's declared `inverse` for that verb, present exactly
when the registry declares one, absent when it declares none. `composite` is
`true` exactly when the verb's registry `inverse` is `part_of`.

The "an `inverse` is declared for the verb if and only if the target end
carries a `role`" biconditional is a frontend obligation: a frontend holds
the registry that names the verb's `inverse` (or its absence) and is the only
party positioned to check the other half. A reader has no registry, so it
enforces only that `role` is present on the source end and, where present, is
a non-empty string on either end (FR-094 of fcd#199/#200's review, R4-READER);
it enforces nothing about whether a *particular* target `role` agrees with
any verb's registered `inverse`, and that silence is not a relaxation for a
frontend to skip its own half of the check.

**Model members.**

| Member | Node | Meaning | Reader codes |
|---|---|---|---|
| `supertypes` | type | The types this type specializes, of the same kind; the graph is acyclic | `UNRESOLVED_CONSTRUCT_REF`, `CONSTRUCT_TARGET_KIND`, `SUPERTYPE_CYCLE` |
| `abstract` | type | The type has no direct instances | — |
| `subsets` | field | Supertype fields whose values include this field's values | `UNRESOLVED_FEATURE_REF` |
| `redefines` | field | The supertype field this field narrows; its multiplicity lies within the redefined bounds | `UNRESOLVED_FEATURE_REF`, `INVALID_REDEFINITION` |
| `frame` | operation | Declaration references the operation `modifies` (a field or relationship), `creates` or `deletes` (an object type or process); never an access path. Resolution ranges over every such declaration the whole document carries, never only the operation's own type or its supertypes (QSpec FR-340, FR-013). QSpec #101 and #106 leave the frame's body encoding and grant-range semantics open | `UNRESOLVED_FRAME_PATH` |
| `pre`, `post` items | operation | A `pre` or `post` item is a clause id or an inline clause `{language, text}` | `DANGLING_CLAUSE_REF` for an id item |
| `populations` | document | Named instance extents, bound by `kind` (`{module, name}`); a flat set of unique member type references; one `extent` (`closed` or `open`) for the whole population | `UNRESOLVED_TYPE_REF` |

Clauses are Quire: a clause `language` is `ocl`, `sysml`, `fretish`, `quire`
or a registered `namespace:name`. No reader translates a clause between
languages, and an unsupported meaning is refused, never approximated.

**Construct kinds.** A type's `kind` is one of the eight core kinds (`scalar`,
`record`, `enum`, `union`, `alias`, `sequence`, `map`, `reference`) or a module
construct kind `{module, name}`. The module owns the kind's declaration; the
contract owns only the vocabulary the declaration is written in, published as
`schema/semantic/v1/construct-vocabulary.json`.

| Vocabulary | Names |
|---|---|
| Identities | `identified`, `value`, `none` |
| Shapes | `record`, `enumeration`, `interface`, `state_machine`, `sequence`, `namespace` |
| Presences | `required`, `optional`, `forbidden` |
| Members, default `optional` | `fields`, `variants`, `relationships`, `operations`, `clauses`, `supertypes`, `abstract` |
| Members, default `forbidden` | `identityFields`, `owner`, `members`, `occurrenceField`, `states`, `transitions`, `steps`, `persists`, `vocabulary`, `direction`, `interfaceType`, `multiplicity`, `declaredType`, `flowDirection`, `sourceEnd`, `targetEnd`, `sourceElement`, `targetElement`, `featureOrder` |
| Reference members | `owner`, `members`, `persists`, `interfaceType`, `declaredType`, `sourceElement`, `targetElement` name types; `sourceEnd` and `targetEnd` name one in `type`; `transitions` name them in `emits`; `steps` in `consumes` and `emits` |

A declaration carries a required `identity`, `shape`, `members` (a presence per
member; an unlisted member takes its default) and `meaning`, and an optional
`references` and `rules`. `references` maps a reference member to the unique,
non-empty roles it admits, each spelled `<module short name>:<role>`; `*` is
not a role, and a module frontend admits only a role some loaded object type
carries. `rules` is a unique list of rules, each requiring one member
presence of the declaration. `meaning` is an opaque id owned by QSpec.

| Rule | Requires | The reader or frontend refuses |
|---|---|---|
| `identity_field_required` | `identityFields` required | An empty `identityFields` |
| `identity_field_forbidden` | `identityFields` forbidden | Any `identityFields` |
| `min_clauses` | `clauses` required | No clause |
| `occurrence_field_required` | `occurrenceField` required | No occurrence field |
| `no_fields` | `fields` forbidden | Any field |
| `no_operations` | `operations` forbidden | Any operation |
| `min_operations` | `operations` required | No operation |
| `single_owner` | `owner` required | No admitted owner, or more than one |
| `exclusive_membership` | `members` required | A type named by the members of two types selecting the rule |
| `members_not_namespace` | `members` required | A member whose construct's shape is `namespace` |

A document using a module construct kind carries a `constructs` table with
exactly one entry per used kind: `kind`, `moduleVersion`, `manifestDigest` and
the `construct` declaration. A kind with no entry, an entry no type uses, a
kind declared twice and a declaration outside the vocabulary are refused with
`SCHEMA_VIOLATION`. A member whose presence is `forbidden` is refused, and a
`required` member must be present.

The business module declares ten construct kinds; `population` declares none.

| `kind` | Identity × shape | Admitted references | Rules |
|---|---|---|---|
| `domain` | `none` × `namespace` | — | `no_fields`, `no_operations`, `exclusive_membership`, `members_not_namespace` |
| `entity` | `identified` × `record` | — | `identity_field_required` |
| `value_object` | `value` × `record` | — | `identity_field_forbidden` |
| `aggregate_root` | `identified` × `record` | `members`: `aggregate-member` | `identity_field_required`, `min_clauses` |
| `nested_entity` | `identified` × `record` | `owner`: `composite-owner` | `identity_field_required`, `single_owner` |
| `repository` | `none` × `interface` | `persists`: `persistable` | `no_fields`, `min_operations` |
| `event` | `none` × `record` | — | `identity_field_forbidden`, `occurrence_field_required` |
| `state_machine` | `none` × `state_machine` | `transitions`: `event-like` | `min_operations` |
| `process` | `identified` × `sequence` | `steps`: `event-like` | `identity_field_required` |
| `enumeration` | `none` × `enumeration` | — | — |

A port's `direction` is `in`, `out` or `inout`; a connection's
`flowDirection` is `source-to-target`, `target-to-source` or `bidirectional`,
and each of its ends carries a `type` and an optional `multiplicity`.
`featureOrder` lists the identities of the type's own fields and operations in
authored order: an entry naming no single own field or operation raises
`UNRESOLVED_CONSTRUCT_REF`, and a field or operation it omits raises
`INCOMPLETE_FEATURE_ORDER`. A backend that renders no feature order ignores it.

A broken construct reference raises `UNRESOLVED_CONSTRUCT_REF` or
`CONSTRUCT_TARGET_KIND`; a wrong occurrence field raises
`INVALID_OCCURRENCE_FIELD`; a guard naming no clause raises
`DANGLING_CLAUSE_REF`; a type named by two exclusive memberships raises
`MULTIPLE_DOMAIN_MEMBERSHIP`. `CONSTRUCT_TARGET_KIND` covers a reference to a
type carrying none of the admitted roles, a supertype of another kind, and a
namespace member under `members_not_namespace`. An occurrence field resolves,
through aliases, to scalar `datetime`. A backend dispatches a construct on its
shape and identity, renders its name from `kind.name`, and never renders a
construct it cannot represent as a record.

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
