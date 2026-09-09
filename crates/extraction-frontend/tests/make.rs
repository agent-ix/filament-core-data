//! FR-099-AC-4 and FR-099-AC-6: the `extraction-frontend-*` Make targets,
//! rehearsed as `Static` evidence.
//!
//! Every test here is `#[ignore]`d: `make extraction-frontend-test` runs
//! `cargo test`, so a test that ran `make extraction-frontend-test` from
//! inside `cargo test` would recurse. Run them deliberately:
//!
//! ```text
//! make extraction-frontend-evidence
//! ```
//!
//! (which is `cargo +1.98.1 test -p agent-ix-extraction-frontend --locked
//! --offline --no-fail-fast -- --ignored` under the Makefile's
//! `CARGO_TARGET_DIR`, skipping only the tests blocked on open issues). They
//! spawn `make -C <workspace>` and assert on its exit status and
//! output; the gates they drive at a scratch copy are pointed there through
//! the `EXTRACTION_FIXTURES`, `EXTRACTION_MANIFEST` and `EXTRACTION_LOCKFILE`
//! Make variables, so nothing here writes into the tree.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use ix_trace_rs::trace;

const TOOLCHAIN: &str = "1.98.1";
const TARGETS: [&str; 5] = [
    "extraction-frontend-build",
    "extraction-frontend-test",
    "extraction-frontend-check",
    "extraction-frontend-deny",
    "extraction-frontend-audit",
];

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

/// `make -C <workspace> <target> <VAR=value>...`.
fn make(target: &str, assignments: &[String]) -> Output {
    Command::new("make")
        .arg("-C")
        .arg(workspace_dir())
        .arg(target)
        .args(assignments)
        .output()
        .expect("spawn make")
}

fn text(output: &Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

/// Copy `src` into `dst` recursively.
fn copy_tree(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).expect("create");
    for entry in fs::read_dir(src).expect("read_dir") {
        let entry = entry.expect("entry");
        let target = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), &target).expect("copy");
        }
    }
}

/// A scratch fixture inventory holding one bundle and both module roots,
/// with its goldens installed by `lift --write-goldens --staging`.
fn scratch_inventory(root: &Path) -> PathBuf {
    let fixtures = root.join("fixtures");
    for name in [
        "config-version-table",
        "modules/spec-objects-business",
        "modules/edge-vocabulary",
    ] {
        copy_tree(
            &crate_dir().join("fixtures").join(name),
            &fixtures.join(name),
        );
    }
    let staging = root.join("staging");
    let output = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .arg("lift")
        .arg("--write-goldens")
        .arg("--fixtures")
        .arg(&fixtures)
        .arg("--staging")
        .arg(&staging)
        .output()
        .expect("spawn extraction-frontend");
    assert!(output.status.success(), "{}", text(&output));
    let expected = fixtures.join("config-version-table/expected");
    let mut names: Vec<String> = fs::read_dir(&expected)
        .expect("expected")
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    assert_eq!(
        names,
        [
            "diagnostics.json",
            "provenance.json",
            "semantic-ir.json",
            "semantic-ir.json.fingerprint"
        ]
    );
    // Installed by rename: the staging copy is gone.
    assert_eq!(
        fs::read_dir(staging.join("config-version-table"))
            .expect("staged")
            .count(),
        0
    );
    fixtures
}

#[trace("TC-1298", "FR-099-AC-4")]
#[test]
#[ignore = "Static evidence: drives make, which drives cargo test; run with --ignored"]
fn tc_1298_every_make_target_succeeds_on_the_toolchain_and_fails_naming_an_absent_one() {
    for target in TARGETS {
        let output = make(target, &[format!("EXTRACTION_TOOLCHAIN={TOOLCHAIN}")]);
        assert!(output.status.success(), "{target}:\n{}", text(&output));
    }
    for target in TARGETS {
        let output = make(target, &["EXTRACTION_TOOLCHAIN=0.0.0".to_string()]);
        assert!(
            !output.status.success(),
            "{target} skipped:\n{}",
            text(&output)
        );
        let text = text(&output);
        assert!(text.contains("0.0.0"), "{target}:\n{text}");
        assert!(
            text.contains("failure rather than a skip"),
            "{target}:\n{text}"
        );
    }

    // Falsification of `-check`: on a scratch inventory the target passes,
    // and after a one-byte edit to one golden it fails naming the file.
    let scratch = tempfile::tempdir().expect("tempdir");
    let fixtures = scratch_inventory(scratch.path());
    let assignment = format!("EXTRACTION_FIXTURES={}", fixtures.display());
    let output = make(
        "extraction-frontend-check",
        std::slice::from_ref(&assignment),
    );
    assert!(output.status.success(), "{}", text(&output));
    let golden = fixtures.join("config-version-table/expected/semantic-ir.json");
    let mut bytes = fs::read(&golden).expect("golden");
    bytes[0] ^= 0x01;
    fs::write(&golden, bytes).expect("write");
    let output = make(
        "extraction-frontend-check",
        std::slice::from_ref(&assignment),
    );
    assert!(!output.status.success(), "{}", text(&output));
    let text = text(&output);
    assert!(
        text.contains("config-version-table/expected/semantic-ir.json"),
        "{text}"
    );
    // The check writes nothing under the inventory besides what the edit did.
    assert!(!fixtures
        .join("config-version-table/expected/semantic-ir.json.tmp")
        .exists());
}

