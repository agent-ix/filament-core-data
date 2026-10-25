//! Compile-time embedded copies of `schema/semantic/v1/*.schema.json` and
//! `packages/semantic-core/generated/json-schema/*.json`.
//!
//! Every constant below is `include_str!`-ed directly from this repository's
//! own tree — the single canonical location for each family. There is no
//! second copy of these bytes anywhere in this workspace: a consumer that
//! adds this crate as a git dependency (see `Cargo.toml`) gets the exact
//! published contract, not a Rust-side transcription of it.
//!
//! `SCHEMAS` covers the filament-core-data v1 contract; `SEMANTIC_CORE_SCHEMAS`
//! covers semantic-core's generated JSON Schema, which previously reached npm
//! (`@agent-ix/semantic-core`) but had no cargo route at all.

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

/// `ClauseLanguage.json`.
pub const SC_CLAUSE_LANGUAGE: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/ClauseLanguage.json");

/// `ClauseRef.json`.
pub const SC_CLAUSE_REF: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/ClauseRef.json");

/// `ConstraintDecl.json`.
pub const SC_CONSTRAINT_DECL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/ConstraintDecl.json");

/// `ConstraintKeyword.json`.
pub const SC_CONSTRAINT_KEYWORD: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/ConstraintKeyword.json");

/// `DecimalPolicy.json`.
pub const SC_DECIMAL_POLICY: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/DecimalPolicy.json");

/// `DefaultDecl.json`.
pub const SC_DEFAULT_DECL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/DefaultDecl.json");

/// `DefaultKind.json`.
pub const SC_DEFAULT_KIND: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/DefaultKind.json");

/// `EdgeCategory.json`.
pub const SC_EDGE_CATEGORY: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/EdgeCategory.json");

/// `EnumValue.json`.
pub const SC_ENUM_VALUE: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/EnumValue.json");

/// `EnumValueName.json`.
pub const SC_ENUM_VALUE_NAME: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/EnumValueName.json");

/// `EnumValuesConstraint.json`.
pub const SC_ENUM_VALUES_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/EnumValuesConstraint.json");

/// `EnumValuesConstraintValues.json`.
pub const SC_ENUM_VALUES_CONSTRAINT_VALUES: &str = include_str!(
    "../../../packages/semantic-core/generated/json-schema/EnumValuesConstraintValues.json"
);

/// `ExclusiveMaxConstraint.json`.
pub const SC_EXCLUSIVE_MAX_CONSTRAINT: &str = include_str!(
    "../../../packages/semantic-core/generated/json-schema/ExclusiveMaxConstraint.json"
);

/// `ExclusiveMaxConstraintValue.json`.
pub const SC_EXCLUSIVE_MAX_CONSTRAINT_VALUE: &str = include_str!(
    "../../../packages/semantic-core/generated/json-schema/ExclusiveMaxConstraintValue.json"
);

/// `ExclusiveMinConstraint.json`.
pub const SC_EXCLUSIVE_MIN_CONSTRAINT: &str = include_str!(
    "../../../packages/semantic-core/generated/json-schema/ExclusiveMinConstraint.json"
);

/// `ExclusiveMinConstraintValue.json`.
pub const SC_EXCLUSIVE_MIN_CONSTRAINT_VALUE: &str = include_str!(
    "../../../packages/semantic-core/generated/json-schema/ExclusiveMinConstraintValue.json"
);

/// `FieldDecl.json`.
pub const SC_FIELD_DECL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/FieldDecl.json");

/// `FormatConstraint.json`.
pub const SC_FORMAT_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/FormatConstraint.json");

/// `Identifier.json`.
pub const SC_IDENTIFIER: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/Identifier.json");

/// `KernelScalar.json`.
pub const SC_KERNEL_SCALAR: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/KernelScalar.json");

/// `MaxConstraint.json`.
pub const SC_MAX_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MaxConstraint.json");

/// `MaxConstraintValue.json`.
pub const SC_MAX_CONSTRAINT_VALUE: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MaxConstraintValue.json");

/// `MaxLengthConstraint.json`.
pub const SC_MAX_LENGTH_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MaxLengthConstraint.json");

