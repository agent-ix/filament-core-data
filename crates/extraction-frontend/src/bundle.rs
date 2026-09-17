//! Loading one spec bundle through the Quire extraction contract (FR-091
//! "Loading" and "The bundle index").
//!
//! This is the only module that names `load_repo` and `load_module_set`
//! (FR-091-CON-2), and it reads the file system through nothing else: no
//! direct file-system call, no `~/.ix`, no `HOME`, no `QUIRE_MODULES`. Modules come from
//! the roots the caller supplies and from nowhere else.
//!
//! # Construct declarations
//!
//! Each object type's `construct` declaration (FR-142) is read through one
//! seam, `CompiledArchetype::construct()`, which returns the declaration raw
//! as the engine loaded it.
//! Every declaration is checked against the core vocabulary and the roles
//! the loaded object types carry, and refused as `MODULE_REFUSED` naming the
//! module and the object type (FR-143 "Declarations").

use std::collections::{BTreeMap, BTreeSet};
use std::fmt;
use std::path::{Path, PathBuf};

use agent_ix_semantic_ir::json::Json;
use agent_ix_semantic_ir::vocabulary::{Declaration, Shape};
use quire_rs::corpus::walk::load_repo;
use quire_rs::loader::manifest::{parse_manifest, Manifest};
use quire_rs::semantic::{BundleIndex, SemanticModule};
use quire_rs::CompiledArchetype;
use quire_rs::{LoadedDocument, Registry};

use crate::diagnostics::{Code, Diagnostic, Locus};
use crate::envelope::sha256_prefixed;
use crate::lower::module_short_name;
use crate::write::{read_manifest, MANIFEST};

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
    pub(crate) fn new(diagnostic: Diagnostic) -> Self {
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
    /// The construct kind the module declares for the object type; `None`
    /// lowers the object type's artifacts to a plain `record`.
    pub construct: Option<Construct>,
}

/// `semantic-ir.schema.json#/$defs/constructKind`: the declaring module's
/// package identity and the object type's name.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, serde::Serialize)]
pub struct ConstructKind {
    pub module: String,
    pub name: String,
}

/// One construct kind as a lift carries it into the IR's `constructs` table.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Construct {
    pub kind: ConstructKind,
    /// The declaring module's manifest `version`.
    pub module_version: String,
    /// `sha256:<hex>` over the declaring module's manifest bytes.
    pub manifest_digest: String,
    /// The declaration, each referenced role spelled as the IR role
    /// `<module short name>:<role>` of every module whose object types
    /// carry it.
    pub declaration: Declaration,
}

impl fmt::Debug for ObjectType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ObjectType")
            .field("module", &self.module)
            .field("name", &self.archetype.name)
            .field("digest", &self.archetype.semantic_schema_digest)
            .field("construct", &self.construct)
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
        let manifests = module_manifests(module_roots)?;
        let active: Vec<(&CompiledArchetype, &SemanticModule)> = registry
            .active_archetypes()
            .filter_map(|archetype| Some((archetype, modules.get(&archetype.module)?)))
            .collect();
        let carriers = role_carriers(active.iter().map(|(archetype, _)| *archetype));
        let mut object_types = BTreeMap::new();
        for (archetype, semantic) in active {
            let construct = archetype
                .construct()
                .map(|raw| {
                    let loaded = Loaded {
                        registry: &registry,
                        manifests: &manifests,
                        carriers: &carriers,
                        source_identity: &source_identity,
                    };
                    loaded.construct(archetype, semantic, raw)
                })
                .transpose()?;
            object_types.insert(
                archetype.name.clone(),
                ObjectType {
                    module: archetype.module.clone(),
                    semantic: semantic.clone(),
                    archetype: archetype.clone(),
                    construct,
                },
            );
        }

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

    /// Whether `document`'s object type declares a construct of the
    /// `enumeration` shape.
    pub fn is_enumeration(&self, document: &Document) -> bool {
        document
            .object()
            .and_then(|object| self.object_type(object)?.construct.as_ref())
            .is_some_and(|construct| construct.declaration.shape == Shape::Enumeration)
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

/// The module name the registry loaded `root`'s manifest under, with the
/// parsed manifest: the `name` the engine's own manifest parser reads from
/// `bytes`, or, when the manifest declares none, the root's directory name —
/// the engine's FR-014-AC-7 fallback (SR-169 FND-1491: no YAML is read by a
/// scanner of this crate's own). A manifest the engine cannot parse is
/// refused as `MODULE_REFUSED` naming the root and the engine's error.
pub(crate) fn parsed_manifest(root: &Path, bytes: &[u8]) -> Result<(String, Manifest), Refusal> {
    let manifest = parse_manifest(bytes).map_err(|error| {
        Refusal::new(Diagnostic::frontend(
            Code::ModuleRefused,
            format!(
                "module root {} has a {MANIFEST} the engine does not parse: {error}",
                root.display()
            ),
            None,
        ))
    })?;
    let name = manifest.name.clone().unwrap_or_else(|| {
        root.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default()
    });
    Ok((name, manifest))
}

/// One module's manifest as a construct kind cites it.
struct ModuleManifest {
    digest: String,
}

/// The manifest of every module root, keyed by module name; the first root
/// naming a module wins, as it does in the registry.
fn module_manifests(module_roots: &[&Path]) -> Result<BTreeMap<String, ModuleManifest>, Refusal> {
    let mut out = BTreeMap::new();
    for root in module_roots {
        let bytes = read_manifest(root)?;
        let (name, _) = parsed_manifest(root, &bytes)?;
        out.entry(name).or_insert(ModuleManifest {
            digest: sha256_prefixed(&bytes),
        });
    }
    Ok(out)
}

/// Every role a loaded object type carries, with the short names of the
/// modules whose object types carry it: the roles a reference can admit.
fn role_carriers<'a>(
    archetypes: impl Iterator<Item = &'a CompiledArchetype>,
) -> BTreeMap<String, BTreeSet<String>> {
    let mut carriers: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for archetype in archetypes {
        for role in archetype.roles() {
            carriers
                .entry(role.clone())
                .or_default()
                .insert(module_short_name(&archetype.module).to_string());
        }
    }
    carriers
}

