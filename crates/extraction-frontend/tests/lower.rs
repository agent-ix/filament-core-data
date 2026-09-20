//! FR-093: records, fields, constraints, enumerations and the declared
//! losses, over committed fixture bundles under the vendored business
//! module. Nothing here reads the environment.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, Severity, WireCode};
use agent_ix_extraction_frontend::document::assemble;
use agent_ix_extraction_frontend::enumeration::VALUE_COLUMN;
use agent_ix_extraction_frontend::lower::{
    applies_to, diagnostic_code, loss_register, roles, screaming, Kind, Presence,
    DECIMAL_POLICY_EXTENSION, IDENTITY_FIELD_EXTENSION, KEYWORDS,
};
use agent_ix_extraction_frontend::resolve::{Outcome, Resolved};
use agent_ix_extraction_frontend::rows::field_rows;
use agent_ix_extraction_frontend::{
    extract, lower_bundle, lower_record, resolve, ArtifactContext, ArtifactRef, Bundle, Envelope,
    Extractions, Limits, Loss, LowerError, Lowered, PackageIdentity, Resolutions,
};
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::normalize::normalized;
use agent_ix_semantic_ir::{decide, ResultState};
use common::without;
use ix_trace_rs::trace;
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use quire_rs::semantic::{FieldsForm, SemanticExtraction};
use serde_json::{json, Value};

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

/// The `edge_types` registry FR-094 categorises frontmatter edges by,
/// declaring the business module's verbs byte-identically.
fn edge_vocabulary() -> PathBuf {
    fixture("modules/edge-vocabulary")
}

fn limits() -> Limits {
    Limits::declared().expect("limits.json parses")
}

/// One lift up to this task: load, extract, resolve, lower.
struct Lift {
    bundle: Bundle,
    extractions: Extractions,
    resolutions: Resolutions,
    lowered: Lowered,
}

fn lift_at(root: &Path, modules: &[&Path]) -> Lift {
    let bundle =
        Bundle::load(root, modules).unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits());
    Lift {
        bundle,
        extractions,
        resolutions,
        lowered,
    }
}

fn lift(name: &str) -> Lift {
    lift_at(&fixture(name), &[&business_module(), &edge_vocabulary()])
}

fn write_fixture(root: &Path, relative: &str, text: &str) {
    let path = root.join(relative);
    fs::create_dir_all(path.parent().expect("fixture parent")).expect("create fixture parent");
    fs::write(&path, text).unwrap_or_else(|error| panic!("write {}: {error}", path.display()));
}

fn scratch_spec(root: &Path) {
    write_fixture(
        root,
        "spec/spec.md",
        "---\ntype: master-requirements\nname: identity-collision\norg: agent-ix\ntitle: \"Identity collision\"\n---\n# Identity collision\n",
    );
}

fn entity(id: &str, name: &str, fields: &str) -> String {
    format!(
        "---\nid: {id}\ntitle: {name}\nname: {name}\nobject: entity\ntype: FR\n---\n# {name}\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n| --- | --- | --- | --- |\n{fields}"
    )
}

fn with_code(diagnostics: &[Diagnostic], code: Code) -> Vec<&Diagnostic> {
    diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

fn types_json(lift: &Lift) -> Vec<Value> {
    lift.lowered
        .types
        .iter()
        .map(|t| serde_json::to_value(t).expect("serialises"))
        .collect()
}

fn type_named<'a>(types: &'a [Value], display_name: &str) -> &'a Value {
    types
        .iter()
        .find(|t| t["displayName"] == display_name)
        .unwrap_or_else(|| panic!("no definition named {display_name}"))
}

/// The fields of `record` carrying at least one constraint (FR-093 "The
/// fields"): constraints live inline on the field (gap 1 of FCD #199/#200),
/// so no alias node is minted for them, in `fields` order.
fn constrained_fields_of<'a>(types: &'a [Value], record: &str) -> Vec<&'a Value> {
    type_named(types, record)["fields"]
        .as_array()
        .expect("fields")
        .iter()
        .filter(|f| f["constraints"].as_array().is_some_and(|c| !c.is_empty()))
        .collect()
}

/// Every constraint of `record`, gathered from its fields' inline
/// `constraints`, in field order.
fn constraints_of<'a>(types: &'a [Value], record: &str) -> Vec<&'a Value> {
    constrained_fields_of(types, record)
        .into_iter()
        .flat_map(|f| f["constraints"].as_array().expect("constraints"))
        .collect()
}

fn field_named<'a>(record: &'a Value, name: &str) -> &'a Value {
    record["fields"]
        .as_array()
        .expect("fields")
        .iter()
        .find(|f| f["name"] == name)
        .unwrap_or_else(|| panic!("no field named {name} in {record}"))
}

/// A full IR document over the lift's types, with the lift's envelope.
///
/// Routed entirely through [`assemble`], the same path the frontend's own
/// `lift.rs` uses, so every `multiplicity` here gets the same
/// `normalize_multiplicities` fill-in (`ordered`/`unique` default `false`)
/// that a real emitted document gets. Hand-assembling this document from
/// `types_json(lift)` bypassed that normalization and produced
/// SCHEMA_VIOLATION at every `multiplicity` the reader saw.
fn ir_document(lift: &Lift) -> Value {
    let envelope = Envelope::new(&lift.bundle, &[]);
    let doc = assemble(&envelope, &lift.lowered.types, &lift.lowered.constructs).expect("assemble");
    json!({ "ir": doc })
}

/// The reader's verdict over a document.
fn verdict(doc: &Value) -> agent_ix_semantic_ir::Verdict {
    let text = serde_json::to_string(doc).expect("serialises");
    decide(&parse_json(&text).expect("parses"))
}

fn reader_codes(doc: &Value) -> Vec<String> {
    verdict(doc)
        .diagnostics
        .iter()
        .map(|d| format!("{} at {}", d.code, d.pointer))
        .collect()
}

fn locus(lift: &Lift, path: &str, line: usize, column: usize) -> Locus {
    Locus::new(&lift.bundle.package().source_identity(), path, line, column)
}

/// The context `lower_bundle` builds for one artifact, for direct
/// `lower_record` calls.
fn context<'a>(
    lift: &'a Lift,
    package: &'a PackageIdentity,
    id: &'a str,
    artifact: &'a ArtifactRef,
) -> ArtifactContext<'a> {
    let document = lift
        .bundle
        .documents()
        .iter()
        .find(|d| d.id() == id)
        .expect("document");
    let object = document.object().expect("object");
    let object_type = lift.bundle.object_type(object).expect("object type");
    ArtifactContext {
        package,
        id,
        path: &artifact.path,
        display_name: &artifact.display_name,
        roles: roles(&object_type.module, object, object_type.archetype.roles()),
        construct: object_type.construct.as_ref(),
    }
}

fn artifact_ref(lift: &Lift, id: &str) -> ArtifactRef {
    let document = lift
        .bundle
        .documents()
        .iter()
        .find(|d| d.id() == id)
        .expect("document");
    ArtifactRef::of(document)
}

