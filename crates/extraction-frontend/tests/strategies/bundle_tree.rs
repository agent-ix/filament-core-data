//! The NFR-031-AC-10 bundle-tree strategy: a whole spec bundle as a list
//! of relative paths and file bytes, mutated along every seam the FR-091
//! and FR-093 edge cases name — a missing or malformed `spec.md`, a UTF-8
//! BOM (EC-148), CRLF line endings (EC-147), an empty `## Properties`
//! table (EC-142), unknown object types, duplicate and absent ids,
//! dangling relationship targets, unknown edge verbs, unresolvable type
//! tokens, malformed multiplicities and constraints, nested paths, a
//! `sysml` fence beside or instead of the table, clause fences, and plain
//! non-frontmatter text.
//!
//! The strategy generates the tree; [`BundleTree::materialize`] writes it
//! under a scratch root. Nothing here is a fixture: every tree is
//! transient.

use std::fs;
use std::path::Path;

use proptest::prelude::*;

/// One generated bundle: `(bundle-relative path, bytes)` pairs. Later
/// entries overwrite earlier ones at the same path, which is how a
/// duplicate path collapses to one file.
#[derive(Debug, Clone)]
pub struct BundleTree {
    pub files: Vec<(String, Vec<u8>)>,
}

impl BundleTree {
    /// Write every file under `root`, creating directories as needed.
    pub fn materialize(&self, root: &Path) {
        for (rel, bytes) in &self.files {
            let path = root.join(rel);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).expect("create parent");
            }
            fs::write(&path, bytes).unwrap_or_else(|e| panic!("write {}: {e}", path.display()));
        }
    }

    /// The number of files in the tree.
    pub fn len(&self) -> usize {
        self.files.len()
    }

    pub fn is_empty(&self) -> bool {
        self.files.is_empty()
    }
}

/// How one file's bytes are finished: line endings and a leading BOM.
#[derive(Debug, Clone, Copy)]
pub struct Encoding {
    pub crlf: bool,
    pub bom: bool,
}

impl Encoding {
    fn apply(self, text: &str) -> Vec<u8> {
        let mut out = Vec::new();
        if self.bom {
            out.extend_from_slice("\u{feff}".as_bytes());
        }
        if self.crlf {
            out.extend_from_slice(text.replace('\n', "\r\n").as_bytes());
        } else {
            out.extend_from_slice(text.as_bytes());
        }
        out
    }
}

fn encoding() -> impl Strategy<Value = Encoding> {
    (prop::bool::weighted(0.15), prop::bool::weighted(0.1))
        .prop_map(|(crlf, bom)| Encoding { crlf, bom })
}

/// The `spec/spec.md` variants: well-formed, missing a field, no
/// frontmatter at all, or absent from the tree.
#[derive(Debug, Clone)]
pub enum SpecMd {
    WellFormed { name: String, org: String },
    MissingName,
    NoFrontmatter,
    Absent,
}

fn spec_md() -> impl Strategy<Value = SpecMd> {
    prop_oneof![
        7 => ("[a-z][a-z0-9-]{0,12}", "[a-z][a-z0-9-]{0,8}")
            .prop_map(|(name, org)| SpecMd::WellFormed { name, org }),
        1 => Just(SpecMd::MissingName),
        1 => Just(SpecMd::NoFrontmatter),
        1 => Just(SpecMd::Absent),
    ]
}

impl SpecMd {
    fn text(&self) -> Option<String> {
        match self {
            SpecMd::WellFormed { name, org } => Some(format!(
                "---\ntype: master-requirements\nname: {name}\norg: {org}\ntitle: \"Fuzzed {name}\"\n---\n# Fuzzed\n"
            )),
            SpecMd::MissingName => Some(
                "---\ntype: master-requirements\norg: agent-ix\ntitle: Nameless\n---\n# Nameless\n"
                    .to_string(),
            ),
            SpecMd::NoFrontmatter => Some("# Just a heading\n\nNo frontmatter here.\n".to_string()),
            SpecMd::Absent => None,
        }
    }
}

/// One `## Properties` row, in the four-column typed-table form.
#[derive(Debug, Clone)]
pub struct FieldRow {
    pub name: String,
    pub type_token: String,
    pub multiplicity: String,
    pub constraints: String,
}

