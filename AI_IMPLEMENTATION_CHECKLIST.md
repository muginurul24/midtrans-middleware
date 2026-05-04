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

- Profile/session management dashboard sudah hidup.
- CORS dashboard sudah hidup via allowlist origin, tetapi review production allowed origins tetap harus dijaga lewat release checklist.
- Dashboard shell utama masih menjadi orchestration point, tetapi feature modules inti sudah dipisah dari route utama.
- UI data-heavy utama sudah usable; sisa gap frontend sekarang lebih banyak di visual review, stack alignment, dan review usability akhir terhadap seluruh page MVP.
- Stack alignment frontend baseline sekarang sudah hidup: TanStack Query, TanStack Table, React Hook Form, Zod, shadcn consistency, dan code-splitting route/tab utama sudah terpasang; verifikasi akhir integrasi Midtrans sandbox nyata juga sudah lulus di VPS pada `2026-05-03`, sehingga sisa pekerjaan MVP sekarang lebih banyak pada release sign-off operasional dan review deployment internal.

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

- [x] Audit seluruh route backend vs PRD section 11, lalu buat gap list final sebelum coding.
- [x] Lengkapi [backend/docs/openapi.yaml](/home/mugiew/project/payment-platform/backend/docs/openapi.yaml:1) untuk semua endpoint yang sudah hidup.
- catatan implementasi saat ini:
  - semua route aktif di [backend/internal/transport/http/server.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/server.go:1) sudah muncul di [backend/docs/openapi.yaml](/home/mugiew/project/payment-platform/backend/docs/openapi.yaml:1)
  - route MVP PRD 11 yang aktif semuanya sudah ada: `POST /v1/transactions/charge`, `GET /v1/transactions/{order_id}`, `GET /v1/audit-logs`, `POST /v1/webhooks/midtrans`, auth dashboard, stores, tokens, transactions, audit logs, webhook deliveries, dan resend
  - route future PRD 11 yang masih belum diimplementasikan dan memang tidak ada di spec aktif: `POST /v1/transactions/{order_id}/cancel`, `POST /v1/transactions/{order_id}/expire`, `POST /v1/transactions/{order_id}/refund`
  - route tambahan di luar daftar ringkas PRD 11 tetapi sudah hidup dan didokumentasikan: `/`, `/healthz`, `/metrics`, `change-password`, seluruh MFA endpoint, webhook secret view/rotate, dan token rotate
  - PRD section 11 sekarang paling tepat diperlakukan sebagai daftar MVP minimal, sedangkan [backend/docs/openapi.yaml](/home/mugiew/project/payment-platform/backend/docs/openapi.yaml:1) adalah kontrak route aktif yang lebih lengkap
- [x] Tambahkan endpoint `change password` dashboard sesuai PRD 10.1.
- [x] Tambahkan UI `change password` pada profile/session management.
- [x] Tambahkan endpoint untuk melihat webhook secret store secara aman.
- [x] Tambahkan endpoint untuk rotate webhook secret store.
- [x] Tambahkan UI webhook secret view/rotate di dashboard store settings.
- [x] Tambahkan flow rotate API token yang eksplisit.
- [x] Tambahkan UI rotate API token yang aman dan jelas.
- catatan implementasi saat ini:
  - route backend aktif di [backend/internal/transport/http/server.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/server.go:1)
  - handler backend aktif di [dashboard_auth.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/handler/dashboard_auth.go:134), [stores.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/handler/stores.go:142), dan [store_tokens.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/handler/store_tokens.go:110)
  - UI dashboard aktif di [dashboard/src/routes/dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:768)
  - verifikasi runtime terakhir pada `2026-05-02` lulus:
    - `POST /v1/dashboard/auth/change-password` mengembalikan `204`
    - login dengan password lama menjadi `401`
    - login dengan password baru sukses
    - `GET /webhook-secret` mengembalikan secret aktif
    - `POST /webhook-secret/rotate` menghasilkan secret baru yang berbeda
    - `POST /api-tokens/{token_id}/rotate` menghasilkan token baru dan menandai token lama `revoked_at`
- [x] Implementasikan Redis token lookup cache untuk store API token sesuai PRD 9.3.
- catatan implementasi saat ini:
  - service auth token di [backend/internal/app/token/service.go](/home/mugiew/project/payment-platform/backend/internal/app/token/service.go:1) sekarang mencoba lookup Redis `api_token:{token_prefix}` sebelum fallback ke Postgres
  - TTL cache diset `10 menit`, masih berada di rentang PRD `5-15 minutes`
  - payload cache menyimpan snapshot `token_id`, `store_id`, `user_id`, `scopes`, `status`, `revoked_at`, `expires_at`, dan `token_hash` untuk validasi cepat
  - revoke dan rotate token sekarang menghapus cache prefix lama secara eksplisit
  - cache hit tetap memverifikasi status store aktif ke Postgres agar store yang baru dinonaktifkan tidak lolos hanya karena TTL Redis belum habis
  - payload cache korup akan dihapus otomatis lalu auth jatuh ke fallback yang aman
  - test ada di [backend/internal/app/token/service_test.go](/home/mugiew/project/payment-platform/backend/internal/app/token/service_test.go:1)
  - `cd backend && go test ./...` dan `cd backend && go build ./...` lulus pada `2026-05-04`
- [x] Implementasikan utilitas masking audit log untuk:
  - Authorization
  - Midtrans Server Key
  - Webhook Secret
  - Password
  - Token
  - field sensitif lain
- [x] Pastikan semua titik audit memakai masking utilitas yang sama.
- [x] Tambahkan test/smoke test untuk membuktikan secret tidak bocor ke audit log.
- catatan implementasi saat ini:
  - utilitas pusat ada di [backend/internal/platform/auditmask/mask.go](/home/mugiew/project/payment-platform/backend/internal/platform/auditmask/mask.go:1)
  - semua insert audit log pada `transaction`, `webhook`, dan `webhookdelivery` memakai utilitas ini
  - test ada di [backend/internal/platform/auditmask/mask_test.go](/home/mugiew/project/payment-platform/backend/internal/platform/auditmask/mask_test.go:1)
  - `go test ./...` lulus pada `2026-05-02`
  - perbaikan terakhir menutup edge case masking `Basic` auth agar token base64 tidak lolos ketika muncul di teks bebas
