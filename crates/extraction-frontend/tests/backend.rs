//! FR-098 "Backend acceptance": the two backends over the lifted
//! `config-version-table` golden.
//!
//! The Rust half runs the Rust backend's own writer, `generateRust` of
//! `src/compiler/backends/rust-serde/index.mjs`, the way
//! `src/compiler/backends/rust-serde/cli.mjs generate` runs it over the
//! conformance bases: through the `rust-generate` verb of
//! `scripts/extraction-frontend-harness.mjs`, which builds the request as
//! `cli.mjs` `requestFor` does and exits non-zero on a blocking diagnostic
//! (SR-170 FND-1500). The generic `node src/compiler/cli.mjs generate
//! --target rust` is `BACKEND_NOT_IMPLEMENTED` (filament-core-data#21) and
//! is measured, not relied on.
//!
//! Measured at the CR-036-9 fix pass: neither half accepts the golden, and
//! neither refusal is this frontend's. The Rust backend answers
//! `agent-ix.rust-backend.NAME_COLLISION` — its reserved re-export `Uuid`
//! (`rust-backend/reserved/Uuid`) collides with the FR-092 kernel scalar
//! definition `type/UUID`, whose Rust identifier is also `Uuid` — for every
//! document that uses the `UUID` kernel scalar, so the Rust half of TC-1292
//! is blocked on that backend defect (reported for filing). `--target
//! typescript` answers `agent-ix.semantic-ir.DUPLICATE_IDENTITY` at
//! `/ir/types/<n>/extensions/0/identity` for every kernel scalar after the
//! first (filament-core-data#88), as it does FR-046's own assurance output,
//! while `agent_ix_semantic_ir::decide` and `node src/compiler/cli.mjs
//! inspect` accept both. Each blocked half is one `#[ignore]`d test that
//! runs as written with `--ignored`; the measurement behind each block is an
//! un-ignored test, so a host-side change is noticed when it stops holding.

use std::path::Path;

mod common;

use common::{fixture, read_json, run_node};
use ix_trace_rs::trace;
use serde_json::Value;

/// The harness's `rust-generate` output root.
const OUTPUT_ROOT: &str = "lifted";

/// The golden the acceptance runs over.
fn golden() -> std::path::PathBuf {
    fixture("config-version-table/expected/semantic-ir.json")
}

/// `scripts/extraction-frontend-harness.mjs rust-generate --ir <golden>
/// --out <dir>`: the exit status, stdout, and the output manifest's
/// diagnostics.
fn rust_generate(out: &Path) -> (i32, String, Vec<Value>) {
    let golden = golden();
    let run = run_node(
        &[
            "scripts/extraction-frontend-harness.mjs",
            "rust-generate",
            "--ir",
            &golden.to_string_lossy(),
            "--out",
            &out.to_string_lossy(),
            "--output-root",
            OUTPUT_ROOT,
        ],
        &[],
        None,
    )
    .unwrap_or_else(|e| panic!("{e}"));
    let manifest = out.join(format!("{OUTPUT_ROOT}.output-manifest.json"));
    let diagnostics = if manifest.is_file() {
        read_json(&manifest)["diagnostics"]
            .as_array()
            .cloned()
            .unwrap_or_default()
    } else {
        Vec::new()
    };
    (
        run.status,
        format!("{}{}", String::from_utf8_lossy(&run.stdout), run.stderr),
        diagnostics,
    )
}

