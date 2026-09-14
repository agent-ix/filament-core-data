// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-116 controls for the correspondence record and its export mappings
//! (Plan-017 Task-147). Every control reports the number it measured.
//!
//! TC-1623 is a `Compile` control and TC-1630 a `Static` one. Both are carried
//! here rather than as runtime assertions: TC-1623 destructures the producer
//! object exhaustively, so a sixth authored member or a missing one fails the
//! typecheck of this test binary and never reaches the assertions, and the
//! `interface` read itself is a `compile_fail` doctest on
//! `ProducerObjectReference`. TC-1630 scans the two module sources for a consumer
//! `u32` table index with a planted-token control beside it.

use ix_trace_rs::trace;
use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    CORRESPONDENCE_CLOSURE_INCOMPLETE, CORRESPONDENCE_CONFIGURATION_ABSENT,
    CORRESPONDENCE_CONFIGURATION_MISMATCH, CORRESPONDENCE_DUPLICATE_PAIR,
    CORRESPONDENCE_STALE_SELECTION, EXPORT_CROSS_BOUND, EXPORT_FOREIGN,
};
use agent_ix_baseline_producer::{
    select_correspondences, validate_correspondence_set, ArtifactKind, ArtifactReference,
    ComponentDeclaration, ConfigurationDocument, DeclaredExports, DigestDomainSelection,
    DigestSelection, EndpointDeclaration, ExportKind, ExportRecord, FormalDocument,
    InventoryCompleteness, InventoryMembership, Multiplicity, NativeArtifactReference,
    NumericResourceLimit, ProducerNativeCorrespondence, ProducerObjectReference, RawByteDigest,
    ResourceLimits, Revision, SelectedPair, SourceLocus, Span, WireReference,
    ADMISSIBLE_REVISION_NAMESPACES, CANONICAL_JSON_DOMAIN, NATIVE_BYTES_DOMAIN,
};
use serde_json::Value;

const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const MODEL: &str = "ix://agent-ix/commerce/model/order-1-2";
const PROFILE: &str = "ix://agent-ix/quire/profile/order-assessment-1-2";
const NATIVE: &str = "ix://agent-ix/quire/artifact/order-assessment-1-2";
const OTHER_NATIVE: &str = "ix://agent-ix/quire/artifact/order-assessment-1-2-reencoded";
const DEFINITION: &str = "ix://agent-ix/quire/definition/core-assessment-1-2";
const COMPONENT: &str = "ix://agent-ix/commerce/component/orders";
const ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const RELATION: &str = "ix://agent-ix/commerce/binding/order-model-to-quire-artifact";

/// The population of the TC-1630 static scan, as path and source text.
const UNASSIGNED_INDEX_POPULATION: [(&str, &str); 2] = [
    (
        "src/correspondence.rs",
        include_str!("../src/correspondence.rs"),
    ),
    ("src/export.rs", include_str!("../src/export.rs")),
];

/// The consumer `u32` table indices the producer never assigns.
const CONSUMER_TABLE_INDICES: [&str; 5] =
    ["interface", "native", "relation", "exports", "requires"];

fn configuration() -> ConfigurationDocument {
    ConfigurationDocument {
        configuration_identity: "ix://agent-ix/commerce/config/evaluation-default".into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(format!("sha256:{}", "0".repeat(64))),
        model_authority: "ix://agent-ix/commerce/model-authority/primary".into(),
        profile_identities: BTreeSet::new(),
        adapter_identities: BTreeSet::new(),
        mapping_targets: BTreeSet::new(),
        loss_policy: "ix://agent-ix/commerce/loss-policy/refuse".into(),
        resource_limits: ResourceLimits {
            numeric_resource_limit: Some(NumericResourceLimit::new(4096, 6144)),
            declared_bounds: BTreeMap::new(),
        },
        digest_selections: DigestDomainSelection::baseline(),
        revision_namespaces: ADMISSIBLE_REVISION_NAMESPACES
            .iter()
            .map(|namespace| (*namespace).to_owned())
            .collect(),
        trusted_references: BTreeSet::new(),
    }
}

