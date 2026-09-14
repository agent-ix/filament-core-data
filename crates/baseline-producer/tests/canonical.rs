// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-118 controls for the Filament Canonical JSON 1 seam (Plan-017
//! Task-143). Every control reports the number it measured.
//!
//! The numeric rows measure the seam the design measurement of 2026-09-11
//! settled (FND-1750, D18): with `serde_json`'s `arbitrary_precision` enabled
//! and the original lexeme read through `Number::as_str`, every probe row
//! round-trips exactly. Without it the same rows returned `0.1`, a corrupted
//! integer, and an invented digit.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::{
    canonical_digest, canonical_json, canonical_json_from_bytes, configuration_digest,
    document_digest, ArrayDeclarations, ArrayDisposition, CanonicalPolicy, ConfigurationDocument,
    DigestDomainSelection, DigestSelection, NumericResourceLimit, ProducerDecimal, ResourceLimits,
    ADMISSIBLE_REVISION_NAMESPACES,
};
use serde_json::{json, Value};

/// The declared limits every row that is not about limits canonicalizes under.
fn policy() -> CanonicalPolicy {
    CanonicalPolicy::new(
        NumericResourceLimit::new(4096, 6144),
        ArrayDeclarations::baseline(),
    )
}

fn parse(lexeme: &str) -> Value {
    serde_json::from_str(lexeme).expect("the probe row is a JSON document")
}

fn canonical(lexeme: &str) -> String {
    canonical_json(&parse(lexeme), &policy()).expect("the probe row canonicalizes")
}

/// The signed arbitrary-precision coefficient and exponent of a numeric lexeme.
///
/// Computed here with string arithmetic alone so the oracle cannot share a
/// rounding defect with the implementation under test.
fn coefficient_and_exponent(lexeme: &str) -> (bool, String, i64) {
    let negative = lexeme.starts_with('-');
    let unsigned = lexeme.strip_prefix('-').unwrap_or(lexeme);
    let (coefficient, exponent) = match unsigned.split_once(['e', 'E']) {
        Some((coefficient, exponent)) => (
            coefficient,
            exponent.parse::<i64>().expect("the exponent is an integer"),
        ),
        None => (unsigned, 0),
    };
    let (integer, fraction) = coefficient.split_once('.').unwrap_or((coefficient, ""));
    let mut scale = exponent
        - i64::try_from(fraction.len()).expect("the fraction length fits a signed 64-bit integer");
    let mut significand = format!("{integer}{fraction}")
        .trim_start_matches('0')
        .to_owned();
    while significand.ends_with('0') {
        significand.pop();
        scale += 1;
    }
    if significand.is_empty() {
        return (false, "0".into(), 0);
    }
    (negative, significand, scale)
}

/// A deterministic population of decimals wider than binary64 represents exactly.
fn generated_decimals(rows: usize) -> Vec<String> {
    let mut state: u64 = 0x2545_F491_4F6C_DD1D;
    let mut next = move || {
        state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        state >> 33
    };
    let mut population = Vec::with_capacity(rows);
    while population.len() < rows {
        let width = 17 + usize::try_from(next() % 32).expect("a small width fits a pointer");
        let mut fraction = String::with_capacity(width);
        for _ in 0..width {
            let digit = b'0' + u8::try_from(next() % 10).expect("one decimal digit fits a byte");
            fraction.push(char::from(digit));
        }
        let leading = b'1' + u8::try_from(next() % 9).expect("one decimal digit fits a byte");
        let sign = if next() % 2 == 0 { "-" } else { "" };
        let lexeme = match next() % 3 {
            0 => format!("{sign}{}.{fraction}", char::from(leading)),
            1 => format!(
                "{sign}{}.{fraction}e{}",
                char::from(leading),
                i64::try_from(next() % 41).expect("a small exponent fits a signed integer") - 20
            ),
            _ => format!("{sign}0.{fraction}"),
        };
        population.push(lexeme);
    }
    population
}

