//! The contract 2.0.0 cross-field rules: the construct declarations and the
//! model members.
//!
//! `docs/semantic-data-system/contracts-v1.md`, "Contract 2.0.0", states the
//! meaning of each construct member and core rule. The schema layer decides
//! shapes and each type's member presence against its declaration; this
//! module decides every rule that needs a second node of the document: a
//! reference member naming a type, the targets a declaration admits, and the
//! rules that range over several types. It reads a kind only as the
//! `{module, name}` key of its declaration and never matches a kind name.

use crate::diag::{child, index};
use crate::json::Json;
use crate::rules::{Document, Sink, DANGLING_CLAUSE_REF, DEPTH_LIMIT, UNRESOLVED_TYPE_REF};
use crate::schema::SCHEMA_VIOLATION;
use crate::vocabulary::{Declaration, Member, Rule, Shape};

macro_rules! codes {
    ($($name:ident => $code:literal),* $(,)?) => {
        $(
            #[doc = concat!("`", $code, "`.")]
            pub const $name: &str = $code;
        )*
    };
}

codes! {
    UNRESOLVED_CONSTRUCT_REF => "agent-ix.semantic-ir.UNRESOLVED_CONSTRUCT_REF",
    CONSTRUCT_TARGET_KIND => "agent-ix.semantic-ir.CONSTRUCT_TARGET_KIND",
    INVALID_OCCURRENCE_FIELD => "agent-ix.semantic-ir.INVALID_OCCURRENCE_FIELD",
    SUPERTYPE_CYCLE => "agent-ix.semantic-ir.SUPERTYPE_CYCLE",
    UNRESOLVED_FEATURE_REF => "agent-ix.semantic-ir.UNRESOLVED_FEATURE_REF",
    INVALID_REDEFINITION => "agent-ix.semantic-ir.INVALID_REDEFINITION",
    UNRESOLVED_FRAME_PATH => "agent-ix.semantic-ir.UNRESOLVED_FRAME_PATH",
    MULTIPLE_DOMAIN_MEMBERSHIP => "agent-ix.semantic-ir.MULTIPLE_DOMAIN_MEMBERSHIP",
    CLAUSE_LANGUAGE_UNCHECKED => "agent-ix.semantic-ir.CLAUSE_LANGUAGE_UNCHECKED",
    INCOMPLETE_FEATURE_ORDER => "agent-ix.semantic-ir.INCOMPLETE_FEATURE_ORDER",
}

/// The one clause language a reader checks; every other admitted language is
/// carried unchecked (FR-141).
const CHECKED_CLAUSE_LANGUAGE: &str = "quire";

fn strings(value: Option<&Json>) -> Vec<(usize, &str)> {
    value
        .and_then(Json::as_array)
        .unwrap_or(&[])
        .iter()
        .enumerate()
        .filter_map(|(position, item)| item.as_str().map(|text| (position, text)))
        .collect()
}

fn items<'a>(definition: &'a Json, member: &str) -> &'a [Json] {
    definition
        .get(member)
        .and_then(Json::as_array)
        .unwrap_or(&[])
}

fn identity_of(node: &Json) -> Option<&str> {
    node.get("identity").and_then(Json::as_str)
}

/// The document's construct declarations, keyed by kind.
struct Declarations {
    entries: Vec<(Json, Declaration)>,
}

/// A `constructs` entry the rules cannot read: the pointer to the defect
/// and what is wrong. The schema layer refuses every such entry first, so a
/// document reaching the rules through [`crate::decide`] carries none.
struct UnreadEntry {
    pointer: String,
    message: String,
}

impl Declarations {
    fn read(document: &Document<'_>) -> Result<Self, UnreadEntry> {
        let entries = document
            .ir
            .get("constructs")
            .and_then(Json::as_array)
            .unwrap_or(&[]);
        let mut read = Vec::with_capacity(entries.len());
        for (position, entry) in entries.iter().enumerate() {
            let entry_at = index("/ir/constructs", position);
            let member = |name: &str| {
                entry.get(name).ok_or_else(|| UnreadEntry {
                    pointer: entry_at.clone(),
                    message: format!("a constructs entry carries {name}"),
                })
            };
            let kind = member("kind")?.clone();
            let declaration =
                Declaration::read(member("construct")?).map_err(|refused| UnreadEntry {
                    pointer: format!("{}{}", child(&entry_at, "construct"), refused.pointer),
                    message: refused.message,
                })?;
            read.push((kind, declaration));
        }
        Ok(Declarations { entries: read })
    }

