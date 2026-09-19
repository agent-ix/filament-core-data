//! FR-141, FR-142, FR-143 and NFR-044: the contract `2.0.0` model members and
//! module-declared construct kinds, read by the Rust reader over the committed
//! `semantic-ir-v2-constructs.json` positive and its one-rule mutations, by
//! the FR-050 node reader over the same documents, refused by both backends,
//! and lifted from the `business` fixture and its one-rule edits.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::constructs::{Direction, FlowDirection};
use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, WireCode};
use agent_ix_extraction_frontend::{
    extract, lift, lower_bundle, resolve, Bundle, Extractions, LiftOutcome, LiftRequest, Limits,
    Lowered,
};
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::{decide, ResultState};
use common::{
    business_module, copy_tree, edge_vocabulary, fixture, lift_fixture, read_json, run_node,
    soa_module, workspace_dir,
};
use ix_trace_rs::trace;
use quire_rs::semantic::{AvailabilityState, KindAvailability, TransitionDecl};
use serde_json::{json, Value};

const PREFIX: &str = "ix://agent-ix/orders/";

/// The package of the module declaring the business construct kinds.
const BUSINESS: &str = "agent-ix/spec-objects-business";

/// One change to an artifact's text.
type Edit = Box<dyn Fn(&str) -> String>;

/// The committed `2.0.0` positive carrying every model member and one
/// construct of each kind.
fn positive_path() -> PathBuf {
    workspace_dir().join("fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json")
}

fn positive() -> Value {
    read_json(&positive_path())
}

/// The published `2.0.0` positive (named `v1_1` for its file, `semantic-ir-v1-1.json`
/// — fcd#179 ported its content to `2.0.0` but kept the no-churn-rename file
/// name) with an operation on its record.
fn v1_1() -> Value {
    read_json(&workspace_dir().join("fixtures/semantic/v1/positive/semantic-ir-v1-1.json"))
}

/// The identity segment of artifact `id`: the id verbatim (FR-095), so
/// `AR_001` mints `AR_001`.
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
    assert_eq!(document["contractVersion"], "2.0.0");
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
    let mut kinds: Vec<&str> = types
        .iter()
        .filter_map(|t| t["kind"]["name"].as_str())
        .collect();
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
    let inline_in = |member: &str| {
        types
            .iter()
            .flat_map(|t| t["operations"].as_array().into_iter().flatten())
            .flat_map(|o| o[member].as_array().into_iter().flatten())
            .any(Value::is_object)
    };
    assert!(operation_has("frame") && inline_in("pre") && inline_in("post"));
    assert!(types.iter().any(|t| t["scalar"] == "any"));
    assert!(!document["populations"]
        .as_array()
        .expect("populations")
        .is_empty());
    let languages: Vec<&str> = types
        .iter()
        .flat_map(|t| t["operations"].as_array().into_iter().flatten())
        .flat_map(|o| o["pre"].as_array().into_iter().flatten())
        .filter_map(|c| c["language"].as_str())
        .collect();
    assert!(languages.contains(&"quire"), "{languages:?}");
    // FR-141-CON-2: a clause language outside the closed set is refused.
    let mut unknown = positive();
    let sm = type_mut(&mut unknown, "SM-001");
    sm["operations"][0]["pre"][1]["language"] = json!("english");
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

// fcd#179 deleted contracts `1.0.0` and `1.1.0`; `2.0.0` is the only one. This
// test once mutated a `1.1.0`-declared document by adding one FR-141 model
// member or construct kind at a time and asserted the schema refused it.
// `v1_1()` is now itself a `2.0.0` document (fcd#179 ported it), so every one
// of those members is a legitimate `2.0.0` addition and the mutated documents
// validate: there is no `1.1.0` document left to refuse a member inside. A
// document declaring any other `contractVersion` is refused wholesale, before
// a reader ever evaluates a member, by FR-050's `contractVersion` rule — so
// "does member X trigger refusal in an old document" is no longer
// distinguishable from "is this document's contractVersion wrong at all",
// which is already covered elsewhere (FR-050's own tests). A restated version
// of this assertion would pass regardless of which member was mutated in,
// which is the tautology this fix must not manufacture. FR-141-CON-1 and
// FR-141-AC-5 (TC-1744) are deleted with it: neither has a surviving,
// non-vacuous subject to test.
//
// fcd#179 also deleted the two fixtures that used to carry this case's
// negative half on disk (`semantic-ir.json` at `1.0.0`,
// `config-version-v1-1.json` at `1.1.0`): NFR-044-AC-1 is a rule about any
// document declaring the deleted contract, not about those two files staying
// frozen as evidence of it, so the negative half is now an inline document
// declaring each deleted `contractVersion` rather than a read of a fixture
// that no longer exists.
#[trace("TC-1756", "NFR-044-AC-1")]
#[test]
fn tc_1756_a_ported_fixture_validates_and_a_deleted_contract_document_is_refused() {
    let base = v1_1();
    assert!(rust_codes(&base).is_empty(), "{:?}", rust_codes(&base));
    // NFR-044-AC-1: a fixture already ported to `2.0.0` keeps a clean verdict.
    for name in ["semantic-ir-v1-1.json", "semantic-ir-v1-1-spec-bundle.json"] {
        let document = read_json(
            &workspace_dir()
                .join("fixtures/semantic/v1/positive")
                .join(name),
        );
        assert!(rust_codes(&document).is_empty(), "{name}");
        assert!(node_codes(&document).is_empty(), "{name}");
    }
    // NFR-044-AC-1: a document still declaring the deleted contract `1.0.0`
    // or `1.1.0` is refused by every reader with SCHEMA_VIOLATION at
    // contractVersion.
    for deleted in ["1.0.0", "1.1.0"] {
        let mut document = base.clone();
        document["contractVersion"] = json!(deleted);
        assert_refused_by_schema(deleted, &document);
        // fcd#179 (F1): `assert_refused_by_schema` only proves the document was
        // refused for *some* schema reason; that would still pass if this
        // document accumulated an unrelated schema defect and its declared
        // `contractVersion` were quietly repaired. Pin the actual reason: the
        // refusal names the deleted contract at its own pointer.
        assert!(
            rust_codes(&document).contains(&"SCHEMA_VIOLATION at /ir/contractVersion".to_string()),
            "{deleted}: expected SCHEMA_VIOLATION at /ir/contractVersion, got {:?}",
            rust_codes(&document)
        );
    }
}

