//! FR-092 "Kernel scalars": the FR-032 library as this crate reads it, and
//! the package-local `scalar` definition minted once per kernel scalar a
//! bundle uses.
//!
//! The library is the embedded `packages/semantic-core/kernel-scalars.json`
//! (FR-032's one source), read at compile time; [`KernelScalar`] is the
//! closed enum over its members, and [`KernelScalar::ir_scalar`] is the
//! `irScalar` column of that file, never a spelling of this crate's own.
//! `JsonObject` is the source vocabulary's name for IR scalar `any`.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use crate::diagnostics::OWNER;
use crate::identity::PackageIdentity;

/// The FR-032 table, byte for byte.
const LIBRARY: &str = include_str!("../../../packages/semantic-core/kernel-scalars.json");

/// The extension every kernel scalar definition carries (FR-034, FR-046).
pub const KERNEL_SCALAR_EXTENSION: &str = "ix://agent-ix/semantic-core/ext/kernel-scalar";
/// The version of that extension.
pub const KERNEL_SCALAR_EXTENSION_VERSION: &str = "1.0.0";

/// The nine members of the FR-032 kernel scalar library, in library order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum KernelScalar {
    Uuid,
    Boolean,
    Integer,
    Decimal,
    String,
    Timestamp,
    Duration,
    Bytes,
    JsonObject,
}

/// One row of `kernel-scalars.json`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LibraryEntry {
    #[serde(default)]
    ir_scalar: Option<std::string::String>,
}

#[derive(Debug, Deserialize)]
struct Library {
    scalars: BTreeMap<std::string::String, LibraryEntry>,
}

/// The embedded `kernel-scalars.json` does not parse: a build defect,
/// surfaced by [`check_library`] at the start of every lift (SR-169
/// FND-1494) rather than hidden behind an empty map.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LibraryError {
    pub message: std::string::String,
}

impl std::fmt::Display for LibraryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "kernel-scalars.json does not parse: {}", self.message)
    }
}

impl std::error::Error for LibraryError {}

/// The parsed library, or the parse error, decided once.
fn parsed() -> &'static Result<Library, LibraryError> {
    static PARSED: OnceLock<Result<Library, LibraryError>> = OnceLock::new();
    PARSED.get_or_init(|| {
        serde_json::from_str(LIBRARY).map_err(|e| LibraryError {
            message: e.to_string(),
        })
    })
}

/// Refuse a lift whose embedded library does not parse. Every lift calls
/// this before any `Type` cell is classified, so the empty-map lookups
/// below are reached only when the file parsed.
pub fn check_library() -> Result<(), LibraryError> {
    parsed().as_ref().map(|_| ()).map_err(Clone::clone)
}

/// The parsed library; empty when the file did not parse, a state
/// [`check_library`] refuses before any lookup runs in a lift.
fn library() -> &'static Library {
    static EMPTY: OnceLock<Library> = OnceLock::new();
    match parsed() {
        Ok(library) => library,
        Err(_) => EMPTY.get_or_init(|| Library {
            scalars: BTreeMap::new(),
        }),
    }
}

impl KernelScalar {
    /// Every member, in library order.
    pub const ALL: [KernelScalar; 9] = [
        KernelScalar::Uuid,
        KernelScalar::Boolean,
        KernelScalar::Integer,
        KernelScalar::Decimal,
        KernelScalar::String,
        KernelScalar::Timestamp,
        KernelScalar::Duration,
        KernelScalar::Bytes,
        KernelScalar::JsonObject,
    ];

    /// The kernel name: the `Type` cell spelling and the `type/` segment of
    /// the scalar definition's identity.
    pub fn name(self) -> &'static str {
        match self {
            KernelScalar::Uuid => "UUID",
            KernelScalar::Boolean => "Boolean",
            KernelScalar::Integer => "Integer",
            KernelScalar::Decimal => "Decimal",
            KernelScalar::String => "String",
            KernelScalar::Timestamp => "Timestamp",
            KernelScalar::Duration => "Duration",
            KernelScalar::Bytes => "Bytes",
            KernelScalar::JsonObject => "JsonObject",
        }
    }

    /// The member named `name`, when the library declares it. The enum and
    /// the file agree by construction; a name in one and not the other is
    /// no kernel scalar.
    pub fn from_name(name: &str) -> Option<Self> {
        let member = Self::ALL.into_iter().find(|k| k.name() == name)?;
        library().scalars.contains_key(name).then_some(member)
    }

    /// The IR `scalar` value of the member (`irScalar` in the library).
    pub fn ir_scalar(self) -> Option<&'static str> {
        library()
            .scalars
            .get(self.name())
            .and_then(|entry| entry.ir_scalar.as_deref())
    }
}

/// `common.schema.json#/$defs/generatedOrigin`: a node with no source locus
/// names the lowerer that generated it (FR-034).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedOrigin {
    pub generator_identity: std::string::String,
    pub generator_version: std::string::String,
    pub input_identities: Vec<std::string::String>,
}

/// `common.schema.json#/$defs/origin`, the `generated` arm.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Origin {
    pub generated: GeneratedOrigin,
}

/// `common.schema.json#/$defs/extension` with the kernel-scalar payload.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Extension {
    pub identity: std::string::String,
    pub version: std::string::String,
    pub required: bool,
    pub payload: ExtensionPayload,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ExtensionPayload {
    pub name: std::string::String,
}

/// One `typeDefinition` of `kind: scalar`
/// (`semantic-ir.schema.json#/$defs/typeDefinition`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScalarDefinition {
    pub identity: std::string::String,
    pub display_name: std::string::String,
    pub kind: &'static str,
    pub roles: Vec<std::string::String>,
    pub origin: Origin,
    pub constraints: Vec<serde_json::Value>,
    pub extensions: Vec<Extension>,
    pub unknown_policy: &'static str,
    pub scalar: std::string::String,
}

/// One package-local scalar definition per kernel scalar in `used`, each
/// once, in identity order (FR-092 "Kernel scalars"): identity
/// `ix://<org>/<name>/<KernelScalar>` (FR-095), the FR-032 `scalar`
/// value, and the `ext/kernel-scalar` extension. A member with no
/// Every declared scalar yields one definition here.
///
/// `generator_version` is the frontend's own version as the provenance
/// record names it (FR-095), never read from the build environment.
pub fn definitions(
    package: &PackageIdentity,
    used: impl IntoIterator<Item = KernelScalar>,
    generator_version: &str,
) -> Vec<ScalarDefinition> {
    let mut out: BTreeMap<std::string::String, ScalarDefinition> = BTreeMap::new();
    for member in used {
        let Some(scalar) = member.ir_scalar() else {
            continue;
        };
        let identity = package
            .type_identity(member.name())
            .expect("kernel scalar names are slug-safe");
        out.entry(identity.clone())
            .or_insert_with(|| ScalarDefinition {
                identity,
                display_name: member.name().to_string(),
                kind: "scalar",
                roles: Vec::new(),
                origin: Origin {
                    generated: GeneratedOrigin {
                        generator_identity: OWNER.to_string(),
                        generator_version: generator_version.to_string(),
                        input_identities: vec![package.source()],
                    },
                },
                constraints: Vec::new(),
                extensions: vec![Extension {
                    identity: KERNEL_SCALAR_EXTENSION.to_string(),
                    version: KERNEL_SCALAR_EXTENSION_VERSION.to_string(),
                    required: false,
                    payload: ExtensionPayload {
                        name: member.name().to_string(),
                    },
                }],
                unknown_policy: "reject",
                scalar: scalar.to_string(),
            });
    }
    out.into_values().collect()
}
