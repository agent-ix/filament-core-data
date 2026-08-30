import "@typespec/json-schema";
import "../semantic-core/main.tsp";

using TypeSpec.JsonSchema;

@jsonSchema("https://schemas.agent-ix.org/assurance/0.1.0/")
namespace AgentIx.Semantic.Assurance {
  alias SemanticId = AgentIx.Semantic.Core.SemanticId;
  alias Provenance = AgentIx.Semantic.Core.Provenance;

  model DomainEvent {
    id: SemanticId;
    eventType: SemanticId;
    subjectId: SemanticId;
    occurredAt: utcDateTime;
    causationId?: SemanticId | null;
    correlationId?: SemanticId;
    payload: Record<string>;
    provenance: Provenance;
  }

  model VerificationRun {
    id: SemanticId;
    targetId: SemanticId;
    profileId: SemanticId;
    startedAt: utcDateTime;
    completedAt?: utcDateTime | null;
    evidenceIds?: SemanticId[];
    provenance: Provenance;
  }

  model Evidence {
    id: SemanticId;
    runId: SemanticId;
    evidenceType: SemanticId;
    uri?: string;
    digest?: string;
    observedAt: utcDateTime;
    attributes?: Record<string>;
    provenance: Provenance;
  }

  @discriminator("status")
  model VerificationResult {
    status: string;
    runId: SemanticId;
  }

  model PassedResult extends VerificationResult {
    status: "passed";
    evidenceIds: SemanticId[];
  }

  model FailedResult extends VerificationResult {
    status: "failed";
    findingIds: SemanticId[];
    reason: string;
  }

  model NotComputedResult extends VerificationResult {
    status: "not-computed";
    reason: string;
    missingInput?: string | null;
  }
}