/// A scratch workspace that `cargo metadata` resolves: the root manifest
/// and lock, each member's manifest with a stub source, and the crate's
/// `deny.toml`.
fn scratch_workspace(root: &Path) {
    for name in ["Cargo.toml", "Cargo.lock"] {
        fs::copy(workspace_dir().join(name), root.join(name)).expect("copy");
    }
    for member in ["semantic-ir", "conformance-adapter", "extraction-frontend"] {
        let src = workspace_dir().join("crates").join(member);
        let dst = root.join("crates").join(member);
        fs::create_dir_all(dst.join("src")).expect("create");
        fs::copy(src.join("Cargo.toml"), dst.join("Cargo.toml")).expect("copy");
        fs::write(dst.join("src/lib.rs"), "").expect("write");
    }
    let frontend = root.join("crates/extraction-frontend");
    fs::copy(crate_dir().join("deny.toml"), frontend.join("deny.toml")).expect("copy");
    fs::write(frontend.join("src/main.rs"), "fn main() {}").expect("write");
}

#[trace("TC-1349", "FR-099-AC-6")]
#[test]
#[ignore = "Static evidence: drives make and the network-backed cargo audit; run with --ignored"]
fn tc_1349_deny_and_audit_fail_on_a_planted_licence_or_yanked_version_and_pass_committed() {
    for target in ["extraction-frontend-deny", "extraction-frontend-audit"] {
        let output = make(target, &[]);
        assert!(output.status.success(), "{target}:\n{}", text(&output));
    }

    // A path crate under a licence outside the allow list, planted as a
    // dependency in a scratch copy of the workspace.
    let scratch = tempfile::tempdir().expect("tempdir");
    scratch_workspace(scratch.path());
    let planted = scratch.path().join("crates/planted");
    fs::create_dir_all(planted.join("src")).expect("create");
    fs::write(
        planted.join("Cargo.toml"),
        "[package]\nname = \"planted\"\nversion = \"0.1.0\"\nedition = \"2021\"\nlicense = \"GPL-3.0-only\"\n",
    )
    .expect("write");
    fs::write(planted.join("src/lib.rs"), "").expect("write");
    let manifest = scratch.path().join("crates/extraction-frontend/Cargo.toml");
    let mut text_manifest = fs::read_to_string(&manifest).expect("manifest");
    text_manifest = text_manifest.replacen(
        "[dependencies]\n",
        "[dependencies]\nplanted = { path = \"../planted\" }\n",
        1,
    );
    assert!(text_manifest.contains("planted = {"), "{text_manifest}");
    fs::write(&manifest, text_manifest).expect("write");
    let output = make(
        "extraction-frontend-deny",
        &[format!("EXTRACTION_MANIFEST={}", manifest.display())],
    );
    assert!(!output.status.success(), "{}", text(&output));
    let out = text(&output);
    assert!(
        out.contains("GPL-3.0-only") && out.contains("planted"),
        "{out}"
    );

    // A yanked version planted in a scratch copy of the lock: `cfg-if`
    // 1.0.2 is yanked on crates.io (the local index says so).
    let lock = scratch.path().join("Cargo.lock");
    let text_lock = fs::read_to_string(&lock).expect("lock");
    let planted_lock = text_lock.replacen(
        "name = \"cfg-if\"\nversion = \"1.0.4\"",
        "name = \"cfg-if\"\nversion = \"1.0.2\"",
        1,
    );
    assert_ne!(planted_lock, text_lock, "the lock pins cfg-if 1.0.4");
    fs::write(&lock, planted_lock).expect("write");
    let output = make(
        "extraction-frontend-audit",
        &[format!("EXTRACTION_LOCKFILE={}", lock.display())],
    );
    assert!(!output.status.success(), "{}", text(&output));
    let out = text(&output);
    assert!(out.contains("cfg-if") && out.contains("yanked"), "{out}");
}
