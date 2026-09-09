//! FR-092: classify every `TypeRef.target` the engine returned into one
//! closed [`Resolution`], in two passes.
//!
//! This module is a classifier of the engine's verdict, never a second
//! resolver (decision D3): quire-rs FR-070 has already mapped every `Type`
//! cell to a kernel scalar name, `ix://<org>/<name>/type/<Name>` for a
//! bundle artifact, `ix://<package>/type/<Name>` for a module import, or
//! the placeholder `ix://<org>/<name>/unresolved/<Token>` with a companion
//! `semantic.unresolved-type` advisory carrying `reason`. Classification
//! reads the `target` form, that `reason`, the `BundleIndex`, the indexed
//! artifacts' frontmatter `object`, the pass-one outcomes, and the FR-032
//! table — and nothing else (FR-092-CON-2). Nothing here looks at a token's
//! spelling, casing, or pluralisation.
//!
//! # Pass order
//!
//! [`pass_one`] decides every artifact's lowering outcome from its
//! extraction before any token is classified; [`pass_two`] takes the
//! completed [`Outcomes`] by reference, so a one-pass implementation
//! cannot type-check (FR-092-AC-11). `Stale` — the target artifact produced
//! no definition — is the one state the engine cannot know and the reason
//! the order exists.

use std::collections::{BTreeMap, BTreeSet};

use quire_rs::semantic::decl::is_identifier;
use quire_rs::semantic::{AvailabilityState, SemanticDiagnostic};

use crate::bundle::{Bundle, Document};
use crate::diagnostics::{
    message_with_token, Code, Diagnostic, Disposition, Locus, NotLoweredReason,
};
use crate::extract::{Extracted, Extractions};
use crate::identity::PackageIdentity;
use crate::rows::{field_rows, locate, operation_rows, RowLocus};
use crate::scalars::KernelScalar;

/// The engine's advisory code accompanying every placeholder.
const ENGINE_UNRESOLVED_TYPE: &str = "semantic.unresolved-type";
/// The engine's `reason` values on that advisory.
const REASON_UNKNOWN_TOKEN: &str = "unknown-token";
const REASON_NO_BUNDLE_INDEX: &str = "no-bundle-index";
const REASON_IMPORT_UNRESOLVED: &str = "import-unresolved";
/// The frontmatter `object` value that makes an artifact an enumeration.
const ENUMERATION: &str = "enumeration";
/// The identity scheme prefix and the two segments the engine mints.
const SCHEME: &str = "ix://";
const TYPE_SEGMENT: &str = "type";
const UNRESOLVED_SEGMENT: &str = "unresolved";
/// The name the engine gives a `Returns:` row (quire-rs `parse_returns`).
pub const RETURNS: &str = "returns";

/// One bundle artifact a resolved token names: what the definition it
/// lowers to is identified by.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ArtifactRef {
    /// Frontmatter `id`.
    pub id: String,
    /// Bundle-root-relative document path.
    pub path: String,
    /// The FR-093 `displayName`: frontmatter `name` when it is an
    /// `Identifier`, else the `title` verbatim. The `type/` segment.
    pub display_name: String,
}

impl ArtifactRef {
    /// The artifact `document` declares: its id, path and FR-093
    /// `displayName` (frontmatter `name` when it is an `Identifier`, else
    /// the `title` verbatim; FR-093 decides whether that is nameable).
    pub fn of(document: &Document) -> Self {
        let name = document
            .frontmatter()
            .and_then(|fm| fm.get("name"))
            .and_then(|v| v.as_str())
            .filter(|name| is_identifier(name));
        let title = document
            .frontmatter()
            .and_then(|fm| fm.get("title"))
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        Self {
            id: document.id().to_string(),
            path: document.path().to_string(),
            display_name: name.unwrap_or(title).to_string(),
        }
    }
}

/// Why a token has no definition behind it (FR-092 "Outputs"). The only
/// string-carrying variant is `ImportUnsupported(package)` (FR-092-CON-1).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Unresolved {
    /// Engine placeholder, `reason: unknown-token`.
    UnknownToken,
    /// Engine placeholder, `reason: no-bundle-index`.
    NoBundleIndex,
    /// Engine placeholder, `reason: import-unresolved`.
    ImportUnresolved,
    /// `ix://<package>/type/<Name>` for a package other than the bundle's;
    /// cross-package imports are out of scope for this delivery.
    ImportUnsupported(String),
    /// The target artifact's pass-one outcome is not a definition.
    Stale(ArtifactRef),
}

