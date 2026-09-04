//! The cross-field rules, and the package-context rules.
//!
//! Every code emitted here has a `conformance/diagnostic-codes.json` row, and
//! `crates/semantic-ir/RULES.md` cites the clause each rule was derived from.

use crate::diag::{child, index, locus_for, owner_for, Located, Severity};
use crate::json::Json;
use crate::regex262;

/// The declared finite depth bound on an acyclic expansion.
///
/// `contracts-v1.md` obliges "declared finite limits"; the corpus manifest
/// declares this one as `depthLimit: 256`.
pub const DEPTH_LIMIT: usize = 256;

macro_rules! codes {
    ($($name:ident => $code:literal),* $(,)?) => {
        $(
            #[doc = concat!("`", $code, "`.")]
            pub const $name: &str = $code;
        )*
    };
}

codes! {
    PRESENCE_MULTIPLICITY_MISMATCH => "agent-ix.semantic-ir.PRESENCE_MULTIPLICITY_MISMATCH",
    INVALID_MULTIPLICITY => "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
    FLAGS_ON_NON_COLLECTION => "agent-ix.semantic-ir.FLAGS_ON_NON_COLLECTION",
    UNIT_ON_NON_SCALAR => "agent-ix.semantic-ir.UNIT_ON_NON_SCALAR",
    UNRESOLVED_TYPE_REF => "agent-ix.semantic-ir.UNRESOLVED_TYPE_REF",
    UNRESOLVED_ELEMENT_TYPE => "agent-ix.semantic-ir.UNRESOLVED_ELEMENT_TYPE",
    UNRESOLVED_VARIANT_PAYLOAD => "agent-ix.semantic-ir.UNRESOLVED_VARIANT_PAYLOAD",
    UNRESOLVED_OCCURRENCE_DEFINITION => "agent-ix.semantic-ir.UNRESOLVED_OCCURRENCE_DEFINITION",
    ALIAS_CYCLE => "agent-ix.semantic-ir.ALIAS_CYCLE",
    DEPTH_LIMIT_EXCEEDED => "agent-ix.semantic-ir.DEPTH_LIMIT_EXCEEDED",
    DUPLICATE_IDENTITY => "agent-ix.semantic-ir.DUPLICATE_IDENTITY",
    DUPLICATE_FIELD_NAME => "agent-ix.semantic-ir.DUPLICATE_FIELD_NAME",
    DUPLICATE_PARAM => "agent-ix.semantic-ir.DUPLICATE_PARAM",
    DUPLICATE_CLAUSE_ID => "agent-ix.semantic-ir.DUPLICATE_CLAUSE_ID",
    DANGLING_CLAUSE_REF => "agent-ix.semantic-ir.DANGLING_CLAUSE_REF",
    MISSING_SOURCE_SPAN => "agent-ix.semantic-ir.MISSING_SOURCE_SPAN",
    CONSTRAINT_NOT_APPLICABLE => "agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE",
    INVALID_OPERAND => "agent-ix.semantic-ir.INVALID_OPERAND",
    INVALID_PATTERN => "agent-ix.semantic-ir.INVALID_PATTERN",
    UNRESOLVED_RELATIONSHIP_TARGET => "agent-ix.semantic-ir.UNRESOLVED_RELATIONSHIP_TARGET",
    COMPOSITE_CYCLE => "agent-ix.semantic-ir.COMPOSITE_CYCLE",
    V1_1_NODE_IN_V1_0 => "agent-ix.semantic-ir.V1_1_NODE_IN_V1_0",
    UNRESOLVED_IMPORT => "agent-ix.semantic-ir.UNRESOLVED_IMPORT",
    PACKAGE_CYCLE => "agent-ix.semantic-ir.PACKAGE_CYCLE",
    STALE_LOCK => "agent-ix.semantic-ir.STALE_LOCK",
    UNKNOWN_MAPPING_TARGET => "agent-ix.semantic-ir.UNKNOWN_MAPPING_TARGET",
    UNDECLARED_LOSS => "agent-ix.semantic-ir.UNDECLARED_LOSS",
    UNKNOWN_REQUIRED_EXTENSION => "agent-ix.semantic-ir.UNKNOWN_REQUIRED_EXTENSION",
}

/// The reading of the document the cross-field rules and the classifier share.
pub struct Document<'a> {
    /// The whole input bundle.
    pub bundle: &'a Json,
    /// The IR document.
    pub ir: &'a Json,
    /// The type definitions, in document order.
    pub types: &'a [Json],
    /// Whether the document declares contract 1.1.0.
    pub is_v11: bool,
}

