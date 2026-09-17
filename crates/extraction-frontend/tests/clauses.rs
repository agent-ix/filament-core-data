//! FR-094 "Operations" and "Clauses", and the FR-095 identity patterns over
//! every node the business fixture emits. Nothing here reads the
//! environment.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, WireCode};
use agent_ix_extraction_frontend::{
    extract, is_blocked, lower_bundle, resolve, Bundle, Envelope, Extractions, Limits, Lowered,
    NodeKind, Resolutions,
};
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::{decide, ResultState};
use ix_trace_rs::trace;
use serde_json::{json, Value};

const VERSION: &str = "0.0.0";

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

fn edge_vocabulary() -> PathBuf {
    fixture("modules/edge-vocabulary")
}

fn limits() -> Limits {
    Limits::declared().expect("limits.json parses")
}

struct Lift {
    bundle: Bundle,
    extractions: Extractions,
    #[allow(dead_code)]
    resolutions: Resolutions,
    lowered: Lowered,
}

fn lift_at(root: &Path, modules: &[&Path]) -> Lift {
    let bundle =
        Bundle::load(root, modules).unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let lowered = lower_bundle(&bundle, &extractions, &resolutions, &limits(), VERSION);
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

fn list<'a>(record: &'a Value, key: &str) -> &'a Vec<Value> {
    record[key]
        .as_array()
        .unwrap_or_else(|| panic!("{} carries no {key}[]", record["displayName"]))
}

fn named<'a>(nodes: &'a [Value], key: &str, name: &str) -> &'a Value {
    nodes
        .iter()
        .find(|n| n[key] == name)
        .unwrap_or_else(|| panic!("no node with {key} = {name} in {nodes:?}"))
}

fn with_code(diagnostics: &[Diagnostic], code: Code) -> Vec<&Diagnostic> {
    diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

fn document<'a>(lift: &'a Lift, path: &str) -> &'a agent_ix_extraction_frontend::Document {
    lift.bundle
        .documents()
        .iter()
        .find(|d| d.path() == path)
        .unwrap_or_else(|| panic!("no document at {path}"))
}

/// The 1-based line of the first line of `raw` that starts with `prefix`.
fn line_starting_with(raw: &str, prefix: &str) -> usize {
    raw.split('\n')
        .position(|l| l.starts_with(prefix))
        .map(|i| i + 1)
        .unwrap_or_else(|| panic!("no line starts with {prefix:?}"))
}

fn locus(lift: &Lift, path: &str, line: usize, column: usize) -> Value {
    serde_json::to_value(Locus::new(
        &lift.bundle.package().source_identity(),
        path,
        line,
        column,
    ))
    .expect("locus")
}

/// A full IR document over the lift's types, with the lift's envelope.
fn ir_document(lift: &Lift) -> Value {
    let envelope = Envelope::new(&lift.bundle, &[]);
    let mut doc = serde_json::to_value(&envelope).expect("envelope serialises");
    doc["contractVersion"] = json!("1.2.0");
    doc["types"] = Value::Array(types_json(lift));
    json!({ "ir": doc })
}

const FR_006: &str = "spec/functional/FR-006-config-version-entity.md";
const FR_001: &str = "spec/functional/FR-001-order.md";
const OPERATIONS: &str = "spec/functional/operations.md";

#[trace("TC-1239", "FR-094-AC-9")]
#[test]
fn tc_1239_the_immutable_ocl_fence_lowers_to_one_clause_with_the_engine_span_and_origin_at_its_start(
) {
    let lift = lift("config-version-table");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    let clauses = list(record, "clauses");
    assert_eq!(clauses.len(), 1, "{clauses:?}");
    let clause = &clauses[0];
    assert_eq!(clause["language"], "ocl");
    assert_eq!(clause["clauseId"], "immutable");
    assert_eq!(
        clause["identity"],
        "ix://agent-ix/config-service/clause/FR-006-immutable"
    );
    let extraction = &lift.extractions.artifacts["FR-006"].extraction;
    let text = &extraction.clause_text.as_ref().expect("clause_text")["immutable"];
    assert_eq!(clause["text"].as_str(), Some(text.as_str()));
    assert!(text.starts_with("context ConfigVersion inv immutable:"));
    // The span as the engine reports it: the fence's opening line at
    // column 1 through its closing line.
    let engine = extraction.clauses.as_ref().expect("clauses")[0]
        .source_span
        .as_ref()
        .expect("span");
    let raw = document(&lift, FR_006).raw();
    let open = line_starting_with(raw, "```ocl");
    assert_eq!(engine.start_line, open);
    assert_eq!(engine.start_column, 1);
    assert_eq!(engine.end_line, Some(open + 2));
    assert_eq!(engine.end_column, Some(4));
    assert_eq!(
        clause["sourceSpan"],
        json!({
            "sourceIdentity": engine.source_identity,
            "path": FR_006,
            "startLine": open,
            "startColumn": 1,
            "endLine": open + 2,
            "endColumn": 4,
        })
    );
    assert_eq!(
        clause["origin"],
        json!({ "source": locus(&lift, FR_006, open, 1) })
    );
}

