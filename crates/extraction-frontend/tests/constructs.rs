//! FR-141, FR-142, FR-143 and NFR-044: the contract `1.2.0` model members and
//! object-type constructs, read by the Rust reader over the committed
//! `semantic-ir-v1-2-constructs.json` positive and its one-rule mutations, by
//! the FR-050 node reader over the same documents, refused by both backends,
//! and lifted from the `business` fixture and its one-rule edits.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::constructs::construct_kind;
use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, WireCode};
use agent_ix_extraction_frontend::{
    extract, lower_bundle, resolve, Bundle, LiftOutcome, Limits, Lowered,
};
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::{decide, ResultState};
use common::{
    business_module, copy_tree, edge_vocabulary, fixture, lift_fixture, read_json, run_node,
    workspace_dir,
};
use ix_trace_rs::trace;
use serde_json::{json, Value};

const PREFIX: &str = "ix://agent-ix/orders/";

/// One in-place change to an IR document.
type Mutation = Box<dyn Fn(&mut Value)>;

/// One change to an artifact's text.
type Edit = Box<dyn Fn(&str) -> String>;

/// The committed `1.2.0` positive carrying every model member and one
/// construct of each kind.
fn positive_path() -> PathBuf {
    workspace_dir().join("fixtures/semantic/v1/positive/semantic-ir-v1-2-constructs.json")
}

fn positive() -> Value {
    read_json(&positive_path())
}

/// The published `1.1.0` positive with an operation on its record.
fn v1_1() -> Value {
    read_json(&workspace_dir().join("fixtures/semantic/v1/positive/semantic-ir-v1-1.json"))
}

fn type_ref(id: &str) -> String {
    format!("{PREFIX}type/{id}")
}

fn field_ref(owner: &str, name: &str) -> String {
    format!("{PREFIX}field/{owner}-{name}")
}

/// The index of the type whose identity is `identity` in `document`.
fn position(document: &Value, identity: &str) -> usize {
    document["types"]
        .as_array()
        .expect("types")
        .iter()
        .position(|t| t["identity"] == identity)
        .unwrap_or_else(|| panic!("no type {identity}"))
}

/// The type of `document` whose identity ends in `type/<id>`.
fn type_mut<'a>(document: &'a mut Value, id: &str) -> &'a mut Value {
    let at = position(document, &type_ref(id));
    &mut document["types"][at]
}

/// `<code suffix> at <pointer>` for every Rust reader diagnostic.
fn rust_codes(document: &Value) -> Vec<String> {
    let text = serde_json::to_string(&json!({ "ir": document })).expect("serialises");
    decide(&parse_json(&text).expect("parses"))
        .diagnostics
        .iter()
        .map(|d| {
            let code = d.code.rsplit('.').next().unwrap_or(d.code);
            format!("{code} at {}", d.pointer)
        })
        .collect()
}

/// The code suffixes of the FR-050 node reader over `document`: the published
/// schema (`validateIrDocument`, whose schema code is `INVALID_IR`) and the
/// cross-field reader (`readContractIr`).
fn node_codes(document: &Value) -> Vec<String> {
    let root = workspace_dir();
    let script = format!(
        "const fs=require('fs');const {{pathToFileURL}}=require('url');\
         Promise.all([import(pathToFileURL({:?}).href),import(pathToFileURL({:?}).href)])\
         .then(([s,r])=>{{const doc=JSON.parse(fs.readFileSync(0,'utf8'));\
         const found=[...s.validateIrDocument(doc),...r.readContractIr(doc)];\
         process.stdout.write(JSON.stringify(found.map(d=>d.code)));}})\
         .catch(e=>{{console.error(e);process.exit(3);}});",
        root.join("src/compiler/ir/schema.mjs").to_string_lossy(),
        root.join("src/compiler/ir/reader.mjs").to_string_lossy(),
    );
    let bytes = serde_json::to_vec(document).expect("serialises");
    let run = run_node(&["-e", &script], &bytes, None).unwrap_or_else(|e| panic!("{e}"));
    assert_eq!(run.status, 0, "node reader: {}", run.stderr);
    let codes: Vec<String> = serde_json::from_slice(&run.stdout).expect("codes");
    codes
        .into_iter()
        .map(|code| code.rsplit('.').next().unwrap_or(&code).to_string())
        .collect()
}

fn assert_refused_by_schema(label: &str, document: &Value) {
    let rust = rust_codes(document);
    assert!(
        !rust.is_empty() && rust.iter().all(|c| c.starts_with("SCHEMA_VIOLATION at ")),
        "{label}: rust reader {rust:?}"
    );
    let node = node_codes(document);
    assert!(
        node.iter().any(|c| c == "INVALID_IR"),
        "{label}: node reader {node:?}"
    );
}

/// Asserts the Rust reader raises exactly `expected` over `document`.
fn assert_rust(label: &str, document: &Value, expected: &[String]) {
    assert_eq!(rust_codes(document), expected, "{label}");
}

