// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX

//! Traced Task-140 controls for the Baseline 1.2.0 producer boundary.

use agent_ix_baseline_producer::assessment::{
    AssessmentBundle, AvailabilityDisposition, DecisiveDisposition, FieldMemberState,
    WindowCoverage,
};
use agent_ix_baseline_producer::refusal;
use agent_ix_baseline_producer::{
    canonical_digest, canonical_json, configuration_digest, document_digest, ArrayDeclarations,
    CanonicalPolicy, DefaultKind, DigestSelection, LegacyV1Field, NativeArtifactReference,
    NumericResourceLimit, ProducerNativeCorrespondence, ProducerObjectReference, Revision,
    V1Projection, CANONICAL_JSON_DOMAIN, NATIVE_BYTES_DOMAIN,
};
use serde_json::json;

/// The declared canonical policy these Plan-016 controls canonicalize under.
///
/// FR-118 takes every numeric limit from the configuration document, so a test
/// that canonicalizes a bare value declares the limit the same way a
/// configuration document does.
fn policy() -> CanonicalPolicy {
    CanonicalPolicy::new(
        NumericResourceLimit::new(4096, 6144),
        ArrayDeclarations::baseline(),
    )
}

fn fixture() -> AssessmentBundle {
    AssessmentBundle::from_json(include_bytes!(
        "../../../fixtures/baseline-1-2/relationship-population-a.json"
    ))
    .expect("fixture A is a valid producer bundle")
}

fn refresh_population_digest(bundle: &mut AssessmentBundle) {
    bundle.population.digest =
        document_digest(&bundle.population, &policy()).expect("population digest computes");
    bundle.closure.population_digest = Some(bundle.population.digest.clone());
}

fn refresh_model_digest(bundle: &mut AssessmentBundle) {
    bundle.model.digest = document_digest(&bundle.model, &policy()).expect("model digest computes");
    bundle.closure.model_digest = bundle.model.digest.clone();
    for correspondence in &mut bundle.correspondences {
        correspondence.producer.digest = bundle.model.digest.clone();
    }
}

fn refresh_window_digest(bundle: &mut AssessmentBundle) {
    bundle.window.digest =
        document_digest(&bundle.window, &policy()).expect("window digest computes");
    bundle.closure.window_digest = Some(bundle.window.digest.clone());
}

/// Tracing: TC-1373, TC-1374
#[test]
fn tc_1373_1374_preserves_authored_presence_and_member_states() {
    let bundle = fixture();
    assert_eq!(
        configuration_digest(&bundle.configuration).expect("digest computes"),
        bundle.configuration.digest
    );
    assert_eq!(
        document_digest(&bundle.model, &policy()).expect("model digest computes"),
        bundle.model.digest
    );
    assert_eq!(
        document_digest(&bundle.population, &policy()).expect("population digest computes"),
        bundle.population.digest
    );
    assert_eq!(
        document_digest(&bundle.window, &policy()).expect("window digest computes"),
        bundle.window.digest
    );
    bundle.validate().expect("fixture A validates");
    let order = &bundle.population.members[0];
    assert!(
        matches!(order.fields["ix://agent-ix/commerce/field/Order-labels"], FieldMemberState::PresentValue(ref values) if values.is_empty())
    );
    assert!(matches!(
        order.fields["ix://agent-ix/commerce/field/Order-note"],
        FieldMemberState::PresentNull
    ));

    let mut absent_optional = bundle.clone();
    absent_optional.population.members[0]
        .fields
        .remove("ix://agent-ix/commerce/field/Order-note");
    refresh_population_digest(&mut absent_optional);
    absent_optional
        .validate()
        .expect("optional 1..1 member may be absent");

    let mut absent_required = bundle;
    absent_required.population.members[0]
        .fields
        .remove("ix://agent-ix/commerce/field/Order-labels");
    refresh_population_digest(&mut absent_required);
    assert_eq!(
        absent_required
            .validate()
            .expect_err("required member cannot be absent")
            .code,
        "REQUIRED_MEMBER_ABSENT"
    );

    let mut invalid = fixture();
    invalid.population.members[0].fields.insert(
        "ix://agent-ix/commerce/field/Order-note".into(),
        FieldMemberState::Invalid {
            reason: "source-schema-violation".into(),
        },
    );
    refresh_population_digest(&mut invalid);
    assert_eq!(
        invalid
            .validate()
            .expect_err("invalid input remains explicit and is not absence")
            .code,
        "INVALID_MEMBER"
    );

    let mut semantic_default = fixture();
    let field = semantic_default
        .model
        .types
        .get_mut("ix://agent-ix/commerce/type/Order")
        .expect("fixture type exists")
        .fields
        .get_mut("ix://agent-ix/commerce/field/Order-note")
        .expect("fixture field exists");
    field.default_kind = DefaultKind::Semantic;
    field.default_value = Some(json!("none"));
    refresh_model_digest(&mut semantic_default);
    semantic_default
        .validate()
        .expect("semantic default is distinct and valid");

    let note = &fixture().model.types["ix://agent-ix/commerce/type/Order"].fields
        ["ix://agent-ix/commerce/field/Order-note"];
    assert!(matches!(
        note.v1_projection(),
        V1Projection::Refused(ref refusal) if refusal.code == "PRESENCE_PROJECTION_LOSS"
    ));
    let mut historical_presence = note.clone();
    historical_presence.presence = agent_ix_baseline_producer::Presence::Required;
    assert_eq!(historical_presence.v1_projection(), V1Projection::Accepted);
    let mut ordered = historical_presence.clone();
    ordered.multiplicity.ordered = true;
    assert!(matches!(
        ordered.v1_projection(),
        V1Projection::Refused(ref refusal) if refusal.code == "FIELD_PROJECTION_LOSS"
    ));
    let mut unique = historical_presence;
    unique.multiplicity.unique = true;
    assert!(matches!(
        unique.v1_projection(),
        V1Projection::Refused(ref refusal) if refusal.code == "FIELD_PROJECTION_LOSS"
    ));
    let legacy = LegacyV1Field {
        field_identity: note.field_identity.clone(),
        multiplicity: note.multiplicity.clone(),
        nullable: note.nullable,
    };
    assert_eq!(
        legacy
            .project_to_baseline()
            .expect_err("v1.1 does not establish authored presence")
            .code,
        "SOURCE_PRESENCE_LOSS"
    );
}

