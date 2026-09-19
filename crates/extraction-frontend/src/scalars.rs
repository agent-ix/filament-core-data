//! FR-092 "Kernel scalars": the FR-032 library as this crate reads it, and
//! the native `ix://quire/native/<Name>` reference a kernel scalar token
//! resolves to. A kernel scalar mints no package-local node (gap 1 of
//! FCD #199/#200): [`KernelScalar::native_type_ref`] is the closed set of
//! `typeRef` values a token can take instead.
//!
//! The library is the embedded `packages/semantic-core/kernel-scalars.json`
//! (FR-032's one source), read at compile time; [`KernelScalar`] is the
//! closed enum over its members, and [`KernelScalar::ir_scalar`] is the
//! `irScalar` column of that file, never a spelling of this crate's own.
//! `JsonObject` is the source vocabulary's name for IR scalar `any`.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::Deserialize;

/// The FR-032 table, byte for byte.
const LIBRARY: &str = include_str!("../../../packages/semantic-core/kernel-scalars.json");

/// The package a native type reference names (`ix://quire/native/<Name>`).
pub const NATIVE_PACKAGE: &str = "quire";

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

    /// The `typeRef` value a token resolving to this member takes: `
    /// ix://quire/native/<Name>`, naming no package node (gap 1 of FCD
    /// #199/#200). Every reader resolves this prefix as a native type over
    /// the closed [`KernelScalar::ALL`] set.
    pub fn native_type_ref(self) -> std::string::String {
        format!("ix://{NATIVE_PACKAGE}/native/{}", self.name())
    }
}
