//! FR-092: classify every `TypeRef.target` the engine returns into one
//! closed `Resolution`, in two passes, and mint the kernel scalars a bundle
//! uses once per package.
//!
//! Every bundle is a committed fixture under `fixtures/`; the vendored
//! business module is the module root (plus `acme-other` for the import
//! case). Nothing here reads the environment.

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, Severity, WireCode};
use agent_ix_extraction_frontend::resolve::{
    classify, pass_one, pass_two, resolve, ArtifactRef, Outcome, Outcomes, Resolution, Resolved,
    Unresolved,
};
use agent_ix_extraction_frontend::scalars::{
    definitions, KernelScalar, ScalarDefinition, KERNEL_SCALAR_EXTENSION,
};
use agent_ix_extraction_frontend::{extract, is_blocked, Bundle, Extractions, PackageIdentity};
use ix_trace_rs::trace;
use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use serde_json::Value;

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

fn load(name: &str, modules: &[&Path]) -> (Bundle, Extractions) {
    let bundle =
        Bundle::load(&fixture(name), modules).unwrap_or_else(|r| panic!("{name} refused: {r}"));
    let extractions = extract(&bundle);
    (bundle, extractions)
}

fn load_business(name: &str) -> (Bundle, Extractions) {
    load(name, &[&business_module()])
}

fn code_of(d: &Diagnostic) -> Option<Code> {
    d.registry_code()
}

fn with_code(diagnostics: &[Diagnostic], code: Code) -> Vec<&Diagnostic> {
    diagnostics
        .iter()
        .filter(|d| d.code == WireCode::Registry(code))
        .collect()
}

/// The one resolution of `field` in `artifact`.
fn resolution_of<'a>(resolutions: &'a [Resolved], artifact: &str, field: &str) -> &'a Resolved {
    resolutions
        .iter()
        .find(|r| r.artifact == artifact && r.field == field)
        .unwrap_or_else(|| panic!("no resolution for {artifact}.{field}"))
}

fn object_ref(resolution: &Resolution) -> &ArtifactRef {
    match resolution {
        Resolution::Object(artifact) => artifact,
        other => panic!("expected Object, got {other:?}"),
    }
}

#[trace("TC-1210", "FR-092-AC-1")]
#[test]
fn tc_1210_every_kernel_name_is_kernel_scalar_and_config_version_mints_five_scalars_once() {
    let (bundle, extractions) = load_business("config-version-table");
    let outcomes = pass_one(&bundle, &extractions).outcomes;

    // Every kernel scalar name, whatever the order it is asked in.
    let names: Vec<&'static str> = KernelScalar::ALL.iter().map(|k| k.name()).collect();
    assert_eq!(names.len(), 9, "the FR-032 library has nine members");
    let mut runner = TestRunner::new(Config::with_cases(64));
    runner
        .run(&proptest::sample::select(names.clone()), |name| {
            let resolution = classify(name, None, &bundle, &outcomes);
            prop_assert_eq!(
                resolution,
                Resolution::KernelScalar(KernelScalar::from_name(name).expect("kernel")),
            );
            Ok(())
        })
        .expect("every kernel name resolves to KernelScalar");

    // The fixture uses exactly four scalars plus JsonObject.
    let lift = resolve(&bundle, &extractions);
    let used: BTreeSet<&str> = lift.scalars_used.iter().map(|k| k.name()).collect();
    assert_eq!(
        used,
        BTreeSet::from(["UUID", "Integer", "String", "Timestamp", "JsonObject"])
    );
    let package = PackageIdentity::from(bundle.package());
    let defs: Vec<ScalarDefinition> =
        definitions(&package, lift.scalars_used.iter().copied(), "0.0.0");
    let identities: Vec<&str> = defs.iter().map(|d| d.identity.as_str()).collect();
    assert_eq!(
        identities,
        [
            "ix://agent-ix/config-service/type/Integer",
            "ix://agent-ix/config-service/type/JsonObject",
            "ix://agent-ix/config-service/type/String",
            "ix://agent-ix/config-service/type/Timestamp",
            "ix://agent-ix/config-service/type/UUID",
        ],
        "five scalar definitions, each once, in identity order"
    );
    for def in &defs {
        let json = serde_json::to_value(def).expect("serialises");
        assert_eq!(json["kind"], "scalar");
        assert_eq!(
            json["displayName"],
            def.identity.rsplit('/').next().expect("name")
        );
        let ext = &json["extensions"][0];
        assert_eq!(ext["identity"], KERNEL_SCALAR_EXTENSION);
        assert_eq!(ext["version"], "1.0.0");
        assert_eq!(ext["required"], false);
        assert_eq!(ext["payload"]["name"], json["displayName"]);
        assert_eq!(json["extensions"].as_array().map(Vec::len), Some(1));
        assert!(json["scalar"].is_string(), "the FR-032 value: {json}");
        assert_eq!(
            json["origin"]["generated"]["inputIdentities"][0],
            "ix://agent-ix/config-service/spec"
        );
    }
    let scalars: BTreeMap<&str, &str> = defs
        .iter()
        .map(|d| {
            (
                d.identity.rsplit('/').next().expect("name"),
                d.scalar.as_str(),
            )
        })
        .collect();
    assert_eq!(
        scalars,
        BTreeMap::from([
            ("UUID", "uuid"),
            ("Integer", "integer"),
            ("String", "string"),
            ("Timestamp", "datetime"),
            ("JsonObject", "any"),
        ])
    );
    // The whole FR-032 value map.
    let table: Vec<(&str, Option<&str>)> = KernelScalar::ALL
        .iter()
        .map(|k| (k.name(), k.ir_scalar()))
        .collect();
    assert_eq!(
        table,
        [
            ("UUID", Some("uuid")),
            ("Boolean", Some("boolean")),
            ("Integer", Some("integer")),
            ("Decimal", Some("number")),
            ("String", Some("string")),
            ("Timestamp", Some("datetime")),
            ("Duration", Some("duration")),
            ("Bytes", Some("bytes")),
            ("JsonObject", Some("any")),
        ]
    );
}

