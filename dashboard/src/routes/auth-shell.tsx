import { Link } from 'react-router-dom'

import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
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
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="flex h-full flex-col gap-8">
          <Link className="inline-flex items-center gap-3 text-lg font-semibold tracking-[-0.03em]" to="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-[0.18em] text-primary-foreground shadow-sm">
              PG
            </span>
            <span>PayGate</span>
          </Link>

          <div className="grid gap-5">
            <Badge variant="success" className="w-fit">
              {eyebrow}
            </Badge>
            <div className="grid gap-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-6xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{body}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-background/70 shadow-none">
              <CardContent className="grid gap-2 p-5">
                <strong className="text-sm font-semibold text-foreground">Satu akun, banyak toko</strong>
                <p className="text-sm leading-6 text-muted-foreground">
                  Kelola store, token, transaksi, audit log, dan webhook relay dari satu dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/70 shadow-none">
              <CardContent className="grid gap-2 p-5">
                <strong className="text-sm font-semibold text-foreground">
                  Kredensial Midtrans tetap tersembunyi
                </strong>
                <p className="text-sm leading-6 text-muted-foreground">
                  Dashboard hanya mengelola tenant dan observability. Server key pusat tetap tinggal di backend.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <strong className="block text-base text-foreground">60 rpm</strong>
              <span>rate limit per token</span>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <strong className="block text-base text-foreground">300 rpm</strong>
              <span>rate limit per store</span>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <strong className="block text-base text-foreground">10x retry</strong>
              <span>webhook delivery worker</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center">
        <Card className="w-full rounded-[2rem]">
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
      </section>
    </main>
  )
}
