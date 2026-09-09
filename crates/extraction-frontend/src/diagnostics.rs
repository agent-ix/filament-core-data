//! The closed diagnostic registry of FR-096.
//!
//! Task-128 laid the registry down so FR-091's refusals and engine wrappers
//! carry final codes from the first commit; Task-129 extends it — the order
//! ([`sort_diagnostics`]), token truncation ([`message_with_token`]), the
//! reader wrapper ([`Diagnostic::reader`]) and the generated registry page
//! ([`render_registry_doc`]) — without replacing a variant. Every code the
//! frontend emits is one [`Code`]; the wire spelling
//! `<namespace>.<component>.<NAME>` exists only in [`Code`]'s `Display`,
//! never as a literal (FR-096-AC-3).
//!
//! # Locus rule (issue #61)
//!
//! The engine's locus is authoritative and the frontend derives no other
//! (FR-096 "Locus", the declared reading of filament-core-data#61): a
//! diagnostic about a document carries the engine's line and column when the
//! engine located it at line 1 or later, and no `locus` at all — with the
//! document path in the message and in `related` — when the engine reported
//! line 0 or no line. A diagnostic about a module sits at its manifest, line
//! 1 column 1; one about the bundle as a whole at `spec/spec.md`, line 1
//! column 1; one the reader raises over the lifted document (`INVALID_IR`)
//! has no locus, because the reader addresses an instance pointer, not a
//! source line.
//!
//! # Engine and reader codes
//!
//! `common.schema.json#/$defs/diagnostic` types `causes.items` as
//! `diagnostic` again, whose `code` pattern admits only
//! `agent-ix.<component>.<NAME>`. An engine `semantic.*` code therefore
//! cannot live in `causes`: `ENGINE_DIAGNOSTIC` (and `MODULE_REFUSED`, which
//! carries an engine refusal) open the message with the engine code and
//! reason and leave `causes` empty (FR-096 "Engine diagnostics", CR-036-2).
//! A reader code (`agent-ix.semantic-ir.*`) does match the pattern, so
//! `INVALID_IR` reproduces the reader's diagnostic in `causes[0]`.

use std::borrow::Cow;
use std::cmp::Ordering;
use std::fmt;

use agent_ix_semantic_ir::diag::{Located, Severity as ReaderSeverity};
use agent_ix_semantic_ir::json::to_canonical_string;
use quire_rs::semantic::{SemanticDiagnostic, SemanticSeverity};
use serde::{Deserialize, Serialize};

/// The namespace segment of every wire code.
const NAMESPACE: &str = "agent-ix";
/// The component segment of every wire code.
const COMPONENT: &str = "extraction-frontend";
/// `owner` of every diagnostic the frontend raises.
pub const OWNER: &str = "ix://agent-ix/filament-core-data/extraction-frontend";

