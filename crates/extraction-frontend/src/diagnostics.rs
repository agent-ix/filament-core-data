//! The closed diagnostic registry of FR-096.
//!
//! Task-128 lays the registry down so FR-091's refusals and engine wrappers
//! carry final codes from the first commit; Task-129 extends it (sorting,
//! truncation, the reader wrapper, the generated document) without
//! replacing a variant. Every code the frontend emits is one [`Code`]; the
//! wire spelling `<namespace>.<component>.<NAME>` exists only in
//! [`WireCode`]'s `Display`, never as a literal (FR-096-AC-3).

use std::fmt;

use quire_rs::semantic::{SemanticDiagnostic, SemanticSeverity};
use serde::Serialize;

/// The namespace segment of every wire code.
const NAMESPACE: &str = "agent-ix";
/// The component segment of every wire code.
const COMPONENT: &str = "extraction-frontend";
/// `owner` of every diagnostic the frontend raises.
pub const OWNER: &str = "ix://agent-ix/filament-core-data/extraction-frontend";
/// `owner` of a reproduced engine diagnostic (`causes[0]` of `ENGINE_DIAGNOSTIC`).
const ENGINE_OWNER: &str = "ix://agent-ix/quire-rs/semantic";

/// The closed registry (FR-096 "The registry"): exactly these 26 codes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Code {
    ModuleWithoutSemanticBlock,
    ModuleRefused,
    BundleUnidentified,
    DuplicateArtifactId,
    UnknownObjectType,
    UnresolvedTypeToken,
    StaleTypeToken,
    ImportUnsupported,
    KernelNameShadowed,
    UnnameableArtifact,
    ArtifactNotLowered,
    DuplicateTypeName,
    DuplicateConstraint,
    ConstraintNotApplicable,
    DeclaredLoss,
    UnresolvedRelationshipTarget,
    UnknownEdgeVerb,
    UnsluggableName,
    OutputUnwritable,
    LimitMaxDocuments,
    LimitMaxDocumentBytes,
    LimitMaxFieldsPerRecord,
    LimitMaxClauseBytes,
    LimitMaxDepth,
    EngineDiagnostic,
    InvalidIr,
}

/// Severity on the wire: `common.schema.json#/$defs/diagnostic/severity`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Info,
    Warning,
    Error,
}

impl Severity {
    /// The FR-096 mapping of an engine severity: `advisory` is `info`.
    pub fn from_engine(severity: SemanticSeverity) -> Self {
        match severity {
            SemanticSeverity::Advisory => Severity::Info,
            SemanticSeverity::Warning => Severity::Warning,
            SemanticSeverity::Error => Severity::Error,
        }
    }
}

/// The engine `availability.fields.reason` an `ARTIFACT_NOT_LOWERED`
/// carries; only `legacy-form` softens the disposition.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotLoweredReason {
    LegacyForm,
    Other,
}

impl NotLoweredReason {
    pub fn from_engine(reason: &str) -> Self {
        if reason == "legacy-form" {
            NotLoweredReason::LegacyForm
        } else {
            NotLoweredReason::Other
        }
    }
}

/// The only context FR-096-CON-1 lets severity and blocking depend on
/// besides the code itself.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Disposition {
    /// The frontend's own finding: fixed by the code alone.
    Frontend,
    /// An engine `SemanticDiagnostic` wrapped as `ENGINE_DIAGNOSTIC`.
    Engine(SemanticSeverity),
    /// `ARTIFACT_NOT_LOWERED` with the engine's availability reason.
    NotLowered(NotLoweredReason),
}

impl Code {
    /// Every variant, in registry order.
    pub const ALL: [Code; 26] = [
        Code::ModuleWithoutSemanticBlock,
        Code::ModuleRefused,
        Code::BundleUnidentified,
        Code::DuplicateArtifactId,
        Code::UnknownObjectType,
        Code::UnresolvedTypeToken,
        Code::StaleTypeToken,
        Code::ImportUnsupported,
        Code::KernelNameShadowed,
        Code::UnnameableArtifact,
        Code::ArtifactNotLowered,
        Code::DuplicateTypeName,
        Code::DuplicateConstraint,
        Code::ConstraintNotApplicable,
        Code::DeclaredLoss,
        Code::UnresolvedRelationshipTarget,
        Code::UnknownEdgeVerb,
        Code::UnsluggableName,
        Code::OutputUnwritable,
        Code::LimitMaxDocuments,
        Code::LimitMaxDocumentBytes,
        Code::LimitMaxFieldsPerRecord,
        Code::LimitMaxClauseBytes,
        Code::LimitMaxDepth,
        Code::EngineDiagnostic,
        Code::InvalidIr,
    ];

