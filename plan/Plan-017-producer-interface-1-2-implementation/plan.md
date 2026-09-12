---
id: Plan-017
title: "Producer interface 1.2 static half: digest selections, declarations, and one admitted static bundle"
type: Plan
status: pending
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-115"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-118"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-036"
    type: references
---
# Plan-017: producer interface 1.2, static half

## Scope

Rebuild the public surface of `crates/baseline-producer` (package
`agent-ix-baseline-producer`) so that the static half of producer interface
`1.2.0` is what the crate actually emits: four-member digest selections,
two-member namespaced revisions, first-class component, endpoint, inventory,
relationship and correspondence records with their provenance loci and export
mappings, and one immutable static bundle reachable only through one
indivisible admission operation — over a canonicalizer that is fed exact
decimal lexemes rather than binary64-rounded ones.

Issue #95. The requirement files already carry the orchestrator decisions
D1..D24 (change record CR-095-1, review `spec/reviews/95-static-producer-boundary/`)
and E1..E14 (change record CR-095-2, review
`spec/reviews/95-producer-interface-1-2/`). Every task below implements the
reading those decisions recorded; a task that contradicts one is wrong.

**Build only.** `publish = false` on the crate manifest; no step contacts a
registry. Every original file is AGPL-3.0-only.

## Requirements covered

US-016, FR-112..FR-118 and NFR-036 — mapped to TC-1400..TC-1456 in
`spec/tests.md` (57 rows, every one `🚧 planned — #95 static half, not yet
implemented` at planning time). Every row is owned by exactly one task below,
and no row is owned twice.

### Functional requirements

- [ ] **FR-112** — `DigestSelection { algorithm, domain, version, value }`; closed two-member domain vocabulary; configuration-selected pairs; domain-substitution, mismatch, absent-`version`, unselected-pair and bare-hash refusals; the consumer-owned `ArtifactRef.digest` carve-out
- [ ] **FR-113** — `Revision { namespace, value }`; closed two-member namespace vocabulary; configuration-declared selections; cross-namespace substitution, bare-string and undeclared-namespace refusals; the consumer-owned `NativeSource.revision` carve-out
- [ ] **FR-114** — `ComponentDeclaration`, `EndpointDeclaration`, `SourceLocus`, `InventoryDeclaration`/`InventoryMembership`; absent-locus, absent formal revision, unsupplied-locus and closed-inventory refusals; the explicitly incomplete inventory's retained `unknown`
- [ ] **FR-115** — `RelationshipDeclaration` with `relationship_revision`, `digest`, independently identified `source`/`target` endpoint records joined by `endpoint_identity`, and the owning model/profile/configuration triple; role, multiplicity, projection-collapse and unknown-endpoint refusals with a named loss record
- [ ] **FR-116** — `ProducerNativeCorrespondence` with the five authored producer-object members, the native selection, the native definition closure, the binding-relation identity, the configuration provenance, and one `ExportRecord` per exported component, endpoint and relationship; foreign, cross-bound, duplicate-pair, stale-selection, absent-provenance and incomplete-closure refusals; no consumer `u32` index assigned
- [ ] **FR-117** — `StaticProducerBundle` + `AdmittedStaticBundle`: four header members, exactly nine content member classes, no assessment member class, one indivisible admission operation, no public constructor, no public member, no bypassing deserialization, the admitted-bundle key, identity collision and stale re-admission
- [ ] **FR-118** — Filament Canonical JSON 1 exactly: `arbitrary_precision` parsing, arbitrary-precision coefficient and exponent, Unicode scalar-value key order, escape rules, set versus semantic-order arrays, the configuration's declared `numericResourceLimit`, and the self-digest exclusion

### Non-functional requirements

- [ ] **NFR-036** — byte-exact canonical bytes and digests: repeat-run and two-process goldens, the declared insertion-order permutation set, the named architecture set, varied locale/environment/working directory, the zero-float-coercion audit with its planted control, per-array semantic-order comparison, and the zero-ambient-read audit plus instrumented offline run. This plan is the declared **apparatus owner** (NFR-036 Verification, FND-1756/FND-1767): the committed goldens, the second architecture and its runner, the planted-token control, the instrumented ambient-read run and the unprivileged network namespace are Tasks 149 and 150.

