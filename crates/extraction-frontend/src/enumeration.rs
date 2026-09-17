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

use std::fmt;

use quire_rs::extract::locator::{eval_locator, LocatorPrimitive};
use quire_rs::semantic::scan::{blocks_in, level2_sections, lines, Block};
use quire_rs::{evaluate_assert, table_from_section};

use crate::bundle::{Document, ObjectType};
use crate::constructs::ConstructMembers;
use crate::diagnostics::{Code, Diagnostic, Locus};
use crate::lower::{
    ArtifactContext, LowerError, Lowering, Origin, TypeDefinition, UnknownPolicy, Variant,
};

/// The `match:` key of the enumeration's row locator.
pub const VALUES_TABLE: &str = "values";
/// The column whose cell names the variant.
pub const VALUE_COLUMN: &str = "Value";
/// Column of a table row's first cell text.
const TABLE_ROW_COLUMN: usize = 3;

/// One row the evaluator returned, located.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValueRow {
    /// The `Value` cell, verbatim.
    pub value: String,
    pub line: usize,
    pub column: usize,
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
    let scanned = row_lines(document.raw(), &section);
    if scanned.len() != values.len() {
        return Err(Unsatisfied::Unlocated {
            evaluated: values.len(),
            scanned: scanned.len(),
        });
    }
    Ok(values
        .iter()
        .zip(scanned)
        .map(|(row, line)| ValueRow {
            value: row
                .as_str()
                .and_then(|s| s.split('\t').nth(index))
                .unwrap_or_default()
                .to_string(),
            line,
            column: TABLE_ROW_COLUMN,
        })
        .collect())
}

/// The line of each data row of the first table under `## <section>`,
/// through the engine's scanner.
fn row_lines(raw: &str, section: &str) -> Vec<usize> {
    let lines = lines(raw);
    let Some(&(start, end)) = level2_sections(&lines, section).first() else {
        return Vec::new();
    };
    blocks_in(&lines, start + 1, end)
        .into_iter()
        .find_map(|block| match block {
            Block::Table(table) => Some(table.rows.into_iter().map(|(line, _)| line).collect()),
            Block::Fence(_) | Block::List { .. } => None,
        })
        .unwrap_or_default()
}

/// Lower the evaluator's rows to one `enum` definition: `name` the `Value`
/// cell verbatim, `identity` `variant/<enum-slug>-<value-slug>`, origin
/// at the row's line and column 3; `DUPLICATE_TYPE_NAME` at the second of
/// two rows that slug alike.
pub fn lower_enum(rows: &[ValueRow], ctx: &ArtifactContext<'_>) -> Result<Lowering, LowerError> {
    let type_identity = ctx.type_identity()?;
    let source = ctx.package.source();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    let mut blocked = false;
    let mut seen: std::collections::BTreeMap<String, (String, Locus)> =
        std::collections::BTreeMap::new();
    let mut variants = Vec::with_capacity(rows.len());
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
        variants.push(Variant {
            identity,
            name: row.value.clone(),
            origin: Origin::Source(locus),
        });
    }
    if blocked {
        return Err(LowerError::Blocked(diagnostics));
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
            target: None,
            fields: None,
            variants: Some(variants),
            relationships: None,
            operations: None,
            clauses: None,
            construct: ConstructMembers::default(),
        },
        aliases: Vec::new(),
        diagnostics,
    })
}
