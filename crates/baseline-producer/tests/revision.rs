// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-113 controls for the two-member namespaced revision (Plan-017
//! Task-144). Every control reports the number it measured.
//!
//! The oracle of the shape row is the pinned consumer wire contract —
//! `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`,
//! revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which declares
//! `Revision { namespace, value }` and the `NativeSource.revision` authority
//! label this requirement excludes.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    REVISION_NAMESPACE_ABSENT, REVISION_NAMESPACE_SUBSTITUTED, REVISION_NAMESPACE_UNDECLARED,
    REVISION_NAMESPACE_UNKNOWN,
};
use agent_ix_baseline_producer::{
    ConfigurationDocument, DigestDomainSelection, DigestSelection, NativeSourceLabel,
    NumericResourceLimit, RawByteDigest, ResourceLimits, Revision, ADMISSIBLE_REVISION_NAMESPACES,
    NATIVE_REVISION_NAMESPACE, PRODUCER_REVISION_NAMESPACE,
};
use serde_json::json;

/// The two members the pinned consumer `Revision` record declares.
const CONSUMER_REVISION_MEMBERS: [&str; 2] = ["namespace", "value"];

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

/// Tracing: TC-1606
#[test]
fn tc_1606_producer_and_native_revisions_carry_their_two_declared_namespaces() {
    let configuration = configuration();
    // The producer-object classes FR-113 names, each under one namespace.
    let producer_objects = [
        ("model", Revision::producer("1.2.0")),
        ("component", Revision::producer("2026-09-11-1")),
        ("endpoint", Revision::producer("2026-09-11-1")),
        ("relationship", Revision::producer("2026-09-11-1")),
    ];
    let native_objects = [
        ("native-artifact", Revision::native("1.2.0")),
        ("native-definition", Revision::native("1.2.0")),
    ];

    let mut namespaces = BTreeSet::new();
    for (class, revision) in producer_objects.iter().chain(native_objects.iter()) {
        let members: BTreeSet<String> = serde_json::to_value(revision)
            .expect("a revision serializes")
            .as_object()
            .expect("a revision is an object")
            .keys()
            .cloned()
            .collect();
        assert_eq!(
            members,
            CONSUMER_REVISION_MEMBERS
                .iter()
                .map(|member| (*member).to_owned())
                .collect::<BTreeSet<_>>(),
            "{class} carries exactly the pinned consumer Revision members"
        );
        revision
            .validate_selected(&configuration)
            .expect("both declared namespaces are admitted");
        namespaces.insert(revision.namespace.clone());
    }
    for (_, revision) in &producer_objects {
        revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)
            .expect("a producer object revision is in the producer namespace");
    }
    for (_, revision) in &native_objects {
        revision
            .validate_namespace(NATIVE_REVISION_NAMESPACE)
            .expect("a native revision is in the native namespace");
    }
    assert_eq!(
        namespaces.len(),
        2,
        "no third namespace is emitted anywhere"
    );
    assert_eq!(ADMISSIBLE_REVISION_NAMESPACES.len(), 2);

    println!(
        "TC-1606 measured: {} producer-object revisions and {} native revisions over exactly {} namespaces, {} members each",
        producer_objects.len(),
        native_objects.len(),
        namespaces.len(),
        CONSUMER_REVISION_MEMBERS.len()
    );
}

/// Tracing: TC-1607
#[test]
fn tc_1607_a_revision_under_the_other_classs_namespace_refuses() {
    let native_under_producer = Revision::producer("1.2.0");
    let producer_under_native = Revision::native("1.2.0");

    let first = native_under_producer
        .validate_namespace(NATIVE_REVISION_NAMESPACE)
        .expect_err("a native definition revision is not a producer-object revision");
    let second = producer_under_native
        .validate_namespace(PRODUCER_REVISION_NAMESPACE)
        .expect_err("a producer-object revision is not a native definition revision");
    for refusal in [&first, &second] {
        assert_eq!(refusal.code, REVISION_NAMESPACE_SUBSTITUTED);
        assert!(refusal.message.contains("1.2.0"));
    }

    println!("TC-1607 measured: 2 substitution directions, both refused {REVISION_NAMESPACE_SUBSTITUTED}");
}