/// `value` as the reader's own JSON tree, member order kept.
fn reader_json(value: &serde_json::Value) -> Json {
    match value {
        serde_json::Value::Null => Json::Null,
        serde_json::Value::Bool(flag) => Json::Bool(*flag),
        serde_json::Value::Number(number) => Json::Number(number.to_string()),
        serde_json::Value::String(text) => Json::Str(text.clone()),
        serde_json::Value::Array(items) => Json::Array(items.iter().map(reader_json).collect()),
        serde_json::Value::Object(members) => Json::Object(
            members
                .iter()
                .map(|(name, member)| (name.clone(), reader_json(member)))
                .collect(),
        ),
    }
}

/// What a declaration is checked against at load.
struct Loaded<'a> {
    registry: &'a Registry,
    manifests: &'a BTreeMap<String, ModuleManifest>,
    carriers: &'a BTreeMap<String, BTreeSet<String>>,
    source_identity: &'a str,
}

impl Loaded<'_> {
    /// The construct `raw` declares for `archetype`, checked against the
    /// core vocabulary (`Declaration::read`) and the roles loaded object
    /// types carry; `MODULE_REFUSED` naming the module and the object type at
    /// the first defect.
    fn construct(
        &self,
        archetype: &CompiledArchetype,
        semantic: &SemanticModule,
        raw: &serde_json::Value,
    ) -> Result<Construct, Refusal> {
        let module = &archetype.module;
        let object = &archetype.name;
        let refuse = |defect: String| {
            Refusal::new(Diagnostic::frontend(
                Code::ModuleRefused,
                format!(
                    "module {module} object type {object} declares no valid construct: {defect}"
                ),
                Some(Locus::head(
                    self.source_identity,
                    &format!("{module}/manifest.yaml"),
                )),
            ))
        };
        if !agent_ix_semantic_ir::schema::is_construct_name(object) {
            return Err(refuse(format!(
                "a construct kind's name matches ^[a-z][a-z0-9_]*$, and {object} does not"
            )));
        }
        let declaration = Declaration::read(&reader_json(raw))
            .map_err(|error| refuse(format!("construct{}: {}", error.pointer, error.message)))?;
        if let Some(role) = declaration
            .referenced_roles()
            .into_iter()
            .find(|role| !self.carriers.contains_key(*role))
        {
            return Err(refuse(format!(
                "its references admit the role {role}, which no loaded object type carries"
            )));
        }
        let declaration = declaration.with_roles(|role| {
            self.carriers
                .get(role)
                .into_iter()
                .flatten()
                .map(|short| format!("{short}:{role}"))
                .collect()
        });
        let (Some(module_version), Some(manifest)) = (
            self.registry.module_version(module),
            self.manifests.get(module),
        ) else {
            return Err(refuse(
                "the engine loaded the module without a manifest version".to_string(),
            ));
        };
        Ok(Construct {
            kind: ConstructKind {
                module: semantic.package.clone(),
                name: object.clone(),
            },
            module_version: module_version.to_string(),
            manifest_digest: manifest.digest.clone(),
            declaration,
        })
    }
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
