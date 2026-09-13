//! FR-098 "Backend acceptance and the payload check" (FR-098-AC-9,
//! FR-098-CON-3): a payload validator the test derives from the lifted
//! `config-version-table` golden, kept here and nowhere under `src/`.
//!
//! The helper evidences the test author's derivation only; the #85 backend
//! acceptance is tested separately below. It
//! reads a record's fields, follows each `typeRef` through aliases to a
//! kernel scalar or a record, and checks a JSON object against the
//! presence, scalar and `min`/`max`/`minLength`/`maxLength`/`nonEmpty`
//! constraints it finds. It is not exported, not `pub`, and no module under
//! `src/` names it.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

mod common;

use common::{crate_dir, fixture, read_json, run_node};
use ix_trace_rs::trace;
use serde_json::Value;

/// The record this test validates payloads of.
const RECORD: &str = "ix://agent-ix/config-service/type/ConfigVersion";

/// One derived field rule: the scalar it resolves to (or `record`), its
/// presence, and its constraints as (keyword, operands).
struct FieldRule {
    name: String,
    required: bool,
    nullable: bool,
    scalar: String,
    constraints: Vec<(String, Value)>,
}

/// The payload schema of `record` derived from `document`.
fn payload_schema(document: &Value, record: &str) -> Vec<FieldRule> {
    let types: BTreeMap<&str, &Value> = document["types"]
        .as_array()
        .expect("types")
        .iter()
        .map(|t| (t["identity"].as_str().expect("identity"), t))
        .collect();
    let definition = types[record];
    let mut rules = Vec::new();
    for field in definition["fields"].as_array().expect("fields") {
        let mut constraints = Vec::new();
        let mut target = field["typeRef"].as_str().expect("typeRef");
        let scalar = loop {
            let node = types[target];
            for c in node["constraints"].as_array().into_iter().flatten() {
                constraints.push((
                    c["keyword"].as_str().expect("keyword").to_string(),
                    c["operands"].clone(),
                ));
            }
            match node["kind"].as_str() {
                Some("alias") => target = node["target"].as_str().expect("target"),
                Some("scalar") => break node["scalar"].as_str().expect("scalar").to_string(),
                Some("record") => break "record".to_string(),
                other => panic!("{target}: kind {other:?}"),
            }
        };
        rules.push(FieldRule {
            name: field["name"].as_str().expect("name").to_string(),
            required: field["presence"] == "required",
            nullable: field["nullable"] == true,
            scalar,
            constraints,
        });
    }
    rules
}

/// The violations of `payload` against `schema`, each naming the field.
fn validate_payload(schema: &[FieldRule], payload: &Value) -> Vec<String> {
    let mut out = Vec::new();
    let object = payload.as_object().expect("an object payload");
    for rule in schema {
        let Some(value) = object.get(&rule.name) else {
            if rule.required {
                out.push(format!("{}: required", rule.name));
            }
            continue;
        };
        if value.is_null() {
            if !rule.nullable {
                out.push(format!("{}: null", rule.name));
            }
            continue;
        }
        let scalar_ok = match rule.scalar.as_str() {
            "uuid" | "string" | "datetime" => value.is_string(),
            "integer" => value.as_i64().is_some(),
            "number" => value.is_number(),
            "boolean" => value.is_boolean(),
            "record" => value.is_object(),
            other => panic!("unmapped scalar {other}"),
        };
        if !scalar_ok {
            out.push(format!("{}: not a {}", rule.name, rule.scalar));
            continue;
        }
        for (keyword, operands) in &rule.constraints {
            let ok = match keyword.as_str() {
                "min" => value.as_f64() >= operands["value"].as_f64(),
                "max" => value.as_f64() <= operands["value"].as_f64(),
                "minLength" => {
                    value.as_str().map(str::len) >= operands["value"].as_u64().map(|n| n as usize)
                }
                "maxLength" => {
                    value.as_str().map(str::len) <= operands["value"].as_u64().map(|n| n as usize)
                }
                "nonEmpty" => value.as_str().is_some_and(|s| !s.is_empty()),
                _ => true,
            };
            if !ok {
                out.push(format!("{}: {keyword} {operands}", rule.name));
            }
        }
    }
    out
}

