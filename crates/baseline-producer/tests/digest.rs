// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX

//! Traced FR-112 controls for the four-member digest selection (Plan-017
//! Task-144). Every control reports the number it measured.
//!
//! The oracle of the shape rows is the pinned consumer wire contract —
//! `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`,
//! revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, which declares
//! `SelectedDigest { domain, version, algorithm, value }`. That contract is
//! read-only context here: this crate maps onto it member for member and never
//! edits it (FND-1760).

use ix_trace_rs::trace;
use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    DIGEST_DOMAIN_SUBSTITUTED, DIGEST_DOMAIN_UNKNOWN, DIGEST_MISMATCH, DIGEST_SELECTION_UNDECLARED,
    DIGEST_VALUE_MALFORMED, DIGEST_VERSION_ABSENT, DIGEST_VERSION_UNKNOWN,
};
use agent_ix_baseline_producer::{
    canonical_digest, ArrayDeclarations, CanonicalPolicy, ConfigurationDocument,
    DigestDomainSelection, DigestSelection, NativeSourceLabel, NumericResourceLimit,
    ProducerDecimal, RawByteDigest, ResourceLimits, Revision, ADMISSIBLE_DIGEST_SELECTIONS,
    ADMISSIBLE_REVISION_NAMESPACES, CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION,
    NATIVE_BYTES_DOMAIN,
};
use serde_json::{json, Value};

/// The four members the pinned consumer `SelectedDigest` record declares.
const CONSUMER_SELECTED_DIGEST_MEMBERS: [&str; 4] = ["algorithm", "domain", "value", "version"];

fn policy() -> CanonicalPolicy {
    CanonicalPolicy::new(
        NumericResourceLimit::new(4096, 6144),
        ArrayDeclarations::baseline(),
    )
}

/// A configuration document declaring both admissible selections.
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

fn members(selection: &DigestSelection) -> BTreeSet<String> {
    serde_json::to_value(selection)
        .expect("a digest selection serializes")
        .as_object()
        .expect("a digest selection is an object")
        .keys()
        .cloned()
        .collect()
}

/// Every ordering of one object's members, as transmitted JSON text.
fn wire_orders(entries: &[(&str, Value)]) -> Vec<String> {
    fn permute(entries: &[(&str, Value)], prefix: Vec<(String, Value)>, out: &mut Vec<String>) {
        if entries.is_empty() {
            let text = prefix
                .iter()
                .map(|(key, value)| format!("{}:{value}", Value::String(key.clone())))
                .collect::<Vec<_>>()
                .join(",");
            out.push(format!("{{{text}}}"));
            return;
        }
        for (index, entry) in entries.iter().enumerate() {
            let mut rest = entries.to_vec();
            rest.remove(index);
            let mut next = prefix.clone();
            next.push((entry.0.to_owned(), entry.1.clone()));
            permute(&rest, next, out);
        }
    }
    let mut out = Vec::new();
    permute(entries, Vec::new(), &mut out);
    out
}

/// Tracing: TC-1600; FR-112-AC-1, FR-112-CON-3
#[trace("TC-1600", "FR-112-AC-1")]
#[trace("TC-1600", "FR-112-CON-3")]
#[test]
fn tc_1600_every_authored_digest_is_the_four_member_selection() {
    let canonical = canonical_digest(
        &json!({"modelIdentity": "ix://agent-ix/commerce/model/order-1-2"}),
        &policy(),
    )
    .expect("a canonical-object digest computes");
    let native = DigestSelection::native_bytes(format!("sha256:{}", "a".repeat(64)));

    for selection in [&canonical, &native] {
        assert_eq!(
            members(selection),
            CONSUMER_SELECTED_DIGEST_MEMBERS
                .iter()
                .map(|member| (*member).to_owned())
                .collect::<BTreeSet<_>>(),
            "a producer-authored digest carries exactly the pinned consumer SelectedDigest members"
        );
        assert_eq!(selection.algorithm, "sha256");
        assert_eq!(selection.version, DIGEST_DOMAIN_VERSION);
        selection
            .validate_selected(&configuration())
            .expect("both declared selections are admitted");
    }
    assert_eq!(canonical.domain, CANONICAL_JSON_DOMAIN);
    assert_eq!(native.domain, NATIVE_BYTES_DOMAIN);

    // `version` is authored, not supplied by the domain spelling: one domain
    // under a second version is a different selection, and no reader of the
    // domain can produce the version (FR-112-CON-3).
    let mut second_version = canonical.clone();
    second_version.version = "2".into();
    assert_ne!(second_version, canonical);
    assert_eq!(second_version.domain, canonical.domain);
    assert_eq!(
        second_version
            .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)
            .expect_err("a version the domain did not supply is not admitted by the domain")
            .code,
        DIGEST_VERSION_UNKNOWN
    );

    println!(
        "TC-1600 measured: 2 digest classes, {} members each, matching the {} pinned consumer SelectedDigest members, and 1 authored version member no domain spelling supplies",
        members(&canonical).len(),
        CONSUMER_SELECTED_DIGEST_MEMBERS.len()
    );
}

