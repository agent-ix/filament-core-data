//! FR-095 "Node identities": the package identity, the slug, and the
//! closed list of node-identity patterns.
//!
//! Every identity the frontend emits is minted here and nowhere else. An
//! identity part taken from a source *name* is a case-preserving [`slug`]
//! (the shared #87 contract); an identity part taken from an artifact *id* is
//! the id verbatim, through [`id_segment`], because an object id carries
//! underscores and `semanticIdentity` admits them, so `AR_001` mints
//! `AR_001`. A name that slugs to the empty string, and an id carrying a
//! character `semanticIdentity` does not admit, are both [`Unsluggable`],
//! which the caller raises as `UNSLUGGABLE_NAME` at the declaration's locus,
//! blocking.
//!
//! A type definition (including a kernel scalar definition and a
//! constrained-field alias) mints no slot segment: its identity is
//! `ix://<org>/<name>/<artifact id>`. A member — a field, an operation
//! parameter, or an operation — mints its owner's identity, `/`, and its own
//! slugged part, nested as deep as it sits: an operation is
//! `<owner type identity>/<operation>`, and its parameter is `<operation
//! identity>/<param>`. A clause, a state, a transition and a step nest under
//! their owner type the same way, `<owner identity>/<member name>`: the member
//! name of a clause, state or step is its name verbatim, admitted only when it
//! matches `^[A-Za-z][A-Za-z0-9_]*$` ([`member_segment`]), and a transition,
//! which has no name, is `transition<i>` for its zero-based row position. Every
//! other kind (constraint, relationship, variant) still mints under its own
//! [`NodeKind`] segment.

use std::fmt;

use crate::bundle::Package;
use crate::diagnostics::{Code, Diagnostic, Locus};

/// A name whose slug is empty: nothing alphanumeric survives.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Unsluggable {
    pub name: String,
    pub reason: UnsluggableReason,
}

/// Why a name mints no identity segment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnsluggableReason {
    /// The name slugs to the empty string, or an artifact id carries a
    /// character no segment admits.
    Slug,
    /// A clause, state or step name that is not `^[A-Za-z][A-Za-z0-9_]*$`.
    MemberName,
}

impl Unsluggable {
    fn slug(name: &str) -> Self {
        Self {
            name: name.to_string(),
            reason: UnsluggableReason::Slug,
        }
    }

    /// The `UNSLUGGABLE_NAME` diagnostic at the declaration's locus.
    pub fn diagnostic(&self, locus: Locus) -> Diagnostic {
        let message = match self.reason {
            UnsluggableReason::Slug => format!(
                "name `{}` slugs to the empty string; no identity segment can be minted from it",
                self.name
            ),
            UnsluggableReason::MemberName => format!(
                "name `{}` is not a member name; a clause id, state name or step name matches ^[A-Za-z][A-Za-z0-9_]*$",
                self.name
            ),
        };
        Diagnostic::frontend(Code::UnsluggableName, message, Some(locus))
    }
}

impl fmt::Display for Unsluggable {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "name `{}` slugs to the empty string", self.name)
    }
}

impl std::error::Error for Unsluggable {}

/// The slug of a source name: case-preserving, every run of non-alphanumeric
/// characters replaced by one `-`, no leading or trailing `-`.
///
/// Alphanumeric means ASCII alphanumeric: `semanticIdentity` admits only
/// `[A-Za-z0-9._~:/-]` after the first segment, so any other character is a
/// separator.
pub fn slug(name: &str) -> Result<String, Unsluggable> {
    let mut out = String::with_capacity(name.len());
    let mut separator_pending = false;
    for c in name.chars() {
        if c.is_ascii_alphanumeric() {
            if separator_pending && !out.is_empty() {
                out.push('-');
            }
            separator_pending = false;
            out.push(c);
        } else {
            separator_pending = true;
        }
    }
    if out.is_empty() {
        return Err(Unsluggable::slug(name));
    }
    Ok(out)
}

/// The characters an identity segment carries beyond the ASCII alphanumerics:
/// those `semanticIdentity` admits inside a segment. `:` and `/` are admitted
/// by the pattern but separate segments, so an id carrying either is refused.
const SEGMENT_CHARACTERS: &[char] = &['.', '_', '~', '-'];