#[trace("TC-1220", "FR-093-AC-1")]
#[trace("TC-1220", "FR-093-CON-1")]
#[test]
fn tc_1220_table_root_and_fence_root_lower_to_byte_identical_types_and_fields_form_moves_no_byte() {
    let table = lift("config-version-table");
    let fence = lift("config-version-fence");
    assert!(
        !table.lowered.diagnostics.iter().any(|d| d.blocking)
            && !fence.lowered.diagnostics.iter().any(|d| d.blocking),
        "both roots lift unblocked: {:?} / {:?}",
        table.lowered.diagnostics,
        fence.lowered.diagnostics
    );
    let table_bytes = serde_json::to_string(&table.lowered.types).expect("serialises");
    let fence_bytes = serde_json::to_string(&fence.lowered.types).expect("serialises");
    assert_eq!(
        table_bytes, fence_bytes,
        "the two forms lower to identical bytes"
    );
    let table_diag = serde_json::to_string(&table.lowered.diagnostics).expect("serialises");
    let fence_diag = serde_json::to_string(&fence.lowered.diagnostics).expect("serialises");
    assert_eq!(table_diag, fence_diag);

    // The same envelope over both type lists: `normalized` agrees too, and
    // the reader accepts the document (the sanity half of TC-1230). The
    // fence-form types are substituted in through `assemble` too, so they
    // pick up the same `normalize_multiplicities` fill-in as the table-form
    // document rather than comparing a normalized document against a raw one.
    let mut fence_doc = ir_document(&table);
    let fence_envelope = Envelope::new(&fence.bundle, &[]);
    fence_doc["ir"]["types"] =
        assemble(&fence_envelope, &fence.lowered.types, &[]).expect("assemble")["types"].clone();
    let table_doc = ir_document(&table);
    let n =
        |doc: &Value| normalized(&parse_json(&serde_json::to_string(doc).expect("s")).expect("p"));
    assert_eq!(n(&table_doc), n(&fence_doc));
    assert_eq!(
        reader_codes(&table_doc),
        Vec::<String>::new(),
        "the reader accepts the lowered document"
    );

    // Falsification control: flipping `fields_form` on the extraction
    // moves no byte of the record.
    let package = PackageIdentity::from(table.bundle.package());
    let artifact = artifact_ref(&table, "FR-006");
    let ctx = context(&table, &package, "FR-006", &artifact);
    let document = table
        .bundle
        .documents()
        .iter()
        .find(|d| d.id() == "FR-006")
        .expect("FR-006");
    let rows = field_rows(document.raw());
    let extraction = &table.extractions.artifacts["FR-006"].extraction;
    let mut flipped: SemanticExtraction = extraction.clone();
    flipped.fields_form = Some(match extraction.fields_form {
        Some(FieldsForm::Table) => FieldsForm::Fence,
        _ => FieldsForm::Table,
    });
    let a = lower_record(extraction, &table.resolutions.resolutions, &rows, &ctx).expect("lowers");
    let b = lower_record(&flipped, &table.resolutions.resolutions, &rows, &ctx).expect("lowers");
    assert_eq!(
        serde_json::to_string(&a.definition).expect("s"),
        serde_json::to_string(&b.definition).expect("s")
    );
}

#[trace("TC-1221", "FR-093-AC-2")]
#[test]
fn tc_1221_config_version_carries_three_roles_reject_policy_and_seven_fields_in_order() {
    let lift = lift("config-version-table");
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    assert_eq!(
        record["kind"],
        json!({"module": "agent-ix/spec-objects-business", "name": "entity"})
    );
    assert_eq!(record["identity"], "ix://agent-ix/config-service/FR-006");
    assert_eq!(
        record["roles"],
        json!([
            "business:aggregate-member",
            "business:composite-owner",
            "business:domain-object",
            "business:entity",
            "business:persistable"
        ])
    );
    assert_eq!(record["unknownPolicy"], "reject");
    assert_eq!(
        record["origin"],
        json!({"source": {
            "sourceIdentity": "ix://agent-ix/config-service/spec",
            "path": "spec/functional/FR-006-config-version-entity.md",
            "startLine": 1, "startColumn": 1
        }})
    );
    let names: Vec<&str> = record["fields"]
        .as_array()
        .expect("fields")
        .iter()
        .map(|f| f["name"].as_str().expect("name"))
        .collect();
    assert_eq!(
        names,
        [
            "id",
            "versionNumber",
            "data",
            "hash",
            "parent",
            "createdAt",
            "createdBy"
        ],
        "declaration order before normalization"
    );
    // Roles are sorted and de-duplicated whatever the manifest order.
    assert_eq!(
        roles(
            "spec-objects-business",
            "entity",
            &[
                "persistable".into(),
                "domain-object".into(),
                "entity".into()
            ]
        ),
        [
            "business:domain-object",
            "business:entity",
            "business:persistable"
        ]
    );
    // Every emitted definition is schema-shaped: the reader accepts it.
    assert_eq!(reader_codes(&ir_document(&lift)), Vec::<String>::new());
}

#[trace("TC-1222", "FR-093-AC-3")]
#[test]
fn tc_1222_identity_row_lowers_to_one_one_required_with_the_identity_extension_and_parent_to_optional(
) {
    let lift = lift("config-version-table");
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    let id = field_named(record, "id");
    assert_eq!(
        id["multiplicity"],
        json!({"lower": 1, "upper": 1, "ordered": false, "unique": false})
    );
    assert_eq!(id["presence"], "required");
    assert_eq!(id["nullable"], false);
    assert_eq!(id["defaultKind"], "none");
    assert_eq!(id["typeRef"], "ix://quire/native/UUID");
    assert_eq!(id["identity"], "ix://agent-ix/config-service/FR-006/id");
    assert_eq!(
        id["extensions"],
        json!([{
            "identity": IDENTITY_FIELD_EXTENSION,
            "version": "1.0.0",
            "required": false,
            "payload": {}
        }])
    );
    assert_eq!(
        id["origin"]["source"],
        json!({
            "sourceIdentity": "ix://agent-ix/config-service/spec",
            "path": "spec/functional/FR-006-config-version-entity.md",
            "startLine": 22, "startColumn": 3
        }),
        "the row's line, column 3"
    );
    let parent = field_named(record, "parent");
    assert_eq!(
        parent["multiplicity"],
        json!({"lower": 0, "upper": 1, "ordered": false, "unique": false})
    );
    assert_eq!(parent["presence"], "optional");
    assert_eq!(parent["nullable"], false);
    assert_eq!(
        parent["typeRef"], "ix://agent-ix/config-service/FR-006",
        "the self-reference resolves to the record itself (EC-143)"
    );
    assert_eq!(parent["extensions"], json!([]));

    // The decimal policy rides the same extension mechanism.
    let business = self::lift("business");
    let types = types_json(&business);
    let order = type_named(&types, "Order");
    let total = field_named(order, "total");
    assert_eq!(total["unit"], "USD");
    // `min: 0` on the row lives inline on the field (gap 1 of FCD
    // #199/#200): the typeRef names the resolved native scalar directly, no
    // alias is minted.
    assert_eq!(total["typeRef"], "ix://quire/native/Decimal");
    let total_constraints = total["constraints"].as_array().expect("constraints");
    assert_eq!(total_constraints.len(), 1, "{total_constraints:?}");
    assert_eq!(total_constraints[0]["keyword"], "min");
    assert_eq!(total_constraints[0]["operands"], json!({"value": 0}));
    assert_eq!(total_constraints[0]["appliesTo"], total["identity"]);
    assert_eq!(
        total["extensions"],
        json!([{
            "identity": DECIMAL_POLICY_EXTENSION,
            "version": "1.0.0",
            "required": false,
            "payload": {"precision": 10, "scale": 2}
        }])
    );
}

