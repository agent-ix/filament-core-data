//! FR-091: activated normal/build dependencies of a public lift consumer.
//! The control changes the owning dependency edge in a full Git snapshot;
//! it does not add an unrelated feature-unifying consumer dependency.

mod common;

use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::fs;
use std::path::Path;
use std::process::Command;

use common::{crate_dir, workspace_dir};
use ix_trace_rs::trace;
use serde_json::Value;

fn checked(command: &mut Command) -> Vec<u8> {
    let output = command.output().expect("spawn graph fixture command");
    assert!(
        output.status.success(),
        "{command:?}:\n{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

fn consumer_graph(frontend: &Path, consumer: &Path, lock: &Path) -> Value {
    fs::create_dir_all(consumer.join("src")).expect("consumer directories");
    // JSON string quoting is also TOML basic-string quoting for these paths.
    let path = serde_json::to_string(frontend.to_str().expect("UTF-8 path"))
        .expect("quote frontend path");
    fs::write(
        consumer.join("Cargo.toml"),
        format!(
            "[package]\nname = \"lift-graph-consumer\"\nversion = \"0.0.0\"\n\
             edition = \"2021\"\n[workspace]\nresolver = \"2\"\n\
             [dependencies]\nagent-ix-extraction-frontend = {{ path = {path} }}\n"
        ),
    )
    .expect("consumer manifest");
    fs::write(
        consumer.join("src/lib.rs"),
        "pub use agent_ix_extraction_frontend::{lift, LiftRequest, LiftOutcome};\n",
    )
    .expect("public lift consumer");
    fs::copy(lock, consumer.join("Cargo.lock")).expect("seed existing dependency selections");
    let bytes = checked(
        Command::new("cargo")
            .args(["metadata", "--format-version", "1", "--offline"])
            .current_dir(consumer),
    );
    serde_json::from_slice(&bytes).expect("resolved consumer graph")
}

/// Return every excluded package reachable through activated normal/build edges.
/// Metadata's package inventory alone includes inactive optional packages.
fn parser_paths(graph: &Value) -> BTreeMap<String, Vec<String>> {
    let packages: BTreeMap<&str, &str> = graph["packages"]
        .as_array()
        .expect("packages")
        .iter()
        .map(|p| (p["id"].as_str().expect("id"), p["name"].as_str().expect("name")))
        .collect();
    let nodes: BTreeMap<&str, &Value> = graph["resolve"]["nodes"]
        .as_array()
        .expect("resolved nodes")
        .iter()
        .map(|n| (n["id"].as_str().expect("node id"), n))
        .collect();
    let root = graph["resolve"]["root"].as_str().expect("consumer root");
    let mut pending = VecDeque::from([(root, vec![packages[root].to_string()])]);
    let mut visited = BTreeSet::new();
    let mut forbidden = BTreeMap::new();
    let mut frontend_seen = false;
    let mut quire_seen = false;
    while let Some((id, path)) = pending.pop_front() {
        if !visited.insert(id) {
            continue;
        }
        let name = packages[id];
        frontend_seen |= name == "agent-ix-extraction-frontend";
        quire_seen |= name == "quire-rs";
        if matches!(name, "quire-rust-extraction" | "quire-code-parse" | "tree-sitter")
            || name.starts_with("tree-sitter-")
        {
            forbidden.insert(name.to_string(), path.clone());
        }
        for dep in nodes[id]["deps"].as_array().expect("activated dependencies") {
            if !dep["dep_kinds"]
                .as_array()
                .expect("dependency kinds")
                .iter()
                .any(|kind| kind["kind"].is_null() || kind["kind"] == "build")
            {
                continue;
            }
            let next = dep["pkg"].as_str().expect("dependency package");
            let mut next_path = path.clone();
            next_path.push(packages[next].to_string());
            pending.push_back((next, next_path));
        }
    }
    assert!(frontend_seen, "consumer must reach the actual frontend");
    assert!(quire_seen, "consumer must reach the actual Quire engine");
    forbidden
}

#[trace("TC-1841", "FR-091-AC-12")]
#[test]
fn tc_1841_lift_graph_excludes_parsers_and_restoring_defaults_at_its_edge_is_rejected() {
    let temp = tempfile::tempdir().expect("graph fixture");
    let root = workspace_dir();
    let graph = consumer_graph(
        &crate_dir(),
        &temp.path().join("candidate-consumer"),
        &root.join("Cargo.lock"),
    );
    assert!(parser_paths(&graph).is_empty(), "{:?}", parser_paths(&graph));

    // Archive the complete committed owner, including workspace dependencies.
    // Equality below prevents a stale committed edge from becoming the control.
    let archive = temp.path().join("owner.tar");
    checked(
        Command::new("git")
            .arg("archive")
            .arg("--output")
            .arg(&archive)
            .arg("HEAD")
            .current_dir(&root),
    );
    let owner = temp.path().join("owner");
    fs::create_dir(&owner).expect("scratch owner");
    checked(Command::new("tar").arg("-xf").arg(&archive).arg("-C").arg(&owner));
    let frontend = owner.join("crates/extraction-frontend");
    let manifest = frontend.join("Cargo.toml");
    let original = fs::read(&manifest).expect("scratch frontend manifest");
    assert_eq!(
        original,
        fs::read(crate_dir().join("Cargo.toml")).expect("current frontend manifest"),
        "commit the feature selection before running its scratch control"
    );
    let selected = String::from_utf8(original.clone()).expect("manifest UTF-8");
    let edge = selected
        .lines()
        .find(|line| line.starts_with("quire-rs = "))
        .expect("owning Quire dependency edge");
    let selection = ", default-features = false, features = [\"resolve-file\"]";
    assert_eq!(edge.matches(selection).count(), 1, "selected owner edge");
    let defaults = edge.replacen(selection, "", 1);
    fs::write(&manifest, selected.replacen(edge, &defaults, 1)).expect("restore defaults");
    let control = consumer_graph(
        &frontend,
        &temp.path().join("default-consumer"),
        &owner.join("Cargo.lock"),
    );
    let rejected = parser_paths(&control);
    for parser in ["quire-rust-extraction", "quire-code-parse", "tree-sitter"] {
        assert!(rejected.contains_key(parser), "control did not activate {parser}: {rejected:?}");
    }
    assert!(
        rejected.keys().any(|name| name.starts_with("tree-sitter-") && name != "tree-sitter-language"),
        "default control must activate a grammar: {rejected:?}"
    );
    fs::write(&manifest, &original).expect("restore scratch edge byte for byte");
    assert_eq!(fs::read(&manifest).expect("restored edge"), original);
    assert_eq!(
        fs::read(crate_dir().join("Cargo.toml")).expect("owner edge after control"),
        original,
        "scratch control changed the working owner"
    );
}
