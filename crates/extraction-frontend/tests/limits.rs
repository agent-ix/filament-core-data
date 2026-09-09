//! NFR-031-AC-6: for each of the five `limits.json` limits, a bundle one
//! past it yields exactly one blocking `LIMIT_*` diagnostic at the
//! offending document, naming the value the file declares; a bundle at
//! the limit lifts. The bundles are constructed in a scratch directory
//! from the parsed file's values, never restated (the
//! `fixtures/negatives/LIMIT_*/constructed.json` stubs name this test).

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, WireCode};
use agent_ix_extraction_frontend::limits::{check_bundle, check_extraction, depth};
use agent_ix_extraction_frontend::{extract, lower_bundle, resolve, Bundle, Limit, Limits};
use ix_trace_rs::trace;
use serde_json::Value;

const VERSION: &str = "0.0.0";
const SOURCE: &str = "ix://agent-ix/limits/spec";

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn business_module() -> PathBuf {
    crate_dir().join("fixtures/modules/spec-objects-business")
}

fn write(root: &Path, rel: &str, text: &str) {
    let path = root.join(rel);
    fs::create_dir_all(path.parent().expect("parent")).expect("mkdir");
    fs::write(&path, text).unwrap_or_else(|e| panic!("write {}: {e}", path.display()));
}

fn spec_md() -> String {
    "---\ntype: master-requirements\nname: limits\norg: agent-ix\ntitle: Limits\n---\n# Limits\n"
        .to_string()
}

fn entity_md(id: &str, name: &str, rows: &[String], extra: &str) -> String {
    let mut s = format!(
        "---\nid: {id}\ntitle: {name}\nobject: entity\ntype: FR\n---\n\n# {id}: {name}\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|---|---|---|---|\n"
    );
    for row in rows {
        s.push_str(row);
        s.push('\n');
    }
    s.push_str(extra);
    s
}

/// The diagnostics of one lift of `root`: bundle, extraction, lowering.
fn lift(root: &Path, limits: &Limits) -> Vec<Diagnostic> {
    let bundle = Bundle::load(root, &[&business_module()]).unwrap_or_else(|r| panic!("{r}"));
    let extractions = extract(&bundle);
    let resolutions = resolve(&bundle, &extractions);
    lower_bundle(&bundle, &extractions, &resolutions, limits, VERSION).diagnostics
}

fn limit_codes(diagnostics: &[Diagnostic]) -> Vec<Code> {
    diagnostics
        .iter()
        .filter_map(|d| match d.code {
            WireCode::Registry(code) if code.name().starts_with("LIMIT_") => Some(code),
            _ => None,
        })
        .collect()
}

/// The one `LIMIT_*` diagnostic of a one-past bundle: blocking, naming the
/// file's value, at `locus`.
fn assert_one_breach(diagnostics: &[Diagnostic], limit: Limit, limits: &Limits, locus: Locus) {
    let codes = limit_codes(diagnostics);
    assert_eq!(
        codes,
        [limit.code()],
        "exactly one LIMIT_*: {diagnostics:?}"
    );
    let d = diagnostics
        .iter()
        .find(|d| d.code == WireCode::Registry(limit.code()))
        .expect("the breach");
    assert!(d.blocking);
    assert_eq!(d.locus, Some(locus));
    let value = limits.value(limit).to_string();
    assert!(
        d.message.contains(&format!("{} is {value}", limit.key())),
        "{}: names the file's value {value}",
        d.message
    );
}

/// A bundle of `count` documents besides `spec/spec.md`.
fn documents_bundle(root: &Path, count: usize) {
    write(root, "spec/spec.md", &spec_md());
    for i in 0..count {
        write(
            root,
            &format!("spec/notes/N-{i:05}.md"),
            &format!("---\nid: N-{i:05}\ntitle: Note {i}\n---\n# Note {i}\n"),
        );
    }
}

/// A bundle whose one entity document is exactly `bytes` long.
fn bytes_bundle(root: &Path, bytes: usize) {
    write(root, "spec/spec.md", &spec_md());
    let head = entity_md(
        "FR-001",
        "Big",
        &["| id | UUID | 1 | identity |".to_string()],
        "\n## Description\n\n",
    );
    assert!(bytes > head.len());
    let mut text = head;
    text.push_str(&"x".repeat(bytes - text.len() - 1));
    text.push('\n');
    assert_eq!(text.len(), bytes);
    write(root, "spec/functional/FR-001-big.md", &text);
}

/// A bundle whose one entity declares `count` fields.
fn fields_bundle(root: &Path, count: usize) {
    write(root, "spec/spec.md", &spec_md());
    let rows: Vec<String> = (0..count)
        .map(|i| format!("| f{i} | String | 1 | |"))
        .collect();
    write(
        root,
        "spec/functional/FR-001-wide.md",
        &entity_md("FR-001", "Wide", &rows, ""),
    );
}

/// A bundle whose one entity carries one `ocl` clause of `bytes` bytes.
fn clause_bundle(root: &Path, bytes: usize) {
    write(root, "spec/spec.md", &spec_md());
    let text = format!(
        "context Long inv big: {}",
        "a".repeat(bytes - "context Long inv big: ".len())
    );
    assert_eq!(text.len(), bytes);
    let extra = format!("\n## Invariants\n\n### big\n\n```ocl\n{text}\n```\n");
    write(
        root,
        "spec/functional/FR-001-long.md",
        &entity_md(
            "FR-001",
            "Long",
            &["| id | UUID | 1 | identity |".to_string()],
            &extra,
        ),
    );
}

