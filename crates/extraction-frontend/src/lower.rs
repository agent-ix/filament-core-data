//! FR-093: lower each object-typed artifact to one IR `typeDefinition` —
//! `kind: record` from the engine's `FieldDecl`s, or `kind: enum` through
//! [`crate::enumeration`] — with every field, multiplicity, constraint,
//! identity and nullability value taken from the engine's declaration and
//! never from a name.
//!
//! # What a record is a function of
//!
//! [`lower_record`] reads the `SemanticExtraction`, the FR-092 resolutions
//! of its fields, the row loci [`crate::rows`] re-read through the engine's
//! scanner, and an [`ArtifactContext`] (identity, path, display name, roles)
//! — and nothing else (FR-093-CON-1). `fields_form` is never consulted: the
//! table form and the fence form of one declaration lower to the same
//! nodes, and the field `origin.source` is the row's line at the column
//! where the declaration text begins (column 3 of a table row; the first
//! non-blank column of a fence line), which is the one locus both forms
//! share when a fixture aligns them. The field name reaches only `name`,
//! `identity`, `appliesTo` and `diagnosticCode` (FR-093-CON-2).
//!
//! # Declared losses (issue #78, unruled)
//!
//! A `JsonObject` cell lowers to the package-local open record
//! [`json_object_record`] and one `DECLARED_LOSS` naming
//! `unconstrained-value`; a `0..*` collection lowers to `presence:
//! optional` and one `DECLARED_LOSS` naming `required-collection-presence`;
//! an extraction with `availability.fields.lossy` names `lossy-extraction`.
//! Each row is registered in `losses.json` ([`Loss`]), cited to #78 or to
//! quire-rs FR-072; a contrary ruling removes the rows, the record, the
//! presence derivation and every golden carrying them in one commit.
//!
//! # Type names
//!
//! [`lower_bundle`] decides every artifact's `displayName` (frontmatter
//! `name` when it is an `Identifier`, else the `title`), raises
//! `UNNAMEABLE_ARTIFACT` when neither is an `Identifier`, and raises
//! `DUPLICATE_TYPE_NAME` at the second document in path order whose slug
//! equals an earlier one's (decision D8) — including the slug of a kernel
//! scalar the bundle uses, whose `type/` definition FR-092 mints: there the
//! blocking `DUPLICATE_TYPE_NAME` supersedes pass one's
//! `KERNEL_NAME_SHADOWED` warning, which stays only when the bundle does not
//! use the scalar (orchestrator ruling on FR-092-AC-8 / FR-093-AC-13).
//!
//! # Module short name
//!
//! FR-093 names roles `<module short name>:<object type>` with the example
//! `business:entity` for `spec-objects-business`, and defines the short name
//! nowhere; the engine surfaces no `nav.category.slug`. [`module_short_name`]
//! strips a leading `spec-objects-` from the manifest `name` and otherwise
//! keeps the name whole. Reported as a spec gap with Task-132.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

use quire_rs::semantic::decl::is_identifier;
use quire_rs::semantic::{AvailabilityState, Constraint, Multiplicity, SemanticExtraction};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::bundle::{Bundle, Document};
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason, OWNER};
use crate::enumeration::{lower_enum, values_rows};
use crate::extract::Extractions;
use crate::identity::{slug, PackageIdentity};
use crate::limits::{check_bundle, check_extraction, Limits};
use crate::resolve::{ArtifactRef, Outcome, Resolution, Resolutions, Resolved};
use crate::rows::{field_rows, locate, RowLocus};
use crate::scalars::{definitions, GeneratedOrigin, KernelScalar, ScalarDefinition};

