//! FR-143: lift an object-type artifact to the IR construct its object type
//! names (FR-142), with the construct's built-in rules decided at the
//! artifact.
//!
//! [`construct_kind`] maps the ten business object types onto the ten
//! contract 1.2.0 construct kinds; any other object type lowers to a
//! `record`. [`shape`] fills the construct members the extraction and the
//! artifact's frontmatter edges determine, and refuses an artifact that
//! breaks a built-in rule with `ARTIFACT_NOT_LOWERED` (`not-lowered`, reason
//! `other`) at the artifact head: a construct is never emitted with a rule
//! approximated.
//!
//! # Engine-extracted members
//!
//! `states`, `transitions`, `steps` and `vocabulary` are filled from the
//! engine's structured extraction; no diagram or prose is re-parsed here.
//! The pinned quire-rs revision extracts none of them, so each list is
//! emitted empty until filament-core-data#154 bumps the engine and lifts
//! them (TC-1755).

use std::collections::{BTreeMap, BTreeSet};

use serde::Serialize;

use crate::clauses::Operation;
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason};
use crate::edges::Relationship;
use crate::lower::{
    ArtifactContext, Field, Kind, LowerError, Lowering, Origin, TypeDefinition,
    IDENTITY_FIELD_EXTENSION,
};
use crate::resolve::{Resolution, Resolved, Site};
use crate::scalars::KernelScalar;

/// The frontmatter verb whose targets a `domain` groups.
const DOMAIN_MEMBERSHIP: &str = "contains";
/// The frontmatter verb whose targets a `repository` persists.
const PERSISTENCE: &str = "persists";

/// The construct kind of an object type (FR-143 "Construct kinds"): the ten
/// business object types name their construct; every other object type is a
/// `record`.
pub fn construct_kind(object: &str) -> Kind {
    match object {
        "entity" => Kind::Entity,
        "value_object" => Kind::ValueObject,
        "nested_entity" => Kind::NestedEntity,
        "aggregate_root" => Kind::AggregateRoot,
        "enumeration" => Kind::Enumeration,
        "event" => Kind::Event,
        "state_machine" => Kind::StateMachine,
        "process" => Kind::Process,
        "repository" => Kind::Repository,
        "domain" => Kind::Domain,
        _ => Kind::Record,
    }
}

/// `semantic-ir.schema.json#/$defs/typeDefinition`, the construct members
/// (FR-141, FR-142). Every member is absent unless the construct carries it.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstructMembers {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_fields: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub occurrence_field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub states: Option<Vec<State>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transitions: Option<Vec<Transition>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steps: Option<Vec<Step>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub persists: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vocabulary: Option<Vec<Term>>,
}

/// `semantic-ir.schema.json#/$defs/state`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct State {
    pub identity: String,
    pub name: String,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/transition`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Transition {
    pub identity: String,
    pub from: String,
    pub to: String,
    pub trigger: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guard: Option<String>,
    pub emits: Vec<String>,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/step/stepKind`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StepKind {
    Command,
    Event,
    Decision,
    Compensation,
    Wait,
}

/// `semantic-ir.schema.json#/$defs/step`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Step {
    pub identity: String,
    pub name: String,
    pub step_kind: StepKind,
    pub consumes: Vec<String>,
    pub emits: Vec<String>,
    pub origin: Origin,
}

/// `semantic-ir.schema.json#/$defs/term`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Term {
    pub term: String,
    pub doc: String,
    pub origin: Origin,
}

/// The `ARTIFACT_NOT_LOWERED` refusal of an artifact breaking a built-in
/// rule of its construct.
fn refuse(ctx: &ArtifactContext<'_>, object: &str, rule: &str) -> LowerError {
    LowerError::Blocked(vec![refusal(ctx.id, ctx.path, object, rule, ctx.head())])
}

fn refusal(id: &str, path: &str, object: &str, rule: &str, head: Locus) -> Diagnostic {
    Diagnostic::with_disposition(
        Code::ArtifactNotLowered,
        Disposition::NotLowered(NotLoweredReason::Other),
        format!("artifact {id} ({path}) lowers to no `{object}` construct: {rule}"),
        Some(head),
    )
}

