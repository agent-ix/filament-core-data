//! The contract 1.2.0 cross-field rules: the object-type constructs and the
//! model members.
//!
//! `docs/semantic-data-system/contracts-v1.md`, "Contract 1.2.0", states each
//! construct's built-in rules and the model members' meaning; the schema layer
//! decides their shapes, and this module decides every rule that needs a second
//! node of the document to decide.

use crate::diag::{child, index};
use crate::json::Json;
use crate::rules::{Document, Sink, DANGLING_CLAUSE_REF, DEPTH_LIMIT, UNRESOLVED_TYPE_REF};

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
}

/// The kinds an aggregate root's members may have.
const AGGREGATE_MEMBER_KINDS: &[&str] = &["entity", "value_object", "nested_entity", "enumeration"];
/// The kinds a nested entity's owner may have.
const OWNER_KINDS: &[&str] = &["entity", "nested_entity", "aggregate_root"];
/// The kinds a repository may persist.
const PERSISTED_KINDS: &[&str] = &["entity", "aggregate_root"];
/// The kinds a transition or step names as an event.
const EVENT_KINDS: &[&str] = &["event"];

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

fn kind_of(definition: &Json) -> &str {
    definition.get("kind").and_then(Json::as_str).unwrap_or("")
}

/// Decides every contract 1.2.0 cross-field rule.
pub(crate) fn decide(document: &Document<'_>, sink: &mut Sink<'_>) {
    for (position, definition) in document.types.iter().enumerate() {
        let type_at = index("/ir/types", position);
        supertypes(document, definition, &type_at, sink);
        features(document, definition, &type_at, sink);
        frames(document, definition, &type_at, sink);
        match kind_of(definition) {
            "nested_entity" => {
                target(
                    document,
                    definition.get("owner").and_then(Json::as_str),
                    &child(&type_at, "owner"),
                    OWNER_KINDS,
                    sink,
                );
            }
            "aggregate_root" => {
                targets(
                    document,
                    definition,
                    "members",
                    &type_at,
                    AGGREGATE_MEMBER_KINDS,
                    sink,
                );
            }
            "event" => occurrence_field(document, definition, &type_at, sink),
            "state_machine" => state_machine(document, definition, &type_at, sink),
            "process" => steps(document, definition, &type_at, sink),
            "repository" => {
                targets(
                    document,
                    definition,
                    "persists",
                    &type_at,
                    PERSISTED_KINDS,
                    sink,
                );
            }
            "domain" => {
                targets(document, definition, "members", &type_at, &[], sink);
            }
            _ => {}
        }
        if definition.has("identityFields") {
            identity_fields(document, definition, &type_at, sink);
        }
    }
    domain_membership(document, sink);
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

fn target(
    document: &Document<'_>,
    name: Option<&str>,
    at: &str,
    kinds: &[&str],
    sink: &mut Sink<'_>,
) {
    let Some(name) = name else {
        return;
    };
    match document.type_of(name) {
        None => sink.emit(
            at.to_string(),
            UNRESOLVED_CONSTRUCT_REF,
            "a construct member names a type the document declares",
        ),
        Some(found) if !kinds.is_empty() && !kinds.contains(&kind_of(found)) => sink.emit(
            at.to_string(),
            CONSTRUCT_TARGET_KIND,
            format!(
                "the named type is a {} and this member names one of {}",
                kind_of(found),
                kinds.join(", ")
            ),
        ),
        Some(found) if kinds.is_empty() && kind_of(found) == "domain" => sink.emit(
            at.to_string(),
            CONSTRUCT_TARGET_KIND,
            "a domain is a namespace for its members and is not itself a member",
        ),
        Some(_) => {}
    }
}

fn targets(
    document: &Document<'_>,
    definition: &Json,
    member: &str,
    type_at: &str,
    kinds: &[&str],
    sink: &mut Sink<'_>,
) {
    let member_at = child(type_at, member);
    for (position, name) in strings(definition.get(member)) {
        target(
            document,
            Some(name),
            &index(&member_at, position),
            kinds,
            sink,
        );
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
            "an event's occurrence field names a field of the event",
        );
        return;
    };
    let datetime = field
        .get("typeRef")
        .and_then(Json::as_str)
        .and_then(|type_ref| document.resolve(type_ref))
        .is_some_and(|resolved| {
            kind_of(resolved) == "scalar"
                && resolved.get("scalar").and_then(Json::as_str) == Some("datetime")
        });
    if !datetime {
        sink.emit(
            at,
            INVALID_OCCURRENCE_FIELD,
            "an event's occurrence field resolves to scalar datetime",
        );
    }
}

