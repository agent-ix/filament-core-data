// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! NFR-036-M-3: the cross-architecture halves — canonical bytes and the
//! admit-versus-refuse decision — over the architecture set NFR-036 names
//! (Plan-017 Task-150).
//!
//! The named set is exactly `x86_64-unknown-linux-gnu` and
//! `aarch64-unknown-linux-gnu`. No third architecture is claimed and no
//! cross-platform determinism beyond that set is asserted.
//!
//! Each metric has two controls, and they measure different things.
//!
//! * The **recording** control runs on whatever architecture the suite is
//!   compiled for. It refuses to run at all on an architecture outside the
//!   named set, measures the population and the declared probe set there, and
//!   writes that architecture's agreement record. It is the producer of one
//!   half of the evidence, never the agreement verdict.
//! * The **agreement** control compares the records of *both* named
//!   architectures element by element. It is `#[ignore]`d, because a plain
//!   `cargo test` on one host can only ever hold one of the two records, and a
//!   control that passed with one record would be asserting agreement it never
//!   measured. It is run by `make baseline-producer-cross-architecture`, which
//!   supplies the second architecture first; a run that cannot reach the second
//!   architecture fails **naming** it, both in the Makefile target and here.
//!
//! Agreement is compared element by element and never by count, because
//! FND-1716 is the case where two architectures report the same number of
//! refused values while disagreeing about which values those were. That is why
//! the refusal half (TC-1448) is measured beside the byte half (TC-1452) rather
//! than assumed from it.

use std::fs;

use agent_ix_baseline_producer::{CanonicalPolicy, NumericResourceLimit};

mod nfr036;
mod static_fixture;

use nfr036::{
    agreement_record, compiled_target_triple, declared_numeric_limit, digested_documents,
    first_disagreement, numeric_decisions, numeric_probe_set, policy, record_dir, record_header,
    record_path, record_section, NumericDecision, NAMED_ARCHITECTURES, RECORD_VERSION,
};

/// The decision the declared `numericResourceLimit` reaches for every probe of
/// the declared set, committed here rather than read back from a run.
///
/// `ADMIT` names an admitted lexeme and a refusal code names a refused one. The
/// decision is a function of the configuration document's two declared values
/// alone — 4096 significant coefficient digits and exponent magnitude 6144 —
/// so this table is the same table on both architectures of the named set. A
/// host that derived either limit from a pointer width would differ from it at
/// `coefficient-at-limit`, which is what the planted control below shows.
const DECLARED_DECISIONS: [(&str, &str); 20] = [
    ("zero", "ADMIT"),
    ("negative-zero", "ADMIT"),
    ("one", "ADMIT"),
    ("negative-one", "ADMIT"),
    ("one-and-a-half", "ADMIT"),
    ("trailing-zeroes", "ADMIT"),
    ("leading-zero-fraction", "ADMIT"),
    ("binary64-neighbour-of-one-tenth", "ADMIT"),
    ("beyond-binary64-integer", "ADMIT"),
    ("beyond-binary64-range", "ADMIT"),
    ("subnormal-neighbour", "ADMIT"),
    ("exponent-plus-sign", "ADMIT"),
    ("exponent-capital", "ADMIT"),
    ("coefficient-at-limit", "ADMIT"),
    ("coefficient-past-limit", "NUMBER_RESOURCE_LIMIT"),
    ("exponent-at-positive-limit", "ADMIT"),
    ("exponent-past-positive-limit", "NUMBER_RESOURCE_LIMIT"),
    ("exponent-at-negative-limit", "ADMIT"),
    ("exponent-past-negative-limit", "NUMBER_RESOURCE_LIMIT"),
    // The declared magnitude check reads the exponent as an integer; a magnitude
    // no `i64` holds is therefore not over the *limit*, it is not a number the
    // canonicalizer can expand, and `canonical_number` refuses it as invalid.
    // Which of the two codes fires is exactly the kind of decision that must not
    // differ by host.
    ("exponent-beyond-i64", "INVALID_NUMBER"),
];

/// The canonical bytes the declared limit admits for the probes short enough to
/// be written out, committed here.
///
/// The long ones — a 4096-digit coefficient, a 6145-digit expansion — are
/// compared across architectures through the record rather than transcribed.
const DECLARED_BYTES: [(&str, &str); 11] = [
    ("zero", "0"),
    ("negative-zero", "0"),
    ("one", "1"),
    ("negative-one", "-1"),
    ("one-and-a-half", "1.5"),
    ("trailing-zeroes", "123.45"),
    ("leading-zero-fraction", "0.0001"),
    (
        "binary64-neighbour-of-one-tenth",
        "0.1000000000000000055511151231257827",
    ),
    ("beyond-binary64-integer", "9007199254740993"),
    ("exponent-plus-sign", "100"),
    ("exponent-capital", "100"),
];

