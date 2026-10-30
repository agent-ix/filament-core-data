// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

//! The model-document forms the semantic-IR validator admits: receiver-scoped
//! operation frames, the native `Text` type, and constraints over a value type
//! whose scalar decides the keywords. Every expected result is stated by the
//! QSpec model contract (Frames and value-type rows, FR-013, FR-056) and QSL
//! FR-154 / FR-056, not read back from the validator.

use agent_ix_semantic_ir::{decide, json::parse};

const GENERATED: &str = r#"{"generated":{"generatorIdentity":"ix://agent-ix/conformance/generator/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://agent-ix/filament-core-data/source/typespec"]}}"#;

const HEADER: &str = r#""contractVersion":"2.0.0","canonicalization":{"algorithm":"rfc8785-v1","digest":"sha256-jcs"},"source":{"dialect":"spec-bundle","identity":"ix://acme/pkg/spec","version":"0.0.0"},"package":{"identity":"acme/pkg","mappingVersions":["1.0.0"],"profileVersions":[],"version":"0.0.0"},"occurrences":[],"extensions":[]"#;

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

/// Trace: FR-141
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

/// Trace: FR-141
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

/// Trace: FR-141
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

/// Trace: FR-141
#[test]
fn a_frame_member_the_schema_does_not_name_is_refused_at_that_member() {
    let frame = r#"{"modifies":[],"creates":[],"deletes":[],"modifies_self":[]}"#;
    assert_eq!(
        diagnostics("", &[framed(frame)]),
        vec![(format!("{FRAME_POINTER}/modifies_self"), SCHEMA_VIOLATION)]
    );
}