/// `losses.json`, byte for byte.
const LOSSES: &str = include_str!("../losses.json");
/// The manifest-name prefix [`module_short_name`] strips.
const MODULE_PREFIX: &str = "spec-objects-";
/// The frontmatter `object` value of an enumeration artifact.
const ENUMERATION: &str = "enumeration";
/// The field extension FR-093 carries `FieldDecl.identity` as.
pub const IDENTITY_FIELD_EXTENSION: &str = "ix://agent-ix/semantic-core/ext/identity-field";
/// The field extension FR-093 carries `TypeRef.decimal` as.
pub const DECIMAL_POLICY_EXTENSION: &str = "ix://agent-ix/semantic-core/ext/decimal-policy";
/// The version of both field extensions.
pub const FIELD_EXTENSION_VERSION: &str = "1.0.0";
/// The display name and `type/` segment of the open record.
pub const JSON_OBJECT: &str = "JsonObject";

// ---------------------------------------------------------------------------
// IR node shapes (`schema/semantic/v1/semantic-ir.schema.json`)
// ---------------------------------------------------------------------------

/// `typeDefinition.kind` as this frontend emits it: never `alias`,
/// `union`, `sequence`, `map` or `reference` (FR-093 "Enumeration
/// artifacts").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Scalar,
    Record,
    Enum,
}

/// `common.schema.json#/$defs/unknownPolicy`, the two values emitted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UnknownPolicy {
    Preserve,
    Reject,
}

/// `field.presence`, derived from `multiplicity.lower`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Presence {
    Required,
    Optional,
}

impl Presence {
    /// `required` when `lower >= 1`, `optional` otherwise (FR-027).
    pub fn of(multiplicity: &Multiplicity) -> Self {
        if multiplicity.lower >= 1 {
            Presence::Required
        } else {
            Presence::Optional
        }
    }
}

/// `field.defaultKind`: this frontend lowers no defaults.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DefaultKind {
    None,
}

/// `common.schema.json#/$defs/origin`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum Origin {
    #[serde(rename = "source")]
    Source(Locus),
    #[serde(rename = "generated")]
    Generated(GeneratedOrigin),
}

/// `common.schema.json#/$defs/extension` with an open payload.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Extension {
    pub identity: String,
    pub version: String,
    pub required: bool,
    pub payload: Value,
}

