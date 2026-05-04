import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(__dirname, "..");
const repoRoot = resolve(dashboardRoot, "..");

const backendSpecPath = resolve(repoRoot, "backend/docs/openapi.yaml");
const merchantSpecPath = resolve(
	dashboardRoot,
	"src/lib/contracts/paygate-store-api.openapi.yaml",
);

const backendSpec = YAML.parse(readFileSync(backendSpecPath, "utf8"));
const merchantSpec = YAML.parse(readFileSync(merchantSpecPath, "utf8"));

const endpointChecks = [
	{
		path: "/v1/transactions/charge",
		method: "post",
		successStatus: "201",
	},
	{
		path: "/v1/transactions/{order_id}",
		method: "get",
		successStatus: "200",
	},
	{
		path: "/v1/audit-logs",
		method: "get",
		successStatus: "200",
	},
];

function resolvePointer(document, ref) {
	if (!ref?.startsWith?.("#/")) {
		throw new Error(`Unsupported reference: ${ref}`);
	}

	return ref
		.slice(2)
		.split("/")
		.reduce((value, part) => {
			if (value === undefined || value === null) {
				throw new Error(`Unable to resolve pointer: ${ref}`);
			}
			return value[part];
		}, document);
}

function mergeNormalizedSchema(base, addition) {
	if (base === undefined) return addition;
	if (addition === undefined) return base;

	if (Array.isArray(base) && Array.isArray(addition)) {
		return [...new Set([...base, ...addition])].sort();
	}

	if (
		base &&
		addition &&
		typeof base === "object" &&
		typeof addition === "object" &&
		!Array.isArray(base) &&
		!Array.isArray(addition)
	) {
		const merged = { ...base };
		for (const key of Object.keys(addition)) {
			merged[key] = mergeNormalizedSchema(merged[key], addition[key]);
		}
		return merged;
	}

	return addition;
}

function normalizeSchema(document, schema, seenRefs = new Set()) {
	if (!schema) return null;

	if (schema.$ref) {
		if (seenRefs.has(schema.$ref)) {
			return { $ref: schema.$ref };
		}
		const nextSeenRefs = new Set(seenRefs);
		nextSeenRefs.add(schema.$ref);
		return normalizeSchema(document, resolvePointer(document, schema.$ref), nextSeenRefs);
	}

	if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
		return schema.allOf
			.map((item) => normalizeSchema(document, item, seenRefs))
			.reduce((merged, item) => mergeNormalizedSchema(merged, item), {});
	}

	const normalized = {};

	for (const key of ["type", "format", "const", "nullable"]) {
		if (schema[key] !== undefined) {
			normalized[key] = schema[key];
		}
	}

	if (schema.enum) {
		normalized.enum = [...schema.enum].sort();
	}

	if (schema.required) {
		normalized.required = [...new Set(schema.required)].sort();
	}

	if (schema.properties) {
		normalized.properties = Object.fromEntries(
			Object.keys(schema.properties)
				.sort()
				.map((key) => [key, normalizeSchema(document, schema.properties[key], seenRefs)]),
		);
	}

	if (schema.items) {
		normalized.items = normalizeSchema(document, schema.items, seenRefs);
	}

	if (schema.additionalProperties !== undefined) {
		normalized.additionalProperties =
			typeof schema.additionalProperties === "object"
				? normalizeSchema(document, schema.additionalProperties, seenRefs)
				: schema.additionalProperties;
	}

	return normalized;
}

function normalizeParameters(document, parameters = []) {
	return parameters
		.map((parameter) =>
			parameter.$ref ? resolvePointer(document, parameter.$ref) : parameter,
		)
		.map((parameter) => ({
			name: parameter.name,
			in: parameter.in,
			required: Boolean(parameter.required),
			schema: normalizeSchema(document, parameter.schema ?? null),
		}))
		.sort((left, right) =>
			`${left.in}:${left.name}`.localeCompare(`${right.in}:${right.name}`),
		);
}

function normalizeRequestBody(document, operation) {
	const schema = operation?.requestBody?.content?.["application/json"]?.schema;
	return normalizeSchema(document, schema ?? null);
}