/// A bundle whose one entity sits at a path of `segments` segments.
fn depth_bundle(root: &Path, segments: usize) -> String {
    write(root, "spec/spec.md", &spec_md());
    let dirs: Vec<String> = (0..segments - 1).map(|i| format!("d{i}")).collect();
    let rel = format!("{}/FR-001-deep.md", dirs.join("/"));
    assert_eq!(depth(&rel), segments);
    write(
        root,
        &rel,
        &entity_md(
            "FR-001",
            "Deep",
            &["| id | UUID | 1 | identity |".to_string()],
            "",
        ),
    );
    rel
}

#[trace("TC-1305", "NFR-031-AC-6")]
#[test]
fn tc_1305_each_limit_one_past_yields_one_blocking_limit_diagnostic_naming_the_file_value() {
    let started = Instant::now();
    let limits = Limits::declared().expect("limits.json parses");
    // The five keys, read from the file rather than the struct.
    let raw: Value =
        serde_json::from_str(&fs::read_to_string(crate_dir().join("limits.json")).expect("read"))
            .expect("json");
    for limit in Limit::ALL {
        assert_eq!(
            raw[limit.key()].as_u64().map(|v| v as usize),
            Some(limits.value(limit)),
            "{} is declared and parsed as declared",
            limit.key()
        );
    }
    assert_eq!(
        raw.as_object()
            .expect("object")
            .keys()
            .filter(|k| !k.starts_with('$'))
            .count(),
        Limit::ALL.len(),
        "exactly the five limits"
    );

    // maxDocuments: one past at spec/spec.md; at the limit lifts.
    let scratch = tempfile::tempdir().expect("tempdir");
    let over = scratch.path().join("documents-over");
    documents_bundle(&over, limits.max_documents);
    let diagnostics = lift(&over, &limits);
    assert_one_breach(
        &diagnostics,
        Limit::MaxDocuments,
        &limits,
        Locus::head(SOURCE, "spec/spec.md"),
    );
    let at = scratch.path().join("documents-at");
    documents_bundle(&at, limits.max_documents - 1);
    assert!(
        limit_codes(&lift(&at, &limits)).is_empty(),
        "at the limit lifts"
    );

    // maxDocumentBytes: one past at that document; at the limit lifts.
    let over = scratch.path().join("bytes-over");
    bytes_bundle(&over, limits.max_document_bytes + 1);
    assert_one_breach(
        &lift(&over, &limits),
        Limit::MaxDocumentBytes,
        &limits,
        Locus::head(SOURCE, "spec/functional/FR-001-big.md"),
    );
    let at = scratch.path().join("bytes-at");
    bytes_bundle(&at, limits.max_document_bytes);
    assert!(limit_codes(&lift(&at, &limits)).is_empty());

    // maxFieldsPerRecord: one past at that document; at the limit lifts.
    let over = scratch.path().join("fields-over");
    fields_bundle(&over, limits.max_fields_per_record + 1);
    let diagnostics = lift(&over, &limits);
    assert_one_breach(
        &diagnostics,
        Limit::MaxFieldsPerRecord,
        &limits,
        Locus::head(SOURCE, "spec/functional/FR-001-wide.md"),
    );
    assert!(
        diagnostics
            .iter()
            .all(|d| d.code != WireCode::Registry(Code::EngineDiagnostic)),
        "the engine read every row: {diagnostics:?}"
    );
    let at = scratch.path().join("fields-at");
    fields_bundle(&at, limits.max_fields_per_record);
    assert!(limit_codes(&lift(&at, &limits)).is_empty());

    // maxClauseBytes: one past at the fence; at the limit lifts.
    let over = scratch.path().join("clause-over");
    clause_bundle(&over, limits.max_clause_bytes + 1);
    let bundle = Bundle::load(&over, &[&business_module()]).expect("loads");
    let extractions = extract(&bundle);
    let extracted = &extractions.artifacts["FR-001"];
    let span = extracted
        .extraction
        .clauses
        .as_deref()
        .and_then(|c| c.first())
        .and_then(|c| c.source_span.clone())
        .expect("the engine located the clause");
    let expected = Locus::new(SOURCE, &span.path, span.start_line, span.start_column);
    assert_eq!(span.path, "spec/functional/FR-001-long.md");
    assert!(span.start_line >= 17, "the fence, not the head: {span:?}");
    assert_one_breach(
        &lift(&over, &limits),
        Limit::MaxClauseBytes,
        &limits,
        expected,
    );
    assert_eq!(
        check_extraction(extracted, SOURCE, &limits).len(),
        1,
        "the extraction check alone finds it"
    );
    let at = scratch.path().join("clause-at");
    clause_bundle(&at, limits.max_clause_bytes);
    assert!(limit_codes(&lift(&at, &limits)).is_empty());

    // maxDepth: one past at that document; at the limit lifts.
    let over = scratch.path().join("depth-over");
    let rel = depth_bundle(&over, limits.max_depth + 1);
    let bundle = Bundle::load(&over, &[&business_module()]).expect("loads");
    assert_eq!(check_bundle(&bundle, &limits).len(), 1);
    assert_one_breach(
        &lift(&over, &limits),
        Limit::MaxDepth,
        &limits,
        Locus::head(SOURCE, &rel),
    );
    let at = scratch.path().join("depth-at");
    depth_bundle(&at, limits.max_depth);
    assert!(limit_codes(&lift(&at, &limits)).is_empty());
    assert_eq!(depth("spec/spec.md"), 2);

    // The budget: every probe together, under 30 s of wall time. Resident
    // memory is not measured by this test (no dependency reads it); the
    // largest allocation above is one 4 MiB document.
    let elapsed = started.elapsed();
    assert!(
        elapsed < Duration::from_secs(30),
        "the limit probes took {elapsed:?}"
    );
}
