//! Loading one spec bundle through the Quire extraction contract (FR-091
//! "Loading" and "The bundle index").
//!
//! This is the only module that names `load_repo` and `load_module_set`
//! (FR-091-CON-2), and it reads the file system through nothing else: no
//! direct file-system call, no `~/.ix`, no `HOME`, no `QUIRE_MODULES`. Modules come from
//! the roots the caller supplies and from nowhere else.

use std::collections::BTreeMap;
use std::fmt;
use std::path::{Path, PathBuf};

use quire_rs::corpus::walk::load_repo;
use quire_rs::semantic::{BundleIndex, SemanticModule};
use quire_rs::CompiledArchetype;
use quire_rs::{LoadedDocument, Registry};

use crate::diagnostics::{Code, Diagnostic, Locus};

/// The bundle-root-relative path of the package identity document.
const SPEC_MD: &str = "spec/spec.md";

/// Why a bundle could not be read: one blocking diagnostic naming the
/// module or document that caused it. Boxed so the `Err` arm of `load` stays
/// small (clippy `result_large_err`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Refusal {
    pub diagnostic: Box<Diagnostic>,
}

impl Refusal {
    fn new(diagnostic: Diagnostic) -> Self {
        Self {
            diagnostic: Box::new(diagnostic),
        }
    }

    /// The registry code of the refusal. A refusal is always the frontend's
    /// own finding, so this is never `None` in practice; the fallback is the
    /// engine wrapper code.
    pub fn code(&self) -> Code {
        self.diagnostic
            .registry_code()
            .unwrap_or(Code::EngineDiagnostic)
    }
}

impl fmt::Display for Refusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.diagnostic.fmt(f)
    }
}

impl std::error::Error for Refusal {}

/// `<org>/<name>` of the bundle, read from `spec/spec.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Package {
    pub org: String,
    pub name: String,
}

impl Package {
    /// `<org>/<name>`: the `packageIdentity` and the `BundleIndex` package.
    pub fn identity(&self) -> String {
        format!("{}/{}", self.org, self.name)
    }

    /// `ix://<org>/<name>/spec`: the `sourceIdentity` of every locus.
    pub fn source_identity(&self) -> String {
        format!("ix://{}/{}/spec", self.org, self.name)
    }
}

/// One loaded document with its bundle-root-relative, `/`-separated path.
#[derive(Debug, Clone)]
pub struct Document {
    path: String,
    loaded: LoadedDocument,
}

impl Document {
    /// Bundle-root-relative path with `/` separators.
    pub fn path(&self) -> &str {
        &self.path
    }

    /// Frontmatter `id`, empty when absent.
    pub fn id(&self) -> &str {
        &self.loaded.id
    }

    /// Frontmatter `object`, when the document is a domain declaration.
    pub fn object(&self) -> Option<&str> {
        self.frontmatter()?.get("object")?.as_str()
    }

    pub fn frontmatter(&self) -> Option<&serde_json::Map<String, serde_json::Value>> {
        self.loaded.frontmatter()
    }

    /// The verbatim document text.
    pub fn raw(&self) -> &str {
        self.loaded.raw()
    }

    /// The engine's own view of the document (`harvest_edges` input).
    pub fn loaded(&self) -> &LoadedDocument {
        &self.loaded
    }
}

/// One object type a loaded module declares, with the `semantic` block of
/// its module: everything an extraction needs besides the document.
#[derive(Clone)]
pub struct ObjectType {
    /// The declaring module's name.
    pub module: String,
    /// The declaring module's `semantic` block.
    pub semantic: SemanticModule,
    /// The compiled declaration: `body_extraction`, `allowed_links`, `roles`,
    /// and the reference-form `data_schema` digest.
    pub archetype: CompiledArchetype,
}

impl fmt::Debug for ObjectType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ObjectType")
            .field("module", &self.module)
            .field("name", &self.archetype.name)
            .field("digest", &self.archetype.semantic_schema_digest)
            .finish()
    }
}

/// One loaded bundle: the corpus `load_repo` returned, the `semantic` block
/// of every module, the object types those modules declare, and the
/// `BundleIndex` built from the corpus.
#[derive(Debug, Clone)]
pub struct Bundle {
    root: PathBuf,
    package: Package,
    documents: Vec<Document>,
    registry: Registry,
    modules: BTreeMap<String, SemanticModule>,
    object_types: BTreeMap<String, ObjectType>,
    index: BundleIndex,
}

