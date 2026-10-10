//! Independent Rust reader for the Filament semantic IR v1 contract.
//!
//! Every rule this crate decides is derived from `schema/semantic/v1/*.json`,
//! `docs/semantic-data-system/contracts-v1.md`, and
//! `conformance/diagnostic-codes.json`, and from nothing else.
//! `crates/semantic-ir/RULES.md` beside this file records the derivation source
//! of each one, and FR-059-CON-1 forbids this crate to read or link
//! `conformance/oracle/` or `src/compiler/ir/`.
//!
//! ```
//! use agent_ix_semantic_ir::{decide, json::parse};
//! // fcd#179: contract 1.0.0 is deleted; `schema::semantic_ir` closes
//! // `contractVersion` to `["2.0.0"]` (`expect_enum` in `schema.rs`), so this
//! // document's single diagnostic is SCHEMA_VIOLATION at `/ir/contractVersion`,
//! // "contractVersion is a closed enumeration and 1.0.0 is not a member" —
//! // real version enforcement, not an artifact of the fragment's other
//! // absent members.
//! let bundle = parse(r#"{"ir":{"contractVersion":"1.0.0"}}"#).expect("a document");
//! let verdict = decide(&bundle);
//! assert!(!verdict.diagnostics.is_empty());
//! ```
#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod compat;
pub mod constructs;
pub mod diag;
pub mod json;
pub mod normalize;
pub mod number;
pub mod patch;
pub mod regex262;
pub mod rules;
pub mod schema;
pub mod vocabulary;

use crate::diag::{Located, Severity};
use crate::json::{to_canonical_string, Json};

/// The three states a verdict can take.
///
/// `spec/functional/FR-036`: "`success` when it emits no diagnostic, `invalid`
/// when it emits at least one diagnostic of severity `error`, and `lossy` when
/// it emits at least one diagnostic and none of severity `error`".
/// `unsupported`, `unavailable` and `partial` are adapter states, not verdicts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResultState {
    /// No diagnostic.
    Success,
    /// At least one error.
    Invalid,
    /// At least one diagnostic, none an error.
    Lossy,
}

impl ResultState {
    /// The wire name.
    pub fn as_str(self) -> &'static str {
        match self {
            ResultState::Success => "success",
            ResultState::Invalid => "invalid",
            ResultState::Lossy => "lossy",
        }
    }
}

/// One verdict over one input bundle.
pub struct Verdict {
    /// The result state.
    pub result_state: ResultState,
    /// The ordered diagnostics.
    pub diagnostics: Vec<Located>,
    /// The corpus comparison form of the bundle's IR document.
    pub normalized: String,
}

/// Decides one input bundle.
///
/// The schema layer runs first, and when it produces any diagnostic it is the
/// only layer that speaks, so a schema-decided case is decided once.
/// `normalized` is produced either way, because the harness compares the string
/// unconditionally.
pub fn decide(bundle: &Json) -> Verdict {
    decide_with(bundle, rules::RuleLimits::default())
}

/// [`decide`] under `limits`, each used as the caller gives it.
pub fn decide_with(bundle: &Json, limits: rules::RuleLimits) -> Verdict {
    let mut diagnostics = schema::decide(bundle);
    if diagnostics.is_empty() {
        diagnostics = rules::decide_with(bundle, limits);
    }
    order(&mut diagnostics);
    // An `info` diagnostic is advisory: a document carrying only advisories is
    // accepted as it stands.
    let result_state = if diagnostics
        .iter()
        .all(|diagnostic| diagnostic.severity == Severity::Info)
    {
        ResultState::Success
    } else if diagnostics
        .iter()
        .any(|diagnostic| diagnostic.severity == Severity::Error)
    {
        ResultState::Invalid
    } else {
        ResultState::Lossy
    };
    Verdict {
        result_state,
        diagnostics,
        normalized: normalize::normalized(bundle),
    }
}