    /// The `<NAME>` segment of the wire code.
    pub fn name(self) -> &'static str {
        match self {
            Code::ModuleWithoutSemanticBlock => "MODULE_WITHOUT_SEMANTIC_BLOCK",
            Code::ModuleRefused => "MODULE_REFUSED",
            Code::BundleUnidentified => "BUNDLE_UNIDENTIFIED",
            Code::DuplicateArtifactId => "DUPLICATE_ARTIFACT_ID",
            Code::UnknownObjectType => "UNKNOWN_OBJECT_TYPE",
            Code::UnresolvedTypeToken => "UNRESOLVED_TYPE_TOKEN",
            Code::StaleTypeToken => "STALE_TYPE_TOKEN",
            Code::ImportUnsupported => "IMPORT_UNSUPPORTED",
            Code::KernelNameShadowed => "KERNEL_NAME_SHADOWED",
            Code::UnnameableArtifact => "UNNAMEABLE_ARTIFACT",
            Code::ArtifactNotLowered => "ARTIFACT_NOT_LOWERED",
            Code::DuplicateTypeName => "DUPLICATE_TYPE_NAME",
            Code::DuplicateConstraint => "DUPLICATE_CONSTRAINT",
            Code::ConstraintNotApplicable => "CONSTRAINT_NOT_APPLICABLE",
            Code::DeclaredLoss => "DECLARED_LOSS",
            Code::UnresolvedRelationshipTarget => "UNRESOLVED_RELATIONSHIP_TARGET",
            Code::UnknownEdgeVerb => "UNKNOWN_EDGE_VERB",
            Code::UnsluggableName => "UNSLUGGABLE_NAME",
            Code::OutputUnwritable => "OUTPUT_UNWRITABLE",
            Code::LimitMaxDocuments => "LIMIT_MAX_DOCUMENTS",
            Code::LimitMaxDocumentBytes => "LIMIT_MAX_DOCUMENT_BYTES",
            Code::LimitMaxFieldsPerRecord => "LIMIT_MAX_FIELDS_PER_RECORD",
            Code::LimitMaxClauseBytes => "LIMIT_MAX_CLAUSE_BYTES",
            Code::LimitMaxDepth => "LIMIT_MAX_DEPTH",
            Code::EngineDiagnostic => "ENGINE_DIAGNOSTIC",
            Code::InvalidIr => "INVALID_IR",
        }
    }

    /// The one severity FR-096 fixes per code (plus the engine severity for
    /// `ENGINE_DIAGNOSTIC` and the engine reason for `ARTIFACT_NOT_LOWERED`).
    pub fn severity(self, disposition: Disposition) -> Severity {
        match (self, disposition) {
            (Code::DeclaredLoss, _) => Severity::Info,
            (Code::KernelNameShadowed, _) => Severity::Warning,
            (Code::ArtifactNotLowered, Disposition::NotLowered(NotLoweredReason::LegacyForm)) => {
                Severity::Warning
            }
            (Code::EngineDiagnostic, Disposition::Engine(severity)) => {
                Severity::from_engine(severity)
            }
            _ => Severity::Error,
        }
    }

    /// The one blocking disposition FR-096 fixes per code.
    pub fn blocking(self, disposition: Disposition) -> bool {
        match (self, disposition) {
            (Code::DeclaredLoss, _) | (Code::KernelNameShadowed, _) => false,
            (Code::ArtifactNotLowered, Disposition::NotLowered(NotLoweredReason::LegacyForm)) => {
                false
            }
            (Code::EngineDiagnostic, Disposition::Engine(severity)) => {
                Severity::from_engine(severity) == Severity::Error
            }
            _ => true,
        }
    }
}

impl fmt::Display for Code {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{NAMESPACE}.{COMPONENT}.{}", self.name())
    }
}

/// The `code` of one diagnostic on the wire: a registry code, or a foreign
/// code reproduced verbatim inside `causes` (an engine `semantic.*` code, a
/// reader `semantic-ir` code). A foreign code is never the code
/// of a top-level diagnostic (FR-096).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WireCode {
    Registry(Code),
    Foreign(String),
}

impl fmt::Display for WireCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WireCode::Registry(code) => code.fmt(f),
            WireCode::Foreign(code) => f.write_str(code),
        }
    }
}

