//! FR-095 "The `source` block" and "The `package` block": the IR document's
//! envelope as a pure function of the loaded bundle and module metadata.
//!
//! `source.dialect` is `spec-bundle`: the Markdown bundle is the authored
//! source and the extraction record is not a projection of it (the declared
//! reading of issue #77; FR-030's value, FR-095-CON-3). Nothing here reads
//! the file system, the environment, or a clock.

use std::collections::BTreeSet;

use serde::Serialize;

use crate::bundle::{Bundle, Document};
use crate::identity::PackageIdentity;

/// The one `frontendDialect` this frontend stamps (FR-095-CON-3).
pub const DIALECT: &str = "spec-bundle";
/// `source.version` and `package.version` when `spec.md` carries no
/// `version`.
pub const DEFAULT_VERSION: &str = "0.0.0";
/// The bundle-root-relative path of the document carrying `version`.
const SPEC_MD: &str = "spec/spec.md";

/// One loaded module as the envelope sees its versioned metadata.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModuleManifest {
    /// Manifest `name`.
    pub name: String,
    /// `semantic.contract_version`.
    pub contract_version: String,
}

impl ModuleManifest {
    /// The module metadata of `name` as `bundle` loaded it, or `None` when absent.
    pub fn from_bundle(bundle: &Bundle, name: &str) -> Option<Self> {
        let semantic = bundle.semantic_module(name)?;
        Some(Self {
            name: name.to_string(),
            contract_version: semantic.contract_version.clone(),
        })
    }
}

/// `source` (semantic-ir.schema.json `#/properties/source`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SourceBlock {
    pub identity: String,
    pub version: String,
    pub dialect: String,
}

/// `package` (semantic-ir.schema.json `#/properties/package`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageBlock {
    pub identity: String,
    pub version: String,
    pub mapping_versions: Vec<String>,
    pub profile_versions: Vec<String>,
}

/// The envelope members of the IR document besides `types`: `source`,
/// `package`, and the two lists this frontend always emits empty.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Envelope {
    pub source: SourceBlock,
    pub package: PackageBlock,
    pub occurrences: Vec<serde_json::Value>,
    pub extensions: Vec<serde_json::Value>,
}

impl Envelope {
    /// `source` and `package` over `bundle` and its loaded `modules`, with
    /// `occurrences: []` and `extensions: []`.
    pub fn new(bundle: &Bundle, modules: &[ModuleManifest]) -> Self {
        Self {
            source: source_block(bundle),
            package: package_block(bundle, modules),
            occurrences: Vec::new(),
            extensions: Vec::new(),
        }
    }
}

/// `spec.md` frontmatter `version`, or `0.0.0` (FR-095-AC-2).
pub fn source_version(bundle: &Bundle) -> String {
    bundle
        .documents()
        .iter()
        .find(|d| d.path() == SPEC_MD)
        .and_then(Document::frontmatter)
        .and_then(|fm| fm.get("version"))
        .and_then(|v| match v {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
        .unwrap_or_else(|| DEFAULT_VERSION.to_string())
}

/// The `source` block of `bundle`.
pub fn source_block(bundle: &Bundle) -> SourceBlock {
    let identity = PackageIdentity::from(bundle.package());
    SourceBlock {
        identity: identity.source(),
        version: source_version(bundle),
        dialect: DIALECT.to_string(),
    }
}

/// The `package` block of `bundle` under `modules`.
pub fn package_block(bundle: &Bundle, modules: &[ModuleManifest]) -> PackageBlock {
    let identity = PackageIdentity::from(bundle.package());
    let mapping_versions: BTreeSet<&str> = modules
        .iter()
        .map(|m| m.contract_version.as_str())
        .collect();
    PackageBlock {
        identity: identity.package(),
        version: source_version(bundle),
        mapping_versions: mapping_versions.into_iter().map(str::to_string).collect(),
        profile_versions: Vec::new(),
    }
}
