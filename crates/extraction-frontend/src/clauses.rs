//! FR-094 "Operations" and "Clauses": one IR `operation` per engine
//! `OperationDecl` and one IR `clause` per located `ClauseRef`, with the
//! clause text taken from the engine byte for byte.
//!
//! # Clauses
//!
//! [`lower_clauses`] takes every `ClauseRef` of `SemanticExtraction.clauses`
//! that carries a `source_span` — the `### <clauseId>` fences under
//! the Invariants section — and emits `language`, `clauseId`, `text` from
//! `clause_text[clause_id]` and `sourceSpan` as the engine reports them.
//! The text is never parsed, trimmed, normalised or typechecked
//! (FR-094-CON-3). A `ClauseRef` inside an operation's `pre` or `post`
//! carries no span and contributes only its `clause_id` to that list; no
//! second clause node is minted for it.
//!
//! # Operations
//!
//! [`lower_operations`] lowers each `OperationDecl` with its params as
//! FR-093 fields through `crate::lower::lower_field`, under
//! `param/<record-slug>-<op-slug>-<param-slug>`; `returns` from the FR-092
//! resolution of the `Returns:` token with `nullable: false`; and `pre` /
//! `post` as the engine's `clause_id` lists. The origin is the `### <name>`
//! heading, re-read through [`crate::rows::operation_rows`]. A parameter or
//! return token FR-092 left unresolved has already raised its diagnostic
//! at the row (`Returns:` line for a return, FR-094-AC-12); the operation
//! is then not lowered ([`LowerError::Unresolved`]).
//!
//! A parameter row's constraints have no IR home — `operation.params` are
//! `field`s and `constraints[]` is the definition's — and FR-094 says
//! nothing of them; they are not lowered, and that gap is reported with
//! Task-133.

use std::collections::BTreeSet;

use quire_rs::semantic::{ClauseRef, Multiplicity, OperationDecl, SemanticExtraction};
use serde::Serialize;

use crate::diagnostics::Locus;
use crate::lower::{lower_field, ArtifactContext, Field, LowerError, Origin, Sink};
use crate::resolve::{Resolved, Site, RETURNS};
use crate::rows::{locate, OperationLocus};

/// `common.schema.json#/$defs/sourceLocus` with its end position: a clause's
/// `sourceSpan`, as the engine's `SourceLocus` reports it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceSpan {
    pub source_identity: String,
    pub path: String,
    pub start_line: usize,
    pub start_column: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_column: Option<usize>,
}

impl SourceSpan {
    /// The engine's span, member by member.
    fn of(span: &quire_rs::semantic::SourceLocus) -> Self {
        Self {
            source_identity: span.source_identity.clone(),
            path: span.path.clone(),
            start_line: span.start_line,
            start_column: span.start_column,
            end_line: span.end_line,
            end_column: span.end_column,
        }
    }

    /// The span's start: the clause's origin.
    fn start(&self) -> Locus {
        Locus::new(
            &self.source_identity,
            &self.path,
            self.start_line,
            self.start_column,
        )
    }
}

/// `semantic-ir.schema.json#/$defs/clause`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Clause {
    pub identity: String,
    pub language: String,
    pub clause_id: String,
    pub text: String,
    pub source_span: SourceSpan,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/operation/properties/returns`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Returns {
    pub type_ref: String,
    pub multiplicity: Multiplicity,
    pub nullable: bool,
}

/// `semantic-ir.schema.json#/$defs/operation`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    pub identity: String,
    pub name: String,
    pub params: Vec<Field>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub returns: Option<Returns>,
    pub pre: Vec<String>,
    pub post: Vec<String>,
    pub origin: Origin,
}

/// Lower every located `ClauseRef` of `extraction` to a clause (FR-094
/// "Clauses"). Fails only on an unsluggable `clauseId` (`UNSLUGGABLE_NAME`
/// at the span's start, blocking).
pub fn lower_clauses(
    extraction: &SemanticExtraction,
    ctx: &ArtifactContext<'_>,
) -> Result<Vec<Clause>, LowerError> {
    let refs = extraction.clauses.as_deref().unwrap_or(&[]);
    let mut sink = Sink::default();
    let mut out = Vec::with_capacity(refs.len());
    for clause in refs {
        let Some(span) = clause.source_span.as_ref().map(SourceSpan::of) else {
            continue;
        };
        // The engine inserts `clause_text[clause_id]` with every located
        // clause; a missing entry is an engine invariant broken and the
        // clause cannot be represented, so it is not.
        let Some(text) = extraction
            .clause_text
            .as_ref()
            .and_then(|texts| texts.get(&clause.clause_id))
        else {
            continue;
        };
        let origin = span.start();
        let identity = match ctx.package.clause_identity(ctx.id, &clause.clause_id) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(origin));
                continue;
            }
        };
        out.push(Clause {
            identity,
            language: clause.language.clone(),
            clause_id: clause.clause_id.clone(),
            text: text.clone(),
            source_span: span,
            origin: Origin::Source(origin),
        });
    }
    sink.finish_with(out)
}