## What this plan does not implement

The assessment half — US-017, FR-119..FR-126, NFR-037, and matrix rows
TC-1457..TC-1499 — is designed and reviewed but is **not** implemented here,
and its rows stay `🚧` when this plan closes.

The reason is the obligation itself, not sequencing convenience. FR-117
requires that the producer never require, contain, or mint a population, a
snapshot, a window, a workflow instance, a relationship instance, an
observation record, a progress record, or an observation closure in order for a
static link to exist. A plan that implemented the assessment half alongside the
static half would be free to satisfy a static admission from an assessment
input and never notice; keeping the halves apart is how TC-1438 can measure
that a static admission completes from the static members of the FR-109
configuration document and the FR-110 inventory declaration alone. Those
assessment inputs remain later D and F campaign inputs, authored when there is
something observed to author them from.

Producing the static bundle is therefore **static admission only**. It is not
campaign acceptance of any assessment claim, and no task in this plan may be
reported as one (FR-117-AC-6, TC-1437, Task-151).

Two adjacent boundaries follow from that split and are recorded here so no task
quietly crosses them:

- **FR-126 is out of scope while its header member is in scope.** FR-117 obliges
  the static bundle to carry the producer interface version FR-126 declares as a
  header member, so Task-148 authors `interface_version = "1.2.0"` on the bundle.
  FR-126's own obligations — the `wireSchema` member on every emitted document,
  the four separately named versions, the one-interface-version-per-document-set
  rule and the v1.1 projection document set — are not implemented, and FR-126's
  matrix rows stay `🚧`.
- **The existing assessment types stay, unreachable.** `PopulationDocument`,
  `PopulationMember`, `RelationshipInstance`, `ObservationRecord`,
  `WindowDocument`, `WindowCoverage`, `AvailabilityFact` and the availability
  assessment types that Plan-016 Task-140 landed are moved under an `assessment`
  module unchanged. They keep their Plan-016 controls (TC-1373..TC-1381) green
  and are not reachable from `StaticProducerBundle` (TC-1432, verified at
  compile time).

## What the shipped crate contradicts

The crate at `crates/baseline-producer` was written for Plan-016 Task-140 and
contradicts the accepted static design in every respect. This is enumerated
rather than implied, because each line below is a task's starting condition:

- `ProducerBundle` **requires an assessment**: `population: PopulationDocument`,
  `observation_records: Vec<ObservationRecord>`, `availability:
  Vec<AvailabilityFact>` and `window: WindowDocument` are non-optional members,
  so today a static link cannot be expressed at all without minting a
  population, ordered observation records and a window that nobody observed.
  That is exactly the failure US-016 exists to prevent.
- `DigestTriple { algorithm, domain, value }` **has no `version` member**, and
  `validate_domain(&self, domain)` takes a domain alone. Every digest the crate
  emits therefore forces the consumer to default the `version` FR-112 forbids
  it to default.
- **Revisions are bare strings**: `ProducerObjectReference.revision: String` and
  `NativeArtifactReference.revision: String`. A bare revision is not a revision
  (FR-113-CON-2, US-016-EX-3); today the crate emits nothing else.
- There is **no component, endpoint, inventory, locus or export-mapping type** at
  all. A component or endpoint reaching a consumer arrives with no identity, no
  revision, no digest, no provenance and no inventory membership, and a
  correspondence carries no export mapping, so FR-114, FR-116's export mapping
  and the `component`/`endpoint` export kinds have no representation.
- `ProducerBundle::from_json(bytes)` **plus a separate `pub fn validate(&self)`
  is precisely the construct-then-validate bypass FR-117 now forbids**: a fully
  public, `Deserialize`-derived struct with public members yields an unvalidated
  value of the bundle type to any caller who simply never calls `validate`.
  FR-117-CON-2 and TC-1435 require the opposite: no public constructor, no
  public member, no deserialization path that bypasses admission, and no value
  of the type on refusal.