#[trace("TC-1740", "FR-141-AC-1")]
#[trace("TC-1740", "FR-141-CON-2")]
#[trace("TC-1745", "FR-142-AC-1")]
#[test]
fn tc_1740_and_tc_1745_every_model_member_and_construct_kind_reads_clean_in_rust_and_node() {
    let document = positive();
    assert_eq!(document["contractVersion"], "1.2.0");
    let text = serde_json::to_string(&json!({ "ir": document })).expect("serialises");
    let verdict = decide(&parse_json(&text).expect("parses"));
    assert_eq!(
        verdict.result_state,
        ResultState::Success,
        "{:?}",
        rust_codes(&document)
    );
    assert_eq!(node_codes(&document), Vec::<String>::new());
    let types = document["types"].as_array().expect("types");
    let mut kinds: Vec<&str> = types.iter().filter_map(|t| t["kind"].as_str()).collect();
    kinds.sort_unstable();
    kinds.dedup();
    for kind in [
        "entity",
        "value_object",
        "nested_entity",
        "aggregate_root",
        "enumeration",
        "event",
        "state_machine",
        "process",
        "repository",
        "domain",
    ] {
        assert!(kinds.contains(&kind), "no {kind} construct: {kinds:?}");
    }
    let has = |member: &str| types.iter().any(|t| t.get(member).is_some());
    let field_has = |member: &str| {
        types
            .iter()
            .flat_map(|t| t["fields"].as_array().into_iter().flatten())
            .any(|f| f.get(member).is_some())
    };
    let operation_has = |member: &str| {
        types
            .iter()
            .flat_map(|t| t["operations"].as_array().into_iter().flatten())
            .any(|o| o.get(member).is_some())
    };
    assert!(has("supertypes") && has("abstract"));
    assert!(field_has("subsets") && field_has("redefines") && field_has("presence"));
    assert!(operation_has("frame") && operation_has("requires") && operation_has("ensures"));
    assert!(types.iter().any(|t| t["scalar"] == "any"));
    assert!(!document["populations"]
        .as_array()
        .expect("populations")
        .is_empty());
    let languages: Vec<&str> = types
        .iter()
        .flat_map(|t| t["operations"].as_array().into_iter().flatten())
        .flat_map(|o| o["requires"].as_array().into_iter().flatten())
        .filter_map(|c| c["language"].as_str())
        .collect();
    assert!(languages.contains(&"quire"), "{languages:?}");
    // FR-141-CON-2: a clause language outside the closed set is refused.
    let mut unknown = positive();
    let sm = type_mut(&mut unknown, "SM-001");
    sm["operations"][0]["requires"][0]["language"] = json!("english");
    assert_refused_by_schema("unregistered inline clause language", &unknown);
}

#[trace("TC-1741", "FR-141-AC-2")]
#[test]
fn tc_1741_unresolved_foreign_kind_and_cyclic_supertypes_raise_their_codes() {
    let order = position(&positive(), &type_ref("FR-001"));
    let party = position(&positive(), &type_ref("FR-000"));

    let mut unresolved = positive();
    type_mut(&mut unresolved, "FR-001")["supertypes"] = json!([type_ref("FR-999")]);
    let codes = rust_codes(&unresolved);
    assert!(
        codes.contains(&format!(
            "UNRESOLVED_CONSTRUCT_REF at /ir/types/{order}/supertypes/0"
        )),
        "{codes:?}"
    );

    let mut foreign = positive();
    type_mut(&mut foreign, "FR-001")["supertypes"] = json!([type_ref("VO-001")]);
    let codes = rust_codes(&foreign);
    assert!(
        codes.contains(&format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{order}/supertypes/0"
        )),
        "{codes:?}"
    );

    let mut cycle = positive();
    type_mut(&mut cycle, "FR-000")["supertypes"] = json!([type_ref("FR-001")]);
    let codes = rust_codes(&cycle);
    for at in [order, party] {
        assert!(
            codes.contains(&format!("SUPERTYPE_CYCLE at /ir/types/{at}/supertypes")),
            "{codes:?}"
        );
    }
}

#[trace("TC-1742", "FR-141-AC-3")]
#[test]
fn tc_1742_unresolved_subsets_and_widening_redefines_raise_their_codes() {
    let document = positive();
    let order = position(&document, &type_ref("FR-001"));
    let fields = document["types"][order]["fields"]
        .as_array()
        .expect("fields");
    let badges = fields
        .iter()
        .position(|f| f["name"] == "badges")
        .expect("badges");
    let labels = fields
        .iter()
        .position(|f| f["name"] == "labels")
        .expect("labels");

    let mut unresolved = positive();
    type_mut(&mut unresolved, "FR-001")["fields"][badges]["subsets"] =
        json!([field_ref("FR-000", "missing")]);
    assert_rust(
        "unresolved subsets",
        &unresolved,
        &[format!(
            "UNRESOLVED_FEATURE_REF at /ir/types/{order}/fields/{badges}/subsets/0"
        )],
    );

    let mut widening = positive();
    type_mut(&mut widening, "FR-001")["fields"][labels]["multiplicity"] =
        json!({ "lower": 0, "upper": 9 });
    assert_rust(
        "widening redefines",
        &widening,
        &[format!(
            "INVALID_REDEFINITION at /ir/types/{order}/fields/{labels}/redefines"
        )],
    );
}

#[trace("TC-1743", "FR-141-AC-4")]
#[test]
fn tc_1743_unresolved_frame_path_and_population_member_raise_their_codes() {
    let sm = position(&positive(), &type_ref("SM-001"));
    let mut frame = positive();
    type_mut(&mut frame, "SM-001")["operations"][0]["frame"]["modifies"] =
        json!(["current", "nowhere.deep"]);
    assert_rust(
        "unresolved frame path",
        &frame,
        &[format!(
            "UNRESOLVED_FRAME_PATH at /ir/types/{sm}/operations/0/frame/modifies/1"
        )],
    );

    let mut population = positive();
    population["populations"][0]["members"][0]["typeRef"] = json!(type_ref("FR-999"));
    assert_rust(
        "unresolved population member",
        &population,
        &["UNRESOLVED_TYPE_REF at /ir/populations/0/members/0/typeRef".to_string()],
    );
}