fn locus() -> SourceLocus {
    SourceLocus {
        source: ArtifactReference {
            ref_version: "3".into(),
            kind: ArtifactKind::Source,
            authority: "ix://agent-ix/commerce/model-authority/primary".into(),
            identity: SOURCE_DOCUMENT.into(),
            revision: Revision::producer("2026-09-11-1"),
            digest: RawByteDigest::new(format!("sha256:{}", "d".repeat(64)))
                .expect("a raw-byte digest string is admitted"),
            wire: WireReference {
                identity: "filament-core-data/producer-bundle".into(),
                version: "1.2.0".into(),
            },
        },
        formal: FormalDocument {
            document: "ix://agent-ix/commerce/formal/order-declarations".into(),
            revision: Revision::producer("2026-09-11-1"),
        },
        span: Span {
            start: 64,
            end: 192,
        },
    }
}

fn component() -> ComponentDeclaration {
    ComponentDeclaration {
        component_identity: COMPONENT.into(),
        component_revision: Revision::producer("2026-09-11-1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "1".repeat(64))),
        repository_identity: "ix://agent-ix/commerce/repository/orders".into(),
        repository_revision: Revision::producer("2026-09-11-1"),
        role_identities: BTreeSet::from(["ix://agent-ix/commerce/role/orders".to_owned()]),
        owning_type_identity: "ix://agent-ix/commerce/type/Order".into(),
        source_locus: Some(locus()),
        inventory_membership: InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete),
    }
}

fn endpoint() -> EndpointDeclaration {
    EndpointDeclaration {
        endpoint_identity: ENDPOINT.into(),
        endpoint_revision: Revision::producer("2026-09-11-1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "2".repeat(64))),
        component_identity: COMPONENT.into(),
        type_identity: "ix://agent-ix/commerce/type/Order".into(),
        role: "order".into(),
        multiplicity: Some(Multiplicity {
            lower: 0,
            upper: Some(1),
            ordered: false,
            unique: true,
        }),
        source_locus: Some(locus()),
        inventory_membership: InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete),
    }
}

fn declared() -> DeclaredExports {
    DeclaredExports::new(&[component()], &[endpoint()], &[])
}

fn export(kind: ExportKind, export_identity: &str, producer_object_identity: &str) -> ExportRecord {
    ExportRecord {
        kind,
        producer_object_identity: producer_object_identity.into(),
        export_identity: export_identity.into(),
        export_path: vec!["orders".into(), kind.as_str().into()],
        locus: Some(locus()),
    }
}

fn correspondence() -> ProducerNativeCorrespondence {
    ProducerNativeCorrespondence {
        binding_relation_identity: RELATION.into(),
        producer: ProducerObjectReference {
            object_kind: "model".into(),
            authority: "ix://agent-ix/commerce/model-authority/primary".into(),
            identity: MODEL.into(),
            revision: Revision::producer("1.2.0"),
            digest: DigestSelection::canonical(format!("sha256:{}", "3".repeat(64))),
        },
        native: NativeArtifactReference {
            identity: NATIVE.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "4".repeat(64))),
        },
        native_definition_closure: vec![NativeArtifactReference {
            identity: DEFINITION.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "5".repeat(64))),
        }],
        required_native_definition_identities: BTreeSet::from([DEFINITION.to_owned()]),
        configuration_identity: Some("ix://agent-ix/commerce/config/evaluation-default".into()),
        exports: vec![
            export(ExportKind::Component, COMPONENT, MODEL),
            export(ExportKind::Endpoint, ENDPOINT, MODEL),
        ],
    }
}

fn numeric_members(value: &Value, members: &mut Vec<String>) {
    match value {
        Value::Object(entries) => {
            for (key, entry) in entries {
                if entry.is_number() {
                    members.push(key.clone());
                }
                numeric_members(entry, members);
            }
        }
        Value::Array(entries) => {
            for entry in entries {
                numeric_members(entry, members);
            }
        }
        _ => {}
    }
}

/// One measured consumer-table-index site.
#[derive(Debug, PartialEq, Eq)]
struct IndexSite {
    path: String,
    line: usize,
    text: String,
}