    /// The declaration of `definition`'s construct kind; `None` for a core kind.
    fn of(&self, definition: &Json) -> Option<&Declaration> {
        let kind = definition.get("kind")?;
        kind.as_object()?;
        self.entries
            .iter()
            .find(|(declared, _)| same_kind(declared, kind))
            .map(|(_, declaration)| declaration)
    }
}

/// The declared shape of `definition`'s construct kind, read from the
/// document's `constructs` table; `None` for a core kind or a kind the table
/// does not declare.
pub(crate) fn shape_of(document: &Document<'_>, definition: &Json) -> Option<Shape> {
    let kind = definition.get("kind")?;
    kind.as_object()?;
    document
        .ir
        .get("constructs")
        .and_then(Json::as_array)?
        .iter()
        .find(|entry| {
            entry
                .get("kind")
                .is_some_and(|declared| same_kind(declared, kind))
        })
        .and_then(|entry| entry.get("construct")?.get("shape")?.as_str())
        .and_then(Shape::parse)
}

/// Whether two kinds are one: equal core kind strings, or equal
/// `{module, name}` pairs.
fn same_kind(left: &Json, right: &Json) -> bool {
    match (left.as_str(), right.as_str()) {
        (Some(left), Some(right)) => left == right,
        (None, None) => {
            let pair = |kind: &Json| {
                (
                    kind.get("module")
                        .and_then(Json::as_str)
                        .map(str::to_string),
                    kind.get("name").and_then(Json::as_str).map(str::to_string),
                )
            };
            left.as_object().is_some() && right.as_object().is_some() && pair(left) == pair(right)
        }
        _ => false,
    }
}

/// The kind as prose: a core kind, or `<module>/<name>`.
fn kind_label(definition: &Json) -> String {
    match definition.get("kind") {
        Some(Json::Str(kind)) => kind.clone(),
        Some(kind) => format!(
            "{}/{}",
            kind.get("module").and_then(Json::as_str).unwrap_or(""),
            kind.get("name").and_then(Json::as_str).unwrap_or("")
        ),
        None => String::new(),
    }
}

fn roles_of(definition: &Json) -> Vec<&str> {
    definition
        .get("roles")
        .and_then(Json::as_array)
        .unwrap_or(&[])
        .iter()
        .filter_map(Json::as_str)
        .collect()
}

/// Decides every contract 2.0.0 cross-field rule.
pub(crate) fn decide(document: &Document<'_>, sink: &mut Sink<'_>) {
    let declarations = match Declarations::read(document) {
        Ok(declarations) => declarations,
        Err(unread) => {
            sink.emit(unread.pointer, SCHEMA_VIOLATION, unread.message);
            return;
        }
    };
    for (position, definition) in document.types.iter().enumerate() {
        let type_at = index("/ir/types", position);
        supertypes(document, definition, &type_at, sink);
        features(document, definition, &type_at, sink);
        frames(document, definition, &type_at, sink);
        inline_clauses(definition, &type_at, sink);
        let Some(declaration) = declarations.of(definition) else {
            continue;
        };
        for member in Member::ALL {
            references(
                document,
                definition,
                &type_at,
                *member,
                declaration.roles(*member),
                sink,
            );
        }
        if declaration.has_rule(Rule::MembersNotNamespace) {
            members_not_namespace(document, &declarations, definition, &type_at, sink);
        }
        if definition.has("occurrenceField") {
            occurrence_field(document, definition, &type_at, sink);
        }
        if definition.has("transitions") {
            transitions(definition, &type_at, sink);
        }
        if definition.has("identityFields") {
            identity_fields(document, definition, &type_at, sink);
        }
        if definition.has("featureOrder") {
            feature_order(definition, &type_at, sink);
        }
    }
    exclusive_membership(document, &declarations, sink);
    populations(document, sink);
}

/// Every field of `definition` and of its transitive supertypes.
fn visible_fields<'a>(document: &Document<'a>, definition: &'a Json) -> Vec<&'a Json> {
    let mut out: Vec<&'a Json> = items(definition, "fields").iter().collect();
    for ancestor in ancestors(document, definition) {
        out.extend(items(ancestor, "fields"));
    }
    out
}

