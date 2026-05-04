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

### 3.0 Frontend Reset Note `2026-05-04`

- [x] Frontend `dashboard/` sudah direbuild ke stack `Svelte 5 + Vite + Bun + shadcn-svelte`.
- [x] Blok shadcn yang dipakai sebagai fondasi visual sekarang sudah terpasang dan dipetakan ke UI PayGate:
  - `calendar-01`
  - `otp-01`
  - `signup-01`
  - `login-01`
  - `sidebar-01`
  - `dashboard-01`
- [x] Route shell frontend yang sekarang aktif ada di [dashboard/src/lib/router.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/router.ts:1) dan halaman Svelte ada di [dashboard/src/lib/pages](/home/mugiew/project/payment-platform/dashboard/src/lib/pages).
- [x] Catatan React/TSX lama di dokumen ini sekarang harus dibaca sebagai konteks historis, bukan representasi frontend aktif saat ini.
- [x] Referensi command frontend lama seperti `pnpm lint`, `pnpm test`, atau `pnpm build` di bagian histori bawah dokumen tidak lagi menjadi sumber instruksi aktif; gunakan `bun run check` dan `bun run build` sebagai command resmi saat ini.

### 3.0.1 Verification Snapshot `2026-05-04`

- [x] Auth/session frontend sudah terhubung ke backend nyata: bootstrap session, refresh token, login, register, logout, redirect guard, dan flow MFA verify/setup aktif di [dashboard/src/lib/auth/session.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/auth/session.ts:1) dan [dashboard/src/App.svelte](/home/mugiew/project/payment-platform/dashboard/src/App.svelte:1).
- [x] Dashboard Svelte sekarang memuat data backend nyata untuk store, token, transaksi, webhook delivery, audit log, dan docs di [dashboard-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/dashboard-page.svelte:1).
- [x] Area `Profil & Sesi` di dashboard Svelte sekarang sudah benar-benar usable pada route `/app/profile`: footer user sidebar tidak lagi melempar toast placeholder, route aktif sudah masuk di [dashboard/src/lib/router.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/router.ts:1), panel baru hidup di [profile-session-panel.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/profile-session-panel.svelte:1), dan flow ini tidak lagi bergantung pada store/workspace fetch agar tetap bisa dipakai saat operator hanya ingin refresh sesi, logout, melihat MFA status, atau mengganti password.
- [x] Hardening quality pass `2026-05-04` untuk dashboard Svelte juga sudah diterapkan:
  - panel `Profil & Sesi` sekarang memakai primitive shadcn secara lebih idiomatis di [profile-session-panel.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/profile-session-panel.svelte:1): `Avatar`, `Card`, `Badge`, `Field`, `Input`, `Button`, dan `Separator`
  - UX ganti password sekarang punya rule checklist inline, disable state yang lebih aman, dan feedback success/error yang lebih jelas
  - footer akun di sidebar sekarang juga memakai `Avatar` shadcn agar pola UI lebih konsisten
  - fetch workspace di [dashboard-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/dashboard-page.svelte:1) sudah di-scope per tab aktif, sehingga page `transactions`, `webhooks`, `audit`, `stores`, `docs`, dan `profile` tidak lagi melakukan overfetch data yang tidak dipakai
