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
//! The golden declares two `entity` constructs (FR-143), which every backend
//! renders as a record-shaped type naming its identity fields (FR-054, FR-064,
//! FR-100).
//!
//! Issues #88 and #90 make both generated-package paths accept a record golden:
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

/// The golden declares clauses and nothing else a backend carries unenforced,
/// so the seam reports exactly one non-blocking advisory naming #159 (FR-142).
fn assert_only_the_clauses_advisory(diagnostics: &[Value]) {
    let seen: Vec<(&str, bool, &str)> = diagnostics
        .iter()
        .map(|one| {
            (
                one["code"].as_str().unwrap_or_default(),
                one["blocking"].as_bool().unwrap_or(true),
                one["message"].as_str().unwrap_or_default(),
            )
        })
        .collect();
    assert_eq!(seen.len(), 1, "{diagnostics:?}");
    assert_eq!(seen[0].0, "agent-ix.compiler.CONSTRUCT_MEMBER_UNENFORCED");
    assert!(!seen[0].1, "{diagnostics:?}");
    assert!(
        seen[0].2.ends_with("carries clauses as data and enforces none (declared loss, agent-ix/filament-core-data#159)"),
        "{diagnostics:?}"
    );
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
    assert_only_the_clauses_advisory(&diagnostics);
}

/// The generic compiler CLI reaches the Rust target (FR-130).
///
/// This case asserted the opposite until FR-130 registered the backend in the
/// generation seam: the crate was complete and the seam answered
/// `BACKEND_NOT_IMPLEMENTED`, so the test pinned the defect rather than the
/// behaviour. Pinning a defect is the right thing to do while it stands — it is
/// what made the refusal measured rather than assumed — and inverting the
/// assertion is what closing it looks like.
#[trace("TC-1292", "FR-098-AC-8")]
#[test]
fn tc_1292_generic_cli_generates_the_rust_target() {
    let out_root = tempfile::tempdir().expect("tempdir");
    let (status, stderr, diagnostics) = generate("rust", out_root.path());
    assert_eq!(status, 0, "{stderr}");
    assert_only_the_clauses_advisory(&diagnostics);
    assert!(
        out_root.path().join("src/lib.rs").is_file(),
        "the generated crate has no src/lib.rs under {}",
        out_root.path().display()
    );
}
