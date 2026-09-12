//! FR-096: the closed diagnostic registry, its severity and blocking table,
//! the engine and reader wrappers, the locus rule, the order, and the
//! generated registry page.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::diagnostics::{
    is_blocked, message_with_token, render_registry_doc, sort_diagnostics, token, Code, Diagnostic,
    Disposition, Locus, NotLoweredReason, Severity, WireCode, ELLIPSIS, MESSAGE_LIMIT, OWNER,
    TOKEN_LIMIT,
};
use agent_ix_extraction_frontend::{extract, Bundle};
use agent_ix_semantic_ir::json::parse;
use ix_trace_rs::trace;
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use quire_rs::semantic::{SemanticDiagnostic, SemanticSeverity};
use serde_json::Value;

use crate::common::{common_schema, crate_dir, diagnostic_schema_violations};

const SOURCE: &str = "ix://agent-ix/config-service/spec";
const DOC: &str = "spec/functional/FR-006-config-version-entity.md";

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

fn load_ok(bundle: &str) -> Bundle {
    Bundle::load(&fixture(bundle), &[&business_module()])
        .unwrap_or_else(|r| panic!("{bundle} refused: {r}"))
}

fn violations(diagnostic: &Diagnostic) -> Vec<String> {
    let value = serde_json::to_value(diagnostic).expect("json");
    diagnostic_schema_violations(&value, &common_schema(), "")
}

fn engine(
    code: &str,
    severity: SemanticSeverity,
    line: Option<usize>,
    reason: Option<&str>,
) -> SemanticDiagnostic {
    SemanticDiagnostic {
        code: code.to_string(),
        severity,
        message: "type \"Sting\" resolves to nothing".to_string(),
        line,
        column: Some(3),
        reason: reason.map(str::to_string),
    }
}

#[trace("TC-1259", "FR-096-AC-1")]
#[test]
fn tc_1259_every_variant_serialises_to_the_published_pattern_and_validates_with_and_without_locus()
{
    let mut seen = std::collections::BTreeSet::new();
    for code in Code::ALL {
        let wire = code.to_string();
        assert_eq!(
            wire,
            format!("agent-ix.extraction-frontend.{}", code.name())
        );
        assert!(seen.insert(wire.clone()), "{wire} spelled twice");
        let located = Diagnostic::frontend(
            code,
            format!("{} raised", code.name()),
            Some(Locus::new(SOURCE, DOC, 14, 3)),
        );
        assert_eq!(
            violations(&located),
            Vec::<String>::new(),
            "{wire} with locus"
        );
        let free = Diagnostic::frontend(code, format!("{} raised", code.name()), None);
        assert_eq!(
            violations(&free),
            Vec::<String>::new(),
            "{wire} without locus"
        );
        let value = serde_json::to_value(&free).expect("json");
        assert!(value.get("locus").is_none(), "{wire}: no fabricated locus");
        assert_eq!(value["code"], Value::String(wire));
        assert_eq!(value["owner"], Value::String(OWNER.to_string()));
    }
    assert_eq!(
        seen.len(),
        27,
        "the registry is exactly the 27 codes of FR-096"
    );
}

