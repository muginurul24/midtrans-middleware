# Midtrans Sandbox Runbook

Dokumen ini untuk menguji charge sungguhan ke Midtrans sandbox lewat platform.

## Tujuan

Runbook ini membuktikan:

- charge store berhasil diteruskan ke Midtrans sandbox
- webhook Midtrans masuk ke platform
- status transaksi lokal ikut berubah
- webhook relay platform ke store berjalan

## 1. Prasyarat

- PostgreSQL dan Redis aktif.
- API, worker, dan dashboard sudah bisa dijalankan.
- `MIDTRANS_SERVER_KEY` sandbox valid.
- Anda punya endpoint HTTPS publik untuk:
  - `POST /v1/webhooks/midtrans` pada platform
  - callback URL store tujuan relay

Contoh env minimum backend:

```env
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxx
MIDTRANS_API_BASE_URL=https://api.sandbox.midtrans.com/v2
MIDTRANS_OVERRIDE_NOTIFICATION_URLS=https://<public-platform-host>/v1/webhooks/midtrans
```

Catatan:

- `MIDTRANS_OVERRIDE_NOTIFICATION_URLS` opsional, tetapi sangat membantu bila sandbox MAP belum dikonfigurasi. Saat env ini diisi, PayGate akan meneruskan header `X-Override-Notification` ke Midtrans agar webhook transaksi tersebut langsung dikirim ke endpoint platform yang sedang diuji.
- Jika Anda tidak memakai env ini, tetap konfigurasi notification URL di dashboard Midtrans seperti langkah 5 di bawah.

## 2. Jalankan Service Lokal

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/migrate up
```

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/api
```

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/worker
```

Dashboard:

```bash
cd dashboard
bun install
bun run build
bun run dev
```

## 3. Siapkan Store dan Token

- Login dashboard.
- Buat store.
- Isi `default_callback_url` dengan endpoint HTTPS store Anda.
- Generate Store API token pada tab `API Tokens`.

Jika butuh contoh curl, pakai dokumen [store-api-end-to-end.md](/home/mugiew/project/payment-platform/docs/store-api-end-to-end.md).

## 4. Kirim Charge ke Platform

Gunakan order baru dan `Idempotency-Key` unik:

```bash
curl -X POST http://localhost:8080/v1/transactions/charge \
  -H "Authorization: Bearer <store_api_token>" \
  -H "Idempotency-Key: INV-2026-0002" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "INV-2026-0002",
    "amount": 150000,
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "bank": "bca",
    "customer": {
      "name": "Budi",
      "email": "budi@example.com",
      "phone": "08123456789"
    },
    "items": [
      {
        "id": "SKU-001",
        "name": "Produk A",
        "price": 150000,
        "quantity": 1
      }
    ]
  }'
```

Verifikasi response:

- `success=true`
- `data.transaction_id` terisi
- `data.platform_order_id` terisi
- `data.status=pending`
- `data.midtrans.va_numbers` atau field VA lain terisi sesuai metode pembayaran

## 5. Konfigurasi Midtrans Notification

Set notification URL sandbox ke endpoint platform:

```text
https://<public-platform-host>/v1/webhooks/midtrans
```

Pastikan URL publik ini benar-benar mengarah ke API platform yang sedang diuji.

## 6. Picu Pembayaran Sandbox

- Selesaikan pembayaran lewat VA sandbox atau tools yang Anda pakai untuk metode bank terkait.
- Tunggu Midtrans mengirim webhook `settlement` atau `capture`.

## 7. Verifikasi Status Lokal

Query status transaksi dari Store API:

```bash
curl http://localhost:8080/v1/transactions/INV-2026-0002 \
  -H "Authorization: Bearer <store_api_token>"
```

Ekspektasi:

- `data.status` berubah dari `pending` menjadi `paid`
- `data.paid_at` terisi
- `data.midtrans_transaction_id` tetap terasosiasi

## 8. Verifikasi Webhook Relay ke Store

Pada dashboard:

- buka tab `Webhooks`
- pastikan delivery untuk order terkait muncul
- pastikan `status=success` atau setidaknya `retrying` jika endpoint store Anda masih gagal

Store Anda harus menerima request:

```text
POST <callback_url>
X-Webhook-Id: <delivery_id>
X-Webhook-Timestamp: <unix_timestamp>
X-Webhook-Signature: sha256=<signature>
```

Verifikasi signature:

```text
signature = hex(
  hmac_sha256(
    key = webhook_secret_store,
    message = X-Webhook-Timestamp + "." + raw_request_body
  )
)
```

## 9. Verifikasi Observability

Healthcheck:

```bash
curl http://localhost:8080/healthz
```

API metrics:

```bash
curl http://localhost:8080/metrics | rg 'payment_platform_(charge_requests_total|webhook_inbound_total|queue_depth)'
```

Worker metrics:

```bash
curl http://localhost:9091/metrics | rg 'payment_platform_webhook_(deliveries_total|retries_total)'
```

Request log yang perlu terlihat di API:

- `request_id`
- `store_id`
- `transaction_id`
- `order_id`
- `endpoint`
- `status_code`
- `duration_ms`
- `error`

## 10. Troubleshooting Cepat

- `MIDTRANS_ERROR`: cek `MIDTRANS_SERVER_KEY`, base URL, dan akses internet backend.
- `WEBHOOK_SIGNATURE_INVALID`: cek notification URL Midtrans menuju platform yang benar dan payload tidak diubah proxy.
- `failed_permanently` pada webhook delivery: cek callback URL store, signature verification, dan response non-2xx.
- `RATE_LIMITED`: cek pola retry client dan distribusi token/store.
