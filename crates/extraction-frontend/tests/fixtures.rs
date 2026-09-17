//! FR-098 "Fixture inventory", "Fixture provenance", "Goldens" and
//! "Read-only lifting", with the determinism rows of FR-095 and FR-096 the
//! corpus carries (TC-1253, TC-1255, TC-1267, TC-1270): every fixture
//! document is provenance-tracked, the directory set is the declared
//! inventory, every negative emits its code at the golden's locus, the
//! goldens regenerate byte for byte into a scratch directory under the
//! target directory, and a lift leaves a committed copy of every bundle
//! untouched.
//!
//! Nothing here writes under `fixtures/`: regeneration lands under
//! `CARGO_TARGET_DIR`, and the read-only proof runs over a copy of each
//! bundle committed into a scratch git repository.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

mod common;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic};
use agent_ix_extraction_frontend::write::{
    fixture_bundles, EXPECTED_DIR, GOLDEN_DIAGNOSTICS, GOLDEN_DOCUMENT, GOLDEN_PROVENANCE,
};
use agent_ix_extraction_frontend::{canonical_bytes, lift, LiftOutcome, LiftRequest};
use agent_ix_semantic_ir::{decide, json::parse, ResultState};
use common::{
    bundle_fixtures, copy_tree, crate_dir, declared_module_roots, first_difference, fixture,
    fixtures_root, git, hash_tree, lift_fixture, read_json, request_at, scratch_dir, workspace_dir,
};
use ix_trace_rs::trace;
use serde_json::Value;

/// The quire-rs revision the `config-version-*` documents were copied at
/// (FR-098-AC-1). The source documents are byte-identical at the crate's
/// pinned `rev`, so the copies were not re-taken when the pin moved.
const QUIRE_RS_REVISION: &str = "8b8020e";
/// The spec-objects-business revision the module was vendored at.
const BUSINESS_REVISION: &str = "7b7b0bc";

// ---------------------------------------------------------------------------
// The inventory (FR-098 "Fixture inventory")
// ---------------------------------------------------------------------------

/// The directories directly under `fixtures/`. FR-098's own list names
/// `business`, `config-version-fence`, `config-version-table`, `legacy`,
/// `modules`, `negatives` and a `both-forms` that lives under
/// `negatives/ARTIFACT_NOT_LOWERED`; the rest are the bundles FR-091..FR-097
/// name in their criteria and FR-098 does not repeat (reported with
/// Task-136).
const TOP_LEVEL: [&str; 12] = [
    "business",
    "clauses",
    "config-version-fence",
    "config-version-table",
    "edges",
    "identity-cases",
    "legacy",
    "lower",
    "modules",
    "negatives",
    "registry-doc",
    "resolve",
];

/// The module roots under `fixtures/modules/`.
const MODULES: [&str; 6] = [
    "acme-other",
    "conflicting",
    "edge-vocabulary",
    "frobnicates",
    "objects-extra",
    "spec-objects-business",
];

/// The codes FR-096 declares whose emission a committed file cannot
/// express; their directory holds a `constructed.json` naming the
/// constructing test (FR-098 "Fixture inventory").
const CONSTRUCTED: [Code; 7] = [
    Code::OutputUnwritable,
    Code::LimitMaxDocuments,
    Code::LimitMaxDocumentBytes,
    Code::LimitMaxFieldsPerRecord,
    Code::LimitMaxClauseBytes,
    Code::LimitMaxDepth,
    Code::InvalidIr,
];

/// The other registry codes a `negatives/<CODE>` bundle emits beside its
/// own, each by construction of the code it exercises, pinned here so a
/// new companion fails the test (FR-098-AC-4 reads "no second code";
/// these are reported with Task-136):
/// the engine's own diagnostic is always surfaced as `ENGINE_DIAGNOSTIC`
/// (FR-091-AC-9), so a code raised on an engine finding carries it; a
/// target that produced no definition is itself `ARTIFACT_NOT_LOWERED`.
const COMPANIONS: [(Code, &[Code]); 5] = [
    (Code::ArtifactNotLowered, &[Code::EngineDiagnostic]),
    (
        Code::StaleTypeToken,
        &[Code::ArtifactNotLowered, Code::EngineDiagnostic],
    ),
    (
        Code::UnresolvedRelationshipTarget,
        &[Code::ArtifactNotLowered, Code::EngineDiagnostic],
    ),
    (Code::UnresolvedTypeToken, &[Code::EngineDiagnostic]),
    (Code::ImportUnsupported, &[]),
];

/// `KERNEL_NAME_SHADOWED` is superseded at lift level by
/// `DUPLICATE_TYPE_NAME` because the bundle uses the scalar it shadows
/// (FR-092-AC-8, FR-095-AC-14); the warning itself is asserted at the
/// resolve layer by `tests/resolve.rs::tc_1217_`.
const SUPERSEDED: [(Code, Code); 1] = [(Code::KernelNameShadowed, Code::DuplicateTypeName)];