/// Tracing: TC-1601; FR-112-AC-2
#[trace("TC-1601", "FR-112-AC-2")]
#[test]
fn tc_1601_a_digest_offered_in_the_other_domain_refuses() {
    let canonical = canonical_digest(
        &json!({"x": ProducerDecimal::new("1.5").expect("lexeme")}),
        &policy(),
    )
    .expect("a canonical-object digest computes");
    let native = DigestSelection::native_bytes(canonical.value.clone());

    let canonical_in_native = canonical
        .validate_domain(NATIVE_BYTES_DOMAIN, DIGEST_DOMAIN_VERSION)
        .expect_err("a canonical-object digest is not a native raw-byte digest");
    let native_in_canonical = native
        .validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)
        .expect_err("a native raw-byte digest is not a canonical-object digest");
    for refusal in [&canonical_in_native, &native_in_canonical] {
        assert_eq!(refusal.code, DIGEST_DOMAIN_SUBSTITUTED);
        // Blocking, and not an invitation to revalidate in the other domain or
        // to refetch: the refusal names the offending selection and stops.
        assert!(refusal.message.contains("sha256:"));
        assert!(!refusal.message.contains("retry") && !refusal.message.contains("refetch"));
    }
    // Matching hash text is never evidence of equivalence: the two selections
    // stay distinct members with one `value`.
    assert_eq!(canonical.value, native.value);
    assert_ne!(canonical, native);

    println!("TC-1601 measured: 2 substitution directions, both refused {DIGEST_DOMAIN_SUBSTITUTED}, over 1 coinciding hash text");
}

/// Tracing: TC-1602; FR-112-AC-3
#[trace("TC-1602", "FR-112-AC-3")]
#[test]
fn tc_1602_a_recomputed_value_differing_from_the_declared_value_refuses() {
    let document = json!({"modelIdentity": "ix://agent-ix/commerce/model/order-1-2"});
    let declared = canonical_digest(&document, &policy()).expect("a digest computes");
    let recomputed = canonical_digest(
        &json!({"modelIdentity": "ix://agent-ix/commerce/model/order-1-3"}),
        &policy(),
    )
    .expect("a digest computes");

    declared
        .require_recomputed(&canonical_digest(&document, &policy()).expect("a digest computes"))
        .expect("the same bytes recompute the same value");
    let refusal = declared
        .require_recomputed(&recomputed)
        .expect_err("a differing recomputed value refuses");
    assert_eq!(refusal.code, DIGEST_MISMATCH);
    assert!(refusal.message.contains(&declared.value));
    assert!(refusal.message.contains(&recomputed.value));

    println!("TC-1602 measured: 1 agreeing recomputation admitted, 1 differing recomputation refused {DIGEST_MISMATCH} blocking, naming both values");
}

/// Tracing: TC-1603; FR-112-AC-4, FR-112-AC-5, FR-112-CON-1, FR-112-CON-5
#[trace("TC-1603", "FR-112-AC-4")]
#[trace("TC-1603", "FR-112-AC-5")]
#[trace("TC-1603", "FR-112-CON-1")]
#[trace("TC-1603", "FR-112-CON-5")]
#[test]
fn tc_1603_absent_unknown_unselected_and_bare_digests_refuse() {
    let configuration = configuration();

    // An absent `version` member on the wire.
    let three_members = json!({
        "algorithm": "sha256",
        "domain": CANONICAL_JSON_DOMAIN,
        "value": format!("sha256:{}", "0".repeat(64)),
    });
    assert_eq!(
        DigestSelection::from_wire(&three_members)
            .expect_err("a three-member digest binds nothing")
            .code,
        DIGEST_VERSION_ABSENT
    );

    // A domain outside the closed admissible vocabulary, and a version outside it.
    let mut unknown_domain = DigestSelection::canonical(format!("sha256:{}", "0".repeat(64)));
    unknown_domain.domain = "some-other-domain-1".into();
    assert_eq!(
        unknown_domain
            .validate_vocabulary()
            .expect_err("an unknown domain binds nothing")
            .code,
        DIGEST_DOMAIN_UNKNOWN
    );
    let mut unknown_version = DigestSelection::canonical(format!("sha256:{}", "0".repeat(64)));
    unknown_version.version = "9".into();
    assert_eq!(
        unknown_version
            .validate_vocabulary()
            .expect_err("an unknown version binds nothing")
            .code,
        DIGEST_VERSION_UNKNOWN
    );

    // An in-vocabulary pair the configuration document does not select. This is
    // a separate refusal from the two above (FND-1723).
    let mut narrow = configuration.clone();
    narrow.digest_selections = BTreeSet::from([DigestDomainSelection::new(
        NATIVE_BYTES_DOMAIN,
        DIGEST_DOMAIN_VERSION,
    )]);
    let canonical = DigestSelection::canonical(format!("sha256:{}", "0".repeat(64)));
    canonical
        .validate_vocabulary()
        .expect("the unselected pair is inside the closed vocabulary");
    assert_eq!(
        canonical
            .validate_selected(&narrow)
            .expect_err("an unselected in-vocabulary pair binds nothing")
            .code,
        DIGEST_SELECTION_UNDECLARED
    );
    canonical
        .validate_selected(&configuration)
        .expect("the declared pair is admitted");

    // A bare hash string offered in place of a selection.
    assert_eq!(
        DigestSelection::from_wire(&json!(format!("sha256:{}", "0".repeat(64))))
            .expect_err("a bare hash string binds nothing")
            .code,
        DIGEST_VALUE_MALFORMED
    );

    println!("TC-1603 measured: 5 refusals over 4 axes — absent version, unknown domain, unknown version, unselected in-vocabulary pair, bare hash — each binding nothing");
}

