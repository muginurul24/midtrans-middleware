export type DashboardStore = {
	id: string;
	label: string;
	domain: string;
	callback: string;
	status: "active" | "inactive";
};

export type DashboardMetric = {
	label: string;
	value: string;
	delta: string;
	trend: "up" | "down" | "neutral";
	helper: string;
	tone: "default" | "emerald" | "blue" | "orange";
};

export type DashboardTransaction = {
	orderId: string;
	store: string;
	amount: number;
	method: string;
	type: string;
	status: "paid" | "pending" | "failed" | "expired" | "cancelled" | "challenge";
	time: string;
	platformOrderId: string;
	customer: string;
	email: string;
	idempotencyKey: string;
};

export type DashboardWebhookDelivery = {
	id: string;
	orderId: string;
	store: string;
	status: "success" | "retrying" | "failed_permanently";
	attempt: number;
	time: string;
	statusCode: number;
};

export const developerChargeRequest = `{
  "order_id": "INV-2026-0001",
  "amount": 150000,
  "currency": "IDR",
  "payment_type": "bank_transfer",
  "bank": "bca",
  "customer": {
    "name": "Budi",
    "email": "budi@example.com"
  }
}`;

export const developerChargeResponse = `{
  "success": true,
  "data": {
    "order_id": "INV-2026-0001",
    "status": "pending",
    "amount": 150000,
    "midtrans": {
      "va_numbers": [
        {
          "bank": "bca",
          "va_number": "88001234567890"
        }
      ]
    }
  }
}`;

export const contactFaqs = [
	{
		question: "Apakah PayGate gratis?",
		answer:
			"Ya, PayGate gratis untuk MVP. Model harga final belum ditetapkan karena fokus saat ini adalah stabilitas alur transaksi, dashboard, dan webhook relay.",
	},
	{
		question: "Apakah credential Midtrans saya aman?",
		answer:
			"Server Key Midtrans hanya disimpan di environment server platform. Toko Anda memakai API token PayGate yang di-hash, sehingga credential inti tidak pernah dibawa ke frontend atau callback toko.",
	},
	{
		question: "Bagaimana jika webhook ke toko saya gagal?",
		answer:
			"Platform akan retry otomatis setiap 20 detik sampai 10 kali. Semua attempt dicatat. Jika tetap gagal, status berubah menjadi failed permanently dan operator bisa melakukan resend manual dari dashboard.",
	},
	{
		question: "Bisakah saya menggunakan PayGate tanpa backend toko?",
		answer:
			"Untuk MVP saat ini, integrasi tetap diasumsikan server-to-server karena token store harus dipakai aman di backend. Public checkout dan payment link ada di roadmap berikutnya.",
	},
	{
		question: "Apakah PayGate siap untuk production?",
		answer:
			"Secara arsitektur iya, selama environment production, HTTPS callback, timeout, dan secret rotation sudah disiapkan. Dashboard saat ini masih memakai data demo untuk kebutuhan implementasi frontend.",
	},
	{
		question: "Berapa latensi tambahan yang diperkenalkan PayGate?",
		answer:
			"Target produk tetap di bawah 200ms untuk lapisan proxy, sudah termasuk validasi token, mapping payload, dan audit insertion pada jalur normal.",
	},
	{
		question: "Apakah satu akun bisa mengelola banyak toko?",
		answer:
			"Ya. Setiap toko memiliki token, callback URL, dan data transaksi yang terisolasi. Dashboard hanya memperlihatkan data sesuai konteks tenant yang dipilih.",
	},
	{
		question: "Bagaimana cara memverifikasi webhook dari PayGate?",
		answer:
			"Setiap webhook keluar menggunakan signature HMAC-SHA256 dengan secret per toko. Secret tersebut dapat dilihat atau di-rotate dari pengaturan store di dashboard.",
	},
];