/// The identity segment of an artifact id: the id verbatim.
///
/// An object id carries underscores and no hyphens, and `semanticIdentity`
/// admits `_` (`[A-Za-z0-9._~:/-]`), so an id is never slugged: `AR_001` mints
/// `AR_001`, not `AR-001`. An id carrying a character the pattern
/// does not admit inside a segment, or carrying no ASCII alphanumeric at all,
/// is [`Unsluggable`].
pub fn id_segment(id: &str) -> Result<String, Unsluggable> {
    let admitted = id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || SEGMENT_CHARACTERS.contains(&c));
    if !admitted || !id.chars().any(|c| c.is_ascii_alphanumeric()) {
        return Err(Unsluggable::slug(id));
    }
    Ok(id.to_string())
}

/// The member name of a clause, state or step: `name` verbatim, so that the
/// name equals the last segment of the node's identity, when it matches
/// `^[A-Za-z][A-Za-z0-9_]*$`; otherwise [`Unsluggable`].
pub fn member_segment(name: &str) -> Result<String, Unsluggable> {
    let mut chars = name.chars();
    let admitted = chars.next().is_some_and(|c| c.is_ascii_alphabetic())
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_');
    if admitted {
        Ok(name.to_string())
    } else {
        Err(Unsluggable {
            name: name.to_string(),
            reason: UnsluggableReason::MemberName,
        })
    }
}

/// The closed list of node kinds that mint an identity under their own
/// segment (FR-095 "Node identities"). A type definition and a member
/// (field, operation, operation parameter, clause, state, transition, step)
/// mint no segment of their own —
/// see [`PackageIdentity::type_identity`] and [`PackageIdentity::
/// field_identity`] — so they carry no `NodeKind`. The segment after
/// `ix://<org>/<name>/` is [`NodeKind::segment`]; no identity of this list's
/// kinds is minted under any other segment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum NodeKind {
    Constraint,
    Relationship,
    Variant,
}

impl NodeKind {
    /// Every kind, in FR-095's order.
    pub const ALL: [NodeKind; 3] = [
        NodeKind::Constraint,
        NodeKind::Relationship,
        NodeKind::Variant,
    ];

    /// The path segment naming the kind.
    pub fn segment(self) -> &'static str {
        match self {
            NodeKind::Constraint => "constraint",
            NodeKind::Relationship => "relationship",
            NodeKind::Variant => "variant",
        }
    }
}

/// `<org>/<name>` of the bundle: the root of every identity the frontend
/// mints.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackageIdentity {
    org: String,
    name: String,
}