#[trace("TC-1260", "FR-096-AC-2")]
#[trace("TC-1260", "FR-096-CON-1")]
#[test]
fn tc_1260_the_severity_and_blocking_table_holds_variant_by_variant() {
    let frontend = Disposition::Frontend;
    for code in Code::ALL {
        let (severity, blocking) = match code {
            Code::DeclaredLoss => (Severity::Info, false),
            Code::KernelNameShadowed => (Severity::Warning, false),
            _ => (Severity::Error, true),
        };
        assert_eq!(code.severity(frontend), severity, "{code}");
        assert_eq!(code.blocking(frontend), blocking, "{code}");
        // The disposition of the two data-dependent codes never leaks into
        // any other code (FR-096-CON-1).
        if code != Code::EngineDiagnostic && code != Code::ArtifactNotLowered {
            for disposition in [
                Disposition::Engine(SemanticSeverity::Advisory),
                Disposition::NotLowered(NotLoweredReason::LegacyForm),
            ] {
                assert_eq!(code.severity(disposition), severity, "{code}");
                assert_eq!(code.blocking(disposition), blocking, "{code}");
            }
        }
    }
    // The five named error-blocking codes and the one warning.
    for code in [
        Code::InvalidIr,
        Code::DuplicateConstraint,
        Code::ConstraintNotApplicable,
        Code::ImportUnsupported,
        Code::DuplicateArtifactId,
    ] {
        assert_eq!(code.severity(frontend), Severity::Error);
        assert!(code.blocking(frontend));
    }
    assert_eq!(
        Code::KernelNameShadowed.severity(frontend),
        Severity::Warning
    );
    assert!(!Code::KernelNameShadowed.blocking(frontend));

    // `ARTIFACT_NOT_LOWERED` by reason.
    let legacy = Disposition::NotLowered(NotLoweredReason::from_engine("legacy-form"));
    assert_eq!(Code::ArtifactNotLowered.severity(legacy), Severity::Warning);
    assert!(!Code::ArtifactNotLowered.blocking(legacy));
    for reason in ["ambiguous", "no-bundle-index", "", "Legacy-Form"] {
        let other = Disposition::NotLowered(NotLoweredReason::from_engine(reason));
        assert_eq!(
            Code::ArtifactNotLowered.severity(other),
            Severity::Error,
            "{reason:?}"
        );
        assert!(Code::ArtifactNotLowered.blocking(other), "{reason:?}");
    }
    let d = Diagnostic::with_disposition(Code::ArtifactNotLowered, legacy, "not lowered", None);
    assert_eq!((d.severity, d.blocking), (Severity::Warning, false));

    // `ENGINE_DIAGNOSTIC` by mapped severity.
    for (engine, severity, blocking) in [
        (SemanticSeverity::Advisory, Severity::Info, false),
        (SemanticSeverity::Warning, Severity::Warning, false),
        (SemanticSeverity::Error, Severity::Error, true),
    ] {
        let disposition = Disposition::Engine(engine);
        assert_eq!(Code::EngineDiagnostic.severity(disposition), severity);
        assert_eq!(Code::EngineDiagnostic.blocking(disposition), blocking);
    }
}

/// The FR-096-AC-3 gate over one source tree: every string literal that
/// spells a registry, compiler, or reader code, as `<file>: <literal>`.
fn literal_gate(src: &Path) -> Vec<String> {
    let mut files = Vec::new();
    collect_rs(src, &mut files);
    files.sort();
    let mut violations = Vec::new();
    for file in &files {
        let name = file
            .strip_prefix(src)
            .expect("under src")
            .to_string_lossy()
            .to_string();
        let text = fs::read_to_string(file).expect("read");
        for prefix in [
            "agent-ix.extraction-frontend.",
            "agent-ix.compiler.",
            "agent-ix.semantic-ir.",
        ] {
            let literal = format!("\"{prefix}");
            if text.contains(&literal) {
                violations.push(format!("{name}: {literal}"));
            }
        }
    }
    violations
}

fn collect_rs(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(dir).expect("dir") {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            collect_rs(&path, out);
        } else if path.extension().is_some_and(|e| e == "rs") {
            out.push(path);
        }
    }
}

#[trace("TC-1261", "FR-096-AC-3")]
#[test]
fn tc_1261_no_code_is_spelled_as_a_string_literal_under_src_and_a_planted_one_fails() {
    let src = crate_dir().join("src");
    let violations = literal_gate(&src);
    assert!(violations.is_empty(), "{}", violations.join("\n"));
    // The enum's Display is the only spelling, and it is the published one.
    assert_eq!(
        Code::UnresolvedTypeToken.to_string(),
        "agent-ix.extraction-frontend.UNRESOLVED_TYPE_TOKEN"
    );

    // The control: the same tree plus one planted literal in `lower.rs`.
    let scratch = tempfile::tempdir().expect("tempdir");
    let mut files = Vec::new();
    collect_rs(&src, &mut files);
    for file in &files {
        let target = scratch
            .path()
            .join(file.strip_prefix(&src).expect("under src"));
        fs::create_dir_all(target.parent().expect("parent")).expect("mkdir");
        fs::copy(file, &target).expect("copy");
    }
    fs::write(
        scratch.path().join("lower.rs"),
        "pub const PLANTED: &str = \"agent-ix.extraction-frontend.UNRESOLVED_TYPE_TOKEN\";\n",
    )
    .expect("plant");
    let violations = literal_gate(scratch.path());
    assert_eq!(
        violations,
        ["lower.rs: \"agent-ix.extraction-frontend."],
        "the planted literal is the one violation"
    );
}

