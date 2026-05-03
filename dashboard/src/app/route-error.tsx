import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { AlertTriangleIcon, ArrowLeftIcon, HomeIcon, RefreshIcon } from '@/components/app-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useDocumentTitle } from '@/lib/use-document-title'

type RouteErrorState = {
  code: number
  description: string
  message: string
  title: string
}

function buildRouteErrorState(error: unknown): RouteErrorState {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        code: 404,
        title: 'Halaman tidak ditemukan',
        description: 'URL yang Anda buka tidak cocok dengan route dashboard mana pun.',
        message:
          typeof error.data === 'string' && error.data.trim().length > 0
            ? error.data
            : error.statusText || 'Route yang diminta tidak tersedia.',
      }
    }

    return {
      code: error.status,
      title: 'Request tidak bisa diproses',
      description: 'Router menerima response error saat memuat halaman ini.',
      message:
        typeof error.data === 'string' && error.data.trim().length > 0
          ? error.data
          : error.statusText || 'Terjadi error saat menyiapkan route.',
    }
  }

  if (error instanceof Error) {
    return {
      code: 500,
      title: 'Terjadi error di aplikasi',
      description: 'Komponen route gagal dirender atau memuat modul yang dibutuhkan.',
      message: error.message,
    }
  }

  return {
    code: 500,
    title: 'Terjadi error yang tidak diketahui',
    description: 'Aplikasi tidak dapat menentukan penyebab error ini dengan pasti.',
    message: 'Periksa console browser atau refresh halaman untuk mencoba lagi.',
  }
}

function RouteErrorView({ errorState }: { errorState: RouteErrorState }) {
  return (
    <main className="screen-loader px-4 py-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-3xl overflow-hidden border-border/70 bg-card/92 shadow-sm">
        <CardHeader className="gap-4 border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-3">
              <Badge variant={errorState.code === 404 ? 'warning' : 'destructive'} className="w-fit">
                Error {errorState.code}
              </Badge>
              <div className="grid gap-2">
                <CardTitle className="flex items-center gap-2 text-2xl tracking-[-0.04em]">
                  <AlertTriangleIcon className="size-5" />
                  {errorState.title}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  {errorState.description}
                </CardDescription>
              </div>
            </div>

            <Button asChild variant="ghost">
              <Link to="/">
                <HomeIcon className="size-4" />
                Kembali ke landing
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6">
          <div className="dashboard-note-card">
            <strong>Detail error</strong>
            <p>{errorState.message}</p>
            <p>Path saat ini: {typeof window !== 'undefined' ? window.location.pathname : '—'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link to="/app">
                <ArrowLeftIcon className="size-4" />
                Coba kembali ke dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Buka login</Link>
            </Button>
            <Button onClick={() => window.location.reload()} type="button" variant="outline">
              <RefreshIcon className="size-4" />
              Refresh halaman
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export function AppRouteErrorBoundary() {
  const routeError = useRouteError()
  const errorState = buildRouteErrorState(routeError)

  useDocumentTitle(`${errorState.code} | PayGate`)

  return <RouteErrorView errorState={errorState} />
}

export function NotFoundPage() {
  const errorState: RouteErrorState = {
    code: 404,
    title: 'Halaman tidak ditemukan',
    description: 'URL yang Anda buka tidak cocok dengan route dashboard mana pun.',
    message: 'Periksa kembali alamat yang Anda buka atau kembali ke landing untuk memulai dari sana.',
  }

  useDocumentTitle('404 | PayGate')

  return <RouteErrorView errorState={errorState} />
}
