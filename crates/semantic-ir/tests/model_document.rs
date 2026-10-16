// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! The model-document forms the semantic-IR validator admits: receiver-scoped
//! operation frames, the native `Text` type, and constraints over a value type
//! whose scalar decides the keywords. Every expected result is stated by the
//! QSpec model contract (Frames and value-type rows, FR-013, FR-056) and QSL
//! FR-154 / FR-056, not read back from the validator.

use agent_ix_semantic_ir::{decide, json::parse};

const GENERATED: &str = r#"{"generated":{"generatorIdentity":"ix://agent-ix/conformance/generator/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://agent-ix/filament-core-data/source/typespec"]}}"#;

const HEADER: &str = r#""contractVersion":"2.0.0","canonicalization":{"algorithm":"rfc8785-v1","digest":"sha256-jcs"},"source":{"dialect":"spec-bundle","digest":"sha256:ea98d2dccb8b5d16936209f232e1d8115d404f519f0d110a8f9207190d83bbcf","identity":"ix://acme/pkg/spec","version":"0.0.0"},"package":{"identity":"acme/pkg","lockDigest":"sha256:8b58fb1a6b5d597159c1f0b28c6a2088e5d5eb15665d3add2414c72025e0adc5","manifestDigest":"sha256:c13bc6a59950fbb3338deaec4a8b6975b4815aef8e1756c8262e8b43452de5a6","mappingVersions":["1.0.0"],"profileVersions":[],"version":"0.0.0"},"occurrences":[],"extensions":[]"#;

const MULTIPLICITY: &str = r#"{"lower":1,"upper":1,"ordered":false,"unique":false}"#;

const SCHEMA_VIOLATION: &str = "agent-ix.semantic-ir.SCHEMA_VIOLATION";
const CONSTRAINT_NOT_APPLICABLE: &str = "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE";

/// The value-type construct the QSpec checked-package vectors write: a record
/// shape whose meaning is `quire.meaning.model.value-type/v1`.
const VALUE_TYPE_CONSTRUCT: &str = r#"{"construct":{"identity":"value","meaning":"quire.meaning.model.value-type/v1","members":{},"shape":"record"},"kind":{"module":"acme/pkg","name":"value_type"},"manifestDigest":"sha256:4769687ec63ac998e1ba671267f6305adf8dcaf8c8618329f64232001328b27f","moduleVersion":"1.0.0"}"#;

/// `(pointer, code)` of every diagnostic the validator reports for the
/// document, schema layer first and rules after, as `decide` runs them.
fn diagnostics(constructs: &str, types: &[String]) -> Vec<(String, &'static str)> {
    let bundle = parse(&format!(
        r#"{{"ir":{{{HEADER},"constructs":[{constructs}],"types":[{}]}}}}"#,
        types.join(",")
    ))
    .expect("valid JSON");
    decide(&bundle)
        .diagnostics
        .into_iter()
        .map(|located| (located.pointer, located.code))
        .collect()
}

fn field(identity: &str, name: &str, type_ref: &str) -> String {
    format!(
        r#"{{"identity":"{identity}","name":"{name}","typeRef":"{type_ref}","presence":"required","nullable":false,"defaultKind":"none","origin":{GENERATED},"multiplicity":{MULTIPLICITY},"extensions":[]}}"#
    )
}

/// A record `ix://acme/pkg/T` with one field and one operation `op` whose
/// frame is `frame` (a JSON object text).
fn framed(frame: &str) -> String {
    let operation = format!(
        r#"{{"identity":"ix://acme/pkg/T/op","name":"op","params":[],"pre":[],"post":[],"origin":{GENERATED},"frame":{frame}}}"#
    );
    format!(
        r#"{{"identity":"ix://acme/pkg/T","displayName":"T","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{}],"operations":[{operation}]}}"#,
        field("ix://acme/pkg/T/f", "f", "ix://quire/native/Integer")
    )
}

const FRAME_POINTER: &str = "/ir/types/0/operations/0/frame";

#[test]
fn a_frame_admits_each_receiver_scoped_member() {
    for frame in [
        r#"{"modifies":[],"creates":[],"deletes":[],"modifies_receiver":["ix://acme/pkg/T/f"]}"#,
        r#"{"modifies":[],"creates":[],"deletes":[],"deletes_receiver":true}"#,
        r#"{"modifies":[],"creates":[],"deletes":[],"deletes_receiver":false}"#,
        r#"{"modifies":[],"creates":[],"deletes":[],"deletes_parameters":["a","b"]}"#,
        r#"{"modifies":["ix://acme/pkg/T/f"],"creates":["ix://acme/pkg/T"],"deletes":["ix://acme/pkg/T"],"modifies_receiver":["ix://acme/pkg/T/f"],"deletes_receiver":true,"deletes_parameters":["a"]}"#,
        // The three scoped members stay optional.
        r#"{"modifies":[],"creates":[],"deletes":[]}"#,
    ] {
        assert_eq!(diagnostics("", &[framed(frame)]), vec![], "{frame}");
    }
}

