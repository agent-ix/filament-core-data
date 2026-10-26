//! FR-146 dimension and unit graph diagnostics over a schema-admitted document.

use std::collections::{BTreeSet, HashMap};

use crate::diag::{child, index, locus_for, owner_for, Located, Severity};
use crate::json::Json;

const INVALID_GRAPH: &str = "agent-ix.semantic-ir.INVALID_UNIT_GRAPH";
const MISSING_DIMENSION: &str = "agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF";
const MISSING_UNIT: &str = "agent-ix.semantic-ir.UNRESOLVED_UNIT_REF";
const INVALID_OPERAND: &str = "agent-ix.semantic-ir.INVALID_OPERAND";
const OUTSIDE_I128: &str = "agent-ix.semantic-ir.INTEGER_OUTSIDE_I128";
const DUPLICATE_IDENTITY: &str = "agent-ix.semantic-ir.DUPLICATE_IDENTITY";

struct Diagnostics<'a> {
    bundle: &'a Json,
    seen: BTreeSet<(String, &'static str)>,
    items: Vec<Located>,
}

impl Diagnostics<'_> {
    fn emit(&mut self, code: &'static str, pointer: String, message: impl Into<String>) {
        if self.seen.insert((pointer.clone(), code)) {
            self.items.push(Located {
                owner: owner_for(self.bundle, &pointer),
                locus: locus_for(self.bundle, &pointer),
                pointer,
                code,
                severity: Severity::Error,
                message: message.into(),
                blocking: true,
            });
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum NumericError {
    Noncanonical,
    OutsideI128,
}

impl NumericError {
    fn code(self) -> &'static str {
        match self {
            Self::Noncanonical => INVALID_OPERAND,
            Self::OutsideI128 => OUTSIDE_I128,
        }
    }
}

fn canonical_integer(text: &str) -> Result<i128, NumericError> {
    let digits = text.strip_prefix('-').unwrap_or(text);
    let mut bytes = digits.bytes();
    let canonical = text == "0"
        || (bytes
            .next()
            .is_some_and(|first| (b'1'..=b'9').contains(&first))
            && bytes.all(|byte| byte.is_ascii_digit()));
    if !canonical {
        return Err(NumericError::Noncanonical);
    }
    text.parse().map_err(|_| NumericError::OutsideI128)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RationalKind {
    Zero,
    One,
    Other,
}

fn canonical_rational(text: &str) -> Result<RationalKind, NumericError> {
    let Some((numerator, denominator)) = text.split_once('/') else {
        return canonical_integer(text).map(|value| match value {
            0 => RationalKind::Zero,
            1 => RationalKind::One,
            _ => RationalKind::Other,
        });
    };
    if denominator.contains('/') {
        return Err(NumericError::Noncanonical);
    }
    let numerator = canonical_integer(numerator);
    let denominator = canonical_integer(denominator);
    if numerator == Err(NumericError::OutsideI128) || denominator == Err(NumericError::OutsideI128)
    {
        return Err(NumericError::OutsideI128);
    }
    let numerator = numerator?;
    let denominator = denominator?;
    if numerator == 0 || denominator < 2 {
        return Err(NumericError::Noncanonical);
    }
    // The magnitude of i128::MIN fits u128, so its canonical rational needs
    // neither a signed negation nor a wider intermediate.
    let mut left = numerator.unsigned_abs();
    let mut right = denominator.unsigned_abs();
    while right != 0 {
        (left, right) = (right, left % right);
    }
    if left == 1 {
        Ok(RationalKind::Other)
    } else {
        Err(NumericError::Noncanonical)
    }
}

/// Whether `text` is a canonical `n` or `n/d` rational within `i128`: `Ok`
/// holds whether it is negative, `Err` the diagnostic code that refuses it.
pub(crate) fn rational_operand(text: &str) -> Result<bool, &'static str> {
    canonical_rational(text)
        .map(|_| text.starts_with('-'))
        .map_err(NumericError::code)
}

fn text<'a>(node: &'a Json, member: &str) -> Option<&'a str> {
    node.get(member).and_then(Json::as_str)
}

fn nodes<'a>(node: &'a Json, member: &str) -> &'a [Json] {
    node.get(member).and_then(Json::as_array).unwrap_or(&[])
}

