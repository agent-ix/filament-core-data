//! FR-099 `lift` and `inspect` through the built binary
//! (`CARGO_BIN_EXE_extraction-frontend`): exit codes, the files a lift
//! leaves, the sidecar renames, and `inspect`'s listing.

use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

mod common;

use common::{business_module, edge_vocabulary, fixture};
use ix_trace_rs::trace;
use serde_json::Value;

/// The document's default file name in a scratch directory.
const OUT: &str = "semantic-ir.json";

/// The engine's non-blocking advisory for FR-006's `ocl` clause in
/// `config-version-table`: `ocl` is carried by clause id, unchecked.
const OCL_UNCHECKED: &str = "agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC: semantic.clause-language-unchecked: clause immutable: language ocl is carried unchecked (spec/functional/FR-006-config-version-entity.md:38:1)";

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
}

fn run(args: &[OsString]) -> Output {
    bin()
        .args(args)
        .output()
        .expect("spawn extraction-frontend")
}

fn os(s: impl Into<OsString>) -> OsString {
    s.into()
}

/// `lift --bundle <bundle> --module ... --module ... --out <out>` with both
/// module roots every fixture lift needs.
fn lift_args(bundle: &Path, out: &Path) -> Vec<OsString> {
    vec![
        os("lift"),
        os("--bundle"),
        os(bundle),
        os("--module"),
        os(business_module()),
        os("--module"),
        os(edge_vocabulary()),
        os("--out"),
        os(out),
    ]
}

fn code(output: &Output) -> i32 {
    output.status.code().expect("exit code")
}

fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

fn stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).into_owned()
}

/// The names of the files directly under `dir`, sorted.
fn files(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names
}

/// Every file under `root`, recursively, with its bytes, in path order.
fn tree(root: &Path) -> Vec<(PathBuf, Vec<u8>)> {
    fn walk(dir: &Path, out: &mut Vec<(PathBuf, Vec<u8>)>) {
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .collect();
        entries.sort();
        for entry in entries {
            if entry.is_dir() {
                walk(&entry, out);
            } else {
                out.push((entry.clone(), fs::read(&entry).expect("read")));
            }
        }
    }
    let mut out = Vec::new();
    walk(root, &mut out);
    out
}

#[trace("TC-1295", "FR-099-AC-1")]
#[test]
fn tc_1295_lift_writes_four_files_and_the_sidecar_options_rename_them() {
    let dir = tempfile::tempdir().expect("tempdir");
    let out = dir.path().join(OUT);
    let output = run(&lift_args(&fixture("config-version-table"), &out));
    assert_eq!(code(&output), 0, "stderr:\n{}", stderr(&output));
    assert_eq!(
        files(dir.path()),
        [
            "semantic-ir.json",
            "semantic-ir.json.diagnostics.json",
            "semantic-ir.json.fingerprint",
            "semantic-ir.json.provenance.json",
        ]
    );
    // IR v1.2 represents this fixture without a representability loss: the
    // one line is the engine's advisory that FR-006's `ocl` clause is carried
    // unchecked (quire-rs FR-071; `quire` is the only checked language).
    let lines: Vec<&str> = output
        .stderr
        .split(|b| *b == b'\n')
        .filter(|l| !l.is_empty())
        .map(|l| std::str::from_utf8(l).expect("utf-8"))
        .collect();
    assert_eq!(lines, [OCL_UNCHECKED], "{lines:?}");

    let renamed = tempfile::tempdir().expect("tempdir");
    let out2 = renamed.path().join(OUT);
    let mut args = lift_args(&fixture("config-version-table"), &out2);
    args.extend([
        os("--diagnostics"),
        os(renamed.path().join("d.json")),
        os("--provenance"),
        os(renamed.path().join("p.json")),
    ]);
    let output = run(&args);
    assert_eq!(code(&output), 0, "stderr:\n{}", stderr(&output));
    assert_eq!(
        files(renamed.path()),
        [
            "d.json",
            "p.json",
            "semantic-ir.json",
            "semantic-ir.json.fingerprint"
        ]
    );
    assert_eq!(fs::read(&out).expect("doc"), fs::read(&out2).expect("doc"));
    assert_eq!(
        fs::read(dir.path().join("semantic-ir.json.diagnostics.json")).expect("d"),
        fs::read(renamed.path().join("d.json")).expect("d")
    );
    assert_eq!(
        fs::read(dir.path().join("semantic-ir.json.provenance.json")).expect("p"),
        fs::read(renamed.path().join("p.json")).expect("p")
    );
}

