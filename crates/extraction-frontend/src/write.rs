//! FR-097 "Fingerprint" and "Atomic write and sidecars": the crate's one
//! file-system seam (NFR-031-AC-5).
//!
//! `std::fs` appears in this module and nowhere else under `src/`. It
//! reaches the file system for exactly three things: the module manifest
//! bytes the envelope digests ([`read_manifest`]), the output-path checks
//! ([`check_output`]) and the temp-and-rename write ([`write_lift`]). Every
//! byte written comes from [`crate::canonical::canonical_bytes`]; the
//! document's bytes come only inside a [`ValidDocument`], which only
//! [`crate::validate::validate`] constructs (FR-097-CON-3).
//!
//! # Write protocol
//!
//! Every file is first written whole to `.<name>.tmp` beside its final
//! path, and the temporary files are then renamed into place in the order
//! diagnostics, provenance, fingerprint, document, so that a reader that
//! observes `<out>` observes its sidecars. A failure while writing any
//! temporary file removes every temporary file and refuses with
//! `OUTPUT_UNWRITABLE`; a blocking lift writes only the diagnostics
//! sidecar and touches no other path.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::bundle::Refusal;
use crate::canonical::canonical_bytes;
use crate::diagnostics::{Code, Diagnostic};
use crate::provenance::Provenance;
use crate::validate::ValidDocument;

/// The manifest file of a module root.
pub const MANIFEST: &str = "manifest.yaml";
/// The suffix of the fingerprint sidecar.
pub const FINGERPRINT_SUFFIX: &str = ".fingerprint";
/// The suffix of the default diagnostics sidecar.
pub const DIAGNOSTICS_SUFFIX: &str = ".diagnostics.json";
/// The suffix of the default provenance sidecar.
pub const PROVENANCE_SUFFIX: &str = ".provenance.json";
/// The suffix of a temporary file.
const TEMP_SUFFIX: &str = ".tmp";

/// The fingerprint sidecar (quire-specification FR-018's shape, copied
/// verbatim; decision D10).
pub const FINGERPRINT_DOMAIN: &str = "quire.verification.jcs";
pub const FINGERPRINT_VERSION: &str = "rfc8785-v1";
pub const FINGERPRINT_ALGORITHM: &str = "sha256";
/// The prefix of `digest`.
pub const DIGEST_PREFIX: &str = "sha256-jcs:";

/// `<out>.fingerprint` (FR-097 "Fingerprint").
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Fingerprint {
    pub domain: String,
    pub version: String,
    pub algorithm: String,
    /// `sha256-jcs:` followed by 64 lowercase hexadecimal digits.
    pub digest: String,
}

impl Fingerprint {
    /// SHA-256 over exactly `bytes`, the document bytes as written.
    pub fn of(bytes: &[u8]) -> Self {
        Self {
            domain: FINGERPRINT_DOMAIN.to_string(),
            version: FINGERPRINT_VERSION.to_string(),
            algorithm: FINGERPRINT_ALGORITHM.to_string(),
            digest: format!("{DIGEST_PREFIX}{:x}", Sha256::digest(bytes)),
        }
    }
}

/// The four paths one lift writes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OutputPaths {
    /// `<out>`.
    pub document: PathBuf,
    /// `<out>.fingerprint`.
    pub fingerprint: PathBuf,
    /// `--diagnostics`, or `<out>.diagnostics.json`.
    pub diagnostics: PathBuf,
    /// `--provenance`, or `<out>.provenance.json`.
    pub provenance: PathBuf,
}

/// Which option a path came from, for a refusal's message.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Slot {
    Document,
    Fingerprint,
    Diagnostics,
    Provenance,
}

impl Slot {
    fn option(self) -> &'static str {
        match self {
            Slot::Document => "--out",
            Slot::Fingerprint => "the fingerprint sidecar",
            Slot::Diagnostics => "--diagnostics",
            Slot::Provenance => "--provenance",
        }
    }
}

/// `path` with `suffix` appended to its file name.
fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|n| n.to_os_string())
        .unwrap_or_default();
    name.push(suffix);
    path.with_file_name(name)
}

impl OutputPaths {
    /// The paths of `out` with the sidecar overrides FR-099 admits.
    pub fn new(out: &Path, diagnostics: Option<&Path>, provenance: Option<&Path>) -> Self {
        Self {
            document: out.to_path_buf(),
            fingerprint: with_suffix(out, FINGERPRINT_SUFFIX),
            diagnostics: diagnostics
                .map(Path::to_path_buf)
                .unwrap_or_else(|| with_suffix(out, DIAGNOSTICS_SUFFIX)),
            provenance: provenance
                .map(Path::to_path_buf)
                .unwrap_or_else(|| with_suffix(out, PROVENANCE_SUFFIX)),
        }
    }

    /// Every path with its slot, in the rename order.
    pub fn slots(&self) -> [(Slot, &Path); 4] {
        [
            (Slot::Diagnostics, &self.diagnostics),
            (Slot::Provenance, &self.provenance),
            (Slot::Fingerprint, &self.fingerprint),
            (Slot::Document, &self.document),
        ]
    }
}

fn unwritable(message: String) -> Refusal {
    Refusal::new(Diagnostic::frontend(Code::OutputUnwritable, message, None))
}