fn negatives_dir() -> PathBuf {
    fixtures_root().join("negatives")
}

/// The names of the directories directly under `dir`, sorted.
fn dirs(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
        .map(|e| e.expect("entry"))
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names
}

/// Every regular file under `dir`, recursively, as `dir`-relative
/// `/`-joined paths, never descending into `expected/`; `stop` decides
/// which subdirectories are left to their own provenance.
fn documents(dir: &Path, stop: &dyn Fn(&Path) -> bool) -> Vec<String> {
    fn walk(dir: &Path, root: &Path, stop: &dyn Fn(&Path) -> bool, out: &mut Vec<String>) {
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .collect();
        entries.sort();
        for entry in entries {
            if entry.is_dir() {
                let name = entry.file_name().map(|n| n.to_string_lossy().into_owned());
                if name.as_deref() == Some(EXPECTED_DIR) || stop(&entry) {
                    continue;
                }
                walk(&entry, root, stop, out);
            } else {
                out.push(
                    entry
                        .strip_prefix(root)
                        .expect("under root")
                        .components()
                        .map(|c| c.as_os_str().to_string_lossy().into_owned())
                        .collect::<Vec<_>>()
                        .join("/"),
                );
            }
        }
    }
    let mut out = Vec::new();
    walk(dir, dir, stop, &mut out);
    out
}

/// Every directory under `fixtures/` holding a `PROVENANCE.json`, as
/// `fixtures/`-relative names.
fn provenanced_dirs() -> Vec<PathBuf> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        if dir.join("PROVENANCE.json").is_file() {
            out.push(dir.to_path_buf());
        }
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .filter(|p| p.is_dir())
            .collect();
        entries.sort();
        for entry in entries {
            walk(&entry, out);
        }
    }
    let mut out = Vec::new();
    walk(&fixtures_root(), &mut out);
    out
}

/// The document paths a `PROVENANCE.json` names: `files[]`, `paths[]`
/// (a string, or an object's `fixture`), `derived[].fixture`, and the
/// path before the first `: ` of each `authored[]` line. A `schemas/*.json`
/// entry names every JSON file under `schemas/`.
fn named_documents(provenance: &Value, dir: &Path) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut push = |s: &str| {
        if let Some(prefix) = s.strip_suffix("/*.json") {
            let sub = dir.join(prefix);
            if sub.is_dir() {
                for entry in fs::read_dir(&sub).expect("read_dir") {
                    let name = entry.expect("entry").file_name();
                    let name = name.to_string_lossy();
                    if name.ends_with(".json") {
                        out.insert(format!("{prefix}/{name}"));
                    }
                }
            }
        } else {
            out.insert(s.to_string());
        }
    };
    for key in ["files", "paths"] {
        for item in provenance
            .get(key)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            match item {
                Value::String(s) => push(s),
                Value::Object(o) => {
                    if let Some(s) = o.get("fixture").and_then(Value::as_str) {
                        push(s);
                    }
                }
                _ => {}
            }
        }
    }
    for item in provenance
        .get("derived")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if let Some(s) = item.get("fixture").and_then(Value::as_str) {
            push(s);
        }
    }
    for item in provenance
        .get("authored")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if let Some((path, _)) = item.as_str().and_then(|s| s.split_once(": ")) {
            push(path);
        }
    }
    out
}

#[trace("TC-1285", "FR-098-AC-1")]
#[trace("TC-1285", "FR-098-CON-2")]
#[test]
fn tc_1285_every_fixture_document_is_named_in_its_provenance_with_repository_revision_or_authored()
{
    let provenanced = provenanced_dirs();
    assert!(provenanced.len() >= 40, "{}", provenanced.len());
    let owned: BTreeSet<PathBuf> = provenanced.iter().cloned().collect();
    let mut checked = 0usize;
    for dir in &provenanced {
        let name = dir
            .strip_prefix(fixtures_root())
            .expect("under fixtures")
            .display()
            .to_string();
        let provenance = read_json(&dir.join("PROVENANCE.json"));
        let copied = provenance.get("repository").is_some() && provenance.get("revision").is_some();
        let authored = provenance.get("source").and_then(Value::as_str) == Some("authored");
        assert!(
            copied || authored,
            "{name}: PROVENANCE.json names neither a repository and revision nor `source: authored`"
        );
        let named = named_documents(&provenance, dir);
        // A nested directory with its own provenance is its own row set.
        let stop = |p: &Path| owned.contains(p) && p != dir.as_path();
        for document in documents(dir, &stop) {
            if matches!(document.as_str(), "PROVENANCE.json" | "constructed.json") {
                continue;
            }
            assert!(
                named.contains(&document),
                "{name}: {document} is not named in PROVENANCE.json (named: {named:?})"
            );
            checked += 1;
        }
    }
    assert!(checked >= 100, "documents checked: {checked}");

    // The vendored config-version copies: the quire-rs revision and the
    // added `relationships:` block.
    for name in ["config-version-table", "config-version-fence"] {
        let provenance = read_json(&fixture(name).join("PROVENANCE.json"));
        assert!(
            provenance["repository"]
                .as_str()
                .is_some_and(|r| r.ends_with("/quire-rs")),
            "{name}: {}",
            provenance["repository"]
        );
        assert_eq!(provenance["revision"], QUIRE_RS_REVISION, "{name}");
        let edits: Vec<&str> = provenance["edits"]
            .as_array()
            .expect("edits")
            .iter()
            .filter_map(Value::as_str)
            .collect();
        assert!(
            edits.iter().any(|e| e.contains("relationships:")),
            "{name}: no edit names the added relationships: block: {edits:?}"
        );
    }
    let module = read_json(&fixture("modules/spec-objects-business/PROVENANCE.json"));
    assert_eq!(module["revision"], BUSINESS_REVISION);
}

