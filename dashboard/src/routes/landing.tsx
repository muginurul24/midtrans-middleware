import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, Cell } from 'recharts'
import { ArrowRight, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react'

import { CopyIcon, ExternalLinkIcon } from '@/components/app-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartStage } from '@/components/ui/chart-stage'
import { ThemeToggle } from '@/components/theme-toggle'
import { buildDeliveryStatusDistribution, buildTransactionTimeline, formatCurrencyShort } from '@/features/dashboard/insights'
import { useDocumentTitle } from '@/lib/use-document-title'

const navItems = [
  { label: 'Keunggulan', href: '#keunggulan' },
  { label: 'Control Room', href: '#control-room' },
  { label: 'Integrasi', href: '#integrasi' },
  { label: 'Keamanan', href: '#keamanan' },
]

const previewTransactions = [
  { created_at: '2026-05-01T10:00:00Z', gross_amount: 1450000, status: 'paid' },
  { created_at: '2026-05-01T14:00:00Z', gross_amount: 350000, status: 'pending' },
  { created_at: '2026-05-02T09:00:00Z', gross_amount: 890000, status: 'paid' },
  { created_at: '2026-05-02T15:00:00Z', gross_amount: 180000, status: 'failed' },
  { created_at: '2026-05-03T09:30:00Z', gross_amount: 1240000, status: 'paid' },
  { created_at: '2026-05-03T17:30:00Z', gross_amount: 420000, status: 'pending' },
  { created_at: '2026-05-04T08:15:00Z', gross_amount: 1760000, status: 'paid' },
].map((transaction, index) => ({
  id: `preview-${index}`,
  order_id: `INV-${index}`,
  platform_order_id: `alpha-${index}`,
  payment_type: 'bank_transfer',
  currency: 'IDR',
  metadata: {},
  updated_at: transaction.created_at,
  ...transaction,
}))

const previewDeliveries = [
  { status: 'success' },
  { status: 'success' },
  { status: 'retrying' },
  { status: 'pending' },
  { status: 'failed_permanently' },
  { status: 'success' },
].map((delivery, index) => ({
  id: `delivery-${index}`,
  store_id: 'alpha',
  callback_url: 'https://shop.example.com/webhook',
  event_type: 'payment.status.updated',
  attempt_count: 1,
  created_at: '2026-05-04T08:00:00Z',
  updated_at: '2026-05-04T08:00:00Z',
  ...delivery,
}))

const heroMetrics = [
  {
    label: 'Volume terpantau',
    value: formatCurrencyShort(previewTransactions.reduce((total, transaction) => total + transaction.gross_amount, 0)),
    detail: 'Charge, retry, dan settlement terlihat dalam satu ruang kerja.',
  },
  {
    label: 'Webhook success lane',
    value: '83%',
    detail: 'Kegagalan callback terlihat cepat sebelum merchant yang harus panik duluan.',
  },
  {
    label: 'Retry discipline',
    value: '10x / 20s',
    detail: 'Relay worker tetap agresif, tapi terukur dan bisa diaudit penuh.',
  },
]

const features = [
  {
    icon: ShieldCheck,
    title: 'Credential Midtrans tetap terkunci',
    body: 'Tenant hanya melihat Store API. Server key pusat tetap hidup di belakang platform, bukan di repo toko.',
  },
  {
    icon: Workflow,
    title: 'Charge → webhook → retry dalam satu timeline',
    body: 'Request masuk, response keluar, webhook inbound, callback outbound, sampai resend manual bisa ditelusuri tanpa lompat tool.',
  },
  {
    icon: Zap,
    title: 'Observability operasional, bukan sekadar CRUD',
    body: 'Dashboard dirancang seperti control room: metrik, chart, feed status, dan detail payload tetap gampang dibaca.',
  },
]

const flowSteps = [
  {
    title: 'Store backend kirim payload custom',
    body: 'Backend tenant cukup mengirim payload charge sederhana plus token store dan `Idempotency-Key` unik.',
  },
  {
    title: 'Platform validasi dan memetakan request',
    body: 'PayGate mengecek token, limit, idempotency, masking audit log, lalu memanggil Midtrans Core API dengan credential pusat.',
  },
  {
    title: 'Webhook diverifikasi, status disimpan',
    body: 'Notifikasi Midtrans masuk ke platform, diverifikasi signature-nya, lalu status transaksi diperbarui di source of truth.',
  },
  {
    title: 'Callback ke tenant ditandatangani ulang',
    body: 'Worker meneruskan webhook ke merchant dengan signature dari platform, retry terkontrol, dan jejak attempt yang rapi.',
  },
]

const securityItems = [
  'Store token di-hash sebelum disimpan. Secret mentah hanya muncul satu kali saat dibuat atau dirotasi.',
  'Webhook inbound diverifikasi dulu sebelum status transaksi lokal boleh berubah.',
  'Audit log mem-mask header sensitif, password, token, dan secret callback.',
  'Tenant hanya melihat data milik store mereka, sementara admin platform punya observability global.',
]

const requestSnippet = `POST /v1/transactions/charge
Authorization: Bearer sk_live_xxx
Idempotency-Key: INV-2026-0001
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
    "platform_order_id": "alpha-store_INV-2026-0001",
    "status": "pending",
    "midtrans": {
      "transaction_id": "midtrans_trx_id"
    }
  }
}`

const heroTimeline = buildTransactionTimeline(previewTransactions, 4)
const heroWebhookDistribution = buildDeliveryStatusDistribution(previewDeliveries)

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
      <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </Badge>
      <div className="grid gap-3">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.07em] text-foreground md:text-5xl">{title}</h2>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{body}</p>
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
    <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card/85 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)] backdrop-blur">
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
        <pre className="overflow-x-auto bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_78%,transparent),transparent)] p-5 text-xs leading-6 text-muted-foreground">
          {code}
        </pre>
      </CardContent>
    </Card>
  )
}

