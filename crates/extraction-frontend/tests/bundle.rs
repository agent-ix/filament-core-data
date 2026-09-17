//! FR-091: read a spec bundle through the Quire extraction contract.
//!
//! Every fixture lives under `fixtures/`; every module root is passed
//! explicitly. The loader under test never reads the environment, and
//! `tc_1203_` proves it by planting a conflicting module where an ambient
//! loader would find one.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Severity, WireCode};
use agent_ix_extraction_frontend::{extract, Bundle, Extractions, Refusal};
use ix_trace_rs::trace;
use quire_rs::semantic::{AvailabilityState, SemanticDiagnostic, SemanticSeverity};
use serde_json::{json, Value};

use crate::common::{common_schema, diagnostic_schema_violations};

/// `tc_1203_` rewrites `HOME`; `tc_1328_` spawns `quire`, which inherits it.
/// Process-wide state, so the two serialise.
static ENV_LOCK: Mutex<()> = Mutex::new(());

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

fn load(bundle: &str, modules: &[&Path]) -> Result<Bundle, Refusal> {
    Bundle::load(&fixture(bundle), modules)
}

fn load_ok(bundle: &str) -> Bundle {
    load(bundle, &[&business_module()]).unwrap_or_else(|r| panic!("{bundle} refused: {r}"))
}

/// The observable lift of this task: every extraction keyed by id plus the
/// frontend diagnostics, as pretty JSON.
fn lift_bytes(out: &Extractions) -> String {
    let artifacts: BTreeMap<&str, Value> = out
        .artifacts
        .iter()
        .map(|(id, e)| {
            (
                id.as_str(),
                json!({"path": e.path, "object": e.object, "extraction": e.extraction}),
            )
        })
        .collect();
    serde_json::to_string_pretty(&json!({
        "artifacts": artifacts,
        "diagnostics": out.diagnostics,
    }))
    .expect("lift serialises")
}

fn write(path: &Path, text: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("mkdir");
    }
    fs::write(path, text).unwrap_or_else(|e| panic!("write {}: {e}", path.display()));
}

fn spec_md(org: Option<&str>, name: &str) -> String {
    let org = org.map(|o| format!("org: {o}\n")).unwrap_or_default();
    format!("---\ntype: master-requirements\nname: {name}\n{org}title: Spec\n---\n# Spec\n")
}

fn entity_md(id: &str, title: &str, rows: &[&str]) -> String {
    let mut s = format!(
        "---\nid: {id}\ntitle: {title}\nobject: entity\ntype: FR\n---\n\n# {id}: {title}\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|---|---|---|---|\n"
    );
    for row in rows {
        s.push_str(row);
        s.push('\n');
    }
    s
}

/// The engine code each `ENGINE_DIAGNOSTIC` opens its message with.
fn engine_codes(d: &[Diagnostic]) -> Vec<String> {
    d.iter()
        .filter(|d| d.code == WireCode::Registry(Code::EngineDiagnostic))
        .map(|d| engine_code_of(&d.message).to_string())
        .collect()
}

/// `<engine code>` of a `<engine code> (reason: <reason>): <engine message>`
/// or `<engine code>: <engine message>` message.
fn engine_code_of(message: &str) -> &str {
    message.split([' ', ':']).next().unwrap_or_default()
}

/// The FR-091 / FR-096 message of one wrapped engine diagnostic.
fn engine_head(e: &SemanticDiagnostic) -> String {
    match &e.reason {
        Some(reason) => format!("{} (reason: {reason}): {}", e.code, e.message),
        None => format!("{}: {}", e.code, e.message),
    }
}

