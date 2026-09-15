// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX

//! The published JSON Schema of the static bundle's wire form
//! (`schema/baseline/v1/static-bundle.schema.json`), measured against the
//! committed fixtures (Plan-017 Task-149).
//!
//! Two things are measured, and they are different claims.
//!
//! * **What the schema declares.** The four header members and the nine content
//!   member classes are required, every assessment member class is prohibited by
//!   name as well as by `additionalProperties: false`, a digest selection requires
//!   all four of its members, a revision requires both of its members, and the
//!   consumer-owned locus digest is typed as a string rather than as a selection.
//!   These are read off the published document, so a schema edited to drop one is
//!   caught here rather than by a fixture that happens still to validate.
//! * **What the schema accepts and rejects.** The good fixture validates and every
//!   shape-violating adverse fixture is rejected at its own member path. The
//!   reader below enforces the keyword set this schema actually uses —
//!   `$ref`, `allOf`, `not`, `type`, `const`, `enum`, `required`, `properties`,
//!   `additionalProperties`, `items` and `minItems`. It does not enforce
//!   `pattern`, `minLength`, `minimum` or `uniqueItems`; those are enforced by the
//!   repository's own Ajv 2020 gate over the same published schema
//!   (`test/baseline-producer.test.ts`), which is where this schema is published
//!   and validated for consumers.
//!
//! Three adverse fixtures are **not** shape violations and are named here as
//! such: a foreign export mapping, a stale correspondence selection and an
//! unlisted inventory member are all statements about agreement *between*
//! members, which no shape schema decides. They are admitted by the schema and
//! refused by the admission entry point, which is the division of labour
//! `tests/adverse.rs` measures.

use ix_trace_rs::trace;
use std::collections::BTreeSet;

use serde_json::Value;

mod static_fixture;

use static_fixture::{fixture_document, ADVERSE_FIXTURES, GOOD_FIXTURE, SCHEMA_PATH};

/// The four header member classes of FR-117.
const HEADER_MEMBERS: [&str; 4] = [
    "bundleIdentity",
    "bundleRevision",
    "digest",
    "interfaceVersion",
];

/// The nine content member classes of FR-117.
const CONTENT_MEMBERS: [&str; 9] = [
    "components",
    "configuration",
    "correspondences",
    "endpoints",
    "inventory",
    "model",
    "profile",
    "relationships",
    "staticClosure",
];

/// The assessment member classes a static bundle prohibits.
const ASSESSMENT_MEMBERS: [&str; 12] = [
    "availability",
    "observationClosure",
    "observationRecords",
    "population",
    "populationIdentity",
    "progress",
    "progressRecords",
    "relationshipInstances",
    "snapshot",
    "window",
    "windowIdentity",
    "workflowInstance",
];

/// The adverse fixtures whose mutation is a shape violation the schema decides.
const SHAPE_VIOLATIONS: [&str; 5] = [
    "adverse/01-missing-identities.json",
    "adverse/02-digest-domain-substituted.json",
    "adverse/03-revision-namespace-substituted.json",
    "adverse/05-endpoint-role-multiplicity-lost.json",
    "adverse/06-component-provenance-absent.json",
];

/// The adverse fixtures whose mutation is an agreement between members, which no
/// shape schema decides.
const CROSS_MEMBER_VIOLATIONS: [&str; 3] = [
    "adverse/04-export-foreign-cross-bound.json",
    "adverse/07-stale-correspondence-selection.json",
    "adverse/08-inventory-incomplete.json",
];

fn schema() -> Value {
    let bytes = std::fs::read(SCHEMA_PATH).expect("the published schema is committed");
    serde_json::from_slice(&bytes).expect("the published schema is a JSON document")
}

fn required_of(schema: &Value) -> BTreeSet<String> {
    schema["required"]
        .as_array()
        .expect("the schema declares its required members")
        .iter()
        .map(|member| {
            member
                .as_str()
                .expect("a required member is a string")
                .to_owned()
        })
        .collect()
}