export const privacySections = [
	{
		id: "pendahuluan",
		title: "1. Pendahuluan",
		paragraphs: [
			"PayGate adalah middleware pembayaran multi-tenant yang bertindak sebagai lapisan aman antara backend toko dan Midtrans Core API. Kebijakan ini menjelaskan data apa yang diproses, alasan pemrosesan, dan bagaimana data tersebut dijaga.",
			"Dengan menggunakan dashboard atau API PayGate, Anda memahami bahwa data transaksi, audit, dan webhook akan dicatat untuk tujuan operasional, keamanan, dan troubleshooting.",
		],
	},
	{
		id: "data-dikumpulkan",
		title: "2. Data yang Kami Kumpulkan",
		paragraphs: [
			"Untuk akun dashboard kami menyimpan nama, email, dan password yang sudah di-hash. Untuk store kami menyimpan nama, slug, callback URL, status store, webhook secret yang di-hash, dan metadata operasional yang dibutuhkan.",
			"Untuk API token kami hanya menyimpan hash, prefix, scope, dan informasi penggunaan terakhir. Token plaintext hanya ditampilkan sekali saat dibuat atau di-rotate.",
		],
	},
	{
		id: "penggunaan-data",
		title: "3. Penggunaan Data",
		paragraphs: [
			"Data dipakai untuk memproses charge transaction, memvalidasi token, meneruskan webhook, menampilkan dashboard, dan menghasilkan audit trail yang dapat ditelusuri.",
			"PayGate tidak menjual data pengguna, tidak memakai data transaksi untuk iklan, dan tidak membuka data antar tenant.",
		],
	},
	{
		id: "data-transaksi",
		title: "4. Data Transaksi dan Webhook",
		paragraphs: [
			"PayGate menyimpan order ID toko, platform order ID, nominal, payment type, customer payload yang dikirim store, status transaksi, dan timestamp yang relevan.",
			"Webhook inbound dari Midtrans dan delivery outbound ke callback toko juga disimpan bersama status code, durasi, dan error message untuk setiap attempt.",
		],
	},
	{
		id: "audit-log",
		title: "5. Audit Log dan Masking",
		paragraphs: [
			"Semua aktivitas penting dicatat ke audit log, tetapi field sensitif seperti Authorization, Server Key, webhook secret, password, dan token otomatis dimasking sebelum disimpan.",
			"Setiap event diikat oleh request ID agar investigasi dari request awal sampai webhook delivery dapat dilakukan tanpa membuka credential mentah.",
		],
	},
	{
		id: "keamanan",
		title: "6. Keamanan Data",
		paragraphs: [
			"Platform menerapkan hashing secret, timeout HTTP, limit payload, rate limiting Redis, verifikasi signature Midtrans, dan isolasi store pada query dashboard maupun store-facing API.",
			"Semua endpoint production harus berjalan melalui HTTPS, dan secret penting harus ditempatkan pada environment atau secret manager server.",
		],
	},
	{
		id: "pihak-ketiga",
		title: "7. Pihak Ketiga",
		paragraphs: [
			"Midtrans memproses data pembayaran inti sesuai kebijakan mereka sendiri. PayGate hanya meneruskan subset payload yang dibutuhkan untuk charge dan rekonsiliasi status.",
			"Infrastruktur cloud, managed database, atau managed Redis dapat dipakai pada production selama memenuhi kebutuhan enkripsi dan kontrol akses.",
		],
	},
	{
		id: "penyimpanan",
		title: "8. Penyimpanan dan Retensi",
		paragraphs: [
			"PostgreSQL menjadi source of truth untuk akun, store, token, transaksi, audit log, dan webhook delivery. Redis hanya menyimpan cache dan data sementara seperti rate limit dan idempotency lock.",
			"Retensi permanen terutama berlaku untuk audit trail dan histori transaksi sampai kebijakan purge resmi ditetapkan.",
		],
	},
	{
		id: "hak-pengguna",
		title: "9. Hak Pengguna",
		paragraphs: [
			"Pengguna dashboard dapat memperbarui profil, mengganti password, revoke token, rotate secret, dan menonaktifkan store. Permintaan ekspor data atau penghapusan dapat diajukan melalui kontak resmi.",
		],
	},
	{
		id: "perubahan",
		title: "10. Perubahan Kebijakan",
		paragraphs: [
			"Kebijakan privasi dapat diperbarui untuk menyesuaikan evolusi produk atau kebutuhan legal. Perubahan signifikan akan diumumkan melalui dashboard atau email operasional.",
		],
	},
	{
		id: "kontak-privacy",
		title: "11. Kontak",
		paragraphs: [
			"Untuk pertanyaan terkait privasi, retensi data, atau permintaan akses data, silakan hubungi privacy@paygate.id. Target respons operasional adalah 14 hari kerja.",
		],
	},
];