#[trace("TC-1343", "FR-098-AC-11")]
#[test]
fn tc_1343_the_directory_set_equals_the_inventory_and_every_constructed_json_names_a_real_test() {
    assert_eq!(dirs(&fixtures_root()), TOP_LEVEL);
    assert_eq!(dirs(&fixtures_root().join("modules")), MODULES);
    let mut codes: Vec<&str> = Code::ALL.iter().map(|c| c.name()).collect();
    codes.sort_unstable();
    assert_eq!(dirs(&negatives_dir()), codes);

    // Every `constructed.json` names `crates/extraction-frontend/tests/<file>.rs::<fn>`
    // (or `::{<fn prefix>, ...}`), and each named prefix is a test function
    // of that file.
    let mut constructed = 0usize;
    for code in Code::ALL {
        let path = negatives_dir().join(code.name()).join("constructed.json");
        if !path.is_file() {
            assert!(
                !CONSTRUCTED.contains(&code),
                "{}: no constructed.json",
                code.name()
            );
            continue;
        }
        assert!(
            CONSTRUCTED.contains(&code),
            "{}: carries a constructed.json but is not a constructed code",
            code.name()
        );
        constructed += 1;
        let stub = read_json(&path);
        assert_eq!(stub["code"], code.name(), "{}", path.display());
        let by = stub["constructed_by"].as_str().expect("constructed_by");
        let (file, functions) = by.split_once("::").expect("<file>::<fn>");
        let file = workspace_dir().join(file);
        assert!(
            file.starts_with(crate_dir().join("tests")),
            "{by}: outside crates/extraction-frontend/tests/"
        );
        let source = fs::read_to_string(&file).unwrap_or_else(|e| panic!("{by}: {e}"));
        let prefixes: Vec<&str> = functions
            .trim_start_matches('{')
            .trim_end_matches('}')
            .split(',')
            .map(str::trim)
            .collect();
        for prefix in prefixes {
            assert!(
                source.contains(&format!("fn {prefix}")),
                "{by}: no `fn {prefix}` in {}",
                file.display()
            );
        }
    }
    assert_eq!(constructed, CONSTRUCTED.len());
}

#[trace("TC-1272", "FR-096-AC-14")]
#[test]
fn tc_1272_the_negatives_directory_set_equals_the_code_enum() {
    let expected: BTreeSet<&str> = Code::ALL.iter().map(|c| c.name()).collect();
    let actual: BTreeSet<String> = dirs(&negatives_dir()).into_iter().collect();
    let actual: BTreeSet<&str> = actual.iter().map(String::as_str).collect();
    assert_eq!(actual, expected);
    assert_eq!(expected.len(), 27);
    for code in Code::ALL {
        let dir = negatives_dir().join(code.name());
        let bundle = dir.join("spec/spec.md").is_file();
        let constructed = dir.join("constructed.json").is_file();
        assert!(
            bundle || constructed,
            "{}: neither a bundle root nor a constructed.json",
            code.name()
        );
    }
}

// ---------------------------------------------------------------------------
// Goldens (FR-098 "Goldens")
// ---------------------------------------------------------------------------

/// The registry codes of `diagnostics`, as a set.
fn codes_of(diagnostics: &[Diagnostic]) -> BTreeSet<Code> {
    diagnostics
        .iter()
        .filter_map(|d| d.registry_code())
        .collect()
}

/// The canonical sidecar bytes of `diagnostics`, as `write_lift` writes
/// them.
fn diagnostics_bytes(diagnostics: &[Diagnostic]) -> Vec<u8> {
    canonical_bytes(&serde_json::to_value(diagnostics).expect("serialize"))
}

