//! FR-093: lower each object-typed artifact to one IR `typeDefinition` —
//! from the engine's `FieldDecl`s, or through [`crate::enumeration`] for an
//! enumeration, then shaped into its FR-143 construct by
//! [`crate::constructs`] — with every field, multiplicity, constraint,
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
//! `identity`, `diagnosticCode`, and the alias identity a constrained
//! field's `typeRef` and its constraints' `appliesTo` name (FR-093-CON-2).
//!
//! # Constraints: one alias per constrained field (FR-034's form)
//!
//! A field row carrying one or more constraints lowers to one extra
//! definition of `kind: alias` at `type/<artifact id><FieldName>`
//! ([`PackageIdentity::alias_identity`]) whose `target` is the field's
//! resolved type, whose `constraints[]` carry the row's keywords with
//! `appliesTo` the alias identity, and whose `origin` is the row; the
//! field's `typeRef` then names the alias. This is the form FR-034 lowers
//! the semantic-core kernel path to (`VersionNumber` in
//! `fixtures/semantic/v1/positive/config-version-v1-1.json`), and the one
//! both readers resolve: `appliesTo` is a type identity for FR-050's
//! `reader.mjs` as well as for `agent_ix_semantic_ir::decide` (CR-036-4).
//! A field with no constraints is unchanged, and a record's own
//! `constraints[]` is always empty. The aliases of a record are returned
//! beside it in [`Lowering::aliases`]; [`lower_bundle`] emits them into
//! `types[]`, which FR-097 sorts by identity.
//!
//! # Declared losses
//!
//! A `JsonObject` cell lowers to the package-local scalar `any` with no
//! loss (FR-139). A `0..*` collection lowers to `presence: optional` and
//! one `DECLARED_LOSS` naming `required-collection-presence`, because the
//! source row authors no presence (FR-106-AC-5); an extraction with
//! `availability.fields.lossy` names `lossy-extraction`. Each row is
//! registered in `losses.json` ([`Loss`]).
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
//! # Relationships, operations and clauses (FR-094)
//!
//! A record's three lists are filled by [`lower_bundle`] after
//! [`lower_record`], through [`crate::edges::lower_relationships`],
//! [`crate::clauses::lower_clauses`] and
//! [`crate::clauses::lower_operations`]; a scalar or enumeration
//! definition carries none. The parameter fields of an operation share
//! [`lower_field`] with the record's rows.
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

use agent_ix_semantic_ir::vocabulary::Shape;
use quire_rs::semantic::decl::is_identifier;
use quire_rs::semantic::{AvailabilityState, Constraint, Multiplicity, SemanticExtraction};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::bundle::{Bundle, Construct, ConstructKind, Document};
use crate::clauses::{lower_clauses, lower_operations, Clause, Operation};
use crate::constructs::{
    assign_owners, refusal, shape, unlowered_declaration, ConstructMembers, Pending,
};
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason};
use crate::edges::{lower_relationships, Relationship};
use crate::enumeration::{lower_enum, values_rows};
use crate::extract::Extractions;
use crate::identity::{alias_display_name, slug, PackageIdentity};
use crate::limits::{check_bundle, check_extraction, Limits};
use crate::resolve::{ArtifactRef, Outcome, Resolution, Resolutions, Resolved, Site};
use crate::rows::{field_rows, locate, operation_rows, RowLocus};
use crate::scalars::{definitions, GeneratedOrigin, KernelScalar, ScalarDefinition};

/// `losses.json`, byte for byte.
const LOSSES: &str = include_str!("../losses.json");
/// The manifest-name prefix [`module_short_name`] strips.
const MODULE_PREFIX: &str = "spec-objects-";
/// The field extension FR-093 carries `FieldDecl.identity` as.
pub const IDENTITY_FIELD_EXTENSION: &str = "ix://agent-ix/semantic-core/ext/identity-field";
/// The field extension FR-093 carries `TypeRef.decimal` as.
pub const DECIMAL_POLICY_EXTENSION: &str = "ix://agent-ix/semantic-core/ext/decimal-policy";
/// The version of both field extensions.
pub const FIELD_EXTENSION_VERSION: &str = "1.0.0";

