//! FR-097 "Determinism" and "Atomic write and sidecars":
//! what a lift leaves on disk, byte for byte, and what it refuses to
//! touch. The determinism test re-runs this binary as a child with a
//! different working directory and environment; nothing else here reads
//! the environment.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, WireCode};
use agent_ix_extraction_frontend::write::{write_lift, Emission, OutputPaths};
use agent_ix_extraction_frontend::{lift, normalized_digest, validate, LiftOutcome, LiftRequest};
use agent_ix_semantic_ir::json::{parse as parse_reader_json, to_canonical_string};
use common::{business_module, entries, fixture, inspect, lift_fixture, positive_lifts, request};
use ix_trace_rs::trace;
use serde_json::Value;

/// The two files of a lift at `out`, as `(label, path)`.
fn two(request: &LiftRequest) -> [(&'static str, PathBuf); 2] {
    let paths = request.paths();
    [
        ("document", paths.document),
        ("diagnostics", paths.diagnostics),
    ]
}

fn read_all(request: &LiftRequest) -> Vec<(&'static str, Vec<u8>)> {
    two(request)
        .into_iter()
        .map(|(label, path)| {
            (
                label,
                fs::read(&path).unwrap_or_else(|e| panic!("{label} {}: {e}", path.display())),
            )
        })
        .collect()
}

#[trace("TC-PLAT-990-1", "FR-145-AC-3")]
#[test]
fn tc_plat_990_shared_supplementary_plane_golden_is_consumed_and_digest_sidecar_is_exact() {
    let golden: Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/compiler/rfc8785/normalized-supplementary-plane.json"
    ))
    .expect("shared golden JSON");
    let input = serde_json::to_string(&golden["input"]).expect("input JSON");
    let parsed = parse_reader_json(&input).expect("shared golden input parses");
    let expected = golden["expectedBytes"].as_str().expect("expected bytes");
    let canonical = to_canonical_string(&parsed);
    assert_eq!(canonical, expected, "RFC 8785 UTF-16 member ordering");
    assert_eq!(
        normalized_digest(canonical.as_bytes()),
        golden["sha256"].as_str().expect("expected digest")
    );

    let (_dir, request, outcome) = lift_fixture("snapshot-table");
    let LiftOutcome::Written { document, .. } = outcome else {
        panic!("fixture did not write: {outcome:?}");
    };
    let valid = validate(serde_json::from_slice(&document).expect("written document JSON"))
        .expect("written document validates");
    let digest_path = request.out.with_extension("json.digest");
    let paths = OutputPaths::new(&request.out, None).with_digest(&digest_path);
    write_lift(&paths, Emission::Document { document: &valid }, &[]).expect("digest sidecar write");
    assert_eq!(
        fs::read_to_string(&digest_path).expect("digest sidecar"),
        format!("{}\n", normalized_digest(&document))
    );

    let mut mutated = document.clone();
    mutated[0] ^= b' ';
    assert_ne!(
        normalized_digest(&document),
        normalized_digest(&mutated),
        "a byte mutation changes the normalized digest"
    );
}

#[trace("TC-PLAT-990-2", "FR-145-CON-2")]
#[test]
fn tc_plat_990_digest_is_published_before_document_and_cleans_up_on_document_failure() {
    let (_source, request, outcome) = lift_fixture("snapshot-table");
    let LiftOutcome::Written { document, .. } = outcome else {
        panic!("fixture did not write: {outcome:?}");
    };
    let valid = validate(serde_json::from_slice(&document).expect("written document JSON"))
        .expect("written document validates");
    let output = tempfile::tempdir().expect("output directory");
    let document_path = output.path().join("semantic-ir.json");
    fs::create_dir(&document_path).expect("document failure target");
    let digest_path = output.path().join("semantic-ir.json.digest");
    let paths = OutputPaths::new(&document_path, None).with_digest(&digest_path);

    let refusal = write_lift(&paths, Emission::Document { document: &valid }, &[])
        .expect_err("document rename must fail");
    assert_eq!(refusal.code(), Code::OutputUnwritable);
    assert_eq!(
        fs::read_to_string(&digest_path).expect("digest published before document"),
        format!("{}\n", normalized_digest(&document))
    );
    assert!(document_path.is_dir(), "document failure target remains");
    assert!(!digest_path.with_extension("digest.tmp").exists());
    assert!(!output.path().join("semantic-ir.json.tmp").exists());
}

fn refused_code(outcome: &LiftOutcome) -> (Code, String) {
    match outcome {
        LiftOutcome::Refused(refusal) => (refusal.code(), refusal.diagnostic.message.clone()),
        other => panic!("not refused: {other:?}"),
    }
}