#[trace("TC-1288", "FR-098-AC-4")]
#[test]
fn tc_1288_every_negative_emits_its_code_at_the_golden_locus_and_only_its_pinned_companions() {
    let companions: BTreeMap<Code, &[Code]> = COMPANIONS.into_iter().collect();
    let superseded: BTreeMap<Code, Code> = SUPERSEDED.into_iter().collect();
    for code in Code::ALL {
        let dir = negatives_dir().join(code.name());
        if !dir.join("spec/spec.md").is_file() {
            assert!(
                dir.join("constructed.json").is_file(),
                "{}: no bundle and no constructed.json",
                code.name()
            );
            continue;
        }
        let golden = dir.join(EXPECTED_DIR).join(GOLDEN_DIAGNOSTICS);
        assert!(
            golden.is_file(),
            "{}: no committed golden",
            golden.display()
        );
        let scratch = tempfile::tempdir().expect("tempdir");
        let request = request_at(&dir, scratch.path());
        let outcome = lift(&request);
        let diagnostics = outcome.diagnostics();
        let emitted = codes_of(&diagnostics);
        let mut allowed: BTreeSet<Code> = BTreeSet::new();
        let expected_code = match superseded.get(&code) {
            Some(by) => {
                assert!(
                    !emitted.contains(&code),
                    "{}: emitted beside its superseding code {:?}",
                    code.name(),
                    diagnostics
                );
                *by
            }
            None => code,
        };
        allowed.insert(expected_code);
        allowed.extend(
            companions
                .get(&code)
                .copied()
                .unwrap_or(&[])
                .iter()
                .copied(),
        );
        assert!(
            emitted.contains(&expected_code),
            "{}: {} not emitted: {diagnostics:?}",
            code.name(),
            expected_code.name()
        );
        let extra: Vec<&str> = emitted.difference(&allowed).map(|c| c.name()).collect();
        assert!(
            extra.is_empty(),
            "{}: a second code {extra:?} beside the pinned set: {diagnostics:?}",
            code.name()
        );
        // FR-098-AC-4: the code is the *first blocking* diagnostic in FR-096
        // order, and the non-blocking negatives are exactly `DECLARED_LOSS`
        // and `ENGINE_DIAGNOSTIC` (CR-036-9, SR-170 FND-1501).
        let first_blocking = diagnostics
            .iter()
            .find(|d| d.blocking)
            .and_then(Diagnostic::registry_code);
        let non_blocking = matches!(code, Code::DeclaredLoss | Code::EngineDiagnostic);
        if non_blocking {
            assert_eq!(
                first_blocking,
                None,
                "{}: a non-blocking negative carries a blocking diagnostic: {diagnostics:?}",
                code.name()
            );
        } else {
            assert_eq!(
                first_blocking,
                Some(expected_code),
                "{}: the first blocking diagnostic is not {}: {diagnostics:?}",
                code.name(),
                expected_code.name()
            );
        }
        // The code's diagnostics sit at the golden's line and column, or
        // carry no locus where FR-096 assigns none: the sidecar bytes are
        // the golden's.
        assert_eq!(
            diagnostics_bytes(&diagnostics),
            fs::read(&golden).expect("golden"),
            "{}: the emitted diagnostics differ from expected/diagnostics.json",
            code.name()
        );
        let golden_value = read_json(&golden);
        let with_code: Vec<&Value> = golden_value
            .as_array()
            .expect("array")
            .iter()
            .filter(|d| {
                d["code"]
                    .as_str()
                    .is_some_and(|c| c.ends_with(expected_code.name()))
            })
            .collect();
        assert!(!with_code.is_empty(), "{}", code.name());
        for d in with_code {
            match d.get("locus") {
                Some(locus) => {
                    assert!(locus["startLine"].as_u64().is_some_and(|l| l >= 1));
                    assert!(locus["startColumn"].as_u64().is_some_and(|c| c >= 1));
                }
                None => assert!(
                    matches!(expected_code, Code::InvalidIr),
                    "{}: a locus-free golden diagnostic",
                    code.name()
                ),
            }
        }
        // A non-blocking negative writes the document too.
        let document = dir.join(EXPECTED_DIR).join(GOLDEN_DOCUMENT);
        assert_eq!(
            document.is_file(),
            matches!(outcome, LiftOutcome::Written { .. }),
            "{}: expected/semantic-ir.json presence",
            code.name()
        );
    }
}

