//! FR-094 "Relationships": frontmatter edges lowered under the vendored
//! business module and the edge-vocabulary registry, over committed
//! fixture bundles. Nothing here reads the environment.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, Severity, WireCode};
use agent_ix_extraction_frontend::{
    extract, frontmatter_edges, is_blocked, lower_bundle, resolve, Bundle, Extractions, Limits,
    Lowered, Resolutions, PART_OF,
};
use common::without;
use ix_trace_rs::trace;
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use serde_json::Value;
use sha2::{Digest, Sha256};

const VERSION: &str = "0.0.0";
/// `fixtures/semantic/v1/positive/config-version-v1-1.json` at the revision
/// this crate was written against (FR-094-CON-4: never edited).
const ISSUE_34_FIXTURE: &str = "fixtures/semantic/v1/positive/config-version-v1-1.json";
const ISSUE_34_SHA256: &str = "7c5cad0bc759755f39334b3adddd71b15ac4a986c7d005d41f4096fed34c18ac";

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

/// A lift under the business module and the edge-vocabulary registry.
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

fn relationships(record: &Value) -> Vec<Value> {
    record["relationships"]
        .as_array()
        .unwrap_or_else(|| panic!("{} carries no relationships[]", record["displayName"]))
        .clone()
}

fn with_verb<'a>(relationships: &'a [Value], verb: &str) -> Vec<&'a Value> {
    relationships.iter().filter(|r| r["verb"] == verb).collect()
}

fn with_code(diagnostics: &[Diagnostic], code: Code) -> Vec<&Diagnostic> {
    diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

fn head(lift: &Lift, path: &str) -> Locus {
    Locus::head(&lift.bundle.package().source_identity(), path)
}

fn copy_tree(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("mkdir");
    for entry in fs::read_dir(from).expect("read_dir") {
        let entry = entry.expect("entry");
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), &target).expect("copy");
        }
    }
}

const FR_006: &str = "spec/functional/FR-006-config-version-entity.md";

#[trace("TC-1231", "FR-094-AC-1")]
#[test]
fn tc_1231_fr_006_references_fr_005_lowers_to_one_traceability_relationship_at_the_frontmatter() {
    let lift = lift("config-version-table");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    let rels = relationships(record);
    assert_eq!(rels.len(), 1, "{rels:?}");
    let rel = &rels[0];
    assert_eq!(rel["verb"], "references");
    assert_eq!(rel["category"], "traceability");
    assert_eq!(rel["composite"], false);
    assert_eq!(
        rel["target"],
        "ix://agent-ix/config-service/type/ConfigOverlay"
    );
    assert_eq!(
        rel["multiplicity"],
        serde_json::json!({ "lower": 1, "upper": 1 })
    );
    assert_eq!(
        rel["origin"],
        serde_json::json!({ "source": serde_json::to_value(head(&lift, FR_006)).expect("locus") })
    );
    assert_eq!(
        rel["identity"],
        "ix://agent-ix/config-service/relationship/configversion-references-configoverlay"
    );
    // The pair reached the frontend as the engine's `harvest_edges` returns
    // it: the target reduced to its last segment.
    let document = lift
        .bundle
        .documents()
        .iter()
        .find(|d| d.path() == FR_006)
        .expect("FR-006");
    assert_eq!(
        frontmatter_edges(document),
        [("FR-005".to_string(), "references".to_string())]
    );
    // The same lift under the business module alone has no registry entry
    // for `references`: an allowed verb no loaded module declares.
    let alone = lift_at(&fixture("config-version-table"), &[&business_module()]);
    let unknown = with_code(&alone.lowered.diagnostics, Code::UnknownEdgeVerb);
    assert_eq!(unknown.len(), 1, "{:?}", alone.lowered.diagnostics);
    assert!(unknown[0].blocking);
}

