//! The compatibility classifier, over the IR surface only.
//!
//! `contracts-v1.md` fixes the vocabulary — "Reports classify patch, additive,
//! conditional, breaking, unknown, and invalid changes" — and the tie-break:
//! "Cross-target disagreement produces the most restrictive result".
//! `spec/functional/FR-036` states the corpus's declared restrictiveness order,
//! most restrictive first: `invalid`, `breaking`, `unknown`, `conditional`,
//! `additive`, `patch`.
//!
//! The classifier reads the IR surface and nothing else:
//! `compatibility-report.schema.json` and FR-025 stay the authority for the
//! profile, mapping, representation, generated-target, and consumer-evidence
//! surfaces.

use crate::json::{to_canonical_string, Json};
use crate::rules::{Document, Resolved};

/// One of the six dispositions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Classification {
    /// No change a rule models, and nothing unclassifiable.
    Patch,
    /// A change every consumer tolerates.
    Additive,
    /// A change whose disposition depends on consumer policy.
    Conditional,
    /// A change no rule models.
    Unknown,
    /// A change that breaks a consumer.
    Breaking,
    /// A pair at least one document of which is invalid.
    Invalid,
}

impl Classification {
    /// The wire name.
    pub fn as_str(self) -> &'static str {
        match self {
            Classification::Patch => "patch",
            Classification::Additive => "additive",
            Classification::Conditional => "conditional",
            Classification::Unknown => "unknown",
            Classification::Breaking => "breaking",
            Classification::Invalid => "invalid",
        }
    }
}

struct Report {
    worst: Classification,
}

impl Report {
    fn note(&mut self, classification: Classification) {
        if classification > self.worst {
            self.worst = classification;
        }
    }
}

/// Classifies a before/after pair of input bundles.
///
/// `before_valid` and `after_valid` are the verdicts of the document layer:
/// "a pair is classified only when both documents are valid".
pub fn classify(
    before: &Json,
    after: &Json,
    before_valid: bool,
    after_valid: bool,
) -> Classification {
    if !before_valid || !after_valid {
        return Classification::Invalid;
    }
    let (before_doc, after_doc) = match (Document::read(before), Document::read(after)) {
        (Some(before_doc), Some(after_doc)) => (before_doc, after_doc),
        _ => return Classification::Invalid,
    };
    let mut report = Report {
        worst: Classification::Patch,
    };

    // fcd#179: contract 2.0.0 is the only one, so no contract-version move
    // between two valid documents can occur any more; kept as a general,
    // conditional default rather than special-cased, since a future contract
    // revision is not this ticket's to predict.
    if before_doc.ir.get("contractVersion") != after_doc.ir.get("contractVersion") {
        report.note(Classification::Conditional);
    }

    compare_extensions(&before_doc, &after_doc, &mut report);

    for definition in before_doc.types {
        let identity = match definition.get("identity").and_then(Json::as_str) {
            Some(identity) => identity,
            None => continue,
        };
        match after_doc.type_of(identity) {
            None => report.note(Classification::Breaking),
            Some(later) => compare_type(
                &before_doc,
                definition,
                &after_doc,
                later,
                after,
                &mut report,
            ),
        }
    }
    report.worst
}

