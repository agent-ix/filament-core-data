//! NFR-032: the dependency-graph and clean-tree checks, and the FR-099 reach
//! constraints (TC-1311, TC-1314, TC-1330).
//!
//! TC-1314 is `#[ignore]`d: it runs the whole crate suite, which nests cargo
//! test, so the binding is a symbol and the run is deliberate:
//!
//! ```text
//! CARGO_TARGET_DIR=$PWD/node_modules/.cache/rust-target \
//!   cargo +1.98.1 test -p agent-ix-extraction-frontend --test change_set -- --ignored
//! ```

mod common;

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use common::{crate_dir, git, target_dir, workspace_dir};
use ix_trace_rs::trace;
use serde_json::Value;

const TOOLCHAIN: &str = "1.98.1";
const PACKAGE: &str = "agent-ix-extraction-frontend";

fn text(output: &Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn read(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()))
}

// ---------------------------------------------------------------------------
// NFR-032-AC-2: the dependency graph
// ---------------------------------------------------------------------------

#[trace("TC-1311", "NFR-032-AC-2")]
#[test]
fn tc_1311_no_edge_from_semantic_ir_or_the_adapter_and_the_only_path_edge_is_semantic_ir() {
    let output = Command::new("cargo")
        .arg(format!("+{TOOLCHAIN}"))
        .args(["metadata", "--format-version", "1", "--locked", "--offline"])
        .current_dir(workspace_dir())
        .output()
        .expect("spawn cargo metadata");
    assert!(output.status.success(), "{}", text(&output));
    let metadata: Value = serde_json::from_slice(&output.stdout).expect("metadata JSON");

    let packages = metadata["packages"].as_array().expect("packages");
    let by_id: BTreeMap<&str, &Value> = packages
        .iter()
        .map(|p| (p["id"].as_str().expect("id"), p))
        .collect();
    let name_of = |id: &str| by_id[id]["name"].as_str().expect("name").to_string();

    let nodes = metadata["resolve"]["nodes"].as_array().expect("nodes");
    let deps_of = |name: &str| -> Vec<String> {
        nodes
            .iter()
            .find(|n| name_of(n["id"].as_str().expect("id")) == name)
            .unwrap_or_else(|| panic!("{name} is not in the resolve graph"))["deps"]
            .as_array()
            .expect("deps")
            .iter()
            .map(|d| name_of(d["pkg"].as_str().expect("pkg")))
            .collect()
    };
    for member in ["agent-ix-semantic-ir", "agent-ix-conformance-adapter"] {
        let deps = deps_of(member);
        assert!(
            !deps.iter().any(|d| d == PACKAGE),
            "{member} depends on {PACKAGE}: {deps:?}"
        );
    }
    assert!(
        deps_of("agent-ix-semantic-ir").is_empty(),
        "the independent reader declares no dependency at all (FR-059)"
    );

    // The frontend's declared `path` edges, from its manifest entry.
    let frontend = packages
        .iter()
        .find(|p| p["name"] == PACKAGE)
        .expect("the frontend is a workspace member");
    let path_edges: Vec<&str> = frontend["dependencies"]
        .as_array()
        .expect("dependencies")
        .iter()
        .filter(|d| d["path"].is_string())
        .map(|d| d["name"].as_str().expect("name"))
        .collect();
    assert_eq!(path_edges, ["agent-ix-semantic-ir"]);
    // And the resolved edge is present.
    assert!(deps_of(PACKAGE).iter().any(|d| d == "agent-ix-semantic-ir"));
}

// ---------------------------------------------------------------------------
// NFR-032-AC-5: a clean tree after the full suite
// ---------------------------------------------------------------------------

fn porcelain(dir: &Path, pathspecs: &[&str]) -> String {
    let mut args = vec!["status", "--porcelain", "--untracked-files=all", "--"];
    args.extend(pathspecs);
    if pathspecs.is_empty() {
        args.pop();
    }
    git(dir, &args).unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
}