#[trace("TC-1279", "FR-097-AC-7")]
#[test]
fn tc_1279_two_consecutive_lifts_produce_byte_identical_documents_and_sidecars() {
    let (_a, request_a, outcome_a) = lift_fixture("snapshot-table");
    let (_b, request_b, outcome_b) = lift_fixture("snapshot-table");
    assert!(
        matches!(outcome_a, LiftOutcome::Written { .. }),
        "{outcome_a:?}"
    );
    assert!(
        matches!(outcome_b, LiftOutcome::Written { .. }),
        "{outcome_b:?}"
    );
    let a = read_all(&request_a);
    let b = read_all(&request_b);
    for ((label, x), (_, y)) in a.iter().zip(&b) {
        assert_eq!(x, y, "{label} differs between two lifts");
    }
    // Against the committed goldens when Task-136 has cut them.
    let expected = fixture("snapshot-table/expected");
    if expected.is_dir() {
        for (label, bytes) in &a {
            let golden = match *label {
                "document" => expected.join("semantic-ir.json"),
                "diagnostics" => expected.join("diagnostics.json"),
                _ => unreachable!(),
            };
            if golden.is_file() {
                assert_eq!(&fs::read(&golden).expect("golden"), bytes, "{label} golden");
            }
        }
    }
}

/// The child half of TC-1280: lifts `snapshot-table` to the
/// directory `TC_1280_OUT` names, under whatever environment the parent
/// set. Ignored so `cargo test` never runs it by itself.
#[test]
#[ignore = "child process of tc_1280; run by the parent with --ignored --exact"]
fn tc_1280_child() {
    let Some(out) = std::env::var_os("TC_1280_OUT") else {
        return;
    };
    let request = request("snapshot-table", Path::new(&out));
    let outcome = lift(&request);
    assert!(
        matches!(outcome, LiftOutcome::Written { .. }),
        "{outcome:?}"
    );
}

#[trace("TC-1280", "FR-097-AC-8")]
#[test]
fn tc_1280_a_lift_under_a_different_cwd_home_locale_and_target_dir_produces_the_same_bytes() {
    let (_dir, request, outcome) = lift_fixture("snapshot-table");
    assert!(matches!(outcome, LiftOutcome::Written { .. }));
    let baseline = read_all(&request);

    let scratch = tempfile::tempdir().expect("tempdir");
    let cwd = scratch.path().join("elsewhere");
    let home = scratch.path().join("home");
    let target = scratch.path().join("target");
    let out = scratch.path().join("out");
    for dir in [&cwd, &home, &target, &out] {
        fs::create_dir_all(dir).expect("mkdir");
    }
    let exe = std::env::current_exe().expect("current_exe");
    let child = Command::new(&exe)
        .args(["--ignored", "--exact", "tc_1280_child", "--nocapture"])
        .current_dir(&cwd)
        .env("TC_1280_OUT", &out)
        .env("HOME", &home)
        .env("CARGO_TARGET_DIR", &target)
        .env("LC_ALL", "de_DE.UTF-8")
        .env("LANG", "de_DE.UTF-8")
        .env("TZ", "Pacific/Kiritimati")
        .output()
        .expect("spawn child");
    assert!(
        child.status.success(),
        "child failed: {}\n{}",
        String::from_utf8_lossy(&child.stdout),
        String::from_utf8_lossy(&child.stderr)
    );
    let varied = read_all(&request_in(&out));
    for ((label, x), (_, y)) in baseline.iter().zip(&varied) {
        assert_eq!(x, y, "{label} differs under a varied environment");
    }
    let golden = fixture("snapshot-table/expected/semantic-ir.json");
    if golden.is_file() {
        assert_eq!(fs::read(&golden).expect("golden"), baseline[0].1);
    }
}

fn request_in(out: &Path) -> LiftRequest {
    request("snapshot-table", out)
}

#[trace("TC-1281", "FR-097-AC-9")]
#[test]
fn tc_1281_a_blocking_lift_leaves_a_pre_existing_document_byte_unchanged() {
    let dir = tempfile::tempdir().expect("tempdir");
    let request = request("negatives/CONSTRAINT_NOT_APPLICABLE", dir.path());
    let paths = request.paths();
    let stale: Vec<(&Path, &[u8])> = vec![
        (&paths.document, b"stale document"),
        (&paths.diagnostics, b"stale diagnostics"),
    ];
    for (path, bytes) in &stale {
        fs::write(path, bytes).expect("write");
    }
    let before = entries(dir.path());
    let outcome = lift(&request);
    let LiftOutcome::Blocked { diagnostics } = &outcome else {
        panic!("not blocked: {outcome:?}");
    };
    assert!(diagnostics.iter().any(|d| d.blocking));
    for (path, bytes) in &stale[..1] {
        assert_eq!(
            fs::read(path).expect("read"),
            *bytes,
            "{} was touched",
            path.display()
        );
    }
    let written: Value =
        serde_json::from_slice(&fs::read(&paths.diagnostics).expect("read")).expect("json");
    assert_eq!(
        written.as_array().map(Vec::len),
        Some(diagnostics.len()),
        "the diagnostics sidecar was replaced"
    );
    assert_eq!(
        entries(dir.path()),
        before,
        "no other new file, and no temporary file"
    );
}