#[trace("TC-1240", "FR-094-AC-10")]
#[trace("TC-1240", "FR-094-CON-3")]
#[test]
fn tc_1240_leading_whitespace_a_tab_and_trailing_newlines_reach_the_ir_byte_identical() {
    let lift = lift("business");
    let types = types_json(&lift);
    let clauses = list(type_named(&types, "Order"), "clauses");
    let capped = named(clauses, "clauseId", "capped");
    let expected = "   context Order inv capped:\n\tself.lines->size() <= 100\n\n";
    assert_eq!(capped["text"].as_str(), Some(expected));
    let engine = &lift.extractions.artifacts["FR-001"]
        .extraction
        .clause_text
        .as_ref()
        .expect("clause_text")["capped"];
    assert_eq!(engine.as_bytes(), expected.as_bytes());
    // And the document really carries those bytes.
    let raw = document(&lift, FR_001).raw();
    // The engine's fence body excludes the final line terminator.
    assert!(raw.contains(&format!("```ocl\n{expected}\n```")), "{raw}");
}

#[trace("TC-1241", "FR-094-AC-11")]
#[test]
fn tc_1241_operations_lower_params_under_param_returns_non_nullable_and_pre_post_id_lists() {
    let lift = lift("business");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let basket = type_named(&types, "Basket");
    let operations = list(basket, "operations");
    assert_eq!(operations.len(), 3, "{operations:?}");
    let raw = document(&lift, OPERATIONS).raw();

    let add_line = named(operations, "name", "addLine");
    assert_eq!(
        add_line["identity"],
        "ix://agent-ix/orders/operation/OP-001-addLine"
    );
    assert_eq!(
        add_line["origin"],
        json!({ "source": locus(&lift, OPERATIONS, line_starting_with(raw, "### addLine"), 1) })
    );
    let params = list(add_line, "params");
    assert_eq!(params.len(), 2);
    assert_eq!(
        params[0]["identity"],
        "ix://agent-ix/orders/field/OP-001-addLine-line"
    );
    assert_eq!(params[0]["name"], "line");
    assert_eq!(params[0]["typeRef"], "ix://agent-ix/orders/type/VO-001");
    assert_eq!(params[0]["presence"], "required");
    assert_eq!(params[0]["nullable"], false);
    assert_eq!(params[0]["defaultKind"], "none");
    assert_eq!(
        params[0]["origin"],
        json!({ "source": locus(&lift, OPERATIONS, line_starting_with(raw, "| line "), 3) })
    );
    assert_eq!(
        params[1]["identity"],
        "ix://agent-ix/orders/field/OP-001-addLine-quantity"
    );
    assert_eq!(params[1]["typeRef"], "ix://agent-ix/orders/type/Integer");
    assert_eq!(
        add_line["returns"],
        json!({
            "typeRef": "ix://agent-ix/orders/type/OP-001",
            "multiplicity": { "lower": 1, "upper": 1 },
            "nullable": false,
        })
    );
    assert_eq!(add_line["pre"], json!(["non_empty"]));
    assert_eq!(add_line["post"], json!(["capped", "non_empty"]));

    let clear = named(operations, "name", "clear");
    assert_eq!(clear["params"], json!([]));
    assert!(clear.get("returns").is_none(), "{clear}");
    assert_eq!(clear["pre"], json!([]));
    assert_eq!(clear["post"], json!(["non_empty"]));

    let total = named(operations, "name", "total");
    assert_eq!(
        total["returns"],
        json!({
            "typeRef": "ix://agent-ix/orders/type/Decimal",
            "multiplicity": { "lower": 1, "upper": 1 },
            "nullable": false,
        })
    );

    // No second clause node for a pre/post reference: the two invariants,
    // once each.
    let clauses = list(basket, "clauses");
    let ids: Vec<&str> = clauses
        .iter()
        .map(|c| c["clauseId"].as_str().expect("clauseId"))
        .collect();
    assert_eq!(ids, ["non_empty", "capped"]);
    // The engine's pre/post refs carry no span; only located refs became
    // clauses.
    let extraction = &lift.extractions.artifacts["OP-001"].extraction;
    let located = extraction
        .clauses
        .as_ref()
        .expect("clauses")
        .iter()
        .filter(|c| c.source_span.is_some())
        .count();
    assert_eq!(located, 2);
    let refs: usize = extraction
        .operations
        .as_ref()
        .expect("operations")
        .iter()
        .map(|o| o.pre.len() + o.post.len())
        .sum();
    assert_eq!(refs, 4, "four references, still two clause nodes");

    // The repository's operations carry a 0..1 return and one param each.
    let repository = type_named(&types, "OrderRepository");
    let find = named(list(repository, "operations"), "name", "findById");
    assert_eq!(
        find["returns"]["multiplicity"],
        json!({ "lower": 0, "upper": 1 })
    );
    assert_eq!(find["returns"]["nullable"], false);
    assert_eq!(
        list(find, "params")[0]["identity"],
        "ix://agent-ix/orders/field/RP-001-findById-id"
    );
}

