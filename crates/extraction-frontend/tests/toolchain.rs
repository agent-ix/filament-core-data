//! NFR-033: qualified toolchain and licensed dependencies.
//!
//! These tests read the crate manifest, the workspace pins, the lock, the
//! licence files and the vendored module fixture, and assert the posture
//! NFR-033 fixes. They deliberately parse the manifest as text rather than
//! through `cargo metadata`, so a scratch copy of the manifest with a planted
//! caret specifier (pointed at through `EXTRACTION_FRONTEND_MANIFEST`) turns
//! the test red without touching the tree.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use ix_trace_rs::trace;
use serde_json::Value;

const TOOLCHAIN: &str = "1.98.1";
const PACKAGE: &str = "agent-ix-extraction-frontend";

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn workspace_dir() -> PathBuf {
    crate_dir()
        .parent()
        .and_then(Path::parent)
        .expect("crate sits two levels below the workspace root")
        .to_path_buf()
}

fn read(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()))
}

/// The manifest under test: the committed one, or a scratch copy named by
/// `EXTRACTION_FRONTEND_MANIFEST` (the falsification hook of Task-127).
fn manifest_text() -> String {
    let path = std::env::var_os("EXTRACTION_FRONTEND_MANIFEST")
        .map(PathBuf::from)
        .unwrap_or_else(|| crate_dir().join("Cargo.toml"));
    read(&path)
}

/// The lines of one `[section]` of a TOML document, comments and blanks
/// dropped, up to the next section header.
fn section(text: &str, header: &str) -> Vec<String> {
    let mut lines = Vec::new();
    let mut inside = false;
    for raw in text.lines() {
        let line = raw.trim();
        if line.starts_with('[') && !line.starts_with("[[") || line.starts_with("[[") {
            inside = line == header;
            continue;
        }
        if inside && !line.is_empty() && !line.starts_with('#') {
            lines.push(line.to_string());
        }
    }
    lines
}

/// `key = "value"` lookup inside a list of section lines.
fn key(lines: &[String], name: &str) -> Option<String> {
    lines.iter().find_map(|line| {
        let (k, v) = line.split_once('=')?;
        (k.trim() == name).then(|| v.trim().to_string())
    })
}

fn quoted(value: &str) -> Option<String> {
    let v = value.trim();
    v.strip_prefix('"')
        .and_then(|rest| rest.strip_suffix('"'))
        .map(str::to_string)
}

/// One dependency line, as the small set of keys NFR-033 reasons about.
#[derive(Debug, Default)]
struct Dep {
    version: Option<String>,
    git: Option<String>,
    rev: Option<String>,
    tag: Option<String>,
    branch: Option<String>,
    path: Option<String>,
    workspace: bool,
}

fn parse_dep(line: &str) -> (String, Dep) {
    let (name, spec) = line
        .split_once('=')
        .expect("dependency line has `name = spec`");
    let name = name.trim().to_string();
    let spec = spec.trim();
    let mut dep = Dep::default();
    if let Some(version) = quoted(spec) {
        dep.version = Some(version);
        return (name, dep);
    }
    let inner = spec
        .strip_prefix('{')
        .and_then(|s| s.strip_suffix('}'))
        .unwrap_or_else(|| panic!("dependency `{name}` is neither a string nor an inline table"));
    // Split on commas outside brackets so `features = ["a", "b"]` survives.
    let mut depth = 0;
    let mut field = String::new();
    let mut fields = Vec::new();
    for c in inner.chars() {
        match c {
            '[' => depth += 1,
            ']' => depth -= 1,
            ',' if depth == 0 => {
                fields.push(std::mem::take(&mut field));
                continue;
            }
            _ => {}
        }
        field.push(c);
    }
    fields.push(field);
    for field in fields {
        let Some((k, v)) = field.split_once('=') else {
            continue;
        };
        let v = v.trim();
        match k.trim() {
            "version" => dep.version = quoted(v),
            "git" => dep.git = quoted(v),
            "rev" => dep.rev = quoted(v),
            "tag" => dep.tag = quoted(v),
            "branch" => dep.branch = quoted(v),
            "path" => dep.path = quoted(v),
            "workspace" => dep.workspace = v == "true",
            _ => {}
        }
    }
    (name, dep)
}