#[trace("TC-1232", "FR-094-AC-2")]
#[test]
fn tc_1232_contains_and_aggregates_are_composite_structural_and_composes_is_not() {
    let lift = lift("business");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let domain = relationships(type_named(&types, "Ordering"));
    let contains = with_verb(&domain, "contains");
    assert_eq!(contains.len(), 3, "{domain:?}");
    for rel in &contains {
        assert_eq!(rel["category"], "structural", "{rel}");
        assert_eq!(rel["composite"], true, "{rel}");
    }
    let aggregate = relationships(type_named(&types, "OrderAggregate"));
    let aggregates = with_verb(&aggregate, "aggregates");
    assert_eq!(aggregates.len(), 1, "{aggregate:?}");
    assert_eq!(aggregates[0]["category"], "structural");
    assert_eq!(aggregates[0]["composite"], true);
    assert_eq!(aggregates[0]["target"], "ix://agent-ix/orders/type/Order");
    let value_object = relationships(type_named(&types, "OrderLine"));
    let composes = with_verb(&value_object, "composes");
    assert_eq!(composes.len(), 1, "{value_object:?}");
    assert_eq!(composes[0]["category"], "structural");
    assert_eq!(composes[0]["composite"], false);
    // The registry says so: `composes` has `inverse: composed_by`.
    let registry = lift.bundle.registry();
    assert_eq!(
        registry.edge_types()["composes"].inverse.as_deref(),
        Some("composed_by")
    );
    assert_eq!(
        registry.edge_types()["contains"].inverse.as_deref(),
        Some(PART_OF)
    );
    assert_eq!(
        registry.edge_types()["aggregates"].inverse.as_deref(),
        Some(PART_OF)
    );
}

#[trace("TC-1233", "FR-094-AC-3")]
#[test]
fn tc_1233_references_is_traceability_and_owns_is_dependency_neither_composite() {
    let lift = lift("business");
    let types = types_json(&lift);
    let order = relationships(type_named(&types, "Order"));
    let references = with_verb(&order, "references");
    assert_eq!(references.len(), 1, "{order:?}");
    assert_eq!(references[0]["category"], "traceability");
    assert_eq!(references[0]["composite"], false);
    assert_eq!(
        references[0]["target"],
        "ix://agent-ix/orders/type/OrderStatus"
    );
    let owns = with_verb(&order, "owns");
    assert_eq!(owns.len(), 1, "{order:?}");
    assert_eq!(owns[0]["category"], "dependency");
    assert_eq!(owns[0]["composite"], false);
    assert_eq!(
        owns[0]["target"],
        "ix://agent-ix/orders/type/OrderLifecycle"
    );
    assert_eq!(
        owns[0]["identity"],
        "ix://agent-ix/orders/relationship/order-owns-orderlifecycle"
    );
}

#[trace("TC-1234", "FR-094-AC-4")]
#[test]
fn tc_1234_frobnicates_allowed_but_undeclared_raises_unknown_edge_verb_at_the_frontmatter() {
    let lift = lift_at(
        &fixture("negatives/UNKNOWN_EDGE_VERB"),
        &[&fixture("modules/frobnicates")],
    );
    let registry = lift.bundle.registry();
    assert!(registry.edge_types().is_empty(), "no edge_types loaded");
    let entity = lift.bundle.object_type("entity").expect("entity");
    assert!(entity.archetype.allowed_links().contains_key("frobnicates"));
    let unknown = with_code(&lift.lowered.diagnostics, Code::UnknownEdgeVerb);
    assert_eq!(unknown.len(), 1, "{:?}", lift.lowered.diagnostics);
    let diagnostic = unknown[0];
    assert_eq!(diagnostic.locus, Some(head(&lift, FR_006)));
    assert!(diagnostic.blocking);
    assert_eq!(diagnostic.severity, Severity::Error);
    assert!(diagnostic.message.contains("frobnicates"), "{diagnostic}");
    assert!(is_blocked(&lift.lowered.diagnostics));
    // The blocked record reaches no document.
    let types = types_json(&lift);
    assert!(
        types.iter().all(|t| t["displayName"] != "ConfigVersion"),
        "{types:?}"
    );
}