/// Counts declared members whose type is a consumer `u32` table index.
fn audit_indices(path: &str, source: &str) -> Vec<IndexSite> {
    let mut sites = Vec::new();
    for (index, line) in source.lines().enumerate() {
        let trimmed = line.trim();
        let declaration = trimmed.strip_prefix("pub ").unwrap_or(trimmed);
        if !declaration.contains("u32") {
            continue;
        }
        if CONSUMER_TABLE_INDICES
            .iter()
            .any(|member| declaration.starts_with(&format!("{member}:")))
        {
            sites.push(IndexSite {
                path: path.to_owned(),
                line: index + 1,
                text: trimmed.to_owned(),
            });
        }
    }
    sites
}

/// Tracing: TC-1623; FR-116-AC-1, FR-116-CON-1
#[trace("TC-1623", "FR-116-AC-1")]
#[trace("TC-1623", "FR-116-CON-1")]
#[test]
fn tc_1623_one_selected_pair_yields_one_record_of_five_producer_object_members() {
    let configuration = configuration();
    let record = correspondence();
    record
        .validate_authored_members()
        .expect("the five authored producer-object members are present");
    record
        .validate_selections(&configuration)
        .expect("the selections are admitted");
    record
        .validate_exports(&configuration, &declared())
        .expect("the export mappings are admitted");

    // `Compile`: the producer object is destructured exhaustively, with no `..`.
    // A sixth authored member — the consumer's `interface` index above all — or a
    // missing one fails the typecheck of this binary rather than an assertion.
    let ProducerObjectReference {
        object_kind,
        authority,
        identity,
        revision,
        digest,
    } = record.producer.clone();
    assert_eq!(object_kind, "model");
    assert_eq!(authority, "ix://agent-ix/commerce/model-authority/primary");
    assert_eq!(identity, MODEL);
    assert_eq!(revision.value, "1.2.0");
    assert_eq!(digest.domain, CANONICAL_JSON_DOMAIN);

    // Likewise the record itself: every input FR-116 names is a separate member.
    let ProducerNativeCorrespondence {
        binding_relation_identity,
        producer: _,
        native,
        native_definition_closure,
        required_native_definition_identities,
        configuration_identity,
        exports,
    } = record.clone();
    assert_eq!(binding_relation_identity, RELATION);
    assert_eq!(native.identity, NATIVE);
    assert_eq!(native_definition_closure.len(), 1);
    assert_eq!(required_native_definition_identities.len(), 1);
    assert!(configuration_identity.is_some());
    assert_eq!(exports.len(), 2);

    // The emitted producer object carries five members and no interface member.
    let wire = serde_json::to_value(&record.producer).expect("it serializes");
    let emitted: BTreeSet<&String> = wire
        .as_object()
        .expect("the producer object is an object")
        .keys()
        .collect();
    assert_eq!(emitted.len(), 5, "five authored members: {emitted:?}");
    assert!(!emitted.iter().any(|member| *member == "interface"));

    println!(
        "TC-1623 measured: 1 selected pair, 1 correspondence record, {} authored producer-object members and 0 authored interface members, over {} separately readable record members",
        emitted.len(),
        7
    );
}

/// Tracing: TC-1624; FR-116-AC-2
#[trace("TC-1624", "FR-116-AC-2")]
#[test]
fn tc_1624_foreign_and_cross_bound_export_mappings_refuse() {
    let configuration = configuration();
    let declared = declared();

    let mut foreign = correspondence();
    foreign.exports[0].producer_object_identity = PROFILE.into();
    let first = foreign
        .validate_exports(&configuration, &declared)
        .expect_err("an export its named producer object does not export refuses");
    assert_eq!(first.code, EXPORT_FOREIGN);
    assert!(first.message.contains(COMPONENT));

    let mut undeclared = correspondence();
    undeclared.exports[1].export_identity = "ix://agent-ix/commerce/endpoint/not-declared".into();
    assert_eq!(
        undeclared
            .validate_exports(&configuration, &declared)
            .expect_err("an export naming no declared record refuses")
            .code,
        EXPORT_FOREIGN
    );

    // Cross-bound: the same exported record is claimed by a second
    // correspondence's producer object.
    let first_record = correspondence();
    let mut second = correspondence();
    second.binding_relation_identity = "ix://agent-ix/commerce/binding/profile-to-quire".into();
    second.producer.object_kind = "profile".into();
    second.producer.identity = PROFILE.into();
    second.native.identity = OTHER_NATIVE.into();
    second.exports = vec![export(ExportKind::Component, COMPONENT, PROFILE)];
    let refusal = validate_correspondence_set(&[first_record, second], &configuration, &declared)
        .expect_err("an export owned by another correspondence's producer object refuses");
    assert_eq!(refusal.code, EXPORT_CROSS_BOUND);
    assert!(refusal.message.contains(COMPONENT) && refusal.message.contains(PROFILE));

    println!("TC-1624 measured: 3 export refusals — 1 foreign producer object, 1 undeclared export identity, 1 cross-bound export — each naming the offending export");
}

