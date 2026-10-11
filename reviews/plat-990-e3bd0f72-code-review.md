---
id: SR-260
title: PLAT-990 PR 278 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@254a893a360eb9bc6da344c992c2283c8fb129c9; PLAT-990;
  changed production, tests, schema, fixtures, and spec/functional FR-035/036/059/069/090/097/145
review_set: subset
---

## Summary

Ticket: PLAT-990. code-review review of the frozen candidate.

## Verdict

FAIL. Findings require explicit dispositions before merge.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The Python normalizer labels output rfc8785-v1 but serializes a schema-valid extension payload 1e-7 as 1e-07; Node/RFC 8785 emits 1e-7. The normalized bytes and their digests disagree. The same formatter emits 1e21 as an integer instead of 1e+21. Use RFC 8785 number spelling and add cross-reader numeric vectors. | tests/semantic_ir_reader.py:787-805 |
| FND-002 | high | The TypeScript normalizer labels output rfc8785-v1 yet accepts an unpaired surrogate in types[0].displayName and emits \ud800. The published schema admits this input, but RFC 8785 section 3.2.2.2 requires a refusal. Check string values and member names at the normalization boundary, including the compiler and oracle paths. | src/compiler/backends/typescript-v1/canonical.mjs:109-110,228-233 |

## Coverage

Reviewed the exact frozen PR #278 delta against c3cbd03593a6171fe55e1be87ef0629e0d82d31a. The base contains merged PR #279 and its numeric-bound test correction; no .github/workflows file changed. No PR file was edited. No aggregate gate was started; the lead captures that separately. git diff --check passed. Quire spec validation exited 0; its existing grammar warnings are retained in spec-validation.log. No applicable AssuranceProfile was found. Repository CONTRIBUTING.md and default rust-style conventions were read. The Rust review found no added unsafe block, panic path, async/lock hazard, numeric cast, or weakened gate in the changed production Rust code.

The shared supplementary-plane golden checks U+10000 before U+E000 and its exact SHA-256 value in TC-1827. The digest sidecar is computed from ValidDocument.bytes, including its descriptor. TC-1828 exercises a failed document rename after publishing the digest and confirms temp cleanup. Its existing temp paths match with_suffix (no leading dot). Descriptor presence and exact members are required in the published schema and Rust reader. Four refusal mutations were added. No upstream code/fixture copies were added; independently implemented readers predate this PR and are an explicit repository verification boundary.

Ticket AC-5 asks for QSL intake agreement. Local QSL intake has moved to quire-canonical, but this review has no exact downstream run over the shared golden; that acceptance evidence remains unavailable. This is not a claim that the downstream criterion passed. The metadata's digest is part of the requested canonical identity and verification contract, so the generic spec-review prohibition on unrequested file-tracking digests does not apply.

Plan completion: not assessed

The whole-tree static matrix contains 223 tagged, 1552 untagged, 4 tagged-by-ignored-test, and 381 method-without-symbol criteria. These totals are context; this PR review records introduced FR-145 gaps and does not claim the pre-existing repository gaps were remediated. The evidence-backed matrix has no recorded run evidence. Changed production behavior is owned by FR-145 and the edited FR-035/036/059/069/090/097 requirements. Optional repository-wide semantic audit was not requested; focused acceptance comparison was explicitly part of this review.

## Reproduction

Use reproduction.mjs from this review directory while the working directory is the frozen worktree. Its schema-valid numeric extension and displayName mutations reproduce both findings; reproduction.log preserves the actual outputs. The normative basis is [RFC 8785 sections 3.2.2.2 and 3.2.2.3](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.2.2.2).

## Examined units

