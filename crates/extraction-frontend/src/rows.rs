//! The source row of each `FieldDecl` the engine returned.
//!
//! `SemanticExtraction.fields` carries no locus per field: the engine keeps
//! the row lines it read privately (quire-rs `properties::extract_fields`,
//! `field_lines`). A frontend diagnostic about one row (FR-092 "Diagnostics")
//! and a field's `origin.source` (FR-093 "Fields") both need that row, so
//! this module re-reads the rows through the engine's own scanner and row
//! readers — `quire_rs::semantic::scan` and `properties::{table_rows,
//! fence_rows}`, the functions `extract_fields` itself calls — and never a
//! parser of its own. The block choice mirrors `extract_fields`: the first
//! `Properties` section, its first table or `sysml` fence; [`operation_rows`]
//! mirrors `extract_operations` the same way (FR-094 "Operations").
//!
//! When `fields` is `Some`, every row mapped (one erroring row makes the
//! whole kind unavailable), so `fields[i]` is `rows[i]`; the name is checked
//! all the same and a mismatch falls back to a search by name.
//!
//! Column: the column where the declaration text begins. A table row is
//! located at column 3, the first cell's text after `| ` (FR-093 "Fields",
//! FR-096-AC-6); a fence line at its first non-blank character, so that a
//! fence authored with the same two-column lead-in as a table row locates
//! its rows at the same column (FR-093-AC-1: the two forms of one
//! declaration lower to identical bytes).
//!
//! Operations: the operation set is the engine's `OperationDecl` list;
//! [`operation_rows`] only locates each returned name (SR-169 FND-1492).

use quire_rs::semantic::properties::{fence_rows, is_param_header, table_rows};
use quire_rs::semantic::scan::{blocks_in, level2_sections, lines, lines_outside_fences, Block};
use quire_rs::semantic::OperationDecl;

/// The level-2 heading the engine reads field declarations under
/// (quire-rs FR-070). Named here only to find the block again.
const PROPERTIES_SECTION: &str = "Properties";
/// The fence language of the SysML form.
const SYSML: &str = "sysml";
/// Column of a table row's first cell text.
const TABLE_ROW_COLUMN: usize = 3;

/// The line and column one declaration row sits at.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RowLocus {
    /// The field name the row declares.
    pub name: String,
    pub line: usize,
    pub column: usize,
}

/// The declaration rows of `raw`, in document order, or empty when the
/// document declares none the way the engine reads them.
pub fn field_rows(raw: &str) -> Vec<RowLocus> {
    let lines = lines(raw);
    let Some(&(start, end)) = level2_sections(&lines, PROPERTIES_SECTION).first() else {
        return Vec::new();
    };
    let block = blocks_in(&lines, start + 1, end)
        .into_iter()
        .find(|block| match block {
            Block::Table(_) => true,
            Block::Fence(fence) => fence.language == SYSML,
            Block::List { .. } => false,
        });
    match block {
        Some(Block::Table(table)) => table_rows(&table)
            .into_iter()
            .map(|row| RowLocus {
                name: row.name,
                line: row.line,
                column: TABLE_ROW_COLUMN,
            })
            .collect(),
        Some(Block::Fence(fence)) => {
            let body: Vec<&str> = fence.body.split('\n').collect();
            fence_rows(&fence, &mut Vec::new())
                .into_iter()
                .map(|row| RowLocus {
                    name: row.name,
                    line: row.line,
                    column: body
                        .get(row.line.saturating_sub(fence.open_line + 1))
                        .map_or(1, |raw| text_column(raw)),
                })
                .collect()
        }
        Some(Block::List { .. }) | None => Vec::new(),
    }
}

/// The 1-based column of the first non-blank character of `raw`.
fn text_column(raw: &str) -> usize {
    raw.chars().take_while(|c| c.is_whitespace()).count() + 1
}

/// The row of the `index`-th field named `name`: positional when the
/// names agree, else the first row of that name.
pub fn locate<'a>(rows: &'a [RowLocus], index: usize, name: &str) -> Option<&'a RowLocus> {
    match rows.get(index) {
        Some(row) if row.name == name => Some(row),
        _ => rows.iter().find(|row| row.name == name),
    }
}

