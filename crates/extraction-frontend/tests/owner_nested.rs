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

/// The business fixture with `edit` applied to the document at `path`, and
/// the edited text.
fn lift_edited_text(path: &str, edit: impl FnOnce(String) -> String) -> (Lowered, String) {
    let scratch = tempfile::tempdir().expect("tempdir");
    copy_tree(&fixture("business"), scratch.path());
    let file = scratch.path().join(path);
    let text = edit(fs::read_to_string(&file).expect("document"));
    fs::write(&file, &text).expect("write");
    (lift_at(scratch.path()), text)
}

fn lift_edited(path: &str, edit: impl FnOnce(String) -> String) -> Lowered {
    lift_edited_text(path, edit).0
}

/// The 1-based line of the first line of `text` starting with `prefix`.
fn line_of(text: &str, prefix: &str) -> usize {
    text.lines()
        .position(|line| line.starts_with(prefix))
        .unwrap_or_else(|| panic!("no line starts with {prefix:?}"))
        + 1
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
    let state_row = "| advance | Same name as the operation |";
    let ordinal_row = "| transition0 | Same name as a transition |";
    let step_row = "| id | wait | | | Same name as the field |";
    let clause_edit =
        "\n## Invariants\n\n### current\n\n```ocl\ncontext OrderLifecycle inv current: true\n```\n";
    // State `advance` beside operation `advance` of SM_001.
    let (state, state_text) = lift_edited_text(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            &format!("{state_row}\n| cancelled | The order"),
        )
    });
    // State `transition0` beside the first transition's member name.
    let (ordinal, ordinal_text) = lift_edited_text(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            &format!("{ordinal_row}\n| cancelled | The order"),
        )
    });
    // Step `id` beside field `id` of PR_001.
    let (step, step_text) = lift_edited_text(PR_001, |text| format!("{text}{step_row}\n"));
    let step_field = line_of(
        &fs::read_to_string(fixture("business").join(PR_001)).expect("PR_001"),
        "| id | UUID",
    );
    // Clause `current` beside field `current` of SM_001.
    let (clause, clause_text) = lift_edited_text(SM_001, |text| format!("{text}{clause_edit}"));
    let clause_field = line_of(&clause_text, "| current |");
    // (label, lowered, identity, path, later node's line, earlier node's line)
    for (label, lowered, identity, path, later, earlier) in [
        (
            "state beside operation",
            &state,
            "SM_001/advance",
            SM_001,
            line_of(&state_text, state_row),
            line_of(&state_text, "### advance"),
        ),
        (
            "transition beside state",
            &ordinal,
            "SM_001/transition0",
            SM_001,
            line_of(&ordinal_text, "| draft | placed | advance"),
            line_of(&ordinal_text, ordinal_row),
        ),
        (
            "step beside field",
            &step,
            "PR_001/id",
            PR_001,
            line_of(&step_text, step_row),
            step_field,
        ),
        (
            "clause beside field",
            &clause,
            "SM_001/current",
            SM_001,
            line_of(&clause_text, "```ocl"),
            clause_field,
        ),
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
        let at = duplicate.locus.as_ref().expect("locus");
        assert_eq!(
            (at.path.as_str(), at.start_line),
            (path, later),
            "{label}: the later node"
        );
        assert_eq!(duplicate.related.len(), 1, "{label}");
        let related = &duplicate.related[0];
        assert_eq!(
            (related.path.as_str(), related.start_line),
            (path, earlier),
            "{label}: the earlier node"
        );
    }
}

#[trace("TC-1840", "FR-095-AC-22")]
#[test]
fn tc_1840_two_transition_rows_with_equal_from_to_and_trigger_lift_as_two_transitions() {
    // The producer names the members, so the frontend does not compare rows
    // semantically; refusing equal rows is the consumer's rule (QSpec FR-154).
    let lowered = lift_edited(SM_001, |text| {
        text.replace(
            "| placed | cancelled | advance | | |",
            "| placed | cancelled | advance | | |\n| placed | cancelled | advance | | |",
        )
    });
    assert!(
        !is_blocked(&lowered.diagnostics),
        "{:?}",
        lowered.diagnostics
    );
    assert!(with_code(&lowered, Code::DuplicateIdentity).is_empty());
    let types = types_json(&lowered);
    let machine = type_with_identity(&types, &format!("{PACKAGE}/SM_001"));
    assert_eq!(
        identities(&machine["transitions"]),
        ["transition0", "transition1", "transition2", "transition3"]
            .map(|name| format!("{PACKAGE}/SM_001/{name}"))
    );
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
fn tc_1839_a_clause_state_or_step_name_outside_the_member_name_pattern_is_unsluggable_at_its_row() {
    // The engine already refuses a name with a space, a hyphen or a leading
    // digit; a leading underscore passes the engine and is the case only the
    // frontend's member-name rule refuses.
    let state_row = "| _hold | Leading underscore |";
    let step_row = "| _pick | wait | | | Leading underscore |";
    let clause_edit =
        "\n## Invariants\n\n### _tight\n\n```ocl\ncontext OrderLifecycle inv _tight: true\n```\n";
    let (state, state_text) = lift_edited_text(SM_001, |text| {
        text.replace(
            "| cancelled | The order",
            &format!("{state_row}\n| cancelled | The order"),
        )
    });
    let (step, step_text) = lift_edited_text(PR_001, |text| format!("{text}{step_row}\n"));
    let (clause, clause_text) = lift_edited_text(SM_001, |text| format!("{text}{clause_edit}"));
    // (label, lowered, name, owner, path, row line)
    for (label, lowered, name, owner, path, row) in [
        (
            "state",
            &state,
            "_hold",
            "SM_001",
            SM_001,
            line_of(&state_text, state_row),
        ),
        (
            "step",
            &step,
            "_pick",
            "PR_001",
            PR_001,
            line_of(&step_text, step_row),
        ),
        (
            "clause",
            &clause,
            "_tight",
            "SM_001",
            SM_001,
            line_of(&clause_text, "```ocl"),
        ),
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
        let at = refusal.locus.as_ref().expect("locus");
        assert_eq!(
            (at.path.as_str(), at.start_line),
            (path, row),
            "{label}: the row"
        );
        // The owning artifact lifts to no definition, so neither the refused
        // member nor its owner is in the output.
        let owner_identity = format!("{PACKAGE}/{owner}");
        assert!(
            lowered.types.iter().all(|t| t.identity != owner_identity),
            "{label}: {owner} is emitted"
        );
        assert!(is_blocked(&lowered.diagnostics), "{label}");
        // FR-001 owns SM_001, so a refused state machine takes its owner down
        // with it; PR_001 has no dependents in the fixture.
        if owner == "SM_001" {
            assert!(
                with_code(lowered, Code::ArtifactNotLowered)
                    .iter()
                    .any(|d| d.message.contains("FR-001") && d.message.contains("SM_001")),
                "{label}: FR-001 is not reported as not lowered"
            );
        }
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
