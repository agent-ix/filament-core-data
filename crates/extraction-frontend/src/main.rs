//! The `extraction-frontend` binary (FR-099): `lift` and `inspect`.
//!
//! Exit codes: `0` when no diagnostic blocks, `1` when a lowering
//! diagnostic blocks, `2` when the lift is refused before lowering or an
//! option is missing or malformed. Every diagnostic goes to standard
//! error, one per line, in FR-096 order. The binary reads no environment
//! variable: `std::env::args` (through `clap`) is its only `std::env` use
//! (FR-099-CON-3, the NFR-031-AC-5 exemption), and every file it touches
//! lies under a path named on the command line.
//!
//! `lift --write-goldens --fixtures <dir>` is the one sanctioned writer of
//! `fixtures/*/expected/` (FR-098 "Goldens"). Each fixture bundle is
//! lifted under the inventory roots its `modules.json` names when it
//! carries one, else under its own `modules/*` roots when it carries some,
//! otherwise under `<fixtures>/modules/spec-objects-business` and
//! `<fixtures>/modules/edge-vocabulary`. With `--staging <dir>` each lift
//! lands in `<staging>/<fixture>/` and is then installed as
//! `<fixture>/expected/` (a bundle root refuses a direct write, FR-097);
//! with `--into <dir>` it lands in `<into>/<fixture>/expected/` and the
//! tree is left alone, which is what `make extraction-frontend-check`
//! diffs against the committed goldens.
#![forbid(unsafe_code)]

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic};
use agent_ix_extraction_frontend::write::{
    fixture_bundles, fixture_module_roots, fresh_dir, install_golden, read_json, write_lift,
    Emission, EXPECTED_DIR, GOLDEN_DIAGNOSTICS, GOLDEN_DOCUMENT, GOLDEN_PROVENANCE,
};
use agent_ix_extraction_frontend::{lift, validate_document, LiftOutcome, LiftRequest};
use clap::{ArgGroup, Args, Parser, Subcommand};
use serde_json::Value;

/// The default module roots of a golden lift, relative to `--fixtures`.
const DEFAULT_MODULES: [&str; 2] = ["modules/spec-objects-business", "modules/edge-vocabulary"];

/// Exit `0`: no diagnostic blocks.
const EXIT_OK: u8 = 0;
/// Exit `1`: a lowering diagnostic blocks; the diagnostics sidecar alone
/// is written.
const EXIT_BLOCKED: u8 = 1;
/// Exit `2`: refused before lowering, or a missing or malformed option;
/// nothing is written.
const EXIT_REFUSED: u8 = 2;

#[derive(Parser)]
#[command(
    name = "extraction-frontend",
    about = "Lifts a quire spec bundle into the Filament semantic IR",
    disable_help_subcommand = true
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Lift one bundle under the named module roots to one document and
    /// three sidecars, or regenerate every fixture golden.
    Lift(LiftArgs),
    /// Decide a written document through the independent reader and list
    /// its types.
    Inspect(InspectArgs),
}

