---
id: FR-118
title: "Validate Filament Canonical JSON 1"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
---
# FR-118: Validate Filament Canonical JSON 1

## Description

The producer SHALL canonicalize and validate every digested document as
Filament Canonical JSON 1 exactly, emitting no insignificant whitespace,
sorting object keys by Unicode scalar-value order, emitting strings as their
Unicode scalar values without normalization, and serializing every number in
the versioned exact-decimal numeric domain.

## Inputs

- The producer document to be digested, with the object's own digest member
  excluded from the bytes it digests.
- The configuration document's selected canonical-form domain
  `filament-canonical-json-1` and its normalization revision.
- The producer-declared order of every semantic-order array and the
  producer-declared set membership of every set array.
- The implementation resource limits applied to numeric values before
  canonicalization.

## Outputs

- One canonical UTF-8 byte string per digested document, over which the
  `filament-canonical-json-1` digest of [FR-112](./FR-112-emit-versioned-digest-selections.md)
  is computed.
- A blocking refusal naming the offending value when a string is not valid
  Unicode, when a numeric value is not a JSON number, or when a numeric value
  exceeds a declared implementation resource limit.

## Behavior

- The producer SHALL emit no insignificant whitespace in a canonical byte
  string.
- The producer SHALL sort every object's keys by Unicode scalar-value order.
- The producer SHALL emit every string as its Unicode scalar values without
  normalization.
- The producer SHALL escape `"`, `\`, and U+0000 through U+001F as lowercase
  `\u00xx` escapes.
- The producer SHALL refuse a string that is not valid Unicode.
- The producer SHALL parse every JSON number into an arbitrary-precision signed
  base-10 coefficient and exponent.
- The producer SHALL refuse a numeric value that is not a JSON number.
- The producer SHALL NOT coerce a numeric value into binary floating point.
- The producer SHALL remove trailing coefficient zeroes from every parsed
  number.
- The producer SHALL serialize zero as `0`.
- The producer SHALL serialize every nonzero number as the shortest ordinary
  decimal expansion with no exponent, no leading plus, no leading zero, and no
  trailing fractional zero.
- The producer SHALL emit one canonical byte string `1` for each of the JSON
  numbers `1`, `1.0`, and `1e0`.
- The producer SHALL emit different canonical byte strings for
  `9007199254740992` and `9007199254740993`.
- Where an implementation resource limit applies, the producer MAY refuse a
  number before canonicalization.
- The producer SHALL NOT round a value it refuses under a resource limit.
- The producer SHALL NOT substitute a binary64 value for a value it refuses
  under a resource limit.
- The producer SHALL retain the producer-declared order of every array whose
  order is semantic.
- The producer SHALL sort every array that is a set by the canonical bytes of
  its members before digesting.
- The producer SHALL exclude an object's own digest member from the bytes that
  object digests.
- The producer SHALL emit every canonical-form refusal as a blocking input
  refusal.
- The producer SHALL NOT emit a canonical-form refusal as a warning, a cache
  miss, or an invitation to refetch a different version.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-118-CON-1 | The producer SHALL NOT represent a canonical number as a binary floating-point value at any point between parsing and serialization. | Integrity | Test |
| FR-118-CON-2 | The producer SHALL order object keys by Unicode scalar value only, never by locale collation and never by encoded byte length. | Integrity | Test |
| FR-118-CON-3 | The producer SHALL keep a set array's membership a separate declaration from a semantic-order array's order; equal member spelling never merges the two dispositions. | Traceability | Test |
| FR-118-CON-4 | The producer SHALL exclude an object's own digest member from the canonical bytes that object digests. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-118-AC-1 | The JSON numbers `1`, `1.0`, and `1e0` canonicalize to the single byte string `1` and therefore agree on one `filament-canonical-json-1` digest. | Test |
| FR-118-AC-2 | The adjacent integers `9007199254740992` and `9007199254740993` canonicalize to different byte strings and therefore to different digests. | Test |
| FR-118-AC-3 | A decimal value carrying more significant digits than binary64 represents exactly canonicalizes and re-parses to the same arbitrary-precision coefficient and exponent, with no digit rounded and no binary64 value substituted. | Test |
| FR-118-AC-4 | An object whose keys differ in locale collation order and in encoded byte length from their Unicode scalar-value order canonicalizes with its keys in Unicode scalar-value order. | Test |
| FR-118-AC-5 | A string containing `"`, `\`, U+0000, and U+001F canonicalizes with the quote and backslash escaped and each control character emitted as a lowercase `\u00xx` escape. | Test |
| FR-118-AC-6 | A document carrying a string that is not valid Unicode refuses with a blocking refusal and digests nothing. | Test |
| FR-118-AC-7 | Two documents differing only in the member order of one set array digest identically, while two documents differing only in the member order of one semantic-order array digest differently. | Test |
| FR-118-AC-8 | A number exceeding a declared implementation resource limit refuses before canonicalization, and the refusal emits neither a rounded value nor a substituted binary64 value. | Test |

## Dependencies

- [FR-112](./FR-112-emit-versioned-digest-selections.md) selects the digest
  domain `filament-canonical-json-1` and its normalization revision over which
  these canonical bytes are digested.
- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections that name the canonical-form domain.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for Filament Canonical JSON 1.
