//! Compile-time embedded copies of `schema/semantic/v1/*.schema.json`.
//!
//! Every constant below is `include_str!`-ed directly from this repository's
//! own `schema/semantic/v1/` directory — the single canonical location. There
//! is no second copy of these bytes anywhere in this workspace: a consumer
//! that adds this crate as a git dependency (see `Cargo.toml`) gets the exact
//! published contract, not a Rust-side transcription of it.

#![forbid(unsafe_code)]

/// `common.schema.json`: SemVer, digests, identities, origins, extensions,
/// diagnostics, and result states shared by every other document here.
pub const COMMON: &str = include_str!("../../../schema/semantic/v1/common.schema.json");

/// `compatibility-report.schema.json`.
pub const COMPATIBILITY_REPORT: &str =
    include_str!("../../../schema/semantic/v1/compatibility-report.schema.json");

/// `compiler-request.schema.json`.
pub const COMPILER_REQUEST: &str =
    include_str!("../../../schema/semantic/v1/compiler-request.schema.json");

/// `consumer-policy.schema.json`.
pub const CONSUMER_POLICY: &str =
    include_str!("../../../schema/semantic/v1/consumer-policy.schema.json");

/// `mapping.schema.json`.
pub const MAPPING: &str = include_str!("../../../schema/semantic/v1/mapping.schema.json");

/// `module-manifest.schema.json`: the filament module manifest contract
/// (moved here from agent-ix/filament-core-service; fcd is the contract
/// repo, fcs is a consumer of it like any other).
pub const MODULE_MANIFEST: &str =
    include_str!("../../../schema/semantic/v1/module-manifest.schema.json");

/// `module-semantic-block.schema.json`: the module manifest's optional
/// `semantic` block.
pub const MODULE_SEMANTIC_BLOCK: &str =
    include_str!("../../../schema/semantic/v1/module-semantic-block.schema.json");

/// `output-manifest.schema.json`.
pub const OUTPUT_MANIFEST: &str =
    include_str!("../../../schema/semantic/v1/output-manifest.schema.json");

/// `package-lock.schema.json`.
pub const PACKAGE_LOCK: &str = include_str!("../../../schema/semantic/v1/package-lock.schema.json");

/// `package-manifest.schema.json`.
pub const PACKAGE_MANIFEST: &str =
    include_str!("../../../schema/semantic/v1/package-manifest.schema.json");

/// `profile.schema.json`.
pub const PROFILE: &str = include_str!("../../../schema/semantic/v1/profile.schema.json");

/// `representation.schema.json`.
pub const REPRESENTATION: &str =
    include_str!("../../../schema/semantic/v1/representation.schema.json");

/// `semantic-ir.schema.json`.
pub const SEMANTIC_IR: &str = include_str!("../../../schema/semantic/v1/semantic-ir.schema.json");

/// `target-contract.schema.json`.
pub const TARGET_CONTRACT: &str =
    include_str!("../../../schema/semantic/v1/target-contract.schema.json");

/// Every embedded schema, keyed by its filename exactly as it appears under
/// `schema/semantic/v1/` — the same names `@agent-ix/semantic-schema`
/// publishes and the same names the census in `test/semantic-contract.test.ts`
/// enumerates.
pub const SCHEMAS: &[(&str, &str)] = &[
    ("common.schema.json", COMMON),
    ("compatibility-report.schema.json", COMPATIBILITY_REPORT),
    ("compiler-request.schema.json", COMPILER_REQUEST),
    ("consumer-policy.schema.json", CONSUMER_POLICY),
    ("mapping.schema.json", MAPPING),
    ("module-manifest.schema.json", MODULE_MANIFEST),
    ("module-semantic-block.schema.json", MODULE_SEMANTIC_BLOCK),
    ("output-manifest.schema.json", OUTPUT_MANIFEST),
    ("package-lock.schema.json", PACKAGE_LOCK),
    ("package-manifest.schema.json", PACKAGE_MANIFEST),
    ("profile.schema.json", PROFILE),
    ("representation.schema.json", REPRESENTATION),
    ("semantic-ir.schema.json", SEMANTIC_IR),
    ("target-contract.schema.json", TARGET_CONTRACT),
];

/// Looks up an embedded schema document by its filename (e.g.
/// `"module-manifest.schema.json"`).
pub fn by_name(name: &str) -> Option<&'static str> {
    SCHEMAS
        .iter()
        .find(|(schema_name, _)| *schema_name == name)
        .map(|(_, text)| *text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_embedded_schema_is_well_formed_json_with_a_matching_id() {
        for (name, text) in SCHEMAS {
            assert!(
                text.contains("\"$id\""),
                "{name} has no $id: {text_start}",
                text_start = &text[..text.len().min(80)]
            );
            assert!(
                text.contains(&format!(
                    "https://schemas.agent-ix.org/filament-core-data/v1/{name}"
                )),
                "{name}'s $id does not match its own filename"
            );
        }
    }

    #[test]
    fn by_name_finds_module_manifest() {
        assert_eq!(
            by_name("module-manifest.schema.json"),
            Some(MODULE_MANIFEST)
        );
        assert_eq!(by_name("does-not-exist.schema.json"), None);
    }
}
