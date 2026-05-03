import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CopyIcon, ExternalLinkIcon, ShieldCheckIcon, WorkflowIcon } from '@/components/app-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useDocumentTitle } from '@/lib/use-document-title'

const navItems = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Integrasi', href: '#integrasi' },
  { label: 'Keamanan', href: '#keamanan' },
]

const stats = [
  { value: '1 gateway pusat', label: 'Server key Midtrans tetap di backend platform' },
  { value: '10x retry', label: 'Webhook relay diulang terukur sampai permanen gagal' },
  { value: '60 rpm', label: 'Limit default per token store' },
  { value: '300 rpm', label: 'Limit default per store' },
]

const features = [
  {
    title: 'Token per toko',
    body: 'Setiap tenant memakai token sendiri. Secret asli hanya ditampilkan sekali dan hash disimpan di backend.',
  },
  {
    title: 'Charge lewat satu gateway pusat',
    body: 'Backend toko cukup mengirim payload charge yang sederhana tanpa melihat Midtrans server key.',
  },
  {
    title: 'Audit log lengkap',
    body: 'Request, response, retry webhook, dan error penting tercatat dengan masking field sensitif.',
  },
  {
    title: 'Webhook relay aman',
    body: 'Inbound webhook diverifikasi lebih dulu, lalu platform menandatangani ulang callback ke store.',
  },
]

const flowSteps = [
  'Backend store mengirim charge request dengan `Authorization` token dan `Idempotency-Key`.',
  'Platform memvalidasi token, rate limit, idempotency, dan payload sebelum meneruskan request.',
  'Platform memetakan payload ke Midtrans Core API, menyimpan audit log, lalu melakukan charge.',
  'Status transaksi disimpan ke PostgreSQL dan webhook relay dikirim ke callback store dengan retry worker.',
]

const securityItems = [
  'Token store di-hash, bukan disimpan sebagai plaintext.',
  'Webhook Midtrans diverifikasi sebelum update status transaksi lokal.',
  'Audit log mem-mask password, authorization header, webhook secret, dan key sensitif.',
  'Query dashboard selalu terikat `store_id` untuk menjaga isolasi tenant.',
]

const requestSnippet = `POST /v1/transactions/charge
Authorization: Bearer sk_store_xxx
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
    "platform_order_id": "store-123_INV-2026-0001",
    "status": "pending",
    "midtrans": {
      "transaction_id": "midtrans_trx_id"
    }
  }
}`

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="grid gap-3">
      <Badge variant="secondary" className="w-fit">
        {eyebrow}
      </Badge>
      <div className="grid gap-3">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">{title}</h2>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function SnippetCard({
  copied,
  code,
  label,
  onCopy,
  title,
}: {
  copied: boolean
  code: string
  label: string
  onCopy: () => void
  title: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <Badge variant="outline" className="w-fit">
              {label}
            </Badge>
            <CardTitle>{title}</CardTitle>
          </div>
          <Button onClick={onCopy} size="sm" type="button" variant="outline">
            <CopyIcon className="size-4" />
            {copied ? 'Tersalin' : 'Salin'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="overflow-x-auto p-5 text-xs leading-6 text-muted-foreground">{code}</pre>
      </CardContent>
    </Card>
  )
}