#[trace("TC-1223", "FR-093-AC-4")]
#[test]
fn tc_1223_version_number_min_one_emits_one_min_constraint_on_the_field_with_the_screaming_diagnostic_code(
) {
    let lift = lift("config-version-table");
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    // The record carries no constraint of its own: each lives inline on its
    // field (gap 1 of FCD #199/#200), no alias is minted for it.
    assert_eq!(record["constraints"], json!([]));
    let field = field_named(record, "versionNumber");
    assert_eq!(
        field["identity"],
        "ix://agent-ix/config-service/FR-006/versionNumber"
    );
    assert_eq!(field["typeRef"], "ix://quire/native/Integer");
    let constraints = field["constraints"].as_array().expect("constraints");
    assert_eq!(constraints.len(), 1, "{constraints:?}");
    let min = &constraints[0];
    assert_eq!(min["keyword"], "min");
    assert_eq!(min["operands"], json!({"value": 1}));
    assert_eq!(min["appliesTo"], field["identity"]);
    assert_eq!(
        min["diagnosticCode"],
        "agent-ix.config-service.CONFIGVERSION_VERSIONNUMBER_MIN"
    );
    assert_eq!(
        min["identity"],
        "ix://agent-ix/config-service/constraint/FR-006-versionNumber-min"
    );
    assert_eq!(min["origin"]["source"]["startLine"], 23, "the row's origin");
    assert_eq!(min["origin"]["source"]["startColumn"], 3);
    // Every constraint of the record: min, nonEmpty, maxLength, one per
    // constrained field, in field order; no unconstrained field mints one.
    let keywords: Vec<&str> = constraints_of(&types, "ConfigVersion")
        .iter()
        .map(|c| c["keyword"].as_str().expect("keyword"))
        .collect();
    assert_eq!(keywords, ["min", "nonEmpty", "maxLength"]);
    let constrained_names: Vec<&str> = constrained_fields_of(&types, "ConfigVersion")
        .iter()
        .map(|f| f["name"].as_str().expect("name"))
        .collect();
    assert_eq!(constrained_names, ["versionNumber", "hash", "createdBy"]);
    // `constraints` is `skip_serializing_if = "Vec::is_empty"`: an
    // unconstrained field carries no `constraints` member at all.
    let empty = Vec::new();
    for field in record["fields"].as_array().expect("fields") {
        let constraints = field
            .get("constraints")
            .and_then(Value::as_array)
            .unwrap_or(&empty);
        for c in constraints {
            assert_eq!(c["appliesTo"], field["identity"]);
        }
    }
    // The contract does not split camel case.
    assert_eq!(screaming("versionNumber"), "VERSIONNUMBER");
    assert_eq!(screaming("version_number"), "VERSION_NUMBER");
    assert_eq!(screaming("version-number"), "VERSION_NUMBER");
    assert_eq!(screaming("created__at"), "CREATED_AT");
    assert_eq!(screaming("maxLength"), "MAXLENGTH");
    assert_eq!(screaming("id"), "ID");
    let package = PackageIdentity::new("agent-ix", "config-service");
    assert_eq!(
        diagnostic_code(&package, "ConfigVersion", "createdBy", "maxLength"),
        "agent-ix.config-service.CONFIGVERSION_CREATEDBY_MAXLENGTH"
    );
}

#[trace("TC-1224", "FR-093-AC-5")]
#[test]
fn tc_1224_max_length_pattern_and_enum_values_carry_their_operand_shapes() {
    let lift = lift("config-version-table");
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    let max_length = constraints_of(&types, "ConfigVersion")
        .into_iter()
        .find(|c| c["keyword"] == "maxLength")
        .expect("maxLength");
    assert_eq!(max_length["operands"], json!({"value": 64}));
    let created_by = field_named(record, "createdBy");
    assert_eq!(max_length["appliesTo"], created_by["identity"]);
    assert_eq!(created_by["typeRef"], "ix://quire/native/String");

    let audit = self::lift("lower/constraints");
    assert!(
        audit.lowered.diagnostics.is_empty(),
        "{:?}",
        audit.lowered.diagnostics
    );
    let types = types_json(&audit);
    let record = type_named(&types, "Audit");
    assert_eq!(record["constraints"], json!([]));
    let by_keyword: BTreeMap<&str, &Value> = constraints_of(&types, "Audit")
        .into_iter()
        .map(|c| (c["keyword"].as_str().expect("keyword"), c))
        .collect();
    assert_eq!(
        by_keyword["pattern"]["operands"],
        json!({"regex": "^[a-z]+$", "dialect": "ecma-262"})
    );
    assert_eq!(
        by_keyword["enumValues"]["operands"],
        json!({"values": ["a", "b"]})
    );
    assert_eq!(
        by_keyword["format"]["operands"],
        json!({"name": "iana:email"})
    );
    assert_eq!(by_keyword["min"]["operands"], json!({"value": 1}));
    assert_eq!(by_keyword["max"]["operands"], json!({"value": 10}));
    assert_eq!(by_keyword["nonEmpty"]["operands"], json!({}));
    assert_eq!(by_keyword["minLength"]["operands"], json!({"value": 1}));
    assert_eq!(by_keyword["maxLength"]["operands"], json!({"value": 64}));
    assert_eq!(by_keyword.len(), 8);
    // Constraints live inline on the field (gap 1 of FCD #199/#200): six
    // fields carry at least one, `count` and `payload` each carry two.
    let constrained = constrained_fields_of(&types, "Audit");
    assert_eq!(constrained.len(), 6, "{constrained:?}");
    for field in &constrained {
        for c in field["constraints"].as_array().expect("constraints") {
            assert_eq!(c["appliesTo"], field["identity"]);
        }
    }
    assert_eq!(
        field_named(record, "count")["constraints"]
            .as_array()
            .map(Vec::len),
        Some(2)
    );
    assert_eq!(reader_codes(&ir_document(&audit)), Vec::<String>::new());
}