#[trace("TC-1744", "FR-141-AC-5")]
#[trace("TC-1744", "FR-141-CON-1")]
#[trace("TC-1756", "NFR-044-AC-1")]
#[test]
fn tc_1744_and_tc_1756_every_1_2_member_and_kind_inside_a_1_1_document_is_refused() {
    let base = v1_1();
    assert!(rust_codes(&base).is_empty(), "{:?}", rust_codes(&base));
    let record = position(&base, "ix://agent-ix/assurance/type/Artifact");
    let scalar = position(&base, "ix://agent-ix/assurance/type/Text");
    let quire =
        json!([{ "language": "quire", "text": "true", "origin": base["types"][record]["origin"] }]);
    let mutations: Vec<(&str, Mutation)> = vec![
        (
            "supertypes",
            Box::new(move |d| {
                d["types"][record]["supertypes"] = json!(["ix://agent-ix/assurance/type/Project"])
            }),
        ),
        (
            "abstract",
            Box::new(move |d| d["types"][record]["abstract"] = json!(true)),
        ),
        (
            "subsets",
            Box::new(move |d| d["types"][record]["fields"][0]["subsets"] = json!([])),
        ),
        (
            "redefines",
            Box::new(move |d| {
                d["types"][record]["fields"][0]["redefines"] =
                    d["types"][record]["fields"][1]["identity"].clone()
            }),
        ),
        (
            "frame",
            Box::new(move |d| {
                d["types"][record]["operations"][0]["frame"] =
                    json!({ "modifies": [], "creates": [], "deletes": [] })
            }),
        ),
        (
            "requires",
            Box::new({
                let quire = quire.clone();
                move |d| d["types"][record]["operations"][0]["requires"] = quire.clone()
            }),
        ),
        (
            "ensures",
            Box::new(move |d| d["types"][record]["operations"][0]["ensures"] = quire.clone()),
        ),
        ("populations", Box::new(|d| d["populations"] = json!([]))),
        (
            "scalar any",
            Box::new(move |d| d["types"][scalar]["scalar"] = json!("any")),
        ),
        (
            "construct kind",
            Box::new(move |d| {
                d["types"][record]["kind"] = json!("value_object");
            }),
        ),
    ];
    for (label, mutate) in &mutations {
        let mut document = v1_1();
        mutate(&mut document);
        assert_refused_by_schema(label, &document);
    }
    // NFR-044-AC-1: every published 1.0.0 and 1.1.0 positive keeps a clean verdict.
    for name in [
        "semantic-ir.json",
        "semantic-ir-v1-1.json",
        "semantic-ir-v1-1-spec-bundle.json",
        "config-version-v1-1.json",
    ] {
        let document = read_json(
            &workspace_dir()
                .join("fixtures/semantic/v1/positive")
                .join(name),
        );
        assert!(rust_codes(&document).is_empty(), "{name}");
        assert!(node_codes(&document).is_empty(), "{name}");
    }
}

#[trace("TC-1759", "FR-141-AC-6")]
#[trace("TC-1759", "FR-141-CON-2")]
#[test]
fn tc_1759_an_inline_clause_outside_quire_is_carried_with_one_advisory_in_rust_and_node() {
    let clean = positive();
    let machine = position(&clean, &type_ref("SM-001"));
    assert_eq!(
        clean["types"][machine]["operations"][0]["requires"][0]["language"],
        "quire"
    );
    assert!(rust_codes(&clean).is_empty(), "{:?}", rust_codes(&clean));

    for (member, language) in [("requires", "ocl"), ("ensures", "acme:tla")] {
        let mut document = positive();
        document["types"][machine]["operations"][0][member][0]["language"] = json!(language);
        let text = serde_json::to_string(&json!({ "ir": document })).expect("serialises");
        let verdict = decide(&parse_json(&text).expect("parses"));
        assert_eq!(verdict.result_state, ResultState::Success, "{member}");
        let pointer = format!("/ir/types/{machine}/operations/0/{member}/0/language");
        let found: Vec<_> = verdict
            .diagnostics
            .iter()
            .map(|d| (d.code, d.pointer.as_str(), d.blocking, d.severity.as_str()))
            .collect();
        assert_eq!(
            found,
            [(
                "agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED",
                pointer.as_str(),
                false,
                "info"
            )],
            "{member}"
        );
        let node = node_codes(&document);
        assert_eq!(node, ["CLAUSE_LANGUAGE_UNCHECKED"], "{member}: node reader");
    }
}

/// For each kind, a required member and a member the kind does not carry.
const MEMBER_RULES: &[(&str, &str, &str)] = &[
    ("FR-001", "identityFields", "owner"),
    ("VO-001", "fields", "identityFields"),
    ("NE-001", "owner", "members"),
    ("AR-001", "members", "owner"),
    ("EN-001", "variants", "fields"),
    ("EV-001", "occurrenceField", "identityFields"),
    ("SM-001", "transitions", "steps"),
    ("PR-001", "steps", "states"),
    ("RP-001", "persists", "fields"),
    ("DM-001", "vocabulary", "operations"),
];