#[test]
fn a_frame_member_of_the_wrong_type_is_refused_at_the_member() {
    for (member, value) in [
        ("modifies_receiver", r#""ix://acme/pkg/T/f""#),
        ("modifies_receiver", r#"{}"#),
        ("deletes_receiver", r#""true""#),
        ("deletes_receiver", r#"1"#),
        ("deletes_receiver", r#"[]"#),
        ("deletes_parameters", r#""a""#),
        ("deletes_parameters", r#"{"a":true}"#),
    ] {
        let frame = format!(r#"{{"modifies":[],"creates":[],"deletes":[],"{member}":{value}}}"#);
        assert_eq!(
            diagnostics("", &[framed(&frame)]),
            vec![(format!("{FRAME_POINTER}/{member}"), SCHEMA_VIOLATION)],
            "{frame}"
        );
    }
}

#[test]
fn a_non_string_element_of_a_scoped_array_is_refused_at_the_member() {
    for member in ["modifies_receiver", "deletes_parameters"] {
        for element in ["1", "null", "true", r#"{"a":1}"#, r#"["a"]"#] {
            let frame = format!(
                r#"{{"modifies":[],"creates":[],"deletes":[],"{member}":["x",{element}]}}"#
            );
            assert_eq!(
                diagnostics("", &[framed(&frame)]),
                vec![(format!("{FRAME_POINTER}/{member}"), SCHEMA_VIOLATION)],
                "{frame}"
            );
        }
    }
}

#[test]
fn a_frame_member_the_schema_does_not_name_is_refused() {
    let frame = r#"{"modifies":[],"creates":[],"deletes":[],"deletes_scoped":[]}"#;
    assert_eq!(
        diagnostics("", &[framed(frame)]),
        vec![(FRAME_POINTER.to_string(), SCHEMA_VIOLATION)]
    );
}

#[test]
fn a_frame_missing_a_required_array_is_refused() {
    for missing in ["modifies", "creates", "deletes"] {
        let members: Vec<String> = ["modifies", "creates", "deletes"]
            .into_iter()
            .filter(|name| *name != missing)
            .map(|name| format!(r#""{name}":[]"#))
            .collect();
        let frame = format!(r#"{{{},"deletes_receiver":true}}"#, members.join(","));
        assert_eq!(
            diagnostics("", &[framed(&frame)]),
            vec![(FRAME_POINTER.to_string(), SCHEMA_VIOLATION)],
            "{frame}"
        );
    }
}

fn text_field_type() -> String {
    format!(
        r#"{{"identity":"ix://acme/pkg/Item","displayName":"Item","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{}]}}"#,
        field(
            "ix://acme/pkg/Item/label",
            "label",
            "ix://quire/native/Text"
        )
    )
}

#[test]
fn a_field_typed_by_the_native_text_name_resolves() {
    assert_eq!(diagnostics("", &[text_field_type()]), vec![]);
}

fn constraint(id: &str, keyword: &str, operands: &str, applies_to: &str) -> String {
    format!(
        r#"{{"identity":"ix://acme/pkg/constraint/{id}","keyword":"{keyword}","operands":{operands},"appliesTo":"{applies_to}","diagnosticCode":"acme.pkg.{id}","origin":{GENERATED}}}"#
    )
}

/// A value type `ix://acme/pkg/V` over `scalar` holding `constraints`.
fn value_type(scalar: &str, constraints: &[String]) -> String {
    format!(
        r#"{{"identity":"ix://acme/pkg/V","displayName":"V","kind":{{"module":"acme/pkg","name":"value_type"}},"roles":[],"origin":{GENERATED},"constraints":[{}],"extensions":[],"unknownPolicy":"reject","scalar":"{scalar}"}}"#,
        constraints.join(",")
    )
}

const V: &str = "ix://acme/pkg/V";

#[test]
fn a_string_value_type_takes_the_text_constraints_applied_to_itself() {
    let constraints = [
        constraint("min", "minLength", r#"{"value":1}"#, V),
        constraint("max", "maxLength", r#"{"value":8}"#, V),
        constraint("fmt", "format", r#"{"name":"text-profile:nfc"}"#, V),
    ];
    assert_eq!(
        diagnostics(VALUE_TYPE_CONSTRUCT, &[value_type("string", &constraints)]),
        vec![]
    );
}

#[test]
fn an_integer_value_type_takes_the_integer_constraints_applied_to_itself() {
    let constraints = [
        constraint("min", "min", r#"{"value":"0"}"#, V),
        constraint("max", "max", r#"{"value":"9"}"#, V),
    ];
    assert_eq!(
        diagnostics(VALUE_TYPE_CONSTRUCT, &[value_type("integer", &constraints)]),
        vec![]
    );
}

#[test]
fn a_keyword_the_value_types_scalar_does_not_define_is_not_applicable() {
    // `min` is defined for numeric scalars, never for string; `minLength` is
    // defined for string, never for integer.
    let on_string = [constraint("min", "min", r#"{"value":"0"}"#, V)];
    assert_eq!(
        diagnostics(VALUE_TYPE_CONSTRUCT, &[value_type("string", &on_string)]),
        vec![(
            "/ir/types/0/constraints/0".to_string(),
            CONSTRAINT_NOT_APPLICABLE
        )]
    );
    let on_integer = [constraint("len", "minLength", r#"{"value":1}"#, V)];
    assert_eq!(
        diagnostics(VALUE_TYPE_CONSTRUCT, &[value_type("integer", &on_integer)]),
        vec![(
            "/ir/types/0/constraints/0".to_string(),
            CONSTRAINT_NOT_APPLICABLE
        )]
    );
}