#[trace("TC-1296", "FR-099-AC-2")]
#[test]
fn tc_1296_a_blocking_lift_exits_1_with_the_sidecar_and_refusals_exit_2_writing_nothing() {
    // Blocking: exit 1, the diagnostics sidecar alone.
    let dir = tempfile::tempdir().expect("tempdir");
    let output = run(&lift_args(
        &fixture("negatives/UNRESOLVED_TYPE_TOKEN"),
        &dir.path().join(OUT),
    ));
    assert_eq!(code(&output), 1, "stderr:\n{}", stderr(&output));
    assert_eq!(files(dir.path()), ["semantic-ir.json.diagnostics.json"]);
    assert!(stderr(&output).contains("agent-ix.extraction-frontend.UNRESOLVED_TYPE_TOKEN: "));

    // No `--module`: exit 2 naming the option; nothing written.
    let dir = tempfile::tempdir().expect("tempdir");
    let output = run(&[
        os("lift"),
        os("--bundle"),
        os(fixture("config-version-table")),
        os("--out"),
        os(dir.path().join(OUT)),
    ]);
    assert_eq!(code(&output), 2, "stderr:\n{}", stderr(&output));
    assert!(stderr(&output).contains("--module"), "{}", stderr(&output));
    assert_eq!(files(dir.path()), Vec::<String>::new());

    // A module without a `semantic` block: exit 2, nothing written.
    let dir = tempfile::tempdir().expect("tempdir");
    let bundle = fixture("negatives/MODULE_WITHOUT_SEMANTIC_BLOCK");
    let output = run(&[
        os("lift"),
        os("--bundle"),
        os(&bundle),
        os("--module"),
        os(bundle.join("modules/no-semantic")),
        os("--out"),
        os(dir.path().join(OUT)),
    ]);
    assert_eq!(code(&output), 2, "stderr:\n{}", stderr(&output));
    assert!(
        stderr(&output).contains("agent-ix.extraction-frontend.MODULE_WITHOUT_SEMANTIC_BLOCK: ")
    );
    assert_eq!(files(dir.path()), Vec::<String>::new());

    // `--out` under the bundle root: exit 2, the bundle byte-unchanged.
    let bundle = fixture("config-version-table");
    let before = tree(&bundle);
    let output = run(&lift_args(&bundle, &bundle.join(OUT)));
    assert_eq!(code(&output), 2, "stderr:\n{}", stderr(&output));
    assert!(stderr(&output).contains("agent-ix.extraction-frontend.OUTPUT_UNWRITABLE: "));
    assert_eq!(tree(&bundle), before);
}

#[trace("TC-1297", "FR-099-AC-3")]
#[test]
fn tc_1297_inspect_lists_every_type_in_order_and_rejects_a_document_without_contract_version() {
    let dir = tempfile::tempdir().expect("tempdir");
    let out = dir.path().join(OUT);
    let output = run(&lift_args(&fixture("business"), &out));
    assert_eq!(code(&output), 0, "stderr:\n{}", stderr(&output));
    let document: Value = serde_json::from_slice(&fs::read(&out).expect("doc")).expect("json");
    let expected: Vec<String> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .map(|t| {
            format!(
                "{} {} {}",
                t["identity"].as_str().expect("identity"),
                t["kind"].as_str().expect("kind"),
                t["displayName"].as_str().expect("displayName")
            )
        })
        .collect();
    assert!(expected.len() > 1, "{expected:?}");

    let output = run(&[os("inspect"), os("--ir"), os(&out)]);
    assert_eq!(code(&output), 0, "stderr:\n{}", stderr(&output));
    let lines: Vec<String> = stdout(&output).lines().map(str::to_string).collect();
    assert_eq!(lines, expected);

    let mut headless = document.clone();
    headless
        .as_object_mut()
        .expect("object")
        .remove("contractVersion")
        .expect("contractVersion present");
    let path = dir.path().join("headless.json");
    fs::write(&path, serde_json::to_vec(&headless).expect("json")).expect("write");
    let output = run(&[os("inspect"), os("--ir"), os(&path)]);
    assert_eq!(code(&output), 1, "stderr:\n{}", stderr(&output));
    assert!(stderr(&output)
        .lines()
        .all(|l| l.starts_with("agent-ix.extraction-frontend.INVALID_IR: ")));
    assert_eq!(stdout(&output), "");
}

#[trace("TC-1268", "FR-096-AC-10")]
#[test]
fn tc_1268_a_blocking_lift_leaves_out_untouched_and_a_warning_only_lift_writes_it() {
    let blocking = fixture("negatives/UNRESOLVED_TYPE_TOKEN");

    // Fresh `--out`: absent after exit 1, with its fingerprint and provenance.
    let dir = tempfile::tempdir().expect("tempdir");
    let out = dir.path().join(OUT);
    let output = run(&lift_args(&blocking, &out));
    assert_eq!(code(&output), 1, "stderr:\n{}", stderr(&output));
    assert_eq!(files(dir.path()), ["semantic-ir.json.diagnostics.json"]);

    // Pre-existing `--out`, fingerprint and provenance: byte-unchanged.
    let dir = tempfile::tempdir().expect("tempdir");
    let out = dir.path().join(OUT);
    let stale: [(&str, &[u8]); 3] = [
        ("semantic-ir.json", b"stale document"),
        ("semantic-ir.json.fingerprint", b"stale fingerprint"),
        ("semantic-ir.json.provenance.json", b"stale provenance"),
    ];
    for (name, bytes) in stale {
        fs::write(dir.path().join(name), bytes).expect("write");
    }
    let output = run(&lift_args(&blocking, &out));
    assert_eq!(code(&output), 1, "stderr:\n{}", stderr(&output));
    for (name, bytes) in stale {
        assert_eq!(
            fs::read(dir.path().join(name)).expect("read"),
            bytes,
            "{name}"
        );
    }
    let diagnostics: Value = serde_json::from_slice(
        &fs::read(dir.path().join("semantic-ir.json.diagnostics.json")).expect("sidecar"),
    )
    .expect("json");
    assert!(diagnostics
        .as_array()
        .expect("list")
        .iter()
        .any(|d| d["blocking"] == Value::Bool(true)));

    // The v1.2 fixture succeeds with all four files and only the advisory
    // that its `ocl` clause is carried unchecked.
    let dir = tempfile::tempdir().expect("tempdir");
    let output = run(&lift_args(
        &fixture("config-version-table"),
        &dir.path().join(OUT),
    ));
    assert_eq!(code(&output), 0, "stderr:\n{}", stderr(&output));
    assert_eq!(stderr(&output).trim_end(), OCL_UNCHECKED);
    assert_eq!(files(dir.path()).len(), 4);
}