/// Regenerate every fixture golden into `into` through the built binary.
fn regenerate_into(into: &Path) {
    let output = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"))
        .arg("lift")
        .arg("--write-goldens")
        .arg("--fixtures")
        .arg(fixtures_root())
        .arg("--into")
        .arg(into)
        .output()
        .expect("spawn extraction-frontend");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

/// Every committed `expected/` directory beside a bundle root, as
/// `fixtures/`-relative bundle names.
fn committed_goldens() -> Vec<PathBuf> {
    fixture_bundles(&fixtures_root())
        .expect("walk")
        .into_iter()
        .filter(|b| b.join(EXPECTED_DIR).is_dir())
        .map(|b| b.strip_prefix(fixtures_root()).expect("rel").to_path_buf())
        .collect()
}

/// Compare the committed `expected/` of `name` with its regeneration under
/// `into`, file by file; the error names the fixture, the file and the
/// first differing byte offset.
fn compare_golden(name: &Path, committed: &Path, into: &Path) -> Result<(), String> {
    let regenerated = into.join(name).join(EXPECTED_DIR);
    let mut files: Vec<String> = fs::read_dir(committed)
        .map_err(|e| format!("{}: {e}", committed.display()))?
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    files.sort();
    let mut regenerated_files: Vec<String> = fs::read_dir(&regenerated)
        .map_err(|e| format!("{}: not regenerated: {e}", name.display()))?
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    regenerated_files.sort();
    if files != regenerated_files {
        return Err(format!(
            "{}: committed {files:?} but regenerated {regenerated_files:?}",
            name.display()
        ));
    }
    for file in files {
        let a = fs::read(committed.join(&file)).expect("committed");
        let b = fs::read(regenerated.join(&file)).expect("regenerated");
        if let Some(offset) = first_difference(&a, &b) {
            return Err(format!(
                "{}: expected/{file} differs from its regeneration at byte offset {offset}",
                name.display()
            ));
        }
    }
    Ok(())
}

#[trace("TC-1286", "FR-098-AC-2")]
#[test]
fn tc_1286_regenerating_every_golden_into_the_target_directory_reproduces_it_byte_for_byte() {
    let into = scratch_dir("tc-1286");
    regenerate_into(&into);
    let goldens = committed_goldens();
    assert!(goldens.len() >= 30, "{}", goldens.len());
    for name in &goldens {
        let committed = fixtures_root().join(name).join(EXPECTED_DIR);
        compare_golden(name, &committed, &into).unwrap_or_else(|e| panic!("{e}"));
        let document = committed.join(GOLDEN_DOCUMENT);
        if document.is_file() {
            // The document equals the independent reader's normalized form.
            let bytes = fs::read_to_string(&document).expect("document");
            let verdict = decide(&parse(&format!("{{\"ir\":{bytes}}}")).expect("parses"));
            assert_eq!(
                verdict.result_state,
                ResultState::Success,
                "{}: {:?}",
                name.display(),
                verdict
                    .diagnostics
                    .iter()
                    .map(|d| format!("{} at {}", d.code, d.pointer))
                    .collect::<Vec<_>>()
            );
            assert_eq!(
                verdict.normalized,
                bytes,
                "{}: decide(...).normalized differs from the golden",
                name.display()
            );
            for sidecar in [GOLDEN_PROVENANCE, GOLDEN_DIAGNOSTICS] {
                assert!(committed.join(sidecar).is_file(), "{}", name.display());
            }
            assert!(committed
                .join(format!("{GOLDEN_DOCUMENT}.fingerprint"))
                .is_file());
        }
    }

    // Falsification: a one-byte change to a scratch copy of one golden
    // fails naming the fixture and the byte offset.
    let name = Path::new("config-version-table");
    let copy = scratch_dir("tc-1286-copy");
    copy_tree(
        &fixtures_root().join(name).join(EXPECTED_DIR),
        &copy.join(EXPECTED_DIR),
    );
    let golden = copy.join(EXPECTED_DIR).join(GOLDEN_DOCUMENT);
    let mut bytes = fs::read(&golden).expect("golden");
    let offset = bytes.len() / 2;
    bytes[offset] ^= 0x01;
    fs::write(&golden, bytes).expect("write");
    let error = compare_golden(name, &copy.join(EXPECTED_DIR), &into).expect_err("differs");
    assert!(error.contains("config-version-table"), "{error}");
    assert!(error.contains(&format!("offset {offset}")), "{error}");
}

#[trace("TC-1287", "FR-098-AC-3")]
#[test]
fn tc_1287_the_business_golden_carries_every_declaration_kind_an_operation_a_clause_and_two_categories(
) {
    let document = read_json(&fixture("business/expected").join(GOLDEN_DOCUMENT));
    let types = document["types"].as_array().expect("types");
    // A core kind by its string, a construct kind by its name.
    let kinds: BTreeSet<&str> = types
        .iter()
        .filter_map(|t| t["kind"].as_str().or_else(|| t["kind"]["name"].as_str()))
        .collect();
    for kind in [
        "entity",
        "value_object",
        "nested_entity",
        "aggregate_root",
        "enumeration",
        "event",
        "state_machine",
        "process",
        "repository",
        "domain",
        "scalar",
        "alias",
    ] {
        assert!(kinds.contains(kind), "no {kind}: {kinds:?}");
    }
    assert!(
        types
            .iter()
            .filter(|t| t["kind"] == "alias")
            .all(|t| !t["constraints"].as_array().expect("constraints").is_empty()),
        "every alias is a constrained field's"
    );
    assert!(types.iter().any(|t| t["kind"]["name"] == "enumeration"
        && t["variants"].as_array().is_some_and(|v| v.len() >= 2)));
    let operations: Vec<&Value> = types
        .iter()
        .flat_map(|t| t["operations"].as_array().into_iter().flatten())
        .collect();
    assert!(
        operations
            .iter()
            .any(|o| o["params"].as_array().is_some_and(|p| !p.is_empty())
                && o.get("returns").is_some()),
        "no operation with parameters and a returns: {operations:?}"
    );
    let clauses: Vec<&Value> = types
        .iter()
        .flat_map(|t| t["clauses"].as_array().into_iter().flatten())
        .collect();
    assert!(
        clauses.iter().any(|c| c["language"] == "ocl"),
        "{clauses:?}"
    );
    let categories: BTreeSet<&str> = types
        .iter()
        .flat_map(|t| t["relationships"].as_array().into_iter().flatten())
        .filter_map(|r| r["category"].as_str())
        .collect();
    for category in ["structural", "dependency"] {
        assert!(categories.contains(category), "{categories:?}");
    }
}

// ---------------------------------------------------------------------------
// Read-only lifting (FR-098 "Read-only lifting")
// ---------------------------------------------------------------------------

/// Copy `name`'s bundle and its declared module roots into `root`, commit
/// them there, and return the bundle copy, the module copies and the
/// committed tree hashes.
fn committed_copy(name: &str, root: &Path) -> (PathBuf, Vec<PathBuf>, BTreeMap<String, String>) {
    let bundle = root.join("bundle");
    copy_tree(&fixture(name), &bundle);
    // A copied bundle must not carry a committed `expected/`: the lift
    // writes elsewhere and the read-only proof is over the source tree.
    let mut modules = Vec::new();
    for (i, module) in declared_module_roots(&fixture(name)).iter().enumerate() {
        let target = root.join("modules").join(format!(
            "{i}-{}",
            module.file_name().expect("name").to_string_lossy()
        ));
        copy_tree(module, &target);
        modules.push(target);
    }
    git(root, &["init", "-q"]).unwrap_or_else(|e| panic!("{e}"));
    git(root, &["add", "-A"]).unwrap_or_else(|e| panic!("{e}"));
    git(root, &["commit", "-q", "-m", "fixture copy"]).unwrap_or_else(|e| panic!("{e}"));
    let hashes = hash_tree(root);
    (bundle, modules, hashes)
}

#[trace("TC-1289", "FR-098-AC-5")]
#[test]
fn tc_1289_a_lift_leaves_a_committed_copy_of_every_bundle_and_module_root_byte_unchanged() {
    let mut clean = 0usize;
    let mut blocking = 0usize;
    for name in bundle_fixtures() {
        let scratch = tempfile::tempdir().expect("tempdir");
        let (bundle, modules, before) = committed_copy(&name, scratch.path());
        let out = tempfile::tempdir().expect("tempdir");
        let request = LiftRequest {
            bundle_root: bundle.clone(),
            module_roots: modules.clone(),
            out: out.path().join("semantic-ir.json"),
            diagnostics: None,
            provenance: None,
        };
        let outcome = lift(&request);
        match &outcome {
            LiftOutcome::Written { .. } => clean += 1,
            LiftOutcome::Blocked { .. } | LiftOutcome::Refused(_) => blocking += 1,
        }
        let status =
            git(scratch.path(), &["status", "--porcelain"]).unwrap_or_else(|e| panic!("{e}"));
        assert_eq!(
            status, "",
            "{name}: the lift changed the committed copy:\n{status}"
        );
        assert_eq!(
            hash_tree(scratch.path()),
            before,
            "{name}: a file hash changed"
        );
    }
    assert!(clean >= 4, "clean lifts: {clean}");
    assert!(blocking >= 4, "blocking lifts: {blocking}");
}

// ---------------------------------------------------------------------------
// Determinism and hygiene over the corpus (FR-095, FR-096)
// ---------------------------------------------------------------------------

/// The four files of a lift by the built binary of `bundle`, run in `cwd`
/// with `HOME` set to `home`, as (label, bytes).
fn lift_by_binary(bundle: &Path, cwd: &Path, home: &Path) -> Vec<(&'static str, Vec<u8>)> {
    let out = tempfile::tempdir().expect("tempdir");
    let document = out.path().join("semantic-ir.json");
    let mut command = Command::new(env!("CARGO_BIN_EXE_extraction-frontend"));
    command.arg("lift").arg("--bundle").arg(bundle);
    for module in declared_module_roots(bundle) {
        command.arg("--module").arg(module);
    }
    let output = command
        .arg("--out")
        .arg(&document)
        .current_dir(cwd)
        .env("HOME", home)
        .output()
        .expect("spawn extraction-frontend");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    [
        ("semantic-ir.json", GOLDEN_DOCUMENT),
        (
            "semantic-ir.json.fingerprint",
            "semantic-ir.json.fingerprint",
        ),
        ("semantic-ir.json.diagnostics.json", GOLDEN_DIAGNOSTICS),
        ("semantic-ir.json.provenance.json", GOLDEN_PROVENANCE),
    ]
    .into_iter()
    .map(|(file, golden)| (golden, fs::read(out.path().join(file)).expect("read")))
    .collect()
}

#[trace("TC-1253", "FR-095-AC-8")]
#[trace("TC-1253", "FR-095-CON-1")]
#[test]
fn tc_1253_one_checkout_lifted_from_two_working_directories_and_homes_matches_itself_and_the_golden(
) {
    let scratch = tempfile::tempdir().expect("tempdir");
    let mut runs = Vec::new();
    for label in ["a", "b"] {
        let cwd = scratch.path().join(format!("cwd-{label}"));
        let home = scratch.path().join(format!("home-{label}"));
        fs::create_dir_all(&cwd).expect("mkdir");
        fs::create_dir_all(&home).expect("mkdir");
        runs.push(lift_by_binary(
            &fixture("config-version-table"),
            &cwd,
            &home,
        ));
    }
    let expected = fixture("config-version-table").join(EXPECTED_DIR);
    for ((golden, a), (_, b)) in runs[0].iter().zip(&runs[1]) {
        assert_eq!(a, b, "{golden} differs between the two runs");
        assert_eq!(
            a,
            &fs::read(expected.join(golden)).expect("golden"),
            "{golden} differs from the committed golden"
        );
    }
}

/// Every JSON string value under `value`, depth first.
fn strings(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::String(s) => out.push(s.clone()),
        Value::Array(items) => items.iter().for_each(|v| strings(v, out)),
        Value::Object(members) => members.values().for_each(|v| strings(v, out)),
        _ => {}
    }
}

