import expressWebhookReceiver from "$lib/contracts/starter-kits/paygate-webhook-express.js?raw";
import goWebhookReceiver from "$lib/contracts/starter-kits/paygate-webhook-receiver.go?raw";
import phpWebhookReceiver from "$lib/contracts/starter-kits/paygate-webhook-receiver.php?raw";
import rustWebhookReceiver from "$lib/contracts/starter-kits/paygate-webhook-receiver.rs?raw";

export type PaygateStarterKit = {
	label: string;
	filename: string;
	mimeType: string;
	content: string;
	description: string;
	stack: string;
};

export const paygateStarterKits: PaygateStarterKit[] = [
	{
		label: "Express Webhook Receiver",
		filename: "paygate-webhook-express.js",
		mimeType: "application/javascript;charset=utf-8",
		content: expressWebhookReceiver,
		stack: "JavaScript / Node.js",
		description:
			"Endpoint Express yang membaca raw body, memverifikasi timestamp + signature, lalu membalas 200 secepat mungkin.",
	},
	{
		label: "PHP Webhook Receiver",
		filename: "paygate-webhook-receiver.php",
		mimeType: "application/x-httpd-php;charset=utf-8",
		content: phpWebhookReceiver,
		stack: "PHP 8+",
		description:
			"Handler PHP sederhana untuk menerima callback PayGate, memvalidasi HMAC, dan menyinkronkan status order merchant.",
	},
	{
		label: "Go Webhook Receiver",
		filename: "paygate-webhook-receiver.go",
		mimeType: "text/x-go;charset=utf-8",
		content: goWebhookReceiver,
		stack: "Go / net-http",
		description:
			"Contoh net/http tanpa dependency eksternal untuk merchant yang ingin memproses webhook dengan footprint kecil.",
	},
	{
		label: "Rust Webhook Receiver",
		filename: "paygate-webhook-receiver.rs",
		mimeType: "text/rust;charset=utf-8",
		content: rustWebhookReceiver,
		stack: "Rust / Axum",
		description:
			"Starter handler Axum yang memverifikasi signature, menolak timestamp stale, dan menyiapkan titik integrasi ke service order merchant.",
	},
];
