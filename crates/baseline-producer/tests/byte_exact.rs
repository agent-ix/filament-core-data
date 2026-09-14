// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! The NFR-036 byte-exactness controls Plan-017 Task-149 owns: the committed
//! goldens (TC-1650), the declared insertion-order permutation set (TC-1651), the
//! varied locale, environment and working directory (TC-1653), and the per-array
//! semantic-order comparison with its permuted paired run (TC-1655).
//!
//! The population is **declared**, not discovered: the digested documents of the
//! admitted fixture bundle are listed in
//! `fixtures/baseline-1-2/golden/declared-documents.json` and the permutation set
//! in `fixtures/baseline-1-2/golden/permutation-set.json`, both committed beside
//! the goldens they drive. Each control reports the number it measured.
//!
//! The goldens are read here and never written: the one sanctioned writer is the
//! ignored test in `tests/golden_writer.rs`.
//!
//! Two-process runs re-invoke this test binary's own ignored emitter,
//! `emit_canonical_bytes`, which prints one `CANONICAL<tab>name<tab>bytes` line
//! per declared document. The environment, locale and working directory are set on
//! the child rather than on this process, so one run never perturbs another.
//!
//! The insertion-order permutation is applied to the document **text**, because
//! that is the only place an insertion order exists: a parsed document has already
//! lost the order its object members arrived in (EC-179). The set-array member
//! order survives the parse seam and so is measured end to end; the object member
//! order is measured across the seam, which is the direction the requirement
//! states — no insertion order may reach a canonical byte.

use ix_trace_rs::trace;
use std::collections::BTreeMap;
use std::process::Command;

use agent_ix_baseline_producer::{canonical_json, ArrayDisposition};
use serde_json::Value;

mod static_fixture;

use static_fixture::{
    admitted_good_fixture, array_declarations, arrays_of, declared_documents,
    declared_permutations, digest_input_bytes, digest_value, fixture_policy, golden_bytes,
    permuted_text, without_own_digest, DeclaredDocument,
};

/// The line prefix the two-process emitter writes.
const EMITTED: &str = "CANONICAL\t";

/// The canonical byte string of every declared digested document, in this process.
fn canonical_bytes_in_process() -> BTreeMap<String, String> {
    let bundle = admitted_good_fixture();
    let policy = fixture_policy();
    declared_documents()
        .into_iter()
        .map(|declared| {
            let document = declared.resolve(&bundle);
            let bytes = digest_input_bytes(&document, &policy)
                .unwrap_or_else(|refusal| panic!("{} canonicalizes: {refusal}", declared.name));
            (declared.name, bytes)
        })
        .collect()
}

/// The committed golden byte string of every declared digested document.
fn committed_goldens() -> BTreeMap<String, String> {
    declared_documents()
        .into_iter()
        .map(|declared| (declared.name.clone(), golden_bytes(&declared.golden_file())))
        .collect()
}