#[trace("TC-1746", "FR-142-AC-2")]
#[trace("TC-1746", "FR-142-CON-1")]
#[test]
fn tc_1746_each_kind_missing_a_required_member_or_carrying_a_foreign_one_is_a_schema_violation() {
    for (id, required, foreign) in MEMBER_RULES {
        let mut missing = positive();
        type_mut(&mut missing, id)
            .as_object_mut()
            .expect("type")
            .remove(*required)
            .unwrap_or_else(|| panic!("{id} carries {required}"));
        assert_refused_by_schema(&format!("{id} without {required}"), &missing);

        let mut extra = positive();
        let definition = type_mut(&mut extra, id);
        assert!(definition.get(*foreign).is_none(), "{id} carries {foreign}");
        definition[*foreign] = match *foreign {
            "owner" => json!(type_ref("FR-001")),
            _ => json!([]),
        };
        assert_refused_by_schema(&format!("{id} with {foreign}"), &extra);
    }
    for (id, member) in [
        ("AR-001", "clauses"),
        ("SM-001", "operations"),
        ("RP-001", "operations"),
    ] {
        let mut empty = positive();
        type_mut(&mut empty, id)[member] = json!([]);
        assert_refused_by_schema(&format!("{id} with no {member}"), &empty);
    }
}

#[trace("TC-1747", "FR-142-AC-3")]
#[test]
fn tc_1747_construct_members_of_an_excluded_kind_or_naming_no_type_raise_at_the_member_pointer() {
    let document = positive();
    let at = |id: &str| position(&document, &type_ref(id));
    let cases: Vec<(&str, &str, Value, String)> = vec![
        (
            "NE-001",
            "owner",
            json!(type_ref("VO-001")),
            format!("CONSTRUCT_TARGET_KIND at /ir/types/{}/owner", at("NE-001")),
        ),
        (
            "AR-001",
            "members",
            json!([type_ref("RP-001")]),
            format!(
                "CONSTRUCT_TARGET_KIND at /ir/types/{}/members/0",
                at("AR-001")
            ),
        ),
        (
            "RP-001",
            "persists",
            json!([type_ref("VO-001")]),
            format!(
                "CONSTRUCT_TARGET_KIND at /ir/types/{}/persists/0",
                at("RP-001")
            ),
        ),
        (
            "RP-001",
            "persists",
            json!([type_ref("FR-999")]),
            format!(
                "UNRESOLVED_CONSTRUCT_REF at /ir/types/{}/persists/0",
                at("RP-001")
            ),
        ),
    ];
    for (id, member, value, expected) in cases {
        let mut mutated = positive();
        type_mut(&mut mutated, id)[member] = value;
        assert_rust(&format!("{id}.{member}"), &mutated, &[expected]);
    }
    // A domain member that is a domain.
    let mut nested = positive();
    let mut inner = nested["types"][at("DM-001")].clone();
    inner["identity"] = json!(type_ref("DM-002"));
    inner["members"] = json!([]);
    inner["relationships"] = json!([]);
    type_mut(&mut nested, "DM-001")["members"] = json!([type_ref("DM-002")]);
    nested["types"].as_array_mut().expect("types").push(inner);
    assert_rust(
        "domain member that is a domain",
        &nested,
        &[format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{}/members/0",
            at("DM-001")
        )],
    );
}

#[trace("TC-1748", "FR-142-AC-4")]
#[test]
fn tc_1748_occurrence_transition_guard_and_domain_membership_rules_raise_their_codes() {
    let document = positive();
    let at = |id: &str| position(&document, &type_ref(id));

    let mut occurrence = positive();
    type_mut(&mut occurrence, "EV-001")["occurrenceField"] = json!(field_ref("EV-001", "orderId"));
    assert_rust(
        "string occurrence field",
        &occurrence,
        &[format!(
            "INVALID_OCCURRENCE_FIELD at /ir/types/{}/occurrenceField",
            at("EV-001")
        )],
    );

    let sm = at("SM-001");
    let mut state = positive();
    type_mut(&mut state, "SM-001")["transitions"][0]["to"] =
        json!(format!("{PREFIX}state/SM-001-lost"));
    assert_rust(
        "undeclared state",
        &state,
        &[format!(
            "UNRESOLVED_CONSTRUCT_REF at /ir/types/{sm}/transitions/0/to"
        )],
    );

    let mut trigger = positive();
    type_mut(&mut trigger, "SM-001")["transitions"][0]["trigger"] =
        json!(format!("{PREFIX}operation/SM-001-halt"));
    assert_rust(
        "undeclared trigger",
        &trigger,
        &[format!(
            "UNRESOLVED_CONSTRUCT_REF at /ir/types/{sm}/transitions/0/trigger"
        )],
    );

    let mut guard = positive();
    type_mut(&mut guard, "SM-001")["transitions"][0]["guard"] = json!("never_declared");
    assert_rust(
        "dangling guard",
        &guard,
        &[format!(
            "DANGLING_CLAUSE_REF at /ir/types/{sm}/transitions/0/guard"
        )],
    );

    let mut two_domains = positive();
    let mut second = two_domains["types"][at("DM-001")].clone();
    second["identity"] = json!(type_ref("DM-002"));
    second["members"] = json!([type_ref("FR-001")]);
    second["relationships"] = json!([]);
    two_domains["types"]
        .as_array_mut()
        .expect("types")
        .push(second);
    let last = two_domains["types"].as_array().expect("types").len() - 1;
    assert_rust(
        "one type in two domains",
        &two_domains,
        &[format!(
            "MULTIPLE_DOMAIN_MEMBERSHIP at /ir/types/{last}/members/0"
        )],
    );
}

