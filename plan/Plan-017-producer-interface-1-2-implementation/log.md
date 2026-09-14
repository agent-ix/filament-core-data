---
id: Plan-017-log
title: "History of Plan-017"
type: log
---
## History

* 2026-09-11 - Plan created from the two reviewed change records for issue #95:
  CR-095-1 over `spec/reviews/95-static-producer-boundary/` with the
  orchestrator decisions D1..D24, and CR-095-2 over
  `spec/reviews/95-producer-interface-1-2/` with E1..E14. Nine tasks,
  Task-143..Task-151, strictly serial through Task-148 because each task's types
  are the next task's members. Task-140 is complete; Task-141 and Task-142 belong
  to Plan-016 and are untouched.
* 2026-09-11 - Scope fixed as the **static half only**: US-016, FR-112..FR-118,
  NFR-036, matrix rows TC-1600..TC-1656. The assessment half — US-017,
  FR-119..FR-126, NFR-037, TC-1657..TC-1699 — is designed and reviewed and
  deliberately not implemented, because FR-117 requires that a static link never
  require or mint a population, snapshot, window, workflow instance, relationship
  instance, observation, progress record or closure; those remain later D and F
  campaign inputs. Producing the static bundle is static admission only and is not
  campaign acceptance of any assessment claim. FR-126 is out of scope while its
  interface-version header member is in scope (FR-117 obliges it), so FR-126's
  rows stay `🚧`.
* 2026-09-11 - Recorded that the shipped `crates/baseline-producer` contradicts
  the accepted design in every respect: `ProducerBundle` requires a population,
  observation records and a window; `DigestTriple` has no `version`; revisions are
  bare strings; there is no component, endpoint, inventory, locus or
  export-mapping type; `from_json` plus a separate public `validate` is the
  construct-then-validate bypass FR-117 forbids; and the canonicalizer was being
  fed binary64-rounded lexemes. This is a breaking change to a `publish = false`
  crate with no registry consumer, so no consumer migration is owed — stated
  rather than implied, consistent with FND-1755.
* 2026-09-11 - Accepted the exact-decimal measurement of FND-1750 (D18) as
  established fact rather than a hypothesis to re-test: with `serde_json`'s
  `arbitrary_precision` enabled every probe row round-trips exactly, `1`/`1.0`/`1e0`
  still collapse to `1`, the trailing-coefficient-zero rule still fires, and
  `canonical_number` needs no change — it was always correct and was being fed a
  lossy lexeme. Task-143 is therefore "enable the feature and add the controls",
  and a coordination rule forbids rewriting `canonical_number`.
* 2026-09-11 - Accepted NFR-036's designation of this plan as **apparatus owner**
  (NFR-036 Verification, FND-1756 / FND-1767): Task-149 owns the committed goldens,
  the declared permutation set, the fixture and its published JSON Schema, and the
  eight one-axis adverse fixtures; Task-150 owns the second architecture of the
  named set and its runner, the instrumented ambient-read run and the unprivileged
  network namespace. A gate whose apparatus is missing fails reporting that it did
  not run; it is never marked passing vacuously.
* 2026-09-11 - Recorded, as a known pre-existing red this plan does not own:
  `tc_1299` and `tc_1310` in `crates/extraction-frontend/tests/change_set.rs` fail
  because the issue #36 changed-path gate measures the diff from base `3b75e01` and
  lists this increment's paths as unpermitted. Issue #92 retires those gates. No
  task edits them, none adds its paths to their permitted list, and their failure is
  not reported as this plan's.
