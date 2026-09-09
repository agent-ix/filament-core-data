//! FR-095 "Node identities" and FR-095-AC-12: the slug, the closed pattern
//! list, `UNSLUGGABLE_NAME`, and the grep gate over `src/`.

use std::fs;
use std::path::{Path, PathBuf};

use agent_ix_extraction_frontend::diagnostics::{Code, Severity, WireCode};
use agent_ix_extraction_frontend::{extract, slug, Bundle, NodeKind, PackageIdentity, Unsluggable};
use ix_trace_rs::trace;

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> PathBuf {
    crate_dir().join("fixtures").join(name)
}

fn business_module() -> PathBuf {
    fixture("modules/spec-objects-business")
}

/// The FR-093 `displayName` of a document: frontmatter `name` when it is an
/// identifier, else the `title` verbatim.
fn display_name(fm: &serde_json::Map<String, serde_json::Value>) -> String {
    let is_identifier = |s: &str| {
        s.chars()
            .next()
            .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
            && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    };
    match fm.get("name").and_then(|v| v.as_str()) {
        Some(name) if is_identifier(name) => name.to_string(),
        _ => fm
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

#[trace("TC-1252", "FR-095-AC-7")]
#[test]
fn tc_1252_slug_lowercases_collapses_runs_and_an_all_punctuation_title_is_unsluggable_name() {
    assert_eq!(slug("Config Version").as_deref(), Ok("config-version"));
    assert_eq!(slug("A__B--C").as_deref(), Ok("a-b-c"));
    assert_eq!(
        slug("  Leading and trailing  ").as_deref(),
        Ok("leading-and-trailing")
    );
    assert_eq!(slug("belongs_to").as_deref(), Ok("belongs-to"));
    assert_eq!(slug("maxLength").as_deref(), Ok("maxlength"));
    assert_eq!(
        slug("--"),
        Err(Unsluggable {
            name: "--".to_string()
        })
    );
    assert!(slug("").is_err());

    // The closed pattern list: `type/` verbatim, every other segment a slug
    // (decision D8), including `param/` and `variant/`.
    let package = PackageIdentity::new("agent-ix", "config-service");
    assert_eq!(package.package(), "agent-ix/config-service");
    assert_eq!(package.source(), "ix://agent-ix/config-service/spec");
    assert_eq!(
        package.type_identity("ConfigVersion"),
        "ix://agent-ix/config-service/type/ConfigVersion",
        "type/ carries displayName verbatim"
    );
    assert_eq!(
        package.alias_identity("ConfigVersion", "versionNumber"),
        "ix://agent-ix/config-service/type/ConfigVersion.versionNumber",
        "the alias of a constrained field: type/<DisplayName>.<fieldName>, both verbatim"
    );
    assert_eq!(
        package
            .field_identity("ConfigVersion", "versionNumber")
            .as_deref(),
        Ok("ix://agent-ix/config-service/field/configversion-versionnumber")
    );
    assert_eq!(
        package
            .constraint_identity("ConfigVersion", "createdBy", "maxLength")
            .as_deref(),
        Ok("ix://agent-ix/config-service/constraint/configversion-createdby-maxlength")
    );
    assert_eq!(
        package
            .relationship_identity("ConfigVersion", "belongs_to", "ConfigOverlay")
            .as_deref(),
        Ok("ix://agent-ix/config-service/relationship/configversion-belongs-to-configoverlay")
    );
    assert_eq!(
        package
            .operation_identity("Repository", "find By Id")
            .as_deref(),
        Ok("ix://agent-ix/config-service/operation/repository-find-by-id")
    );
    assert_eq!(
        package
            .param_identity("Repository", "findById", "id")
            .as_deref(),
        Ok("ix://agent-ix/config-service/param/repository-findbyid-id")
    );
    assert_eq!(
        package
            .variant_identity("Step Kind", "MANUAL_STEP")
            .as_deref(),
        Ok("ix://agent-ix/config-service/variant/step-kind-manual-step")
    );
    assert_eq!(
        package
            .clause_identity("ConfigVersion", "immutable")
            .as_deref(),
        Ok("ix://agent-ix/config-service/clause/configversion-immutable")
    );
    assert_eq!(
        package.field_identity("ConfigVersion", "--"),
        Err(Unsluggable {
            name: "--".to_string()
        }),
        "an unsluggable segment refuses the whole identity"
    );
    let segments: Vec<&str> = NodeKind::ALL.iter().map(|k| k.segment()).collect();
    assert_eq!(
        segments,
        [
            "type",
            "field",
            "constraint",
            "relationship",
            "operation",
            "param",
            "variant",
            "clause"
        ]
    );

    // An artifact titled `---` raises UNSLUGGABLE_NAME at its frontmatter,
    // blocking (EC-145). The bundle is constructed here: through `lift`
    // such a title is refused earlier as UNNAMEABLE_ARTIFACT (it is no
    // Identifier), so `negatives/UNSLUGGABLE_NAME` holds the one
    // lift-reachable case instead, an enumeration value (Task-136).
    let scratch = tempfile::tempdir().expect("tempdir");
    let root = scratch.path().to_path_buf();
    fs::create_dir_all(root.join("spec/functional")).expect("mkdir");
    fs::copy(
        fixture("negatives/UNSLUGGABLE_NAME/spec/spec.md"),
        root.join("spec/spec.md"),
    )
    .expect("copy spec.md");
    fs::write(
        root.join("spec/functional/FR-008-punctuation.md"),
        "---\nid: FR-008\ntitle: \"---\"\nobject: entity\ntype: FR\n---\n\n# FR-008: ---\n\n## Properties\n\n| Field | Type | Multiplicity | Constraints |\n|-------|------|--------------|-------------|\n| id | UUID | 1 | identity |\n",
    )
    .expect("write FR-008");
    let bundle = Bundle::load(&root, &[&business_module()]).expect("the bundle loads");
    let out = extract(&bundle);
    let path = "spec/functional/FR-008-punctuation.md";
    let extracted = &out.artifacts["FR-008"];
    assert_eq!(extracted.path, path);
    let document = bundle
        .documents()
        .iter()
        .find(|d| d.path() == path)
        .expect("FR-008 is loaded");
    let name = display_name(document.frontmatter().expect("frontmatter"));
    assert_eq!(name, "---");
    let unsluggable = slug(&name).expect_err("`---` slugs to the empty string");
    let source = PackageIdentity::from(bundle.package()).source();
    let diagnostic = unsluggable.diagnostic(
        agent_ix_extraction_frontend::diagnostics::Locus::head(&source, path),
    );
    assert_eq!(diagnostic.code, WireCode::Registry(Code::UnsluggableName));
    assert_eq!(
        diagnostic.code.to_string(),
        "agent-ix.extraction-frontend.UNSLUGGABLE_NAME"
    );
    assert!(diagnostic.blocking);
    assert_eq!(diagnostic.severity, Severity::Error);
    assert!(diagnostic.message.contains("---"), "{}", diagnostic.message);
    let locus = diagnostic.locus.as_ref().expect("the declaration's locus");
    assert_eq!(locus.path, path);
    assert_eq!((locus.start_line, locus.start_column), (1, 1));
    assert_eq!(locus.source_identity, "ix://agent-ix/config-service/spec");
}

/// The tokens FR-095-AC-12 forbids under `src/`.
const FORBIDDEN: [&str; 5] = [
    "git2",
    "Command::new(\"git\")",
    "std::env::var",
    "env!(",
    "option_env!(",
];

/// Every `(file, line number, token)` hit under `src_dir`, code lines only:
/// a line whose first non-blank characters open a comment is documentation,
/// not a read.
fn forbidden_hits(src_dir: &Path) -> Vec<(String, usize, &'static str)> {
    let mut files: Vec<PathBuf> = fs::read_dir(src_dir)
        .expect("src/")
        .map(|e| e.expect("entry").path())
        .filter(|p| p.extension().is_some_and(|x| x == "rs"))
        .collect();
    files.sort();
    let mut hits = Vec::new();
    for file in files {
        let text = fs::read_to_string(&file).expect("read");
        let name = file
            .file_name()
            .expect("name")
            .to_string_lossy()
            .into_owned();
        for (i, line) in text.lines().enumerate() {
            if line.trim_start().starts_with("//") {
                continue;
            }
            for token in FORBIDDEN {
                if line.contains(token) {
                    hits.push((name.clone(), i + 1, token));
                }
            }
        }
    }
    hits
}

#[trace("TC-1257", "FR-095-AC-12")]
#[trace("TC-1257", "FR-095-CON-2")]
#[test]
fn tc_1257_src_names_no_git_or_environment_read_and_a_planted_env_fails_the_gate() {
    let src = crate_dir().join("src");
    let hits = forbidden_hits(&src);
    assert!(hits.is_empty(), "forbidden tokens under src/: {hits:?}");
    for file in ["identity.rs", "envelope.rs", "provenance.rs"] {
        assert!(src.join(file).is_file(), "{file} is the gate's subject");
    }
    let provenance = fs::read_to_string(src.join("provenance.rs")).expect("provenance.rs");
    assert!(
        provenance.contains("include_str!(\"../../../Cargo.lock\")"),
        "the lock is embedded, not read at run time"
    );

    // The control: the same gate over a scratch copy with the token planted
    // in envelope.rs.
    let scratch = tempfile::tempdir().expect("tempdir");
    for entry in fs::read_dir(&src).expect("src/") {
        let entry = entry.expect("entry");
        fs::copy(entry.path(), scratch.path().join(entry.file_name())).expect("copy");
    }
    let planted = scratch.path().join("envelope.rs");
    let mut text = fs::read_to_string(&planted).expect("envelope.rs");
    text.push_str("\npub const PLANTED: &str = env!(\"CARGO_PKG_VERSION\");\n");
    fs::write(&planted, text).expect("plant");
    let hits = forbidden_hits(scratch.path());
    assert_eq!(
        hits,
        vec![(
            "envelope.rs".to_string(),
            text_line_count(&planted),
            "env!("
        )],
        "the planted env! must be the one hit, or the gate proves nothing"
    );
}

fn text_line_count(path: &Path) -> usize {
    fs::read_to_string(path).expect("read").lines().count()
}
