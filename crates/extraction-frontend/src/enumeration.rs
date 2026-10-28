//! FR-093 "Enumeration artifacts": an `object: enumeration` artifact
//! lowers to one `typeDefinition` of `kind: enum`, one `variant` per row
//! of its `## Values` table.
//!
//! The rows come from the engine's body-extraction evaluator (quire-rs
//! FR-011, decision D4): [`values_rows`] takes the object type's
//! `values` locator from the loaded module verbatim and evaluates it
//! with `quire_rs::extract::locator::eval_locator` — the primitive
//! `quire_rs::extract::extract` itself calls, without the single-value
//! collapse a `match:` key applies — then checks the locator's `assert`
//! (`columns`, `min_rows`) with `quire_rs::evaluate_assert`. The `Value`
//! cell is read at the index the engine's `table_from_section` headers give
//! it. This module parses no table of its own.
//!
//! The evaluator returns cells, not lines; the row's line is re-read the
//! way [`crate::rows`] re-reads field rows, through the engine's scanner
//! over the same `## Values` section, and the variant's `origin.source` is
//! that line at column 3, the first cell's text after `| `.

use std::collections::BTreeMap;
use std::fmt;

use quire_rs::extract::locator::{eval_locator, LocatorPrimitive};
use quire_rs::semantic::scan::{blocks_in, level2_sections, lines, Block, Table};
use quire_rs::semantic::ModelDeclarations;
use quire_rs::{evaluate_assert, table_from_section};

use crate::bundle::{Document, ObjectType};
use crate::constructs::{lower_generalization, ConstructMembers, References};
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason};
use crate::lower::{
    ArtifactContext, LowerError, Lowering, Origin, Position, TypeDefinition, UnknownPolicy, Variant,
};
use crate::resolve::{Resolved, Site};

/// The `match:` key of the enumeration's row locator.
pub const VALUES_TABLE: &str = "values";
/// The column whose cell names the variant.
pub const VALUE_COLUMN: &str = "Value";
/// The optional table beside `## Values` whose rows name a variant's payload
/// type (FR-147). The engine's `values` reader reads the `Value` and
/// `Description` columns only, so the payload lives in a table of its own,
/// which the engine does not read.
pub const PAYLOADS_SECTION: &str = "Payloads";
/// The column of `## Payloads` naming the variant.
pub const PAYLOAD_VALUE_COLUMN: &str = "Value";
/// The column of `## Payloads` holding the payload type token.
pub const PAYLOAD_COLUMN: &str = "Payload";
/// The table whose rows declare a tuple's positions (FR-147).
pub const POSITIONS_SECTION: &str = "Positions";
/// The column whose cell names a position's type.
pub const POSITION_TYPE_COLUMN: &str = "Type";
/// Column of a table row's first cell text.
const TABLE_ROW_COLUMN: usize = 3;

/// One row the evaluator returned, located.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValueRow {
    /// The `Value` cell, verbatim.
    pub value: String,
    /// The `Payload` cell of the first `## Payloads` row naming this value,
    /// verbatim: the type token of the variant's payload (FR-147).
    pub payload: Option<String>,
    pub line: usize,
    pub column: usize,
}

/// One row of a tuple artifact's `## Positions` table (FR-147).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PositionRow {
    /// The `Type` cell, verbatim.
    pub type_cell: String,
    pub line: usize,
    pub column: usize,
}

/// Why a tuple artifact's `## Positions` table yields no rows to lower.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PositionsUnsatisfied {
    /// No `## Positions` table, or one with no data row.
    NoRows,
    /// The table has no `Type` column.
    NoTypeColumn,
}

impl fmt::Display for PositionsUnsatisfied {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PositionsUnsatisfied::NoRows => {
                write!(f, "no-rows: `## {POSITIONS_SECTION}` holds no table row")
            }
            PositionsUnsatisfied::NoTypeColumn => write!(
                f,
                "no-type-column: the table has no `{POSITION_TYPE_COLUMN}` column"
            ),
        }
    }
}

impl std::error::Error for PositionsUnsatisfied {}

/// The rows of `document`'s `## Positions` table, in table order, each with
/// its line, through the engine's scanner (FR-147).
pub fn positions_rows(document: &Document) -> Result<Vec<PositionRow>, PositionsUnsatisfied> {
    let table =
        first_table(document.raw(), POSITIONS_SECTION).ok_or(PositionsUnsatisfied::NoRows)?;
    let index = table
        .headers
        .iter()
        .position(|h| h.trim() == POSITION_TYPE_COLUMN)
        .ok_or(PositionsUnsatisfied::NoTypeColumn)?;
    if table.rows.is_empty() {
        return Err(PositionsUnsatisfied::NoRows);
    }
    Ok(table
        .rows
        .iter()
        .map(|(line, cells)| PositionRow {
            type_cell: cells
                .get(index)
                .cloned()
                .unwrap_or_default()
                .trim()
                .to_string(),
            line: *line,
            column: TABLE_ROW_COLUMN,
        })
        .collect())
}

