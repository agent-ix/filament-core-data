//! NFR-032: the non-disruption gates over this change's own path set, and
//! the FR-099 change-set and reach constraints (TC-1299, TC-1330).
//!
//! The range is never computed here. Every question about *which* paths
//! this change owns goes through `scripts/extraction-frontend-harness.mjs`,
//! which imports `changeRange` / `changedPathsUnion` / `mergeCommitsIn`
//! from `test/changed-paths.ts` — both ends of the range resolve from the
//! two sentinel artifacts, and the set is the union of per-commit name
//! lists over `--first-parent --no-merges`. A test that reimplemented that
//! logic would be a sixth copy of the defect the helper exists to retire.
//!
//! Three rows are `Static` evidence rather than `cargo test` rows
//! (NFR-032 Verification: "none is a `cargo test`"): the rehearsals run
//! the whole suite, or rewrite history in a scratch clone, and are
//! `#[ignore]`d here so the binding is a symbol and the run is deliberate:
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

use common::{crate_dir, git, scratch_dir, target_dir, workspace_dir};
use ix_trace_rs::trace;
use serde_json::Value;

const TOOLCHAIN: &str = "1.98.1";
const PACKAGE: &str = "agent-ix-extraction-frontend";

/// The two sentinels NFR-032 names; the harness carries the same pair.
const SENTINELS: [&str; 2] = [
    "spec/usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md",
    "docs/semantic-data-system/extraction-frontend-diagnostics.md",
];

/// FR-098's own change set outside the crate (FR-098-CON-1, TC-1294).
fn fr098_path(path: &str) -> bool {
    path == "test/fixtures/compiler/shared/cases.json"
        || path.starts_with("test/fixtures/compiler/shared/spec-bundle/")
        || path.starts_with("test/fixtures/compiler/shared/typespec/records-and-scalars/")
}

/// This ticket's own spec, plan and review artifacts.
fn ticket_artifact(path: &str) -> bool {
    path.starts_with("spec/") || path.starts_with("plan/") || path.starts_with("reviews/")
}

fn harness_path() -> PathBuf {
    crate_dir().join("scripts/extraction-frontend-harness.mjs")
}

/// `node scripts/extraction-frontend-harness.mjs <args>` in the workspace.
fn harness(args: &[&str]) -> Output {
    Command::new("node")
        .arg(harness_path())
        .args(args)
        .current_dir(workspace_dir())
        .output()
        .expect("spawn node: the harness needs node on PATH")
}

fn text(output: &Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

/// The parsed JSON a harness verb printed, with its exit status.
fn harness_json(args: &[&str]) -> (bool, Value) {
    let output = harness(args);
    let value: Value = serde_json::from_slice(&output.stdout).unwrap_or_else(|e| {
        panic!(
            "harness {} printed no JSON ({e}):\n{}",
            args.join(" "),
            text(&output)
        )
    });
    (output.status.success(), value)
}

/// The change range: `(base, tip, squashed)`.
fn range() -> (String, String, bool) {
    let (ok, value) = harness_json(&["change-range"]);
    assert!(ok, "change-range failed: {value}");
    (
        value["base"].as_str().expect("base").to_string(),
        value["tip"].as_str().expect("tip").to_string(),
        value["squashed"].as_bool().expect("squashed"),
    )
}

fn strings(value: &Value) -> Vec<String> {
    value
        .as_array()
        .expect("array")
        .iter()
        .map(|v| v.as_str().expect("string").to_string())
        .collect()
}

/// The gate report and whether it passed.
fn gate() -> (bool, Value) {
    harness_json(&["gate"])
}

/// A path's bytes *as this change left them* (`contentAsChanged` of
/// `test/changed-paths.ts`): the tip's blob once the range is one squash
/// commit, the working tree while the change is in flight. Absent → `None`.
fn as_changed(path: &str) -> Option<Vec<u8>> {
    let (_, tip, squashed) = range();
    if squashed {
        return git_bytes(&["show", &format!("{tip}:{path}")]);
    }
    fs::read(workspace_dir().join(path)).ok()
}

fn at_base(path: &str) -> Option<Vec<u8>> {
    let (base, ..) = range();
    git_bytes(&["show", &format!("{base}:{path}")])
}

fn git_bytes(args: &[&str]) -> Option<Vec<u8>> {
    let output = Command::new("git")
        .args(args)
        .current_dir(workspace_dir())
        .output()
        .expect("spawn git");
    output.status.success().then_some(output.stdout)
}

/// `git diff --no-renames --name-only` of `pathspecs` between the base and
/// the change's end state (the tip when squashed, the working tree before).
fn changed_against_base(pathspecs: &[&str]) -> Vec<String> {
    let (base, tip, squashed) = range();
    let mut args = vec!["diff", "--no-renames", "--name-only", base.as_str()];
    if squashed {
        args.push(tip.as_str());
    }
    args.push("--");
    args.extend(pathspecs);
    git(&workspace_dir(), &args)
        .unwrap_or_else(|e| panic!("{e}"))
        .lines()
        .map(str::to_string)
        .collect()
}

fn lines(bytes: &[u8]) -> Vec<String> {
    String::from_utf8_lossy(bytes)
        .lines()
        .map(str::to_string)
        .collect()
}

fn read(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()))
}

