//! FR-095 "The `source` block" and "The `package` block": every digest is
//! recomputed outside the crate with `sha256sum`.

use std::fs;
use std::path::{Path, PathBuf};

mod common;

use agent_ix_extraction_frontend::envelope::{self, ModuleManifest};
use agent_ix_extraction_frontend::{Bundle, Envelope};
use common::sha256sum;
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
            let bytes = fs::read(root.join("manifest.yaml")).expect("manifest.yaml");
            let name = bundle
                .semantic_modules()
                .keys()
                .find(|name| {
                    root.file_name()
                        .is_some_and(|dir| dir.to_string_lossy() == name.as_str())
                })
                .expect("the module root's directory is the module name");
            ModuleManifest::from_bundle(&bundle, name, bytes).expect("loaded module")
        })
        .collect();
    (bundle, modules)
}

fn load_table() -> (Bundle, Vec<ModuleManifest>) {
    load(&fixture("config-version-table"), &[&business_module()])
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
            "---\ntype: master-requirements\nname: config-service\norg: agent-ix\n{version}title: Spec\n---\n# Spec\n"
        ),
    );
    fs::create_dir_all(dir.join("spec/functional")).expect("mkdir");
    fs::copy(
        fixture("config-version-table/spec/functional/FR-005-config-overlay-entity.md"),
        dir.join("spec/functional/FR-005-config-overlay-entity.md"),
    )
    .expect("copy FR-005");
}

fn copy_tree(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("mkdir");
    for entry in fs::read_dir(from).expect("read_dir") {
        let entry = entry.expect("entry");
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), &target).expect("copy");
        }
    }
}

#[trace("TC-1246", "FR-095-AC-1")]
#[trace("TC-1246", "FR-095-CON-3")]
#[test]
fn tc_1246_config_version_table_carries_the_bundle_identity_and_the_spec_bundle_dialect() {
    let (bundle, modules) = load_table();
    let envelope = Envelope::new(&bundle, &modules);
    assert_eq!(
        envelope.source.identity,
        "ix://agent-ix/config-service/spec"
    );
    assert_eq!(envelope.source.dialect, "spec-bundle");
    assert_eq!(envelope.package.identity, "agent-ix/config-service");
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
fn tc_1248_source_digest_is_sha256sum_over_path_nul_bytes_nul_and_one_byte_flips_it() {
    let root = fixture("config-version-table");
    let (bundle, _) = load(&root, &[&business_module()]);
    let block = envelope::source_block(&bundle);

    // The recipe assembled outside the crate: every loaded document's path
    // in code-point order, from the bytes on disk.
    let mut paths: Vec<&str> = bundle.documents().iter().map(|d| d.path()).collect();
    paths.sort_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    assert_eq!(
        paths,
        [
            "spec/functional/FR-005-config-overlay-entity.md",
            "spec/functional/FR-006-config-version-entity.md",
            "spec/spec.md"
        ]
    );
    let mut recipe = Vec::new();
    for path in &paths {
        recipe.extend_from_slice(path.as_bytes());
        recipe.push(0);
        recipe.extend_from_slice(&fs::read(root.join(path)).expect("document bytes"));
        recipe.push(0);
    }
    assert_eq!(block.digest, format!("sha256:{}", sha256sum(&recipe)));

    // One byte of one document changes the digest.
    let scratch = tempfile::tempdir().expect("tempdir");
    copy_tree(&root, scratch.path());
    let target = scratch
        .path()
        .join("spec/functional/FR-005-config-overlay-entity.md");
    let mut bytes = fs::read(&target).expect("read");
    let last = bytes.len() - 1;
    // The trailing newline becomes a space: still a document, one byte off.
    assert_eq!(bytes[last], b'\n');
    bytes[last] = b' ';
    fs::write(&target, &bytes).expect("write");
    let (changed, _) = load(scratch.path(), &[&business_module()]);
    let changed = envelope::source_block(&changed);
    assert_ne!(changed.digest, block.digest);
    assert_eq!(changed.identity, block.identity);
}

#[trace("TC-1249", "FR-095-AC-4")]
#[test]
fn tc_1249_manifest_digest_and_lock_digest_equal_sha256sum_computed_outside_the_crate() {
    let (bundle, modules) = load_table();
    let block = envelope::package_block(&bundle, &modules);

    let manifest = fs::read(business_module().join("manifest.yaml")).expect("manifest");
    let manifest_hex = sha256sum(&manifest);
    assert_eq!(block.manifest_digest, format!("sha256:{manifest_hex}"));

    let lines = format!("fixture/domain@0.1.0:{manifest_hex}\n");
    assert_eq!(
        block.lock_digest,
        format!("sha256:{}", sha256sum(lines.as_bytes()))
    );

    // With two modules the lines sort by code point, whatever the caller's order.
    let (bundle, modules) = load(
        &fixture("config-version-table"),
        &[&business_module(), &extra_module()],
    );
    let block = envelope::package_block(&bundle, &modules);
    let extra_hex = sha256sum(&fs::read(extra_module().join("manifest.yaml")).expect("manifest"));
    let lines =
        format!("agent-ix/objects-extra@0.1.0:{extra_hex}\nfixture/domain@0.1.0:{manifest_hex}\n");
    assert_eq!(
        block.lock_digest,
        format!("sha256:{}", sha256sum(lines.as_bytes()))
    );
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
        [
            "identity",
            "lockDigest",
            "manifestDigest",
            "mappingVersions",
            "profileVersions",
            "version"
        ],
        "exactly the members semantic-ir.schema.json#/properties/package requires"
    );
}

#[trace("TC-1256", "FR-095-AC-11")]
#[test]
fn tc_1256_manifest_digest_covers_both_manifests_in_name_order_whatever_the_root_order() {
    let root = fixture("config-version-table");
    let (bundle, forward) = load(&root, &[&business_module(), &extra_module()]);
    let (_, backward) = load(&root, &[&extra_module(), &business_module()]);
    let block = envelope::package_block(&bundle, &forward);
    assert_eq!(block, envelope::package_block(&bundle, &backward));

    let mut concat = fs::read(business_module().join("manifest.yaml")).expect("business");
    concat.extend(fs::read(extra_module().join("manifest.yaml")).expect("objects-extra"));
    assert_eq!(
        block.manifest_digest,
        format!("sha256:{}", sha256sum(&concat)),
        "fixture-domain sorts before objects-extra"
    );
    let single = envelope::package_block(&bundle, &forward[..1]);
    assert_ne!(single.manifest_digest, block.manifest_digest);

    let names: Vec<String> = bundle.semantic_modules().keys().cloned().collect();
    assert_eq!(names, ["fixture-domain", "objects-extra"]);
    assert!(bundle.object_type("widget").is_some());

    // Property: any permutation of the caller's module list yields the same
    // package block.
    proptest!(ProptestConfig::with_cases(64), |(order in Just(forward.clone()).prop_shuffle())| {
        prop_assert_eq!(envelope::package_block(&bundle, &order), block.clone());
    });
}