#[trace("TC-1759", "FR-141-AC-6")]
#[trace("TC-1759", "FR-141-CON-2")]
#[test]
fn tc_1759_an_inline_clause_outside_quire_is_carried_with_one_advisory_in_rust_and_node() {
    let clean = positive();
    let machine = position(&clean, &type_ref("SM-001"));
    assert_eq!(
        clean["types"][machine]["operations"][0]["pre"][1]["language"],
        "quire"
    );
    assert!(rust_codes(&clean).is_empty(), "{:?}", rust_codes(&clean));

    for (member, slot, language) in [("pre", 1, "ocl"), ("post", 0, "acme:tla")] {
        let mut document = positive();
        document["types"][machine]["operations"][0][member][slot]["language"] = json!(language);
        let text = serde_json::to_string(&json!({ "ir": document })).expect("serialises");
        let verdict = decide(&parse_json(&text).expect("parses"));
        assert_eq!(verdict.result_state, ResultState::Success, "{member}");
        let pointer = format!("/ir/types/{machine}/operations/0/{member}/{slot}/language");
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

#[trace("TC-1795", "FR-141-AC-8")]
#[test]
fn tc_1795_a_pre_or_post_list_mixes_clause_ids_and_inline_clauses_and_binds_only_the_ids() {
    let clean = positive();
    let machine = position(&clean, &type_ref("SM-001"));
    let pre = &clean["types"][machine]["operations"][0]["pre"];
    assert!(pre[0].is_string() && pre[1].is_object(), "{pre}");
    assert!(rust_codes(&clean).is_empty(), "{:?}", rust_codes(&clean));
    assert!(node_codes(&clean).is_empty(), "{:?}", node_codes(&clean));

    // Clause-id resolution reads only the string items: a dangling id beside
    // an inline clause is reported at its own slot, and the inline clause is
    // never read as an id.
    let mut dangling = positive();
    dangling["types"][machine]["operations"][0]["pre"][0] = json!("no_such_clause");
    assert_eq!(
        rust_codes(&dangling),
        [format!(
            "DANGLING_CLAUSE_REF at /ir/types/{machine}/operations/0/pre/0"
        )]
    );
    assert_eq!(node_codes(&dangling), ["DANGLING_CLAUSE_REF"]);

    // The same inline clause twice in one list is refused, as a repeated id is.
    let mut repeated = positive();
    let inline = repeated["types"][machine]["operations"][0]["pre"][1].clone();
    repeated["types"][machine]["operations"][0]["pre"] = json!(["can_ship", inline, inline]);
    assert_refused_by_schema("a repeated inline clause", &repeated);

    // An item that is neither a clause id nor an inline clause is refused.
    let mut neither = positive();
    neither["types"][machine]["operations"][0]["post"][0] = json!(7);
    assert_refused_by_schema("a numeric pre/post item", &neither);
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

/// FR-152's allocation source form: a `sourceElement` whose value resolves to
/// no declared type falls back to the identity of an operation a declared
/// type declares, and the role check that follows runs against that owning
/// type. `AR-001`'s declaration is widened here to admit `sourceElement` so
/// the case reaches this check rather than the schema layer.
#[trace("TC-1747", "FR-142-AC-3")]
#[test]
fn tc_1747_a_source_element_naming_an_operation_identity_of_a_declared_type_is_admitted() {
    let mut admitted = positive();
    entry_mut(&mut admitted, "aggregate_root")["construct"]["members"]["sourceElement"] =
        json!("optional");
    type_mut(&mut admitted, "AR-001")["sourceElement"] =
        json!(format!("{PREFIX}operation/RP-001-findById"));
    assert_rust(
        "a sourceElement naming an operation identity of a declared type",
        &admitted,
        &[],
    );
}

/// The same operation identity, named by `targetElement` instead, is
/// refused: FR-152's operation fallback is `sourceElement`-only, so
/// `targetElement` never resolves it and the plain (non-operation)
/// `UNRESOLVED_CONSTRUCT_REF` wording is raised.
#[trace("TC-1747", "FR-142-AC-3")]
#[test]
fn tc_1747_a_target_element_naming_the_same_operation_identity_is_refused() {
    let document = positive();
    let ar = position(&document, &type_ref("AR-001"));
    let mut refused = positive();
    entry_mut(&mut refused, "aggregate_root")["construct"]["members"]["targetElement"] =
        json!("optional");
    type_mut(&mut refused, "AR-001")["targetElement"] =
        json!(format!("{PREFIX}operation/RP-001-findById"));
    assert_rust(
        "a targetElement naming an operation identity",
        &refused,
        &[format!(
            "UNRESOLVED_CONSTRUCT_REF at /ir/types/{ar}/targetElement"
        )],
    );
}

/// A `sourceElement` naming an identity that is neither a declared type nor a
/// declared operation is refused, with the operation-aware wording.
#[trace("TC-1747", "FR-142-AC-3")]
#[test]
fn tc_1747_a_source_element_naming_no_such_operation_is_refused() {
    let document = positive();
    let ar = position(&document, &type_ref("AR-001"));
    let mut refused = positive();
    entry_mut(&mut refused, "aggregate_root")["construct"]["members"]["sourceElement"] =
        json!("optional");
    type_mut(&mut refused, "AR-001")["sourceElement"] =
        json!(format!("{PREFIX}operation/RP-001-doesNotExist"));
    assert_rust(
        "a sourceElement naming no such operation",
        &refused,
        &[format!(
            "UNRESOLVED_CONSTRUCT_REF at /ir/types/{ar}/sourceElement"
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

/// The `constructs` entry of the business kind `name` in `document`.
fn entry_mut<'a>(document: &'a mut Value, name: &str) -> &'a mut Value {
    document["constructs"]
        .as_array_mut()
        .expect("constructs")
        .iter_mut()
        .find(|entry| entry["kind"]["name"] == name)
        .unwrap_or_else(|| panic!("no constructs entry {name}"))
}

/// Asserts the Rust reader refuses `document` in its schema layer at
/// `pointer`.
fn assert_rust_schema_at(label: &str, document: &Value, pointer: &str) {
    let codes = rust_codes(document);
    assert!(
        codes.contains(&format!("SCHEMA_VIOLATION at {pointer}")),
        "{label}: {codes:?}"
    );
    assert!(
        codes.iter().all(|c| c.starts_with("SCHEMA_VIOLATION at ")),
        "{label}: {codes:?}"
    );
}

#[trace("TC-1789", "FR-142-AC-9")]
#[test]
fn tc_1789_the_constructs_table_is_checked_and_references_are_admitted_by_role() {
    let document = positive();
    let at = |id: &str| position(&document, &type_ref(id));
    let constructs = |name: &str| {
        document["constructs"]
            .as_array()
            .expect("constructs")
            .iter()
            .position(|entry| entry["kind"]["name"] == name)
            .expect("an entry")
    };

    // A kind naming no entry, an entry no type uses, a kind declared twice,
    // and a 2.0.0 document without the table.
    let mut missing = positive();
    let event = constructs("event");
    missing["constructs"]
        .as_array_mut()
        .expect("constructs")
        .remove(event);
    assert_rust_schema_at(
        "a kind naming no entry",
        &missing,
        &format!("/ir/types/{}/kind", at("EV-001")),
    );
    let mut unused = positive();
    let mut extra = unused["constructs"][event].clone();
    extra["kind"]["name"] = json!("ledger");
    unused["constructs"]
        .as_array_mut()
        .expect("constructs")
        .push(extra.clone());
    let last = unused["constructs"].as_array().expect("constructs").len() - 1;
    assert_rust_schema_at(
        "an unused entry",
        &unused,
        &format!("/ir/constructs/{last}/kind"),
    );
    let mut twice = positive();
    let copy = twice["constructs"][event].clone();
    twice["constructs"]
        .as_array_mut()
        .expect("constructs")
        .push(copy);
    let last = twice["constructs"].as_array().expect("constructs").len() - 1;
    assert_rust_schema_at(
        "a kind declared twice",
        &twice,
        &format!("/ir/constructs/{last}/kind"),
    );
    let mut untabled = positive();
    untabled
        .as_object_mut()
        .expect("document")
        .remove("constructs");
    assert_refused_by_schema("a 2.0.0 document without constructs", &untabled);

    // A declaration defect is refused at its pointer inside the entry.
    let mut defect = positive();
    entry_mut(&mut defect, "nested_entity")["construct"]["references"]["owner"] = json!(["*"]);
    assert_rust_schema_at(
        "a wildcard role",
        &defect,
        &format!(
            "/ir/constructs/{}/construct/references/owner/0",
            constructs("nested_entity")
        ),
    );
    let mut inconsistent = positive();
    entry_mut(&mut inconsistent, "aggregate_root")["construct"]["members"]["clauses"] =
        json!("optional");
    assert_rust_schema_at(
        "a rule whose member presence is not declared",
        &inconsistent,
        &format!(
            "/ir/constructs/{}/construct/rules/1",
            constructs("aggregate_root")
        ),
    );

    // The admitted roles are the declaration's data: widen the owner roles
    // and a value object owner reads clean; drop the role from the named type
    // and the same owner is refused.
    let mut widened = positive();
    type_mut(&mut widened, "NE-001")["owner"] = json!(type_ref("VO-001"));
    entry_mut(&mut widened, "nested_entity")["construct"]["references"]["owner"] =
        json!(["business:composite-owner", "business:aggregate-member"]);
    assert_rust("a widened owner role", &widened, &[]);
    let mut narrowed = positive();
    let owner = narrowed["types"][at("NE-001")]["owner"]
        .as_str()
        .expect("an owner")
        .to_owned();
    let owner_at = position(&narrowed, &owner);
    narrowed["types"][owner_at]["roles"]
        .as_array_mut()
        .expect("roles")
        .retain(|role| role != "business:composite-owner");
    assert_rust(
        "an owner without the admitted role",
        &narrowed,
        &[format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{}/owner",
            at("NE-001")
        )],
    );
    let mut unconstrained = positive();
    type_mut(&mut unconstrained, "NE-001")["owner"] = json!(type_ref("VO-001"));
    entry_mut(&mut unconstrained, "nested_entity")["construct"]
        .as_object_mut()
        .expect("a declaration")
        .remove("references");
    assert_rust("an unconstrained owner", &unconstrained, &[]);
}

/// FR-142:40 (the vocabulary's `references` term): a `sourceElement` entry
/// resolved through FR-152's operation fallback is checked by the role of
/// the operation's owning type exactly as a direct type reference is —
/// admitted when that type carries the declared role, refused with
/// `CONSTRUCT_TARGET_KIND` when it carries none of them.
#[trace("TC-1789", "FR-142-AC-9")]
#[test]
fn tc_1789_a_source_element_resolved_through_an_operation_is_checked_by_its_owning_types_role() {
    let document = positive();
    let ar = position(&document, &type_ref("AR-001"));

    let mut admitted = positive();
    let entry = entry_mut(&mut admitted, "aggregate_root");
    entry["construct"]["members"]["sourceElement"] = json!("optional");
    entry["construct"]["references"]["sourceElement"] = json!(["business:repository"]);
    type_mut(&mut admitted, "AR-001")["sourceElement"] =
        json!(format!("{PREFIX}operation/RP-001-findById"));
    assert_rust(
        "an operation whose owning type carries the admitted role",
        &admitted,
        &[],
    );

    let mut refused = positive();
    let entry = entry_mut(&mut refused, "aggregate_root");
    entry["construct"]["members"]["sourceElement"] = json!("optional");
    entry["construct"]["references"]["sourceElement"] = json!(["business:repository"]);
    type_mut(&mut refused, "AR-001")["sourceElement"] =
        json!(format!("{PREFIX}operation/SM-001-advance"));
    assert_rust(
        "an operation whose owning type carries none of the admitted roles",
        &refused,
        &[format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{ar}/sourceElement"
        )],
    );
}

#[trace("TC-1791", "FR-142-AC-10")]
#[test]
fn tc_1791_a_kind_no_reader_code_names_reads_by_its_declaration_alone() {
    // A systems module's port and part: identity, direction, interface type,
    // multiplicity and owner are declared data, not reader code.
    let mut document = positive();
    let origin = document["types"][position(&document, &type_ref("VO-001"))]["origin"].clone();
    let text = type_ref("VO-001");
    let part = json!({
        "identity": format!("{PREFIX}type/PT-001"),
        "displayName": "Engine",
        "kind": { "module": "acme/spec-objects-systems", "name": "part" },
        "roles": ["systems:part"],
        "origin": origin,
        "constraints": [],
        "extensions": [],
        "unknownPolicy": "reject",
        "fields": []
    });
    let port = json!({
        "identity": format!("{PREFIX}type/PO-001"),
        "displayName": "FuelIn",
        "kind": { "module": "acme/spec-objects-systems", "name": "port" },
        "roles": ["systems:port"],
        "origin": origin,
        "constraints": [],
        "extensions": [],
        "unknownPolicy": "reject",
        "owner": format!("{PREFIX}type/PT-001"),
        "direction": "in",
        "interfaceType": text,
        "multiplicity": { "lower": 1, "upper": 2 }
    });
    let declaration = |name: &str, construct: Value| {
        json!({
            "kind": { "module": "acme/spec-objects-systems", "name": name },
            "moduleVersion": "0.1.0",
            "manifestDigest": format!("sha256:{}", "0".repeat(64)),
            "construct": construct
        })
    };
    let connection = json!({
        "identity": format!("{PREFIX}type/CN-001"),
        "displayName": "FuelLine",
        "kind": { "module": "acme/spec-objects-systems", "name": "connection" },
        "roles": ["systems:connection"],
        "origin": origin,
        "constraints": [],
        "extensions": [],
        "unknownPolicy": "reject",
        "flowDirection": "source-to-target",
        "sourceEnd": { "type": format!("{PREFIX}type/PO-001"), "multiplicity": { "lower": 1, "upper": 1 } },
        "targetEnd": { "type": format!("{PREFIX}type/PO-001") }
    });
    let types = document["types"].as_array_mut().expect("types");
    types.push(part);
    types.push(connection);
    types.push(port);
    let constructs = document["constructs"].as_array_mut().expect("constructs");
    constructs.push(declaration(
        "part",
        json!({ "identity": "none", "shape": "record", "members": {}, "meaning": "quire.meaning.systems.part/v1" }),
    ));
    constructs.push(declaration(
        "port",
        json!({
            "identity": "none",
            "shape": "record",
            "members": {
                "owner": "required", "direction": "required",
                "interfaceType": "required", "multiplicity": "optional", "fields": "forbidden"
            },
            "references": { "owner": ["systems:part"], "interfaceType": ["business:domain-object"] },
            "meaning": "quire.meaning.systems.port/v1"
        }),
    ));
    constructs.push(declaration(
        "connection",
        json!({
            "identity": "none",
            "shape": "record",
            "members": {
                "flowDirection": "required", "sourceEnd": "required",
                "targetEnd": "required", "fields": "forbidden"
            },
            "references": { "sourceEnd": ["systems:port"], "targetEnd": ["systems:port"] },
            "meaning": "quire.meaning.systems.connection/v1"
        }),
    ));
    assert_rust("a systems part, port and connection", &document, &[]);
    assert_eq!(node_codes(&document), Vec::<String>::new());

    let port_at = document["types"].as_array().expect("types").len() - 1;
    let mut wrong_direction = document.clone();
    wrong_direction["types"][port_at]["direction"] = json!("sideways");
    assert_refused_by_schema("a direction outside in, out and inout", &wrong_direction);
    let mut no_direction = document.clone();
    no_direction["types"][port_at]
        .as_object_mut()
        .expect("a type")
        .remove("direction");
    assert_refused_by_schema("a port without its required direction", &no_direction);
    let connection_at = port_at - 1;
    let mut wrong_flow = document.clone();
    wrong_flow["types"][connection_at]["flowDirection"] = json!("in");
    assert_refused_by_schema(
        "a flow direction outside the connection's three",
        &wrong_flow,
    );
    let mut endless = document.clone();
    endless["types"][connection_at]
        .as_object_mut()
        .expect("a type")
        .remove("targetEnd");
    assert_refused_by_schema("a connection without its required target end", &endless);
    let mut foreign_end = document.clone();
    foreign_end["types"][connection_at]["sourceEnd"]["type"] =
        json!(format!("{PREFIX}type/PT-001"));
    assert_rust(
        "a connection end naming a type without the port role",
        &foreign_end,
        &[format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{connection_at}/sourceEnd/type"
        )],
    );
    let mut foreign_owner = document.clone();
    foreign_owner["types"][port_at]["owner"] = json!(type_ref("VO-001"));
    assert_rust(
        "a port owned by a type without the part role",
        &foreign_owner,
        &[format!(
            "CONSTRUCT_TARGET_KIND at /ir/types/{port_at}/owner"
        )],
    );
}

#[trace("TC-1793", "FR-142-AC-13")]
#[test]
fn tc_1793_feature_order_names_each_own_field_and_operation_exactly_once() {
    let at = |document: &Value| position(document, &type_ref("OP-001"));
    let feature = |kind: &str, name: &str| json!(format!("{PREFIX}{kind}/OP-001-{name}"));
    let order = json!([
        feature("operation", "clear"),
        feature("field", "id"),
        feature("operation", "addLine"),
        feature("field", "lines"),
        feature("operation", "total")
    ]);
    let mut forbidden = positive();
    type_mut(&mut forbidden, "OP-001")["featureOrder"] = order.clone();
    assert_refused_by_rust_schema("featureOrder on a construct forbidding it", &forbidden);

    let mut ordered = forbidden.clone();
    entry_mut(&mut ordered, "entity")["construct"]["members"]["featureOrder"] = json!("optional");
    assert_rust("fields and operations in authored order", &ordered, &[]);
    let type_at = at(&ordered);

    let mut omitted = ordered.clone();
    type_mut(&mut omitted, "OP-001")["featureOrder"]
        .as_array_mut()
        .expect("an order")
        .pop();
    assert_rust(
        "an order omitting an operation",
        &omitted,
        &[format!(
            "INCOMPLETE_FEATURE_ORDER at /ir/types/{type_at}/featureOrder"
        )],
    );

    let mut foreign = ordered.clone();
    type_mut(&mut foreign, "OP-001")["featureOrder"][4] =
        json!(format!("{PREFIX}operation/SM-001-advance"));
    let mut codes = rust_codes(&foreign);
    codes.sort();
    assert_eq!(
        codes,
        [
            format!("INCOMPLETE_FEATURE_ORDER at /ir/types/{type_at}/featureOrder"),
            format!("UNRESOLVED_CONSTRUCT_REF at /ir/types/{type_at}/featureOrder/4"),
        ],
        "an entry naming another type's operation"
    );

    let mut repeated = ordered.clone();
    type_mut(&mut repeated, "OP-001")["featureOrder"][4] = feature("field", "id");
    assert_refused_by_rust_schema("an entry named twice", &repeated);
    let mut empty = ordered.clone();
    type_mut(&mut empty, "OP-001")["featureOrder"] = json!([]);
    assert_refused_by_rust_schema("an empty order", &empty);

    let mut required = positive();
    entry_mut(&mut required, "entity")["construct"]["members"]["featureOrder"] = json!("required");
    assert_refused_by_rust_schema("an entity without its required order", &required);
}

/// The Rust reader refuses `document` with `SCHEMA_VIOLATION` alone.
fn assert_refused_by_rust_schema(label: &str, document: &Value) {
    let rust = rust_codes(document);
    assert!(
        !rust.is_empty() && rust.iter().all(|c| c.starts_with("SCHEMA_VIOLATION at ")),
        "{label}: rust reader {rust:?}"
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
        .filter_map(|t| t["kind"]["name"].as_str())
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
    assert_eq!(document["contractVersion"], "2.0.0");
    assert!(
        rust_codes(&document).is_empty(),
        "{:?}",
        rust_codes(&document)
    );
    for (id, kind) in [
        ("FR-001", "entity"),
        ("VO_001", "value_object"),
        ("NE_001", "nested_entity"),
        ("AR_001", "aggregate_root"),
        ("EN_001", "enumeration"),
        ("EV_001", "event"),
        ("SM_001", "state_machine"),
        ("PR_001", "process"),
        ("RP_001", "repository"),
        ("DM_001", "domain"),
    ] {
        assert_eq!(
            construct(&document, id)["kind"],
            json!({ "module": BUSINESS, "name": kind }),
            "{id}"
        );
    }
    let refs = |ids: &[&str]| Value::from(ids.iter().map(|id| type_ref(id)).collect::<Vec<_>>());
    assert_eq!(
        construct(&document, "FR-001")["identityFields"],
        json!([field_ref("FR-001", "id")])
    );
    assert_eq!(
        construct(&document, "PR_001")["identityFields"],
        json!([field_ref("PR_001", "id")])
    );
    assert_eq!(
        construct(&document, "AR_001")["members"],
        refs(&["FR-001", "VO_001"])
    );
    assert_eq!(
        construct(&document, "NE_001")["owner"],
        json!(type_ref("FR-001"))
    );
    assert_eq!(
        construct(&document, "EV_001")["occurrenceField"],
        json!(field_ref("EV_001", "placedAt"))
    );
    assert_eq!(
        construct(&document, "RP_001")["persists"],
        refs(&["FR-001"])
    );
    assert_eq!(
        construct(&document, "DM_001")["members"],
        refs(&["AR_001", "EN_001", "FR-001"])
    );
}

#[trace("TC-1752", "FR-143-AC-2")]
#[trace("TC-1752", "FR-143-CON-1")]
#[test]
fn tc_1752_type_identities_carry_the_artifact_id_and_a_rename_leaves_relationships_byte_identical()
{
    let document = business_document();
    for (id, name) in [
        ("AR_001", "OrderAggregate"),
        ("DM_001", "Ordering"),
        ("EN_001", "OrderStatus"),
        ("EV_001", "OrderPlaced"),
        ("FR-001", "Order"),
        ("NE_001", "Shipment"),
        ("OP-001", "Basket"),
        ("PR_001", "Fulfilment"),
        ("RP_001", "OrderRepository"),
        ("SM_001", "OrderLifecycle"),
        ("VO_001", "OrderLine"),
    ] {
        assert_eq!(construct(&document, id)["displayName"], name, "{id}");
    }

    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join("spec/domain/DM_001-ordering.md");
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
        if before["identity"] == type_ref("DM_001") {
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

/// The business fixture lowered after `mutate` edits the engine's records:
/// the seam for a record the frontend re-checks but no authored text reaches,
/// because the engine refuses that text first.
fn lower_mutated(mutate: impl Fn(&mut Extractions)) -> Lowered {
    let (business, edges) = (business_module(), edge_vocabulary());
    let root = fixture("business");
    let bundle = Bundle::load(&root, &[business.as_path(), edges.as_path()])
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let mut extractions = extract(&bundle);
    mutate(&mut extractions);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0")
}

/// The module roots [`lower_systems`] and its callers' own [`LiftRequest`]s
/// both load: the business fixture's own construct kinds, the shared edge
/// vocabulary, and the vendored `spec-objects-architecture` (the
/// systems-model kinds `part`, `port`, `connection`, `allocation` and
/// `interface`).
fn systems_module_roots() -> Vec<PathBuf> {
    vec![business_module(), edge_vocabulary(), soa_module()]
}

/// The business fixture plus the vendored `spec-objects-architecture`
/// module, with the files `write` adds under `spec/functional/`, loaded,
/// extracted, resolved and lowered under all three modules (FCD-local: no
/// bundle fixture depends on this module set). Returns the scratch
/// directory and the bundle root alongside the lowered result, so a caller
/// can also run the same bundle through [`lift`] (the full FR-097/FR-050
/// pipeline, not only `lower_bundle`'s Rust structs) before it is dropped.
fn lower_systems(write: impl FnOnce(&Path)) -> (tempfile::TempDir, PathBuf, Lowered) {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    write(&root.join("spec/functional"));
    let module_roots = systems_module_roots();
    let module_paths: Vec<&Path> = module_roots.iter().map(PathBuf::as_path).collect();
    let bundle = Bundle::load(&root, &module_paths)
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");
    (dir, root, lowered)
}

/// [`lower_systems`], with `mutate` applied to the engine's records between
/// extraction and resolution: the seam for a `sourceElement` value quire-rs's
/// own resolution refuses first (an unknown operation or an unknown local
/// artifact), so no authored text reaches it — mirrors [`lower_mutated`] for
/// the systems module set.
fn lower_systems_mutated(
    write: impl FnOnce(&Path),
    mutate: impl FnOnce(&mut Extractions),
) -> Lowered {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    write(&root.join("spec/functional"));
    let module_roots = systems_module_roots();
    let module_paths: Vec<&Path> = module_roots.iter().map(PathBuf::as_path).collect();
    let bundle = Bundle::load(&root, &module_paths)
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let mut extractions = extract(&bundle);
    mutate(&mut extractions);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0")
}

/// The `sourceElement` of `id`'s allocation record, as the engine extracted
/// it, mutable in place.
fn allocation_source_mut<'a>(extractions: &'a mut Extractions, id: &str) -> &'a mut String {
    &mut extractions
        .artifacts
        .get_mut(id)
        .and_then(|a| a.extraction.model.as_mut())
        .and_then(|m| m.allocation.as_mut())
        .unwrap_or_else(|| panic!("{id} carries no allocation record"))
        .record
        .source_element
}

/// Transition `index` of `SM_001`, as the engine recorded it.
fn sm_001_transition(extractions: &mut Extractions, index: usize) -> &mut TransitionDecl {
    extractions
        .artifacts
        .get_mut("SM_001")
        .and_then(|a| a.extraction.model.as_mut())
        .and_then(|m| m.transitions.as_mut())
        .and_then(|t| t.get_mut(index))
        .expect("SM_001 carries the transition")
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
                || other.message.contains("types contain it"),
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
            "PR_001",
            "spec/functional/PR_001-fulfilment.md",
            Box::new(|t| t.replace("| id | UUID | 1 | identity |", "| id | UUID | 1 | |")),
            "no identity field",
        ),
        (
            "VO_001",
            "spec/functional/VO_001-order-line.md",
            Box::new(|t| {
                t.replace(
                    "| sku | String | 1 |",
                    "| id | UUID | 1 | identity |\n| sku | String | 1 |",
                )
            }),
            "declares an identity field",
        ),
        (
            "AR_001",
            "spec/functional/AR_001-order-aggregate.md",
            Box::new(|t| t[..t.find("## Invariants").expect("invariants")].to_string()),
            "declares no invariant",
        ),
        (
            "EV_001",
            "spec/functional/EV_001-order-placed.md",
            Box::new(|t| {
                t.replace(
                    "| placedAt | Timestamp | 1 | |",
                    "| placedAt | Timestamp | 1 | |\n| paidAt | Timestamp | 1 | |",
                )
            }),
            "declares 2 Timestamp fields",
        ),
        (
            "SM_001",
            "spec/functional/SM_001-order-lifecycle.md",
            Box::new(|t| {
                // Without an operation the engine refuses every trigger, so
                // the transitions go too and the states alone reach the rule.
                let from = t.find("## Operations").expect("operations");
                let to = t.find("## States").expect("states");
                let end = t.find("## Transitions").expect("transitions");
                format!("{}{}", &t[..from], &t[to..end])
            }),
            "declares no operation, and the construct requires one",
        ),
        (
            "RP_001",
            "spec/functional/RP_001-order-repository.md",
            Box::new(|t| t.replace("## Invariants", &format!("{PROPERTIES}## Invariants"))),
            "declares fields, and the construct carries none",
        ),
        (
            "RP_001",
            "spec/functional/RP_001-order-repository.md",
            Box::new(|t| t[..t.find("## Operations").expect("operations")].to_string()),
            "declares no operation, and the construct requires one",
        ),
        (
            "DM_001",
            "spec/domain/DM_001-ordering.md",
            Box::new(|t| {
                t.replace(
                    "## Bounded Context",
                    &format!("{PROPERTIES}## Bounded Context"),
                )
            }),
            "declares fields, and the construct carries none",
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
        t.replace("  - target: NE_001\n    type: contains\n", "")
    });
    assert_refused(&orphan, "NE_001", "0 types contain it");

    let shared = lower_edited("spec/functional/AR_001-order-aggregate.md", |t| {
        t.replace(
            "  - target: VO_001\n    type: contains\n",
            "  - target: VO_001\n    type: contains\n  - target: NE_001\n    type: contains\n",
        )
    });
    assert_refused(&shared, "NE_001", "2 types contain it");

    // B (NE_001) is refused, and C (NE_002) is owned only by B: the fixed
    // point refuses C too, and keeps C's own diagnostics.
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let order = root.join("spec/functional/FR-001-order.md");
    let text = fs::read_to_string(&order).expect("read");
    fs::write(
        &order,
        text.replace("  - target: NE_001\n    type: contains\n", ""),
    )
    .expect("write");
    let shipment = root.join("spec/functional/NE_001-shipment.md");
    let text = fs::read_to_string(&shipment).expect("read");
    fs::write(
        &shipment,
        text.replace(
            "relationships:\n",
            "relationships:\n  - target: NE_002\n    type: contains\n",
        ),
    )
    .expect("write");
    fs::write(
        root.join("spec/functional/NE_002-parcel.md"),
        "---\nid: NE_002\ntitle: Parcel\nobject: nested_entity\ntype: FR\nname: Parcel\n---\n\n# NE_002: Parcel\n\n## Description\n\nA parcel of one shipment.\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|-------|------|--------------|-------------|\n| id | UUID | 1 | identity |\n| tags | String | 0..* | |\n",
    )
    .expect("write");
    let chained = lower(&root);
    let ids = refused_ids(&chained);
    assert!(ids.contains(&"NE_001".to_owned()), "{ids:?}");
    let parcel: Vec<_> = refusals(&chained)
        .into_iter()
        .filter(|d| d.message.contains("artifact NE_002 "))
        .collect();
    assert_eq!(parcel.len(), 1, "{:#?}", chained.diagnostics);
    assert!(
        parcel[0].message.contains("0 types contain it"),
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
                    .is_some_and(|l| l.path.ends_with("NE_002-parcel.md"))),
        "NE_002's own declared loss is dropped: {:#?}",
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

#[trace("TC-1755", "FR-143-AC-5")]
#[test]
fn tc_1755_state_machine_process_and_domain_lift_their_engine_members() {
    let document = business_document();
    let machine = construct(&document, "SM_001");
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
        names(construct(&document, "PR_001"), "steps", "name"),
        ["placed", "picked", "shipped"]
    );
    assert!(
        !names(construct(&document, "DM_001"), "vocabulary", "term").is_empty(),
        "DM_001 lifts no vocabulary"
    );
}

#[trace("TC-1785", "FR-143-AC-6")]
#[test]
fn tc_1785_an_engine_declaration_the_construct_cannot_lower_refuses_the_artifact() {
    type Edit = Box<dyn Fn(&str) -> String>;
    let cases: Vec<(&str, &str, Edit, &str)> = vec![
        (
            "SM_001",
            "spec/functional/SM_001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "| draft | placed | advance | | EV_001 |",
                    "| draft | placed | advance | | EN_001 |",
                )
            }),
            "names `EN_001`, which is the artifact id of no type of the bundle the construct's transitions admit",
        ),
        (
            "PR_001",
            "spec/functional/PR_001-fulfilment.md",
            Box::new(|t| t.replace("| placed | event | EV_001 |", "| placed | event | EV_999 |")),
            "names `EV_999`, which is the artifact id of no type of the bundle the construct's steps admit",
        ),
        (
            "SM_001",
            "spec/functional/SM_001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "| placed | cancelled | advance | | |",
                    "| placed | lost | advance | | |",
                )
            }),
            "the engine's model extraction is unavailable",
        ),
        (
            "SM_001",
            "spec/functional/SM_001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "| draft | placed | advance | | EV_001 |",
                    "| draft | placed | advance | | EV_001, EV_001 |",
                )
            }),
            "names `EV_001` twice, and one cell names each type at most once",
        ),
        (
            "VO_001",
            "spec/functional/VO_001-order-line.md",
            Box::new(|t| {
                t.replace(
                    "| Field | Type | Multiplicity | Constraints |\n|-------|------|--------------|-------------|",
                    "| Field | Type | Multiplicity | Constraints | Presence |\n|---|---|---|---|---|",
                )
                .replace(
                    "| sku | String | 1 | pattern: /^[A-Z0-9-]+$/ |",
                    "| sku | String | 1 | pattern: /^[A-Z0-9-]+$/ | required |",
                )
            }),
            "it declares Presence, Subsets or Redefines cells, which no member of the construct lowers",
        ),
        (
            "SM_001",
            "spec/functional/SM_001-order-lifecycle.md",
            Box::new(|t| {
                t.replace(
                    "Returns: OrderStatus [1]\n",
                    "Returns: OrderStatus [1]\n\nModifies: current\n",
                )
            }),
            "it declares Modifies, Creates or Deletes lines, which no member of the construct lowers",
        ),
        (
            "AR_001",
            "spec/functional/AR_001-order-aggregate.md",
            // Members derive from composite relationships (FR-143); the
            // module's `Members` table is refused, never read.
            Box::new(|t| {
                t.replace(
                    "The `Order` entity and its `OrderLine` value objects.",
                    "| Member | Multiplicity |\n|--------|--------------|\n| Order | 1 |",
                )
            }),
            "it declares a `Members` table, which no member of the construct lowers",
        ),
    ];
    for (id, relative, edit, rule) in cases {
        assert_refused(&lower_edited(relative, edit), id, rule);
    }

    // A population artifact: its `Members` table has no construct member.
    // The engine reads a model table only under the locator key that names
    // it (quire-rs#449), and the vendored manifest still declares the
    // population extent table under `members`, so the key is renamed for
    // this case (agent-ix/spec-objects-business#18).
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-business");
    copy_tree(&business_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let keyed = text.replacen(
        "        members:\n          from: table_row\n          under_section: Members\n          required: true\n          assert:\n            columns: [Type, Extent]",
        "        population:\n          from: table_row\n          under_section: Members\n          required: true\n          assert:\n            columns: [Type, Extent]",
        1,
    );
    assert_ne!(keyed, text, "the population table is keyed `members`");
    fs::write(&manifest, keyed).expect("write manifest");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    fs::write(
        root.join("spec/functional/PO-001-open-orders.md"),
        "---\nid: PO-001\ntitle: Open Orders\nobject: population\ntype: FR\nname: OpenOrders\n---\n\n# PO-001: Open Orders\n\n## Description\n\nThe open orders.\n\n## Members\n\n| Type | Extent |\n|------|--------|\n| Order | 0..* |\n",
    )
    .expect("write");
    let bundle = Bundle::load(&root, &[module.as_path(), edge_vocabulary().as_path()])
        .unwrap_or_else(|r| panic!("refused: {r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let population = lower_bundle(
        &bundle,
        &extractions,
        &resolutions,
        &Limits::declared().expect("limits.json parses"),
        "0.0.0",
    );
    assert_refused(
        &population,
        "PO-001",
        "it declares a population `Members` table, which no member of the construct lowers",
    );

    // The engine refuses an unknown trigger or a dangling guard itself
    // (quire-rs FR-075), so the frontend's own checks are reached by a record
    // the engine's text path cannot produce.
    let trigger = lower_mutated(|e| sm_001_transition(e, 1).trigger = "halt".to_string());
    assert_refused(
        &trigger,
        "SM_001",
        "transition placed -> shipped on halt: its trigger names no operation of the artifact",
    );
    let guard = lower_mutated(|e| sm_001_transition(e, 1).guard = Some("nope".to_string()));
    assert_refused(
        &guard,
        "SM_001",
        "its guard `nope` names no clause of the artifact",
    );

    // An emitted event that lowers to nothing refuses the state machine. The
    // `raises` edge is removed so the event rule, not the relationship rule,
    // is the one SM_001 reaches.
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    for (relative, from, to) in [
        (
            "spec/functional/EV_001-order-placed.md",
            "| placedAt | Timestamp | 1 | |",
            "| placedAt | Timestamp | 1 | |\n| paidAt | Timestamp | 1 | |",
        ),
        (
            "spec/functional/SM_001-order-lifecycle.md",
            "  - target: EV_001\n    type: raises\n",
            "",
        ),
    ] {
        let path = root.join(relative);
        let text = fs::read_to_string(&path).expect("read");
        assert!(text.contains(from), "{relative}");
        fs::write(&path, text.replace(from, to)).expect("write");
    }
    let lowered = lower(&root);
    let messages: Vec<&str> = refusals(&lowered)
        .iter()
        .map(|d| d.message.as_str())
        .collect();
    let event_rule = format!(
        "artifact SM_001 (spec/functional/SM_001-order-lifecycle.md) lowers to no `state_machine` construct: a transition, step or reference member names the type {}, which lowers to nothing",
        type_ref("EV_001")
    );
    assert!(messages.contains(&event_rule.as_str()), "{messages:#?}");
    assert!(
        messages
            .iter()
            .any(|m| m.starts_with("artifact EV_001 ") && m.contains("2 Timestamp fields")),
        "{messages:#?}"
    );
    assert!(refusals(&lowered).iter().all(|d| d.blocking));
    assert_no_edge_to_refused(&lowered);

    // FR-076 relationship rows. Under a module that does not declare the
    // `relationships` mapping the engine itself refuses the table with a
    // blocking error; under the vendored module, which declares it, the
    // frontend refuses the artifact (#156 lowers the rows).
    let relationships = |t: &str| {
        format!("{t}\n## Relationships\n\n| Name | Verb | Target | Multiplicity |\n|------|------|--------|--------------|\n| order | references | FR-001 | 1..1 |\n")
    };
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-business");
    copy_tree(&business_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let undeclared_manifest = text.replacen(", relationships]", "]", 1);
    assert_ne!(
        undeclared_manifest, text,
        "the vendored manifest declares the relationships mapping"
    );
    fs::write(&manifest, undeclared_manifest).expect("write manifest");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let path = root.join("spec/functional/VO_001-order-line.md");
    let text = fs::read_to_string(&path).expect("read");
    fs::write(&path, relationships(&text)).expect("write");
    let bundle = Bundle::load(&root, &[module.as_path(), edge_vocabulary().as_path()])
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

    let bundle = Bundle::load(
        &root,
        &[business_module().as_path(), edge_vocabulary().as_path()],
    )
    .unwrap_or_else(|r| panic!("refused: {r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");
    // This frontend supplies the engine no relation vocabulary, so the rows
    // are read but not extracted: refused, never dropped behind an advisory.
    assert_refused(
        &lowered,
        "VO_001",
        "it declares relationship rows (quire-rs FR-076) the engine did not extract (no-relation-vocabulary)",
    );
}

/// FR-143-AC-10: `supertypes` and `abstract` lower the same way for every
/// construct shape, including `enumeration` (`EN_001` below), whose
/// artifacts reach the frontend's `enumeration::lower_enum` rather than
/// `constructs::shape`. Neither member is forbidden by any business
/// construct kind (they default to `optional`, FR-142), so once this
/// frontend lowers them, an artifact carrying either succeeds rather than
/// joining [`tc_1785_an_engine_declaration_the_construct_cannot_lower_refuses_the_artifact`]'s
/// refusal cases. Both shapes carry both members at once, each `specializes`
/// edge naming a target of the same object kind (`VO_001`'s new `VO_002`,
/// `EN_001`'s new `EN_002`), so this also demonstrates `supertypes` and
/// `abstract` are independent members, not one gating the other.
#[trace("TC-1799", "FR-143-AC-10")]
#[test]
fn tc_1799_a_specializes_edge_and_an_abstract_flag_lower_to_supertypes_and_abstract() {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let functional = root.join("spec/functional");

    fs::write(
        functional.join("VO_002-order-line-variant.md"),
        "---\nid: VO_002\ntitle: Order Line Variant\nobject: value_object\ntype: FR\n\
         name: OrderLineVariant\n---\n\n# VO_002: Order Line Variant\n\n\
         ## Description\n\nA same-kind `specializes` target for `VO_001`.\n\n\
         ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
         |-------|------|--------------|-------------|\n\
         | sku | String | 1 | pattern: /^[A-Z0-9-]+$/ |\n",
    )
    .expect("write VO_002");
    fs::write(
        functional.join("EN_002-order-status-variant.md"),
        "---\nid: EN_002\ntitle: Order Status Variant\nobject: enumeration\ntype: FR\n\
         name: OrderStatusVariant\n---\n\n# EN_002: Order Status Variant\n\n\
         ## Values\n\n| Value | Description |\n|-------|-------------|\n\
         | draft | Not yet placed |\n",
    )
    .expect("write EN_002");

    let vo_path = functional.join("VO_001-order-line.md");
    let vo_text = fs::read_to_string(&vo_path).expect("read VO_001");
    let vo_edited = vo_text
        .replacen("type: FR\n", "type: FR\nabstract: true\n", 1)
        .replace(
            "relationships:\n",
            "relationships:\n  - target: VO_002\n    type: specializes\n",
        );
    assert_ne!(vo_edited, vo_text, "VO_001: the edit changes nothing");
    fs::write(&vo_path, vo_edited).expect("write VO_001");

    let en_path = functional.join("EN_001-order-status.md");
    let en_text = fs::read_to_string(&en_path).expect("read EN_001");
    let en_edited = en_text.replacen(
        "type: FR\n",
        "type: FR\nabstract: true\nrelationships:\n  - target: EN_002\n    type: specializes\n",
        1,
    );
    assert_ne!(en_edited, en_text, "EN_001: the edit changes nothing");
    fs::write(&en_path, en_edited).expect("write EN_001");

    let lowered = lower(&root);
    assert!(refusals(&lowered).is_empty(), "{:#?}", lowered.diagnostics);

    let vo = lowered
        .types
        .iter()
        .find(|t| t.identity == type_ref("VO_001"))
        .expect("VO_001");
    assert_eq!(vo.construct.supertypes, Some(vec![type_ref("VO_002")]));
    assert_eq!(vo.construct.is_abstract, Some(true));

    let en = lowered
        .types
        .iter()
        .find(|t| t.identity == type_ref("EN_001"))
        .expect("EN_001");
    assert_eq!(en.construct.supertypes, Some(vec![type_ref("EN_002")]));
    assert_eq!(en.construct.is_abstract, Some(true));
}

/// FR-143-AC-11: the five systems-model kinds (QSpec FR-152, SOA
/// `spec-objects-architecture`) lower `owner`, `declaredType`, `direction`,
/// `interfaceType`, `multiplicity`, `sourceEnd`, `targetEnd`,
/// `flowDirection`, `sourceElement`, `targetElement` and `featureOrder`
/// (quire-rs FR-075 `model.part`/`model.port`/`model.connection`/
/// `model.allocation`/`model.featureOrder`, quire-rs#446/#448) from the
/// engine's own structured extraction, never from a kind name. The engine
/// resolves each reference member to its own `ix://` identity rather than
/// handing back the bare id a table cell carries, so the frontend recovers
/// the bare id before admitting it by role. `SP_001`'s owner is `VO_001`, a
/// composite type, not another part (FR-152: a Part's owner is the owning
/// composite, never kind-restricted to `part`); `SA_001` allocates a plain
/// port reference, not the engine's member-qualified `<id>/<operation>`
/// source form (quire-rs#462), which
/// [`tc_1800_an_allocation_source_naming_an_operation_lowers_to_that_operations_identity`]
/// covers on its own. The lowered bundle is also lifted end to end (FR-097) and its document
/// read back by both the Rust and FR-050 node readers, so this exercises the
/// full pipeline `lower_bundle`'s Rust structs alone do not.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_the_five_systems_kinds_lower_their_members_from_the_engines_extraction() {
    let files: &[(&str, &str)] = &[
        (
            "SP_001-sys-part.md",
            "---\nid: SP_001\ntitle: SP_001\ntype: part\nobject: part\n---\n\n\
             # SP_001: SP_001\n\n## Description\n\n\
             A systems part, owned by the composite type `VO_001`, typed by\n\
             `VO_001` (FR-152: a part's owner is any owning composite type,\n\
             never kind-restricted to `part`).\n\n\
             ## Part\n\n| Owner | Declared Type | Multiplicity |\n|---|---|---|\n\
             | VO_001 | VO_001 | 1..1 |\n",
        ),
        (
            "SI_001-flow-interface.md",
            "---\nid: SI_001\ntitle: SI_001\ntype: interface\nobject: interface\n---\n\n\
             # SI_001: SI_001\n\n## Description\n\nThe flow interface: one field, `rate`.\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| rate | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_001\nfields:\n  - name: rate\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations: []\n\
             featureOrder: [rate]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | rate | field |\n",
        ),
        (
            "SP_002-port-out.md",
            "---\nid: SP_002\ntitle: SP_002\ntype: port\nobject: port\n---\n\n\
             # SP_002: SP_002\n\n## Description\n\n\
             The outbound port, owned by `SP_001`, typed by `SI_001`.\n\n\
             ## Port\n\n| Owner | Direction | Interface | Multiplicity |\n|---|---|---|---|\n\
             | SP_001 | out | SI_001 | 1..1 |\n",
        ),
        (
            "SP_003-port-in.md",
            "---\nid: SP_003\ntitle: SP_003\ntype: port\nobject: port\n---\n\n\
             # SP_003: SP_003\n\n## Description\n\n\
             The inbound port, owned by `SP_001`, typed by `SI_001`.\n\n\
             ## Port\n\n| Owner | Direction | Interface | Multiplicity |\n|---|---|---|---|\n\
             | SP_001 | in | SI_001 | 1..1 |\n",
        ),
        (
            "SC_001-pipe.md",
            "---\nid: SC_001\ntitle: SC_001\ntype: connection\nobject: connection\n---\n\n\
             # SC_001: SC_001\n\n## Description\n\nThe connection from `SP_002` to `SP_003`.\n\n\
             ## Connection\n\n\
             | Source | Source Multiplicity | Target | Target Multiplicity | Direction |\n\
             |---|---|---|---|---|\n\
             | SP_002 | 1..1 | SP_003 | 1..1 | source-to-target |\n",
        ),
        (
            "SA_001-alloc.md",
            "---\nid: SA_001\ntitle: SA_001\ntype: allocation\nobject: allocation\n---\n\n\
             # SA_001: SA_001\n\n## Description\n\n\
             The port `SP_002` allocated to the part `SP_001`: a plain reference,\n\
             never the engine's member-qualified `<id>/<operation>` source form\n\
             (quire-rs#461/#462), which this frontend does not resolve.\n\n\
             ## Allocation\n\n| Source | Target |\n|---|---|\n| SP_002 | SP_001 |\n",
        ),
    ];
    let (_scratch, root, lowered) = lower_systems(|dir| {
        for (name, content) in files {
            fs::write(dir.join(name), content).expect("write");
        }
    });
    assert!(refusals(&lowered).is_empty(), "{:#?}", lowered.diagnostics);

    let ty = |id: &str| {
        lowered
            .types
            .iter()
            .find(|t| t.identity == type_ref(id))
            .unwrap_or_else(|| panic!("no type {id}"))
    };

    let part = ty("SP_001");
    assert_eq!(part.construct.owner, Some(type_ref("VO_001")));
    assert_eq!(part.construct.declared_type, Some(type_ref("VO_001")));
    assert_eq!(
        part.construct.multiplicity.as_ref().map(|m| m.lower),
        Some(1)
    );

    let interface = ty("SI_001");
    assert_eq!(
        interface.construct.feature_order,
        Some(vec![field_ref("SI_001", "rate")])
    );

    let port_out = ty("SP_002");
    assert_eq!(port_out.construct.owner, Some(type_ref("SP_001")));
    assert_eq!(port_out.construct.direction, Some(Direction::Out));
    assert_eq!(port_out.construct.interface_type, Some(type_ref("SI_001")));
    assert_eq!(
        port_out.construct.multiplicity.as_ref().map(|m| m.lower),
        Some(1)
    );

    let port_in = ty("SP_003");
    assert_eq!(port_in.construct.direction, Some(Direction::In));
    assert_eq!(
        port_in.construct.multiplicity.as_ref().map(|m| m.lower),
        Some(1)
    );

    let connection = ty("SC_001");
    let source_end = connection.construct.source_end.as_ref().expect("sourceEnd");
    assert_eq!(source_end.type_ref, type_ref("SP_002"));
    assert_eq!(
        source_end.multiplicity.as_ref().map(|m| m.lower),
        Some(1),
        "{source_end:?}"
    );
    let target_end = connection.construct.target_end.as_ref().expect("targetEnd");
    assert_eq!(target_end.type_ref, type_ref("SP_003"));
    assert_eq!(
        target_end.multiplicity.as_ref().map(|m| m.lower),
        Some(1),
        "{target_end:?}"
    );
    assert_eq!(
        connection.construct.flow_direction,
        Some(FlowDirection::SourceToTarget)
    );

    let allocation = ty("SA_001");
    assert_eq!(
        allocation.construct.source_element,
        Some(type_ref("SP_002"))
    );
    assert_eq!(
        allocation.construct.target_element,
        Some(type_ref("SP_001"))
    );

    // The same bundle, lifted end to end (FR-097) rather than only lowered
    // to Rust structs, so the document both readers see is exercised too.
    let out_dir = tempfile::tempdir().expect("tempdir");
    let request = LiftRequest {
        bundle_root: root,
        module_roots: systems_module_roots(),
        out: out_dir.path().join("semantic-ir.json"),
        diagnostics: None,
        provenance: None,
    };
    let outcome = lift(&request);
    let LiftOutcome::Written { document, .. } = outcome else {
        panic!("{outcome:?}");
    };
    let document: Value = serde_json::from_slice(&document).expect("document parses");
    assert!(rust_codes(&document).is_empty(), "{document}");
    assert!(node_codes(&document).is_empty(), "{document}");
}

/// A pair of `part` artifacts, each owned by the composite value_object
/// `VO_001` (FR-152: a part's owner is a composite type, never another
/// part): a legitimate owner for a scenario that needs one but is not
/// itself testing ownership.
fn systems_part_pair() -> [(&'static str, &'static str); 2] {
    [
        (
            "SP_900-sys-helper-part-a.md",
            "---\nid: SP_900\ntitle: SP_900\ntype: part\nobject: part\n---\n\n\
             # SP_900: SP_900\n\n## Description\n\nA helper part, owned by `VO_001`.\n\n\
             ## Part\n\n| Owner | Declared Type | Multiplicity |\n|---|---|---|\n\
             | VO_001 | VO_001 | 1..1 |\n",
        ),
        (
            "SP_901-sys-helper-part-b.md",
            "---\nid: SP_901\ntitle: SP_901\ntype: part\nobject: part\n---\n\n\
             # SP_901: SP_901\n\n## Description\n\nA helper part, owned by `VO_001`.\n\n\
             ## Part\n\n| Owner | Declared Type | Multiplicity |\n|---|---|---|\n\
             | VO_001 | VO_001 | 1..1 |\n",
        ),
    ]
}

/// FR-143-AC-11 continued: a systems reference member (here a part's
/// `declaredType`) is re-checked in [`crate::constructs::refusal_rule`]'s
/// fixed point the same as a transition's or step's `emits`/`consumes`, so
/// naming an artifact the fixed point later refuses for an unrelated reason
/// (`EV_001`, refused for its own occurrence-field rule, not for anything
/// about the part naming it) cascades the refusal to the part, rather than
/// the part's `owner_from_model` early return skipping the check. `SP_004`'s
/// own `owner` is the composite value_object `VO_001` (FR-152: a part's
/// owner is a composite type, never another part), so `declaredType` is the
/// only thing under test.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_a_systems_reference_member_naming_a_since_refused_type_cascades_the_refusal() {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    let event_path = root.join("spec/functional/EV_001-order-placed.md");
    let event_text = fs::read_to_string(&event_path).expect("read EV_001");
    let edited = event_text.replace(
        "| placedAt | Timestamp | 1 | |",
        "| placedAt | Timestamp | 1 | |\n| paidAt | Timestamp | 1 | |",
    );
    assert_ne!(edited, event_text, "EV_001: the edit changes nothing");
    fs::write(&event_path, edited).expect("write EV_001");
    for (name, content) in systems_part_pair() {
        fs::write(root.join("spec/functional").join(name), content).expect("write helper part");
    }
    fs::write(
        root.join("spec/functional/SP_004-sys-part-typed-by-refused.md"),
        "---\nid: SP_004\ntitle: SP_004\ntype: part\nobject: part\n---\n\n\
         # SP_004: SP_004\n\n## Description\n\n\
         A systems part, owned by `VO_001`, typed by `EV_001`: `EV_001` is\n\
         refused by the time the fixed point settles, so this part's\n\
         `declaredType` cascades the refusal rather than lowering.\n\n\
         ## Part\n\n| Owner | Declared Type | Multiplicity |\n|---|---|---|\n\
         | VO_001 | EV_001 | 1..1 |\n",
    )
    .expect("write SP_004");
    let module_roots = systems_module_roots();
    let module_paths: Vec<&Path> = module_roots.iter().map(PathBuf::as_path).collect();
    let bundle = Bundle::load(&root, &module_paths)
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");

    let messages: Vec<&str> = refusals(&lowered)
        .iter()
        .map(|d| d.message.as_str())
        .collect();
    assert!(
        messages
            .iter()
            .any(|m| m.starts_with("artifact EV_001 ") && m.contains("2 Timestamp fields")),
        "{messages:#?}"
    );
    let cascade_rule = format!(
        "artifact SP_004 (spec/functional/SP_004-sys-part-typed-by-refused.md) lowers to no `part` construct: a transition, step or reference member names the type {}, which lowers to nothing",
        type_ref("EV_001")
    );
    assert!(messages.contains(&cascade_rule.as_str()), "{messages:#?}");
    assert!(refusals(&lowered).iter().all(|d| d.blocking));
}

/// FR-143-AC-11 continued: an `owner`/`source`/`target` reference cell
/// resolves under quire-rs `semantic::target::resolve_target` (`TableRead::
/// reference`), which admits an `ix://<org>/<repo>/<id>` cell naming a
/// package the loading module declares as an import (`Target::Imported`,
/// its own object type unknown to the engine). This frontend refuses that
/// identity by its full text, never rebinding it to a local artifact of the
/// same bare id: `ix://acme/other/SP_001` never resolves to this bundle's
/// own local `SP_001`. The vendored SOA module declares no import on its
/// own, so this uses an edited copy declaring one, the same way TC-1801
/// edits a copy to relax a locator.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_a_systems_reference_member_naming_an_imported_identity_is_refused() {
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-architecture");
    copy_tree(&soa_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let edited = text.replacen(
        "  imports: {}\n",
        "  imports: { acme/other: \"1.0.0\" }\n",
        1,
    );
    assert_ne!(edited, text, "the SOA module declares no import");
    fs::write(&manifest, edited).expect("write manifest");

    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    fs::write(
        root.join("spec/functional/SP_005-sys-part-imported-owner.md"),
        "---\nid: SP_005\ntitle: SP_005\ntype: part\nobject: part\n---\n\n\
         # SP_005: SP_005\n\n## Description\n\n\
         A systems part whose owner cell names an identity in a package the\n\
         module imports (`ix://acme/other/SP_001`), never the bundle's own\n\
         local `SP_001` of the same bare id.\n\n\
         ## Part\n\n| Owner | Declared Type | Multiplicity |\n|---|---|---|\n\
         | ix://acme/other/SP_001 | VO_001 | 1..1 |\n",
    )
    .expect("write SP_005");
    let bundle = Bundle::load(
        &root,
        &[
            business_module().as_path(),
            edge_vocabulary().as_path(),
            module.as_path(),
        ],
    )
    .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");

    assert_refused(
        &lowered,
        "SP_005",
        "a systems `part` row names `ix://acme/other/SP_001`, which is the artifact id of no type of the bundle the construct's owner admit",
    );
}

/// FR-143-AC-11 continued: the engine's own member-qualified
/// `<id>/<operation>` allocation-source form (quire-rs `TableRead::
/// reference`'s member append, admitted for a `Source` cell only, and only
/// over a local `interface` artifact — quire-rs#462) lowers to the
/// referenced artifact's operation identity, the same identity
/// [`crate::clauses::lower_operations`] mints for that artifact's own
/// `### run` heading under `## Operations`, never mis-extracted as the bare
/// id `run` or `SI_002`. The target is [`systems_part_pair`]'s `SP_900`, so
/// only the source's member-qualified form is under test.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_an_allocation_source_naming_an_operation_lowers_to_that_operations_identity() {
    let (scratch, root, lowered) = lower_systems(|dir| {
        for (name, content) in systems_part_pair() {
            fs::write(dir.join(name), content).expect("write helper part");
        }
        fs::write(
            dir.join("SI_002-flow-interface-b.md"),
            "---\nid: SI_002\ntitle: SI_002\ntype: interface\nobject: interface\n---\n\n\
             # SI_002: SI_002\n\n## Description\n\n\
             A second interface: one field, `rate`, and one operation, `run`.\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| rate | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_002\nfields:\n  - name: rate\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations:\n  - name: run\n\
             featureOrder: [rate, run]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | rate | field |\n| run | operation |\n\n## Operations\n\n### run\n\nRuns the interface.\n",
        )
        .expect("write SI_002");
        fs::write(
            dir.join("SA_002-alloc-operation-source.md"),
            "---\nid: SA_002\ntitle: SA_002\ntype: allocation\nobject: allocation\n---\n\n\
             # SA_002: SA_002\n\n## Description\n\n\
             An allocation whose source names a real operation, `run`, that\n\
             `SI_002` declares under `## Operations` (the engine's\n\
             member-qualified `<id>/<operation>` form, quire-rs#462), which\n\
             this frontend lowers to `SI_002`'s `run` operation identity.\n\n\
             ## Allocation\n\n| Source | Target |\n|---|---|\n\
             | SI_002/run | SP_900 |\n",
        )
        .expect("write SA_002");
    });

    assert!(refusals(&lowered).is_empty(), "{:#?}", lowered.diagnostics);
    let sa_002 = lowered
        .types
        .iter()
        .find(|t| t.identity == type_ref("SA_002"))
        .expect("SA_002");
    assert_eq!(
        sa_002.construct.source_element,
        Some(format!("{PREFIX}operation/SI_002-run")),
        "the allocation source lowers to SI_002's run operation identity"
    );

    // The delta review that found this lowering refused end to end
    // (`INVALID_IR: UNRESOLVED_CONSTRUCT_REF at /ir/types/.../sourceElement`)
    // reached the FR-097 independent reader that `lower_bundle` alone never
    // calls, so the assertions above passed while the real `lift` still
    // failed. This runs the same bundle through the full pipeline — the
    // Rust `agent_ix_semantic_ir` reader `validate` calls, and the FR-050
    // node reader (`readContractIr`) over the document it writes — and
    // requires both to report no code at all, not merely no *blocking* one.
    let request = LiftRequest {
        bundle_root: root,
        module_roots: systems_module_roots(),
        out: scratch.path().join("semantic-ir.json"),
        diagnostics: None,
        provenance: None,
    };
    let outcome = lift(&request);
    let LiftOutcome::Written {
        document: bytes, ..
    } = outcome
    else {
        panic!("the real lift did not write a document: {outcome:?}");
    };
    let document: Value = serde_json::from_slice(&bytes).expect("the written document parses");
    assert_eq!(
        rust_codes(&document),
        Vec::<String>::new(),
        "the independent Rust reader over the real lift's document"
    );
    assert_eq!(
        node_codes(&document),
        Vec::<String>::new(),
        "the FR-050 node reader over the real lift's document"
    );
}