/// The `clause_id`s of `refs`, each once, in the engine's order.
fn clause_ids(refs: &[ClauseRef]) -> Vec<String> {
    let mut seen = BTreeSet::new();
    refs.iter()
        .filter(|r| seen.insert(r.clause_id.as_str()))
        .map(|r| r.clause_id.clone())
        .collect()
}

/// Lower every `OperationDecl` of `extraction` to an operation (FR-094
/// "Operations"). `resolutions` are the FR-092 classifications of the
/// record's parameter and return tokens; `rows` are the operations'
/// loci re-read from the document.
pub fn lower_operations(
    extraction: &SemanticExtraction,
    resolutions: &[Resolved],
    rows: &[OperationLocus],
    ctx: &ArtifactContext<'_>,
) -> Result<Vec<Operation>, LowerError> {
    let decls = extraction.operations.as_deref().unwrap_or(&[]);
    let mut sink = Sink::default();
    let mut out = Vec::with_capacity(decls.len());
    for decl in decls {
        let located = rows.iter().find(|r| r.name == decl.name);
        let heading = located
            .map(|r| ctx.at(r.line, 1))
            .unwrap_or_else(|| ctx.head());
        let identity = match ctx.package.operation_identity(ctx.id, &decl.name) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(heading));
                continue;
            }
        };
        let params = lower_params(decl, resolutions, located, ctx, &mut sink)?;
        let returns = match &decl.returns {
            Some(type_ref) => {
                let resolved = resolutions
                    .iter()
                    .find(|r| {
                        r.artifact == ctx.id
                            && r.site
                                == Site::Returns {
                                    operation: decl.name.clone(),
                                }
                    })
                    .and_then(|r| r.resolution.type_ref(ctx.package));
                let Some(type_ref_identity) = resolved else {
                    return Err(LowerError::Unresolved {
                        field: format!("{}.{RETURNS}", decl.name),
                    });
                };
                Some(Returns {
                    type_ref: type_ref_identity,
                    multiplicity: crate::document::normalized_multiplicity(
                        type_ref
                            .multiplicity
                            .clone()
                            .unwrap_or_else(Multiplicity::one),
                    ),
                    nullable: false,
                })
            }
            None => None,
        };
        out.push(Operation {
            identity,
            name: decl.name.clone(),
            params,
            returns,
            pre: clause_ids(&decl.pre),
            post: clause_ids(&decl.post),
            origin: Origin::Source(heading),
        });
    }
    sink.finish_with(out)
}

/// The parameters of one operation as FR-093 fields under
/// `param/<record-slug>-<op-slug>-<param-slug>`, each at its row.
fn lower_params(
    decl: &OperationDecl,
    resolutions: &[Resolved],
    located: Option<&OperationLocus>,
    ctx: &ArtifactContext<'_>,
    sink: &mut Sink,
) -> Result<Vec<Field>, LowerError> {
    let mut out = Vec::with_capacity(decl.params.len());
    for (index, param) in decl.params.iter().enumerate() {
        let locus = located
            .and_then(|r| locate(&r.params, index, &param.name))
            .map(|r| ctx.at(r.line, r.column))
            .unwrap_or_else(|| ctx.head());
        let resolved = resolutions
            .iter()
            .find(|r| {
                r.artifact == ctx.id
                    && r.field == param.name
                    && r.site
                        == Site::Param {
                            operation: decl.name.clone(),
                        }
            })
            .map(|r| &r.resolution);
        let identity = match ctx.package.param_identity(ctx.id, &decl.name, &param.name) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(locus));
                continue;
            }
        };
        out.push(lower_field(param, resolved, identity, locus, ctx, sink)?);
    }
    Ok(out)
}
