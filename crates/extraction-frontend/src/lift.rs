//! The library entry the `lift` command calls (FR-099): one bundle under
//! one module set to one document and three sidecars.
//!
//! The pipeline is FR-091 load → FR-092/093/094 lower → FR-095 envelope →
//! FR-097 sort, decide, fingerprint, write. The output paths are checked
//! before the bundle is loaded; a refusal writes nothing; a lift with a
//! blocking diagnostic writes the diagnostics sidecar alone and consults no
//! reader, because its document is not a candidate; a document the reader
//! rejects blocks with one `INVALID_IR` per reader diagnostic.

use std::path::{Path, PathBuf};

use agent_ix_semantic_ir::ResultState;
use serde_json::Value;

use crate::bundle::{parsed_manifest, Bundle, Refusal};
use crate::diagnostics::{is_blocked, sort_diagnostics, Code, Diagnostic};
use crate::document::assemble;
use crate::envelope::{Envelope, ModuleManifest};
use crate::extract::extract;
use crate::limits::Limits;
use crate::lower::lower_bundle;
use crate::provenance::{provenance_record, Provenance};
use crate::resolve::resolve;
use crate::scalars::check_library;
use crate::validate::validate;
use crate::write::{check_output, read_manifest, write_lift, Emission, Fingerprint, OutputPaths};

/// One lift as the command line names it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LiftRequest {
    pub bundle_root: PathBuf,
    /// Every `--module`, in the given order.
    pub module_roots: Vec<PathBuf>,
    /// `--out`.
    pub out: PathBuf,
    /// `--diagnostics`, when given.
    pub diagnostics: Option<PathBuf>,
    /// `--provenance`, when given.
    pub provenance: Option<PathBuf>,
}

impl LiftRequest {
    /// The four output paths of the request.
    pub fn paths(&self) -> OutputPaths {
        OutputPaths::new(
            &self.out,
            self.diagnostics.as_deref(),
            self.provenance.as_deref(),
        )
    }
}

/// What one lift did.
#[derive(Debug, Clone)]
pub enum LiftOutcome {
    /// Refused before lowering or by the file system: nothing written
    /// (FR-099 exit `2`).
    Refused(Refusal),
    /// At least one blocking diagnostic: `<out>.diagnostics.json` written,
    /// nothing else touched (exit `1`).
    Blocked { diagnostics: Vec<Diagnostic> },
    /// No blocking diagnostic: all four files written (exit `0`).
    Written {
        diagnostics: Vec<Diagnostic>,
        /// The reader's verdict over the written document.
        result_state: ResultState,
        /// The document bytes as written.
        document: Vec<u8>,
        fingerprint: Fingerprint,
    },
}

impl LiftOutcome {
    /// The diagnostics the lift reported, in FR-096 order; a refusal's one
    /// diagnostic.
    pub fn diagnostics(&self) -> Vec<Diagnostic> {
        match self {
            LiftOutcome::Refused(refusal) => vec![(*refusal.diagnostic).clone()],
            LiftOutcome::Blocked { diagnostics } | LiftOutcome::Written { diagnostics, .. } => {
                diagnostics.clone()
            }
        }
    }
}

/// The manifest of every module root as the envelope sees it.
fn manifests(bundle: &Bundle, module_roots: &[&Path]) -> Result<Vec<ModuleManifest>, Refusal> {
    module_roots
        .iter()
        .map(|root| {
            let bytes = read_manifest(root)?;
            let (name, _) = parsed_manifest(root, &bytes)?;
            ModuleManifest::from_bundle(bundle, &name, bytes).ok_or_else(|| {
                Refusal::new(Diagnostic::frontend(
                    Code::ModuleRefused,
                    format!(
                        "module root {} declares `name: {name}`, which the engine did not load",
                        root.display()
                    ),
                    None,
                ))
            })
        })
        .collect()
}

