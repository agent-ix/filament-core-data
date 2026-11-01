//! FR-148 "Option value types": the QSpec vectors
//! `proposals/checked-package-v2/model-option-type-vectors.json` (OP-01 to
//! OP-41, QSpec FR-154-AC-39 to AC-41 and FR-322-AC-298) run against the
//! semantic-IR reader the extraction frontend validates every lift with.
//!
//! The vectors are written over QSpec's `domain_package` projection, which is
//! not the Semantic IR: [`ir_of`] translates the (patched) projection into a
//! `2.0.0` IR document, keeping every member the patch wrote verbatim so a
//! malformed `inner` reaches the reader as the vector wrote it. Nothing is
//! copied: the file is read from the QSpec repository at a git ref
//! (`QSPEC_REPO`, default the `quire-specification` sibling of the main clone;
//! `QSPEC_OPTION_VECTORS_REF`, default the merging commit `fa6be9cd`).
//! Each vector's `expected` code (`invalid_model_binding`/
//! `malformed-declaration`, `missing_declaration`/`missing-name`) is QSpec's
//! intake code; FCD's typed code and pointer for it are in [`fcd_expected`].

use std::path::PathBuf;
use std::process::Command;

use agent_ix_extraction_frontend::canonical::bundle_of;
use agent_ix_extraction_frontend::constructs::ConstructMembers;
use agent_ix_extraction_frontend::diagnostics::Locus;
use agent_ix_extraction_frontend::lower::{Kind, Origin, TypeDefinition, UnknownPolicy};
use agent_ix_extraction_frontend::validate_document;
use agent_ix_semantic_ir::decide;
use agent_ix_semantic_ir::json::parse;
use agent_ix_semantic_ir::rules::{Document, OptionSpelling};
use ix_trace_rs::trace;
use serde_json::{json, Map, Value};

const VECTORS: &str = "proposals/checked-package-v2/model-option-type-vectors.json";
const DEFAULT_REF: &str = "fa6be9cd";

fn vectors() -> Value {
    let repo = std::env::var("QSPEC_REPO")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            // The sibling checkout of the main FCD clone, found through the git
            // common directory so a linked worktree resolves the same repository.
            let common = Command::new("git")
                .args(["rev-parse", "--path-format=absolute", "--git-common-dir"])
                .current_dir(env!("CARGO_MANIFEST_DIR"))
                .output()
                .expect("git is runnable");
            let common = String::from_utf8(common.stdout).expect("utf8");
            PathBuf::from(common.trim()).join("../../quire-specification")
        });
    let reference =
        std::env::var("QSPEC_OPTION_VECTORS_REF").unwrap_or_else(|_| DEFAULT_REF.into());
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo)
        .arg("show")
        .arg(format!("{reference}:{VECTORS}"))
        .output()
        .expect("git is runnable");
    assert!(
        output.status.success(),
        "the QSpec vectors {reference}:{VECTORS} are unreadable in {} (set QSPEC_REPO): {}",
        repo.display(),
        String::from_utf8_lossy(&output.stderr)
    );
    let vectors: Value = serde_json::from_slice(&output.stdout).expect("the vectors are JSON");
    assert_eq!(vectors["version"], "quire.model-option-type-vectors/v1");
    vectors
}

// ---------------------------------------------------------------------------
// RFC 6902 over the projection
// ---------------------------------------------------------------------------

fn tokens(pointer: &str) -> Vec<String> {
    pointer
        .split('/')
        .skip(1)
        .map(|token| token.replace("~1", "/").replace("~0", "~"))
        .collect()
}