impl<'a> Document<'a> {
    /// Reads a bundle, when it carries an IR document with a type array.
    pub fn read(bundle: &'a Json) -> Option<Document<'a>> {
        let ir = bundle.get("ir")?;
        let types = ir.get("types").and_then(Json::as_array).unwrap_or(&[]);
        Some(Document {
            bundle,
            ir,
            types,
            is_v11: ir.get("contractVersion").and_then(Json::as_str) == Some("1.1.0"),
        })
    }

    /// The type definition an identity names.
    pub fn type_of(&self, identity: &str) -> Option<&'a Json> {
        self.types
            .iter()
            .find(|definition| definition.get("identity").and_then(Json::as_str) == Some(identity))
    }

    /// The type an identity names, resolved through the alias chain.
    ///
    /// Returns `None` for a chain that does not resolve, closes on itself, or
    /// runs past the declared depth bound; each of those is reported under its
    /// own code by the rule that owns it, not by this resolver.
    pub fn resolve(&self, identity: &str) -> Option<&'a Json> {
        let mut current = self.type_of(identity)?;
        let mut seen: Vec<&str> = vec![identity];
        for _ in 0..=DEPTH_LIMIT {
            if current.get("kind").and_then(Json::as_str) != Some("alias") {
                return Some(current);
            }
            let target = current.get("target").and_then(Json::as_str)?;
            if seen.contains(&target) {
                return None;
            }
            seen.push(target);
            current = self.type_of(target)?;
        }
        None
    }

    /// Every identity the document declares, in document order.
    pub fn declared_identities(&self) -> Vec<String> {
        let mut out = Vec::new();
        for (pointer, _node, identity) in self.identity_declarations() {
            let _ = pointer;
            out.push(identity);
        }
        out
    }

    /// Every identity declaration, as `(pointer to the identity member, node,
    /// identity)`, in document order.
    ///
    /// Derived from `spec/functional/FR-036`: "document-wide identity
    /// uniqueness across types, fields, variants, constraints, relationships,
    /// operations, clauses, and occurrences".
    fn identity_declarations(&self) -> Vec<(String, &'a Json, String)> {
        let mut out: Vec<(String, &'a Json, String)> = Vec::new();
        let mut push = |pointer: String, node: &'a Json| {
            if let Some(identity) = node.get("identity").and_then(Json::as_str) {
                out.push((child(&pointer, "identity"), node, identity.to_string()));
            }
        };
        for (position, definition) in self.types.iter().enumerate() {
            let type_at = index("/ir/types", position);
            push(type_at.clone(), definition);
            for (group, at) in [
                ("constraints", "constraints"),
                ("fields", "fields"),
                ("variants", "variants"),
                ("relationships", "relationships"),
            ] {
                let _ = at;
                if let Some(items) = definition.get(group).and_then(Json::as_array) {
                    let group_at = child(&type_at, group);
                    for (member, item) in items.iter().enumerate() {
                        push(index(&group_at, member), item);
                    }
                }
            }
            if let Some(operations) = definition.get("operations").and_then(Json::as_array) {
                let operations_at = child(&type_at, "operations");
                for (member, operation) in operations.iter().enumerate() {
                    let operation_at = index(&operations_at, member);
                    push(operation_at.clone(), operation);
                    if let Some(params) = operation.get("params").and_then(Json::as_array) {
                        let params_at = child(&operation_at, "params");
                        for (slot, param) in params.iter().enumerate() {
                            push(index(&params_at, slot), param);
                        }
                    }
                }
            }
            if let Some(clauses) = definition.get("clauses").and_then(Json::as_array) {
                let clauses_at = child(&type_at, "clauses");
                for (member, clause) in clauses.iter().enumerate() {
                    push(index(&clauses_at, member), clause);
                }
            }
        }
        if let Some(occurrences) = self.ir.get("occurrences").and_then(Json::as_array) {
            for (position, occurrence) in occurrences.iter().enumerate() {
                push(index("/ir/occurrences", position), occurrence);
            }
        }
        out
    }
}

struct Sink<'a> {
    bundle: &'a Json,
    out: Vec<Located>,
}

