//! FR-096-AC-13: the published diagnostic registry page,
//! `docs/semantic-data-system/extraction-frontend-diagnostics.md`, is the
//! bytes of `render_registry_doc()` and nothing else. The page is also
//! NFR-032's closing sentinel: the commit that adds it is the last commit
//! of this change's range, so the generator and the page land together.

use std::fs;
use std::path::{Path, PathBuf};

use agent_ix_extraction_frontend::diagnostics::{render_registry_doc, Code, OWNER};
use ix_trace_rs::trace;

const PAGE: &str = "docs/semantic-data-system/extraction-frontend-diagnostics.md";

fn workspace_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("crate sits two levels below the workspace root")
        .to_path_buf()
}

#[trace("TC-1271", "FR-096-AC-13")]
#[test]
fn tc_1271_the_docs_page_lists_every_code_with_severity_blocking_and_owner_and_regenerates_byte_for_byte(
) {
    let path = workspace_dir().join(PAGE);
    let committed = fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("{PAGE} is absent ({e}): the closing sentinel is not written"));
    let rendered = render_registry_doc();
    assert_eq!(
        committed, rendered,
        "{PAGE} is not the generator's output; regenerate it from the enum"
    );

    // Every code, with a severity and a blocking cell, under the one owner.
    let header = "| Code | Severity | Blocking | Raised when |";
    assert!(committed.contains(header));
    for code in Code::ALL {
        let row = committed
            .lines()
            .find(|l| l.starts_with(&format!("| `{code}` |")))
            .unwrap_or_else(|| panic!("{code} has no row"));
        let cells: Vec<&str> = row.split('|').map(str::trim).collect();
        assert!(cells.len() >= 5, "{row}");
        assert!(!cells[2].is_empty(), "{code}: empty severity");
        assert!(!cells[3].is_empty(), "{code}: empty blocking");
    }
    let rows = committed
        .lines()
        .filter(|l| l.starts_with("| `agent-ix.extraction-frontend."))
        .count();
    assert_eq!(rows, Code::ALL.len(), "one row per code, no extra row");
    assert!(committed.contains(&format!("Owner of every code: `{OWNER}`.")));
    assert!(committed.starts_with("---\nid: "));
    assert!(committed.contains("Do not edit by hand."));
}
