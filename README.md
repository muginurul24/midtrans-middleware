# Payment Platform

Multi-tenant payment middleware berbasis Go untuk meneruskan transaksi toko ke Midtrans Core API, lengkap dengan dashboard React/Vite, audit log, webhook relay, retry worker, dan MFA Google Authenticator.

## Status

Milestone yang sudah hidup:

- Milestone 1: foundation API, worker, Postgres, Redis, healthcheck
- Milestone 2: auth dashboard, store CRUD, store API token, rate limit
- Milestone 3: charge transaction ke Midtrans Core API + idempotency
- Milestone 4: inbound Midtrans webhook + status mapping + `transaction_events`
- Milestone 5: webhook delivery worker + retry + resend manual
- Milestone 6: dashboard MVP + MFA Google Authenticator + recovery codes

Observability baseline yang sudah hidup:

- `GET /healthz` untuk healthcheck dependency
- `GET /metrics` pada API untuk Prometheus metrics charge, webhook inbound, rate limit, database/redis error, dan queue depth
- worker metrics server pada `WORKER_METRICS_PORT` default `9091`
- structured request logging dengan `request_id`, `store_id`, `transaction_id`, `order_id`, `endpoint`, `method`, `status_code`, `duration_ms`, dan `error`

Dokumen developer yang tersedia:

- End-to-end Store API curl: [docs/store-api-end-to-end.md](/home/mugiew/project/payment-platform/docs/store-api-end-to-end.md)
- Runbook Midtrans sandbox: [docs/midtrans-sandbox-runbook.md](/home/mugiew/project/payment-platform/docs/midtrans-sandbox-runbook.md)
- Checklist release internal: [docs/internal-release-checklist.md](/home/mugiew/project/payment-platform/docs/internal-release-checklist.md)

## Production Readiness Check

Untuk satu command verifikasi readiness lokal sebelum deploy internal:

```bash
./scripts/production_readiness.sh
```

Script ini menjalankan:

- `cd backend && go test ./...`
- `cd backend && go build ./...`
- `cd dashboard && pnpm lint`
- `cd dashboard && pnpm build`
- `./scripts/operational_smoke.sh`

## Prasyarat

- Go `1.26+`
- Node `24+`
- `pnpm`
- PostgreSQL `16+`
- Redis `7+`

## Struktur Repo

```text
payment-platform/
  backend/
  dashboard/
  docker-compose.yml
  PRD.md
```

## Jalankan Secara Lokal

1. Siapkan Postgres dan Redis.
2. Salin env example backend dan dashboard.
3. Jalankan migration.
4. Jalankan API, worker, lalu dashboard.

Backend env:

```bash
cd backend
cp .env.example .env
```

Dashboard env:

```bash
cd dashboard
cp .env.example .env
```

Apply migration:

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/migrate up
```

Jalankan API:

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/api
```

Jalankan worker:

```bash
cd backend
set -a
source .env
set +a
go run ./cmd/worker
```

Jalankan dashboard:

```bash
cd dashboard
pnpm install
pnpm dev
```

Endpoint lokal default:

- API: `http://localhost:8080`
- Dashboard: `http://localhost:5173`
- Healthcheck: `GET http://localhost:8080/healthz`
- API Metrics: `GET http://localhost:8080/metrics`
- Worker Metrics: `GET http://localhost:9091/metrics`

## Operational Smoke Lokal

Gunakan smoke ini untuk membuktikan alur lokal inti tanpa Midtrans eksternal:

```bash
./scripts/operational_smoke.sh
```

Smoke script akan:

- build dashboard
- membuat schema PostgreSQL temporer agar tidak bentrok dengan data lokal aktif
- menjalankan mock Midtrans dan mock callback collector
- apply migration pada schema temporer
- menyalakan API dan worker
- memverifikasi auth lifecycle dashboard: register, `GET /me`, refresh, logout, login ulang, ganti password
- membuat store, edit store, lihat/rotate webhook secret, buat token, rotate token, revoke token, dan nonaktifkan store kedua
- mengirim `POST /v1/transactions/charge`, replay payload yang sama, lalu menguji conflict pada payload berbeda
- mengirim webhook Midtrans lokal invalid lalu valid ke `POST /v1/webhooks/midtrans`
- menunggu webhook relay sukses sampai callback server menerima payload bertanda tangan
- memaksa satu delivery menjadi `failed_permanently`, lalu memverifikasi manual resend berhasil
- memverifikasi isolasi tenant dengan user/store kedua yang tidak boleh membaca store dan transaksi tenant pertama
- memverifikasi counter metrics API dan worker ikut bergerak

