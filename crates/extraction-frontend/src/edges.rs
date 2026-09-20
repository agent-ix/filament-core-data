//! FR-094 "Relationships": one IR `relationship` per frontmatter
//! `(target, verb)` pair the engine's `harvest_edges` returns for a
//! record's document, kept when the record's object type lists the verb
//! under `allowed_links`, categorised by the loaded registry's
//! `EdgeTypeDef`, and targeted at the definition FR-092 resolves the token
//! to.
//!
//! # What is and is not read
//!
//! The pairs come from `quire_rs::corpus::harvest_edges` over the loaded
//! document (decision D5). That function also harvests `ix://` autolinks
//! from the document body as `references` edges; this module keeps only the
//! pairs the frontmatter `relationships:` list declares, because the body
//! is the engine's to read and the Relationships-section bullet grammar exists
//! in no contract (FR-094 "SHALL NOT read a Relationships-section section",
//! FR-091-CON-3). No the Properties table row becomes a relationship: `parent |
//! ConfigVersion | 0..1` is a field (FR-094-AC-8).
//!
//! # What decides `category` and `composite`
//!
//! Only the registry: `category` is the `EdgeTypeDef.category` the merged
//! `edge_types` of the loaded module set declares for the verb, and
//! `composite` is whether that definition's `inverse` is `part_of`
//! (FR-094-CON-2). Nothing here reads the verb's spelling, the target's
//! name, or the record's roles; renaming the inverse in the manifest flips
//! `composite` with no change here (FR-094-AC-14).
//!
//! # Hook point (FR-094-CON-1)
//!
//! When agent-ix/quire-rs#418 ships `RelationDecl` extraction, a second
//! source of pairs — the engine's located Relationships-section declarations
//! with their own multiplicity and origin — joins [`frontmatter_edges`] in
//! [`lower_relationships`] and the relationship goldens are re-cut in one
//! commit.

use quire_rs::corpus::harvest_edges;
use quire_rs::semantic::Multiplicity;
use quire_rs::vocab::EdgeCategory;
use serde::Serialize;

use crate::bundle::{Bundle, Document, ObjectType};
use crate::diagnostics::{message_with_token, Code, Diagnostic};
use crate::lower::{ArtifactContext, Origin, Sink};
use crate::resolve::{indexed_artifact, ArtifactRef, Outcome, Outcomes};

/// The registry `inverse` label that makes a verb composite (FR-094
/// "Relationships"): the one spelling the requirement fixes.
pub const PART_OF: &str = "part_of";
/// The frontmatter key the pairs are declared under.
const RELATIONSHIPS: &str = "relationships";
/// The frontmatter keys of one entry, as the engine reads them.
const TARGET: &str = "target";
const TYPE: &str = "type";
/// The verb the engine gives an entry without a `type`, and the one verb a
/// body `ix://` autolink is harvested under.
const DEFAULT_VERB: &str = "references";

/// `semantic-ir.schema.json#/$defs/relationshipSourceEnd` or
/// `relationshipTargetEnd` (H4 of the FCD #199/#200 review split the one
/// `relationshipEnd` def in two so `role` could be required on the source
/// end and left optional on the target end): one end of a relationship, its
/// role, its multiplicity, and the type it names (FR-094 "Relationships",
/// gap 3 of FCD #199/#200).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RelationshipEnd {
    /// The edge vocabulary's verb (source end) or `inverse` (target end).
    /// Omitted on the target end when the verb declares no `inverse`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    pub multiplicity: Multiplicity,
    #[serde(rename = "type")]
    pub type_ref: String,
}

/// `source-to-target` | `target-to-source` | `bidirectional` | `undirected`
/// (FR-094 "Relationships", gap 3 of FCD #199/#200). Lowering always emits
/// `SourceToTarget`: source-multiplicity authoring is future FCD #201, and a
/// symmetric/undirected flag is future quire-rs#466.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Direction {
    SourceToTarget,
    TargetToSource,
    Bidirectional,
    Undirected,
}

/// `semantic-ir.schema.json#/$defs/relationship`: two ends, source and
/// target (FR-094 "Relationships", gap 3 of FCD #199/#200). The source end's
/// role is the edge verb and its type is the owning artifact; the target
/// end's role is the edge vocabulary's `inverse` (absent when none is
/// declared) and its type is the resolved target.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Relationship {
    pub identity: String,
    pub category: EdgeCategory,
    pub composite: bool,
    pub direction: Direction,
    #[serde(rename = "sourceEnd")]
    pub source_end: RelationshipEnd,
    #[serde(rename = "targetEnd")]
    pub target_end: RelationshipEnd,
    pub origin: Origin,
}

