//! FR-095 source and package envelope identity and version checks.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::envelope::{self, ModuleManifest};
use agent_ix_extraction_frontend::{Bundle, Envelope};
use ix_trace_rs::trace;
use proptest::prelude::*;
use serde_json::json;

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/fixture-domain")
}

fn extra_module() -> PathBuf {
    fixture("modules/objects-extra")
}

/// Load `root` under `roots` and read every module's manifest bytes the way
/// the eventual `lift` will: from `<root>/manifest.yaml` of each root the
/// caller named, in the caller's order.
fn load(root: &Path, roots: &[&Path]) -> (Bundle, Vec<ModuleManifest>) {
    let bundle =
        Bundle::load(root, roots).unwrap_or_else(|r| panic!("{} refused: {r}", root.display()));
    let modules = roots
        .iter()
        .map(|root| {
            let name = bundle
                .semantic_modules()
                .keys()
                .find(|name| {
                    root.file_name()
                        .is_some_and(|dir| dir.to_string_lossy() == name.as_str())
                })
                .expect("the module root's directory is the module name");
            ModuleManifest::from_bundle(&bundle, name).expect("loaded module")
        })
        .collect();
    (bundle, modules)
}

fn load_table() -> (Bundle, Vec<ModuleManifest>) {
    load(&fixture("snapshot-table"), &[&business_module()])
}

fn write(path: &Path, text: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("mkdir");
    }
    fs::write(path, text).unwrap_or_else(|e| panic!("write {}: {e}", path.display()));
}

/// A one-entity bundle whose `spec.md` carries `version` when given.
fn bundle_with_version(dir: &Path, version: Option<&str>) {
    let version = version
        .map(|v| format!("version: {v}\n"))
        .unwrap_or_default();
    write(
        &dir.join("spec/spec.md"),
        &format!(
            "---\ntype: master-requirements\nname: docs-service\norg: agent-ix\n{version}title: Spec\n---\n# Spec\n"
        ),
    );
    fs::create_dir_all(dir.join("spec/functional")).expect("mkdir");
    fs::copy(
        fixture("snapshot-table/spec/functional/FR-005-snapshot-group-entity.md"),
        dir.join("spec/functional/FR-005-snapshot-group-entity.md"),
    )
    .expect("copy FR-005");
}

#[trace("TC-1246", "FR-095-AC-1")]
#[trace("TC-1246", "FR-095-CON-3")]
#[test]
fn tc_1246_snapshot_table_carries_the_bundle_identity_and_the_spec_bundle_dialect() {
    let (bundle, modules) = load_table();
    let envelope = Envelope::new(&bundle, &modules);
    assert_eq!(envelope.source.identity, "ix://agent-ix/docs-service/spec");
    assert_eq!(envelope.source.dialect, "spec-bundle");
    assert_eq!(envelope.package.identity, "agent-ix/docs-service");
    // FR-095-CON-3: `spec-bundle` is the only value the frontend stamps.
    assert_eq!(envelope::DIALECT, "spec-bundle");
    let source = serde_json::to_value(&envelope.source).expect("json");
    assert_eq!(source["dialect"], "spec-bundle");
    let src = fs::read_to_string(crate_dir().join("src/envelope.rs")).expect("envelope.rs");
    assert!(
        !src.contains("\"typespec\""),
        "the frontend never widens frontendDialect"
    );
}

#[trace("TC-1247", "FR-095-AC-2")]
#[test]
fn tc_1247_spec_md_version_is_the_source_and_package_version_and_defaults_to_0_0_0() {
    let versioned = tempfile::tempdir().expect("tempdir");
    bundle_with_version(versioned.path(), Some("2.1.0"));
    let (bundle, modules) = load(versioned.path(), &[&business_module()]);
    let envelope = Envelope::new(&bundle, &modules);
    assert_eq!(envelope.source.version, "2.1.0");
    assert_eq!(envelope.package.version, "2.1.0");

    let unversioned = tempfile::tempdir().expect("tempdir");
    bundle_with_version(unversioned.path(), None);
    let (bundle, modules) = load(unversioned.path(), &[&business_module()]);
    let envelope = Envelope::new(&bundle, &modules);
    assert_eq!(envelope.source.version, "0.0.0");
    assert_eq!(envelope.package.version, "0.0.0");
    assert_eq!(envelope::DEFAULT_VERSION, "0.0.0");

    // The committed fixture carries no version.
    let (bundle, _) = load_table();
    assert_eq!(envelope::source_version(&bundle), "0.0.0");
}

