# AI Next Journey

Dokumen ini dipakai untuk agent atau developer berikutnya yang melanjutkan `payment-platform` setelah snapshot `2026-05-05`. Fokusnya bukan sekadar “apa yang sudah dibuat”, tetapi “apa yang masih kurang terhadap PRD”, “apa yang paling bernilai untuk dikerjakan berikutnya”, dan “bagaimana menjaga kualitas produk PayGate tetap konsisten”.

## 1. Project Identity

PayGate bukan landing page promosi dan bukan dashboard CRUD generik. Berdasarkan [PRD.md](/home/mugiew/project/payment-platform/PRD.md), ini adalah:

- multi-tenant payment middleware antara backend merchant dan Midtrans Core API
- satu akun Midtrans pusat milik platform
- satu user dapat memiliki banyak store
- tiap store punya API token sendiri untuk akses server-to-server
- dashboard dipakai operator merchant untuk mengelola store, token, transaksi, audit log, webhook delivery, dan sesi akun
- webhook Midtrans tidak pernah langsung ke merchant; semua masuk ke PayGate dulu, diverifikasi, dicatat, lalu diteruskan ulang ke callback merchant dengan signature platform sendiri

Implikasi produk yang tidak boleh dilupakan:

- Store API token tidak boleh pernah dipakai dari browser.
- Developer docs harus fokus pada Store Developer, bukan endpoint internal dashboard.
- Auditability, idempotency, rate limiting, dan webhook retry adalah inti produk.
- UI operator harus selalu memberikan informasi nyata dan dapat ditindaklanjuti, bukan toast placeholder atau simulasi palsu.

## 2. Snapshot Implementasi Saat Ini

Status umum saat dokumen ini dibuat:

- backend Go + PostgreSQL + Redis + worker sudah hidup
- dashboard publik sudah diganti ke `Svelte 5 + Vite + Bun + shadcn-svelte`
- auth dashboard, MFA, store CRUD, token management, transaction list/detail, audit log, webhook delivery, resend, dan docs merchant-facing sudah tersambung ke backend nyata
- pencarian global header sekarang melakukan query backend nyata untuk store, transaksi, audit log, dan webhook delivery
- notifikasi webhook, badge sidebar, dan CTA overview sudah mengarah ke workflow nyata
- form kontak publik tidak lagi memalsukan submit sukses; sekarang menyiapkan draft email yang benar-benar bisa dipakai
- docs merchant-facing sudah mencakup seluruh route store-facing yang aktif di backend:
  - `POST /v1/transactions/charge`
  - `GET /v1/transactions/{order_id}`
  - `GET /v1/audit-logs`
  - kontrak webhook ke callback merchant
- route docs merchant sekarang juga menyediakan kontrak machine-readable:
  - `OpenAPI 3.1` di [dashboard/src/lib/contracts/paygate-store-api.openapi.yaml](/home/mugiew/project/payment-platform/dashboard/src/lib/contracts/paygate-store-api.openapi.yaml:1)
  - `Postman Collection v2.1` di [dashboard/src/lib/contracts/paygate-store-api.postman_collection.json](/home/mugiew/project/payment-platform/dashboard/src/lib/contracts/paygate-store-api.postman_collection.json:1)
- kontrak merchant-facing sekarang juga punya guard sinkronisasi otomatis lewat [dashboard/scripts/verify-store-contract-sync.mjs](/home/mugiew/project/payment-platform/dashboard/scripts/verify-store-contract-sync.mjs:1) dan command `cd dashboard && bun run contract:check`, lalu check itu sudah ikut masuk ke [scripts/production_readiness.sh](/home/mugiew/project/payment-platform/scripts/production_readiness.sh:1)
- docs merchant sekarang juga menyediakan resource implementasi yang bisa langsung diunduh:
  - `SDK Starters` untuk `JavaScript`, `PHP`, `Go`, dan `Rust`
  - `Starter Kits` receiver webhook untuk `Express`, `PHP`, `Go`, dan `Rust`
