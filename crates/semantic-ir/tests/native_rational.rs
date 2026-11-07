// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

use agent_ix_semantic_ir::{decide, json::parse};

const ORIGIN: &str = r#"{"generated":{"generatorIdentity":"ix://acme/config/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://acme/config/source"]}}"#;
const MULTIPLICITY: &str = r#"{"lower":1,"upper":1,"ordered":false,"unique":false}"#;
const RATIONAL: &str = "ix://quire/native/Rational";

fn member(identity: &str, name: &str, type_ref: &str, extra: &str) -> String {
    format!(
        r#"{{"identity":"{identity}","name":"{name}","typeRef":"{type_ref}","multiplicity":{MULTIPLICITY},"presence":"required","nullable":false,"defaultKind":"none"{extra},"origin":{ORIGIN}}}"#
    )
}

/// A schema-complete document: one record with a field, an operation
/// parameter and an operation result typed `type_ref`, `field_extra` added to
/// the field and `constraints` on the record.
fn document(type_ref: &str, field_extra: &str, constraints: &str) -> String {
    let field = member("ix://acme/config/Config/r", "r", type_ref, field_extra);
    let param = member("ix://acme/config/Config/op/by", "by", type_ref, "");
    format!(
        r#"{{"ir":{{"contractVersion":"2.0.0","canonicalization":{{"algorithm":"rfc8785-v1"}},"source":{{"identity":"ix://test/orders/source","version":"1","dialect":"spec-bundle"}},"package":{{"identity":"acme/config","version":"1","mappingVersions":["1.0.0"],"profileVersions":[]}},"constructs":[],"types":[{{"identity":"ix://acme/config/Config","displayName":"Config","kind":"record","roles":[],"origin":{ORIGIN},"constraints":[{constraints}],"extensions":[],"unknownPolicy":"reject","fields":[{field}],"operations":[{{"identity":"ix://acme/config/Config/op","name":"op","params":[{param}],"returns":{{"typeRef":"{type_ref}","multiplicity":{MULTIPLICITY},"nullable":false}},"pre":[],"post":[],"origin":{ORIGIN}}}]}}],"occurrences":[],"extensions":[]}}}}"#
    )
}

fn codes(text: &str) -> Vec<(&'static str, String)> {
    let bundle = parse(text).expect("authored document is JSON");
    decide(&bundle)
        .diagnostics
        .into_iter()
        .map(|d| (d.code, d.pointer))
        .collect()
}

fn constraint(keyword: &str, operand: &str) -> String {
    format!(
        r#"{{"identity":"ix://acme/config/Config/c","keyword":"{keyword}","operands":{operand},"appliesTo":"{RATIONAL}","diagnosticCode":"ix://acme/config/C","origin":{ORIGIN}}}"#
    )
}

/// Tracing: TC-1842
/// ACs: FR-146-AC-1
#[test]
fn tc_1842_bare_rational_field_param_and_result_are_accepted_with_no_diagnostic() {
    assert_eq!(codes(&document(RATIONAL, "", "")), vec![]);
}

/// A misspelled native name is still refused, and `decimal` on a Rational
/// member is a policy conflict, so Rational carries no decimal policy.
///
/// Tracing: TC-1842
/// ACs: FR-146-AC-1
#[test]
fn tc_1842_rational_name_is_exact_and_carries_no_decimal_policy() {
    let wrong = codes(&document("ix://quire/native/rational", "", ""));
    assert!(wrong
        .iter()
        .all(|(code, _)| *code == "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF"));
    assert!(!wrong.is_empty());
    let decimal = codes(&document(
        RATIONAL,
        r#","decimal":{"precision":4,"scale":2}"#,
        "",
    ));
    assert!(
        !decimal.is_empty(),
        "decimal on a Rational member is refused"
    );
}

/// The adverse consequence of the `string` scalar (FR-146 "The native
/// set"): a `min` bound on `Rational` is not applicable, and a string-row
/// keyword is.
///
/// Tracing: TC-1842
/// ACs: FR-146-AC-1
#[test]
fn tc_1842_rational_applicability_is_the_string_row() {
    let min = codes(&document(
        RATIONAL,
        "",
        &constraint("min", r#"{"value":"1/2"}"#),
    ));
    assert_eq!(
        min.iter().map(|(code, _)| *code).collect::<Vec<_>>(),
        vec!["agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE"],
        "{min:?}"
    );
    let length = codes(&document(
        RATIONAL,
        "",
        &constraint("minLength", r#"{"value":1}"#),
    ));
    assert_eq!(length, vec![], "minLength is admitted on the string row");
}