#[trace("TC-1200", "FR-091-AC-1")]
#[test]
fn tc_1200_config_version_table_lifts_seven_fields_for_fr_006_and_one_extraction_for_fr_005() {
    let bundle = load_ok("config-version-table");
    assert_eq!(bundle.package().identity(), "agent-ix/config-service");
    let module = bundle
        .semantic_module("spec-objects-business")
        .expect("the vendored module carries a semantic block");
    assert_eq!(module.semantic_core, "0.2.0");
    assert_eq!(
        bundle.module_version("spec-objects-business"),
        Some("0.4.0")
    );

    let out = extract(&bundle);
    let ids: Vec<&String> = out.artifacts.keys().collect();
    assert_eq!(ids, ["FR-005", "FR-006"], "keyed by id, in id order");

    let fr006 = &out.artifacts["FR-006"].extraction;
    assert_eq!(
        fr006.availability.fields.state,
        AvailabilityState::Available
    );
    let names: Vec<&str> = fr006
        .fields
        .as_deref()
        .expect("fields")
        .iter()
        .map(|f| f.name.as_str())
        .collect();
    assert_eq!(
        names,
        [
            "id",
            "versionNumber",
            "data",
            "hash",
            "parent",
            "createdAt",
            "createdBy"
        ]
    );
    assert_eq!(
        fr006.schema_digest.as_deref(),
        Some("sha256:f3f7fcd604abab7e09427066287df94fac3d7a470e146b289e2ded74ef2f7d43"),
        "the module's reference-form data_schema digest is passed through"
    );
    assert_eq!(
        out.artifacts["FR-006"].path,
        "spec/functional/FR-006-config-version-entity.md"
    );

    let fr005 = &out.artifacts["FR-005"].extraction;
    assert_eq!(
        fr005.availability.fields.state,
        AvailabilityState::Available
    );
    assert_eq!(fr005.fields.as_deref().map(<[_]>::len), Some(2));
    // The only diagnostic is the engine's non-blocking advisory that the `ocl`
    // clause on FR-006 is carried unchecked (semantic_core 0.2.0).
    let messages: Vec<&str> = out.diagnostics.iter().map(|d| d.message.as_str()).collect();
    assert_eq!(
        messages,
        ["semantic.clause-language-unchecked: clause immutable: language ocl is carried unchecked"],
        "a typed bundle lifts clean: {:?}",
        out.diagnostics
    );
    assert!(out.diagnostics.iter().all(|d| !d.blocking));
}

#[trace("TC-1201", "FR-091-AC-2")]
#[test]
fn tc_1201_module_without_semantic_block_refuses_naming_the_module() {
    let root = fixture("negatives/MODULE_WITHOUT_SEMANTIC_BLOCK");
    let refusal = Bundle::load(&root, &[&root.join("modules/no-semantic")]).expect_err("refused");
    assert_eq!(refusal.code(), Code::ModuleWithoutSemanticBlock);
    assert!(
        refusal.diagnostic.message.contains("no-semantic"),
        "names the module: {}",
        refusal.diagnostic.message
    );
    assert_eq!(refusal.diagnostic.severity, Severity::Error);
    assert!(refusal.diagnostic.blocking);
    let locus = refusal.diagnostic.locus.as_ref().expect("module locus");
    assert_eq!(locus.path, "no-semantic/manifest.yaml");
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
}

#[trace("TC-1202", "FR-091-AC-3")]
#[test]
fn tc_1202_unsupported_semantic_core_refuses_with_the_engine_code_and_lowers_nothing() {
    let root = fixture("negatives/MODULE_REFUSED");
    let refusal = Bundle::load(&root, &[&root.join("modules/spec-objects-business")])
        .expect_err("refused rather than loaded as an empty model");
    assert_eq!(refusal.code(), Code::ModuleRefused);
    assert!(
        refusal
            .diagnostic
            .message
            .starts_with("semantic.unsupported-semantic-core: "),
        "the engine code opens the message: {}",
        refusal.diagnostic.message
    );
    assert!(
        refusal.diagnostic.causes.is_empty(),
        "a `semantic.*` code cannot live in `causes` (FR-096 \"Engine diagnostics\")"
    );
    assert!(refusal.diagnostic.message.contains("9.9.9"));
    let locus = refusal.diagnostic.locus.as_ref().expect("manifest locus");
    assert_eq!(locus.path, "spec-objects-business/manifest.yaml");
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
}

