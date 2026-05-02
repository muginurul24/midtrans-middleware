import { Link } from 'react-router-dom'

import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type AuthShellProps = {
  eyebrow: string
  title: string
  body: string
  children: ReactNode
  alternateLabel: string
  alternateHref: string
  alternateAction: string
}

export function AuthShell({
  eyebrow,
  title,
  body,
  children,
  alternateLabel,
  alternateHref,
  alternateAction,
}: AuthShellProps) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-stone-200/70 bg-[radial-gradient(circle_at_top_right,rgba(79,206,141,0.18),transparent_20rem),radial-gradient(circle_at_bottom_left,rgba(43,176,197,0.16),transparent_18rem)] p-6 shadow-[0_30px_80px_rgba(48,34,21,0.12)] backdrop-blur dark:border-white/10 dark:shadow-[0_34px_90px_rgba(0,0,0,0.35)] md:p-8">
        <div className="flex h-full flex-col gap-8">
          <Link className="inline-flex items-center gap-3 text-lg font-extrabold tracking-[-0.03em]" to="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-sm font-black uppercase tracking-[0.18em] text-stone-50 shadow-lg dark:bg-stone-50 dark:text-stone-950">
              PG
            </span>
            <span>PayGate</span>
          </Link>

          <div className="grid gap-4">
            <Badge variant="success" className="w-fit">
              {eyebrow}
            </Badge>
            <div className="grid gap-4">
              <h1 className="max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-stone-950 dark:text-stone-50 md:text-6xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-400 md:text-lg">{body}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/40 bg-white/70 dark:border-white/10 dark:bg-white/5">
              <CardContent className="grid gap-2 p-5">
                <strong className="text-sm font-semibold text-stone-900 dark:text-stone-100">Satu akun, banyak toko</strong>
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Kelola store, token, transaksi, audit log, dan webhook relay dari satu dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/40 bg-white/70 dark:border-white/10 dark:bg-white/5">
              <CardContent className="grid gap-2 p-5">
                <strong className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Kredensial Midtrans tetap tersembunyi
                </strong>
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Dashboard hanya mengelola tenant dan observability. Server key pusat tetap tinggal di backend.
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-stone-300/60 dark:bg-white/10" />

          <div className="grid gap-3 text-sm text-stone-600 dark:text-stone-400 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <strong className="block text-base text-stone-900 dark:text-stone-50">60 rpm</strong>
              <span>rate limit per token</span>
            </div>
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <strong className="block text-base text-stone-900 dark:text-stone-50">300 rpm</strong>
              <span>rate limit per store</span>
            </div>
            <div className="rounded-2xl border border-stone-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <strong className="block text-base text-stone-900 dark:text-stone-50">10x retry</strong>
              <span>webhook delivery worker</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center">
        <Card className="w-full rounded-[2rem]">
          <CardContent className="grid gap-6 p-6 md:p-8">
            {children}

            <p className="text-sm text-stone-500 dark:text-stone-400">
              {alternateLabel}{' '}
              <Link className="font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300" to={alternateHref}>
                {alternateAction}
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