fn patch(document: &mut Value, operations: &[Value]) {
    for operation in operations {
        let op = operation["op"].as_str().expect("op");
        let path = tokens(operation["path"].as_str().expect("path"));
        let (last, parents) = path.split_last().expect("a non-root path");
        let mut node = &mut *document;
        for token in parents {
            node = match node {
                Value::Array(items) => &mut items[token.parse::<usize>().expect("index")],
                other => other.get_mut(token.as_str()).expect("a parent member"),
            };
        }
        let value = operation.get("value").cloned();
        match (op, node) {
            ("add", Value::Array(items)) => {
                let value = value.expect("value");
                if last == "-" {
                    items.push(value);
                } else {
                    items.insert(last.parse().expect("index"), value);
                }
            }
            ("add" | "replace", Value::Object(members)) => {
                members.insert(last.clone(), value.expect("value"));
            }
            ("replace", Value::Array(items)) => {
                items[last.parse::<usize>().expect("index")] = value.expect("value");
            }
            ("remove", Value::Object(members)) => {
                members.remove(last.as_str()).expect("a member to remove");
            }
            (other, _) => panic!("unsupported patch operation {other}"),
        }
    }
}

// ---------------------------------------------------------------------------
// The projection -> Semantic IR translation
// ---------------------------------------------------------------------------

const SOURCE: &str = "ix://acme/optionals/source";
const MODEL: &str = "agent-ix/quire-model";

fn origin() -> Value {
    json!({"generated": {
        "generatorIdentity": "ix://acme/optionals/vector-author",
        "generatorVersion": "1.0.0",
        "inputIdentities": [SOURCE]
    }})
}

fn leaf(identity: &str) -> &str {
    identity.rsplit('/').next().unwrap_or(identity)
}

/// The members of a projection entry other than the named ones, kept as the
/// vector wrote them.
fn carried(entry: &Value, translated: &[&str]) -> Map<String, Value> {
    entry
        .as_object()
        .map(|members| {
            members
                .iter()
                .filter(|(name, _)| !translated.contains(&name.as_str()) && *name != "node")
                .map(|(name, value)| (name.clone(), value.clone()))
                .collect()
        })
        .unwrap_or_default()
}

fn multiplicity(source: &Value) -> Value {
    let count = |name: &str| -> Value {
        source[name]
            .as_str()
            .and_then(|text| text.parse::<u64>().ok())
            .map_or(Value::Null, Value::from)
    };
    json!({
        "lower": count("lower"),
        "upper": count("upper"),
        "ordered": source["ordered"],
        "unique": source["unique"]
    })
}

fn field(owner: &str, source: &Value) -> Value {
    let name = source["name"].as_str().expect("a field name");
    json!({
        "identity": format!("{owner}/{name}"),
        "name": name,
        "typeRef": source["typeRef"],
        "presence": source["presence"],
        "nullable": false,
        "defaultKind": "none",
        "multiplicity": multiplicity(&source["multiplicity"]),
        "origin": origin()
    })
}

fn operation(owner: &str, source: &Value) -> Value {
    let name = source["name"].as_str().expect("an operation name");
    let identity = format!("{owner}/{name}");
    let params: Vec<Value> = source["params"]
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or_default()
        .iter()
        .map(|param| {
            let param_name = param["name"].as_str().expect("a parameter name");
            json!({
                "identity": format!("{identity}/{param_name}"),
                "name": param_name,
                "typeRef": param["typeRef"],
                "presence": "required",
                "nullable": false,
                "defaultKind": "none",
                "multiplicity": {"lower": 1, "upper": 1, "ordered": false, "unique": true},
                "origin": origin()
            })
        })
        .collect();
    let mut out = json!({
        "identity": identity, "name": name, "params": params,
        "pre": [], "post": [], "origin": origin()
    });
    if let Some(returns) = source["returns"].as_object() {
        out["returns"] = json!({
            "typeRef": returns["typeRef"],
            "multiplicity": {"lower": 1, "upper": 1, "ordered": false, "unique": true},
            "nullable": false
        });
    }
    out
}

fn constraint(source: &Value) -> Value {
    json!({
        "identity": source["identity"],
        "keyword": source["keyword"],
        "operands": source["operands"],
        "appliesTo": source["appliesTo"],
        "diagnosticCode": "agent-ix.semantic-ir.INVALID_OPERAND",
        "origin": origin()
    })
}