/// Whether `text` holds an ISO 8601 date-time (`dddd-dd-ddT`).
fn has_iso_timestamp(text: &str) -> bool {
    let b = text.as_bytes();
    (0..b.len().saturating_sub(10)).any(|i| {
        b[i..i + 4].iter().all(u8::is_ascii_digit)
            && b[i + 4] == b'-'
            && b[i + 5..i + 7].iter().all(u8::is_ascii_digit)
            && b[i + 7] == b'-'
            && b[i + 8..i + 10].iter().all(u8::is_ascii_digit)
            && b[i + 10] == b'T'
    })
}

/// Whether `text` holds a duration token such as `12ms`, `3s` or `1.5 s`.
fn has_duration(text: &str) -> bool {
    text.split(|c: char| c.is_whitespace() || c == '(' || c == ')' || c == ',')
        .any(|token| {
            let unit = token.trim_start_matches(|c: char| c.is_ascii_digit() || c == '.');
            let digits = &token[..token.len() - unit.len()];
            !digits.is_empty()
                && digits.chars().any(|c| c.is_ascii_digit())
                && matches!(
                    unit,
                    "ms" | "µs" | "us" | "ns" | "s" | "sec" | "secs" | "seconds"
                )
        })
}

/// The host's name and the user's name, when the environment tells them,
/// each at least three characters so a common word cannot masquerade.
fn host_and_user() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(host) = fs::read_to_string("/etc/hostname") {
        out.push(host.trim().to_string());
    }
    for var in ["HOSTNAME", "USER", "LOGNAME"] {
        if let Ok(value) = std::env::var(var) {
            out.push(value);
        }
    }
    out.retain(|s| s.len() >= 3);
    out
}

