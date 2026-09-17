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
//! engine's structured extraction (quire-rs FR-075 `model`); no diagram,
//! table or prose is re-parsed here. A state, transition or step mints its
//! identity under FR-095 from the artifact id. A transition's `trigger` is
//! the identity of the state machine's operation it names and its `guard`
//! the clause id it names; a transition's `emits` and a step's `consumes`
//! and `emits` name event artifacts of the bundle by artifact id. A
//! reference that names none of those refuses the artifact rather than
//! being dropped or guessed.
//!
//! [`unlowered_declaration`] refuses an artifact whose extraction carries a
//! declaration no construct member lowers — FR-075 generalization, abstract
//! types, field features, effect frames, populations and `Members` tables,
//! a model table on a construct that has no such member, and FR-076
//! relationship rows, extracted or not (this frontend supplies the engine
//! no relation vocabulary) — so that nothing authored is silently lost. An
//! unavailable `model` is refused the same way.

use std::collections::{BTreeMap, BTreeSet};

use quire_rs::semantic::{
    AvailabilityState, EnumValueDecl, ModelDeclarations, SemanticExtraction, StepDecl, TermDecl,
    TransitionDecl,
};
use serde::Serialize;

use crate::clauses::{Clause, Operation};
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason};
use crate::edges::Relationship;
use crate::identity::Unsluggable;
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

impl From<quire_rs::semantic::StepKind> for StepKind {
    fn from(kind: quire_rs::semantic::StepKind) -> Self {
        use quire_rs::semantic::StepKind as Engine;
        match kind {
            Engine::Command => StepKind::Command,
            Engine::Event => StepKind::Event,
            Engine::Decision => StepKind::Decision,
            Engine::Compensation => StepKind::Compensation,
            Engine::Wait => StepKind::Wait,
        }
    }
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
    extraction: &SemanticExtraction,
    events: &BTreeSet<String>,
    definition: &mut TypeDefinition,
    resolutions: &[Resolved],
    ctx: &ArtifactContext<'_>,
) -> Result<(), LowerError> {
    let kind = construct_kind(object);
    if let Some(rule) = unlowered_declaration(kind, extraction) {
        return Err(refuse(ctx, object, &rule));
    }
    let model = extraction.model.clone().unwrap_or_default();
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
            let states = lift_states(model.states.as_deref().unwrap_or(&[]), ctx)?;
            let transitions = lift_transitions(
                model.transitions.as_deref().unwrap_or(&[]),
                definition,
                events,
                ctx,
                object,
            )?;
            definition.construct.states = Some(states);
            definition.construct.transitions = Some(transitions);
        }
        Kind::Process => {
            definition.construct.steps = Some(lift_steps(
                model.steps.as_deref().unwrap_or(&[]),
                events,
                ctx,
                object,
            )?);
        }
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
            definition.construct.vocabulary = Some(lift_vocabulary(
                model.vocabulary.as_deref().unwrap_or(&[]),
                ctx,
            ));
        }
        _ => {}
    }
    Ok(())
}

/// The declaration of `extraction` no member of a `kind` construct lowers,
/// as the rule its refusal names; `None` when every declaration lowers.
///
/// An unavailable `model` is refused too: the engine failed a declared model
/// feature, and a construct is never lowered from part of its declarations.
pub(crate) fn unlowered_declaration(kind: Kind, extraction: &SemanticExtraction) -> Option<String> {
    if let Some(availability) = &extraction.availability.model {
        if availability.state == AvailabilityState::Unavailable {
            return Some(format!(
                "the engine's model extraction is unavailable ({})",
                availability.reason.as_deref().unwrap_or("no reason given")
            ));
        }
    }
    if let Some(availability) = &extraction.availability.relations {
        if availability.state == AvailabilityState::Unavailable {
            return Some(format!(
                "it declares relationship rows (quire-rs FR-076) the engine did not extract ({})",
                availability.reason.as_deref().unwrap_or("no reason given")
            ));
        }
    }
    if extraction
        .relations
        .as_deref()
        .is_some_and(|r| !r.is_empty())
    {
        return Some(
            "it declares relationship rows (quire-rs FR-076), which this frontend does not lower (filament-core-data#156)"
                .to_string(),
        );
    }
    let model = extraction.model.as_ref()?;
    unlowered_model_feature(kind, model)
        .map(|feature| format!("it declares {feature}, which no member of the construct lowers"))
}

