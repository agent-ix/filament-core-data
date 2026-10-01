//! NFR-033: qualified toolchain and licensed dependencies.
//!
//! These tests read the crate manifest, the workspace pins, the lock, the
//! licence files and the vendored module fixture, and assert the posture
//! NFR-033 fixes. They deliberately parse the manifest as text rather than
//! through `cargo metadata`, so a scratch copy of the manifest with a planted
//! caret specifier (pointed at through `EXTRACTION_FRONTEND_MANIFEST`) turns
//! the test red without touching the tree.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use ix_trace_rs::trace;

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

fn cargo() -> Command {
    let mut cmd = Command::new("cargo");
    cmd.current_dir(workspace_dir());
    cmd
}

/// Every third-party package reachable from this crate over normal and build
/// edges (dev edges excluded) on this host, as `(name, version) -> licence`,
/// straight from `cargo tree --locked --edges normal,build` — the
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
        "cargo tree --locked failed:\n{}",
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
fn tc_1320_manifest_pins_toolchain() {
    let manifest = manifest_text();
    let package = section(&manifest, "[package]");
    assert_eq!(
        key(&package, "name").as_deref(),
        Some(&*format!("\"{PACKAGE}\""))
    );
    // CR-036-1: the supported minimum is the workspace's (cargo enforces every
    // member's `rust-version` under `--workspace`, so a member-level 1.98.1
    // would break `make rust-build` on the workspace channel); the
    // qualification compiler is the pinned `rust-toolchain.toml` channel.
    assert_eq!(
        key(&package, "rust-version.workspace").as_deref(),
        Some("true"),
        "the crate inherits the workspace rust-version"
    );
    assert!(
        key(&package, "rust-version").is_none(),
        "no member-level rust-version override"
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
        "cargo build --locked --offline failed:\n{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

// ---------------------------------------------------------------------------
// Task-138: the whole-crate gates (NFR-033-AC-4, AC-5, AC-7, AC-8)
// ---------------------------------------------------------------------------

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
        "cargo clippy failed:\n{}",
        String::from_utf8_lossy(&clippy.stderr)
    );
    let fmt = cargo()
        .args(["fmt", "-p", PACKAGE, "--", "--check"])
        .output()
        .expect("spawn cargo fmt");
    assert!(
        fmt.status.success(),
        "cargo fmt --check failed:\n{}{}",
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
    for id in (1200..=1329).filter(|id| ![1254, 1285, 1322].contains(id)) {
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
