# VPS Release Sign-off - 2026-05-03

Dokumen ini merangkum audit release sign-off konkret untuk environment VPS internal `payment-platform` setelah tunnel `paygate.digixsolution.net` aktif dan verifikasi Midtrans sandbox nyata lulus.

Update terbaru pada `2026-05-03` setelah audit awal:

- env runtime VPS sudah diselaraskan dengan `.env` lokal untuk:
  - `MIDTRANS_ENV=production`
  - `MIDTRANS_API_BASE_URL=https://api.midtrans.com/v2`
  - `MIDTRANS_OVERRIDE_NOTIFICATION_URLS=` kosong
  - `MIDTRANS_SERVER_KEY` production
  - `MIDTRANS_CLIENT_KEY` production
- service yang direstart hanya `paygate-api.service`
- belum ada live charge production yang sengaja dijalankan sebagai bagian dari turn ini

## Scope

- host publik: `https://paygate.digixsolution.net`
- server: `ip.atlantic-server.com:38053`
- API service: `paygate-api.service`
- worker service: `paygate-worker.service`
- tunnel service: `cloudflared-paygate.service`
- commit source di VPS saat audit: `48c8adff26f75945d982690f9887aceca0471888`
- catatan penting: worktree VPS belum clean saat audit karena patch Midtrans override notification dan dokumentasi belum di-commit

## Summary Status

- `conditional pass` untuk env wajib dan flow Midtrans sandbox nyata
- `pass` untuk MFA production gate, callback URL policy, dan hardening exposure edge dasar
- `pending manual` untuk governance secret management dan release artifact final

## Checklist Audit

### 1. Production Env Wajib

Status: `conditional pass`

Bukti:

- `APP_ENV=production`
- `APP_PORT=18080`
- `DASHBOARD_ALLOWED_ORIGINS=https://paygate.digixsolution.net`
- `REDIS_ADDR=localhost:6379`
- `WORKER_METRICS_PORT=19091`
- secret wajib terdeteksi terpasang pada process env API:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `TOKEN_PEPPER`
  - `MFA_ENCRYPTION_KEY`
  - `WEBHOOK_SIGNING_PEPPER`
  - `MIDTRANS_SERVER_KEY`
- env Midtrans aktif pada audit sandbox awal:
  - `MIDTRANS_ENV=sandbox`
  - `MIDTRANS_API_BASE_URL=https://api.sandbox.midtrans.com/v2`
  - `MIDTRANS_OVERRIDE_NOTIFICATION_URLS=https://paygate.digixsolution.net/v1/webhooks/midtrans`
- env Midtrans aktif setelah sinkronisasi production:
  - `MIDTRANS_ENV=production`
  - `MIDTRANS_API_BASE_URL=https://api.midtrans.com/v2`
  - `MIDTRANS_OVERRIDE_NOTIFICATION_URLS=` kosong

Catatan:

- env sekarang sudah production, tetapi sign-off production final tetap menunggu verifikasi live transaction yang disengaja dan review operasional terakhir

### 2. Secret Management

Status: `pending manual`

Yang belum bisa dibuktikan hanya dari audit runtime:

- secret disimpan di secret manager atau deployment system yang benar, bukan hanya file server
- akses operator ke secret sudah dibatasi
- rotation plan formal untuk:
  - JWT secrets
  - `TOKEN_PEPPER`
  - `WEBHOOK_SIGNING_PEPPER`
  - `MIDTRANS_SERVER_KEY`

### 3. HTTPS dan Exposure

Status: `pass`

Bukti yang lolos:

- `https://paygate.digixsolution.net/` tetap bisa diakses lewat HTTPS untuk route API utama
- `GET https://paygate.digixsolution.net/metrics` sekarang menghasilkan `404` di edge Cloudflare Tunnel
- `GET https://paygate.digixsolution.net/healthz` sekarang juga menghasilkan `404` di edge Cloudflare Tunnel
- direct port internal seperti `:18080` dan `:19091` tidak bisa diakses dari internet publik saat diuji dari luar server
- worker metrics tetap berada di port internal `19091`