fn identities<'a>(
    entries: &'a [Json],
    collection: &str,
    package: &str,
    diagnostics: &mut Diagnostics<'_>,
) -> HashMap<&'a str, usize> {
    let mut by_identity = HashMap::with_capacity(entries.len());
    let singular = if collection == "dimensions" {
        "dimension"
    } else {
        "unit"
    };
    for (position, node) in entries.iter().enumerate() {
        let Some(identity) = text(node, "identity") else {
            continue;
        };
        let at = child(&index(&format!("/ir/{collection}"), position), "identity");
        match by_identity.entry(identity) {
            std::collections::hash_map::Entry::Occupied(_) => diagnostics.emit(
                DUPLICATE_IDENTITY,
                at.clone(),
                format!("the identity {identity} is already declared"),
            ),
            std::collections::hash_map::Entry::Vacant(slot) => {
                slot.insert(position);
            }
        }
        if let Some(name) = text(node, "name") {
            if identity != format!("ix://{package}/{singular}/{name}") {
                diagnostics.emit(
                    INVALID_GRAPH,
                    at,
                    "the identity names its package and declaration",
                );
            }
        }
    }
    by_identity
}

/// Cyclic strongly connected components, with both groups and their members
/// ordered by authored array positions. Traversal uses heap stacks, not recursion.
fn cyclic_components(edges: &[Vec<usize>]) -> Vec<Vec<usize>> {
    let mut visited = vec![false; edges.len()];
    let mut finished = Vec::with_capacity(edges.len());
    for root in 0..edges.len() {
        if visited[root] {
            continue;
        }
        visited[root] = true;
        let mut stack = vec![(root, 0)];
        while let Some((node, next)) = stack.last_mut() {
            if let Some(&target) = edges[*node].get(*next) {
                *next += 1;
                if !visited[target] {
                    visited[target] = true;
                    stack.push((target, 0));
                }
            } else {
                finished.push(*node);
                stack.pop();
            }
        }
    }
    let mut reversed = vec![Vec::new(); edges.len()];
    for (source, targets) in edges.iter().enumerate() {
        for &target in targets {
            reversed[target].push(source);
        }
    }
    visited.fill(false);
    let mut components = Vec::new();
    for &root in finished.iter().rev() {
        if visited[root] {
            continue;
        }
        visited[root] = true;
        let mut pending = vec![root];
        let mut component = Vec::new();
        while let Some(node) = pending.pop() {
            component.push(node);
            for &source in &reversed[node] {
                if !visited[source] {
                    visited[source] = true;
                    pending.push(source);
                }
            }
        }
        if component.len() > 1 || edges[root].contains(&root) {
            component.sort_unstable();
            components.push(component);
        }
    }
    components.sort_unstable_by_key(|component| component[0]);
    components
}

fn check_dimensions(
    dimensions: &[Json],
    by_identity: &HashMap<&str, usize>,
    diagnostics: &mut Diagnostics<'_>,
) {
    let mut edges = vec![Vec::new(); dimensions.len()];
    for (position, dimension) in dimensions.iter().enumerate() {
        let at = index("/ir/dimensions", position);
        let terms = nodes(dimension, "terms");
        if dimension.get("base").and_then(Json::as_bool) == Some(true) && !terms.is_empty() {
            diagnostics.emit(
                INVALID_GRAPH,
                child(&at, "terms"),
                "a base dimension carries no terms",
            );
        }
        let mut previous = None;
        for (offset, term) in terms.iter().enumerate() {
            let term_at = index(&child(&at, "terms"), offset);
            if let Some(target) = text(term, "dimension") {
                if let Some(&target_position) = by_identity.get(target) {
                    edges[position].push(target_position);
                } else {
                    diagnostics.emit(
                        MISSING_DIMENSION,
                        child(&term_at, "dimension"),
                        format!("no dimension declares {target}"),
                    );
                }
                if previous.is_some_and(|earlier| earlier >= target) {
                    diagnostics.emit(
                        INVALID_GRAPH,
                        term_at.clone(),
                        "dimension terms have strictly increasing identities",
                    );
                }
                previous = Some(target);
            }
            if let Some(exponent) = text(term, "exponent") {
                match canonical_integer(exponent) {
                    Ok(0) => diagnostics.emit(
                        INVALID_GRAPH,
                        child(&term_at, "exponent"),
                        "a dimension term has a nonzero exponent",
                    ),
                    Ok(_) => {}
                    Err(error) => diagnostics.emit(
                        error.code(),
                        child(&term_at, "exponent"),
                        "a dimension exponent is a canonical i128 integer",
                    ),
                }
            }
        }
    }
    for component in cyclic_components(&edges) {
        let first = component[0];
        let members: BTreeSet<usize> = component.iter().copied().collect();
        let term = nodes(&dimensions[first], "terms").iter().position(|term| {
            text(term, "dimension")
                .and_then(|identity| by_identity.get(identity))
                .is_some_and(|target| members.contains(target))
        });
        if let Some(term) = term {
            let names: Vec<_> = component
                .iter()
                .filter_map(|&node| text(&dimensions[node], "name"))
                .collect();
            diagnostics.emit(
                INVALID_GRAPH,
                index(&child(&index("/ir/dimensions", first), "terms"), term),
                format!("dimension cycle: {}", names.join(", ")),
            );
        }
    }
}