/// `semantic-ir.schema.json#/$defs/constraint`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstraintNode {
    pub identity: String,
    pub keyword: String,
    pub operands: serde_json::Map<String, Value>,
    pub applies_to: String,
    pub diagnostic_code: String,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/field`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Field {
    pub identity: String,
    pub name: String,
    pub type_ref: String,
    pub presence: Presence,
    pub nullable: bool,
    pub default_kind: DefaultKind,
    pub origin: Origin,
    pub extensions: Vec<Extension>,
    pub multiplicity: Multiplicity,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

/// `semantic-ir.schema.json#/$defs/variant`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Variant {
    pub identity: String,
    pub name: String,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/typeDefinition`, the members this
/// frontend emits.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeDefinition {
    pub identity: String,
    pub display_name: String,
    pub kind: Kind,
    pub roles: Vec<String>,
    pub origin: Origin,
    pub constraints: Vec<ConstraintNode>,
    pub extensions: Vec<Extension>,
    pub unknown_policy: UnknownPolicy,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scalar: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<Field>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<Variant>>,
}

impl From<ScalarDefinition> for TypeDefinition {
    fn from(scalar: ScalarDefinition) -> Self {
        TypeDefinition {
            identity: scalar.identity,
            display_name: scalar.display_name,
            kind: Kind::Scalar,
            roles: scalar.roles,
            origin: Origin::Generated(scalar.origin.generated),
            constraints: Vec::new(),
            extensions: scalar
                .extensions
                .into_iter()
                .map(|e| Extension {
                    identity: e.identity,
                    version: e.version,
                    required: e.required,
                    payload: serde_json::json!({ "name": e.payload.name }),
                })
                .collect(),
            unknown_policy: UnknownPolicy::Reject,
            scalar: Some(scalar.scalar),
            fields: None,
            variants: None,
        }
    }
}

// ---------------------------------------------------------------------------
// The loss register
// ---------------------------------------------------------------------------

/// The closed set of representability losses this frontend takes, one per
/// `losses.json` row.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Loss {
    UnconstrainedValue,
    RequiredCollectionPresence,
    LossyExtraction,
}

/// One row of `losses.json`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct LossRow {
    pub code: String,
    pub construct: String,
    pub lowering: String,
    pub owner: String,
    pub diagnostic: String,
}

#[derive(Debug, Deserialize)]
struct LossRegister {
    losses: Vec<LossRow>,
}

impl Loss {
    /// Every loss, in register order.
    pub const ALL: [Loss; 3] = [
        Loss::UnconstrainedValue,
        Loss::RequiredCollectionPresence,
        Loss::LossyExtraction,
    ];

    /// The register row's `code`.
    pub fn row(self) -> &'static str {
        match self {
            Loss::UnconstrainedValue => "unconstrained-value",
            Loss::RequiredCollectionPresence => "required-collection-presence",
            Loss::LossyExtraction => "lossy-extraction",
        }
    }

    /// The `DECLARED_LOSS` info naming this row at `locus`.
    pub fn diagnostic(self, what: &str, locus: Locus) -> Diagnostic {
        Diagnostic::frontend(
            Code::DeclaredLoss,
            format!("{what}: declared loss `{}` (losses.json)", self.row()),
            Some(locus),
        )
    }
}

/// The rows `losses.json` registers, in file order.
pub fn loss_register() -> Result<Vec<LossRow>, serde_json::Error> {
    serde_json::from_str::<LossRegister>(LOSSES).map(|r| r.losses)
}

// ---------------------------------------------------------------------------
// Names and roles
// ---------------------------------------------------------------------------

/// `<module short name>` of a manifest `name`: `business` for
/// `spec-objects-business`; a name without the prefix is its own short
/// name.
pub fn module_short_name(module: &str) -> &str {
    module.strip_prefix(MODULE_PREFIX).unwrap_or(module)
}

/// `roles` of a definition: `<short>:<object type>` followed by
/// `<short>:<role>` per manifest role, sorted and de-duplicated.
pub fn roles(module: &str, object: &str, manifest_roles: &[String]) -> Vec<String> {
    let short = module_short_name(module);
    let set: BTreeSet<String> = std::iter::once(object)
        .chain(manifest_roles.iter().map(String::as_str))
        .map(|r| format!("{short}:{r}"))
        .collect();
    set.into_iter().collect()
}

/// `<SCREAMING_FIELD>`: the name split at each `_`, `-` and
/// lower-to-upper case boundary, every part upper-cased, joined with `_`
/// (`versionNumber` and `version_number` both yield `VERSION_NUMBER`).
pub fn screaming(name: &str) -> String {
    let mut parts: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut previous: Option<char> = None;
    for c in name.chars() {
        let separator = c == '_' || c == '-';
        let boundary = previous.is_some_and(|p| p.is_lowercase()) && c.is_uppercase();
        if (separator || boundary) && !current.is_empty() {
            parts.push(std::mem::take(&mut current));
        }
        if !separator {
            current.extend(c.to_uppercase());
        }
        previous = Some(c);
    }
    if !current.is_empty() {
        parts.push(current);
    }
    parts.join("_")
}

/// `agent-ix.<name>.<SCREAMING_FIELD>_<KEYWORD>`, the keyword in the same
/// screaming form (`maxLength` → `MAX_LENGTH`).
pub fn diagnostic_code(package: &PackageIdentity, field: &str, keyword: &str) -> String {
    format!(
        "agent-ix.{}.{}_{}",
        package.name(),
        screaming(field),
        screaming(keyword)
    )
}

// ---------------------------------------------------------------------------
// Applicability (crates/semantic-ir/RULES.md)
// ---------------------------------------------------------------------------

/// The resolved kind a constraint is checked against: the IR `kind` and,
/// for a scalar, its `scalar` value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResolvedKind<'a> {
    Scalar(&'a str),
    Record,
    Enum,
}

impl<'a> ResolvedKind<'a> {
    /// The kind a field's resolution lowers to; `None` for an unresolved
    /// token, which reaches no document.
    pub fn of(resolution: &Resolution) -> Option<Self> {
        match resolution {
            Resolution::KernelScalar(scalar) if scalar.is_open_record() => {
                Some(ResolvedKind::Record)
            }
            Resolution::KernelScalar(scalar) => scalar.ir_scalar().map(ResolvedKind::Scalar),
            Resolution::Object(_) => Some(ResolvedKind::Record),
            Resolution::Enumeration(_) => Some(ResolvedKind::Enum),
            Resolution::Unresolved(_) => None,
        }
    }

    /// The `(kind, scalar)` pair the reader's table is keyed by.
    pub fn pair(self) -> (&'static str, &'a str) {
        match self {
            ResolvedKind::Scalar(scalar) => ("scalar", scalar),
            ResolvedKind::Record => ("record", ""),
            ResolvedKind::Enum => ("enum", ""),
        }
    }
}

/// The RULES.md applicability table, keyword by resolved `(kind, scalar)`;
/// the reader (`agent_ix_semantic_ir::decide`) decides the same table, and
/// FR-093-CON-4 asserts the two agree over the full cross product.
pub fn applies_to(keyword: &str, kind: &str, scalar: &str) -> bool {
    match keyword {
        "min" | "max" | "exclusiveMin" | "exclusiveMax" => {
            kind == "scalar"
                && matches!(
                    scalar,
                    "integer" | "number" | "date" | "datetime" | "duration"
                )
        }
        "minLength" | "maxLength" => kind == "scalar" && matches!(scalar, "string" | "bytes"),
        "pattern" | "format" => kind == "scalar" && scalar == "string",
        "enumValues" => kind == "scalar" || kind == "enum",
        "nonEmpty" => {
            (kind == "scalar" && matches!(scalar, "string" | "bytes"))
                || matches!(kind, "sequence" | "map")
        }
        "unique" => matches!(kind, "sequence" | "map"),
        _ => true,
    }
}

/// The FR-029 keyword vocabulary, as the engine's `Constraint` spells it.
pub const KEYWORDS: [&str; 11] = [
    "min",
    "max",
    "exclusiveMin",
    "exclusiveMax",
    "minLength",
    "maxLength",
    "pattern",
    "enumValues",
    "nonEmpty",
    "unique",
    "format",
];

/// `keyword` and `operands` of one engine `Constraint`: the engine's own
/// serialization (`keyword` tag plus the operand members) split in two,
/// so no operand is respelled here.
fn keyword_and_operands(constraint: &Constraint) -> (String, serde_json::Map<String, Value>) {
    let mut map = match serde_json::to_value(constraint) {
        Ok(Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };
    let keyword = map
        .remove("keyword")
        .and_then(|v| v.as_str().map(str::to_string))
        .unwrap_or_default();
    (keyword, map)
}

// ---------------------------------------------------------------------------
// Lowering one artifact
// ---------------------------------------------------------------------------

/// What a lowering needs to know about the artifact besides its
/// extraction: the identity root and the naming decisions
/// [`lower_bundle`] made.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ArtifactContext<'a> {
    pub package: &'a PackageIdentity,
    /// Frontmatter `id`.
    pub id: &'a str,
    /// Bundle-root-relative document path.
    pub path: &'a str,
    /// The FR-093 `displayName`, already an `Identifier`.
    pub display_name: &'a str,
    /// The definition's `roles`, sorted and de-duplicated.
    pub roles: Vec<String>,
}

impl<'a> ArtifactContext<'a> {
    fn head(&self) -> Locus {
        Locus::head(&self.package.source(), self.path)
    }

    fn at(&self, line: usize, column: usize) -> Locus {
        Locus::new(&self.package.source(), self.path, line, column)
    }
}

/// One lowered definition with the non-blocking diagnostics it raised
/// (`DECLARED_LOSS`).
#[derive(Debug, Clone, PartialEq)]
pub struct Lowering {
    pub definition: TypeDefinition,
    pub diagnostics: Vec<Diagnostic>,
}

/// Why an artifact produced no definition.
#[derive(Debug, Clone, PartialEq)]
pub enum LowerError {
    /// `availability.fields.state` is `unavailable` or `missing`: FR-092
    /// pass one raised `ARTIFACT_NOT_LOWERED`, which is not re-raised here.
    NotLowered,
    /// A field's token has no definition behind it: FR-092 pass two raised
    /// the diagnostic, which is not re-raised here.
    Unresolved { field: String },
    /// The frontend's own blocking findings over the artifact, with any
    /// non-blocking ones raised before them.
    Blocked(Vec<Diagnostic>),
}

impl fmt::Display for LowerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LowerError::NotLowered => f.write_str("the artifact's fields are unavailable"),
            LowerError::Unresolved { field } => write!(f, "field `{field}` has no resolution"),
            LowerError::Blocked(diagnostics) => {
                write!(f, "{} blocking diagnostic(s)", diagnostics.len())
            }
        }
    }
}

impl std::error::Error for LowerError {}

/// Collects diagnostics and remembers whether one of them blocks.
#[derive(Default)]
struct Sink {
    diagnostics: Vec<Diagnostic>,
    blocked: bool,
}

impl Sink {
    fn push(&mut self, diagnostic: Diagnostic) {
        self.blocked |= diagnostic.blocking;
        self.diagnostics.push(diagnostic);
    }

    fn finish(self, definition: TypeDefinition) -> Result<Lowering, LowerError> {
        if self.blocked {
            Err(LowerError::Blocked(self.diagnostics))
        } else {
            Ok(Lowering {
                definition,
                diagnostics: self.diagnostics,
            })
        }
    }
}

/// The `origin` of a definition: the artifact's path at line 1, column 1.
fn head_origin(ctx: &ArtifactContext<'_>) -> Origin {
    Origin::Source(ctx.head())
}

/// Lower one object artifact to a `record` (FR-093 "The record", "The
/// fields", "Declared losses").
///
/// `resolutions` are the FR-092 classifications of this artifact's fields
/// (entries of other artifacts are ignored); `rows` are the declaration
/// rows [`crate::rows::field_rows`] re-read from the document.
pub fn lower_record(
    extraction: &SemanticExtraction,
    resolutions: &[Resolved],
    rows: &[RowLocus],
    ctx: &ArtifactContext<'_>,
) -> Result<Lowering, LowerError> {
    let fields_state = &extraction.availability.fields;
    if matches!(
        fields_state.state,
        AvailabilityState::Unavailable | AvailabilityState::Missing
    ) {
        return Err(LowerError::NotLowered);
    }
    let mut sink = Sink::default();
    if fields_state.lossy {
        sink.push(
            Loss::LossyExtraction
                .diagnostic(&format!("artifact {} ({})", ctx.id, ctx.path), ctx.head()),
        );
    }
    let decls = extraction.fields.as_deref().unwrap_or(&[]);
    let mut fields = Vec::with_capacity(decls.len());
    let mut constraints = Vec::new();
    let mut codes: BTreeMap<String, Locus> = BTreeMap::new();
    for (index, decl) in decls.iter().enumerate() {
        let locus = locate(rows, index, &decl.name)
            .map(|r| ctx.at(r.line, r.column))
            .unwrap_or_else(|| ctx.head());
        let resolved = resolutions
            .iter()
            .find(|r| r.artifact == ctx.id && r.field == decl.name)
            .map(|r| &r.resolution);
        let Some(type_ref) = resolved.and_then(|r| r.type_ref(ctx.package)) else {
            return Err(LowerError::Unresolved {
                field: decl.name.clone(),
            });
        };
        let identity = match ctx.package.field_identity(ctx.display_name, &decl.name) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(locus.clone()));
                continue;
            }
        };
        let multiplicity = decl
            .type_ref
            .multiplicity
            .clone()
            .unwrap_or_else(Multiplicity::one);
        if matches!(
            resolved,
            Some(Resolution::KernelScalar(KernelScalar::JsonObject))
        ) {
            sink.push(Loss::UnconstrainedValue.diagnostic(
                &format!("field {} is a JsonObject", decl.name),
                locus.clone(),
            ));
        }
        if multiplicity.lower == 0 && multiplicity.upper.is_none() {
            sink.push(Loss::RequiredCollectionPresence.diagnostic(
                &format!(
                    "field {} is a 0..* collection emitted as optional",
                    decl.name
                ),
                locus.clone(),
            ));
        }
        let mut extensions = Vec::new();
        if decl.identity == Some(true) {
            extensions.push(Extension {
                identity: IDENTITY_FIELD_EXTENSION.to_string(),
                version: FIELD_EXTENSION_VERSION.to_string(),
                required: false,
                payload: serde_json::json!({}),
            });
        }
        if let Some(decimal) = &decl.type_ref.decimal {
            extensions.push(Extension {
                identity: DECIMAL_POLICY_EXTENSION.to_string(),
                version: FIELD_EXTENSION_VERSION.to_string(),
                required: false,
                payload: serde_json::json!({
                    "precision": decimal.precision,
                    "scale": decimal.scale,
                }),
            });
        }
        let kind = resolved.and_then(ResolvedKind::of);
        lower_constraints(
            decl,
            &identity,
            kind,
            &locus,
            ctx,
            &mut codes,
            &mut constraints,
            &mut sink,
        );
        fields.push(Field {
            identity,
            name: decl.name.clone(),
            type_ref,
            presence: Presence::of(&multiplicity),
            nullable: decl.nullable.unwrap_or(false),
            default_kind: DefaultKind::None,
            origin: Origin::Source(locus),
            extensions,
            multiplicity,
            unit: decl.type_ref.unit.clone(),
        });
    }
    sink.finish(TypeDefinition {
        identity: ctx.package.type_identity(ctx.display_name),
        display_name: ctx.display_name.to_string(),
        kind: Kind::Record,
        roles: ctx.roles.clone(),
        origin: head_origin(ctx),
        constraints,
        extensions: Vec::new(),
        unknown_policy: UnknownPolicy::Reject,
        scalar: None,
        fields: Some(fields),
        variants: None,
    })
}

/// The constraints of one field row under FR-029, with `DUPLICATE_CONSTRAINT`
/// on a repeated keyword or a colliding `diagnosticCode` and
/// `CONSTRAINT_NOT_APPLICABLE` from the RULES.md table.
#[allow(clippy::too_many_arguments)]
fn lower_constraints(
    decl: &quire_rs::semantic::FieldDecl,
    field_identity: &str,
    kind: Option<ResolvedKind<'_>>,
    locus: &Locus,
    ctx: &ArtifactContext<'_>,
    codes: &mut BTreeMap<String, Locus>,
    out: &mut Vec<ConstraintNode>,
    sink: &mut Sink,
) {
    let mut row_keywords: BTreeSet<String> = BTreeSet::new();
    for constraint in decl.constraints.as_deref().unwrap_or(&[]) {
        let (keyword, operands) = keyword_and_operands(constraint);
        if !row_keywords.insert(keyword.clone()) {
            sink.push(Diagnostic::frontend(
                Code::DuplicateConstraint,
                format!(
                    "field {} carries the constraint keyword `{keyword}` twice",
                    decl.name
                ),
                Some(locus.clone()),
            ));
            continue;
        }
        let code = diagnostic_code(ctx.package, &decl.name, &keyword);
        if let Some(first) = codes.get(&code) {
            sink.push(
                Diagnostic::frontend(
                    Code::DuplicateConstraint,
                    format!(
                        "constraint `{keyword}` of field {} yields diagnosticCode {code}, already minted at line {}",
                        decl.name, first.start_line
                    ),
                    Some(locus.clone()),
                )
                .with_related(first.clone()),
            );
            continue;
        }
        if let Some(kind) = kind {
            let (k, s) = kind.pair();
            if !applies_to(&keyword, k, s) {
                let resolved = if s.is_empty() {
                    k.to_string()
                } else {
                    format!("{k} {s}")
                };
                sink.push(Diagnostic::frontend(
                    Code::ConstraintNotApplicable,
                    format!(
                        "constraint `{keyword}` does not apply to field {}, whose type resolves to {resolved} (crates/semantic-ir/RULES.md applicability table)",
                        decl.name
                    ),
                    Some(locus.clone()),
                ));
                continue;
            }
        }
        let identity = match ctx
            .package
            .constraint_identity(ctx.display_name, &decl.name, &keyword)
        {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(locus.clone()));
                continue;
            }
        };
        codes.insert(code.clone(), locus.clone());
        out.push(ConstraintNode {
            identity,
            keyword,
            operands,
            applies_to: field_identity.to_string(),
            diagnostic_code: code,
            origin: Origin::Source(locus.clone()),
        });
    }
}

/// The package-local open record a `JsonObject` cell resolves to
/// (`kernel-scalars.json`: `kind: record, fields: [], unknownPolicy:
/// preserve`), minted once per package that uses it.
pub fn json_object_record(package: &PackageIdentity, generator_version: &str) -> TypeDefinition {
    TypeDefinition {
        identity: package.type_identity(JSON_OBJECT),
        display_name: JSON_OBJECT.to_string(),
        kind: Kind::Record,
        roles: Vec::new(),
        origin: Origin::Generated(GeneratedOrigin {
            generator_identity: OWNER.to_string(),
            generator_version: generator_version.to_string(),
            input_identities: vec![package.source()],
        }),
        constraints: Vec::new(),
        extensions: Vec::new(),
        unknown_policy: UnknownPolicy::Preserve,
        scalar: None,
        fields: Some(Vec::new()),
        variants: None,
    }
}