#[trace("TC-1749", "FR-142-AC-5")]
#[trace("TC-1749", "FR-142-CON-2")]
#[test]
fn tc_1749_backends_render_every_construct_kind_and_refuse_none() {
    let document = positive();
    let kinds: std::collections::BTreeSet<&str> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .filter_map(|t| t["kind"].as_str())
        .filter(|kind| !matches!(*kind, "record" | "scalar" | "alias"))
        .collect();
    assert_eq!(kinds.len(), 10, "one construct of each kind: {kinds:?}");
    let ir = positive_path();
    let dir = tempfile::tempdir().expect("tempdir");

    for target in ["rust", "typescript", "json-schema"] {
        let out = dir.path().join(target);
        let manifest_path = dir.path().join(format!("{target}.manifest.json"));
        let run = run_node(
            &[
                "src/compiler/cli.mjs",
                "generate",
                "--ir",
                &ir.to_string_lossy(),
                "--target",
                target,
                "--out-root",
                &out.to_string_lossy(),
                "--manifest",
                &manifest_path.to_string_lossy(),
            ],
            &[],
            None,
        )
        .unwrap_or_else(|e| panic!("{e}"));
        let manifest = read_json(&manifest_path);
        assert_eq!(run.status, 0, "{target}: {}", manifest["diagnostics"]);
        assert_eq!(manifest["state"], "success", "{target}");
        let diagnostics = manifest["diagnostics"].as_array().expect("diagnostics");
        assert_eq!(diagnostics.len(), 6, "{target}: {diagnostics:?}");
        for entry in diagnostics {
            assert_eq!(
                entry["code"], "agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED",
                "{target}"
            );
            assert_eq!(entry["blocking"], false, "{target}");
        }
        let files = manifest["files"].as_array().expect("files");
        assert!(!files.is_empty(), "{target} wrote no file");
    }
}

/// The written `business` document.
fn business_document() -> Value {
    let (_dir, _request, outcome) = lift_fixture("business");
    let LiftOutcome::Written {
        document,
        result_state,
        ..
    } = outcome
    else {
        panic!("business does not lift");
    };
    assert_eq!(result_state, ResultState::Success);
    serde_json::from_slice(&document).expect("json")
}

fn construct<'a>(document: &'a Value, id: &str) -> &'a Value {
    &document["types"][position(document, &type_ref(id))]
}

#[trace("TC-1751", "FR-143-AC-1")]
#[trace("TC-1751", "FR-143-CON-2")]
#[test]
fn tc_1751_the_business_fixture_lifts_to_one_construct_of_each_kind_the_reader_accepts() {
    let document = business_document();
    assert_eq!(document["contractVersion"], "1.2.0");
    assert!(
        rust_codes(&document).is_empty(),
        "{:?}",
        rust_codes(&document)
    );
    for (id, kind) in [
        ("FR-001", "entity"),
        ("VO-001", "value_object"),
        ("NE-001", "nested_entity"),
        ("AR-001", "aggregate_root"),
        ("EN-001", "enumeration"),
        ("EV-001", "event"),
        ("SM-001", "state_machine"),
        ("PR-001", "process"),
        ("RP-001", "repository"),
        ("DM-001", "domain"),
    ] {
        assert_eq!(construct(&document, id)["kind"], kind, "{id}");
    }
    let refs = |ids: &[&str]| Value::from(ids.iter().map(|id| type_ref(id)).collect::<Vec<_>>());
    assert_eq!(
        construct(&document, "FR-001")["identityFields"],
        json!([field_ref("FR-001", "id")])
    );
    assert_eq!(
        construct(&document, "PR-001")["identityFields"],
        json!([field_ref("PR-001", "id")])
    );
    assert_eq!(
        construct(&document, "AR-001")["members"],
        refs(&["FR-001", "VO-001"])
    );
    assert_eq!(
        construct(&document, "NE-001")["owner"],
        json!(type_ref("FR-001"))
    );
    assert_eq!(
        construct(&document, "EV-001")["occurrenceField"],
        json!(field_ref("EV-001", "placedAt"))
    );
    assert_eq!(
        construct(&document, "RP-001")["persists"],
        refs(&["FR-001"])
    );
    assert_eq!(
        construct(&document, "DM-001")["members"],
        refs(&["AR-001", "EN-001", "FR-001"])
    );
}