/// Trace: FR-141
#[test]
fn a_frame_missing_a_required_array_is_refused_at_the_absent_member() {
    for missing in ["modifies", "creates", "deletes"] {
        let members: Vec<String> = ["modifies", "creates", "deletes"]
            .into_iter()
            .filter(|name| *name != missing)
            .map(|name| format!(r#""{name}":[]"#))
            .collect();
        let frame = format!(r#"{{{},"deletes_receiver":true}}"#, members.join(","));
        assert_eq!(
            diagnostics("", &[framed(&frame)]),
            vec![(format!("{FRAME_POINTER}/{missing}"), SCHEMA_VIOLATION)],
            "{frame}"
        );
    }
}

/// Trace: FR-141
#[test]
fn a_frame_entry_written_twice_is_one_entry() {
    let frame = r#"{"modifies":["ix://acme/pkg/T/f","ix://acme/pkg/T/f"],"creates":["ix://acme/pkg/T","ix://acme/pkg/T"],"deletes":["ix://acme/pkg/T","ix://acme/pkg/T"]}"#;
    assert_eq!(diagnostics("", &[framed(frame)]), vec![]);
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

/// Trace: FR-141
#[test]
fn a_field_typed_by_the_native_text_name_resolves() {
    assert_eq!(diagnostics("", &[text_field_type()]), vec![]);
}

/// Trace: FR-146-AC-1
#[test]
fn a_clock_field_is_admitted_without_a_declared_type() {
    let record = format!(
        r#"{{"identity":"ix://acme/pkg/Call","displayName":"Call","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{}]}}"#,
        field("ix://acme/pkg/Call/x", "x", "ix://quire/native/Clock")
    );
    assert_eq!(diagnostics("", &[record]), vec![]);
}

/// Trace: FR-146-AC-2
#[test]
fn a_clock_operation_parameter_and_result_are_admitted() {
    let parameter = field("ix://acme/pkg/T/op/x", "x", "ix://quire/native/Clock");
    let record = framed(r#"{"modifies":[],"creates":[],"deletes":[]}"#)
        .replace(r#""params":[]"#, &format!(r#""params":[{parameter}]"#));
    assert_eq!(diagnostics("", &[record]), vec![]);
    assert_eq!(
        diagnostics("", &[operation_result("ix://quire/native/Clock", "")]),
        vec![]
    );
}

/// Trace: FR-141
#[test]
fn the_native_text_name_is_the_string_scalar() {
    // minLength is defined for string and never for integer; min the reverse.
    let with = |keyword: &str, operands: &str| {
        let item = text_field_type().replace(
            r#""extensions":[]}]"#,
            &format!(
                r#""extensions":[],"constraints":[{}]}}]"#,
                constraint("k", keyword, operands, "ix://acme/pkg/Item/label")
            ),
        );
        diagnostics("", &[item])
    };
    assert_eq!(with("minLength", r#"{"value":1}"#), vec![]);
    assert_eq!(
        with("min", r#"{"value":"1"}"#),
        vec![(
            "/ir/types/0/fields/0/constraints/0".to_string(),
            CONSTRAINT_NOT_APPLICABLE
        )]
    );
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

/// Trace: FR-141
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

/// Trace: FR-141
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

/// Trace: FR-141
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

/// Trace: FR-141
#[test]
fn a_construct_definition_with_no_scalar_keeps_the_construct_decision() {
    let no_scalar = value_type(
        "string",
        &[constraint("e", "enumValues", r#"{"values":["a"]}"#, V)],
    )
    .replace(r#","scalar":"string""#, "");
    assert_eq!(
        diagnostics(VALUE_TYPE_CONSTRUCT, &[no_scalar]),
        vec![(
            "/ir/types/0/constraints/0".to_string(),
            CONSTRAINT_NOT_APPLICABLE
        )]
    );
}

fn record_with_member(member: &str) -> String {
    format!(
        r#"{{"identity":"ix://acme/pkg/T","displayName":"T","kind":"record","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","fields":[{member}]}}"#
    )
}

fn operation_result(type_ref: &str, extra: &str) -> String {
    framed(r#"{"modifies":[],"creates":[],"deletes":[]}"#).replace(
        r#""pre":[]"#,
        &format!(r#""returns":{{"typeRef":"{type_ref}","multiplicity":{MULTIPLICITY},"nullable":false{extra}}},"pre":[]"#),
    )
}

#[test]
fn clock_and_quantity_are_admitted_at_every_position_but_a_quantity_reference_target() {
    // FR-146-AC-2, FR-146-AC-6, FR-146-AC-21, FR-146-AC-23: exact reader assertions below.
    for (reference, quantity) in [
        ("ix://quire/native/Clock", false),
        ("ix://quire/unit/ms", true),
    ] {
        for (kind, member) in [
            ("alias", "target"),
            ("reference", "target"),
            ("sequence", "items"),
            ("map", "values"),
        ] {
            let node = format!(
                r#"{{"identity":"ix://acme/pkg/T","displayName":"T","kind":"{kind}","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","{member}":"{reference}"}}"#
            );
            let expected = if quantity && kind == "reference" {
                vec![(
                    "/ir/types/0/target".to_string(),
                    "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
                )]
            } else {
                vec![]
            };
            assert_eq!(diagnostics("", &[node]), expected, "{kind}: {reference}");
        }
        let variant = format!(
            r#"{{"identity":"ix://acme/pkg/T","displayName":"T","kind":"union","roles":[],"origin":{GENERATED},"constraints":[],"extensions":[],"unknownPolicy":"reject","variants":[{{"identity":"ix://acme/pkg/T/v","name":"v","origin":{GENERATED},"payloadType":"{reference}"}}]}}"#
        );
        // FR-147: a Clock payload is refused (QSpec FR-322, pending STD-528).
        let expected = if quantity {
            vec![]
        } else {
            vec![(
                "/ir/types/0/variants/0/payloadType".to_string(),
                "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
            )]
        };
        assert_eq!(diagnostics("", &[variant]), expected, "{reference}");
        let node = record_with_member("").replace(
            r#""constraints":[]"#,
            &format!(
                r#""constraints":[{}]"#,
                constraint("k", "min", r#"{"value":"0"}"#, reference)
            ),
        );
        assert_eq!(diagnostics("", &[node]), vec![], "{reference}");
    }
    assert_eq!(
        diagnostics("", &[operation_result("ix://quire/native/Clock", "")]),
        vec![]
    );
}

#[test]
fn quantity_members_check_uri_form_without_resolving_local_units() {
    // FR-146-AC-6, FR-146-AC-9: exact reader assertions below.
    for (name, accepted) in [
        ("ms", true),
        ("agent-ix/time-units/ms", true),
        ("acme/rpc.v2/ms", true),
        ("acme/rpc/ms", true),
        ("a-b/c.d/e-f/ms", true),
        ("", false),
        ("3ms", false),
        ("agent-ix/time-units/m-s", false),
        ("agent-ix/time-units/3ms", false),
        ("-acme/rpc/ms", false),
        (".acme/rpc/ms", false),
        ("agent-ix//ms", false),
    ] {
        let reference = format!("ix://quire/unit/{name}");
        let member = field("ix://acme/pkg/T/x", "x", &reference);
        let parameter = field("ix://acme/pkg/T/op/x", "x", &reference);
        let parameter_record = framed(r#"{"modifies":[],"creates":[],"deletes":[]}"#)
            .replace(r#""params":[]"#, &format!(r#""params":[{parameter}]"#));
        for (record, pointer) in [
            (record_with_member(&member), "/ir/types/0/fields/0/typeRef"),
            (
                parameter_record,
                "/ir/types/0/operations/0/params/0/typeRef",
            ),
            (
                operation_result(&reference, ""),
                "/ir/types/0/operations/0/returns/typeRef",
            ),
        ] {
            let expected = if accepted {
                vec![]
            } else {
                vec![(
                    pointer.to_string(),
                    "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
                )]
            };
            assert_eq!(
                diagnostics("", &[record]),
                expected,
                "{reference} at {pointer}"
            );
        }
    }
}

#[test]
fn special_member_shape_owns_nested_constraints_and_scalar_policy_diagnostics() {
    // FR-146-AC-2, FR-146-AC-6: exact reader assertions below.
    for (reference, code) in [
        (
            "ix://quire/native/Clock",
            "agent-ix.semantic-ir.INVALID_CLOCK_MEMBER",
        ),
        (
            "ix://quire/unit/ms",
            "agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER",
        ),
    ] {
        // An explicit Decimal subject would otherwise leak a missing-policy diagnostic
        // from the shared traversal, independently of constraint applicability.
        let nested = constraint("k", "min", r#"{"value":"0"}"#, "ix://quire/native/Decimal");
        let extras = format!(
            r#", "unit":"ms","decimal":{{"precision":4,"scale":2}},"textProfile":"unicode","defaultValue":0,"constraints":[{nested}]"#
        );
        let member = field("ix://acme/pkg/T/x", "x", reference)
            .replace(r#""defaultKind":"none""#, r#""defaultKind":"semantic""#);
        let member = format!("{}{extras}}}", &member[..member.len() - 1]);
        let mut observed = diagnostics("", &[record_with_member(&member)]);
        observed.sort();
        let mut expected: Vec<_> = [
            "unit",
            "decimal",
            "textProfile",
            "defaultKind",
            "defaultValue",
            "constraints",
        ]
        .into_iter()
        .map(|name| (format!("/ir/types/0/fields/0/{name}"), code))
        .collect();
        expected.sort();
        assert_eq!(observed, expected, "{reference}");
    }
    let member = field("ix://acme/pkg/T/x", "x", "ix://quire/unit/ms")
        .replace(r#""lower":1"#, r#""lower":3"#);
    assert_eq!(
        diagnostics("", &[record_with_member(&member)]),
        vec![(
            "/ir/types/0/fields/0/multiplicity/upper".to_string(),
            "agent-ix.semantic-ir.INVALID_MULTIPLICITY"
        )]
    );
    assert_eq!(
        diagnostics(
            "",
            &[operation_result(
                "ix://quire/unit/ms",
                r#", "decimal":{"precision":4,"scale":2}"#
            )]
        ),
        vec![(
            "/ir/types/0/operations/0/returns/decimal".to_string(),
            "agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER"
        )]
    );
}