#[trace("TC-1242", "FR-094-AC-12")]
#[test]
fn tc_1242_an_unresolved_returns_token_raises_unresolved_type_token_at_the_returns_line() {
    let lift = lift("clauses/unresolved-returns");
    let unresolved = with_code(&lift.lowered.diagnostics, Code::UnresolvedTypeToken);
    assert_eq!(unresolved.len(), 1, "{:?}", lift.lowered.diagnostics);
    let raw = document(&lift, FR_006).raw();
    let line = line_starting_with(raw, "Returns:");
    assert_eq!(
        unresolved[0].locus,
        Some(Locus::new(
            &lift.bundle.package().source_identity(),
            FR_006,
            line,
            1
        ))
    );
    assert!(unresolved[0].blocking);
    assert!(unresolved[0].message.contains("`Nonesuch`"));
    assert!(is_blocked(&lift.lowered.diagnostics));
    assert!(types_json(&lift)
        .iter()
        .all(|t| t["displayName"] != "ConfigVersion"));
}

/// `^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$`
/// (`common.schema.json#/$defs/semanticIdentity`).
fn is_semantic_identity(s: &str) -> bool {
    let Some(rest) = s.strip_prefix("ix://") else {
        return false;
    };
    let Some((org, tail)) = rest.split_once('/') else {
        return false;
    };
    let org_ok = org
        .chars()
        .next()
        .is_some_and(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        && org
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "._-".contains(c));
    let tail_ok = tail
        .chars()
        .next()
        .is_some_and(|c| c.is_ascii_alphanumeric())
        && tail
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "._~:/-".contains(c));
    org_ok && tail_ok
}

/// The one FR-095 node kind `identity` matches, if exactly one does: the
/// segment after `ix://<org>/<name>/` and a tail that is a slug
/// (`[A-Za-z0-9]+(-[A-Za-z0-9]+)*`). A `type/` tail is an artifact id, a
/// kernel scalar name, or the alias of a constrained field
/// (`<artifact id><Field>`), all of which are slugs (FR-143).
fn node_kind(identity: &str, package: &str) -> Option<NodeKind> {
    let rest = identity.strip_prefix(&format!("ix://{package}/"))?;
    let (segment, tail) = rest.split_once('/')?;
    let matches: Vec<NodeKind> = NodeKind::ALL
        .into_iter()
        .filter(|kind| kind.segment() == segment)
        .filter(|_| {
            !tail.is_empty()
                && !tail.starts_with('-')
                && !tail.ends_with('-')
                && !tail.contains("--")
                && tail.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        })
        .collect();
    match matches.as_slice() {
        [kind] => Some(*kind),
        _ => None,
    }
}

