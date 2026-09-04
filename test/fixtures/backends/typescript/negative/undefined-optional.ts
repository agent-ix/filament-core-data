import type { Node } from "../expected/index.js";

const undefinedOptional: Node = {
	elapsed: 1,
	id: "n-1",
	label: undefined,
	status: "draft",
};
void undefinedOptional;
