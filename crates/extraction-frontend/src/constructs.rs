//! FR-143: lift an object-type artifact to the construct kind its module
//! declares (FR-142), with the rules the declaration selects decided at the
//! artifact.
//!
//! Nothing here names a construct kind. [`shape`] reads the artifact's
//! [`Construct`] declaration: it refuses what a forbidden member or a
//! selected rule does not admit, and fills each member the declaration does
//! not forbid from the extraction and the artifact's frontmatter edges. A
//! refusal is `ARTIFACT_NOT_LOWERED` (`not-lowered`, reason `other`) at the
//! artifact head: a construct is never emitted with a rule approximated, and
//! a member the declaration requires and this frontend has no source for is
//! refused, never emitted empty.
//!
//! # Engine-extracted members
//!
//! `states`, `transitions`, `steps` and `vocabulary` are filled from the
//! engine's structured extraction (quire-rs FR-075 `model`); no diagram,
//! table or prose is re-parsed here. A state, transition or step mints its
//! identity under FR-095 from the artifact id. A transition's `trigger` is
//! the identity of the artifact's operation it names and its `guard` the
//! clause id it names; a transition's `emits` and a step's `consumes` and
//! `emits` name artifacts of the bundle by artifact id, each carrying a role
//! the declaration admits for the member. A reference that names none of
//! those refuses the artifact rather than being dropped or guessed.
//!
//! [`unlowered_declaration`] refuses an artifact whose extraction carries a
//! declaration no construct member lowers — FR-075 generalization, abstract
//! types, field features, effect frames, populations and `Members` tables,
//! a model table for a member the declaration forbids, and FR-076
//! relationship rows, extracted or not (this frontend supplies the engine
//! no relation vocabulary) — so that nothing authored is silently lost. An
//! unavailable `model` is refused the same way.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_semantic_ir::vocabulary::{Declaration, Member, Presence, Rule, Shape};
use quire_rs::semantic::{
    AvailabilityState, EnumValueDecl, ModelDeclarations, SemanticExtraction, StepDecl, TermDecl,
    TransitionDecl,
};
use serde::Serialize;

use crate::bundle::Construct;
use crate::clauses::{Clause, Operation};
use crate::diagnostics::{Code, Diagnostic, Disposition, Locus, NotLoweredReason};
use crate::edges::Relationship;
use crate::identity::Unsluggable;
use crate::lower::{
    ArtifactContext, Field, LowerError, Lowering, Origin, TypeDefinition, IDENTITY_FIELD_EXTENSION,
};
use crate::resolve::{Resolution, Resolved, Site};
use crate::scalars::KernelScalar;

/// The frontmatter verb whose targets a namespace-shaped construct groups.
const NAMESPACE_MEMBERSHIP: &str = "contains";
/// The frontmatter verb whose targets a construct persists.
const PERSISTENCE: &str = "persists";

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

