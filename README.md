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
```

Catatan:

- `MIDTRANS_SERVER_KEY` tidak wajib di development jika Anda belum menguji charge sungguhan.
- Dashboard MFA wajib sebelum akses dashboard penuh jika `APP_ENV=production`.

## Command Penting

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