#[trace("TC-1262", "FR-096-AC-4")]
#[test]
fn tc_1262_the_legacy_fixture_yields_one_engine_diagnostic_warning_at_line_17() {
    let out = extract(&load_ok("legacy"));
    let wrapped: Vec<&Diagnostic> = out
        .diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(Code::EngineDiagnostic))
        .collect();
    assert_eq!(wrapped.len(), 1, "{:?}", out.diagnostics);
    let d = wrapped[0];
    assert_eq!(d.severity, Severity::Warning);
    assert!(!d.blocking);
    assert!(
        d.message
            .starts_with("semantic.legacy-properties-form (reason: "),
        "{}",
        d.message
    );
    let engine = &out.artifacts["FR-006"].extraction.diagnostics[0];
    assert_eq!(engine.code, "semantic.legacy-properties-form");
    let reason = engine.reason.as_deref().expect("the engine names a reason");
    assert!(
        d.message.starts_with(&format!(
            "semantic.legacy-properties-form (reason: {reason}): "
        )),
        "{}",
        d.message
    );
    assert!(
        d.message.ends_with(&format!("): {}", engine.message)),
        "the engine message follows `): `: {}",
        d.message
    );
    assert!(d.causes.is_empty(), "{:?}", d.causes);
    let locus = d.locus.as_ref().expect("locus");
    assert_eq!((locus.start_line, locus.start_column), (17, 1));
    assert_eq!(locus.path, DOC);
    assert_eq!(locus.source_identity, SOURCE);
    assert_eq!(violations(d), Vec::<String>::new());
}

#[trace("TC-1263", "FR-096-AC-5")]
#[test]
fn tc_1263_engine_advisory_maps_to_info_and_engine_error_to_blocking_error() {
    let advisory = Diagnostic::engine(
        &engine(
            "semantic.unresolved-type",
            SemanticSeverity::Advisory,
            Some(14),
            Some("unknown-token"),
        ),
        SOURCE,
        DOC,
    );
    assert_eq!(advisory.severity, Severity::Info);
    assert!(!advisory.blocking);
    assert_eq!(
        advisory.code.to_string(),
        "agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC"
    );
    assert_eq!(
        advisory.message,
        "semantic.unresolved-type (reason: unknown-token): type \"Sting\" resolves to nothing"
    );

    let error = Diagnostic::engine(
        &engine(
            "semantic.ambiguous-type",
            SemanticSeverity::Error,
            Some(14),
            None,
        ),
        SOURCE,
        DOC,
    );
    assert_eq!(error.severity, Severity::Error);
    assert!(error.blocking);
    assert_eq!(
        error.code.to_string(),
        "agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC"
    );
    assert_eq!(
        error.message, "semantic.ambiguous-type: type \"Sting\" resolves to nothing",
        "no reason clause when the engine gave no reason"
    );
    for d in [&advisory, &error] {
        assert!(d.causes.is_empty());
        let locus = d.locus.as_ref().expect("locus");
        assert_eq!((locus.start_line, locus.start_column), (14, 3));
        assert_eq!(violations(d), Vec::<String>::new());
    }
    assert!(is_blocked(&[advisory.clone(), error.clone()]));
    assert!(!is_blocked(&[advisory]));
}

#[trace("TC-1265", "FR-096-AC-7")]
#[test]
fn tc_1265_a_refused_module_yields_module_refused_at_the_manifest_line_1_column_1() {
    let root = fixture("negatives/MODULE_REFUSED");
    let refusal =
        Bundle::load(&root, &[&root.join("modules/spec-objects-business")]).expect_err("refused");
    let d = &refusal.diagnostic;
    assert_eq!(d.code, WireCode::Registry(Code::ModuleRefused));
    assert_eq!((d.severity, d.blocking), (Severity::Error, true));
    let locus = d.locus.as_ref().expect("manifest locus");
    assert_eq!(locus.path, "spec-objects-business/manifest.yaml");
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
    assert_eq!(locus.source_identity, SOURCE);
    assert!(d.causes.is_empty());
    assert_eq!(violations(d), Vec::<String>::new());
}

/// One arbitrary diagnostic: registry code, message over a code-point-rich
/// alphabet, and an optional locus.
fn any_diagnostic() -> impl Strategy<Value = Diagnostic> {
    let code = (0..Code::ALL.len()).prop_map(|i| Code::ALL[i]);
    let message = "[a-zA-Z0-9 éß_-]{1,12}";
    let locus = proptest::option::of((
        "[a-z]{1,4}(/[a-zA-Z0-9-]{1,6})?\\.md",
        1usize..40,
        1usize..12,
    ));
    (code, message, locus).prop_map(|(code, message, locus)| {
        Diagnostic::frontend(
            code,
            message,
            locus.map(|(path, line, column)| Locus::new(SOURCE, &path, line, column)),
        )
    })
}