/// The first FR-075 feature of `model` a `kind` construct does not lower.
fn unlowered_model_feature(kind: Kind, model: &ModelDeclarations) -> Option<&'static str> {
    // Every member of the engine's record: a new one fails to compile here
    // until it is decided.
    let ModelDeclarations {
        identity: _,
        display_name: _,
        supertypes,
        abstract_type,
        field_features,
        operation_frames,
        population,
        values,
        states,
        transitions,
        steps,
        members,
        vocabulary,
    } = model;
    let declared: [(bool, &'static str, bool); 11] = [
        (supertypes.is_some(), "a `specializes` supertype", false),
        (abstract_type.is_some(), "an `abstract` flag", false),
        (
            field_features.is_some(),
            "Presence, Subsets or Redefines cells",
            false,
        ),
        (
            operation_frames.is_some(),
            "Modifies, Creates or Deletes lines",
            false,
        ),
        (population.is_some(), "a population `Members` table", false),
        (members.is_some(), "a `Members` table", false),
        (
            values.is_some(),
            "a `Values` table",
            kind == Kind::Enumeration,
        ),
        (
            states.is_some(),
            "a `States` table",
            kind == Kind::StateMachine,
        ),
        (
            transitions.is_some(),
            "a `Transitions` table",
            kind == Kind::StateMachine,
        ),
        (
            steps.is_some(),
            "a `Workflow` steps table",
            kind == Kind::Process,
        ),
        (
            vocabulary.is_some(),
            "a `Ubiquitous Language` table",
            kind == Kind::Domain,
        ),
    ];
    declared
        .into_iter()
        .find(|(present, _, lowered)| *present && !lowered)
        .map(|(_, feature, _)| feature)
}

/// A blocking diagnostic per unsluggable name, or the lifted value.
fn finish<T>(value: T, unsluggable: Vec<Diagnostic>) -> Result<T, LowerError> {
    if unsluggable.is_empty() {
        Ok(value)
    } else {
        Err(LowerError::Blocked(unsluggable))
    }
}

fn origin(ctx: &ArtifactContext<'_>, span: &quire_rs::semantic::SourceLocus) -> Origin {
    Origin::Source(ctx.at(span.start_line, span.start_column))
}

/// `UNSLUGGABLE_NAME` at the row that declares the name.
fn unsluggable_at(
    ctx: &ArtifactContext<'_>,
    span: &quire_rs::semantic::SourceLocus,
    unsluggable: Unsluggable,
) -> Diagnostic {
    unsluggable.diagnostic(ctx.at(span.start_line, span.start_column))
}

/// One `state` per `States` row, in row order.
fn lift_states(
    decls: &[EnumValueDecl],
    ctx: &ArtifactContext<'_>,
) -> Result<Vec<State>, LowerError> {
    let mut out = Vec::with_capacity(decls.len());
    let mut unsluggable = Vec::new();
    for decl in decls {
        match ctx.package.state_identity(ctx.id, &decl.value) {
            Ok(identity) => out.push(State {
                identity,
                name: decl.value.clone(),
                origin: origin(ctx, &decl.source_span),
            }),
            Err(error) => unsluggable.push(unsluggable_at(ctx, &decl.source_span, error)),
        }
    }
    finish(out, unsluggable)
}

/// The type identities of `names`, each the id of an event artifact of the
/// bundle; the refusal rule naming the first that is not.
fn event_refs(
    names: Option<&[String]>,
    events: &BTreeSet<String>,
    ctx: &ArtifactContext<'_>,
    site: &str,
) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    for name in names.unwrap_or(&[]) {
        let identity = events
            .get(name)
            .and_then(|id| ctx.package.type_identity(id).ok())
            .ok_or_else(|| {
                format!("{site} names `{name}`, which is the artifact id of no event of the bundle")
            })?;
        if !out.contains(&identity) {
            out.push(identity);
        }
    }
    Ok(out)
}

