//! Diagnostics, and the rules that decide a diagnostic's `owner` and `locus`.
//!
//! Every diagnostic this crate emits is a
//! `common.schema.json#/$defs/diagnostic` document: `code`, `severity`,
//! `message`, `owner`, `blocking`, `causes` and `related` are required, and
//! `locus` is carried when the addressed node has one.

use crate::json::{write_string, Json};

/// The identity a diagnostic carries when no declaration owns the node it
/// addresses.
///
/// `common.schema.json#/$defs/diagnostic` requires `owner` to be a
/// `semanticIdentity`, so there is no "absent owner" to fall back to; the
/// deciding party owns what no declaration does.
pub const ORACLE_OWNER: &str = "ix://agent-ix/filament-core-data/conformance/oracle";

/// A diagnostic severity.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    /// Informational.
    Info,
    /// A warning.
    Warning,
    /// An error.
    Error,
}

impl Severity {
    /// The wire name of this severity.
    pub fn as_str(self) -> &'static str {
        match self {
            Severity::Info => "info",
            Severity::Warning => "warning",
            Severity::Error => "error",
        }
    }
}

/// One diagnostic, and the RFC 6901 pointer into the input bundle it addresses.
#[derive(Debug, Clone)]
pub struct Located {
    /// The pointer into the input bundle.
    pub pointer: String,
    /// The code the diagnostic registry publishes.
    pub code: &'static str,
    /// The severity.
    pub severity: Severity,
    /// Authored prose beside the judgement; never compared.
    pub message: String,
    /// The identity of the nearest owning declaration.
    pub owner: String,
    /// Whether the diagnostic blocks.
    pub blocking: bool,
    /// The source locus, when the addressed node or an ancestor carries one.
    pub locus: Option<Json>,
}

impl Located {
    /// Writes this diagnostic as an `adapter-result.schema.json` entry.
    pub fn write_json(&self, out: &mut String) {
        out.push_str("{\"diagnostic\":{\"blocking\":");
        out.push_str(if self.blocking { "true" } else { "false" });
        out.push_str(",\"causes\":[],\"code\":");
        write_string(out, self.code);
        out.push_str(",\"message\":");
        write_string(out, &self.message);
        if let Some(locus) = &self.locus {
            out.push_str(",\"locus\":");
            out.push_str(&crate::json::to_document_string(locus));
        }
        out.push_str(",\"owner\":");
        write_string(out, &self.owner);
        out.push_str(",\"related\":[],\"severity\":");
        write_string(out, self.severity.as_str());
        out.push_str("},\"pointer\":");
        write_string(out, &self.pointer);
        out.push('}');
    }
}

/// Escapes one RFC 6901 reference token.
pub fn token(raw: &str) -> String {
    raw.replace('~', "~0").replace('/', "~1")
}

/// Appends one reference token to a pointer.
pub fn child(pointer: &str, raw: &str) -> String {
    let mut out = String::from(pointer);
    out.push('/');
    out.push_str(&token(raw));
    out
}

/// Appends an array index to a pointer.
pub fn index(pointer: &str, at: usize) -> String {
    let mut out = String::from(pointer);
    out.push('/');
    out.push_str(&at.to_string());
    out
}

/// Splits an RFC 6901 pointer into its reference tokens.
pub fn split(pointer: &str) -> Vec<String> {
    if pointer.is_empty() {
        return Vec::new();
    }
    pointer
        .split('/')
        .skip(1)
        .map(|part| part.replace("~1", "/").replace("~0", "~"))
        .collect()
}

/// The chain of nodes a pointer walks through, deepest last.
///
/// The addressed node itself is the last entry, because a diagnostic that
/// addresses a declaration is owned by that declaration and not by its parent.
pub fn chain<'a>(root: &'a Json, pointer: &str) -> Vec<&'a Json> {
    let mut nodes = vec![root];
    let mut current = root;
    for part in split(pointer) {
        let next = match current {
            Json::Object(_) => current.get(&part),
            Json::Array(items) => part.parse::<usize>().ok().and_then(|at| items.get(at)),
            _ => None,
        };
        match next {
            Some(node) => {
                nodes.push(node);
                current = node;
            }
            None => break,
        }
    }
    nodes
}

/// Whether `text` matches `common.schema.json#/$defs/semanticIdentity`.
pub fn is_semantic_identity(text: &str) -> bool {
    // ^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$
    let rest = match text.strip_prefix("ix://") {
        Some(rest) => rest,
        None => return false,
    };
    let slash = match rest.find('/') {
        Some(at) => at,
        None => return false,
    };
    let (owner, name) = (&rest[..slash], &rest[slash + 1..]);
    let owner_ok = matches!(owner.chars().next(), Some(c) if c.is_ascii_lowercase() || c.is_ascii_digit())
        && owner
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '.' | '_' | '-'));
    let name_ok = matches!(name.chars().next(), Some(c) if c.is_ascii_alphanumeric())
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '~' | ':' | '/' | '-'));
    owner_ok && name_ok
}

