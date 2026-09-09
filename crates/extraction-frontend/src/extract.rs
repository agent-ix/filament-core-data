//! One `SemanticExtraction` per object-typed artifact (FR-091 "Extraction").
//!
//! The engine reads every declaration; this module only decides which
//! documents to hand it, under which context, and records what it says.

use std::collections::BTreeMap;

use quire_rs::semantic::{extract_semantic, RequiredSections, SemanticContext, SemanticExtraction};

use crate::bundle::Bundle;
use crate::diagnostics::{Code, Diagnostic, Locus};

/// The engine's extraction of one object-typed artifact.
#[derive(Debug, Clone)]
pub struct Extracted {
    /// Frontmatter `id`.
    pub id: String,
    /// Bundle-root-relative document path.
    pub path: String,
    /// Frontmatter `object`: the declaring object type.
    pub object: String,
    pub extraction: SemanticExtraction,
}

/// Every extraction keyed by artifact id, in id order, plus the frontend's
/// diagnostics: `UNKNOWN_OBJECT_TYPE` per undeclared type and one
/// `ENGINE_DIAGNOSTIC` per engine diagnostic, in the engine's order.
#[derive(Debug, Clone, Default)]
pub struct Extractions {
    pub artifacts: BTreeMap<String, Extracted>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Extract every document whose `object` a loaded module declares.
pub fn extract(bundle: &Bundle) -> Extractions {
    let source_identity = bundle.package().source_identity();
    let mut out = Extractions::default();
    for document in bundle.documents() {
        // Requirement, use-case, and review artifacts are not declarations.
        let Some(object) = document.object() else {
            continue;
        };
        let Some(object_type) = bundle.object_type(object) else {
            out.diagnostics.push(Diagnostic::frontend(
                Code::UnknownObjectType,
                format!(
                    "{} declares `object: {object}`, which no loaded module declares",
                    document.path()
                ),
                Some(Locus::head(&source_identity, document.path())),
            ));
            continue;
        };
        let dsl = object_type
            .archetype
            .body_extraction()
            .and_then(|dsl| serde_json::to_value(dsl).ok())
            .unwrap_or(serde_json::Value::Null);
        let required = RequiredSections::from_dsl(&dsl);
        let context = SemanticContext::new(
            object_type.semantic.clone(),
            document.path(),
            bundle.index().clone(),
        )
        .with_source_identity(source_identity.clone());
        let extraction = extract_semantic(
            document.raw(),
            &context,
            object_type.archetype.semantic_schema_digest.as_deref(),
            &required,
        );
        for diagnostic in &extraction.diagnostics {
            out.diagnostics.push(Diagnostic::engine(
                diagnostic,
                &source_identity,
                document.path(),
            ));
        }
        out.artifacts.insert(
            document.id().to_string(),
            Extracted {
                id: document.id().to_string(),
                path: document.path().to_string(),
                object: object.to_string(),
                extraction,
            },
        );
    }
    out
}