- [x] Hardening UI affordance dan developer docs juga sudah dinaikkan pada `2026-05-04`:
  - primitive [button.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/ui/button/button.svelte:1) dan [checkbox.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/ui/checkbox/checkbox.svelte:1) sekarang punya affordance visual yang lebih tegas, sehingga CTA utama, tombol outline, dan kontrol centang terasa benar-benar interaktif
  - form login/register sekarang memakai area checkbox yang lebih jelas, lebih mudah dipahami, dan lebih aman untuk user non-teknis di [login-form.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/login-form.svelte:1) dan [signup-form.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/signup-form.svelte:1)
  - tab dokumentasi dashboard tidak lagi berupa dua blok contoh statis; sekarang diganti panel referensi API merchant-facing di [api-docs-panel.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/api-docs-panel.svelte:1) dengan konten terpisah di [paygate-api.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/content/paygate-api.ts:1)
  - referensi docs sekarang hanya menampilkan kontrak yang memang dipakai client/store: `POST /v1/transactions/charge`, `GET /v1/transactions/{order_id}`, `GET /v1/audit-logs`, dan payload webhook ke callback URL toko, lengkap dengan method badge, header, body/query fields, response, dan contoh request untuk `curl`, `JavaScript`, `PHP`, `Go`, dan `Rust`
  - bootstrap title SPA juga sudah diperketat di [App.svelte](/home/mugiew/project/payment-platform/dashboard/src/App.svelte:1) dan [dashboard/index.html](/home/mugiew/project/payment-platform/dashboard/index.html:1), sehingga direct load ke `/login`, `/register`, `/verify`, dan `/app/*` tidak lagi mewarisi title default generik `Dashboard`
  - overview metric `Webhook Gagal` tidak lagi menampilkan toast placeholder; sekarang card itu langsung membawa operator ke tab Webhook yang relevan
  - font monospace untuk code, token prefix, request ID, dan blok payload sekarang memakai `Fira Code` dari dependency lokal [dashboard/package.json](/home/mugiew/project/payment-platform/dashboard/package.json:1) lewat [app.css](/home/mugiew/project/payment-platform/dashboard/src/app.css:1)
- [x] Placeholder dan dummy UX yang tersisa juga sudah disapu lagi pada `2026-05-04`:
  - header dashboard sekarang punya pencarian global nyata di [global-search-sheet.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/global-search-sheet.svelte:1) dan [dashboard-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/dashboard-page.svelte:1); query bisa mencari store, transaksi, webhook delivery, dan audit log dari backend aktif, termasuk shortcut `Cmd/Ctrl + K`
  - tombol notifikasi header, indikator webhook di sidebar, dan tombol `Lihat semua` overview tidak lagi inert atau misleading; semuanya sekarang menuju tab yang relevan dan hanya menampilkan badge failure saat memang ada webhook yang butuh perhatian
  - halaman login tidak lagi memuat toggle environment palsu; info koneksi sekarang membaca host backend aktif dari [runtime.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/api/runtime.ts:1), dan halaman kontak tidak lagi memalsukan submit sukses karena sekarang menyiapkan draft email yang benar-benar bisa dikirim user dari client mail mereka
  - dokumentasi integrasi merchant sekarang sudah lebih dekat ke PRD section 20 dan route backend nyata: ditambah checklist onboarding, endpoint `GET /v1/audit-logs`, response error, status mapping, idempotency behavior, rate limit behavior, serta contoh verifikasi webhook signature multi-bahasa
  - komponen contoh yang tidak dipakai dan masih berisi toast demo sudah dihapus dari `dashboard/src/lib/components/` agar codebase lebih bersih dan tidak menyesatkan agent berikutnya
- [x] Catatan handoff untuk agent berikutnya sekarang juga tersedia di [AI_NEXT_JOURNEY.md](/home/mugiew/project/payment-platform/AI_NEXT_JOURNEY.md:1) agar konteks produk, gap riil, dan urutan kerja bernilai tinggi tetap terbaca tanpa harus menebak dari histori commit.
- [x] Public copy polish `2026-05-04` berikutnya juga sudah membuat halaman publik dan handoff lebih production-grade:
  - [signup-form.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/signup-form.svelte:1), [register-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/register-page.svelte:1), [about-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/about-page.svelte:1), dan [contact-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/contact-page.svelte:1) tidak lagi menonjolkan label `MVP` atau copy yang terdengar seperti produk belum siap dipakai; copy sekarang menekankan onboarding merchant, retry webhook, arah produk, dan support yang relevan
  - FAQ publik di [paygate.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/content/paygate.ts:1) kini menjawab pricing/aktivasi merchant dan kebutuhan backend toko dengan bahasa operasional yang lebih jujur dan lebih selaras dengan guardrail server-to-server pada PRD
  - fallback panel detail di [dashboard-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/dashboard-page.svelte:1) sekarang memberi arahan aksi yang nyata, bukan pesan generik `Detail belum tersedia`
  - [AI_NEXT_JOURNEY.md](/home/mugiew/project/payment-platform/AI_NEXT_JOURNEY.md:1) sekarang memuat gap analysis berbasis persona PRD, daftar fitur yang masih kurang, saran nilai plus produk, dan urutan kerja AI berikutnya yang lebih konkret