/// Tracing: TC-1375
#[test]
fn tc_1375_fixture_a_has_a_first_class_relationship_with_distinct_endpoints() {
    let bundle = fixture();
    let relationship = &bundle.relationships[0];
    assert_ne!(
        relationship.source.endpoint_identity,
        relationship.target.endpoint_identity
    );
    assert_ne!(
        relationship.source.multiplicity,
        relationship.target.multiplicity
    );
    assert!(relationship.semantics.composite);
    assert_eq!(
        bundle
            .project_relationship_to_field(&relationship.relationship_identity, true, false)
            .expect_err("field projection loses the target endpoint role")
            .code,
        "RELATIONSHIP_ENDPOINT_ROLE_LOSS"
    );

    let mut cycle = bundle;
    cycle.relationships[0].target.type_identity =
        cycle.relationships[0].source.type_identity.clone();
    assert_eq!(
        cycle
            .validate()
            .expect_err("composite self-cycle refuses")
            .code,
        "COMPOSITE_CYCLE"
    );
}

/// Tracing: TC-1376, TC-1378
#[test]
fn tc_1376_1378_retains_finite_members_records_and_half_open_window() {
    let bundle = fixture();
    bundle.validate().expect("fixture A validates");
    assert_eq!(
        bundle.observation_records[0].member_object_identity,
        bundle.observation_records[1].member_object_identity
    );
    assert_eq!(bundle.window.observation_record_identities.len(), 3);

    let mut dangling = bundle;
    dangling.population.relationship_instances[0].target_object_identity =
        "ix://agent-ix/commerce/object/missing".into();
    refresh_population_digest(&mut dangling);
    assert_eq!(
        dangling
            .validate()
            .expect_err("dangling exact endpoint refuses")
            .code,
        "DANGLING_RELATIONSHIP_ENDPOINT"
    );

    let mut wrong_type = fixture();
    wrong_type.population.relationship_instances[0].target_object_identity =
        "ix://agent-ix/commerce/object/order-1001".into();
    refresh_population_digest(&mut wrong_type);
    assert_eq!(
        wrong_type
            .validate()
            .expect_err("relationship endpoint type is not inferred")
            .code,
        "RELATIONSHIP_ENDPOINT_TYPE_MISMATCH"
    );

    let mut outside_universe = fixture();
    outside_universe.population.members[0].object_identity =
        "ix://agent-ix/commerce/object/outside-universe".into();
    refresh_population_digest(&mut outside_universe);
    assert_eq!(
        outside_universe
            .validate()
            .expect_err("member outside an explicit closed universe refuses")
            .code,
        "OBJECT_OUTSIDE_CLOSED_WORLD"
    );

    let mut unknown_record_member = fixture();
    unknown_record_member.observation_records[2].member_object_identity =
        "ix://agent-ix/commerce/object/missing".into();
    assert_eq!(
        unknown_record_member
            .validate()
            .expect_err("record member must be an exact finite-population member")
            .code,
        "UNKNOWN_RECORD_MEMBER"
    );
}