#[derive(Args)]
#[command(group = ArgGroup::new("destination").args(["staging", "into"]))]
struct LiftArgs {
    /// The bundle root: the directory holding `spec/spec.md`.
    #[arg(
        long,
        value_name = "DIR",
        required_unless_present = "write_goldens",
        conflicts_with = "write_goldens"
    )]
    bundle: Option<PathBuf>,
    /// A module root: a directory holding `manifest.yaml`. Repeat for each
    /// module; no ambient module location is consulted.
    #[arg(
        long = "module",
        value_name = "DIR",
        required_unless_present = "write_goldens",
        conflicts_with = "write_goldens"
    )]
    modules: Vec<PathBuf>,
    /// The document path; `<out>.fingerprint`, `<out>.diagnostics.json`
    /// and `<out>.provenance.json` are written beside it.
    #[arg(
        long,
        value_name = "FILE",
        required_unless_present = "write_goldens",
        conflicts_with = "write_goldens"
    )]
    out: Option<PathBuf>,
    /// Write the diagnostics sidecar here instead of `<out>.diagnostics.json`.
    #[arg(long, value_name = "FILE", conflicts_with = "write_goldens")]
    diagnostics: Option<PathBuf>,
    /// Write the provenance sidecar here instead of `<out>.provenance.json`.
    #[arg(long, value_name = "FILE", conflicts_with = "write_goldens")]
    provenance: Option<PathBuf>,
    /// Regenerate the FR-098 goldens of every fixture bundle under
    /// `--fixtures`, into `--staging` (installed as each fixture's
    /// `expected/`) or `--into` (left there).
    #[arg(long, requires = "fixtures", requires = "destination")]
    write_goldens: bool,
    /// The fixture inventory root (`crates/extraction-frontend/fixtures`).
    #[arg(long, value_name = "DIR", requires = "write_goldens")]
    fixtures: Option<PathBuf>,
    /// A scratch directory each golden lift lands in before it is
    /// installed as `<fixture>/expected/`.
    #[arg(long, value_name = "DIR", requires = "write_goldens")]
    staging: Option<PathBuf>,
    /// Write every golden under `<into>/<fixture>/expected/` and leave the
    /// fixture tree untouched.
    #[arg(long, value_name = "DIR", requires = "write_goldens")]
    into: Option<PathBuf>,
}

#[derive(Args)]
struct InspectArgs {
    /// A document `lift` wrote.
    #[arg(long, value_name = "FILE")]
    ir: PathBuf,
}

fn main() -> ExitCode {
    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        // Usage errors exit `2` naming the option; `--help` exits `0`.
        Err(error) => error.exit(),
    };
    let code = match cli.command {
        Command::Lift(args) if args.write_goldens => write_goldens(&args),
        Command::Lift(args) => lift_one(&args),
        Command::Inspect(args) => inspect(&args),
    };
    ExitCode::from(code)
}

/// Print every diagnostic of `outcome` to standard error, one per line,
/// in FR-096 order, and return the exit code it fixes.
fn report(outcome: &LiftOutcome) -> u8 {
    for diagnostic in outcome.diagnostics() {
        eprintln!("{diagnostic}");
    }
    match outcome {
        LiftOutcome::Refused(_) => EXIT_REFUSED,
        LiftOutcome::Blocked { .. } => EXIT_BLOCKED,
        LiftOutcome::Written { .. } => EXIT_OK,
    }
}

/// `lift --bundle --module... --out`.
fn lift_one(args: &LiftArgs) -> u8 {
    let (Some(bundle_root), Some(out)) = (&args.bundle, &args.out) else {
        // `clap` requires both unless `--write-goldens`; unreachable.
        eprintln!("--bundle and --out are required");
        return EXIT_REFUSED;
    };
    let request = LiftRequest {
        bundle_root: bundle_root.clone(),
        module_roots: args.modules.clone(),
        out: out.clone(),
        diagnostics: args.diagnostics.clone(),
        provenance: args.provenance.clone(),
    };
    report(&lift(&request))
}