/// One IR document holding a definition of `kind` (with `scalar` for a
/// scalar) and a record whose constraint `keyword` applies to that
/// definition, for the reader's applicability verdict.
fn applicability_doc(kind: &str, scalar: &str, keyword: &str) -> Value {
    let origin = json!({"generated": {
        "generatorIdentity": "ix://agent-ix/test/gen",
        "generatorVersion": "0.0.0",
        "inputIdentities": ["ix://agent-ix/test/spec"]
    }});
    let string = json!({
        "identity": "ix://agent-ix/test/String", "displayName": "String", "kind": "scalar",
        "roles": [], "origin": origin, "constraints": [], "extensions": [],
        "unknownPolicy": "reject", "scalar": "string"
    });
    let mut target = json!({
        "identity": "ix://agent-ix/test/T", "displayName": "T", "kind": kind,
        "roles": [], "origin": origin, "constraints": [], "extensions": [],
        "unknownPolicy": "reject"
    });
    match kind {
        "scalar" => target["scalar"] = json!(scalar),
        "record" => target["fields"] = json!([]),
        "enum" => {
            target["variants"] = json!([{
                "identity": "ix://agent-ix/test/variant/t-a", "name": "a", "origin": origin
            }])
        }
        "union" => {
            target["variants"] = json!([{
                "identity": "ix://agent-ix/test/variant/t-a", "name": "a", "origin": origin,
                "payloadType": "ix://agent-ix/test/String"
            }])
        }
        "sequence" => target["items"] = json!("ix://agent-ix/test/String"),
        "map" => target["values"] = json!("ix://agent-ix/test/String"),
        "alias" | "reference" => target["target"] = json!("ix://agent-ix/test/String"),
        other => panic!("unknown kind {other}"),
    }
    let operands = match keyword {
        "min" | "max" | "exclusiveMin" | "exclusiveMax" => json!({"value": 1}),
        "minLength" | "maxLength" => json!({"value": 1}),
        "pattern" => json!({"regex": "^a$", "dialect": "ecma-262"}),
        "enumValues" => json!({"values": ["a"]}),
        "nonEmpty" | "unique" => json!({}),
        "format" => json!({"name": "iana:email"}),
        other => panic!("unknown keyword {other}"),
    };
    let record = json!({
        "identity": "ix://agent-ix/test/R", "displayName": "R", "kind": "record",
        "roles": [], "origin": origin, "extensions": [], "unknownPolicy": "reject",
        "constraints": [{
            "identity": "ix://agent-ix/test/constraint/r-f-k",
            "keyword": keyword, "operands": operands,
            "appliesTo": "ix://agent-ix/test/T",
            "diagnosticCode": "agent-ix.test.F_K", "origin": origin
        }],
        "fields": [{
            "identity": "ix://agent-ix/test/R/f", "name": "f",
            "typeRef": "ix://agent-ix/test/T", "presence": "required",
            "nullable": false, "defaultKind": "none", "origin": origin,
            "multiplicity": {"lower": 1, "upper": 1, "ordered": false, "unique": false}
        }]
    });
    json!({"ir": {
        "contractVersion": "2.0.0",
        "constructs": [],
        "source": {"identity": "ix://agent-ix/test/spec", "version": "0.0.0",
                   "dialect": "spec-bundle", "digest": format!("sha256:{}", "0".repeat(64))},
        "package": {"identity": "agent-ix/test", "version": "0.0.0",
                    "manifestDigest": format!("sha256:{}", "0".repeat(64)),
                    "mappingVersions": [], "profileVersions": [],
                    "lockDigest": format!("sha256:{}", "0".repeat(64))},
        "types": [string, target, record],
        "occurrences": [], "extensions": []
    }})
}

#[trace("TC-1225", "FR-093-AC-6")]
#[trace("TC-1225", "FR-093-CON-4")]
#[test]
fn tc_1225_min_on_string_is_blocking_constraint_not_applicable_and_the_reader_agrees_over_the_cross_product(
) {
    let lift = lift("negatives/CONSTRAINT_NOT_APPLICABLE");
    let found = with_code(&lift.lowered.diagnostics, Code::ConstraintNotApplicable);
    assert_eq!(found.len(), 1, "{:?}", lift.lowered.diagnostics);
    assert!(found[0].blocking);
    assert_eq!(found[0].severity, Severity::Error);
    assert_eq!(
        found[0].locus,
        Some(locus(&lift, "spec/functional/FR-001-person.md", 19, 3))
    );
    assert!(found[0].message.contains("`min`"), "{}", found[0].message);
    assert!(found[0].message.contains("string"), "{}", found[0].message);
    assert!(
        !lift
            .lowered
            .types
            .iter()
            .any(|t| t.display_name == "Person"),
        "the record is not emitted, so no document is written"
    );
    let json = serde_json::to_value(found[0]).expect("serialises");
    assert!(common::diagnostic_schema_violations(&json, &common::common_schema(), "").is_empty());

    // The reader, handed the same constraint over the string scalar,
    // raises its own CONSTRAINT_NOT_APPLICABLE at that constraint.
    let doc = applicability_doc("scalar", "string", "min");
    let codes = reader_codes(&doc);
    assert_eq!(
        codes,
        ["agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE at /ir/types/2/constraints/0"]
    );

    // The full RULES.md cross product: the frontend's table and the
    // reader agree for every (kind, keyword) pair.
    let kinds: Vec<(&str, &str)> = vec![
        ("scalar", "boolean"),
        ("scalar", "integer"),
        ("scalar", "number"),
        ("scalar", "string"),
        ("scalar", "bytes"),
        ("scalar", "date"),
        ("scalar", "datetime"),
        ("scalar", "duration"),
        ("scalar", "uuid"),
        ("record", ""),
        ("enum", ""),
        ("union", ""),
        ("sequence", ""),
        ("map", ""),
        ("reference", ""),
    ];
    let mut pairs = 0;
    for (kind, scalar) in &kinds {
        for keyword in KEYWORDS {
            let doc = applicability_doc(kind, scalar, keyword);
            let verdict = verdict(&doc);
            let reader_rejects = verdict
                .diagnostics
                .iter()
                .any(|d| d.code.ends_with("CONSTRAINT_NOT_APPLICABLE"));
            let other: Vec<String> = verdict
                .diagnostics
                .iter()
                .filter(|d| !d.code.ends_with("CONSTRAINT_NOT_APPLICABLE"))
                .map(|d| format!("{} at {}", d.code, d.pointer))
                .collect();
            assert!(
                other.is_empty(),
                "the probe document for ({kind} {scalar}, {keyword}) is otherwise valid: {other:?}"
            );
            assert_eq!(
                !applies_to(keyword, kind, scalar),
                reader_rejects,
                "({kind} {scalar}, {keyword}): frontend applies_to={} reader rejects={reader_rejects}",
                applies_to(keyword, kind, scalar)
            );
            pairs += 1;
        }
    }
    assert_eq!(pairs, kinds.len() * KEYWORDS.len());
    // An alias resolves through to its target: the reader decides on the
    // string scalar behind it, and so does the table on the resolved kind.
    let doc = applicability_doc("alias", "", "min");
    assert!(reader_codes(&doc)
        .iter()
        .any(|c| c.contains("CONSTRAINT_NOT_APPLICABLE")));
}

