export type ApiDocMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type ApiDocLanguage = "curl" | "javascript" | "php" | "go" | "rust";
export type ApiDocAuthMode = "store-token" | "dashboard-bearer" | "public" | "midtrans-webhook";

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
const dashboardAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dashboard_access_token";
const refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dashboard_refresh_token";
const storeApiToken = "sk_store_live_xxxxxxxxxxxxxxxxxxxx";
const idempotencyKey = "idem_INV-2026-0001";

function asJSON(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function normalizePathForTemplate(path: string) {
	return path.replaceAll("{", "${");
}

function buildHeaderObject(authMode: ApiDocAuthMode, extraHeaders: Record<string, string> = {}) {
	const headers: Record<string, string> = {};
	if (authMode === "store-token") {
		headers.Authorization = `Bearer ${storeApiToken}`;
	}
	if (authMode === "dashboard-bearer") {
		headers.Authorization = `Bearer ${dashboardAccessToken}`;
	}
	if (authMode === "midtrans-webhook") {
		headers["Content-Type"] = "application/json";
	}
	if (!headers["Content-Type"] && Object.keys(extraHeaders).length > 0) {
		headers["Content-Type"] = "application/json";
	}
	return { ...headers, ...extraHeaders };
}

function renderHeaderLines(headers: Record<string, string>) {
	return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
}

function buildCurlExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const lines = [`curl --request ${method} '${apiBaseURL}${path}'`];

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
	const headersBlock = asJSON(headers);
	const bodyBlock = requestBody
		? `,\n  body: JSON.stringify(${asJSON(requestBody)})`
		: "";

	return `const apiBaseURL = "${apiBaseURL}";

const response = await fetch(\`${apiBaseURL}${normalizePathForTemplate(path)}\`, {
  method: "${method}",
  headers: ${headersBlock}${bodyBlock}
});

const result = await response.json();
console.log(result);`;
}

