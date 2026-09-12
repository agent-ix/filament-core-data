// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! The NFR-036 cross-architecture apparatus Plan-017 Task-150 owns: the named
//! architecture set, the digested-document population, the declared numeric
//! probe set, and the per-architecture agreement record the two architectures
//! are compared over.
//!
//! Nothing here asserts. It *produces* a record: a deterministic text whose
//! every line is one measured element — one document's canonical byte string,
//! one document's digest, or one numeric lexeme's admit-versus-refuse decision.
//! The controls in `cross_architecture.rs` compare two such records element by
//! element, and the controls in `ambient_audit.rs` canonicalize the same
//! population under instrumentation. Comparing records rather than counts is
//! the point: NFR-036-M-3 is a percentage of documents and of refused numeric
//! values, so an agreement of counts would pass while two architectures
//! disagreed about which value was refused (FND-1716).
//!
//! The population is the static half — one admitted static bundle and every
//! document it digests — because that is the half Plan-017 implements and the
//! half TC-1452 and TC-1456 name. The assessment half of NFR-036 is not
//! measured here and is not claimed.
//!
//! The population, its declared order, its configuration-declared numeric limit
//! and its golden byte strings are all Task-149's committed evidence, read
//! through `tests/static_fixture`. This module cuts no golden and authors no
//! limit: both architectures are compared against the one committed golden,
//! which is what NFR-036-M-3's method asks for, and not merely against each
//! other.

#![allow(dead_code)]

use std::path::{Path, PathBuf};

use agent_ix_baseline_producer::{canonical_json, CanonicalPolicy, NumericResourceLimit};
use serde_json::Value;

use crate::static_fixture::{
    admitted_good_fixture, declared_documents, digest_input_bytes, digest_value,
    fixture_numeric_limit, fixture_policy, golden_bytes,
};

/// The architecture set NFR-036 names, and the only one any measurement here
/// is taken over. No third architecture is claimed.
pub const NAMED_ARCHITECTURES: [&str; 2] =
    ["x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"];

/// The version of the record format, so a stale record from an earlier cut is
/// refused rather than compared.
pub const RECORD_VERSION: &str = "nfr-036-agreement-record 1";

// ---------------------------------------------------------------------------
// The host triple
// ---------------------------------------------------------------------------

/// The target triple this test binary was compiled for.
///
/// Every part is a compile-time constant of the *target*, never a run-time
/// host read, so a binary cross-compiled to `aarch64-unknown-linux-gnu` and run
/// under a runner reports that triple and not the runner's host.
pub fn compiled_target_triple() -> String {
    let arch = std::env::consts::ARCH;
    let os = std::env::consts::OS;
    let abi = if cfg!(target_env = "gnu") {
        "gnu"
    } else if cfg!(target_env = "musl") {
        "musl"
    } else {
        "unknown-abi"
    };
    format!("{arch}-unknown-{os}-{abi}")
}

// ---------------------------------------------------------------------------
// The record directory
// ---------------------------------------------------------------------------

/// The workspace root, from this crate's manifest directory.
pub fn workspace_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("the crate sits two directories below the workspace root")
        .to_path_buf()
}