/// Why the `values` locator yielded no rows to lower.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Unsatisfied {
    /// The object type declares no `values` locator.
    NoLocator,
    /// The locator is not a `table_row` primitive.
    NotTableRow,
    /// The required locator located nothing.
    Missing { section: String },
    /// The locator's `assert` failed; the engine's messages.
    Assert(Vec<String>),
    /// The located table has no `Value` column.
    NoValueColumn,
    /// The evaluator's rows and the scanner's rows disagree, so no row can
    /// be located.
    Unlocated { evaluated: usize, scanned: usize },
}

impl fmt::Display for Unsatisfied {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Unsatisfied::NoLocator => {
                f.write_str("no-locator: the object type declares no `values`")
            }
            Unsatisfied::NotTableRow => {
                f.write_str("not-table-row: `values` is not a table_row locator")
            }
            Unsatisfied::Missing { section } => {
                write!(f, "missing: `## {section}` holds no table row")
            }
            Unsatisfied::Assert(messages) => write!(f, "assert: {}", messages.join("; ")),
            Unsatisfied::NoValueColumn => {
                write!(
                    f,
                    "no-value-column: the table has no `{VALUE_COLUMN}` column"
                )
            }
            Unsatisfied::Unlocated { evaluated, scanned } => write!(
                f,
                "unlocated: the evaluator returned {evaluated} rows and the scanner {scanned}"
            ),
        }
    }
}

impl std::error::Error for Unsatisfied {}

/// The rows of `document`'s `## Values` table as the engine evaluates the
/// object type's `values` locator, each with its line.
pub fn values_rows(
    document: &Document,
    object_type: &ObjectType,
) -> Result<Vec<ValueRow>, Unsatisfied> {
    let locator = object_type
        .archetype
        .body_extraction()
        .and_then(|dsl| dsl.yield_pattern.r#match.as_ref())
        .and_then(|m| m.get(VALUES_TABLE))
        .ok_or(Unsatisfied::NoLocator)?;
    let primitive = locator.canonical();
    let LocatorPrimitive::TableRow {
        under_section,
        required,
        assert,
        ..
    } = primitive
    else {
        return Err(Unsatisfied::NotTableRow);
    };
    let section = under_section.clone().unwrap_or_default();
    let doc = document.loaded().body();
    let (values, _) = eval_locator(doc, locator);
    if values.is_empty() {
        if *required {
            return Err(Unsatisfied::Missing { section });
        }
        return Ok(Vec::new());
    }
    if let Some(assert) = assert {
        let failures = evaluate_assert(doc, primitive, assert, doc.frontmatter.as_ref());
        if !failures.is_empty() {
            return Err(Unsatisfied::Assert(
                failures.into_iter().map(|f| f.message).collect(),
            ));
        }
    }
    let table = table_from_section(doc, &section).ok_or(Unsatisfied::Missing {
        section: section.clone(),
    })?;
    let index = table
        .headers
        .iter()
        .position(|h| h.trim() == VALUE_COLUMN)
        .ok_or(Unsatisfied::NoValueColumn)?;
    let scanned = first_table(document.raw(), &section)
        .map(|table| table.rows)
        .unwrap_or_default();
    if scanned.len() != values.len() {
        return Err(Unsatisfied::Unlocated {
            evaluated: values.len(),
            scanned: scanned.len(),
        });
    }
    let payloads = payload_rows(document);
    Ok(values
        .iter()
        .zip(scanned)
        .map(|(row, (line, _))| {
            let value = row
                .as_str()
                .and_then(|s| s.split('\t').nth(index))
                .unwrap_or_default()
                .to_string();
            let payload = payloads
                .iter()
                .find(|payload| payload.value == value)
                .map(|payload| payload.token.clone());
            ValueRow {
                value,
                payload,
                line,
                column: TABLE_ROW_COLUMN,
            }
        })
        .collect())
}

/// One row of an enumeration's `## Payloads` table (FR-147).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PayloadRow {
    /// The `Value` cell: the variant the payload belongs to.
    pub value: String,
    /// The `Payload` cell: the payload's type token.
    pub token: String,
    pub line: usize,
    pub column: usize,
}