#[trace("TC-1226", "FR-093-AC-7")]
#[trace("TC-1226", "FR-093-CON-3")]
#[trace("TC-1553", "FR-139-AC-2")]
#[test]
fn tc_1226_and_tc_1553_json_object_resolves_to_the_native_any_scalar_without_a_declared_loss() {
    let lift = lift("negatives/DECLARED_LOSS");
    let types = types_json(&lift);
    // A kernel scalar mints no node (gap 1 of FCD #199/#200): the field's
    // typeRef names the native reference directly.
    assert!(
        !types.iter().any(|t| t["displayName"] == "JsonObject"),
        "{types:?}"
    );
    let blob = type_named(&types, "Blob");
    assert_eq!(
        field_named(blob, "data")["typeRef"],
        "ix://quire/native/JsonObject"
    );
    assert!(!types.iter().any(|t| t.get("scalar").is_some()));

    let losses = with_code(&lift.lowered.diagnostics, Code::DeclaredLoss);
    assert!(
        !losses.iter().any(
            |d| d.message.contains("JsonObject") || d.message.contains("`unconstrained-value`")
        ),
        "{losses:?}"
    );
    assert!(
        !lift.lowered.diagnostics.iter().any(|d| d.blocking),
        "a declared loss never blocks: {:?}",
        lift.lowered.diagnostics
    );
    assert_eq!(reader_codes(&ir_document(&lift)), Vec::<String>::new());

    // The register is closed over the losses that remain after IR v1.2.
    let register = loss_register().expect("losses.json parses");
    let rows: BTreeMap<&str, _> = register.iter().map(|r| (r.code.as_str(), r)).collect();
    for loss in Loss::ALL {
        let row = rows
            .get(loss.row())
            .unwrap_or_else(|| panic!("losses.json has no row {}", loss.row()));
        assert_eq!(row.diagnostic, Code::DeclaredLoss.to_string());
    }
    assert_eq!(rows.len(), Loss::ALL.len(), "the register is closed");
    assert!(rows["lossy-extraction"].owner.contains("FR-072"));
    assert!(!rows.contains_key("unconstrained-value"));
    assert!(rows["required-collection-presence"]
        .owner
        .ends_with("FR-106"));
    for name in [
        "negatives/DECLARED_LOSS",
        "config-version-table",
        "config-version-fence",
        "business",
        "lower/collections",
    ] {
        let lift = self::lift(name);
        for d in with_code(&lift.lowered.diagnostics, Code::DeclaredLoss) {
            let named = Loss::ALL
                .iter()
                .find(|l| d.message.contains(&format!("`{}`", l.row())));
            assert!(
                named.is_some(),
                "{name}: {} names no register row",
                d.message
            );
        }
    }
}

#[trace("TC-1227", "FR-093-AC-8")]
#[test]
fn tc_1227_one_to_many_is_required_and_star_is_optional_with_one_declared_loss_each() {
    let lift = lift("lower/collections");
    let types = types_json(&lift);
    let basket = type_named(&types, "Basket");
    let items = field_named(basket, "items");
    assert_eq!(
        items["multiplicity"],
        json!({"lower": 1, "ordered": false, "unique": false})
    );
    assert_eq!(items["presence"], "required");
    let tags = field_named(basket, "tags");
    assert_eq!(
        tags["multiplicity"],
        json!({"lower": 0, "ordered": false, "unique": false})
    );
    assert_eq!(tags["presence"], "optional");
    let labels = field_named(basket, "labels");
    assert_eq!(
        labels["multiplicity"],
        json!({"lower": 0, "ordered": false, "unique": false})
    );
    assert_eq!(labels["presence"], "optional");

    let losses: Vec<&Diagnostic> = with_code(&lift.lowered.diagnostics, Code::DeclaredLoss)
        .into_iter()
        .filter(|d| d.message.contains("`required-collection-presence`"))
        .collect();
    assert_eq!(
        losses.len(),
        2,
        "one per 0..*-declared collection: {losses:?}"
    );
    assert_eq!(
        losses[0].locus,
        Some(locus(&lift, "spec/functional/FR-001-basket.md", 20, 3))
    );
    assert_eq!(
        losses[1].locus,
        Some(locus(&lift, "spec/functional/FR-001-basket.md", 21, 3))
    );
    assert!(losses
        .iter()
        .all(|d| d.severity == Severity::Info && !d.blocking));
    assert_eq!(
        lift.lowered.diagnostics.len(),
        2,
        "{:?}",
        lift.lowered.diagnostics
    );
    assert_eq!(reader_codes(&ir_document(&lift)), Vec::<String>::new());
    // The presence derivation itself.
    let m = |lower: u64, upper: Option<u64>| quire_rs::semantic::Multiplicity {
        lower,
        upper,
        ordered: None,
        unique: None,
    };
    assert_eq!(Presence::of(&m(1, None)), Presence::Required);
    assert_eq!(Presence::of(&m(0, None)), Presence::Optional);
    assert_eq!(Presence::of(&m(0, Some(1))), Presence::Optional);
    assert_eq!(Presence::of(&m(2, Some(5))), Presence::Required);
}

#[trace("TC-1228", "FR-093-AC-9")]
#[test]
fn tc_1228_legacy_form_emits_no_record_and_a_warning_while_both_forms_blocks() {
    let legacy = lift("legacy");
    assert!(
        !legacy.lowered.types.iter().any(|t| t.kind == Kind::Record),
        "no record: {:?}",
        legacy.lowered.types
    );
    let not_lowered = with_code(&legacy.lowered.diagnostics, Code::ArtifactNotLowered);
    assert_eq!(not_lowered.len(), 1, "{:?}", legacy.lowered.diagnostics);
    assert!(!not_lowered[0].blocking);
    assert_eq!(not_lowered[0].severity, Severity::Warning);
    assert!(not_lowered[0].message.contains("legacy-form"));
    assert_eq!(
        legacy.resolutions.outcomes.get("FR-006"),
        Some(&Outcome::NotLowered {
            cause: locus(
                &legacy,
                "spec/functional/FR-006-config-version-entity.md",
                1,
                1
            )
        })
    );

    let both = lift("negatives/ARTIFACT_NOT_LOWERED");
    let blocking: Vec<&Diagnostic> = with_code(&both.lowered.diagnostics, Code::ArtifactNotLowered)
        .into_iter()
        .filter(|d| d.message.contains("both-forms"))
        .collect();
    assert_eq!(blocking.len(), 1, "{:?}", both.lowered.diagnostics);
    assert!(blocking[0].blocking);
    assert_eq!(blocking[0].severity, Severity::Error);
    assert_eq!(
        blocking[0].locus,
        Some(locus(&both, "spec/functional/FR-001-both-forms.md", 1, 1))
    );
    assert!(
        !both
            .lowered
            .types
            .iter()
            .any(|t| t.display_name == "BothForms"),
        "{:?}",
        both.lowered.types
    );
    // The direct call reports the pass-one verdict without re-raising it.
    let package = PackageIdentity::from(both.bundle.package());
    let artifact = artifact_ref(&both, "FR-001");
    let ctx = context(&both, &package, "FR-001", &artifact);
    let extraction = &both.extractions.artifacts["FR-001"].extraction;
    assert_eq!(
        lower_record(extraction, &both.resolutions.resolutions, &[], &ctx),
        Err(LowerError::NotLowered)
    );
}

/// A random identifier per field, distinct *after slugging*.
///
/// Distinct names are not enough. The shared identity rule (#87) replaces every
/// non-alphanumeric run with `-` and trims the ends, so `k` and `k_` are two
/// names and one identity segment — and the rule refuses that collision rather
/// than minting a second `k`, which is the behaviour a different case asserts.
/// Generating over names that collide after slugging made this property assert
/// that a legitimate refusal is a rename failure, and it failed on whichever
/// seed happened to produce such a pair.
fn renames(count: usize) -> impl Strategy<Value = Vec<String>> {
    proptest::collection::btree_set("[a-z][A-Za-z0-9_]{0,10}", count)
        .prop_filter("names must remain distinct once slugged", |set| {
            let slugs: BTreeSet<String> = set
                .iter()
                .filter_map(|name| agent_ix_extraction_frontend::identity::slug(name).ok())
                .collect();
            slugs.len() == set.len()
        })
        .prop_map(|set| set.into_iter().collect())
}