/// This crate's directory.
pub fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// Where the per-architecture records live.
///
/// `NFR036_RECORD_DIR` names it when the Makefile runs the two architectures
/// into one shared directory; `CARGO_TARGET_DIR` is the repository's
/// per-worktree cargo directory otherwise. Reading these is a property of the
/// *harness*, not of the producer: no crate source under audit names either.
pub fn record_dir() -> PathBuf {
    if let Ok(named) = std::env::var("NFR036_RECORD_DIR") {
        return PathBuf::from(named);
    }
    let target = std::env::var("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| workspace_dir().join("target"));
    target.join("nfr-036-agreement")
}

/// The record path of one architecture.
pub fn record_path(triple: &str) -> PathBuf {
    record_dir().join(format!("{triple}.record"))
}

// ---------------------------------------------------------------------------
// The declared numeric probe set
// ---------------------------------------------------------------------------

/// One numeric probe: a stable label and the lexeme it puts through the
/// canonicalizer.
pub struct NumericProbe {
    /// The label the record carries, so a 4097-digit lexeme is comparable
    /// without 4097 characters of record line.
    pub label: &'static str,
    /// The lexeme, built here rather than written out.
    pub lexeme: String,
}

/// The declared numeric probe set: the lexemes whose admit-versus-refuse
/// decision under one configuration document's declared `numericResourceLimit`
/// is compared across the named architecture set.
///
/// The set straddles both declared limits deliberately — one lexeme just inside
/// `maximumCoefficientDigits` and one just outside, one just inside
/// `maximumExponentMagnitude` and one just outside — and it carries values no
/// binary64 can hold, because a host that coerced would disagree on those
/// first.
pub fn numeric_probe_set() -> Vec<NumericProbe> {
    let limit = declared_numeric_limit();
    let coefficient = usize::try_from(limit.maximum_coefficient_digits)
        .expect("the declared coefficient limit fits a usize on both architectures of the set");
    let exponent = limit.maximum_exponent_magnitude;
    let probe = |label: &'static str, lexeme: String| NumericProbe { label, lexeme };
    vec![
        probe("zero", "0".into()),
        probe("negative-zero", "-0".into()),
        probe("one", "1".into()),
        probe("negative-one", "-1".into()),
        probe("one-and-a-half", "1.5".into()),
        probe("trailing-zeroes", "123.4500".into()),
        probe("leading-zero-fraction", "0.0001".into()),
        // The binary64 neighbourhood: a host that coerced would emit `0.1`.
        probe(
            "binary64-neighbour-of-one-tenth",
            "0.1000000000000000055511151231257827".into(),
        ),
        // The first odd integer binary64 cannot represent.
        probe("beyond-binary64-integer", "9007199254740993".into()),
        // Beyond binary64's finite range entirely: an exact decimal, so it is
        // admitted rather than becoming an infinity.
        probe("beyond-binary64-range", "1.7976931348623157e309".into()),
        probe("subnormal-neighbour", "4.9406564584124654e-324".into()),
        probe("exponent-plus-sign", "1e+2".into()),
        probe("exponent-capital", "1E2".into()),
        // The two coefficient-limit neighbours.
        probe("coefficient-at-limit", "1".repeat(coefficient)),
        probe("coefficient-past-limit", "1".repeat(coefficient + 1)),
        // The two exponent-magnitude neighbours, in both directions.
        probe("exponent-at-positive-limit", format!("1e{exponent}")),
        probe(
            "exponent-past-positive-limit",
            format!("1e{}", exponent + 1),
        ),
        probe("exponent-at-negative-limit", format!("1e-{exponent}")),
        probe(
            "exponent-past-negative-limit",
            format!("1e-{}", exponent + 1),
        ),
        // An exponent magnitude no i64 holds: the declared check cannot read
        // it as an integer, so `canonical_number` refuses it as an invalid
        // number instead. Which of the two codes fires is exactly the kind of
        // decision that must not differ by host.
        probe("exponent-beyond-i64", "1e99999999999999999999".into()),
    ]
}

/// The decision one probe reached: the canonical bytes, or the refusal code.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NumericDecision {
    /// Admitted, with the canonical bytes it emitted.
    Admitted(String),
    /// Refused, with the refusal code.
    Refused(String),
}

impl NumericDecision {
    /// The record spelling of this decision.
    pub fn record(&self) -> String {
        match self {
            Self::Admitted(bytes) => format!("ADMIT {bytes}"),
            Self::Refused(code) => format!("REFUSE {code}"),
        }
    }
}

/// Puts one lexeme through the whole declared numeric path under `policy`.
///
/// The decision measured is the producer's own admit-versus-refuse decision —
/// the declared-limit check, the canonical expansion, and the expansion limit —
/// not just the first of the three.
pub fn numeric_decision(lexeme: &str, policy: &CanonicalPolicy) -> NumericDecision {
    let parsed: Value = match serde_json::from_str(lexeme) {
        Ok(value) => value,
        // The parser's own message is not recorded: it is not part of the
        // producer's decision, and it must not be what two architectures are
        // compared on.
        Err(_) => return NumericDecision::Refused("PARSE_REFUSED".to_owned()),
    };
    match canonical_json(&parsed, policy) {
        Ok(bytes) => NumericDecision::Admitted(bytes),
        Err(refusal) => NumericDecision::Refused(refusal.code.to_owned()),
    }
}

/// Every probe's decision, in the declared probe order.
pub fn numeric_decisions(policy: &CanonicalPolicy) -> Vec<(&'static str, NumericDecision)> {
    numeric_probe_set()
        .into_iter()
        .map(|probe| (probe.label, numeric_decision(&probe.lexeme, policy)))
        .collect()
}

// ---------------------------------------------------------------------------
// The digested-document population
// ---------------------------------------------------------------------------

/// The numeric resource limit the admitted fixture's configuration document
/// declares.
///
/// Read from the committed fixture, never authored here: FR-118 takes every
/// numeric limit from the configuration document, so a probe set measured
/// against an authored limit would measure a policy no admitted bundle carries.
pub fn declared_numeric_limit() -> NumericResourceLimit {
    fixture_numeric_limit()
}

/// The canonical policy the admitted fixture's own configuration document
/// declares.
pub fn policy() -> CanonicalPolicy {
    fixture_policy()
}

/// One digested document: its declared name, its canonical bytes, its digest,
/// and the committed golden byte string Task-149 cut for it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DigestedDocument {
    /// The document's declared name, stable across architectures.
    pub name: String,
    /// Filament Canonical JSON 1 for the document, its own digest excluded.
    pub bytes: String,
    /// The document's canonical digest over those bytes.
    pub digest: String,
    /// The one committed golden byte string for this document.
    pub golden: String,
}

