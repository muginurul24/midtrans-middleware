# AI Next Journey

Dokumen ini dipakai untuk agent atau developer berikutnya yang melanjutkan `payment-platform` setelah snapshot `2026-05-04`.

## 1. Project Identity

PayGate bukan landing page biasa dan bukan dashboard generik. Berdasarkan [PRD.md](/home/mugiew/project/payment-platform/PRD.md), project ini adalah:

- multi-tenant payment middleware antara backend merchant dan Midtrans Core API
- satu akun Midtrans pusat milik platform
- satu user dapat memiliki banyak store
- tiap store punya API token sendiri untuk akses server-to-server
- dashboard dipakai operator merchant untuk mengelola store, token, transaksi, audit log, webhook delivery, dan sesi akun
- webhook Midtrans tidak pernah langsung ke merchant; semua masuk ke PayGate dulu, diverifikasi, dicatat, lalu diteruskan ulang ke callback merchant dengan signature platform sendiri

Implikasi produk yang harus selalu diingat:

- store API token tidak boleh pernah dipakai dari browser
- developer docs harus fokus pada kebutuhan backend merchant
- auditability, idempotency, rate limiting, dan webhook retry adalah bagian inti produk, bukan aksesori
- semua UI operator harus memberi informasi yang nyata, bukan placeholder atau simulasi palsu

## 2. Snapshot Implementasi Saat Ini

Status umum saat dokumen ini dibuat:

- backend Go + PostgreSQL + Redis + worker sudah hidup
- dashboard publik sudah diganti ke `Svelte 5 + Vite + Bun + shadcn-svelte`
- auth dashboard, MFA, store CRUD, token management, transaction list/detail, audit log, webhook delivery, resend, dan docs merchant-facing sudah tersambung ke backend nyata
- frontend placeholder besar yang sempat tersisa sudah dibereskan:
  - pencarian global header sekarang melakukan query nyata ke backend
  - notifikasi webhook mengarah ke tab Webhook, bukan toast dummy
  - indikator failure webhook di sidebar/header hanya muncul jika memang ada failure
  - tombol `Lihat semua` di overview sudah mengarah ke tab yang relevan
  - halaman login tidak lagi punya toggle environment palsu
  - form kontak publik tidak lagi berpura-pura mengirim; sekarang menyiapkan draft email yang benar-benar bisa dipakai
  - docs merchant-facing sudah mencakup charge, status, audit log, webhook payload, error response, status mapping, idempotency, rate limit, dan verifikasi signature

## 3. Yang Masih Kurang

Bagian ini adalah gap nyata yang masih layak dikerjakan, dibagi antara blocker go-live dan improvement bernilai tinggi.

### 3.1 Blocker Go-Live Operasional

Ini bukan bug aplikasi, tetapi masih menentukan apakah merchant bisa benar-benar live:

- payment channel Midtrans production yang ingin dipakai merchant target harus benar-benar aktif
- callback URL merchant production harus HTTPS dan dapat menerima retry webhook
- secret management di VPS harus disiplin: JWT secret, token pepper, webhook pepper, MFA key
- live smoke harus diulang lagi setelah merchant production siap

### 3.2 Fitur Operasional yang Sebaiknya Ada

Ini bukan syarat MVP mutlak di PRD, tetapi sangat masuk akal untuk production-ready secara operasional:

- self-service forgot password / reset password via email
- alerting untuk webhook failed permanently ke email, Telegram, Slack, atau Discord
- export CSV transaksi dan webhook delivery untuk operator merchant
- reconciliation job berkala ke Midtrans untuk mendeteksi selisih status
- audit log detail drawer di dashboard, bukan hanya tabel list
- observability panel untuk latency charge, rate limit hit, webhook retry volume, dan Midtrans failure rate

### 3.3 Nilai Plus Produk yang Layak Ditambahkan

Ini adalah candidate kuat untuk menaikkan nilai jual PayGate tanpa merusak fokus inti:

- `public checkout session` atau payment link untuk merchant yang belum punya backend
- role-based dashboard access per store: `owner`, `developer`, `viewer`
- OpenAPI store-facing yang selalu sinkron dengan implementasi backend
- generated SDK kecil untuk JavaScript, PHP, dan Go
- templated webhook verifier snippets yang bisa diunduh dari dashboard per bahasa
- store health score: callback success rate, retry count, rata-rata waktu delivery

## 4. Prioritas Eksekusi yang Disarankan

Kalau agent berikutnya ingin memberi hasil paling bernilai, urutkan pekerjaan seperti ini:

1. Pastikan semua kontrak store-facing tetap akurat terhadap backend nyata.
   - cek docs vs route backend
   - cek response shape, status code, header webhook, dan error code

2. Rapikan operasional merchant production.
   - verifikasi env VPS
   - verifikasi live callback merchant
   - lakukan smoke charge production terbatas jika channel Midtrans sudah aktif

3. Tutup gap support operator.
   - forgot password flow
   - alert webhook permanen
   - export CSV

4. Naikkan developer usability.
   - OpenAPI final untuk store-facing API
   - contoh integration snippet yang bisa disalin
   - webhook verification guide yang bisa dipilih per bahasa

5. Tambah fitur nilai plus setelah semua core flow stabil.
   - payment link / public checkout
   - multi-member role per store
   - reconciliation dashboard

## 5. Checklist Verifikasi untuk Agent Berikutnya

Sebelum menganggap satu task selesai, minimal jalankan:

- `cd dashboard && bun run check`
- `cd dashboard && bun run build`
- `./scripts/production_readiness.sh` jika perubahan menyentuh backend atau operasional
- browser smoke untuk route publik yang terdampak
- browser smoke untuk route dashboard yang terdampak
- jika membuka port preview lokal, tutup lagi setelah selesai

Jika ada deploy ke VPS:

- sentuh hanya repo PayGate dan service `paygate-api.service` / `paygate-worker.service`
- jangan ganggu aplikasi lain yang sudah live
- setelah deploy, verifikasi `/healthz`, route publik, auth redirect, dan console browser

## 6. Guardrails

Hal yang tidak boleh dilanggar oleh agent berikutnya:

- jangan menambah placeholder baru di UI operator atau docs
- jangan mengubah copy menjadi marketing kosong; semua teks harus membantu user mengambil keputusan
- jangan mengekspos dashboard/internal endpoint di docs merchant-facing
- jangan menganggap “production ready” hanya berarti build lulus; PayGate adalah produk operasional dengan webhook, retry, dan audit
- jangan merusak isolasi multi-tenant demi shortcut implementasi

## 7. Referensi Utama

- [PRD.md](/home/mugiew/project/payment-platform/PRD.md)
- [AI_IMPLEMENTATION_CHECKLIST.md](/home/mugiew/project/payment-platform/AI_IMPLEMENTATION_CHECKLIST.md)
- [README.md](/home/mugiew/project/payment-platform/README.md)
- [docs/vps-release-signoff-2026-05-03.md](/home/mugiew/project/payment-platform/docs/vps-release-signoff-2026-05-03.md)
- [docs/store-api-end-to-end.md](/home/mugiew/project/payment-platform/docs/store-api-end-to-end.md)
