export const dashboardTabMeta = {
	overview: {
		label: "Overview",
		heading: "Overview",
		description:
			"Ringkasan transaksi, delivery webhook, dan operasional store dalam satu layar.",
		title: "PayGate — Dashboard",
	},
	profile: {
		label: "Profil & Sesi",
		heading: "Profil & Sesi",
		description:
			"Pantau identitas akun aktif, kekuatan sesi, MFA, dan ganti password tanpa keluar dari dashboard.",
		title: "Profil & Sesi — PayGate",
	},
	stores: {
		label: "Toko",
		heading: "Store & Token",
		description:
			"Kelola tenant merchant, webhook secret, dan API token tanpa keluar dari dashboard.",
		title: "Store & Token — PayGate",
	},
	transactions: {
		label: "Transaksi",
		heading: "Transaksi",
		description:
			"Tinjau histori charge dan detail transaksi yang diteruskan ke Midtrans.",
		title: "Transaksi — PayGate",
	},
	audit: {
		label: "Audit Log",
		heading: "Audit Log",
		description:
			"Periksa jejak request, response, dan error yang sudah dimasking aman.",
		title: "Audit Log — PayGate",
	},
	webhooks: {
		label: "Webhook",
		heading: "Webhook Delivery",
		description:
			"Pantau status relay webhook, payload, dan retry untuk setiap store.",
		title: "Webhook Delivery — PayGate",
	},
	docs: {
		label: "Dokumentasi",
		heading: "Dokumentasi Integrasi Toko",
		description:
			"Endpoint, payload, dan contoh request yang benar-benar dipakai backend toko Anda.",
		title: "Dokumentasi Integrasi Toko — PayGate",
	},
} as const;

export type DashboardTab = keyof typeof dashboardTabMeta;

export function isDashboardTab(value: string | undefined): value is DashboardTab {
	return Boolean(value && value in dashboardTabMeta);
}

export function resolveDashboardTab(value: string | undefined): DashboardTab {
	return isDashboardTab(value) ? value : "overview";
}