impl PackageIdentity {
    pub fn new(org: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            org: org.into(),
            name: name.into(),
        }
    }

    pub fn org(&self) -> &str {
        &self.org
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    /// `<org>/<name>`: `package.identity` (`packageIdentity`).
    pub fn package(&self) -> String {
        format!("{}/{}", self.org, self.name)
    }

    /// `ix://<org>/<name>/spec`: `source.identity` and every locus's
    /// `sourceIdentity`.
    pub fn source(&self) -> String {
        format!("ix://{}/{}/spec", self.org, self.name)
    }

    /// `ix://<org>/<name>/<kind>/<tail>`: the one shape every non-member node
    /// identity takes (FR-095's closed [`NodeKind`] list).
    fn node(&self, kind: NodeKind, tail: &str) -> String {
        format!("ix://{}/{}/{}/{tail}", self.org, self.name, kind.segment())
    }

    /// `ix://<org>/<name>/<artifact id>`: a definition's identity comes from
    /// its artifact id, verbatim, never from its `displayName`, and carries
    /// no slot segment. A kernel scalar definition passes its scalar name,
    /// which is its own segment.
    pub fn type_identity(&self, artifact_id: &str) -> Result<String, Unsluggable> {
        Ok(format!(
            "ix://{}/{}/{}",
            self.org,
            self.name,
            id_segment(artifact_id)?
        ))
    }

    /// `<owner type identity>/<field-slug>`: a member's identity is its
    /// owner's identity, `/`, and its own slugged name.
    pub fn field_identity(&self, record: &str, field: &str) -> Result<String, Unsluggable> {
        Ok(format!("{}/{}", self.type_identity(record)?, slug(field)?))
    }

    /// The identity of the alias minted for a constrained field: the
    /// artifact id followed by the capitalized slug of its field.
    pub fn alias_identity(&self, artifact_id: &str, field: &str) -> Result<String, Unsluggable> {
        let artifact_id = id_segment(artifact_id)?;
        let field = capitalized_slug(field)?;
        Ok(format!("ix://{}/{}{}", self.package(), artifact_id, field,))
    }

    /// `ix://<org>/<name>/constraint/<record id>-<field-slug>-<keyword>`.
    pub fn constraint_identity(
        &self,
        record: &str,
        field: &str,
        keyword: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Constraint, &join(record, &[field, keyword])?))
    }

    /// `ix://<org>/<name>/constraint/<type id>/<keyword>`: a constraint a
    /// value type carries on itself. The keyword nests under the owner with
    /// `/`, which no field-constraint identity contains, so a value type `A-b`
    /// with `min` and a record `A` with field `b` and `min`
    /// (`constraint/A-b-min`) cannot mint one identity.
    pub fn type_constraint_identity(
        &self,
        type_id: &str,
        keyword: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(
            NodeKind::Constraint,
            &format!("{}/{}", id_segment(type_id)?, slug(keyword)?),
        ))
    }

    /// `ix://<org>/<name>/relationship/<record id>-<verb>-<target id>`.
    pub fn relationship_identity(
        &self,
        record: &str,
        verb: &str,
        target: &str,
    ) -> Result<String, Unsluggable> {
        let target = id_segment(target)?;
        Ok(self.node(
            NodeKind::Relationship,
            &format!("{}-{target}", join(record, &[verb])?),
        ))
    }

    /// `<owner type identity>/<op-slug>`: an operation is a member of its
    /// receiver type, the same nesting rule as [`Self::field_identity`].
    pub fn operation_identity(&self, record: &str, op: &str) -> Result<String, Unsluggable> {
        Ok(format!("{}/{}", self.type_identity(record)?, slug(op)?))
    }

    /// `<owner operation identity>/<param-slug>`: an operation parameter
    /// nests one level deeper than its operation, never under a `param/`
    /// slot.
    pub fn param_identity(
        &self,
        record: &str,
        op: &str,
        param: &str,
    ) -> Result<String, Unsluggable> {
        Ok(format!(
            "{}/{}",
            self.operation_identity(record, op)?,
            slug(param)?
        ))
    }

    /// `ix://<org>/<name>/variant/<enumeration id>-<value-slug>`.
    pub fn variant_identity(&self, enumeration: &str, value: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Variant, &join(enumeration, &[value])?))
    }

    /// `<owner type identity>/<clauseId>`: a clause nests under the type that
    /// declares it, and its `clauseId` is its member name.
    pub fn clause_identity(&self, record: &str, clause: &str) -> Result<String, Unsluggable> {
        self.member(record, clause)
    }

    /// `<owner type identity>/<state>`: a state nests under its state machine.
    pub fn state_identity(&self, machine: &str, state: &str) -> Result<String, Unsluggable> {
        self.member(machine, state)
    }

    /// `<owner type identity>/transition<position>`: a transition row has no
    /// name, so its member name is `transition` and its zero-based position
    /// among the machine's transition rows.
    pub fn transition_identity(
        &self,
        machine: &str,
        position: usize,
    ) -> Result<String, Unsluggable> {
        self.member(machine, &format!("transition{position}"))
    }

    /// `<owner type identity>/<step>`: a step nests under its process.
    pub fn step_identity(&self, process: &str, step: &str) -> Result<String, Unsluggable> {
        self.member(process, step)
    }

    /// `<owner type identity>/<member name>`.
    fn member(&self, owner: &str, name: &str) -> Result<String, Unsluggable> {
        Ok(format!(
            "{}/{}",
            self.type_identity(owner)?,
            member_segment(name)?
        ))
    }
}

impl From<&Package> for PackageIdentity {
    fn from(package: &Package) -> Self {
        Self::new(&package.org, &package.name)
    }
}

/// The display name of the alias minted for a constrained field.
pub fn alias_display_name(record: &str, field: &str) -> String {
    format!("{record}{}", capitalized(field))
}

fn capitalized_slug(field: &str) -> Result<String, Unsluggable> {
    Ok(capitalized(&slug(field)?))
}

fn capitalized(field: &str) -> String {
    let mut chars = field.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}

/// The identity segment of `id`, then the slugs of `names`, joined by `-`.
/// The first part that mints no segment is the error.
fn join(id: &str, names: &[&str]) -> Result<String, Unsluggable> {
    let mut parts = vec![id_segment(id)?];
    for name in names {
        parts.push(slug(name)?);
    }
    Ok(parts.join("-"))
}
