//! The published schema layer.
//!
//! This module decides `conformance/schema/input-bundle.schema.json` and the
//! published v1 schemas it composes — `semantic-ir.schema.json`,
//! `common.schema.json`, `package-manifest.schema.json`,
//! `package-lock.schema.json`, `profile.schema.json`, `mapping.schema.json`
//! and `consumer-policy.schema.json` — by walking the instance rather than by
//! interpreting the schema documents at run time.
//!
//! Two consequences of the published text shape it. First, a violation is
//! reported once, at the deepest failing instance location, with any location
//! that is a strict prefix of another dropped. Second, a schema that
//! discriminates by a member (`origin` by `source`/`generated`, `constraint` by
//! `keyword`, `typeDefinition` by `kind`) is walked by that member, so a
//! `oneOf` cascade cannot report the same defect at several depths.

use crate::diag::{child, index, is_semantic_identity, Located, Severity};
use crate::json::Json;

/// The code every schema-layer defect carries.
pub const SCHEMA_VIOLATION: &str = "agent-ix.semantic-ir.SCHEMA_VIOLATION";
/// The code a value that is not an input bundle at all carries.
pub const INVALID_DOCUMENT: &str = "agent-ix.semantic-ir.INVALID_DOCUMENT";

/// A schema-layer defect: where it is, and prose about it.
pub struct Finding {
    pointer: String,
    message: String,
}

/// Collects schema-layer defects.
pub struct Findings {
    items: Vec<Finding>,
}

impl Findings {
    fn new() -> Self {
        Findings { items: Vec::new() }
    }

    fn push(&mut self, pointer: &str, message: impl Into<String>) {
        self.items.push(Finding {
            pointer: pointer.to_string(),
            message: message.into(),
        });
    }

    /// The findings, with every location that is a strict prefix of another
    /// dropped, so one violation inside a cascade yields one diagnostic at the
    /// deepest failing node.
    fn deepest(self) -> Vec<Finding> {
        let pointers: Vec<String> = self.items.iter().map(|f| f.pointer.clone()).collect();
        let mut kept: Vec<Finding> = Vec::new();
        for finding in self.items {
            let shadowed = pointers.iter().any(|other| {
                other.len() > finding.pointer.len() && other.starts_with(&finding.pointer)
            });
            if shadowed {
                continue;
            }
            if kept.iter().any(|seen| seen.pointer == finding.pointer) {
                continue;
            }
            kept.push(finding);
        }
        kept
    }
}

/// Decides the schema layer over one input bundle.
///
/// Returns the diagnostics the layer produced, ordered by the caller.
pub fn decide(bundle: &Json) -> Vec<Located> {
    if bundle.as_object().is_none() {
        return vec![Located {
            pointer: String::new(),
            code: INVALID_DOCUMENT,
            severity: Severity::Error,
            message: "a conformance input bundle is a JSON object carrying an ir member"
                .to_string(),
            owner: crate::diag::ORACLE_OWNER.to_string(),
            blocking: true,
            locus: None,
        }];
    }
    let mut findings = Findings::new();
    bundle_schema(bundle, &mut findings);
    findings
        .deepest()
        .into_iter()
        .map(|finding| Located {
            code: SCHEMA_VIOLATION,
            severity: Severity::Error,
            message: finding.message,
            owner: crate::diag::owner_for(bundle, &finding.pointer),
            blocking: true,
            locus: crate::diag::locus_for(bundle, &finding.pointer),
            pointer: finding.pointer,
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Primitive shapes from common.schema.json
// ---------------------------------------------------------------------------

fn is_semver(text: &str) -> bool {
    // ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$
    let (without_build, build) = match text.split_once('+') {
        Some((head, tail)) => (head, Some(tail)),
        None => (text, None),
    };
    let (core, pre) = match without_build.split_once('-') {
        Some((head, tail)) => (head, Some(tail)),
        None => (without_build, None),
    };
    let parts: Vec<&str> = core.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    let numeric_ok = parts.iter().all(|part| {
        !part.is_empty()
            && part.chars().all(|c| c.is_ascii_digit())
            && (part.len() == 1 || !part.starts_with('0'))
    });
    let tail_ok = |tail: Option<&str>| match tail {
        None => true,
        Some(tail) => {
            !tail.is_empty()
                && tail
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-'))
        }
    };
    numeric_ok && tail_ok(pre) && tail_ok(build)
}

fn is_sha256(text: &str) -> bool {
    match text.strip_prefix("sha256:") {
        Some(rest) => {
            rest.len() == 64
                && rest
                    .chars()
                    .all(|c| c.is_ascii_digit() || ('a'..='f').contains(&c))
        }
        None => false,
    }
}

fn is_package_identity(text: &str) -> bool {
    let (owner, name) = match text.split_once('/') {
        Some(parts) => parts,
        None => return false,
    };
    let segment_ok = |segment: &str| {
        matches!(segment.chars().next(), Some(c) if c.is_ascii_lowercase() || c.is_ascii_digit())
            && segment.chars().all(|c| {
                c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '.' | '_' | '-')
            })
    };
    segment_ok(owner) && segment_ok(name)
}

/// `^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$` — the namespaced-name
/// shape `roles`, `format` operands, and clause `language` share.
fn is_namespaced_name(text: &str) -> bool {
    let (namespace, name) = match text.split_once(':') {
        Some(parts) => parts,
        None => return false,
    };
    let namespace_ok = matches!(namespace.chars().next(), Some(c) if c.is_ascii_lowercase() || c.is_ascii_digit())
        && namespace
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '.' | '-'));
    let name_ok = matches!(name.chars().next(), Some(c) if c.is_ascii_alphanumeric())
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'));
    namespace_ok && name_ok
}

fn is_clause_language(text: &str) -> bool {
    matches!(text, "quire" | "ocl" | "sysml" | "fretish") || is_namespaced_name(text)
}

fn is_unit(text: &str) -> bool {
    !text.is_empty() && text.chars().all(|c| ('!'..='~').contains(&c))
}

const SCALARS: &[&str] = &[
    "boolean", "integer", "number", "string", "bytes", "date", "datetime", "duration", "uuid",
];
const KINDS: &[&str] = &[
    "scalar",
    "record",
    "enum",
    "union",
    "alias",
    "sequence",
    "map",
    "reference",
];
const UNKNOWN_POLICIES: &[&str] = &["preserve", "reject", "surface"];
const CATEGORIES: &[&str] = &[
    "structural",
    "behavioral",
    "dataflow",
    "dependency",
    "realization",
    "governance",
    "traceability",
];
const DEFAULT_KINDS: &[&str] = &["none", "semantic", "representation", "migration"];
const PRESENCES: &[&str] = &["required", "optional"];
const TARGETS: &[&str] = &[
    "json-schema",
    "rust",
    "typescript",
    "python-pydantic-v2",
    "python-dataclass",
];
const REPRESENTATION_FORMATS: &[&str] = &[
    "markdown",
    "json",
    "postgresql",
    "protobuf",
    "avro",
    "arrow",
    "parquet",
    "csv",
    "tsv",
];
const RESULT_STATES: &[&str] = &[
    "success",
    "invalid",
    "unsupported",
    "unavailable",
    "partial",
    "lossy",
];
const PRESERVATIONS: &[&str] = &[
    "byte-lossless",
    "structure-lossless",
    "semantic-lossless",
    "declared-lossy",
    "one-way",
];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

fn require_members(value: &Json, pointer: &str, names: &[&str], f: &mut Findings) -> bool {
    let mut complete = true;
    for name in names {
        if !value.has(name) {
            f.push(pointer, format!("a required member {name} is absent"));
            complete = false;
        }
    }
    complete
}