#[trace("TC-1211", "FR-092-AC-2")]
#[test]
fn tc_1211_config_overlay_by_title_and_fr_005_by_id_resolve_to_the_same_object() {
    let (bundle, extractions) = load_business("resolve/by-title");
    let lift = resolve(&bundle, &extractions);
    assert!(
        lift.diagnostics.is_empty(),
        "a resolvable bundle lifts clean: {:?}",
        lift.diagnostics
    );
    let overlay = resolution_of(&lift.resolutions, "FR-006", "overlay");
    let by_title = object_ref(&overlay.resolution);
    assert_eq!(by_title.id, "FR-005");
    assert_eq!(
        by_title.path,
        "spec/functional/FR-005-config-overlay-entity.md"
    );
    let package = PackageIdentity::from(bundle.package());
    assert_eq!(
        overlay.resolution.type_ref(&package).as_deref(),
        Some("ix://agent-ix/config-service/type/FR-005"),
        "the typeRef is the definition's identity, not the token's spelling"
    );

    // By id: the `type/FR-005` form the engine mints when a cell names an
    // artifact by an identifier-shaped id (quire-rs FR-070 step 2).
    let by_id = classify(
        "ix://agent-ix/config-service/type/FR-005",
        None,
        &bundle,
        &lift.outcomes,
    );
    assert_eq!(
        object_ref(&by_id),
        by_title,
        "title and id name one artifact"
    );
    assert_eq!(
        by_id.type_ref(&package).as_deref(),
        Some("ix://agent-ix/config-service/type/FR-005")
    );

    // Recorded, not asserted as behaviour of this crate: a Type cell reading
    // `FR-005` never reaches the classifier, because the engine's Identifier
    // grammar rejects the `-` before any index lookup.
    let dir = tempfile::tempdir().expect("tempdir");
    let src = fixture("resolve/by-title");
    for rel in [
        "spec/spec.md",
        "spec/functional/FR-005-config-overlay-entity.md",
    ] {
        let target = dir.path().join(rel);
        std::fs::create_dir_all(target.parent().expect("parent")).expect("mkdir");
        std::fs::copy(src.join(rel), target).expect("copy");
    }
    std::fs::write(
        dir.path()
            .join("spec/functional/FR-006-config-version-entity.md"),
        std::fs::read_to_string(src.join("spec/functional/FR-006-config-version-entity.md"))
            .expect("FR-006")
            .replace(
                "| overlay | ConfigOverlay | 1 | |",
                "| overlay | FR-005 | 1 | |",
            ),
    )
    .expect("write");
    let bundle = Bundle::load(dir.path(), &[&business_module()]).expect("loads");
    let extractions = extract(&bundle);
    let engine: Vec<&Diagnostic> = with_code(&extractions.diagnostics, Code::EngineDiagnostic);
    assert!(
        engine
            .iter()
            .any(|d| d.message.starts_with("semantic.invalid-type-token")),
        "the engine rejects an id-shaped Type cell: {:?}",
        extractions.diagnostics
    );
    assert!(
        extractions.artifacts["FR-006"].extraction.fields.is_none(),
        "the row is dropped before classification"
    );
}