#[trace("TC-1203", "FR-091-AC-4")]
#[test]
fn tc_1203_planted_ambient_module_never_changes_the_explicit_lift() {
    let _env = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    // The baseline: explicit module root, nothing ambient.
    let baseline = lift_bytes(&extract(&load_ok("config-version-table")));

    // Plant the conflicting module everywhere an ambient loader would look.
    let home = tempfile::tempdir().expect("tempdir");
    let planted = home
        .path()
        .join(".ix/filament/modules/spec-objects-business");
    fs::create_dir_all(planted.join("schemas")).expect("mkdir");
    let conflicting = fixture("modules/conflicting");
    fs::copy(
        conflicting.join("manifest.yaml"),
        planted.join("manifest.yaml"),
    )
    .expect("copy manifest");
    for entry in fs::read_dir(conflicting.join("schemas")).expect("schemas") {
        let entry = entry.expect("entry");
        fs::copy(
            entry.path(),
            planted.join("schemas").join(entry.file_name()),
        )
        .expect("copy");
    }
    let modules_dir = home.path().join(".ix/filament/modules");
    let saved: Vec<(&str, Option<std::ffi::OsString>)> = [
        "HOME",
        "QUIRE_MODULES",
        "IX_FILAMENT_MODULES_PATH",
        "IX_SCHEMA_PATH",
    ]
    .into_iter()
    .map(|k| (k, std::env::var_os(k)))
    .collect();
    std::env::set_var("HOME", home.path());
    std::env::set_var("QUIRE_MODULES", &modules_dir);
    std::env::set_var("IX_FILAMENT_MODULES_PATH", &modules_dir);
    std::env::set_var("IX_SCHEMA_PATH", &modules_dir);

    let under_plant = lift_bytes(&extract(&load_ok("config-version-table")));
    // The control: the conflicting module supplied explicitly.
    let control = lift_bytes(&extract(
        &Bundle::load(&fixture("config-version-table"), &[&planted]).expect("loads"),
    ));

    for (k, v) in saved {
        match v {
            Some(v) => std::env::set_var(k, v),
            None => std::env::remove_var(k),
        }
    }

    assert_eq!(
        under_plant, baseline,
        "the planted module leaked into the lift"
    );
    assert_ne!(
        control, baseline,
        "the control must differ, or the plant proves nothing"
    );
    assert!(baseline.contains("\"lossy\": false"));
    assert!(control.contains("\"lossy\": true"));
}

#[trace("TC-1204", "FR-091-AC-5")]
#[test]
fn tc_1204_bundle_without_org_or_with_malformed_name_refuses_at_spec_md() {
    let refusal =
        load("negatives/BUNDLE_UNIDENTIFIED", &[&business_module()]).expect_err("refused");
    assert_eq!(refusal.code(), Code::BundleUnidentified);
    let locus = refusal.diagnostic.locus.as_ref().expect("locus");
    assert_eq!(locus.path, "spec/spec.md");
    assert!(
        refusal.diagnostic.message.contains("org"),
        "{}",
        refusal.diagnostic.message
    );

    let dir = tempfile::tempdir().expect("tempdir");
    write(
        &dir.path().join("spec/spec.md"),
        &spec_md(Some("agent-ix"), "Config Service"),
    );
    let refusal = Bundle::load(dir.path(), &[&business_module()]).expect_err("refused");
    assert_eq!(refusal.code(), Code::BundleUnidentified);
    assert_eq!(
        refusal.diagnostic.locus.as_ref().expect("locus").path,
        "spec/spec.md"
    );
    assert!(
        refusal.diagnostic.message.contains("Config Service"),
        "names the offending value: {}",
        refusal.diagnostic.message
    );

    // No spec.md at all.
    let dir = tempfile::tempdir().expect("tempdir");
    write(
        &dir.path().join("spec/functional/FR-001-x.md"),
        &entity_md("FR-001", "Thing", &["| id | UUID | 1 | identity |"]),
    );
    let refusal = Bundle::load(dir.path(), &[&business_module()]).expect_err("refused");
    assert_eq!(refusal.code(), Code::BundleUnidentified);
    assert_eq!(
        refusal.diagnostic.locus.as_ref().expect("locus").path,
        "spec/spec.md"
    );

    // An object-typed document without an id.
    let dir = tempfile::tempdir().expect("tempdir");
    write(
        &dir.path().join("spec/spec.md"),
        &spec_md(Some("agent-ix"), "svc"),
    );
    write(
        &dir.path().join("spec/functional/FR-001-x.md"),
        "---\ntitle: Thing\nobject: entity\ntype: FR\n---\n\n# Thing\n",
    );
    let refusal = Bundle::load(dir.path(), &[&business_module()]).expect_err("refused");
    assert_eq!(refusal.code(), Code::BundleUnidentified);
    let locus = refusal.diagnostic.locus.as_ref().expect("locus");
    assert_eq!(locus.path, "spec/functional/FR-001-x.md");
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
    assert!(refusal
        .diagnostic
        .message
        .contains("spec/functional/FR-001-x.md"));
}