fn forbid_extra(value: &Json, pointer: &str, allowed: &[&str], f: &mut Findings) {
    if let Some(members) = value.as_object() {
        for (name, _) in members {
            if !allowed.contains(&name.as_str()) {
                f.push(
                    pointer,
                    format!("the member {name} is not one this schema admits"),
                );
            }
        }
    }
}

fn expect_object(value: &Json, pointer: &str, what: &str, f: &mut Findings) -> bool {
    if value.as_object().is_some() {
        true
    } else {
        f.push(pointer, format!("{what} is an object"));
        false
    }
}

fn expect_array(value: &Json, pointer: &str, what: &str, f: &mut Findings) -> bool {
    if value.as_array().is_some() {
        true
    } else {
        f.push(pointer, format!("{what} is an array"));
        false
    }
}

fn expect_enum(
    value: Option<&Json>,
    pointer: &str,
    allowed: &[&str],
    what: &str,
    f: &mut Findings,
) {
    let value = match value {
        Some(value) => value,
        None => return,
    };
    match value.as_str() {
        Some(text) if allowed.contains(&text) => {}
        Some(text) => f.push(
            pointer,
            format!("{what} is a closed enumeration and {text} is not a member"),
        ),
        None => f.push(pointer, format!("{what} is a string from a closed set")),
    }
}

fn expect_string(
    value: Option<&Json>,
    pointer: &str,
    min_len: usize,
    what: &str,
    f: &mut Findings,
) {
    let value = match value {
        Some(value) => value,
        None => return,
    };
    match value.as_str() {
        Some(text) if text.len() >= min_len => {}
        _ => f.push(pointer, format!("{what} is a non-empty string")),
    }
}

fn expect_bool(value: Option<&Json>, pointer: &str, what: &str, f: &mut Findings) {
    if let Some(value) = value {
        if value.as_bool().is_none() {
            f.push(pointer, format!("{what} is a boolean"));
        }
    }
}

fn expect_shape(
    value: Option<&Json>,
    pointer: &str,
    ok: fn(&str) -> bool,
    what: &str,
    f: &mut Findings,
) {
    let value = match value {
        Some(value) => value,
        None => return,
    };
    match value.as_str() {
        Some(text) if ok(text) => {}
        _ => f.push(pointer, what.to_string()),
    }
}

fn expect_integer(value: Option<&Json>, pointer: &str, min: i64, what: &str, f: &mut Findings) {
    let value = match value {
        Some(value) => value,
        None => return,
    };
    match value.as_i64() {
        Some(number) if number >= min => {}
        _ => f.push(pointer, what.to_string()),
    }
}

// ---------------------------------------------------------------------------
// input-bundle.schema.json
// ---------------------------------------------------------------------------

const BUNDLE_MEMBERS: &[&str] = &[
    "ir",
    "manifest",
    "manifestDigest",
    "lock",
    "profile",
    "mappings",
    "consumerPolicy",
];

fn bundle_schema(bundle: &Json, f: &mut Findings) {
    require_members(bundle, "", &["ir"], f);
    forbid_extra(bundle, "", BUNDLE_MEMBERS, f);
    if let Some(ir) = bundle.get("ir") {
        semantic_ir(ir, "/ir", f);
    }
    if let Some(manifest) = bundle.get("manifest") {
        package_manifest(manifest, "/manifest", f);
    }
    expect_shape(
        bundle.get("manifestDigest"),
        "/manifestDigest",
        is_sha256,
        "a digest is sha256:<64 lower-case hex digits>",
        f,
    );
    if let Some(lock) = bundle.get("lock") {
        package_lock(lock, "/lock", f);
    }
    if let Some(profile) = bundle.get("profile") {
        profile_schema(profile, "/profile", f);
    }
    if let Some(mappings) = bundle.get("mappings") {
        if expect_array(mappings, "/mappings", "mappings", f) {
            for (at, mapping) in mappings.as_array().unwrap_or(&[]).iter().enumerate() {
                mapping_schema(mapping, &index("/mappings", at), f);
            }
        }
    }
    if let Some(policy) = bundle.get("consumerPolicy") {
        consumer_policy(policy, "/consumerPolicy", f);
    }
}

// ---------------------------------------------------------------------------
// semantic-ir.schema.json
// ---------------------------------------------------------------------------

const IR_MEMBERS: &[&str] = &[
    "contractVersion",
    "source",
    "package",
    "types",
    "occurrences",
    "extensions",
];

fn semantic_ir(ir: &Json, at: &str, f: &mut Findings) {
    if !expect_object(ir, at, "a semantic IR document", f) {
        return;
    }
    require_members(ir, at, IR_MEMBERS, f);
    forbid_extra(ir, at, IR_MEMBERS, f);
    expect_enum(
        ir.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0", "1.1.0"],
        "contractVersion",
        f,
    );
    let is_v11 = ir.get("contractVersion").and_then(Json::as_str) == Some("1.1.0");

    if let Some(source) = ir.get("source") {
        ir_source(source, &child(at, "source"), is_v11, f);
    }
    if let Some(package) = ir.get("package") {
        ir_package(package, &child(at, "package"), f);
    }
    if let Some(types) = ir.get("types") {
        let types_at = child(at, "types");
        if expect_array(types, &types_at, "types", f) {
            let items = types.as_array().unwrap_or(&[]);
            if items.is_empty() {
                f.push(&types_at, "a document declares at least one type");
            }
            for (position, definition) in items.iter().enumerate() {
                type_definition(definition, &index(&types_at, position), is_v11, f);
            }
        }
    }
    if let Some(occurrences) = ir.get("occurrences") {
        let occurrences_at = child(at, "occurrences");
        if expect_array(occurrences, &occurrences_at, "occurrences", f) {
            for (position, occurrence) in occurrences.as_array().unwrap_or(&[]).iter().enumerate() {
                occurrence_schema(occurrence, &index(&occurrences_at, position), f);
            }
        }
    }
    if let Some(extensions) = ir.get("extensions") {
        extension_array(extensions, &child(at, "extensions"), f);
    }
}

const SOURCE_MEMBERS: &[&str] = &["identity", "version", "dialect", "digest"];