/// The transitive supertypes of `definition`, nearest first, each once.
fn ancestors<'a>(document: &Document<'a>, definition: &'a Json) -> Vec<&'a Json> {
    let mut out: Vec<&'a Json> = Vec::new();
    let mut seen: Vec<&str> = identity_of(definition).into_iter().collect();
    let mut frontier: Vec<&'a Json> = vec![definition];
    while let Some(current) = frontier.pop() {
        for (_, name) in strings(current.get("supertypes")) {
            if seen.contains(&name) || out.len() > DEPTH_LIMIT {
                continue;
            }
            seen.push(name);
            if let Some(parent) = document.type_of(name) {
                out.push(parent);
                frontier.push(parent);
            }
        }
    }
    out
}

/// Every entry of a reference member: `(pointer, named identity)`.
fn reference_entries(definition: &Json, type_at: &str, member: Member) -> Vec<(String, String)> {
    let name = member.name();
    let member_at = child(type_at, name);
    let mut out = Vec::new();
    match member.reference_items() {
        None => {}
        Some([]) => match definition.get(name) {
            Some(Json::Str(named)) => out.push((member_at, named.clone())),
            Some(_) => {
                for (position, named) in strings(definition.get(name)) {
                    out.push((index(&member_at, position), named.to_string()));
                }
            }
            None => {}
        },
        Some(item_members) => {
            let listed = items(definition, name)
                .iter()
                .enumerate()
                .map(|(position, item)| (index(&member_at, position), item));
            let own = definition
                .get(name)
                .filter(|value| value.as_object().is_some())
                .map(|value| (member_at.clone(), value));
            for (item_at, item) in listed.chain(own) {
                for item_member in item_members {
                    let entries_at = child(&item_at, item_member);
                    if let Some(named) = item.get(item_member).and_then(Json::as_str) {
                        out.push((entries_at, named.to_string()));
                        continue;
                    }
                    for (slot, named) in strings(item.get(item_member)) {
                        out.push((index(&entries_at, slot), named.to_string()));
                    }
                }
            }
        }
    }
    out
}

/// Each entry of reference member `member` names a declared type, carrying
/// one of the roles the declaration admits when it constrains the member.
///
/// `Member::SourceElement` alone also admits naming an operation of a
/// declared type (FR-152's `<id>/<operation>` allocation source form): that
/// entry resolves to the type declaring the named operation, and the role
/// check below runs against that owning type exactly as it would for a
/// direct type reference.
fn references(
    document: &Document<'_>,
    definition: &Json,
    type_at: &str,
    member: Member,
    admitted: Option<&[String]>,
    sink: &mut Sink<'_>,
) {
    for (at, name) in reference_entries(definition, type_at, member) {
        let found = document.type_of(&name).or_else(|| {
            (member == Member::SourceElement)
                .then(|| document.type_of_operation(&name))
                .flatten()
        });
        let Some(found) = found else {
            let message = if member == Member::SourceElement {
                "a construct member names a type the document declares, or an operation of one"
            } else {
                "a construct member names a type the document declares"
            };
            sink.emit(at, UNRESOLVED_CONSTRUCT_REF, message);
            continue;
        };
        let Some(admitted) = admitted else {
            continue;
        };
        let roles = roles_of(found);
        if !admitted.iter().any(|role| roles.contains(&role.as_str())) {
            sink.emit(
                at,
                CONSTRUCT_TARGET_KIND,
                format!(
                    "the named type is a {} carrying none of the roles {} admits: {}",
                    kind_label(found),
                    member.name(),
                    admitted.join(", ")
                ),
            );
        }
    }
}

/// `members_not_namespace`: no member is itself a namespace.
fn members_not_namespace(
    document: &Document<'_>,
    declarations: &Declarations,
    definition: &Json,
    type_at: &str,
    sink: &mut Sink<'_>,
) {
    for (at, name) in reference_entries(definition, type_at, Member::Members) {
        let namespace = document
            .type_of(&name)
            .and_then(|found| declarations.of(found))
            .is_some_and(|found| found.shape == Shape::Namespace);
        if namespace {
            sink.emit(
                at,
                CONSTRUCT_TARGET_KIND,
                "a namespace groups its members and is not itself a member",
            );
        }
    }
}

