//! FR-095 "Node identities": the package identity, the slug, and the
//! closed list of node-identity patterns.
//!
//! Every identity the frontend emits is minted here and nowhere else. Every
//! identity part, including the `type/` tail and a constrained-field alias,
//! is a case-preserving [`slug`] (the shared #87 contract). A name that slugs
//! to the empty string is [`Unsluggable`], which the caller raises as
//! `UNSLUGGABLE_NAME` at the declaration's locus, blocking.

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

/// The closed list of node kinds the frontend mints identities for (FR-095
/// "Node identities"). The segment after `ix://<org>/<name>/` is
/// [`NodeKind::segment`]; no identity is minted under any other segment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum NodeKind {
    Type,
    Field,
    Constraint,
    Relationship,
    Operation,
    Variant,
    Clause,
}

impl NodeKind {
    /// Every kind, in FR-095's order.
    pub const ALL: [NodeKind; 7] = [
        NodeKind::Type,
        NodeKind::Field,
        NodeKind::Constraint,
        NodeKind::Relationship,
        NodeKind::Operation,
        NodeKind::Variant,
        NodeKind::Clause,
    ];

    /// The path segment naming the kind.
    pub fn segment(self) -> &'static str {
        match self {
            NodeKind::Type => "type",
            NodeKind::Field => "field",
            NodeKind::Constraint => "constraint",
            NodeKind::Relationship => "relationship",
            NodeKind::Operation => "operation",
            NodeKind::Variant => "variant",
            NodeKind::Clause => "clause",
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

    /// `ix://<org>/<name>/<kind>/<tail>`: the one shape every node identity
    /// takes.
    fn node(&self, kind: NodeKind, tail: &str) -> String {
        format!("ix://{}/{}/{}/{tail}", self.org, self.name, kind.segment())
    }

    /// `ix://<org>/<name>/type/<slug(DisplayName)>`.
    pub fn type_identity(&self, display_name: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Type, &slug(display_name)?))
    }

    /// `ix://<org>/<name>/type/<slug(DisplayName)><Slug(Field)>`: the alias a
    /// constrained field's `typeRef` names.
    pub fn alias_identity(&self, record: &str, field: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Type, &alias_identity_tail(record, field)?))
    }

    /// `ix://<org>/<name>/field/<record-slug>-<field-slug>`.
    pub fn field_identity(&self, record: &str, field: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Field, &join(&[record, field])?))
    }

    /// `ix://<org>/<name>/constraint/<record-slug>-<field-slug>-<keyword>`.
    pub fn constraint_identity(
        &self,
        record: &str,
        field: &str,
        keyword: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Constraint, &join(&[record, field, keyword])?))
    }

    /// `ix://<org>/<name>/relationship/<record-slug>-<verb>-<target-slug>`.
    pub fn relationship_identity(
        &self,
        record: &str,
        verb: &str,
        target: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Relationship, &join(&[record, verb, target])?))
    }

    /// `ix://<org>/<name>/operation/<record-slug>-<op-slug>`.
    pub fn operation_identity(&self, record: &str, op: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Operation, &join(&[record, op])?))
    }

    /// `ix://<org>/<name>/field/<record-slug>-<op-slug>-<param-slug>`.
    pub fn param_identity(
        &self,
        record: &str,
        op: &str,
        param: &str,
    ) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Field, &join(&[record, op, param])?))
    }

    /// `ix://<org>/<name>/variant/<enum-slug>-<value-slug>`.
    pub fn variant_identity(&self, enumeration: &str, value: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Variant, &join(&[enumeration, value])?))
    }

    /// `ix://<org>/<name>/clause/<record-slug>-<clause-slug>`.
    pub fn clause_identity(&self, record: &str, clause: &str) -> Result<String, Unsluggable> {
        Ok(self.node(NodeKind::Clause, &join(&[record, clause])?))
    }
}

impl From<&Package> for PackageIdentity {
    fn from(package: &Package) -> Self {
        Self::new(&package.org, &package.name)
    }
}

/// `<slug(DisplayName)><Slug(fieldName)>`: the tail of the constrained-field
/// alias identity. The field component is capitalized after slugging.
fn alias_identity_tail(record: &str, field: &str) -> Result<String, Unsluggable> {
    let record = slug(record)?;
    let mut field = slug(field)?;
    if let Some(first) = field.get_mut(0..1) {
        first.make_ascii_uppercase();
    }
    Ok(format!("{record}{field}"))
}

/// `<DisplayName><fieldName>`: the display name of the constrained-field
/// alias. The field component is verbatim except for its first character.
pub fn alias_display_name(record: &str, field: &str) -> String {
    let mut field = field.to_string();
    if let Some(first) = field.get_mut(0..1) {
        first.make_ascii_uppercase();
    }
    format!("{record}{field}")
}

/// The slugs of `names`, joined by `-`. The first unsluggable name is the
/// error.
fn join(names: &[&str]) -> Result<String, Unsluggable> {
    let slugs = names
        .iter()
        .map(|n| slug(n))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(slugs.join("-"))
}
