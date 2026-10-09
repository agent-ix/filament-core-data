//! The cross-field rules, and the package-context rules.
//!
//! Every code emitted here has a `conformance/diagnostic-codes.json` row, and
//! `crates/semantic-ir/RULES.md` cites the clause each rule was derived from.

use std::cell::RefCell;
use std::collections::{BTreeSet, HashMap, HashSet};

use crate::diag::{child, index, locus_for, owner_for, Located, Severity};
use crate::json::Json;
use crate::regex262;
use crate::schema::SCHEMA_VIOLATION;
use crate::vocabulary::Shape;

/// The limits the cross-field rules run under, each used as the caller gives
/// it.
///
/// No depth is compiled in: every walk the rules make keeps its own state on
/// the heap and ends on the graph it walks, so a chain, a cycle or a hierarchy
/// of any length is walked on any thread. A caller that wants a depth report
/// sets one here.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct RuleLimits {
    /// The most links an acyclic alias chain may hold, or `None` for no limit.
    /// A longer chain is reported `DEPTH_LIMIT_EXCEEDED` at the node that
    /// exceeds it, and a cycle is reported as a cycle however long the chain
    /// before it closes.
    pub alias_depth: Option<usize>,
}

/// The prefix a native type reference carries (gap 1 of FCD #199/#200): a
/// kernel scalar mints no document node, so a `typeRef`, `target`, sequence
/// `items`, map `values`, variant `payloadType` or constraint `appliesTo`
/// naming one resolves against this closed set instead of `document.types`.
pub const NATIVE_PREFIX: &str = "ix://quire/native/";

/// The FR-032 kernel scalar library's names, each with the `irScalar` value
/// `KernelScalar::ir_scalar` (`crates/extraction-frontend/src/scalars.rs`)
/// gives it; this reader carries the same closed set independently, since it
/// decides IR documents no producer crate is assumed.
const NATIVE_SCALARS: &[(&str, &str)] = &[
    ("UUID", "uuid"),
    ("Boolean", "boolean"),
    ("Integer", "integer"),
    ("Decimal", "decimal"),
    ("String", "string"),
    ("Timestamp", "datetime"),
    ("Duration", "duration"),
    ("Bytes", "bytes"),
    ("JsonObject", "any"),
];

/// The `irScalar` value a native type reference names, when `identity` is
/// one and the library declares its name.
fn native_scalar(identity: &str) -> Option<&'static str> {
    let name = identity.strip_prefix(NATIVE_PREFIX)?;
    NATIVE_SCALARS
        .iter()
        .find(|(declared, _)| *declared == name)
        .map(|(_, scalar)| *scalar)
}

/// Whether `identity` resolves: a document declares it, or it is a native
/// type reference.
fn resolves(declared: &HashSet<String>, identity: &str) -> bool {
    native_scalar(identity).is_some() || declared.contains(identity)
}