/// The record spelling of a decision, for comparison with the committed table.
fn decision_code(decision: &NumericDecision) -> String {
    match decision {
        NumericDecision::Admitted(_) => "ADMIT".to_owned(),
        NumericDecision::Refused(code) => code.clone(),
    }
}

/// Fails naming the architecture when this suite was compiled for one outside
/// the named set.
fn assert_named_architecture(triple: &str) {
    assert!(
        NAMED_ARCHITECTURES.contains(&triple),
        "this suite was compiled for {triple}, which is outside the architecture set NFR-036 names ({NAMED_ARCHITECTURES:?}): the cross-architecture measurement cannot be taken here, and this is a failure rather than a skip"
    );
}

/// The record of one named architecture, or a failure naming the architecture
/// that was not reached.
fn read_record(triple: &str) -> String {
    let path = record_path(triple);
    let record = fs::read_to_string(&path).unwrap_or_else(|error| {
        panic!(
            "{triple} was not reached: no agreement record at {} ({error}). The architecture set NFR-036 names is {NAMED_ARCHITECTURES:?}; run `make baseline-producer-cross-architecture`, which builds and runs the recording control on {triple} and fails naming it if its runner is absent. This is a failure rather than a skip and never a vacuous pass.",
            path.display()
        )
    });
    assert!(
        record.starts_with(RECORD_VERSION),
        "the record at {} is not a {RECORD_VERSION}: a stale record is refused rather than compared",
        path.display()
    );
    assert_eq!(
        record_header(&record, "architecture").as_deref(),
        Some(triple),
        "the record at {} was written by the architecture it is filed under",
        path.display()
    );
    record
}

// ---------------------------------------------------------------------------
// TC-1452: canonical bytes across the named architecture set
// ---------------------------------------------------------------------------

/// Tracing: TC-1452
#[test]
fn tc_1452_this_architecture_records_every_digested_documents_canonical_bytes_and_decisions() {
    let triple = compiled_target_triple();
    assert_named_architecture(&triple);

    let documents = digested_documents();
    assert!(
        !documents.is_empty(),
        "the digested-document population is not empty"
    );

    // The golden anchor. Both architectures are compared against *one*
    // committed golden — the cut Task-149 made — and not merely against each
    // other, because two architectures that agreed with each other and with
    // nothing else would report 100% agreement on bytes neither of them should
    // have emitted.
    for document in &documents {
        assert_eq!(
            document.bytes, document.golden,
            "{} on {triple} equals its one committed golden byte string",
            document.name
        );
    }

    // A record that varied inside one process could not measure anything
    // across two, so the record is computed twice here before it is written.
    let first = agreement_record();
    let second = agreement_record();
    assert_eq!(
        first, second,
        "the agreement record is a function of the declared documents alone"
    );

    let directory = record_dir();
    fs::create_dir_all(&directory).unwrap_or_else(|error| {
        panic!(
            "the record directory {} could not be created ({error}): the cross-architecture gate cannot run, and this is a failure rather than a skip",
            directory.display()
        )
    });
    let path = record_path(&triple);
    fs::write(&path, &first).unwrap_or_else(|error| {
        panic!(
            "the agreement record {} could not be written ({error}): the cross-architecture gate cannot run, and this is a failure rather than a skip",
            path.display()
        )
    });

    let bytes = record_section(&first, "bytes");
    let digests = record_section(&first, "document");
    let numerics = record_section(&first, "numeric");
    assert_eq!(bytes.len(), documents.len());
    assert_eq!(digests.len(), documents.len());
    assert_eq!(numerics.len(), numeric_probe_set().len());
    println!(
        "TC-1452 measured on {triple}: {} digested document(s) of one admitted static bundle, {} canonical byte string(s), {} digest(s) and {} admit-versus-refuse decision(s), recorded at {}. The architecture set NFR-036 names is {NAMED_ARCHITECTURES:?}; the agreement verdict over both is tc_1452_the_named_architecture_set_agrees_element_for_element, which this run does not reach.",
        documents.len(),
        bytes.len(),
        digests.len(),
        numerics.len(),
        path.display()
    );
}

