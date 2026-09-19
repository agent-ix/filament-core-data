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
//! identity>/<param>`. Every other kind (constraint, relationship, variant,
//! clause, state, transition, step) still mints under its own [`NodeKind`]
//! segment.

use std::fmt;

use crate::bundle::Package;
use crate::diagnostics::{Code, Diagnostic, Locus};

/// A name whose slug is empty: nothing alphanumeric survives.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Unsluggable {
    pub name: String,
}

impl Unsluggable {
    /// The `UNSLUGGABLE_NAME` diagnostic at the declaration's locus.
    pub fn diagnostic(&self, locus: Locus) -> Diagnostic {
        Diagnostic::frontend(
            Code::UnsluggableName,
            format!(
                "name `{}` slugs to the empty string; no identity segment can be minted from it",
                self.name
            ),
            Some(locus),
        )
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
        return Err(Unsluggable {
            name: name.to_string(),
        });
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
        return Err(Unsluggable {
            name: id.to_string(),
        });
    }
    Ok(id.to_string())
}

/// The closed list of node kinds that mint an identity under their own
/// segment (FR-095 "Node identities"). A type definition and a member
/// (field, operation, operation parameter) mint no segment of their own —
/// see [`PackageIdentity::type_identity`] and [`PackageIdentity::
/// field_identity`] — so they carry no `NodeKind`. The segment after
/// `ix://<org>/<name>/` is [`NodeKind::segment`]; no identity of this list's
/// kinds is minted under any other segment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum NodeKind {
    Constraint,
    Relationship,
    Variant,
    Clause,
    State,
    Transition,
    Step,
}

impl NodeKind {
    /// Every kind, in FR-095's order.
    pub const ALL: [NodeKind; 7] = [
        NodeKind::Constraint,
        NodeKind::Relationship,
        NodeKind::Variant,
        NodeKind::Clause,
        NodeKind::State,
        NodeKind::Transition,
        NodeKind::Step,
    ];

    /// The path segment naming the kind.
    pub fn segment(self) -> &'static str {
        match self {
            NodeKind::Constraint => "constraint",
            NodeKind::Relationship => "relationship",
            NodeKind::Variant => "variant",
            NodeKind::Clause => "clause",
            NodeKind::State => "state",
            NodeKind::Transition => "transition",
            NodeKind::Step => "step",
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

    /// `ix://<org>/<name>/constraint/<record id>-<field-slug>-<keyword>`.
    pub fn constraint_identity(
        &self,
        record: &str,
        field: &str,
        keyword: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Constraint, &join(record, &[field, keyword])?))
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

    /// `ix://<org>/<name>/clause/<record id>-<clause-slug>`.
    pub fn clause_identity(&self, record: &str, clause: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Clause, &join(record, &[clause])?))
    }

    /// `ix://<org>/<name>/state/<machine id>-<state-slug>`.
    pub fn state_identity(&self, machine: &str, state: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::State, &join(machine, &[state])?))
    }

    /// `ix://<org>/<name>/transition/<machine id>-<from-slug>-<to-slug>-<trigger-slug>`:
    /// a transition row has no name, so its from state, to state and trigger
    /// operation are its parts.
    pub fn transition_identity(
        &self,
        machine: &str,
        from: &str,
        to: &str,
        trigger: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Transition, &join(machine, &[from, to, trigger])?))
    }

    /// `ix://<org>/<name>/step/<process id>-<step-slug>`.
    pub fn step_identity(&self, process: &str, step: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Step, &join(process, &[step])?))
    }
}

impl From<&Package> for PackageIdentity {
    fn from(package: &Package) -> Self {
        Self::new(&package.org, &package.name)
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