impl Bundle {
    /// Load the bundle at `root` under the modules at `module_roots`.
    ///
    /// Refuses, in this order, with `BUNDLE_UNIDENTIFIED` (no `spec/spec.md`,
    /// no `org`/`name`, or one outside `[a-z0-9][a-z0-9-]*`), `MODULE_REFUSED`
    /// (the engine refused the module; the engine `semantic.*` code opens
    /// the message), `MODULE_WITHOUT_SEMANTIC_BLOCK`, `DUPLICATE_ARTIFACT_ID`
    /// (at the second document in path order) and `BUNDLE_UNIDENTIFIED` again
    /// for an object-typed document without an `id`.
    pub fn load(root: &Path, module_roots: &[&Path]) -> Result<Self, Refusal> {
        let repo = load_repo(root);
        let documents: Vec<Document> = repo
            .documents
            .into_iter()
            .map(|loaded| Document {
                path: relative_path(root, &loaded.path),
                loaded,
            })
            .collect();
        let package = identify(&documents)?;
        let source_identity = package.source_identity();

        let registry = Registry::load_module_set(module_roots).map_err(|error| {
            Refusal::new(Diagnostic::frontend(
                Code::ModuleRefused,
                format!("the engine could not load the supplied modules: {error}"),
                None,
            ))
        })?;
        let modules = accepted_modules(&registry, &source_identity)?;
        check_documents(&documents, &source_identity)?;

        let index = BundleIndex::from_documents(
            &package.identity(),
            documents.iter().filter_map(Document::frontmatter),
            modules.values(),
        );
        let object_types = registry
            .active_archetypes()
            .filter_map(|archetype| {
                let semantic = modules.get(&archetype.module)?;
                Some((
                    archetype.name.clone(),
                    ObjectType {
                        module: archetype.module.clone(),
                        semantic: semantic.clone(),
                        archetype: archetype.clone(),
                    },
                ))
            })
            .collect();

        Ok(Self {
            root: root.to_path_buf(),
            package,
            documents,
            registry,
            modules,
            object_types,
            index,
        })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn package(&self) -> &Package {
        &self.package
    }

    /// Every document `load_repo` returned, in path order.
    pub fn documents(&self) -> &[Document] {
        &self.documents
    }

    /// The `semantic` block of `module`, as the engine read it at load.
    pub fn semantic_module(&self, module: &str) -> Option<&SemanticModule> {
        self.modules.get(module)
    }

    /// Every loaded `semantic` block, keyed by module name.
    pub fn semantic_modules(&self) -> &BTreeMap<String, SemanticModule> {
        &self.modules
    }

    /// The manifest `version` of `module`.
    pub fn module_version(&self, module: &str) -> Option<&str> {
        self.registry.module_version(module)
    }

    /// The object type named `name`, when one loaded module declares it.
    pub fn object_type(&self, name: &str) -> Option<&ObjectType> {
        self.object_types.get(name)
    }

    /// Every declared object type, keyed by name.
    pub fn object_types(&self) -> &BTreeMap<String, ObjectType> {
        &self.object_types
    }

    /// The engine's registry over the supplied module roots (edge types,
    /// roles, the vocabulary FR-094 consults).
    pub fn registry(&self) -> &Registry {
        &self.registry
    }

    /// The `BundleIndex` every extraction receives.
    pub fn index(&self) -> &BundleIndex {
        &self.index
    }
}

/// `path` relative to `root`, `/`-separated, as the bundle names it.
fn relative_path(root: &Path, path: &Path) -> String {
    let relative = path.strip_prefix(root).unwrap_or(path);
    relative
        .components()
        .map(|c| c.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

/// `[a-z0-9][a-z0-9-]*`: one segment of the `packageIdentity` grammar.
fn is_identity_segment(value: &str) -> bool {
    let mut chars = value.chars();
    let first = chars
        .next()
        .is_some_and(|c| c.is_ascii_lowercase() || c.is_ascii_digit());
    first && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// Read `org` and `name` from `spec/spec.md` (FR-091 "Loading").
fn identify(documents: &[Document]) -> Result<Package, Refusal> {
    let unidentified = |message: String| {
        Refusal::new(Diagnostic::frontend(
            Code::BundleUnidentified,
            message,
            Some(Locus::head("ix://local/bundle/spec", SPEC_MD)),
        ))
    };
    let Some(spec) = documents.iter().find(|d| d.path == SPEC_MD) else {
        return Err(unidentified(format!(
            "{SPEC_MD} is absent or carries no frontmatter, so the bundle has no package identity"
        )));
    };
    let segment = |key: &str| -> Result<String, Refusal> {
        let value = spec
            .frontmatter()
            .and_then(|fm| fm.get(key))
            .and_then(|v| v.as_str())
            .ok_or_else(|| unidentified(format!("{SPEC_MD} carries no `{key}`")))?;
        if !is_identity_segment(value) {
            return Err(unidentified(format!(
                "{SPEC_MD} `{key}` `{value}` does not match [a-z0-9][a-z0-9-]*"
            )));
        }
        Ok(value.to_string())
    };
    let org = segment("org")?;
    let name = segment("name")?;
    let package = Package { org, name };
    Ok(package)
}

/// `<module directory>/manifest.yaml`: the locus path of a module diagnostic.
fn manifest_path(manifest: &Path) -> String {
    let dir = manifest
        .parent()
        .and_then(Path::file_name)
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    format!("{dir}/manifest.yaml")
}

/// Every supplied module's `semantic` block, refusing the first module the
/// engine refused (`MODULE_REFUSED`) or that carries no block
/// (`MODULE_WITHOUT_SEMANTIC_BLOCK`).
fn accepted_modules(
    registry: &Registry,
    source_identity: &str,
) -> Result<BTreeMap<String, SemanticModule>, Refusal> {
    if let Some(failure) = registry.failures().first() {
        let locus = Locus::head(source_identity, &manifest_path(&failure.path));
        // The engine's reason is `<code>: <message>` for a semantic refusal.
        let (code, message) = match failure.reason.split_once(": ") {
            Some((code, message)) if code.starts_with("semantic.") => {
                (Some(code.to_string()), message.to_string())
            }
            _ => (None, failure.reason.clone()),
        };
        // The engine's `semantic.*` code opens the message and `causes` stays
        // empty, for the reason FR-096 "Engine diagnostics" gives: the
        // `diagnostic` schema admits no `semantic.*` code in `causes`.
        let diagnostic = Diagnostic::frontend(
            Code::ModuleRefused,
            match &code {
                Some(code) => format!("{code}: {message} (module {})", failure.module),
                None => format!("module {} refused: {message}", failure.module),
            },
            Some(locus),
        );
        return Err(Refusal::new(diagnostic));
    }
    let mut modules = BTreeMap::new();
    for name in registry.module_names() {
        let Some(semantic) = registry.semantic_module(name) else {
            return Err(Refusal::new(Diagnostic::frontend(
                Code::ModuleWithoutSemanticBlock,
                format!(
                    "module {name} carries no `semantic` block; nothing can be extracted under it"
                ),
                Some(Locus::head(
                    source_identity,
                    &format!("{name}/manifest.yaml"),
                )),
            )));
        };
        modules.insert(name.to_string(), semantic.clone());
    }
    Ok(modules)
}

/// Duplicate `id`s (`DUPLICATE_ARTIFACT_ID` at the second path) and
/// object-typed documents without an `id` (`BUNDLE_UNIDENTIFIED`).
fn check_documents(documents: &[Document], source_identity: &str) -> Result<(), Refusal> {
    let mut seen: BTreeMap<&str, &str> = BTreeMap::new();
    for document in documents {
        let id = document.id();
        if id.is_empty() {
            if let Some(object) = document.object() {
                return Err(Refusal::new(Diagnostic::frontend(
                    Code::BundleUnidentified,
                    format!(
                        "{} declares `object: {object}` without an `id`",
                        document.path()
                    ),
                    Some(Locus::head(source_identity, document.path())),
                )));
            }
            continue;
        }
        if let Some(first) = seen.get(id) {
            return Err(Refusal::new(
                Diagnostic::frontend(
                    Code::DuplicateArtifactId,
                    format!("id {id} is declared by {first} and {}", document.path()),
                    Some(Locus::head(source_identity, document.path())),
                )
                .with_related(Locus::head(source_identity, first)),
            ));
        }
        seen.insert(id, document.path());
    }
    Ok(())
}