#[trace("TC-1212", "FR-092-AC-3")]
#[test]
fn tc_1212_sting_is_unknown_token_with_one_blocking_unresolved_type_token_at_the_row() {
    let (bundle, extractions) = load_business("negatives/UNRESOLVED_TYPE_TOKEN");
    let lift = resolve(&bundle, &extractions);
    let hash = resolution_of(&lift.resolutions, "FR-006", "hash");
    assert_eq!(
        hash.resolution,
        Resolution::Unresolved(Unresolved::UnknownToken)
    );
    let unresolved = with_code(&lift.diagnostics, Code::UnresolvedTypeToken);
    assert_eq!(unresolved.len(), 1, "{:?}", lift.diagnostics);
    let d = unresolved[0];
    assert!(d.blocking);
    assert_eq!(d.severity, Severity::Error);
    assert!(d.message.contains("Sting"), "{}", d.message);
    assert_eq!(
        d.locus,
        Some(Locus::new(
            "ix://agent-ix/config-service/spec",
            "spec/functional/FR-006-config-version-entity.md",
            14,
            3
        ))
    );
    assert!(is_blocked(&lift.diagnostics), "no document is written");
    // The row's other cell and the sibling row still classify.
    assert_eq!(
        resolution_of(&lift.resolutions, "FR-006", "id").resolution,
        Resolution::KernelScalar(KernelScalar::Uuid)
    );
}

#[trace("TC-1213", "FR-092-AC-4")]
#[test]
fn tc_1213_two_status_artifacts_drop_the_row_with_artifact_not_lowered_and_one_engine_diagnostic() {
    let (bundle, extractions) = load_business("resolve/ambiguous");
    let engine: Vec<&Diagnostic> = with_code(&extractions.diagnostics, Code::EngineDiagnostic);
    assert_eq!(engine.len(), 1, "{:?}", extractions.diagnostics);
    assert!(
        engine[0].message.starts_with("semantic.ambiguous-type"),
        "{}",
        engine[0].message
    );
    assert!(engine[0].blocking);

    let lift = resolve(&bundle, &extractions);
    let not_lowered = with_code(&lift.diagnostics, Code::ArtifactNotLowered);
    assert_eq!(not_lowered.len(), 1, "{:?}", lift.diagnostics);
    assert!(not_lowered[0].message.contains("FR-006"));
    assert!(not_lowered[0].blocking);
    assert_eq!(
        lift.outcomes.get("FR-006"),
        Some(&Outcome::NotLowered {
            cause: Locus::head(
                "ix://agent-ix/config-service/spec",
                "spec/functional/FR-006-config-version-entity.md"
            )
        })
    );
    assert!(
        lift.resolutions.iter().all(|r| r.artifact != "FR-006"),
        "no Resolution for the dropped row: {:?}",
        lift.resolutions
    );
    // The two Status entities themselves lower.
    assert_eq!(lift.outcomes.get("FR-001"), Some(&Outcome::Definition));
    assert_eq!(lift.outcomes.get("FR-002"), Some(&Outcome::Definition));
}

