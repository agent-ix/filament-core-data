import type { Artifact, DomainEvent, Evidence, FailedResult, VerificationRun } from "./index.js";
import golden from "../../fixtures/representative.json";
const values: [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult] = [golden.artifact, golden.domainEvent, golden.verificationRun, golden.evidence, golden.result] as [Artifact, DomainEvent, VerificationRun, Evidence, FailedResult];
// @ts-expect-error The negative golden omits required Artifact fields.
const invalidArtifact: Artifact = { id: "not-a-semantic-id" };
void invalidArtifact;
if (values[0].id !== "artifact:example" || values[4].status !== "failed") throw new Error("golden mismatch");
console.log("typescript-consumer:passed");
