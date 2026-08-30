use agent_ix_semantic_typespec_spike::{Artifact, DomainEvent, Evidence, FailedResult, VerificationRun};
use serde_json::Value;
fn main() {
    let golden: Value = serde_json::from_str(include_str!("../fixtures/representative.json")).unwrap();
    let invalid: Value = serde_json::from_str(include_str!("../fixtures/invalid.json")).unwrap();
    let artifact: Artifact = serde_json::from_value(golden["artifact"].clone()).unwrap();
    let _: DomainEvent = serde_json::from_value(golden["domainEvent"].clone()).unwrap();
    let _: VerificationRun = serde_json::from_value(golden["verificationRun"].clone()).unwrap();
    let _: Evidence = serde_json::from_value(golden["evidence"].clone()).unwrap();
    let result: FailedResult = serde_json::from_value(golden["result"].clone()).unwrap();
    assert!(serde_json::from_value::<Artifact>(invalid["artifact"].clone()).is_err());
    assert_eq!(artifact.id, "artifact:example");
    assert_eq!(result.status, "failed");
    println!("rust-consumer:passed");
}
