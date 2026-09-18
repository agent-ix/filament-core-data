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
    AvailabilityState, ConnectionDirection, EnumValueDecl, FeatureKind, FeatureOrderDecl,
    ModelDeclarations, Multiplicity, PortDirection, SemanticExtraction, StepDecl, SupertypeDecl,
    TermDecl, TransitionDecl,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supertypes: Option<Vec<String>>,
    #[serde(rename = "abstract", skip_serializing_if = "Option::is_none")]
    pub is_abstract: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<Direction>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interface_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<Multiplicity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub declared_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flow_direction: Option<FlowDirection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_end: Option<ConnectionEnd>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_end: Option<ConnectionEnd>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_element: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_element: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feature_order: Option<Vec<String>>,
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

/// `semantic-ir.schema.json#/$defs/typeDefinition/direction`: a port's flow
/// direction (QSpec FR-152).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    In,
    Out,
    Inout,
}

impl From<PortDirection> for Direction {
    fn from(direction: PortDirection) -> Self {
        match direction {
            PortDirection::In => Direction::In,
            PortDirection::Out => Direction::Out,
            PortDirection::Inout => Direction::Inout,
        }
    }
}

/// `semantic-ir.schema.json#/$defs/typeDefinition/flowDirection`: a
/// connection's flow direction (QSpec FR-152).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FlowDirection {
    SourceToTarget,
    TargetToSource,
    Bidirectional,
}

impl From<ConnectionDirection> for FlowDirection {
    fn from(direction: ConnectionDirection) -> Self {
        match direction {
            ConnectionDirection::SourceToTarget => FlowDirection::SourceToTarget,
            ConnectionDirection::TargetToSource => FlowDirection::TargetToSource,
            ConnectionDirection::Bidirectional => FlowDirection::Bidirectional,
        }
    }
}

