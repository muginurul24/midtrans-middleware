# PayGate Dashboard

Dashboard operator untuk `payment-platform`, dibangun dengan `Svelte 5 + Vite + Bun + shadcn-svelte`.

## Stack

- Svelte 5
- Vite 8
- Bun 1.3+
- Tailwind CSS 4
- shadcn-svelte

## Menjalankan Lokal

```bash
cp .env.example .env
bun install
bun run dev
```

Default local URL:

- dashboard: `http://localhost:5173`
- API backend: `http://localhost:8080`

## Environment

Hanya satu env frontend yang wajib untuk mode lokal:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Jika dashboard production dilayani pada origin yang sama dengan API, env ini boleh dikosongkan saat deploy karena frontend akan fallback ke `window.location.origin`.

## Commands

```bash
bun run dev
bun run check
bun run build
bun run preview
```

## Catatan

- Public pages aktif: `/`, `/about`, `/contact`, `/privacy`
- Auth pages aktif: `/login`, `/register`, `/verify`
- App shell aktif: `/app`
- Session bootstrap, refresh token, dan MFA sudah terhubung ke backend dashboard API
