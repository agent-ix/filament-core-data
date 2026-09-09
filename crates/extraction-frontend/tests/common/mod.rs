//! Helpers shared by the integration tests of this crate.
#![allow(dead_code)]

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

pub fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

pub fn workspace_dir() -> PathBuf {
    crate_dir()
        .parent()
        .and_then(Path::parent)
        .expect("crate sits two levels below the workspace root")
        .to_path_buf()
}

/// A walk of `common.schema.json#/$defs/diagnostic` over one instance: the
/// required keys, the closed key set, the code pattern, the severity enum,
/// and the same rules over `causes` and `related`. Returns the JSON
/// pointers of every violation. No jsonschema crate is declared (NFR-033),
/// and `agent_ix_semantic_ir::decide` walks IR bundles, not diagnostics,
/// so this test walks the definition itself.
pub fn diagnostic_schema_violations(instance: &Value, schema: &Value, at: &str) -> Vec<String> {
    let def = &schema["$defs"]["diagnostic"];
    let locus_def = &schema["$defs"]["sourceLocus"];
    let mut out = Vec::new();
    let Some(map) = instance.as_object() else {
        return vec![at.to_string()];
    };
    for key in def["required"].as_array().expect("required") {
        if !map.contains_key(key.as_str().expect("key")) {
            out.push(format!("{at}/{}", key.as_str().expect("key")));
        }
    }
    let allowed = def["properties"].as_object().expect("properties");
    for key in map.keys() {
        if !allowed.contains_key(key) {
            out.push(format!("{at}/{key}"));
        }
    }
    let code = map.get("code").and_then(Value::as_str).unwrap_or("");
    // `^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$`
    let code_ok = code.strip_prefix("agent-ix.").is_some_and(|rest| {
        rest.split_once('.').is_some_and(|(component, name)| {
            !component.is_empty()
                && component
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
                && name.chars().next().is_some_and(|c| c.is_ascii_uppercase())
                && name.len() >= 2
                && name
                    .chars()
                    .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_')
        })
    });
    if !code_ok {
        out.push(format!("{at}/code"));
    }
    let severities = def["properties"]["severity"]["enum"]
        .as_array()
        .expect("enum");
    if !severities.contains(&map["severity"]) {
        out.push(format!("{at}/severity"));
    }
    if map
        .get("message")
        .and_then(Value::as_str)
        .is_none_or(str::is_empty)
    {
        out.push(format!("{at}/message"));
    }
    if !map
        .get("owner")
        .and_then(Value::as_str)
        .is_some_and(|o| o.starts_with("ix://"))
    {
        out.push(format!("{at}/owner"));
    }
    if !map.get("blocking").is_some_and(Value::is_boolean) {
        out.push(format!("{at}/blocking"));
    }
    let locus_ok = |v: &Value, at: &str, out: &mut Vec<String>| {
        let Some(l) = v.as_object() else {
            out.push(at.to_string());
            return;
        };
        for key in locus_def["required"].as_array().expect("required") {
            let key = key.as_str().expect("key");
            if !l.contains_key(key) {
                out.push(format!("{at}/{key}"));
            }
        }
        for key in ["startLine", "startColumn"] {
            if l.get(key).and_then(Value::as_u64).is_none_or(|n| n < 1) {
                out.push(format!("{at}/{key}"));
            }
        }
        if l.get("path")
            .and_then(Value::as_str)
            .is_none_or(|p| p.is_empty() || p.starts_with('/'))
        {
            out.push(format!("{at}/path"));
        }
    };
    if let Some(locus) = map.get("locus") {
        locus_ok(locus, &format!("{at}/locus"), &mut out);
    }
    match map.get("related").and_then(Value::as_array) {
        Some(related) => {
            for (i, r) in related.iter().enumerate() {
                locus_ok(r, &format!("{at}/related/{i}"), &mut out);
            }
        }
        None => out.push(format!("{at}/related")),
    }
    match map.get("causes").and_then(Value::as_array) {
        Some(causes) => {
            for (i, c) in causes.iter().enumerate() {
                out.extend(diagnostic_schema_violations(
                    c,
                    schema,
                    &format!("{at}/causes/{i}"),
                ));
            }
        }
        None => out.push(format!("{at}/causes")),
    }
    out
}

pub fn common_schema() -> Value {
    let path = workspace_dir().join("schema/semantic/v1/common.schema.json");
    serde_json::from_str(&fs::read_to_string(&path).expect("common.schema.json"))
        .expect("common.schema.json is JSON")
}