/// FR-143-AC-11 continued: a genuine two-round cascade through
/// [`refusal_rule`]'s FR-152 `operations` branch, not merely a `sourceElement`
/// naming an artifact already excluded before [`assign_owners`]'s fixed
/// point ever starts (that artifact's own pre-loop exclusion would let a
/// single, once-computed `operations` set pass this test too, proving
/// nothing about the per-round recompute). Here `SI_003`'s own extraction is
/// marked unavailable, refusing it before the fixed point ever starts (it
/// never enters `pending`). `SI_002` specializes `SI_003` (a plain
/// `relationships` edge, `type: specializes`), so `SI_002` is refused in
/// round 0 of [`assign_owners`]'s own loop, by `refusal_rule`'s
/// "relationship targets a refused artifact" re-check: `SI_002` itself is
/// still pending at round 0's start, and is only removed at round 0's end.
/// Only round 1's fresh `operations` set drops `SI_002`'s `run` operation
/// (round 0's own `operations` set, computed before `SI_002` was refused
/// that round, still admits it), so `SA_002`'s `sourceElement` re-check does
/// not catch it until round 1: this genuinely exercises the per-round
/// recompute, and the diagnostic below names `SA_002`'s source as an
/// operation, not a type.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_an_allocation_source_naming_an_operation_of_a_since_refused_artifact_cascades_the_refusal(
) {
    let write = |dir: &Path| {
        for (name, content) in systems_part_pair() {
            fs::write(dir.join(name), content).expect("write helper part");
        }
        fs::write(
            dir.join("SI_003-flow-interface-c.md"),
            "---\nid: SI_003\ntitle: SI_003\ntype: interface\nobject: interface\n---\n\n\
             # SI_003: SI_003\n\n## Description\n\n\
             A third interface, specialized by `SI_002`; this test's own\n\
             mutation later marks its model extraction unavailable, so the\n\
             `supertypes` cascade refuses `SI_002` inside the fixed point\n\
             (round 0), one round before `SA_002`'s own `sourceElement`\n\
             re-check catches it (round 1).\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| flag | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_003\nfields:\n  - name: flag\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations: []\n\
             featureOrder: [flag]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | flag | field |\n",
        )
        .expect("write SI_003");
        fs::write(
            dir.join("SI_002-flow-interface-b.md"),
            "---\nid: SI_002\ntitle: SI_002\ntype: interface\nobject: interface\n\
             relationships:\n  - target: SI_003\n    type: specializes\n---\n\n\
             # SI_002: SI_002\n\n## Description\n\n\
             A second interface: one field, `rate`, and one operation, `run`,\n\
             specializing `SI_003`.\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| rate | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_002\nfields:\n  - name: rate\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations:\n  - name: run\n\
             featureOrder: [rate, run]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | rate | field |\n| run | operation |\n\n## Operations\n\n### run\n\nRuns the interface.\n",
        )
        .expect("write SI_002");
        fs::write(
            dir.join("SA_002-alloc-operation-source.md"),
            "---\nid: SA_002\ntitle: SA_002\ntype: allocation\nobject: allocation\n---\n\n\
             # SA_002: SA_002\n\n## Description\n\n\
             An allocation whose source names an operation of `SI_002`,\n\
             which this test's own mutation refuses one round after `SI_003`\n\
             (the artifact `SI_002` specializes) is marked unavailable, so\n\
             the cascade must refuse `SA_002` too.\n\n\
             ## Allocation\n\n| Source | Target |\n|---|---|\n\
             | SI_002/run | SP_900 |\n",
        )
        .expect("write SA_002");
    };

    let unavailable = |extractions: &mut Extractions| {
        extractions
            .artifacts
            .get_mut("SI_003")
            .expect("SI_003 extracted")
            .extraction
            .availability
            .model = Some(KindAvailability {
            state: AvailabilityState::Unavailable,
            reason: Some("TC-1800: injected for the cascade test".to_string()),
            lossy: false,
        });
    };

    let broken = lower_systems_mutated(write, unavailable);
    let messages: Vec<&str> = refusals(&broken)
        .iter()
        .map(|d| d.message.as_str())
        .collect();
    assert!(
        messages.iter().any(|m| {
            m.starts_with("artifact SI_003 ")
                && m.contains(
                    "the engine's model extraction is unavailable \
                     (TC-1800: injected for the cascade test)",
                )
        }),
        "{messages:#?}"
    );
    let si_002_cascade = format!(
        "artifact SI_002 (spec/functional/SI_002-flow-interface-b.md) lowers to no \
         `interface` construct: its `specializes` relationship targets {}, which lowers to nothing",
        type_ref("SI_003")
    );
    assert!(messages.contains(&si_002_cascade.as_str()), "{messages:#?}");
    let sa_002_cascade = format!(
        "artifact SA_002 (spec/functional/SA_002-alloc-operation-source.md) lowers to no \
         `allocation` construct: a transition, step or reference member names the operation \
         {PREFIX}operation/SI_002-run, which lowers to nothing"
    );
    assert!(messages.contains(&sa_002_cascade.as_str()), "{messages:#?}");
    assert!(refusals(&broken).iter().all(|d| d.blocking));

    let (_scratch, _root, clean) = lower_systems(write);
    assert!(refusals(&clean).is_empty(), "{:#?}", clean.diagnostics);
}