/// Tracing: TC-1625; FR-116-AC-3
#[trace("TC-1625", "FR-116-AC-3")]
#[test]
fn tc_1625_a_changed_selection_under_a_retained_relation_refuses() {
    let prior = correspondence();

    let mut changed_producer = correspondence();
    changed_producer.producer.digest =
        DigestSelection::canonical(format!("sha256:{}", "6".repeat(64)));
    let first = changed_producer
        .validate_against_prior(&prior)
        .expect_err("a changed producer selection under the retained relation refuses");
    assert_eq!(first.code, CORRESPONDENCE_STALE_SELECTION);
    assert!(first.message.contains(RELATION));

    let mut changed_native = correspondence();
    changed_native.native.raw_byte_digest =
        DigestSelection::native_bytes(format!("sha256:{}", "7".repeat(64)));
    assert_eq!(
        changed_native
            .validate_against_prior(&prior)
            .expect_err("a changed native selection under the retained relation refuses")
            .code,
        CORRESPONDENCE_STALE_SELECTION
    );

    correspondence()
        .validate_against_prior(&prior)
        .expect("an unchanged selection under the retained relation is admitted");

    println!("TC-1625 measured: 2 changed selections refused {CORRESPONDENCE_STALE_SELECTION} under 1 retained binding relation, and 1 unchanged selection admitted");
}

/// Tracing: TC-1626; FR-116-AC-3
#[trace("TC-1626", "FR-116-AC-3")]
#[test]
fn tc_1626_a_presentation_only_reencoding_needs_a_new_selection_and_a_new_record() {
    let configuration = configuration();
    let prior = correspondence();

    // Substituting the digest under the retained relation is exactly what is
    // refused, however presentation-only the re-encoding is.
    let mut substituted = correspondence();
    substituted.native.raw_byte_digest =
        DigestSelection::native_bytes(format!("sha256:{}", "8".repeat(64)));
    assert_eq!(
        substituted
            .validate_against_prior(&prior)
            .expect_err("a digest substitution under the retained relation refuses")
            .code,
        CORRESPONDENCE_STALE_SELECTION
    );

    // The admitted route is a new native artifact selection and a new record.
    let mut reencoded = correspondence();
    reencoded.binding_relation_identity =
        "ix://agent-ix/commerce/binding/order-model-to-quire-artifact-reencoded".into();
    reencoded.native.identity = OTHER_NATIVE.into();
    reencoded.native.raw_byte_digest =
        DigestSelection::native_bytes(format!("sha256:{}", "8".repeat(64)));
    reencoded
        .validate_against_prior(&prior)
        .expect("a new record under a new relation is not a stale selection");
    reencoded
        .validate_selections(&configuration)
        .expect("the new native selection is admitted");
    assert_ne!(reencoded.selected_pair(), prior.selected_pair());

    println!("TC-1626 measured: 1 refused digest substitution under a retained relation, and 1 admitted re-encoding carrying a new native artifact selection and a new correspondence record");
}

