//! FR-095 "The `source` block" and "The `package` block": the IR document's
//! envelope as a pure function of loaded document bytes and loaded manifest
//! bytes.
//!
//! `source.dialect` is `spec-bundle`: the Markdown bundle is the authored
//! source and the extraction record is not a projection of it (the declared
//! reading of issue #77; FR-030's value, FR-095-CON-3). Nothing here reads
//! the file system, the environment, or a clock: the manifest bytes arrive
//! as [`ModuleManifest`] values the loader supplies.

use std::collections::BTreeSet;

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::bundle::{Bundle, Document};
use crate::identity::PackageIdentity;

pub use crate::provenance::provenance_record;

/// The one `frontendDialect` this frontend stamps (FR-095-CON-3).
pub const DIALECT: &str = "spec-bundle";
/// `source.version` and `package.version` when `spec.md` carries no
/// `version`.
pub const DEFAULT_VERSION: &str = "0.0.0";
/// The bundle-root-relative path of the document carrying `version`.
const SPEC_MD: &str = "spec/spec.md";

/// One loaded module as the envelope and the provenance record see it: its
/// manifest bytes and the manifest values the digests and the record name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModuleManifest {
    /// Manifest `name`.
    pub name: String,
    /// Manifest `version`.
    pub version: String,
    /// `semantic.package`: `<org>/<repo>`.
    pub package: String,
    /// `semantic.contract_version`.
    pub contract_version: String,
    /// The raw `manifest.yaml` bytes.
    pub bytes: Vec<u8>,
}

impl ModuleManifest {
    /// The manifest values of `name` as `bundle` loaded them, joined to the
    /// manifest `bytes` the caller read from the module root. `None` when
    /// the bundle loaded no module of that name.
    pub fn from_bundle(bundle: &Bundle, name: &str, bytes: Vec<u8>) -> Option<Self> {
        let semantic = bundle.semantic_module(name)?;
        Some(Self {
            name: name.to_string(),
            version: bundle.module_version(name)?.to_string(),
            package: semantic.package.clone(),
            contract_version: semantic.contract_version.clone(),
            bytes,
        })
    }

    /// Lowercase hex SHA-256 of the manifest bytes, no prefix.
    pub fn sha256_hex(&self) -> String {
        hex(&self.bytes)
    }
}

/// `source` (semantic-ir.schema.json `#/properties/source`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SourceBlock {
    pub identity: String,
    pub version: String,
    pub dialect: String,
    pub digest: String,
}

/// `package` (semantic-ir.schema.json `#/properties/package`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageBlock {
    pub identity: String,
    pub version: String,
    pub manifest_digest: String,
    pub mapping_versions: Vec<String>,
    pub profile_versions: Vec<String>,
    pub lock_digest: String,
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

/// `sha256:<hex>` over `bytes`.
pub fn sha256_prefixed(bytes: &[u8]) -> String {
    format!("sha256:{}", hex(bytes))
}

fn hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
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

/// `sha256:<hex>` over, for each document in path order under code-point
/// comparison, its path bytes, `0x00`, its raw bytes, `0x00`
/// (FR-095-AC-3).
pub fn source_digest(documents: &[Document]) -> String {
    let mut ordered: Vec<&Document> = documents.iter().collect();
    ordered.sort_by(|a, b| a.path().as_bytes().cmp(b.path().as_bytes()));
    let mut hasher = Sha256::new();
    for document in ordered {
        hasher.update(document.path().as_bytes());
        hasher.update([0u8]);
        hasher.update(document.raw().as_bytes());
        hasher.update([0u8]);
    }
    format!("sha256:{:x}", hasher.finalize())
}

/// The `source` block of `bundle`.
pub fn source_block(bundle: &Bundle) -> SourceBlock {
    let identity = PackageIdentity::from(bundle.package());
    SourceBlock {
        identity: identity.source(),
        version: source_version(bundle),
        dialect: DIALECT.to_string(),
        digest: source_digest(bundle.documents()),
    }
}

/// `modules` in module-name order under code-point comparison.
fn by_name(modules: &[ModuleManifest]) -> Vec<&ModuleManifest> {
    let mut ordered: Vec<&ModuleManifest> = modules.iter().collect();
    ordered.sort_by(|a, b| a.name.as_bytes().cmp(b.name.as_bytes()));
    ordered
}

/// `sha256:<hex>` over the manifest bytes of every loaded module,
/// concatenated in module-name order (FR-095-AC-4, FR-095-AC-11).
pub fn manifest_digest(modules: &[ModuleManifest]) -> String {
    let mut hasher = Sha256::new();
    for module in by_name(modules) {
        hasher.update(&module.bytes);
    }
    format!("sha256:{:x}", hasher.finalize())
}

/// `sha256:<hex>` over the lines `<module package>@<module version>:<manifest
/// sha256>`, one per loaded module, sorted by code point and each terminated
/// by `\n` (FR-095-AC-4).
pub fn lock_digest(modules: &[ModuleManifest]) -> String {
    let lines: BTreeSet<String> = modules
        .iter()
        .map(|m| format!("{}@{}:{}\n", m.package, m.version, m.sha256_hex()))
        .collect();
    let mut hasher = Sha256::new();
    for line in &lines {
        hasher.update(line.as_bytes());
    }
    format!("sha256:{:x}", hasher.finalize())
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
        manifest_digest: manifest_digest(modules),
        mapping_versions: mapping_versions.into_iter().map(str::to_string).collect(),
        profile_versions: Vec::new(),
        lock_digest: lock_digest(modules),
    }
}