/// FR-143-AC-11 continued: the engine's own member-qualified allocation
/// source resolves against the referenced artifact's real declared
/// operations before this frontend ever sees it (quire-rs#462); this test
/// bypasses that engine-level check by mutating the already-extracted
/// `sourceElement` directly (the seam [`lower_systems_mutated`] documents),
/// so the identity this frontend mints (`SI_002-bogus`) never joins the
/// bundle's real `operations` set and [`refusal_rule`]'s FR-152 branch
/// refuses SA_002 alone — SI_002 itself lowers untouched.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_an_allocation_source_naming_an_operation_that_does_not_exist_is_refused() {
    let write = |dir: &Path| {
        for (name, content) in systems_part_pair() {
            fs::write(dir.join(name), content).expect("write helper part");
        }
        fs::write(
            dir.join("SI_002-flow-interface-b.md"),
            "---\nid: SI_002\ntitle: SI_002\ntype: interface\nobject: interface\n---\n\n\
             # SI_002: SI_002\n\n## Description\n\n\
             A second interface: one field, `rate`, and one operation, `run`.\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| rate | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_002\nfields:\n  - name: rate\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations:\n  - name: run\n\
             featureOrder: [rate, run]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | rate | field |\n| run | operation |\n\n## Operations\n\n### run\n\nRuns the interface.\n",
        )
        .expect("write SI_002");
        fs::write(
            dir.join("SA_002-alloc-operation-source.md"),
            "---\nid: SA_002\ntitle: SA_002\ntype: allocation\nobject: allocation\n---\n\n\
             # SA_002: SA_002\n\n## Description\n\n\
             An allocation whose source names SI_002's real `run` operation;\n\
             this test's own mutation swaps it for an operation SI_002 never\n\
             declares.\n\n\
             ## Allocation\n\n| Source | Target |\n|---|---|\n\
             | SI_002/run | SP_900 |\n",
        )
        .expect("write SA_002");
    };

    let bogus_operation = |extractions: &mut Extractions| {
        *allocation_source_mut(extractions, "SA_002") = format!("{PREFIX}SI_002/bogus");
    };

    let lowered = lower_systems_mutated(write, bogus_operation);
    assert_refused(
        &lowered,
        "SA_002",
        &format!(
            "a transition, step or reference member names the operation \
             {PREFIX}operation/SI_002-bogus, which lowers to nothing"
        ),
    );
}