fn field_row() -> impl Strategy<Value = FieldRow> {
    let name = prop_oneof![
        4 => "[a-z][A-Za-z0-9]{0,10}".prop_map(String::from),
        1 => Just("id".to_string()),
        1 => Just(String::new()),
        1 => Just("weird name!".to_string()),
        1 => Just("Ünïcödé".to_string()),
    ];
    let type_token = prop_oneof![
        3 => prop::sample::select(vec![
            "UUID", "String", "Integer", "Boolean", "Timestamp", "JsonObject", "Decimal",
        ])
        .prop_map(String::from),
        2 => "[A-Z][A-Za-z0-9]{0,10}".prop_map(String::from),
        1 => "[A-Z][a-z]{1,6}".prop_map(|t| format!("List<{t}>")),
        1 => "[A-Z][a-z]{1,6}".prop_map(|t| format!("Set<{t}>")),
        1 => Just("".to_string()),
        1 => Just("A<B<C".to_string()),
    ];
    let multiplicity = prop::sample::select(vec![
        "1", "0..1", "*", "1..*", "0..*", "2..5", "", "bogus", "1..", "..1", "-1",
    ])
    .prop_map(String::from);
    let constraints = prop::sample::select(vec![
        "",
        "identity",
        "nonEmpty",
        "min: 1",
        "max: 10",
        "maxLength: 64",
        "pattern: ^[a-z]+$",
        "identity, nonEmpty",
        "bogus:",
        "min: x",
        "|",
    ])
    .prop_map(String::from);
    (name, type_token, multiplicity, constraints).prop_map(
        |(name, type_token, multiplicity, constraints)| FieldRow {
            name,
            type_token,
            multiplicity,
            constraints,
        },
    )
}

/// How a document declares its fields.
#[derive(Debug, Clone)]
pub enum Declaration {
    /// A typed table with the given rows (possibly none: EC-142).
    Table(Vec<FieldRow>),
    /// A `sysml` fence with the same rows spelled as attributes.
    Fence(Vec<FieldRow>),
    /// Both forms under one heading.
    Both(Vec<FieldRow>),
    /// No `## Properties` at all.
    None,
}

fn declaration() -> impl Strategy<Value = Declaration> {
    let rows = || prop::collection::vec(field_row(), 0..7);
    prop_oneof![
        4 => rows().prop_map(Declaration::Table),
        2 => rows().prop_map(Declaration::Fence),
        1 => rows().prop_map(Declaration::Both),
        1 => Just(Declaration::None),
    ]
}

fn table_text(rows: &[FieldRow]) -> String {
    let mut s = String::from("| Field | Type | Multiplicity | Constraints |\n|---|---|---|---|\n");
    for row in rows {
        s.push_str(&format!(
            "| {} | {} | {} | {} |\n",
            row.name, row.type_token, row.multiplicity, row.constraints
        ));
    }
    s
}

fn fence_text(rows: &[FieldRow]) -> String {
    let mut s = String::from("```sysml\n");
    for row in rows {
        let braces = if row.constraints.is_empty() {
            String::new()
        } else {
            format!(" {{ {} }}", row.constraints)
        };
        s.push_str(&format!(
            "  attribute {} : {}[{}]{braces}\n",
            row.name, row.type_token, row.multiplicity
        ));
    }
    s.push_str("```\n");
    s
}

/// One frontmatter relationship.
#[derive(Debug, Clone)]
pub struct Edge {
    pub target: String,
    pub verb: String,
}

fn edge(ids: Vec<String>) -> impl Strategy<Value = Edge> {
    let target = prop_oneof![
        3 => prop::sample::select(ids).prop_map(|id| format!("ix://agent-ix/fuzz/{id}")),
        1 => "[A-Z]{2}-[0-9]{3}".prop_map(|id| format!("ix://agent-ix/fuzz/{id}")),
        1 => Just("not a uri".to_string()),
        1 => Just(String::new()),
    ];
    let verb = prop::sample::select(vec![
        "references",
        "belongs_to",
        "part_of",
        "depends_on",
        "bogus_verb",
        "",
    ])
    .prop_map(String::from);
    (target, verb).prop_map(|(target, verb)| Edge { target, verb })
}

/// One document of the bundle.
#[derive(Debug, Clone)]
pub struct Doc {
    pub dir: String,
    pub id: Option<String>,
    pub title: String,
    pub name: Option<String>,
    pub object: Option<String>,
    pub declaration: Declaration,
    pub edges: Vec<Edge>,
    pub values: Vec<String>,
    pub clause: Option<(String, String)>,
    pub trailing: String,
    pub encoding: Encoding,
    /// A well-formed document: its id is rewritten to a unique one when
    /// the tree is assembled, so some trees lift to a document.
    pub benign: bool,
}