/// Tracing: TC-1604; FR-112-AC-6, FR-112-CON-4
#[trace("TC-1604", "FR-112-AC-6")]
#[trace("TC-1604", "FR-112-CON-4")]
#[test]
fn tc_1604_the_consumer_owned_locus_members_are_admitted() {
    // `ArtifactRef.digest` is one raw-byte digest string, and
    // `NativeSource.revision` is an editable authority label. Neither is a
    // producer-authored selection and neither refuses (FR-112-CON-4,
    // FR-112-AC-6, FR-113-CON-4).
    let artifact_digest = RawByteDigest::new(format!("sha256:{}", "b".repeat(64)))
        .expect("a raw-byte digest string is admitted");
    assert_eq!(
        serde_json::to_value(&artifact_digest).expect("it serializes"),
        json!(format!("sha256:{}", "b".repeat(64))),
        "the carve-out is one string, not a four-member object"
    );
    let native_source =
        NativeSourceLabel::new("ix://agent-ix/quire/source/order-declarations", "draft-7");
    assert_eq!(native_source.revision, "draft-7");

    // The same text offered as a producer-authored selection still refuses,
    // which is what makes the carve-out a scope boundary rather than a hole.
    assert_eq!(
        DigestSelection::from_wire(&json!(artifact_digest.as_str()))
            .expect_err("the producer authors no bare-string digest")
            .code,
        DIGEST_VALUE_MALFORMED
    );
    assert_eq!(
        Revision::from_wire(&json!(native_source.revision.clone()))
            .expect_err("the producer authors no bare-string revision")
            .code,
        agent_ix_baseline_producer::refusal::REVISION_NAMESPACE_ABSENT
    );

    println!("TC-1604 measured: 2 consumer-owned locus members admitted (1 raw-byte digest string, 1 editable authority label), and 2 producer-authored refusals over the same text");
}

/// Tracing: TC-1605; FR-112-AC-7, FR-112-CON-2
#[trace("TC-1605", "FR-112-AC-7")]
#[trace("TC-1605", "FR-112-CON-2")]
#[test]
fn tc_1605_one_object_under_every_wire_member_order_yields_one_digest_value() {
    let entries = [
        (
            "modelIdentity",
            json!("ix://agent-ix/commerce/model/order-1-2"),
        ),
        (
            "profileIdentity",
            json!("ix://agent-ix/quire/profile/order-assessment-1-2"),
        ),
        (
            "revision",
            json!({"namespace": "filament-core-data/producer-object-revision-1", "value": "1.2.0"}),
        ),
        (
            "limit",
            serde_json::from_str::<Value>("0.1000000000000000055511151231257827")
                .expect("an exact lexeme parses"),
        ),
    ];
    let orders = wire_orders(&entries);
    assert_eq!(
        orders.len(),
        24,
        "every transmitted member order is measured"
    );

    let mut digests = BTreeSet::new();
    for text in &orders {
        let value: Value = serde_json::from_str(text).expect("each transmitted order parses");
        digests.insert(
            canonical_digest(&value, &policy())
                .expect("a canonical digest computes")
                .value,
        );
    }
    assert_eq!(
        digests.len(),
        1,
        "the digest input is the FR-118 canonical byte string, never the transmitted member order"
    );
    // The pairs the configuration selects are the closed vocabulary's, so the
    // digest that came back is one of the two admissible selections.
    assert_eq!(ADMISSIBLE_DIGEST_SELECTIONS.len(), 2);

    println!(
        "TC-1605 measured: {} transmitted member orders of 1 producer object yielded {} distinct digest value(s)",
        orders.len(),
        digests.len()
    );
}