fn sorted(list: &[Diagnostic]) -> Vec<Diagnostic> {
    let mut out = list.to_vec();
    sort_diagnostics(&mut out);
    out
}

fn assert_ordered(list: &[Diagnostic]) -> Result<(), TestCaseError> {
    let first_located = list.iter().position(|d| d.locus.is_some());
    if let Some(i) = first_located {
        prop_assert!(
            list[i..].iter().all(|d| d.locus.is_some()),
            "every locus-free diagnostic comes first"
        );
    }
    for pair in list.windows(2) {
        let key = |d: &Diagnostic| {
            (
                d.locus
                    .as_ref()
                    .map(|l| (l.path.clone(), l.start_line, l.start_column)),
                d.code.to_string(),
                d.message.clone(),
            )
        };
        prop_assert!(
            key(&pair[0]) <= key(&pair[1]),
            "{:?} > {:?}",
            pair[0],
            pair[1]
        );
    }
    Ok(())
}

#[trace("TC-1266", "FR-096-AC-8")]
#[test]
fn tc_1266_sort_diagnostics_is_order_and_locale_independent_with_locus_free_first() {
    let mut runner = TestRunner::new(Config::with_cases(512));
    let saved = std::env::var_os("LC_ALL");
    let result = runner.run(
        &proptest::collection::vec(any_diagnostic(), 0..12),
        |list| {
            let mut reversed = list.clone();
            reversed.reverse();
            std::env::set_var("LC_ALL", "C");
            let forward = sorted(&list);
            std::env::set_var("LC_ALL", "tr_TR.UTF-8");
            let backward = sorted(&reversed);
            prop_assert_eq!(&forward, &backward, "a list and its reverse sort alike");
            prop_assert_eq!(&forward, &sorted(&forward), "sorting is idempotent");
            assert_ordered(&forward)?;
            let bytes = serde_json::to_string(&forward).expect("json");
            prop_assert_eq!(
                bytes.clone(),
                serde_json::to_string(&backward).expect("json")
            );
            Ok(())
        },
    );
    match saved {
        Some(v) => std::env::set_var("LC_ALL", v),
        None => std::env::remove_var("LC_ALL"),
    }
    result.unwrap_or_else(|e| panic!("{e}"));

    // Code points, not collation: `Z` (U+005A) sorts before `a` (U+0061)
    // and `é` (U+00E9) after both, whatever the locale would say.
    let make = |m: &str| Diagnostic::frontend(Code::UnresolvedTypeToken, m, None);
    let out = sorted(&[make("é"), make("a"), make("Z")]);
    let messages: Vec<&str> = out.iter().map(|d| d.message.as_str()).collect();
    assert_eq!(messages, ["Z", "a", "é"]);
}

#[trace("TC-1269", "FR-096-AC-11")]
#[test]
fn tc_1269_a_4000_character_token_appears_in_no_message_longer_than_120_characters() {
    let before = "type token `";
    let after = "` resolves to nothing";
    let whole: String = "x".repeat(TOKEN_LIMIT);
    let message = message_with_token(before, &whole, after);
    assert_eq!(
        message,
        format!("{before}{whole}{after}"),
        "100 characters: whole"
    );
    assert!(!message.contains(ELLIPSIS));

    let over: String = "y".repeat(TOKEN_LIMIT + 1);
    let message = message_with_token(before, &over, after);
    assert!(message.contains(ELLIPSIS), "101 characters: truncated");
    assert!(!message.contains(&over));
    assert!(
        message.chars().count() <= MESSAGE_LIMIT,
        "{}",
        message.chars().count()
    );
    assert!(message.starts_with(before));

    let huge: String = "é".repeat(4000);
    let message = message_with_token(before, &huge, after);
    assert!(
        message.chars().count() <= MESSAGE_LIMIT,
        "{}",
        message.chars().count()
    );
    assert!(message.contains(ELLIPSIS));
    let d = Diagnostic::frontend(Code::UnresolvedTypeToken, message, None);
    assert_eq!(violations(&d), Vec::<String>::new());
    assert_eq!(token(&huge).chars().count(), TOKEN_LIMIT);
    assert!(token(&huge).ends_with(ELLIPSIS));
    assert_eq!(token(&whole), whole.as_str());
}