- **The canonicalizer was being fed binary64-rounded lexemes.**
  `canonical_json_at` reaches numbers as `canonical_number(&number.to_string())`,
  and without `serde_json`'s `arbitrary_precision` that `to_string()` has
  already been through `f64`. The measured result recorded in the design notes
  (FND-1750, settled 2026-09-11) is that `canonical_number` itself was always
  correct and needs no change: with the feature enabled every probe row
  round-trips exactly, `1`/`1.0`/`1e0` still collapse to `1`, and the
  trailing-coefficient-zero rule still fires. Treat that measurement as
  established fact; Task-143 enables the feature and adds the controls rather
  than re-litigating the canonicalizer.

Replacing `DigestTriple` and the bare revision strings, sealing the bundle type
and dropping the mandatory assessment members is a **breaking change to the
crate's public API**. The crate is `publish = false` and has no registry
consumer, and its only in-repository consumer is its own test suite, so **no
consumer migration is owed**. That is stated rather than left implied: the
absence of a migration path is a measured consequence of `publish = false`, not
an oversight, and FND-1755 already records in `spec.md` §1 that this delivery
breaks the shipped producer.

## Dependency graph

### Core dependency edges

- `FR-118 -> FR-112`
  Reason: the canonical byte string is the digest input, so the exactness seam
  precedes every digest selection taken over it. This is the edge CR-095-1
  reversed (FND-1732): FR-112 depends on FR-118 and not the other way round.
- `FR-112 + FR-113 -> FR-114`
  Reason: a component or endpoint record carries a digest selection and three
  namespaced revisions (its own, its locus `source`, its locus `formal`), so
  neither record shape exists before both selection types do (FND-1731).
- `FR-114 -> FR-115`
  Reason: a relationship's `source` and `target` join a declared endpoint
  through `endpoint_identity`, and a join naming no declared endpoint refuses
  (FND-1726, TC-1421). The endpoint declarations must exist to be joined.
- `FR-114 + FR-115 -> FR-116`
  Reason: the correspondence declares one export mapping per exported
  component, endpoint and relationship record, and its cross-bound refusal is
  stated over that ownership relation (FND-1710, FND-1711).
- `FR-116 -> FR-117`
  Reason: the correspondence records are one of the nine content member classes,
  and the admission refusal of an assessment-kind correspondence export is
  stated over an already-shaped export mapping.
- `FR-117 -> NFR-036`
  Reason: the byte-exactness measurements are taken over the digested documents
  of one admitted static bundle, so there is nothing to measure until admission
  exists. The one exception is the float-coercion audit, whose population is the
  numeric path alone; it lands with FR-118 in Task-143.

### Shared dependencies

- `DigestSelection`, `Revision` and their refusal codes (Task-144) are consumed
  by every later task; they are built immediately after the canonical seam and
  before any record shape.
- `SourceLocus` (Task-145) is consumed by `ComponentDeclaration`,
  `EndpointDeclaration` and every `ExportRecord` (Task-147). It is authored once,
  in Task-145, and Task-147 adds no second locus shape.
- `InventoryMembership` (Task-145) is carried by components, endpoints and
  relationships. Task-146 adds the relationship's membership member; it does not
  re-declare inventory closure, which FR-110 owns (FND-1762, FR-114-CON-6).
- The configuration document's selections — digest domain and normalization
  revision, revision namespaces, `resourceLimits.numericResourceLimit` — are read
  by Tasks 143, 144 and 148. The spelling is one spelling across the interface:
  `resourceLimits` with `numericResourceLimit` inside it, FR-109 the owner
  (FND-1814, E11).
- `fixtures/baseline-1-2/static-bundle-a.json` and its eight one-axis adverse
  mutations (Task-149) are the wire-level inputs for Tasks 149 and 150; the
  per-type unit controls in Tasks 143..148 construct their inputs in code and do
  not wait on the fixture.

### Cross-cutting constraints

- **No binary floating point on the numeric path.** No `f32`/`f64` type, no `as`
  conversion to either, and no `serde_json::Number::as_f64` may appear between
  the parse seam and the canonical serializer. The declared population is the
  crate's number parse seam, its coefficient-and-exponent representation, its
  canonical serializer, and the pinned JSON parser entry point (NFR-036-M-5,
  FND-1742). Authored decimals enter as `ProducerDecimal(String)` so the typed
  API cannot lose a digit through `f64` at all.
