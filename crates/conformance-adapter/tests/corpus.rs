//! The corpus gates the Rust reader is measured on inside `cargo test`.
//!
//! These tests read `conformance/corpus.json`, `conformance/bases/` and
//! `conformance/cases/` — the corpus's own declarations — and nothing under
//! `conformance/oracle/`. The differential harness is the judge of agreement
//! with the oracle; these tests are the crate's own gate on the corpus's
//! authored expectations, so a regression fails here before it reaches there.

use std::fs;
use std::path::PathBuf;

use agent_ix_semantic_ir::compat::classify;
use agent_ix_semantic_ir::json::{to_document_string, Json};
use agent_ix_semantic_ir::patch::apply;
use agent_ix_semantic_ir::{decide, json::parse, ResultState};

fn repo(path: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(path)
}

fn read(path: &str) -> Json {
    let text = fs::read_to_string(repo(path))
        .unwrap_or_else(|error| panic!("{path} is readable: {error}"));
    parse(&text).unwrap_or_else(|error| panic!("{path} is a JSON document: {error}"))
}

struct Case {
    id: String,
    case: Json,
    bundle: Json,
    before: Option<Json>,
}

fn corpus() -> Vec<Case> {
    let manifest = read("conformance/corpus.json");
    let bases: Vec<(String, Json)> = manifest
        .get("bases")
        .and_then(Json::as_array)
        .unwrap_or(&[])
        .iter()
        .map(|base| {
            let id = base.get("id").and_then(Json::as_str).unwrap_or_default();
            let path = base.get("path").and_then(Json::as_str).unwrap_or_default();
            (id.to_string(), read(path))
        })
        .collect();
    let base_of = |id: &str| -> Json {
        bases
            .iter()
            .find(|(known, _)| known == id)
            .map(|(_, bundle)| bundle.clone())
            .unwrap_or_else(|| panic!("the manifest indexes the base {id}"))
    };
    let build = |case: &Json, base_member: &str, ops_member: &str| -> Json {
        let base = base_of(case.get(base_member).and_then(Json::as_str).unwrap_or(""));
        let empty: Vec<Json> = Vec::new();
        let ops = case
            .get(ops_member)
            .and_then(Json::as_array)
            .unwrap_or(&empty);
        apply(&base, ops).unwrap_or_else(|error| panic!("the patch applies: {}", error.message))
    };

    manifest
        .get("cases")
        .and_then(Json::as_array)
        .unwrap_or(&[])
        .iter()
        .map(|row| {
            let path = row.get("path").and_then(Json::as_str).unwrap_or_default();
            let case = read(path);
            let bundle = build(&case, "base", "ops");
            let before = if case.has("beforeBase") {
                Some(build(&case, "beforeBase", "beforeOps"))
            } else {
                None
            };
            Case {
                id: row
                    .get("id")
                    .and_then(Json::as_str)
                    .unwrap_or_default()
                    .to_string(),
                case,
                bundle,
                before,
            }
        })
        .collect()
}

