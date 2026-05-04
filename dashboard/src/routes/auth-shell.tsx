import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ShieldCheck, Waves, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useDocumentTitle } from '@/lib/use-document-title'

type AuthShellProps = {
  eyebrow: string
  title: string
  body: string
  children: ReactNode
  alternateLabel: string
  alternateHref: string
  alternateAction: string
  documentTitle: string
}

const authSignals = [
  {
    label: 'Webhook relay',
    value: 'stabil',
    detail: 'Retry worker menjaga callback tenant tetap rapi walau endpoint mereka sedang lambat.',
  },
  {
    label: 'Audit coverage',
    value: 'penuh',
    detail: 'Request, response, retry attempt, dan status webhook bisa ditelusuri tanpa lompat tool.',
  },
  {
    label: 'Credential posture',
    value: 'tertutup',
    detail: 'Server key pusat hidup di backend platform, bukan di repo atau frontend tenant.',
  },
]

const authBullets = [
  'Kelola banyak store tanpa mengulang konfigurasi yang sama di setiap tenant.',
  'Buka token, transaksi, audit log, dan delivery webhook dari satu shell yang konsisten.',
  'Masuk ke dashboard yang memang dibangun untuk operator, bukan sekadar halaman admin biasa.',
]

export function AuthShell({
  eyebrow,
  title,
  body,
  children,
  alternateLabel,
  alternateHref,
  alternateAction,
  documentTitle,
}: AuthShellProps) {
  useDocumentTitle(documentTitle)

  return (
    <main className="relative isolate mx-auto grid min-h-screen w-full max-w-7xl gap-6 overflow-hidden px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:py-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-10rem] h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-80 w-80 rounded-full bg-chart-2/14 blur-3xl" />
      </div>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[2.25rem] border border-border/60 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--foreground)_92%,transparent),color-mix(in_oklab,var(--foreground)_74%,transparent))] p-6 text-white shadow-[0_48px_120px_-70px_rgba(15,23,42,0.75)] md:p-8"
      >
        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="absolute bottom-[-6rem] left-[22%] h-52 w-52 rounded-full bg-primary/18 blur-3xl" />

        <div className="flex h-full flex-col gap-8">
          <Link className="inline-flex items-center gap-3 text-lg font-semibold tracking-[-0.03em]" to="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-sm">
              PG
            </span>
            <span>PayGate</span>
          </Link>

          <div className="grid gap-5">
            <Badge className="w-fit rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              {eyebrow}
            </Badge>
            <div className="grid gap-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-[0.92] tracking-[-0.08em] md:text-6xl">{title}</h1>
              <p className="max-w-2xl text-base leading-8 text-white/72 md:text-lg">{body}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {authSignals.map((signal, index) => (
              <motion.div
                key={signal.label}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 18 }}
                transition={{ delay: 0.08 * index, duration: 0.45 }}
              >
                <Card className="h-full rounded-[1.7rem] border-white/10 bg-white/8 text-white shadow-none backdrop-blur">
                  <CardContent className="grid gap-3 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{signal.label}</p>
                    <strong className="text-2xl font-semibold tracking-[-0.05em]">{signal.value}</strong>
                    <p className="text-sm leading-6 text-white/65">{signal.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="rounded-[1.8rem] border-white/10 bg-white/8 text-white shadow-none">
              <CardContent className="grid gap-4 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-emerald-300" />
                  Security posture
                </div>
                <ul className="grid gap-3 text-sm leading-7 text-white/68">
                  {authBullets.map((item) => (
                    <li className="flex gap-3" key={item}>
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/75" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="rounded-[1.8rem] border-white/10 bg-white/8 text-white shadow-none">
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Waves className="size-4 text-sky-200" />
                    Operator rhythm
                  </div>
                  <p className="text-sm leading-7 text-white/68">
                    Landing, login, dan dashboard sekarang memakai bahasa visual yang sama: lebih tenang, lebih premium,
                    dan tetap fokus ke pekerjaan sehari-hari operator pembayaran.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[1.8rem] border-white/10 bg-white/8 text-white shadow-none">
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="size-4 text-amber-200" />
                    Setelah login
                  </div>
                  <p className="text-sm leading-7 text-white/68">
                    Anda langsung masuk ke shell dashboard yang sudah punya metric cards, chart operasional, directory
                    store yang lebih kuat, dan panel data-heavy yang tetap cepat dibaca.
                  </p>
                  <Button asChild className="w-full rounded-full border-white/12 bg-white text-slate-950 hover:bg-white/92" size="sm">
                    <Link to="/">
                      Lihat landing dulu
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 22 }}
        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
        className="flex items-center"
      >
        <Card className="w-full overflow-hidden rounded-[2.25rem] border-border/70 bg-card/86 shadow-[0_30px_90px_-62px_rgba(15,23,42,0.72)] backdrop-blur">
          <div className="border-b border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_8%,transparent),transparent)] px-6 py-5 md:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Akses Dashboard</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">Masuk ke ruang kerja pembayaran Anda</h2>
            <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
              Form ini sengaja dibuat lebih bersih agar fokus tetap pada autentikasi, sementara panel kiri memberi konteks produk yang kuat.
            </p>
          </div>

          <CardContent className="grid gap-6 p-6 md:p-8">
            {children}

            <p className="text-sm text-muted-foreground">
              {alternateLabel}{' '}
              <Link className="font-semibold text-primary hover:text-primary/80" to={alternateHref}>
                {alternateAction}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.section>
    </main>
  )
}