#[trace("TC-1314", "NFR-032-AC-5")]
#[test]
#[ignore = "E2E evidence: runs the whole crate suite, which nests cargo test; run with --ignored"]
fn tc_1314_after_the_full_suite_git_status_is_empty_in_the_fixtures() {
    let output = Command::new("cargo")
        .arg(format!("+{TOOLCHAIN}"))
        .args(["test", "--locked", "--offline", "-p", PACKAGE])
        .env("CARGO_TARGET_DIR", target_dir())
        .current_dir(workspace_dir())
        .output()
        .expect("spawn cargo test");
    assert!(
        output.status.success(),
        "the crate suite failed:\n{}",
        text(&output)
    );

    let here = porcelain(
        &workspace_dir(),
        &[
            "crates/extraction-frontend/fixtures",
            "test/fixtures/compiler/shared",
        ],
    );
    assert_eq!(here, "", "this repository's fixture directories are dirty");
}

// ---------------------------------------------------------------------------
// FR-091-CON-2, FR-092-CON-2, FR-099-CON-3: the crate's reach
// ---------------------------------------------------------------------------

/// The code lines of one source file: comment-only lines dropped.
fn code_lines(text: &str) -> Vec<&str> {
    text.lines()
        .filter(|l| {
            let t = l.trim_start();
            !(t.starts_with("//") || t.is_empty())
        })
        .collect()
}

#[trace("TC-1330", "FR-091-CON-2")]
#[trace("TC-1330", "FR-092-CON-2")]
#[trace("TC-1330", "FR-099-CON-3")]
#[test]
fn tc_1330_loaders_only_in_bundle_rs_std_fs_only_in_write_rs_resolver_closed_and_no_environment() {
    let src = crate_dir().join("src");
    let mut files: Vec<PathBuf> = fs::read_dir(&src)
        .expect("src")
        .map(|e| e.expect("entry").path())
        .filter(|p| p.extension().is_some_and(|x| x == "rs"))
        .collect();
    files.sort();
    assert!(files.len() > 15, "{files:?}");

    let mut loaders = BTreeSet::new();
    let mut fs_users = BTreeSet::new();
    let mut env_users = BTreeSet::new();
    for path in &files {
        let name = path
            .file_name()
            .expect("name")
            .to_string_lossy()
            .into_owned();
        let text = read(path);
        for line in code_lines(&text) {
            if line.contains("load_repo") || line.contains("load_module_set") {
                loaders.insert(name.clone());
            }
            if line.contains("std::fs") || line.contains(" fs::") || line.starts_with("fs::") {
                fs_users.insert(name.clone());
            }
            if line.contains("std::env")
                || line.contains("env::var")
                || line.contains("option_env!")
                || line.contains("env!(")
            {
                env_users.insert(name.clone());
            }
        }
    }
    assert_eq!(
        loaders,
        BTreeSet::from(["bundle.rs".to_string()]),
        "load_repo / load_module_set outside bundle.rs"
    );
    assert_eq!(
        fs_users,
        BTreeSet::from(["write.rs".to_string()]),
        "std::fs outside write.rs"
    );
    assert!(
        env_users.is_empty(),
        "the crate reads the environment: {env_users:?} (std::env::args reaches main through clap only)"
    );

    // resolve.rs classifies from the engine target, reason, index, object,
    // pass-one outcomes and the scalar table alone: its imports are closed.
    let resolve = read(&src.join("resolve.rs"));
    let allowed_use = [
        "std::collections",
        "std::fmt",
        "quire_rs::semantic",
        "crate::bundle",
        "crate::diagnostics",
        "crate::extract",
        "crate::identity",
        "crate::rows",
        "crate::scalars",
    ];
    for line in code_lines(&resolve) {
        let Some(rest) = line.trim_start().strip_prefix("use ") else {
            continue;
        };
        assert!(
            allowed_use.iter().any(|a| rest.starts_with(a)),
            "resolve.rs imports outside its closed input set: {line}"
        );
    }
    for reach in ["std::fs", "std::env", "std::io", "std::process", "std::net"] {
        assert!(
            !code_lines(&resolve).iter().any(|l| l.contains(reach)),
            "resolve.rs reaches {reach}"
        );
    }

    // The binary reads no environment variable: its only std::env use is
    // the argument vector, through clap.
    let main = read(&src.join("main.rs"));
    for line in code_lines(&main) {
        assert!(
            !line.contains("env::var") && !line.contains("var_os("),
            "main.rs reads the environment: {line}"
        );
    }
}