/// Tracing: TC-1608
#[test]
fn tc_1608_a_bare_revision_string_refuses_and_binds_nothing() {
    let refusal = Revision::from_wire(&json!("1.2.0"))
        .expect_err("a bare revision string is not a revision selection");
    assert_eq!(refusal.code, REVISION_NAMESPACE_ABSENT);
    assert!(refusal.message.contains("1.2.0"));

    let no_namespace_member = Revision::from_wire(&json!({"value": "1.2.0"}))
        .expect_err("a revision object with no namespace member binds nothing");
    assert_eq!(no_namespace_member.code, REVISION_NAMESPACE_ABSENT);

    let empty = Revision::new("", "1.2.0");
    assert_eq!(
        empty
            .validate_vocabulary()
            .expect_err("an empty namespace is not defaulted")
            .code,
        REVISION_NAMESPACE_ABSENT
    );

    println!("TC-1608 measured: 3 namespace-absent forms — bare string, absent member, empty spelling — each refused {REVISION_NAMESPACE_ABSENT}, binding nothing");
}

/// Tracing: TC-1609
#[test]
fn tc_1609_outside_the_vocabulary_and_undeclared_are_two_separate_refusals() {
    let configuration = configuration();
    let outside = Revision::new("some-other-authority/revision-1", "1.2.0");
    assert_eq!(
        outside
            .validate_vocabulary()
            .expect_err("a namespace outside the closed vocabulary refuses")
            .code,
        REVISION_NAMESPACE_UNKNOWN
    );

    let mut narrow = configuration.clone();
    narrow.revision_namespaces = BTreeSet::from([NATIVE_REVISION_NAMESPACE.to_owned()]);
    let inside = Revision::producer("1.2.0");
    inside
        .validate_vocabulary()
        .expect("the undeclared namespace is inside the closed vocabulary");
    let undeclared = inside
        .validate_selected(&narrow)
        .expect_err("an in-vocabulary namespace the configuration does not declare refuses");
    assert_eq!(undeclared.code, REVISION_NAMESPACE_UNDECLARED);
    assert_ne!(undeclared.code, REVISION_NAMESPACE_UNKNOWN);
    inside
        .validate_selected(&configuration)
        .expect("the declared namespace is admitted");

    println!("TC-1609 measured: 2 separate refusals over 1 namespace each — {REVISION_NAMESPACE_UNKNOWN} outside the closed vocabulary, {REVISION_NAMESPACE_UNDECLARED} inside it but undeclared");
}

/// Tracing: TC-1610
#[test]
fn tc_1610_one_value_spelling_under_two_namespaces_stays_two_revisions() {
    let producer = Revision::producer("1.2.0");
    let native = Revision::native("1.2.0");
    assert_eq!(producer.value, native.value);
    assert_ne!(producer, native);
    let distinct: BTreeSet<Revision> = BTreeSet::from([producer.clone(), native.clone()]);
    assert_eq!(
        distinct.len(),
        2,
        "equal value spelling never establishes revision identity across namespaces"
    );

    // The consumer-owned carve-outs on the same locus are admitted beside them.
    let label = NativeSourceLabel::new("ix://agent-ix/quire/source/order-declarations", "1.2.0");
    let digest = RawByteDigest::new(format!("sha256:{}", "c".repeat(64)))
        .expect("a raw-byte digest string is admitted");
    assert_eq!(label.revision, producer.value);
    assert_eq!(digest.as_str().len(), "sha256:".len() + 64);

    println!(
        "TC-1610 measured: 1 value spelling under {} namespaces stayed {} distinct revisions, beside 2 admitted consumer-owned locus members",
        ADMISSIBLE_REVISION_NAMESPACES.len(),
        distinct.len()
    );
}
