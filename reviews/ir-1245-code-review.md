---
id: SR-16479
title: "Code review of IR-1245 test naming and trace metadata"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; IR-1245; PR #334; crates/extraction-frontend/tests/owner_nested.rs and tests/write.rs"
review_set: subset
---

## Summary

Ticket: IR-1245. Independent code review with the Rust review lane of frozen
head `37814a29843ff09e7126b897058a5e888288f47d`, against
`bfb7a702b10fbb15cf09d8c462aa2a5dbf69c96c`. Only test naming and trace
attributes change; no production code, assertions, fixtures, gate parser,
configuration, dependencies or CI lanes change.

## Verdict

**PASS** — no defects found in this scoped metadata correction. The renamed
collision control retains its existing TC-1347 and FR-095-AC-14 trace and all
assertions. Two separate ix-trace-rs attributes preserve TC-1827's AC-3 and
CON-3 links; the existing TC-1327 parser explicitly supports both AC and CON
criteria. Neither trace target nor any test-matrix row is removed.

No applicable AssuranceProfile was found under spec/. Repository contribution
and Rust toolchain conventions, Rust testing/style guidance, the unchanged
trace gate, criterion text and existing matrix rows were inspected.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Scope

The following units were examined or read as context; excerpts are verbatim.

```yaml
scope:
- id: NFR-033-AC-8
  path: spec/non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md
  role: examined
  excerpt: Every requirement test in the crate carries `#[trace("TC-NNNN", "<FR or NFR>-AC-N")]` and is
    named `tc_NNNN_…`, and every named TC id exists in `spec/tests.md`.
- id: FR-095-AC-14
  path: spec/functional/FR-095-mint-package-identity-and-provenance.md
  role: context_only
  excerpt: a bundle holding an artifact with id `FR-001Revision` beside artifact `FR-001` with a constrained
    field `revision` (the `negatives/DUPLICATE_IDENTITY` fixture, contract case (c)) is refused at the
    later path with `DUPLICATE_IDENTITY` naming the `FR-001Revision` identity, with the earlier locus
    in `related`, and no document is written
- id: FR-145-AC-3
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: '`test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` contains both U+10000
    and U+E000 member names and records the expected RFC 8785 JCS UTF-16 canonical bytes with no `digest`
    member; the extraction frontend and Semantic IR reader consume the same vector and emit no digest
    sidecar.'
- id: FR-145-CON-3
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The FCD normalizer SHALL use the published `rfc8785-v1` definition and golden vectors; inference
    from observed member order is prohibited.
- id: TC-1347
  path: crates/extraction-frontend/tests/owner_nested.rs
  role: examined
  excerpt: '#[trace("TC-1347", "FR-095-AC-14")]

    #[test]

    fn tc_1347_colliding_variants_from_hyphenated_and_plain_artifact_ids_report_one_duplicate_identity()

    {'
- id: TC-1827
  path: crates/extraction-frontend/tests/write.rs
  role: examined
  excerpt: '#[trace("TC-1827", "FR-145-AC-3")]

    #[trace("TC-1827", "FR-145-CON-3")]

    #[test]

    fn tc_1827_shared_supplementary_plane_golden_is_consumed_without_a_digest_sidecar() {'
```

## Validation Evidence

The reviewer inspected the actual logs and controller, without rerunning Cargo.
The user limited this ticket to single-test runs, and the diff changes metadata
only. No broader suite, backend or proof execution is warranted for this review.

- `/tmp/ir1245-red.log`: exact TC-1327 failed with only the two reported
  defects: missing tc_NNNN_ name and the combined criterion string.
- `/tmp/ir1245-fmt.status` and `/tmp/ir1245-fmt.log`: exit 0.
- `/tmp/ir1245-clippy.status` and `/tmp/ir1245-clippy.log`: touched-crate
  all-target clippy with denied warnings, exit 0.
- `/tmp/ir1245-gate.log`: exact TC-1327, one passed, zero failed.
- `/tmp/ir1245-owner.log`: exact renamed TC-1347, one passed, zero failed.
- `/tmp/ir1245-write.log`: exact TC-1827, one passed, zero failed.
- `/tmp/ir1245-focused.sh`: each command uses timeout, the shared Cargo lock,
  a 16 GiB scope and the worktree's target; Cargo build/test commands use -j2.

Code-review and its Rust lane ran as one method/artifact. Gap analysis is not
applicable because there is no production change; spec review and its
sub-analyses are not applicable because no specification or plan changes.
No new duplicated implementation, vendoring, compatibility layer, suppression,
mock, resource cap or public API is introduced.