function buildPhpExample(
	method: ApiDocMethod,
	path: string,
	authMode: ApiDocAuthMode,
	requestBody?: Record<string, unknown>,
	extraHeaders: Record<string, string> = {},
) {
	const headers = buildHeaderObject(authMode, requestBody ? { "Content-Type": "application/json", ...extraHeaders } : extraHeaders);
	const headersPhp = asJSON(headers)
		.replaceAll("{", "[")
		.replaceAll("}", "]")
		.replaceAll(/"([^"]+)":/g, "'$1' =>")
		.replaceAll(/"([^"]*)"/g, "'$1'");
	const bodyBlock = requestBody
		? `,\n    'json' => ${asJSON(requestBody)
				.replaceAll("{", "[")
				.replaceAll("}", "]")
				.replaceAll(/"([^"]+)":/g, "'$1' =>")
				.replaceAll(/"([^"]*)"/g, "'$1'")}`
		: "";

	return `<?php

use GuzzleHttp\\Client;

$client = new Client([
    'base_uri' => '${apiBaseURL}',
    'timeout' => 10,
]);

$response = $client->request('${method}', '${path}', [
    'headers' => ${headersPhp}${bodyBlock}
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
	const bodyLiteral = requestBody ? asJSON(requestBody) : "";
	const bodySetup = requestBody
		? `payload := strings.NewReader(${JSON.stringify(bodyLiteral)})`
		: "payload := http.NoBody";
	const headerLines = Object.entries(headers)
		.map(([key, value]) => `req.Header.Set(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
		.join("\n");

	return `package main

import (
  "fmt"
  "io"
  "net/http"
  ${requestBody ? '"strings"' : ""}
)

func main() {
  apiBaseURL := "${apiBaseURL}"
  ${bodySetup}

  req, err := http.NewRequest("${method}", apiBaseURL+"${path}", payload)
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
	const headerLines = Object.entries(headers)
		.map(([key, value]) => `.header(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
		.join("\n        ");
	const bodyLine = requestBody ? `\n        .json(&serde_json::json!(${asJSON(requestBody)}))` : "";

	return `use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let api_base_url = "${apiBaseURL}";
    let client = reqwest::Client::new();

    let response = client
        .request(reqwest::Method::${method}, format!("{api_base_url}${path}"))
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

function successEnvelope(data: unknown) {
	return {
		success: true,
		data,
	};
}

const sampleUser = {
	id: "93a91d7f-5f6a-4f8c-b489-05c7f9c0a901",
	name: "Founder Demo",
	email: "founder@example.com",
	role: "user",
	created_at: "2026-05-02T03:00:00Z",
	updated_at: "2026-05-02T03:00:00Z",
};

const sampleTokens = {
	access_token: dashboardAccessToken,
	refresh_token: refreshToken,
	token_type: "Bearer",
	access_expires_at: "2026-05-04T10:15:00Z",
	refresh_expires_at: "2026-05-11T10:00:00Z",
};

const sampleMfa = {
	required: false,
	enabled: false,
	verified: false,
	setup_required: false,
	can_access_dashboard: true,
};

const chargeRequestBody = {
	order_id: "INV-2026-0001",
	amount: 150000,
	currency: "IDR",
	payment_type: "bank_transfer",
	bank: "bca",
	customer: {
		name: "Budi",
		email: "budi@example.com",
	},
};

const chargeResponseBody = successEnvelope({
	order_id: "INV-2026-0001",
	status: "pending",
	amount: 150000,
	midtrans: {
		transaction_id: "midtrans_tx_12345",
		payment_type: "bank_transfer",
		va_numbers: [
			{
				bank: "bca",
				va_number: "88001234567890",
			},
		],
	},
});

function op(input: Omit<ApiDocOperation, "examples"> & { extraHeaders?: Record<string, string> }) {
	return {
		...input,
		examples: buildExamples(
			input.method,
			input.id.startsWith("/") ? input.id : "",
			input.authMode,
			input.requestBody,
			input.extraHeaders,
		),
	};
}

export const apiDocSections: ApiDocSection[] = [
	{
		id: "store-api",
		label: "Store API",
		description:
			"Endpoint yang dipakai backend merchant untuk membuat charge dan mengecek status transaksi. Semua panggilan harus server-to-server memakai token store milik PayGate.",
		routes: [
			{
				path: "/v1/transactions/charge",
				description: "Membuat transaksi baru ke Midtrans lewat middleware PayGate.",
				operations: [
					op({
						id: "/v1/transactions/charge",
						method: "POST",
						summary: "Buat charge transaction",
						description:
							"Gunakan endpoint ini saat merchant ingin memulai pembayaran baru tanpa mengekspos Server Key Midtrans.",
						audience: "Backend merchant",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: [
							"Authorization: Bearer <STORE_API_TOKEN>",
							`Idempotency-Key: ${idempotencyKey}`,
							"Content-Type: application/json",
						],
						bodyFields: [
							"order_id: ID order merchant yang unik",
							"amount: nominal pembayaran dalam integer IDR",
							"payment_type: bank_transfer, qris, gopay, shopeepay, dan channel lain yang diizinkan",
							"customer: object customer minimal name dan email",
						],
						notes: [
							"Token store hanya boleh dipakai dari backend merchant, bukan browser publik.",
							"Idempotency-Key wajib unik per percobaan charge agar retry aman.",
						],
						successStatus: "200 OK",
						responseDescription:
							"Response aman untuk merchant. Credential Midtrans tetap tinggal di server PayGate.",
						requestBody: chargeRequestBody,
						responseBody: chargeResponseBody,
						extraHeaders: { "Idempotency-Key": idempotencyKey },
					}),
				],
			},
			{
				path: "/v1/transactions/{order_id}",
				description: "Ambil status transaksi merchant berdasarkan order ID toko.",
				operations: [
					op({
						id: "/v1/transactions/{order_id}",
						method: "GET",
						summary: "Lihat status transaksi",
						description:
							"Biasanya dipakai untuk polling status setelah checkout, atau untuk sinkronisasi state saat merchant tidak ingin menunggu webhook.",
						audience: "Backend merchant",
						authMode: "store-token",
						authLabel: "Store API token",
						requestHeaders: ["Authorization: Bearer <STORE_API_TOKEN>"],
						pathParams: ["order_id: order ID milik merchant yang dipakai saat charge"],
						notes: [
							"Order ID harus cocok dengan store pemilik token.",
							"Jika merchant sudah menerima webhook sukses, endpoint ini biasanya dipakai hanya untuk audit manual.",
						],
						successStatus: "200 OK",
						responseDescription: "Mengembalikan status transaksi terbaru yang diketahui PayGate.",
						responseBody: successEnvelope({
							id: "tx_01j4w5h0r5z9x93s8v0kgq8v2v",
							order_id: "INV-2026-0001",
							platform_order_id: "store_01_INV-2026-0001",
							status: "paid",
							payment_type: "bank_transfer",
							gross_amount: 150000,
							callback_url: "https://merchant.example.com/paygate/webhook",
							midtrans_transaction_id: "midtrans_tx_12345",
							created_at: "2026-05-04T09:00:00Z",
							paid_at: "2026-05-04T09:04:18Z",
						}),
					}),
				],
			},
			{
				path: "/v1/webhooks/midtrans",
				description: "Endpoint inbound yang menerima notifikasi resmi dari Midtrans.",
				operations: [
					op({
						id: "/v1/webhooks/midtrans",
						method: "POST",
						summary: "Terima webhook Midtrans",
						description:
							"Endpoint ini dipanggil Midtrans. Merchant tidak perlu memanggilnya langsung, tetapi payload di sini berguna untuk testing internal atau simulasi QA.",
						audience: "Midtrans / internal QA",
						authMode: "midtrans-webhook",
						authLabel: "Signature Midtrans",
						requestHeaders: ["Content-Type: application/json"],
						bodyFields: [
							"order_id: platform order ID yang dibuat PayGate",
							"transaction_status: settlement, pending, expire, cancel, deny, challenge, atau failure",
							"signature_key: signature SHA512 dari Midtrans",
						],
						notes: [
							"Pada production, validasi utama datang dari signature SHA512 payload Midtrans.",
							"Setelah webhook lolos verifikasi, PayGate akan update transaksi dan enqueue relay ke callback store.",
						],
						successStatus: "200 OK",
						responseDescription: "Payload diterima dan diproses untuk update status + relay store.",
						requestBody: {
							order_id: "store_01_INV-2026-0001",
							transaction_status: "settlement",
							status_code: "200",
							gross_amount: "150000.00",
							signature_key: "sha512_signature_from_midtrans",
						},
						responseBody: successEnvelope({ accepted: true }),
					}),
				],
			},
		],
	},
	{
		id: "dashboard-auth",
		label: "Dashboard Auth & MFA",
		description:
			"Semua endpoint untuk akun operator dashboard: registrasi, login, refresh sesi, profil akun, dan flow MFA.",
		routes: [
			{
				path: "/v1/dashboard/auth/register",
				description: "Membuat akun operator baru untuk dashboard.",
				operations: [
					op({
						id: "/v1/dashboard/auth/register",
						method: "POST",
						summary: "Register akun dashboard",
						description: "Dipakai saat onboarding akun baru sebelum store pertama dibuat.",
						audience: "Frontend dashboard",
						authMode: "public",
						authLabel: "Tanpa auth",
						requestHeaders: ["Content-Type: application/json"],
						bodyFields: [
							"name: nama operator",
							"email: email login unik",
							"password: password minimal 8 karakter",
						],
						successStatus: "201 Created",
						responseDescription: "Mengembalikan user, token sesi, dan state MFA awal.",
						requestBody: {
							name: "Founder Demo",
							email: "founder@example.com",
							password: "SuperSecure123",
						},
						responseBody: successEnvelope({
							user: sampleUser,
							tokens: sampleTokens,
							mfa: sampleMfa,
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/login",
				description: "Membuka sesi dashboard baru untuk operator yang sudah terdaftar.",
				operations: [
					op({
						id: "/v1/dashboard/auth/login",
						method: "POST",
						summary: "Login akun dashboard",
						description:
							"Jika MFA diwajibkan di backend, response dapat mengarahkan user untuk verifikasi sebelum dashboard bisa diakses penuh.",
						audience: "Frontend dashboard",
						authMode: "public",
						authLabel: "Tanpa auth",
						requestHeaders: ["Content-Type: application/json"],
						bodyFields: ["email: email operator", "password: password operator"],
						successStatus: "200 OK",
						responseDescription: "Mengembalikan user, access token, refresh token, dan state MFA terbaru.",
						requestBody: {
							email: "founder@example.com",
							password: "SuperSecure123",
						},
						responseBody: successEnvelope({
							user: sampleUser,
							tokens: sampleTokens,
							mfa: sampleMfa,
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/refresh",
				description: "Meminta access token baru menggunakan refresh token yang masih aktif.",
				operations: [
					op({
						id: "/v1/dashboard/auth/refresh",
						method: "POST",
						summary: "Refresh sesi dashboard",
						description:
							"Frontend biasanya memanggil endpoint ini saat access token expired tetapi refresh token masih aktif.",
						audience: "Frontend dashboard",
						authMode: "public",
						authLabel: "Tanpa auth",
						requestHeaders: ["Content-Type: application/json"],
						bodyFields: ["refresh_token: refresh token aktif dari login/register sebelumnya"],
						successStatus: "200 OK",
						responseDescription: "Mengembalikan pasangan token baru dan state MFA terbaru.",
						requestBody: {
							refresh_token: refreshToken,
						},
						responseBody: successEnvelope({
							tokens: sampleTokens,
							mfa: sampleMfa,
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/logout",
				description: "Mengakhiri sesi operator saat ini.",
				operations: [
					op({
						id: "/v1/dashboard/auth/logout",
						method: "POST",
						summary: "Logout sesi aktif",
						description: "Revoke access saat ini lalu bersihkan state lokal frontend.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						successStatus: "204 No Content",
						responseDescription: "Session revoked tanpa response body.",
						responseBody: null,
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/change-password",
				description: "Mengganti password operator yang sedang login.",
				operations: [
					op({
						id: "/v1/dashboard/auth/change-password",
						method: "POST",
						summary: "Ganti password akun aktif",
						description:
							"Gunakan current password untuk memastikan perubahan dilakukan oleh pemilik sesi yang sah.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						bodyFields: [
							"current_password: password saat ini",
							"new_password: password baru operator",
						],
						successStatus: "204 No Content",
						responseDescription: "Password diperbarui tanpa response body tambahan.",
						requestBody: {
							current_password: "SuperSecure123",
							new_password: "EvenMoreSecure123!",
						},
						responseBody: null,
					}),
				],
			},
			{
				path: "/v1/dashboard/me",
				description: "Membaca user aktif dan status MFA terbaru dari sesi yang sedang berjalan.",
				operations: [
					op({
						id: "/v1/dashboard/me",
						method: "GET",
						summary: "Ambil profil sesi aktif",
						description:
							"Biasanya dipakai saat bootstrap frontend, setelah refresh token, atau saat operator menekan refresh sesi.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						successStatus: "200 OK",
						responseDescription: "User dan state MFA terbaru.",
						responseBody: successEnvelope({
							user: sampleUser,
							mfa: sampleMfa,
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/mfa/setup",
				description: "Menyiapkan secret MFA baru untuk operator.",
				operations: [
					op({
						id: "/v1/dashboard/auth/mfa/setup",
						method: "POST",
						summary: "Generate secret MFA",
						description:
							"Frontend menampilkan QR / manual code dari response ini, lalu operator memverifikasi kode 6 digit sebelum MFA dianggap aktif.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						successStatus: "200 OK",
						responseDescription: "Secret MFA, otpauth URL, dan recovery codes awal.",
						responseBody: successEnvelope({
							secret: "JBSWY3DPEHPK3PXP",
							otpauth_url: "otpauth://totp/PayGate:founder@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PayGate",
							recovery_codes: ["rcv_123456", "rcv_654321"],
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/mfa/verify",
				description: "Memverifikasi kode MFA atau recovery code.",
				operations: [
					op({
						id: "/v1/dashboard/auth/mfa/verify",
						method: "POST",
						summary: "Verifikasi MFA",
						description:
							"Gunakan kode 6 digit dari authenticator atau recovery code saat device utama tidak tersedia.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						bodyFields: ["code: TOTP 6 digit atau recovery code aktif"],
						successStatus: "200 OK",
						responseDescription: "Status MFA verified dan kemampuan akses dashboard penuh.",
						requestBody: {
							code: "123456",
						},
						responseBody: successEnvelope({
							verified: true,
							recovery_code_used: false,
							mfa: {
								...sampleMfa,
								enabled: true,
								verified: true,
								can_access_dashboard: true,
							},
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/mfa/disable",
				description: "Menonaktifkan MFA dengan kode yang valid.",
				operations: [
					op({
						id: "/v1/dashboard/auth/mfa/disable",
						method: "POST",
						summary: "Matikan MFA",
						description:
							"Gunakan kode MFA aktif untuk mematikan proteksi saat operator memang perlu reset setup.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						bodyFields: ["code: kode TOTP aktif untuk otorisasi aksi sensitif"],
						successStatus: "200 OK",
						responseDescription: "State MFA terbaru setelah disable.",
						requestBody: {
							code: "123456",
						},
						responseBody: successEnvelope({
							mfa: {
								...sampleMfa,
								enabled: false,
								verified: false,
								can_access_dashboard: true,
							},
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/auth/mfa/recovery/regenerate",
				description: "Membuat ulang seluruh recovery code MFA.",
				operations: [
					op({
						id: "/v1/dashboard/auth/mfa/recovery/regenerate",
						method: "POST",
						summary: "Regenerate recovery codes",
						description:
							"Seluruh recovery code lama menjadi tidak berlaku lagi setelah endpoint ini sukses dipanggil.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						bodyFields: ["code: kode TOTP aktif untuk otorisasi regenerate"],
						successStatus: "200 OK",
						responseDescription: "Daftar recovery code baru pengganti yang lama.",
						requestBody: {
							code: "123456",
						},
						responseBody: successEnvelope({
							recovery_codes: ["rcv_112233", "rcv_445566", "rcv_778899"],
						}),
					}),
				],
			},
		],
	},
	{
		id: "dashboard-stores",
		label: "Stores & Tokens",
		description:
			"Endpoint operator untuk membuat tenant merchant, mengelola webhook secret, dan mengatur API token store.",
		routes: [
			{
				path: "/v1/dashboard/stores",
				description: "List semua store milik user aktif, atau buat store baru.",
				operations: [
					op({
						id: "/v1/dashboard/stores",
						method: "GET",
						summary: "List store milik user",
						description: "Dipakai dashboard saat membuka direktori store dan dropdown filter tenant.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						successStatus: "200 OK",
						responseDescription: "Array store yang bisa dikelola oleh operator login.",
						responseBody: successEnvelope({
							stores: [
								{
									id: "store_01j4w54n6yxt5g0x4x4mb7av38",
									name: "Toko Baju Online",
									slug: "toko-baju-online",
									domain: "tokobaju.id",
									default_callback_url: "https://tokobaju.id/api/paygate/webhook",
									status: "active",
								},
							],
						}),
					}),
					op({
						id: "/v1/dashboard/stores",
						method: "POST",
						summary: "Buat store baru",
						description: "Store baru otomatis punya webhook secret awal dan siap dibuatkan token.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						bodyFields: [
							"name: nama tenant merchant",
							"slug: slug store, opsional jika ingin manual",
							"domain: domain merchant, opsional",
							"default_callback_url: callback webhook default merchant",
						],
						successStatus: "201 Created",
						responseDescription: "Store baru dan webhook secret plaintext sekali tampil.",
						requestBody: {
							name: "Kerajinan Nusantara",
							slug: "kerajinan-nusantara",
							domain: "kerajinannusantara.id",
							default_callback_url: "https://kerajinannusantara.id/api/paygate/webhook",
						},
						responseBody: successEnvelope({
							id: "store_01j4w54n6yxt5g0x4x4mb7av38",
							name: "Kerajinan Nusantara",
							slug: "kerajinan-nusantara",
							webhook_secret: "whsec_01j4w8q8x2n9z4u5m7p1s9y6",
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}",
				description: "Update data tenant merchant atau nonaktifkan akses store.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}",
						method: "PATCH",
						summary: "Update profil store",
						description: "Nama, domain, callback URL, dan status aktif bisa diubah dari dashboard.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						pathParams: ["store_id: UUID atau ULID store target"],
						bodyFields: [
							"name: nama baru store",
							"domain: domain merchant terbaru",
							"default_callback_url: endpoint webhook merchant",
							"status: active atau inactive",
						],
						successStatus: "200 OK",
						responseDescription: "Profil store terbaru setelah perubahan diterapkan.",
						requestBody: {
							name: "Kerajinan Nusantara",
							domain: "merchant.kerajinannusantara.id",
							default_callback_url: "https://merchant.kerajinannusantara.id/api/paygate/webhook",
							status: "active",
						},
						responseBody: successEnvelope({
							id: "store_01j4w54n6yxt5g0x4x4mb7av38",
							name: "Kerajinan Nusantara",
							status: "active",
						}),
					}),
					op({
						id: "/v1/dashboard/stores/{store_id}",
						method: "DELETE",
						summary: "Nonaktifkan store",
						description: "Endpoint ini mematikan store agar token lama tidak bisa dipakai lagi.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: UUID atau ULID store target"],
						notes: [
							"Gunakan delete ini untuk deactivation, bukan hard delete data histori.",
						],
						successStatus: "204 No Content",
						responseDescription: "Store dinonaktifkan tanpa response body tambahan.",
						responseBody: null,
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/webhook-secret",
				description: "Melihat secret webhook aktif store secara aman.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/webhook-secret",
						method: "GET",
						summary: "Lihat webhook secret aktif",
						description: "Secret hanya ditampilkan saat operator memang membukanya dari dashboard.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store yang secret-nya ingin dilihat"],
						successStatus: "200 OK",
						responseDescription: "Webhook secret plaintext aktif untuk store terkait.",
						responseBody: successEnvelope({
							store_id: "store_01j4w54n6yxt5g0x4x4mb7av38",
							secret: "whsec_01j4w8q8x2n9z4u5m7p1s9y6",
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/webhook-secret/rotate",
				description: "Rotate webhook secret store dan tampilkan secret baru sekali.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/webhook-secret/rotate",
						method: "POST",
						summary: "Rotate webhook secret",
						description:
							"Setelah rotate sukses, merchant backend harus segera memperbarui secret verifikasi webhook.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store target"],
						successStatus: "200 OK",
						responseDescription: "Secret baru yang langsung aktif menggantikan secret lama.",
						responseBody: successEnvelope({
							store_id: "store_01j4w54n6yxt5g0x4x4mb7av38",
							secret: "whsec_new_01j4w9v1q8m3y6t7n2k4c5p8",
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/api-tokens",
				description: "List token store atau buat token baru untuk tenant tertentu.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/api-tokens",
						method: "GET",
						summary: "List API token store",
						description: "Menampilkan metadata token tanpa membocorkan plaintext token lama.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store target"],
						successStatus: "200 OK",
						responseDescription: "Metadata seluruh token yang pernah dibuat untuk store.",
						responseBody: successEnvelope({
							tokens: [
								{
									id: "token_01j4w9qjx9h1b2r3k4m5n6p7",
									name: "backend-production",
									token_prefix: "sk_store_live_01",
									scopes: ["transaction:create", "transaction:read"],
									revoked_at: null,
								},
							],
						}),
					}),
					op({
						id: "/v1/dashboard/stores/{store_id}/api-tokens",
						method: "POST",
						summary: "Buat API token baru",
						description:
							"Plaintext token hanya keluar sekali pada response ini. Simpan langsung ke secret manager merchant.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: [
							"Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>",
							"Content-Type: application/json",
						],
						pathParams: ["store_id: store target"],
						bodyFields: [
							"name: label token, misalnya backend-production",
							"scopes: daftar scope yang diizinkan",
							"expires_at: opsional, expiry timestamp token",
						],
						successStatus: "201 Created",
						responseDescription: "Metadata token baru plus plaintext token sekali tampil.",
						requestBody: {
							name: "backend-production",
							scopes: ["transaction:create", "transaction:read"],
						},
						responseBody: successEnvelope({
							id: "token_01j4w9qjx9h1b2r3k4m5n6p7",
							name: "backend-production",
							token_prefix: "sk_store_live_01",
							token: storeApiToken,
							scopes: ["transaction:create", "transaction:read"],
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/api-tokens/{token_id}",
				description: "Revoke token tertentu tanpa menghapus histori penggunaannya.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/api-tokens/{token_id}",
						method: "DELETE",
						summary: "Revoke API token",
						description: "Token langsung tidak bisa dipakai lagi setelah revoke sukses.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: [
							"store_id: store target",
							"token_id: token yang ingin dicabut",
						],
						successStatus: "204 No Content",
						responseDescription: "Token dinonaktifkan tanpa response body tambahan.",
						responseBody: null,
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/api-tokens/{token_id}/rotate",
				description: "Membuat token baru sebagai pengganti token lama.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/api-tokens/{token_id}/rotate",
						method: "POST",
						summary: "Rotate API token",
						description:
							"Token lama langsung di-revoke. Response mengandung token baru yang hanya muncul sekali.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: [
							"store_id: store target",
							"token_id: token lama yang ingin diganti",
						],
						successStatus: "200 OK",
						responseDescription: "Metadata token baru dan plaintext token hasil rotate.",
						responseBody: successEnvelope({
							id: "token_01j4wa8k3h5n7m9q2r4s6t8u",
							name: "backend-production",
							token_prefix: "sk_store_live_02",
							token: "sk_store_live_yyyyyyyyyyyyyyyyyyyy",
						}),
					}),
				],
			},
		],
	},
	{
		id: "dashboard-monitoring",
		label: "Monitoring & Webhooks",
		description:
			"Endpoint observability untuk operator: histori transaksi, audit log, delivery webhook, dan resend manual.",
		routes: [
			{
				path: "/v1/dashboard/stores/{store_id}/transactions",
				description: "List transaksi milik store tertentu.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/transactions",
						method: "GET",
						summary: "List transaksi store",
						description: "Dipakai untuk tabel transaksi, filter status, dan pencarian order ID.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store target"],
						queryParams: [
							"limit: jumlah item per halaman",
							"offset: offset pagination",
							"status: filter status transaksi",
							"query: pencarian order ID / platform order ID",
						],
						successStatus: "200 OK",
						responseDescription: "List transaksi yang aman untuk dashboard operator.",
						responseBody: successEnvelope({
							transactions: [
								{
									id: "tx_01j4w5h0r5z9x93s8v0kgq8v2v",
									order_id: "INV-2026-0001",
									status: "paid",
									payment_type: "bank_transfer",
									gross_amount: 150000,
								},
							],
							meta: {
								limit: 50,
								offset: 0,
								has_next: false,
							},
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/transactions/{transaction_id}",
				description: "Detail transaksi lengkap untuk sidebar/detail sheet operator.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/transactions/{transaction_id}",
						method: "GET",
						summary: "Ambil detail transaksi",
						description:
							"Menampilkan callback URL, metadata, status Midtrans, dan timestamp penting untuk troubleshooting.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: [
							"store_id: store target",
							"transaction_id: ID internal transaksi di PayGate",
						],
						successStatus: "200 OK",
						responseDescription: "Objek detail transaksi lengkap.",
						responseBody: successEnvelope({
							id: "tx_01j4w5h0r5z9x93s8v0kgq8v2v",
							order_id: "INV-2026-0001",
							platform_order_id: "store_01_INV-2026-0001",
							status: "paid",
							payment_type: "bank_transfer",
							callback_url: "https://merchant.example.com/paygate/webhook",
							metadata: {
								channel: "instagram",
							},
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/audit-logs",
				description: "List audit log ter-mask untuk store tertentu.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/audit-logs",
						method: "GET",
						summary: "List audit log store",
						description:
							"Request ID, endpoint, status, durasi, dan error message bisa dicari dari dashboard tanpa membuka secret mentah.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store target"],
						queryParams: [
							"limit: jumlah baris yang diambil",
							"offset: pagination offset",
							"request_id: pencarian spesifik request",
						],
						successStatus: "200 OK",
						responseDescription: "List audit log yang sudah dimasking aman.",
						responseBody: successEnvelope({
							logs: [
								{
									request_id: "req_01j4wab4z9k6r8m3n2p1q0t7",
									method: "POST",
									url: "/v1/transactions/charge",
									status_code: 200,
									duration_ms: 187,
								},
							],
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/stores/{store_id}/webhook-deliveries",
				description: "List histori delivery webhook untuk store tertentu.",
				operations: [
					op({
						id: "/v1/dashboard/stores/{store_id}/webhook-deliveries",
						method: "GET",
						summary: "List webhook delivery",
						description:
							"Operator dapat memfilter status retrying, failed permanently, atau success dari halaman Webhook.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["store_id: store target"],
						queryParams: [
							"limit: jumlah delivery per halaman",
							"offset: pagination offset",
							"status: success, retrying, failed_permanently, pending",
							"query: order ID atau callback URL",
						],
						successStatus: "200 OK",
						responseDescription: "List delivery webhook terbaru untuk store terkait.",
						responseBody: successEnvelope({
							deliveries: [
								{
									id: "wd_01j4wafrx2t6m8n1q3r5s7u9",
									order_id: "INV-2026-0001",
									status: "retrying",
									attempt_count: 3,
									callback_url: "https://merchant.example.com/paygate/webhook",
								},
							],
							meta: {
								limit: 50,
								offset: 0,
								has_next: false,
							},
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/webhook-deliveries/{delivery_id}",
				description: "Detail delivery webhook tertentu, termasuk request/response terakhir.",
				operations: [
					op({
						id: "/v1/dashboard/webhook-deliveries/{delivery_id}",
						method: "GET",
						summary: "Ambil detail delivery webhook",
						description:
							"View detail ini membantu operator melihat payload, callback URL, response body, dan error terakhir secara langsung.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["delivery_id: ID internal delivery webhook"],
						successStatus: "200 OK",
						responseDescription: "Objek detail delivery yang siap ditampilkan di sheet detail dashboard.",
						responseBody: successEnvelope({
							id: "wd_01j4wafrx2t6m8n1q3r5s7u9",
							status: "retrying",
							attempt_count: 3,
							last_http_status: 504,
							last_error_message: "upstream timeout",
						}),
					}),
				],
			},
			{
				path: "/v1/dashboard/webhook-deliveries/{delivery_id}/resend",
				description: "Memasukkan ulang delivery webhook yang gagal ke antrean resend.",
				operations: [
					op({
						id: "/v1/dashboard/webhook-deliveries/{delivery_id}/resend",
						method: "POST",
						summary: "Resend manual webhook",
						description:
							"Biasanya dipakai saat merchant sudah memperbaiki endpoint callback dan operator ingin mengirim ulang tanpa menunggu retry otomatis berikutnya.",
						audience: "Frontend dashboard",
						authMode: "dashboard-bearer",
						authLabel: "Dashboard Bearer token",
						requestHeaders: ["Authorization: Bearer <DASHBOARD_ACCESS_TOKEN>"],
						pathParams: ["delivery_id: delivery webhook yang ingin diulang"],
						successStatus: "202 Accepted",
						responseDescription: "Job resend diterima ke antrean worker.",
						responseBody: successEnvelope({
							enqueued: true,
							delivery_id: "wd_01j4wafrx2t6m8n1q3r5s7u9",
						}),
					}),
				],
			},
		],
	},
];
