//! FR-095 "Node identities": a clause, a state, a transition and a step nest
//! under the type that declares them, `<owner identity>/<member name>`, over
//! the business fixture and edited copies of it. Nothing here reads the
//! environment.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, WireCode};
use agent_ix_extraction_frontend::{
    extract, is_blocked, lower_bundle, resolve, Bundle, Limits, Lowered,
};
use ix_trace_rs::trace;
use serde_json::Value;

const PACKAGE: &str = "ix://agent-ix/orders";
const SM_001: &str = "spec/functional/SM_001-order-lifecycle.md";
const PR_001: &str = "spec/functional/PR_001-fulfilment.md";

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures")
        .join(name)
}

fn lift_at(root: &Path) -> Lowered {
    let modules = [
        fixture("modules/fixture-domain"),
        fixture("modules/fixture-edges"),
    ];
    let modules: Vec<&Path> = modules.iter().map(PathBuf::as_path).collect();
    let bundle = Bundle::load(root, &modules).expect("bundle loads");
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let limits = Limits::declared().expect("limits.json parses");
    lower_bundle(&bundle, &extractions, &resolutions, &limits)
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

/// The business fixture with `edit` applied to the document at `path`.
fn lift_edited(path: &str, edit: impl FnOnce(String) -> String) -> Lowered {
    let scratch = tempfile::tempdir().expect("tempdir");
    copy_tree(&fixture("business"), scratch.path());
    let file = scratch.path().join(path);
    let text = fs::read_to_string(&file).expect("document");
    fs::write(&file, edit(text)).expect("write");
    lift_at(scratch.path())
}

fn types_json(lowered: &Lowered) -> Vec<Value> {
    lowered
        .types
        .iter()
        .map(|t| serde_json::to_value(t).expect("serialises"))
        .collect()
}

fn type_with_identity<'a>(types: &'a [Value], identity: &str) -> &'a Value {
    types
        .iter()
        .find(|t| t["identity"] == identity)
        .unwrap_or_else(|| panic!("no definition {identity}"))
}

fn identities(nodes: &Value) -> Vec<String> {
    nodes
        .as_array()
        .unwrap_or_else(|| panic!("{nodes} is no list"))
        .iter()
        .map(|node| node["identity"].as_str().expect("identity").to_string())
        .collect()
}

fn with_code(lowered: &Lowered, code: Code) -> Vec<&Diagnostic> {
    lowered
        .diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

fn is_member_name(name: &str) -> bool {
    let mut chars = name.chars();
    chars.next().is_some_and(|c| c.is_ascii_alphabetic())
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

#[trace("TC-1837", "FR-095-AC-19")]
#[test]
fn tc_1837_clause_state_transition_and_step_identities_nest_under_their_owner() {
    let lowered = lift_at(&fixture("business"));
    assert!(
        !is_blocked(&lowered.diagnostics),
        "{:?}",
        lowered.diagnostics
    );
    let types = types_json(&lowered);

    let machine = type_with_identity(&types, &format!("{PACKAGE}/SM_001"));
    let states = identities(&machine["states"]);
    assert_eq!(
        states,
        ["draft", "placed", "shipped", "cancelled"].map(|name| format!("{PACKAGE}/SM_001/{name}"))
    );
    assert_eq!(
        identities(&machine["transitions"]),
        ["transition0", "transition1", "transition2"]
            .map(|name| format!("{PACKAGE}/SM_001/{name}")),
        "a transition has no name: its member name is `transition` and its zero-based row position"
    );
    let transitions = machine["transitions"].as_array().expect("transitions");
    assert_eq!(transitions[0]["from"], states[0].as_str());
    assert_eq!(transitions[0]["to"], states[1].as_str());
    assert_eq!(transitions[1]["from"], states[1].as_str());
    assert_eq!(transitions[1]["to"], states[2].as_str());
    assert_eq!(transitions[2]["to"], states[3].as_str());
    assert_eq!(
        transitions[0]["trigger"],
        format!("{PACKAGE}/SM_001/advance")
    );
    for state in machine["states"].as_array().expect("states") {
        let identity = state["identity"].as_str().expect("identity");
        assert_eq!(
            identity.rsplit('/').next(),
            state["name"].as_str(),
            "a state's name is the member name of its identity"
        );
    }

    let process = type_with_identity(&types, &format!("{PACKAGE}/PR_001"));
    assert_eq!(
        identities(&process["steps"]),
        ["placed", "picked", "shipped"].map(|name| format!("{PACKAGE}/PR_001/{name}"))
    );
    for step in process["steps"].as_array().expect("steps") {
        let identity = step["identity"].as_str().expect("identity");
        assert_eq!(identity.rsplit('/').next(), step["name"].as_str());
    }

    let aggregate = type_with_identity(&types, &format!("{PACKAGE}/AR_001"));
    assert_eq!(
        identities(&aggregate["clauses"]),
        [format!("{PACKAGE}/AR_001/single_root")]
    );
    assert_eq!(aggregate["clauses"][0]["clauseId"], "single_root");
}

#[trace("TC-1837", "FR-095-AC-19")]
#[test]
fn tc_1837_every_member_identity_is_its_declaring_types_identity_and_one_member_name() {
    let lowered = lift_at(&fixture("business"));
    let types = types_json(&lowered);
    let mut seen = BTreeSet::new();
    for definition in &types {
        let owner = definition["identity"].as_str().expect("identity");
        for list in ["clauses", "states", "transitions", "steps"] {
            for node in definition[list].as_array().into_iter().flatten() {
                let identity = node["identity"].as_str().expect("identity");
                let member = identity
                    .strip_prefix(&format!("{owner}/"))
                    .unwrap_or_else(|| panic!("{list}: {identity} is not under {owner}"));
                assert!(is_member_name(member), "{list}: {identity}");
                assert!(seen.insert(identity.to_string()), "{identity} minted twice");
            }
        }
    }
    assert_eq!(seen.len(), 6 + 4 + 3 + 3, "{seen:?}");
}

#[trace("TC-1838", "FR-095-AC-20")]
#[test]
fn tc_1838_a_state_clause_or_step_named_like_a_field_or_operation_of_its_owner_is_a_duplicate_identity(
) {
    // State `advance` beside operation `advance` of SM_001.
    let state = lift_edited(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            "| advance | Same name as the operation |\n| cancelled | The order",
        )
    });
    // State `transition0` beside the first transition's member name.
    let ordinal = lift_edited(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            "| transition0 | Same name as a transition |\n| cancelled | The order",
        )
    });
    // Step `id` beside field `id` of PR_001.
    let step = lift_edited(PR_001, |text| {
        format!("{text}| id | wait | | | Same name as the field |\n")
    });
    // Clause `current` beside field `current` of SM_001.
    let clause = lift_edited(SM_001, |text| {
        format!(
            "{text}\n## Invariants\n\n### current\n\n```ocl\ncontext OrderLifecycle inv current: true\n```\n"
        )
    });
    for (label, lowered, identity) in [
        ("state beside operation", &state, "SM_001/advance"),
        ("state beside transition", &ordinal, "SM_001/transition0"),
        ("step beside field", &step, "PR_001/id"),
        ("clause beside field", &clause, "SM_001/current"),
    ] {
        let duplicates = with_code(lowered, Code::DuplicateIdentity);
        assert_eq!(duplicates.len(), 1, "{label}: {:?}", lowered.diagnostics);
        let duplicate = duplicates[0];
        assert!(duplicate.blocking, "{label}");
        assert!(
            duplicate
                .message
                .contains(&format!("{PACKAGE}/{identity}`")),
            "{label}: {}",
            duplicate.message
        );
        assert_eq!(
            duplicate.related.len(),
            1,
            "{label}: names the earlier node"
        );
    }
}