/// Tracing: TC-1377
#[test]
fn tc_1377_retains_unavailable_record_identity_without_a_truth_coercion() {
    let bundle = fixture();
    let fact = &bundle.availability[0];
    assert_eq!(
        fact.observation_record_identity,
        "ix://agent-ix/commerce/observation/order-1001-5"
    );
    assert_eq!(fact.reason, "upstream-delivery-report-unavailable");
    assert!(bundle
        .window
        .observation_record_identities
        .contains(&fact.observation_record_identity));

    let unaffected = bundle
        .assess_declared_support(
            DecisiveDisposition::Satisfied,
            &["ix://agent-ix/commerce/observation/order-1001-4".into()],
        )
        .expect("unrelated unavailable record does not erase a decisive result");
    assert_eq!(unaffected.disposition, AvailabilityDisposition::Satisfied);
    assert!(unaffected.availability_incomplete);
    assert!(unaffected.unavailable_support_record_identities.is_empty());

    let required = bundle
        .assess_declared_support(
            DecisiveDisposition::Satisfied,
            &["ix://agent-ix/commerce/observation/order-1001-5".into()],
        )
        .expect("known unavailable record is retained as support");
    assert_eq!(required.disposition, AvailabilityDisposition::Unavailable);
    assert_eq!(
        required.unavailable_support_record_identities,
        vec!["ix://agent-ix/commerce/observation/order-1001-5"]
    );
}

/// Tracing: TC-1378
#[test]
fn tc_1378_accepts_each_declared_clock_family_and_refuses_substitution() {
    let event = WindowCoverage::EventPosition {
        start_inclusive: 4,
        end_exclusive: 7,
    };
    let sample = WindowCoverage::FixedSample {
        epoch: "2026-09-10T00:00:00Z".into(),
        period_numerator: 1,
        period_denominator: 10,
        unit: "s".into(),
        start_inclusive: 4,
        end_exclusive: 7,
    };
    let timestamp = WindowCoverage::Timestamp {
        start_inclusive: "2026-09-10T00:00:00Z".into(),
        end_exclusive: "2026-09-10T01:00:00Z".into(),
    };
    for coverage in [&event, &sample, &timestamp] {
        coverage
            .require_clock_family(coverage.clock_family())
            .expect("declared family remains exact");
    }
    assert_eq!(
        event
            .require_clock_family("timestamp")
            .expect_err("clock conversion is not inferred")
            .code,
        "CLOCK_FAMILY_MISMATCH"
    );

    let mut fixed_sample = fixture();
    fixed_sample.window.coverage = sample;
    refresh_window_digest(&mut fixed_sample);
    fixed_sample
        .validate()
        .expect("fixed sample half-open coverage validates without conversion");

    let mut timestamp_window = fixture();
    timestamp_window.window.coverage = timestamp;
    refresh_window_digest(&mut timestamp_window);
    timestamp_window
        .validate()
        .expect("timestamp half-open coverage validates without conversion");

    let mut malformed_timestamp = fixture();
    malformed_timestamp.window.coverage = WindowCoverage::Timestamp {
        start_inclusive: "not-a-timestamp".into(),
        end_exclusive: "2026-09-10T01:00:00Z".into(),
    };
    refresh_window_digest(&mut malformed_timestamp);
    assert_eq!(
        malformed_timestamp
            .validate()
            .expect_err("timestamps must be UTC RFC 3339 instants")
            .code,
        "INVALID_TIMESTAMP"
    );
}

/// Tracing: TC-1379
#[test]
fn tc_1379_refuses_unknown_profile_before_population_evaluation() {
    let mut bundle = fixture();
    bundle.population.profile_identity = "ix://agent-ix/quire/profile/unknown".into();
    refresh_population_digest(&mut bundle);
    assert_eq!(
        bundle.validate().expect_err("unknown profile refuses").code,
        "UNKNOWN_PROFILE"
    );

    let mut no_configuration = serde_json::to_value(fixture()).expect("fixture serializes");
    no_configuration
        .as_object_mut()
        .expect("producer bundle is an object")
        .remove("configuration");
    assert_eq!(
        AssessmentBundle::from_json(
            &serde_json::to_vec(&no_configuration).expect("modified fixture serializes"),
        )
        .expect_err("configuration is required and never ambient")
        .code,
        "INVALID_PRODUCER_DOCUMENT"
    );
}

