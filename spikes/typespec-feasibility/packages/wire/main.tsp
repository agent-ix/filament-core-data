import "@typespec/protobuf";
import "../semantic-core/main.tsp";

using Protobuf;

@package({ name: "agentix.semantic.v1" })
namespace AgentIx.Semantic.Wire {
  @reserve(6, 7, "legacy_path")
  model ArtifactMessage {
    @field(1) id: string;
    @field(2) artifact_type: string;
    @field(3) title: string;
    @field(4) summary?: string;
    @field(5) provenance_json: string;
  }

  model EventMessage {
    @field(1) id: string;
    @field(2) event_type: string;
    @field(3) subject_id: string;
    @field(4) occurred_at: string;
    @field(5) payload_json: string;
    @field(6) correlation_id?: string;
  }
}