// ---------------------------------------------------------------------------
// IR node shapes (`schema/semantic/v1/semantic-ir.schema.json`)
// ---------------------------------------------------------------------------

/// `typeDefinition.kind` as this frontend emits it: `alias` only for the
/// definition minted per constrained field; never `enum`, `union`,
/// `sequence`, `map` or `reference`; a module-declared construct kind for an
/// artifact whose object type declares one (FR-143).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Kind {
    Scalar,
    Record,
    Alias,
    /// `{module, name}`: the construct kind the artifact's object type
    /// declares.
    Construct(ConstructKind),
}

impl Serialize for Kind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Kind::Scalar => serializer.serialize_str("scalar"),
            Kind::Record => serializer.serialize_str("record"),
            Kind::Alias => serializer.serialize_str("alias"),
            Kind::Construct(kind) => kind.serialize(serializer),
        }
    }
}

/// `common.schema.json#/$defs/unknownPolicy`, the two values emitted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UnknownPolicy {
    Preserve,
    Reject,
}

/// `field.presence`, authored by this frontend independently of multiplicity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Presence {
    Required,
    Optional,
}

impl Presence {
    /// The presence a multiplicity column authors: `required` when `lower >=
    /// 1`, `optional` otherwise. A `0..*` collection additionally raises the
    /// `required-collection-presence` loss, because the column cannot say
    /// whether the member must appear (FR-106-AC-5).
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
    /// The resolved type behind a constrained field's alias; absent on
    /// every other kind.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<Field>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<Variant>>,
    /// FR-094: a record's frontmatter edges; absent on scalars and enums.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<Vec<Relationship>>,
    /// FR-094: a record's `OperationDecl`s; absent on scalars and enums.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operations: Option<Vec<Operation>>,
    /// FR-094: a record's located `ClauseRef`s; absent on scalars and enums.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clauses: Option<Vec<Clause>>,
    /// FR-143: the members of the construct `kind` names; all absent on a
    /// scalar, record or alias.
    #[serde(flatten)]
    pub construct: ConstructMembers,
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
            target: None,
            fields: None,
            variants: None,
            relationships: None,
            operations: None,
            clauses: None,
            construct: ConstructMembers::default(),
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
    pub const ALL: [Loss; 2] = [Loss::RequiredCollectionPresence, Loss::LossyExtraction];

    /// The register row's `code`.
    pub fn row(self) -> &'static str {
        match self {
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

/// `UPPER_SNAKE`: the slug with `-` replaced by `_` and every letter
/// upper-cased. A camel-case boundary is not inserted.
pub fn screaming(name: &str) -> String {
    slug(name)
        .expect("diagnostic-code parts are validated before lowering")
        .replace('-', "_")
        .to_ascii_uppercase()
}

/// `agent-ix.<slug(package, lower-case)>.<SCREAMING_OWNER>_<KEYWORD>`.
pub fn diagnostic_code(
    package: &PackageIdentity,
    record: &str,
    field: &str,
    keyword: &str,
) -> String {
    format!(
        "agent-ix.{}.{}_{}",
        slug(package.name())
            .expect("validated package name")
            .to_ascii_lowercase(),
        screaming(&format!("{record}-{field}")),
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
            ResolvedKind::Enum => ("enumeration", ""),
        }
    }
}

/// The FR-029 constraint keywords, one per variant of the engine's
/// `Constraint` (SR-169 FND-1499): the closed match domain of
/// [`applies_to`]. [`Keyword::of`] matches the engine's enum exhaustively,
/// so a variant the engine adds is a compile error here, never a keyword
/// deemed applicable to every kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Keyword {
    Min,
    Max,
    ExclusiveMin,
    ExclusiveMax,
    MinLength,
    MaxLength,
    Pattern,
    EnumValues,
    NonEmpty,
    Unique,
    Format,
}