fn identity_fields(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let fields = visible_fields(document, definition);
    let at = child(type_at, "identityFields");
    for (position, name) in strings(definition.get("identityFields")) {
        if !fields.iter().any(|field| identity_of(field) == Some(name)) {
            sink.emit(
                index(&at, position),
                UNRESOLVED_CONSTRUCT_REF,
                "an identity field names a field of this type or of a supertype",
            );
        }
    }
}

/// Every `featureOrder` entry names exactly one field or operation the type
/// declares itself, and every such field and operation is named.
fn feature_order(definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let at = child(type_at, "featureOrder");
    let own: Vec<&str> = items(definition, "fields")
        .iter()
        .chain(items(definition, "operations"))
        .filter_map(identity_of)
        .collect();
    let entries = strings(definition.get("featureOrder"));
    for (position, name) in &entries {
        if own.iter().filter(|feature| *feature == name).count() != 1 {
            sink.emit(
                index(&at, *position),
                UNRESOLVED_CONSTRUCT_REF,
                "a featureOrder entry names exactly one field or operation this type declares",
            );
        }
    }
    for feature in own {
        if !entries.iter().any(|(_, name)| *name == feature) {
            sink.emit(
                at.clone(),
                INCOMPLETE_FEATURE_ORDER,
                format!(
                    "featureOrder names every field and operation of the type, and not {feature}"
                ),
            );
        }
    }
}

fn occurrence_field(
    document: &Document<'_>,
    definition: &Json,
    type_at: &str,
    sink: &mut Sink<'_>,
) {
    let Some(name) = definition.get("occurrenceField").and_then(Json::as_str) else {
        return;
    };
    let at = child(type_at, "occurrenceField");
    let fields = visible_fields(document, definition);
    let Some(field) = fields.iter().find(|field| identity_of(field) == Some(name)) else {
        sink.emit(
            at,
            UNRESOLVED_CONSTRUCT_REF,
            "an occurrence field names a field of the type or a supertype",
        );
        return;
    };
    let datetime = field
        .get("typeRef")
        .and_then(Json::as_str)
        .and_then(|type_ref| document.resolve(type_ref))
        .is_some_and(|resolved| resolved.kind() == "scalar" && resolved.scalar() == "datetime");
    if !datetime {
        sink.emit(
            at,
            INVALID_OCCURRENCE_FIELD,
            "an occurrence field resolves to scalar datetime",
        );
    }
}

/// A transition's `from` and `to` name states of its type, `trigger` an
/// operation and `guard` a clause.
fn transitions(definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let states: Vec<&str> = items(definition, "states")
        .iter()
        .filter_map(identity_of)
        .collect();
    let operations: Vec<&str> = items(definition, "operations")
        .iter()
        .filter_map(identity_of)
        .collect();
    let clause_ids: Vec<&str> = items(definition, "clauses")
        .iter()
        .filter_map(|clause| clause.get("clauseId").and_then(Json::as_str))
        .collect();
    let transitions_at = child(type_at, "transitions");
    for (position, transition) in items(definition, "transitions").iter().enumerate() {
        let transition_at = index(&transitions_at, position);
        for end in ["from", "to"] {
            if let Some(state) = transition.get(end).and_then(Json::as_str) {
                if !states.contains(&state) {
                    sink.emit(
                        child(&transition_at, end),
                        UNRESOLVED_CONSTRUCT_REF,
                        "a transition's from and to name states of its type",
                    );
                }
            }
        }
        if let Some(trigger) = transition.get("trigger").and_then(Json::as_str) {
            if !operations.contains(&trigger) {
                sink.emit(
                    child(&transition_at, "trigger"),
                    UNRESOLVED_CONSTRUCT_REF,
                    "a transition's trigger names an operation of its type",
                );
            }
        }
        if let Some(guard) = transition.get("guard").and_then(Json::as_str) {
            if !clause_ids.contains(&guard) {
                sink.emit(
                    child(&transition_at, "guard"),
                    DANGLING_CLAUSE_REF,
                    "a transition's guard binds by clauseId to a clause this type declares",
                );
            }
        }
    }
}