function normalizeSuccessResponse(document, operation, successStatus) {
	const schema = operation?.responses?.[successStatus]?.content?.["application/json"]?.schema;
	return normalizeSchema(document, schema ?? null);
}

function ensureBearerSecurity(document, operation) {
	const operationSecurity = operation?.security;
	if (Array.isArray(operationSecurity) && operationSecurity.length > 0) {
		return true;
	}

	return Array.isArray(document.security) && document.security.length > 0;
}

function stableStringify(value) {
	return JSON.stringify(value, null, 2);
}

const failures = [];

for (const check of endpointChecks) {
	const backendOperation = backendSpec.paths?.[check.path]?.[check.method];
	const merchantOperation = merchantSpec.paths?.[check.path]?.[check.method];

	if (!backendOperation) {
		failures.push(`Backend spec missing ${check.method.toUpperCase()} ${check.path}`);
		continue;
	}

	if (!merchantOperation) {
		failures.push(`Merchant contract missing ${check.method.toUpperCase()} ${check.path}`);
		continue;
	}

	const backendResponseStatuses = Object.keys(backendOperation.responses ?? {}).sort();
	const merchantResponseStatuses = Object.keys(merchantOperation.responses ?? {}).sort();
	if (stableStringify(backendResponseStatuses) !== stableStringify(merchantResponseStatuses)) {
		failures.push(
			[
				`Response status mismatch for ${check.method.toUpperCase()} ${check.path}`,
				`backend : ${backendResponseStatuses.join(", ")}`,
				`merchant: ${merchantResponseStatuses.join(", ")}`,
			].join("\n"),
		);
	}

	const backendParameters = normalizeParameters(backendSpec, backendOperation.parameters);
	const merchantParameters = normalizeParameters(merchantSpec, merchantOperation.parameters);
	if (stableStringify(backendParameters) !== stableStringify(merchantParameters)) {
		failures.push(
			[
				`Parameter mismatch for ${check.method.toUpperCase()} ${check.path}`,
				"backend:",
				stableStringify(backendParameters),
				"merchant:",
				stableStringify(merchantParameters),
			].join("\n"),
		);
	}

	const backendRequestBody = normalizeRequestBody(backendSpec, backendOperation);
	const merchantRequestBody = normalizeRequestBody(merchantSpec, merchantOperation);
	if (stableStringify(backendRequestBody) !== stableStringify(merchantRequestBody)) {
		failures.push(
			[
				`Request schema mismatch for ${check.method.toUpperCase()} ${check.path}`,
				"backend:",
				stableStringify(backendRequestBody),
				"merchant:",
				stableStringify(merchantRequestBody),
			].join("\n"),
		);
	}

	const backendSuccessResponse = normalizeSuccessResponse(
		backendSpec,
		backendOperation,
		check.successStatus,
	);
	const merchantSuccessResponse = normalizeSuccessResponse(
		merchantSpec,
		merchantOperation,
		check.successStatus,
	);
	if (stableStringify(backendSuccessResponse) !== stableStringify(merchantSuccessResponse)) {
		failures.push(
			[
				`Success response schema mismatch for ${check.method.toUpperCase()} ${check.path}`,
				"backend:",
				stableStringify(backendSuccessResponse),
				"merchant:",
				stableStringify(merchantSuccessResponse),
			].join("\n"),
		);
	}

	if (!ensureBearerSecurity(merchantSpec, merchantOperation)) {
		failures.push(
			`Merchant contract must require bearer auth for ${check.method.toUpperCase()} ${check.path}`,
		);
	}
}

if (!merchantSpec.webhooks?.merchantCallback?.post) {
	failures.push(
		"Merchant contract missing webhook callback reference under webhooks.merchantCallback.post",
	);
}

if (failures.length > 0) {
	console.error("Store contract sync check failed:\n");
	for (const failure of failures) {
		console.error(`- ${failure}\n`);
	}
	process.exit(1);
}

console.log("Store contract sync check passed");