impl Keyword {
    /// The keyword of one engine constraint.
    pub fn of(constraint: &Constraint) -> Self {
        match constraint {
            Constraint::Min { .. } => Keyword::Min,
            Constraint::Max { .. } => Keyword::Max,
            Constraint::ExclusiveMin { .. } => Keyword::ExclusiveMin,
            Constraint::ExclusiveMax { .. } => Keyword::ExclusiveMax,
            Constraint::MinLength { .. } => Keyword::MinLength,
            Constraint::MaxLength { .. } => Keyword::MaxLength,
            Constraint::Pattern { .. } => Keyword::Pattern,
            Constraint::EnumValues { .. } => Keyword::EnumValues,
            Constraint::NonEmpty => Keyword::NonEmpty,
            Constraint::Unique => Keyword::Unique,
            Constraint::Format { .. } => Keyword::Format,
        }
    }

    /// The keyword spelled `name`, as the engine's `Constraint` tag and
    /// the IR `keyword` member spell it.
    pub fn from_name(name: &str) -> Option<Self> {
        KEYWORDS
            .iter()
            .zip(Self::ALL)
            .find(|(spelling, _)| **spelling == name)
            .map(|(_, keyword)| keyword)
    }

    /// Every keyword, in [`KEYWORDS`] order.
    pub const ALL: [Keyword; 11] = [
        Keyword::Min,
        Keyword::Max,
        Keyword::ExclusiveMin,
        Keyword::ExclusiveMax,
        Keyword::MinLength,
        Keyword::MaxLength,
        Keyword::Pattern,
        Keyword::EnumValues,
        Keyword::NonEmpty,
        Keyword::Unique,
        Keyword::Format,
    ];
}

/// The IR `kind` of the type a constraint is checked against
/// (`semantic-ir.schema.json#/$defs/typeDefinition/kind`), the closed
/// domain of the RULES.md applicability table.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum IrKind {
    Scalar,
    Record,
    Enum,
    Union,
    Alias,
    Sequence,
    Map,
    Reference,
    /// A construct kind whose declared shape is `enumeration`.
    Enumeration,
    /// A construct kind of any other shape, which no constraint keyword
    /// applies to.
    Construct,
}

impl IrKind {
    fn from_name(name: &str) -> Option<Self> {
        Some(match name {
            "scalar" => IrKind::Scalar,
            "record" => IrKind::Record,
            "enum" => IrKind::Enum,
            "union" => IrKind::Union,
            "alias" => IrKind::Alias,
            "sequence" => IrKind::Sequence,
            "map" => IrKind::Map,
            "reference" => IrKind::Reference,
            "enumeration" => IrKind::Enumeration,
            "construct" => IrKind::Construct,
            _ => return None,
        })
    }
}