#[trace("TC-1235", "FR-094-AC-5")]
#[test]
fn tc_1235_nonesuch_and_a_legacy_form_target_raise_unresolved_relationship_target_naming_each() {
    let lift = lift("negatives/UNRESOLVED_RELATIONSHIP_TARGET");
    let unresolved = with_code(
        &lift.lowered.diagnostics,
        Code::UnresolvedRelationshipTarget,
    );
    assert_eq!(unresolved.len(), 2, "{:?}", lift.lowered.diagnostics);
    for diagnostic in &unresolved {
        assert_eq!(diagnostic.locus, Some(head(&lift, FR_006)));
        assert!(diagnostic.blocking);
        assert_eq!(diagnostic.severity, Severity::Error);
    }
    assert!(
        unresolved.iter().any(|d| d.message.contains("`Nonesuch`")),
        "{unresolved:?}"
    );
    assert!(
        unresolved.iter().any(|d| d.message.contains("`FR-005`")),
        "{unresolved:?}"
    );
    // FR-005 is legacy-form: not lowered, and only a warning about it.
    let not_lowered = with_code(&lift.lowered.diagnostics, Code::ArtifactNotLowered);
    assert_eq!(not_lowered.len(), 1);
    assert!(!not_lowered[0].blocking);
    assert!(is_blocked(&lift.lowered.diagnostics));
    assert!(types_json(&lift)
        .iter()
        .all(|t| t["displayName"] != "ConfigVersion"));
}