fn check_units(
    units: &[Json],
    dimensions: &HashMap<&str, usize>,
    by_identity: &HashMap<&str, usize>,
    diagnostics: &mut Diagnostics<'_>,
) {
    let mut roots = HashMap::new();
    let mut edges = vec![Vec::new(); units.len()];
    for (position, unit) in units.iter().enumerate() {
        let at = index("/ir/units", position);
        let dimension = text(unit, "dimension");
        if let Some(identity) = dimension {
            if !dimensions.contains_key(identity) {
                diagnostics.emit(
                    MISSING_DIMENSION,
                    child(&at, "dimension"),
                    format!("no dimension declares {identity}"),
                );
            }
        }
        let mut scale = None;
        let mut offset = None;
        for (member, parsed) in [("scale", &mut scale), ("offset", &mut offset)] {
            if let Some(value) = text(unit, member) {
                match canonical_rational(value) {
                    Ok(value) => *parsed = Some(value),
                    Err(error) => diagnostics.emit(
                        error.code(),
                        child(&at, member),
                        "a unit coefficient is a canonical i128 rational",
                    ),
                }
            }
        }
        if scale == Some(RationalKind::Zero) {
            diagnostics.emit(
                INVALID_GRAPH,
                child(&at, "scale"),
                "a unit scale is nonzero",
            );
        }
        if let Some(target) = text(unit, "target") {
            if let Some(&target_position) = by_identity.get(target) {
                edges[position].push(target_position);
                if let (Some(dimension), Some(target_dimension)) =
                    (dimension, text(&units[target_position], "dimension"))
                {
                    if dimensions.contains_key(dimension)
                        && dimensions.contains_key(target_dimension)
                        && dimension != target_dimension
                    {
                        diagnostics.emit(
                            INVALID_GRAPH,
                            child(&at, "target"),
                            format!("unit dimensions differ: {dimension}, {target_dimension}"),
                        );
                    }
                }
            } else {
                diagnostics.emit(
                    MISSING_UNIT,
                    child(&at, "target"),
                    format!("no unit declares {target}"),
                );
            }
        } else {
            if let Some(dimension) = dimension {
                match roots.entry(dimension) {
                    std::collections::hash_map::Entry::Occupied(first) => {
                        let first: usize = *first.get();
                        let name = text(&units[first], "name").unwrap_or("");
                        diagnostics.emit(
                            INVALID_GRAPH,
                            at.clone(),
                            format!("dimension {dimension} already has root {name}"),
                        );
                    }
                    std::collections::hash_map::Entry::Vacant(slot) => {
                        slot.insert(position);
                    }
                }
            }
            if scale.is_some_and(|value| value != RationalKind::One) {
                diagnostics.emit(
                    INVALID_GRAPH,
                    child(&at, "scale"),
                    "a root unit has scale 1",
                );
            }
            if offset.is_some_and(|value| value != RationalKind::Zero) {
                diagnostics.emit(
                    INVALID_GRAPH,
                    child(&at, "offset"),
                    "a root unit has offset 0",
                );
            }
        }
    }
    for component in cyclic_components(&edges) {
        let first = component[0];
        let mut names = Vec::with_capacity(component.len());
        let mut current = first;
        for _ in 0..component.len() {
            if let Some(name) = text(&units[current], "name") {
                names.push(name);
            }
            if let Some(&target) = edges[current].first() {
                current = target;
            }
        }
        diagnostics.emit(
            INVALID_GRAPH,
            child(&index("/ir/units", first), "target"),
            format!("unit cycle: {}", names.join(", ")),
        );
    }
}