/// Where one fixture's golden lift lands and whether it is installed.
enum Destination<'a> {
    /// `<staging>/<fixture>/`, then installed as `<fixture>/expected/`.
    Staging(&'a Path),
    /// `<into>/<fixture>/expected/`, left there.
    Into(&'a Path),
}

/// `lift --write-goldens --fixtures <dir> (--staging <dir> | --into <dir>)`.
fn write_goldens(args: &LiftArgs) -> u8 {
    let Some(fixtures) = &args.fixtures else {
        eprintln!("--write-goldens requires --fixtures <DIR>");
        return EXIT_REFUSED;
    };
    let destination = match (&args.staging, &args.into) {
        (Some(staging), None) => Destination::Staging(staging),
        (None, Some(into)) => Destination::Into(into),
        _ => {
            eprintln!("--write-goldens requires exactly one of --staging <DIR> and --into <DIR>");
            return EXIT_REFUSED;
        }
    };
    let defaults: Vec<PathBuf> = DEFAULT_MODULES
        .iter()
        .map(|rel| fixtures.join(rel))
        .collect();
    let bundles = match fixture_bundles(fixtures) {
        Ok(bundles) => bundles,
        Err(error) => {
            eprintln!(
                "--fixtures {} cannot be walked: {error}",
                fixtures.display()
            );
            return EXIT_REFUSED;
        }
    };
    for bundle in &bundles {
        let name = bundle.strip_prefix(fixtures).unwrap_or(bundle);
        if let Err(message) = write_golden(bundle, name, fixtures, &defaults, &destination) {
            eprintln!("{}: {message}", name.display());
            return EXIT_REFUSED;
        }
    }
    EXIT_OK
}

/// Lift one fixture into its destination and install it when staged.
fn write_golden(
    bundle: &Path,
    name: &Path,
    fixtures: &Path,
    defaults: &[PathBuf],
    destination: &Destination<'_>,
) -> Result<(), String> {
    let module_roots = fixture_module_roots(bundle, fixtures, defaults)
        .map_err(|error| format!("its modules cannot be listed: {error}"))?;
    let (work, install) = match destination {
        Destination::Staging(staging) => (staging.join(name), Some(bundle.join(EXPECTED_DIR))),
        Destination::Into(into) => (into.join(name).join(EXPECTED_DIR), None),
    };
    fresh_dir(&work).map_err(|error| format!("{} cannot be prepared: {error}", work.display()))?;
    let request = LiftRequest {
        bundle_root: bundle.to_path_buf(),
        module_roots,
        out: work.join(GOLDEN_DOCUMENT),
        diagnostics: Some(work.join(GOLDEN_DIAGNOSTICS)),
        provenance: Some(work.join(GOLDEN_PROVENANCE)),
    };
    let outcome = lift(&request);
    let verdict = match &outcome {
        LiftOutcome::Refused(_) => "refused",
        LiftOutcome::Blocked { .. } => "blocked",
        LiftOutcome::Written { .. } => "written",
    };
    eprintln!("{}: {verdict}", name.display());
    for diagnostic in outcome.diagnostics() {
        eprintln!("  {diagnostic}");
    }
    if let LiftOutcome::Refused(refusal) = &outcome {
        // A refusal writes nothing; its one diagnostic is the golden of a
        // `negatives/<CODE>` fixture. An unwritable output is the golden
        // writer's own failure, never a golden.
        if refusal.diagnostic.registry_code() == Some(Code::OutputUnwritable) {
            return Err(refusal.diagnostic.message.clone());
        }
        let diagnostics = [(*refusal.diagnostic).clone()];
        write_lift(&request.paths(), Emission::Blocked, &diagnostics)
            .map_err(|refusal| refusal.diagnostic.message.clone())?;
    }
    if let Some(expected) = install {
        install_golden(&work, &expected).map_err(|error| {
            format!(
                "{} cannot be installed as {}: {error}",
                work.display(),
                expected.display()
            )
        })?;
    }
    Ok(())
}

/// `inspect --ir <file>`: decide the document through
/// `agent_ix_semantic_ir::decide`; print `identity kind displayName` per
/// type in `types` order, or one `INVALID_IR` line per reader diagnostic.
fn inspect(args: &InspectArgs) -> u8 {
    let document = match read_json(&args.ir) {
        Ok(document) => document,
        Err(message) => {
            eprintln!("--ir {message}");
            return EXIT_REFUSED;
        }
    };
    let diagnostics: Vec<Diagnostic> = validate_document(&document);
    if !diagnostics.is_empty() {
        for diagnostic in &diagnostics {
            eprintln!("{diagnostic}");
        }
        return EXIT_BLOCKED;
    }
    let types = document
        .get("types")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    for definition in &types {
        let field = |key: &str| {
            definition
                .get(key)
                .and_then(Value::as_str)
                .unwrap_or_default()
        };
        println!(
            "{} {} {}",
            field("identity"),
            field("kind"),
            field("displayName")
        );
    }
    EXIT_OK
}