/// The bytes of `<root>/manifest.yaml`, refused as `MODULE_REFUSED` naming
/// the root when they cannot be read.
pub fn read_manifest(root: &Path) -> Result<Vec<u8>, Refusal> {
    let path = root.join(MANIFEST);
    fs::read(&path).map_err(|error| {
        Refusal::new(Diagnostic::frontend(
            Code::ModuleRefused,
            format!(
                "module root {} has no readable {MANIFEST}: {error}",
                root.display()
            ),
            None,
        ))
    })
}

/// The absolute, symlink-free path `path` names: its parent canonicalized
/// (the file itself need not exist) joined to its file name. `None` when
/// the parent directory does not exist.
fn resolved(path: &Path) -> Option<PathBuf> {
    let parent = match path.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent.to_path_buf(),
        _ => PathBuf::from("."),
    };
    let parent = fs::canonicalize(parent).ok()?;
    Some(parent.join(path.file_name()?))
}

/// Refuse with `OUTPUT_UNWRITABLE` before the bundle is loaded (FR-097
/// "Atomic write and sidecars"): a path under the bundle root or a module
/// root, a missing output directory, or two of the four paths naming one
/// file. Every refusal names the offending path as the option gave it.
pub fn check_output(
    paths: &OutputPaths,
    bundle_root: &Path,
    module_roots: &[&Path],
) -> Result<(), Refusal> {
    let roots: Vec<(&str, PathBuf)> = std::iter::once(("the bundle root", bundle_root))
        .chain(module_roots.iter().map(|root| ("a module root", *root)))
        .filter_map(|(what, root)| fs::canonicalize(root).ok().map(|r| (what, r)))
        .collect();
    let mut seen: Vec<(Slot, &Path, PathBuf)> = Vec::new();
    for (slot, path) in paths.slots() {
        let Some(resolved) = resolved(path) else {
            return Err(unwritable(format!(
                "{} {} names a file in a directory that does not exist",
                slot.option(),
                path.display()
            )));
        };
        if let Some((what, root)) = roots.iter().find(|(_, root)| resolved.starts_with(root)) {
            return Err(unwritable(format!(
                "{} {} lies under {what} {}",
                slot.option(),
                path.display(),
                root.display()
            )));
        }
        if let Some((other_slot, other_path, _)) = seen.iter().find(|(_, _, r)| *r == resolved) {
            return Err(unwritable(format!(
                "{} {} and {} {} resolve to one file",
                other_slot.option(),
                other_path.display(),
                slot.option(),
                path.display()
            )));
        }
        seen.push((slot, path, resolved));
    }
    Ok(())
}

/// What one lift writes besides its diagnostics.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Emission<'a> {
    /// A blocking diagnostic: the diagnostics sidecar alone.
    Blocked,
    /// A success verdict: the document, its fingerprint and its provenance.
    Document {
        document: &'a ValidDocument,
        fingerprint: &'a Fingerprint,
        provenance: &'a Provenance,
    },
}

/// The canonical bytes of a sidecar value (FR-097 "Fingerprint": every
/// sidecar goes through the same `normalized` call as the document).
fn sidecar_bytes<T: Serialize>(value: &T) -> Vec<u8> {
    canonical_bytes(&serde_json::to_value(value).unwrap_or(serde_json::Value::Null))
}

/// One temporary file that is removed unless [`Temp::keep`] is called.
struct Temp {
    path: PathBuf,
    kept: bool,
}

impl Temp {
    fn create(final_path: &Path, bytes: &[u8]) -> io::Result<Self> {
        let path = with_suffix(final_path, TEMP_SUFFIX);
        let temp = Temp { path, kept: false };
        fs::write(&temp.path, bytes)?;
        Ok(temp)
    }

    fn rename_over(mut self, final_path: &Path) -> io::Result<()> {
        fs::rename(&self.path, final_path)?;
        self.kept = true;
        Ok(())
    }
}

impl Drop for Temp {
    fn drop(&mut self) {
        if !self.kept {
            // Best effort: the path may already be gone, and a removal
            // failure has nothing left to refuse with.
            let _ = fs::remove_file(&self.path);
        }
    }
}

/// Write the lift's files (FR-097 "Atomic write and sidecars"): on
/// [`Emission::Document`] all four, on [`Emission::Blocked`] the
/// diagnostics sidecar alone. Every file is written to a temporary file in
/// its own directory and renamed over its final path, in the order
/// diagnostics, provenance, fingerprint, document. A failure refuses with
/// `OUTPUT_UNWRITABLE` naming the path and leaves no temporary file.
pub fn write_lift(
    paths: &OutputPaths,
    emission: Emission<'_>,
    diagnostics: &[Diagnostic],
) -> Result<(), Refusal> {
    let mut planned: Vec<(&Path, Vec<u8>)> =
        vec![(&paths.diagnostics, sidecar_bytes(&diagnostics))];
    if let Emission::Document {
        document,
        fingerprint,
        provenance,
    } = emission
    {
        planned.push((&paths.provenance, sidecar_bytes(provenance)));
        planned.push((&paths.fingerprint, sidecar_bytes(fingerprint)));
        planned.push((&paths.document, document.bytes().to_vec()));
    }
    let mut temps: Vec<(&Path, Temp)> = Vec::with_capacity(planned.len());
    for (path, bytes) in &planned {
        let temp = Temp::create(path, bytes).map_err(|error| {
            unwritable(format!("{} cannot be written: {error}", path.display()))
        })?;
        temps.push((path, temp));
    }
    for (path, temp) in temps {
        temp.rename_over(path).map_err(|error| {
            unwritable(format!("{} cannot be replaced: {error}", path.display()))
        })?;
    }
    Ok(())
}