pub(crate) fn refusal(id: &str, path: &str, object: &str, rule: &str, head: Locus) -> Diagnostic {
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

/// Whether `declaration` forbids `member`.
fn forbids(declaration: &Declaration, member: Member) -> bool {
    declaration.presence(member) == Presence::Forbidden
}

/// Give `definition`, already lowered as a record, the construct kind the
/// artifact's object type declares and the members its extraction and edges
/// determine; the `ARTIFACT_NOT_LOWERED` refusal when the declaration does
/// not admit it (FR-143 "Rules at the artifact"). An object type with no
/// declaration keeps the record. `owner` is assigned afterwards by
/// [`assign_owners`], which sees every construct.
pub(crate) fn shape(
    object: &str,
    extraction: &SemanticExtraction,
    artifact_roles: &BTreeMap<String, Vec<String>>,
    definition: &mut TypeDefinition,
    resolutions: &[Resolved],
    ctx: &ArtifactContext<'_>,
) -> Result<(), LowerError> {
    let declaration = ctx.construct.map(|construct| &construct.declaration);
    if let Some(rule) = unlowered_declaration(declaration, extraction) {
        return Err(refuse(ctx, object, &rule));
    }
    let Some(declaration) = declaration else {
        return Ok(());
    };
    definition.kind = ctx.kind();
    let model = extraction.model.clone().unwrap_or_default();
    let refused = |rule: &str| Err(refuse(ctx, object, rule));

    let identity_fields: Vec<String> = fields(definition)
        .iter()
        .filter(|f| is_identity_field(f))
        .map(|f| f.identity.clone())
        .collect();
    if declaration.has_rule(Rule::IdentityFieldRequired) && identity_fields.is_empty() {
        return refused("it declares no identity field, and the construct is identified by one");
    }
    if declaration.has_rule(Rule::IdentityFieldForbidden) && !identity_fields.is_empty() {
        return refused("it declares an identity field, and the construct is equal by value");
    }
    if declaration.has_rule(Rule::MinClauses)
        && definition.clauses.as_deref().unwrap_or(&[]).is_empty()
    {
        return refused("it declares no invariant, and the construct requires one");
    }
    let occurrence: Vec<String> = fields(definition)
        .iter()
        .filter(|f| {
            resolutions.iter().any(|r| {
                r.artifact == ctx.id
                    && r.site == Site::Field
                    && r.field == f.name
                    && r.resolution == Resolution::KernelScalar(KernelScalar::Timestamp)
            })
        })
        .map(|f| f.identity.clone())
        .collect();
    if declaration.has_rule(Rule::OccurrenceFieldRequired) && occurrence.len() != 1 {
        return refused(&format!(
            "it declares {} Timestamp fields, and the construct names exactly one occurrence field",
            occurrence.len()
        ));
    }
    if forbids(declaration, Member::Fields) && !fields(definition).is_empty() {
        return refused("it declares fields, and the construct carries none");
    }
    if forbids(declaration, Member::Operations) && !operations(definition).is_empty() {
        return refused("it declares operations, and the construct carries none");
    }
    if forbids(declaration, Member::Relationships) && !relationships(definition).is_empty() {
        return refused("it declares relationships, and the construct carries none");
    }
    if forbids(declaration, Member::Clauses)
        && !definition.clauses.as_deref().unwrap_or(&[]).is_empty()
    {
        return refused("it declares clauses, and the construct carries none");
    }
    if declaration.has_rule(Rule::MinOperations) && operations(definition).is_empty() {
        return refused("it declares no operation, and the construct requires one");
    }
    if let Some(member) = Member::ALL
        .iter()
        .copied()
        .find(|member| declaration.presence(*member) == Presence::Required && !lowers(*member))
    {
        return refused(&format!(
            "the construct requires {}, which this frontend has no source for",
            member.name()
        ));
    }

    let clear = |member: Member| forbids(declaration, member);
    if clear(Member::Fields) {
        definition.fields = None;
    }
    if clear(Member::Operations) {
        definition.operations = None;
    }
    if clear(Member::Relationships) {
        definition.relationships = None;
    }
    if clear(Member::Clauses) {
        definition.clauses = None;
    }
    let mut members = std::mem::take(&mut definition.construct);
    if !identity_fields.is_empty() && !forbids(declaration, Member::IdentityFields) {
        members.identity_fields = Some(identity_fields);
    }
    if let [field] = occurrence.as_slice() {
        if !forbids(declaration, Member::OccurrenceField) {
            members.occurrence_field = Some(field.clone());
        }
    }
    if !forbids(declaration, Member::Members) {
        let edges = relationships(definition).iter();
        members.members = Some(if declaration.shape == Shape::Namespace {
            targets(edges.filter(|r| r.verb == NAMESPACE_MEMBERSHIP))
        } else {
            targets(edges.filter(|r| r.composite))
        });
    }
    if !forbids(declaration, Member::Persists) {
        members.persists = Some(targets(
            relationships(definition)
                .iter()
                .filter(|r| r.verb == PERSISTENCE),
        ));
    }
    let lifted = |member: Member, authored: bool| {
        !forbids(declaration, member)
            && (authored || declaration.presence(member) == Presence::Required)
    };
    if lifted(Member::States, model.states.is_some()) {
        members.states = Some(lift_states(model.states.as_deref().unwrap_or(&[]), ctx)?);
    }
    let references = References {
        declaration,
        artifact_roles,
    };
    if lifted(Member::Transitions, model.transitions.is_some()) {
        members.transitions = Some(lift_transitions(
            model.transitions.as_deref().unwrap_or(&[]),
            definition,
            &references,
            ctx,
            object,
        )?);
    }
    if lifted(Member::Steps, model.steps.is_some()) {
        members.steps = Some(lift_steps(
            model.steps.as_deref().unwrap_or(&[]),
            &references,
            ctx,
            object,
        )?);
    }
    if lifted(Member::Vocabulary, model.vocabulary.is_some()) {
        members.vocabulary = Some(lift_vocabulary(
            model.vocabulary.as_deref().unwrap_or(&[]),
            ctx,
        ));
    }
    definition.construct = members;
    Ok(())
}

/// Whether this frontend has a source for `member`: the record's own
/// members, the construct members it fills here or in [`assign_owners`],
/// and the enumeration path's `variants`.
const fn lowers(member: Member) -> bool {
    match member {
        Member::Fields
        | Member::Variants
        | Member::Relationships
        | Member::Operations
        | Member::Clauses
        | Member::IdentityFields
        | Member::Owner
        | Member::Members
        | Member::OccurrenceField
        | Member::States
        | Member::Transitions
        | Member::Steps
        | Member::Persists
        | Member::Vocabulary => true,
        Member::Supertypes
        | Member::Abstract
        | Member::Direction
        | Member::InterfaceType
        | Member::Multiplicity
        | Member::DeclaredType
        | Member::FlowDirection
        | Member::SourceEnd
        | Member::TargetEnd
        | Member::SourceElement
        | Member::TargetElement
        // The pinned engine reads fields and operations from two separate
        // sections, so no source row order spans both.
        | Member::FeatureOrder => false,
    }
}

/// The declaration of `extraction` no member of the construct `declaration`
/// declares lowers (a plain record when `None`), as the rule its refusal
/// names; `None` when every declaration lowers.
///
/// An unavailable `model` is refused too: the engine failed a declared model
/// feature, and a construct is never lowered from part of its declarations.
pub(crate) fn unlowered_declaration(
    declaration: Option<&Declaration>,
    extraction: &SemanticExtraction,
) -> Option<String> {
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
    unlowered_model_feature(declaration, model)
        .map(|feature| format!("it declares {feature}, which no member of the construct lowers"))
}

/// The first FR-075 feature of `model` the construct `declaration` does not
/// lower: `values` lower on an enumeration shape only, and a model table
/// lowers where the declaration does not forbid its member.
fn unlowered_model_feature(
    declaration: Option<&Declaration>,
    model: &ModelDeclarations,
) -> Option<&'static str> {
    let admits =
        |member: Member| declaration.is_some_and(|declaration| !forbids(declaration, member));
    let enumeration =
        declaration.is_some_and(|declaration| declaration.shape == Shape::Enumeration);
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
        part,
        port,
        connection,
        allocation,
        feature_order,
    } = model;
    let declared: [(bool, &'static str, bool); 16] = [
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
        (values.is_some(), "a `Values` table", enumeration),
        (states.is_some(), "a `States` table", admits(Member::States)),
        (
            transitions.is_some(),
            "a `Transitions` table",
            admits(Member::Transitions),
        ),
        (
            steps.is_some(),
            "a `Workflow` steps table",
            admits(Member::Steps),
        ),
        (
            vocabulary.is_some(),
            "a `Ubiquitous Language` table",
            admits(Member::Vocabulary),
        ),
        (part.is_some(), "a systems `part` table", false),
        (port.is_some(), "a systems `port` table", false),
        (connection.is_some(), "a systems `connection` table", false),
        (allocation.is_some(), "a systems `allocation` table", false),
        (feature_order.is_some(), "a `Features` table", false),
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

/// What a transition's or step's type references are admitted by: the
/// declaration's role lists and every object-typed artifact's IR roles.
struct References<'a> {
    declaration: &'a Declaration,
    artifact_roles: &'a BTreeMap<String, Vec<String>>,
}

impl References<'_> {
    /// The type identities of `names`, each the id of an artifact of the
    /// bundle carrying a role the declaration admits for `member` (any
    /// object-typed artifact when it constrains none) and named once; the
    /// refusal rule naming the first that is not, or the first named twice
    /// (a duplicate is refused, never collapsed).
    fn identities(
        &self,
        member: Member,
        names: Option<&[String]>,
        ctx: &ArtifactContext<'_>,
        site: &str,
    ) -> Result<Vec<String>, String> {
        let admitted = self.declaration.roles(member);
        let mut out = Vec::new();
        for name in names.unwrap_or(&[]) {
            let identity = self
                .artifact_roles
                .get(name)
                .filter(|roles| {
                    admitted.is_none_or(|admitted| roles.iter().any(|role| admitted.contains(role)))
                })
                .and_then(|_| ctx.package.type_identity(name).ok())
                .ok_or_else(|| {
                    format!(
                        "{site} names `{name}`, which is the artifact id of no type of the bundle the construct's {} admit",
                        member.name()
                    )
                })?;
            if out.contains(&identity) {
                return Err(format!(
                    "{site} names `{name}` twice, and one cell names each type at most once"
                ));
            }
            out.push(identity);
        }
        Ok(out)
    }
}