#[trace("TC-1205", "FR-091-AC-6")]
#[test]
fn tc_1205_unknown_object_type_diagnoses_and_skips_while_no_object_is_silent() {
    let out = extract(&load_ok("negatives/UNKNOWN_OBJECT_TYPE"));
    let ids: Vec<&String> = out.artifacts.keys().collect();
    assert_eq!(
        ids,
        ["FR-005"],
        "the widget is not lowered; the use case is not an object"
    );
    assert_eq!(out.diagnostics.len(), 1, "{:?}", out.diagnostics);
    let d = &out.diagnostics[0];
    assert_eq!(d.code, WireCode::Registry(Code::UnknownObjectType));
    assert_eq!(
        d.code.to_string(),
        "agent-ix.extraction-frontend.UNKNOWN_OBJECT_TYPE"
    );
    assert!(d.blocking);
    let locus = d.locus.as_ref().expect("frontmatter locus");
    assert_eq!(locus.path, "spec/functional/FR-007-widget.md");
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
    assert_eq!(locus.source_identity, "ix://agent-ix/config-service/spec");
    assert!(d.message.contains("widget"));
}

#[trace("TC-1206", "FR-091-AC-7")]
#[test]
fn tc_1206_bundle_index_names_every_object_by_id_and_title_and_a_title_cell_resolves() {
    let bundle = load_ok("config-version-table");
    let index = bundle.index();
    assert_eq!(index.package, "agent-ix/config-service");
    let entries: BTreeMap<&str, &Vec<String>> = index
        .objects
        .iter()
        .map(|o| (o.id.as_str(), &o.names))
        .collect();
    assert_eq!(
        entries["FR-005"],
        &vec!["FR-005".to_string(), "ConfigOverlay".to_string()]
    );
    assert_eq!(
        entries["FR-006"],
        &vec![
            "FR-006".to_string(),
            "ConfigVersion Entity".to_string(),
            "ConfigVersion".to_string()
        ]
    );
    assert_eq!(
        index.imports["agent-ix/spec-objects-business"].len(),
        11,
        "the module's exports are the import table"
    );
    // The fixture's `parent | ConfigVersion` cell resolves through the index.
    let out = extract(&bundle);
    let parent = &out.artifacts["FR-006"]
        .extraction
        .fields
        .as_deref()
        .expect("fields")[4];
    assert_eq!(parent.name, "parent");
    assert_eq!(
        parent.type_ref.target,
        "ix://agent-ix/config-service/type/ConfigVersion"
    );

    // A Type cell naming a sibling by its title.
    let dir = tempfile::tempdir().expect("tempdir");
    write(
        &dir.path().join("spec/spec.md"),
        &spec_md(Some("acme"), "shop"),
    );
    write(
        &dir.path().join("spec/functional/FR-001-widget.md"),
        &entity_md("FR-001", "Widget", &["| id | UUID | 1 | identity |"]),
    );
    write(
        &dir.path().join("spec/functional/FR-002-order.md"),
        &entity_md(
            "FR-002",
            "Order",
            &["| id | UUID | 1 | identity |", "| item | Widget | 1 | |"],
        ),
    );
    let bundle = Bundle::load(dir.path(), &[&business_module()]).expect("loads");
    let out = extract(&bundle);
    let item = &out.artifacts["FR-002"]
        .extraction
        .fields
        .as_deref()
        .expect("fields")[1];
    assert_eq!(item.type_ref.target, "ix://acme/shop/type/Widget");
    assert!(
        engine_codes(&out.diagnostics).is_empty(),
        "no unresolved-type advisory: {:?}",
        out.diagnostics
    );
}