/// The RULES.md applicability table, keyword by resolved `(kind, scalar)`;
/// the reader (`agent_ix_semantic_ir::decide`) decides the same table, and
/// FR-093-CON-4 asserts the two agree over the full cross product. The
/// match is exhaustive over [`Keyword`] and [`IrKind`] with no catch-all
/// (SR-169 FND-1499): a keyword or kind outside either closed set is not
/// applicable, so it is refused at the row as `CONSTRAINT_NOT_APPLICABLE`
/// rather than reaching the reader.
pub fn applies_to(keyword: &str, kind: &str, scalar: &str) -> bool {
    let (Some(keyword), Some(kind)) = (Keyword::from_name(keyword), IrKind::from_name(kind)) else {
        return false;
    };
    let ordered = matches!(
        scalar,
        "integer" | "number" | "date" | "datetime" | "duration"
    );
    let sized = matches!(scalar, "string" | "bytes");
    match (keyword, kind) {
        (
            Keyword::Min | Keyword::Max | Keyword::ExclusiveMin | Keyword::ExclusiveMax,
            IrKind::Scalar,
        ) => ordered,
        (Keyword::MinLength | Keyword::MaxLength, IrKind::Scalar) => sized,
        (Keyword::Pattern | Keyword::Format, IrKind::Scalar) => scalar == "string",
        (Keyword::EnumValues, IrKind::Scalar | IrKind::Enum | IrKind::Enumeration) => true,
        (Keyword::NonEmpty, IrKind::Scalar) => sized,
        (Keyword::NonEmpty | Keyword::Unique, IrKind::Sequence | IrKind::Map) => true,
        (
            Keyword::Min
            | Keyword::Max
            | Keyword::ExclusiveMin
            | Keyword::ExclusiveMax
            | Keyword::MinLength
            | Keyword::MaxLength
            | Keyword::Pattern
            | Keyword::Format
            | Keyword::EnumValues
            | Keyword::NonEmpty
            | Keyword::Unique,
            _,
        ) => false,
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
    /// The construct the artifact's object type declares, if any.
    pub construct: Option<&'a Construct>,
}

impl<'a> ArtifactContext<'a> {
    /// The IR `kind` a definition of the artifact carries: its construct
    /// kind, or `record`.
    pub fn kind(&self) -> Kind {
        self.construct.map_or(Kind::Record, |construct| {
            Kind::Construct(construct.kind.clone())
        })
    }

    pub(crate) fn head(&self) -> Locus {
        Locus::head(&self.package.source(), self.path)
    }

    pub(crate) fn at(&self, line: usize, column: usize) -> Locus {
        Locus::new(&self.package.source(), self.path, line, column)
    }

    /// `type/<slug(id)>`: the definition's identity, minted from the artifact
    /// id. An id with no ASCII alphanumeric is `UNSLUGGABLE_NAME` at the head.
    pub(crate) fn type_identity(&self) -> Result<String, LowerError> {
        self.package
            .type_identity(self.id)
            .map_err(|unsluggable| LowerError::Blocked(vec![unsluggable.diagnostic(self.head())]))
    }
}

/// One lowered definition with the alias definitions its constrained
/// fields minted (in field order) and the non-blocking diagnostics it
/// raised (`DECLARED_LOSS`).
#[derive(Debug, Clone, PartialEq)]
pub struct Lowering {
    pub definition: TypeDefinition,
    pub aliases: Vec<TypeDefinition>,
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
#[derive(Debug, Default)]
pub(crate) struct Sink {
    pub(crate) diagnostics: Vec<Diagnostic>,
    pub(crate) blocked: bool,
}

impl Sink {
    pub(crate) fn push(&mut self, diagnostic: Diagnostic) {
        self.blocked |= diagnostic.blocking;
        self.diagnostics.push(diagnostic);
    }

    fn finish(
        self,
        definition: TypeDefinition,
        aliases: Vec<TypeDefinition>,
    ) -> Result<Lowering, LowerError> {
        if self.blocked {
            Err(LowerError::Blocked(self.diagnostics))
        } else {
            Ok(Lowering {
                definition,
                aliases,
                diagnostics: self.diagnostics,
            })
        }
    }

    /// `value` unless a diagnostic blocked, in which case the diagnostics.
    pub(crate) fn finish_with<T>(self, value: T) -> Result<T, LowerError> {
        if self.blocked {
            Err(LowerError::Blocked(self.diagnostics))
        } else {
            Ok(value)
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
    let type_identity = ctx.type_identity()?;
    let mut sink = Sink::default();
    if fields_state.lossy {
        sink.push(
            Loss::LossyExtraction
                .diagnostic(&format!("artifact {} ({})", ctx.id, ctx.path), ctx.head()),
        );
    }
    let decls = extraction.fields.as_deref().unwrap_or(&[]);
    let mut fields = Vec::with_capacity(decls.len());
    let mut aliases = Vec::new();
    let mut codes: BTreeMap<String, Locus> = BTreeMap::new();
    let mut field_slugs: BTreeMap<String, (String, Locus)> = BTreeMap::new();
    for (index, decl) in decls.iter().enumerate() {
        let locus = locate(rows, index, &decl.name)
            .map(|r| ctx.at(r.line, r.column))
            .unwrap_or_else(|| ctx.head());
        let resolved = resolutions
            .iter()
            .find(|r| r.artifact == ctx.id && r.site == Site::Field && r.field == decl.name)
            .map(|r| &r.resolution);
        let field_slug = match slug(&decl.name) {
            Ok(slug) => slug,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(locus.clone()));
                continue;
            }
        };
        if let Some((first_name, first_locus)) = field_slugs.get(&field_slug) {
            if first_name != &decl.name {
                sink.push(
                    Diagnostic::frontend(
                        Code::UnsluggableName,
                        format!(
                            "field `{}` and earlier field `{first_name}` both slug to `{field_slug}`; no distinct identity segment can be minted",
                            decl.name
                        ),
                        Some(locus.clone()),
                    )
                    .with_related(first_locus.clone()),
                );
                continue;
            }
        } else {
            field_slugs.insert(field_slug, (decl.name.clone(), locus.clone()));
        }
        let identity = match ctx.package.field_identity(ctx.id, &decl.name) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(locus.clone()));
                continue;
            }
        };
        let mut field = lower_field(decl, resolved, identity, locus.clone(), ctx, &mut sink)?;
        if decl.constraints.as_deref().is_some_and(|c| !c.is_empty()) {
            let kind = resolved.and_then(ResolvedKind::of);
            let alias_identity = match ctx.package.alias_identity(ctx.id, &decl.name) {
                Ok(identity) => identity,
                Err(unsluggable) => {
                    sink.push(unsluggable.diagnostic(locus.clone()));
                    continue;
                }
            };
            let mut constraints = Vec::new();
            lower_constraints(
                decl,
                &alias_identity,
                kind,
                &locus,
                ctx,
                &mut codes,
                &mut constraints,
                &mut sink,
            );
            aliases.push(TypeDefinition {
                identity: alias_identity.clone(),
                display_name: alias_display_name(ctx.display_name, &decl.name),
                kind: Kind::Alias,
                roles: Vec::new(),
                origin: Origin::Source(locus),
                constraints,
                extensions: Vec::new(),
                unknown_policy: UnknownPolicy::Reject,
                scalar: None,
                target: Some(std::mem::replace(&mut field.type_ref, alias_identity)),
                fields: None,
                variants: None,
                relationships: None,
                operations: None,
                clauses: None,
                construct: ConstructMembers::default(),
            });
        }
        fields.push(field);
    }
    sink.finish(
        TypeDefinition {
            identity: type_identity,
            display_name: ctx.display_name.to_string(),
            kind: Kind::Record,
            roles: ctx.roles.clone(),
            origin: head_origin(ctx),
            // Every constraint lives on its field's alias.
            constraints: Vec::new(),
            extensions: Vec::new(),
            unknown_policy: UnknownPolicy::Reject,
            scalar: None,
            target: None,
            fields: Some(fields),
            variants: None,
            // Filled by `lower_bundle`, which holds the document, the registry
            // and the index the three need; a record always carries the three
            // lists, an enumeration or scalar never does.
            relationships: Some(Vec::new()),
            operations: Some(Vec::new()),
            clauses: Some(Vec::new()),
            construct: ConstructMembers::default(),
        },
        aliases,
    )
}