/// Tracing: TC-1633; FR-117-AC-2
#[trace("TC-1633", "FR-117-AC-2")]
#[test]
fn tc_1633_the_published_schema_requires_four_header_and_nine_content_members() {
    let schema = schema();
    assert_eq!(
        schema["additionalProperties"],
        Value::Bool(false),
        "the published schema is closed over its member set"
    );
    let required = required_of(&schema);
    let declared: BTreeSet<String> = HEADER_MEMBERS
        .iter()
        .chain(CONTENT_MEMBERS.iter())
        .map(|member| (*member).to_owned())
        .collect();
    assert_eq!(
        required, declared,
        "the required set is exactly the four header members and the nine content classes"
    );

    // A digest selection carries all four members; a revision carries both.
    assert_eq!(
        required_of(&schema["$defs"]["digest"]),
        BTreeSet::from([
            "algorithm".to_owned(),
            "domain".to_owned(),
            "value".to_owned(),
            "version".to_owned()
        ])
    );
    assert_eq!(
        required_of(&schema["$defs"]["revision"]),
        BTreeSet::from(["namespace".to_owned(), "value".to_owned()])
    );

    // The consumer-owned locus digest is one raw-byte string, not a selection.
    assert_eq!(
        schema["$defs"]["artifactReference"]["properties"]["digest"]["$ref"],
        Value::String("#/$defs/rawByteDigest".into())
    );
    assert_eq!(
        schema["$defs"]["rawByteDigest"]["type"],
        Value::String("string".into()),
        "the raw-byte digest is typed as a string rather than as a four-member selection"
    );

    println!(
        "TC-1633 measured: {} header members and {} content member classes required by the published schema, 4 digest members, 2 revision members, 1 string-typed raw-byte digest",
        HEADER_MEMBERS.len(),
        CONTENT_MEMBERS.len()
    );
}

/// Tracing: TC-1634; FR-117-AC-3, FR-117-AC-7
#[trace("TC-1634", "FR-117-AC-3")]
#[trace("TC-1634", "FR-117-AC-7")]
#[test]
fn tc_1634_the_published_schema_prohibits_every_assessment_member_by_name() {
    let schema = schema();
    let properties = schema["properties"]
        .as_object()
        .expect("the schema declares its properties");
    for member in ASSESSMENT_MEMBERS {
        let declared = properties.get(member).unwrap_or_else(|| {
            panic!("{member} is prohibited by name, not only as an unknown member")
        });
        assert!(
            declared.get("not").is_some(),
            "{member} carries an explicit not"
        );
        assert_eq!(
            declared["not"],
            Value::Object(serde_json::Map::new()),
            "{member} admits nothing at all"
        );
    }

    // And the prohibition bites: an offered assessment member is rejected.
    let schema_document = schema.clone();
    for member in ASSESSMENT_MEMBERS {
        let mut offered = fixture_document(GOOD_FIXTURE);
        offered[member] = serde_json::json!({"offered": "by an assessment producer"});
        let errors = validate(&schema_document, &schema_document, &offered, "");
        assert!(
            errors.iter().any(|error| error.contains(member)),
            "the rejection names {member}: {errors:?}"
        );
    }

    println!(
        "TC-1634 measured: {} assessment member classes prohibited by name and rejected naming the member, 0 admitted",
        ASSESSMENT_MEMBERS.len()
    );
}

/// Tracing: TC-1631; FR-117-AC-1
#[trace("TC-1631", "FR-117-AC-1")]
#[test]
fn tc_1631_the_published_schema_accepts_the_good_fixture_and_rejects_the_shape_violations() {
    let schema = schema();
    let good = fixture_document(GOOD_FIXTURE);
    let errors = validate(&schema, &schema, &good, "");
    assert!(
        errors.is_empty(),
        "the good fixture validates against its published schema: {errors:?}"
    );

    for fixture in SHAPE_VIOLATIONS {
        let adverse = fixture_document(fixture);
        let errors = validate(&schema, &schema, &adverse, "");
        assert!(
            !errors.is_empty(),
            "{fixture} is rejected by the published schema"
        );
    }
    for fixture in CROSS_MEMBER_VIOLATIONS {
        let adverse = fixture_document(fixture);
        let errors = validate(&schema, &schema, &adverse, "");
        assert!(
            errors.is_empty(),
            "{fixture} is an agreement between members, not a shape violation: {errors:?}"
        );
    }

    // An undeclared producer member is rejected even though every declared member
    // is present, which is what `additionalProperties: false` buys.
    let mut undeclared = fixture_document(GOOD_FIXTURE);
    undeclared["unapprovedAmbientConfiguration"] = Value::String("current-directory".into());
    assert!(
        !validate(&schema, &schema, &undeclared, "").is_empty(),
        "an undeclared member is rejected"
    );

    assert_eq!(
        SHAPE_VIOLATIONS.len() + CROSS_MEMBER_VIOLATIONS.len(),
        ADVERSE_FIXTURES.len(),
        "every adverse fixture is classified as a shape or a cross-member violation"
    );
    println!(
        "TC-1631 measured: 1 good fixture accepted, {} shape-violating adverse fixtures rejected, {} cross-member adverse fixtures admitted by shape and refused at admission, 1 undeclared member rejected",
        SHAPE_VIOLATIONS.len(),
        CROSS_MEMBER_VIOLATIONS.len()
    );
}