/// The static gate of FR-091-AC-8 over one source tree: every violation
/// found, as `<file>: <what>`.
fn declaration_gate(src: &Path) -> Vec<String> {
    let mut files: Vec<PathBuf> = fs::read_dir(src)
        .expect("src")
        .map(|e| e.expect("entry").path())
        .filter(|p| p.extension().is_some_and(|e| e == "rs"))
        .collect();
    files.sort();
    let mut violations = Vec::new();
    for file in &files {
        let name = file
            .file_name()
            .expect("name")
            .to_string_lossy()
            .to_string();
        let text = fs::read_to_string(file).expect("read");
        for decl in [
            "FieldDecl",
            "TypeRef",
            "Multiplicity",
            "Constraint",
            "ClauseRef",
            "SourceLocus",
            "OperationDecl",
        ] {
            for kw in ["struct", "enum", "type"] {
                if text.contains(&format!("{kw} {decl} "))
                    || text.contains(&format!("{kw} {decl}<"))
                    || text.contains(&format!("{kw} {decl};"))
                    || text.contains(&format!("{kw} {decl}("))
                    || text.contains(&format!("{kw} {decl}{{"))
                {
                    violations.push(format!("{name}: declares {kw} {decl}"));
                }
            }
        }
        if text.contains("extract_semantic_json") {
            violations.push(format!("{name}: calls extract_semantic_json"));
        }
        for section in ["Properties", "Invariants", "Operations", "Relationships"] {
            if text.contains(&format!("## {section}")) {
                violations.push(format!("{name}: names the `## {section}` heading"));
            }
        }
        if name != "bundle.rs" {
            for sym in ["load_repo", "load_module_set"] {
                if text.contains(sym) {
                    violations.push(format!("{name}: names {sym}"));
                }
            }
        }
    }
    violations
}

#[trace("TC-1207", "FR-091-AC-8")]
#[trace("TC-1207", "FR-091-CON-1")]
#[trace("TC-1207", "FR-091-CON-3")]
#[test]
fn tc_1207_no_second_declaration_and_the_planted_control_fails_the_gate() {
    let src = crate_dir().join("src");
    let violations = declaration_gate(&src);
    assert!(violations.is_empty(), "{}", violations.join("\n"));

    // The control: the same tree plus one planted declaration.
    let scratch = tempfile::tempdir().expect("tempdir");
    for entry in fs::read_dir(&src).expect("src") {
        let entry = entry.expect("entry");
        fs::copy(entry.path(), scratch.path().join(entry.file_name())).expect("copy");
    }
    write(
        &scratch.path().join("scratch.rs"),
        "pub struct TypeRef {\n    pub target: String,\n}\n",
    );
    let violations = declaration_gate(scratch.path());
    assert_eq!(violations, ["scratch.rs: declares struct TypeRef"]);
}

#[trace("TC-1208", "FR-091-AC-9")]
#[test]
fn tc_1208_every_engine_diagnostic_is_one_engine_diagnostic_with_mapped_severity_and_locus() {
    for name in ["legacy", "config-version-table", "config-version-fence"] {
        let bundle = load_ok(name);
        let out = extract(&bundle);
        let wrapped: Vec<&Diagnostic> = out
            .diagnostics
            .iter()
            .filter(|d| d.code == WireCode::Registry(Code::EngineDiagnostic))
            .collect();
        let engine: Vec<(&str, &SemanticDiagnostic)> = out
            .artifacts
            .values()
            .flat_map(|e| {
                e.extraction
                    .diagnostics
                    .iter()
                    .map(move |d| (e.path.as_str(), d))
            })
            .collect();
        assert_eq!(
            wrapped.len(),
            engine.len(),
            "{name}: one wrapper per engine diagnostic"
        );
        for (w, (path, e)) in wrapped.iter().zip(&engine) {
            assert!(w.causes.is_empty(), "{name}: causes stay empty");
            assert!(
                w.message.starts_with(&engine_head(e)),
                "{name}: `<code> (reason: <reason>): <message>` opens the wrapper: {}",
                w.message
            );
            let expected = match e.severity {
                SemanticSeverity::Advisory => Severity::Info,
                SemanticSeverity::Warning => Severity::Warning,
                SemanticSeverity::Error => Severity::Error,
            };
            assert_eq!(w.severity, expected);
            assert_eq!(w.blocking, expected == Severity::Error);
            assert_eq!(
                w.owner,
                "ix://agent-ix/filament-core-data/extraction-frontend"
            );
            match e.line {
                Some(line) if line >= 1 => {
                    let locus = w.locus.as_ref().expect("locus");
                    assert_eq!(locus.path, *path);
                    assert_eq!(locus.start_line, line);
                    assert_eq!(locus.start_column, e.column.unwrap_or(1));
                    assert_eq!(locus.source_identity, "ix://agent-ix/config-service/spec");
                }
                _ => {
                    assert!(w.locus.is_none());
                    assert_eq!(w.related[0].path, *path);
                }
            }
        }
    }
}