Prasyarat smoke script:

- `backend/.env` sudah ada dan mengarah ke PostgreSQL serta Redis lokal yang aktif
- `go`, `pnpm`, `curl`, `jq`, `psql`, `rg`, dan `sha512sum` tersedia di shell

Output sukses akan berupa JSON ringkas berisi `store_id`, `second_store_id`, `transaction_id`, `delivery_id`, `order_id`, `platform_order_id`, status awal/akhir transaksi, status relay, jumlah callback yang diterima, dan blok `checks` untuk acceptance smoke utama.

## Jalankan Dengan Docker Compose

Stack Compose sekarang sudah punya urutan start yang benar:

- `postgres`
- `redis`
- `migrate`
- `api`
- `worker`
- `dashboard`

Jalankan:

```bash
docker compose up --build
```

Compose akan:

- menunggu Postgres sehat
- apply semua migration lewat service `migrate`
- baru menyalakan API dan worker
- menjalankan dashboard Vite dengan `pnpm`

## Midtrans Sandbox

Untuk tes nyata ke Midtrans sandbox, isi minimal env backend berikut:

```env
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=Mid-server-...
MIDTRANS_API_BASE_URL=https://api.sandbox.midtrans.com/v2
MIDTRANS_OVERRIDE_NOTIFICATION_URLS=https://paygate.example.com/v1/webhooks/midtrans
```

Catatan:

- `MIDTRANS_SERVER_KEY` tidak wajib di development jika Anda belum menguji charge sungguhan.
- `MIDTRANS_OVERRIDE_NOTIFICATION_URLS` bersifat opsional. Jika diisi, backend akan mengirim header `X-Override-Notification` ke Midtrans untuk memaksa notification URL transaksi tertentu, berguna saat sandbox belum dikonfigurasi di dashboard Midtrans.
- `./scripts/operational_smoke.sh` tidak memakai Midtrans sandbox sungguhan; script itu menjalankan mock Midtrans lokal.
- Dashboard MFA wajib sebelum akses dashboard penuh jika `APP_ENV=production`.
- Jika build dashboard tersedia di `dashboard/dist`, API akan otomatis melayani dashboard production pada origin yang sama dengan route `/v1/*`. Override path asset ini bisa dipaksa lewat env opsional `DASHBOARD_DIST_DIR`.
- Dashboard frontend juga otomatis memprioritaskan origin publik saat bundle yang dibuka masih membawa `VITE_API_BASE_URL` loopback dari mesin developer, sehingga deploy production tidak bergantung pada `.env` lokal yang sempurna.
- Sebelum deploy production internal, ikuti [docs/internal-release-checklist.md](/home/mugiew/project/payment-platform/docs/internal-release-checklist.md).

## Command Penting

Catatan:

- command backend lokal seperti `go run ./cmd/migrate up`, `go run ./cmd/api`, dan `go run ./cmd/worker` sekarang otomatis membaca `backend/.env` bila file itu ada, tanpa perlu `source .env` manual
- environment variable yang sudah diexport di shell tetap menang atas nilai dari file `.env`

Build backend:

```bash
cd backend
go build ./...
```

Build dashboard:

```bash
cd dashboard
pnpm build
```

Lint dashboard:

```bash
cd dashboard
pnpm lint
```

## Catatan Implementasi

- Migration runner lokal ada di `backend/cmd/migrate`
- MFA TOTP + recovery codes ada di halaman `/mfa`
- Webhook delivery memakai Asynq + Redis
- Base URL Midtrans sandbox yang dipakai adalah `https://api.sandbox.midtrans.com/v2`