/// Lift `request` (FR-097, FR-099).
pub fn lift(request: &LiftRequest) -> LiftOutcome {
    let module_roots: Vec<&Path> = request.module_roots.iter().map(PathBuf::as_path).collect();
    let paths = request.paths();
    if let Err(refusal) = check_output(&paths, &request.bundle_root, &module_roots) {
        return LiftOutcome::Refused(refusal);
    }
    let bundle = match Bundle::load(&request.bundle_root, &module_roots) {
        Ok(bundle) => bundle,
        Err(refusal) => return LiftOutcome::Refused(refusal),
    };
    let modules = match manifests(&bundle, &module_roots) {
        Ok(modules) => modules,
        Err(refusal) => return LiftOutcome::Refused(refusal),
    };
    let provenance = match provenance_record(&bundle, &modules) {
        Ok(provenance) => provenance,
        Err(error) => {
            // The embedded lock does not pin what the provenance sidecar
            // must name: the sidecar cannot be produced, so nothing is.
            return LiftOutcome::Refused(Refusal::new(Diagnostic::frontend(
                Code::OutputUnwritable,
                format!("{} cannot be produced: {error}", paths.provenance.display()),
                None,
            )));
        }
    };
    let limits = match Limits::declared() {
        Ok(limits) => limits,
        Err(error) => {
            return LiftOutcome::Refused(Refusal::new(Diagnostic::frontend(
                Code::OutputUnwritable,
                format!("the crate's limits.json does not parse: {error}"),
                None,
            )));
        }
    };
    // SR-169 FND-1494: an unparseable embedded kernel-scalar library is a
    // build defect surfaced here, never an empty map that turns every
    // `Type` cell into `UNRESOLVED_TYPE_TOKEN`.
    if let Err(error) = check_library() {
        return LiftOutcome::Refused(Refusal::new(Diagnostic::frontend(
            Code::OutputUnwritable,
            format!("the crate's embedded kernel-scalars.json does not parse: {error}"),
            None,
        )));
    }
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    let lowered = lower_bundle(
        &bundle,
        &extractions,
        &resolutions,
        &limits,
        &provenance.frontend.version,
    );
    let mut diagnostics = extractions.diagnostics;
    diagnostics.extend(lowered.diagnostics);
    let envelope = Envelope::new(&bundle, &modules);
    let document = assemble(&envelope, &lowered.types, &lowered.constructs);
    emit(&paths, document, diagnostics, &provenance)
}

/// The FR-097 tail of a lift over an assembled `document`: sort, decide,
/// fingerprint, write. `diagnostics` are the frontend's own findings so far;
/// when one blocks, the document is not a candidate and only the
/// diagnostics sidecar is written.
pub fn emit(
    paths: &OutputPaths,
    document: Value,
    mut diagnostics: Vec<Diagnostic>,
    provenance: &Provenance,
) -> LiftOutcome {
    if is_blocked(&diagnostics) {
        sort_diagnostics(&mut diagnostics);
        return match write_lift(paths, Emission::Blocked, &diagnostics) {
            Ok(()) => LiftOutcome::Blocked { diagnostics },
            Err(refusal) => LiftOutcome::Refused(refusal),
        };
    }
    let valid = match validate(document) {
        Ok(valid) => valid,
        Err(invalid) => {
            diagnostics.extend(invalid);
            sort_diagnostics(&mut diagnostics);
            return match write_lift(paths, Emission::Blocked, &diagnostics) {
                Ok(()) => LiftOutcome::Blocked { diagnostics },
                Err(refusal) => LiftOutcome::Refused(refusal),
            };
        }
    };
    sort_diagnostics(&mut diagnostics);
    let fingerprint = Fingerprint::of(valid.bytes());
    let emission = Emission::Document {
        document: &valid,
        fingerprint: &fingerprint,
        provenance,
    };
    match write_lift(paths, emission, &diagnostics) {
        Ok(()) => LiftOutcome::Written {
            diagnostics,
            result_state: valid.result_state(),
            document: valid.bytes().to_vec(),
            fingerprint,
        },
        Err(refusal) => LiftOutcome::Refused(refusal),
    }
}