#[trace("TC-1209", "FR-091-AC-10")]
#[test]
fn tc_1209_legacy_free_column_table_is_unavailable_with_the_engine_warning_at_line_17() {
    let out = extract(&load_ok("legacy"));
    let fr006 = &out.artifacts["FR-006"].extraction;
    assert_eq!(
        fr006.availability.fields.state,
        AvailabilityState::Unavailable
    );
    assert_eq!(
        fr006.availability.fields.reason.as_deref(),
        Some("legacy-form")
    );
    assert!(fr006.fields.is_none(), "nothing to lower");
    let warning = fr006
        .diagnostics
        .iter()
        .find(|d| d.code == "semantic.legacy-properties-form")
        .expect("the engine's legacy-form warning");
    assert_eq!(warning.severity, SemanticSeverity::Warning);
    assert_eq!(warning.line, Some(17));
    let wrapped = out
        .diagnostics
        .iter()
        .find(|d| d.message.starts_with("semantic.legacy-properties-form"))
        .expect("wrapped");
    assert_eq!(wrapped.severity, Severity::Warning);
    assert!(!wrapped.blocking);
    assert_eq!(wrapped.locus.as_ref().expect("locus").start_line, 17);
}

#[trace("TC-1331", "FR-091-AC-11")]
#[test]
fn tc_1331_duplicate_id_refuses_at_the_second_path_and_a_line_zero_diagnostic_has_no_locus() {
    let refusal =
        load("negatives/DUPLICATE_ARTIFACT_ID", &[&business_module()]).expect_err("refused");
    assert_eq!(refusal.code(), Code::DuplicateArtifactId);
    let first = "spec/functional/FR-006-config-version-entity.md";
    let second = "spec/functional/FR-006-config-version-second.md";
    let locus = refusal.diagnostic.locus.as_ref().expect("locus");
    assert_eq!(locus.path, second);
    assert!(refusal.diagnostic.message.contains(first));
    assert!(refusal.diagnostic.message.contains(second));
    assert_eq!(refusal.diagnostic.related.len(), 1);
    assert_eq!(refusal.diagnostic.related[0].path, first);

    let schema = common_schema();
    let value = serde_json::to_value(&refusal.diagnostic).expect("json");
    assert_eq!(
        diagnostic_schema_violations(&value, &schema, ""),
        Vec::<String>::new()
    );

    // An engine diagnostic at line 0: no locus, the path in `related`.
    let engine = SemanticDiagnostic {
        code: "semantic.unresolved-type".to_string(),
        severity: SemanticSeverity::Advisory,
        message: "type \"Sting\" resolves to nothing (unknown-token)".to_string(),
        line: Some(0),
        column: None,
        reason: Some("unknown-token".to_string()),
        source_span: None,
        section: None,
    };
    let path = "spec/functional/FR-006-config-version-entity.md";
    let wrapped = Diagnostic::engine(&engine, "ix://agent-ix/config-service/spec", path);
    assert!(wrapped.locus.is_none());
    assert_eq!(wrapped.related.len(), 1);
    assert_eq!(wrapped.related[0].path, path);
    assert!(wrapped.message.contains(path));
    assert_eq!(wrapped.severity, Severity::Info);
    assert!(!wrapped.blocking);
    assert!(
        wrapped
            .message
            .starts_with("semantic.unresolved-type (reason: unknown-token): "),
        "{}",
        wrapped.message
    );
    assert!(wrapped.causes.is_empty());
    let value = serde_json::to_value(&wrapped).expect("json");
    assert!(
        value.get("locus").is_none(),
        "no fabricated locus at line 0"
    );
    assert_eq!(
        diagnostic_schema_violations(&value, &schema, ""),
        Vec::<String>::new(),
        "the wrapper validates whole, causes included (CR-036-2)"
    );
    let with_line = Diagnostic::engine(
        &SemanticDiagnostic {
            line: None,
            ..engine.clone()
        },
        "ix://agent-ix/config-service/spec",
        path,
    );
    assert!(with_line.locus.is_none());
}

