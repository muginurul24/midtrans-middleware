# AI Implementation Checklist

Dokumen ini adalah task master untuk AI coding agent yang akan melanjutkan implementasi `payment-platform` sampai sesuai dengan goal di [PRD.md](/home/mugiew/project/payment-platform/PRD.md).

## 1. Mission

Selesaikan implementasi MVP multi-tenant payment middleware sampai memenuhi:

- goal produk pada PRD section 2
- acceptance criteria milestone pada PRD section 19
- documentation requirements pada PRD section 20
- success metrics pada PRD section 22
- final product definition pada PRD section 24

Jangan mengerjakan non-goals MVP pada PRD section 3 sebelum semua item inti selesai.

## 2. Source of Truth

Urutan prioritas referensi:

1. [PRD.md](/home/mugiew/project/payment-platform/PRD.md)
2. Implementasi backend di `backend/`
3. Implementasi dashboard di `dashboard/`
4. Runbook lokal di [README.md](/home/mugiew/project/payment-platform/README.md)

Jika ada konflik antara kode dan PRD, anggap PRD sebagai target, lalu nilai apakah kode perlu diubah atau PRD perlu dicatat sebagai decision change. Jangan diam-diam menyimpang dari PRD.

## 3. Current State Audit

### 3.1 Milestone Status

- Milestone 1: `done`
- Milestone 2: `done`
- Milestone 3: `done`
- Milestone 4: `done`
- Milestone 5: `done`
- Milestone 6: `mostly done`, tetapi masih ada gap alignment terhadap PRD

### 3.2 Yang Sudah Hidup

- Backend auth dashboard, store CRUD, token create/revoke, store API auth, rate limit
- Charge transaction ke Midtrans sandbox
- Midtrans webhook inbound + status mapping + `transaction_events`
- Webhook relay worker + retry + resend manual
- Dashboard login/register/MFA/store/token/transaction/audit/webhook
- Migration runner lokal di `backend/cmd/migrate`
- Bootstrap lokal `migrate -> api -> worker -> dashboard`

### 3.3 Gap Utama Terhadap PRD

Item di bawah ini belum selesai atau belum terverifikasi sebagai sesuai PRD:

- OpenAPI belum lengkap pada example operasional dan dokumentasi pendukung, walau route utama backend sudah tercakup di [backend/docs/openapi.yaml](/home/mugiew/project/payment-platform/backend/docs/openapi.yaml:1).
- Documentation requirements PRD belum lengkap di API docs maupun dashboard docs tab.
- UI `change password` dashboard belum ada. Backend endpoint sudah hidup, tetapi belum diverifikasi end-to-end dengan halaman profile/session.
- Profile/session management dashboard belum lengkap.
- UI store webhook secret view/rotate belum punya flow yang eksplisit.
- UI store API token rotate belum punya flow yang eksplisit.
- Audit log masking belum terlihat sebagai utilitas yang jelas dan teruji.
- CORS policy dashboard belum terlihat di backend.
- Smoke operasional menyeluruh PRD 15 masih belum selesai walau metrics dan structured logging baseline sudah hidup.
- Dashboard masih monolitik di [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1).
- UI data-heavy PRD seperti filter/search/pagination/detail drawer belum lengkap atau belum konsisten.
- Frontend stack alignment masih parsial: belum memakai TanStack Query/Table, React Hook Form, Zod, dan belum benar-benar menyerupai target PRD untuk dashboard MVP.

## 4. Non-Goals yang Tidak Boleh Dikerjakan Dulu

Jangan memulai ini sebelum MVP complete:

- gateway selain Midtrans
- refund otomatis kompleks
- split settlement
- mobile app
- accounting/tax
- fraud engine custom
- public checkout page
- payment link
- reconciliation berkala ke Midtrans

## 5. Execution Rules for AI

- Selalu baca PRD section yang relevan sebelum mengubah fitur.
- Jangan rewrite arsitektur besar tanpa alasan yang jelas.
- Prioritaskan blocker MVP dan kontrak API lebih dulu daripada polish visual.
- Setiap task harus berakhir dengan verifikasi nyata: build, lint, smoke test, atau browser check.
- Setiap perubahan endpoint wajib diikuti update dokumentasi.
- Jangan menganggap feature selesai hanya karena UI ada; cek apakah acceptance criteria PRD benar-benar terpenuhi.
- Semua pekerjaan harus menjaga isolasi multi-tenant.

