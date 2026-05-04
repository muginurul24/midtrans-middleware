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

export type ApiDocOnboardingStep = {
	title: string;
	description: string;
};

export type ApiDocStatusMapping = {
	status: string;
	midtransSignals: string;
	meaning: string;
	merchantAction: string;
};

export type ApiDocErrorExample = {
	httpStatus: string;
	code: string;
	when: string;
	responseBody: unknown;
};

export type ApiDocGuide = {
	id: string;
	title: string;
	description: string;
	bullets?: string[];
	examples?: ApiDocExample[];
};

const apiBaseURL = "https://paygate.digixsolution.net";
const merchantCallbackURL = "https://merchant.example.com/api/paygate/webhook";
const storeApiToken = "sk_store_live_xxxxxxxxxxxxxxxxxxxx";
const storeWebhookSecret = "whsec_store_xxxxxxxxxxxxxxxxxxxx";
const idempotencyKey = "idem_INV-2026-0001";
const webhookTimestamp = "1715101200";
const webhookSignature =
	"sha256=58cb1c4db1f4d6cc4e2d0f24cc8c9f1c0f8f53d8dca0f7086ca12f57f7f75f92";

function asJSON(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function resolveRequestURL(path: string) {
	return path.startsWith("http://") || path.startsWith("https://")
		? path
		: `${apiBaseURL}${path}`;
}

function buildHeaderObject(
	authMode: ApiDocAuthMode,
	extraHeaders: Record<string, string> = {},
) {
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
	const headers = buildHeaderObject(
		authMode,
		requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders,
	);
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
	const headers = buildHeaderObject(
		authMode,
		requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders,
	);
	const requestURL = resolveRequestURL(path);
	const bodyBlock = requestBody ? `,\n  body: JSON.stringify(${asJSON(requestBody)})` : "";

	return `const response = await fetch(${JSON.stringify(requestURL)}, {
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
	const headers = buildHeaderObject(
		authMode,
		requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders,
	);
	const requestURL = resolveRequestURL(path);
	const bodyBlock = requestBody ? `,\n    'json' => ${phpArrayLiteral(requestBody)}` : "";

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
	const headers = buildHeaderObject(
		authMode,
		requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders,
	);
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
	const headers = buildHeaderObject(
		authMode,
		requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders,
	);
	const requestURL = resolveRequestURL(path);
	const headerLines = Object.entries(headers)
		.map(([key, value]) => `.header(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
		.join("\n        ");
	const bodyLine = requestBody
		? `\n        .json(&serde_json::json!(${asJSON(requestBody)}))`
		: "";

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

function buildErrorResponse(
	code: string,
	message: string,
	details: Record<string, unknown> = {},
) {
	return {
		success: false,
		error: {
			code,
			message,
			request_id: "req_01j54xkq5pq9m2m9f2tr4cx2zn",
			details,
		},
	};
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
		phone: "081234567890",
	},
	items: [
		{
			id: "sku-hoodie-black",
			name: "Hoodie PayGate Black",
			price: 150000,
			quantity: 1,
		},
	],
	callback_url: merchantCallbackURL,
	metadata: {
		channel: "web",
		cart_id: "cart_20391",
	},
};

const chargeResponseBody = {
	success: true,
	data: {
		transaction_id: "87f7f4d3-5dae-418d-a30d-6b6a06bf0d0e",
		order_id: "INV-2026-0001",
		platform_order_id: "merchant-01_INV-2026-0001",
		status: "pending",
		payment_type: "bank_transfer",
		amount: 150000,
		midtrans: {
			transaction_id: "trx_01j4vzhx0e6xj4rb2h9t7y6f2g",
			transaction_status: "pending",
			fraud_status: "accept",
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
		id: "87f7f4d3-5dae-418d-a30d-6b6a06bf0d0e",
		order_id: "INV-2026-0001",
		platform_order_id: "merchant-01_INV-2026-0001",
		midtrans_transaction_id: "trx_01j4vzhx0e6xj4rb2h9t7y6f2g",
		payment_type: "bank_transfer",
		gross_amount: 150000,
		currency: "IDR",
		status: "paid",
		fraud_status: "accept",
		metadata: {
			channel: "web",
			cart_id: "cart_20391",
		},
		created_at: "2026-05-04T15:32:08+08:00",
		updated_at: "2026-05-04T15:41:33+08:00",
		paid_at: "2026-05-04T15:41:33+08:00",
	},
};

const auditLogResponseBody = {
	success: true,
	data: {
		logs: [
			{
				id: "log_01j54y0r2f0cxk6g5v8d8f49dm",
				request_id: "req_01j54xywrv1m48s1w9bxvkhd8e",
				actor_type: "store_api_token",
				actor_id: "tok_01j54xwazfztp9bxeh7kk7c0yb",
				direction: "inbound",
				method: "POST",
				url: "/v1/transactions/charge",
				status_code: 201,
				request_body: {
					order_id: "INV-2026-0001",
					amount: 150000,
				},
				response_body: {
					success: true,
				},
				error_message: null,
				duration_ms: 184,
				created_at: "2026-05-04T15:32:08+08:00",
			},
		],
		meta: {
			total: 1,
			limit: 50,
			offset: 0,
			has_next: false,
		},
	},
};

const webhookPayloadBody = {
	event_type: "transaction.updated",
	order_id: "INV-2026-0001",
	platform_order_id: "merchant-01_INV-2026-0001",
	transaction_status: "paid",
	payment_type: "bank_transfer",
	amount: 150000,
	paid_at: "2026-05-04T15:41:33+08:00",
	customer: {
		name: "Budi Santoso",
		email: "budi@example.com",
	},
};

export const apiDocOnboardingSteps: ApiDocOnboardingStep[] = [
	{
		title: "1. Buat store dan token dari dashboard",
		description:
			"Owner merchant membuat store lebih dulu, lalu generate Store API token dari tab Store & Token. Token plaintext hanya tampil sekali saat dibuat atau di-rotate.",
	},
	{
		title: "2. Simpan token dan webhook secret di backend merchant",
		description:
			"Simpan `STORE_API_TOKEN` dan `webhook_secret` di secret manager atau environment server. Jangan pernah menaruh token store di browser, mobile app publik, atau frontend checkout.",
	},
	{
		title: "3. Pakai Store API token secara server-to-server",
		description:
			"PayGate menolak request store API yang datang dari browser origin. Semua call ke `/v1/transactions/*` dan `/v1/audit-logs` harus berasal dari backend merchant.",
	},
	{
		title: "4. Verifikasi semua webhook masuk",
		description:
			"Setiap callback dari PayGate ke merchant backend membawa `X-Webhook-Timestamp` dan `X-Webhook-Signature`. Verifikasi keduanya sebelum update status order lokal.",
	},
	{
		title: "5. Unduh SDK starter yang paling dekat dengan stack merchant",
		description:
			"Gunakan client starter untuk menangani auth header, response envelope, polling transaksi, dan helper verifikasi webhook. Ini mempercepat integrasi tanpa mengunci Anda ke framework tertentu.",
	},
	{
		title: "6. Mulai dari starter kit webhook, lalu sambungkan ke order service Anda",
		description:
			"Gunakan file starter kit di tab docs sebagai baseline receiver webhook. Setelah signature valid, sambungkan logika di dalamnya ke update status order, fulfillment, dan queue internal merchant.",
	},
];

export const apiDocStatusMappings: ApiDocStatusMapping[] = [
	{
		status: "pending",
		midtransSignals: "pending, authorize",
		meaning: "Instruksi pembayaran sudah dibuat tetapi dana belum settle.",
		merchantAction: "Tampilkan VA/QR ke customer dan tunggu webhook atau polling berikutnya.",
	},
	{
		status: "paid",
		midtransSignals: "capture, settlement",
		meaning: "Pembayaran berhasil diterima dan transaksi aman ditandai sukses.",
		merchantAction: "Aktifkan fulfillment, invoice, atau akses produk di sistem merchant.",
	},
	{
		status: "challenge",
		midtransSignals: "capture dengan fraud_status=challenge",
		meaning: "Pembayaran tertahan untuk review fraud atau approval lanjutan.",
		merchantAction: "Tahan fulfillment otomatis dan tunggu keputusan final berikutnya.",
	},
	{
		status: "failed",
		midtransSignals: "deny, failure",
		meaning: "Pembayaran ditolak atau gagal diproses.",
		merchantAction: "Tawarkan metode bayar lain atau minta customer mengulangi checkout.",
	},
	{
		status: "expired",
		midtransSignals: "expire",
		meaning: "Batas waktu pembayaran habis sebelum dana diterima.",
		merchantAction: "Izinkan customer membuat charge baru dengan order baru atau checkout ulang.",
	},
	{
		status: "cancelled",
		midtransSignals: "cancel",
		meaning: "Transaksi dibatalkan oleh sistem atau operator.",
		merchantAction: "Tutup order lokal dan pastikan tidak ada fulfillment berjalan.",
	},
];

export const apiDocErrorExamples: ApiDocErrorExample[] = [
	{
		httpStatus: "400 Bad Request",
		code: "VALIDATION_ERROR",
		when: "Payload charge tidak valid atau header `Idempotency-Key` tidak dikirim.",
		responseBody: buildErrorResponse("VALIDATION_ERROR", "Missing Idempotency-Key header."),
	},
	{
		httpStatus: "403 Forbidden",
		code: "FORBIDDEN",
		when: "Token tidak memiliki scope yang dibutuhkan, misalnya `transaction:create` atau `transaction:read`.",
		responseBody: buildErrorResponse(
			"FORBIDDEN",
			"Token scope does not allow creating transactions.",
		),
	},
	{
		httpStatus: "403 Forbidden",
		code: "BROWSER_REQUEST_BLOCKED",
		when: "Store API dipanggil dari browser publik, bukan dari backend merchant.",
		responseBody: buildErrorResponse(
			"BROWSER_REQUEST_BLOCKED",
			"Store API token must only be used server-to-server, not from a browser origin.",
		),
	},
	{
		httpStatus: "409 Conflict",
		code: "TRANSACTION_CONFLICT",
		when: "Idempotency key atau order ID dipakai ulang dengan payload berbeda.",
		responseBody: buildErrorResponse(
			"TRANSACTION_CONFLICT",
			"Idempotency-Key already exists with different payload.",
		),
	},
	{
		httpStatus: "429 Too Many Requests",
		code: "RATE_LIMITED",
		when: "Merchant melewati rate limit per token atau per store dalam jendela 1 menit.",
		responseBody: buildErrorResponse("RATE_LIMITED", "Rate limit exceeded.", {
			token_limit: 60,
			store_limit: 300,
		}),
	},
	{
		httpStatus: "502 Bad Gateway",
		code: "MIDTRANS_ERROR",
		when: "PayGate gagal membuat transaction ke Midtrans atau response Midtrans tidak valid.",
		responseBody: buildErrorResponse(
			"MIDTRANS_ERROR",
			"Failed to create transaction on Midtrans.",
		),
	},
];

export const apiDocGuides: ApiDocGuide[] = [
	{
		id: "idempotency",
		title: "Idempotency behavior",
		description:
			"Charge transaction wajib memakai `Idempotency-Key` agar retry jaringan tidak membuat transaksi ganda.",
		bullets: [
			"Gunakan satu `Idempotency-Key` unik untuk setiap order merchant, misalnya `idem_<order_id>`.",
			"Jika key yang sama dipakai ulang dengan payload identik, PayGate akan me-replay transaksi yang sudah ada.",
			"Jika key yang sama dipakai ulang dengan payload berbeda, backend mengembalikan `409 TRANSACTION_CONFLICT`.",
			"Idempotency tetap harus dikombinasikan dengan `order_id` unik di sistem merchant.",
		],
	},
	{
		id: "rate-limit",
		title: "Rate limit behavior",
		description:
			"Store API dilindungi dua lapis rate limit Redis per 1 menit untuk mencegah abuse tanpa mengganggu traffic normal merchant.",
		bullets: [
			"Limit per token: 60 request per menit.",
			"Limit per store: 300 request per menit.",
			"Jika limit terlampaui, backend mengembalikan `429 RATE_LIMITED` beserta `token_limit` dan `store_limit` di field `error.details`.",
			"Polling status sebaiknya memakai interval rasional atau dipadukan dengan webhook agar tidak boros kuota request.",
		],
	},
	{
		id: "webhook-signature",
		title: "Verifikasi signature webhook",
		description:
			"Signature dihitung dengan HMAC-SHA256 atas string `<timestamp>.<raw_body>` menggunakan `webhook_secret` store Anda.",
		examples: [
			{
				language: "javascript",
				label: "JavaScript",
				code: `import crypto from "node:crypto";

const timestamp = process.env.WEBHOOK_TIMESTAMP!;
const rawBody = process.env.WEBHOOK_RAW_BODY!;
const signature = process.env.WEBHOOK_SIGNATURE!;
const secret = process.env.PAYGATE_WEBHOOK_SECRET!;

const expected = "sha256=" + crypto
  .createHmac("sha256", secret)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest("hex");

if (signature !== expected) {
  throw new Error("Invalid webhook signature");
}`,
			},
			{
				language: "php",
				label: "PHP",
				code: `<?php

$timestamp = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'];
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$rawBody = file_get_contents('php://input');
$secret = getenv('PAYGATE_WEBHOOK_SECRET');

$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);

if (!hash_equals($expected, $signature)) {
    throw new RuntimeException('Invalid webhook signature');
}`,
			},
			{
				language: "go",
				label: "Go",
				code: `package main

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "fmt"
)

func main() {
  timestamp := "${webhookTimestamp}"
  rawBody := ${JSON.stringify(asJSON(webhookPayloadBody))}
  secret := "${storeWebhookSecret}"
  signature := "${webhookSignature}"

  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write([]byte(timestamp))
  mac.Write([]byte("."))
  mac.Write([]byte(rawBody))
  expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

  if expected != signature {
    panic("invalid webhook signature")
  }

  fmt.Println("signature valid")
}`,
			},
			{
				language: "rust",
				label: "Rust",
				code: `use hmac::{Hmac, Mac};
use sha2::Sha256;

fn main() {
    let timestamp = "${webhookTimestamp}";
    let raw_body = ${JSON.stringify(asJSON(webhookPayloadBody))};
    let secret = "${storeWebhookSecret}";
    let signature = "${webhookSignature}";

    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(timestamp.as_bytes());
    mac.update(b".");
    mac.update(raw_body.as_bytes());

    let expected = format!("sha256={}", hex::encode(mac.finalize().into_bytes()));

    if expected != signature {
        panic!("invalid webhook signature");
    }
}`,
			},
		],
	},
];

export const apiDocSections: ApiDocSection[] = [
	{
		id: "charge",
		label: "Buat Charge",
		description:
			"Endpoint utama untuk membuat instruksi pembayaran baru lewat PayGate tanpa mengekspos Server Key Midtrans ke merchant.",
		routes: [
			{
				path: "/v1/transactions/charge",
				description:
					"Kirim payload order dari backend merchant. PayGate akan memvalidasi token, mengunci idempotency, memetakan payload ke Midtrans, lalu mengembalikan response aman untuk frontend checkout merchant.",
				operations: [
					{
						id: "charge-transaction",
						method: "POST",
						summary: "Buat transaksi baru",
						description:
							"Gunakan endpoint ini setiap kali merchant perlu membuat instruksi pembayaran baru untuk customer.",
						audience: "Backend toko",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: [
							"Authorization: Bearer <STORE_API_TOKEN>",
							"Idempotency-Key: idem_INV-2026-0001",
							"Content-Type: application/json",
						],
						bodyFields: [
							"order_id: ID order unik dari sistem merchant",
							"amount: nominal pembayaran dalam integer IDR",
							"currency: gunakan \"IDR\"",
							"payment_type: bank_transfer, qris, gopay, shopeepay, atau cstore",
							"bank: wajib untuk payment_type bank_transfer",
							"customer.name / customer.email / customer.phone: identitas pembeli",
							"items[]: detail item order untuk rekonsiliasi dan invoice",
							"callback_url: opsional, override callback URL default store untuk transaksi ini",
							"metadata: field bebas untuk referensi internal merchant",
						],
						notes: [
							"Simpan `transaction_id` dan `platform_order_id` dari response agar tracing ke dashboard lebih cepat.",
							"Endpoint ini mengembalikan `201 Created`, bukan `200 OK`.",
							"Jika request identik diulang dengan `Idempotency-Key` yang sama, PayGate akan mengembalikan transaksi yang sama tanpa membuat charge baru di Midtrans.",
						],
						successStatus: "201 Created",
						responseDescription:
							"Instruksi pembayaran aman yang siap dipakai untuk menampilkan VA, QR, atau status awal checkout merchant.",
						requestBody: chargeRequestBody,
						responseBody: chargeResponseBody,
						examples: buildExamples(
							"POST",
							"/v1/transactions/charge",
							"store-token",
							chargeRequestBody,
							{
								"Idempotency-Key": idempotencyKey,
							},
						),
					},
				],
			},
		],
	},
	{
		id: "status",
		label: "Cek Status",
		description:
			"Endpoint sinkronisasi status order untuk halaman detail order merchant, polling admin panel, atau job retry internal.",
		routes: [
			{
				path: "/v1/transactions/{order_id}",
				description:
					"Ambil status terbaru untuk order yang sebelumnya dibuat menggunakan Store API token dari store yang sama.",
				operations: [
					{
						id: "get-transaction-status",
						method: "GET",
						summary: "Ambil detail transaksi berdasarkan order ID",
						description:
							"Gunakan endpoint ini saat merchant perlu memastikan order masih pending, sudah paid, gagal, challenge, expired, atau cancelled.",
						audience: "Backend toko",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: ["Authorization: Bearer <STORE_API_TOKEN>"],
						pathParams: [
							"order_id: ID order merchant yang dipakai saat memanggil endpoint charge",
						],
						notes: [
							"Endpoint ini aman dipakai berulang untuk polling status.",
							"Jika order tidak ditemukan untuk store token aktif, backend mengembalikan `404 NOT_FOUND`.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Detail transaksi terbaru dari source of truth PayGate, termasuk `status`, `paid_at`, dan metadata order merchant.",
						responseBody: statusResponseBody,
						examples: buildExamples(
							"GET",
							"/v1/transactions/INV-2026-0001",
							"store-token",
						),
					},
				],
			},
		],
	},
	{
		id: "audit",
		label: "Audit Log Merchant",
		description:
			"Endpoint observability untuk backend merchant yang perlu menelusuri request, response, dan error per order atau request ID tanpa membuka dashboard.",
		routes: [
			{
				path: "/v1/audit-logs",
				description:
					"Ambil audit log hanya untuk store yang terikat pada token aktif. Semua field sensitif sudah dimasking sebelum tersimpan.",
				operations: [
					{
						id: "list-audit-logs",
						method: "GET",
						summary: "List audit log store aktif",
						description:
							"Gunakan endpoint ini untuk troubleshooting order, melihat request ID, atau mengonfirmasi response PayGate yang pernah diterima merchant.",
						audience: "Backend toko",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: ["Authorization: Bearer <STORE_API_TOKEN>"],
						queryParams: [
							"limit: default 50, maksimum 200",
							"offset: offset pagination, mulai dari 0",
							"query: pencarian umum untuk request ID, endpoint, atau error message",
							"request_id: filter satu request ID spesifik",
							"order_id: filter semua audit log untuk satu order merchant",
							"endpoint: filter berdasarkan endpoint seperti /v1/transactions/charge",
							"status_code: filter status HTTP tertentu, misalnya 201 atau 409",
							"created_from / created_to: tanggal UTC format YYYY-MM-DD",
						],
						notes: [
							"Audit log hanya tersedia jika token memiliki scope `transaction:read`.",
							"Response body yang tersimpan adalah hasil masking; secret, credential, dan signature mentah tidak diekspos.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Daftar audit log merchant dengan metadata pagination untuk kebutuhan observability atau eksport internal merchant.",
						responseBody: auditLogResponseBody,
						examples: buildExamples(
							"GET",
							"/v1/audit-logs?order_id=INV-2026-0001&limit=20",
							"store-token",
						),
					},
				],
			},
		],
	},
	{
		id: "webhook",
		label: "Webhook ke Toko",
		description:
			"Kontrak payload yang akan diterima callback URL merchant ketika status transaksi berubah. Anggap section ini sebagai reference payload dan replay sample untuk testing internal merchant.",
		routes: [
			{
				path: merchantCallbackURL,
				description:
					"Contoh callback URL merchant. Ganti dengan callback URL yang Anda simpan di dashboard PayGate.",
				operations: [
					{
						id: "merchant-webhook-callback",
						method: "POST",
						summary: "Payload webhook yang diterima merchant",
						description:
							"PayGate akan mengirim `POST` ke callback URL merchant setiap kali ada perubahan status transaksi yang perlu disinkronkan.",
						audience: "Backend toko",
						authMode: "merchant-webhook",
						authLabel: "Webhook secret store",
						requestHeaders: [
							"Content-Type: application/json",
							"X-Webhook-Id: wd_01j4wafrx2t6m8n1q3r5s7u9",
							"X-Webhook-Timestamp: 1715101200",
							"X-Webhook-Signature: sha256=<HMAC(timestamp.raw_body)>",
						],
						bodyFields: [
							"event_type: jenis event, mis. transaction.updated",
							"order_id: ID order merchant",
							"platform_order_id: ID internal PayGate untuk tracing operator",
							"transaction_status: pending, paid, failed, expired, cancelled, atau challenge",
							"payment_type: metode pembayaran customer",
							"amount: nominal transaksi",
							"paid_at: timestamp saat pembayaran sukses, jika ada",
							"customer: subset data customer yang aman untuk sinkronisasi merchant",
						],
						notes: [
							"Verifikasi `X-Webhook-Signature` terhadap string `<timestamp>.<raw_body>` memakai `webhook_secret` store Anda.",
							"Balas `2xx` secepat mungkin setelah payload tervalidasi. Pekerjaan berat sebaiknya dipindah ke queue internal merchant.",
							"Jika callback merchant gagal, PayGate akan retry otomatis setiap 20 detik sampai maksimal 10 attempt.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Response merchant ke PayGate cukup berupa `2xx` sederhana setelah webhook diterima dan diverifikasi.",
						requestBody: webhookPayloadBody,
						responseBody: {
							received: true,
						},
						examples: buildExamples(
							"POST",
							merchantCallbackURL,
							"merchant-webhook",
							webhookPayloadBody,
							{
								"X-Webhook-Id": "wd_01j4wafrx2t6m8n1q3r5s7u9",
								"X-Webhook-Timestamp": webhookTimestamp,
								"X-Webhook-Signature": webhookSignature,
							},
						),
					},
				],
			},
		],
	},
];
