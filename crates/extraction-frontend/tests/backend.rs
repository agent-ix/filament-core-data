//! FR-098 "Backend acceptance": `node src/compiler/cli.mjs generate` over
//! the lifted `config-version-table` golden, for the `rust` and
//! `typescript` targets.
//!
//! Measured at Task-136 (HEAD ff32481), neither target accepts the golden,
//! and neither refusal is this frontend's: `--target rust` answers
//! `agent-ix.compiler.BACKEND_NOT_IMPLEMENTED` (the rust backend is
//! filament-core-data#21), and `--target typescript` answers
//! `agent-ix.semantic-ir.DUPLICATE_IDENTITY` at
//! `/ir/types/<n>/extensions/0/identity` for every kernel scalar after the
//! first, because each carries the FR-034 extension identity
//! `ix://agent-ix/semantic-core/ext/kernel-scalar` — the same refusal it
//! gives FR-046's own `test/fixtures/compiler/packages/assurance` output,
//! while `agent_ix_semantic_ir::decide` and `node src/compiler/cli.mjs
//! inspect` accept both. TC-1292 is therefore `#[ignore]`d as blocked and
//! runs as written with `--ignored`.

use std::path::Path;

mod common;

use common::{fixture, read_json, run_node};
use ix_trace_rs::trace;
use serde_json::Value;

/// `generate --ir <golden> --target <target> --out-root <dir> --manifest
/// <dir>/m.json`: the exit status and the manifest's diagnostics.
fn generate(target: &str, out_root: &Path) -> (i32, String, Vec<Value>) {
    let golden = fixture("config-version-table/expected/semantic-ir.json");
    let manifest = out_root.join("m.json");
    let run = run_node(
        &[
            "src/compiler/cli.mjs",
            "generate",
            "--ir",
            &golden.to_string_lossy(),
            "--target",
            target,
            "--out-root",
            &out_root.to_string_lossy(),
            "--manifest",
            &manifest.to_string_lossy(),
        ],
        &[],
        None,
    )
    .unwrap_or_else(|e| panic!("{e}"));
    let diagnostics = if manifest.is_file() {
        read_json(&manifest)["diagnostics"]
            .as_array()
            .cloned()
            .unwrap_or_default()
    } else {
        Vec::new()
    };
    (run.status, run.stderr, diagnostics)
}

#[trace("TC-1292", "FR-098-AC-8")]
#[test]
#[ignore = "blocked: --target rust is BACKEND_NOT_IMPLEMENTED (filament-core-data#21) and --target typescript refuses every kernel-scalar extension identity as DUPLICATE_IDENTITY, as it does FR-046's own assurance output"]
fn tc_1292_generate_rust_and_typescript_over_the_config_version_table_golden_exit_zero_with_no_diagnostics(
) {
    for target in ["rust", "typescript"] {
        let out_root = tempfile::tempdir().expect("tempdir");
        let (status, stderr, diagnostics) = generate(target, out_root.path());
        assert_eq!(status, 0, "{target}: {stderr}");
        assert!(
            diagnostics.is_empty(),
            "{target}: {} diagnostic(s): {diagnostics:?}",
            diagnostics.len()
        );
    }
}

/// The measurement behind the block: what each target answers today, so
/// a change on the host side is noticed when this stops holding.
#[trace("TC-1292", "FR-098-AC-8")]
#[test]
fn tc_1292_measured_each_target_refuses_the_golden_for_a_reason_outside_this_frontend() {
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, _stderr, diagnostics) = generate("rust", out_root.path());
    assert_eq!(status, 1);
    let codes: Vec<&str> = diagnostics
        .iter()
        .filter_map(|d| d["code"].as_str())
        .collect();
    assert_eq!(codes, ["agent-ix.compiler.BACKEND_NOT_IMPLEMENTED"]);

    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, stderr, diagnostics) = generate("typescript", out_root.path());
    assert_eq!(status, 1, "{stderr}");
    let codes: Vec<&str> = diagnostics
        .iter()
        .filter_map(|d| d["code"].as_str())
        .collect();
    assert!(
        !codes.is_empty()
            && codes
                .iter()
                .all(|c| *c == "agent-ix.semantic-ir.DUPLICATE_IDENTITY"),
        "{codes:?}\n{stderr}"
    );
    // Every refusal points at a kernel-scalar extension identity, never at
    // a node this frontend minted.
    for line in stderr.lines().filter(|l| l.contains("DUPLICATE_IDENTITY")) {
        assert!(line.contains("/extensions/0/identity"), "{line}");
    }
    // The golden's kernel scalars each carry the one FR-034 extension
    // identity, which is what the backend counts twice.
    let golden = read_json(&fixture("config-version-table/expected/semantic-ir.json"));
    let kernel: Vec<&Value> = golden["types"]
        .as_array()
        .expect("types")
        .iter()
        .filter(|t| t["kind"] == "scalar")
        .collect();
    assert_eq!(
        kernel.len(),
        codes.len() + 1,
        "one refusal per scalar after the first"
    );
    for scalar in kernel {
        assert_eq!(
            scalar["extensions"][0]["identity"],
            "ix://agent-ix/semantic-core/ext/kernel-scalar"
        );
    }
}