/// A token longer than this many characters is truncated in a message
/// (FR-096 "Shape, order, and effect").
pub const TOKEN_LIMIT: usize = 100;
/// A message carrying a truncated token is at most this many characters.
pub const MESSAGE_LIMIT: usize = 120;
/// The truncation mark.
pub const ELLIPSIS: char = '…';

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
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
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

    /// The reader's severity, reproduced one to one.
    pub fn from_reader(severity: ReaderSeverity) -> Self {
        match severity {
            ReaderSeverity::Info => Severity::Info,
            ReaderSeverity::Warning => Severity::Warning,
            ReaderSeverity::Error => Severity::Error,
        }
    }

    /// The wire name.
    pub fn as_str(self) -> &'static str {
        match self {
            Severity::Info => "info",
            Severity::Warning => "warning",
            Severity::Error => "error",
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

    /// When the code is raised: the "Raised when" column of the generated
    /// registry page.
    pub fn raised_when(self) -> &'static str {
        match self {
            Code::ModuleWithoutSemanticBlock => {
                "a supplied module carries no `semantic` block, so nothing can be extracted under it"
            }
            Code::ModuleRefused => {
                "the engine refused a supplied module; the engine's `semantic.*` code opens the message"
            }
            Code::BundleUnidentified => {
                "`spec/spec.md` is absent or its `org`/`name` is missing or malformed, or an object-typed document has no `id`"
            }
            Code::DuplicateArtifactId => "two documents of the bundle declare one `id`",
            Code::UnknownObjectType => {
                "a document declares an `object` no supplied module declares"
            }
            Code::UnresolvedTypeToken => {
                "a `Type` cell names nothing the kernel, the bundle, or the module resolves"
            }
            Code::StaleTypeToken => {
                "a `Type` cell resolves to an artifact that produced no definition"
            }
            Code::ImportUnsupported => {
                "a `Type` cell names an artifact of another package; cross-package imports are out of scope"
            }
            Code::KernelNameShadowed => {
                "a bundle artifact's title equals a kernel scalar name"
            }
            Code::UnnameableArtifact => {
                "an artifact has no title from which a definition name can be taken"
            }
            Code::ArtifactNotLowered => {
                "the engine left an artifact's fields unavailable; the availability reason names why"
            }
            Code::DuplicateTypeName => "two artifacts derive one type slug",
            Code::DuplicateConstraint => "one row carries one constraint keyword twice",
            Code::ConstraintNotApplicable => {
                "a constraint keyword does not apply to the resolved type of its row"
            }
            Code::DeclaredLoss => {
                "the frontend dropped a construct the extraction contract declares lossy"
            }
            Code::UnresolvedRelationshipTarget => {
                "a frontmatter relationship names a target the bundle index does not resolve"
            }
            Code::UnknownEdgeVerb => {
                "a frontmatter relationship uses a verb the loaded registry does not define"
            }
            Code::UnsluggableName => "a name derives an empty slug",
            Code::OutputUnwritable => {
                "`--out` lies inside the bundle root or cannot be written"
            }
            Code::LimitMaxDocuments => "the bundle holds more documents than NFR-031 admits",
            Code::LimitMaxDocumentBytes => "one document is larger than NFR-031 admits",
            Code::LimitMaxFieldsPerRecord => "one record declares more fields than NFR-031 admits",
            Code::LimitMaxClauseBytes => "one clause is longer than NFR-031 admits",
            Code::LimitMaxDepth => "a nested structure is deeper than NFR-031 admits",
            Code::EngineDiagnostic => {
                "the engine returned a `SemanticDiagnostic`; its code, reason and message open the frontend's message"
            }
            Code::InvalidIr => {
                "the reader (`agent_ix_semantic_ir::decide`) rejected the lifted document; the reader's diagnostic is `causes[0]`"
            }
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

/// The `code` of one diagnostic on the wire: a registry code, or the
/// reader's own `agent-ix.semantic-ir.*` code reproduced verbatim inside
/// `causes` of an `INVALID_IR`. A reader code is never the code of a
/// top-level diagnostic (FR-096 "Reader diagnostics").
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WireCode {
    Registry(Code),
    Reader(String),
}

impl fmt::Display for WireCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WireCode::Registry(code) => code.fmt(f),
            WireCode::Reader(code) => f.write_str(code),
        }
    }
}

impl Serialize for WireCode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