/// Lower one `FieldDecl` at `locus` to an IR `field` (FR-093 "The fields",
/// "Declared losses") under the already-minted `identity`: `typeRef` from
/// the FR-092 `resolved` classification, multiplicity default `{1,1}`,
/// presence from `lower`, nullable default `false`, `defaultKind: none`,
/// the `identity-field` and `decimal-policy` extensions, and the declared
/// loss for a `0..*` collection. Shared by a
/// record's the Properties table rows and an operation's parameter rows
/// (FR-094 "Operations"); constraints are the caller's.
pub(crate) fn lower_field(
    decl: &quire_rs::semantic::FieldDecl,
    resolved: Option<&Resolution>,
    identity: String,
    locus: Locus,
    ctx: &ArtifactContext<'_>,
    sink: &mut Sink,
) -> Result<Field, LowerError> {
    let Some(type_ref) = resolved.and_then(|r| r.type_ref(ctx.package)) else {
        return Err(LowerError::Unresolved {
            field: decl.name.clone(),
        });
    };
    let multiplicity = decl
        .type_ref
        .multiplicity
        .clone()
        .unwrap_or_else(Multiplicity::one);
    if multiplicity.lower == 0 && multiplicity.upper.is_none() {
        sink.push(Loss::RequiredCollectionPresence.diagnostic(
            &format!(
                "field {} is a 0..* collection whose authored presence is optional",
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
    Ok(Field {
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
    })
}

/// The constraints of one field row under FR-029, each with `appliesTo`
/// the row's alias (`alias_identity`), with `DUPLICATE_CONSTRAINT` on a
/// repeated keyword or a colliding `diagnosticCode` and
/// `CONSTRAINT_NOT_APPLICABLE` from the RULES.md table — the frontend's own
/// gate, raised at the row before the reader could see the alias.
#[allow(clippy::too_many_arguments)]
fn lower_constraints(
    decl: &quire_rs::semantic::FieldDecl,
    alias_identity: &str,
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
        let code = diagnostic_code(ctx.package, ctx.display_name, &decl.name, &keyword);
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
            .constraint_identity(ctx.id, &decl.name, &keyword)
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
            applies_to: alias_identity.to_string(),
            diagnostic_code: code,
            origin: Origin::Source(locus.clone()),
        });
    }
}

// ---------------------------------------------------------------------------
// Lowering the bundle
// ---------------------------------------------------------------------------

/// Every definition of one lift and the diagnostics of this stage.
///
/// `types` holds the kernel scalar definitions in identity order, the
/// lowered artifact in document path order, each record followed by the
/// aliases of its constrained fields in field order; FR-097 sorts by
/// identity.
/// `diagnostics` holds FR-092's diagnostics — minus every
/// `KERNEL_NAME_SHADOWED` a `DUPLICATE_TYPE_NAME` superseded — followed by
/// this stage's own; the engine's stay in [`Extractions::diagnostics`].
#[derive(Debug, Clone, Default)]
pub struct Lowered {
    pub types: Vec<TypeDefinition>,
    pub diagnostics: Vec<Diagnostic>,
    /// The construct kinds `types` use, each once, sorted by kind.
    pub constructs: Vec<Construct>,
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
            constructs: Vec::new(),
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

    // Every kernel scalar the bundle uses is a `type/` definition already, so
    // an artifact declaring its name, or whose id slugs to it, collides with
    // it. `names` holds the declared names; `taken` the id slugs that mint
    // `type/` identities.
    let mut names: BTreeMap<String, Locus> = BTreeMap::new();
    let mut taken: BTreeMap<String, (String, Locus)> = BTreeMap::new();
    let kernel_slugs: BTreeMap<String, KernelScalar> = resolutions
        .scalars_used
        .iter()
        .filter_map(|k| slug(k.name()).ok().map(|s| (s, *k)))
        .collect();
    let mut superseded: BTreeSet<String> = BTreeSet::new();
    let mut pending: Vec<Pending> = Vec::new();
    // The `type/` identities of artifacts whose lowering failed: an edge
    // naming one is refused with its source (`assign_owners`).
    let mut lowered_to_nothing: BTreeSet<String> = BTreeSet::new();
    // The IR roles of every object-typed artifact of the bundle, by id: what
    // a construct reference names and is admitted by (FR-143).
    let artifact_roles: BTreeMap<String, Vec<String>> = bundle
        .documents()
        .iter()
        .filter_map(|d| {
            let object = d.object()?;
            let object_type = bundle.object_type(object)?;
            Some((
                d.id().to_string(),
                roles(&object_type.module, object, object_type.archetype.roles()),
            ))
        })
        .collect();

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
        // The identity is `type/<slug(id)>`: an id with no ASCII alphanumeric
        // mints no identity, whatever the declared name.
        let id_slug = match slug(document.id()) {
            Ok(s) => s,
            Err(unsluggable) => {
                own.push(unsluggable.diagnostic(head));
                continue;
            }
        };
        // Contract case (a): two declarations of one verbatim `displayName`.
        if let Some(first) = names.get(&artifact.display_name) {
            own.push(
                Diagnostic::frontend(
                    Code::DuplicateTypeName,
                    format!(
                        "artifact {} ({}) lowers to type name `{}`, already declared by {}",
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
        // Contract case (a): the declared name or the minted identity is a
        // kernel scalar's this bundle uses.
        let by_name = resolutions
            .scalars_used
            .iter()
            .find(|k| k.name() == artifact.display_name);
        if let Some(scalar) = by_name.or_else(|| kernel_slugs.get(&id_slug)) {
            let collision = if by_name.is_some() {
                format!("lowers to type name `{}`", artifact.display_name)
            } else {
                format!("mints type/{id_slug}")
            };
            own.push(Diagnostic::frontend(
                Code::DuplicateTypeName,
                format!(
                    "artifact {} ({}) {collision}, which collides with the kernel scalar {} this bundle uses (type/{})",
                    document.id(),
                    document.path(),
                    scalar.name(),
                    scalar.name()
                ),
                Some(head),
            ));
            superseded.insert(document.path().to_string());
            continue;
        }
        // Contract case (b): two distinct ids whose slugs coincide mint one
        // `type/` identity.
        if let Some((first_id, first)) = taken.get(&id_slug) {
            own.push(
                Diagnostic::frontend(
                    Code::UnsluggableName,
                    format!(
                        "artifact {} ({}) id and earlier id `{first_id}` both slug to `{id_slug}`; no distinct identity segment can be minted",
                        document.id(),
                        document.path()
                    ),
                    Some(head),
                )
                .with_related(first.clone()),
            );
            continue;
        }
        names.insert(artifact.display_name.clone(), head.clone());
        taken.insert(id_slug, (document.id().to_string(), head.clone()));

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
            construct: object_type.construct.as_ref(),
        };
        let declaration = object_type
            .construct
            .as_ref()
            .map(|construct| &construct.declaration);
        let outcome = if declaration.is_some_and(|d| d.shape == Shape::Enumeration) {
            if let Some(rule) = unlowered_declaration(declaration, &extracted.extraction) {
                own.push(refusal(document.id(), document.path(), object, &rule, head));
                lowered_to_nothing.extend(package.type_identity(document.id()).ok());
                continue;
            }
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
            lower_record(&extracted.extraction, &resolutions.resolutions, &rows, &ctx).and_then(
                |mut lowering| {
                    // FR-094: the record's edges, clauses and operations.
                    let relationships = lower_relationships(
                        document,
                        object_type,
                        bundle,
                        &resolutions.outcomes,
                        &ctx,
                    )
                    .map_err(LowerError::Blocked)?;
                    let clauses = lower_clauses(&extracted.extraction, &ctx)?;
                    let operations = lower_operations(
                        &extracted.extraction,
                        &resolutions.resolutions,
                        &operation_rows(
                            document.raw(),
                            extracted.extraction.operations.as_deref().unwrap_or(&[]),
                        ),
                        &ctx,
                    )?;
                    lowering.definition.relationships = Some(relationships);
                    lowering.definition.clauses = Some(clauses);
                    lowering.definition.operations = Some(operations);
                    // FR-143: the construct the object type names.
                    shape(
                        object,
                        &extracted.extraction,
                        &artifact_roles,
                        &mut lowering.definition,
                        &resolutions.resolutions,
                        &ctx,
                    )?;
                    Ok(lowering)
                },
            )
        };
        if outcome.is_err() {
            if let Ok(identity) = package.type_identity(document.id()) {
                lowered_to_nothing.insert(identity);
            }
        }
        match outcome {
            Ok(lowering) => pending.push(Pending {
                id: document.id().to_string(),
                path: document.path().to_string(),
                object: object.to_string(),
                head,
                lowering,
                construct: object_type.construct.clone(),
            }),
            Err(LowerError::Blocked(diagnostics)) => own.extend(diagnostics),
            Err(LowerError::NotLowered) | Err(LowerError::Unresolved { .. }) => {}
        }
    }
    let refusals = assign_owners(&mut pending, lowered_to_nothing);
    let mut constructs: BTreeMap<ConstructKind, Construct> = BTreeMap::new();
    for construct in pending.iter().filter_map(|item| item.construct.as_ref()) {
        constructs
            .entry(construct.kind.clone())
            .or_insert_with(|| construct.clone());
    }
    for item in pending {
        own.extend(item.lowering.diagnostics);
        types.push(item.lowering.definition);
        types.extend(item.lowering.aliases);
    }
    own.extend(refusals);

    own.extend(identity_collisions(&types));
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
    Lowered {
        types,
        diagnostics,
        constructs: constructs.into_values().collect(),
    }
}

/// Check every node the frontend admitted after the name-level pass. Name
/// collisions are intentionally handled earlier as `DUPLICATE_TYPE_NAME`;
/// this pass catches cross-kind collisions such as an authored `NoteRevision`
/// type and the alias minted for `Note.revision`.
fn identity_collisions(types: &[TypeDefinition]) -> Vec<Diagnostic> {
    let mut seen: BTreeMap<String, Option<Locus>> = BTreeMap::new();
    let mut diagnostics = Vec::new();
    for definition in types {
        for (identity, locus) in identities_of(definition) {
            if let Some(first) = seen.get(&identity) {
                let mut diagnostic = Diagnostic::frontend(
                    Code::DuplicateIdentity,
                    format!("identity `{identity}` is already minted by an earlier node"),
                    locus.clone(),
                );
                if let Some(first) = first {
                    diagnostic = diagnostic.with_related(first.clone());
                }
                diagnostics.push(diagnostic);
            } else {
                seen.insert(identity, locus);
            }
        }
    }
    diagnostics
}

fn source_locus(origin: &Origin) -> Option<Locus> {
    match origin {
        Origin::Source(locus) => Some(locus.clone()),
        Origin::Generated(_) => None,
    }
}

fn identities_of(definition: &TypeDefinition) -> Vec<(String, Option<Locus>)> {
    let mut out = vec![(
        definition.identity.clone(),
        source_locus(&definition.origin),
    )];
    out.extend(
        definition
            .constraints
            .iter()
            .map(|node| (node.identity.clone(), source_locus(&node.origin))),
    );
    out.extend(
        definition
            .fields
            .iter()
            .flatten()
            .map(|field| (field.identity.clone(), source_locus(&field.origin))),
    );
    out.extend(
        definition
            .variants
            .iter()
            .flatten()
            .map(|variant| (variant.identity.clone(), source_locus(&variant.origin))),
    );
    out.extend(
        definition
            .relationships
            .iter()
            .flatten()
            .map(|relationship| {
                (
                    relationship.identity.clone(),
                    source_locus(&relationship.origin),
                )
            }),
    );
    for operation in definition.operations.iter().flatten() {
        out.push((operation.identity.clone(), source_locus(&operation.origin)));
        out.extend(
            operation
                .params
                .iter()
                .map(|param| (param.identity.clone(), source_locus(&param.origin))),
        );
    }
    out.extend(
        definition
            .clauses
            .iter()
            .flatten()
            .map(|clause| (clause.identity.clone(), source_locus(&clause.origin))),
    );
    let construct = &definition.construct;
    out.extend(
        construct
            .states
            .iter()
            .flatten()
            .map(|state| (state.identity.clone(), source_locus(&state.origin))),
    );
    out.extend(construct.transitions.iter().flatten().map(|transition| {
        (
            transition.identity.clone(),
            source_locus(&transition.origin),
        )
    }));
    out.extend(
        construct
            .steps
            .iter()
            .flatten()
            .map(|step| (step.identity.clone(), source_locus(&step.origin))),
    );
    out
}

/// The document of `bundle` at `path`.
pub fn document_at<'a>(bundle: &'a Bundle, path: &str) -> Option<&'a Document> {
    bundle.documents().iter().find(|d| d.path() == path)
}