#[trace("TC-1752", "FR-143-AC-2")]
#[trace("TC-1752", "FR-143-CON-1")]
#[test]
fn tc_1752_type_identities_carry_the_artifact_id_and_a_rename_leaves_relationships_byte_identical()
{
    let document = business_document();
    for (id, name) in [
        ("AR-001", "OrderAggregate"),
        ("DM-001", "Ordering"),
        ("EN-001", "OrderStatus"),
        ("EV-001", "OrderPlaced"),
        ("FR-001", "Order"),
        ("NE-001", "Shipment"),
        ("OP-001", "Basket"),
        ("PR-001", "Fulfilment"),
        ("RP-001", "OrderRepository"),
        ("SM-001", "OrderLifecycle"),
        ("VO-001", "OrderLine"),
    ] {
        assert_eq!(construct(&document, id)["displayName"], name, "{id}");
    }

    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join("spec/domain/DM-001-ordering.md");
    let text = fs::read_to_string(&path).expect("read");
    fs::write(
        &path,
        text.replacen("title: Ordering", "title: Commerce", 1),
    )
    .expect("write");
    let renamed = lower(&root);
    let original = lower(&fixture("business"));
    assert_eq!(original.types.len(), renamed.types.len());
    for (before, after) in original.types.iter().zip(&renamed.types) {
        let before = serde_json::to_value(before).expect("serialises");
        let after = serde_json::to_value(after).expect("serialises");
        assert_eq!(before["identity"], after["identity"]);
        assert_eq!(
            serde_json::to_string(&before["relationships"]).expect("serialises"),
            serde_json::to_string(&after["relationships"]).expect("serialises"),
            "{}",
            before["identity"]
        );
        if before["identity"] == type_ref("DM-001") {
            assert_eq!(after["displayName"], "Commerce");
        } else {
            assert_eq!(before, after);
        }
    }
}

/// Load, extract, resolve and lower the bundle at `root` under the business
/// and edge-vocabulary modules.
fn lower(root: &Path) -> Lowered {
    let (business, edges) = (business_module(), edge_vocabulary());
    let bundle = Bundle::load(root, &[business.as_path(), edges.as_path()])
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0")
}

/// The business bundle with `edit` applied to the file `relative`, lowered.
fn lower_edited(relative: &str, edit: impl Fn(&str) -> String) -> Lowered {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join(relative);
    let text = fs::read_to_string(&path).expect("read");
    let edited = edit(&text);
    assert_ne!(edited, text, "{relative}: the edit changes nothing");
    fs::write(&path, edited).expect("write");
    lower(&root)
}

/// The `ARTIFACT_NOT_LOWERED` construct refusals of `lowered`.
fn refusals(lowered: &Lowered) -> Vec<&Diagnostic> {
    lowered
        .diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(Code::ArtifactNotLowered))
        .filter(|d| d.message.contains("construct"))
        .collect()
}

/// The ids every construct refusal of `lowered` names.
fn refused_ids(lowered: &Lowered) -> Vec<String> {
    refusals(lowered)
        .iter()
        .filter_map(|d| {
            d.message
                .strip_prefix("artifact ")
                .and_then(|rest| rest.split(' ').next())
                .map(str::to_owned)
        })
        .collect()
}

/// Exactly one blocking refusal of `id` naming `rule`; every other refusal
/// is one the fixed point derives from it; no type of a refused artifact is
/// emitted and no emitted owner or relationship names one.
fn assert_refused(lowered: &Lowered, id: &str, rule: &str) {
    let found = refusals(lowered);
    let own: Vec<_> = found
        .iter()
        .filter(|d| d.message.contains(&format!("artifact {id} ")))
        .collect();
    assert_eq!(own.len(), 1, "{id}: {found:#?}");
    let refusal = own[0];
    assert!(refusal.blocking, "{id}");
    assert!(refusal.message.contains(rule), "{id}: {}", refusal.message);
    for other in found
        .iter()
        .filter(|d| !d.message.contains(&format!("artifact {id} ")))
    {
        assert!(other.blocking, "{}", other.message);
        assert!(
            other.message.contains("relationship targets")
                || other.message.contains("entities contain it"),
            "{id}: an underived refusal {}",
            other.message
        );
    }
    assert_no_edge_to_refused(lowered);
}

/// No type of a refused artifact is emitted, and no emitted owner or
/// relationship targets one.
fn assert_no_edge_to_refused(lowered: &Lowered) {
    for refused in refused_ids(lowered) {
        let identity = type_ref(&refused);
        for t in &lowered.types {
            assert_ne!(t.identity, identity, "{refused}: a type is emitted");
            let value = serde_json::to_value(t).expect("serialises");
            assert_ne!(value["owner"], json!(identity), "{}", t.identity);
            for edge in value["relationships"].as_array().into_iter().flatten() {
                assert_ne!(edge["target"], json!(identity), "{}", t.identity);
            }
        }
    }
}

const PROPERTIES: &str = "## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|-------|------|--------------|-------------|\n| note | String | 1 | |\n\n";

