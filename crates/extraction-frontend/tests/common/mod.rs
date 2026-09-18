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
        module_roots: declared_module_roots(bundle_root),
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
        "architecture",
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

// ---------------------------------------------------------------------------
// FR-098 helpers (Task-136): the fixture inventory, declared module roots,
// scratch directories under the target directory, and hashing.
// ---------------------------------------------------------------------------

use std::collections::BTreeMap;

use sha2::{Digest, Sha256};

/// The fixture inventory root.
pub fn fixtures_root() -> PathBuf {
    crate_dir().join("fixtures")
}

/// The module roots a fixture bundle is lifted under, exactly as the
/// golden writer decides them (`write::fixture_module_roots`): the roots
/// its `modules.json` names, else its own `modules/*`, else the default
/// pair.
pub fn declared_module_roots(bundle_root: &Path) -> Vec<PathBuf> {
    agent_ix_extraction_frontend::write::fixture_module_roots(
        bundle_root,
        &fixtures_root(),
        &module_roots(),
    )
    .unwrap_or_else(|e| panic!("{}: module roots: {e}", bundle_root.display()))
}

/// The cargo target directory the test binary runs from
/// (`<target>/debug/deps/<test>`), so a scratch directory under it is
/// under `CARGO_TARGET_DIR` (FR-098-AC-2).
pub fn target_dir() -> PathBuf {
    let exe = std::env::current_exe().expect("current_exe");
    exe.parent()
        .and_then(Path::parent)
        .and_then(Path::parent)
        .expect("<target>/<profile>/deps/<exe>")
        .to_path_buf()
}

/// `<target>/extraction-frontend-scratch/<label>`, emptied.
pub fn scratch_dir(label: &str) -> PathBuf {
    let dir = target_dir().join("extraction-frontend-scratch").join(label);
    if dir.exists() {
        fs::remove_dir_all(&dir).expect("remove scratch");
    }
    fs::create_dir_all(&dir).expect("create scratch");
    dir
}

/// Every regular file under `root`, recursively, as `root`-relative
/// `/`-joined paths in code-point order, each with its SHA-256 hex.
pub fn hash_tree(root: &Path) -> BTreeMap<String, String> {
    fn walk(dir: &Path, root: &Path, out: &mut BTreeMap<String, String>) {
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("read_dir")
            .map(|e| e.expect("entry").path())
            .collect();
        entries.sort();
        for entry in entries {
            if entry.file_name().is_some_and(|n| n == ".git") {
                continue;
            }
            if entry.is_dir() {
                walk(&entry, root, out);
            } else {
                let rel = entry
                    .strip_prefix(root)
                    .expect("under root")
                    .components()
                    .map(|c| c.as_os_str().to_string_lossy().into_owned())
                    .collect::<Vec<_>>()
                    .join("/");
                let bytes = fs::read(&entry).expect("read");
                out.insert(rel, format!("{:x}", Sha256::digest(&bytes)));
            }
        }
    }
    let mut out = BTreeMap::new();
    walk(root, root, &mut out);
    out
}

/// Copy `src` into `dst` recursively (files and directories only).
pub fn copy_tree(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).expect("create");
    for entry in fs::read_dir(src).expect("read_dir") {
        let entry = entry.expect("entry");
        let target = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), &target).expect("copy");
        }
    }
}

/// The parsed JSON of `path`.
pub fn read_json(path: &Path) -> Value {
    serde_json::from_slice(&fs::read(path).unwrap_or_else(|e| panic!("{}: {e}", path.display())))
        .unwrap_or_else(|e| panic!("{} is not JSON: {e}", path.display()))
}

/// The offset of the first differing byte of `a` and `b`, when they differ.
pub fn first_difference(a: &[u8], b: &[u8]) -> Option<usize> {
    a.iter()
        .zip(b)
        .position(|(x, y)| x != y)
        .or_else(|| (a.len() != b.len()).then_some(a.len().min(b.len())))
}

/// `git <args>` in `cwd`: the trimmed stdout, or the failure text.
pub fn git(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-c")
        .arg("user.name=Task-136")
        .arg("-c")
        .arg("user.email=task-136@example.invalid")
        .arg("-c")
        .arg("commit.gpgsign=false")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("`git` could not be started ({e}): git is needed on PATH"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

/// `value` with the members named in `drop` removed at the top level
/// (shared by the FR-093 and FR-094 renaming properties, SR-170 FND-1509).
pub fn without(value: &Value, drop: &[&str]) -> Value {
    let mut out = value.clone();
    if let Some(map) = out.as_object_mut() {
        for key in drop {
            map.remove(*key);
        }
    }
    out
}

/// `sha256sum` over `bytes`, computed outside the crate (the FR-095 and
/// FR-097 digest oracles, SR-170 FND-1509).
pub fn sha256sum(bytes: &[u8]) -> String {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("input");
    fs::write(&path, bytes).expect("write");
    let out = Command::new("sha256sum")
        .arg(&path)
        .output()
        .expect("spawn sha256sum");
    assert!(out.status.success(), "sha256sum failed");
    String::from_utf8(out.stdout)
        .expect("utf-8")
        .split_whitespace()
        .next()
        .expect("digest column")
        .to_string()
}