fn compare_extensions(before: &Document<'_>, after: &Document<'_>, report: &mut Report) {
    let empty: &[Json] = &[];
    let earlier = before
        .ir
        .get("extensions")
        .and_then(Json::as_array)
        .unwrap_or(empty);
    let later = after
        .ir
        .get("extensions")
        .and_then(Json::as_array)
        .unwrap_or(empty);
    let key = |extension: &Json| {
        extension
            .get("identity")
            .and_then(Json::as_str)
            .unwrap_or("")
            .to_string()
    };
    for extension in earlier {
        let identity = key(extension);
        match later.iter().find(|other| key(other) == identity) {
            None => report.note(Classification::Breaking),
            Some(other) => {
                let was_required = extension.get("required").and_then(Json::as_bool) == Some(true);
                let is_required = other.get("required").and_then(Json::as_bool) == Some(true);
                if !was_required && is_required {
                    report.note(Classification::Breaking);
                } else if was_required && !is_required {
                    report.note(Classification::Additive);
                } else if to_canonical_string(extension) != to_canonical_string(other) {
                    report.note(Classification::Conditional);
                }
            }
        }
    }
    for extension in later {
        let identity = key(extension);
        if earlier.iter().any(|other| key(other) == identity) {
            continue;
        }
        // "Required additions ... are breaking. Optional additions are additive
        // only when every target and known consumer preserves, ignores, or
        // surfaces them as declared."
        if extension.get("required").and_then(Json::as_bool) == Some(true) {
            report.note(Classification::Breaking);
        } else {
            report.note(Classification::Additive);
        }
    }
}

fn compare_type(
    before: &Document<'_>,
    earlier: &Json,
    after: &Document<'_>,
    later: &Json,
    after_bundle: &Json,
    report: &mut Report,
) {
    for member in ["kind", "scalar"] {
        if earlier.get(member) != later.get(member) {
            report.note(Classification::Breaking);
        }
    }
    for member in ["target", "items", "values"] {
        let earlier_ref = earlier.get(member).and_then(Json::as_str);
        let later_ref = later.get(member).and_then(Json::as_str);
        if earlier_ref.is_none() && later_ref.is_none() {
            continue;
        }
        if resolved_key(before, earlier_ref) != resolved_key(after, later_ref) {
            report.note(Classification::Breaking);
        }
    }
    // "unknown-policy tightening [is] breaking"; loosening it is not.
    let rank = |policy: Option<&str>| match policy {
        Some("preserve") => 0,
        Some("surface") => 1,
        Some("reject") => 2,
        _ => -1,
    };
    let was = rank(earlier.get("unknownPolicy").and_then(Json::as_str));
    let is = rank(later.get("unknownPolicy").and_then(Json::as_str));
    if is > was {
        report.note(Classification::Breaking);
    } else if is < was {
        report.note(Classification::Additive);
    }

    compare_constraints(earlier, later, report);
    compare_fields(before, earlier, after, later, after_bundle, report);
    compare_variants(before, earlier, after, later, report);
    compare_relationships(earlier, later, report);
    compare_operations(before, earlier, after, later, report);
    compare_clauses(earlier, later, report);
}

fn resolved_key(document: &Document<'_>, identity: Option<&str>) -> String {
    let identity = match identity {
        Some(identity) => identity,
        None => return String::new(),
    };
    match document.resolve(identity) {
        Some(Resolved::Node(resolved)) => resolved
            .get("identity")
            .and_then(Json::as_str)
            .unwrap_or(identity)
            .to_string(),
        Some(Resolved::Native(_)) | None => identity.to_string(),
    }
}

fn members<'a>(node: &'a Json, name: &str) -> &'a [Json] {
    node.get(name).and_then(Json::as_array).unwrap_or(&[])
}

fn identity_of(node: &Json) -> &str {
    node.get("identity").and_then(Json::as_str).unwrap_or("")
}

fn compare_constraints(earlier: &Json, later: &Json, report: &mut Report) {
    let before = members(earlier, "constraints");
    let after = members(later, "constraints");
    for constraint in before {
        let identity = identity_of(constraint);
        match after.iter().find(|other| identity_of(other) == identity) {
            // "a constraint relaxation as additive"
            None => report.note(Classification::Additive),
            Some(other) => {
                if to_canonical_string(constraint) == to_canonical_string(other) {
                    continue;
                }
                report.note(operand_move(constraint, other));
            }
        }
    }
    for constraint in after {
        let identity = identity_of(constraint);
        if !before.iter().any(|other| identity_of(other) == identity) {
            // "a constraint tightening ... as conditional"
            report.note(Classification::Conditional);
        }
    }
}

