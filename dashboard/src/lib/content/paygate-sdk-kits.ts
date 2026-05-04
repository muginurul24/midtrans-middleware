import goClient from "$lib/contracts/sdk-kits/paygate-client.go?raw";
import javascriptClient from "$lib/contracts/sdk-kits/paygate-client.js?raw";
import phpClient from "$lib/contracts/sdk-kits/paygate-client.php?raw";
import rustClient from "$lib/contracts/sdk-kits/paygate-client.rs?raw";

export type PaygateSDKKit = {
	label: string;
	filename: string;
	mimeType: string;
	content: string;
	description: string;
	stack: string;
};

export const paygateSDKKits: PaygateSDKKit[] = [
	{
		label: "Node.js Merchant Client",
		filename: "paygate-client.js",
		mimeType: "application/javascript;charset=utf-8",
		content: javascriptClient,
		stack: "JavaScript / Node.js",
		description:
			"Client ringan berbasis fetch untuk charge, cek status transaksi, audit logs, dan verifikasi webhook di backend merchant.",
	},
	{
		label: "PHP Merchant Client",
		filename: "paygate-client.php",
		mimeType: "application/x-httpd-php;charset=utf-8",
		content: phpClient,
		stack: "PHP 8+",
		description:
			"Wrapper kecil berbasis cURL untuk tim PHP yang ingin mulai integrasi tanpa menulis request envelope PayGate dari nol.",
	},
	{
		label: "Go Merchant Client",
		filename: "paygate-client.go",
		mimeType: "text/x-go;charset=utf-8",
		content: goClient,
		stack: "Go / stdlib",
		description:
			"Client Go tanpa dependency eksternal untuk charge, polling transaksi, audit logs, dan helper verifikasi webhook.",
	},
	{
		label: "Rust Merchant Client",
		filename: "paygate-client.rs",
		mimeType: "text/rust;charset=utf-8",
		content: rustClient,
		stack: "Rust / reqwest",
		description:
			"Starter client Rust async dengan metode inti Store API dan helper validasi signature callback PayGate.",
	},
];