#[trace("TC-1229", "FR-093-AC-10")]
#[trace("TC-1229", "FR-093-CON-2")]
#[test]
fn tc_1229_renaming_every_field_changes_only_its_own_name_identity_and_its_constraints_applies_to_and_diagnostic_code(
) {
    let lift = lift("lower/constraints");
    let package = PackageIdentity::from(lift.bundle.package());
    let artifact = artifact_ref(&lift, "FR-001");
    let ctx = context(&lift, &package, "FR-001", &artifact);
    let document = lift
        .bundle
        .documents()
        .iter()
        .find(|d| d.id() == "FR-001")
        .expect("FR-001");
    let rows = field_rows(document.raw());
    let extraction = &lift.extractions.artifacts["FR-001"].extraction;
    let baseline =
        lower_record(extraction, &lift.resolutions.resolutions, &rows, &ctx).expect("lowers");
    let base = serde_json::to_value(&baseline.definition).expect("serialises");
    let decls = extraction.fields.as_deref().expect("fields");

    let mut runner = TestRunner::new(Config::with_cases(64));
    runner
        .run(&renames(decls.len()), |names| {
            let mut renamed = extraction.clone();
            let mut resolutions: Vec<Resolved> = lift
                .resolutions
                .resolutions
                .iter()
                .filter(|r| r.artifact == "FR-001")
                .cloned()
                .collect();
            let mut rows = rows.clone();
            for (i, name) in names.iter().enumerate() {
                let old = decls[i].name.clone();
                renamed.fields.as_mut().expect("fields")[i].name = name.clone();
                for r in resolutions.iter_mut().filter(|r| r.field == old) {
                    r.field = name.clone();
                }
                for row in rows.iter_mut().filter(|r| r.name == old) {
                    row.name = name.clone();
                }
            }
            let lowered = lower_record(&renamed, &resolutions, &rows, &ctx)
                .map_err(|e| TestCaseError::fail(format!("{e:?}")))?;
            let got = serde_json::to_value(&lowered.definition).expect("serialises");
            // The record itself is untouched by field names.
            prop_assert_eq!(without(&got, &["fields"]), without(&base, &["fields"]));
            let base_fields = base["fields"].as_array().expect("fields");
            let got_fields = got["fields"].as_array().expect("fields");
            prop_assert_eq!(got_fields.len(), base_fields.len());
            for (b, g) in base_fields.iter().zip(got_fields) {
                prop_assert_ne!(&g["name"], &b["name"]);
                // Constraints live inline on the field (gap 1 of FCD
                // #199/#200): renaming moves only the field's own name and
                // identity, and each constraint's appliesTo and
                // diagnosticCode with it; typeRef, keyword and operands are
                // untouched.
                let moved: &[&str] = &["name", "identity", "constraints"];
                prop_assert_eq!(without(g, moved), without(b, moved));
                // `constraints` is `skip_serializing_if = "Vec::is_empty"`
                // (schema: not required on `field`), so a field with none
                // carries no `constraints` member at all rather than `[]`.
                let empty = Vec::new();
                let base_constraints = b
                    .get("constraints")
                    .and_then(Value::as_array)
                    .unwrap_or(&empty);
                let got_constraints = g
                    .get("constraints")
                    .and_then(Value::as_array)
                    .unwrap_or(&empty);
                prop_assert_eq!(got_constraints.len(), base_constraints.len());
                for (bc, gc) in base_constraints.iter().zip(got_constraints) {
                    prop_assert_eq!(
                        without(gc, &["identity", "appliesTo", "diagnosticCode"]),
                        without(bc, &["identity", "appliesTo", "diagnosticCode"])
                    );
                    prop_assert_eq!(&gc["appliesTo"], &g["identity"]);
                }
            }
            Ok(())
        })
        .expect(
            "64 renamings move only a field's own name, identity, and its constraints' appliesTo and diagnosticCode",
        );
}