- **No ambient input anywhere in the canonicalization or admission call graph**:
  no locale, no `std::env`, no `env!`/`option_env!`, no working-directory
  resolution, no clock, no `std::net`, no `Command`. NFR-036-M-7 carries **no
  exemption list** (FND-1741), so a single admitted read fails the gate.
- **The consumer's `u32` table indices are never assigned** —
  `ProducerObject.interface`, `Correspondence.native`, `Correspondence.relation`,
  `Correspondence.exports`, `Definition.requires` (FR-116-CON-5, FND-1805). The
  producer authors five producer-object members, not six.
- **Every refusal is blocking.** No refusal in this plan may be emitted as a
  warning, a cache miss, or an invitation to refetch a different version, in any
  of FR-112, FR-113, FR-114, FR-115, FR-116, FR-117 or FR-118.
- **Identity is never reconstructed.** No component identity from a path, a
  package name or a deployment name; no relationship identity from a foreign key,
  a field or a relationship instance; no namespace from position, context or the
  shape of a `value`; no digest `version` from the domain spelling.
- The trace convention is this crate's own: a `/// Tracing: TC-NNNN` doc comment
  above a `fn tc_NNNN_…` test, as `crates/baseline-producer/tests/producer_contract.rs`
  already spells it. Do not introduce the `#[trace]` attribute form the
  extraction frontend uses.

### The seams

`serde_json::from_str::<Value>` under feature `arbitrary_precision` is the parse
seam; `serde_json::Number::as_str` is the exact-lexeme reader that replaces
`Number::to_string()`; `canonical_json`/`canonical_number` are the serializer
seam and change only where the lexeme reaches them; `sha2::Sha256` is the digest
seam. `StaticProducerBundle::admit()` and `admit_json(bytes)` are the only
entry points to `AdmittedStaticBundle`, which is `Serialize` and never
`Deserialize`. The pinned consumer contract —
`ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`, revision
`72507f856457ba0922719bd5d9f5cadcce4058cd` — is an assumed external contract
this plan maps onto member for member and never edits (FND-1760); it is not
vendored, not fetched, and a change on the consumer side is not detected by
anything here.

## Order

| Task | Subject | Depends on |
|---|---|---|
| Task-143 | FR-118 exact-decimal seam: `arbitrary_precision`, `ProducerDecimal`, declared `numericResourceLimit`, key order, set versus semantic order, self-digest exclusion, float audit | — |
| Task-144 | FR-112 `DigestSelection` with its authored `version`, FR-113 `Revision` with its namespace, and the `ERR-29x` refusal codes | Task-143 |
| Task-145 | FR-114 `SourceLocus`, `ComponentDeclaration`, `EndpointDeclaration`, `InventoryDeclaration` / `InventoryMembership` | Task-144 |
| Task-146 | FR-115 relationship record: revision, digest, independent endpoint records, ownership triple, projection loss record | Task-145 |
| Task-147 | FR-116 correspondence record, native definition closure, and one `ExportRecord` per exported record | Task-146 |
| Task-148 | FR-117 `StaticProducerBundle` / `AdmittedStaticBundle`: four header members, nine content classes, one indivisible admission, `assessment` module split | Task-147 |
| Task-149 | Fixture `static-bundle-a.json`, its published JSON Schema, the eight one-axis adverse fixtures, and the committed NFR-036 goldens | Task-148 |
| Task-150 | NFR-036 cross-architecture and ambient-read apparatus: the named architecture set, the instrumented offline run, the unprivileged network namespace | Task-149 |
| Task-151 | The report to A, and the static-admission-only record | Task-150 |

Tasks 143..148 are strictly serial: each one's types are the next one's members,
and each leaves `make rust-build`, `make rust-test` and `cargo fmt --check`
green before the next starts. Tasks 149 and 150 are the evidence apparatus and
Task-151 the report.

## Test plan

The TC ids are the `spec/tests.md` rows TC-1400..TC-1456. Each task's `verifies`
edges name the rows whose test it writes; the table below is the single
enumeration, grouped by the module under test. Every test lives in
`crates/baseline-producer/tests/`.

### Unit and integration tests