- overview dashboard sekarang punya `Store Health` score untuk membantu operator melihat tenant yang sehat, tenant yang perlu perhatian, dan tenant yang sudah bermasalah berdasarkan success rate, retry, failed delivery, dan status store
- overview dashboard sekarang juga punya `Store Observability` yang membaca success ratio delivery, p95 callback latency, retry delta, failure delta, HTTP status attempt terakhir, dan timestamp attempt terakhir per store
- overview dashboard sekarang juga punya `Alert Operasional` dan tray notifikasi header yang benar-benar actionable untuk callback URL yang belum siap, store nonaktif, delivery `retrying`, dan delivery `failed_permanently`
- tab `Transaksi`, `Audit Log`, dan `Webhook Delivery` sekarang punya export CSV yang mengikuti filter aktif agar operator bisa handoff data ke finance, support, atau merchant tanpa merakit ulang secara manual
- tab `Transaksi`, `Audit Log`, dan `Webhook Delivery` sekarang juga punya `Saved Views` per-user/per-tab untuk menyimpan kombinasi store, status, dan query yang sering dipakai
- route `/app/profile` sekarang juga punya destination alert operasional lintas kanal untuk incident merchant: operator bisa menambah `Webhook JSON`, `Slack Incoming Webhook`, atau `Discord Webhook`, mengirim test alert, dan langsung melihat `last_tested_at`, `last_success_at`, `last_triggered_at`, serta `last_error` tanpa refresh manual

## 3. Audit Terhadap PRD

### 3.1 Yang Sudah Selaras Dengan PRD

- Middleware multi-tenant dengan store token server-to-server
- Dashboard operator untuk store, token, transaksi, audit log, dan webhook delivery
- MFA dashboard, session management, dan password change
- Audit masking untuk field sensitif
- Redis-backed rate limiting, token cache, dan worker retry
- Browser-block untuk store-facing API
- Merchant docs dengan multi-language examples

### 3.2 Yang Masih Kurang Dibanding PRD atau Ekspektasi Production

Ini adalah gap riil yang masih tersisa:

- **Alerting lintas kanal**
  - Dasar out-of-band alerting sudah hidup untuk `Webhook JSON`, `Slack Incoming Webhook`, dan `Discord Webhook`.
  - Ekspansi yang masih mungkin: email delivery production, Telegram, escalation policy, dan per-event routing yang lebih granular.
- **OpenAPI / machine-readable contract**
  - Kontrak dasar, sync guard, SDK starter, dan webhook starter kit sudah ada.
  - Gap berikutnya yang lebih bernilai adalah contract-test yang menghasilkan artefak contoh request/response versioned, atau SDK yang benar-benar dipublish sebagai package.
- **Observability lanjutan**
  - Baseline observability per store sudah hidup di overview, tetapi masih belum ada time-series historis, rate-limit hit per store, Midtrans failure trend, dan baseline latency yang bisa dibandingkan lintas hari atau lintas release.
- **Reconciliation job**
  - Belum ada job berkala untuk mengecek mismatch status antara PayGate dan Midtrans production.

## 4. Gap Berdasarkan Persona

### 4.1 Platform Owner / Super Admin

Yang sudah ada:

- monitoring transaksi
- audit trail
- webhook retry visibility
- environment deployment runbook

Yang masih layak ditambah:

- global system health panel
- reconciliation summary lintas store

### 4.2 Store Owner

Yang sudah ada:

- store CRUD
- token management
- webhook secret rotate
- transaksi, audit log, dan delivery visibility
- export CSV transaksi, audit log, dan delivery
- observability ringkas per store untuk callback health

Yang masih kurang:

- analitik notifikasi per store: channel mana yang paling sering gagal, berapa lama MTTR, dan alert fatigue
- time-series delivery health agar owner bisa melihat apakah callback merchant membaik atau memburuk dari hari ke hari

### 4.3 Store Developer

Yang sudah ada:

- store-facing docs
- code snippets `curl`, `JavaScript`, `PHP`, `Go`, `Rust`
- status mapping
- webhook verification guide
- kontrak `OpenAPI` dan `Postman Collection` yang bisa diunduh dari dashboard
- guard sinkronisasi kontrak merchant agar docs utama tidak drift dari backend
- SDK starter yang bisa diunduh untuk `JavaScript`, `PHP`, `Go`, dan `Rust`
- starter kit receiver webhook yang bisa diunduh untuk `Express`, `PHP`, `Go`, dan `Rust`

Yang masih kurang:

- package SDK yang benar-benar dipublish dan versioned
- contract-test / example pack versioned untuk QA merchant
- end-to-end sample project utuh yang menggabungkan client Store API + webhook receiver + order update mock

## 5. Prioritas Bernilai Tinggi

Jika agent berikutnya ingin memberi hasil paling nyata, urutkan pekerjaan seperti ini:

1. **Support flow operator**
   - self-service account recovery audit trail jika nanti email delivery production sudah aktif
   - delivery email production untuk reset password dan recovery notice
   - escalation policy jika endpoint alert utama gagal beberapa kali berturut-turut

2. **Observability dan trust operasional**
   - tambahkan trend health score per store
   - tambahkan time-series callback latency, rate-limit hit, dan Midtrans failure trend
   - tambahkan reconciliation summary lintas store