/// Every row of `document`'s `## Payloads` table, in table order, a blank
/// `Payload` cell included (its `token` is then empty); empty when the
/// document has no such table.
fn all_payload_rows(document: &Document) -> Vec<PayloadRow> {
    let Some(table) = first_table(document.raw(), PAYLOADS_SECTION) else {
        return Vec::new();
    };
    let column = |name: &str| table.headers.iter().position(|h| h.trim() == name);
    let (Some(value_at), Some(payload_at)) = (column(PAYLOAD_VALUE_COLUMN), column(PAYLOAD_COLUMN))
    else {
        return Vec::new();
    };
    table
        .rows
        .iter()
        .filter_map(|(line, cells)| {
            Some(PayloadRow {
                value: cells.get(value_at)?.trim().to_string(),
                token: cells.get(payload_at)?.trim().to_string(),
                line: *line,
                column: TABLE_ROW_COLUMN,
            })
        })
        .collect()
}

/// The rows of `document`'s `## Payloads` table with a non-empty `Payload`
/// cell, in table order; empty when the document has no such table.
pub fn payload_rows(document: &Document) -> Vec<PayloadRow> {
    all_payload_rows(document)
        .into_iter()
        .filter(|row| !row.token.is_empty())
        .collect()
}

/// The `## Payloads` rows that bind no variant: one naming no `## Values`
/// row, and every row after the first for one value, a blank `Payload`
/// cell (a nullary case) included.
pub fn stray_payloads(document: &Document, rows: &[ValueRow]) -> Vec<PayloadRow> {
    let mut seen: Vec<String> = Vec::new();
    let mut stray = Vec::new();
    for payload in all_payload_rows(document) {
        let known = rows.iter().any(|row| row.value == payload.value);
        if !known || seen.contains(&payload.value) {
            stray.push(payload);
        } else {
            seen.push(payload.value.clone());
        }
    }
    stray
}

/// The first table under `## <section>`, through the engine's scanner:
/// its headers and, per data row, the row's line and cells.
fn first_table(raw: &str, section: &str) -> Option<Table> {
    let lines = lines(raw);
    let &(start, end) = level2_sections(&lines, section).first()?;
    blocks_in(&lines, start + 1, end)
        .into_iter()
        .find_map(|block| match block {
            Block::Table(table) => Some(table),
            Block::Fence(_) | Block::List { .. } => None,
        })
}

/// Lower the evaluator's rows to one `enum` definition: `name` the `Value`
/// cell verbatim, `identity` `variant/<enum-slug>-<value-slug>`, origin
/// at the row's line and column 3; `DUPLICATE_TYPE_NAME` at the second of
/// two rows that slug alike. `supertypes` and `abstract` lower from `model`
/// the same way as `crate::constructs::shape`'s (FR-142: one construct
/// per object type, and neither member is enumeration-specific), since an
/// enumeration artifact never reaches `shape`.
pub fn lower_enum(
    rows: &[ValueRow],
    resolutions: &[Resolved],
    model: Option<&ModelDeclarations>,
    artifact_roles: &BTreeMap<String, Vec<String>>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Lowering, LowerError> {
    let type_identity = ctx.type_identity()?;
    let source = ctx.package.source();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    let mut blocked = false;
    let mut seen: std::collections::BTreeMap<String, (String, Locus)> =
        std::collections::BTreeMap::new();
    let mut variants = Vec::with_capacity(rows.len());
    let mut unresolved: Option<String> = None;
    for row in rows {
        let locus = Locus::new(&source, ctx.path, row.line, row.column);
        let identity = match ctx.package.variant_identity(ctx.id, &row.value) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                blocked = true;
                diagnostics.push(unsluggable.diagnostic(locus));
                continue;
            }
        };
        if let Some((first_value, first)) = seen.get(&identity) {
            blocked = true;
            diagnostics.push(
                Diagnostic::frontend(
                    if first_value == &row.value {
                        Code::DuplicateTypeName
                    } else {
                        Code::UnsluggableName
                    },
                    if first_value == &row.value {
                        format!(
                            "value `{}` of enumeration {} slugs to the variant identity {identity}, already minted at line {}",
                            row.value, ctx.display_name, first.start_line
                        )
                    } else {
                        format!(
                            "value `{}` and earlier value `{first_value}` of enumeration {} both slug to the variant identity {identity}; no distinct identity segment can be minted",
                            row.value, ctx.display_name
                        )
                    },
                    Some(locus),
                )
                .with_related(first.clone()),
            );
            continue;
        }
        seen.insert(identity.clone(), (row.value.clone(), locus.clone()));
        // FR-147: a `Payload` token is resolved as a `Type` cell is (FR-092
        // pass two); an unresolved one raised its diagnostic there.
        let payload_type = match &row.payload {
            None => None,
            Some(_) => {
                let resolved = resolutions
                    .iter()
                    .find(|r| {
                        r.artifact == ctx.id && r.site == Site::Payload && r.field == row.value
                    })
                    .and_then(|r| r.resolution.type_ref(ctx.package));
                if resolved.is_none() {
                    unresolved.get_or_insert_with(|| row.value.clone());
                }
                resolved
            }
        };
        variants.push(Variant {
            identity,
            name: row.value.clone(),
            payload_type,
            origin: Origin::Source(locus),
        });
    }
    if blocked {
        return Err(LowerError::Blocked(diagnostics));
    }
    if let Some(field) = unresolved {
        return Err(LowerError::Unresolved { field });
    }
    let mut construct = ConstructMembers::default();
    if let Some(construct_decl) = ctx.construct {
        let references = References {
            declaration: &construct_decl.declaration,
            artifact_roles,
        };
        let (supertypes, is_abstract) = lower_generalization(
            model.unwrap_or(&ModelDeclarations::default()),
            &references,
            ctx,
            object,
        )?;
        construct.supertypes = supertypes;
        construct.is_abstract = is_abstract;
    }
    Ok(Lowering {
        definition: TypeDefinition {
            identity: type_identity,
            display_name: ctx.display_name.to_string(),
            kind: ctx.kind(),
            roles: ctx.roles.clone(),
            origin: Origin::Source(Locus::head(&source, ctx.path)),
            constraints: Vec::new(),
            extensions: Vec::new(),
            unknown_policy: UnknownPolicy::Reject,
            scalar: None,
            decimal: None,
            target: None,
            fields: None,
            variants: Some(variants),
            positions: None,
            relationships: None,
            operations: None,
            clauses: None,
            construct,
        },
        aliases: Vec::new(),
        diagnostics,
    })
}