/// Every digested document of the one admitted static bundle, in the order the
/// declared document set beside the goldens names.
///
/// The population, its order and its goldens are all Task-149's committed
/// evidence, read here and never re-cut: two architectures compare against one
/// committed golden, which is what NFR-036-M-3 asks for, and not merely against
/// each other.
pub fn digested_documents() -> Vec<DigestedDocument> {
    let bundle = admitted_good_fixture();
    let policy = policy();
    declared_documents()
        .into_iter()
        .map(|declared| {
            let document = declared.resolve(&bundle);
            DigestedDocument {
                bytes: digest_input_bytes(&document, &policy)
                    .unwrap_or_else(|refusal| panic!("{} canonicalizes: {refusal}", declared.name)),
                digest: digest_value(&document, &policy)
                    .unwrap_or_else(|refusal| panic!("{} digests: {refusal}", declared.name)),
                golden: golden_bytes(&declared.golden_file()),
                name: declared.name,
            }
        })
        .collect()
}

// ---------------------------------------------------------------------------
// The agreement record
// ---------------------------------------------------------------------------

/// The per-architecture agreement record: one line per measured element.
///
/// Sections, in order: the record version, the architecture, the declared
/// numeric limit, one `document` line per digested document carrying its
/// digest, one `bytes` line per digested document carrying its canonical byte
/// string, and one `numeric` line per declared probe carrying its
/// admit-versus-refuse decision. Every line is comparable on its own, so a
/// disagreement names the element it is in.
pub fn agreement_record() -> String {
    let limit = declared_numeric_limit();
    let policy = policy();
    let documents = digested_documents();
    let decisions = numeric_decisions(&policy);
    let mut lines = vec![
        RECORD_VERSION.to_owned(),
        format!("architecture {}", compiled_target_triple()),
        format!(
            "declared-numeric-limit maximumCoefficientDigits={} maximumExponentMagnitude={}",
            limit.maximum_coefficient_digits, limit.maximum_exponent_magnitude
        ),
        format!("documents {}", documents.len()),
        format!("numeric-probes {}", decisions.len()),
    ];
    for document in &documents {
        lines.push(format!(
            "document {} digest {}",
            document.name, document.digest
        ));
    }
    for document in &documents {
        lines.push(format!("bytes {} {}", document.name, document.bytes));
    }
    for (label, decision) in &decisions {
        lines.push(format!("numeric {label} {}", decision.record()));
    }
    let mut record = lines.join("\n");
    record.push('\n');
    record
}

/// The lines of a record whose first field is `kind`, as `(element, rest)`.
pub fn record_section(record: &str, kind: &str) -> Vec<(String, String)> {
    record
        .lines()
        .filter_map(|line| {
            let rest = line.strip_prefix(kind)?.strip_prefix(' ')?;
            let (element, rest) = rest.split_once(' ')?;
            Some((element.to_owned(), rest.to_owned()))
        })
        .collect()
}

/// The one-line header value of `key` in a record.
pub fn record_header(record: &str, key: &str) -> Option<String> {
    record
        .lines()
        .find_map(|line| line.strip_prefix(key)?.strip_prefix(' '))
        .map(str::to_owned)
}

/// A value bounded for a failure message: its length, and its first 96
/// characters when it is longer than that.
///
/// A 4096-digit coefficient is a legitimate element of the population, and a
/// disagreement about it must name the element and its length rather than paste
/// it twice.
fn bounded(value: &str) -> String {
    const WIDTH: usize = 96;
    if value.chars().count() <= WIDTH {
        return value.to_owned();
    }
    let head: String = value.chars().take(WIDTH).collect();
    format!("{head}… ({} characters)", value.chars().count())
}

/// The first element the two sections disagree about, named.
///
/// Element by element, never by count: a section pair of equal length whose
/// third element differs is reported as that element, and a section pair of
/// unequal length is reported as the first element present in one and absent
/// from the other.
pub fn first_disagreement(left: &[(String, String)], right: &[(String, String)]) -> Option<String> {
    for index in 0..left.len().max(right.len()) {
        match (left.get(index), right.get(index)) {
            (Some((element, value)), Some((other, other_value))) => {
                if element != other {
                    return Some(format!(
                        "element {index}: {element} on the first architecture, {other} on the second"
                    ));
                }
                if value != other_value {
                    return Some(format!(
                        "element {index} ({element}): {} on the first architecture, {} on the second",
                        bounded(value),
                        bounded(other_value)
                    ));
                }
            }
            (Some((element, _)), None) => {
                return Some(format!(
                    "element {index} ({element}) is present on the first architecture and absent on the second"
                ))
            }
            (None, Some((element, _))) => {
                return Some(format!(
                    "element {index} ({element}) is present on the second architecture and absent on the first"
                ))
            }
            (None, None) => unreachable!("the loop stops at the longer section"),
        }
    }
    None
}