/// Whether `value` is a structurally valid `common.schema.json#/$defs/sourceLocus`.
///
/// The published `path` pattern carries four ECMAScript lookaheads, which
/// `conformance/contract-gaps.json` GAP-002 records as impossible to compile
/// under RE2. This reader therefore decides the path structurally — not
/// absolute, no drive letter, no backslash, no `..` segment, no NUL — which is
/// exactly what the four lookaheads assert.
pub fn is_source_locus(value: &Json) -> bool {
    let members = match value.as_object() {
        Some(members) => members,
        None => return false,
    };
    for (name, _) in members {
        if !matches!(
            name.as_str(),
            "sourceIdentity" | "path" | "startLine" | "startColumn" | "endLine" | "endColumn"
        ) {
            return false;
        }
    }
    match value.get("sourceIdentity").and_then(Json::as_str) {
        Some(identity) if is_semantic_identity(identity) => {}
        _ => return false,
    }
    match value.get("path").and_then(Json::as_str) {
        Some(path) if is_relative_path(path) => {}
        _ => return false,
    }
    for name in ["startLine", "startColumn"] {
        match value.get(name).and_then(Json::as_i64) {
            Some(line) if line >= 1 => {}
            _ => return false,
        }
    }
    for name in ["endLine", "endColumn"] {
        if let Some(member) = value.get(name) {
            match member.as_i64() {
                Some(line) if line >= 1 => {}
                _ => return false,
            }
        }
    }
    true
}

fn is_relative_path(path: &str) -> bool {
    if path.is_empty() || path.contains('\u{0}') || path.contains('\\') {
        return false;
    }
    if path.starts_with('/') {
        return false;
    }
    let bytes = path.as_bytes();
    if bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' {
        return false;
    }
    !path.split('/').any(|segment| segment == "..")
}

/// The identity of the nearest declaration owning the node `pointer` addresses.
///
/// Derived from `spec/functional/FR-036`: "`owner` set to the identity of the
/// nearest owning declaration". A declaration is a node carrying an `identity`
/// member that is a `semanticIdentity`; `package.identity` is a
/// `packageIdentity` and therefore owns nothing.
pub fn owner_for(root: &Json, pointer: &str) -> String {
    for node in chain(root, pointer).iter().rev() {
        if let Some(identity) = node.get("identity").and_then(Json::as_str) {
            if is_semantic_identity(identity) {
                return identity.to_string();
            }
        }
    }
    ORACLE_OWNER.to_string()
}

/// The locus of the node `pointer` addresses.
///
/// Derived from `spec/functional/FR-036`: "`locus` taken verbatim from the
/// addressed node's `origin.source` or, absent that, from its nearest
/// ancestor's". A candidate that is not a valid `sourceLocus` is not a locus,
/// which is why a diagnostic about a malformed locus carries none.
pub fn locus_for(root: &Json, pointer: &str) -> Option<Json> {
    for node in chain(root, pointer).iter().rev() {
        if let Some(source) = node.get("origin").and_then(|origin| origin.get("source")) {
            if is_source_locus(source) {
                return Some(source.clone());
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::parse;

    #[test]
    fn tc_701_owner_walks_to_the_nearest_declaration() {
        let root = parse(
            r#"{"ir":{"types":[{"identity":"ix://a/B","origin":{"source":{"sourceIdentity":"ix://a/S","path":"a.tsp","startLine":1,"startColumn":1}},"fields":[{"identity":"ix://a/B~1f","name":"f"}]}]}}"#,
        )
        .expect("a well-formed document");
        assert_eq!(owner_for(&root, "/ir/types/0/fields/0/name"), "ix://a/B~1f");
        assert_eq!(owner_for(&root, "/ir/types/0/kind"), "ix://a/B");
        assert_eq!(owner_for(&root, "/ir"), ORACLE_OWNER);
    }

    #[test]
    fn tc_701_locus_skips_a_locus_that_is_not_one() {
        let good = parse(
            r#"{"origin":{"source":{"sourceIdentity":"ix://a/S","path":"a.tsp","startLine":1,"startColumn":1}}}"#,
        )
        .expect("a well-formed document");
        assert!(locus_for(&good, "").is_some());
        let bad = parse(
            r#"{"origin":{"source":{"sourceIdentity":"ix://a/S","path":"a.tsp","startLine":0,"startColumn":1}}}"#,
        )
        .expect("a well-formed document");
        assert!(locus_for(&bad, "").is_none());
    }

    #[test]
    fn tc_701_semantic_identity_pattern() {
        assert!(is_semantic_identity("ix://a/B"));
        assert!(is_semantic_identity("ix://agent-ix/conformance/type/Text"));
        assert!(!is_semantic_identity("agent-ix/conformance"));
        assert!(!is_semantic_identity("ix://A/B"));
        assert!(!is_semantic_identity("ix://a/"));
    }
}