fn state_machine(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
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
                        "a transition's from and to name states of its state machine",
                    );
                }
            }
        }
        if let Some(trigger) = transition.get("trigger").and_then(Json::as_str) {
            if !operations.contains(&trigger) {
                sink.emit(
                    child(&transition_at, "trigger"),
                    UNRESOLVED_CONSTRUCT_REF,
                    "a transition's trigger names an operation of its state machine",
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
        targets(
            document,
            transition,
            "emits",
            &transition_at,
            EVENT_KINDS,
            sink,
        );
    }
}

fn steps(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let steps_at = child(type_at, "steps");
    for (position, step) in items(definition, "steps").iter().enumerate() {
        let step_at = index(&steps_at, position);
        for member in ["consumes", "emits"] {
            targets(document, step, member, &step_at, EVENT_KINDS, sink);
        }
    }
}

fn supertypes(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let at = child(type_at, "supertypes");
    let kind = kind_of(definition);
    for (position, name) in strings(definition.get("supertypes")) {
        match document.type_of(name) {
            None => sink.emit(
                index(&at, position),
                UNRESOLVED_CONSTRUCT_REF,
                "a supertype names a type the document declares",
            ),
            Some(parent) if kind_of(parent) != kind => sink.emit(
                index(&at, position),
                CONSTRUCT_TARGET_KIND,
                "a supertype has the kind of the type that specializes it",
            ),
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

fn frames(document: &Document<'_>, definition: &Json, type_at: &str, sink: &mut Sink<'_>) {
    let fields = visible_fields(document, definition);
    let operations_at = child(type_at, "operations");
    for (position, operation) in items(definition, "operations").iter().enumerate() {
        let Some(frame) = operation.get("frame") else {
            continue;
        };
        let frame_at = child(&index(&operations_at, position), "frame");
        let params = items(operation, "params");
        for member in ["modifies", "creates", "deletes"] {
            let member_at = child(&frame_at, member);
            for (slot, path) in strings(frame.get(member)) {
                let head = path.split('.').next().unwrap_or(path);
                let named = |node: &&Json| node.get("name").and_then(Json::as_str) == Some(head);
                if !fields.iter().any(named) && !params.iter().any(|param| named(&param)) {
                    sink.emit(
                        index(&member_at, slot),
                        UNRESOLVED_FRAME_PATH,
                        "a frame path starts at a field of the owning type or a parameter",
                    );
                }
            }
        }
    }
}

fn domain_membership(document: &Document<'_>, sink: &mut Sink<'_>) {
    let mut seen: Vec<&str> = Vec::new();
    for (position, definition) in document.types.iter().enumerate() {
        if kind_of(definition) != "domain" {
            continue;
        }
        let members_at = child(&index("/ir/types", position), "members");
        for (slot, name) in strings(definition.get("members")) {
            if seen.contains(&name) {
                sink.emit(
                    index(&members_at, slot),
                    MULTIPLE_DOMAIN_MEMBERSHIP,
                    "a type is a member of at most one domain",
                );
            } else {
                seen.push(name);
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
        for (slot, member) in items(population, "members").iter().enumerate() {
            let Some(type_ref) = member.get("typeRef").and_then(Json::as_str) else {
                continue;
            };
            if document.type_of(type_ref).is_none() {
                sink.emit(
                    child(&index(&members_at, slot), "typeRef"),
                    UNRESOLVED_TYPE_REF,
                    "a population member names a type the document declares",
                );
            }
        }
    }
}