// ---------------------------------------------------------------------------
// NFR-032-AC-1: the gate over this change's own set
// ---------------------------------------------------------------------------

#[trace("TC-1310", "NFR-032-AC-1")]
#[test]
fn tc_1310_every_path_of_the_change_set_is_permitted_and_none_is_prohibited() {
    let (ok, report) = gate();
    let paths = strings(&report["paths"]);
    assert!(
        !paths.is_empty(),
        "an empty set is a gate that cannot fail: {report}"
    );
    assert_eq!(report["prohibited"], Value::Array(vec![]), "{report}");
    assert_eq!(report["unclassified"], Value::Array(vec![]), "{report}");
    assert_eq!(
        report["permitted"].as_u64(),
        Some(paths.len() as u64),
        "{report}"
    );
    assert!(ok, "the gate verb exited non-zero: {report}");
    // Both sentinels are in the set: the range covers the work it exists
    // to cover. (Before the closing commit the docs sentinel is in the
    // working tree, which the union folds in.)
    for sentinel in SENTINELS {
        assert!(
            paths.iter().any(|p| p == sentinel),
            "{sentinel} is not in the set: {paths:?}"
        );
    }
    // The set is the first-parent, no-merge union: it carries the crate
    // and the ticket artifacts and nothing under a prohibited root.
    assert!(paths
        .iter()
        .any(|p| p.starts_with("crates/extraction-frontend/src/")));
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
// NFR-032-AC-3: the root manifest and the toolchain pins
// ---------------------------------------------------------------------------

#[trace("TC-1312", "NFR-032-AC-3")]
#[test]
fn tc_1312_root_cargo_toml_differs_only_in_members_and_toolchain_pins_are_unchanged() {
    let base = lines(&at_base("Cargo.toml").expect("Cargo.toml at base"));
    let head = lines(&as_changed("Cargo.toml").expect("Cargo.toml as changed"));
    let is_members = |l: &String| l.trim_start().starts_with("members");
    assert_eq!(base.iter().filter(|l| is_members(l)).count(), 1);
    assert_eq!(head.iter().filter(|l| is_members(l)).count(), 1);
    let base_members = base.iter().find(|l| is_members(l)).expect("members");
    let head_members = head.iter().find(|l| is_members(l)).expect("members");
    assert_ne!(base_members, head_members, "the members line is the change");
    assert!(head_members.contains("\"crates/extraction-frontend\""));
    let rewritten: Vec<String> = base
        .iter()
        .map(|l| {
            if is_members(l) {
                head_members.clone()
            } else {
                l.clone()
            }
        })
        .collect();
    assert_eq!(
        rewritten, head,
        "a line other than `members` differs from the base"
    );

    assert_eq!(
        at_base("rust-toolchain.toml"),
        as_changed("rust-toolchain.toml"),
        "rust-toolchain.toml changed"
    );
    let rust_version = |ls: &[String]| {
        ls.iter()
            .find(|l| l.trim_start().starts_with("rust-version"))
            .cloned()
            .expect("workspace rust-version")
    };
    assert_eq!(rust_version(&base), rust_version(&head));
}

// ---------------------------------------------------------------------------
// NFR-032-AC-4: the shared-case manifest and the frozen seam
// ---------------------------------------------------------------------------

#[trace("TC-1313", "NFR-032-AC-4")]
#[test]
fn tc_1313_cases_json_differs_only_by_spec_bundle_reason_and_the_added_case_and_shared_is_unchanged(
) {
    const CASES: &str = "test/fixtures/compiler/shared/cases.json";
    let base: Value = serde_json::from_slice(&at_base(CASES).expect("cases.json at base"))
        .expect("base cases.json");
    let head: Value = serde_json::from_slice(&as_changed(CASES).expect("cases.json as changed"))
        .expect("cases.json");

    let cases = |v: &Value| -> BTreeMap<String, Value> {
        v["cases"]
            .as_array()
            .expect("cases")
            .iter()
            .map(|c| (c["id"].as_str().expect("id").to_string(), c.clone()))
            .collect()
    };
    let base_cases = cases(&base);
    let head_cases = cases(&head);
    let mut expected_ids: BTreeSet<&String> = base_cases.keys().collect();
    let added = "records-and-scalars".to_string();
    expected_ids.insert(&added);
    assert_eq!(head_cases.keys().collect::<BTreeSet<_>>(), expected_ids);
    for (id, base_case) in &base_cases {
        let mut stripped = head_cases[id].clone();
        stripped["sources"]
            .as_object_mut()
            .expect("sources")
            .remove("spec-bundle");
        stripped.as_object_mut().expect("case").remove("reason");
        assert_eq!(
            &stripped, base_case,
            "case {id} differs outside its spec-bundle and reason members"
        );
    }
    // Every other top-level member is unchanged. `$comment` is the one
    // exception the test admits: Task-136 rewrote the sentence that
    // reserved the column for this ticket, which NFR-032-AC-4 does not
    // name (reported with Task-138).
    for (key, value) in base.as_object().expect("object") {
        if key == "cases" || key == "$comment" {
            continue;
        }
        assert_eq!(&head[key], value, "top-level member {key} changed");
    }
    assert_eq!(
        head.as_object().expect("object").keys().collect::<Vec<_>>(),
        base.as_object().expect("object").keys().collect::<Vec<_>>()
    );

    // Every pre-existing path under shared/** is byte-unchanged; the only
    // additions under typespec/ are the records-and-scalars case.
    let (base_commit, ..) = range();
    let pre_existing: BTreeSet<String> = git(
        &workspace_dir(),
        &[
            "ls-tree",
            "-r",
            "--name-only",
            &base_commit,
            "--",
            "test/fixtures/compiler/shared",
        ],
    )
    .unwrap_or_else(|e| panic!("{e}"))
    .lines()
    .map(str::to_string)
    .collect();
    assert!(pre_existing.contains(CASES));
    let changed = changed_against_base(&["test/fixtures/compiler/shared"]);
    let changed_pre_existing: Vec<&String> = changed
        .iter()
        .filter(|p| pre_existing.contains(*p) && *p != CASES)
        .collect();
    assert!(
        changed_pre_existing.is_empty(),
        "pre-existing shared paths changed: {changed_pre_existing:?}"
    );
    let added_typespec: Vec<&String> = changed
        .iter()
        .filter(|p| p.starts_with("test/fixtures/compiler/shared/typespec/"))
        .filter(|p| !p.starts_with("test/fixtures/compiler/shared/typespec/records-and-scalars/"))
        .collect();
    assert!(
        added_typespec.is_empty(),
        "files under shared/typespec/ outside records-and-scalars/: {added_typespec:?}"
    );
    assert!(changed_against_base(&["src/compiler/frontend/spec-bundle/frontend.mjs"]).is_empty());
    assert_eq!(
        at_base("src/compiler/frontend/spec-bundle/frontend.mjs"),
        as_changed("src/compiler/frontend/spec-bundle/frontend.mjs"),
        "the spec-bundle seam changed"
    );
}

// ---------------------------------------------------------------------------
// NFR-032-AC-5: a clean tree after the full suite, here and in every corpus
// ---------------------------------------------------------------------------

/// Every corpus repository the fixtures' `PROVENANCE.json` files name, as
/// the checkout `~/dev/<name>` this host keeps (this repository excluded).
fn corpus_checkouts() -> BTreeMap<String, PathBuf> {
    fn walk(dir: &Path, out: &mut BTreeSet<String>) {
        for entry in fs::read_dir(dir).expect("read_dir") {
            let path = entry.expect("entry").path();
            if path.is_dir() {
                walk(&path, out);
            } else if path.file_name().is_some_and(|n| n == "PROVENANCE.json") {
                let value: Value = serde_json::from_str(&read(&path)).expect("PROVENANCE.json");
                if let Some(repository) = value["repository"].as_str() {
                    out.insert(repository.to_string());
                }
            }
        }
    }
    let mut repositories = BTreeSet::new();
    walk(&crate_dir().join("fixtures"), &mut repositories);
    let home = PathBuf::from(std::env::var_os("HOME").expect("HOME"));
    repositories
        .into_iter()
        .filter_map(|url| {
            let name = url.rsplit('/').next().expect("repository name").to_string();
            (name != "filament-core-data").then(|| (name.clone(), home.join("dev").join(&name)))
        })
        .collect()
}

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
fn tc_1314_after_the_full_suite_git_status_is_empty_in_the_fixtures_and_every_corpus_repository() {
    let checkouts = corpus_checkouts();
    assert!(
        checkouts.len() >= 4,
        "the fixtures name at least quire-rs, config-service, spec-objects-business and spec-artifacts-iso: {checkouts:?}"
    );
    for (name, dir) in &checkouts {
        assert!(
            dir.join(".git").exists(),
            "corpus repository {name} has no checkout at {}: the metric cannot be measured",
            dir.display()
        );
    }
    let before: BTreeMap<&String, String> = checkouts
        .iter()
        .map(|(name, dir)| (name, porcelain(dir, &[])))
        .collect();

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
    for (name, dir) in &checkouts {
        let after = porcelain(dir, &[]);
        assert_eq!(
            after, before[name],
            "the suite changed the corpus repository {name}"
        );
        assert_eq!(after, "", "corpus repository {name} is not clean");
    }
}

// ---------------------------------------------------------------------------
// NFR-032-AC-6: publish = false, the licence, and no registry
// ---------------------------------------------------------------------------

/// The `extraction-frontend` block of the root Makefile: from its section
/// header to the next section header or the end of the file.
fn makefile_block() -> Vec<String> {
    let makefile = read(&workspace_dir().join("Makefile"));
    let lines: Vec<&str> = makefile.lines().collect();
    let start = lines
        .iter()
        .position(|l| l.contains("Spec-bundle extraction frontend (issue #36)"))
        .expect("the Makefile block header");
    let start = start.saturating_sub(1);
    // The header is fenced by two `# ----` lines; the block ends at the next
    // such line after the fence, or at the end of the file.
    let end = lines[start + 3..]
        .iter()
        .position(|l| l.starts_with("# ----"))
        .map(|i| i + start + 3)
        .unwrap_or(lines.len());
    lines[start..end].iter().map(|l| l.to_string()).collect()
}

#[trace("TC-1315", "NFR-032-AC-6")]
#[test]
fn tc_1315_every_manifest_in_the_change_set_is_unpublished_and_agpl_and_nothing_names_a_registry() {
    let (_, report) = gate();
    let manifests: Vec<String> = strings(&report["paths"])
        .into_iter()
        .filter(|p| p == "Cargo.toml" || p.ends_with("/Cargo.toml"))
        .collect();
    assert!(
        manifests
            .iter()
            .any(|p| p == "crates/extraction-frontend/Cargo.toml"),
        "{manifests:?}"
    );
    for manifest in &manifests {
        let text = String::from_utf8(as_changed(manifest).expect("manifest")).expect("utf8");
        assert!(
            text.lines().any(|l| l.trim() == "publish = false"),
            "{manifest} lacks publish = false"
        );
        assert!(
            text.lines()
                .any(|l| l.trim() == "license = \"AGPL-3.0-only\""),
            "{manifest} lacks license = \"AGPL-3.0-only\""
        );
    }

    let forbidden = ["cargo publish", "--registry", "--index", "--dry-run"];
    let commands: Vec<String> = makefile_block()
        .into_iter()
        .filter(|l| !l.trim_start().starts_with('#'))
        .filter(|l| l.starts_with('\t') || l.contains(":="))
        .collect();
    assert!(!commands.is_empty());
    for line in &commands {
        for form in forbidden {
            assert!(
                !line.contains(form),
                "the Makefile block names {form}: {line}"
            );
        }
    }
    // Nothing the crate itself runs names a registry either: its sources,
    // its binary, and the harness.
    let mut sources = Vec::new();
    for dir in ["src", "scripts"] {
        for entry in fs::read_dir(crate_dir().join(dir)).expect("read_dir") {
            sources.push(entry.expect("entry").path());
        }
    }
    for path in sources {
        let text = read(&path);
        for form in forbidden {
            assert!(!text.contains(form), "{} names {form}", path.display());
        }
    }
}

// ---------------------------------------------------------------------------
// NFR-032-AC-7..9: the three harness rehearsals (Static evidence)
// ---------------------------------------------------------------------------

fn rehearsal(verb: &str, extra: &[&str]) -> (bool, Value) {
    let scratch = scratch_dir(&format!("change-set/{verb}"));
    let scratch = scratch.to_string_lossy().into_owned();
    let mut args = vec![verb, "--scratch", scratch.as_str()];
    args.extend(extra);
    harness_json(&args)
}

#[trace("TC-1316", "NFR-032-AC-7")]
#[test]
#[ignore = "Static evidence: runs the full suite on the base and the tip in two scratch clones; run with --ignored"]
fn tc_1316_suite_compare_finds_every_pre_existing_row_with_the_same_outcome_on_base_and_head() {
    let (ok, report) = rehearsal("suite-compare", &[]);
    assert!(report["compared"].as_u64().unwrap_or(0) > 0, "{report}");
    assert_eq!(report["differing"], Value::Array(vec![]), "{report}");
    assert_eq!(report["missing"], Value::Array(vec![]), "{report}");
    assert!(ok, "{report}");
}

#[trace("TC-1317", "NFR-032-AC-8")]
#[test]
#[ignore = "Static evidence: reverts the range in a scratch clone and runs the full suite there; run with --ignored"]
fn tc_1317_the_full_suite_passes_on_a_revert_of_the_range() {
    let (ok, report) = rehearsal("revert-rehearsal", &[]);
    assert_eq!(report["treeMatchesBase"], Value::Bool(true), "{report}");
    assert_eq!(report["sentinelsGone"], Value::Bool(true), "{report}");
    assert_eq!(report["suite"]["fail"].as_u64(), Some(0), "{report}");
    assert!(
        report["suite"]["rows"].as_u64().unwrap_or(0) > 0,
        "{report}"
    );
    assert!(ok, "{report}");
}

#[trace("TC-1318", "NFR-032-AC-9")]
#[test]
#[ignore = "Static evidence: builds a synthetic squash-merge history in a scratch clone; run with --ignored"]
fn tc_1318_a_sibling_on_top_does_not_grow_the_set_and_an_unowned_prohibited_path_still_fails() {
    let (ok, report) = rehearsal("accretion-rehearsal", &[]);
    assert_eq!(report["grew"], Value::Array(vec![]), "{report}");
    assert_eq!(
        report["squashed"]["paths"], report["withSibling"]["paths"],
        "{report}"
    );
    assert_eq!(
        report["strayProhibitedCaught"],
        Value::Bool(true),
        "{report}"
    );
    assert!(ok, "{report}");

    // Falsification: a prohibited path planted inside the range fails it.
    let (ok, planted) = rehearsal("accretion-rehearsal", &["--plant-prohibited"]);
    assert!(!ok, "a planted schema/ path passed the gate: {planted}");
    let prohibited = planted["squashed"]["prohibited"]
        .as_array()
        .expect("prohibited");
    assert!(
        prohibited
            .iter()
            .any(|c| c["path"] == "schema/planted-by-the-range.json"),
        "{planted}"
    );
}

// ---------------------------------------------------------------------------
// NFR-032-AC-10: no merges, and the node manifest and lock untouched
// ---------------------------------------------------------------------------

#[trace("TC-1319", "NFR-032-AC-10")]
#[test]
fn tc_1319_no_merge_commit_in_the_range_and_package_json_and_pnpm_lock_are_unchanged() {
    let (ok, merges) = harness_json(&["merge-commits"]);
    assert!(ok);
    assert_eq!(merges, Value::Array(vec![]), "merge commits in the range");
    for path in ["package.json", "pnpm-lock.yaml"] {
        let base = at_base(path).unwrap_or_else(|| panic!("{path} at base"));
        let head = as_changed(path).unwrap_or_else(|| panic!("{path} as changed"));
        assert_eq!(base, head, "{path} changed");
    }
    assert!(changed_against_base(&["package.json", "pnpm-lock.yaml"]).is_empty());
}

// ---------------------------------------------------------------------------
// FR-099-AC-5, FR-099-CON-1, FR-099-CON-2: the change set outside the crate
// ---------------------------------------------------------------------------

#[trace("TC-1299", "FR-099-AC-5")]
#[trace("TC-1299", "FR-099-CON-1")]
#[trace("TC-1299", "FR-099-CON-2")]
#[test]
fn tc_1299_outside_the_crate_and_fr098_the_change_set_is_members_lock_makefile_block_and_docs() {
    let (_, report) = gate();
    let outside: Vec<String> = strings(&report["paths"])
        .into_iter()
        .filter(|p| !p.starts_with("crates/extraction-frontend/"))
        .filter(|p| !fr098_path(p))
        .filter(|p| !ticket_artifact(p))
        .collect();
    assert_eq!(
        outside,
        [
            "Cargo.lock",
            "Cargo.toml",
            "Makefile",
            "THIRD-PARTY-NOTICES.md",
            "docs/semantic-data-system/extraction-frontend-diagnostics.md",
        ]
    );

    // The Makefile change is one contiguous added block, nothing removed.
    let (base, tip, squashed) = range();
    let mut args = vec!["diff", "--no-renames", "-U0", base.as_str()];
    if squashed {
        args.push(tip.as_str());
    }
    args.extend(["--", "Makefile"]);
    let diff = git(&workspace_dir(), &args).unwrap_or_else(|e| panic!("{e}"));
    let hunks = diff.lines().filter(|l| l.starts_with("@@")).count();
    let removed = diff
        .lines()
        .filter(|l| l.starts_with('-') && !l.starts_with("---"))
        .count();
    assert_eq!(
        hunks, 1,
        "the Makefile block is one contiguous hunk:\n{diff}"
    );
    assert_eq!(removed, 0, "the Makefile block removes nothing:\n{diff}");
    let block = makefile_block();
    assert!(block.iter().any(|l| l == "EXTRACTION_TOOLCHAIN ?= 1.98.1"));
    let added: Vec<&str> = diff
        .lines()
        .filter(|l| l.starts_with('+') && !l.starts_with("+++"))
        .map(|l| &l[1..])
        // The blank separator line before the block's fence.
        .skip_while(|l| l.trim().is_empty())
        .collect();
    assert_eq!(added, block, "the hunk is exactly the block");

    // CR-036-8: the root attribution register gains rows for the crates the
    // lock adds and nothing else (NFR-032-AC-1; NFR-023-AC-7 via TC-742).
    let mut args = vec!["diff", "--no-renames", "-U0", base.as_str()];
    if squashed {
        args.push(tip.as_str());
    }
    args.extend(["--", "THIRD-PARTY-NOTICES.md"]);
    let diff = git(&workspace_dir(), &args).unwrap_or_else(|e| panic!("{e}"));
    let removed = diff
        .lines()
        .filter(|l| l.starts_with('-') && !l.starts_with("---"))
        .count();
    assert_eq!(removed, 0, "the notices register removes nothing:\n{diff}");
    let lock = read(&workspace_dir().join("Cargo.lock"));
    let locked: BTreeSet<&str> = lock
        .lines()
        .filter_map(|l| l.strip_prefix("name = \""))
        .map(|l| l.trim_end_matches('"'))
        .collect();
    let unlocked: Vec<&str> = diff
        .lines()
        .filter_map(|l| l.strip_prefix("+| `"))
        .filter_map(|l| l.split('`').next())
        .filter(|name| !locked.contains(name))
        .collect();
    assert!(
        unlocked.is_empty(),
        "notices rows for crates Cargo.lock does not carry: {unlocked:?}"
    );

    // The seven prohibited paths are byte-unchanged.
    let frozen = [
        "package.json",
        "schema",
        "src/compiler",
        "packages",
        "crates/semantic-ir",
        "rust-toolchain.toml",
    ];
    let changed = changed_against_base(&frozen);
    assert!(changed.is_empty(), "frozen paths changed: {changed:?}");
    let rust_version = |bytes: Vec<u8>| {
        lines(&bytes)
            .into_iter()
            .find(|l| l.trim_start().starts_with("rust-version"))
    };
    assert_eq!(
        rust_version(at_base("Cargo.toml").expect("base")),
        rust_version(as_changed("Cargo.toml").expect("head"))
    );
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
