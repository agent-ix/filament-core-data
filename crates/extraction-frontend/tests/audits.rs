//! NFR-031-AC-4, AC-5, AC-7, AC-8, AC-9 and AC-10: the static audits over
//! `crates/extraction-frontend/src/`, the offline run, the
//! `forbid(unsafe_code)` proof and the bundle-tree fuzz.
//!
//! Every grep gate here is a function over a directory, so the same gate
//! runs over the committed `src/` (must pass) and over a scratch copy
//! carrying a planted token (must fail); a gate whose exemption list
//! widened at implementation time would still fail its planted control.
//! Each gate prints the number it measured. A gate that cannot run on this
//! host fails saying so; none passes vacuously (Task-137 Notes).

use std::cell::{Cell, RefCell};
use std::collections::BTreeMap;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::Mutex;

mod common;
mod strategies;

use agent_ix_extraction_frontend::{lift, LiftOutcome, LiftRequest};
use common::{
    copy_tree, crate_dir, declared_module_roots, first_difference, fixture, module_roots,
    scratch_dir, workspace_dir,
};
use ix_trace_rs::trace;
use proptest::test_runner::{Config, TestRunner};
use strategies::bundle_tree::bundle_tree;

const TOOLCHAIN: &str = "1.98.1";
const PACKAGE: &str = "agent-ix-extraction-frontend";

// ---------------------------------------------------------------------------
// The grep gate
// ---------------------------------------------------------------------------

/// One hit of a gate: the `src/`-relative file, the 1-based line, the
/// token, and the line's text.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Hit {
    file: String,
    line: usize,
    token: &'static str,
    text: String,
}

/// One token with the files it is exempt in. An exemption names a file
/// under `src/` by its file name; a token with no exemption is banned in
/// every file.
struct Rule {
    token: &'static str,
    exempt_in: &'static [&'static str],
}

/// The code of one source line: the text before a `//` line comment, so
/// a token a doc comment names as forbidden does not count as a use.
fn code_of(line: &str) -> &str {
    line.split_once("//").map_or(line, |(code, _)| code)
}

/// Every `.rs` file directly under `src`, in path order, with its text.
fn sources(src: &Path) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let mut entries: Vec<PathBuf> = fs::read_dir(src)
        .unwrap_or_else(|e| panic!("{}: {e}", src.display()))
        .map(|e| e.expect("entry").path())
        .collect();
    entries.sort();
    for path in entries {
        if path.extension().is_some_and(|x| x == "rs") {
            let name = path
                .file_name()
                .expect("name")
                .to_string_lossy()
                .into_owned();
            out.insert(name, fs::read_to_string(&path).expect("read"));
        }
    }
    assert!(!out.is_empty(), "{} holds Rust sources", src.display());
    out
}

/// Run `rules` over every source under `src`: every non-exempt code line
/// naming a token is a hit.
fn audit(src: &Path, rules: &[Rule]) -> Vec<Hit> {
    let mut hits = Vec::new();
    for (file, text) in sources(src) {
        for (index, line) in text.lines().enumerate() {
            let code = code_of(line);
            for rule in rules {
                if rule.exempt_in.contains(&file.as_str()) {
                    continue;
                }
                if code.contains(rule.token) {
                    hits.push(Hit {
                        file: file.clone(),
                        line: index + 1,
                        token: rule.token,
                        text: line.trim().to_string(),
                    });
                }
            }
        }
    }
    hits
}

/// A scratch copy of `src/` with `planted` appended as a new line after
/// the last `use` line of `file`, so the token sits in code, not in a
/// comment or a string.
fn planted_src(label: &str, file: &str, planted: &str) -> PathBuf {
    let scratch = scratch_dir(label).join("src");
    copy_tree(&crate_dir().join("src"), &scratch);
    let path = scratch.join(file);
    let text = fs::read_to_string(&path).expect("read");
    let last_use = text
        .lines()
        .enumerate()
        .filter(|(_, l)| l.starts_with("use "))
        .map(|(i, _)| i)
        .last()
        .expect("a `use` line to plant after");
    let mut lines: Vec<&str> = text.lines().collect();
    lines.insert(last_use + 1, planted);
    let mut out = lines.join("\n");
    out.push('\n');
    fs::write(&path, out).expect("write planted copy");
    scratch
}

