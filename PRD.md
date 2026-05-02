# PRD.md - Multi-Tenant Payment Middleware API ke Midtrans Core API

**Status:** Final Draft v1.0  
**Tanggal:** 2026-05-02  
**Pemilik produk:** Founder/Developer project  
**Target implementasi:** Go REST API + PostgreSQL + Redis + Worker + React Vite Dashboard  
**Payment gateway:** Midtrans Core API  
**Model bisnis/operasional:** Multi-user, multi-store, satu akun Midtrans pusat milik platform

---

## 1. Ringkasan Produk

Produk ini adalah **multi-tenant payment middleware** yang menjadi jembatan antara website/backend toko milik user dan Midtrans Core API.

User dapat membuat banyak toko. Setiap toko memiliki API token sendiri. Token tersebut digunakan oleh backend toko untuk melakukan request ke API platform ini. Platform kemudian memvalidasi token, mencatat request untuk audit, mengubah payload custom menjadi payload Midtrans Core API, mengirim request ke Midtrans memakai credential pusat milik platform, mencatat response Midtrans, lalu mengembalikan response aman ke toko.

Platform juga memiliki endpoint webhook untuk menerima notifikasi dari Midtrans. Webhook tersebut diverifikasi, dicatat, dipakai untuk update status transaksi, lalu diteruskan ke callback URL toko tanpa mengekspos credential pusat. Jika callback ke toko gagal, sistem melakukan retry setiap 20 detik sampai maksimal 10 kali.

Dashboard frontend berbasis React Vite digunakan oleh user untuk mengelola toko, API token, transaksi, audit log, webhook delivery, dan retry manual.

---

## 2. Tujuan Produk

### 2.1 Tujuan Utama

1. Menyediakan API pembayaran custom yang mudah dipakai oleh banyak toko.
2. Menyembunyikan Midtrans Server Key pusat dari toko/user.
3. Mencatat semua request, response, webhook, dan delivery callback untuk kebutuhan audit.
4. Menyediakan dashboard agar user dapat memantau transaksi dan webhook per toko.
5. Menyediakan sistem retry webhook yang reliable menggunakan Redis-backed worker.
6. Membuat fondasi yang dapat dikembangkan untuk payment gateway lain di masa depan.

### 2.2 Tujuan Teknis

1. Backend REST API menggunakan Go.
2. PostgreSQL menjadi source of truth.
3. Redis digunakan secara best practice untuk queue, rate limiting, token cache, idempotency lock, dan session/revocation support.
4. Worker terpisah menangani pekerjaan asynchronous seperti webhook delivery retry.
5. Dashboard frontend menggunakan React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui.
6. Sistem harus aman untuk multi-tenant: setiap toko hanya dapat mengakses data miliknya sendiri.

---

## 3. Non-Goals MVP

Fitur berikut tidak wajib untuk MVP pertama:

1. Integrasi payment gateway selain Midtrans.
2. Refund otomatis penuh dengan settlement accounting kompleks.
3. Split settlement antar toko.
4. Pembuatan merchant Midtrans otomatis untuk setiap toko.
5. Sistem invoice lengkap.
6. Accounting/reporting pajak.
7. Mobile app native.
8. Multi-region deployment.
9. Fraud engine custom di luar fraud status dari Midtrans.
10. Frontend checkout publik langsung dari platform, kecuali nanti dibuat payment session khusus.

---

## 4. Asumsi Produk

1. Platform memakai **satu akun Midtrans pusat** milik pemilik platform.
2. Setiap user dapat memiliki banyak toko.
3. Setiap toko dapat memiliki satu atau lebih API token.
4. Token toko digunakan di header `Authorization: Bearer <token>`.
5. Token toko **tidak boleh diletakkan di frontend browser publik**. Token sebaiknya digunakan oleh backend toko.
6. Jika toko belum punya backend, harus dibuat mekanisme alternatif berupa payment session/public checkout token di fase berikutnya.
7. Request dari toko memakai format custom, bukan payload Midtrans langsung.
8. API platform akan mapping payload custom ke Midtrans Core API.
9. Webhook Midtrans masuk ke platform, bukan langsung ke toko.
10. Platform meneruskan webhook ke callback URL toko dengan signature dari platform.
11. Retry webhook toko dilakukan setiap 20 detik sampai maksimal 10 kali gagal.
12. Postgres menyimpan data permanen dan audit.
13. Redis menyimpan data sementara dan menjalankan queue.