- [ ] `canonical.rs` (FR-118): TC-1440, TC-1441, TC-1443, TC-1444, TC-1446, TC-1447, TC-1449
- [ ] `digest.rs` / `revision.rs` (FR-112, FR-113): TC-1400..TC-1404, TC-1406..TC-1410
- [ ] `declarations.rs` (FR-114): TC-1411..TC-1414, TC-1416; inventory closure integration TC-1415
- [ ] `relationships.rs` (FR-115): TC-1417..TC-1420, TC-1422; endpoint-join integration TC-1421
- [ ] `correspondence.rs` (FR-116): TC-1423..TC-1429
- [ ] `static_bundle.rs` (FR-117): TC-1431..TC-1434, TC-1439; admission-source integration TC-1438; varied-environment integration TC-1436

### Compile-time and static gates (each with a planted-token control)

- [ ] FR-116-CON-3/CON-5 unassigned-index and distinct-domain scan TC-1430
- [ ] FR-117-CON-1 member-set closure TC-1432 and FR-117-CON-2 unconstructibility TC-1435, both `Compile` (FND-1745): a `compile_fail` doctest per prohibited construction — a struct literal, a public-member read, and a `serde_json::from_slice::<StaticProducerBundle>`
- [ ] FR-116-AC-1 five-member compile control TC-1423
- [ ] NFR-036-M-5 float-coercion audit over the declared numeric-path population TC-1454
- [ ] NFR-036-M-7 ambient-read call-graph audit plus instrumented offline run TC-1456

### Property tests

- [ ] TC-1405 (one object, two wire member orders, one digest `value`), TC-1442 (exact decimal round-trip; no binary64 between parse and serialization), TC-1445 (set array permuted digests identically, semantic-order array permuted digests differently), TC-1451 (declared insertion-order permutation set), TC-1455 (per-array semantic order, with the permuted paired run whose digest must differ)

### Snapshot tests against committed goldens

- [ ] TC-1450 (two runs in one process, two runs in two processes, against the golden), TC-1452 (`x86_64-unknown-linux-gnu` and `aarch64-unknown-linux-gnu` bytes and refusal sets against one golden), TC-1453 (changed locale, environment, working directory), TC-1448 (one configuration's `numericResourceLimit` refuses and admits the same numbers on both architectures)

### Manual

- [ ] TC-1437 — FR-117-AC-6 and AC-9: every member read without parsing prose, defaulting, or inferring, and production of the bundle recorded as static admission only. Owned by Task-151; `Inspection`/`Manual` is the correct method for a presentation claim with no executable oracle (FND-1748).

## Quality gates

1. **After Task-143 (the exact-decimal seam)** — `make rust-build` and
   `make rust-test` are green for the **whole workspace** under
   `serde_json`'s `arbitrary_precision`, including `quire-rs`, `jsonschema`,
   `crates/semantic-ir`, `crates/conformance-adapter` and
   `crates/extraction-frontend` recompiling under feature unification. The
   design notes record this as measured green at `296dc56`; the task re-runs it
   and records the number rather than citing it. If it regresses, the feature is
   the suspect and no later task starts.
2. **After Task-144 (selections)** — every Plan-016 control TC-1373..TC-1381
   still passes over the renamed `DigestSelection` and `Revision` shapes, and
   `fixtures/baseline-1-2/relationship-population-a.json` still loads. Plan-016
   is complete work; this plan may reshape what it emits but may not leave its
   controls red.
3. **After Task-148 (admission)** — the three `compile_fail` controls of TC-1435
   fail to compile (struct literal, public-member read, bypassing
   deserialization) and TC-1432 shows the bundle type closed over the nine
   content classes with no assessment member reachable. If any of the three
   compiles, the type is not sealed and Task-149 does not start: a golden over
   an unsealed type measures nothing.
4. **After Task-149 (goldens)** — every digested document of the admitted
   fixture bundle regenerates byte-identically across two runs in one process
   and two runs in two processes, and the eight adverse fixtures each refuse on
   exactly one axis with exactly one refusal code. A second axis firing means
   the fixture is not one-axis and is a fixture defect, not a producer finding.
5. **Before the pull request (Task-151)** — `make rust-build`, `make rust-test`
   and `cargo fmt --check` green; the repo's Rust review route run
   (`agent-skills:rust-review` via `code-review`) with its findings dispositioned;
   `quire coverage --scope . --json` binding every TC-1400..TC-1456 row; and
   every one of those rows moved off `🚧` in `spec/tests.md`.

### Named gates

- `make rust-build`
- `make rust-test`
- `cargo fmt` (and `cargo fmt --check` in the gate)
- The repository's own Rust review route: `agent-skills:rust-review`, dispatched
  via `code-review`.

### Known pre-existing red this plan does not own

`tc_1299` and `tc_1310` in `crates/extraction-frontend/tests/change_set.rs`
fail. Both are the issue #36 changed-path gates: they measure the diff from base
`3b75e01` and list this increment's paths as unpermitted, so they go red the
moment any #95 path is added, regardless of what that path contains. Issue #92
retires those gates. This plan **must not edit them**, must not add its paths to
their permitted list, and must not report their failure as its own. Every task's
exit condition is read as "green except those two rows", and Task-151's report
says so explicitly rather than quietly excluding them.

## Coordination rules

- **One writer per module.** Tasks 143..148 are serial and each owns the module
  it introduces. No task edits a module an earlier task closed except to add the
  member its own requirement obliges.
- **The `assessment` module split happens once**, in Task-148, and moves the
  Plan-016 population, window, observation and availability types without
  changing them. A behavioural change to any of those types is out of scope; it
  belongs to Plan-016's ticket (its controls are Plan-016's).
