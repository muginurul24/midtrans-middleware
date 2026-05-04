# Internal Release Checklist

Checklist ini dipakai sebelum deploy `payment-platform` ke environment production internal. Fokusnya adalah item yang memang diwajibkan oleh PRD dan sudah dienforce oleh kode saat ini.

## 1. Production Env Wajib

Pastikan backend dijalankan dengan `APP_ENV=production`.

Env sensitif berikut wajib tersedia. Service akan gagal boot di production jika salah satu kosong:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TOKEN_PEPPER`
- `MFA_ENCRYPTION_KEY`
- `WEBHOOK_SIGNING_PEPPER`
- `MIDTRANS_SERVER_KEY`

Env operasional yang wajib direview sebelum release:

- `MIDTRANS_ENV=production`
- `MIDTRANS_API_BASE_URL=https://api.midtrans.com/v2`
- payment channel Midtrans production yang akan dipakai memang sudah aktif di MAP merchant
- `DASHBOARD_ALLOWED_ORIGINS=https://dashboard.example.com`
- `DATABASE_URL` mengarah ke database production
- `REDIS_ADDR` mengarah ke Redis production
- `WORKER_CONCURRENCY` sesuai kapasitas worker
- `WORKER_METRICS_PORT` tidak bentrok dengan service lain

Verifikasi minimal:

```bash
cd backend
set -a
source .env
set +a
APP_ENV=production go run ./cmd/api
```

Boot yang sukses membuktikan env sensitif wajib sudah terisi. Hentikan proses setelah verifikasi.

## 2. Secret Management

- Semua secret production disimpan di secret manager atau environment deployment, bukan di repo, screenshot, atau chat log.
- Akses ke `MIDTRANS_SERVER_KEY`, JWT secrets, token pepper, MFA key, dan webhook signing pepper dibatasi ke operator yang memang perlu.
- Rotation plan tersedia sebelum go-live:
  - JWT secret rotation
  - `TOKEN_PEPPER`
  - `WEBHOOK_SIGNING_PEPPER`
  - `MIDTRANS_SERVER_KEY`

Verifikasi minimal:

- cek file `backend/.env` local tidak ikut dipublish
- cek pipeline/deployment membaca secret dari secret store yang benar
- cek audit/log internal tidak menyimpan raw secret

## 3. HTTPS dan Exposure

PRD mewajibkan semua endpoint production berjalan lewat HTTPS.

- API public berada di belakang reverse proxy atau load balancer dengan TLS aktif.
- Dashboard public hanya tersedia di origin resmi.
- `GET /metrics` API dan worker metrics tidak diekspos bebas ke internet publik; batasi ke jaringan internal atau monitoring stack.
- `GET /healthz` hanya dipakai untuk healthcheck operasional.

Verifikasi minimal:

- buka endpoint production lewat `https://`
- cek redirect atau blok untuk request plain HTTP di edge layer
- cek `DASHBOARD_ALLOWED_ORIGINS` hanya berisi origin dashboard resmi tanpa wildcard

## 4. Callback URL Policy

Kode backend sudah menolak callback URL non-HTTPS jika `APP_ENV=production`. Sebelum release, pastikan data store yang sudah ada juga bersih.

SQL audit yang disarankan:

```sql
SELECT id, slug, default_callback_url
FROM stores
WHERE default_callback_url IS NOT NULL
  AND default_callback_url <> ''
  AND default_callback_url NOT LIKE 'https://%';
```

Checklist:

- hasil query di atas kosong
- callback endpoint milik store benar-benar menerima request HTTPS valid
- jika ada store lama dengan callback non-HTTPS, perbaiki sebelum backend production dinyalakan

## 5. MFA Production Check

Dashboard production mensyaratkan MFA. User yang belum setup atau belum verifikasi MFA tidak boleh mendapat akses dashboard penuh.

Checklist:

- login dengan user baru di production/staging menghasilkan state MFA `required=true`
- akses dashboard tanpa MFA diblok dengan `MFA_SETUP_REQUIRED` atau `MFA_VERIFICATION_REQUIRED`
- setelah setup TOTP dan verifikasi sukses, akses dashboard normal
- recovery codes tersimpan dan bisa diregenerasi

Verifikasi minimal:

1. Register atau login user uji.
2. Panggil endpoint dashboard yang butuh akses penuh sebelum setup MFA.
3. Pastikan respons `403`.
4. Selesaikan setup MFA.
5. Ulangi request yang sama dan pastikan lolos.

## 6. Release Sign-off Operasional

Sebelum deploy final, jalankan verifikasi berikut:

```bash
./scripts/production_readiness.sh
```

Script ini membungkus:

- `cd backend && go test ./...`
- `cd backend && go build ./...`
- `cd dashboard && pnpm lint`
- `cd dashboard && pnpm build`
- `./scripts/operational_smoke.sh`

Yang harus terbukti dari sign-off:

- charge berhasil dibuat pada metode pembayaran production yang memang aktif
- webhook Midtrans diterima
- status transaksi berubah
- webhook relay ke store sukses
- metrics API dan worker bergerak
- jika create charge production mengembalikan payload Midtrans seperti `status_code=402` dengan pesan `Payment channel is not activated.`, anggap itu blocker konfigurasi merchant, bukan sekadar retry aplikasi
- jika branch ini belum pernah diuji ke Midtrans sandbox sungguhan, jalankan juga [docs/midtrans-sandbox-runbook.md](/home/mugiew/project/payment-platform/docs/midtrans-sandbox-runbook.md) sebelum go-live

Catat artefak release:

- commit SHA
- tanggal release
- operator
- hasil smoke terakhir
- endpoint API dan dashboard production