/// Validates one value against the keyword set this published schema uses.
///
/// Returns one message per violation, each naming the member path at which it was
/// found. `pattern`, `minLength`, `minimum` and `uniqueItems` are deliberately not
/// enforced here; the Ajv 2020 gate over the same document enforces the whole
/// vocabulary.
fn validate(schema: &Value, root: &Value, value: &Value, path: &str) -> Vec<String> {
    let mut errors = Vec::new();
    let Some(members) = schema.as_object() else {
        return errors;
    };
    if let Some(reference) = members.get("$ref").and_then(Value::as_str) {
        let resolved = resolve_reference(root, reference);
        errors.extend(validate(&resolved, root, value, path));
    }
    if let Some(branches) = members.get("allOf").and_then(Value::as_array) {
        for branch in branches {
            errors.extend(validate(branch, root, value, path));
        }
    }
    if let Some(negated) = members.get("not") {
        if validate(negated, root, value, path).is_empty() {
            errors.push(format!("{path} is prohibited by an explicit not"));
        }
    }
    if let Some(expected) = members.get("type").and_then(Value::as_str) {
        let matches = match expected {
            "object" => value.is_object(),
            "array" => value.is_array(),
            "string" => value.is_string(),
            "integer" => value.is_i64() || value.is_u64(),
            "number" => value.is_number(),
            "boolean" => value.is_boolean(),
            other => panic!("{other} is not a type this reader enforces"),
        };
        if !matches {
            errors.push(format!("{path} is not a {expected}"));
            return errors;
        }
    }
    if let Some(constant) = members.get("const") {
        if value != constant {
            errors.push(format!("{path} is not the constant {constant}"));
        }
    }
    if let Some(admitted) = members.get("enum").and_then(Value::as_array) {
        if !admitted.contains(value) {
            errors.push(format!("{path} lies outside its enumerated vocabulary"));
        }
    }
    if let Some(object) = value.as_object() {
        if let Some(required) = members.get("required").and_then(Value::as_array) {
            for member in required {
                let member = member.as_str().expect("a required member is a string");
                if !object.contains_key(member) {
                    errors.push(format!("{path}/{member} is required and absent"));
                }
            }
        }
        let properties = members.get("properties").and_then(Value::as_object);
        if let Some(properties) = properties {
            for (member, member_schema) in properties {
                if let Some(member_value) = object.get(member) {
                    errors.extend(validate(
                        member_schema,
                        root,
                        member_value,
                        &format!("{path}/{member}"),
                    ));
                }
            }
        }
        if members.get("additionalProperties") == Some(&Value::Bool(false)) {
            for member in object.keys() {
                if !properties.is_some_and(|properties| properties.contains_key(member)) {
                    errors.push(format!("{path}/{member} is an undeclared member"));
                }
            }
        }
    }
    if let Some(items) = value.as_array() {
        if let Some(minimum) = members.get("minItems").and_then(Value::as_u64) {
            if (items.len() as u64) < minimum {
                errors.push(format!("{path} carries fewer than {minimum} members"));
            }
        }
        if let Some(item_schema) = members.get("items") {
            for (index, item) in items.iter().enumerate() {
                errors.extend(validate(
                    item_schema,
                    root,
                    item,
                    &format!("{path}/{index}"),
                ));
            }
        }
    }
    errors
}

fn resolve_reference(root: &Value, reference: &str) -> Value {
    let pointer = reference
        .strip_prefix("#/")
        .unwrap_or_else(|| panic!("{reference} is a local JSON pointer"));
    let mut cursor = root;
    for segment in pointer.split('/') {
        let segment = segment.replace("~1", "/").replace("~0", "~");
        cursor = cursor
            .get(&segment)
            .unwrap_or_else(|| panic!("{reference} resolves"));
    }
    cursor.clone()
}