/// FR-143-AC-11 continued: an allocation source naming an operation of an
/// artifact id the bundle declares nowhere at all (never mis-read as the
/// referenced artifact's own id with a stray path segment) is refused
/// immediately, at the artifact's own first lowering pass — never as a
/// fixed-point cascade, since no round ever admits it in the first place.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_an_allocation_source_naming_an_unknown_local_artifact_is_refused() {
    let write = |dir: &Path| {
        for (name, content) in systems_part_pair() {
            fs::write(dir.join(name), content).expect("write helper part");
        }
        fs::write(
            dir.join("SI_002-flow-interface-b.md"),
            "---\nid: SI_002\ntitle: SI_002\ntype: interface\nobject: interface\n---\n\n\
             # SI_002: SI_002\n\n## Description\n\n\
             A second interface: one field, `rate`, and one operation, `run`.\n\n\
             ## Properties\n\n| Field | Type | Multiplicity | Constraints |\n\
             |-------|------|--------------|-------------|\n| rate | String | 1 | |\n\n\
             ## Contract\n\n```yaml\nname: SI_002\nfields:\n  - name: rate\n\
             \x20\x20\x20 type: String\n    multiplicity: 1..1\noperations:\n  - name: run\n\
             featureOrder: [rate, run]\n```\n\n## Features\n\n| Feature | Kind |\n|---|---|\n\
             | rate | field |\n| run | operation |\n\n## Operations\n\n### run\n\nRuns the interface.\n",
        )
        .expect("write SI_002");
        fs::write(
            dir.join("SA_002-alloc-operation-source.md"),
            "---\nid: SA_002\ntitle: SA_002\ntype: allocation\nobject: allocation\n---\n\n\
             # SA_002: SA_002\n\n## Description\n\n\
             An allocation whose source names SI_002's real `run` operation;\n\
             this test's own mutation swaps SI_002 for an artifact id the\n\
             bundle declares nowhere.\n\n\
             ## Allocation\n\n| Source | Target |\n|---|---|\n\
             | SI_002/run | SP_900 |\n",
        )
        .expect("write SA_002");
    };

    let unknown_artifact = |extractions: &mut Extractions| {
        *allocation_source_mut(extractions, "SA_002") = format!("{PREFIX}NOPE/run");
    };

    let lowered = lower_systems_mutated(write, unknown_artifact);
    assert_refused(
        &lowered,
        "SA_002",
        "is the artifact id of no type of the bundle the construct's sourceElement admit",
    );
}

