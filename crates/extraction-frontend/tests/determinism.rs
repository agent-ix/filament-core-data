//! NFR-031-AC-1..3: repeat-run, varied-environment and cross-root byte
//! comparisons of the `config-version-*` lifts.
//!
//! Every comparison here has a fixed point outside the code under test:
//! the committed goldens under `fixtures/<name>/expected/` (FR-098) and
//! `agent_ix_semantic_ir::decide({"ir": doc}).normalized` (FR-097). Two
//! lifts that merely agree with each other would prove the serializer
//! stable and nothing more (NFR-031 Rationale).
//!
//! The varied-environment run drives the built binary, because the
//! library reads no environment variable at all (NFR-031-AC-5): only a
//! separate process can be handed a different working directory, `HOME`,
//! locale, `TZ` and `CARGO_TARGET_DIR`.

use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

mod common;

use agent_ix_extraction_frontend::write::OutputPaths;
use agent_ix_extraction_frontend::LiftOutcome;
use agent_ix_semantic_ir::json::parse as parse_json;
use agent_ix_semantic_ir::{decide, ResultState};
use common::{
    declared_module_roots, first_difference, fixture, lift_fixture, read_json, scratch_dir,
};
use ix_trace_rs::trace;
use serde_json::Value;

const TABLE: &str = "config-version-table";
const FENCE: &str = "config-version-fence";
const OUT: &str = "semantic-ir.json";

/// The committed golden bytes of `name`: `(semantic-ir.json, diagnostics.json)`.
fn golden(name: &str) -> (Vec<u8>, Vec<u8>) {
    let expected = fixture(name).join("expected");
    (
        fs::read(expected.join("semantic-ir.json")).expect("golden document"),
        fs::read(expected.join("diagnostics.json")).expect("golden diagnostics"),
    )
}

/// The bytes one lift left at `out` and its diagnostics sidecar.
fn written(out: &Path) -> (Vec<u8>, Vec<u8>) {
    let paths = OutputPaths::new(out, None, None);
    (
        fs::read(&paths.document).unwrap_or_else(|e| panic!("{}: {e}", paths.document.display())),
        fs::read(&paths.diagnostics)
            .unwrap_or_else(|e| panic!("{}: {e}", paths.diagnostics.display())),
    )
}

/// `decide({"ir": doc}).normalized` over `bytes`, as bytes; the verdict
/// must be `Success`.
fn decide_normalized(bytes: &[u8]) -> Vec<u8> {
    let text = std::str::from_utf8(bytes).expect("utf-8");
    let parsed = parse_json(&format!("{{\"ir\":{text}}}")).expect("parses");
    let verdict = decide(&parsed);
    assert_eq!(verdict.result_state, ResultState::Success);
    verdict.normalized.into_bytes()
}

/// Assert `actual` equals `expected`, naming `what` and the first
/// differing byte.
fn assert_bytes(what: &str, actual: &[u8], expected: &[u8]) {
    if let Some(offset) = first_difference(actual, expected) {
        panic!(
            "{what}: {} byte(s) differ, first at offset {offset} (actual {} bytes, expected {} bytes)",
            actual
                .iter()
                .zip(expected)
                .filter(|(a, b)| a != b)
                .count()
                + actual.len().abs_diff(expected.len()),
            actual.len(),
            expected.len()
        );
    }
}

/// One run of a lift: where it wrote, and what.
struct Run {
    label: String,
    document: Vec<u8>,
    diagnostics: Vec<u8>,
}

impl Run {
    fn at(label: &str, out: &Path) -> Self {
        let (document, diagnostics) = written(out);
        Self {
            label: label.to_string(),
            document,
            diagnostics,
        }
    }
}

