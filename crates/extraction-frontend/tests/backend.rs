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
//! Issues #88 and #90 make both generated-package paths accept the golden:
//! extension identities are unique within their owning node, and matching
//! package-local kernel scalars render as the Rust support type rather than a
//! colliding newtype. The two ordinary tests below are the lasting acceptance
//! evidence. The generic CLI still does not implement a `rust` target; that is
//! a distinct seam fact measured separately.

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

/// The generic compiler CLI still has no Rust target (filament-core-data#21).
#[trace("TC-1292", "FR-098-AC-8")]
#[test]
fn tc_1292_generic_cli_still_declares_rust_unimplemented() {
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, _stderr, diagnostics) = generate("rust", out_root.path());
    assert_eq!(status, 1);
    assert_eq!(
        codes(&diagnostics),
        ["agent-ix.compiler.BACKEND_NOT_IMPLEMENTED"]
    );
}