* 2026-09-11 - **Task-143 complete.** The exact-decimal canonical seam landed:
  `serde_json`'s `arbitrary_precision` enabled for `crates/baseline-producer`, the
  numeric lexeme read through `Number::as_str` instead of `Number::to_string()`,
  `ProducerDecimal` added so an authored decimal never passes through binary64,
  the numeric bounds taken from the configuration's declared
  `resourceLimits.numericResourceLimit` (E8/E11, FND-1814) in place of the retired
  `MAX_CANONICAL_NUMBER_DIGITS` host constant, object keys sorted by the
  canonicalizer itself in Unicode scalar-value order (D15, FND-1751), and set
  versus semantic-order arrays declared explicitly per member (FR-118-CON-3).
  `canonical_number`'s algorithm is unchanged; the only edit inside it is the
  source of its two limits, which the plan's own Green subtask directs.
  Re-measured, not cited: `0.1000000000000000055511151231257827` canonicalized to
  `0.1` before and to itself after;
  `123456789012345678901234567890.12345678901234567890` to
  `123456789012345680000000000000` before and to
  `123456789012345678901234567890.1234567890123456789` after;
  `0.3333333333333333333333333333333333` to `0.33333333333333337` before and to
  itself after. TC-1640..TC-1647, TC-1649 and TC-1654 are traced executable
  controls in `crates/baseline-producer/tests/canonical.rs` and
  `tests/numeric_audit.rs`, each reporting the number it measured; the planted
  `as f64` and the planted locale-collation key sort were each shown to fail
  TC-1654 and TC-1643 respectively. `make rust-build`, `make rust-test` and
  `cargo fmt --all -- --check` are green for the whole workspace under feature
  unification except the issue #36 changed-path gates, which now number three
  rather than two: `tc_1315` in `crates/extraction-frontend/tests/change_set.rs`
  joins `tc_1299` and `tc_1310`, because it reads every manifest of the change set
  at the pinned tip `bb1bc4d` and that commit predates `crates/baseline-producer`.
  `tc_1294` in the same crate's `tests/fixtures.rs` was already red before this
  task's first edit. TC status rows stay `🚧`; moving them is Task-151's job.
* 2026-09-11 - **Task-144 complete.** `DigestTriple` is gone: every digest the
  producer authors is `DigestSelection { algorithm, domain, version, value }` with
  `version` a separately authored member no domain spelling supplies
  (FR-112-CON-3), and every bare revision string is gone: every revision is
  `Revision { namespace, value }` (FR-113-CON-2). Both map member for member onto
  the pinned consumer `SelectedDigest` and `Revision`. The closed vocabularies are
  fixed in code, the configuration document declares `digestSelections` and
  `revisionNamespaces`, and outside-the-vocabulary and inside-but-undeclared stay
  two separate refusals (FND-1723). The two consumer-owned carve-outs are typed
  rather than excepted: `RawByteDigest` is one raw-byte digest string and
  `NativeSourceLabel` an editable native authority label, both admitted and
  neither refused as a malformed selection (FR-112-CON-4, FR-113-CON-4). TC-1600
  ..TC-1610 are traced executable controls in `tests/digest.rs` and
  `tests/revision.rs`; deriving `version` from the domain spelling in a scratch
  copy failed TC-1600 and defaulting an absent namespace failed TC-1608 and
  TC-1604. Plan-016's TC-1373..TC-1381 pass over the new shapes and
  `fixtures/baseline-1-2/relationship-population-a.json` still loads, with its
  configuration digest recomputed over the two new declared-selection members.
* 2026-09-11 - **Task-145 complete.** The four types the crate had no
  representation for at all: `SourceLocus` mapping member for member onto the
  pinned consumer `ForeignLocus` with all **seven** `ArtifactRef` members, its
  `formal` document and revision and its `span` (D2, FND-1705 — a five-member
  locus is a wrong answer); `ComponentDeclaration` and `EndpointDeclaration` as
  first-class records whose identity, namespaced revision, canonical digest
  selection, locus, ownership and inventory membership are six separate authored
  members, the endpoint adding its owning component identity, type identity, role
  and multiplicity; and `InventoryMembership` / `InventoryDeclaration` carrying
  membership only. Inventory closure and the `unknown` disposition stay FR-110's:
  `InventoryCompleteness::disposition()` returns FR-110's `unknown` spelling and a
  membership claiming a completeness the declaration contradicts refuses rather
  than minting one (FR-114-CON-6, FND-1762). A locus is never synthesized: a
  record whose locus no declaration source document supplies refuses
  `COMPONENT_PROVENANCE_UNSUPPLIED` / `ENDPOINT_PROVENANCE_UNSUPPLIED`, distinct
  from the absent-locus refusal (FR-114-CON-5, FND-1765). TC-1611..TC-1616 are
  traced executable controls in `tests/declarations.rs`; synthesizing a locus for
  an unlocated declaration in a scratch copy failed TC-1616, and reconstructing a
  component identity from its locus path failed TC-1613.