fn operand_move(earlier: &Json, later: &Json) -> Classification {
    let keyword = earlier.get("keyword").and_then(Json::as_str).unwrap_or("");
    if later.get("keyword").and_then(Json::as_str) != Some(keyword) {
        return Classification::Conditional;
    }
    let before = earlier
        .get("operands")
        .and_then(|operands| operands.get("value"))
        .and_then(Json::as_f64);
    let after = later
        .get("operands")
        .and_then(|operands| operands.get("value"))
        .and_then(Json::as_f64);
    let (before, after) = match (before, after) {
        (Some(before), Some(after)) => (before, after),
        _ => return Classification::Conditional,
    };
    let tightening = match keyword {
        "min" | "minLength" | "exclusiveMin" => after > before,
        "max" | "maxLength" | "exclusiveMax" => after < before,
        _ => return Classification::Conditional,
    };
    if tightening {
        Classification::Conditional
    } else {
        Classification::Additive
    }
}

/// The effective multiplicity of a field: the declared one, or the one
/// FR-027-CON-1 derives from `presence` when none is declared.
fn effective_multiplicity(field: &Json) -> (i64, Option<i64>, bool, bool) {
    match field.get("multiplicity") {
        Some(multiplicity) if multiplicity.as_object().is_some() => (
            multiplicity
                .get("lower")
                .and_then(Json::as_i64)
                .unwrap_or(0),
            multiplicity.get("upper").and_then(Json::as_i64),
            multiplicity.get("ordered").and_then(Json::as_bool) == Some(true),
            multiplicity.get("unique").and_then(Json::as_bool) == Some(true),
        ),
        _ => {
            let lower = if field.get("presence").and_then(Json::as_str) == Some("required") {
                1
            } else {
                0
            };
            (lower, Some(1), false, false)
        }
    }
}

fn compare_fields(
    before_doc: &Document<'_>,
    earlier: &Json,
    after_doc: &Document<'_>,
    later: &Json,
    after_bundle: &Json,
    report: &mut Report,
) {
    let before = members(earlier, "fields");
    let after = members(later, "fields");
    for field in before {
        let identity = identity_of(field);
        match after.iter().find(|other| identity_of(other) == identity) {
            // "any removal ... [is] breaking"
            None => report.note(Classification::Breaking),
            Some(other) => compare_field(before_doc, field, after_doc, other, report),
        }
    }
    for field in after {
        let identity = identity_of(field);
        if before.iter().any(|other| identity_of(other) == identity) {
            continue;
        }
        let (lower, _, _, _) = effective_multiplicity(field);
        if lower >= 1 {
            // "Required additions ... are breaking."
            report.note(Classification::Breaking);
        } else {
            report.note(optional_addition(after_bundle));
        }
    }
}

/// An optional field addition is `additive` only when the bundle's consumer
/// policy preserves or surfaces unknown members, and `conditional` otherwise or
/// when no consumer policy is supplied.
fn optional_addition(bundle: &Json) -> Classification {
    let policy = bundle
        .get("consumerPolicy")
        .and_then(|policy| policy.get("unknownExtensions"))
        .and_then(Json::as_str);
    match policy {
        Some("preserve") | Some("surface") => Classification::Additive,
        _ => Classification::Conditional,
    }
}

