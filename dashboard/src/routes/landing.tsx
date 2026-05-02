import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { env } from '@/lib/env'

type ThemeMode = 'light' | 'dark'
type ToastTone = 'info' | 'success' | 'error'

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

const navItems = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Developer', href: '#developer' },
  { label: 'Keamanan', href: '#keamanan' },
]

const stats = [
  { value: '1 gateway', label: 'Akun Midtrans pusat' },
  { value: '10x retry', label: 'Webhook delivery retry' },
  { value: '60 rpm', label: 'Limit per token' },
  { value: '300 rpm', label: 'Limit per toko' },
]

const featureCards = [
  {
    mark: 'TK',
    title: 'Token per toko',
    body: 'Setiap toko membawa secret token sendiri. Hash disimpan di database dan token bisa di-revoke kapan saja.',
  },
  {
    mark: 'SG',
    title: 'Server key tersembunyi',
    body: 'Toko tidak pernah melihat Midtrans Server Key. Platform yang berbicara langsung ke Core API.',
  },
  {
    mark: 'AL',
    title: 'Audit log menyeluruh',
    body: 'Request toko, outbound ke Midtrans, response, webhook, dan error penting tercatat dengan masking data sensitif.',
  },
  {
    mark: 'WH',
    title: 'Webhook relay aman',
    body: 'Webhook dari Midtrans diverifikasi lebih dulu lalu diteruskan ke callback toko memakai signature platform.',
  },
  {
    mark: 'RT',
    title: 'Retry yang terukur',
    body: 'Jika callback toko gagal, worker akan mengulang setiap 20 detik sampai maksimal 10 attempt.',
  },
  {
    mark: 'RL',
    title: 'Rate limiting siap pakai',
    body: 'Redis membatasi traffic per token dan per toko agar abuse tidak mengganggu operasional tenant lain.',
  },
]

const flowSteps = [
  {
    index: '01',
    title: 'Backend toko mengirim payload custom',
    body: 'Integrasi toko cukup mengirim order, amount, customer, item, dan Idempotency-Key ke Store API.',
  },
  {
    index: '02',
    title: 'Platform memvalidasi request',
    body: 'Token diverifikasi, rate limit diperiksa, dan idempotency lock dipasang sebelum request diteruskan.',
  },
  {
    index: '03',
    title: 'Audit dan mapping berjalan',
    body: 'Payload asli disimpan dengan masking yang tepat lalu diubah menjadi format Midtrans Core API.',
  },
  {
    index: '04',
    title: 'Charge diteruskan ke Midtrans',
    body: 'Platform berbicara ke Midtrans dengan kredensial pusat dan hanya mengembalikan data yang aman ke toko.',
  },
  {
    index: '05',
    title: 'Status transaksi dipersist',
    body: 'Transaksi, platform order ID, metadata, dan response Midtrans disimpan di PostgreSQL untuk audit dan debugging.',
  },
  {
    index: '06',
    title: 'Webhook diterima lalu direlay',
    body: 'Inbound webhook diverifikasi, status diupdate, lalu worker mengirim callback ke toko dengan retry terkontrol.',
  },
]

const developerChecks = [
  'Payload charge tetap sederhana dan tidak memaksa toko memahami seluruh format Midtrans.',
  'Idempotency-Key dipakai untuk mencegah double charge pada request yang berulang.',
  'Response error membawa code, message, dan request_id agar debugging lebih cepat.',
  'Webhook platform dirancang terpisah dari credential Midtrans pusat.',
]

const securityCards = [
  {
    mark: 'HS',
    title: 'Token hashing',
    body: 'Secret token toko tidak disimpan plaintext. Verifikasi dilakukan dengan hash dan pepper server-side.',
  },
  {
    mark: 'SV',
    title: 'Signature verification',
    body: 'Webhook Midtrans diverifikasi dengan signature resmi dan webhook ke toko ditandatangani ulang oleh platform.',
  },
  {
    mark: 'MS',
    title: 'Masking data sensitif',
    body: 'Authorization header, server key, webhook secret, password, dan field sensitif lain tidak disimpan mentah di audit log.',
  },
  {
    mark: 'TI',
    title: 'Tenant isolation',
    body: 'Setiap query dashboard dan Store API difilter berdasarkan store_id sehingga tenant tidak saling melihat data.',
  },
  {
    mark: 'TL',
    title: 'Timeout dan limit',
    body: 'HTTP client ke Midtrans dan callback toko memakai timeout, dengan payload size guard untuk mengurangi abuse.',
  },
  {
    mark: 'TR',
    title: 'Tracing end-to-end',
    body: 'request_id mengikat log aplikasi, audit log, dan error response untuk pelacakan lintas service.',
  },
]

