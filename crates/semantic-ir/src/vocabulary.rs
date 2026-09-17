//! The closed core vocabulary of construct declarations (contract 2.0.0).
//!
//! A module declares each of its construct kinds as data: an identity, a
//! shape, the presence of each IR member, the roles each reference member
//! admits, the named core rules, and a Quire meaning id the contract carries
//! without interpreting.
//! `schema/semantic/v1/construct-vocabulary.json` states the vocabulary once;
//! the enums here are its Rust reading, and the parity test below compares
//! them to that file and to `semantic-ir.schema.json`. Nothing here names a
//! construct kind: a kind is `{module, name}` data the document carries.

use crate::json::Json;

macro_rules! vocabulary {
    (
        $(#[$meta:meta])*
        $name:ident { $($(#[$variant_meta:meta])* $variant:ident => $spelling:literal),* $(,)? }
    ) => {
        $(#[$meta])*
        #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
        pub enum $name {
            $($(#[$variant_meta])* $variant),*
        }

        impl $name {
            /// Every term, in vocabulary order.
            pub const ALL: &'static [$name] = &[$($name::$variant),*];

            /// The spelling the vocabulary and the document use.
            pub const fn name(self) -> &'static str {
                match self {
                    $($name::$variant => $spelling),*
                }
            }

            /// The term `text` spells, if any.
            pub fn parse(text: &str) -> Option<Self> {
                Self::ALL.iter().copied().find(|term| term.name() == text)
            }

            /// Every spelling, in vocabulary order.
            pub fn names() -> Vec<&'static str> {
                Self::ALL.iter().map(|term| term.name()).collect()
            }
        }
    };
}

vocabulary! {
    /// How instances of a construct are told apart.
    Identity {
        /// By the identity fields.
        Identified => "identified",
        /// By every field: two values are equal when every field is equal.
        Value => "value",
        /// No instance identity is declared.
        None => "none",
    }
}

vocabulary! {
    /// The structure a backend renders a construct as.
    Shape {
        /// A record of fields.
        Record => "record",
        /// A closed set of variants.
        Enumeration => "enumeration",
        /// Operations over other types, holding no state.
        Interface => "interface",
        /// States and the transitions between them.
        StateMachine => "state_machine",
        /// A record running ordered steps.
        Sequence => "sequence",
        /// A grouping of other types, not a data type.
        Namespace => "namespace",
    }
}

vocabulary! {
    /// Whether a type of the construct carries a member.
    Presence {
        /// The member is present.
        Required => "required",
        /// The member may be present.
        Optional => "optional",
        /// The member is absent.
        Forbidden => "forbidden",
    }
}

vocabulary! {
    /// The type-definition members a declaration governs.
    Member {
        /// `fields`.
        Fields => "fields",
        /// `variants`.
        Variants => "variants",
        /// `relationships`.
        Relationships => "relationships",
        /// `operations`.
        Operations => "operations",
        /// `clauses`.
        Clauses => "clauses",
        /// `supertypes`.
        Supertypes => "supertypes",
        /// `abstract`.
        Abstract => "abstract",
        /// `identityFields`.
        IdentityFields => "identityFields",
        /// `owner`.
        Owner => "owner",
        /// `members`.
        Members => "members",
        /// `occurrenceField`.
        OccurrenceField => "occurrenceField",
        /// `states`.
        States => "states",
        /// `transitions`.
        Transitions => "transitions",
        /// `steps`.
        Steps => "steps",
        /// `persists`.
        Persists => "persists",
        /// `vocabulary`.
        Vocabulary => "vocabulary",
        /// `direction`: a port's `in`, `out` or `inout`.
        Direction => "direction",
        /// `interfaceType`: the type a port is typed by.
        InterfaceType => "interfaceType",
        /// `multiplicity`: the type's own multiplicity.
        Multiplicity => "multiplicity",
        /// `declaredType`: the type a usage is typed by.
        DeclaredType => "declaredType",
        /// `flowDirection`: a connection's `source-to-target`,
        /// `target-to-source` or `bidirectional`.
        FlowDirection => "flowDirection",
        /// `sourceEnd`: the end a connection starts at.
        SourceEnd => "sourceEnd",
        /// `targetEnd`: the end a connection ends at.
        TargetEnd => "targetEnd",
        /// `sourceElement`: the element an allocation allocates.
        SourceElement => "sourceElement",
        /// `targetElement`: the element an allocation allocates to.
        TargetElement => "targetElement",
        /// `featureOrder`: the type's own fields and operations, each once,
        /// in authored order.
        FeatureOrder => "featureOrder",
    }
}

vocabulary! {
    /// The named core rules a declaration selects.
    Rule {
        /// An artifact of the construct declares an identity field.
        IdentityFieldRequired => "identity_field_required",
        /// An artifact of the construct declares no identity field.
        IdentityFieldForbidden => "identity_field_forbidden",
        /// A type of the construct declares at least one clause.
        MinClauses => "min_clauses",
        /// An artifact of the construct declares exactly one occurrence field.
        OccurrenceFieldRequired => "occurrence_field_required",
        /// An artifact of the construct declares no fields.
        NoFields => "no_fields",
        /// An artifact of the construct declares no operations.
        NoOperations => "no_operations",
        /// A type of the construct declares at least one operation.
        MinOperations => "min_operations",
        /// An artifact of the construct has exactly one owner.
        SingleOwner => "single_owner",
        /// A type is named by the members of at most one type of the construct.
        ExclusiveMembership => "exclusive_membership",
        /// A member of the construct is not a namespace.
        MembersNotNamespace => "members_not_namespace",
    }
}

impl Member {
    /// The presence of the member in a declaration that does not list it.
    pub const fn default_presence(self) -> Presence {
        match self {
            Member::Fields
            | Member::Variants
            | Member::Relationships
            | Member::Operations
            | Member::Clauses
            | Member::Supertypes
            | Member::Abstract => Presence::Optional,
            Member::IdentityFields
            | Member::Owner
            | Member::Members
            | Member::OccurrenceField
            | Member::States
            | Member::Transitions
            | Member::Steps
            | Member::Persists
            | Member::Vocabulary
            | Member::Direction
            | Member::InterfaceType
            | Member::Multiplicity
            | Member::DeclaredType
            | Member::FlowDirection
            | Member::SourceEnd
            | Member::TargetEnd
            | Member::SourceElement
            | Member::TargetElement
            | Member::FeatureOrder => Presence::Forbidden,
        }
    }

    /// Where a reference member's entries name types: `Some(&[])` when the
    /// member itself names them, `Some(items)` when each listed member of
    /// each item does (an item is an element of a list member, or the
    /// member's own object), and `None` for a member that names no type.
    pub const fn reference_items(self) -> Option<&'static [&'static str]> {
        match self {
            Member::Owner
            | Member::Members
            | Member::Persists
            | Member::InterfaceType
            | Member::DeclaredType
            | Member::SourceElement
            | Member::TargetElement => Some(&[]),
            Member::SourceEnd | Member::TargetEnd => Some(&["type"]),
            Member::Transitions => Some(&["emits"]),
            Member::Steps => Some(&["consumes", "emits"]),
            Member::Fields
            | Member::Variants
            | Member::Relationships
            | Member::Operations
            | Member::Clauses
            | Member::Supertypes
            | Member::Abstract
            | Member::IdentityFields
            | Member::OccurrenceField
            | Member::States
            | Member::Vocabulary
            | Member::Direction
            | Member::Multiplicity
            | Member::FlowDirection
            | Member::FeatureOrder => None,
        }
    }
}

impl Rule {
    /// The member presence a declaration selecting the rule declares.
    pub const fn requires(self) -> (Member, Presence) {
        match self {
            Rule::IdentityFieldRequired => (Member::IdentityFields, Presence::Required),
            Rule::IdentityFieldForbidden => (Member::IdentityFields, Presence::Forbidden),
            Rule::MinClauses => (Member::Clauses, Presence::Required),
            Rule::OccurrenceFieldRequired => (Member::OccurrenceField, Presence::Required),
            Rule::NoFields => (Member::Fields, Presence::Forbidden),
            Rule::NoOperations => (Member::Operations, Presence::Forbidden),
            Rule::MinOperations => (Member::Operations, Presence::Required),
            Rule::SingleOwner => (Member::Owner, Presence::Required),
            Rule::ExclusiveMembership | Rule::MembersNotNamespace => {
                (Member::Members, Presence::Required)
            }
        }
    }

    /// Whether the rule also asks its list member for at least one item.
    pub const fn non_empty(self) -> bool {
        match self {
            Rule::MinClauses | Rule::MinOperations => true,
            Rule::IdentityFieldRequired
            | Rule::IdentityFieldForbidden
            | Rule::OccurrenceFieldRequired
            | Rule::NoFields
            | Rule::NoOperations
            | Rule::SingleOwner
            | Rule::ExclusiveMembership
            | Rule::MembersNotNamespace => false,
        }
    }
}

impl Identity {
    /// The member presence a declaration of this identity declares, if any.
    pub const fn requires(self) -> Option<(Member, Presence)> {
        match self {
            Identity::Identified => Some((Member::IdentityFields, Presence::Required)),
            Identity::Value | Identity::None => None,
        }
    }
}

impl Shape {
    /// The member presence a declaration of this shape declares, if any.
    pub const fn requires(self) -> Option<(Member, Presence)> {
        match self {
            Shape::Enumeration => Some((Member::Variants, Presence::Required)),
            Shape::Record
            | Shape::Interface
            | Shape::StateMachine
            | Shape::Sequence
            | Shape::Namespace => None,
        }
    }
}

/// A module's declaration of one construct kind.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Declaration {
    /// How instances are told apart.
    pub identity: Identity,
    /// The structure backends render.
    pub shape: Shape,
    /// The members the declaration lists, in declaration order.
    pub members: Vec<(Member, Presence)>,
    /// The roles each constrained reference member admits, in declaration
    /// order; a named type carrying any one of them is admitted.
    pub references: Vec<(Member, Vec<String>)>,
    /// The selected core rules, in declaration order.
    pub rules: Vec<Rule>,
    /// The Quire meaning id, carried opaquely.
    pub meaning: String,
    /// Whether an instance never changes once created; `false` when the
    /// declaration does not state it.
    pub immutable: bool,
}

/// Why a JSON value is not a declaration: a pointer relative to the
/// declaration and prose.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeclarationError {
    /// The JSON pointer below the declaration, empty for the declaration.
    pub pointer: String,
    /// What is wrong.
    pub message: String,
}

fn error(pointer: impl Into<String>, message: impl Into<String>) -> DeclarationError {
    DeclarationError {
        pointer: pointer.into(),
        message: message.into(),
    }
}

const DECLARATION_MEMBERS: &[&str] = &[
    "identity",
    "shape",
    "members",
    "references",
    "rules",
    "meaning",
    "immutable",
];
/// The members a declaration always states; `references` and `rules` default
/// to none, and `immutable` to `false`.
const DECLARATION_REQUIRED: &[&str] = &["identity", "shape", "members", "meaning"];
/// The role spelling no reference admits: a wildcard.
const WILDCARD_ROLE: &str = "*";

fn term<T: Copy>(
    value: Option<&Json>,
    pointer: &str,
    parse: fn(&str) -> Option<T>,
    names: &[&str],
    what: &str,
) -> Result<T, DeclarationError> {
    let text = value
        .and_then(Json::as_str)
        .ok_or_else(|| error(pointer, format!("{what} is one of {}", names.join(", "))))?;
    parse(text).ok_or_else(|| {
        error(
            pointer,
            format!("{what} is one of {} and {text} is not", names.join(", ")),
        )
    })
}

fn only(value: &Json, pointer: &str, allowed: &[&str]) -> Result<(), DeclarationError> {
    for (name, _) in value.as_object().unwrap_or(&[]) {
        if !allowed.contains(&name.as_str()) {
            return Err(error(
                pointer,
                format!("the member {name} is not one a declaration admits"),
            ));
        }
    }
    Ok(())
}

fn pointer_token(name: &str) -> String {
    format!("/{}", name.replace('~', "~0").replace('/', "~1"))
}

impl Declaration {
    /// The presence of `member`: as listed, or the member's default.
    pub fn presence(&self, member: Member) -> Presence {
        self.members
            .iter()
            .find(|(listed, _)| *listed == member)
            .map_or(member.default_presence(), |(_, presence)| *presence)
    }

    /// Whether the declaration selects `rule`.
    pub fn has_rule(&self, rule: Rule) -> bool {
        self.rules.contains(&rule)
    }

    /// The roles `member` admits, when the declaration constrains it.
    pub fn roles(&self, member: Member) -> Option<&[String]> {
        self.references
            .iter()
            .find(|(listed, _)| *listed == member)
            .map(|(_, roles)| roles.as_slice())
    }

    /// Every role the declaration's references name, each once, in
    /// declaration order.
    pub fn referenced_roles(&self) -> Vec<&str> {
        let mut out: Vec<&str> = Vec::new();
        for role in self.references.iter().flat_map(|(_, roles)| roles) {
            if !out.contains(&role.as_str()) {
                out.push(role);
            }
        }
        out
    }

    /// The declaration with every referenced role replaced by the spellings
    /// `spell` gives it, each kept once in first-seen order: the frontend
    /// qualifies a module's bare role names this way.
    pub fn with_roles(&self, spell: impl Fn(&str) -> Vec<String>) -> Declaration {
        let references = self
            .references
            .iter()
            .map(|(member, roles)| {
                let mut spelled: Vec<String> = Vec::new();
                for spelling in roles.iter().flat_map(|role| spell(role)) {
                    if !spelled.contains(&spelling) {
                        spelled.push(spelling);
                    }
                }
                (*member, spelled)
            })
            .collect();
        Declaration {
            references,
            ..self.clone()
        }
    }

    /// Reads a declaration, refusing at the first defect.
    ///
    /// Beyond its shape, a declaration names core members and rules only,
    /// lists each member, reference and rule once, admits each reference a
    /// non-empty list of distinct roles none of which is `*`, declares the
    /// member presence each selected rule requires, and constrains only
    /// reference members it does not forbid. `references` and `rules` may be
    /// absent. Whether a role exists is the reader of the module's roles to
    /// decide.
    pub fn read(value: &Json) -> Result<Self, DeclarationError> {
        if value.as_object().is_none() {
            return Err(error("", "a construct declaration is an object"));
        }
        only(value, "", DECLARATION_MEMBERS)?;
        for name in DECLARATION_REQUIRED {
            if !value.has(name) {
                return Err(error("", format!("a required member {name} is absent")));
            }
        }
        let identity = term(
            value.get("identity"),
            "/identity",
            Identity::parse,
            &Identity::names(),
            "identity",
        )?;
        let shape = term(
            value.get("shape"),
            "/shape",
            Shape::parse,
            &Shape::names(),
            "shape",
        )?;
        let members = Self::read_members(value.get("members"))?;
        let references = match value.get("references") {
            None => Vec::new(),
            Some(references) => Self::read_references(references)?,
        };
        let rules = match value.get("rules") {
            None => Vec::new(),
            Some(rules) => Self::read_rules(rules)?,
        };
        let meaning = value
            .get("meaning")
            .and_then(Json::as_str)
            .filter(|text| !text.is_empty())
            .ok_or_else(|| error("/meaning", "meaning is a non-empty Quire meaning id"))?
            .to_string();
        let immutable = match value.get("immutable") {
            None => false,
            Some(Json::Bool(flag)) => *flag,
            Some(_) => return Err(error("/immutable", "immutable is a boolean")),
        };
        let declaration = Declaration {
            identity,
            shape,
            members,
            references,
            rules,
            meaning,
            immutable,
        };
        declaration.check_consistency()?;
        Ok(declaration)
    }

    fn read_members(value: Option<&Json>) -> Result<Vec<(Member, Presence)>, DeclarationError> {
        let entries = value
            .and_then(Json::as_object)
            .ok_or_else(|| error("/members", "members is an object"))?;
        let mut out: Vec<(Member, Presence)> = Vec::new();
        for (name, presence) in entries {
            let at = format!("/members{}", pointer_token(name));
            let member = Member::parse(name).ok_or_else(|| {
                error(
                    &at,
                    format!("members names the core members only and {name} is not one"),
                )
            })?;
            if out.iter().any(|(listed, _)| *listed == member) {
                return Err(error(&at, format!("members lists {name} once")));
            }
            let presence = term(
                Some(presence),
                &at,
                Presence::parse,
                &Presence::names(),
                "a member presence",
            )?;
            out.push((member, presence));
        }
        Ok(out)
    }

    fn read_references(value: &Json) -> Result<Vec<(Member, Vec<String>)>, DeclarationError> {
        let entries = value
            .as_object()
            .ok_or_else(|| error("/references", "references is an object"))?;
        let mut out: Vec<(Member, Vec<String>)> = Vec::new();
        for (name, roles) in entries {
            let at = format!("/references{}", pointer_token(name));
            let member = Member::parse(name)
                .filter(|member| member.reference_items().is_some())
                .ok_or_else(|| {
                    error(
                        &at,
                        format!(
                            "references names core reference members only and {name} is not one"
                        ),
                    )
                })?;
            if out.iter().any(|(listed, _)| *listed == member) {
                return Err(error(&at, format!("references lists {name} once")));
            }
            let items = roles
                .as_array()
                .filter(|items| !items.is_empty())
                .ok_or_else(|| error(&at, "a reference admits a non-empty list of roles"))?;
            let mut read: Vec<String> = Vec::with_capacity(items.len());
            for (position, item) in items.iter().enumerate() {
                let item_at = format!("{at}/{position}");
                let role = item
                    .as_str()
                    .filter(|role| !role.is_empty() && *role != WILDCARD_ROLE)
                    .ok_or_else(|| error(&item_at, "a role is a non-empty role name and not *"))?;
                if read.iter().any(|listed| listed == role) {
                    return Err(error(
                        &item_at,
                        format!("{name} admits the role {role} once"),
                    ));
                }
                read.push(role.to_string());
            }
            out.push((member, read));
        }
        Ok(out)
    }

    fn read_rules(value: &Json) -> Result<Vec<Rule>, DeclarationError> {
        let items = value
            .as_array()
            .ok_or_else(|| error("/rules", "rules is an array"))?;
        let mut out: Vec<Rule> = Vec::new();
        for (position, item) in items.iter().enumerate() {
            let at = format!("/rules/{position}");
            let rule = term(Some(item), &at, Rule::parse, &Rule::names(), "a rule")?;
            if out.contains(&rule) {
                return Err(error(&at, format!("rules selects {} once", rule.name())));
            }
            out.push(rule);
        }
        Ok(out)
    }

    /// The member presence the identity, the shape and every selected rule
    /// require is declared, and every constrained reference is to a member
    /// the declaration admits.
    fn check_consistency(&self) -> Result<(), DeclarationError> {
        for (pointer, term, required) in [
            ("/identity", self.identity.name(), self.identity.requires()),
            ("/shape", self.shape.name(), self.shape.requires()),
        ] {
            let Some((member, presence)) = required else {
                continue;
            };
            if self.presence(member) != presence {
                return Err(error(
                    pointer,
                    format!(
                        "a {term} declaration requires {} to be {}",
                        member.name(),
                        presence.name()
                    ),
                ));
            }
        }
        for (position, rule) in self.rules.iter().enumerate() {
            let (member, presence) = rule.requires();
            if self.presence(member) != presence {
                return Err(error(
                    format!("/rules/{position}"),
                    format!(
                        "the rule {} requires {} to be {}",
                        rule.name(),
                        member.name(),
                        presence.name()
                    ),
                ));
            }
        }
        for (reference, _) in &self.references {
            if self.presence(*reference) == Presence::Forbidden {
                return Err(error(
                    format!("/references{}", pointer_token(reference.name())),
                    format!(
                        "the reference {} is to a member the declaration forbids",
                        reference.name()
                    ),
                ));
            }
        }
        Ok(())
    }

    /// The declaration as the document carries it.
    pub fn to_json(&self) -> Json {
        let text = |value: &str| Json::Str(value.to_string());
        let mut members = vec![
            ("identity".to_string(), text(self.identity.name())),
            ("shape".to_string(), text(self.shape.name())),
            (
                "members".to_string(),
                Json::Object(
                    self.members
                        .iter()
                        .map(|(member, presence)| {
                            (member.name().to_string(), text(presence.name()))
                        })
                        .collect(),
                ),
            ),
            (
                "references".to_string(),
                Json::Object(
                    self.references
                        .iter()
                        .map(|(reference, roles)| {
                            (
                                reference.name().to_string(),
                                Json::Array(roles.iter().map(|role| text(role)).collect()),
                            )
                        })
                        .collect(),
                ),
            ),
            (
                "rules".to_string(),
                Json::Array(self.rules.iter().map(|rule| text(rule.name())).collect()),
            ),
            ("meaning".to_string(), text(&self.meaning)),
        ];
        if self.immutable {
            members.push(("immutable".to_string(), Json::Bool(true)));
        }
        Json::Object(members)
    }
}

#[cfg(test)]
mod tests {
    use super::{Declaration, Identity, Member, Presence, Rule, Shape};
    use crate::json::{parse, to_canonical_string, Json};

    const VOCABULARY: &str = include_str!("../../../schema/semantic/v1/construct-vocabulary.json");
    const SCHEMA: &str = include_str!("../../../schema/semantic/v1/semantic-ir.schema.json");

    fn strings(value: Option<&Json>) -> Vec<&str> {
        value
            .and_then(Json::as_array)
            .expect("an array")
            .iter()
            .map(|item| item.as_str().expect("a string"))
            .collect()
    }

    fn names_of<'a>(value: Option<&'a Json>, member: &str) -> Vec<&'a str> {
        value
            .and_then(Json::as_array)
            .expect("an array")
            .iter()
            .map(|item| item.get(member).and_then(Json::as_str).expect("a name"))
            .collect()
    }

    /// Core-vocabulary parity, Rust side: the enums spell exactly the
    /// vocabulary file, member defaults and rule requirements included, and
    /// the schema's `constructDeclaration` enumerates the same terms.
    #[test]
    fn tc_1786_the_rust_vocabulary_is_the_declared_vocabulary() {
        let vocabulary = parse(VOCABULARY).expect("the vocabulary is JSON");
        assert_eq!(Identity::names(), strings(vocabulary.get("identities")));
        assert_eq!(Shape::names(), strings(vocabulary.get("shapes")));
        assert_eq!(Presence::names(), strings(vocabulary.get("presences")));
        assert_eq!(Member::names(), names_of(vocabulary.get("members"), "name"));
        assert_eq!(Rule::names(), names_of(vocabulary.get("rules"), "name"));
        for entry in vocabulary.get("members").and_then(Json::as_array).unwrap() {
            let member = Member::parse(entry.get("name").and_then(Json::as_str).unwrap()).unwrap();
            assert_eq!(
                Some(member.default_presence().name()),
                entry.get("default").and_then(Json::as_str),
                "{}",
                member.name()
            );
            assert_eq!(
                member.reference_items(),
                entry
                    .get("referenceItems")
                    .map(|items| strings(Some(items)))
                    .as_deref(),
                "{}",
                member.name()
            );
        }
        for entry in vocabulary.get("rules").and_then(Json::as_array).unwrap() {
            let rule = Rule::parse(entry.get("name").and_then(Json::as_str).unwrap()).unwrap();
            let (member, presence) = rule.requires();
            assert_eq!(
                entry.get("member").and_then(Json::as_str),
                Some(member.name())
            );
            assert_eq!(
                entry.get("presence").and_then(Json::as_str),
                Some(presence.name())
            );
            assert_eq!(
                entry
                    .get("nonEmpty")
                    .and_then(Json::as_bool)
                    .unwrap_or(false),
                rule.non_empty(),
                "{}",
                rule.name()
            );
        }
        let requirements = |key: &str, term: &str| -> Vec<(String, (&str, &str))> {
            vocabulary
                .get(key)
                .and_then(Json::as_array)
                .expect("requirements")
                .iter()
                .map(|entry| {
                    let at = |name: &str| entry.get(name).and_then(Json::as_str).expect(name);
                    (at(term).to_string(), (at("member"), at("presence")))
                })
                .collect()
        };
        let stated = |required: Option<(Member, Presence)>| {
            required.map(|(member, presence)| (member.name(), presence.name()))
        };
        let identities = requirements("identityRequirements", "identity");
        for identity in Identity::ALL {
            let listed = identities
                .iter()
                .find(|(term, _)| term == identity.name())
                .map(|(_, requirement)| *requirement);
            assert_eq!(listed, stated(identity.requires()), "{}", identity.name());
        }
        let shapes = requirements("shapeRequirements", "shape");
        for shape in Shape::ALL {
            let listed = shapes
                .iter()
                .find(|(term, _)| term == shape.name())
                .map(|(_, requirement)| *requirement);
            assert_eq!(listed, stated(shape.requires()), "{}", shape.name());
        }
        assert_eq!(
            names_of(vocabulary.get("flags"), "name"),
            ["immutable"],
            "the flags Declaration reads"
        );

        let schema = parse(SCHEMA).expect("the schema is JSON");
        let defs = schema.get("$defs").expect("$defs");
        let declaration = defs
            .get("constructDeclaration")
            .and_then(|d| d.get("properties"))
            .expect("constructDeclaration");
        assert_eq!(
            Identity::names(),
            strings(declaration.get("identity").and_then(|p| p.get("enum")))
        );
        assert_eq!(
            Shape::names(),
            strings(declaration.get("shape").and_then(|p| p.get("enum")))
        );
        let members = declaration.get("members").expect("members");
        assert_eq!(
            Member::names(),
            strings(members.get("propertyNames").and_then(|p| p.get("enum")))
        );
        assert_eq!(
            Presence::names(),
            strings(
                members
                    .get("additionalProperties")
                    .and_then(|p| p.get("enum"))
            )
        );
        let references: Vec<&str> = Member::ALL
            .iter()
            .filter(|member| member.reference_items().is_some())
            .map(|member| member.name())
            .collect();
        assert_eq!(
            references,
            strings(
                declaration
                    .get("references")
                    .and_then(|p| p.get("propertyNames"))
                    .and_then(|p| p.get("enum"))
            )
        );
        assert_eq!(
            Rule::names(),
            strings(
                declaration
                    .get("rules")
                    .and_then(|p| p.get("items"))
                    .and_then(|p| p.get("enum"))
            )
        );
        for flag in vocabulary.get("flags").and_then(Json::as_array).unwrap() {
            let name = flag.get("name").and_then(Json::as_str).unwrap();
            assert_eq!(
                declaration
                    .get(name)
                    .and_then(|p| p.get("type"))
                    .and_then(Json::as_str),
                Some("boolean"),
                "{name}"
            );
            assert_eq!(flag.get("default").and_then(Json::as_bool), Some(false));
        }
    }

    fn declaration(text: &str) -> Result<Declaration, super::DeclarationError> {
        Declaration::read(&parse(text).expect("JSON"))
    }

    #[test]
    fn tc_1788_a_declaration_round_trips_and_defaults_unlisted_members() {
        let text = r#"{"identity":"identified","shape":"record","members":{"fields":"required","identityFields":"required","owner":"required"},"references":{"owner":["acme:thing","acme:part"]},"rules":["identity_field_required","single_owner"],"meaning":"quire.meaning.model.object-type/v1"}"#;
        let read = declaration(text).expect("a declaration");
        assert_eq!(read.presence(Member::Owner), Presence::Required);
        assert_eq!(read.presence(Member::Clauses), Presence::Optional);
        assert_eq!(read.presence(Member::Steps), Presence::Forbidden);
        assert!(read.has_rule(Rule::SingleOwner));
        assert_eq!(read.roles(Member::Owner).map(<[_]>::len), Some(2));
        assert_eq!(read.roles(Member::Members), None);
        assert_eq!(read.referenced_roles(), ["acme:thing", "acme:part"]);
        let bare = declaration(
            r#"{"identity":"none","shape":"interface","members":{"operations":"required"},"meaning":"m"}"#,
        )
        .expect("references and rules may be absent");
        assert!(bare.references.is_empty() && bare.rules.is_empty());
        assert!(
            !read.immutable && !bare.immutable,
            "immutable defaults to false"
        );
        let immutable = r#"{"identity":"none","shape":"record","members":{},"references":{},"rules":[],"meaning":"m","immutable":true}"#;
        let flagged = declaration(immutable).expect("immutable may be stated");
        assert!(flagged.immutable);
        assert_eq!(
            to_canonical_string(&flagged.to_json()),
            to_canonical_string(&parse(immutable).unwrap())
        );
        assert_eq!(
            to_canonical_string(&read.to_json()),
            to_canonical_string(&parse(text).unwrap())
        );
    }

    #[test]
    fn tc_1788_a_declaration_refuses_each_defect_at_its_pointer() {
        let cases = [
            (
                r#"{"identity":"x","shape":"record","members":{},"references":{},"rules":[],"meaning":"m"}"#,
                "/identity",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{"colour":"required"},"references":{},"rules":[],"meaning":"m"}"#,
                "/members/colour",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"references":{},"rules":["min_clauses"],"meaning":"m"}"#,
                "/rules/0",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"references":{"owner":["a:b"]},"rules":[],"meaning":"m"}"#,
                "/references/owner",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{"owner":"optional"},"references":{"owner":["*"]},"rules":[],"meaning":"m"}"#,
                "/references/owner/0",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{"owner":"optional"},"references":{"owner":["a","a"]},"rules":[],"meaning":"m"}"#,
                "/references/owner/1",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{"fields":"optional"},"references":{"fields":["a"]},"rules":[],"meaning":"m"}"#,
                "/references/fields",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"rules":["min_clauses","min_clauses"],"meaning":"m"}"#,
                "/rules/1",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"references":{},"rules":[],"meaning":"m","extra":1}"#,
                "",
            ),
            (r#"{"shape":"record","members":{},"meaning":"m"}"#, ""),
            (
                r#"{"identity":"identified","shape":"record","members":{},"meaning":"m"}"#,
                "/identity",
            ),
            (
                r#"{"identity":"none","shape":"enumeration","members":{"variants":"optional"},"meaning":"m"}"#,
                "/shape",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"meaning":"m","immutable":"yes"}"#,
                "/immutable",
            ),
            (
                r#"{"identity":"none","shape":"record","members":{},"references":{},"rules":[],"meaning":""}"#,
                "/meaning",
            ),
        ];
        for (text, pointer) in cases {
            let refused = declaration(text).expect_err(text);
            assert_eq!(refused.pointer, pointer, "{}", refused.message);
        }
    }
}