#[trace("TC-1838", "FR-095-AC-20")]
#[test]
fn tc_1838_the_same_member_name_under_two_owners_mints_two_identities() {
    // `placed` is a state of SM_001 and a step of PR_001.
    let lowered = lift_at(&fixture("business"));
    let types = types_json(&lowered);
    let state = identities(&type_with_identity(&types, &format!("{PACKAGE}/SM_001"))["states"]);
    let step = identities(&type_with_identity(&types, &format!("{PACKAGE}/PR_001"))["steps"]);
    assert!(state.contains(&format!("{PACKAGE}/SM_001/placed")));
    assert!(step.contains(&format!("{PACKAGE}/PR_001/placed")));
    assert!(with_code(&lowered, Code::DuplicateIdentity).is_empty());
}

#[trace("TC-1839", "FR-095-AC-21")]
#[test]
fn tc_1839_a_state_or_step_name_outside_the_member_name_pattern_is_unsluggable_at_its_row() {
    // The engine already refuses a name with a space, a hyphen or a leading
    // digit; a leading underscore passes the engine and is the case only the
    // frontend's member-name rule refuses.
    let state = lift_edited(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            "| _hold | Leading underscore |\n| cancelled | The order",
        )
    });
    let step = lift_edited(PR_001, |text| {
        format!("{text}| _pick | wait | | | Leading underscore |\n")
    });
    for (label, lowered, name) in [
        ("state with a leading underscore", &state, "_hold"),
        ("step with a leading underscore", &step, "_pick"),
    ] {
        let refusals = with_code(lowered, Code::UnsluggableName);
        assert_eq!(refusals.len(), 1, "{label}: {:?}", lowered.diagnostics);
        let refusal = refusals[0];
        assert!(refusal.blocking, "{label}");
        assert!(
            refusal.message.contains(name),
            "{label}: {}",
            refusal.message
        );
        assert!(refusal.locus.is_some(), "{label}");
    }
}

#[trace("TC-1839", "FR-095-AC-21")]
#[test]
fn tc_1839_an_underscored_state_name_is_its_own_member_name() {
    let lowered = lift_edited(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            "| on_hold | Underscored |\n| cancelled | The order",
        )
    });
    assert!(
        !is_blocked(&lowered.diagnostics),
        "{:?}",
        lowered.diagnostics
    );
    let types = types_json(&lowered);
    let machine = type_with_identity(&types, &format!("{PACKAGE}/SM_001"));
    assert!(identities(&machine["states"]).contains(&format!("{PACKAGE}/SM_001/on_hold")));
}