// ---------------------------------------------------------------------------
// Lowering the bundle
// ---------------------------------------------------------------------------

/// Every definition of one lift and the diagnostics of this stage.
///
/// `types` holds the kernel scalar definitions in identity order, the
/// `JsonObject` record when the bundle uses it, then one definition per
/// lowered artifact in document path order; FR-097 sorts by identity.
/// `diagnostics` holds FR-092's diagnostics — minus every
/// `KERNEL_NAME_SHADOWED` a `DUPLICATE_TYPE_NAME` superseded — followed by
/// this stage's own; the engine's stay in [`Extractions::diagnostics`].
#[derive(Debug, Clone, Default)]
pub struct Lowered {
    pub types: Vec<TypeDefinition>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Lower every artifact of `bundle` under `limits` (FR-093, NFR-031).
///
/// A breach of `maxDocuments`, `maxDocumentBytes` or `maxDepth` terminates
/// the lowering with those diagnostics alone; a breach of
/// `maxFieldsPerRecord` or `maxClauseBytes` skips the offending artifact.
/// `generator_version` is the frontend version the provenance record
/// names, carried by every generated origin.
pub fn lower_bundle(
    bundle: &Bundle,
    extractions: &Extractions,
    resolutions: &Resolutions,
    limits: &Limits,
    generator_version: &str,
) -> Lowered {
    let bundle_breaches = check_bundle(bundle, limits);
    if !bundle_breaches.is_empty() {
        return Lowered {
            types: Vec::new(),
            diagnostics: bundle_breaches,
        };
    }
    let package = PackageIdentity::from(bundle.package());
    let source_identity = package.source();
    let mut own: Vec<Diagnostic> = Vec::new();
    let mut types: Vec<TypeDefinition> = definitions(
        &package,
        resolutions.scalars_used.iter().copied(),
        generator_version,
    )
    .into_iter()
    .map(TypeDefinition::from)
    .collect();
    if resolutions.scalars_used.contains(&KernelScalar::JsonObject) {
        types.push(json_object_record(&package, generator_version));
    }

    // Type names: every kernel scalar the bundle uses is a `type/`
    // definition already, so an artifact of the same slug collides with it.
    let mut taken: BTreeMap<String, Locus> = BTreeMap::new();
    let kernel_slugs: BTreeMap<String, KernelScalar> = resolutions
        .scalars_used
        .iter()
        .filter_map(|k| slug(k.name()).ok().map(|s| (s, *k)))
        .collect();
    let mut superseded: BTreeSet<String> = BTreeSet::new();

    for document in bundle.documents() {
        let Some(object) = document.object() else {
            continue;
        };
        let Some(extracted) = extractions.artifacts.get(document.id()) else {
            continue;
        };
        if !matches!(
            resolutions.outcomes.get(document.id()),
            Some(Outcome::Definition)
        ) {
            continue;
        }
        let head = Locus::head(&source_identity, document.path());
        let artifact = ArtifactRef::of(document);
        if !is_identifier(&artifact.display_name) {
            own.push(Diagnostic::frontend(
                Code::UnnameableArtifact,
                format!(
                    "artifact {} ({}) has neither a frontmatter `name` nor a `title` that is an Identifier; no definition name can be taken from `{}`",
                    document.id(),
                    document.path(),
                    artifact.display_name
                ),
                Some(head),
            ));
            continue;
        }
        let type_slug = match slug(&artifact.display_name) {
            Ok(s) => s,
            Err(unsluggable) => {
                own.push(unsluggable.diagnostic(head));
                continue;
            }
        };
        if let Some(first) = taken.get(&type_slug) {
            own.push(
                Diagnostic::frontend(
                    Code::DuplicateTypeName,
                    format!(
                        "artifact {} ({}) lowers to type name `{}`, whose slug `{type_slug}` is already taken by {}",
                        document.id(),
                        document.path(),
                        artifact.display_name,
                        first.path
                    ),
                    Some(head),
                )
                .with_related(first.clone()),
            );
            continue;
        }
        if let Some(scalar) = kernel_slugs.get(&type_slug) {
            own.push(Diagnostic::frontend(
                Code::DuplicateTypeName,
                format!(
                    "artifact {} ({}) lowers to type name `{}`, which collides with the kernel scalar {} this bundle uses (type/{})",
                    document.id(),
                    document.path(),
                    artifact.display_name,
                    scalar.name(),
                    scalar.name()
                ),
                Some(head),
            ));
            superseded.insert(document.path().to_string());
            continue;
        }
        taken.insert(type_slug, head.clone());

        let extraction_breaches = check_extraction(extracted, &source_identity, limits);
        if !extraction_breaches.is_empty() {
            own.extend(extraction_breaches);
            continue;
        }

        let Some(object_type) = bundle.object_type(object) else {
            // FR-091 raised `UNKNOWN_OBJECT_TYPE`; nothing was extracted.
            continue;
        };
        let ctx = ArtifactContext {
            package: &package,
            id: document.id(),
            path: document.path(),
            display_name: &artifact.display_name,
            roles: roles(&object_type.module, object, object_type.archetype.roles()),
        };
        let outcome = if object == ENUMERATION {
            match values_rows(document, object_type) {
                Ok(rows) => lower_enum(&rows, &ctx),
                Err(unsatisfied) => {
                    own.push(Diagnostic::with_disposition(
                        Code::ArtifactNotLowered,
                        Disposition::NotLowered(NotLoweredReason::Other),
                        format!(
                            "artifact {} ({}) lowers to no definition: the `values_table` locator is unsatisfied ({unsatisfied})",
                            document.id(),
                            document.path()
                        ),
                        Some(head),
                    ));
                    continue;
                }
            }
        } else {
            let rows = field_rows(document.raw());
            lower_record(&extracted.extraction, &resolutions.resolutions, &rows, &ctx)
        };
        match outcome {
            Ok(lowering) => {
                own.extend(lowering.diagnostics);
                types.push(lowering.definition);
            }
            Err(LowerError::Blocked(diagnostics)) => own.extend(diagnostics),
            Err(LowerError::NotLowered) | Err(LowerError::Unresolved { .. }) => {}
        }
    }

    let mut diagnostics: Vec<Diagnostic> = resolutions
        .diagnostics
        .iter()
        .filter(|d| {
            !(d.code == crate::diagnostics::WireCode::Registry(Code::KernelNameShadowed)
                && d.locus
                    .as_ref()
                    .is_some_and(|l| superseded.contains(&l.path)))
        })
        .cloned()
        .collect();
    diagnostics.extend(own);
    Lowered { types, diagnostics }
}

/// The document of `bundle` at `path`.
pub fn document_at<'a>(bundle: &'a Bundle, path: &str) -> Option<&'a Document> {
    bundle.documents().iter().find(|d| d.path() == path)
}