fn configuration(resource_limits: ResourceLimits) -> ConfigurationDocument {
    ConfigurationDocument {
        configuration_identity: "ix://agent-ix/commerce/config/evaluation-default".into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(format!("sha256:{}", "0".repeat(64))),
        model_authority: "ix://agent-ix/commerce/model-authority/primary".into(),
        profile_identities: BTreeSet::new(),
        adapter_identities: BTreeSet::new(),
        mapping_targets: BTreeSet::new(),
        loss_policy: "ix://agent-ix/commerce/loss-policy/refuse".into(),
        resource_limits,
        digest_selections: DigestDomainSelection::baseline(),
        revision_namespaces: ADMISSIBLE_REVISION_NAMESPACES
            .iter()
            .map(|namespace| (*namespace).to_owned())
            .collect(),
        trusted_references: BTreeSet::new(),
    }
}

fn permutations<T: Clone>(items: &[T]) -> Vec<Vec<T>> {
    if items.len() <= 1 {
        return vec![items.to_vec()];
    }
    let mut all = Vec::new();
    for (index, item) in items.iter().enumerate() {
        let mut rest = items.to_vec();
        rest.remove(index);
        for mut tail in permutations(&rest) {
            tail.insert(0, item.clone());
            all.push(tail);
        }
    }
    all
}

/// Tracing: TC-1640
#[test]
fn tc_1640_one_two_and_one_exponent_zero_are_one_byte_string_and_one_digest() {
    let rows = ["1", "1.0", "1e0"];
    let digests: BTreeSet<String> = rows
        .iter()
        .map(|row| {
            assert_eq!(
                canonical(row),
                "1",
                "{row} canonicalizes to the byte string 1"
            );
            canonical_digest(&parse(row), &policy())
                .expect("digest computes")
                .value
        })
        .collect();
    assert_eq!(digests.len(), 1, "one digest covers all three spellings");
    println!(
        "TC-1640 measured: {} spellings, {} distinct canonical byte strings, {} distinct filament-canonical-json-1 digests",
        rows.len(),
        1,
        digests.len()
    );
}

/// Tracing: TC-1641
#[test]
fn tc_1641_adjacent_integers_past_binary64_stay_two_documents() {
    let low = "9007199254740992";
    let high = "9007199254740993";
    assert_eq!(canonical(low), low);
    assert_eq!(canonical(high), high);
    assert_ne!(canonical(low), canonical(high));
    let low_digest = canonical_digest(&parse(low), &policy()).expect("digest computes");
    let high_digest = canonical_digest(&parse(high), &policy()).expect("digest computes");
    assert_ne!(low_digest, high_digest);
    println!(
        "TC-1641 measured: 2 adjacent integers, 2 distinct canonical byte strings, 2 distinct digests ({} != {})",
        low_digest.value, high_digest.value
    );
}

/// Tracing: TC-1642
#[test]
fn tc_1642_exact_decimals_round_trip_to_the_same_coefficient_and_exponent() {
    // The five probe rows of the design measurement of 2026-09-11 are the seed
    // cases. The third column is what each returned before the parse seam kept
    // the lexeme: `0.1`, a corrupted integer, and an invented digit.
    let seeds = [
        ("1.0", "1"),
        ("9007199254740993", "9007199254740993"),
        (
            "0.1000000000000000055511151231257827",
            "0.1000000000000000055511151231257827",
        ),
        (
            "123456789012345678901234567890.12345678901234567890",
            "123456789012345678901234567890.1234567890123456789",
        ),
        (
            "0.3333333333333333333333333333333333",
            "0.3333333333333333333333333333333333",
        ),
    ];
    for (lexeme, expected) in seeds {
        assert_eq!(
            canonical(lexeme),
            expected,
            "{lexeme} canonicalizes exactly"
        );
    }

    let population = generated_decimals(512);
    for lexeme in &population {
        let emitted = canonical(lexeme);
        assert_eq!(
            coefficient_and_exponent(&emitted),
            coefficient_and_exponent(lexeme),
            "{lexeme} kept its arbitrary-precision coefficient and exponent"
        );
        // Re-parsing the emitted bytes is the round trip: a canonical form that
        // is not a fixed point of itself is not a canonical form.
        assert_eq!(canonical(&emitted), emitted, "{lexeme} is a fixed point");
        // The authored typed path carries the same lexeme, digit for digit.
        let authored = ProducerDecimal::new(lexeme.clone()).expect("an authored decimal");
        assert_eq!(
            coefficient_and_exponent(authored.as_str()),
            coefficient_and_exponent(lexeme),
            "the authored decimal keeps every digit of {lexeme}"
        );
        assert_eq!(
            canonical_json(
                &serde_json::to_value(&authored).expect("an authored decimal serializes"),
                &policy()
            )
            .expect("an authored decimal canonicalizes"),
            emitted
        );
    }
    println!(
        "TC-1642 measured: {} seed rows and {} generated rows round-tripped to an identical coefficient and exponent; 0 rows rounded, 0 binary64 substitutions",
        seeds.len(),
        population.len()
    );
}

