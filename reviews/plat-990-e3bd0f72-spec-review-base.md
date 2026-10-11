---
id: SR-262
title: PLAT-990 PR 278 spec-review/base
type: SpecReview
analysis: base
scope: agent-ix/filament-core-data@254a893a360eb9bc6da344c992c2283c8fb129c9; PLAT-990;
  changed production, tests, schema, fixtures, and spec/functional FR-035/036/059/069/090/097/145
review_set: subset
---

## Summary

Ticket: PLAT-990. spec-review/base review of the frozen candidate.

## Verdict

PASS. No additional defect found through this lens; other method findings still block the PR.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Reviewed the exact frozen PR #278 delta against c3cbd03593a6171fe55e1be87ef0629e0d82d31a. The base contains merged PR #279 and its numeric-bound test correction; no .github/workflows file changed. No PR file was edited. No aggregate gate was started; the lead captures that separately. git diff --check passed. Quire spec validation exited 0; its existing grammar warnings are retained in spec-validation.log. No applicable AssuranceProfile was found. Repository CONTRIBUTING.md and default rust-style conventions were read. The Rust review found no added unsafe block, panic path, async/lock hazard, numeric cast, or weakened gate in the changed production Rust code.

The shared supplementary-plane golden checks U+10000 before U+E000 and its exact SHA-256 value in TC-1827. The digest sidecar is computed from ValidDocument.bytes, including its descriptor. TC-1828 exercises a failed document rename after publishing the digest and confirms temp cleanup. Its existing temp paths match with_suffix (no leading dot). Descriptor presence and exact members are required in the published schema and Rust reader. Four refusal mutations were added. No upstream code/fixture copies were added; independently implemented readers predate this PR and are an explicit repository verification boundary.

Ticket AC-5 asks for QSL intake agreement. Local QSL intake has moved to quire-canonical, but this review has no exact downstream run over the shared golden; that acceptance evidence remains unavailable. This is not a claim that the downstream criterion passed. The metadata's digest is part of the requested canonical identity and verification contract, so the generic spec-review prohibition on unrequested file-tracking digests does not apply.

Plan completion: not assessed

The whole-tree static matrix contains 223 tagged, 1552 untagged, 4 tagged-by-ignored-test, and 381 method-without-symbol criteria. These totals are context; this PR review records introduced FR-145 gaps and does not claim the pre-existing repository gaps were remediated. The evidence-backed matrix has no recorded run evidence. Changed production behavior is owned by FR-145 and the edited FR-035/036/059/069/090/097 requirements. Optional repository-wide semantic audit was not requested; focused acceptance comparison was explicitly part of this review.

## Examined units

```yaml
clean: true
scope:
- id: FR-145-AC-1
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: One FCD contract document names `rfc8785-v1` as the canonicalization carried
    by a normalized Semantic IR document and distinguishes it from `RFC8785-JCS-with-identity-sorted-sets-v1`.
- id: FR-145-AC-2
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: A normalized document contains exactly `{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}`
    in its canonicalization descriptor; a missing, unknown, or extra descriptor member
    is refused with a located diagnostic. The published schema and reader contract
    accept the exact descriptor and reject each mutation.
- id: FR-145-AC-3
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: '`test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` contains
    both U+10000 and U+E000 member names, records `algorithm`, `digest`, `expectedBytes`,
    and `sha256`, and is consumed by `crates/extraction-frontend/tests/write.rs::tc_1827_shared_supplementary_plane_golden_is_consumed_and_digest_sidecar_is_exact`,
    which checks RFC 8785 JCS UTF-16 bytes and the `sha256-jcs:<64 lowercase hexadecimal
    digits>` value.'
- id: FR-145-AC-4
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: Reordering object members does not change normalized bytes, while changing
    a semantic value does; array order remains authored and no identity-sorted-set
    extension is applied to normalized bytes.
- id: FR-145-AC-5
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The package-lock fingerprint continues to use its separately named identity-sorted-set
    algorithm and its existing golden vectors; changing that algorithm does not silently
    change the normalized-document algorithm.
- id: FR-145-AC-7
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The FCD semantic reader consumes the shared golden, and extraction frontend
    tests `TC-1300` and `TC-1301` produce byte-identical normalized output across
    repeated runs, changed working directories, locales, and target directories.
- id: FR-145-CON-1
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The normalized document and the package-lock fingerprint SHALL have distinct
    algorithm labels and byte-domain definitions.
- id: FR-145-CON-2
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The normalized-document digest writer SHALL use the exact bytes the normalized
    document carries; parsed structural equality and a different serializer are prohibited.
- id: FR-145-CON-3
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: The FCD normalizer and digest sidecar writer SHALL use the published `rfc8785-v1`
    definition and golden vectors; inference from observed member order is prohibited.
- id: FR-145
  path: spec/functional/FR-145-name-the-normalized-ir-canonicalization.md
  role: examined
  excerpt: "The normalizer SHALL encode numbers, strings, and escapes according to\
    \ RFC\n  8785 and SHALL reject a value that RFC 8785 cannot encode without changing\n\
    \  its meaning."
- id: FR-036-AC-6
  path: spec/functional/FR-036-implement-the-independent-semantic-oracle.md
  role: examined
  excerpt: For every `2.0.0` document in the corpus, `normalized` is byte-identical
    to the `rfc8785-v1` form of the input after materializing the `canonicalization`
    descriptor and `nullable`; the supplementary-plane vector at `test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json`
    proves UTF-16 object-key ordering.
- id: FR-069-CON-3
  path: spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md
  role: examined
  excerpt: The normalized and fingerprint forms SHALL retain their separate published
    algorithm labels and byte domains; a local canonicalizer silently substituting
    one for the other is prohibited.
- id: FR-069-CON-5
  path: spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md
  role: examined
  excerpt: The backend implementation SHALL NOT change a byte of `schema/semantic/v1/**`
    or `docs/semantic-data-system/**`; contract changes are authored by the owning
    specification requirement.
- id: FR-069-CON-6
  path: spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md
  role: examined
  excerpt: '`canonical.mjs` SHALL declare `IDENTITY_SET_PATHS`, the key-ordering rule,
    and the selected algorithm label as data in one module, so a later contract revision
    is a data edit rather than a rewrite of every rule that reads them.'
- id: FR-069-AC-23
  path: spec/functional/FR-069-canonicalize-and-classify-the-ir-surface.md
  role: examined
  excerpt: The `rfc8785-v1` and identity-sorted-set forms differ for a document whose
    set members are out of identity order, and agree for one already in order; a supplementary-plane
    key also proves the normalized form uses RFC 8785 UTF-16 ordering.
- id: FR-090-AC-7
  path: spec/functional/FR-090-prove-cross-language-agreement.md
  role: examined
  excerpt: For each of `preserve`, `reject`, and `surface`, the four agree on the
    fate of an undeclared member, and a `preserve` document round-trips canonically
    equal under `rfc8785-v1` in all four, byte-identical only where the package retained
    the source bytes.
findings: []
bindings: []
```