Catatan:

- checklist internal menyatakan metrics API dan worker tidak boleh diekspos bebas ke internet publik; kondisi ini sekarang sudah dipenuhi untuk hostname publik utama
- `GET /healthz` sengaja ikut diblok di edge, jadi monitoring operasional harus memakai jalur internal/server-side, bukan hostname publik

### 4. Callback URL Policy

Status: `pass`

SQL audit yang dijalankan:

```sql
SELECT id || '|' || slug || '|' || coalesce(default_callback_url, '')
FROM stores
WHERE default_callback_url IS NOT NULL
  AND default_callback_url <> ''
  AND default_callback_url NOT LIKE 'https://%';
```

Hasil:

- kosong, tidak ada store aktif dengan callback non-HTTPS yang tersimpan saat audit

### 5. MFA Production Check

Status: `pass`

Bukti:

- user uji baru mendapat state MFA `required=true`, `enabled=false`, `can_access_dashboard=false`
- percobaan `POST /v1/dashboard/stores` sebelum MFA menghasilkan `403` dengan kode `MFA_SETUP_REQUIRED`
- setelah `POST /v1/dashboard/auth/mfa/setup` dan `POST /v1/dashboard/auth/mfa/verify`, request create store yang sama berhasil `201`

### 6. Release Sign-off Operasional

Status: `conditional pass`

Bukti build:

- lokal: `cd backend && go test ./internal/integration/midtrans ./internal/config ./cmd/api`
- lokal: `cd backend && go build ./...`

Bukti E2E Midtrans sandbox nyata:

- hostname publik PayGate aktif lewat tunnel khusus `cloudflared-paygate`
- charge nyata sukses untuk:
  - `order_id`: `INV-E2E2-1777801580`
  - `platform_order_id`: `agent-midtrans-e2e2-1777801580_INV-E2E2-1777801580`
  - `transaction_id`: `2e3cd987-0eed-4d6f-9acf-9d448b5dd994`
  - `midtrans_transaction_id`: `1e78c079-a6e3-4ac8-96c9-7f158902d3cc`
- simulator BCA VA Midtrans menyelesaikan pembayaran untuk VA `40291605754720141125068`
- status transaksi lokal berubah dari `pending` menjadi `paid`
- API production mencatat inbound `POST /v1/webhooks/midtrans` sukses pada `2026-05-03 17:46:22 +08:00` dan `2026-05-03 17:46:33 +08:00`
- callback store sementara menerima relay `pending` lalu `paid`, keduanya bertanda tangan `X-Webhook-Signature`
- collector callback sementara di port `19090` sudah dimatikan kembali setelah tes

Catatan:

- override notification Midtrans saat ini bergantung pada env `MIDTRANS_OVERRIDE_NOTIFICATION_URLS`
- worktree VPS belum clean, jadi release artifact final seperti commit SHA rilis belum bisa dianggap final
- sesudah env diselaraskan ke production, route publik utama tetap hidup dan hardening edge untuk `/metrics` serta `/healthz` tetap bertahan

## Action Items Sebelum Go-live Internal yang Lebih Permanen

1. Commit dan push perubahan repo, lalu pastikan VPS menarik commit final yang sama agar artifact release punya SHA yang tegas.
2. Pastikan monitoring operasional memakai jalur internal karena `/healthz` dan `/metrics` publik sekarang diblok di edge.
3. Tentukan apakah `MIDTRANS_OVERRIDE_NOTIFICATION_URLS` hanya dipakai di sandbox internal atau tetap dipertahankan pada environment berikutnya.
4. Lakukan verifikasi production live yang terkontrol hanya jika operator sudah siap menerima transaksi nyata, karena env Midtrans pada VPS sekarang sudah mengarah ke production.