function HeroPreviewCard() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      className="relative"
    >
      <div className="absolute inset-x-12 -bottom-8 h-24 rounded-full bg-primary/25 blur-3xl" />
      <Card className="relative overflow-hidden rounded-[2rem] border-white/10 bg-[#09131f]/92 text-white shadow-[0_40px_120px_-60px_rgba(13,31,52,0.95)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <CardHeader className="gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Control Room</p>
              <CardTitle className="mt-2 text-2xl tracking-[-0.06em] text-white">Alpha Store · Live pulse</CardTitle>
            </div>
            <Badge className="rounded-full border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Webhook relay sehat</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {heroMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{metric.label}</p>
                <strong className="mt-3 block text-2xl font-semibold tracking-[-0.05em] text-white">{metric.value}</strong>
                <p className="mt-2 text-sm leading-6 text-white/65">{metric.detail}</p>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Volume 4 hari terakhir</p>
                <strong className="mt-2 block text-xl font-semibold tracking-[-0.05em] text-white">
                  {formatCurrencyShort(heroTimeline.reduce((total, point) => total + point.volume, 0))}
                </strong>
              </div>
              <Badge className="rounded-full border-sky-300/25 bg-sky-300/10 text-sky-100">
                {heroTimeline.reduce((total, point) => total + point.paidCount, 0)} paid
              </Badge>
            </div>

            <ChartStage className="h-56">
              <AreaChart data={heroTimeline} responsive style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="landingVolume" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="landingPaid" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(255,255,255,0.52)', fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(9,19,31,0.94)',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => {
                      if (name === 'volume') {
                        return [formatCurrencyShort(Number(value)), 'volume']
                      }
                      return [value, name]
                    }}
                  />
                  <Area dataKey="volume" fill="url(#landingVolume)" stroke="#7dd3fc" strokeWidth={2} type="monotone" />
                  <Area dataKey="paidCount" fill="url(#landingPaid)" stroke="#34d399" strokeWidth={2} type="monotone" />
                </AreaChart>
            </ChartStage>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Webhook lane</p>
              <ChartStage className="mt-4 h-44">
                <BarChart data={heroWebhookDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(255,255,255,0.52)', fontSize: 12 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(9,19,31,0.94)',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar barSize={28} dataKey="value" radius={[14, 14, 0, 0]}>
                      {heroWebhookDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                  </BarChart>
              </ChartStage>
            </div>

            <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-sky-200" />
                <span className="text-sm font-semibold text-white">Apa yang operator lihat langsung?</span>
              </div>
              <ul className="grid gap-3 text-sm leading-6 text-white/70">
                <li>Charge tersangkut terlihat sebelum merchant bertanya lewat chat.</li>
                <li>Retry webhook punya jejak attempt, bukan sekadar “sudah dicoba ulang”.</li>
                <li>Token, audit, dan payload mentah tetap bisa ditinjau tanpa buka tiga tool berbeda.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
    <main className="relative overflow-hidden pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-80 w-80 rounded-full bg-chart-2/14 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[22%] h-96 w-96 rounded-full bg-chart-4/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.04em]" to="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-sm font-black uppercase tracking-[0.22em] text-background shadow-[0_10px_30px_-16px_rgba(15,23,42,0.65)]">
              PG
            </span>
            <span className="text-base">PayGate</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
            <Button asChild className="rounded-full px-5" size="sm">
              <Link to="/register">Buat Akun</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:px-6 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="grid gap-7"
        >
          <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Modern payment control room
          </Badge>

          <div className="grid gap-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.9] tracking-[-0.085em] text-foreground md:text-7xl">
              Dashboard middleware yang terasa seperti ruang kendali, bukan halaman admin generik.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              PayGate memusatkan charge, observability, audit trail, dan webhook relay untuk banyak tenant dalam satu
              pengalaman yang lebih tenang, lebih aman, dan lebih enak dioperasikan setiap hari.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-6" size="lg">
              <Link to="/register">
                Masuk ke control room
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild className="rounded-full px-6" size="lg" variant="outline">
              <a href="#control-room">
                Lihat preview operasional
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {heroMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 16 }}
                transition={{ delay: 0.08 * index, duration: 0.45 }}
              >
                <Card className="h-full rounded-[1.75rem] border-border/70 bg-card/78 backdrop-blur">
                  <CardContent className="grid gap-3 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                    <strong className="text-2xl font-semibold tracking-[-0.05em] text-foreground">{metric.value}</strong>
                    <p className="text-sm leading-6 text-muted-foreground">{metric.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <HeroPreviewCard />
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:px-6" id="keunggulan">
        <SectionHeading
          eyebrow="Kenapa lebih kuat"
          title="Dirancang untuk operator yang butuh sinyal cepat, bukan sekadar daftar menu."
          body="Visual dashboard harus membantu keputusan operasional. Karena itu landing dan dashboard memakai hierarki yang kuat, summary yang tegas, dan komponen data-heavy yang tetap rapi saat volume transaksi naik."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon

            return (
              <motion.div
                key={feature.title}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.08 * index, duration: 0.45 }}
              >
                <Card className="h-full rounded-[2rem] border-border/70 bg-card/80 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.65)]">
                  <CardContent className="grid gap-5 p-6">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="grid gap-3">
                      <strong className="text-xl font-semibold tracking-[-0.04em] text-foreground">{feature.title}</strong>
                      <p className="text-sm leading-7 text-muted-foreground">{feature.body}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-20 md:px-6" id="control-room">
        <SectionHeading
          eyebrow="Control Room"
          title="Metrik, chart, dan feed yang membantu operator membaca sistem tanpa banyak klik."
          body="PRD meminta dashboard yang clean, data-heavy, dan profesional. Karena itu overview menonjolkan metrik inti, chart volume, distribusi status, serta jejak webhook yang tetap bisa ditelusuri ke payload mentah."
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="rounded-[2rem] border-border/70 bg-card/82 backdrop-blur">
            <CardHeader className="gap-3">
              <Badge variant="outline" className="w-fit">
                Daily lane
              </Badge>
              <CardTitle className="text-2xl tracking-[-0.05em]">Charge pulse dan webhook lane yang gampang dibaca</CardTitle>
              <CardDescription>
                Overview menempatkan volume pembayaran, charge paid, pending lane, dan failure lane dalam satu canvas utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paid lane</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em]">
                    {heroTimeline.reduce((total, point) => total + point.paidCount, 0)}
                  </strong>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pending lane</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em]">
                    {heroTimeline.reduce((total, point) => total + point.pendingCount, 0)}
                  </strong>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Failure lane</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em]">
                    {heroTimeline.reduce((total, point) => total + point.failureCount, 0)}
                  </strong>
                </div>
              </div>
              <ChartStage className="h-72 rounded-[1.75rem] border border-border/70 bg-background/70 p-3">
                <AreaChart data={heroTimeline} responsive style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="landingPaidLight" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'volume') {
                          return [formatCurrencyShort(Number(value)), 'volume']
                        }
                        return [value, name]
                      }}
                    />
                    <Area dataKey="paidCount" fill="url(#landingPaidLight)" stroke="var(--color-chart-1)" strokeWidth={2.5} type="monotone" />
                    <Area dataKey="pendingCount" fill="transparent" stroke="var(--color-chart-3)" strokeWidth={2} type="monotone" />
                    <Area dataKey="failureCount" fill="transparent" stroke="var(--color-destructive)" strokeWidth={2} type="monotone" />
                  </AreaChart>
              </ChartStage>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-border/70 bg-card/82 backdrop-blur">
              <CardHeader className="gap-3">
                <Badge variant="outline" className="w-fit">
                  Webhook delivery
                </Badge>
                <CardTitle className="text-2xl tracking-[-0.05em]">Failure rate dan retry terlihat cepat</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 h-72">
                <ChartStage className="h-full">
                  <BarChart data={heroWebhookDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip />
                    <Bar barSize={42} dataKey="value" radius={[16, 16, 0, 0]}>
                      {heroWebhookDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                    </BarChart>
                </ChartStage>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-card/82 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl tracking-[-0.04em]">UX principle yang dipakai</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground">
                <p>Highlight card dipakai untuk keputusan cepat, bukan untuk memenuhi layar.</p>
                <p>Chart memberi konteks tren, lalu tabel dan drawer menyimpan detail payload saat perlu audit.</p>
                <p>Motion dipakai untuk depth dan timing, bukan sekadar animasi dekoratif.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-20 md:px-6" id="integrasi">
        <SectionHeading
          eyebrow="Integrasi"
          title="Store developer cukup melihat API yang lebih bersih, sementara platform tetap memegang observability penuh."
          body="Kontrak charge yang dipakai merchant lebih sederhana daripada payload Midtrans mentah, tetapi semua request dan response tetap bisa diaudit kembali di dashboard."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <SnippetCard
            code={requestSnippet}
            copied={copiedKey === 'request'}
            label="Charge request"
            onCopy={() => void handleCopy('request', requestSnippet)}
            title="Payload yang dikirim backend store"
          />
          <SnippetCard
            code={responseSnippet}
            copied={copiedKey === 'response'}
            label="Charge response"
            onCopy={() => void handleCopy('response', responseSnippet)}
            title="Respons aman yang diterima tenant"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {flowSteps.map((step, index) => (
            <Card className="rounded-[1.8rem] border-border/70 bg-card/80" key={step.title}>
              <CardContent className="grid gap-4 p-5">
                <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-foreground">
                  0{index + 1}
                </div>
                <div className="grid gap-2">
                  <strong className="text-lg font-semibold tracking-[-0.04em] text-foreground">{step.title}</strong>
                  <p className="text-sm leading-7 text-muted-foreground">{step.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-20 md:px-6" id="keamanan">
        <SectionHeading
          eyebrow="Keamanan"
          title="Aman untuk multi-tenant, tetap jelas untuk operator."
          body="Platform ini bukan hanya menyembunyikan credential Midtrans. Ia juga menyiapkan audit trail, masking, signing ulang webhook, dan boundary tenant yang jelas sejak awal."
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="rounded-[2rem] border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]">
            <CardHeader className="gap-3">
              <Badge variant="outline" className="w-fit">
                Security checklist
              </Badge>
              <CardTitle className="text-2xl tracking-[-0.05em]">Boundary yang jelas sejak request pertama</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm leading-7 text-muted-foreground">
                {securityItems.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <ShieldCheck className="mt-1 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-card/85">
            <CardHeader className="gap-3">
              <Badge variant="outline" className="w-fit">
                Siap masuk dashboard?
              </Badge>
              <CardTitle className="text-2xl tracking-[-0.05em]">Mulai dari akun, lalu bangun tenant dengan ritme yang benar.</CardTitle>
              <CardDescription>
                Landing ini dibuat untuk memberi rasa produk yang lebih kuat. Dashboard-nya nanti meneruskan bahasa visual yang sama, bukan putus di halaman login.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6" size="lg">
                <Link to="/register">
                  Buat akun sekarang
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild className="rounded-full px-6" size="lg" variant="outline">
                <Link to="/login">Masuk ke dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