/// Tracing: TC-1452
#[test]
#[ignore = "Cross-architecture evidence: needs an agreement record from each of x86_64-unknown-linux-gnu and aarch64-unknown-linux-gnu, so one host alone cannot hold both; run `make baseline-producer-cross-architecture`, which supplies the second architecture and fails naming it when its runner is absent"]
fn tc_1452_the_named_architecture_set_agrees_element_for_element_on_bytes_and_digests() {
    let records: Vec<(&str, String)> = NAMED_ARCHITECTURES
        .iter()
        .map(|triple| (*triple, read_record(triple)))
        .collect();
    let [(left_triple, left), (right_triple, right)] = records.as_slice() else {
        unreachable!("the named architecture set has exactly two members")
    };

    for (kind, unit) in [("document", "digest"), ("bytes", "canonical byte string")] {
        let left_section = record_section(left, kind);
        let right_section = record_section(right, kind);
        assert!(
            !left_section.is_empty(),
            "the {left_triple} record carries {kind} lines"
        );
        assert_eq!(
            first_disagreement(&left_section, &right_section),
            None,
            "{left_triple} and {right_triple} disagree on a {unit}"
        );
        println!(
            "TC-1452 agreement on {unit}: {}/{} element(s), 100% ({left_triple} against {right_triple})",
            left_section.len(),
            left_section.len().max(right_section.len())
        );
    }

    // The refusal half, beside the byte half and not derived from it.
    let left_numerics = record_section(left, "numeric");
    let right_numerics = record_section(right, "numeric");
    assert_eq!(
        first_disagreement(&left_numerics, &right_numerics),
        None,
        "{left_triple} and {right_triple} disagree on an admit-versus-refuse decision"
    );
    println!(
        "TC-1452 agreement on admit-versus-refuse decisions: {}/{} element(s), 100%",
        left_numerics.len(),
        left_numerics.len().max(right_numerics.len())
    );
}

// ---------------------------------------------------------------------------
// TC-1448: the refused numeric set across the named architecture set
// ---------------------------------------------------------------------------

/// Tracing: TC-1448
#[test]
fn tc_1448_the_declared_numeric_limit_decides_the_same_numbers_on_this_architecture() {
    let triple = compiled_target_triple();
    assert_named_architecture(&triple);

    let limit = declared_numeric_limit();
    let declared_policy = policy();
    assert_eq!(
        declared_policy.numeric_resource_limit, limit,
        "the policy under measurement carries the configuration-declared limit"
    );
    let measured = numeric_decisions(&declared_policy);
    assert_eq!(
        measured.len(),
        DECLARED_DECISIONS.len(),
        "every probe of the declared set has a committed decision"
    );

    // Element by element, never by count.
    let mut refused: Vec<&str> = Vec::new();
    let mut admitted: Vec<&str> = Vec::new();
    for ((label, decision), (expected_label, expected)) in measured.iter().zip(DECLARED_DECISIONS) {
        assert_eq!(
            *label, expected_label,
            "the probe set is walked in its declared order"
        );
        assert_eq!(
            decision_code(decision),
            expected,
            "probe {label} under the declared numericResourceLimit ({} coefficient digits, exponent magnitude {})",
            limit.maximum_coefficient_digits,
            limit.maximum_exponent_magnitude
        );
        match decision {
            NumericDecision::Admitted(_) => admitted.push(label),
            NumericDecision::Refused(_) => refused.push(label),
        }
    }
    let expected_refused: Vec<&str> = DECLARED_DECISIONS
        .iter()
        .filter(|(_, decision)| *decision != "ADMIT")
        .map(|(label, _)| *label)
        .collect();
    assert_eq!(
        refused, expected_refused,
        "the refused set is compared element by element, not by count"
    );

    // The admitted bytes of every probe short enough to transcribe.
    for (label, bytes) in DECLARED_BYTES {
        let (_, decision) = measured
            .iter()
            .find(|(measured_label, _)| *measured_label == label)
            .unwrap_or_else(|| panic!("{label} is a declared probe"));
        assert_eq!(
            decision,
            &NumericDecision::Admitted(bytes.to_owned()),
            "probe {label} canonicalizes to {bytes}"
        );
    }

    // The planted control: a limit derived from the host's pointer width
    // instead of from the configuration document — the derivation
    // FR-118-CON-7 prohibits. The refused set under it must differ from the
    // declared one, element by element, or this comparison could not tell a
    // host-derived limit from a declared one.
    let planted =
        NumericResourceLimit::new(u64::from(usize::BITS) * 32, u64::from(usize::BITS) * 96);
    assert_ne!(
        planted, limit,
        "the planted limit is host-derived and differs from the declared one on this architecture"
    );
    let planted_policy =
        CanonicalPolicy::new(planted.clone(), declared_policy.array_declarations.clone());
    let planted_decisions: Vec<(String, String)> = numeric_decisions(&planted_policy)
        .into_iter()
        .map(|(label, decision)| (label.to_owned(), decision.record()))
        .collect();
    let declared_decisions: Vec<(String, String)> = measured
        .iter()
        .map(|(label, decision)| ((*label).to_owned(), decision.record()))
        .collect();
    let disagreement = first_disagreement(&declared_decisions, &planted_decisions);
    assert!(
        disagreement.is_some(),
        "the planted host-derived limit ({} coefficient digits, exponent magnitude {} on this {}-bit host) changes no decision, so this comparison could not detect one",
        planted.maximum_coefficient_digits,
        planted.maximum_exponent_magnitude,
        usize::BITS
    );

    println!(
        "TC-1448 measured on {triple}: {} declared numeric probe(s), {} admitted and {} refused under the configuration-declared numericResourceLimit ({} coefficient digits, exponent magnitude {}); refused set {refused:?}. The planted host-derived limit ({} coefficient digits, exponent magnitude {}) is detected at {}. Agreement across {NAMED_ARCHITECTURES:?} is tc_1448_the_refused_numeric_set_agrees_element_for_element, which this run does not reach.",
        measured.len(),
        admitted.len(),
        refused.len(),
        limit.maximum_coefficient_digits,
        limit.maximum_exponent_magnitude,
        planted.maximum_coefficient_digits,
        planted.maximum_exponent_magnitude,
        disagreement.expect("the planted limit is detected"),
    );
}

