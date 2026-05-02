import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSession } from '@/app/use-session'

export function SessionGate() {
  const session = useSession()

  if (!session.isReady) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="grid w-full max-w-md gap-3 rounded-[2rem] border border-stone-200/70 bg-white/85 p-6 text-center shadow-[0_20px_60px_rgba(48,34,21,0.08)] backdrop-blur dark:border-white/10 dark:bg-stone-950/70 dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <span className="mx-auto inline-flex w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            PayGate Dashboard
          </span>
          <strong className="text-lg text-stone-950 dark:text-stone-50">Memuat sesi dashboard…</strong>
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
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
