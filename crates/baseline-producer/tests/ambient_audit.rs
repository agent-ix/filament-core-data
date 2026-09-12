// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! NFR-036-M-7: the ambient-read audit over the canonicalization and admission
//! call graph, and the instrumented offline run inside an unprivileged network
//! namespace (Plan-017 Task-150).
//!
//! The metric counts ambient inputs read while canonicalizing — a locale, an
//! environment variable, a working directory, a clock, or a network read — with
//! target 0, threshold 0, and **no exemption** (FND-1741). The absence of an
//! exemption list here is structural rather than stated: [`AmbientToken`] has
//! no member an exemption could go in, and [`audit`] takes no exemption
//! argument, so widening this gate would take an edit that is visible as an
//! edit. That is the difference from a sibling audit in this workspace whose
//! rules each carry an `exempt_in` list; NFR-036's Statement excludes ambient
//! reads outright, so there is nothing for such a list to hold.
//!
//! Two halves, and they measure different things.
//!
//! * **The call graph** (`sast`): every source of the crate, named against the
//!   module declarations of `src/lib.rs` so a module added later cannot escape
//!   the audit, scanned for the tokens each of the five categories cannot be
//!   reached without. Falsified by two planted reads on the canonicalization
//!   path itself — a `std::env::var` and a `SystemTime::now` — each of which
//!   must be measured as a hit naming its site.
//! * **The instrumented run** (`runtime-monitoring`): the whole population
//!   canonicalized and digested inside `unshare -rn`, with
//!   `tests/probe/ambient_probe.rs` preloaded over the process. The instrument
//!   *records* calls and asserts nothing, so the number reported is a measured
//!   zero rather than an assertion that was never exercised. Falsified by
//!   running the same child with a planted clock read and a planted environment
//!   read inside the measured region and confirming the instrument records
//!   each.
//!
//! A run that cannot create the namespace, or cannot compile the instrument,
//! fails saying which — never a skip and never a vacuous pass.

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

mod nfr036;
mod static_fixture;

use nfr036::{digested_documents, workspace_dir};

// ---------------------------------------------------------------------------
// The audited population
// ---------------------------------------------------------------------------

/// Every source of the crate, as path and source text.
///
/// The whole crate, not a chosen subset: canonicalization reaches every record
/// module through `Serialize`, and admission reaches every validator, so any
/// narrower population would be an exemption list wearing another name. The
/// sources are embedded at compile time, so the audit itself resolves no working
/// directory.
const AMBIENT_POPULATION: [(&str, &str); 17] = [
    ("src/assessment.rs", include_str!("../src/assessment.rs")),
    ("src/canonical.rs", include_str!("../src/canonical.rs")),
    ("src/component.rs", include_str!("../src/component.rs")),
    (
        "src/configuration.rs",
        include_str!("../src/configuration.rs"),
    ),
    (
        "src/correspondence.rs",
        include_str!("../src/correspondence.rs"),
    ),
    ("src/decimal.rs", include_str!("../src/decimal.rs")),
    ("src/digest.rs", include_str!("../src/digest.rs")),
    ("src/endpoint.rs", include_str!("../src/endpoint.rs")),
    ("src/export.rs", include_str!("../src/export.rs")),
    ("src/inventory.rs", include_str!("../src/inventory.rs")),
    ("src/lib.rs", include_str!("../src/lib.rs")),
    ("src/locus.rs", include_str!("../src/locus.rs")),
    ("src/model.rs", include_str!("../src/model.rs")),
    ("src/refusal.rs", include_str!("../src/refusal.rs")),
    (
        "src/relationship.rs",
        include_str!("../src/relationship.rs"),
    ),
    ("src/revision.rs", include_str!("../src/revision.rs")),
    (
        "src/static_bundle.rs",
        include_str!("../src/static_bundle.rs"),
    ),
];

/// This crate's manifest, for the dependency-surface half of the audit.
const CRATE_MANIFEST: &str = include_str!("../Cargo.toml");

// ---------------------------------------------------------------------------
// The tokens
// ---------------------------------------------------------------------------

/// One audited token and the ambient category it belongs to.
///
/// There is no exemption member. NFR-036's Statement excludes ambient reads
/// outright, so a token is banned in every file of the population and the type
/// gives an exemption nowhere to live.
struct AmbientToken {
    category: &'static str,
    token: &'static str,
}

