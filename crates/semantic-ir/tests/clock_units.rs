// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent IX

use agent_ix_semantic_ir::{decide, json::parse};

const CONFIG_TIME: &str =
    include_str!("../../../fixtures/semantic/v1/clock-units/config-time.json");

#[test]
fn tc_1844_config_time_and_scaled_units_are_admitted() {
    let bundle = parse(&format!(r#"{{"ir":{CONFIG_TIME}}}"#)).expect("authored fixture is JSON");
    let verdict = decide(&bundle);
    let diagnostics: Vec<_> = verdict
        .diagnostics
        .iter()
        .map(|diagnostic| {
            (
                diagnostic.code,
                diagnostic.pointer.as_str(),
                diagnostic.message.as_str(),
            )
        })
        .collect();
    assert!(diagnostics.is_empty(), "FR-146-AC-3: {diagnostics:?}");
}

#[test]
fn config_without_dimension_unit_members_preserves_reader_admission() {
    let mut document = parse(CONFIG_TIME).expect("authored fixture is JSON");
    let agent_ix_semantic_ir::json::Json::Object(members) = &mut document else {
        panic!("fixture must be an object");
    };
    members.retain(|(name, _)| name != "dimensions" && name != "units");
    let bundle = agent_ix_semantic_ir::json::Json::Object(vec![("ir".to_owned(), document)]);
    assert!(decide(&bundle).diagnostics.is_empty());
}