export function LandingPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useDocumentTitle('PayGate | Multi-tenant payment middleware')

  const handleCopy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current))
    }, 1800)
  }

  return (
    <main className="pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.03em]" to="/">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-xs font-black uppercase tracking-[0.18em] text-primary-foreground">
              PG
            </span>
            <span>PayGate</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="ghost">
              <Link to="/login">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Buat Akun</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Badge variant="success" className="w-fit">
            Middleware pembayaran multi-tenant
          </Badge>
          <div className="grid gap-4">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] md:text-6xl">
              Satu kontrol panel untuk store, token, charge, audit trail, dan webhook relay.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              PayGate menempatkan Midtrans di belakang platform Anda. Tenant hanya melihat Store API yang lebih aman,
              sementara dashboard memberi observability yang rapi untuk operasional harian.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                Mulai dari dashboard
                <WorkflowIcon className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#integrasi">Lihat alur integrasi</a>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {stats.map((item) => (
              <Card className="bg-card/80" key={item.label}>
                <CardContent className="grid gap-2 p-5">
                  <strong className="text-xl font-semibold">{item.value}</strong>
                  <p className="text-sm leading-6 text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <Badge variant="outline" className="w-fit">
              Ringkasan sistem
            </Badge>
            <CardTitle>Alur charge sampai webhook relay</CardTitle>
            <CardDescription>
              Frontend ini bukan demo kosong. Flow di bawah mengikuti kontrak backend yang sudah ada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <strong>Store Backend</strong>
                <Badge variant="secondary">Token + Idempotency-Key</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Request charge datang dengan payload yang dipermudah untuk tenant.
              </p>
            </div>
            <div className="grid gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <strong>PayGate Platform</strong>
                <Badge variant="success">Validasi + persist + relay</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Platform memvalidasi token, menyimpan audit log, lalu memanggil Midtrans dengan server key pusat.
              </p>
            </div>
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <strong>Midtrans + Callback Store</strong>
                <Badge variant="outline">Verify + retry</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Webhook Midtrans diverifikasi, status transaksi diupdate, lalu callback store dikirim ulang bila gagal.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Dashboard publik dan API production berjalan pada origin yang sama. Endpoint observability internal seperti
              ` /healthz ` dan ` /metrics ` sengaja tidak diekspos ke internet publik.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 md:px-6" id="fitur">
        <SectionHeading
          body="Empat kemampuan inti yang paling berpengaruh ke operasional tenant dan tim internal."
          eyebrow="Fitur"
          title="Dashboard dibangun untuk pekerjaan operasional nyata, bukan showcase visual."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((item) => (
            <Card className="h-full" key={item.title}>
              <CardHeader>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 md:px-6" id="cara-kerja">
        <SectionHeading
          body="Urutan ini sama dengan perilaku backend yang sedang Anda bangun, jadi dokumentasi publiknya tetap nyambung dengan implementasi."
          eyebrow="Cara Kerja"
          title="Alur tenant dibuat sesederhana mungkin di depan, tetapi tetap ketat di belakang."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {flowSteps.map((step, index) => (
            <Card className="h-full" key={step}>
              <CardContent className="grid gap-3 p-5">
                <Badge variant="secondary" className="w-fit">
                  Langkah {index + 1}
                </Badge>
                <p className="text-sm leading-6 text-muted-foreground">{step}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 md:px-6" id="integrasi">
        <SectionHeading
          body="Contoh ini menunjukkan shape request yang dikirim tenant dan shape response aman yang dikembalikan platform."
          eyebrow="Integrasi"
          title="Store API tetap tipis dan mudah diadopsi oleh backend merchant."
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="grid gap-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Checklist integrasi</CardTitle>
                <CardDescription>
                  Hal yang paling sering dibutuhkan developer saat mulai menghubungkan backend store.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
                {[
                  'Gunakan token store, bukan server key Midtrans.',
                  'Selalu kirim `Idempotency-Key` untuk mencegah double charge.',
                  'Simpan `request_id` dari error response untuk debugging.',
                  'Verifikasi webhook platform memakai secret store Anda.',
                ].map((item) => (
                  <div className="flex gap-3" key={item}>
                    <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            <SnippetCard
              code={requestSnippet}
              copied={copiedKey === 'request'}
              label="Request"
              onCopy={() => void handleCopy('request', requestSnippet)}
              title="Charge API"
            />
            <SnippetCard
              code={responseSnippet}
              copied={copiedKey === 'response'}
              label="Response"
              onCopy={() => void handleCopy('response', responseSnippet)}
              title="Response aman untuk tenant"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 md:px-6" id="keamanan">
        <SectionHeading
          body="Security posture dashboard tidak bergantung pada kata-kata marketing. Poin di bawah mengikuti hal yang memang sudah dibangun di backend."
          eyebrow="Keamanan"
          title="Tenant isolation, masking, signature verification, dan retry behavior tetap terlihat jelas bagi operator."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {securityItems.map((item) => (
            <Card key={item}>
              <CardContent className="flex gap-3 p-5">
                <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
        <Card className="overflow-hidden bg-primary text-primary-foreground">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div className="grid gap-3">
              <Badge variant="secondary" className="w-fit bg-white/15 text-white">
                Siap dipakai internal
              </Badge>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em]">
                Mulai dari dashboard untuk membuat store, token, dan observability tenant pertama.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-primary-foreground/80">
                Kalau Anda ingin memeriksa flow terlebih dulu, login ke dashboard lalu buat store uji untuk melihat token,
                transaksi, audit log, dan webhook deliveries di satu tempat.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary">
                <Link to="/register">Buat akun dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">
                  Masuk
                  <ExternalLinkIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