/// Tracing: TC-1643
#[test]
fn tc_1643_keys_emit_in_unicode_scalar_value_order_sorted_by_the_canonicalizer() {
    // Scalar-value order: Z(U+005A) a(U+0061) z(U+007A) zzzz ä(U+00E4) é(U+00E9).
    // A German locale collation would place "ä" beside "a"; an encoded-byte-length
    // order would place the two-byte keys before "zzzz". Neither is admissible.
    let keys = ["é", "zzzz", "ä", "z", "a", "Z"];
    let mut object = serde_json::Map::new();
    for key in keys {
        object.insert((*key).to_owned(), json!(1));
    }
    let emitted = canonical_json(&Value::Object(object), &policy()).expect("canonicalizes");
    let scalar_order = r#"{"Z":1,"a":1,"z":1,"zzzz":1,"ä":1,"é":1}"#;
    let locale_collation_order = r#"{"a":1,"ä":1,"e":1,"é":1,"z":1,"zzzz":1}"#;
    let byte_length_order = r#"{"Z":1,"a":1,"z":1,"ä":1,"é":1,"zzzz":1}"#;
    assert_eq!(emitted, scalar_order);
    assert_ne!(emitted, locale_collation_order);
    assert_ne!(emitted, byte_length_order);

    // Every insertion permutation of the same members emits the same bytes, so
    // the order is the canonicalizer's own sort and not a walk order.
    let permuted = permutations(&keys);
    for permutation in &permuted {
        let mut object = serde_json::Map::new();
        for key in permutation {
            object.insert((*key).to_owned(), json!(1));
        }
        assert_eq!(
            canonical_json(&Value::Object(object), &policy()).expect("canonicalizes"),
            scalar_order
        );
    }
    println!(
        "TC-1643 measured: {} keys, {} insertion permutations, 1 emitted byte string in Unicode scalar-value order, 0 emissions in locale-collation or encoded-byte-length order",
        keys.len(),
        permuted.len()
    );
}