export const dashboardStores: DashboardStore[] = [
	{
		id: "store1",
		label: "Toko Baju Online",
		domain: "tokobaju.id",
		callback: "https://tokobaju.id/api/paygate/webhook",
		status: "active",
	},
	{
		id: "store2",
		label: "Warung Digital",
		domain: "warungdigital.id",
		callback: "https://warungdigital.id/payments/webhook",
		status: "active",
	},
	{
		id: "store3",
		label: "Kerajinan Nusantara",
		domain: "kerajinannusantara.id",
		callback: "https://kerajinannusantara.id/webhook/paygate",
		status: "inactive",
	},
];

export const dashboardMetrics: DashboardMetric[] = [
	{
		label: "Total Transaksi",
		value: "1,247",
		delta: "+12.5%",
		trend: "up",
		helper: "dibanding 7 hari lalu",
		tone: "default",
	},
	{
		label: "Revenue",
		value: "Rp 187,4jt",
		delta: "+8.2%",
		trend: "up",
		helper: "gross amount semua store",
		tone: "emerald",
	},
	{
		label: "Success Rate",
		value: "94.2%",
		delta: "-1.1%",
		trend: "down",
		helper: "settlement dan capture berhasil",
		tone: "blue",
	},
	{
		label: "Webhook Gagal",
		value: "3",
		delta: "2 retrying",
		trend: "neutral",
		helper: "delivery perlu perhatian",
		tone: "orange",
	},
];

export const dashboardVolume = [
	{ day: "Sen", total: 180, success: 168 },
	{ day: "Sel", total: 195, success: 182 },
	{ day: "Rab", total: 210, success: 198 },
	{ day: "Kam", total: 165, success: 155 },
	{ day: "Jum", total: 220, success: 205 },
	{ day: "Sab", total: 145, success: 138 },
	{ day: "Min", total: 132, success: 126 },
];

export const dashboardPaymentMix = [
	{ name: "Bank Transfer", value: 42, color: "var(--foreground)" },
	{ name: "E-Wallet", value: 31, color: "#3E6B4E" },
	{ name: "QRIS", value: 18, color: "#78716C" },
	{ name: "Lainnya", value: 9, color: "#C0562F" },
];