#[trace("TC-1333", "FR-093-AC-12")]
#[test]
fn tc_1333_the_business_enumeration_lowers_to_one_enum_with_a_variant_per_values_row_and_no_field_constraint_mints_a_node(
) {
    let lift = lift("business");
    assert!(
        !lift.lowered.diagnostics.iter().any(|d| d.blocking),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let status = type_named(&types, "OrderStatus");
    assert_eq!(
        status["kind"],
        json!({"module": "agent-ix/spec-objects-business", "name": "enumeration"})
    );
    assert_eq!(status["identity"], "ix://agent-ix/orders/EN_001");
    assert_eq!(
        status["roles"],
        json!(["business:aggregate-member", "business:enumeration"])
    );
    assert_eq!(status["unknownPolicy"], "reject");
    assert_eq!(status["constraints"], json!([]));
    assert_eq!(status["extensions"], json!([]));
    assert!(status.get("fields").is_none());
    assert_eq!(
        status["origin"]["source"]["path"],
        "spec/functional/EN_001-order-status.md"
    );
    let variants = status["variants"].as_array().expect("variants");
    let names: Vec<&str> = variants
        .iter()
        .map(|v| v["name"].as_str().expect("name"))
        .collect();
    assert_eq!(names, ["draft", "placed", "shipped", "cancelled"]);
    let identities: Vec<&str> = variants
        .iter()
        .map(|v| v["identity"].as_str().expect("identity"))
        .collect();
    assert_eq!(
        identities,
        [
            "ix://agent-ix/orders/variant/EN_001-draft",
            "ix://agent-ix/orders/variant/EN_001-placed",
            "ix://agent-ix/orders/variant/EN_001-shipped",
            "ix://agent-ix/orders/variant/EN_001-cancelled",
        ]
    );
    for (i, v) in variants.iter().enumerate() {
        assert_eq!(
            v["origin"]["source"],
            json!({
                "sourceIdentity": "ix://agent-ix/orders/spec",
                "path": "spec/functional/EN_001-order-status.md",
                "startLine": 15 + i, "startColumn": 3
            })
        );
    }
    assert_eq!(VALUE_COLUMN, "Value");
    // The entity's cell resolves to the enum's identity.
    let order = type_named(&types, "Order");
    assert_eq!(
        field_named(order, "status")["typeRef"],
        "ix://agent-ix/orders/EN_001"
    );
    assert_eq!(reader_codes(&ir_document(&lift)), Vec::<String>::new());

    // No `## Values`: blocking ARTIFACT_NOT_LOWERED naming the evaluator's
    // reason.
    let missing = self::lift("negatives/ARTIFACT_NOT_LOWERED");
    let colour: Vec<&Diagnostic> =
        with_code(&missing.lowered.diagnostics, Code::ArtifactNotLowered)
            .into_iter()
            .filter(|d| d.message.contains("EN_001"))
            .collect();
    assert_eq!(colour.len(), 1, "{:?}", missing.lowered.diagnostics);
    assert!(colour[0].blocking);
    assert!(
        colour[0].message.contains("`values`"),
        "{}",
        colour[0].message
    );
    assert!(
        colour[0].message.contains("Values"),
        "{}",
        colour[0].message
    );
    assert_eq!(
        colour[0].locus,
        Some(locus(&missing, "spec/functional/EN_001-colour.md", 1, 1))
    );
    assert!(!missing
        .lowered
        .types
        .iter()
        .any(|t| t.display_name == "Colour"));

    // A constrained field keeps its constraints inline; no alias node is
    // minted for it (gap 1 of FCD #199/#200), so every definition in a
    // fixture document is a record or a construct, and every field
    // constraint applies to its own field.
    for name in [
        "config-version-table",
        "config-version-fence",
        "business",
        "lower/constraints",
        "lower/collections",
        "negatives/DECLARED_LOSS",
        "resolve/enumeration",
    ] {
        let lift = self::lift(name);
        let types = types_json(&lift);
        for t in &lift.lowered.types {
            assert!(
                matches!(t.kind, Kind::Record | Kind::Construct(_)),
                "{name}: {:?}",
                t.kind
            );
        }
        let empty = Vec::new();
        for record in &types {
            for field in record["fields"].as_array().into_iter().flatten() {
                let constraints = field
                    .get("constraints")
                    .and_then(Value::as_array)
                    .unwrap_or(&empty);
                for c in constraints {
                    assert_eq!(c["appliesTo"], field["identity"], "{name}: {field}");
                }
            }
        }
    }
}

#[trace("TC-1334", "FR-093-AC-13")]
#[test]
fn tc_1334_status_and_status_collide_and_repeated_or_colliding_constraints_are_duplicate_constraint(
) {
    let lift = lift("negatives/DUPLICATE_TYPE_NAME");
    let dup = with_code(&lift.lowered.diagnostics, Code::DuplicateTypeName);
    assert_eq!(dup.len(), 1, "{:?}", lift.lowered.diagnostics);
    assert!(dup[0].blocking);
    assert_eq!(
        dup[0].locus,
        Some(locus(&lift, "spec/functional/FR-002-status.md", 1, 1)),
        "at the second document in path order"
    );
    assert_eq!(
        dup[0].related,
        vec![locus(&lift, "spec/functional/FR-001-status.md", 1, 1)]
    );
    assert!(
        dup[0].message.contains("FR-001-status.md"),
        "{}",
        dup[0].message
    );
    assert!(dup[0].message.contains("FR-002"), "{}", dup[0].message);

    let lift = self::lift("negatives/DUPLICATE_CONSTRAINT");
    let dup = with_code(&lift.lowered.diagnostics, Code::DuplicateConstraint);
    assert_eq!(dup.len(), 1, "{:?}", lift.lowered.diagnostics);
    assert!(dup.iter().all(|d| d.blocking));
    assert_eq!(
        dup[0].locus,
        Some(locus(&lift, "spec/functional/FR-001-counter.md", 18, 3)),
        "`min: 1, min: 2` at that row"
    );
    assert!(dup[0].message.contains("twice"), "{}", dup[0].message);
    assert!(
        lift.lowered.types.iter().any(|t| t.display_name == "Pair"),
        "the distinct diagnostic codes permit the Pair record: {:?}",
        lift.lowered.types
    );

    // The naming rule's other refusal (FR-093 "The record"): a title that
    // is no Identifier and no `name` to fall back on.
    let lift = self::lift("negatives/UNNAMEABLE_ARTIFACT");
    let unnameable = with_code(&lift.lowered.diagnostics, Code::UnnameableArtifact);
    assert_eq!(unnameable.len(), 1, "{:?}", lift.lowered.diagnostics);
    assert!(unnameable[0].blocking);
    assert_eq!(
        unnameable[0].locus,
        Some(locus(
            &lift,
            "spec/functional/FR-005-config-overlay-entity.md",
            1,
            1
        ))
    );
    assert!(
        unnameable[0].message.contains("Config Overlay Entity"),
        "{}",
        unnameable[0].message
    );
    // The artifact is refused, so it mints no record; a kernel scalar
    // mints no node either (gap 1 of FCD #199/#200): the bundle mints
    // nothing at all.
    assert!(lift.lowered.types.is_empty(), "{:?}", lift.lowered.types);
}

#[trace("TC-1334", "FR-093-AC-13")]
#[test]
fn tc_1334_distinct_names_with_one_slug_refuse_at_field_and_variant_levels() {
    // Contract case (b) does not reach the type level: an artifact id is its
    // identity segment verbatim, so two distinct ids mint two distinct
    // `type/` identities and neither is refused. Only a name — a field, a
    // variant — is slugged, and only a slug can fold two names into one.
    let types = tempfile::tempdir().expect("type collision fixture");
    scratch_spec(types.path());
    write_fixture(
        types.path(),
        "spec/functional/FR-001.md",
        &entity("FR_001", "ConfigVersion", "| id | UUID | 1 | identity |\n"),
    );
    write_fixture(
        types.path(),
        "spec/functional/FR-002.md",
        &entity("FR__001", "ConfigOverlay", "| id | UUID | 1 | identity |\n"),
    );
    let type_lift = lift_at(types.path(), &[&business_module(), &edge_vocabulary()]);
    assert!(
        with_code(&type_lift.lowered.diagnostics, Code::UnsluggableName).is_empty(),
        "{:?}",
        type_lift.lowered.diagnostics
    );
    let minted: Vec<&str> = type_lift
        .lowered
        .types
        .iter()
        .map(|t| t.identity.as_str())
        .collect();
    assert!(
        minted.contains(&"ix://agent-ix/identity-collision/FR_001")
            && minted.contains(&"ix://agent-ix/identity-collision/FR__001"),
        "{minted:?}"
    );

    let fields = tempfile::tempdir().expect("field collision fixture");
    scratch_spec(fields.path());
    write_fixture(
        fields.path(),
        "spec/functional/FR-001.md",
        &entity(
            "FR-001",
            "Note",
            "| created_at | String | 1 | |\n| created__at | String | 1 | |\n",
        ),
    );
    let field_lift = lift_at(fields.path(), &[&business_module(), &edge_vocabulary()]);
    let field_diagnostics = with_code(&field_lift.lowered.diagnostics, Code::UnsluggableName);
    assert_eq!(
        field_diagnostics.len(),
        1,
        "{:?}",
        field_lift.lowered.diagnostics
    );
    assert_eq!(
        field_diagnostics[0]
            .locus
            .as_ref()
            .map(|locus| locus.start_line),
        Some(15)
    );

    let variants = tempfile::tempdir().expect("variant collision fixture");
    scratch_spec(variants.path());
    write_fixture(
        variants.path(),
        "spec/functional/EN_001.md",
        "---\nid: EN_001\ntitle: Marks\nname: Marks\nobject: enumeration\ntype: FR\n---\n# Marks\n\n## Values\n\n| Value | Description |\n| --- | --- |\n| a_b | first |\n| a__b | second |\n",
    );
    let variant_lift = lift_at(variants.path(), &[&business_module(), &edge_vocabulary()]);
    let variant_diagnostics = with_code(&variant_lift.lowered.diagnostics, Code::UnsluggableName);
    assert_eq!(
        variant_diagnostics.len(),
        1,
        "{:?}",
        variant_lift.lowered.diagnostics
    );
    assert_eq!(
        variant_diagnostics[0]
            .locus
            .as_ref()
            .map(|locus| locus.start_line),
        Some(15)
    );
}

#[trace("TC-1758", "FR-095-AC-17")]
#[test]
fn tc_1758_an_artifact_id_that_slugs_to_nothing_raises_unsluggable_name_and_no_panic() {
    for id in ["_", "\u{00e9}\u{00e8}"] {
        let bundle = tempfile::tempdir().expect("id fixture");
        scratch_spec(bundle.path());
        write_fixture(
            bundle.path(),
            "spec/functional/FR-001.md",
            &entity(id, "Note", "| id | UUID | 1 | identity |\n"),
        );
        let lift = lift_at(bundle.path(), &[&business_module(), &edge_vocabulary()]);
        let refused = with_code(&lift.lowered.diagnostics, Code::UnsluggableName);
        assert_eq!(refused.len(), 1, "{id}: {:?}", lift.lowered.diagnostics);
        assert!(refused[0].blocking, "{id}");
        assert_eq!(
            refused[0].locus,
            Some(locus(&lift, "spec/functional/FR-001.md", 1, 1)),
            "{id}"
        );
        assert!(
            lift.lowered.types.iter().all(|t| t.display_name != "Note"),
            "{id}: {:?}",
            lift.lowered.types
        );
    }

    // An artifact id that reads like a kernel scalar mints its own record
    // normally: a kernel scalar mints no node (gap 1 of FCD #199/#200), so
    // there is nothing left for the artifact's own `type/UUID` to collide
    // with.
    let bundle = tempfile::tempdir().expect("kernel id fixture");
    scratch_spec(bundle.path());
    write_fixture(
        bundle.path(),
        "spec/functional/FR-001.md",
        &entity("UUID", "Note", "| id | UUID | 1 | identity |\n"),
    );
    let lift = lift_at(bundle.path(), &[&business_module(), &edge_vocabulary()]);
    assert!(
        !lift.lowered.diagnostics.iter().any(|d| d.blocking),
        "{:?}",
        lift.lowered.diagnostics
    );
    let package = PackageIdentity::from(lift.bundle.package());
    let note = lift
        .lowered
        .types
        .iter()
        .find(|t| t.display_name == "Note")
        .expect("Note lowers");
    assert_eq!(
        note.identity,
        package.type_identity("UUID").expect("type identity")
    );
}

#[trace("TC-1335", "FR-093-AC-14")]
#[test]
fn tc_1335_a_domain_without_properties_lowers_to_an_empty_record_and_lossy_yields_one_declared_loss(
) {
    let lift = lift("business");
    let types = types_json(&lift);
    let domain = type_named(&types, "Ordering");
    assert_eq!(
        domain["kind"],
        json!({"module": "agent-ix/spec-objects-business", "name": "domain"})
    );
    assert!(domain.get("fields").is_none(), "{domain}");
    assert_eq!(domain["roles"], json!(["business:domain"]));
    assert_eq!(
        lift.extractions.artifacts["DM_001"]
            .extraction
            .availability
            .fields
            .state,
        quire_rs::semantic::AvailabilityState::NotApplicable
    );
    assert!(
        !lift
            .lowered
            .diagnostics
            .iter()
            .any(|d| d.message.contains("DM_001")),
        "no diagnostic for the domain: {:?}",
        lift.lowered.diagnostics
    );
    let verdict = verdict(&ir_document(&lift));
    assert_eq!(
        verdict.result_state,
        ResultState::Success,
        "{:?}",
        reader_codes(&ir_document(&lift))
    );

    // A lossy extraction: one DECLARED_LOSS naming lossy-extraction.
    let package = PackageIdentity::from(lift.bundle.package());
    let artifact = artifact_ref(&lift, "DM_001");
    let ctx = context(&lift, &package, "DM_001", &artifact);
    let mut lossy = lift.extractions.artifacts["DM_001"].extraction.clone();
    lossy.availability.fields.lossy = true;
    let lowered = lower_record(&lossy, &lift.resolutions.resolutions, &[], &ctx).expect("lowers");
    assert_eq!(lowered.diagnostics.len(), 1, "{:?}", lowered.diagnostics);
    let loss = &lowered.diagnostics[0];
    assert_eq!(loss.code, WireCode::Registry(Code::DeclaredLoss));
    assert!(
        loss.message.contains("`lossy-extraction`"),
        "{}",
        loss.message
    );
    assert_eq!(loss.severity, Severity::Info);
    assert!(!loss.blocking);
    assert_eq!(
        loss.locus,
        Some(locus(&lift, "spec/domain/DM_001-ordering.md", 1, 1))
    );
    assert_eq!(lowered.definition.fields, Some(Vec::new()));
}

#[trace("TC-1347", "FR-095-AC-14")]
#[trace("TC-1347", "FR-093-AC-13")]
#[test]
fn tc_1347_equal_status_names_refuse_at_the_second_document_and_mint_no_field_twice() {
    let lift = lift("negatives/DUPLICATE_TYPE_NAME");
    let dup = with_code(&lift.lowered.diagnostics, Code::DuplicateTypeName);
    assert_eq!(dup.len(), 1);
    assert!(dup[0].blocking, "the lift refuses");
    assert_eq!(
        dup[0].locus.as_ref().map(|l| l.path.as_str()),
        Some("spec/functional/FR-002-status.md")
    );
    let identities: Vec<String> = lift
        .lowered
        .types
        .iter()
        .flat_map(|t| t.fields.iter().flatten().map(|f| f.identity.clone()))
        .chain(
            lift.lowered
                .types
                .iter()
                .flat_map(|t| t.constraints.iter().map(|c| c.identity.clone())),
        )
        .collect();
    let unique: BTreeSet<&String> = identities.iter().collect();
    assert_eq!(
        unique.len(),
        identities.len(),
        "no identity twice: {identities:?}"
    );
    let status_fields: Vec<&String> = identities
        .iter()
        .filter(|i| i.contains("/FR-001/"))
        .collect();
    assert_eq!(
        status_fields.len(),
        2,
        "the first Status keeps its two fields, the second mints none: {identities:?}"
    );
    // An artifact titled like a kernel scalar is unreferenceable by that
    // name (pass one's non-blocking `KERNEL_NAME_SHADOWED`, FR-092-AC-8): a
    // `Type` cell reading `String` resolves to the kernel scalar first. The
    // artifact still lowers to its own `type/String` record — a kernel
    // scalar mints no node to collide with (gap 1 of FCD #199/#200).
    let shadowed = self::lift("negatives/KERNEL_NAME_SHADOWED");
    assert!(
        !shadowed.lowered.diagnostics.iter().any(|d| d.blocking),
        "{:?}",
        shadowed.lowered.diagnostics
    );
    let warned = with_code(&shadowed.lowered.diagnostics, Code::KernelNameShadowed);
    assert_eq!(warned.len(), 1, "{:?}", shadowed.lowered.diagnostics);
    assert!(!warned[0].blocking);
    assert!(
        warned[0].message.contains("kernel scalar name String"),
        "{}",
        warned[0].message
    );
    assert_eq!(
        warned[0].locus,
        Some(locus(&shadowed, "spec/functional/FR-007-string.md", 1, 1))
    );
    assert!(
        with_code(&shadowed.lowered.diagnostics, Code::DuplicateTypeName).is_empty(),
        "no identity collision remains: {:?}",
        shadowed.lowered.diagnostics
    );
    // A real `TypeDefinition`, not a synthetic alias (gap 1 of FCD
    // #199/#200): its `kind` reflects the artifact's own construct, `entity`
    // here, same as every other definition this fixture's package lowers —
    // `Kind::Record` is only the artifact-declares-no-construct case.
    assert!(
        shadowed
            .lowered
            .types
            .iter()
            .any(|t| t.display_name == "String"),
        "FR-007 lowers to its own type/String: {:?}",
        shadowed.lowered.types
    );
}