/// Tracing: TC-1448
#[test]
#[ignore = "Cross-architecture evidence: needs an agreement record from each of x86_64-unknown-linux-gnu and aarch64-unknown-linux-gnu, so one host alone cannot hold both; run `make baseline-producer-cross-architecture`, which supplies the second architecture and fails naming it when its runner is absent"]
fn tc_1448_the_refused_numeric_set_agrees_element_for_element_across_the_named_architecture_set() {
    let records: Vec<(&str, String)> = NAMED_ARCHITECTURES
        .iter()
        .map(|triple| (*triple, read_record(triple)))
        .collect();
    let [(left_triple, left), (right_triple, right)] = records.as_slice() else {
        unreachable!("the named architecture set has exactly two members")
    };

    // Both architectures read the same declared limit, from the configuration
    // document and not from the host.
    let limit = declared_numeric_limit();
    let declared = format!(
        "maximumCoefficientDigits={} maximumExponentMagnitude={}",
        limit.maximum_coefficient_digits, limit.maximum_exponent_magnitude
    );
    for (triple, record) in &records {
        assert_eq!(
            record_header(record, "declared-numeric-limit").as_deref(),
            Some(declared.as_str()),
            "{triple} read the configuration-declared numeric limit"
        );
    }

    let left_numerics = record_section(left, "numeric");
    let right_numerics = record_section(right, "numeric");
    assert!(
        !left_numerics.is_empty(),
        "the {left_triple} record carries numeric decisions"
    );
    assert_eq!(
        first_disagreement(&left_numerics, &right_numerics),
        None,
        "{left_triple} and {right_triple} disagree on an admit-versus-refuse decision under one configuration document's declared numericResourceLimit"
    );

    let refused = |section: &[(String, String)]| -> Vec<String> {
        section
            .iter()
            .filter(|(_, decision)| decision.starts_with("REFUSE"))
            .map(|(label, decision)| format!("{label} {decision}"))
            .collect()
    };
    let left_refused = refused(&left_numerics);
    let right_refused = refused(&right_numerics);
    assert_eq!(
        left_refused, right_refused,
        "the refused set is compared element by element, not by count"
    );
    println!(
        "TC-1448 agreement across {left_triple} and {right_triple}: {}/{} decision(s) agree, 100%; {} refused value(s) agree element for element ({left_refused:?})",
        left_numerics.len(),
        left_numerics.len().max(right_numerics.len()),
        left_refused.len()
    );
}