/// `MinConstraint.json`.
pub const SC_MIN_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MinConstraint.json");

/// `MinConstraintValue.json`.
pub const SC_MIN_CONSTRAINT_VALUE: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MinConstraintValue.json");

/// `MinLengthConstraint.json`.
pub const SC_MIN_LENGTH_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/MinLengthConstraint.json");

/// `Multiplicity.json`.
pub const SC_MULTIPLICITY: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/Multiplicity.json");

/// `NonEmptyConstraint.json`.
pub const SC_NON_EMPTY_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/NonEmptyConstraint.json");

/// `OperationDecl.json`.
pub const SC_OPERATION_DECL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/OperationDecl.json");

/// `PatternConstraint.json`.
pub const SC_PATTERN_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/PatternConstraint.json");

/// `RelationDecl.json`.
pub const SC_RELATION_DECL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/RelationDecl.json");

/// `SemanticId.json`.
pub const SC_SEMANTIC_ID: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/SemanticId.json");

/// `SourceLocus.json`.
pub const SC_SOURCE_LOCUS: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/SourceLocus.json");

/// `TypeRef.json`.
pub const SC_TYPE_REF: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/TypeRef.json");

/// `TypeRefTarget.json`.
pub const SC_TYPE_REF_TARGET: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/TypeRefTarget.json");

/// `UniqueConstraint.json`.
pub const SC_UNIQUE_CONSTRAINT: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/UniqueConstraint.json");

/// `UnitSymbol.json`.
pub const SC_UNIT_SYMBOL: &str =
    include_str!("../../../packages/semantic-core/generated/json-schema/UnitSymbol.json");

/// Every embedded semantic-core schema, keyed by its filename exactly as it
/// appears under `packages/semantic-core/generated/json-schema/` — the same
/// names `@agent-ix/semantic-core` publishes to npm. This is the cargo route
/// the documents previously had none of.
pub const SEMANTIC_CORE_SCHEMAS: &[(&str, &str)] = &[
    ("ClauseLanguage.json", SC_CLAUSE_LANGUAGE),
    ("ClauseRef.json", SC_CLAUSE_REF),
    ("ConstraintDecl.json", SC_CONSTRAINT_DECL),
    ("ConstraintKeyword.json", SC_CONSTRAINT_KEYWORD),
    ("DecimalPolicy.json", SC_DECIMAL_POLICY),
    ("DefaultDecl.json", SC_DEFAULT_DECL),
    ("DefaultKind.json", SC_DEFAULT_KIND),
    ("EdgeCategory.json", SC_EDGE_CATEGORY),
    ("EnumValue.json", SC_ENUM_VALUE),
    ("EnumValueName.json", SC_ENUM_VALUE_NAME),
    ("EnumValuesConstraint.json", SC_ENUM_VALUES_CONSTRAINT),
    (
        "EnumValuesConstraintValues.json",
        SC_ENUM_VALUES_CONSTRAINT_VALUES,
    ),
    ("ExclusiveMaxConstraint.json", SC_EXCLUSIVE_MAX_CONSTRAINT),
    (
        "ExclusiveMaxConstraintValue.json",
        SC_EXCLUSIVE_MAX_CONSTRAINT_VALUE,
    ),
    ("ExclusiveMinConstraint.json", SC_EXCLUSIVE_MIN_CONSTRAINT),
    (
        "ExclusiveMinConstraintValue.json",
        SC_EXCLUSIVE_MIN_CONSTRAINT_VALUE,
    ),
    ("FieldDecl.json", SC_FIELD_DECL),
    ("FormatConstraint.json", SC_FORMAT_CONSTRAINT),
    ("Identifier.json", SC_IDENTIFIER),
    ("KernelScalar.json", SC_KERNEL_SCALAR),
    ("MaxConstraint.json", SC_MAX_CONSTRAINT),
    ("MaxConstraintValue.json", SC_MAX_CONSTRAINT_VALUE),
    ("MaxLengthConstraint.json", SC_MAX_LENGTH_CONSTRAINT),
    ("MinConstraint.json", SC_MIN_CONSTRAINT),
    ("MinConstraintValue.json", SC_MIN_CONSTRAINT_VALUE),
    ("MinLengthConstraint.json", SC_MIN_LENGTH_CONSTRAINT),
    ("Multiplicity.json", SC_MULTIPLICITY),
    ("NonEmptyConstraint.json", SC_NON_EMPTY_CONSTRAINT),
    ("OperationDecl.json", SC_OPERATION_DECL),
    ("PatternConstraint.json", SC_PATTERN_CONSTRAINT),
    ("RelationDecl.json", SC_RELATION_DECL),
    ("SemanticId.json", SC_SEMANTIC_ID),
    ("SourceLocus.json", SC_SOURCE_LOCUS),
    ("TypeRef.json", SC_TYPE_REF),
    ("TypeRefTarget.json", SC_TYPE_REF_TARGET),
    ("UniqueConstraint.json", SC_UNIQUE_CONSTRAINT),
    ("UnitSymbol.json", SC_UNIT_SYMBOL),
];