#[trace("TC-1753", "FR-143-AC-3")]
#[test]
fn tc_1753_each_broken_built_in_rule_is_one_blocking_refusal_and_emits_no_type() {
    let cases: Vec<(&str, &str, Edit, &str)> = vec![
        (
            "PR-001",
            "spec/functional/PR-001-fulfilment.md",
            Box::new(|t| t.replace("| id | UUID | 1 | identity |", "| id | UUID | 1 | |")),
            "no identity field",
        ),
        (
            "VO-001",
            "spec/functional/VO-001-order-line.md",
            Box::new(|t| {
                t.replace(
                    "| sku | String | 1 |",
                    "| id | UUID | 1 | identity |\n| sku | String | 1 |",
                )
            }),
            "declares an identity field",
        ),
        (
            "AR-001",
            "spec/functional/AR-001-order-aggregate.md",
            Box::new(|t| t[..t.find("## Invariants").expect("invariants")].to_string()),
            "declares no invariant",
        ),
        (
            "EV-001",
            "spec/functional/EV-001-order-placed.md",
            Box::new(|t| {
                t.replace(
                    "| placedAt | Timestamp | 1 | |",
                    "| placedAt | Timestamp | 1 | |\n| paidAt | Timestamp | 1 | |",
                )
            }),
            "declares 2 Timestamp fields",
        ),
        (
            "SM-001",
            "spec/functional/SM-001-order-lifecycle.md",
            Box::new(|t| {
                // Without an operation the engine refuses every trigger, so
                // the transitions go too and the states alone reach the rule.
                let from = t.find("## Operations").expect("operations");
                let to = t.find("## States").expect("states");
                let end = t.find("## Transitions").expect("transitions");
                format!("{}{}", &t[..from], &t[to..end])
            }),
            "declares no operation, and every transition",
        ),
        (
            "RP-001",
            "spec/functional/RP-001-order-repository.md",
            Box::new(|t| t.replace("## Invariants", &format!("{PROPERTIES}## Invariants"))),
            "declares fields, and a repository",
        ),
        (
            "RP-001",
            "spec/functional/RP-001-order-repository.md",
            Box::new(|t| t[..t.find("## Operations").expect("operations")].to_string()),
            "declares no operation, and a repository",
        ),
        (
            "DM-001",
            "spec/domain/DM-001-ordering.md",
            Box::new(|t| {
                t.replace(
                    "## Bounded Context",
                    &format!("{PROPERTIES}## Bounded Context"),
                )
            }),
            "declares fields or operations",
        ),
    ];
    for (id, relative, edit, rule) in cases {
        assert_refused(&lower_edited(relative, edit), id, rule);
    }
}

#[trace("TC-1754", "FR-143-AC-4")]
#[test]
fn tc_1754_a_nested_entity_with_no_owner_or_two_owners_is_refused_naming_the_owner_rule() {
    let orphan = lower_edited("spec/functional/FR-001-order.md", |t| {
        t.replace("  - target: NE-001\n    type: contains\n", "")
    });
    assert_refused(&orphan, "NE-001", "0 entities contain it");

    let shared = lower_edited("spec/functional/AR-001-order-aggregate.md", |t| {
        t.replace(
            "  - target: VO-001\n    type: contains\n",
            "  - target: VO-001\n    type: contains\n  - target: NE-001\n    type: contains\n",
        )
    });
    assert_refused(&shared, "NE-001", "2 entities contain it");

    // B (NE-001) is refused, and C (NE-002) is owned only by B: the fixed
    // point refuses C too, and keeps C's own diagnostics.
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let order = root.join("spec/functional/FR-001-order.md");
    let text = fs::read_to_string(&order).expect("read");
    fs::write(
        &order,
        text.replace("  - target: NE-001\n    type: contains\n", ""),
    )
    .expect("write");
    let shipment = root.join("spec/functional/NE-001-shipment.md");
    let text = fs::read_to_string(&shipment).expect("read");
    fs::write(
        &shipment,
        text.replace(
            "relationships:\n",
            "relationships:\n  - target: NE-002\n    type: contains\n",
        ),
    )
    .expect("write");
    fs::write(
        root.join("spec/functional/NE-002-parcel.md"),
        "---\nid: NE-002\ntitle: Parcel\nobject: nested_entity\ntype: FR\nname: Parcel\n---\n\n# NE-002: Parcel\n\n## Description\n\nA parcel of one shipment.\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|-------|------|--------------|-------------|\n| id | UUID | 1 | identity |\n| tags | String | 0..* | |\n",
    )
    .expect("write");
    let chained = lower(&root);
    let ids = refused_ids(&chained);
    assert!(ids.contains(&"NE-001".to_owned()), "{ids:?}");
    let parcel: Vec<_> = refusals(&chained)
        .into_iter()
        .filter(|d| d.message.contains("artifact NE-002 "))
        .collect();
    assert_eq!(parcel.len(), 1, "{:#?}", chained.diagnostics);
    assert!(
        parcel[0].message.contains("0 entities contain it"),
        "{}",
        parcel[0].message
    );
    assert!(
        chained
            .diagnostics
            .iter()
            .any(|d| d.code == WireCode::Registry(Code::DeclaredLoss)
                && d.locus
                    .as_ref()
                    .is_some_and(|l| l.path.ends_with("NE-002-parcel.md"))),
        "NE-002's own declared loss is dropped: {:#?}",
        chained.diagnostics
    );
    assert_no_edge_to_refused(&chained);
}

/// The names of `member`'s entries, read by `key`.
fn names(construct: &Value, member: &str, key: &str) -> Vec<String> {
    construct[member]
        .as_array()
        .unwrap_or_else(|| panic!("{member} is not a list"))
        .iter()
        .map(|entry| entry[key].as_str().unwrap_or_default().to_owned())
        .collect()
}

/// Construct-kind parity: each of the schema's 1.2.0 kinds is the construct
/// its business object type lowers to, and any other object type is a record.
#[trace("TC-1760", "FR-142-AC-7")]
#[test]
fn tc_1760_every_schema_construct_kind_is_the_kind_its_object_type_lowers_to() {
    let schema = read_json(&workspace_dir().join("schema/semantic/v1/semantic-ir.schema.json"));
    let before_constructs = [
        "scalar",
        "record",
        "enum",
        "union",
        "alias",
        "sequence",
        "map",
        "reference",
    ];
    let kinds: Vec<&str> = schema["$defs"]["typeDefinition"]["properties"]["kind"]["enum"]
        .as_array()
        .expect("typeDefinition.kind is an enum")
        .iter()
        .filter_map(Value::as_str)
        .filter(|kind| !before_constructs.contains(kind))
        .collect();
    assert_eq!(kinds.len(), 10);
    for kind in kinds {
        assert_eq!(
            serde_json::to_value(construct_kind(kind)).expect("a kind serialises"),
            json!(kind)
        );
    }
    assert_eq!(
        serde_json::to_value(construct_kind("requirement")).expect("a kind serialises"),
        json!("record")
    );
}

