namespace AgentIx.Semantic;

scalar Text extends string;

enum Phase { start, stop }

union Either {
  text: Text,
  phase: Phase,
}