/// The written `architecture` fixture document (filament-core-data#173).
fn architecture_document() -> Value {
    let (_dir, _request, outcome) = lift_fixture("architecture");
    let LiftOutcome::Written {
        document,
        result_state,
        ..
    } = outcome
    else {
        panic!("architecture does not lift");
    };
    assert_eq!(result_state, ResultState::Success);
    serde_json::from_slice(&document).expect("json")
}

/// FR-143-AC-11 over the real, committed `architecture` fixture
/// (filament-core-data#173, the bundle QSL intake tests read) rather than a
/// synthetic document: the lift produces contract `2.0.0`, at least one
/// artifact of each of the five systems kinds (`interface`, `part`, `port`,
/// `connection`, `allocation`; ports and connections between components
/// included), every one of them module-qualified
/// `agent-ix/spec-objects-architecture`, an embedded `constructs` table
/// naming each kind actually used, and `agent_ix_semantic_ir::decide` raises
/// nothing over it.
#[trace("TC-1800", "FR-143-AC-11")]
#[test]
fn tc_1800_the_architecture_fixture_lifts_to_ir_2_0_0_with_module_qualified_systems_kinds() {
    let document = architecture_document();
    assert_eq!(document["contractVersion"], "2.0.0");
    assert!(
        rust_codes(&document).is_empty(),
        "{:?}",
        rust_codes(&document)
    );

    let mut kinds: Vec<String> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .filter_map(|t| {
            let module = t["kind"]["module"].as_str()?;
            let name = t["kind"]["name"].as_str()?;
            Some(format!("{module}/{name}"))
        })
        .collect();
    kinds.sort();
    kinds.dedup();
    assert_eq!(
        kinds,
        [
            "agent-ix/spec-objects-architecture/allocation",
            "agent-ix/spec-objects-architecture/connection",
            "agent-ix/spec-objects-architecture/interface",
            "agent-ix/spec-objects-architecture/part",
            "agent-ix/spec-objects-architecture/port",
            "agent-ix/spec-objects-business/entity",
            "agent-ix/spec-objects-business/value_object",
        ]
    );

    let mut construct_kinds: Vec<String> = document["constructs"]
        .as_array()
        .expect("constructs")
        .iter()
        .filter_map(|c| {
            let module = c["kind"]["module"].as_str()?;
            let name = c["kind"]["name"].as_str()?;
            Some(format!("{module}/{name}"))
        })
        .collect();
    construct_kinds.sort();
    assert_eq!(
        construct_kinds, kinds,
        "the constructs table names every kind used"
    );
}