/// The level-2 heading the engine reads operations under (quire-rs
/// FR-071). Named here only to find the block again.
const OPERATIONS_SECTION: &str = "Operations";
/// The level-3 heading prefix of one operation, as the engine reads it.
/// Used only to locate a heading whose name the engine already returned
/// (see [`operation_rows`]); never to decide what an operation is.
const OPERATION_HEADING: &str = "### ";
/// The key of the `Returns:` line, as the engine reads it. Used only to
/// locate the line of a `returns` the engine already returned.
const RETURNS_KEY: &str = "Returns:";

/// Where one `OperationDecl` sits: its `### <name>` heading, the rows of
/// its parameter table, and its `Returns:` line (FR-094 "Operations").
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperationLocus {
    /// The operation name the heading declares.
    pub name: String,
    /// The heading line; the operation's origin, column 1.
    pub line: usize,
    /// The parameter rows, in table order, each at column 3.
    pub params: Vec<RowLocus>,
    /// The `Returns:` line and the column its text begins at.
    pub returns: Option<(usize, usize)>,
}

/// The loci of `decls`, the operations the engine's `extract_operations`
/// returned for `raw`, in the engine's order.
///
/// The operation *set* is the engine's: nothing here decides what an
/// operation is, and a heading the engine did not return as an
/// `OperationDecl` yields no locus (SR-169 FND-1492). The engine keeps its
/// level-3 heading walk private (`clauses::level3_headings`) and its
/// `scan::Block` has no heading variant, so the *locus* of each returned
/// name is found here by the minimal match the engine itself applies —
/// a line outside any fence, in the first `Operations` section, reading
/// `### <name>` — and the `Returns:` line by the key the engine reads, both
/// through `scan::{level2_sections, lines_outside_fences}`; the parameter
/// rows come from `scan::blocks_in` and `properties::table_rows`, the
/// engine's own readers. A declaration whose heading this match does not
/// find is located at the document head by the callers, never dropped.
pub fn operation_rows(raw: &str, decls: &[OperationDecl]) -> Vec<OperationLocus> {
    let lines = lines(raw);
    let Some(&(start, end)) = level2_sections(&lines, OPERATIONS_SECTION).first() else {
        return Vec::new();
    };
    let outside: Vec<usize> = lines_outside_fences(&lines, start + 1, end);
    let heading_text = |l: usize| -> Option<&str> {
        lines
            .get(l - 1)
            .map(|text| text.trim_end_matches('\r'))
            .and_then(|text| text.strip_prefix(OPERATION_HEADING))
            .map(str::trim)
    };
    // Every level-3 heading line, so a located operation's section ends at
    // the next heading whatever the engine made of that heading.
    let heading_lines: Vec<usize> = outside
        .iter()
        .copied()
        .filter(|&l| heading_text(l).is_some())
        .collect();
    decls
        .iter()
        .filter_map(|decl| {
            let line = heading_lines
                .iter()
                .copied()
                .find(|&l| heading_text(l) == Some(decl.name.as_str()))?;
            let section_end = heading_lines
                .iter()
                .copied()
                .find(|&l| l > line)
                .unwrap_or(end);
            let params = blocks_in(&lines, line + 1, section_end)
                .into_iter()
                .find_map(|block| match block {
                    Block::Table(table) if is_param_header(&table.headers) => Some(table),
                    _ => None,
                })
                .map(|table| {
                    table_rows(&table)
                        .into_iter()
                        .map(|row| RowLocus {
                            name: row.name,
                            line: row.line,
                            column: TABLE_ROW_COLUMN,
                        })
                        .collect()
                })
                .unwrap_or_default();
            let returns = decl.returns.as_ref().and_then(|_| {
                outside
                    .iter()
                    .copied()
                    .filter(|&l| l > line && l < section_end)
                    .find(|&l| {
                        lines.get(l - 1).is_some_and(|text| {
                            text.trim_end_matches('\r').trim().starts_with(RETURNS_KEY)
                        })
                    })
                    .map(|l| (l, lines.get(l - 1).map_or(1, |raw| text_column(raw))))
            });
            Some(OperationLocus {
                name: decl.name.clone(),
                line,
                params,
                returns,
            })
        })
        .collect()
}