impl<'a> Sink<'a> {
    fn emit(&mut self, pointer: String, code: &'static str, message: impl Into<String>) {
        self.out.push(Located {
            owner: owner_for(self.bundle, &pointer),
            locus: locus_for(self.bundle, &pointer),
            code,
            severity: Severity::Error,
            message: message.into(),
            blocking: true,
            pointer,
        });
    }
}

/// Decides every cross-field and package-context rule over one input bundle.
pub fn decide(bundle: &Json) -> Vec<Located> {
    let mut sink = Sink {
        bundle,
        out: Vec::new(),
    };
    let document = match Document::read(bundle) {
        Some(document) => document,
        None => return sink.out,
    };
    duplicate_identities(&document, &mut sink);
    per_type(&document, &mut sink);
    occurrences(&document, &mut sink);
    composite_graph(&document, &mut sink);
    if !document.is_v11 {
        v1_0_purity(&document, &mut sink);
    }
    package_context(&document, &mut sink);
    sink.out
}

fn duplicate_identities(document: &Document<'_>, sink: &mut Sink<'_>) {
    let mut seen: Vec<String> = Vec::new();
    for (pointer, _node, identity) in document.identity_declarations() {
        if seen.contains(&identity) {
            sink.emit(
                pointer,
                DUPLICATE_IDENTITY,
                "the second declaration of an identity the document already carries",
            );
        } else {
            seen.push(identity);
        }
    }
}

