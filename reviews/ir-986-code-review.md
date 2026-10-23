---
id: SR-16293
title: code-review review of IR-986 / filament-core-data#308
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data; IR-986; src/compiler/backends/rust-serde/, test/rust-bytes-union.test.ts
review_set: subset
---

## Summary

Reviewed IR-986 / filament-core-data#308 at b051d8dc50ed4eac6a73ad1cf823401982538940. Bytes wire decoding and adjacent unions were checked against the cited criteria; one high Rust generation defect prevents valid constrained Bytes crates from compiling.

## Examined scope

| ID | Role | Excerpt |
| --- | --- | --- |
| FR-032-AC-9 | examined | A `maxLength` of 3 accepts `AQID` and rejects `AQIDBA==`, and a `minLength` of 2 rejects `AA==` and accepts `AP8=`. |
| FR-054-AC-5 | examined | A `union` whose variants carry payloads round-trips as `{"kind":"a","value":"x"}`, a variant with no `payloadType` round-trips as the unit variant `{"kind":"b"}`, the externally tagged form `{"a":"x"}` is refused, as are `{"kind":"b","value":"x"}` and `{"kind":"b","value":null}` on the unit variant, and a `payloadType` on an `enum` variant raises `PAYLOAD_ON_ENUM_VARIANT`. |
| FR-054-AC-6 | examined | A record whose `unknownPolicy` is `reject` fails to deserialize an unknown member; `preserve` retains it with no diagnostic; `surface` retains it and reports one `UNKNOWN_MEMBER_SURFACED`; an `enum` or `union` under `preserve` or `surface` deserializes an unrecognised variant into the catch-all and re-serializes it unchanged, and under `reject` refuses it; the declared policy of each of the five inert kinds appears verbatim in its metadata constant; and no unknown member ever becomes a default value of a known field. |
| FR-054-AC-22 | examined | A `scalar: "bytes"` definition and a field of that type generate the `Bytes` support type; the values with the octets `00 ff` and `01 02 03 04` serialize as `"AP8="` and `"AQIDBA=="`, the empty sequence as `""`, and `"AP8="`, `"AQIDBA=="` and `""` deserialize to them; `"AP8"`, `"AP9="`, `"A P8="` and `"-_8="` each fail to deserialize with a serde error and build no value; the generated crate's `Cargo.toml` still names `serde` as its only dependency. |
| FR-064-AC-5 | examined | A union with one payload-carrying and one payload-free variant renders both member shapes (`{ readonly kind: "a"; readonly value: string }` and `{ readonly kind: "b" }` for variants `a` over `String` and `b` with no payload), and a `switch` over the exported discriminant constant narrows the default arm to `never` under `tsc`. |
| FR-066-AC-29 | examined | A union with variants `a` over `String` and `b` with no payload accepts `{"kind":"a","value":"x"}` and `{"kind":"b"}`, and refuses `{}`, `{"kind":"c"}`, `{"kind":"a"}`, `{"kind":"a","value":1}`, `{"kind":"b","value":"x"}`, `{"kind":"b","value":null}` and `{"kind":"b","extra":1}`, each at the locus of the offending member. |
| FR-100-AC-17 | examined | A union with variants `a` over `String` and `b` with no payload renders a `oneOf` of two closed object branches; the schema accepts `{"kind":"a","value":"x"}` and `{"kind":"b"}` and rejects `{}`, `{"kind":"c"}`, `{"kind":"a"}`, `{"kind":"a","value":1}`, `{"kind":"b","value":"x"}`, `{"kind":"b","value":null}`, `{"a":"x"}` and `{"kind":"b","extra":1}`. |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | The Rust emitter accepts a Bytes scalar with maxLength or minLength, then emits value.chars().count() and value.as_str() for its length check. Bytes exposes neither method, so a valid FR-032 constrained Bytes definition generates an uncompilable crate instead of enforcing octet length. A focused maxLength: 3 fixture returned success with no diagnostics; cargo check failed with E0599 for both calls. | src/compiler/backends/rust-serde/crate.mjs:1478-1485 | implementation-bug-despite-evidence |

## Verdict

FAIL: valid constrained Bytes output does not compile. The focused generated-crate cargo check exited 101 with E0599; the PR should be fixed before merge.

## Checks

- Generated valid Bytes `maxLength: 3` crate: emitter state `success`, zero diagnostics; focused offline `cargo check` failed with E0599 on `chars()` and `as_str()`.
- Reviewed Rust support template decoding, adjacent union generation, mapping/register/docs changes, and changed test assertions. No other independently verified major defect found.
- No full aggregate gate run; focused failure is sufficient to establish this finding.

## Dispositions

Round 1, fix head f47fce599327016583436f235437c8ebe8a8c9a0. Focused `test/rust-bytes-union.test.ts` passed (1 Vitest test; generated Rust wire tests executed under the locked build wrapper). The changed generator uses octet lengths for Bytes; new tests exercise both length boundaries, nonEmpty and enumValues, and a generated record field.

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | Verified at the fix head by source inspection and the focused generated-crate Rust wire test. |