---

## 5. Persona Pengguna

### 5.1 Platform Owner / Super Admin

Pemilik platform yang mengelola konfigurasi global, Midtrans credential pusat, seluruh user, seluruh toko, transaksi, audit, dan webhook.

Kebutuhan:

- Melihat semua toko dan transaksi.
- Melihat semua audit log.
- Melakukan troubleshooting transaksi.
- Melakukan suspend toko.
- Memantau webhook yang gagal.
- Mengelola environment sandbox/production.

### 5.2 Store Owner

User yang memiliki satu atau banyak toko.

Kebutuhan:

- Membuat toko.
- Generate API token toko.
- Mengatur callback URL toko.
- Melihat transaksi toko.
- Melihat audit log toko.
- Melihat status webhook delivery.
- Melakukan resend webhook secara manual jika gagal.

### 5.3 Store Developer

Developer dari toko yang mengintegrasikan API platform ke backend toko.

Kebutuhan:

- Mendapat API token.
- Membaca dokumentasi endpoint.
- Melihat contoh payload.
- Melihat response error.
- Debug request dan webhook.

---

## 6. High-Level Architecture

```text
Frontend toko
   |
   | request pembayaran
   v
Backend toko milik user
   |
   | Authorization: Bearer STORE_API_TOKEN
   v
Go REST API Platform
   |-- Auth token toko
   |-- Rate limit Redis
   |-- Idempotency check
   |-- Validasi payload custom
   |-- Simpan audit log request
   |-- Mapping payload custom ke Midtrans Core API
   |-- Request ke Midtrans memakai Server Key pusat
   |-- Simpan response Midtrans
   v
Midtrans Core API

Midtrans Webhook
   |
   v
Go REST API Platform
   |-- Simpan raw webhook
   |-- Verify signature Midtrans
   |-- Cari transaksi berdasarkan order_id
   |-- Update status transaksi
   |-- Enqueue delivery job ke Redis
   |-- Return HTTP 200 ke Midtrans
   v
Redis Queue / Asynq
   |
   v
Go Worker
   |-- POST webhook ke callback URL toko
   |-- Tambah signature platform
   |-- Retry 20 detik x 10
   |-- Simpan attempt log ke Postgres
   v
Backend toko user
```

---

## 7. Rekomendasi Stack Backend

| Kebutuhan | Teknologi |
|---|---|
| Bahasa | Go |
| HTTP router | Chi |
| Database | PostgreSQL |
| DB driver | pgx |
| SQL code generation | sqlc |
| Migration | goose atau golang-migrate |
| Redis client | go-redis |
| Background job | Asynq |
| Logging | zerolog atau zap |
| Validation | go-playground/validator |
| Config | env-based config, caarlos0/env atau clean manual config |
| Password hashing | argon2id atau bcrypt |
| Token hashing | HMAC-SHA256 atau SHA-256 + secret pepper |
| OpenAPI | openapi.yaml manual atau swaggo |
| Container | Docker + Docker Compose |

### 7.1 Rekomendasi Utama

Gunakan **Chi + pgx + sqlc**.

Alasan:

1. Chi ringan dan idiomatik untuk Go.
2. pgx sangat baik untuk PostgreSQL.
3. sqlc memberi type-safe query tanpa kompleksitas ORM.
4. Pola ini cocok untuk payment/audit system yang membutuhkan query eksplisit dan predictable.

---

## 8. Rekomendasi Stack Frontend Dashboard

### 8.1 Framework Utama

| Kebutuhan | Teknologi |
|---|---|
| Build tool | Vite |
| UI framework | React |
| Language | TypeScript |
| Routing | React Router |
| Data fetching/cache | TanStack Query |
| Table | TanStack Table |
| Form | React Hook Form |
| Validation | Zod |
| Chart | Recharts |
| UI primitives/components | shadcn/ui |
| Styling | Tailwind CSS v4 |
| Animation/microinteraction | motion atau framer-motion |
| Icons | lucide-react |
| Toast | Sonner |
| Date utility | date-fns |
| State kecil/global | Zustand |
| HTTP client | axios atau native fetch wrapper |