* 2026-09-11 - **Task-146 complete.** `RelationshipDeclaration` moved to
  `src/relationship.rs` and completed: `relationship_revision`, the canonical
  `digest`, the declaring `RelationshipOwnership { model_identity,
  profile_identity, configuration_identity }` triple and `inventory_membership`
  are now members, and each `source` and `target` endpoint record joins a
  **declared** FR-114 endpoint through its `endpoint_identity` against the
  bundle's declared endpoint records, with the refusal naming both the
  relationship and the vocabulary it resolved against (D7, FND-1726, E8/FND-1809).
  The two endpoint records stay independent members under one type identity, so a
  self-relationship emits two records retaining their own identities, roles and
  multiplicities. The requested endpoint projection is fallible: it returns a
  named `EndpointProjectionLoss` carrying the relationship identity and both
  authored roles and multiplicities rather than guessing a collapsed value. The
  new members are `Option`s because absence is a representable state the producer
  refuses naming the absent member — the `resourceLimits.numericResourceLimit`
  precedent — which is also what keeps the Plan-016 fixture loading unchanged.
  TC-1617..TC-1622 are traced executable controls in `tests/relationships.rs`;
  joining by coinciding type identity in a scratch copy failed TC-1621 and
  reconstructing an absent role instead of refusing failed TC-1620.
* 2026-09-11 - **Task-147 complete.** `ProducerNativeCorrespondence` is complete
  in the producer's own bundle document (FND-1710, D3): the **five** authored
  producer-object members `kind`, `authority`, `identity`, namespaced `revision`
  and canonical `digest` selection — and no sixth, the consumer's `interface`
  `u32` index being absent from the type entirely (FND-1805, E2) — beside the
  native selection, the per-entry native definition closure with its own
  revisions and raw-byte digests, the required-closure identities, the binding
  relation identity, the configuration provenance, and one `ExportRecord` per
  exported component, endpoint and relationship record carrying its `exportKind`,
  its ordered `exportPath` and its formal export locus. `ExportKind` is the
  eleven-member subset of the consumer's closed vocabulary this producer emits:
  the `population` kind FR-120 partitions to the assessment side is not a variant
  at all (E3, FND-1803, FND-1825), so a static export of that kind is
  unrepresentable rather than merely refused. Foreign, cross-bound,
  duplicate-pair — refusing **both** records by name — stale-selection,
  absent-provenance and incomplete-closure inputs each refuse blocking.
  TC-1623..TC-1630 are traced executable controls in `tests/correspondence.rs`,
  TC-1623 as a `Compile` control (exhaustive destructuring plus a `compile_fail`
  doctest on the `interface` read) and TC-1630 as a `Static` scan with a planted
  `interface: u32` control. Planting that member in a scratch copy failed both
  TC-1623 (the pattern no longer mentions the field) and the `compile_fail`
  doctest; substituting a digest under a retained binding relation failed TC-1625
  and TC-1626.