- [x] Tambahkan CORS policy backend yang membatasi dashboard origin sesuai PRD 14.
- catatan implementasi saat ini:
  - middleware ada di [backend/internal/transport/http/middleware/dashboard_cors.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/middleware/dashboard_cors.go:1)
  - router dashboard memakai middleware ini di [backend/internal/transport/http/server.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/server.go:74)
  - verifikasi runtime terakhir pada `2026-05-02` lulus:
    - origin `http://localhost:5173` mendapat `Access-Control-Allow-Origin`
    - origin `https://evil.example.com` tidak mendapat header allow origin
- [x] Review timeout, payload size limit, dan transaksi database kritis agar sesuai PRD 14.
- catatan implementasi saat ini:
  - server API memakai `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, dan `IdleTimeout` di [backend/cmd/api/main.go](/home/mugiew/project/payment-platform/backend/cmd/api/main.go:114) dari config [backend/internal/config/config.go](/home/mugiew/project/payment-platform/backend/internal/config/config.go:31)
  - parser JSON dashboard dibatasi `64 KiB`, charge dibatasi `256 KiB`, dan webhook Midtrans dibatasi `1 MiB` di [backend/internal/transport/http/handler/helpers.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/handler/helpers.go:12) dan [backend/internal/transport/http/handler/midtrans_webhook.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/handler/midtrans_webhook.go:13)
  - decoder JSON juga sudah `DisallowUnknownFields`
  - write path kritis yang multi-step sudah dibungkus transaksi DB, termasuk charge sukses atomik, webhook inbound, token rotate, auth MFA/session write, dan webhook delivery worker
  - verifikasi runtime terakhir pada `2026-05-02` lulus:
    - body `POST /v1/dashboard/auth/register` di atas limit ditolak `400` dengan pesan `Request payload is too large.`
    - body `POST /v1/webhooks/midtrans` di atas limit ditolak `400`

### Phase B - Dashboard MVP Completion

- [x] Pecah [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) menjadi feature modules:
  - stores
  - tokens
  - transactions
  - audit logs
  - webhooks
  - docs
- catatan implementasi saat ini:
  - komponen yang sudah diekstrak: [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1), [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1), [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1), [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1), [transactions-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/transactions-panel.tsx:1), [audit-logs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/audit-logs-panel.tsx:1), [webhook-deliveries-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/webhook-deliveries-panel.tsx:1), [developer-docs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/developer-docs-panel.tsx:1), [profile-session-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-session-panel.tsx:1), dan [dashboard-status-badge.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-status-badge.tsx:1)
  - type data tab utama juga sudah dipindah ke [types.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/types.ts:1)
  - route utama sekarang terutama menyimpan state, fetch, handler, flash message, dan shell conditional
  - `cd dashboard && pnpm build` lulus pada `2026-05-02`
- [x] Tambahkan halaman/section profile dan session management yang nyata.
- catatan implementasi saat ini:
  - panel ada di [dashboard/src/features/dashboard/components/profile-session-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-session-panel.tsx:1)
  - overview dashboard sekarang tetap menampilkan profile/session walau belum ada store aktif
  - panel memuat profil user, status MFA, expiry access/refresh token, refresh session state, logout session aktif, dan shortcut ke halaman MFA
  - `cd dashboard && pnpm build` lulus pada `2026-05-02`
- [x] Pastikan UI pages MVP di PRD 8.4 semuanya benar-benar ada dan usable.
- catatan implementasi saat ini:
  - route aktif yang dipakai router sekarang: landing, login, register, MFA, dan dashboard
  - `document.title` untuk landing, login, register, MFA, dan dashboard sudah dibuat eksplisit agar tab browser dan redirect context tidak generik lagi
  - route lama [overview.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/overview.tsx:1) yang tidak dipakai dan masih berisi narasi Milestone 1 sudah dihapus agar tidak menyesatkan implementor berikutnya
  - audit runtime menyeluruh pada `2026-05-02` untuk flow `register -> MFA -> dashboard -> create store -> create token -> docs` lulus memakai API lokal `:18090` dan Vite `:4174`
  - blocker CORS dev untuk origin loopback non-`5173` sudah diperbaiki di middleware backend agar audit browser tidak patah saat Vite pindah port
  - halaman MFA yang sebelumnya bisa tampil tanpa tombol aksi saat authenticator belum aktif sekarang selalu menampilkan CTA setup yang usable
  - overview dashboard tanpa store sekarang memakai title yang lebih tepat, copy empty state sudah konsisten berbahasa Indonesia, dan form ganti password sudah memberi hint yang benar ke password manager/browser
  - state detail transaksi dan detail webhook sekarang bisa di-address lewat URL query `transaction` dan `delivery` pada [dashboard/src/routes/dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1), sehingga reload/share link tetap membuka detail panel yang sama dan lebih dekat ke definisi page/detail pada PRD 8.4
  - verifikasi browser lokal `2026-05-04` lulus untuk deep-link `tab=transactions&transaction=...` dan `tab=webhooks&delivery=...`: detail tetap terbuka setelah reload, title tab browser ikut sinkron, dan console `0` error / `0` warning
  - canonical route path untuk halaman list/detail transaksi dan webhook sekarang juga aktif di [dashboard/src/app/router.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/router.tsx:1): `/app/stores/:storeId/transactions`, `/app/stores/:storeId/transactions/:transactionId`, `/app/stores/:storeId/webhooks`, dan `/app/stores/:storeId/webhooks/:deliveryId`
  - verifikasi browser lokal `2026-05-04` juga lulus untuk route path tersebut: detail transaksi dan webhook bisa dibuka langsung dari pathname, tombol `Tutup Detail` kembali ke route list yang benar, title sinkron, dan console `0` error / `0` warning
  - canonical route untuk page store-scoped yang sebelumnya masih query-only sekarang juga aktif di [dashboard/src/app/router.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/router.tsx:1): `/app/stores/:storeId`, `/app/stores/:storeId/tokens`, `/app/stores/:storeId/audit`, dan `/app/stores/:storeId/docs`
  - page `Profil & Sesi` sekarang punya route langsung `/app/profile`, dirender lewat [profile-workspace-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-workspace-panel.tsx:1), dan tidak lagi bergantung pada store aktif untuk bisa diakses
  - verifikasi browser lokal `2026-05-04` lulus untuk direct-open `/app/profile`, `/app/stores/:storeId`, `/app/stores/:storeId/tokens`, `/app/stores/:storeId/audit`, dan `/app/stores/:storeId/docs`; title masing-masing sinkron, route profil tidak auto-redirect ke store pertama, dan memilih store dari page profil berpindah ke `/app/stores/:storeId` yang benar dengan console `0` error / `0` warning
  - pass fondasi styling lanjutan pada `2026-05-03` juga sudah memindahkan halaman MFA ke token semantic baru, sehingga banner status, panel QR/secret, recovery code, dan danger zone tidak lagi memakai literal `stone/emerald/amber/red` lama
  - route error surface juga sekarang sudah memakai error boundary aplikasi di [route-error.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/route-error.tsx:1) dan catch-all `*` di [router.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/router.tsx:1), jadi 404 atau runtime route error tidak lagi jatuh ke default page React Router; verifikasi browser `2026-05-03` untuk `/route-yang-tidak-ada` lulus dengan title `404 | PayGate`, CTA kembali yang jelas, dan console `0` warning
  - pass shell mobile lanjutan pada `2026-05-03` merapikan [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1) agar badge tab, nama store, theme toggle, dan user menu tidak lagi berebut ruang di layar sempit; [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1) sekarang memakai pill scroller horizontal di mobile; dan [sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/ui/sidebar.tsx:1) + [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) sekarang mengembalikan tombol close sheet mobile serta menutup sidebar otomatis setelah user memilih store/tab
  - pass lanjutan pada `2026-05-03` juga merapikan density panel [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1), [profile-session-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-session-panel.tsx:1), dan [developer-docs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/developer-docs-panel.tsx:1): danger zone dipisah dari aksi simpan, secret webhook memakai code surface yang lebih aman dibaca, status sesi dipromosikan ke summary cards, dan dokumentasi API dipecah ke blok snippet/callout yang lebih modular untuk mobile
  - pass visual QA berikutnya pada `2026-05-03` merapikan [mfa.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/mfa.tsx:1) dan helper global di [index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:413): surface code/json sekarang lebih tahan overflow (`overscroll-contain`, padding mobile lebih kecil, text size lebih proporsional), sedangkan halaman MFA menampilkan issuer/account summary, CTA copy/regenerate/full-width yang lebih stabil di mobile, dan secret/URI/recovery block yang lebih konsisten dengan panel dashboard lain
- [x] Tambahkan search/filter/pagination untuk transactions.
- catatan implementasi saat ini:
  - backend list transaksi dashboard sekarang mendukung `limit`, `offset`, `status`, dan `query`
  - response list transaksi sekarang membawa `meta.total`, `meta.limit`, `meta.offset`, dan `meta.has_next`
  - UI transactions sekarang punya form search/filter, ringkasan hasil, empty state, dan tombol pagination prev/next
  - verifikasi runtime terakhir pada `2026-05-02` lulus dengan filter `status=paid`, `query=INV-PAID`, halaman `5 + 2`, dan `has_next` berubah `true -> false`
- [x] Tambahkan search/filter/pagination untuk audit logs.
- catatan implementasi saat ini:
  - backend list audit logs sekarang mendukung `limit`, `offset`, `direction`, `query`, `request_id`, `order_id`, `endpoint`, `status_code`, `created_from`, dan `created_to`
  - response list audit logs sekarang membawa `meta.total`, `meta.limit`, `meta.offset`, dan `meta.has_next`
  - UI audit sekarang punya form filter terstruktur untuk arah traffic, request ID, order ID, endpoint, HTTP status, rentang tanggal, pencarian bebas, ringkasan hasil, tombol pagination prev/next, dan panel detail terpisah untuk request/response payload
  - verifikasi lokal pada `2026-05-04` lulus lewat `go test ./...`, `go build ./...`, `pnpm lint`, dan `pnpm build`
- [x] Tambahkan search/filter/pagination untuk webhook deliveries.
- catatan implementasi saat ini:
  - backend list webhook deliveries sekarang mendukung `limit`, `offset`, `status`, dan `query`
  - response list webhook deliveries sekarang membawa `meta.total`, `meta.limit`, `meta.offset`, dan `meta.has_next`
  - UI webhooks sekarang punya form search/filter, ringkasan hasil, empty state, tombol pagination prev/next, dan tetap mempertahankan panel detail serta resend
  - verifikasi runtime terakhir pada `2026-05-02` lulus dengan filter `status=success`, `query=INV-WH-OK`, halaman `5 + 2`, dan `has_next` berubah `true -> false`
- [x] Tambahkan detail view yang lebih jelas untuk payload JSON request/response.
- catatan implementasi saat ini:
  - tab audit sekarang memakai panel detail khusus untuk request/response body
  - tab webhook tetap punya panel detail delivery + attempts
  - payload utama sekarang bisa diinspeksi tanpa membuka blok JSON besar di dalam list row
- [x] Rapikan developer docs tab agar memenuhi PRD 20:
  - cara dapat token
  - contoh create transaction
  - contoh sukses
  - contoh error
  - webhook guide
  - signature verification
  - status mapping
  - idempotency
  - rate limit
- [x] Tambahkan indicator status yang konsisten sesuai PRD 8.5.
- catatan implementasi saat ini:
  - status utama store, token, transaction, dan webhook delivery sekarang memakai badge terpusat di [dashboard-status-badge.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-status-badge.tsx:1)
  - mapping saat ini membedakan `success`, `warning`, `secondary`, dan `destructive` secara konsisten lintas tab data-heavy
  - `cd dashboard && pnpm build` lulus pada `2026-05-02`
- [x] Review ulang landing page, auth, dan dashboard agar tone visual tetap konsisten dengan arah PRD.
- catatan implementasi saat ini:
  - hasil review visual pada `2026-05-03` sudah merapikan copy campuran Indonesia/Inggris di landing, auth shell, MFA, dan dashboard agar badge, tab, eyebrow, CTA, serta footer terasa satu tone produk
  - verifikasi browser lokal untuk `landing -> register -> dashboard -> MFA` lulus pada Vite `:4174` dan API `:18090`
  - copy empty state dashboard, tab workspace, quickstart docs, dan kontrol kecil seperti `copy/salin`, `rotate/rotasi`, `logout/keluar` sekarang lebih konsisten secara bahasa
  - rewrite fondasi UI berikutnya pada `2026-05-03` mengganti landing dan auth shell yang terlalu bespoke ke utility-first Tailwind, lalu memindahkan dark mode ke class `.dark` dengan bootstrap anti-FOUC di [dashboard/index.html](/home/mugiew/project/payment-platform/dashboard/index.html:1), provider di [dashboard/src/app/theme.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/theme.tsx:1), dan toggle bersama di [dashboard/src/components/theme-toggle.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/theme-toggle.tsx:1)
  - pass bersih-bersih berikutnya pada `2026-05-03` menghapus import privat `@import "shadcn/tailwind.css"` dari [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1), mengambil hanya custom variant yang benar-benar dipakai (`data-open`, `data-closed`, `data-active`, dst.), menghapus blok token `:root/.dark` duplikat dari generator, dan menambah semantic token `success/warning/info` agar mode terang/gelap punya satu source of truth
  - pass typography pada `2026-05-03` mengganti font dashboard dari paket `Figtree` ke aset lokal [digital-sans-ef.woff2](/home/mugiew/project/payment-platform/dashboard/src/fonts/digital-sans-ef.woff2:1) untuk sans dan keluarga [cascadia-mono](/home/mugiew/project/payment-platform/dashboard/src/fonts/cascadia-mono/CascadiaMono-Regular.woff2:1) untuk mono lewat `@font-face` di [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1), lalu membersihkan dependency `@fontsource-variable/figtree` dari [dashboard/package.json](/home/mugiew/project/payment-platform/dashboard/package.json:1)

### Phase C - Stack Alignment Frontend

Ini bukan blocker pertama, tetapi tetap bagian dari goal implementasi dashboard menurut PRD.

- [x] Migrasikan fetching utama ke TanStack Query.
- catatan implementasi saat ini:
  - `QueryClientProvider` sekarang hanya dipasang pada shell dashboard di [dashboard/src/routes/dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) dengan client di [dashboard/src/app/query-client.ts](/home/mugiew/project/payment-platform/dashboard/src/app/query-client.ts:1); bootstrap global di [dashboard/src/main.tsx](/home/mugiew/project/payment-platform/dashboard/src/main.tsx:1) sengaja dibuat bebas React Query agar route publik/auth tidak ikut memikul provider yang tidak mereka pakai
  - baseline read untuk `stores`, `selected store`, `api tokens`, `transactions`, `audit logs`, dan `webhook deliveries` sekarang memakai query keys/fetcher terpusat di [dashboard/src/features/dashboard/queries.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/queries.ts:1)
  - [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) tidak lagi bootstrap list utama lewat `useEffect` manual; refresh pasca mutation sekarang memakai invalidation/setQueryData
  - `cd dashboard && pnpm build` lulus pada `2026-05-03`
  - smoke runtime `register -> dashboard -> create store` lulus pada Vite `:4174` dan API `:18090` tanpa console error
- [x] Migrasikan tabel utama ke TanStack Table.
- catatan implementasi saat ini:
  - tiga tab data-heavy sekarang memakai wrapper headless bersama di [dashboard/src/features/dashboard/components/dashboard-data-table.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-data-table.tsx:1)
  - [transactions-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/transactions-panel.tsx:1), [audit-logs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/audit-logs-panel.tsx:1), [webhook-deliveries-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/webhook-deliveries-panel.tsx:1), dan [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1) sekarang memakai `@tanstack/react-table` untuk definisi kolom atau wrapper list yang sama
  - layout tabel sekarang tetap memakai CSS variable `--dashboard-table-columns`, tetapi fondasi styling-nya sudah dipindah ke [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1) yang memakai `@layer` Tailwind v4 dan class dark mode, bukan stylesheet bespoke lama
  - pass mobile lanjutan pada `2026-05-03` menambah renderer card `md:hidden` di [dashboard-data-table.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-data-table.tsx:1) dan helper ringkasan bersama di [dashboard-mobile-summary.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-mobile-summary.tsx:1), sehingga transaksi, audit log, webhook delivery, dan token tidak lagi bergantung pada horizontal scroll di layar sempit
  - smoke runtime pada `2026-05-03` dengan API `:18096` dan Vite `:4181` membuktikan `/app?tab=tokens` memuat card mobile tersembunyi untuk token `mobile-token`, dan `/app?tab=transactions` memuat empty-state mobile `Tidak ada transaksi yang cocok.` tanpa console error
  - `cd dashboard && pnpm build` diverifikasi lagi pada `2026-05-03`
- [x] Migrasikan form utama ke React Hook Form + Zod.
- catatan implementasi saat ini:
  - validasi bersama sekarang dipusatkan di [dashboard/src/lib/form-schemas.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/form-schemas.ts:1)
  - [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1), dan [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1) sekarang memakai `react-hook-form` + `zod`
  - handler di [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) sekarang menerima payload tervalidasi, bukan `FormEvent`
  - [login.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/login.tsx:1) dan [register.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/register.tsx:1) sengaja dipindah ke validator ringan di [auth-form-validation.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/auth-form-validation.ts:1) agar route auth tidak ikut memikul chunk RHF/Zod dashboard
  - flow MFA masih manual untuk sementara karena state-nya bercabang dan butuh pass terpisah
  - verifikasi browser pada `2026-05-03` lulus untuk `register -> create store -> update store -> create token -> change password -> logout -> login ulang` di Vite `:4175` dan API `:18091`
  - validasi klien `register` juga terbukti muncul saat submit kosong: `Nama wajib diisi`, `Email wajib diisi`, dan `Password minimal 8 karakter`
- [x] Pastikan penggunaan shadcn/ui konsisten di komponen utama dashboard.
- catatan implementasi saat ini:
  - panel utama dashboard sekarang ditopang wrapper [dashboard-panel-card.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-panel-card.tsx:1) yang menyamakan `Card`, `CardHeader`, `CardContent`, `CardTitle`, dan `CardDescription`
  - filter dan form lintas `overview`, `tokens`, `transactions`, `audit`, dan `webhooks` sekarang memakai primitive yang sama: [Input](/home/mugiew/project/payment-platform/dashboard/src/components/ui/input.tsx:1), [Label](/home/mugiew/project/payment-platform/dashboard/src/components/ui/label.tsx:1), [NativeSelect](/home/mugiew/project/payment-platform/dashboard/src/components/ui/native-select.tsx:1), [Button](/home/mugiew/project/payment-platform/dashboard/src/components/ui/button.tsx:1), dan [Badge](/home/mugiew/project/payment-platform/dashboard/src/components/ui/badge.tsx:1)
  - primitive tambahan dari registry resmi masih dipakai di shell dashboard untuk menu akun melalui [dropdown-menu.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/ui/dropdown-menu.tsx:1), sementara [theme-toggle.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/theme-toggle.tsx:1) sekarang sudah memakai menu ringan berbasis React state tanpa Radix agar route publik tidak ikut memikul `ui-vendor`
  - `WorkspaceHeader` juga sudah dirapikan ke pola `section cards` yang lebih dekat ke shadcn blocks, sementara surface global sekarang bertumpu pada token semantic di [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1)
  - pass `2026-05-03` juga menghapus helper button ganda dan file sidebar lama yang tidak lagi dipakai, sehingga `Button`, `Badge`, sidebar shell, dan halaman MFA sekarang berbagi primitive serta token yang sama
  - pass lanjutan pada `2026-05-03` memecah theme/hook/router export ke [use-theme.ts](/home/mugiew/project/payment-platform/dashboard/src/app/use-theme.ts:1), [theme.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/theme.tsx:1), dan [route-elements.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/route-elements.tsx:1), lalu menutup warning terakhir dengan `useWatch` di [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1) dan opt-out lokal yang eksplisit di [dashboard-data-table.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-data-table.tsx:1); `cd dashboard && pnpm lint` sekarang lulus tanpa error maupun warning
  - cleanup struktural lanjutan pada `2026-05-03` menambah primitive reusable [dashboard-callout.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-callout.tsx:1) dan [dashboard-snippet-block.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-snippet-block.tsx:1), lalu memakainya di [developer-docs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/developer-docs-panel.tsx:1), [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1), dan [profile-session-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-session-panel.tsx:1) agar callout/snippet baru tidak lagi ditulis sebagai markup bespoke berulang
- [x] Evaluasi apakah `dashboard-01` shell perlu diadopsi lebih eksplisit atau struktur sekarang cukup setara.
- kesimpulan review:
  - shell dashboard sekarang sudah mengadopsi pola literal `dashboard-01` lewat [SidebarProvider](/home/mugiew/project/payment-platform/dashboard/src/components/ui/sidebar.tsx:1), [SidebarInset](/home/mugiew/project/payment-platform/dashboard/src/components/ui/sidebar.tsx:1), [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), dan [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1)
  - frame baru tetap memuat kebutuhan produk yang sama: store selector, direktori store, form create store, header workspace, status session, tab data-heavy, dan sekarang juga theme toggle yang persist ke `localStorage`
  - verifikasi browser pada `2026-05-03` lulus di Vite `:4177` dan API `:18094`; `SidebarTrigger` menulis cookie `sidebar_state`, mode gelap menulis `paygate-theme=dark`, page `/app` tampil tanpa console error, dan loop `GET /v1/dashboard/me` dari bootstrap session sudah dihentikan di [dashboard/src/app/session.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/session.tsx:1)
  - sweep shell berikutnya pada `2026-05-03` juga menambah `title`/ellipsis affordance untuk nama store, slug, dan email panjang di [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1), [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1), dan [profile-session-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/profile-session-panel.tsx:1); smoke browser dengan store bernama panjang menunjukkan overflow non-truncate turun dari `13` node ke `5`, dan sisa temuan sekarang dominan padding container atau perilaku input native
  - pass `2026-05-03` berikutnya juga mengontrol `openMobile` di [SidebarProvider](/home/mugiew/project/payment-platform/dashboard/src/components/ui/sidebar.tsx:1) dari route utama, sehingga sheet mobile punya close button lagi dan otomatis menutup saat user pindah store atau tab workspace
- [x] Kurangi bundle awal dashboard dengan code-splitting route dan tab berat.
- catatan implementasi saat ini:
  - route utama sudah lazy-load di [dashboard/src/app/router.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/router.tsx:1) melalui `React.lazy` + `Suspense`, dengan fallback bersama di [route-loader.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/route-loader.tsx:1)
  - [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) sekarang tidak lagi menahan tab berat secara eager; `overview`, `tokens`, `transactions`, `audit`, `webhooks`, dan `docs` dimuat saat tab dibuka
  - snippet dokumentasi developer dipindah keluar dari route ke [developer-docs-content.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/developer-docs-content.ts:1) agar chunk utama workspace tidak membawa contoh curl dan payload JSON yang jarang dibuka
  - verifikasi build ulang dilakukan pada `2026-05-03` sesudah pin `pnpm@10.33.2`, sekaligus memastikan warning `DEP0169 url.parse()` dari toolchain lama tidak muncul lagi
  - pass performa lanjutan pada `2026-05-03` merapikan topology bundling di [dashboard/vite.config.ts](/home/mugiew/project/payment-platform/dashboard/vite.config.ts:1). Hasil akhir yang dipertahankan sekarang lebih sederhana dan lebih jujur terhadap runtime Rolldown: `react-vendor`, `router-data-vendor`, `ui-vendor`, dan `qrcode-vendor`, tanpa memaksa `icons-vendor` atau `query-vendor` terpisah ketika keduanya justru ikut menyerap runtime React
  - eksperimen split `forms-vendor` dibatalkan pada `2026-05-03` karena Rolldown ikut menaruh React core di chunk itu; pendekatan final sekarang membiarkan shared chunk form terbentuk alami sebagai [form-schemas.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/form-schemas.ts:1), dan hasilnya `login/register` tidak lagi mengimpor chunk RHF/Zod dashboard
  - pass berikutnya pada `2026-05-03` memindahkan form berat dari shell awal ke lazy child: [sidebar-create-store-form.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/sidebar-create-store-form.tsx:1) untuk create-store di sidebar, serta [store-overview-forms.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-forms.tsx:1) untuk pengaturan store dan ganti password; [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1) dan [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1) sekarang hanya memuat shell/read-only lebih dulu
  - pass lanjutan pada `2026-05-03` memecah form token ke [token-create-form.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/token-create-form.tsx:1), menjadikan tombol `Buka Form`/`Buka Form Store` di [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1) serta [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1) benar-benar on-demand, lalu menerapkan pola yang sama ke editor `overview` di [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1) dengan action `Buka Editor Store` dan `Buka Form Password`; hasil runtime production di Vite preview `:4187`/API `:18102` dan Vite preview `:4188`/API `:18103` membuktikan `GET /app?tab=tokens` hanya mengunduh `tokens-panel`, sedangkan `GET /app?tab=overview` hanya mengunduh `store-overview-panel`, tanpa `form-schemas`, `sidebar-create-store-form`, `token-create-form`, atau `store-overview-forms` sampai tombol editor terkait diklik
  - tipe payload token juga dipindah ke [features/dashboard/types.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/types.ts:1) agar [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1) tidak lagi menyentuh modul schema sama sekali
  - halaman MFA juga tidak lagi mengimpor `qrcode` secara eager; [mfa.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/mfa.tsx:1) sekarang baru `import('qrcode')` saat secret benar-benar digenerate
  - perbaikan `manualChunks` pada `2026-05-03` juga membuat scoped package `@radix-ui/*` tertangkap sebagai `ui-vendor` di [vite.config.ts](/home/mugiew/project/payment-platform/dashboard/vite.config.ts:1); setelah itu pass lanjutan memindahkan `TooltipProvider` dari [main.tsx](/home/mugiew/project/payment-platform/dashboard/src/main.tsx:1) ke [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1), mengganti `ThemeToggle` ke implementasi ringan tanpa Radix di [theme-toggle.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/theme-toggle.tsx:1), memakai `Slot` lokal di [slot.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/ui/slot.tsx:1), dan mengonversi ikon publik ke SVG lokal di [app-icons.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/app-icons.tsx:1)
  - pass arsitektur berikutnya pada `2026-05-03` juga menghapus `QueryClientProvider` global dari [main.tsx](/home/mugiew/project/payment-platform/dashboard/src/main.tsx:1), memindahkan provider Query ke wrapper [DashboardPage](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:1), dan membuat [session.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/session.tsx:1) membersihkan query cache lewat dynamic import saat logout/clear-session agar bootstrap publik tidak lagi butuh React Query sebagai provider global
  - hasil build terbaru `2026-05-03`: `index` `50.31 kB` (`16.23 kB` gzip), `react-vendor` `189.64 kB` (`59.64 kB` gzip), `router-data-vendor` `126.97 kB` (`40.42 kB` gzip), `ui-vendor` `90.64 kB` (`29.55 kB` gzip), `dashboard` `35.12 kB` (`10.19 kB` gzip), `qrcode-vendor` `23.47 kB` (`8.85 kB` gzip), `landing` `13.50 kB`, `login` `3.01 kB`, `register` `3.36 kB`, `token-create-form` `1.55 kB`, `sidebar-create-store-form` `2.34 kB`, `store-overview-panel` `6.58 kB`, dan `store-overview-forms` `4.56 kB`
  - smoke browser nyata pada `2026-05-03` lulus di API `:18102` + Vite preview `:4187` untuk `register -> create store -> /app?tab=tokens`, dan di API `:18103` + Vite preview `:4188` untuk `register -> create store -> /app?tab=overview`; title halaman benar, console browser bersih tanpa error/warning, dan pemeriksaan `performance.getEntriesByType('resource')` membuktikan `form-schemas` baru terunduh setelah tombol `Buka Form Store`, `Buka Form`, atau `Buka Editor Store` diklik
  - smoke preview publik lanjutan pada `2026-05-03` di Vite preview `:4191` lulus untuk route `/`; title `PayGate | Multi-tenant payment middleware` benar, console bersih, dan `performance.getEntriesByType('resource')` membuktikan route publik sekarang hanya memuat `index`, `react-vendor`, `router-data-vendor`, CSS, dan chunk `landing`, tanpa `icons-vendor`, `query-vendor`, maupun `ui-vendor`
  - smoke runtime lanjutan pada `2026-05-03` di Vite preview `:4190` dan API `:18104` juga lulus untuk `register -> /app`; title `Dashboard | PayGate` benar, shell dashboard tampil dengan sidebar aktif, console browser tetap `0` error/`0` warning, dan `ui-vendor` baru terunduh saat route dashboard memang dibuka
  - audit auth route lanjutan pada `2026-05-03` di Vite preview `:4191` membuktikan `GET /login` dan `GET /register` sekarang juga sudah lepas dari `icons-vendor`, `query-vendor`, dan `ui-vendor`; resource yang tersisa tinggal `index`, `react-vendor`, `router-data-vendor`, CSS, `auth-shell`, `auth-form-validation`, `input`, `label`, dan chunk route masing-masing

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
- [x] Tambahkan smoke test operasional untuk alur lokal:
  - migrate
  - api start
  - worker start
  - dashboard build
  - charge sandbox
  - webhook inbound
  - webhook relay
- catatan implementasi saat ini:
  - script ada di [scripts/operational_smoke.sh](/home/mugiew/project/payment-platform/scripts/operational_smoke.sh:1)
  - memakai fake Midtrans lokal + callback collector lokal lewat [backend/cmd/smoke-support/main.go](/home/mugiew/project/payment-platform/backend/cmd/smoke-support/main.go:1)
  - migration dijalankan di schema PostgreSQL temporer agar tidak bentrok dengan data dev aktif
  - smoke terakhir lulus dengan artefak:
    - `transaction_id`: `56d33aeb-85e1-4092-8e93-9a99b47b0bbd`
    - `order_id`: `smoke-order-1777727858`
    - `platform_order_id`: `smoke-1777727858_smoke-order-1777727858`
    - `final_status`: `paid`
    - `relay_status`: `success`
    - `callback_count`: `1`

### Phase E - Documentation and Release Readiness

- [x] Sinkronkan [README.md](/home/mugiew/project/payment-platform/README.md) dengan state fitur terbaru.
- [x] Lengkapi OpenAPI examples untuk request/response utama.
- [x] Tambahkan contoh curl end-to-end untuk store developer.
- [x] Tambahkan runbook testing Midtrans sandbox.
- catatan implementasi saat ini:
  - OpenAPI operational examples ditambahkan untuk create/rotate token, charge, get transaction, Midtrans webhook, webhook delivery list/detail/resend
  - contoh curl end-to-end ada di [docs/store-api-end-to-end.md](/home/mugiew/project/payment-platform/docs/store-api-end-to-end.md)
  - runbook sandbox ada di [docs/midtrans-sandbox-runbook.md](/home/mugiew/project/payment-platform/docs/midtrans-sandbox-runbook.md)
  - docs tab dashboard sudah memuat token, charge, success/error, webhook guide, signature verification, status mapping, idempotency, dan rate limit
- [x] Tambahkan checklist release internal:
  - env production wajib
  - secret management
  - HTTPS
  - callback URL policy
  - MFA production check
- catatan implementasi saat ini:
  - checklist ada di [docs/internal-release-checklist.md](/home/mugiew/project/payment-platform/docs/internal-release-checklist.md)
  - mencakup env production wajib, secret management, HTTPS/public exposure, SQL audit callback URL non-HTTPS, MFA production gate, dan release sign-off operasional
  - README sudah menunjuk ke dokumen checklist release internal

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
- owner store atau admin dashboard yang bisa akses
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

- [x] User bisa register, login, logout, refresh, lihat profil, dan ganti password.
- [x] User bisa membuat store, edit store, nonaktifkan store, lihat/rotate webhook secret.
- [x] User bisa membuat token, revoke token, rotate token.
- [x] Store backend bisa charge transaction ke Midtrans sandbox via platform.
- [x] Idempotency conflict/replay benar.
- [x] Midtrans webhook valid mengubah status transaksi.
- [x] Midtrans webhook invalid tidak diproses.
- [x] Webhook relay ke toko ditandatangani dan retry 20s x 10.
- [x] Manual resend berjalan.
- [x] Audit log lengkap dan masked.
- [x] Dashboard bisa menampilkan store, token, transaction, audit, webhook delivery.
- [x] Developer docs lengkap.
- [x] OpenAPI lengkap.
- [x] Tidak ada data bocor antar store.
- [x] Local bootstrap dan Docker Compose runbook jelas.

Catatan final gate saat ini:

- acceptance smoke lokal terakhir pada `2026-05-03` lulus lewat [scripts/operational_smoke.sh](/home/mugiew/project/payment-platform/scripts/operational_smoke.sh:1) dengan bukti:
  - auth lifecycle: register, `GET /me`, refresh, logout, login ulang, change password, dan login dengan password baru
  - store admin: create, patch, view secret, rotate secret, dan deactivate
  - token lifecycle: create, rotate, revoke, dan verifikasi status `revoked_at`
  - idempotency: replay payload sama mengembalikan `transaction_id` yang sama, payload berbeda pada `order_id` yang sama gagal `TRANSACTION_CONFLICT`
  - webhook: invalid signature ditolak `401`, valid webhook mengubah status ke `paid`, relay store membawa `X-Webhook-Signature`
  - resend: delivery yang dipaksa `failed_permanently` bisa di-`POST /resend` lalu sukses dikirim ulang
  - isolation: user/store kedua mendapat `404` saat mencoba membaca store dan transaksi milik tenant pertama
- verifikasi idempotency lanjutan pada `2026-05-04` menutup gap implementasi PRD 9.4:
  - charge tanpa header `Idempotency-Key` sekarang gagal eksplisit `400 VALIDATION_ERROR` dengan pesan `Missing Idempotency-Key header.`
  - replay dengan `Idempotency-Key` dan payload yang sama mengembalikan `transaction_id` yang sama
  - reuse `Idempotency-Key` untuk payload berbeda sekarang gagal `409 TRANSACTION_CONFLICT` dengan pesan `Idempotency-Key already exists with different payload.`
  - smoke query ke audit log lokal menunjukkan outbound Midtrans charge tetap `1`, jadi replay tidak memanggil Midtrans kedua kali
- verifikasi `retry 20s x 10` saat ini ditopang dua bukti:
  - runtime smoke membuktikan relay bertanda tangan dan alur resend bekerja
  - default worker tetap `20s` dan `10` attempt dari [webhookdelivery/service.go](/home/mugiew/project/payment-platform/backend/internal/app/webhookdelivery/service.go:26) dan [worker/main.go](/home/mugiew/project/payment-platform/backend/cmd/worker/main.go:68)
- verifikasi Midtrans sandbox sungguhan pada VPS lulus pada `2026-05-03` dengan artefak:
  - hostname publik `https://paygate.digixsolution.net` sudah aktif lewat service `cloudflared-paygate` yang sekarang memakai config ingress khusus ke API `127.0.0.1:18080`, sehingga tidak lagi terbaca sebagai fallback `404` milik tunnel lain
  - pass deploy berikutnya pada `2026-05-03` juga sudah membuat dashboard publik hidup pada origin yang sama tanpa service frontend tambahan di VPS: binary API sekarang melayani `dashboard/dist` langsung, sehingga `GET /` dan `GET /login` mengembalikan UI `200`, sementara `GET /v1/dashboard/me` tetap `401` tanpa bearer token
  - verifikasi browser publik setelah deploy dashboard menunjukkan title `PayGate | Multi-tenant payment middleware`, hero `Satu kontrol panel untuk store, token, charge, audit trail, dan webhook relay.`, dan `0` console error/`0` warning
  - backend charge nyata sukses untuk `order_id` `INV-E2E2-1777801580`, `platform_order_id` `agent-midtrans-e2e2-1777801580_INV-E2E2-1777801580`, `transaction_id` platform `2e3cd987-0eed-4d6f-9acf-9d448b5dd994`, dan `midtrans_transaction_id` `1e78c079-a6e3-4ac8-96c9-7f158902d3cc`
  - charge awal mengembalikan status `pending` dengan VA BCA `40291605754720141125068`, lalu setelah simulasi pembayaran Midtrans status lokal berubah menjadi `paid` dengan `paid_at` `2026-05-03T17:46:32+08:00`
  - log API production mencatat inbound webhook Midtrans `POST /v1/webhooks/midtrans` sukses pada `2026-05-03 17:46:22 +08:00` dan `2026-05-03 17:46:33 +08:00`
  - callback store sementara menerima relay `pending` lalu `paid`, keduanya membawa `X-Webhook-Signature`; contoh delivery `paid` memakai `X-Webhook-Id` `b6ccaf48-9bb1-4efd-abcd-91a92201827a`
  - untuk sandbox tanpa akses dashboard MAP, backend sekarang mendukung env opsional `MIDTRANS_OVERRIDE_NOTIFICATION_URLS` yang meneruskan header `X-Override-Notification` ke Midtrans; env ini dipakai di VPS dengan nilai `https://paygate.digixsolution.net/v1/webhooks/midtrans`
  - collector callback sementara dijalankan di port `19090` hanya selama test dan sudah dimatikan kembali setelah verifikasi selesai
- bootstrap lokal backend sekarang lebih defensif: [config.Load()](/home/mugiew/project/payment-platform/backend/internal/config/config.go:1) otomatis membaca `.env` atau `backend/.env` untuk command lokal seperti `go run ./cmd/migrate up`, `go run ./cmd/api`, dan `go run ./cmd/worker`, sehingga shell tidak wajib `source .env` manual

## 9. Suggested Working Order

Jika AI ingin langsung eksekusi tanpa diskusi tambahan, pakai urutan ini:

1. Jalankan final release review memakai [docs/internal-release-checklist.md](/home/mugiew/project/payment-platform/docs/internal-release-checklist.md), karena gate Midtrans sandbox nyata sudah tertutup.
2. Review ulang env production internal, terutama `DASHBOARD_ALLOWED_ORIGINS`, `MIDTRANS_OVERRIDE_NOTIFICATION_URLS`, dan secret rotation plan sebelum go-live yang lebih permanen.
3. Setelah itu, baru rapikan residual non-blocker seperti lint/polish frontend jika masih ada.

Catatan release sign-off:

- draft audit konkret VPS setelah verifikasi Midtrans ada di [docs/vps-release-signoff-2026-05-03.md](/home/mugiew/project/payment-platform/docs/vps-release-signoff-2026-05-03.md:1)
- hardening edge `2026-05-03` sudah menutup exposure publik `GET /metrics` dan `GET /healthz` di `paygate.digixsolution.net`; sisa pekerjaan release yang lebih permanen sekarang bergeser ke commit SHA final, monitoring internal, dan governance secret
- deploy dashboard publik `2026-05-03` sekarang juga sudah menutup gap akses hostname utama: `paygate.digixsolution.net` tidak lagi hanya mengembalikan bootstrap JSON API, tetapi melayani landing page, `/login`, `/register`, dan route SPA dashboard dari binary API yang sama; tunnel edge tetap cukup mengarah ke `127.0.0.1:18080`
- follow-up bundle fix pada `2026-05-03` juga menutup bug deploy frontend terakhir: [dashboard/src/lib/env.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/env.ts:1) sekarang otomatis mengabaikan `VITE_API_BASE_URL` loopback seperti `http://localhost:8080` bila dashboard sedang dijalankan dari origin publik, sehingga login web di `paygate.digixsolution.net` benar-benar menembak API publik dan tidak lagi gagal `ERR_CONNECTION_REFUSED`
- fix navigasi dashboard berikutnya pada `2026-05-03` juga menutup regression UX untuk akun tanpa store: [dashboard.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/dashboard.tsx:270) tidak lagi memaksa `tab=overview` setiap kali daftar store kosong, jadi klik sidebar seperti `Token API`, `Transaksi`, `Audit Log`, `Webhook`, atau `Dokumentasi API` sekarang tetap stay di tab yang dipilih dan menampilkan empty state yang benar
- follow-up akses admin pada `2026-05-03` sekarang juga mengaktifkan scope dashboard global untuk `role=admin`: [backend/internal/app/store/service.go](/home/mugiew/project/payment-platform/backend/internal/app/store/service.go:78), [backend/internal/app/token/service.go](/home/mugiew/project/payment-platform/backend/internal/app/token/service.go:70), [backend/internal/app/transaction/service.go](/home/mugiew/project/payment-platform/backend/internal/app/transaction/service.go:584), dan [backend/internal/app/webhookdelivery/service.go](/home/mugiew/project/payment-platform/backend/internal/app/webhookdelivery/service.go:448) tidak lagi membatasi store/token/transaksi/audit/webhook ke `user_id` pemilik bila principal dashboard ber-role `admin`; user biasa tetap mempertahankan isolasi tenant lama
- sinkronisasi env berikutnya pada `2026-05-03` juga sudah menyamakan VPS dengan `.env` lokal untuk `MIDTRANS_ENV=production`, `MIDTRANS_API_BASE_URL=https://api.midtrans.com/v2`, dan mengosongkan `MIDTRANS_OVERRIDE_NOTIFICATION_URLS`; konsekuensinya, verifikasi lanjutan harus diperlakukan sebagai live production check yang terkontrol, bukan sandbox lagi
- controlled smoke production pada `2026-05-03 18:51 +08:00` menemukan blocker merchant config: create charge `bank_transfer` BCA untuk `order_id` `PROD-SMOKE-1777805469` menerima payload Midtrans `status_code=402` dengan pesan `Payment channel is not activated.`
- follow-up kode langsung ditutup di [backend/internal/integration/midtrans/client.go](/home/mugiew/project/payment-platform/backend/internal/integration/midtrans/client.go:1) dan [backend/internal/integration/midtrans/client_test.go](/home/mugiew/project/payment-platform/backend/internal/integration/midtrans/client_test.go:1): payload Midtrans non-`2xx` sekarang diperlakukan sebagai error meski HTTP transport-nya `201`, jadi API tidak lagi menyimpan transaksi `unknown` palsu saat channel payment production belum aktif
- verifikasi pasca-deploy patch di VPS lulus pada `2026-05-03 19:00 +08:00`: smoke `order_id` `PROD-SMOKE-FIX-1777806000` menghasilkan `POST /v1/transactions/charge -> 502 MIDTRANS_ERROR`, `GET /v1/transactions/PROD-SMOKE-FIX-1777806000 -> 404`, dan query SQL di VPS mengonfirmasi `0` row transaksi lokal untuk order tersebut

Catatan verifikasi terbaru:

- operational smoke lokal terakhir lulus pada `2026-05-02` dengan artefak:
  - `transaction_id`: `727e2a47-9e9d-4872-9288-9e85ef9ed6fc`
  - `order_id`: `smoke-order-1777728617`
  - `platform_order_id`: `smoke-1777728617_smoke-order-1777728617`
  - `final_status`: `paid`
- `relay_status`: `success`
- `callback_count`: `1`
- smoke lokal ini membuktikan success metrics PRD 22 untuk alur inti lokal: pembuatan store dan token, create transaction, audit trail, webhook inbound, perubahan status, relay webhook, dan retry worker/metrics baseline
- success metric PRD 22 nomor 3 sekarang sudah tertutup oleh verifikasi Midtrans sandbox nyata di VPS pada `2026-05-03`; detail audit lanjutannya ada di [docs/vps-release-signoff-2026-05-03.md](/home/mugiew/project/payment-platform/docs/vps-release-signoff-2026-05-03.md:1)
- success metrics terkait dashboard completeness dan isolasi data antar store sekarang sudah tertutup lokal melalui audit browser dan acceptance smoke `2026-05-03`
- blocker go-live production yang tersisa sekarang spesifik: aktifkan payment channel Midtrans production yang ingin dipakai, lalu ulangi live smoke terkontrol setelah deploy patch logical error handling di atas
- dengan patch di atas sudah aktif di VPS, blocker production sekarang bukan lagi perilaku API, tetapi konfigurasi merchant Midtrans production

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
