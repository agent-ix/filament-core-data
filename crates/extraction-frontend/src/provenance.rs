//! FR-095 "Provenance": the record FR-097 writes as `<out>.provenance.json`.
//!
//! Every pinned value comes from the root `Cargo.lock` embedded at build
//! time — the `quire-rs` version and git revision, and this crate's own
//! version — never from `env!`, `option_env!`, or the process environment
//! (FR-095-AC-12). The record names a module by `name`, `version`, and
//! manifest digest and carries no root path, clock reading, hostname, or
//! username (FR-019-CON-1).

use std::fmt;

use serde::Serialize;

use crate::bundle::Bundle;
use crate::envelope::ModuleManifest;
use crate::identity::PackageIdentity;

/// The workspace lock, embedded at build time.
const LOCK: &str = include_str!("../../../Cargo.lock");
/// The engine crate the record names.
pub const ENGINE_CRATE: &str = "quire-rs";
/// This crate, as the lock names it.
pub const FRONTEND_CRATE: &str = "agent-ix-extraction-frontend";

/// The embedded lock does not pin what the record must name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProvenanceError {
    /// No `[[package]]` entry named `crate`.
    CrateNotPinned { krate: String },
    /// The `quire-rs` entry's `source` is not a `git+…#<rev>` pin.
    EngineNotGitPinned { source: String },
}

impl fmt::Display for ProvenanceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProvenanceError::CrateNotPinned { krate } => {
                write!(f, "the embedded Cargo.lock pins no crate named `{krate}`")
            }
            ProvenanceError::EngineNotGitPinned { source } => write!(
                f,
                "the embedded Cargo.lock pins `{ENGINE_CRATE}` from `{source}`, not a git revision"
            ),
        }
    }
}

impl std::error::Error for ProvenanceError {}

/// One `[[package]]` entry of the embedded lock.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LockEntry {
    pub name: String,
    pub version: String,
    /// `source = "…"`, absent for a workspace member.
    pub source: Option<String>,
}

impl LockEntry {
    /// The git revision a `git+<url>?…#<rev>` source pins.
    pub fn git_revision(&self) -> Option<&str> {
        let source = self.source.as_deref()?;
        let rest = source.strip_prefix("git+")?;
        rest.rsplit_once('#').map(|(_, rev)| rev)
    }
}

/// Every `[[package]]` entry of `lock`, in file order.
pub fn parse_lock(lock: &str) -> Vec<LockEntry> {
    let mut entries = Vec::new();
    let mut current: Option<LockEntry> = None;
    for raw in lock.lines() {
        let line = raw.trim();
        if line == "[[package]]" {
            if let Some(entry) = current.take() {
                entries.push(entry);
            }
            current = Some(LockEntry {
                name: String::new(),
                version: String::new(),
                source: None,
            });
            continue;
        }
        let Some(entry) = current.as_mut() else {
            continue;
        };
        let Some((key, value)) = line.split_once(" = ") else {
            continue;
        };
        let Some(value) = value.strip_prefix('"').and_then(|v| v.strip_suffix('"')) else {
            continue;
        };
        match key {
            "name" => entry.name = value.to_string(),
            "version" => entry.version = value.to_string(),
            "source" => entry.source = Some(value.to_string()),
            _ => {}
        }
    }
    if let Some(entry) = current {
        entries.push(entry);
    }
    entries
}

/// The embedded lock's entry for `name`.
pub fn lock_entry(name: &str) -> Result<LockEntry, ProvenanceError> {
    parse_lock(LOCK)
        .into_iter()
        .find(|e| e.name == name)
        .ok_or_else(|| ProvenanceError::CrateNotPinned {
            krate: name.to_string(),
        })
}

/// `source.identity` of the lifted bundle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SourceProvenance {
    pub identity: String,
}

/// One loaded module: how a test joins the record to the vendored module's
/// `PROVENANCE.json` (FR-095-AC-15).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleProvenance {
    pub name: String,
    pub version: String,
    pub manifest_sha256: String,
}

/// The engine as the embedded lock pins it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct EngineProvenance {
    pub name: String,
    pub version: String,
    pub revision: String,
}

/// A crate named by version alone.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CrateProvenance {
    pub name: String,
    pub version: String,
}

/// The vendored semantic-core the engine resolves against.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SemanticCoreProvenance {
    pub version: String,
}

/// The provenance record (FR-095 "Provenance").
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provenance {
    pub source: SourceProvenance,
    pub modules: Vec<ModuleProvenance>,
    pub engine: EngineProvenance,
    pub semantic_core: SemanticCoreProvenance,
    pub frontend: CrateProvenance,
}

/// The vendored semantic-core version: the newest bundle the engine embeds.
pub fn semantic_core_version() -> String {
    quire_rs::semantic::vendored::SEMANTIC_CORE_VERSIONS
        .last()
        .map(|v| (*v).to_string())
        .unwrap_or_default()
}

/// The provenance record of `bundle` under `modules`.
pub fn provenance_record(
    bundle: &Bundle,
    modules: &[ModuleManifest],
) -> Result<Provenance, ProvenanceError> {
    let engine = lock_entry(ENGINE_CRATE)?;
    let revision = engine
        .git_revision()
        .ok_or_else(|| ProvenanceError::EngineNotGitPinned {
            source: engine.source.clone().unwrap_or_default(),
        })?
        .to_string();
    let frontend = lock_entry(FRONTEND_CRATE)?;
    let mut ordered: Vec<&ModuleManifest> = modules.iter().collect();
    ordered.sort_by(|a, b| a.name.as_bytes().cmp(b.name.as_bytes()));
    Ok(Provenance {
        source: SourceProvenance {
            identity: PackageIdentity::from(bundle.package()).source(),
        },
        modules: ordered
            .into_iter()
            .map(|m| ModuleProvenance {
                name: m.name.clone(),
                version: m.version.clone(),
                manifest_sha256: m.sha256_hex(),
            })
            .collect(),
        engine: EngineProvenance {
            name: ENGINE_CRATE.to_string(),
            version: engine.version,
            revision,
        },
        semantic_core: SemanticCoreProvenance {
            version: semantic_core_version(),
        },
        frontend: CrateProvenance {
            name: FRONTEND_CRATE.to_string(),
            version: frontend.version,
        },
    })
}