#[trace("TC-1248", "FR-095-AC-3")]
#[test]
fn tc_1248_source_omits_digest_when_a_document_changes() {
    let root = fixture("snapshot-table");
    let (bundle, modules) = load(&root, &[&business_module()]);
    let source = serde_json::to_value(Envelope::new(&bundle, &modules).source).expect("json");
    assert_eq!(source.as_object().expect("object").len(), 3);
    assert!(source.get("digest").is_none());

    let scratch = tempfile::tempdir().expect("tempdir");
    bundle_with_version(scratch.path(), None);
    let path = scratch
        .path()
        .join("spec/functional/FR-005-snapshot-group-entity.md");
    let mut bytes = fs::read(&path).expect("read");
    bytes.push(b' ');
    fs::write(&path, bytes).expect("write");
    let (changed, modules) = load(scratch.path(), &[&business_module()]);
    let changed = serde_json::to_value(Envelope::new(&changed, &modules).source).expect("json");
    assert_eq!(changed, source);
}

#[trace("TC-1249", "FR-095-AC-4")]
#[test]
fn tc_1249_package_omits_digests_with_one_or_two_modules() {
    for roots in [
        vec![business_module()],
        vec![business_module(), extra_module()],
    ] {
        let refs: Vec<&Path> = roots.iter().map(PathBuf::as_path).collect();
        let (bundle, modules) = load(&fixture("snapshot-table"), &refs);
        let package = serde_json::to_value(Envelope::new(&bundle, &modules).package).expect("json");
        let package = package.as_object().expect("object");
        assert_eq!(package.len(), 4);
        assert!(!package.contains_key("manifestDigest"));
        assert!(!package.contains_key("lockDigest"));
    }
}

#[trace("TC-1250", "FR-095-AC-5")]
#[test]
fn tc_1250_mapping_versions_is_the_contract_version_and_every_other_list_is_empty() {
    let (bundle, modules) = load_table();
    let envelope = Envelope::new(&bundle, &modules);
    assert_eq!(envelope.package.mapping_versions, ["1.0.0"]);
    assert!(envelope.package.profile_versions.is_empty());
    assert!(envelope.occurrences.is_empty());
    assert!(envelope.extensions.is_empty());
    let value = serde_json::to_value(&envelope).expect("json");
    assert_eq!(value["package"]["mappingVersions"], json!(["1.0.0"]));
    assert_eq!(value["package"]["profileVersions"], json!([]));
    assert_eq!(value["occurrences"], json!([]));
    assert_eq!(value["extensions"], json!([]));
    let package = value["package"].as_object().expect("object");
    let mut keys: Vec<&String> = package.keys().collect();
    keys.sort();
    assert_eq!(
        keys,
        ["identity", "mappingVersions", "profileVersions", "version"],
        "exactly the members semantic-ir.schema.json#/properties/package requires"
    );
}

#[trace("TC-1256", "FR-095-AC-11")]
#[test]
fn tc_1256_package_versions_ignore_module_root_order() {
    let root = fixture("snapshot-table");
    let (bundle, forward) = load(&root, &[&business_module(), &extra_module()]);
    let (_, backward) = load(&root, &[&extra_module(), &business_module()]);
    let block = envelope::package_block(&bundle, &forward);
    assert_eq!(block, envelope::package_block(&bundle, &backward));
    assert_eq!(block.mapping_versions, ["1.0.0"]);
    assert_eq!(block.profile_versions, [] as [&str; 0]);
    let names: Vec<String> = bundle.semantic_modules().keys().cloned().collect();
    assert_eq!(names, ["fixture-domain", "objects-extra"]);
    assert!(bundle.object_type("widget").is_some());

    proptest!(ProptestConfig::with_cases(64), |(order in Just(forward.clone()).prop_shuffle())| {
        prop_assert_eq!(envelope::package_block(&bundle, &order), block.clone());
    });
}