impl Unresolved {
    /// The one FR-096 code each variant is reported under.
    pub fn code(&self) -> Code {
        match self {
            Unresolved::UnknownToken | Unresolved::NoBundleIndex | Unresolved::ImportUnresolved => {
                Code::UnresolvedTypeToken
            }
            Unresolved::ImportUnsupported(_) => Code::ImportUnsupported,
            Unresolved::Stale(_) => Code::StaleTypeToken,
        }
    }
}

/// The closed classification of one `target` (FR-092 "Outputs").
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Resolution {
    KernelScalar(KernelScalar),
    Object(ArtifactRef),
    Enumeration(ArtifactRef),
    Unresolved(Unresolved),
}

impl Resolution {
    /// The IR `typeRef`: the identity of the definition the token names,
    /// minted under FR-095 (`type/<displayName>` for an artifact,
    /// `type/<KernelScalar>` for a scalar). `None` for an unresolved token,
    /// which reaches no document.
    pub fn type_ref(&self, package: &PackageIdentity) -> Option<String> {
        match self {
            Resolution::KernelScalar(scalar) => Some(package.type_identity(scalar.name())),
            Resolution::Object(artifact) | Resolution::Enumeration(artifact) => {
                Some(package.type_identity(&artifact.display_name))
            }
            Resolution::Unresolved(_) => None,
        }
    }
}

/// The lowering outcome of one artifact, decided in pass one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// The artifact lowers to a definition.
    Definition,
    /// It does not; `cause` is the locus of the diagnostic that says why,
    /// which a `STALE_TYPE_TOKEN` carries in `related`.
    NotLowered { cause: Locus },
}

/// Every artifact's [`Outcome`], keyed by id. Pass two takes the completed
/// map; an artifact absent from it was never extracted (its object type is
/// undeclared, FR-091) and a token naming it is `Stale` all the same.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Outcomes {
    by_id: BTreeMap<String, Outcome>,
}

impl Outcomes {
    pub fn insert(&mut self, id: String, outcome: Outcome) {
        self.by_id.insert(id, outcome);
    }

    pub fn get(&self, id: &str) -> Option<&Outcome> {
        self.by_id.get(id)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, &Outcome)> {
        self.by_id.iter().map(|(id, o)| (id.as_str(), o))
    }

    pub fn len(&self) -> usize {
        self.by_id.len()
    }

    pub fn is_empty(&self) -> bool {
        self.by_id.is_empty()
    }
}

/// Pass one: every artifact's outcome and the diagnostics that decided it.
#[derive(Debug, Clone, Default)]
pub struct PassOne {
    pub outcomes: Outcomes,
    /// `ARTIFACT_NOT_LOWERED` per unavailable artifact and
    /// `KERNEL_NAME_SHADOWED` per artifact named like a kernel scalar, in
    /// artifact id order.
    pub diagnostics: Vec<Diagnostic>,
}

/// Where a classified token was declared: a the Properties table row, a
/// parameter row of one operation, or the `Returns:` line of one
/// operation (FR-094 "Operations" resolves both through FR-092).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Site {
    Field,
    Param { operation: String },
    Returns { operation: String },
}

/// One classified token.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Resolved {
    /// The artifact whose row carries the token.
    pub artifact: String,
    /// The field or parameter the row declares; the engine's `returns` for
    /// a `Returns:` line.
    pub field: String,
    /// Which declaration the row is.
    pub site: Site,
    /// The row's locus, when the engine's scanner finds the row again.
    pub locus: Option<Locus>,
    pub resolution: Resolution,
}

/// Pass two: every token classified, in artifact id then row order.
#[derive(Debug, Clone, Default)]
pub struct PassTwo {
    pub resolutions: Vec<Resolved>,
    /// Every kernel scalar some token resolved to; the scalar definitions
    /// FR-092 "Kernel scalars" mints once per package.
    pub scalars_used: BTreeSet<KernelScalar>,
    /// One diagnostic per `Unresolved`, in resolution order.
    pub diagnostics: Vec<Diagnostic>,
}

/// Both passes over one lift.
#[derive(Debug, Clone, Default)]
pub struct Resolutions {
    pub outcomes: Outcomes,
    pub resolutions: Vec<Resolved>,
    pub scalars_used: BTreeSet<KernelScalar>,
    /// Pass one's diagnostics followed by pass two's. The engine's own
    /// diagnostics stay in [`Extractions::diagnostics`].
    pub diagnostics: Vec<Diagnostic>,
}

