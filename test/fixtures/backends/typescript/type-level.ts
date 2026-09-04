import {
	Node,
	Payload,
	UNION_DISCRIMINANT,
	validateNode,
	validatePayload,
} from "./expected/index.js";

const absentOptional: Node = { elapsed: 1, id: "n-1", status: "draft" };
const presentOptional: Node = {
	elapsed: 2,
	id: "n-2",
	label: "named",
	status: "final",
};
const nullOptional: Node = {
	elapsed: 3,
	id: "n-3",
	label: null,
	status: "draft",
};
const requiredFields: Node = { elapsed: 4, id: "n-4", status: "final" };

function exhaustive(payload: Payload): string {
	switch (payload[UNION_DISCRIMINANT]) {
		case "count":
			return String(payload.value);
		case "text":
			return payload.value;
		default: {
			const neverPayload: never = payload;
			return neverPayload;
		}
	}
}

const unknownNode: unknown = requiredFields;
const nodeResult = validateNode(unknownNode);
if (nodeResult.ok) {
	const narrowed: Node = nodeResult.value;
	void narrowed.id;
}

const payloadResult = validatePayload({ kind: "text", value: "fixture" });
if (payloadResult.ok) void exhaustive(payloadResult.value);

void absentOptional;
void presentOptional;
void nullOptional;
