// @ts-nocheck
import crypto from "node:crypto";

export class PayGateAPIError extends Error {
	constructor(message, details = {}) {
		super(message);
		this.name = "PayGateAPIError";
		this.statusCode = details.statusCode;
		this.code = details.code;
		this.requestId = details.requestId;
	}
}

export class PayGateClient {
	constructor({ baseURL, apiToken, timeoutMs = 10000 }) {
		if (!baseURL) throw new Error("baseURL is required");
		if (!apiToken) throw new Error("apiToken is required");

		this.baseURL = baseURL.replace(/\/+$/, "");
		this.apiToken = apiToken;
		this.timeoutMs = timeoutMs;
	}

	async charge(payload, options = {}) {
		return this.request("POST", "/v1/transactions/charge", {
			body: payload,
			headers: options.idempotencyKey
				? {
						"Idempotency-Key": options.idempotencyKey,
					}
				: {},
		});
	}

	async getTransaction(orderId) {
		return this.request("GET", `/v1/transactions/${encodeURIComponent(orderId)}`);
	}

	async listAuditLogs(params = {}) {
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null || value === "") continue;
			query.set(key, String(value));
		}

		const path = query.size > 0 ? `/v1/audit-logs?${query.toString()}` : "/v1/audit-logs";
		return this.request("GET", path);
	}

	verifyWebhook({ rawBody, timestamp, signature, webhookSecret, maxSkewSeconds = 300 }) {
		if (!rawBody || !timestamp || !signature || !webhookSecret) {
			throw new Error("rawBody, timestamp, signature, and webhookSecret are required");
		}

		const unix = Number(timestamp);
		if (!Number.isFinite(unix)) {
			throw new Error("Webhook timestamp is not valid");
		}

		if (Math.abs(Math.floor(Date.now() / 1000) - unix) > maxSkewSeconds) {
			throw new Error("Webhook timestamp is too old");
		}

		const expected =
			"sha256=" +
			crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");

		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
			throw new Error("Webhook signature is not valid");
		}

		return JSON.parse(rawBody);
	}

	async request(method, path, options = {}) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
		const headers = new Headers({
			Authorization: `Bearer ${this.apiToken}`,
			Accept: "application/json",
			...options.headers,
		});

		if (options.body !== undefined) {
			headers.set("Content-Type", "application/json");
		}

		try {
			const response = await fetch(`${this.baseURL}${path}`, {
				method,
				headers,
				body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
				signal: controller.signal,
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok || payload?.success === false) {
				throw new PayGateAPIError(payload?.error?.message ?? "PayGate request failed", {
					statusCode: response.status,
					code: payload?.error?.code,
					requestId: payload?.error?.request_id,
				});
			}

			return payload?.data ?? null;
		} finally {
			clearTimeout(timeout);
		}
	}
}

export async function exampleUsage() {
	const client = new PayGateClient({
		baseURL: "https://paygate.digixsolution.net",
		apiToken: process.env.PAYGATE_STORE_API_TOKEN,
	});

	const transaction = await client.charge(
		{
			order_id: "INV-2026-0001",
			amount: 150000,
			currency: "IDR",
			payment_type: "bank_transfer",
			bank: "bsi",
			customer: {
				name: "Budi",
				email: "budi@example.com",
				phone: "+628123456789",
			},
			items: [
				{
					id: "SKU-1",
					name: "Kaos PayGate",
					qty: 1,
					price: 150000,
				},
			],
		},
		{
			idempotencyKey: "idem_INV-2026-0001",
		},
	);

	console.log(transaction);
}