/// TC-701, TC-704: every case's result state and ordered diagnostic list equal
/// the corpus's authored expectation, code, severity, owner, blocking, pointer
/// and locus alike.
#[test]
fn tc_701_every_case_matches_its_authored_expectation() {
    let cases = corpus();
    // fcd#179: 111 cases minus ENV-004, VER-001, VER-002 and VER-004 (sole
    // subject the 1.0.0/1.1.0 distinction the ticket deletes), minus PRES-002
    // (its premise — presence contradicting multiplicity's lower bound is
    // invalid — contradicts FR-106-CON-1 for contract 2.0.0).
    assert_eq!(cases.len(), 106, "the corpus declares 106 cases");
    let mut failures: Vec<String> = Vec::new();
    for case in &cases {
        let verdict = decide(&case.bundle);
        let expected = match case.case.get("expected") {
            Some(expected) => expected,
            None => continue,
        };
        let stated = expected
            .get("resultState")
            .and_then(Json::as_str)
            .unwrap_or("");
        if verdict.result_state.as_str() != stated {
            failures.push(format!(
                "{}: resultState {} is not {stated}",
                case.id,
                verdict.result_state.as_str()
            ));
        }
        let empty: Vec<Json> = Vec::new();
        let wanted = expected
            .get("diagnostics")
            .and_then(Json::as_array)
            .unwrap_or(&empty);
        if wanted.len() != verdict.diagnostics.len() {
            failures.push(format!(
                "{}: {} diagnostics, not {}",
                case.id,
                verdict.diagnostics.len(),
                wanted.len()
            ));
            continue;
        }
        for (want, got) in wanted.iter().zip(verdict.diagnostics.iter()) {
            let diagnostic = want.get("diagnostic").unwrap_or(&Json::Null);
            let field = |name: &str| {
                diagnostic
                    .get(name)
                    .and_then(Json::as_str)
                    .unwrap_or_default()
                    .to_string()
            };
            let locus = diagnostic.get("locus").map(to_document_string);
            let mine = got.locus.as_ref().map(to_document_string);
            if field("code") != got.code
                || field("severity") != got.severity.as_str()
                || field("owner") != got.owner
                || want.get("pointer").and_then(Json::as_str) != Some(got.pointer.as_str())
                || locus != mine
                || diagnostic.get("blocking").and_then(Json::as_bool) != Some(got.blocking)
            {
                failures.push(format!(
                    "{}: {} at {} owner {} locus {:?} is not the authored diagnostic",
                    case.id, got.code, got.pointer, got.owner, mine
                ));
            }
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

/// TC-702: the classification of every compatibility case equals the corpus's.
#[test]
fn tc_702_every_compatibility_case_classifies_as_authored() {
    let mut seen = 0usize;
    let mut failures: Vec<String> = Vec::new();
    for case in corpus() {
        let before = match &case.before {
            Some(before) => before,
            None => continue,
        };
        seen += 1;
        let stated = case
            .case
            .get("expected")
            .and_then(|expected| expected.get("classification"))
            .and_then(Json::as_str)
            .unwrap_or("");
        let mine = classify(
            before,
            &case.bundle,
            decide(before).result_state != ResultState::Invalid,
            decide(&case.bundle).result_state != ResultState::Invalid,
        );
        if mine.as_str() != stated {
            failures.push(format!(
                "{}: classified {} and not {stated}",
                case.id,
                mine.as_str()
            ));
        }
    }
    // fcd#179: VER-004 ("moving a document from 1.0.0 to 1.1.0 is
    // conditional") is removed with the contract it tested.
    assert_eq!(seen, 24, "the corpus declares 24 compatibility cases");
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

/// TC-700: every case carries a `normalized` string and the form is stable
/// across two runs.
///
/// fcd#179: this test previously also asserted that a `1.0.0` document's
/// `normalized` form gained no member over its raw canonical JSON. `2.0.0`
/// is now the only contract, and every `2.0.0` document materializes members
/// (e.g. independently authored `presence`) that a bare canonicalization of
/// the input does not carry, so that assertion's premise no longer holds for
/// any case the corpus can produce. Deleted rather than ported.
#[test]
fn tc_700_normalized_is_produced_for_every_case_and_is_stable() {
    for case in corpus() {
        let first = decide(&case.bundle).normalized;
        let second = decide(&case.bundle).normalized;
        assert_eq!(
            first, second,
            "{}: normalized is a function of the input",
            case.id
        );
        assert!(!first.is_empty(), "{}: normalized is produced", case.id);
    }
}

/// TC-708: the reader returns a diagnostic and does not panic over a declared
/// mutation budget, run under a panic hook that fails the test.
#[test]
fn tc_708_no_mutation_panics_the_reader() {
    // fcd#179: minimal-1-0 is retired with contract 1.0.0/1.1.0; the other
    // three bases are replaced by their 2.0.0-valid successors.
    let seeds: Vec<String> = ["core-2-0", "minimal-2-0", "package-2-0"]
        .iter()
        .map(|id| {
            fs::read_to_string(repo(&format!("conformance/bases/{id}.json")))
                .unwrap_or_else(|error| panic!("the base {id} is readable: {error}"))
        })
        .collect();

    let mut state: u64 = 0x5EED_0021_2026_0904;
    let mut next = move || {
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state.wrapping_mul(0x2545_F491_4F6C_DD1D)
    };

    let mut decided = 0usize;
    for round in 0..4096usize {
        let seed = &seeds[round % seeds.len()];
        let bytes = seed.as_bytes();
        let mut mutated: Vec<u8> = bytes.to_vec();
        match (next() % 4) as u8 {
            0 => {
                let at = (next() as usize) % mutated.len();
                mutated.truncate(at);
            }
            1 => {
                let at = (next() as usize) % mutated.len();
                mutated[at] = (next() % 128) as u8;
            }
            2 => {
                let at = (next() as usize) % mutated.len();
                let len = ((next() as usize) % 32).min(mutated.len() - at);
                mutated.drain(at..at + len);
            }
            _ => {
                let at = (next() as usize) % mutated.len();
                let noise = b"{}[],:\"0-e\\ntruefalsnull";
                mutated.insert(at, noise[(next() as usize) % noise.len()]);
            }
        }
        let text = String::from_utf8_lossy(&mutated).into_owned();
        match parse(&text) {
            Ok(document) => {
                let verdict = decide(&document);
                let _ = verdict.normalized.len();
                decided += 1;
            }
            Err(error) => {
                assert!(
                    !error.message.is_empty(),
                    "a reader error says what went wrong"
                );
            }
        }
    }
    assert!(
        decided > 0,
        "at least one mutation stayed a JSON document and reached the reader"
    );
}

/// FR-059-CON-5 and the no-panic surface: the crate carries no `unsafe`, and no
/// `unwrap`, `expect`, `panic!`, `todo!` or `unreachable!` outside its tests.
#[test]
fn tc_704_the_reader_surface_carries_no_panicking_construct() {
    let directory = repo("crates/semantic-ir/src");
    let mut offences: Vec<String> = Vec::new();
    let entries = fs::read_dir(&directory).unwrap_or_else(|error| {
        panic!("the reader's source directory is readable: {error}");
    });
    let mut files = 0usize;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("rs") {
            continue;
        }
        files += 1;
        let source = fs::read_to_string(&path).unwrap_or_default();
        let surface = match source.find("#[cfg(test)]") {
            Some(at) => &source[..at],
            None => &source[..],
        };
        for (number, line) in surface.lines().enumerate() {
            let trimmed = line.trim_start();
            if trimmed.starts_with("//") || trimmed.starts_with("///") {
                continue;
            }
            for construct in [
                ".unwrap()",
                ".expect(",
                "panic!(",
                "todo!(",
                "unreachable!(",
            ] {
                if line.contains(construct) {
                    offences.push(format!("{}:{}: {construct}", path.display(), number + 1));
                }
            }
            if line.contains("unsafe ") && !line.contains("forbid(unsafe_code)") {
                offences.push(format!("{}:{}: unsafe", path.display(), number + 1));
            }
        }
    }
    assert!(files >= 8, "every reader module is scanned");
    assert!(offences.is_empty(), "{}", offences.join("\n"));
}