fn compare_field(
    before_doc: &Document<'_>,
    earlier: &Json,
    after_doc: &Document<'_>,
    later: &Json,
    report: &mut Report,
) {
    if earlier.get("name") != later.get("name") {
        report.note(Classification::Breaking);
    }
    if resolved_key(before_doc, earlier.get("typeRef").and_then(Json::as_str))
        != resolved_key(after_doc, later.get("typeRef").and_then(Json::as_str))
    {
        report.note(Classification::Breaking);
    }
    if earlier
        .get("nullable")
        .and_then(Json::as_bool)
        .unwrap_or(false)
        != later
            .get("nullable")
            .and_then(Json::as_bool)
            .unwrap_or(false)
    {
        report.note(Classification::Breaking);
    }
    // "a `unit`, `ordered`, or `unique` change as breaking" (FR-027).
    if earlier.get("unit").and_then(Json::as_str) != later.get("unit").and_then(Json::as_str) {
        report.note(Classification::Breaking);
    }
    let (before_lower, before_upper, before_ordered, before_unique) =
        effective_multiplicity(earlier);
    let (after_lower, after_upper, after_ordered, after_unique) = effective_multiplicity(later);
    if before_ordered != after_ordered || before_unique != after_unique {
        report.note(Classification::Breaking);
    }
    let narrowed = after_lower > before_lower
        || match (before_upper, after_upper) {
            (None, Some(_)) => true,
            (Some(before), Some(after)) => after < before,
            _ => false,
        };
    let widened = after_lower < before_lower
        || match (before_upper, after_upper) {
            (Some(_), None) => true,
            (Some(before), Some(after)) => after > before,
            _ => false,
        };
    if narrowed {
        report.note(Classification::Breaking);
    } else if widened {
        report.note(Classification::Additive);
    }
    if earlier.get("defaultKind") != later.get("defaultKind")
        || earlier.get("defaultValue") != later.get("defaultValue")
    {
        report.note(Classification::Conditional);
    }
}

fn compare_variants(
    before_doc: &Document<'_>,
    earlier: &Json,
    after_doc: &Document<'_>,
    later: &Json,
    report: &mut Report,
) {
    let before = members(earlier, "variants");
    let after = members(later, "variants");
    for variant in before {
        let identity = identity_of(variant);
        match after.iter().find(|other| identity_of(other) == identity) {
            None => report.note(Classification::Breaking),
            Some(other) => {
                if variant.get("name") != other.get("name") {
                    report.note(Classification::Breaking);
                }
                if resolved_key(
                    before_doc,
                    variant.get("payloadType").and_then(Json::as_str),
                ) != resolved_key(after_doc, other.get("payloadType").and_then(Json::as_str))
                {
                    report.note(Classification::Breaking);
                }
            }
        }
    }
    for variant in after {
        let identity = identity_of(variant);
        if !before.iter().any(|other| identity_of(other) == identity) {
            // "an added enum or union variant as conditional"; open and closed
            // behaviour is consumer policy, not a language default.
            report.note(Classification::Conditional);
        }
    }
}

fn compare_relationships(earlier: &Json, later: &Json, report: &mut Report) {
    let before = members(earlier, "relationships");
    let after = members(later, "relationships");
    for relationship in before {
        let identity = identity_of(relationship);
        match after.iter().find(|other| identity_of(other) == identity) {
            None => report.note(Classification::Breaking),
            Some(other) => {
                if to_canonical_string(&strip_origin(relationship))
                    != to_canonical_string(&strip_origin(other))
                {
                    report.note(Classification::Breaking);
                }
            }
        }
    }
    for relationship in after {
        let identity = identity_of(relationship);
        if !before.iter().any(|other| identity_of(other) == identity) {
            report.note(Classification::Conditional);
        }
    }
}

fn compare_operations(
    before_doc: &Document<'_>,
    earlier: &Json,
    after_doc: &Document<'_>,
    later: &Json,
    report: &mut Report,
) {
    let before = members(earlier, "operations");
    let after = members(later, "operations");
    for operation in before {
        let identity = identity_of(operation);
        match after.iter().find(|other| identity_of(other) == identity) {
            None => report.note(Classification::Breaking),
            Some(other) => {
                let before_params = members(operation, "params");
                let after_params = members(other, "params");
                let signature_changed = before_params.len() != after_params.len()
                    || before_params.iter().zip(after_params.iter()).any(
                        |(earlier_param, later_param)| {
                            let mut probe = Report {
                                worst: Classification::Patch,
                            };
                            compare_field(
                                before_doc,
                                earlier_param,
                                after_doc,
                                later_param,
                                &mut probe,
                            );
                            identity_of(earlier_param) != identity_of(later_param)
                                || probe.worst != Classification::Patch
                        },
                    );
                if signature_changed {
                    report.note(Classification::Breaking);
                }
                if operation.get("name") != other.get("name")
                    || to_canonical_string(operation.get("returns").unwrap_or(&Json::Null))
                        != to_canonical_string(other.get("returns").unwrap_or(&Json::Null))
                {
                    report.note(Classification::Breaking);
                }
                for binding in ["pre", "post"] {
                    if operation.get(binding) != other.get(binding) {
                        report.note(Classification::Conditional);
                    }
                }
            }
        }
    }
    for operation in after {
        let identity = identity_of(operation);
        if !before.iter().any(|other| identity_of(other) == identity) {
            report.note(Classification::Conditional);
        }
    }
}