#[trace("TC-1345", "FR-096-AC-15")]
#[test]
fn tc_1345_an_engine_diagnostic_at_line_zero_has_no_locus_and_names_the_path() {
    for line in [Some(0), None] {
        let d = Diagnostic::engine(
            &engine(
                "semantic.unresolved-type",
                SemanticSeverity::Advisory,
                line,
                Some("unknown-token"),
            ),
            SOURCE,
            DOC,
        );
        assert!(d.locus.is_none(), "{line:?}");
        assert!(d.message.contains(DOC), "{}", d.message);
        assert!(
            d.message
                .starts_with("semantic.unresolved-type (reason: unknown-token): "),
            "{}",
            d.message
        );
        assert_eq!(d.related.len(), 1);
        assert_eq!(d.related[0].path, DOC);
        let value = serde_json::to_value(&d).expect("json");
        assert!(value.get("locus").is_none());
        assert_eq!(violations(&d), Vec::<String>::new());
    }
}

#[trace("TC-1346", "FR-096-AC-16")]
#[trace("TC-1346", "FR-096-CON-2")]
#[test]
fn tc_1346_a_reader_diagnostic_appears_as_exactly_one_invalid_ir_with_the_reader_in_causes() {
    // A real reader finding: a document that names an unknown contract.
    let bundle = parse(r#"{"ir":{"contractVersion":"0.0.1"}}"#).expect("json");
    let verdict = agent_ix_semantic_ir::decide(&bundle);
    assert!(!verdict.diagnostics.is_empty(), "the reader rejects it");
    let wrapped: Vec<Diagnostic> = verdict.diagnostics.iter().map(Diagnostic::reader).collect();
    assert_eq!(
        wrapped.len(),
        verdict.diagnostics.len(),
        "one INVALID_IR per reader diagnostic"
    );
    for (d, reader) in wrapped.iter().zip(&verdict.diagnostics) {
        assert_eq!(d.code, WireCode::Registry(Code::InvalidIr));
        assert_eq!((d.severity, d.blocking), (Severity::Error, true));
        assert!(d.locus.is_none());
        assert!(d.message.contains(reader.code), "{}", d.message);
        let pointer = if reader.pointer.is_empty() {
            "the document root"
        } else {
            reader.pointer.as_str()
        };
        assert!(d.message.contains(pointer), "{} names {pointer}", d.message);
        assert_eq!(d.causes.len(), 1);
        let cause = &d.causes[0];
        assert_eq!(cause.code, WireCode::Reader(reader.code.to_string()));
        assert!(
            reader.code.starts_with("agent-ix.semantic-ir."),
            "{}",
            reader.code
        );
        assert_eq!(cause.message, reader.message);
        assert_eq!(cause.owner, reader.owner);
        assert_eq!(cause.blocking, reader.blocking);
        assert_eq!(cause.severity.as_str(), reader.severity.as_str());
        assert_eq!(violations(d), Vec::<String>::new(), "{d:?}");
    }
    // Under no other code: the reader's code is never a top-level code.
    assert!(wrapped
        .iter()
        .all(|d| d.registry_code() == Some(Code::InvalidIr)));
}

/// The generator of the diagnostics registry page renders every code with
/// severity, blocking and owner, and reproduces the committed expectation
/// byte for byte. The docs page itself is written by the closing task (the
/// non-disruption sentinel); the traced test in `tests/docs.rs` compares the
/// page against this same generator. Untraced by design: it is a helper
/// check behind that row, not a row of its own (SR-170 FND-1508).
#[test]
fn registry_doc_renders_every_code_with_severity_blocking_and_owner() {
    let doc = render_registry_doc();
    for code in Code::ALL {
        assert!(doc.contains(&format!("| `{code}` |")), "{code} is listed");
    }
    assert!(doc.contains(&format!("`{OWNER}`")));
    assert_eq!(doc, render_registry_doc(), "a pure function of the enum");
    // The developer's copy path: render to a scratch file, then copy it
    // under `fixtures/registry-doc/expected/` deliberately.
    if let Some(scratch) = std::env::var_os("EXTRACTION_FRONTEND_RENDER_DOC") {
        fs::write(&scratch, &doc).expect("write the scratch rendering");
    }
    let expected = fs::read_to_string(fixture(
        "registry-doc/expected/extraction-frontend-diagnostics.md",
    ))
    .expect("the committed expectation");
    assert_eq!(
        doc, expected,
        "regenerate the expectation deliberately when the registry changes"
    );
}