/// Every node `identity` in `value`, with the JSON pointer it sits at. An
/// `extensions[].identity` names an extension, not a node, and is skipped.
fn identities(value: &Value, at: &str, out: &mut Vec<(String, String)>) {
    match value {
        Value::Object(map) => {
            if let Some(Value::String(identity)) = map.get("identity") {
                out.push((format!("{at}/identity"), identity.clone()));
            }
            for (key, child) in map.iter().filter(|(key, _)| *key != "extensions") {
                identities(child, &format!("{at}/{key}"), out);
            }
        }
        Value::Array(items) => {
            for (i, child) in items.iter().enumerate() {
                identities(child, &format!("{at}/{i}"), out);
            }
        }
        _ => {}
    }
}

#[trace("TC-1243", "FR-094-AC-13")]
#[trace("TC-1251", "FR-095-AC-6")]
#[test]
fn tc_1243_and_tc_1251_every_identity_of_the_business_document_matches_one_fr_095_pattern() {
    let lift = lift("business");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let package = lift.bundle.package().identity();
    let doc = ir_document(&lift);
    let mut found = Vec::new();
    identities(&doc["ir"]["types"], "/ir/types", &mut found);
    let mut kinds: BTreeSet<NodeKind> = BTreeSet::new();
    let mut seen: BTreeSet<&str> = BTreeSet::new();
    for (pointer, identity) in &found {
        assert!(
            is_semantic_identity(identity),
            "{pointer}: {identity} is no semanticIdentity"
        );
        let kind = node_kind(identity, &package)
            .unwrap_or_else(|| panic!("{pointer}: {identity} matches no single FR-095 pattern"));
        // The segment agrees with the node's position.
        let expected = match pointer.rsplit('/').nth(2) {
            Some("types") => NodeKind::Type,
            Some("fields") => NodeKind::Field,
            Some("constraints") => NodeKind::Constraint,
            Some("relationships") => NodeKind::Relationship,
            Some("operations") => NodeKind::Operation,
            Some("params") => NodeKind::Field,
            Some("variants") => NodeKind::Variant,
            Some("clauses") => NodeKind::Clause,
            other => panic!("{pointer}: unexpected node list {other:?}"),
        };
        assert_eq!(kind, expected, "{pointer}: {identity}");
        assert!(seen.insert(identity), "{pointer}: {identity} minted twice");
        kinds.insert(kind);
    }
    assert_eq!(
        kinds.into_iter().collect::<Vec<_>>(),
        NodeKind::ALL,
        "the business fixture exercises every node kind, including parameter fields and variants"
    );
    assert!(found.len() > 60, "{} identities", found.len());
    // Every reference to an identity is a semanticIdentity too.
    let mut refs = Vec::new();
    fn references(value: &Value, at: &str, out: &mut Vec<(String, String)>) {
        match value {
            Value::Object(map) => {
                for key in ["typeRef", "target", "appliesTo"] {
                    if let Some(Value::String(s)) = map.get(key) {
                        out.push((format!("{at}/{key}"), s.clone()));
                    }
                }
                for (key, child) in map {
                    references(child, &format!("{at}/{key}"), out);
                }
            }
            Value::Array(items) => {
                for (i, child) in items.iter().enumerate() {
                    references(child, &format!("{at}/{i}"), out);
                }
            }
            _ => {}
        }
    }
    references(&doc["ir"]["types"], "/ir/types", &mut refs);
    for (pointer, reference) in &refs {
        assert!(
            is_semantic_identity(reference),
            "{pointer}: {reference} is no semanticIdentity"
        );
        assert!(
            seen.contains(reference.as_str()),
            "{pointer}: {reference} names no minted identity"
        );
    }
    // The document is IR the reader accepts as shaped.
    let text = serde_json::to_string(&doc).expect("serialises");
    let verdict = decide(&parse_json(&text).expect("parses"));
    let codes: Vec<String> = verdict
        .diagnostics
        .iter()
        .map(|d| format!("{} at {}: {}", d.code, d.pointer, d.message))
        .collect();
    assert_eq!(verdict.result_state, ResultState::Success, "{codes:?}");
}