/// `generate --ir <golden> --target <target> --out-root <dir> --manifest
/// <dir>/m.json` through the generic compiler CLI: the exit status and the
/// manifest's diagnostics.
fn generate(target: &str, out_root: &Path) -> (i32, String, Vec<Value>) {
    let golden = golden();
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

fn codes(diagnostics: &[Value]) -> Vec<&str> {
    diagnostics
        .iter()
        .filter_map(|d| d["code"].as_str())
        .collect()
}

#[trace("TC-1292", "FR-098-AC-8")]
#[test]
#[ignore = "blocked: the rust-serde backend refuses every document using the UUID kernel scalar with NAME_COLLISION (its reserved re-export `Uuid` against `type/UUID`); a backend defect outside this frontend, reported for filing"]
fn tc_1292_rust_generate_over_the_config_version_table_golden_exits_zero_with_no_diagnostics() {
    let out = tempfile::tempdir().expect("tempdir");
    let (status, log, diagnostics) = rust_generate(out.path());
    assert_eq!(status, 0, "{log}");
    assert!(
        diagnostics.is_empty(),
        "{} diagnostic(s): {diagnostics:?}",
        diagnostics.len()
    );
    assert!(out.path().join(OUTPUT_ROOT).join("Cargo.toml").is_file());
}

#[trace("TC-1292", "FR-098-AC-8")]
#[test]
#[ignore = "blocked: --target typescript refuses every kernel-scalar extension identity as DUPLICATE_IDENTITY, as it does FR-046's own assurance output (filament-core-data#88)"]
fn tc_1292_generate_typescript_over_the_config_version_table_golden_exits_zero_with_no_diagnostics()
{
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, stderr, diagnostics) = generate("typescript", out_root.path());
    assert_eq!(status, 0, "{stderr}");
    assert!(
        diagnostics.is_empty(),
        "{} diagnostic(s): {diagnostics:?}",
        diagnostics.len()
    );
}

/// The measurement behind the Rust block: what the Rust backend answers
/// today, through its own writer, and that the generic CLI still has no
/// `rust` target.
#[trace("TC-1292", "FR-098-AC-8")]
#[test]
fn tc_1292_measured_the_rust_backend_refuses_the_golden_with_name_collision_on_uuid_only() {
    let out = tempfile::tempdir().expect("tempdir");
    let (status, log, diagnostics) = rust_generate(out.path());
    assert_eq!(status, 1, "{log}");
    assert_eq!(
        codes(&diagnostics),
        ["agent-ix.rust-backend.NAME_COLLISION"],
        "{log}"
    );
    let message = diagnostics[0]["message"].as_str().unwrap_or_default();
    assert!(message.contains("`Uuid`"), "{message}");
    assert!(message.contains("rust-backend/reserved/Uuid"), "{message}");
    assert!(
        message.contains("ix://agent-ix/config-service/type/UUID"),
        "{message}"
    );
    assert!(diagnostics[0]["blocking"].as_bool().unwrap_or(false));
    // A blocked generation writes no crate.
    assert!(!out.path().join(OUTPUT_ROOT).exists(), "{log}");
    // The one node the backend refuses is the FR-092 kernel-scalar
    // definition for `UUID`, minted by this frontend as FR-092 requires.
    let golden = read_json(&golden());
    let uuid: Vec<&Value> = golden["types"]
        .as_array()
        .expect("types")
        .iter()
        .filter(|t| t["identity"] == "ix://agent-ix/config-service/type/UUID")
        .collect();
    assert_eq!(uuid.len(), 1);
    assert_eq!(uuid[0]["kind"], "scalar");

    // The generic CLI has no Rust target (filament-core-data#21).
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, _stderr, diagnostics) = generate("rust", out_root.path());
    assert_eq!(status, 1);
    assert_eq!(
        codes(&diagnostics),
        ["agent-ix.compiler.BACKEND_NOT_IMPLEMENTED"]
    );
}

/// The measurement behind the TypeScript block: what `--target typescript`
/// answers today, and that every refusal points outside this frontend.
#[trace("TC-1292", "FR-098-AC-8")]
#[test]
fn tc_1292_measured_typescript_refuses_the_golden_for_a_reason_outside_this_frontend() {
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, stderr, diagnostics) = generate("typescript", out_root.path());
    assert_eq!(status, 1, "{stderr}");
    let codes = codes(&diagnostics);
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
    let golden = read_json(&golden());
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
