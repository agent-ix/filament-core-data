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
        Some("\"AGPL-3.0-or-later\"")
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
    // quire-rs 6eec7e8 and later declare `rust-version = "1.98.1"`, so the
    // workspace channel is the qualification compiler (#154).
    let toolchain = read(&workspace_dir().join("rust-toolchain.toml"));
    assert_eq!(
        key(&section(&toolchain, "[toolchain]"), "channel").as_deref(),
        Some(&*format!("\"{TOOLCHAIN}\""))
    );

    // Every base lock entry that is not reachable only from this crate is
    // byte-unchanged: every workspace member's own entry, and every crate
    // another member reaches, even when this crate reaches it too. Only the
    // crates this crate alone reaches at the base may move with its pins.
    let base = std::env::var("EXTRACTION_LOCK_BASE").unwrap_or_else(|_| "main".to_string());
    let out = Command::new("git")
        .args([
            "-C",
            &workspace_dir().to_string_lossy(),
            "show",
            &format!("{base}:Cargo.lock"),
        ])
        .output()
        .expect("spawn git show");
    assert!(
        out.status.success(),
        "git show {base}:Cargo.lock failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let before = String::from_utf8(out.stdout).expect("utf-8 lock");
    let now = read(&workspace_dir().join("Cargo.lock"));
    let before = lock_entries(&before);
    let now = lock_entries(&now);
    let moved = moved_outside_own_graph(&before, &now);
    assert!(
        moved.is_empty(),
        "Cargo.lock entries not reachable only from {PACKAGE} moved relative to {base} (D11, FND-1457):\n{}",
        moved.join("\n")
    );

    // The controls, on a synthetic lock: `other` is a second member sharing
    // `shared` with this crate, and `own` is reachable from this crate alone.
    let lock = |shared: &str, own: &str| {
        format!(
            "version = 4\n\n[[package]]\nname = \"{PACKAGE}\"\nversion = \"0.0.0\"\ndependencies = [\n \"own\",\n \"shared\",\n]\n\n\
             [[package]]\nname = \"other\"\nversion = \"0.0.0\"\ndependencies = [\n \"shared\",\n]\n\n\
             [[package]]\nname = \"own\"\nversion = \"{own}\"\nsource = \"registry+x\"\n\n\
             [[package]]\nname = \"shared\"\nversion = \"{shared}\"\nsource = \"registry+x\"\n"
        )
    };
    let base_lock = lock_entries(&lock("1.0.0", "1.0.0"));
    assert!(
        moved_outside_own_graph(&base_lock, &lock_entries(&lock("1.0.0", "2.0.0"))).is_empty(),
        "a crate only this crate reaches may move"
    );
    assert_eq!(
        moved_outside_own_graph(&base_lock, &lock_entries(&lock("2.0.0", "1.0.0"))).len(),
        1,
        "a crate another member also reaches must not move"
    );
}

/// The base entries not reachable only from [`PACKAGE`] that are absent,
/// byte for byte, from `now`. A crate is exempt only when [`PACKAGE`]
/// reaches it at the base and no other workspace member does.
fn moved_outside_own_graph(before: &[LockEntry], now: &[LockEntry]) -> Vec<String> {
    let ours = graph_of(before, PACKAGE);
    let others: BTreeSet<String> = before
        .iter()
        .filter(|entry| entry.source.is_none() && entry.name != PACKAGE)
        .flat_map(|member| graph_of(before, &member.name))
        .collect();
    before
        .iter()
        .filter(|entry| entry.name != PACKAGE)
        .filter(|entry| !ours.contains(&entry.name) || others.contains(&entry.name))
        .filter(|entry| !now.iter().any(|other| other.text == entry.text))
        .map(|entry| entry.text.clone())
        .collect()
}

/// One `[[package]]` entry of a `Cargo.lock`: its bytes, name, source and
/// the names its `dependencies` list.
struct LockEntry {
    text: String,
    name: String,
    source: Option<String>,
    dependencies: Vec<String>,
}