/// Orders diagnostics by `pointer` under a code-point comparison, then by
/// `code`, then by `message`, then by the canonical form of the diagnostic, so
/// that no two diagnostics tie and no comparison is locale-sensitive.
fn order(diagnostics: &mut [Located]) {
    diagnostics.sort_by(|left, right| {
        left.pointer
            .as_bytes()
            .cmp(right.pointer.as_bytes())
            .then_with(|| left.code.as_bytes().cmp(right.code.as_bytes()))
            .then_with(|| left.message.as_bytes().cmp(right.message.as_bytes()))
            .then_with(|| {
                let locus = |diagnostic: &Located| {
                    diagnostic
                        .locus
                        .as_ref()
                        .map(to_canonical_string)
                        .unwrap_or_default()
                };
                locus(left).into_bytes().cmp(&locus(right).into_bytes())
            })
    });
}

/// Whether a bundle's document layer accepts it.
pub fn is_valid(bundle: &Json) -> bool {
    decide(bundle).result_state != ResultState::Invalid
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::parse;

    /// The Rust reader sees the same exact-numeric overflow case exercised by
    /// the Node, Python, and oracle differential test. Keeping the
    /// case here prevents that parity claim from depending on a generated
    /// backend consumer alone.
    ///
    /// Tracing: FR-144-CON-1
    #[test]
    fn fr_144_numeric_reader_reports_the_shared_i128_pointer() {
        let scalar = format!(
            r#"{{"identity":"ix://probe/Integer","displayName":"Integer","kind":"scalar","scalar":"integer","roles":[],"origin":{GENERATED},"constraints":[{{"identity":"ix://probe/IntegerMax","keyword":"max","operands":{{"value":"170141183460469231731687303715884105728"}},"appliesTo":"ix://probe/Integer","diagnosticCode":"ix://probe/INTEGER_MAX","origin":{GENERATED}}}],"extensions":[],"unknownPolicy":"reject"}}"#
        );
        let bundle = parse(&format!(r#"{{"ir":{{{HEADER},"types":[{scalar}]}}}}"#))
            .expect("a schema-valid numeric reader case");
        let diagnostics = decide(&bundle).diagnostics;
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(
            diagnostics[0].code,
            "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128"
        );
        assert_eq!(
            diagnostics[0].pointer,
            "/ir/types/0/constraints/0/operands/value"
        );
    }

    /// FR-144-AC-8: Read from bytes, a document holding
    /// `9007199254740993` at any depth, the inside of an `any` default
    /// included, raises `INEXACT_INTEGER` at that number's pointer and no
    /// parse failure.
    ///
    /// Trace: FR-144-AC-8
    #[test]
    fn fr_144_raw_bytes_find_inexact_integer_inside_any_default() {
        let record = format!(
            r#"{{"identity":"ix://probe/Holder","displayName":"Holder","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{{"identity":"ix://probe/Holder/payload","name":"payload","typeRef":"ix://quire/native/JsonObject","presence":"required","nullable":false,"defaultKind":"semantic","defaultValue":{{"nested":9007199254740993}},"origin":{GENERATED},"multiplicity":{{"lower":1,"upper":1,"ordered":false,"unique":false}},"extensions":[]}}]}}"#
        );
        let bundle = parse(&format!(r#"{{"ir":{{{HEADER},"types":[{record}]}}}}"#))
            .expect("a schema-valid raw numeric case");
        let diagnostics = decide(&bundle).diagnostics;
        assert!(diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "agent-ix.semantic-ir.INEXACT_INTEGER"
                && diagnostic.pointer == "/ir/types/0/fields/0/defaultValue/nested"
        }));
    }

    /// FR-144-AC-9: A `multiplicity.upper`, a `maxLength` operand, or a source
    /// span's `startLine` of `9007199254740991` is accepted, and `9007199254740992`
    /// raises `SCHEMA_VIOLATION` at it; a decimal policy's `precision` or
    /// `scale` of `9007199254740992` raises the same code at that member.
    ///
    /// Trace: FR-144-AC-9
    #[test]
    fn fr_144_raw_bytes_check_safe_metadata_integer_boundaries() {
        fn bundle(value: &str) -> String {
            format!(
                r#"{{"ir":{{{HEADER},"types":[{{"identity":"ix://probe/Text","displayName":"Text","kind":"scalar","scalar":"string","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject"}},{{"identity":"ix://probe/Holder","displayName":"Holder","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{{"identity":"ix://probe/Holder/value","name":"value","typeRef":"ix://quire/native/String","presence":"required","nullable":false,"defaultKind":"none","origin":{{"source":{{"sourceIdentity":"ix://probe/Source","path":"probe.tsp","startLine":{value},"startColumn":{value}}}}},"multiplicity":{{"lower":1,"upper":{value},"ordered":false,"unique":false}},"constraints":[{{"identity":"ix://probe/Holder/value/maxLength","keyword":"maxLength","operands":{{"value":{value}}},"appliesTo":"ix://probe/Holder/value","diagnosticCode":"ix://probe/MAX_LENGTH","origin":{GENERATED}}}],"extensions":[]}}]}}]}}}}"#
            )
        }

        let safe = parse(&bundle("9007199254740991")).expect("safe metadata integers parse");
        assert!(decide(&safe).diagnostics.is_empty());

        let unsafe_bundle =
            parse(&bundle("9007199254740992")).expect("unsafe metadata integers parse");
        let diagnostics = decide(&unsafe_bundle).diagnostics;
        for pointer in [
            "/ir/types/1/fields/0/origin/source/startLine",
            "/ir/types/1/fields/0/origin/source/startColumn",
            "/ir/types/1/fields/0/multiplicity/upper",
            "/ir/types/1/fields/0/constraints/0/operands/value",
        ] {
            assert!(
                diagnostics.iter().any(|diagnostic| {
                    diagnostic.code == "agent-ix.semantic-ir.SCHEMA_VIOLATION"
                        && diagnostic.pointer == pointer
                }),
                "missing exact-number diagnostic at {pointer}"
            );
        }

        fn decimal_bundle(value: &str) -> String {
            format!(
                r#"{{"ir":{{{HEADER},"types":[{{"identity":"ix://probe/Price","displayName":"Price","kind":"scalar","scalar":"decimal","decimal":{{"precision":{value},"scale":{value}}},"roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject"}}]}}}}"#
            )
        }
        let safe_decimal =
            parse(&decimal_bundle("9007199254740991")).expect("safe decimal policy parses");
        assert!(decide(&safe_decimal).diagnostics.is_empty());
        let unsafe_decimal =
            parse(&decimal_bundle("9007199254740992")).expect("unsafe decimal policy parses");
        let decimal_diagnostics = decide(&unsafe_decimal).diagnostics;
        for pointer in ["/ir/types/0/decimal/precision", "/ir/types/0/decimal/scale"] {
            assert!(
                decimal_diagnostics.iter().any(|diagnostic| {
                    diagnostic.code == "agent-ix.semantic-ir.SCHEMA_VIOLATION"
                        && diagnostic.pointer == pointer
                }),
                "missing exact-number diagnostic at {pointer}"
            );
        }
    }

    /// A bundle carrying a value nested a million levels deep at a member the
    /// schema does not admit is decided, not overflowed: the schema layer
    /// reports the member, and the diagnostics, the verdict's normalized form
    /// and the bundle drop without recursion.
    ///
    /// Tracing: TC-1822
    /// ACs: FR-059-AC-21
    #[test]
    fn tc_1822_decides_a_bundle_nested_a_million_levels_deep_on_a_small_stack() {
        const DEPTH: usize = 1_000_000;
        std::thread::Builder::new()
            .stack_size(512 * 1024)
            .spawn(|| {
                let deep = format!("{}0{}", "[".repeat(DEPTH), "]".repeat(DEPTH));
                let text = format!(
                    r#"{{"ir":{{"contractVersion":"2.0.0","types":[{{"identity":"ix://acme/pkg/T","kind":"record","deep":{deep}}}]}}}}"#
                );
                let bundle = parse(&text).expect("a million levels read");
                let verdict = decide(&bundle);
                assert_eq!(verdict.result_state, ResultState::Invalid);
                assert!(
                    verdict
                        .diagnostics
                        .iter()
                        .any(|located| located.pointer.starts_with("/ir/types/0")),
                    "{:?}",
                    verdict.diagnostics.len()
                );
                assert!(verdict.normalized.len() > 2 * DEPTH);
                assert!(!is_valid(&bundle));
            })
            .expect("spawn a 512 KiB thread")
            .join()
            .expect("deciding must not overflow a 512 KiB stack");
    }

    const GENERATED: &str = r#"{"generated":{"generatorIdentity":"ix://agent-ix/conformance/generator/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://agent-ix/filament-core-data/source/typespec"]}}"#;

    fn multiplicity(lower: i64, upper: i64) -> String {
        format!(r#"{{"lower":{lower},"upper":{upper},"ordered":false,"unique":false}}"#)
    }

    fn operation(identity: &str, upper: i64, redefines: &str) -> String {
        format!(
            r#"{{"identity":"{identity}","name":"size","params":[],"pre":[],"post":[],"origin":{GENERATED},"returns":{{"typeRef":"ix://quire/native/Integer","multiplicity":{},"nullable":false}}{redefines}}}"#,
            multiplicity(1, upper)
        )
    }

    fn record(identity: &str, supertypes: &str, operations: &str) -> String {
        format!(
            r#"{{"identity":"{identity}","displayName":"T","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[],"operations":[{operations}]{supertypes}}}"#
        )
    }

    /// The members of a `2.0.0` IR document besides its types.
    const HEADER: &str = r#""contractVersion":"2.0.0","source":{"dialect":"spec-bundle","digest":"sha256:ea98d2dccb8b5d16936209f232e1d8115d404f519f0d110a8f9207190d83bbcf","identity":"ix://acme/pkg/spec","version":"0.0.0"},"package":{"identity":"acme/pkg","lockDigest":"sha256:8b58fb1a6b5d597159c1f0b28c6a2088e5d5eb15665d3add2414c72025e0adc5","manifestDigest":"sha256:c13bc6a59950fbb3338deaec4a8b6975b4815aef8e1756c8262e8b43452de5a6","mappingVersions":["1.0.0"],"profileVersions":[],"version":"0.0.0"},"occurrences":[],"extensions":[],"constructs":[]"#;

    /// A `Base` and a `Sub` specializing it, each with a `size` operation;
    /// `sub_operation` is `Sub`'s.
    fn operations_bundle(base_upper: i64, sub_operation: &str) -> Json {
        let base = record(
            "ix://acme/pkg/Base",
            "",
            &operation("ix://acme/pkg/Base/size", base_upper, ""),
        );
        let sub = record(
            "ix://acme/pkg/Sub",
            r#","supertypes":["ix://acme/pkg/Base"]"#,
            sub_operation,
        );
        parse(&format!(r#"{{"ir":{{{HEADER},"types":[{base},{sub}]}}}}"#)).expect("a bundle")
    }

    fn codes(bundle: &Json) -> Vec<(String, String)> {
        decide(bundle)
            .diagnostics
            .into_iter()
            .map(|located| {
                (
                    located
                        .code
                        .trim_start_matches("agent-ix.semantic-ir.")
                        .to_string(),
                    located.pointer,
                )
            })
            .collect()
    }

    /// An operation carries `redefines` as a field does: the identity of the
    /// supertype operation it narrows.
    ///
    /// Tracing: TC-1823
    /// ACs: FR-141-AC-10
    #[test]
    fn tc_1823_an_operation_redefines_a_supertype_operation() {
        let redefines = |target: &str| format!(r#","redefines":"{target}""#);
        let at = "/ir/types/1/operations/0/redefines";
        let narrowing = operation(
            "ix://acme/pkg/Sub/size",
            1,
            &redefines("ix://acme/pkg/Base/size"),
        );
        assert_eq!(codes(&operations_bundle(3, &narrowing)), []);
        // A target that is no operation of a supertype.
        let unresolved = operation(
            "ix://acme/pkg/Sub/size",
            1,
            &redefines("ix://acme/pkg/Base/gone"),
        );
        assert_eq!(
            codes(&operations_bundle(3, &unresolved)),
            [("UNRESOLVED_FEATURE_REF".to_string(), at.to_string())]
        );
        // A return multiplicity wider than the redefined operation's.
        let widening = operation(
            "ix://acme/pkg/Sub/size",
            9,
            &redefines("ix://acme/pkg/Base/size"),
        );
        assert_eq!(
            codes(&operations_bundle(3, &widening)),
            [("INVALID_REDEFINITION".to_string(), at.to_string())]
        );
        // A value that is no identity is a schema violation.
        let malformed = operation("ix://acme/pkg/Sub/size", 1, r#","redefines":"size""#);
        assert_eq!(
            codes(&operations_bundle(3, &malformed)),
            [("SCHEMA_VIOLATION".to_string(), at.to_string())]
        );
    }

    fn text_bundle(field_profile: &str, type_members: &str) -> Json {
        text_bundle_of("String", field_profile, type_members)
    }

    fn text_bundle_of(native: &str, field_profile: &str, type_members: &str) -> Json {
        let field = format!(
            r#"{{"identity":"ix://acme/pkg/Item/sku","name":"sku","typeRef":"ix://quire/native/{native}","presence":"required","nullable":false,"defaultKind":"none","origin":{GENERATED},"multiplicity":{}{field_profile}}}"#,
            multiplicity(1, 1)
        );
        let item = format!(
            r#"{{"identity":"ix://acme/pkg/Item","displayName":"Item","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{field}]}}"#
        );
        let code = format!(
            r#"{{"identity":"ix://acme/pkg/Code","displayName":"Code","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject"{type_members}}}"#
        );
        parse(&format!(r#"{{"ir":{{{HEADER},"types":[{item},{code}]}}}}"#)).expect("a bundle")
    }

    /// A text profile is a text member: a field whose type resolves to an
    /// integer is refused, and one that resolves to text through an alias is not.
    ///
    /// Tracing: TC-1824
    /// ACs: FR-141-AC-11
    #[test]
    fn tc_1824_a_text_profile_on_a_non_text_field_is_refused() {
        let field_at = "/ir/types/0/fields/0/textProfile".to_string();
        let profile = r#","textProfile":"nfc""#;
        let string = r#","kind":"scalar","scalar":"string""#;
        assert_eq!(
            codes(&text_bundle_of("Integer", profile, string)),
            [("SCHEMA_VIOLATION".to_string(), field_at)]
        );
        assert_eq!(codes(&text_bundle_of("String", profile, string)), []);
    }

    /// An operation that declares no `returns` returns no value (`0..0`), so
    /// redefining across that line leaves the redefined bounds.
    ///
    /// Tracing: TC-1823
    /// ACs: FR-141-AC-10
    #[test]
    fn tc_1823_a_redefinition_agrees_with_the_redefined_operation_on_returning() {
        let at = "/ir/types/1/operations/0/redefines".to_string();
        let silent = |identity: &str, redefines: &str| {
            format!(
                r#"{{"identity":"{identity}","name":"size","params":[],"pre":[],"post":[],"origin":{GENERATED}{redefines}}}"#
            )
        };
        let redefines = r#","redefines":"ix://acme/pkg/Base/size""#;
        // Base returns, Sub does not.
        assert_eq!(
            codes(&operations_bundle(
                3,
                &silent("ix://acme/pkg/Sub/size", redefines)
            )),
            [("INVALID_REDEFINITION".to_string(), at.clone())]
        );
        // Sub returns, Base does not.
        let base = record(
            "ix://acme/pkg/Base",
            "",
            &silent("ix://acme/pkg/Base/size", ""),
        );
        let sub = record(
            "ix://acme/pkg/Sub",
            r#","supertypes":["ix://acme/pkg/Base"]"#,
            &operation("ix://acme/pkg/Sub/size", 1, redefines),
        );
        let bundle = parse(&format!(r#"{{"ir":{{{HEADER},"types":[{base},{sub}]}}}}"#)).unwrap();
        assert_eq!(codes(&bundle), [("INVALID_REDEFINITION".to_string(), at)]);
        // Neither returns.
        let sub = record(
            "ix://acme/pkg/Sub",
            r#","supertypes":["ix://acme/pkg/Base"]"#,
            &silent("ix://acme/pkg/Sub/size", redefines),
        );
        let bundle = parse(&format!(r#"{{"ir":{{{HEADER},"types":[{base},{sub}]}}}}"#)).unwrap();
        assert_eq!(codes(&bundle), []);
    }

    /// `decide` on a schema-valid document carrying a million-level extension
    /// payload succeeds on a 512 KiB thread.
    ///
    /// Tracing: TC-1822
    /// ACs: FR-059-AC-21
    #[test]
    fn tc_1822_decides_a_schema_valid_deep_payload_on_a_small_stack() {
        const DEPTH: usize = 1_000_000;
        std::thread::Builder::new()
            .stack_size(512 * 1024)
            .spawn(|| {
                let deep = format!("{}0{}", "[".repeat(DEPTH), "]".repeat(DEPTH));
                let extension = format!(
                    r#"{{"identity":"ix://acme/pkg/extension/deep","payload":{deep},"required":false,"version":"1.0.0"}}"#
                );
                let item = format!(
                    r#"{{"identity":"ix://acme/pkg/Item","displayName":"Item","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[{extension}],"unknownPolicy":"reject","fields":[]}}"#
                );
                let bundle = parse(&format!(r#"{{"ir":{{{HEADER},"types":[{item}]}}}}"#))
                    .expect("a million levels read");
                let verdict = decide(&bundle);
                assert_eq!(
                    verdict.result_state,
                    ResultState::Success,
                    "{:?}",
                    verdict.diagnostics.first().map(|d| (&d.code, &d.pointer))
                );
            })
            .expect("spawn a 512 KiB thread")
            .join()
            .expect("deciding must not overflow a 512 KiB stack");
    }

    /// A text field, and a text value type (a scalar of scalar `string`),
    /// carry a `textProfile` from the closed set; no other value, and no
    /// other kind of type, does.
    ///
    /// Tracing: TC-1824
    /// ACs: FR-141-AC-11
    #[test]
    fn tc_1824_a_text_field_and_a_text_value_type_carry_a_text_profile() {
        let string = r#","kind":"scalar","scalar":"string""#;
        for profile in [
            "unicode-scalars",
            "nfc",
            "nfd",
            "nfkc",
            "nfkd",
            "binary-utf8",
        ] {
            let field = format!(r#","textProfile":"{profile}""#);
            let value_type = format!(r#"{string},"textProfile":"{profile}""#);
            assert_eq!(codes(&text_bundle(&field, &value_type)), [], "{profile}");
        }
        let field_at = "/ir/types/0/fields/0/textProfile";
        for refused in [r#""NFC""#, r#""""#, "1", r#""nfc ""#] {
            let field = format!(r#","textProfile":{refused}"#);
            assert_eq!(
                codes(&text_bundle(&field, string)),
                [("SCHEMA_VIOLATION".to_string(), field_at.to_string())],
                "{refused}"
            );
        }
        let type_at = "/ir/types/1";
        for kind in [
            r#","kind":"scalar","scalar":"integer","textProfile":"nfc""#,
            r#","kind":"record","fields":[],"textProfile":"nfc""#,
        ] {
            let found = codes(&text_bundle("", kind));
            assert!(
                found
                    .iter()
                    .any(|(code, pointer)| code == "SCHEMA_VIOLATION"
                        && pointer.starts_with(type_at)),
                "{kind}: {found:?}"
            );
        }
    }

    fn bound_bundle(native: &str, operand: &str) -> Json {
        bound_bundle_of("max", native, operand)
    }

    fn bound_bundle_with_decimal_policy(native: &str, operand: &str) -> Json {
        bound_bundle_of_with_policy("max", native, operand, true)
    }

    fn bound_bundle_of(keyword: &str, native: &str, operand: &str) -> Json {
        bound_bundle_of_with_policy(keyword, native, operand, false)
    }

    fn bound_bundle_of_with_policy(
        keyword: &str,
        native: &str,
        operand: &str,
        decimal_policy: bool,
    ) -> Json {
        let constraint = format!(
            r#"{{"identity":"ix://acme/pkg/constraint/Item-count-max","appliesTo":"ix://acme/pkg/Item/count","keyword":"{keyword}","operands":{{"value":{operand}}},"diagnosticCode":"acme.pkg.ITEM_COUNT_MAX","origin":{GENERATED}}}"#
        );
        let policy = if native == "Decimal" && decimal_policy {
            r#", "decimal":{"precision":38,"scale":0}"#
        } else {
            ""
        };
        let field = format!(
            r#"{{"identity":"ix://acme/pkg/Item/count","name":"count","typeRef":"ix://quire/native/{native}","presence":"required","nullable":false,"defaultKind":"none","origin":{GENERATED},"multiplicity":{}{policy},"constraints":[{constraint}]}}"#,
            multiplicity(1, 1)
        );
        let item = format!(
            r#"{{"identity":"ix://acme/pkg/Item","displayName":"Item","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{field}]}}"#
        );
        parse(&format!(r#"{{"ir":{{{HEADER},"types":[{item}]}}}}"#)).expect("a bundle")
    }

    /// An integer bound is a number or a canonical decimal string, so a bound
    /// past 2^53 is exact; a non-canonical string is refused.
    ///
    /// Tracing: TC-1825
    /// ACs: FR-050-AC-14
    #[test]
    fn tc_1825_an_integer_bound_accepts_a_canonical_decimal_string() {
        let at = "/ir/types/0/fields/0/constraints/0/operands/value".to_string();
        for accepted in [
            r#""18446744073709551615""#,
            r#""-9223372036854775809""#,
            r#""0""#,
            "7",
        ] {
            assert_eq!(codes(&bound_bundle("Integer", accepted)), [], "{accepted}");
        }
        for refused in [
            r#""01""#, r#""+1""#, r#"" 1""#, r#""1 ""#, r#""-0""#, r#""1.0""#,
        ] {
            assert_eq!(
                codes(&bound_bundle("Integer", refused)),
                [("INVALID_OPERAND".to_string(), at.clone())],
                "{refused}"
            );
        }
        // The schema refuses an empty string before any rule reads it.
        assert_eq!(
            codes(&bound_bundle("Integer", r#""""#)),
            [("SCHEMA_VIOLATION".to_string(), at.clone())]
        );
        assert_eq!(
            codes(&bound_bundle("Integer", "true")),
            [("SCHEMA_VIOLATION".to_string(), at.clone())]
        );
        // Each of the four bound keywords takes the same operand forms.
        for keyword in ["min", "max", "exclusiveMin", "exclusiveMax"] {
            assert_eq!(
                codes(&bound_bundle_of(
                    keyword,
                    "Integer",
                    r#""18446744073709551615""#
                )),
                [],
                "{keyword}"
            );
            assert_eq!(
                codes(&bound_bundle_of(keyword, "Integer", r#""007""#)),
                [("INVALID_OPERAND".to_string(), at.clone())],
                "{keyword}"
            );
        }
        // A Decimal bound requires a policy on its resolution walk.
        assert_eq!(
            codes(&bound_bundle("Decimal", r#""18446744073709551615""#)),
            [
                (
                    "DECIMAL_POLICY_MISSING".to_string(),
                    "/ir/types/0/fields/0".to_string(),
                ),
                (
                    "DECIMAL_POLICY_MISSING".to_string(),
                    "/ir/types/0/fields/0/constraints/0".to_string(),
                ),
                (
                    "INVALID_OPERAND".to_string(),
                    "/ir/types/0/fields/0/constraints/0/operands/value".to_string(),
                ),
            ]
        );
        assert_eq!(
            codes(&bound_bundle_with_decimal_policy(
                "Decimal",
                r#""18446744073709551615""#
            )),
            []
        );
    }

    /// `decide` on a schema-valid 100,000-link alias chain, and on 100,000
    /// invalid types, finishes in linear time: every alias is walked once and
    /// the schema layer's findings are not compared pairwise.
    ///
    /// Tracing: TC-1821
    /// ACs: FR-059-AC-20
    #[test]
    fn tc_1821_decide_on_100000_types_is_linear() {
        const COUNT: usize = 100_000;
        let alias = |position: usize, target: &str| {
            format!(
                r#"{{"identity":"ix://acme/pkg/A{position}","displayName":"A","kind":"alias","target":"{target}","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject"}}"#
            )
        };
        let mut types = Vec::with_capacity(COUNT + 1);
        for position in 0..COUNT {
            let target = if position + 1 < COUNT {
                format!("ix://acme/pkg/A{}", position + 1)
            } else {
                "ix://acme/pkg/Leaf".to_string()
            };
            types.push(alias(position, &target));
        }
        // A record of fields typed by the head of the chain, each carrying a
        // text profile and a unit, so each resolves that chain once.
        let fields: Vec<String> = (0..COUNT / 5)
            .map(|position| {
                format!(
                    r#"{{"identity":"ix://acme/pkg/Holder/f{position}","name":"f{position}","typeRef":"ix://acme/pkg/A0","presence":"required","nullable":false,"defaultKind":"none","origin":{GENERATED},"multiplicity":{},"textProfile":"nfc"}}"#,
                    multiplicity(1, 1)
                )
            })
            .collect();
        types.push(format!(
            r#"{{"identity":"ix://acme/pkg/Holder","displayName":"Holder","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{}]}}"#,
            fields.join(",")
        ));
        types.push(format!(
            r#"{{"identity":"ix://acme/pkg/Leaf","displayName":"Leaf","kind":"scalar","scalar":"string","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject"}}"#
        ));
        let valid = parse(&format!(
            r#"{{"ir":{{{HEADER},"types":[{}]}}}}"#,
            types.join(",")
        ))
        .expect("a bundle");
        let started = std::time::Instant::now();
        assert_eq!(decide(&valid).result_state, ResultState::Success);
        let valid_time = started.elapsed();
        // The same chain with a required member missing from every type: one
        // schema finding per type.
        let broken = types.join(",").replace(r#","unknownPolicy":"reject""#, "");
        let invalid =
            parse(&format!(r#"{{"ir":{{{HEADER},"types":[{broken}]}}}}"#)).expect("a bundle");
        let started = std::time::Instant::now();
        assert_eq!(decide(&invalid).result_state, ResultState::Invalid);
        // Quadratic work on either takes many minutes in a debug build; the
        // linear passes take seconds. The bound leaves a busy machine room.
        let limit = std::time::Duration::from_secs(60);
        assert!(valid_time < limit, "valid {valid_time:?}");
        assert!(started.elapsed() < limit, "invalid {:?}", started.elapsed());
    }
}