const stackCards = [
  { code: 'GO', title: 'Go + Chi', detail: 'REST API dan middleware inti' },
  { code: 'PG', title: 'PostgreSQL', detail: 'Source of truth transaksi dan audit' },
  { code: 'RD', title: 'Redis', detail: 'Queue, rate limit, cache, lock' },
  { code: 'AQ', title: 'Asynq', detail: 'Worker retry untuk webhook relay' },
  { code: 'RV', title: 'React + Vite', detail: 'Dashboard dan public surface' },
  { code: 'TS', title: 'TypeScript', detail: 'Typing yang rapi di frontend' },
  { code: 'MT', title: 'Midtrans Core API', detail: 'Charge dan notification upstream' },
  { code: 'DC', title: 'Docker Compose', detail: 'Local runtime untuk semua service' },
]

const requestSnippet = `POST /v1/transactions/charge
Authorization: Bearer sk_test_xxx
Idempotency-Key: inv-2026-0001
Content-Type: application/json

{
  "order_id": "INV-2026-0001",
  "amount": 150000,
  "currency": "IDR",
  "payment_type": "bank_transfer",
  "bank": "bca",
  "customer": {
    "name": "Budi",
    "email": "budi@example.com"
  }
}`

const responseSnippet = `{
  "success": true,
  "data": {
    "transaction_id": "trx_uuid",
    "order_id": "INV-2026-0001",
    "platform_order_id": "store-123_INV-2026-0001",
    "status": "pending",
    "payment_type": "bank_transfer",
    "amount": 150000,
    "midtrans": {
      "transaction_id": "midtrans_trx_id",
      "va_numbers": [
        { "bank": "bca", "va_number": "1234567890" }
      ]
    }
  }
}`

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem('theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function BrandMark() {
  return (
    <span className="landing-brand-mark" aria-hidden="true">
      <span>PG</span>
    </span>
  )
}

type SectionHeadingProps = {
  eyebrow: string
  title: string
  body: string
  center?: boolean
}

function SectionHeading({ eyebrow, title, body, center = false }: SectionHeadingProps) {
  return (
    <header className={`landing-section-heading${center ? ' is-center' : ''}`} data-reveal>
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </header>
  )
}

type CodeCardProps = {
  tone: string
  label: string
  title: string
  code: string
  onCopy: () => void
}

function CodeCard({ tone, label, title, code, onCopy }: CodeCardProps) {
  return (
    <article className="landing-code-card" data-reveal>
      <div className="landing-code-card__header">
        <div className="landing-code-card__meta">
          <span className={`landing-code-card__tone tone-${tone}`}>{label}</span>
          <strong>{title}</strong>
        </div>
        <button type="button" className="landing-copy-button" onClick={onCopy}>
          Copy
        </button>
      </div>
      <pre>{code}</pre>
    </article>
  )
}