/// Pass one then pass two.
pub fn resolve(bundle: &Bundle, extractions: &Extractions) -> Resolutions {
    let one = pass_one(bundle, extractions);
    let two = pass_two(bundle, extractions, &one.outcomes);
    let mut diagnostics = one.diagnostics;
    diagnostics.extend(two.diagnostics);
    Resolutions {
        outcomes: one.outcomes,
        resolutions: two.resolutions,
        scalars_used: two.scalars_used,
        diagnostics,
    }
}

/// Pass one (FR-092 "Pass order"): decide every extracted artifact's
/// outcome from `availability.fields.state` — `available` and
/// `not_applicable` lower to a definition; `unavailable` and `missing` do
/// not and raise `ARTIFACT_NOT_LOWERED` at the artifact naming the
/// engine's reason (FR-093 "Records"), a non-blocking warning for
/// `legacy-form` and a blocking error otherwise — and raise
/// `KERNEL_NAME_SHADOWED` at the frontmatter of every indexed artifact whose
/// `title` or `name` equals a kernel scalar name.
pub fn pass_one(bundle: &Bundle, extractions: &Extractions) -> PassOne {
    let source_identity = bundle.package().source_identity();
    let mut out = PassOne::default();
    for (id, extracted) in &extractions.artifacts {
        let fields = &extracted.extraction.availability.fields;
        let outcome = match fields.state {
            AvailabilityState::Available | AvailabilityState::NotApplicable => Outcome::Definition,
            AvailabilityState::Unavailable | AvailabilityState::Missing => {
                let reason = fields.reason.as_deref().unwrap_or("unavailable");
                let cause = Locus::head(&source_identity, &extracted.path);
                out.diagnostics.push(Diagnostic::with_disposition(
                    Code::ArtifactNotLowered,
                    Disposition::NotLowered(NotLoweredReason::from_engine(reason)),
                    format!(
                        "artifact {id} ({}) lowers to no definition: its fields are {} ({reason})",
                        extracted.path,
                        state_name(fields.state)
                    ),
                    Some(cause.clone()),
                ));
                Outcome::NotLowered { cause }
            }
        };
        out.outcomes.insert(id.clone(), outcome);
    }
    for document in bundle.documents() {
        if document.object().is_none() {
            continue;
        }
        let shadowed = ["title", "name"].into_iter().find_map(|key| {
            document
                .frontmatter()?
                .get(key)?
                .as_str()
                .and_then(KernelScalar::from_name)
                .map(|scalar| (key, scalar))
        });
        if let Some((key, scalar)) = shadowed {
            out.diagnostics.push(Diagnostic::frontend(
                Code::KernelNameShadowed,
                format!(
                    "artifact {} ({}) has `{key}` equal to the kernel scalar name {}; a Type cell reading it resolves to the kernel scalar, so the artifact is unreferenceable by that name",
                    document.id(),
                    document.path(),
                    scalar.name()
                ),
                Some(Locus::head(&source_identity, document.path())),
            ));
        }
    }
    out
}

fn state_name(state: AvailabilityState) -> &'static str {
    match state {
        AvailabilityState::Available => "available",
        AvailabilityState::NotApplicable => "not applicable",
        AvailabilityState::Missing => "missing",
        AvailabilityState::Unavailable => "unavailable",
    }
}