/// Every run's bytes against the golden, against `decide(...).normalized`,
/// and against every other run.
fn assert_all_identical(runs: &[Run], name: &str) {
    let (golden_document, golden_diagnostics) = golden(name);
    for run in runs {
        assert_bytes(
            &format!("{}: document vs golden", run.label),
            &run.document,
            &golden_document,
        );
        assert_bytes(
            &format!("{}: diagnostics vs golden", run.label),
            &run.diagnostics,
            &golden_diagnostics,
        );
        assert_bytes(
            &format!("{}: document vs decide(...).normalized", run.label),
            &run.document,
            &decide_normalized(&run.document),
        );
    }
    for pair in runs.windows(2) {
        assert_bytes(
            &format!("{} vs {}: document", pair[0].label, pair[1].label),
            &pair[0].document,
            &pair[1].document,
        );
        assert_bytes(
            &format!("{} vs {}: diagnostics", pair[0].label, pair[1].label),
            &pair[0].diagnostics,
            &pair[1].diagnostics,
        );
    }
    eprintln!(
        "{name}: {} run(s), 0 differing bytes against the golden ({} document bytes, {} diagnostics bytes)",
        runs.len(),
        golden_document.len(),
        golden_diagnostics.len()
    );
}

fn os(s: impl Into<OsString>) -> OsString {
    s.into()
}

/// `lift --bundle <bundle> --module ... --out <out>` under the module
/// roots the golden writer decides for `bundle_root`.
fn lift_args(bundle: &Path, module_roots: &[PathBuf], out: &Path) -> Vec<OsString> {
    let mut args = vec![os("lift"), os("--bundle"), os(bundle)];
    for root in module_roots {
        args.push(os("--module"));
        args.push(os(root));
    }
    args.push(os("--out"));
    args.push(os(out));
    args
}