#[trace("TC-1755", "FR-143-AC-5")]
#[test]
fn tc_1755_state_machine_process_and_domain_lift_their_engine_members() {
    let document = business_document();
    let machine = construct(&document, "SM-001");
    let mut states = names(machine, "states", "name");
    states.sort();
    assert_eq!(states, ["cancelled", "draft", "placed", "shipped"]);
    let transitions: Vec<(String, String)> = machine["transitions"]
        .as_array()
        .expect("transitions is a list")
        .iter()
        .map(|one| {
            let tail = |key: &str| {
                one[key]
                    .as_str()
                    .and_then(|state| state.rsplit('-').next())
                    .unwrap_or_default()
                    .to_owned()
            };
            (tail("from"), tail("to"))
        })
        .collect();
    for edge in [
        ("draft", "placed"),
        ("placed", "shipped"),
        ("placed", "cancelled"),
    ] {
        assert!(
            transitions.contains(&(edge.0.to_owned(), edge.1.to_owned())),
            "no transition {edge:?} in {transitions:?}"
        );
    }
    assert_eq!(
        names(construct(&document, "PR-001"), "steps", "name"),
        ["placed", "picked", "shipped"]
    );
    assert!(
        !names(construct(&document, "DM-001"), "vocabulary", "term").is_empty(),
        "DM-001 lifts no vocabulary"
    );
}

#[trace("TC-1785", "FR-143-AC-6")]
#[test]
fn tc_1785_an_engine_declaration_the_construct_cannot_lower_refuses_the_artifact() {
    type Edit = Box<dyn Fn(&str) -> String>;
    let cases: Vec<(&str, &str, Edit, &str)> = vec![
        (
            "SM-001",
            "spec/functional/SM-001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "| draft | placed | advance | | EV-001 |",
                    "| draft | placed | advance | | EN-001 |",
                )
            }),
            "names `EN-001`, which is the artifact id of no event of the bundle",
        ),
        (
            "PR-001",
            "spec/functional/PR-001-fulfilment.md",
            Box::new(|t| t.replace("| placed | event | EV-001 |", "| placed | event | EV-999 |")),
            "names `EV-999`, which is the artifact id of no event of the bundle",
        ),
        (
            "VO-001",
            "spec/functional/VO-001-order-line.md",
            Box::new(|t| t.replacen("type: FR\n", "type: FR\nabstract: true\n", 1)),
            "it declares an `abstract` flag, which no member of the construct lowers",
        ),
        (
            "SM-001",
            "spec/functional/SM-001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "| placed | cancelled | advance | | |",
                    "| placed | lost | advance | | |",
                )
            }),
            "the engine's model extraction is unavailable",
        ),
    ];
    for (id, relative, edit, rule) in cases {
        assert_refused(&lower_edited(relative, edit), id, rule);
    }

    // FR-076 relationship rows. Module 0.4.0 does not declare the
    // `relationships` mapping, so the engine itself refuses the table with a
    // blocking error; under a module that declares it, the frontend refuses
    // the artifact (#156 lowers the rows).
    let relationships = |t: &str| {
        format!("{t}\n## Relationships\n\n| Name | Verb | Target | Multiplicity |\n|------|------|--------|--------------|\n| order | references | FR-001 | 1..1 |\n")
    };
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join("spec/functional/VO-001-order-line.md");
    let text = fs::read_to_string(&path).expect("read");
    fs::write(&path, relationships(&text)).expect("write");
    let bundle = Bundle::load(
        &root,
        &[business_module().as_path(), edge_vocabulary().as_path()],
    )
    .unwrap_or_else(|r| panic!("refused: {r}"));
    let undeclared = extract(&bundle);
    assert!(
        undeclared.diagnostics.iter().any(|d| d.blocking
            && d.code == WireCode::Registry(Code::EngineDiagnostic)
            && d.message
                .starts_with("semantic.feature-not-extractable (reason: relationships)")),
        "{:#?}",
        undeclared.diagnostics
    );

    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-business");
    copy_tree(&business_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let declared = text.replacen(
        "mappings: [typed-table,",
        "mappings: [relationships, typed-table,",
        1,
    );
    assert_ne!(
        declared, text,
        "the manifest declares the relationships mapping"
    );
    fs::write(&manifest, declared).expect("write manifest");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join("spec/functional/VO-001-order-line.md");
    let text = fs::read_to_string(&path).expect("read");
    fs::write(&path, relationships(&text)).expect("write");
    let bundle = Bundle::load(&root, &[module.as_path(), edge_vocabulary().as_path()])
        .unwrap_or_else(|r| panic!("refused: {r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");
    // This frontend supplies the engine no relation vocabulary, so the rows
    // are read but not extracted: refused, never dropped behind an advisory.
    assert_refused(
        &lowered,
        "VO-001",
        "it declares relationship rows (quire-rs FR-076) the engine did not extract (no-relation-vocabulary)",
    );
}