/// The strings of `value` that name an absolute path, a timestamp, the
/// host, or the user.
fn hygiene_violations(value: &Value, forbid_duration: bool) -> Vec<String> {
    let mut all = Vec::new();
    strings(value, &mut all);
    let names = host_and_user();
    all.into_iter()
        .filter(|s| {
            s.starts_with('/')
                || s.contains("/home/")
                || s.contains("/tmp/")
                || has_iso_timestamp(s)
                || names.iter().any(|n| s.contains(n.as_str()))
                || (forbid_duration && has_duration(s))
        })
        .collect()
}

#[trace("TC-1255", "FR-095-AC-10")]
#[test]
fn tc_1255_no_absolute_path_timestamp_hostname_or_username_in_the_provenance_or_document() {
    // An absolute bundle path, as `make extraction-frontend-lift BUNDLE=...`
    // gives it.
    let bundle = fs::canonicalize(fixture("config-version-table")).expect("absolute");
    assert!(bundle.is_absolute());
    let out = tempfile::tempdir().expect("tempdir");
    let request = request_at(&bundle, out.path());
    let outcome = lift(&request);
    assert!(
        matches!(outcome, LiftOutcome::Written { .. }),
        "{outcome:?}"
    );
    for path in [&request.paths().provenance, &request.paths().document] {
        let value = read_json(path);
        let violations = hygiene_violations(&value, false);
        assert!(violations.is_empty(), "{}: {violations:?}", path.display());
    }
    // The control: the scan sees a planted path and timestamp.
    let planted =
        serde_json::json!({"a": bundle.display().to_string(), "b": "2026-09-09T00:00:00Z"});
    assert_eq!(hygiene_violations(&planted, false).len(), 2);
}