/// Tracing: TC-1627; FR-116-AC-4, FR-116-AC-5
#[trace("TC-1627", "FR-116-AC-4")]
#[trace("TC-1627", "FR-116-AC-5")]
#[test]
fn tc_1627_absent_provenance_and_an_incomplete_closure_refuse() {
    let configuration = configuration();

    let mut no_provenance = correspondence();
    no_provenance.configuration_identity = None;
    let first = no_provenance
        .validate_selections(&configuration)
        .expect_err("a record without its authorizing configuration provenance refuses");
    assert_eq!(first.code, CORRESPONDENCE_CONFIGURATION_ABSENT);
    assert!(first.message.contains(RELATION));

    let mut other_provenance = correspondence();
    other_provenance.configuration_identity = Some("ix://agent-ix/commerce/config/other".into());
    assert_eq!(
        other_provenance
            .validate_selections(&configuration)
            .expect_err("a record naming another configuration refuses")
            .code,
        CORRESPONDENCE_CONFIGURATION_MISMATCH
    );

    let mut incomplete = correspondence();
    incomplete.native_definition_closure.clear();
    let third = incomplete
        .validate_selections(&configuration)
        .expect_err("an incomplete native definition closure refuses");
    assert_eq!(third.code, CORRESPONDENCE_CLOSURE_INCOMPLETE);
    assert!(third.message.contains(DEFINITION));

    println!("TC-1627 measured: 3 refusals — absent configuration provenance, mismatched provenance, incomplete native definition closure — each naming the absent or foreign member");
}

/// Tracing: TC-1628; FR-116-AC-6, FR-116-AC-7, FR-116-CON-4
#[trace("TC-1628", "FR-116-AC-6")]
#[trace("TC-1628", "FR-116-AC-7")]
#[trace("TC-1628", "FR-116-CON-4")]
#[test]
fn tc_1628_a_duplicated_pair_refuses_both_records_and_an_unselected_object_yields_none() {
    let configuration = configuration();
    let declared = declared();

    let first = correspondence();
    let mut duplicate = correspondence();
    duplicate.binding_relation_identity =
        "ix://agent-ix/commerce/binding/order-model-to-quire-artifact-again".into();
    let refusal = validate_correspondence_set(
        &[first.clone(), duplicate.clone()],
        &configuration,
        &declared,
    )
    .expect_err("two records naming one selected pair refuse");
    assert_eq!(refusal.code, CORRESPONDENCE_DUPLICATE_PAIR);
    assert!(
        refusal.message.contains(&first.binding_relation_identity)
            && refusal
                .message
                .contains(&duplicate.binding_relation_identity),
        "both records are named: {}",
        refusal.message
    );

    // A producer object the consumer does not select yields no record at all.
    let mut unselected = correspondence();
    unselected.binding_relation_identity = "ix://agent-ix/commerce/binding/profile-to-quire".into();
    unselected.producer.identity = PROFILE.into();
    unselected.native.identity = OTHER_NATIVE.into();
    let selected = BTreeSet::from([SelectedPair::new(MODEL, NATIVE)]);
    let offered = [first, unselected];
    let emitted =
        select_correspondences(&offered, &selected).expect("one selected pair yields one record");
    assert_eq!(emitted.len(), 1);
    assert_eq!(emitted[0].producer.identity, MODEL);

    println!(
        "TC-1628 measured: 1 duplicated pair refusing {} records by name, and 1 unselected producer object yielding {} correspondence records",
        2, 0
    );
}

/// Tracing: TC-1629; FR-116-AC-8, FR-116-AC-9, FR-116-CON-2
#[trace("TC-1629", "FR-116-AC-8")]
#[trace("TC-1629", "FR-116-AC-9")]
#[trace("TC-1629", "FR-116-CON-2")]
#[test]
fn tc_1629_every_export_mapping_carries_its_identity_kind_path_and_locus() {
    let configuration = configuration();
    let record = correspondence();
    record
        .validate_exports(&configuration, &declared())
        .expect("both export mappings are admitted");

    let wire = serde_json::to_value(&record).expect("it serializes");
    let exports = wire["exports"].as_array().expect("exports is an array");
    assert_eq!(exports.len(), 2);
    for export in exports {
        for member in [
            "kind",
            "producerObjectIdentity",
            "exportIdentity",
            "exportPath",
            "locus",
        ] {
            assert!(export.get(member).is_some(), "{member} is carried");
        }
        let path = export["exportPath"].as_array().expect("ordered segments");
        assert!(!path.is_empty());
        assert!(export["locus"]["formal"]["revision"]["value"].is_string());
        assert!(export.get("index").is_none() && export.get("interface").is_none());
    }

    // The emitted kinds are the consumer's closed vocabulary, and the assessment
    // side's `population` kind is not among them — it is not a variant at all.
    let emitted: BTreeSet<&str> = ExportKind::EMITTED
        .iter()
        .map(|kind| kind.as_str())
        .collect();
    assert_eq!(emitted.len(), 11);
    assert!(!emitted.contains("population"));

    println!(
        "TC-1629 measured: {} export mappings each carrying 5 members, over an emitted export-kind vocabulary of {} kinds, 0 of which is the assessment-side population kind, and 0 consumer table indices",
        exports.len(),
        emitted.len()
    );
}