/// Pass two (FR-092 "Classification", "Diagnostics"): classify every
/// field's `target` of every artifact whose fields the engine returned,
/// under the completed pass-one `outcomes`, and raise one diagnostic per
/// `Unresolved` at the row's line and column: `UNRESOLVED_TYPE_TOKEN`,
/// `IMPORT_UNSUPPORTED`, or `STALE_TYPE_TOKEN` with `related` at the cause.
pub fn pass_two(bundle: &Bundle, extractions: &Extractions, outcomes: &Outcomes) -> PassTwo {
    let source_identity = bundle.package().source_identity();
    let mut out = PassTwo::default();
    for (id, extracted) in &extractions.artifacts {
        let document = bundle
            .documents()
            .iter()
            .find(|d| d.path() == extracted.path);
        let mut classify_token = |field: &str, site: Site, target: &str, row: Option<&RowLocus>| {
            let locus =
                row.map(|r| Locus::new(&source_identity, &extracted.path, r.line, r.column));
            let companion = companion_of(extracted, target, row.map(|r| r.line));
            let resolution = classify(target, companion, bundle, outcomes);
            if let Resolution::KernelScalar(scalar) = &resolution {
                out.scalars_used.insert(*scalar);
            }
            if let Resolution::Unresolved(unresolved) = &resolution {
                out.diagnostics.push(unresolved_diagnostic(
                    unresolved,
                    target,
                    &extracted.path,
                    locus.clone(),
                    &source_identity,
                    outcomes,
                ));
            }
            out.resolutions.push(Resolved {
                artifact: id.clone(),
                field: field.to_string(),
                site,
                locus,
                resolution,
            });
        };
        if let Some(fields) = extracted.extraction.fields.as_deref() {
            let rows = document.map(|d| field_rows(d.raw())).unwrap_or_default();
            for (index, field) in fields.iter().enumerate() {
                let row = locate(&rows, index, &field.name);
                classify_token(&field.name, Site::Field, &field.type_ref.target, row);
            }
        }
        // FR-094 "Operations": every parameter row and every `Returns:`
        // token is a `Type` cell resolved the same way (FR-094-AC-12).
        if let Some(operations) = extracted.extraction.operations.as_deref() {
            let rows = document
                .map(|d| operation_rows(d.raw()))
                .unwrap_or_default();
            for operation in operations {
                let located = rows.iter().find(|r| r.name == operation.name);
                for (index, param) in operation.params.iter().enumerate() {
                    let row = located.and_then(|r| locate(&r.params, index, &param.name));
                    classify_token(
                        &param.name,
                        Site::Param {
                            operation: operation.name.clone(),
                        },
                        &param.type_ref.target,
                        row,
                    );
                }
                if let Some(returns) = &operation.returns {
                    let row = located
                        .and_then(|r| r.returns)
                        .map(|(line, column)| RowLocus {
                            name: RETURNS.to_string(),
                            line,
                            column,
                        });
                    classify_token(
                        RETURNS,
                        Site::Returns {
                            operation: operation.name.clone(),
                        },
                        &returns.target,
                        row.as_ref(),
                    );
                }
            }
        }
    }
    out
}

/// The engine's `semantic.unresolved-type` advisory for the placeholder
/// `target`: the one at the row's line, else the one naming the token.
fn companion_of<'a>(
    extracted: &'a Extracted,
    target: &str,
    line: Option<usize>,
) -> Option<&'a SemanticDiagnostic> {
    let token = placeholder_token(target)?;
    let advisories = extracted
        .extraction
        .diagnostics
        .iter()
        .filter(|d| d.code == ENGINE_UNRESOLVED_TYPE);
    let quoted = format!("{token:?}");
    advisories
        .clone()
        .find(|d| line.is_some() && d.line == line)
        .or_else(|| advisories.clone().find(|d| d.message.contains(&quoted)))
}

/// `<Token>` of an `ix://<org>/<name>/unresolved/<Token>` placeholder.
fn placeholder_token(target: &str) -> Option<&str> {
    match parse_identity(target)? {
        (_, UNRESOLVED_SEGMENT, token) => Some(token),
        _ => None,
    }
}

/// `ix://<org>/<name>/<segment>/<tail>` as `(<org>/<name>, segment, tail)`.
fn parse_identity(target: &str) -> Option<(&str, &str, &str)> {
    let rest = target.strip_prefix(SCHEME)?;
    let (org, rest) = rest.split_once('/')?;
    let (name, rest) = rest.split_once('/')?;
    let (segment, tail) = rest.split_once('/')?;
    if org.is_empty() || name.is_empty() || segment.is_empty() || tail.is_empty() {
        return None;
    }
    let end = org.len() + 1 + name.len();
    Some((&target[SCHEME.len()..SCHEME.len() + end], segment, tail))
}

/// Classify one `target` (FR-092 "Classification"). `companion` is the
/// engine's `semantic.unresolved-type` advisory for a placeholder, when the
/// caller found one; a placeholder with none is `UnknownToken`. A form the
/// engine never returns is `UnknownToken` too: the enum is closed and no
/// string reaches the IR without a definition behind it.
pub fn classify(
    target: &str,
    companion: Option<&SemanticDiagnostic>,
    bundle: &Bundle,
    outcomes: &Outcomes,
) -> Resolution {
    if let Some(scalar) = KernelScalar::from_name(target) {
        return Resolution::KernelScalar(scalar);
    }
    let Some((package, segment, name)) = parse_identity(target) else {
        return Resolution::Unresolved(Unresolved::UnknownToken);
    };
    match segment {
        UNRESOLVED_SEGMENT => Resolution::Unresolved(placeholder_reason(companion)),
        TYPE_SEGMENT if package != bundle.package().identity() => {
            Resolution::Unresolved(Unresolved::ImportUnsupported(package.to_string()))
        }
        TYPE_SEGMENT => match indexed_artifact(bundle, name) {
            Some(document) => {
                let artifact = ArtifactRef::of(document);
                match outcomes.get(&artifact.id) {
                    Some(Outcome::Definition) if document.object() == Some(ENUMERATION) => {
                        Resolution::Enumeration(artifact)
                    }
                    Some(Outcome::Definition) => Resolution::Object(artifact),
                    Some(Outcome::NotLowered { .. }) | None => {
                        Resolution::Unresolved(Unresolved::Stale(artifact))
                    }
                }
            }
            None => Resolution::Unresolved(Unresolved::UnknownToken),
        },
        _ => Resolution::Unresolved(Unresolved::UnknownToken),
    }
}

