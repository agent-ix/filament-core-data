//! NFR-031 "Bounded inputs": the declared limits of `limits.json` and the
//! five `LIMIT_*` checks that enforce them.
//!
//! The limits are data in the crate, read at run time from the embedded
//! file, so that the number a diagnostic names and the number the code
//! enforces cannot drift (NFR-031-AC-6): [`Limits::value`] reads the parsed
//! file and `breach` prints that value; no module restates one.
//!
//! `maxDocuments`, `maxDocumentBytes` and `maxDepth` are checked over what
//! the engine's corpus loader returned ([`check_bundle`]), because
//! FR-091-CON-2 permits no other read: they bound what is lowered, and the
//! engine's own bounds cover the read. `maxFieldsPerRecord` and
//! `maxClauseBytes` are checked over one extraction ([`check_extraction`])
//! before it is lowered (SR-163 step 5). A breach is one blocking diagnostic
//! at the offending document — `spec/spec.md` for the bundle-wide count —
//! and the lowering terminates.

use std::fmt;

use serde::Deserialize;

use crate::bundle::{Bundle, Document};
use crate::diagnostics::{Code, Diagnostic, Locus};
use crate::extract::Extracted;

/// `limits.json`, byte for byte.
const LIMITS: &str = include_str!("../limits.json");
/// The locus of a bundle-wide breach.
const SPEC_MD: &str = "spec/spec.md";

/// The five declared limits, as `limits.json` spells them.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Limits {
    pub max_documents: usize,
    pub max_document_bytes: usize,
    pub max_fields_per_record: usize,
    pub max_clause_bytes: usize,
    pub max_depth: usize,
}

/// The embedded `limits.json` does not parse: a build defect, surfaced
/// rather than replaced by a default that would leave a limit unenforced.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LimitsError {
    pub message: String,
}

impl fmt::Display for LimitsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "limits.json does not parse: {}", self.message)
    }
}

impl std::error::Error for LimitsError {}

impl Limits {
    /// The limits the embedded `limits.json` declares.
    pub fn declared() -> Result<Self, LimitsError> {
        serde_json::from_str(LIMITS).map_err(|e| LimitsError {
            message: e.to_string(),
        })
    }

    /// The declared value of `limit`.
    pub fn value(&self, limit: Limit) -> usize {
        match limit {
            Limit::MaxDocuments => self.max_documents,
            Limit::MaxDocumentBytes => self.max_document_bytes,
            Limit::MaxFieldsPerRecord => self.max_fields_per_record,
            Limit::MaxClauseBytes => self.max_clause_bytes,
            Limit::MaxDepth => self.max_depth,
        }
    }
}

/// One declared limit: its `limits.json` key and its `LIMIT_*` code.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Limit {
    MaxDocuments,
    MaxDocumentBytes,
    MaxFieldsPerRecord,
    MaxClauseBytes,
    MaxDepth,
}

impl Limit {
    /// Every limit, in `limits.json` order.
    pub const ALL: [Limit; 5] = [
        Limit::MaxDocuments,
        Limit::MaxDocumentBytes,
        Limit::MaxFieldsPerRecord,
        Limit::MaxClauseBytes,
        Limit::MaxDepth,
    ];

    /// The `limits.json` key.
    pub fn key(self) -> &'static str {
        match self {
            Limit::MaxDocuments => "maxDocuments",
            Limit::MaxDocumentBytes => "maxDocumentBytes",
            Limit::MaxFieldsPerRecord => "maxFieldsPerRecord",
            Limit::MaxClauseBytes => "maxClauseBytes",
            Limit::MaxDepth => "maxDepth",
        }
    }

    /// The FR-096 code a breach is raised under.
    pub fn code(self) -> Code {
        match self {
            Limit::MaxDocuments => Code::LimitMaxDocuments,
            Limit::MaxDocumentBytes => Code::LimitMaxDocumentBytes,
            Limit::MaxFieldsPerRecord => Code::LimitMaxFieldsPerRecord,
            Limit::MaxClauseBytes => Code::LimitMaxClauseBytes,
            Limit::MaxDepth => Code::LimitMaxDepth,
        }
    }
}