export function LandingPage() {
  const [theme, setTheme] = useState<ThemeMode>(() => getPreferredTheme())
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutIds = useRef(new Set<number>())

  const healthURL = useMemo(() => new URL('/healthz', env.apiBaseURL).toString(), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 18)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -48px 0px',
      },
    )

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timeoutStore = timeoutIds.current

    return () => {
      timeoutStore.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutStore.clear()
    }
  }, [])

  const pushToast = (message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((items) => [...items, { id, message, tone }])

    const timeoutId = window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
      timeoutIds.current.delete(timeoutId)
    }, 4200)

    timeoutIds.current.add(timeoutId)
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      pushToast('Snippet berhasil disalin.', 'success')
    } catch {
      pushToast('Clipboard tidak tersedia di browser ini.', 'error')
    }
  }

  return (
    <>
      <div className="landing-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`landing-toast tone-${toast.tone}`} key={toast.id}>
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
            >
              Close
            </button>
          </div>
        ))}
      </div>

      <nav className={`landing-nav${navScrolled ? ' is-scrolled' : ''}`}>
        <div className="landing-shell landing-nav__inner">
          <a className="landing-brand" href="#top">
            <BrandMark />
            <span>PayGate</span>
          </a>

          <div className="landing-nav__links" aria-label="Primary">
            {navItems.map((item) => (
              <a className="landing-nav__link" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="landing-nav__actions">
            <button
              type="button"
              className="landing-icon-button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <Link className="landing-ghost-button hide-mobile" to="/login">
              Masuk
            </Link>
            <Link className="landing-primary-button compact-mobile" to="/register">
              Daftar Gratis
            </Link>
            <button
              type="button"
              className="landing-icon-button show-mobile"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        <div className={`landing-mobile-menu${mobileMenuOpen ? ' is-open' : ''}`}>
          <div className="landing-shell landing-mobile-menu__inner">
            {navItems.map((item) => (
              <a
                className="landing-mobile-menu__link"
                href={item.href}
                key={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="landing-mobile-menu__actions">
              <Link className="landing-ghost-button" to="/login">
                Masuk
              </Link>
              <Link className="landing-primary-button" to="/register">
                Daftar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="landing-page" id="top">
        <section className="landing-hero">
          <div className="landing-shell landing-hero__grid">
            <div className="landing-hero__copy">
              <span className="landing-status-pill" data-reveal>
                Multi-tenant payment middleware untuk Midtrans Core API
              </span>
              <h1 data-reveal>
                Satu gateway untuk
                <span> banyak toko yang butuh pembayaran rapi.</span>
              </h1>
              <p data-reveal>
                PayGate menyembunyikan credential Midtrans pusat, memetakan payload
                custom menjadi Core API, menyimpan audit log lengkap, dan meneruskan
                webhook ke toko Anda dengan signature platform sendiri.
              </p>

              <div className="landing-hero__actions" data-reveal>
                <Link className="landing-primary-button" to="/register">
                  Mulai Gratis
                </Link>
                <a className="landing-secondary-button" href="#developer">
                  Lihat Alur Developer
                </a>
              </div>

              <div className="landing-hero__support" data-reveal>
                <a href={healthURL} rel="noreferrer" target="_blank">
                  Buka healthcheck API
                </a>
                <span>{healthURL}</span>
              </div>
            </div>

            <div className="landing-flow-card" data-reveal>
              <div className="landing-flow-card__header">
                <span>Runtime flow</span>
                <strong>Store API to Midtrans</strong>
              </div>
              <div className="landing-flow-card__body">
                <div className="landing-flow-node tone-store">
                  <span className="landing-flow-node__mark">SB</span>
                  <strong>Store Backend</strong>
                  <small>Bearer sk_test_xxx</small>
                </div>
                <div className="landing-flow-link">
                  <span>Custom payload</span>
                </div>
                <div className="landing-flow-node tone-platform">
                  <span className="landing-flow-node__mark">PG</span>
                  <strong>PayGate API</strong>
                  <small>Validate, audit, map</small>
                </div>
                <div className="landing-flow-link">
                  <span>Core API charge</span>
                </div>
                <div className="landing-flow-node tone-midtrans">
                  <span className="landing-flow-node__mark">MT</span>
                  <strong>Midtrans</strong>
                  <small>Server key tetap private</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats">
          <div className="landing-shell landing-stats__grid">
            {stats.map((item, index) => (
              <article className="landing-stat-card" data-reveal key={item.label} style={{ transitionDelay: `${index * 80}ms` }}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="fitur">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Fitur Utama"
              title="Dirancang untuk toko, operator platform, dan developer."
              body="Middleware ini bukan hanya proxy pembayaran. Ia menjadi boundary operasional yang aman antara tenant dan Midtrans."
              center
            />

            <div className="landing-feature-grid">
              {featureCards.map((item, index) => (
                <article className="landing-feature-card" data-reveal key={item.title} style={{ transitionDelay: `${index * 70}ms` }}>
                  <span className="landing-feature-card__mark">{item.mark}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section muted-surface" id="cara-kerja">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Cara Kerja"
              title="Setiap pembayaran melewati jalur yang bisa diaudit."
              body="Alur charge dibuat eksplisit agar idempotency, observability, dan keamanan tenant tidak bergantung pada asumsi tersembunyi."
              center
            />

            <div className="landing-steps">
              {flowSteps.map((step, index) => (
                <article className="landing-step" data-reveal key={step.index} style={{ transitionDelay: `${index * 70}ms` }}>
                  <div className="landing-step__index">{step.index}</div>
                  <div className="landing-step__body">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="developer">
          <div className="landing-shell landing-developer">
            <div className="landing-developer__copy">
              <SectionHeading
                eyebrow="Developer First"
                title="Payload tetap sederhana, kontrol tetap penuh."
                body="Anda tidak perlu menulis adapter Midtrans di setiap toko. Platform mengonsolidasikan validasi, mapping, audit, dan response formatting."
              />

              <div className="landing-check-list">
                {developerChecks.map((item, index) => (
                  <div className="landing-check-item" data-reveal key={item} style={{ transitionDelay: `${index * 70}ms` }}>
                    <span>OK</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-code-stack">
              <CodeCard
                tone="emerald"
                label="POST"
                title="/v1/transactions/charge"
                code={requestSnippet}
                onCopy={() => handleCopy(requestSnippet)}
              />
              <CodeCard
                tone="slate"
                label="201"
                title="Response"
                code={responseSnippet}
                onCopy={() => handleCopy(responseSnippet)}
              />
            </div>
          </div>
        </section>

        <section className="landing-section" id="keamanan">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Keamanan"
              title="Boundary multi-tenant yang defensif."
              body="Setiap komponen penting dibangun dengan asumsi bahwa toko tidak boleh melihat credential pusat, data tenant lain, atau detail sensitif yang tidak perlu."
              center
            />

            <div className="landing-security-grid">
              {securityCards.map((item, index) => (
                <article className="landing-security-card" data-reveal key={item.title} style={{ transitionDelay: `${index * 70}ms` }}>
                  <span className="landing-security-card__mark">{item.mark}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section muted-surface">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Tech Stack"
              title="Stack yang dipilih untuk payment system yang eksplisit."
              body="Go dan PostgreSQL menjaga jalur transaksi tetap predictable. Redis dan worker memegang beban asynchronous yang sensitif terhadap retry."
              center
            />

            <div className="landing-stack-grid">
              {stackCards.map((item, index) => (
                <article className="landing-stack-card" data-reveal key={item.title} style={{ transitionDelay: `${index * 60}ms` }}>
                  <span>{item.code}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-shell">
            <div className="landing-cta__panel" data-reveal>
              <span className="landing-eyebrow">Siap Integrasi</span>
              <h2>Bangun banyak toko di atas satu payment control plane.</h2>
              <p>
                Auth dashboard, store management, token management, transaksi,
                audit log, dan webhook delivery viewer sekarang sudah tersedia
                di dashboard aplikasi.
              </p>
              <div className="landing-cta__actions">
                <Link className="landing-primary-button" to="/register">
                  Daftar Sekarang
                </Link>
                <a className="landing-secondary-button inverted" href="#developer">
                  Baca Format API
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-shell landing-footer__grid">
          <div className="landing-footer__brand">
            <a className="landing-brand" href="#top">
              <BrandMark />
              <span>PayGate</span>
            </a>
            <p>Multi-tenant payment middleware untuk Midtrans Core API.</p>
          </div>

          <div>
            <h3>Produk</h3>
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#keamanan">Keamanan</a>
          </div>

          <div>
            <h3>Developer</h3>
            <a href="#developer">Contoh payload</a>
            <a href={healthURL} rel="noreferrer" target="_blank">
              Healthcheck API
            </a>
            <button type="button" onClick={() => pushToast('Halaman dokumentasi penuh belum dibuat.', 'info')}>
              Dokumentasi lengkap
            </button>
          </div>

          <div>
            <h3>Perusahaan</h3>
            <button type="button" onClick={() => pushToast('Halaman company belum dibuat.', 'info')}>
              Tentang
            </button>
            <button type="button" onClick={() => pushToast('Kontak publik belum dibuat.', 'info')}>
              Kontak
            </button>
            <button type="button" onClick={() => pushToast('Privacy page belum dibuat.', 'info')}>
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="landing-shell landing-footer__bottom">
          <p>2026 PayGate. Payment middleware untuk operasi multi-store yang lebih rapi.</p>
          <span>Light and dark mode, mobile nav, reveal animation, and copyable API snippets.</span>
        </div>
      </footer>
    </>
  )
}