fn doc(ids: Vec<String>) -> impl Strategy<Value = Doc> {
    let dir = prop::sample::select(vec![
        "spec/functional",
        "spec/non-functional",
        "spec",
        "spec/functional/nested/deeper",
        "spec/a/b/c/d/e/f",
        "docs",
    ])
    .prop_map(String::from);
    let id = prop_oneof![
        5 => prop::sample::select(ids.clone()).prop_map(Some),
        1 => Just(None),
        1 => Just(Some("FR-".to_string())),
    ];
    let title = prop_oneof![
        3 => "[A-Z][a-z]{1,8}( [A-Z][a-z]{1,8}){0,2}".prop_map(String::from),
        1 => Just(String::new()),
        1 => Just("123".to_string()),
        1 => Just("Ünïcödé Title".to_string()),
    ];
    let name = prop::option::of(prop_oneof![
        3 => "[A-Z][A-Za-z0-9]{0,10}".prop_map(String::from),
        1 => Just("String".to_string()),
        1 => Just("has space".to_string()),
    ]);
    let object = prop::option::weighted(
        0.8,
        prop::sample::select(vec![
            "entity",
            "value_object",
            "aggregate_root",
            "enumeration",
            "event",
            "aggregate",
            "service",
            "not-a-type",
            "",
        ])
        .prop_map(String::from),
    );
    let edges = prop::collection::vec(edge(ids), 0..3);
    let values = prop::collection::vec(
        prop_oneof![
            3 => "[a-z][a-z-]{0,8}".prop_map(String::from),
            1 => Just(String::new()),
            1 => Just("dup".to_string()),
        ],
        0..4,
    );
    let clause = prop::option::of((
        prop::sample::select(vec!["ocl", "sysml", "text", ""]).prop_map(String::from),
        prop_oneof![
            2 => "[a-z ]{0,40}".prop_map(String::from),
            1 => Just("context X inv y: self.a = self.a@pre".to_string()),
            1 => Just("```".to_string()),
        ],
    ));
    let trailing = prop_oneof![
        3 => Just(String::new()),
        1 => Just("\n## Description\n\nNo trailing newline".to_string()),
        1 => Just("\n---\n".to_string()),
        1 => Just("\n| a | b |\n".to_string()),
    ];
    (
        (dir, id, title, name, object),
        declaration(),
        edges,
        values,
        clause,
        trailing,
        encoding(),
    )
        .prop_map(
            |(
                (dir, id, title, name, object),
                declaration,
                edges,
                values,
                clause,
                trailing,
                encoding,
            )| Doc {
                dir,
                id,
                title,
                name,
                object,
                declaration,
                edges,
                values,
                clause,
                trailing,
                encoding,
                benign: false,
            },
        )
}

/// A well-formed entity or value-object with valid rows only, so the
/// strategy reaches lifted trees as well as diagnosed ones.
fn benign_doc() -> impl Strategy<Value = Doc> {
    let object = prop::sample::select(vec!["entity", "value_object"]).prop_map(String::from);
    // Constraints that apply to their scalar (FR-093): `nonEmpty` and
    // `maxLength` to `String`, `min` to `Integer`, none to the rest.
    let row = (
        "[a-z][A-Za-z0-9]{0,10}",
        prop_oneof![
            prop::sample::select(vec!["", "nonEmpty", "maxLength: 64"])
                .prop_map(|c| ("String".to_string(), c.to_string()))
                .boxed(),
            prop::sample::select(vec!["", "min: 1"])
                .prop_map(|c| ("Integer".to_string(), c.to_string()))
                .boxed(),
            prop::sample::select(vec!["UUID", "Boolean", "Timestamp"])
                .prop_map(|t| (t.to_string(), String::new()))
                .boxed(),
        ],
        prop::sample::select(vec!["1", "0..1", "*", "1..*"]),
    )
        .prop_map(|(name, (type_token, constraints), multiplicity)| FieldRow {
            name,
            type_token,
            multiplicity: multiplicity.to_string(),
            constraints,
        });
    let rows = prop::collection::vec(row, 1..6).prop_map(|mut rows| {
        rows.insert(
            0,
            FieldRow {
                name: "id".to_string(),
                type_token: "UUID".to_string(),
                multiplicity: "1".to_string(),
                constraints: "identity".to_string(),
            },
        );
        rows.dedup_by(|a, b| a.name == b.name);
        rows
    });
    let declaration = prop_oneof![
        2 => rows.clone().prop_map(Declaration::Table),
        1 => rows.prop_map(Declaration::Fence),
    ];
    ("[A-Z][a-z]{2,8}", object, declaration, encoding()).prop_map(
        |(name, object, declaration, encoding)| Doc {
            dir: "spec/functional".to_string(),
            id: None,
            title: format!("{name} Thing"),
            name: Some(name),
            object: Some(object),
            declaration,
            edges: Vec::new(),
            values: Vec::new(),
            clause: None,
            trailing: String::new(),
            encoding,
            benign: true,
        },
    )
}