- [x] Repo-level operability sudah selaras dengan stack aktif: `.env.example`, `docker-compose.yml`, `README.md`, [scripts/operational_smoke.sh](/home/mugiew/project/payment-platform/scripts/operational_smoke.sh:1), [scripts/production_readiness.sh](/home/mugiew/project/payment-platform/scripts/production_readiness.sh:1), dan runbook internal sudah memakai `bun`, bukan `pnpm`.
- [x] Fondasi deploy VPS sekarang juga sudah ada: [backend/.env.production.example](/home/mugiew/project/payment-platform/backend/.env.production.example:1), [scripts/verify_production_env.sh](/home/mugiew/project/payment-platform/scripts/verify_production_env.sh:1), [scripts/build_release_bundle.sh](/home/mugiew/project/payment-platform/scripts/build_release_bundle.sh:1), [deploy/README.md](/home/mugiew/project/payment-platform/deploy/README.md:1), dan template [deploy/systemd](/home/mugiew/project/payment-platform/deploy/systemd).
- [x] `./scripts/production_readiness.sh` lulus penuh pada `2026-05-04`, termasuk backend test/build, `cd dashboard && bun run check`, `cd dashboard && bun run build`, dan `./scripts/operational_smoke.sh`.
- [x] Browser smoke build produksi lulus pada `2026-05-04` untuk `/`, `/about`, `/contact`, `/privacy`, `/login`, `/register`, serta guest redirect `/verify -> /login` dan `/app -> /login` dengan `0` error / `0` warning console.
- [x] Verifikasi frontend tambahan untuk perbaikan `Profil & Sesi` lulus pada `2026-05-04`:
  - `cd dashboard && bun run check`
  - `cd dashboard && bun run build`
- [x] Smoke test build preview lokal setelah hardening `2026-05-04` juga lulus:
  - `/` menampilkan title `PayGate — Payment Middleware untuk Multi-Toko`
  - `/login` menampilkan title `Masuk — PayGate`
  - `/app/profile` sebagai guest redirect ke `/login`
  - console browser `0` error dan `0` warning
- [x] Verifikasi lokal tambahan setelah refresh affordance form dan rewrite dokumentasi API juga lulus:
  - `cd dashboard && bun run check`
  - `cd dashboard && bun run build`
- [x] Smoke preview publik lokal setelah sweep placeholder `2026-05-04` juga lulus:
  - `/login` menampilkan title `Masuk — PayGate`, tidak lagi memuat toggle environment palsu, dan console browser `0` error / `0` warning
  - `/contact` menampilkan title `Kontak — PayGate`, CTA utama berubah menjadi `Buka Draft Email`, dan console browser `0` error / `0` warning
  - `/app` sebagai guest tetap redirect ke `/login` tanpa error console
- [x] Smoke preview publik lokal setelah public copy polish `2026-05-04` juga lulus:
  - `/register` menampilkan title `Daftar — PayGate`; label `Gratis untuk MVP` sudah hilang dan diganti copy onboarding merchant yang lebih production-grade
  - `/about` menampilkan title `Tentang — PayGate`; section `Arah Produk` kini memakai status yang lebih operasional (`Aktif`, `Prioritas Tinggi`, `Evaluasi`, `Perencanaan`)
  - `/contact` menampilkan title `Kontak — PayGate`; intro form sekarang menekankan draft email lengkap agar konteks order/request tidak hilang saat user menghubungi support
  - `/app` sebagai guest tetap redirect ke `/login`
  - console browser pada route yang dites tetap `0` error dan `0` warning
- [x] Port preview `4173` selalu ditutup kembali setelah verifikasi browser selesai.
- [x] Helper deploy baru juga sudah diverifikasi pada `2026-05-04`:
  - `./scripts/verify_production_env.sh backend/.env.production.example` lulus
  - `./scripts/build_release_bundle.sh` menghasilkan archive `artifacts/releases/payment-platform-20260504T071247Z-c8a2263-dirty.tar.gz`