/// The located dimension and unit diagnostics of a schema-admitted bundle.
pub(crate) fn decide(bundle: &Json) -> Vec<Located> {
    let mut diagnostics = Diagnostics {
        bundle,
        seen: BTreeSet::new(),
        items: Vec::new(),
    };
    let Some(ir) = bundle.get("ir") else {
        return diagnostics.items;
    };
    let Some(package) = ir
        .get("package")
        .and_then(|package| text(package, "identity"))
    else {
        return diagnostics.items;
    };
    let dimensions = nodes(ir, "dimensions");
    let units = nodes(ir, "units");
    let dimension_ids = identities(dimensions, "dimensions", package, &mut diagnostics);
    let unit_ids = identities(units, "units", package, &mut diagnostics);
    check_dimensions(dimensions, &dimension_ids, &mut diagnostics);
    check_units(units, &dimension_ids, &unit_ids, &mut diagnostics);
    diagnostics.items
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::parse;

    const ORIGIN: &str = r#"{"generated":{"generatorIdentity":"ix://acme/config/case-author","generatorVersion":"1.0.0","inputIdentities":["ix://acme/config/source"]}}"#;
    const BASE: &str = include_str!("../../../fixtures/semantic/v1/clock-units/config-time.json");

    fn dimension(name: &str, base: bool, terms: &str) -> String {
        format!(
            r#"{{"identity":"ix://acme/config/dimension/{name}","name":"{name}","base":{base},"terms":{terms},"origin":{ORIGIN}}}"#
        )
    }

    fn term(name: &str, exponent: &str) -> String {
        format!(r#"{{"dimension":"ix://acme/config/dimension/{name}","exponent":"{exponent}"}}"#)
    }

    fn unit(
        name: &str,
        dimension: &str,
        target: Option<&str>,
        scale: &str,
        offset: &str,
    ) -> String {
        let target = target
            .map(|name| format!(r#", "target":"ix://acme/config/unit/{name}""#))
            .unwrap_or_default();
        format!(
            r#"{{"identity":"ix://acme/config/unit/{name}","name":"{name}","dimension":"ix://acme/config/dimension/{dimension}","scale":"{scale}","offset":"{offset}"{target},"origin":{ORIGIN}}}"#
        )
    }

    fn bundle(dimensions: &[String], units: &[String]) -> Json {
        let mut ir = parse(BASE).expect("published authored graph fixture");
        let Json::Object(members) = &mut ir else {
            panic!("fixture is an object")
        };
        for (name, value) in members {
            if name == "dimensions" {
                *value = parse(&format!("[{}]", dimensions.join(","))).expect("dimension fixture");
            } else if name == "units" {
                *value = parse(&format!("[{}]", units.join(","))).expect("unit fixture");
            }
        }
        Json::Object(vec![("ir".to_owned(), ir)])
    }

    fn codes(bundle: &Json) -> Vec<(&'static str, String)> {
        let mut actual: Vec<_> = decide(bundle)
            .into_iter()
            .map(|d| (d.code, d.pointer))
            .collect();
        actual.sort_unstable();
        actual
    }

    fn time() -> String {
        dimension("Time", true, "[]")
    }

    #[test]
    fn tc_1844_accepts_authored_base_derived_dimensionless_and_scaled_units() {
        // FR-146-AC-3: exact reader assertions below.
        let dimensions = [
            time(),
            dimension("Rate", false, &format!("[{}]", term("Time", "-1"))),
            dimension("Ratio", false, "[]"),
        ];
        let units = [
            unit("s", "Time", None, "1", "0"),
            unit("ms", "Time", Some("s"), "1/1000", "0"),
        ];
        assert!(decide(&bundle(&dimensions, &units)).is_empty());
        assert!(decide(&bundle(&[time()], &[])).is_empty());
    }

    #[test]
    fn tc_1845_reports_unknown_dimension_and_unit_references_at_members() {
        // FR-146-AC-4: exact reader assertions below.
        let dimensions = [
            time(),
            dimension("Rate", false, &format!("[{}]", term("Unknown", "1"))),
        ];
        let units = [
            unit("s", "Unknown", None, "1", "0"),
            unit("ms", "Time", Some("unknown"), "1/1000", "0"),
        ];
        assert_eq!(
            codes(&bundle(&dimensions, &units)),
            vec![
                (
                    MISSING_DIMENSION,
                    "/ir/dimensions/1/terms/0/dimension".to_owned()
                ),
                (MISSING_DIMENSION, "/ir/units/0/dimension".to_owned()),
                (MISSING_UNIT, "/ir/units/1/target".to_owned()),
            ]
        );
    }

    #[test]
    fn tc_1845_reports_root_and_nonzero_scale_defects_once_at_each_member() {
        // FR-146-AC-4: exact reader assertions below.
        for (units, expected) in [
            (
                vec![unit("s", "Time", None, "0", "0")],
                vec![(INVALID_GRAPH, "/ir/units/0/scale".to_owned())],
            ),
            (
                vec![unit("s", "Time", None, "2", "273")],
                vec![
                    (INVALID_GRAPH, "/ir/units/0/offset".to_owned()),
                    (INVALID_GRAPH, "/ir/units/0/scale".to_owned()),
                ],
            ),
            (
                vec![
                    unit("s", "Time", None, "1", "0"),
                    unit("seconds", "Time", None, "1", "0"),
                ],
                vec![(INVALID_GRAPH, "/ir/units/1".to_owned())],
            ),
        ] {
            assert_eq!(codes(&bundle(&[time()], &units)), expected);
        }
    }

    #[test]
    fn tc_1845_preserves_cross_dimension_and_identity_diagnostics() {
        // FR-146-AC-4: exact reader assertions below.
        let dimensions = [time(), dimension("Length", true, "[]")];
        let units = [
            unit("s", "Time", None, "1", "0"),
            unit("m", "Length", Some("s"), "1", "0"),
        ];
        let diagnostics = decide(&bundle(&dimensions, &units));
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].code, INVALID_GRAPH);
        assert_eq!(diagnostics[0].pointer, "/ir/units/1/target");
        assert!(diagnostics[0].message.contains("dimension/Time"));
        assert!(diagnostics[0].message.contains("dimension/Length"));
        let invalid_unit = unit("ms", "Time", Some("s"), "1/1000", "0").replacen(
            "ix://acme/config/unit/ms",
            "ix://acme/config/unit/msec",
            1,
        );
        let invalid_dimension = time().replacen(
            "ix://acme/config/dimension/Time",
            "ix://acme/config/dimension/Duration",
            1,
        );
        assert_eq!(
            codes(&bundle(&[invalid_dimension], &[])),
            vec![(INVALID_GRAPH, "/ir/dimensions/0/identity".to_owned())]
        );
        assert_eq!(
            codes(&bundle(
                &[time()],
                &[unit("s", "Time", None, "1", "0"), invalid_unit]
            )),
            vec![(INVALID_GRAPH, "/ir/units/1/identity".to_owned())]
        );
    }

    #[test]
    fn tc_1845_one_dimension_scc_can_hold_two_cycles() {
        // FR-146-AC-4: exact reader assertions below.
        let dimensions = [
            dimension("A", false, &format!("[{}]", term("B", "1"))),
            dimension(
                "B",
                false,
                &format!("[{},{}]", term("A", "1"), term("C", "1")),
            ),
            dimension("C", false, &format!("[{}]", term("B", "1"))),
        ];
        let diagnostics = decide(&bundle(&dimensions, &[]));
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].pointer, "/ir/dimensions/0/terms/0");
        assert_eq!(diagnostics[0].message, "dimension cycle: A, B, C");
    }

    #[test]
    fn tc_1845_unit_cycle_names_follow_edges_from_least_authored_index() {
        // FR-146-AC-4: exact reader assertions below.
        let units = [
            unit("a", "Time", Some("c"), "0", "0"),
            unit("b", "Time", Some("a"), "1", "0"),
            unit("c", "Time", Some("b"), "1", "0"),
        ];
        let diagnostics = decide(&bundle(&[time()], &units));
        assert_eq!(diagnostics.len(), 2);
        assert!(diagnostics.iter().any(|d| d.pointer == "/ir/units/0/scale"));
        let cycle = diagnostics
            .iter()
            .find(|d| d.pointer == "/ir/units/0/target")
            .expect("cycle diagnostic");
        assert_eq!(cycle.message, "unit cycle: a, c, b");
        assert_eq!(
            codes(&bundle(
                &[time()],
                &[unit("a", "Time", Some("a"), "1", "0")]
            )),
            vec![(INVALID_GRAPH, "/ir/units/0/target".to_owned())]
        );
    }

    #[test]
    fn tc_1845_dimension_rules_report_base_zero_order_and_duplicate_terms() {
        // FR-146-AC-4: exact reader assertions below.
        let dimensions = [
            time(),
            dimension(
                "A",
                true,
                &format!(
                    "[{},{},{}]",
                    term("Time", "0"),
                    term("A", "1"),
                    term("A", "1")
                ),
            ),
        ];
        assert_eq!(
            codes(&bundle(&dimensions, &[])),
            vec![
                (INVALID_GRAPH, "/ir/dimensions/1/terms".to_owned()),
                (
                    INVALID_GRAPH,
                    "/ir/dimensions/1/terms/0/exponent".to_owned()
                ),
                (INVALID_GRAPH, "/ir/dimensions/1/terms/1".to_owned()),
                (INVALID_GRAPH, "/ir/dimensions/1/terms/2".to_owned()),
            ]
        );
    }

    #[test]
    fn tc_1845_duplicate_unit_and_dimension_identities_point_at_later_entries() {
        // FR-146-AC-4: exact reader assertions below.
        let units = [
            unit("s", "Time", None, "1", "0"),
            unit("ms", "Time", Some("s"), "1/1000", "0"),
            unit("ms", "Time", Some("s"), "1/1000", "0"),
        ];
        assert_eq!(
            codes(&bundle(&[time(), time()], &units)),
            vec![
                (DUPLICATE_IDENTITY, "/ir/dimensions/1/identity".to_owned()),
                (DUPLICATE_IDENTITY, "/ir/units/2/identity".to_owned())
            ]
        );
    }

    #[test]
    fn tc_1846_rational_strings_are_canonical_and_i128_bounded() {
        // FR-146-AC-5: exact reader assertions below.
        for scale in [
            "2/4", "1/1", "-0", "0/5", "01/3", "1.5", "1/-2", "1/2/3", "1\n", "+1",
        ] {
            let json_scale = scale.replace('\n', "\\n");
            assert_eq!(
                codes(&bundle(
                    &[time()],
                    &[
                        unit("s", "Time", None, "1", "0"),
                        unit("ms", "Time", Some("s"), &json_scale, "0")
                    ]
                )),
                vec![(INVALID_OPERAND, "/ir/units/1/scale".to_owned())],
                "{scale:?}"
            );
        }
        for scale in [
            "1/1000",
            "-3/2",
            "273",
            "-170141183460469231731687303715884105728/3",
        ] {
            assert!(
                decide(&bundle(
                    &[time()],
                    &[
                        unit("s", "Time", None, "1", "0"),
                        unit("ms", "Time", Some("s"), scale, "0")
                    ]
                ))
                .is_empty(),
                "{scale}"
            );
        }
        for scale in [
            "170141183460469231731687303715884105728",
            "1/170141183460469231731687303715884105728",
            "-170141183460469231731687303715884105729/3",
        ] {
            assert_eq!(
                codes(&bundle(
                    &[time()],
                    &[
                        unit("s", "Time", None, "1", "0"),
                        unit("ms", "Time", Some("s"), scale, "0")
                    ]
                )),
                vec![(OUTSIDE_I128, "/ir/units/1/scale".to_owned())]
            );
        }
    }

    #[test]
    fn tc_1846_exponents_have_the_same_full_canonical_integer_boundary() {
        // FR-146-AC-5: exact reader assertions below.
        for (value, code) in [
            ("+1", INVALID_OPERAND),
            ("1\\n", INVALID_OPERAND),
            ("170141183460469231731687303715884105728", OUTSIDE_I128),
        ] {
            assert_eq!(
                codes(&bundle(
                    &[
                        time(),
                        dimension("Rate", false, &format!("[{}]", term("Time", value)))
                    ],
                    &[]
                )),
                vec![(code, "/ir/dimensions/1/terms/0/exponent".to_owned())]
            );
        }
    }
}