fn assert_exit_zero(label: &str, output: &Output) {
    assert_eq!(
        output.status.code(),
        Some(0),
        "{label}: exit 0\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

/// The binary, run with `args` from the process environment and cwd.
fn run_binary(args: &[OsString]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .args(args)
        .output()
        .expect("spawn extraction-frontend")
}

#[trace("TC-1300", "NFR-031-AC-1")]
#[test]
fn tc_1300_two_lifts_in_process_and_two_across_processes_match_each_other_the_goldens_and_decide_normalized(
) {
    let mut runs = Vec::new();

    // Two lifts within one program run.
    for i in 1..=2 {
        let (dir, request, outcome) = lift_fixture(TABLE);
        let LiftOutcome::Written { document, .. } = &outcome else {
            panic!("in-process lift {i} wrote a document: {outcome:?}");
        };
        let run = Run::at(&format!("in-process #{i}"), &request.out);
        assert_bytes(
            &format!("in-process #{i}: outcome bytes vs on-disk bytes"),
            document,
            &run.document,
        );
        runs.push(run);
        drop(dir);
    }

    // Two lifts across two program runs.
    let module_roots = declared_module_roots(&fixture(TABLE));
    for i in 1..=2 {
        let dir = scratch_dir(&format!("tc-1300-process-{i}"));
        let out = dir.join(OUT);
        let output = run_binary(&lift_args(&fixture(TABLE), &module_roots, &out));
        assert_exit_zero(&format!("process #{i}"), &output);
        runs.push(Run::at(&format!("process #{i}"), &out));
    }

    assert_eq!(runs.len(), 4);
    assert_all_identical(&runs, TABLE);
}

#[trace("TC-1301", "NFR-031-AC-2")]
#[test]
fn tc_1301_a_lift_under_a_changed_cwd_empty_home_and_varied_tz_lang_lc_all_and_target_dir_reproduces_the_golden(
) {
    let bundle = fs::canonicalize(fixture(TABLE)).expect("bundle");
    let module_roots: Vec<PathBuf> = declared_module_roots(&bundle)
        .iter()
        .map(|r| fs::canonicalize(r).expect("module root"))
        .collect();
    let scratch = scratch_dir("tc-1301");
    let empty_home = scratch.join("empty-home");
    fs::create_dir_all(&empty_home).expect("empty HOME");
    assert_eq!(fs::read_dir(&empty_home).expect("read_dir").count(), 0);
    let other_cwd = scratch.join("elsewhere");
    fs::create_dir_all(&other_cwd).expect("cwd");
    let other_target = scratch.join("other-target");
    fs::create_dir_all(&other_target).expect("target");

    // The first run: the process environment and working directory.
    let first_out = scratch.join("first").join(OUT);
    fs::create_dir_all(first_out.parent().expect("parent")).expect("mkdir");
    let output = run_binary(&lift_args(&bundle, &module_roots, &first_out));
    assert_exit_zero("first run", &output);
    let mut runs = vec![Run::at("first run", &first_out)];

    // The varied run: every ambient input NFR-031-AC-2 names set to a
    // value a second host would carry. Every variable differs from the
    // first run's, by construction: `HOME` is a fresh empty directory,
    // and the rest are values no development host of this workspace
    // carries.
    let varied = [
        ("HOME", os(&empty_home)),
        ("TZ", os("Pacific/Kiritimati")),
        ("LANG", os("tr_TR.UTF-8")),
        ("LC_ALL", os("tr_TR.UTF-8")),
        ("CARGO_TARGET_DIR", os(&other_target)),
    ];
    for (key, value) in &varied {
        assert_ne!(
            std::env::var_os(key).as_deref(),
            Some(value.as_os_str()),
            "{key} differs from the first run's"
        );
    }
    assert_ne!(
        std::env::current_dir().expect("cwd"),
        other_cwd,
        "the working directory differs from the first run's"
    );
    let varied_out = scratch.join("varied").join(OUT);
    fs::create_dir_all(varied_out.parent().expect("parent")).expect("mkdir");
    let output = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .args(lift_args(&bundle, &module_roots, &varied_out))
        .current_dir(&other_cwd)
        .envs(varied.iter().map(|(k, v)| (*k, v.clone())))
        .output()
        .expect("spawn extraction-frontend");
    assert_exit_zero("varied run", &output);
    runs.push(Run::at("varied run", &varied_out));
    assert_eq!(
        fs::read_dir(&empty_home).expect("read_dir").count(),
        0,
        "the lift wrote nothing under HOME"
    );

    // A relative-path run: the bundle and module roots named relative to
    // a working directory that is neither the first run's nor the
    // varied run's, so a root path leaking into the output would change
    // the bytes.
    let inventory = fs::canonicalize(common::fixtures_root()).expect("fixtures");
    let relative = |p: &Path| -> PathBuf {
        p.strip_prefix(&inventory)
            .expect("under fixtures/")
            .to_path_buf()
    };
    let relative_roots: Vec<PathBuf> = module_roots.iter().map(|r| relative(r)).collect();
    let relative_out = scratch.join("relative").join(OUT);
    fs::create_dir_all(relative_out.parent().expect("parent")).expect("mkdir");
    let output = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .args(lift_args(
            &relative(&bundle),
            &relative_roots,
            &relative_out,
        ))
        .current_dir(&inventory)
        .envs(varied.iter().map(|(k, v)| (*k, v.clone())))
        .output()
        .expect("spawn extraction-frontend");
    assert_exit_zero("relative-path run", &output);
    runs.push(Run::at("relative-path run", &relative_out));

    // EC-151: the bundle root reached through a symlink.
    let link = scratch.join("linked-bundle");
    std::os::unix::fs::symlink(&bundle, &link).expect("symlink");
    let linked_out = scratch.join("linked").join(OUT);
    fs::create_dir_all(linked_out.parent().expect("parent")).expect("mkdir");
    let output = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .args(lift_args(&link, &module_roots, &linked_out))
        .current_dir(&other_cwd)
        .envs(varied.iter().map(|(k, v)| (*k, v.clone())))
        .output()
        .expect("spawn extraction-frontend");
    assert_exit_zero("symlinked-root run", &output);
    runs.push(Run::at("symlinked-root run", &linked_out));

    assert_eq!(runs.len(), 4);
    assert_all_identical(&runs, TABLE);
}

/// `value` with `source.digest` blanked, so two documents that differ
/// only there compare equal.
fn without_digest(value: &Value) -> Value {
    let mut value = value.clone();
    value["source"]["digest"] = Value::Null;
    value
}

#[trace("TC-1302", "NFR-031-AC-3")]
#[test]
fn tc_1302_the_table_and_fence_roots_lift_to_identical_types_and_diagnostics_bytes_differing_only_in_source_digest(
) {
    const RELATIVE: &str = "spec/functional/FR-006-config-version-entity.md";
    // Both roots hold one copy of FR-006 at the same bundle-relative
    // path, line-aligned: the file has the same line count in both.
    let table_text = fs::read_to_string(fixture(TABLE).join(RELATIVE)).expect("table FR-006");
    let fence_text = fs::read_to_string(fixture(FENCE).join(RELATIVE)).expect("fence FR-006");
    assert_ne!(table_text, fence_text, "the two forms are distinct texts");
    assert_eq!(
        table_text.lines().count(),
        fence_text.lines().count(),
        "line-aligned copies"
    );
    assert!(
        table_text.contains("| Field | Type |") && fence_text.contains("```sysml"),
        "table form in one root, sysml fence form in the other"
    );

    let (table_dir, table_request, table_outcome) = lift_fixture(TABLE);
    let (fence_dir, fence_request, fence_outcome) = lift_fixture(FENCE);
    assert!(
        matches!(table_outcome, LiftOutcome::Written { .. })
            && matches!(fence_outcome, LiftOutcome::Written { .. }),
        "both roots lift: {table_outcome:?} / {fence_outcome:?}"
    );
    let table = Run::at("table", &table_request.out);
    let fence = Run::at("fence", &fence_request.out);
    drop((table_dir, fence_dir));

    // Each against its own committed golden and `decide(...).normalized`.
    assert_all_identical(std::slice::from_ref(&table), TABLE);
    assert_all_identical(std::slice::from_ref(&fence), FENCE);

    // Diagnostics: identical bytes.
    assert_bytes(
        "diagnostics: table vs fence",
        &table.diagnostics,
        &fence.diagnostics,
    );

    // `types[]`: identical bytes, taken from the canonical document text
    // itself rather than from a re-serialization.
    let table_doc: Value = serde_json::from_slice(&table.document).expect("json");
    let fence_doc: Value = serde_json::from_slice(&fence.document).expect("json");
    let types_bytes = |bytes: &[u8]| -> Vec<u8> {
        let text = std::str::from_utf8(bytes).expect("utf-8");
        let start = text.find("\"types\":").expect("a `types` member");
        text.as_bytes()[start..].to_vec()
    };
    assert_bytes(
        "types[] bytes: table vs fence",
        &types_bytes(&table.document),
        &types_bytes(&fence.document),
    );
    assert_eq!(table_doc["types"], fence_doc["types"]);
    assert!(
        !table_doc["types"].as_array().expect("array").is_empty(),
        "the comparison is over lowered types, not two empty lists"
    );

    // Only `source.digest` differs, by construction.
    let table_digest = table_doc["source"]["digest"].as_str().expect("digest");
    let fence_digest = fence_doc["source"]["digest"].as_str().expect("digest");
    assert_ne!(
        table_digest, fence_digest,
        "source.digest differs by construction"
    );
    assert_eq!(
        without_digest(&table_doc),
        without_digest(&fence_doc),
        "nothing besides source.digest differs"
    );
    let golden_table = read_json(&fixture(TABLE).join("expected/semantic-ir.json"));
    assert_eq!(
        golden_table["source"]["digest"].as_str(),
        Some(table_digest)
    );
    let differing = table
        .document
        .iter()
        .zip(&fence.document)
        .filter(|(a, b)| a != b)
        .count()
        + table.document.len().abs_diff(fence.document.len());
    assert!(
        differing <= table_digest.len(),
        "{differing} differing document bytes, all within the digest"
    );
    eprintln!(
        "{TABLE} vs {FENCE}: 0 differing types[] bytes, 0 differing diagnostics bytes, {differing} differing document bytes (source.digest)"
    );
}
