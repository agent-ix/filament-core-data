//! Answers the Filament semantic conformance corpus from Rust.
//!
//! The `rust-backend` slot of `conformance/adapters/registry.json` starts this
//! binary as a process; it is never imported. The harness sets the working
//! directory to `conformance/`, so every path this binary opens is resolved
//! from there and it reads nothing else — no network, no clock, no environment.
//!
//! It answers every case in the manifest exactly once, echoes each case's
//! `caseDigest` verbatim, buffers the whole array and writes it in one call, and
//! writes every diagnostic of its own to stderr. A panic is an adapter failure
//! the harness reports, never a truncated array it mis-parses.
#![forbid(unsafe_code)]

use std::fs;
use std::io::Write as _;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use agent_ix_semantic_ir::compat::{classify, Classification};
use agent_ix_semantic_ir::json::{parse, write_string, Json};
use agent_ix_semantic_ir::patch::apply;
use agent_ix_semantic_ir::{decide, ResultState};

/// The adapter id the registry declares.
const ADAPTER: &str = "rust-backend";

fn main() -> ExitCode {
    std::panic::set_hook(Box::new(|info| {
        let mut stderr = std::io::stderr();
        let _ = writeln!(stderr, "rust-backend: panicked: {info}");
        let _ = stderr.flush();
        std::process::exit(70);
    }));
    match run() {
        Ok(payload) => {
            let mut stdout = std::io::stdout();
            match stdout
                .write_all(payload.as_bytes())
                .and_then(|()| stdout.flush())
            {
                Ok(()) => ExitCode::SUCCESS,
                Err(error) => {
                    eprintln!("rust-backend: could not write the result array: {error}");
                    ExitCode::from(71)
                }
            }
        }
        Err(message) => {
            eprintln!("rust-backend: {message}");
            ExitCode::from(72)
        }
    }
}

/// Resolves a manifest path from the working directory the harness sets.
///
/// The manifest states every path from the repository root
/// (`conformance/cases/...`), and the harness starts this process in
/// `conformance/`, so the leading segment is the directory this process is
/// already in.
fn resolve(path: &str) -> PathBuf {
    match path.strip_prefix("conformance/") {
        Some(rest) => PathBuf::from(rest),
        None => PathBuf::from(path),
    }
}

fn read_json(path: &Path) -> Result<Json, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| format!("could not read {}: {error}", path.display()))?;
    parse(&text).map_err(|error| format!("could not read {}: {error}", path.display()))
}

fn run() -> Result<String, String> {
    let manifest = read_json(Path::new("corpus.json"))?;
    let bases = manifest
        .get("bases")
        .and_then(Json::as_array)
        .ok_or("the corpus manifest carries no base index")?;
    let cases = manifest
        .get("cases")
        .and_then(Json::as_array)
        .ok_or("the corpus manifest carries no case index")?;

    let mut loaded_bases: Vec<(String, Json)> = Vec::with_capacity(bases.len());
    for base in bases {
        let id = base
            .get("id")
            .and_then(Json::as_str)
            .ok_or("a base row names no id")?;
        let path = base
            .get("path")
            .and_then(Json::as_str)
            .ok_or("a base row names no path")?;
        loaded_bases.push((id.to_string(), read_json(&resolve(path))?));
    }
    let base_of = |id: &str| -> Result<&Json, String> {
        loaded_bases
            .iter()
            .find(|(known, _)| known == id)
            .map(|(_, bundle)| bundle)
            .ok_or_else(|| format!("the corpus names a base {id} the manifest does not index"))
    };

    let mut out = String::from("[");
    for (position, row) in cases.iter().enumerate() {
        let case_id = row
            .get("id")
            .and_then(Json::as_str)
            .ok_or("a case row names no id")?;
        let path = row
            .get("path")
            .and_then(Json::as_str)
            .ok_or("a case row names no path")?;
        let digest = row
            .get("digest")
            .and_then(Json::as_str)
            .ok_or("a case row carries no digest")?;
        let case = read_json(&resolve(path))?;

        let bundle = build(&case, "base", "ops", &base_of)?;
        let verdict = decide(&bundle);

        let classification = if case.has("beforeBase") || case.has("beforeOps") {
            let before = build(&case, "beforeBase", "beforeOps", &base_of)?;
            let before_verdict = decide(&before);
            Some(classify(
                &before,
                &bundle,
                before_verdict.result_state != ResultState::Invalid,
                verdict.result_state != ResultState::Invalid,
            ))
        } else {
            None
        };

        if position > 0 {
            out.push(',');
        }
        write_result(&mut out, case_id, digest, &verdict, classification);
    }
    out.push(']');
    Ok(out)
}

fn build<'a>(
    case: &Json,
    base_member: &str,
    ops_member: &str,
    base_of: &impl Fn(&str) -> Result<&'a Json, String>,
) -> Result<Json, String> {
    let base_id = case
        .get(base_member)
        .and_then(Json::as_str)
        .ok_or_else(|| format!("a case names no {base_member}"))?;
    let base = base_of(base_id)?;
    let empty: Vec<Json> = Vec::new();
    let ops = case
        .get(ops_member)
        .and_then(Json::as_array)
        .unwrap_or(&empty);
    apply(base, ops).map_err(|error| {
        format!(
            "the {ops_member} of a case did not apply: {}",
            error.message
        )
    })
}

fn write_result(
    out: &mut String,
    case_id: &str,
    digest: &str,
    verdict: &agent_ix_semantic_ir::Verdict,
    classification: Option<Classification>,
) {
    out.push_str("{\"adapter\":");
    write_string(out, ADAPTER);
    out.push_str(",\"adapterVersion\":");
    write_string(out, env!("CARGO_PKG_VERSION"));
    out.push_str(",\"caseId\":");
    write_string(out, case_id);
    out.push_str(",\"caseDigest\":");
    write_string(out, digest);
    // PROV-002's `unsupportedBy` licenses an `unsupported` answer and does not
    // require one: FR-057 answers the locus pattern exactly, so the licence goes
    // unused and every case is answered `supported`.
    out.push_str(",\"support\":\"supported\",\"resultState\":");
    write_string(out, verdict.result_state.as_str());
    out.push_str(",\"diagnostics\":[");
    for (position, diagnostic) in verdict.diagnostics.iter().enumerate() {
        if position > 0 {
            out.push(',');
        }
        diagnostic.write_json(out);
    }
    out.push(']');
    if let Some(classification) = classification {
        out.push_str(",\"classification\":");
        write_string(out, classification.as_str());
    }
    out.push_str(",\"normalized\":");
    write_string(out, &verdict.normalized);
    out.push('}');
}