### 8.2 Styling/UI Dependencies

Gunakan kombo berikut:

1. **Tailwind CSS v4** sebagai styling engine utama.
2. **shadcn/ui** sebagai base design system.
3. **shadcn dashboard-01** sebagai starting point layout dashboard.
4. **Aceternity UI** secara selektif untuk microinteraction, animated cards, hero/landing page, spotlight, background, dan empty states.
5. **Radix UI** melalui shadcn components.
6. **lucide-react** untuk icon konsisten.
7. **class-variance-authority, clsx, tailwind-merge** untuk variant dan class composition.
8. **Recharts** untuk chart transaksi, volume pembayaran, webhook failure rate.
9. **TanStack Table** untuk tabel transaksi, audit log, dan webhook delivery.
10. **Sonner** untuk toast notification.

### 8.3 Dependency Frontend yang Direkomendasikan

```bash
pnpm create vite@latest dashboard --template react-ts
cd dashboard
pnpm install

pnpm install tailwindcss @tailwindcss/vite
pnpm install react-router @tanstack/react-query @tanstack/react-table
pnpm install react-hook-form zod @hookform/resolvers
pnpm install recharts lucide-react sonner date-fns zustand
pnpm install clsx tailwind-merge class-variance-authority
pnpm install motion
```

Inisialisasi shadcn/ui:

```bash
pnpm dlx shadcn@latest init -t vite
```

Tambahkan komponen shadcn dasar:

```bash
pnpm dlx shadcn@latest add button input label textarea select checkbox switch badge card table tabs dialog dropdown-menu alert sonner sheet separator skeleton avatar tooltip command popover calendar breadcrumb sidebar chart
```

Tambahkan block dashboard:

```bash
pnpm dlx shadcn@latest add dashboard-01
```

Catatan:

- `dashboard-01` dijadikan base layout awal untuk sidebar, charts, dan data table.
- Komponen Aceternity tidak perlu di-install sebagai package utama. Gunakan pola copy-paste component secara selektif agar bundle tetap terkontrol.
- Gunakan Aceternity terutama untuk landing page, auth screen, empty state, success animation, dan beberapa dashboard highlight card; jangan berlebihan di tabel/log karena audit dashboard harus tetap cepat dan mudah dibaca.

### 8.4 UI Pages MVP

Dashboard MVP minimal memiliki halaman:

1. Login
2. Register
3. Store list
4. Create store
5. Store settings
6. API token management
7. Transaction list
8. Transaction detail
9. Audit logs
10. Webhook delivery logs
11. Webhook delivery detail
12. Manual resend webhook
13. Developer documentation page
14. Profile/session management

### 8.5 UI Design Direction

Tone desain:

- Modern SaaS dashboard.
- Clean, data-heavy, professional.
- Dark mode dan light mode.
- Sidebar navigation.
- Metric cards di overview.
- Data table dengan filter, search, status badge, pagination.
- Detail drawer/sheet untuk audit log dan webhook payload.
- JSON viewer untuk raw request/response.

Warna dan status:

| Status | UI Treatment |
|---|---|
| paid/success | badge success |
| pending | badge warning/neutral |
| failed | badge destructive |
| expired | badge muted |
| retrying | badge warning |
| failed_permanently | badge destructive |

---

## 9. Redis Usage Specification

Redis wajib digunakan untuk hal yang tepat, bukan sebagai database utama.

### 9.1 Webhook Delivery Queue

Gunakan Asynq di atas Redis.

Queue:

```text
critical
webhook
maintenance
```

Job type:

```text
webhook.deliver
```

Payload:

```json
{
  "webhook_delivery_id": "uuid",
  "store_id": "uuid",
  "transaction_id": "uuid"
}
```

Retry policy:

```text
max_retry: 10
delay: 20 seconds
```

Setiap attempt dicatat di Postgres.

### 9.2 Rate Limiting

Gunakan Redis untuk rate limit per token dan per toko.

Default MVP:

```text
60 requests/minute/token
300 requests/minute/store
```

Key pattern:

```text
rate_limit:token:{token_id}:{yyyymmddhhmm}
rate_limit:store:{store_id}:{yyyymmddhhmm}
```