/// Whether `id` is a tuple name: `^[A-Za-z][A-Za-z0-9_]*$`, the segment an
/// owner-nested tuple identity ends in (FR-147).
fn is_tuple_name(id: &str) -> bool {
    let mut characters = id.chars();
    characters
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic())
        && characters.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Lower a tuple artifact (FR-147): one definition carrying `positions`, one
/// per row of its `## Positions` table in table order, each with the
/// identity `<tuple identity>/p<index>`, the `typeRef` the engine's verdict
/// for the row's `Type` cell names, and the origin at the row.
///
/// The tuple identity is the artifact id verbatim under the package, an
/// owner-nested identity, so an id that is not a tuple name is refused with
/// `ARTIFACT_NOT_LOWERED` at the artifact. A row whose token resolved to no
/// type raised its diagnostic in FR-092 pass two and lowers to nothing.
pub fn lower_tuple(
    rows: &[PositionRow],
    resolutions: &[Resolved],
    ctx: &ArtifactContext<'_>,
) -> Result<Lowering, LowerError> {
    let type_identity = ctx.type_identity()?;
    if !is_tuple_name(ctx.id) {
        return Err(LowerError::Blocked(vec![Diagnostic::with_disposition(
            Code::ArtifactNotLowered,
            Disposition::NotLowered(NotLoweredReason::Other),
            format!(
                "artifact {} ({}) lowers to no tuple: its id is not a tuple name (^[A-Za-z][A-Za-z0-9_]*$), so no owner-nested tuple identity can be minted",
                ctx.id, ctx.path
            ),
            Some(ctx.head()),
        )]));
    }
    let source = ctx.package.source();
    let mut positions = Vec::with_capacity(rows.len());
    let mut unresolved: Option<String> = None;
    for (index, row) in rows.iter().enumerate() {
        let name = format!("p{index}");
        let type_ref = resolutions
            .iter()
            .find(|r| r.artifact == ctx.id && r.site == Site::Position && r.field == name)
            .and_then(|r| r.resolution.type_ref(ctx.package));
        let Some(type_ref) = type_ref else {
            unresolved.get_or_insert(name);
            continue;
        };
        positions.push(Position {
            identity: format!("{type_identity}/{name}"),
            type_ref,
            origin: Origin::Source(Locus::new(&source, ctx.path, row.line, row.column)),
        });
    }
    if let Some(field) = unresolved {
        return Err(LowerError::Unresolved { field });
    }
    Ok(Lowering {
        definition: TypeDefinition {
            identity: type_identity,
            display_name: ctx.display_name.to_string(),
            kind: ctx.kind(),
            roles: ctx.roles.clone(),
            origin: Origin::Source(Locus::head(&source, ctx.path)),
            constraints: Vec::new(),
            extensions: Vec::new(),
            unknown_policy: UnknownPolicy::Reject,
            scalar: None,
            decimal: None,
            target: None,
            fields: None,
            variants: None,
            positions: Some(positions),
            relationships: None,
            operations: None,
            clauses: None,
            construct: ConstructMembers::default(),
        },
        aliases: Vec::new(),
        diagnostics: Vec::new(),
    })
}
