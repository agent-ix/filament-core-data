using AgentIx.Semantic.Decorators;

namespace AgentIx.Semantic;

@minLength(1)
scalar Text extends string;

@role("agent-ix:entity")
model Note {
  id: Text;
  body?: Text;
}