3. **Developer experience lanjutan**
   - contract-test / example pack versioned dari kontrak OpenAPI
   - sample merchant project end-to-end
   - package SDK yang benar-benar publishable per bahasa prioritas

4. **Operasional production**
   - reconciliation job berkala ke Midtrans
   - live smoke production setelah channel Midtrans merchant aktif

5. **Nilai plus produk**
   - payment link / public checkout session untuk merchant tanpa backend
   - role-based dashboard access (`owner`, `developer`, `viewer`)
   - callback SLO per store

## 6. Nilai Plus yang Paling Menjual

Berikut saran fitur yang menurut saya paling menambah nilai produk tanpa mengganggu fokus inti:

### 6.1 Payment Link / Public Checkout Session

Kenapa penting:

- PRD sendiri sudah mengakui ada merchant yang belum punya backend.
- Ini membuka segmen user yang lebih luas tanpa memaksa mereka membangun server terlebih dulu.

### 6.2 OpenAPI + SDK Kecil

Kenapa penting:

- Developer onboarding jadi lebih cepat.
- Store Developer bisa lebih percaya pada kontrak API.
- QA dan automation jadi jauh lebih mudah.

Status saat ini:

- kontrak OpenAPI dan Postman importable sudah ada
- sync guard otomatis antara kontrak merchant dan backend store-facing sudah ada
- SDK starter dan webhook starter kit sudah bisa diunduh dari dashboard docs
- langkah berikutnya yang lebih bernilai adalah contract-test versioned atau SDK yang benar-benar publishable, bukan lagi snippet dasar

### 6.3 Alerting + Store Health Score

Kenapa penting:

- Memberi alasan operasional yang kuat untuk tetap memakai PayGate dibanding integrasi langsung ke gateway.
- Store Owner langsung melihat apakah callback mereka sehat atau mulai bermasalah.

Status saat ini:

- `Store Health` score sudah hidup di dashboard overview
- `Store Observability` dasar sudah hidup di dashboard overview
- alert operasional in-app sudah hidup di overview dan header tray
- alerting lintas kanal dasar sudah hidup di profile untuk webhook/slack/discord
- langkah berikutnya yang lebih bernilai adalah escalation policy, analytics per channel, dan trend time-series, bukan sekadar menambah destination baru

### 6.4 Account Recovery yang Siap Produksi

Kenapa penting:

- Operator merchant tidak boleh tergantung pada intervensi manual hanya untuk memulihkan akses akun.
- Alur reset password yang benar mengurangi risiko akun yatim dengan sesi lama yang masih aktif.

Status saat ini:

- `forgot password` dan `reset password` sudah hidup end-to-end
- reset sukses sudah me-revoke semua sesi lama
- preview link/token hanya muncul di development
- langkah berikutnya yang bernilai adalah integrasi delivery email production dan audit trail untuk event recovery

## 7. Urutan Kerja yang Disarankan untuk AI Berikutnya

1. Baca [PRD.md](/home/mugiew/project/payment-platform/PRD.md) section 1-10, 19, 20, 22, dan 24.
2. Verifikasi semua route store-facing di backend terhadap docs frontend.
3. Pilih satu gap bernilai tinggi dan selesaikan end-to-end, bukan separuh.
4. Jalankan check/build/smoke test lokal.
5. Jika deploy ke VPS, sentuh hanya PayGate.
6. Update [AI_IMPLEMENTATION_CHECKLIST.md](/home/mugiew/project/payment-platform/AI_IMPLEMENTATION_CHECKLIST.md) dengan status dan bukti verifikasi.

## 8. Checklist Verifikasi

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

## 9. Guardrails

Hal yang tidak boleh dilanggar:

- jangan menambah placeholder baru di UI operator atau docs
- jangan mengubah copy menjadi marketing kosong; semua teks harus membantu user mengambil keputusan
- jangan mengekspos endpoint internal dashboard di docs merchant-facing
- jangan menyebut fitur sebagai “production ready” hanya karena build lulus
- jangan merusak isolasi multi-tenant demi shortcut implementasi

## 10. Referensi Utama

- [PRD.md](/home/mugiew/project/payment-platform/PRD.md)
- [AI_IMPLEMENTATION_CHECKLIST.md](/home/mugiew/project/payment-platform/AI_IMPLEMENTATION_CHECKLIST.md)
- [README.md](/home/mugiew/project/payment-platform/README.md)
- [docs/vps-release-signoff-2026-05-03.md](/home/mugiew/project/payment-platform/docs/vps-release-signoff-2026-05-03.md)
- [docs/store-api-end-to-end.md](/home/mugiew/project/payment-platform/docs/store-api-end-to-end.md)
