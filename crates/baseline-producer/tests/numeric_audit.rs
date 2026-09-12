// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! NFR-036-M-5: the binary-floating-point audit over the declared numeric-path
//! population, with its planted-conversion control (Plan-017 Task-143).
//!
//! The population is the one NFR-036-M-5 declares (FND-1742), named here rather
//! than discovered: the crate's number parse seam and its authored-decimal
//! representation, its canonical serializer, the crate root that re-exports
//! them, and the pinned JSON parser entry point. The metric is coercion sites
//! and its target and threshold are both 0, so this control reports the count
//! it measured rather than a pass verdict, and it fails on a scratch copy
//! carrying a planted conversion.

/// The declared numeric-path population, as path and source text.
///
/// The sources are embedded at compile time rather than read at run time, so
/// this audit resolves no working directory and reads no environment.
const NUMERIC_PATH_POPULATION: [(&str, &str); 3] = [
    ("src/canonical.rs", include_str!("../src/canonical.rs")),
    ("src/decimal.rs", include_str!("../src/decimal.rs")),
    // The crate root: the parse seam and the authored decimal are reachable
    // only through what it re-exports.
    ("src/lib.rs", include_str!("../src/lib.rs")),
];

/// The pinned JSON parser entry point, as the two manifests that pin it.
const CRATE_MANIFEST: &str = include_str!("../Cargo.toml");
/// The workspace manifest that pins the parser's exact version.
const WORKSPACE_MANIFEST: &str = include_str!("../../../Cargo.toml");

/// The tokens a binary floating-point value cannot reach this path without.
const PROHIBITED_TOKENS: [&str; 4] = ["f32", "f64", "as_f32", "as_f64"];

/// One measured coercion site.
#[derive(Debug, PartialEq, Eq)]
struct CoercionSite {
    path: String,
    line: usize,
    token: &'static str,
    text: String,
}

/// Counts the binary floating-point coercion sites in one source text.
fn audit(path: &str, source: &str) -> Vec<CoercionSite> {
    let mut sites = Vec::new();
    for (index, line) in source.lines().enumerate() {
        for token in PROHIBITED_TOKENS {
            if line.contains(token) {
                sites.push(CoercionSite {
                    path: path.to_owned(),
                    line: index + 1,
                    token,
                    text: line.trim().to_owned(),
                });
            }
        }
    }
    sites
}

/// Tracing: TC-1454
#[test]
fn tc_1454_the_numeric_path_reaches_zero_binary_floating_point_coercion_sites() {
    let mut sites = Vec::new();
    let mut lines = 0;
    for (path, source) in NUMERIC_PATH_POPULATION {
        lines += source.lines().count();
        sites.extend(audit(path, source));
    }
    assert!(
        sites.is_empty(),
        "the declared numeric-path population reached {} binary floating-point site(s): {sites:#?}",
        sites.len()
    );

    // The pinned JSON parser entry point is part of the declared population:
    // without `arbitrary_precision` the lexeme reaching the canonical
    // serializer has already been through binary64, so the feature is the
    // audited property and not an optimization.
    assert!(
        CRATE_MANIFEST
            .contains(r#"serde_json = { workspace = true, features = ["arbitrary_precision"] }"#),
        "the pinned parser is compiled with arbitrary_precision: {CRATE_MANIFEST}"
    );
    assert!(
        WORKSPACE_MANIFEST.contains(r#"serde_json = "=1.0.151""#),
        "the parser entry point is pinned to one exact version"
    );

    // The planted-conversion control. A scratch copy of the canonical
    // serializer carrying one `as f64` must be measured as one site, so a zero
    // above is a measurement and not a scan that cannot fail.
    let planted = NUMERIC_PATH_POPULATION[0].1.replace(
        "    let negative = raw.starts_with('-');",
        "    let planted = raw.len() as f64;\n    let negative = raw.starts_with('-');",
    );
    let planted_sites = audit("src/canonical.rs (scratch copy)", &planted);
    assert_eq!(
        planted_sites.len(),
        1,
        "the planted conversion is measured: {planted_sites:#?}"
    );
    assert_eq!(planted_sites[0].token, "f64");
    assert!(planted_sites[0].text.contains("as f64"));

    println!(
        "TC-1454 measured: {} files and {lines} lines of the declared numeric-path population, {} coercion sites (target 0, threshold 0), 1 pinned parser entry point compiled with arbitrary_precision, and {} site(s) measured on the planted scratch copy",
        NUMERIC_PATH_POPULATION.len(),
        sites.len(),
        planted_sites.len()
    );
}