/// The five ambient categories NFR-036 names, as the tokens none of them can be
/// reached without.
///
/// `Instant::now` and `time::Instant` rather than `Instant`, because
/// `assessment.rs` declares a `UtcInstant` of its own, parsed from a declared
/// RFC 3339 member and never from a clock; a bare `Instant` would report that
/// declaration as a clock read and the gate would then measure spelling instead
/// of behaviour.
const AMBIENT_TOKENS: [AmbientToken; 34] = [
    // Locale.
    AmbientToken {
        category: "locale",
        token: "locale",
    },
    AmbientToken {
        category: "locale",
        token: "LC_ALL",
    },
    AmbientToken {
        category: "locale",
        token: "LANG",
    },
    AmbientToken {
        category: "locale",
        token: "to_locale",
    },
    // Environment.
    AmbientToken {
        category: "environment",
        token: "std::env",
    },
    AmbientToken {
        category: "environment",
        token: "env::var",
    },
    AmbientToken {
        category: "environment",
        token: "env::vars",
    },
    AmbientToken {
        category: "environment",
        token: "env!(",
    },
    AmbientToken {
        category: "environment",
        token: "option_env!(",
    },
    AmbientToken {
        category: "environment",
        token: "getenv",
    },
    // Working directory.
    AmbientToken {
        category: "working directory",
        token: "current_dir",
    },
    AmbientToken {
        category: "working directory",
        token: "current_exe",
    },
    AmbientToken {
        category: "working directory",
        token: "canonicalize(",
    },
    AmbientToken {
        category: "working directory",
        token: "std::fs",
    },
    AmbientToken {
        category: "working directory",
        token: "fs::",
    },
    AmbientToken {
        category: "working directory",
        token: "File::",
    },
    AmbientToken {
        category: "working directory",
        token: "std::path",
    },
    AmbientToken {
        category: "working directory",
        token: "PathBuf",
    },
    AmbientToken {
        category: "working directory",
        token: "include_str!",
    },
    // Clock.
    AmbientToken {
        category: "clock",
        token: "SystemTime",
    },
    AmbientToken {
        category: "clock",
        token: "Instant::now",
    },
    AmbientToken {
        category: "clock",
        token: "time::Instant",
    },
    AmbientToken {
        category: "clock",
        token: "UNIX_EPOCH",
    },
    AmbientToken {
        category: "clock",
        token: "std::time",
    },
    AmbientToken {
        category: "clock",
        token: "clock_gettime",
    },
    AmbientToken {
        category: "clock",
        token: "chrono",
    },
    AmbientToken {
        category: "clock",
        token: "Utc::now",
    },
    AmbientToken {
        category: "clock",
        token: "Local::now",
    },
    // Network.
    AmbientToken {
        category: "network",
        token: "std::net",
    },
    AmbientToken {
        category: "network",
        token: "TcpStream",
    },
    AmbientToken {
        category: "network",
        token: "TcpListener",
    },
    AmbientToken {
        category: "network",
        token: "UdpSocket",
    },
    AmbientToken {
        category: "network",
        token: "socket",
    },
    AmbientToken {
        category: "network",
        token: "getaddrinfo",
    },
];

/// Tokens that are not one of NFR-036's five categories but would make a
/// canonical byte a property of the host all the same.
///
/// Reported beside the metric rather than folded into it, because the metric
/// counts the five categories the Statement names and a metric whose population
/// drifted would not be the metric NFR-036 declares.
const HOST_DERIVED_TOKENS: [AmbientToken; 12] = [
    AmbientToken {
        category: "host-derived",
        token: "HashMap",
    },
    AmbientToken {
        category: "host-derived",
        token: "HashSet",
    },
    AmbientToken {
        category: "host-derived",
        token: "RandomState",
    },
    AmbientToken {
        category: "host-derived",
        token: "DefaultHasher",
    },
    AmbientToken {
        category: "host-derived",
        token: "getrandom",
    },
    AmbientToken {
        category: "host-derived",
        token: "rand::",
    },
    AmbientToken {
        category: "host-derived",
        token: "Command",
    },
    AmbientToken {
        category: "host-derived",
        token: "std::process",
    },
    AmbientToken {
        category: "host-derived",
        token: "usize::BITS",
    },
    AmbientToken {
        category: "host-derived",
        token: "target_pointer_width",
    },
    AmbientToken {
        category: "host-derived",
        token: "target_arch",
    },
    AmbientToken {
        category: "host-derived",
        token: "cfg!(",
    },
];

/// One measured ambient read: the file, the 1-based line, the category, the
/// token, and the line.
#[derive(Debug, PartialEq, Eq)]
struct AmbientRead {
    path: String,
    line: usize,
    category: &'static str,
    token: &'static str,
    text: String,
}