fn lock_entries(lock: &str) -> Vec<LockEntry> {
    lock.split("[[package]]\n")
        .skip(1)
        .map(|block| {
            let text = block.trim_end().to_string();
            let field = |name: &str| {
                text.lines()
                    .find_map(|l| l.strip_prefix(&format!("{name} = ")))
                    .and_then(quoted)
            };
            let dependencies = text
                .split_once("dependencies = [\n")
                .map(|(_, rest)| {
                    rest.lines()
                        .take_while(|l| *l != "]")
                        .filter_map(|l| quoted(l.trim().trim_end_matches(',')))
                        .map(|d| d.split(' ').next().unwrap_or_default().to_string())
                        .collect()
                })
                .unwrap_or_default();
            LockEntry {
                name: field("name").expect("a lock entry names its package"),
                source: field("source"),
                dependencies,
                text,
            }
        })
        .collect()
}

/// The package names `root` reaches in `entries`, `root` included.
fn graph_of(entries: &[LockEntry], root: &str) -> BTreeSet<String> {
    let mut seen = BTreeSet::new();
    let mut stack = vec![root.to_string()];
    while let Some(name) = stack.pop() {
        if !seen.insert(name.clone()) {
            continue;
        }
        for entry in entries.iter().filter(|e| e.name == name) {
            stack.extend(entry.dependencies.iter().cloned());
        }
    }
    seen
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
        Some("08d39ea"),
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
    assert_eq!(provenance["revision"], "7b7b0bc");
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

// ---------------------------------------------------------------------------
// Task-138: the whole-crate gates (NFR-033-AC-2, AC-4, AC-5, AC-7, AC-8)
// ---------------------------------------------------------------------------

/// The `extraction-frontend` block of the root Makefile, from its section
/// header to the next section header or the end of the file.
fn makefile_block() -> Vec<String> {
    let makefile = read(&workspace_dir().join("Makefile"));
    let lines: Vec<&str> = makefile.lines().collect();
    let start = lines
        .iter()
        .position(|l| l.contains("Spec-bundle extraction frontend (issue #36)"))
        .expect("the Makefile block header")
        .saturating_sub(1);
    // The header is fenced by two `# ----` lines; the block ends at the next
    // such line after the fence, or at the end of the file.
    let end = lines[start + 3..]
        .iter()
        .position(|l| l.starts_with("# ----"))
        .map(|i| i + start + 3)
        .unwrap_or(lines.len());
    lines[start..end].iter().map(|l| l.to_string()).collect()
}

/// `make -C <workspace> <target> <VAR=value>...`.
fn make(target: &str, assignments: &[&str]) -> std::process::Output {
    Command::new("make")
        .arg("-C")
        .arg(workspace_dir())
        .arg(target)
        .args(assignments)
        .output()
        .expect("spawn make")
}

fn output_text(output: &std::process::Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[trace("TC-1321", "NFR-033-AC-2")]
#[test]
fn tc_1321_every_cargo_in_the_makefile_block_is_pinned_and_each_gate_fails_naming_0_0_0() {
    let block = makefile_block();
    let cargo_lines: Vec<&String> = block
        .iter()
        .filter(|l| !l.trim_start().starts_with('#'))
        .filter(|l| {
            l.split(|c: char| !c.is_alphanumeric())
                .any(|w| w == "cargo")
        })
        .collect();
    assert!(cargo_lines.len() >= 6, "{cargo_lines:?}");
    for line in &cargo_lines {
        assert!(
            line.contains("cargo +$(EXTRACTION_TOOLCHAIN)")
                || line.contains("rustup run $(EXTRACTION_TOOLCHAIN) cargo"),
            "a cargo invocation without +$(EXTRACTION_TOOLCHAIN): {line}"
        );
    }

    let targets: Vec<String> = block
        .iter()
        .filter_map(|l| l.strip_prefix(".PHONY: "))
        .map(str::to_string)
        .collect();
    assert!(
        targets.iter().any(|t| t == "extraction-frontend-deny")
            && targets.iter().any(|t| t == "extraction-frontend-audit")
            && targets.len() >= 8,
        "{targets:?}"
    );
    for target in &targets {
        let output = make(target, &["EXTRACTION_TOOLCHAIN=0.0.0"]);
        let text = output_text(&output);
        assert!(
            !output.status.success(),
            "{target} skipped under 0.0.0:\n{text}"
        );
        assert!(
            text.contains("0.0.0"),
            "{target} does not name 0.0.0:\n{text}"
        );
        assert!(
            text.contains("failure rather than a skip"),
            "{target}:\n{text}"
        );
    }
}

#[trace("TC-1323", "NFR-033-AC-4")]
#[test]
#[ignore = "Static evidence: drives make and the network-backed cargo deny; run with --ignored"]
fn tc_1323_make_extraction_frontend_deny_passes_with_zero_errors_and_the_allowlist_is_the_permitted_set(
) {
    let output = make("extraction-frontend-deny", &[]);
    let text = output_text(&output);
    assert!(output.status.success(), "{text}");
    assert!(
        !text.lines().any(|l| l.starts_with("error")),
        "cargo deny reported an error:\n{text}"
    );
    for check in ["advisories ok", "bans ok", "licenses ok", "sources ok"] {
        assert!(
            text.contains(check),
            "cargo deny did not report `{check}`:\n{text}"
        );
    }

    let deny = read(&crate_dir().join("deny.toml"));
    let allow: Vec<String> = deny
        .lines()
        .skip_while(|l| l.trim() != "allow = [")
        .skip(1)
        .take_while(|l| l.trim() != "]")
        .filter_map(|l| quoted(l.trim().trim_end_matches(',')))
        .collect();
    assert_eq!(
        allow,
        [
            "MIT",
            "Apache-2.0",
            "BSD-2-Clause",
            "BSD-3-Clause",
            "CDLA-Permissive-2.0",
            "ISC",
            "Unicode-3.0",
            "Zlib",
        ],
        "the licence allowlist is exactly the permitted set"
    );
    assert!(
        deny.contains("{ allow = [\"AGPL-3.0-or-later\"], crate = \"quire-rs\" }"),
        "quire-rs's AGPL-3.0-or-later is admitted by an explicit entry"
    );
    assert!(!allow.iter().any(|l| l.starts_with("AGPL")));
}

#[trace("TC-1324", "NFR-033-AC-5")]
#[test]
#[ignore = "Static evidence: drives make and the network-backed cargo audit; run with --ignored"]
fn tc_1324_make_extraction_frontend_audit_reports_zero_advisories_against_the_locked_graph() {
    let output = make("extraction-frontend-audit", &[]);
    let text = output_text(&output);
    assert!(output.status.success(), "{text}");
    assert!(
        text.contains("Scanning Cargo.lock for vulnerabilities"),
        "{text}"
    );
    assert!(
        !text.contains("vulnerabilities found") && !text.lines().any(|l| l.starts_with("error")),
        "cargo audit reported advisories:\n{text}"
    );
}

#[trace("TC-1326", "NFR-033-AC-7")]
#[test]
fn tc_1326_clippy_no_deps_all_targets_with_deny_warnings_and_fmt_check_both_pass() {
    let clippy = cargo()
        .args([
            "clippy",
            "--no-deps",
            "--all-targets",
            "--locked",
            "--offline",
            "-p",
            PACKAGE,
            "--",
            "-D",
            "warnings",
        ])
        .output()
        .expect("spawn cargo clippy");
    assert!(
        clippy.status.success(),
        "cargo +{TOOLCHAIN} clippy failed:\n{}",
        String::from_utf8_lossy(&clippy.stderr)
    );
    let fmt = cargo()
        .args(["fmt", "-p", PACKAGE, "--", "--check"])
        .output()
        .expect("spawn cargo fmt");
    assert!(
        fmt.status.success(),
        "cargo +{TOOLCHAIN} fmt --check failed:\n{}{}",
        String::from_utf8_lossy(&fmt.stdout),
        String::from_utf8_lossy(&fmt.stderr)
    );
}

/// One `#[test]` item of the crate: its name, its `#[trace]` ids, and
/// whether it is a requirement test.
struct TestItem {
    file: String,
    name: String,
    traces: Vec<(String, String)>,
}

/// Every `#[test]` function under `tests/` and `src/`, with the attribute
/// block immediately above it.
fn test_items() -> Vec<TestItem> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .collect();
        entries.sort();
        for entry in entries {
            if entry.is_dir() {
                walk(&entry, out);
            } else if entry.extension().is_some_and(|x| x == "rs") {
                out.push(entry);
            }
        }
    }
    let mut files = Vec::new();
    walk(&crate_dir().join("tests"), &mut files);
    walk(&crate_dir().join("src"), &mut files);
    let mut items = Vec::new();
    for file in files {
        let text = read(&file);
        let lines: Vec<&str> = text.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            let t = line.trim_start();
            let Some(rest) = t.strip_prefix("pub fn ").or_else(|| t.strip_prefix("fn ")) else {
                continue;
            };
            let name: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            // The contiguous attribute and doc-comment block above the item.
            let mut j = i;
            let mut attrs = Vec::new();
            while j > 0 {
                let above = lines[j - 1].trim();
                if above.starts_with("#[") || above.starts_with("///") || above.starts_with("//") {
                    attrs.push(above);
                    j -= 1;
                } else {
                    break;
                }
            }
            if !attrs.contains(&"#[test]") {
                continue;
            }
            let traces = attrs
                .iter()
                .filter_map(|a| {
                    let inner = a.strip_prefix("#[trace(")?.strip_suffix(")]")?;
                    let (tc, criterion) = inner.split_once(',')?;
                    Some((quoted(tc.trim())?, quoted(criterion.trim())?))
                })
                .collect();
            items.push(TestItem {
                file: file
                    .strip_prefix(crate_dir())
                    .expect("under the crate")
                    .to_string_lossy()
                    .into_owned(),
                name,
                traces,
            });
        }
    }
    items
}

