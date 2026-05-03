import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSession } from '@/app/use-session'

export function SessionGate() {
  const session = useSession()

  if (!session.isReady) {
    return (
      <div className="screen-loader">
        <div className="screen-loader__panel">
          <span className="mx-auto inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            PayGate Dashboard
          </span>
          <strong className="text-lg text-foreground">Memuat sesi dashboard…</strong>
          <p className="text-sm leading-6 text-muted-foreground">
            Memeriksa akses login, token refresh, dan koneksi ke API platform.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const session = useSession()

  if (session.isAuthenticated) {
    return <Navigate to={session.mfa?.can_access_dashboard ? '/app' : '/mfa'} replace />
  }

  return <Outlet />
}

export function ProtectedRoute() {
  const session = useSession()
  const location = useLocation()

  if (!session.isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (session.mfa && !session.mfa.can_access_dashboard) {
    return <Navigate to="/mfa" replace />
  }

  return <Outlet />
}

export function MFARoute() {
  const session = useSession()
  const location = useLocation()

  if (!session.isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <Outlet />
}