### 9.3 Token Lookup Cache

Token tetap disimpan hash di Postgres. Redis menyimpan hasil lookup token aktif.

Key:

```text
api_token:{token_prefix}
```

TTL:

```text
5-15 minutes
```

Value:

```json
{
  "token_id": "uuid",
  "store_id": "uuid",
  "user_id": "uuid",
  "scopes": ["transaction:create", "transaction:read"],
  "status": "active"
}
```

Jika token di-revoke, hapus cache.

### 9.4 Idempotency Lock

Untuk mencegah double charge pada request bersamaan.

Key:

```text
idempotency:store:{store_id}:key:{idempotency_key}
lock:store:{store_id}:order:{order_id}
```

TTL:

```text
30-60 seconds untuk lock
24 hours untuk idempotency response cache opsional
```

Postgres tetap wajib memiliki unique constraint:

```sql
UNIQUE(store_id, order_id)
```

### 9.5 Session / Revocation Support

Untuk dashboard:

```text
revoked_jti:{jti}
session:{user_id}:{session_id}
```

Access token pendek, refresh token disimpan hashed di Postgres.

---

## 10. Functional Requirements

### 10.1 User Authentication Dashboard

User harus dapat:

1. Register akun.
2. Login.
3. Logout.
4. Refresh session.
5. Melihat profil.
6. Mengganti password.

Acceptance criteria:

- Password di-hash.
- Refresh token disimpan hashed.
- Logout mencabut session aktif.
- User tidak dapat melihat toko user lain.

---

### 10.2 Store Management

User harus dapat:

1. Membuat toko.
2. Melihat daftar toko miliknya.
3. Mengubah nama toko.
4. Mengubah domain toko.
5. Mengubah default callback URL.
6. Mengaktifkan/nonaktifkan toko.
7. Melihat webhook secret toko.
8. Melakukan rotate webhook secret.

Field store:

```text
id
user_id
name
slug
domain
default_callback_url
webhook_secret_hash atau encrypted secret
status
created_at
updated_at
```

Acceptance criteria:

- Slug unik.
- Toko nonaktif tidak dapat memakai API token.
- Callback URL wajib HTTPS untuk production.

---

### 10.3 Store API Token Management

User harus dapat:

1. Membuat API token untuk toko.
2. Memberi nama token.
3. Melihat prefix token.
4. Melihat waktu terakhir token dipakai.
5. Revoke token.
6. Rotate token.

Token hanya ditampilkan sekali saat dibuat.

Format token:

```text
pk_test_xxx untuk public/session future use
sk_test_xxx untuk secret sandbox
sk_live_xxx untuk secret production
```

Untuk MVP gunakan secret token:

```text
sk_test_<random>
sk_live_<random>
```

Acceptance criteria:

- Token tidak disimpan plaintext.
- Header `Authorization: Bearer <token>` wajib untuk Store API.
- Token revoked langsung tidak valid.
- Token hanya bisa mengakses store miliknya.

---

### 10.4 Create Transaction / Charge

Endpoint:

```http
POST /v1/transactions/charge
Authorization: Bearer <store_api_token>
Idempotency-Key: <unique-key>
Content-Type: application/json
```

Request custom:

```json
{
  "order_id": "INV-2026-0001",
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
  ],
  "callback_url": "https://tokouser.com/api/payment/callback",
  "metadata": {
    "cart_id": "cart_123"
  }
}
```

Response sukses:

```json
{
  "success": true,
  "data": {
    "transaction_id": "trx_uuid",
    "order_id": "INV-2026-0001",
    "platform_order_id": "store123_INV-2026-0001",
    "status": "pending",
    "payment_type": "bank_transfer",
    "amount": 150000,
    "midtrans": {
      "transaction_id": "midtrans_transaction_id",
      "va_numbers": [
        {
          "bank": "bca",
          "va_number": "1234567890"
        }
      ]
    }
  }
}
```

Acceptance criteria:

- Request valid dicatat di audit log.
- Payload custom dimapping ke Midtrans Core API.
- Midtrans Server Key pusat tidak pernah muncul di response.
- `order_id` unik per toko.
- `platform_order_id` unik global untuk dikirim ke Midtrans.
- Jika `order_id` sama dikirim ulang dengan idempotency key sama, response lama dikembalikan.
- Jika `order_id` sama tetapi payload berbeda, return conflict.