/// Tracing: TC-1630; FR-116-CON-3, FR-116-CON-5
#[trace("TC-1630", "FR-116-CON-3")]
#[trace("TC-1630", "FR-116-CON-5")]
#[test]
fn tc_1630_distinct_digest_members_and_no_assigned_consumer_index() {
    // Coinciding hash text never merges the two digest classes.
    let text = format!("sha256:{}", "9".repeat(64));
    let producer = DigestSelection::canonical(text.clone());
    let native = DigestSelection::native_bytes(text.clone());
    assert_eq!(producer.value, native.value);
    assert_ne!(producer, native);
    assert_eq!(producer.domain, CANONICAL_JSON_DOMAIN);
    assert_eq!(native.domain, NATIVE_BYTES_DOMAIN);

    let mut coinciding = correspondence();
    coinciding.producer.digest = producer.clone();
    coinciding.native.raw_byte_digest = native.clone();
    coinciding
        .validate_selections(&configuration())
        .expect("one hash text under the two domains is two admitted members");
    // Substituting one for the other still refuses, so the coinciding text is
    // never read as evidence that the two members are the same digest.
    let mut substituted = coinciding.clone();
    substituted.native.raw_byte_digest = producer.clone();
    assert_eq!(
        substituted
            .validate_selections(&configuration())
            .expect_err("the canonical selection is still not a native raw-byte selection")
            .code,
        agent_ix_baseline_producer::refusal::DIGEST_DOMAIN_SUBSTITUTED
    );

    // `Static`: no member of the emitted record is a consumer `u32` table index.
    let record = correspondence();
    let mut numeric = Vec::new();
    numeric_members(
        &serde_json::to_value(&record).expect("it serializes"),
        &mut numeric,
    );
    for member in &numeric {
        assert!(
            member == "start" || member == "end",
            "the only numeric members are the consumer Span byte offsets, not table indices: {member}"
        );
    }
    for index in CONSUMER_TABLE_INDICES {
        assert!(
            !numeric.iter().any(|member| member == index),
            "{index} is assigned by the consumer, never here"
        );
    }

    let mut sites = Vec::new();
    let mut lines = 0;
    for (path, source) in UNASSIGNED_INDEX_POPULATION {
        lines += source.lines().count();
        sites.extend(audit_indices(path, source));
    }
    assert!(
        sites.is_empty(),
        "the correspondence and export modules declare {} consumer table index member(s): {sites:#?}",
        sites.len()
    );

    // The planted-token control: a scratch copy carrying one assigned index is
    // measured as one site, so the zero above is a measurement.
    let planted = UNASSIGNED_INDEX_POPULATION[0].1.replace(
        "    /// Producer object kind (for example `model` or `profile`).",
        "    /// scratch\n    pub interface: u32,\n    /// Producer object kind (for example `model` or `profile`).",
    );
    let planted_sites = audit_indices("src/correspondence.rs (scratch copy)", &planted);
    assert_eq!(
        planted_sites.len(),
        1,
        "the planted index is measured: {planted_sites:#?}"
    );
    assert!(planted_sites[0].text.contains("interface: u32"));

    println!(
        "TC-1630 measured: 1 coinciding hash text over 2 distinct digest members, {} numeric wire members (all consumer Span byte offsets), {} files and {lines} lines scanned for the {} consumer table indices with {} site(s) found, and {} site(s) on the planted scratch copy",
        numeric.len(),
        UNASSIGNED_INDEX_POPULATION.len(),
        CONSUMER_TABLE_INDICES.len(),
        sites.len(),
        planted_sites.len()
    );
}