/// The code of one source line: the text before a `//` line comment, so a doc
/// comment naming a forbidden token is not counted as a use of it.
fn code_of(line: &str) -> &str {
    line.split_once("//").map_or(line, |(code, _)| code)
}

/// Counts the ambient reads of one population under `tokens`.
///
/// No exemption argument, by construction.
fn audit(population: &[(&str, &str)], tokens: &[AmbientToken]) -> Vec<AmbientRead> {
    let mut reads = Vec::new();
    for (path, source) in population {
        for (index, line) in source.lines().enumerate() {
            let code = code_of(line);
            for token in tokens {
                if code.contains(token.token) {
                    reads.push(AmbientRead {
                        path: (*path).to_owned(),
                        line: index + 1,
                        category: token.category,
                        token: token.token,
                        text: line.trim().to_owned(),
                    });
                }
            }
        }
    }
    reads
}

fn summary(reads: &[AmbientRead]) -> String {
    reads
        .iter()
        .map(|read| {
            format!(
                "{}:{} [{} / {}] {}",
                read.path, read.line, read.category, read.token, read.text
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// The modules `src/lib.rs` declares, as their source file names.
fn declared_modules(lib_rs: &str) -> BTreeSet<String> {
    lib_rs
        .lines()
        .map(code_of)
        .filter_map(|line| {
            let line = line.trim();
            let rest = line
                .strip_prefix("pub mod ")
                .or_else(|| line.strip_prefix("mod "))?;
            let name = rest.strip_suffix(';')?;
            Some(format!("src/{name}.rs"))
        })
        .collect()
}

// ---------------------------------------------------------------------------
// TC-1456, the call-graph half
// ---------------------------------------------------------------------------

/// Tracing: TC-1456
#[test]
fn tc_1456_the_canonicalization_call_graph_reads_zero_ambient_inputs_with_no_exemption_list() {
    // The population is the whole crate: every module `src/lib.rs` declares has
    // an entry, so a module added after this gate was written cannot escape it.
    let lib_rs = AMBIENT_POPULATION
        .iter()
        .find(|(path, _)| *path == "src/lib.rs")
        .map(|(_, source)| *source)
        .expect("src/lib.rs is in the population");
    let audited: BTreeSet<String> = AMBIENT_POPULATION
        .iter()
        .map(|(path, _)| (*path).to_owned())
        .collect();
    let declared = declared_modules(lib_rs);
    let unaudited: Vec<&String> = declared.difference(&audited).collect();
    assert!(
        unaudited.is_empty(),
        "src/lib.rs declares module(s) the ambient audit does not cover: {unaudited:?}"
    );
    assert_eq!(
        audited.len(),
        declared.len() + 1,
        "the population is every declared module plus the crate root: {audited:?} against {declared:?}"
    );

    let lines: usize = AMBIENT_POPULATION
        .iter()
        .map(|(_, source)| source.lines().count())
        .sum();
    let reads = audit(&AMBIENT_POPULATION, &AMBIENT_TOKENS);
    let categories: BTreeSet<&str> = AMBIENT_TOKENS.iter().map(|token| token.category).collect();
    assert_eq!(
        categories,
        BTreeSet::from([
            "clock",
            "environment",
            "locale",
            "network",
            "working directory"
        ]),
        "the audited categories are exactly the five the Statement names"
    );
    assert!(
        reads.is_empty(),
        "the canonicalization and admission call graph reached {} ambient read(s):\n{}",
        reads.len(),
        summary(&reads)
    );

    // Beside the metric: the host-derived tokens, also at zero and also with no
    // exemption.
    let host_derived = audit(&AMBIENT_POPULATION, &HOST_DERIVED_TOKENS);
    assert!(
        host_derived.is_empty(),
        "the call graph reached {} host-derived site(s):\n{}",
        host_derived.len(),
        summary(&host_derived)
    );

    // The dependency surface. Three dependencies, named here, so a fourth
    // forces this gate to be revisited rather than silently widening the call
    // graph past the audited population. `sha2` pulls `cpufeatures`, which
    // reads a CPU capability register to select a SHA-256 implementation: that
    // is a host *capability* read, not one of the five ambient categories, and
    // both implementations emit the same digest bytes. It is recorded here
    // rather than exempted, because an unrecorded host read is the thing this
    // gate exists to prevent.
    let dependencies: Vec<&str> = CRATE_MANIFEST
        .lines()
        .skip_while(|line| line.trim() != "[dependencies]")
        .skip(1)
        .take_while(|line| !line.trim_start().starts_with('['))
        .filter_map(|line| line.split_once(" =").map(|(name, _)| name.trim()))
        .collect();
    assert_eq!(
        dependencies,
        ["serde", "serde_json", "sha2"],
        "the crate's dependency surface is the three this gate audited"
    );

    // The planted controls, on the canonicalization path itself. Both are
    // planted in a scratch copy in memory: the committed tree is never edited
    // by a gate.
    let canonical = AMBIENT_POPULATION
        .iter()
        .find(|(path, _)| *path == "src/canonical.rs")
        .map(|(_, source)| *source)
        .expect("src/canonical.rs is in the population");
    let anchor = "fn canonical_number(raw: &str, limit: &NumericResourceLimit)";
    assert!(
        canonical.contains(anchor),
        "the planted reads are planted on the canonicalization path"
    );
    for (label, planted, expected_token) in [
        (
            "std::env::var",
            "let planted = std::env::var(\"LANG\").unwrap_or_default();",
            "std::env",
        ),
        (
            "SystemTime::now",
            "let planted = std::time::SystemTime::now();",
            "SystemTime",
        ),
    ] {
        let scratch = canonical.replace(anchor, &format!("{planted}\n{anchor}"));
        let planted_reads = audit(
            &[("src/canonical.rs (scratch copy)", &scratch)],
            &AMBIENT_TOKENS,
        );
        assert!(
            !planted_reads.is_empty(),
            "the planted {label} on the canonicalization path is measured"
        );
        assert!(
            planted_reads
                .iter()
                .all(|read| read.path == "src/canonical.rs (scratch copy)"
                    && read.text.contains("planted")),
            "every hit is the planted line:\n{}",
            summary(&planted_reads)
        );
        assert!(
            planted_reads
                .iter()
                .any(|read| read.token == expected_token),
            "the {expected_token} token caught the planted {label}:\n{}",
            summary(&planted_reads)
        );
        println!(
            "TC-1456 planted control ({label} in src/canonical.rs, scratch copy): {} read(s) measured, named at {}",
            planted_reads.len(),
            summary(&planted_reads).lines().next().unwrap_or_default()
        );
    }

    println!(
        "TC-1456 call-graph audit: {} file(s) and {lines} line(s) of the crate, {} token(s) over {} categories, 0 exemptions, {} ambient read(s) measured (target 0, threshold 0) and {} host-derived site(s) measured",
        AMBIENT_POPULATION.len(),
        AMBIENT_TOKENS.len(),
        categories.len(),
        reads.len(),
        host_derived.len()
    );
}

// ---------------------------------------------------------------------------
// TC-1456, the instrumented run
// ---------------------------------------------------------------------------

/// The symbols the instrument interposes, by the category they belong to.
const INSTRUMENTED_SYMBOLS: [(&str, &str); 12] = [
    ("environment", "getenv"),
    ("environment", "secure_getenv"),
    ("locale", "setlocale"),
    ("locale", "newlocale"),
    ("locale", "uselocale"),
    ("working directory", "getcwd"),
    ("clock", "clock_gettime"),
    ("clock", "time"),
    ("clock", "gettimeofday"),
    ("network", "socket"),
    ("network", "connect"),
    ("network", "getaddrinfo"),
];

/// The marker the child writes around the measured region.
const BEGIN: &str = "MARK-BEGIN";
/// The marker closing the measured region.
const END: &str = "MARK-END";
/// The environment member naming the instrument's log.
const LOG_VARIABLE: &str = "AMBIENT_PROBE_LOG";
/// The environment member naming a planted read for the child to make inside
/// the measured region.
const PLANT_VARIABLE: &str = "AMBIENT_PROBE_PLANT";

/// A scratch directory for this gate, under the repository's cargo target
/// directory and never inside the tree.
fn scratch_dir(label: &str) -> PathBuf {
    let target = std::env::var("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| workspace_dir().join("target"));
    let directory = target.join("nfr-036-ambient").join(label);
    let _ = fs::remove_dir_all(&directory);
    fs::create_dir_all(&directory).unwrap_or_else(|error| {
        panic!(
            "the scratch directory {} could not be created ({error}): the instrumented run cannot run, and this is a failure rather than a skip",
            directory.display()
        )
    });
    directory
}

/// Fails naming the reason when `unshare -rn` cannot create a namespace here.
fn assert_namespace_available() {
    let probe = Command::new("unshare")
        .args(["-rn", "true"])
        .output()
        .unwrap_or_else(|error| panic!("`unshare` could not be started ({error}): the unprivileged network namespace NFR-036-M-7 requires cannot be created, and this is a failure rather than a skip"));
    assert!(
        probe.status.success(),
        "`unshare -rn true` failed on this host ({}): the unprivileged network namespace NFR-036-M-7 requires cannot be created, so the instrumented run did not run, and this is a failure rather than a skip",
        String::from_utf8_lossy(&probe.stderr).trim()
    );
}

/// Compiles `tests/probe/ambient_probe.rs` into `directory`, or fails naming
/// what could not be compiled.
fn compile_instrument(directory: &Path) -> PathBuf {
    let source = nfr036::crate_dir().join("tests/probe/ambient_probe.rs");
    let library = directory.join("libambient_probe.so");
    let output = Command::new("rustc")
        .args(["--edition", "2021", "--crate-type", "cdylib", "-C", "opt-level=1", "-o"])
        .arg(&library)
        .arg(&source)
        .output()
        .unwrap_or_else(|error| panic!("`rustc` could not be started ({error}): the ambient-read instrument cannot be compiled, so the instrumented run did not run, and this is a failure rather than a skip"));
    assert!(
        output.status.success(),
        "the ambient-read instrument {} did not compile, so the instrumented run did not run:\n{}",
        source.display(),
        String::from_utf8_lossy(&output.stderr)
    );
    library
}

/// One instrumented child run: the log's lines inside the measured region, and
/// the child's output.
fn instrumented_run(label: &str, plant: Option<&str>) -> (Vec<String>, Output) {
    let directory = scratch_dir(label);
    let library = compile_instrument(&directory);
    let log = directory.join("ambient.log");
    let binary = std::env::current_exe().expect("this test binary's path");
    let mut command = Command::new("unshare");
    command
        .arg("-rn")
        .arg(&binary)
        .args([
            "--ignored",
            "--exact",
            "tc_1456_child_canonicalizes_the_population_under_the_instrument",
            "--test-threads=1",
            "--nocapture",
        ])
        .current_dir(workspace_dir())
        .env("LD_PRELOAD", &library)
        .env(LOG_VARIABLE, &log);
    if let Some(plant) = plant {
        command.env(PLANT_VARIABLE, plant);
    } else {
        command.env_remove(PLANT_VARIABLE);
    }
    let output = command.output().unwrap_or_else(|error| {
        panic!(
            "the instrumented child {} could not be started under `unshare -rn` ({error}): the instrumented run did not run, and this is a failure rather than a skip",
            binary.display()
        )
    });
    assert!(
        output.status.success(),
        "the instrumented child failed under `unshare -rn`:\n{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let text = fs::read_to_string(&log).unwrap_or_else(|error| {
        panic!(
            "the instrument wrote no log at {} ({error}): the run was not instrumented, and this is a failure rather than a skip",
            log.display()
        )
    });
    let lines: Vec<&str> = text.lines().collect();
    let begin = lines
        .iter()
        .position(|line| line.contains(BEGIN))
        .unwrap_or_else(|| {
            panic!(
                "the child marked the start of the measured region in {}",
                log.display()
            )
        });
    let end = lines
        .iter()
        .position(|line| line.contains(END))
        .unwrap_or_else(|| {
            panic!(
                "the child marked the end of the measured region in {}",
                log.display()
            )
        });
    assert_eq!(
        lines.iter().filter(|line| line.contains(BEGIN)).count(),
        1,
        "exactly one measured region in {}",
        log.display()
    );
    assert_eq!(
        lines.iter().filter(|line| line.contains(END)).count(),
        1,
        "exactly one measured region in {}",
        log.display()
    );
    assert!(begin < end, "the region's markers are in order");
    let region = lines[begin + 1..end]
        .iter()
        .map(|line| (*line).to_owned())
        .collect();
    (region, output)
}

/// Tracing: TC-1456
#[test]
#[ignore = "Runtime evidence: compiles tests/probe/ambient_probe.rs, re-invokes this test binary under `unshare -rn` with the instrument preloaded, and plants two ambient reads to prove the instrument records them; run `make baseline-producer-ambient-evidence`"]
fn tc_1456_the_instrumented_offline_run_in_a_network_namespace_records_zero_ambient_reads() {
    assert_namespace_available();

    // The measured run: no plant.
    let (region, output) = instrumented_run("measured", None);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let documents: usize = stdout
        .lines()
        // `--nocapture` puts the harness's own `test <name> ...` prefix on the
        // same line, so the count is found inside the line and not at its start.
        .find_map(|line| line.split_once("TC-1456 child canonicalized "))
        .and_then(|(_, rest)| rest.split_whitespace().next())
        .and_then(|count| count.parse().ok())
        .unwrap_or_else(|| panic!("the child reported the population it canonicalized:\n{stdout}"));
    assert!(documents > 0, "the child canonicalized the population");
    assert!(
        region.is_empty(),
        "{} ambient read(s) were recorded while canonicalizing {documents} document(s) inside the namespace:\n{}",
        region.len(),
        region.join("\n")
    );
    println!(
        "TC-1456 instrumented run under `unshare -rn`: {documents} digested document(s) canonicalized and digested, {} interposed symbol(s) over {} categories, {} ambient read(s) recorded (target 0, threshold 0)",
        INSTRUMENTED_SYMBOLS.len(),
        INSTRUMENTED_SYMBOLS
            .iter()
            .map(|(category, _)| *category)
            .collect::<BTreeSet<_>>()
            .len(),
        region.len()
    );

    // The planted controls: the instrument records, so each plant must appear.
    for (plant, symbol) in [("clock", "clock_gettime"), ("env", "getenv")] {
        let (planted, _) = instrumented_run(&format!("planted-{plant}"), Some(plant));
        let recorded: Vec<&String> = planted
            .iter()
            .filter(|line| line.ends_with(symbol))
            .collect();
        assert!(
            !recorded.is_empty(),
            "the planted {plant} read was not recorded by the instrument; the region held:\n{}",
            planted.join("\n")
        );
        println!(
            "TC-1456 planted control ({plant} read inside the measured region): {} {symbol} call(s) recorded, {} line(s) in the region",
            recorded.len(),
            planted.len()
        );
    }
}

/// Tracing: TC-1456
#[test]
#[ignore = "child process of tc_1456_the_instrumented_offline_run_in_a_network_namespace_records_zero_ambient_reads; run by the parent with --ignored --exact under the preloaded instrument"]
fn tc_1456_child_canonicalizes_the_population_under_the_instrument() {
    // Read outside the measured region: reading the harness's own configuration
    // is not a producer read, and the markers are what separates the two.
    let instrumented = std::env::var(LOG_VARIABLE).ok();
    let plant = std::env::var(PLANT_VARIABLE).ok();

    // Warm the paths the harness itself needs — the first allocation, the first
    // file write, the first canonicalization — before the region opens, so a
    // lazy initialisation of the runtime is not counted against the producer.
    let warm = digested_documents().len();

    let Some(path) = instrumented else {
        println!(
            "TC-1456 child canonicalized {warm} document(s) outside the instrument: no {LOG_VARIABLE} in the environment, so nothing was recorded. The gate is the parent, tc_1456_the_instrumented_offline_run_in_a_network_namespace_records_zero_ambient_reads."
        );
        return;
    };
    let mark = |marker: &str| {
        use std::io::Write as _;
        let mut log = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .unwrap_or_else(|error| panic!("the child could not open {path} ({error})"));
        writeln!(log, "{} {marker}", std::process::id())
            .unwrap_or_else(|error| panic!("the child could not mark {path} ({error})"));
        log.flush()
            .unwrap_or_else(|error| panic!("the child could not flush {path} ({error})"));
    };

    // The region. Reading the committed fixture and its goldens happens inside
    // it: those are declared inputs at absolute paths, not ambient ones, and the
    // instrument intercepts no file read — it intercepts the five categories the
    // Statement excludes. A working-directory resolution behind one of those
    // reads would be recorded as `getcwd`, which is the point of measuring here
    // rather than reasoning about it.
    mark(BEGIN);
    let documents = digested_documents();
    match plant.as_deref() {
        // The planted clock read, inside the measured region: the instrument
        // must record it, or a zero above would be an unexercised assertion.
        Some("clock") => {
            let _ = std::time::SystemTime::now();
        }
        // The planted environment read.
        Some("env") => {
            let _ = std::env::var("HOME");
        }
        // The planted working-directory resolution.
        Some("cwd") => {
            let _ = std::env::current_dir();
        }
        Some(other) => panic!("{PLANT_VARIABLE}={other} names no planted read"),
        None => {}
    }
    mark(END);

    println!(
        "TC-1456 child canonicalized {} document(s) inside the measured region (plant: {})",
        documents.len(),
        plant.as_deref().unwrap_or("none")
    );
}
