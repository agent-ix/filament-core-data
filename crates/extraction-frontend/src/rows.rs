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
//! `Properties` section, its first table or `sysml` fence.
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

use quire_rs::semantic::properties::{fence_rows, table_rows};
use quire_rs::semantic::scan::{blocks_in, level2_sections, lines, Block};

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