#[trace("TC-1267", "FR-096-AC-9")]
#[trace("TC-1267", "FR-096-CON-3")]
#[test]
fn tc_1267_duplicate_type_name_lifted_twice_yields_identical_diagnostic_bytes_equal_to_the_golden()
{
    let first = lift_fixture("negatives/DUPLICATE_TYPE_NAME");
    let second = lift_fixture("negatives/DUPLICATE_TYPE_NAME");
    let read = |(_, request, outcome): &(tempfile::TempDir, LiftRequest, LiftOutcome)| {
        assert!(
            matches!(outcome, LiftOutcome::Blocked { .. }),
            "{outcome:?}"
        );
        fs::read(&request.paths().diagnostics).expect("diagnostics")
    };
    let a = read(&first);
    let b = read(&second);
    assert_eq!(a, b);
    assert_eq!(
        a,
        fs::read(fixture("negatives/DUPLICATE_TYPE_NAME/expected").join(GOLDEN_DIAGNOSTICS))
            .expect("golden")
    );
}

#[trace("TC-1270", "FR-096-AC-12")]
#[test]
fn tc_1270_no_diagnostic_across_the_corpus_carries_an_absolute_path_timestamp_hostname_or_duration()
{
    let mut scanned = 0usize;
    for name in bundle_fixtures() {
        let (_dir, _request, outcome) = lift_fixture(&name);
        let diagnostics = serde_json::to_value(outcome.diagnostics()).expect("serialize");
        scanned += diagnostics.as_array().map(Vec::len).unwrap_or_default();
        let violations = hygiene_violations(&diagnostics, true);
        assert!(violations.is_empty(), "{name}: {violations:?}");
    }
    assert!(scanned >= 40, "diagnostics scanned: {scanned}");
    let planted = serde_json::json!(["took 12ms", "/home/nobody/x"]);
    assert_eq!(hygiene_violations(&planted, true).len(), 2);
}

// ---------------------------------------------------------------------------
// The change set outside the crate (FR-098-CON-1)
// ---------------------------------------------------------------------------

#[trace("TC-1294", "FR-098-AC-10")]
#[trace("TC-1294", "FR-098-CON-1")]
#[test]
fn tc_1294_the_change_set_outside_the_crate_is_the_three_shared_case_paths_and_the_seam_is_untouched(
) {
    let workspace = workspace_dir();
    // The base is this change's own, resolved from history through NFR-032's
    // sentinels, not `merge-base HEAD main`.
    //
    // `merge-base HEAD main` is `main` itself on any branch cut from it, so the
    // diff is empty and this case fails on a later branch that did nothing —
    // the positive face of issue #51's annexation defect, where the negative
    // face passes vacuously instead. Both ends of the harness range come from
    // history, so the answer is the same before and after this change merges.
    let range = common::run_node(
        &["scripts/extraction-frontend-harness.mjs", "change-range"],
        &[],
        None,
    )
    .unwrap_or_else(|error| panic!("harness change-range: {error}"));
    assert_eq!(range.status, 0, "{}", range.stderr);
    let range: serde_json::Value = serde_json::from_slice(&range.stdout)
        .unwrap_or_else(|error| panic!("harness change-range output: {error}"));
    let base = range["base"].as_str().expect("base").to_string();
    let tip = range["tip"].as_str().expect("tip").to_string();
    let changed = git(
        &workspace,
        &[
            "diff",
            "--name-only",
            &base,
            &tip,
            "--",
            "test/fixtures/compiler",
        ],
    )
    .unwrap_or_else(|e| panic!("{e}"));
    let untracked = git(
        &workspace,
        &[
            "ls-files",
            "--others",
            "--exclude-standard",
            "test/fixtures/compiler",
        ],
    )
    .unwrap_or_else(|e| panic!("{e}"));
    let allowed = |path: &str| {
        path == "test/fixtures/compiler/shared/cases.json"
            || path.starts_with("test/fixtures/compiler/shared/typespec/records-and-scalars/")
            || path.starts_with("test/fixtures/compiler/shared/spec-bundle/")
    };
    let mut paths: Vec<&str> = changed.lines().chain(untracked.lines()).collect();
    paths.sort_unstable();
    paths.dedup();
    assert!(
        paths.contains(&"test/fixtures/compiler/shared/cases.json"),
        "cases.json is in the change set: {paths:?}"
    );
    let outside: Vec<&&str> = paths.iter().filter(|p| !allowed(p)).collect();
    assert!(outside.is_empty(), "outside the permitted set: {outside:?}");
    let seam = git(
        &workspace,
        &[
            "diff",
            "--name-only",
            &base,
            &tip,
            "--",
            "src/compiler/frontend",
            "test/compiler-core.test.ts",
        ],
    )
    .unwrap_or_else(|e| panic!("{e}"));
    assert_eq!(seam, "", "the node seam changed:\n{seam}");
}