/// Runs the emitter in a separate process, optionally under a changed
/// environment, locale and working directory, and reads its canonical bytes back.
fn canonical_bytes_in_child(varied: bool) -> BTreeMap<String, String> {
    let executable = std::env::current_exe().expect("this test binary has a path");
    let mut command = Command::new(executable);
    command.args([
        "--exact",
        "emit_canonical_bytes",
        "--ignored",
        "--nocapture",
        "--test-threads",
        "1",
    ]);
    if varied {
        // The values a second host would carry: a Turkish locale (whose case
        // mapping differs), a far-side time zone, and a working directory that is
        // not the crate's.
        command
            .env("LC_ALL", "tr_TR.UTF-8")
            .env("LANG", "tr_TR.UTF-8")
            .env("LANGUAGE", "tr")
            .env("LC_NUMERIC", "de_DE.UTF-8")
            .env("LC_COLLATE", "tr_TR.UTF-8")
            .env("TZ", "Pacific/Kiritimati")
            .env(
                "FILAMENT_AMBIENT_PROBE",
                "a-value-no-canonical-byte-may-read",
            )
            .current_dir("/");
    }
    let output = command.output().expect("the emitter process runs");
    assert!(
        output.status.success(),
        "the emitter process succeeded: {}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let text = String::from_utf8(output.stdout).expect("the emitter writes Unicode");
    let mut emitted = BTreeMap::new();
    for line in text.lines() {
        // The first emitted line shares the harness's own `test … ` prefix under
        // `--nocapture`, so the marker is found rather than stripped.
        if let Some(entry) = line.find(EMITTED).map(|at| &line[at + EMITTED.len()..]) {
            let (name, bytes) = entry
                .split_once('\t')
                .expect("an emitted line carries a name and its bytes");
            emitted.insert(name.to_owned(), bytes.to_owned());
        }
    }
    assert!(
        !emitted.is_empty(),
        "the emitter process wrote at least one document"
    );
    emitted
}

/// The two-process emitter. Ignored: it is a run, not a measurement.
#[test]
#[ignore = "the two-process and varied-environment emitter, spawned by TC-1650 and TC-1653"]
fn emit_canonical_bytes() {
    for (name, bytes) in canonical_bytes_in_process() {
        println!("{EMITTED}{name}\t{bytes}");
    }
}

/// Tracing: TC-1650; NFR-036
#[trace("TC-1650", "NFR-036")]
#[test]
fn tc_1650_every_digested_document_reproduces_its_golden_across_runs_and_processes() {
    let goldens = committed_goldens();
    assert!(
        !goldens.is_empty(),
        "the declared digested-document set is committed with its goldens"
    );

    let first = canonical_bytes_in_process();
    let second = canonical_bytes_in_process();
    let first_process = canonical_bytes_in_child(false);
    let second_process = canonical_bytes_in_child(false);

    assert_eq!(
        first.keys().collect::<Vec<_>>(),
        goldens.keys().collect::<Vec<_>>(),
        "every declared digested document has a committed golden"
    );
    for (name, golden) in &goldens {
        for (run, measured) in [
            ("run 1 in this process", &first),
            ("run 2 in this process", &second),
            ("run 1 in a separate process", &first_process),
            ("run 2 in a separate process", &second_process),
        ] {
            let bytes = measured
                .get(name)
                .unwrap_or_else(|| panic!("{run} emitted {name}"));
            assert_eq!(
                bytes, golden,
                "{name} differs from its committed golden in {run}"
            );
        }
    }

    let policy = fixture_policy();
    let bundle = admitted_good_fixture();
    let mut digests = 0;
    for declared in declared_documents() {
        let document = declared.resolve(&bundle);
        let once = digest_value(&document, &policy).expect("a digested document digests");
        let twice = digest_value(&document, &policy).expect("a digested document digests");
        assert_eq!(once, twice, "{} digests to one value", declared.name);
        digests += 1;
    }

    println!(
        "TC-1650 measured: {} digested documents, {} byte strings compared across 2 runs in 1 process and 2 runs in 2 separate processes against {} committed goldens, {} digests recomputed, 0 differences",
        goldens.len(),
        goldens.len() * 4,
        goldens.len(),
        digests
    );
}

/// Tracing: TC-1653; NFR-036
#[trace("TC-1653", "NFR-036")]
#[test]
fn tc_1653_every_digested_document_reproduces_its_golden_under_a_changed_environment() {
    let goldens = committed_goldens();
    let varied = canonical_bytes_in_child(true);
    for (name, golden) in &goldens {
        let bytes = varied
            .get(name)
            .unwrap_or_else(|| panic!("the varied-environment run emitted {name}"));
        assert_eq!(
            bytes, golden,
            "{name} differs from its committed golden under a changed locale, environment and working directory"
        );
    }
    println!(
        "TC-1653 measured: {} digested documents compared against the same committed goldens under 1 changed locale, 6 changed environment variables and 1 changed working directory, 0 differences",
        goldens.len()
    );
}

/// Tracing: TC-1651; NFR-036
#[trace("TC-1651", "NFR-036")]
#[test]
fn tc_1651_no_declared_insertion_order_reaches_a_canonical_byte_or_a_digest() {
    let bundle = admitted_good_fixture();
    let policy = fixture_policy();
    let declarations = array_declarations();
    let permutations = declared_permutations();
    assert!(
        permutations.len() > 1,
        "the declared permutation set carries more than the declared order"
    );

    let goldens = committed_goldens();
    let mut pairs = 0;
    let mut set_arrays_permuted = 0;
    for declared in declared_documents() {
        let document = without_own_digest(&declared.resolve(&bundle));
        let golden = &goldens[&declared.name];
        let golden_digest =
            digest_value(&declared.resolve(&bundle), &policy).expect("a digested document digests");
        set_arrays_permuted += arrays_of(&document)
            .into_iter()
            .filter(|(_, member, length)| {
                *length > 1 && declarations.disposition(member) == ArrayDisposition::Set
            })
            .count();
        for permutation in &permutations {
            let text = permuted_text(&document, permutation, &declarations);
            let permuted: Value = serde_json::from_str(&text)
                .unwrap_or_else(|error| panic!("{} parses: {error}", permutation.name));
            let bytes = canonical_json(&permuted, &policy)
                .unwrap_or_else(|refusal| panic!("{} canonicalizes: {refusal}", permutation.name));
            assert_eq!(
                &bytes, golden,
                "{} under permutation {} differs from its committed golden",
                declared.name, permutation.name
            );
            let digest = agent_ix_baseline_producer::canonical_digest(&permuted, &policy)
                .expect("a permuted document digests")
                .value;
            assert_eq!(
                digest, golden_digest,
                "{} under permutation {} digests differently",
                declared.name, permutation.name
            );
            pairs += 1;
        }
    }

    println!(
        "TC-1651 measured: {} declared permutations over {} digested documents = {} paired runs, {} set arrays of more than one member permuted, 1 distinct byte string and 1 distinct digest per document",
        permutations.len(),
        goldens.len(),
        pairs,
        set_arrays_permuted
    );
}

/// Tracing: TC-1655; NFR-036
#[trace("TC-1655", "NFR-036")]
#[test]
fn tc_1655_every_semantic_order_array_is_emitted_in_the_declared_order() {
    let bundle = admitted_good_fixture();
    let policy = fixture_policy();
    let declarations = array_declarations();

    let mut measured = 0;
    let mut paired_runs = 0;
    let mut single_member = 0;
    for declared in declared_documents() {
        let document = without_own_digest(&declared.resolve(&bundle));
        let bytes = canonical_json(&document, &policy).expect("a digested document canonicalizes");
        let digest = agent_ix_baseline_producer::canonical_digest(&document, &policy)
            .expect("a digested document digests")
            .value;
        for (path, member, length) in arrays_of(&document) {
            if declarations.disposition(&member) != ArrayDisposition::SemanticOrder {
                continue;
            }
            let array = resolve(&document, &path);
            let members = array.as_array().expect("the path names an array");
            // Measured per array against the producer-declared order: each
            // member's canonical text appears after the previous member's.
            let mut cursor = 0;
            for (index, item) in members.iter().enumerate() {
                let item_bytes =
                    canonical_json(item, &policy).expect("an array member canonicalizes");
                let found = bytes[cursor..].find(&item_bytes).unwrap_or_else(|| {
                    panic!(
                        "{} member {index} of {}/{member} is not emitted in the declared order",
                        declared.name,
                        path.join("/")
                    )
                });
                cursor += found + item_bytes.len();
            }
            measured += 1;
            if length < 2 {
                single_member += 1;
                continue;
            }
            // The paired run: one semantic-order array permuted, whose digest
            // must differ. A declared order that reached no byte would leave it
            // unchanged.
            let permuted = with_reversed(&document, &path);
            let permuted_digest = agent_ix_baseline_producer::canonical_digest(&permuted, &policy)
                .expect("the permuted document digests")
                .value;
            if permuted == document {
                // Two members with identical canonical text: reversing them is
                // not a permutation of the emitted bytes at all.
                continue;
            }
            assert_ne!(
                permuted_digest,
                digest,
                "reversing the semantic-order array {}/{member} of {} left its digest unchanged",
                path.join("/"),
                declared.name
            );
            paired_runs += 1;
        }
    }

    assert!(measured > 0, "the fixture carries semantic-order arrays");
    println!(
        "TC-1655 measured: {measured} semantic-order arrays compared per array against the producer-declared order, {paired_runs} permuted paired runs whose digest differed, {single_member} single-member arrays with no permutation to run, 0 arrays emitted out of order"
    );
}

fn resolve<'value>(document: &'value Value, path: &[String]) -> &'value Value {
    let mut cursor = document;
    for segment in path {
        cursor = match segment.parse::<usize>() {
            Ok(index) => &cursor[index],
            Err(_) => &cursor[segment.as_str()],
        };
    }
    cursor
}

fn with_reversed(document: &Value, path: &[String]) -> Value {
    let mut mutated = document.clone();
    let mut cursor = &mut mutated;
    for segment in path {
        cursor = match segment.parse::<usize>() {
            Ok(index) => cursor.get_mut(index).expect("the path resolves"),
            Err(_) => cursor.get_mut(segment.as_str()).expect("the path resolves"),
        };
    }
    cursor
        .as_array_mut()
        .expect("the path names an array")
        .reverse();
    mutated
}

/// Keeps the declared-document reader honest about the goldens it names.
#[allow(dead_code)]
fn golden_of(declared: &DeclaredDocument) -> String {
    golden_bytes(&declared.golden_file())
}