export const dashboardTransactions: DashboardTransaction[] = [
	{
		orderId: "INV-2026-0247",
		store: "Toko Baju Online",
		amount: 350000,
		method: "Bank BCA",
		type: "bank_transfer",
		status: "paid",
		time: "2 menit lalu",
		platformOrderId: "store101_INV-2026-0247",
		customer: "Sari Dewi",
		email: "sari@email.com",
		idempotencyKey: "idem_abc123",
	},
	{
		orderId: "INV-2026-0246",
		store: "Warung Digital",
		amount: 125000,
		method: "GoPay",
		type: "gopay",
		status: "pending",
		time: "8 menit lalu",
		platformOrderId: "store102_INV-2026-0246",
		customer: "Budi Santoso",
		email: "budi@email.com",
		idempotencyKey: "idem_def456",
	},
	{
		orderId: "INV-2026-0245",
		store: "Kerajinan Nusantara",
		amount: 750000,
		method: "Bank Mandiri",
		type: "bank_transfer",
		status: "paid",
		time: "15 menit lalu",
		platformOrderId: "store103_INV-2026-0245",
		customer: "Lisa Andriani",
		email: "lisa@email.com",
		idempotencyKey: "idem_ghi789",
	},
	{
		orderId: "INV-2026-0244",
		store: "Toko Baju Online",
		amount: 89000,
		method: "QRIS",
		type: "qris",
		status: "failed",
		time: "22 menit lalu",
		platformOrderId: "store101_INV-2026-0244",
		customer: "Riko Pratama",
		email: "riko@email.com",
		idempotencyKey: "idem_jkl012",
	},
	{
		orderId: "INV-2026-0243",
		store: "Warung Digital",
		amount: 420000,
		method: "DANA",
		type: "ewallet",
		status: "paid",
		time: "31 menit lalu",
		platformOrderId: "store102_INV-2026-0243",
		customer: "Maya Putri",
		email: "maya@email.com",
		idempotencyKey: "idem_mno345",
	},
	{
		orderId: "INV-2026-0242",
		store: "Kerajinan Nusantara",
		amount: 230000,
		method: "Bank BNI",
		type: "bank_transfer",
		status: "expired",
		time: "45 menit lalu",
		platformOrderId: "store103_INV-2026-0242",
		customer: "Doni Saputra",
		email: "doni@email.com",
		idempotencyKey: "idem_pqr678",
	},
	{
		orderId: "INV-2026-0241",
		store: "Toko Baju Online",
		amount: 175000,
		method: "OVO",
		type: "ewallet",
		status: "paid",
		time: "1 jam lalu",
		platformOrderId: "store101_INV-2026-0241",
		customer: "Anita Sari",
		email: "anita@email.com",
		idempotencyKey: "idem_stu901",
	},
	{
		orderId: "INV-2026-0240",
		store: "Warung Digital",
		amount: 560000,
		method: "Bank BCA",
		type: "bank_transfer",
		status: "challenge",
		time: "1 jam lalu",
		platformOrderId: "store102_INV-2026-0240",
		customer: "Fajar Nugroho",
		email: "fajar@email.com",
		idempotencyKey: "idem_vwx234",
	},
	{
		orderId: "INV-2026-0239",
		store: "Kerajinan Nusantara",
		amount: 98000,
		method: "ShopeePay",
		type: "ewallet",
		status: "paid",
		time: "2 jam lalu",
		platformOrderId: "store103_INV-2026-0239",
		customer: "Rina Wati",
		email: "rina@email.com",
		idempotencyKey: "idem_yza567",
	},
	{
		orderId: "INV-2026-0238",
		store: "Toko Baju Online",
		amount: 310000,
		method: "QRIS",
		type: "qris",
		status: "cancelled",
		time: "2 jam lalu",
		platformOrderId: "store101_INV-2026-0238",
		customer: "Hendra Kusuma",
		email: "hendra@email.com",
		idempotencyKey: "idem_bcd890",
	},
];

export const dashboardWebhookDeliveries: DashboardWebhookDelivery[] = [
	{
		id: "wh_001",
		orderId: "INV-2026-0247",
		store: "Toko Baju Online",
		status: "success",
		attempt: 1,
		time: "2 menit lalu",
		statusCode: 200,
	},
	{
		id: "wh_002",
		orderId: "INV-2026-0245",
		store: "Kerajinan Nusantara",
		status: "success",
		attempt: 1,
		time: "15 menit lalu",
		statusCode: 200,
	},
	{
		id: "wh_003",
		orderId: "INV-2026-0243",
		store: "Warung Digital",
		status: "success",
		attempt: 3,
		time: "31 menit lalu",
		statusCode: 200,
	},
	{
		id: "wh_004",
		orderId: "INV-2026-0241",
		store: "Toko Baju Online",
		status: "success",
		attempt: 1,
		time: "1 jam lalu",
		statusCode: 200,
	},
	{
		id: "wh_005",
		orderId: "INV-2026-0244",
		store: "Toko Baju Online",
		status: "failed_permanently",
		attempt: 10,
		time: "22 menit lalu",
		statusCode: 0,
	},
	{
		id: "wh_006",
		orderId: "INV-2026-0239",
		store: "Kerajinan Nusantara",
		status: "failed_permanently",
		attempt: 10,
		time: "2 jam lalu",
		statusCode: 502,
	},
	{
		id: "wh_007",
		orderId: "INV-2026-0246",
		store: "Warung Digital",
		status: "retrying",
		attempt: 4,
		time: "8 menit lalu",
		statusCode: 504,
	},
	{
		id: "wh_008",
		orderId: "INV-2026-0238",
		store: "Toko Baju Online",
		status: "failed_permanently",
		attempt: 10,
		time: "2 jam lalu",
		statusCode: 0,
	},
];
