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
  NFR-036, matrix rows TC-1400..TC-1456. The assessment half — US-017,
  FR-119..FR-126, NFR-037, TC-1457..TC-1499 — is designed and reviewed and
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
  itself after. TC-1440..TC-1447, TC-1449 and TC-1454 are traced executable
  controls in `crates/baseline-producer/tests/canonical.rs` and
  `tests/numeric_audit.rs`, each reporting the number it measured; the planted
  `as f64` and the planted locale-collation key sort were each shown to fail
  TC-1454 and TC-1443 respectively. `make rust-build`, `make rust-test` and
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
  neither refused as a malformed selection (FR-112-CON-4, FR-113-CON-4). TC-1400
  ..TC-1410 are traced executable controls in `tests/digest.rs` and
  `tests/revision.rs`; deriving `version` from the domain spelling in a scratch
  copy failed TC-1400 and defaulting an absent namespace failed TC-1408 and
  TC-1404. Plan-016's TC-1373..TC-1381 pass over the new shapes and
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
  from the absent-locus refusal (FR-114-CON-5, FND-1765). TC-1411..TC-1416 are
  traced executable controls in `tests/declarations.rs`; synthesizing a locus for
  an unlocated declaration in a scratch copy failed TC-1416, and reconstructing a
  component identity from its locus path failed TC-1413.