- [x] Rollout source code ke VPS target sudah dilakukan beberapa kali pada `2026-05-04`; deploy backend penuh sebelumnya sudah mencakup `git pull --ff-only origin main`, rebuild `dashboard/dist`, rebuild binary `bin/paygate-api` dan `bin/paygate-worker`, serta restart service `paygate-api.service` dan `paygate-worker.service` saja.
- [ ] Sisa prerequisite go-live production yang bukan bug aplikasi: aktivasi payment channel Midtrans pada merchant production target. Rollout env/source code untuk VPS target `paygate.digixsolution.net` sudah selesai; yang tersisa sekarang terutama kesiapan merchant dan operasional payment production.

### 3.0.2 Live VPS Snapshot `2026-05-04`

- [x] Deploy PayGate live ke VPS `paygate.digixsolution.net` lulus tanpa menyentuh aplikasi lain; service yang disentuh hanya `paygate-api.service` dan `paygate-worker.service`, sedangkan `cloudflared-bola788-api.service` tidak diubah.
- [x] Checkout VPS `/home/mugiew/apps/midtrans-middleware` sekarang sudah sinkron ke commit `4e0f038` pada branch `main`.
- [x] Backup pra-deploy dibuat di `/home/mugiew/backups/paygate-20260504T152318` sebelum binary runtime di-overwrite.
- [x] Verifikasi env production pada VPS lulus dengan command `./scripts/verify_production_env.sh backend/.env`; satu-satunya warning adalah `DASHBOARD_DIST_DIR` kosong, tetapi runtime tetap valid karena API memakai lookup relatif `../dashboard/dist`.
- [x] Verifikasi service pasca-restart lulus:
  - `systemctl is-active paygate-api.service paygate-worker.service` mengembalikan `active`
  - log boot API mengonfirmasi `dashboard static assets enabled`
  - `curl -fsS http://127.0.0.1:18080/healthz` mengembalikan `success=true` dengan status Postgres dan Redis `up`
- [x] Verifikasi domain publik `https://paygate.digixsolution.net` lulus:
  - browser check untuk `/login` menampilkan title `Masuk — PayGate`
  - browser check untuk `/` menampilkan title `PayGate — Payment Middleware untuk Multi-Toko`
  - browser check untuk `/app` sebagai guest redirect ke `/login`
  - console browser `0` error dan `0` warning
  - alur register baru, setup MFA, dan buka `/app/docs` juga sudah tervalidasi di browser publik; title route docs benar, referensi API tampil lengkap, dan console tetap `0` error / `0` warning
- [x] Deploy frontend-only terbaru pada `2026-05-04` untuk commit `4e0f038` juga lulus tanpa restart service karena perubahan hanya di shell SPA/title bootstrap; langkah yang dijalankan cukup `git pull`, `bun install --frozen-lockfile`, `bun run build`, lalu verifikasi domain publik ulang.

### 3.1 Milestone Status

- Milestone 1: `done`
- Milestone 2: `done`
- Milestone 3: `done`
- Milestone 4: `done`
- Milestone 5: `done`
- Milestone 6: `done` di level aplikasi, verifikasi lokal, dan deploy VPS `paygate.digixsolution.net`; sisa pekerjaan production nyata sekarang dominan pada konfigurasi merchant/payment channel operasional

### 3.2 Yang Sudah Hidup

- Backend auth dashboard, store CRUD, token create/revoke, store API auth, rate limit
- Charge transaction ke Midtrans sandbox
- Midtrans webhook inbound + status mapping + `transaction_events`
- Webhook relay worker + retry + resend manual
- Dashboard Svelte login/register/MFA/store/token/transaction/audit/webhook/docs dengan data backend nyata
- Migration runner lokal di `backend/cmd/migrate`
- Bootstrap lokal `migrate -> api -> worker -> dashboard`
- Release sign-off lokal `./scripts/production_readiness.sh`
- Browser smoke build produksi untuk public/auth/guarded routes

### 3.3 Gap Utama Terhadap PRD

Item di bawah ini belum selesai atau belum terverifikasi sebagai sesuai PRD:

- Tidak ada blocker aplikasi lokal yang tersisa untuk MVP inti setelah verifikasi `2026-05-04`.
- Review production allowed origins, secret rotation plan, dan env merchant tetap wajib dijalankan lewat release checklist sebelum go-live final.
- Aktivasi payment channel Midtrans production di merchant tujuan masih harus dipastikan, karena itu berada di luar source code aplikasi.
- Histori React/TSX di dokumen ini belum dibersihkan total; gunakan subsection `3.0` dan `3.0.1` sebagai acuan frontend aktif.

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
- [x] Blokir store-facing API dari request browser publik sesuai PRD 14.
- catatan implementasi saat ini:
  - middleware guard ada di [backend/internal/transport/http/middleware/store_browser_block.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/middleware/store_browser_block.go:1)
  - router store-facing `/v1` sekarang memasang guard ini sebelum auth token di [backend/internal/transport/http/server.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/server.go:138)
  - request yang membawa `Origin` atau header `Sec-Fetch-*` sekarang ditolak `403 BROWSER_REQUEST_BLOCKED`, sehingga store API token hanya bisa dipakai server-to-server
  - test unit ada di [backend/internal/transport/http/middleware/store_browser_block_test.go](/home/mugiew/project/payment-platform/backend/internal/transport/http/middleware/store_browser_block_test.go:1)
  - runtime smoke lokal pada `2026-05-04` lulus: `POST /v1/transactions/charge` dengan token store valid + header `Origin: https://malicious.example.com` dikembalikan `403` dengan code `BROWSER_REQUEST_BLOCKED`
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