fn type_definition(node: &str, kind: Value, extra: Value) -> Value {
    let mut definition = json!({
        "identity": node, "displayName": leaf(node), "kind": kind, "roles": [],
        "origin": origin(), "constraints": [], "extensions": [], "unknownPolicy": "reject"
    });
    for (name, value) in extra.as_object().expect("members").iter() {
        definition[name] = value.clone();
    }
    definition
}

/// Where a projection collection's entries sit among the IR `types`.
const ORDER: [&str; 10] = [
    "record_types",
    "option_types",
    "aliases",
    "sequence_types",
    "map_types",
    "tuple_types",
    "variant_types",
    "reference_types",
    "namespaces",
    "object_types",
];

fn position_of(projection: &Value, collection: &str, entry: usize) -> usize {
    let before: usize = ORDER
        .iter()
        .take_while(|name| **name != collection)
        .map(|name| projection[name].as_array().map_or(0, Vec::len))
        .sum();
    before + entry
}

fn ir_of(projection: &Value) -> Value {
    let mut types: Vec<Value> = Vec::new();
    let mut constructs: Vec<Value> = Vec::new();
    let entries = |collection: &str| -> Vec<Value> {
        projection[collection]
            .as_array()
            .cloned()
            .unwrap_or_default()
    };
    for entry in entries("record_types") {
        let node = entry["node"].as_str().expect("node");
        let fields: Vec<Value> = entry["fields"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or_default()
            .iter()
            .map(|source| field(node, source))
            .collect();
        types.push(type_definition(
            node,
            json!("record"),
            json!({"fields": fields}),
        ));
    }
    for entry in entries("option_types") {
        let node = entry["node"].as_str().expect("node");
        let mut extra = Map::new();
        if let Some(inner) = entry.get("inner") {
            extra.insert("inner".into(), inner.clone());
        }
        for (name, value) in carried(&entry, &["inner"]) {
            let translated = match name.as_str() {
                "fields" => Value::Array(
                    value
                        .as_array()
                        .into_iter()
                        .flatten()
                        .map(|f| field(node, f))
                        .collect(),
                ),
                "operations" => Value::Array(
                    value
                        .as_array()
                        .into_iter()
                        .flatten()
                        .map(|o| operation(node, o))
                        .collect(),
                ),
                "constraints" => Value::Array(
                    value
                        .as_array()
                        .into_iter()
                        .flatten()
                        .map(constraint)
                        .collect(),
                ),
                "positions" => Value::Array(
                    value
                        .as_array()
                        .into_iter()
                        .flatten()
                        .map(|position| {
                            json!({
                                "identity": format!("{node}/p{}", position["ordinal"]),
                                "typeRef": position["typeRef"],
                                "origin": origin()
                            })
                        })
                        .collect(),
                ),
                _ => value,
            };
            extra.insert(name, translated);
        }
        types.push(type_definition(node, json!("option"), Value::Object(extra)));
    }
    for entry in entries("aliases") {
        let node = entry["node"].as_str().expect("node");
        types.push(type_definition(
            node,
            json!("alias"),
            json!({"target": entry["target"]}),
        ));
    }
    for entry in entries("sequence_types") {
        let node = entry["node"].as_str().expect("node");
        types.push(type_definition(
            node,
            json!("sequence"),
            json!({"items": entry["items"]}),
        ));
    }
    for entry in entries("map_types") {
        let node = entry["node"].as_str().expect("node");
        types.push(type_definition(
            node,
            json!("map"),
            json!({"values": entry["values"]}),
        ));
    }
    let tuple_kind = json!({"module": MODEL, "name": "tuple_value_type"});
    for entry in entries("tuple_types") {
        let node = entry["node"].as_str().expect("node");
        let positions: Vec<Value> = entry["positions"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|position| {
                json!({
                    "identity": format!("{node}/p{}", position["ordinal"]),
                    "typeRef": position["typeRef"],
                    "origin": origin()
                })
            })
            .collect();
        types.push(type_definition(
            node,
            tuple_kind.clone(),
            json!({"positions": positions}),
        ));
    }
    if !entries("tuple_types").is_empty() {
        constructs.push(json!({
            "kind": tuple_kind, "moduleVersion": "1.0.0",
            "construct": {
                "identity": "none", "shape": "tuple",
                "members": {"positions": "required", "fields": "forbidden", "operations": "forbidden"},
                "references": {}, "rules": [],
                "meaning": "quire.meaning.model.tuple-value-type/v1"
            }
        }));
    }
    for entry in entries("variant_types") {
        let node = entry["node"].as_str().expect("node");
        let variants: Vec<Value> = entry["cases"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|case| {
                let name = case["name"].as_str().expect("a case name");
                let mut variant = json!({
                    "identity": format!("{node}/{name}"), "name": name, "origin": origin()
                });
                if let Some(payload) = case.get("payloadType") {
                    variant["payloadType"] = payload.clone();
                }
                variant
            })
            .collect();
        types.push(type_definition(
            node,
            json!("union"),
            json!({"variants": variants}),
        ));
    }
    for entry in entries("reference_types") {
        let node = entry["node"].as_str().expect("node");
        types.push(type_definition(
            node,
            json!("reference"),
            json!({"target": entry["target"]}),
        ));
    }
    let namespace_kind = json!({"module": MODEL, "name": "namespace"});
    for entry in entries("namespaces") {
        let node = entry["node"].as_str().expect("node");
        types.push(type_definition(node, namespace_kind.clone(), json!({})));
    }
    if !entries("namespaces").is_empty() {
        constructs.push(json!({
            "kind": namespace_kind, "moduleVersion": "1.0.0",
            "construct": {
                "identity": "none", "shape": "namespace",
                "members": {"members": "optional"},
                "references": {}, "rules": [],
                "meaning": "quire.meaning.model.namespace/v1"
            }
        }));
    }
    for entry in entries("object_types") {
        let node = entry["node"].as_str().expect("node");
        let fields: Vec<Value> = entry["fields"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|source| field(node, source))
            .collect();
        let operations: Vec<Value> = entry["operations"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|source| operation(node, source))
            .collect();
        types.push(type_definition(
            node,
            json!("record"),
            json!({"fields": fields, "operations": operations}),
        ));
    }
    // A top-level constraint rides on the record `Rec`, the host of any
    // constraint whose subject is not its own type: the IR keeps a constraint
    // on the type that declares it, with `appliesTo` naming its subject.
    let top: Vec<Value> = entries("constraints").iter().map(constraint).collect();
    if !top.is_empty() {
        let host = position_of(projection, "record_types", 0);
        types[host]["constraints"] = Value::Array(top);
    }
    json!({
        "contractVersion": "2.0.0",
        "canonicalization": {"algorithm": "rfc8785-v1"},
        "source": {"identity": SOURCE, "version": "1", "dialect": "spec-bundle"},
        "package": {
            "identity": projection["identity"], "version": "1",
            "mappingVersions": ["1.0.0"], "profileVersions": []
        },
        "constructs": constructs,
        "types": types,
        "occurrences": [],
        "extensions": []
    })
}

fn observed(ir: &Value) -> Vec<(String, String)> {
    decide(&bundle_of(ir))
        .diagnostics
        .into_iter()
        .map(|d| (d.code.to_owned(), d.pointer))
        .collect()
}

// ---------------------------------------------------------------------------
// FCD's typed answer to each vector
// ---------------------------------------------------------------------------

const SCHEMA: &str = "agent-ix.semantic-ir.SCHEMA_VIOLATION";
const INNER: &str = "agent-ix.semantic-ir.INVALID_OPTION_INNER";
const UNRESOLVED_INNER: &str = "agent-ix.semantic-ir.UNRESOLVED_OPTION_INNER";
const PRESENCE: &str = "agent-ix.semantic-ir.INVALID_OPTION_PRESENCE";
const UNRESOLVED_TYPE: &str = "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF";
const NOT_APPLICABLE: &str = "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE";

/// The IR pointer of a projection pointer, over the patched projection.
fn ir_pointer(projection: &Value, at: &str) -> String {
    let path = tokens(at);
    let collection = path[0].as_str();
    let entry: usize = path.get(1).and_then(|t| t.parse().ok()).unwrap_or(0);
    if collection == "constraints" {
        // The reader reports a constraint at the constraint object, on the host.
        let host = position_of(projection, "record_types", 0);
        return format!("/ir/types/{host}/constraints/{entry}");
    }
    let position = position_of(projection, collection, entry);
    let rest: Vec<&str> = path.iter().skip(2).map(String::as_str).collect();
    let tail = match rest.as_slice() {
        [] => String::new(),
        parts => format!("/{}", parts.join("/")),
    };
    format!("/ir/types/{position}{tail}")
}

/// FCD's `(code, pointer)` for the refusal a vector expects at `at`. Every
/// vector names one refusal at one place; FCD's codes are its own, typed per
/// cause, and its pointers are the same place in the IR except where the IR
/// has no member to point at (an absent `inner` is reported at the type).
fn fcd_expected(name: &str, projection: &Value, at: &str) -> (&'static str, String) {
    let pointer = ir_pointer(projection, at);
    let owner = pointer
        .rsplit_once('/')
        .map_or(pointer.clone(), |(owner, _)| owner.to_owned());
    match name {
        // Option of option (direct, via alias, self), Clock and an alias of
        // it, a namespace, a native name outside the library.
        "OP-11" | "OP-12" | "OP-13" | "OP-14" | "OP-15" | "OP-16" | "OP-33" => (INNER, pointer),
        "OP-17" => (UNRESOLVED_INNER, pointer),
        "OP-18" | "OP-19" | "OP-41" => (PRESENCE, pointer),
        // A reference to an option; `ix://quire/native/Option*` field types.
        "OP-21" | "OP-22" | "OP-24" => (UNRESOLVED_TYPE, pointer),
        // `Option<Integer>` is no type identity at all: the schema's.
        "OP-23" => (SCHEMA, pointer),
        // An absent inner is a missing required member of the type.
        "OP-25" => (SCHEMA, owner),
        "OP-26" | "OP-27" | "OP-28" | "OP-29" | "OP-30" | "OP-31" | "OP-32" | "OP-34" | "OP-35"
        | "OP-36" | "OP-37" | "OP-38" | "OP-39" => (SCHEMA, pointer),
        "OP-40" => (NOT_APPLICABLE, pointer),
        other => panic!("{other} is not a refusal vector"),
    }
}

fn intake_cases() -> (Value, Vec<Value>) {
    let vectors = vectors();
    let cases = vectors["intake_cases"]
        .as_array()
        .expect("intake_cases")
        .clone();
    (vectors["domain_package"].clone(), cases)
}

/// OP-09 to OP-41: every intake vector, admitted or refused as the file says,
/// with FCD's typed code at the corresponding place. One test per criterion
/// below slices this run; this one asserts the whole file is covered.
fn run_intake(criterion: &str) -> usize {
    let (domain, cases) = intake_cases();
    let mut ran = 0;
    for case in cases.iter().filter(|case| case["criterion"] == criterion) {
        let name = case["name"].as_str().expect("name");
        let mut projection = domain.clone();
        patch(&mut projection, case["patch"].as_array().expect("patch"));
        let ir = ir_of(&projection);
        let found = observed(&ir);
        match case["expected"].get("refused") {
            None => {
                assert!(
                    case["expected"]["admitted"].as_bool().unwrap_or(false),
                    "{name}"
                );
                assert_eq!(found, Vec::<(String, String)>::new(), "{name} is admitted");
                assert!(
                    validate_document(&ir_sorted(&ir)).is_empty(),
                    "{name}: the extraction frontend's lift gate admits it"
                );
            }
            Some(refused) => {
                let (code, pointer) =
                    fcd_expected(name, &projection, refused["at"].as_str().expect("at"));
                assert_eq!(
                    found,
                    vec![(code.to_owned(), pointer.clone())],
                    "{name}: one refusal, {code} at {pointer} ({refused})"
                );
                assert!(
                    !validate_document(&ir_sorted(&ir)).is_empty(),
                    "{name}: the extraction frontend's lift gate refuses it"
                );
            }
        }
        ran += 1;
    }
    ran
}

/// The document as authored: the reader decides it in authored order, so a
/// refusal's pointer is the position the translation wrote.
fn ir_sorted(ir: &Value) -> Value {
    ir.clone()
}

#[test]
#[trace("TC-1887", "FR-148-AC-1")]
fn tc_1887_the_admitted_option_documents_are_accepted() {
    // OP-09 (the base document), OP-10 (sequence, map, tuple, variant),
    // OP-20 (optional presence on a collection of options).
    let (domain, cases) = intake_cases();
    let admitted: Vec<&str> = cases
        .iter()
        .filter(|case| case["expected"]["admitted"] == true)
        .map(|case| case["name"].as_str().unwrap())
        .collect();
    assert_eq!(admitted, ["OP-09", "OP-10", "OP-20"]);
    assert_eq!(run_intake("FR-154-AC-39"), 2);
    let ir = ir_of(&domain);
    assert_eq!(observed(&ir), Vec::<(String, String)>::new());
    // The five collection position kinds of OP-10 carry the option type.
    let (_, ten) = (0, cases.iter().find(|c| c["name"] == "OP-10").unwrap());
    let mut projection = domain.clone();
    patch(&mut projection, ten["patch"].as_array().unwrap());
    let ir = ir_of(&projection);
    let types = ir["types"].as_array().unwrap();
    let by = |identity: &str| types.iter().find(|t| t["identity"] == identity).unwrap();
    assert_eq!(
        by("ix://acme/optionals/SO")["items"],
        "ix://acme/optionals/OptInt"
    );
    assert_eq!(
        by("ix://acme/optionals/MO")["values"],
        "ix://acme/optionals/OptInt"
    );
    assert_eq!(
        by("ix://acme/optionals/TO")["positions"][0]["typeRef"],
        "ix://acme/optionals/OptInt"
    );
    assert_eq!(
        by("ix://acme/optionals/VO")["variants"][0]["payloadType"],
        "ix://acme/optionals/OptInt"
    );
}

#[test]
#[trace("TC-1888", "FR-148-AC-2")]
fn tc_1888_the_inner_shape_and_foreign_members_are_refused() {
    // Every AC-41 row: OP-17, OP-25 to OP-40 (OP-17 and OP-33 are the typed
    // inner refusals of TC-1889, OP-39 and OP-40 of TC-1891).
    assert_eq!(run_intake("FR-154-AC-41"), 17);
}

#[test]
#[trace("TC-1889", "FR-148-AC-3")]
fn tc_1889_nesting_clock_and_unresolved_inner_are_typed() {
    // Every AC-40 row: OP-11 to OP-16 are the typed inner refusals; OP-18
    // to OP-24 and OP-41 are the presence, reference and native-name rows.
    assert_eq!(run_intake("FR-154-AC-40"), 14);
}

#[test]
#[trace("TC-1890", "FR-148-AC-4")]
fn tc_1890_presence_optional_on_an_option_field_is_refused() {
    let (domain, cases) = intake_cases();
    for name in ["OP-18", "OP-19", "OP-41"] {
        let case = cases.iter().find(|case| case["name"] == name).unwrap();
        let mut projection = domain.clone();
        patch(&mut projection, case["patch"].as_array().unwrap());
        let at = case["expected"]["refused"]["at"].as_str().unwrap();
        let (code, pointer) = fcd_expected(name, &projection, at);
        assert_eq!(code, PRESENCE);
        assert_eq!(
            observed(&ir_of(&projection)),
            vec![(code.to_owned(), pointer)],
            "{name}"
        );
    }
}

#[test]
#[trace("TC-1891", "FR-148-AC-5")]
fn tc_1891_references_native_option_names_and_constraints_are_refused() {
    // OP-21 to OP-24 and OP-39, OP-40.
    let (domain, cases) = intake_cases();
    for name in ["OP-21", "OP-22", "OP-23", "OP-24", "OP-39", "OP-40"] {
        let case = cases.iter().find(|case| case["name"] == name).unwrap();
        let mut projection = domain.clone();
        patch(&mut projection, case["patch"].as_array().unwrap());
        let at = case["expected"]["refused"]["at"].as_str().unwrap();
        let (code, pointer) = fcd_expected(name, &projection, at);
        assert_eq!(
            observed(&ir_of(&projection)),
            vec![(code.to_owned(), pointer)],
            "{name}"
        );
    }
}

#[test]
#[trace("TC-1892", "FR-148-AC-6")]
fn tc_1892_the_two_spellings_are_one_option_and_every_type_reads_back() {
    // OP-01 to OP-08, read through the accessors the reader exposes.
    let vectors = vectors();
    let ir = ir_sorted(&ir_of(&vectors["domain_package"]));
    let bundle = parse(&serde_json::to_string(&json!({ "ir": ir })).unwrap()).unwrap();
    let document = Document::read(&bundle).expect("an IR document");
    let holder = document
        .type_of("ix://acme/optionals/Holder")
        .expect("Holder");
    let field_of = |name: &str| {
        holder
            .get("fields")
            .and_then(|fields| fields.as_array())
            .unwrap()
            .iter()
            .find(|field| field.get("name").and_then(|n| n.as_str()) == Some(name))
            .unwrap()
    };
    let text = |node: &agent_ix_semantic_ir::json::Json, member: &str| -> String {
        node.get(member)
            .and_then(|v| v.as_str())
            .unwrap()
            .to_owned()
    };
    let number = |node: &agent_ix_semantic_ir::json::Json, member: &str| -> i64 {
        node.get(member).and_then(|v| v.as_i64()).unwrap()
    };

    // The type of a member as the vectors write it.
    let leaf_of = |type_ref: &str| -> Value {
        if let Some(name) = type_ref.strip_prefix("ix://quire/native/") {
            json!({"type": name})
        } else if let Some(unit) = type_ref.strip_prefix("ix://quire/unit/") {
            json!({"type": format!("Quantity<{unit}>")})
        } else {
            json!({"declaration": leaf(type_ref)})
        }
    };
    let describe = |type_ref: &str, presence: &str, lower: i64, upper: i64| -> Value {
        let element = match document.option_inner(type_ref) {
            Some(inner) => json!({"option": leaf_of(inner)}),
            None => leaf_of(type_ref),
        };
        let collection = !(lower == 1 && upper == 1);
        let optional = presence == "optional" && element.get("option").is_none();
        match (collection, optional) {
            (false, false) => element,
            (false, true) => json!({"option": element}),
            (true, false) => {
                json!({"sequence": element, "min": lower.to_string(), "max": upper.to_string()})
            }
            (true, true) => json!({"option": {"sequence": element,
                "min": lower.to_string(), "max": upper.to_string()}}),
        }
    };
    for case in vectors["field_type_cases"].as_array().unwrap() {
        let name = case["name"].as_str().unwrap();
        if let Some(field_name) = case["field"].as_str() {
            let member = field_of(field_name);
            let multiplicity = member.get("multiplicity").unwrap();
            let got = describe(
                &text(member, "typeRef"),
                &text(member, "presence"),
                number(multiplicity, "lower"),
                number(multiplicity, "upper"),
            );
            assert_eq!(got, case["expected"], "{name}");
            // The two spellings of Option<T> at [1, 1] name the same T.
            if let Some(other) = case["same_node_as"].as_str() {
                let mine = document.member_option(member).expect(name);
                let theirs = document.member_option(field_of(other)).expect(name);
                assert_eq!(mine.inner, theirs.inner, "{name}: one Option<Integer>");
                assert_ne!(mine.spelling, theirs.spelling, "{name}: two spellings");
            }
        } else {
            let operation = holder
                .get("operations")
                .and_then(|o| o.as_array())
                .unwrap()
                .iter()
                .find(|o| o.get("name").and_then(|n| n.as_str()) == Some("op"))
                .unwrap();
            let param = operation.get("params").and_then(|p| p.at(0)).unwrap();
            let returns = operation.get("returns").unwrap();
            assert_eq!(
                json!({
                    "parameters": [describe(&text(param, "typeRef"), "required", 1, 1)],
                    "result": describe(&text(returns, "typeRef"), "required", 1, 1)
                }),
                case["expected"],
                "{name}"
            );
        }
    }
    // A collection member is not a cardinality-one option; its option wraps
    // or is wrapped by the collection.
    assert!(document.member_option(field_of("d")).is_none());
    assert!(document.member_option(field_of("e")).is_none());
    let alias_option = document.member_option(field_of("g")).expect("g");
    assert_eq!(
        (alias_option.inner, alias_option.spelling),
        ("ix://quire/native/Integer", OptionSpelling::Type)
    );
}

#[test]
#[trace("TC-1893", "FR-148-AC-1")]
fn tc_1893_the_kind_enumeration_names_option_in_every_surface() {
    // Dropping `option` from the closed kind enumeration fails here: the
    // schema's kind enum, the frontend's kind and the reader each name it.
    let schema: Value = serde_json::from_str(include_str!(
        "../../../schema/semantic/v1/semantic-ir.schema.json"
    ))
    .unwrap();
    let kinds = &schema["$defs"]["typeDefinition"]["properties"]["kind"]["anyOf"][0]["enum"];
    let kinds: Vec<&str> = kinds
        .as_array()
        .unwrap()
        .iter()
        .map(|k| k.as_str().unwrap())
        .collect();
    assert_eq!(
        kinds,
        [
            "scalar",
            "record",
            "enum",
            "union",
            "alias",
            "sequence",
            "map",
            "reference",
            "option"
        ]
    );
    assert!(schema["$defs"]["typeDefinition"]["properties"]["inner"].is_object());
    assert_eq!(serde_json::to_value(Kind::Option).unwrap(), "option");

    // The reader accepts the option document and refuses a kind outside the
    // enumeration at the same definition.
    let mut ir = ir_of(&vectors()["domain_package"]);
    assert_eq!(observed(&ir), Vec::<(String, String)>::new());
    let option_at = ir["types"]
        .as_array()
        .unwrap()
        .iter()
        .position(|t| t["kind"] == "option")
        .unwrap();
    ir["types"][option_at]["kind"] = json!("optional");
    assert!(
        !observed(&ir).is_empty(),
        "a kind outside the enumeration is refused"
    );
}

#[test]
#[trace("TC-1894", "FR-148-AC-7")]
fn tc_1894_the_frontend_definition_serializes_the_option_kind_and_exposes_the_inner() {
    let definition = TypeDefinition {
        identity: "ix://acme/optionals/OptInt".into(),
        display_name: "OptInt".into(),
        kind: Kind::Option,
        roles: vec![],
        origin: Origin::Source(Locus::new(SOURCE, "OptInt.md", 1, 1)),
        constraints: vec![],
        extensions: vec![],
        unknown_policy: UnknownPolicy::Reject,
        scalar: None,
        decimal: None,
        target: None,
        inner: Some("ix://quire/native/Integer".into()),
        fields: None,
        variants: None,
        positions: None,
        relationships: None,
        operations: None,
        clauses: None,
        construct: ConstructMembers::default(),
    };
    assert_eq!(definition.option_inner(), Some("ix://quire/native/Integer"));
    let value = serde_json::to_value(&definition).unwrap();
    assert_eq!(value["kind"], "option");
    assert_eq!(value["inner"], "ix://quire/native/Integer");
    let record = TypeDefinition {
        kind: Kind::Record,
        inner: None,
        ..definition
    };
    assert_eq!(record.option_inner(), None);
    assert!(serde_json::to_value(&record)
        .unwrap()
        .get("inner")
        .is_none());
}
