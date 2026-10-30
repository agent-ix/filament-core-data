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
produced its bytes, so a reader knows how to compare normalized documents
without inferring an algorithm from member order. The descriptor is
`{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}` under the published
`2.0.0` wire. Its `digest` member is an algorithm-domain label, not a digest
value or a requirement to emit a digest sidecar. The writer SHALL emit no
sidecar or computed digest as a substitute for direct normalized-byte comparison.

`rfc8785-v1` names RFC 8785 JSON Canonicalization Scheme: UTF-16 code-unit
object-member order, RFC 8785 number and string spelling, and authored array
order. FR-097 may sort semantic sets before serialization; the serializer
itself preserves the resulting arrays.

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

## Behavior

- The normalizer SHALL materialize the exact two-member descriptor
  `{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}` before schema
  validation and publication.
- The published `semantic-ir.schema.json` SHALL require and validate that
  descriptor; a pre-normalization authoring value that omits it is not admitted
  as a normalized document.
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
- The FCD frontend SHALL NOT write a normalized-document digest sidecar.
- A normalized document carrying a supplementary-plane member name SHALL use
  the RFC 8785 UTF-16 ordering. For example, U+10000 sorts before U+E000 in
  the canonical object bytes even though its Unicode code point is greater;
  the implementation SHALL not substitute Unicode scalar-value ordering.
- The shared golden at
  `test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` SHALL
  include a supplementary-plane member name and record `algorithm`, `digest`,
  `expectedBytes` together. The FCD semantic
  positive fixture is
  `fixtures/semantic/v1/positive/semantic-ir-v1-1.json`; its refusal mutations are the four `ir-canonicalization-*` cases in
  `fixtures/semantic/v1/negative/cases.json`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-145-CON-3 | The FCD normalizer SHALL use the published `rfc8785-v1` definition and golden vectors; inference from observed member order is prohibited. | Interoperability | Integration Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-145-AC-1 | One FCD contract document names `rfc8785-v1` as the canonicalization carried by a normalized Semantic IR document. | Inspection |
| FR-145-AC-2 | A normalized document contains exactly `{"algorithm":"rfc8785-v1","digest":"sha256-jcs"}` in its canonicalization descriptor; a missing, unknown, or extra descriptor member is refused with a located diagnostic. The published schema and reader contract accept the exact descriptor and reject each mutation. | Test |
| FR-145-AC-3 | `test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json` contains both U+10000 and U+E000 member names and records the expected RFC 8785 JCS UTF-16 canonical bytes; the extraction frontend and Semantic IR reader consume the same vector and emit no digest sidecar. | Test |
| FR-145-AC-4 | Reordering object members does not change normalized bytes, while changing a semantic value does; array order remains authored and no identity-sorted-set extension is applied to normalized bytes. | Property |
| FR-145-AC-7 | The FCD semantic reader consumes the shared golden, and extraction frontend tests `TC-1300` and `TC-1301` produce byte-identical normalized output across repeated runs, changed working directories, locales, and target directories. | Integration Test |

## PLAT-1205 retirement

`FR-145-CON-1`, `FR-145-CON-2`, and `FR-145-AC-5` are retired with the package-lock fingerprint and document digest sidecar. The algorithm-domain label remains part of the existing wire so canonical bytes can be interpreted consistently; it carries no digest value.

## Dependencies

- **Upstream**: [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md)
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md) and [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
