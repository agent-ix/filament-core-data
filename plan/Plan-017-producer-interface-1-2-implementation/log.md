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