## 6. Prioritized Implementation Checklist

Gunakan daftar ini sebagai urutan eksekusi default.

### Phase A - Contract and Security Completion

- [ ] Audit seluruh route backend vs PRD section 11, lalu buat gap list final sebelum coding.
- [ ] Lengkapi [backend/docs/openapi.yaml](/home/mugiew/project/payment-platform/backend/docs/openapi.yaml:1) untuk semua endpoint yang sudah hidup.
- [ ] Tambahkan endpoint `change password` dashboard sesuai PRD 10.1.
- [ ] Tambahkan UI `change password` pada profile/session management.
- [ ] Tambahkan endpoint untuk melihat webhook secret store secara aman.
- [ ] Tambahkan endpoint untuk rotate webhook secret store.
- [ ] Tambahkan UI webhook secret view/rotate di dashboard store settings.
- [ ] Tambahkan flow rotate API token yang eksplisit.
- [ ] Tambahkan UI rotate API token yang aman dan jelas.
- [ ] Implementasikan utilitas masking audit log untuk:
  - Authorization
  - Midtrans Server Key
  - Webhook Secret
  - Password
  - Token
  - field sensitif lain
- [ ] Pastikan semua titik audit memakai masking utilitas yang sama.
- [ ] Tambahkan test/smoke test untuk membuktikan secret tidak bocor ke audit log.
- [ ] Tambahkan CORS policy backend yang membatasi dashboard origin sesuai PRD 14.
- [ ] Review timeout, payload size limit, dan transaksi database kritis agar sesuai PRD 14.

### Phase B - Dashboard MVP Completion

- [ ] Pecah [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) menjadi feature modules:
  - stores
  - tokens
  - transactions
  - audit logs
  - webhooks
  - docs
- [ ] Tambahkan halaman/section profile dan session management yang nyata.
- [ ] Pastikan UI pages MVP di PRD 8.4 semuanya benar-benar ada dan usable.
- [ ] Tambahkan search/filter/pagination untuk:
  - transactions
  - audit logs
  - webhook deliveries
- [ ] Tambahkan detail view yang lebih jelas untuk payload JSON request/response.
- [ ] Rapikan developer docs tab agar memenuhi PRD 20:
  - cara dapat token
  - contoh create transaction
  - contoh sukses
  - contoh error
  - webhook guide
  - signature verification
  - status mapping
  - idempotency
  - rate limit
- [ ] Tambahkan indicator status yang konsisten sesuai PRD 8.5.
- [ ] Review ulang landing page, auth, dan dashboard agar tone visual tetap konsisten dengan arah PRD.

### Phase C - Stack Alignment Frontend

Ini bukan blocker pertama, tetapi tetap bagian dari goal implementasi dashboard menurut PRD.

- [ ] Migrasikan fetching utama ke TanStack Query.
- [ ] Migrasikan tabel utama ke TanStack Table.
- [ ] Migrasikan form utama ke React Hook Form + Zod.
- [ ] Pastikan penggunaan shadcn/ui konsisten di komponen utama dashboard.
- [ ] Evaluasi apakah `dashboard-01` shell perlu diadopsi lebih eksplisit atau struktur sekarang cukup setara.

### Phase D - Observability and Operability

- [x] Tambahkan metrics endpoint atau integrasi metrics dasar sesuai PRD 15.2.
- [x] Tambahkan instrumentation untuk:
  - total charge request
  - charge success/failure
  - Midtrans latency
  - webhook inbound count
  - webhook delivery success/failure
  - webhook retry count
  - queue depth
  - rate limit hit count
  - database error count
  - redis error count
- [x] Review structured logging field wajib:
  - request_id
  - store_id
  - transaction_id
  - order_id
  - endpoint
  - method
  - status_code
  - duration_ms
  - error
- catatan implementasi saat ini:
  - API expose `GET /metrics`
  - worker expose metrics server di `:${WORKER_METRICS_PORT}` dengan default `9091`
  - queue depth saat ini memakai inspector Asynq untuk queue `webhook`
  - request log field diisi lewat request-scoped context dari middleware/handler/service
  - smoke runtime sudah membuktikan `store_id`, `order_id`, `endpoint`, `status_code`, `duration_ms`, dan `error`; verifikasi jalur sukses yang memunculkan `transaction_id` dibundel ke operational smoke berikutnya