fn deps(text: &str, header: &str) -> BTreeMap<String, Dep> {
    section(text, header).iter().map(|l| parse_dep(l)).collect()
}

fn workspace_members() -> BTreeSet<String> {
    let root = read(&workspace_dir().join("Cargo.toml"));
    let members = key(&section(&root, "[workspace]"), "members").expect("workspace members");
    members
        .trim_matches(|c| c == '[' || c == ']')
        .split(',')
        .filter_map(|m| quoted(m.trim()))
        .filter_map(|m| m.rsplit('/').next().map(str::to_string))
        .collect()
}

fn cargo() -> Command {
    let mut cmd = Command::new("cargo");
    cmd.arg(format!("+{TOOLCHAIN}"));
    cmd.current_dir(workspace_dir());
    cmd
}

/// Every third-party package reachable from this crate over normal and build
/// edges (dev edges excluded) on this host, as `(name, version) -> licence`,
/// straight from `cargo +1.98.1 tree --locked --edges normal,build` — the
/// listing NFR-033's verification names.
fn reachable_third_party() -> BTreeMap<(String, String), String> {
    let out = cargo()
        .args([
            "tree",
            "--locked",
            "--edges",
            "normal,build",
            "--no-dedupe",
            "--prefix",
            "none",
            "--format",
            "{p}\t{l}",
            "-p",
            PACKAGE,
        ])
        .output()
        .expect("spawn cargo tree");
    assert!(
        out.status.success(),
        "cargo +{TOOLCHAIN} tree --locked failed:\n{}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter(|l| !l.trim().is_empty())
        // Workspace members print with their path source; everything else is a
        // registry or git crate and therefore third-party.
        .filter(|l| !l.contains(" (/"))
        .map(|line| {
            let (pkg, license) = line.split_once('\t').expect("tab-separated tree line");
            let mut words = pkg.split_whitespace();
            let name = words.next().expect("crate name").to_string();
            let version = words
                .next()
                .and_then(|v| v.strip_prefix('v'))
                .expect("crate version")
                .to_string();
            ((name, version), license.trim().to_string())
        })
        .collect()
}

/// `| crate | version | licence | source |` rows of THIRD-PARTY-NOTICES.md.
fn notices_rows() -> BTreeMap<(String, String), String> {
    let text = read(&crate_dir().join("THIRD-PARTY-NOTICES.md"));
    text.lines()
        .filter(|l| l.starts_with("| `"))
        .map(|l| {
            let cells: Vec<&str> = l.split('|').map(str::trim).collect();
            let name = cells[1].trim_matches('`').to_string();
            let version = cells[2].trim_matches('`').to_string();
            ((name, version), cells[3].to_string())
        })
        .collect()
}

#[trace("TC-1320", "NFR-033-AC-1")]
#[test]
fn tc_1320_manifest_pins_toolchain_and_lock_entries_of_other_members_hold() {
    let manifest = manifest_text();
    let package = section(&manifest, "[package]");
    assert_eq!(
        key(&package, "name").as_deref(),
        Some(&*format!("\"{PACKAGE}\""))
    );
    // CR-036-1: the supported minimum is the workspace's (cargo enforces every
    // member's `rust-version` under `--workspace`, so a member-level 1.98.1
    // would break `make rust-build` on the workspace channel); the
    // qualification compiler is named once, in the Makefile.
    assert_eq!(
        key(&package, "rust-version.workspace").as_deref(),
        Some("true"),
        "the crate inherits the workspace rust-version"
    );
    assert!(
        key(&package, "rust-version").is_none(),
        "no member-level rust-version override"
    );
    let makefile = read(&workspace_dir().join("Makefile"));
    let naming: Vec<&str> = makefile
        .lines()
        .filter(|l| !l.trim_start().starts_with('#') && l.contains(TOOLCHAIN))
        .collect();
    assert_eq!(
        naming,
        vec![format!("EXTRACTION_TOOLCHAIN ?= {TOOLCHAIN}")],
        "the Makefile names the qualification compiler exactly once"
    );
    assert_eq!(
        key(&package, "license").as_deref(),
        Some("\"AGPL-3.0-only\"")
    );
    assert_eq!(key(&package, "publish").as_deref(), Some("false"));
    assert_eq!(key(&package, "edition").as_deref(), Some("\"2021\""));

    // The workspace pins this crate must not move.
    let root = read(&workspace_dir().join("Cargo.toml"));
    assert_eq!(
        key(&section(&root, "[workspace.package]"), "rust-version").as_deref(),
        Some("\"1.85.0\""),
        "the workspace rust-version belongs to quire-rs#417's sweep, not this crate"
    );
    let toolchain = read(&workspace_dir().join("rust-toolchain.toml"));
    assert_eq!(
        key(&section(&toolchain, "[toolchain]"), "channel").as_deref(),
        Some("\"1.94.1\"")
    );

    // Every lock entry of another member is byte-unchanged from the base: the
    // diff against it may add lines (this crate's graph) but never remove one.
    let base = std::env::var("EXTRACTION_LOCK_BASE").unwrap_or_else(|_| "main".to_string());
    let out = Command::new("git")
        .args([
            "-C",
            &workspace_dir().to_string_lossy(),
            "diff",
            &base,
            "--",
            "Cargo.lock",
        ])
        .output()
        .expect("spawn git diff");
    assert!(
        out.status.success(),
        "git diff {base} -- Cargo.lock failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let diff = String::from_utf8_lossy(&out.stdout);
    let removed: Vec<&str> = diff
        .lines()
        .filter(|l| l.starts_with('-') && !l.starts_with("---"))
        .collect();
    assert!(
        removed.is_empty(),
        "Cargo.lock entries moved relative to {base} (D11, FND-1457):\n{}",
        removed.join("\n")
    );
}

#[trace("TC-1322", "NFR-033-AC-3")]
#[test]
fn tc_1322_every_dependency_is_exact_reviewed_and_inside_the_workspace() {
    let manifest = manifest_text();
    assert!(
        !manifest.contains("file:") && !manifest.contains("link:"),
        "file:/link: specifiers are forbidden everywhere"
    );
    let members = workspace_members();
    let normal = deps(&manifest, "[dependencies]");
    let dev = deps(&manifest, "[dev-dependencies]");

    for (kind, set) in [("dependency", &normal), ("dev-dependency", &dev)] {
        for (name, dep) in set {
            assert_ne!(name, "jsonschema", "no jsonschema crate may be declared");
            assert!(dep.branch.is_none(), "{kind} `{name}` pins a branch");
            if let Some(version) = &dep.version {
                assert!(
                    version.starts_with('='),
                    "{kind} `{name}` is not an exact pin: `{version}`"
                );
            }
            if dep.git.is_some() {
                assert!(
                    dep.rev.is_some() || dep.tag.is_some(),
                    "{kind} `{name}` is a git dependency without an exact rev or tag"
                );
            }
            if let Some(path) = &dep.path {
                let target = path.strip_prefix("../").unwrap_or(path);
                assert!(
                    members.contains(target),
                    "{kind} `{name}` reaches outside the workspace: `{path}`"
                );
            }
            assert!(
                dep.version.is_some() || dep.git.is_some() || dep.path.is_some() || dep.workspace,
                "{kind} `{name}` has no version, git, path or workspace specifier"
            );
        }
    }

    let quire = &normal["quire-rs"];
    assert_eq!(
        quire.git.as_deref(),
        Some("https://github.com/agent-ix/quire-rs")
    );
    assert_eq!(
        quire.rev.as_deref(),
        Some("8b8020e"),
        "quire-rs rev is at or after a874fb6"
    );
    assert_eq!(
        normal["agent-ix-semantic-ir"].path.as_deref(),
        Some("../semantic-ir")
    );
    assert!(normal["serde"].workspace && normal["serde"].version.is_none());
    assert!(normal["serde_json"].workspace && normal["serde_json"].version.is_none());
    assert!(normal["sha2"]
        .version
        .as_deref()
        .is_some_and(|v| v.starts_with('=')));
    assert!(normal["clap"]
        .version
        .as_deref()
        .is_some_and(|v| v.starts_with('=')));
    let trace = &dev["ix-trace-rs"];
    assert_eq!(
        trace.git.as_deref(),
        Some("https://github.com/agent-ix/ix-trace-rs")
    );
    assert_eq!(trace.tag.as_deref(), Some("v0.1.1"));
    assert!(
        !normal.contains_key("ix-trace-rs"),
        "ix-trace-rs is a dev-dependency only"
    );

    // The vendored module is pinned the same way the engine is.
    let provenance: Value = serde_json::from_str(&read(
        &crate_dir().join("fixtures/modules/spec-objects-business/PROVENANCE.json"),
    ))
    .expect("PROVENANCE.json is JSON");
    assert_eq!(provenance["revision"], "d1840b8");
    assert_eq!(
        provenance["repository"],
        "https://github.com/agent-ix/spec-objects-business"
    );
    assert!(provenance["paths"]
        .as_array()
        .is_some_and(|p| !p.is_empty()));
    assert!(provenance["manifest_sha256"]
        .as_str()
        .is_some_and(|s| s.len() == 64));
}

#[trace("TC-1325", "NFR-033-AC-6")]
#[test]
fn tc_1325_every_reachable_third_party_crate_has_a_notices_row_and_license_is_agpl() {
    let license = read(&crate_dir().join("LICENSE"));
    assert!(license.contains("GNU AFFERO GENERAL PUBLIC LICENSE"));
    assert!(license.contains("Version 3, 19 November 2007"));

    let reachable = reachable_third_party();
    assert!(
        !reachable.is_empty(),
        "the crate links quire-rs, so the graph is not empty"
    );
    let rows = notices_rows();
    let mut missing = Vec::new();
    for ((name, version), license) in &reachable {
        match rows.get(&(name.clone(), version.clone())) {
            Some(row) if !row.is_empty() && row != "-" => {
                assert_eq!(
                    row, license,
                    "licence row for {name} {version} disagrees with cargo"
                );
            }
            _ => missing.push(format!("{name} {version}")),
        }
    }
    assert!(
        missing.is_empty(),
        "third-party crates without a THIRD-PARTY-NOTICES.md row:\n{}",
        missing.join("\n")
    );
}

#[trace("TC-1350", "NFR-033-AC-11")]
#[test]
fn tc_1350_crate_compiles_on_the_workspace_channel() {
    // The channel `make rust-build --workspace` runs on, read from the pin
    // rather than hard-coded, so the test follows the workspace if it moves.
    let toolchain = read(&workspace_dir().join("rust-toolchain.toml"));
    let channel = key(&section(&toolchain, "[toolchain]"), "channel")
        .and_then(|v| quoted(&v))
        .expect("rust-toolchain.toml names a channel");
    let out = Command::new("cargo")
        .arg(format!("+{channel}"))
        .args(["check", "--locked", "--offline", "-p", PACKAGE])
        .current_dir(workspace_dir())
        .output()
        .expect("spawn cargo check");
    assert!(
        out.status.success(),
        "cargo +{channel} check --locked --offline -p {PACKAGE} failed (CR-036-1):\n{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[trace("TC-1329", "NFR-033-AC-10")]
#[test]
fn tc_1329_locked_offline_build_succeeds_from_a_warm_cache() {
    let out = cargo()
        .args(["build", "--locked", "--offline", "-p", PACKAGE])
        .output()
        .expect("spawn cargo build");
    assert!(
        out.status.success(),
        "cargo +{TOOLCHAIN} build --locked --offline failed:\n{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