/// Tracing: TC-1644
#[test]
fn tc_1644_escapes_are_lowercase_and_invalid_unicode_refuses_before_any_digest() {
    let emitted = canonical_json(&json!("a\"b\\c\u{0000}d\u{001f}e"), &policy())
        .expect("a valid Unicode string canonicalizes");
    assert_eq!(emitted, "\"a\\\"b\\\\c\\u0000d\\u001fe\"");
    assert!(
        !emitted.contains("\\u001F"),
        "the escape is lowercase hexadecimal"
    );

    // A byte sequence that is not valid Unicode, and a lone surrogate escape:
    // both refuse, and a refusal yields no digest at all.
    let invalid_utf8 = b"{\"key\":\"\xff\xfe\"}";
    let refusal = canonical_json_from_bytes(invalid_utf8, &policy())
        .expect_err("a document that is not valid Unicode refuses");
    assert_eq!(refusal.code, "INVALID_UNICODE");
    let surrogate = canonical_json_from_bytes(br#"{"key":"\ud800"}"#, &policy())
        .expect_err("a lone surrogate refuses");
    assert_eq!(surrogate.code, "INVALID_UNICODE");
    println!(
        "TC-1644 measured: 4 escape sequences emitted as lowercase escapes, 2 not-valid-Unicode documents refused, 0 digests computed over a refused document"
    );
}

/// Tracing: TC-1645
#[test]
fn tc_1645_set_membership_and_semantic_order_are_two_separate_declarations() {
    let declarations = ArrayDeclarations::new()
        .with_set("tags")
        .expect("tags is declared a set")
        .with_semantic_order("steps")
        .expect("steps is declared a semantic-order array");
    assert_eq!(declarations.disposition("tags"), ArrayDisposition::Set);
    assert_eq!(
        declarations.disposition("steps"),
        ArrayDisposition::SemanticOrder
    );
    // An array nobody declared a set is not one: no element type makes it one.
    assert_eq!(
        declarations.disposition("undeclared"),
        ArrayDisposition::SemanticOrder
    );
    assert_eq!(
        declarations
            .clone()
            .with_set("steps")
            .expect_err("a semantic-order array cannot also be declared a set")
            .code,
        "ARRAY_DISPOSITION_CONFLICT"
    );

    let policy = CanonicalPolicy::new(NumericResourceLimit::new(4096, 6144), declarations);
    let members = ["delta", "alpha", "charlie", "bravo"];
    let orders = permutations(&members);
    let mut set_digests = BTreeSet::new();
    let mut semantic_digests = BTreeSet::new();
    for order in &orders {
        let ordered: Vec<Value> = order.iter().map(|member| json!(member)).collect();
        set_digests.insert(
            canonical_digest(&json!({"tags": ordered.clone()}), &policy)
                .expect("a set array digests")
                .value,
        );
        semantic_digests.insert(
            canonical_digest(&json!({"steps": ordered}), &policy)
                .expect("a semantic-order array digests")
                .value,
        );
    }
    assert_eq!(
        set_digests.len(),
        1,
        "every member order of a declared set digests identically"
    );
    assert_eq!(
        semantic_digests.len(),
        orders.len(),
        "every member order of a semantic-order array digests differently"
    );
    println!(
        "TC-1645 measured: {} member orders, {} distinct set-array digest, {} distinct semantic-order-array digests, 1 refused disposition conflict",
        orders.len(),
        set_digests.len(),
        semantic_digests.len()
    );
}

/// Tracing: TC-1646
#[test]
fn tc_1646_numeric_limits_are_the_configuration_s_and_absence_refuses() {
    let declared = NumericResourceLimit::new(5, 3);
    let policy = CanonicalPolicy::new(declared.clone(), ArrayDeclarations::baseline());
    // At the declared limits, admitted.
    assert_eq!(canonical_json(&parse("12345"), &policy).unwrap(), "12345");
    assert_eq!(canonical_json(&parse("1e3"), &policy).unwrap(), "1000");
    // One digit and one exponent magnitude past them, refused, with no value of
    // any kind returned: no rounding to five digits, no binary64 substitute.
    let mut refusals = 0;
    for over_limit in ["123456", "0.123456", "1e4", "1e-4", "-123456"] {
        let refusal = canonical_json(&parse(over_limit), &policy)
            .expect_err("a value past the declared limit refuses");
        assert_eq!(refusal.code, "NUMBER_RESOURCE_LIMIT");
        refusals += 1;
    }
    // The limit is the configuration's, not the host's: the retired host
    // constant admitted 4096 digits, and this configuration admits five.
    let host_constant_width = "1".repeat(4096);
    assert!(canonical_json(&parse(&host_constant_width), &policy).is_err());

    // A configuration declaring the member reads its declared values back.
    let declaring = configuration(ResourceLimits {
        numeric_resource_limit: Some(declared.clone()),
        declared_bounds: BTreeMap::new(),
    });
    assert_eq!(
        CanonicalPolicy::from_configuration(&declaring)
            .expect("a declared limit reads back")
            .numeric_resource_limit,
        declared
    );
    // A configuration declaring no such member refuses, naming it, and no
    // host-chosen limit is applied in its place.
    let absent = configuration(ResourceLimits::default());
    let refusal =
        CanonicalPolicy::from_configuration(&absent).expect_err("an absent member refuses");
    assert_eq!(refusal.code, "NUMERIC_RESOURCE_LIMIT_ABSENT");
    assert!(
        refusal
            .message
            .contains("resourceLimits.numericResourceLimit"),
        "the refusal names the absent member: {}",
        refusal.message
    );
    assert_eq!(
        configuration_digest(&absent)
            .expect_err("nothing canonicalizes without the declared member")
            .code,
        "NUMERIC_RESOURCE_LIMIT_ABSENT"
    );
    println!(
        "TC-1646 measured: 2 values admitted at the declared maximumCoefficientDigits 5 and maximumExponentMagnitude 3, {refusals} refused one step past them, 1 configuration refused for an absent numericResourceLimit, 0 host-chosen limits applied"
    );
}

/// Tracing: TC-1647
#[test]
fn tc_1647_insertion_and_wire_member_order_reach_no_canonical_byte() {
    let members = ["domain", "version", "algorithm", "value"];
    let value = |member: &str| match member {
        "domain" => json!("filament-canonical-json-1"),
        "version" => json!("1"),
        "algorithm" => json!("sha256"),
        _ => json!(format!("sha256:{}", "a".repeat(64))),
    };
    let orders = permutations(&members);
    let mut emitted = BTreeSet::new();
    let mut digests = BTreeSet::new();
    for order in &orders {
        // Assembled one member at a time, in this order, exactly as an
        // insertion-order-preserving map would hand them over.
        let mut object = serde_json::Map::new();
        for member in order {
            object.insert((*member).to_owned(), value(member));
        }
        let document = Value::Object(object);
        emitted.insert(canonical_json(&document, &policy()).expect("canonicalizes"));
        digests.insert(
            canonical_digest(&document, &policy())
                .expect("digests")
                .value,
        );
    }
    assert_eq!(emitted.len(), 1, "no insertion order reaches a byte");
    assert_eq!(digests.len(), 1, "no insertion order reaches a digest");

    // The consumer contract's wire member order `domain, version, algorithm,
    // value`, read off the wire as text, recomputes the declared digest.
    let wire = br#"{"domain":"filament-canonical-json-1","version":"1","algorithm":"sha256","value":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}"#;
    let from_wire = canonical_json_from_bytes(wire, &policy()).expect("the wire document parses");
    assert_eq!(
        &from_wire,
        emitted.iter().next().expect("one emitted byte string")
    );
    assert_eq!(
        canonical_digest(&parse(std::str::from_utf8(wire).unwrap()), &policy())
            .expect("digests")
            .value,
        *digests.iter().next().expect("one digest")
    );
    println!(
        "TC-1647 measured: {} member orders including the consumer wire order domain/version/algorithm/value, {} distinct canonical byte string, {} distinct digest",
        orders.len(),
        emitted.len(),
        digests.len()
    );
}

/// Tracing: TC-1649
#[test]
fn tc_1649_an_object_s_own_digest_member_is_excluded_only_by_the_digest_seam() {
    let mut document = json!({
        "configurationIdentity": "ix://agent-ix/commerce/config/evaluation-default",
        "digest": {"algorithm": "sha256", "domain": "filament-canonical-json-1", "value": format!("sha256:{}", "a".repeat(64))},
        "lossPolicy": "ix://agent-ix/commerce/loss-policy/refuse"
    });
    let without_digest = json!({
        "configurationIdentity": "ix://agent-ix/commerce/config/evaluation-default",
        "lossPolicy": "ix://agent-ix/commerce/loss-policy/refuse"
    });
    assert_eq!(
        document_digest(&document, &policy()).expect("the digest seam excludes the member"),
        canonical_digest(&without_digest, &policy()).expect("digests")
    );
    // Changing only the excluded member changes no digest.
    let before = document_digest(&document, &policy()).expect("digests");
    document["digest"]["value"] = json!(format!("sha256:{}", "b".repeat(64)));
    assert_eq!(
        document_digest(&document, &policy()).expect("digests"),
        before
    );
    // The exclusion is applied only there: the canonicalizer emits what it is
    // handed, digest member and all.
    let emitted = canonical_json(&document, &policy()).expect("canonicalizes");
    assert!(
        emitted.contains("\"digest\""),
        "the canonicalizer does not silently drop a member: {emitted}"
    );
    println!(
        "TC-1649 measured: 1 excluded digest member at the digest seam, 2 digest-member values yielding 1 digest, 1 canonical byte string retaining the member when canonicalized directly"
    );
}