/// FR-143-AC-9 continued: a member with its own per-artifact source table
/// (unlike the engine-gated `states`/`transitions`/`steps`) is required by
/// the declaration but this artifact's own extraction carries no row for
/// it — refused one artifact at a time, never emitted empty.
#[trace("TC-1801", "FR-143-AC-9")]
#[test]
fn tc_1801_a_required_member_with_its_own_source_table_absent_from_the_artifact_refuses_it() {
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-architecture");
    copy_tree(&soa_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    // Relax the engine's own `## Features` locator to optional, so the
    // engine admits an interface document with no such table (`model.
    // feature_order: None`) while the construct's own `featureOrder:
    // required` (unedited) still stands: the frontend's own required-source
    // check, not the engine's locator, is what this case reaches.
    let relaxed = text.replacen(
        "        features:\n          from: table_row\n          under_section: Features\n          required: true\n",
        "        features:\n          from: table_row\n          under_section: Features\n          required: false\n",
        1,
    );
    assert_ne!(
        relaxed, text,
        "the interface's `Features` locator is required"
    );
    fs::write(&manifest, relaxed).expect("write manifest");
    let root = dir.path().join("business");
    copy_tree(&fixture("business"), &root);
    fs::write(
        root.join("spec/functional/SI_002-bare-interface.md"),
        "---\nid: SI_002\ntitle: SI_002\ntype: interface\nobject: interface\n---\n\n\
         # SI_002: SI_002\n\n## Description\n\n\
         An interface with a `Contract` but no `Features` table: the\n\
         declaration requires `featureOrder`, and this artifact declares no\n\
         source for it.\n\n## Contract\n\n```yaml\nname: SI_002\nfields: []\n\
         operations: []\n```\n",
    )
    .expect("write");
    let bundle = Bundle::load(
        &root,
        &[
            business_module().as_path(),
            module.as_path(),
            edge_vocabulary().as_path(),
        ],
    )
    .unwrap_or_else(|r| panic!("refused: {r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");
    assert_refused(
        &lowered,
        "SI_002",
        "the construct requires featureOrder, and this artifact declares none",
    );
}

/// FR-143-AC-9 continued: `constructs::lower_generalization`'s own
/// required-source check — the general rule (the "no `specializes`/
/// `abstract` declaration" clause) `lower_generalization` runs directly,
/// rather than through `shape`'s own blanket check — carried no test of its
/// own before this one: every other required-member case in this file
/// exercises a per-artifact source table (`Features`), never `supertypes` or
/// `abstract`. The vendored business module declares its `enumeration`
/// construct's `supertypes` at FR-142's default (`optional`); this edits a
/// copy to `required`, and `EN_001` declares no `specializes` edge.
#[trace("TC-1802", "FR-143-AC-9")]
#[test]
fn tc_1802_an_enumeration_construct_requiring_supertypes_with_none_declared_refuses_it() {
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-business");
    copy_tree(&business_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let edited = text.replacen(
        "members: {variants: required, fields: forbidden, relationships: forbidden, operations: forbidden}",
        "members: {variants: required, fields: forbidden, relationships: forbidden, operations: forbidden, supertypes: required}",
        1,
    );
    assert_ne!(
        edited, text,
        "the enumeration construct declares no supertypes presence"
    );
    fs::write(&manifest, edited).expect("write manifest");

    let root = fixture("business");
    let bundle = Bundle::load(&root, &[module.as_path(), edge_vocabulary().as_path()])
        .unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");

    assert_refused(
        &lowered,
        "EN_001",
        "the construct requires supertypes, and this artifact declares none",
    );
}

#[trace("TC-1790", "FR-143-AC-7")]
#[test]
fn tc_1790_the_business_lift_carries_each_used_kind_s_manifest_declaration() {
    let (_dir, request, outcome) = lift_fixture("business");
    assert!(
        matches!(outcome, LiftOutcome::Written { .. }),
        "{outcome:?}"
    );
    let document = read_json(&request.out);
    let manifest = fs::read(business_module().join("manifest.yaml")).expect("manifest");
    let digest = format!("sha256:{}", common::sha256sum(&manifest));

    let used: std::collections::BTreeSet<String> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .filter(|t| t["kind"].is_object())
        .map(|t| t["kind"].to_string())
        .collect();
    let entries = document["constructs"].as_array().expect("constructs");
    let declared: std::collections::BTreeSet<String> = entries
        .iter()
        .map(|entry| entry["kind"].to_string())
        .collect();
    assert_eq!(declared, used, "one entry per used kind");
    assert_eq!(entries.len(), used.len(), "no kind declared twice");
    for entry in entries {
        assert_eq!(entry["kind"]["module"], BUSINESS, "{entry}");
        assert_eq!(entry["moduleVersion"], "0.7.0", "{entry}");
        assert_eq!(entry["manifestDigest"], digest.as_str(), "{entry}");
    }
    let entry = |name: &str| {
        entries
            .iter()
            .find(|entry| entry["kind"]["name"] == name)
            .unwrap_or_else(|| panic!("no entry {name}"))
    };
    // The manifest's declarations, with each bare role qualified by the
    // short name of the module whose object types carry it.
    assert_eq!(
        entry("aggregate_root")["construct"],
        json!({
            "identity": "identified",
            "shape": "record",
            "members": {
                "fields": "required", "identityFields": "required",
                "clauses": "required", "members": "required"
            },
            "references": { "members": ["business:aggregate-member"] },
            "rules": ["identity_field_required", "min_clauses"],
            "meaning": "quire.meaning.model.object-type/v1"
        })
    );
    assert_eq!(
        entry("nested_entity")["construct"]["references"],
        json!({ "owner": ["business:composite-owner"] })
    );
    assert_eq!(
        entry("state_machine")["construct"]["references"],
        json!({ "transitions": ["business:event-like"] })
    );

    // The one seam: only `bundle.rs` reads a `construct` declaration, once,
    // through `CompiledArchetype::construct()`; no source reads the manifest
    // key itself.
    let src = common::crate_dir().join("src");
    let mut readers = Vec::new();
    for file in fs::read_dir(&src).expect("src") {
        let path = file.expect("entry").path();
        let text = fs::read_to_string(&path).expect("read");
        assert!(
            !text.contains("get(\"construct\")"),
            "{} reads the manifest key",
            path.display()
        );
        if text.contains(".construct()") {
            readers.push(
                path.file_name()
                    .expect("name")
                    .to_string_lossy()
                    .into_owned(),
            );
        }
    }
    assert_eq!(readers, ["bundle.rs"]);
    let bundle_rs = fs::read_to_string(src.join("bundle.rs")).expect("bundle.rs");
    assert_eq!(bundle_rs.matches(".construct()").count(), 1);
}

#[trace("TC-1792", "FR-143-AC-8")]
#[test]
fn tc_1792_a_broken_manifest_declaration_refuses_naming_the_module_and_object_type() {
    const ENTITY: &str = "  construct:\n    identity: identified\n    shape: record\n    members: {fields: required, identityFields: required}\n    rules: [identity_field_required]\n    meaning: quire.meaning.model.object-type/v1\n";
    let cases: [(&str, String); 6] = [
        (
            "no meaning",
            ENTITY.replace("    meaning: quire.meaning.model.object-type/v1\n", ""),
        ),
        (
            "a member outside the vocabulary",
            ENTITY.replace("identityFields: required}", "identityFields: required, colour: required}"),
        ),
        (
            "a rule outside the vocabulary",
            ENTITY.replace("[identity_field_required]", "[identity_field_required, be_nice]"),
        ),
        (
            "a rule whose member presence is undeclared",
            ENTITY.replace("{fields: required, identityFields: required}", "{fields: required}"),
        ),
        (
            "a wildcard role",
            ENTITY.replace(
                "identityFields: required}\n",
                "identityFields: required, owner: optional}\n    references: {owner: ['*']}\n",
            ),
        ),
        (
            "a role no loaded object type carries",
            ENTITY.replace(
                "identityFields: required}\n",
                "identityFields: required, owner: optional}\n    references: {owner: [no-such-role]}\n",
            ),
        ),
    ];
    let original = fs::read_to_string(business_module().join("manifest.yaml")).expect("manifest");
    assert_eq!(
        original.matches(ENTITY).count(),
        1,
        "the entity declaration"
    );
    for (label, broken) in cases {
        assert_ne!(broken, ENTITY, "{label}: the edit applies");
        let dir = tempfile::tempdir().expect("tempdir");
        let module = dir.path().join("spec-objects-business");
        copy_tree(&business_module(), &module);
        fs::write(
            module.join("manifest.yaml"),
            original.replace(ENTITY, &broken),
        )
        .expect("write");
        let refusal = Bundle::load(
            &fixture("business"),
            &[module.as_path(), edge_vocabulary().as_path()],
        )
        .expect_err(label);
        assert_eq!(refusal.code(), Code::ModuleRefused, "{label}");
        let diagnostic = &refusal.diagnostic;
        assert!(diagnostic.blocking, "{label}");
        assert!(
            diagnostic.message.starts_with(
                "module spec-objects-business object type entity declares no valid construct: "
            ),
            "{label}: {}",
            diagnostic.message
        );
        let locus = diagnostic.locus.as_ref().expect("a manifest locus");
        assert_eq!(locus.path, "spec-objects-business/manifest.yaml", "{label}");
    }
}

/// Every file under `dir` with one of `extensions`, skipping `generated`
/// and `node_modules` directories, in path order.
fn source_files(dir: &Path, extensions: &[&str], out: &mut Vec<PathBuf>) {
    let Ok(read) = fs::read_dir(dir) else {
        return;
    };
    let mut paths: Vec<PathBuf> = read.map(|entry| entry.expect("entry").path()).collect();
    paths.sort();
    for path in paths {
        let name = path
            .file_name()
            .expect("name")
            .to_string_lossy()
            .into_owned();
        if path.is_dir() {
            if !matches!(name.as_str(), "generated" | "node_modules" | "__pycache__") {
                source_files(&path, extensions, out);
            }
        } else if path
            .extension()
            .is_some_and(|e| extensions.contains(&e.to_string_lossy().as_ref()))
        {
            out.push(path);
        }
    }
}

/// `file:line: literal` for every quoted business kind name in the code of
/// `files`, comment lines skipped, relative to `root`.
fn kind_name_literals(root: &Path, files: &[PathBuf], names: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for file in files {
        let text = fs::read_to_string(file).expect("read");
        let relative = file
            .strip_prefix(root)
            .unwrap_or(file)
            .display()
            .to_string();
        for (number, line) in text.lines().enumerate() {
            let code = line.trim_start();
            if ["//", "/*", "*", "#"].iter().any(|c| code.starts_with(c)) {
                continue;
            }
            for name in names {
                for quote in ['"', '\'', '`'] {
                    let literal = format!("{quote}{name}{quote}");
                    if code.contains(&literal) {
                        out.push(format!("{relative}:{}: {literal}", number + 1));
                    }
                }
            }
        }
    }
    out
}

#[trace("TC-1787", "FR-142-AC-7")]
#[test]
fn tc_1787_no_business_kind_name_is_a_literal_in_source() {
    let root = workspace_dir();
    // The business kinds are the vendored module's object type names.
    let manifest = fs::read_to_string(business_module().join("manifest.yaml")).expect("manifest");
    let kinds: Vec<String> = manifest
        .lines()
        .filter_map(|line| line.strip_prefix("- name: "))
        .map(str::to_string)
        .collect();
    assert_eq!(kinds.len(), 11, "{kinds:?}");
    // A kind name that is also a core shape term (`enumeration`,
    // `state_machine`) names the shape, which backends dispatch on.
    let vocabulary = read_json(&root.join("schema/semantic/v1/construct-vocabulary.json"));
    let shapes: Vec<&str> = vocabulary["shapes"]
        .as_array()
        .expect("shapes")
        .iter()
        .filter_map(Value::as_str)
        .collect();
    let names: Vec<String> = kinds
        .into_iter()
        .filter(|kind| !shapes.contains(&kind.as_str()))
        .collect();

    let mut files = Vec::new();
    source_files(
        &root.join("src"),
        &["mjs", "js", "mts", "ts", "json"],
        &mut files,
    );
    for krate in fs::read_dir(root.join("crates")).expect("crates") {
        source_files(
            &krate.expect("crate").path().join("src"),
            &["rs"],
            &mut files,
        );
    }
    source_files(&root.join("python_backend"), &["py", "json"], &mut files);
    assert!(files.len() > 100, "{} source files", files.len());

    // Two source lines name something other than a construct kind: the
    // `event` step kind of the sequence vocabulary, and the `entity` role
    // the 1.x declared-loss rule reads. Each is allowed as that exact line
    // only, so another literal in either file still fails.
    const NOT_A_KIND: [(&str, &str); 2] = [
        (
            "crates/semantic-ir/src/schema.rs",
            r#"const STEP_KINDS: &[&str] = &["command", "event", "decision", "compensation", "wait"];"#,
        ),
        (
            "crates/semantic-ir/src/rules.rs",
            r#".any(|role| role.rsplit(':').next() == Some("entity"));"#,
        ),
    ];
    let hits: Vec<String> = kind_name_literals(&root, &files, &names)
        .into_iter()
        .filter(|hit| {
            !NOT_A_KIND.iter().any(|(file, allowed)| {
                let Some(line) = hit
                    .strip_prefix(&format!("{file}:"))
                    .and_then(|rest| rest.split(':').next())
                    .and_then(|number| number.parse::<usize>().ok())
                else {
                    return false;
                };
                fs::read_to_string(root.join(file))
                    .expect("read")
                    .lines()
                    .nth(line - 1)
                    .is_some_and(|text| text.trim() == *allowed)
            })
        })
        .collect();
    assert_eq!(hits, Vec::<String>::new(), "business kind names in source");

    // The planted control: a backend matching on `entity` fails the gate.
    let dir = tempfile::tempdir().expect("tempdir");
    let planted = dir.path().join("planted.mjs");
    fs::write(&planted, "if (kind.name === \"entity\") render();\n").expect("write");
    assert_eq!(
        kind_name_literals(dir.path(), &[planted], &names),
        ["planted.mjs:1: \"entity\""]
    );
}

#[trace("TC-1794", "FR-143-AC-9")]
#[test]
fn tc_1794_a_construct_requiring_feature_order_refuses_its_artifacts_for_want_of_a_source() {
    let dir = tempfile::tempdir().expect("tempdir");
    let module = dir.path().join("spec-objects-business");
    copy_tree(&business_module(), &module);
    let manifest = module.join("manifest.yaml");
    let text = fs::read_to_string(&manifest).expect("manifest");
    let from = "    members: {fields: required, identityFields: required}\n    rules: [identity_field_required]\n";
    assert_eq!(text.matches(from).count(), 1, "the entity declaration");
    fs::write(
        &manifest,
        text.replace(
            from,
            "    members: {fields: required, identityFields: required, featureOrder: required}\n    rules: [identity_field_required]\n",
        ),
    )
    .expect("write");
    let root = fixture("business");
    let bundle = Bundle::load(&root, &[module.as_path(), edge_vocabulary().as_path()])
        .unwrap_or_else(|r| panic!("the declaration is valid vocabulary: {r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits, "0.0.0");
    // Every entity artifact, and only those, is refused naming the member:
    // `featureOrder` has a per-artifact source table (quire-rs FR-075's
    // `## Features`/`Ubiquitous Language`-style locators), like `part`/
    // `port`, so an entity with no such table for it is refused the same
    // way TC-1801's bare interface is, not the "no source at all" way a
    // member this frontend never lowers would be.
    let rule = "lowers to no `entity` construct: the construct requires featureOrder, and this artifact declares none";
    let entity_refusals: Vec<&str> = refusals(&lowered)
        .iter()
        .map(|d| d.message.as_str())
        .filter(|m| m.contains(rule))
        .collect();
    for id in ["FR-001", "OP-001"] {
        assert!(
            entity_refusals
                .iter()
                .any(|m| m.starts_with(&format!("artifact {id} "))),
            "{id}: {entity_refusals:#?}"
        );
    }
    assert!(refusals(&lowered).iter().all(|d| d.blocking));
    assert!(
        !lowered
            .types
            .iter()
            .any(|t| t.identity == type_ref("FR-001")),
        "no type of the refused entity is emitted"
    );
}