/// One `transition` per `Transitions` row, in row order.
fn lift_transitions(
    decls: &[TransitionDecl],
    definition: &TypeDefinition,
    events: &BTreeSet<String>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Vec<Transition>, LowerError> {
    let clauses: &[Clause] = definition.clauses.as_deref().unwrap_or(&[]);
    let mut out = Vec::with_capacity(decls.len());
    let mut unsluggable = Vec::new();
    for decl in decls {
        let site = format!(
            "transition {} -> {} on {}",
            decl.from, decl.to, decl.trigger
        );
        let Some(trigger) = operations(definition)
            .iter()
            .find(|operation| operation.name == decl.trigger)
        else {
            return Err(refuse(
                ctx,
                object,
                &format!("{site}: its trigger names no operation of the state machine"),
            ));
        };
        if let Some(guard) = &decl.guard {
            if !clauses.iter().any(|clause| &clause.clause_id == guard) {
                return Err(refuse(
                    ctx,
                    object,
                    &format!("{site}: its guard `{guard}` names no clause of the state machine"),
                ));
            }
        }
        let emits = event_refs(decl.emits.as_deref(), events, ctx, &site)
            .map_err(|rule| refuse(ctx, object, &rule))?;
        let identities = (
            ctx.package.state_identity(ctx.id, &decl.from),
            ctx.package.state_identity(ctx.id, &decl.to),
            ctx.package
                .transition_identity(ctx.id, &decl.from, &decl.to, &decl.trigger),
        );
        match identities {
            (Ok(from), Ok(to), Ok(identity)) => out.push(Transition {
                identity,
                from,
                to,
                trigger: trigger.identity.clone(),
                guard: decl.guard.clone(),
                emits,
                origin: origin(ctx, &decl.source_span),
            }),
            (from, to, identity) => unsluggable.extend(
                [from.err(), to.err(), identity.err()]
                    .into_iter()
                    .flatten()
                    .take(1)
                    .map(|error| unsluggable_at(ctx, &decl.source_span, error)),
            ),
        }
    }
    finish(out, unsluggable)
}

/// One `step` per `Workflow` row, in row order.
fn lift_steps(
    decls: &[StepDecl],
    events: &BTreeSet<String>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Vec<Step>, LowerError> {
    let mut out = Vec::with_capacity(decls.len());
    let mut unsluggable = Vec::new();
    for decl in decls {
        let site = format!("step {}", decl.name);
        let consumes = event_refs(decl.consumes.as_deref(), events, ctx, &site)
            .map_err(|rule| refuse(ctx, object, &rule))?;
        let emits = event_refs(decl.emits.as_deref(), events, ctx, &site)
            .map_err(|rule| refuse(ctx, object, &rule))?;
        match ctx.package.step_identity(ctx.id, &decl.name) {
            Ok(identity) => out.push(Step {
                identity,
                name: decl.name.clone(),
                step_kind: decl.kind.into(),
                consumes,
                emits,
                origin: origin(ctx, &decl.source_span),
            }),
            Err(error) => unsluggable.push(unsluggable_at(ctx, &decl.source_span, error)),
        }
    }
    finish(out, unsluggable)
}

/// One `term` per `Ubiquitous Language` row, in row order.
fn lift_vocabulary(decls: &[TermDecl], ctx: &ArtifactContext<'_>) -> Vec<Term> {
    decls
        .iter()
        .map(|decl| Term {
            term: decl.term.clone(),
            doc: decl.doc.clone(),
            origin: origin(ctx, &decl.source_span),
        })
        .collect()
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
/// owner or relationship names a refused artifact. A transition or step naming
/// an event that is not among the artifacts still pending is refused the same
/// way. A refused artifact is
/// removed with its aliases; its own diagnostics are kept, before its refusal.
pub(crate) fn assign_owners(
    pending: &mut Vec<Pending>,
    mut refused: BTreeSet<String>,
) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    loop {
        let owners = composite_owners(pending);
        let lowered: BTreeSet<String> = pending
            .iter()
            .map(|item| item.lowering.definition.identity.clone())
            .collect();
        let mut round: Vec<(Pending, String)> = Vec::new();
        let mut kept = Vec::with_capacity(pending.len());
        for mut item in pending.drain(..) {
            match refusal_rule(&mut item, &owners, &refused, &lowered) {
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
    lowered: &BTreeSet<String>,
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
    let construct = &definition.construct;
    let event_refs = construct
        .transitions
        .iter()
        .flatten()
        .flat_map(|t| t.emits.iter())
        .chain(
            construct
                .steps
                .iter()
                .flatten()
                .flat_map(|s| s.consumes.iter().chain(s.emits.iter())),
        );
    if let Some(target) = event_refs.into_iter().find(|t| !lowered.contains(*t)) {
        return Some(format!(
            "a transition or step names the event {target}, which lowers to nothing"
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
