export type ApiDocMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type ApiDocLanguage = "curl" | "javascript" | "php" | "go" | "rust";
export type ApiDocAuthMode = "store-token" | "merchant-webhook";

export type ApiDocExample = {
	language: ApiDocLanguage;
	label: string;
	code: string;
};

export type ApiDocOperation = {
	id: string;
	method: ApiDocMethod;
	summary: string;
	description: string;
	audience: string;
	authMode: ApiDocAuthMode;
	authLabel: string;
	requestHeaders: string[];
	pathParams?: string[];
	queryParams?: string[];
	bodyFields?: string[];
	notes?: string[];
	successStatus: string;
	responseDescription: string;
	requestBody?: Record<string, unknown>;
	responseBody?: unknown;
	examples: ApiDocExample[];
};

export type ApiDocRoute = {
	path: string;
	description: string;
	operations: ApiDocOperation[];
};

export type ApiDocSection = {
	id: string;
	label: string;
	description: string;
	routes: ApiDocRoute[];
};

const apiBaseURL = "https://paygate.digixsolution.net";
const merchantCallbackURL = "https://merchant.example.com/api/paygate/webhook";
const storeApiToken = "sk_store_live_xxxxxxxxxxxxxxxxxxxx";
const idempotencyKey = "idem_INV-2026-0001";
const webhookSignature = "sha256=58cb1c4db1f4d6cc4e2d0f24cc8c9f1c0f8f53d8dca0f7086ca12f57f7f75f92";

function asJSON(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function resolveRequestURL(path: string) {
	return path.startsWith("http://") || path.startsWith("https://")
		? path
		: `${apiBaseURL}${path}`;
}

function normalizePathForTemplate(path: string) {
	return path.replaceAll("{", "${");
}

function buildHeaderObject(authMode: ApiDocAuthMode, extraHeaders: Record<string, string> = {}) {
	const headers: Record<string, string> = {};

	if (authMode === "store-token") {
		headers.Authorization = `Bearer ${storeApiToken}`;
	}

	if (Object.keys(extraHeaders).length > 0 || authMode === "merchant-webhook") {
		headers["Content-Type"] = "application/json";
	}

	return { ...headers, ...extraHeaders };
}

function buildCurlExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const requestURL = resolveRequestURL(path);
	const lines = [`curl --request ${method} '${requestURL}'`];

	for (const [key, value] of Object.entries(headers)) {
		lines.push(`  --header '${key}: ${value}'`);
	}

	if (requestBody) {
		lines.push(`  --data '${asJSON(requestBody)}'`);
	}

	return lines.join(" \\\n");
}

function buildJavascriptExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const requestURL = resolveRequestURL(path);
	const bodyBlock = requestBody
		? `,\n  body: JSON.stringify(${asJSON(requestBody)})`
		: "";

	return `const response = await fetch(\`${normalizePathForTemplate(requestURL)}\`, {
  method: "${method}",
  headers: ${asJSON(headers)}${bodyBlock}
});

const result = await response.json();
console.log(result);`;
}

function phpArrayLiteral(value: unknown) {
	return asJSON(value)
		.replaceAll("{", "[")
		.replaceAll("}", "]")
		.replaceAll(/"([^"]+)":/g, "'$1' =>")
		.replaceAll(/"([^"]*)"/g, "'$1'");
}

function buildPhpExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const requestURL = resolveRequestURL(path);
	const bodyBlock = requestBody
		? `,\n    'json' => ${phpArrayLiteral(requestBody)}`
		: "";

	return `<?php

use GuzzleHttp\\Client;

$client = new Client([
    'timeout' => 10,
]);

$response = $client->request('${method}', '${requestURL}', [
    'headers' => ${phpArrayLiteral(headers)}${bodyBlock}
]);

echo $response->getBody()->getContents();`;
}

function buildGoExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const requestURL = resolveRequestURL(path);
	const bodyLiteral = requestBody ? asJSON(requestBody) : "";
	const bodySetup = requestBody
		? `payload := strings.NewReader(${JSON.stringify(bodyLiteral)})`
		: "payload := http.NoBody";
	const headerLines = Object.entries(headers)
		.map(([key, value]) => `req.Header.Set(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
		.join("\n  ");

	return `package main

import (
  "fmt"
  "io"
  "net/http"
  ${requestBody ? '"strings"' : ""}
)

func main() {
  ${bodySetup}

  req, err := http.NewRequest("${method}", "${requestURL}", payload)
  if err != nil {
    panic(err)
  }

  ${headerLines || "// No additional headers"}

  resp, err := http.DefaultClient.Do(req)
  if err != nil {
    panic(err)
  }
  defer resp.Body.Close()

  body, _ := io.ReadAll(resp.Body)
  fmt.Println(string(body))
}`;
}

function buildRustExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const requestURL = resolveRequestURL(path);
	const headerLines = Object.entries(headers)
		.map(([key, value]) => `.header(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
		.join("\n        ");
	const bodyLine = requestBody ? `\n        .json(&serde_json::json!(${asJSON(requestBody)}))` : "";

	return `use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let client = reqwest::Client::new();

    let response = client
        .request(reqwest::Method::${method}, ${JSON.stringify(requestURL)})
        ${headerLines}${bodyLine}
        .send()
        .await?;

    println!("{}", response.text().await?);
    Ok(())
}`;
}

function buildExamples(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
): ApiDocExample[] {
	return [
		{
			language: "curl",
			label: "cURL",
			code: buildCurlExample(method, path, authMode, requestBody, extraHeaders),
		},
		{
			language: "javascript",
			label: "JavaScript",
			code: buildJavascriptExample(method, path, authMode, requestBody, extraHeaders),
		},
		{
			language: "php",
			label: "PHP",
			code: buildPhpExample(method, path, authMode, requestBody, extraHeaders),
		},
		{
			language: "go",
			label: "Go",
			code: buildGoExample(method, path, authMode, requestBody, extraHeaders),
		},
		{
			language: "rust",
			label: "Rust",
			code: buildRustExample(method, path, authMode, requestBody, extraHeaders),
		},
	];
}

const chargeRequestBody = {
	order_id: "INV-2026-0001",
	amount: 150000,
	currency: "IDR",
	payment_type: "bank_transfer",
	bank: "bca",
	customer: {
		name: "Budi Santoso",
		email: "budi@example.com",
	},
};

const chargeResponseBody = {
	success: true,
	data: {
		order_id: "INV-2026-0001",
		status: "pending",
		amount: 150000,
		midtrans: {
			transaction_id: "trx_01j4vzhx0e6xj4rb2h9t7y6f2g",
			payment_type: "bank_transfer",
			va_numbers: [
				{
					bank: "bca",
					va_number: "88001234567890",
				},
			],
		},
	},
};

const statusResponseBody = {
	success: true,
	data: {
		order_id: "INV-2026-0001",
		platform_order_id: "store_01_INV-2026-0001",
		transaction_status: "paid",
		payment_type: "bank_transfer",
		amount: 150000,
		paid_at: "2026-05-04T16:42:10+08:00",
	},
};

const webhookPayloadBody = {
	event_type: "transaction.updated",
	order_id: "INV-2026-0001",
	platform_order_id: "store_01_INV-2026-0001",
	transaction_status: "paid",
	payment_type: "bank_transfer",
	amount: 150000,
	paid_at: "2026-05-04T16:42:10+08:00",
	customer: {
		name: "Budi Santoso",
		email: "budi@example.com",
	},
};

export const apiDocSections: ApiDocSection[] = [
	{
		id: "charge",
		label: "Buat Charge",
		description:
			"Endpoint utama yang dipakai backend toko untuk memulai pembayaran baru lewat PayGate tanpa menyentuh Server Key Midtrans.",
		routes: [
			{
				path: "/v1/transactions/charge",
				description:
					"Kirim payload order dari backend toko Anda. PayGate akan memvalidasi, memetakan ke Midtrans, lalu mengembalikan data pembayaran yang aman untuk frontend merchant.",
				operations: [
					{
						id: "charge-transaction",
						method: "POST",
						summary: "Buat transaksi baru",
						description:
							"Gunakan endpoint ini setiap kali toko Anda perlu membuat instruksi pembayaran baru untuk customer.",
						audience: "Backend toko",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: [
							"Authorization: Bearer <STORE_API_TOKEN>",
							"Idempotency-Key: idem_INV-2026-0001",
							"Content-Type: application/json",
						],
						bodyFields: [
							"order_id: ID order unik di sistem toko Anda",
							"amount: nominal pembayaran dalam integer IDR",
							"currency: gunakan \"IDR\"",
							"payment_type: bank_transfer, ewallet, atau qris",
							"bank: wajib saat payment_type = bank_transfer",
							"customer.name: nama pembeli",
							"customer.email: email pembeli",
						],
						notes: [
							"Simpan `order_id` yang sama di sistem toko agar tracing ke dashboard lebih mudah.",
							"Gunakan `Idempotency-Key` unik per order supaya retry jaringan tidak membuat charge ganda.",
							"Response hanya memuat data aman. Credential Midtrans tidak pernah ikut dikembalikan.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Instruksi pembayaran aman yang siap dipakai untuk menampilkan VA, QR, atau status awal ke customer.",
						requestBody: chargeRequestBody,
						responseBody: chargeResponseBody,
						examples: buildExamples("POST", "/v1/transactions/charge", "store-token", chargeRequestBody, {
							"Idempotency-Key": idempotencyKey,
						}),
					},
				],
			},
		],
	},
	{
		id: "status",
		label: "Cek Status",
		description:
			"Endpoint untuk sinkronisasi status order dari backend toko Anda. Cocok untuk polling admin panel, halaman detail order, atau job retry internal.",
		routes: [
			{
				path: "/v1/transactions/{order_id}",
				description:
					"Ambil status terbaru untuk order yang sebelumnya dibuat memakai store token yang sama.",
				operations: [
					{
						id: "get-transaction-status",
						method: "GET",
						summary: "Ambil status transaksi",
						description:
							"Gunakan endpoint ini saat toko perlu memastikan order sudah paid, masih pending, gagal, atau expired.",
						audience: "Backend toko",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: ["Authorization: Bearer <STORE_API_TOKEN>"],
						pathParams: [
							"order_id: ID order toko Anda yang dipakai saat memanggil endpoint charge",
						],
						notes: [
							"Aman dipanggil berulang untuk sinkronisasi status.",
							"Jika `order_id` tidak ditemukan untuk store token ini, backend menerima `404`.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Status transaksi terbaru yang sudah dimapping ke format PayGate dan aman dipakai di sistem toko.",
						responseBody: statusResponseBody,
						examples: buildExamples("GET", "/v1/transactions/{order_id}", "store-token"),
					},
				],
			},
		],
	},
	{
		id: "webhook",
		label: "Webhook ke Toko",
		description:
			"Kontrak payload yang akan diterima callback URL toko Anda ketika status transaksi berubah. Anggap section ini sebagai payload reference dan replay example untuk testing.",
		routes: [
			{
				path: merchantCallbackURL,
				description:
					"Contoh callback URL milik toko. Ganti dengan callback URL yang Anda simpan di dashboard PayGate.",
				operations: [
					{
						id: "merchant-webhook-callback",
						method: "POST",
						summary: "Payload webhook yang diterima toko",
						description:
							"PayGate akan mengirim POST ke callback URL toko Anda ketika ada perubahan status transaksi yang perlu disinkronkan.",
						audience: "Backend toko",
						authMode: "merchant-webhook",
						authLabel: "X-PayGate-Signature",
						requestHeaders: [
							"Content-Type: application/json",
							"X-PayGate-Event: transaction.updated",
							"X-PayGate-Delivery: wd_01j4wafrx2t6m8n1q3r5s7u9",
							"X-PayGate-Signature: sha256=<HMAC_RAW_BODY>",
						],
						bodyFields: [
							"event_type: jenis event, mis. transaction.updated",
							"order_id: ID order toko Anda",
							"platform_order_id: ID internal PayGate untuk tracing",
							"transaction_status: pending, paid, failed, expired, atau cancelled",
							"payment_type: metode pembayaran customer",
							"amount: nominal transaksi",
							"paid_at: timestamp saat pembayaran sukses, jika ada",
						],
						notes: [
							"Verifikasi `X-PayGate-Signature` menggunakan HMAC-SHA256 atas raw request body dengan `webhook_secret` store Anda.",
							"Balas `2xx` secepat mungkin setelah payload tervalidasi. Proses berat sebaiknya dipindah ke queue internal toko.",
							"Jika callback gagal, PayGate akan retry otomatis dan histori delivery bisa dipantau dari dashboard.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Toko cukup mengembalikan response 2xx sederhana setelah webhook diterima dan diverifikasi.",
						requestBody: webhookPayloadBody,
						responseBody: {
							received: true,
						},
						examples: buildExamples("POST", merchantCallbackURL, "merchant-webhook", webhookPayloadBody, {
							"X-PayGate-Event": "transaction.updated",
							"X-PayGate-Delivery": "wd_01j4wafrx2t6m8n1q3r5s7u9",
							"X-PayGate-Signature": webhookSignature,
						}),
					},
				],
			},
		],
	},
];