---

### 10.5 Get Transaction

Endpoint:

```http
GET /v1/transactions/{order_id}
Authorization: Bearer <store_api_token>
```

Acceptance criteria:

- Hanya transaksi toko pemilik token yang dapat diakses.
- Response menampilkan status internal dan ringkasan Midtrans yang aman.
- Raw Midtrans response tidak diekspos kecuali dibuat mode debug terbatas.

---

### 10.6 Webhook Midtrans Inbound

Endpoint:

```http
POST /v1/webhooks/midtrans
Content-Type: application/json
```

Flow:

1. Terima webhook dari Midtrans.
2. Simpan raw payload awal.
3. Validasi field wajib.
4. Verifikasi `signature_key`.
5. Cari transaksi berdasarkan `platform_order_id` / Midtrans `order_id`.
6. Update status transaksi.
7. Simpan event transaksi.
8. Buat webhook delivery record.
9. Enqueue job ke Redis.
10. Return HTTP 200 ke Midtrans jika webhook valid dan tercatat.

Signature verification:

```text
SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
```

Acceptance criteria:

- Webhook invalid signature dicatat sebagai invalid dan tidak diproses.
- Webhook valid mengubah status transaksi.
- Webhook duplicate tidak membuat status rusak.
- Endpoint mengembalikan response cepat.

---

### 10.7 Webhook Forwarding ke Toko

Payload ke toko:

```json
{
  "event": "transaction.updated",
  "webhook_id": "wh_uuid",
  "store_id": "store_uuid",
  "order_id": "INV-2026-0001",
  "transaction_id": "trx_uuid",
  "status": "paid",
  "payment_type": "bank_transfer",
  "amount": 150000,
  "currency": "IDR",
  "paid_at": "2026-05-02T10:30:00+07:00",
  "midtrans": {
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "transaction_id": "midtrans_transaction_id"
  },
  "metadata": {
    "cart_id": "cart_123"
  }
}
```

Headers:

```http
X-Webhook-Id: wh_uuid
X-Webhook-Timestamp: 1777700000
X-Webhook-Signature: sha256=<hmac_signature>
Content-Type: application/json
```

Signature:

```text
HMAC_SHA256(timestamp + "." + raw_body, store_webhook_secret)
```

Retry rule:

```text
Interval: 20 seconds
Max retry: 10
Stop after: 10 failed attempts
```

Acceptance criteria:

- Webhook ke toko tidak membawa credential Midtrans.
- Webhook ke toko punya signature platform.
- Setiap attempt dicatat.
- Jika berhasil, status delivery menjadi `success`.
- Jika gagal 10 kali, status menjadi `failed_permanently`.
- Dashboard menyediakan tombol resend manual.

---

### 10.8 Audit Log

Audit log wajib mencatat:

1. Request toko ke platform.
2. Response platform ke toko.
3. Request platform ke Midtrans.
4. Response Midtrans ke platform.
5. Webhook Midtrans inbound.
6. Webhook delivery ke toko.
7. Error dan exception penting.

Data sensitif wajib dimasking:

```text
Authorization
Midtrans Server Key
Webhook Secret
Password
Token
Card details
```

Acceptance criteria:

- User hanya bisa melihat audit log toko miliknya.
- Admin dapat melihat semua audit log.
- Audit log bisa difilter berdasarkan store, order_id, status, endpoint, tanggal, dan request_id.

---

## 11. API Specification MVP

### 11.1 Store-facing API

```http
POST /v1/transactions/charge
GET  /v1/transactions/{order_id}
GET  /v1/audit-logs
```

Future:

```http
POST /v1/transactions/{order_id}/cancel
POST /v1/transactions/{order_id}/expire
POST /v1/transactions/{order_id}/refund
```

### 11.2 Webhook API

```http
POST /v1/webhooks/midtrans
```

### 11.3 Dashboard API