/// `common.schema.json#/$defs/sourceLocus`, start position only.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
        Self::with_disposition(code, Disposition::Frontend, message, locus)
    }

    /// One of the frontend's own findings under an explicit disposition:
    /// `ARTIFACT_NOT_LOWERED` with the engine's availability reason.
    pub fn with_disposition(
        code: Code,
        disposition: Disposition,
        message: impl Into<String>,
        locus: Option<Locus>,
    ) -> Self {
        Self {
            code: WireCode::Registry(code),
            severity: code.severity(disposition),
            message: message.into(),
            owner: OWNER.to_string(),
            locus,
            blocking: code.blocking(disposition),
            causes: Vec::new(),
            related: Vec::new(),
        }
    }

    /// One engine `SemanticDiagnostic` about the document at `path`, wrapped
    /// as `ENGINE_DIAGNOSTIC` (FR-096 "Engine diagnostics", "Locus"): the
    /// message is `<engine code> (reason: <reason>): <engine message>` (the
    /// reason clause absent when the engine gave none) and `causes` is
    /// empty; the locus carries the engine's line and column when the line is
    /// at least 1, and is absent — with the path in `related` and appended to
    /// the message — otherwise.
    pub fn engine(engine: &SemanticDiagnostic, source_identity: &str, path: &str) -> Self {
        let disposition = Disposition::Engine(engine.severity);
        let code = Code::EngineDiagnostic;
        let reason = engine
            .reason
            .as_ref()
            .map(|r| format!(" (reason: {r})"))
            .unwrap_or_default();
        let head = format!("{}{reason}: {}", engine.code, engine.message);
        let (message, locus, related) = match engine.line {
            Some(line) if line >= 1 => (
                head,
                Some(Locus::new(
                    source_identity,
                    path,
                    line,
                    engine.column.unwrap_or(1),
                )),
                Vec::new(),
            ),
            _ => (
                format!("{head} ({path})"),
                None,
                vec![Locus::head(source_identity, path)],
            ),
        };
        Self {
            code: WireCode::Registry(code),
            severity: code.severity(disposition),
            message,
            owner: OWNER.to_string(),
            locus,
            blocking: code.blocking(disposition),
            causes: Vec::new(),
            related,
        }
    }

    /// One diagnostic `agent_ix_semantic_ir::decide` returned over the lifted
    /// document, wrapped as `INVALID_IR` (FR-096 "Reader diagnostics",
    /// FR-096-CON-2): no locus, the reader's code and instance pointer in the
    /// message, and the reader's diagnostic reproduced in `causes[0]` with
    /// its own code, severity, message, owner, blocking and locus.
    pub fn reader(reader: &Located) -> Self {
        let pointer = if reader.pointer.is_empty() {
            "the document root".to_string()
        } else {
            reader.pointer.clone()
        };
        let cause = Diagnostic {
            code: WireCode::Reader(reader.code.to_string()),
            severity: Severity::from_reader(reader.severity),
            message: reader.message.clone(),
            owner: reader.owner.clone(),
            locus: reader
                .locus
                .as_ref()
                .and_then(|locus| serde_json::from_str::<Locus>(&to_canonical_string(locus)).ok()),
            blocking: reader.blocking,
            causes: Vec::new(),
            related: Vec::new(),
        };
        let mut wrapper = Self::frontend(
            Code::InvalidIr,
            format!(
                "the lifted document is not valid IR: {} at {pointer}: {}",
                reader.code, reader.message
            ),
            None,
        );
        wrapper.causes.push(cause);
        wrapper
    }

    /// The registry code of a top-level diagnostic. `None` only for a
    /// reproduced reader cause.
    pub fn registry_code(&self) -> Option<Code> {
        match self.code {
            WireCode::Registry(code) => Some(code),
            WireCode::Reader(_) => None,
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

    /// The FR-096 sort key: locus-free diagnostics first (`None < Some`),
    /// then `locus.path`, `startLine`, `startColumn`, the wire code, the
    /// message — every string under code-point comparison, which is what
    /// `str`'s `Ord` is.
    fn sort_key(&self) -> (Option<(&str, usize, usize)>, String, &str) {
        (
            self.locus
                .as_ref()
                .map(|l| (l.path.as_str(), l.start_line, l.start_column)),
            self.code.to_string(),
            self.message.as_str(),
        )
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

/// Order diagnostics as FR-096 "Shape, order, and effect" fixes: every
/// diagnostic with no `locus` first, ordered by code then message; then by
/// `locus.path`, `startLine`, `startColumn`, code, message. Comparison is by
/// code point and never consults the locale. Stable, so equal keys keep
/// their input order.
pub fn sort_diagnostics(diagnostics: &mut [Diagnostic]) {
    diagnostics.sort_by(|a, b| compare(a, b));
}

fn compare(a: &Diagnostic, b: &Diagnostic) -> Ordering {
    a.sort_key().cmp(&b.sort_key())
}

/// Whether any diagnostic of the list blocks the lift (FR-096 "Shape,
/// order, and effect"; FR-097 owns the write effect, FR-099 the exit code).
pub fn is_blocked(diagnostics: &[Diagnostic]) -> bool {
    diagnostics.iter().any(|d| d.blocking)
}

/// A token as a message carries it: whole when it is at most
/// [`TOKEN_LIMIT`] characters, else its first `TOKEN_LIMIT - 1` characters
/// followed by [`ELLIPSIS`].
pub fn token(raw: &str) -> Cow<'_, str> {
    if raw.chars().count() <= TOKEN_LIMIT {
        return Cow::Borrowed(raw);
    }
    let mut out: String = raw.chars().take(TOKEN_LIMIT - 1).collect();
    out.push(ELLIPSIS);
    Cow::Owned(out)
}

/// A message carrying one token between `before` and `after`. A token of
/// at most [`TOKEN_LIMIT`] characters appears whole and the message is left
/// alone; a longer token is truncated with [`ELLIPSIS`] and the message is
/// then clamped to [`MESSAGE_LIMIT`] characters, again with [`ELLIPSIS`]
/// (FR-096-AC-11).
pub fn message_with_token(before: &str, raw: &str, after: &str) -> String {
    let token = token(raw);
    let message = format!("{before}{token}{after}");
    if matches!(token, Cow::Borrowed(_)) {
        return message;
    }
    clamp(&message, MESSAGE_LIMIT)
}

/// `text` when it is at most `limit` characters, else its first `limit - 1`
/// characters followed by [`ELLIPSIS`].
fn clamp(text: &str, limit: usize) -> String {
    if text.chars().count() <= limit {
        return text.to_string();
    }
    let mut out: String = text.chars().take(limit - 1).collect();
    out.push(ELLIPSIS);
    out
}

/// The identifier of the generated registry page.
const DOC_ID: &str = "ARCH-EXTRACTION-FRONTEND-DIAGNOSTICS";

/// Render `docs/semantic-data-system/extraction-frontend-diagnostics.md`
/// from the enum: every code with its severity, blocking disposition and
/// owner (FR-096-AC-13). The page is written by the closing task of the
/// change (NFR-032's sentinel); this is the only source of its bytes, and
/// regenerating it reproduces the committed file byte for byte.
pub fn render_registry_doc() -> String {
    let mut out = String::new();
    out.push_str("---\n");
    out.push_str(&format!("id: {DOC_ID}\n"));
    out.push_str("title: \"Extraction frontend diagnostic registry\"\n");
    out.push_str("status: normative\n");
    out.push_str("---\n");
    out.push_str(
        "<!-- Generated by `agent_ix_extraction_frontend::diagnostics::render_registry_doc`. Do not edit by hand. -->\n",
    );
    out.push_str("# Extraction frontend diagnostic registry\n\n");
    out.push_str(&format!(
        "The closed `{NAMESPACE}.{COMPONENT}.*` set, rendered from\n`crates/extraction-frontend/src/diagnostics.rs`. {} codes.\n\n",
        Code::ALL.len()
    ));
    out.push_str(
        "Every code the frontend emits is one variant of this enum, and the wire\n\
         spelling exists only in the enum's `Display`; no module under\n\
         `crates/extraction-frontend/src/` names a code as a string literal\n\
         (FR-096-AC-3). Severity and blocking are fixed per code, except that\n\
         `ENGINE_DIAGNOSTIC` takes the mapped engine severity (`advisory` is\n\
         `info`) and blocks if and only if that severity is `error`, and\n\
         `ARTIFACT_NOT_LOWERED` is a non-blocking `warning` when the engine\n\
         reason is `legacy-form` (FR-096-CON-1).\n\n\
         An engine `semantic.*` code is never emitted as the frontend's own and\n\
         never placed in `causes`: `ENGINE_DIAGNOSTIC` opens its message with\n\
         `<engine code> (reason: <reason>): <engine message>`. A reader\n\
         `agent-ix.semantic-ir.*` code is carried only in `causes[0]` of an\n\
         `INVALID_IR`.\n\n",
    );
    out.push_str("| Code | Severity | Blocking | Raised when |\n|---|---|---|---|\n");
    for code in Code::ALL {
        let (severity, blocking) = match code {
            Code::EngineDiagnostic => (
                "mapped from the engine",
                "iff the mapped severity is `error`",
            ),
            Code::ArtifactNotLowered => (
                "warning (`legacy-form`), else error",
                "no (`legacy-form`), else yes",
            ),
            _ => (
                code.severity(Disposition::Frontend).as_str(),
                if code.blocking(Disposition::Frontend) {
                    "yes"
                } else {
                    "no"
                },
            ),
        };
        out.push_str(&format!(
            "| `{code}` | {severity} | {blocking} | {} |\n",
            code.raised_when()
        ));
    }
    out.push_str(&format!("\nOwner of every code: `{OWNER}`.\n"));
    out
}