#[trace("TC-1282", "FR-097-AC-10")]
#[test]
fn tc_1282_a_lift_into_a_directory_that_does_not_exist_refuses_with_output_unwritable_naming_it() {
    let dir = tempfile::tempdir().expect("tempdir");
    let missing = dir.path().join("nonesuch");
    let request = request("snapshot-table", &missing);
    let outcome = lift(&request);
    let (code, message) = refused_code(&outcome);
    assert_eq!(code, Code::OutputUnwritable);
    assert!(
        message.contains(&request.out.display().to_string()),
        "{message}"
    );
    assert!(!missing.exists(), "nothing was created");
    assert_eq!(entries(dir.path()), Vec::<String>::new());
    // The refusal is one FR-096 diagnostic without a locus, blocking.
    let LiftOutcome::Refused(refusal) = &outcome else {
        unreachable!()
    };
    assert!(refusal.diagnostic.blocking);
    assert!(refusal.diagnostic.locus.is_none());
    assert_eq!(
        refusal.diagnostic.code,
        WireCode::Registry(Code::OutputUnwritable)
    );
}

#[trace("TC-1283", "FR-097-AC-11")]
#[test]
fn tc_1283_node_inspect_reports_zero_diagnostics_for_every_emitted_document_and_names_node_when_absent(
) {
    for (name, _dir, request, _outcome) in positive_lifts() {
        let (status, summary) = inspect(&request.out);
        assert_eq!(
            summary["diagnostics"],
            Value::Array(Vec::new()),
            "{name}: {summary}"
        );
        assert_eq!(status, 0, "{name}");
        assert_eq!(summary["contractVersion"], "2.0.0", "{name}");
    }
    // With no `node` on PATH the runner fails naming `node`.
    let error = common::run_node(&["--version"], &[], Some(""))
        .err()
        .expect("no node on an empty PATH");
    assert!(error.contains("`node`"), "{error}");
}

#[trace("TC-1339", "FR-097-AC-16")]
#[test]
fn tc_1339_colliding_output_and_sidecar_paths_refuse_naming_both_options_and_write_nothing() {
    let dir = tempfile::tempdir().expect("tempdir");
    let out = dir.path().join("o.json");
    let same = LiftRequest {
        diagnostics: Some(out.clone()),
        ..request("snapshot-table", dir.path())
    };
    let same = LiftRequest {
        out: out.clone(),
        ..same
    };
    let (code, message) = refused_code(&lift(&same));
    assert_eq!(code, Code::OutputUnwritable);
    assert!(message.contains("--out"), "{message}");
    assert!(message.contains("--diagnostics"), "{message}");
    assert!(message.contains("o.json"), "{message}");
    assert_eq!(entries(dir.path()), Vec::<String>::new());

    // The default sidecar paths never collide with `<out>`.
    let paths = OutputPaths::new(Path::new("x/o.json"), None);
    assert_eq!(paths.diagnostics, Path::new("x/o.json.diagnostics.json"));
}

#[trace("TC-1340", "FR-097-AC-13")]
#[test]
fn tc_1340_out_under_the_bundle_root_or_a_module_root_refuses_before_any_document_is_loaded() {
    // A scratch bundle root that would refuse as BUNDLE_UNIDENTIFIED if it
    // were loaded: the refusal seen is OUTPUT_UNWRITABLE, so no load ran.
    let scratch = tempfile::tempdir().expect("tempdir");
    let unloadable = scratch.path().join("bundle");
    fs::create_dir_all(unloadable.join("spec")).expect("mkdir");
    fs::write(unloadable.join("spec/spec.md"), "# no frontmatter\n").expect("write");
    let under_bundle = LiftRequest {
        out: unloadable.join("spec/out.json"),
        ..common::request_at(&unloadable, scratch.path())
    };
    let (code, message) = refused_code(&lift(&under_bundle));
    assert_eq!(code, Code::OutputUnwritable);
    assert!(message.contains("bundle root"), "{message}");
    assert!(message.contains("out.json"), "{message}");
    assert_eq!(entries(&unloadable.join("spec")), ["spec.md"]);

    // Under a module root: the fixture module, which stays pristine.
    let module = business_module();
    let before = entries(&module);
    let under_module = LiftRequest {
        out: module.join("out.json"),
        ..common::request_at(&unloadable, scratch.path())
    };
    let (code, message) = refused_code(&lift(&under_module));
    assert_eq!(code, Code::OutputUnwritable);
    assert!(message.contains("module root"), "{message}");
    assert_eq!(entries(&module), before);

    // A sidecar under a root refuses the same way.
    let sidecar_under_bundle = LiftRequest {
        diagnostics: Some(unloadable.join("d.json")),
        ..common::request_at(&unloadable, scratch.path())
    };
    let (code, message) = refused_code(&lift(&sidecar_under_bundle));
    assert_eq!(code, Code::OutputUnwritable);
    assert!(message.contains("--diagnostics"), "{message}");
    assert_eq!(entries(scratch.path()), ["bundle"]);
}