fn per_type(document: &Document<'_>, sink: &mut Sink<'_>) {
    let declared: Vec<String> = document
        .types
        .iter()
        .filter_map(|definition| definition.get("identity").and_then(Json::as_str))
        .map(str::to_string)
        .collect();
    let manifest_exports: Vec<String> = document
        .bundle
        .get("manifest")
        .and_then(|manifest| manifest.get("exports"))
        .and_then(Json::as_array)
        .unwrap_or(&[])
        .iter()
        .filter_map(|export| export.get("typeIdentity").and_then(Json::as_str))
        .map(str::to_string)
        .collect();

    for (position, definition) in document.types.iter().enumerate() {
        let type_at = index("/ir/types", position);
        let kind = definition.get("kind").and_then(Json::as_str).unwrap_or("");

        if matches!(kind, "alias" | "reference") {
            if let Some(target) = definition.get("target").and_then(Json::as_str) {
                if !declared.iter().any(|identity| identity == target) {
                    sink.emit(
                        child(&type_at, "target"),
                        UNRESOLVED_TYPE_REF,
                        format!("the {kind} target resolves to no declared type"),
                    );
                } else if kind == "alias" {
                    match walk_alias(document, definition) {
                        Walk::Cycle => sink.emit(
                            child(&type_at, "target"),
                            ALIAS_CYCLE,
                            "the alias chain closes on itself and resolves to no type",
                        ),
                        Walk::TooDeep => sink.emit(
                            child(&type_at, "target"),
                            DEPTH_LIMIT_EXCEEDED,
                            "alias expansion is bounded at the declared finite depth",
                        ),
                        Walk::Resolved => {}
                    }
                }
            }
        }
        if kind == "sequence" {
            check_element(document, &declared, definition, "items", &type_at, sink);
        }
        if kind == "map" {
            check_element(document, &declared, definition, "values", &type_at, sink);
        }
        if let Some(variants) = definition.get("variants").and_then(Json::as_array) {
            let variants_at = child(&type_at, "variants");
            for (member, variant) in variants.iter().enumerate() {
                if let Some(payload) = variant.get("payloadType").and_then(Json::as_str) {
                    if !declared.iter().any(|identity| identity == payload) {
                        sink.emit(
                            child(&index(&variants_at, member), "payloadType"),
                            UNRESOLVED_VARIANT_PAYLOAD,
                            "the union variant payload type resolves to no declared type",
                        );
                    }
                }
            }
        }
        if let Some(constraints) = definition.get("constraints").and_then(Json::as_array) {
            let constraints_at = child(&type_at, "constraints");
            for (member, constraint) in constraints.iter().enumerate() {
                constraint_rules(document, constraint, &index(&constraints_at, member), sink);
            }
        }
        if let Some(fields) = definition.get("fields").and_then(Json::as_array) {
            let fields_at = child(&type_at, "fields");
            field_rules(document, &declared, fields, &fields_at, sink);
            duplicate_names(fields, &fields_at, DUPLICATE_FIELD_NAME, sink);
        }
        if let Some(relationships) = definition.get("relationships").and_then(Json::as_array) {
            let relationships_at = child(&type_at, "relationships");
            for (member, relationship) in relationships.iter().enumerate() {
                if let Some(target) = relationship.get("target").and_then(Json::as_str) {
                    let resolves = declared.iter().any(|identity| identity == target)
                        || manifest_exports.iter().any(|identity| identity == target);
                    if !resolves {
                        sink.emit(
                            child(&index(&relationships_at, member), "target"),
                            UNRESOLVED_RELATIONSHIP_TARGET,
                            "a relationship target resolves to a document type or a manifest export",
                        );
                    }
                }
            }
        }
        let clause_ids: Vec<&str> = definition
            .get("clauses")
            .and_then(Json::as_array)
            .unwrap_or(&[])
            .iter()
            .filter_map(|clause| clause.get("clauseId").and_then(Json::as_str))
            .collect();
        if let Some(clauses) = definition.get("clauses").and_then(Json::as_array) {
            let clauses_at = child(&type_at, "clauses");
            let mut seen: Vec<&str> = Vec::new();
            for (member, clause) in clauses.iter().enumerate() {
                let clause_at = index(&clauses_at, member);
                if let Some(clause_id) = clause.get("clauseId").and_then(Json::as_str) {
                    if seen.contains(&clause_id) {
                        sink.emit(
                            child(&clause_at, "clauseId"),
                            DUPLICATE_CLAUSE_ID,
                            "clauseId is unique per type and this is its second declaration",
                        );
                    } else {
                        seen.push(clause_id);
                    }
                }
                let source_originated = clause
                    .get("origin")
                    .map(|origin| origin.has("source"))
                    .unwrap_or(false);
                if source_originated && !clause.has("sourceSpan") {
                    sink.emit(
                        child(&clause_at, "sourceSpan"),
                        MISSING_SOURCE_SPAN,
                        "a source-originated clause carries the span it was read from",
                    );
                }
            }
        }
        if let Some(operations) = definition.get("operations").and_then(Json::as_array) {
            let operations_at = child(&type_at, "operations");
            for (member, operation) in operations.iter().enumerate() {
                let operation_at = index(&operations_at, member);
                if let Some(params) = operation.get("params").and_then(Json::as_array) {
                    let params_at = child(&operation_at, "params");
                    field_rules(document, &declared, params, &params_at, sink);
                    duplicate_names(params, &params_at, DUPLICATE_PARAM, sink);
                }
                if let Some(returns) = operation.get("returns") {
                    if let Some(type_ref) = returns.get("typeRef").and_then(Json::as_str) {
                        if !declared.iter().any(|identity| identity == type_ref) {
                            sink.emit(
                                child(&child(&operation_at, "returns"), "typeRef"),
                                UNRESOLVED_TYPE_REF,
                                "the operation return type resolves to no declared type",
                            );
                        }
                    }
                }
                for binding in ["pre", "post"] {
                    let bound = operation.get(binding).and_then(Json::as_array);
                    if let Some(bound) = bound {
                        let binding_at = child(&operation_at, binding);
                        for (slot, clause_id) in bound.iter().enumerate() {
                            if let Some(clause_id) = clause_id.as_str() {
                                if !clause_ids.contains(&clause_id) {
                                    sink.emit(
                                        index(&binding_at, slot),
                                        DANGLING_CLAUSE_REF,
                                        "pre and post bind by clauseId to a clause this type declares",
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn check_element(
    _document: &Document<'_>,
    declared: &[String],
    definition: &Json,
    member: &str,
    type_at: &str,
    sink: &mut Sink<'_>,
) {
    if let Some(element) = definition.get(member).and_then(Json::as_str) {
        if !declared.iter().any(|identity| identity == element) {
            let what = if member == "items" {
                "sequence element"
            } else {
                "map value"
            };
            sink.emit(
                child(type_at, member),
                UNRESOLVED_ELEMENT_TYPE,
                format!("the {what} type resolves to no declared type"),
            );
        }
    }
}

enum Walk {
    Resolved,
    Cycle,
    TooDeep,
}

/// Walks an alias chain, detecting a cycle before the depth bound applies.
fn walk_alias(document: &Document<'_>, start: &Json) -> Walk {
    let mut current = start;
    let mut seen: Vec<&str> = match start.get("identity").and_then(Json::as_str) {
        Some(identity) => vec![identity],
        None => Vec::new(),
    };
    let mut steps = 0usize;
    loop {
        let target = match current.get("target").and_then(Json::as_str) {
            Some(target) => target,
            None => return Walk::Resolved,
        };
        if seen.contains(&target) {
            return Walk::Cycle;
        }
        seen.push(target);
        steps += 1;
        let next = match document.type_of(target) {
            Some(next) => next,
            None => return Walk::Resolved,
        };
        if next.get("kind").and_then(Json::as_str) != Some("alias") {
            return if steps > DEPTH_LIMIT {
                Walk::TooDeep
            } else {
                Walk::Resolved
            };
        }
        current = next;
        if steps > document.types.len() + 1 {
            return Walk::TooDeep;
        }
    }
}

fn duplicate_names(items: &[Json], items_at: &str, code: &'static str, sink: &mut Sink<'_>) {
    let mut seen: Vec<&str> = Vec::new();
    for (member, item) in items.iter().enumerate() {
        if let Some(name) = item.get("name").and_then(Json::as_str) {
            if seen.contains(&name) {
                let what = if code == DUPLICATE_PARAM {
                    "the second parameter of this operation to carry the name"
                } else {
                    "the second field of this record to carry the name"
                };
                sink.emit(child(&index(items_at, member), "name"), code, what);
            } else {
                seen.push(name);
            }
        }
    }
}

fn field_rules(
    document: &Document<'_>,
    declared: &[String],
    fields: &[Json],
    fields_at: &str,
    sink: &mut Sink<'_>,
) {
    for (member, field) in fields.iter().enumerate() {
        let field_at = index(fields_at, member);
        let type_ref = field.get("typeRef").and_then(Json::as_str);
        if let Some(type_ref) = type_ref {
            if !declared.iter().any(|identity| identity == type_ref) {
                sink.emit(
                    child(&field_at, "typeRef"),
                    UNRESOLVED_TYPE_REF,
                    "the field type reference resolves to no declared type",
                );
            }
        }
        if let Some(multiplicity) = field.get("multiplicity") {
            let multiplicity_at = child(&field_at, "multiplicity");
            let lower = multiplicity.get("lower").and_then(Json::as_i64);
            let upper = multiplicity.get("upper").and_then(Json::as_i64);
            if let (Some(lower), Some(upper)) = (lower, upper) {
                if upper < lower {
                    sink.emit(
                        child(&multiplicity_at, "upper"),
                        INVALID_MULTIPLICITY,
                        "the upper bound is below the lower bound",
                    );
                }
            }
            let flagged = multiplicity.has("ordered") || multiplicity.has("unique");
            if flagged {
                if let Some(upper) = upper {
                    if upper <= 1 {
                        sink.emit(
                            multiplicity_at.clone(),
                            FLAGS_ON_NON_COLLECTION,
                            "ordered and unique describe a collection and this field is single-valued",
                        );
                    }
                }
            }
            if let Some(lower) = lower {
                let derived = if lower >= 1 { "required" } else { "optional" };
                if let Some(stated) = field.get("presence").and_then(Json::as_str) {
                    if stated != derived {
                        sink.emit(
                            child(&field_at, "presence"),
                            PRESENCE_MULTIPLICITY_MISMATCH,
                            "presence is derived from the multiplicity lower bound and contradicts it",
                        );
                    }
                }
            }
        }
        if field.has("unit") {
            let scalar = type_ref
                .and_then(|identity| document.resolve(identity))
                .map(|resolved| resolved.get("kind").and_then(Json::as_str) == Some("scalar"))
                .unwrap_or(false);
            if !scalar {
                sink.emit(
                    child(&field_at, "unit"),
                    UNIT_ON_NON_SCALAR,
                    "a unit is carried only where the type reference resolves to a scalar",
                );
            }
        }
    }
}

/// The applicability table over the resolved kind.
///
/// Derived from `contracts-v1.md`: the keyword set is closed, "with typed
/// operands per keyword and an applicability table over the resolved kind".
fn applies_to(keyword: &str, kind: &str, scalar: &str) -> bool {
    match keyword {
        "min" | "max" | "exclusiveMin" | "exclusiveMax" => {
            kind == "scalar"
                && matches!(
                    scalar,
                    "integer" | "number" | "date" | "datetime" | "duration"
                )
        }
        "minLength" | "maxLength" => kind == "scalar" && matches!(scalar, "string" | "bytes"),
        "pattern" | "format" => kind == "scalar" && scalar == "string",
        "enumValues" => kind == "scalar" || kind == "enum",
        "nonEmpty" => {
            (kind == "scalar" && matches!(scalar, "string" | "bytes"))
                || matches!(kind, "sequence" | "map")
        }
        "unique" => matches!(kind, "sequence" | "map"),
        _ => true,
    }
}

fn constraint_rules(
    document: &Document<'_>,
    constraint: &Json,
    constraint_at: &str,
    sink: &mut Sink<'_>,
) {
    let keyword = match constraint.get("keyword").and_then(Json::as_str) {
        Some(keyword) => keyword,
        None => return,
    };
    let applies = constraint.get("appliesTo").and_then(Json::as_str);
    let resolved = applies.and_then(|identity| document.resolve(identity));
    if let Some(resolved) = resolved {
        let kind = resolved.get("kind").and_then(Json::as_str).unwrap_or("");
        let scalar = resolved.get("scalar").and_then(Json::as_str).unwrap_or("");
        if !applies_to(keyword, kind, scalar) {
            sink.emit(
                constraint_at.to_string(),
                CONSTRAINT_NOT_APPLICABLE,
                "the applicability table does not admit this keyword on this resolved kind",
            );
            return;
        }
        if matches!(keyword, "min" | "max" | "exclusiveMin" | "exclusiveMax")
            && matches!(scalar, "integer" | "number")
        {
            match constraint.get("operands").and_then(|o| o.get("value")) {
                Some(Json::Number(_)) => {}
                Some(_) => sink.emit(
                    child(&child(constraint_at, "operands"), "value"),
                    INVALID_OPERAND,
                    "a numeric keyword on a numeric scalar takes a number operand",
                ),
                None => {}
            }
        }
    }
    if keyword == "pattern" {
        if let Some(regex) = constraint
            .get("operands")
            .and_then(|operands| operands.get("regex"))
            .and_then(Json::as_str)
        {
            if !regex262::compiles(regex) {
                sink.emit(
                    child(&child(constraint_at, "operands"), "regex"),
                    INVALID_PATTERN,
                    "the regular expression does not compile under the declared dialect",
                );
            }
        }
    }
}

fn occurrences(document: &Document<'_>, sink: &mut Sink<'_>) {
    let declared: Vec<&str> = document
        .types
        .iter()
        .filter_map(|definition| definition.get("identity").and_then(Json::as_str))
        .collect();
    if let Some(occurrences) = document.ir.get("occurrences").and_then(Json::as_array) {
        for (position, occurrence) in occurrences.iter().enumerate() {
            if let Some(definition) = occurrence.get("definition").and_then(Json::as_str) {
                if !declared.contains(&definition) {
                    sink.emit(
                        child(&index("/ir/occurrences", position), "definition"),
                        UNRESOLVED_OCCURRENCE_DEFINITION,
                        "definitions and occurrences remain separate and an occurrence names a declared definition",
                    );
                }
            }
        }
    }
}

/// Reports the back edge that closes a cycle in the composite relationship
/// graph, which `contracts-v1.md` requires to be acyclic.
fn composite_graph(document: &Document<'_>, sink: &mut Sink<'_>) {
    let mut visited: Vec<usize> = Vec::new();
    for start in 0..document.types.len() {
        if visited.contains(&start) {
            continue;
        }
        let mut stack: Vec<usize> = Vec::new();
        if let Some(found) = composite_visit(document, start, &mut visited, &mut stack, 0) {
            sink.emit(
                found,
                COMPOSITE_CYCLE,
                "the composite relationship graph is required to be acyclic",
            );
            return;
        }
    }
}

fn composite_visit(
    document: &Document<'_>,
    at: usize,
    visited: &mut Vec<usize>,
    stack: &mut Vec<usize>,
    depth: usize,
) -> Option<String> {
    if depth > DEPTH_LIMIT {
        return None;
    }
    visited.push(at);
    stack.push(at);
    let definition = match document.types.get(at) {
        Some(definition) => definition,
        None => {
            stack.pop();
            return None;
        }
    };
    let type_at = index("/ir/types", at);
    if let Some(relationships) = definition.get("relationships").and_then(Json::as_array) {
        let relationships_at = child(&type_at, "relationships");
        for (member, relationship) in relationships.iter().enumerate() {
            if relationship.get("composite").and_then(Json::as_bool) != Some(true) {
                continue;
            }
            let target = match relationship.get("target").and_then(Json::as_str) {
                Some(target) => target,
                None => continue,
            };
            let next = document
                .types
                .iter()
                .position(|other| other.get("identity").and_then(Json::as_str) == Some(target));
            let next = match next {
                Some(next) => next,
                None => continue,
            };
            if stack.contains(&next) {
                stack.pop();
                return Some(child(&index(&relationships_at, member), "target"));
            }
            if !visited.contains(&next) {
                if let Some(found) = composite_visit(document, next, visited, stack, depth + 1) {
                    stack.pop();
                    return Some(found);
                }
            }
        }
    }
    stack.pop();
    None
}

/// A contract 1.1.0 node carried by a contract 1.0.0 document.
///
/// The 1.1.0 nodes are exactly the ones `contracts-v1.md` introduces under
/// "Contract 1.1.0 (issue #34)": a field's `multiplicity` and `unit`, and a
/// type's `relationships`, `operations` and `clauses`.
fn v1_0_purity(document: &Document<'_>, sink: &mut Sink<'_>) {
    for (position, definition) in document.types.iter().enumerate() {
        let type_at = index("/ir/types", position);
        for member in ["relationships", "operations", "clauses"] {
            if definition.has(member) {
                sink.emit(
                    child(&type_at, member),
                    V1_1_NODE_IN_V1_0,
                    "contract 1.1.0 is additive to 1.0.0 and a 1.0.0 reader has no reader for this node",
                );
            }
        }
        if let Some(fields) = definition.get("fields").and_then(Json::as_array) {
            let fields_at = child(&type_at, "fields");
            for (member, field) in fields.iter().enumerate() {
                let field_at = index(&fields_at, member);
                for name in ["multiplicity", "unit"] {
                    if field.has(name) {
                        sink.emit(
                            child(&field_at, name),
                            V1_1_NODE_IN_V1_0,
                            "contract 1.1.0 is additive to 1.0.0 and a 1.0.0 reader has no reader for this node",
                        );
                    }
                }
            }
        }
    }
}

/// The six package-context rules, each decided only when the bundle supplies
/// the member it needs.
fn package_context(document: &Document<'_>, sink: &mut Sink<'_>) {
    let bundle = document.bundle;
    let manifest = bundle.get("manifest");
    let lock = bundle.get("lock");

    if let (Some(manifest), Some(lock)) = (manifest, lock) {
        let resolved: Vec<&str> = lock
            .get("packages")
            .and_then(Json::as_array)
            .unwrap_or(&[])
            .iter()
            .filter_map(|package| package.get("identity").and_then(Json::as_str))
            .collect();
        if let Some(imports) = manifest.get("imports").and_then(Json::as_array) {
            for (position, import) in imports.iter().enumerate() {
                if let Some(identity) = import.get("packageIdentity").and_then(Json::as_str) {
                    if !resolved.contains(&identity) {
                        sink.emit(
                            child(&index("/manifest/imports", position), "packageIdentity"),
                            UNRESOLVED_IMPORT,
                            "the lock resolves the complete dependency graph and does not resolve this import",
                        );
                    }
                }
            }
        }
    }

    if let Some(lock) = lock {
        if let Some(pointer) = package_cycle(lock) {
            sink.emit(
                pointer,
                PACKAGE_CYCLE,
                "package cycles are rejected; recursive type graphs are not package cycles",
            );
        }
    }

    if let Some(stated) = bundle.get("manifestDigest").and_then(Json::as_str) {
        let named = document
            .ir
            .get("package")
            .and_then(|package| package.get("manifestDigest"))
            .and_then(Json::as_str);
        if let Some(named) = named {
            if named != stated {
                sink.emit(
                    "/ir/package/manifestDigest".to_string(),
                    STALE_LOCK,
                    "the IR names a manifest digest the bundle's manifest does not hash to",
                );
            }
        }
    }

    if let Some(mappings) = bundle.get("mappings").and_then(Json::as_array) {
        let declared = document.declared_identities();
        for (position, mapping) in mappings.iter().enumerate() {
            let mapping_at = index("/mappings", position);
            for member in ["sourceType", "targetType"] {
                if let Some(identity) = mapping.get(member).and_then(Json::as_str) {
                    if !declared.iter().any(|known| known == identity) {
                        sink.emit(
                            child(&mapping_at, member),
                            UNKNOWN_MAPPING_TARGET,
                            "a mapping names a semantic identity the document declares",
                        );
                    }
                }
            }
            if let Some(correspondences) = mapping.get("correspondences").and_then(Json::as_array) {
                let correspondences_at = child(&mapping_at, "correspondences");
                for (member, correspondence) in correspondences.iter().enumerate() {
                    if let Some(identity) =
                        correspondence.get("sourceIdentity").and_then(Json::as_str)
                    {
                        if !declared.iter().any(|known| known == identity) {
                            sink.emit(
                                child(&index(&correspondences_at, member), "sourceIdentity"),
                                UNKNOWN_MAPPING_TARGET,
                                "a mapping names a semantic identity the document declares",
                            );
                        }
                    }
                }
            }
        }
    }

    if let Some(manifest) = manifest {
        let exported: Vec<&str> = manifest
            .get("exports")
            .and_then(Json::as_array)
            .unwrap_or(&[])
            .iter()
            .filter_map(|export| export.get("typeIdentity").and_then(Json::as_str))
            .collect();
        let omitted: Vec<&str> = bundle
            .get("profile")
            .and_then(|profile| profile.get("allowedOmissions"))
            .and_then(Json::as_array)
            .unwrap_or(&[])
            .iter()
            .filter_map(Json::as_str)
            .collect();
        for (position, definition) in document.types.iter().enumerate() {
            let entity = definition
                .get("roles")
                .and_then(Json::as_array)
                .unwrap_or(&[])
                .iter()
                .filter_map(Json::as_str)
                .any(|role| role.rsplit(':').next() == Some("entity"));
            if !entity {
                continue;
            }
            let identity = match definition.get("identity").and_then(Json::as_str) {
                Some(identity) => identity,
                None => continue,
            };
            if exported.contains(&identity) || omitted.contains(&identity) {
                continue;
            }
            sink.emit(
                child(&index("/ir/types", position), "identity"),
                UNDECLARED_LOSS,
                "declared loss lists every omitted identity and undeclared loss fails",
            );
        }
    }

    if let Some(policy) = bundle.get("consumerPolicy") {
        if policy.get("unknownExtensions").and_then(Json::as_str) == Some("reject") {
            let listed: Vec<&str> = policy
                .get("exports")
                .and_then(Json::as_array)
                .unwrap_or(&[])
                .iter()
                .filter_map(Json::as_str)
                .collect();
            if let Some(extensions) = document.ir.get("extensions").and_then(Json::as_array) {
                for (position, extension) in extensions.iter().enumerate() {
                    if extension.get("required").and_then(Json::as_bool) != Some(true) {
                        continue;
                    }
                    if let Some(identity) = extension.get("identity").and_then(Json::as_str) {
                        if !listed.contains(&identity) {
                            sink.emit(
                                child(&index("/ir/extensions", position), "identity"),
                                UNKNOWN_REQUIRED_EXTENSION,
                                "the consumer policy rejects unknown extensions and does not list this one",
                            );
                        }
                    }
                }
            }
        }
    }
}

fn package_cycle(lock: &Json) -> Option<String> {
    let packages = lock.get("packages").and_then(Json::as_array)?;
    let identities: Vec<&str> = packages
        .iter()
        .map(|package| package.get("identity").and_then(Json::as_str).unwrap_or(""))
        .collect();
    let mut visited: Vec<usize> = Vec::new();
    for start in 0..packages.len() {
        if visited.contains(&start) {
            continue;
        }
        let mut stack: Vec<usize> = Vec::new();
        if let Some(found) =
            package_visit(packages, &identities, start, &mut visited, &mut stack, 0)
        {
            return Some(found);
        }
    }
    None
}

fn package_visit(
    packages: &[Json],
    identities: &[&str],
    at: usize,
    visited: &mut Vec<usize>,
    stack: &mut Vec<usize>,
    depth: usize,
) -> Option<String> {
    if depth > DEPTH_LIMIT {
        return None;
    }
    visited.push(at);
    stack.push(at);
    if let Some(package) = packages.get(at) {
        if let Some(dependencies) = package.get("dependencies").and_then(Json::as_array) {
            for dependency in dependencies {
                let name = match dependency.as_str() {
                    Some(name) => name,
                    None => continue,
                };
                let next = match identities.iter().position(|known| *known == name) {
                    Some(next) => next,
                    None => continue,
                };
                if stack.contains(&next) {
                    stack.pop();
                    return Some(child(&index("/lock/packages", at), "dependencies"));
                }
                if !visited.contains(&next) {
                    if let Some(found) =
                        package_visit(packages, identities, next, visited, stack, depth + 1)
                    {
                        stack.pop();
                        return Some(found);
                    }
                }
            }
        }
    }
    stack.pop();
    None
}