/// `semantic-ir.schema.json#/$defs/typeDefinition/sourceEnd` (and
/// `targetEnd`): a connection end's typed port and the end's own
/// multiplicity, when the row states one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ConnectionEnd {
    #[serde(rename = "type")]
    pub type_ref: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiplicity: Option<Multiplicity>,
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
    // A member with a per-artifact source table (unlike `states`/`transitions`
    // and the rest of the FR-075 model, which the engine's own extraction
    // gates) is required by the declaration but this artifact's own model
    // extraction carries no row for it: refused here, one artifact at a
    // time, rather than emitted empty. `Supertypes` and `Abstract` are not
    // checked here: [`lower_generalization`] makes that same check itself,
    // since it (unlike this function) also runs for an `enumeration`-shaped
    // artifact (FR-142's [`crate::enumeration::lower_enum`], which never
    // reaches `shape`), and a required-but-absent generalization member must
    // refuse an enumeration artifact too.
    if let Some(member) = Member::ALL.iter().copied().find(|&member| {
        !matches!(member, Member::Supertypes | Member::Abstract)
            && declaration.presence(member) == Presence::Required
            && has_source_table(member, &model) == Some(false)
    }) {
        return refused(&format!(
            "the construct requires {}, and this artifact declares none",
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
    let (supertypes, is_abstract) = lower_generalization(&model, &references, ctx, object)?;
    members.supertypes = supertypes;
    members.is_abstract = is_abstract;
    if !forbids(declaration, Member::FeatureOrder) {
        if let Some(decls) = &model.feature_order {
            members.feature_order = Some(lift_feature_order(decls, definition, ctx, object)?);
        }
    }
    if let Some(part) = &model.part {
        if !forbids(declaration, Member::Owner) {
            members.owner = Some(
                references
                    .identity(
                        Member::Owner,
                        &part.record.owner,
                        ctx,
                        "a systems `part` row",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
        if !forbids(declaration, Member::DeclaredType) {
            members.declared_type = Some(
                references
                    .identity(
                        Member::DeclaredType,
                        &part.record.declared_type.target,
                        ctx,
                        "a systems `part` row",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
        if !forbids(declaration, Member::Multiplicity) {
            members.multiplicity = Some(part.record.multiplicity.clone());
        }
    }
    if let Some(port) = &model.port {
        if !forbids(declaration, Member::Owner) {
            members.owner = Some(
                references
                    .identity(
                        Member::Owner,
                        &port.record.owner,
                        ctx,
                        "a systems `port` row",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
        if !forbids(declaration, Member::Direction) {
            members.direction = Some(port.record.direction.into());
        }
        if !forbids(declaration, Member::InterfaceType) {
            members.interface_type = Some(
                references
                    .identity(
                        Member::InterfaceType,
                        &port.record.interface_type.target,
                        ctx,
                        "a systems `port` row",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
        if !forbids(declaration, Member::Multiplicity) {
            members.multiplicity = Some(port.record.multiplicity.clone());
        }
    }
    if let Some(connection) = &model.connection {
        if !forbids(declaration, Member::SourceEnd) {
            members.source_end = Some(lower_connection_end(
                &connection.record.source_end,
                Member::SourceEnd,
                &references,
                ctx,
                object,
                "a systems connection's source",
            )?);
        }
        if !forbids(declaration, Member::TargetEnd) {
            members.target_end = Some(lower_connection_end(
                &connection.record.target_end,
                Member::TargetEnd,
                &references,
                ctx,
                object,
                "a systems connection's target",
            )?);
        }
        if !forbids(declaration, Member::FlowDirection) {
            members.flow_direction = Some(connection.record.flow_direction.into());
        }
    }
    if let Some(allocation) = &model.allocation {
        if !forbids(declaration, Member::SourceElement) {
            // FR-152: an allocation source may also name an operation of the
            // referenced artifact (the engine's member-qualified
            // `<id>/<operation>` form, quire-rs#462, resolved against that
            // artifact's own declared operations before this frontend ever
            // sees it). `References::identity` lowers that form to the
            // referenced artifact's operation identity
            // (`PackageIdentity::operation_identity`) rather than its type
            // identity; a source naming no operation lowers to the type
            // identity as before.
            members.source_element = Some(
                references
                    .identity(
                        Member::SourceElement,
                        &allocation.record.source_element,
                        ctx,
                        "a systems allocation's source",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
        if !forbids(declaration, Member::TargetElement) {
            members.target_element = Some(
                references
                    .identity(
                        Member::TargetElement,
                        &allocation.record.target_element,
                        ctx,
                        "a systems allocation's target",
                    )
                    .map_err(|rule| refuse(ctx, object, &rule))?,
            );
        }
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
        | Member::Vocabulary
        | Member::Supertypes
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
        | Member::FeatureOrder => true,
    }
}

/// Whether `member`'s value comes from a raw record on this artifact's own
/// model extraction (quire-rs FR-075), and if so whether that record is
/// present: `None` for a member whose source is the bundle-wide owner pass
/// (FR-143 [`assign_owners`]) or another already-lowered member, which this
/// function does not gate.
const fn has_source_table(member: Member, model: &ModelDeclarations) -> Option<bool> {
    match member {
        Member::Supertypes => Some(model.supertypes.is_some()),
        Member::Abstract => Some(model.abstract_type.is_some()),
        Member::FeatureOrder => Some(model.feature_order.is_some()),
        Member::DeclaredType => Some(model.part.is_some()),
        Member::Direction | Member::InterfaceType => Some(model.port.is_some()),
        Member::Multiplicity => Some(model.part.is_some() || model.port.is_some()),
        Member::SourceEnd | Member::TargetEnd | Member::FlowDirection => {
            Some(model.connection.is_some())
        }
        Member::SourceElement | Member::TargetElement => Some(model.allocation.is_some()),
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
        | Member::Vocabulary => None,
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
    let admits_all = |members: &[Member]| members.iter().copied().all(admits);
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
        (
            supertypes.is_some(),
            "a `specializes` supertype",
            admits(Member::Supertypes),
        ),
        (
            abstract_type.is_some(),
            "an `abstract` flag",
            admits(Member::Abstract),
        ),
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
        (
            part.is_some(),
            "a systems `part` table",
            admits_all(&[Member::Owner, Member::DeclaredType, Member::Multiplicity]),
        ),
        (
            port.is_some(),
            "a systems `port` table",
            admits_all(&[
                Member::Owner,
                Member::Direction,
                Member::InterfaceType,
                Member::Multiplicity,
            ]),
        ),
        (
            connection.is_some(),
            "a systems `connection` table",
            admits_all(&[Member::SourceEnd, Member::TargetEnd, Member::FlowDirection]),
        ),
        (
            allocation.is_some(),
            "a systems `allocation` table",
            admits_all(&[Member::SourceElement, Member::TargetElement]),
        ),
        (
            feature_order.is_some(),
            "a `Features` table",
            admits(Member::FeatureOrder),
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

/// What a transition's or step's type references are admitted by: the
/// declaration's role lists and every object-typed artifact's IR roles.
pub(crate) struct References<'a> {
    pub(crate) declaration: &'a Declaration,
    pub(crate) artifact_roles: &'a BTreeMap<String, Vec<String>>,
}

/// The bundle-local artifact id `name` denotes, and the operation it also
/// names when `member` is [`Member::SourceElement`] and the engine resolved a
/// member-qualified allocation source (FR-152's `<id>/<operation>` form,
/// quire-rs#462): the id alone (`Ok((id, None))`), when `name` carries no
/// `ix://` prefix at all — every reference member's raw table-cell text, from
/// every caller but the systems-model ones. Or, when the engine has already
/// resolved it to this bundle's own identity, the one id segment of that
/// identity, with the operation segment after it when the engine minted one
/// (`Ok((id, Some(op)))`): quire-rs mints three own-package shapes, depending
/// which resolver a systems-model reference cell went through —
/// `semantic::properties::map_type` (a `declaredType` or `interfaceType`
/// cell, FR-070) mints `ix://<org>/<repo>/type/<id>`, the same `type/<id>`
/// shape this frontend's own [`crate::identity::PackageIdentity::
/// type_identity`] mints; `semantic::target::resolve_target` (an `owner`,
/// `sourceElement`/`targetElement`, or connection-end cell) mints
/// `ix://<org>/<repo>/<id>` with no such segment; and a `sourceElement` cell
/// naming an operation mints that same shape with the operation appended
/// after one more `/` (`ix://<org>/<repo>/<id>/<operation>`), the engine
/// having already confirmed the referenced artifact declares it. Anything
/// else — an identity in another package (an imported reference, quire-rs
/// `Target::Imported`), or a member-qualified form on a member other than
/// `sourceElement` — is refused (`Err`) by its full identity, never mis-read
/// as a bare id of this bundle: stripping only the trailing path segment
/// would silently rebind `ix://other/pkg/SP_001` to a local artifact also
/// named `SP_001`.
fn bare_artifact_id<'a>(
    name: &'a str,
    own_package: &str,
    member: Member,
) -> Result<(&'a str, Option<&'a str>), &'a str> {
    let not_own_id = |id: &str| id.is_empty() || id.contains('/');
    match name.strip_prefix("ix://") {
        None => Ok((name, None)),
        Some(rest) => match rest
            .strip_prefix(own_package)
            .and_then(|tail| tail.strip_prefix('/'))
        {
            Some(id) if !not_own_id(id) => Ok((id, None)),
            Some(tail) => match tail.strip_prefix("type/") {
                Some(id) if !not_own_id(id) => Ok((id, None)),
                _ if member == Member::SourceElement => match tail.split_once('/') {
                    Some((id, op))
                        if !id.is_empty()
                            && !id.contains('/')
                            && !op.is_empty()
                            && !op.contains('/') =>
                    {
                        Ok((id, Some(op)))
                    }
                    _ => Err(name),
                },
                _ => Err(name),
            },
            None => Err(name),
        },
    }
}

impl References<'_> {
    /// The type identities of `names`, each the id of an artifact of the
    /// bundle carrying a role the declaration admits for `member` (any
    /// object-typed artifact when it constrains none) and named once — or,
    /// for a `sourceElement` naming an operation (FR-152), that referenced
    /// artifact's operation identity in place of its type identity; the
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
        let own_package = ctx.package.package();
        let mut out = Vec::new();
        for name in names.unwrap_or(&[]) {
            let not_admitted = |full: &str| -> String {
                format!(
                    "{site} names `{full}`, which is the artifact id of no type of the bundle the construct's {} admit",
                    member.name()
                )
            };
            let (bare_id, operation) =
                bare_artifact_id(name, &own_package, member).map_err(not_admitted)?;
            let identity = self
                .artifact_roles
                .get(bare_id)
                .filter(|roles| {
                    admitted.is_none_or(|admitted| roles.iter().any(|role| admitted.contains(role)))
                })
                .and_then(|_| match operation {
                    None => ctx.package.type_identity(bare_id).ok(),
                    Some(op) => ctx.package.operation_identity(bare_id, op).ok(),
                })
                .ok_or_else(|| not_admitted(bare_id))?;
            if out.contains(&identity) {
                return Err(format!(
                    "{site} names `{name}` twice, and one cell names each type at most once"
                ));
            }
            out.push(identity);
        }
        Ok(out)
    }

    /// The type identity of the one artifact-id reference `name`, by the
    /// same admission rule as [`identities`](Self::identities).
    fn identity(
        &self,
        member: Member,
        name: &str,
        ctx: &ArtifactContext<'_>,
        site: &str,
    ) -> Result<String, String> {
        let names = [name.to_string()];
        Ok(self.identities(member, Some(&names), ctx, site)?.remove(0))
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

/// The type identities of `decls`' targets, in row order (FR-141
/// generalization): the artifact id each `specializes` row names, resolved
/// like any other reference member; same-kind and cycle checking is the
/// reader's own job (FR-141-AC-2).
fn lift_supertypes(
    decls: &[SupertypeDecl],
    references: &References<'_>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Vec<String>, LowerError> {
    let names: Vec<String> = decls.iter().map(|decl| decl.target.clone()).collect();
    references
        .identities(Member::Supertypes, Some(&names), ctx, "a supertype")
        .map_err(|rule| refuse(ctx, object, &rule))
}

/// `supertypes` and `abstract` from the engine's model extraction (FR-075
/// generalization, abstract types), lowered the same way for every
/// construct kind. [`shape`] calls this; so does
/// [`crate::enumeration::lower_enum`], whose `Shape::Enumeration` artifacts
/// never reach `shape` (FR-142 declares one construct per object type, and
/// neither member is enumeration-specific).
///
/// The required-but-absent check for these two members lives here, not in
/// `shape`'s own blanket check: `shape` never runs for an enumeration
/// artifact, and a construct declaring `supertypes: required` or
/// `abstract: required` must refuse one the same way regardless of shape.
pub(crate) fn lower_generalization(
    model: &ModelDeclarations,
    references: &References<'_>,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<(Option<Vec<String>>, Option<bool>), LowerError> {
    let declaration = references.declaration;
    if let Some(member) = [Member::Supertypes, Member::Abstract]
        .into_iter()
        .find(|&member| {
            declaration.presence(member) == Presence::Required
                && has_source_table(member, model) == Some(false)
        })
    {
        return Err(refuse(
            ctx,
            object,
            &format!(
                "the construct requires {}, and this artifact declares none",
                member.name()
            ),
        ));
    }
    let supertypes = if !forbids(declaration, Member::Supertypes) && model.supertypes.is_some() {
        Some(lift_supertypes(
            model.supertypes.as_deref().unwrap_or(&[]),
            references,
            ctx,
            object,
        )?)
    } else {
        None
    };
    let is_abstract = if forbids(declaration, Member::Abstract) {
        None
    } else {
        model.abstract_type.as_ref().map(|decl| decl.value)
    };
    Ok((supertypes, is_abstract))
}

/// One `featureOrder` entry per `Features` row, each the identity this
/// frontend already minted for the artifact's own field or operation of that
/// name; a row naming neither refuses the artifact (quire-rs FR-075
/// `model.featureOrder`, quire-rs#446/#448).
fn lift_feature_order(
    decls: &[FeatureOrderDecl],
    definition: &TypeDefinition,
    ctx: &ArtifactContext<'_>,
    object: &str,
) -> Result<Vec<String>, LowerError> {
    let mut out = Vec::with_capacity(decls.len());
    for decl in decls {
        let found = match decl.kind {
            FeatureKind::Field => fields(definition)
                .iter()
                .find(|f| f.name == decl.name)
                .map(|f| f.identity.clone()),
            FeatureKind::Operation => operations(definition)
                .iter()
                .find(|o| o.name == decl.name)
                .map(|o| o.identity.clone()),
        };
        let Some(identity) = found else {
            let kind = match decl.kind {
                FeatureKind::Field => "field",
                FeatureKind::Operation => "operation",
            };
            return Err(refuse(
                ctx,
                object,
                &format!(
                    "its `Features` row names `{}`, which names no {kind} of the artifact",
                    decl.name
                ),
            ));
        };
        out.push(identity);
    }
    Ok(out)
}

/// A connection end (`sourceEnd`/`targetEnd`): its port resolved like any
/// other reference member, and the end's own multiplicity carried as
/// authored.
fn lower_connection_end(
    end: &quire_rs::semantic::ConnectionEnd,
    member: Member,
    references: &References<'_>,
    ctx: &ArtifactContext<'_>,
    object: &str,
    site: &str,
) -> Result<ConnectionEnd, LowerError> {
    let type_ref = references
        .identity(member, &end.port, ctx, site)
        .map_err(|rule| refuse(ctx, object, &rule))?;
    Ok(ConnectionEnd {
        type_ref,
        multiplicity: end.multiplicity.clone(),
    })
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
    /// Whether [`shape`] already set `construct.owner` directly from the
    /// engine's model (a systems `part` or `port` row), before this pass
    /// ever runs. Captured once, at construction, so a later round's
    /// composite-relationship assignment (which also sets `owner`, from
    /// inside [`assign_owners`]'s own loop) can never be mistaken for it.
    pub owner_from_model: bool,
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
        // FR-152: an allocation's `sourceElement` may name a referenced
        // artifact's operation identity rather than its type identity
        // (`References::identity`'s operation-identity mint); that
        // artifact's operations disappear with it exactly as its type
        // identity would leave `lowered`, so this is re-collected every
        // round the same way, for `refusal_rule`'s own membership check.
        let operations: BTreeSet<String> = pending
            .iter()
            .flat_map(|item| {
                operations(&item.lowering.definition)
                    .iter()
                    .map(|o| o.identity.clone())
            })
            .collect();
        let mut round: Vec<(Pending, String)> = Vec::new();
        let mut kept = Vec::with_capacity(pending.len());
        for mut item in pending.drain(..) {
            match refusal_rule(&mut item, &owners, &refused, &lowered, &operations) {
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
    operations: &BTreeSet<String>,
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
    // Every reference member this frontend fills with another artifact's
    // type identity: a transition's or step's `emits`/`consumes`, a
    // generalization `supertypes` edge, a systems `part`/`port` row's
    // model-derived `owner`, a `part`'s `declaredType`, a `port`'s
    // `interfaceType`, a connection's `sourceEnd`/`targetEnd`, and an
    // allocation's `targetElement`. Each was admitted by role when this
    // artifact lowered, in its own earlier round; a later round can still
    // refuse the artifact it names, so every one of them is re-checked
    // here, every round, before `owner_from_model`'s early return skips the
    // rest of this function for a systems `part`/`port`. An allocation's
    // `sourceElement` joins this same re-check below, against `lowered` or
    // `operations` depending on which it named.
    // `owner` only joins this chain when it is model-derived: a composite
    // owner (nested_entity, aggregate-root member, ...) is assigned and
    // re-checked by the `owners` map below instead, which recomputes from
    // `pending` every round and so already drops a since-refused owner's
    // composite edge on its own; folding it into this chain too would
    // short-circuit that recomputation and misreport the rule as "names a
    // type that lowers to nothing" instead of "0/2 types contain it".
    let model_owner = item
        .owner_from_model
        .then(|| construct.owner.iter())
        .into_iter()
        .flatten();
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
        )
        .chain(construct.supertypes.iter().flatten())
        .chain(model_owner)
        .chain(construct.declared_type.iter())
        .chain(construct.interface_type.iter())
        .chain(construct.source_end.iter().map(|end| &end.type_ref))
        .chain(construct.target_end.iter().map(|end| &end.type_ref))
        .chain(construct.target_element.iter());
    if let Some(target) = type_refs.into_iter().find(|t| !lowered.contains(*t)) {
        return Some(format!(
            "a transition, step or reference member names the type {target}, which lowers to nothing"
        ));
    }
    // FR-152: an allocation's `sourceElement` may instead be a referenced
    // artifact's operation identity (`References::identity`'s
    // operation-identity mint); that identity never joins `lowered` (a set
    // of type identities), and the artifact's own operations disappear with
    // it, so this checks `operations` (every pending artifact's own
    // operation identities, recomputed the same way as `lowered`) instead.
    if let Some(target) = construct
        .source_element
        .as_deref()
        .filter(|t| !lowered.contains(*t) && !operations.contains(*t))
    {
        // The identity a failed `sourceElement` names is either a type or an
        // operation identity (`NodeKind::Operation`'s `/operation/` segment,
        // `identity.rs`); the message names whichever it is rather than
        // always claiming "type".
        let noun = if target.contains("/operation/") {
            "operation"
        } else {
            "type"
        };
        return Some(format!(
            "a transition, step or reference member names the {noun} {target}, which lowers to nothing"
        ));
    }
    if item.owner_from_model {
        // A systems `part` or `port` row already set `owner` directly
        // (FR-143 shape(), quire-rs FR-075 `model.part`/`model.port`), before
        // this pass ever ran; the bundle-wide composite-relationship pass
        // below is for every other construct's owner and does not re-check
        // or override it. `construct.owner.is_some()` is not the test here:
        // the composite pass itself sets `owner` inside this same loop, and
        // that assignment must still be re-checked on every later round.
        return None;
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