/// The depth of a bundle-relative path: its number of `/`-separated
/// segments (`spec/spec.md` is 2).
pub fn depth(path: &str) -> usize {
    path.split('/').filter(|s| !s.is_empty()).count()
}

/// The blocking diagnostic of one breach, naming the observed count and
/// the declared value as the parsed file carries it.
fn breach(limit: Limit, limits: &Limits, observed: usize, what: &str, locus: Locus) -> Diagnostic {
    Diagnostic::frontend(
        limit.code(),
        format!(
            "{what} is {observed}; limits.json {} is {}",
            limit.key(),
            limits.value(limit)
        ),
        Some(locus),
    )
}

/// `maxDocuments`, `maxDocumentBytes` and `maxDepth` over the documents
/// the engine's loader returned, in path order: one diagnostic per breach.
pub fn check_bundle(bundle: &Bundle, limits: &Limits) -> Vec<Diagnostic> {
    let source_identity = bundle.package().source_identity();
    let mut out = Vec::new();
    let documents = bundle.documents();
    if documents.len() > limits.max_documents {
        out.push(breach(
            Limit::MaxDocuments,
            limits,
            documents.len(),
            "the bundle's document count",
            Locus::head(&source_identity, SPEC_MD),
        ));
    }
    for document in documents {
        out.extend(check_document(document, &source_identity, limits));
    }
    out
}

fn check_document(document: &Document, source_identity: &str, limits: &Limits) -> Vec<Diagnostic> {
    let mut out = Vec::new();
    let bytes = document.raw().len();
    if bytes > limits.max_document_bytes {
        out.push(breach(
            Limit::MaxDocumentBytes,
            limits,
            bytes,
            &format!("{} is {bytes} bytes; its size", document.path()),
            Locus::head(source_identity, document.path()),
        ));
    }
    let depth = depth(document.path());
    if depth > limits.max_depth {
        out.push(breach(
            Limit::MaxDepth,
            limits,
            depth,
            &format!("{} sits {depth} segments deep; its depth", document.path()),
            Locus::head(source_identity, document.path()),
        ));
    }
    out
}

/// `maxFieldsPerRecord` over the extraction's `fields` and
/// `maxClauseBytes` over each clause's text, at the clause's span when the
/// engine reported one and at the document's head otherwise.
pub fn check_extraction(
    extracted: &Extracted,
    source_identity: &str,
    limits: &Limits,
) -> Vec<Diagnostic> {
    let mut out = Vec::new();
    let head = Locus::head(source_identity, &extracted.path);
    let fields = extracted.extraction.fields.as_ref().map_or(0, Vec::len);
    if fields > limits.max_fields_per_record {
        out.push(breach(
            Limit::MaxFieldsPerRecord,
            limits,
            fields,
            &format!(
                "{} declares {fields} fields; its field count",
                extracted.path
            ),
            head.clone(),
        ));
    }
    let Some(texts) = extracted.extraction.clause_text.as_ref() else {
        return out;
    };
    let clauses = extracted.extraction.clauses.as_deref().unwrap_or(&[]);
    for (clause_id, text) in texts {
        let bytes = text.len();
        if bytes <= limits.max_clause_bytes {
            continue;
        }
        let locus = clauses
            .iter()
            .find(|c| &c.clause_id == clause_id)
            .and_then(|c| c.source_span.as_ref())
            .map(|span| {
                Locus::new(
                    source_identity,
                    &span.path,
                    span.start_line,
                    span.start_column,
                )
            })
            .unwrap_or_else(|| head.clone());
        out.push(breach(
            Limit::MaxClauseBytes,
            limits,
            bytes,
            &format!(
                "clause {clause_id} of {} is {bytes} bytes; its length",
                extracted.path
            ),
            locus,
        ));
    }
    out
}