#[trace("TC-1214", "FR-092-AC-5")]
#[test]
fn tc_1214_a_foreign_package_type_is_import_unsupported_naming_the_package() {
    let (bundle, extractions) = load(
        "negatives/IMPORT_UNSUPPORTED",
        &[&business_module(), &fixture("modules/acme-other")],
    );
    let thing = &extractions.artifacts["FR-001"]
        .extraction
        .fields
        .as_deref()
        .expect("fields")[1];
    assert_eq!(
        thing.type_ref.target, "ix://acme/other/type/Thing",
        "the engine resolved the import"
    );
    let lift = resolve(&bundle, &extractions);
    assert_eq!(
        resolution_of(&lift.resolutions, "FR-001", "thing").resolution,
        Resolution::Unresolved(Unresolved::ImportUnsupported("acme/other".to_string()))
    );
    let unsupported = with_code(&lift.diagnostics, Code::ImportUnsupported);
    assert_eq!(unsupported.len(), 1, "{:?}", lift.diagnostics);
    assert!(unsupported[0].blocking);
    assert!(
        unsupported[0].message.contains("acme/other"),
        "{}",
        unsupported[0].message
    );
    assert_eq!(
        unsupported[0].locus,
        Some(Locus::new(
            "ix://acme/shop/spec",
            "spec/functional/FR-001-order-entity.md",
            15,
            3
        ))
    );
}

/// The two-pass assertion TC-1215 and TC-1332 share: `FR-006.overlay` is
/// `Stale(FR-005)` with `STALE_TYPE_TOKEN` related to FR-005's
/// `ARTIFACT_NOT_LOWERED` locus, under the given pass-one outcomes.
fn assert_stale_under(bundle: &Bundle, extractions: &Extractions, outcomes: &Outcomes) {
    let two = pass_two(bundle, extractions, outcomes);
    let overlay = resolution_of(&two.resolutions, "FR-006", "overlay");
    let cause = Locus::head(
        "ix://agent-ix/config-service/spec",
        "spec/functional/FR-005-config-overlay-entity.md",
    );
    match &overlay.resolution {
        Resolution::Unresolved(Unresolved::Stale(artifact)) => assert_eq!(artifact.id, "FR-005"),
        other => panic!("expected Stale(FR-005), got {other:?}"),
    }
    let stale = with_code(&two.diagnostics, Code::StaleTypeToken);
    assert_eq!(stale.len(), 1, "{:?}", two.diagnostics);
    assert!(stale[0].blocking);
    assert!(stale[0].message.contains("FR-005"), "{}", stale[0].message);
    assert_eq!(
        stale[0].locus,
        Some(Locus::new(
            "ix://agent-ix/config-service/spec",
            "spec/functional/FR-006-config-version-entity.md",
            15,
            3
        ))
    );
    assert_eq!(stale[0].related, vec![cause]);
}

#[trace("TC-1215", "FR-092-AC-6")]
#[test]
fn tc_1215_a_cell_naming_a_legacy_form_artifact_is_stale_with_related_at_the_cause() {
    let (bundle, extractions) = load_business("negatives/STALE_TYPE_TOKEN");
    let one = pass_one(&bundle, &extractions);
    let not_lowered = with_code(&one.diagnostics, Code::ArtifactNotLowered);
    assert_eq!(not_lowered.len(), 1, "{:?}", one.diagnostics);
    assert_eq!(
        not_lowered[0].severity,
        Severity::Warning,
        "legacy-form softens it"
    );
    assert!(!not_lowered[0].blocking);
    assert!(not_lowered[0].message.contains("legacy-form"));
    assert_eq!(
        one.outcomes.get("FR-005"),
        Some(&Outcome::NotLowered {
            cause: not_lowered[0].locus.clone().expect("locus")
        })
    );
    assert_stale_under(&bundle, &extractions, &one.outcomes);
    // The whole lift blocks on the stale token, not on the legacy form.
    let lift = resolve(&bundle, &extractions);
    assert!(is_blocked(&lift.diagnostics));
}

#[trace("TC-1332", "FR-092-AC-11")]
#[test]
fn tc_1332_pass_one_stubbed_to_all_lowered_makes_the_stale_assertion_fail() {
    let (bundle, extractions) = load_business("negatives/STALE_TYPE_TOKEN");
    // The real pass one: the assertion holds.
    let real = pass_one(&bundle, &extractions).outcomes;
    assert_stale_under(&bundle, &extractions, &real);

    // A one-pass implementation cannot know FR-005 produced no definition:
    // model it as every artifact lowered, and the same assertion fails.
    let mut stub = Outcomes::default();
    for id in extractions.artifacts.keys() {
        stub.insert(id.clone(), Outcome::Definition);
    }
    let failed = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        assert_stale_under(&bundle, &extractions, &stub)
    }));
    assert!(
        failed.is_err(),
        "the stubbed pass one must refute the assertion"
    );
    let two = pass_two(&bundle, &extractions, &stub);
    assert_eq!(
        object_ref(&resolution_of(&two.resolutions, "FR-006", "overlay").resolution).id,
        "FR-005",
        "with every artifact lowered the token is a plain Object"
    );
    assert!(with_code(&two.diagnostics, Code::StaleTypeToken).is_empty());
}