/// A clause carries opaque text the IR never parses, so a clause change is a
/// change no rule models: `unknown` rather than a silently-passing `patch`.
fn compare_clauses(earlier: &Json, later: &Json, report: &mut Report) {
    let before = members(earlier, "clauses");
    let after = members(later, "clauses");
    for clause in before {
        let identity = identity_of(clause);
        match after.iter().find(|other| identity_of(other) == identity) {
            None => report.note(Classification::Unknown),
            Some(other) => {
                if to_canonical_string(&strip_origin(clause))
                    != to_canonical_string(&strip_origin(other))
                {
                    report.note(Classification::Unknown);
                }
            }
        }
    }
    for clause in after {
        let identity = identity_of(clause);
        if !before.iter().any(|other| identity_of(other) == identity) {
            report.note(Classification::Unknown);
        }
    }
}

/// A node with its `origin` dropped.
///
/// "Display names, generated identifiers, source paths, documentation,
/// timestamps, and database revisions never substitute for stable semantic
/// identity", so moving a node from a source origin to a generated one is not a
/// contract change.
fn strip_origin(node: &Json) -> Json {
    match node.as_object() {
        Some(members) => Json::Object(
            members
                .iter()
                .filter(|(name, _)| name != "origin")
                .cloned()
                .collect(),
        ),
        None => node.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::{classify, Classification};
    use crate::json::parse;

    /// fcd#179 deleted contract 1.1.0 (and 1.0.0); the special-cased "the
    /// 1.1.0-to-2.0.0 uplift is additive" rule this test once asserted went
    /// with it, since no valid document is ever tagged 1.1.0 again. What
    /// remains is the general rule (`spec/functional/FR-051`): a document
    /// declaring types, changed only by a contract-version move, classifies
    /// `conditional` in either direction, never special-cased by the specific
    /// versions involved. Exercised through `classify`'s document-layer
    /// verdicts, a seam that lets this run over a historically-shaped pair
    /// without going through schema validation — so the "before" document
    /// below is a hand-written `1.1.0` literal, not a read of
    /// `config-version-v1-1.json`, which fcd#179 deleted along with every
    /// other document still declaring a deleted contract.
    #[test]
    fn tc_1757_classifies_a_contract_version_move_as_conditional() {
        let v11 = r#"{"contractVersion": "1.1.0", "types": [{"identity": "ix://agent-ix/config-service/type/ConfigOverlay", "kind": "record", "unknownPolicy": "reject", "extensions": []}]}"#;
        let wrap = |text: &str| parse(&format!(r#"{{"ir":{text}}}"#)).expect("a document");
        let before = wrap(v11);
        let after = wrap(&v11.replacen(
            r#""contractVersion": "1.1.0""#,
            r#""contractVersion": "2.0.0""#,
            1,
        ));
        let types = after
            .get("ir")
            .and_then(|ir| ir.get("types"))
            .and_then(crate::json::Json::as_array)
            .expect("types");
        assert!(!types.is_empty());
        assert_eq!(
            after
                .get("ir")
                .and_then(|ir| ir.get("contractVersion"))
                .and_then(crate::json::Json::as_str),
            Some("2.0.0")
        );
        assert_eq!(
            classify(&before, &after, true, true),
            Classification::Conditional
        );
        assert_eq!(
            classify(&after, &before, true, true),
            Classification::Conditional
        );
    }
}