fn is_identity_field(field: &Field) -> bool {
    field
        .extensions
        .iter()
        .any(|e| e.identity == IDENTITY_FIELD_EXTENSION)
}

fn fields(definition: &TypeDefinition) -> &[Field] {
    definition.fields.as_deref().unwrap_or(&[])
}

fn relationships(definition: &TypeDefinition) -> &[Relationship] {
    definition.relationships.as_deref().unwrap_or(&[])
}

fn operations(definition: &TypeDefinition) -> &[Operation] {
    definition.operations.as_deref().unwrap_or(&[])
}

/// Relationship targets, first occurrence order, de-duplicated.
fn targets<'a>(edges: impl Iterator<Item = &'a Relationship>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for edge in edges {
        if !out.contains(&edge.target) {
            out.push(edge.target.clone());
        }
    }
    out
}

/// Give `definition`, already lowered as a record, the construct `object`
/// names and the members its extraction and edges determine; the
/// `ARTIFACT_NOT_LOWERED` refusal when a built-in rule is broken
/// (FR-143 "Built-in rules at the artifact"). A `nested_entity`'s `owner`
/// is assigned afterwards by [`assign_owners`], which sees every construct.
pub(crate) fn shape(
    object: &str,
    definition: &mut TypeDefinition,
    resolutions: &[Resolved],
    ctx: &ArtifactContext<'_>,
) -> Result<(), LowerError> {
    let kind = construct_kind(object);
    definition.kind = kind;
    let identity_fields: Vec<String> = fields(definition)
        .iter()
        .filter(|f| is_identity_field(f))
        .map(|f| f.identity.clone())
        .collect();
    let members = &mut definition.construct;
    match kind {
        Kind::Entity | Kind::NestedEntity | Kind::AggregateRoot | Kind::Process => {
            if identity_fields.is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares no identity field, and the construct is identified by one",
                ));
            }
            members.identity_fields = Some(identity_fields);
        }
        Kind::ValueObject | Kind::Event if !identity_fields.is_empty() => {
            return Err(refuse(
                ctx,
                object,
                "it declares an identity field, and the construct is equal by value",
            ));
        }
        _ => {}
    }
    match kind {
        Kind::AggregateRoot => {
            if definition.clauses.as_deref().unwrap_or(&[]).is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares no invariant, and an aggregate root is the boundary that enforces one",
                ));
            }
            definition.construct.members = Some(targets(
                relationships(definition).iter().filter(|r| r.composite),
            ));
        }
        Kind::Event => {
            let occurrence: Vec<&Field> = fields(definition)
                .iter()
                .filter(|f| {
                    resolutions.iter().any(|r| {
                        r.artifact == ctx.id
                            && r.site == Site::Field
                            && r.field == f.name
                            && r.resolution == Resolution::KernelScalar(KernelScalar::Timestamp)
                    })
                })
                .collect();
            let [field] = occurrence.as_slice() else {
                return Err(refuse(
                    ctx,
                    object,
                    &format!(
                        "it declares {} Timestamp fields, and an event names exactly one occurrence field",
                        occurrence.len()
                    ),
                ));
            };
            definition.construct.occurrence_field = Some(field.identity.clone());
        }
        Kind::StateMachine => {
            if operations(definition).is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares no operation, and every transition is triggered by one",
                ));
            }
            definition.construct.states = Some(Vec::new());
            definition.construct.transitions = Some(Vec::new());
        }
        Kind::Process => definition.construct.steps = Some(Vec::new()),
        Kind::Repository => {
            if !fields(definition).is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares fields, and a repository carries operations only",
                ));
            }
            if operations(definition).is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares no operation, and a repository is its persistence operations",
                ));
            }
            definition.fields = None;
            definition.construct.persists = Some(targets(
                relationships(definition)
                    .iter()
                    .filter(|r| r.verb == PERSISTENCE),
            ));
        }
        Kind::Domain => {
            if !fields(definition).is_empty() || !operations(definition).is_empty() {
                return Err(refuse(
                    ctx,
                    object,
                    "it declares fields or operations, and a domain declares a boundary, not data",
                ));
            }
            definition.fields = None;
            definition.operations = None;
            definition.construct.members = Some(targets(
                relationships(definition)
                    .iter()
                    .filter(|r| r.verb == DOMAIN_MEMBERSHIP),
            ));
            definition.construct.vocabulary = Some(Vec::new());
        }
        _ => {}
    }
    Ok(())
}