* 2026-09-11 - **Task-148 complete.** `StaticProducerBundle` carries four header
  members — bundle identity, namespaced bundle revision, canonical digest
  selection, and the producer interface version `1.2.0` FR-126 declares — and
  exactly nine content member classes, closed over those classes and over the
  assessment exclusion and over no header member (E1, FND-1800, FND-1820).
  `AdmittedStaticBundle` is reachable only from `StaticProducerBundle::admit` and
  `admit_json`, which construct and validate indivisibly: it has no public
  constructor, no public member and no `Deserialize`, and a refused admission
  yields no value of it. `ProducerBundle`, `from_json` and the public `validate`
  no longer exist; Plan-016's population, window, observation and availability
  types moved to `src/assessment.rs` unchanged, carried by `AssessmentBundle`
  (the moved carrier, renamed), and nothing in the static path references that
  module. A static admission requires and mints no population, snapshot, window,
  workflow instance, relationship instance, observation record, progress record or
  observation closure, and completes from the configuration document and the
  inventory declaration alone; the configuration's static prerequisite closure and
  FR-116's native definition closure are distinct members with distinct refusals
  (`STATIC_CLOSURE_ABSENT` vs `CORRESPONDENCE_CLOSURE_INCOMPLETE`, FR-117-CON-5,
  FND-1727). `AdmissionRegistry` keys an admitted bundle by identity + revision +
  digest together, refuses an identity collision naming both selections, and
  refuses a binding to a superseded bundle as stale naming both rather than
  resolving forward (E9, FND-1823). TC-1631..TC-1636, TC-1638 and TC-1639 are
  traced executable controls in `tests/static_bundle.rs`, with five
  `compile_fail` doctests and five compiling twins carrying the `Compile` halves
  of TC-1632 and TC-1635. Adding `Deserialize` to the admitted type in a scratch
  copy made the third TC-1635 control fail to fail — the breach the control exists
  to report — and reading `std::env::var` on the admission path failed TC-1636.
  `make rust-build`, `cargo fmt --all -- --check` and
  `cargo test --offline -p agent-ix-baseline-producer` (74 rows over 9 targets plus
  9 doctests) are green; the full `make rust-test` is green except exactly three
  rows, all of the issue #36 changed-path gate family this plan does not own:
  `tc_1294` in `crates/extraction-frontend/tests/fixtures.rs`, already red before
  this task, and `tc_1299` and `tc_1310` in the same crate's `tests/change_set.rs`,
  which go red the moment any #95 path is added. TC status rows stay `🚧`.