```yaml
clean: false
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
findings:
- fnd: FND-001
  severity: high
  confidence: high
  method: code-review
  check: code-bug
  artifact_id: FR-145
  related_ids: []
  path: tests/semantic_ir_reader.py
  lines: 787-805
  excerpt: "The normalizer SHALL encode numbers, strings, and escapes according to\
    \ RFC\n  8785 and SHALL reject a value that RFC 8785 cannot encode without changing\n\
    \  its meaning."
  finding: The Python normalizer labels output rfc8785-v1 but serializes a schema-valid
    extension payload 1e-7 as 1e-07; Node/RFC 8785 emits 1e-7. The normalized bytes
    and their digests disagree. The same formatter emits 1e21 as an integer instead
    of 1e+21. Use RFC 8785 number spelling and add cross-reader numeric vectors.
- fnd: FND-002
  severity: high
  confidence: high
  method: code-review
  check: code-bug
  artifact_id: FR-145
  related_ids: []
  path: src/compiler/backends/typescript-v1/canonical.mjs
  lines: 109-110,228-233
  excerpt: "The normalizer SHALL encode numbers, strings, and escapes according to\
    \ RFC\n  8785 and SHALL reject a value that RFC 8785 cannot encode without changing\n\
    \  its meaning."
  finding: The TypeScript normalizer labels output rfc8785-v1 yet accepts an unpaired
    surrogate in types[0].displayName and emits \ud800. The published schema admits
    this input, but RFC 8785 section 3.2.2.2 requires a refusal. Check string values
    and member names at the normalization boundary, including the compiler and oracle
    paths.
bindings:
- test_id: tc_1827_shared_supplementary_plane_golden_is_consumed_and_digest_sidecar_is_exact
  ac_id: FR-145-AC-3
  trace: correct
- test_id: tc_1828_digest_is_published_before_document_and_cleans_up_on_document_failure
  ac_id: FR-145-CON-2
  trace: correct
```

## Dispositions

Round 1, reviewed e3bd0f7210ec076e1497900c4f7ba987c304bf15.

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 3e459b5baf75f8998a0da0651a217b778d268aca |
| FND-002 | fixed | 955a285f05b4d2802c392031229eb54f87d105c2 |

## Disposition evidence

Exact-head disposition check completed at e3bd0f7210ec076e1497900c4f7ba987c304bf15. All nine round-1 findings are fixed. Original finding rows and original review scope remain immutable; these latest dispositions supersede their initial open status.

Re-ran the original schema-valid Python/TypeScript reproduction: both now emit 1e-7 and identical normalized bytes; the malformed displayName is refused. Focused probes of oracle, compiler, target serializer, and Python refuse malformed keys/values and non-finite values, while preserving valid supplementary-plane ordering. The second TypeScript reader has explicit string and finite-number checks covered by TC-1830/1836. Rust parse rejects lone surrogate escapes and non-finite binary64 lexemes; caller-built invalid Json::Number is rejected by try_to_canonical_string with CanonicalError. The legacy String-returning functions intentionally return empty, non-JSON bytes on that invalid input. A direct linked-crate probe confirms the semantic verdict is Invalid with an INEXACT_INTEGER diagnostic and no panic, rather than a false Success.

Reviewed fcd-278-plat990-no-panic-focused.log: Rust JSON focused tests 3 passed; conformance corpus 5 passed including tc_704 and tc_708; extraction check, oracle TC-1833, and second TypeScript TC-1836 passed. The preceding oracle/Rust focused log records all 95 oracle corpus tests passing, tc_1327 passing, and formatting/typecheck passing. No full gate was started by this reviewer. The lead owns the exact final aggregate gate; the earlier aggregate remained nonzero with reported baseline environment/qualification failures, so this disposition does not claim a green aggregate.

The fresh computed matrix reports every FR-145 executable criterion tagged and the two inspection obligations method-without-symbol. Tests assert descriptor refusal, array preservation/object order invariance, lock vectors, repeated/environment-varied extraction, and shared golden digest bytes. The dependency contradiction is removed and the materialization/schema bullets are separate. No workflow changed against c3cbd035; git diff --check passed.

Review disposition: PASS, no open review findings and no new defect found in the requested changed canonicalization paths. Mergeability remains subject to the lead's canonical gate decision and custody of these updated SR files. Downstream QSL execution was outside this FCD disposition; this is not a claim that ticket AC-5 has independent downstream execution evidence.

```yaml
dispositions:
- fnd: FND-001
  outcome: fixed
  fix_sha: 3e459b5baf75f8998a0da0651a217b778d268aca
  after_excerpt: "    if -6 <= scientific_exponent < 21:\n        if decimal_place\
    \ <= 0:\n            rendered = \"0.\" + \"0\" * -decimal_place + digits"
- fnd: FND-002
  outcome: fixed
  fix_sha: 955a285f05b4d2802c392031229eb54f87d105c2
  after_excerpt: "\tif (typeof value === \"string\") return canonicalString(value);\n\
    \tif (typeof value === \"number\" && !Number.isFinite(value))\n\t\tthrow new TypeError(\"\
    non-finite number is not RFC 8785 JSON\");"
```