/// The `Unresolved` an engine placeholder's companion `reason` names.
fn placeholder_reason(companion: Option<&SemanticDiagnostic>) -> Unresolved {
    match companion.and_then(|d| d.reason.as_deref()) {
        Some(REASON_NO_BUNDLE_INDEX) => Unresolved::NoBundleIndex,
        Some(REASON_IMPORT_UNRESOLVED) => Unresolved::ImportUnresolved,
        Some(REASON_UNKNOWN_TOKEN) | Some(_) | None => Unresolved::UnknownToken,
    }
}

/// The indexed artifact the engine resolved `name` to, in the engine's own
/// precedence (quire-rs FR-070): an object by `id`, else the one object
/// whose `names` carry it, else an enumeration by `id` or name.
pub(crate) fn indexed_artifact<'a>(bundle: &'a Bundle, name: &str) -> Option<&'a Document> {
    let index = bundle.index();
    let id = index
        .objects
        .iter()
        .find(|o| o.id == name)
        .or_else(|| {
            index
                .objects
                .iter()
                .find(|o| o.names.iter().any(|n| n == name))
        })
        .or_else(|| {
            index
                .enumerations
                .iter()
                .find(|e| e.id == name || e.names.iter().any(|n| n == name))
        })
        .map(|entry| entry.id.as_str())?;
    bundle.documents().iter().find(|d| d.id() == id)
}

/// The FR-092 diagnostic for one `Unresolved` at the row; a `Stale` one
/// carries the cause the pass-one outcome recorded in `related`.
fn unresolved_diagnostic(
    unresolved: &Unresolved,
    target: &str,
    path: &str,
    locus: Option<Locus>,
    source_identity: &str,
    outcomes: &Outcomes,
) -> Diagnostic {
    let token = parse_identity(target)
        .map(|(_, _, tail)| tail)
        .unwrap_or(target);
    let message = match unresolved {
        Unresolved::UnknownToken => message_with_token(
            "type `",
            token,
            "` names no kernel scalar, bundle artifact, or module export (unknown-token)",
        ),
        Unresolved::NoBundleIndex => message_with_token(
            "type `",
            token,
            "` cannot be resolved: the bundle index is empty (no-bundle-index)",
        ),
        Unresolved::ImportUnresolved => message_with_token(
            "type `",
            token,
            "` names an import of a module the engine could not resolve (import-unresolved)",
        ),
        Unresolved::ImportUnsupported(package) => message_with_token(
            "type `",
            token,
            &format!(
                "` is an import from package {package}; cross-package imports are out of scope for this frontend"
            ),
        ),
        Unresolved::Stale(artifact) => message_with_token(
            "type `",
            token,
            &format!(
                "` names artifact {} ({}), which produced no definition",
                artifact.id, artifact.path
            ),
        ),
    };
    let diagnostic = match locus {
        Some(locus) => Diagnostic::frontend(unresolved.code(), message, Some(locus)),
        // The row could not be found again: the path stays in the message
        // and in `related`, as an engine diagnostic without a line does.
        None => Diagnostic::frontend(unresolved.code(), format!("{message} ({path})"), None)
            .with_related(Locus::head(source_identity, path)),
    };
    match unresolved {
        Unresolved::Stale(artifact) => match outcomes.get(&artifact.id) {
            Some(Outcome::NotLowered { cause }) => diagnostic.with_related(cause.clone()),
            // Never extracted (FR-091 `UNKNOWN_OBJECT_TYPE` at its head).
            Some(Outcome::Definition) | None => {
                diagnostic.with_related(Locus::head(source_identity, &artifact.path))
            }
        },
        _ => diagnostic,
    }
}