- **`canonical_number` is not rewritten.** The measurement says it was always
  correct and was being fed a lossy lexeme. Task-143 changes what reaches it,
  not what it does. Any proposal to change it must first reproduce a failing row
  the measurement does not already explain.
- **Goldens are cut once**, in Task-149, from the admitted fixture bundle. No
  earlier task commits a golden, and no test rewrites one.
- **A gate whose apparatus is missing fails saying so.** NFR-036's Verification
  and FND-1756/FND-1767 name this plan as the apparatus owner; until Task-150
  provides the second architecture, the instrumented run and the namespace,
  TC-1448, TC-1452 and TC-1456 fail reporting that they did not run. They are
  never marked passing vacuously and never skipped.
- **No assessment input reaches a static admission.** If a task finds itself
  needing a population, a snapshot, a window, an instance, an observation, a
  progress record or a closure to make a static test pass, that is the FR-117
  defect the plan exists to remove — stop and report it, do not supply the
  input.
- **The consumer contract is mapped, never edited.** `quire-spec-language` at
  the pinned revision is read-only context; nothing in this plan opens a change
  there, and the two upstream gaps FND-1812 and FND-1862 record (no admissible
  artifact kind for a population document, no `window` member in any consumer
  vocabulary) stay open cross-repo items on the assessment half.
- **Decisions are cited, not re-derived.** Each task names the D/E decision and
  the FND it implements; a task that contradicts one is wrong and stops.

## Open findings carried from the review

| Finding | Disposition |
|---|---|
| FND-1750 exact decimals need the parse seam to preserve the numeric lexeme | Task-143: enable `arbitrary_precision`, add the round-trip and adjacent-integer controls, leave `canonical_number` as it stands. Measured and settled 2026-09-11 |
| FND-1756 / FND-1767 NFR-036 names this plan the apparatus owner | Tasks 149 and 150 provide the golden, the second architecture, the planted-token control, the instrumented run and the namespace; a missing one fails reporting it did not run |
| FND-1755 the delivery breaks the shipped producer | Owned in writing above: breaking API change to a `publish = false` crate, no consumer migration owed |
| FND-1752 consumer-contract volatility (branch half) | Declined on measurement at review time: the shapes are on the consumer's merged `main` at the pinned revision. This plan pins that revision and detects no consumer-side change |
| FND-1812 a population document has no admissible consumer artifact kind | Open cross-repo item on the assessment half; not reached by the static bundle, no task here |
| FND-1862 no `window` member in any consumer vocabulary | Open cross-repo item on the assessment half; no window export mapping is required, no task here |
| FND-1829 availability containment without retrieval | Assessment half; recorded so no task here introduces a retrieval |
| TC-1457..TC-1499 | Assessment half, un-tasked by design; rows stay `🚧`. See "What this plan does not implement" |