/// Tracing: TC-1379
#[test]
fn tc_1379_configuration_content_digest_changes_with_only_a_resource_limit() {
    let bundle = fixture();
    let original = configuration_digest(&bundle.configuration).expect("original digest");
    let mut changed = bundle.configuration;
    changed.resource_limits.numeric_resource_limit = Some(NumericResourceLimit::new(2048, 6144));
    assert_ne!(
        configuration_digest(&changed).expect("changed digest"),
        original
    );
}

/// Tracing: TC-1373, TC-1379
#[test]
fn tc_1373_1379_parser_refuses_unknown_fields_and_oversize_inputs() {
    let unknown = br#"{"baselineVersion":"1.2.0","unexpected":true}"#;
    assert_eq!(
        AssessmentBundle::from_json(unknown)
            .expect_err("unknown field refuses")
            .code,
        "INVALID_PRODUCER_DOCUMENT"
    );
    assert_eq!(
        AssessmentBundle::from_json(&vec![b' '; 1_048_577])
            .expect_err("oversize input refuses")
            .code,
        "DOCUMENT_RESOURCE_LIMIT"
    );
}

/// Tracing: TC-1381
#[test]
fn tc_1381_keeps_producer_and_native_digest_domains_distinct() {
    let fixture_a = fixture();
    let fixture_correspondence = &fixture_a.correspondences[0];
    assert_eq!(
        fixture_correspondence.producer.identity,
        fixture_a.model.model_identity
    );
    assert_eq!(
        fixture_correspondence.producer.digest,
        fixture_a.model.digest
    );
    assert_eq!(
        fixture_correspondence.native.raw_byte_digest.domain,
        NATIVE_BYTES_DOMAIN
    );

    let producer = canonical_digest(&json!({"n": 9007199254740993_u64}), &policy())
        .expect("exact producer digest");
    let native = DigestSelection::native_bytes(
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    let correspondence = ProducerNativeCorrespondence {
        binding_relation_identity: "ix://agent-ix/commerce/binding/model-to-profile".into(),
        producer: ProducerObjectReference {
            object_kind: "model".into(),
            authority: "ix://agent-ix/commerce/model-authority/primary".into(),
            identity: "ix://agent-ix/commerce/model/order-1-2".into(),
            revision: Revision::producer("1.2.0"),
            digest: producer.clone(),
        },
        native: NativeArtifactReference {
            identity: "ix://agent-ix/quire/profile/order-assessment-1-2".into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: native.clone(),
        },
        native_definition_closure: vec![],
        required_native_definition_identities: Default::default(),
        configuration_identity: Some("ix://agent-ix/commerce/config/evaluation-default".into()),
        exports: vec![],
    };
    correspondence
        .validate_selections(&fixture_a.configuration)
        .expect("named domains validate");
    let mut substituted = correspondence;
    substituted.native.raw_byte_digest = producer;
    assert_eq!(
        substituted
            .validate_selections(&fixture_a.configuration)
            .expect_err("domain substitution refuses")
            .code,
        refusal::DIGEST_DOMAIN_SUBSTITUTED
    );
}

/// Tracing: TC-1373, TC-1381
#[test]
fn tc_1373_1381_canonical_decimal_is_exact_and_never_binary64() {
    assert_eq!(
        canonical_json(&json!(1), &policy()).unwrap(),
        canonical_json(&serde_json::from_str("1.0").unwrap(), &policy()).unwrap()
    );
    assert_eq!(
        canonical_json(&serde_json::from_str("1e0").unwrap(), &policy()).unwrap(),
        "1"
    );
    assert_ne!(
        canonical_digest(&json!(9007199254740992_u64), &policy()).unwrap(),
        canonical_digest(&json!(9007199254740993_u64), &policy()).unwrap()
    );
    assert_eq!(
        canonical_digest(&json!({"x": 1}), &policy())
            .unwrap()
            .domain,
        CANONICAL_JSON_DOMAIN
    );
    assert_eq!(
        canonical_json(&json!("\u{0008}\n\\\""), &policy()).unwrap(),
        "\"\\u0008\\u000a\\\\\\\"\""
    );
}