impl Doc {
    fn path(&self, index: usize) -> String {
        let stem = self.id.clone().unwrap_or_else(|| format!("X-{index:03}"));
        format!("{}/{stem}-fuzz.md", self.dir)
    }

    fn text(&self) -> String {
        let mut s = String::from("---\n");
        if let Some(id) = &self.id {
            s.push_str(&format!("id: {id}\n"));
        }
        s.push_str(&format!("title: \"{}\"\n", self.title.replace('"', "")));
        if let Some(object) = &self.object {
            s.push_str(&format!("object: {object}\n"));
        }
        s.push_str("type: FR\n");
        if let Some(name) = &self.name {
            s.push_str(&format!("name: {name}\n"));
        }
        if !self.edges.is_empty() {
            s.push_str("relationships:\n");
            for edge in &self.edges {
                s.push_str(&format!(
                    "  - target: \"{}\"\n    type: {}\n",
                    edge.target, edge.verb
                ));
            }
        }
        s.push_str("---\n\n");
        s.push_str(&format!(
            "# {}: {}\n\n",
            self.id.as_deref().unwrap_or("?"),
            self.title
        ));
        match &self.declaration {
            Declaration::Table(rows) => {
                s.push_str("## Properties\n\n");
                s.push_str(&table_text(rows));
            }
            Declaration::Fence(rows) => {
                s.push_str("## Properties\n\n");
                s.push_str(&fence_text(rows));
            }
            Declaration::Both(rows) => {
                s.push_str("## Properties\n\n");
                s.push_str(&table_text(rows));
                s.push('\n');
                s.push_str(&fence_text(rows));
            }
            Declaration::None => {}
        }
        if !self.values.is_empty() {
            s.push_str("\n## Values\n\n");
            for value in &self.values {
                s.push_str(&format!("- `{value}`\n"));
            }
        }
        if let Some((lang, body)) = &self.clause {
            s.push_str(&format!(
                "\n## Invariants\n\n### inv\n\n```{lang}\n{body}\n```\n"
            ));
        }
        s.push_str(&self.trailing);
        s
    }
}

/// A whole bundle tree of up to eight documents drawn from a small id
/// pool (so ids collide), with an optional stray non-document file.
pub fn bundle_tree() -> impl Strategy<Value = BundleTree> {
    let ids: Vec<String> = ["FR-001", "FR-002", "FR-003", "NFR-001", "US-001", "E-1"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    let docs = prop::collection::vec(prop_oneof![3 => doc(ids), 2 => benign_doc()], 0..8);
    let stray = prop::option::weighted(
        0.2,
        prop::sample::select(vec![
            ("spec/README.md", "# Not a document\n"),
            ("spec/functional/.hidden.md", "---\nid: FR-009\n---\n"),
            ("spec/empty.md", ""),
            ("spec/functional/binary.md", "\u{0}\u{1}\u{2}"),
        ]),
    );
    (spec_md(), docs, encoding(), stray).prop_map(|(spec, docs, spec_encoding, stray)| {
        let mut files = Vec::new();
        if let Some(text) = spec.text() {
            files.push(("spec/spec.md".to_string(), spec_encoding.apply(&text)));
        }
        for (index, doc) in docs.into_iter().enumerate() {
            let doc = if doc.benign {
                Doc {
                    id: Some(format!("FR-9{index:02}")),
                    ..doc
                }
            } else {
                doc
            };
            files.push((doc.path(index), doc.encoding.apply(&doc.text())));
        }
        if let Some((rel, text)) = stray {
            files.push((rel.to_string(), text.as_bytes().to_vec()));
        }
        BundleTree { files }
    })
}