#[trace("TC-1236", "FR-094-AC-6")]
#[trace("TC-1236", "FR-094-CON-1")]
#[test]
fn tc_1236_artifact_axis_verbs_lower_to_nothing_silently_and_one_references_edge_to_one() {
    let lift = lift("edges/artifact-axis");
    assert!(
        lift.lowered.diagnostics.is_empty() && lift.extractions.diagnostics.is_empty(),
        "{:?} {:?}",
        lift.lowered.diagnostics,
        lift.extractions.diagnostics
    );
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    assert_eq!(relationships(record), Vec::<Value>::new());
    // The body's Relationships bullet list names `contains` and
    // `references` edges; none reached the IR.
    let document = lift
        .bundle
        .documents()
        .iter()
        .find(|d| d.path() == FR_006)
        .expect("FR-006");
    assert!(document.raw().contains("contains → ConfigOverlay"));
    assert_eq!(
        frontmatter_edges(document),
        [
            ("FR-005".to_string(), "depends_on".to_string()),
            ("StR-001".to_string(), "implements".to_string()),
            ("US-002".to_string(), "traces_to".to_string()),
        ]
    );

    // The same document with one `references` edge added.
    let scratch = tempfile::tempdir().expect("tempdir");
    copy_tree(&fixture("edges/artifact-axis"), scratch.path());
    let path = scratch.path().join(FR_006);
    let text = fs::read_to_string(&path).expect("FR-006");
    let added = text.replacen(
        "    type: depends_on\n",
        "    type: depends_on\n  - target: FR-005\n    type: references\n",
        1,
    );
    assert_ne!(added, text);
    fs::write(&path, added).expect("write");
    let lift = lift_at(scratch.path(), &[&business_module(), &edge_vocabulary()]);
    assert!(
        lift.lowered.diagnostics.is_empty(),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let rels = relationships(type_named(&types, "ConfigVersion"));
    assert_eq!(rels.len(), 1, "{rels:?}");
    assert_eq!(rels[0]["verb"], "references");
    assert_eq!(
        rels[0]["target"],
        "ix://agent-ix/config-service/type/ConfigOverlay"
    );
}

#[trace("TC-1237", "FR-094-AC-7")]
#[test]
fn tc_1237_same_verb_and_target_dedupe_and_two_verbs_on_one_target_mint_two_identities() {
    let lift = lift("edges/dedupe");
    assert!(
        !is_blocked(&lift.lowered.diagnostics),
        "{:?}",
        lift.lowered.diagnostics
    );
    let types = types_json(&lift);
    let rels = relationships(type_named(&types, "ConfigVersion"));
    assert_eq!(rels.len(), 3, "{rels:?}");
    let to_colour: Vec<&Value> = rels
        .iter()
        .filter(|r| r["target"] == "ix://agent-ix/config-service/type/Colour")
        .collect();
    assert_eq!(to_colour.len(), 1, "two entries, one relationship");
    assert_eq!(to_colour[0]["verb"], "references");
    let to_overlay: Vec<&Value> = rels
        .iter()
        .filter(|r| r["target"] == "ix://agent-ix/config-service/type/ConfigOverlay")
        .collect();
    assert_eq!(to_overlay.len(), 2, "two verbs, two relationships");
    let mut verbs: Vec<&str> = to_overlay
        .iter()
        .map(|r| r["verb"].as_str().expect("verb"))
        .collect();
    verbs.sort_unstable();
    assert_eq!(verbs, ["contains", "references"]);
    assert_ne!(to_overlay[0]["identity"], to_overlay[1]["identity"]);
    let identities: std::collections::BTreeSet<&str> = rels
        .iter()
        .map(|r| r["identity"].as_str().expect("identity"))
        .collect();
    assert_eq!(identities.len(), 3);
}

#[trace("TC-1238", "FR-094-AC-8")]
#[trace("TC-1238", "FR-094-CON-4")]
#[test]
fn tc_1238_parent_is_a_field_not_a_relationship_and_the_issue_34_fixture_is_byte_unchanged() {
    let lift = lift("config-version-table");
    let types = types_json(&lift);
    let record = type_named(&types, "ConfigVersion");
    let parent = record["fields"]
        .as_array()
        .expect("fields")
        .iter()
        .find(|f| f["name"] == "parent")
        .expect("parent is a field");
    assert_eq!(
        parent["typeRef"],
        "ix://agent-ix/config-service/type/ConfigVersion"
    );
    assert_eq!(
        parent["multiplicity"],
        serde_json::json!({ "lower": 0, "upper": 1 })
    );
    let ours = relationships(record);
    assert!(
        ours.iter().all(
            |r| r["target"] != "ix://agent-ix/config-service/type/ConfigVersion"
                && !r["identity"].as_str().expect("identity").contains("parent")
        ),
        "no relationship from the parent row: {ours:?}"
    );

    // The #34 hand fixture: byte-unchanged, and its `relationships[]`
    // differs from ours at the `parent` node — which it lifts as a
    // `derives_from` relationship from the Properties row — and at nothing
    // else that both documents express.
    let path = common::workspace_dir().join(ISSUE_34_FIXTURE);
    let bytes = fs::read(&path).expect("the #34 fixture is committed");
    let digest = format!("{:x}", Sha256::digest(&bytes));
    assert_eq!(digest, ISSUE_34_SHA256, "{} was edited", path.display());
    let hand: Value = serde_json::from_slice(&bytes).expect("JSON");
    let hand_types = hand["types"].as_array().expect("types");
    let hand_record = hand_types
        .iter()
        .find(|t| t["displayName"] == "ConfigVersion")
        .expect("ConfigVersion in the hand fixture");
    let hand_rels = relationships(hand_record);
    let (parent_nodes, other_nodes): (Vec<&Value>, Vec<&Value>) = hand_rels
        .iter()
        .partition(|r| r["target"] == "ix://agent-ix/config-service/type/ConfigVersion");
    assert_eq!(parent_nodes.len(), 1, "{hand_rels:?}");
    assert_eq!(parent_nodes[0]["verb"], "derives_from");
    assert_eq!(
        parent_nodes[0]["origin"]["source"]["startLine"],
        serde_json::json!(17),
        "the hand fixture lifts the parent row"
    );
    // What remains on both sides is one edge to ConfigOverlay.
    assert_eq!(other_nodes.len(), 1);
    assert_eq!(ours.len(), 1);
    assert_eq!(other_nodes[0]["target"], ours[0]["target"]);
    assert_eq!(other_nodes[0]["multiplicity"], ours[0]["multiplicity"]);
    assert_eq!(other_nodes[0]["composite"], ours[0]["composite"]);
}

#[trace("TC-1244", "FR-094-AC-14")]
#[trace("TC-1244", "FR-094-CON-2")]
#[test]
fn tc_1244_renaming_the_target_moves_only_target_and_identity_and_a_registry_inverse_flip_flips_composite(
) {
    let base = lift("business");
    assert!(
        !is_blocked(&base.lowered.diagnostics),
        "{:?}",
        base.lowered.diagnostics
    );
    let base_types = types_json(&base);
    let base_order = relationships(type_named(&base_types, "Order"));
    let base_owns = with_verb(&base_order, "owns")[0].clone();
    assert_eq!(
        base_owns["target"],
        "ix://agent-ix/orders/type/OrderLifecycle"
    );

    // Part one: rename the `owns` target (SM-001, referenced by no Type
    // cell) and lift again.
    let sm_001 = "spec/functional/SM-001-order-lifecycle.md";
    let original = fs::read_to_string(fixture("business").join(sm_001)).expect("SM-001");
    let mut runner = TestRunner::new(Config::with_cases(12));
    runner
        .run(&"Lifecycle[A-Za-z0-9]{1,8}", |name| {
            let scratch = tempfile::tempdir().expect("tempdir");
            copy_tree(&fixture("business"), scratch.path());
            fs::write(
                scratch.path().join(sm_001),
                original.replacen("name: OrderLifecycle\n", &format!("name: {name}\n"), 1),
            )
            .expect("write");
            let renamed = lift_at(scratch.path(), &[&business_module(), &edge_vocabulary()]);
            prop_assert!(
                !is_blocked(&renamed.lowered.diagnostics),
                "{:?}",
                renamed.lowered.diagnostics
            );
            let types = types_json(&renamed);
            let order = relationships(type_named(&types, "Order"));
            prop_assert_eq!(order.len(), base_order.len());
            let owns = with_verb(&order, "owns");
            prop_assert_eq!(owns.len(), 1);
            let owns = owns[0];
            prop_assert_eq!(
                &owns["target"],
                &Value::String(format!("ix://agent-ix/orders/type/{name}"))
            );
            prop_assert_ne!(&owns["identity"], &base_owns["identity"]);
            prop_assert_eq!(
                without(owns, &["target", "identity"]),
                without(&base_owns, &["target", "identity"])
            );
            // Every other relationship of the record is byte-identical.
            for (b, g) in base_order
                .iter()
                .filter(|r| r["verb"] != "owns")
                .zip(order.iter().filter(|r| r["verb"] != "owns"))
            {
                prop_assert_eq!(b, g);
            }
            Ok(())
        })
        .expect("12 renamings move only target and identity");

    // Part two: flip the registry `inverse` and lift again, with no code
    // change: `contains` and `aggregates` lose `part_of`, `composes` gains
    // it.
    let manifest = fs::read_to_string(edge_vocabulary().join("manifest.yaml")).expect("manifest");
    assert_eq!(manifest.matches("inverse: part_of").count(), 2);
    let mut runner = TestRunner::new(Config::with_cases(8));
    runner
        .run(&"x_[a-z]{2,8}", |label| {
            let scratch = tempfile::tempdir().expect("tempdir");
            let module = scratch.path().join("edge-vocabulary");
            copy_tree(&edge_vocabulary(), &module);
            let flipped = manifest
                .replace("inverse: part_of", &format!("inverse: {label}"))
                .replacen("inverse: composed_by", &format!("inverse: {PART_OF}"), 1);
            fs::write(module.join("manifest.yaml"), flipped).expect("write");
            let lift = lift_at(&fixture("business"), &[&business_module(), &module]);
            prop_assert!(
                !is_blocked(&lift.lowered.diagnostics),
                "{:?}",
                lift.lowered.diagnostics
            );
            let types = types_json(&lift);
            for (base_type, flipped_type) in base_types.iter().zip(&types) {
                prop_assert_eq!(&base_type["displayName"], &flipped_type["displayName"]);
                let Some(base_rels) = base_type["relationships"].as_array() else {
                    prop_assert_eq!(base_type, flipped_type);
                    continue;
                };
                let rels = flipped_type["relationships"].as_array().expect("rels");
                prop_assert_eq!(base_rels.len(), rels.len());
                for (b, g) in base_rels.iter().zip(rels) {
                    prop_assert_eq!(without(b, &["composite"]), without(g, &["composite"]));
                    let expected = match b["verb"].as_str().expect("verb") {
                        "contains" | "aggregates" => false,
                        "composes" => true,
                        _ => b["composite"].as_bool().expect("composite"),
                    };
                    prop_assert_eq!(g["composite"].as_bool(), Some(expected), "{}", b);
                }
                prop_assert_eq!(
                    without(base_type, &["relationships"]),
                    without(flipped_type, &["relationships"])
                );
            }
            Ok(())
        })
        .expect("8 inverse flips move only composite");
}
