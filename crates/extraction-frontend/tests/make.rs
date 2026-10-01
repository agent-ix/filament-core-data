//! FR-099-AC-6: the `extraction-frontend-deny` and `-audit` Make targets,
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
//! (which is `cargo test -p agent-ix-extraction-frontend --locked
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