/// A bundle that lifts with warnings and nothing blocking: the typed
/// `SnapshotGroup` of `snapshot-table` beside the legacy-form
/// `Snapshot` of `legacy` (one `ARTIFACT_NOT_LOWERED` warning and one
/// engine warning). The committed `legacy` bundle alone lifts to an empty
/// `types`, which the reader's schema refuses (EC-140).
fn warning_only_bundle(dir: &Path) {
    let copy = |from: &Path, to: &str| {
        let to = dir.join(to);
        fs::create_dir_all(to.parent().expect("parent")).expect("mkdir");
        fs::copy(from, &to).expect("copy");
    };
    copy(&fixture("snapshot-table/spec/spec.md"), "spec/spec.md");
    copy(
        &fixture("snapshot-table/spec/functional/FR-005-snapshot-group-entity.md"),
        "spec/functional/FR-005-snapshot-group-entity.md",
    );
    copy(
        &fixture("legacy/spec/functional/FR-006-snapshot-entity.md"),
        "spec/functional/FR-006-snapshot-entity.md",
    );
}

#[trace("TC-1341", "FR-097-AC-14")]
#[test]
fn tc_1341_a_warning_only_lift_writes_exactly_the_two_files() {
    let scratch = tempfile::tempdir().expect("tempdir");
    let bundle = scratch.path().join("bundle");
    warning_only_bundle(&bundle);
    let dir = tempfile::tempdir().expect("tempdir");
    let request = common::request_at(&bundle, dir.path());
    let outcome = lift(&request);
    let LiftOutcome::Written { diagnostics, .. } = &outcome else {
        panic!("{outcome:?}")
    };
    assert!(!diagnostics.is_empty(), "the legacy artifact warns");
    assert!(diagnostics.iter().all(|d| !d.blocking), "{diagnostics:?}");
    assert!(
        diagnostics
            .iter()
            .any(|d| d.code == WireCode::Registry(Code::ArtifactNotLowered)),
        "{diagnostics:?}"
    );
    assert!(
        diagnostics
            .iter()
            .any(|d| d.code == WireCode::Registry(Code::EngineDiagnostic)),
        "{diagnostics:?}"
    );
    assert_eq!(
        entries(dir.path()),
        ["semantic-ir.json", "semantic-ir.json.diagnostics.json"]
    );
    for (label, path) in two(&request) {
        assert!(path.is_file(), "{label} at {}", path.display());
    }
    // The diagnostics sidecar is the sorted list the outcome reports.
    let sidecar: Value =
        serde_json::from_slice(&fs::read(&request.paths().diagnostics).expect("read"))
            .expect("json");
    let reported: Value = serde_json::to_value(diagnostics).expect("json");
    assert_eq!(sidecar, reported);
    // The same bundle with the sidecars redirected writes the files
    // at the named paths and nothing at the defaults.
    let redirected_dir = tempfile::tempdir().expect("tempdir");
    let redirected = LiftRequest {
        diagnostics: Some(redirected_dir.path().join("d.json")),
        ..common::request_at(&bundle, redirected_dir.path())
    };
    assert!(matches!(lift(&redirected), LiftOutcome::Written { .. }));
    assert_eq!(
        entries(redirected_dir.path()),
        ["d.json", "semantic-ir.json"]
    );
    assert_eq!(
        fs::read(redirected_dir.path().join("semantic-ir.json")).expect("read"),
        fs::read(&request.out).expect("read"),
        "the redirect moves no byte of the document"
    );

    // The committed legacy bundle alone: an empty `types`, refused by the
    // reader as INVALID_IR, with the diagnostics sidecar alone written.
    let (legacy_dir, _legacy_request, legacy) = lift_fixture("legacy");
    let LiftOutcome::Blocked { diagnostics } = &legacy else {
        panic!("{legacy:?}")
    };
    assert!(diagnostics
        .iter()
        .any(|d| d.code == WireCode::Registry(Code::InvalidIr)
            && d.message.contains("at least one type")));
    assert_eq!(
        entries(legacy_dir.path()),
        ["semantic-ir.json.diagnostics.json"]
    );
}