#[trace("TC-1216", "FR-092-AC-7")]
#[test]
fn tc_1216_an_enumeration_artifact_resolves_to_enumeration_and_an_entity_of_the_same_title_to_object(
) {
    let (bundle, extractions) = load_business("resolve/enumeration");
    let lift = resolve(&bundle, &extractions);
    assert!(lift.diagnostics.is_empty(), "{:?}", lift.diagnostics);
    let status = resolution_of(&lift.resolutions, "FR-006", "status");
    match &status.resolution {
        Resolution::Enumeration(artifact) => {
            assert_eq!(artifact.id, "EN-001");
            assert_eq!(artifact.path, "spec/functional/EN-001-status.md");
        }
        other => panic!("expected Enumeration(EN-001), got {other:?}"),
    }
    let package = PackageIdentity::from(bundle.package());
    assert_eq!(
        status.resolution.type_ref(&package).as_deref(),
        Some("ix://agent-ix/config-service/type/EN-001")
    );

    let (bundle, extractions) = load_business("resolve/entity-titled-status");
    let lift = resolve(&bundle, &extractions);
    assert!(lift.diagnostics.is_empty(), "{:?}", lift.diagnostics);
    let status = resolution_of(&lift.resolutions, "FR-006", "status");
    assert_eq!(object_ref(&status.resolution).id, "FR-001");
    assert_eq!(
        status.resolution.type_ref(&package).as_deref(),
        Some("ix://agent-ix/config-service/type/FR-001")
    );
}

#[trace("TC-1217", "FR-092-AC-8")]
#[test]
fn tc_1217_an_artifact_titled_string_warns_kernel_name_shadowed_and_the_cell_is_the_kernel_scalar()
{
    let (bundle, extractions) = load_business("negatives/KERNEL_NAME_SHADOWED");
    let lift = resolve(&bundle, &extractions);
    let shadowed = with_code(&lift.diagnostics, Code::KernelNameShadowed);
    assert_eq!(shadowed.len(), 1, "{:?}", lift.diagnostics);
    assert_eq!(shadowed[0].severity, Severity::Warning);
    assert!(!shadowed[0].blocking);
    assert!(
        shadowed[0].message.contains("String"),
        "{}",
        shadowed[0].message
    );
    assert_eq!(
        shadowed[0].locus,
        Some(Locus::head(
            "ix://agent-ix/config-service/spec",
            "spec/functional/FR-007-string.md"
        ))
    );
    assert_eq!(
        resolution_of(&lift.resolutions, "FR-006", "hash").resolution,
        Resolution::KernelScalar(KernelScalar::String)
    );
    assert!(!is_blocked(&lift.diagnostics), "{:?}", lift.diagnostics);
    assert_eq!(
        lift.diagnostics.len(),
        1,
        "the warning is the only diagnostic"
    );
}

/// A mutated token in one of the shapes the engine returns, or none of
/// them.
fn any_target() -> impl Strategy<Value = String> {
    let ident = "[A-Za-z_][A-Za-z0-9_]{0,12}";
    let package = "[a-z][a-z0-9-]{0,6}/[a-z][a-z0-9-]{0,6}";
    prop_oneof![
        proptest::sample::select(
            KernelScalar::ALL
                .iter()
                .map(|k| k.name().to_string())
                .collect::<Vec<_>>()
        ),
        ident.prop_map(|t| format!("ix://agent-ix/config-service/type/{t}")),
        ident.prop_map(|t| format!("ix://agent-ix/config-service/unresolved/{t}")),
        (package, ident).prop_map(|(p, t)| format!("ix://{p}/type/{t}")),
        Just("ix://agent-ix/config-service/type/FR-005".to_string()),
        Just("ix://agent-ix/config-service/type/FR-005".to_string()),
        ".{0,40}",
    ]
}