fn supertypes(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let at = child(type_at, "supertypes");
    let kind = definition.get("kind");
    for (position, name) in strings(definition.get("supertypes")) {
        match document.type_of(name) {
            None => sink.emit(
                index(&at, position),
                UNRESOLVED_CONSTRUCT_REF,
                "a supertype names a type the document declares",
            ),
            Some(parent)
                if !kind
                    .zip(parent.get("kind"))
                    .is_some_and(|(own, theirs)| same_kind(own, theirs)) =>
            {
                sink.emit(
                    index(&at, position),
                    CONSTRUCT_TARGET_KIND,
                    "a supertype has the kind of the type that specializes it",
                )
            }
            Some(_) => {}
        }
    }
    let Some(own) = identity_of(definition) else {
        return;
    };
    if definition.has("supertypes") && ancestors_reach(document, definition, own) {
        sink.emit(
            at,
            SUPERTYPE_CYCLE,
            "the generalization graph is acyclic and this type is its own supertype",
        );
    }
}

/// Whether walking the supertypes of `definition` reaches `identity`.
fn ancestors_reach(document: &Document<'_>, definition: &Json, identity: &str) -> bool {
    let mut seen: Vec<&str> = Vec::new();
    let mut frontier: Vec<&str> = strings(definition.get("supertypes"))
        .into_iter()
        .map(|(_, name)| name)
        .collect();
    while let Some(name) = frontier.pop() {
        if name == identity {
            return true;
        }
        if seen.contains(&name) || seen.len() > DEPTH_LIMIT {
            continue;
        }
        seen.push(name);
        if let Some(parent) = document.type_of(name) {
            frontier.extend(
                strings(parent.get("supertypes"))
                    .into_iter()
                    .map(|(_, n)| n),
            );
        }
    }
    false
}

fn features(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let inherited: Vec<&Json> = ancestors(document, definition)
        .into_iter()
        .flat_map(|ancestor| items(ancestor, "fields"))
        .collect();
    let fields_at = child(type_at, "fields");
    for (position, field) in items(definition, "fields").iter().enumerate() {
        let field_at = index(&fields_at, position);
        let subsets_at = child(&field_at, "subsets");
        for (slot, name) in strings(field.get("subsets")) {
            if !inherited
                .iter()
                .any(|other| identity_of(other) == Some(name))
            {
                sink.emit(
                    index(&subsets_at, slot),
                    UNRESOLVED_FEATURE_REF,
                    "a subsetted field is a field of a supertype",
                );
            }
        }
        let Some(name) = field.get("redefines").and_then(Json::as_str) else {
            continue;
        };
        match inherited
            .iter()
            .find(|other| identity_of(other) == Some(name))
        {
            None => sink.emit(
                child(&field_at, "redefines"),
                UNRESOLVED_FEATURE_REF,
                "a redefined field is a field of a supertype",
            ),
            Some(redefined) if !narrows(field, redefined) => sink.emit(
                child(&field_at, "redefines"),
                INVALID_REDEFINITION,
                "a redefinition keeps its multiplicity within the bounds of the field it redefines",
            ),
            Some(_) => {}
        }
    }
}

/// Whether `field`'s multiplicity lies within `redefined`'s.
fn narrows(field: &Json, redefined: &Json) -> bool {
    let bounds = |node: &Json| {
        let multiplicity = node.get("multiplicity");
        let lower = multiplicity
            .and_then(|m| m.get("lower"))
            .and_then(Json::as_i64)
            .unwrap_or(1);
        let upper = multiplicity
            .and_then(|m| m.get("upper"))
            .and_then(Json::as_i64);
        (lower, upper)
    };
    let (lower, upper) = bounds(field);
    let (outer_lower, outer_upper) = bounds(redefined);
    let upper_within = match (upper, outer_upper) {
        (_, None) => true,
        (None, Some(_)) => false,
        (Some(upper), Some(outer)) => upper <= outer,
    };
    lower >= outer_lower && upper_within
}