/// One lowered artifact awaiting the bundle-wide construct pass.
#[derive(Debug, Clone)]
pub(crate) struct Pending {
    pub id: String,
    pub path: String,
    pub object: String,
    pub head: Locus,
    pub lowering: Lowering,
}

/// Assign every `nested_entity` its `owner` and apply refusals to a fixed
/// point.
///
/// A nested entity's owner is the one entity, nested entity or aggregate root
/// whose composite relationship targets it; with no such owner, or more than
/// one, it is refused. An artifact whose relationship targets an identity in
/// `refused` (an artifact of this bundle that lowered to nothing) is refused
/// too. Each refusal can orphan a nested entity or leave another edge
/// dangling, so the pass repeats until no artifact is refused, and no emitted
/// owner or relationship names a refused artifact. A refused artifact is
/// removed with its aliases; its own diagnostics are kept, before its refusal.
pub(crate) fn assign_owners(
    pending: &mut Vec<Pending>,
    mut refused: BTreeSet<String>,
) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    loop {
        let owners = composite_owners(pending);
        let mut round: Vec<(Pending, String)> = Vec::new();
        let mut kept = Vec::with_capacity(pending.len());
        for mut item in pending.drain(..) {
            match refusal_rule(&mut item, &owners, &refused) {
                Some(rule) => round.push((item, rule)),
                None => kept.push(item),
            }
        }
        *pending = kept;
        if round.is_empty() {
            return diagnostics;
        }
        for (item, rule) in round {
            refused.insert(item.lowering.definition.identity.clone());
            diagnostics.extend(item.lowering.diagnostics);
            diagnostics.push(refusal(
                &item.id,
                &item.path,
                &item.object,
                &rule,
                item.head,
            ));
        }
    }
}

/// Every composite target, with the identities of the entities, nested
/// entities and aggregate roots that contain it.
fn composite_owners(pending: &[Pending]) -> BTreeMap<String, Vec<String>> {
    let mut owners: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for item in pending {
        let definition = &item.lowering.definition;
        if !matches!(
            definition.kind,
            Kind::Entity | Kind::NestedEntity | Kind::AggregateRoot
        ) {
            continue;
        }
        for edge in relationships(definition).iter().filter(|r| r.composite) {
            let list = owners.entry(edge.target.clone()).or_default();
            if !list.contains(&definition.identity) {
                list.push(definition.identity.clone());
            }
        }
    }
    owners
}

/// The rule `item` breaks this round, or `None` after assigning its owner.
fn refusal_rule(
    item: &mut Pending,
    owners: &BTreeMap<String, Vec<String>>,
    refused: &BTreeSet<String>,
) -> Option<String> {
    let definition = &mut item.lowering.definition;
    if let Some(edge) = relationships(definition)
        .iter()
        .find(|r| refused.contains(&r.target))
    {
        return Some(format!(
            "its `{}` relationship targets {}, which lowers to nothing",
            edge.verb, edge.target
        ));
    }
    if definition.kind != Kind::NestedEntity {
        return None;
    }
    let found = owners
        .get(&definition.identity)
        .map(Vec::as_slice)
        .unwrap_or(&[]);
    if let [owner] = found {
        definition.construct.owner = Some(owner.clone());
        None
    } else {
        Some(format!(
            "{} entities contain it, and a nested entity has exactly one owner",
            found.len()
        ))
    }
}