fn ir_source(source: &Json, at: &str, is_v11: bool, f: &mut Findings) {
    if !expect_object(source, at, "the source envelope", f) {
        return;
    }
    require_members(source, at, SOURCE_MEMBERS, f);
    forbid_extra(source, at, SOURCE_MEMBERS, f);
    expect_shape(
        source.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_shape(
        source.get("version"),
        &child(at, "version"),
        is_semver,
        "a version is SemVer",
        f,
    );
    expect_shape(
        source.get("digest"),
        &child(at, "digest"),
        is_sha256,
        "a digest is sha256:<64 lower-case hex digits>",
        f,
    );
    if let Some(dialect) = source.get("dialect") {
        let dialect_at = child(at, "dialect");
        let text = dialect.as_str().unwrap_or("");
        if is_v11 {
            if !matches!(text, "typespec" | "spec-bundle") {
                f.push(
                    &dialect_at,
                    "a 1.1.0 document declares a frontend dialect, not the 1.0.0 JSON Schema draft URI",
                );
            }
        } else if text != "https://json-schema.org/draft/2020-12/schema" {
            f.push(
                &dialect_at,
                "a 1.0.0 document declares the JSON Schema draft URI as its dialect",
            );
        }
    }
}

const PACKAGE_MEMBERS: &[&str] = &[
    "identity",
    "version",
    "manifestDigest",
    "mappingVersions",
    "profileVersions",
    "lockDigest",
];

fn ir_package(package: &Json, at: &str, f: &mut Findings) {
    if !expect_object(package, at, "the package envelope", f) {
        return;
    }
    require_members(package, at, PACKAGE_MEMBERS, f);
    forbid_extra(package, at, PACKAGE_MEMBERS, f);
    expect_shape(
        package.get("identity"),
        &child(at, "identity"),
        is_package_identity,
        "a package identity is <owner>/<name>",
        f,
    );
    expect_shape(
        package.get("version"),
        &child(at, "version"),
        is_semver,
        "a version is SemVer",
        f,
    );
    for name in ["manifestDigest", "lockDigest"] {
        expect_shape(
            package.get(name),
            &child(at, name),
            is_sha256,
            "a digest is sha256:<64 lower-case hex digits>",
            f,
        );
    }
    for name in ["mappingVersions", "profileVersions"] {
        if let Some(versions) = package.get(name) {
            let versions_at = child(at, name);
            if expect_array(versions, &versions_at, name, f) {
                for (position, version) in versions.as_array().unwrap_or(&[]).iter().enumerate() {
                    expect_shape(
                        Some(version),
                        &index(&versions_at, position),
                        is_semver,
                        "a version is SemVer",
                        f,
                    );
                }
            }
        }
    }
}

const TYPE_MEMBERS: &[&str] = &[
    "identity",
    "displayName",
    "kind",
    "roles",
    "origin",
    "constraints",
    "extensions",
    "unknownPolicy",
    "scalar",
    "fields",
    "variants",
    "target",
    "items",
    "values",
    "relationships",
    "operations",
    "clauses",
];
const TYPE_REQUIRED: &[&str] = &[
    "identity",
    "displayName",
    "kind",
    "roles",
    "origin",
    "constraints",
    "extensions",
    "unknownPolicy",
];

fn type_definition(definition: &Json, at: &str, is_v11: bool, f: &mut Findings) {
    if !expect_object(definition, at, "a type definition", f) {
        return;
    }
    require_members(definition, at, TYPE_REQUIRED, f);
    forbid_extra(definition, at, TYPE_MEMBERS, f);
    expect_shape(
        definition.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_string(
        definition.get("displayName"),
        &child(at, "displayName"),
        1,
        "a display name",
        f,
    );
    expect_enum(definition.get("kind"), &child(at, "kind"), KINDS, "kind", f);
    expect_enum(
        definition.get("unknownPolicy"),
        &child(at, "unknownPolicy"),
        UNKNOWN_POLICIES,
        "the unknown policy vocabulary",
        f,
    );
    if let Some(roles) = definition.get("roles") {
        let roles_at = child(at, "roles");
        if expect_array(roles, &roles_at, "roles", f) {
            let items = roles.as_array().unwrap_or(&[]);
            for (position, role) in items.iter().enumerate() {
                expect_shape(
                    Some(role),
                    &index(&roles_at, position),
                    is_namespaced_name,
                    "a role is <ns>:<name>",
                    f,
                );
            }
            if has_duplicate_strings(items) {
                f.push(&roles_at, "roles are unique");
            }
        }
    }
    if let Some(origin) = definition.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
    if let Some(constraints) = definition.get("constraints") {
        let constraints_at = child(at, "constraints");
        if expect_array(constraints, &constraints_at, "constraints", f) {
            for (position, constraint) in constraints.as_array().unwrap_or(&[]).iter().enumerate() {
                constraint_schema(constraint, &index(&constraints_at, position), f);
            }
        }
    }
    if let Some(extensions) = definition.get("extensions") {
        extension_array(extensions, &child(at, "extensions"), f);
    }

    let kind = definition.get("kind").and_then(Json::as_str).unwrap_or("");
    match kind {
        "scalar" => {
            if !definition.has("scalar") {
                f.push(at, "a scalar type definition requires scalar");
            }
        }
        "record" => {
            if !definition.has("fields") {
                f.push(at, "a record type definition requires fields");
            }
        }
        "enum" | "union" => {
            if !definition.has("variants") {
                f.push(at, format!("an {kind} type definition requires variants"));
            }
        }
        "alias" | "reference" => {
            if !definition.has("target") {
                f.push(at, format!("an {kind} type definition requires target"));
            }
        }
        "sequence" => {
            if !definition.has("items") {
                f.push(at, "a sequence type definition requires items");
            }
        }
        "map" => {
            if !definition.has("values") {
                f.push(at, "a map type definition requires values");
            }
        }
        _ => {}
    }
    if kind != "record" {
        for name in ["relationships", "operations"] {
            if definition.has(name) {
                f.push(
                    &child(at, name),
                    format!("{name} are carried by a record type definition only"),
                );
            }
        }
    }

    expect_enum(
        definition.get("scalar"),
        &child(at, "scalar"),
        SCALARS,
        "scalar",
        f,
    );
    for name in ["target", "items", "values"] {
        expect_shape(
            definition.get(name),
            &child(at, name),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
    }
    if let Some(fields) = definition.get("fields") {
        let fields_at = child(at, "fields");
        if expect_array(fields, &fields_at, "fields", f) {
            for (position, field) in fields.as_array().unwrap_or(&[]).iter().enumerate() {
                field_schema(field, &index(&fields_at, position), is_v11, f);
            }
        }
    }
    if let Some(variants) = definition.get("variants") {
        let variants_at = child(at, "variants");
        if expect_array(variants, &variants_at, "variants", f) {
            for (position, variant) in variants.as_array().unwrap_or(&[]).iter().enumerate() {
                variant_schema(variant, &index(&variants_at, position), f);
            }
        }
    }
    if let Some(relationships) = definition.get("relationships") {
        let relationships_at = child(at, "relationships");
        if expect_array(relationships, &relationships_at, "relationships", f) {
            for (position, relationship) in
                relationships.as_array().unwrap_or(&[]).iter().enumerate()
            {
                relationship_schema(relationship, &index(&relationships_at, position), f);
            }
        }
    }
    if let Some(operations) = definition.get("operations") {
        let operations_at = child(at, "operations");
        if expect_array(operations, &operations_at, "operations", f) {
            for (position, operation) in operations.as_array().unwrap_or(&[]).iter().enumerate() {
                operation_schema(operation, &index(&operations_at, position), is_v11, f);
            }
        }
    }
    if let Some(clauses) = definition.get("clauses") {
        let clauses_at = child(at, "clauses");
        if expect_array(clauses, &clauses_at, "clauses", f) {
            for (position, clause) in clauses.as_array().unwrap_or(&[]).iter().enumerate() {
                clause_schema(clause, &index(&clauses_at, position), f);
            }
        }
    }
}

fn has_duplicate_strings(items: &[Json]) -> bool {
    let mut seen: Vec<&str> = Vec::new();
    for item in items {
        if let Some(text) = item.as_str() {
            if seen.contains(&text) {
                return true;
            }
            seen.push(text);
        }
    }
    false
}

const FIELD_MEMBERS: &[&str] = &[
    "identity",
    "name",
    "typeRef",
    "presence",
    "nullable",
    "defaultKind",
    "defaultValue",
    "origin",
    "extensions",
    "multiplicity",
    "unit",
];
const FIELD_REQUIRED: &[&str] = &[
    "identity",
    "name",
    "typeRef",
    "presence",
    "nullable",
    "defaultKind",
    "origin",
];

fn field_schema(field: &Json, at: &str, require_multiplicity: bool, f: &mut Findings) {
    if !expect_object(field, at, "a field", f) {
        return;
    }
    require_members(field, at, FIELD_REQUIRED, f);
    forbid_extra(field, at, FIELD_MEMBERS, f);
    if require_multiplicity && !field.has("multiplicity") {
        f.push(at, "a 1.1.0 field carries an explicit multiplicity");
    }
    expect_shape(
        field.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_shape(
        field.get("typeRef"),
        &child(at, "typeRef"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_string(field.get("name"), &child(at, "name"), 1, "a field name", f);
    expect_enum(
        field.get("presence"),
        &child(at, "presence"),
        PRESENCES,
        "presence",
        f,
    );
    expect_bool(field.get("nullable"), &child(at, "nullable"), "nullable", f);
    expect_enum(
        field.get("defaultKind"),
        &child(at, "defaultKind"),
        DEFAULT_KINDS,
        "defaultKind",
        f,
    );
    let default_kind = field.get("defaultKind").and_then(Json::as_str);
    match default_kind {
        Some("none") => {
            if field.has("defaultValue") {
                f.push(
                    at,
                    "a field whose defaultKind is none carries no defaultValue",
                );
            }
        }
        Some(_) => {
            if !field.has("defaultValue") {
                f.push(
                    at,
                    "a field whose defaultKind is not none carries a defaultValue",
                );
            }
        }
        None => {}
    }
    if let Some(origin) = field.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
    if let Some(extensions) = field.get("extensions") {
        extension_array(extensions, &child(at, "extensions"), f);
    }
    if let Some(multiplicity) = field.get("multiplicity") {
        multiplicity_schema(multiplicity, &child(at, "multiplicity"), f);
    }
    expect_shape(
        field.get("unit"),
        &child(at, "unit"),
        is_unit,
        "a unit is a non-empty run of printable ASCII",
        f,
    );
}

const MULTIPLICITY_MEMBERS: &[&str] = &["lower", "upper", "ordered", "unique"];

fn multiplicity_schema(multiplicity: &Json, at: &str, f: &mut Findings) {
    if !expect_object(multiplicity, at, "a multiplicity", f) {
        return;
    }
    require_members(multiplicity, at, &["lower"], f);
    forbid_extra(multiplicity, at, MULTIPLICITY_MEMBERS, f);
    expect_integer(
        multiplicity.get("lower"),
        &child(at, "lower"),
        0,
        "a lower bound is a non-negative integer",
        f,
    );
    expect_integer(
        multiplicity.get("upper"),
        &child(at, "upper"),
        0,
        "an upper bound is a non-negative integer",
        f,
    );
    expect_bool(
        multiplicity.get("ordered"),
        &child(at, "ordered"),
        "ordered",
        f,
    );
    expect_bool(
        multiplicity.get("unique"),
        &child(at, "unique"),
        "unique",
        f,
    );
}

const VARIANT_MEMBERS: &[&str] = &["identity", "name", "payloadType", "origin"];

fn variant_schema(variant: &Json, at: &str, f: &mut Findings) {
    if !expect_object(variant, at, "a variant", f) {
        return;
    }
    require_members(variant, at, &["identity", "name", "origin"], f);
    forbid_extra(variant, at, VARIANT_MEMBERS, f);
    expect_shape(
        variant.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_string(
        variant.get("name"),
        &child(at, "name"),
        1,
        "a variant name",
        f,
    );
    expect_shape(
        variant.get("payloadType"),
        &child(at, "payloadType"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    if let Some(origin) = variant.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
}

const RELATIONSHIP_MEMBERS: &[&str] = &[
    "identity",
    "verb",
    "category",
    "composite",
    "target",
    "multiplicity",
    "origin",
];

fn relationship_schema(relationship: &Json, at: &str, f: &mut Findings) {
    if !expect_object(relationship, at, "a relationship", f) {
        return;
    }
    require_members(relationship, at, RELATIONSHIP_MEMBERS, f);
    forbid_extra(relationship, at, RELATIONSHIP_MEMBERS, f);
    expect_shape(
        relationship.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_string(relationship.get("verb"), &child(at, "verb"), 1, "a verb", f);
    expect_enum(
        relationship.get("category"),
        &child(at, "category"),
        CATEGORIES,
        "the edge category vocabulary",
        f,
    );
    expect_bool(
        relationship.get("composite"),
        &child(at, "composite"),
        "composite",
        f,
    );
    expect_shape(
        relationship.get("target"),
        &child(at, "target"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    if let Some(multiplicity) = relationship.get("multiplicity") {
        multiplicity_schema(multiplicity, &child(at, "multiplicity"), f);
    }
    if let Some(origin) = relationship.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
}

const OPERATION_MEMBERS: &[&str] = &[
    "identity", "name", "params", "returns", "pre", "post", "origin",
];
const RETURNS_MEMBERS: &[&str] = &["typeRef", "multiplicity", "nullable"];

fn operation_schema(operation: &Json, at: &str, is_v11: bool, f: &mut Findings) {
    if !expect_object(operation, at, "an operation", f) {
        return;
    }
    require_members(
        operation,
        at,
        &["identity", "name", "params", "pre", "post", "origin"],
        f,
    );
    forbid_extra(operation, at, OPERATION_MEMBERS, f);
    expect_shape(
        operation.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_string(
        operation.get("name"),
        &child(at, "name"),
        1,
        "an operation name",
        f,
    );
    if let Some(params) = operation.get("params") {
        let params_at = child(at, "params");
        if expect_array(params, &params_at, "params", f) {
            for (position, param) in params.as_array().unwrap_or(&[]).iter().enumerate() {
                field_schema(param, &index(&params_at, position), is_v11, f);
            }
        }
    }
    for name in ["pre", "post"] {
        if let Some(clause_ids) = operation.get(name) {
            let clause_ids_at = child(at, name);
            if expect_array(clause_ids, &clause_ids_at, name, f) {
                let items = clause_ids.as_array().unwrap_or(&[]);
                for (position, clause_id) in items.iter().enumerate() {
                    expect_string(
                        Some(clause_id),
                        &index(&clause_ids_at, position),
                        1,
                        "a clause id",
                        f,
                    );
                }
                if has_duplicate_strings(items) {
                    f.push(&clause_ids_at, format!("{name} entries are unique"));
                }
            }
        }
    }
    if let Some(returns) = operation.get("returns") {
        let returns_at = child(at, "returns");
        if expect_object(returns, &returns_at, "a return", f) {
            require_members(returns, &returns_at, RETURNS_MEMBERS, f);
            forbid_extra(returns, &returns_at, RETURNS_MEMBERS, f);
            expect_shape(
                returns.get("typeRef"),
                &child(&returns_at, "typeRef"),
                is_semantic_identity,
                "an identity is ix://<owner>/<name>",
                f,
            );
            expect_bool(
                returns.get("nullable"),
                &child(&returns_at, "nullable"),
                "nullable",
                f,
            );
            if let Some(multiplicity) = returns.get("multiplicity") {
                multiplicity_schema(multiplicity, &child(&returns_at, "multiplicity"), f);
            }
        }
    }
    if let Some(origin) = operation.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
}

const CLAUSE_MEMBERS: &[&str] = &[
    "identity",
    "language",
    "clauseId",
    "text",
    "sourceSpan",
    "origin",
];

fn clause_schema(clause: &Json, at: &str, f: &mut Findings) {
    if !expect_object(clause, at, "a clause", f) {
        return;
    }
    require_members(
        clause,
        at,
        &["identity", "language", "clauseId", "text", "origin"],
        f,
    );
    forbid_extra(clause, at, CLAUSE_MEMBERS, f);
    expect_shape(
        clause.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_shape(
        clause.get("language"),
        &child(at, "language"),
        is_clause_language,
        "a clause language is a core language or a namespaced name",
        f,
    );
    expect_string(
        clause.get("clauseId"),
        &child(at, "clauseId"),
        1,
        "a clause id",
        f,
    );
    if let Some(text) = clause.get("text") {
        if text.as_str().is_none() {
            f.push(&child(at, "text"), "clause text is a string");
        }
    }
    if let Some(span) = clause.get("sourceSpan") {
        source_locus_schema(span, &child(at, "sourceSpan"), f);
    }
    if let Some(origin) = clause.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }
}

const OCCURRENCE_MEMBERS: &[&str] = &["identity", "definition", "observedAt", "value"];

fn occurrence_schema(occurrence: &Json, at: &str, f: &mut Findings) {
    if !expect_object(occurrence, at, "an occurrence", f) {
        return;
    }
    require_members(occurrence, at, OCCURRENCE_MEMBERS, f);
    forbid_extra(occurrence, at, OCCURRENCE_MEMBERS, f);
    for name in ["identity", "definition"] {
        expect_shape(
            occurrence.get(name),
            &child(at, name),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
    }
    if let Some(observed) = occurrence.get("observedAt") {
        if observed.as_str().is_none() {
            f.push(&child(at, "observedAt"), "observedAt is a date-time string");
        }
    }
}

const EXTENSION_MEMBERS: &[&str] = &["identity", "version", "required", "capability", "payload"];

fn extension_array(extensions: &Json, at: &str, f: &mut Findings) {
    if !expect_array(extensions, at, "extensions", f) {
        return;
    }
    for (position, extension) in extensions.as_array().unwrap_or(&[]).iter().enumerate() {
        let extension_at = index(at, position);
        if !expect_object(extension, &extension_at, "an extension", f) {
            continue;
        }
        require_members(
            extension,
            &extension_at,
            &["identity", "version", "required", "payload"],
            f,
        );
        forbid_extra(extension, &extension_at, EXTENSION_MEMBERS, f);
        expect_shape(
            extension.get("identity"),
            &child(&extension_at, "identity"),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
        expect_shape(
            extension.get("version"),
            &child(&extension_at, "version"),
            is_semver,
            "a version is SemVer",
            f,
        );
        expect_bool(
            extension.get("required"),
            &child(&extension_at, "required"),
            "required",
            f,
        );
        expect_string(
            extension.get("capability"),
            &child(&extension_at, "capability"),
            1,
            "a capability",
            f,
        );
    }
}

fn origin_schema(origin: &Json, at: &str, f: &mut Findings) {
    if !expect_object(origin, at, "an origin", f) {
        return;
    }
    let has_source = origin.has("source");
    let has_generated = origin.has("generated");
    if has_source == has_generated {
        f.push(at, "an origin carries exactly one of source and generated");
        return;
    }
    forbid_extra(origin, at, &["source", "generated"], f);
    if has_source {
        if let Some(source) = origin.get("source") {
            source_locus_schema(source, &child(at, "source"), f);
        }
        return;
    }
    let generated = match origin.get("generated") {
        Some(generated) => generated,
        None => return,
    };
    let generated_at = child(at, "generated");
    if !expect_object(generated, &generated_at, "a generated origin", f) {
        return;
    }
    let members = &["generatorIdentity", "generatorVersion", "inputIdentities"];
    require_members(generated, &generated_at, members, f);
    forbid_extra(generated, &generated_at, members, f);
    expect_shape(
        generated.get("generatorIdentity"),
        &child(&generated_at, "generatorIdentity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_shape(
        generated.get("generatorVersion"),
        &child(&generated_at, "generatorVersion"),
        is_semver,
        "a version is SemVer",
        f,
    );
    if let Some(inputs) = generated.get("inputIdentities") {
        let inputs_at = child(&generated_at, "inputIdentities");
        if expect_array(inputs, &inputs_at, "inputIdentities", f) {
            let items = inputs.as_array().unwrap_or(&[]);
            if items.is_empty() {
                f.push(&inputs_at, "a generated origin names at least one input");
            }
            for (position, input) in items.iter().enumerate() {
                expect_shape(
                    Some(input),
                    &index(&inputs_at, position),
                    is_semantic_identity,
                    "an identity is ix://<owner>/<name>",
                    f,
                );
            }
        }
    }
}

const LOCUS_MEMBERS: &[&str] = &[
    "sourceIdentity",
    "path",
    "startLine",
    "startColumn",
    "endLine",
    "endColumn",
];

fn source_locus_schema(locus: &Json, at: &str, f: &mut Findings) {
    if !expect_object(locus, at, "a source locus", f) {
        return;
    }
    require_members(
        locus,
        at,
        &["sourceIdentity", "path", "startLine", "startColumn"],
        f,
    );
    forbid_extra(locus, at, LOCUS_MEMBERS, f);
    expect_shape(
        locus.get("sourceIdentity"),
        &child(at, "sourceIdentity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    if let Some(path) = locus.get("path") {
        let path_at = child(at, "path");
        match path.as_str() {
            Some(text) if is_relative_locus_path(text) => {}
            _ => f.push(
                &path_at,
                "a source path is relative, carries no drive letter, no backslash and no parent segment",
            ),
        }
    }
    for name in ["startLine", "startColumn", "endLine", "endColumn"] {
        expect_integer(
            locus.get(name),
            &child(at, name),
            1,
            "a source locus counts lines and columns from one",
            f,
        );
    }
}

fn is_relative_locus_path(path: &str) -> bool {
    if path.is_empty() || path.contains('\u{0}') || path.contains('\\') || path.starts_with('/') {
        return false;
    }
    let bytes = path.as_bytes();
    if bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' {
        return false;
    }
    !path.split('/').any(|segment| segment == "..")
}

const CONSTRAINT_MEMBERS: &[&str] = &[
    "identity",
    "keyword",
    "operands",
    "appliesTo",
    "diagnosticCode",
    "origin",
];

fn constraint_schema(constraint: &Json, at: &str, f: &mut Findings) {
    if !expect_object(constraint, at, "a constraint", f) {
        return;
    }
    require_members(constraint, at, CONSTRAINT_MEMBERS, f);
    forbid_extra(constraint, at, CONSTRAINT_MEMBERS, f);
    for name in ["identity", "appliesTo"] {
        expect_shape(
            constraint.get(name),
            &child(at, name),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
    }
    expect_string(
        constraint.get("diagnosticCode"),
        &child(at, "diagnosticCode"),
        1,
        "a diagnostic code",
        f,
    );
    if let Some(origin) = constraint.get("origin") {
        origin_schema(origin, &child(at, "origin"), f);
    }

    // The published `constraint` is a `oneOf` discriminated by `keyword`: a
    // keyword outside the closed set matches no branch, so the failing location
    // is the constraint object itself rather than any member of it.
    let keyword = match constraint.get("keyword").and_then(Json::as_str) {
        Some(keyword) => keyword,
        None => {
            f.push(at, "a constraint keyword is a member of the closed set");
            return;
        }
    };
    let operands = constraint.get("operands");
    let operands_at = child(at, "operands");
    let operands = match operands {
        Some(operands) if operands.as_object().is_some() => operands,
        Some(_) => {
            f.push(&operands_at, "constraint operands are an object");
            return;
        }
        None => return,
    };
    match keyword {
        "min" | "max" | "exclusiveMin" | "exclusiveMax" => {
            forbid_extra(operands, &operands_at, &["value"], f);
            match operands.get("value") {
                None => f.push(&operands_at, "this keyword takes a value operand"),
                Some(Json::Number(_)) => {}
                Some(Json::Str(text)) if !text.is_empty() => {}
                Some(_) => f.push(
                    &child(&operands_at, "value"),
                    "this keyword takes a number or a non-empty string operand",
                ),
            }
        }
        "minLength" | "maxLength" => {
            forbid_extra(operands, &operands_at, &["value"], f);
            match operands.get("value") {
                None => f.push(&operands_at, "this keyword takes a value operand"),
                Some(value) => expect_integer(
                    Some(value),
                    &child(&operands_at, "value"),
                    0,
                    "a length operand is a non-negative integer",
                    f,
                ),
            }
        }
        "pattern" => {
            forbid_extra(operands, &operands_at, &["regex", "dialect"], f);
            require_members(operands, &operands_at, &["regex", "dialect"], f);
            expect_string(
                operands.get("regex"),
                &child(&operands_at, "regex"),
                1,
                "a pattern operand",
                f,
            );
            expect_enum(
                operands.get("dialect"),
                &child(&operands_at, "dialect"),
                &["ecma-262"],
                "the pattern dialect",
                f,
            );
        }
        "enumValues" => {
            forbid_extra(operands, &operands_at, &["values"], f);
            require_members(operands, &operands_at, &["values"], f);
            if let Some(values) = operands.get("values") {
                let values_at = child(&operands_at, "values");
                if expect_array(values, &values_at, "enum values", f) {
                    let items = values.as_array().unwrap_or(&[]);
                    if items.is_empty() {
                        f.push(&values_at, "enumValues carries at least one value");
                    }
                    for (position, value) in items.iter().enumerate() {
                        if !matches!(value, Json::Str(_) | Json::Number(_) | Json::Bool(_)) {
                            f.push(
                                &index(&values_at, position),
                                "an enum value is a string, a number or a boolean",
                            );
                        }
                    }
                }
            }
        }
        "nonEmpty" | "unique" => {
            forbid_extra(operands, &operands_at, &[], f);
        }
        "format" => {
            forbid_extra(operands, &operands_at, &["name"], f);
            require_members(operands, &operands_at, &["name"], f);
            expect_shape(
                operands.get("name"),
                &child(&operands_at, "name"),
                is_namespaced_name,
                "a format name is <ns>:<name>",
                f,
            );
        }
        other => {
            f.push(
                at,
                format!("the constraint keyword vocabulary is closed and {other} is not a member"),
            );
        }
    }
}

// ---------------------------------------------------------------------------
// package-manifest.schema.json
// ---------------------------------------------------------------------------

const MANIFEST_MEMBERS: &[&str] = &[
    "contractVersion",
    "package",
    "schemaDialect",
    "sourceRoots",
    "exports",
    "imports",
    "profiles",
    "targets",
    "mappings",
    "extensions",
];

fn package_manifest(manifest: &Json, at: &str, f: &mut Findings) {
    if !expect_object(manifest, at, "a package manifest", f) {
        return;
    }
    require_members(manifest, at, MANIFEST_MEMBERS, f);
    forbid_extra(manifest, at, MANIFEST_MEMBERS, f);
    expect_enum(
        manifest.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0"],
        "a manifest contractVersion",
        f,
    );
    expect_enum(
        manifest.get("schemaDialect"),
        &child(at, "schemaDialect"),
        &["https://json-schema.org/draft/2020-12/schema"],
        "a manifest schemaDialect",
        f,
    );
    if let Some(package) = manifest.get("package") {
        let package_at = child(at, "package");
        if expect_object(package, &package_at, "a manifest package", f) {
            require_members(package, &package_at, &["identity", "version"], f);
            forbid_extra(package, &package_at, &["identity", "version"], f);
            expect_shape(
                package.get("identity"),
                &child(&package_at, "identity"),
                is_package_identity,
                "a package identity is <owner>/<name>",
                f,
            );
            expect_shape(
                package.get("version"),
                &child(&package_at, "version"),
                is_semver,
                "a version is SemVer",
                f,
            );
        }
    }
    if let Some(exports) = manifest.get("exports") {
        let exports_at = child(at, "exports");
        if expect_array(exports, &exports_at, "exports", f) {
            for (position, export) in exports.as_array().unwrap_or(&[]).iter().enumerate() {
                let export_at = index(&exports_at, position);
                if !expect_object(export, &export_at, "an export", f) {
                    continue;
                }
                let members = &["name", "typeIdentity", "visibility"];
                require_members(export, &export_at, members, f);
                forbid_extra(export, &export_at, members, f);
                expect_string(
                    export.get("name"),
                    &child(&export_at, "name"),
                    1,
                    "a name",
                    f,
                );
                expect_shape(
                    export.get("typeIdentity"),
                    &child(&export_at, "typeIdentity"),
                    is_semantic_identity,
                    "an identity is ix://<owner>/<name>",
                    f,
                );
                expect_enum(
                    export.get("visibility"),
                    &child(&export_at, "visibility"),
                    &["public", "private"],
                    "visibility",
                    f,
                );
            }
        }
    }
    if let Some(imports) = manifest.get("imports") {
        let imports_at = child(at, "imports");
        if expect_array(imports, &imports_at, "imports", f) {
            for (position, import) in imports.as_array().unwrap_or(&[]).iter().enumerate() {
                let import_at = index(&imports_at, position);
                if !expect_object(import, &import_at, "an import", f) {
                    continue;
                }
                let members = &[
                    "packageIdentity",
                    "versionConstraint",
                    "exports",
                    "capabilities",
                ];
                require_members(import, &import_at, members, f);
                forbid_extra(import, &import_at, members, f);
                expect_shape(
                    import.get("packageIdentity"),
                    &child(&import_at, "packageIdentity"),
                    is_package_identity,
                    "a package identity is <owner>/<name>",
                    f,
                );
                expect_string(
                    import.get("versionConstraint"),
                    &child(&import_at, "versionConstraint"),
                    1,
                    "a version constraint",
                    f,
                );
            }
        }
    }
    if let Some(profiles) = manifest.get("profiles") {
        let profiles_at = child(at, "profiles");
        if expect_array(profiles, &profiles_at, "profiles", f) {
            for (position, profile) in profiles.as_array().unwrap_or(&[]).iter().enumerate() {
                let profile_at = index(&profiles_at, position);
                if !expect_object(profile, &profile_at, "a named profile", f) {
                    continue;
                }
                let members = &[
                    "name",
                    "version",
                    "exports",
                    "targets",
                    "mappings",
                    "options",
                    "compatibilityPosture",
                ];
                require_members(profile, &profile_at, members, f);
                forbid_extra(profile, &profile_at, members, f);
                expect_enum(
                    profile.get("compatibilityPosture"),
                    &child(&profile_at, "compatibilityPosture"),
                    &["strict", "additive", "declared-lossy"],
                    "a compatibility posture",
                    f,
                );
                expect_shape(
                    profile.get("version"),
                    &child(&profile_at, "version"),
                    is_semver,
                    "a version is SemVer",
                    f,
                );
                manifest_targets(profile.get("targets"), &child(&profile_at, "targets"), f);
            }
        }
    }
    manifest_targets(manifest.get("targets"), &child(at, "targets"), f);
    if let Some(extensions) = manifest.get("extensions") {
        extension_array(extensions, &child(at, "extensions"), f);
    }
}

fn manifest_targets(targets: Option<&Json>, at: &str, f: &mut Findings) {
    let targets = match targets {
        Some(targets) => targets,
        None => return,
    };
    if !expect_array(targets, at, "targets", f) {
        return;
    }
    for (position, target) in targets.as_array().unwrap_or(&[]).iter().enumerate() {
        match target.as_str() {
            Some(text) if TARGETS.contains(&text) || REPRESENTATION_FORMATS.contains(&text) => {}
            _ => f.push(
                &index(at, position),
                "a manifest target is a generated target or a representation format",
            ),
        }
    }
}

// ---------------------------------------------------------------------------
// package-lock.schema.json
// ---------------------------------------------------------------------------

const LOCK_MEMBERS: &[&str] = &[
    "contractVersion",
    "rootPackage",
    "fingerprint",
    "canonicalization",
    "packages",
];

fn package_lock(lock: &Json, at: &str, f: &mut Findings) {
    if !expect_object(lock, at, "a package lock", f) {
        return;
    }
    require_members(lock, at, LOCK_MEMBERS, f);
    forbid_extra(lock, at, LOCK_MEMBERS, f);
    expect_enum(
        lock.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0"],
        "a lock contractVersion",
        f,
    );
    expect_shape(
        lock.get("rootPackage"),
        &child(at, "rootPackage"),
        is_package_identity,
        "a package identity is <owner>/<name>",
        f,
    );
    expect_shape(
        lock.get("fingerprint"),
        &child(at, "fingerprint"),
        is_sha256,
        "a digest is sha256:<64 lower-case hex digits>",
        f,
    );
    if let Some(canonicalization) = lock.get("canonicalization") {
        let canonicalization_at = child(at, "canonicalization");
        if expect_object(
            canonicalization,
            &canonicalization_at,
            "a canonicalization",
            f,
        ) {
            let members = &["algorithm", "digest", "included", "excluded"];
            require_members(canonicalization, &canonicalization_at, members, f);
            forbid_extra(canonicalization, &canonicalization_at, members, f);
            expect_enum(
                canonicalization.get("algorithm"),
                &child(&canonicalization_at, "algorithm"),
                &["RFC8785-JCS-with-identity-sorted-sets-v1"],
                "the canonicalization algorithm",
                f,
            );
            expect_enum(
                canonicalization.get("digest"),
                &child(&canonicalization_at, "digest"),
                &["sha256"],
                "the canonicalization digest",
                f,
            );
        }
    }
    if let Some(packages) = lock.get("packages") {
        let packages_at = child(at, "packages");
        if expect_array(packages, &packages_at, "packages", f) {
            let items = packages.as_array().unwrap_or(&[]);
            if items.is_empty() {
                f.push(&packages_at, "a lock resolves at least one package");
            }
            for (position, package) in items.iter().enumerate() {
                let package_at = index(&packages_at, position);
                if !expect_object(package, &package_at, "a resolved package", f) {
                    continue;
                }
                let members = &[
                    "identity",
                    "version",
                    "contentDigest",
                    "sourceIdentity",
                    "dependencies",
                ];
                require_members(package, &package_at, members, f);
                forbid_extra(package, &package_at, members, f);
                expect_shape(
                    package.get("identity"),
                    &child(&package_at, "identity"),
                    is_package_identity,
                    "a package identity is <owner>/<name>",
                    f,
                );
                expect_shape(
                    package.get("version"),
                    &child(&package_at, "version"),
                    is_semver,
                    "a version is SemVer",
                    f,
                );
                expect_shape(
                    package.get("contentDigest"),
                    &child(&package_at, "contentDigest"),
                    is_sha256,
                    "a digest is sha256:<64 lower-case hex digits>",
                    f,
                );
                expect_shape(
                    package.get("sourceIdentity"),
                    &child(&package_at, "sourceIdentity"),
                    is_semantic_identity,
                    "an identity is ix://<owner>/<name>",
                    f,
                );
                if let Some(dependencies) = package.get("dependencies") {
                    let dependencies_at = child(&package_at, "dependencies");
                    if expect_array(dependencies, &dependencies_at, "dependencies", f) {
                        for (edge, dependency) in
                            dependencies.as_array().unwrap_or(&[]).iter().enumerate()
                        {
                            expect_shape(
                                Some(dependency),
                                &index(&dependencies_at, edge),
                                is_package_identity,
                                "a package identity is <owner>/<name>",
                                f,
                            );
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// profile.schema.json
// ---------------------------------------------------------------------------

const PROFILE_MEMBERS: &[&str] = &[
    "contractVersion",
    "identity",
    "version",
    "authority",
    "editDirection",
    "roundTrip",
    "unknownPolicy",
    "allowedOmissions",
    "enrichment",
    "materializationLifetime",
    "options",
    "extensions",
];

fn profile_schema(profile: &Json, at: &str, f: &mut Findings) {
    if !expect_object(profile, at, "a profile", f) {
        return;
    }
    require_members(
        profile,
        at,
        &[
            "contractVersion",
            "identity",
            "version",
            "authority",
            "editDirection",
            "roundTrip",
            "unknownPolicy",
            "allowedOmissions",
            "enrichment",
            "materializationLifetime",
        ],
        f,
    );
    forbid_extra(profile, at, PROFILE_MEMBERS, f);
    expect_enum(
        profile.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0"],
        "a profile contractVersion",
        f,
    );
    expect_shape(
        profile.get("identity"),
        &child(at, "identity"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_shape(
        profile.get("version"),
        &child(at, "version"),
        is_semver,
        "a version is SemVer",
        f,
    );
    expect_enum(
        profile.get("authority"),
        &child(at, "authority"),
        &[
            "semantic-source",
            "authored-representation",
            "runtime-store",
            "derived-projection",
            "compatibility-bridge",
        ],
        "a profile authority",
        f,
    );
    expect_enum(
        profile.get("editDirection"),
        &child(at, "editDirection"),
        &["read-only", "write-only", "bidirectional"],
        "an edit direction",
        f,
    );
    expect_enum(
        profile.get("roundTrip"),
        &child(at, "roundTrip"),
        PRESERVATIONS,
        "a round trip",
        f,
    );
    expect_enum(
        profile.get("unknownPolicy"),
        &child(at, "unknownPolicy"),
        UNKNOWN_POLICIES,
        "the unknown policy vocabulary",
        f,
    );
    expect_enum(
        profile.get("materializationLifetime"),
        &child(at, "materializationLifetime"),
        &["request", "run", "session", "durable"],
        "a materialization lifetime",
        f,
    );
    expect_bool(
        profile.get("enrichment"),
        &child(at, "enrichment"),
        "enrichment",
        f,
    );
    identity_array(
        profile.get("allowedOmissions"),
        &child(at, "allowedOmissions"),
        f,
    );
    if let Some(extensions) = profile.get("extensions") {
        extension_array(extensions, &child(at, "extensions"), f);
    }
}

fn identity_array(values: Option<&Json>, at: &str, f: &mut Findings) {
    let values = match values {
        Some(values) => values,
        None => return,
    };
    if !expect_array(values, at, "an identity list", f) {
        return;
    }
    for (position, value) in values.as_array().unwrap_or(&[]).iter().enumerate() {
        expect_shape(
            Some(value),
            &index(at, position),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
    }
}

// ---------------------------------------------------------------------------
// mapping.schema.json
// ---------------------------------------------------------------------------

const MAPPING_MEMBERS: &[&str] = &[
    "contractVersion",
    "identity",
    "version",
    "sourceType",
    "targetType",
    "representation",
    "correspondences",
    "transformation",
];

fn mapping_schema(mapping: &Json, at: &str, f: &mut Findings) {
    if !expect_object(mapping, at, "a mapping", f) {
        return;
    }
    require_members(mapping, at, MAPPING_MEMBERS, f);
    forbid_extra(mapping, at, MAPPING_MEMBERS, f);
    expect_enum(
        mapping.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0"],
        "a mapping contractVersion",
        f,
    );
    for name in ["identity", "sourceType", "targetType"] {
        expect_shape(
            mapping.get(name),
            &child(at, name),
            is_semantic_identity,
            "an identity is ix://<owner>/<name>",
            f,
        );
    }
    expect_shape(
        mapping.get("version"),
        &child(at, "version"),
        is_semver,
        "a version is SemVer",
        f,
    );
    expect_string(
        mapping.get("representation"),
        &child(at, "representation"),
        1,
        "a representation",
        f,
    );
    if let Some(correspondences) = mapping.get("correspondences") {
        let correspondences_at = child(at, "correspondences");
        if expect_array(correspondences, &correspondences_at, "correspondences", f) {
            let items = correspondences.as_array().unwrap_or(&[]);
            if items.is_empty() {
                f.push(
                    &correspondences_at,
                    "a mapping carries at least one correspondence",
                );
            }
            for (position, correspondence) in items.iter().enumerate() {
                let correspondence_at = index(&correspondences_at, position);
                if !expect_object(correspondence, &correspondence_at, "a correspondence", f) {
                    continue;
                }
                let members = &["sourceIdentity", "targetLocus"];
                require_members(correspondence, &correspondence_at, members, f);
                forbid_extra(correspondence, &correspondence_at, members, f);
                expect_shape(
                    correspondence.get("sourceIdentity"),
                    &child(&correspondence_at, "sourceIdentity"),
                    is_semantic_identity,
                    "an identity is ix://<owner>/<name>",
                    f,
                );
                expect_string(
                    correspondence.get("targetLocus"),
                    &child(&correspondence_at, "targetLocus"),
                    1,
                    "a target locus",
                    f,
                );
            }
        }
    }
    if let Some(transformation) = mapping.get("transformation") {
        transformation_schema(transformation, &child(at, "transformation"), f);
    }
}

const TRANSFORMATION_MEMBERS: &[&str] = &[
    "kind",
    "purity",
    "deterministic",
    "externalReads",
    "externalWrites",
    "failureStates",
    "retryIdempotent",
    "preservation",
    "omittedIdentities",
    "getPutLaws",
    "conflictPolicy",
    "groupingKeys",
    "window",
    "ordering",
    "lateDataPolicy",
    "aggregateSemantics",
    "provenanceSources",
    "lifetime",
    "encoding",
    "decodePolicy",
    "selectedIdentities",
    "sourceLoci",
    "presentationMediaType",
];

fn transformation_schema(transformation: &Json, at: &str, f: &mut Findings) {
    if !expect_object(transformation, at, "a transformation", f) {
        return;
    }
    let required = &[
        "kind",
        "purity",
        "deterministic",
        "externalReads",
        "externalWrites",
        "failureStates",
        "retryIdempotent",
    ];
    require_members(transformation, at, required, f);
    forbid_extra(transformation, at, TRANSFORMATION_MEMBERS, f);
    expect_enum(
        transformation.get("kind"),
        &child(at, "kind"),
        &[
            "codec",
            "lens",
            "projection",
            "extraction",
            "rendering",
            "aggregation",
            "enrichment",
            "materialization",
        ],
        "a transformation kind",
        f,
    );
    expect_enum(
        transformation.get("purity"),
        &child(at, "purity"),
        &["pure", "effectful"],
        "a transformation purity",
        f,
    );
    expect_bool(
        transformation.get("deterministic"),
        &child(at, "deterministic"),
        "deterministic",
        f,
    );
    expect_bool(
        transformation.get("retryIdempotent"),
        &child(at, "retryIdempotent"),
        "retryIdempotent",
        f,
    );
    if let Some(states) = transformation.get("failureStates") {
        let states_at = child(at, "failureStates");
        if expect_array(states, &states_at, "failureStates", f) {
            for (position, state) in states.as_array().unwrap_or(&[]).iter().enumerate() {
                expect_enum(
                    Some(state),
                    &index(&states_at, position),
                    RESULT_STATES,
                    "a result state",
                    f,
                );
            }
        }
    }
    for name in ["externalReads", "externalWrites", "omittedIdentities"] {
        identity_array(transformation.get(name), &child(at, name), f);
    }
    expect_enum(
        transformation.get("preservation"),
        &child(at, "preservation"),
        PRESERVATIONS,
        "a preservation",
        f,
    );
    let kind = transformation
        .get("kind")
        .and_then(Json::as_str)
        .unwrap_or("");
    let obliged: &[&str] = match kind {
        "codec" => &["encoding", "decodePolicy"],
        "lens" => &["getPutLaws", "conflictPolicy"],
        "projection" => &["selectedIdentities", "preservation"],
        "extraction" => &["sourceLoci", "preservation"],
        "rendering" => &["presentationMediaType", "preservation"],
        "aggregation" => &[
            "groupingKeys",
            "window",
            "ordering",
            "lateDataPolicy",
            "aggregateSemantics",
        ],
        "enrichment" => &["provenanceSources"],
        "materialization" => &["lifetime"],
        _ => &[],
    };
    require_members(transformation, at, obliged, f);
    if transformation.get("purity").and_then(Json::as_str) == Some("effectful") {
        require_members(transformation, at, &["provenanceSources"], f);
    }
    if transformation.get("preservation").and_then(Json::as_str) == Some("declared-lossy") {
        require_members(transformation, at, &["omittedIdentities"], f);
    }
}

// ---------------------------------------------------------------------------
// consumer-policy.schema.json
// ---------------------------------------------------------------------------

const POLICY_MEMBERS: &[&str] = &[
    "contractVersion",
    "consumer",
    "mode",
    "exports",
    "unknownModules",
    "unknownExtensions",
    "identityPlanes",
];

fn consumer_policy(policy: &Json, at: &str, f: &mut Findings) {
    if !expect_object(policy, at, "a consumer policy", f) {
        return;
    }
    require_members(policy, at, POLICY_MEMBERS, f);
    forbid_extra(policy, at, POLICY_MEMBERS, f);
    expect_enum(
        policy.get("contractVersion"),
        &child(at, "contractVersion"),
        &["1.0.0"],
        "a consumer policy contractVersion",
        f,
    );
    expect_shape(
        policy.get("consumer"),
        &child(at, "consumer"),
        is_semantic_identity,
        "an identity is ix://<owner>/<name>",
        f,
    );
    expect_enum(
        policy.get("mode"),
        &child(at, "mode"),
        &["dynamic", "generated"],
        "a consumer mode",
        f,
    );
    for name in ["unknownModules", "unknownExtensions"] {
        expect_enum(
            policy.get(name),
            &child(at, name),
            UNKNOWN_POLICIES,
            "the unknown policy vocabulary",
            f,
        );
    }
    identity_array(policy.get("exports"), &child(at, "exports"), f);
    if let Some(planes) = policy.get("identityPlanes") {
        let planes_at = child(at, "identityPlanes");
        if expect_array(planes, &planes_at, "identityPlanes", f) {
            let items = planes.as_array().unwrap_or(&[]);
            if items.len() != 6 || has_duplicate_strings(items) {
                f.push(&planes_at, "the six identity planes are named exactly once");
            }
            for (position, plane) in items.iter().enumerate() {
                expect_enum(
                    Some(plane),
                    &index(&planes_at, position),
                    &[
                        "package",
                        "type",
                        "field",
                        "profile",
                        "mapping",
                        "fingerprint",
                    ],
                    "an identity plane",
                    f,
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::is_clause_language;

    #[test]
    fn tc_214_accepts_the_core_clause_languages_and_a_namespaced_one() {
        for language in ["quire", "ocl", "sysml", "fretish", "acme:tla"] {
            assert!(is_clause_language(language), "{language}");
        }
    }

    #[test]
    fn tc_214_refuses_a_bare_unknown_an_uppercase_and_an_empty_name() {
        for language in ["tla", "OCL", "acme:"] {
            assert!(!is_clause_language(language), "{language}");
        }
    }
}