/// A frame's `modifies`, `creates` and `deletes` name declarations, never a
/// dotted access path (ADR-002). QSpec FR-340 admits any declared field or
/// relationship node in the package as a `modifies` target, and FR-013 has
/// no reachability limit, so `modifies` resolves against every field or
/// relationship node the whole document declares, never only the operation's
/// own type or its supertypes; `creates` and `deletes` resolve the same way
/// against every type node the document declares. FCD checks that each
/// entry is a declaration NodeRef of the right kind — a field or
/// relationship for `modifies`, a declared type for `creates`/`deletes` —
/// and nothing beyond that: it does not check reachability from the
/// operation's own type, and it does not check that a `creates`/`deletes`
/// target is specifically an object type or a process, which is bound at
/// QSL intake (FR-208) and never interpreted here. The frame's body
/// encoding and grant-range semantics (what a `modifies` entry ranges over,
/// what `creates`/`deletes` differ over, and relationship-end scope) are
/// still open in QSpec #101 (Q3 open with Peter) and #106; FCD carries no
/// shape for either question.
fn frames(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let features = document_features(document);
    let operations_at = child(type_at, "operations");
    for (position, operation) in items(definition, "operations").iter().enumerate() {
        let Some(frame) = operation.get("frame") else {
            continue;
        };
        let frame_at = child(&index(&operations_at, position), "frame");
        let modifies_at = child(&frame_at, "modifies");
        for (slot, name) in strings(frame.get("modifies")) {
            if !features.iter().any(|node| identity_of(node) == Some(name)) {
                sink.emit(
                    index(&modifies_at, slot),
                    UNRESOLVED_FRAME_PATH,
                    "a modifies entry names a field or relationship the document declares",
                );
            }
        }
        for member in ["creates", "deletes"] {
            let member_at = child(&frame_at, member);
            for (slot, name) in strings(frame.get(member)) {
                if document.type_of(name).is_none() {
                    sink.emit(
                        index(&member_at, slot),
                        UNRESOLVED_FRAME_PATH,
                        "a creates or deletes entry names a type the document declares",
                    );
                }
            }
        }
    }
}

/// Every field or relationship node the whole document declares, across
/// every type (FR-340; FR-013 has no reachability limit — a `modifies`
/// entry resolves against any of these, not only the operation's own type
/// or its supertypes).
fn document_features<'a>(document: &Document<'a>) -> Vec<&'a Json> {
    document
        .types
        .iter()
        .flat_map(|definition| {
            items(definition, "fields")
                .iter()
                .chain(items(definition, "relationships").iter())
        })
        .collect()
}

/// The advisory `CLAUSE_LANGUAGE_UNCHECKED` at every inline `pre` or `post`
/// clause whose language is not `quire`: the clause is carried, and
/// no reader checks or re-reads its text.
fn inline_clauses(definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let operations_at = child(type_at, "operations");
    for (position, operation) in items(definition, "operations").iter().enumerate() {
        let operation_at = index(&operations_at, position);
        for member in ["pre", "post"] {
            let member_at = child(&operation_at, member);
            for (slot, clause) in items(operation, member).iter().enumerate() {
                let Some(language) = clause.get("language").and_then(Json::as_str) else {
                    continue;
                };
                if language != CHECKED_CLAUSE_LANGUAGE {
                    sink.advise(
                        child(&index(&member_at, slot), "language"),
                        CLAUSE_LANGUAGE_UNCHECKED,
                        format!("clause language {language} is carried unchecked"),
                    );
                }
            }
        }
    }
}

/// `exclusive_membership`: a type is named by the members of at most one type
/// whose construct selects the rule.
fn exclusive_membership(document: &Document<'_>, declarations: &Declarations, sink: &mut Sink<'_>) {
    // Each named type with the position of the first type naming it. A type
    // named twice by one owner is the schema's `uniqueItems` refusal, not a
    // second membership.
    let mut seen: Vec<(&str, usize)> = Vec::new();
    for (position, definition) in document.types.iter().enumerate() {
        if !declarations
            .of(definition)
            .is_some_and(|declaration| declaration.has_rule(Rule::ExclusiveMembership))
        {
            continue;
        }
        let members_at = child(&index("/ir/types", position), "members");
        for (slot, name) in strings(definition.get("members")) {
            match seen.iter().find(|(named, _)| *named == name) {
                Some((_, owner)) if *owner == position => {}
                Some(_) => sink.emit(
                    index(&members_at, slot),
                    MULTIPLE_DOMAIN_MEMBERSHIP,
                    "a type is a member of at most one type of an exclusive-membership construct",
                ),
                None => seen.push((name, position)),
            }
        }
    }
}

fn populations(document: &Document<'_>, sink: &mut Sink<'_>) {
    let populations = document
        .ir
        .get("populations")
        .and_then(Json::as_array)
        .unwrap_or(&[]);
    for (position, population) in populations.iter().enumerate() {
        let members_at = child(&index("/ir/populations", position), "members");
        for (slot, type_ref) in strings(population.get("members")) {
            if document.type_of(type_ref).is_none() {
                sink.emit(
                    index(&members_at, slot),
                    UNRESOLVED_TYPE_REF,
                    "a population member names a type the document declares",
                );
            }
        }
    }
}