/// A scratch repository: this crate's `spec/` tree with one matrix row at
/// a passed status (flipped from `🚧 planned` when it still is, kept when
/// the matrix already marks it `✅ passed`, as it does since CR-036-9),
/// plus one Rust test file.
fn coverage_scope(row: &str, test_source: &str) -> tempfile::TempDir {
    let dir = tempfile::tempdir().expect("tempdir");
    let crate_dir = crate_dir();
    let workspace = crate_dir
        .parent()
        .and_then(Path::parent)
        .expect("workspace");
    let spec = workspace.join("spec");
    for entry in walk(&spec) {
        let rel = entry.strip_prefix(&spec).expect("under spec");
        let target = dir.path().join("spec").join(rel);
        fs::create_dir_all(target.parent().expect("parent")).expect("mkdir");
        fs::copy(&entry, &target).expect("copy");
    }
    let tests = dir.path().join("spec/tests.md");
    let text = fs::read_to_string(&tests).expect("tests.md");
    let mut flipped = String::new();
    let mut hit = false;
    for line in text.lines() {
        if line.starts_with(&format!("| {row} |")) && line.ends_with("| 🚧 planned |") {
            flipped.push_str(&line.replace("| 🚧 planned |", "| ✅ passed |"));
            hit = true;
        } else if line.starts_with(&format!("| {row} |")) && line.ends_with("| ✅ passed |") {
            flipped.push_str(line);
            hit = true;
        } else {
            flipped.push_str(line);
        }
        flipped.push('\n');
    }
    assert!(hit, "{row} is a planned or passed row of spec/tests.md");
    fs::write(&tests, flipped).expect("write");
    write(
        &dir.path()
            .join("crates/extraction-frontend/tests/bundle.rs"),
        test_source,
    );
    dir
}

fn walk(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).expect("dir") {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            out.extend(walk(&path));
        } else {
            out.push(path);
        }
    }
    out
}

/// `(status lie?, unbacked?)` of one row under `quire coverage --json`.
fn coverage_row(scope: &Path, row: &str) -> (bool, bool) {
    let out = Command::new("quire")
        .args(["coverage", "--scope"])
        .arg(scope)
        .arg("--json")
        .output()
        .expect("quire is installed: the coverage gate cannot run without it");
    assert!(
        out.status.success(),
        "quire coverage failed:\n{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let report: Value = serde_json::from_slice(&out.stdout).expect("coverage JSON");
    let has = |key: &str| {
        report[key]
            .as_array()
            .expect(key)
            .iter()
            .any(|r| r["row_id"] == row)
    };
    (has("status_lies"), has("unbacked_rows"))
}

#[trace("TC-1328", "NFR-033-AC-9")]
#[test]
fn tc_1328_coverage_binds_the_trace_form_and_an_unmarked_test_makes_a_status_lie() {
    let _env = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let row = "TC-1200";
    let marker = "#[trace(\"TC-1200\", \"FR-091-AC-1\")]";
    let symbol = "fn tc_1200_";
    let source = fs::read_to_string(crate_dir().join("tests/bundle.rs")).expect("this file");
    assert!(source.contains(marker) && source.contains(symbol));

    // Bound: the marker and the tc_NNNN_ name are both present.
    let scope = coverage_scope(row, &source);
    assert_eq!(
        coverage_row(scope.path(), row),
        (false, false),
        "bound as committed"
    );

    // The marker alone removed: quire 0.31's `rust-test-name-id` form still
    // binds the row through the `tc_1200_` symbol name, so this is NOT yet
    // a status lie (NFR-033-AC-9 as written presumes the marker is the only
    // binding form; reported with Task-128).
    let unmarked = source.replacen(marker, "", 1);
    let scope = coverage_scope(row, &unmarked);
    assert_eq!(
        coverage_row(scope.path(), row),
        (false, false),
        "the self-named symbol still binds"
    );

    // Marker and symbol id both removed: the flipped row is now a lie.
    let unbound = unmarked.replacen(symbol, "fn untraced_", 1);
    let scope = coverage_scope(row, &unbound);
    assert_eq!(
        coverage_row(scope.path(), row),
        (true, true),
        "binding is by symbol"
    );
}