impl Serialize for WireCode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

/// `common.schema.json#/$defs/sourceLocus`, start position only.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Locus {
    pub source_identity: String,
    /// Bundle-root-relative, `/`-separated.
    pub path: String,
    pub start_line: usize,
    pub start_column: usize,
}

impl Locus {
    pub fn new(source_identity: &str, path: &str, line: usize, column: usize) -> Self {
        Self {
            source_identity: source_identity.to_string(),
            path: path.to_string(),
            start_line: line,
            start_column: column,
        }
    }

    /// Line 1, column 1 of `path`: the frontmatter block of a document, the
    /// manifest of a module, `spec.md` of a bundle.
    pub fn head(source_identity: &str, path: &str) -> Self {
        Self::new(source_identity, path, 1, 1)
    }
}

/// One `common.schema.json#/$defs/diagnostic`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Diagnostic {
    pub code: WireCode,
    pub severity: Severity,
    pub message: String,
    pub owner: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locus: Option<Locus>,
    pub blocking: bool,
    pub causes: Vec<Diagnostic>,
    pub related: Vec<Locus>,
}

impl Diagnostic {
    /// One of the frontend's own findings, with severity and blocking fixed
    /// by the code.
    pub fn frontend(code: Code, message: impl Into<String>, locus: Option<Locus>) -> Self {
        Self {
            code: WireCode::Registry(code),
            severity: code.severity(Disposition::Frontend),
            message: message.into(),
            owner: OWNER.to_string(),
            locus,
            blocking: code.blocking(Disposition::Frontend),
            causes: Vec::new(),
            related: Vec::new(),
        }
    }

    /// One engine `SemanticDiagnostic` about the document at `path`, wrapped
    /// as `ENGINE_DIAGNOSTIC` (FR-096 "Engine diagnostics", "Locus"): the
    /// message begins with the engine code and carries the engine reason;
    /// `causes[0]` reproduces the engine's code and message verbatim; the locus carries the engine's
    /// line and column when the line is at least 1, and is absent — with the
    /// path in `related` and in the message — otherwise.
    pub fn engine(engine: &SemanticDiagnostic, source_identity: &str, path: &str) -> Self {
        let disposition = Disposition::Engine(engine.severity);
        let code = Code::EngineDiagnostic;
        let severity = code.severity(disposition);
        let blocking = code.blocking(disposition);
        // `$defs/diagnostic` has no `reason` slot, so `causes[0]` reproduces
        // the engine code and message verbatim and the reason rides in the
        // wrapper's message.
        let cause = Diagnostic {
            code: WireCode::Foreign(engine.code.clone()),
            severity,
            message: engine.message.clone(),
            owner: ENGINE_OWNER.to_string(),
            locus: None,
            blocking,
            causes: Vec::new(),
            related: Vec::new(),
        };
        let reason = engine
            .reason
            .as_ref()
            .map(|r| format!(" (reason: {r})"))
            .unwrap_or_default();
        let (message, locus, related) = match engine.line {
            Some(line) if line >= 1 => (
                format!("{}: {}{reason}", engine.code, engine.message),
                Some(Locus::new(
                    source_identity,
                    path,
                    line,
                    engine.column.unwrap_or(1),
                )),
                Vec::new(),
            ),
            _ => (
                format!("{}: {}{reason} ({path})", engine.code, engine.message),
                None,
                vec![Locus::head(source_identity, path)],
            ),
        };
        Self {
            code: WireCode::Registry(code),
            severity,
            message,
            owner: OWNER.to_string(),
            locus,
            blocking,
            causes: vec![cause],
            related,
        }
    }

    /// The registry code of a top-level diagnostic. `None` only for a
    /// reproduced foreign cause.
    pub fn registry_code(&self) -> Option<Code> {
        match self.code {
            WireCode::Registry(code) => Some(code),
            WireCode::Foreign(_) => None,
        }
    }

    /// Attach one related locus.
    pub fn with_related(mut self, locus: Locus) -> Self {
        self.related.push(locus);
        self
    }

    /// Attach one cause.
    pub fn with_cause(mut self, cause: Diagnostic) -> Self {
        self.causes.push(cause);
        self
    }
}

impl fmt::Display for Diagnostic {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)?;
        if let Some(locus) = &self.locus {
            write!(
                f,
                " ({}:{}:{})",
                locus.path, locus.start_line, locus.start_column
            )?;
        }
        Ok(())
    }
}