#[trace("TC-1293", "FR-098-AC-9")]
#[test]
fn tc_1293_a_config_version_payload_validates_and_version_number_zero_fails_at_version_number() {
    let document = read_json(&fixture("config-version-table/expected/semantic-ir.json"));
    let schema = payload_schema(&document, RECORD);
    let names: Vec<&str> = schema.iter().map(|r| r.name.as_str()).collect();
    assert_eq!(
        names,
        [
            "createdAt",
            "createdBy",
            "data",
            "hash",
            "id",
            "parent",
            "versionNumber"
        ]
    );
    let representative = serde_json::json!({
        "id": "0b6e6a2c-1d2a-4f0e-9c0f-7a3b1d2e3f40",
        "versionNumber": 1,
        "data": {"feature": true},
        "hash": "sha256:abc",
        "createdAt": "2026-01-01T00:00:00Z",
        "createdBy": "operator"
    });
    assert_eq!(
        validate_payload(&schema, &representative),
        Vec::<String>::new()
    );
    let violations = validate_payload(&schema, &serde_json::json!({"versionNumber": 0}));
    assert!(
        violations
            .iter()
            .any(|v| v.starts_with("versionNumber: min")),
        "{violations:?}"
    );
    // `parent` is optional: its absence is not a violation.
    assert!(
        !violations.iter().any(|v| v.starts_with("parent")),
        "{violations:?}"
    );
}

#[trace("TC-1337", "FR-100-AC-2")]
#[test]
fn tc_1337_json_schema_target_accepts_the_lifted_config_version_table_document() {
    let out = tempfile::tempdir().expect("tempdir");
    let golden = fixture("config-version-table/expected/semantic-ir.json");
    let manifest = out.path().join("manifest.json");
    let run = run_node(
        &[
            "src/compiler/cli.mjs",
            "generate",
            "--ir",
            &golden.to_string_lossy(),
            "--target",
            "json-schema",
            "--out-root",
            &out.path().join("out").to_string_lossy(),
            "--manifest",
            &manifest.to_string_lossy(),
        ],
        &[],
        None,
    )
    .unwrap_or_else(|e| panic!("{e}"));
    assert_eq!(run.status, 0, "{}", run.stderr);
    let output = read_json(&manifest);
    assert_eq!(output["state"], "success");
    assert!(out.path().join("out/ConfigVersion.json").is_file());
}

/// Every Rust source under `dir`, recursively.
fn sources(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
    for entry in fs::read_dir(dir).expect("read_dir") {
        let path = entry.expect("entry").path();
        if path.is_dir() {
            sources(&path, out);
        } else if path.extension().is_some_and(|e| e == "rs") {
            out.push(path);
        }
    }
}

#[trace("TC-1338", "FR-098-CON-3")]
#[test]
fn tc_1338_the_payload_helper_lives_under_tests_only_and_is_unreachable_from_lift_and_inspect() {
    let mut src = Vec::new();
    sources(&crate_dir().join("src"), &mut src);
    assert!(src.len() >= 20, "{}", src.len());
    for path in &src {
        let text = fs::read_to_string(path).expect("read");
        for token in ["payload_schema", "validate_payload", "FieldRule"] {
            assert!(
                !text.contains(token),
                "{}: names the test helper `{token}`",
                path.display()
            );
        }
    }
    // The public surface: nothing `lib.rs` re-exports is payload-shaped.
    let lib = fs::read_to_string(crate_dir().join("src/lib.rs")).expect("lib.rs");
    assert!(!lib.to_lowercase().contains("payload"), "{lib}");
    // The helper is here, private, and not `pub`.
    let this = fs::read_to_string(crate_dir().join("tests/payload.rs")).expect("payload.rs");
    assert!(this.contains("fn payload_schema("));
    assert!(!this.contains(&format!("pub fn {}", "payload_schema")));
    // A planted export would fail the gate: the predicate sees it.
    let planted = format!("pub fn {}(document: &Value) {{}}", "payload_schema");
    assert!(planted.contains(&format!("pub fn {}", "payload_schema")));
}