- [ ] Tambahkan smoke test operasional untuk alur lokal:
  - migrate
  - api start
  - worker start
  - dashboard build
  - charge sandbox
  - webhook inbound
  - webhook relay

### Phase E - Documentation and Release Readiness

- [ ] Sinkronkan [README.md](/home/mugiew/project/payment-platform/README.md) dengan state fitur terbaru.
- [ ] Lengkapi OpenAPI examples untuk request/response utama.
- [ ] Tambahkan contoh curl end-to-end untuk store developer.
- [ ] Tambahkan runbook testing Midtrans sandbox.
- [ ] Tambahkan checklist release internal:
  - env production wajib
  - secret management
  - HTTPS
  - callback URL policy
  - MFA production check

## 7. Definition of Done per Gap

Gunakan standar ini. Task tidak boleh ditandai selesai jika belum memenuhi semua.

### OpenAPI

- semua endpoint aktif ada di spec
- request/response utama punya schema
- error response standard sesuai PRD 16
- minimal satu example per endpoint penting

### Change Password

- backend endpoint ada
- password lama diverifikasi
- password baru di-hash
- frontend form ada
- smoke test sukses

### Webhook Secret View/Rotate

- backend route ada
- hanya owner store yang bisa akses
- rotate menghasilkan secret baru
- UI bisa menampilkan secret dengan aman
- secret lama tidak dipakai lagi setelah rotate

### Token Rotate

- flow jelas dan aman
- token lama bisa dicabut
- token baru hanya tampil sekali
- audit log dan cache invalidation benar

### Audit Masking

- raw secret tidak tersimpan
- masking konsisten lintas transaction, webhook, delivery
- ada bukti test atau inspection yang jelas

### Dashboard Data UX

- tabel utama bisa dibaca saat data banyak
- ada search/filter/pagination
- detail payload bisa diinspeksi tanpa merusak layout

## 8. Final MVP Gate

Sebelum project dinyatakan sesuai goals MVP, semua item ini harus bisa dijawab `yes`:

- [ ] User bisa register, login, logout, refresh, lihat profil, dan ganti password.
- [ ] User bisa membuat store, edit store, nonaktifkan store, lihat/rotate webhook secret.
- [ ] User bisa membuat token, revoke token, rotate token.
- [ ] Store backend bisa charge transaction ke Midtrans sandbox via platform.
- [ ] Idempotency conflict/replay benar.
- [ ] Midtrans webhook valid mengubah status transaksi.
- [ ] Midtrans webhook invalid tidak diproses.
- [ ] Webhook relay ke toko ditandatangani dan retry 20s x 10.
- [ ] Manual resend berjalan.
- [ ] Audit log lengkap dan masked.
- [ ] Dashboard bisa menampilkan store, token, transaction, audit, webhook delivery.
- [ ] Developer docs lengkap.
- [ ] OpenAPI lengkap.
- [ ] Tidak ada data bocor antar store.
- [ ] Local bootstrap dan Docker Compose runbook jelas.

## 9. Suggested Working Order

Jika AI ingin langsung eksekusi tanpa diskusi tambahan, pakai urutan ini:

1. Lengkapi OpenAPI.
2. Tambahkan change password.
3. Tambahkan webhook secret view/rotate.
4. Tambahkan explicit token rotate.
5. Audit masking hardening.
6. Tambahkan CORS.
7. Lengkapi developer docs tab + README/API examples.
8. Pecah dashboard monolith dan tambah filter/search/pagination.
9. Tambahkan smoke test operasional + final smoke test terhadap success metrics PRD section 22.

## 10. Expected Agent Behavior

AI agent berikutnya harus:

- mulai dengan membandingkan PRD vs kode aktif
- pilih satu phase kecil yang bisa diselesaikan end-to-end
- implementasikan, verifikasi, dan update docs dalam turn yang sama
- jangan lompat ke enhancement non-goal sebelum blocker MVP selesai

Jika ragu, prioritaskan item yang paling dekat ke:

- security
- contract correctness
- multi-tenant isolation
- operability
- developer usability