/// One `transition` per `Transitions` row, in row order.
fn lift_transitions(
    decls: &[TransitionDecl],
    definition: &TypeDefinition,
    references: &References<'_>,
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
                &format!("{site}: its trigger names no operation of the artifact"),
            ));
        };
        if let Some(guard) = &decl.guard {
            if !clauses.iter().any(|clause| &clause.clause_id == guard) {
                return Err(refuse(
                    ctx,
                    object,
                    &format!("{site}: its guard `{guard}` names no clause of the artifact"),
                ));
            }
        }
        let emits = references
            .identities(Member::Transitions, decl.emits.as_deref(), ctx, &site)
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
    references: &References<'_>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Vec<Step>, LowerError> {
    let mut out = Vec::with_capacity(decls.len());
    let mut unsluggable = Vec::new();
    for decl in decls {
        let site = format!("step {}", decl.name);
        let consumes = references
            .identities(Member::Steps, decl.consumes.as_deref(), ctx, &site)
            .map_err(|rule| refuse(ctx, object, &rule))?;
        let emits = references
            .identities(Member::Steps, decl.emits.as_deref(), ctx, &site)
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
    /// The construct the artifact's object type declares, if any.
    pub construct: Option<Construct>,
}

/// Assign every construct that carries `owner` its owner and apply refusals
/// to a fixed point.
///
/// An artifact's owner is the one type, carrying a role the declaration
/// admits for `owner` (any type when it constrains none), whose composite
/// relationship targets it; with no such owner, or more than one, it is
/// refused. An artifact whose relationship targets an identity in `refused`
/// (an artifact of this bundle that lowered to nothing) is refused too. Each
/// refusal can orphan an owned construct or leave another edge dangling, so
/// the pass repeats until no artifact is refused, and no emitted owner or
/// relationship names a refused artifact. A transition or step naming a type
/// that is not among the artifacts still pending is refused the same way. A
/// refused artifact is removed with its aliases; its own diagnostics are
/// kept, before its refusal.
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

