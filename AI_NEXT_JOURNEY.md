# AI Next Journey

Dokumen ini dipakai untuk agent atau developer berikutnya yang melanjutkan `payment-platform` setelah snapshot `2026-05-04`. Fokusnya bukan sekadar “apa yang sudah dibuat”, tetapi “apa yang masih kurang terhadap PRD”, “apa yang paling bernilai untuk dikerjakan berikutnya”, dan “bagaimana menjaga kualitas produk PayGate tetap konsisten”.

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

- **Forgot password / recovery operator**
  - PRD menekankan kejelasan operasional. Saat ini operator yang lupa password masih harus melalui bantuan manual.
- **Alerting webhook failed permanently**
  - Saat ini operator harus membuka dashboard untuk sadar ada delivery gagal. Belum ada notifikasi proaktif.
- **OpenAPI / machine-readable contract**
  - Docs panel sudah baik untuk manusia, tetapi belum ada artefak OpenAPI yang bisa dipakai Postman, SDK generation, atau QA contract testing.
- **CSV export**
  - Store Owner sering butuh export transaksi, audit log, atau delivery untuk rekonsiliasi atau handoff ke finance/support.
- **Observability ringkas**
  - Dashboard sudah punya list/detail, tetapi belum punya latency p95, rate-limit hit, retry trend, dan Midtrans failure trend yang membantu troubleshooting cepat.
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

- alert untuk webhook permanen
- global system health panel
- merchant/store health score
- reconciliation summary lintas store

### 4.2 Store Owner

Yang sudah ada:

- store CRUD
- token management
- webhook secret rotate
- transaksi, audit log, dan delivery visibility

Yang masih kurang:

- export CSV
- filter/saved views untuk operasional rutin
- notifikasi proaktif ketika callback merchant bermasalah

### 4.3 Store Developer

Yang sudah ada:

- store-facing docs
- code snippets `curl`, `JavaScript`, `PHP`, `Go`, `Rust`
- status mapping
- webhook verification guide

Yang masih kurang:

- OpenAPI/collection importable
- generated SDK minimal
- downloadable snippet/contract per bahasa
- example testing flow end-to-end dengan sample callback receiver

## 5. Prioritas Bernilai Tinggi

Jika agent berikutnya ingin memberi hasil paling nyata, urutkan pekerjaan seperti ini:

1. **Kontrak developer yang bisa dipakai mesin**
   - buat `openapi.yaml` untuk seluruh route store-facing
   - generate Postman collection atau export importable dari kontrak itu
   - pastikan docs panel frontend membaca source yang sama bila memungkinkan

2. **Support flow operator**
   - forgot password / reset password
   - alert webhook failed permanently
   - export CSV transaksi dan delivery

3. **Operasional production**
   - reconciliation job berkala ke Midtrans
   - ringkasan health metrics per store
   - live smoke production setelah channel Midtrans merchant aktif

4. **Nilai plus produk**
   - payment link / public checkout session untuk merchant tanpa backend
   - role-based dashboard access (`owner`, `developer`, `viewer`)
   - store health score dan callback SLO

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

### 6.3 Alerting + Store Health Score

Kenapa penting:

- Memberi alasan operasional yang kuat untuk tetap memakai PayGate dibanding integrasi langsung ke gateway.
- Store Owner langsung melihat apakah callback mereka sehat atau mulai bermasalah.

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