/// The `(target, verb)` pairs `harvest_edges` returns for `document` that
/// its frontmatter `relationships:` list declares, in the engine's order,
/// de-duplicated on `(verb, target)` by the engine.
///
/// Every pair, and every reduced target id in it, is the engine's
/// (`quire_rs::corpus::harvest_edges`); nothing here reduces a target
/// (SR-169 FND-1493). The frontmatter subset is decided against the
/// engine's parsed frontmatter map, never by re-lexing: a harvested pair
/// is kept when the `relationships:` list carries an entry with the same
/// verb whose authored `target` names the engine's id — the id itself, or
/// the id as the last `/`-segment of the authored URI, which is the
/// engine's documented reduction contract (quire-rs FR-026-AC-6). A verb
/// other than `references` can only come from frontmatter (a body autolink
/// is always `references`), so only `references` pairs need the target
/// check; when the engine's reduction changes, the goldens move and
/// TC-1231/TC-1236 fail naming the pair.
pub fn frontmatter_edges(document: &Document) -> Vec<(String, String)> {
    let declared: Vec<(&str, &str)> = document
        .frontmatter()
        .and_then(|fm| fm.get(RELATIONSHIPS))
        .and_then(|v| v.as_array())
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| {
                    let target = entry.get(TARGET)?.as_str()?;
                    let verb = entry
                        .get(TYPE)
                        .and_then(|v| v.as_str())
                        .unwrap_or(DEFAULT_VERB);
                    Some((target, verb))
                })
                .collect()
        })
        .unwrap_or_default();
    let names = |authored: &str, id: &str| {
        authored == id
            || authored
                .strip_suffix(id)
                .is_some_and(|prefix| prefix.ends_with('/'))
    };
    harvest_edges(document.loaded())
        .into_iter()
        .filter(|(id, verb)| {
            declared
                .iter()
                .any(|(target, declared_verb)| *declared_verb == verb && names(target, id))
        })
        .collect()
}

/// Lower the frontmatter edges of `document` — the record `ctx` names,
/// declared under `object_type` — to relationships (FR-094
/// "Relationships").
///
/// Every pair whose verb the object type does not list under
/// `allowed_links` is skipped without a diagnostic (artifact-axis verbs:
/// `traces_to`, `implements`, `depends_on`, ...). A listed verb no loaded
/// module's `edge_types` declares raises `UNKNOWN_EDGE_VERB`; a target the
/// bundle index does not resolve, or whose pass-one outcome is not a
/// definition, raises `UNRESOLVED_RELATIONSHIP_TARGET` naming the token.
/// Both sit at the document's line 1, column 1 — the frontmatter block —
/// and block; the relationships of a blocked document are not returned.
pub fn lower_relationships(
    document: &Document,
    object_type: &ObjectType,
    bundle: &Bundle,
    outcomes: &Outcomes,
    ctx: &ArtifactContext<'_>,
) -> Result<Vec<Relationship>, Vec<Diagnostic>> {
    let registry = bundle.registry();
    let allowed = registry.resolve_allowed_links(&object_type.archetype, None);
    let edge_types = registry.edge_types();
    let head = ctx.head();
    let mut sink = Sink::default();
    let mut out = Vec::new();
    // The source end's type on every relationship this artifact declares
    // (gap 3 of FCD #199/#200): the artifact's own type identity, computed
    // once rather than per relationship.
    let source_type = match ctx.package.type_identity(ctx.id) {
        Ok(identity) => identity,
        Err(unsluggable) => return Err(vec![unsluggable.diagnostic(head.clone())]),
    };
    for (token, verb) in frontmatter_edges(document) {
        if !allowed.contains_key(&verb) {
            continue;
        }
        let Some(definition) = edge_types.get(&verb) else {
            sink.push(Diagnostic::frontend(
                Code::UnknownEdgeVerb,
                message_with_token(
                    &format!(
                        "artifact {} ({}) declares the `{verb}` edge, which object type {} lists under allowed_links but no loaded module declares under edge_types; target `",
                        ctx.id, ctx.path, object_type.archetype.name
                    ),
                    &token,
                    "`",
                ),
                Some(head.clone()),
            ));
            continue;
        };
        let target = match resolve_target(bundle, outcomes, &token) {
            Some(target) => target,
            None => {
                sink.push(Diagnostic::frontend(
                    Code::UnresolvedRelationshipTarget,
                    message_with_token(
                        &format!(
                            "artifact {} ({}) declares the `{verb}` edge to `",
                            ctx.id, ctx.path
                        ),
                        &token,
                        "`, which names no indexed artifact that produced a definition",
                    ),
                    Some(head.clone()),
                ));
                continue;
            }
        };
        let identity = match ctx.package.relationship_identity(ctx.id, &verb, &target.id) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(head.clone()));
                continue;
            }
        };
        let target_type = match ctx.package.type_identity(&target.id) {
            Ok(identity) => identity,
            Err(unsluggable) => {
                sink.push(unsluggable.diagnostic(head.clone()));
                continue;
            }
        };
        out.push(Relationship {
            identity,
            category: definition.category,
            composite: definition.inverse.as_deref() == Some(PART_OF),
            direction: Direction::SourceToTarget,
            source_end: RelationshipEnd {
                role: Some(verb),
                multiplicity: crate::document::normalized_multiplicity(Multiplicity {
                    lower: 0,
                    ..Multiplicity::default()
                }),
                type_ref: source_type.clone(),
            },
            target_end: RelationshipEnd {
                role: definition.inverse.clone(),
                multiplicity: crate::document::normalized_multiplicity(Multiplicity::one()),
                type_ref: target_type,
            },
            origin: Origin::Source(head.clone()),
        });
    }
    if sink.blocked {
        Err(sink.diagnostics)
    } else {
        Ok(out)
    }
}

/// The artifact `token` names through the bundle index (by `id`, `title`
/// or `name`, in the engine's precedence), when its pass-one outcome is a
/// definition.
fn resolve_target(bundle: &Bundle, outcomes: &Outcomes, token: &str) -> Option<ArtifactRef> {
    let document = indexed_artifact(bundle, token)?;
    match outcomes.get(document.id()) {
        Some(Outcome::Definition) => Some(ArtifactRef::of(document)),
        Some(Outcome::NotLowered { .. }) | None => None,
    }
}