/// The tests that are not requirement tests, by name. Any other untraced
/// test fails the gate.
const NOT_REQUIREMENT_TESTS: [&str; 2] = [
    // The generator's self-check; FR-096-AC-13's row is `tests/docs.rs`'s
    // tc_1271 over the published page.
    "registry_doc_renders_every_code_with_severity_blocking_and_owner",
    // The child half of tc_1280 (`tests/write.rs`): an `#[ignore]`d body the
    // traced parent re-executes in a scrubbed environment.
    "tc_1280_child",
];

#[trace("TC-1327", "NFR-033-AC-8")]
#[test]
fn tc_1327_every_requirement_test_carries_trace_and_tc_name_and_every_id_is_in_the_matrix() {
    let items = test_items();
    assert!(items.len() > 100, "{} tests found", items.len());
    let matrix = read(&workspace_dir().join("spec/tests.md"));
    let in_matrix = |id: &str| matrix.contains(&format!("| {id} |"));
    for id in 1200..=1329 {
        assert!(
            in_matrix(&format!("TC-{id}")),
            "TC-{id} is not in spec/tests.md"
        );
    }

    let mut problems = Vec::new();
    for item in &items {
        if NOT_REQUIREMENT_TESTS.contains(&item.name.as_str()) {
            assert!(
                item.traces.is_empty(),
                "{}::{} is listed as a non-requirement test but is traced",
                item.file,
                item.name
            );
            continue;
        }
        let prefix: Option<String> = item
            .name
            .strip_prefix("tc_")
            .and_then(|r| r.get(..4))
            .filter(|d| d.chars().all(|c| c.is_ascii_digit()))
            .filter(|_| item.name.as_bytes().get(7) == Some(&b'_'))
            .map(|d| format!("TC-{d}"));
        let Some(named) = prefix else {
            problems.push(format!(
                "{}::{} is not named tc_NNNN_",
                item.file, item.name
            ));
            continue;
        };
        if item.traces.is_empty() {
            problems.push(format!("{}::{} carries no #[trace]", item.file, item.name));
            continue;
        }
        for (tc, criterion) in &item.traces {
            // A test deciding several rows is named for its first and names
            // every other as a `tc_NNNN` token (`tc_1243_and_tc_1251_…`).
            let token = format!("tc_{}", &tc[3..]);
            if tc != &named && !item.name.contains(&token) {
                problems.push(format!(
                    "{}::{} traces {tc} but its name carries neither {named} nor {token}",
                    item.file, item.name
                ));
            }
            let ok = criterion
                .rsplit_once('-')
                .and_then(|(head, n)| n.chars().all(|c| c.is_ascii_digit()).then_some(head))
                .and_then(|head| head.rsplit_once('-'))
                .is_some_and(|(req, kind)| {
                    (kind == "AC" || kind == "CON")
                        && req.split_once('-').is_some_and(|(p, n)| {
                            p.chars().all(|c| c.is_ascii_uppercase())
                                && n.chars().all(|c| c.is_ascii_digit())
                        })
                });
            if !ok {
                problems.push(format!(
                    "{}::{} traces `{criterion}`, not an <FR|NFR|US>-NNN-AC-N form",
                    item.file, item.name
                ));
            }
            if !in_matrix(tc) {
                problems.push(format!(
                    "{}::{} names {tc}, absent from spec/tests.md",
                    item.file, item.name
                ));
            }
        }
    }
    assert!(problems.is_empty(), "{}", problems.join("\n"));
}
