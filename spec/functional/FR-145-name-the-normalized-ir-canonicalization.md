---
id: FR-145
title: "Name the canonicalization carried by normalized semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/quire-spec-language/FR-056"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
---
# FR-145: Name the canonicalization carried by normalized semantic IR

## Description

The normalized Semantic IR document SHALL identify the canonicalization that
produced its bytes, so a reader can verify the digest domain without inferring
an algorithm from member order. This requirement settles
[filament-core-data#222](https://github.com/agent-ix/filament-core-data/issues/222)
and the GAP-004 question carried by [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md).

The normalized document's `canonicalization` descriptor SHALL be:

```json
{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}
```

`rfc8785-v1` names RFC 8785 JSON Canonicalization Scheme. Its object member
ordering is RFC 8785 UTF-16 code-unit ordering, its number and string spelling
is RFC 8785 spelling, and its arrays retain the order supplied by the semantic
document. The extraction frontend may order declared semantic sets before
serialization as required by [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md);
that input ordering is separate from the JSON serializer's array rule.

The pre-normalization authoring value is not a published Semantic IR document;
the normalizer materializes this descriptor before schema validation and
publication. The `digest` member names the digest domain. It is not the digest value itself:
the actual value is carried in the producer's digest field or sidecar as
`sha256:<64 lowercase hexadecimal digits>`, and QSL represents the same bytes
in its existing `sha256-jcs:<64 lowercase hexadecimal digits>` envelope.

The normalized document and its `sha256-jcs` digest therefore use one named
byte domain. The identity-sorted-set extension remains a separate named domain:
`RFC8785-JCS-with-identity-sorted-sets-v1` is used only where
[FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md) declares the
package-lock fingerprint, or where a later requirement explicitly names that
domain and supplies its own vectors. It SHALL NOT be silently substituted for
the normalized document form.

## Inputs

- A Semantic IR document at contract version `2.0.0`
- The semantic sets and authored array order of that document
- RFC 8785 JCS encoding rules
- The selected canonicalization descriptor

## Outputs

- A normalized Semantic IR document carrying the exact
  `canonicalization: {"algorithm":"rfc8785-v1","digest":"sha256-jcs"}`
  descriptor
- Canonical bytes in the `rfc8785-v1` domain
- A `sha256-jcs` digest over those bytes when a digest is requested
- A QSL intake result that recomputes the same bytes and digest

## Behavior

- The normalizer SHALL materialize the exact two-member descriptor
  `{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}` before schema
  validation and publication. The published `semantic-ir.schema.json` SHALL
  require and validate that descriptor; a pre-normalization authoring value
  that omits it is not admitted as a normalized document.
- A reader SHALL accept a normalized document only when its canonicalization
  descriptor is present, has exactly the `algorithm` and `digest` members, and
  names `rfc8785-v1` and `sha256-jcs`, respectively.
- A reader SHALL produce a located refusal for an unknown, missing, or extra
  canonicalization descriptor member.
- The normalizer SHALL encode object member names using RFC 8785 UTF-16
  code-unit ordering.
- The normalizer SHALL preserve JSON array order while encoding the normalized
  document.
- The normalizer SHALL apply no identity-sorted-set rule while encoding the
  normalized document.
- The normalizer SHALL encode numbers, strings, and escapes according to RFC
  8785 and SHALL reject a value that RFC 8785 cannot encode without changing
  its meaning.
- The FCD digest writer SHALL compute the SHA-256 value for a normalized
  document over the exact `rfc8785-v1` bytes, including the document's
  canonicalization descriptor, and SHALL label that value with the
  `sha256-jcs` domain.
- The package-lock fingerprint SHALL continue to name and use
  `RFC8785-JCS-with-identity-sorted-sets-v1` with the included and excluded
  byte sets declared by FR-048. The lock fingerprint and normalized-document
  digest SHALL never share an unlabeled digest helper or an ambiguous label.
- QSL intake SHALL recompute the `sha256-jcs` digest from the admitted
  document using the same `rfc8785-v1` bytes and SHALL refuse a selection when
  the declared digest differs.
- A normalized document carrying a supplementary-plane member name SHALL use
  the RFC 8785 UTF-16 ordering. For example, U+10000 sorts before U+E000 in
  the canonical object bytes even though its Unicode code point is greater;
  the implementation SHALL not substitute Unicode scalar-value ordering.
- The shared golden at
  `test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` SHALL
  include a supplementary-plane member name and record `algorithm`, `digest`,
  `expectedBytes`, and the expected SHA-256 value together. The FCD semantic
  positive fixture is
  `fixtures/semantic/v1/positive/semantic-ir-v1-1.json`; its refusal mutations are the four `ir-canonicalization-*` cases in
  `fixtures/semantic/v1/negative/cases.json`.
- QSL's existing `qsl-semantics/tests/it/model_intake.rs` test
  `every_corpus_package_admits_under_its_recorded_digest` and the QSL
  contracts FR-056 and IT-012 SHALL remain the integration evidence for
  RFC 8785 bytes and the `sha256-jcs` envelope. This requirement does not
  claim a QSL fixture or parity test that has not landed in QSL.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-145-CON-1 | The normalized document and the package-lock fingerprint SHALL have distinct algorithm labels and byte-domain definitions. | Integrity | Inspection |
| FR-145-CON-2 | The normalized-document digest writer SHALL use the exact bytes the normalized document carries; parsed structural equality and a different serializer are prohibited. | Correctness | Test |
| FR-145-CON-3 | The FCD normalizer and QSL intake SHALL agree through the published `rfc8785-v1` definition and golden vectors; inference from observed member order is prohibited. | Interoperability | Integration Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-145-AC-1 | One FCD contract document names `rfc8785-v1` as the canonicalization carried by a normalized Semantic IR document and distinguishes it from `RFC8785-JCS-with-identity-sorted-sets-v1`. | Inspection |
| FR-145-AC-2 | A normalized document contains exactly `{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}` in its canonicalization descriptor; a missing, unknown, or extra descriptor member is refused with a located diagnostic. The published schema and reader contract accept the exact descriptor and reject each mutation. | Test |
| FR-145-AC-3 | `test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` contains both U+10000 and U+E000 member names, records `algorithm`, `digest`, `expectedBytes`, and `sha256`, and is byte-identical to RFC 8785 JCS UTF-16 ordering. The `rfc8785-v1` domain hashes those exact bytes. | Test |
| FR-145-AC-4 | Reordering object members does not change normalized bytes, while changing a semantic value does; array order remains authored and no identity-sorted-set extension is applied to normalized bytes. | Property |
| FR-145-AC-5 | The package-lock fingerprint continues to use its separately named identity-sorted-set algorithm and its existing golden vectors; changing that algorithm does not silently change the normalized-document algorithm. | Test |
| FR-145-AC-6 | QSL's existing `qsl-semantics/tests/it/model_intake.rs::every_corpus_package_admits_under_its_recorded_digest` and FR-056/IT-012 evidence the RFC 8785 bytes and `sha256-jcs:<64 lowercase hexadecimal digits>` envelope; a document whose declared digest used code-point ordering or another serializer is refused. | Integration Test |
| FR-145-AC-7 | The FCD normalizer and extraction frontend consume the shared golden and produce byte-identical canonical output under different locales and working directories. | Integration Test |

## Dependencies

- **Upstream**: [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md)
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), and QSL [FR-056](ix://agent-ix/quire-spec-language/FR-056-admit-domain-package-model-declarations.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