/// What an identity resolves to, for the applicability table and the unit
/// rule: a document type definition, reached directly or through an alias
/// chain or a field's own `typeRef`; or a native type reference, which
/// resolves to no document node (gap 1 of FCD #199/#200).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Resolved<'a> {
    /// A document type definition, reached directly or through an alias
    /// chain or a field's own `typeRef`.
    Node(&'a Json),
    /// A native type reference, resolved to the kernel scalar it names
    /// (gap 1 of FCD #199/#200).
    Native(&'static str),
}

impl<'a> Resolved<'a> {
    /// The core kind of the resolved type: the document node's `kind`, or
    /// `"scalar"` for a native type reference.
    pub fn kind(&self) -> &str {
        match self {
            Resolved::Node(node) => node.get("kind").and_then(Json::as_str).unwrap_or(""),
            Resolved::Native(_) => "scalar",
        }
    }

    /// The kernel scalar name: the document node's `scalar` member, or the
    /// native type reference's scalar for a native reference.
    pub fn scalar(&self) -> &str {
        match self {
            Resolved::Node(node) => node.get("scalar").and_then(Json::as_str).unwrap_or(""),
            Resolved::Native(scalar) => scalar,
        }
    }
}

macro_rules! codes {
    ($($name:ident => $code:literal),* $(,)?) => {
        $(
            #[doc = concat!("`", $code, "`.")]
            pub const $name: &str = $code;
        )*
    };
}

codes! {
    INVALID_MULTIPLICITY => "agent-ix.semantic-ir.INVALID_MULTIPLICITY",
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
    INVALID_RELATIONSHIP_SOURCE => "agent-ix.semantic-ir.INVALID_RELATIONSHIP_SOURCE",
    COMPOSITE_CYCLE => "agent-ix.semantic-ir.COMPOSITE_CYCLE",
    UNRESOLVED_IMPORT => "agent-ix.semantic-ir.UNRESOLVED_IMPORT",
    PACKAGE_CYCLE => "agent-ix.semantic-ir.PACKAGE_CYCLE",
    STALE_LOCK => "agent-ix.semantic-ir.STALE_LOCK",
    UNKNOWN_MAPPING_TARGET => "agent-ix.semantic-ir.UNKNOWN_MAPPING_TARGET",
    UNDECLARED_LOSS => "agent-ix.semantic-ir.UNDECLARED_LOSS",
    UNKNOWN_REQUIRED_EXTENSION => "agent-ix.semantic-ir.UNKNOWN_REQUIRED_EXTENSION",
}

/// A resolution kept without borrowing the document: a node is its position
/// among the types.
#[derive(Clone, Copy)]
enum Cached {
    Nothing,
    Native(&'static str),
    Node(usize),
}

/// The reading of the document the cross-field rules and the classifier share.
pub struct Document<'a> {
    /// The whole input bundle.
    pub bundle: &'a Json,
    /// The IR document.
    pub ir: &'a Json,
    /// The type definitions, in document order.
    pub types: &'a [Json],
    /// The limits the rules run under.
    pub limits: RuleLimits,
    /// The position of the first type declaring each identity, so a lookup
    /// by identity is one map access however many types the document holds.
    by_identity: HashMap<&'a str, usize>,
    /// The first field or operation parameter declaring each identity, in
    /// document order.
    by_feature: HashMap<&'a str, &'a Json>,
    /// What each identity resolved to, so a chain is walked once however many
    /// fields and constraints name its head.
    resolved: RefCell<HashMap<String, Cached>>,
}

impl<'a> Document<'a> {
    /// Reads a bundle, when it carries an IR document with a type array.
    ///
    /// `rules::decide` (this module's only caller of `Document::read`, per
    /// `lib.rs::decide`) runs only when the schema layer emitted no
    /// diagnostic, and the schema closes `contractVersion` to `["2.0.0"]`
    /// (fcd#179), so every document reaching this reading already declares
    /// contract 2.0.0 — there is no other live version left to distinguish.
    pub fn read(bundle: &'a Json) -> Option<Document<'a>> {
        Self::read_with(bundle, RuleLimits::default())
    }

    /// [`Document::read`] under `limits`.
    pub fn read_with(bundle: &'a Json, limits: RuleLimits) -> Option<Document<'a>> {
        let ir = bundle.get("ir")?;
        let types = ir.get("types").and_then(Json::as_array).unwrap_or(&[]);
        let mut by_identity = HashMap::with_capacity(types.len());
        for (position, definition) in types.iter().enumerate() {
            if let Some(identity) = definition.get("identity").and_then(Json::as_str) {
                by_identity.entry(identity).or_insert(position);
            }
        }
        let mut by_feature = HashMap::new();
        for definition in types {
            let params = definition
                .get("operations")
                .and_then(Json::as_array)
                .unwrap_or(&[])
                .iter()
                .flat_map(|operation| {
                    operation
                        .get("params")
                        .and_then(Json::as_array)
                        .unwrap_or(&[])
                });
            let fields = definition
                .get("fields")
                .and_then(Json::as_array)
                .unwrap_or(&[]);
            for feature in fields.iter().chain(params) {
                if let Some(identity) = feature.get("identity").and_then(Json::as_str) {
                    by_feature.entry(identity).or_insert(feature);
                }
            }
        }
        Some(Document {
            bundle,
            ir,
            types,
            limits,
            by_identity,
            by_feature,
            resolved: RefCell::new(HashMap::new()),
        })
    }

    /// The position in `types` of the definition an identity names.
    pub(crate) fn by_position(&self, identity: &str) -> Option<usize> {
        self.by_identity.get(identity).copied()
    }

    /// The type definition an identity names.
    pub fn type_of(&self, identity: &str) -> Option<&'a Json> {
        self.by_identity
            .get(identity)
            .and_then(|&position| self.types.get(position))
    }

    /// The type declaring the operation an identity names, when the document
    /// declares one (FR-152: an allocation's `sourceElement` may name an
    /// operation of a declared type, in place of the type itself).
    pub fn type_of_operation(&self, identity: &str) -> Option<&'a Json> {
        self.types.iter().find(|definition| {
            definition
                .get("operations")
                .and_then(Json::as_array)
                .unwrap_or(&[])
                .iter()
                .any(|operation| operation.get("identity").and_then(Json::as_str) == Some(identity))
        })
    }

    /// The field or param of a record or an operation that declares
    /// `identity`, searched in document order (constraint `appliesTo` may
    /// name one directly, gap 1 of FCD #199/#200: a constrained field keeps
    /// its constraints inline, with no alias node between them).
    fn field_of(&self, identity: &str) -> Option<&'a Json> {
        self.by_feature.get(identity).copied()
    }

    /// What an identity resolves to: a native type reference; a field or
    /// param, through its own `typeRef`; or a document type, through the
    /// alias chain.
    ///
    /// Returns `None` for a chain that does not resolve, closes on itself, or
    /// runs past the declared depth bound; each of those is reported under its
    /// own code by the rule that owns it, not by this resolver.
    pub fn resolve(&self, identity: &str) -> Option<Resolved<'a>> {
        if let Some(known) = self.resolved.borrow().get(identity) {
            return self.restore(*known);
        }
        let mut walked = Vec::new();
        let result = self.resolve_walk(identity, &mut walked);
        // A configured depth limit counts hops from the start of each walk, so
        // only the start's own result is the same for every start.
        let mut cache = self.resolved.borrow_mut();
        if self.limits.alias_depth.is_none() {
            for name in walked {
                cache.insert(name.to_string(), result);
            }
        }
        cache.insert(identity.to_string(), result);
        drop(cache);
        self.restore(result)
    }

    fn restore(&self, cached: Cached) -> Option<Resolved<'a>> {
        match cached {
            Cached::Nothing => None,
            Cached::Native(scalar) => Some(Resolved::Native(scalar)),
            Cached::Node(position) => self.types.get(position).map(Resolved::Node),
        }
    }

    /// One uncached walk; `walked` collects every alias identity it passes,
    /// each of which resolves to the same result as the start.
    fn resolve_walk(&self, identity: &str, walked: &mut Vec<&'a str>) -> Cached {
        let mut seen = BTreeSet::new();
        seen.insert(identity);
        let mut identity = identity;
        // A field's `typeRef` can name another field (gap 1 of FCD
        // #199/#200, via a constraint's `appliesTo`), so two fields whose
        // `typeRef`s name each other would otherwise walk forever; a revisit
        // resolves to nothing, the same as a closed alias chain. `seen` is a
        // `BTreeSet`: membership is the only operation the walk needs.
        loop {
            if let Some(scalar) = native_scalar(identity) {
                return Cached::Native(scalar);
            }
            let Some(field) = self.field_of(identity) else {
                break;
            };
            let Some(type_ref) = field.get("typeRef").and_then(Json::as_str) else {
                return Cached::Nothing;
            };
            if !seen.insert(type_ref) {
                return Cached::Nothing;
            }
            identity = type_ref;
        }
        let Some(mut position) = self.by_position(identity) else {
            return Cached::Nothing;
        };
        let mut hops = 0usize;
        loop {
            let Some(current) = self.types.get(position) else {
                return Cached::Nothing;
            };
            if current.get("kind").and_then(Json::as_str) != Some("alias") {
                return Cached::Node(position);
            }
            let Some(target) = current.get("target").and_then(Json::as_str) else {
                return Cached::Nothing;
            };
            if let Some(scalar) = native_scalar(target) {
                return Cached::Native(scalar);
            }
            if !seen.insert(target) {
                return Cached::Nothing;
            }
            hops += 1;
            if self.limits.alias_depth.is_some_and(|limit| hops > limit) {
                return Cached::Nothing;
            }
            if self.limits.alias_depth.is_none() {
                if let Some(known) = self.resolved.borrow().get(target) {
                    return *known;
                }
                walked.push(target);
            }
            let Some(next) = self.by_position(target) else {
                return Cached::Nothing;
            };
            position = next;
        }
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
            for group in ["clauses", "states", "transitions", "steps"] {
                if let Some(items) = definition.get(group).and_then(Json::as_array) {
                    let group_at = child(&type_at, group);
                    for (member, item) in items.iter().enumerate() {
                        push(index(&group_at, member), item);
                    }
                }
            }
        }
        if let Some(populations) = self.ir.get("populations").and_then(Json::as_array) {
            for (position, population) in populations.iter().enumerate() {
                push(index("/ir/populations", position), population);
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

pub(crate) struct Sink<'a> {
    bundle: &'a Json,
    out: Vec<Located>,
}

impl<'a> Sink<'a> {
    pub(crate) fn emit(&mut self, pointer: String, code: &'static str, message: impl Into<String>) {
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

    /// An `info`, non-blocking diagnostic: the document is accepted.
    pub(crate) fn advise(
        &mut self,
        pointer: String,
        code: &'static str,
        message: impl Into<String>,
    ) {
        self.out.push(Located {
            owner: owner_for(self.bundle, &pointer),
            locus: locus_for(self.bundle, &pointer),
            code,
            severity: Severity::Info,
            message: message.into(),
            blocking: false,
            pointer,
        });
    }
}

/// Decides every cross-field and package-context rule over one input bundle.
pub fn decide(bundle: &Json) -> Vec<Located> {
    decide_with(bundle, RuleLimits::default())
}

/// [`decide`] under `limits`.
pub fn decide_with(bundle: &Json, limits: RuleLimits) -> Vec<Located> {
    let mut sink = Sink {
        bundle,
        out: Vec::new(),
    };
    let document = match Document::read_with(bundle, limits) {
        Some(document) => document,
        None => return sink.out,
    };
    duplicate_identities(&document, &mut sink);
    per_type(&document, &mut sink);
    occurrences(&document, &mut sink);
    composite_graph(&document, &mut sink);
    crate::constructs::decide(&document, &mut sink);
    package_context(&document, &mut sink);
    sink.out
}

fn duplicate_identities(document: &Document<'_>, sink: &mut Sink<'_>) {
    let mut seen: HashSet<String> = HashSet::new();
    for (pointer, _node, identity) in document.identity_declarations() {
        if seen.contains(&identity) {
            sink.emit(
                pointer,
                DUPLICATE_IDENTITY,
                "the second declaration of an identity the document already carries",
            );
        } else {
            seen.insert(identity);
        }
    }
}

fn per_type(document: &Document<'_>, sink: &mut Sink<'_>) {
    let declared: HashSet<String> = document
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

    let mut alias_memo = AliasMemo::new();
    for (position, definition) in document.types.iter().enumerate() {
        let type_at = index("/ir/types", position);
        let kind = definition.get("kind").and_then(Json::as_str).unwrap_or("");

        if matches!(kind, "alias" | "reference") {
            if let Some(target) = definition.get("target").and_then(Json::as_str) {
                if !resolves(&declared, target) {
                    sink.emit(
                        child(&type_at, "target"),
                        UNRESOLVED_TYPE_REF,
                        format!("the {kind} target resolves to no declared type"),
                    );
                } else if kind == "alias" {
                    match walk_alias(document, definition, &mut alias_memo) {
                        Walk::Cycle => sink.emit(
                            child(&type_at, "target"),
                            ALIAS_CYCLE,
                            "the alias chain closes on itself and resolves to no type",
                        ),
                        Walk::TooDeep => sink.emit(
                            child(&type_at, "target"),
                            DEPTH_LIMIT_EXCEEDED,
                            "alias expansion exceeds the configured depth limit",
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
                    if !resolves(&declared, payload) {
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
                // The target end's `type` is the resolved target (gap 3 of
                // FCD #199/#200); the source end always names this
                // artifact's own type (FCD #199/#200 review finding 9), which
                // this checks directly rather than assuming a producer holds
                // it.
                if let Some(target) = relationship
                    .get("targetEnd")
                    .and_then(|end| end.get("type"))
                    .and_then(Json::as_str)
                {
                    let resolves = declared.contains(target)
                        || manifest_exports.iter().any(|identity| identity == target);
                    if !resolves {
                        sink.emit(
                            child(
                                &child(&index(&relationships_at, member), "targetEnd"),
                                "type",
                            ),
                            UNRESOLVED_RELATIONSHIP_TARGET,
                            "a relationship target resolves to a document type or a manifest export",
                        );
                    }
                }
                if let Some(source) = relationship
                    .get("sourceEnd")
                    .and_then(|end| end.get("type"))
                    .and_then(Json::as_str)
                {
                    if Some(source) != definition.get("identity").and_then(Json::as_str) {
                        sink.emit(
                            child(
                                &child(&index(&relationships_at, member), "sourceEnd"),
                                "type",
                            ),
                            INVALID_RELATIONSHIP_SOURCE,
                            "a relationship's source end names the type declaring it",
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
                        if !resolves(&declared, type_ref) {
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
    declared: &HashSet<String>,
    definition: &Json,
    member: &str,
    type_at: &str,
    sink: &mut Sink<'_>,
) {
    if let Some(element) = definition.get(member).and_then(Json::as_str) {
        if !resolves(declared, element) {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Walk {
    Resolved,
    Cycle,
    TooDeep,
}

/// What walking from one alias to the end of its chain found, kept per alias
/// so each link is walked once however long the chain is.
#[derive(Debug, Clone, Copy)]
enum Chain {
    /// The chain closes on itself.
    Cycle,
    /// The chain ends after `steps` links; `at_type` is whether it ends at a
    /// declared type that is not an alias (the only end a depth limit applies to).
    Ends { steps: usize, at_type: bool },
}

/// Per-alias results of [`walk_alias`], by identity, shared across a decision.
type AliasMemo<'a> = HashMap<&'a str, Chain>;

/// Walks an alias chain, detecting a cycle before any configured depth limit
/// applies. The walk is iterative and records every alias it passes, so
/// walking every alias of a chain of `n` links costs `n` steps in all.
fn walk_alias<'a>(document: &Document<'a>, start: &'a Json, memo: &mut AliasMemo<'a>) -> Walk {
    let mut path: Vec<&'a str> = Vec::new();
    let mut on_path: HashSet<&'a str> = HashSet::new();
    let mut current = start;
    let mut chain = loop {
        let identity = current.get("identity").and_then(Json::as_str).unwrap_or("");
        if let Some(known) = memo.get(identity) {
            break *known;
        }
        if !on_path.insert(identity) {
            break Chain::Cycle;
        }
        path.push(identity);
        let Some(target) = current.get("target").and_then(Json::as_str) else {
            path.pop();
            let end = Chain::Ends {
                steps: 0,
                at_type: false,
            };
            memo.insert(identity, end);
            break end;
        };
        match document.type_of(target) {
            None => {
                path.pop();
                let end = Chain::Ends {
                    steps: 1,
                    at_type: false,
                };
                memo.insert(identity, end);
                break end;
            }
            Some(next) if next.get("kind").and_then(Json::as_str) != Some("alias") => {
                path.pop();
                let end = Chain::Ends {
                    steps: 1,
                    at_type: true,
                };
                memo.insert(identity, end);
                break end;
            }
            Some(next) => current = next,
        }
    };
    while let Some(identity) = path.pop() {
        chain = match chain {
            Chain::Cycle => Chain::Cycle,
            Chain::Ends { steps, at_type } => Chain::Ends {
                steps: steps + 1,
                at_type,
            },
        };
        memo.insert(identity, chain);
    }
    match chain {
        Chain::Cycle => Walk::Cycle,
        Chain::Ends {
            steps,
            at_type: true,
        } if document
            .limits
            .alias_depth
            .is_some_and(|limit| steps > limit) =>
        {
            Walk::TooDeep
        }
        Chain::Ends { .. } => Walk::Resolved,
    }
}

fn duplicate_names(items: &[Json], items_at: &str, code: &'static str, sink: &mut Sink<'_>) {
    let mut seen: HashSet<&str> = HashSet::new();
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
                seen.insert(name);
            }
        }
    }
}

fn field_rules(
    document: &Document<'_>,
    declared: &HashSet<String>,
    fields: &[Json],
    fields_at: &str,
    sink: &mut Sink<'_>,
) {
    for (member, field) in fields.iter().enumerate() {
        let field_at = index(fields_at, member);
        let type_ref = field.get("typeRef").and_then(Json::as_str);
        if let Some(type_ref) = type_ref {
            if !resolves(declared, type_ref) {
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
        }
        if field.has("unit") {
            let scalar = type_ref
                .and_then(|identity| document.resolve(identity))
                .map(|resolved| resolved.kind() == "scalar")
                .unwrap_or(false);
            if !scalar {
                sink.emit(
                    child(&field_at, "unit"),
                    UNIT_ON_NON_SCALAR,
                    "a unit is carried only where the type reference resolves to a scalar",
                );
            }
        }
        if field.has("textProfile") {
            // Unresolved references are reported by their own rule; only a
            // reference that resolves to something other than a text scalar
            // is refused here.
            let resolved = type_ref.and_then(|identity| document.resolve(identity));
            let is_text = match resolved {
                Some(Resolved::Native(scalar)) => scalar == "string",
                Some(Resolved::Node(node)) => {
                    node.get("kind").and_then(Json::as_str) == Some("scalar")
                        && node.get("scalar").and_then(Json::as_str) == Some("string")
                }
                None => true,
            };
            if !is_text {
                sink.emit(
                    child(&field_at, "textProfile"),
                    SCHEMA_VIOLATION,
                    "a text profile is carried only where the type reference resolves to a text scalar",
                );
            }
        }
        // A constrained field keeps its constraints inline, with no alias
        // node between them (gap 1 of FCD #199/#200); `Document::resolve`
        // already resolves a field identity directly through `field_of`, so
        // this runs the same applicability/operand/regex checks as a
        // type-level constraint, with the field itself as the subject.
        if let Some(constraints) = field.get("constraints").and_then(Json::as_array) {
            let constraints_at = child(&field_at, "constraints");
            for (member, constraint) in constraints.iter().enumerate() {
                constraint_rules(document, constraint, &index(&constraints_at, member), sink);
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
                    "integer" | "decimal" | "number" | "date" | "datetime" | "duration"
                )
        }
        "minLength" | "maxLength" => kind == "scalar" && matches!(scalar, "string" | "bytes"),
        "pattern" | "format" => kind == "scalar" && scalar == "string",
        "enumValues" => matches!(kind, "scalar" | "enum" | "enumeration"),
        "nonEmpty" => {
            (kind == "scalar" && matches!(scalar, "string" | "bytes"))
                || matches!(kind, "sequence" | "map")
        }
        "unique" => matches!(kind, "sequence" | "map"),
        _ => true,
    }
}

/// A canonical decimal integer: `0`, or an optional `-` and digits with no
/// leading zero. No `+`, no spaces, no `-0`.
fn is_canonical_integer(text: &str) -> bool {
    let digits = text.strip_prefix('-').unwrap_or(text);
    match digits.as_bytes() {
        [b'0'] => !text.starts_with('-'),
        [first, rest @ ..] => (b'1'..=b'9').contains(first) && rest.iter().all(u8::is_ascii_digit),
        [] => false,
    }
}

/// A canonical decimal value: no exponent, no trailing fractional zero and no
/// negative zero. Precision and scale limits belong to the Decimal policy
/// reader; this helper checks only the wire spelling.
fn is_canonical_decimal(text: &str) -> bool {
    let unsigned = text.strip_prefix('-').unwrap_or(text);
    if text.starts_with('-') && unsigned == "0" {
        return false;
    }
    let (whole, fraction) = unsigned.split_once('.').unwrap_or((unsigned, ""));
    if whole.is_empty()
        || !whole.chars().all(|ch| ch.is_ascii_digit())
        || (whole.len() > 1 && whole.starts_with('0'))
    {
        return false;
    }
    if fraction.is_empty() {
        return true;
    }
    fraction.chars().all(|ch| ch.is_ascii_digit()) && !fraction.ends_with('0')
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
        // A construct kind decides as `enumeration` when its declared shape
        // is one, and as no core kind otherwise; a native type reference
        // resolves to no document node, so it is always `scalar` (gap 1 of
        // FCD #199/#200).
        let (kind, scalar): (&str, &str) = match resolved {
            Resolved::Node(node) => {
                let kind = match crate::constructs::shape_of(document, node) {
                    Some(Shape::Enumeration) => "enumeration",
                    Some(_) => "construct",
                    None => node.get("kind").and_then(Json::as_str).unwrap_or(""),
                };
                let scalar = node.get("scalar").and_then(Json::as_str).unwrap_or("");
                (kind, scalar)
            }
            Resolved::Native(scalar) => ("scalar", scalar),
        };
        if !applies_to(keyword, kind, scalar) {
            sink.emit(
                constraint_at.to_string(),
                CONSTRAINT_NOT_APPLICABLE,
                "the applicability table does not admit this keyword on this resolved kind",
            );
            return;
        }
        if matches!(keyword, "min" | "max" | "exclusiveMin" | "exclusiveMax")
            && matches!(scalar, "integer" | "decimal" | "number")
        {
            // An integer bound may be a canonical decimal string, so a value
            // past 2^53 is exact; a `number` bound is a JSON number.
            let admitted = match constraint.get("operands").and_then(|o| o.get("value")) {
                Some(Json::Number(_)) | None => scalar != "decimal",
                Some(Json::Str(text)) => {
                    (scalar == "integer" && is_canonical_integer(text))
                        || (scalar == "decimal" && is_canonical_decimal(text))
                }
                Some(_) => false,
            };
            if !admitted {
                sink.emit(
                    child(&child(constraint_at, "operands"), "value"),
                    INVALID_OPERAND,
                    "a numeric keyword on a numeric scalar takes an exact numeric operand",
                );
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
    let declared: HashSet<&str> = document
        .types
        .iter()
        .filter_map(|definition| definition.get("identity").and_then(Json::as_str))
        .collect();
    if let Some(occurrences) = document.ir.get("occurrences").and_then(Json::as_array) {
        for (position, occurrence) in occurrences.iter().enumerate() {
            if let Some(definition) = occurrence.get("definition").and_then(Json::as_str) {
                if !declared.contains(definition) {
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
///
/// A depth-first walk with an explicit frame stack and a colour per type, so
/// a cycle of any length is found on any thread and each type is entered once.
fn composite_graph(document: &Document<'_>, sink: &mut Sink<'_>) {
    let by_identity = &document.by_identity;
    let mut colour = vec![Colour::White; document.types.len()];
    for start in 0..document.types.len() {
        if colour[start] != Colour::White {
            continue;
        }
        if let Some(found) = composite_walk(document, by_identity, &mut colour, start) {
            sink.emit(
                found,
                COMPOSITE_CYCLE,
                "the composite relationship graph is required to be acyclic",
            );
            return;
        }
    }
}

/// A node's state in a depth-first walk: unvisited, on the walk's path, or
/// finished.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Colour {
    White,
    Grey,
    Black,
}

/// The walk from `start`, returning the pointer of the first back edge.
fn composite_walk(
    document: &Document<'_>,
    by_identity: &HashMap<&str, usize>,
    colour: &mut [Colour],
    start: usize,
) -> Option<String> {
    // Each frame is a type on the path and the next of its relationships to
    // examine.
    let mut path: Vec<(usize, usize)> = vec![(start, 0)];
    colour[start] = Colour::Grey;
    while let Some(&mut (at, ref mut next_relationship)) = path.last_mut() {
        let relationships = document
            .types
            .get(at)
            .and_then(|definition| definition.get("relationships"))
            .and_then(Json::as_array)
            .unwrap_or(&[]);
        let Some(relationship) = relationships.get(*next_relationship) else {
            colour[at] = Colour::Black;
            path.pop();
            continue;
        };
        let member = *next_relationship;
        *next_relationship += 1;
        if relationship.get("composite").and_then(Json::as_bool) != Some(true) {
            continue;
        }
        let Some(target) = relationship
            .get("targetEnd")
            .and_then(|end| end.get("type"))
            .and_then(Json::as_str)
        else {
            continue;
        };
        let Some(&next) = by_identity.get(target) else {
            continue;
        };
        match colour[next] {
            Colour::Grey => {
                let relationships_at = child(&index("/ir/types", at), "relationships");
                return Some(child(
                    &child(&index(&relationships_at, member), "targetEnd"),
                    "type",
                ));
            }
            Colour::White => {
                colour[next] = Colour::Grey;
                path.push((next, 0));
            }
            Colour::Black => {}
        }
    }
    None
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
    let mut by_identity: HashMap<&str, usize> = HashMap::with_capacity(packages.len());
    for (position, package) in packages.iter().enumerate() {
        let identity = package.get("identity").and_then(Json::as_str).unwrap_or("");
        by_identity.entry(identity).or_insert(position);
    }
    let mut colour = vec![Colour::White; packages.len()];
    for start in 0..packages.len() {
        if colour[start] != Colour::White {
            continue;
        }
        if let Some(found) = package_walk(packages, &by_identity, &mut colour, start) {
            return Some(found);
        }
    }
    None
}

/// The depth-first walk of the package graph from `start`, over an explicit
/// frame stack, returning the pointer of the first back edge.
fn package_walk(
    packages: &[Json],
    by_identity: &HashMap<&str, usize>,
    colour: &mut [Colour],
    start: usize,
) -> Option<String> {
    let mut path: Vec<(usize, usize)> = vec![(start, 0)];
    colour[start] = Colour::Grey;
    while let Some(&mut (at, ref mut next_dependency)) = path.last_mut() {
        let dependencies = packages
            .get(at)
            .and_then(|package| package.get("dependencies"))
            .and_then(Json::as_array)
            .unwrap_or(&[]);
        let Some(dependency) = dependencies.get(*next_dependency) else {
            colour[at] = Colour::Black;
            path.pop();
            continue;
        };
        *next_dependency += 1;
        let Some(&next) = dependency.as_str().and_then(|name| by_identity.get(name)) else {
            continue;
        };
        match colour[next] {
            Colour::Grey => {
                return Some(child(&index("/lock/packages", at), "dependencies"));
            }
            Colour::White => {
                colour[next] = Colour::Grey;
                path.push((next, 0));
            }
            Colour::Black => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{
        composite_graph, decide, decide_with, native_scalar, package_cycle, walk_alias, AliasMemo,
        Document, Resolved, RuleLimits, Sink, Walk, COMPOSITE_CYCLE, CONSTRAINT_NOT_APPLICABLE,
        DEPTH_LIMIT_EXCEEDED, NATIVE_PREFIX, NATIVE_SCALARS, UNIT_ON_NON_SCALAR,
        UNRESOLVED_TYPE_REF,
    };
    use crate::json::parse;
    use crate::json::Json;

    /// Owner ruling (2026-09-19T15:39:32Z) on FCD #199, superseding R2 of the
    /// #199/#200 review round: `FLAGS_ON_NON_COLLECTION` is deleted outright,
    /// not corrected. Every emitted multiplicity carries `ordered`/`unique`,
    /// clamped to `false` at emission when `upper` is at most one — the
    /// reader no longer checks the combination at all, so a document
    /// carrying `ordered`/`unique` `true` alongside a single-valued `upper`
    /// (a shape a producer should never emit, but the reader no longer
    /// polices) is not refused.
    ///
    /// Tracing: TC-1806
    /// ACs: FR-027-AC-8
    #[test]
    fn tc_1806_ordered_and_unique_are_never_refused_by_the_reader() {
        let field = |ordered: bool, unique: bool, upper: i64| {
            format!(
                r#"{{"identity": "ix://acme/pkg/T/f", "name": "f", "typeRef": "ix://quire/native/String", "multiplicity": {{"lower": 0, "upper": {upper}, "ordered": {ordered}, "unique": {unique}}}}}"#
            )
        };
        let wrap = |field: String| {
            parse(&format!(
                r#"{{"ir": {{"contractVersion": "2.0.0", "types": [{{"identity": "ix://acme/pkg/T", "kind": "record", "fields": [{field}]}}]}}}}"#
            ))
            .expect("a document")
        };

        for (ordered, unique, upper) in [
            (true, false, 1),
            (false, true, 1),
            (false, false, 1),
            (true, true, 5),
        ] {
            let decided = decide(&wrap(field(ordered, unique, upper)));
            assert!(
                decided.is_empty(),
                "ordered={ordered}, unique={unique}, upper={upper} is not refused: {decided:?}"
            );
        }
    }

    /// Finding 2 of the FCD #199/#200 review: `field_rules` runs each of a
    /// field's inline `constraints` through the same `constraint_rules` a
    /// type-level constraint goes through, with the field itself as the
    /// resolved subject (gap 1's field-as-subject shape). Before that fix
    /// this loop did not exist, so an inline constraint's keyword was never
    /// checked against the applicability table; a `min` constraint inline on
    /// a `String` field is the same (kind, keyword) pair FR-093-AC-6 already
    /// covers for a type-scoped subject, so this is the field-inline call
    /// site nothing previously exercised. Deleting the loop at
    /// `field_rules`'s `field.get("constraints")` branch must fail this
    /// test.
    ///
    /// Tracing: TC-1813
    /// ACs: FR-093-AC-6, FR-093-CON-4
    #[test]
    fn tc_1813_an_inline_field_constraint_is_checked_for_applicability() {
        let bundle = parse(
            r#"{
                "ir": {
                    "contractVersion": "2.0.0",
                    "types": [
                        {
                            "identity": "ix://acme/pkg/T",
                            "kind": "record",
                            "fields": [
                                {
                                    "identity": "ix://acme/pkg/T/f",
                                    "name": "f",
                                    "typeRef": "ix://quire/native/String",
                                    "constraints": [
                                        {
                                            "identity": "ix://acme/pkg/constraint/T-f-min",
                                            "keyword": "min",
                                            "appliesTo": "ix://acme/pkg/T/f",
                                            "operands": {"value": 0},
                                            "diagnosticCode": "agent-ix.acme.T_F_MIN"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }"#,
        )
        .expect("a document");
        let diagnostics = decide(&bundle);
        assert!(
            diagnostics
                .iter()
                .any(|located| located.code == CONSTRAINT_NOT_APPLICABLE),
            "min is inapplicable to a string-valued field, and an inline field \
             constraint's applicability must be checked the same as a type-level \
             constraint's: {diagnostics:?}"
        );
    }

    /// Two fields whose `typeRef`s name each other, with `unit` on one of
    /// them so `field_rules` calls `Document::resolve` on the cycle (FCD
    /// #199/#200 review finding 1): before the fix this recursed through
    /// `field_of` with no bound and overflowed the stack. `decide` must
    /// return, not abort the process, and the cycle must not resolve to a
    /// scalar.
    ///
    /// Tracing: TC-1805
    /// ACs: FR-059-AC-11
    #[test]
    fn tc_1805_a_mutual_field_typeref_cycle_does_not_overflow_the_stack() {
        let bundle = parse(
            r#"{
                "ir": {
                    "contractVersion": "2.0.0",
                    "types": [
                        {
                            "identity": "ix://acme/pkg/T",
                            "kind": "record",
                            "fields": [
                                {
                                    "identity": "ix://acme/pkg/T/a",
                                    "name": "a",
                                    "typeRef": "ix://acme/pkg/T/b",
                                    "unit": "m"
                                },
                                {
                                    "identity": "ix://acme/pkg/T/b",
                                    "name": "b",
                                    "typeRef": "ix://acme/pkg/T/a"
                                }
                            ]
                        }
                    ]
                }
            }"#,
        )
        .expect("a document");
        let diagnostics = decide(&bundle);
        assert!(
            diagnostics
                .iter()
                .any(|located| located.code == UNIT_ON_NON_SCALAR),
            "a unit on a field whose typeRef closes a cycle resolves to no scalar: {diagnostics:?}"
        );
        assert!(
            diagnostics
                .iter()
                .filter(|located| located.code == UNRESOLVED_TYPE_REF)
                .count()
                == 2,
            "each field's typeRef names another field, not a declared type: {diagnostics:?}"
        );
    }

    /// R3 of the FCD #199/#200 review: this crate's `NATIVE_SCALARS` is one
    /// of six independent copies of the FR-032 kernel scalar library (the
    /// others are the Node IR reader, the Python reader, the JSON-Schema
    /// backend, the rust-serde backend, and the v1-1 TS reader); each is
    /// checked against the canonical `packages/semantic-core/kernel-scalars.json`
    /// rather than against each other, and none is refactored into a shared
    /// module.
    ///
    /// Tracing: TC-1807
    /// ACs: FR-032-AC-3
    #[test]
    fn tc_1807_native_scalars_agrees_with_kernel_scalars_json() {
        let canonical = parse(include_str!(
            "../../../packages/semantic-core/kernel-scalars.json"
        ))
        .expect("kernel-scalars.json parses");
        let scalars = canonical
            .get("scalars")
            .and_then(Json::as_object)
            .expect("kernel-scalars.json carries a scalars object");
        assert_eq!(
            scalars.len(),
            NATIVE_SCALARS.len(),
            "the canonical library and this crate's copy declare the same count"
        );
        for (name, definition) in scalars {
            let canonical_scalar = definition
                .get("irScalar")
                .and_then(Json::as_str)
                .unwrap_or_else(|| panic!("{name} carries no irScalar"));
            let declared = native_scalar(&format!("{NATIVE_PREFIX}{name}"));
            assert_eq!(
                declared,
                Some(canonical_scalar),
                "{name} maps to {canonical_scalar} in kernel-scalars.json"
            );
        }
    }

    /// A ring of `count` record types, each carrying one composite
    /// relationship to the next and the last closing the ring on the first,
    /// or, when `closed` is false, an acyclic chain with the last type
    /// relating to nothing.
    fn composite_ring(count: usize, closed: bool) -> Json {
        let mut text = String::from(r#"{"ir":{"contractVersion":"2.0.0","types":["#);
        for position in 0..count {
            if position > 0 {
                text.push(',');
            }
            let relationships = if position + 1 < count || closed {
                let next = (position + 1) % count;
                format!(
                    r#","relationships":[{{"composite":true,"targetEnd":{{"type":"ix://acme/pkg/T{next}"}}}}]"#
                )
            } else {
                String::new()
            };
            text.push_str(&format!(
                r#"{{"identity":"ix://acme/pkg/T{position}","kind":"record"{relationships}}}"#
            ));
        }
        text.push_str("]}}");
        parse(&text).expect("a document")
    }

    /// Runs `check` on a 512 KiB thread, a stack a recursion that grows with
    /// the cycle's length would overflow.
    fn on_a_small_stack(check: impl FnOnce() + Send + 'static) {
        std::thread::Builder::new()
            .stack_size(512 * 1024)
            .spawn(check)
            .expect("spawn a 512 KiB thread")
            .join()
            .expect("the cycle walk must not overflow a 512 KiB stack");
    }

    /// The composite cycle codes `composite_graph` emits over `bundle`.
    fn composite_cycles(bundle: &Json) -> usize {
        let document = Document::read(bundle).expect("an IR document");
        let mut sink = Sink {
            bundle,
            out: Vec::new(),
        };
        composite_graph(&document, &mut sink);
        sink.out
            .iter()
            .filter(|located| located.code == COMPOSITE_CYCLE)
            .count()
    }

    /// A composite cycle is reported whatever its length: a ring longer than
    /// the 256 types an old depth bound allowed went unreported.
    ///
    /// Tracing: TC-1821
    /// ACs: FR-059-AC-19
    #[test]
    fn tc_1821_a_composite_cycle_of_300_types_is_reported() {
        let bundle = composite_ring(300, true);
        let diagnostics = decide(&bundle);
        assert_eq!(
            diagnostics
                .iter()
                .filter(|located| located.code == COMPOSITE_CYCLE)
                .count(),
            1,
            "{diagnostics:?}"
        );
        assert_eq!(composite_cycles(&composite_ring(300, false)), 0);
    }

    /// Tracing: TC-1821
    /// ACs: FR-059-AC-19
    #[test]
    fn tc_1821_a_composite_cycle_of_100000_types_is_reported_on_a_small_stack() {
        on_a_small_stack(|| {
            assert_eq!(composite_cycles(&composite_ring(100_000, true)), 1);
            assert_eq!(composite_cycles(&composite_ring(100_000, false)), 0);
        });
    }

    fn package_ring(count: usize, closed: bool) -> Json {
        let mut text = String::from(r#"{"packages":["#);
        for position in 0..count {
            if position > 0 {
                text.push(',');
            }
            let dependencies = if position + 1 < count || closed {
                format!(r#""ix://acme/pkg{}""#, (position + 1) % count)
            } else {
                String::new()
            };
            text.push_str(&format!(
                r#"{{"identity":"ix://acme/pkg{position}","dependencies":[{dependencies}]}}"#
            ));
        }
        text.push_str("]}");
        parse(&text).expect("a lock")
    }

    /// Tracing: TC-1821
    /// ACs: FR-059-AC-19
    #[test]
    fn tc_1821_a_package_cycle_of_any_length_is_reported() {
        assert!(package_cycle(&package_ring(300, true)).is_some());
        assert!(package_cycle(&package_ring(300, false)).is_none());
        on_a_small_stack(|| {
            assert!(package_cycle(&package_ring(100_000, true)).is_some());
            assert!(package_cycle(&package_ring(100_000, false)).is_none());
        });
    }

    /// `count` alias types, each naming the next, the last naming a record,
    /// so the chain is acyclic and `count` links long.
    fn alias_chain(count: usize) -> Json {
        let mut text = String::from(r#"{"ir":{"contractVersion":"2.0.0","types":["#);
        for position in 0..count {
            if position > 0 {
                text.push(',');
            }
            let target = if position + 1 < count {
                format!("ix://acme/pkg/A{}", position + 1)
            } else {
                "ix://acme/pkg/Leaf".to_string()
            };
            text.push_str(&format!(
                r#"{{"identity":"ix://acme/pkg/A{position}","kind":"alias","target":"{target}"}}"#
            ));
        }
        text.push_str(r#",{"identity":"ix://acme/pkg/Leaf","kind":"record"}]}}"#);
        parse(&text).expect("a document")
    }

    /// An acyclic alias chain of any length resolves and walks without a
    /// depth report unless the caller configures a depth limit, and a
    /// configured limit reports exactly the chains past it.
    ///
    /// Tracing: TC-1821
    /// ACs: FR-059-AC-20
    #[test]
    fn tc_1821_an_alias_chain_resolves_at_any_length_unless_a_limit_is_configured() {
        on_a_small_stack(|| {
            let bundle = alias_chain(100_000);
            let document = Document::read(&bundle).expect("an IR document");
            let first = document.types.first().expect("a first alias");
            assert!(matches!(
                document.resolve("ix://acme/pkg/A0"),
                Some(Resolved::Node(_))
            ));
            assert!(matches!(
                walk_alias(&document, first, &mut AliasMemo::new()),
                Walk::Resolved
            ));
            let limited = Document::read_with(
                &bundle,
                RuleLimits {
                    alias_depth: Some(256),
                },
            )
            .expect("an IR document");
            assert!(limited.resolve("ix://acme/pkg/A0").is_none());
            assert!(matches!(
                walk_alias(&limited, first, &mut AliasMemo::new()),
                Walk::TooDeep
            ));
        });
        let bundle = alias_chain(300);
        let default = decide(&bundle);
        assert!(
            default
                .iter()
                .all(|located| located.code != DEPTH_LIMIT_EXCEEDED),
            "{default:?}"
        );
        let configured = decide_with(
            &bundle,
            RuleLimits {
                alias_depth: Some(256),
            },
        );
        assert!(
            configured
                .iter()
                .any(|located| located.code == DEPTH_LIMIT_EXCEEDED),
            "{configured:?}"
        );
    }
}