/// Looks up an embedded semantic-core schema document by its filename (e.g.
/// `"ClauseLanguage.json"`).
pub fn semantic_core_by_name(name: &str) -> Option<&'static str> {
    SEMANTIC_CORE_SCHEMAS
        .iter()
        .find(|(schema_name, _)| *schema_name == name)
        .map(|(_, text)| *text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_generated_semantic_core_document_is_embedded_byte_exact() {
        let directory = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/semantic-core/generated/json-schema");
        let mut generated = std::collections::BTreeSet::new();
        let mut missing = Vec::new();
        for entry in std::fs::read_dir(directory).expect("generated schema directory") {
            let path = entry.expect("generated schema entry").path();
            if path
                .extension()
                .is_some_and(|extension| extension == "json")
            {
                let name = path.file_name().unwrap().to_str().unwrap().to_owned();
                generated.insert(name.clone());
                match semantic_core_by_name(&name) {
                    Some(embedded) => assert_eq!(
                        embedded.as_bytes(),
                        std::fs::read(path).expect("generated schema bytes"),
                        "{name} differs from its generated source"
                    ),
                    None => missing.push(name),
                }
            }
        }
        missing.sort();
        assert!(
            missing.is_empty(),
            "unshipped generated schemas: {missing:?}"
        );
        let embedded: std::collections::BTreeSet<_> = SEMANTIC_CORE_SCHEMAS
            .iter()
            .map(|(name, _)| (*name).to_owned())
            .collect();
        assert_eq!(
            embedded.len(),
            SEMANTIC_CORE_SCHEMAS.len(),
            "duplicate names"
        );
        assert_eq!(generated, embedded, "generated and embedded schema census");
    }

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

    #[test]
    fn every_embedded_semantic_core_schema_is_well_formed_json_with_a_matching_id() {
        for (name, text) in SEMANTIC_CORE_SCHEMAS {
            assert!(
                text.contains("\"$id\""),
                "{name} has no $id: {text_start}",
                text_start = &text[..text.len().min(80)]
            );
            assert!(
                text.contains("schemas.agent-ix.org/semantic-core/")
                    && text.contains(&format!("/{name}\"")),
                "{name}'s $id does not match its own filename"
            );
        }
    }

    #[test]
    fn semantic_core_by_name_finds_a_known_type() {
        assert_eq!(
            semantic_core_by_name("ClauseLanguage.json"),
            Some(SC_CLAUSE_LANGUAGE)
        );
        assert_eq!(semantic_core_by_name("does-not-exist.json"), None);
    }

    #[test]
    fn every_semantic_core_ref_names_an_embedded_document() {
        const BASE: &str = "https://schemas.agent-ix.org/semantic-core/";
        for (name, text) in SEMANTIC_CORE_SCHEMAS {
            for (at, _) in text.match_indices("\"$ref\"") {
                let rest = &text[at..];
                let Some(start) = rest.find(BASE) else {
                    continue;
                };
                let after = &rest[start + BASE.len()..];
                let end = after.find('"').expect("a $ref string is terminated");
                let (_, file) = after[..end]
                    .split_once('/')
                    .expect("a semantic-core $ref has a version segment");
                assert!(
                    semantic_core_by_name(file).is_some(),
                    "{name} refs {file}, which is not embedded"
                );
            }
        }
    }
}