#[trace("TC-1218", "FR-092-AC-9")]
#[trace("TC-1218", "FR-092-CON-1")]
#[test]
fn tc_1218_256_mutated_tokens_never_panic_and_every_unresolved_maps_to_one_code() {
    let (bundle, extractions) = load_business("negatives/STALE_TYPE_TOKEN");
    let outcomes = pass_one(&bundle, &extractions).outcomes;
    let reasons = proptest::option::of(proptest::sample::select(vec![
        "unknown-token",
        "no-bundle-index",
        "import-unresolved",
        "something-else",
    ]));
    let mut runner = TestRunner::new(Config::with_cases(256));
    runner
        .run(&(any_target(), reasons), |(target, reason)| {
            let companion = reason.map(|r| {
                quire_rs::semantic::SemanticDiagnostic::new(
                    "semantic.unresolved-type",
                    quire_rs::semantic::SemanticSeverity::Advisory,
                    15,
                    format!("type {target:?} resolves to nothing ({r})"),
                )
                .with_reason(r)
            });
            let resolution = classify(&target, companion.as_ref(), &bundle, &outcomes);
            if let Resolution::Unresolved(unresolved) = &resolution {
                let code = unresolved.code();
                let expected = match unresolved {
                    Unresolved::UnknownToken
                    | Unresolved::NoBundleIndex
                    | Unresolved::ImportUnresolved => Code::UnresolvedTypeToken,
                    Unresolved::ImportUnsupported(package) => {
                        prop_assert!(!package.is_empty());
                        Code::ImportUnsupported
                    }
                    Unresolved::Stale(_) => Code::StaleTypeToken,
                };
                prop_assert_eq!(code, expected);
                prop_assert!(unresolved
                    .code()
                    .blocking(agent_ix_extraction_frontend::Disposition::Frontend));
            }
            Ok(())
        })
        .expect("256 mutated tokens classify without a panic");

    // FR-092-CON-1: the enums are closed; the only string-carrying variant
    // is `ImportUnsupported(package)`. Exhaustive matches without a
    // wildcard arm are the static half of the check.
    let carries_string = |u: &Unresolved| -> bool {
        match u {
            Unresolved::UnknownToken | Unresolved::NoBundleIndex | Unresolved::ImportUnresolved => {
                false
            }
            Unresolved::ImportUnsupported(_) => true,
            Unresolved::Stale(artifact) => {
                // An `ArtifactRef` names a bundle artifact the document
                // declares, never a free string.
                assert!(!artifact.id.is_empty());
                false
            }
        }
    };
    let stale = Unresolved::Stale(ArtifactRef {
        id: "FR-005".into(),
        path: "spec/functional/FR-005.md".into(),
        display_name: "ConfigOverlay".into(),
    });
    assert!(!carries_string(&stale));
    assert!(carries_string(&Unresolved::ImportUnsupported(
        "acme/other".into()
    )));
    let _closed = |r: &Resolution| match r {
        Resolution::KernelScalar(_)
        | Resolution::Object(_)
        | Resolution::Enumeration(_)
        | Resolution::Unresolved(_) => (),
    };
}

#[trace("TC-1264", "FR-096-AC-6")]
#[test]
fn tc_1264_sting_at_row_14_carries_locus_path_line_14_column_3_and_the_bundle_source_identity() {
    let (bundle, extractions) = load_business("negatives/UNRESOLVED_TYPE_TOKEN");
    let lift = resolve(&bundle, &extractions);
    let unresolved = with_code(&lift.diagnostics, Code::UnresolvedTypeToken);
    assert_eq!(unresolved.len(), 1, "{:?}", lift.diagnostics);
    let json = serde_json::to_value(unresolved[0]).expect("serialises");
    assert_eq!(
        json["locus"],
        serde_json::json!({
            "sourceIdentity": "ix://agent-ix/config-service/spec",
            "path": "spec/functional/FR-006-config-version-entity.md",
            "startLine": 14,
            "startColumn": 3
        })
    );
    assert_eq!(
        json["code"],
        Value::String(Code::UnresolvedTypeToken.to_string())
    );
    let violations = common::diagnostic_schema_violations(&json, &common::common_schema(), "");
    assert!(violations.is_empty(), "{violations:?}");
    assert_eq!(code_of(unresolved[0]), Some(Code::UnresolvedTypeToken));
}