```http
POST /v1/dashboard/auth/register
POST /v1/dashboard/auth/login
POST /v1/dashboard/auth/refresh
POST /v1/dashboard/auth/logout
GET  /v1/dashboard/me

GET    /v1/dashboard/stores
POST   /v1/dashboard/stores
GET    /v1/dashboard/stores/{store_id}
PATCH  /v1/dashboard/stores/{store_id}
DELETE /v1/dashboard/stores/{store_id}

GET    /v1/dashboard/stores/{store_id}/api-tokens
POST   /v1/dashboard/stores/{store_id}/api-tokens
DELETE /v1/dashboard/stores/{store_id}/api-tokens/{token_id}

GET /v1/dashboard/stores/{store_id}/transactions
GET /v1/dashboard/stores/{store_id}/transactions/{transaction_id}
GET /v1/dashboard/stores/{store_id}/audit-logs
GET /v1/dashboard/stores/{store_id}/webhook-deliveries
GET /v1/dashboard/webhook-deliveries/{delivery_id}
POST /v1/dashboard/webhook-deliveries/{delivery_id}/resend
```

---

## 12. Database Model MVP

### 12.1 `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.2 `stores`

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  default_callback_url TEXT,
  webhook_secret_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.3 `store_api_tokens`

```sql
CREATE TABLE store_api_tokens (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  token_prefix TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.4 `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id TEXT NOT NULL,
  platform_order_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT,
  midtrans_transaction_id TEXT,
  payment_type TEXT NOT NULL,
  gross_amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'created',
  fraud_status TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  callback_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  raw_request JSONB NOT NULL DEFAULT '{}',
  midtrans_request JSONB NOT NULL DEFAULT '{}',
  midtrans_response JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(store_id, order_id)
);
```

### 12.5 `transaction_events`

```sql
CREATE TABLE transaction_events (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  source TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.6 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  transaction_id UUID REFERENCES transactions(id),
  request_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  direction TEXT NOT NULL,
  method TEXT,
  url TEXT,
  status_code INT,
  request_headers JSONB NOT NULL DEFAULT '{}',
  request_body JSONB NOT NULL DEFAULT '{}',
  response_headers JSONB NOT NULL DEFAULT '{}',
  response_body JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.7 `midtrans_webhooks`

```sql
CREATE TABLE midtrans_webhooks (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  platform_order_id TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  transaction_status TEXT,
  fraud_status TEXT,
  payment_type TEXT,
  gross_amount TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

### 12.8 `webhook_deliveries`

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  transaction_id UUID REFERENCES transactions(id),
  midtrans_webhook_id UUID REFERENCES midtrans_webhooks(id),
  callback_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 12.9 `webhook_delivery_attempts`

```sql
CREATE TABLE webhook_delivery_attempts (
  id UUID PRIMARY KEY,
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id),
  attempt_number INT NOT NULL,
  request_headers JSONB NOT NULL DEFAULT '{}',
  request_body JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  error_message TEXT,
  duration_ms INT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 13. Transaction Status Mapping

Internal status:

```text
created
pending
challenge
paid
failed
expired
cancelled
refunded
partial_refunded
unknown
```

Mapping awal:

| Midtrans transaction_status | fraud_status | Internal status |
|---|---|---|
| pending | any | pending |
| capture | accept | paid |
| capture | challenge | challenge |
| settlement | any | paid |
| deny | any | failed |
| cancel | any | cancelled |
| expire | any | expired |
| failure | any | failed |
| refund | any | refunded |
| partial_refund | any | partial_refunded |

---

## 14. Security Requirements

1. Midtrans Server Key pusat hanya disimpan di server environment/secret manager.
2. Midtrans Server Key tidak boleh masuk database audit log.
3. Store API token disimpan hashed.
4. Token hanya ditampilkan sekali saat dibuat.
5. Semua endpoint production wajib HTTPS.
6. Webhook Midtrans wajib verify `signature_key`.
7. Webhook ke toko wajib ditandatangani dengan HMAC SHA256.
8. Semua request body yang mengandung data sensitif harus dimasking sebelum disimpan.
9. Rate limit wajib aktif per token dan per store.
10. CORS dashboard hanya mengizinkan domain dashboard resmi.
11. Store-facing API tidak boleh menerima request langsung dari browser publik memakai secret token.
12. Gunakan request ID untuk tracing semua request.
13. Gunakan timeout HTTP client ke Midtrans dan callback toko.
14. Gunakan payload size limit.
15. Gunakan database transaction untuk operasi critical.

---

## 15. Observability Requirements

### 15.1 Logging

Gunakan structured logging.

Field wajib:

```text
request_id
store_id
transaction_id
order_id
endpoint
method
status_code
duration_ms
error
```

### 15.2 Metrics

Metric penting:

1. Total charge request.
2. Charge success/failure rate.
3. Midtrans latency.
4. Webhook inbound count.
5. Webhook delivery success/failure.
6. Webhook retry count.
7. Queue depth.
8. Rate limit hit count.
9. Database error count.
10. Redis error count.

### 15.3 Tracing Future

OpenTelemetry dapat ditambahkan setelah MVP stabil.

---

## 16. Error Response Standard

Gunakan format error konsisten:

```json
{
  "success": false,
  "error": {
    "code": "TRANSACTION_CONFLICT",
    "message": "Order ID already exists with different payload.",
    "request_id": "req_abc123",
    "details": {}
  }
}
```

Contoh error code:

```text
UNAUTHORIZED
FORBIDDEN
STORE_INACTIVE
TOKEN_REVOKED
RATE_LIMITED
VALIDATION_ERROR
TRANSACTION_CONFLICT
MIDTRANS_ERROR
MIDTRANS_TIMEOUT
WEBHOOK_SIGNATURE_INVALID
INTERNAL_ERROR
```

---

## 17. Deployment MVP

Gunakan Docker Compose untuk local development:

```text
api
worker
postgres
redis
dashboard
```

Environment variables backend:

```env
APP_ENV=development
APP_PORT=8080
DATABASE_URL=postgres://...
REDIS_ADDR=redis:6379
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
TOKEN_PEPPER=...
WEBHOOK_SIGNING_PEPPER=...
```

Production recommendation:

1. API dan worker sebagai service terpisah.
2. Postgres managed jika memungkinkan.
3. Redis managed jika memungkinkan.
4. Secret disimpan di secret manager.
5. Dashboard di static hosting/CDN.
6. API di VPS/cloud container.
7. HTTPS wajib via reverse proxy/load balancer.

---

## 18. Repository Structure

```text
payment-platform/
  backend/
    cmd/
      api/
        main.go
      worker/
        main.go
    internal/
      config/
      platform/
        postgres/
        redis/
        logger/
        httpclient/
      domain/
        user/
        store/
        token/
        transaction/
        webhook/
        audit/
      app/
        auth/
        store/
        token/
        transaction/
        webhook/
        audit/
      transport/
        http/
          handler/
          middleware/
          response/
      integration/
        midtrans/
      worker/
        tasks/
    db/
      migrations/
      queries/
    docs/
      openapi.yaml
    Dockerfile
  dashboard/
    src/
      app/
      components/
      components/ui/
      features/
        auth/
        stores/
        tokens/
        transactions/
        audit-logs/
        webhooks/
      lib/
      routes/
      styles/
    components.json
    vite.config.ts
  docker-compose.yml
  README.md
  PRD.md
```

---

## 19. MVP Milestones

### Milestone 1 - Foundation

Deliverables:

1. Setup repo.
2. Docker Compose.
3. Go API skeleton.
4. Worker skeleton.
5. Postgres migration.
6. Redis connection.
7. Config/env loader.
8. Structured logger.
9. Healthcheck endpoint.

Acceptance:

- `docker compose up` menjalankan API, worker, Postgres, Redis.
- `GET /healthz` berhasil.

### Milestone 2 - Auth, Store, Token

Deliverables:

1. User register/login.
2. Store CRUD.
3. API token create/revoke.
4. Token hashing.
5. Store API authentication middleware.
6. Rate limit Redis.

Acceptance:

- User dapat membuat toko.
- User dapat membuat token toko.
- Token dapat dipakai di Store API.
- Token revoked tidak bisa dipakai.

### Milestone 3 - Transaction Charge

Deliverables:

1. Endpoint charge.
2. Payload validation.
3. Idempotency.
4. Mapping ke Midtrans Core API.
5. Request ke Midtrans sandbox.
6. Simpan transaction dan audit log.
7. Get transaction endpoint.

Acceptance:

- Charge berhasil ke Midtrans sandbox.
- Response aman dikembalikan ke toko.
- Data transaksi muncul di database.

### Milestone 4 - Midtrans Webhook

Deliverables:

1. Endpoint webhook Midtrans.
2. Signature verification.
3. Status mapping.
4. Transaction event.
5. Raw webhook log.

Acceptance:

- Webhook valid mengubah status transaksi.
- Webhook invalid tidak diproses.
- Duplicate webhook aman.

### Milestone 5 - Webhook Relay Worker

Deliverables:

1. Asynq job webhook delivery.
2. HMAC signature ke toko.
3. Retry 20 detik x 10.
4. Delivery attempt log.
5. Manual resend endpoint.

Acceptance:

- Callback toko menerima webhook.
- Jika callback gagal, retry berjalan.
- Setelah 10 gagal, status final failed_permanently.

### Milestone 6 - Dashboard MVP

Deliverables:

1. React Vite setup.
2. Tailwind CSS v4.
3. shadcn/ui setup.
4. dashboard-01 layout.
5. Auth pages.
6. Store pages.
7. Token pages.
8. Transaction list/detail.
9. Audit log viewer.
10. Webhook delivery viewer.

Acceptance:

- User bisa login dan melihat toko/transaksi.
- User bisa generate token.
- User bisa melihat audit dan webhook delivery.

---

## 20. Documentation Requirements

Dokumentasi developer harus mencakup:

1. Cara mendapatkan API token.
2. Cara membuat transaksi.
3. Contoh payload request.
4. Contoh response sukses.
5. Contoh response error.
6. Cara menerima webhook dari platform.
7. Cara memverifikasi webhook signature platform.
8. Status mapping.
9. Idempotency behavior.
10. Rate limit behavior.

---

## 21. Open Questions untuk Setelah MVP

1. Apakah toko perlu public checkout page dari platform?
2. Apakah perlu payment link?
3. Apakah perlu refund di dashboard?
4. Apakah perlu role store member seperti owner/developer/viewer?
5. Apakah perlu export CSV transaksi?
6. Apakah perlu reconciliation job berkala ke Midtrans?
7. Apakah perlu alert email/Telegram ketika webhook gagal permanen?
8. Apakah akan ada biaya/platform fee per transaksi?
9. Apakah perlu settlement report per toko?
10. Apakah platform akan support payment gateway lain?

---

## 22. Success Metrics

MVP dianggap berhasil jika:

1. User dapat membuat toko dan API token.
2. Toko dapat membuat transaksi melalui API platform.
3. Transaksi berhasil dibuat di Midtrans sandbox.
4. Semua request dan response tercatat untuk audit.
5. Webhook Midtrans berhasil diterima dan diverifikasi.
6. Status transaksi berubah sesuai webhook.
7. Webhook berhasil diteruskan ke toko tanpa credential Midtrans.
8. Retry webhook berjalan sesuai rule 20 detik x 10.
9. Dashboard dapat menampilkan toko, token, transaksi, audit log, dan webhook delivery.
10. Tidak ada data antar toko yang bocor.

---

## 23. Referensi Teknis

- Midtrans Core API / Charge Transactions: https://docs.midtrans.com/reference/charge-transactions-1
- Midtrans HTTP(S) Notification / Webhooks: https://docs.midtrans.com/docs/https-notification-webhooks
- Tailwind CSS v4 with Vite: https://tailwindcss.com/docs/installation/using-vite
- shadcn/ui Installation: https://ui.shadcn.com/docs/installation
- shadcn dashboard-01: https://ui.shadcn.com/view/new-york-v4/dashboard-01
- Aceternity UI Components: https://ui.aceternity.com/components

---

## 24. Final Product Definition

Produk ini adalah **Go-based multi-tenant payment middleware** dengan:

1. Satu akun Midtrans pusat.
2. Banyak user.
3. Banyak toko per user.
4. Token API per toko.
5. Custom transaction API.
6. Audit log menyeluruh.
7. Midtrans Core API integration.
8. Verified Midtrans webhook inbound.
9. Secure webhook forwarding ke toko.
10. Redis-powered retry, rate limit, cache, dan idempotency.
11. Dashboard React Vite modern dengan Tailwind CSS v4, shadcn/ui, dashboard-01, dan Aceternity UI secara selektif.