* 2026-09-11 - Task-149 landed the wire-level evidence: `fixtures/baseline-1-2/static-bundle-a.json` (admitted through `StaticProducerBundle::admit_json`; 2 components, 5 endpoints over one self-relationship, 2 relationships, 2 correspondence records covering the `component`, `endpoint` and `relationship` export kinds, the `orders` display-name collision quartet, and one authored exact integer past binary64 in `resourceLimits.declaredBounds`), the published `schema/baseline/v1/static-bundle.schema.json` validated by the repo's Ajv gate and by `tests/schema.rs`, eight one-axis adverse fixtures under `fixtures/baseline-1-2/adverse/` each refusing with exactly one stable code and each proven one axis wide by a structural diff against the good fixture, and 16 committed goldens under `fixtures/baseline-1-2/golden/` with the declared digested-document set and the declared 8-permutation insertion-order set beside them, cut once by the ignored writer `tests/golden_writer.rs`; TC-1650, TC-1651, TC-1653 and TC-1655 measure 16 documents, 64 byte comparisons, 128 paired permutation runs and 36 semantic-order arrays; the stale-correspondence axis is measured across two admissions because FR-116-AC-3 is stated over a prior selection and `validate_correspondence_set` compares no two records of one set, which is recorded rather than patched; `make rust-build`, `cargo fmt --all -- --check`, `cargo test --offline -p agent-ix-baseline-producer` and `test/baseline-producer.test.ts` are green, and `make rust-test` is green except `tc_1299` and `tc_1310` of the issue #36 changed-path gate family this plan does not own. TC status rows stay `🚧`.
* 2026-09-11 - Task-150 landed the cross-architecture and ambient apparatus over Task-149's committed evidence: `tests/nfr036/` builds one per-architecture agreement record — 16 digested documents' canonical byte strings and digests, each anchored to its one committed golden, plus 20 declared numeric probes' admit-versus-refuse decisions under the fixture's own declared `numericResourceLimit` (4096 coefficient digits, exponent magnitude 6144) — and `tests/cross_architecture.rs` carries TC-1652 and TC-1648 as a recording control per architecture plus an `#[ignore]`d agreement control that compares two records element by element and fails **naming** the architecture whose record is absent, never by count and never vacuously (FND-1716); on this `x86_64-unknown-linux-gnu` host the recording halves measure 16/16 documents against the golden and 16 admitted + 4 refused probes, the planted host-derived limit (a pointer-width derivation, 2048 digits) is detected at `coefficient-at-limit`, and `aarch64-unknown-linux-gnu` is **not reached**: `make baseline-producer-second-architecture` fails naming the absent `aarch64-linux-gnu-gcc` and `qemu-aarch64-static`, so the cross-architecture agreement is apparatus-complete and unrun, rehearsed only against a fabricated peer record outside the tree. `tests/ambient_audit.rs` carries TC-1656 in both halves: the call-graph audit over all 17 crate sources (4897 lines, 34 tokens, five categories, **no exemption member to widen** — the token type has none) measures 0 ambient reads and 0 host-derived sites, falsified by a planted `std::env::var` and a planted `SystemTime::now` on the canonicalization path in scratch copies; the instrumented run preloads `tests/probe/ambient_probe.rs` over the suite inside `unshare -rn` and **records** 0 ambient reads while canonicalizing all 16 documents, falsified by a planted clock read (1 `clock_gettime` recorded) and a planted environment read (1 `getenv` recorded) inside the measured region. `sha2`'s `cpufeatures` CPU-capability read is recorded rather than exempted: it is not one of the five categories and selects between implementations emitting identical bytes. New Makefile targets `baseline-producer-record`, `baseline-producer-second-architecture`, `baseline-producer-cross-architecture`, `baseline-producer-ambient-evidence` and `baseline-producer-evidence`, each failing rather than skipping when its toolchain, linker, runner or namespace is absent. `make rust-build`, `cargo fmt --all -- --check` and `cargo test --offline -p agent-ix-baseline-producer` (87 rows, 0 failed, 6 ignored) are green, and `make rust-test` is red on exactly the three issue #36 changed-path rows this plan does not own (`tc_1294`, `tc_1299`, `tc_1310`). TC status rows stay `🚧`.
* 2026-09-14 - Reconciled the plan with implemented reality during PR #99's
  final self-review. Tasks 143..149 are `done`; Task-150 remains `in_progress`
  solely because TC-1648 and TC-1652 still lack the required
  `aarch64-unknown-linux-gnu` execution; Task-151 remains `in_progress` until
  that matrix gap and the PR gate close. The later US-018 / FR-127..FR-129
  extension is recorded on Plan-017 rather than left implicit. SR-219..SR-221
  found and fixed native-evidence gaps: exact configured bounds now drive the
  complete verifier at-limit and one-past, selected-digest changes are resealed
  before verification, altered native bytes and export paths refuse at the
  intended seam, and the ambient-input control runs in a sanitized child
  process. The producer-local verifier qualifies only committed artifact bytes
  and export-table evidence; it does not duplicate the downstream
  `quire-spec-language` native-model admission seam.
* 2026-09-14 - Cleared the two-architecture gate without hosted CI or a system
  package change. Official Rust `cross` v0.2.5 (`88f49ff7`) ran the producer
  test binary under `aarch64-unknown-linux-gnu` using the official
  `ghcr.io/cross-rs/aarch64-unknown-linux-gnu:main` image at digest
  `sha256:99294ae75048aa07d00bb4f1a18a017e0812ff25753768d21d5938bf7562b40a`
  and Rust 1.94.1. Its independently produced record was compared with the
  x86_64 record by the host agreement controls: TC-1648 passes 20/20 numeric
  decisions and all four refused values element for element; TC-1652 passes
  16/16 canonical byte strings, 16/16 digests and 20/20 decisions. Generated
  records and cross build products stayed under `target-codex-backends` and
  were not committed. Tasks 150 and 151, NFR-036 and Plan-017 are complete;
  TC-1600..TC-1656 and TC-1700..TC-1732 are all passed, while the deliberately
  unimplemented assessment half TC-1657..TC-1699 remains planned.
