import type { Node } from "../expected/index.js";

const invalidStatus: Node = { elapsed: 1, id: "n-1", status: "unknown" };
void invalidStatus;