/// One type whose composite relationship targets another.
struct Owner {
    identity: String,
    roles: Vec<String>,
}

/// Every composite target, with the types whose composite relationships
/// target it.
fn composite_owners(pending: &[Pending]) -> BTreeMap<String, Vec<Owner>> {
    let mut owners: BTreeMap<String, Vec<Owner>> = BTreeMap::new();
    for item in pending {
        let definition = &item.lowering.definition;
        for edge in relationships(definition).iter().filter(|r| r.composite) {
            let list = owners.entry(edge.target.clone()).or_default();
            if !list
                .iter()
                .any(|owner| owner.identity == definition.identity)
            {
                list.push(Owner {
                    identity: definition.identity.clone(),
                    roles: definition.roles.clone(),
                });
            }
        }
    }
    owners
}

/// The rule `item` breaks this round, or `None` after assigning its owner.
fn refusal_rule(
    item: &mut Pending,
    owners: &BTreeMap<String, Vec<Owner>>,
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
    let type_refs = construct
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
    if let Some(target) = type_refs.into_iter().find(|t| !lowered.contains(*t)) {
        return Some(format!(
            "a transition or step names the type {target}, which lowers to nothing"
        ));
    }
    let declaration = &item.construct.as_ref()?.declaration;
    if forbids(declaration, Member::Owner) {
        return None;
    }
    let admitted = declaration.roles(Member::Owner);
    let found: Vec<&Owner> = owners
        .get(&definition.identity)
        .into_iter()
        .flatten()
        .filter(|owner| {
            admitted.is_none_or(|admitted| owner.roles.iter().any(|role| admitted.contains(role)))
        })
        .collect();
    match found.as_slice() {
        [owner] => {
            definition.construct.owner = Some(owner.identity.clone());
            None
        }
        [] if declaration.presence(Member::Owner) == Presence::Optional
            && !declaration.has_rule(Rule::SingleOwner) =>
        {
            None
        }
        _ => Some(format!(
            "{} types contain it, and the construct has exactly one owner",
            found.len()
        )),
    }
}
