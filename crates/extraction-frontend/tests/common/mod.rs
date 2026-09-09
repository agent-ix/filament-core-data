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

// ---------------------------------------------------------------------------
// FR-097 helpers (Task-134): lifting fixtures to a scratch directory and
// shelling to the FR-050 node reader.
// ---------------------------------------------------------------------------

use std::process::Command;

use agent_ix_extraction_frontend::{lift, LiftOutcome, LiftRequest};

pub fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

pub fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

pub fn edge_vocabulary() -> PathBuf {
    fixture("modules/edge-vocabulary")
}

/// The module roots every lift loads (FR-094: the business objects and the
/// edge-vocabulary registry).
pub fn module_roots() -> Vec<PathBuf> {
    vec![business_module(), edge_vocabulary()]
}

/// A request lifting the fixture bundle `name` to `<out_dir>/semantic-ir.json`.
pub fn request(name: &str, out_dir: &Path) -> LiftRequest {
    request_at(&fixture(name), out_dir)
}

pub fn request_at(bundle_root: &Path, out_dir: &Path) -> LiftRequest {
    LiftRequest {
        bundle_root: bundle_root.to_path_buf(),
        module_roots: module_roots(),
        out: out_dir.join("semantic-ir.json"),
        diagnostics: None,
        provenance: None,
    }
}

/// Lift the fixture `name` into a fresh scratch directory.
pub fn lift_fixture(name: &str) -> (tempfile::TempDir, LiftRequest, LiftOutcome) {
    let dir = tempfile::tempdir().expect("tempdir");
    let request = request(name, dir.path());
    let outcome = lift(&request);
    (dir, request, outcome)
}

/// Every committed fixture bundle root (a directory holding `spec/spec.md`)
/// under `fixtures/`, as `fixtures/`-relative names in path order.
pub fn bundle_fixtures() -> Vec<String> {
    fn walk(dir: &Path, root: &Path, out: &mut Vec<String>) {
        if dir.join("spec/spec.md").is_file() {
            let name = dir
                .strip_prefix(root)
                .expect("under fixtures")
                .to_string_lossy()
                .into_owned();
            out.push(name);
            return;
        }
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .filter(|p| p.is_dir())
            .collect();
        entries.sort();
        for entry in entries {
            walk(&entry, root, out);
        }
    }
    let root = crate_dir().join("fixtures");
    let mut out = Vec::new();
    for name in [
        "business",
        "clauses",
        "config-version-fence",
        "config-version-table",
        "edges",
        "legacy",
        "lower",
        "negatives",
        "resolve",
    ] {
        walk(&root.join(name), &root, &mut out);
    }
    out
}

/// Every fixture bundle whose lift writes a document, each lifted into its
/// own scratch directory, in path order. The four core positives must be
/// among them. `legacy` is not one: its only artifact is legacy-form, so
/// `types` is empty and the reader's schema refuses the envelope (EC-140).
pub fn positive_lifts() -> Vec<(String, tempfile::TempDir, LiftRequest, LiftOutcome)> {
    let mut out = Vec::new();
    for name in bundle_fixtures() {
        let (dir, request, outcome) = lift_fixture(&name);
        if matches!(outcome, LiftOutcome::Written { .. }) {
            out.push((name, dir, request, outcome));
        }
    }
    let names: Vec<&str> = out.iter().map(|(n, ..)| n.as_str()).collect();
    for core in [
        "business",
        "config-version-fence",
        "config-version-table",
        "lower/collections",
    ] {
        assert!(
            names.contains(&core),
            "{core} lifts to a document: {names:?}"
        );
    }
    out
}

/// The outcome of one `node` invocation.
pub struct NodeRun {
    pub status: i32,
    pub stdout: Vec<u8>,
    pub stderr: String,
}

/// Run `node` with `args` and `stdin`, resolving `node` on `path` (the
/// process `PATH` when `None`). `Err` names `node` when it cannot be
/// spawned (FR-097-AC-11).
pub fn run_node(args: &[&str], stdin: &[u8], path: Option<&str>) -> Result<NodeRun, String> {
    use std::io::Write;
    let mut command = Command::new("node");
    command
        .args(args)
        .current_dir(workspace_dir())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    if let Some(path) = path {
        command.env("PATH", path);
    }
    let mut child = command.spawn().map_err(|e| {
        format!("`node` could not be started ({e}): the FR-050 reader needs node on PATH")
    })?;
    child
        .stdin
        .take()
        .expect("piped stdin")
        .write_all(stdin)
        .expect("write stdin");
    let output = child.wait_with_output().expect("wait for node");
    Ok(NodeRun {
        status: output.status.code().unwrap_or(-1),
        stdout: output.stdout,
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

/// `normalizeIr` of `src/compiler/ir/normalize.mjs` over the JSON on stdin,
/// as bytes.
pub fn normalize_ir(bytes: &[u8]) -> Vec<u8> {
    let script = format!(
        "const fs=require('fs');const {{pathToFileURL}}=require('url');\
         import(pathToFileURL({:?}).href).then(m=>{{\
         const doc=JSON.parse(fs.readFileSync(0,'utf8'));\
         process.stdout.write(m.normalizeIr(doc));}}).catch(e=>{{console.error(e);process.exit(3);}});",
        workspace_dir().join("src/compiler/ir/normalize.mjs").to_string_lossy()
    );
    let run = run_node(&["-e", &script], bytes, None).expect("node runs");
    assert_eq!(run.status, 0, "normalizeIr failed: {}", run.stderr);
    run.stdout
}

/// `node src/compiler/cli.mjs inspect --ir <path> --json`: the exit status
/// and the parsed summary.
pub fn inspect(path: &Path) -> (i32, Value) {
    let path = path.to_string_lossy().into_owned();
    let run = run_node(
        &["src/compiler/cli.mjs", "inspect", "--ir", &path, "--json"],
        &[],
        None,
    )
    .expect("node runs");
    let summary: Value = serde_json::from_slice(&run.stdout)
        .unwrap_or_else(|e| panic!("inspect output is JSON ({e}): {}", run.stderr));
    (run.status, summary)
}

/// `strings` sorted by `Intl.Collator(locale).compare` in node.
pub fn collator_order(strings: &[String], locale: &str) -> Vec<String> {
    let script = format!(
        "const fs=require('fs');const list=JSON.parse(fs.readFileSync(0,'utf8'));\
         const c=new Intl.Collator({locale:?});\
         process.stdout.write(JSON.stringify([...list].sort(c.compare)));"
    );
    let input = serde_json::to_vec(strings).expect("json");
    let run = run_node(&["-e", &script], &input, None).expect("node runs");
    assert_eq!(run.status, 0, "collator failed: {}", run.stderr);
    serde_json::from_slice(&run.stdout).expect("json list")
}

/// The file names of `dir`, sorted.
pub fn entries(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names
}
