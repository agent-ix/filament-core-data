---
id: SR-035
title: "Code review of the semantic IR v1.1 revision"
type: SpecReview
analysis: code-review
scope: "schema/semantic/v1/, fixtures/semantic/v1/, docs/semantic-data-system/contracts-v1.md, test/semantic-ir-v1-1.test.ts, test/semantic-ir-v1-1-reader.ts, tests/"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-005"
    type: reviews
---
# Code review of the semantic IR v1.1 revision

## Summary

The issue #34 implementation adds the v1.1 node families to one discriminated
schema file, two independent cross-field readers (TypeScript and Python), 43
recorded verdicts on which both readers agree byte-for-byte, and a zero-loss
`ConfigVersion` worked example, without touching the spike, a backend, a
generated package, or a corpus repository. Three findings were repaired before
this artifact was written; two are recorded as accepted limits with their
consequence named.

## Verdict

**CONDITIONAL** — no high finding; two medium findings remain open by design
(regex dialect stand-in, `poetry`-dependent integration case) and are recorded
in the plan.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-120 | medium | Resolved during review: the Python canonical form serialized integral floats as `1.0` while the TypeScript form emits `1`, so TC-232's byte comparison would have diverged on the first non-integer fixture value; the Python reader now applies the ES6/RFC 8785 integral-number form. | tests/semantic_ir_reader.py, TC-232, FR-020-AC-7 |
| FND-121 | medium | Resolved during review: the pytest module used bare functions without the house class/docstring shape and carried no AC ids; it now follows the Test Standards contract. An unused `SCHEMA_BASE` constant was removed. | tests/test_semantic_ir_v1_1.py, tests/semantic_ir_reader.py |
| FND-122 | medium | Accepted limit: the Python reader compiles `pattern.regex` with Python `re` as a stand-in for `ecma-262`; the dialects differ on some constructs (lookbehind rules, `\\u{}` escapes, named-group syntax), so a future disagreement between the readers on a pattern case is a real finding, not noise. Recorded in the reader docstring. | tests/semantic_ir_reader.py, FR-029-AC-8, TC-245 |
| FND-123 | medium | Accepted limit: TC-232 shells out to `poetry run python`, so the Vitest case fails hard when the poetry environment is absent rather than skipping; this is deliberate (never hide errors) and the plan names the `poetry install` prerequisite. | test/semantic-ir-v1-1.test.ts, TC-232 |
| FND-124 | low | Composite-cycle loci are reported at the edge that closes the cycle in document-order depth-first traversal; both readers implement the same order and the reader case records it, but an author reading FR-028 may expect the first authored edge. | fixtures/semantic/v1/negative/reader-cases.json, FR-028-AC-10 |
| FND-125 | low | No stub, skipped case, mock, placeholder return, `TODO`, warning suppression, coverage pragma, or unowned production behavior was found; every changed path is inside the NFR-013 permitted set and the four prior issue guards were extended, not weakened. | Plan-005, test/semantic-ir-v1-1.test.ts |

## Test and Boundary Review

- Twenty-eight Vitest cases carry every TC-203..247 tag; the Python side adds
  four pytest cases. Both readers agree on 43 verdicts (4 golden documents,
  20 schema negatives, 19 reader negatives) including normalized bytes and
  diagnostic loci.
- The schema stays strict (`additionalProperties: false` everywhere;
  union `type` arrays replaced by `anyOf` so Ajv strict mode compiles).
- Properties: 64 seeded multiplicity mutations (TC-203) and 48 seeded documents
  across all five node kinds (TC-233) round-trip the normalized form.
- Boundaries: `0..0`, `lower < 0`, `upper < lower`, flags on `1..1`, unit on a
  record, unresolved `typeRef`, composite self-reference and two-node cycle,
  dangling `post`, duplicate `clauseId`/param/identity, bare unknown language,
  string operand on a numeric bound, `minLength` on a number, non-compiling
  regex, retired dialect on `1.1.0`, frontend dialect on `1.0.0`, `1.2.0`,
  unknown manifest target.

## Spec-Code Faithfulness

- FR-027: multiplicity/unit schema, derived presence, alias resolution,
  materialization rule, classifier families — implemented and traced.
- FR-028: three node schemas, record-only restriction, target resolution
  against document or lock exports, acyclic composites, `clauseId` binding and
  uniqueness, FR-040 parity against the installed `spec-artifacts-iso`
  manifest — implemented and traced.
- FR-029: `oneOf` over six keyword groups with closed operands; applicability
  and regex compilation in both readers — implemented and traced.
- FR-030: `contractVersion` enum and conditional dialect in one file; shared
  generated-target and representation-format registries; manifest targets
  bind to the declared registry because the frozen v1 manifest selects
  `markdown` (FR-030 was amended to say so before implementation).
- NFR-013: v1 fixture digests unchanged, `spikes/` untouched, changed-path
  guard, compatibility corpus entry `v1-to-v1-1-additive-revision`, fixture
  inventory check.

## Host notes

- `test/contract-census.test.ts > resolves every source locus` fails on this
  Linux host because the census snapshot records macOS `localPath` values; it
  pre-dates the branch and is outside issue #34.
- `pnpm spike:typespec:check` diverges at `custom/rust/Cargo.lock` under this
  host's cargo 1.94.1 before any branch change; TC-234 is discharged by the
  `spikes/` diff guard.