fn summary(hits: &[Hit]) -> String {
    hits.iter()
        .map(|h| format!("{}:{} [{}] {}", h.file, h.line, h.token, h.text))
        .collect::<Vec<_>>()
        .join("\n")
}

// ---------------------------------------------------------------------------
// NFR-031-AC-4: no directory enumeration of the crate's own
// ---------------------------------------------------------------------------

/// The manifest path of the pinned `quire-rs` as cargo resolved it, from
/// `cargo metadata` in offline mode.
fn quire_rs_root() -> PathBuf {
    let output = cargo(&["metadata", "--offline", "--locked", "--format-version", "1"]);
    assert!(
        output.status.success(),
        "cargo metadata:\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let metadata: serde_json::Value = serde_json::from_slice(&output.stdout).expect("json");
    let manifest = metadata["packages"]
        .as_array()
        .expect("packages")
        .iter()
        .find(|p| p["name"] == "quire-rs")
        .and_then(|p| p["manifest_path"].as_str())
        .expect("quire-rs is resolved");
    PathBuf::from(manifest)
        .parent()
        .expect("manifest dir")
        .to_path_buf()
}

fn cargo(args: &[&str]) -> Output {
    Command::new("cargo")
        .arg(format!("+{TOOLCHAIN}"))
        .args(args)
        .current_dir(workspace_dir())
        .output()
        .unwrap_or_else(|e| panic!("cargo +{TOOLCHAIN} could not be started ({e}): the gate cannot run, and this is a failure rather than a skip"))
}

#[trace("TC-1303", "NFR-031-AC-4")]
#[test]
fn tc_1303_the_crate_enumerates_no_directory_itself_and_the_engine_loads_path_sorted() {
    let src = crate_dir().join("src");

    // Enumeration APIs: `read_dir` and `ReadDir` are permitted only in
    // `write.rs`, whose three sites walk the fixture inventory for
    // `lift --write-goldens` and install a staged golden; none is on the
    // lift path, and each sorts what it read. No walker crate is used.
    let enumeration = [
        Rule {
            token: "read_dir",
            exempt_in: &["write.rs"],
        },
        Rule {
            token: "ReadDir",
            exempt_in: &["write.rs"],
        },
        Rule {
            token: "walkdir",
            exempt_in: &[],
        },
        Rule {
            token: "glob::",
            exempt_in: &[],
        },
        Rule {
            token: "ignore::Walk",
            exempt_in: &[],
        },
    ];
    let hits = audit(&src, &enumeration);
    eprintln!(
        "TC-1303 enumeration audit: {} hit(s) outside write.rs",
        hits.len()
    );
    assert!(
        hits.is_empty(),
        "directory enumeration outside write.rs:\n{}",
        summary(&hits)
    );
    let write_rs = fs::read_to_string(src.join("write.rs")).expect("write.rs");
    let read_dir_sites = write_rs
        .lines()
        .filter(|l| code_of(l).contains("read_dir"))
        .count();
    let sort_sites = write_rs
        .lines()
        .filter(|l| code_of(l).contains(".sort()"))
        .count();
    assert_eq!(read_dir_sites, 3, "write.rs: the three inventory walks");
    assert!(
        sort_sites >= read_dir_sites,
        "write.rs: every read_dir is followed by a sort ({sort_sites} sort sites for {read_dir_sites} read_dir sites)"
    );
    // The lift path never reaches those sites: `lift.rs` and `bundle.rs`
    // name neither the golden-writer functions nor `read_dir`.
    for file in ["lift.rs", "bundle.rs"] {
        let text = fs::read_to_string(src.join(file)).expect(file);
        for token in [
            "read_dir",
            "fixture_bundles",
            "fixture_module_roots",
            "install_golden",
        ] {
            assert!(
                !text.lines().any(|l| code_of(l).contains(token)),
                "{file} names {token}"
            );
        }
    }

    // FR-091-CON-2: `bundle.rs` is the one module naming the engine's
    // loaders, and it names both.
    let named_in: Vec<String> = sources(&src)
        .into_iter()
        .filter(|(_, text)| {
            text.lines()
                .any(|l| code_of(l).contains("load_repo") || code_of(l).contains("load_module_set"))
        })
        .map(|(file, _)| file)
        .collect();
    assert_eq!(
        named_in,
        ["bundle.rs"],
        "the loaders are named in bundle.rs alone"
    );
    let bundle_rs = fs::read_to_string(src.join("bundle.rs")).expect("bundle.rs");
    assert!(
        bundle_rs.contains("load_repo(root)"),
        "bundle.rs calls load_repo"
    );
    assert!(
        bundle_rs.contains("Registry::load_module_set(module_roots)"),
        "bundle.rs calls Registry::load_module_set"
    );

    // The citation: the pinned engine's `src/corpus/walk.rs` sorts by path
    // and carries TC-473 (its NFR-006).
    let walk = quire_rs_root().join("src/corpus/walk.rs");
    let walk_text = fs::read_to_string(&walk)
        .unwrap_or_else(|e| panic!("{} (the pinned quire-rs walk.rs): {e}", walk.display()));
    assert!(walk_text.contains("TC-473"), "walk.rs cites TC-473");
    assert!(
        walk_text.contains("outcomes.sort_by(|a, b| a.path().cmp(b.path()))"),
        "walk.rs sorts outcomes by path"
    );
    eprintln!(
        "TC-1303: 0 directories enumerated by the crate on the lift path; loading is path-sorted at {}",
        walk.display()
    );
}

// ---------------------------------------------------------------------------
// NFR-031-AC-5: ambient inputs
// ---------------------------------------------------------------------------

/// The ambient-input rules with the exemption list NFR-031-AC-5 names:
/// `std::fs` in `write.rs`, `std::env` in the binary's argument parsing.
/// `bundle.rs` is not exempt: its manifest read goes through
/// `write::read_manifest`, so `bundle.rs` itself names no `std::fs`
/// (stricter than the criterion's allowance).
fn ambient_rules() -> Vec<Rule> {
    vec![
        Rule {
            token: "SystemTime",
            exempt_in: &[],
        },
        Rule {
            token: "Instant",
            exempt_in: &[],
        },
        Rule {
            token: "std::env",
            exempt_in: &["main.rs"],
        },
        Rule {
            token: "env::var",
            exempt_in: &[],
        },
        Rule {
            token: "env::args",
            exempt_in: &["main.rs"],
        },
        Rule {
            token: "env::current_dir",
            exempt_in: &[],
        },
        Rule {
            token: "env!(",
            exempt_in: &[],
        },
        Rule {
            token: "option_env!(",
            exempt_in: &[],
        },
        Rule {
            token: "hostname",
            exempt_in: &[],
        },
        Rule {
            token: "gethostname",
            exempt_in: &[],
        },
        Rule {
            token: "rand::",
            exempt_in: &[],
        },
        Rule {
            token: "rand_core",
            exempt_in: &[],
        },
        Rule {
            token: "getrandom",
            exempt_in: &[],
        },
        Rule {
            token: "RandomState",
            exempt_in: &[],
        },
        Rule {
            token: "std::net",
            exempt_in: &[],
        },
        Rule {
            token: "process::Command",
            exempt_in: &[],
        },
        Rule {
            token: "Command::new",
            exempt_in: &[],
        },
        Rule {
            token: "std::fs",
            exempt_in: &["write.rs"],
        },
        Rule {
            token: "fs::",
            exempt_in: &["write.rs"],
        },
    ]
}

#[trace("TC-1304", "NFR-031-AC-5")]
#[test]
fn tc_1304_no_ambient_input_outside_the_exemption_list_and_a_planted_env_var_in_lower_rs_fails() {
    let src = crate_dir().join("src");
    let rules = ambient_rules();
    let hits = audit(&src, &rules);
    eprintln!(
        "TC-1304 ambient-input audit over {} file(s): {} hit(s) outside the exemption list",
        sources(&src).len(),
        hits.len()
    );
    assert!(hits.is_empty(), "ambient inputs:\n{}", summary(&hits));

    // The exemptions are used as narrowly as the criterion says:
    // `write.rs` names `std::fs`; `main.rs` reaches `std::env` only
    // through clap's argument parsing (no `env::var`, checked above).
    let main_rs = fs::read_to_string(src.join("main.rs")).expect("main.rs");
    assert!(
        !main_rs.lines().any(|l| code_of(l).contains("std::env")),
        "main.rs names std::env directly; clap reads the arguments"
    );
    let write_rs = fs::read_to_string(src.join("write.rs")).expect("write.rs");
    assert!(
        write_rs.contains("use std::fs;"),
        "write.rs is the std::fs module"
    );
    // `bundle.rs` reaches the file system only through the engine's
    // loaders and `write::read_manifest`, whose one read is
    // `<root>/manifest.yaml`.
    assert!(
        write_rs.contains("pub fn read_manifest(root: &Path)")
            && write_rs.contains("let path = root.join(MANIFEST);")
            && write_rs.contains("pub const MANIFEST: &str = \"manifest.yaml\";"),
        "read_manifest reads exactly <root>/manifest.yaml"
    );
    let manifest_readers: Vec<String> = sources(&src)
        .into_iter()
        .filter(|(_, t)| t.lines().any(|l| code_of(l).contains("read_manifest(")))
        .map(|(f, _)| f)
        .collect();
    assert_eq!(
        manifest_readers,
        ["lift.rs", "write.rs"],
        "read_manifest is defined in write.rs and called from the lift"
    );

    // The planted control: `std::env::var` in `lower.rs`.
    let planted = planted_src(
        "tc-1304-planted",
        "lower.rs",
        "const PLANTED: fn() -> Result<String, std::env::VarError> = || std::env::var(\"HOME\");",
    );
    let planted_hits = audit(&planted, &rules);
    eprintln!(
        "TC-1304 planted control (std::env::var in lower.rs): {} hit(s)",
        planted_hits.len()
    );
    assert!(
        !planted_hits.is_empty(),
        "the gate fails on the planted std::env::var"
    );
    assert!(
        planted_hits
            .iter()
            .all(|h| h.file == "lower.rs" && h.text.contains("PLANTED")),
        "every planted hit is the planted line:\n{}",
        summary(&planted_hits)
    );
    assert!(
        planted_hits.iter().any(|h| h.token == "std::env"),
        "the std::env rule caught it"
    );
}

// ---------------------------------------------------------------------------
// NFR-031-AC-8: HashMap / HashSet
// ---------------------------------------------------------------------------

fn hash_rules() -> Vec<Rule> {
    vec![
        Rule {
            token: "HashMap",
            exempt_in: &[],
        },
        Rule {
            token: "HashSet",
            exempt_in: &[],
        },
    ]
}

#[trace("TC-1307", "NFR-031-AC-8")]
#[test]
fn tc_1307_the_hashmap_audit_reports_zero_hits_with_an_empty_exemption_list_and_fails_on_a_planted_hashmap(
) {
    let src = crate_dir().join("src");
    let rules = hash_rules();
    assert!(
        rules.iter().all(|r| r.exempt_in.is_empty()),
        "the exemption list is empty"
    );
    let hits = audit(&src, &rules);
    eprintln!(
        "TC-1307 HashMap/HashSet audit over {} file(s): {} hit(s), exemption list empty",
        sources(&src).len(),
        hits.len()
    );
    assert!(hits.is_empty(), "HashMap/HashSet:\n{}", summary(&hits));

    // Every map in the crate is ordered: `BTreeMap`, `BTreeSet`, or the
    // engine's `IndexMap`, and `serde_json::Map` is the ordered variant
    // (`preserve_order` is not enabled; it sorts by key).
    let ordered: usize = sources(&src)
        .values()
        .map(|t| {
            t.lines()
                .filter(|l| {
                    let c = code_of(l);
                    c.contains("BTreeMap") || c.contains("BTreeSet") || c.contains("IndexMap")
                })
                .count()
        })
        .sum();
    assert!(ordered > 0, "the crate does use ordered maps");
    eprintln!("TC-1307: {ordered} ordered-map site(s) (BTreeMap/BTreeSet/IndexMap)");

    let planted = planted_src(
        "tc-1307-planted",
        "lower.rs",
        "type Planted = std::collections::HashMap<String, String>;",
    );
    let planted_hits = audit(&planted, &rules);
    eprintln!(
        "TC-1307 planted control (HashMap in lower.rs): {} hit(s)",
        planted_hits.len()
    );
    assert_eq!(
        planted_hits.len(),
        1,
        "exactly the planted line:\n{}",
        summary(&planted_hits)
    );
    assert_eq!(planted_hits[0].file, "lower.rs");
    assert_eq!(planted_hits[0].token, "HashMap");
}

// ---------------------------------------------------------------------------
// NFR-031-AC-7: offline, no sockets
// ---------------------------------------------------------------------------

/// Crates that open sockets; none may be in the resolved tree.
const SOCKET_CRATES: [&str; 14] = [
    "reqwest",
    "hyper",
    "tokio",
    "ureq",
    "curl",
    "mio",
    "socket2",
    "native-tls",
    "openssl",
    "rustls",
    "async-std",
    "smol",
    "isahc",
    "attohttpc",
];

/// `unshare -rn <program> <args>`: the program in a fresh network
/// namespace (user namespace first, so no privilege is needed).
fn unshare(program: &Path, args: &[OsString], cwd: &Path) -> Output {
    Command::new("unshare")
        .arg("-rn")
        .arg(program)
        .args(args)
        .current_dir(cwd)
        .output()
        .unwrap_or_else(|e| panic!("`unshare` could not be started ({e}): the namespace gate cannot run, and this is a failure rather than a skip"))
}

/// Fail naming the reason when `unshare -rn` cannot create a namespace
/// on this host.
fn assert_unshare_available() {
    let probe = Command::new("unshare")
        .args(["-rn", "true"])
        .output()
        .unwrap_or_else(|e| panic!("`unshare` could not be started ({e}): the namespace gate cannot run, and this is a failure rather than a skip"));
    assert!(
        probe.status.success(),
        "`unshare -rn true` failed on this host ({}): the namespace gate cannot run, and this is a failure rather than a skip",
        String::from_utf8_lossy(&probe.stderr).trim()
    );
}

fn os(s: impl Into<OsString>) -> OsString {
    s.into()
}

#[trace("TC-1306", "NFR-031-AC-7")]
#[test]
fn tc_1306_a_lift_under_unshare_n_reproduces_the_golden_and_no_dependency_opens_a_socket() {
    assert_unshare_available();

    // A lift of the fixture in a network namespace with no interfaces:
    // exit 0 and the golden bytes.
    let bundle = fixture("config-version-table");
    let scratch = scratch_dir("tc-1306");
    let out = scratch.join("semantic-ir.json");
    let mut args = vec![os("lift"), os("--bundle"), os(&bundle)];
    for root in declared_module_roots(&bundle) {
        args.push(os("--module"));
        args.push(os(root));
    }
    args.push(os("--out"));
    args.push(os(&out));
    let output = unshare(
        Path::new(env!("CARGO_BIN_EXE_extraction-frontend")),
        &args,
        &workspace_dir(),
    );
    assert_eq!(
        output.status.code(),
        Some(0),
        "lift under unshare -rn:\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let written = fs::read(&out).expect("document");
    let golden = fs::read(bundle.join("expected/semantic-ir.json")).expect("golden");
    assert_eq!(
        first_difference(&written, &golden),
        None,
        "the lift under unshare -rn reproduces the golden"
    );

    // The resolved dependency tree of the crate, in offline mode: no
    // socket-opening crate.
    let output = cargo(&[
        "tree",
        "--offline",
        "--locked",
        "-p",
        PACKAGE,
        "-e",
        "normal",
        "--prefix",
        "none",
    ]);
    assert!(
        output.status.success(),
        "cargo tree --offline:\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let tree = String::from_utf8_lossy(&output.stdout);
    let mut names: Vec<String> = tree
        .lines()
        .filter_map(|l| l.split_whitespace().next())
        .map(String::from)
        .collect();
    names.sort();
    names.dedup();
    assert!(
        names.contains(&PACKAGE.to_string()),
        "the tree is the crate's"
    );
    let sockets: Vec<&String> = names
        .iter()
        .filter(|n| SOCKET_CRATES.contains(&n.as_str()))
        .collect();
    eprintln!(
        "TC-1306: {} resolved normal dependencies, {} socket-opening ({:?})",
        names.len(),
        sockets.len(),
        sockets
    );
    assert!(
        sockets.is_empty(),
        "socket-opening dependencies: {sockets:?}"
    );
}

#[trace("TC-1306", "NFR-031-AC-7")]
#[test]
#[ignore = "Static evidence: runs the whole crate suite under unshare -rn, which nests cargo test; run with --ignored"]
fn tc_1306_the_crate_suite_passes_under_unshare_n_with_cargo_offline() {
    assert_unshare_available();
    let cargo_path = PathBuf::from("cargo");
    let args: Vec<OsString> = [
        &format!("+{TOOLCHAIN}"),
        "test",
        "--offline",
        "--locked",
        "-p",
        PACKAGE,
        "--",
        "--skip",
        "tc_1306_the_crate_suite",
    ]
    .iter()
    .map(|s| os(*s))
    .collect();
    let output = unshare(&cargo_path, &args, &workspace_dir());
    let text = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(output.status.success(), "suite under unshare -rn:\n{text}");
    let passed: usize = text
        .lines()
        .filter(|l| l.starts_with("test result: ok."))
        .filter_map(|l| {
            l.split_whitespace()
                .nth(3)
                .and_then(|n| n.parse::<usize>().ok())
        })
        .sum();
    eprintln!("TC-1306 suite under unshare -rn --offline: {passed} test(s) passed");
    assert!(passed > 0, "the suite ran:\n{text}");
}

// ---------------------------------------------------------------------------
// NFR-031-AC-9: forbid(unsafe_code)
// ---------------------------------------------------------------------------

/// The lines of the one ` ```compile_fail ` block of `src/lib.rs`, with
/// the `//!` prefixes stripped.
fn compile_fail_doctest(lib_rs: &str) -> String {
    let mut lines = lib_rs.lines();
    let mut body = Vec::new();
    let mut inside = false;
    let mut blocks = 0;
    for line in lines.by_ref() {
        let stripped = line
            .strip_prefix("//!")
            .map(|l| l.strip_prefix(' ').unwrap_or(l));
        let Some(stripped) = stripped else {
            continue;
        };
        if stripped.trim() == "```compile_fail" {
            inside = true;
            blocks += 1;
            continue;
        }
        if inside && stripped.trim() == "```" {
            inside = false;
            continue;
        }
        if inside {
            body.push(stripped);
        }
    }
    assert_eq!(blocks, 1, "lib.rs carries exactly one compile_fail doctest");
    let mut text = body.join("\n");
    text.push('\n');
    text
}

/// `rustc +1.98.1 --edition 2021 --crate-type lib --emit=metadata` over
/// `source`: the compiler's output.
fn rustc_check(source: &Path, out_dir: &Path) -> Output {
    Command::new("rustc")
        .arg(format!("+{TOOLCHAIN}"))
        .args(["--edition", "2021", "--crate-type", "lib", "--emit=metadata", "--out-dir"])
        .arg(out_dir)
        .arg(source)
        .output()
        .unwrap_or_else(|e| panic!("rustc +{TOOLCHAIN} could not be started ({e}): the gate cannot run, and this is a failure rather than a skip"))
}

#[trace("TC-1308", "NFR-031-AC-9")]
#[test]
fn tc_1308_the_crate_root_forbids_unsafe_code_and_the_compile_fail_doctest_rejects_an_unsafe_block_on_the_toolchain(
) {
    let lib_rs = fs::read_to_string(crate_dir().join("src/lib.rs")).expect("lib.rs");
    assert!(
        lib_rs.lines().any(|l| l == "#![forbid(unsafe_code)]"),
        "src/lib.rs carries #![forbid(unsafe_code)]"
    );
    let main_rs = fs::read_to_string(crate_dir().join("src/main.rs")).expect("main.rs");
    assert!(
        main_rs.lines().any(|l| l == "#![forbid(unsafe_code)]"),
        "src/main.rs carries #![forbid(unsafe_code)]"
    );
    let manifest = fs::read_to_string(crate_dir().join("Cargo.toml")).expect("Cargo.toml");
    assert!(
        manifest.contains("[lints.rust]\nunsafe_code = \"forbid\""),
        "Cargo.toml forbids unsafe_code"
    );
    let unsafe_sites: Vec<String> = sources(&crate_dir().join("src"))
        .into_iter()
        .flat_map(|(file, text)| {
            text.lines()
                .enumerate()
                .filter(|(_, l)| {
                    let code = code_of(l);
                    code.contains("unsafe") && !code.contains("unsafe_code")
                })
                .map(|(i, _)| format!("{file}:{}", i + 1))
                .collect::<Vec<_>>()
        })
        .collect();
    assert!(
        unsafe_sites.is_empty(),
        "first-party unsafe: {unsafe_sites:?}"
    );

    // The doctest's own text, compiled by the qualification compiler
    // outside cargo (so no build lock is nested): it fails, and the same
    // text without the forbid attribute compiles, so the failure is the
    // attribute's.
    let body = compile_fail_doctest(&lib_rs);
    assert!(
        body.contains("#![forbid(unsafe_code)]"),
        "the doctest forbids unsafe_code"
    );
    assert!(
        body.contains("unsafe {"),
        "the doctest injects an unsafe block"
    );
    let scratch = scratch_dir("tc-1308");
    let forbidden = scratch.join("forbidden.rs");
    fs::write(&forbidden, &body).expect("write");
    let output = rustc_check(&forbidden, &scratch);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        !output.status.success(),
        "the injected unsafe block does not build under rustc +{TOOLCHAIN}"
    );
    assert!(
        stderr.contains("usage of an `unsafe` block") && stderr.contains("forbid(unsafe_code)"),
        "the failure is the forbid: {stderr}"
    );
    let allowed = scratch.join("allowed.rs");
    fs::write(&allowed, body.replace("#![forbid(unsafe_code)]\n", "")).expect("write");
    let output = rustc_check(&allowed, &scratch);
    assert!(
        output.status.success(),
        "without the attribute the same text compiles: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let version = Command::new("rustc")
        .arg(format!("+{TOOLCHAIN}"))
        .arg("--version")
        .output()
        .expect("rustc --version");
    let version = String::from_utf8_lossy(&version.stdout);
    assert!(
        version.contains(TOOLCHAIN),
        "compiled by {TOOLCHAIN}: {version}"
    );
    eprintln!(
        "TC-1308: 0 first-party unsafe sites; the compile_fail doctest fails under {} with forbid and builds without it",
        version.trim()
    );
}

// ---------------------------------------------------------------------------
// NFR-031-AC-10: proptest bundle trees under a failing panic hook
// ---------------------------------------------------------------------------

/// Every panic message the hook saw while the fuzz ran.
static PANICS: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[trace("TC-1309", "NFR-031-AC-10")]
#[test]
fn tc_1309_over_256_proptest_bundle_trees_the_frontend_returns_a_result_or_a_diagnostic_and_never_panics(
) {
    const CASES: u32 = 256;
    let roots = module_roots();
    let scratch = scratch_dir("tc-1309");

    // The failing panic hook: every panic is recorded; proptest's own
    // catch of the unwind would then report the case, and the assertion
    // below fails the test on the record even if it did not.
    let previous = std::panic::take_hook();
    let fuzz_thread = std::thread::current().id();
    std::panic::set_hook(Box::new(move |info| {
        if std::thread::current().id() != fuzz_thread {
            // Another test's panic: not this gate's business.
            previous(info);
            return;
        }
        let message = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "non-string panic payload".to_string());
        let location = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_default();
        PANICS
            .lock()
            .expect("panic log")
            .push(format!("{location}: {message}"));
    }));

    let mut runner = TestRunner::new(Config {
        cases: CASES,
        max_shrink_iters: 0,
        failure_persistence: None,
        ..Config::default()
    });
    let cases = Cell::new(0u32);
    let written = Cell::new(0u32);
    let blocked = Cell::new(0u32);
    let refused = Cell::new(0u32);
    let files = Cell::new(0usize);
    // Every blocking code seen, with its count: the measurement the gate
    // reports beside the panic count.
    let codes: RefCell<BTreeMap<String, u32>> = RefCell::new(BTreeMap::new());
    // Every distinct `INVALID_IR` message: a document the frontend
    // assembled and the independent reader refused is not a panic, but
    // it is a finding worth naming.
    let invalid_ir: RefCell<std::collections::BTreeSet<String>> = RefCell::new(Default::default());
    let bump = |cell: &Cell<u32>| cell.set(cell.get() + 1);
    let result = runner.run(&bundle_tree(), |tree| {
        bump(&cases);
        files.set(files.get() + tree.len());
        let root = scratch.join(format!("case-{:03}", cases.get()));
        let _ = fs::remove_dir_all(&root);
        let bundle_root = root.join("bundle");
        fs::create_dir_all(&bundle_root).expect("bundle root");
        fs::create_dir_all(root.join("out")).expect("out dir");
        tree.materialize(&bundle_root);
        let request = LiftRequest {
            bundle_root: bundle_root.clone(),
            module_roots: roots.clone(),
            out: root.join("out/semantic-ir.json"),
            diagnostics: None,
            provenance: None,
        };
        match lift(&request) {
            LiftOutcome::Written { .. } => bump(&written),
            LiftOutcome::Blocked { diagnostics } => {
                bump(&blocked);
                for d in diagnostics.iter().filter(|d| d.blocking) {
                    *codes.borrow_mut().entry(d.code.to_string()).or_insert(0) += 1;
                    if d.code.to_string().ends_with("INVALID_IR") {
                        invalid_ir.borrow_mut().insert(d.message.clone());
                    }
                }
            }
            LiftOutcome::Refused(refusal) => {
                bump(&refused);
                *codes
                    .borrow_mut()
                    .entry(refusal.code().name().to_string())
                    .or_insert(0) += 1;
            }
        }
        let _ = fs::remove_dir_all(&root);
        Ok(())
    });
    // Dropping the taken hook restores the default one.
    drop(std::panic::take_hook());

    let panics = PANICS.lock().expect("panic log").clone();
    let (cases, written, blocked, refused, files) = (
        cases.get(),
        written.get(),
        blocked.get(),
        refused.get(),
        files.get(),
    );
    eprintln!(
        "TC-1309: {cases} bundle tree(s) ({files} files), {written} written, {blocked} blocked, {refused} refused; blocking codes {:?}; {} panic(s)",
        codes.borrow(),
        panics.len()
    );
    for message in invalid_ir.borrow().iter() {
        eprintln!("TC-1309 INVALID_IR: {message}");
    }
    assert!(panics.is_empty(), "panics:\n{}", panics.join("\n"));
    result.unwrap_or_else(|e| panic!("proptest: {e}"));
    assert_eq!(cases, CASES, "every case ran");
    assert_eq!(
        written + blocked + refused,
        CASES,
        "every case returned a result or a diagnostic"
    );
    assert!(
        written > 0 && (blocked > 0 || refused > 0),
        "the strategy reaches both lifted and diagnosed trees"
    );
}
