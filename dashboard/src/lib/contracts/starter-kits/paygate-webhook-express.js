// @ts-nocheck
import crypto from "node:crypto";
import express from "express";

const app = express();
const webhookSecret = process.env.PAYGATE_WEBHOOK_SECRET;
const maxSkewSeconds = 300;

if (!webhookSecret) {
	throw new Error("PAYGATE_WEBHOOK_SECRET is required");
}

function buildExpectedSignature(rawBody, timestamp) {
	return (
		"sha256=" +
		crypto
			.createHmac("sha256", webhookSecret)
			.update(`${timestamp}.${rawBody}`)
			.digest("hex")
	);
}

function isFreshTimestamp(timestamp) {
	const value = Number(timestamp);
	if (!Number.isFinite(value)) return false;
	return Math.abs(Math.floor(Date.now() / 1000) - value) <= maxSkewSeconds;
}

app.post(
	"/api/paygate/webhook",
	express.raw({ type: "application/json", limit: "1mb" }),
	async (req, res) => {
		const timestamp = req.get("x-webhook-timestamp") ?? "";
		const signature = req.get("x-webhook-signature") ?? "";
		const rawBody = req.body.toString("utf8");

		if (!timestamp || !signature) {
			return res.status(400).json({ error: "Missing webhook headers" });
		}

		if (!isFreshTimestamp(timestamp)) {
			return res.status(400).json({ error: "Webhook timestamp is too old" });
		}

		const expected = buildExpectedSignature(rawBody, timestamp);
		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
			return res.status(401).json({ error: "Invalid webhook signature" });
		}

		const payload = JSON.parse(rawBody);

		// Simpan perubahan status order ke database merchant.
		await upsertOrderFromPaygate(payload);

		// Balas cepat. Pekerjaan berat seperti email/invoice sebaiknya dipindah ke queue internal.
		return res.status(200).json({ received: true });
	},
);

async function upsertOrderFromPaygate(payload) {
	console.log("PayGate webhook accepted", {
		order_id: payload.transaction.order_id,
		status: payload.transaction.status,
	});
}

app.listen(3000, () => {
	console.log("PayGate webhook receiver listening on :3000");
});