- [x] Rebuild shell frontend `dashboard/` agar selaras dengan stack baru dan arahan visual PRD.
- catatan implementasi saat ini:
  - shell publik dan auth sekarang hidup di [landing-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/landing-page.svelte:1), [about-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/about-page.svelte:1), [contact-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/contact-page.svelte:1), [privacy-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/privacy-page.svelte:1), [login-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/login-page.svelte:1), [register-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/register-page.svelte:1), dan [verify-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/verify-page.svelte:1)
  - dashboard utama sekarang hidup di [dashboard-page.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/pages/dashboard-page.svelte:1) dengan blok shadcn yang sudah diadaptasi di [app-sidebar.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/app-sidebar.svelte:1), [site-header.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/site-header.svelte:1), [section-cards.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/section-cards.svelte:1), [chart-area-interactive.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/chart-area-interactive.svelte:1), dan [data-table.svelte](/home/mugiew/project/payment-platform/dashboard/src/lib/components/data-table.svelte:1)
  - helper motion dan styling global sekarang disatukan di [dashboard/src/app.css](/home/mugiew/project/payment-platform/dashboard/src/app.css:1), sedangkan content mock dan legal/frontend copy yang dipakai lintas halaman ada di [dashboard/src/lib/content/paygate.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/content/paygate.ts:1)
  - verifikasi lokal `2026-05-04` lulus dengan:
    - `cd dashboard && bun run check`
    - `cd dashboard && bun run build`
    - smoke browser untuk `/`, `/about`, `/contact`, `/privacy`, `/login`, `/register`, `/verify`, dan `/app` via Vite `127.0.0.1:4173` dengan `0` error console
  - port dev `4173` sudah ditutup kembali setelah smoke test selesai

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
  - `Store list` dan `Create store` sekarang juga punya page canonical sendiri, bukan hanya state di sidebar: `/app/stores` untuk direktori tenant dan `/app/stores/new` untuk form tenant baru
  - label tab `Store` lama sekarang dipertegas menjadi `Pengaturan Store`, sehingga page settings tenant tidak lagi rancu dengan page direktori atau pembuatan store
  - verifikasi browser lokal `2026-05-04` lulus untuk direct-open `/app/stores` dan `/app/stores/new`; title sinkron (`Direktori Store | PayGate` dan `Buat Store | PayGate`), page direktori bisa membuka store ke route `/app/stores/:storeId`, dan console tetap `0` error / `0` warning
  - page `Direktori Store` sekarang juga punya search client-side dan filter status (`all`, `active`, `inactive`) di [store-directory-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-directory-panel.tsx:1), lengkap dengan summary jumlah hasil dan empty state saat filter tidak menemukan tenant
  - verifikasi browser lokal `2026-05-04` lulus untuk kombinasi `search -> status filter -> empty state -> reset filter` pada `/app/stores`; summary berubah dari `2` ke `1` lalu `0` hasil sesuai filter, empty state tampil saat kombinasi filter tidak punya match, reset mengembalikan kedua store, dan console tetap `0` error / `0` warning
  - page `Direktori Store` sekarang juga mengikuti arah PRD 8.5 yang lebih data-heavy: desktop memakai table paginated, mobile tetap memakai card summary, dan operator bisa berpindah halaman tanpa kehilangan filter aktif
  - bug shared wrapper di [dashboard-data-table.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-data-table.tsx:1) juga sudah ditutup pada `2026-05-04`; ketika `renderMobileCard` dipakai, table desktop sekarang tetap ikut dirender (`hidden md:block`) sehingga panel Tokens, Transactions, Audit Logs, Webhook, dan Store Directory tidak lagi jatuh ke mobile-card-only di layar lebar
  - verifikasi browser lokal `2026-05-04` lulus untuk skenario `7 store` pada `/app/stores`: desktop table menampilkan header `Store/Status/Domain/Callback Default/Diupdate/Aksi`, halaman pertama menampilkan `1-6 dari 7`, tombol `Berikutnya` berpindah ke `7-7 dari 7`, filter `inactive + Store 7` menyisakan `1` row yang benar, reset kembali ke halaman pertama, dan console tetap `0` error / `0` warning
  - smoke lanjutan pada `2026-05-04` juga memverifikasi route desktop lain yang memakai wrapper ini: `/app/stores/:storeId/tokens`, `/app/stores/:storeId/audit`, `/app/stores/:storeId/transactions`, dan `/app/stores/:storeId/webhooks` semuanya kembali menampilkan header table desktop yang benar, row data/empty-state dirender di dalam table, title route sinkron, dan console tetap `0` error / `0` warning
  - guardrail frontend untuk area ini sekarang juga hidup lewat `pnpm test`: [dashboard-data-table.test.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-data-table.test.tsx:1) membuktikan mobile card + desktop table dirender bersamaan, sedangkan [store-directory-panel.test.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-directory-panel.test.tsx:1) mengunci search/filter/reset/pagination direktori store
  - refactor lanjutan pada `2026-05-04` juga memindahkan helper routing workspace ke [workspace-routing.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/workspace-routing.ts:1), sehingga `dashboard.tsx` tidak lagi menyimpan sekaligus daftar tab, builder destination, resolver route, dan formatter context title/status
  - refactor berikutnya pada `2026-05-04` juga memindahkan blok query orchestration ke [use-dashboard-workspace-queries.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/use-dashboard-workspace-queries.ts:1), sehingga `dashboard.tsx` tidak lagi memikul detail fetch/queryKey/meta/loading/error untuk stores, tokens, transactions, audit logs, webhook deliveries, dan detail panel sekaligus
  - browser smoke pascarefactor query hook pada `2026-05-04` lulus untuk `/app/stores/:storeId/tokens`, `/app/stores/:storeId/audit`, `/app/stores/:storeId/transactions`, dan `/app/stores/:storeId/webhooks`; title route tetap sinkron, header table desktop tetap muncul, dan console tetap `0` error / `0` warning
  - browser smoke setelah refactor helper lulus untuk `/app/profile`, `/app/stores`, dan buka store dari direktori ke `/app/stores/:storeId`; title tetap sinkron dan console tetap `0` error / `0` warning
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
  - pass visual lanjutan pada `2026-05-04` mendorong halaman marketing dan auth jauh lebih dekat ke kualitas referensi HTML target: [landing.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/landing.tsx:1) sekarang memakai hero editorial + control-plane architecture panel + feature hierarchy yang lebih berani; [auth-shell.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/auth-shell.tsx:1) sekarang punya panel kiri berbasis arsitektur multi-store yang lebih premium; [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1), [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1), dan [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1) juga dinaikkan ke arah control-room yang lebih tegas
  - token surface global di [index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:475) ikut diperkuat supaya panel marketing dan dashboard tidak terasa flat
  - verifikasi pasca-pass `2026-05-04` lulus dengan `cd dashboard && pnpm lint`, `cd dashboard && pnpm build`, browser screenshot manual untuk `/` dan `/login`, serta console browser `0` error / `0` warning pada preview `:4173`
  - copy empty state dashboard, tab workspace, quickstart docs, dan kontrol kecil seperti `copy/salin`, `rotate/rotasi`, `logout/keluar` sekarang lebih konsisten secara bahasa
  - rewrite fondasi UI berikutnya pada `2026-05-03` mengganti landing dan auth shell yang terlalu bespoke ke utility-first Tailwind, lalu memindahkan dark mode ke class `.dark` dengan bootstrap anti-FOUC di [dashboard/index.html](/home/mugiew/project/payment-platform/dashboard/index.html:1), provider di [dashboard/src/app/theme.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/theme.tsx:1), dan toggle bersama di [dashboard/src/components/theme-toggle.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/theme-toggle.tsx:1)
  - pass bersih-bersih berikutnya pada `2026-05-03` menghapus import privat `@import "shadcn/tailwind.css"` dari [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1), mengambil hanya custom variant yang benar-benar dipakai (`data-open`, `data-closed`, `data-active`, dst.), menghapus blok token `:root/.dark` duplikat dari generator, dan menambah semantic token `success/warning/info` agar mode terang/gelap punya satu source of truth
  - pass typography pada `2026-05-03` mengganti font dashboard dari paket `Figtree` ke aset lokal [digital-sans-ef.woff2](/home/mugiew/project/payment-platform/dashboard/src/fonts/digital-sans-ef.woff2:1) untuk sans dan keluarga [cascadia-mono](/home/mugiew/project/payment-platform/dashboard/src/fonts/cascadia-mono/CascadiaMono-Regular.woff2:1) untuk mono lewat `@font-face` di [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1), lalu membersihkan dependency `@fontsource-variable/figtree` dari [dashboard/package.json](/home/mugiew/project/payment-platform/dashboard/package.json:1)
  - pass redesign besar pada `2026-05-04` menaikkan level visual landing, auth shell, workspace shell, dan tab data-heavy agar lebih dekat ke PRD 8.2/8.5: [landing.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/landing.tsx:1), [auth-shell.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/auth-shell.tsx:1), [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1), [store-overview-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-overview-panel.tsx:1), [store-directory-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/store-directory-panel.tsx:1), [tokens-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/tokens-panel.tsx:1), [transactions-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/transactions-panel.tsx:1), [audit-logs-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/audit-logs-panel.tsx:1), [webhook-deliveries-panel.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/webhook-deliveries-panel.tsx:1), [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1), dan token visual global di [index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1)
  - pass ini juga mulai memakai dependency PRD yang sebelumnya belum tersentuh: `motion` untuk entrance/float microinteraction dan `recharts` untuk hero/control-room charts, dengan helper agregasi baru di [insights.ts](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/insights.ts:1) dan wrapper render aman di [chart-stage.tsx](/home/mugiew/project/payment-platform/dashboard/src/components/ui/chart-stage.tsx:1)
  - koreksi kontras lanjutan pada `2026-05-04` merapikan fondasi Tailwind v4 supaya shell utama tidak lagi memakai gradient berbasis `--foreground`/`--sidebar-foreground` yang membalik menjadi terang di dark mode; [index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1) sekarang punya token dashboard eksplisit untuk `:root` dan `.dark` (`dashboard-panel`, `dashboard-header`, `dashboard-hero`, `dashboard-sidebar-*`) plus class `@layer components` seperti `dashboard-shell-card`, `dashboard-hero-surface`, `dashboard-sidebar-hero`, dan `dashboard-header-surface`, lalu [auth-shell.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/auth-shell.tsx:1), [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1), [dashboard-app-sidebar.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-app-sidebar.tsx:1), dan [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1) disambungkan ke token itu
  - warning Recharts awal pada preview lokal juga sudah ditutup dengan migrasi ke mode `responsive` bawaan Recharts v3, sehingga smoke browser `2026-05-04` untuk `landing`, `login`, dan `register` sekarang kembali `0` error / `0` warning
  - verifikasi akhir `2026-05-04`: `cd dashboard && pnpm lint`, `pnpm test`, `pnpm build`, dan `./scripts/production_readiness.sh` semuanya lulus setelah pass visual baru; cleanup test juga tidak meninggalkan port `4173`
  - verifikasi tambahan kontras pada `2026-05-04` lulus di preview lokal `:4173`: route `/login` tetap terbaca di `light` dan `dark`, title sinkron (`Masuk Dashboard | PayGate`), hero shell memakai background gelap yang stabil dengan copy/badge yang tetap terbaca, dan preview dibersihkan lagi setelah pengecekan
  - pass redesign publik lanjutan pada `2026-05-04` mengganti fondasi page marketing ke shell bersama yang lebih konsisten dan lebih dekat ke referensi visual produk: [site-shell.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/marketing/components/site-shell.tsx:1) sekarang menangani navbar/footer/mobile menu/hash scroll, [section-heading.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/marketing/components/section-heading.tsx:1) dipakai lintas page, [landing.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/landing.tsx:1) ditulis ulang total, dan route publik baru [about.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/about.tsx:1), [contact.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/contact.tsx:1), dan [privacy.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/privacy.tsx:1) sekarang aktif lewat [router.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/router.tsx:1) + [route-elements.tsx](/home/mugiew/project/payment-platform/dashboard/src/app/route-elements.tsx:1)
  - pass yang sama juga merombak [auth-shell.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/auth-shell.tsx:1), [login.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/login.tsx:1), [register.tsx](/home/mugiew/project/payment-platform/dashboard/src/routes/register.tsx:1), dan validator [auth-form-validation.ts](/home/mugiew/project/payment-platform/dashboard/src/lib/auth-form-validation.ts:1) agar flow auth lebih user-friendly: split layout kiri/kanan, input berikon, bantuan akses yang relevan, serta validasi konfirmasi password + persetujuan privacy di register
  - tone visual global juga dihangatkan pada `2026-05-04` lewat update token di [dashboard/src/styles/index.css](/home/mugiew/project/payment-platform/dashboard/src/styles/index.css:1) ke palette stone/charcoal + emerald, termasuk helper baru `marketing-chip`, `marketing-panel`, `marketing-panel-strong`, serta penyelarasan lanjutan untuk [dashboard-site-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/dashboard-site-header.tsx:1) dan [workspace-header.tsx](/home/mugiew/project/payment-platform/dashboard/src/features/dashboard/components/workspace-header.tsx:1)
  - verifikasi pass publik/auth ini lulus pada `2026-05-04`: `cd dashboard && pnpm lint`, `pnpm test`, `pnpm build`, lalu smoke browser via preview `:4173` untuk `/`, `/about`, `/contact`, `/privacy`, `/login`, dan `/register`; semua route memuat title yang benar, console `0` error / `0` warning, dan port preview ditutup kembali setelah pengecekan

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
  - release sign-off sekarang juga punya entrypoint satu command di [scripts/production_readiness.sh](/home/mugiew/project/payment-platform/scripts/production_readiness.sh:1) yang menjalankan backend test/build, `cd dashboard && bun run check`, `cd dashboard && bun run build`, lalu `operational_smoke`
  - verifikasi nyata `2026-05-04` untuk `./scripts/production_readiness.sh` lulus penuh: backend test hijau, backend build hijau, dashboard `bun run check` hijau, dashboard `bun run build` hijau, `operational_smoke` lulus dengan `final_status=paid`, `relay_status=success`, `callback_count=2`, dan cleanup tidak meninggalkan port `18080/18082/18083/19091` maupun schema `smoke_*`
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

- operational smoke lokal terakhir lulus pada `2026-05-04` dengan artefak:
  - `transaction_id`: `87f7f4d3-5dae-418d-a30d-6b6a06bf0d0e`
  - `order_id`: `smoke-order-1777877966`
  - `platform_order_id`: `smoke-1777877966_smoke-order-1777877966`
  - `final_status`: `paid`
  - `relay_status`: `success`
  - `callback_count`: `2`
- production readiness lokal terakhir juga lulus pada `2026-05-04` lewat `./scripts/production_readiness.sh`
- smoke browser build produksi `2026-05-04` untuk `/`, `/about`, `/contact`, `/privacy`, `/login`, `/register`, guest redirect `/verify`, dan guest redirect `/app` lulus dengan `0` error / `0` warning console, lalu preview `:4173` ditutup kembali
- smoke lokal ini membuktikan success metrics PRD 22 untuk alur inti lokal: pembuatan store dan token, create transaction, audit trail, webhook inbound, perubahan status, relay webhook, retry worker/metrics baseline, serta kesiapan shell frontend aktif
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
